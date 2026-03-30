let userGoals = [];
let nextActionAfterGoalCreation = null;

function incDailyProgress(goalId, amount) {
    const current = getDailyProgress(goalId);
    const today = new Date().toLocaleDateString('en-GB');
    localStorage.setItem('daily_track_' + goalId, JSON.stringify({ date: today, count: current + amount }));
}

function renderGoals() {
    const list = document.getElementById('goalsList');
    const tasksList = document.getElementById('dailyTasksList');
    const archiveList = document.getElementById('archiveList');

    if (!list) return;

    list.innerHTML = '';
    if (tasksList) tasksList.innerHTML = '';
    if (archiveList) archiveList.innerHTML = '';

    let hasTasks = false;
    let totalLearned = 0;


    const activeGoals = userGoals.filter(g => g.status === 'active');
    if (activeGoals.length === 0) {
    }

    userGoals.forEach(goal => {

        const percent = Math.min(100, Math.round((goal.currentUnit / goal.totalUnits) * 100));
        totalLearned += goal.currentUnit;


        const connection = chavrutaConnections.find(c => c.book === goal.bookName && c.email);
        const partner = connection ? globalUsersData.find(u => u.email === connection.email) : null;
        const partnerName = partner ? partner.name : (connection ? connection.email : '');

        if (goal.status === 'active') {

            const div = document.createElement('div');
            div.id = `goal-card-${goal.id}`;
            div.className = 'glass rounded-super p-6 transition-all hover:shadow-2xl hover:translate-y-[-2px] border border-white/50 dark:border-slate-700/40 mb-4';

            if (window.newGoalId === goal.id.toString()) {

                if (window.isNewGoalAnimation) {

                    window.isNewGoalAnimation = false;
                }
            }


            if (window.justCompletedDailyGoal === goal.id) {

            }

            div.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div class="flex-1">
                    <div class="flex items-center gap-4 mb-2">
                        <div class="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl">
                            <i class="fas fa-book"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold flex items-center gap-2">
                                ${goal.bookName}
                                ${connection ? `<i class="fas fa-user-friends" style="color: var(--success); font-size: 1rem;" title="בחברותא עם ${partnerName}"></i>` : ''}
                            </h3>
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
                <div class="flex items-center justify-between md:justify-end gap-3">
                    <div class="flex items-center gap-2">
                        <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="deleteGoal('${goal.id}')" title="מחק">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="openNotes('${goal.id}')" title="הערות">
                            <i class="fas fa-sticky-note"></i>
                        </button>
                        <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="openBookChat('${goal.bookName}')" title="צ'אט">
                            <i class="fas fa-comment"></i>
                        </button>
                        ${connection
                    ? `<button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-green-500 dark:text-green-400" onclick="showUserDetails('${connection.email}')" title="לומד בחברותא עם ${partnerName}">
                                   <i class="fas fa-user-friends"></i>
                               </button>`
                    : `<button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="openChavrutaSearch('${goal.bookName}')" title="מצא חברותא">
                                   <i class="fas fa-user-plus"></i>
                               </button>`}
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
            list.appendChild(div);


            if (goal.targetDate && tasksList) {
                const diffTime = new Date(goal.targetDate) - new Date();
                const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                const unitsLeft = goal.totalUnits - goal.currentUnit;
                if (unitsLeft > 0 && diffDays > 0) {
                    hasTasks = true;
                    const dailyTarget = (unitsLeft / diffDays).toFixed(1);


                    const doneToday = getDailyProgress(goal.id);
                    const dailyPercent = Math.min(100, (doneToday / Math.ceil(dailyTarget)) * 100);
                    const isDailyDone = doneToday >= Math.ceil(dailyTarget);

                    const taskDiv = document.createElement('div');
                    taskDiv.id = `daily-task-${goal.id}`;
                    taskDiv.className = 'task-row';

                    if (window.justCompletedDailyGoal === goal.id) {
                        taskDiv.classList.add('daily-goal-reached');
                    }

                    let statusHtml = `<span class="task-highlight">יעד יומי: ${dailyTarget}</span>`;
                    if (isDailyDone) {
                        statusHtml = `<span style="color:#16a34a; font-weight:bold; font-size:0.9rem;"><i class="fas fa-check"></i> הושלם</span>`;
                    }

                    taskDiv.innerHTML = `<div><strong>${goal.bookName}</strong></div><div style="text-align:left;">${statusHtml}
                    <div class="daily-progress-bg"><div class="daily-progress-fill" style="width:${dailyPercent}%; background:${isDailyDone ? '#16a34a' : 'var(--accent)'}"></div></div></div>`;
                    tasksList.appendChild(taskDiv);
                }
            }
        } else {

            if (archiveList) {
                const archiveDiv = document.createElement('div');
                archiveDiv.className = 'goal-item';
                archiveDiv.style.borderTopColor = 'var(--success)';
                archiveDiv.innerHTML = `
                <div class="goal-header">
                    <span class="goal-title">${goal.bookName}</span>
                    <span style="color:var(--success); font-weight:bold;">הושלם! <i class="fas fa-check"></i></span>
                </div>
                <div class="progress-container"><div class="progress-bar" style="width: 100%; background: var(--success);"></div></div>`;
                archiveList.appendChild(archiveDiv);
            }
        }
    });


    updateRankProgressBar(totalLearned);
    document.getElementById('dailyTasksContainer').style.display = hasTasks ? 'block' : 'none';

    const activeBooksCount = userGoals.filter(g => g.status === 'active').length;
    const completedBooksCount = userGoals.filter(g => g.status === 'completed').length;

    const booksEl = document.getElementById('stat-books');
    const pagesEl = document.getElementById('stat-pages');
    const completedEl = document.getElementById('stat-completed');
    const myRewardPoints = currentUser ? (currentUser.reward_points || 0) : 0;
    const totalScore = totalLearned + myRewardPoints;

    if (booksEl && pagesEl && completedEl && typeof animateValue === 'function') {
        const oldBooks = parseInt(booksEl.innerText.replace(/,/g, '')) || 0;
        const oldPages = parseInt(pagesEl.innerText.replace(/,/g, '')) || 0;
        const oldCompleted = parseInt(completedEl.innerText.replace(/,/g, '')) || 0;

        animateValue(booksEl, oldBooks, activeBooksCount, 1000);
        animateValue(pagesEl, oldPages, totalScore, 1000);
        animateValue(completedEl, oldCompleted, completedBooksCount, 1000);
    } else {
        if (booksEl) booksEl.innerText = activeBooksCount;
        if (pagesEl) pagesEl.innerText = totalScore;
        if (completedEl) completedEl.innerText = completedBooksCount;
    }



    const stats = { books: activeBooksCount, pages: totalScore, completed: completedBooksCount };
    localStorage.setItem('torahApp_stats', JSON.stringify(stats));


    window.justCompletedDailyGoal = null;
    window.newGoalId = null;
}

