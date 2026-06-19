/* ===================================================
   video-study.js – לוגיקת חדר לימוד וידאו
   =================================================== */

// ===== קונסטנטות =====
const SUPABASE_URL = 'https://afihonprbwaoiokowsty.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nAMFWiuTDObLLVoofQurSw_VSbSXxRT';
const DEMO_ROOMS_KEY = 'beithamidrash_demo_rooms';
const SEFARIA_BASE = 'https://www.sefaria.org.il/';

// ICE servers: STUN (גוגל) + TURN ציבורי (metered.ca) לפירסינג NAT כבד
const GOOGLE_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // TURN servers — נחוצים כאשר שני הצדדים מאחורי Symmetric NAT (ספקים ישראלים, סלולר)
    { urls: 'turn:openrelay.metered.ca:80',      username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',     username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:80?transport=tcp',  username: 'openrelayproject', credential: 'openrelayproject' },
];

// ===== מצב גלובלי =====
let vsSupabase = null;
let wbChannel = null;
let chatChannel = null;
let vsUserId = null; // UUID של המשתמש המחובר

// ===== WebRTC state =====
let localStream   = null;   // MediaStream מקומי
let screenStream  = null;   // MediaStream של שיתוף מסך
let peerConns     = {};     // peerId → RTCPeerConnection
let peerNames     = {};     // peerId → displayName
let signalChannel = null;   // Supabase Realtime לסיגנלינג
const localPeerId = 'p_' + Math.random().toString(36).substr(2, 9);

let roomId = '';
let bookName = '';
let partnerName = '';
let sessionMode = 'chavruta'; // 'chavruta' | 'shiur_teacher' | 'shiur_viewer' | 'stealth'
let isMicMuted = false;
let isCameraOff = false;
let isSharing = false;
let isHandRaised = false;
let sessionStartTime = Date.now();
let timerInterval = null;
let viewersCount = 0;
let activeTab = 'gemara';

// ===== לוח ציור =====
let wbTool = 'pen';
let wbColor = '#1e293b';
let wbSize = 2;
let isDrawing = false;
let lastX = 0, lastY = 0;
let wbTextActive = false;
let pendingTextX = 0, pendingTextY = 0;
let wbCanvas, wbCtx;

// ===== ריספונסיבי =====
let panelOpen = true;

// ===== רשימת ספרים לסכריא =====
const SEFARIA_BOOKS = [
    { label: '— תלמוד בבלי —', disabled: true },
    { value: 'ברכות', label: 'מסכת ברכות', pages: 64 },
    { value: 'שבת', label: 'מסכת שבת', pages: 157 },
    { value: 'עירובין', label: 'מסכת עירובין', pages: 105 },
    { value: 'פסחים', label: 'מסכת פסחים', pages: 121 },
    { value: 'ראש השנה', label: 'מסכת ראש השנה', pages: 35 },
    { value: 'יומא', label: 'מסכת יומא', pages: 88 },
    { value: 'סוכה', label: 'מסכת סוכה', pages: 56 },
    { value: 'ביצה', label: 'מסכת ביצה', pages: 40 },
    { value: 'תענית', label: 'מסכת תענית', pages: 31 },
    { value: 'מגילה', label: 'מסכת מגילה', pages: 32 },
    { value: 'מועד קטן', label: 'מסכת מועד קטן', pages: 29 },
    { value: 'חגיגה', label: 'מסכת חגיגה', pages: 27 },
    { value: 'יבמות', label: 'מסכת יבמות', pages: 122 },
    { value: 'כתובות', label: 'מסכת כתובות', pages: 112 },
    { value: 'נדרים', label: 'מסכת נדרים', pages: 91 },
    { value: 'גיטין', label: 'מסכת גיטין', pages: 90 },
    { value: 'קידושין', label: 'מסכת קידושין', pages: 82 },
    { value: 'בבא קמא', label: 'מסכת בבא קמא', pages: 119 },
    { value: 'בבא מציעא', label: 'מסכת בבא מציעא', pages: 119 },
    { value: 'בבא בתרא', label: 'מסכת בבא בתרא', pages: 176 },
    { value: 'סנהדרין', label: 'מסכת סנהדרין', pages: 113 },
    { value: 'מכות', label: 'מסכת מכות', pages: 24 },
    { value: 'שבועות', label: 'מסכת שבועות', pages: 49 },
    { value: 'עבודה זרה', label: 'מסכת עבודה זרה', pages: 76 },
    { value: 'חולין', label: 'מסכת חולין', pages: 142 },
    { value: 'בכורות', label: 'מסכת בכורות', pages: 61 },
    { value: 'נידה', label: 'מסכת נידה', pages: 73 },
    { label: '— תורה —', disabled: true },
    { value: 'בראשית', label: 'בראשית' },
    { value: 'שמות', label: 'שמות' },
    { value: 'ויקרא', label: 'ויקרא' },
    { value: 'במדבר', label: 'במדבר' },
    { value: 'דברים', label: 'דברים' },
    { label: '— רמב"ם —', disabled: true },
    { value: 'Mishneh_Torah', label: 'משנה תורה' },
];

// ===== אתחול =====
document.addEventListener('DOMContentLoaded', async () => {
    // ניתוח פרמטרים מה-URL
    const params = new URLSearchParams(window.location.search);
    roomId      = params.get('room') || generateRoomId();
    bookName    = decodeURIComponent(params.get('book') || 'לימוד חברותא');
    partnerName = decodeURIComponent(params.get('partner') || '');
    sessionMode = params.get('mode') || 'chavruta';

    // עדכון UI בכותרת
    document.getElementById('vsBookName').textContent = bookName;
    document.getElementById('vsPartnerName').textContent = partnerName || 'חברותא';
    document.getElementById('loadingSub').textContent = `${bookName}${partnerName ? ' עם ' + partnerName : ''}`;

    if (sessionMode === 'shiur_teacher' || sessionMode === 'shiur_viewer') {
        document.getElementById('vsModeBadge').style.display = 'flex';
        document.getElementById('vsModeText').textContent = sessionMode === 'shiur_teacher' ? 'שיעור חי – שידור' : 'שיעור חי – צפייה';
        document.getElementById('vsViewersCount').style.display = 'flex';
    }
    if (sessionMode === 'stealth') {
        document.getElementById('vsModeBadge').style.display = 'flex';
        document.getElementById('vsModeText').innerHTML = '<i class="fas fa-eye"></i> מצב מנהל';
        document.getElementById('vsModeBadge').style.background = 'rgba(139,92,246,0.25)';
        document.getElementById('vsModeBadge').style.borderColor = 'rgba(139,92,246,0.4)';
        document.getElementById('vsModeBadge').firstElementChild.style.background = '#8b5cf6';
    }
    // עדכן טקסט "ממתין" לפי מצב
    const waitingSub = document.getElementById('waitingSub');
    if (waitingSub) {
        if (sessionMode === 'stealth') waitingSub.textContent = 'מתחבר לחדר בצפייה סמויה...';
        else if (sessionMode === 'shiur_viewer') waitingSub.textContent = 'ממתין לתחילת השיעור...';
        else if (sessionMode === 'shiur_teacher') waitingSub.textContent = 'ממתין לצופים...';
        else waitingSub.textContent = 'ממתין לחברותא...';
    }

    if (sessionMode === 'stealth') {
        document.getElementById('vsPartnerChip').style.display = 'none';
    }

    // אתחול Supabase לצ'אט ולוח
    try {
        vsSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch(e) { console.warn('Supabase init failed:', e); }

    // טעינת שם המשתמש האמיתי מה-DB
    await initVsUser();

    // בדיקת הרשאת שידור לפני כניסה למצב מגיד שיעור
    if (sessionMode === 'shiur_teacher') {
        const allowed = await checkBroadcastPermission();
        if (!allowed) {
            alert('אין לך הרשאת שידור. פנה למנהל לקבלת הרשאה.');
            window.location.href = 'index.html';
            return;
        }
    }

    // הוסף חדר לדמו ול-DB
    if (sessionMode !== 'stealth') await registerDemoRoom();

    // אתחול רכיבים
    populateSefariaBooks();
    initWhiteboard();

    // טעינה דחויה להצגה חלקה
    await delay(600);
    document.getElementById('loadingSub').textContent = 'מחבר לחדר...';
    await delay(800);

    // הסתר לודינג ואתחל WebRTC
    hideLoading();
    await initWebRTC();
    startTimer();
    initChatChannel();
    initWhiteboardSync();
    initShiurChannel();

    // נעל פקדים לצופים בשיעור חי
    if (sessionMode === 'shiur_viewer') {
        setViewerMicLock(true);
        applyShiurChatState();
        const bellBtn = document.getElementById('btnSubscribeUpdates');
        if (bellBtn) bellBtn.style.display = 'flex';
    }
    // הגדר ממשק מגיד שיעור
    if (sessionMode === 'shiur_teacher') {
        const manageTab = document.getElementById('tab-btn-manage');
        if (manageTab) manageTab.style.display = 'flex';
        // מעבר אוטומטי לטאב ניהול
        switchTab('manage', manageTab);
    }

    // גמרא – טעינה אוטומטית לפי ספר
    autoLoadSefaria(bookName);

    // רספונסיבי
    handleResize();
    window.addEventListener('resize', handleResize);
});

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// =====================================================
// ===== WebRTC – שיחות וידאו מובנות (Google STUN) ====
// =====================================================

async function initWebRTC() {
    const isStealth = sessionMode === 'stealth';
    const isViewer  = sessionMode === 'shiur_viewer';

    // עדכן label שם מקומי
    const labelEl = document.getElementById('localLabel');
    if (labelEl) labelEl.textContent = window.vsUserName || 'אני';

    // סטלת' — אין מדיה מקומית, רק קבלה
    if (isStealth) {
        const wrap = document.getElementById('localVideoWrap');
        if (wrap) wrap.style.display = 'none';
    } else {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true }
            });
        } catch(e) {
            // נסה audio בלבד אם אין מצלמה
            try { localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); }
            catch(e2) { vsToast('לא ניתן לגשת למצלמה/מיקרופון'); }
        }

        if (localStream) {
            const localVideo = document.getElementById('localVideo');
            if (localVideo) localVideo.srcObject = localStream;
        }

        // צופה בשידור — מיקרופון ומצלמה כבויים בהתחלה
        if (isViewer && localStream) {
            localStream.getTracks().forEach(t => { t.enabled = false; });
        }
    }

    // הפעל signaling
    initWebRTCSignaling();
}

