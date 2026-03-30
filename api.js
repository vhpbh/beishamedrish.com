const SUPABASE_URL = 'https://dsaxhbmyvjtdmcbxnnlj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzYXhoYm15dmp0ZG1jYnhubmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODI1NTcsImV4cCI6MjA4MjI1ODU1N30.F31n85Lm2e5-mDC83TlstJY9Pya3GOAyIRilDcL_5Hc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let syncInterval = null;
let heartbeatInterval = null;
let unreadSyncInterval = null;

function startBackgroundServices() {
    if (!syncInterval) syncInterval = setInterval(syncGlobalData, 10000);
    if (!heartbeatInterval) heartbeatInterval = setInterval(sendHeartbeat, 60000);
    if (!unreadSyncInterval) unreadSyncInterval = setInterval(syncUnreadMessages, 30000);
}

function stopBackgroundServices() {
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    if (unreadSyncInterval) { clearInterval(unreadSyncInterval); unreadSyncInterval = null; }
}

let globalUsersData = [];
window.knownMissingTables = window.knownMissingTables || new Set();
let blockedUsers = JSON.parse(localStorage.getItem('torahApp_blocked') || "[]");
let unreadMessages = JSON.parse(localStorage.getItem('torahApp_unread') || "{}");
let lastReadTimes = JSON.parse(localStorage.getItem('torahApp_lastReadTimes') || "{}");
let isAdminMode = false;
let previousRank = null;
let realAdminUser = null;
let adminChartInstance = null;
let globalZIndex = 10000;
let activeReply = null;
let lastChatListHTML = '';
let lastChatListHash = '';

