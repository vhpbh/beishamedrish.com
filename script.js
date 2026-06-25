document.addEventListener('DOMContentLoaded', () => {
    setupInterfaceChanges();
    loadDonationTiersFromDB();
    checkLiveClasses();
});

async function loadDonationTiersFromDB() {
    try {
        const { data, error } = await supabaseClient.from('site_config').select('value').eq('key', 'donation_tiers').maybeSingle();
        if (error || !data?.value) return;
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        const normTier = t => ({ ...t, price: t.price ?? t.amount ?? t.value ?? 0, name: t.name ?? t.label ?? t.title ?? '' });
        if (parsed.sub && Array.isArray(parsed.sub) && parsed.sub.length > 0) {
            SUBSCRIPTION_TIERS.length = 0;
            parsed.sub.map(normTier).forEach(t => SUBSCRIPTION_TIERS.push(t));
        }
        if (parsed.one && Array.isArray(parsed.one) && parsed.one.length > 0) {
            ONE_TIME_TIERS.length = 0;
            parsed.one.map(normTier).forEach(t => ONE_TIME_TIERS.push(t));
        }
    } catch(e) {}
}

let currentUser = null;
let currentUserPermissions = {};

function hasPermission(perm) {
    return !!(currentUserPermissions && currentUserPermissions[perm]);
}

let currentLeaderboardSort = 'learned';
let lastLeaderboardHTML = '';

let dafYomiToday = null;
let dafYomiTodayUrl = null;
let chatInterval = null;
let chatChannel = null;
let realtimeSubscription = null;

async function addRewardPointsDB(userId, amount) {
    try {
        const { data: cur } = await supabaseClient.from('profiles_public').select('reward_points,lifetime_zuzim').eq('id', userId).maybeSingle();
        const newPts = Math.max(0, (cur?.reward_points || 0) + amount);
        const updateData = { reward_points: newPts };
        if (amount > 0) {
            updateData.lifetime_zuzim = (cur?.lifetime_zuzim || 0) + amount;
        }
        const { error } = await supabaseClient.from('profiles_public').update(updateData).eq('id', userId);
        if (!error && userId === currentUser?.id) {
            currentUser.reward_points = newPts;
            if (amount > 0) currentUser.lifetime_zuzim = (currentUser.lifetime_zuzim || 0) + amount;
            localStorage.setItem('torahApp_user', JSON.stringify(currentUser));
            const el = document.getElementById('user-points-display');
            if (el) el.textContent = newPts.toLocaleString();
        }
        return error ? null : newPts;
    } catch (e) { console.warn('Could not update reward_points:', e); return null; }
}

async function init() {
    // Capture OAuth return state BEFORE getSession() removes the code from the URL
    const isOAuthReturn = !!(
        new URLSearchParams(window.location.search).get('code') ||
        window.location.hash.includes('access_token')
    );

    const _hashScreen = window.location.hash.substring(1).split('?')[0].split('&')[0];
    if (_hashScreen && document.getElementById('screen-' + _hashScreen)) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const _hs = document.getElementById('screen-' + _hashScreen);
        if (_hs) _hs.classList.add('active');
        const _bn = document.querySelector('.floating-nav-container');
        if (_hashScreen === 'chats' && _bn) _bn.classList.add('nav-hidden');
    }

    try {
        const { data: maint } = await supabaseClient.from('system_announcements').select('content').eq('target_type', 'maintenance').maybeSingle();
        if (maint) {
            document.body.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:#fff;text-align:center;padding:2rem;font-family:sans-serif;"><div style="font-size:4rem;margin-bottom:1rem;">🔧</div><h1 style="font-size:2rem;font-weight:900;margin-bottom:0.5rem;">בית המדרש</h1><p style="color:#94a3b8;font-size:1.1rem;max-width:400px;line-height:1.6;">${maint.content || 'האתר עובר תחזוקה. נחזור בקרוב!'}</p></div>`;
            return;
        }
    } catch(e) {  }

    checkBanStatus();

try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user?.id) {
            const { data: banCheck } = await supabaseClient
                .from('profiles_public')
                .select('is_banned')
                .eq('id', session.user.id)
                .maybeSingle();
            if (banCheck?.is_banned) {
                localStorage.setItem('device_banned', 'true');
                sessionStorage.setItem('banned_email', session.user.email || '');
                const bannedEl = document.getElementById('banned-overlay');
                if (bannedEl) bannedEl.style.display = 'flex';
                return;
            }
        }
    } catch(e) {  }

const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    handleAuthErrorFromURL(hashParams);
    if (queryParams.get('error')) handleAuthErrorFromURL(queryParams);

const viewUserId = queryParams.get('user') || queryParams.get('id');
    if (viewUserId) {
        
        setTimeout(() => showUserDetails(viewUserId), 1000);
    }

let activeSession = null;
    try {
        const { data } = await supabaseClient.auth.getSession();
        activeSession = data?.session || null;
    } catch(sessionErr) {
        console.warn('getSession failed, continuing as guest:', sessionErr?.message);
    }

    let storedUserRaw = null;
    try {
        storedUserRaw = localStorage.getItem('torahApp_user');
        if (storedUserRaw) {
            const storedParsed = JSON.parse(storedUserRaw);
            const storedEmail = storedParsed.email ? storedParsed.email.toLowerCase() : '';
            const sessionEmail = activeSession?.user?.email ? activeSession.user.email.toLowerCase() : '';
            if (!activeSession) {
                
                localStorage.removeItem('torahApp_user');
                storedUserRaw = null;
                clearLocalUserData();
            } else if (storedEmail && sessionEmail && storedEmail !== sessionEmail) {
                
                console.warn('Session/localStorage mismatch detected. Clearing stale user data.');
                localStorage.removeItem('torahApp_user');
                storedUserRaw = null;
                clearLocalUserData();
            }
        }
    } catch(lsErr) {
        console.warn('localStorage parse error, clearing:', lsErr?.message);
        localStorage.removeItem('torahApp_user');
        storedUserRaw = null;
        clearLocalUserData();
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            const newPass = await customPrompt("הזן סיסמה חדשה:");
            if (!newPass) return;
            if (!validateInput(newPass, 'password')) {
                await customAlert("הסיסמה חייבת להכיל לפחות 6 תווים, כולל אותיות ומספרים.");
                return;
            }
            const { error } = await supabaseClient.auth.updateUser({ password: newPass });
            if (error) {
                await customAlert("שגיאה בעדכון הסיסמה: " + error.message);
            } else {
                await customAlert("הסיסמה עודכנה בהצלחה! כעת ניתן להתחבר.");
                window.history.replaceState(null, null, window.location.pathname);
            }
            return;
        }

        if ((event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && isOAuthReturn)) && session) {
            if (currentUser) {
                currentUser.id = session.user.id;
                if (!currentUser.email) currentUser.email = session.user.email;
                localStorage.setItem('torahApp_user', JSON.stringify(currentUser));
            }

            if (!currentUser) {
                try {
                    let { data: userRecord } = (session.user && session.user.id) ? await supabaseClient.from('profiles_public').select('id, email, display_name, city, rank_score, chat_rating, is_anonymous, last_seen, is_banned, reward_points').eq('id', session.user.id).maybeSingle() : { data: null };

                    if (userRecord && userRecord.is_banned) {
                        if (typeof checkBanStatusFromDB === 'function') {
                            await checkBanStatusFromDB(session.user.id, session.user.email);
                        }
                        return;
                    }

                    if (!userRecord && session.user && session.user.id) {
                        console.log("User record missing in public table. Retrying...");
                        await new Promise(r => setTimeout(r, 3000));

                        const retry = await supabaseClient.from('profiles_public').select('id, email, display_name, city, rank_score, chat_rating, is_anonymous, last_seen, is_banned, reward_points').eq('id', session.user.id).maybeSingle();
                        userRecord = retry.data;
                    }

                    if (!userRecord && session.user) {
                        console.warn("User record missing after retry. Attempting to create from session metadata.");
                        const metadata = session.user.user_metadata;
                        const newUserData = {
                            id: session.user.id,
                            email: session.user.email,
                            display_name: metadata.display_name || session.user.email.split('@')[0],
                            city: metadata.city || null,
                            is_anonymous: metadata.is_anonymous || false,
                            last_seen: new Date().toISOString()
                        };

                        const { data: createdUser, error: createError } = await supabaseClient.from('profiles_public').upsert([newUserData], { onConflict: 'id' }).select().single();
                        if (createError) {
                            console.error("Error creating user record from session metadata:", createError);
                            userRecord = { id: session.user.id, email: session.user.email, display_name: newUserData.display_name, is_anonymous: newUserData.is_anonymous };
                        } else {
                            userRecord = createdUser;

                            if (typeof handleReferralOnSignup === 'function') {
                                setTimeout(() => handleReferralOnSignup(session.user.id), 2000);
                            }

                            if (session.user.app_metadata?.provider === 'google') {
                                try {
                                    await supabaseClient.from('newsletter_subscribers').insert({
                                        email: session.user.email,
                                        name: userRecord.display_name || '',
                                        is_new: true
                                    });
                                } catch(e) { /* silent */ }
                            }
                        }
                    }

                    if (userRecord) {
                        currentUser = mapUserFromDB(userRecord);
                        currentUser.email = session.user.email;
                        localStorage.setItem('torahApp_user', JSON.stringify(currentUser));

                        const isRedirecting = await checkUserProfile(session.user);
                        if (isRedirecting) return;

                        document.getElementById('auth-overlay').style.display = 'none';
                        const glo = document.getElementById('google-loading-overlay');
                        if (glo) glo.style.display = 'none';
                        document.body.style.overflow = '';
                        updateHeader();
                        restoreAuthenticatedHeader();

                        await syncGlobalData();
                        updateHeaderAvatar();
                        await loadGoals();
                        await loadUserProfile();
                        getDafYomi();

                        showToast("האימייל אומת בהצלחה! התחברת.", "success");
                        switchScreen('dashboard', document.querySelector('.floating-nav-item'));

                        window.history.replaceState(null, null, window.location.pathname);
                    }
                } catch (e) {
                    console.error("Auto login failed:", e);
                    const gloErr = document.getElementById('google-loading-overlay');
                    if (gloErr) gloErr.style.display = 'none';
                    if (typeof showToast === 'function') showToast("שגיאה בהתחברות עם גוגל. אנא נסה שוב.", "error");
                }
            }
        }
    });

    let storedUser = null;
    try {
        storedUser = localStorage.getItem('torahApp_user'); 
        if (storedUser) currentUser = JSON.parse(storedUser);
    } catch(parseErr) {
        console.warn('Failed to parse stored user, clearing:', parseErr?.message);
        localStorage.removeItem('torahApp_user');
        storedUser = null;
        currentUser = null;
    }
    if (storedUser && currentUser) {
        
        if (activeSession?.user?.email) currentUser.email = activeSession.user.email;
        document.getElementById('auth-overlay').style.display = 'none';
        updateHeader();
        restoreAuthenticatedHeader();

        await syncGlobalData();
        updateHeaderAvatar();

        await loadGoals();
        await loadUserProfile();

        const cachedRating = localStorage.getItem('torahApp_rating');
        if (cachedRating) {
            const dashStat = document.getElementById('stat-rating');
            if (dashStat) dashStat.innerText = cachedRating;
        }

        const cachedStats = JSON.parse(localStorage.getItem('torahApp_stats') || '{}');
        if (cachedStats) {
            if (document.getElementById('stat-books')) document.getElementById('stat-books').innerText = cachedStats.books || 0;
            if (document.getElementById('stat-pages')) document.getElementById('stat-pages').innerText = cachedStats.pages || 0;
            if (document.getElementById('stat-completed')) document.getElementById('stat-completed').innerText = cachedStats.completed || 0;
        }

        updateHebrewTodayDate();
        renderStreakDisplay(parseInt(localStorage.getItem('torahApp_streak_count') || '0'));

getDafYomi();
        loadParnasBanner();
        checkCookieConsent();
        if (localStorage.getItem('torahApp_darkMode') === 'true') toggleDarkMode(null, true);
        notificationsEnabled = true;

        const completedStatCard = document.getElementById('stat-completed')?.closest('.stat-card');
        if (completedStatCard) {
            completedStatCard.style.cursor = 'pointer';
            completedStatCard.onclick = () => showCompletions();
        }
        updateFollowersCount();
        sendHeartbeat();
        setupRealtime();
        startBackgroundServices();
        checkSystemPopup();
        setTimeout(checkSitePopup, 3000);
        setTimeout(checkActiveLottery, 2000);

if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
        setTimeout(checkDailyReminders, 5000);
        setInterval(checkChavrutaReminders, 60000);

updateChatBadge();
        loadNotificationsFromDB();
        if (typeof updateDailyStreak === 'function') {
            await updateDailyStreak();
        }
        
        if (typeof handleNewsletterReadToken === 'function') {
            setTimeout(() => handleNewsletterReadToken(), 1500);
        }
        if (new URLSearchParams(window.location.search).get('subscribe_nl') === '1') {
            setTimeout(() => showNewsletterSubscribeModal(), 1000);
        }
        if (new URLSearchParams(window.location.search).get('bonus')) {
            setTimeout(() => handleBonusLink(), 2000);
        }

        const _initHash = window.location.hash.substring(1).split('?')[0];
        if (_initHash === 'chats' && typeof renderChatList === 'function') {
            setTimeout(() => renderChatList(typeof currentChatFilter !== 'undefined' ? currentChatFilter : 'personal'), 600);
        }
    } else {
        userGoals = [];
        localStorage.removeItem('torahApp_goals');
        document.getElementById('auth-overlay').style.display = 'none';
        setupGuestHeader();
        await syncGlobalData();
        startBackgroundServices();
        checkSystemPopup();
        setTimeout(checkSitePopup, 3000);
        renderLeaderboard();
        loadAds();
        getDafYomi();
        loadParnasBanner();
        checkCookieConsent();
        if (localStorage.getItem('torahApp_darkMode') === 'true') toggleDarkMode(null, true);
    }

const gloCleanup = document.getElementById('google-loading-overlay');
    if (gloCleanup) gloCleanup.style.display = 'none';

    const splash = document.getElementById('app-splash');
    if (splash) { splash.style.transition = 'opacity 0.3s'; splash.style.opacity = '0'; setTimeout(() => { splash.style.display = 'none'; }, 300); }

const screenFromHash = window.location.hash.substring(1).split('?')[0].split('&')[0];
    if (screenFromHash && document.getElementById('screen-' + screenFromHash)) {
        if (currentUser || !['chats', 'profile', 'chavrutas'].includes(screenFromHash)) {
            switchScreen(screenFromHash, null);
        }
    }
}

function handleAuthErrorFromURL(urlParams) {
    const error = urlParams.get('error');
    const errorCode = urlParams.get('error_code');
    const errorDescription = urlParams.get('error_description');

    if (error) {
        let message = `אירעה שגיאת אימות: ${error}`;
        if (errorCode) message += ` (קוד שגיאה: ${errorCode})`;
        if (errorDescription) message += `. תיאור: ${errorDescription}`;

        if (errorCode === 'otp_expired') {
            message = 'קישור האימות פג תוקף.<br>ניתן לשלוח קישור חדש:<br><br>' +
                `<button class="btn" onclick="resendVerificationEmail()">שלח שוב מייל אימות</button>`;
        }

        customAlert(message, true);
        window.history.replaceState(null, null, window.location.pathname);
    }
}

async function resendVerificationEmail() {
    if (!currentUser || !currentUser.email) {
        showToast('יש להתחבר תחילה כדי לשלוח מייל אימות', 'error');
        return;
    }
    try {
        const { error } = await supabaseClient.auth.resend({ type: 'signup', email: currentUser.email });
        if (error) showToast('שגיאה: ' + error.message, 'error');
        else showToast('מייל אימות נשלח שוב לכתובת ' + currentUser.email, 'success');
    } catch (e) {
        showToast('שגיאה: ' + e.message, 'error');
    }
}

async function checkSystemPopup() {
    try {
        const { data: announcements } = await supabaseClient
            .from('system_announcements')
            .select('*')
            .eq('target_type', 'all')
            .order('created_at', { ascending: true })
            .limit(20);

        if (!announcements || announcements.length === 0) return;

        const SEEN_KEY = 'torahApp_seen_popups';
        const seenIds = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');

        const unseen = announcements.filter(ann => {
            const deliveryType = ann.delivery_type || 'popup';
            if (deliveryType !== 'popup') return false;
            const msgContent = ann.message || ann.content || ann.text;
            if (!msgContent) return false;
            const announcementId = String(ann.id || ann.created_at);
            return !seenIds.includes(announcementId);
        });

        async function showNext(index) {
            if (index >= unseen.length) return;
            const ann = unseen[index];
            const rawContent = ann.message || ann.content || ann.text;
            const msgContent = (rawContent || '').replace(/\n/g, '<br>');
            let ctaHtml = '';
            if (ann.cta_text && ann.cta_url) {
                const safeUrl = ann.cta_url.replace(/"/g, '&quot;');
                ctaHtml = `<br><br><a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
                    style="display:inline-block;margin-top:8px;padding:8px 18px;background:#f59e0b;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
                    ${ann.cta_text}</a>`;
            }
            const announcementId = String(ann.id || ann.created_at);
            if (typeof showSystemPopup === 'function') {
                await showSystemPopup(msgContent + ctaHtml, () => {
                    const ids = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
                    if (!ids.includes(announcementId)) ids.push(announcementId);
                    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
                });
            }
            showNext(index + 1);
        }
        showNext(0);
    } catch (e) { console.error("Popup check error:", e); }
}

async function checkSitePopup() {
    try {
        const { data } = await supabaseClient.from('system_announcements').select('*').eq('target_type', 'site_popup').maybeSingle();
        if (!data) return;
        let info = {};
        try { info = JSON.parse(data.content); } catch(e) { return; }
        if (!info.title) return;
        const existing = document.getElementById('site-popup-overlay');
        if (existing) return;
        const overlay = document.createElement('div');
        overlay.id = 'site-popup-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;';
        const timerHtml = info.countdown_end ? `<div id="site-popup-timer" style="font-size:1.5rem;font-weight:900;color:#f59e0b;text-align:center;margin:0.75rem 0;letter-spacing:2px;">--:--:--</div>` : '';
        const linkHtml = info.link_url ? `<a href="${info.link_url}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:0.5rem;padding:10px 20px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:0.95rem;text-align:center;">${info.link_text || 'לחץ כאן'}</a>` : '';
        overlay.innerHTML = `<div style="background:var(--card-bg,#fff);border-radius:1.25rem;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden;font-family:'Assistant',sans-serif;" dir="rtl">
          <div style="background:linear-gradient(135deg,#1e3a5f,#1e40af);padding:1.25rem 1.5rem;display:flex;align-items:center;justify-content:space-between;">
            <div style="font-size:1.1rem;font-weight:800;color:#fff;">${info.title}</div>
            <button onclick="document.getElementById('site-popup-overlay').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:1rem;line-height:1;">✕</button>
          </div>
          <div style="padding:1.25rem 1.5rem;">
            ${info.body ? `<p style="color:var(--text-main,#334155);font-size:0.95rem;margin:0 0 0.5rem 0;line-height:1.6;">${info.body}</p>` : ''}
            ${timerHtml}
            ${linkHtml}
          </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        if (info.countdown_end) {
            const end = new Date(info.countdown_end).getTime();
            function tick() {
                const timerEl = document.getElementById('site-popup-timer');
                if (!timerEl) return;
                const diff = end - Date.now();
                if (diff <= 0) { timerEl.textContent = 'ההגרלה מתחילה!'; return; }
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                timerEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                setTimeout(tick, 1000);
            }
            tick();
        }
    } catch(e) { console.error('Site popup error:', e); }
}

const _hebcalCache = {};

async function _fetchHebcalHolidays(year, month) {
    const key = `${year}-${month}`;
    if (_hebcalCache[key] !== undefined) return _hebcalCache[key];
    try {
        const res = await fetch(
            `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&year=${year}&month=${month}`,
            { signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined }
        );
        const data = await res.json();
        const holidays = new Set();
        (data.items || []).forEach(item => {
            if (item.category === 'holiday' || item.yomtov) {
                holidays.add(item.date.substring(0, 10));
            }
        });
        _hebcalCache[key] = holidays;
        return holidays;
    } catch (e) {
        _hebcalCache[key] = new Set();
        return _hebcalCache[key];
    }
}

async function isShabbatOrYomTovAsync(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (d.getDay() === 6) return true;
    const holidays = await _fetchHebcalHolidays(d.getFullYear(), d.getMonth() + 1);
    return holidays.has(d.toISOString().split('T')[0]);
}


function isShabbatOrYomTov(date) {
    if (date.getDay() === 6) return true;
    try {
        const monthName = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long' }).format(date);
        const day = parseInt(new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric' }).format(date));
        const yomTovMap = {
            'תִּשְׁרֵי': [1,2,10,15,16,21,22], 'תשרי': [1,2,10,15,16,21,22],
            'נִיסָן': [15,16,21,22], 'ניסן': [15,16,21,22],
            'סִיוָן': [6], 'סיון': [6],
        };
        const holidays = yomTovMap[monthName] || yomTovMap[monthName.normalize()];
        if (holidays && holidays.includes(day)) return true;
    } catch(e) {}
    return false;
}


function _getStreakPrizeRange(streak) {
    if (streak < 7)  return [1, 2];
    if (streak < 30) return [1, 3];
    const month = Math.ceil(streak / 30); 
    return [1, 2 + month];               
}


function showDailyPrizeSpinner(prizeAmount, minPrize, maxPrize, streak) {
    if (document.getElementById('daily-prize-spinner')) return;

    const overlayStyle = [
        'position:fixed;inset:0;z-index:88888;',
        'background:rgba(10,15,30,0.93);',
        'display:flex;align-items:center;justify-content:center;',
        'flex-direction:column;'
    ].join('');

    const prizes = [];
    for (let i = minPrize; i <= maxPrize; i++) prizes.push(i);

    const rows = 24;
    const itemH = 72;
    const stopIdx = rows - 1 - Math.floor(rows / 3);
    const items = [];
    for (let i = 0; i < rows; i++) {
        const v = i < rows - prizes.length
            ? prizes[i % prizes.length]
            : (i === stopIdx ? prizeAmount : prizes[i % prizes.length]);
        items.push(v);
    }
    items[stopIdx] = prizeAmount;

    const stripHtml = items.map((v, i) => `
        <div class="sps-item" style="height:${itemH}px;display:flex;align-items:center;justify-content:center;
            font-size:2.5rem;font-weight:900;color:${i===stopIdx?'#fbbf24':'#94a3b8'};
            transition:color .3s;">${v}</div>
    `).join('');

    const el = document.createElement('div');
    el.id = 'daily-prize-spinner';
    el.style.cssText = overlayStyle;
    el.innerHTML = `
        <div style="text-align:center;margin-bottom:1.5rem;">
            ${streak >= 2 ? `<div style="font-size:1rem;color:#94a3b8;margin-bottom:.3rem;">
                <i class="fas fa-fire" style="color:#f97316;margin-left:4px;"></i>
                רצף ${streak} ימים!
            </div>` : ''}
            <div style="font-size:1.4rem;font-weight:800;color:#fff;">הגרלת הפרס היומי שלך</div>
        </div>
        <div style="position:relative;width:130px;height:${itemH}px;overflow:hidden;
                    border-radius:1rem;border:3px solid #fbbf24;
                    background:#0f172a;box-shadow:0 0 30px rgba(251,191,36,.4);">
            <div id="sps-strip" style="will-change:transform;display:flex;flex-direction:column;">
                ${stripHtml}
            </div>
            <div style="position:absolute;inset:0;pointer-events:none;
                background:linear-gradient(to bottom,rgba(10,15,30,.9) 0%,transparent 30%,transparent 70%,rgba(10,15,30,.9) 100%);"></div>
        </div>
        <div id="sps-result" style="margin-top:1.5rem;font-size:2rem;font-weight:900;color:#4ade80;
            opacity:0;transition:opacity .5s;text-align:center;"></div>
        <button id="sps-close" style="margin-top:1.2rem;background:#1e293b;color:#94a3b8;
            border:1px solid #334155;border-radius:.75rem;padding:.6rem 1.8rem;
            font-size:.9rem;font-weight:700;cursor:pointer;opacity:0;transition:opacity .5s;"
            onclick="document.getElementById('daily-prize-spinner').remove()">המשך</button>
        <style>
            @keyframes sps-bounce{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.04)}}
        </style>
    `;
    document.body.appendChild(el);

    const strip = document.getElementById('sps-strip');
    const targetTop = -(stopIdx * itemH - 0);
    let start = null;
    const totalDist = Math.abs(targetTop) + rows * itemH * 2;
    const duration = 2800;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function animate(ts) {
        if (!start) start = ts;
        const elapsed = ts - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOut(progress);
        const y = -(eased * (Math.abs(targetTop) + itemH * 1.5));
        strip.style.transform = `translateY(${Math.max(targetTop, y)}px)`;
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            strip.style.transform = `translateY(${targetTop}px)`;
            const resultEl = document.getElementById('sps-result');
            const closeEl = document.getElementById('sps-close');
            if (resultEl) {
                resultEl.textContent = `+${prizeAmount} זוזים!`;
                resultEl.style.opacity = '1';
                resultEl.style.animation = 'sps-bounce .4s ease';
            }
            if (closeEl) closeEl.style.opacity = '1';
        }
    }
    requestAnimationFrame(animate);
}

async function updateDailyStreak() {
    if (!currentUser || !currentUser.id) return;
    try {
        const today = new Date();
        const todayDate = today.toISOString().split('T')[0];
        const lastDate = localStorage.getItem('torahApp_streak_last') || '';
        if (lastDate === todayDate) return;

        const todayIsHoliday = await isShabbatOrYomTovAsync(today);
        if (todayIsHoliday) {
            localStorage.setItem('torahApp_streak_last', todayDate);
            return;
        }

        let streak = parseInt(localStorage.getItem('torahApp_streak_count') || '0');
        let streakContinued = false;

        if (lastDate) {
            const lastDay = new Date(lastDate + 'T12:00:00');
            const todayMidday = new Date(todayDate + 'T12:00:00');
            const daysDiff = Math.round((todayMidday - lastDay) / 86400000);

            if (daysDiff === 1) {
                streakContinued = true;
            } else if (daysDiff > 1 && daysDiff <= 10) {
                let allExempt = true;
                for (let d = 1; d < daysDiff; d++) {
                    const gapDate = new Date(lastDay.getTime() + d * 86400000);
                    if (!isShabbatOrYomTov(gapDate)) { allExempt = false; break; }
                }
                if (allExempt) {
                    streakContinued = true;
                } else if (daysDiff === 2) {
                    const freezeDays = parseInt(localStorage.getItem('torahApp_streak_freeze_days') || '0');
                    if (freezeDays > 0) {
                        const newFreeze = freezeDays - 1;
                        localStorage.setItem('torahApp_streak_freeze_days', newFreeze.toString());
                        streakContinued = true;
                        showToast(`יום הקפאה שמר על הרצף שלך! נותרו ${newFreeze} ימי הקפאה 🧊`, 'success');
                    }
                }
            }
        }

        if (streakContinued) {
            streak++;
        } else {
            streak = 1;
        }

        localStorage.setItem('torahApp_streak_last', todayDate);
        localStorage.setItem('torahApp_streak_count', streak.toString());
        renderStreakDisplay(streak);

        const [minP, maxP] = _getStreakPrizeRange(streak);
        const prize = minP + Math.floor(Math.random() * (maxP - minP + 1));

        await addRewardPointsDB(currentUser.id, prize);

        setTimeout(() => showDailyPrizeSpinner(prize, minP, maxP, streak), 1200);

    } catch (e) {
        console.error('Error updating daily streak:', e);
    }
}

function renderStreakDisplay(streak) {
    const badge = document.getElementById('profile-streak-badge');
    if (badge) badge.innerHTML = streak >= 2
        ? `<i class="fas fa-fire" style="color:#f97316;margin-left:3px;"></i>${streak}`
        : '';
}

function showStreakPopup() {
    const streak = parseInt(localStorage.getItem('torahApp_streak_count') || '0');
    const existing = document.getElementById('streak-popup-overlay');
    if (existing) existing.remove();

    const tips = [
        'למד לפחות דף אחד כל יום כדי לשמור על הרצף',
        'אפילו 5 דקות ביום שומרים את הרצף פעיל',
        'הגדר תזכורת יומית לשעה קבועה',
        'חברותא טובה עוזרת לשמור על הרצף — פגשו יחד',
        'הרצף לא נשבר בשבת וחג — האתר שומר את זה אוטומטית'
    ];
    const tip = tips[streak % tips.length];

    const messages = streak === 0
        ? { title: 'עדיין אין רצף', sub: 'התחל ללמוד היום ותצבור בונוס מחר!' }
        : streak < 7
        ? { title: `${streak} ימי רצף!`, sub: 'יפה! אתה בדרך הנכונה — אל תפסיק' }
        : streak < 30
        ? { title: `${streak} ימי רצף!`, sub: 'מרשים! שבוע ויותר של לימוד יומי רצוף' }
        : streak < 100
        ? { title: `${streak} ימי רצף!`, sub: 'מדהים! חודש ויותר — אתה בין הטובים' }
        : { title: `${streak} ימי רצף!`, sub: 'גדול עצום! אתה מהלומדים המופלאים ביותר' };

    const goals = [7, 30, 100, 365];

    const overlay = document.createElement('div');
    overlay.id = 'streak-popup-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:32px 28px;max-width:360px;width:100%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.18);position:relative;overflow:hidden;" dir="rtl">
            <div style="position:absolute;inset:0;opacity:0.06;background:radial-gradient(circle at 50% -10%,#f97316,transparent 65%);pointer-events:none;"></div>
            <button onclick="document.getElementById('streak-popup-overlay').remove()" style="position:absolute;top:14px;left:14px;background:rgba(0,0,0,.06);border:none;color:#64748b;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>

            <div style="width:80px;height:80px;margin:0 auto 6px;line-height:1;filter:drop-shadow(0 0 16px rgba(249,115,22,.5));"><img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif" alt="🔥" style="width:80px;height:80px;object-fit:contain;" loading="eager"></div>
            <div style="font-size:3.2rem;font-weight:900;color:#1e293b;line-height:1;margin-bottom:2px;">${streak}</div>
            <div style="font-size:0.85rem;color:#f97316;font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:16px;">ימי רצף לימוד</div>

            <div style="background:rgba(249,115,22,.07);border:1px solid rgba(249,115,22,.2);border-radius:14px;padding:12px 16px;margin-bottom:18px;">
                <div style="color:#1e293b;font-weight:800;font-size:1.05rem;margin-bottom:3px;">${messages.title}</div>
                <div style="color:#64748b;font-size:0.82rem;">${messages.sub}</div>
            </div>

            <div style="display:flex;justify-content:center;gap:8px;margin-bottom:18px;flex-wrap:wrap;">
                ${goals.map(g => {
                    const done = streak >= g;
                    return `<div style="padding:5px 13px;border-radius:99px;font-size:0.75rem;font-weight:700;background:${done ? 'rgba(249,115,22,.12)' : '#f1f5f9'};color:${done ? '#ea6010' : '#64748b'};border:1px solid ${done ? 'rgba(249,115,22,.35)' : '#e2e8f0'};">${done ? '✓ ' : ''}${g} ימים</div>`;
                }).join('')}
            </div>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:11px 14px;text-align:right;margin-bottom:20px;">
                <div style="font-size:0.68rem;color:#94a3b8;margin-bottom:4px;font-weight:600;">💡 טיפ ליציבות הרצף</div>
                <div style="font-size:0.82rem;color:#475569;line-height:1.5;">${tip}</div>
            </div>

            <button onclick="document.getElementById('streak-popup-overlay').remove()" style="background:linear-gradient(135deg,#f97316,#dc2626);color:#fff;border:none;border-radius:14px;padding:13px 28px;font-weight:700;font-size:0.95rem;cursor:pointer;width:100%;letter-spacing:.3px;box-shadow:0 4px 20px rgba(249,115,22,.35);">
                <i class="fas fa-fire" style="margin-left:6px;"></i>בואו נלמד!
            </button>
        </div>`;
    document.body.appendChild(overlay);
}