// ── Signaling via Supabase Realtime ──────────────────
// תור ICE candidates שהגיעו לפני שה-PC מוכן
const _iceQueue = {}; // peerId → RTCIceCandidateInit[]

function _myPresence() {
    return { peerId: localPeerId, displayName: window.vsUserName || 'לומד', mode: sessionMode };
}

// מי צריך לשלוח offer? (השוואה דטרמיניסטית)
async function _maybeSendOffer(remotePeerId, remoteMode) {
    if (peerConns[remotePeerId]) return; // כבר מחובר

    let shouldOffer = false;
    if (sessionMode === 'chavruta') {
        // ה-peerId הגבוה יותר שולח offer — מונע כפילות
        shouldOffer = localPeerId > remotePeerId;
    } else if (sessionMode === 'shiur_teacher') {
        shouldOffer = (remoteMode === 'shiur_viewer');
    } else if (sessionMode === 'stealth') {
        shouldOffer = (remoteMode === 'shiur_teacher' || remoteMode === 'chavruta');
    }
    // shiur_viewer לא שולח offer — מחכה למורה

    if (shouldOffer) await sendOffer(remotePeerId);
}

function initWebRTCSignaling() {
    if (!vsSupabase) return;

    signalChannel = vsSupabase.channel('rtc_signal_' + roomId, {
        config: { broadcast: { self: false, ack: false } }
    });

    // ── peer_join: מישהו נכנס לחדר ────────────────────
    signalChannel.on('broadcast', { event: 'peer_join' }, async ({ payload }) => {
        if (payload.peerId === localPeerId) return;
        peerNames[payload.peerId] = payload.displayName || 'משתתף';

        // תגובה כדי שהמצטרף ידע שאנחנו כאן (peer_hello — ללא קסקדה)
        if (sessionMode !== 'stealth') {
            signalChannel.send({
                type: 'broadcast', event: 'peer_hello',
                payload: _myPresence()
            }).catch(() => {});
        }

        await _maybeSendOffer(payload.peerId, payload.mode);
    });

    // ── peer_hello: תגובה ל-peer_join (לא גורמת peer_hello נוסף) ──
    signalChannel.on('broadcast', { event: 'peer_hello' }, async ({ payload }) => {
        if (payload.peerId === localPeerId) return;
        peerNames[payload.peerId] = payload.displayName || 'משתתף';
        await _maybeSendOffer(payload.peerId, payload.mode);
    });

    // ── rtc_offer ─────────────────────────────────────
    signalChannel.on('broadcast', { event: 'rtc_offer' }, async ({ payload }) => {
        if (payload.to !== localPeerId) return;
        peerNames[payload.from] = payload.displayName || 'משתתף';
        await handleOffer(payload);
    });

    // ── rtc_answer ────────────────────────────────────
    signalChannel.on('broadcast', { event: 'rtc_answer' }, async ({ payload }) => {
        if (payload.to !== localPeerId) return;
        const pc = peerConns[payload.from];
        if (!pc) return;
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            // רוקן תור ICE שנצבר לפני ה-answer
            for (const c of (_iceQueue[payload.from] || [])) {
                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }
            delete _iceQueue[payload.from];
        } catch(e) { console.warn('setRemoteDescription(answer):', e); }
    });

    // ── rtc_ice ───────────────────────────────────────
    signalChannel.on('broadcast', { event: 'rtc_ice' }, async ({ payload }) => {
        if (payload.to !== localPeerId || !payload.candidate) return;
        const pc = peerConns[payload.from];
        if (!pc || !pc.remoteDescription) {
            // PC עוד לא מוכן — שמור בתור
            (_iceQueue[payload.from] = _iceQueue[payload.from] || []).push(payload.candidate);
            return;
        }
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
        catch(e) { console.warn('addIceCandidate:', e); }
    });

    // ── peer_leave ────────────────────────────────────
    signalChannel.on('broadcast', { event: 'peer_leave' }, ({ payload }) => {
        removeRemoteVideo(payload.peerId);
        closePeer(payload.peerId);
    });

    // ── Subscribe ─────────────────────────────────────
    signalChannel.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        if (sessionMode === 'stealth') return; // מנהל נכנס בשקט

        // הכרז על נוכחותך — פירים קיימים יענו עם peer_hello
        await signalChannel.send({
            type: 'broadcast', event: 'peer_join',
            payload: _myPresence()
        });
    });
}

// ── Peer Connection ───────────────────────────────────
function createPC(peerId) {
    if (peerConns[peerId]) return peerConns[peerId];

    const pc = new RTCPeerConnection({ iceServers: GOOGLE_ICE_SERVERS });
    peerConns[peerId] = pc;

    // הוסף tracks מקומיים (לא בסטלת')
    if (localStream && sessionMode !== 'stealth') {
        localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    }

    // ICE candidate → שלח דרך Supabase
    pc.onicecandidate = ({ candidate }) => {
        if (!candidate || !signalChannel) return;
        signalChannel.send({
            type: 'broadcast', event: 'rtc_ice',
            payload: { to: peerId, from: localPeerId, candidate }
        }).catch(() => {});
    };

    // עדכון overlay לפי שלב ה-ICE
    pc.oniceconnectionstatechange = () => {
        const sub = document.getElementById('waitingSub');
        const overlay = document.getElementById('waitingOverlay');
        switch (pc.iceConnectionState) {
            case 'checking':
                if (sub) sub.textContent = 'בודק מסלולי חיבור...';
                break;
            case 'connected':
            case 'completed':
                // ICE הצליח — הוידאו אמור להגיע מיד
                if (sub) sub.textContent = 'מחובר! טוען וידאו...';
                break;
            case 'failed':
                if (sub) sub.textContent = 'החיבור נכשל — מנסה שוב...';
                if (overlay) overlay.classList.remove('hidden');
                // ניסיון ICE restart
                pc.restartIce();
                break;
            case 'disconnected':
                if (sub) sub.textContent = 'החיבור הופסק זמנית...';
                if (overlay) overlay.classList.remove('hidden');
                break;
        }
    };

    // קבלת track מרוחק → הצג video
    pc.ontrack = (event) => {
        let stream = event.streams?.[0];
        if (!stream) {
            // Safari / Firefox edge-case — בנה stream ידנית
            stream = pc._remoteStream;
            if (!stream) { stream = new MediaStream(); pc._remoteStream = stream; }
            stream.addTrack(event.track);
        }
        addRemoteVideo(peerId, stream);
    };

    // ניתוק
    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected') {
            // מצב זמני — הוצג overlay אבל אל תסגור את החיבור, הוא עשוי להתאושש
            const overlay = document.getElementById('waitingOverlay');
            if (overlay) overlay.classList.remove('hidden');
            const sub = document.getElementById('waitingSub');
            if (sub) sub.textContent = 'החיבור הופסק זמנית, מנסה שוב...';
            return;
        }
        if (['failed', 'closed'].includes(pc.connectionState)) {
            removeRemoteVideo(peerId);
            closePeer(peerId);
            vsToast('<i class="fas fa-circle-xmark" style="color:#ef4444;"></i> ' + (peerNames[peerId] || 'משתתף') + ' התנתק');
        }
    };

    return pc;
}

async function sendOffer(peerId) {
    const pc = createPC(peerId);
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await signalChannel.send({
            type: 'broadcast', event: 'rtc_offer',
            payload: {
                to: peerId, from: localPeerId,
                sdp: pc.localDescription,
                displayName: window.vsUserName || 'לומד'
            }
        });
    } catch(e) { console.warn('sendOffer failed:', e); }
}

async function handleOffer({ from, sdp, displayName }) {
    const pc = createPC(from);
    if (displayName) peerNames[from] = displayName;
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // רוקן ICE candidates שנצברו לפני setRemoteDescription
        for (const c of (_iceQueue[from] || [])) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        delete _iceQueue[from];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await signalChannel.send({
            type: 'broadcast', event: 'rtc_answer',
            payload: {
                to: from, from: localPeerId,
                sdp: pc.localDescription,
                displayName: window.vsUserName || 'לומד'
            }
        });
    } catch(e) { console.warn('handleOffer failed:', e); }
}

function closePeer(peerId) {
    if (peerConns[peerId]) {
        peerConns[peerId].close();
        delete peerConns[peerId];
    }
    delete peerNames[peerId];
}

