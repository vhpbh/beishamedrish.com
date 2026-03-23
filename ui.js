function setupInterfaceChanges() {
    if (!document.getElementById('screen-ads')) {
        const adsScreen = document.createElement('div');
        adsScreen.id = 'screen-ads';
        adsScreen.className = 'screen';
        adsScreen.innerHTML = `
            <div class="container">
                <div class="card">
                    <h2><i class="fas fa-bullhorn" style="color:var(--accent);"></i> לוח מודעות</h2>
                    <div id="ads-container">
                        <p style="text-align:center; color:#94a3b8;">טוען פרסומות...</p>
                    </div>
                </div>
            </div>
        `;
        const container = document.querySelector('.container');
        if (container && container.parentNode) container.parentNode.appendChild(adsScreen);
    }

    if (!document.getElementById('completionsModal')) {
        const completionsModal = document.createElement('div');
        completionsModal.id = 'completionsModal';
        completionsModal.className = 'modal-overlay';
        completionsModal.style.display = 'none';
        completionsModal.onclick = (e) => { if (e.target === completionsModal) closeModal(); };
        completionsModal.innerHTML = `
            <div class="modal-content">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3 style="margin:0;">הספרים שסיימתי</h3>
                    <i class="fas fa-times" style="cursor:pointer;" onclick="closeModal()"></i>
                </div>
                <div id="completionsList" style="max-height: 60vh; overflow-y: auto;"></div>
            </div>
        `;
        document.body.appendChild(completionsModal);
    }


    const profileMenu = document.getElementById('profile-dropdown');
    if (profileMenu) {
        profileMenu.innerHTML = `
            <div id="profile-menu-achievements" class="profile-menu-item" onclick="toggleProfileMenu(); showAchievements();">
                <i class="fas fa-medal"></i> הישגים
            </div>
            <div class="profile-menu-item" onclick="toggleProfileMenu(); switchScreen('shop');">
                <i class="fas fa-store"></i> חנות הזכויות
            </div>
            <div class="profile-menu-item" onclick="toggleProfileMenu(); switchScreen('calendar');">
                <i class="fas fa-calendar-alt"></i> לוח זמנים
            </div>
            <div class="profile-menu-item" onclick="toggleProfileMenu(); switchScreen('profile');">
                <i class="fas fa-user-edit"></i> עריכת פרופיל
            </div>
            <div class="profile-menu-item" onclick="toggleProfileMenu(); showFollows();">
                <i class="fas fa-users"></i> עוקבים
                <span id="followersCountBadge" style="margin-right: auto; font-size: 0.9rem; color: inherit; font-weight: normal;">0</span>
            </div>
            <div class="profile-menu-item" style="display: flex; justify-content: space-between; align-items: center;">
                <span><i class="fas fa-moon"></i> מצב לילה</span>
                <label class="switch">
                    <input type="checkbox" id="darkModeSwitch" onchange="toggleDarkMode(event)">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="profile-menu-item" onclick="toggleProfileMenu(); openChat('admin@system', 'תמיכה');">
                <i class="fas fa-headset"></i> תמיכה / פנייה למנהל
                <span id="profileAdminBadge" class="unread-badge" style="display: none; margin-right: auto;">0</span>
            </div>
            <div class="profile-menu-item" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> התנתק
            </div>
        `;
    }

    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput && userSearchInput.parentElement) {
        userSearchInput.parentElement.style.display = 'none';
    }

    if (!document.getElementById('dark-mode-chat-fix')) {
        const style = document.createElement('style');
        style.id = 'dark-mode-chat-fix';
        style.innerHTML = `
            body.dark-mode .msg-other {
                background-color: #334155;
                color:#f1f5f9;
            }
            body.dark-mode .msg-other .msg-sender-name {
                color: #93c5fd;
            }
            body.dark-mode .msg-me {
                background-color: #3730a3;
                color: #e0e7ff;
            }
            body.dark-mode .chat-quote {
                background-color: rgba(200, 200, 255, 0.1);
                border-left-color: #a5b4fc;
                color: #e2e8f0;
            }
        `;
        document.head.appendChild(style);
    }

    if (!document.getElementById('app-ui-improvements')) {
        const uiStyle = document.createElement('style');
        uiStyle.id = 'app-ui-improvements';
        uiStyle.innerHTML = `
            /* הוספת סמן עכבר לחיץ לאלמנטים אינטראקטיביים */
            .result-item, .search-tag, .inbox-item, .profile-menu-item, .chat-list-item, .lb-card, .siyum-card, .tier-card, .amount-chip, .user-select-item {
                cursor: pointer;
            }

            /* 1. אנימציה להופעת הודעות בצ'אט */
            @keyframes floatIn {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .new-message-animation {
                animation: floatIn 0.4s ease-out forwards;
            }

            /* 2. עיצוב מודאל אישור מחיקה */
            #cConfirmMsg {
                margin-bottom: 2rem; /* הרחקת הטקסט מהכפתורים */
            }
            #customConfirmModal .modal-actions {
                display: flex;
                gap: 1rem;
                width: 100%;
            }
            #cConfirmOk, #cConfirmCancel {
                flex: 1; /* גודל זהה */
                padding: 0.75rem 1rem;
                border-radius: 12px; /* פינות מעוגלות */
                font-weight: bold;
                border: none;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            #cConfirmOk {
                background-color: #16a34a; /* ירוק */
                color: white;
            }
            #cConfirmCancel {
                background-color: #ef4444; /* אדום לביטול */
                color: white;
            }

            /* 3. אנימציה לתפריט תחתון */
            .floating-nav-container {
                transition: transform 0.4s ease-in-out, opacity 0.3s ease-in-out;
            }
            .floating-nav-container.nav-hidden {
                transform: translateY(100%);
                opacity: 0;
                pointer-events: none;
            }

            /* 4. עיצוב פופאפ תיוגים */
            .mentions-popup {
                position: absolute;
                bottom: 100%;
                left: 0;
                right: 0;
                margin-bottom: 12px;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.15);
                max-height: 280px;
                overflow-y: auto;
                z-index: 50;
                display: none;
                overflow-x: hidden;
                padding: 4px;
            }
            body.dark-mode .mentions-popup {
                background: #1e293b;
                border-color: #334155;
                box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
            }
            .mention-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                cursor: pointer;
                border-radius: 12px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .mention-item:hover, .mention-item.selected {
                background-color: #f1f5f9;
                transform: translateX(4px);
            }
            body.dark-mode .mention-item:hover, body.dark-mode .mention-item.selected {
                background-color: #334155;
            }
            .mention-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, #60a5fa, #3b82f6);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 14px;
                flex-shrink: 0;
                box-shadow: 0 2px 5px rgba(59, 130, 246, 0.3);
                text-transform: uppercase;
            }
            
            /* עיצוב תיוג בתוך הודעה */
            .mention {
                color: #2563eb;
                font-weight: bold;
                cursor: pointer;
                transition: color 0.2s;
            }
            .mention:hover {
                text-decoration: underline;
                color: #1d4ed8;
            }
            body.dark-mode .mention {
                color: #60a5fa;
            }
            body.dark-mode .mention:hover {
                color: #93c5fd;
            }
            
            /* עיצוב חיווי הקלדה */
            .typing-indicator-box {
                display: none;
                margin-left: 15px;
                margin-bottom: 5px;
                font-size: 0.75rem;
                color: #94a3b8;
                font-style: italic;
            }
            .typing-indicator-box.active {
                display: block;
                animation: floatIn 0.3s ease-out forwards;
            }

            /* הסתרת פסי גלילה במודאל כניסה והרשמה */
            #auth-overlay {
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE 10+ */
            }
            #auth-overlay::-webkit-scrollbar {
                display: none; /* Chrome/Safari */
            }
        `;
        document.head.appendChild(uiStyle);
    }

    const rankContainer = document.getElementById('rank-info')?.closest('.card');
    if (rankContainer) rankContainer.style.display = 'none';

    const headerBookIcon = document.querySelector('.header .fa-book-open');
    if (headerBookIcon) {
        headerBookIcon.style.cursor = 'pointer';
        headerBookIcon.onclick = () => switchScreen('dashboard', document.querySelector('.floating-nav-item'));
    }

    const pagesStat = document.getElementById('stat-pages');
    if (pagesStat && pagesStat.parentElement) {
        Array.from(pagesStat.parentElement.children).forEach(child => {
            if (child !== pagesStat && (child.innerText.includes('דפים') || child.innerText.includes('פרקים'))) {
                child.innerText = 'ניקוד';
            }
        });
    }
}

