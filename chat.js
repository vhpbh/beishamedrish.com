async function _insertNotification(userId, title, content) {
    const base = { user_id: userId, title, content, is_read: false, created_at: new Date().toISOString() };
    for (const type of ['message', 'system', 'info', 'admin', null]) {
        const row = type !== null ? { ...base, type } : { ...base };
        const result = await supabaseClient.from('notifications').insert(row);
        if (!result.error || !result.error.message?.includes('check constraint')) return;
    }
}

const USER_BADGE_ICONS = [
    { id: 'crown',      icon: 'fas fa-crown',          color: '#FFB703', label: 'כתר' },
    { id: 'diamond',    icon: 'fas fa-gem',             color: '#60A5FA', label: 'יהלום' },
    { id: 'shield',     icon: 'fas fa-shield-alt',      color: '#EF4444', label: 'מגן' },
    { id: 'scroll',     icon: 'fas fa-scroll',          color: '#10B981', label: 'מגילה' },
    { id: 'medal',      icon: 'fas fa-medal',           color: '#F59E0B', label: 'מדליה' },
    { id: 'fire',       icon: 'fas fa-fire',            color: '#F97316', label: 'אש' },
    { id: 'dove',       icon: 'fas fa-dove',            color: '#93C5FD', label: 'יונה' },
    { id: 'star',       icon: 'fas fa-star',            color: '#FCD34D', label: 'כוכב' },
    { id: 'graduation', icon: 'fas fa-graduation-cap',  color: '#8B5CF6', label: 'כובע לימוד' },
    { id: 'book',       icon: 'fas fa-book-open',       color: '#34D399', label: 'ספר' },
    { id: 'bolt',       icon: 'fas fa-bolt',            color: '#FBBF24', label: 'ברק' },
    { id: 'feather',    icon: 'fas fa-feather-alt',     color: '#A78BFA', label: 'נוצה' },
];

function renderUserIconBadge(iconId) {
    if (!iconId) return '';
    const def = USER_BADGE_ICONS.find(b => b.id === iconId);
    if (!def) return '';
    return `<i class="${def.icon}" style="color:${def.color}; margin-right:3px; vertical-align:middle;" title="${def.label}"></i>`;
}

function getChatTable(email) {
    if (email && email.startsWith('book:')) return 'chat_public';
    if (email === 'admin@system' || (email && email.endsWith('@system'))) return 'chat_admin';
    return 'chat_private';
}

function sanitizeChatHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const ALLOWED_TAGS = new Set(['STRONG','B','EM','I','BR','SPAN','DIV','P','BUTTON','A','BLOCKQUOTE']);
    function clean(node) {
        if (node.nodeType === Node.TEXT_NODE) return;
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (!ALLOWED_TAGS.has(node.tagName)) { node.replaceWith(...node.childNodes); return; }
            [...node.attributes].forEach(attr => {
                if (/^on/i.test(attr.name)) {
                    if (attr.name === 'onclick') {
                        const m = attr.value.match(/openDonationModalAndSelectTier\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
                        if (m) {
                            node.setAttribute('data-sub-tier', m[1]);
                            node.setAttribute('data-sub-amount', m[2]);
                            node.classList.add('sub-promo-btn');
                        }
                    }
                    node.removeAttribute(attr.name);
                } else if (attr.name === 'href' && /^javascript:/i.test(attr.value)) {
                    node.removeAttribute(attr.name);
                }
            });
        }
        [...node.childNodes].forEach(clean);
    }
    [...tmp.childNodes].forEach(clean);
    return tmp.innerHTML;
}

async function searchChats(query) {
    if (!currentUser) return [];

    let { data, error } = await supabaseClient.rpc('search_my_chats', {
        p_my_email: currentUser.email,
        p_query: query
    });

    if (error) {
        if (error.code === '400') console.error("Full DB Error (Search Chats RPC):", error.message, error.details);
        const { data: directData, error: directError } = await supabaseClient
            .from('chat_private')
            .select('connection_id, sender_id, content, created_at')
            .eq('sender_id', currentUser.id)
            .ilike('content', `%${query}%`);

        if (directError && directError.code === '400') {
            console.error("Full DB Error (Search Chats Direct):", directError.message, directError.details);
        }
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

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showDesktopNotification(title, body, chatId) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.hasFocus() && !document.hidden) return;
    const notif = new Notification(title, { body, icon: 'favicon.ico', tag: chatId });
    notif.onclick = function () {
        window.focus();
        if (chatId && typeof openChat === 'function') {
            const u = globalUsersData.find(e => e.email === chatId);
            openChat(chatId, u?.name || chatId);
        }
        notif.close();
    };
}