// ── Remote video elements ─────────────────────────────
function addRemoteVideo(peerId, stream) {
    // עדכן video קיים (אם כבר נוצר)
    const existingVideo = document.getElementById('rv_' + peerId);
    if (existingVideo) {
        existingVideo.srcObject = stream;
        existingVideo.muted = true;
        existingVideo.play().catch(() => {});
        return;
    }

    const wrap  = document.createElement('div');
    wrap.id = 'rvc_' + peerId;
    wrap.className = 'remote-video-wrap';

    const video = document.createElement('video');
    video.id = 'rv_' + peerId;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;       // חובה ל-Chrome autoplay policy
    video.srcObject = stream;

    const label = document.createElement('div');
    label.className = 'remote-video-label';
    label.textContent = peerNames[peerId] || 'משתתף';

    // כפתור ביטול השתקה — מאפשר למשתמש להפעיל שמע ידנית (גסטצ'ר דרוש)
    const unmuteBtn = document.createElement('button');
    unmuteBtn.id = 'unmute_' + peerId;
    unmuteBtn.title = 'הפעל שמע';
    unmuteBtn.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(239,68,68,0.92);color:#fff;border:none;border-radius:12px;padding:10px 20px;font-size:0.9rem;font-weight:700;cursor:pointer;z-index:10;font-family:inherit;box-shadow:0 4px 16px rgba(0,0,0,0.5);';
    unmuteBtn.innerHTML = '<i class="fas fa-volume-mute" style="margin-left:6px;"></i> לחץ להפעלת שמע';
    unmuteBtn.onclick = () => {
        video.muted = false;
        video.play().catch(() => {});
        unmuteBtn.remove();
    };

    wrap.appendChild(video);
    wrap.appendChild(label);
    wrap.appendChild(unmuteBtn);
    document.getElementById('remoteVideos').appendChild(wrap);

    // הפעל play — muted=true מבטיח שלא נחסם
    video.play().catch(e => {
        console.warn('remote video play failed:', e);
    });
    // אחרי שהמשתמש מקבל gesture, ננסה להפעיל עם שמע
    document.addEventListener('click', function _unmuteTry() {
        if (!video.muted) { document.removeEventListener('click', _unmuteTry); return; }
        video.muted = false;
        video.play().then(() => {
            document.removeEventListener('click', _unmuteTry);
            const btn = document.getElementById('unmute_' + peerId);
            if (btn) btn.remove();
        }).catch(() => { video.muted = true; });
    }, { once: false });

    // הסתר overlay "ממתין"
    const overlay = document.getElementById('waitingOverlay');
    if (overlay) overlay.classList.add('hidden');

    _syncViewerCount();
}

function removeRemoteVideo(peerId) {
    const el = document.getElementById('rvc_' + peerId);
    if (el) el.remove();

    // אם אין יותר שותפים — הצג overlay
    if (document.getElementById('remoteVideos').children.length === 0) {
        const overlay = document.getElementById('waitingOverlay');
        if (overlay) overlay.classList.remove('hidden');
    }
    _syncViewerCount();
}

function _syncViewerCount() {
    const count = Object.keys(peerConns).length;
    const el = document.getElementById('vsViewersNum');
    if (el) el.textContent = count;
    viewersCount = count;
}

// =====================================================
// ===== פקדי וידאו (WebRTC — שליטה אמיתית) ===========
// =====================================================

// ===== פקדי וידאו (שליטה אמיתית ב-MediaStream) =====
function toggleMic() {
    isMicMuted = !isMicMuted;
    if (localStream) {
        localStream.getAudioTracks().forEach(t => { t.enabled = !isMicMuted; });
    }
    const btn  = document.getElementById('btnMic');
    const icon = document.getElementById('micIcon');
    btn.classList.toggle('muted', isMicMuted);
    icon.className = isMicMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
    vsToast(isMicMuted ? 'מיקרופון מושתק' : 'מיקרופון פעיל');
}

function toggleCamera() {
    isCameraOff = !isCameraOff;
    if (localStream) {
        localStream.getVideoTracks().forEach(t => { t.enabled = !isCameraOff; });
    }
    // אפקט חזותי על הוידאו המקומי
    const localVideo = document.getElementById('localVideo');
    if (localVideo) localVideo.style.opacity = isCameraOff ? '0' : '1';
    const btn  = document.getElementById('btnCamera');
    const icon = document.getElementById('cameraIcon');
    btn.classList.toggle('off', isCameraOff);
    icon.className = isCameraOff ? 'fas fa-video-slash' : 'fas fa-video';
    vsToast(isCameraOff ? 'מצלמה כבויה' : 'מצלמה פעילה');
}

async function toggleShare() {
    if (isSharing) {
        _stopScreenShare();
        return;
    }
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = screenStream.getVideoTracks()[0];
        isSharing = true;

        // החלף video track בכל חיבורי ה-peer
        Object.values(peerConns).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(screenTrack).catch(() => {});
        });

        // הצג מסך משותף בוידאו המקומי
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            const combined = new MediaStream([
                screenTrack,
                ...(localStream ? localStream.getAudioTracks() : [])
            ]);
            localVideo.srcObject = combined;
        }

        screenTrack.onended = () => _stopScreenShare();
        document.getElementById('btnShare').classList.add('active-share');
        vsToast('<i class="fas fa-desktop"></i> משתף מסך');
    } catch(e) {
        isSharing = false;
        vsToast('שיתוף מסך בוטל');
    }
}

function _stopScreenShare() {
    isSharing = false;
    if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
    }
    // החזר track מצלמה
    const camTrack = localStream?.getVideoTracks()[0];
    if (camTrack) {
        Object.values(peerConns).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(camTrack).catch(() => {});
        });
    }
    const localVideo = document.getElementById('localVideo');
    if (localVideo && localStream) localVideo.srcObject = localStream;
    document.getElementById('btnShare').classList.remove('active-share');
    vsToast('הופסק שיתוף מסך');
}

function toggleHand() {
    isHandRaised = !isHandRaised;
    const btn = document.getElementById('btnHand');
    btn.style.background = isHandRaised ? '#f59e0b' : '';
    vsToast(isHandRaised ? '<i class="fas fa-hand" style="color:#f59e0b;"></i> הרמת יד' : '<i class="fas fa-hand"></i> הורדת יד');

    if (sessionMode === 'shiur_viewer') {
        if (isHandRaised) {
            broadcastShiurCtrl('hand_raise', { userId: myViewerId, userName: window.vsUserName || 'צופה' });
        } else {
            broadcastShiurCtrl('hand_lower', { userId: myViewerId });
        }
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

function copyRoomLink() {
    const url = `${window.location.origin}/video-study.html?room=${roomId}&book=${encodeURIComponent(bookName)}&mode=chavruta`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => vsToast('<i class="fas fa-check" style="color:#22c55e;"></i> הקישור הועתק!')).catch(() => fallbackCopy(url));
    } else fallbackCopy(url);
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    vsToast('<i class="fas fa-check" style="color:#22c55e;"></i> הקישור הועתק!');
}

async function endSession() {
    if (!confirm('לסיים את שיחת הוידאו?')) return;
    clearInterval(timerInterval);
    removeDemoRoom(roomId);

    // סגירת החדר ב-DB (רק בעל החדר, לא מצב סמוי)
    if (vsSupabase && vsUserId && sessionMode !== 'stealth') {
        try {
            await vsSupabase.from('live_rooms')
                .update({ is_active: false, ended_at: new Date().toISOString() })
                .eq('id', roomId)
                .eq('host_user_id', vsUserId);
        } catch(e) { console.warn('Failed to close room in DB:', e); }
    }

    // הודעת עזיבה ל-peers
    if (signalChannel) {
        try {
            await signalChannel.send({
                type: 'broadcast', event: 'peer_leave',
                payload: { peerId: localPeerId }
            });
        } catch(e) {}
    }

    // עצור כל ה-tracks
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());

    // סגור כל חיבורי peer
    Object.keys(peerConns).forEach(closePeer);

    // נתק ערוצי Supabase
    const channels = [signalChannel, wbChannel, chatChannel, shiurCtrlChannel, shiurUpdatesChannel];
    channels.forEach(ch => { if (ch) { try { vsSupabase.removeChannel(ch); } catch(e){} } });

    if (sessionMode === 'shiur_viewer' && shiurCtrlChannel) {
        try { shiurCtrlChannel.send({ type: 'broadcast', event: 'viewer_leave', payload: { userId: myViewerId } }); } catch(e) {}
    }

    window.location.href = 'index.html#chavrutas';
}

// ===== מצב הצגה (presentation mode) =====
let presentationMode = null; // null | 'gemara' | 'whiteboard'