function showLotteryAnimation(ann) {
    const title = ann.title || '🎉 הגרלה!';
    const winnerName = ann.content || 'הזוכה';
    const fullMsg = ann.message || `הזוכה הוא: ${winnerName}`;

    const overlay = document.createElement('div');
    overlay.id = 'lottery-animation-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.96);display:flex;align-items:center;justify-content:center;flex-direction:column;';

    overlay.innerHTML = `
        <div id="lottery-drum" style="font-size:4rem;animation:spin 0.15s linear infinite;margin-bottom:1.5rem;"><i class="fas fa-dice" style="color:#fbbf24;"></i></div>
        <div id="lottery-status" style="font-size:1.4rem;font-weight:800;color:#fbbf24;text-align:center;padding:0 2rem;">ממתין לתוצאה...</div>
        <div id="lottery-winner-box" style="display:none;text-align:center;margin-top:1.5rem;">
            <div style="font-size:3rem;margin-bottom:0.5rem;"><i class="fas fa-trophy" style="color:#fbbf24;"></i></div>
            <div style="font-size:2rem;font-weight:900;color:#ffffff;margin-bottom:0.5rem;">${winnerName}</div>
            <div style="font-size:1rem;color:#94a3b8;">${fullMsg}</div>
            <button onclick="document.getElementById('lottery-animation-overlay').remove()" style="margin-top:1.5rem;background:#f59e0b;color:#1e293b;border:none;border-radius:0.75rem;padding:0.75rem 2rem;font-weight:800;font-size:1rem;cursor:pointer;">סגור</button>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } @keyframes winner-pop { 0% { transform: scale(0.5); opacity:0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity:1; } }';
    document.head.appendChild(style);
    document.body.appendChild(overlay);

    const names = [
        '<i class="fas fa-dice" style="color:#fbbf24;"></i>',
        '<i class="fas fa-dice-d6" style="color:#60a5fa;"></i>',
        '<i class="fas fa-star" style="color:#fbbf24;"></i>',
        '<i class="fas fa-gift" style="color:#a78bfa;"></i>',
        '<i class="fas fa-coins" style="color:#fbbf24;"></i>',
        '<i class="fas fa-gem" style="color:#34d399;"></i>'
    ];
    let idx = 0;
    const drumInterval = setInterval(() => {
        const drum = document.getElementById('lottery-drum');
        const status = document.getElementById('lottery-status');
        if (drum) drum.innerHTML = names[idx % names.length];
        if (status) status.textContent = ['ממתין...','טוחן גלגלים...','בוחר זוכה...'][Math.floor(idx / 4) % 3];
        idx++;
    }, 120);

    setTimeout(() => {
        clearInterval(drumInterval);
        const drum = document.getElementById('lottery-drum');
        const status = document.getElementById('lottery-status');
        const winnerBox = document.getElementById('lottery-winner-box');
        if (drum) { drum.innerHTML = '<i class="fas fa-trophy" style="color:#fbbf24;"></i>'; drum.style.animation = 'none'; }
        if (status) { status.textContent = title; status.style.color = '#4ade80'; }
        if (winnerBox) { winnerBox.style.display = 'block'; winnerBox.style.animation = 'winner-pop 0.6s ease-out'; }
    }, 4000);
}

async function subscribeToNewsletter(email) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        showToast('נא להזין כתובת אימייל תקינה', 'error');
        return false;
    }

    try {
        
        const { data: existing } = await supabaseClient
            .from('newsletter_subscriptions')
            .select('id')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (existing) {
            showToast('כתובת זו כבר רשומה לניוזליטר', 'info');
            return false;
        }

        const payload = { email: email.toLowerCase() };
        if (currentUser?.id) payload.user_id = currentUser.id;

        const { error } = await supabaseClient.from('newsletter_subscriptions').insert(payload);
        if (error) throw error;

        showToast('נרשמת לניוזליטר! קיבלת 40 זוזים', 'success');

if (currentUser?.id) {
            await addRewardPointsDB(currentUser.id, 40);
            supabaseClient.from('rating_log').insert({ user_id: currentUser.id, source: 'newsletter_subscribe', points: 40 }).then(() => {}).catch(() => {});
        }
        return true;
    } catch(e) {
        console.error('Newsletter subscribe error:', e);
        showToast('שגיאה בהרשמה: ' + (e.message || ''), 'error');
        return false;
    }
}

async function showNewsletterSubscribeModal() {
    const email = currentUser?.email || '';
    const confirmed = await customConfirm(`הרשמה לניוזליטר בית המדרש\n(${email})\nבתמורה תקבל 40 זוזים!`);
    if (!confirmed) return;
    await subscribeToNewsletter(email);
}

async function handleNewsletterReadToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('read_nl');
    if (!token || !currentUser?.id) return;

    try {
        
        const { data: ann } = await supabaseClient
            .from('system_announcements')
            .select('id')
            .eq('read_token', token)
            .maybeSingle();

        if (!ann) { showToast('קישור לא תקין', 'error'); return; }

const { data: alreadyRead } = await supabaseClient
            .from('newsletter_reads')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('newsletter_id', ann.id)
            .maybeSingle();

        if (alreadyRead) {
            showToast('כבר קיבלת נקודות על ניוזליטר זה', 'info');
            window.history.replaceState(null, null, window.location.pathname);
            return;
        }

        await supabaseClient.from('newsletter_reads').insert({
            user_id: currentUser.id,
            newsletter_id: ann.id
        });

        await addRewardPointsDB(currentUser.id, 10);
        supabaseClient.from('rating_log').insert({ user_id: currentUser.id, source: 'newsletter_read', points: 10, ref_id: String(ann.id) }).then(() => {}).catch(() => {});

        showToast('תודה שקראת! קיבלת 10 זוזים', 'success');
        window.history.replaceState(null, null, window.location.pathname);
    } catch(e) {
        console.error('Newsletter read token error:', e);
    }
}

async function handleBonusLink() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('bonus');
    if (!code || !currentUser?.id) return;

    try {
        const { data: row } = await supabaseClient
            .from('bonus_links')
            .select('id, reward_amount, used_at, target_user_id')
            .eq('code', code)
            .maybeSingle();

        if (!row) { showToast('קישור הבונוס לא נמצא', 'error'); window.history.replaceState(null, null, window.location.pathname); return; }
        if (row.used_at) { showToast('קישור זה כבר נוצל', 'error'); window.history.replaceState(null, null, window.location.pathname); return; }

        if (row.target_user_id && row.target_user_id !== currentUser.id) {
            showToast('קישור זה מיועד למשתמש אחר', 'error');
            window.history.replaceState(null, null, window.location.pathname);
            return;
        }

        const { error: updateErr } = await supabaseClient
            .from('bonus_links')
            .update({ used_at: new Date().toISOString(), used_by: currentUser.id })
            .eq('id', row.id)
            .is('used_at', null);

        if (updateErr) { showToast('שגיאה בעיבוד הקישור', 'error'); return; }

        await addRewardPointsDB(currentUser.id, row.reward_amount);
        supabaseClient.from('rating_log').insert({ user_id: currentUser.id, source: 'bonus_link', points: row.reward_amount, ref_id: String(row.id) }).then(() => {}).catch(() => {});

        showToast(`קיבלת ${row.reward_amount} זוזים!`, 'success');
        window.history.replaceState(null, null, window.location.pathname);
    } catch(e) {
        console.error('Bonus link error:', e);
    }
}

function checkCookieConsent() {
    if (!localStorage.getItem('torahApp_cookie_consent')) {
        document.getElementById('cookieModal').style.display = 'flex';
    }
}

async function acceptCookies() {
    localStorage.setItem('torahApp_cookie_consent', 'true');
    document.getElementById('cookieModal').style.display = 'none';
    try {
        await supabaseClient.from('user_consents').insert([{
            user_ip: 'client-side',
            user_agent: navigator.userAgent
        }]);
    } catch (e) {
        console.log("Cookie consent saved locally.");
    }
}

let searchDebounceTimer;

function checkDailyReminders() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const activeTasks = userGoals.filter(g => g.status === 'active' && g.targetDate);
    if (activeTasks.length > 0) {
        new Notification("תזכורת לימוד יומי", {
            body: `יש לך ${activeTasks.length} משימות לימוד פתוחות להיום. בהצלחה!`,
            icon: "https://cdn-icons-png.flaticon.com/512/2997/2997295.png"
        });
    }
}

function checkChavrutaReminders() {
    if (!currentUser) return;
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    const schedules = JSON.parse(localStorage.getItem('chavruta_schedules') || '{}');

    for (const [key, sched] of Object.entries(schedules)) {
        if (sched.days.includes(currentDay.toString()) && sched.time === currentTime) {
            const lastNotif = sessionStorage.getItem('last_notif_' + key);
            if (lastNotif !== currentTime) {
                new Notification("תזכורת חברותא", { body: `הגיע הזמן ללמוד ${sched.book} עם ${sched.partnerName}!`, icon: "https://cdn-icons-png.flaticon.com/512/2997/2997295.png" });
                sessionStorage.setItem('last_notif_' + key, currentTime);
            }
        }
    }
}


function getUserBadgeHtml(user) {
    return getFullUserBadges(user);
}

function getFullUserBadges(user) {
    if (!user) return '';
    let html = '';
    if (user.user_icon) html += renderUserIconBadge(user.user_icon);
    if (user.subscription && user.subscription.level > 0) {
        const tier = SUBSCRIPTION_TIERS.find(t => t.level === user.subscription.level);
        const color = tier ? tier.color : 'gold';
        const title = tier ? tier.name : 'מנוי';
        html += `<i class="fas fa-crown" style="color:${color}; margin-left:4px; vertical-align:middle;" title="${title}"></i>`;
    }
    if (user.tag && user.tag.text) {
        const bg = user.tag.color || '#FFB703';
        const safeTag = (user.tag.text || '').replace(/'/g, "\\'");
        html += `<span onclick="event.stopPropagation();showUsersWithTag('${safeTag}')" style="background:${bg}; color:#1a233a; font-size:0.6rem; font-weight:700; padding:1px 6px; border-radius:4px; margin-right:4px; vertical-align:middle; white-space:nowrap; cursor:pointer;" title="לחץ לראות כל ${user.tag.text}">${user.tag.text}</span>`;
    }
    return html;
}

let bookSearchDebounce;
let selectedBookStructure = null;

function updateCalculatedUnits() {
    if (!requireAuth()) return;
    const scope = document.getElementById('bookScopeSelect').value;
    if (scope === 'chapter') {
        document.getElementById('calculatedUnits').value = 20;
    }
}

function renderLeaderboard() {
    const listContainer = document.getElementById('leaderboardList');
    const meContainer = document.getElementById('leaderboardMeContainer');
    if (!listContainer || !meContainer) return;

    const cityFilter = document.getElementById('leaderboardCityFilter') ? document.getElementById('leaderboardCityFilter').value.toLowerCase() : '';
    const bookFilter = document.getElementById('leaderboardBookFilter') ? document.getElementById('leaderboardBookFilter').value.toLowerCase() : '';

let all = currentUser
        ? globalUsersData.filter(u => u.email !== currentUser.email && u.id !== currentUser.id)
        : [...globalUsersData];

    const myScore = currentUser ? (currentUser.rank_score || userGoals.reduce((sum, g) => sum + g.currentUnit, 0)) : 0;
    const myLifetimeZuzim = currentUser ? (currentUser.lifetime_zuzim || currentUser.reward_points || 0) : 0;
    const myTotalScore = myScore + myLifetimeZuzim;
    const myActiveBooks = userGoals.filter(g => g.status === 'active').map(g => g.bookName);

    if (currentUser) {
        const myGlobalData = globalUsersData.find(u => u.email === currentUser.email);
        const myRating = myGlobalData ? (myGlobalData.chat_rating || 0) : (currentUser.chat_rating || parseInt(localStorage.getItem('torahApp_rating') || '0'));

        all.push({
            id: 'me',
            name: (currentUser.isAnonymous ? "אנונימי" : currentUser.displayName) + " (אני)",
            learned: myTotalScore,
            email: currentUser.email,
            books: myActiveBooks,
            city: currentUser.city,
            chat_rating: myRating,
            tag: myGlobalData?.tag || null,
            subscription: myGlobalData?.subscription || null,
            user_icon: myGlobalData?.user_icon || null,
            avatar_url: myGlobalData?.avatar_url || null
        });
    }

    all = all.filter(u => {
        
        if (u.id !== 'me' && u.isAnonymous) return false;
        
        if (u.id !== 'me' && (u.learned || 0) === 0 && (u.chat_rating || 0) === 0) return false;
        const cityMatch = !cityFilter || (u.city && u.city.toLowerCase().includes(cityFilter));
        const bookMatch = !bookFilter || (u.books && u.books.some(b => b.toLowerCase().includes(bookFilter)));
        return cityMatch && bookMatch;
    });

    let newHTML = '';
    let myCardHTML = '';

    all.sort((a, b) => {
        if (currentLeaderboardSort === 'rating') {
            return (b.chat_rating || 0) - (a.chat_rating || 0);
        }
        return b.learned - a.learned;
    });

    if (all.length === 0) {
        newHTML = '<div class="text-center p-10 text-slate-500">אין מובילים להצגה כרגע.</div>';
    }

    all.slice(0, 15).forEach((u, i) => {
        const rank = i + 1;
        const idToSend = u.id === 'me' ? 'me' : u.id;
        const score = currentLeaderboardSort === 'rating' ? (u.chat_rating || 0) : u.learned;
        const scoreLabel = currentLeaderboardSort === 'rating' ? 'רייטינג' : 'נקודות';
        const badge = getUserBadgeHtml(u);

        if (u.id === 'me' && meContainer) {
            myCardHTML = `
                <div class="lb-me-card">
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <div style="color:var(--accent); font-weight:900; font-size:1.25rem; width:2rem; text-align:center;">${rank}</div>
                        <div style="width:3.5rem; height:3.5rem; border-radius:50%; background:var(--border-color); display:flex; align-items:center; justify-content:center; border:2px solid var(--card-bg); box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                            <i class="fas fa-user" style="color:var(--text-main); opacity:0.6; font-size:1.5rem;"></i>
                        </div>
                        <div>
                            <h3 style="font-weight:bold; color:var(--text-main); margin:0;">${u.name} ${getUserBadgeHtml(u)}</h3>
                            <p style="font-size:0.75rem; color:var(--text-main); opacity:0.8; font-weight:500; margin:0;">${getRankName(u.learned)} • ${u.city || 'ירושלים'}</p>
                        </div>
                    </div>
                    <div style="text-align:left;">
                        <p style="font-size:1.25rem; font-weight:900; color:var(--accent); margin:0;">${score}</p>
                        <p style="font-size:0.65rem; text-transform:uppercase; letter-spacing:0.05em; font-weight:bold; opacity:0.6; margin:0; color: var(--text-main);">${scoreLabel}</p>
                    </div>
                </div>
            `;
        }

        let rankColorClass = 'color:var(--text-main); opacity:0.6;';
        let rankIcon = '';
        if (rank === 1) {
            rankColorClass = 'color:var(--accent); font-weight:900; font-size:1.5rem;';
            rankIcon = `<div style="position:absolute; top:-4px; right:-4px; background:var(--accent); color:white; padding:2px; border-radius:50%; border:2px solid var(--card-bg); display:flex;"><span class="material-icons-round" style="font-size:10px;">star</span></div>`;
        } else if (rank === 2) {
            rankColorClass = 'color:var(--text-main); font-weight:900; font-size:1.25rem; opacity:0.8;';
        } else if (rank === 3) {
            rankColorClass = 'color:var(--text-main); font-weight:900; font-size:1.25rem; opacity:0.6;';
        }

        newHTML += `
        <div class="lb-card" style="animation-delay:${i * 0.05}s" onclick="showUserDetails('${idToSend}')">
            <div style="display:flex; align-items:center; gap:1rem;">
                <div style="${rankColorClass} width:2rem; text-align:center;">${rank}</div>
                <div style="position:relative; width:3rem; height:3rem;">
                    <div style="width:3rem;height:3rem;border-radius:50%;background:var(--bg);overflow:hidden;display:flex;align-items:center;justify-content:center;">
                        ${u.avatar_url ? `<img src="${u.avatar_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : `<i class="fas fa-user" style="color:var(--border-color);"></i>`}
                        ${rankIcon}
                    </div>
                    ${u.avatar_url ? `<span style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;background:var(--card-bg,#fff);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#1e293b;box-shadow:0 1px 3px rgba(0,0,0,.3);border:1px solid rgba(0,0,0,.07);z-index:2;">${u.name?.charAt(0)||'?'}</span>` : ''}
                </div>
                <div>
                    <h3 style="font-weight:bold; color:var(--text-main); margin:0; ${rank > 3 ? 'opacity:0.8;' : ''}">${u.name} ${badge}</h3>
                    <p style="font-size:0.75rem; color:var(--text-main); opacity:0.8; margin:0; ${rank > 3 ? 'opacity:0.8;' : ''}">${getRankName(u.learned)} • ${u.city || 'לא צוין'}</p>
                </div>
            </div>
            <div style="text-align:left;">
                <p style="font-size:1.125rem; font-weight:bold; color:var(--text-main); margin:0; ${rank > 3 ? 'opacity:0.8;' : ''}">${score}</p>
                <p style="font-size:0.65rem; opacity:0.6; font-weight:bold; text-transform:uppercase; margin:0; color:var(--text-main);">${scoreLabel}</p>
            </div>
        </div>`;
    });

    if (!myCardHTML && currentUser && meContainer) {
        const meIdx = all.findIndex(u => u.id === 'me');
        if (meIdx >= 0) {
            const meUser = all[meIdx];
            const myRank = meIdx + 1;
            const myScore = currentLeaderboardSort === 'rating' ? (meUser.chat_rating || 0) : meUser.learned;
            const myScoreLabel = currentLeaderboardSort === 'rating' ? 'רייטינג' : 'נקודות';
            myCardHTML = `
                <div class="lb-me-card">
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <div style="color:var(--accent); font-weight:900; font-size:1.25rem; width:2rem; text-align:center;">${myRank}</div>
                        <div style="position:relative;width:3.5rem;height:3.5rem;">
                            <div style="width:3.5rem;height:3.5rem;border-radius:50%;background:var(--border-color);overflow:hidden;display:flex;align-items:center;justify-content:center;border:2px solid var(--card-bg);box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
                                ${localStorage.getItem('torahApp_equipped_avatar') ? `<img src="${localStorage.getItem('torahApp_equipped_avatar')}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">` : `<i class="fas fa-user" style="color:var(--text-main); opacity:0.6; font-size:1.5rem;"></i>`}
                            </div>
                            ${localStorage.getItem('torahApp_equipped_avatar') ? `<span style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;background:var(--card-bg,#fff);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#1e293b;box-shadow:0 1px 3px rgba(0,0,0,.3);border:1px solid rgba(0,0,0,.07);">${meUser.name?.charAt(0)||'?'}</span>` : ''}
                        </div>
                        <div>
                            <h3 style="font-weight:bold; color:var(--text-main); margin:0;">${meUser.name} ${getUserBadgeHtml(meUser)}</h3>
                            <p style="font-size:0.75rem; color:var(--text-main); opacity:0.8; font-weight:500; margin:0;">${getRankName(meUser.learned)} • ${meUser.city || 'ירושלים'}</p>
                        </div>
                    </div>
                    <div style="text-align:left;">
                        <p style="font-size:1.25rem; font-weight:900; color:var(--accent); margin:0;">${myScore}</p>
                        <p style="font-size:0.65rem; text-transform:uppercase; letter-spacing:0.05em; font-weight:bold; opacity:0.6; margin:0; color: var(--text-main);">${myScoreLabel}</p>
                    </div>
                </div>
            `;
        }
    }

    if (newHTML !== lastLeaderboardHTML) {
        listContainer.innerHTML = newHTML;
        meContainer.innerHTML = myCardHTML;
        lastLeaderboardHTML = newHTML;
    }
}

async function findChavruta(bookName) {
    const modal = document.getElementById('chavrutaModal');
    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = getSearchHTML(bookName);

    modal.style.display = 'flex';
    bringToFront(modal);

    const steps = [
        { id: 'age', text: 'בודק התאמת גיל' },
        { id: 'city', text: 'מחפש שותפים קרובים בעיר שלך' },
        { id: 'level', text: 'משווה רמות לימוד' },
        { id: 'history', text: 'מנתח היסטוריית למידה' }
    ];

    const stepsContainer = document.getElementById('searchSteps');

    stepsContainer.innerHTML = steps.map((step, index) => `
        <div id="step-${step.id}" class="search-step ${index === 0 ? 'active' : ''}">
            <div class="step-icon ${index === 0 ? 'active' : 'pending'}">
                ${index === 0 ? '' : ''}
            </div>
            <span class="text-slate-700 dark:text-slate-300 font-medium">${step.text}</span>
        </div>
    `).join('');

    // מצא את רמת הלימוד שלי לספר זה
    const myGoalForBook = userGoals.find(g => g.bookName === bookName && g.status === 'active');
    const myStudyMode = myGoalForBook?.studyMode || null;

    try {

        const [profilesResult, goalsResult, activeConnsResult] = await Promise.all([
            supabaseClient.from('safe_profiles').select('id, email, display_name, city, rank_score, last_seen'),
            supabaseClient.from('user_goals').select('user_id, study_mode, chavruta_description').eq('book_name', bookName).eq('status', 'active'),
            supabaseClient.from('chavruta_connections').select('sender_id, receiver_id').eq('book_name', bookName).in('status', ['accepted', 'approved'])
        ]);

        if (profilesResult.error) throw profilesResult.error;

        if (modal.style.display === 'none') return;

        // מפות userId → study_mode / chavruta_description
        const userStudyModeMap = {};
        const userDescMap = {};
        (goalsResult.data || []).forEach(g => {
            userStudyModeMap[g.user_id] = g.study_mode || null;
            userDescMap[g.user_id] = g.chavruta_description || null;
        });
        const studyingThisBook = new Set(Object.keys(userStudyModeMap));

        // מי שכבר יש לו חברותא מאושרת לספר זה
        const usersWithActiveConn = new Set();
        (activeConnsResult.data || []).forEach(conn => {
            usersWithActiveConn.add(conn.sender_id);
            usersWithActiveConn.add(conn.receiver_id);
        });

        const matches = (profilesResult.data || []).filter(u => {
            const isMe = (u.id === currentUser?.id) ||
                (u.email && currentUser?.email && u.email === currentUser.email) ||
                (u.display_name && currentUser?.displayName && u.display_name === currentUser.displayName);
            return !isMe && studyingThisBook.has(u.id);
        });

        for (let i = 0; i < steps.length; i++) {
            if (modal.style.display === 'none') return;
            await new Promise(r => setTimeout(r, 1200));
            if (modal.style.display === 'none') return;
            markStepComplete(steps[i].id);
            if (i < steps.length - 1) activateStep(steps[i + 1].id);
        }
        if (modal.style.display === 'none') return;

        const myCity = currentUser.city ? currentUser.city.trim().toLowerCase() : "";
        const myRank = getRankName(userGoals.reduce((sum, g) => sum + g.currentUnit, 0));

        const studyModeLabels = { iyun: 'עיון', iyun_kal: 'עיון קל', bekiut: 'בקיאות' };

        matches.forEach(u => {
            u.matchScore = 0;
            u.studyingThisBook = true;
            u.studyMode = userStudyModeMap[u.id] || null;
            u.studyModeLabel = u.studyMode ? (studyModeLabels[u.studyMode] || u.studyMode) : null;
            u.chavrutaDescription = userDescMap[u.id] || null;
            u.hasActiveChavrutaForBook = usersWithActiveConn.has(u.id);

            if (u.city && u.city.trim().toLowerCase() === myCity && myCity) u.matchScore += 100;
            const uScore = u.rank_score || 0;
            if (getRankName(uScore) === myRank) u.matchScore += 30;
            if (u.display_name && currentUser.displayName && u.display_name[0] === currentUser.displayName[0]) u.matchScore += 10;

            // התאמת רמת לימוד: זהה = +60, קרוב (עיון↔עיון קל) = +20, שונה = 0
            if (myStudyMode && u.studyMode) {
                if (u.studyMode === myStudyMode) {
                    u.matchScore += 60;
                } else if ((myStudyMode === 'iyun' && u.studyMode === 'iyun_kal') ||
                           (myStudyMode === 'iyun_kal' && u.studyMode === 'iyun') ||
                           (myStudyMode === 'iyun_kal' && u.studyMode === 'bekiut') ||
                           (myStudyMode === 'bekiut' && u.studyMode === 'iyun_kal')) {
                    u.matchScore += 20;
                }
            } else {
                u.matchScore += 50; // אין מידע = בסיסי
            }
        });

        matches.sort((a, b) => b.matchScore - a.matchScore);

        renderChavrutaResults(matches, bookName, myStudyMode);

    } catch (e) {
        console.error(e);
        stepsContainer.innerHTML = `<div style="text-align:center; color:#ef4444;">שגיאה בחיפוש: ${e.message}</div>`;
    }
}

function markStepComplete(stepId) {
    const el = document.getElementById(`step-${stepId}`);
    if (el) {
        el.classList.remove('active');
        const icon = el.querySelector('.step-icon');
        icon.className = 'step-icon done';
        icon.innerHTML = '<span class="material-icons-round" style="font-size:0.9rem;">check</span>';
        const status = el.querySelector('.animate-pulse');
        if (status) status.remove();
    }
}

function activateStep(stepId) {
    const el = document.getElementById(`step-${stepId}`);
    if (el) {
        el.classList.add('active');
        const icon = el.querySelector('.step-icon');
        icon.className = 'step-icon active';
    }
}

function renderChavrutaResults(matches, bookName, myStudyMode) {
    currentChavrutaSearchResults = matches;
    currentSearchBook = bookName;
    window._currentMyStudyMode = myStudyMode || null;

    closeModal();
    switchScreen('chavruta-results');

    resetChavrutaFilters();
}

function closeChavrutaModal() {
    const modal = document.getElementById('chavrutaModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function findNewChavruta() {
    const overlay = document.createElement('div');
    overlay.id = 'findChavrutaOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:20px;padding:28px;width:100%;max-width:420px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);display:flex;flex-direction:column;gap:1rem;font-family:Assistant,sans-serif;direction:rtl;">
            <div style="font-size:1.15rem;font-weight:800;color:#1a233a;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-user-friends" style="color:#f59e0b;"></i> חיפוש חברותא
            </div>
            <div>
                <label style="display:block;font-size:0.82rem;font-weight:700;color:#64748b;margin-bottom:5px;">לאיזה ספר?</label>
                <input id="findChavrutaBook" type="text" placeholder="לדוגמה: מסכת ברכות..." dir="rtl"
                    style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.9rem;font-family:Assistant,sans-serif;outline:none;box-sizing:border-box;">
            </div>
            <div>
                <label style="display:block;font-size:0.82rem;font-weight:700;color:#64748b;margin-bottom:5px;">מה אני מחפש? <span style="font-weight:400;color:#94a3b8;">(אופציונלי)</span></label>
                <textarea id="findChavrutaDesc" rows="3" placeholder='לדוגמה: "מחפש חברותא לשעות הבוקר, בקיאות..."' dir="rtl"
                    style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:0.88rem;font-family:Assistant,sans-serif;outline:none;resize:none;box-sizing:border-box;"></textarea>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="document.getElementById('findChavrutaOverlay').remove()" style="padding:10px 18px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;font-size:0.88rem;font-weight:700;cursor:pointer;font-family:Assistant,sans-serif;color:#64748b;">ביטול</button>
                <button onclick="
                    const bk=document.getElementById('findChavrutaBook').value.trim();
                    const ds=document.getElementById('findChavrutaDesc').value.trim();
                    if(!bk){document.getElementById('findChavrutaBook').focus();return;}
                    document.getElementById('findChavrutaOverlay').remove();
                    if(ds&&typeof userGoals!=='undefined'){const g=userGoals.find(x=>x.bookName===bk&&x.status==='active');if(g){g.chavrutaDescription=ds;if(typeof saveGoals==='function')saveGoals();}}
                    openChavrutaSearch(bk);
                " style="flex:1;padding:10px;background:linear-gradient(135deg,#FFB703,#d97706);color:#fff;border:none;border-radius:12px;font-size:0.9rem;font-weight:700;cursor:pointer;font-family:Assistant,sans-serif;">
                    <i class="fas fa-search"></i> חפש חברותא
                </button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    setTimeout(() => document.getElementById('findChavrutaBook')?.focus(), 50);
}

window.onclick = function (event) {
    const modal = document.getElementById('chavrutaModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

async function showUserDetails(uid) {
    if (!uid || uid === 'undefined') return;

const _modalEl = document.getElementById('userModal');
    document.getElementById('modalUserName').innerHTML = '<div class="skeleton skeleton-line long" style="height:22px;width:160px;margin:0 auto;"></div>';
    document.getElementById('modalUserRank').innerHTML = '<div class="skeleton skeleton-line" style="height:16px;width:120px;"></div>';
    const _statsDiv = document.getElementById('modalUserStats');
    if (_statsDiv) _statsDiv.innerHTML = '<div class="skeleton skeleton-line" style="height:26px;width:160px;border-radius:99px;"></div>';
    document.getElementById('modalContactInfo').innerHTML = `
        <div class="skeleton-card"><div class="skeleton skeleton-avatar"></div><div class="skeleton-card-info"><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line medium"></div></div></div>
        <div class="skeleton-card"><div class="skeleton skeleton-avatar"></div><div class="skeleton-card-info"><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line short"></div></div></div>
        <div class="skeleton-card"><div class="skeleton skeleton-avatar"></div><div class="skeleton-card-info"><div class="skeleton skeleton-line long"></div></div></div>`;
    _modalEl.style.display = 'flex';
    bringToFront(_modalEl);

    let user;
    if (uid === 'me' || (currentUser && uid === currentUser.id)) {
        const myActiveBooks = userGoals.filter(g => g.status === 'active').map(g => g.bookName);
        const myCompletedBooks = userGoals.filter(g => g.status === 'completed').map(g => g.bookName);
        const myScore = userGoals.reduce((sum, g) => sum + g.currentUnit, 0);
        user = {
            name: currentUser.displayName,
            learned: myScore,
            books: myActiveBooks,
            completedBooks: myCompletedBooks,
            id: currentUser.id,
            email: currentUser.email,
            city: currentUser.city,
            subscription: currentUser.subscription,
            chat_rating: currentUser.chat_rating || parseInt(localStorage.getItem('torahApp_rating') || '0') || 0,
            lastSeen: new Date().toISOString()
        };
    } else {
        try {
            
            const isEmail = uid && uid.includes('@');
            const query = isEmail
                ? supabaseClient.from('profiles_public').select('*').eq('email', uid).maybeSingle()
                : supabaseClient.from('profiles_public').select('*').eq('id', uid).maybeSingle();
            const { data, error } = (uid && uid !== 'undefined') ? await query : { data: null, error: null };

            if (!error && data) {
                const globalEntry = globalUsersData.find(u => u.id === (data.id || uid) || (isEmail && u.email === uid));
                let booksArray = globalEntry?.books || [];
                let completedBooksArray = [];
                if (!booksArray.length || !completedBooksArray.length) {
                    const { data: goalRows } = await supabaseClient
                        .from('user_goals').select('book_name, status').eq('user_id', data.id);
                    if (goalRows) {
                        if (!booksArray.length) booksArray = goalRows.filter(r => r.status === 'active').map(r => r.book_name);
                        completedBooksArray = goalRows.filter(r => r.status === 'completed').map(r => r.book_name);
                    }
                }
                user = {
                    ...data,
                    name: data.display_name || "לומד",
                    city: data.city || "לא צוין",
                    learned: data.rank_score || globalEntry?.learned || 0,
                    chat_rating: data.chat_rating || globalEntry?.chat_rating || 0,
                    books: booksArray,
                    completedBooks: completedBooksArray,
                    tag: globalEntry?.tag || null,
                    lastSeen: data.last_seen || null
                };
            } else {
                user = globalUsersData.find(u => (u.id && u.id === uid));
                if (!user && uid && uid.includes('@')) {
                    user = globalUsersData.find(u => u.email && u.email.toLowerCase() === uid.toLowerCase());
                }
            }
        } catch (e) {
            user = globalUsersData.find(u => (u.id && u.id === uid));
        }
    }

    if (!user) {
        user = {
            id: uid,
            email: uid || '',
            name: (uid && uid.includes('@')) ? uid.split('@')[0] : 'משתמש',
            learned: 0,
            books: [],
            completedBooks: [],
            city: 'לא ידוע',
            lastSeen: null,
            subscription: { amount: 0, level: 0 },
            isAnonymous: true
        };
    }

    let isFollowing = false;
    if (currentUser && currentUser.id && user.id && user.id !== currentUser.id) {
        const { data } = await supabaseClient.from('user_followers').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', user.id).maybeSingle();
        if (data) isFollowing = true;
    }
    const userEmail = (user.email || globalUsersData.find(u => u.id === user.id || u.id === uid || u.email === uid)?.email || '').toString();
    const isChavruta = approvedPartners.has(userEmail);

if ((isChavruta || isAdminMode || uid === 'me' || hasPermission('view_phone')) && uid !== 'me' && (user.id || uid)) {
        try {
            const { data: privateProfile } = await supabaseClient
                .from('profiles_private')
                .select('phone, full_address, age')
                .eq('id', user.id || uid)
                .maybeSingle();
            if (privateProfile) {
                user.phone = privateProfile.phone;
                user.address = privateProfile.full_address;
                user.age = privateProfile.age;
            }
        } catch (e) { console.warn("Access to private profile restricted."); }
    }

    // שליפת ספרים שהמשתמש הנצפה כבר לומד עמם חברותא פעילה
    const viewedUserActiveChavrutaBooks = new Set();
    const isMe = uid === 'me' || (user.email && user.email === currentUser?.email) || (user.id && user.id === currentUser?.id);
    if (!isMe && user.id) {
        try {
            const { data: userConns } = await supabaseClient
                .from('chavruta_connections')
                .select('book_name')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .in('status', ['accepted', 'approved']);
            if (userConns) {
                userConns.forEach(c => viewedUserActiveChavrutaBooks.add(c.book_name));
            }
        } catch (e) { /* ignore */ }
    }

    const displayName = (isAdminMode && user.original_name) ? user.original_name : user.name;
    const userBadgeHtml = getUserBadgeHtml(user);
    document.getElementById('modalUserName').innerHTML = `${displayName} ${userBadgeHtml}`;
    if (isAdminMode && user.isAnonymous) {
        document.getElementById('modalUserName').innerHTML += ` <span style="color: #f59e0b; font-size: 0.8rem; font-weight: normal;">(במצב אנונימי)</span>`;
    }

    const rating = user.chat_rating || 0;
    document.getElementById('modalUserRank').innerHTML = `<i class="fas fa-medal" style="margin-left: 5px;"></i> ${getRankName(user.learned)}`;

const statsDiv = document.getElementById('modalUserStats');
    if (statsDiv) {
        const scoreHtml = `<span title="ניקוד - כמות הלימוד הכולל" style="display:flex;align-items:center;gap:3px;padding:3px 10px;background:#f1f5f9;border-radius:99px;cursor:help;"><i class="fas fa-book-open" style="color:#3b82f6;font-size:0.75rem;"></i> <strong>${(user.learned||0).toLocaleString()}</strong> <span style="color:#64748b;font-size:0.7rem;">ניקוד</span></span>`;
        const starsHtml = rating > 0
            ? `<span title="רייטינג - כמות לייקים שקיבל בשיחות" style="display:flex;align-items:center;gap:3px;padding:3px 10px;background:#fef9c3;border-radius:99px;cursor:help;"><i class="fas fa-thumbs-up" style="color:#f59e0b;font-size:0.75rem;"></i> <strong>${rating.toLocaleString()}</strong> <span style="color:#64748b;font-size:0.7rem;">רייטינג</span></span>`
            : '';
        statsDiv.innerHTML = scoreHtml + starsHtml;
    }

    const subDiv = document.getElementById('modalUserSubscription');
    const avatarDiv = document.getElementById('modalUserAvatar');
    avatarDiv.className = 'relative mb-4';
    subDiv.innerHTML = '';

const modalHeader = document.querySelector('#userModal header');
    if (modalHeader) {
        const bgUrl = user.background_url || null;
        if (bgUrl) {
            modalHeader.style.backgroundImage = `url('${bgUrl}')`;
            modalHeader.style.backgroundSize = 'cover';
            modalHeader.style.backgroundPosition = 'center';
            modalHeader.style.borderRadius = '0.75rem';
            modalHeader.style.padding = '1.5rem';
            modalHeader.style.color = '#fff';
        } else {
            modalHeader.style.backgroundImage = '';
        }
    }

const avatarInner = avatarDiv.querySelector('div');
    const avatarUrl = user.avatar_url ||
        (typeof getUserAvatarUrl === 'function' ? getUserAvatarUrl(user.id || uid) : null);
    if (avatarInner) {
        if (avatarUrl) {
            avatarInner.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<i class=&quot;fas fa-user text-gray-400 text-5xl&quot;></i>'">`;
        } else {
            avatarInner.innerHTML = '<i class="fas fa-user text-gray-400 text-5xl"></i>';
        }
    }

    if (user.subscription && user.subscription.level > 0) {
        const tier = SUBSCRIPTION_TIERS.find(t => t.level === user.subscription.level);
        const color = tier ? tier.color : 'gold';

        subDiv.innerHTML = `<div class="user-badge-pill" style="background:${color}20; color:${color}; border:1px solid currentColor; padding:4px 16px; border-radius:999px; font-weight:700; font-size:0.875rem; display:flex; align-items:center; gap:6px;"><i class="fas fa-crown"></i> ${user.subscription.name}</div>`;

        avatarDiv.classList.add(`aura-lvl-${user.subscription.level}`, 'aura-base');
        avatarDiv.style.borderRadius = '50%';
    }

    const contactContainer = document.getElementById('modalContactInfo');
    const showFullDetails = (isAdminMode || uid === 'me' || approvedPartners.has(user.email));
    let contactHtml = '';

    contactHtml += `
        <div class="flex items-center gap-3 text-gray-500 dark:text-slate-400 text-sm">
            <i class="fas fa-map-marker-alt text-yellow-500"></i>
            <span class="font-semibold text-gray-800 dark:text-white">עיר:</span>
            <span>${user.city || 'לא צוין'}</span>
        </div>`;

    if (isChavruta || isAdminMode || uid === 'me' || hasPermission('view_phone')) {
        contactHtml += `
        <div class="flex items-center gap-3 text-gray-500 dark:text-slate-400 text-sm">
            <i class="fas fa-phone text-yellow-500"></i>
            <span class="font-semibold text-gray-800 dark:text-white">טלפון:</span>
            <span>${user.phone || 'לא הוזן'}</span>
        </div>`;
    }

    const lastSeenText = user.lastSeen ? timeAgo(user.lastSeen) : 'לא ידוע';
    const lastSeenTitle = user.lastSeen ? formatHebrewDate(user.lastSeen) : '';

    contactHtml += `
        <div class="flex items-center gap-3 text-gray-500 dark:text-slate-400 text-sm" title="${lastSeenTitle}">
            <i class="fas fa-history text-yellow-500"></i>
            <span class="font-semibold text-gray-800 dark:text-white">פעילות אחרונה:</span>
            <span>${lastSeenText}</span>
        </div>`;

{
        const targetId = user.id;
        const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
            supabaseClient.from('user_followers').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
            supabaseClient.from('user_followers').select('*', { count: 'exact', head: true }).eq('follower_id', targetId)
        ]);
        const safeId = (targetId || '').replace(/'/g, "\\'");
        contactHtml += `
        <div class="flex items-center gap-3 text-gray-500 dark:text-slate-400 text-sm">
            <i class="fas fa-users text-yellow-500"></i>
            <button onclick="showProfileFollowers('${safeId}', 'followers')" class="font-semibold text-yellow-600 hover:underline"><span>${followersCount || 0}</span> עוקבים</button>
            <span style="opacity:0.4">|</span>
            <button onclick="showProfileFollowers('${safeId}', 'following')" class="text-yellow-600 hover:underline"><span>${followingCount || 0}</span> עוקב</button>
        </div>`;
    }

    const hasConnection = user.id
        ? chavrutaConnections.some(c => c.partnerId === user.id)
        : (userEmail && approvedPartners.has(userEmail));

    if (uid !== 'me' && !hasConnection && userEmail) {
        const bookParam = currentSearchBook ? `'${currentSearchBook}'` : 'null';
        contactHtml += `
            <div class="mt-4">
                <button class="w-full py-2 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                    onclick="checkAndSendRequest('${userEmail}', ${bookParam} || prompt('לאיזה ספר תרצה להציע חברותא?'))">
                    <i class="fas fa-paper-plane"></i> שלח בקשת חברותא
                </button>
            </div>
        `;
    }

    if (uid !== 'me' && hasConnection && userEmail) {
        const myConns = chavrutaConnections.filter(c =>
            c.partnerId === user.id || c.email === userEmail
        );
        if (myConns.length === 1) {
            contactHtml += `
            <div class="mt-4">
                <button class="w-full py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                    onclick="cancelChavrutaBook('${userEmail}', '${myConns[0].book.replace(/'/g, "\\'")}')">
                    <i class="fas fa-times-circle"></i> בטל חברותא (${myConns[0].book})
                </button>
            </div>`;
        } else if (myConns.length > 1) {
            const bookOptions = myConns.map(c =>
                `<option value="${c.book.replace(/"/g, '&quot;')}">${c.book}</option>`
            ).join('');
            const safeEmail = userEmail.replace(/'/g, "\\'");
            contactHtml += `
            <div class="mt-4 flex gap-2 items-center">
                <select id="cancelChavrutaBookSelect" class="flex-1 rounded-xl border border-red-300 p-2 text-sm">
                    ${bookOptions}
                </select>
                <button class="py-2 px-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                    onclick="cancelChavrutaBook('${safeEmail}', document.getElementById('cancelChavrutaBookSelect').value)">
                    <i class="fas fa-times-circle"></i> בטל חברותא
                </button>
            </div>`;
        }
    }

    if (!isMe) {
        contactHtml += `
            <button id="followBtn" class="w-full mt-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${isFollowing ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-yellow-500/90 hover:bg-yellow-500 text-white'}" onclick="toggleFollow('${user.id || user.email}')">
                ${isFollowing ? '<i class="fas fa-user-minus"></i> הסר עוקב' : '<i class="fas fa-user-plus"></i> עקוב'}
            </button>`;
    }
    contactContainer.innerHTML = contactHtml;

    const booksContainer = document.getElementById('modalUserBooks');
    const archiveContainer = document.getElementById('modalUserArchive');
    const archiveSection = document.getElementById('modalArchiveSection');

    booksContainer.innerHTML = '';
    archiveContainer.innerHTML = '';

    if (!user.books || user.books.length === 0) {
        booksContainer.innerHTML = '<div class="text-center text-sm text-slate-500 p-4">לא לומד ספרים כרגע</div>';
    } else {
        user.books.forEach(b => {
            let statusHtml = '';
            const isChavrutaBook = chavrutaConnections.some(c =>
                (c.partnerId === user.id || (c.email && c.email === user.email)) && c.book === b
            );

            if (isChavrutaBook) {
                statusHtml = `<span class="bg-green-50 text-green-600 text-xs px-2 py-0.5 rounded-md">חברותא ✓</span>`;
            } else if (!isMe && userEmail) {
                const isPending = pendingSentRequests.some(r => (r.receiver === user.id || r.receiver === user.email) && r.book === b);
                if (isPending) {
                    statusHtml = `<span class="text-xs text-orange-500">(בקשה נשלחה)</span>`;
                } else {
                    const alreadyLearning = viewedUserActiveChavrutaBooks.has(b);
                    statusHtml = `<div class="flex items-center gap-1 flex-wrap justify-end">
                        ${alreadyLearning ? `<span style="background:#fef3c7;color:#92400e;" class="text-xs px-2 py-0.5 rounded-md flex items-center gap-1"><i class="fas fa-users" style="font-size:0.6rem;"></i> לומד עם מישהו</span>` : ''}
                        <button class="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-blue-100" onclick="checkAndSendRequest('${userEmail}', '${b.replace(/'/g,"\\'")}', this)">
                            <i class="fas fa-paper-plane" style="font-size: 0.65rem;"></i> שלח בקשה
                        </button>
                    </div>`;
                }
            }

            booksContainer.innerHTML += `
                <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm">
                    <span class="text-gray-800 dark:text-white font-semibold">${b}</span>
                    ${statusHtml}
                </div>
            `;
        });
    }

    if (user.completedBooks && user.completedBooks.length > 0) {
        archiveSection.style.display = 'block';
        user.completedBooks.forEach(b => {
            archiveContainer.innerHTML += `
                <li class="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-slate-800/50 rounded-xl text-gray-500 dark:text-slate-400 text-sm border border-transparent hover:border-green-100 transition-colors">
                    <div class="p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <i class="fas fa-book h-4 w-4 text-gray-400"></i>
                    </div>
                    <span class="font-medium">${b}</span>
                    <span class="mr-auto text-green-500"><i class="fas fa-check-circle"></i></span>
                </li>
            `;
        });
    } else {
        archiveSection.style.display = 'none';
    }

    document.getElementById('userModal').style.display = 'flex';
    bringToFront(document.getElementById('userModal'));

if (currentUser?.id) updateFollowersCount(currentUser.id);
}

