const SUPABASE_URL = 'https://afihonprbwaoiokowsty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nAMFWiuTDObLLVoofQurSw_VSbSXxRT';
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
let announcedRanks = new Set();
let realAdminUser = null;
let adminChartInstance = null;
let globalZIndex = 10000;
let activeReply = null;
let lastChatListHTML = '';
let lastChatListHash = '';

async function syncGlobalData() {
    try {
        let hasChanges = false;

let { data: users, error: usersError } = await supabaseClient
            .from('safe_profiles')
            .select('id, email, display_name, city, rank_score, chat_rating, last_seen, is_anonymous')
            .order('rank_score', { ascending: false })
            .limit(100);

        if (usersError && usersError.code === '42703') {
            
            const fb = await supabaseClient
                .from('safe_profiles')
                .select('id, email, display_name, city, rank_score, last_seen, is_anonymous')
                .order('rank_score', { ascending: false })
                .limit(100);
            users = fb.data;
            usersError = fb.error;
        }

        if (usersError) {
            console.error("Supabase Users Error:", usersError);
            if (usersError.code === "PGRST301" || usersError.code === "401" || (usersError.message && usersError.message.includes("JWT"))) await customAlert("שגיאת התחברות (401):<br>מפתח ה-API בקובץ api.js אינו תקין.<br>יש להעתיק את מפתח ה-anon public מלוח הבקרה של Supabase.", true);
            throw usersError;
        }

        let goals = [];
        if (currentUser && currentUser.email && !window.knownMissingTables.has('user_goals')) {
            const userIdForQuery = (currentUser.id && !currentUser.id.includes('@')) ? currentUser.id : null;

            let query = supabaseClient.from('user_goals').select('*');
            if (userIdForQuery) {
                query = query.eq('user_id', userIdForQuery); 
            } else {

console.warn("Querying user_goals without valid UUID");
            }

            let { data, error: goalsError } = await query;

            if (goalsError) {
                if (goalsError.status === 404 || goalsError.code === 'PGRST205') {
                    window.knownMissingTables.add('user_goals');
                    console.log("Note: user_goals table missing");
                } else throw goalsError;
            } else {
                goals = data || [];
            }
        }

const { data: donations } = await supabaseClient.from('donations').select('amount');
        const totalDonated = donations ? donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) : 0;

const progressOverride = null;
        const goalAmount = 6500;

const percentage = progressOverride ? parseFloat(progressOverride) : Math.min(100, Math.round((totalDonated / goalAmount) * 100));
        const currentAmount = progressOverride ? Math.round((percentage / 100) * goalAmount) : totalDonated;

        localStorage.setItem('torahApp_campaign_progress', percentage);

        const progressText = document.getElementById('campaignProgressText');
        const progressBar = document.getElementById('campaignProgressBar');
        if (progressText && progressBar) {
            progressText.innerText = `גייסנו ${currentAmount.toLocaleString()} ₪ מתוך ${goalAmount.toLocaleString()} ₪ (${percentage}%)`;
            progressBar.style.width = percentage + '%';
        }

        if (currentUser) {
            const consolidatedGoalsMap = new Map();
            userGoals.forEach(g => consolidatedGoalsMap.set(g.bookName, g));

            (goals || []).forEach(cloudG => {
                const cloudGoal = {
                    id: cloudG.id.toString(),
                    bookName: cloudG.book_name,
                    totalUnits: cloudG.total_pages,
                    currentUnit: cloudG.current_page || 0,
                    status: cloudG.status || 'active',
                    targetDate: cloudG.target_date || '',
                    notes: cloudG.notes || [],
                    startDate: cloudG.created_at
                };
                const existing = consolidatedGoalsMap.get(cloudGoal.bookName);
                if (!existing || cloudGoal.currentUnit > (existing.currentUnit || 0) || (existing.id && existing.id.length > 20)) {
                    consolidatedGoalsMap.set(cloudGoal.bookName, cloudGoal);
                }
            });

            userGoals = Array.from(consolidatedGoalsMap.values());
            userGoals.sort((a, b) => {
                if (a.status === b.status) return new Date(b.startDate) - new Date(a.startDate);
                return a.status === 'active' ? -1 : 1;
            });

            renderGoals();
        }

        if (currentUser && currentUser.id && !currentUser.id.includes('@')) {
            const { data: requests, error: reqError } = await supabaseClient
                .from('chavruta_connections') 
                .select('*').or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

            if (reqError && reqError.status !== 404 && reqError.code !== 'PGRST205') {
                console.error("Chavruta requests fetch error:", reqError);
            }

            approvedPartners.clear();
            chavrutaConnections = [];
            pendingSentRequests = [];
            if (requests) {
                for (const r of requests) {
                    if (r.status === 'accepted' || r.status === 'approved') {
                        const partnerId = r.sender_id === currentUser.id ? r.receiver_id : r.sender_id;
                        
                        const partnerData = users ? users.find(u => u.id === partnerId) : null;
                        let partnerEmail = partnerData?.email || null;
                        let pName;

                        if (partnerData) {
                            pName = partnerData.display_name || partnerData.email || partnerId;
                        } else {
                            
                            const fromGlobal = globalUsersData.find(u => u.id === partnerId);
                            if (fromGlobal) {
                                pName = fromGlobal.name;
                                if (!partnerEmail) partnerEmail = fromGlobal.email || null;
                            } else {
                                
                                try {
                                    const { data: dp } = await supabaseClient
                                        .from('profiles_public')
                                        .select('display_name, email')
                                        .eq('id', partnerId)
                                        .maybeSingle();
                                    pName = dp?.display_name || dp?.email || partnerId;
                                    if (!partnerEmail && dp?.email) partnerEmail = dp.email;
                                } catch(e) {
                                    pName = partnerId;
                                }
                            }
                        }

                        approvedPartners.add(partnerId);
                        if (partnerEmail) approvedPartners.add(partnerEmail);
                        chavrutaConnections.push({ id: r.id, partnerId, email: partnerEmail, book: r.book_name, name: pName });
                    } else if (r.status === 'pending' && r.sender_id === currentUser.id) {
                        pendingSentRequests.push({ receiver: r.receiver_id, book: r.book_name, created_at: r.created_at });
                    }
                }
                localStorage.setItem('torahApp_chavrutas', JSON.stringify(chavrutaConnections));
            }
        }

        if (users) {
            globalUsersData = users.map(user => {
                let booksArray = [];
                const rawMasechtot = user.masechtot || user.active_masechtot || "";

                if (Array.isArray(rawMasechtot)) {
                    booksArray = rawMasechtot;
                } else if (typeof rawMasechtot === 'string' && rawMasechtot.trim() !== '') {
                    booksArray = rawMasechtot.split(',').map(s => s.trim());
                }

                const learnedScore = parseInt(user.rank_score || user.learned || user.total_learned) || 0;
                const masechtotString = Array.isArray(rawMasechtot) ? rawMasechtot.join(', ') : rawMasechtot;

const rawName = user.display_name;
                const isPlaceholder = !rawName || rawName === 'User Name' || rawName === 'user' || rawName === 'User';
                const displayName = isPlaceholder ? (user.email ? user.email.split('@')[0] : "לומד") : rawName;
                const subTier = user.subscription_tier || (user.subscription?.level) || 0;
                return {
                    id: user.id || user.email,
                    name: displayName,
                    original_name: user.is_anonymous ? null : displayName,
                    city: user.city || "",
                    phone: user.phone || "",
                    age: user.age || null,
                    address: user.address || "",
                    lastSeen: user.last_seen,
                    email: user.email,
                    learned: learnedScore,
                    masechtot: masechtotString,
                    books: booksArray,
                    isAnonymous: user.is_anonymous,
                    subscription: { amount: 0, level: subTier },
                    security_questions: user.security_questions || [],
                    reward_points: user.reward_points || 0,
                    chat_rating: user.chat_rating || 0,
                    isBot: user.is_bot || false,
                    isBanned: user.is_banned || false,
                    avatar_url: user.avatar_url || null,
                    background_url: user.background_url || null
                };
            });

try {
                const { data: bannedRows } = await supabaseClient
                    .from('profiles_public')
                    .select('id, is_banned')
                    .eq('is_banned', true);
                if (bannedRows && bannedRows.length > 0) {
                    const bannedIds = new Set(bannedRows.map(r => r.id));
                    globalUsersData.forEach(u => { if (bannedIds.has(u.id)) u.isBanned = true; });
                }
            } catch (e) {  }

if (!window._avatarUrlsLoaded) {
                window._avatarUrlsLoaded = true;
                try {
                    const ids = globalUsersData.map(u => u.id).filter(Boolean);
                    if (ids.length > 0) {
                        const { data: avatarRows } = await supabaseClient
                            .from('profiles_public').select('id, avatar_url, user_icon, background_url').in('id', ids);
                        if (avatarRows) {
                            const avatarMap = {}, iconMap = {}, bgMap = {};
                            avatarRows.forEach(r => {
                                if (r.avatar_url) avatarMap[r.id] = r.avatar_url;
                                if (r.user_icon) iconMap[r.id] = r.user_icon;
                                if (r.background_url) bgMap[r.id] = r.background_url;
                            });
                            globalUsersData.forEach(u => {
                                if (avatarMap[u.id]) u.avatar_url = avatarMap[u.id];
                                if (iconMap[u.id]) u.user_icon = iconMap[u.id];
                                if (bgMap[u.id]) u.background_url = bgMap[u.id];
                            });
                        }
                    }
                } catch (e) {  }
            }

try {
                const { data: tags } = await supabaseClient.from('user_tags').select('user_id, tag_text, tag_color');
                if (tags && tags.length > 0) {
                    const tagMap = {};
                    tags.forEach(t => { tagMap[t.user_id] = { text: t.tag_text, color: t.tag_color }; });
                    globalUsersData.forEach(u => { u.tag = tagMap[u.id] || null; });
                }
            } catch (e) {  }

if (window._publicActiveBooksOk !== false) {
                try {
                    const { data: activeBooks, error: abErr } = await supabaseClient.from('public_active_books').select('user_id, book_name');
                    if (abErr) {
                        window._publicActiveBooksOk = false; 
                    } else {
                        window._publicActiveBooksOk = true;
                        if (activeBooks && activeBooks.length > 0) {
                            const booksMap = {};
                            activeBooks.forEach(row => {
                                if (!booksMap[row.user_id]) booksMap[row.user_id] = [];
                                booksMap[row.user_id].push(row.book_name);
                            });
                            globalUsersData.forEach(u => { if (booksMap[u.id]) u.books = booksMap[u.id]; });
                        }
                    }
                } catch (e) { window._publicActiveBooksOk = false; }
            }

if (window._publicActiveBooksOk === false) {
                try {
                    const { data: goalBooks, error: gbErr } = await supabaseClient
                        .from('user_goals')
                        .select('user_id, book_name')
                        .eq('status', 'active');
                    if (!gbErr && goalBooks && goalBooks.length > 0) {
                        const booksMap = {};
                        goalBooks.forEach(row => {
                            if (!booksMap[row.user_id]) booksMap[row.user_id] = [];
                            if (!booksMap[row.user_id].includes(row.book_name)) booksMap[row.user_id].push(row.book_name);
                        });
                        globalUsersData.forEach(u => { if (booksMap[u.id]) u.books = booksMap[u.id]; });
                    }
                } catch (e) { console.warn("Could not fetch books from user_goals:", e); }
            }

            if (currentUser && currentUser.id) {
                localStorage.setItem('torahApp_user', JSON.stringify(currentUser));

try {
                    await supabaseClient.from('activity_log')
                        .upsert({ user_id: currentUser.id, activity_date: new Date().toISOString().slice(0, 10) },
                            { onConflict: 'user_id,activity_date', ignoreDuplicates: true });
                } catch (e) {  }
            }

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
        console.error("Full DB Error (Sync Global Data):", e.message, e.details || e);
    }
    checkIncomingRequests()
}

