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
    const loginButton = document.getElementById('loginButton'); // Get login button
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
    if (phone && !validateInput(phone, 'phone')) return customAlert("מספר הטלפון אינו תקין.");

    // הצגת חיווי טעינה
    showToast("ההרשמה בעיצומה...", "info");

    // בדיקה אם שם המשתמש תפוס
    if (globalUsersData.some(u => u.original_name && u.original_name.trim().toLowerCase() === name.trim().toLowerCase())) {
        // אם השם תפוס, נציג הודעה ונמנע הרשמה
        return customAlert("שם המשתמש שבחרת כבר קיים במערכת. אנא בחר שם אחר."); // Keep this as a final check
    }

    // בדיקות כפילות מקדימות למניעת שגיאת 500
    if (phone && globalUsersData.some(u => u.phone === phone)) {
        return customAlert("מספר הטלפון הזה כבר רשום במערכת למשתמש אחר.");
    }

    if (globalUsersData.some(u => u.email === email)) {
        console.warn("Orphan record detected for:", email);
        return customAlert("כתובת האימייל הזו כבר קיימת במאגר הנתונים הציבורי.<br>אם אינך מצליח להתחבר, יש לפנות למנהל לניקוי הנתונים.");
    }

    try {
        console.log("Checking if email exists:", email);

        const securityQuestions = [{ q: q1, a: a1 }];

        // הוספת תצוגת שגיאות בצד המסך
        const handleAuthError = async (errorMessage) => {
            console.error("Signup Error:", errorMessage);
            showToast("שגיאה בהרשמה: " + errorMessage, "error");
        };

        // Use Supabase's built-in signup to handle email verification
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: pass,
            options: {
                emailRedirectTo: window.location.href.split('#')[0], // מפנה חזרה לכתובת הנוכחית של האפליקציה
                data: {
                    display_name: name,
                    phone: phone || null,
                    city: city || null,
                    age: age ? parseInt(age) : null,
                    address: address || null,
                    security_questions: securityQuestions,
                    marketing_consent: marketing,
                    // The trigger will copy these to the public.users table
                }
            }
        });

        if (error) {
            if (error.message.includes("User already registered")) {
                await handleAuthError("כתובת האימייל כבר רשומה במערכת.");
            } else if (error.message.includes("Database error finding user") || error.message.includes("Database error saving new user") || (error.code && error.code === "unexpected_failure") || error.status === 500) {
                let sqlFix = `DELETE FROM public.users WHERE email = '${email}'`;
                if (phone) sqlFix += ` OR phone = '${phone}'`;
                console.error(`Supabase Signup Trigger Error (500).\nLikely orphan record.\nTry running SQL: ${sqlFix};`, error);

                let msg = "שגיאת שרת בעת ההרשמה (500). המערכת זיהתה התנגשות נתונים או שגיאה בשרת.<br><br><b>פתרונות מומלצים:</b><ul>";
                if (phone) msg += "<li>ייתכן שמספר הטלפון תפוס ע\"י משתמש אחר. <b>נסה להירשם ללא טלפון</b> (השאר ריק).</li>";
                msg += "<li>ייתכן ששם המשתמש שבחרת כבר קיים במערכת (ברמת ה-DB). נסה שם מעט שונה.</li>";
                msg += "<li>אם מחקת את המשתמש בעבר, ודא שהוא נמחק גם מטבלת האימות (auth.users).</li></ul>";

                await handleAuthError(msg);
            } else if (error.status === 429 || error.code === 429 || (error.message && error.message.toLowerCase().includes("rate limit"))) {
                await handleAuthError("יותר מדי ניסיונות הרשמה בזמן קצר.<br>מערכת האבטחה חסמה את הפעולה זמנית.<br><br><b>אנא המתן מספר דקות ונסה שוב.</b>");
            } else {
                throw error;
            }
            return;
        }

        // הסתרת חיווי טעינה
        showToast("ההרשמה כמעט הושלמה...", "info");

        // בדיקה אם נוצר סשן באופן מיידי (אם אימות מייל כבוי ב-Supabase)
        if (data.session) {
            document.getElementById('auth-overlay').style.display = 'none';
            document.body.style.overflow = '';
            showToast("הרשמה הושלמה בהצלחה! התחברת.", "success");

            return; // הטיפול בהתחברות יתבצע ב-script.js
        }

        // After successful signup, show a message to check email for verification
        await showToast(
            "נשלח אליך אימייל עם קישור לאימות החשבון. יש ללחוץ על הקישור כדי להפעיל את החשבון ולהתחבר.",
            "success"
        );
        // Do not log the user in automatically. They must verify first.

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
        console.log(`Login attempt: Email='${email}', PassLength=${pass.length}`);
        showToast("מנסה להתחבר...", "info");
        // Secure login via RPC function. This avoids exposing the users table and sending passwords to the client.
        // We don't use .single() here because an RPC function returning 0 rows throws a 406 error with .single().
        // Instead, we fetch the array of results and check its length.
        const { data: users, error } = await supabaseClient
            .rpc('check_user_credentials', {
                p_email: email.trim().toLowerCase(), // וידוא ניקוי רווחים
                p_password: pass
            });

        loginButton.disabled = false;

        console.log("Login RPC result:", { users, error });

        const user = (users && users.length > 0) ? users[0] : null;

        if (error && !user) {
            console.error("Supabase RPC Error:", error);
            if (error.code === '42703') {
                showToast("שגיאה בהתחברות: עמודת 'password' חסרה, פנה למנהל.", "error");
                await customAlert("שגיאת מערכת: עמודת 'password' חסרה בטבלת המשתמשים. יש להריץ את פקודת ה-SQL המתאימה.");
                return;
            }
            await customAlert("שגיאת תקשורת: " + error.message);
            return;
        }

        if (user) {
            // בדיקת חסימה
            showToast("התחברות הצליחה", "success");
            if (user.is_banned) {
                document.getElementById('auth-overlay').style.display = 'none';
                document.getElementById('banned-overlay').style.display = 'flex';
                localStorage.setItem('device_banned', 'true'); // חסימת מכשיר
                sessionStorage.setItem('banned_email', email); // שמירת אימייל לערעור
                return;
            }

            // הגדרת המשתמש הנוכחי
            currentUser = mapUserFromDB(user);

        } else {
            // בדיקה האם המשתמש קיים בכלל (אך הסיסמה שגויה) לצורך דיבוג
            console.log("Login failed: Invalid credentials or user not found.");
            const { data: exists } = await supabaseClient.rpc('check_email_exists', { p_email: email.trim().toLowerCase() });
            if (exists) {
                console.warn("DEBUG: User exists in DB. This means the password hash check failed.");
                await customAlert("האימייל קיים במערכת אך הסיסמה אינה תואמת.<br>אם יצרת את המשתמש ידנית, ייתכן שהסיסמה אינה מוצפנת.<br>מומלץ לנסות 'שחזור סיסמה'.");
                return;
            } else {
                console.warn("User with this email does not exist.");
            }
            console.warn("Login failed: User not found during login attempt.");

            // User not found or password incorrect. The RPC returns no rows in both cases.
            showToast("שגיאה: האימייל או הסיסמה שגויים", "error");
            const randomJoke = JOKES[Math.floor(Math.random() * JOKES.length)];
            await customAlert(randomJoke);
            return;
        }

                // המשך תהליך ההתחברות הרגיל
        localStorage.setItem('torahApp_user', JSON.stringify(currentUser));

        // Hide overlay and update header immediately
        document.getElementById('auth-overlay').style.display = 'none';
        document.body.style.overflow = ''; // שחרור גלילה
        updateHeader();
        restoreAuthenticatedHeader();

        // Perform initialization sequence directly.
        // This avoids re-running the full init() and ensures the correct order of operations.
        await syncGlobalData(); // Sync first to prevent race conditions
        await loadGoals();
        await loadUserProfile();
        await loadSchedules();
        getDafYomi();
        checkCookieConsent();
        notificationsEnabled = true;
        loadAds();

        // Setup timers and realtime connections
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
        setTimeout(checkDailyReminders, 5000);
        setInterval(checkChavrutaReminders, 60000);

        updateFollowersCount();
        sendHeartbeat();
        setupRealtime();
        startBackgroundServices(); // הפעלת סנכרון רקע לאחר התחברות
        logVisit();
        if (typeof updateDailyStreak === 'function') await updateDailyStreak();

        if (typeof applyUserCustomizations === 'function') await applyUserCustomizations();

        switchScreen('dashboard', document.querySelector('.nav-item'));
        showToast("התחברת בהצלחה! ברוכים הבאים.", "success");
        addNotification("ברוך הבא לבית המדרש! בהצלחה בלימוד."); // הודעת ברוך הבא ספציפית להתחברות

    } catch (e) {
        console.error("Login Error:", e);
        showToast("שגיאה: האימייל או הסיסמה שגויים", "error");
        await customAlert("אירעה שגיאה בהתחברות.");
        loginButton.disabled = false;
    }
}

