let userGoals = [];
let nextActionAfterGoalCreation = null;
let _goalsRenderHash = '';
let _goalsFirstRender = true;

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

    const newHash = JSON.stringify(userGoals.map(g => `${g.id}|${g.status}|${g.currentUnit}|${g.bookName}|${g.totalUnits}`));
    if (newHash === _goalsRenderHash) return;
    _goalsRenderHash = newHash;
    const isFirstRender = _goalsFirstRender;
    _goalsFirstRender = false;

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
            div.className = `glass rounded-super p-6 transition-all hover:shadow-2xl hover:translate-y-[-2px] border border-white/50 dark:border-slate-700/40 mb-4${isFirstRender ? ' goal-card-in' : ''}`;

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
                            ${goal.dedication ? `<p class="text-xs text-amber-600 dark:text-amber-400 italic mt-1"><i class="fas fa-feather-alt" style="margin-left:3px;"></i>${goal.dedication}</p>` : ''}
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
                <div class="flex flex-col sm:flex-row sm:items-center justify-between md:justify-end gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="deleteGoal('${goal.id}')" title="מחק">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="openNotes('${goal.id}')" title="הערות">
                            <i class="fas fa-sticky-note"></i>
                        </button>
                        <button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400" onclick="openBookChat('${goal.bookName}')" title="צ'אט">
                            <i class="fas fa-comment"></i>
                        </button>
                        <button class="w-10 h-10 rounded-full glass hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all flex items-center justify-center text-amber-500 dark:text-amber-400" onclick="openScheduleModal('${(connection?.email||'').replace(/'/g,"\\'")}','${goal.bookName.replace(/'/g,"\\'")}','${(partnerName||'').replace(/'/g,"\\'")}');" title="קביעת זמנים">
                            <i class="fas fa-clock"></i>
                        </button>
                        <button class="w-10 h-10 rounded-full glass hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center text-blue-500 dark:text-blue-400" onclick="openBookInSefaria('${goal.bookName.replace(/'/g,"\\'")}', ${goal.currentUnit})" title="פתח ספר">
                            <i class="fas fa-book-open"></i>
                        </button>
                        ${connection
                    ? `<button class="w-10 h-10 rounded-full glass hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center text-green-500 dark:text-green-400" onclick="showChavrutaOptions('${(connection.email||'').replace(/'/g,"\\'")}','${(partnerName||'').replace(/'/g,"\\'")}','${(connection.partnerId||'').replace(/'/g,"\\'")}', event)" title="לומד בחברותא עם ${partnerName}">
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

                    let statusHtml;
                    if (isDailyDone) {
                        statusHtml = `<span style="color:#16a34a; font-weight:bold; font-size:0.9rem;"><i class="fas fa-check-circle"></i> השלמת את הלימוד היומי</span>`;
                    } else {
                        statusHtml = `<span class="task-highlight">יעד יומי: ${dailyTarget}</span>
                        <button onclick="markDailyGoalDone('${goal.id}')" style="background:#22c55e; color:#fff; border:none; border-radius:0.5rem; padding:3px 10px; font-size:0.8rem; font-weight:600; cursor:pointer; margin-right:6px; white-space:nowrap;"><i class="fas fa-check"></i> למדתי היום</button>`;
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

    const ratingEl = document.getElementById('stat-rating');
    if (ratingEl && currentUser) {
        const myGlobalData = (typeof globalUsersData !== 'undefined' ? globalUsersData : []).find(u => u.email === currentUser.email);
        const myRating = myGlobalData?.chat_rating ?? currentUser.chat_rating ?? parseFloat(localStorage.getItem('torahApp_rating') || '0');
        if (myRating !== undefined && myRating !== null) {
            ratingEl.innerText = myRating;
            localStorage.setItem('torahApp_rating', myRating);
        }
    }

window.justCompletedDailyGoal = null;
    window.newGoalId = null;
}

async function createGoal(name, total, targetDate, dedication, startPage = 2) {
    if (!requireAuth()) return;

    
    let initialUnit = 0;
    const bavliBook = typeof BOOKS_DB !== 'undefined' && BOOKS_DB.find(b => b.name === name && b.category === 'תלמוד בבלי');
    if (bavliBook) {
        const trackerDafim = parseInt(localStorage.getItem(`dafYomiTracker_${name}`) || '0');
        if (trackerDafim > 0) initialUnit = Math.min(trackerDafim * 2, total);
    }

    const newGoal = {
        id: crypto.randomUUID(),
        bookName: name,
        totalUnits: total,
        currentUnit: initialUnit,
        targetDate: targetDate || '',
        status: 'active',
        dedication: dedication || '',
        startPage: startPage
    };

userGoals.unshift(newGoal);
    saveGoals();

    window.newGoalId = newGoal.id;
    window.isNewGoalAnimation = true;

    if (typeof closeAddDialog === 'function') closeAddDialog();
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
                book_name: name,
                total_pages: total,
                current_page: initialUnit || 0,
                status: 'active',
                target_date: targetDate || null
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
            if (!totalUnits) {
                const bookEntry = (typeof BOOKS_DB !== 'undefined') ? BOOKS_DB.find(b => b.name === bookName) : null;
                totalUnits = bookEntry ? bookEntry.units : 0;
            }
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

    
    let initialUnit = 0;
    const bavliMatch = typeof BOOKS_DB !== 'undefined' && BOOKS_DB.find(b => b.name === bookName && b.category === 'תלמוד בבלי');
    if (bavliMatch) {
        const trackerDafim = parseInt(localStorage.getItem(`dafYomiTracker_${bookName}`) || '0');
        if (trackerDafim > 0) initialUnit = Math.min(trackerDafim * 2, totalUnits);
    }

    const studyMode = document.getElementById('studyModeInput')?.value || null;

    const newGoal = {
        id: crypto.randomUUID(),
        bookName: bookName,
        totalUnits: totalUnits,
        currentUnit: initialUnit,
        status: 'active',
        startDate: new Date().toISOString(),
        targetDate: targetDate,
        dedication: dedicationEl ? dedicationEl.value : "",
        startPage: startPage,
        studyMode: studyMode
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

    if (typeof closeAddDialog === 'function') closeAddDialog();
    showToast("הלימוד נוסף בהצלחה!", "success");
    switchScreen('dashboard', document.querySelectorAll('.nav-item')[0]);

    // שאלה על תיאור חברותא – רק אם לא הוסיף ביקשה כבר
    setTimeout(() => showChavrutaDescriptionPrompt(newGoal.id), 600);

try {
        if (typeof supabaseClient !== 'undefined' && currentUser && currentUser.email) {
            const { data: { user: authUser } } = await supabaseClient.auth.getUser();
            if (!authUser) throw new Error("משתמש לא מחובר");

            const insertPayload = {
                user_id: authUser.id,
                book_name: bookName,
                total_pages: totalUnits,
                current_page: initialUnit || 0,
                status: 'active',
                target_date: targetDate || null
            };
            if (studyMode) insertPayload.study_mode = studyMode;
            const { data, error } = await supabaseClient.from('user_goals').insert([insertPayload]).select();

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

function showGoalsSkeleton() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    _goalsRenderHash = '';
    _goalsFirstRender = true;
    const sk = (w, h, r = '6px', extra = '') =>
        `<div class="skeleton" style="width:${w};height:${h};border-radius:${r};flex-shrink:0;${extra}"></div>`;
    const card = `
    <div class="glass rounded-super p-6 border border-white/50 dark:border-slate-700/40 mb-4">
        <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;align-items:center;gap:12px;">
                ${sk('48px','48px','12px')}
                <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
                    ${sk('55%','18px')}
                    ${sk('75%','12px')}
                </div>
            </div>
            ${sk('100%','7px','99px','margin-top:4px;')}
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:2px;">
                ${sk('40px','40px','50%')}
                ${sk('40px','40px','50%')}
                ${sk('40px','40px','50%')}
                ${sk('40px','40px','50%')}
                ${sk('90px','44px','14px')}
            </div>
        </div>
    </div>`;
    list.innerHTML = card.repeat(3);
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
        if (!currentUser || !currentUser.email) return;

        const userIdForQuery = (currentUser.id && !currentUser.id.includes('@')) ? currentUser.id : null;
        let query = supabaseClient.from('user_goals').select('*');

        if (userIdForQuery) {
            query = query.eq('user_id', userIdForQuery);
        } else {
            return;
        }

        const { data: cloudGoals, error } = await query;

if (cloudGoals && !error) {
            const localIds = new Set(userGoals.map(g => String(g.id)));
            cloudGoals.forEach(cg => {
                const local = userGoals.find(g => String(g.id) === String(cg.id) || g.bookName === cg.book_name);
                if (local) {
                    if (cg.status === 'completed') {
                        local.status = 'completed';
                        if (cg.completed_at) local.completedDate = cg.completed_at;
                    }
                    if (cg.current_page !== undefined) local.currentUnit = cg.current_page;
                    if (cg.total_pages !== undefined) local.totalUnits = cg.total_pages;
                    local.id = String(cg.id);
                } else if (!localIds.has(String(cg.id))) {
                    userGoals.push({
                        id: String(cg.id),
                        bookName: cg.book_name,
                        currentUnit: cg.current_page || 0,
                        totalUnits: cg.total_pages || 0,
                        status: cg.status || 'active',
                        targetDate: cg.target_date || '',
                        dedication: cg.dedication || '',
                        completedDate: cg.completed_at || null,
                        startPage: cg.start_page || 2
                    });
                }
            });
            saveGoals();
            renderGoals();
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
    if (!requireAuth() || !goalId || goalId === 'undefined') return;
    if (!(await customConfirm("האם אתה בטוח שברצונך למחוק את הלימוד הזה?"))) return;

const goalToDelete = userGoals.find(g => g.id == goalId);

userGoals = userGoals.filter(g => g.id != goalId);

saveGoals();
    renderGoals();

try {
        if (typeof supabaseClient !== 'undefined' && currentUser && goalToDelete) {
            if (goalToDelete.id && !goalToDelete.id.toString().includes('-')) {
                await supabaseClient.from('user_goals').delete().eq('id', goalToDelete.id);
            }

            const userIdForQuery = (currentUser.id && !currentUser.id.toString().includes('@')) ? currentUser.id : null;

            if (!userIdForQuery) return;
            let query = supabaseClient.from('user_goals').delete()
                .eq('book_name', goalToDelete.bookName)
                .eq('user_id', userIdForQuery);

            const { error: delError } = await query;
            if (delError) {
                console.error("שגיאת מחיקה מהענן:", delError);
                showToast("המחיקה בענן נכשלה. ייתכן שהמסכת תחזור ברענון.", "error");
            }

            await supabaseClient.from('chavruta_connections')
                .update({ status: 'cancelled' })
                .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
                .eq('book_name', goalToDelete.bookName)
                .in('status', ['accepted', 'approved', 'pending']);

if (typeof chavrutaConnections !== 'undefined') {
                const cancelled = chavrutaConnections.filter(c => c.book === goalToDelete.bookName);
                chavrutaConnections = chavrutaConnections.filter(c => c.book !== goalToDelete.bookName);

                cancelled.forEach(c => {
                    
                    const stillActive = chavrutaConnections.some(
                        x => x.partnerId === c.partnerId || x.email === c.email
                    );
                    if (!stillActive) {
                        if (c.email) approvedPartners.delete(c.email);
                        if (c.partnerId) approvedPartners.delete(c.partnerId);
                    }
                });

                localStorage.setItem('torahApp_chavrutas', JSON.stringify(chavrutaConnections));
                if (typeof renderChavrutas === 'function') renderChavrutas();
                if (typeof renderChatList === 'function') renderChatList('personal', null, true);
            }
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

function showChavrutaOptions(email, name, partnerId, event) {
    if (event) event.stopPropagation();
    const existing = document.getElementById('chavruta-options-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'chavruta-options-popup';
    popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    popup.innerHTML = `
        <div style="background:var(--card-bg,#fff);border-radius:1.5rem;padding:2rem;min-width:280px;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,0.2);text-align:center;">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem auto;">
                <i class="fas fa-user-friends" style="color:#fff;font-size:1.5rem;"></i>
            </div>
            <h3 style="margin:0 0 0.25rem;font-size:1.1rem;font-weight:800;color:var(--text-main);">${name}</h3>
            <p style="margin:0 0 1.5rem;font-size:0.85rem;color:#64748b;">חברותא פעילה</p>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
                <button onclick="document.getElementById('chavruta-options-popup').remove(); showUserDetails('${partnerId || email}')"
                    style="padding:0.75rem 1rem;background:#3b82f6;color:#fff;border:none;border-radius:0.75rem;font-size:0.95rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;">
                    <i class="fas fa-user"></i> הצג פרופיל
                </button>
                <button onclick="document.getElementById('chavruta-options-popup').remove(); if(typeof openChat==='function') openChat('${email}','${name}')"
                    style="padding:0.75rem 1rem;background:#22c55e;color:#fff;border:none;border-radius:0.75rem;font-size:0.95rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;">
                    <i class="fas fa-comments"></i> פתח צ'אט משותף
                </button>
                <button onclick="document.getElementById('chavruta-options-popup').remove()"
                    style="padding:0.6rem 1rem;background:none;border:1px solid var(--border-color,#e2e8f0);border-radius:0.75rem;font-size:0.9rem;color:#64748b;cursor:pointer;">
                    ביטול
                </button>
            </div>
        </div>`;
    popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
    document.body.appendChild(popup);
}

async function selectBookFromSearch(bookName) {
    document.getElementById('newBookSearch').value = bookName;
    document.getElementById('bookSearchResults').style.display = 'none';
    const detailsArea = document.getElementById('bookDetailsArea');
    if (detailsArea) detailsArea.style.display = 'block';

    const foundInDB = BOOKS_DB.find(b => b.name === bookName);
    let estimatedUnits = foundInDB ? foundInDB.units : 50;

    document.getElementById('calculatedUnits').value = estimatedUnits;
    if (document.getElementById('customAmountInput')) document.getElementById('customAmountInput').value = estimatedUnits;

    document.getElementById('bookScopeSelect').value = 'full';
    const scopeSelect = document.getElementById('bookScopeSelect');
    if (scopeSelect) scopeSelect.disabled = false;
    handleScopeChange();

    // הצג רמת לימוד רק לגמרא (בבלי/ירושלמי)
    const isGemara = foundInDB && (foundInDB.category === 'תלמוד בבלי' || foundInDB.category === 'תלמוד ירושלמי');
    const smRow = document.getElementById('studyModeRow');
    if (smRow) smRow.style.display = isGemara ? 'block' : 'none';
    if (!isGemara) {
        const smInput = document.getElementById('studyModeInput');
        if (smInput) smInput.value = '';
        document.querySelectorAll('.study-mode-btn').forEach(b => b.style.opacity = '1');
    }

    if (!foundInDB) {
        try {
            const res = await fetch(`https://www.sefaria.org.il/api/v2/raw/index/${encodeURIComponent(bookName)}`);
            const data = await res.json();
            selectedBookStructure = data;
        } catch (e) {
            console.error("Error fetching book structure from Sefaria", e);
        }
    }
}

