const SUPABASE_URL = 'https://dsaxhbmyvjtdmcbxnnlj.supabase.co';
// החזרתי את המפתח המקורי, אך שים לב: מפתח תקין של Supabase מתחיל בדרך כלל ב-eyJ.
// אם אתה מקבל שגיאות 401, עליך להעתיק את המפתח הנכון מ: Supabase Dashboard -> Project Settings -> API -> anon public
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzYXhoYm15dmp0ZG1jYnhubmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODI1NTcsImV4cCI6MjA4MjI1ODU1N30.F31n85Lm2e5-mDC83TlstJY9Pya3GOAyIRilDcL_5Hc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let syncInterval = null;
let heartbeatInterval = null;
let unreadSyncInterval = null;

function startBackgroundServices() {
    if (!syncInterval) syncInterval = setInterval(syncGlobalData, 10000);
    if (!heartbeatInterval) heartbeatInterval = setInterval(sendHeartbeat, 60000);
    if (!unreadSyncInterval) unreadSyncInterval = setInterval(syncUnreadMessages, 30000); // סנכרון הודעות שלא נקראו כל 30 שניות
}

function stopBackgroundServices() {
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    if (unreadSyncInterval) { clearInterval(unreadSyncInterval); unreadSyncInterval = null; }
}

// שים לב לשינוי השם ל- supabaseClient
let globalUsersData = [];
let blockedUsers = JSON.parse(localStorage.getItem('torahApp_blocked') || "[]");
let unreadMessages = JSON.parse(localStorage.getItem('torahApp_unread') || "{}");
let lastReadTimes = JSON.parse(localStorage.getItem('torahApp_lastReadTimes') || "{}");
let isAdminMode = false;
let previousRank = null;
let realAdminUser = null; // לשמירת המשתמש האמיתי בזמן שימוש בבוט
let adminChartInstance = null;
let globalZIndex = 10000; // Increased to ensure popups appear above the login screen (z-index 9999)
let activeReply = null; // משתנה גלובלי לניהול תשובה/ציטוט
let lastChatListHTML = '';
let lastChatListHash = ''; // משתנה למניעת הבהוב בצ'אט