async function checkAndSendRequest(email, book, btnElement) {
    if (!requireAuth()) return;
    const amILearning = userGoals.some(g => g.bookName === book && g.status === 'active');
    if (!amILearning) {
        showToast(`עליך ללמוד את "${book}" כדי לשלוח בקשה.`, "error");
        return;
    }

if (currentUser?.id && book) {
        try {
            const partnerUser = globalUsersData.find(u => u.email === email);
            const partnerId = partnerUser?.id;
            if (partnerId) {
                const { data: pastConn } = await supabaseClient
                    .from('chavruta_connections')
                    .select('id, book_name, status')
                    .eq('book_name', book)
                    .in('status', ['cancelled', 'completed'])
                    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
                    .limit(1);
                if (pastConn && pastConn.length > 0) {
                    const goToArchive = await customConfirm(
                        `שימו לב: כבר למדת עם ${partnerUser?.name || email} את "${book}" בעבר.\n` +
                        `האם ברצונך לפתוח את הצ'אט הארכיוני, או לשלוח בקשת חברותא חדשה?`
                    );
                    if (!goToArchive) {
                        
                        if (typeof openChat === 'function') openChat(email, partnerUser?.name || email);
                        return;
                    }
                }
            }
        } catch (e) {  }
    }

    if (btnElement) btnElement.disabled = true;

    const success = await sendChavrutaRequest(email, book);

    if (success && btnElement) {
        btnElement.outerHTML = `<span class="text-xs text-orange-500">(בקשה נשלחה)</span>`;
        pendingSentRequests.push({ receiver: email, book: book, created_at: new Date().toISOString() });
    } else if (btnElement) {
        btnElement.disabled = false;
    }
}

async function toggleFollow(targetIdOrEmail) {
    if (!requireAuth()) return;
    const btn = document.getElementById('followBtn');
    if (!btn || !currentUser.id) return;
    const isFollowing = btn.innerHTML.includes('הסר עוקב');

    const isEmail = targetIdOrEmail && targetIdOrEmail.includes('@');
    let targetUser = isEmail
        ? globalUsersData.find(u => u.email === targetIdOrEmail)
        : globalUsersData.find(u => u.id === targetIdOrEmail);

    if (!targetUser || !targetUser.id) {
        const col = isEmail ? 'email' : 'id';
        const { data } = await supabaseClient.from('profiles_public').select('id, email, display_name').eq(col, targetIdOrEmail).maybeSingle();
        if (data) targetUser = { id: data.id, email: data.email, name: data.display_name };
    }

    if (!targetUser || !targetUser.id) {
        showToast("שגיאה: לא ניתן למצוא את פרטי המשתמש.", "error");
        return;
    }

    try {
        if (isFollowing) {
            await supabaseClient.from('user_followers')
                .delete()
                .eq('follower_id', currentUser.id)
                .eq('following_id', targetUser.id);
            btn.innerHTML = '<i class="fas fa-user-plus"></i> עקוב';
            btn.className = 'w-full mt-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm bg-yellow-500/90 hover:bg-yellow-500 text-white';
            showToast("הסרת עוקב", "info");
            supabaseClient.from('rating_log').insert({ user_id: targetUser.id, source: 'unfollow', points: -25, ref_id: currentUser.id }).then(() => {}).catch(() => {});
            (async () => {
                const { data: p } = await supabaseClient.from('profiles_public').select('chat_rating').eq('id', targetUser.id).maybeSingle();
                const newRating = Math.max(0, (p?.chat_rating || 0) - 25);
                await supabaseClient.from('profiles_public').update({ chat_rating: newRating }).eq('id', targetUser.id);
            })().catch(() => {});
        } else {
            await supabaseClient.from('user_followers')
                .insert([{ follower_id: currentUser.id, following_id: targetUser.id }]);
            btn.innerHTML = '<i class="fas fa-user-minus"></i> הסר עוקב';
            btn.className = 'w-full mt-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm bg-gray-200 hover:bg-gray-300 text-gray-700';
            showToast("אתה עוקב כעת!", "success");
            supabaseClient.from('rating_log').insert({ user_id: targetUser.id, source: 'follow', points: 25, ref_id: currentUser.id }).then(() => {}).catch(() => {});
            (async () => {
                const { data: p } = await supabaseClient.from('profiles_public').select('chat_rating').eq('id', targetUser.id).maybeSingle();
                const newRating = (p?.chat_rating || 0) + 25;
                await supabaseClient.from('profiles_public').update({ chat_rating: newRating }).eq('id', targetUser.id);
            })().catch(() => {});
        }

        if (currentUser?.id) updateFollowersCount(currentUser.id);
    } catch (e) {
        console.error("Error updating follow status:", e);
        showToast("שגיאה בעדכון עוקב", "error");
    }
}

async function showFollows() {
    if (!currentUser || !currentUser.id) {
        showToast("עליך להיות מחובר כדי לראות עוקבים.", "error");
        return;
    }
    showProfileFollowers(currentUser.id, 'followers');
}

async function showUsersWithTag(tagText) {
    
    let modal = document.getElementById('tagsUsersModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tagsUsersModal';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '1050';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:480px;width:92%;border-radius:1.25rem;padding:0;overflow:hidden;">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;border-bottom:1px solid var(--border-color);">
                    <h3 id="tagsUsersTitle" style="margin:0;font-size:1rem;font-weight:700;"></h3>
                    <button onclick="document.getElementById('tagsUsersModal').style.display='none'" style="background:none;border:none;font-size:1.4rem;cursor:pointer;color:#94a3b8;">×</button>
                </div>
                <div id="tagsUsersList" style="padding:0.75rem;max-height:380px;overflow-y:auto;"></div>
            </div>`;
        document.body.appendChild(modal);
    }

    document.getElementById('tagsUsersTitle').textContent = `בעלי תגית: ${tagText}`;
    const listArea = document.getElementById('tagsUsersList');
    listArea.innerHTML = `<div style="padding:8px;">${getSkeletonHTML('card', 3)}</div>`;
    modal.style.display = 'flex';
    bringToFront(modal);

    const usersWithTag = globalUsersData.filter(u => u.tag && u.tag.text === tagText);
    if (usersWithTag.length === 0) {
        listArea.innerHTML = `<div class="text-center p-10 text-slate-500">לא נמצאו משתמשים עם תגית "${tagText}"</div>`;
        return;
    }

    listArea.innerHTML = usersWithTag.map(u => `
        <div class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
             onclick="document.getElementById('tagsUsersModal').style.display='none'; showUserDetails('${(u.id||'').replace(/'/g,"\\'")}')">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><i class="fas fa-user text-amber-500"></i></div>
                <div>
                    <div class="font-bold text-sm">${u.name || u.display_name || 'לומד'}</div>
                    <div class="text-xs text-slate-400">${u.city || ''}</div>
                </div>
            </div>
        </div>`).join('');
}

async function showProfileFollowers(userId, type) {
    const modal = document.getElementById('followersModal');
    modal.style.display = 'flex';
    bringToFront(modal);

    const isOwnProfile = currentUser && currentUser.id === userId;
    const safeUserId = (userId || '').replace(/'/g, "\\'");

const tabsContainer = document.getElementById('followers-tabs');
    if (tabsContainer) {
        tabsContainer.innerHTML = `
            <button class="flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-colors" onclick="showProfileFollowers('${safeUserId}', 'followers')">
                ${isOwnProfile ? 'עוקבים אחריי' : 'עוקבים'}
            </button>
            <button class="flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-colors" onclick="showProfileFollowers('${safeUserId}', 'following')">
                ${isOwnProfile ? 'אני עוקב' : 'עוקב אחרי'}
            </button>
        `;
    }

const tabs = document.querySelectorAll('#followers-tabs button');
    const tabIdx = type === 'followers' ? 0 : 1;
    tabs.forEach((t, i) => {
        if (i === tabIdx) {
            t.classList.add('bg-amber-400', 'text-white', 'shadow-md');
            t.classList.remove('text-slate-500', 'dark:text-slate-400');
        } else {
            t.classList.remove('bg-amber-400', 'text-white', 'shadow-md');
            t.classList.add('text-slate-500', 'dark:text-slate-400');
        }
    });

    const listArea = document.getElementById('follows-list-area');
    listArea.innerHTML = `<div style="padding:8px;">${getSkeletonHTML('card', 3)}</div>`;

    const followerCol = type === 'followers' ? 'following_id' : 'follower_id';
    const targetCol = type === 'followers' ? 'follower_id' : 'following_id';
    const { data } = await supabaseClient.from('user_followers').select(targetCol).eq(followerCol, userId);
    const ids = (data || []).map(item => item[targetCol]).filter(Boolean);

    if (ids.length === 0) {
        listArea.innerHTML = `<div class="text-center p-10 text-slate-500">אין ${type === 'followers' ? 'עוקבים' : 'עוקב אחרי'}</div>`;
        return;
    }

    const { data: users } = await supabaseClient.from('profiles_public').select('id, display_name, email, rank_score').in('id', ids);
    if (!users || users.length === 0) {
        listArea.innerHTML = '<div class="text-center p-10 text-slate-500">לא נמצאו משתמשים</div>';
        return;
    }

    listArea.innerHTML = users.map(u => `
        <div class="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer" onclick="closeFollowersModal(); showUserDetails('${u.id}')">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><i class="fas fa-user text-amber-500"></i></div>
                <div>
                    <div class="font-bold text-sm">${u.display_name || 'לומד'}</div>
                    <div class="text-xs text-slate-400">${getRankName(u.rank_score || 0)}</div>
                </div>
            </div>
        </div>`).join('');
}

async function renderFollowsList(type, tabEl) {
    if (tabEl) {
        document.querySelectorAll('#followers-tabs button').forEach(t => {
            t.classList.remove('bg-amber-400', 'text-white', 'shadow-md', 'dark:bg-amber-400', 'dark:text-slate-900');
            t.classList.add('text-slate-500', 'dark:text-slate-400');
        });
        tabEl.classList.add('bg-amber-400', 'text-white', 'shadow-md', 'dark:bg-amber-400', 'dark:text-slate-900');
        tabEl.classList.remove('text-slate-500', 'dark:text-slate-400');
    }

    const listArea = document.getElementById('follows-list-area');
    listArea.innerHTML = `<div style="padding:8px;">${getSkeletonHTML('card', 3)}</div>`;

    if (!currentUser || !currentUser.id) return;

    const followerCol = type === 'followers' ? 'following_id' : 'follower_id';
    const targetCol = type === 'followers' ? 'follower_id' : 'following_id';
    const { data, error } = await supabaseClient.from('user_followers').select(targetCol).eq(followerCol, currentUser.id);

    const ids = (data || []).map(item => item[targetCol]).filter(id => id && id !== 'undefined');

    if (error || ids.length === 0) {
        listArea.innerHTML = `<div class="text-center p-10 text-slate-500">אין ${type === 'followers' ? 'עוקבים' : 'משתמשים שאני עוקב אחריהם'} בקטגוריה זו.</div>`;
        return;
    }

    const { data: users, error: usersError } = await supabaseClient
        .from('profiles_public')
        .select('id, display_name, email, rank_score')
        .in('id', ids);

    if (usersError) {
        listArea.innerHTML = `<div class="text-center p-10 text-red-500">שגיאה בטעינת משתמשים.</div>`;
        return;
    }

    if (!users || users.length === 0) {
        listArea.innerHTML = `<div class="text-center p-10 text-slate-500">לא נמצאו פרטי משתמשים.</div>`;
        return;
    }

    let html = '';
    users.forEach(u => {
        const subLevel = u.subscription?.level || 0;
        const isSub = subLevel > 0;
        const tier = isSub ? SUBSCRIPTION_TIERS.find(t => t.level === subLevel) : null;
        const glowColor = tier ? tier.color : '#a855f7';

        const avatarGlowStyle = isSub ? `border: 2px solid ${glowColor}; box-shadow: 0 0 15px ${glowColor}4D;` : '';
        const cardGlowClass = isSub ? 'border-2' : 'border border-slate-200 dark:border-slate-700';
        const cardGlowStyle = isSub ? `border-color: ${glowColor}33; background-color: ${glowColor}0D;` : '';

        html += `
        <div class="user-card ${cardGlowClass} rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" style="${cardGlowStyle}" onclick="closeModal(); showUserDetails('${u.id}')">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400" style="${avatarGlowStyle}">
                    <i class="fas fa-user text-xl"></i>
                </div>
                <div class="flex flex-col">
                    <span class="font-bold text-slate-800 dark:text-white text-base">${u.display_name || 'לומד'}</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">${getRankName(u.rank_score || 0)}</span>
                </div>
            </div>
        </div>
        `;
    });
    listArea.innerHTML = html;
}

async function loadSchedules() {
    
    console.warn("loadSchedules disabled: table missing.");
}

async function saveProfile() {
    if (!requireAuth() || !currentUser.id) return;
    const name = document.getElementById('profileName').value;
    const city = document.getElementById('profileCity').value;
    const phone = document.getElementById('profilePhone').value;
    const age = document.getElementById('profileAge').value;
    const address = document.getElementById('profileAddress').value;
    const isAnon = document.getElementById('anonSwitch').checked;
    const newPass = document.getElementById('profileNewPass').value;
    const secQ = document.getElementById('profileSecQ').value;
    const secAInput = document.getElementById('profileSecA');
    const secA = secAInput ? secAInput.value : '';

if (!validateInput(name, 'name')) {
        return customAlert("השם שהוזן אינו תקין.");
    }

    showToast("מעדכן פרטי חשבון...", "info");

currentUser.displayName = name;
    currentUser.city = city;
    currentUser.phone = phone;
    currentUser.age = age ? parseInt(age) : null;
    currentUser.address = address;
    currentUser.isAnonymous = isAnon;

    localStorage.setItem('torahApp_user', JSON.stringify(currentUser));

    updateHeader();
    const myUserIndex = globalUsersData.findIndex(u => u.email === currentUser.email);
    if (myUserIndex !== -1) {
        globalUsersData[myUserIndex].name = isAnon ? "לומד אנונימי" : (name || "לומד");
        globalUsersData[myUserIndex].city = city;
        globalUsersData[myUserIndex].phone = phone;
        globalUsersData[myUserIndex].age = currentUser.age;
        globalUsersData[myUserIndex].address = address;
        globalUsersData[myUserIndex].isAnonymous = isAnon;
    }

    const updateData = {
        display_name: name,
        city: city,
        is_anonymous: isAnon,
    };

    const privateData = {
        id: currentUser.id,
        phone: phone,
        full_address: address,
        age: age ? parseInt(age) : null,
    };

    try {
        if (newPass) {
            if (!validateInput(newPass, 'password')) {
                return customAlert("הסיסמה החדשה חייבת להכיל לפחות 6 תווים, כולל אותיות ומספרים.");
            }
            const { error: passError } = await supabaseClient.auth.updateUser({ password: newPass });
            if (passError) throw passError;
            showToast('הסיסמה עודכנה בהצלחה!', "success");
            document.getElementById('profileNewPass').value = '';
        }

        if (secQ && secA) {
            privateData.recovery_question = secQ;
            privateData.recovery_answer = secA;
        }

        const { error } = await supabaseClient
            .from('profiles_public')
            .update(updateData)
            .eq('id', currentUser.id);

        if (error) {
            if (error.status === 500 || error.code === 'PGRST301') {
                await customAlert("השמירה נכשלה: החשבון חסום לעדכונים או שבוצע ניסיון לעדכן שדות מוגנים.");
            } else {
                await customAlert("שגיאה בשמירת הפרופיל: " + (error.message || "שגיאה לא ידועה"));
            }
            throw error;
        }

        await supabaseClient
            .from('profiles_private')
            .upsert(privateData);
        showToast("השינויים נשמרו", "success");

        syncGlobalData();

        if (typeof pendingChavrutaBook === 'string' && pendingChavrutaBook) {
            const stillMissingPhone = !currentUser.phone;
            const stillMissingCity = !currentUser.city;

            if (stillMissingPhone || stillMissingCity) {
                let missing = [];
                if (stillMissingPhone) missing.push('מספר טלפון');
                if (stillMissingCity) missing.push('עיר מגורים');
                await customAlert(`הפרופיל עודכן, אך חסר עדיין: ${missing.join(' ו-')}. יש למלא גם אותם כדי להמשיך.`);
            } else {
                const bookToSearch = pendingChavrutaBook;
                pendingChavrutaBook = null;
                await customAlert(`הפרופיל עודכן! מחפש חברותא לספר "${bookToSearch}"...`);
                const chavrutasNav = document.querySelector('[onclick*="chavrutas"]') || document.querySelector('.nav-item');
                switchScreen('chavrutas', chavrutasNav);
                await openChavrutaSearch(bookToSearch);
            }
        } else {
            await customAlert("הפרופיל עודכן בהצלחה!");
            switchScreen('dashboard', document.querySelector('.floating-nav-item'));
        }
    } catch (e) {
        console.error("שגיאה בשמירה:", e);
    }
}

async function checkNewsletterStatus() {
    const label = document.getElementById('newsletter-status-label');
    const btn = document.getElementById('newsletter-toggle-btn');
    const recMsg = document.getElementById('newsletter-recommend-msg');
    const box = document.getElementById('newsletter-profile-box');
    if (!label || !btn || !currentUser?.email) return;

    try {
        const { data } = await supabaseClient
            .from('newsletter_subscribers')
            .select('id')
            .eq('email', currentUser.email)
            .maybeSingle();

        if (data) {
            const section = document.getElementById('newsletter-section');
            if (section) section.style.display = 'none';
            return;
        } else {
            label.innerHTML = '❌ אינך רשום לניוזלטר';
            label.style.color = '#ef4444';
            btn.textContent = '📬 הירשם עכשיו';
            btn.style.background = '#1a2333';
            btn.style.color = '#fff';
            btn.onclick = toggleNewsletterSubscription;
            box.style.borderColor = '#fcd34d';
            box.style.background = '#fef9ec';
            recMsg.style.display = 'flex';
        }
        btn.style.display = 'block';
        btn.disabled = false;
    } catch (e) {
        label.textContent = 'לא ניתן לטעון סטטוס';
    }
}

async function toggleNewsletterSubscription() {
    if (!currentUser?.email) return;
    const btn = document.getElementById('newsletter-toggle-btn');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    try {
        const { data: existing } = await supabaseClient
            .from('newsletter_subscribers')
            .select('id')
            .eq('email', currentUser.email)
            .maybeSingle();

        if (!existing) {
            await supabaseClient.from('newsletter_subscribers').insert({
                email: currentUser.email,
                name: currentUser.displayName || '',
                is_new: true
            });
            showToast('נרשמת בהצלחה לניוזלטר! 🎉', 'success');
        }
        await checkNewsletterStatus();
    } catch (e) {
        showToast('שגיאה בהרשמה לניוזלטר', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'נסה שוב'; }
    }
}

function openAddDialog() {
    if (!requireAuth()) return;

    // אם add-section-new נמצא בתוך דיאלוג קודם — מחזיר אותו למקומו לפני שמאפסים את ה-innerHTML
    const newSecPre = document.getElementById('add-section-new');
    if (newSecPre && newSecPre._dialogOriginalParent) {
        const bl = newSecPre.querySelector('a[data-orig-onclick]');
        if (bl) { bl.setAttribute('onclick', bl.dataset.origOnclick); delete bl.dataset.origOnclick; }
        newSecPre.style.display = 'none';
        newSecPre._dialogOriginalParent.appendChild(newSecPre);
        delete newSecPre._dialogOriginalParent;
    }

    const isDesktop = window.innerWidth > 768;
    let modal = document.getElementById('add-dialog-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-dialog-modal';
        document.body.appendChild(modal);
        // מוסיף event listener פעם אחת בלבד
        modal.addEventListener('click', e => { if (e.target === modal) closeAddDialog(); });
    }
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9990;display:flex;animation:fadeIn 0.18s ease;${isDesktop ? 'align-items:center;justify-content:center;' : 'align-items:flex-end;justify-content:center;'}`;
    const boxRadius = isDesktop ? '16px' : '24px 24px 0 0';
    const boxAnim = isDesktop ? 'scaleIn 0.2s ease' : 'slideUp 0.25s ease';
    const boxWidth = isDesktop ? 'calc(100% - 40px)' : '100%';
    const boxMaxW = isDesktop ? '480px' : '540px';
    const boxMaxH = isDesktop ? '80vh' : '90vh';
    const dragHandle = isDesktop ? '' : `<div onclick="closeAddDialog()" style="display:flex;justify-content:center;align-items:center;padding:10px 0 4px;cursor:pointer;flex-shrink:0;"><div style="width:40px;height:4px;border-radius:99px;background:#d1d5db;"></div></div>`;
    modal.innerHTML = `
        <div id="add-dialog-box" style="background:var(--card-bg,#fff);width:${boxWidth};max-width:${boxMaxW};border-radius:${boxRadius};padding:0;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.22);animation:${boxAnim};max-height:${boxMaxH};display:flex;flex-direction:column;">
            ${dragHandle}
            <div style="padding:14px 20px 10px;border-bottom:1px solid var(--border-color,#f1f5f9);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
                <div style="font-size:1.05rem;font-weight:800;color:var(--text-main);">הוספת לימוד חדש</div>
                <button onclick="closeAddDialog()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.3rem;line-height:1;padding:4px;"><i class="fas fa-times"></i></button>
            </div>
            <div style="overflow-y:auto;flex:1;" id="add-dialog-body">
                <div id="add-dialog-menu" style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <button class="add-dialog-tile" onclick="showAddDialogSection('cycles')" style="background:var(--bg,#f8fafc);border:1.5px solid var(--border-color,#e2e8f0);border-radius:16px;padding:20px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;transition:all 0.15s;" onmouseover="this.style.borderColor='var(--accent,#f59e0b)'" onmouseout="this.style.borderColor='var(--border-color,#e2e8f0)'">
                        <i class="fas fa-sync-alt" style="font-size:1.8rem;color:var(--primary,#0f172a);"></i>
                        <div style="font-weight:700;color:var(--text-main);font-size:0.95rem;">מחזורי לימוד</div>
                        <div style="font-size:0.78rem;color:#64748b;text-align:center;">דף היומי, משנה יומית, רמב"ם ועוד</div>
                    </button>
                    <button class="add-dialog-tile" onclick="showAddDialogSection('quick')" style="background:var(--bg,#f8fafc);border:1.5px solid var(--border-color,#e2e8f0);border-radius:16px;padding:20px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;transition:all 0.15s;" onmouseover="this.style.borderColor='#f59e0b'" onmouseout="this.style.borderColor='var(--border-color,#e2e8f0)'">
                        <i class="fas fa-bolt" style="font-size:1.8rem;color:#f59e0b;"></i>
                        <div style="font-weight:700;color:var(--text-main);font-size:0.95rem;">הוספה מהירה</div>
                        <div style="font-size:0.78rem;color:#64748b;text-align:center;">הוספת דפים/שעות ללא ספר מוגדר</div>
                    </button>
                    <button class="add-dialog-tile" onclick="showAddDialogSection('browse')" style="background:var(--bg,#f8fafc);border:1.5px solid var(--border-color,#e2e8f0);border-radius:16px;padding:20px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;transition:all 0.15s;" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='var(--border-color,#e2e8f0)'">
                        <i class="fas fa-list-ul" style="font-size:1.8rem;color:#6366f1;"></i>
                        <div style="font-weight:700;color:var(--text-main);font-size:0.95rem;">בחר לפי קטגוריה</div>
                        <div style="font-size:0.78rem;color:#64748b;text-align:center;">תנ"ך, גמרא, משנה, הלכה ועוד</div>
                    </button>
                    <button class="add-dialog-tile" onclick="showAddDialogSection('new')" style="background:var(--bg,#f8fafc);border:1.5px solid var(--border-color,#e2e8f0);border-radius:16px;padding:20px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;transition:all 0.15s;" onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='var(--border-color,#e2e8f0)'">
                        <i class="fas fa-plus-circle" style="font-size:1.8rem;color:#10b981;"></i>
                        <div style="font-weight:700;color:var(--text-main);font-size:0.95rem;">לימוד חדש</div>
                        <div style="font-size:0.78rem;color:#64748b;text-align:center;">בחירת ספר מהספרייה או הגדרה אישית</div>
                    </button>
                </div>
                <div id="add-dialog-section" style="display:none;"></div>
            </div>
        </div>`;
    document.body.style.overflow = 'hidden';
}

function showAddDialogMenu() {
    // מחזיר את add-section-new למקומו המקורי בדף
    const newSec = document.getElementById('add-section-new');
    if (newSec && newSec._dialogOriginalParent) {
        const bl = newSec.querySelector('a[data-orig-onclick]');
        if (bl) { bl.setAttribute('onclick', bl.dataset.origOnclick); delete bl.dataset.origOnclick; }
        newSec.style.display = 'none';
        newSec._dialogOriginalParent.appendChild(newSec);
        delete newSec._dialogOriginalParent;
    }
    const secEl = document.getElementById('add-dialog-section');
    if (secEl) { secEl.style.display = 'none'; secEl.innerHTML = ''; }
    const menuEl = document.getElementById('add-dialog-menu');
    if (menuEl) menuEl.style.display = 'grid';
}

function closeAddDialog() {
    const modal = document.getElementById('add-dialog-modal');
    if (!modal || modal.style.display === 'none') { document.body.style.overflow = ''; return; }
    const box = document.getElementById('add-dialog-box');
    const isDesktop = window.innerWidth > 768;
    if (modal) modal.style.animation = 'addDialogBgOut 0.22s ease forwards';
    if (box) box.style.animation = isDesktop ? 'addDialogScaleOut 0.2s ease forwards' : 'addDialogSlideDown 0.22s ease forwards';
    setTimeout(() => {
        showAddDialogMenu();
        if (modal) { modal.style.display = 'none'; modal.style.animation = ''; }
        if (box) box.style.animation = '';
        document.body.style.overflow = '';
    }, 220);
}

function showAddDialogSection(section) {
    document.getElementById('add-dialog-menu').style.display = 'none';
    const secEl = document.getElementById('add-dialog-section');
    secEl.innerHTML = '';
    secEl.style.display = 'block';
    secEl.style.padding = '0';

    if (section === 'cycles' || section === 'quick') {
        // משתמש בפונקציות הרינדור הקיימות על div זמני, ומחליף את כפתור "חזרה" שלהן
        // כך שיחזור לתפריט הדיאלוג במקום למסך הרקע
        const tmp = document.createElement('div');
        if (section === 'cycles') renderCyclesSection(tmp);
        else renderQuickSection(tmp);
        const backLink = tmp.querySelector('a[onclick*="showAddSection"]');
        if (backLink) backLink.setAttribute('onclick', 'showAddDialogMenu()');
        secEl.innerHTML = tmp.innerHTML;
    } else if (section === 'new') {
        const newSec = document.getElementById('add-section-new');
        if (newSec) {
            newSec._dialogOriginalParent = newSec.parentNode;
            secEl.appendChild(newSec);
            newSec.style.display = 'block';
            const backLink = newSec.querySelector('a[onclick*="showAddSection"]');
            if (backLink && !backLink.dataset.origOnclick) {
                backLink.dataset.origOnclick = backLink.getAttribute('onclick') || '';
                backLink.setAttribute('onclick', 'showAddDialogMenu()');
            }
            if (typeof populateAllBooks === 'function') populateAllBooks();
        }
    } else if (section === 'browse') {
        renderBookBrowseMain(secEl);
    }
}

function renderBookBrowseMain(container) {
    const categories = [
        { id: 'tanach', label: 'תנ"ך', icon: 'fas fa-scroll', color: '#7c3aed', desc: 'תורה, נביאים וכתובים' },
        { id: 'bavli', label: 'תלמוד בבלי', icon: 'fas fa-book', color: '#1d4ed8', desc: 'כל מסכתות הש"ס' },
        { id: 'yerushalmi', label: 'תלמוד ירושלמי', icon: 'fas fa-book-open', color: '#0369a1', desc: 'תלמוד ירושלמי' },
        { id: 'mishnah', label: 'משנה', icon: 'fas fa-layer-group', color: '#059669', desc: 'ששה סדרי משנה' },
        { id: 'halacha', label: 'הלכה', icon: 'fas fa-gavel', color: '#b45309', desc: 'שו"ע ומשנה ברורה' },
    ];
    container.style.padding = '16px';
    container.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <button onclick="showAddDialogMenu()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:0.85rem;display:flex;align-items:center;gap:5px;padding:4px 0;">
                <i class="fas fa-arrow-right"></i> חזרה
            </button>
            <div style="font-weight:800;font-size:1rem;color:var(--text-main);">בחר קטגוריה</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
            ${categories.map(c => `
            <button onclick="renderBookBrowseCategory('${c.id}')" style="background:var(--bg,#f8fafc);border:1.5px solid var(--border-color,#e2e8f0);border-radius:14px;padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:14px;text-align:right;transition:all 0.15s;width:100%;" onmouseover="this.style.borderColor='${c.color}';this.style.background='${c.color}11'" onmouseout="this.style.borderColor='var(--border-color,#e2e8f0)';this.style.background='var(--bg,#f8fafc)'">
                <div style="width:42px;height:42px;background:${c.color}18;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="${c.icon}" style="color:${c.color};font-size:1.2rem;"></i>
                </div>
                <div>
                    <div style="font-weight:700;color:var(--text-main);font-size:0.95rem;">${c.label}</div>
                    <div style="font-size:0.77rem;color:#64748b;">${c.desc}</div>
                </div>
                <i class="fas fa-chevron-left" style="margin-right:auto;color:#94a3b8;font-size:0.8rem;"></i>
            </button>`).join('')}
        </div>`;
}

const _TANACH_SUBS = {
    'תורה': ['בראשית','שמות','ויקרא','במדבר','דברים'],
    'נביאים ראשונים': ['יהושע','שופטים','שמואל א','שמואל ב','מלכים א','מלכים ב'],
    'נביאים אחרונים': ['ישעיהו','ירמיהו','יחזקאל','הושע','יואל','עמוס','עובדיה','יונה','מיכה','נחום','חבקוק','צפניה','חגי','זכריה'],
    'כתובים': ['תהילים','משלי','איוב','שיר השירים','רות','איכה','קהלת','אסתר','דניאל','עזרא','נחמיה','דברי הימים א','דברי הימים ב'],
};

function renderBookBrowseCategory(catId) {
    const secEl = document.getElementById('add-dialog-section');
    if (!secEl) return;
    secEl.style.padding = '16px';

    if (catId === 'tanach') {
        secEl.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                <button onclick="renderBookBrowseMain(document.getElementById('add-dialog-section'))" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:0.85rem;display:flex;align-items:center;gap:5px;padding:4px 0;">
                    <i class="fas fa-arrow-right"></i> חזרה
                </button>
                <div style="font-weight:800;font-size:1rem;color:var(--text-main);">תנ"ך</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                ${Object.entries(_TANACH_SUBS).map(([sub, books]) => `
                <div>
                    <div style="font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">${sub}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:7px;">
                        ${books.map(b => `<button onclick="pickBookFromBrowse('${b.replace(/'/g,"\\'")}',true)" style="background:var(--bg,#f8fafc);border:1.5px solid var(--border-color,#e2e8f0);border-radius:10px;padding:7px 13px;cursor:pointer;font-size:0.84rem;font-weight:600;color:var(--text-main);transition:all 0.12s;" onmouseover="this.style.borderColor='#7c3aed';this.style.color='#7c3aed'" onmouseout="this.style.borderColor='var(--border-color,#e2e8f0)';this.style.color='var(--text-main)'">${b}</button>`).join('')}
                    </div>
                </div>`).join('')}
            </div>`;
        return;
    }

    const catMap = { bavli: 'תלמוד בבלי', yerushalmi: 'תלמוד ירושלמי', mishnah: 'משנה', halacha: 'הלכה' };
    const catColors = { bavli: '#1d4ed8', yerushalmi: '#0369a1', mishnah: '#059669', halacha: '#b45309' };
    const catLabels = { bavli: 'תלמוד בבלי', yerushalmi: 'תלמוד ירושלמי', mishnah: 'משנה', halacha: 'הלכה' };
    const dbCat = catMap[catId];
    const color = catColors[catId] || '#1e293b';
    const label = catLabels[catId] || dbCat;

    const books = (typeof BOOKS_DB !== 'undefined' ? BOOKS_DB : []).filter(b => b.category === dbCat);
    secEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <button onclick="renderBookBrowseMain(document.getElementById('add-dialog-section'))" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:0.85rem;display:flex;align-items:center;gap:5px;padding:4px 0;">
                <i class="fas fa-arrow-right"></i> חזרה
            </button>
            <div style="font-weight:800;font-size:1rem;color:var(--text-main);">${label}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:7px;">
            ${books.map(b => `<button onclick="pickBookFromBrowse('${b.name.replace(/'/g,"\\'")}',true)" style="background:var(--bg,#f8fafc);border:1.5px solid var(--border-color,#e2e8f0);border-radius:10px;padding:7px 13px;cursor:pointer;font-size:0.84rem;font-weight:600;color:var(--text-main);transition:all 0.12s;" onmouseover="this.style.borderColor='${color}';this.style.color='${color}'" onmouseout="this.style.borderColor='var(--border-color,#e2e8f0)';this.style.color='var(--text-main)'">${b.name}</button>`).join('')}
        </div>`;
}

async function pickBookFromBrowse(bookName, fromDialog) {
    showAddDialogSection('new');
    await new Promise(r => setTimeout(r, 80));
    const searchInput = document.getElementById('newBookSearch');
    if (searchInput) {
        searchInput.value = bookName;
    }
    if (typeof selectBookFromSearch === 'function') selectBookFromSearch(bookName);
}

function switchScreen(name, el, chatFilter) {

    if (name === 'chats' && !requireAuth()) return;

    if (name === 'add') {
        showAddSection('menu');
    }

const routeScreens = ['dashboard', 'chavrutas', 'chats', 'add', 'community', 'profile', 'shop', 'chavruta-results', 'archive', 'my-profile', 'video-sessions'];
    if (routeScreens.includes(name)) {
        window.history.replaceState(null, null, '#' + name);
    }

    const headerTitle = document.getElementById('headerTitle');
    const bottomNav = document.querySelector('.floating-nav-container');
    const headerEmail = document.getElementById('headerUserEmail');
    const spacer = document.getElementById('bottom-spacer');
    const container = document.querySelector('.container');

    container.style.maxWidth = '';
    container.style.margin = '';
    container.style.padding = '';
    container.style.height = '';
    container.style.overflow = '';
    document.body.style.paddingBottom = '';
    if (name === 'admin') {
        isAdminMode = true;
        container.style.maxWidth = '100%';
        container.style.margin = '0';
        container.style.padding = '0';
        container.style.height = 'calc(100vh - 65px)';
        container.style.overflow = 'hidden';

        bottomNav.classList.add('nav-hidden');
        if (spacer) spacer.style.display = 'none';
        headerTitle.innerHTML = '<span style="color:#f59e0b;">מצב ניהול</span>';
        headerEmail.innerHTML = '<button class="btn" style="padding:4px 10px; font-size:0.8rem; background:#334155;" onclick="switchScreen(\'dashboard\', document.querySelector(\'.nav-item\'))">יציאה מניהול</button>';
    } else {
        isAdminMode = false;
        headerTitle.innerHTML = '<span>בית המדרש</span>';
        document.getElementById('bot-mode-indicator').style.display = 'none';
        if (realAdminUser) {
            document.getElementById('bot-mode-indicator').style.display = 'block';
            headerEmail.innerHTML = '';
        } else {
            headerEmail.style.display = 'block';
            if (currentUser) {
                headerEmail.innerText = currentUser.displayName || currentUser.email;
            } else {
                headerEmail.innerHTML = `<a href="#" onclick="event.preventDefault(); showAuthOverlay();" style="text-decoration: underline; color: var(--accent);">התחבר או הירשם</a>`;
                headerEmail.style.cursor = 'pointer';
            }
        }

        if (name === 'chats') {
            bottomNav.classList.add('nav-hidden');
            if (spacer) spacer.style.display = 'none';
            headerEmail.innerHTML = `<button class="btn-back" onclick="switchScreen('dashboard', document.querySelector('.floating-nav-item'))"><i class="fas fa-arrow-left"></i> יציאה מהצ'אטים</button>`;
            container.style.maxWidth = 'calc(100% - 2rem)';
            container.style.margin = '0 auto';
            container.style.height = 'calc(100vh - 67px)';
            container.style.overflow = 'hidden';
            document.body.style.paddingBottom = '0';
        } else if (name === 'my-profile') {
            headerEmail.innerHTML = `<button class="btn-back" onclick="switchScreen('dashboard', document.querySelector('.floating-nav-item'))"><i class="fas fa-arrow-left"></i> חזרה</button>`;
        } else {
            bottomNav.classList.remove('nav-hidden');
            if (spacer) spacer.style.display = 'block';
        }
    }

    const leavingChats = document.getElementById('screen-chats')?.classList.contains('active') && name !== 'chats';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');

    if (leavingChats) {
        const mainArea = document.getElementById('chat-main-area');
        if (mainArea) mainArea.innerHTML = '';
        const screenEl = document.getElementById('screen-chats');
        if (screenEl) screenEl.classList.remove('mobile-chat-open');
    }

    document.querySelectorAll('.floating-nav-item').forEach(n => n.classList.remove('active'));
    if (el && el.closest('.floating-nav-item')) {
        el.closest('.floating-nav-item').classList.add('active');
    }

    if (name === 'dashboard') renderDafYomiBanner();
    if (name === 'chavrutas') renderChavrutas();
    if (name === 'calendar') renderCalendar();
    if (name === 'community') renderCommunity();
    if (name === 'profile') typeof updateProfileUI === 'function' && updateProfileUI();
    if (name === 'chats' && typeof renderChatList === 'function') renderChatList(chatFilter || (typeof currentChatFilter !== 'undefined' ? currentChatFilter : 'personal'));
    if (name === 'archive' && typeof loadChatRating === 'function') loadChatRating();
    if (name === 'shop') renderShop();
    if (name === 'my-profile') { if (!requireAuth()) return; loadMyProfileScreen(); }
    if (name === 'ads') loadAds();
    if (name === 'video-sessions') renderVideoSessions();
    if (name === 'my-shiurim') { if (!requireAuth()) return; loadMyShiurimScreen(); }
    if (typeof trackPageView === 'function' && name !== 'admin') trackPageView(name);
}