async function handleForgotPassword() {
    const email = await customPrompt("הזן את כתובת האימייל שלך לשחזור:");
    if (!email) return; // User cancelled

    try {
        // Step 1: Securely get the security question via RPC
        const { data: questionData, error: qError } = await supabaseClient.rpc('get_user_security_question', { p_email: email.toLowerCase() });

        if (qError) throw qError;

        if (!questionData || !questionData.q) {
            await customAlert("משתמש לא נמצא או שלא הוגדרו לו שאלות אבטחה.");
            return;
        }

        // Step 2: Ask the user the question
        const userAnswer = await customPrompt(`שאלת אבטחה: ${questionData.q}`);
        if (userAnswer === null) return; // User cancelled

        // Step 3: Ask for a new password
        const newPassword = await customPrompt("הזן סיסמה חדשה:");
        if (!newPassword) return; // User cancelled or entered empty
        if (!validateInput(newPassword, 'password')) {
            return customAlert("הסיסמה חייבת להכיל לפחות 6 תווים, כולל אותיות ומספרים.");
        }

        // Step 4: Attempt to reset the password via RPC, which validates the answer on the server
        const { data: success, error: resetError } = await supabaseClient.rpc('reset_user_password', {
            p_email: email.toLowerCase(),
            p_answer: userAnswer,
            p_new_password: newPassword
        });

        if (resetError) throw resetError;

        if (success) {
            await customAlert("הסיסמה שונתה בהצלחה!");
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
        // Find user data from the globally synced (and secure) user list instead of a direct DB call.
        const userData = globalUsersData.find(u => u.email === currentUser.email);

        if (userData) {
            // עדכון הפרופיל המקומי עם נתונים מהענן
            currentUser.displayName = userData.name || currentUser.displayName;
            currentUser.phone = userData.phone || '';
            currentUser.city = userData.city || '';
            currentUser.address = userData.address || '';
            currentUser.age = userData.age || null;
            currentUser.isAnonymous = userData.isAnonymous || false;
            currentUser.subscription = userData.subscription || { amount: 0, level: 0, name: '' }; // טעינת מנוי
            // Security-sensitive fields like password and security_questions are not in globalUsersData.
            // They are loaded only once on initial login and managed locally.
            currentUser.reward_points = userData.reward_points || 0;
            currentUser.chat_rating = userData.chat_rating || 0;
            currentUser.marketing_consent = userData.marketing_consent || false;

            // שמירה מקומית
            localStorage.setItem('torahApp_user', JSON.stringify(currentUser));

            // עדכון UI של הפרופיל
            updateProfileUI();
        }
    } catch (e) {
        console.error("שגיאה בטעינת פרופיל:", e);
    }
}

function updateProfileUI() {
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

    if (currentUser.security_questions && currentUser.security_questions.length > 0) {
        if (secQInput) secQInput.value = currentUser.security_questions[0].q || '';
        if (secAInput) secAInput.value = currentUser.security_questions[0].a || '';
    }
}

function toggleAuthMode(mode) {
    document.getElementById('btn-login-mode').className = `auth-toggle-btn ${mode === 'login' ? 'active' : ''}`;
    document.getElementById('btn-signup-mode').className = `auth-toggle-btn ${mode === 'signup' ? 'active' : ''}`;

    document.getElementById('login-form').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('signup-form').style.display = mode === 'signup' ? 'block' : 'none';
}

function mapUserFromDB(user) {
    return {
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
        marketing_consent: user.marketing_consent || false,
        chat_rating: user.chat_rating || 0
    };
}

function updateHeader() {
    document.getElementById('headerUserEmail').innerText = currentUser.displayName || currentUser.email;

    // עדכון הילת הפרופיל בהאדר
    const btn = document.getElementById('headerProfileBtn');
    // הסרת כל מחלקות ההילה הקודמות
    for (let i = 1; i <= 7; i++) btn.classList.remove(`aura-lvl-${i}`);

    if (currentUser.subscription && currentUser.subscription.level > 0) {
        btn.classList.add(`aura-lvl-${currentUser.subscription.level}`);
        // הוספת טייטל
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
                // Fallback: manually toggle if function is missing for some reason
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
        // Badge visibility will be handled by updateNotifUI when data loads
    }
    if (typeof setupInterfaceChanges === 'function') {
        setupInterfaceChanges();
    }
}

function logout() { localStorage.removeItem('torahApp_user'); location.reload(); }

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

    // Show profile and notification icons, but with guest functionality
    const notifContainer = document.getElementById('notif-container');
    const profileContainer = document.querySelector('.profile-container');
    const donateButton = document.querySelector('.btn-donate-header');

    if (profileContainer) {
        profileContainer.style.display = ''; // Revert to default stylesheet display
        const profileBtn = document.getElementById('headerProfileBtn');
        if (profileBtn) {
            // The original onclick is toggleProfileMenu(). We change it for guests.
            profileBtn.onclick = toggleGuestProfileMenu;
        }
    }
    if (notifContainer) {
        notifContainer.style.display = ''; // Revert to default
        // The original onclick is toggleNotifications(). We change it for guests.
        notifContainer.onclick = toggleGuestNotifications;
        if (document.getElementById('notif-badge')) document.getElementById('notif-badge').style.display = 'none';
    }
    // if (donateButton) donateButton.style.display = 'none'; // הוסר כדי שהכפתור יוצג גם לאורחים ויקפיץ חלון התחברות
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

        // רענון מלא של הנתונים כדי להחזיר את המצב לקדמותו
        userGoals = [];
        chavrutaConnections = [];

        location.reload();
    }
}

