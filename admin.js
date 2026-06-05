

const SUPABASE_URL = 'https://afihonprbwaoiokowsty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nAMFWiuTDObLLVoofQurSw_VSbSXxRT';
const GEMINI_KEY   = 'AIzaSyDfufe_jfcOlhJAXePyHYOSwNCc3FVBjh0';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentAdmin = null;
let allUsers = [];
let filteredUsers = [];
let usersCurrentPage = 1;
const USERS_PER_PAGE = 25;
let chartInstance = null;
let currentUserId = null;
let shopSecondaryImgs = [];
let editingShopId = null;
let allNewsletter = [];
let leafletMap = null;
let dbLogLines = [];
let msgType = 'popup';

document.addEventListener('DOMContentLoaded', async () => {
  showGate('בודק הרשאות...');
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showGate('יש להתחבר כדי לגשת לניהול.', true); return; }
  await initAdmin(session.user);
});

async function initAdmin(user) {
  const meta = user.user_metadata || {};
  if (!meta.is_admin) { showGate('אין לך הרשאות מנהל.'); return; }
  currentAdmin = user;
  hideGate();
  document.getElementById('admin-name').textContent = meta.display_name || user.email;
  navigate('dashboard');
  setInterval(loadLiveCount, 30000);
  loadTagTemplates();
}

async function adminLogin() {
  const email = document.getElementById('gate-email').value.trim();
  const password = document.getElementById('gate-password').value;
  const errEl = document.getElementById('gate-error');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = 'יש למלא אימייל וסיסמה'; errEl.style.display = 'block'; return; }
  document.getElementById('gate-msg').textContent = 'מתחבר...';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('gate-msg').textContent = 'יש להתחבר כדי לגשת לניהול.';
    errEl.textContent = error.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : error.message;
    errEl.style.display = 'block';
    return;
  }
  await initAdmin(data.user);
}

function showGate(msg, showForm = false) {
  const g = document.getElementById('auth-gate');
  g.classList.remove('hidden');
  g.style.display = 'flex';
  document.getElementById('gate-msg').textContent = msg;
  document.getElementById('gate-login-form').classList.toggle('hidden', !showForm);
  document.getElementById('gate-login-btn').classList.add('hidden');
}
function hideGate() {
  const g = document.getElementById('auth-gate');
  g.classList.add('hidden');
  g.style.display = 'none';
}

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + page + "'")) b.classList.add('active');
  });
  const loaders = { dashboard: loadDashboard, live: loadLive, map: loadMap,
    users: loadUsers, blocked: loadBlocked, reports: loadReports,
    messages: loadMessages, suggestions: loadSuggestions, parnas: loadParnas,
    shop: () => { loadShop(); populateLotteryItemSelect(); }, newsletter: loadNewsletter, ai: loadAIContext,
    chats: () => { loadChatControlPanel(); loadPrivateChatsAdmin(); },
    tags: loadTagTemplates, 'bonus-links': loadBonusLinks,
    'live-rooms': loadLiveRooms,
    'donation-settings': loadDonationSettings };
  if (loaders[page]) loaders[page]();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600', warn: 'bg-yellow-500 text-black' };
  t.className = `${colors[type] || colors.info} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all`;
  t.textContent = msg;
  document.getElementById('toast').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

async function loadDashboard() {
  loadStats();
  loadChart('24h');
  loadTopUsers();
  loadTopPages();
  loadMaintenanceStatus();
}

async function loadMaintenanceStatus() {
  const { data } = await sb.from('system_announcements').select('id,content').eq('target_type', 'maintenance').maybeSingle();
  const statusEl = document.getElementById('maintenance-status');
  const btnEl = document.getElementById('maintenance-btn');
  if (statusEl) statusEl.textContent = data ? '⚠️ פעיל — האתר מוצג כבמצב תחזוקה' : '✅ כבוי — האתר פעיל רגיל';
  if (btnEl) { btnEl.textContent = data ? 'כבה תחזוקה' : 'הפעל תחזוקה'; btnEl.className = data ? 'btn-danger btn-sm' : 'btn-primary btn-sm'; }
}

async function toggleMaintenance() {
  const btn = document.getElementById('maintenance-btn');
  if (btn) btn.disabled = true;
  const { data: existing } = await sb.from('system_announcements').select('id').eq('target_type', 'maintenance').maybeSingle();
  if (existing) {
    const { error } = await sb.from('system_announcements').delete().eq('target_type', 'maintenance');
    if (!error) toast('מצב תחזוקה בוטל ✓', 'success'); else toast('שגיאה: ' + error.message, 'error');
  } else {
    let { error } = await sb.from('system_announcements').insert({
      title: 'תחזוקה', content: 'האתר עובר תחזוקה. נחזור בקרוב!',
      target_type: 'maintenance', created_at: new Date().toISOString()
    });
    if (error && (error.message?.includes('check') || error.message?.includes('constraint'))) {
      
      toast('שגיאת אילוץ DB — יש להריץ את migrations.sql תחילה!', 'error');
      console.error('Constraint error - run migrations.sql to add maintenance to target_type check', error);
    } else if (error) {
      toast('שגיאה: ' + error.message, 'error');
    } else {
      toast('מצב תחזוקה הופעל ⚠️', 'warn');
    }
  }
  if (btn) btn.disabled = false;
  loadMaintenanceStatus();
}

async function loadStats() {
  try {
    const [{ count: uc }, { data: online }, { count: gc }, { count: dc }] = await Promise.all([
      sb.from('profiles_public').select('*', { count: 'exact', head: true }),
      sb.from('profiles_public').select('id').gte('last_seen', new Date(Date.now() - 5 * 60000).toISOString()),
      sb.from('user_goals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      sb.from('donations').select('*', { count: 'exact', head: true })
    ]);
    document.getElementById('stat-users').textContent = (uc || 0).toLocaleString('he');
    document.getElementById('stat-online').textContent = (online?.length || 0).toString();
    document.getElementById('stat-goals').textContent = (gc || 0).toLocaleString('he');
    document.getElementById('stat-donations').textContent = (dc || 0).toLocaleString('he');
  } catch(e) { console.error(e); }
}

async function loadLiveCount() {
  const { data } = await sb.from('profiles_public').select('id').gte('last_seen', new Date(Date.now() - 5 * 60000).toISOString());
  document.getElementById('stat-online').textContent = (data?.length || 0).toString();
}

async function loadChart(range, btn) {
  if (btn) {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const now = new Date();
  const ranges = {
    '24h':  { hours: 24,    group: 'hour' },
    '48h':  { hours: 48,    group: 'hour' },
    '7d':   { hours: 168,   group: 'day' },
    '30d':  { hours: 720,   group: 'day' },
    '90d':  { hours: 2160,  group: 'week' },
    '365d': { hours: 8760,  group: 'month' },
    'all':  { hours: 87600, group: 'month' }
  };
  const cfg = ranges[range] || ranges['24h'];
  const from = new Date(now - cfg.hours * 3600000);

  let buckets;
  if (cfg.group === 'hour') {
    
    const { data: users } = await sb.from('profiles_public').select('last_seen').gte('last_seen', from.toISOString());
    buckets = buildBuckets(users || [], from, now, cfg.group, 'last_seen');
  } else {
    
    const fromDate = from.toISOString().split('T')[0];
    const { data: logs } = await sb.from('activity_log').select('activity_date').gte('activity_date', fromDate);
    buckets = buildBuckets(logs || [], from, now, cfg.group, 'activity_date');
  }

  const ctx = document.getElementById('activity-chart').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: buckets.labels,
      datasets: [{
        label: 'פעילות',
        data: buckets.counts,
        borderColor: '#FFB703',
        backgroundColor: 'rgba(255,183,3,.15)',
        fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: '#FFB703'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748b', font: { family: 'Heebo' } }, grid: { color: '#1e2a42' } },
        y: { ticks: { color: '#64748b', font: { family: 'Heebo' } }, grid: { color: '#1e2a42' }, beginAtZero: true }
      }
    }
  });
}

function buildBuckets(rows, from, to, groupBy, dateKey) {
  const labels = [], counts = [];
  const ms = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 }[groupBy] || 3600000;
  let t = from.getTime();
  while (t < to.getTime()) {
    const end = t + ms;
    const count = rows.filter(r => {
      const d = new Date(r[dateKey]).getTime();
      return d >= t && d < end;
    }).length;
    const d = new Date(t);
    let label;
    if (groupBy === 'hour') label = `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:00`;
    else if (groupBy === 'day') label = `${d.getDate()}/${d.getMonth()+1}`;
    else if (groupBy === 'week') label = `${d.getDate()}/${d.getMonth()+1}`;
    else label = `${d.getMonth()+1}/${d.getFullYear()}`;
    labels.push(label);
    counts.push(count);
    t = end;
  }
  return { labels, counts };
}

async function loadTopUsers() {
  const { data } = await sb.from('profiles_public').select('id,display_name,rank_score,city').order('rank_score', { ascending: false }).limit(8);
  const el = document.getElementById('top-users-list');
  if (!data?.length) { el.innerHTML = '<div class="text-sm text-[#64748b] text-center py-4">אין נתונים</div>'; return; }
  el.innerHTML = data.map((u, i) => `
    <div class="table-row flex items-center justify-between p-2 rounded-lg cursor-pointer" onclick="openUserModal('${u.id}')">
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-[#FFB703] w-5">${i+1}</span>
        <div>
          <div class="text-sm font-medium text-white">${esc(u.display_name || 'אנונימי')}</div>
          <div class="text-xs text-[#64748b]">${esc(u.city || '')}</div>
        </div>
      </div>
      <span class="badge-yellow">${(u.rank_score || 0).toLocaleString('he')}</span>
    </div>`).join('');
}

async function loadTopPages() {
  const { data, error } = await sb.from('page_views')
    .select('page_name')
    .gte('viewed_at', new Date(Date.now() - 30 * 86400000).toISOString());
  const el = document.getElementById('top-pages-list');
  if (error || !data?.length) {
    el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">אין נתוני צפיות עדיין</div>';
    return;
  }
  const counts = {};
  data.forEach(r => { counts[r.page_name] = (counts[r.page_name] || 0) + 1; });
  const pages = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, views]) => ({ name, views }));
  const max = pages[0].views;
  el.innerHTML = pages.map(p => `
    <div class="space-y-1">
      <div class="flex justify-between text-sm">
        <span class="text-[#94a3b8]">${esc(p.name)}</span>
        <span class="text-[#64748b] text-xs">${p.views}</span>
      </div>
      <div class="h-1.5 bg-[#0F1623] rounded-full"><div class="live-bar" style="width:${(p.views/max*100).toFixed(0)}%"></div></div>
    </div>`).join('');
}

// ---- Real-time entry/exit log ----
let _liveLogEvents = [];
let _liveLastSeen = {};   // userId -> last_seen timestamp
let _liveRealtimeSub = null;

async function loadLive() {
  const since = new Date(Date.now() - 5 * 60000).toISOString();
  const { data } = await sb.from('profiles_public').select('id,display_name,city,last_seen,rank_score').gte('last_seen', since).order('last_seen', { ascending: false });
  const grid = document.getElementById('live-grid');
  if (!data?.length) { grid.innerHTML = '<div class="text-[#64748b] col-span-3 text-center py-10">אין משתמשים מחוברים כעת</div>'; return; }
  // seed last-seen snapshot
  data.forEach(u => { _liveLastSeen[u.id] = u.last_seen; });
  grid.innerHTML = data.map(u => {
    const ago = Math.floor((Date.now() - new Date(u.last_seen)) / 1000);
    const agoStr = ago < 60 ? `לפני ${ago} שנ\'` : `לפני ${Math.floor(ago/60)} דק\'`;
    return `
    <div class="card flex items-center gap-3 cursor-pointer hover:border-[#FFB703]/50 transition-colors" onclick="openUserModal('${u.id}')">
      <div class="relative">
        <div class="w-10 h-10 rounded-full bg-[#2d3a55] flex items-center justify-center text-[#FFB703] font-bold">${(u.display_name||'?')[0]}</div>
        <span class="absolute -bottom-0.5 -right-0.5 online-dot"></span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold text-white truncate">${esc(u.display_name||'אנונימי')}</div>
        <div class="text-xs text-[#64748b]">${esc(u.city||'לא ידוע')} · ${agoStr}</div>
      </div>
      <span class="badge-yellow text-xs">${(u.rank_score||0).toLocaleString('he')}</span>
    </div>`;
  }).join('');

  startLiveRealtimeLog();
  loadHourlyChart();
}

function startLiveRealtimeLog() {
  if (_liveRealtimeSub) { sb.removeChannel(_liveRealtimeSub); _liveRealtimeSub = null; }
  _liveRealtimeSub = sb.channel('admin-live-log')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles_public' }, payload => {
      const u = payload.new;
      const prevSeen = _liveLastSeen[u.id];
      const now = new Date(u.last_seen);
      const prev = prevSeen ? new Date(prevSeen) : null;
      // detect entry: last_seen changed AND was absent > 5 min (or first time)
      const wasOffline = !prev || (now - prev) > 5 * 60000;
      _liveLastSeen[u.id] = u.last_seen;
      if (wasOffline) {
        pushLiveLogEvent('enter', u.display_name || 'אנונימי', now);
      }
    })
    .subscribe();

  // check exits every 30s: user whose last_seen > 5 min ago = exited
  if (!window._liveExitInterval) {
    window._liveExitInterval = setInterval(() => {
      const threshold = Date.now() - 5 * 60000;
      Object.entries(_liveLastSeen).forEach(([id, ts]) => {
        if (new Date(ts).getTime() < threshold) {
          // find name from grid
          const card = document.querySelector(`[onclick*="${id}"] .text-sm`);
          const name = card ? card.textContent : 'משתמש';
          pushLiveLogEvent('exit', name, new Date(ts));
          delete _liveLastSeen[id];
        }
      });
    }, 30000);
  }
}

function pushLiveLogEvent(type, name, time) {
  const timeStr = time.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  const color = type === 'enter' ? '#10b981' : '#ef4444';
  const arrow = type === 'enter' ? '→' : '←';
  const label = type === 'enter' ? 'כניסה' : 'יציאה';
  const entry = { type, name, time, html: `<div style="color:${color}; border-bottom:1px solid #1e2a42; padding:3px 0;">[${dateStr} ${timeStr}] ${arrow} <span style="color:#e2e8f0;font-weight:bold;">${esc(name)}</span> — <span style="color:${color}">${label}</span></div>` };
  _liveLogEvents.unshift(entry);
  if (_liveLogEvents.length > 200) _liveLogEvents.pop();
  renderLiveLog();
}

function renderLiveLog() {
  const el = document.getElementById('live-event-log');
  const countEl = document.getElementById('live-log-count');
  if (!el) return;
  const empty = document.getElementById('live-log-empty');
  if (empty) empty.remove();
  el.innerHTML = _liveLogEvents.map(e => e.html).join('');
  if (countEl) countEl.textContent = `${_liveLogEvents.length} אירועים`;
}

function clearLiveLog() {
  _liveLogEvents = [];
  const el = document.getElementById('live-event-log');
  if (el) el.innerHTML = '<div class="text-[#4a5568] text-center py-4" id="live-log-empty">ממתין לאירועים...</div>';
  const countEl = document.getElementById('live-log-count');
  if (countEl) countEl.textContent = '0 אירועים';
}

let hourlyChartInstance = null;
async function loadHourlyChart() {
  const from = new Date(Date.now() - 60 * 60000);
  const { data } = await sb.from('profiles_public')
    .select('display_name,last_seen')
    .gte('last_seen', from.toISOString())
    .order('last_seen', { ascending: true });

  const buckets = {};
  for (let i = 0; i < 60; i++) {
    const t = new Date(from.getTime() + i * 60000);
    const key = `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`;
    buckets[key] = { count: 0, names: [] };
  }
  (data || []).forEach(u => {
    const t = new Date(u.last_seen);
    const key = `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`;
    if (buckets[key]) { buckets[key].count++; buckets[key].names.push(u.display_name || 'אנונימי'); }
  });

  const labels = Object.keys(buckets);
  const counts = labels.map(k => buckets[k].count);
  const tooltipNames = labels.map(k => buckets[k].names.join(', ') || '—');

  const ctx = document.getElementById('hourly-chart')?.getContext('2d');
  if (!ctx) return;
  if (hourlyChartInstance) hourlyChartInstance.destroy();
  hourlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'כניסות',
        data: counts,
        backgroundColor: counts.map(c => c > 0 ? 'rgba(255,183,3,0.7)' : 'rgba(45,58,85,0.5)'),
        borderColor: '#FFB703',
        borderWidth: 1,
        borderRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => `${ctx[0].label}`,
            afterLabel: ctx => tooltipNames[ctx.dataIndex] ? `נוכחים: ${tooltipNames[ctx.dataIndex]}` : ''
          }
        }
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 9, family: 'Heebo' }, maxRotation: 90 }, grid: { color: '#1e2a42' } },
        y: { ticks: { color: '#64748b', font: { family: 'Heebo' } }, grid: { color: '#1e2a42' }, beginAtZero: true, stepSize: 1 }
      }
    }
  });
}