function togglePresentationMode(type) {
    const body = document.getElementById('vsBody');
    const gBtn = document.getElementById('presentGemaraBtn');
    const wBtn = document.getElementById('presentWbBtn');

    if (presentationMode === type) {
        // כבה מצב הצגה
        presentationMode = null;
        body.classList.remove('presentation-mode');
        if (gBtn) gBtn.classList.remove('active');
        if (wBtn) wBtn.classList.remove('active');
        if (gBtn) gBtn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i>';
        if (wBtn) wBtn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i>';
    } else {
        // הפעל מצב הצגה
        presentationMode = type;
        body.classList.add('presentation-mode');
        // עבור לטאב המתאים
        if (type === 'gemara') {
            switchTab('gemara', document.getElementById('tab-btn-gemara'));
            if (gBtn) { gBtn.classList.add('active'); gBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>'; }
            if (wBtn) wBtn.classList.remove('active');
        } else {
            switchTab('whiteboard', document.getElementById('tab-btn-whiteboard'));
            if (wBtn) { wBtn.classList.add('active'); wBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>'; }
            if (gBtn) gBtn.classList.remove('active');
            setTimeout(resizeCanvas, 350);
        }
    }
}

// ===== טיימר =====
let sessionReward20Given = false;

function startTimer() {
    sessionStartTime = Date.now();
    timerInterval = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        document.getElementById('vsTimerText').textContent = `${m}:${s}`;

        // פרס 5 זוזים על חברותא של 20+ דקות (פעם אחת בסשן)
        if (!sessionReward20Given && sessionMode === 'chavruta' && elapsed >= 20 * 60 && vsUserId && vsSupabase) {
            sessionReward20Given = true;
            try {
                const { data: cur } = await vsSupabase.from('profiles_public').select('reward_points').eq('id', vsUserId).maybeSingle();
                const newPts = Math.max(0, (cur?.reward_points || 0) + 5);
                await vsSupabase.from('profiles_public').update({ reward_points: newPts }).eq('id', vsUserId);
                vsToast('<i class="fas fa-coins" style="color:#fbbf24;"></i> קיבלת 5 זוזים על 20 דקות לימוד בחברותא! 🎉');
            } catch(e) { console.warn('reward 20min failed:', e); }
        }
    }, 1000);
}

// ===== טאבים =====
function switchTab(tabName, btn) {
    activeTab = tabName;

    // טאבים
    document.querySelectorAll('.vs-tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // פאנלים
    document.querySelectorAll('.vs-tab-pane').forEach(p => p.classList.remove('active'));
    const pane = document.getElementById('pane-' + tabName);
    if (pane) pane.classList.add('active');

    // איפוס badge צ'אט
    if (tabName === 'chat') {
        const badge = document.getElementById('chatBadge');
        badge.style.display = 'none';
        badge.textContent = '0';
    }

    // טעינת שיחות אישיות
    if (tabName === 'mychats') loadMyChats();

    // איפוס badge ניהול
    if (tabName === 'manage') {
        const badge = document.getElementById('manageBadge');
        if (badge) { badge.style.display = 'none'; badge.textContent = '0'; }
    }

    // גודל canvas כשנכנסים ללוח
    if (tabName === 'whiteboard') resizeCanvas();
}

// ===== גמרא – Sefaria =====
function populateSefariaBooks() {
    const sel = document.getElementById('sefariaBook');
    SEFARIA_BOOKS.forEach(b => {
        const opt = document.createElement('option');
        if (b.disabled) {
            opt.disabled = true;
            opt.textContent = b.label;
            opt.style.fontWeight = '800';
            opt.style.color = '#94a3b8';
        } else {
            opt.value = b.value;
            opt.textContent = b.label;
        }
        sel.appendChild(opt);
    });
}

function onSefariaBookChange() {
    const book = document.getElementById('sefariaBook').value;
    if (!book) return;
    const entry = SEFARIA_BOOKS.find(b => b.value === book);
    const pageSel = document.getElementById('sefariaPage');
    pageSel.innerHTML = '<option value="">דף...</option>';

    if (entry && entry.pages) {
        for (let i = 2; i <= entry.pages; i++) {
            const sides = [i + 'a', i + 'b'];
            sides.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                const side = s.endsWith('a') ? ' ע"א' : ' ע"ב';
                opt.textContent = parseInt(s) + side;
                pageSel.appendChild(opt);
            });
        }
    }
    loadSefaria();
}

function loadSefaria() {
    const book = document.getElementById('sefariaBook').value;
    if (!book) return;
    const page = document.getElementById('sefariaPage').value;

    showGemaraLoading(true);
    const bookEn = heToEn(book);
    let path = bookEn;
    if (page) {
        const ref = book + '.' + page;
        path = encodeURIComponent(ref).replace(/%20/g, '_');
    }
    const url = SEFARIA_BASE + path + '?lang=he&embed=1&highlight=0&interface=he';
    const iframe = document.getElementById('sefariaIframe');
    iframe.onload = () => showGemaraLoading(false);
    iframe.src = url;
}

function showGemaraLoading(show) {
    const skeleton = document.getElementById('gemaraSkeletonWrap');
    const iframe = document.getElementById('sefariaIframe');
    skeleton.style.display = show ? 'flex' : 'none';
    iframe.style.display = show ? 'none' : 'block';
}

function openSefariaNewTab() {
    const book = document.getElementById('sefariaBook').value;
    if (!book) { vsToast('בחר ספר קודם'); return; }
    const page = document.getElementById('sefariaPage').value;
    const bookEn = heToEn(book);
    let path = bookEn;
    if (page) path = encodeURIComponent(book + '.' + page).replace(/%20/g, '_');
    window.open(SEFARIA_BASE + path + '?lang=he', '_blank');
}

function autoLoadSefaria(name) {
    if (!name) return;
    const trimmed = name.replace(/^מסכת\s*/, '');
    const sel = document.getElementById('sefariaBook');
    for (let opt of sel.options) {
        if (opt.value && (opt.value === name || opt.value === trimmed || name.includes(opt.value) || opt.value.includes(trimmed))) {
            sel.value = opt.value;
            onSefariaBookChange();
            return;
        }
    }
    // טעינה ישירה גם בלי בחירה בתפריט
    showGemaraLoading(true);
    const url = SEFARIA_BASE + encodeURIComponent(name).replace(/%20/g, '_') + '?lang=he&embed=1';
    const iframe = document.getElementById('sefariaIframe');
    iframe.onload = () => showGemaraLoading(false);
    iframe.src = url;
}

function heToEn(name) {
    const map = {
        'ברכות': 'Berakhot', 'שבת': 'Shabbat', 'עירובין': 'Eruvin',
        'פסחים': 'Pesachim', 'ראש השנה': 'Rosh_Hashanah', 'יומא': 'Yoma',
        'סוכה': 'Sukkah', 'ביצה': 'Beitzah', 'תענית': 'Taanit',
        'מגילה': 'Megillah', 'מועד קטן': 'Moed_Katan', 'חגיגה': 'Chagigah',
        'יבמות': 'Yevamot', 'כתובות': 'Ketubot', 'נדרים': 'Nedarim',
        'גיטין': 'Gittin', 'קידושין': 'Kiddushin', 'בבא קמא': 'Bava_Kamma',
        'בבא מציעא': 'Bava_Metzia', 'בבא בתרא': 'Bava_Batra',
        'סנהדרין': 'Sanhedrin', 'מכות': 'Makkot', 'שבועות': 'Shevuot',
        'עבודה זרה': 'Avodah_Zarah', 'חולין': 'Chullin', 'בכורות': 'Bekhorot',
        'נידה': 'Niddah',
        'בראשית': 'Genesis', 'שמות': 'Exodus', 'ויקרא': 'Leviticus',
        'במדבר': 'Numbers', 'דברים': 'Deuteronomy',
        'Mishneh_Torah': 'Mishneh_Torah',
    };
    return map[name] || encodeURIComponent(name).replace(/%20/g, '_');
}

// ===== הערות iframe =====
function onNotesLoaded() {
    document.getElementById('notesLoadingWrap').style.display = 'none';
    document.getElementById('notesIframe').style.display = 'block';
}

// ===== לוח ציור =====
function initWhiteboard() {
    wbCanvas = document.getElementById('whiteboardCanvas');
    wbCtx = wbCanvas.getContext('2d');
    const wrap = document.getElementById('wbWrap');

    // resize אוטומטי
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(wrap);

    // עכבר
    wbCanvas.addEventListener('mousedown', wbStart);
    wbCanvas.addEventListener('mousemove', wbMove);
    wbCanvas.addEventListener('mouseup', wbEnd);
    wbCanvas.addEventListener('mouseleave', wbEnd);

    // מגע
    wbCanvas.addEventListener('touchstart', e => { e.preventDefault(); wbStart(e.touches[0]); }, { passive: false });
    wbCanvas.addEventListener('touchmove',  e => { e.preventDefault(); wbMove(e.touches[0]); }, { passive: false });
    wbCanvas.addEventListener('touchend',   e => { e.preventDefault(); wbEnd(); }, { passive: false });

    // קליק לטקסט
    wbCanvas.addEventListener('click', wbCanvasClick);
}

function resizeCanvas() {
    if (!wbCanvas) return;
    const wrap = document.getElementById('wbWrap');
    const img = wbCtx ? wbCanvas.toDataURL() : null;
    wbCanvas.width  = wrap.clientWidth;
    wbCanvas.height = wrap.clientHeight;
    if (img) {
        const i = new Image();
        i.onload = () => wbCtx.drawImage(i, 0, 0);
        i.src = img;
    }
}

function getPos(e) {
    const rect = wbCanvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (wbCanvas.width / rect.width),
        y: (e.clientY - rect.top)  * (wbCanvas.height / rect.height)
    };
}

function wbStart(e) {
    if (wbTool === 'text') return;
    isDrawing = true;
    const p = getPos(e);
    lastX = p.x; lastY = p.y;
    wbCtx.beginPath();
    wbCtx.moveTo(lastX, lastY);
    broadcastDraw({ type: 'start', x: lastX, y: lastY, tool: wbTool, color: wbColor, size: wbSize });
}