async function createGoal(name, total, targetDate, dedication, startPage = 2) {
    if (!requireAuth()) return;

    const newGoal = {
        id: crypto.randomUUID(),
        bookName: name,
        totalUnits: total,
        currentUnit: 0,
        targetDate: targetDate || '',
        status: 'active',
        dedication: dedication || '',
        startPage: startPage
    };


    userGoals.unshift(newGoal);
    saveGoals();

    window.newGoalId = newGoal.id;
    window.isNewGoalAnimation = true;

    renderGoals();

    if (nextActionAfterGoalCreation === 'findChavruta') {
        nextActionAfterGoalCreation = null;
        setTimeout(() => {
            openChavrutaSearch(newGoal.bookName);
        }, 300);
    } else {
        switchScreen('dashboard', document.querySelectorAll('.nav-item')[0]);
    }


    try {
        if (typeof supabaseClient !== 'undefined' && currentUser) {
            const { data: { user: authUser } } = await supabaseClient.auth.getUser();
            if (!authUser) throw new Error("משתמש לא מחובר");

            const { data, error } = await supabaseClient.from('user_goals').insert([{
                user_id: authUser.id,
                user_email: authUser.email,
                book_name: name,
                total_units: total,
                current_unit: 0,
                status: 'active',
                target_date: targetDate || null,
                dedication: dedication || null
            }]).select();

            if (error) throw error;
            if (data && data[0]) {
                const realId = data[0].id.toString();
                const idx = userGoals.findIndex(g => g.id === newGoal.id);
                if (idx !== -1) {
                    userGoals[idx].id = realId;
                    saveGoals();
                    if (window.newGoalId === newGoal.id) window.newGoalId = realId;
                    renderGoals();
                }
            }
        }
    } catch (e) {
        console.error("שגיאה בסנכרון ענן, אך נשמר מקומית:", e);
    }
} async function joinCycle(cycleType) {
    const cycles = { 'daf-yomi': ["דף היומי", 2711], 'mishnah': ["משנה יומית", 4192], 'rambam': ["רמב\"ם יומי", 1000], 'halacha': ["הלכה יומית", 1000] };
    const [name, units] = cycles[cycleType];
    if (!requireAuth()) return;

    if (userGoals.some(g => g.bookName === name && g.status === 'active')) {
        await customAlert("אתה כבר רשום למסלול לימוד זה.");
        return;
    }
    await createGoal(name, units, null, "מחזור לימוד קבוע", "");
    showToast("הצטרפת בהצלחה!", "success");
}





