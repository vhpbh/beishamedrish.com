async function loginWithGoogle() {
    try {
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });

        if (error) throw error;
    } catch (e) {
        console.error("Google Login Error:", e.message);
        showToast("שגיאה בהתחברות עם גוגל: " + e.message, "error");
    }
}

async function checkUserProfile(user) {
    if (!user) return;

    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('full_name, age, phone, address')
            .eq('id', user.id)
            .maybeSingle();

        if (error) throw error;

        if (!profile || !profile.age || !profile.phone || !profile.address) {
            console.log("Redirecting to complete profile...");
            window.location.href = 'complete-profile.html';
        }
    } catch (e) {
        console.error("Error checking profile:", e.message);
    }
}

async function handleCompleteProfile(e) {
    e.preventDefault();
    
    try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) throw new Error("משתמש לא מזוהה. אנא התחבר שוב.");

        const profileData = {
            id: user.id,
            full_name: document.getElementById('compFullName').value,
            age: parseInt(document.getElementById('compAge').value),
            phone: document.getElementById('compPhone').value,
            address: document.getElementById('compAddress').value
        };

        const { error: upsertError } = await supabaseClient
            .from('profiles')
            .upsert(profileData);

        if (upsertError) throw upsertError;

        await customAlert("הפרופיל עודכן בהצלחה! ברוך הבא לבית המדרש.");
        window.location.href = 'index.html';
    } catch (e) {
        console.error("Profile update error:", e.message);
        await customAlert("שגיאה בעדכון הפרטים: " + e.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const emailAvailabilityIndicator = document.getElementById('emailAvailabilityIndicator');
    const usernameAvailabilityIndicator = document.getElementById('usernameAvailabilityIndicator');
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const pass = document.getElementById('regPass').value;
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value.trim();
    const city = document.getElementById('regCity').value;
    const age = document.getElementById('regAge').value;
    const address = document.getElementById('regAddress').value;
    const q1 = document.getElementById('regSecQ1').value;
    const a1 = document.getElementById('regSecA1').value;
    const marketing = document.getElementById('regMarketing').checked;
    const loginButton = document.getElementById('loginButton');
    const AUTH_JOKES = [
        "רגע, רגע... המלאכים בודקים אם שמך רשום בספר החיים (של האתר). אנא התחבר.",
        "כדי לשמור את הלימוד שלך, צריך קודם לשמור אותך במערכת. בוא נרשם!",
        "נראה שאתה לומד בעילום שם. כדי שנוכל לעקוב אחריך, אנא התחבר.",
        "הפעולה שביקשת דורשת ייחוס. אנא התחבר כדי שנדע מי אתה.",
        "עצור! רק רשומים יכולים לצבור זכויות. הירשם עכשיו!"
    ];

    if (!email || !pass || !name || !q1 || !a1) {
        await customAlert("נא למלא את כל שדות החובה");
        return;
    }

    if (!validateInput(email, 'email')) return customAlert("כתובת האימייל אינה תקינה.");
    if (!validateInput(pass, 'password')) return customAlert("הסיסמה חייבת להכיל לפחות 6 תווים, כולל אותיות ומספרים.");
    if (!validateInput(name, 'name')) return customAlert("השם אינו תקין.");

    showToast("ההרשמה בעיצומה...", "info");

    if (globalUsersData.some(u => u.original_name && u.original_name.trim().toLowerCase() === name.trim().toLowerCase())) {

        return customAlert("שם המשתמש שבחרת כבר קיים במערכת. אנא בחר שם אחר.");
    }



    if (globalUsersData.some(u => u.email === email)) {
        console.warn("Orphan record detected for:", email);
        return customAlert("כתובת האימייל הזו כבר קיימת במאגר הנתונים הציבורי.<br>אם אינך מצליח להתחבר, יש לפנות למנהל לניקוי הנתונים.");
    }

    try {

        const securityQuestions = [{ q: q1, a: a1 }];


        const handleAuthError = async (errorMessage) => {
            console.error("Signup Error:", errorMessage);
            showToast("שגיאה בהרשמה: " + errorMessage, "error");
        };

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: pass,
            options: {
                emailRedirectTo: window.location.href.split('#')[0],
                data: {
                    display_name: name,
                    phone: phone || null,
                    city: city || null,
                    age: age ? parseInt(age) : null,
                    address: address || null,
                    security_questions: securityQuestions,
                    marketing_consent: marketing,
                }
            }
        });

        if (error) {
            if (error.message.includes("User already registered")) {
                await handleAuthError("כתובת האימייל כבר רשומה במערכת.");
            } else if (error.message.includes("Database error finding user") || error.message.includes("Database error saving new user") || (error.code && error.code === "unexpected_failure") || error.status === 500) {
                let sqlFix = `DELETE FROM public.users WHERE email = '${email}'`;
                if (phone) sqlFix += ` OR phone = '${phone}'`;
                console.error(`Supabase Signup Trigger Error (500).\nLikely orphan record.`, error);

                let msg = "שגיאת שרת בעת ההרשמה (500). המערכת זיהתה התנגשות נתונים או שגיאה בשרת.<br><br><b>פתרונות מומלצים:</b><ul>";
                if (phone) msg += "<li>ייתכן שמספר הטלפון תפוס ע\"י משתמש אחר. <b>נסה להירשם ללא טלפון</b> (השאר ריק).</li>";
                msg += "<li>ייתכן ששם המשתמש שבחרת כבר קיים במערכת. נסה שם מעט שונה.</li>";
                msg += "<li>אם מחקת את המשתמש בעבר, ודא שהוא נמחק גם מטבלת האימות (auth.users).</li></ul>";

                await handleAuthError(msg);
            } else if (error.status === 429 || error.code === 429 || (error.message && error.message.toLowerCase().includes("rate limit"))) {
                await handleAuthError("יותר מדי ניסיונות הרשמה בזמן קצר.<br>מערכת האבטחה חסמה את הפעולה זמנית.<br><br><b>אנא המתן מספר דקות ונסה שוב.</b>");
            } else {
                throw error;
            }
            return;
        }


        if (data.user) {
            const { error: profileInsertError } = await supabaseClient
                .from('users')
                .upsert({
                    id: data.user.id,
                    email: email,
                    display_name: name,
                    phone: phone || null,
                    city: city || null,
                    age: age ? parseInt(age) : null,
                    address: address || null,
                    is_anonymous: false,
                    security_questions: securityQuestions,
                    marketing_consent: marketing,
                    last_seen: new Date().toISOString()
                }, { onConflict: 'id' });
            if (profileInsertError) {
                console.error("Error inserting profile data into public.users after signup:", profileInsertError);
            }
        }

        showToast("ההרשמה כמעט הושלמה...", "info");

        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            const userIP = ipData.ip;

            const { error: logError } = await supabaseClient
                .from('user_access_logs')
                .insert([
                    {
                        user_email: email,
                        ip_address: userIP
                    }
                ]);

            if (logError) throw logError;

            console.log("הלוג נשמר והמייל בדרך!");

        } catch (err) {
            console.error("הרישום הצליח, אך נכשלה שמירת ה-IP:", err.message);
        }

        if (data.session) {
            document.getElementById('auth-overlay').style.display = 'none';
            document.body.style.overflow = '';
            showToast("הרשמה הושלמה בהצלחה! התחברת.", "success");

            return;
        }

        await showToast(
            "נשלח אליך אימייל עם קישור לאימות החשבון. יש ללחוץ על הקישור כדי להפעיל את החשבון ולהתחבר.",
            "success"
        );

    } catch (e) {
        console.error(e);

        await customAlert("שגיאה ביצירת חשבון: " + e.message);
    }
}