async function syncGlobalData() {
    try {
        let hasChanges = false; // הוספת משתנה למעקב אחר שינויים
        // console.log("מתחיל סנכרון נתונים מהענן...");

        // --- בדיקת מצב תחזוקה (חדש) ---
        const { data: maintSettings } = await supabaseClient
            .from('settings')
            .select('value')
            .eq('key', 'site_maintenance_mode')
            .maybeSingle();

        if (maintSettings && maintSettings.value === 'true') {
            // אם המשתמש הוא לא מנהל - נציג מסך תחזוקה ונעצור
            const isAdmin = currentUser && (currentUser.email === 'admin@system' || (currentUser.badges && currentUser.badges.includes('מנהל')));
            if (!isAdmin) {
                if (typeof showMaintenanceOverlay === 'function') showMaintenanceOverlay();
                return; // עצירת סנכרון נתונים למשתמשים רגילים
            } else {
                // למנהל: הסרת מסך אם קיים והצגת חיווי
                const overlay = document.getElementById('maintenance-overlay');
                if (overlay) overlay.remove();
                if (!document.getElementById('admin-maint-banner')) {
                    const banner = document.createElement('div');
                    banner.id = 'admin-maint-banner';
                    banner.style.cssText = "position:fixed; top:0; left:0; right:0; background:#f59e0b; color:black; text-align:center; padding:5px; z-index:99999; font-weight:bold; font-size:0.8rem; pointer-events:none;";
                    banner.innerText = "⚠️ מצב תחזוקה פעיל - האתר חסום למשתמשים רגילים";
                    document.body.appendChild(banner);
                }
            }
        } else {
            // ניקוי אלמנטים של תחזוקה אם המצב כבוי
            const overlay = document.getElementById('maintenance-overlay');
            if (overlay) overlay.remove();
            const banner = document.getElementById('admin-maint-banner');
            if (banner) banner.remove();
        }
        // --------------------------------

        // Securely fetch public user data via RPC, avoiding direct table access and password exposure.
        const { data: users, error: usersError } = await supabaseClient.rpc('get_public_users_data');

        if (usersError) {
            console.error("Supabase Users Error:", usersError);
            if (usersError.code === "PGRST301" || usersError.code === "401" || (usersError.message && usersError.message.includes("JWT"))) await customAlert("שגיאת התחברות (401):<br>מפתח ה-API בקובץ api.js אינו תקין.<br>יש להעתיק את מפתח ה-anon public מלוח הבקרה של Supabase.", true);
            throw usersError;
        }

        // שליפת לימודים
        const { data: goals, error: goalsError } = await supabaseClient
            .from('user_goals')
            .select('*');
        if (goalsError) throw goalsError;

        // טעינת התקדמות קמפיין מהגדרות
        const { data: campaignSettings } = await supabaseClient
            .from('settings')
            .select('value')
            .eq('key', 'campaign_progress')
            .maybeSingle();

        if (campaignSettings) {
            localStorage.setItem('torahApp_campaign_progress', campaignSettings.value);
            // עדכון המודאל בזמן אמת אם הוא פתוח
            const progressText = document.getElementById('campaignProgressText');
            const progressBar = document.getElementById('campaignProgressBar');
            if (progressText && progressBar) {
                progressText.innerText = campaignSettings.value + '%';
                progressBar.style.width = campaignSettings.value + '%';
            }
        }

        // בדיקת RLS: האם קיבלנו נתונים של אחרים?
        if (currentUser && goals.length > 0) {
            const others = goals.filter(g => g.user_email && g.user_email.toLowerCase() !== currentUser.email.toLowerCase());
            if (others.length === 0 && users.length > 1) {
                console.warn("⚠️ שים לב: לא התקבלו לימודים של משתמשים אחרים. כנראה שצריך להגדיר ב-Supabase מדיניות RLS שתאפשר SELECT לכולם (public) על הטבלה user_goals.");
            }

            // עדכון הלימודים שלי מהענן כדי למנוע היעלמות (עם מיזוג למניעת דריסת נתונים חדשים מקומית)
            if (currentUser) {
                const myCloudGoals = goals.filter(g => g.user_email === currentUser.email);
                const localGoalsMap = new Map(userGoals.map(g => [g.id.toString(), g]));

                myCloudGoals.forEach(cloudG => {
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
                // מיון: פעילים קודם, ואז לפי תאריך
                userGoals.sort((a, b) => {
                    if (a.status === b.status) return new Date(b.startDate) - new Date(a.startDate);
                    return a.status === 'active' ? -1 : 1;
                });

                // עדכון תצוגה אם אנחנו במסך הראשי
                if (document.getElementById('screen-dashboard').classList.contains('active')) renderGoals();
            }
        }

        // --- החלק החדש: שליפת חברותות מאושרות ---
        if (currentUser) {
            const { data: requests, error: reqError } = await supabaseClient
                .from('chavruta_requests')
                .select('*')
                .or(`sender_email.eq.${currentUser.email},receiver_email.eq.${currentUser.email}`);

            approvedPartners.clear();
            chavrutaConnections = [];
            pendingSentRequests = [];
            if (requests) {
                requests.forEach(r => {
                    if (r.status === 'approved') {
                        const partnerEmail = r.sender_email === currentUser.email ? r.receiver_email : r.sender_email;
                        approvedPartners.add(partnerEmail);
                        // שמירת שם החברותא לשימוש מיידי בטעינה הבאה
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
        // ----------------------------------------

        if (users && goals) {
            globalUsersData = users.map(user => {
                const uEmail = (user.email || "").trim().toLowerCase();
                // מציאת הלימודים הפעילים
                const userPersonalGoals = goals.filter(g => (g.user_email || "").trim().toLowerCase() === uEmail && (g.status === 'active' || !g.status));
                const userCompletedGoals = goals.filter(g => (g.user_email || "").trim().toLowerCase() === uEmail && g.status === 'completed');

                // חישוב ניקוד
                const pagesLearned = goals
                    .filter(g => (g.user_email || "").trim().toLowerCase() === uEmail)
                    .reduce((sum, g) => sum + (g.current_unit || 0), 0);

                const totalScore = pagesLearned + (user.reward_points || 0);

                return {
                    id: user.email,
                    name: user.is_anonymous ? "לומד אנונימי" : (user.display_name || "לומד"),
                    original_name: user.display_name || "לומד", // שם מקורי עבור מנהל
                    city: user.city || "",
                    phone: user.phone || "",
                    address: user.address || "",
                    age: user.age || null,
                    lastSeen: user.last_seen, // נמיר לתאריך עברי בתצוגה
                    email: user.email,
                    learned: totalScore, // ← זה חשוב! (שם המשתנה נשאר learned מסיבות תאימות)
                    books: userPersonalGoals.map(g => g.book_name), // ← וזה!
                    completedBooks: userCompletedGoals.map(g => g.book_name),
                    isAnonymous: user.is_anonymous,
                    subscription: user.subscription || { amount: 0, level: 0 }, // נתוני מנוי
                    security_questions: user.security_questions || [],
                    password: user.password || '***', // הוספת שדה סיסמה אם קיים
                    reward_points: user.reward_points || 0,
                    chat_rating: user.chat_rating || 0, // דירוג חברתי
                    isBot: user.is_bot || false, // הוספת שדות רצף
                    current_streak: user.current_streak || 0,
                    last_streak_date: user.last_streak_date,
                    badges: user.badges || [],
                    is_banned: user.is_banned || false
                };
            });
            hasChanges = true;

            // עדכון סטטוס מחובר בחלונות צ'אט פתוחים
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

            // console.log("סונכרנו בהצלחה: " + globalUsersData.length + " לומדים.");
            renderLeaderboard();
            if (document.getElementById('screen-chavrutas').classList.contains('active')) renderChavrutas();
            if (document.getElementById('screen-chats').classList.contains('active')) renderChatList(currentChatFilter, null, true);
            renderGoals();
        }

        // עדכון מונה מחוברים בזמן אמת עבור האדמין
        // עדכון מסך ניהול בזמן אמת אם הוא פתוח
        if (typeof renderAdminPanel === 'function' && document.getElementById('screen-admin') && document.getElementById('screen-admin').classList.contains('active')) renderAdminPanel();
        if (typeof renderAdminReports === 'function' && document.getElementById('admin-sec-reports') && document.getElementById('admin-sec-reports').classList.contains('active')) renderAdminReports();
        if (typeof renderAdminDonations === 'function' && document.getElementById('admin-sec-donations') && document.getElementById('admin-sec-donations').classList.contains('active')) renderAdminDonations();

        loadChatRating(); // Update rating in dashboard
        // רענון פתקים אם המודאל פתוח (תיקון סנכרון)
        if (document.getElementById('notesModal').style.display === 'flex' && currentNotesData.goalId) {
            // בדיקה אם המשתמש מקליד כרגע כדי לא לאפס לו את הפתק
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
        // טיפול בשגיאות סנכרון
        console.error("שגיאה בסנכרון נתונים:", e.message);
    }
    checkIncomingRequests()
}

async function syncUnreadMessages() {
    if (!currentUser) return;

    try {
        // Using RPC to bypass RLS - this can be slow if the user has many messages.
        const { data: unreadChats, error: chatError } = await supabaseClient.rpc('get_my_unread_messages', {
            p_my_email: currentUser.email
        });

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

                // בדיקה אם ההודעה ישנה יותר מזמן הקריאה האחרון (טיפול בעדכון איטי מהשרת)
                const msgTime = new Date(msg.created_at).getTime();
                const lastRead = lastReadTimes[sEmail] || 0;
                if (msgTime <= lastRead) return; // דלג אם כבר נקרא מקומית

                // בדיקה אם חלון הצ'אט פתוח (צף או ראשי) - אם כן, לא נספור את ההודעה כ"לא נקראה"
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

        // This part was for auto-opening chat windows, which is disabled.
        // It's safe to keep it here as it doesn't perform heavy operations.
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
        await supabaseClient.from('users').update({ last_seen: new Date() }).eq('email', currentUser.email);
    } catch (e) { console.error("Heartbeat error", e); }
}