async function addNewGoal() {
    if (!requireAuth()) return;

    const bookSelectEl = document.getElementById('bookSelect');
    const customNameEl = document.getElementById('customNameInput');
    const customAmountEl = document.getElementById('customAmountInput');


    const dateEl = document.getElementById('targetDateInput');
    const dedicationEl = document.getElementById('dedicationInput');
    const quickTypeEl = document.getElementById('quickType');
    const quickAmountEl = document.getElementById('quickAmount');
    const newBookSearchEl = document.getElementById('newBookSearch');

    let bookName = "";
    let totalUnits = 0;
    let targetDate = "";
    let startPage = 2;


    if (quickAmountEl && quickAmountEl.value) {
        bookName = quickTypeEl.value;
        totalUnits = parseInt(quickAmountEl.value);
        if (document.getElementById('quickDedication').value) {

        }
    } else {

        if (newBookSearchEl && newBookSearchEl.value) {

            bookName = newBookSearchEl.value.trim();

            const scope = document.getElementById('bookScopeSelect').value;
            if (scope === 'chapter') {
                const chapterSelect = document.getElementById('chapterSelect');
                const selectedChapterName = chapterSelect.options[chapterSelect.selectedIndex].text;


                const detailedBook = (typeof ALL_PRAKIM_DATA !== 'undefined') ? ALL_PRAKIM_DATA.find(b => b.name === bookName) : null;
                if (detailedBook) {
                    const chapterData = detailedBook.chapters.find(c => c.name === selectedChapterName || `פרק ${c.name}` === selectedChapterName);
                    if (chapterData) {
                        bookName = `${bookName} - ${selectedChapterName}`;
                        startPage = chapterData.start_page;

                        totalUnits = chapterData.pages * 2;
                    }
                } else {

                    bookName = `${bookName} - ${selectedChapterName}`;
                }
            }

            totalUnits = parseInt(customAmountEl.value);
            if (!totalUnits) {

                const calcVal = document.getElementById('calculatedUnits')?.value;
                if (calcVal) totalUnits = parseInt(calcVal);
            }
            if (!totalUnits) totalUnits = 50;
        } else if (bookSelectEl && bookSelectEl.value && (!newBookSearchEl || bookSelectEl.style.display !== 'none')) {

            try {
                const bookData = JSON.parse(bookSelectEl.value);
                bookName = bookData.name;
                totalUnits = bookData.units;
            } catch (e) {
                console.error("Error parsing book data", e);
                bookName = bookSelectEl.value;

                totalUnits = 50;
            }
        } else if (customNameEl && customNameEl.value) {
            bookName = customNameEl.value;
            totalUnits = parseInt(customAmountEl.value) || 50;
        }

        if (document.getElementById('paceType').value === 'date') {
            targetDate = dateEl.value;
        }
    }

    if (userGoals.some(g => g.bookName === bookName && g.status === 'active')) {
        await customAlert("אתה כבר רשום למסלול לימוד זה.");
        return;
    }


    if (!bookName || !totalUnits || totalUnits <= 0) {
        await customAlert("נא לוודא שנבחר ספר/הוזן שם וכמות יחידות תקינה");
        return;
    }


    const newGoal = {
        id: crypto.randomUUID(),
        bookName: bookName,
        totalUnits: totalUnits,
        currentUnit: 0,
        status: 'active',
        startDate: new Date().toISOString(),
        targetDate: targetDate,
        dedication: dedicationEl ? dedicationEl.value : "",
        startPage: startPage
    };


    userGoals.unshift(newGoal);
    localStorage.setItem('torahApp_goals', JSON.stringify(userGoals));
    saveGoals();


    window.newGoalId = newGoal.id;
    window.isNewGoalAnimation = true;

    renderGoals();


    if (customNameEl) customNameEl.value = '';
    if (customAmountEl) customAmountEl.value = '';

    if (quickAmountEl) quickAmountEl.value = '';
    showToast("הלימוד נוסף בהצלחה!", "success");


    switchScreen('dashboard', document.querySelectorAll('.nav-item')[0]);


    try {
        if (typeof supabaseClient !== 'undefined' && currentUser && currentUser.email) {
            const { data: { user: authUser } } = await supabaseClient.auth.getUser();
            if (!authUser) throw new Error("משתמש לא מחובר");

            const { data, error } = await supabaseClient.from('user_goals').insert([{
                user_id: authUser.id,
                user_email: authUser.email,
                book_name: bookName,
                total_units: totalUnits,
                current_unit: 0,
                status: 'active',
                target_date: targetDate || null,
                dedication: newGoal.dedication
            }]).select();

            if (error) throw error;
            if (data && data[0]) {
                const realId = data[0].id.toString();
                const idx = userGoals.findIndex(g => g.id === newGoal.id);
                if (idx !== -1) {
                    userGoals[idx].id = realId;
                    saveGoals();
                    if (window.newGoalId === newGoal.id) window.newGoalId = realId;
                    renderGoals();
                }
            }
        }
    } catch (e) {
        console.log("נשמר מקומית בלבד");
        console.error("שגיאת שמירה בענן:", e);
    }
}