async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('emailInput').value.trim().toLowerCase();
    const pass = document.getElementById('passInput').value;

    const loginButton = document.getElementById('loginButton');
    if (!email || !pass) {
        await customAlert("נא להזין אימייל וסיסמה");
        return;
    }

    try {
        showToast("מנסה להתחבר...", "info");
        if (loginButton) loginButton.disabled = true;

        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: pass
        });

        if (loginButton) {
            loginButton.disabled = false;
        }

        if (authError) {
            console.error("Login Error:", authError);
            showToast("שגיאה: האימייל או הסיסמה שגויים", "error");
            const jokesList = (typeof JOKES !== 'undefined' && Array.isArray(JOKES)) ? JOKES : ["הסיסמה שגויה."];
            const randomJoke = jokesList[Math.floor(Math.random() * jokesList.length)];
            await customAlert(randomJoke);
            return;
        }

        let { data: user, error: userError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (userError) {
            console.error("User fetch error:", userError);
            await customAlert("שגיאה בטעינת נתוני משתמש.");
            return;
        }

        if (!user) {
            console.warn("User record missing in public table for:", email);

            try {
                const { data: newUser, error: createError } = await supabaseClient
                    .from('users')
                    .upsert([{
                        id: authData.user.id,
                        email: email,
                        display_name: (authData.user && authData.user.user_metadata && authData.user.user_metadata.display_name) ? authData.user.user_metadata.display_name : email.split('@')[0],
                        last_seen: new Date().toISOString()
                    }], { onConflict: 'id' })
                    .select()
                    .single();

                if (createError) throw createError;
                user = newUser;
            } catch (e) {
                console.error("Failed to recover user:", e);
                await customAlert("ההתחברות הצליחה, אך כרטיס המשתמש שלך חסר במערכת (שגיאה ביצירה). אנא פנה לתמיכה.");
                return;
            }
        }


        showToast("התחברות הצליחה", "success");


        const prevUserStr = localStorage.getItem('torahApp_user');
        const prevUser = prevUserStr ? JSON.parse(prevUserStr) : null;

        currentUser = mapUserFromDB(user);

        if (prevUser && prevUser.email !== currentUser.email) {
            console.log("User switch detected (ID mismatch). Clearing local data.");
            clearLocalUserData();
        }

        localStorage.setItem('torahApp_user', JSON.stringify(currentUser));
        document.getElementById('auth-overlay').style.display = 'none';
        document.body.style.overflow = '';
        updateHeader();
        restoreAuthenticatedHeader();

        await syncGlobalData();
        await loadGoals();
        await loadUserProfile();
        await loadSchedules();
        getDafYomi();
        checkCookieConsent();
        notificationsEnabled = true;
        loadAds();

        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
        setTimeout(checkDailyReminders, 5000);
        setInterval(checkChavrutaReminders, 60000);

        updateFollowersCount();
        sendHeartbeat();
        setupRealtime();
        startBackgroundServices();
        logVisit();
        if (typeof updateDailyStreak === 'function') await updateDailyStreak();

        if (typeof applyUserCustomizations === 'function') await applyUserCustomizations();

        switchScreen('dashboard', document.querySelector('.nav-item'));
        showToast("התחברת בהצלחה! ברוכים הבאים.", "success");
        addNotification("ברוך הבא לבית המדרש! בהצלחה בלימוד.");

    } catch (e) {
        console.error("Login Error:", e);
        showToast("שגיאה: האימייל או הסיסמה שגויים", "error");
        await customAlert("אירעה שגיאה בהתחברות.");
        if (loginButton) {
            loginButton.disabled = false;
        }
    }
}

