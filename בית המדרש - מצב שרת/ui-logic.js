function closeSearchDropdown() {
    document.getElementById('searchDropdown').classList.remove('active');
}

function openSearchDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    const tagsContainer = document.getElementById('search-tags-container');

    // Populate tags if not already there
    if (tagsContainer.children.length === 0) {
        tagsContainer.innerHTML = SEARCH_TAGS.map(tag =>
            `<div class="search-tag" id="search-tag-${tag.id}" onclick="toggleSearchTag('${tag.id}')">${tag.name}</div>`
        ).join('');
    }

    // Reset state
    // document.querySelectorAll('.search-tag').forEach(t => t.classList.remove('active'));
    document.getElementById('generalSearchResults').innerHTML = `<div style="text-align:center; color:#94a3b8; padding-top: 50px;"><i class="fas fa-search" style="font-size: 3rem; opacity: 0.5;"></i><p>הקלד כדי להתחיל חיפוש</p></div>`;

    // Auto-select tags based on context
    const activeScreen = document.querySelector('.screen.active')?.id;
    SEARCH_TAGS.forEach(tag => {
        if (activeScreen && tag.screens.includes(activeScreen)) {
            document.getElementById(`search-tag-${tag.id}`).classList.add('active');
        }
    });

    // Special check for open chat windows
    if (document.querySelector('.chat-window:not(.minimized)')) {
        document.getElementById('search-tag-chats').classList.add('active');
    }

    dropdown.classList.add('active');
}

function toggleSearchTag(tagId) {
    document.getElementById(`search-tag-${tagId}`).classList.toggle('active');
    // Re-run search with new filters
    executeGeneralSearch();
}

function debouncedGeneralSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(executeGeneralSearch, 300);
}

function handleSearchInput() {
    const input = document.getElementById('generalSearchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
        clearBtn.style.display = input.value.length > 0 ? 'block' : 'none';
    }
    debouncedGeneralSearch();
}

function clearSearch() {
    const input = document.getElementById('generalSearchInput');
    input.value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    input.focus();
    document.getElementById('generalSearchResults').innerHTML = `<div style="text-align:center; color:#94a3b8; padding-top: 50px;"><i class="fas fa-search" style="font-size: 3rem; opacity: 0.5;"></i><p>הקלד כדי להתחיל חיפוש</p></div>`;
}

async function executeGeneralSearch() {
    const query = document.getElementById('generalSearchInput').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('generalSearchResults');

    if (query.length < 2) {
        resultsContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; padding-top: 50px;"><i class="fas fa-search" style="font-size: 3rem; opacity: 0.5;"></i><p>הקלד לפחות 2 תווים לחיפוש</p></div>`;
        return;
    }

    resultsContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; padding-top: 50px;"><i class="fas fa-circle-notch fa-spin" style="font-size: 3rem;"></i><p>מחפש...</p></div>`;

    const activeTags = Array.from(document.querySelectorAll('.search-tag.active')).map(t => t.id.replace('search-tag-', ''));
    const searchAll = activeTags.length === 0;

    let results = {};
    let promises = [];

    if (searchAll || activeTags.includes('users')) {
        promises.push(searchUsers(query).then(r => results.users = r));
    }
    if (searchAll || activeTags.includes('my-goals')) {
        promises.push(searchMyGoals(query).then(r => results.my_goals = r));
    }
    if (searchAll || activeTags.includes('my-chavrutas')) {
        promises.push(searchMyChavrutas(query).then(r => results.my_chavrutas = r));
    }
    if (searchAll || activeTags.includes('chats')) {
        promises.push(searchChats(query).then(r => results.chats = r));
    }
    if (searchAll || activeTags.includes('books')) {
        promises.push(searchLibraryBooks(query).then(r => results.books = r));
    }

    await Promise.all(promises);
    renderGeneralSearchResults(results, query);
}

// Individual search functions
async function searchUsers(query) {
    return globalUsersData.filter(u =>
        u.email.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query) ||
        (u.city && u.city.toLowerCase().includes(query))
    );
}

async function searchMyGoals(query) {
    return userGoals.filter(g =>
        g.bookName.toLowerCase().includes(query) ||
        (g.dedication && g.dedication.toLowerCase().includes(query))
    );
}