async function loadMap() {
  if (!leafletMap) {
    leafletMap = L.map('map', { zoomControl: true }).setView([31.5, 34.8], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB', subdomains: 'abcd', maxZoom: 19
    }).addTo(leafletMap);
  }
  const cityCoords = {
    'ירושלים': [31.768, 35.214], 'תל אביב': [32.066, 34.778], 'בני ברק': [32.082, 34.833],
    'בית שמש': [31.748, 34.988], 'אשדוד': [31.804, 34.65], 'מודיעין עילית': [31.93, 35.04],
    'ביתר עילית': [31.7, 35.12], 'אלעד': [32.05, 34.95], 'רכסים': [32.72, 35.06],
    'חיפה': [32.794, 34.989], 'נתניה': [32.33, 34.86], 'ראשון לציון': [31.964, 34.804],
    'פתח תקווה': [32.08, 34.887], 'אשקלון': [31.67, 34.57], 'רמת גן': [32.068, 34.824],
    'Brooklyn': [40.678, -73.944], 'New York': [40.712, -74.006], 'Lakewood': [40.098, -74.218],
    'Monsey': [41.116, -74.069], 'Antwerp': [51.22, 4.4], 'London': [51.509, -0.118]
  };
  const { data: users } = await sb.from('profiles_public').select('display_name,city').gte('last_seen', new Date(Date.now() - 24*3600000).toISOString());
  if (!users) return;
  const cityCount = {};
  users.forEach(u => { if (u.city) cityCount[u.city] = (cityCount[u.city] || 0) + 1; });
  Object.entries(cityCount).forEach(([city, count]) => {
    const coords = cityCoords[city];
    if (!coords) return;
    const icon = L.divIcon({ className: '', html: `<div style="background:#FFB703;color:#1A233A;border-radius:50%;width:${24+count*4}px;height:${24+count*4}px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;box-shadow:0 0 12px rgba(255,183,3,.6)">${count}</div>`, iconAnchor: [16, 16] });
    L.marker(coords, { icon }).addTo(leafletMap).bindPopup(`<b>${city}</b><br>${count} משתמשים פעילים`);
  });
  logDbQuery('SELECT display_name, city FROM profiles_public WHERE last_seen > NOW() - INTERVAL \'24h\'');
}

function logDbQuery(query) {
  const el = document.getElementById('db-log');
  const time = new Date().toLocaleTimeString('he-IL');
  dbLogLines.unshift(`[${time}] ${query}`);
  if (dbLogLines.length > 50) dbLogLines.pop();
  el.innerHTML = dbLogLines.map(l => `<div class="py-0.5 border-b border-[#1e2a42]">${esc(l)}</div>`).join('');
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

async function loadUsers() {
  const { data, error } = await sb.from('profiles_public')
    .select('id,display_name,email,city,rank_score,reward_points,is_banned,last_seen,user_icon')
    .order('rank_score', { ascending: false });
  if (error) {
    
    if (error.message && error.message.includes('email')) {
      toast('עמודת email חסרה — הרץ את fix_db.sql תחילה!', 'error');
      const { data: fallback } = await sb.from('profiles_public')
        .select('id,display_name,city,rank_score,reward_points,is_banned,last_seen')
        .order('rank_score', { ascending: false });
      allUsers = (fallback || []).map(u => ({ ...u, email: '' }));
    } else {
      toast('שגיאה בטעינת משתמשים: ' + error.message, 'error');
      allUsers = [];
    }
  } else {
    allUsers = data || [];
  }
  filteredUsers = [...allUsers];
  usersCurrentPage = 1;
  renderUsersTable();
}

function filterUsers() {
  const q = document.getElementById('users-search').value.toLowerCase();
  const f = document.getElementById('users-filter').value;
  filteredUsers = allUsers.filter(u => {
    const matchQ = !q || (u.display_name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.city||'').toLowerCase().includes(q);
    const matchF = f === 'all' || (f === 'banned' && u.is_banned) || (f === 'active' && !u.is_banned && u.last_seen && new Date(u.last_seen) > new Date(Date.now() - 7*86400000));
    return matchQ && matchF;
  });
  usersCurrentPage = 1;
  renderUsersTable();
}

function renderUsersTable() {
  const start = (usersCurrentPage - 1) * USERS_PER_PAGE;
  const rows = filteredUsers.slice(start, start + USERS_PER_PAGE);
  document.getElementById('users-count').textContent = `מציג ${start+1}–${Math.min(start+USERS_PER_PAGE, filteredUsers.length)} מתוך ${filteredUsers.length}`;
  document.getElementById('users-page-label').textContent = usersCurrentPage;
  document.getElementById('users-tbody').innerHTML = rows.map(u => {
    const iconDef = u.user_icon ? USER_BADGE_ICONS.find(b => b.id === u.user_icon) : null;
    const iconHtml = iconDef ? `<i class="${iconDef.icon}" style="color:${iconDef.color};" title="${iconDef.label}"></i> ` : '';
    return `
    <tr class="table-row cursor-pointer" onclick="openUserModal('${u.id}')">
      <td class="py-2 px-3 font-medium text-white">${iconHtml}${esc(u.display_name||'אנונימי')} ${u.is_banned ? '<span class="badge-red">חסום</span>' : ''}</td>
      <td class="py-2 px-3 text-[#64748b] text-sm">${esc(u.city||'')}</td>
      <td class="py-2 px-3 text-[#FFB703] font-bold">${(u.rank_score||0).toLocaleString('he')}</td>
      <td class="py-2 px-3 text-blue-400">${(u.reward_points||0).toLocaleString('he')}</td>
      <td class="py-2 px-3">${u.last_seen && new Date(u.last_seen) > new Date(Date.now()-5*60000) ? '<span class="badge-green">מחובר</span>' : '<span class="text-xs text-[#4a5568]">' + (u.last_seen ? relTime(u.last_seen) : 'אף פעם') + '</span>'}</td>
      <td class="py-2 px-3">
        <button onclick="event.stopPropagation();openUserModal('${u.id}')" class="btn-secondary btn-sm ml-1">פרטים</button>
        <button onclick="event.stopPropagation();quickAssignIcon('${u.id}')" class="btn-secondary btn-sm ml-1" title="הענק אייקון">🎖️</button>
        <button onclick="event.stopPropagation();quickBan('${u.id}',${u.is_banned})" class="${u.is_banned?'btn-secondary':'btn-danger'} btn-sm">${u.is_banned?'בטל חסימה':'חסום'}</button>
      </td>
    </tr>`;
  }).join('');
}

function usersPage(dir) {
  const max = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  usersCurrentPage = Math.max(1, Math.min(max, usersCurrentPage + dir));
  renderUsersTable();
}

async function quickBan(uid, isBanned) {
  const { error } = await sb.from('profiles_public').update({ is_banned: !isBanned }).eq('id', uid);
  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
  if (!isBanned) {
    await sb.from('chavruta_connections')
      .update({ status: 'cancelled' })
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .in('status', ['accepted', 'approved', 'pending']);
  } else {
    await sb.from('chavruta_connections')
      .update({ status: 'pending' })
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .eq('status', 'cancelled');
  }
  toast(isBanned ? 'חסימה בוטלה — חיבורים שוחזרו' : 'משתמש נחסם', isBanned ? 'success' : 'warn');
  loadUsers();
}

let modalUser = null;

async function openUserModal(uid) {
  currentUserId = uid;
  const modal = document.getElementById('user-modal');
  modal.classList.remove('hidden');
  const [{ data: pub }, { data: priv }, { data: tag }, { data: goalRows }] = await Promise.all([
    sb.from('profiles_public').select('*').eq('id', uid).maybeSingle(),
    sb.from('profiles_private').select('*').eq('id', uid).maybeSingle(),
    sb.from('user_tags').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('user_goals').select('current_page').eq('user_id', uid)
  ]);
  const computedScore = (goalRows || []).reduce((s, r) => s + (r.current_page || 0), 0);
  if (pub && (!pub.rank_score || pub.rank_score === 0) && computedScore > 0) pub.rank_score = computedScore;
  modalUser = { ...pub, ...priv };
  const displayName = pub?.display_name || (pub?.is_anonymous ? 'אנונימי (ללא שם)' : 'ללא שם');
  document.getElementById('modal-username').textContent = displayName;
  document.getElementById('modal-useremail').textContent = pub?.email || uid;
  document.getElementById('modal-ban-btn').textContent = pub?.is_banned ? '✅ בטל חסימה' : '🚫 חסום משתמש';
  document.getElementById('modal-ban-btn').className = pub?.is_banned ? 'btn-secondary btn-sm' : 'btn-danger btn-sm';
  const tagEl = document.getElementById('modal-usertag');
  tagEl.innerHTML = pub?.is_anonymous ? '<span class="badge-yellow ml-1">אנונימי</span>' : '';
  if (tag) {
    tagEl.innerHTML += `<span class="text-xs font-bold px-2 py-0.5 rounded" style="background:${tag.tag_color};color:#1A233A">${esc(tag.tag_text)}</span>`;
    document.getElementById('modal-tag-text').value = tag.tag_text;
    document.getElementById('modal-tag-color').value = tag.tag_color;
  }
  const secQ = priv?.recovery_question || pub?.security_questions?.[0]?.question || '';
  const secA = priv?.recovery_answer || pub?.security_questions?.[0]?.answer || '';
  document.getElementById('modal-security-q').textContent = secQ ? `שאלה: ${secQ}\nתשובה: ${secA}` : 'אין שאלת אימות';
  renderModalFields(pub, priv);
  renderModalIconSection(pub?.user_icon || null);
  renderModalAvatarSection(pub?.avatar_url || null);
  loadBroadcastPermission(uid);
  userTab('info');
}

function renderModalAvatarSection(avatarUrl) {
  const wrap = document.getElementById('modal-avatar-img-wrap');
  const status = document.getElementById('modal-avatar-status');
  if (!wrap || !status) return;
  if (avatarUrl) {
    wrap.innerHTML = `<img src="${esc(avatarUrl)}" style="width:100%;height:100%;object-fit:contain;object-position:top;" onerror="this.parentElement.innerHTML='<i class=&quot;fas fa-user text-[#64748b] text-xl&quot;></i>'">`;
    status.textContent = 'יש תמונה פעילה';
    status.className = 'text-xs text-green-400';
  } else {
    wrap.innerHTML = '<i class="fas fa-user text-[#64748b] text-xl"></i>';
    status.textContent = 'אין תמונה';
    status.className = 'text-xs text-[#64748b]';
  }
  const bigPreview = document.getElementById('modal-avatar-big-preview');
  if (bigPreview) {
    if (avatarUrl) {
      bigPreview.style.display = 'block';
      bigPreview.querySelector('img').src = avatarUrl;
    } else {
      bigPreview.style.display = 'none';
    }
  }
}

function previewAdminAvatarUrl(url) {
  const bigPreview = document.getElementById('modal-avatar-big-preview');
  if (!bigPreview) return;
  if (url && url.startsWith('http')) {
    bigPreview.style.display = 'block';
    const img = bigPreview.querySelector('img');
    img.src = url;
    img.onerror = () => { bigPreview.style.display = 'none'; };
  } else {
    bigPreview.style.display = 'none';
  }
}

async function removeUserAvatar() {
  if (!currentUserId) return;
  if (!confirm('להסיר את תמונת הפרופיל של המשתמש?')) return;
  const { error } = await sb.from('profiles_public').update({ avatar_url: null }).eq('id', currentUserId);
  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
  renderModalAvatarSection(null);
  toast('תמונה הוסרה ✓', 'success');
}

async function setUserAvatar(url) {
  if (!currentUserId || !url) { toast('יש להזין כתובת URL', 'warn'); return; }
  const { error } = await sb.from('profiles_public').update({ avatar_url: url }).eq('id', currentUserId);
  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
  renderModalAvatarSection(url);
  document.getElementById('modal-avatar-url').value = '';
  toast('תמונה עודכנה ✓', 'success');
}

function renderModalIconSection(currentIconId) {
  const currentEl = document.getElementById('modal-icon-current');
  const gridEl = document.getElementById('modal-icon-grid');
  if (!currentEl || !gridEl) return;
  const cur = currentIconId ? USER_BADGE_ICONS.find(b => b.id === currentIconId) : null;
  currentEl.innerHTML = cur
    ? `אייקון נוכחי: <i class="${cur.icon}" style="color:${cur.color}; font-size:1.1em;"></i> <strong style="color:#fff">${cur.label}</strong>`
    : 'אין אייקון';
  gridEl.innerHTML = USER_BADGE_ICONS.map(b => `
    <button onclick="assignUserIcon('${b.id}')"
      title="${b.label}"
      class="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${currentIconId === b.id ? 'ring-2 ring-[#FFB703]' : ''}"
      style="background:${b.color}20; border:1px solid ${b.color}40;">
      <i class="${b.icon}" style="color:${b.color}; font-size:1.1em;"></i>
    </button>`).join('');
}

async function assignUserIcon(iconId) {
  if (!currentUserId) return;
  const { error } = await sb.from('profiles_public').update({ user_icon: iconId }).eq('id', currentUserId);
  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
  const u = allUsers.find(u => u.id === currentUserId);
  if (u) u.user_icon = iconId;
  renderModalIconSection(iconId);
  toast('אייקון הוענק ✓', 'success');
}

function quickAssignIcon(uid) {
  const existing = document.getElementById('quick-icon-popup');
  if (existing) existing.remove();
  const popup = document.createElement('div');
  popup.id = 'quick-icon-popup';
  popup.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:2000;display:flex;align-items:center;justify-content:center;';
  popup.innerHTML = `
    <div style="background:#1A233A;border:1px solid #2d3a55;border-radius:16px;padding:24px;width:340px;max-width:95vw;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="font-weight:700;color:#fff;font-size:1rem;">🎖️ בחר אייקון</span>
        <button onclick="document.getElementById('quick-icon-popup').remove()" style="color:#64748b;background:none;border:none;cursor:pointer;font-size:1.2rem;">✕</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        ${USER_BADGE_ICONS.map(b => `
          <button onclick="quickSaveIcon('${uid}','${b.id}');document.getElementById('quick-icon-popup').remove()"
            title="${b.label}"
            style="width:44px;height:44px;border-radius:10px;background:${b.color}20;border:1px solid ${b.color}60;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2em;transition:transform .15s"
            onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
            <i class="${b.icon}" style="color:${b.color};"></i>
          </button>`).join('')}
      </div>
      <button onclick="quickSaveIcon('${uid}',null);document.getElementById('quick-icon-popup').remove()" style="background:#0F1623;border:1px solid #2d3a55;color:#94a3b8;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:.85rem;">הסר אייקון</button>
    </div>`;
  popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
  document.body.appendChild(popup);
}

async function quickSaveIcon(uid, iconId) {
  const { error } = await sb.from('profiles_public').update({ user_icon: iconId }).eq('id', uid);
  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
  const u = allUsers.find(u => u.id === uid);
  if (u) u.user_icon = iconId;
  renderUsersTable();
  toast(iconId ? 'אייקון הוענק ✓' : 'אייקון הוסר', iconId ? 'success' : 'success');
}

async function removeUserIcon() {
  if (!currentUserId) return;
  const { error } = await sb.from('profiles_public').update({ user_icon: null }).eq('id', currentUserId);
  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
  const u = allUsers.find(u => u.id === currentUserId);
  if (u) u.user_icon = null;
  renderModalIconSection(null);
  toast('אייקון הוסר', 'success');
}

function renderModalFields(pub, priv) {
  const fields = [
    { label: 'שם תצוגה', key: 'display_name', val: pub?.display_name, table: 'profiles_public' },
    { label: 'אימייל', key: 'email', val: pub?.email, table: 'profiles_public' },
    { label: 'עיר', key: 'city', val: pub?.city, table: 'profiles_public' },
    { label: 'ניקוד (rank_score)', key: 'rank_score', val: pub?.rank_score, type: 'number', table: 'profiles_public' },
    { label: 'זוזים (reward_points)', key: 'reward_points', val: pub?.reward_points, type: 'number', table: 'profiles_public' },
    { label: 'מנוי (0=חינם, 1=בסיסי, 2=פרו)', key: 'subscription_tier', val: pub?.subscription_tier, type: 'number', table: 'profiles_public' },
    { label: 'טלפון', key: 'phone', val: priv?.phone, table: 'profiles_private' },
    { label: 'גיל', key: 'age', val: priv?.age, type: 'number', table: 'profiles_private' },
    { label: 'כתובת', key: 'full_address', val: priv?.full_address, table: 'profiles_private' },
  ];
  document.getElementById('modal-fields').innerHTML = fields.map(f => `
    <div>
      <label class="text-xs text-[#64748b] block mb-1">${f.label}</label>
      <input data-key="${f.key}" data-table="${f.table}" data-type="${f.type||'text'}" type="${f.type||'text'}" value="${esc(f.val??'')}" class="input-field text-sm">
    </div>`).join('');
}

function userTab(tab, btn) {
  ['info','chat','learning','notes','msg'].forEach(t => {
    document.getElementById('user-tab-' + t).classList.toggle('hidden', t !== tab);
  });
  document.querySelectorAll('#user-modal .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelectorAll('#user-modal .tab-btn').forEach(b => {
    if (b.getAttribute('onclick')?.includes("'" + tab + "'")) b.classList.add('active');
  });
  if (tab === 'chat') loadUserChats();
  if (tab === 'learning') loadUserLearning();
  if (tab === 'notes') loadUserNotes();
}