async function handleForgotPassword() {
    const email = await customPrompt("הזן את כתובת האימייל שלך לשחזור:");
    if (!email) return;

    try {
        showToast("בודק שאלות אבטחה...", "info");
        const { data: questionData, error: qError } = await supabaseClient.rpc('get_user_security_question', { p_email: email.toLowerCase() });

        if (qError) throw qError;

        if (!questionData || !questionData.q) {
            await customAlert("משתמש לא נמצא או שלא הוגדרו לו שאלות אבטחה.");
            return;
        }

        const userAnswer = await customPrompt(`שאלת אבטחה: ${questionData.q}`);
        if (!userAnswer) return;

        const newPassword = await customPrompt("הזן סיסמה חדשה:");
        if (!newPassword) return;
        if (!validateInput(newPassword, 'password')) {
            return customAlert("הסיסמה חייבת להכיל לפחות 6 תווים, כולל אותיות ומספרים.");
        }

        showToast("מעדכן סיסמה...", "info");
        const { data: success, error: resetError } = await supabaseClient.rpc('reset_user_password', {
            p_email: email.toLowerCase(),
            p_answer: userAnswer,
            p_new_password: newPassword
        });

        if (resetError) throw resetError;

        if (success) {
            await customAlert("הסיסמה שונתה בהצלחה! כעת ניתן להתחבר.");
            toggleAuthMode('login');
        } else {
            await customAlert("תשובה שגויה.");
        }
    } catch (e) {
        console.error("Forgot Password Error:", e);
        await customAlert("שגיאה בתהליך השחזור: " + e.message);
    }
}

