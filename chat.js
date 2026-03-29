async function searchChats(query) {
    if (!currentUser) return [];
    
    let { data, error } = await supabaseClient.rpc('search_my_chats', {
        p_my_email: currentUser.email,
        p_query: query
    });

    if (error) {
        const { data: directData, error: directError } = await supabaseClient
            .from('chat_messages')
            .select('*')
            .or(`sender_email.eq.${currentUser.email},receiver_email.eq.${currentUser.email}`)
            .ilike('message', `%${query}%`);
        data = directData;
        error = directError;
    }

    if (error) {
        console.error("Chat search error:", error);
        return [];
    }
    return data;
}

let chatPollTimer = null;

function startChatPolling() {
    if (!chatPollTimer) {
        pollChats();
    }
}

async function pollChats() {
    const windows = document.querySelectorAll('.chat-window');
    if (windows.length === 0) {
        chatPollTimer = null;
        return;
    }

    for (const win of windows) {
        const partnerEmail = win.id.replace('chat-window-', '');
        await checkNewMessagesFor(partnerEmail);
    }
    chatPollTimer = setTimeout(pollChats, 3000);
}

function getChatContainer(partnerEmail) {
    const popup = document.getElementById(`chat-window-${partnerEmail}`);
    if (popup) return popup.querySelector('.chat-messages-area');
    return document.getElementById(`msgs-${partnerEmail}`);
}

async function checkNewMessagesFor(partnerEmail) {
    const container = getChatContainer(partnerEmail);
    if (!container) return;


    if (container.querySelector('.chat-loading-indicator')) return;

    let lastTime = new Date(0).toISOString();
    const bubbles = container.querySelectorAll('.message-bubble');
    if (bubbles.length > 0) {
        const lastBubble = bubbles[bubbles.length - 1];
        if (lastBubble.dataset.timestamp) lastTime = lastBubble.dataset.timestamp;
    }

    try {
        let { data, error } = await supabaseClient.rpc('get_new_messages', {
            p_my_email: currentUser.email,
            p_partner_email: partnerEmail,
            p_last_time: lastTime
        });

        if (error) {
            const { data: directData, error: directError } = await supabaseClient
                .from('chat_messages')
                .select('*')
                .or(`and(sender_email.ilike.${currentUser.email},receiver_email.ilike.${partnerEmail}),and(sender_email.ilike.${partnerEmail},receiver_email.ilike.${currentUser.email})`)
                .gt('created_at', lastTime);
            data = directData;
            error = directError;
        }

        if (error) throw error;
        if (data && data.length > 0) {
            data.forEach(msg => {
                const type = msg.sender_email.toLowerCase() === currentUser.email.toLowerCase() ? 'me' : 'other';
                appendMessageToWindow(partnerEmail, msg.message, type, msg.id, msg.created_at, msg.is_read, msg.sender_email);
                if (type === 'other') {
                    const win = document.getElementById(`chat-window-${partnerEmail}`);
                    if (win && win.classList.contains('minimized')) win.classList.add('flashing');
                    else markAsRead(partnerEmail);
                }
            });
        }
    } catch (e) { console.error("Polling error", e); }
}

let activeChats = {}; 

function getCurrentChatEmail() {
    return isAdminMode ? 'admin@system' : currentUser.email;
}

function openBookChat(bookName) {
    openChat('book:' + bookName, 'צ\'אט: ' + bookName);
}

function openChat(partnerEmail, partnerName, startMinimized = false, forceFloating = false) {
    if (!requireAuth()) return;

    const isBook = partnerEmail.startsWith('book:');
    if (!isBook) partnerEmail = partnerEmail.toLowerCase();

    if (partnerEmail === 'admin@system') {
        partnerName = 'הודעת מנהל';
    }
    if (partnerEmail === 'updates@system') {
        partnerName = 'עדכונים ממשתמשים שאני עוקב אחריהם';
    }
    if (partnerEmail === 'mentions@system') {
        partnerName = 'אזכורים ותיוגים';
    }
    const isUpdates = partnerEmail === 'updates@system';
    const isMentions = partnerEmail === 'mentions@system';

    if (!forceFloating && document.getElementById('screen-chats').classList.contains('active')) {
        loadChatIntoMainArea(partnerEmail, partnerName);
        return;
    }

    let bookOnlineCount = 0;
    if (isBook) {
        const bookName = partnerEmail.replace('book:', '');
        const now = new Date();
        bookOnlineCount = globalUsersData.filter(u =>
            u.books &&
            u.books.includes(bookName) &&
            u.lastSeen &&
            (now - new Date(u.lastSeen) < 5 * 60 * 1000)
        ).length;
    }

    if (document.getElementById(`chat-window-${partnerEmail}`)) {
        const win = document.getElementById(`chat-window-${partnerEmail}`);
        win.classList.remove('minimized');
        win.querySelector('input')?.focus();
        return;
    }

    if (unreadMessages[partnerEmail]) {
        unreadMessages[partnerEmail] = 0;
        localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
        if (typeof updateChatBadge === 'function') updateChatBadge();
        if (document.getElementById('screen-chavrutas').classList.contains('active')) renderChavrutas();
    }

    const isBlocked = blockedUsers.includes(partnerEmail);
    const blockClass = isBlocked ? 'blocked' : '';
    const blockIconColor = isBlocked ? '#ef4444' : '#ef4444';
    const banIconClass = isBlocked ? 'text-red-500' : 'text-red-400';
    const isSystem = partnerEmail === 'admin@system';
    const banStyle = (isSystem || isBook || isUpdates) ? 'display:none;' : `color:${blockIconColor}; cursor:pointer;`;

    const chatHtml = `
        <div class="chat-window ${blockClass} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl overflow-hidden flex flex-col" id="chat-window-${partnerEmail}">
            <div class="chat-header bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center cursor-pointer" onclick="toggleChatWindow('${partnerEmail}')">
                <div class="flex items-center gap-3">
                    ${isBook ? '<i class="fas fa-book"></i>' : (isSystem ? '<i class="fas fa-shield-alt text-red-500"></i>' : (isUpdates ? '<i class="fas fa-bullhorn text-amber-500"></i>' : (isMentions ? '<i class="fas fa-at text-amber-500"></i>' : `<span class="online-dot" id="online-${partnerEmail}"></span>`)))}
                    <div class="flex flex-col">
                        <span class="font-bold text-lg leading-tight text-slate-800 dark:text-white leading-tight">${partnerName}</span>
                        ${isBook ? `<span class="text-[10px] ${bookOnlineCount > 0 ? 'text-emerald-500 font-bold' : 'text-slate-500'} dark:text-slate-400 font-normal">${bookOnlineCount} לומדים מחוברים</span>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-3 text-slate-400">
                    <i class="fas fa-ban ${banIconClass} hover:text-red-600 transition-colors" onclick="event.stopPropagation(); openReportModal('${partnerEmail}')" title="דיווח וחסימה" style="${banStyle}" id="block-btn-${partnerEmail}"></i>
                    <i class="fas fa-minus hover:text-slate-600 transition-colors" onclick="event.stopPropagation(); toggleChatWindow('${partnerEmail}')" title="מזער"></i>
                    <i class="fas fa-expand hover:text-slate-600 transition-colors" onclick="event.stopPropagation(); expandChatToScreen('${partnerEmail}', '${partnerName.replace(/'/g, "\\'")}')" title="פתח במסך מלא"></i>
                    <i class="fas fa-times hover:text-slate-600 transition-colors" onclick="event.stopPropagation(); closeChatWindow('${partnerEmail}')"></i>
                </div>
            </div>
            <div class="chat-body">
                ${isSystem ? `<div class="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs p-2 text-center border-b border-yellow-100 dark:border-yellow-800 font-medium">עקב תקלות טעינה, מומלץ לעבור לצ'אט זה במצב מסך מלא <button class="underline font-bold mr-1 hover:text-yellow-900 dark:hover:text-yellow-100" onclick="expandChatToScreen('${partnerEmail}', '${partnerName.replace(/'/g, "\\'")}')">מעבר למסך מלא</button></div>` : ''}
                <div class="chat-messages-area flex flex-col" id="msgs-${partnerEmail}">
                    <div class="chat-loading-indicator" style="text-align:center; padding:20px; color:#94a3b8;"><i class="fas fa-circle-notch fa-spin"></i> טוען צ'אט...</div>
                </div>
                <div class="typing-indicator-box" id="typing-${partnerEmail}"></div>
                ${isUpdates || isMentions ?
            `<footer class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">ערוץ לקריאה בלבד</footer>` :
            `<footer class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <div class="max-w-5xl mx-auto relative flex items-center gap-3">
                        <div id="mentions-popup-${partnerEmail}" class="mentions-popup"></div>
                        <input type="text" id="input-${partnerEmail}" autocomplete="off" class="w-full h-12 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-5 text-sm focus:ring-2 focus:ring-blue-500/50 dark:text-white dark:placeholder-slate-500" placeholder="הקלד הודעה..." 
                        oninput="handleTyping('${partnerEmail}'); handleMentionInput(event, '${partnerEmail}')" 
                        onkeyup="saveChatDraft('${partnerEmail}', this.value)"
                        onkeypress="if(event.key === 'Enter' && !isMentionPopupActive()) sendMessage('${partnerEmail}')"
                        onkeydown="return handleMentionKeyDown(event, '${partnerEmail}')">
                        <button class="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-slate-800 transition-transform active:scale-95 shadow-md shrink-0" onclick="sendMessage('${partnerEmail}')">
                            <span class="material-icons-round transform -scale-x-100">send</span>
                        </button>
                    </div>
                </footer>`}
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHtml);
    bringToFront(document.getElementById(`chat-window-${partnerEmail}`));
    rearrangeMinimizedWindows();

    if (!isBook && !isUpdates) {
        const partner = globalUsersData.find(u => u.email === partnerEmail);
        if (partnerEmail === 'admin@system' || (partner && partner.lastSeen && (new Date() - new Date(partner.lastSeen) < 5 * 60 * 1000))) {
            const onlineDot = document.getElementById(`online-${partnerEmail}`);
            if (onlineDot) onlineDot.classList.add('active');
        }
    }

    loadChatHistory(partnerEmail);

    const draft = localStorage.getItem('chat_draft_' + partnerEmail);
    if (draft) document.getElementById('input-' + partnerEmail).value = draft;

    if (startMinimized) {
        const win = document.getElementById(`chat-window-${partnerEmail}`);
        if (win && unreadMessages[partnerEmail] > 0) { 
            win.classList.add('minimized');
            win.classList.add('flashing');
            rearrangeMinimizedWindows();
        }
    } else {
        markAsRead(partnerEmail);
    }
    startChatPolling();
}