async function loadUserChats() {
  const [{ data: adminChats }, { data: privateConns }] = await Promise.all([
    sb.from('chat_admin').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(30),
    sb.from('chavruta_connections').select('id,sender_id,receiver_id').or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`).eq('status', 'accepted')
  ]);
  document.getElementById('modal-admin-chats').innerHTML = (adminChats||[]).length ? adminChats.map(m => {
    const rawContent = m.message || m.content || '';
    const isDeleted = rawContent.startsWith('__DELETED__:');
    const displayContent = isDeleted
      ? rawContent.slice('__DELETED__:'.length)
      : rawContent;
    const deletedBadge = isDeleted
      ? '<span style="background:#fee2e2;color:#ef4444;font-size:0.7rem;padding:1px 6px;border-radius:4px;font-weight:bold;margin-left:4px;">נמחק ע"י משתמש</span>'
      : '';
    const msgId = m.id;
    const msgSender = m.user_id === currentUserId ? 'משתמש' : 'ניהול';
    return `
    <div class="${m.user_id === currentUserId ? 'chat-bubble-user' : 'chat-bubble-admin'}" style="position:relative;">
      <div class="text-xs text-[#64748b] mb-1">${msgSender} · ${relTime(m.created_at)} ${deletedBadge}</div>
      <div style="word-break:break-word;">${esc(displayContent)}</div>
      <div style="margin-top:4px; text-align:left;">
        <button onclick="adminQuoteMsg('${esc(displayContent).replace(/'/g,"\\'").replace(/\n/g,' ')}','${msgSender}')"
          style="font-size:0.7rem; padding:2px 8px; background:#334155; color:#94a3b8; border:none; border-radius:4px; cursor:pointer;">
          ציטוט
        </button>
      </div>
    </div>`;
  }).join('') : '<div class="text-xs text-[#4a5568] text-center py-4">אין צ\'אטים עם הניהול</div>';
  document.getElementById('modal-private-chats').textContent = `${privateConns?.length || 0} חברותות מחוברות`;
}

async function loadUserLearning() {
  const { data: rawData } = await sb.from('user_goals').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false });
  const data = (rawData || []).sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return 0;
  });
  document.getElementById('modal-learning').innerHTML = data.length ? data.map(g => {
    const currentP = g.current_unit ?? g.current_page ?? g.current_chapter ?? 0;
    const totalP = g.total_pages ?? g.total_units ?? g.total_chapters ?? '?';
    const pct = totalP && totalP !== '?' ? Math.round((currentP / totalP) * 100) : 0;
    const statusLabel = g.status === 'completed' ? 'הושלם' : g.status === 'active' ? 'פעיל' : g.status || '';
    return `
    <div class="card-dark flex items-center justify-between">
      <div>
        <div class="text-sm font-medium text-white">${esc(g.book_name||g.masechta||'')}</div>
        <div class="text-xs text-[#64748b]">${currentP} / ${totalP}${totalP !== '?' ? ` (${pct}%)` : ''}</div>
      </div>
      <span class="badge-${g.status==='completed'?'green':g.status==='active'?'yellow':'blue'}">${statusLabel}</span>
    </div>`;
  }).join('') : '<div class="text-sm text-[#64748b] text-center py-4">אין מסכתות</div>';
}

async function loadUserNotes() {
  const { data } = await sb.from('notes').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false });
  document.getElementById('modal-notes').innerHTML = (data||[]).length ? data.map(n => `
    <div class="card-dark"><div class="text-xs text-[#64748b] mb-1">${relTime(n.created_at)}</div><div class="text-sm text-[#94a3b8]">${esc(n.content||'')}</div></div>`).join('') : '<div class="text-sm text-[#64748b] text-center py-4">אין פתקים</div>';
}

async function saveUserEdits() {
  const inputs = document.querySelectorAll('#modal-fields input[data-key]');
  const pubUpdates = {}, privUpdates = {};
  inputs.forEach(i => {
    const t = i.dataset.type === 'number' ? Number(i.value) : i.value;
    if (i.dataset.table === 'profiles_public') pubUpdates[i.dataset.key] = t || i.value;
    else privUpdates[i.dataset.key] = t || i.value;
  });
  const ops = [];
  if (Object.keys(pubUpdates).length) ops.push(sb.from('profiles_public').update(pubUpdates).eq('id', currentUserId));
  if (Object.keys(privUpdates).length) ops.push(sb.from('profiles_private').update(privUpdates).eq('id', currentUserId));
  const results = await Promise.all(ops);
  const err = results.find(r => r.error);
  if (err) toast('שגיאה: ' + err.error.message, 'error');
  else { toast('שינויים נשמרו'); loadUsers(); }
}

function adminQuoteMsg(content, sender) {
  const msgInput = document.getElementById('msg-body');
  if (!msgInput) { alert('לא ניתן לצטט כאן'); return; }
  navigate('messages');
  setTimeout(() => {
    const msgInput2 = document.getElementById('msg-body');
    if (msgInput2) msgInput2.value = `> ${sender}: ${content}\n\n`;
  }, 200);
}

async function toggleChatClosed(bookName) {
  const { data: existing } = await sb.from('system_announcements')
    .select('id').eq('target_type', 'chat_closed').eq('content', bookName).maybeSingle();
  if (existing) {
    const { error } = await sb.from('system_announcements').delete().eq('id', existing.id);
    if (!error) toast(`צ'אט "${bookName}" נפתח`, 'success');
    else toast('שגיאה: ' + error.message, 'error');
  } else {
    const { error } = await sb.from('system_announcements').insert({
      title: `סגירת צ'אט: ${bookName}`,
      content: bookName,
      target_type: 'chat_closed',
      created_at: new Date().toISOString()
    });
    if (!error) toast(`צ'אט "${bookName}" נסגר`, 'warn');
    else toast('שגיאה (יש להריץ migrations.sql): ' + error.message, 'error');
  }
  loadChatControlPanel();
}

async function toggleChatHidden(bookName) {
  const { data: existing } = await sb.from('system_announcements')
    .select('id').eq('target_type', 'chat_hidden').eq('content', bookName).maybeSingle();
  if (existing) {
    const { error } = await sb.from('system_announcements').delete().eq('id', existing.id);
    if (!error) toast(`הודעות צ'אט "${bookName}" מוצגות שוב`, 'success');
    else toast('שגיאה: ' + error.message, 'error');
  } else {
    const { error } = await sb.from('system_announcements').insert({
      title: `הסתרת הודעות: ${bookName}`,
      content: bookName,
      target_type: 'chat_hidden',
      created_at: new Date().toISOString()
    });
    if (!error) toast(`הודעות צ'אט "${bookName}" הוסתרו`, 'warn');
    else toast('שגיאה (יש להריץ migrations.sql): ' + error.message, 'error');
  }
  loadChatControlPanel();
}