function setStudyMode(mode) {
    const input = document.getElementById('studyModeInput');
    if (input) input.value = mode;
    const labels = { iyun: 'עיון', iyun_kal: 'עיון קל', bekiut: 'בקיאות' };
    const colors = { iyun: '#e8951a', iyun_kal: '#6366f1', bekiut: '#10b981' };
    document.querySelectorAll('.study-mode-btn').forEach(btn => {
        const btnMode = btn.id.replace('sm-','').replace('-','_');
        const isSelected = btnMode === mode;
        btn.style.opacity = isSelected ? '1' : '0.45';
        btn.style.background = isSelected ? colors[mode] : 'transparent';
        btn.style.color = isSelected ? '#fff' : colors[btnMode] || '#64748b';
        btn.style.transform = isSelected ? 'scale(1.05)' : 'scale(1)';
    });
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
    const isNotificationsEnabled = typeof notificationsEnabled !== 'undefined' ? notificationsEnabled : false;
    
    let ranks = [];
    try {
        const { data, error } = await supabaseClient
            .from('rank_definitions')
            .select('*')
            .order('min_points', { ascending: true });
        if (!error && data && data.length > 0) ranks = data;
    } catch (e) { }

    if (ranks.length === 0) {
        
        ranks = [
            { name: "צורב צעיר", min_points: 0 },
            { name: "מתמיד", min_points: 101 },
            { name: "צורבא מרבנן", min_points: 501 },
            { name: "תלמיד חכם", min_points: 1001 }
        ];
    }

    const currentRankObj = [...ranks].reverse().find(r => score >= r.min_points) || ranks[0];
    const currentRank = currentRankObj.name;

    if (isNotificationsEnabled && currentUser && previousRank && currentRank !== previousRank) {
        const rankOrder = { "צורב צעיר": 0, "מתמיד": 1, "צורבא מרבנן": 2, "תלמיד חכם": 3 };
        const transitionKey = `${previousRank}→${currentRank}`;
        if (rankOrder[currentRank] > rankOrder[previousRank] && !announcedRanks.has(transitionKey)) {
            announcedRanks.add(transitionKey);
            confetti({ particleCount: 400, spread: 120, origin: { y: 0.6 } });
            const msg = `👑 ברכות! עלית לדרגת ${currentRank}!`;
            addNotification(msg);
            showToast(msg, "success");
            if (typeof addRewardPointsDB === 'function' && currentUser?.id) {
                await addRewardPointsDB(currentUser.id, 100);
            }
        }
    }
    previousRank = currentRank;

    const nextRankObj = ranks.find(r => score < r.min_points);

    const rInfo = document.getElementById('rank-info');
    const rBar = document.getElementById('rank-progress-bar');
    const rFooter = document.getElementById('rank-footer');
    if (!rInfo || !rBar) return;

    if (!nextRankObj || !currentRankObj) {
        rInfo.innerText = `דרגת שיא: ${currentRank}`;
        rBar.style.width = "100%";
        rFooter.innerText = "אשריכם! הגעתם לדרגה הגבוהה ביותר.";
    } else {
        const prevThreshold = currentRankObj.min_points || 0;
        const nextThreshold = nextRankObj.min_points || 100;
        const progress = ((score - prevThreshold) / (nextThreshold - prevThreshold)) * 100;
        rInfo.innerText = `דרגה נוכחית: ${currentRank}`;
        rBar.style.width = `${progress}%`;
        rFooter.innerText = `עוד ${nextThreshold - score} דפים לדרגת ${nextRankObj.name}`;
    }
}


