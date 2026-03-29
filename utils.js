const JOKES = [
    "נראה שהסיסמה שלך יצאה לשבתון... נסה שוב אחרי הבדלה.",
    "אפילו משה רבנו היה צריך לבקש את הלוחות פעמיים. נסה שוב!",
    "הסיסמה לא נכונה. אולי שכחת אותה בבית המדרש?",
    "טעות לעולם חוזרת, וגם סיסמה שגויה. נסה שוב!"
];

window.addEventListener('offline', () => {
    if (document.getElementById('offline-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'offline-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display:flex; justify-content:center; align-items:center; z-index:99999; animation: fadeIn 0.3s; padding: 20px; box-sizing: border-box;';

    overlay.innerHTML = `
        <div style="background: var(--card-bg, #ffffff); color: var(--text-main, #333333); width: 100%; max-width: 420px; padding: 2rem; border-radius: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); position: relative; border: 1px solid var(--border-color, #e2e8f0);">
            <button onclick="document.getElementById('offline-overlay').remove()" style="position: absolute; top: 1rem; left: 1rem; background: none; border: none; font-size: 1.25rem; color: #94a3b8; cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--danger, #ef4444)'" onmouseout="this.style.color='#94a3b8'">
                <i class="fas fa-times"></i>
            </button>
            
            <div style="width: 72px; height: 72px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; color: #ef4444;">
                <span class="material-icons-round" style="font-size: 2.5rem;">wifi_off</span>
            </div>
            
            <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0 0 0.75rem 0; color: var(--text-main); display: block; text-align: center;">אין חיבור אינטרנט</h2>
            
            <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
                נראה שהתנתקת מהרשת. הנתונים המקומיים שלך שמורים והאפליקציה תמשיך לעבוד במצב אופליין.
            </p>
            
            <div style="background: var(--bg, #f8fafc); border: 1px dashed #cbd5e1; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
                <p style="margin: 0; font-size: 0.9rem; color: var(--accent, #ca8a04); font-weight: 500;">
                    <i class="fas fa-lightbulb" style="margin-left: 5px;"></i>זה זמן מצוין לחזרה על תלמודך!
                </p>
            </div>
            
            <button class="btn" onclick="document.getElementById('offline-overlay').remove()" style="width: 100%; justify-content: center; padding: 12px; font-size: 1rem;">
                הבנתי, המשך ללמוד
            </button>
        </div>
    `;
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
        const tempDiv = document.createElement('div');
        if (isHtml) {
            tempDiv.innerHTML = msg;
        } else {
            tempDiv.innerText = msg;
        }
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

window.alert.original = window.alert;
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
            return '#8b5cf6';
        case "צורבא מרבנן":
            return '#3b82f6';
        case "מתמיד":
            return '#10b981';
        case "צורב צעיר":
        default:
            return '#64748b';
    }
}

function getFullUserBadges(user) {
    if (!user) return '';
    let badgesHtml = '';
    const rankName = getRankName(user.learned || 0);
    const rankColor = getRankColor(rankName);


    badgesHtml += `<span class="chat-badge" style="background-color: ${rankColor}; border: 1px solid ${rankColor}; color: white;">${rankName}</span>`;



    return badgesHtml;
}

function bringToFront(element) {
    globalZIndex++;
    element.style.zIndex = globalZIndex;
}

function downloadAsTxt(filename, text) {
    const element = document.createElement('a');
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
        if (frame) frame.src = 'about:blank';
        if (document.body.classList.contains('focus-mode')) toggleFocusMode();
    }
    if (document.getElementById('donationModal')) document.getElementById('donationModal').style.display = 'none';
    if (suggestionModal) suggestionModal.style.display = 'none';
    if (document.getElementById('achievementsModal')) document.getElementById('achievementsModal').style.display = 'none';
    if (document.getElementById('followersModal')) document.getElementById('followersModal').style.display = 'none';

    if (document.getElementById('completionsModal')) document.getElementById('completionsModal').style.display = 'none';
    if (chatInterval) clearInterval(chatInterval);
    if (document.getElementById('notesModal')) document.getElementById('notesModal').style.display = 'none';
}

function truncateHtmlText(htmlString, maxLength) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    let plainText = tempDiv.textContent || tempDiv.innerText || '';
    if (plainText.length > maxLength) {
        return plainText.substring(0, maxLength) + '...';
    }
    return plainText;
}