function expandChatToScreen(email, name) {
    closeChatWindow(email);

    let category = 'personal';
    if (email.startsWith('book:')) category = 'public';
    else if (email.includes('@system')) category = 'other';
    else if (typeof approvedPartners !== 'undefined' && !approvedPartners.has(email)) category = 'archive';

    const navItem = document.querySelector('.floating-nav-item[onclick*="chats"]');
    switchScreen('chats', navItem, category);

    loadChatIntoMainArea(email, name);
}

let currentChatFilter = 'personal';

async function renderChatList(filter, tabEl, isBackgroundUpdate = false) {
    currentChatFilter = filter;
    const cacheKey = `chatListCache_${filter}`;

    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    if (tabEl && tabEl.classList.contains('chat-tab')) {
        tabEl.classList.add('active');
    } else {
        const tabs = document.querySelectorAll('.chat-tabs-inner .chat-tab');
        if (filter === 'personal' && tabs[0]) tabs[0].classList.add('active');
        else if (filter === 'public' && tabs[1]) tabs[1].classList.add('active');
        else if (filter === 'other' && tabs[2]) tabs[2].classList.add('active');
    }
    if (filter === 'archive') {
        const mainArea = document.getElementById('chat-main-area');
        mainArea.innerHTML = `<div style="margin: auto; color: #94a3b8; text-align: center;"><i class="fas fa-archive" style="font-size: 3rem; opacity: 0.3;"></i><p>ארכיון צ'אטים</p></div>`;
    }

    const container = document.getElementById('chat-list-container');
    if (!isBackgroundUpdate) {
        const cachedHtml = localStorage.getItem(cacheKey);
        if (cachedHtml) {
            container.innerHTML = cachedHtml;
        } else {
            container.innerHTML = '<div class="text-center p-5 text-slate-400">טוען...</div>';
        }
    }

    let { data, error } = await supabaseClient.rpc('get_my_conversations', {
        p_my_email: currentUser.email
    });

    if (error) {
        const { data: directData, error: directError } = await supabaseClient
            .from('chat_messages')
            .select('*')
            .or(`sender_email.eq.${currentUser.email},receiver_email.eq.${currentUser.email}`)
            .order('created_at', { ascending: false });
        data = directData;
        error = directError;
    }

    if (error) console.error("Error fetching conversations:", error);

    const partners = new Set();
    const chats = [];

    if (data) {
        data.forEach(msg => {
            const isMe = msg.sender_email === currentUser.email;
            const partner = isMe ? msg.receiver_email : msg.sender_email;

            if (!partners.has(partner)) {
                partners.add(partner);

                let category;
                if (partner.startsWith('book:')) {
                    category = 'public';
                } else if (partner.includes('@system')) {
                    category = 'other';
                } else if (approvedPartners.has(partner)) {
                    category = 'personal';
                } else {
                    category = 'archive';
                }

                if (category === filter) {
                    chats.push({
                        email: partner,
                        lastMsg: msg.message,
                        time: msg.created_at,
                        unread: (!isMe && !msg.is_read)
                    });
                }
            }
        });
    }

    if (filter === 'public' && typeof userGoals !== 'undefined') {
        userGoals.forEach(goal => {
            if (goal.status === 'active') {
                const bookEmail = 'book:' + goal.bookName;
                if (!partners.has(bookEmail)) {
                    partners.add(bookEmail);
                    chats.push({
                        email: bookEmail,
                        lastMsg: 'הצטרף לשיח הלומדים',
                        time: goal.startDate || new Date().toISOString(),
                        unread: false
                    });
                }
            }
        });
    }

    if (filter === 'personal') {
        approvedPartners.forEach(partnerEmail => {
            if (!partners.has(partnerEmail)) {
                partners.add(partnerEmail);
                chats.push({
                    email: partnerEmail,
                    lastMsg: 'קבעתם חברותא! התחילו את השיחה.',
                    time: new Date().toISOString(),
                    unread: false
                });
            }
        });
    }

    chats.sort((a, b) => new Date(b.time) - new Date(a.time));

    let newHTML = '';

    if (filter === 'other') {
        newHTML += `
            <div class="chat-list-item" onclick="renderMazalTovInMainArea()">
                <div style="width:40px; height:40px; background:#fef3c7; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-left:10px;">
                    <i class="fas fa-glass-cheers" style="color:#d97706;"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:bold;">לוח סיומים (מזל טוב)</div>
                    <div style="font-size:0.85rem; color:#64748b;">חגיגות סיומי מסכת בקהילה</div>
                </div>
            </div>
        `;
    }

    if (filter === 'other') {
        const systemChats = ['admin@system', 'updates@system', 'mentions@system'];
        systemChats.forEach(sysEmail => {
            if (!chats.some(c => c.email === sysEmail)) {
                let desc = '';
                if (sysEmail === 'admin@system') desc = 'הודעות מערכת והנהלה';
                else if (sysEmail === 'updates@system') desc = 'עדכונים ממשתמשים שאני עוקב אחריהם';
                else if (sysEmail === 'mentions@system') desc = 'אזכורים ותיוגים אישיים';
                chats.push({
                    email: sysEmail,
                    lastMsg: desc,
                    time: new Date().toISOString(),
                    unread: false
                });
            }
        });
    }

    if (chats.length === 0) {
        let emptyMsg = 'אין צ\'אטים בקטגוריה זו.';
        if (filter === 'personal') {
            emptyMsg += '<br><span style="font-size:0.9em; display:block; margin-top:8px;">יש למצוא חברותא כדי להתחיל לשוחח.</span>';
        } else if (filter === 'public') {
            emptyMsg += '<br><span style="font-size:0.9em; display:block; margin-top:8px;">יש להתחיל ללמוד ספר כדי להצטרף לשיח.</span>';
        }
        newHTML = `<div class="text-center p-5 text-slate-400">${emptyMsg}</div>`;
    } else {
        chats.forEach(chat => {
            const user = globalUsersData.find(u => u.email && chat.email && u.email.toLowerCase() === chat.email.toLowerCase());
            const name = user ? user.name : (chat.email.startsWith('book:') ? chat.email.replace('book:', '') : (chat.email === 'admin@system' ? 'מנהל' : (chat.email === 'updates@system' ? 'עדכונים ממשתמשים שאני עוקב אחריהם' : (chat.email === 'mentions@system' ? 'אזכורים' : chat.email.split('@')[0]))));

            const isOnline = chat.email === 'admin@system' || (user && user.lastSeen && (new Date() - new Date(user.lastSeen) < 5 * 60 * 1000));

            const msgDate = new Date(chat.time);
            const now = new Date();
            const isToday = msgDate.toDateString() === now.toDateString();
            const timeDisplay = isToday ? msgDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : msgDate.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });

            const truncatedLastMsg = truncateHtmlText(chat.lastMsg, 60);
            const initial = name ? name.charAt(0) : '?';

            let iconHtml = initial;
            if (chat.email.startsWith('book:')) iconHtml = '<i class="fas fa-book"></i>';
            else if (chat.email === 'admin@system') iconHtml = '<i class="fas fa-shield-alt text-red-500"></i>';
            else if (chat.email === 'updates@system') iconHtml = '<i class="fas fa-bullhorn text-amber-500"></i>';
            else if (chat.email === 'mentions@system') iconHtml = '<i class="fas fa-at text-amber-500"></i>';
            else if (chat.email.includes('@system')) iconHtml = '<i class="fas fa-robot"></i>';

            newHTML += `
            <div class="chat-list-item p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer border border-transparent flex items-center gap-3 ${chat.unread ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : ''}" onclick="loadChatIntoMainArea('${chat.email}', '${name.replace(/'/g, "\\'")}', this)">
                
                <div class="relative flex-shrink-0">
                    <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                        ${iconHtml}
                    </div>
                    ${isOnline ? `<span class="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>` : ''}
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-baseline mb-0.5">
                        <span class="font-bold text-sm text-slate-900 dark:text-white truncate">${name}</span>
                        <span class="text-[10px] text-slate-400 whitespace-nowrap">${timeDisplay}</span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 truncate ${chat.unread ? 'font-bold text-slate-800 dark:text-slate-200' : ''}">${truncatedLastMsg}</p>
                </div>
            </div>
        `;
        });
    }

    if (newHTML !== localStorage.getItem(cacheKey)) {
        container.innerHTML = newHTML;
        localStorage.setItem(cacheKey, newHTML);
    }
}
function loadChatIntoMainArea(email, name, el) {
    if (!email.startsWith('book:')) email = email.toLowerCase();
    const main = document.getElementById('chat-main-area');
    main.innerHTML = '';

    document.querySelectorAll('.chat-list-item').forEach(item => item.classList.remove('bg-slate-100', 'dark:bg-slate-800'));
    if (el) {
        el.classList.add('bg-slate-100', 'dark:bg-slate-800');
        el.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
        const dot = el.querySelector('.chat-list-unread-dot');
        if (dot) dot.remove();
    }

    const isBlocked = blockedUsers.includes(email);
    const blockIconColor = isBlocked ? '#ef4444' : '#94a3b8';
    const isBook = email.startsWith('book:');
    const isUpdates = email === 'updates@system';
    const isMentions = email === 'mentions@system';
    const isArchived = !isBook && !email.includes('@system') && !approvedPartners.has(email);
    const isSystem = email.includes('@system');
    const isAdmin = email === 'admin@system';

    let bookOnlineCount = 0;
    if (isBook) {
        const bookName = email.replace('book:', '');
        const now = new Date();
        bookOnlineCount = globalUsersData.filter(u =>
            u.books &&
            u.books.includes(bookName) &&
            u.lastSeen &&
            (now - new Date(u.lastSeen) < 5 * 60 * 1000)
        ).length;
    }

    const partner = globalUsersData.find(u => u.email === email);
    const isOnline = email === 'admin@system' || (partner && partner.lastSeen && (new Date() - new Date(partner.lastSeen) < 5 * 60 * 1000));
    const statusText = isOnline ? 'מחובר כעת' : 'לא מחובר';
    const finalStatusText = isBook ? `${bookOnlineCount} לומדים מחוברים` : (isUpdates ? 'ערוץ עדכונים' : (isMentions ? 'מערכת התראות' : statusText));

    let statusColorClass = isOnline ? 'text-emerald-500' : 'text-red-500';
    if (isBook && bookOnlineCount > 0) {
        statusColorClass = 'text-emerald-500';
    }
    const statusDotBgClass = isOnline ? 'bg-emerald-400' : 'bg-red-500';
    const avatarInitial = name.charAt(0);

    const chatHtml = `
        <header class="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-6 justify-between shadow-sm z-20">
            <div class="flex items-center gap-3">
                <div class="relative">
                    <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">${isBook ? '<i class="fas fa-book"></i>' : (isAdmin ? '<i class="fas fa-shield-alt text-red-500 text-xl leading-none"></i>' : (isUpdates ? '<i class="fas fa-bullhorn text-amber-500"></i>' : (isMentions ? '<i class="fas fa-at text-amber-500"></i>' : avatarInitial)))}</div>
                    ${!isBook && !isUpdates && !isMentions ? `<span class="absolute bottom-0 left-0 w-3 h-3 rounded-full ${statusDotBgClass} border-2 border-white dark:border-slate-900"></span>` : ''}
                </div>
                <div class="flex flex-col">
                    <span class="font-bold text-lg leading-tight text-slate-800 dark:text-white">${name}</span>
                    <span class="text-[10px] ${isUpdates || isMentions ? 'text-amber-500' : statusColorClass} font-medium">${finalStatusText}</span>
                </div>
 </div>
            <div class="flex items-center gap-4">
                ${!isSystem && !isBook ? `<button class="hover:bg-slate-100 p-1.5 rounded-full transition-colors" onclick="openReportModal('${email}')"><span class="material-icons-round text-xl text-slate-500">block</span></button>` : ''}
                <button class="hover:bg-slate-100 p-1.5 rounded-full transition-colors" onclick="minimizeMainChat('${email}', '${name.replace(/'/g, "\\'")}')"><span class="material-icons-round text-xl text-slate-500">open_in_full</span></button>
                <button class="hover:bg-slate-100 p-1.5 rounded-full transition-colors" onclick="closeMainChat()"><span class="material-icons-round text-xl text-rose-400">close</span></button>
            </div>
        </header>
        <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/95 flex flex-col" id="msgs-${email}">
            <div class="chat-loading-indicator" style="text-align:center; padding:20px; color:#94a3b8;"><i class="fas fa-circle-notch fa-spin"></i> טוען צ'אט...</div>
        </div>
        ${isArchived || isUpdates || isMentions ? `
            <footer class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div class="text-center text-slate-500 p-2">${isUpdates || isMentions ? 'ערוץ לקריאה בלבד.' : 'צ\'אט זה בארכיון (לקריאה בלבד).'}</div>
            </footer>
        ` : `
            <footer class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div id="reply-preview-${email}" class="reply-preview"></div>
                <div class="max-w-5xl mx-auto relative flex items-center gap-3">
                    <div id="mentions-popup-${email}" class="mentions-popup"></div>
                    <input type="text" id="input-${email}" autocomplete="off" class="w-full h-12 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-5 text-sm focus:ring-2 focus:ring-blue-500/50 dark:text-white dark:placeholder-slate-500" placeholder="הקלד הודעה..." 
                        oninput="handleTyping('${email}'); handleMentionInput(event, '${email}')" 
                        onkeypress="if(event.key === 'Enter' && !isMentionPopupActive()) sendMessage('${email}')"
                        onkeydown="return handleMentionKeyDown(event, '${email}')">
                    <button class="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-slate-800 transition-transform active:scale-95 shadow-md shrink-0" onclick="sendMessage('${email}')">
                        <span class="material-icons-round transform -scale-x-100">send</span>
                    </button>
                </div>
            </footer>
        `}
    `;
    main.innerHTML = chatHtml;

    loadChatHistory(email);

    markAsRead(email);
}

function closeMainChat() {
    document.getElementById('chat-main-area').innerHTML = `
        <div style="margin: auto; color: #94a3b8; text-align: center;">
            <i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3;"></i>
            <p>בחר צ'אט מהרשימה</p>
        </div>`;
}

function minimizeMainChat(email, name) {
    closeMainChat();
    openChat(email, name, true, true);
}

function rearrangeMinimizedWindows() {
    const minimized = document.querySelectorAll('.chat-window.minimized');
    minimized.forEach((win, index) => {
        win.style.bottom = (90 + index * 60) + 'px';
    });
}

function closeChatWindow(email) {
    const win = document.getElementById(`chat-window-${email}`);
    if (win) win.remove();
    rearrangeMinimizedWindows();
}

function toggleChatWindow(email) {
    const win = document.getElementById(`chat-window-${email}`);
    if (win) {
        win.classList.toggle('minimized');
        win.classList.remove('flashing'); 

        if (!win.classList.contains('minimized')) {
            win.style.bottom = '';
            markAsRead(email);
        }
        rearrangeMinimizedWindows();
    }
}

async function loadChatHistory(partnerEmail) {
    const myEmail = getCurrentChatEmail();

    let { data, error } = await supabaseClient.rpc('get_chat_history', {
        p_my_email: myEmail,
        p_partner_email: partnerEmail
    });

    if (error) {
        const { data: directData, error: directError } = await supabaseClient
            .from('chat_messages')
            .select('*')
            .or(`and(sender_email.ilike.${myEmail},receiver_email.ilike.${partnerEmail}),and(sender_email.ilike.${partnerEmail},receiver_email.ilike.${myEmail})`)
            .order('created_at', { ascending: true });
        data = directData;
        error = directError;
    }

    if (error) console.error("שגיאה בטעינת צ'אט:", error);

    const container = getChatContainer(partnerEmail);
    if (!container) return;

    const loader = container.querySelector('.chat-loading-indicator');
    if (loader) loader.remove();

    if (data) {
        const isBook = partnerEmail.startsWith('book:');
        container.innerHTML = '';
        data.forEach(msg => {
        
            const hasReplies = data.some(m => m.message.includes(`ref:${msg.id}`));

            const type = (msg.sender_email.toLowerCase() === myEmail.toLowerCase()) ? 'me' : 'other';
            const el = appendMessageToWindow(partnerEmail, msg.message, type, msg.id, msg.created_at, msg.is_read, msg.sender_email, false);

            if (hasReplies && el) {
                const indicator = document.createElement('span');
                indicator.className = 'thread-active-indicator';
                indicator.title = "יש תגובות בשרשור";
                const bubble = el.querySelector('.message-bubble') || el;
                bubble.appendChild(indicator);
            }
        });

        if (isBook && data.length > 0) {
            const msgIds = data.map(m => m.id);
            const { data: allLikes } = await supabaseClient
                .from('message_reactions')
                .select('message_id')
                .in('message_id', msgIds)
                .eq('reaction_type', 'like');

            if (allLikes) {
                const counts = {};
                allLikes.forEach(l => counts[l.message_id] = (counts[l.message_id] || 0) + 1);
                Object.entries(counts).forEach(([mid, count]) => {
                    const el = document.getElementById(`like-count-${mid}`);
                    if (el && count > 0) {
                        el.innerText = count;
                        el.style.display = 'inline';
                    }
                });
            }
        }

        if (isBook && data.length > 0) {
            const msgIds = data.map(m => m.id);
            const { data: reactions } = await supabaseClient
                .from('message_reactions')
                .select('message_id, reaction_type')
                .in('message_id', msgIds)
                .eq('user_email', currentUser.email);

            if (reactions) {
                reactions.forEach(r => {
                    const btnIcon = document.querySelector(`#msg-${r.message_id} .reaction-btn i.fa-thumbs-${r.reaction_type === 'like' ? 'up' : 'down'}`);
                    if (btnIcon && btnIcon.parentElement) {
                        const btn = btnIcon.parentElement;
                        btn.classList.add('active');
                        btn.style.color = r.reaction_type === 'like' ? '#22c55e' : '#ef4444';
                        btn.dataset.reaction = r.reaction_type;
                    }
                });
            }
        }

        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
}