async function loadChatControlPanel() {
  const el = document.getElementById('chat-control-list');
  if (!el) return;
  const [{ data: closedChats }, { data: hiddenChats }] = await Promise.all([
    sb.from('system_announcements').select('content').eq('target_type', 'chat_closed'),
    sb.from('system_announcements').select('content').eq('target_type', 'chat_hidden')
  ]);
  const closedSet = new Set((closedChats || []).map(r => r.content));
  const hiddenSet = new Set((hiddenChats || []).map(r => r.content));
  
  const { data: activeBooks } = await sb.from('user_goals').select('book_name').eq('status', 'active');
  const bookSet = new Set((activeBooks || []).map(r => r.book_name));
  if (bookSet.size === 0) { el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">אין צ\'אטים פעילים</div>'; return; }
  el.innerHTML = [...bookSet].map(book => `
    <div class="card-dark flex items-center justify-between gap-2">
      <div class="text-sm font-medium text-white">${esc(book)}</div>
      <div class="flex gap-2">
        <button onclick="toggleChatClosed('${esc(book)}')" class="${closedSet.has(book) ? 'btn-primary' : 'btn-danger'} btn-sm">
          ${closedSet.has(book) ? '✅ פתח צ\'אט' : '🔒 סגור צ\'אט'}
        </button>
        <button onclick="toggleChatHidden('${esc(book)}')" class="${hiddenSet.has(book) ? 'btn-primary' : 'btn-secondary'} btn-sm">
          ${hiddenSet.has(book) ? '👁 הצג הודעות' : '🙈 הסתר הודעות'}
        </button>
      </div>
    </div>`).join('');
}

async function toggleBan() {
  const isBanned = modalUser?.is_banned;
  const { error } = await sb.from('profiles_public').update({ is_banned: !isBanned }).eq('id', currentUserId);
  if (error) { toast('שגיאה', 'error'); return; }
  if (!isBanned) {
    
    await sb.from('chavruta_connections')
      .update({ status: 'cancelled' })
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .in('status', ['accepted', 'approved', 'pending']);
  } else {
    
    await sb.from('chavruta_connections')
      .update({ status: 'pending' })
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .eq('status', 'cancelled');
  }
  toast(isBanned ? 'חסימה בוטלה — חיבורים שוחזרו' : 'משתמש נחסם', isBanned ? 'success' : 'warn');
  modalUser.is_banned = !isBanned;
  document.getElementById('modal-ban-btn').textContent = modalUser.is_banned ? '✅ בטל חסימה' : '🚫 חסום משתמש';
  document.getElementById('modal-ban-btn').className = modalUser.is_banned ? 'btn-secondary btn-sm' : 'btn-danger btn-sm';
}

async function saveUserTag() {
  const text = document.getElementById('modal-tag-text').value.trim();
  const color = document.getElementById('modal-tag-color').value;
  if (!text) { toast('הכנס טקסט לתגית', 'warn'); return; }
  const { error } = await sb.from('user_tags').upsert({ user_id: currentUserId, tag_text: text, tag_color: color }, { onConflict: 'user_id' });
  if (!error) { toast('תגית נשמרה'); document.getElementById('modal-usertag').innerHTML = `<span class="text-xs font-bold px-2 py-0.5 rounded" style="background:${color};color:#1A233A">${esc(text)}</span>`; }
  else toast('שגיאה', 'error');
}

async function removeUserTag() {
  const { error } = await sb.from('user_tags').delete().eq('user_id', currentUserId);
  if (!error) { toast('תגית הוסרה'); document.getElementById('modal-usertag').innerHTML = ''; }
}

// ===== הרשאת שידור חי (can_broadcast) =====
async function loadBroadcastPermission(uid) {
  const el = document.getElementById('modal-broadcast-btn');
  if (!el) return;
  const { data } = await sb.from('user_tags').select('tag_permissions').eq('user_id', uid).maybeSingle();
  const perms = (typeof data?.tag_permissions === 'string')
    ? JSON.parse(data.tag_permissions || '{}')
    : (data?.tag_permissions || {});
  const has = perms.can_broadcast === true;
  el.textContent = has ? '📡 בטל הרשאת שידור' : '📡 הענק הרשאת שידור';
  el.className   = has ? 'btn-danger btn-sm' : 'btn-primary btn-sm';
  el.dataset.broadcastEnabled = has ? '1' : '0';
}

async function toggleBroadcastPermission() {
  if (!currentUserId) return;
  const btn = document.getElementById('modal-broadcast-btn');
  const currentlyEnabled = btn?.dataset.broadcastEnabled === '1';

  // קרא tag_permissions הקיים
  const { data: tagRow } = await sb.from('user_tags').select('tag_permissions, tag_text, tag_color').eq('user_id', currentUserId).maybeSingle();
  const existingPerms = (typeof tagRow?.tag_permissions === 'string')
    ? JSON.parse(tagRow.tag_permissions || '{}')
    : (tagRow?.tag_permissions || {});

  const newPerms = { ...existingPerms, can_broadcast: !currentlyEnabled };

  const { error } = await sb.from('user_tags').upsert(
    { user_id: currentUserId, tag_permissions: newPerms, tag_text: tagRow?.tag_text || '', tag_color: tagRow?.tag_color || '#FFB703' },
    { onConflict: 'user_id' }
  );
  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
  toast(!currentlyEnabled ? '✅ הרשאת שידור הוענקה' : '🚫 הרשאת שידור בוטלה', !currentlyEnabled ? 'success' : 'warn');
  loadBroadcastPermission(currentUserId);
}

async function insertNotification(userId, title, body) {
  const base = { user_id: userId, title, content: body, created_at: new Date().toISOString(), is_read: false };
  for (const type of ['message', 'system', 'info', 'admin', null]) {
    const row = type !== null ? { ...base, type } : { ...base };
    const result = await sb.from('notifications').insert(row);
    if (!result.error || !result.error.message?.includes('check constraint')) return result;
  }
  return await sb.from('notifications').insert(base);
}

async function sendAdminMsg() {
  const content = document.getElementById('modal-admin-reply').value.trim();
  if (!content) return;
  const { error } = await sb.from('chat_admin').insert({ user_id: currentUserId, content: content, created_at: new Date().toISOString() });
  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
  document.getElementById('modal-admin-reply').value = '';
  loadUserChats();
  toast('הודעה נשלחה');
}

async function sendUserMsg() {
  const title = document.getElementById('modal-msg-title').value.trim();
  const body = document.getElementById('modal-msg-body').value.trim();
  if (!body) return;
  const { error } = await insertNotification(currentUserId, title, body);
  if (!error) { toast('הודעה נשלחה'); document.getElementById('modal-msg-body').value = ''; document.getElementById('modal-msg-title').value = ''; }
  else toast('שגיאה: ' + error.message, 'error');
}

function closeUserModal() {
  document.getElementById('user-modal').classList.add('hidden');
  currentUserId = null; modalUser = null;
}

async function loadBlocked() {
  const { data } = await sb.from('profiles_public').select('id,display_name,city,email,last_seen').eq('is_banned', true);
  const el = document.getElementById('blocked-list');
  if (!data?.length) { el.innerHTML = '<div class="text-[#64748b] text-center py-8">אין משתמשים חסומים</div>'; return; }
  el.innerHTML = data.map(u => `
    <div class="card-dark flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-[#2d3a55] flex items-center justify-center text-red-400 font-bold">${(u.display_name||'?')[0]}</div>
        <div>
          <div class="text-sm font-medium text-white">${esc(u.display_name||'אנונימי')}</div>
          <div class="text-xs text-[#64748b]">${esc(u.city||'')} · ${esc(u.email||'')}</div>
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick="openUserModal('${u.id}')" class="btn-secondary btn-sm">צ'אט</button>
        <button onclick="quickBan('${u.id}',true)" class="btn-primary btn-sm">בטל חסימה</button>
      </div>
    </div>`).join('');
}

async function loadReports() {
  const { data } = await sb.from('user_reports').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('reports-list');
  if (!data?.length) { el.innerHTML = '<div class="text-[#64748b] text-center py-8">אין דיווחים</div>'; return; }
  el.innerHTML = data.map(r => `
    <div class="card-dark space-y-2">
      <div class="flex items-center justify-between">
        <span class="badge-${r.status==='pending'?'red':r.status==='reviewed'?'yellow':'blue'}">${r.status}</span>
        <span class="text-xs text-[#64748b]">${relTime(r.created_at)}</span>
      </div>
      <div class="text-sm text-[#94a3b8]"><b class="text-white">סיבה:</b> ${esc(r.reason||'לא צוין')}</div>
      <div class="flex gap-2">
        ${r.reported_user_id ? `<button onclick="openUserModal('${r.reported_user_id}')" class="btn-secondary btn-sm">צפה במשתמש המדווח</button>` : ''}
        <button onclick="updateReportStatus('${r.id}','reviewed')" class="btn-secondary btn-sm">סמן כנסקר</button>
        <button onclick="updateReportStatus('${r.id}','dismissed')" class="btn-secondary btn-sm">בטל</button>
      </div>
    </div>`).join('');
}

async function updateReportStatus(id, status) {
  await sb.from('user_reports').update({ status }).eq('id', id);
  toast('סטטוס עודכן'); loadReports();
}

async function loadMessages() {
  const { data } = await sb.from('system_announcements').select('*').neq('target_type', 'maintenance').neq('target_type','chat_closed').neq('target_type','chat_hidden').order('created_at', { ascending: false }).limit(30);
  const el = document.getElementById('msg-history');
  if (!data?.length) { el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">אין היסטוריה</div>'; return; }
  
  const ids = data.map(m => m.id);
  const { data: views } = await sb.from('announcement_views').select('announcement_id').in('announcement_id', ids);
  const seenMap = {};
  (views || []).forEach(v => { seenMap[v.announcement_id] = (seenMap[v.announcement_id] || 0) + 1; });
  el.innerHTML = data.map(m => {
    const isPopup = (m.target_type === 'all' || !m.target_type);
    const seenCount = seenMap[m.id] || 0;
    return `
    <div class="card-dark flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-white">${esc(m.title||'(ללא כותרת)')}</div>
        <div class="text-xs text-[#64748b] mt-0.5 truncate">${esc(m.content||'')} · <span class="badge-blue">${m.target_type||'all'}</span></div>
        <div class="text-xs text-[#4a5568] mt-1 flex items-center gap-3">
          <span>${relTime(m.created_at)}</span>
          ${isPopup ? `<span class="text-amber-400"><i class="fas fa-eye ml-1"></i>${seenCount} אישרו</span>` : ''}
        </div>
      </div>
      <div class="flex flex-col gap-1 shrink-0">
        ${isPopup ? `<button onclick="deleteAnnouncement('${m.id}')" class="btn-danger btn-sm text-xs"><i class="fas fa-trash ml-1"></i>מחק</button>` : ''}
      </div>
    </div>`; }).join('');
}

async function deleteAnnouncement(id) {
  if (!confirm('למחוק הודעה זו? משתמשים שטרם ראו אותה לא יראו אותה יותר.')) return;
  const { error } = await sb.from('system_announcements').delete().eq('id', id);
  if (!error) { toast('הודעה נמחקה ✓', 'success'); loadMessages(); }
  else toast('שגיאה: ' + error.message, 'error');
}

function setMsgType(type, btn) {
  msgType = type;
  document.querySelectorAll('#page-messages .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function updateMsgTargetUI() {
  const v = document.getElementById('msg-target').value;
  document.getElementById('msg-book-wrap').classList.toggle('hidden', v !== 'learners');
  document.getElementById('msg-user-wrap').classList.toggle('hidden', v !== 'user');
}

function previewMsg() {
  document.getElementById('msg-preview').classList.remove('hidden');
  document.getElementById('preview-title').textContent = document.getElementById('msg-title').value;
  document.getElementById('preview-body').textContent = document.getElementById('msg-body').value;
  const btnText = document.getElementById('msg-btn-text').value;
  const btnEl = document.getElementById('preview-action-btn');
  btnEl.textContent = btnText; btnEl.classList.toggle('hidden', !btnText);
}

async function sendMsg() {
  const title = document.getElementById('msg-title').value.trim();
  const body = document.getElementById('msg-body').value.trim();
  if (!body) { toast('יש למלא תוכן הודעה', 'warn'); return; }
  const target = document.getElementById('msg-target').value;
  const ctaText = document.getElementById('msg-btn-text').value.trim();
  const ctaUrl = document.getElementById('msg-btn-url').value.trim();

  const row = {
    title,
    content: body,
    target_type: target === 'user' ? 'specific_user' : target,
    delivery_type: msgType,
    cta_text: ctaText || null,
    cta_url: ctaUrl || null,
    created_at: new Date().toISOString()
  };

  if (target === 'learners') row.filter_book = document.getElementById('msg-book').value;

  
  if (msgType === 'email') {
    const subject = title || 'הודעה מבית המדרש';
    const safeBody = body.replace(/\n/g, '<br>');
    const ctaSafeUrl = ctaUrl ? ctaUrl.replace(/"/g, '%22') : '';
    const html = `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
        <div style="text-align:center;padding:12px 0;border-bottom:2px solid #f59e0b;margin-bottom:20px;">
          <h2 style="color:#1e3a5f;margin:0;font-size:1.4rem;">📖 בית המדרש</h2>
        </div>
        ${title ? `<h3 style="color:#1e293b;margin-top:0;">${title}</h3>` : ''}
        <div style="color:#334155;line-height:1.8;">${safeBody}</div>
        ${ctaText && ctaUrl ? `<div style="text-align:center;margin-top:24px;"><a href="${ctaSafeUrl}" style="display:inline-block;background:#f59e0b;color:#1e293b;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">${ctaText}</a></div>` : ''}
        <hr style="margin:24px 0;border-color:#e2e8f0;">
        <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">בית המדרש</p>
      </div>`;

    const userEmailVal = target === 'user' ? document.getElementById('msg-user-email').value.trim() : null;
    if (target === 'user' && !userEmailVal) { toast('יש להזין אימייל משתמש', 'warn'); return; }

    toast('שולח מיילים...', 'info');
    try {
      const { data: fnData, error: fnErr } = await sb.functions.invoke('send-mass-email', {
        body: {
          target,
          userEmail: userEmailVal,
          filterBook: target === 'learners' ? document.getElementById('msg-book').value : null,
          subject,
          html
        }
      });
      if (fnErr) throw new Error(fnErr.message);
      toast(`המייל נשלח ל-${fnData?.sent ?? 0} נמענים ✓`, 'success');
    } catch (e) {
      toast('שגיאה בשליחת מייל: ' + e.message, 'error');
    }
    loadMessages();
    return;
  }

  if (target === 'user') {
    const email = document.getElementById('msg-user-email').value.trim();
    const { data: user } = await sb.from('profiles_public').select('id').eq('email', email).maybeSingle();
    if (!user) { toast('משתמש לא נמצא', 'error'); return; }

    row.user_id = user.id;

    
    if (msgType === 'admin') {
      const chatContent = ctaText && ctaUrl
        ? `${body}\n<a href="${ctaUrl}" target="_blank" rel="noopener" class="inline-block mt-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600">${ctaText}</a>`
        : body;
      await sb.from('chat_admin').insert({ user_id: user.id, sender_email: 'admin@system', content: chatContent });
      toast('הודעת צ\'אט נשלחה למשתמש');
    } else {
      const { error: notifErr } = await insertNotification(user.id, title, body);
      if (!notifErr) toast('הודעה נשלחה למשתמש'); else toast('שגיאה: ' + notifErr.message, 'error');
    }
    
    await sb.from('system_announcements').insert(row).then(r => {
      if (r.error) { const s = {}; for (const k of ['cta_text','cta_url','delivery_type','filter_book']) { delete row[k]; } sb.from('system_announcements').insert(row); }
    });
  } else {
    
    if (msgType === 'admin') {
      
      
      const { error } = await sb.from('system_announcements').insert(row);
      if (!error) toast('הודעת צ\'אט שוגרה לכל המשתמשים');
      else {
        
        const { title: t, content: c, target_type: tt, created_at: ca } = row;
        const { error: e2 } = await sb.from('system_announcements').insert({ title: t, content: c, target_type: tt, created_at: ca });
        if (!e2) toast('הודעה שוגרה (ללא CTA)'); else toast('שגיאה: ' + e2.message, 'error');
      }
    } else {
      const { error } = await sb.from('system_announcements').insert(row);
      if (!error) toast(`הודעה שוגרה (${msgType})`);
      else {
        const { title: t, content: c, target_type: tt, created_at: ca } = row;
        const { error: e2 } = await sb.from('system_announcements').insert({ title: t, content: c, target_type: tt, created_at: ca });
        if (!e2) toast('הודעה שוגרה (ללא CTA)'); else toast('שגיאה: ' + e2.message, 'error');
      }
    }
  }
  loadMessages();
}

async function loadSuggestions() {
  const { data } = await sb.from('suggestions')
    .select('*')
    .order('created_at', { ascending: false });
  const el = document.getElementById('suggestions-list');
  if (!data?.length) { el.innerHTML = '<div class="text-[#64748b] text-center py-8">אין הצעות עדיין</div>'; return; }
  el.innerHTML = data.map(s => {
    const authorName = s.user_email?.split('@')[0] || s.user_name || 'לא ידוע';
    const authorEmail = s.user_email || '';
    return `
    <div class="card-dark space-y-2">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-sm font-medium text-white">${esc(authorName)}${authorEmail ? ` <span class="text-xs text-[#64748b]">(${esc(authorEmail)})</span>` : ''}</div>
          <div class="text-xs text-[#64748b]">${relTime(s.created_at)}</div>
        </div>
        <span class="badge-${s.status==='new'?'yellow':s.status==='done'?'green':s.status==='rejected'?'red':'blue'}">${s.status}</span>
      </div>
      <div class="text-sm text-[#94a3b8]">${esc(s.content)}</div>
      <div class="flex gap-2">
        <button onclick="updateSuggestion('${s.id}','reviewed')" class="btn-secondary btn-sm">סמן כנסקר</button>
        <button onclick="updateSuggestion('${s.id}','done')" class="btn-primary btn-sm">בוצע ✓</button>
        <button onclick="updateSuggestion('${s.id}','rejected')" class="btn-danger btn-sm">דחה</button>
      </div>
    </div>`;
  }).join('');
}

async function updateSuggestion(id, status) {
  await sb.from('suggestions').update({ status }).eq('id', id);
  toast('עודכן'); loadSuggestions();
}

async function loadParnas() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('parnas-day-date').value = today;
  document.getElementById('parnas-month-start').value = today;
  const { data, error } = await sb.from('parnas_log').select('*').order('created_at', { ascending: false }).limit(20);
  const el = document.getElementById('parnas-history');
  if (error) { el.innerHTML = `<div class="text-xs text-red-400 text-center py-4">שגיאה: ${esc(error.message)}</div>`; return; }
  if (!data?.length) { el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">אין היסטוריה</div>'; return; }
  el.innerHTML = data.map(p => {
    const dedLabel = p.dedication_type || 'לזכות';
    return `
    <div class="card-dark flex items-center justify-between">
      <div>
        <span class="badge-${p.type==='day'?'yellow':'blue'} ml-2">${p.type==='day'?'יום':'חודש'}</span>
        <span class="text-sm font-medium text-white">${esc(p.sponsor_name)}</span>
        ${p.dedicated_to ? `<div class="text-xs text-[#64748b] mt-1">${esc(dedLabel)}: ${esc(p.dedicated_to)}</div>` : ''}
        <div class="text-xs text-[#4a5568]">${p.start_date || ''}${p.end_date && p.end_date !== p.start_date ? ' — ' + p.end_date : ''}</div>
      </div>
      <button onclick="deleteParnas('${p.id}')" class="btn-danger btn-sm text-xs">מחק</button>
    </div>`;
  }).join('');
}

async function deleteParnas(id) {
  if (!confirm('למחוק רשומת פרנס זו?')) return;
  const { error } = await sb.from('parnas_log').delete().eq('id', id);
  if (!error) { toast('נמחק'); loadParnas(); }
  else toast('שגיאה: ' + error.message, 'error');
}

async function saveParnas(type) {
  const name = document.getElementById(`parnas-${type}-name`).value.trim();
  const dedicated = document.getElementById(`parnas-${type}-dedicated`).value.trim();
  const dedicationType = document.getElementById(`parnas-${type}-dedication-type`)?.value || 'לזכות';
  const start = type === 'day'
    ? document.getElementById('parnas-day-date').value
    : document.getElementById('parnas-month-start').value;
  const end = type === 'month' ? document.getElementById('parnas-month-end').value : null;
  if (!name) { toast('יש למלא שם מפרנס', 'warn'); return; }
  const payload = {
    type,
    sponsor_name: name,
    dedicated_to: dedicated || null,
    dedication_type: dedicated ? dedicationType : null,
    start_date: start,
    end_date: end || null,
    created_by: currentAdmin.id
  };
  const { error } = await sb.from('parnas_log').insert(payload);
  if (!error) {
    toast('פרנס נשמר ✓');
    document.getElementById(`parnas-${type}-name`).value = '';
    document.getElementById(`parnas-${type}-dedicated`).value = '';
    loadParnas();
  } else toast('שגיאה: ' + error.message, 'error');
}

async function loadShop() {
  const { data } = await sb.from('shop_items').select('*').order('created_at', { ascending: false });
  const grid = document.getElementById('shop-grid');
  if (!data?.length) { grid.innerHTML = '<div class="text-[#64748b] col-span-3 text-center py-10">אין מוצרים עדיין. לחץ "+ מוצר חדש"</div>'; return; }
  loadShopOrders();
  grid.innerHTML = data.map(item => `
    <div class="card space-y-3">
      <div class="relative">
        ${item.image_url ? `<img src="${esc(item.image_url)}" class="w-full h-36 object-cover rounded-lg">` : '<div class="w-full h-36 bg-[#0F1623] rounded-lg flex items-center justify-center text-[#4a5568]"><i class="fas fa-image text-3xl"></i></div>'}
        ${!item.is_active ? '<div class="absolute top-2 right-2 badge-red">לא פעיל</div>' : ''}
      </div>
      <div class="font-bold text-white">${esc(item.title)}</div>
      <div class="text-sm text-[#64748b]">${esc(item.description||'')}</div>
      <div class="flex items-center justify-between">
        <span class="text-[#FFB703] font-bold">${item.price_zuzim} זוזים</span>
        <span class="badge-blue">${item.item_type||'other'}</span>
      </div>
      ${(item.secondary_images||[]).length ? `<div class="flex gap-1">${(item.secondary_images||[]).slice(0,4).map(u=>`<img src="${esc(u)}" class="shop-img-thumb w-12 h-12">`).join('')}</div>` : ''}
      ${item.item_type === 'lottery' ? `<button onclick="conductLotteryDraw('${item.id}','${esc(item.title)}')" class="btn-primary btn-sm w-full"><i class="fas fa-drum ml-1"></i>הגרל עכשיו</button>` : ''}
      <div class="flex gap-2">
        <button onclick="openShopModal('${item.id}')" class="btn-secondary btn-sm flex-1"><i class="fas fa-edit ml-1"></i>עריכה</button>
        <button onclick="deleteShopItem('${item.id}')" class="btn-danger btn-sm"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('');
}

async function loadShopOrders() {
  const el = document.getElementById('shop-orders-table');
  if (!el) return;
  el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4"><i class="fas fa-spinner fa-spin"></i> טוען...</div>';
  const search = (document.getElementById('shop-orders-search')?.value || '').toLowerCase().trim();

  const { data: orders, error } = await sb.from('shop_orders')
    .select('id, user_id, item_id, order_type, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) { el.innerHTML = `<div class="text-red-400 text-xs p-3">שגיאה: ${esc(error.message)}</div>`; return; }
  if (!orders?.length) { el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">אין רכישות עדיין</div>'; return; }

  const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
  const itemIds = [...new Set(orders.map(o => o.item_id).filter(Boolean))];
  const [{ data: profiles }, { data: items }] = await Promise.all([
    sb.from('profiles_public').select('id, display_name, email').in('id', userIds),
    sb.from('shop_items').select('id, title').in('id', itemIds)
  ]);
  const nameById = {};
  (profiles || []).forEach(p => { nameById[p.id] = p.display_name || p.email || p.id.slice(0,8); });
  const itemById = {};
  (items || []).forEach(i => { itemById[i.id] = i.title; });

  // קיבוץ לפי (user + item)
  const grouped = {};
  orders.forEach(o => {
    const key = `${o.user_id}__${o.item_id}`;
    if (!grouped[key]) grouped[key] = { user_id: o.user_id, item_id: o.item_id, order_type: o.order_type, count: 0, last_date: o.created_at };
    grouped[key].count += 1;
    if (o.created_at > grouped[key].last_date) grouped[key].last_date = o.created_at;
  });

  let rows = Object.values(grouped);
  if (search) {
    rows = rows.filter(r => {
      const uname = (nameById[r.user_id] || '').toLowerCase();
      const iname = (itemById[r.item_id] || '').toLowerCase();
      return uname.includes(search) || iname.includes(search);
    });
  }
  if (!rows.length) { el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">לא נמצאו תוצאות</div>'; return; }

  el.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:0.8rem;">
        <thead>
          <tr style="border-bottom:1px solid #2d3748;color:#94a3b8;text-align:right;">
            <th style="padding:6px 10px;">משתמש</th>
            <th style="padding:6px 10px;">מוצר</th>
            <th style="padding:6px 10px;">סוג</th>
            <th style="padding:6px 10px;text-align:center;">כמות / כרטיסים</th>
            <th style="padding:6px 10px;">תאריך אחרון</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid #1e293b;">
              <td style="padding:7px 10px;color:#e2e8f0;">${esc(nameById[r.user_id] || r.user_id?.slice(0,8) || '—')}</td>
              <td style="padding:7px 10px;color:#fbbf24;font-weight:700;">${esc(itemById[r.item_id] || r.item_id || '—')}</td>
              <td style="padding:7px 10px;"><span class="badge-${r.order_type === 'lottery_entry' ? 'yellow' : 'blue'}">${r.order_type === 'lottery_entry' ? '🎟 הגרלה' : '🛍 רכישה'}</span></td>
              <td style="padding:7px 10px;text-align:center;font-weight:800;font-size:1rem;color:#22c55e;">${r.count}</td>
              <td style="padding:7px 10px;color:#64748b;font-size:0.75rem;">${new Date(r.last_date).toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

async function conductLotteryDraw(itemId, itemName) {
  const { data: entries } = await sb.from('shop_orders')
    .select('user_id')
    .eq('item_id', itemId)
    .eq('order_type', 'lottery_entry');

  if (!entries || entries.length === 0) {
    alert('אין משתתפים בהגרלה זו.');
    return;
  }

  const uniqueEntrants = [...new Set(entries.map(e => e.user_id))];
  if (!confirm(`${uniqueEntrants.length} משתתפים בהגרלה "${itemName}". להגריל עכשיו?`)) return;

  const winnerId = uniqueEntrants[Math.floor(Math.random() * uniqueEntrants.length)];
  const { data: winnerProfile } = await sb.from('profiles_public')
    .select('display_name, email')
    .eq('id', winnerId)
    .maybeSingle();

  const winnerName = winnerProfile?.display_name || winnerProfile?.email || 'לומד';

  await sb.from('system_announcements').insert({
    target_type: 'lottery_result',
    content: winnerName,
    message: `הזוכה בהגרלה "${itemName}" הוא: ${winnerName}`,
    title: `🎉 הגרלה: ${itemName}`,
    delivery_type: 'lottery_animation'
  });

  alert(`ההגרלה הושלמה! הזוכה: ${winnerName}`);
}

async function populateLotteryItemSelect() {
  const sel = document.getElementById('lottery-item-select');
  if (!sel) return;
  const { data } = await sb.from('shop_items').select('id, title').eq('item_type', 'lottery').eq('is_active', true);
  sel.innerHTML = '<option value="">-- בחר מוצר --</option>' +
    (data || []).map(i => `<option value="${i.id}">${esc(i.title)}</option>`).join('');
  const { data: live } = await sb.from('system_announcements').select('content').eq('target_type', 'lottery_start').maybeSingle();
  const indicator = document.getElementById('lottery-live-indicator');
  const status = document.getElementById('lottery-admin-status');
  if (live) {
    if (indicator) indicator.classList.remove('hidden');
    if (status) {
      try {
        const d = JSON.parse(live.content);
        const elapsed = Math.round((Date.now() - new Date(d.start_time)) / 1000);
        const remaining = Math.max(0, (d.duration || 180) - elapsed);
        status.textContent = `שידור פעיל — נותרו ${remaining} שניות`;
      } catch(e) { status.textContent = 'שידור פעיל'; }
    }
  } else {
    if (indicator) indicator.classList.add('hidden');
    if (status) status.textContent = 'אין שידור פעיל כרגע';
  }
}

async function startLiveLottery() {
  const itemId = document.getElementById('lottery-item-select').value;
  const videoUrl = (document.getElementById('lottery-video-url').value || '').trim();
  if (!itemId) { toast('יש לבחור מוצר הגרלה', 'warn'); return; }
  await sb.from('system_announcements').delete().eq('target_type', 'lottery_start');
  const { error } = await sb.from('system_announcements').insert({
    target_type: 'lottery_start',
    content: JSON.stringify({ lottery_id: itemId, video_url: videoUrl, start_time: new Date().toISOString(), duration: 180 }),
    title: 'הגרלה חיה',
    created_at: new Date().toISOString()
  });
  if (!error) { toast('שידור הגרלה החל ✓', 'success'); populateLotteryItemSelect(); }
  else toast('שגיאה: ' + error.message, 'error');
}

async function stopLiveLottery() {
  await sb.from('system_announcements').delete().eq('target_type', 'lottery_start');
  toast('שידור הגרלה הופסק');
  populateLotteryItemSelect();
}

async function conductLotteryDrawLive() {
  const itemId = document.getElementById('lottery-item-select').value;
  if (!itemId) { toast('יש לבחור מוצר הגרלה', 'warn'); return; }
  const { data: item } = await sb.from('shop_items').select('title').eq('id', itemId).maybeSingle();
  const itemName = item?.title || 'הגרלה';
  
  const { data: entries } = await sb.from('shop_orders').select('user_id').eq('item_id', itemId).eq('order_type', 'lottery_entry');
  if (!entries || !entries.length) { alert('אין משתתפים בהגרלה זו.'); return; }
  
  const pool = entries.map(e => e.user_id);
  const uniqueCount = new Set(pool).size;
  if (!confirm(`${uniqueCount} משתתפים, ${pool.length} כרטיסים בסה"כ. להגריל?`)) return;
  const winnerId = pool[Math.floor(Math.random() * pool.length)];
  const { data: winnerProfile } = await sb.from('profiles_public').select('display_name, email').eq('id', winnerId).maybeSingle();
  const winnerName = winnerProfile?.display_name || winnerProfile?.email || 'לומד';
  await sb.from('system_announcements').insert({
    target_type: 'lottery_result',
    content: winnerName,
    message: `הזוכה בהגרלה "${itemName}" הוא: ${winnerName}`,
    title: `🎉 הגרלה: ${itemName}`,
    delivery_type: 'lottery_animation',
    created_at: new Date().toISOString()
  });
  
  await sb.from('system_announcements').delete().eq('target_type', 'lottery_start');
  toast(`הגרלה הושלמה! הזוכה: ${winnerName} 🎉`, 'success');
  populateLotteryItemSelect();
}

async function openShopModal(id) {
  editingShopId = id;
  shopSecondaryImgs = [];
  document.getElementById('shop-modal-title').textContent = id ? 'עריכת מוצר' : 'מוצר חדש';
  document.getElementById('shop-name').value = '';
  document.getElementById('shop-price').value = '';
  document.getElementById('shop-type').value = 'background';
  document.getElementById('shop-subtitle').value = '';
  document.getElementById('shop-desc').value = '';
  document.getElementById('shop-img-url').value = '';
  previewShopImgUrl('');
  document.getElementById('shop-stock').value = '';
  document.getElementById('shop-html').value = '';
  document.getElementById('shop-active').checked = true;
  document.getElementById('shop-secondary-imgs').innerHTML = '';
  document.getElementById('shop-provider-name').value = '';
  document.getElementById('shop-provider-location').value = '';
  document.getElementById('shop-provider-phone').value = '';
  document.getElementById('shop-provider-website').value = '';
  document.getElementById('shop-provider-other').value = '';
  if (document.getElementById('shop-lottery-date')) document.getElementById('shop-lottery-date').value = '';
  document.getElementById('shop-lottery-wrap').classList.add('hidden');

  if (id && id !== 'null') {
    const { data } = await sb.from('shop_items').select('*').eq('id', id).maybeSingle();
    if (data) {
      document.getElementById('shop-name').value = data.title || '';
      document.getElementById('shop-price').value = data.price_zuzim || '';
      document.getElementById('shop-type').value = data.item_type || 'background';
      document.getElementById('shop-subtitle').value = data.subtitle || '';
      document.getElementById('shop-desc').value = data.description || '';
      document.getElementById('shop-img-url').value = data.image_url || '';
      previewShopImgUrl(data.image_url || '');
      document.getElementById('shop-stock').value = data.stock || '';
      document.getElementById('shop-html').value = '';
      document.getElementById('shop-active').checked = data.is_active !== false;
      shopSecondaryImgs = data.secondary_images || [];
      renderSecondaryImgs();

      
      const pi = data.provider_info || {};
      document.getElementById('shop-provider-name').value = pi.name || '';
      document.getElementById('shop-provider-location').value = pi.location || '';
      document.getElementById('shop-provider-phone').value = pi.phone || '';
      document.getElementById('shop-provider-website').value = pi.website || '';
      document.getElementById('shop-provider-other').value = pi.other || '';

      if (data.item_type === 'lottery') {
        document.getElementById('shop-lottery-wrap').classList.remove('hidden');
        if (data.lottery_end_date && document.getElementById('shop-lottery-date')) {
          document.getElementById('shop-lottery-date').value = data.lottery_end_date.slice(0, 16);
        }
      }
    }
  }
  document.getElementById('shop-modal').classList.remove('hidden');
}

function closeShopModal() { document.getElementById('shop-modal').classList.add('hidden'); }

function toggleShopLotteryFields() {
  const type = document.getElementById('shop-type').value;
  document.getElementById('shop-lottery-wrap').classList.toggle('hidden', type !== 'lottery');
}

function setImgMode(mode, btn) {
  document.getElementById('img-url-wrap').classList.toggle('hidden', mode !== 'url');
  document.getElementById('img-upload-wrap').classList.toggle('hidden', mode !== 'upload');
  document.querySelectorAll('#shop-modal .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function previewShopImgUrl(url) {
  const wrap = document.getElementById('shop-url-preview-wrap');
  const img = document.getElementById('shop-url-preview-img');
  if (!wrap || !img) return;
  if (url && url.startsWith('http')) {
    wrap.style.display = 'block';
    img.src = url;
  } else {
    wrap.style.display = 'none';
  }
}

function previewShopImg(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('shop-img-preview');
    img.src = e.target.result; img.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function addSecondaryImg() {
  const url = document.getElementById('shop-sec-url').value.trim();
  if (!url) return;
  shopSecondaryImgs.push(url);
  document.getElementById('shop-sec-url').value = '';
  renderSecondaryImgs();
}

function renderSecondaryImgs() {
  document.getElementById('shop-secondary-imgs').innerHTML = shopSecondaryImgs.map((url, i) => `
    <div class="relative">
      <img src="${esc(url)}" class="shop-img-thumb ${i === 0 ? 'primary' : ''}" onclick="setPrimaryImg(${i})" title="לחץ להגדרה כראשי">
      <button onclick="removeSecImg(${i})" class="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">×</button>
      ${i === 0 ? '<div class="text-xs text-center text-[#FFB703] mt-0.5">ראשי</div>' : ''}
    </div>`).join('');
}

function setPrimaryImg(i) {
  const [item] = shopSecondaryImgs.splice(i, 1);
  shopSecondaryImgs.unshift(item); renderSecondaryImgs();
}
function removeSecImg(i) { shopSecondaryImgs.splice(i, 1); renderSecondaryImgs(); }

async function saveShopItem() {
  const title = document.getElementById('shop-name').value.trim();
  const price_zuzim = parseInt(document.getElementById('shop-price').value);
  if (!title || !price_zuzim) { toast('שם ומחיר הם שדות חובה', 'warn'); return; }
  let imgUrl = document.getElementById('shop-img-url').value.trim();
  const file = document.getElementById('shop-img-file').files?.[0];
  if (file) {
    // sanitize filename: strip Hebrew/special chars, keep extension
    const ext = file.name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
    const safeName = `shop_${Date.now()}.${ext}`;
    const BUCKETS = ['shop-images', 'public', 'avatars'];
    let uploaded = false;
    for (const bucket of BUCKETS) {
      const { error: upErr } = await sb.storage.from(bucket).upload(safeName, file, { upsert: true, contentType: file.type });
      if (!upErr) {
        const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(safeName);
        imgUrl = publicUrl;
        uploaded = true;
        break;
      }
    }
    if (!uploaded) {
      toast('שגיאה בהעלאת תמונה — ודא שיש bucket בשם "shop-images" ב-Supabase Storage עם RLS שמאפשרת upload לאדמינים', 'error');
      return;
    }
  }
  const itemType = document.getElementById('shop-type').value;
  const lotteryDate = document.getElementById('shop-lottery-date')?.value;
  const providerInfo = {
    name: document.getElementById('shop-provider-name')?.value?.trim() || null,
    location: document.getElementById('shop-provider-location')?.value?.trim() || null,
    phone: document.getElementById('shop-provider-phone')?.value?.trim() || null,
    website: document.getElementById('shop-provider-website')?.value?.trim() || null,
    other: document.getElementById('shop-provider-other')?.value?.trim() || null,
  };
  
  Object.keys(providerInfo).forEach(k => { if (!providerInfo[k]) delete providerInfo[k]; });

  const payload = {
    title, price_zuzim, image_url: imgUrl || null,
    subtitle: document.getElementById('shop-subtitle')?.value?.trim() || null,
    description: document.getElementById('shop-desc').value,
    item_type: itemType,
    secondary_images: shopSecondaryImgs,
    provider_info: Object.keys(providerInfo).length ? providerInfo : null,
    stock: document.getElementById('shop-stock').value ? parseInt(document.getElementById('shop-stock').value) : null,
    is_active: document.getElementById('shop-active').checked,
    ...(itemType === 'lottery' && lotteryDate ? { lottery_end_date: new Date(lotteryDate).toISOString() } : {})
  };
  const runSave = async (pl) => {
    if (editingShopId && editingShopId !== 'null') {
      return sb.from('shop_items').update(pl).eq('id', editingShopId);
    } else {
      return sb.from('shop_items').insert(pl);
    }
  };
  let savePayload = { ...payload };
  let { error } = await runSave(savePayload);
  const stripped = [];
  for (const col of ['image_url', 'item_type', 'secondary_images', 'stock', 'subtitle', 'provider_info', 'lottery_end_date']) {
    if (!error) break;
    if (error.message && error.message.includes(col)) {
      delete savePayload[col]; stripped.push(col);
      ({ error } = await runSave(savePayload));
    }
  }
  if (!error) {
    toast(stripped.length ? `מוצר נשמר ✓ (עמודות חסרות ב-DB: ${stripped.join(', ')})` : 'מוצר נשמר ✓', stripped.length ? 'warn' : 'success');
    closeShopModal(); loadShop();
  } else { toast('שגיאה: ' + error.message, 'error'); }
}

async function deleteShopItem(id) {
  const { data: item } = await sb.from('shop_items').select('title, item_type, image_url').eq('id', id).maybeSingle();
  if (!item) { toast('מוצר לא נמצא', 'error'); return; }

  const { count: buyerCount } = await sb.from('shop_orders')
    .select('*', { count: 'exact', head: true })
    .eq('item_id', id);

  let resetImages = false;
  if (buyerCount > 0) {
    const isVisual = item.item_type === 'icon' || item.item_type === 'background';
    const field = item.item_type === 'icon' ? 'avatar_url' : 'background_url';
    const typeLabel = item.item_type === 'icon' ? 'תמונות פרופיל' : 'תמונות רקע';

    if (!confirm(`מוצר "${esc(item.title)}" נרכש על ידי ${buyerCount} משתמשים.\n\nלמחוק את המוצר?`)) return;

    if (isVisual && item.image_url) {
      resetImages = confirm(`האם לאפס גם את ה${typeLabel} של המשתמשים שרכשו (שמשתמשים בתמונה זו)?`);
      if (resetImages) {
        const { error: resetErr } = await sb.from('profiles_public')
          .update({ [field]: null })
          .eq(field, item.image_url);
        if (resetErr) toast('שגיאה באיפוס תמונות: ' + resetErr.message, 'error');
        else toast(`${typeLabel} אופסו לכל הרוכשים`, 'warn');
      }
    }
  } else {
    if (!confirm(`למחוק את המוצר "${esc(item.title)}"?`)) return;
  }

  const { error } = await sb.from('shop_items').delete().eq('id', id);
  if (!error) { toast('מוצר נמחק ✓'); loadShop(); }
  else toast('שגיאה: ' + error.message, 'error');
}

async function createBot() {
  const name = document.getElementById('bot-name').value.trim();
  const email = document.getElementById('bot-email').value.trim();
  const pass = document.getElementById('bot-password').value;
  const city = document.getElementById('bot-city').value.trim();
  const phone = document.getElementById('bot-phone').value.trim();
  const score = parseInt(document.getElementById('bot-score').value) || 0;
  const anon = document.getElementById('bot-anon').checked;
  if (!name || !email || !pass) { toast('שם, אימייל וסיסמה הם שדות חובה', 'warn'); return; }
  document.getElementById('bot-result').textContent = 'יוצר בוט...';
  const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { display_name: name, city, phone, is_anonymous: anon, rank_score: score } } });
  if (error) { document.getElementById('bot-result').innerHTML = `<span class="text-red-400">שגיאה: ${esc(error.message)}</span>`; return; }
  document.getElementById('bot-result').innerHTML = `<span class="text-green-400">✓ בוט נוצר בהצלחה! ID: ${data.user?.id}</span>`;
  toast('בוט נוצר בהצלחה');
}

async function loadNewsletter() {
  const { data } = await sb.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false });
  allNewsletter = data || [];
  filterNewsletter();
}

function filterNewsletter() {
  const q = document.getElementById('newsletter-search').value.toLowerCase();
  const newOnly = document.getElementById('newsletter-new-only').checked;
  const filtered = allNewsletter.filter(s => {
    const matchQ = !q || s.email.toLowerCase().includes(q) || (s.name||'').toLowerCase().includes(q);
    const matchNew = !newOnly || s.is_new;
    return matchQ && matchNew;
  });
  document.getElementById('newsletter-count').textContent = `${filtered.length} נרשמים`;
  document.getElementById('newsletter-tbody').innerHTML = filtered.map(s => `
    <tr class="table-row">
      <td class="py-2 px-3"><input type="checkbox" data-id="${s.id}" class="newsletter-checkbox w-4 h-4" ${s.is_new?'':'checked'}></td>
      <td class="py-2 px-3 text-sm text-white">${esc(s.email)}</td>
      <td class="py-2 px-3 text-sm text-[#94a3b8]">${esc(s.name||'')}</td>
      <td class="py-2 px-3 text-xs text-[#64748b]">${relTime(s.subscribed_at)}</td>
      <td class="py-2 px-3">${s.is_new ? '<span class="badge-green">חדש</span>' : '<span class="text-xs text-[#64748b]">נשלח</span>'}</td>
      <td class="py-2 px-3">
        <button onclick="markNewsletterSent('${s.id}')" class="btn-secondary btn-sm" title="סמן כנשלח">✓</button>
        <button onclick="deleteNewsletter('${s.id}')" class="btn-danger btn-sm"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function toggleAllNewsletter() {
  const checked = document.getElementById('newsletter-check-all').checked;
  document.querySelectorAll('.newsletter-checkbox').forEach(c => c.checked = checked);
}

function exportNewsletter(newOnly) {
  const data = newOnly ? allNewsletter.filter(s => s.is_new) : allNewsletter;
  const txt = data.map(s => s.email).join('\n');
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = newOnly ? 'newsletter_new.txt' : 'newsletter_all.txt';
  a.click(); toast(`יוצאו ${data.length} כתובות`);
}

async function markNewsletterSent(id) {
  await sb.from('newsletter_subscribers').update({ is_new: false }).eq('id', id);
  await loadNewsletter();
}
async function deleteNewsletter(id) {
  if (!confirm('למחוק?')) return;
  await sb.from('newsletter_subscribers').delete().eq('id', id);
  await loadNewsletter();
}

async function createNewsletterReadLink() {
  const title = prompt('שם הניוזליטר (לזיהוי בלבד):');
  if (!title) return;

  const token = Math.random().toString(36).substring(2, 12);
  const { data, error } = await sb.from('system_announcements').insert({
    target_type: 'all',
    content: title,
    title: `ניוזליטר: ${title}`,
    read_token: token
  }).select('id').single();

  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }

  const link = `${window.location.origin.replace('/admin.html','').replace('admin.html','')}/index.html?read_nl=${token}`;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  box.innerHTML = `<div style="background:#1e293b;border-radius:1rem;padding:2rem;max-width:480px;width:calc(100% - 2rem);color:#fff;">
    <h3 style="margin:0 0 1rem 0;">קישור "קראתי" נוצר</h3>
    <p style="font-size:0.85rem;color:#94a3b8;margin-bottom:0.5rem;">הכנס קישור זה בתחתית הניוזליטר:</p>
    <div style="background:#0f172a;border-radius:0.5rem;padding:0.75rem;font-size:0.8rem;word-break:break-all;">${link}</div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button onclick="navigator.clipboard.writeText('${link}'); showToast('הועתק!','success');" style="flex:1;background:#f59e0b;color:#1e293b;border:none;border-radius:0.5rem;padding:0.6rem;font-weight:700;cursor:pointer;">העתק</button>
      <button onclick="this.closest('[style]').remove();" style="flex:1;background:#334155;color:#fff;border:none;border-radius:0.5rem;padding:0.6rem;cursor:pointer;">סגור</button>
    </div>
  </div>`;
  document.body.appendChild(box);
}

function sendNewsletterEmail() {
  const modal = document.getElementById('email-compose-modal');
  modal.style.display = 'flex';
  document.getElementById('email-subject').value = '';
  document.getElementById('email-body').value = '';
  document.getElementById('email-send-status').textContent = '';
  document.getElementById('email-send-btn').disabled = false;
  updateEmailPreview();
}

function closeEmailModal() {
  document.getElementById('email-compose-modal').style.display = 'none';
}

function buildEmailHtml(bodyHtml) {
  return `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
    <div style="text-align:center;padding:12px 0;border-bottom:2px solid #f59e0b;margin-bottom:20px;">
      <h2 style="color:#1e3a5f;margin:0;font-size:1.4rem;">📖 בית המדרש</h2>
    </div>
    <div style="color:#334155;line-height:1.8;">${bodyHtml}</div>
    <hr style="margin:24px 0;border-color:#e2e8f0;">
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">בית המדרש</p>
  </div>`;
}

function updateEmailPreview() {
  const body = document.getElementById('email-body').value;
  const frame = document.getElementById('email-preview-frame');
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(buildEmailHtml(body));
  doc.close();
}

function insertEmailTag(open, close) {
  const ta = document.getElementById('email-body');
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  ta.value = ta.value.slice(0, start) + open + selected + close + ta.value.slice(end);
  ta.selectionStart = start + open.length;
  ta.selectionEnd = start + open.length + selected.length;
  ta.focus();
  updateEmailPreview();
}

async function doSendNewsletterEmail() {
  const subject = document.getElementById('email-subject').value.trim();
  const bodyHtml = document.getElementById('email-body').value.trim();
  const statusEl = document.getElementById('email-send-status');
  const sendBtn = document.getElementById('email-send-btn');

  if (!subject) { statusEl.style.color = '#f87171'; statusEl.textContent = 'נא למלא נושא'; return; }
  if (!bodyHtml) { statusEl.style.color = '#f87171'; statusEl.textContent = 'נא למלא תוכן'; return; }

  sendBtn.disabled = true;
  statusEl.style.color = '#94a3b8';
  statusEl.textContent = 'שולח...';

  const html = buildEmailHtml(bodyHtml);
  try {
    const { data: fnData, error: fnErr } = await sb.functions.invoke('send-mass-email', {
      body: { target: 'all', subject, html }
    });
    if (fnErr) throw new Error(fnErr.message);
    statusEl.style.color = '#4ade80';
    statusEl.textContent = `נשלח בהצלחה ל-${fnData?.sent ?? 0} נרשמים ✓`;
    toast(`המייל נשלח ל-${fnData?.sent ?? 0} נרשמים ✓`, 'success');
    setTimeout(() => closeEmailModal(), 2000);
  } catch (e) {
    sendBtn.disabled = false;
    statusEl.style.color = '#f87171';
    const msg = e.message || '';
    if (msg.includes('Failed to send a request') || msg.includes('Edge Function')) {
      statusEl.textContent = 'שגיאה: Edge Function לא פרוסה — פרוס אותה ב-Supabase Dashboard תחת Functions';
    } else {
      statusEl.textContent = 'שגיאה: ' + msg;
    }
  }
}

function showNewsletterSubscribeInAdmin() {
  const link = `${window.location.origin.replace('/admin.html','').replace('admin.html','')}/index.html?subscribe_nl=1`;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  box.innerHTML = `<div style="background:#1e293b;border-radius:1rem;padding:2rem;max-width:400px;width:calc(100% - 2rem);color:#fff;">
    <h3>הרשמה לניוזליטר</h3>
    <p style="color:#94a3b8;font-size:0.85rem;">משתמשים מקבלים 40 זוזים על הרשמה.<br>קישור הרשמה: <strong>${link}</strong></p>
    <button onclick="this.closest('[style]').remove();" style="margin-top:1rem;background:#334155;color:#fff;border:none;border-radius:0.5rem;padding:0.6rem 1.5rem;cursor:pointer;">סגור</button>
  </div>`;
  document.body.appendChild(box);
}

async function loadAIContext() {
  try {
    const [{ count: users }, { count: goals }, { count: donations }, { data: topUsers }, { data: recent }] = await Promise.all([
      sb.from('profiles_public').select('*', { count: 'exact', head: true }),
      sb.from('user_goals').select('*', { count: 'exact', head: true }),
      sb.from('donations').select('*', { count: 'exact', head: true }),
      sb.from('profiles_public').select('display_name,rank_score,city').order('rank_score', { ascending: false }).limit(5),
      sb.from('profiles_public').select('id').gte('last_seen', new Date(Date.now()-24*3600000).toISOString())
    ]);
    const ctx = {
      total_users: users, active_goals: goals, total_donations: donations,
      active_24h: recent?.length || 0, top_users: topUsers
    };
    document.getElementById('ai-context').textContent = JSON.stringify(ctx, null, 2);
    window._aiContext = ctx;
  } catch(e) { document.getElementById('ai-context').textContent = 'שגיאה בטעינת נתונים'; }
}

function aiPreset(type) {
  const presets = {
    summary: 'תן סיכום מקיף של מצב האתר: כמה משתמשים, כמה פעילים, מגמות בולטות, נקודות חוזק וחולשה.',
    retention: 'נתח את דפוסי השימוש וצור 5 המלצות קונקרטיות לשיפור שימור המשתמשים ולעידוד חזרה לאתר.',
    content: 'בהתבסס על הנתונים, מה סוגי התוכן שכדאי להוסיף? אלו מסכתות/ספרים מומלצים להוסיף?',
    growth: 'הצע אסטרטגיית צמיחה מפורטת: כיצד להגדיל את בסיס המשתמשים ב-30% בשלושה חודשים.'
  };
  document.getElementById('ai-prompt').value = presets[type] || '';
}

async function runAI() {
  const prompt = document.getElementById('ai-prompt').value.trim();
  if (!prompt) { toast('יש להזין שאלה', 'warn'); return; }
  document.getElementById('ai-loading').classList.remove('hidden');
  document.getElementById('ai-result').textContent = '';
  const context = window._aiContext ? `נתוני האתר: ${JSON.stringify(window._aiContext, null, 2)}\n\n` : '';
  const fullPrompt = `${context}שאלה: ${prompt}`;
  const loadingEl = document.getElementById('ai-loading');
  const resultEl  = document.getElementById('ai-result');
  const callGemini = async (attempt) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });
    if (res.status === 429 && attempt < 3) {
      const wait = attempt * 20;
      resultEl.textContent = `⏳ עומס על ה-AI, ממתין ${wait} שניות ומנסה שוב...`;
      await new Promise(r => setTimeout(r, wait * 1000));
      return callGemini(attempt + 1);
    }
    if (!res.ok) throw new Error(`שגיאת שרת ${res.status}: נסה שוב בעוד דקה`);
    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text || 'לא התקבלה תשובה';
  };
  try {
    resultEl.textContent = await callGemini(1);
  } catch(e) {
    resultEl.textContent = 'שגיאה: ' + e.message;
  }
  loadingEl.classList.add('hidden');
}

let tagTemplatesCache = [];

async function loadTagTemplates() {
  const el = document.getElementById('tag-templates-list');
  if (el) el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4"><i class="fas fa-spinner fa-spin"></i> טוען...</div>';
  const [{ data }, { data: userTagsData }] = await Promise.all([
    sb.from('system_announcements').select('*').eq('target_type', 'tag_template').order('created_at', { ascending: false }),
    sb.from('user_tags').select('user_id, tag_text')
  ]);
  tagTemplatesCache = data || [];
  updateTagDropdowns();

  const usersByTag = {};
  (userTagsData || []).forEach(ut => {
    if (!usersByTag[ut.tag_text]) usersByTag[ut.tag_text] = [];
    usersByTag[ut.tag_text].push(ut.user_id);
  });

  if (el) {
    if (!tagTemplatesCache.length) {
      el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">אין תגיות. צור את הראשונה למעלה.</div>';
    } else {
      el.innerHTML = tagTemplatesCache.map(t => {
        const meta = (() => { try { return JSON.parse(t.content); } catch(e) { return {}; } })();
        const perms = meta.permissions || {};
        const permLabels = [
          perms.post_locked ? '📝 פרסום בנעולים' : null,
          perms.view_phone ? '📞 צפייה בטלפון' : null,
          perms.moderate ? '🔧 ניהול צ\'אטים' : null,
          perms.announce ? '📢 הודעות מערכת' : null,
          perms.maggid_shiur ? '🎓 מגיד שיעור' : null,
        ].filter(Boolean);
        const assignedCount = (usersByTag[t.title] || []).length;
        const countBadge = assignedCount > 0
          ? `<button onclick="toggleTagUsers('${t.id}')" class="btn-secondary btn-sm" style="font-size:0.72rem;"><i class="fas fa-users"></i> ${assignedCount}</button>`
          : `<span class="text-xs text-[#64748b]">0 משתמשים</span>`;
        return `<div class="card-dark" style="flex-direction:column;gap:6px;">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-xs font-bold px-3 py-1 rounded" style="background:${esc(meta.color||'#FFB703')};color:#1A233A">${esc(t.title)}</span>
              <div class="text-xs text-[#64748b]">${permLabels.join(' · ') || 'ללא הרשאות מיוחדות'}</div>
              ${countBadge}
            </div>
            <div class="flex gap-2">
              <button onclick="editTagTemplate('${t.id}')" class="btn-secondary btn-sm"><i class="fas fa-edit"></i></button>
              <button onclick="deleteTagTemplate('${t.id}')" class="btn-danger btn-sm"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div id="tag-users-${t.id}" style="display:none; border-top:1px solid #2d3748; padding-top:6px; margin-top:2px;"></div>
        </div>`;
      }).join('');
    }
  }
  const templateTitles = new Set(tagTemplatesCache.map(t => t.title));
  const orphaned = Object.entries(usersByTag).filter(([tagText]) => !templateTitles.has(tagText));
  const orphanCard = document.getElementById('orphaned-tags-card');
  const orphanList = document.getElementById('orphaned-tags-list');
  if (orphanCard && orphanList) {
    if (orphaned.length === 0) {
      orphanCard.style.display = 'none';
    } else {
      orphanCard.style.display = '';
      const allOrphanedIds = orphaned.flatMap(([, uids]) => uids);
      const { data: profiles } = await sb.from('profiles_public').select('id, display_name, email').in('id', allOrphanedIds);
      const nameMap = {};
      (profiles || []).forEach(p => { nameMap[p.id] = p.display_name || p.email || p.id; });
      orphanList.innerHTML = orphaned.map(([tagText, userIds]) => `
        <div style="border-bottom:1px solid #2d3748; padding-bottom:8px; margin-bottom:8px;">
          <div class="text-xs font-bold mb-2" style="color:#fbbf24;">"${esc(tagText)}" — ${userIds.length} משתמשים</div>
          ${userIds.map(uid => `
            <div class="flex items-center justify-between py-1">
              <span class="text-xs text-[#e2e8f0]">${esc(nameMap[uid] || uid)}</span>
              <button onclick="removeOrphanedTag('${uid}', '${esc(tagText)}')" class="btn-danger btn-sm" style="font-size:0.72rem;">הסר</button>
            </div>
          `).join('')}
        </div>
      `).join('');
    }
  }

  const colorInput = document.getElementById('tag-tmpl-color');
  const nameInput = document.getElementById('tag-tmpl-name');
  if (colorInput) {
    const updatePreview = () => {
      const p = document.getElementById('tag-tmpl-preview');
      if (p) { p.style.background = colorInput.value; p.style.color = '#1A233A'; p.textContent = nameInput?.value || 'תצוגה'; }
    };
    colorInput.oninput = updatePreview;
    if (nameInput) nameInput.oninput = updatePreview;
  }
}

function updateTagDropdowns() {
  const opts = '<option value="">-- בחר תגית מוכנה --</option>' +
    tagTemplatesCache.map(t => {
      const meta = (() => { try { return JSON.parse(t.content); } catch(e) { return {}; } })();
      return `<option value="${t.id}" data-color="${esc(meta.color||'#FFB703')}" data-name="${esc(t.title)}">${esc(t.title)}</option>`;
    }).join('');
  const modalSel = document.getElementById('modal-tag-template');
  const quickSel = document.getElementById('quick-assign-tag');
  if (modalSel) modalSel.innerHTML = opts;
  if (quickSel) quickSel.innerHTML = opts;
}

function applyTagTemplate(id) {
  if (!id) return;
  const t = tagTemplatesCache.find(x => x.id === id);
  if (!t) return;
  const meta = (() => { try { return JSON.parse(t.content); } catch(e) { return {}; } })();
  const textEl = document.getElementById('modal-tag-text');
  const colorEl = document.getElementById('modal-tag-color');
  if (textEl) textEl.value = t.title;
  if (colorEl) colorEl.value = meta.color || '#FFB703';
}

async function saveTagTemplate() {
  const name = document.getElementById('tag-tmpl-name').value.trim();
  const color = document.getElementById('tag-tmpl-color').value;
  if (!name) { toast('שם תגית הוא שדה חובה', 'warn'); return; }
  const permissions = {
    post_locked: document.getElementById('perm-post-locked').checked,
    view_phone: document.getElementById('perm-view-phone').checked,
    moderate: document.getElementById('perm-moderate').checked,
    announce: document.getElementById('perm-announce').checked,
  };
  const editingId = document.getElementById('tag-tmpl-editing-id').value;
  const row = { title: name, content: JSON.stringify({ color, permissions }), target_type: 'tag_template' };
  let error;
  if (editingId) {
    ({ error } = await sb.from('system_announcements').update(row).eq('id', editingId));
  } else {
    ({ error } = await sb.from('system_announcements').insert({ ...row, created_at: new Date().toISOString() }));
  }
  if (!error) { toast('תגית נשמרה ✓'); clearTagForm(); loadTagTemplates(); }
  else toast('שגיאה: ' + error.message, 'error');
}

function editTagTemplate(id) {
  const t = tagTemplatesCache.find(x => x.id === id);
  if (!t) return;
  const meta = (() => { try { return JSON.parse(t.content); } catch(e) { return {}; } })();
  document.getElementById('tag-tmpl-name').value = t.title;
  document.getElementById('tag-tmpl-color').value = meta.color || '#FFB703';
  document.getElementById('tag-tmpl-editing-id').value = id;
  document.getElementById('perm-post-locked').checked = !!meta.permissions?.post_locked;
  document.getElementById('perm-view-phone').checked = !!meta.permissions?.view_phone;
  document.getElementById('perm-moderate').checked = !!meta.permissions?.moderate;
  document.getElementById('perm-announce').checked = !!meta.permissions?.announce;
  const p = document.getElementById('tag-tmpl-preview');
  if (p) { p.style.background = meta.color || '#FFB703'; p.style.color = '#1A233A'; p.textContent = t.title; }
}

function clearTagForm() {
  document.getElementById('tag-tmpl-name').value = '';
  document.getElementById('tag-tmpl-color').value = '#FFB703';
  document.getElementById('tag-tmpl-editing-id').value = '';
  ['perm-post-locked','perm-view-phone','perm-moderate','perm-announce'].forEach(id => {
    const el = document.getElementById(id); if (el) el.checked = false;
  });
}

async function deleteTagTemplate(id) {
  if (!confirm('למחוק תגית זו ולהסיר אותה מכל המשתמשים?')) return;
  const t = tagTemplatesCache.find(x => x.id === id);
  if (t) await sb.from('user_tags').delete().eq('tag_text', t.title);
  const { error } = await sb.from('system_announcements').delete().eq('id', id);
  if (!error) { toast('תגית נמחקה מהתבניות ומכל המשתמשים'); loadTagTemplates(); }
  else toast('שגיאה: ' + error.message, 'error');
}

async function removeOrphanedTag(userId, tagText) {
  if (!confirm(`להסיר את התגית "${tagText}" ממשתמש זה?`)) return;
  const { error } = await sb.from('user_tags').delete().eq('user_id', userId).eq('tag_text', tagText);
  if (!error) { toast('תגית ישנה הוסרה'); loadTagTemplates(); }
  else toast('שגיאה: ' + error.message, 'error');
}

async function toggleTagUsers(tagId) {
  const el = document.getElementById(`tag-users-${tagId}`);
  if (!el) return;
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.innerHTML = '<div class="text-xs text-center py-2"><i class="fas fa-spinner fa-spin"></i> טוען...</div>';
  const t = tagTemplatesCache.find(x => x.id === tagId);
  if (!t) return;
  const { data: tagUsers } = await sb.from('user_tags').select('user_id').eq('tag_text', t.title);
  if (!tagUsers || !tagUsers.length) {
    el.innerHTML = '<div class="text-xs text-center py-2 text-[#64748b]">אין משתמשים עם תגית זו</div>';
    return;
  }
  const userIds = tagUsers.map(u => u.user_id);
  const { data: profiles } = await sb.from('profiles_public').select('id, display_name, email').in('id', userIds);
  if (!profiles || !profiles.length) {
    el.innerHTML = '<div class="text-xs text-center py-2 text-[#64748b]">לא נמצאו פרטי משתמשים</div>';
    return;
  }
  el.innerHTML = profiles.map(p => `
    <div class="flex items-center justify-between py-1 text-sm">
      <span class="text-[#e2e8f0]">${esc(p.display_name || p.email || p.id)}</span>
      <button onclick="removeUserTag('${p.id}', '${tagId}')" class="btn-danger btn-sm" style="font-size:0.72rem;">הסר</button>
    </div>
  `).join('');
}

async function removeUserTag(userId, tagId) {
  if (!confirm('להסיר תגית ממשתמש זה?')) return;
  const { error } = await sb.from('user_tags').delete().eq('user_id', userId);
  if (!error) { toast('תגית הוסרה'); loadTagTemplates(); }
  else toast('שגיאה: ' + error.message, 'error');
}

async function quickAssignTag() {
  const email = document.getElementById('quick-assign-email').value.trim();
  const tagId = document.getElementById('quick-assign-tag').value;
  if (!email || !tagId) { toast('בחר משתמש ותגית', 'warn'); return; }
  const t = tagTemplatesCache.find(x => x.id === tagId);
  if (!t) return;
  const meta = (() => { try { return JSON.parse(t.content); } catch(e) { return {}; } })();
  const { data: user } = await sb.from('profiles_public').select('id').eq('email', email).maybeSingle();
  if (!user) { toast('משתמש לא נמצא', 'error'); return; }
  const { error } = await sb.from('user_tags').upsert(
    { user_id: user.id, tag_text: t.title, tag_color: meta.color || '#FFB703', tag_permissions: meta.permissions || {} },
    { onConflict: 'user_id' }
  );
  if (!error) {
    toast(`תגית "${t.title}" הוקצתה ל-${email} ✓`);
    if (meta.permissions?.maggid_shiur) {
      await sb.from('notifications').insert({
        user_id: user.id,
        type: 'maggid_shiur_granted',
        title: '🎓 הפכת למגיד שיעור!',
        content: 'קיבלת את תגית מגיד שיעור. כעת תוכל למסור שיעורים חיים, לנהל לוח שנה ולשלוח עדכונים לתלמידים. פתח את "ניהול השיעורים שלי" מהתפריט.',
        is_read: false
      });
    }
  } else {
    const { error: e2 } = await sb.from('user_tags').upsert(
      { user_id: user.id, tag_text: t.title, tag_color: meta.color || '#FFB703' },
      { onConflict: 'user_id' }
    );
    if (!e2) {
      toast(`תגית "${t.title}" הוקצתה ✓`);
      if (meta.permissions?.maggid_shiur) {
        await sb.from('notifications').insert({
          user_id: user.id,
          type: 'maggid_shiur_granted',
          title: '🎓 הפכת למגיד שיעור!',
          content: 'קיבלת את תגית מגיד שיעור. כעת תוכל למסור שיעורים חיים, לנהל לוח שנה ולשלוח עדכונים לתלמידים. פתח את "ניהול השיעורים שלי" מהתפריט.',
          is_read: false
        }).catch(() => {});
      }
    } else toast('שגיאה: ' + e2.message, 'error');
  }
}

async function loadPrivateChatsAdmin() {
  const el = document.getElementById('private-chats-admin-list');
  if (!el) return;
  const searchQ = (document.getElementById('private-chat-search')?.value || '').toLowerCase().trim();
  el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4"><i class="fas fa-spinner fa-spin"></i> טוען...</div>';
  const { data: connections, error } = await sb.from('chavruta_connections')
    .select('id, sender_id, receiver_id, status, book_name, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) { el.innerHTML = `<div class="text-red-400 text-xs p-3">שגיאה: ${esc(error.message)}</div>`; return; }
  if (!connections?.length) { el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">אין חברותות</div>'; return; }
  const connIds = connections.map(c => c.id);
  const { data: lastMsgs } = await sb.from('chat_private')
    .select('connection_id, content, created_at, sender_id')
    .in('connection_id', connIds)
    .order('created_at', { ascending: false });
  const lastByConn = {};
  (lastMsgs || []).forEach(m => { if (!lastByConn[m.connection_id]) lastByConn[m.connection_id] = m; });
  const allUserIds = [...new Set(connections.flatMap(c => [c.sender_id, c.receiver_id]))];
  const { data: profiles } = await sb.from('profiles_public').select('id,display_name').in('id', allUserIds);
  const nameById = {};
  (profiles || []).forEach(p => { nameById[p.id] = p.display_name || 'ללא שם'; });
  let filtered = connections.filter(conn => {
    if (!searchQ) return true;
    const n1 = (nameById[conn.sender_id] || '').toLowerCase();
    const n2 = (nameById[conn.receiver_id] || '').toLowerCase();
    const book = (conn.book_name || '').toLowerCase();
    return n1.includes(searchQ) || n2.includes(searchQ) || book.includes(searchQ);
  });
  if (!filtered.length) { el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">לא נמצאו תוצאות</div>'; return; }
  el.innerHTML = filtered.map(conn => {
    const last = lastByConn[conn.id];
    const lastText = last ? esc((last.content?.startsWith('__DELETED__:') ? '[הודעה נמחקה]' : last.content)?.slice(0, 80) || '') : 'אין הודעות';
    const statusBadge = conn.status === 'accepted' ? '<span class="badge-green">פעיל</span>' : conn.status === 'cancelled' ? '<span class="badge-red">בוטל</span>' : `<span class="badge-blue">${esc(conn.status)}</span>`;
    const senderName = esc(nameById[conn.sender_id] || conn.sender_id?.slice(0,8));
    const receiverName = esc(nameById[conn.receiver_id] || conn.receiver_id?.slice(0,8));
    return `<div class="card-dark space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="text-sm font-medium text-white">${senderName} ↔ ${receiverName}</div>
        <div class="flex items-center gap-2">${statusBadge} ${conn.status === 'accepted' ? `<button onclick="lockConnection('${conn.id}')" class="btn-danger btn-sm">🔒 נעל</button>` : ''}</div>
      </div>
      <div class="text-xs text-[#64748b]">${esc(conn.book_name || '')} · ${relTime(conn.created_at)}</div>
      <div class="text-xs text-[#94a3b8] truncate" title="${lastText}">${lastText}</div>
      <div class="flex gap-2">
        <button onclick="openUserModal('${conn.sender_id}')" class="btn-secondary btn-sm text-xs">${senderName}</button>
        <button onclick="openUserModal('${conn.receiver_id}')" class="btn-secondary btn-sm text-xs">${receiverName}</button>
      </div>
    </div>`;
  }).join('');
}

async function lockConnection(connId) {
  if (!confirm('לנעול חברותא זו (ביטול החיבור)?')) return;
  const { error } = await sb.from('chavruta_connections').update({ status: 'cancelled' }).eq('id', connId);
  if (!error) { toast('חברותא ננעלה ✓', 'warn'); loadPrivateChatsAdmin(); }
  else toast('שגיאה: ' + error.message, 'error');
}

async function resetSelected() {
  const sections = [];
  if (document.getElementById('reset-chats')?.checked) sections.push('chats');
  if (document.getElementById('reset-private-chats')?.checked) sections.push('private_chats');
  if (document.getElementById('reset-chavrutot')?.checked) sections.push('chavrutot');
  if (document.getElementById('reset-goals')?.checked) sections.push('goals');
  if (document.getElementById('reset-scores')?.checked) sections.push('scores');
  if (document.getElementById('reset-page-views')?.checked) sections.push('page_views');
  if (document.getElementById('reset-access-logs')?.checked) sections.push('access_logs');
  if (!sections.length) { toast('לא נבחרה אף סקציה', 'warn'); return; }
  if (!confirm(`אתה עומד למחוק: ${sections.join(', ')}.\nפעולה בלתי הפיכה!`)) return;
  await performReset(sections);
}

async function resetAll() {
  if (!confirm('האם למחוק את כל נתוני האתר? פעולה בלתי הפיכה לחלוטין!')) return;
  if (!confirm('אישור אחרון: מחיקת כל הצ\'אטים, חברותות, יעדים וניקוד. המשך?')) return;
  await performReset(['chats', 'private_chats', 'chavrutot', 'goals', 'scores', 'page_views', 'access_logs']);
}

async function resetAllExceptUsers() {
  if (!confirm('מחיקת כל תוכן האתר — צ\'אטים, יעדים, חברותות, ניקוד, התראות, תגיות וסיומים. המשתמשים עצמם ישמרו. להמשיך?')) return;
  if (!confirm('אישור סופי — פעולה בלתי הפיכה. ממשיך?')) return;
  await performReset(['chats', 'private_chats', 'chat_admin_msgs', 'chavrutot', 'goals', 'scores', 'page_views', 'access_logs', 'siyum', 'notifications', 'tags', 'referrals', 'chavruta_requests', 'schedules', 'notes', 'message_reactions', 'user_followers', 'blocked_users', 'user_reports', 'announcement_views', 'shop_orders', 'donations']);
}

async function performReset(sections) {
  const log = document.getElementById('reset-log');
  log.classList.remove('hidden');
  log.innerHTML = '';
  const addLog = (msg, ok = true) => { log.innerHTML += `<div class="${ok ? 'text-green-400' : 'text-red-400'}">${esc(msg)}</div>`; };
  for (const section of sections) {
    if (section === 'chats') {
      const { error } = await sb.from('chat_public').delete().gte('created_at', '2000-01-01');
      addLog(error ? `❌ צ'אטים ציבוריים: ${error.message}` : "✅ צ'אטים ציבוריים נמחקו", !error);
    }
    if (section === 'private_chats') {
      const { error } = await sb.from('chat_private').delete().gte('created_at', '2000-01-01');
      addLog(error ? `❌ צ'אטים פרטיים: ${error.message}` : "✅ צ'אטים פרטיים נמחקו", !error);
    }
    if (section === 'chavrutot') {
      const { error } = await sb.from('chavruta_connections').update({ status: 'cancelled' }).in('status', ['accepted', 'approved', 'pending']);
      addLog(error ? `❌ חברותות: ${error.message}` : '✅ חברותות בוטלו', !error);
    }
    if (section === 'goals') {
      const { error } = await sb.from('user_goals').delete().gte('created_at', '2000-01-01');
      addLog(error ? `❌ יעדים: ${error.message}` : '✅ יעדי לימוד נמחקו', !error);
    }
    if (section === 'scores') {
      const { error } = await sb.from('profiles_public').update({ rank_score: 0, reward_points: 0 }).gte('created_at', '2000-01-01');
      addLog(error ? `❌ ניקוד: ${error.message}` : '✅ ניקוד אופס', !error);
    }
    if (section === 'page_views') {
      const { error } = await sb.from('user_access_logs').delete().gte('created_at', '2000-01-01');
      if (!error) {
        addLog('✅ היסטוריית כניסות נמחקה', true);
      } else if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        addLog('ℹ️ היסטוריית גישה: טבלה לא קיימת – דולג', true);
      } else {
        addLog(`❌ היסטוריית גישה: ${error.message}`, false);
      }
    }
    if (section === 'access_logs') {
      const { error } = await sb.from('user_access_logs').delete().gte('created_at', '2000-01-01');
      if (!error) {
        addLog('✅ לוג גישה נמחק', true);
      } else if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        addLog('ℹ️ לוג גישה: טבלה לא קיימת – דולג', true);
      } else {
        addLog(`❌ לוג גישה: ${error.message}`, false);
      }
    }
    if (section === 'siyum') {
      const { error } = await sb.from('siyum_board').delete().not('user_id', 'is', null);
      const { error: e2 } = await sb.from('siyum_reactions').delete().not('siyum_id', 'is', null);
      addLog((error || e2) ? `❌ לוח סיומים: ${(error || e2)?.message}` : '✅ לוח סיומים נמחק', !(error || e2));
    }
    if (section === 'notifications') {
      const { error } = await sb.from('notifications').delete().gte('created_at', '2000-01-01');
      addLog(error ? `❌ התראות: ${error.message}` : '✅ התראות נמחקו', !error);
    }
    if (section === 'tags') {
      const { error } = await sb.from('user_tags').delete().gte('created_at', '2000-01-01');
      addLog(error ? `❌ תגיות: ${error.message}` : '✅ תגיות משתמשים נמחקו', !error);
    }
    if (section === 'referrals') {
      await sb.from('referrals').delete().gte('created_at', '2000-01-01');
      await sb.from('referral_codes').delete().gte('created_at', '2000-01-01');
      addLog('✅ קישורי הפניה נמחקו');
    }
    if (section === 'chavruta_requests') {
      const { error } = await sb.from('chavruta_requests').delete().gte('created_at', '2000-01-01');
      if (!error) {
        addLog('✅ בקשות חברותא נמחקו', true);
      } else if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        addLog('ℹ️ בקשות חברותא: טבלה לא קיימת – דולג', true);
      } else {
        addLog(`❌ בקשות חברותא: ${error.message}`, false);
      }
    }
    if (section === 'schedules') {
      const { error } = await sb.from('chavruta_schedules').delete().gte('created_at', '2000-01-01');
      if (!error) {
        addLog('✅ לוחות זמנים נמחקו', true);
      } else if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
        addLog('ℹ️ לוחות זמנים: טבלה לא קיימת – דולג', true);
      } else {
        addLog(`❌ לוח זמנים: ${error.message}`, false);
      }
    }
    if (section === 'chat_admin_msgs') {
      const { error } = await sb.from('chat_admin').delete().gte('created_at', '2000-01-01');
      if (!error) addLog('✅ הודעות מנהל נמחקו', true);
      else if (error.message?.includes('does not exist')) addLog('ℹ️ הודעות מנהל: טבלה לא קיימת – דולג', true);
      else addLog(`❌ הודעות מנהל: ${error.message}`, false);
    }
    if (section === 'notes') {
      const { error } = await sb.from('notes').delete().gte('created_at', '2000-01-01');
      if (!error) addLog('✅ הערות אישיות נמחקו', true);
      else if (error.message?.includes('does not exist') || error.message?.includes('schema cache') || error.message?.includes('recursion')) addLog('ℹ️ הערות: לא נמחקו אוטומטית (בעיית RLS) – יש למחוק ידנית מה-Supabase Dashboard', true);
      else addLog(`❌ הערות: ${error.message}`, false);
    }
    if (section === 'message_reactions') {
      const { error } = await sb.from('message_reactions').delete().gte('created_at', '2000-01-01');
      if (!error) addLog('✅ תגובות להודעות נמחקו', true);
      else if (error.message?.includes('does not exist')) addLog('ℹ️ תגובות להודעות: טבלה לא קיימת – דולג', true);
      else addLog(`❌ תגובות להודעות: ${error.message}`, false);
    }
    if (section === 'user_followers') {
      const { error } = await sb.from('user_followers').delete().gte('created_at', '2000-01-01');
      if (!error) addLog('✅ עוקבים נמחקו', true);
      else if (error.message?.includes('does not exist')) addLog('ℹ️ עוקבים: טבלה לא קיימת – דולג', true);
      else addLog(`❌ עוקבים: ${error.message}`, false);
    }
    if (section === 'blocked_users') {
      const { error } = await sb.from('blocked_users').delete().gte('created_at', '2000-01-01');
      if (!error) addLog('✅ חסימות נמחקו', true);
      else if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) addLog('ℹ️ חסימות: טבלה לא קיימת – דולג', true);
      else addLog(`❌ חסימות: ${error.message}`, false);
    }
    if (section === 'user_reports') {
      const { error } = await sb.from('user_reports').delete().gte('created_at', '2000-01-01');
      if (!error) addLog('✅ דיווחים נמחקו', true);
      else if (error.message?.includes('does not exist')) addLog('ℹ️ דיווחים: טבלה לא קיימת – דולג', true);
      else addLog(`❌ דיווחים: ${error.message}`, false);
    }
    if (section === 'announcement_views') {
      const { error } = await sb.from('announcement_views').delete().gte('created_at', '2000-01-01');
      if (!error) addLog('✅ צפיות בהודעות נמחקו', true);
      else if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) addLog('ℹ️ צפיות הודעות: טבלה לא קיימת – דולג', true);
      else addLog(`❌ צפיות הודעות: ${error.message}`, false);
    }
    if (section === 'shop_orders') {
      const { error } = await sb.from('shop_orders').delete().gte('created_at', '2000-01-01');
      if (!error) addLog('✅ הזמנות חנות נמחקו', true);
      else if (error.message?.includes('does not exist')) addLog('ℹ️ הזמנות חנות: טבלה לא קיימת – דולג', true);
      else addLog(`❌ הזמנות חנות: ${error.message}`, false);
    }
    if (section === 'donations') {
      const { error } = await sb.from('donations').delete().gte('created_at', '2000-01-01');
      if (!error) addLog('✅ תרומות נמחקו', true);
      else if (error.message?.includes('does not exist')) addLog('ℹ️ תרומות: טבלה לא קיימת – דולג', true);
      else addLog(`❌ תרומות: ${error.message}`, false);
    }
  }
  toast('איפוס הושלם', 'warn');
}

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'עכשיו';
  if (diff < 3600000) return `לפני ${Math.floor(diff/60000)} דק'`;
  if (diff < 86400000) return `לפני ${Math.floor(diff/3600000)} שע'`;
  if (diff < 604800000) return `לפני ${Math.floor(diff/86400000)} ימים`;
  return new Date(iso).toLocaleDateString('he-IL');
}