async function updateUserPoints(newPoints) {
    try {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            throw new Error("Authentication session not found.");
        }

        const { data, error: updateError } = await supabaseClient
            .from('profiles_public')
            .update({ reward_points: newPoints })
            .eq('id', user.id)
            .select();

        if (updateError) throw updateError;

        if (!data || data.length === 0) {
            throw new Error("Update failed: No rows modified. Verify RLS policies.");
        }

        return "Points updated successfully!";
    } catch (error) {
        console.error("Full DB Error (Update User Points):", error.message, error.details || error);
        return `Update failed: ${error.message}`;
    }
}

async function syncUnreadMessages() {
    if (!currentUser) return;
    try {
        const connIds = typeof chavrutaConnections !== 'undefined'
            ? chavrutaConnections.filter(c => c.id).map(c => c.id)
            : [];
        if (connIds.length === 0) return;

        const { data } = await supabaseClient
            .from('chat_private')
            .select('connection_id, sender_id, created_at')
            .in('connection_id', connIds)
            .neq('sender_id', currentUser.id)
            .eq('is_read', false);

        if (!data) return;

        const newUnread = {};
        data.forEach(msg => {
            const conn = chavrutaConnections.find(c => c.id === msg.connection_id);
            if (conn?.email) {
                const emailKey = conn.email.startsWith('book:') ? conn.email : conn.email.toLowerCase();
                const lastRead = (typeof lastReadTimes !== 'undefined' && lastReadTimes[emailKey]) || 0;
                if (lastRead) {
                    const msgTime = msg.created_at ? new Date(msg.created_at).getTime() : 0;
                    if (msgTime <= lastRead + 5000) return;
                }
                newUnread[emailKey] = (newUnread[emailKey] || 0) + 1;
            }
        });

        unreadMessages = newUnread;
        localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
        if (typeof updateChatBadge === 'function') updateChatBadge();
        if (typeof renderChavrutas === 'function' && document.getElementById('screen-chavrutas')?.classList.contains('active')) renderChavrutas();
    } catch (e) {
        console.error('syncUnreadMessages error:', e);
    }
}
async function sendHeartbeat() {
    if (!currentUser || !currentUser.id) return;
    try {
        const now = new Date().toISOString();
        const { error } = await supabaseClient
            .from('profiles_public')
            .update({ last_seen: now })
            .eq('id', currentUser.id);

        if (error) {
            if (error.status === 500 || error.code === 'PGRST301') {
                console.warn("Heartbeat blocked by server (RLS/Trigger). User might be restricted.");
            } else {
                console.warn("Full DB Error (Heartbeat):", error.message, error.details || error);
            }
        }

const today = now.split('T')[0];
        await supabaseClient
            .from('activity_log')
            .upsert({ user_id: currentUser.id, activity_date: today, visit_count: 1 }, { onConflict: 'user_id,activity_date', ignoreDuplicates: false })
            .then(({ error: logErr }) => {
                if (logErr && logErr.code !== '23505') {
                    
                    supabaseClient.rpc('increment_activity', { p_user_id: currentUser.id, p_date: today }).catch(() => {});
                }
            });
    } catch (e) { console.error("Full DB Error (Heartbeat Catch):", e.message, e.details || e); }
}