function wbMove(e) {
    if (!isDrawing || wbTool === 'text') return;
    const p = getPos(e);
    wbCtx.lineWidth = wbTool === 'eraser' ? wbSize * 5 : (wbTool === 'marker' ? wbSize * 3 : wbSize);
    wbCtx.strokeStyle = wbTool === 'eraser' ? '#ffffff' : wbColor;
    wbCtx.globalAlpha = wbTool === 'marker' ? 0.4 : 1;
    wbCtx.lineCap = 'round';
    wbCtx.lineJoin = 'round';
    wbCtx.lineTo(p.x, p.y);
    wbCtx.stroke();
    wbCtx.beginPath();
    wbCtx.moveTo(p.x, p.y);
    lastX = p.x; lastY = p.y;

    broadcastDraw({ tool: wbTool, color: wbColor, size: wbSize, x: lastX, y: lastY, type: 'move' });
}

function wbEnd() {
    if (!isDrawing) return;
    isDrawing = false;
    wbCtx.globalAlpha = 1;
    broadcastDraw({ type: 'end' });
}

function wbCanvasClick(e) {
    if (wbTool !== 'text') return;
    const p = getPos(e);
    pendingTextX = p.x;
    pendingTextY = p.y;
    showWbTextInput(p.x, p.y);
}

function showWbTextInput(x, y) {
    const input  = document.getElementById('wbTextInput');
    const handle = document.getElementById('wbTextHandle');
    const wrap   = document.getElementById('wbWrap');
    const rect   = wrap.getBoundingClientRect();
    const scale  = wbCanvas.width / rect.width;

    const screenX = x / scale;
    const screenY = y / scale;

    input.style.left     = screenX + 'px';
    input.style.top      = screenY + 'px';
    input.style.color    = wbColor;
    input.style.fontSize = (14 + wbSize * 2) + 'px';
    input.style.display  = 'block';
    input.innerHTML      = '';

    if (handle) {
        handle.style.left    = screenX + 'px';
        handle.style.top     = (screenY - 20) + 'px';
        handle.style.display = 'flex';
    }

    // brief timeout so the element is visible before focus
    setTimeout(() => { try { input.focus(); } catch(e) {} }, 20);
    wbTextActive = true;

    function commitText() {
        const text = (input.innerText || input.textContent || '').trim();
        const cx = parseFloat(input.style.left) * scale;
        const cy = parseFloat(input.style.top)  * scale;
        if (text) {
            const fontSize = 14 + wbSize * 2;
            wbCtx.font = `${fontSize}px Assistant, sans-serif`;
            wbCtx.fillStyle = wbColor;
            wbCtx.globalAlpha = 1;
            wbCtx.direction = 'rtl';
            wbCtx.fillText(text, cx, cy + fontSize);
            broadcastDraw({ type: 'text', text, x: cx, y: cy, color: wbColor, size: wbSize });
        }
        input.style.display  = 'none';
        input.innerHTML      = '';
        if (handle) handle.style.display = 'none';
        wbTextActive = false;
    }

    input.onblur = () => { setTimeout(commitText, 120); };
    input.onkeydown = e => {
        if (e.key === 'Escape') { input.innerHTML = ''; input.blur(); }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { input.blur(); }
        e.stopPropagation();
    };

    // Drag via handle
    if (handle) {
        handle.onmousedown = (ev) => {
            ev.preventDefault();
            const startMX = ev.clientX, startMY = ev.clientY;
            const startL  = parseFloat(input.style.left)  || 0;
            const startT  = parseFloat(input.style.top)   || 0;
            function onMove(me) {
                const dx = me.clientX - startMX, dy = me.clientY - startMY;
                input.style.left  = (startL + dx) + 'px';
                input.style.top   = (startT + dy) + 'px';
                handle.style.left = (startL + dx) + 'px';
                handle.style.top  = (startT + dy - 20) + 'px';
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                input.focus();
            }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        };
    }
}

function setWbTool(tool) {
    wbTool = tool;
    document.querySelectorAll('.wb-tool').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('wbt-' + tool);
    if (btn) btn.classList.add('active');
    document.getElementById('wbWrap').style.cursor =
        tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair';
}