function showSystemPopup(htmlContent) {
    let modal = document.getElementById('systemPopupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'systemPopupModal';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; width: 90%;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <h2 style="color: var(--accent); margin: 0;">📢 הודעת מערכת</h2>
                </div>
                <div id="systemPopupBody" style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 25px; overflow-y: auto; max-height: 60vh;"></div>
                <div style="text-align: center;">
                    <button class="btn" onclick="document.getElementById('systemPopupModal').style.display='none'">הבנתי, סגור</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('systemPopupBody').innerHTML = htmlContent;
    modal.style.display = 'flex';
    if (typeof bringToFront === 'function') bringToFront(modal);
}

function showMaintenanceOverlay() {
    if (document.getElementById('maintenance-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'maintenance-overlay';
    overlay.className = 'maintenance-overlay';
    overlay.innerHTML = `
        <div class="maintenance-content">
            <div class="maintenance-icon">
                <i class="fas fa-tools"></i>
            </div>
            <h1>אנחנו בשיפוצים!</h1>
            <p>האתר כרגע במצב תחזוקה. המלאכים שלנו עובדים קשה כדי לסדר את הספרים במדפים, לנקות את הסטנדרים ולחזק את השרתים.</p>
            <p style="font-weight:bold;">נחזור בקרוב עם כוחות מחודשים!</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function subscribeToMaintenanceUpdates() {
    const email = document.getElementById('maintenanceEmail').value.trim();
    const isValid = (typeof validateInput === 'function') ? validateInput(email, 'email') : /\S+@\S+\.\S+/.test(email);

    if (!email || !isValid) {
        return customAlert('נא להזין כתובת אימייל תקינה.');
    }

    try {
        await supabaseClient.from('maintenance_subscribers').insert([{ email: email }]);
        await customAlert('תודה! נעדכן אותך מיד כשהאתר יחזור לפעילות.', false);
        document.getElementById('maintenanceEmail').value = '';
    } catch (e) {
        console.error(e);
        await customAlert('תודה! המייל נרשם במערכת.', false);
    }
}
