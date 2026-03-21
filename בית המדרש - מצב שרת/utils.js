const JOKES = [
    "נראה שהסיסמה שלך יצאה לשבתון... נסה שוב אחרי הבדלה.",
    "אפילו משה רבנו היה צריך לבקש את הלוחות פעמיים. נסה שוב!",
    "הסיסמה לא נכונה. אולי שכחת אותה בבית המדרש?",
    "טעות לעולם חוזרת, וגם סיסמה שגויה. נסה שוב!"
];

// זיהוי מצב אופליין
window.addEventListener('offline', () => {
    const overlay = document.createElement('div');
    overlay.id = 'offline-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); color:white; display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:99999; text-align:center;';
    overlay.innerHTML = '<h1 style="font-size:4rem;">📶</h1><h2>אין אינטרנט?</h2><p style="font-size:1.2rem;">זה הזמן המצוין לחזור על תלמודך בעל פה!<br>(או לבדוק את הראוטר...)</p>';
    document.body.appendChild(overlay);
});
window.addEventListener('online', () => {
    const el = document.getElementById('offline-overlay');
    if (el) el.remove();
    showToast("האינטרנט חזר! ברוך מחיה המתים ;)", "success");
});

function customConfirm(msg) {
    const modal = document.getElementById('customConfirmModal');
    if (!modal || !document.getElementById('cConfirmMsg') || !document.getElementById('cConfirmOk') || !document.getElementById('cConfirmCancel')) {
        // Fallback to native confirm if modal elements are not found
        return Promise.resolve(window.confirm(msg));
    }
    return new Promise(resolve => {
        document.getElementById('cConfirmMsg').innerText = msg;
        modal.style.display = 'flex';
        bringToFront(modal);
        document.getElementById('cConfirmOk').onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };
        document.getElementById('cConfirmCancel').onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
}

function customAlert(msg, isHtml = false) {
    const modal = document.getElementById('customAlertModal');
    const msgEl = document.getElementById('cAlertMsg');
    const btn = document.getElementById('cAlertBtn');

    if (!modal || !msgEl || !btn) {
        // Fallback to native alert if modal elements are not found
        const tempDiv = document.createElement('div');
        if (isHtml) {
            tempDiv.innerHTML = msg;
        } else {
            tempDiv.innerText = msg;
        }
        // Use the original window.alert, not the overridden one
        (window.alert.original || window.alert)(tempDiv.textContent || tempDiv.innerText || "");
        return Promise.resolve();
    }

    return new Promise(resolve => {
        modal.style.display = 'flex';
        bringToFront(modal);
        if (isHtml) {
            msgEl.innerHTML = msg;
        } else {
            msgEl.innerText = msg;
        }
        btn.onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
}

function customPrompt(msg, defaultVal = '') {
    const modal = document.getElementById('customPromptModal');
    if (!modal || !document.getElementById('cPromptMsg') || !document.getElementById('cPromptInput') || !document.getElementById('cPromptOk') || !document.getElementById('cPromptCancel')) {
        // Fallback to native prompt if modal elements are not found
        return Promise.resolve(window.prompt(msg, defaultVal));
    }
    return new Promise(resolve => {
        document.getElementById('cPromptMsg').innerText = msg;
        const input = document.getElementById('cPromptInput');
        input.value = defaultVal;
        modal.style.display = 'flex';
        bringToFront(modal);
        input.focus();

        document.getElementById('cPromptOk').onclick = () => {
            modal.style.display = 'none';
            resolve(input.value);
        };
        document.getElementById('cPromptCancel').onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        };
    });
}

// Override native alerts (Item 5)
window.alert.original = window.alert; // Keep a reference to the original
window.alert = customAlert;
window.confirm = customConfirm;
window.prompt = customPrompt;

function formatHebrewDate(dateString) {
    if (!dateString) return 'לא ידוע';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return 'לא ידוע'; }
}

function animateValue(obj, start, end, duration) {
    if (start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // שימוש ב-toLocaleString להוספת פסיקים
        const currentValue = Math.floor(progress * (end - start) + start);
        obj.innerHTML = currentValue.toLocaleString('en-US');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end.toLocaleString('en-US');
        }
    };
    window.requestAnimationFrame(step);
}

function updateHebrewDateDisplay(input, displayId) {
    const el = document.getElementById(displayId);
    if (el && input.value) el.innerText = new Date(input.value).toLocaleDateString('he-IL');
}