async function loadChatRating() {
    const display = document.getElementById('chatRatingDisplay');
    if (!currentUser) return;

    const { data: messages, error } = await supabaseClient.rpc('get_my_message_ids', {
        p_my_email: currentUser.email
    });
    if (error) { console.error("Error getting message IDs for rating:", error); return; }

    if (messages && messages.length > 0) {
        const ids = messages.map(m => m.id);
        const { count } = await supabaseClient.from('message_reactions').select('*', { count: 'exact', head: true }).in('message_id', ids).eq('reaction_type', 'like');

        const rating = count || 0;
        if (display) display.innerText = rating;

        const dashStat = document.getElementById('stat-rating');
        if (dashStat) dashStat.innerText = rating;

        localStorage.setItem('torahApp_rating', rating);
    } else {
        if (display) display.innerText = 0;
        const dashStat = document.getElementById('stat-rating');
        if (dashStat) dashStat.innerText = 0;
        localStorage.setItem('torahApp_rating', 0);
    }
}

async function doSendMessage(partnerEmail, finalMsg, isHtml) {
    visualizeNetworkActivity('request', {
        action: 'sendMessage',
        from: currentUser.email,
        to: partnerEmail,
        isBoring: false
    });

    const tempId = 'temp-' + Date.now() + Math.random();
    const tempEl = appendMessageToWindow(partnerEmail, finalMsg, 'me', tempId, new Date().toISOString(), false, currentUser.email);
    if (tempEl) tempEl.style.opacity = '0.7';

    const sender = getCurrentChatEmail();
    try {
        let { data, error } = await supabaseClient.rpc('send_message', {
            p_sender_email: sender,
            p_receiver_email: partnerEmail,
            p_message: finalMsg,
            p_is_html: isHtml
        });

        if (error) {
            const { data: directData, error: directError } = await supabaseClient
                .from('chat_messages')
                .insert([{
                    sender_email: sender,
                    receiver_email: partnerEmail,
                    message: finalMsg,
                    is_html: isHtml
                }]).select();
            data = directData;
            error = directError;
        }

        if (error) {
            if (tempEl) tempEl.remove();
            console.error("Supabase RPC Error:", error);
            if (error.message) {
                await showToast(error.message, "error");
            } else if (error.code === "401") {
                await customAlert("שגיאת שליחה: אין הרשאה (401).<br>בדוק את מפתח ה-API בקובץ api.js.", true);
            } else {
                await customAlert("שגיאה בשליחה: " + error.message);
            }
        } else if (data && data[0]) {
            if (tempEl) tempEl.remove();
            const newMsg = data[0];
            if (chatChannel) {
                chatChannel.send({ type: 'broadcast', event: 'private_message', payload: { message: newMsg } });
            }
            if (isHtml) {
                const mentionMatches = finalMsg.matchAll(/<span class="mention" data-user-email="([^"]+)">@([^<]+)<\/span>/g);
                for (const match of mentionMatches) sendMentionNotification(match[1], partnerEmail);
            }
            appendMessageToWindow(partnerEmail, newMsg.message, 'me', newMsg.id, newMsg.created_at, false, newMsg.sender_email, false);
        }
    } catch (e) { if (tempEl) tempEl.remove(); console.error("שגיאה בשליחת הודעה:", e); }
}