// ===== מסך שיחות וידאו =====
async function renderVideoSessions() {
    const container = document.getElementById('videoSessionsList');
    if (!container) return;

    container.innerHTML = `
    <div class="max-w-2xl mx-auto w-full px-4 py-6">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;gap:12px;flex-wrap:wrap;">
            <h2 style="font-size:1.4rem;font-weight:800;color:var(--text-main);display:flex;align-items:center;gap:10px;">
                <i class="fas fa-video" style="color:#6366f1;"></i> שיחות וידאו
            </h2>
            <button onclick="openCreateShiurFromMain()" style="background:#6366f1;color:#fff;border:none;border-radius:10px;padding:8px 18px;font-size:0.9rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-plus"></i> פתח שיעור חדש
            </button>
        </div>
        <div id="video-sessions-live-list" style="display:flex;flex-direction:column;gap:12px;">
            <div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="fas fa-circle-notch fa-spin" style="font-size:1.5rem;"></i></div>
        </div>
    </div>`;

    try {
        const { data, error } = await supabaseClient.from('live_rooms')
            .select('*')
            .eq('is_active', true)
            .eq('is_public', true)
            .order('started_at', { ascending: false })
            .limit(30);

        const listEl = document.getElementById('video-sessions-live-list');
        if (!listEl) return;

        if (error || !data || data.length === 0) {
            listEl.innerHTML = `
                <div style="background:var(--bg,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:12px;padding:2rem;text-align:center;color:#94a3b8;">
                    <i class="fas fa-video" style="font-size:2rem;margin-bottom:0.75rem;display:block;color:#c7d2fe;"></i>
                    <div style="font-weight:700;margin-bottom:4px;color:var(--text-main);">אין שיעורים פעילים כרגע</div>
                    <div style="font-size:0.85rem;">פתח שיעור חדש כדי להתחיל</div>
                </div>`;
            return;
        }

        listEl.innerHTML = data.map(room => `
            <div style="background:var(--card-bg,#fff);border:1px solid var(--border-color,#e2e8f0);border-radius:14px;padding:1rem 1.25rem;display:flex;align-items:center;gap:14px;cursor:pointer;transition:box-shadow 0.15s;" onclick="joinVideoSession('${room.id}')" onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.09)'" onmouseleave="this.style.boxShadow='none'">
                <div style="width:48px;height:48px;background:#ede9fe;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas fa-chalkboard-teacher" style="color:#6366f1;font-size:1.2rem;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.95rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sanitizeChatHtml(room.title || room.book || 'שיעור')}</div>
                    <div style="font-size:0.78rem;color:#64748b;margin-top:2px;">${room.host_name ? 'מגיד שיעור: ' + sanitizeChatHtml(room.host_name) : ''} ${room.book ? '· ' + sanitizeChatHtml(room.book) : ''}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    ${room.viewers_count ? `<span style="font-size:0.75rem;color:#64748b;"><i class="fas fa-eye"></i> ${room.viewers_count}</span>` : ''}
                    <span style="background:#ef4444;color:#fff;border-radius:999px;padding:2px 10px;font-size:0.7rem;font-weight:800;">● LIVE</span>
                </div>
            </div>`).join('');
    } catch(e) {
        const listEl = document.getElementById('video-sessions-live-list');
        if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;">שגיאה בטעינת השיעורים</div>';
    }
}

function joinVideoSession(roomId) {
    showToast('שיחות וידאו אינן זמינות כרגע', 'info');
}

function openCreateShiurFromMain() {
    showToast('שיחות וידאו אינן זמינות כרגע', 'info');
}

/* === להפעלת מסך "אינו זמין" מחדש, החלף את הפונקציות מעל בקוד הבא: ===

function renderVideoSessions() {
    const container = document.getElementById('videoSessionsList');
    if (!container) return;
    container.innerHTML = `
    <main class="max-w-2xl mx-auto w-full px-4 py-16 flex flex-col items-center gap-6 text-center">
        <div style="width:80px; height:80px; background:#f1f5f9; border-radius:50%; display:flex; align-items:center; justify-content:justify-content:center; font-size:2.5rem; color:#94a3b8;">
            <i class="fas fa-video-slash"></i>
        </div>
        <div>
            <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-main); margin-bottom:0.5rem;">שיחות וידאו</h2>
            <p style="color:#94a3b8; font-size:1rem;">פונקציה זו אינה זמינה כעת</p>
        </div>
        <div style="background:#fef9ec; border:1px solid #fde68a; border-radius:1rem; padding:1rem 1.5rem; display:flex; align-items:center; gap:0.75rem; color:#92400e; font-weight:700; font-size:0.95rem;">
            <i class="fas fa-clock" style="color:#f59e0b;"></i>
            בקרוב
        </div>
    </main>`;
}
function joinVideoSession() { showToast('שיחות וידאו אינן זמינות כעת — בקרוב!', 'info'); }
function openCreateShiurFromMain() { showToast('שיחות וידאו אינן זמינות כעת — בקרוב!', 'info'); }

=== סוף קוד חסימה === */

function formatDuration(startTime) {
    if (!startTime) return '';
    const secs = Math.floor((Date.now() - startTime) / 1000);
    if (secs < 60) return 'פחות מדקה';
    const m = Math.floor(secs / 60);
    if (m < 60) return m + ' דקות';
    return Math.floor(m / 60) + ' שעות';
}

function toggleDateInput() { document.getElementById('dateInputDiv').style.display = document.getElementById('paceType').value === 'date' ? 'block' : 'none'; }
function toggleQuickDate() { document.getElementById('quickDateDiv').style.display = document.getElementById('quickPace').value === 'date' ? 'block' : 'none'; }

let notifications = [];
let notifTab = 'unread';

async function loadNotificationsFromDB() {
    if (!currentUser || !currentUser.id) return;
    try {
        const { data } = await supabaseClient
            .from('notifications')
            .select('id, title, content, is_read, created_at')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);
        if (!data) return;
        data.forEach(n => {
            const notifId = `db-notif-${n.id}`;
            if (notifications.some(x => x.id === notifId)) return;
            const text = n.content || n.title || '';
            const time = n.created_at ? new Date(n.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
            notifications.push({ id: notifId, text, html: null, time, read: !!n.is_read, dbId: n.id });
        });
        notifications.sort((a, b) => b.id.localeCompare(a.id));
        updateNotifUI();
    } catch (e) { console.warn('loadNotificationsFromDB failed', e); }
}

function addNotification(text, id = null, isHtml = false, alreadyRead = false) {
    if (id && notifications.some(n => n.id === id)) return;
    notifications.unshift({
        id: id || Date.now().toString(),
        text: isHtml ? null : text,
        html: isHtml ? text : null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: alreadyRead
    });
    updateNotifUI();
}

function markAllNotificationsRead() {
    notifications.forEach(n => n.read = true);
    const seenIds = JSON.parse(localStorage.getItem('torahApp_seenChavrutaRequests') || '[]');
    notifications.forEach(n => {
        if (n.id && n.id.startsWith('req-')) {
            const reqId = n.id.replace('req-', '');
            if (!seenIds.includes(reqId)) seenIds.push(reqId);
        }
    });
    localStorage.setItem('torahApp_seenChavrutaRequests', JSON.stringify(seenIds));
    updateNotifUI();
}

function switchNotifTab(tab) {
    notifTab = tab;
    const unreadBtn = document.getElementById('notif-tab-unread');
    const readBtn = document.getElementById('notif-tab-read');
    if (unreadBtn) {
        unreadBtn.style.background = tab === 'unread' ? '#fffbeb' : 'transparent';
        unreadBtn.style.borderBottom = tab === 'unread' ? '2px solid #f59e0b' : '2px solid transparent';
        unreadBtn.style.color = tab === 'unread' ? '#92400e' : '#94a3b8';
    }
    if (readBtn) {
        readBtn.style.background = tab === 'read' ? '#f8fafc' : 'transparent';
        readBtn.style.borderBottom = tab === 'read' ? '2px solid #64748b' : '2px solid transparent';
        readBtn.style.color = tab === 'read' ? '#334155' : '#94a3b8';
    }
    renderNotifList();
}

function renderNotifList() {
    const list = document.getElementById('notif-list');
    const filtered = notifications.filter(n => notifTab === 'unread' ? !n.read : n.read);
    if (filtered.length === 0) {
        list.innerHTML = `<p style="color: #94a3b8; text-align: center; padding: 15px;">${notifTab === 'unread' ? 'אין הודעות חדשות' : 'אין הודעות שנקראו'}</p>`;
        return;
    }
    list.innerHTML = filtered.map((n) => {
        const idx = notifications.indexOf(n);
        const bg = n.read ? '#f8fafc' : '#fffbeb';
        if (n.html) {
            return `<div style="padding: 8px 10px; border-bottom: 1px solid #eee; background: ${bg}; cursor:pointer;" onclick="markNotifRead(${idx})">${n.html}<div style="text-align:left;"><small style="color:#94a3b8;">${n.time}</small></div></div>`;
        }
        return `<div style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9; background: ${bg}; cursor:pointer;" onclick="markNotifRead(${idx})">
            <div style="font-weight: ${n.read ? 'normal' : 'bold'}; font-size:0.82rem; line-height:1.35;">${n.text}</div>
            <small style="color: #94a3b8;">${n.time}</small>
        </div>`;
    }).join('');
}

function updateNotifUI() {
    const badge = document.getElementById('notif-badge');
    const unreadCount = notifications.filter(n => !n.read).length;
    if (badge) {
        if (unreadCount > 0) {
            badge.innerText = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    renderNotifList();
}

function markNotifRead(index) {
    const n = notifications[index];
    if (!n) return;
    n.read = true;
    if (n.dbId) {
        supabaseClient.from('notifications').update({ is_read: true }).eq('id', n.dbId).then(() => {});
    }
    updateNotifUI();
}

function removeNotification(index) {
    notifications.splice(index, 1);
    updateNotifUI();
}

function _slideOutDropdown(el, displayType) {
    if (!el || (el.style.display === 'none' || el.style.display === '')) return;
    el.style.animation = 'dropdownSlideOut 0.15s ease forwards';
    setTimeout(() => {
        el.style.display = 'none';
        el.style.animation = '';
    }, 150);
}

function toggleChatArchiveMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('chat-archive-menu');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none' && menu.style.display !== '';
    if (isOpen) {
        _slideOutDropdown(menu);
    } else {
        menu.style.display = 'block';
        menu.style.animation = 'dropdownSlideIn .18s ease';
    }
}

function toggleNotifications() {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) _slideOutDropdown(profileDropdown);
    const gridMenu = document.getElementById('grid-menu-dropdown');
    if (gridMenu) _slideOutDropdown(gridMenu);
    const dropdown = document.getElementById('notif-dropdown');
    const isOpening = dropdown.style.display === 'none' || dropdown.style.display === '';
    if (isOpening) {
        dropdown.style.animation = 'dropdownSlideIn 0.18s ease';
        dropdown.style.display = 'flex';
        switchNotifTab(notifTab);
    } else {
        dropdown.style.animation = 'dropdownSlideOut 0.15s ease forwards';
        setTimeout(() => {
            dropdown.style.display = 'none';
            dropdown.style.animation = 'dropdownSlideIn 0.18s ease';
        }, 140);
    }
}

function renderGoalCard(goal, container, isActive) {
    const div = document.createElement('div');
    div.id = `goal-card-${goal.id}`;
    div.className = 'glass rounded-super p-6 transition-all hover:shadow-2xl hover:translate-y-[-2px] border border-white/50 dark:border-slate-700/40 mb-4';

    const percent = Math.min(100, Math.round((goal.currentUnit / goal.totalUnits) * 100));

    let html = `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex-1">
            <div class="flex items-center gap-4 mb-2">
                <div class="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl">
                    <i class="fas fa-book"></i>
                </div>
                <div>
                    <h3 class="text-lg font-bold">${goal.bookName}</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400">${unitToDafString(goal)}</p>
                </div>
            </div>
            <div class="mt-4">
                <div class="flex justify-between text-xs mb-2 px-1">
                    <span class="text-slate-400">${goal.totalUnits - goal.currentUnit} עמודים לסיום</span>
                    <span class="font-bold text-primary">${percent}%</span>
                </div>
                <div class="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full progress-gradient rounded-full" style="width: ${percent}%"></div>
                </div>
            </div>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-2">
            <div class="flex items-center gap-2 flex-wrap">
                <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="deleteGoal('${goal.id}')" title="מחק">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="openNotes('${goal.id}')" title="הערות">
                    <i class="fas fa-sticky-note"></i>
                </button>
                <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="openBookChat('${goal.bookName}')" title="צ'אט">
                    <i class="fas fa-comment"></i>
                </button>
                <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="openChavrutaSearch('${goal.bookName}')" title="מצא חברותא">
                    <i class="fas fa-user-plus"></i>
                </button>
            </div>
            <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                <button class="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-slate-600 dark:text-slate-300" onclick="updateProgress('${goal.id}', -1, this)">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="w-10 h-10 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all" onclick="updateProgress('${goal.id}', 1, this)">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        </div>
    </div>`;

    if (!isActive) {
        html += `<div style="text-align:center; color:var(--success); font-weight:bold;">הושלם! <i class="fas fa-check"></i></div>`;
    }

    div.innerHTML = html;
    container.appendChild(div);
}

function toGematria(num) {
    const letters = [
        ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'],
        ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'],
        ['', 'ק', 'ר', 'ש', 'ת']
    ];
    let str = '';
    let n = num;

    if (n >= 400) {
        str += 'ת'.repeat(Math.floor(n / 400));
        n %= 400;
    }
    if (n >= 100) {
        str += letters[2][Math.floor(n / 100)];
        n %= 100;
    }
    if (n >= 10) {
        str += letters[1][Math.floor(n / 10)];
        n %= 10;
    }
    if (n > 0) {
        str += letters[0][n];
    }
    let result = str.replace(/יה/g, 'טו').replace(/יו/g, 'טז');

    if (result.length > 1) {
        result = result.slice(0, -1) + '"' + result.slice(-1);
    } else if (result.length === 1) {
        result += "'";
    }

    return result;
}

function unitToDafString(goal) {
    const bookEntry = BOOKS_DB.find(b => b.name === goal.bookName);
    const isTalmud = bookEntry && bookEntry.category === "תלמוד בבלי";

    if (isTalmud) {
        if (goal.bookName === 'דף היומי') return dafYomiToday ? `הדף היומי: ${dafYomiToday}` : `נלמדו ${goal.currentUnit} דפים`;
        if (goal.currentUnit === 0) return "טרם התחיל";

        const startPage = goal.startPage || 2;
        const daf = Math.floor(goal.currentUnit / 2) + startPage;
        const amud = goal.currentUnit % 2 === 0 ? '.' : ':';
        return `דף ${toGematria(daf)}${amud}`;
    }
    if (goal.currentUnit === 0) return "טרם התחיל";
    return `${goal.currentUnit} / ${goal.totalUnits} יחידות`;
}

let currentNotesData = { goalId: null, notes: [] };
let noteZIndex = 1;

async function refreshPartnerNotes(partnerEmail, bookName) {
    try {
        currentNotesData.displayNotes = [...(currentNotesData.notes || [])];
        if (!supabaseClient || !partnerEmail) return;
        const { data } = await supabaseClient
            .from('notes')
            .select('id, title, content, created_at')
            .eq('book_name', bookName)
            .eq('user_email', partnerEmail);
        currentNotesData.partnerNotes = data || [];
    } catch (e) {
        currentNotesData.displayNotes = [...(currentNotesData.notes || [])];
    }
}

async function openNotes(goalId) {
    const goal = userGoals.find(g => g.id == goalId);
    if (!goal) return;

    currentNotesData.goalId = goalId;
    currentNotesData.notes = Array.isArray(goal.notes) ? goal.notes : [];
    currentNotesData.bookName = goal.bookName;

    const chavruta = chavrutaConnections.find(c => c.book === goal.bookName);
    if (chavruta) {
        try {
            await refreshPartnerNotes(chavruta.email, goal.bookName);
        } catch (e) { console.error("Error fetching partner notes", e); currentNotesData.displayNotes = [...currentNotesData.notes]; }
        const partner = globalUsersData.find(u => u.email === chavruta.email);
        currentNotesData.partnerName = partner ? partner.name : chavruta.email;
    } else {
        currentNotesData.displayNotes = [...currentNotesData.notes];
    }

    localStorage.setItem('current_notes_context', JSON.stringify(currentNotesData));

    const modalContent = document.querySelector('#notesModal .modal-content');

    const container = document.getElementById('notesContainer');
    if (container) container.remove();

    document.getElementById('notesModal').style.display = 'flex';
    bringToFront(document.getElementById('notesModal'));
    notesApp_init();
}

function saveNotesFromModal() {
    notesApp_saveNotes(true);
}

// ─── Notes App (inline, replaces notes.html iframe) ────────────────────────
let _notesApp = { notes: [], activeId: null, context: null, saveDebounce: null };

async function notesApp_init() {
    _notesApp.context = currentNotesData;
    _notesApp.notes = [];
    _notesApp.activeId = null;

    const editor = document.getElementById('notes-editor');
    if (editor) { editor.innerHTML = ''; editor.contentEditable = 'true'; }
    document.getElementById('notes-empty-state').style.display = 'flex';
    document.getElementById('notes-editor').style.display = 'none';
    document.getElementById('notes-toolbar').style.display = 'none';
    document.getElementById('notes-list').innerHTML = '<div style="text-align:center;color:#94a3b8;padding:1rem;font-size:0.85rem;">טוען...</div>';

    if (supabaseClient && currentUser && _notesApp.context?.bookName) {
        await _notesApp_loadFromDB();
    } else if (Array.isArray(_notesApp.context?.notes)) {
        _notesApp.notes = _notesApp.context.notes.map((n, i) => ({
            id: n.id || ('local-' + Date.now() + i),
            title: n.title || `חידוש ${i + 1}`,
            content: (n.content || n) === '<div>התחל לכתוב כאן...</div>' ? '' : (n.content || n || ''),
            date: n.date || new Date().toISOString()
        }));
    }

    _notesApp_renderList();
    if (_notesApp.notes.length > 0) _notesApp_loadNote(_notesApp.notes[0].id);
}

async function _notesApp_loadFromDB() {
    const bk = _notesApp.context.bookName;
    const email = currentUser.email;
    const [{ data }, { data: shared }] = await Promise.all([
        supabaseClient.from('notes').select('*').eq('book_name', bk).eq('user_email', email),
        supabaseClient.from('notes').select('*, note_collaborators!inner(permission_level)').eq('note_collaborators.collaborator_email', email).eq('book_name', bk)
    ]);
    let dbNotes = [...(data || [])];
    (shared || []).forEach(n => {
        n.is_shared_with_me = true;
        n.permission = n.note_collaborators[0]?.permission_level;
        dbNotes.push(n);
    });
    if (dbNotes.length > 0) {
        _notesApp.notes = dbNotes;
    } else if (_notesApp.context.notes?.length > 0) {
        for (const n of _notesApp.context.notes) {
            const content = (n.content || n) === '<div>התחל לכתוב כאן...</div>' ? '' : (n.content || n || '');
            const { data: ins } = await supabaseClient.from('notes').insert({ user_email: email, book_name: bk, title: n.title || 'חידוש חדש', content }).select().single();
            if (ins) _notesApp.notes.push(ins);
        }
    }
}

function _notesApp_renderList() {
    const list = document.getElementById('notes-list');
    if (!list) return;
    if (!_notesApp.notes.length) {
        list.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:1rem;font-size:0.85rem;">אין עדיין דפים במחברת זו.</div>';
        return;
    }
    list.innerHTML = _notesApp.notes.map(n => `
        <div class="notes-item${n.id === _notesApp.activeId ? ' notes-active' : ''}" onclick="notesApp_loadNoteEl(event,'${String(n.id).replace(/'/g, "\\'")}',this)"
            style="display:flex;align-items:center;justify-content:space-between;padding:0.65rem 0.85rem;border-radius:8px;cursor:pointer;margin-bottom:3px;transition:background 0.15s;border:2px solid transparent;${n.id === _notesApp.activeId ? 'background:#eff6ff;border-color:#3b82f6;color:#1e40af;font-weight:700;' : ''}">
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.88rem;">${n.title}</span>
            <div style="display:flex;gap:4px;flex-shrink:0;">
                <button onclick="event.stopPropagation();notesApp_renameNote('${String(n.id).replace(/'/g, "\\'")}',this)" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:2px 4px;" title="שנה שם"><i class="fas fa-pen" style="font-size:0.75rem;"></i></button>
                <button onclick="event.stopPropagation();notesApp_deleteNote('${String(n.id).replace(/'/g, "\\'")}',this)" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:2px 4px;" title="מחק"><i class="fas fa-trash-alt" style="font-size:0.75rem;"></i></button>
            </div>
        </div>`).join('');
}

function notesApp_loadNoteEl(event, id) { notesApp_loadNote(id); }

function notesApp_loadNote(id) {
    _notesApp.activeId = id;
    const note = _notesApp.notes.find(n => String(n.id) === String(id));
    const editor = document.getElementById('notes-editor');
    const emptyState = document.getElementById('notes-empty-state');
    const toolbar = document.getElementById('notes-toolbar');
    if (!note) {
        _notesApp.activeId = null;
        emptyState.style.display = 'flex';
        editor.style.display = 'none';
        toolbar.style.display = 'none';
        _notesApp_renderList();
        return;
    }
    emptyState.style.display = 'none';
    toolbar.style.display = 'flex';
    editor.style.display = 'block';
    editor.contentEditable = (note.is_shared_with_me && note.permission === 'view') ? 'false' : 'true';
    editor.innerHTML = note.content || '';
    _notesApp_renderList();
    editor.focus();
}

function notesApp_createNewNote() {
    const modal = document.getElementById('notes-new-modal');
    const inp = document.getElementById('notes-new-title');
    if (modal && inp) { inp.value = 'חידוש חדש'; modal.style.display = 'flex'; setTimeout(() => { inp.focus(); inp.select(); }, 60); }
}

function notesApp_confirmNewNote() {
    const modal = document.getElementById('notes-new-modal');
    const title = (document.getElementById('notes-new-title')?.value || '').trim() || 'חידוש חדש';
    if (modal) modal.style.display = 'none';
    const newNote = { id: 'temp-' + Date.now(), title, content: '', date: new Date().toISOString() };
    _notesApp.notes.unshift(newNote);
    _notesApp_renderList();
    notesApp_loadNote(newNote.id);
    notesApp_saveNotes();
}

async function notesApp_deleteNote(id) {
    if (!confirm('האם למחוק דף זה?')) return;
    _notesApp.notes = _notesApp.notes.filter(n => String(n.id) !== String(id));
    if (supabaseClient && !String(id).startsWith('temp-') && !String(id).startsWith('local-')) {
        await supabaseClient.from('notes').delete().eq('id', id);
    }
    if (String(_notesApp.activeId) === String(id)) {
        _notesApp.activeId = null;
        document.getElementById('notes-editor').style.display = 'none';
        document.getElementById('notes-toolbar').style.display = 'none';
        document.getElementById('notes-empty-state').style.display = 'flex';
    }
    _notesApp_renderList();
}

async function notesApp_renameNote(id) {
    const note = _notesApp.notes.find(n => String(n.id) === String(id));
    if (!note) return;
    const newTitle = await customPrompt('ערוך שם:', note.title);
    if (newTitle?.trim()) { note.title = newTitle.trim(); _notesApp_renderList(); notesApp_saveNotes(); }
}

function notesApp_handleInput() {
    if (!_notesApp.activeId) return;
    const note = _notesApp.notes.find(n => String(n.id) === String(_notesApp.activeId));
    if (note) {
        note.content = document.getElementById('notes-editor').innerHTML;
        const st = document.getElementById('notes-save-status');
        if (st) { st.textContent = 'עורך...'; st.style.opacity = '1'; }
        clearTimeout(_notesApp.saveDebounce);
        _notesApp.saveDebounce = setTimeout(() => notesApp_saveNotes(), 2000);
    }
}

async function notesApp_saveNotes(showFeedback) {
    const id = _notesApp.activeId;
    if (!id) return;
    const note = _notesApp.notes.find(n => String(n.id) === String(id));
    if (!note) return;

    if (supabaseClient && currentUser) {
        if (note.is_shared_with_me && note.permission === 'view') return;
        const payload = { title: note.title, content: note.content, updated_at: new Date().toISOString() };
        if (String(note.id).startsWith('temp-') || String(note.id).startsWith('local-')) {
            payload.user_email = currentUser.email;
            payload.book_name = _notesApp.context?.bookName || '';
            const { data: ins } = await supabaseClient.from('notes').insert(payload).select().single();
            if (ins) note.id = ins.id;
        } else {
            await supabaseClient.from('notes').update(payload).eq('id', note.id);
        }
    }

    if (_notesApp.context?.goalId && typeof updateGoalNotes === 'function') {
        updateGoalNotes(_notesApp.context.goalId, _notesApp.notes);
    }

    const st = document.getElementById('notes-save-status');
    if (st) { st.textContent = 'נשמר ✓'; st.style.opacity = '1'; setTimeout(() => { st.style.opacity = '0'; }, 2000); }

    if (showFeedback) {
        const btn = document.querySelector('#notesModal .btn-outline');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> נשמר!';
            btn.style.borderColor = '#22c55e'; btn.style.color = '#22c55e';
            setTimeout(() => { btn.innerHTML = orig; btn.style.borderColor = 'white'; btn.style.color = 'white'; }, 2000);
        }
    }
}