const SEFARIA_BAVLI_NAMES = {
    'ברכות':'Berakhot','שבת':'Shabbat','עירובין':'Eruvin','פסחים':'Pesachim',
    'שקלים':'Shekalim','יומא':'Yoma','סוכה':'Sukkah','ביצה':'Beitzah',
    'ראש השנה':'Rosh Hashanah','תענית':'Taanit','מגילה':'Megillah',
    'מועד קטן':'Moed Katan','חגיגה':'Chagigah','יבמות':'Yevamot',
    'כתובות':'Ketubot','נדרים':'Nedarim','נזיר':'Nazir','סוטה':'Sotah',
    'גיטין':'Gittin','קידושין':'Kiddushin','בבא קמא':'Bava Kamma',
    'בבא מציעא':'Bava Metzia','בבא בתרא':'Bava Batra','סנהדרין':'Sanhedrin',
    'מכות':'Makkot','שבועות':'Shevuot','עבודה זרה':'Avodah Zarah',
    'הוריות':'Horayot','זבחים':'Zevachim','מנחות':'Menachot',
    'חולין':'Chullin','בכורות':'Bekhorot','ערכין':'Arakhin',
    'תמורה':'Temurah','כריתות':'Keritot','מעילה':'Meilah',
    'תמיד':'Tamid','מידות':'Middot','נידה':'Niddah',
};