async function sendMessage(partnerEmail) {
    if (!requireAuth()) return;
    const isBook = partnerEmail.startsWith('book:');
    if (!isBook && blockedUsers.includes(partnerEmail)) return await customAlert("משתמש זה חסום.");

    const input = document.getElementById(`input-${partnerEmail}`);
    const msg = input.value.trim();
    if (!msg) return;

    if (msg.length > 1000) {
        const parts = Math.ceil(msg.length / 1000);
        const confirm = await customConfirm(`ההודעה ארוכה מדי (${msg.length} תווים).<br>האם לחלק אותה אוטומטית ל-${parts} הודעות ולשלוח?`);
        if (confirm) {
            input.value = '';
            localStorage.removeItem('chat_draft_' + partnerEmail);
            if (activeReply && activeReply.chatId === partnerEmail) cancelReply(partnerEmail);

            for (let i = 0; i < msg.length; i += 1000) {
                const chunk = msg.substring(i, i + 1000);
                await doSendMessage(partnerEmail, chunk, false);
            }
        }
        return;
    }

    let finalMsg = msg;
    let isHtml = false;

    if (input.mentions) {
        finalMsg = msg;
        for (const name in input.mentions) {
            const email = input.mentions[name];
            const mentionRegex = new RegExp(`@${name}(?!\\w)`, 'g');
            const mentionHtml = `<span class="mention" data-user-email="${email}">@${name}</span>`;
            finalMsg = finalMsg.replace(mentionRegex, mentionHtml);
        }
        isHtml = true;
        delete input.mentions; 
    }

    if (activeReply && activeReply.chatId === partnerEmail) {
        finalMsg = `<div class="chat-quote"><strong>${activeReply.sender}:</strong> ${activeReply.text}</div>${finalMsg}`;
        isHtml = true;
        if (activeThreadId) {
            
        }
        cancelReply(partnerEmail);
    }

    visualizeNetworkActivity('request', {
        action: 'sendMessage',
        from: currentUser.email,
        to: partnerEmail,
        isBoring: false
    });

    input.value = '';
    localStorage.removeItem('chat_draft_' + partnerEmail);

    await doSendMessage(partnerEmail, finalMsg, isHtml);
}