async function trackPageView(pageName) {
    if (!pageName) return;
    try {
        await supabaseClient.from('page_views').insert({
            user_id: currentUser?.id || null,
            page_name: pageName,
            viewed_at: new Date().toISOString()
        });
    } catch (e) {  }
}

window.toggleMaintenanceMode = async function () {
    
    alert("ניהול מצב תחזוקה אינו זמין כרגע (טבלת settings חסרה).");
};

async function loadParnasBanner() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabaseClient
            .from('parnas_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        const banner = document.getElementById('parnas-banner');
        if (!banner) return;

        if (error || !data || !data.length) {
            banner.style.display = 'none';
            updateBannersRowLayout();
            return;
        }

        let dayShown = false, monthShown = false;

        for (const p of data) {
            if (p.type === 'day' && !dayShown) {
                if (p.start_date === today) {
                    const card = document.getElementById('parnas-day-card');
                    const textEl = document.getElementById('parnas-day-text');
                    const dedEl  = document.getElementById('parnas-day-dedication');
                    if (card && textEl) {
                        textEl.textContent = p.sponsor_name;
                        if (p.dedicated_to && dedEl) {
                            dedEl.textContent = `${p.dedication_type || 'לזכות'} ${p.dedicated_to}`;
                        }
                        card.style.display = 'block';
                        dayShown = true;
                    }
                }
            } else if (p.type === 'month' && !monthShown) {
                const start = p.start_date;
                const end   = p.end_date || p.start_date;
                if (today >= start && today <= end) {
                    const card = document.getElementById('parnas-month-card');
                    const textEl = document.getElementById('parnas-month-text');
                    const dedEl  = document.getElementById('parnas-month-dedication');
                    if (card && textEl) {
                        textEl.textContent = p.sponsor_name;
                        if (p.dedicated_to && dedEl) {
                            dedEl.textContent = `${p.dedication_type || 'לזכות'} ${p.dedicated_to}`;
                        }
                        card.style.display = 'block';
                        monthShown = true;
                    }
                }
            }
            if (dayShown && monthShown) break;
        }

        const skeleton = document.getElementById('parnas-skeleton');
        if (dayShown || monthShown) {
            if (skeleton) skeleton.style.display = 'none';
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }
        updateBannersRowLayout();
    } catch (e) {
        console.warn('loadParnasBanner error:', e.message);
    }
}

function updateBannersRowLayout() {
    const row = document.getElementById('banners-row');
    const parnas = document.getElementById('parnas-banner');
    const dafYomi = document.getElementById('daf-yomi-banner');
    if (!row) return;
    const parnasVisible = !!parnas && parnas.style.display !== 'none';
    const dafVisible = !!dafYomi && dafYomi.style.display !== 'none';
    if (parnasVisible && dafVisible) {
        row.style.display = 'flex';
    } else if (parnasVisible || dafVisible) {
        row.style.display = 'flex';
        if (parnas) parnas.style.flex = parnasVisible ? '1' : '';
        if (dafYomi) dafYomi.style.flex = dafVisible ? '1' : '';
    } else {
        row.style.display = 'none';
    }
}