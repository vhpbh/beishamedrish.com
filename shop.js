let shopItems = [];
let userInventory = [];

async function renderShop() {
    const container = document.getElementById('screen-shop');
    if (!container) return;

    container.innerHTML = `<div class="max-w-7xl mx-auto px-4 py-8"><div style="padding:16px;">${getSkeletonHTML('block', 4)}</div></div>`;

    let html = `
    <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div>
                <h2 class="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <i class="fas fa-store text-amber-500"></i> חנות הזכויות
                </h2>
                <p class="text-slate-500 dark:text-slate-400 mt-1">רכוש רקעים ואייקונים באמצעות הנקודות שצברת</p>
            </div>
            <div class="zuzim-tooltip-wrapper">
                <div class="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-6 py-3 rounded-2xl font-bold text-xl flex items-center gap-3 shadow-sm border border-amber-100 dark:border-amber-800" style="cursor:help;">
                    <div class="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                        <i class="fas fa-coins" style="color:#fff;"></i>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs opacity-70 font-normal">הזוזים שלך <i class="fas fa-question-circle" style="font-size:0.7rem;opacity:0.6;"></i></span>
                        <span id="user-points-display" class="leading-none">${currentUser ? (currentUser.reward_points || 0).toLocaleString() : 0}</span>
                    </div>
                </div>
                <div class="zuzim-tooltip">
                    <strong style="font-size:0.85rem;color:#fbbf24;">איך להרוויח עוד זוזים?</strong>
                    <ul style="margin:6px 0 0 0;padding-right:1rem;list-style:disc;">
                        <li>רצף לימוד יומי — 10–300 זוזים</li>
                        <li>לייק על הודעה — 5 זוזים לשולח</li>
                        <li>חבר מביא חבר — 30+ זוזים</li>
                        <li>הרשמה לניוזליטר — 40 זוזים</li>
                        <li>לחיצה על "קראתי" בניוזליטר — 10 זוזים</li>
                        <li>קביעת חברותא — 15 זוזים</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    try {
        
        if (currentUser?.id) {
            const { data: pts } = await supabaseClient.from('profiles_public').select('reward_points').eq('id', currentUser.id).maybeSingle();
            if (pts && pts.reward_points !== undefined) {
                currentUser.reward_points = pts.reward_points;
                localStorage.setItem('torahApp_user', JSON.stringify(currentUser));
                const ptsDsp = document.getElementById('user-points-display');
                if (ptsDsp) ptsDsp.textContent = pts.reward_points.toLocaleString();
            }
        }

        if (!window.knownMissingTables.has('shop_items')) {
            const { data: items, error: itemsError } = await supabaseClient
                .from('shop_items')
                .select('*')
                .eq('is_active', true);

            if (itemsError && (itemsError.status === 404 || itemsError.code === 'PGRST205')) {
                window.knownMissingTables.add('shop_items');
                console.warn('shop_items: טבלה חסרה ב-DB:', itemsError.message);
            } else if (itemsError) { console.warn('shop_items error:', itemsError.message); shopItems = []; }
            else shopItems = items || [];
        }

const ownedData = JSON.parse(localStorage.getItem('torahApp_owned_items') || '{}');
        userInventory = Object.keys(ownedData).map(id => ({ item_id: id, is_equipped: ownedData[id]?.equipped || false }));

        html += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">`;

        if (shopItems.length === 0) {
            html += `<div class="col-span-full text-center text-slate-500 py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <i class="fas fa-store text-4xl mb-4 opacity-50"></i>
                <p class="font-semibold">אין מוצרים זמינים כרגע</p>
                <p class="text-sm mt-1">בקרוב יתווספו מוצרים חדשים!</p>
            </div>`;
        } else {
            shopItems.forEach(item => {
                const ownedItem = userInventory.find(i => i.item_id === item.id);
                const isOwned = !!ownedItem;
                const isEquipped = ownedItem && ownedItem.is_equipped;
                const canAfford = currentUser && currentUser.reward_points >= item.price_zuzim;
                const hasLandingPage = !!item.html_content;

                let btnHtml = '';
                if (isOwned) {
                    if (isEquipped) {
                        btnHtml = `<button class="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-default font-bold flex items-center justify-center gap-2"><i class="fas fa-check-circle"></i> בשימוש</button>`;
                    } else {
                        btnHtml = `<button class="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 transition-all shadow-md" onclick="equipItem('${item.id}', '${item.item_type}')">הפעל רקע/אייקון</button>`;
                    }
                } else {
                    if (canAfford) {
                        const action = hasLandingPage ? `openProductLandingPage('${item.id}')` : `purchaseItem('${item.id}', ${item.price_zuzim})`;
                        const btnText = hasLandingPage ? 'פרטים ורכישה' : `רכוש ב-${item.price_zuzim} <i class="fas fa-coins text-xs"></i>`;

                        btnHtml = `<button class="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all transform active:scale-95" onclick="${action}">
                            ${btnText}
                        </button>`;
                    } else {
                        btnHtml = `<button class="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed font-bold border border-slate-200 dark:border-slate-700">חסרים ${item.price_zuzim - currentUser.reward_points} נק'</button>`;
                    }
                }

                let previewHtml = '';
                if (item.image_url) {
                    if (item.item_type === 'icon') {
                        previewHtml = `<div class="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden mx-auto"><img src="${item.image_url}" class="w-full h-full object-cover"></div>`;
                    } else {
                        previewHtml = `<img src="${item.image_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">`;
                    }
                } else {
                    previewHtml = `<i class="fas fa-gift text-5xl text-slate-300"></i>`;
                }

                let clickAction = '';
                if (hasLandingPage) {
                    clickAction = `onclick="openProductLandingPage('${item.id}')" style="cursor:pointer;"`;
                }

                let lotteryBadge = '';
                if (item.item_type === 'lottery' && item.lottery_end_date) {
                    const now = new Date();
                    const end = new Date(item.lottery_end_date);
                    const diff = end - now;
                    if (diff > 0) {
                        lotteryBadge = `<div class="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold z-10 shadow-sm animate-pulse" id="lottery-countdown-${item.id}">...</div>`;
                    } else {
                        lotteryBadge = `<div class="absolute top-2 left-2 bg-slate-500 text-white text-[10px] px-2 py-1 rounded-full font-bold z-10 shadow-sm">הסתיימה</div>`;
                    }
                }

                html += `
                <div class="bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group" ${clickAction}>
                    ${isOwned ? '<div class="absolute top-4 right-4 bg-green-500 text-white text-[10px] px-2 py-1 rounded-full font-bold z-10 shadow-sm flex items-center gap-1"><i class="fas fa-check"></i> נרכש</div>' : ''}
                    ${lotteryBadge}
                    
                    <div class="h-48 rounded-2xl bg-slate-50 dark:bg-slate-900 mb-4 overflow-hidden relative flex items-center justify-center border border-slate-100 dark:border-slate-700/50">
                        ${previewHtml}
                        ${item.item_type === 'background' ? '<div class="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">רקע</div>' : ''}
                        ${item.item_type === 'icon' ? '<div class="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm">אייקון</div>' : ''}
                        ${item.item_type === 'lottery' ? '<div class="absolute bottom-2 right-2 bg-amber-500 text-white text-[10px] px-2 py-1 rounded shadow-sm">הגרלה</div>' : ''}
                    </div>
                    
                    <div class="flex-1 flex flex-col">
                        <h3 class="font-bold text-lg text-slate-900 dark:text-white mb-1 leading-tight">${item.title}</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">${item.description || 'ללא תיאור'}</p>
                        <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700" onclick="event.stopPropagation()">
                            ${btnHtml}
                        </div>
                    </div>
                </div>
                `;
            });
        }
        html += `</div></div>`;
        container.innerHTML = html;
        startLotteryCountdowns();

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="text-center p-10 text-red-500">
            <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
            <p>שגיאה בטעינת החנות. נסה לרענן.</p>
        </div>`;
    }
}

let lotteryCountdownInterval = null;
function startLotteryCountdowns() {
    if (lotteryCountdownInterval) clearInterval(lotteryCountdownInterval);
    const lotteryItems = shopItems.filter(i => i.item_type === 'lottery' && i.lottery_end_date && new Date(i.lottery_end_date) > new Date());
    if (!lotteryItems.length) return;

    function tick() {
        const now = new Date();
        lotteryItems.forEach(item => {
            const el = document.getElementById(`lottery-countdown-${item.id}`);
            if (!el) return;
            const diff = new Date(item.lottery_end_date) - now;
            if (diff <= 0) { el.textContent = 'הסתיימה'; el.classList.remove('animate-pulse'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            const days = Math.floor(diff / 86400000);
            el.textContent = days > 0 ? `עוד ${days}י ${String(h%24).padStart(2,'0')}:${String(m).padStart(2,'0')}` : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        });
    }
    tick();
    lotteryCountdownInterval = setInterval(tick, 1000);
}

function openProductLandingPage(itemId) {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.style.zIndex = '5000';
    modal.style.padding = '0';

    const ownedItem = userInventory.find(i => i.item_id === item.id);
    const userPoints = currentUser ? (currentUser.reward_points || 0) : 0;
    const canAfford = currentUser && userPoints >= item.price_zuzim;
    const isLottery = item.item_type === 'lottery';

const lotteryEntryKey = `torahApp_lottery_${item.id}`;
    const hasEnteredLottery = localStorage.getItem(lotteryEntryKey) === 'true';

    let lotteryDateHtml = '';
    if (isLottery && item.lottery_end_date) {
        const drawDate = new Date(item.lottery_end_date);
        const isExpired = drawDate < new Date();
        lotteryDateHtml = `
            <div class="flex items-center gap-2 text-sm ${isExpired ? 'text-slate-400' : 'text-amber-600 dark:text-amber-400'} font-medium mb-3">
                <i class="fas fa-calendar-alt"></i>
                <span>${isExpired ? 'ההגרלה הסתיימה' : 'מועד ההגרלה:'} ${drawDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>`;
    }

    let actionBtn = '';
    if (isLottery) {
        if (hasEnteredLottery) {
            actionBtn = `<button class="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg cursor-default flex items-center justify-center gap-2"><i class="fas fa-check-circle"></i> נרשמת להגרלה!</button>`;
        } else if (canAfford) {
            actionBtn = `<button class="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2" onclick="joinLottery('${item.id}', ${item.price_zuzim}, this.closest('.modal-overlay'))"><i class="fas fa-ticket-alt"></i> השתתף בהגרלה ב-${item.price_zuzim} זוזים</button>`;
        } else {
            actionBtn = `<button class="w-full py-4 bg-slate-300 text-slate-500 rounded-xl font-bold text-lg cursor-not-allowed">חסרים ${item.price_zuzim - userPoints} זוזים להשתתפות</button>`;
        }
    } else if (ownedItem) {
        actionBtn = `<button class="w-full py-4 bg-slate-800 text-white rounded-xl font-bold text-lg cursor-default">המוצר כבר ברשותך</button>`;
    } else if (canAfford) {
        actionBtn = `<button class="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform" onclick="this.closest('.modal-overlay').remove(); purchaseItem('${item.id}', ${item.price_zuzim})">רכוש ב-${item.price_zuzim} זוזים</button>`;
    } else {
        actionBtn = `<button class="w-full py-4 bg-slate-300 text-slate-500 rounded-xl font-bold text-lg cursor-not-allowed">חסרים ${item.price_zuzim - userPoints} זוזים</button>`;
    }

const allImages = [item.image_url, ...(item.secondary_images || [])].filter(Boolean);
    const galleryHtml = allImages.length > 1 ? `
        <div class="flex gap-2 flex-wrap justify-center mt-3">
            ${allImages.map((img, idx) => `
                <img src="${img}"
                     class="w-20 h-20 object-cover rounded-xl border-2 cursor-pointer transition-all ${idx === 0 ? 'border-amber-500 shadow-md' : 'border-transparent hover:border-amber-300'}"
                     onclick="setProductMainImage(this, '${img}')"
                     title="${idx === 0 ? 'תמונה ראשית' : 'לחץ להגדרה כתמונה ראשית'}">
            `).join('')}
        </div>` : '';

const providerInfo = item.provider_info || {};
    let providerHtml = '';
    if (providerInfo.name || providerInfo.location || providerInfo.phone || providerInfo.website || providerInfo.other) {
        providerHtml = `
        <div class="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h4 class="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><i class="fas fa-store text-amber-500"></i> פרטי נותן השירות</h4>
            <div class="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                ${providerInfo.name ? `<div class="flex items-center gap-2"><i class="fas fa-user w-4 text-slate-400"></i> <span class="font-medium">${providerInfo.name}</span></div>` : ''}
                ${providerInfo.location ? `<div class="flex items-center gap-2"><i class="fas fa-map-marker-alt w-4 text-slate-400"></i> <span>${providerInfo.location}</span></div>` : ''}
                ${providerInfo.phone ? `<div class="flex items-center gap-2"><i class="fas fa-phone w-4 text-slate-400"></i> <a href="tel:${providerInfo.phone}" class="text-blue-600 hover:underline">${providerInfo.phone}</a></div>` : ''}
                ${providerInfo.website ? `<div class="flex items-center gap-2"><i class="fas fa-globe w-4 text-slate-400"></i> <a href="${providerInfo.website}" target="_blank" rel="noopener" class="text-blue-600 hover:underline truncate">${providerInfo.website}</a></div>` : ''}
                ${providerInfo.other ? `<div class="flex items-center gap-2"><i class="fas fa-info-circle w-4 text-slate-400"></i> <span>${providerInfo.other}</span></div>` : ''}
            </div>
        </div>`;
    }

    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-3xl shadow-2xl relative flex flex-col overflow-hidden">
            <button class="absolute top-4 left-4 z-20 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm" onclick="this.closest('.modal-overlay').remove()">
                <i class="fas fa-times"></i>
            </button>

            <div class="flex-1 overflow-y-auto custom-scrollbar">
                <!-- תמונה ראשית + גלריה -->
                <div class="p-6 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center">
                    <img id="product-main-img-${item.id}" src="${item.image_url || ''}" class="max-w-md w-full rounded-2xl shadow-xl mb-3" onerror="this.style.display='none'">
                    ${galleryHtml}
                </div>

                <!-- כותרת ופרטים -->
                <div class="p-6">
                    <!-- יתרת זוזים -->
                    ${currentUser ? `
                    <div class="flex items-center gap-2 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 w-fit">
                        <i class="fas fa-coins text-amber-500"></i>
                        <span class="text-sm font-bold text-amber-700 dark:text-amber-400">היתרה שלך: <span id="product-balance-${item.id}">${userPoints.toLocaleString()}</span> זוזים</span>
                    </div>` : ''}

                    <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-1">${item.title}</h2>
                    ${item.subtitle ? `<p class="text-slate-500 dark:text-slate-400 text-base mb-3 font-medium">${item.subtitle}</p>` : ''}
                    ${lotteryDateHtml}
                    ${item.description ? `<p class="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">${item.description}</p>` : ''}

                    <!-- תוכן HTML נוסף מהניהול -->
                    ${item.html_content ? `<div class="mt-4">${item.html_content}</div>` : ''}

                    <!-- פרטי ספק -->
                    ${providerHtml}
                </div>
            </div>

            <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                ${actionBtn}
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function setProductMainImage(imgEl, src) {
    
    const container = imgEl.closest('.modal-overlay');
    if (!container) return;
    const mainImg = container.querySelector('[id^="product-main-img-"]');
    if (mainImg) mainImg.src = src;
    container.querySelectorAll('.flex.gap-2 img').forEach(i => {
        i.classList.remove('border-amber-500', 'shadow-md');
        i.classList.add('border-transparent');
    });
    imgEl.classList.remove('border-transparent');
    imgEl.classList.add('border-amber-500', 'shadow-md');
}

async function joinLottery(itemId, price, modalEl) {
    if (!requireAuth()) return;
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;

    const userPts = currentUser?.reward_points || 0;
    if (userPts < price) {
        showToast(`חסרים לך ${price - userPts} זוזים`, 'error');
        return;
    }

    const confirmed = await customConfirm(`להשתתף בהגרלה "${item.title}" ב-${price} זוזים?`);
    if (!confirmed) return;

    const newPts = await addRewardPointsDB(currentUser.id, -price);
    if (newPts === null) { showToast('שגיאה בעדכון נקודות', 'error'); return; }

    const { error: insertErr } = await supabaseClient.from('shop_orders').insert({
        user_id: currentUser.id,
        item_id: itemId,
        order_type: 'lottery_entry'
    });
    if (insertErr) {
        
        await addRewardPointsDB(currentUser.id, price);
        showToast('שגיאה בשמירת ההרשמה להגרלה: ' + insertErr.message, 'error');
        return;
    }

    localStorage.setItem(`torahApp_lottery_${itemId}`, 'true');
    showToast(`נרשמת להגרלה! יתרה: ${newPts.toLocaleString()} זוזים 🎉`, 'success');

    if (modalEl) {
        const btn = modalEl.querySelector('button[onclick*="joinLottery"]');
        if (btn) {
            btn.outerHTML = `<button class="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg cursor-default flex items-center justify-center gap-2"><i class="fas fa-check-circle"></i> נרשמת להגרלה!</button>`;
        }
        const balanceEl = modalEl.querySelector(`[id^="product-balance-"]`);
        if (balanceEl) balanceEl.textContent = newPts.toLocaleString();
    }
}

async function purchaseItem(itemId, price) {
    if (!requireAuth()) return;
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;

    const userPts = currentUser?.reward_points || 0;
    if (userPts < price) {
        showToast(`חסרים לך ${(price - userPts).toLocaleString()} זוזים לרכישה זו`, 'error');
        return;
    }

    const confirmed = await customConfirm(`לרכוש "${item.title}" ב-${price} זוזים?`);
    if (!confirmed) return;

    const newPts = await addRewardPointsDB(currentUser.id, -price);
    if (newPts === null) { showToast('שגיאה בעדכון נקודות', 'error'); return; }

    const ownedData = JSON.parse(localStorage.getItem('torahApp_owned_items') || '{}');
    ownedData[itemId] = { purchasedAt: new Date().toISOString(), equipped: false };
    localStorage.setItem('torahApp_owned_items', JSON.stringify(ownedData));
    userInventory = Object.keys(ownedData).map(id => ({ item_id: id, is_equipped: ownedData[id]?.equipped || false }));

    showToast(`"${item.title}" נרכש! יתרה: ${newPts.toLocaleString()} זוזים`, 'success');
    renderShop();
}

async function equipItem(itemId, type) {
    const ownedData = JSON.parse(localStorage.getItem('torahApp_owned_items') || '{}');
    if (!ownedData[itemId]) { showToast('פריט זה אינו ברשותך', 'error'); return; }

    Object.keys(ownedData).forEach(id => {
        const it = shopItems.find(i => i.id === id);
        if (it && it.item_type === type) ownedData[id].equipped = false;
    });
    ownedData[itemId].equipped = true;
    localStorage.setItem('torahApp_owned_items', JSON.stringify(ownedData));
    userInventory = Object.keys(ownedData).map(id => ({ item_id: id, is_equipped: ownedData[id]?.equipped || false }));

    const item = shopItems.find(i => i.id === itemId);

    if (type === 'icon') {
        const avatarUrl = item?.image_url || null;
        localStorage.setItem('torahApp_equipped_avatar', avatarUrl || '');
        if (currentUser?.id && avatarUrl) {
            try {
                await supabaseClient.from('profiles_public').update({ avatar_url: avatarUrl }).eq('id', currentUser.id);
            } catch(e) {  }
        }
    }

    if (type === 'background') {
        const bgUrl = item?.image_url || null;
        localStorage.setItem('torahApp_equipped_bg', bgUrl || '');
        if (currentUser?.id) {
            try {
                await supabaseClient.from('profiles_public')
                    .update({ background_url: bgUrl, active_bg_item: bgUrl ? parseInt(itemId) : null })
                    .eq('id', currentUser.id);
                if (currentUser) {
                    currentUser.background_url = bgUrl;
                    localStorage.setItem('torahApp_user', JSON.stringify(currentUser));
                }
            } catch(e) {  }
        }
    }

    applyUserCustomizations();
    showToast('הפריט הופעל!', 'success');
    renderShop();
}

async function applyUserCustomizations() {
    if (!shopItems.length && !window.knownMissingTables?.has('shop_items')) {
        try {
            const { data } = await supabaseClient.from('shop_items').select('id, item_type, image_url').eq('is_active', true);
            if (data) shopItems = data;
        } catch(e) {  }
    }
    const ownedData = JSON.parse(localStorage.getItem('torahApp_owned_items') || '{}');
    const equipped = Object.entries(ownedData).filter(([, v]) => v.equipped).map(([id]) => parseInt(id));
    let equippedAvatarUrl = null;
    let equippedBgUrl = null;
    equipped.forEach(itemId => {
        const item = shopItems.find(i => i.id === itemId);
        if (!item) return;
        if (item.item_type === 'background' && item.image_url) {
            equippedBgUrl = item.image_url;
            localStorage.setItem('torahApp_equipped_bg', item.image_url);
        }
        if (item.item_type === 'icon' && item.image_url) {
            equippedAvatarUrl = item.image_url;
            localStorage.setItem('torahApp_equipped_avatar', item.image_url);
        }
    });

const glassPanel = document.querySelector('.glass-panel');
    const storedBg = equippedBgUrl || localStorage.getItem('torahApp_equipped_bg') || (currentUser?.background_url);
    if (storedBg) {
        if (glassPanel) {
            glassPanel.style.backgroundImage = `url('${storedBg}')`;
            glassPanel.style.backgroundSize = 'cover';
            glassPanel.style.backgroundPosition = 'center';
        }
        document.body.style.setProperty('--user-bg', `url('${storedBg}')`);
    }
    
    if (equippedAvatarUrl && currentUser?.id && !window._avatarSynced) {
        window._avatarSynced = true;
        try {
            await supabaseClient.from('profiles_public').update({ avatar_url: equippedAvatarUrl }).eq('id', currentUser.id);
        } catch(e) {  }
    }
}

function applyAvatarToMyProfile(avatarUrl) {
    const avatarDiv = document.getElementById('modalUserAvatar');
    if (!avatarUrl) return;
    
    const navAvatarEl = document.getElementById('navUserAvatar');
    if (navAvatarEl) {
        navAvatarEl.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none'">`;
    }
    
    if (avatarDiv && document.getElementById('userModal')?.style.display === 'flex') {
        const avatarInner = avatarDiv.querySelector('div');
        if (avatarInner) avatarInner.innerHTML = `<img src="${avatarUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'">`;
    }
}

function getUserAvatarUrl(userId) {
    if (userId === currentUser?.id || userId === 'me') {
        return localStorage.getItem('torahApp_equipped_avatar') || null;
    }
    const u = typeof globalUsersData !== 'undefined' ? globalUsersData.find(x => x.id === userId) : null;
    return u?.avatar_url || null;
}