function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `לפני ${Math.floor(interval)} שנים`;
    interval = seconds / 2592000;
    if (interval > 1) return `לפני ${Math.floor(interval)} חודשים`;
    interval = seconds / 86400;
    if (interval > 2) return `לפני ${Math.floor(interval)} ימים`;
    if (interval > 1) return 'אתמול';
    interval = seconds / 3600;
    if (interval > 1) return `לפני ${Math.floor(interval)} שעות`;
    interval = seconds / 60;
    if (interval > 1) return `לפני ${Math.floor(interval)} דקות`;
    return 'ממש עכשיו';
}

function getRankName(score) {
    if (score >= 1001) return "תלמיד חכם";
    if (score >= 501) return "צורבא מרבנן";
    if (score >= 101) return "מתמיד";
    return "צורב צעיר";
}

function getRankColor(rankName) {
    switch (rankName) {
        case "תלמיד חכם":
            return '#8b5cf6'; // purple-600
        case "צורבא מרבנן":
            return '#3b82f6'; // blue-600
        case "מתמיד":
            return '#10b981'; // emerald-600
        case "צורב צעיר":
        default:
            return '#64748b'; // slate-500
    }
}

function getFullUserBadges(user) {
    if (!user) return '';
    let badgesHtml = '';
    const rankName = getRankName(user.learned || 0);
    const rankColor = getRankColor(rankName);

    // Learning Rank Badge
    badgesHtml += `<span class="chat-badge" style="background-color: ${rankColor}; border: 1px solid ${rankColor}; color: white;">${rankName}</span>`;

    // Special Badges (from DB)
    if (user.badges && Array.isArray(user.badges)) {
        user.badges.forEach(badge => {
            let badgeColor = badge.toLowerCase() === 'מנהל' ? '#ef4444' : (badge.toLowerCase() === 'רב האתר' ? '#3b82f6' : '#f59e0b');
            badgesHtml += `<span class="chat-badge" style="background-color: transparent; border: 1px solid ${badgeColor}; color: ${badgeColor};">${badge}</span>`;
        });
    }
    return badgesHtml;
}

function bringToFront(element) {
    globalZIndex++;
    element.style.zIndex = globalZIndex;
}

function downloadAsTxt(filename, text) {
    const element = document.createElement('a');
    // BOM for UTF-8 to support Hebrew in notepad
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    element.setAttribute('href', url);
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
    URL.revokeObjectURL(url);
}

function closeModal() {
    // סוגר את כל סוגי החלונות הקופצים שיש במערכת
    const userModal = document.getElementById('userModal');
    const chavrutaModal = document.getElementById('chavrutaModal');
    const scheduleModal = document.getElementById('scheduleModal');
    const adminChatModal = document.getElementById('adminChatModal');
    const bookReaderModal = document.getElementById('bookReaderModal');
    const suggestionModal = document.getElementById('suggestionModal');

    if (userModal) userModal.style.display = 'none';
    if (document.getElementById('adminNotesModal')) document.getElementById('adminNotesModal').style.display = 'none';
    if (chavrutaModal) chavrutaModal.style.display = 'none';
    if (scheduleModal) scheduleModal.style.display = 'none';
    if (adminChatModal) adminChatModal.style.display = 'none';
    if (bookReaderModal) {
        bookReaderModal.style.display = 'none';
        const frame = document.getElementById('bookReaderFrame');
        if (frame) frame.src = 'about:blank'; // Stop loading
        if (document.body.classList.contains('focus-mode')) toggleFocusMode(); // יציאה ממצב מרוכז בסגירה
    }
    if (document.getElementById('donationModal')) document.getElementById('donationModal').style.display = 'none';
    if (suggestionModal) suggestionModal.style.display = 'none';
    if (document.getElementById('achievementsModal')) document.getElementById('achievementsModal').style.display = 'none';
    if (document.getElementById('followersModal')) document.getElementById('followersModal').style.display = 'none';

    if (document.getElementById('completionsModal')) document.getElementById('completionsModal').style.display = 'none';
    if (chatInterval) clearInterval(chatInterval);
    if (document.getElementById('notesModal')) document.getElementById('notesModal').style.display = 'none';
}

// פונקציה לקיצור טקסט מתוך HTML
function truncateHtmlText(htmlString, maxLength) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    let plainText = tempDiv.textContent || tempDiv.innerText || '';
    if (plainText.length > maxLength) {
        return plainText.substring(0, maxLength) + '...';
    }
    return plainText;
}