let _bonusMode = 'all';
let _bonusTargetUserId = null;
let _bonusTargetUserName = '';

function setBonusMode(mode) {
  _bonusMode = mode;
  document.getElementById('bonus-mode-all').classList.toggle('active', mode === 'all');
  document.getElementById('bonus-mode-user').classList.toggle('active', mode === 'user');
  const picker = document.getElementById('bonus-user-picker');
  const countWrap = document.getElementById('bonus-count-wrap');
  picker.classList.toggle('hidden', mode === 'all');
  
  if (mode === 'user') {
    document.getElementById('bonus-count').value = 1;
    countWrap.style.opacity = '.4';
    countWrap.style.pointerEvents = 'none';
  } else {
    countWrap.style.opacity = '';
    countWrap.style.pointerEvents = '';
    clearBonusUser();
  }
}

async function searchBonusUser(q) {
  const res = document.getElementById('bonus-user-results');
  if (!q || q.length < 2) { res.innerHTML = ''; return; }
  const { data } = await sb.from('profiles_public')
    .select('id, display_name, email')
    .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(8);
  if (!data?.length) { res.innerHTML = '<div class="text-xs text-[#64748b] p-2">לא נמצאו משתמשים</div>'; return; }
  res.innerHTML = data.map(u => `
    <div class="card-dark flex items-center gap-2 p-2 cursor-pointer hover:border-[#FFB703]/50 transition-colors"
         onclick="selectBonusUser('${u.id}','${esc(u.display_name || u.email)}')">
      <i class="fas fa-user text-[#64748b] text-xs"></i>
      <span class="text-sm text-white flex-1">${esc(u.display_name || 'אנונימי')}</span>
      <span class="text-xs text-[#64748b]">${esc(u.email || '')}</span>
    </div>`).join('');
}