const SEFARIA_CHUMASH = {
    'בראשית':'Genesis','שמות':'Exodus','ויקרא':'Leviticus','במדבר':'Numbers','דברים':'Deuteronomy',
};

const SEFARIA_BASE = 'https://www.sefaria.org.il/';

function _bavliUnitToRef(bookName, currentUnit) {
    const nextUnit = Math.max(1, currentUnit + 1);
    const daf = Math.floor((nextUnit - 1) / 2) + 2;
    const side = (nextUnit - 1) % 2 === 0 ? 'a' : 'b';
    const engName = SEFARIA_BAVLI_NAMES[bookName];
    if (!engName) return null;
    return `${engName}.${daf}${side}`;
}

function openBookInSefaria(bookName, currentUnit) {
    const bookEntry = typeof BOOKS_DB !== 'undefined'
        ? BOOKS_DB.find(b => b.name === bookName)
        : null;
    const category = bookEntry?.category || '';

    let ref = null;

    if (category === 'תלמוד בבלי' || SEFARIA_BAVLI_NAMES[bookName]) {
        ref = _bavliUnitToRef(bookName, currentUnit);
    } else if (SEFARIA_CHUMASH[bookName]) {
        const chapter = Math.max(1, Math.floor(currentUnit / 30) + 1);
        const verse   = Math.max(1, (currentUnit % 30) + 1);
        ref = `${SEFARIA_CHUMASH[bookName]}.${chapter}.${verse}`;
    }

    const url = ref
        ? `${SEFARIA_BASE}${ref}?lang=he&with=all`
        : `${SEFARIA_BASE}${bookName.replace(/ /g, '_')}?lang=he`;

    const modal = document.getElementById('bookReaderModal');
    const frame = document.getElementById('bookReaderFrame');
    const title = document.getElementById('bookReaderTitle');

    if (modal && frame) {
        if (title) title.textContent = bookName;
        frame.src = url;
        modal.style.display = 'flex';
        if (typeof bringToFront === 'function') bringToFront(modal);
    } else {
        window.open(url, '_blank', 'noopener');
    }
}