async function loadUserProfile() {
    try {
        if (!currentUser) return;
        const userData = globalUsersData.find(u => u.email === currentUser.email);

        if (userData) {
            currentUser.displayName = userData.name || currentUser.displayName;
            currentUser.phone = userData.phone || '';
            currentUser.city = userData.city || '';
            currentUser.address = userData.address || '';
            currentUser.age = userData.age || null;
            currentUser.isAnonymous = userData.isAnonymous || false;
            currentUser.subscription = userData.subscription || currentUser.subscription;
            currentUser.reward_points = userData.reward_points || 0;
            currentUser.chat_rating = userData.chat_rating || 0;
            currentUser.marketing_consent = userData.marketing_consent || false;
            currentUser.masechtot = userData.masechtot || '';

            localStorage.setItem('torahApp_user', JSON.stringify(currentUser));
        }
        updateProfileUI();
    } catch (e) {
        console.error("שגיאה בטעינת פרופיל:", e);
    }
}

function updateProfileUI() {
    if (!currentUser) return;
    const nameInput = document.getElementById('profileName');
    const phoneInput = document.getElementById('profilePhone');
    const cityInput = document.getElementById('profileCity');
    const addressInput = document.getElementById('profileAddress');
    const ageInput = document.getElementById('profileAge');
    const anonSwitch = document.getElementById('anonSwitch');
    const secQInput = document.getElementById('profileSecQ');
    const secAInput = document.getElementById('profileSecA');

    if (nameInput) nameInput.value = currentUser.displayName || '';
    if (phoneInput) phoneInput.value = currentUser.phone || '';
    if (ageInput) ageInput.value = currentUser.age || '';
    if (cityInput) cityInput.value = currentUser.city || '';
    if (addressInput) addressInput.value = currentUser.address || '';
    if (anonSwitch) anonSwitch.checked = currentUser.isAnonymous || false;

    const hasQuestions = currentUser.security_questions && currentUser.security_questions.length > 0;
    if (secQInput) secQInput.value = hasQuestions ? (currentUser.security_questions[0].q || '') : '';
    if (secAInput) secAInput.value = hasQuestions ? (currentUser.security_questions[0].a || '') : '';
}

function toggleAuthMode(mode) {
    document.getElementById('btn-login-mode').className = `auth-toggle-btn ${mode === 'login' ? 'active' : ''}`;
    document.getElementById('btn-signup-mode').className = `auth-toggle-btn ${mode === 'signup' ? 'active' : ''}`;

    document.getElementById('login-form').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('signup-form').style.display = mode === 'signup' ? 'block' : 'none';
}

function mapUserFromDB(user) {
    return {
        id: user.id || user.email,
        email: user.email,
        displayName: user.display_name || user.email.split('@')[0],
        isAnonymous: user.is_anonymous,
        phone: user.phone || '',
        city: user.city || '',
        address: user.address || '',
        age: user.age || null,
        subscription: user.subscription || { amount: 0, level: 0, name: '' },
        security_questions: user.security_questions || [],
        reward_points: user.reward_points || 0,
        masechtot: user.masechtot || '',
        marketing_consent: user.marketing_consent || false,
        chat_rating: user.chat_rating || 0
    };
}

function updateHeader() {
    document.getElementById('headerUserEmail').innerText = currentUser.displayName || currentUser.email;

    const btn = document.getElementById('headerProfileBtn');
    for (let i = 1; i <= 7; i++) btn.classList.remove(`aura-lvl-${i}`);

    if (currentUser.subscription && currentUser.subscription.level > 0) {
        btn.classList.add(`aura-lvl-${currentUser.subscription.level}`);
        btn.title = `מנוי: ${currentUser.subscription.name}`;
    }
}

function restoreAuthenticatedHeader() {
    const profileBtn = document.getElementById('headerProfileBtn');
    if (profileBtn) {
        profileBtn.onclick = function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (typeof window.toggleProfileMenu === 'function') {
                window.toggleProfileMenu();
            } else {
                const menu = document.getElementById('profile-dropdown');
                if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            }
        };
    }
    const notifContainer = document.getElementById('notif-container');
    if (notifContainer) {
        notifContainer.onclick = function (e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (typeof window.toggleNotifications === 'function') {
                window.toggleNotifications();
            }
        };
    }
    if (typeof setupInterfaceChanges === 'function') {
        setupInterfaceChanges();
    }
}

function logout() {
    clearLocalUserData();
    localStorage.removeItem('torahApp_user');
    location.reload();
}

function clearLocalUserData() {
    localStorage.removeItem('torahApp_goals');
    localStorage.removeItem('torahApp_chavrutas');
    localStorage.removeItem('chavruta_schedules');
    localStorage.removeItem('torahApp_unread');
    localStorage.removeItem('torahApp_lastReadTimes');
    localStorage.removeItem('torahApp_rating');
    localStorage.removeItem('torahApp_stats');
    localStorage.removeItem('torahApp_followersCount');
}