function validateInput(value, type) {
    if (!value) return true; // Don't validate empty optional fields, the required attribute handles mandatory fields
    value = value.trim();
    if (value === '') return true;

    switch (type) {
        case 'email':
            return /\S+@\S+\.\S+/.test(value);
        case 'phone':
            // Allows 05x-xxxxxxx, 0x-xxxxxxx, 0xx-xxxxxxx after stripping hyphens
            return /^0\d{8,9}$/.test(value.replace(/-/g, ''));
        case 'password':
            // At least 6 chars, one letter, one number
            return value.length >= 3; // הקלה לצורך בדיקות: מינימום 3 תווים
        case 'name':
            // At least two letters, allows Hebrew, English and spaces, not just numbers
            return /^[a-zA-Z\u0590-\u05FF\s]{2,}[a-zA-Z\u0590-\u05FF\s]*$/.test(value) && !/^\d+$/.test(value);
        default:
            return true;
    }
}

// --- פונקציות חדשות לחיווי זמינות שם משתמש ---
let usernameCheckTimeout;

function checkUsernameAvailability() {
    const nameInput = document.getElementById('regName');
    const indicator = document.getElementById('usernameAvailabilityIndicator');
    if (!nameInput || !indicator) return;

    const name = nameInput.value.trim();

    // נקה חיווי אם השדה ריק
    if (name === '') {
        indicator.innerHTML = '';
        indicator.style.color = '';
        return;
    }

    // נקה טיימאאוט קודם
    clearTimeout(usernameCheckTimeout);

    // הגדר טיימאאוט חדש לבדיקה לאחר השהיה קצרה (debounce)
    usernameCheckTimeout = setTimeout(() => {
        const isTaken = globalUsersData.some(u => u.original_name && u.original_name.trim().toLowerCase() === name.toLowerCase());

        if (isTaken) {
            indicator.innerHTML = '&#x2718;'; // X mark
            indicator.style.color = 'red';
            indicator.title = 'שם משתמש תפוס';
        } else {
            indicator.innerHTML = '&#x2714;'; // Check mark
            indicator.style.color = 'green';
            indicator.title = 'שם משתמש פנוי';
        }
    }, 300); // השהיה של 300 מילישניות
}