async function markAllChatRead(partnerEmail) {
    let connId = typeof chavrutaConnections !== 'undefined'
        ? chavrutaConnections.find(c => c.email === partnerEmail)?.id
        : null;

    if (!connId && currentUser?.id && typeof supabaseClient !== 'undefined') {
        const partnerUser = typeof globalUsersData !== 'undefined'
            ? globalUsersData.find(u => u.email === partnerEmail)
            : null;
        if (partnerUser?.id) {
            try {
                const { data } = await supabaseClient
                    .from('chavruta_connections')
                    .select('id')
                    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerUser.id}),and(sender_id.eq.${partnerUser.id},receiver_id.eq.${currentUser.id})`)
                    .limit(1)
                    .maybeSingle();
                connId = data?.id;
            } catch (_) {}
        }
    }

    if (connId && typeof supabaseClient !== 'undefined') {
        const { error } = await supabaseClient.from('chat_private')
            .update({ is_read: true })
            .eq('connection_id', connId)
            .neq('sender_id', currentUser.id);
        if (!error && typeof chatChannel !== 'undefined' && chatChannel) {
            chatChannel.send({
                type: 'broadcast',
                event: 'messages_read',
                payload: { reader: currentUser.email, of: partnerEmail }
            });
        }
    }
}

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
        if (partnerEmail) await checkNewMessagesFor(partnerEmail);
    }
    chatPollTimer = setTimeout(pollChats, 3000);
}

function getChatContainer(partnerEmail) {
    const popup = document.getElementById(`chat-window-${partnerEmail}`);
    if (popup) return popup.querySelector('.chat-messages-area');
    return document.getElementById(`msgs-${partnerEmail}`);
}

async function checkNewMessagesFor(partnerEmail) {
    const table = getChatTable(partnerEmail);

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
        let query;
        if (table === 'chat_public') {
            const bookName = partnerEmail.replace('book:', '');
            query = supabaseClient.from(table).select('*').eq('book_name', bookName).order('created_at', { ascending: true });
        } else if (table === 'chat_admin') {
            query = supabaseClient.from(table).select('*').eq('user_id', currentUser.id);
            if (partnerEmail === 'updates@system') {
                query = query.eq('sender_email', 'updates@system');
            } else if (partnerEmail === 'mentions@system') {
                query = query.eq('sender_email', 'mentions@system');
            } else {
                query = query.not('sender_email', 'eq', 'updates@system').not('sender_email', 'eq', 'mentions@system');
            }
        } else {
            
            const conn = typeof chavrutaConnections !== 'undefined' ? chavrutaConnections.find(c => c.email === partnerEmail) : null;
            const connId = (conn && conn.id) || (window._archivedConnIds && window._archivedConnIds[partnerEmail]);
            if (connId) {
                query = supabaseClient.from(table).select('id, connection_id, sender_id, content, created_at, sender_email').eq('connection_id', connId);
            } else {
                query = supabaseClient.from(table).select('id, connection_id, sender_id, content, created_at, sender_email').eq('sender_id', currentUser.id);
            }
        }

        query = query.gt('created_at', lastTime);

        const { data, error } = await query;

        if (error) {
            if (error.code === '400') console.error("Full DB Error (Poll Chats):", error.message, error.details);
            throw error;
        }
        if (data && data.length > 0) {
            data.forEach(msg => {
                if (msg.parent_message_id) return;
                const isMe = (msg.user_id && msg.user_id === currentUser.id) || (msg.sender_id && msg.sender_id === currentUser.id);
                const type = isMe ? 'me' : 'other';
                const senderEmail = msg.sender_email || (globalUsersData.find(u => u.id === (msg.user_id || msg.sender_id))?.email);
                const alreadyInDom = msg.id && !!document.getElementById(`msg-${msg.id}`);
                appendMessageToWindow(partnerEmail, msg.content || msg.message_text || msg.message, type, msg.id, msg.created_at, false, senderEmail, true);
                if (type === 'other' && !alreadyInDom) {
                    const win = document.getElementById(`chat-window-${partnerEmail}`);
                    const isChatOpen = win && !win.classList.contains('minimized');
                    const isMainChatActive = !!document.getElementById(`msgs-${partnerEmail}`)?.closest('#chat-main-area');
                    if (isChatOpen || isMainChatActive) {
                        markAsRead(partnerEmail);
                    } else {
                        unreadMessages[partnerEmail] = (unreadMessages[partnerEmail] || 0) + 1;
                        localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
                        if (typeof updateChatBadge === 'function') updateChatBadge();
                        if (win && win.classList.contains('minimized')) win.classList.add('flashing');
                        const senderUser = globalUsersData.find(u => u.email === senderEmail);
                        const senderName = senderUser?.name || senderEmail?.split('@')[0] || 'משתמש';
                        const msgText = (msg.content || msg.message_text || msg.message || '').replace(/<[^>]+>/g, '').substring(0, 80);
                        showDesktopNotification('הודעה חדשה מ-' + senderName, msgText, partnerEmail);
                    }
                }
            });
        }
    } catch (e) { console.error("Full DB Error (Poll Chats):", e); }
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
        partnerName = 'תמיכה';
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

    const reportBtnHtml = (isSystem || isBook || isUpdates || isMentions) ? '' :
        `<button onclick="event.stopPropagation(); openReportModal('${partnerEmail}')" id="block-btn-${partnerEmail}"
            class="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${isBlocked ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400' : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-red-300 hover:text-red-500'}"
            title="דיווח וחסימה">
            <i class="fas fa-ban text-xs"></i> ${isBlocked ? 'חסום' : 'דיווח'}
        </button>`;

    const chatHtml = `
        <div class="chat-window ${blockClass} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl overflow-hidden flex flex-col" id="chat-window-${partnerEmail}">
            <div class="chat-header bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 flex justify-between items-center cursor-pointer" onclick="toggleChatWindow('${partnerEmail}')">
                <!-- שם ואייקון – צד שמאל -->
                <div class="flex items-center gap-2">
                    ${isBook ? '<i class="fas fa-book text-amber-500"></i>' : (isSystem ? '<i class="fas fa-headset" style="color:#0ea5e9;"></i>' : (isUpdates ? '<i class="fas fa-bullhorn text-amber-500"></i>' : (isMentions ? '<i class="fas fa-at text-amber-500"></i>' : `<span class="online-dot" id="online-${partnerEmail}"></span>`)))}
                    <div class="flex flex-col" style="text-align:right;">
                        <span class="font-bold text-base leading-tight text-slate-800 dark:text-white" ${!isBook && !isSystem && !isUpdates && !isMentions ? `onclick="event.stopPropagation(); showUserDetails('${partnerEmail}')" style="cursor:pointer;"` : ''}>${partnerName}</span>
                        ${isBook ? `<span class="text-[10px] ${bookOnlineCount > 0 ? 'text-emerald-500 font-bold' : 'text-slate-500'} dark:text-slate-400 font-normal">${bookOnlineCount} לומדים מחוברים</span>` : ''}
                    </div>
                </div>
                <!-- כפתורי שליטה – צד ימין (LTR: X, הגדלה, מזעור, דיווח) -->
                <div class="flex items-center gap-2 text-slate-400" style="direction:ltr;" onclick="event.stopPropagation()">
                    <i class="fas fa-times hover:text-slate-600 transition-colors cursor-pointer" onclick="closeChatWindow('${partnerEmail}')" title="סגור"></i>
                    <i class="fas fa-expand hover:text-slate-600 transition-colors cursor-pointer" onclick="expandChatToScreen('${partnerEmail}', '${partnerName.replace(/'/g, "\\'")}')" title="פתח במסך מלא"></i>
                    <i class="fas fa-minus hover:text-slate-600 transition-colors cursor-pointer" onclick="toggleChatWindow('${partnerEmail}')" title="מזער"></i>
                    ${reportBtnHtml}
                </div>
            </div>
            <div class="chat-body">
                ${isSystem ? `<div class="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs p-2 text-center border-b border-yellow-100 dark:border-yellow-800 font-medium">עקב תקלות טעינה, מומלץ לעבור לצ'אט זה במצב מסך מלא <button class="underline font-bold mr-1 hover:text-yellow-900 dark:hover:text-yellow-100" onclick="expandChatToScreen('${partnerEmail}', '${partnerName.replace(/'/g, "\\'")}')">מעבר למסך מלא</button></div>` : ''}
                <div class="chat-messages-area chat-wa-bg flex flex-col" id="msgs-${partnerEmail}">
                    <div class="chat-loading-indicator" style="padding:16px;">${getSkeletonHTML('chat', 4)}</div>
                </div>
                <div class="typing-indicator-box" id="typing-${partnerEmail}"></div>
                ${isUpdates || isMentions ?
            `<footer class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">ערוץ לקריאה בלבד</footer>` :
            `<footer class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <div class="max-w-5xl mx-auto relative flex items-center gap-3">
                        <div id="mentions-popup-${partnerEmail}" class="mentions-popup"></div>
                        ${!isBook && !isSystem && !isUpdates && !isMentions ? `<button class="w-10 h-10 flex items-center justify-center rounded-xl shrink-0" disabled title="שיחות וידאו אינן זמינות כעת — בקרוב" style="background:#e2e8f0; color:#94a3b8; opacity:0.5; cursor:not-allowed; filter:grayscale(1);"><i class="fas fa-video-slash text-sm"></i></button>` : ''}
                        <input type="text" id="input-${partnerEmail}" autocomplete="off" class="w-full h-12 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-5 text-sm focus:ring-2 focus:ring-blue-500/50 dark:text-white dark:placeholder-slate-500" placeholder="הקלד הודעה..."
                        oninput="handleTyping('${partnerEmail}'); handleMentionInput(event, '${partnerEmail}')"
                        onkeyup="saveChatDraft('${partnerEmail}', this.value)"
                        onkeypress="if(event.key === 'Enter' && !event.shiftKey && !isMentionPopupActive()) sendMessage('${partnerEmail}')"
                        onkeydown="if(event.key==='Enter'&&event.shiftKey){event.preventDefault();const p=this.selectionStart;this.value=this.value.slice(0,p)+'\\n'+this.value.slice(p);this.selectionStart=this.selectionEnd=p+1;return false;} return handleMentionKeyDown(event, '${partnerEmail}')">
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
        else if (filter === 'archive' && tabs[3]) tabs[3].classList.add('active');
    }

    const container = document.getElementById('chat-list-container');

    if (!isBackgroundUpdate && container) {
        const skRow = `<div class="skeleton-card" style="padding:10px 14px;"><div class="skeleton skeleton-avatar" style="width:40px;height:40px;"></div><div class="skeleton-card-info"><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line short"></div></div></div>`;
        container.innerHTML = skRow.repeat(4);
    }

let data = [];
    let error = null;

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
        
        const isEmail = v => typeof v === 'string' && v.includes('@');
        const unseenPartners = [...approvedPartners].filter(e => isEmail(e) && !partners.has(e));

        if (unseenPartners.length > 0) {
            const connIds = unseenPartners
                .map(e => typeof chavrutaConnections !== 'undefined' ? chavrutaConnections.find(c => c.email === e)?.id : null)
                .filter(Boolean);

            let lastMsgByConn = {};
            let lastMsgByEmail = {};

            if (connIds.length > 0) {
                const { data: recentMsgs } = await supabaseClient
                    .from('chat_private')
                    .select('connection_id, content, created_at')
                    .in('connection_id', connIds)
                    .order('created_at', { ascending: false })
                    .limit(connIds.length * 10);
                if (recentMsgs) {
                    recentMsgs.forEach(msg => {
                        if (!lastMsgByConn[msg.connection_id]) {
                            lastMsgByConn[msg.connection_id] = msg;
                        }
                    });
                }
            }

const partnersNeedingFallback = unseenPartners.filter(partnerEmail => {
                const conn = typeof chavrutaConnections !== 'undefined' ? chavrutaConnections.find(c => c.email === partnerEmail) : null;
                return !conn?.id || !lastMsgByConn[conn.id];
            });

            if (partnersNeedingFallback.length > 0 && currentUser?.id) {
                const partnerIds = partnersNeedingFallback
                    .map(e => typeof chavrutaConnections !== 'undefined' ? chavrutaConnections.find(c => c.email === e)?.partnerId : null)
                    .filter(Boolean);

                if (partnerIds.length > 0) {
                    const { data: fallbackMsgs } = await supabaseClient
                        .from('chat_private')
                        .select('content, created_at, sender_id, receiver_id')
                        .or(`sender_id.in.(${partnerIds.join(',')}),receiver_id.in.(${partnerIds.join(',')})`)
                        .order('created_at', { ascending: false })
                        .limit(partnerIds.length * 10);

                    if (fallbackMsgs) {
                        fallbackMsgs.forEach(msg => {
                            const pid = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
                            const conn = typeof chavrutaConnections !== 'undefined' ? chavrutaConnections.find(c => c.partnerId === pid) : null;
                            const em = conn?.email;
                            if (em && !lastMsgByEmail[em]) lastMsgByEmail[em] = msg;
                        });
                    }
                }
            }

            unseenPartners.forEach(partnerEmail => {
                partners.add(partnerEmail);
                const conn = typeof chavrutaConnections !== 'undefined' ? chavrutaConnections.find(c => c.email === partnerEmail) : null;
                const lastMsg = (conn ? lastMsgByConn[conn.id] : null) || lastMsgByEmail[partnerEmail];
                const displayContent = lastMsg
                    ? (lastMsg.content?.startsWith('__DELETED__:') ? 'ההודעה נמחקה' : lastMsg.content)
                    : 'קבעתם חברותא! התחילו את השיחה.';
                chats.push({
                    email: partnerEmail,
                    lastMsg: displayContent,
                    time: lastMsg ? lastMsg.created_at : new Date().toISOString(),
                    unread: false
                });
            });
        }
    }

    if (filter === 'archive') {
        
        if (currentUser?.id) {
            const { data: oldConns } = await supabaseClient
                .from('chavruta_connections')
                .select('id, book_name, sender_id, receiver_id, status')
                .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
                .in('status', ['cancelled', 'completed', 'rejected'])
                .order('created_at', { ascending: false })
                .limit(30);

            if (oldConns && oldConns.length > 0) {
                const archiveConnIds = oldConns.map(c => c.id);
                const { data: archiveMsgs } = await supabaseClient
                    .from('chat_private')
                    .select('connection_id, content, created_at')
                    .in('connection_id', archiveConnIds)
                    .order('created_at', { ascending: false })
                    .limit(archiveConnIds.length * 5);

                const lastByConn = {};
                if (archiveMsgs) {
                    archiveMsgs.forEach(m => {
                        if (!lastByConn[m.connection_id]) lastByConn[m.connection_id] = m;
                    });
                }

                window._archivedConnIds = window._archivedConnIds || {};

                oldConns.forEach(conn => {
                    const partnerId = conn.sender_id === currentUser.id ? conn.receiver_id : conn.sender_id;
                    const partnerUser = globalUsersData.find(u => u.id === partnerId);
                    const partnerEmail = partnerUser?.email || partnerId;

                    if (!partners.has(partnerEmail)) {
                        partners.add(partnerEmail);
                        
                        window._archivedConnIds[partnerEmail] = conn.id;
                        const lastMsg = lastByConn[conn.id];
                        const displayContent = lastMsg
                            ? (lastMsg.content?.startsWith('__DELETED__:') ? 'ההודעה נמחקה' : lastMsg.content)
                            : conn.book_name || 'שיחה קודמת';
                        chats.push({
                            email: partnerEmail,
                            lastMsg: displayContent,
                            time: lastMsg ? lastMsg.created_at : new Date().toISOString(),
                            unread: false,
                            bookName: conn.book_name || null,
                            connStatus: conn.status || null
                        });
                    }
                });
            }
        }
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
        } else if (filter === 'archive') {
            emptyMsg = '<i class="fas fa-archive" style="font-size:2rem; opacity:0.3; display:block; margin-bottom:8px;"></i>אין חברותות קודמות.<br><span style="font-size:0.85em; display:block; margin-top:6px;">שיחות עם חברותות שהסתיימו יופיעו כאן.</span>';
        }
        newHTML = `<div class="text-center p-5 text-slate-400">${emptyMsg}</div>`;
    } else {
        chats.forEach(chat => {
            const user = globalUsersData.find(u => u.email && chat.email && u.email.toLowerCase() === chat.email.toLowerCase());
            const name = user ? user.name : (chat.email.startsWith('book:') ? chat.email.replace('book:', '') : (chat.email === 'admin@system' ? 'תמיכה' : (chat.email === 'updates@system' ? 'עדכונים ממשתמשים שאני עוקב אחריהם' : (chat.email === 'mentions@system' ? 'אזכורים' : 'לומד'))));

            const isOnline = chat.email === 'admin@system' || (user && user.lastSeen && (new Date() - new Date(user.lastSeen) < 5 * 60 * 1000));

            const msgDate = new Date(chat.time);
            const now = new Date();
            const isToday = msgDate.toDateString() === now.toDateString();
            const timeDisplay = isToday ? msgDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : msgDate.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });

            const truncatedLastMsg = truncateHtmlText(chat.lastMsg, 60);
            const initial = name ? name.charAt(0) : '?';
            const isUserBanned = user && user.isBanned;
            const isArchiveItem = !!chat.bookName;
            const statusLabel = chat.connStatus === 'completed' ? 'הושלם' : chat.connStatus === 'rejected' ? 'נדחה' : chat.connStatus === 'cancelled' ? 'בוטל' : '';
            const statusColor = chat.connStatus === 'completed' ? '#16a34a' : '#94a3b8';

            let iconHtml = initial;
            let iconExtraStyle = '';
            if (chat.email.startsWith('book:')) iconHtml = '<i class="fas fa-book"></i>';
            else if (chat.email === 'admin@system') iconHtml = '<i class="fas fa-headset" style="color:#0ea5e9;"></i>';
            else if (chat.email === 'updates@system') iconHtml = '<i class="fas fa-bullhorn text-amber-500"></i>';
            else if (chat.email === 'mentions@system') iconHtml = '<i class="fas fa-at text-amber-500"></i>';
            else if (chat.email.includes('@system')) iconHtml = '<i class="fas fa-robot"></i>';
            else if (user?.avatar_url) {
                const bg = user.background_url ? `background-image:url('${user.background_url}');background-size:cover;background-position:center;` : '';
                iconHtml = `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'">`;
                if (bg) iconExtraStyle = bg;
            } else if (user?.background_url) {
                iconHtml = `<span style="font-weight:700;position:relative;z-index:1;">${initial}</span>`;
                iconExtraStyle = `background-image:url('${user.background_url}');background-size:cover;background-position:center;`;
            }

            const unreadCount = (typeof unreadMessages !== 'undefined' && unreadMessages[chat.email]) || 0;
            const hasUnread = unreadCount > 0;
            newHTML += `
            <div class="chat-list-item p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer border border-transparent flex items-center gap-3 ${hasUnread ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : ''}" onclick="loadChatIntoMainArea('${chat.email}', '${name.replace(/'/g, "\\'")}', this)">

                <div class="relative flex-shrink-0">
                    <div class="w-10 h-10 rounded-full ${isArchiveItem ? 'bg-slate-100 dark:bg-slate-700/50 opacity-75' : 'bg-slate-200 dark:bg-slate-700'} flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 overflow-hidden" style="${iconExtraStyle}">
                        ${iconHtml}
                    </div>
                    ${isOnline ? `<span class="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>` : ''}
                </div>

                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-baseline mb-0.5">
                        <span class="font-bold text-sm text-slate-900 dark:text-white truncate">${name}${user?.user_icon ? ' ' + renderUserIconBadge(user.user_icon) : ''}${isUserBanned ? ' <span class="msg-banned-notice">חסום</span>' : ''}</span>
                        <span class="text-[10px] ${hasUnread ? 'text-emerald-600 font-bold' : 'text-slate-400'} whitespace-nowrap">${timeDisplay}</span>
                    </div>
                    ${isArchiveItem ? `<div class="text-[10px] mb-0.5" style="color:${statusColor};"><i class="fas fa-book-open" style="margin-left:2px;"></i>${chat.bookName}${statusLabel ? ` · ${statusLabel}` : ''}</div>` : ''}
                    <div class="flex items-center justify-between gap-1">
                        <p class="text-xs text-slate-500 dark:text-slate-400 truncate ${hasUnread ? 'font-semibold text-slate-800 dark:text-slate-200' : ''} flex-1 min-w-0">${truncatedLastMsg}</p>
                        ${hasUnread ? `<span class="chat-unread-badge">${unreadCount > 99 ? '99+' : unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        });
    }

    if (newHTML !== localStorage.getItem(cacheKey)) {
        localStorage.setItem(cacheKey, newHTML);
    }
    container.innerHTML = newHTML;
}
function closeMobileChatView() {
    const screenEl = document.getElementById('screen-chats');
    if (screenEl) screenEl.classList.remove('mobile-chat-open');
    document.querySelectorAll('.chat-list-item').forEach(item => item.classList.remove('bg-slate-100', 'dark:bg-slate-800'));
    const main = document.getElementById('chat-main-area');
    setTimeout(() => {
        if (main) main.innerHTML = '';
    }, 310);
}

async function loadChatIntoMainArea(email, name, el) {
    if (!email.startsWith('book:')) email = email.toLowerCase();
    const main = document.getElementById('chat-main-area');
    main.innerHTML = '';

    const screenEl = document.getElementById('screen-chats');
    if (screenEl && window.innerWidth <= 768) {
        screenEl.classList.add('mobile-chat-open');
    }

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
    let isChatClosed = false, isChatHidden = false;
    if (isBook) {
        const bookName = email.replace('book:', '');
        const now = new Date();
        bookOnlineCount = globalUsersData.filter(u =>
            u.books &&
            u.books.includes(bookName) &&
            u.lastSeen &&
            (now - new Date(u.lastSeen) < 5 * 60 * 1000)
        ).length;
        try {
            const [{ data: closedData }, { data: hiddenData }] = await Promise.all([
                supabaseClient.from('system_announcements').select('id').eq('target_type', 'chat_closed').eq('content', bookName).maybeSingle(),
                supabaseClient.from('system_announcements').select('id').eq('target_type', 'chat_hidden').eq('content', bookName).maybeSingle()
            ]);
            isChatClosed = !!closedData;
            isChatHidden = !!hiddenData;
        } catch(e) { console.warn('chat status check failed', e); }
    }

    const partner = globalUsersData.find(u => u.email === email);
    const isPartnerBanned = partner && partner.isBanned;
    
    const isOnline = !isArchived && !isPartnerBanned && (email === 'admin@system' || (partner && partner.lastSeen && (new Date() - new Date(partner.lastSeen) < 5 * 60 * 1000)));
    const statusText = isArchived ? 'שיחה בארכיון' : (isPartnerBanned ? 'משתמש חסום' : (isOnline ? 'מחובר כעת' : 'לא מחובר'));
    const finalStatusText = isBook ? `${bookOnlineCount} לומדים מחוברים` : (isUpdates ? 'ערוץ עדכונים' : (isMentions ? 'מערכת התראות' : statusText));

    let statusColorClass = isArchived ? 'text-slate-400' : (isPartnerBanned ? 'text-red-500' : (isOnline ? 'text-emerald-500' : 'text-red-500'));
    if (isBook && bookOnlineCount > 0) {
        statusColorClass = 'text-emerald-500';
    }
    const statusDotBgClass = isOnline ? 'bg-emerald-400' : 'bg-red-500';
    const avatarInitial = name.charAt(0);

    const chatHtml = `
        <header class="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center px-4 justify-between shadow-sm z-20">
            <!-- כפתור חזרה – מובייל בלבד -->
            <button class="mobile-back-btn md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors" onclick="closeMobileChatView()" title="חזרה לרשימה" style="display:none;">
                <span class="material-icons-round text-xl text-slate-500">arrow_forward</span>
            </button>
            <!-- שם ואייקון – צד ימין (ראשון ב-RTL) -->
            <div class="flex items-center gap-3">
                <div class="relative">
                    <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">${isBook ? '<i class="fas fa-book"></i>' : (isAdmin ? '<i class="fas fa-headset text-xl leading-none" style="color:#0ea5e9;"></i>' : (isUpdates ? '<i class="fas fa-bullhorn text-amber-500"></i>' : (isMentions ? '<i class="fas fa-at text-amber-500"></i>' : avatarInitial)))}</div>
                    ${!isBook && !isUpdates && !isMentions && !isArchived && !isPartnerBanned ? `<span class="absolute bottom-0 left-0 w-3 h-3 rounded-full ${statusDotBgClass} border-2 border-white dark:border-slate-900"></span>` : ''}
                </div>
                <div class="flex flex-col">
                    <span class="font-bold text-lg leading-tight text-slate-800 dark:text-white" ${!isBook && !isAdmin && !isUpdates && !isMentions ? `onclick="showUserDetails('${email}')" style="cursor:pointer;"` : ''}>${name}${isPartnerBanned ? ' <span class="msg-banned-notice">חסום</span>' : ''}</span>
                    <span class="text-[10px] ${isUpdates || isMentions ? 'text-amber-500' : statusColorClass} font-medium">${finalStatusText}</span>
                </div>
            </div>
            <!-- כפתורי שליטה – צד שמאל (LTR: X, הגדלה, דיווח וחסימה) -->
            <div class="flex items-center gap-3" style="direction:ltr;">
                <button class="hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors" onclick="closeMainChat()" title="סגור"><span class="material-icons-round text-xl text-rose-400">close</span></button>
                <button class="hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors" onclick="minimizeMainChat('${email}', '${name.replace(/'/g, "\\'")}') " title="מזעור לחלון צף"><span class="material-icons-round text-xl text-slate-500">open_in_full</span></button>
                ${!isSystem && !isBook && !isPartnerBanned ? `<button onclick="openReportModal('${email}')" class="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${isBlocked ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400' : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-red-300 hover:text-red-500'}" title="דיווח וחסימה"><i class="fas fa-ban text-xs"></i> ${isBlocked ? 'חסום' : 'דיווח וחסימה'}</button>` : ''}
                ${isBook && hasPermission('moderate') ? `<button class="hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-full transition-colors" onclick="moderatorToggleChatClosed('${email.replace('book:', '')}')" title="${isChatClosed ? 'פתח צ\'אט' : 'סגור צ\'אט'}"><span class="material-icons-round text-xl ${isChatClosed ? 'text-emerald-400' : 'text-red-400'}">${isChatClosed ? 'lock_open' : 'lock'}</span></button>` : ''}
            </div>
        </header>
        <div class="flex-1 overflow-y-auto p-4 space-y-0 chat-wa-bg flex flex-col" id="msgs-${email}" style="gap:3px;">
            <div class="chat-loading-indicator" style="padding:16px;">${getSkeletonHTML('chat', 5)}</div>
        </div>
        <div class="typing-indicator-box" id="typing-${email}"></div>
        ${(isArchived || isUpdates || isMentions || isPartnerBanned || (isChatClosed && !hasPermission('post_locked'))) ? `
            <footer class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div class="text-center text-slate-500 p-2">${isUpdates || isMentions ? 'ערוץ לקריאה בלבד.' : isPartnerBanned ? 'לא ניתן לשלוח הודעות — המשתמש חסום.' : isChatClosed ? '🔒 צ\'אט זה סגור זמנית על-ידי הניהול.' : 'צ\'אט זה בארכיון (לקריאה בלבד).'}</div>
            </footer>
        ` : `
            <footer class="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                ${isChatClosed ? '<div class="text-xs text-amber-500 text-center mb-2">🔓 הרשאת פרסום בצ\'אט נעול פעילה</div>' : ''}
                <div id="reply-preview-${email}" class="reply-preview"></div>
                <div class="max-w-5xl mx-auto relative flex items-center gap-3">
                    <div id="mentions-popup-${email}" class="mentions-popup"></div>
                    ${!isBook && !isSystem && !isArchived ? `<button class="w-10 h-10 flex items-center justify-center rounded-xl shrink-0" disabled title="שיחות וידאו אינן זמינות כעת — בקרוב" style="background:#e2e8f0; color:#94a3b8; opacity:0.5; cursor:not-allowed; filter:grayscale(1);"><i class="fas fa-video-slash text-sm"></i></button>` : ''}
                    ${hasPermission('announce') && isBook ? `<button class="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors shrink-0" onclick="sendSystemAnnouncement('${email}')" title="שלח הודעת מערכת"><i class="fas fa-bullhorn text-sm"></i></button>` : ''}
                    <input type="text" id="input-${email}" autocomplete="off" class="w-full h-12 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-5 text-sm focus:ring-2 focus:ring-blue-500/50 dark:text-white dark:placeholder-slate-500" placeholder="הקלד הודעה..."
                        oninput="handleTyping('${email}'); handleMentionInput(event, '${email}')"
                        onkeypress="if(event.key === 'Enter' && !event.shiftKey && !isMentionPopupActive()) sendMessage('${email}')"
                        onkeydown="if(event.key==='Enter'&&event.shiftKey){event.preventDefault();const p=this.selectionStart;this.value=this.value.slice(0,p)+'\\n'+this.value.slice(p);this.selectionStart=this.selectionEnd=p+1;return false;} return handleMentionKeyDown(event, '${email}')">
                    <button class="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-slate-800 transition-transform active:scale-95 shadow-md shrink-0" onclick="sendMessage('${email}')">
                        <span class="material-icons-round transform -scale-x-100">send</span>
                    </button>
                </div>
            </footer>
        `}
    `;
    main.innerHTML = chatHtml;

    if (isChatHidden) {
        const msgsEl = document.getElementById(`msgs-${email}`);
        if (msgsEl) msgsEl.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fas fa-eye-slash" style="font-size:2rem;margin-bottom:8px;display:block;"></i>הניהול הסתיר את הודעות הצ\'אט הזה.</div>';
    } else {
        loadChatHistory(email);
    }

    markAsRead(email);
}

function closeMainChat() {
    const screenEl = document.getElementById('screen-chats');
    const isMobile = window.innerWidth <= 768;
    if (screenEl) screenEl.classList.remove('mobile-chat-open');
    const placeholder = `<div style="margin: auto; color: #94a3b8; text-align: center;"><i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3;"></i><p>בחר צ'אט מהרשימה</p></div>`;
    if (isMobile) {
        setTimeout(() => { document.getElementById('chat-main-area').innerHTML = placeholder; }, 310);
    } else {
        document.getElementById('chat-main-area').innerHTML = placeholder;
    }
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

    const table = getChatTable(partnerEmail);
    let data = [];
    let error = null;

let query;
    if (table === 'chat_public') {
        const bookName = partnerEmail.replace('book:', '');
        query = supabaseClient.from(table).select('*').eq('book_name', bookName).order('created_at', { ascending: true });
    } else if (table === 'chat_admin') {
        query = supabaseClient.from(table).select('*').eq('user_id', currentUser.id);
        if (partnerEmail === 'updates@system') {
            query = query.eq('sender_email', 'updates@system');
        } else if (partnerEmail === 'mentions@system') {
            query = query.eq('sender_email', 'mentions@system');
        } else {
            query = query.not('sender_email', 'eq', 'updates@system').not('sender_email', 'eq', 'mentions@system');
        }
    } else {
        
        const conn = typeof chavrutaConnections !== 'undefined' ? chavrutaConnections.find(c => c.email === partnerEmail) : null;
        let connId = (conn && conn.id) || (window._archivedConnIds && window._archivedConnIds[partnerEmail]);

if (!connId && currentUser?.id) {
            const isArchivedChat = typeof approvedPartners !== 'undefined' && !approvedPartners.has(partnerEmail);
            if (isArchivedChat) {
                const partnerUser = globalUsersData.find(u => u.email === partnerEmail);
                if (partnerUser?.id) {
                    try {
                        const { data: archiveConn } = await supabaseClient
                            .from('chavruta_connections')
                            .select('id')
                            .in('status', ['cancelled', 'completed', 'rejected'])
                            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerUser.id}),and(sender_id.eq.${partnerUser.id},receiver_id.eq.${currentUser.id})`)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        if (archiveConn?.id) {
                            connId = archiveConn.id;
                            window._archivedConnIds = window._archivedConnIds || {};
                            window._archivedConnIds[partnerEmail] = connId;
                        }
                    } catch(e) { console.warn('archive connId lookup failed', e); }
                }
            }
        }

        if (connId) {
            query = supabaseClient.from(table).select('id, connection_id, sender_id, content, created_at, sender_email, is_read').eq('connection_id', connId);
        } else {
            query = supabaseClient.from(table).select('id, connection_id, sender_id, content, created_at, sender_email, is_read').eq('sender_id', currentUser.id);
        }
    }

    const { data: directData, error: directError } = await query.order('created_at', { ascending: true });
    if (directError && directError.code === '400') console.error("Full DB Error (Load Chat History):", directError.message, directError.details);
    data = directData;
    error = directError;

    if (error) console.error("שגיאה בטעינת צ'אט:", error);

    const container = getChatContainer(partnerEmail);
    if (!container) return;

    const loader = container.querySelector('.chat-loading-indicator');
    if (loader) loader.remove();

    if (data) {
        const isBook = partnerEmail.startsWith('book:');

if (isBook && data.length > 0) {
            const unknownEmails = new Set();
            const unknownIds = new Set();
            data.forEach(msg => {
                const se = msg.sender_email;
                if (se && se !== currentUser?.email && !globalUsersData.find(u => u.email === se)) {
                    unknownEmails.add(se);
                }
                const uid = msg.user_id || msg.sender_id;
                if (uid && uid !== currentUser?.id && !globalUsersData.find(u => u.id === uid)) {
                    unknownIds.add(uid);
                }
            });
            try {
                const queries = [];
                if (unknownEmails.size > 0) {
                    queries.push(supabaseClient.from('profiles_public').select('id, email, display_name').in('email', Array.from(unknownEmails)));
                }
                if (unknownIds.size > 0) {
                    queries.push(supabaseClient.from('profiles_public').select('id, email, display_name').in('id', Array.from(unknownIds)));
                }
                const results = await Promise.all(queries);
                results.forEach(({ data: profiles }) => {
                    if (profiles) {
                        profiles.forEach(p => {
                            if (!globalUsersData.find(u => u.id === p.id)) {
                                globalUsersData.push({ id: p.id, email: p.email, name: p.display_name || (p.email ? p.email.split('@')[0] : 'לומד') });
                            }
                        });
                    }
                });
            } catch (_) {}
        }

        container.innerHTML = '';

        if (data.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'chat-empty-state flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 gap-2';
            const isReadOnly = partnerEmail === 'updates@system' || partnerEmail === 'mentions@system';
            if (isBook) {
                emptyDiv.innerHTML = `<i class="far fa-comment-dots text-3xl"></i><span class="text-sm">אין הודעות עדיין בצ'אט זה.</span>`;
            } else if (isReadOnly) {
                emptyDiv.innerHTML = `<i class="far fa-comment-dots text-3xl"></i><span class="text-sm">אין הודעות עדיין בערוץ זה.</span>`;
            } else {
                emptyDiv.innerHTML = `<i class="far fa-comment-dots text-3xl"></i><span class="text-sm">אין הודעות עדיין. היה הראשון לכתוב!</span>`;
            }
            container.appendChild(emptyDiv);
        }

        data.forEach(msg => {
            
            if (msg.parent_message_id) return;

            const msgContent = msg.content || msg.message_text || msg.message || "";
            const hasReplies = data.some(m => m.parent_message_id === msg.id);

            const isMe = (msg.user_id && msg.user_id === currentUser.id) || (msg.sender_id && msg.sender_id === currentUser.id);
            const type = isMe ? 'me' : 'other';
            const senderEmail = msg.sender_email || (globalUsersData.find(u => u.id === (msg.user_id || msg.sender_id))?.email);
            const el = appendMessageToWindow(partnerEmail, msgContent, type, msg.id, msg.created_at, !!msg.is_read, senderEmail, false);

            if (hasReplies && el) {
                const bubble = el.querySelector('.message-bubble') || el;
                const replyCount = data.filter(m => m.parent_message_id === msg.id).length;
                const threadBtn = document.createElement('button');
                threadBtn.className = 'thread-indicator-btn';
                threadBtn.innerHTML = `<span class="material-icons-round" style="font-size:0.8rem;vertical-align:middle;">forum</span> ${replyCount} תגובות בשרשור`;
                threadBtn.onclick = (e) => { e.stopPropagation(); openThread(msg.id, msgContent, partnerEmail); };
                bubble.appendChild(threadBtn);
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
            if (!currentUser || !currentUser.id) return;
            const { data: reactions } = await supabaseClient
                .from('message_reactions')
                .select('message_id, reaction_type')
                .in('message_id', msgIds)
                .eq('user_id', currentUser.id);

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
            if (window._pendingScrollMsgId) {
                const target = document.getElementById('msg-' + window._pendingScrollMsgId);
                window._pendingScrollMsgId = null;
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.style.transition = 'background 0.4s';
                    target.style.background = '#fef3c7';
                    setTimeout(() => { target.style.background = ''; }, 2000);
                    return;
                }
            }
            container.scrollTop = container.scrollHeight;
        }, 200);
    }
}