function setWbColor(color) {
    wbColor = color;
    document.querySelectorAll('.wb-color-swatch').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.wb-color-swatch[data-c="${color}"]`);
    if (btn) btn.classList.add('active');
}

function setWbSize(size, btn) {
    wbSize = size;
    document.querySelectorAll('.wb-size-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function clearWhiteboard() {
    if (!confirm('לנקות את כל הלוח?')) return;
    wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
    broadcastDraw({ type: 'clear' });
}

function saveWhiteboardPNG() {
    const link = document.createElement('a');
    link.download = `לוח-לימוד-${bookName}-${new Date().toLocaleDateString('he-IL')}.png`;
    link.href = wbCanvas.toDataURL('image/png');
    link.click();
}

// ===== sync לוח ציור =====
function initWhiteboardSync() {
    if (!vsSupabase) return;
    try {
        wbChannel = vsSupabase.channel('wb_' + roomId);
        wbChannel.on('broadcast', { event: 'draw' }, ({ payload }) => {
            applyRemoteDraw(payload);
        }).subscribe();
    } catch(e) { console.warn('WB sync error:', e); }
}

function broadcastDraw(data) {
    if (!wbChannel) return;
    try { wbChannel.send({ type: 'broadcast', event: 'draw', payload: data }); } catch(e) {}
}

function applyRemoteDraw(d) {
    if (!wbCtx) return;
    if (d.type === 'clear') {
        wbCtx.clearRect(0, 0, wbCanvas.width, wbCanvas.height);
    } else if (d.type === 'start') {
        wbCtx.beginPath();
        wbCtx.moveTo(d.x, d.y);
    } else if (d.type === 'move') {
        wbCtx.lineWidth  = d.tool === 'eraser' ? d.size * 5 : (d.tool === 'marker' ? d.size * 3 : d.size);
        wbCtx.strokeStyle = d.tool === 'eraser' ? '#ffffff' : d.color;
        wbCtx.globalAlpha = d.tool === 'marker' ? 0.4 : 1;
        wbCtx.lineCap = 'round';
        wbCtx.lineJoin = 'round';
        wbCtx.lineTo(d.x, d.y);
        wbCtx.stroke();
        wbCtx.beginPath();
        wbCtx.moveTo(d.x, d.y);
    } else if (d.type === 'end') {
        wbCtx.globalAlpha = 1;
        wbCtx.beginPath();
    } else if (d.type === 'text') {
        wbCtx.font = `${(14 + d.size * 2)}px Assistant, sans-serif`;
        wbCtx.fillStyle = d.color;
        wbCtx.globalAlpha = 1;
        wbCtx.direction = 'rtl';
        wbCtx.fillText(d.text, d.x, d.y + 14 + d.size * 2);
    }
}

// ===== צ'אט בוידאו =====
function initChatChannel() {
    if (!vsSupabase) return;
    try {
        chatChannel = vsSupabase.channel('vschat_' + roomId);
        chatChannel.on('broadcast', { event: 'msg' }, ({ payload }) => {
            appendChatMessage(payload, false);
            // badge אם הטאב סגור
            if (activeTab !== 'chat') {
                const badge = document.getElementById('chatBadge');
                const count = (parseInt(badge.textContent) || 0) + 1;
                badge.textContent = count;
                badge.style.display = 'flex';
            }
        }).subscribe();
    } catch(e) { console.warn('Chat channel error:', e); }
}

function sendVsChat() {
    if (!isChatEnabled && sessionMode !== 'shiur_teacher') {
        vsToast('הצ\'אט כבוי על ידי המשדר');
        return;
    }
    const input = document.getElementById('vsChatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const msg = {
        text,
        sender: window.vsUserName || 'אני',
        time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        mine: true
    };
    appendChatMessage(msg, true);
    if (chatChannel) {
        try {
            chatChannel.send({ type: 'broadcast', event: 'msg', payload: { ...msg, mine: false } });
        } catch(e) {}
    }
}

function appendChatMessage(msg, isMine) {
    const container = document.getElementById('vsChatMessages');
    const div = document.createElement('div');
    div.className = 'vs-msg ' + (isMine ? 'mine' : 'theirs');
    if (!isMine && msg.sender) {
        const s = document.createElement('div');
        s.className = 'vs-msg-sender';
        s.textContent = msg.sender;
        s.style.cssText = 'font-size:0.68rem;font-weight:800;color:#ca8a04;margin-bottom:2px;';
        div.appendChild(s);
    }
    const t = document.createElement('div');
    t.textContent = msg.text;
    div.appendChild(t);
    if (msg.time) {
        const tm = document.createElement('div');
        tm.className = 'vs-msg-time';
        tm.textContent = msg.time;
        div.appendChild(tm);
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ===== שידור חי – ניהול =====
let shiurCtrlChannel = null;
let shiurUpdatesChannel = null;
let myViewerId = '';
let isMicGranted = false;
let isChatEnabled = true;
let isWbLocked = false;
let raisedHands = {};
let connectedViewers = {};
let isSubscribedToUpdates = false;

function initShiurChannel() {
    if (!vsSupabase) return;
    if (sessionMode !== 'shiur_teacher' && sessionMode !== 'shiur_viewer') return;

    myViewerId = sessionMode === 'shiur_viewer'
        ? 'v_' + Math.random().toString(36).substr(2, 8)
        : 'teacher';

    try {
        shiurCtrlChannel = vsSupabase.channel('shiur_ctrl_' + roomId);

        shiurCtrlChannel.on('broadcast', { event: 'hand_raise' }, ({ payload }) => {
            if (sessionMode === 'shiur_teacher') {
                raisedHands[payload.userId] = payload.userName;
                renderHandRaisesList();
            }
        });

        shiurCtrlChannel.on('broadcast', { event: 'hand_lower' }, ({ payload }) => {
            if (sessionMode === 'shiur_teacher') {
                delete raisedHands[payload.userId];
                renderHandRaisesList();
            }
        });

        shiurCtrlChannel.on('broadcast', { event: 'mic_grant' }, ({ payload }) => {
            if (sessionMode === 'shiur_viewer' && payload.userId === myViewerId) {
                isMicGranted = true;
                setViewerMicLock(false);
                vsToast('<i class="fas fa-microphone" style="color:#22c55e;"></i> המשדר פתח לך מיקרופון');
                isHandRaised = false;
                document.getElementById('btnHand').style.background = '';
            }
        });

        shiurCtrlChannel.on('broadcast', { event: 'mic_revoke' }, ({ payload }) => {
            if (sessionMode === 'shiur_viewer' && payload.userId === myViewerId) {
                isMicGranted = false;
                setViewerMicLock(true);
                vsToast('<i class="fas fa-microphone-slash" style="color:#ef4444;"></i> המשדר ביטל את הרשאת המיקרופון');
            }
        });

        shiurCtrlChannel.on('broadcast', { event: 'chat_toggle' }, ({ payload }) => {
            isChatEnabled = payload.enabled;
            applyShiurChatState();
        });

        shiurCtrlChannel.on('broadcast', { event: 'wb_lock' }, ({ payload }) => {
            isWbLocked = payload.locked;
            applyWhiteboardLock();
        });

        shiurCtrlChannel.on('broadcast', { event: 'sefaria_sync' }, ({ payload }) => {
            if (sessionMode === 'shiur_viewer') {
                const bookSel = document.getElementById('sefariaBook');
                const pageSel = document.getElementById('sefariaPage');
                if (bookSel && payload.book) {
                    bookSel.value = payload.book;
                    onSefariaBookChange();
                }
                if (pageSel && payload.page) {
                    setTimeout(() => { pageSel.value = payload.page; loadSefaria(); }, 400);
                }
                vsToast('<i class="fas fa-book-open"></i> המשדר פתח: ' + payload.book + (payload.page ? ' ' + payload.page : ''));
                switchTab('gemara', document.getElementById('tab-btn-gemara'));
            }
        });

        shiurCtrlChannel.on('broadcast', { event: 'viewer_join' }, ({ payload }) => {
            if (sessionMode === 'shiur_teacher') {
                connectedViewers[payload.userId] = payload.userName;
                renderViewersList();
                updateViewerCount();
            }
        });

        shiurCtrlChannel.on('broadcast', { event: 'viewer_leave' }, ({ payload }) => {
            if (sessionMode === 'shiur_teacher') {
                delete connectedViewers[payload.userId];
                delete raisedHands[payload.userId];
                renderHandRaisesList();
                renderViewersList();
                updateViewerCount();
            }
        });

        shiurCtrlChannel.subscribe();

        if (sessionMode === 'shiur_viewer') {
            setTimeout(() => {
                shiurCtrlChannel.send({ type: 'broadcast', event: 'viewer_join',
                    payload: { userId: myViewerId, userName: window.vsUserName || 'צופה' } });
            }, 1500);
        }
    } catch(e) { console.warn('Shiur ctrl channel error:', e); }
}

function broadcastShiurCtrl(event, payload) {
    if (!shiurCtrlChannel) return;
    try { shiurCtrlChannel.send({ type: 'broadcast', event, payload }); } catch(e) {}
}

function setViewerMicLock(locked) {
    // שליטה אמיתית ב-tracks
    if (localStream) {
        localStream.getAudioTracks().forEach(t => { t.enabled = !locked; });
        localStream.getVideoTracks().forEach(t => { t.enabled = !locked; });
    }
    isMicMuted = locked;
    isCameraOff = locked;

    const btnMic  = document.getElementById('btnMic');
    const btnCam  = document.getElementById('btnCamera');
    const notice  = document.getElementById('viewerMicLockNotice');
    const micIcon = document.getElementById('micIcon');
    const camIcon = document.getElementById('cameraIcon');

    if (btnMic) {
        btnMic.disabled = locked;
        btnMic.style.opacity = locked ? '0.4' : '1';
        btnMic.title = locked ? 'מיקרופון נעול — הרם יד לבקשת רשות' : 'מיקרופון';
    }
    if (btnCam) {
        btnCam.disabled = locked;
        btnCam.style.opacity = locked ? '0.4' : '1';
        btnCam.title = locked ? 'מצלמה נעולה' : 'מצלמה';
    }
    if (micIcon) micIcon.className = locked ? 'fas fa-microphone-slash' : 'fas fa-microphone';
    if (camIcon) camIcon.className = locked ? 'fas fa-video-slash' : 'fas fa-video';
    if (notice)  notice.style.display = locked ? 'flex' : 'none';
}

function applyShiurChatState() {
    const chatPane = document.getElementById('pane-chat');
    const chatInput = document.querySelector('#pane-chat .vs-chat-input');
    const chatSend = document.querySelector('#pane-chat .vs-chat-send');
    const chatDisabledBanner = document.getElementById('chatDisabledBanner');
    if (!chatPane) return;
    if (chatInput) { chatInput.disabled = !isChatEnabled; chatInput.placeholder = isChatEnabled ? 'הקלד הודעה...' : 'הצ\'אט כבוי על ידי המשדר'; }
    if (chatSend) chatSend.disabled = !isChatEnabled;
    if (chatDisabledBanner) chatDisabledBanner.style.display = isChatEnabled ? 'none' : 'flex';

    if (sessionMode === 'shiur_teacher') {
        const toggle = document.getElementById('chatToggleSwitch');
        if (toggle) toggle.checked = isChatEnabled;
    }
}

function applyWhiteboardLock() {
    const wbCanvas = document.getElementById('whiteboardCanvas');
    const wbLockBanner = document.getElementById('wbLockBanner');
    const isTeacher = sessionMode === 'shiur_teacher';
    const canDraw = isTeacher || !isWbLocked;
    if (wbCanvas) wbCanvas.style.pointerEvents = canDraw ? 'auto' : 'none';
    if (wbLockBanner) wbLockBanner.style.display = (isWbLocked && !isTeacher) ? 'flex' : 'none';
    if (sessionMode === 'shiur_teacher') {
        const toggle = document.getElementById('wbLockSwitch');
        if (toggle) toggle.checked = isWbLocked;
    }
}

function renderHandRaisesList() {
    const list = document.getElementById('handRaisesList');
    if (!list) return;
    const keys = Object.keys(raisedHands);
    if (keys.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:8px;">אין ידיים מורמות</p>';
        return;
    }
    list.innerHTML = keys.map(uid => `
        <div class="manage-viewer-row">
            <span><i class="fas fa-hand-paper" style="color:#f59e0b;margin-left:6px;"></i>${raisedHands[uid]}</span>
            <div style="display:flex;gap:4px;">
                <button class="manage-btn-sm manage-btn-green" onclick="grantMic('${uid}')"><i class="fas fa-microphone"></i> פתח מיק</button>
                <button class="manage-btn-sm manage-btn-red" onclick="lowerHand('${uid}')"><i class="fas fa-hand-paper"></i> הורד</button>
            </div>
        </div>`).join('');
    const badge = document.getElementById('manageBadge');
    if (badge) { badge.textContent = keys.length; badge.style.display = 'flex'; }
}

function renderViewersList() {
    const list = document.getElementById('viewersList');
    if (!list) return;
    const keys = Object.keys(connectedViewers);
    list.innerHTML = keys.length === 0
        ? '<p style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:8px;">אין צופים מחוברים</p>'
        : keys.map(uid => `
            <div class="manage-viewer-row">
                <span><i class="fas fa-user" style="margin-left:6px;color:#64748b;"></i>${connectedViewers[uid]}</span>
                <button class="manage-btn-sm manage-btn-blue" onclick="grantMic('${uid}')">מיק</button>
            </div>`).join('');
}

function updateViewerCount() {
    const count = Object.keys(connectedViewers).length;
    const el = document.getElementById('vsViewersNum');
    if (el) el.textContent = count;
    viewersCount = count;
}

function grantMic(userId) {
    broadcastShiurCtrl('mic_grant', { userId });
    delete raisedHands[userId];
    renderHandRaisesList();
    vsToast('<i class="fas fa-microphone" style="color:#22c55e;"></i> פתחת מיקרופון ל-' + (connectedViewers[userId] || userId));
}

function lowerHand(userId) {
    broadcastShiurCtrl('hand_lower', { userId });
    delete raisedHands[userId];
    renderHandRaisesList();
}

function toggleShiurChat() {
    if (sessionMode !== 'shiur_teacher') return;
    isChatEnabled = !isChatEnabled;
    broadcastShiurCtrl('chat_toggle', { enabled: isChatEnabled });
    applyShiurChatState();
    vsToast(isChatEnabled ? '<i class="fas fa-comments" style="color:#22c55e;"></i> צ\'אט הופעל' : '<i class="fas fa-comment-slash" style="color:#ef4444;"></i> צ\'אט כובה');
}

function toggleWbLock() {
    if (sessionMode !== 'shiur_teacher') return;
    isWbLocked = !isWbLocked;
    broadcastShiurCtrl('wb_lock', { locked: isWbLocked });
    applyWhiteboardLock();
    vsToast(isWbLocked ? '<i class="fas fa-lock" style="color:#f59e0b;"></i> לוח ציור נעול לצופים' : '<i class="fas fa-lock-open" style="color:#22c55e;"></i> לוח ציור פתוח לכולם');
}

function broadcastCurrentSefaria() {
    if (sessionMode !== 'shiur_teacher') return;
    const book = document.getElementById('sefariaBook').value;
    const page = document.getElementById('sefariaPage').value;
    if (!book) { vsToast('בחר ספר קודם'); return; }
    broadcastShiurCtrl('sefaria_sync', { book, page });
    vsToast('<i class="fas fa-book-open"></i> שידרת את הספר לצופים');
}

function subscribeToUpdates() {
    if (!vsSupabase) return;
    if (isSubscribedToUpdates) { vsToast('כבר רשום לעדכונים'); return; }
    try {
        shiurUpdatesChannel = vsSupabase.channel('shiur_updates_' + roomId);
        shiurUpdatesChannel.on('broadcast', { event: 'update' }, ({ payload }) => {
            showShiurUpdate(payload.message);
        }).subscribe();
        isSubscribedToUpdates = true;
        vsToast('<i class="fas fa-bell" style="color:#22c55e;"></i> נרשמת לעדכוני השיעור');
        const btn = document.getElementById('btnSubscribeUpdates');
        if (btn) { btn.style.background = '#22c55e'; btn.title = 'רשום לעדכונים'; }
    } catch(e) { vsToast('שגיאה בהרשמה'); }
}

function sendShiurUpdate() {
    if (sessionMode !== 'shiur_teacher' || !shiurCtrlChannel) return;
    const msg = document.getElementById('shiurUpdateText')?.value?.trim();
    if (!msg) { vsToast('הכנס הודעת עדכון'); return; }
    broadcastShiurCtrl('update', { message: msg });
    showShiurUpdate(msg);
    const input = document.getElementById('shiurUpdateText');
    if (input) input.value = '';
    vsToast('<i class="fas fa-paper-plane"></i> עדכון נשלח לצופים');
}

function showShiurUpdate(message) {
    const notif = document.createElement('div');
    notif.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:#0f172a;color:white;padding:12px 20px;border-radius:12px;z-index:9000;font-size:0.87rem;font-weight:600;max-width:340px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.12);';
    notif.innerHTML = `<i class="fas fa-bell" style="color:#fbbf24;margin-left:6px;"></i> ${message} <button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;margin-right:8px;font-size:1rem;">×</button>`;
    document.body.appendChild(notif);
    setTimeout(() => { try { notif.remove(); } catch(e) {} }, 8000);
}

