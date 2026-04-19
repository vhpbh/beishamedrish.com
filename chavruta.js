let chavrutaConnections = JSON.parse(localStorage.getItem('torahApp_chavrutas') || "[]");
let approvedPartners = new Set(chavrutaConnections.map(c => c.email));
let pendingSentRequests = [];

async function sendChavrutaRequest(receiverEmail, bookName) {
    if (!currentUser) {
        await customAlert("עליך להיות מחובר כדי לשלוח בקשת חברותא");
        return false;
    }

    if (!receiverEmail || receiverEmail === 'undefined') {
        console.error("Missing receiver email:", { receiverEmail, bookName });
        return false;
    }

    try {
        console.log("שולח בקשה:", { receiverEmail, bookName });
        const { error } = await supabaseClient
            .from('chavruta_requests')
            .insert([{
                sender_email: currentUser.email,
                receiver_email: receiverEmail,
                book_name: bookName,
                status: 'pending'
            }]);

        if (error) throw error;

        showToast("בקשת החברותא נשלחה בהצלחה!", "success");
        return true;
    } catch (e) {
        console.error("שגיאה בשליחת הבקשה:", e);
        await customAlert("נכשל בשליחת הבקשה: " + (e.message || "שגיאה לא ידועה"));
        return false;
    }
}

async function respondToRequest(reqId, action) {
    if (!requireAuth()) return;

    try {
        const { error } = await supabaseClient
            .from('chavruta_requests')
            .update({ status: action }) 
            .eq('id', reqId);

        if (error) throw error;

        showToast(action === 'approved' ? "הבקשה אושרה! כעת ניתן לראות פרטי קשר." : "הבקשה נדחתה.", action === 'approved' ? "success" : "info");

        if (action === 'approved') {
            try {
                const { data: req } = await supabaseClient.from('chavruta_requests').select('sender_email, receiver_email').eq('id', reqId).single();
                if (req) {
                    const pointsToAward = 50;
                    await supabaseClient.rpc('increment_field', { table_name: 'users', field_name: 'reward_points', increment_value: pointsToAward, user_email: req.sender_email });
                    await supabaseClient.rpc('increment_field', { table_name: 'users', field_name: 'reward_points', increment_value: pointsToAward, user_email: req.receiver_email });
                    showToast(`שניכם קיבלתם ${pointsToAward} זוזים על קביעת החברותא!`, 'success');
                }
            } catch (e) {
                console.error("Error awarding points for chavruta", e);
            }
            const { data: reqData } = await supabaseClient.from('chavruta_requests').select('*').eq('id', reqId).single();
            if (reqData) {
                const exists = userGoals.some(g => g.bookName === reqData.book_name && g.status === 'active');
                if (!exists) {
                    await createGoal(reqData.book_name, 100, null, "לימוד עם חברותא");
                    showToast(`הספר ${reqData.book_name} נוסף לרשימת הלימוד שלך`, "success");
                }

                const partnerEmail = reqData.sender_email === currentUser.email ? reqData.receiver_email : reqData.sender_email;
                approvedPartners.add(partnerEmail);
                chavrutaConnections.push({ email: partnerEmail, book: reqData.book_name });
                const partnerUser = globalUsersData.find(u => u.email === partnerEmail);
                const partnerName = partnerUser ? partnerUser.name : partnerEmail.split('@')[0];

                switchScreen('chats', document.querySelector('.floating-nav-item[onclick*="chats"]'));
                if (typeof openChat === 'function') {
                    openChat(partnerEmail, partnerName);
                }
            }
        }

        document.getElementById('notif-list').innerHTML = '<p style="color:#999; text-align:center;">אין הודעות חדשות</p>';
        document.getElementById('notif-badge').style.display = 'none';
        syncGlobalData();
    } catch (e) {
        console.error(e);
        await customAlert("שגיאה בעדכון הבקשה.");
    }
}