async function loadChatRating() {
    const display = document.getElementById('chatRatingDisplay');
    if (!currentUser) return;

    try {
        
        const { data: privateMessages, error: privateError } = await supabaseClient
            .from('chat_private')
            .select('id, connection_id, created_at')
            .eq('sender_id', currentUser.id);
        if (privateError) {
            if (privateError.code === '400') console.error("Full DB Error (Rating Private):", privateError.message, privateError.details);
            throw privateError;
        }

const { data: publicMessages, error: publicError } = await supabaseClient
            .from('chat_public')
            .select('id')
            .eq('user_id', currentUser.id); 
        if (publicError) {
            if (publicError.code === '400') console.error("Full DB Error (Rating Public):", publicError.message, publicError.details);
            throw publicError;
        }

const allMessageIds = [...(privateMessages || []), ...(publicMessages || [])].map(m => m.id || m.connection_id).filter(Boolean);

        if (allMessageIds.length > 0) {
            const { count, error: reactionsError } = await supabaseClient.from('message_reactions').select('*', { count: 'exact', head: true }).in('message_id', allMessageIds).eq('reaction_type', 'like');
            if (reactionsError) throw reactionsError;

            const rating = count || 0;
            if (display) display.innerText = rating;
            const dashStat = document.getElementById('stat-rating');
            if (dashStat) dashStat.innerText = rating;
            localStorage.setItem('torahApp_rating', rating);
            if (currentUser && currentUser.id) {
                currentUser.chat_rating = rating;
                supabaseClient.from('profiles_public').update({ chat_rating: rating }).eq('id', currentUser.id).then(() => {});
            }
        } else {
            if (display) display.innerText = 0;
            const dashStat = document.getElementById('stat-rating');
            if (dashStat) dashStat.innerText = 0;
            localStorage.setItem('torahApp_rating', 0);
        }
    } catch (error) {
        console.error("Full DB Error (Chat Rating):", error);
        if (display) display.innerText = 0;
        const dashStat = document.getElementById('stat-rating');
        if (dashStat) dashStat.innerText = 0;
        localStorage.setItem('torahApp_rating', 0);
    }
}