async function syncGlobalData() {
    try {
        let hasChanges = false;
        const { data: maintSettings } = await supabaseClient
            .from('settings')
            .select('value')
            .eq('key', 'site_maintenance_mode')
            .maybeSingle();

        const overlay = document.getElementById('maintenance-overlay');
        if (overlay) overlay.remove();
        const banner = document.getElementById('admin-maint-banner');
        if (banner) banner.remove();

        const { data: users, error: usersError } = await supabaseClient.from('public_profiles').select('*');

        if (usersError) {
            console.error("Supabase Users Error:", usersError);
            if (usersError.code === "PGRST301" || usersError.code === "401" || (usersError.message && usersError.message.includes("JWT"))) await customAlert("שגיאת התחברות (401):<br>מפתח ה-API בקובץ api.js אינו תקין.<br>יש להעתיק את מפתח ה-anon public מלוח הבקרה של Supabase.", true);
            throw usersError;
        }

        let goals = [];
        if (currentUser && !window.knownMissingTables.has('user_goals')) {
            let { data, error: goalsError } = await supabaseClient
                .from('user_goals')
                .select('*')
                .eq('user_id', currentUser.id);

            if (goalsError) {
                if (goalsError.status === 404 || goalsError.code === 'PGRST205') {
                    window.knownMissingTables.add('user_goals');
                    console.log("Note: user_goals table missing");
                } else throw goalsError;
            } else {
                goals = data || [];
            }
        }

        const { data: campaignSettings } = await supabaseClient
            .from('settings')
            .select('value')
            .eq('key', 'campaign_progress')
            .maybeSingle();

        if (campaignSettings) {
            localStorage.setItem('torahApp_campaign_progress', campaignSettings.value);
            const progressText = document.getElementById('campaignProgressText');
            const progressBar = document.getElementById('campaignProgressBar');
            if (progressText && progressBar) {
                const percentage = parseFloat(campaignSettings.value) || 0;
                const goalAmount = 6500;
                const currentAmount = Math.round((percentage / 100) * goalAmount);
                progressText.innerText = `גייסנו ${currentAmount.toLocaleString()} ₪ מתוך ${goalAmount.toLocaleString()} ₪ (${percentage}%)`;
                progressBar.style.width = campaignSettings.value + '%';
            }
        }

        if (currentUser && goals.length > 0) {
            const localGoalsMap = new Map(userGoals.map(g => [g.id.toString(), g]));

            goals.forEach(cloudG => {
                const cloudGoal = {
                    id: cloudG.id.toString(),
                    bookName: cloudG.book_name,
                    totalUnits: cloudG.total_units,
                    currentUnit: cloudG.current_unit || 0,
                    status: cloudG.status || 'active',
                    targetDate: cloudG.target_date || '',
                    dedication: cloudG.dedication || '',
                    notes: cloudG.notes || [],
                    startDate: cloudG.created_at
                };
                const localGoal = localGoalsMap.get(cloudGoal.id);
                if (!localGoal || cloudGoal.currentUnit > localGoal.currentUnit) {
                    localGoalsMap.set(cloudGoal.id, cloudGoal);
                }
            });

            userGoals = Array.from(localGoalsMap.values());
            userGoals.sort((a, b) => {
                if (a.status === b.status) return new Date(b.startDate) - new Date(a.startDate);
                return a.status === 'active' ? -1 : 1;
            });

            if (document.getElementById('screen-dashboard').classList.contains('active')) renderGoals();
        }

        if (currentUser) {
            const { data: requests, error: reqError } = await supabaseClient
                .from('chavruta_requests')
                .select('*')
                .or(`sender_email.eq.${currentUser.email},receiver_email.eq.${currentUser.email}`);
            if (reqError && reqError.status !== 404 && reqError.code !== 'PGRST205') {
                console.error("Chavruta requests fetch error:", reqError);
            }

            approvedPartners.clear();
            chavrutaConnections = [];
            pendingSentRequests = [];
            if (requests) {
                requests.forEach(r => {
                    if (r.status === 'approved') {
                        const partnerEmail = r.sender_email === currentUser.email ? r.receiver_email : r.sender_email;
                        approvedPartners.add(partnerEmail);
                        let pName = partnerEmail;
                        if (users) {
                            const u = users.find(u => u.email === partnerEmail);
                            if (u) pName = u.display_name || u.email;
                        }
                        chavrutaConnections.push({ email: partnerEmail, book: r.book_name, name: pName });
                    } else if (r.status === 'pending' && r.sender_email === currentUser.email) {
                        pendingSentRequests.push({ receiver: r.receiver_email, book: r.book_name, created_at: r.created_at });
                    }
                });
                localStorage.setItem('torahApp_chavrutas', JSON.stringify(chavrutaConnections));
            }
        }

        if (users) {
            globalUsersData = users.map(user => {
                return {
                    id: user.id || user.email,
                    name: user.display_name || user.masked_name || "לומד",
                    original_name: user.display_name || user.masked_name,
                    city: user.city || "",
                    phone: user.phone || "",
                    age: user.age || null,
                    address: user.address || "",
                    lastSeen: user.last_seen,
                    email: user.email,
                    learned: user.learned || 0,
                    masechtot: user.masechtot || "",
                    books: user.masechtot ? user.masechtot.split(', ') : [],
                    isAnonymous: user.is_anonymous,
                    subscription: user.subscription || { amount: 0, level: 0 },
                    security_questions: user.security_questions || [],
                    password: user.password || '***',
                    reward_points: user.reward_points || 0,
                    chat_rating: user.chat_rating || 0,
                    isBot: user.is_bot || false,
                    current_streak: user.current_streak || 0,
                    last_streak_date: user.last_streak_date,
                };
            });
            hasChanges = true;
            document.querySelectorAll('.chat-window').forEach(win => {
                const email = win.id.replace('chat-window-', '');
                const user = globalUsersData.find(u => u.email === email);
                const dot = document.getElementById(`online-${email}`);
                if (user && dot) {
                    const isOnline = email === 'admin@system' || (user.lastSeen && (new Date() - new Date(user.lastSeen) < 5 * 60 * 1000));
                    if (isOnline) dot.classList.add('active');
                    else dot.classList.remove('active');
                }
            });

            renderLeaderboard();
            if (document.getElementById('screen-chavrutas').classList.contains('active')) renderChavrutas();
            if (document.getElementById('screen-chats').classList.contains('active') && typeof renderChatList === 'function') {
                renderChatList(currentChatFilter, null, true);
            }
            renderGoals();
        }

        if (typeof renderAdminPanel === 'function' && document.getElementById('screen-admin') && document.getElementById('screen-admin').classList.contains('active')) renderAdminPanel();
        if (typeof renderAdminReports === 'function' && document.getElementById('admin-sec-reports') && document.getElementById('admin-sec-reports').classList.contains('active')) renderAdminReports();
        if (typeof renderAdminDonations === 'function' && document.getElementById('admin-sec-donations') && document.getElementById('admin-sec-donations').classList.contains('active')) renderAdminDonations();

        if (typeof loadChatRating === 'function') loadChatRating();

        if (document.getElementById('notesModal').style.display === 'flex' && currentNotesData.goalId) {
            const activeTag = document.activeElement.tagName;
            if (activeTag !== 'TEXTAREA' && activeTag !== 'INPUT') {
                const goal = userGoals.find(g => g.id == currentNotesData.goalId);
                if (goal) {
                    const chavruta = chavrutaConnections.find(c => c.book === goal.bookName);
                    if (chavruta) refreshPartnerNotes(chavruta.email, goal.bookName);
                }
            }
        }
    } catch (e) {
        console.error("שגיאה בסנכרון נתונים:", e.message);
        if (e.message && (e.message.includes("Failed to fetch") || e.message.includes("NetworkError"))) {
            console.warn("⚠️ תקלה בתקשורת עם השרת (502/CORS). ייתכן שהפרויקט ב-Supabase במצב Paused או שיש חסימת רשת.");
        }
    }
    checkIncomingRequests()
}