function selectBonusUser(id, name) {
  _bonusTargetUserId = id;
  _bonusTargetUserName = name;
  document.getElementById('bonus-user-results').innerHTML = '';
  document.getElementById('bonus-user-search').value = name;
  const sel = document.getElementById('bonus-selected-user');
  sel.classList.remove('hidden');
  document.getElementById('bonus-selected-user-name').textContent = name;
}

function clearBonusUser() {
  _bonusTargetUserId = null;
  _bonusTargetUserName = '';
  const sel = document.getElementById('bonus-selected-user');
  if (sel) sel.classList.add('hidden');
  const inp = document.getElementById('bonus-user-search');
  if (inp) inp.value = '';
  const res = document.getElementById('bonus-user-results');
  if (res) res.innerHTML = '';
}

function genBonusCode(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function generateBonusLinks() {
  const amount = parseInt(document.getElementById('bonus-amount').value) || 7;
  const label = (document.getElementById('bonus-label').value || '').trim();

  if (_bonusMode === 'user') {
    if (!_bonusTargetUserId) { toast('יש לבחור יוזר', 'warn'); return; }
    const row = { code: genBonusCode(), reward_amount: amount, target_user_id: _bonusTargetUserId };
    if (label) row.label = label;
    const { data, error } = await sb.from('bonus_links').insert([row]).select();
    if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
    const base = window.location.origin + '/index.html';
    const url = `${base}?bonus=${(data||[row])[0].code}`;
    const container = document.getElementById('bonus-new-links');
    const list = document.getElementById('bonus-new-links-list');
    list.innerHTML = `<div class="card-dark p-3 space-y-2">
      <div class="text-xs text-green-400 font-bold"><i class="fas fa-user-check ml-1"></i>קישור אישי עבור: ${esc(_bonusTargetUserName)}</div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-[#94a3b8] truncate flex-1" style="word-break:break-all;">${url}</span>
        <button onclick="navigator.clipboard.writeText('${url}');toast('הועתק!','success')" class="btn-secondary btn-sm whitespace-nowrap"><i class="fas fa-copy ml-1"></i>העתק</button>
      </div>
    </div>`;
    container.classList.remove('hidden');
    toast(`קישור אישי נוצר עבור ${_bonusTargetUserName}`, 'success');
  } else {
    const count = Math.min(parseInt(document.getElementById('bonus-count').value) || 1, 50);
    const rows = [];
    for (let i = 0; i < count; i++) {
      const row = { code: genBonusCode(), reward_amount: amount };
      if (label) row.label = label;
      rows.push(row);
    }
    const { data, error } = await sb.from('bonus_links').insert(rows).select();
    if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
    const base = window.location.origin + '/index.html';
    const container = document.getElementById('bonus-new-links');
    const list = document.getElementById('bonus-new-links-list');
    list.innerHTML = (data || rows).map(r => {
      const url = `${base}?bonus=${r.code}`;
      return `<div class="card-dark flex items-center justify-between gap-2 p-2">
        <span class="text-xs text-[#94a3b8] truncate flex-1" style="word-break:break-all;">${url}</span>
        <button onclick="navigator.clipboard.writeText('${url}');toast('הועתק!','success')" class="btn-secondary btn-sm whitespace-nowrap"><i class="fas fa-copy ml-1"></i>העתק</button>
      </div>`;
    }).join('');
    container.classList.remove('hidden');
    toast(`${count} קישורים נוצרו!`, 'success');
  }
  loadBonusLinks();
}

async function loadBonusLinks() {
  const el = document.getElementById('bonus-links-list');
  if (!el) return;
  el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4"><i class="fas fa-spinner fa-spin"></i> טוען...</div>';
  const filter = document.getElementById('bonus-filter')?.value || 'all';
  let query = sb.from('bonus_links').select('*').order('created_at', { ascending: false }).limit(150);
  if (filter === 'active')   query = query.is('used_at', null);
  if (filter === 'used')     query = query.not('used_at', 'is', null);
  if (filter === 'targeted') query = query.not('target_user_id', 'is', null);
  const { data, error } = await query;
  if (error) { el.innerHTML = `<div class="text-red-400 text-xs p-3">שגיאה: ${esc(error.message)}</div>`; return; }
  if (!data?.length) { el.innerHTML = '<div class="text-xs text-[#64748b] text-center py-4">אין קישורים</div>'; return; }

  
  const targetIds = [...new Set(data.filter(r=>r.target_user_id).map(r=>r.target_user_id))];
  const userNameMap = {};
  if (targetIds.length) {
    const { data: profiles } = await sb.from('profiles_public').select('id,display_name,email').in('id', targetIds);
    (profiles||[]).forEach(p => { userNameMap[p.id] = p.display_name || p.email || p.id; });
  }

  const base = window.location.origin + '/index.html';
  el.innerHTML = `<table class="w-full text-xs">
    <thead><tr class="border-b border-[#2d3a55] text-[#64748b]">
      <th class="text-right py-2 pr-2">קוד</th>
      <th class="text-right py-2">זוזים</th>
      <th class="text-right py-2">מיועד ל</th>
      <th class="text-right py-2">תווית</th>
      <th class="text-right py-2">סטטוס</th>
      <th class="text-right py-2">תאריך</th>
      <th class="py-2"></th>
    </tr></thead>
    <tbody>${data.map(r => {
      const url = `${base}?bonus=${r.code}`;
      const used = !!r.used_at;
      const target = r.target_user_id ? (userNameMap[r.target_user_id] || '?') : '—';
      return `<tr class="table-row">
        <td class="py-2 pr-2 font-mono text-[#94a3b8]">${esc(r.code)}</td>
        <td class="py-2 text-[#FFB703] font-bold">${r.reward_amount}</td>
        <td class="py-2 text-xs">${r.target_user_id ? `<span class="badge-blue">${esc(target)}</span>` : '<span class="text-[#64748b]">כולם</span>'}</td>
        <td class="py-2 text-[#64748b]">${esc(r.label||'')}</td>
        <td class="py-2">${used ? '<span class="badge-red">נוצל</span>' : '<span class="badge-green">פעיל</span>'}</td>
        <td class="py-2 text-[#64748b]">${relTime(r.created_at)}</td>
        <td class="py-2">${!used ? `<button onclick="navigator.clipboard.writeText('${url}');toast('הועתק!','success')" class="btn-secondary btn-sm"><i class="fas fa-copy"></i></button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ===== חדרי לימוד פעילים (מ-Supabase DB) =====

async function loadLiveRooms() {
  const grid = document.getElementById('liveRoomsGrid');
  const empty = document.getElementById('liveRoomsEmpty');
  if (!grid) return;

  grid.innerHTML = '<div class="text-[#64748b] text-center py-8 text-sm">טוען חדרים...</div>';

  // ניקוי חדרים ישנים (מעל 8 שעות)
  try {
    await sb.rpc('cleanup_old_live_rooms');
  } catch(e) {}

  const { data: rooms, error } = await sb
    .from('live_rooms')
    .select('*')
    .eq('is_active', true)
    .order('started_at', { ascending: false });

  if (error) {
    grid.innerHTML = `<div class="text-red-400 text-center py-8 text-sm">שגיאה: ${esc(error.message)}</div>`;
    return;
  }

  if (!rooms || rooms.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = rooms.map(r => {
    const startMs = r.started_at ? new Date(r.started_at).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - startMs) / 1000);
    const m = Math.floor(elapsed / 60);
    const duration = m < 60 ? m + ' דק' : Math.floor(m / 60) + ' שע';
    const typeBadge = r.session_type === 'shiur'
      ? '<span class="badge-yellow">שיעור</span>'
      : '<span class="badge-green">חברותא</span>';
    const visiBadge = r.is_public
      ? '<span class="badge-blue">ציבורי</span>'
      : '<span class="badge-purple">פרטי</span>';
    const safeId   = (r.id   || '').replace(/'/g, "\\'");
    const safeBook = (r.book || '').replace(/'/g, "\\'");
    const safeType = r.session_type || 'chavruta';

    return `<div style="background:#1A233A;border:1px solid #2d3a55;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
        <div>
          <div style="font-weight:800;font-size:1rem;color:#e2e8f0;margin-bottom:4px;">${esc(r.title || r.book)}</div>
          <div style="font-size:0.82rem;color:#94a3b8;">${esc(r.book)}</div>
          <div style="font-size:0.75rem;color:#64748b;margin-top:2px;">מארח: ${esc(r.host_name || '—')}</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0;">${typeBadge}${visiBadge}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:0.82rem;color:#94a3b8;">
        <span>${(r.participants || []).join(', ') || '—'}</span>
        ${r.session_type === 'shiur' ? `<span>${r.viewers_count || 0} צופים</span>` : ''}
        <span>${duration}</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="adminStealthJoin('${safeId}','${safeBook}','${safeType}')"
                class="btn-primary btn-sm" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;">
          <i class="fas fa-eye"></i> צפייה סמויה
        </button>
        <button onclick="adminForceClose('${safeId}')" class="btn-danger btn-sm" title="סגור חדר">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>`;
  }).join('');
}

// צפייה סמויה — מושבת זמנית
function adminStealthJoin(roomId, book, type) {
  toast('שיחות וידאו אינן זמינות כעת — בקרוב!', 'info');
}

// סגירת חדר מהניהול — מעדכן ב-DB
async function adminForceClose(roomId) {
  if (!confirm('לסגור את חדר הלימוד?')) return;
  const { error } = await sb.from('live_rooms')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('id', roomId);
  if (error) { toast('שגיאה: ' + error.message, 'error'); return; }
  toast('החדר נסגר ✓', 'success');
  loadLiveRooms();
}

async function clearInactiveRooms() {
  try { await sb.rpc('cleanup_old_live_rooms'); } catch(e) {}
  toast('חדרים ישנים נוקו ✓', 'success');
  loadLiveRooms();
}

// ===== DONATION SETTINGS =====

let _subTiers = [];
let _oneTiers = [];

async function loadDonationSettings() {
  _subTiers = JSON.parse(JSON.stringify(typeof SUBSCRIPTION_TIERS !== 'undefined' ? SUBSCRIPTION_TIERS : []));
  _oneTiers = JSON.parse(JSON.stringify(typeof ONE_TIME_TIERS !== 'undefined' ? ONE_TIME_TIERS : []));

  try {
    const { data, error } = await sb.from('site_config').select('value').eq('key', 'donation_tiers').maybeSingle();
    if (!error && data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (parsed.sub && Array.isArray(parsed.sub)) _subTiers = parsed.sub;
      if (parsed.one && Array.isArray(parsed.one)) _oneTiers = parsed.one;
    }
  } catch(e) {}

  renderTiersList('sub', _subTiers);
  renderTiersList('one', _oneTiers);
  const status = document.getElementById('donation-save-status');
  if (status) status.textContent = '';
}

function renderTiersList(type, tiers) {
  const container = document.getElementById(type === 'sub' ? 'sub-tiers-list' : 'one-tiers-list');
  if (!container) return;
  container.innerHTML = tiers.map((t, i) => `
    <div class="flex items-center gap-2 flex-wrap p-2 rounded-lg bg-[#0F1623] border border-[#2d3a55]" id="${type}-tier-row-${i}">
      <div class="flex flex-col gap-0.5">
        <label class="text-[10px] text-[#64748b]">סכום (₪)</label>
        <input type="number" min="1" value="${t.price}" class="input-field w-20 text-center" style="padding:4px 6px;font-size:.85rem;"
          onchange="_updateTier('${type}',${i},'price',this.valueAsNumber)">
      </div>
      <div class="flex flex-col gap-0.5 flex-1 min-w-[120px]">
        <label class="text-[10px] text-[#64748b]">שם שכבה</label>
        <input type="text" value="${t.name}" class="input-field" style="padding:4px 8px;font-size:.85rem;"
          onchange="_updateTier('${type}',${i},'name',this.value)">
      </div>
      ${type === 'sub' ? `
      <div class="flex flex-col gap-0.5">
        <label class="text-[10px] text-[#64748b]">רמה</label>
        <input type="number" min="0" max="10" value="${t.level}" class="input-field w-14 text-center" style="padding:4px 4px;font-size:.85rem;"
          onchange="_updateTier('${type}',${i},'level',this.valueAsNumber)">
      </div>
      <div class="flex flex-col gap-0.5">
        <label class="text-[10px] text-[#64748b]">צבע</label>
        <div class="flex items-center gap-1">
          <input type="color" value="${t.color || '#d97706'}" class="w-8 h-8 rounded cursor-pointer border border-[#2d3a55] bg-transparent"
            onchange="_updateTier('${type}',${i},'color',this.value)">
          <input type="text" value="${t.color || '#d97706'}" class="input-field w-20" style="padding:4px 6px;font-size:.75rem;"
            onchange="_updateTier('${type}',${i},'color',this.value)">
        </div>
      </div>` : ''}
      <button onclick="_removeTier('${type}',${i})" class="btn-danger btn-sm self-end" title="מחק שכבה">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('') || `<div class="text-[#64748b] text-sm text-center py-4">אין שכבות — לחץ "הוסף שכבה"</div>`;
}

function _updateTier(type, idx, field, val) {
  const arr = type === 'sub' ? _subTiers : _oneTiers;
  if (arr[idx]) arr[idx][field] = val;
}

function _removeTier(type, idx) {
  if (type === 'sub') _subTiers.splice(idx, 1);
  else _oneTiers.splice(idx, 1);
  renderTiersList(type, type === 'sub' ? _subTiers : _oneTiers);
}

function addTierRow(type) {
  if (type === 'sub') {
    const maxLevel = _subTiers.reduce((m, t) => Math.max(m, t.level || 0), 0);
    _subTiers.push({ price: 50, name: 'שכבה חדשה', level: maxLevel + 1, color: '#d97706' });
    renderTiersList('sub', _subTiers);
  } else {
    _oneTiers.push({ price: 50, name: 'שכבה חדשה', level: 0, color: '#e5e7eb' });
    renderTiersList('one', _oneTiers);
  }
}

async function saveDonationSettings() {
  const status = document.getElementById('donation-save-status');
  if (status) status.textContent = 'שומר...';

  const subSorted = [..._subTiers].sort((a, b) => a.price - b.price);
  const oneSorted = [..._oneTiers].sort((a, b) => a.price - b.price);

  const payload = JSON.stringify({ sub: subSorted, one: oneSorted });

  try {
    const { error } = await sb.from('site_config').upsert({ key: 'donation_tiers', value: payload }, { onConflict: 'key' });
    if (error) throw error;

    if (typeof SUBSCRIPTION_TIERS !== 'undefined') {
      SUBSCRIPTION_TIERS.length = 0;
      subSorted.forEach(t => SUBSCRIPTION_TIERS.push(t));
    }
    if (typeof ONE_TIME_TIERS !== 'undefined') {
      ONE_TIME_TIERS.length = 0;
      oneSorted.forEach(t => ONE_TIME_TIERS.push(t));
    }

    _subTiers = subSorted;
    _oneTiers = oneSorted;
    renderTiersList('sub', _subTiers);
    renderTiersList('one', _oneTiers);
    toast('הגדרות התרומה נשמרו ✓', 'success');
    if (status) status.textContent = '✓ נשמר בהצלחה';
  } catch(e) {
    toast('שגיאה בשמירה: ' + e.message, 'error');
    if (status) status.textContent = '⚠ שגיאה בשמירה — ראה הערה למטה';
    const noteEl = document.querySelector('#page-donation-settings .card-dark');
    if (noteEl && !noteEl.querySelector('.table-note')) {
      const note = document.createElement('div');
      note.className = 'table-note';
      note.innerHTML = `<br><i class="fas fa-exclamation-triangle text-yellow-400 ml-1"></i><span class="text-yellow-300">אם הטבלה "site_config" לא קיימת ב-Supabase, יש ליצור אותה: <code class="bg-[#1A233A] px-1 rounded">CREATE TABLE site_config (key text PRIMARY KEY, value text);</code></span>`;
      noteEl.appendChild(note);
    }
  }
}