async function loadGoals() {

    const localGoals = localStorage.getItem('torahApp_goals');
    if (localGoals) {
        userGoals = JSON.parse(localGoals);
        userGoals.forEach(g => {
            if (!g.startPage) g.startPage = 2;
        });
        renderGoals();
    }

    try {

        const { data: cloudGoals, error } = await supabaseClient
            .from('user_goals')
            .select('*')
            .eq('user_id', currentUser.id);



        if (cloudGoals && !error) {
            await syncGlobalData();
        }
    } catch (e) {
        console.error("שגיאה בטעינת לימודים:", e);
    }
}

function saveGoals() {

    localStorage.setItem('torahApp_goals', JSON.stringify(userGoals));
}

async function deleteGoal(goalId) {
    if (!requireAuth()) return;
    if (!(await customConfirm("האם אתה בטוח שברצונך למחוק את הלימוד הזה?"))) return;


    const goalToDelete = userGoals.find(g => g.id == goalId);


    userGoals = userGoals.filter(g => g.id != goalId);


    saveGoals();
    renderGoals();


    try {
        if (typeof supabaseClient !== 'undefined' && currentUser && goalToDelete) {
            await supabaseClient
                .from('user_goals')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('book_name', goalToDelete.bookName);


            await supabaseClient.from('chavruta_requests')
                .delete()
                .or(`sender_email.eq.${currentUser.email},receiver_email.eq.${currentUser.email}`)
                .eq('book_name', goalToDelete.bookName)
                .eq('status', 'approved');
        }
    } catch (e) {
        console.error("נמחק מקומית, שגיאה במחיקה מהענן:", e);
    }
}