function notesApp_downloadNote() {
    if (!_notesApp.activeId) return;
    const note = _notesApp.notes.find(n => String(n.id) === String(_notesApp.activeId));
    if (!note) return;
    const tmp = document.createElement('div'); tmp.innerHTML = note.content;
    const blob = new Blob([tmp.innerText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${note.title}.txt`; a.click(); URL.revokeObjectURL(a.href);
}

function toggleFocusMode() {
    document.body.classList.toggle('focus-mode');
    const btn = document.querySelector('#bookReaderModal .btn-outline');
    if (document.body.classList.contains('focus-mode')) {
        btn.innerHTML = '<i class="fas fa-compress"></i> יציאה ממצב מרוכז';
        showToast("נכנסת למצב לימוד מרוכז. בהצלחה!", "info");
    } else {
        btn.innerHTML = '<i class="fas fa-expand"></i> מצב מרוכז';
    }
}

async function completeGoal(goalId) {
    if (!requireAuth()) return;
    const goalIndex = userGoals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) return;

    userGoals[goalIndex].status = 'completed';
    userGoals[goalIndex].completedDate = new Date().toISOString();

    saveGoals();

    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2ecc71', '#3498db', '#f1c40f']
    });

    showToast("אשריך! סיימת את הלימוד: " + userGoals[goalIndex].bookName, "success");
    addNotification(`מזל טוב! סיימת את מסכת ${userGoals[goalIndex].bookName}!`);
    renderGoals();

    const bookName = userGoals[goalIndex].bookName;
    const schedules = JSON.parse(localStorage.getItem('chavruta_schedules') || '{}');

    const conn = chavrutaConnections.find(c => c.book === bookName);
    if (conn) {
        approvedPartners.delete(conn.email);
    }

    Object.keys(schedules).forEach(key => {
        if (key.endsWith('::' + bookName)) {
            delete schedules[key];
        }
    });
    localStorage.setItem('chavruta_schedules', JSON.stringify(schedules));

    try {
        await supabaseClient.from('chavruta_connections')
            .update({ status: 'completed' })
            .eq('book_name', bookName)
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
    } catch (e) { console.error("Error updating chavruta on complete", e); }

    try {
        await supabaseClient.from('siyum_board')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('book_name', bookName);
        const { error: siyumError } = await supabaseClient.from('siyum_board').insert({
            user_id: currentUser.id,
            user_email: currentUser.email,
            book_name: bookName,
            completed_at: new Date().toISOString()
        });
        if (siyumError) console.error("Failed to post to siyum board", siyumError);
    } catch (e) { console.error("Failed to post to siyum board", e); }

    try {
        if (typeof supabaseClient !== 'undefined' && currentUser) {
            await supabaseClient
                .from('user_goals')
                .update({ status: 'completed' })
                .eq('id', goalId)
                .eq('user_id', currentUser.id);
            syncGlobalData();
        }
    } catch (e) {
        console.error("Error updating status in cloud", e);
    }

try {
        const { data: followersRows } = currentUser?.id
            ? await supabaseClient.from('user_followers').select('follower_id').eq('following_id', currentUser.id)
            : { data: null };

        if (followersRows && followersRows.length > 0) {
            const followerIds = followersRows.map(f => f.follower_id);
            const { data: followerProfiles } = await supabaseClient
                .from('profiles_public')
                .select('id, email')
                .in('id', followerIds);

            if (followerProfiles && followerProfiles.length > 0) {
                const senderName = currentUser.displayName || currentUser.email;
                const updateMsg = `המשתמש <strong>${senderName}</strong> סיים את <strong>${bookName}</strong>! <button style="display:inline-block; margin-right:8px; padding:3px 10px; background:#f59e0b; color:#fff; border-radius:6px; font-size:0.78rem; cursor:pointer; border:none;" onclick="addSiyumReactionByBookUser('${currentUser.id}','${bookName}',this)">🎉 מזל טוב!</button>`;

                for (const fp of followerProfiles) {
                    let rpcOk = false;
                    try {
                        const { error: rpcErr } = await supabaseClient.rpc('send_message', {
                            p_sender_email: 'updates@system',
                            p_receiver_email: fp.email,
                            p_message: updateMsg,
                            p_is_html: true
                        });
                        if (!rpcErr) rpcOk = true;
                    } catch (e) {  }

if (!rpcOk && fp.id) {
                        supabaseClient.from('chat_admin').insert({
                            user_id: fp.id,
                            sender_email: 'updates@system',
                            content: updateMsg,
                            created_at: new Date().toISOString()
                        }).then(() => {}).catch(() => {});
                    }

                    supabaseClient.from('notifications').insert({
                        user_id: fp.id,
                        title: `${senderName} סיים את ${bookName}`,
                        content: `לחץ לאיחול מזל טוב!`,
                        created_at: new Date().toISOString(),
                        is_read: false
                    }).then(() => {}).catch(() => {});
                }
            }
        }
    } catch (e) { console.warn("Error notifying followers", e); }
}

async function addSiyumReactionByBookUser(userId, bookName, btn) {
    
    const { data: siyum } = await supabaseClient
        .from('siyum_board')
        .select('id')
        .eq('user_id', userId)
        .eq('book_name', bookName)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (siyum) {
        addSiyumReaction(siyum.id, btn);
    } else {
        showToast('לא נמצא סיום מתאים', 'info');
    }
}

async function updateProgress(goalId, change, btnElement = null) {
    if (!requireAuth()) return;

    if (btnElement) {
        showClickFeedback(btnElement, change);
    }

    const goal = userGoals.find(g => g.id == goalId);
    if (!goal) return;

    const newAmount = Math.max(0, Math.min(goal.totalUnits, goal.currentUnit + change));

    if (newAmount === goal.currentUnit) return;

    goal.currentUnit = newAmount;
    saveGoals();

    const goalCard = document.getElementById(`goal-card-${goalId}`);
    if (goalCard) {
        const percent = Math.min(100, Math.round((goal.currentUnit / goal.totalUnits) * 100));

        const dafStringEl = goalCard.querySelector('p.text-sm.text-slate-500');
        if (dafStringEl) dafStringEl.innerText = unitToDafString(goal);

        const remainingEl = goalCard.querySelector('.flex.justify-between.text-xs span.text-slate-400');
        if (remainingEl) remainingEl.innerText = `${goal.totalUnits - goal.currentUnit} עמודים לסיום`;

        const percentTextEl = goalCard.querySelector('.font-bold.text-primary');
        if (percentTextEl) percentTextEl.innerText = `${percent}%`;

        const progressBarEl = goalCard.querySelector('.progress-gradient');
        if (progressBarEl) progressBarEl.style.width = `${percent}%`;

        let totalLearned = userGoals.reduce((sum, g) => sum + (g.currentUnit || 0), 0);
        const currentPoints = currentUser ? (currentUser.reward_points || 0) : 0;
        document.getElementById('stat-pages').innerText = (totalLearned + currentPoints).toLocaleString();
        updateRankProgressBar(totalLearned);
    } else {
        renderGoals();
    }

    incDailyProgress(goalId, change);

    if (goal.targetDate) {
        const diffTime = new Date(goal.targetDate) - new Date();
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const dailyTarget = Math.ceil((goal.totalUnits - goal.currentUnit) / diffDays);
        const doneToday = getDailyProgress(goal.id) + (change > 0 ? change : 0);

        const taskRow = document.getElementById(`daily-task-${goal.id}`);
        if (taskRow) {
            const dailyPercent = Math.min(100, (doneToday / Math.max(1, dailyTarget)) * 100);
            const isDailyDone = doneToday >= dailyTarget;
            const fillEl = taskRow.querySelector('.daily-progress-fill');

            if (fillEl) {
                fillEl.style.width = `${dailyPercent}%`;
                fillEl.style.background = isDailyDone ? '#16a34a' : 'var(--accent)';
            }
        }

        if (change > 0) {
            const doneBefore = getDailyProgress(goal.id);
            const doneAfter = doneBefore + change;

            if (doneBefore < dailyTarget && doneAfter >= dailyTarget) {
                confetti({ particleCount: 200, spread: 90, origin: { x: 0.5, y: 0.5 }, zIndex: 9999 });
                const taskRow = document.getElementById(`daily-task-${goal.id}`);
                if (taskRow) {
                    taskRow.classList.add('daily-goal-reached');
                    const statusSpan = taskRow.querySelector('.task-highlight') || taskRow.querySelector('span');
                    if (statusSpan) {
                        statusSpan.innerHTML = '<i class="fas fa-check-circle"></i> השלמת את הלימוד היומי';
                        statusSpan.style.color = '#16a34a';
                        statusSpan.style.background = '#dcfce7';
                    }
                }
            }
        }
    }

if (goal.currentUnit >= goal.totalUnits && goal.status === 'active') {
        completeGoal(goal.id);
    }

    try {
        if (typeof supabaseClient !== 'undefined' && currentUser) {
            const totalScore = userGoals.reduce((sum, g) => sum + (g.currentUnit || 0), 0);
            await Promise.all([
                supabaseClient
                    .from('user_goals')
                    .update({ current_page: goal.currentUnit })
                    .eq('id', goal.id),
                supabaseClient
                    .from('profiles_public')
                    .update({ rank_score: totalScore })
                    .eq('id', currentUser.id)
            ]);
        }
    } catch (e) {
        console.log("שגיאת סנכרון (אבל נשמר מקומית):", e);
    }
}

function showClickFeedback(btn, change) {
    const span = document.createElement('span');
    span.className = 'progress-feedback';
    span.innerText = change > 0 ? `+${change}` : change;
    span.style.color = change > 0 ? '#16a34a' : '#ef4444';

    const rect = btn.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    span.style.left = (rect.left + scrollLeft + rect.width / 2) + 'px';
    span.style.top = (rect.top + scrollTop) + 'px';

    document.body.appendChild(span);

    setTimeout(() => {
        if (span.parentNode) span.parentNode.removeChild(span);
    }, 800);
}

// ─── מפת דרכים ───────────────────────────────────────────────────────────────
let _roadmapFilter = 'בטיפול';
function openRoadmapModal() {
    const modal = document.getElementById('roadmapModal');
    modal.style.display = 'flex';
    setRoadmapFilter(_roadmapFilter, modal.querySelector('.roadmap-tab'));
}
async function setRoadmapFilter(status, btn) {
    _roadmapFilter = status;
    const modal = document.getElementById('roadmapModal');
    modal.querySelectorAll('.roadmap-tab').forEach(b => {
        b.style.background = 'transparent'; b.style.color = '#64748b';
    });
    if (btn) { btn.style.background = 'var(--card-bg)'; btn.style.color = 'var(--text-main)'; }
    const area = document.getElementById('roadmap-list-area');
    if (!area) return;
    area.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;">טוען...</div>';
    const { data, error } = await supabaseClient.from('roadmap').select('*').eq('status', status).order('created_at', { ascending: false });
    if (error || !data?.length) {
        area.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;">אין פריטים בקטגוריה זו</div>';
        return;
    }
    const statusColors = { 'בוצע': '#16a34a', 'בטיפול': '#f59e0b', 'בתכנון': '#6366f1' };
    const statusIcons = {
        'בוצע': '<i class="fas fa-check-circle" style="color:#16a34a;font-size:1.2rem;"></i>',
        'בטיפול': '<i class="fas fa-wrench" style="color:#f59e0b;font-size:1.2rem;"></i>',
        'בתכנון': '<i class="fas fa-clipboard-list" style="color:#6366f1;font-size:1.2rem;"></i>'
    };
    area.innerHTML = data.map(item => `
        <div style="background:var(--bg,#f8fafc);border-radius:0.75rem;padding:1rem;border:1px solid var(--border-color);display:flex;gap:0.75rem;align-items:flex-start;">
            <span style="flex-shrink:0;margin-top:2px;">${statusIcons[item.status] || '<i class="fas fa-map-marker-alt" style="color:#94a3b8;font-size:1.2rem;"></i>'}</span>
            <div style="flex:1;">
                <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.25rem;">${sanitizeChatHtml(item.title || '')}</div>
                ${item.description ? `<div style="font-size:0.82rem;color:#64748b;">${sanitizeChatHtml(item.description)}</div>` : ''}
            </div>
            <span style="background:${statusColors[item.status] || '#94a3b8'}22;color:${statusColors[item.status] || '#94a3b8'};border-radius:999px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;flex-shrink:0;">${item.status}</span>
        </div>`).join('');
    modal.querySelectorAll('.roadmap-tab').forEach(b => {
        if (b.textContent.trim() === status) { b.style.background = 'var(--card-bg)'; b.style.color = 'var(--text-main)'; }
    });
}

// ─── שיעורי וידאו ─────────────────────────────────────────────────────────────
async function openVideoClassesModal() {
    const modal = document.getElementById('videoClassesModal');
    modal.style.display = 'flex';
    await loadVideoClasses();
}
async function loadVideoClasses() {
    const area = document.getElementById('video-classes-list');
    if (!area) return;
    area.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:1rem;padding:1rem 0;">
            <div style="background:var(--card-bg,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:0.75rem;padding:0.875rem 1rem;display:flex;align-items:center;gap:0.75rem;">
                <i class="fas fa-tools" style="color:var(--accent,#f59e0b);font-size:1rem;flex-shrink:0;"></i>
                <span style="font-size:0.875rem;color:var(--text-muted,#64748b);line-height:1.5;">שיעורי הווידאו בשלבי פיתוח — ייתכן ולא יהיו שיעורים זמינים כרגע</span>
            </div>
            ${[1,2,3].map(()=>`
            <div style="display:flex;gap:0.75rem;align-items:center;background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:vc-shimmer 1.5s infinite;border-radius:0.75rem;padding:0.75rem;border:1px solid #e2e8f0;">
                <div style="width:80px;height:54px;border-radius:8px;background:rgba(0,0,0,0.07);flex-shrink:0;"></div>
                <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                    <div style="height:14px;background:rgba(0,0,0,0.08);border-radius:4px;width:70%;"></div>
                    <div style="height:11px;background:rgba(0,0,0,0.05);border-radius:4px;width:45%;"></div>
                </div>
            </div>`).join('')}
        </div>
        <style>@keyframes vc-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}</style>
    `;
    const { data, error } = await supabaseClient.from('shiurim').select('*').order('created_at', { ascending: false }).limit(30);
    if (error || !data?.length) {
        area.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:1rem;padding:1rem 0;">
                <div style="background:var(--card-bg,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:0.75rem;padding:0.875rem 1rem;display:flex;align-items:center;gap:0.75rem;">
                    <i class="fas fa-tools" style="color:var(--accent,#f59e0b);font-size:1rem;flex-shrink:0;"></i>
                    <span style="font-size:0.875rem;color:var(--text-muted,#64748b);line-height:1.5;">שיעורי הווידאו בשלבי פיתוח — ייתכן ולא יהיו שיעורים זמינים כרגע</span>
                </div>
                <div style="text-align:center;padding:1.5rem;color:#94a3b8;"><i class="fas fa-video" style="font-size:2rem;margin-bottom:0.5rem;display:block;"></i>אין שיעורים זמינים כרגע</div>
            </div>
        `;
        return;
    }
    const banner = `
        <div style="background:var(--card-bg,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:0.75rem;padding:0.875rem 1rem;display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <i class="fas fa-tools" style="color:var(--accent,#f59e0b);font-size:1rem;flex-shrink:0;"></i>
            <span style="font-size:0.875rem;color:var(--text-muted,#64748b);line-height:1.5;">שיעורי הווידאו בשלבי פיתוח — ייתכן ולא יהיו שיעורים זמינים כרגע</span>
        </div>
    `;
    area.innerHTML = banner + data.map(s => {
        const isLive = s.is_live;
        const thumb = s.thumbnail_url ? `<img src="${s.thumbnail_url}" style="width:80px;height:54px;object-fit:cover;border-radius:8px;flex-shrink:0;" onerror="this.style.display='none'">` : `<div style="width:80px;height:54px;background:#1e293b;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-play-circle" style="color:#ef4444;font-size:1.4rem;"></i></div>`;
        return `<div onclick="window.open('${s.video_url || '#'}','_blank')" style="display:flex;gap:0.75rem;align-items:center;background:var(--bg,#f8fafc);border-radius:0.75rem;padding:0.75rem;border:1px solid var(--border-color);cursor:pointer;transition:box-shadow 0.15s;" onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseleave="this.style.boxShadow='none'">
            ${thumb}
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sanitizeChatHtml(s.title || 'שיעור')}</div>
                ${s.rabbi_name ? `<div style="font-size:0.78rem;color:#64748b;margin-top:2px;">הרב ${sanitizeChatHtml(s.rabbi_name)}</div>` : ''}
            </div>
            ${isLive ? `<span style="background:#ef4444;color:white;border-radius:999px;padding:2px 10px;font-size:0.7rem;font-weight:800;flex-shrink:0;">● LIVE</span>` : ''}
        </div>`;
    }).join('');
}
async function checkLiveClasses() {
    const { data } = await supabaseClient.from('shiurim').select('id').eq('is_live', true).limit(1);
    const hasLive = data && data.length > 0;
    ['video-live-dot','video-live-dot-mobile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = hasLive ? 'block' : 'none';
    });
}

let currentDonationType = 'sub';
let selectedTierPrice = 0;

async function openDonationModal() {
    const modal = document.getElementById('donationModal');
    modal.style.display = 'flex';
    bringToFront(modal);
    document.getElementById('donationModal').style.display = 'flex';
    setDonationType('sub');
    renderTiers();

    const progress = localStorage.getItem('torahApp_campaign_progress') || 60;
    const percentage = parseFloat(progress) || 0;
    let goalAmount = parseFloat(localStorage.getItem('torahApp_campaign_goal')) || 6500;
    try {
        const { data: gd } = await supabaseClient.from('settings').select('value').eq('key', 'campaign_goal').maybeSingle();
        if (gd?.value) { goalAmount = parseFloat(gd.value) || goalAmount; localStorage.setItem('torahApp_campaign_goal', gd.value); }
    } catch(e) {}
    const currentAmount = Math.round((percentage / 100) * goalAmount);
    document.getElementById('campaignProgressText').innerText = `גייסנו ${currentAmount.toLocaleString()} ₪ מתוך ${goalAmount.toLocaleString()} ₪ (${percentage}%)`;
    document.getElementById('campaignProgressBar').style.width = progress + '%';
    const goalDisplay = document.getElementById('campaignGoalDisplay');
    if (goalDisplay) goalDisplay.innerText = goalAmount.toLocaleString();

    document.getElementById('customDonationAmount').addEventListener('input', function () {
        document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('selected'));
        selectedTierPrice = 0;

        if (currentDonationType === 'sub') {
            const val = parseInt(this.value) || 0;
            const tier = getTierByAmount(val);
            const infoDiv = document.getElementById('projectedTier');
            if (val > 0) {
                if (tier) {
                    infoDiv.innerHTML = `דרגה צפויה: <strong>${tier.name}</strong>`;
                } else {
                    infoDiv.innerHTML = `סכום נמוך מהמינימום למנוי (${SUBSCRIPTION_TIERS[0].price}₪)`;
                }
            } else {
                infoDiv.innerHTML = '';
            }
        }
    });
}

function closeDonationModal() {
    const modal = document.getElementById('donationModal');
    if (!modal) return;
    const content = modal.querySelector('.modal-content');
    modal.style.transition = 'background-color 0.32s ease';
    modal.style.backgroundColor = 'rgba(0,0,0,0)';
    if (content) {
        content.style.transition = 'opacity 0.32s ease, transform 0.32s ease';
        content.style.opacity = '0';
        content.style.transform = 'scale(0.93) translateY(10px)';
    }
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.backgroundColor = '';
        modal.style.transition = '';
        if (content) {
            content.style.opacity = '';
            content.style.transform = '';
            content.style.transition = '';
        }
    }, 340);
}

function setDonationType(type) {
    currentDonationType = type;
    document.getElementById('donTypeSub').className = `donation-type-option ${type === 'sub' ? 'active' : ''}`;
    document.getElementById('donTypeOne').className = `donation-type-option ${type === 'one' ? 'active' : ''}`;

    document.getElementById('donateBtnText').innerText = type === 'sub' ? 'הצטרף כמנוי' : 'בצע תרומה';
    document.getElementById('subscriptionTiers').style.display = 'grid';
    document.getElementById('projectedTier').innerHTML = '';

    if (type === 'one') {
        document.getElementById('customDonationAmount').placeholder = "סכום לתרומה";
    } else {
        document.getElementById('customDonationAmount').placeholder = "סכום חודשי אחר";
    }

    const chipsContainer = document.getElementById('quickAmountChips');
    if (chipsContainer) chipsContainer.innerHTML = '';

    renderTiers();
}

function renderTiers() {
    const container = document.getElementById('subscriptionTiers');
    container.innerHTML = '';

    const tiers = currentDonationType === 'sub' ? SUBSCRIPTION_TIERS : ONE_TIME_TIERS;
    tiers.forEach(tier => {
        const div = document.createElement('div');
        div.id = `tier-card-${tier.price}`;
        div.className = 'tier-card';
        div.onclick = () => selectTier(tier.price, div);
        div.innerHTML = `
            <div class="tier-price">₪${tier.price}</div>
            <div class="tier-name">${tier.name}</div>
        `;
        container.appendChild(div);
    });
}

function selectTier(price, element) {
    selectedTierPrice = price;
    document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('customDonationAmount').value = '';
    document.getElementById('projectedTier').innerHTML = '';
}

function getTierByAmount(amount) {
    const tiers = currentDonationType === 'sub' ? SUBSCRIPTION_TIERS : ONE_TIME_TIERS;
    const eligibleTiers = tiers.filter(t => t.price <= amount);
    if (eligibleTiers.length === 0) return null;
    return eligibleTiers[eligibleTiers.length - 1];
}

async function processDonation() {
    if (!requireAuth()) return;
    const customAmount = parseInt(document.getElementById('customDonationAmount').value) || 0;
    const finalAmount = customAmount > 0 ? customAmount : selectedTierPrice;

    if (finalAmount <= 0) return customAlert("נא לבחור מסלול או להזין סכום.");

try {
        await supabaseClient.from('donations').insert([{
            user_id: currentUser.id,
            amount: finalAmount,
            donation_type: currentDonationType,
            currency: 'ILS',
            created_at: new Date().toISOString()
        }]);
    } catch (e) { console.error("Error logging donation to DB:", e); }

    if (currentDonationType === 'sub') {
        const tier = getTierByAmount(finalAmount);
        if (!tier) return customAlert(`סכום המינימום למנוי הוא ${SUBSCRIPTION_TIERS[0].price}₪.`);

        const donationMsg = `כרגע אין אפשרות סליקה ישירות מתוך האתר, אך נשמח אם תבצעו את תרומתכם באתר הזה<br><a href="https://ko-fi.com/beithmidrash" target="_blank" style="color:var(--accent); text-decoration:underline;">https://ko-fi.com/beithmidrash</a><br>ופרטי התרומה שלכם יתעדכנו באתר.`;

        await customAlert(donationMsg, true);

        if (approvedPartners.size > 0) {
            const buttonHtml = `<br><button class='btn-link sub-promo-btn' style='margin-top:5px;cursor:pointer;' data-sub-tier='${tier.level}' data-sub-amount='${finalAmount}'>לרכישת אותו מסלול</button>`;
            const msg = `היי! בדיוק הצטרפתי למנוי "${tier.name}" בבית המדרש כדי להחזיק תורה. לא תרצה לעשות זאת גם אתה?${buttonHtml}`;
            approvedPartners.forEach(async (email) => {
                try {
                    await supabaseClient.rpc('send_message', {
                        p_sender_email: currentUser.email,
                        p_receiver_email: email,
                        p_message: msg,
                        p_is_html: true
                    });
                } catch (e) { console.error("Failed to notify partner", e); }
            });
        }

        showThankYouAnimation();

        const { data: followers } = await supabaseClient.from('chavruta_connections').select('sender_id').eq('receiver_id', currentUser.id);
        if (followers && followers.length > 0) {
            const followerIds = followers.map(f => f.sender_id);
            const { data: followerProfiles } = await supabaseClient.from('profiles_public').select('email').in('id', followerIds);
            
            const msgs = (followerProfiles || []).map(f => ({
                sender_email: 'updates@system',
                receiver_email: f.email,
                message: `המשתמש ${currentUser.displayName} תרם לחיזוק בית המדרש!`,
                is_html: true
            }));

            for (const m of msgs) {
                try {
                    await supabaseClient.rpc('send_message', {
                        p_sender_email: m.sender_email, p_receiver_email: m.receiver_email,
                        p_message: m.message, p_is_html: m.is_html
                    });
                } catch (e) { console.warn("send_message rpc not available", e); }
            }
        }
    } else {

        const donationMsg = `כרגע אין אפשרות סליקה ישירות מתוך האתר, אך נשמח אם תבצעו את תרומתכם באתר הזה<br><a href="https://ko-fi.com/beithmidrash" target="_blank" style="color:var(--accent); text-decoration:underline;">https://ko-fi.com/beithmidrash</a><br>ופרטי התרומה שלכם יתעדכנו באתר.`;

        await customAlert(donationMsg, true);

        if (approvedPartners.size > 0) {
            const buttonHtml = `<br><button class='btn-link' style='margin-top:5px;' onclick='openDonationModalAndSelectOneTime(${finalAmount})'>גם אני רוצה לתרום</button>`;
            const msg = `היי! הרגע תרמתי ₪${finalAmount} לחיזוק בית המדרש. זכות גדולה! ממליץ גם לך :)${buttonHtml}`;
            approvedPartners.forEach(async (email) => {
                try {
                    await supabaseClient.rpc('send_message', {
                        p_sender_email: currentUser.email,
                        p_receiver_email: email,
                        p_message: msg,
                        p_is_html: true
                    });
                } catch (e) { console.error("Failed to notify partner", e); }
            });
        }
        showThankYouAnimation();
    }
    closeDonationModal();
}

function openDonationModalAndSelectOneTime(amount) {
    openDonationModal();
    setDonationType('one');
    document.getElementById('customDonationAmount').value = amount;
}

function openDonationModalAndSelectTier(tierLevel, amount) {
    openDonationModal();
    setDonationType('sub');

    const tiers = SUBSCRIPTION_TIERS;
    const tierIndex = tiers.findIndex(t => t.level === tierLevel);

    if (tierIndex !== -1) {
        const tierCard = document.getElementById('subscriptionTiers').children[tierIndex];
        if (tierCard) selectTier(tiers[tierIndex].price, tierCard);
    } else if (amount) {
        document.getElementById('customDonationAmount').value = amount;
    }
    syncGlobalData();
}

function openSuggestionModal() {
    document.getElementById('suggestionModal').style.display = 'flex';
    const modal = document.getElementById('suggestionModal');
    modal.style.display = 'flex';
    bringToFront(modal);
}

let currentChavrutaSearchResults = [];
let currentSearchBook = '';
let activeAgeFilter = null;

function renderChavrutaResultsPage() {
    const container = document.getElementById('chavrutaResultsPageContainer');
    const countLabel = document.getElementById('resultsCountLabel');
    const userCityDisplay = document.getElementById('userCityDisplay');

    if (currentUser && currentUser.city) {
        userCityDisplay.innerText = currentUser.city;
    } else {
        userCityDisplay.innerText = 'לא מוגדר';
    }

    let filtered = currentChavrutaSearchResults.filter(u => {
        const isMe = (u.id === currentUser?.id) ||
            (u.email && currentUser?.email && u.email === currentUser.email) ||
            (u.display_name && currentUser?.displayName && u.display_name === currentUser.displayName);
        return !isMe;
    });

    if (currentSearchBook && window._publicActiveBooksOk === true) {
        filtered = filtered.filter(u => u.studyingThisBook === true);
    }

    const sameCity = document.getElementById('filterSameCity')?.checked;
    if (sameCity && currentUser && currentUser.city) {
        filtered = filtered.filter(u => u.id !== currentUser.id && u.city && u.city.trim() === currentUser.city.trim());
    }

    const historyFilter = document.getElementById('filterHistory')?.checked;
    if (historyFilter) {
        filtered = filtered.filter(u => u.id !== currentUser.id && chavrutaConnections.some(c => (c.id && c.id === u.id) || (c.email && c.email === u.email)));
    }

    // פילטר רמת לימוד
    const studyModeFilterEl = document.getElementById('filterStudyMode');
    const studyModeFilter = studyModeFilterEl ? studyModeFilterEl.value : '';
    if (studyModeFilter) {
        filtered = filtered.filter(u => u.studyMode === studyModeFilter);
    }

    countLabel.innerText = `(${filtered.length} חברותות נמצאו)`;
    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:50px;">יש כאן חפצא (חיפוש), אבל אין גברא (חברותא)... נסה להסיר כמה מגבלות, אולי החברותא שלך מסתתר מאחורי סינון אחר.</div>`;
        return;
    }

    filtered.forEach(user => {
        const badge = getUserBadgeHtml(user);
        const userEmail = user.email || (globalUsersData.find(u => u.id === user.id)?.email) || user.id || '';

        const matchPercent = Math.min(100, Math.round((user.matchScore / 300) * 100));
        const dashOffset = 213.6 - (213.6 * matchPercent) / 100;

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow relative overflow-hidden group";
        const isAnon = user.is_anonymous || user.isAnonymous;
        const displayedName = isAnon ? 'אנונימי' : (user.display_name || user.name || 'לומד');
        const displayedCity = isAnon ? '' : (user.city || 'מיקום חסוי');
        const profileClickAttr = isAnon ? '' : `onclick="showUserDetails('${user.id}')" style="cursor:pointer;"`;
        const sendBtn = isAnon
            ? `<button class="bg-amber-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/20" onclick="sendChavrutaRequest('${user.id}', '${currentSearchBook}')">שלח בקשה אנונימית</button>`
            : `<button class="bg-amber-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/20" onclick="sendChavrutaRequest('${user.id}', '${currentSearchBook}')">שלח בקשת חברותא</button>`;

        card.innerHTML = `
            <div class="absolute right-0 top-0 bottom-0 w-1.5 bg-amber-500 rounded-r-full"></div>
            <div class="flex-shrink-0 flex flex-col items-center" ${profileClickAttr}>
                <div class="relative w-24 h-24 mb-3">
                    <div class="w-full h-full rounded-2xl ${isAnon ? 'bg-slate-200 dark:bg-slate-600' : 'bg-slate-100 dark:bg-slate-700'} flex items-center justify-center text-4xl text-slate-400">
                        <i class="fas ${isAnon ? 'fa-user-secret' : 'fa-user'}"></i>
                    </div>
                    ${!isAnon && user.last_seen && (new Date() - new Date(user.last_seen) < 5 * 60 * 1000) ?
                '<div class="absolute -bottom-2 -left-2 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"></div>' : ''}
                </div>
                <div class="text-center">
                    <h3 class="font-bold text-lg leading-tight">${displayedName} ${isAnon ? '' : badge}</h3>
                    ${displayedCity ? `<p class="text-slate-500 dark:text-slate-400 text-sm">${displayedCity}</p>` : ''}
                </div>
            </div>
            <div class="flex-1 space-y-4">
                <div class="flex flex-wrap gap-2">
                    <span class="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium">לומד: ${currentSearchBook}</span>
                    ${!isAnon ? `<span class="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-medium">דרגה: ${user.rank || getRankName(user.learned || 0)}</span>` : ''}
                    ${user.hasActiveChavrutaForBook ? `<span style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;" class="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><i class="fas fa-users" style="font-size:0.65rem;"></i> לומד כבר עם מישהו</span>` : ''}
                    ${user.studyModeLabel ? (() => {
                        const modeColors = { 'עיון': '#e8951a', 'עיון קל': '#6366f1', 'בקיאות': '#10b981' };
                        const c = modeColors[user.studyModeLabel] || '#64748b';
                        return `<span style="background:${c}18;color:${c};border:1px solid ${c}44;" class="px-3 py-1 rounded-full text-xs font-bold">📖 ${user.studyModeLabel}</span>`;
                    })() : ''}
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                    ${user.chavrutaDescription ? `<span style="color:var(--text-main);font-style:italic;">"${user.chavrutaDescription}"</span>` : `מחפש חברותא ללימוד משותף.${isAnon ? ' (משתמש אנונימי)' : ''}`}
                </p>
                <div class="flex items-center gap-4 pt-2">
                    ${sendBtn}
                </div>
            </div>
            <div class="flex-shrink-0 flex flex-col items-center justify-center px-4 border-r border-slate-100 dark:border-slate-700">
                <div class="relative w-20 h-20 flex items-center justify-center">
                    <svg class="w-full h-full transform -rotate-90">
                        <circle class="text-slate-100 dark:text-slate-700" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" stroke-width="6"></circle>
                        <circle class="text-amber-500 rounded-full" cx="40" cy="40" fill="transparent" r="34" stroke="currentColor" stroke-dasharray="213.6" stroke-dashoffset="${dashOffset}" stroke-width="6"></circle>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-xl font-black text-amber-500">${matchPercent}%</span>
                        <span class="text-[10px] text-slate-400 font-medium">התאמה</span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterChavrutaByAge(min, max, btn) {
    activeAgeFilter = { min, max };
    document.querySelectorAll('.filter-age-btn').forEach(b => b.classList.replace('bg-amber-500', 'bg-slate-100'));
    document.querySelectorAll('.filter-age-btn').forEach(b => b.classList.replace('text-white', 'text-slate-600'));

    btn.classList.replace('bg-slate-100', 'bg-amber-500');
    btn.classList.replace('text-slate-600', 'text-white');
    renderChavrutaResultsPage();
}

function toggleCustomCheckbox(id) {
    const input = document.getElementById(id);
    input.checked = !input.checked;
    updateCustomCheckboxVisual(id);
    renderChavrutaResultsPage();
}

function updateCustomCheckboxVisual(id) {
    const input = document.getElementById(id);
    const visual = document.getElementById('visual-' + id);
    const icon = visual.querySelector('span');

    if (input.checked) {
        visual.classList.remove('border-slate-300', 'dark:border-slate-600');
        visual.classList.add('bg-amber-500', 'border-amber-500');
        icon.classList.remove('hidden');
    } else {
        visual.classList.add('border-slate-300', 'dark:border-slate-600');
        visual.classList.remove('bg-amber-500', 'border-amber-500');
        icon.classList.add('hidden');
    }
}

function resetChavrutaFilters() {
    activeAgeFilter = null;
    document.getElementById('filterSameCity').checked = false;
    updateCustomCheckboxVisual('filterSameCity');
    document.getElementById('filterHistory').checked = false;
    updateCustomCheckboxVisual('filterHistory');
    document.querySelectorAll('.filter-age-btn').forEach(b => b.classList.replace('bg-amber-500', 'bg-slate-100'));
    document.querySelectorAll('.filter-age-btn').forEach(b => b.classList.replace('text-white', 'text-slate-600'));
    renderChavrutaResultsPage();
}

async function sendSuggestion() {
    if (!requireAuth()) return;
    const content = document.getElementById('suggestionInput').value.trim();
    if (!content) return customAlert("נא לכתוב תוכן להצעה");

    try {
        await supabaseClient.from('suggestions').insert([{
            user_id: currentUser.id,
            user_email: currentUser.email,
            content: content,
            status: 'new'
        }]);

const rewardKey = 'torahApp_suggestion_rewarded';
        const alreadyRewarded = localStorage.getItem(rewardKey) === 'true';
        if (!alreadyRewarded) {
            
            let claimed = false;
            try {
                const { data: priv } = await supabaseClient
                    .from('profiles_private')
                    .select('suggestion_reward_claimed')
                    .eq('id', currentUser.id)
                    .maybeSingle();
                claimed = priv?.suggestion_reward_claimed === true;
            } catch (e) {  }

            if (!claimed) {
                await addRewardPointsDB(currentUser.id, 15);
                localStorage.setItem(rewardKey, 'true');
                try {
                    await supabaseClient.from('profiles_private')
                        .update({ suggestion_reward_claimed: true })
                        .eq('id', currentUser.id);
                } catch (e) {  }
                showToast("תודה! קיבלת 15 זוזים על הצעת הייעול 🎁", "success");
            } else {
                localStorage.setItem(rewardKey, 'true');
                showToast("תודה! ההצעה נשלחה בהצלחה.", "success");
            }
        } else {
            showToast("תודה! ההצעה נשלחה בהצלחה.", "success");
        }

        document.getElementById('suggestionInput').value = '';
        closeModal();
    } catch (e) {
        console.error(e);
        await customAlert("שגיאה בשליחת ההצעה.");
    }
}

function showThankYouAnimation() {
    closeModal();
    document.getElementById('profile-dropdown').style.display = 'none';
    document.getElementById('notif-dropdown').style.display = 'none';

    const overlay = document.createElement('div');
    overlay.className = 'thank-you-overlay fixed inset-0 flex items-center justify-center z-[9999] p-4';
    overlay.innerHTML = `
        <div class="animate-popup bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative border border-white" style="box-shadow: 0 20px 50px rgba(0,0,0,0.1);">
            <!-- Top Decorative Bar (Dash Style) -->
            <div class="p-8 md:p-12 flex flex-col items-center text-center">
                <!-- Success Icon/Illustration -->
                <div class="mb-6 bg-yellow-50 rounded-full p-4">
                    <svg class="h-16 w-16 text-[#fbbd08]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                    </svg>
                </div>
                <!-- Main Heading -->
                <h1 class="text-5xl font-extrabold text-gray-800 mb-4 tracking-tight">
                    שכוייח!
                </h1>
                <!-- Content Text -->
                <div class="space-y-2 mb-10">
                    <p class="text-xl text-gray-600 font-medium">
                        הקבלה נשלחה אליך למייל
                    </p>
                    <p class="text-lg text-gray-500">
                        והזכויות נשלחו הישר לכיסא הכבוד!
                    </p>
                </div>
                <!-- Action Button -->
                <button class="w-full py-4 bg-[#1e293b] text-white rounded-2xl text-xl font-bold hover:bg-slate-800 transition-colors shadow-lg active:transform active:scale-95" onclick="closeThankYou(this)">
                    תזכו למצוות
                </button>
            </div>
            <!-- Sparkle Ornaments (Dashboard Style) -->
            <div class="absolute top-6 right-8 text-[#fbbd08] opacity-50">
                <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M12,2L10.5,8.5L4,10L10.5,11.5L12,18L13.5,11.5L20,10L13.5,8.5L12,2Z"></path></svg>
            </div>
            <div class="absolute bottom-10 left-8 text-[#fbbd08] opacity-30 transform rotate-45">
                <svg fill="currentColor" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M12,2L10.5,8.5L4,10L10.5,11.5L12,18L13.5,11.5L20,10L13.5,8.5L12,2Z"></path></svg>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    window.confettiInterval = setInterval(() => {
        const randomX = Math.random();
        const randomY = Math.random();
        confetti({ particleCount: 30, spread: 360, origin: { x: randomX, y: randomY }, zIndex: 10005, startVelocity: 30 });
        confetti({ particleCount: 30, spread: 360, origin: { x: Math.random(), y: Math.random() }, zIndex: 10005, startVelocity: 20 });
    }, 250);
}

function closeThankYou(btn) {
    if (window.confettiInterval) clearInterval(window.confettiInterval);
    btn.closest('.thank-you-overlay').remove();
}

function getDailyProgress(goalId) {
    const key = 'daily_track_' + goalId;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    const today = new Date().toLocaleDateString('en-GB');
    if (data.date !== today) return 0;
    return data.count || 0;
}

function markDailyGoalDone(goalId) {
    const goal = userGoals.find(g => g.id == goalId);
    if (!goal || !goal.targetDate) return;

    const diffTime = new Date(goal.targetDate) - new Date();
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const dailyTarget = Math.ceil((goal.totalUnits - goal.currentUnit) / diffDays);
    const doneToday = getDailyProgress(goalId);
    const needed = Math.max(0, dailyTarget - doneToday);

    if (needed > 0) {
        incDailyProgress(goalId, needed);
        window.justCompletedDailyGoal = goal.id;
        confetti({ particleCount: 200, spread: 90, origin: { x: 0.5, y: 0.5 }, zIndex: 9999 });
    }

    const taskRow = document.getElementById(`daily-task-${goalId}`);
    if (taskRow) {
        const fillEl = taskRow.querySelector('.daily-progress-fill');
        if (fillEl) { fillEl.style.width = '100%'; fillEl.style.background = '#16a34a'; }
        taskRow.classList.add('daily-goal-reached');
        const statusSpan = taskRow.querySelector('.task-highlight');
        if (statusSpan) {
            statusSpan.outerHTML = `<span style="color:#16a34a; font-weight:bold; font-size:0.9rem;"><i class="fas fa-check-circle"></i> השלמת את הלימוד היומי</span>`;
        }
        const btn = taskRow.querySelector('button');
        if (btn) btn.remove();
    }
}

function openBookText(bookName) {
    if (!bookName) return customAlert("לא נבחר ספר לפתיחה");

    let url = '';

    if (bookName === 'דף היומי') {
        url = dafYomiTodayUrl || `https://www.sefaria.org.il/Talmud`;
    } else if (bookName === 'משנה יומית') {
        url = 'https://www.sefaria.org.il/Mishnah_Yomit';
    } else if (bookName === 'רמב"ם יומי') {
        url = 'https://www.sefaria.org.il/Rambam_Yomi';
    } else if (bookName === 'הלכה יומית') {
        url = 'https://www.sefaria.org.il/Halakhah_Yomit';
    } else {
        url = `https://www.sefaria.org.il/${bookName.replace(/ /g, '_')}`;
    }

    const modal = document.getElementById('bookReaderModal');
    const title = document.getElementById('bookReaderTitle');
    const frame = document.getElementById('bookReaderFrame');
    const cookieModal = document.getElementById('cookieModal');

if (modal && title && frame) {
        title.innerText = bookName;
        frame.src = url;
        modal.style.display = 'flex';
        bringToFront(modal);
    } else {
        window.open(url, '_blank');
    }
}

async function cancelSentRequest(receiverEmail, bookName) {
    if (!(await customConfirm('לבטל את בקשת החברותא?'))) return;
    try {
        const { error } = await supabaseClient
            .from('chavruta_connections')
            .update({ status: 'cancelled' })
            .eq('sender_id', currentUser.id)
            .eq('book_name', bookName)
            .eq('status', 'pending');

        if (error) throw error;

        await customAlert('הבקשה בוטלה.');
        await syncGlobalData();
        renderChavrutas();
    } catch (e) {
        console.error(e);
        await customAlert('שגיאה בביטול הבקשה');
    }
}

let currentScheduleKey = null;

function openScheduleModal(email, book, name) {
    document.getElementById('scheduleModal').style.display = 'flex';
    const modal = document.getElementById('scheduleModal');
    modal.style.display = 'flex';
    bringToFront(modal);
    document.getElementById('scheduleTargetName').innerText = `עם ${name} (${book})`;
    currentScheduleKey = `${email}::${book}`;

    const schedules = JSON.parse(localStorage.getItem('chavruta_schedules') || '{}');
    const existing = schedules[currentScheduleKey];

    document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('scheduleTime').value = '';

    if (existing) {
        document.getElementById('scheduleTime').value = existing.time;
        document.querySelectorAll('.day-checkbox').forEach(cb => {
            if (existing.days.includes(cb.value)) cb.checked = true;
        });
    }
}

async function saveSchedule() {
    if (!currentScheduleKey) return;

    const time = document.getElementById('scheduleTime').value;
    const days = [...document.querySelectorAll('.day-checkbox:checked')].map(cb => cb.value);

    if (!time || days.length === 0) {
        showToast('יש לבחור שעה וימים', 'error');
        return;
    }

    const schedules = JSON.parse(localStorage.getItem('chavruta_schedules') || '{}');
    const [partnerEmail, bookName] = currentScheduleKey.split('::');
    const partnerData = globalUsersData.find(u => u.email === partnerEmail);
    const partnerName = partnerData ? partnerData.name : (partnerEmail || 'חברותא');

    schedules[currentScheduleKey] = { time, days, book: bookName, partnerName, email: partnerEmail };
    localStorage.setItem('chavruta_schedules', JSON.stringify(schedules));

if (currentUser?.id) {
        try {
            await supabaseClient.from('chavruta_schedules').upsert({
                user_id: currentUser.id,
                partner_email: partnerEmail,
                book_name: bookName,
                days,
                time_slot: time
            }, { onConflict: 'user_id,partner_email,book_name' });
        } catch (e) {  }
    }

    showToast('לוח הזמנים נשמר בהצלחה!', 'success');
    closeModal();
    renderCalendar();
}

async function deleteSchedule(key, dayIndex = null) {
    const confirmed = await customConfirm('האם למחוק את הזמן הזה?');
    if (!confirmed) return;
    const schedules = JSON.parse(localStorage.getItem('chavruta_schedules') || '{}');
    if (dayIndex !== null && schedules[key]) {
        const dayStr = dayIndex.toString();
        schedules[key].days = (schedules[key].days || []).filter(d => d !== dayStr);
        if (schedules[key].days.length === 0) delete schedules[key];
    } else {
        delete schedules[key];
    }
    localStorage.setItem('chavruta_schedules', JSON.stringify(schedules));
    showToast('הזמן נמחק', 'info');
    renderCalendar();
}

function renderCalendar() {
    const container = document.getElementById('calendarView');
    if (!container) return;

    let html = `
    <div class="flex items-center gap-3 mb-6 justify-start">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white m-0">לוח זמנים שבועי</h2>
        <div class="text-amber-500">
            <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
            </svg>
        </div>
    </div>
    <div class="space-y-6">
    `;

    const schedules = JSON.parse(localStorage.getItem('chavruta_schedules') || '{}');
    const daysMap = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    let hasEvents = false;
    for (let i = 0; i < 6; i++) {
        const dayItems = Object.values(schedules).filter(s => s.days.includes(i.toString()));
        dayItems.sort((a, b) => a.time.localeCompare(b.time));

        if (dayItems.length > 0) {
            hasEvents = true;
            html += `
            <section class="bg-white dark:bg-slate-800 rounded-2xl p-6 soft-shadow">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">יום ${daysMap[i]}</h3>
                <div class="space-y-3">
            `;
            dayItems.forEach(item => {
                const key = `${item.email}::${item.book}`;
                html += `
                <div class="day-strip bg-blue-50/50 dark:bg-slate-700/50 p-4 rounded-lg flex justify-between items-center gap-3">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl font-black text-blue-600 dark:text-blue-400 min-w-[56px] text-center">${item.time}</span>
                        <div>
                            <div class="text-blue-900 dark:text-blue-300 font-semibold">עם ${item.partnerName}</div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">${item.book}</div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-1 rounded-lg hover:bg-amber-50 transition-colors" onclick="openScheduleModal('${item.email}','${item.book}','${item.partnerName}')">
                            <i class="fas fa-edit text-amber-500"></i>
                        </button>
                        <button class="text-xs bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors" onclick="deleteSchedule('${key}', ${i})">
                            <i class="fas fa-trash text-red-400"></i>
                        </button>
                    </div>
                </div>
                `;
            });
            html += `</div></section>`;
        }
    }
    if (!hasEvents) html += '<div style="text-align:center; color:#94a3b8; padding:20px;">אין זמני לימוד קבועים.</div>';

    html += '</div>';
    container.innerHTML = html;
}

async function cancelChavruta(partnerIdentifier) {
    if (!requireAuth()) return;
    if (!(await customConfirm("האם אתה בטוח שברצונך לבטל את החברותא עם משתמש זה?"))) return;

    try {
        
        const isEmail = partnerIdentifier && partnerIdentifier.includes('@');
        let partnerUser = isEmail
            ? globalUsersData.find(u => u.email === partnerIdentifier)
            : globalUsersData.find(u => u.id === partnerIdentifier);

if (!partnerUser) {
            const conn = chavrutaConnections.find(c => c.partnerId === partnerIdentifier || c.email === partnerIdentifier);
            if (conn) partnerUser = globalUsersData.find(u => u.id === conn.partnerId) || { id: conn.partnerId, email: conn.email };
        }

        const partnerId = partnerUser?.id || (isEmail ? null : partnerIdentifier);
        const partnerEmail = partnerUser?.email || (isEmail ? partnerIdentifier : null);

        if (!partnerId) { showToast("שגיאה: לא ניתן לזהות את המשתמש.", "error"); return; }

        const { error } = await supabaseClient
            .from('chavruta_connections')
            .update({ status: 'cancelled' })
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
            .in('status', ['accepted', 'approved']);

        if (error) throw error;

        showToast("החברותא בוטלה בהצלחה.", "info");

approvedPartners.delete(partnerId);
        if (partnerEmail) approvedPartners.delete(partnerEmail);

        if (partnerEmail) {
            const schedules = JSON.parse(localStorage.getItem('chavruta_schedules') || '{}');
            Object.keys(schedules).forEach(key => {
                if (key.startsWith(partnerEmail + '::')) delete schedules[key];
            });
            localStorage.setItem('chavruta_schedules', JSON.stringify(schedules));
            try {
                await supabaseClient.from('schedules').delete().eq('user_email', currentUser.email).eq('partner_email', partnerEmail);
            } catch (e) { console.error("Error deleting schedule on cancel", e); }
        }

        await syncGlobalData();
        renderChavrutas();
    } catch (e) {
        console.error("שגיאה בביטול חברותא:", e);
        await customAlert("אירעה שגיאה בביטול החברותא.");
    }
}

async function cancelChavrutaBook(partnerIdentifier, bookName) {
    if (!requireAuth()) return;
    if (!bookName) return showToast("יש לבחור ספר לביטול.", "error");
    if (!(await customConfirm(`לבטל את החברותא על הספר "${bookName}"?`))) return;

    try {
        const isEmail = partnerIdentifier && partnerIdentifier.includes('@');
        let partnerUser = isEmail
            ? globalUsersData.find(u => u.email === partnerIdentifier)
            : globalUsersData.find(u => u.id === partnerIdentifier);
        if (!partnerUser) {
            const conn = chavrutaConnections.find(c => c.partnerId === partnerIdentifier || c.email === partnerIdentifier);
            if (conn) partnerUser = globalUsersData.find(u => u.id === conn.partnerId) || { id: conn.partnerId, email: conn.email };
        }

        const partnerId = partnerUser?.id || (isEmail ? null : partnerIdentifier);
        const partnerEmail = partnerUser?.email || (isEmail ? partnerIdentifier : null);
        if (!partnerId) { showToast("שגיאה: לא ניתן לזהות את המשתמש.", "error"); return; }

        const { error } = await supabaseClient
            .from('chavruta_connections')
            .update({ status: 'cancelled' })
            .eq('book_name', bookName)
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
            .in('status', ['accepted', 'approved']);

        if (error) throw error;

        showToast(`החברותא על "${bookName}" בוטלה.`, "info");
        document.getElementById('userModal').style.display = 'none';

        const remaining = chavrutaConnections.filter(c =>
            (c.partnerId === partnerId || c.email === partnerEmail) && c.book !== bookName
        );
        if (remaining.length === 0) {
            if (partnerEmail) approvedPartners.delete(partnerEmail);
            if (partnerId) approvedPartners.delete(partnerId);
        }

        await syncGlobalData();
        renderChavrutas();
    } catch (e) {
        console.error("שגיאה בביטול חברותא לספר:", e);
        await customAlert("אירעה שגיאה בביטול החברותא.");
    }
}

async function renderMazalTovInMainArea() {
    const main = document.getElementById('chat-main-area');
    main.innerHTML = `
        <div class="chat-header" style="border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center; padding: 15px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; position:relative; overflow:hidden;">
            <div style="display:flex; align-items:center; gap:8px; position:relative; z-index:1;">
                <span style="font-size:1.4rem;">🎊</span>
                <span style="font-weight:800; font-size:1.05rem;">לוח סיומים - מזל טוב!</span>
                <span style="font-size:1.4rem;">🎉</span>
            </div>
            <div style="position:relative; z-index:1;">
                <i class="fas fa-times" onclick="closeMainChat()" title="סגור" style="cursor:pointer; font-size:1.1rem;"></i>
            </div>
            <div style="position:absolute;inset:0;background:url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'2\' fill=\'white\' opacity=\'0.2\'/%3E%3Ccircle cx=\'30\' cy=\'20\' r=\'1.5\' fill=\'white\' opacity=\'0.15\'/%3E%3Ccircle cx=\'70\' cy=\'15\' r=\'2.5\' fill=\'white\' opacity=\'0.18\'/%3E%3Ccircle cx=\'90\' cy=\'8\' r=\'1\' fill=\'white\' opacity=\'0.25\'/%3E%3C/svg%3E') repeat;"></div>
        </div>
        <div class="chat-body" id="mazaltov-chat-body" style="border-radius: 0 0 12px 12px; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; background:linear-gradient(180deg, #fffbeb 0%, #fefce8 100%);">
            <div id="mazaltov-main-container"></div>
        </div>
    `;

    const container = document.getElementById('mazaltov-main-container');
    const skelHtml = Array.from({length: 3}, (_, i) => `
        <div style="display:flex; gap:10px; align-items:flex-end; margin-bottom:14px; ${i%2===1?'flex-direction:row-reverse;':''}">
            <div class="skeleton" style="width:40px;height:40px;border-radius:50%;flex-shrink:0;"></div>
            <div style="flex:1; max-width:75%;">
                <div class="skeleton skeleton-line" style="height:16px; width:70%; border-radius:12px; margin-bottom:8px;"></div>
                <div class="skeleton skeleton-line" style="height:12px; width:50%; border-radius:8px;"></div>
            </div>
        </div>`).join('');
    container.innerHTML = skelHtml;

let siyumin = null;
    const { data: rawSiyumin, error } = await supabaseClient
        .from('siyum_board')
        .select('id, completed_at, book_name, user_id, user_email')
        .order('completed_at', { ascending: false })
        .limit(50);

    if (error) {
        const isNoTable = error.code === '42P01' || (error.message && error.message.includes('does not exist'));
        const isPermError = error.code === '42501' || (error.message && (error.message.includes('permission') || error.message.includes('policy')));
        if (isNoTable) {
            container.innerHTML = '<p style="text-align:center; color:#94a3b8;">עדיין אין סיומים בלוח. היה הראשון לסיים!</p>';
        } else if (isPermError) {
            container.innerHTML = '<p style="text-align:center; color:#94a3b8;">לוח הסיומים אינו זמין כרגע. יש להגדיר הרשאות צפייה בטבלת siyum_board.</p>';
        } else {
            container.innerHTML = `<p style="text-align:center; color:#ef4444;">שגיאה בטעינת הלוח: ${error.message || 'שגיאה לא ידועה'}</p>`;
        }
        return;
    }

    if (rawSiyumin && rawSiyumin.length > 0) {
        
        const userIds = [...new Set(rawSiyumin.map(s => s.user_id).filter(Boolean))];
        let profileMap = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabaseClient
                .from('profiles_public')
                .select('id, display_name, email')
                .in('id', userIds);
            (profiles || []).forEach(p => { profileMap[p.id] = p; });
        }

const siyumIds = rawSiyumin.map(s => s.id);
        let reactionCounts = {};
        const { data: reactions } = await supabaseClient
            .from('siyum_reactions')
            .select('siyum_id')
            .in('siyum_id', siyumIds);
        (reactions || []).forEach(r => { reactionCounts[r.siyum_id] = (reactionCounts[r.siyum_id] || 0) + 1; });

        siyumin = rawSiyumin.map(s => {
            const profile = s.user_id ? profileMap[s.user_id] : null;
            const byEmail = !profile && s.user_email ? globalUsersData.find(u => u.email === s.user_email) : null;
            const resolvedUser = profile || (byEmail ? { id: byEmail.id, display_name: byEmail.name, email: byEmail.email } : null);
            return { ...s, users: resolvedUser, siyum_reactions: [{ count: reactionCounts[s.id] || 0 }] };
        });
    } else {
        siyumin = [];
    }

    if (!siyumin || siyumin.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:30px;"><span style="font-size:3rem;">📖</span><br>עדיין אין סיומים בלוח. היה הראשון לסיים!</div>';
        return;
    }

    container.innerHTML = '';

    if (typeof confetti === 'function') {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.3 }, colors: ['#FFB703', '#f59e0b', '#FCD34D', '#10b981', '#3b82f6'] });
        setTimeout(() => confetti({ particleCount: 40, spread: 60, origin: { y: 0.4, x: 0.2 }, colors: ['#FFB703', '#ef4444', '#8b5cf6'] }), 600);
        setTimeout(() => confetti({ particleCount: 40, spread: 60, origin: { y: 0.4, x: 0.8 }, colors: ['#FFB703', '#10b981', '#f97316'] }), 1200);
    }

    const festiveEmojis = ['🎊','🎉','✨','🏆','📚','🥂','🎗️','⭐','🌟','🎆'];
    siyumin.forEach((siyum, idx) => {
        const name = siyum.users ? (siyum.users.display_name || 'לומד') : 'לומד';
        const mazalTovCount = siyum.siyum_reactions[0]?.count || 0;
        const userId = siyum.users ? (siyum.users.id || siyum.users.email) : '';
        const dateStr = new Date(siyum.completed_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
        const emoji = festiveEmojis[idx % festiveEmojis.length];
        const isAlt = idx % 2 === 1;

        const div = document.createElement('div');
        div.style.cssText = `display:flex; gap:10px; align-items:flex-end; margin-bottom:16px; ${isAlt ? 'flex-direction:row-reverse;' : ''}`;
        div.innerHTML = `
            <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;box-shadow:0 4px 12px rgba(245,158,11,0.3);">${emoji}</div>
            <div style="max-width:80%;background:white;border-radius:${isAlt?'18px 18px 4px 18px':'18px 18px 18px 4px'};padding:12px 16px;box-shadow:0 2px 12px rgba(245,158,11,0.15);border:1px solid #fde68a;position:relative;">
                <div style="font-size:0.7rem;color:#92400e;font-weight:700;margin-bottom:4px;letter-spacing:0.02em;">🎉 לוח הסיומים</div>
                <div style="font-size:0.97rem;color:#1e293b;line-height:1.5;">
                    <strong style="cursor:pointer;text-decoration:underline;color:#d97706;" onclick="showUserDetails('${userId}')">${name}</strong>
                    סיים את <strong style="color:#0f172a;">${siyum.book_name}</strong>! 🏆
                </div>
                <div style="font-size:0.72rem;color:#92400e;margin-top:6px;opacity:0.75;">${dateStr}</div>
                <div style="margin-top:10px;">
                    <button onclick="addSiyumReaction(${siyum.id}, this)" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:20px;padding:6px 14px;font-size:0.82rem;cursor:pointer;font-weight:700;box-shadow:0 3px 8px rgba(245,158,11,0.4);transition:all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        🥂 מזל טוב! <span id="siyum-count-${siyum.id}" style="background:rgba(255,255,255,0.25);padding:1px 7px;border-radius:10px;margin-right:3px;">${mazalTovCount}</span>
                    </button>
                </div>
            </div>`;
        container.appendChild(div);
    });
}