function checkBanStatus() {
    if (localStorage.getItem('device_banned') === 'true') {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('banned-overlay').style.display = 'flex';
    }
}

function requireAuth() {
    if (currentUser) {
        return true;
    }

    customAlert("פעולה זו מצריכה חיבור לאתר. נא להתחבר כדי להמשיך.").then(() => {
        showAuthOverlay();
    });

    return false;
}

function setupGuestHeader() {
    const headerEmail = document.getElementById('headerUserEmail');
    headerEmail.innerHTML = `<a href="#" onclick="event.preventDefault(); showAuthOverlay();" style="text-decoration: underline; color: var(--accent);">התחבר או הירשם</a>`;
    headerEmail.style.cursor = 'pointer';

    const notifContainer = document.getElementById('notif-container');
    const profileContainer = document.querySelector('.profile-container');
    const donateButton = document.querySelector('.btn-donate-header');

    if (profileContainer) {
        profileContainer.style.display = '';
        const profileBtn = document.getElementById('headerProfileBtn');
        if (profileBtn) {
            profileBtn.onclick = toggleGuestProfileMenu;
        }
    }
    if (notifContainer) {
        notifContainer.style.display = '';
        notifContainer.onclick = toggleGuestNotifications;
        if (document.getElementById('notif-badge')) document.getElementById('notif-badge').style.display = 'none';
    }
}

function toggleGuestNotifications() {
    requireAuth();
}

function showAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function logoutBot() {
    if (realAdminUser) {
        currentUser = realAdminUser;
        realAdminUser = null;
        localStorage.setItem('torahApp_user', JSON.stringify(currentUser));
        userGoals = [];
        chavrutaConnections = [];

        location.reload();
    }
}

function validateInput(value, type) {
    if (!value) return true;
    value = value.trim();
    if (value === '') return true;

    switch (type) {
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
        case 'phone':
            return /^0\d{8,9}$/.test(value.replace(/-/g, ''));
        case 'password':
            return value.length >= 6;
        case 'name':
            return /^[a-zA-Z\u0590-\u05FF\s]{2,}[a-zA-Z\u0590-\u05FF\s]*$/.test(value) && !/^\d+$/.test(value);
        case 'age':
            return /^\d+$/.test(value) && parseInt(value) >= 5 && parseInt(value) <= 120;
        default:
            return true;
    }
}

let usernameCheckTimeout;

function checkUsernameAvailability() {
    const nameInput = document.getElementById('regName');
    if (!nameInput) return;

    let indicator = document.getElementById('usernameAvailabilityIndicator');
    if (!indicator) {
        indicator = document.createElement('span');
        indicator.id = 'usernameAvailabilityIndicator';
        indicator.style.position = 'absolute';
        indicator.style.left = '10px';
        indicator.style.top = '50%';
        indicator.style.transform = 'translateY(-50%)';
        indicator.style.zIndex = '5';
        if (nameInput.parentElement) nameInput.parentElement.style.position = 'relative';
        nameInput.parentElement.appendChild(indicator);
    } else {
        indicator.style.left = '10px';
        indicator.style.top = '50%';
        indicator.style.transform = 'translateY(-50%)';
    }

    const name = nameInput.value.trim();

    if (name === '') {
        indicator.innerHTML = '';
        return;
    }

    clearTimeout(usernameCheckTimeout);

    usernameCheckTimeout = setTimeout(() => {
        const isTaken = globalUsersData.some(u => u.original_name && u.original_name.trim().toLowerCase() === name.toLowerCase());

        if (isTaken) {
            indicator.innerHTML = '<span style="background:#fee2e2; color:#ef4444; padding:2px 8px; border-radius:12px; font-size:0.75rem; border:1px solid #fecaca; display:flex; align-items:center; gap:4px; font-weight:bold;">תפוס <i class="fas fa-times"></i></span>';
            indicator.title = 'שם משתמש תפוס';
        } else {
            indicator.innerHTML = '<span style="background:#dcfce7; color:#16a34a; padding:2px 8px; border-radius:12px; font-size:0.75rem; border:1px solid #bbf7d0; display:flex; align-items:center; gap:4px; font-weight:bold;">פנוי <i class="fas fa-check"></i></span>';
            indicator.title = 'שם משתמש פנוי';
        }
    }, 300);
}

let emailCheckTimeout;