async function searchMyChavrutas(query) {
    const partnerEmails = chavrutaConnections.map(c => c.email);
    return globalUsersData.filter(u =>
        partnerEmails.includes(u.email) &&
        (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
    );
}

async function searchLibraryBooks(query) {
    const results = [];
    BOOKS_DB.forEach(book => {
        if (book.name.includes(query)) {
            results.push({ name: book.name, units: book.units, category: book.category });
        }
    });
    return results;
}

function getSearchHTML(bookName) {
    return `
        <div class="search-modal-header" style="position: relative; justify-content: center;">
            <div style="text-align:center;">
                <h2 style="font-size:1.25rem; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:0.5rem; margin:0;">
                    מחפשים לך חברותא
                    <span class="material-icons-round text-primary">auto_awesome</span>
                </h2>
                <p style="color:#64748b; margin-top:0.25rem; font-size:0.85rem;">עבור הספר: <strong>${bookName}</strong></p>
            </div>
            <button class="text-slate-400 hover:text-slate-600 transition-colors" style="background:none; border:none; cursor:pointer; position: absolute; left: 0.5rem; top: 0.5rem;" onclick="closeModal()">
                <span class="material-icons-round" style="font-size:1.5rem;">close</span>
            </button>
        </div>
        <div class="search-modal-body">
            <div class="radar-container">
                <div class="radar-ping"></div>
                <div class="radar-pulse"></div>
                <div class="radar-spinner"></div>
                <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                    <div class="bg-primary-10 p-4 rounded-full" style="padding:0.75rem; border-radius:50%;">
                        <span class="material-icons-round text-primary" style="font-size:2.5rem;">group_add</span>
                    </div>
                </div>
            </div>
            <div style="width:100%; margin-top:1.5rem; display:flex; flex-direction:column; gap:0.5rem;" id="searchSteps"></div>
        </div>
    `;
}

function renderGeneralSearchResults(results, query) {
    const container = document.getElementById('generalSearchResults');
    container.innerHTML = '';
    let foundResults = false;

    const highlight = (text, term) => {
        if (!text || !term) return text || '';
        const regex = new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    };

    // Users
    if (results.users && results.users.length > 0) {
        foundResults = true;
        let groupHtml = '<div class="result-group-title">משתמשים</div>';
        results.users.forEach(u => {
            groupHtml += `
                <div class="result-item" onclick="closeModal(); showUserDetails('${u.email}')">
                    <div class="result-item-title">${highlight(u.name, query)}</div>
                    <div class="result-item-context">${highlight(u.email, query)} - ${u.city || ''}</div>
                </div>
            `;
        });
        container.innerHTML += groupHtml;
    }

    // My Goals
    if (results.my_goals && results.my_goals.length > 0) {
        foundResults = true;
        let groupHtml = '<div class="result-group-title">המסכתות שלי</div>';
        results.my_goals.forEach(g => {
            groupHtml += `
                <div class="result-item" onclick="closeSearchDropdown(); switchScreen('dashboard'); setTimeout(() => document.getElementById('goal-card-${g.id}').scrollIntoView({behavior: 'smooth', block: 'center'}), 100);">
                    <div class="result-item-title">${highlight(g.bookName, query)}</div>
                    <div class="result-item-context">${g.status === 'active' ? 'פעיל' : 'בארכיון'} - ${highlight(g.dedication, query)}</div>
                </div>
            `;
        });
        container.innerHTML += groupHtml;
    }

    // My Chavrutas
    if (results.my_chavrutas && results.my_chavrutas.length > 0) {
        foundResults = true;
        let groupHtml = '<div class="result-group-title">החברותות שלי</div>';
        results.my_chavrutas.forEach(u => {
            groupHtml += `
                <div class="result-item" onclick="closeSearchDropdown(); switchScreen('chavrutas'); showUserDetails('${u.email}');">
                    <div class="result-item-title">${highlight(u.name, query)}</div>
                    <div class="result-item-context">${highlight(u.email, query)}</div>
                </div>
            `;
        });
        container.innerHTML += groupHtml;
    }

    // Chat Messages
    if (results.chats && results.chats.length > 0) {
        foundResults = true;
        let groupHtml = '<div class="result-group-title">הודעות בצ\'אט</div>';
        results.chats.forEach(msg => {
            const isMe = msg.sender_email === currentUser.email;
            const partnerEmail = isMe ? msg.receiver_email : msg.sender_email;
            const partner = globalUsersData.find(u => u.email === partnerEmail);
            const partnerName = partner ? partner.name : partnerEmail;
            const safePartnerName = (partnerName || '').replace(/'/g, "\\'");

            // תיקון: הסרת Book: מהשם אם קיים
            const displayName = partnerName.startsWith('book:') ? partnerName.replace('book:', '') : partnerName;

            groupHtml += `
                <div class="result-item" onclick="closeSearchDropdown(); openChat('${partnerEmail}', '${displayName.replace(/'/g, "\\'")}');">
                    <div class="result-item-title">שיחה עם ${displayName}</div>
                    <div class="result-item-context">${isMe ? 'אני' : partnerName}: ${highlight(msg.message, query)}</div>
                </div>
            `;
        });
        container.innerHTML += groupHtml;
    }

    // Library Books
    if (results.books && results.books.length > 0) {
        foundResults = true;
        let groupHtml = '<div class="result-group-title">ספרים בספרייה</div>';
        results.books.forEach(b => {
            groupHtml += `
                <div class="result-item" onclick="closeSearchDropdown(); switchScreen('add'); showAddSection('new'); setTimeout(() => { document.getElementById('categorySelect').value = '${b.category}'; populateAllBooks(); document.getElementById('bookSelect').value = JSON.stringify({name:'${b.name}', units:${b.units}}); }, 500);">
                    <div class="result-item-title">${highlight(b.name, query)}</div>
                    <div class="result-item-context">קטגוריה: ${b.category}</div>
                </div>
            `;
        });
        container.innerHTML += groupHtml;
    }

    if (!foundResults) {
        container.innerHTML = `<div style="text-align:center; color:#94a3b8; padding-top: 50px;"><i class="fas fa-box-open" style="font-size: 3rem; opacity: 0.5;"></i><p>לא נמצאו תוצאות עבור "${query}"</p></div>`;
    }
    if (document.getElementById('notesModal')) document.getElementById('notesModal').style.display = 'none';
}

async function openChavrutaSearch(bookName) {
    // בדיקה אם המשתמש מילא פרטים
    if (!currentUser.phone || !currentUser.city) {
        await customAlert("כדי למצוא חברותא, עליך למלא עיר ומספר טלפון בפרופיל.");
        switchScreen('profile', document.getElementById('nav-profile'));
        return;
    }

    // קריאה לפונקציה החדשה שמציגה את ממשק החיפוש המעודכן
    await findChavruta(bookName);
}

function searchSpecificUser() {
    const query = document.getElementById('userSearchInput').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('userSearchResults');
    resultsDiv.innerHTML = '';

    if (!query) return;

    const matches = globalUsersData.filter(u =>
        (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)) &&
        u.email.toLowerCase() !== currentUser.email.toLowerCase()
    );

    if (matches.length === 0) {
        resultsDiv.innerHTML = '<p style="color:#666; text-align:center;">לא נמצאו משתמשים.</p>';
        return;
    }

    matches.forEach(u => {
        const div = document.createElement('div');
        const badge = getUserBadgeHtml(u);
        div.className = 'chavruta-result';
        div.innerHTML = `
            <div>
                <strong>${badge}${u.name}</strong>
                <div style="font-size:0.8rem;">${u.city || ''}</div>
            </div>
            <button class="btn" style="width:auto; font-size:0.8rem; padding:5px 10px;" onclick="showUserDetails('${u.email}')">הצג פרופיל</button>
        `;
        resultsDiv.appendChild(div);
    });
}

function toggleLeaderboardSort(sortType) {
    currentLeaderboardSort = sortType;
    document.getElementById('sort-learned-btn').className = sortType === 'learned' ? 'lb-tab-btn active' : 'lb-tab-btn';
    document.getElementById('sort-rating-btn').className = sortType === 'rating' ? 'lb-tab-btn active' : 'lb-tab-btn';
    renderLeaderboard();
}

function renderCyclesSection(container) {
    container.className = "bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden border border-gray-100 relative";
    container.innerHTML = `
        <div class="p-3 pb-0">
            <a class="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-[#e8951a] transition-colors font-semibold group cursor-pointer" onclick="showAddSection('menu')">
                <svg class="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                חזרה לתפריט
            </a>
        </div>
        <div class="h-1 bg-[#e8951a] w-full mt-2"></div>
        <div class="p-4 md:p-6">
            <div class="flex items-center gap-2 mb-6">
                <div class="bg-[#e8951a]/10 p-1.5 rounded-lg">
                    <svg class="h-5 w-5 text-[#e8951a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                </div>
                <h2 class="text-lg font-bold text-[#1a2333]">מחזורי לימוד קבועים</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="cursor-pointer bg-slate-50 hover:bg-[#e8951a]/5 border border-slate-200 hover:border-[#e8951a] rounded-xl p-4 text-center transition-all group" onclick="joinCycle('daf-yomi')"><div class="font-bold text-[#1a2333] group-hover:text-[#e8951a] transition-colors">הדף היומי</div><div class="text-xs text-slate-500">תלמוד בבלי</div></div>
                <div class="cursor-pointer bg-slate-50 hover:bg-[#e8951a]/5 border border-slate-200 hover:border-[#e8951a] rounded-xl p-4 text-center transition-all group" onclick="joinCycle('mishnah')"><div class="font-bold text-[#1a2333] group-hover:text-[#e8951a] transition-colors">משנה יומית</div><div class="text-xs text-slate-500">2 משניות ביום</div></div>
                <div class="cursor-pointer bg-slate-50 hover:bg-[#e8951a]/5 border border-slate-200 hover:border-[#e8951a] rounded-xl p-4 text-center transition-all group" onclick="joinCycle('rambam')"><div class="font-bold text-[#1a2333] group-hover:text-[#e8951a] transition-colors">רמב"ם יומי</div><div class="text-xs text-slate-500">פרק אחד ביום</div></div>
                <div class="cursor-pointer bg-slate-50 hover:bg-[#e8951a]/5 border border-slate-200 hover:border-[#e8951a] rounded-xl p-4 text-center transition-all group" onclick="joinCycle('halacha')"><div class="font-bold text-[#1a2333] group-hover:text-[#e8951a] transition-colors">הלכה יומית</div><div class="text-xs text-slate-500">פסקי שולחן ערוך</div></div>
            </div>
        </div>
    `;
}

function renderQuickSection(container) {
    container.className = "bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden border border-gray-100 relative";
    container.innerHTML = `
        <div class="p-3 pb-0">
            <a class="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-[#e8951a] transition-colors font-semibold group cursor-pointer" onclick="showAddSection('menu')">
                <svg class="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                חזרה לתפריט
            </a>
        </div>
        <div class="h-1 bg-[#e8951a] w-full mt-2"></div>
        <div class="p-4 md:p-6">
            <div class="flex items-center gap-2 mb-6">
                <div class="bg-[#e8951a]/10 p-1.5 rounded-lg">
                    <svg class="h-5 w-5 text-[#e8951a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                </div>
                <h2 class="text-lg font-bold text-[#1a2333]">הוספה מהירה</h2>
            </div>
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1">
                        <label class="block text-xs font-bold text-[#1a2333]">סוג לימוד</label>
                        <select id="quickType" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm focus:border-[#e8951a] focus:ring-0 text-[#1a2333]">
                            <option value="דפי גמרא">דפי גמרא</option>
                            <option value="משניות">משניות</option>
                            <option value="פרקי תנ&quot;ך">פרקי תנ"ך</option>
                            <option value="שעות לימוד">שעות לימוד</option>
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label class="block text-xs font-bold text-[#1a2333]">כמות</label>
                        <input type="number" id="quickAmount" placeholder="כמות" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm focus:border-[#e8951a] focus:ring-0 text-[#1a2333]">
                    </div>
                </div>
                <div class="space-y-1">
                    <label class="block text-xs font-bold text-[#1a2333]">קצב לימוד</label>
                    <select id="quickPace" onchange="toggleQuickDate()" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm focus:border-[#e8951a] focus:ring-0 text-[#1a2333]">
                        <option value="none">קצב אישי (ללא יעד)</option>
                        <option value="date">עד תאריך מסוים</option>
                    </select>
                </div>
                <div id="quickDateDiv" style="display:none;" class="space-y-1">
                    <label class="block text-xs font-bold text-[#1a2333]">תאריך סיום</label>
                    <input type="date" id="quickDateInput" class="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm focus:border-[#e8951a] focus:ring-0 text-[#1a2333]">
                </div>
                <div class="space-y-1">
                    <label class="block text-xs font-bold text-[#1a2333]">הקדשה (אופציונלי)</label>
                    <input type="text" id="quickDedication" placeholder="לרפואת / לעילוי נשמת..." class="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm focus:border-[#e8951a] focus:ring-0 text-[#1a2333]">
                </div>
                <div class="pt-2">
                    <button class="w-full bg-[#1a2333] text-white font-bold py-2.5 rounded-xl text-base shadow-md hover:bg-slate-800 transform active:scale-[0.98] transition-all" onclick="addQuickLog()">
                        <i class="fas fa-plus-circle"></i> צור לימוד
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showAddSection(sectionId) {
    document.getElementById('add-menu-view').style.display = 'none';
    document.getElementById('add-section-cycles').style.display = 'none';
    document.getElementById('add-section-quick').style.display = 'none';
    document.getElementById('add-section-new').style.display = 'none';

    if (sectionId === 'menu' || !sectionId) {
        document.getElementById('add-menu-view').style.display = 'grid';
    } else {
        const target = document.getElementById('add-section-' + sectionId);
        if (target) {
            target.style.display = 'block';
            if (sectionId === 'cycles') renderCyclesSection(target);
            if (sectionId === 'quick') renderQuickSection(target);
        }
        if (sectionId === 'new') populateAllBooks(); // טעינת רשימת ספרים
    }
}

function showToast(text, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';

    toast.innerHTML = `<i class="fas fa-${icon} toast-icon"></i> <span>${text}</span>`;

    container.prepend(toast);

    // חישוב זמן תצוגה לפי אורך הטקסט (מינימום 3 שניות)
    const duration = Math.max(3000, text.length * 60);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, duration);
}