function openReportModal(email, chatContext) {
    const isPublic = chatContext === 'public';
    document.getElementById('reportTargetEmail').value = email;
    document.getElementById('reportChatContext').value = isPublic ? 'public' : 'private';
    const titleEl = document.getElementById('reportModalTitle');
    const descEl = document.getElementById('reportModalDesc');
    const btnEl = document.getElementById('reportSubmitBtn');
    if (titleEl) titleEl.textContent = isPublic ? 'דיווח על הודעה' : 'דיווח וחסימה';
    if (descEl) descEl.textContent = isPublic
        ? 'הדיווח יועבר למנהל האתר לבדיקה. בצ\'אט ציבורי לא מתבצעת חסימה אוטומטית.'
        : 'דיווח על משתמש יחסום את השיחה ביניכם ויסתיר את ההודעות עד לאישור הניהול.';
    if (btnEl) btnEl.textContent = isPublic ? 'שלח דיווח' : 'דווח וחסום';
    const modal = document.getElementById('reportModal');
    modal.style.display = 'flex';
    bringToFront(modal);
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('reportReason').value = '';
}

async function submitReport() {
    if (!requireAuth()) return;
    const target = document.getElementById('reportTargetEmail').value;
    const reason = document.getElementById('reportReason').value;
    const chatContext = document.getElementById('reportChatContext').value;
    const isPublicChat = chatContext === 'public';
    if (!reason) return customAlert("נא לפרט את סיבת הדיווח");

    try {
        const reportedUser = typeof globalUsersData !== 'undefined'
            ? globalUsersData.find(u => u.email === target)
            : null;
        const payload = {
            reporter_email: currentUser.email,
            reported_email: target,
            reported_user_id: reportedUser?.id || null,
            reason: reason,
            status: 'pending',
            chat_context: chatContext
        };
        const { error } = await supabaseClient.from('user_reports').insert([payload]);
        if (error) throw error;

        if (!isPublicChat) {
            if (!blockedUsers.includes(target)) {
                blockedUsers.push(target);
                localStorage.setItem('torahApp_blocked', JSON.stringify(blockedUsers));
            }
            if (reportedUser?.id) {
                supabaseClient.from('blocked_users').insert([{ blocker_id: currentUser.id, blocked_id: reportedUser.id }]).then(() => {}).catch(() => {});
            }
            const chatContainer = document.getElementById(`msgs-${target}`);
            if (chatContainer) {
                chatContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-ban" style="font-size:2rem;margin-bottom:8px;display:block;color:#ef4444;"></i>השיחה נחסמה בעקבות הדיווח ותבדק על ידי הניהול.</div>';
            }
            const chatWin = document.getElementById(`chat-window-${target}`);
            if (chatWin) {
                const msgArea = chatWin.querySelector('.chat-messages-area');
                if (msgArea) msgArea.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-ban" style="font-size:2rem;margin-bottom:8px;display:block;color:#ef4444;"></i>השיחה נחסמה בעקבות הדיווח.</div>';
            }
            showToast("הדיווח נשלח. השיחה נחסמה עד לאישור הניהול.", "info");
        } else {
            showToast("הדיווח הועבר למנהל המערכת לבדיקה.", "info");
        }
        closeReportModal();
    } catch (e) {
        console.error(e);
        await customAlert("אירעה שגיאה בשליחת הדיווח.");
    }
}

function setupRealtime() {
    if (!currentUser || typeof supabaseClient === 'undefined') return;
    if (realtimeSubscription) {
        try { supabaseClient.removeChannel(realtimeSubscription); } catch (e) { }
        realtimeSubscription = null;
    }

    realtimeSubscription = supabaseClient.channel('global_room')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chavruta_connections' }, (payload) => {
            const newItem = payload.new || {};
            const oldItem = payload.old || {};
            const myId = currentUser.id;
            if (newItem.receiver_id === myId || newItem.sender_id === myId ||
                oldItem.receiver_id === myId || oldItem.sender_id === myId) {

                if (payload.eventType === 'INSERT' && newItem.receiver_id === myId) {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(e => console.error("Audio error", e));
                }

                if (payload.eventType === 'UPDATE' && (newItem.status === 'accepted' || newItem.status === 'approved') && oldItem.status === 'pending' && newItem.sender_id === myId) {
                    const receiverUser = globalUsersData.find(u => u.id === newItem.receiver_id);
                    const receiverName = receiverUser ? receiverUser.name : 'החברותא';
                    // הטוסט מיידי; ההודעה בפעמון מגיעה מה-DB (תמיכה גם באופליין)
                    showToast(`🎉 החברותא עם ${receiverName} אושרה! קיבלת 15 זוזים.`, "success");
                }

                checkIncomingRequests();
                syncGlobalData();
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chavruta_connections' }, (payload) => {
            if (payload.new && payload.new.receiver_id === currentUser.id) {
                updateFollowersCount();
                if (payload.eventType === 'INSERT') {
                    addNotification("מזל טוב! מישהו החליט לעקוב אחריך. אל תדאג, זה לא מס הכנסה 😉");
                }
            }
            if (payload.old && payload.old.receiver_id === currentUser.id) {
                updateFollowersCount();
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_goals' }, () => {
            syncGlobalData();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_goals' }, (payload) => {

            if (currentNotesData.goalId && payload.new.book_name === document.getElementById('notesBookTitle').innerText) {
                const chavruta = chavrutaConnections.find(c => c.book === payload.new.book_name);
                if (chavruta && payload.new.user_id === (globalUsersData.find(u => u.email === chavruta.email)?.id)) {
                    refreshPartnerNotes(chavruta.email, payload.new.book_name);
                }
            }
            syncGlobalData();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_reports' }, (payload) => {
            if (isAdminMode) {
                addNotification(`⚠️ התקבל דיווח חדש על ${payload.new.reported_email}`);
                if (document.getElementById('admin-sec-reports').classList.contains('active')) renderAdminReports();
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles_public' }, (payload) => {
            if (payload.new.email === currentUser.email && payload.new.is_banned) {
                location.reload();
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_announcements' }, (payload) => {
            if (payload.new && payload.new.target_type === 'lottery_result') {
                showLotteryAnimation(payload.new);
                return;
            }
            if (payload.new && payload.new.target_type !== 'maintenance') {
                const ann = payload.new;
                const msg = ann.content || ann.message || '';
                if (!msg) return;

                const deliveryType = ann.delivery_type || 'notification';

let ctaHtml = '';
                if (ann.cta_text && ann.cta_url) {
                    ctaHtml = `<br><br><a href="${ann.cta_url}" target="_blank" rel="noopener"
                        style="display:inline-block;margin-top:8px;padding:8px 18px;background:#f59e0b;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
                        ${ann.cta_text}</a>`;
                }

                if (deliveryType === 'admin') {
                    
                    addNotification(`📢 ${ann.title || 'תמיכה'}: ${msg}`);
                    if (typeof openChat === 'function') {
                        openChat('admin@system', 'תמיכה', true);
                    }
                    setTimeout(() => {
                        const chatMsgsArea = document.getElementById('msgs-admin@system') ||
                            document.querySelector('#chat-window-admin\\@system .chat-messages-area');
                        if (chatMsgsArea && typeof appendMessageToWindow === 'function') {
                            appendMessageToWindow('admin@system', msg + ctaHtml, 'other', null, new Date().toISOString(), false, 'admin@system');
                        }
                    }, 1500);
                } else if (deliveryType === 'popup') {
                    
                    addNotification("📢 הודעת מערכת: " + msg);
                    const msgHtml = msg.replace(/\n/g, '<br>');
                    customAlert(`📢 ${ann.title ? `<strong>${ann.title}</strong><br>` : ''}${msgHtml}${ctaHtml}`, true);
                } else {
                    
                    addNotification(`📢 ${ann.title ? ann.title + ': ' : ''}${msg}`);
                }
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suggestions' }, (payload) => {
            if (isAdminMode && document.getElementById('admin-sec-suggestions').classList.contains('active')) {
                renderAdminSuggestions();
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload) => {
            syncGlobalData();
            if (typeof loadChatRating === 'function') loadChatRating();
            if (typeof handleReactionRealtime === 'function') handleReactionRealtime(payload);
        })

        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_followers' }, (payload) => {
            
            const followingId = payload.new?.following_id || payload.old?.following_id;
            if (followingId === currentUser.id) {
                updateFollowersCount(currentUser.id);
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
            const n = payload.new;
            if (n && !n.is_read) {
                const notifId = `db-notif-${n.id}`;
                addNotification(n.content || n.title || 'הודעה חדשה', notifId, false);
                showToast(n.title || n.content || 'הודעה חדשה', 'info');
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_private' }, (payload) => {
            handleRealtimeMessage(payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_public' }, (payload) => {
            handleRealtimeMessage(payload);
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
            if (payload.payload && payload.payload.to === currentUser.email) {
                const sender = globalUsersData.find(u => u.email === payload.payload.from);
                let displayName = sender ? sender.name : payload.payload.from;
                if (payload.payload.from === 'admin@system') {
                    displayName = 'תמיכה';
                }
                showTyping(payload.payload.from, `${displayName} מקליד...`);
            }
        })
        .on('broadcast', { event: 'delete_message' }, (payload) => {
            if (payload.payload && payload.payload.id) {
                const msgEl = document.getElementById(`msg-${payload.payload.id}`);
                if (msgEl && typeof markMessageAsDeleted === 'function') {
                    markMessageAsDeleted(msgEl, false);
                }
            }
        })
        .on('broadcast', { event: 'messages_read' }, (payload) => {
            if (payload.payload && currentUser && payload.payload.of === currentUser.email) {
                if (typeof updateCheckmarksForChat === 'function') {
                    updateCheckmarksForChat(payload.payload.reader);
                }
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles_public' }, () => {
            syncGlobalData().then(() => renderLeaderboard());
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_admin' }, (payload) => {
            const msg = payload.new;
            if (!msg || !currentUser) return;
            if (msg.user_id !== currentUser.id) return;
            // refresh the admin support chat window if it's open
            const activeChatEmail = document.getElementById('chat-partner-email')?.textContent || '';
            if (activeChatEmail === 'admin@system' || activeChatEmail === '') {
                if (typeof checkNewMessagesFor === 'function') checkNewMessagesFor('admin@system');
            }
            // show notification if chat is not open
            if (msg.sender_email === 'admin@system') {
                addNotification('💬 תגובת הניהול: ' + (msg.content || '').slice(0, 60));
            }
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {

                chatChannel = realtimeSubscription;
            }
            if (status === 'CHANNEL_ERROR') {
                console.warn('חיבור Realtime נכשל.', err);
                if (err && err.message && err.message.includes("banned")) showToast("החיבור נחסם על ידי השרת", "error");
                else setTimeout(() => { if (currentUser) setupRealtime(); }, 5000);
            }
            if (status === 'CLOSED') {
                console.log('Realtime socket closed. Reconnecting in 5s...');
                setTimeout(() => { if (currentUser) setupRealtime(); }, 5000);
            }
            if (status === 'TIMED_OUT') {
                console.warn('החיבור לזמן אמת התנתק עקב timeout');
                setTimeout(() => { if (currentUser) setupRealtime(); }, 3000);
            }
        });

const _processedMsgIds = new Set();

realtimeSubscription.on('broadcast', { event: 'private_message' }, (payload) => {
        if (!payload.payload || !payload.payload.message) return;
        const msg = payload.payload.message;
        if (!currentUser || msg.sender_id === currentUser.id) return;

const conn = typeof chavrutaConnections !== 'undefined'
            ? chavrutaConnections.find(c => c.id === msg.connection_id)
            : null;
        if (!conn) return;

        const partnerEmail = conn.email;
        const msgContent = msg.content || msg.message_text || msg.message || '';
        if (!msgContent || document.getElementById(`msg-${msg.id}`)) return;

        const container = typeof getChatContainer === 'function' ? getChatContainer(partnerEmail) : null;
        if (container) {
            appendMessageToWindow(partnerEmail, msgContent, 'other', msg.id, msg.created_at, false, msg.sender_email);
            const win = document.getElementById(`chat-window-${partnerEmail}`);
            if (win && win.classList.contains('minimized')) {
                win.classList.add('flashing');
                if (!_processedMsgIds.has(String(msg.id))) {
                    _processedMsgIds.add(String(msg.id));
                    setTimeout(() => _processedMsgIds.delete(String(msg.id)), 10000);
                    unreadMessages[partnerEmail] = (unreadMessages[partnerEmail] || 0) + 1;
                    localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
                    if (typeof updateChatBadge === 'function') updateChatBadge();
                    if (document.getElementById('screen-chavrutas')?.classList.contains('active')) renderChavrutas();
                }
            } else if (typeof markAsRead === 'function') markAsRead(partnerEmail);
        } else {
            if (!_processedMsgIds.has(String(msg.id))) {
                _processedMsgIds.add(String(msg.id));
                setTimeout(() => _processedMsgIds.delete(String(msg.id)), 10000);
                unreadMessages[partnerEmail] = (unreadMessages[partnerEmail] || 0) + 1;
                localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
                if (typeof updateChatBadge === 'function') updateChatBadge();
                const senderUser = globalUsersData.find(u => u.email === partnerEmail);
                const senderName = senderUser ? senderUser.name : partnerEmail;
                if (Notification.permission === 'granted') {
                    new Notification(`הודעה חדשה מ-${senderName}`, { body: msgContent.replace(/<[^>]*>?/gm, ''), icon: 'logo-remove.png' });
                }
            }
            if (document.getElementById('screen-chavrutas')?.classList.contains('active')) renderChavrutas();
        }
    });

subscribeToLotteryEvents();
}

function handleRealtimeMessage(payload) {
    const { eventType, new: newMsg, old: oldMsg } = payload;

    if (eventType === 'INSERT' && newMsg) {
        
        const msgContent = newMsg.content || newMsg.message_text || newMsg.message || '';

        const myEmail = getCurrentChatEmail().toLowerCase();
        const sender = newMsg.sender_email ? newMsg.sender_email.toLowerCase() : '';
        const receiver = newMsg.receiver_email ? newMsg.receiver_email.toLowerCase() : '';

        if (msgContent.includes('ref:')) {
            const refMatch = msgContent.match(/ref:(\d+)/);
            if (refMatch && document.getElementById(`msg-${refMatch[1]}`)) {
                const parentMsg = document.getElementById(`msg-${refMatch[1]}`);
                if (!parentMsg.querySelector('.thread-active-indicator')) {
                    const indicator = document.createElement('span');
                    indicator.className = 'thread-active-indicator';
                    indicator.title = "יש תגובות חדשות בשרשור";
                    parentMsg.appendChild(indicator);
                }
            }
            if (activeThreadId && refMatch && refMatch[1] === String(activeThreadId)) {
                const container = document.getElementById('thread-messages');
                if (container) appendThreadMessage(newMsg, container);
            }
            return; 
        }

const bookName = newMsg.book_name;
        if (bookName) {
            const bookId = 'book:' + bookName;
            const senderId = newMsg.user_id || newMsg.sender_id;
            if (senderId === currentUser?.id) return; 

            if (document.getElementById(`msg-${newMsg.id}`)) return;

            let win = document.getElementById(`chat-window-${bookId}`);
            const container = win ? win.querySelector('.chat-messages-area') : document.getElementById(`msgs-${bookId}`);

            if (win || container) {
                const senderEmail = newMsg.sender_email || (globalUsersData.find(u => u.id === senderId)?.email) || '';
                const targetId = win ? win.id.replace('chat-window-', '') : bookId;
                appendMessageToWindow(targetId, msgContent, 'other', newMsg.id, newMsg.created_at, false, senderEmail);
                if (win && win.classList.contains('minimized')) win.classList.add('flashing');
            }
            return;
        }

if (receiver === myEmail) {
            if (blockedUsers.includes(sender)) return;

            const win = document.getElementById(`chat-window-${sender}`);
            const container = document.getElementById(`msgs-${sender}`);

            if (win || container) {
                appendMessageToWindow(sender, msgContent, 'other', newMsg.id, newMsg.created_at, false, sender);
                if (win && win.classList.contains('minimized')) {
                    win.classList.add('flashing');
                    if (!_processedMsgIds.has(String(newMsg.id))) {
                        _processedMsgIds.add(String(newMsg.id));
                        setTimeout(() => _processedMsgIds.delete(String(newMsg.id)), 10000);
                        unreadMessages[sender] = (unreadMessages[sender] || 0) + 1;
                        localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
                        updateChatBadge();
                        if (document.getElementById('screen-chavrutas')?.classList.contains('active')) renderChavrutas();
                    }
                } else markAsRead(sender);
            } else {
                if (!_processedMsgIds.has(String(newMsg.id))) {
                    _processedMsgIds.add(String(newMsg.id));
                    setTimeout(() => _processedMsgIds.delete(String(newMsg.id)), 10000);
                    let senderDisplayName = sender;
                    if (sender === 'admin@system') {
                        senderDisplayName = 'תמיכה';
                    } else {
                        const senderUser = globalUsersData.find(u => u.email === sender);
                        if (senderUser) senderDisplayName = senderUser.name;
                    }
                    unreadMessages[sender] = (unreadMessages[sender] || 0) + 1;
                    localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
                    updateChatBadge();
                    if (Notification.permission === "granted") {
                        const plainMsg = msgContent.replace(/<[^>]*>?/gm, '');
                        new Notification(`הודעה חדשה מ-${senderDisplayName}`, { body: plainMsg, icon: "logo-remove.png" });
                    }
                    if (document.getElementById('screen-chavrutas').classList.contains('active')) renderChavrutas();
                }
            }
        } else if (sender === myEmail) {
            if (!document.getElementById(`msg-${newMsg.id}`)) {
                const win = document.getElementById(`chat-window-${receiver}`);
                const container = document.getElementById(`msgs-${receiver}`);
                if (win || container) {
                    appendMessageToWindow(receiver, msgContent, 'me', newMsg.id, newMsg.created_at, false, sender);
                }
            }
        }
    } else if (eventType === 'UPDATE' && newMsg) {
        const updatedContent = newMsg.content || newMsg.message_text || newMsg.message;
        if (updatedContent && typeof updateMessageDOM === 'function') {
            updateMessageDOM(newMsg.id, updatedContent);
        }
        if (newMsg.is_read && newMsg.id) {
            const chkEl = document.getElementById(`chk-${newMsg.id}`);
            if (chkEl && !chkEl.classList.contains('read')) {
                chkEl.classList.add('read');
                chkEl.textContent = '✓✓';
            }
        }
    } else if (eventType === 'DELETE' && oldMsg) {
        const msgEl = document.getElementById(`msg-${oldMsg.id}`);
        if (msgEl) {
            if (msgEl.parentElement && (msgEl.parentElement.classList.contains('new-message-animation') || msgEl.parentElement.style.display === 'flex')) msgEl.parentElement.remove();
            else msgEl.remove();
        }
    }
}

function formatBroadcast(tag) {
    const textarea = document.getElementById('adminSystemMsg');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    const newText = `<${tag}>${selectedText}</${tag}>`;
    textarea.value = before + newText + after;
    textarea.focus();
    textarea.selectionStart = start + newText.length;
    textarea.selectionEnd = start + newText.length;
}

let keySequence = [];
document.addEventListener('keydown', async (e) => {
    if (e.key === 'Alt' || e.key === 'Control' || e.key === 'Shift' || e.key === 'Meta') {
        return;
    }

    if (e.key === 'Escape') {
        keySequence = [];
        return;
    }

    if (!e.altKey) {
        keySequence = [];
    }

    if (e.altKey) {
        const k = e.key.toLowerCase();
        if (k.length === 1) e.preventDefault();
        keySequence.push(k);

        if (keySequence.length > 5) keySequence.shift();

        const seqStr = keySequence.join('');

if (seqStr.endsWith('co') || seqStr.endsWith('בם')) {
            e.preventDefault();
            keySequence = [];
            const pass = await customPrompt("הכנס סיסמת מנהל:");
            if (pass === "0000") {
                toggleDataWar();
            } else if (pass) await customAlert("סיסמה שגויה");
            return;
        }
    }
});

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));

    const section = document.getElementById('admin-sec-' + tabName);
    const button = document.querySelector(`.admin-tab-btn[onclick*="'${tabName}'"]`);

    if (section) section.classList.add('active');
    if (button) button.classList.add('active');

    if (tabName === 'users') renderAdminUsersTable();
    if (tabName === 'reports') renderAdminReports();
    if (tabName === 'inbox') renderAdminInbox();
    if (tabName === 'suggestions') renderAdminSuggestions();
    if (tabName === 'donations') loadCampaignAdminInputs();
}

async function loadCampaignAdminInputs() {
    try {
        const { data } = await supabaseClient.from('settings').select('key, value').in('key', ['campaign_goal', 'campaign_progress']);
        if (data) {
            data.forEach(row => {
                if (row.key === 'campaign_goal') {
                    const el = document.getElementById('adminCampaignGoalInput');
                    if (el) el.value = row.value;
                    localStorage.setItem('torahApp_campaign_goal', row.value);
                }
                if (row.key === 'campaign_progress') {
                    const el = document.getElementById('adminCampaignInput');
                    if (el) el.value = row.value;
                    localStorage.setItem('torahApp_campaign_progress', row.value);
                }
            });
        }
    } catch(e) { console.error(e); }
}


let selectedUsersForDelete = [];

function openUserSelection(targetInputId) {
    document.getElementById('userSelectionModal').style.display = 'flex';
    selectedUsersForDelete = [];
    renderUserSelectionList();
}

function renderUserSelectionList() {
    const search = document.getElementById('userSelectSearch').value.toLowerCase();
    const list = document.getElementById('userSelectionList');
    list.innerHTML = `
        <div class="user-select-item" onclick="toggleSelectAllUsers(this)">
            <input type="checkbox" id="selectAllUsersCheckbox">
            <strong>בחר הכל</strong>
        </div>
    `;

    globalUsersData.forEach(u => {
        if (u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)) {
            const div = document.createElement('div');
            div.className = 'user-select-item';
            div.innerHTML = `<input type="checkbox" value="${u.email}" class="user-select-cb"> ${u.name} (${u.email})`;
            list.appendChild(div);
        }
    });
}

function toggleSelectAllUsers(el) {
    const cb = el.querySelector('input');
    const checked = !cb.checked;
    cb.checked = checked;
    document.querySelectorAll('.user-select-cb').forEach(c => c.checked = checked);
}

function confirmUserSelection() {
    const selected = Array.from(document.querySelectorAll('.user-select-cb:checked')).map(cb => cb.value);
    document.getElementById('resetChatEmail1').value = selected.length > 0 ? selected.join(',') : '';
    document.getElementById('userSelectionModal').style.display = 'none';
}

async function downloadMarketingList() {
    const { data } = await supabaseClient.from('profiles_public').select('email').eq('marketing_consent', true);
    if (!data || data.length === 0) return customAlert("אין נתונים להורדה");

    const text = data.map(u => u.email).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marketing_emails.txt';
    a.click();
}

async function saveCampaignProgress() {
    const val = document.getElementById('adminCampaignInput').value;
    localStorage.setItem('torahApp_campaign_progress', val);
    try {
        const { error } = await supabaseClient.from('settings').upsert({ key: 'campaign_progress', value: val }, { onConflict: 'key' });
        if (error) throw error;
        showToast('ההתקדמות עודכנה ונשמרה בענן!', "success");
    } catch (e) {
        console.error(e);
        customAlert('ההתקדמות נשמרה מקומית, אך אירעה שגיאה בשמירה לענן.');
    }
}

async function saveCampaignGoal() {
    const val = document.getElementById('adminCampaignGoalInput').value;
    if (!val || isNaN(val) || parseFloat(val) <= 0) { showToast('נא להזין סכום תקין', 'error'); return; }
    localStorage.setItem('torahApp_campaign_goal', val);
    try {
        const { error } = await supabaseClient.from('settings').upsert({ key: 'campaign_goal', value: val }, { onConflict: 'key' });
        if (error) throw error;
        showToast('יעד הקמפיין עודכן!', 'success');
    } catch (e) {
        console.error(e);
        showToast('נשמר מקומית, שגיאה בשמירה לענן', 'error');
    }
}

async function sendSystemBroadcast() {
    if (!requireAuth()) return;
    const msg = document.getElementById('adminSystemMsg').value.replace(/\n/g, '<br>');
    if (!msg) return;

    try {
        await supabaseClient.from('system_announcements').insert([{ content: msg, target_type: 'all', created_at: new Date().toISOString() }]);
        showToast('ההודעה נשלחה!', "success");
        document.getElementById('adminSystemMsg').value = '';
    } catch (e) {
        console.error(e);
        await customAlert('שגיאה בשליחת ההודעה.');
    }
}

async function checkBanLifted() {
    const email = sessionStorage.getItem('banned_email');
    if (!email) {
        location.reload();
        return;
    }
    const { data: user } = await supabaseClient.from('profiles_public').select('is_banned').eq('email', email).maybeSingle();
    if (user && !user.is_banned) {
        localStorage.removeItem('device_banned');
        location.reload();
    } else {
        customAlert("החשבון עדיין חסום.");
    }
}

function toggleProfileMenu() {
    const menu = document.getElementById('profile-dropdown');
    if (!menu) return;
    const gridMenu = document.getElementById('grid-menu-dropdown');
    if (gridMenu) _slideOutDropdown(gridMenu);
    const notifDropdown = document.getElementById('notif-dropdown');
    if (notifDropdown) _slideOutDropdown(notifDropdown);
    const isOpen = menu.style.display === 'block';
    if (isOpen) { _slideOutDropdown(menu); return; }
    // Populate with current user info
    const displayName = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.displayName || currentUser.email || '') : '';
    const email = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.email || '') : '';
    const myGD = (typeof globalUsersData !== 'undefined' ? globalUsersData : []).find(u => u.email === email);
    const avatarUrl = myGD?.avatar_url || null;
    const avatarHtml = avatarUrl
        ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'">`
        : `<i class="fas fa-user" style="font-size:1.1rem;color:var(--text-muted,#94a3b8);"></i>`;
    menu.innerHTML = `
        <div onclick="toggleProfileMenu();switchScreen('my-profile');" style="cursor:pointer;padding:12px 14px;background:var(--bg,#f8fafc);border-radius:10px;margin-bottom:8px;border:1px solid var(--border-color,#e2e8f0);transition:background .15s;display:flex;align-items:center;gap:10px;" onmouseenter="this.style.background='var(--bg-hover,rgba(0,0,0,0.04))'" onmouseleave="this.style.background='var(--bg,#f8fafc)'">
            <div style="width:38px;height:38px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--border-color,#e2e8f0);display:flex;align-items:center;justify-content:center;">${avatarHtml}</div>
            <div>
                <div style="font-weight:800;font-size:0.95rem;color:var(--text-main);margin-bottom:2px;">${displayName || 'משתמש'}</div>
                <div style="font-size:0.75rem;color:var(--text-muted,#64748b);" dir="ltr">${email}</div>
            </div>
        </div>
        <div onclick="toggleProfileMenu();logoutWithConfirm();" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;color:#ef4444;font-size:0.85rem;font-weight:600;transition:background .15s;" onmouseenter="this.style.background='rgba(239,68,68,0.06)'" onmouseleave="this.style.background='transparent'">
            <i class="fas fa-sign-out-alt"></i> התנתק
        </div>
    `;
    menu.style.display = 'block';
    setTimeout(() => {
        document.addEventListener('click', _closeProfileMenuOnOutside, { once: true });
    }, 0);
}