function checkEmailAvailability() {
    const emailInput = document.getElementById('regEmail');
    if (!emailInput) return;

    let indicator = document.getElementById('emailAvailabilityIndicator');
    if (!indicator) {
        indicator = document.createElement('span');
        indicator.id = 'emailAvailabilityIndicator';
        indicator.style.position = 'absolute';
        indicator.style.left = '10px';
        indicator.style.top = '50%';
        indicator.style.transform = 'translateY(-50%)';
        indicator.style.zIndex = '5';
        if (emailInput.parentElement) {
            emailInput.parentElement.style.position = 'relative';
            emailInput.parentElement.appendChild(indicator);
        }
    } else {
        indicator.style.left = '10px';
        indicator.style.top = '50%';
        indicator.style.transform = 'translateY(-50%)';
    }

    const email = emailInput.value.trim().toLowerCase();

    if (email === '' || !validateInput(email, 'email')) {
        indicator.innerHTML = '';
        return;
    }

    clearTimeout(emailCheckTimeout);

    emailCheckTimeout = setTimeout(async () => {
        const { data: exists } = await supabaseClient.rpc('check_email_exists', { p_email: email });
        if (exists) {
            indicator.innerHTML = '<span style="background:#fee2e2; color:#ef4444; padding:2px 8px; border-radius:12px; font-size:0.75rem; border:1px solid #fecaca; display:flex; align-items:center; gap:4px; font-weight:bold;">תפוס <i class="fas fa-times"></i></span>';
            indicator.title = 'כתובת אימייל תפוסה';
        } else {
            indicator.innerHTML = '<span style="background:#dcfce7; color:#16a34a; padding:2px 8px; border-radius:12px; font-size:0.75rem; border:1px solid #bbf7d0; display:flex; align-items:center; gap:4px; font-weight:bold;">פנוי <i class="fas fa-check"></i></span>';
            indicator.title = 'כתובת אימייל פנויה';
        }
    }, 500);
}

let phoneCheckTimeout;

function checkPhoneAvailability() {
    const phoneInput = document.getElementById('regPhone');
    if (!phoneInput) return;

    let indicator = document.getElementById('phoneAvailabilityIndicator');
    const phone = phoneInput.value.trim().replace(/-/g, '');
    if (phone === '' || !validateInput(phone, 'phone')) return;

    clearTimeout(phoneCheckTimeout);
    phoneCheckTimeout = setTimeout(() => {
        const isTaken = globalUsersData.some(u => u.phone === phone);
    }, 500);
}

function setupRealtimeValidation() {
    const validationRules = [
        { id: 'regEmail', type: 'email', required: true },
        { id: 'regPass', type: 'password', required: true },
        { id: 'regName', type: 'name', required: true },
        { id: 'regPhone', type: 'phone', required: false },
        { id: 'regAge', type: 'age', required: false },
        { id: 'regAddress', type: 'text', required: false },
        { id: 'regCity', type: 'text', required: false },
        { id: 'regSecQ1', type: 'text', required: true },
        { id: 'regSecA1', type: 'text', required: true },
        { id: 'emailInput', type: 'email', required: true },
        { id: 'passInput', type: 'password', required: true }
    ];

    validationRules.forEach(rule => {
        const input = document.getElementById(rule.id);
        if (input) {
            const handler = () => {
                const val = input.value.trim();
                let isValid = true;

                if (rule.required && val === '') {
                    isValid = false;
                } else if (val !== '') {
                    if (rule.type === 'text') isValid = val.length > 0;
                    else isValid = validateInput(val, rule.type);
                } else if (!rule.required && val === '') {
                    input.classList.remove('valid', 'invalid');
                    return;
                }

                if (isValid) {
                    input.classList.add('valid');
                    input.classList.remove('invalid');
                } else {
                    input.classList.add('invalid');
                    input.classList.remove('valid');
                }
            };

            input.addEventListener('input', handler);
            input.addEventListener('blur', handler);
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const regNameInput = document.getElementById('regName');
    if (regNameInput) {
        regNameInput.addEventListener('input', checkUsernameAvailability);
    }
    const regEmailInput = document.getElementById('regEmail');
    if (regEmailInput) {
        regEmailInput.addEventListener('input', checkEmailAvailability);
    }
    const regPhoneInput = document.getElementById('regPhone');
    if (regPhoneInput) {
        regPhoneInput.addEventListener('input', checkPhoneAvailability);
    }
    setupRealtimeValidation();
});