// פתיחת/סגירת פאנל ניהול מהיר (מובייל)
function openShiurSidebar() {
    const sidebar = document.getElementById('shiurSidebar');
    if (sidebar) sidebar.classList.toggle('sidebar-open');
}

// ===== מגיד שיעור =====
function openCreateShiurModal() {
    document.getElementById('createShiurModal').style.display = 'flex';
}

async function createShiurRoom() {
    const title = document.getElementById('shiurTitle').value.trim();
    const book  = document.getElementById('shiurBook').value.trim() || bookName;
    const isPublic = document.getElementById('shiurPublic').checked;

    if (!title) { vsToast('יש להזין כותרת לשיעור'); return; }

    const newRoomId = 'beithamidrash-shiur-' + Date.now();
    const shiurRoom = {
        id: newRoomId,
        book,
        title,
        participants: [window.vsUserName || 'מגיד שיעור'],
        startTime: Date.now(),
        type: 'shiur',
        isPublic,
        viewers: 0,
        active: true
    };

    saveDemoRoom(shiurRoom);

    // שמירה ב-DB
    if (vsSupabase && vsUserId) {
        try {
            await vsSupabase.from('live_rooms').upsert({
                id: newRoomId,
                book,
                title,
                host_user_id: vsUserId,
                host_name: window.vsUserName || 'מגיד שיעור',
                participants: [window.vsUserName || 'מגיד שיעור'],
                session_type: 'shiur',
                is_public: isPublic,
                is_active: true,
                viewers_count: 0,
                started_at: new Date().toISOString()
            }, { onConflict: 'id', ignoreDuplicates: true });
        } catch(e) { console.warn('DB shiur room register failed:', e); }
    }

    document.getElementById('createShiurModal').style.display = 'none';
    vsToast('<i class="fas fa-check" style="color:#22c55e;"></i> השיעור נפתח' + (isPublic ? ' ופורסם לכולם' : ' (פרטי)'));

    // מעבר לחדר השיעור
    const url = `video-study.html?room=${newRoomId}&book=${encodeURIComponent(book)}&mode=shiur_teacher&partner=${encodeURIComponent(title)}`;
    setTimeout(() => window.location.href = url, 800);
}

// ===== ניהול חדרי וידאו =====
function generateRoomId() {
    return 'beithamidrash-' + Math.random().toString(36).substr(2, 9);
}

function getDemoRooms() {
    try { return JSON.parse(localStorage.getItem(DEMO_ROOMS_KEY) || '[]'); } catch(e) { return []; }
}

function saveDemoRooms(rooms) {
    localStorage.setItem(DEMO_ROOMS_KEY, JSON.stringify(rooms));
}

// רישום החדר גם ב-localStorage (לתאימות) וגם ב-Supabase
async function registerDemoRoom() {
    const rooms = getDemoRooms();
    const isShiur = sessionMode.startsWith('shiur');
    const participants = [];
    if (window.vsUserName) participants.push(window.vsUserName);
    if (partnerName && partnerName !== window.vsUserName) participants.push(partnerName);
    const roomData = {
        id: roomId,
        book: bookName,
        title: partnerName || bookName,
        participants: participants.length ? participants : ['לומד'],
        startTime: Date.now(),
        type: isShiur ? 'shiur' : 'chavruta',
        isPublic: sessionMode === 'shiur_teacher',
        viewers: 0,
        active: true
    };
    if (!rooms.find(r => r.id === roomId)) {
        rooms.push(roomData);
        saveDemoRooms(rooms);
    }

    // שמירה ב-Supabase DB
    if (vsSupabase && vsUserId) {
        try {
            await vsSupabase.from('live_rooms').upsert({
                id: roomId,
                book: bookName,
                title: partnerName || bookName,
                host_user_id: vsUserId,
                host_name: window.vsUserName || 'לומד',
                participants: participants.length ? participants : ['לומד'],
                session_type: isShiur ? 'shiur' : 'chavruta',
                is_public: sessionMode === 'shiur_teacher',
                is_active: true,
                viewers_count: 0,
                started_at: new Date().toISOString()
            }, { onConflict: 'id', ignoreDuplicates: true });
        } catch(e) { console.warn('DB room register failed:', e); }
    }
}

function saveDemoRoom(room) {
    const rooms = getDemoRooms();
    rooms.push(room);
    saveDemoRooms(rooms);
}

function removeDemoRoom(id) {
    const rooms = getDemoRooms().filter(r => r.id !== id);
    saveDemoRooms(rooms);
}

// ===== שיחות מהירות תוך כדי שיעור =====
let quickChatPartnerEmail = null;
let quickChatConnId = null;
let quickChatPollTimer = null;

function loadMyChats() {
    const container = document.getElementById('vsMyChats');
    if (!container) return;
    try {
        const chavrutas = JSON.parse(localStorage.getItem('torahApp_chavrutas') || '[]');
        const unread = JSON.parse(localStorage.getItem('torahApp_unread') || '{}');
        if (chavrutas.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:0.8rem;padding:20px 10px;"><i class="fas fa-users" style="display:block;margin-bottom:6px;font-size:1.5rem;opacity:0.4;"></i>אין חברותות עדיין</div>';
            return;
        }
        const seen = new Map();
        chavrutas.forEach(c => { if (!seen.has(c.partnerId)) seen.set(c.partnerId, c); });
        container.innerHTML = [...seen.values()].map(c => {
            const unreadCount = unread[c.email] || 0;
            const badge = unreadCount > 0 ? `<span style="background:#ef4444;color:white;border-radius:50%;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;">${unreadCount}</span>` : '';
            return `<div onclick="openQuickChat('${c.email}','${(c.name||'חברותא').replace(/'/g,"\\'")}','${c.id||''}')" style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:10px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background=''">
                <div style="width:34px;height:34px;border-radius:50%;background:#e0f2fe;display:flex;align-items:center;justify-content:center;font-weight:700;color:#0369a1;flex-shrink:0;">${(c.name||'?').charAt(0)}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.83rem;color:#1e293b;">${c.name||'חברותא'}</div>
                    <div style="font-size:0.72rem;color:#94a3b8;">${c.book||''}</div>
                </div>
                ${badge}
            </div>`;
        }).join('');
    } catch(e) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:0.8rem;padding:10px;">שגיאה בטעינה</div>';
    }
}