function _closeProfileMenuOnOutside(e) {
    const menu = document.getElementById('profile-dropdown');
    const btn = document.getElementById('headerProfileBtn');
    if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
        _slideOutDropdown(menu);
    }
}

function closeProfileMenu() {
    const menu = document.getElementById('profile-dropdown');
    if (menu) _slideOutDropdown(menu);
}

function toggleGridMenu(e) {
    if (e) e.stopPropagation();
    const notifDropdown = document.getElementById('notif-dropdown');
    if (notifDropdown) _slideOutDropdown(notifDropdown);
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) _slideOutDropdown(profileDropdown);
    const menu = document.getElementById('grid-menu-dropdown');
    if (!menu) return;
    const isOpen = menu.style.display === 'block';
    if (isOpen) {
        _slideOutDropdown(menu);
    } else {
        menu.style.display = 'block';
        menu.style.animation = 'dropdownSlideIn 0.18s ease';
        setTimeout(() => {
            document.addEventListener('click', _closeGridOnOutside, { once: true });
        }, 0);
    }
}

function _closeGridOnOutside(e) {
    const menu = document.getElementById('grid-menu-dropdown');
    const btn = document.getElementById('grid-menu-btn');
    if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
        _slideOutDropdown(menu);
    }
}

function closeGridMenu() {
    const menu = document.getElementById('grid-menu-dropdown');
    if (menu) menu.style.display = 'none';
}

function toggleGuestProfileMenu() {
    const notifDropdown = document.getElementById('notif-dropdown');
    if (notifDropdown) {
        notifDropdown.style.display = 'none';
    }
    const menu = document.getElementById('profile-dropdown');
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
        return;
    }

    menu.innerHTML = `
        <div class="profile-menu-item" onclick="requireAuth()">
            <i class="fas fa-medal"></i> הישגים
        </div>
        <div class="profile-menu-item" onclick="requireAuth()">
            <i class="fas fa-store"></i> חנות הזכויות
        </div>
        <div class="profile-menu-item" onclick="requireAuth()">
            <i class="fas fa-calendar-alt"></i> לוח זמנים
        </div>
        <div class="profile-menu-item" onclick="requireAuth()">
            <i class="fas fa-user-edit"></i> עריכת פרופיל
        </div>
        <div class="profile-menu-item" onclick="requireAuth()">
            <i class="fas fa-users"></i> עוקבים
        </div>
        <div class="profile-menu-item" style="display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fas fa-moon"></i> מצב לילה</span>
            <label class="switch">
                <input type="checkbox" id="darkModeSwitch" onchange="toggleDarkMode(event)">
                <span class="slider"></span>
            </label>
        </div>
        <div class="profile-menu-item" onclick="showAuthOverlay(); toggleProfileMenu();">
            <i class="fas fa-sign-in-alt"></i> התחבר או הירשם
        </div>
    `;
    if (document.getElementById('darkModeSwitch')) document.getElementById('darkModeSwitch').checked = localStorage.getItem('torahApp_darkMode') === 'true';
    menu.style.display = 'block';
}

document.addEventListener('click', function (event) {
    const container = document.querySelector('.profile-container');
    if (container && !container.contains(event.target)) {
        document.getElementById('profile-dropdown').style.display = 'none';
    }

    const notifContainer = document.querySelector('#notif-container');
    const notifMenu = document.getElementById('notif-dropdown');
    if (notifContainer && !notifContainer.contains(event.target) && notifMenu && notifMenu.style.display === 'flex') {
        toggleNotifications();
    }

const searchContainer = document.querySelector('.header-search-container');
    if (searchContainer && !searchContainer.contains(event.target)) {
        closeSearchDropdown();
    }

    const chatMenuContainer = document.querySelector('.chat-menu-container');
    if (chatMenuContainer && !chatMenuContainer.contains(event.target)) {
        const chatMenu = document.getElementById('chat-menu-dropdown');
        if (chatMenu) chatMenu.classList.remove('active');
    }
});

async function sendAppeal() {
    const msg = document.getElementById('appealMsg').value;
    const email = sessionStorage.getItem('banned_email');
    if (!msg) return customAlert("נא לכתוב תוכן לפנייה");
    if (!email) return customAlert("לא ניתן לזהות את הפנייה. נסה לרענן את הדף.");

    const { data: user } = await supabaseClient.from('profiles_public').select('is_banned').eq('email', email).maybeSingle();
    if (user && !user.is_banned) {
        localStorage.removeItem('device_banned');
        location.reload();
        return;
    }

    try {
        const { error } = await supabaseClient.rpc('send_message', {
            p_sender_email: email,
            p_receiver_email: 'admin@system',
            p_message: 'ערעור חסימה: ' + msg,
            p_is_html: false
        });

        if (error) throw error;
        showToast("הפנייה נשלחה למנהל האתר.", "success");
        document.getElementById('appealMsg').value = '';
    } catch (e) { console.error(e); await customAlert("שגיאה בשליחה"); }
}

async function renderMazalTovBoard() {
    const container = document.getElementById('mazaltov-container');
    if (!container) return;
    const siyumSkel2 = Array.from({length: 3}, () => `<div class="card" style="margin-bottom:12px;text-align:center;padding:16px;"><div class="skeleton skeleton-line" style="width:55%;height:16px;margin:0 auto 10px;"></div><div class="skeleton skeleton-line" style="width:70%;height:13px;margin:0 auto 8px;"></div><div class="skeleton skeleton-line" style="width:35%;height:11px;margin:0 auto 12px;"></div><div class="skeleton" style="width:140px;height:34px;border-radius:25px;margin:0 auto;"></div></div>`).join('');
    container.innerHTML = siyumSkel2;

    let { data: rawSiyumin, error } = await supabaseClient
        .from('siyum_board')
        .select('id, completed_at, book_name, user_id, user_email')
        .order('completed_at', { ascending: false })
        .limit(50);

    if (error) { container.innerHTML = '<p style="text-align:center; color:red;">שגיאה בטעינת הלוח.</p>'; return; }

const siyumIds = (rawSiyumin || []).map(s => s.id).filter(Boolean);
    let reactionCounts = {};
    if (siyumIds.length > 0) {
        try {
            const { data: rxData } = await supabaseClient.from('siyum_reactions').select('siyum_id').in('siyum_id', siyumIds);
            (rxData || []).forEach(r => { reactionCounts[r.siyum_id] = (reactionCounts[r.siyum_id] || 0) + 1; });
        } catch (e) {  }
    }

    const siyumin = (rawSiyumin || []).map(s => {
        const g = (s.user_id ? globalUsersData.find(u => u.id === s.user_id) : null) || (s.user_email ? globalUsersData.find(u => u.email === s.user_email) : null);
        return { ...s, displayName: g ? (g.name || g.display_name) : 'לומד', mazalTovCount: reactionCounts[s.id] || 0 };
    });

    if (!siyumin || siyumin.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8;">עדיין אין סיומים בלוח. היה הראשון לסיים!</p>';
        return;
    }

    container.innerHTML = '';
    const festiveEmojis2 = ['🎊','🎉','✨','🏆','📚','🥂','🎗️','⭐'];
    siyumin.forEach((siyum, idx) => {
        const name = siyum.displayName || 'לומד';
        const mazalTovCount = siyum.mazalTovCount || 0;
        const emoji = festiveEmojis2[idx % festiveEmojis2.length];
        const isAlt = idx % 2 === 1;
        const div = document.createElement('div');
        div.style.cssText = `display:flex; gap:10px; align-items:flex-end; margin-bottom:14px; ${isAlt ? 'flex-direction:row-reverse;' : ''}`;
        div.innerHTML = `
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;box-shadow:0 3px 10px rgba(245,158,11,0.3);">${emoji}</div>
            <div style="max-width:82%;background:var(--card-bg,#fff);border-radius:${isAlt?'16px 16px 4px 16px':'16px 16px 16px 4px'};padding:10px 14px;box-shadow:0 2px 10px rgba(0,0,0,0.07);border:1px solid var(--border-color,#fde68a);">
                <div style="font-size:0.67rem;color:#92400e;font-weight:700;margin-bottom:3px;">🎉 לוח הסיומים</div>
                <div style="font-size:0.9rem;color:var(--text-main,#1e293b);line-height:1.5;">
                    <strong>${name}</strong> סיים את <strong>${siyum.book_name}</strong>! 🏆
                </div>
                <div style="font-size:0.7rem;color:#64748b;margin-top:4px;">${new Date(siyum.completed_at).toLocaleDateString('he-IL')}</div>
                <div style="margin-top:8px;">
                    <button onclick="addSiyumReaction(${siyum.id}, this)" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:16px;padding:5px 12px;font-size:0.78rem;cursor:pointer;font-weight:700;">
                        🥂 מזל טוב! <span id="siyum-count-${siyum.id}" style="background:rgba(255,255,255,0.25);padding:1px 6px;border-radius:8px;margin-right:2px;">${mazalTovCount}</span>
                    </button>
                </div>
            </div>`;
        container.appendChild(div);
    });
}

function toggleDarkMode(e, forceState) {
    const body = document.body;
    const isDark = forceState !== undefined ? forceState : e.target.checked;

    if (isDark) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
    document.getElementById('darkModeSwitch').checked = isDark;
    localStorage.setItem('torahApp_darkMode', isDark);
}

async function saveAds() {
    
    alert("שמירת פרסומות אינה זמינה כרגע (טבלת settings חסרה).");
}

async function loadAds() {
    const container = document.getElementById('ads-container');
    try {
        
        container.innerHTML = '<p style="text-align:center; color:#94a3b8;">אין פרסומות כרגע.</p>';
        
    } catch (e) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8;">אין פרסומות כרגע.</p>';
    }
}

async function addSiyumReaction(siyumId, btn) {
    if (!requireAuth()) return;
    try {
        const { error } = await supabaseClient.from('siyum_reactions').insert({ siyum_id: siyumId, reactor_id: currentUser.id });

        if (error && error.code === '23505') {
            return showToast("כבר אמרת מזל טוב!", "info");
        }
        if (error) throw error;

        const countEl = document.getElementById(`siyum-count-${siyumId}`);
        countEl.innerText = parseInt(countEl.innerText) + 1;
        btn.disabled = true;
        btn.style.background = 'var(--success)';
        showToast("מזל טוב נשלח!", "success");
    } catch (e) { console.error(e); }

}

window.isNetworkMonitorActive = false;
let isVerboseNetworkLog = false;

function toggleVerboseNetworkLog(btn) {
    isVerboseNetworkLog = !isVerboseNetworkLog;
    btn.textContent = isVerboseNetworkLog ? 'הסתר בקשות רקע' : 'הצג בקשות רקע';
    btn.style.background = isVerboseNetworkLog ? '#16a34a' : '#334155';
}
function toggleDataWar() {
    window.isNetworkMonitorActive = !window.isNetworkMonitorActive;
    const overlay = document.getElementById('dataWarOverlay');
    overlay.style.display = window.isNetworkMonitorActive ? 'flex' : 'none';
    if (window.isNetworkMonitorActive) {
        populateNetworkUsers();
    } else {
        document.getElementById('networkLog').innerHTML = '';
        document.getElementById('user-icons-container').innerHTML = '';
    }
}

function populateNetworkUsers() {
    const container = document.getElementById('user-icons-container');
    const visualizer = document.getElementById('network-visualizer');
    if (!container || !visualizer) return;

    container.innerHTML = '';
    const onlineUsers = globalUsersData.filter(u => u.lastSeen && (new Date() - new Date(u.lastSeen) < 5 * 60 * 1000));

    const width = visualizer.clientWidth;
    const height = visualizer.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width / 2 - 40;
    const radiusY = height / 2 - 40;
    const userCount = onlineUsers.length;

    onlineUsers.forEach((user, i) => {
        const angle = (i / userCount) * 2 * Math.PI - (Math.PI / 2);
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY + radiusY * Math.sin(angle);

        const userDiv = document.createElement('div');
        const safeEmail = user.email.replace(/[@.-]/g, '');
        userDiv.id = `net-user-${safeEmail}`;
        userDiv.className = 'net-user';
        userDiv.dataset.id = user.email;
        userDiv.style.left = `${x - 30}px`;
        userDiv.style.top = `${y - 30}px`;

        userDiv.innerHTML = `
            <div class="user-icon-emoji">💻</div>
            <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${user.name}</div>
        `;
        container.appendChild(userDiv);
    });
}

function drawNetworkLine(fromId, toId, color = '#3b82f6') {
    const svg = document.getElementById('network-lines-svg');
    const fromEl = document.querySelector(`[data-id='${fromId}']`);
    const toEl = document.querySelector(`[data-id='${toId}']`);

    if (!svg || !fromEl || !toEl) {
        return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();

    const fromX = (fromRect.left + fromRect.width / 2) - svgRect.left;
    const fromY = (fromRect.top + fromRect.height / 2) - svgRect.top;
    const toX = (toRect.left + toRect.width / 2) - svgRect.left;
    const toY = (toRect.top + toRect.height / 2) - svgRect.top;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${fromX},${fromY} L${toX},${toY}`);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');

    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;

    svg.appendChild(path);

    path.animate([
        { strokeDashoffset: length },
        { strokeDashoffset: 0 }
    ], {
        duration: 800,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
    }).onfinish = () => {
        path.animate([
            { opacity: 1 },
            { opacity: 0 }
        ], { duration: 300, easing: 'ease-out' }).onfinish = () => {
            path.remove();
        };
    };
}
const originalFetch = window.fetch;
window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    const isBoring = url.includes('last_seen') || (url.includes('chavruta_requests') && url.includes('select')) || (url.includes('chat_messages') && url.includes('select'));

    const details = {
        action: getHebrewActionName(url),
        from: currentUser?.email,
        isBoring: isBoring
    };

    if (window.isNetworkMonitorActive) {
        visualizeNetworkActivity('request', details);
    }

    try {
        const response = await originalFetch(...args);
        if (window.isNetworkMonitorActive) {
            details.status = response.status;
            visualizeNetworkActivity('response', details);
        }
        return response;
    } catch (e) {
        if (window.isNetworkMonitorActive) {
            details.status = 'Error';
            visualizeNetworkActivity('error', details);
        }
        throw e;
    }
};

async function populateAllBooks() {
    const select = document.getElementById('bookSelect');
    if (document.getElementById('newBookSearch')) return;

    const searchContainer = document.createElement('div');
    searchContainer.style.position = 'relative';
    searchContainer.style.marginBottom = '15px';

    searchContainer.innerHTML = `
        <label style="font-weight:600; display:block; margin-bottom:6px; font-size:0.9rem;">חפש ספר ללימוד</label>
        <div class="header-search-input-wrapper" style="background:var(--bg); border:1px solid var(--border-color); padding: 8px 12px; border-radius: 8px;">
            <input type="text" id="newBookSearch" placeholder="הקלד שם מסכת או ספר..." 
                   oninput="handleBookSearch(this.value)" autocomplete="off" 
                   style="border:none; background:transparent; width:100%; outline:none; color:var(--text-main);">
            <i class="fas fa-search" style="color:var(--text-main); opacity:0.5;"></i>
        </div>
        <ul id="bookSearchResults" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; max-height:250px; overflow-y:auto; z-index:100; list-style:none; padding:0; margin-top:5px; box-shadow:0 10px 25px rgba(0,0,0,0.1);"></ul>
    `;

    if (select && select.parentNode) {
        select.parentNode.insertBefore(searchContainer, select);
        select.style.display = 'none';
        select.id = 'bookSelect_hidden';
    }
}

let activeThreadId = null;
let activeThreadChatId = null;

async function openThread(msgId, text, chatId) {
    activeThreadId = msgId;
    activeThreadChatId = chatId;

    const area = document.getElementById('chat-thread-area');
    const container = document.getElementById('thread-messages');
    if (!area || !container) return;

    area.style.display = 'flex';
    container.innerHTML = `<div style="background:#e2e8f0; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.9rem;"><strong>הודעת מקור:</strong><br>${text}</div>`;
    container.innerHTML += `<div class="skeleton-thread-loading" style="padding:8px;">${getSkeletonHTML('chat', 3)}</div>`;

setTimeout(() => {
        const input = document.getElementById('thread-input');
        if (input) input.focus();
    }, 100);

const threadBookName = activeThreadChatId ? activeThreadChatId.replace('book:', '') : '';
    const { data: replies } = await supabaseClient
        .from('chat_public')
        .select('*')
        .eq('parent_message_id', msgId)
        .order('created_at', { ascending: true });

    const loadingMsg = container.querySelector('.skeleton-thread-loading');
    if (loadingMsg) loadingMsg.remove();

    if (replies && replies.length > 0) {
        replies.forEach(rep => appendThreadMessage(rep, container));
    } else {
        container.innerHTML += `<div style="text-align:center; color:#94a3b8; margin-top:20px;">אין תגובות בשרשור זה (עדיין)</div>`;
    }
    container.scrollTop = container.scrollHeight;
    _subscribeToThread(msgId);
}

function appendThreadMessage(rep, container) {
    const rawMsg = rep.content || rep.message || '';
    const cleanMsg = rawMsg.replace(/<span style="display:none">ref:.*?<\/span>/, '');
    const senderUser = rep.sender_email ? globalUsersData.find(u => u.email === rep.sender_email) : null;
    const senderName = senderUser ? senderUser.name : (rep.sender_email ? rep.sender_email.split('@')[0] : 'לומד');
    const isMe = rep.sender_email === currentUser.email;
    const fullTextSafe = cleanMsg.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const likeDisabled = isMe ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';

    const isSubscribed = senderUser && senderUser.subscription && senderUser.subscription.level > 0;
    const subIcon = isSubscribed ? `<i class="fas fa-crown" style="color:#d97706; font-size:0.7rem; margin-right:3px;" title="מנוי"></i>` : '';

    const div = document.createElement('div');
    div.id = 'thread-msg-' + rep.id;
    div.style.cssText = `background:${isMe ? '#eff6ff' : '#fff'}; padding:8px; margin-bottom:8px; border-radius:6px; border:1px solid #e2e8f0; position:relative;`;

    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:${isMe ? 'var(--primary)' : '#333'}; font-size:0.85rem;">${subIcon}${isMe ? 'אני' : senderName}</strong>
            <span style="font-size:0.7rem; color:#94a3b8;">${new Date(rep.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div style="font-size:0.9rem; margin-bottom:5px;">${cleanMsg}</div>
        
        <div class="msg-reactions" style="justify-content:flex-start; gap:10px; border-top:1px solid #f1f5f9; padding-top:4px;">
            <button class="reaction-btn" ${likeDisabled} onclick="toggleReaction('${rep.id}', 'like', this)"><i class="fas fa-thumbs-up"></i></button>
            <button class="reaction-btn" ${likeDisabled} onclick="toggleReaction('${rep.id}', 'dislike', this)"><i class="fas fa-thumbs-down"></i></button>
            
            <div class="msg-actions-menu" style="position:relative; display:inline-block;">
                <button class="reaction-btn" onclick="this.nextElementSibling.classList.toggle('active')"><i class="fas fa-ellipsis-v"></i></button>
                <div class="msg-menu-dropdown">
                    <div class="msg-menu-item" onclick="replyToMessage('${activeThreadChatId}', '${senderName}', '${fullTextSafe}'); closeThread();"><i class="fas fa-reply"></i> ציטוט</div>
                    ${!isMe ? `<div class="msg-menu-item" style="color:var(--danger);" onclick="openReportModal('${rep.sender_email}', 'public');"><i class="fas fa-flag"></i> דיווח</div>` : ''}
                </div>
            </div>
        </div>
    `;
    container.appendChild(div);
}

function closeThread() {
    document.getElementById('chat-thread-area').style.display = 'none';
    activeThreadId = null;
    if (window._activeThreadChannel) {
        window._activeThreadChannel.unsubscribe();
        window._activeThreadChannel = null;
    }
}

function _subscribeToThread(msgId) {
    if (window._activeThreadChannel) {
        window._activeThreadChannel.unsubscribe();
    }
    window._activeThreadChannel = supabaseClient.channel('thread-' + msgId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_public', filter: `parent_message_id=eq.${msgId}` }, (payload) => {
            const container = document.getElementById('thread-messages');
            if (!container || !payload.new) return;
            if (document.getElementById('thread-msg-' + payload.new.id)) return;
            const emptyMsg = container.querySelector('[style*="text-align:center"]');
            if (emptyMsg) emptyMsg.remove();
            appendThreadMessage(payload.new, container);
            container.scrollTop = container.scrollHeight;
            
            const threadBtn = document.querySelector(`#msg-${msgId} .thread-indicator-btn, [id="msg-${msgId}"] ~ .thread-indicator-btn`);
            if (threadBtn) {
                const match = threadBtn.textContent.match(/\d+/);
                const count = match ? parseInt(match[0]) + 1 : 1;
                threadBtn.innerHTML = `<span class="material-icons-round" style="font-size:0.8rem;vertical-align:middle;">forum</span> ${count} תגובות בשרשור`;
            }
        })
        .subscribe();
}

async function sendThreadMessage() {
    if (!requireAuth()) return;
    const input = document.getElementById('thread-input');
    const text = input.value;
    if (!text || !activeThreadId) return;

    const bookName = activeThreadChatId ? activeThreadChatId.replace('book:', '') : '';

    let finalContent = text;
    if (activeReply && activeReply.chatId === activeThreadChatId) {
        const safeReplyText = (activeReply.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        finalContent = `<div class="chat-quote" style="border-right:3px solid #94a3b8; padding:4px 8px; margin-bottom:6px; font-size:0.8rem; color:#64748b;"><strong>${activeReply.sender}:</strong> ${safeReplyText}</div>${text}`;
        cancelReply(activeThreadChatId);
    }

    try {
        const { data, error } = await supabaseClient
            .from('chat_public')
            .insert([{
                content: finalContent,
                book_name: bookName,
                user_id: currentUser.id,
                sender_email: currentUser.email,
                parent_message_id: activeThreadId,
            }])
            .select()
            .single();

        if (error) throw error;

        input.value = '';

        appendThreadMessage({
            id: data?.id || ('temp-' + Date.now()),
            sender_email: currentUser.email,
            content: finalContent,
            created_at: new Date().toISOString()
        }, document.getElementById('thread-messages'));

    } catch (e) {
        console.error("Error sending thread message:", e);
        await customAlert("שגיאה בשליחת התגובה: " + e.message);
    }
}

function toggleChatMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('chat-menu-dropdown');
    if (menu) {
        menu.classList.toggle('active');
    }
}

async function logVisit() {
    
    console.warn("logVisit disabled: table site_visits missing.");
}

async function logAdView() {
    
    console.warn("logAdView disabled: ad_stats table missing.");
}

async function logAdClick() {
    
    console.warn("logAdClick disabled: ad_stats table missing.");
}

function computeDafYomiToday() {
    const tractates = [
        { name: 'ברכות', pages: 63 }, { name: 'שבת', pages: 156 }, { name: 'עירובין', pages: 104 },
        { name: 'פסחים', pages: 120 }, { name: 'שקלים', pages: 21 }, { name: 'יומא', pages: 87 },
        { name: 'סוכה', pages: 55 }, { name: 'ביצה', pages: 39 }, { name: 'ראש השנה', pages: 34 },
        { name: 'תענית', pages: 30 }, { name: 'מגילה', pages: 31 }, { name: 'מועד קטן', pages: 28 },
        { name: 'חגיגה', pages: 26 }, { name: 'יבמות', pages: 121 }, { name: 'כתובות', pages: 111 },
        { name: 'נדרים', pages: 90 }, { name: 'נזיר', pages: 65 }, { name: 'סוטה', pages: 48 },
        { name: 'גיטין', pages: 89 }, { name: 'קידושין', pages: 81 }, { name: 'בבא קמא', pages: 118 },
        { name: 'בבא מציעא', pages: 118 }, { name: 'בבא בתרא', pages: 175 }, { name: 'סנהדרין', pages: 112 },
        { name: 'מכות', pages: 23 }, { name: 'שבועות', pages: 48 }, { name: 'עבודה זרה', pages: 75 },
        { name: 'הוריות', pages: 13 }, { name: 'זבחים', pages: 119 }, { name: 'מנחות', pages: 109 },
        { name: 'חולין', pages: 141 }, { name: 'בכורות', pages: 60 }, { name: 'ערכין', pages: 33 },
        { name: 'תמורה', pages: 33 }, { name: 'כריתות', pages: 27 }, { name: 'מעילה', pages: 21 },
        { name: 'תמיד', pages: 9 }, { name: 'נידה', pages: 72 }
    ];
    const cycleStart = new Date('2023-01-05T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cycleStart.setHours(0, 0, 0, 0);
    const total = tractates.reduce((s, t) => s + t.pages, 0);
    let dayInCycle = Math.floor((today - cycleStart) / 86400000);
    dayInCycle = ((dayInCycle % total) + total) % total;
    let remaining = dayInCycle;
    for (const t of tractates) {
        if (remaining < t.pages) {
            const dafNum = remaining + 2;
            const dafHeb = typeof toGematria === 'function' ? toGematria(dafNum) : dafNum;
            return `${t.name} ${dafHeb}.`;
        }
        remaining -= t.pages;
    }
    return null;
}

async function getDafYomi() {
    try {
        const res = await fetch('https://www.sefaria.org/api/calendars');
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        const data = await res.json();
        const items = data?.calendar_items || data?.calendars || [];
        const dafItem = items.find(item =>
            item?.title?.en === 'Daf Yomi' ||
            item?.title?.he?.includes('דף') ||
            item?.category === 'Talmud'
        );
        if (dafItem) {
            dafYomiToday =
                dafItem?.displayValue?.he ||
                dafItem?.display_value?.he ||
                dafItem?.heDisplayValue ||
                dafItem?.displayValue?.en ||
                dafItem?.display_value?.en ||
                null;
            const rawRef = dafItem?.url || dafItem?.sefaria_link || dafItem?.ref || '';
            if (rawRef) {
                const refPath = rawRef.startsWith('/') ? rawRef.slice(1) : rawRef;
                dafYomiTodayUrl = `https://www.sefaria.org.il/${refPath.replace(/ /g, '.')}`;
            }
        }
    } catch (e) { console.error("Could not fetch Daf Yomi", e); }
    if (!dafYomiToday) dafYomiToday = computeDafYomiToday();
    renderDafYomiBanner();
}

function renderDafYomiBanner() {
    const banner = document.getElementById('daf-yomi-banner');
    const skeleton = document.getElementById('daf-yomi-skeleton');
    const content = document.getElementById('daf-yomi-content');
    const textEl = document.getElementById('daf-yomi-text');
    const actionArea = document.getElementById('daf-yomi-action-area');
    if (!banner) return;

    const displayDaf = dafYomiToday || computeDafYomiToday();
    if (!displayDaf) {
        banner.style.display = 'none';
        if (typeof updateBannersRowLayout === 'function') updateBannersRowLayout();
        return;
    }

    const dafGoal = Array.isArray(userGoals) && userGoals.find(g => g.bookName === 'דף היומי' && g.status === 'active');

    if (textEl) {
        if (dafGoal) {
            textEl.innerHTML = `${displayDaf}<br><span style="font-size:0.75rem; opacity:0.8;">למדת ${dafGoal.currentUnit || 0} דפים במחזור זה</span>`;
        } else {
            textEl.innerHTML = displayDaf;
        }
    }

    if (skeleton) skeleton.style.display = 'none';
    if (content) content.style.display = 'flex';

    const todayKey = new Date().toISOString().slice(0, 10);
    const markedKey = `dafYomiMarked_${todayKey}`;
    if (actionArea) {
        if (!dafGoal) {
            actionArea.innerHTML = `<button onclick="joinCycle('daf-yomi')" style="background:#6366f1; color:#fff; border:none; border-radius:0.6rem; padding:0.45rem 1rem; font-size:0.85rem; font-weight:600; cursor:pointer; white-space:nowrap;">+ הצטרף לדף היומי</button>`;
        } else if (localStorage.getItem(markedKey)) {
            actionArea.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                <i class="fas fa-check-circle" style="font-size:1.3rem; color:#6366f1;"></i>
                <span style="font-size:0.75rem; font-weight:700; color:#4338ca;">כבר למדת היום!</span>
                <span style="font-size:0.7rem; color:#818cf8;">כל הכבוד!</span>
            </div>`;
        } else {
            actionArea.innerHTML = `<button id="daf-yomi-btn" onclick="markDafYomiLearned(this)" style="background:#6366f1; color:#fff; border:none; border-radius:0.6rem; padding:0.45rem 1rem; font-size:0.85rem; font-weight:600; cursor:pointer; white-space:nowrap;">✓ למדתי היום</button>`;
        }
    }
    if (typeof updateBannersRowLayout === 'function') updateBannersRowLayout();
}

async function markDafYomiLearned(btnEl) {
    if (!requireAuth()) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const markedKey = `dafYomiMarked_${todayKey}`;
    if (localStorage.getItem(markedKey)) return;

    const dafGoal = userGoals.find(g => g.bookName === 'דף היומי' && g.status === 'active');
    if (!dafGoal) {
        showToast("אינך רשום למסלול הדף היומי. הצטרף דרך הוספת לימוד!", "info");
        return;
    }

    await updateProgress(dafGoal.id, 1, btnEl);
    localStorage.setItem(markedKey, '1');
    const actionArea = document.getElementById('daf-yomi-action-area');
    if (actionArea) {
        actionArea.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
            <i class="fas fa-check-circle" style="font-size:1.3rem; color:#6366f1;"></i>
            <span style="font-size:0.75rem; font-weight:700; color:#4338ca;">כבר למדת היום!</span>
            <span style="font-size:0.7rem; color:#818cf8;">כל הכבוד!</span>
        </div>`;
    }
    showDafYomiToast(dafYomiToday || 'הדף היומי');
}

function showDafYomiToast(dafName) {
    let toast = document.getElementById('daf-yomi-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'daf-yomi-toast';
        toast.style.cssText = `
            position:fixed; bottom:1.5rem; left:1.5rem; z-index:9999;
            background:#166534; color:#fff; border-radius:0.75rem;
            padding:0.75rem 1.1rem; display:flex; align-items:center; gap:0.6rem;
            box-shadow:0 4px 20px rgba(0,0,0,0.25); font-size:0.9rem; font-weight:600;
            transform:translateY(120%); transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
            max-width:260px; direction:rtl;
        `;
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fas fa-check-circle" style="font-size:1.1rem; flex-shrink:0;"></i><span>כל הכבוד! למדת את <strong>${dafName}</strong> היום</span>`;
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.transform = 'translateY(120%)'; }, 4000);
}

function openDafYomiTracker() {
    const modal = document.getElementById('dafYomiTrackerModal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderDafYomiTrackerGrid();
}

function getCurrentDafYomiTractate() {
    const src = dafYomiToday || computeDafYomiToday() || '';
    const match = src.match(/^([^\dא-ת\s][^\d]*?)[\sא-ת]/);
    const trimmed = src.replace(/[\dא-ת.:]+\s*$/, '').trim();
    return trimmed || src.split(' ')[0] || '';
}

function renderDafYomiTrackerGrid() {
    const grid = document.getElementById('dafYomiTrackerGrid');
    const summaryEl = document.getElementById('dafYomiTrackerSummary');
    const totalBar = document.getElementById('dafYomiTotalBar');
    if (!grid) return;

    const bavliBooks = (typeof BOOKS_DB !== 'undefined')
        ? BOOKS_DB.filter(b => b.category === 'תלמוד בבלי')
        : [];

    const totalDafim = bavliBooks.reduce((s, b) => s + Math.floor(b.units / 2), 0);
    let learnedTotal = 0;

    const currentTractate = getCurrentDafYomiTractate();

    let html = '';
    bavliBooks.forEach(book => {
        const maxDafim = Math.floor(book.units / 2);
        const key = `dafYomiTracker_${book.name}`;

        const personalGoal = Array.isArray(userGoals)
            ? userGoals.find(g => g.bookName === book.name && (g.status === 'active' || g.status === 'completed'))
            : null;

        let learned, isSynced;
        if (personalGoal) {
            learned = Math.min(Math.floor(personalGoal.currentUnit / 2), maxDafim);
            isSynced = true;
        } else {
            learned = Math.min(parseInt(localStorage.getItem(key) || '0'), maxDafim);
            isSynced = false;
        }

        learnedTotal += learned;
        const pct = maxDafim > 0 ? Math.round((learned / maxDafim) * 100) : 0;
        const isDone = learned >= maxDafim;
        const isCurrent = !isDone && currentTractate && book.name.includes(currentTractate);
        const bgColor = isDone ? '#f0fdf4' : isCurrent ? '#fffbeb' : 'var(--card-bg)';
        const borderColor = isDone ? '#22c55e' : isCurrent ? '#f59e0b' : 'var(--border-color)';
        html += `
        <div style="background:${bgColor}; border:1px solid ${borderColor}; border-radius:0.75rem; padding:0.6rem 0.75rem; ${isCurrent ? 'box-shadow:0 0 0 2px #fde68a;' : ''}">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                <div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">${book.name}${isCurrent ? ' 📖' : ''}</div>
                ${isDone ? `<span style="font-size:0.62rem; color:#16a34a; background:#dcfce7; border-radius:4px; padding:1px 5px; white-space:nowrap;">✓ סיום</span>` : isCurrent ? `<span style="font-size:0.62rem; color:#b45309; background:#fef3c7; border-radius:4px; padding:1px 5px; white-space:nowrap;">נלמד כעת</span>` : isSynced ? `<span title="מסונכרן עם הספרים שלך" style="font-size:0.62rem; color:#6366f1; background:#eef2ff; border-radius:4px; padding:1px 5px; white-space:nowrap;">🔗 מסונכרן</span>` : ''}
            </div>
            <div style="font-size:0.7rem; color:#64748b; margin-bottom:6px;">${learned} / ${maxDafim} דפים</div>
            <div style="background:var(--border-color); border-radius:4px; height:4px; margin-bottom:6px;">
                <div style="height:100%; background:#22c55e; border-radius:4px; width:${pct}%; transition:width 0.2s;"></div>
            </div>
            ${isSynced
                ? `<div style="font-size:0.65rem; color:#6366f1; text-align:center; padding-top:2px;">מתעדכן מהספרים שלך</div>`
                : `<div style="display:flex; align-items:center; gap:4px; justify-content:center;">
                    <button onclick="adjustDafYomiTracker('${book.name}',${maxDafim},-1)" style="width:22px; height:22px; border:1px solid var(--border-color); background:var(--card-bg); border-radius:4px; cursor:pointer; font-size:0.9rem; display:flex; align-items:center; justify-content:center;">−</button>
                    <input type="number" id="dafTrack_${book.name}" value="${learned}" min="0" max="${maxDafim}"
                        onchange="setDafYomiTracker('${book.name}',${maxDafim},this.value)"
                        style="width:44px; text-align:center; border:1px solid var(--border-color); border-radius:4px; padding:2px 4px; font-size:0.8rem; background:var(--card-bg); color:var(--text-main);">
                    <button onclick="adjustDafYomiTracker('${book.name}',${maxDafim},1)" style="width:22px; height:22px; border:1px solid var(--border-color); background:var(--card-bg); border-radius:4px; cursor:pointer; font-size:0.9rem; display:flex; align-items:center; justify-content:center;">+</button>
                </div>`
            }
        </div>`;
    });

    grid.innerHTML = html;

    const completedCount = bavliBooks.filter(book => {
        const maxDafim = Math.floor(book.units / 2);
        const personalGoal = Array.isArray(userGoals)
            ? userGoals.find(g => g.bookName === book.name && (g.status === 'active' || g.status === 'completed'))
            : null;
        const learned = personalGoal
            ? Math.min(Math.floor(personalGoal.currentUnit / 2), maxDafim)
            : Math.min(parseInt(localStorage.getItem(`dafYomiTracker_${book.name}`) || '0'), maxDafim);
        return learned >= maxDafim;
    }).length;

    const overallPct = totalDafim > 0 ? Math.round((learnedTotal / totalDafim) * 100) : 0;
    const siyumimText = completedCount > 0 ? ` · ${completedCount} סיומי מסכת` : '';
    if (summaryEl) summaryEl.textContent = `${learnedTotal.toLocaleString()} / ${totalDafim.toLocaleString()} דפים (${overallPct}%)${siyumimText}`;
    if (totalBar) totalBar.style.width = overallPct + '%';
}

function adjustDafYomiTracker(name, max, delta) {
    const key = `dafYomiTracker_${name}`;
    const current = Math.min(parseInt(localStorage.getItem(key) || '0'), max);
    const newVal = Math.max(0, Math.min(max, current + delta));
    localStorage.setItem(key, newVal.toString());
    const input = document.getElementById(`dafTrack_${name}`);
    if (input) input.value = newVal;
    renderDafYomiTrackerGrid();
}

function setDafYomiTracker(name, max, val) {
    const newVal = Math.max(0, Math.min(max, parseInt(val) || 0));
    localStorage.setItem(`dafYomiTracker_${name}`, newVal.toString());
    renderDafYomiTrackerGrid();
}

function renderCommunity() {
    loadAds();

    const ctx = document.getElementById('userStatsChart');
    if (ctx) {
        const active = userGoals.filter(g => g.status === 'active').length;
        const completed = userGoals.filter(g => g.status === 'completed').length;
        const totalPages = userGoals.reduce((sum, g) => sum + g.currentUnit, 0);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['פעיל', 'הושלם'],
                datasets: [{
                    data: [active, completed],
                    backgroundColor: ['#3b82f6', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: `סה"כ דפים: ${totalPages}` }
                }
            }
        });
    }
}

function getHebrewActionName(url) {
    if (!url) return 'פעולה לא ידועה';
    if (url.includes('users') && !url.includes('last_seen')) return 'טעינת משתמשים';
    if (url.includes('user_goals')) return 'סנכרון לימודים';
    if (url.includes('chat_messages')) return 'הודעות צ\'אט';
    if (url.includes('chavruta_requests')) return 'בקשות חברותא';
    if (url.includes('schedules')) return 'לוח זמנים';
    if (url.includes('user_reports')) return 'דיווחים';
    return 'תקשורת שרת';
}

function visualizeNetworkActivity(type, details) {
    if (!window.isNetworkMonitorActive) return;

    const log = document.getElementById('networkLog');
    if (!log) return;

    const { action, from, to, isBoring, status } = details;

    if (isBoring && !isVerboseNetworkLog) {
        return;
    }

    if (action === 'sendMessage') {
        drawNetworkLine(from, 'cloud', '#60a5fa');
        setTimeout(() => {
            drawNetworkLine('cloud', to, '#4ade80');
        }, 400);
    } else {

        if (type === 'request') {
            drawNetworkLine(from, 'cloud', '#60a5fa');
        } else if (type === 'response') {
            drawNetworkLine('cloud', from, status >= 400 ? '#f87171' : '#4ade80');
        }
    }

    const entry = document.createElement('div');
    entry.style.marginBottom = '4px';
    entry.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    entry.style.paddingBottom = '2px';

    const time = new Date().toLocaleTimeString().split(' ')[0];
    let icon = type === 'request' ? '⬆️' : '⬇️';
    let color = type === 'request' ? '#60a5fa' : (type === 'error' ? '#f87171' : '#4ade80');
    if (status >= 400) color = '#f87171';

    const typeLabel = type === 'request' ? 'בקשה' : (status >= 400 ? 'שגיאה' : 'תגובה');

    let fromName = globalUsersData.find(u => u.email === from)?.name || from;
    let toName = globalUsersData.find(u => u.email === to)?.name || to;

    let description = `${action}`;
    if (from && to) {
        description += ` מ-${fromName} ל-${toName}`;
    } else if (from) {
        description += ` מ-${fromName}`;
    }

    entry.innerHTML = `<span style="color:#64748b">[${time}]</span> <span style="color:${color}">${icon} ${typeLabel}</span>: ${description} ${status ? `(${status})` : ''}`;

    log.insertBefore(entry, log.firstChild);
    if (log.children.length > 30) log.lastChild.remove();
}

document.addEventListener('mousedown', (e) => {
    const win = e.target.closest('.chat-window, .modal-content, .auth-box, .modal-overlay');
    if (win) {

        if (win.classList.contains('modal-overlay')) {
            bringToFront(win);
        } else if (win.classList.contains('chat-window')) {
            bringToFront(win);
        } else {
            const overlay = win.closest('.modal-overlay');
            if (overlay) bringToFront(overlay);
        }
    }
});

document.addEventListener('click', (e) => {
    const clickedMsgWrapper = e.target.closest('.msg-actions-menu');
    document.querySelectorAll('.msg-menu-dropdown.active').forEach(dropdown => {
        if (!clickedMsgWrapper || !clickedMsgWrapper.contains(dropdown)) {
            dropdown.classList.remove('active');
        }
    });

    const clickedChatWrapper = e.target.closest('.chat-action-menu-container');
    document.querySelectorAll('.chat-action-dropdown:not(.hidden)').forEach(dropdown => {
        if (!clickedChatWrapper || !clickedChatWrapper.contains(dropdown)) {
            dropdown.classList.add('hidden');
        }
    });
});

window.onload = async function () {
    setTimeout(() => {
        const splash = document.getElementById('app-splash');
        if (splash && splash.style.opacity !== '0' && splash.style.display !== 'none') {
            splash.style.transition = 'opacity 0.5s';
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; }, 500);
        }
    }, 600);

    try {
        await init();
    } catch (e) {
        console.error("שגיאת אתחול:", e);
        
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'none';
        const gloFallback = document.getElementById('google-loading-overlay');
        if (gloFallback) gloFallback.style.display = 'none';
        if (!currentUser && typeof setupGuestHeader === 'function') setupGuestHeader();
        if (typeof startBackgroundServices === 'function') startBackgroundServices();
    }

    if (currentUser) {
        renderGoals();
        loadAds();
    }
};