// ===== תיאור חברותא =====
function showChavrutaDescriptionPrompt(goalId) {
    const goal = userGoals.find(g => g.id == goalId);
    if (!goal) return;
    if (goal.chavrutaDescSkipped) return; // כבר דילג בעבר

    const overlay = document.createElement('div');
    overlay.id = 'chavruta-desc-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
    <div style="background:var(--card-bg,#fff);border-radius:1.5rem;padding:1.75rem 1.5rem;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.18);border:1px solid var(--border-color,#e2e8f0);text-align:right;">
        <div style="font-size:1.5rem;margin-bottom:0.5rem;">📝</div>
        <h3 style="font-size:1.05rem;font-weight:800;margin:0 0 0.4rem;color:var(--text-main);">תוסיף תיאור לחברותא שלך?</h3>
        <p style="font-size:0.85rem;color:var(--text-muted,#64748b);margin:0 0 1rem;">תיאור קצר יופיע לאנשים שמחפשים חברותא לספר זה.<br><span style="font-style:italic;">לדוגמא: "מחפש חברותא ללימוד בשעות הערב"</span></p>
        <textarea id="chavruta-desc-input" placeholder="כתוב כאן..." rows="3"
            style="width:100%;border:1px solid var(--border-color,#e2e8f0);border-radius:0.75rem;padding:0.65rem 0.75rem;font-size:0.9rem;resize:none;outline:none;background:var(--bg,#f8fafc);color:var(--text-main);box-sizing:border-box;font-family:inherit;">${goal.chavrutaDescription || ''}</textarea>
        <div style="display:flex;gap:0.75rem;margin-top:1rem;">
            <button onclick="saveChavrutaDescription('${goalId}')"
                style="flex:1;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:0.75rem;padding:0.65rem;font-weight:700;cursor:pointer;font-size:0.9rem;">שמור תיאור</button>
            <button onclick="skipChavrutaDescription('${goalId}')"
                style="padding:0.65rem 1rem;background:var(--bg,#f8fafc);border:1px solid var(--border-color,#e2e8f0);border-radius:0.75rem;font-size:0.85rem;cursor:pointer;color:var(--text-muted,#64748b);font-weight:600;">לא עכשיו</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function saveChavrutaDescription(goalId) {
    const input = document.getElementById('chavruta-desc-input');
    const desc = input ? input.value.trim() : '';
    const goal = userGoals.find(g => g.id == goalId);
    if (goal) {
        goal.chavrutaDescription = desc;
        goal.chavrutaDescSkipped = false;
        saveGoals();
        renderGoals();
        if (typeof supabaseClient !== 'undefined' && currentUser) {
            supabaseClient.from('user_goals').update({ chavruta_description: desc }).eq('id', goalId).then(() => {});
        }
    }
    document.getElementById('chavruta-desc-overlay')?.remove();
    if (desc) showToast('התיאור נשמר!', 'success');
}

function skipChavrutaDescription(goalId) {
    const goal = userGoals.find(g => g.id == goalId);
    if (goal) { goal.chavrutaDescSkipped = true; saveGoals(); }
    document.getElementById('chavruta-desc-overlay')?.remove();
}

function editChavrutaDescription(goalId) {
    const goal = userGoals.find(g => g.id == goalId);
    if (goal) { goal.chavrutaDescSkipped = false; }
    showChavrutaDescriptionPrompt(goalId);
}