let emailCheckTimeout;

function checkEmailAvailability() {
    const emailInput = document.getElementById('regEmail');
    const indicator = document.getElementById('emailAvailabilityIndicator');
    if (!emailInput || !indicator) return;

    const email = emailInput.value.trim().toLowerCase();

    if (email === '' || !validateInput(email, 'email')) {
        indicator.innerHTML = '';
        indicator.style.color = '';
        return;
    }

    clearTimeout(emailCheckTimeout);

    emailCheckTimeout = setTimeout(async () => {
        const { data: exists } = await supabaseClient.rpc('check_email_exists', { p_email: email });
        if (exists) {
            indicator.innerHTML = '&#x2718;'; // X mark
            indicator.style.color = 'red';
            indicator.title = 'כתובת אימייל תפוסה';
        } else {
            indicator.innerHTML = '&#x2714;'; // Check mark
            indicator.style.color = 'green';
            indicator.title = 'כתובת אימייל פנויה';
        }
    }, 500);
}

// הוספת מאזין אירועים לשדה השם לאחר טעינת ה-DOM
document.addEventListener('DOMContentLoaded', () => {
    const regNameInput = document.getElementById('regName');
    if (regNameInput) {
        regNameInput.addEventListener('input', checkUsernameAvailability);
    }
    const regEmailInput = document.getElementById('regEmail');
    if (regEmailInput) {
        regEmailInput.addEventListener('input', checkEmailAvailability);
    }
});