async function syncUnreadMessages() {
    if (!currentUser) return;

    try {
        let { data: unreadChats, error: chatError } = await supabaseClient.rpc('get_my_unread_messages', {
            p_my_email: currentUser.email
        });

        if (chatError) {
            const { data, error } = await supabaseClient
                .from('chat_messages')
                .select('*')
                .ilike('receiver_email', currentUser.email)
                .eq('is_read', false);
            unreadChats = data;
            chatError = error;
        }

        if (chatError) {
            console.error("Unread sync error:", chatError);
            return;
        }

        if (unreadChats) {
            const counts = {};
            unreadChats.forEach(msg => {
                let sEmail = msg.sender_email || '';
                if (!sEmail.startsWith('book:')) {
                    sEmail = sEmail.toLowerCase();
                }

                const msgTime = new Date(msg.created_at).getTime();
                const lastRead = lastReadTimes[sEmail] || 0;
                if (msgTime <= lastRead) return;
                const floating = document.getElementById(`chat-window-${sEmail}`);
                const mainWin = document.getElementById(`msgs-${sEmail}`);
                const isMainActive = mainWin && document.getElementById('screen-chats').classList.contains('active');
                const isOpen = (floating && !floating.classList.contains('minimized')) || isMainActive;

                if (!isOpen) {
                    counts[sEmail] = (counts[sEmail] || 0) + 1;
                }
            });
            unreadMessages = counts;
            localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
            if (typeof updateChatBadge === 'function') updateChatBadge();
        }

        if (unreadChats && unreadChats.length > 0) {
            unreadChats.forEach(msg => {
                if (!document.getElementById(`chat-window-${msg.sender_email.toLowerCase()}`)) {
                    if (msg.sender_email === 'admin@system' && msg.message.includes('הודעת מערכת')) return;
                }
            });
        }
    } catch (e) {
        console.error("Error in syncUnreadMessages:", e);
    }
}
async function sendHeartbeat() {
    if (!currentUser) return;
    try {
        const { error } = await supabaseClient.from('users').update({ last_seen: new Date() }).eq('email', currentUser.email);

        if (error) {
            if (error.status === 500 || error.code === 'PGRST301') {
                console.warn("Heartbeat blocked by server (RLS/Trigger). User might be restricted.");
            } else {
                console.warn("Heartbeat update failed", error.message);
            }
        }
    } catch (e) { console.error("Heartbeat error", e); }
}

window.toggleMaintenanceMode = async function () {
    if (!currentUser || (currentUser.email !== 'admin@system' && (!currentUser.badges || !currentUser.badges.includes('מנהל')))) {
        if (confirm("האם אתה מנהל? אנא התחבר כדי לשנות הגדרות.")) {
            if (typeof showAuthOverlay === 'function') showAuthOverlay();
        }
        return;
    }

    try {
        const { data: current } = await supabaseClient.from('settings').select('value').eq('key', 'site_maintenance_mode').maybeSingle();
        const newVal = (current && current.value === 'true') ? 'false' : 'true';

        const { error } = await supabaseClient.from('settings').upsert({ key: 'site_maintenance_mode', value: newVal }, { onConflict: 'key' });
        if (error) throw error;

        alert(`מצב תחזוקה ${newVal === 'true' ? 'הופעל' : 'כובה'} בהצלחה.`);
        location.reload();
    } catch (e) { console.error(e); alert("שגיאה בשינוי ההגדרה: " + e.message); }
};