async function doSendMessage(partnerEmail, finalMsg, isHtml) {
    if (currentUser && currentUser.isBanned) {
        showToast('חשבונך חסום לשליחת הודעות', 'error');
        return;
    }

    if (finalMsg && finalMsg.length > 1000) {
        showToast('הודעה חורגת ממגבלת 1,000 תווים', 'error');
        return;
    }

    const table = getChatTable(partnerEmail);
    const partner = globalUsersData.find(u => u.email === partnerEmail);
    const partnerId = partner ? partner.id : null;

    const msgCol = 'content';
    const payload = { [msgCol]: finalMsg, created_at: new Date().toISOString() };
    
    if (table !== 'chat_admin') {
        payload.parent_message_id = (activeReply && activeReply.chatId === partnerEmail) ? activeReply.msgId : null;
    }

    if (table === 'chat_public') {
        payload.book_name = partnerEmail.replace('book:', '');
        payload.user_id = currentUser.id;
    } else if (table === 'chat_admin') {
        
        payload.user_id = currentUser.id;
        payload.sender_email = currentUser.email;
    } else {
        
        const conn = typeof chavrutaConnections !== 'undefined'
            ? (chavrutaConnections.find(c => c.email === partnerEmail) || chavrutaConnections.find(c => c.partnerId === partnerEmail))
            : null;
        if (conn && conn.id) {
            payload.connection_id = conn.id;
        }
        payload.sender_id = currentUser.id;
        payload.sender_email = currentUser.email;
    }

    try {
        const { data, error } = await supabaseClient
            .from(table)
            .insert([payload])
            .select();

        if (error) {
            if (error.code === '42501' || error.status === 403) {
                const { data: profile } = await supabaseClient.from('profiles_public').select('is_banned').eq('id', currentUser.id).maybeSingle();
                if (profile && profile.is_banned) {
                    showToast('פעולה נכשלה: חשבונך חסום במערכת עקב הפרת כללי הקהילה.', 'error');
                    return;
                }
            }
            console.error("Chat Insert Error:", error.message, error.details || error);
        } else {
            const newMsg = (data && data[0]) ? data[0] : { ...payload, id: null };
            const msgId = newMsg.id || null;
            const msgContent = newMsg.content || finalMsg;
            const msgTime = newMsg.created_at || payload.created_at;
            const senderEmail = newMsg.sender_email || currentUser.email;

            appendMessageToWindow(partnerEmail, msgContent, 'me', msgId, msgTime, false, senderEmail, true);

            if (msgId && chatChannel) {
                chatChannel.send({ type: 'broadcast', event: 'private_message', payload: { message: newMsg } });
            }
            if (isHtml && msgId) {
                const mentionMatches = finalMsg.matchAll(/<span class="mention" data-user-email="([^"]+)">@([^<]+)<\/span>/g);
                for (const match of mentionMatches) sendMentionNotification(match[1], partnerEmail, msgId);
            }
        }
    } catch (e) { console.error("Full DB Error (Do Send Message):", e.message, e.details || e); }
}