async function checkIncomingRequests() {
    if (!currentUser) return;
    try {
        const { data: requests, error } = await supabaseClient
            .from('chavruta_requests')
            .select('*')
            .eq('receiver_email', currentUser.email)
            .eq('status', 'pending');

        if (error) throw error;

        if (requests && requests.length > 0) {
            requests.forEach(req => {
                const senderUser = globalUsersData ? globalUsersData.find(u => u.email === req.sender_email) : null;
                const senderName = senderUser ? senderUser.name : req.sender_email;

                const htmlContent = `
                    <div style="font-weight:bold; font-size:0.9rem; margin-bottom:5px;">בקשת חברותא חדשה!</div>
                    <div style="font-size:0.85rem; margin-bottom:10px;">
                        המשתמש <strong>${senderName}</strong> רוצה ללמוד איתך את <em>${req.book_name}</em>.
                    </div>
                    <div style="display:flex; gap:5px; flex-wrap:wrap;">
                        <button class="btn" style="background:#3b82f6; font-size:0.8rem; padding:6px; flex:1; border:none; border-radius:4px; color:white; cursor:pointer;" 
                            onclick="showUserDetails('${req.sender_email}')">צפה בפרופיל</button>
                        <button class="btn" style="background:#16a34a; font-size:0.8rem; padding:6px; flex:1; border:none; border-radius:4px; color:white; cursor:pointer;" 
                            onclick="respondToRequest('${req.id}', 'approved')">אשר</button>
                        <button class="btn" style="background:#ef4444; font-size:0.8rem; padding:6px; flex:1; border:none; border-radius:4px; color:white; cursor:pointer;" 
                            onclick="respondToRequest('${req.id}', 'rejected')">דחה</button>
                    </div>
                `;

                if (typeof addNotification === 'function') {
                    addNotification(htmlContent, `req-${req.id}`, true);
                }
            });
        }
    } catch (e) {
        console.error("שגיאה בבדיקת בקשות נכנסות:", e);
    }
}

async function updateFollowersCount() {
    if (!requireAuth()) return;

    const cached = localStorage.getItem('torahApp_followersCount');
    const badge = document.getElementById('followersCountBadge');
    if (badge && cached) badge.innerText = cached;

    const { count } = await supabaseClient.from('user_followers').select('*', { count: 'exact', head: true }).eq('following_email', currentUser.email);

    if (badge) badge.innerText = count || 0;
    localStorage.setItem('torahApp_followersCount', count || 0);
}