function getRatingRankName(rating) {
    if (rating >= 50000) return "עוקר הרים ומשברם וטוחנן דק דק";
    if (rating >= 10000) return "עוקר הרים";
    if (rating >= 5000) return "רשכבה\"ג";
    if (rating >= 3500) return "אב בי\"ד";
    if (rating >= 1800) return "דיין מומחה";
    if (rating >= 1000) return "דיין";
    if (rating >= 750) return "רב עיר";
    if (rating >= 500) return "רב שכונה";
    if (rating >= 300) return "מו\"צ";
    if (rating >= 150) return "רב";
    if (rating >= 50) return "אברך";
    return "מתחיל";
}

function showAchievements() {
    const totalLearned = userGoals.reduce((sum, g) => sum + g.currentUnit, 0);
    const currentRank = getRankName(totalLearned);

    let nextRank = "", nextThreshold = 0;
    if (totalLearned < 101) { nextRank = "מתמיד"; nextThreshold = 101; }
    else if (totalLearned < 501) { nextRank = "צורבא מרבנן"; nextThreshold = 501; }
    else if (totalLearned < 1001) { nextRank = "תלמיד חכם"; nextThreshold = 1001; }
    else { nextRank = "מאור הדור"; nextThreshold = totalLearned; }

    const remaining = Math.max(0, nextThreshold - totalLearned);
    const rating = parseInt(localStorage.getItem('torahApp_rating') || '0') || (currentUser ? currentUser.chat_rating || 0 : 0);

    const ratingRank = getRatingRankName(rating);
    const ratingThresholds = [50, 150, 300, 500, 750, 1000, 1800, 3500, 5000, 10000, 50000];
    let nextRatingThreshold = 50000;
    let nextRatingRankName = "";

    for (let t of ratingThresholds) {
        if (rating < t) {
            nextRatingThreshold = t;
            nextRatingRankName = getRatingRankName(t);
            break;
        }
    }
    const ratingRemaining = Math.max(0, nextRatingThreshold - rating);
    const ratingProgress = rating >= 50000 ? 100 : (rating / nextRatingThreshold) * 100;

    const content = `
        <h3 style="text-align:center; color:var(--accent);">ההישגים שלי</h3>
        <div style="margin:20px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <strong>דרגה: ${currentRank}</strong>
                <span>${totalLearned} דפים</span>
            </div>
            <div class="progress-container" style="height:15px; background:#e2e8f0;">
                <div class="progress-bar" style="width:${Math.min(100, (totalLearned / nextThreshold) * 100)}%;"></div>
            </div>
            <div style="text-align:center; font-size:0.9rem; color:#64748b; margin-top:5px;">
                ${remaining > 0 ? `עוד ${remaining} דפים לדרגת <strong>${nextRank}</strong>` : 'הגעת לפסגה!'}
            </div>
        </div>
        
        <div style="margin:20px 0; border-top:1px solid #eee; padding-top:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <strong>רייטינג: ${ratingRank}</strong>
                <span>${rating} נקודות</span>
            </div>
            <div class="progress-container" style="height:15px; background:#e2e8f0;">
                <div class="progress-bar" style="width:${ratingProgress}%; background: linear-gradient(90deg, #ec4899, #8b5cf6);"></div>
            </div>
            <div style="text-align:center; font-size:0.9rem; color:#64748b; margin-top:5px;">
                ${rating < 50000 ? `עוד ${ratingRemaining} נקודות לדרגת <strong>${nextRatingRankName}</strong>` : 'הגעת לפסגת הרייטינג!'}
            </div>
        </div>
        
        <button class="btn" onclick="closeModal()">סגור</button>
    `;

    let modal = document.getElementById('achievementsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'achievementsModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `<div class="modal-content" id="achievementsContent"></div>`;
        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }
    document.getElementById('achievementsContent').innerHTML = content;
    modal.style.display = 'flex';
    bringToFront(modal);
}

async function showRatingBreakdown() {
    if (!currentUser) return;
    const rating = currentUser.chat_rating || parseInt(localStorage.getItem('torahApp_rating') || '0') || 0;

    let modal = document.getElementById('ratingBreakdownModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ratingBreakdownModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.55);align-items:center;justify-content:center;';
        modal.innerHTML = `<div style="background:var(--card-bg,#fff);border-radius:1.5rem;padding:2rem;max-width:480px;width:calc(100% - 2rem);max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);" onclick="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
                <h3 style="margin:0;font-size:1.2rem;font-weight:800;color:var(--text-main);">פירוט הרייטינג שלי</h3>
                <button onclick="document.getElementById('ratingBreakdownModal').style.display='none'" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;">×</button>
            </div>
            <div id="rating-breakdown-content" style="display:flex;flex-direction:column;gap:0.75rem;">
                <div style="text-align:center;padding:1rem;color:#94a3b8;">טוען...</div>
            </div>
        </div>`;
        modal.onclick = () => { modal.style.display = 'none'; };
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    bringToFront(modal);

    const content = document.getElementById('rating-breakdown-content');
    try {
        
        const [{ count: likeCount }, { count: followerCount }, { data: logRows }] = await Promise.all([
            supabaseClient.from('message_reactions').select('*', { count: 'exact', head: true })
                .eq('reaction_type', 'like')
                .in('message_id',
                    (await supabaseClient.from('chat_public').select('id').eq('user_id', currentUser.id)).data?.map(m => m.id) || ['-']
                ),
            supabaseClient.from('user_followers').select('*', { count: 'exact', head: true })
                .eq('following_id', currentUser.id),
            supabaseClient.from('rating_log').select('source, points, created_at')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20)
        ]);

        const likePoints = (likeCount || 0) * 5;
        const followerPoints = (followerCount || 0) * 25;

        const rows = [
            { icon: '👍', label: 'לייקים על הודעות', count: likeCount || 0, pts: likePoints, unit: '× 5' },
            { icon: '👥', label: 'עוקבים', count: followerCount || 0, pts: followerPoints, unit: '× 25' },
        ];

        const ratingRank = getRatingRankName(rating);
        content.innerHTML = `
            <div style="background:linear-gradient(135deg,#ca8a04,#d97706);border-radius:1rem;padding:1rem 1.25rem;color:#fff;display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                <div><div style="font-size:0.75rem;opacity:0.85;">סה"כ רייטינג</div><div style="font-size:2rem;font-weight:900;">${rating.toLocaleString()}</div></div>
                <div style="text-align:center;"><div style="font-size:0.7rem;opacity:0.8;">דרגה</div><div style="font-size:1rem;font-weight:700;">${ratingRank}</div></div>
            </div>
            ${rows.map(r => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:var(--border-color,#f1f5f9);border-radius:0.75rem;padding:0.75rem 1rem;">
                <div style="display:flex;align-items:center;gap:0.6rem;">
                    <span style="font-size:1.4rem;">${r.icon}</span>
                    <div><div style="font-weight:600;font-size:0.9rem;color:var(--text-main);">${r.label}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;">${r.count.toLocaleString()} ${r.unit} נקודות</div></div>
                </div>
                <span style="font-size:1.1rem;font-weight:800;color:#ca8a04;">+${r.pts.toLocaleString()}</span>
            </div>`).join('')}
            ${(logRows && logRows.length > 0) ? `
            <details style="margin-top:0.5rem;">
                <summary style="cursor:pointer;font-size:0.85rem;color:#94a3b8;padding:0.25rem 0;">היסטוריית פעילות אחרונה</summary>
                <div style="margin-top:0.5rem;display:flex;flex-direction:column;gap:0.4rem;max-height:180px;overflow-y:auto;">
                    ${(logRows || []).map(l => `<div style="display:flex;justify-content:space-between;font-size:0.8rem;padding:0.35rem 0.6rem;background:var(--border-color,#f1f5f9);border-radius:0.5rem;"><span>${l.source}</span><span style="color:#ca8a04;font-weight:700;">+${l.points}</span></div>`).join('')}
                </div>
            </details>` : ''}
            <button onclick="document.getElementById('ratingBreakdownModal').style.display='none'" style="margin-top:0.5rem;width:100%;padding:0.75rem;background:var(--accent,#ca8a04);color:#fff;border:none;border-radius:0.75rem;font-weight:700;cursor:pointer;">סגור</button>
        `;
    } catch (e) {
        content.innerHTML = `<p style="color:#ef4444;">שגיאה בטעינת הנתונים</p>`;
    }
}

function openMyProfileDashboard() {
    if (!requireAuth()) return;
    switchScreen('my-profile');
}

// ===== מסך ניהול שיעורים (מגיד שיעור) =====
async function loadMyShiurimScreen() {
    if (!currentUser) return;
    loadShiurAnnouncementHistory();
    loadShiurSchedule();
}

async function sendShiurAnnouncement() {
    if (!requireAuth()) return;
    const text = document.getElementById('shiurAnnouncementText')?.value?.trim();
    if (!text) { showToast('הכנס טקסט להודעה', 'error'); return; }
    const { error } = await supabaseClient.from('notifications').insert({
        user_id: null,
        type: 'shiur_update',
        title: `עדכון שיעור מ-${currentUser.display_name || 'מגיד שיעור'}`,
        content: text,
        target_type: 'all',
        created_by: currentUser.id
    });
    if (!error) {
        showToast('ההודעה נשלחה לכל המנויים!', 'success');
        document.getElementById('shiurAnnouncementText').value = '';
        loadShiurAnnouncementHistory();
    } else showToast('שגיאה: ' + error.message, 'error');
}

async function sendShiurLinkAnnouncement() {
    showToast('שיחות וידאו אינן זמינות כעת — בקרוב!', 'info');
}

function copyShiurLink() {
    showToast('שיחות וידאו אינן זמינות כעת — בקרוב!', 'info');
}

function startNewShiurFromManage() {
    showToast('שיחות וידאו אינן זמינות כעת — בקרוב!', 'info');
}

async function loadShiurAnnouncementHistory() {
    const el = document.getElementById('shiurAnnouncementHistory');
    if (!el || !currentUser) return;
    const { data } = await supabaseClient
        .from('notifications')
        .select('title, content, created_at')
        .eq('created_by', currentUser.id)
        .in('type', ['shiur_update', 'shiur_link'])
        .order('created_at', { ascending: false })
        .limit(10);
    if (!data?.length) { el.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">אין הודעות עדיין</p>'; return; }
    el.innerHTML = data.map(n => `
        <div class="flex gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div class="flex-1 min-w-0">
                <div class="font-bold text-xs text-slate-800 dark:text-white mb-0.5">${n.title || ''}</div>
                <div class="text-sm text-slate-500 dark:text-slate-400 break-words">${n.content || ''}</div>
            </div>
            <div class="text-xs text-slate-400 whitespace-nowrap">${new Date(n.created_at).toLocaleDateString('he-IL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
        </div>`).join('');
}

let shiurScheduleEntries = [];

function loadShiurSchedule() {
    try {
        shiurScheduleEntries = JSON.parse(localStorage.getItem(`torahApp_shiur_schedule_${currentUser?.id}`) || '[]');
    } catch(e) { shiurScheduleEntries = []; }
    renderShiurSchedule();
}

function renderShiurSchedule() {
    const el = document.getElementById('shiurScheduleList');
    if (!el) return;
    if (!shiurScheduleEntries.length) { el.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">לא קבעת שיעורים עדיין</p>'; return; }
    el.innerHTML = shiurScheduleEntries.map((s, i) => `
        <div class="flex items-center gap-3 py-2 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
            <div class="flex-1 min-w-0">
                <div class="font-bold text-sm text-slate-800 dark:text-white">${s.topic || '—'}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${s.date || ''} ${s.time ? '· ' + s.time : ''}</div>
            </div>
            <button onclick="deleteShiurScheduleEntry(${i})" class="text-slate-400 hover:text-red-500 transition-colors"><i class="fas fa-times"></i></button>
        </div>`).join('');
}

function addShiurScheduleEntry() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:flex;z-index:5000;';
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl w-full max-w-sm">
            <h3 class="font-black text-xl mb-4 text-slate-900 dark:text-white">הוספת שיעור ללוח</h3>
            <div class="space-y-3 mb-4">
                <div><label class="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">נושא השיעור</label>
                    <input id="new-shiur-topic" type="text" placeholder="למשל: מסכת ברכות דף ב'" dir="rtl" class="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-400"></div>
                <div><label class="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">תאריך</label>
                    <input id="new-shiur-date" type="date" class="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-400"></div>
                <div><label class="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">שעה</label>
                    <input id="new-shiur-time" type="time" class="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-400"></div>
            </div>
            <div class="flex gap-2">
                <button onclick="this.closest('.modal-overlay').remove()" class="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:opacity-80">ביטול</button>
                <button onclick="saveNewShiurEntry(this)" class="flex-1 py-2 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600">הוסף</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function saveNewShiurEntry(btn) {
    const topic = document.getElementById('new-shiur-topic')?.value?.trim();
    const date = document.getElementById('new-shiur-date')?.value;
    const time = document.getElementById('new-shiur-time')?.value;
    if (!topic) { showToast('הכנס נושא לשיעור', 'error'); return; }
    shiurScheduleEntries.unshift({ topic, date, time });
    localStorage.setItem(`torahApp_shiur_schedule_${currentUser?.id}`, JSON.stringify(shiurScheduleEntries));
    btn.closest('.modal-overlay').remove();
    renderShiurSchedule();
    showToast('שיעור נוסף ללוח!', 'success');
}

function deleteShiurScheduleEntry(index) {
    shiurScheduleEntries.splice(index, 1);
    localStorage.setItem(`torahApp_shiur_schedule_${currentUser?.id}`, JSON.stringify(shiurScheduleEntries));
    renderShiurSchedule();
}

async function loadMyProfileScreen() {
    if (!currentUser) return;

    const nameEl    = document.getElementById('myProfileName');
    const detailsEl = document.getElementById('myProfileDetails');
    const statsEl   = document.getElementById('myProfileStats');
    const badgesEl  = document.getElementById('myProfileBadges');
    const avatarEl  = document.getElementById('myProfileAvatar');
    const msgsEl    = document.getElementById('myProfileMessages');

    if (nameEl) nameEl.textContent = currentUser.isAnonymous ? 'אנונימי' : (currentUser.displayName || 'לומד');

    const myGlobalData = globalUsersData.find(u => u.email === currentUser.email);

    if (avatarEl && myGlobalData?.avatar_url) {
        avatarEl.innerHTML = `<img src="${myGlobalData.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'">`;
    }

    if (badgesEl && myGlobalData) badgesEl.innerHTML = getFullUserBadges(myGlobalData);

    const details = [];
    if (currentUser.city) details.push(`<i class="fas fa-map-marker-alt" style="margin-left:4px;"></i>${currentUser.city}`);
    if (currentUser.age)  details.push(`<i class="fas fa-calendar-alt"  style="margin-left:4px;"></i>${currentUser.age} שנים`);
    if (detailsEl) detailsEl.innerHTML = details.join(' &nbsp;·&nbsp; ');

    const myScore      = userGoals.reduce((s, g) => s + g.currentUnit, 0);
    const myActive     = userGoals.filter(g => g.status === 'active').length;
    const rewardPts    = currentUser.reward_points || myGlobalData?.reward_points || 0;
    const streak       = parseInt(localStorage.getItem('torahApp_streak_count') || '0');

    if (statsEl) statsEl.innerHTML = [
        { val: myScore,   label: 'דפים לומדים',    color: 'var(--accent)' },
        { val: rewardPts, label: 'זוזים',           color: 'var(--accent)' },
        { val: streak,    label: 'רצף יומי',        color: '#ef4444' },
        { val: myActive,  label: 'לימודים פעילים', color: 'var(--text-main)' },
    ].map(s => `
        <div style="flex:1;min-width:90px;text-align:center;background:var(--bg);border-radius:0.75rem;padding:0.65rem 0.5rem;">
            <p style="font-size:1.2rem;font-weight:800;color:${s.color};margin:0;">${s.val}</p>
            <p style="font-size:0.7rem;color:var(--text-muted,#64748b);margin:0;">${s.label}</p>
        </div>`).join('');

    if (!msgsEl) return;
    msgsEl.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-muted,#64748b);"><i class="fas fa-spinner fa-spin"></i> טוען הודעות...</div>`;
    try {
        const { data: msgs } = await supabaseClient
            .from('chat_public')
            .select('content, created_at, book_name')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(25);

        if (!msgs || msgs.length === 0) {
            msgsEl.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-muted,#64748b);">לא נמצאו הודעות בצ'אטים הציבוריים</div>`;
            return;
        }
        msgsEl.innerHTML = msgs.map(m => {
            const tmpDiv = document.createElement('div');
            tmpDiv.innerHTML = m.content || '';
            tmpDiv.querySelectorAll('.chat-quote, blockquote, .reply-quote').forEach(el => el.remove());
            const txt  = tmpDiv.textContent.trim() || '(ריק)';
            const date = m.created_at ? new Date(m.created_at).toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
            const book = m.book_name || "צ'אט כללי";
            return `<div style="padding:0.65rem 0;border-bottom:1px solid var(--border-color,#e2e8f0);display:flex;flex-direction:column;gap:0.2rem;">
                <p style="margin:0;font-size:0.9rem;color:var(--text-main);">${txt.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
                <span style="font-size:0.72rem;color:var(--text-muted,#64748b);">${book} · ${date}</span>
            </div>`;
        }).join('');
    } catch(e) {
        if (msgsEl) msgsEl.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-muted,#64748b);">שגיאה בטעינת ההודעות</div>`;
    }
}

function sendFriendInvite() {
    const emailInput = document.getElementById('inviteFriendEmail');
    const friendEmail = emailInput ? emailInput.value.trim() : '';
    if (!friendEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(friendEmail)) {
        showToast('יש להזין אימייל תקין', 'error');
        return;
    }
    const senderName = currentUser?.display_name || currentUser?.email || 'חבר';
    const siteUrl = window.location.origin + window.location.pathname;
    const subject = encodeURIComponent(`${senderName} מזמין אותך לבוא לבית המדרש`);
    const body = encodeURIComponent(`שלום,\n\n${senderName} מזמין אותך לבוא לבית המדרש הדיגיטלי – פורטל לימוד מתקדם למעקב לימוד יומי, מציאת חברותות ועוד.\n\nלחץ כאן כדי להצטרף:\n${siteUrl}\n\nבהצלחה!`);
    window.location.href = `mailto:${friendEmail}?subject=${subject}&body=${body}`;
    if (emailInput) emailInput.value = '';
}

function copyProfileShareLink() {
    if (!currentUser || !currentUser.id) {
        showToast("יש להתחבר תחילה", "error");
        return;
    }
    const link = window.location.origin + window.location.pathname + '?user=' + currentUser.id;
    navigator.clipboard.writeText(link).then(() => {
        showToast("הקישור הועתק ללוח!", "success");
    }).catch(() => {
        customAlert("קישור לשיתוף:\n" + link);
    });
}

async function showReferralModal() {
    if (!requireAuth()) return;

    let modal = document.getElementById('referralModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'referralModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.55);align-items:center;justify-content:center;';
        modal.innerHTML = `<div style="background:var(--card-bg,#fff);border-radius:1.5rem;padding:2rem;max-width:460px;width:calc(100% - 2rem);box-shadow:0 20px 60px rgba(0,0,0,0.3);direction:rtl;" onclick="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
                <h3 style="margin:0;font-size:1.2rem;font-weight:800;color:var(--text-main);">חבר מביא חבר</h3>
                <button onclick="document.getElementById('referralModal').style.display='none'" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#94a3b8;">×</button>
            </div>
            <div id="referral-modal-content"><div style="text-align:center;color:#94a3b8;padding:1rem;">טוען...</div></div>
        </div>`;
        modal.onclick = () => { modal.style.display = 'none'; };
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    bringToFront(modal);

    const content = document.getElementById('referral-modal-content');
    try {
        
        let { data: codeRow } = await supabaseClient
            .from('referral_codes')
            .select('code')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (!codeRow) {
            const { data: created } = await supabaseClient
                .from('referral_codes')
                .insert({ user_id: currentUser.id })
                .select('code')
                .single();
            codeRow = created;
        }

        const code = codeRow?.code || '—';
        const referralUrl = `${window.location.origin}${window.location.pathname}?ref=${code}`;

const { data: referrals } = await supabaseClient
            .from('referrals')
            .select('id, created_at')
            .eq('referrer_id', currentUser.id)
            .order('created_at', { ascending: false });

        const count = referrals?.length || 0;
        const totalEarned = count * 30;

        content.innerHTML = `
            <div style="background:linear-gradient(135deg,#f59e0b20,#fef3c7);border-radius:1rem;padding:1rem 1.25rem;margin-bottom:1rem;border:1px solid #fcd34d;">
                <div style="font-size:0.8rem;color:#92400e;font-weight:600;margin-bottom:0.25rem;">הקוד שלך</div>
                <div style="font-size:1.4rem;font-weight:900;color:#d97706;letter-spacing:0.1em;">${code}</div>
            </div>
            <div style="background:var(--border-color,#f1f5f9);border-radius:1rem;padding:0.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;">
                <span style="font-size:0.8rem;color:#64748b;word-break:break-all;flex:1;">${referralUrl}</span>
                <button onclick="navigator.clipboard.writeText('${referralUrl}'); showToast('קישור הועתק!','success');" style="background:#f59e0b;color:#fff;border:none;border-radius:0.5rem;padding:0.4rem 0.75rem;font-weight:700;cursor:pointer;white-space:nowrap;font-size:0.8rem;">📋 העתק</button>
            </div>
            <div style="display:flex;gap:0.75rem;margin-bottom:1rem;">
                <div style="flex:1;background:var(--border-color,#f1f5f9);border-radius:0.875rem;padding:0.875rem;text-align:center;">
                    <div style="font-size:1.5rem;font-weight:900;color:#f59e0b;">${count}</div>
                    <div style="font-size:0.75rem;color:#64748b;">חברים הצטרפו</div>
                </div>
                <div style="flex:1;background:var(--border-color,#f1f5f9);border-radius:0.875rem;padding:0.875rem;text-align:center;">
                    <div style="font-size:1.5rem;font-weight:900;color:#10b981;">+${totalEarned}</div>
                    <div style="font-size:0.75rem;color:#64748b;">זוזים שהרווחת</div>
                </div>
            </div>
            <div style="font-size:0.8rem;color:#64748b;line-height:1.6;background:var(--border-color,#f1f5f9);border-radius:0.75rem;padding:0.75rem 1rem;">
                <strong>איך זה עובד?</strong><br>
                • החבר שמצטרף מקבל 10 זוזים<br>
                • אתה מקבל 30 זוזים על כל חבר שמצטרף
            </div>
            <button onclick="document.getElementById('referralModal').style.display='none'" style="margin-top:1rem;width:100%;padding:0.75rem;background:#f59e0b;color:#fff;border:none;border-radius:0.75rem;font-weight:700;cursor:pointer;">סגור</button>
        `;
    } catch(e) {
        content.innerHTML = `<p style="color:#ef4444;">שגיאה בטעינת הנתונים</p>`;
    }
}

async function handleReferralOnSignup(newUserId) {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (!ref || !newUserId) return;
    try {
        const { data: codeRow } = await supabaseClient
            .from('referral_codes')
            .select('user_id')
            .eq('code', ref)
            .maybeSingle();
        if (!codeRow || codeRow.user_id === newUserId) return;

        const referrerId = codeRow.user_id;

const { data: existing } = await supabaseClient
            .from('referrals')
            .select('id')
            .eq('referred_id', newUserId)
            .maybeSingle();
        if (existing) return;

const { count: prevCount } = await supabaseClient
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', referrerId);

        const referrerBonus = 30;
        const referredBonus = 10;

        await supabaseClient.from('referrals').insert({
            referrer_id: referrerId,
            referred_id: newUserId,
            zuzim_given: referrerBonus
        });

await addRewardPointsDB(referrerId, referrerBonus);
        await addRewardPointsDB(newUserId, referredBonus);

supabaseClient.from('rating_log').insert([
            { user_id: referrerId, source: 'referral_bonus', points: referrerBonus, ref_id: newUserId },
            { user_id: newUserId, source: 'referral_welcome', points: referredBonus, ref_id: referrerId }
        ]).then(() => {}).catch(() => {});

        showToast(`קיבלת ${referredBonus} זוזים בגלל הקישור של חבר!`, 'success');
    } catch(e) { console.warn('Referral processing error:', e); }
}


function toHebrewDateString(dateString) {
    if (!dateString) return 'תאריך לא ידוע';
    try {
        const date = new Date(dateString);
        const day = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric' }).format(date);
        const month = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long' }).format(date);
        const year = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { year: 'numeric' }).format(date);

        const hebrewDay = toGematria(parseInt(day));

        let hebrewYear = year;
        const yearNum = parseInt(year.replace(/\D/g, ''));
        if (!isNaN(yearNum) && yearNum > 0) {
            hebrewYear = toGematria(yearNum % 1000);
        } else {
            const parts = year.split("'");
            if (parts.length > 1) hebrewYear = parts[1];
        }

        return `${hebrewDay} ${month} ${hebrewYear}`;
    } catch (e) {
        return 'תאריך לא תקין';
    }
}

function updateHebrewTodayDate() {
    const el = document.getElementById('hebrew-today-date');
    if (!el) return;
    try {
        const now = new Date();
        const dayNames = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
        const dayOfWeek = dayNames[now.getDay()];
        const hebrewDate = toHebrewDateString(now.toISOString());
        el.textContent = `יום ${dayOfWeek}, ${hebrewDate}`;
    } catch(e) {
        el.textContent = '';
    }
}

function showCompletions() {
    const modal = document.getElementById('completionsModal');
    const list = document.getElementById('completionsList');
    if (!modal || !list) return;

    const completedGoals = userGoals.filter(g => g.status === 'completed');
    list.innerHTML = '';

    if (completedGoals.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#94a3b8;">עדיין לא סיימת אף ספר. בהצלחה בהמשך!</p>';
    } else {
        completedGoals.sort((a, b) => new Date(b.completedDate || 0) - new Date(a.completedDate || 0));

        completedGoals.forEach(goal => {
            const item = document.createElement('div');
            item.style.cssText = 'display:flex; justify-content:space-between; padding: 8px 4px; border-bottom: 1px solid #f1f5f9;';
            item.innerHTML = `
                <span style="font-weight:bold;">${goal.bookName}</span>
                <span style="color:#64748b;">${toHebrewDateString(goal.completedDate)}</span>
            `;
            list.appendChild(item);
        });
    }

    modal.style.display = 'flex';
    bringToFront(modal);
}

function updateChatBadge() {
    const totalUnread = Object.values(unreadMessages).reduce((a, b) => a + b, 0);
    const navItem = document.querySelector('.floating-nav-item[onclick*="chats"]');

    if (!navItem) return;

    let badge = navItem.querySelector('.nav-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        badge.style.cssText = "position: absolute; top: 0; right: 0; background: #ef4444; color: white; font-size: 0.7rem; padding: 2px 5px; border-radius: 99px; min-width: 18px; text-align: center; font-weight: bold; border: 2px solid white; transform: translate(25%, -25%); z-index: 10;";
        navItem.style.position = 'relative';
        navItem.appendChild(badge);
    }

    if (totalUnread > 0) {
        badge.innerText = totalUnread > 99 ? '99+' : totalUnread;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}   

async function checkActiveLottery() {
    try {
        const { data } = await supabaseClient
            .from('system_announcements')
            .select('content')
            .eq('target_type', 'lottery_start')
            .maybeSingle();
        if (data) {
            const parsed = JSON.parse(data.content || '{}');
            const startTime = new Date(parsed.start_time);
            const duration = parsed.duration || 180;
            if (Date.now() < startTime.getTime() + duration * 1000) {
                showLotteryScreen(parsed);
            }
        }
    } catch(e) {  }
}
let _lotteryCountdownTimer = null;
let _lotteryBallTimer = null;

function showLotteryScreen(data) {
    const overlay = document.getElementById('lottery-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

const titleEl = document.getElementById('lottery-title');
    if (titleEl) titleEl.textContent = '🎰 הגרלה חיה – השתתף עכשיו!';

if (data.video_url) {
        const videoWrap = document.getElementById('lottery-video-wrap');
        const frame = document.getElementById('lottery-video-frame');
        if (videoWrap && frame) {
            frame.src = data.video_url;
            videoWrap.style.display = 'block';
            document.getElementById('lottery-machine').style.marginTop = '16px';
        }
    }

const startTime = data.start_time ? new Date(data.start_time) : new Date();
    const duration = data.duration || 180;
    const endTime = new Date(startTime.getTime() + duration * 1000);

    function tickCountdown() {
        const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
        const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
        const secs = String(remaining % 60).padStart(2, '0');
        const badge = document.getElementById('lottery-countdown-badge');
        if (badge) badge.textContent = `${mins}:${secs}`;
        if (remaining <= 0) {
            clearInterval(_lotteryCountdownTimer);
            if (badge) badge.textContent = '00:00';
        }
    }
    clearInterval(_lotteryCountdownTimer);
    tickCountdown();
    _lotteryCountdownTimer = setInterval(tickCountdown, 1000);

startLotteryBallsAnimation();

if (data.lottery_id) {
        supabaseClient.from('shop_orders').select('user_id').eq('item_id', data.lottery_id).eq('order_type', 'lottery_entry').then(({ data: tix }) => {
            if (tix) {
                const unique = new Set(tix.map(t => t.user_id)).size;
                const el = document.getElementById('lottery-participants-text');
                if (el) el.textContent = `${unique} משתתפים · ${tix.length} כרטיסים בסה"כ`;
            }
        });
    }
}

function startLotteryBallsAnimation() {
    const container = document.getElementById('lottery-balls-container');
    if (!container) return;
    const colors = ['#FFB703','#ef4444','#3b82f6','#10b981','#8b5cf6','#f59e0b'];
    clearInterval(_lotteryBallTimer);
    _lotteryBallTimer = setInterval(() => {
        const ball = document.createElement('div');
        ball.className = 'lottery-ball';
        const color = colors[Math.floor(Math.random() * colors.length)];
        ball.style.background = color;
        ball.style.left = '50%';
        ball.style.bottom = '0px';
        const angle = (Math.random() * 160) - 80; 
        const dist = 80 + Math.random() * 120;
        const fx = Math.sin(angle * Math.PI / 180) * dist;
        const fy = -(Math.cos(angle * Math.PI / 180) * dist + 60);
        ball.style.setProperty('--fx', fx + 'px');
        ball.style.setProperty('--fy', fy + 'px');
        ball.textContent = Math.ceil(Math.random() * 99);
        container.appendChild(ball);
        setTimeout(() => ball.remove(), 1300);
    }, 400);
}

function showLotteryWinner(winnerName) {
    clearInterval(_lotteryCountdownTimer);
    clearInterval(_lotteryBallTimer);
    
    for (let i = 0; i < 60; i++) {
        setTimeout(() => spawnConfetti(), i * 50);
    }
    const reveal = document.getElementById('lottery-winner-reveal');
    const nameEl = document.getElementById('lottery-winner-name');
    if (reveal && nameEl) {
        nameEl.textContent = winnerName;
        reveal.style.display = 'flex';
    }
}

function spawnConfetti() {
    const el = document.createElement('div');
    el.className = 'lottery-confetti';
    const colors = ['#FFB703','#ef4444','#3b82f6','#10b981','#8b5cf6','#f59e0b','#fff'];
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-20px';
    el.style.animationDuration = (2 + Math.random() * 3) + 's';
    el.style.animationDelay = '0s';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

function hideLotteryScreen() {
    clearInterval(_lotteryCountdownTimer);
    clearInterval(_lotteryBallTimer);
    const overlay = document.getElementById('lottery-overlay');
    if (overlay) overlay.style.display = 'none';
    const reveal = document.getElementById('lottery-winner-reveal');
    if (reveal) reveal.style.display = 'none';
    const frame = document.getElementById('lottery-video-frame');
    if (frame) frame.src = '';
    const videoWrap = document.getElementById('lottery-video-wrap');
    if (videoWrap) videoWrap.style.display = 'none';
    const container = document.getElementById('lottery-balls-container');
    if (container) container.innerHTML = '';
}

function subscribeToLotteryEvents() {
    if (!supabaseClient) return;
    supabaseClient.channel('lottery_events')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'system_announcements',
            filter: "target_type=eq.lottery_start"
        }, payload => {
            try {
                const data = JSON.parse(payload.new.content || '{}');
                showLotteryScreen(data);
            } catch(e) { showLotteryScreen({}); }
        })
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'system_announcements',
            filter: "target_type=eq.lottery_result"
        }, payload => {
            const winnerName = payload.new.content || 'זוכה';
            showLotteryWinner(winnerName);
        })
        .subscribe();
}