function saveChatDraft(email, val) {
    localStorage.setItem('chat_draft_' + email, val);
}

function appendMessageToWindow(partnerEmail, text, type, id, timestamp, isRead = false, senderEmail = null, shouldAnimate = true) {

    if (text.includes('ref:')) return null;

    const container = getChatContainer(partnerEmail);
    if (!container) return null;

    if (id && document.getElementById(`msg-${id}`)) return;

    const div = document.createElement('div');
    if (id) div.id = `msg-${id}`;
    if (timestamp) div.dataset.timestamp = timestamp;
    if (senderEmail) div.dataset.sender = senderEmail;
    div.style.cursor = 'pointer';

    let topLevelElement; 

    if (partnerEmail.startsWith('book:') && senderEmail) {
        const wrapper = document.createElement('div');
        if (shouldAnimate) wrapper.className = 'new-message-animation';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'flex-end';
        wrapper.style.gap = '8px';
        wrapper.style.marginBottom = '8px';
        wrapper.style.maxWidth = '70%';

       
        if (senderEmail) wrapper.dataset.sender = senderEmail;
        wrapper.style.alignSelf = type === 'me' ? 'flex-end' : 'flex-start';
        wrapper.style.flexDirection = type === 'me' ? 'row-reverse' : 'row';

        const senderUser = globalUsersData.find(u => u.email === senderEmail);
        const isSubscribed = senderUser && senderUser.subscription && senderUser.subscription.level > 0;
        const subClass = isSubscribed ? `aura-lvl-${senderUser.subscription.level}` : '';
        const subTitle = isSubscribed ? `מנוי: ${senderUser.subscription.name}` : '';

        const avatar = document.createElement('div');
        const avatarColor = type === 'me' ? '#3b82f6' : '#cbd5e1';
        avatar.innerHTML = `<i class="fas fa-user-circle ${subClass}" style="font-size: 28px; color: ${avatarColor}; cursor: pointer; border-radius:50%;" title="${subTitle}"></i>`;
        avatar.onclick = (e) => { e.stopPropagation(); showUserDetails(senderEmail); };

        wrapper.appendChild(avatar); 
        wrapper.appendChild(div);
        container.appendChild(wrapper);
        topLevelElement = wrapper;

        const senderName = senderUser ? senderUser.name : 'לומד'; 
        nameSpan.className = 'msg-sender-name';
        const badgesHtml = senderUser ? getFullUserBadges(senderUser) : '';
        nameSpan.innerHTML = `${senderName} ${badgesHtml}`;
        div.appendChild(nameSpan);
    } else {
        const wrapper = document.createElement('div');
        if (shouldAnimate) wrapper.className = 'new-message-animation';
        wrapper.style.display = 'flex';
        wrapper.style.maxWidth = '80%'; 
        wrapper.style.marginBottom = '8px';
        wrapper.style.alignSelf = type === 'me' ? 'flex-end' : 'flex-start';
        if (senderEmail) wrapper.dataset.sender = senderEmail;
        wrapper.appendChild(div);
        container.appendChild(wrapper);
        topLevelElement = wrapper;
    }

    const animClass = '';
    if (type === 'me') {
        div.className = `message-bubble max-w-md bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-2xl rounded-tr-sm shadow-lg relative`;
        div.className = `message-bubble max-w-md bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-2xl rounded-tl-sm shadow-lg relative`; 
    } else {
        div.className = `message-bubble max-w-md bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700 relative`;
    }

    if (text.includes('<button') || text.includes('chat-quote') || text.includes('<strong>') || text.includes('<b>') || text.includes('<br>') || text.includes('<span')) {
        div.insertAdjacentHTML('beforeend', text);
    } else {
        const p = document.createElement('p');
        p.className = "text-sm leading-relaxed mb-1";
        p.textContent = text;
        div.appendChild(p);
    }

    const mentions = div.querySelectorAll('.mention');
    mentions.forEach(mention => {
        if (mention.dataset.userEmail === currentUser.email) {
            mention.classList.add('mention-highlight');
        }
    });

    if (type === 'me') {
        if ((partnerEmail !== 'admin@system' && !partnerEmail.startsWith('book:')) || isAdminMode) {
            const check = document.createElement('span');
            check.className = 'msg-check';
            check.id = `check-${id}`;
            check.innerText = isRead ? '✓✓' : '✓';
        }
    }

    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time-container flex justify-between items-center mt-auto pt-1 text-[10px] opacity-70';
    timeDiv.innerHTML = `<span>${timeStr}</span>`;
    div.appendChild(timeDiv);

    div.onclick = function (e) {
        if (e.target.closest('.msg-delete-btn')) return;

        const mention = e.target.closest('.mention');
        if (mention) {
            const email = mention.getAttribute('data-user-email');
            if (email) showUserDetails(email);
            return;
        }

        const ts = this.querySelector('.msg-timestamp');
        if (ts) ts.style.display = ts.style.display === 'block' ? 'none' : 'block';
    };

    if (type === 'me' && id) {
        const delBtn = document.createElement('button');
        delBtn.className = 'msg-delete-btn';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        delBtn.onclick = (e) => { e.stopPropagation(); deleteMessage(id, div); };
        div.appendChild(delBtn);
    }

    if (id) {
        let plainText = "";
        const pTag = div.querySelector('p');
        if (pTag) {
            plainText = pTag.innerText;
        } else {
            const clone = div.cloneNode(true);
            const toRemove = clone.querySelectorAll('.msg-timestamp, .msg-time-container, .msg-sender-name, .msg-delete-btn, .msg-check, .msg-reactions, .msg-actions-menu');
            toRemove.forEach(el => el.remove());
            plainText = clone.innerText;
        }

        const isBook = partnerEmail.startsWith('book:');
        plainText = plainText.replace('הצג טלפון ליצירת קשר', '').trim();
        const senderName = senderEmail ? (globalUsersData.find(u => u.email === senderEmail)?.name || senderEmail.split('@')[0]) : 'משתמש';
        const fullTextSafe = plainText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeSenderName = senderName.replace(/'/g, "\\'");

        const isMe = senderEmail === currentUser.email;

        const reactionsDiv = document.createElement('div');
        reactionsDiv.className = 'flex gap-2 mt-2 justify-end';

        if (type === 'me') {
            if ((partnerEmail !== 'admin@system' && !partnerEmail.startsWith('book:')) || isAdminMode) {
                const check = document.createElement('span');
                check.id = `check-${id}`;
                check.innerText = isRead ? '✓✓' : '✓';
                check.className = "msg-check";
                check.style.fontWeight = "bold";
                check.style.fontSize = "12px";
                check.style.color = isRead ? '#4ade80' : '#cbd5e1';
                timeDiv.appendChild(check); 
            }
        }

        let innerHTML = '';
        if (isBook) {
            const likeDisabled = isMe ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';
            innerHTML += `
                <button class="reaction-btn" ${likeDisabled} onclick="event.stopPropagation(); toggleReaction('${id}', 'like', this)">
                    <i class="fas fa-thumbs-up"></i>
                    <span id="like-count-${id}" style="font-size:0.75rem; margin-right:3px; display:none; font-weight:bold;">0</span>
                </button>
                <button class="reaction-btn" ${likeDisabled} onclick="event.stopPropagation(); toggleReaction('${id}', 'dislike', this)"><i class="fas fa-thumbs-down"></i></button>
            `;
        }

        innerHTML += `
            <div class="relative inline-block chat-action-menu-container">
                <button class="text-slate-400 hover:text-white transition-colors" onclick="event.stopPropagation(); const el = this.nextElementSibling; document.querySelectorAll('.chat-action-dropdown:not(.hidden)').forEach(d => { if (d !== el) d.classList.add('hidden'); }); el.classList.toggle('hidden')"><span class="material-icons-round text-sm">more_vert</span></button>
                <div class="chat-action-dropdown hidden absolute bottom-full ${isMe ? 'left-0' : 'right-0'} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 min-w-[120px] overflow-hidden text-slate-800 dark:text-slate-200">
                    <div class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-xs flex items-center gap-2" onclick="event.stopPropagation(); replyToMessage('${partnerEmail}', '${safeSenderName}', '${fullTextSafe}'); this.parentElement.classList.add('hidden');"><span class="material-icons-round text-sm">reply</span> ציטוט</div>
                    ${isMe ? `<div class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-xs flex items-center gap-2" onclick="event.stopPropagation(); editMessage('${id}'); this.parentElement.classList.add('hidden');"><span class="material-icons-round text-sm">edit</span> ערוך</div>` : ''}
                    ${isBook ? `<div class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-xs flex items-center gap-2" onclick="event.stopPropagation(); openThread('${id}', '${fullTextSafe}', '${partnerEmail}'); this.parentElement.classList.add('hidden');"><span class="material-icons-round text-sm">forum</span> שרשור</div>` : ''}
                    ${!isMe ? `<div class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 cursor-pointer text-xs flex items-center gap-2" onclick="event.stopPropagation(); openReportModal('${senderEmail}'); this.parentElement.classList.add('hidden');"><span class="material-icons-round text-sm">flag</span> דיווח</div>` : ''}
                </div>
            </div>
        `;
        timeDiv.innerHTML += innerHTML;
    }

    container.scrollTop = container.scrollHeight;
    return topLevelElement;
}

function replyToMessage(chatId, senderName, text) {
    activeReply = { chatId, sender: senderName, text };
    const preview = document.getElementById(`reply-preview-${chatId}`);
    if (preview) {
        preview.style.display = 'flex';
        preview.innerHTML = `<span><strong>משיב ל-${senderName}:</strong> ${text}</span> <i class="fas fa-times" style="cursor:pointer;" onclick="cancelReply('${chatId}')"></i>`;
        document.getElementById(`input-${chatId}`).focus();
    }
}

function cancelReply(chatId) {
    activeReply = null;
    const preview = document.getElementById(`reply-preview-${chatId}`);
    if (preview) preview.style.display = 'none';
}

async function editMessage(id) {
    const msgEl = document.getElementById(`msg-${id}`);
    if (!msgEl) return;

    const clone = msgEl.cloneNode(true);
    const quoteEl = clone.querySelector('.chat-quote');
    let quoteHTML = '';
    if (quoteEl) {
        quoteHTML = quoteEl.outerHTML;
        quoteEl.remove();
    }

    const toRemove = clone.querySelectorAll('.msg-timestamp, .msg-time-container, .msg-sender-name, .msg-delete-btn, .msg-check, .msg-reactions, .msg-actions-menu, .thread-active-indicator, .mention-highlight');
    toRemove.forEach(el => el.remove());

    let currentText = clone.innerText.trim();

    const newText = await customPrompt('ערוך את ההודעה:', currentText);

    if (newText !== null && newText !== currentText) {
        let finalMessage = newText;
        let isHtml = false;

        if (quoteHTML) {
            finalMessage = quoteHTML + newText;
            isHtml = true;
        }
        if (!isHtml && /<[a-z][\s\S]*>/i.test(finalMessage)) {
            isHtml = true;
        }

        try {
            const { data, error } = await supabaseClient
                .from('chat_messages')
                .update({ message: finalMessage, is_html: isHtml })
                .eq('id', id);

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("ההודעה לא עודכנה בבסיס הנתונים. ייתכן שאין לך הרשאה או שההודעה לא קיימת.");
            }
            updateMessageDOM(id, finalMessage);
        } catch (e) {
            console.error("Error updating message:", e);
            await customAlert("שגיאה בעדכון ההודעה");
        }
    }
}

function updateMessageDOM(id, newText) {
    const msgEl = document.getElementById(`msg-${id}`);
    if (!msgEl) return;

    const nameSpan = msgEl.querySelector('.msg-sender-name');
    const timeDiv = msgEl.querySelector('.msg-time-container');
    const delBtn = msgEl.querySelector('.msg-delete-btn');
    const threadInd = msgEl.querySelector('.thread-active-indicator');

    msgEl.innerHTML = '';

    if (nameSpan) msgEl.appendChild(nameSpan);

    if (newText.includes('<button') || newText.includes('chat-quote') || newText.includes('<strong>') || newText.includes('<b>') || newText.includes('<br>') || newText.includes('<span')) {
        msgEl.insertAdjacentHTML('beforeend', newText);
    } else {
        const p = document.createElement('p');
        p.className = "text-sm leading-relaxed mb-1";
        p.textContent = newText;
        msgEl.appendChild(p);
    }

    if (threadInd) msgEl.appendChild(threadInd);

    if (timeDiv) {
        msgEl.appendChild(timeDiv);
        if (!timeDiv.querySelector('.edited-mark')) {
            const editMark = document.createElement('span');
            editMark.className = 'edited-mark';
            editMark.style.fontSize = '0.7rem';
            editMark.style.marginRight = '4px';
            editMark.style.opacity = '0.7';
            editMark.innerText = '(נערך)';
            timeDiv.insertBefore(editMark, timeDiv.firstChild);
        }
    }

    if (delBtn) msgEl.appendChild(delBtn);

    const mentions = msgEl.querySelectorAll('.mention');
    mentions.forEach(mention => {
        if (mention.dataset.userEmail === currentUser.email) {
            mention.classList.add('mention-highlight');
        }
    });
}

async function deleteMessage(id, element) {
    if (!requireAuth()) return;
    if (!(await customConfirm('למחוק הודעה זו לכולם?'))) return;

    try {
        const { error } = await supabaseClient.from('chat_messages').delete().eq('id', id);
        if (error) throw error;

        if (chatChannel) {
            chatChannel.send({ type: 'broadcast', event: 'delete_message', payload: { id: id } });
        }

        if (element.parentElement) element.parentElement.remove();
        else element.remove();
    } catch (e) {
        console.error("Error deleting message:", e);
        await customAlert("שגיאה במחיקת ההודעה");
    }
}

async function toggleReaction(msgId, type, btn) {
    if (!requireAuth()) return;
    const isActive = btn.classList.contains('active');

    if (type === 'like' && !isActive) {
        const DAILY_LIKE_LIMIT = 15;
        const today = new Date().toLocaleDateString('en-GB');
        const storageKey = 'daily_likes_count_' + currentUser.email;
        let tracker = JSON.parse(localStorage.getItem(storageKey) || '{}');

        if (tracker.date !== today) tracker = { date: today, count: 0 };

        if (tracker.count >= DAILY_LIKE_LIMIT) {
            return showToast(`הגעת למכסת הלייקים היומית (${DAILY_LIKE_LIMIT})`, "error");
        }
        tracker.count++;
        localStorage.setItem(storageKey, JSON.stringify(tracker));
    }

    const container = btn.parentElement;
    const otherType = type === 'like' ? 'dislike' : 'like';
    const otherBtn = container.querySelector(`.reaction-btn i.fa-thumbs-${type === 'like' ? 'down' : 'up'}`).parentElement;

    const countSpan = btn.querySelector(`span[id^='like-count-']`);
    if (type === 'like' && countSpan) {
        let currentCount = parseInt(countSpan.innerText || '0');
        if (isActive) {
            currentCount = Math.max(0, currentCount - 1);
        } else {
            currentCount++;
        }
        countSpan.innerText = currentCount;
        countSpan.style.display = currentCount > 0 ? 'inline' : 'none';
    }

    try {
        if (isActive) {
            await supabaseClient.from('message_reactions').delete()
                .eq('message_id', msgId)
                .eq('user_email', currentUser.email);

            btn.classList.remove('active');
            btn.style.color = '';
            delete btn.dataset.reaction;
        } else {
            await supabaseClient.from('message_reactions').upsert({
                message_id: msgId,
                user_email: currentUser.email,
                reaction_type: type
            }, { onConflict: 'message_id,user_email' });

            btn.classList.add('active');
            btn.style.color = type === 'like' ? '#22c55e' : '#ef4444';
            btn.dataset.reaction = type;

            if (otherBtn.classList.contains('active')) {
                otherBtn.classList.remove('active');
                otherBtn.style.color = '';
                delete otherBtn.dataset.reaction;
            }

            if (type === 'like') {
                try {
                    const { data: msg } = await supabaseClient.from('chat_messages').select('sender_email, message').eq('id', msgId).single();
                    if (msg && msg.sender_email !== currentUser.email) {
                        await supabaseClient.rpc('increment_field', { table_name: 'users', field_name: 'reward_points', increment_value: 5, user_email: msg.sender_email });

                        const cleanMsg = msg.message.replace(/<[^>]*>?/gm, '').substring(0, 30) + (msg.message.length > 30 ? '...' : '');
                        const notifText = `המשתמש ${currentUser.displayName} סימן לייק על ההודעה שלך: "${cleanMsg}"`;
                        await supabaseClient.rpc('send_message', {
                            p_sender_email: 'updates@system',
                            p_receiver_email: msg.sender_email,
                            p_message: notifText,
                            p_is_html: false
                        });
                    }
                } catch (e) {
                    console.error("Error awarding points for like", e);
                }
            }
        }
    } catch (e) {
        console.error("Reaction error", e);
        showToast("שגיאה בעדכון תגובה", "error");
        if (type === 'like' && !isActive) {
            const storageKey = 'daily_likes_count_' + currentUser.email;
            let tracker = JSON.parse(localStorage.getItem(storageKey) || '{}');
            if (tracker.count > 0) tracker.count--;
            localStorage.setItem(storageKey, JSON.stringify(tracker));
        }
    }
}

let typingTimeout = null;
let lastTypingTime = 0;
let typingTimers = {}; 


function handleTyping(partnerEmail) {
    const now = Date.now();
    if (now - lastTypingTime > 2000 && chatChannel) {
        lastTypingTime = now;
        chatChannel.send({ type: 'broadcast', event: 'typing', payload: { from: currentUser.email, to: partnerEmail } });
    }
}


function showTyping(partnerEmail, text) {
    const el = document.getElementById(`typing-${partnerEmail}`);
    if (el) {
        el.innerText = text;
        el.classList.add('active');
        if (typingTimers[partnerEmail]) clearTimeout(typingTimers[partnerEmail]);
        typingTimers[partnerEmail] = setTimeout(() => { el.classList.remove('active'); }, 3000);
    }
}

async function markAsRead(senderEmail) {
    const emailKey = !senderEmail.startsWith('book:') ? senderEmail.toLowerCase() : senderEmail;

    lastReadTimes[emailKey] = Date.now();
    localStorage.setItem('torahApp_lastReadTimes', JSON.stringify(lastReadTimes));

    try {
        await supabaseClient.from('chat_messages')
            .update({ is_read: true })
            .ilike('sender_email', senderEmail) 
            .ilike('receiver_email', getCurrentChatEmail())
            .eq('is_read', false);

        if (unreadMessages[emailKey]) {
            unreadMessages[emailKey] = 0;
            localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
            if (typeof updateChatBadge === 'function') updateChatBadge();
        }
    } catch (e) { console.error("Error marking as read:", e); }
}

let mentionQuery = null;
let mentionTriggerIndex = -1;
let activeMentionPopup = null;
let mentionUserList = [];
let selectedMentionIndex = -1;

function isMentionPopupActive() {
    return activeMentionPopup && activeMentionPopup.style.display === 'block';
}

function handleMentionKeyDown(event, chatId) {
    if (!isMentionPopupActive()) return true;

    const items = activeMentionPopup.querySelectorAll('.mention-item');
    if (items.length === 0) return true;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedMentionIndex = (selectedMentionIndex + 1) % items.length;
        updateMentionSelection(items);
        return false;
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedMentionIndex = (selectedMentionIndex - 1 + items.length) % items.length;
        updateMentionSelection(items);
        return false;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        if (selectedMentionIndex > -1) {
            items[selectedMentionIndex].click();
        }
        return false;
    }
    if (event.key === 'Escape') {
        hideMentions();
        return false;
    }

    return true;
}

function updateMentionSelection(items) {
    items.forEach((item, index) => {
        if (index === selectedMentionIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

async function handleMentionInput(event, chatId) {
    const input = event.target;
    const text = input.value;
    const cursorPos = input.selectionStart;

    const atIndex = text.lastIndexOf('@', cursorPos - 1);

    if (atIndex !== -1 && (atIndex === 0 || /\s/.test(text[atIndex - 1]))) {
        const query = text.substring(atIndex + 1, cursorPos);
        if (!query.includes(' ')) {
            mentionTriggerIndex = atIndex;
            mentionQuery = query;
            activeMentionPopup = document.getElementById(`mentions-popup-${chatId}`);

            if (activeMentionPopup) {
                activeMentionPopup.style.display = 'block';
            }

            await populateMentions(chatId, query);
            return;
        }
    }

    hideMentions();
}

function hideMentions() {
    if (activeMentionPopup) {
        activeMentionPopup.style.display = 'none';
    }
    mentionQuery = null;
    mentionTriggerIndex = -1;
    activeMentionPopup = null;
    mentionUserList = [];
    selectedMentionIndex = -1;
}

async function populateMentions(chatId, query) {
    if (!activeMentionPopup) return;

    if (!chatId.startsWith('book:')) {
        activeMentionPopup.innerHTML = '<div class="p-2 text-sm text-slate-500">תיוג זמין רק בצ\'אט ספר.</div>';
        setTimeout(hideMentions, 2000);
        return;
    }

    activeMentionPopup.innerHTML = '<div class="p-2 text-sm text-slate-500">טוען משתמשים...</div>';
    const bookName = chatId.replace('book:', '');

    const potentialUsers = globalUsersData.filter(u => u.books && u.books.includes(bookName) && u.email !== currentUser.email);

    const chatContainer = document.getElementById(`msgs-${chatId}`);
    const postedUserEmails = new Set();
    if (chatContainer) {
        chatContainer.querySelectorAll('[data-sender]').forEach(el => {
            if (el.dataset.sender !== currentUser.email) {
                postedUserEmails.add(el.dataset.sender);
            }
        });
    }

    const lowerQuery = query.toLowerCase();
    let filteredUsers = potentialUsers.filter(u =>
        u.name.toLowerCase().includes(lowerQuery) ||
        u.email.toLowerCase().includes(lowerQuery)
    );

    filteredUsers.sort((a, b) => {
        const aPosted = postedUserEmails.has(a.email);
        const bPosted = postedUserEmails.has(b.email);
        if (aPosted && !bPosted) return -1;
        if (!aPosted && bPosted) return 1;
        return a.name.localeCompare(b.name);
    });

    mentionUserList = filteredUsers;
    selectedMentionIndex = -1;

    if (mentionUserList.length === 0) {
        activeMentionPopup.innerHTML = '<div class="p-4 text-sm text-slate-500 text-center italic">לא נמצאו משתמשים להתאמה</div>';
    } else {
        activeMentionPopup.innerHTML = mentionUserList.map((user, index) => {
            const initial = user.name ? user.name.charAt(0) : '?';
            return `
            <div class="mention-item" onclick="selectMention('${chatId}', '${user.name.replace(/'/g, "\\'")}', '${user.email}')">
                <div class="mention-avatar">${initial}</div>
                <div class="flex flex-col overflow-hidden">
                    <span class="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">${user.name}</span>
                    <!-- <span class="text-xs text-slate-500 dark:text-slate-400 truncate">${user.email}</span> -->
                </div>
            </div>
        `}).join('');
    }
}

function selectMention(chatId, name, email) {
    const input = document.getElementById(`input-${chatId}`);
    const text = input.value;

    const before = text.substring(0, mentionTriggerIndex);
    const after = text.substring(mentionTriggerIndex + 1 + mentionQuery.length);

    const mentionText = `@${name} `;

    input.value = before + mentionText + after;

    if (!input.mentions) {
        input.mentions = {};
    }
    input.mentions[name] = email;

    hideMentions();
    input.focus();
    const newCursorPos = before.length + mentionText.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
}

function sendMentionNotification(mentionedEmail, chatId) {
    const bookName = chatId.replace('book:', '');
    const safeBookName = bookName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

    const notificationMessage = `<span class="mention" data-user-email="${currentUser.email}">${currentUser.displayName}</span> תייג אותך בצ'אט של הספר <span style="cursor:pointer; font-weight:bold; color:#f59e0b;" onclick="event.stopPropagation(); openBookChat('${safeBookName}')">${bookName}</span>.`;

    supabaseClient.rpc('send_message', {
        p_sender_email: 'mentions@system',
        p_receiver_email: mentionedEmail,
        p_message: notificationMessage,
        p_is_html: true
    }).then(({ error }) => {
        if (error) console.error("Error sending mention notification:", error);
    });
}

async function updateMessageLikeCount(messageId) {
    if (!messageId) return;
    const { count, error } = await supabaseClient
        .from('message_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('message_id', messageId)
        .eq('reaction_type', 'like');

    if (!error) {
        const el = document.getElementById(`like-count-${messageId}`);
        if (el) {
            el.innerText = count || 0;
            el.style.display = (count > 0) ? 'inline' : 'none';
        }
    }
}

function handleReactionRealtime(payload) {
    const msgId = payload.new?.message_id || payload.old?.message_id;
    if (msgId) updateMessageLikeCount(msgId);
}