function handleScopeChange() {
    const scope = document.getElementById('bookScopeSelect').value;
    const chapterDiv = document.getElementById('chapterSelectDiv');
    const chapterSelect = document.getElementById('chapterSelect');

    const bookName = document.getElementById('newBookSearch').value.trim();

    if (scope === 'chapter') {
        chapterDiv.style.display = 'block';
        chapterSelect.innerHTML = '';
        const detailedBook = (typeof ALL_PRAKIM_DATA !== 'undefined') ? ALL_PRAKIM_DATA.find(b => b.name === bookName) : null;

        if (detailedBook && detailedBook.chapters) {
            detailedBook.chapters.forEach(chap => {
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ pages: chap.pages, start_page: chap.start_page });
                opt.innerText = chap.name;
                chapterSelect.appendChild(opt);
            });
        } else {
            let maxChapters = 50;
            if (typeof BOOKS_DB !== 'undefined') {
                const bookEntry = BOOKS_DB.find(b => b.name === bookName);
                if (bookEntry && ['תנ"ך', 'משנה', 'מוסר ומחשבה', 'הלכה'].includes(bookEntry.category)) {
                    maxChapters = bookEntry.units;
                }
            }

            for (let i = 1; i <= maxChapters; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.innerText = (typeof toGematria === 'function') ? `פרק ${toGematria(i)}` : `פרק ${i}`;
                chapterSelect.appendChild(opt);
            }
        }
        updateCalculatedUnits();

        chapterSelect.onchange = function () {
            try {
                const val = JSON.parse(this.value);
                document.getElementById('calculatedUnits').value = val.pages * 2;
                document.getElementById('customAmountInput').value = val.pages * 2;
            } catch (e) { }
        };
    } else {
        chapterDiv.style.display = 'none';
        const searchVal = document.getElementById('newBookSearch')?.value;
        if (searchVal) {
            let units = 50;
            const found = BOOKS_DB.find(b => b.name === searchVal);
            if (found) units = found.units;
            document.getElementById('calculatedUnits').value = units;
            if (document.getElementById('customAmountInput')) document.getElementById('customAmountInput').value = units;
        }
    }
}

async function selectBookFromSearch(bookName) {
    document.getElementById('newBookSearch').value = bookName;
    document.getElementById('bookSearchResults').style.display = 'none';
    const detailsArea = document.getElementById('bookDetailsArea');
    if (detailsArea) detailsArea.style.display = 'block';

    try {
        const res = await fetch(`https://www.sefaria.org.il/api/v2/raw/index/${bookName}`);
        const data = await res.json();
        selectedBookStructure = data;

        document.getElementById('bookScopeSelect').value = 'full';
        const scopeSelect = document.getElementById('bookScopeSelect');
        if (scopeSelect) scopeSelect.disabled = false;

        handleScopeChange();

        let estimatedUnits = 50;
        if (data.schema && data.schema.sectionNames) {
            const found = BOOKS_DB.find(b => b.name === bookName);
            if (found) estimatedUnits = found.units;
        }
        document.getElementById('calculatedUnits').value = estimatedUnits;
        if (document.getElementById('customAmountInput')) document.getElementById('customAmountInput').value = estimatedUnits;

    } catch (e) {
        console.error("Error fetching book structure", e);
        document.getElementById('calculatedUnits').value = 100;
    }
}