function renderChavrutas() {
    const list = document.getElementById('chavrutasList');
    if (!list) return;

    let html = `
    <main class="max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-10">
        <!-- Page Hero Section -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-3 text-primary" style="color: var(--accent);">
                    <i class="fas fa-users text-3xl"></i>
                    <h2 class="text-3xl font-black tracking-tight text-text-main">החברותות שלי</h2>
                </div>
                <p class="text-text-muted text-lg" style="color: #64748b;">נהל את קשרי הלימוד והחברותות הפעילות שלך במקום אחד</p>
            </div>
            <button class="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-primary/20" style="background-color: var(--accent);" onclick="openChavrutaSelector()">
                <i class="fas fa-user-plus"></i>
                <span>חיפוש חברותא חדשה</span>
            </button>
        </div>
    `;

    if (approvedPartners.size === 0 && pendingSentRequests.length === 0) {
        html += `
        <div class="text-center p-10 border border-dashed rounded-xl mt-10" style="border-color: #cbd5e1;">
            <i class="fas fa-users text-6xl text-slate-300" style="opacity: 0.5;"></i>
            <h3 class="text-xl font-bold mt-4">עדיין אין לך חברותות</h3>
            <p class="text-slate-500">חפש ספרים והצע חברותא ללומדים אחרים כדי להתחיל!</p>
        </div>
        `;
        list.innerHTML = html;
        return;
    }

    if (approvedPartners.size > 0) {
        html += `
        <section class="flex flex-col gap-6">
            <div class="flex items-center justify-between border-b border-neutral-soft pb-4">
                <h3 class="text-xl font-bold flex items-center gap-2">
                    <i class="fas fa-user-check text-primary" style="color: var(--accent);"></i>
                    חברותות פעילות
                </h3>
                <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold" style="background-color: #dcfce7; color: #166534;">${approvedPartners.size} פעילות</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        `;

        approvedPartners.forEach(email => {
            let user = globalUsersData.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
            if (!user) {
                user = { name: email.split('@')[0], email: email, city: 'לא זמין', lastSeen: null, subscription: { level: 0 } };
            }

            const sharedBooks = chavrutaConnections.filter(c => c.email === email).map(c => c.book);
            const unreadCount = unreadMessages[email] || 0;
            const unreadBadge = unreadCount > 0 ? `<span class="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">${unreadCount}</span>` : '';
            const safeName = (user.name || '').replace(/'/g, "\\'");
            const safeBook = sharedBooks.length > 0 ? sharedBooks[0].replace(/'/g, "\\'") : '';
            const badge = getUserBadgeHtml(user);

            html += `
            <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-neutral-soft overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                <div class="h-32 bg-primary/10 relative" style="background-color: rgba(202, 138, 4, 0.1);">
                    <div class="absolute -bottom-6 right-6">
                        <div class="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-sm flex items-center justify-center text-3xl text-slate-400">
                            <i class="fas fa-user"></i>
                        </div>
                    </div>
                    <div class="absolute top-4 left-4">
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                            <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            חברותא פעילה
                        </span>
                    </div>
                </div>
                <div class="p-6 pt-10 flex flex-col gap-4 flex-1">
                    <div>
                        <h4 class="text-xl font-bold flex items-center gap-2">
                            ${user.name}
                            ${badge}
                        </h4>
                        <div class="flex flex-col gap-1 mt-2">
                            <div class="flex items-center gap-2 text-text-muted text-sm">
                                <i class="fas fa-map-marker-alt text-base w-4 text-center"></i>
                                <span>${user.city || 'לא צוין'}</span>
                            </div>
                            <div class="flex items-center gap-2 text-text-muted text-sm">
                            <div class="flex items-center gap-2 text-text-muted text-sm">
                                <i class="fas fa-phone text-base w-4 text-center"></i>
                                <a href="tel:${user.phone}">${user.phone || 'לא הוזן'}</a>
                            </div>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-4 gap-2 border-y border-neutral-soft py-4 my-auto">
                        <button class="flex flex-col items-center gap-1 group/btn" onclick="showUserDetails('${user.email}')">
                            <div class="p-2 bg-neutral-soft rounded-lg text-text-main group-hover/btn:bg-primary transition-colors"><i class="fas fa-user"></i></div>
                            <span class="text-[10px] font-bold">פרופיל</span>
                        </button>
                        <button class="flex flex-col items-center gap-1 group/btn relative" onclick="openChat('${user.email}', '${safeName}')">
                            <div class="p-2 bg-neutral-soft rounded-lg text-text-main group-hover/btn:bg-primary transition-colors">
                                <i class="fas fa-comments"></i>
                                ${unreadBadge}
                            </div>
                            <span class="text-[10px] font-bold">צ'אט</span>
                        </button>
                        <button class="flex flex-col items-center gap-1 group/btn" onclick="openScheduleModal('${user.email}', '${safeBook}', '${safeName}')">
                            <div class="p-2 bg-neutral-soft rounded-lg text-text-main group-hover/btn:bg-primary transition-colors"><i class="fas fa-calendar-alt"></i></div>
                            <span class="text-[10px] font-bold">זמנים</span>
                        </button>
                        <button class="flex flex-col items-center gap-1 group/btn" onclick="openBookText('${safeBook}')">
                            <div class="p-2 bg-neutral-soft rounded-lg text-text-main group-hover/btn:bg-primary transition-colors"><i class="fas fa-book"></i></div>
                            <span class="text-[10px] font-bold">ספר</span>
                        </button>
                    </div>
                    <button class="w-full py-2.5 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors text-sm flex items-center justify-center gap-2" onclick="cancelChavruta('${user.email}')">
                        <i class="fas fa-times-circle text-base"></i>
                        ביטול חברותא
                    </button>
                </div>
            </div>
            `;
        });
        html += `</div></section>`;
    }

    if (pendingSentRequests.length > 0) {
        html += `
        <section class="flex flex-col gap-6">
            <div class="flex items-center justify-between border-b border-neutral-soft pb-4">
                <h3 class="text-xl font-bold flex items-center gap-2">
                    <i class="fas fa-hourglass-half text-primary" style="color: var(--accent);"></i>
                    בקשות ממתינות לאישור
                </h3>
            </div>
            <div class="bg-neutral-soft/50 rounded-2xl p-6 border border-dashed border-text-muted/30" style="background-color: #fffbeb; border-color: #fde68a;">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        `;

        pendingSentRequests.forEach(req => {
            const user = globalUsersData.find(u => u.email === req.receiver);
            const name = user ? user.name : req.receiver;
            const time = timeAgo(req.created_at);

            html += `
            <div class="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-neutral-soft">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-2xl"><i class="fas fa-user"></i></div>
                    <div class="flex flex-col">
                        <span class="font-bold">${name}</span>
                        <span class="text-xs text-text-muted flex items-center gap-1">
                            <i class="fas fa-book-open text-sm"></i>
                            לימוד משותף: ${req.book}
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-1 text-xs text-text-muted bg-neutral-soft px-2 py-1 rounded-md" title="${new Date(req.created_at).toLocaleString('he-IL')}">
                        <i class="fas fa-clock text-sm"></i>
                        ${time}
                    </div>
                    <button class="text-red-600 text-xs font-bold hover:underline decoration-red-200 underline-offset-4" onclick="cancelSentRequest('${req.receiver}', '${req.book}')">ביטול בקשה</button>
                </div>
            </div>
            `;
        });

        html += `</div></div></section>`;
    }

    html += `</main>`;
    list.innerHTML = html;
}

function openChavrutaSelector() {
    const activeGoals = userGoals.filter(g => g.status === 'active');
    const modal = document.getElementById('chavrutaModal');
    const content = modal.querySelector('.modal-content');

    let html = `
    <div class="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-slate-700 pb-3">
        <h3 class="text-xl font-bold m-0 text-gray-800 dark:text-white">בחר ספר לחיפוש</h3>
        <button onclick="document.getElementById('chavrutaModal').style.display='none'" class="text-gray-400 hover:text-gray-600 transition-colors"><i class="fas fa-times text-xl"></i></button>
    </div>
    <div class="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
    `;

    if (activeGoals.length > 0) {
        activeGoals.forEach(g => {
            html += `
            <button onclick="openChavrutaSearch('${g.bookName.replace(/'/g, "\\'")}')" class="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-transparent hover:border-amber-200 dark:hover:border-amber-700 transition-all text-right w-full group">
                <span class="font-bold text-gray-700 dark:text-gray-200 group-hover:text-amber-700 dark:group-hover:text-amber-400">${g.bookName}</span>
                <i class="fas fa-search text-gray-300 group-hover:text-amber-500 transition-colors"></i>
            </button>`;
        });
    } else {
        html += `<div class="text-center text-gray-500 py-8">לא נמצאו לימודים פעילים.<br>הוסף ספר חדש כדי להתחיל.</div>`;
    }

    html += `
    </div>
    <div class="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex flex-col gap-2">
        <button onclick="startAddNewChavrutaFlow()" class="w-full py-2.5 bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
            <i class="fas fa-plus-circle"></i> הוסף ספר חדש וחפש
        </button>
        <button onclick="document.getElementById('chavrutaModal').style.display='none'; findNewChavruta()" class="w-full py-2 text-slate-500 font-medium hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors text-xs">
            או הקלד שם ספר לחיפוש מהיר...
        </button>
    </div>`;

    content.innerHTML = html;
    modal.style.display = 'flex';
    if (typeof bringToFront === 'function') bringToFront(modal);
}

function startAddNewChavrutaFlow() {
    if (typeof nextActionAfterGoalCreation !== 'undefined') {
        nextActionAfterGoalCreation = 'findChavruta';
    }
    closeModal();
    const addNavButton = Array.from(document.querySelectorAll('.floating-nav-item')).find(el => el.getAttribute('onclick')?.includes("switchScreen('add'"));
    switchScreen('add', addNavButton);
    showAddSection('new');
}