async function sendMessage(partnerEmail) {
    if (!requireAuth()) return;
    const isBook = partnerEmail.startsWith('book:');
    if (!isBook && blockedUsers.includes(partnerEmail)) return await customAlert("משתמש זה חסום.");
    
    const partnerUserObj = !isBook ? globalUsersData.find(u => u.email === partnerEmail) : null;
    if (partnerUserObj && partnerUserObj.isBanned) return await customAlert("לא ניתן לשלוח הודעות — המשתמש חסום על ידי הניהול.");

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
        
        const safeText = (activeReply.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const quoteHtml = `<div class="chat-quote" style="border-right:3px solid #94a3b8; padding:4px 8px; margin-bottom:6px; font-size:0.8rem; color:#64748b; border-radius:2px;"><strong>${activeReply.sender}:</strong> ${safeText}</div>`;
        finalMsg = quoteHtml + finalMsg;
        isHtml = true;
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

if (activeReply && activeReply.chatId === partnerEmail) {
        cancelReply(partnerEmail);
    }
}

function saveChatDraft(email, val) {
    localStorage.setItem('chat_draft_' + email, val);
}

function appendMessageToWindow(partnerEmail, text, type, id, timestamp, isRead = false, senderEmail = null, shouldAnimate = true) {

    if (typeof text === 'string' && /^ref:\d+$/.test(text.trim())) return null;

    const container = getChatContainer(partnerEmail);
    if (!container) return null;

    if (id && document.getElementById(`msg-${id}`)) return;

if (type === 'other' && senderEmail) {
        const senderUser = globalUsersData.find(u => u.email === senderEmail);
        if (senderUser && senderUser.isBanned) {
            
            if (partnerEmail.startsWith('book:')) return null;
            
        }
    }

const isDeletedMsg = typeof text === 'string' && text.startsWith('__DELETED__:');

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
        wrapper.style.alignItems = 'flex-start';
        wrapper.style.gap = '8px';
        wrapper.style.maxWidth = '70%';

        if (senderEmail) wrapper.dataset.sender = senderEmail;
        wrapper.style.alignSelf = type === 'me' ? 'flex-end' : 'flex-start';
        wrapper.style.flexDirection = type === 'me' ? 'row-reverse' : 'row';

        const senderUser = globalUsersData.find(u => u.email === senderEmail);
        const isSubscribed = senderUser && senderUser.subscription && senderUser.subscription.level > 0;
        const subClass = isSubscribed ? `aura-lvl-${senderUser.subscription.level}` : '';
        const subTitle = isSubscribed ? `מנוי: ${senderUser.subscription.name}` : '';

        const avatar = document.createElement('div');
        avatar.style.cssText = 'padding-top:2px;flex-shrink:0;cursor:pointer;';
        avatar.onclick = (e) => { e.stopPropagation(); showUserDetails(senderEmail); };

        const senderAvatarUrl = senderUser?.avatar_url || (type === 'me' ? (localStorage.getItem('torahApp_equipped_avatar') || null) : null);
        const senderBgUrl = senderUser?.background_url || null;

        if (senderAvatarUrl) {
            const bgStyle = senderBgUrl ? `background-image:url('${senderBgUrl}');background-size:cover;background-position:center;` : '';
            avatar.innerHTML = `<div class="${subClass}" title="${subTitle}" style="width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0;${bgStyle}"><img src="${senderAvatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"></div>`;
        } else if (senderBgUrl) {
            const initial2 = senderUser ? (senderUser.name || senderUser.display_name || '?').charAt(0) : '?';
            avatar.innerHTML = `<div class="${subClass}" title="${subTitle}" style="width:32px;height:32px;border-radius:50%;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.9rem;color:#fff;background-image:url('${senderBgUrl}');background-size:cover;background-position:center;">${initial2}</div>`;
        } else {
            const avatarColor = type === 'me' ? '#ca8a04' : '#f59e0b';
            avatar.innerHTML = `<i class="fas fa-user-circle ${subClass}" style="font-size:28px;color:${avatarColor};border-radius:50%;" title="${subTitle}"></i>`;
        }

const msgCol = document.createElement('div');
        msgCol.style.cssText = 'display:flex; flex-direction:column; gap:4px; min-width:0;';

        wrapper.appendChild(avatar);
        wrapper.appendChild(msgCol);
        msgCol.appendChild(div);
        container.appendChild(wrapper);
        topLevelElement = wrapper;

        const senderName = senderUser ? (senderUser.name || senderUser.display_name) : 'לומד';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'msg-sender-name';
        const badgesHtml = senderUser ? getFullUserBadges(senderUser) : '';
        nameSpan.innerHTML = `${senderName} ${badgesHtml}`;
        div.prepend(nameSpan);
    } else {
        const wrapper = document.createElement('div');
        if (shouldAnimate) wrapper.className = 'new-message-animation';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.maxWidth = '80%';
        wrapper.style.gap = '2px';
        if (type === 'me') {
            wrapper.style.alignSelf = 'flex-end';
            wrapper.style.alignItems = 'flex-end';
            wrapper.style.marginLeft = '0';
            wrapper.style.marginRight = 'auto';
        } else {
            wrapper.style.alignSelf = 'flex-start';
            wrapper.style.alignItems = 'flex-start';
            wrapper.style.marginRight = '0';
            wrapper.style.marginLeft = 'auto';
        }
        if (senderEmail) wrapper.dataset.sender = senderEmail;
        wrapper.appendChild(div);
        container.appendChild(wrapper);
        topLevelElement = wrapper;
    }

    if (type === 'me') {
        div.className = `message-bubble my-bubble max-w-md p-3 shadow-sm relative chat-bubble-me`;
    } else {
        div.className = `message-bubble max-w-md p-3 shadow-sm relative chat-bubble-other`;
    }

if (isDeletedMsg) {
        const deletedP = document.createElement('p');
        deletedP.className = 'msg-deleted-notice text-sm italic';
        deletedP.textContent = 'ההודעה נמחקה';
        div.appendChild(deletedP);
    } else if (type === 'other' && senderEmail && globalUsersData.find(u => u.email === senderEmail)?.isBanned) {
        
        const bannedBadge = document.createElement('span');
        bannedBadge.className = 'msg-banned-notice';
        bannedBadge.textContent = 'חסום';
        div.appendChild(bannedBadge);
        const bannedP = document.createElement('p');
        bannedP.className = 'text-sm leading-relaxed mb-1 opacity-50 italic';
        bannedP.textContent = 'הודעה ממשתמש חסום';
        div.appendChild(bannedP);
    } else if (typeof text === 'string' && text.startsWith('__VIDEO_INVITE__:')) {
        const parts = text.split(':');
        const videoRoomId = parts[1] || '';
        const videoBook = decodeURIComponent(parts.slice(2).join(':') || 'לימוד חברותא');
        const isSentByMe = type === 'me';
        const targetPartnerEmail = isSentByMe ? partnerEmail : (senderEmail || partnerEmail);
        const targetPartnerUser = globalUsersData.find(u => u.email === targetPartnerEmail);
        const targetName = targetPartnerUser ? targetPartnerUser.name : targetPartnerEmail.split('@')[0];
        div.innerHTML = `
            <div style="background:linear-gradient(135deg,#0ea5e9,#0369a1);color:white;padding:12px 16px;border-radius:12px;display:flex;flex-direction:column;gap:8px;min-width:200px;">
                <div style="font-size:1rem;font-weight:800;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-video"></i> הזמנה לשיחת וידיאו
                </div>
                <div style="font-size:0.82rem;opacity:0.85;">${isSentByMe ? 'שלחת הזמנה לשיחת וידאו' : 'הוזמנת לשיחת וידאו'}</div>
                ${videoBook && videoBook !== 'לימוד חברותא' ? `<div style="font-size:0.78rem;opacity:0.75;"><i class="fas fa-book-open" style="margin-left:4px;"></i>${videoBook}</div>` : ''}
                <button disabled style="background:#e2e8f0;color:#94a3b8;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:not-allowed;font-family:Assistant,sans-serif;font-size:0.87rem;display:flex;align-items:center;gap:6px;justify-content:center;opacity:0.6;" title="פונקציה זו אינה זמינה כעת — בקרוב">
                    <i class="fas fa-video-slash"></i> לא זמין כעת — בקרוב
                </button>
            </div>
        `;
    } else if (text.includes('<button') || text.includes('chat-quote') || text.includes('<strong>') || text.includes('<b>') || text.includes('<br>') || text.includes('<span')) {
        div.insertAdjacentHTML('beforeend', sanitizeChatHtml(text));
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

    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time-container flex justify-between items-center mt-auto pt-1 text-[10px] opacity-70';
    const checkHtml = (type === 'me' && id && !isDeletedMsg)
        ? `<span class="msg-check${isRead ? ' read' : ''}" id="chk-${id}">✓${isRead ? '✓' : ''}</span>`
        : '';
    timeDiv.innerHTML = `<span>${timeStr}</span>${checkHtml}`;
    div.appendChild(timeDiv);

    div.onclick = function (e) {
        if (e.target.closest('.msg-delete-btn, .restore-btn')) return;

        const mention = e.target.closest('.mention');
        if (mention) {
            const email = mention.getAttribute('data-user-email');
            if (email) showUserDetails(email);
            return;
        }

        const subBtn = e.target.closest('.sub-promo-btn[data-sub-tier]');
        if (subBtn) {
            const tierLevel = parseInt(subBtn.dataset.subTier);
            const amount = parseInt(subBtn.dataset.subAmount);
            if (typeof openDonationModalAndSelectTier === 'function') openDonationModalAndSelectTier(tierLevel, amount);
            return;
        }

        const ts = this.querySelector('.msg-timestamp');
        if (ts) ts.style.display = ts.style.display === 'block' ? 'none' : 'block';
    };

    if (isDeletedMsg && type === 'me') {
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'restore-btn text-xs text-blue-400 hover:text-blue-300 mr-2';
        restoreBtn.textContent = 'שחזור';
        restoreBtn.onclick = (e) => { e.stopPropagation(); restoreMessage(div); };
        timeDiv.prepend(restoreBtn);
    }

    if (id) {
        let plainText = text.replace(/<[^>]*>?/gm, '').replace('הצג טלפון ליצירת קשר', '').trim();
        const isBook = partnerEmail.startsWith('book:');
        const senderName = senderEmail ? (globalUsersData.find(u => u.email === senderEmail)?.name || senderEmail.split('@')[0]) : 'משתמש';
        const fullTextSafe = plainText.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeSenderName = senderName.replace(/'/g, "\\'");
        const isMe = senderEmail === currentUser.email;

const actionsBar = document.createElement('div');
        actionsBar.className = 'msg-actions-bar flex gap-1 items-center ' + (isMe ? 'justify-start' : 'justify-end');

        const likeDisabled = isMe ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';
        actionsBar.innerHTML = `
            <div class="msg-action-pill flex items-center gap-1" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:999px; padding:2px 8px; display:inline-flex; box-shadow:0 1px 4px rgba(0,0,0,0.08);">
                ${isBook ? `
                    <button class="reaction-btn" ${likeDisabled} onclick="event.stopPropagation(); toggleReaction('${id}', 'like', this)" style="display:inline-flex;align-items:center;gap:2px;padding:3px 5px;background:none;border:none;cursor:pointer;color:var(--text-main);opacity:${isMe ? '0.5' : '1'};" ${isMe ? 'disabled' : ''}>
                        <i class="fas fa-thumbs-up" style="font-size:0.8rem;"></i>
                        <span id="like-count-${id}" style="font-size:0.72rem;margin-right:1px;display:none;font-weight:bold;">0</span>
                    </button>
                    <button class="reaction-btn" ${likeDisabled} onclick="event.stopPropagation(); toggleReaction('${id}', 'dislike', this)" style="display:inline-flex;align-items:center;padding:3px 5px;background:none;border:none;cursor:pointer;color:var(--text-main);opacity:${isMe ? '0.5' : '1'};" ${isMe ? 'disabled' : ''}><i class="fas fa-thumbs-down" style="font-size:0.8rem;"></i></button>
                    <span style="width:1px;height:14px;background:var(--border-color);display:inline-block;margin:0 2px;"></span>
                ` : ''}
                <button style="display:inline-flex;align-items:center;padding:3px 5px;background:none;border:none;cursor:pointer;color:#94a3b8;" onclick="event.stopPropagation(); replyToMessage('${partnerEmail}', '${safeSenderName}', '${fullTextSafe}', '${id}')" title="ציטוט"><span class="material-icons-round" style="font-size:0.9rem;">reply</span></button>
                ${isMe ? `<button style="display:inline-flex;align-items:center;padding:3px 5px;background:none;border:none;cursor:pointer;color:#94a3b8;" onclick="event.stopPropagation(); editMessage('${id}')" title="ערוך"><span class="material-icons-round" style="font-size:0.9rem;">edit</span></button>` : ''}
                ${isBook ? `<button style="display:inline-flex;align-items:center;padding:3px 5px;background:none;border:none;cursor:pointer;color:#94a3b8;" onclick="event.stopPropagation(); openThread('${id}', '${fullTextSafe}', '${partnerEmail}')" title="שרשור"><span class="material-icons-round" style="font-size:0.9rem;">forum</span></button>` : ''}
                ${!isMe ? `<button style="display:inline-flex;align-items:center;padding:3px 5px;background:none;border:none;cursor:pointer;color:#ef4444;" onclick="event.stopPropagation(); openReportModal('${senderEmail}', '${isBook ? 'public' : 'private'}')" title="דיווח"><span class="material-icons-round" style="font-size:0.9rem;">flag</span></button>` : ''}
                ${isMe && !isDeletedMsg ? `<button style="display:inline-flex;align-items:center;padding:3px 5px;background:none;border:none;cursor:pointer;color:#ef4444;" onclick="event.stopPropagation(); deleteMessage('${id}', document.getElementById('msg-${id}'))" title="מחק"><span class="material-icons-round" style="font-size:0.9rem;">delete</span></button>` : ''}
            </div>
        `;

        const msgCol = div.parentElement || topLevelElement;
        msgCol.insertBefore(actionsBar, div);
    }

    const scrollToBottom = () => { container.scrollTop = container.scrollHeight; };
    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
    setTimeout(scrollToBottom, 100);
    return topLevelElement;
}

function replyToMessage(chatId, senderName, text, msgId) {
    activeReply = { chatId, sender: senderName, text, msgId };
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
            const chatContainer = msgEl.closest('[id^="chat-window-"], [id^="msgs-"]');
            const chatId = chatContainer
                ? chatContainer.id.replace('chat-window-', '').replace(/^msgs-/, '')
                : null;
            const table = getChatTable(activeThreadChatId || chatId);
            const { error } = await supabaseClient
                .from(table)
                .update({ content: finalMessage })
                .eq('id', id);

            if (error) throw error;
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
    if (!(await customConfirm('למחוק הודעה זו? ההודעה תוצג כנמחקה עבורך ועבור האחרים.'))) return;

    try {
        const chatContainer = element.closest('[id^="chat-window-"], [id^="msgs-"]');
        const partnerEmail = chatContainer
            ? chatContainer.id.replace('chat-window-', '').replace(/^msgs-/, '')
            : element.dataset.sender || null;
        const table = getChatTable(partnerEmail);

const clone = element.cloneNode(true);
        const toRemove = clone.querySelectorAll('.msg-delete-btn, .msg-time-container, .msg-sender-name, .thread-active-indicator');
        toRemove.forEach(el => el.remove());
        const originalContent = element.querySelector('p')?.textContent
            || element.innerText?.trim()
            || '';

const deletedContent = '__DELETED__:' + originalContent;
        const { data: updated, error } = await supabaseClient.from(table)
            .update({ content: deletedContent })
            .eq('id', id)
            .select('id');
        if (error) throw error;
        if (!updated || updated.length === 0) throw new Error('RLS_BLOCKED');

        if (chatChannel) {
            chatChannel.send({ type: 'broadcast', event: 'delete_message', payload: { id: id } });
        }

markMessageAsDeleted(element, true);
    } catch (e) {
        console.error("Full DB Error (Delete Message):", e.message, e.details || e);
        if (e.message === 'RLS_BLOCKED') {
            await customAlert("לא ניתן למחוק הודעה זו כרגע. נסה שוב מאוחר יותר.");
        } else {
            await customAlert("שגיאה במחיקת ההודעה");
        }
    }
}

function markMessageAsDeleted(element, isOwner) {
    const pEls = element.querySelectorAll('p:not(.msg-deleted-notice), .chat-quote');
    pEls.forEach(el => el.remove());
    const delBtn = element.querySelector('.msg-delete-btn');
    if (delBtn) delBtn.remove();

    if (!element.querySelector('.msg-deleted-notice')) {
        const deletedP = document.createElement('p');
        deletedP.className = 'msg-deleted-notice text-sm italic';
        deletedP.textContent = 'ההודעה נמחקה';
        const timeDiv = element.querySelector('.msg-time-container');
        if (timeDiv) element.insertBefore(deletedP, timeDiv);
        else element.appendChild(deletedP);
    }

    if (isOwner) {
        const timeDiv = element.querySelector('.msg-time-container');
        if (timeDiv && !timeDiv.querySelector('.restore-btn')) {
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'restore-btn text-xs text-blue-400 hover:text-blue-300 mr-2';
            restoreBtn.textContent = 'שחזור';
            restoreBtn.onclick = (e) => { e.stopPropagation(); restoreMessage(element); };
            timeDiv.prepend(restoreBtn);
        }
    }
}

async function restoreMessage(element) {
    const msgId = element.id?.replace('msg-', '');
    if (!msgId) return;
    const chatContainer = element.closest('[id^="chat-window-"], [id^="msgs-"]');
    const partnerEmail = chatContainer?.id.replace('chat-window-', '').replace(/^msgs-/, '') || null;
    const table = getChatTable(partnerEmail);
    const { data, error } = await supabaseClient.from(table).select('content').eq('id', msgId).maybeSingle();
    if (error || !data) return customAlert('שגיאה בשחזור ההודעה');
    const content = data.content || '';
    if (!content.startsWith('__DELETED__:')) return customAlert('לא נמצא תוכן לשחזור');
    const original = content.slice('__DELETED__:'.length);
    const newContent = await customPrompt('ערוך את ההודעה לפני השחזור:', original);
    if (newContent === null) return;
    const { error: updateErr } = await supabaseClient.from(table).update({ content: newContent }).eq('id', msgId);
    if (updateErr) return customAlert('שגיאה בשחזור: ' + updateErr.message);
    updateMessageDOM(msgId, newContent);
    
    const msgEl = document.getElementById(`msg-${msgId}`);
    if (msgEl) {
        const restoreBtn = msgEl.querySelector('.restore-btn');
        if (restoreBtn) restoreBtn.remove();
        const delBtn = document.createElement('button');
        delBtn.className = 'msg-delete-btn';
        delBtn.innerHTML = '<i class="fas fa-trash"></i>';
        delBtn.onclick = (e) => { e.stopPropagation(); deleteMessage(msgId, msgEl); };
        msgEl.appendChild(delBtn);
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

if (type === 'dislike' && !isActive && otherBtn.classList.contains('active')) {
        const likeCountSpan = otherBtn.querySelector(`span[id^='like-count-']`);
        if (likeCountSpan) {
            const lc = Math.max(0, parseInt(likeCountSpan.innerText || '0') - 1);
            likeCountSpan.innerText = lc;
            likeCountSpan.style.display = lc > 0 ? 'inline' : 'none';
        }
    }

    try {
        if (isActive) {
            await supabaseClient.from('message_reactions').delete()
                .eq('message_id', msgId)
                .eq('user_id', currentUser.id);

            btn.classList.remove('active');
            btn.style.color = '';
            delete btn.dataset.reaction;
        } else {
            
            let alreadyLiked = false;
            if (type === 'like') {
                const { data: existingLike } = await supabaseClient
                    .from('message_reactions')
                    .select('id')
                    .eq('message_id', msgId)
                    .eq('user_id', currentUser.id)
                    .eq('reaction_type', 'like')
                    .maybeSingle();
                alreadyLiked = !!existingLike;
            }

            if (alreadyLiked) {
                showToast('כבר נתת לייק להודעה זו', 'info');
                return;
            }

            await supabaseClient.from('message_reactions').upsert({
                message_id: msgId,
                user_id: currentUser.id,
                reaction_type: type
            }, { onConflict: 'message_id,user_id' });

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
                    const { data: msg } = await supabaseClient.from('chat_public').select('user_id, content').eq('id', msgId).maybeSingle();
                    if (msg && msg.user_id && msg.user_id !== currentUser.id) {
                        const senderUser = globalUsersData.find(u => u.id === msg.user_id);
                        if (senderUser?.id) {
                            const { data: cur } = await supabaseClient.from('profiles_public').select('reward_points').eq('id', senderUser.id).maybeSingle();
                            await supabaseClient.from('profiles_public').update({ reward_points: (cur?.reward_points || 0) + 5 }).eq('id', senderUser.id);
                            const rawMsg = msg.content || '';
                            const cleanMsg = rawMsg.replace(/<[^>]*>?/gm, '').substring(0, 30) + (rawMsg.length > 30 ? '...' : '');
                            const notifText = `👍 ${currentUser.displayName} נתן לייק על ההודעה שלך: "${cleanMsg}"`;
                            
                            await _insertNotification(senderUser.id, 'לייק חדש', notifText);
                            
                            supabaseClient.from('rating_log').insert({
                                user_id: senderUser.id,
                                source: 'like',
                                points: 5,
                                ref_id: String(msgId)
                            }).then(() => {}).catch(() => {});
                        }
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
        el.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span><span class="typing-dots-label">${text}</span>`;
        el.classList.add('active');
        if (typingTimers[partnerEmail]) clearTimeout(typingTimers[partnerEmail]);
        typingTimers[partnerEmail] = setTimeout(() => { el.classList.remove('active'); }, 3000);
    }
}

function markAsRead(senderEmail) {
    const emailKey = !senderEmail.startsWith('book:') ? senderEmail.toLowerCase() : senderEmail;

    lastReadTimes[emailKey] = Date.now();
    localStorage.setItem('torahApp_lastReadTimes', JSON.stringify(lastReadTimes));

    if (unreadMessages[emailKey]) {
        unreadMessages[emailKey] = 0;
        localStorage.setItem('torahApp_unread', JSON.stringify(unreadMessages));
        if (typeof updateChatBadge === 'function') updateChatBadge();
    }
    if (document.getElementById('screen-chavrutas')?.classList.contains('active')) renderChavrutas();

    
    if (!emailKey.startsWith('book:') && !emailKey.includes('@system') && currentUser?.id) {
        markAllChatRead(emailKey);
    }
}

function updateCheckmarksForChat(partnerEmail) {
    const containers = [];
    const mainMsgs = document.getElementById(`msgs-${partnerEmail}`);
    if (mainMsgs) containers.push(mainMsgs);
    const winEl = document.getElementById(`chat-window-${partnerEmail}`);
    if (winEl) containers.push(winEl);
    containers.forEach(container => {
        container.querySelectorAll('.msg-check').forEach(el => {
            if (!el.classList.contains('read')) {
                el.classList.add('read');
                el.textContent = '✓✓';
            }
        });
    });
}

let mentionQuery = null;
let mentionTriggerIndex = -1;
let activeMentionPopup = null;
let mentionUserList = [];
let selectedMentionIndex = -1;

function isMentionPopupActive() {
    return activeMentionPopup && activeMentionPopup.style.display === 'block';
}

async function moderatorToggleChatClosed(bookName) {
    if (!hasPermission('moderate')) return;
    const { data: existing } = await supabaseClient
        .from('system_announcements')
        .select('id')
        .eq('target_type', 'chat_closed')
        .eq('content', bookName)
        .maybeSingle();
    if (existing) {
        await supabaseClient.from('system_announcements').delete().eq('id', existing.id);
        showToast(`צ'אט "${bookName}" נפתח`, 'success');
    } else {
        await supabaseClient.from('system_announcements').insert({
            title: `סגירת צ'אט: ${bookName}`,
            content: bookName,
            target_type: 'chat_closed',
            created_at: new Date().toISOString()
        });
        showToast(`צ'אט "${bookName}" נסגר`, 'warn');
    }
    openMainChat(bookName.startsWith('book:') ? bookName : 'book:' + bookName, bookName);
}

async function sendSystemAnnouncement(email) {
    if (!hasPermission('announce')) return;
    const text = prompt('הזן את תוכן ההודעה לשליחה כהודעת מערכת:');
    if (!text || !text.trim()) return;
    const bookName = email.replace('book:', '');
    const { error } = await supabaseClient.from('chat_messages').insert({
        room: bookName,
        sender_email: 'admin@system',
        content: text.trim(),
        created_at: new Date().toISOString()
    });
    if (!error) showToast('הודעת מערכת נשלחה ✓', 'success');
    else showToast('שגיאה בשליחה: ' + error.message, 'error');
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

    activeMentionPopup.innerHTML = '<div class="p-2 text-sm text-slate-500">טוען משתמשים...</div>';

const chatContainer = document.getElementById(`msgs-${chatId}`);
    const postedUserEmails = new Set();
    if (chatContainer) {
        chatContainer.querySelectorAll('[data-sender]').forEach(el => {
            if (el.dataset.sender && el.dataset.sender !== currentUser.email) {
                postedUserEmails.add(el.dataset.sender);
            }
        });
    }

    let potentialUsers = [];
    if (chatId.startsWith('book:')) {
        const bookName = chatId.replace('book:', '');
        potentialUsers = globalUsersData.filter(u => u.books && u.books.includes(bookName) && u.email !== currentUser.email);
        
        const potentialEmailSet = new Set(potentialUsers.map(u => u.email));
        postedUserEmails.forEach(email => {
            if (!potentialEmailSet.has(email)) {
                const chatUser = globalUsersData.find(u => u.email === email);
                if (chatUser) potentialUsers.push(chatUser);
            }
        });
    } else {
        
        postedUserEmails.forEach(email => {
            const chatUser = globalUsersData.find(u => u.email === email);
            if (chatUser) potentialUsers.push(chatUser);
        });
        if (potentialUsers.length === 0) {
            potentialUsers = globalUsersData.filter(u => u.email !== currentUser.email && !u.isAnonymous).slice(0, 30);
        }
    }

    const lowerQuery = query.toLowerCase();
    let filteredUsers = potentialUsers.filter(u =>
        !query || (u.name || '').toLowerCase().includes(lowerQuery) || (u.email || '').toLowerCase().includes(lowerQuery)
    );

    filteredUsers.sort((a, b) => {
        const aPosted = postedUserEmails.has(a.email);
        const bPosted = postedUserEmails.has(b.email);
        if (aPosted && !bPosted) return -1;
        if (!aPosted && bPosted) return 1;
        return (a.name || '').localeCompare(b.name || '');
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

function scrollToMsgWithRetry(msgId, attempts) {
    if (!msgId) return;
    const el = document.getElementById('msg-' + msgId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background 0.4s';
        el.style.background = '#fef3c7';
        setTimeout(() => { el.style.background = ''; }, 2000);
    } else if (attempts > 0) {
        setTimeout(() => scrollToMsgWithRetry(msgId, attempts - 1), 300);
    }
}

function sendMentionNotification(mentionedEmail, chatId, msgId = null) {
    const isBook = chatId.startsWith('book:');
    const bookName = isBook ? chatId.replace('book:', '') : null;
    const safeBookName = bookName ? bookName.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';

    let jumpBtn;
    if (isBook) {
        jumpBtn = msgId
            ? `<button class="mention-jump-btn" style="display:inline-block; margin-right:8px; padding:3px 10px; background:#f59e0b; color:#fff; border-radius:6px; font-size:0.78rem; cursor:pointer; border:none;" onclick="event.stopPropagation(); window._pendingScrollMsgId='${msgId}'; openBookChat('${safeBookName}');">עבור לאזכור</button>`
            : `<button class="mention-jump-btn" style="display:inline-block; margin-right:8px; padding:3px 10px; background:#f59e0b; color:#fff; border-radius:6px; font-size:0.78rem; cursor:pointer; border:none;" onclick="event.stopPropagation(); openBookChat('${safeBookName}')">פתח צ'אט</button>`;
    } else {
        const safeEmail = chatId.replace(/'/g, "\\'");
        jumpBtn = msgId
            ? `<button class="mention-jump-btn" style="display:inline-block; margin-right:8px; padding:3px 10px; background:#f59e0b; color:#fff; border-radius:6px; font-size:0.78rem; cursor:pointer; border:none;" onclick="event.stopPropagation(); window._pendingScrollMsgId='${msgId}'; openChat('${safeEmail}');">עבור לאזכור</button>`
            : `<button class="mention-jump-btn" style="display:inline-block; margin-right:8px; padding:3px 10px; background:#f59e0b; color:#fff; border-radius:6px; font-size:0.78rem; cursor:pointer; border:none;" onclick="event.stopPropagation(); openChat('${safeEmail}')">פתח צ'אט</button>`;
    }

    const contextLabel = isBook ? `בצ'אט של הספר <strong style="color:#f59e0b;">${bookName}</strong>` : `בצ'אט פרטי`;
    const notificationMessage = `<span class="mention" data-user-email="${currentUser.email}">${currentUser.displayName || currentUser.email}</span> תייג אותך ${contextLabel}. ${jumpBtn}`;

supabaseClient.rpc('send_message', {
        p_sender_email: 'mentions@system',
        p_receiver_email: mentionedEmail,
        p_message: notificationMessage,
        p_is_html: true
    }).then(({ error }) => {
        if (error) {
            
            const mentionedUser = globalUsersData.find(u => u.email === mentionedEmail);
            if (mentionedUser && mentionedUser.id) {
                supabaseClient.from('chat_admin').insert({
                    user_id: mentionedUser.id,
                    sender_email: 'mentions@system',
                    content: notificationMessage,
                    created_at: new Date().toISOString()
                }).then(() => {}).catch(() => {});
            }
        }
    }).catch(e => {
        const mentionedUser = globalUsersData.find(u => u.email === mentionedEmail);
        if (mentionedUser && mentionedUser.id) {
            supabaseClient.from('chat_admin').insert({
                user_id: mentionedUser.id,
                sender_email: 'mentions@system',
                content: notificationMessage,
                created_at: new Date().toISOString()
            }).then(() => {}).catch(() => {});
        }
    });

const mentionedUser = globalUsersData.find(u => u.email === mentionedEmail);
    if (mentionedUser && mentionedUser.id) {
        _insertNotification(mentionedUser.id, `תיוג מאת ${currentUser.displayName || currentUser.email}`, `תויגת בצ'אט של "${bookName}"`);
    }
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

function sendVideoCallInvite(partnerEmail, partnerName) {
    if (typeof showToast === 'function') showToast('שיחות וידאו אינן זמינות כעת — בקרוב!', 'info');
}