async function handleBookSearch(query) {
    const list = document.getElementById('bookSearchResults');
    if (!list) return;
    if (query.length < 2) {
        list.style.display = 'none';
        return;
    }

    clearTimeout(bookSearchDebounce);
    bookSearchDebounce = setTimeout(() => {
        const matches = BOOKS_DB.filter(b => b.name.includes(query));
        list.innerHTML = '';
        if (matches.length > 0) {
            list.style.display = 'block';
            matches.forEach(book => {
                const li = document.createElement('li');
                li.style.cssText = 'padding: 10px; border-bottom: 1px solid var(--border-color); cursor: pointer; color: var(--text-main);';
                li.innerText = book.name;
                li.onclick = () => selectBookFromSearch(book.name);
                list.appendChild(li);
            });
        } else {
            list.style.display = 'none';
        }
    }, 300);
}

async function addQuickLog() {
    if (!requireAuth()) return;
    const bookName = document.getElementById('quickType').value;
    const amount = parseInt(document.getElementById('quickAmount').value);
    const dedication = document.getElementById('quickDedication').value;

    const paceType = document.getElementById('quickPace').value;
    const dateInput = document.getElementById('quickDateInput').value;
    let targetDate = "";

    if (paceType === 'date' && dateInput) {
        targetDate = dateInput;
    }

    if (!bookName || !amount || amount <= 0) {
        await customAlert("נא להזין שם ספר וכמות דפים תקינה");
        return;
    }

    createGoal(bookName, amount, targetDate, dedication);

    document.getElementById('quickAmount').value = '';
    document.getElementById('quickDedication').value = '';
    document.getElementById('quickDateInput').value = '';
    document.getElementById('quickHebrewDate').innerText = '';
}

window.updateGoalNotes = async function (goalId, newNotes) {
    if (!requireAuth()) return;
    const goal = userGoals.find(g => g.id == goalId);
    if (goal) {
        goal.notes = newNotes;
        saveGoals();

        try {
            await supabaseClient.from('user_goals').update({ notes: newNotes }).eq('id', goalId);
        } catch (e) { console.error("Error saving notes to cloud", e); }
    }
};

async function updateRankProgressBar(score) {
    return;
    let currentRank = getRankName(score);

    if (notificationsEnabled && currentUser && previousRank && currentRank !== previousRank) {
        const rankOrder = { "צורב צעיר": 0, "מתמיד": 1, "צורבא מרבנן": 2, "תלמיד חכם": 3 };
        if (rankOrder[currentRank] > rankOrder[previousRank]) {
            confetti({ particleCount: 400, spread: 120, origin: { y: 0.6 } });
            const msg = `👑 ברכות! עלית לדרגת ${currentRank}!`;
            addNotification(msg);
            showToast(msg, "success");
            await supabaseClient.rpc('increment_field', { table_name: 'users', field_name: 'reward_points', increment_value: 100, user_email: currentUser.email });
        }
    }
    previousRank = currentRank;

    let nextRank = "", nextThreshold = 0, prevThreshold = 0;
    if (score < 101) { nextRank = "מתמיד"; nextThreshold = 101; prevThreshold = 0; }
    else if (score < 501) { nextRank = "צורבא מרבנן"; nextThreshold = 501; prevThreshold = 101; }
    else if (score < 1001) { nextRank = "תלמיד חכם"; nextThreshold = 1001; prevThreshold = 501; }
    else { nextRank = "מאור הדור"; nextThreshold = score; prevThreshold = 0; }

    const rInfo = document.getElementById('rank-info');
    const rBar = document.getElementById('rank-progress-bar');
    const rFooter = document.getElementById('rank-footer');
    if (!rInfo || !rBar) return;

    if (score >= 1001) {
        rInfo.innerText = `דרגת שיא: ${currentRank}`;
        rBar.style.width = "100%";
        rFooter.innerText = "אשריכם! הגעתם לדרגה הגבוהה ביותר.";
    } else {
        const progress = ((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100;
        rInfo.innerText = `דרגה נוכחית: ${currentRank}`;
        rBar.style.width = `${progress}%`;
        rFooter.innerText = `עוד ${nextThreshold - score} דפים לדרגת ${nextRank}`;
    }
}