async function openQuickChat(email, name, connId) {
    quickChatPartnerEmail = email;
    quickChatConnId = connId;
    document.getElementById('vsQuickChatName').textContent = name;
    document.getElementById('vsQuickChatArea').style.display = 'flex';
    document.getElementById('vsQuickChatArea').style.flexDirection = 'column';
    document.getElementById('vsMyChats').style.display = 'none';

    const messagesDiv = document.getElementById('vsQuickChatMessages');
    messagesDiv.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:10px;font-size:0.8rem;">טוען...</div>';

    if (vsSupabase && connId) {
        try {
            const { data } = await vsSupabase.from('chat_private')
                .select('id, sender_id, content, created_at')
                .eq('connection_id', connId)
                .order('created_at', { ascending: true })
                .limit(30);
            renderQuickChatMessages(data || []);
        } catch(e) { messagesDiv.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:10px;font-size:0.8rem;">שגיאה בטעינה</div>'; }
    } else {
        messagesDiv.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:10px;font-size:0.8rem;">שלח הודעה ראשונה</div>';
    }
    startQuickChatPoll();
}

function renderQuickChatMessages(msgs) {
    const container = document.getElementById('vsQuickChatMessages');
    if (!container) return;
    const myUserId = (() => { try { return JSON.parse(localStorage.getItem('torahApp_user')||'{}').id||''; } catch(e){return '';} })();
    if (msgs.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:10px;font-size:0.8rem;">אין הודעות עדיין</div>';
        return;
    }
    container.innerHTML = msgs.map(msg => {
        const isMe = msg.sender_id === myUserId;
        const time = new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        const content = (msg.content || '').startsWith('__DELETED__:') ? '<em style="opacity:0.5;">ההודעה נמחקה</em>' : msg.content;
        return `<div id="qmsg-${msg.id}" style="max-width:80%;align-self:${isMe?'flex-end':'flex-start'};">
            <div style="background:${isMe?'#D3E3FD':'#F2F2F2'};color:#1a1a2e;padding:8px 12px;border-radius:${isMe?'18px 18px 18px 4px':'18px 4px 18px 18px'};font-size:0.85rem;word-break:break-word;line-height:1.45;">${content}</div>
            <div style="font-size:0.62rem;color:#94a3b8;margin-top:2px;text-align:${isMe?'left':'right'};">${time}</div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendQuickChat() {
    const input = document.getElementById('vsQuickChatInput');
    const text = input.value.trim();
    if (!text || !quickChatPartnerEmail || !vsSupabase) return;
    input.value = '';

    const myUser = (() => { try { return JSON.parse(localStorage.getItem('torahApp_user')||'{}'); } catch(e){return {};} })();
    const payload = {
        content: text,
        created_at: new Date().toISOString(),
        sender_id: myUser.id || '',
        sender_email: myUser.email || '',
        connection_id: quickChatConnId || undefined
    };

    try {
        await vsSupabase.from('chat_private').insert([payload]);
        const container = document.getElementById('vsQuickChatMessages');
        if (container) {
            const time = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
            container.insertAdjacentHTML('beforeend', `<div style="max-width:80%;align-self:flex-end;"><div style="background:#D3E3FD;color:#1a1a2e;padding:8px 12px;border-radius:18px 18px 18px 4px;font-size:0.85rem;word-break:break-word;line-height:1.45;">${text}</div><div style="font-size:0.62rem;color:#94a3b8;margin-top:2px;text-align:left;">${time}</div></div>`);
            container.scrollTop = container.scrollHeight;
        }
    } catch(e) { vsToast('שגיאה בשליחת הודעה'); }
}

function closeQuickChat() {
    quickChatPartnerEmail = null;
    document.getElementById('vsQuickChatArea').style.display = 'none';
    document.getElementById('vsMyChats').style.display = 'block';
    clearTimeout(quickChatPollTimer);
}

function startQuickChatPoll() {
    clearTimeout(quickChatPollTimer);
    quickChatPollTimer = setTimeout(async () => {
        if (!quickChatPartnerEmail || !quickChatConnId || !vsSupabase) return;
        try {
            const container = document.getElementById('vsQuickChatMessages');
            const lastId = container?.querySelector('[id^="qmsg-"]:last-child')?.id?.replace('qmsg-','');
            const query = vsSupabase.from('chat_private').select('id, sender_id, content, created_at').eq('connection_id', quickChatConnId).order('created_at', { ascending: true }).limit(10);
            if (lastId) query.gt('id', lastId);
            const { data } = await query;
            if (data && data.length > 0) {
                const myId = (() => { try { return JSON.parse(localStorage.getItem('torahApp_user')||'{}').id||''; } catch(e){return '';} })();
                data.forEach(msg => {
                    if (msg.sender_id !== myId && !document.getElementById('qmsg-'+msg.id)) {
                        const time = new Date(msg.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                        container.insertAdjacentHTML('beforeend', `<div id="qmsg-${msg.id}" style="max-width:80%;align-self:flex-start;"><div style="background:#f1f5f9;color:#334155;padding:6px 10px;border-radius:10px;font-size:0.82rem;">${msg.content||''}</div><div style="font-size:0.62rem;color:#94a3b8;margin-top:2px;">${time}</div></div>`);
                        container.scrollTop = container.scrollHeight;
                    }
                });
            }
        } catch(e) {}
        startQuickChatPoll();
    }, 5000);
}

// ===== פאנל — desktop + mobile =====
let desktopPanelOpen = true;

function toggleDesktopPanel() {
    const panel   = document.getElementById('vsPanel');
    const arrowEl = document.getElementById('panelArrowIcon');
    const isMobile = window.innerWidth <= 768;
    if (isMobile) { toggleMobilePanel(); return; }
    desktopPanelOpen = !desktopPanelOpen;
    panel.style.width    = desktopPanelOpen ? '' : '0';
    panel.style.overflow = desktopPanelOpen ? '' : 'hidden';
    panel.style.minWidth = desktopPanelOpen ? '' : '0';
    if (arrowEl) {
        arrowEl.className = desktopPanelOpen ? 'fas fa-angle-double-left' : 'fas fa-angle-double-right';
    }
    const collapseBtn = document.getElementById('panelCollapseBtn');
    if (collapseBtn) collapseBtn.title = desktopPanelOpen ? 'הסתר פאנל' : 'הצג פאנל';
    setTimeout(resizeCanvas, 350);
}

function toggleMobilePanel() {
    const panel = document.getElementById('vsPanel');
    panelOpen = !panelOpen;
    panel.classList.toggle('mobile-open', panelOpen);
    const arrowEl = document.getElementById('panelArrowIcon');
    if (arrowEl) arrowEl.className = panelOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
}

function handleResize() {
    const isMobile = window.innerWidth <= 768;
    const panel = document.getElementById('vsPanel');
    if (!isMobile) {
        panel.classList.remove('mobile-open');
        panel.style.display = 'flex';
        if (desktopPanelOpen) {
            panel.style.width = '';
            panel.style.overflow = '';
            panel.style.minWidth = '';
        }
    } else {
        panel.style.display = panelOpen ? 'flex' : 'none';
    }
}

// ===== מסך טעינה =====
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const app = document.getElementById('vsApp');
    overlay.classList.add('hide');
    app.style.display = 'flex';
    setTimeout(() => { overlay.style.display = 'none'; }, 500);
}

// ===== Toast =====
let toastTimer = null;
function vsToast(msg) {
    const el = document.getElementById('vsToast');
    el.innerHTML = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ===== זיהוי שם מהגדרות מקומיות (fallback סינכרוני) =====
try {
    const stored = JSON.parse(localStorage.getItem('torahApp_user') || '{}');
    window.vsUserName = stored.display_name || stored.displayName || stored.full_name || stored.name || stored.username || '';
    if (!window.vsUserName && stored.email) window.vsUserName = stored.email.split('@')[0];
} catch(e) { window.vsUserName = ''; }

// ===== אתחול משתמש מ-Supabase (async, מדייק את שם היוזר) =====
async function initVsUser() {
    if (!vsSupabase) return;
    try {
        const { data: { session } } = await vsSupabase.auth.getSession();
        if (!session?.user) return;
        vsUserId = session.user.id;

        // שלוף display_name ממסד הנתונים
        const { data: profile } = await vsSupabase
            .from('profiles_public')
            .select('display_name')
            .eq('id', vsUserId)
            .maybeSingle();
        if (profile?.display_name) {
            window.vsUserName = profile.display_name;
        }

        // פרס 5 זוזים על כניסה לשיעור חי (פעם אחת לחדר)
        if (sessionMode === 'shiur_viewer') {
            const rewardKey = `torahApp_shiur_reward_${roomId}`;
            if (!localStorage.getItem(rewardKey)) {
                localStorage.setItem(rewardKey, '1');
                try {
                    const { data: cur } = await vsSupabase.from('profiles_public').select('reward_points').eq('id', vsUserId).maybeSingle();
                    const newPts = Math.max(0, (cur?.reward_points || 0) + 5);
                    await vsSupabase.from('profiles_public').update({ reward_points: newPts }).eq('id', vsUserId);
                    setTimeout(() => vsToast('<i class="fas fa-coins" style="color:#fbbf24;"></i> קיבלת 5 זוזים על כניסה לשיעור חי! 🎉'), 3000);
                } catch(e) { console.warn('shiur viewer reward failed:', e); }
            }
        }
    } catch(e) { console.warn('initVsUser failed:', e); }
}

// ===== בדיקת הרשאת שידור חי =====
async function checkBroadcastPermission() {
    // מנהל תמיד מורשה
    if (!vsSupabase) return false;
    try {
        const { data: { session } } = await vsSupabase.auth.getSession();
        if (!session?.user) return false;
        const meta = session.user.user_metadata || {};
        if (meta.is_admin === true) return true;

        const uid = session.user.id;
        const { data } = await vsSupabase
            .from('user_tags')
            .select('tag_permissions')
            .eq('user_id', uid)
            .maybeSingle();
        if (!data) return false;
        const perms = (typeof data.tag_permissions === 'string')
            ? JSON.parse(data.tag_permissions)
            : (data.tag_permissions || {});
        return perms.can_broadcast === true;
    } catch(e) {
        console.warn('checkBroadcastPermission failed:', e);
        return false;
    }
}
