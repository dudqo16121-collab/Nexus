/* =====================================================
 * NEXUS Messenger Module v2 - messenger.js
 * 사내 메신저 공통 로직 (모든 시스템에서 재사용)
 *
 * v2 추가 기능:
 *   - 그룹 채팅 (chat_rooms / chat_room_members)
 *   - 파일/이미지 첨부 (Supabase Storage: messenger-files)
 *   - 메시지 검색 / 북마크(즐겨찾기) / 핀 고정
 *   - 이모지 반응 (message_reactions)
 *   - 답장(Reply) (messages.reply_to)
 *   - 온라인 상태 표시 & 타이핑 인디케이터 (Realtime Presence)
 *   - 메시지 수정 / 삭제 (soft delete)
 *
 * 사용법:
 *   <link rel="stylesheet" href="messenger.css">
 *   <script src="messenger.js"></script>
 *   <script>
 *     Messenger.init({
 *       supabaseClient: window.supabaseClient,   // 필수
 *       getCurrentUser: () => currentUser,       // 필수
 *       getCurrentProfile: () => currentProfile, // 선택
 *       showToast: window.showToast,             // 선택
 *       floatingButton: true,                    // 선택 (기본 true)
 *       headerBadgeId: 'header-msg-badge',       // 선택
 *       storageBucket: 'messenger-files'         // 선택 (기본 'messenger-files')
 *     });
 *   </script>
 *
 * 공개 API:
 *   Messenger.open()                       메신저 열기
 *   Messenger.close()                      메신저 닫기
 *   Messenger.openWith(userId, name, av)   특정 사용자와 1:1 채팅
 *   Messenger.openRoom(roomId)             특정 방 열기
 *   Messenger.createGroup(name, ids[])     그룹방 생성
 *   Messenger.refresh()                    목록 새로고침
 *   Messenger.getUnreadCount()             전체 안읽음 수
 * ===================================================== */

(function (window, document) {
    'use strict';

    if (window.Messenger && window.Messenger.__initialized) {
        console.warn('[Messenger] 이미 초기화되어 있습니다.');
        return;
    }

    // ============ 내부 상태 ============
    const state = {
        supabase: null,
        getCurrentUser: () => null,
        getCurrentProfile: () => null,
        showToast: (msg) => console.log('[Toast]', msg),
        headerBadgeId: null,
        onUnreadChange: null,
        storageBucket: 'messenger-files',

        rooms: [],              // 내가 속한 방들 [{ id, type, name, avatar_url, last_message, unread, members }]
        allChatProfiles: [],    // 전체 동료 프로필 (그룹 만들 때, 1:1 시작할 때 사용)
        activeRoomId: null,
        activeRoom: null,

        messages: {},           // { roomId: [messages] }
        reactions: {},          // { messageId: [reactions] }
        pinned: {},             // { roomId: [messages] }
        bookmarks: [],          // 내 북마크 메시지 id 배열
        onlineUsers: new Set(), // 온라인 유저 id

        replyTo: null,          // 답장 대상 메시지
        attachments: [],        // 첨부 미리보기 [{ file, previewUrl }]

        sidebarTab: 'all',      // 'all' | 'direct' | 'group'
        opened: false,
        subscriptions: [],
        presenceChannel: null,
        typingTimeout: null,
    };

    // ============ 유틸 ============
    function escapeHtml(text) {
        if (text == null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function escapeAttr(text) { return escapeHtml(text).replace(/`/g, '&#096;'); }
    function getCurrentUser() { return state.getCurrentUser(); }
    function getCurrentProfile() { return state.getCurrentProfile(); }
    function getMyId() { const u = getCurrentUser(); return u ? u.id : null; }
    function isSampleMode() { return !state.supabase || !getMyId(); }
    function fmtSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    function uniqueBy(arr, key) {
        const seen = new Set();
        return arr.filter((x) => {
            const k = x[key];
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }

    // 자주 쓰는 이모지
    const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

    // ============ DOM 생성 ============
    function injectModal() {
        if (document.getElementById('nx-messenger-modal')) return;

        const overlay = document.createElement('div');
        overlay.className = 'nx-msg-modal-overlay';
        overlay.id = 'nx-messenger-modal';
        overlay.innerHTML = `
            <div class="nx-msg-modal-box">
                <div class="nx-msg-modal-header">
                    <h2><i class="fa-solid fa-comments" style="color:var(--primary-color);"></i> 사내 메신저</h2>
                    <div class="nx-msg-modal-header-actions">
                        <button id="nx-msg-search-btn" title="메시지 검색"><i class="fa-solid fa-magnifying-glass"></i></button>
                        <button id="nx-msg-bookmark-btn" title="별표 메시지"><i class="fa-solid fa-bookmark"></i></button>
                        <button class="nx-msg-modal-close" type="button" aria-label="닫기"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>
                <div class="nx-msg-modal-body">
                    <div class="nx-chat-layout">
                        <div class="nx-chat-sidebar">
                            <div class="nx-chat-sidebar-header">
                                <div class="nx-chat-sidebar-header-top">
                                    <h4>대화 목록</h4>
                                    <button class="nx-chat-new-group-btn" id="nx-chat-new-group-btn" type="button">
                                        <i class="fa-solid fa-plus"></i> 새 채팅
                                    </button>
                                </div>
                                <input type="text" class="nx-chat-search" id="nx-chat-search-input" placeholder="이름 검색...">
                            </div>
                            <div class="nx-chat-sidebar-tabs">
                                <button class="nx-chat-tab active" data-tab="all" type="button">전체</button>
                                <button class="nx-chat-tab" data-tab="direct" type="button">1:1</button>
                                <button class="nx-chat-tab" data-tab="group" type="button">그룹</button>
                            </div>
                            <div class="nx-chat-user-list" id="nx-chat-user-list"></div>
                        </div>
                        <div class="nx-chat-main" id="nx-chat-main-area">
                            <div class="nx-chat-empty">
                                <i class="fa-solid fa-comments"></i>
                                <p>대화 상대 또는 그룹을 선택하세요</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.nx-msg-modal-close').addEventListener('click', closeMessenger);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeMessenger();
        });

        overlay.querySelector('#nx-chat-search-input').addEventListener('input', (e) => {
            filterRoomList(e.target.value);
        });

        overlay.querySelectorAll('.nx-chat-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                overlay.querySelectorAll('.nx-chat-tab').forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');
                state.sidebarTab = tab.dataset.tab;
                renderRoomList();
            });
        });

        overlay.querySelector('#nx-chat-new-group-btn').addEventListener('click', openNewChatDialog);
        overlay.querySelector('#nx-msg-search-btn').addEventListener('click', openSearchDialog);
        overlay.querySelector('#nx-msg-bookmark-btn').addEventListener('click', openBookmarksDialog);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.opened) {
                // 보조 모달 먼저 닫기
                const subOpen = document.querySelector('.nx-sub-modal-overlay.open');
                if (subOpen) { subOpen.classList.remove('open'); return; }
                const light = document.querySelector('.nx-image-lightbox.open');
                if (light) { light.classList.remove('open'); return; }
                closeMessenger();
            }
        });
    }

    function injectFloatingButton() {
        if (document.getElementById('nx-floating-chat-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'nx-floating-chat-btn';
        btn.id = 'nx-floating-chat-btn';
        btn.type = 'button';
        btn.title = '사내 메신저';
        btn.innerHTML = `
            <i class="fa-solid fa-comment-dots"></i>
            <span class="nx-floating-msg-badge" id="nx-floating-msg-badge" style="display:none;">0</span>
        `;
        btn.addEventListener('click', openMessenger);
        document.body.appendChild(btn);
    }

    function injectNotificationContainer() {
        if (document.getElementById('nx-msg-notification-container')) return;
        const wrap = document.createElement('div');
        wrap.className = 'nx-msg-notification';
        wrap.id = 'nx-msg-notification-container';
        document.body.appendChild(wrap);
    }

    function injectImageLightbox() {
        if (document.getElementById('nx-image-lightbox')) return;
        const box = document.createElement('div');
        box.className = 'nx-image-lightbox';
        box.id = 'nx-image-lightbox';
        box.innerHTML = `<img alt="이미지" />`;
        box.addEventListener('click', () => box.classList.remove('open'));
        document.body.appendChild(box);
    }

    function showLightbox(url) {
        const box = document.getElementById('nx-image-lightbox');
        if (!box) return;
        box.querySelector('img').src = url;
        box.classList.add('open');
    }

    // ============ 방/사용자 로드 ============
    async function loadRooms() {
        const me = getCurrentUser();

        // Supabase 미연결 → 샘플 데이터
        if (isSampleMode()) {
            loadSampleRooms();
            return;
        }

        try {
            // 1) 내가 속한 방들의 멤버십 + 방 정보 가져오기
            const { data: myMemberships, error: e1 } = await state.supabase
                .from('chat_room_members')
                .select('room_id, last_read_at, role, chat_rooms(*)')
                .eq('user_id', me.id);
            if (e1) throw e1;

            const roomIds = (myMemberships || []).map((m) => m.room_id);
            if (!roomIds.length) {
                state.rooms = [];
                // 동료 프로필은 그래도 로드해야 새 채팅 가능
                await loadAllProfiles();
                renderRoomList();
                return;
            }

            // 2) 그 방들의 전체 멤버 (이름, 아바타용)
            const { data: allMembers } = await state.supabase
                .from('chat_room_members')
                .select('room_id, user_id, role, profiles(*)')
                .in('room_id', roomIds);

            // 3) 각 방의 마지막 메시지 (간단히 전체에서 group by room 흉내)
            const { data: recentMsgs } = await state.supabase
                .from('messages')
                .select('room_id, content, created_at, sender_id, message_type, deleted_at')
                .in('room_id', roomIds)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(roomIds.length * 5);

            const lastByRoom = {};
            (recentMsgs || []).forEach((m) => {
                if (!lastByRoom[m.room_id]) lastByRoom[m.room_id] = m;
            });

            // 4) 안 읽음 수 (각 방의 last_read_at 이후 메시지 수)
            const unreadByRoom = {};
            (myMemberships || []).forEach((mb) => {
                const cnt = (recentMsgs || []).filter((m) =>
                    m.room_id === mb.room_id &&
                    m.sender_id !== me.id &&
                    new Date(m.created_at) > new Date(mb.last_read_at || 0)
                ).length;
                if (cnt > 0) unreadByRoom[mb.room_id] = cnt;
            });

            // 5) 조합
            state.rooms = (myMemberships || []).map((mb) => {
                const room = mb.chat_rooms || {};
                const members = (allMembers || []).filter((x) => x.room_id === mb.room_id);
                const lastMsg = lastByRoom[mb.room_id];
                return {
                    id: mb.room_id,
                    type: room.type,
                    name: room.name,
                    avatar_url: room.avatar_url,
                    created_at: room.created_at,
                    members: members,
                    last_message: lastMsg,
                    unread: unreadByRoom[mb.room_id] || 0,
                    last_read_at: mb.last_read_at,
                    my_role: mb.role,
                };
            }).sort((a, b) => {
                const ta = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.created_at || 0).getTime();
                const tb = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.created_at || 0).getTime();
                return tb - ta;
            });

            await loadAllProfiles();
            updateUnreadBadges();
            renderRoomList();
            subscribeToRealtime();
        } catch (e) {
            console.warn('[Messenger] loadRooms 실패, 샘플 모드로 폴백', e);
            loadSampleRooms();
        }
    }

    async function loadAllProfiles() {
        const me = getCurrentUser();
        if (!state.supabase || !me) return;
        try {
            const { data } = await state.supabase
                .from('profiles')
                .select('id, full_name, avatar_url, department, last_seen_at, status_text')
                .neq('id', me.id)
                .limit(200);
            state.allChatProfiles = data || [];
        } catch (e) {}
    }

    function loadSampleRooms() {
        state.allChatProfiles = [
            { id: 'sample1', full_name: '김철수 대리', avatar_url: 'https://i.pravatar.cc/150?img=11', department: '개발팀' },
            { id: 'sample2', full_name: '이영희 사원', avatar_url: 'https://i.pravatar.cc/150?img=5',  department: '디자인팀' },
            { id: 'sample3', full_name: '박지성 과장', avatar_url: 'https://i.pravatar.cc/150?img=15', department: '기획팀' },
            { id: 'sample4', full_name: '최마케터',   avatar_url: 'https://i.pravatar.cc/150?img=8',  department: '마케팅팀' },
            { id: 'sample5', full_name: '정수민 차장', avatar_url: 'https://i.pravatar.cc/150?img=20', department: '인사팀' },
        ];

        // 샘플 방 (1:1 두 개 + 그룹 한 개)
        state.rooms = [
            {
                id: 'room-1', type: 'direct', name: null,
                members: [
                    { user_id: 'sample1', profiles: state.allChatProfiles[0] },
                    { user_id: 'me', profiles: getCurrentProfile() || { full_name: '나' } }
                ],
                last_message: { content: '네, 잘 되네요!', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), sender_id: 'me', message_type: 'text' },
                unread: 0,
            },
            {
                id: 'room-2', type: 'direct', name: null,
                members: [
                    { user_id: 'sample2', profiles: state.allChatProfiles[1] },
                    { user_id: 'me', profiles: getCurrentProfile() || { full_name: '나' } }
                ],
                last_message: { content: '디자인 시안 확인 부탁드려요', created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), sender_id: 'sample2', message_type: 'text' },
                unread: 2,
            },
            {
                id: 'room-3', type: 'group', name: '🚀 프로젝트 NEXUS',
                members: [
                    { user_id: 'me', role: 'owner', profiles: getCurrentProfile() || { full_name: '나' } },
                    { user_id: 'sample1', role: 'member', profiles: state.allChatProfiles[0] },
                    { user_id: 'sample3', role: 'member', profiles: state.allChatProfiles[2] },
                    { user_id: 'sample4', role: 'member', profiles: state.allChatProfiles[3] },
                ],
                last_message: { content: '이번 주 회의록 공유드립니다', created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), sender_id: 'sample3', message_type: 'text' },
                unread: 1,
            }
        ];

        // 샘플 온라인 상태
        state.onlineUsers = new Set(['sample1', 'sample3']);

        updateUnreadBadges();
        renderRoomList();
    }

    // ============ 사이드바 렌더링 ============
    function getRoomDisplay(room) {
        if (room.type === 'group') {
            return {
                name: room.name || '그룹채팅',
                avatar: room.avatar_url || null,
                isGroup: true,
                subtitle: (room.members || []).length + '명 · ' + getMemberNames(room),
            };
        }
        // 1:1 — 상대방 정보
        const me = getMyId() || 'me';
        const other = (room.members || []).find((m) => m.user_id !== me);
        const prof = other && other.profiles;
        return {
            name: (prof && prof.full_name) || '대화상대',
            avatar: (prof && prof.avatar_url) || `https://i.pravatar.cc/150?u=${other ? other.user_id : 'x'}`,
            isGroup: false,
            otherUserId: other ? other.user_id : null,
            subtitle: (prof && prof.department) || '',
        };
    }

    function getMemberNames(room) {
        const me = getMyId() || 'me';
        const names = (room.members || [])
            .filter((m) => m.user_id !== me)
            .map((m) => (m.profiles && m.profiles.full_name) || '?')
            .slice(0, 3);
        return names.join(', ');
    }

    function getFilteredRooms() {
        let arr = state.rooms.slice();
        if (state.sidebarTab === 'direct') arr = arr.filter((r) => r.type === 'direct');
        if (state.sidebarTab === 'group')  arr = arr.filter((r) => r.type === 'group');
        return arr;
    }

    function renderRoomList(searchQuery) {
        const container = document.getElementById('nx-chat-user-list');
        if (!container) return;

        let rooms = getFilteredRooms();

        // 검색 필터
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            rooms = rooms.filter((r) => {
                const d = getRoomDisplay(r);
                return d.name.toLowerCase().includes(q)
                    || (d.subtitle && d.subtitle.toLowerCase().includes(q));
            });
        }

        // 검색어가 있고 전체 탭이면, 방이 없는 동료도 추가 (1:1 새로 시작용)
        let extraProfiles = [];
        if (searchQuery && state.sidebarTab !== 'group') {
            const q = searchQuery.toLowerCase();
            const existingDirectIds = new Set();
            state.rooms.forEach((r) => {
                if (r.type === 'direct') {
                    const d = getRoomDisplay(r);
                    if (d.otherUserId) existingDirectIds.add(d.otherUserId);
                }
            });
            extraProfiles = state.allChatProfiles.filter((p) =>
                !existingDirectIds.has(p.id) && (
                    (p.full_name || '').toLowerCase().includes(q) ||
                    (p.department || '').toLowerCase().includes(q)
                )
            );
        }

        if (!rooms.length && !extraProfiles.length) {
            container.innerHTML = '<p style="text-align:center;padding:30px 15px;color:var(--text-muted);font-size:0.85rem;">' +
                (searchQuery ? '검색 결과가 없습니다' : '대화가 없습니다. 새 채팅을 시작해보세요!') + '</p>';
            return;
        }

        let html = '';

        rooms.forEach((r) => {
            const d = getRoomDisplay(r);
            const isActive = r.id === state.activeRoomId;
            const lastContent = formatLastMessage(r.last_message);
            const onlineDot = !d.isGroup && d.otherUserId
                ? `<span class="nx-online-dot ${state.onlineUsers.has(d.otherUserId) ? 'online' : 'offline'}"></span>`
                : '';
            const avatarHtml = d.isGroup
                ? `<div class="nx-chat-user-avatar group"><div class="nx-avatar"></div></div>`
                : `<div class="nx-chat-user-avatar">
                       <div class="nx-avatar" style="background-image:url('${escapeAttr(d.avatar)}');"></div>
                       ${onlineDot}
                   </div>`;

            html += `<div class="nx-chat-user-item ${isActive ? 'active' : ''}" data-room-id="${escapeAttr(r.id)}">
                ${avatarHtml}
                <div class="nx-chat-user-info">
                    <h5>${escapeHtml(d.name)}</h5>
                    <p>${escapeHtml(lastContent || d.subtitle || '메시지 없음')}</p>
                </div>
                ${r.unread > 0 ? `<div class="nx-chat-unread-badge">${r.unread > 99 ? '99+' : r.unread}</div>` : ''}
            </div>`;
        });

        // 검색 시 → 1:1 새로 시작할 동료
        if (extraProfiles.length) {
            html += `<div style="padding:8px 15px;font-size:0.72rem;color:var(--text-muted);font-weight:600;">새 대화 시작</div>`;
            extraProfiles.forEach((p) => {
                const av = p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`;
                html += `<div class="nx-chat-user-item" data-new-direct="${escapeAttr(p.id)}" data-new-name="${escapeAttr(p.full_name || '')}" data-new-avatar="${escapeAttr(av)}">
                    <div class="nx-chat-user-avatar">
                        <div class="nx-avatar" style="background-image:url('${escapeAttr(av)}');"></div>
                        <span class="nx-online-dot ${state.onlineUsers.has(p.id) ? 'online' : 'offline'}"></span>
                    </div>
                    <div class="nx-chat-user-info">
                        <h5>${escapeHtml(p.full_name || '동료')}</h5>
                        <p>${escapeHtml(p.department || '')}</p>
                    </div>
                </div>`;
            });
        }

        container.innerHTML = html;

        container.querySelectorAll('.nx-chat-user-item').forEach((item) => {
            item.addEventListener('click', () => {
                if (item.dataset.roomId) {
                    openRoom(item.dataset.roomId);
                } else if (item.dataset.newDirect) {
                    openDirectWithUser(item.dataset.newDirect, item.dataset.newName, item.dataset.newAvatar);
                }
            });
        });
    }

    function formatLastMessage(msg) {
        if (!msg) return '';
        if (msg.deleted_at) return '(삭제된 메시지)';
        if (msg.message_type === 'image') return '📷 사진';
        if (msg.message_type === 'file')  return '📎 파일';
        if (msg.message_type === 'system') return msg.content || '';
        const c = msg.content || '';
        return c.length > 28 ? c.slice(0, 28) + '...' : c;
    }

    function filterRoomList(query) {
        renderRoomList(query);
    }

    // ============ 채팅 영역 ============
    async function openRoom(roomId) {
        const room = state.rooms.find((r) => r.id === roomId);
        if (!room) return;

        state.activeRoomId = roomId;
        state.activeRoom = room;
        state.replyTo = null;
        state.attachments = [];

        const d = getRoomDisplay(room);
        const mainArea = document.getElementById('nx-chat-main-area');
        if (!mainArea) return;

        const isOnline = !d.isGroup && d.otherUserId && state.onlineUsers.has(d.otherUserId);
        const subtitleText = d.isGroup
            ? `${(room.members || []).length}명의 멤버`
            : (isOnline ? '🟢 온라인' : '오프라인');

        // 헤더 전용 아바타 (사이드바와 구조 다름)
        const headerAvatar = d.isGroup
            ? `<div class="nx-avatar" style="background:linear-gradient(135deg, var(--primary-color, #4361ee), var(--secondary-color, #3f37c9));display:flex;align-items:center;justify-content:center;color:white;font-size:0.9rem;"><i class="fa-solid fa-users"></i></div>`
            : `<div class="nx-avatar" style="background-image:url('${escapeAttr(d.avatar)}');"></div>`;

        mainArea.innerHTML = `
            <div class="nx-chat-header">
                ${headerAvatar}
                <div class="nx-chat-header-info">
                    <h4>${escapeHtml(d.name)} ${d.isGroup ? '<i class="fa-solid fa-users" style="font-size:0.75rem;color:var(--text-muted);"></i>' : ''}</h4>
                    <p id="nx-chat-user-status">${subtitleText}</p>
                </div>
                <div class="nx-chat-header-actions">
                    ${d.isGroup ? `<button id="nx-chat-members-btn" title="멤버 보기"><i class="fa-solid fa-users"></i></button>` : ''}
                    <button id="nx-chat-pinned-btn" title="고정된 메시지"><i class="fa-solid fa-thumbtack"></i></button>
                    <button id="nx-chat-meeting-btn" title="화상회의 시작"><i class="fa-solid fa-video"></i></button>
                </div>
            </div>
            <div id="nx-pinned-bar-container"></div>
            <div class="nx-chat-messages" id="nx-chat-messages-container"></div>
            <div class="nx-chat-input-area">
                <div id="nx-chat-reply-indicator"></div>
                <div id="nx-chat-attach-preview" class="nx-chat-attach-preview" style="display:none;"></div>
                <div class="nx-chat-input-row">
                    <button class="nx-chat-input-btn" id="nx-chat-attach-btn" type="button" title="파일 첨부">
                        <i class="fa-solid fa-paperclip"></i>
                    </button>
                    <input type="file" id="nx-chat-file-input" multiple style="display:none;" />
                    <button class="nx-chat-input-btn" id="nx-chat-emoji-btn" type="button" title="이모지">
                        <i class="fa-regular fa-face-smile"></i>
                    </button>
                    <textarea class="nx-chat-input" id="nx-chat-input" placeholder="메시지 입력... (Enter 전송, Shift+Enter 줄바꿈)" rows="1"></textarea>
                    <button class="nx-chat-send-btn" id="nx-chat-send-btn" type="button">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;

        bindChatInputEvents();
        renderRoomList();

        // 메시지 로드
        await loadMessages(roomId);
        await loadPinned(roomId);
        await loadReactionsForRoom(roomId);

        renderMessages();
        renderPinnedBar();
        await markRoomAsRead(roomId);

        if (!state.opened) openMessenger();
    }

    function bindChatInputEvents() {
        const input    = document.getElementById('nx-chat-input');
        const sendBtn  = document.getElementById('nx-chat-send-btn');
        const meetBtn  = document.getElementById('nx-chat-meeting-btn');
        const pinBtn   = document.getElementById('nx-chat-pinned-btn');
        const memBtn   = document.getElementById('nx-chat-members-btn');
        const attachBtn= document.getElementById('nx-chat-attach-btn');
        const fileInput= document.getElementById('nx-chat-file-input');
        const emojiBtn = document.getElementById('nx-chat-emoji-btn');

        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            input.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 100) + 'px';
                broadcastTyping();
            });
        }
        if (sendBtn)   sendBtn.addEventListener('click', sendMessage);
        if (meetBtn)   meetBtn.addEventListener('click', startInstantMeeting);
        if (pinBtn)    pinBtn.addEventListener('click', openPinnedDialog);
        if (memBtn)    memBtn.addEventListener('click', openMembersDialog);
        if (attachBtn) attachBtn.addEventListener('click', () => fileInput && fileInput.click());
        if (fileInput) fileInput.addEventListener('change', handleFileSelect);
        if (emojiBtn)  emojiBtn.addEventListener('click', (e) => toggleQuickEmojiForInput(e));
    }

    function toggleQuickEmojiForInput(e) {
        e.stopPropagation();
        // 입력창에 이모지 삽입
        document.querySelectorAll('.nx-emoji-picker').forEach((p) => p.remove());
        const picker = document.createElement('div');
        picker.className = 'nx-emoji-picker';
        const emojis = ['😀','😂','😊','😍','😎','🤔','😴','🥳','😭','😡','❤️','👍','👎','👏','🙏','🎉','🔥','✨','💯','🚀'];
        picker.innerHTML = emojis.map((em) => `<button type="button">${em}</button>`).join('');
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        picker.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
        picker.style.left = rect.left + 'px';
        document.body.appendChild(picker);
        picker.querySelectorAll('button').forEach((b) => {
            b.addEventListener('click', () => {
                const input = document.getElementById('nx-chat-input');
                if (input) {
                    input.value += b.textContent;
                    input.focus();
                }
                picker.remove();
            });
        });
        setTimeout(() => {
            document.addEventListener('click', function once(ev) {
                if (!picker.contains(ev.target)) {
                    picker.remove();
                    document.removeEventListener('click', once);
                }
            });
        }, 0);
    }

    // ============ 메시지 로드 ============
    async function loadMessages(roomId) {
        if (isSampleMode() || String(roomId).startsWith('room-')) {
            state.messages[roomId] = getSampleMessages(roomId);
            return;
        }
        try {
            const { data } = await state.supabase
                .from('messages')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true })
                .limit(200);
            state.messages[roomId] = data || [];
        } catch (e) {
            state.messages[roomId] = [];
        }
    }

    async function loadPinned(roomId) {
        if (isSampleMode() || String(roomId).startsWith('room-')) {
            state.pinned[roomId] = [];
            return;
        }
        try {
            const { data } = await state.supabase
                .from('pinned_messages')
                .select('message_id, pinned_at, messages(*)')
                .eq('room_id', roomId)
                .order('pinned_at', { ascending: false });
            state.pinned[roomId] = (data || []).map((p) => p.messages).filter(Boolean);
        } catch (e) {
            state.pinned[roomId] = [];
        }
    }

    async function loadReactionsForRoom(roomId) {
        if (isSampleMode() || String(roomId).startsWith('room-')) return;
        const msgs = state.messages[roomId] || [];
        if (!msgs.length) return;
        try {
            const { data } = await state.supabase
                .from('message_reactions')
                .select('*')
                .in('message_id', msgs.map((m) => m.id));
            (data || []).forEach((r) => {
                if (!state.reactions[r.message_id]) state.reactions[r.message_id] = [];
                state.reactions[r.message_id].push(r);
            });
        } catch (e) {}
    }

    function getSampleMessages(roomId) {
        if (roomId === 'room-3') {
            return [
                { id: 'sm-g1', room_id: roomId, sender_id: 'sample3', content: '안녕하세요 팀! 이번 주 NEXUS 프로젝트 진행상황 공유드릴게요.', created_at: new Date(Date.now() - 3600000 * 5).toISOString(), message_type: 'text' },
                { id: 'sm-g2', room_id: roomId, sender_id: 'sample1', content: '백엔드 API는 80% 완료되었습니다 👍', created_at: new Date(Date.now() - 3600000 * 4).toISOString(), message_type: 'text' },
                { id: 'sm-g3', room_id: roomId, sender_id: 'sample4', content: '마케팅 자료도 준비 중입니다!', created_at: new Date(Date.now() - 3600000 * 3).toISOString(), message_type: 'text' },
                { id: 'sm-g4', room_id: roomId, sender_id: 'me', content: '좋습니다! 다음 주 수요일에 데모 진행할게요.', created_at: new Date(Date.now() - 3600000 * 2).toISOString(), message_type: 'text' },
                { id: 'sm-g5', room_id: roomId, sender_id: 'sample3', content: '이번 주 회의록 공유드립니다', created_at: new Date(Date.now() - 3600000).toISOString(), message_type: 'text' },
            ];
        }
        // 1:1
        const other = state.activeRoom && state.activeRoom.members
            ? state.activeRoom.members.find((m) => m.user_id !== 'me' && m.user_id !== getMyId())
            : null;
        const otherId = other ? other.user_id : 'sample1';
        return [
            { id: 'sm1', room_id: roomId, sender_id: otherId, content: '안녕하세요! NEXUS 메신저 v2 테스트입니다.', created_at: new Date(Date.now() - 3600000).toISOString(), message_type: 'text' },
            { id: 'sm2', room_id: roomId, sender_id: 'me', content: '네, 잘 되네요! 새 기능들 좋은데요?', created_at: new Date(Date.now() - 3500000).toISOString(), message_type: 'text' },
            { id: 'sm3', room_id: roomId, sender_id: otherId, content: '파일 첨부, 답장, 이모지 반응까지 다 됩니다 👍', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(), message_type: 'text' },
        ];
    }

    // ============ 메시지 렌더링 ============
    function getProfile(userId) {
        if (userId === getMyId() || userId === 'me') {
            return getCurrentProfile() || { full_name: '나', avatar_url: null };
        }
        return state.allChatProfiles.find((p) => p.id === userId) || { full_name: '동료', avatar_url: null };
    }

    function renderMessages() {
        const container = document.getElementById('nx-chat-messages-container');
        if (!container) return;

        const messages = state.messages[state.activeRoomId] || [];

        if (!messages.length) {
            container.innerHTML = `<div class="nx-chat-empty"><i class="fa-solid fa-comments"></i><p>대화를 시작해보세요</p></div>`;
            return;
        }

        const me = getMyId() || 'me';
        const isGroup = state.activeRoom && state.activeRoom.type === 'group';
        let html = '';
        let lastDate = '';

        messages.forEach((msg) => {
            const isMine = (msg.sender_id === me) || msg.sender_id === 'me';
            const dt = new Date(msg.created_at);
            const date = dt.toLocaleDateString('ko-KR');
            const time = dt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

            if (date !== lastDate) {
                html += `<div class="nx-chat-date-divider">${date}</div>`;
                lastDate = date;
            }

            if (msg.message_type === 'system') {
                html += `<div class="nx-msg-system"><i class="fa-solid fa-circle-info"></i> ${escapeHtml(msg.content)}</div>`;
                return;
            }

            const sender = getProfile(msg.sender_id);
            const av = sender.avatar_url || `https://i.pravatar.cc/150?u=${msg.sender_id}`;
            const senderName = sender.full_name || '동료';

            // 답장 인용
            let replyHtml = '';
            if (msg.reply_to) {
                const orig = messages.find((m) => m.id === msg.reply_to);
                if (orig) {
                    const origSender = getProfile(orig.sender_id);
                    const origContent = orig.deleted_at ? '(삭제된 메시지)'
                                       : orig.message_type === 'image' ? '📷 사진'
                                       : orig.message_type === 'file'  ? ('📎 ' + (orig.attachment_name || '파일'))
                                       : orig.content;
                    replyHtml = `<div class="nx-msg-reply-quote" data-scroll-to="${escapeAttr(orig.id)}">
                        <div class="nx-msg-reply-quote-sender">${escapeHtml(origSender.full_name || '?')}</div>
                        <div class="nx-msg-reply-quote-text">${escapeHtml(origContent || '')}</div>
                    </div>`;
                }
            }

            // 본문 (삭제/이미지/파일/텍스트)
            let bodyHtml = '';
            if (msg.deleted_at) {
                bodyHtml = `<div class="nx-msg-bubble deleted">삭제된 메시지입니다</div>`;
            } else if (msg.message_type === 'image' && msg.attachment_url) {
                bodyHtml = `<div class="nx-msg-bubble" style="padding:4px;background:transparent;border:none;">
                    <img src="${escapeAttr(msg.attachment_url)}" class="nx-msg-attachment-image" data-lightbox="${escapeAttr(msg.attachment_url)}" />
                </div>`;
            } else if (msg.message_type === 'file' && msg.attachment_url) {
                bodyHtml = `<div class="nx-msg-bubble">
                    ${msg.content ? escapeHtml(msg.content) + '<br>' : ''}
                    <a href="${escapeAttr(msg.attachment_url)}" target="_blank" class="nx-msg-attachment-file" download="${escapeAttr(msg.attachment_name || 'file')}">
                        <i class="fa-solid fa-file"></i>
                        <div class="nx-msg-attachment-file-info">
                            <div class="name">${escapeHtml(msg.attachment_name || '파일')}</div>
                            <div class="size">${escapeHtml(fmtSize(msg.attachment_size))}</div>
                        </div>
                    </a>
                </div>`;
            } else {
                bodyHtml = `<div class="nx-msg-bubble">${linkify(escapeHtml(msg.content || ''))}</div>`;
            }

            // 액션 버튼 (별표/답장/리액션/수정/삭제)
            const bookmarked = state.bookmarks.includes(msg.id);
            const actionsHtml = msg.deleted_at ? '' : `
                <div class="nx-msg-actions">
                    <button class="nx-msg-action-btn" data-act="react"    data-msg-id="${escapeAttr(msg.id)}" title="이모지 반응"><i class="fa-regular fa-face-smile"></i></button>
                    <button class="nx-msg-action-btn" data-act="reply"    data-msg-id="${escapeAttr(msg.id)}" title="답장"><i class="fa-solid fa-reply"></i></button>
                    <button class="nx-msg-action-btn ${bookmarked ? 'starred' : ''}" data-act="bookmark" data-msg-id="${escapeAttr(msg.id)}" title="별표"><i class="fa-${bookmarked ? 'solid' : 'regular'} fa-star"></i></button>
                    <button class="nx-msg-action-btn" data-act="pin"      data-msg-id="${escapeAttr(msg.id)}" title="고정"><i class="fa-solid fa-thumbtack"></i></button>
                    ${isMine ? `
                        <button class="nx-msg-action-btn" data-act="edit"   data-msg-id="${escapeAttr(msg.id)}" title="수정"><i class="fa-solid fa-pen"></i></button>
                        <button class="nx-msg-action-btn" data-act="delete" data-msg-id="${escapeAttr(msg.id)}" title="삭제"><i class="fa-solid fa-trash"></i></button>
                    ` : ''}
                </div>`;

            // 리액션
            const reactions = state.reactions[msg.id] || [];
            const reactionsHtml = renderReactionsPills(reactions, msg.id);

            html += `<div class="nx-chat-message ${isMine ? 'mine' : ''}" data-msg-id="${escapeAttr(msg.id)}">
                <div class="nx-msg-avatar" style="background-image:url('${escapeAttr(av)}');"></div>
                <div class="nx-msg-body">
                    ${isGroup && !isMine ? `<div class="nx-msg-sender">${escapeHtml(senderName)}</div>` : ''}
                    ${replyHtml}
                    ${bodyHtml}
                    ${reactionsHtml}
                    <div class="nx-msg-time">${time}${msg.edited_at ? '<span class="edited"> (수정됨)</span>' : ''}</div>
                </div>
                ${actionsHtml}
            </div>`;
        });

        container.innerHTML = html;
        bindMessageActions(container);
        container.scrollTop = container.scrollHeight;
    }

    function renderReactionsPills(reactions, msgId) {
        if (!reactions.length) return '';
        const me = getMyId() || 'me';
        // 이모지별 그룹
        const groups = {};
        reactions.forEach((r) => {
            if (!groups[r.emoji]) groups[r.emoji] = [];
            groups[r.emoji].push(r);
        });
        const html = Object.keys(groups).map((emoji) => {
            const list = groups[emoji];
            const mine = list.some((r) => r.user_id === me);
            return `<span class="nx-reaction-pill ${mine ? 'mine' : ''}" data-emoji="${escapeAttr(emoji)}" data-msg-id="${escapeAttr(msgId)}">
                ${emoji} <span class="count">${list.length}</span>
            </span>`;
        }).join('');
        return `<div class="nx-msg-reactions">${html}</div>`;
    }

    function linkify(text) {
        return text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">$1</a>');
    }

    function bindMessageActions(container) {
        // 메시지 액션
        container.querySelectorAll('.nx-msg-action-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const act = btn.dataset.act;
                const msgId = btn.dataset.msgId;
                if (act === 'react')    showReactionPicker(e, msgId);
                if (act === 'reply')    startReply(msgId);
                if (act === 'bookmark') toggleBookmark(msgId, btn);
                if (act === 'pin')      togglePin(msgId);
                if (act === 'edit')     startEdit(msgId);
                if (act === 'delete')   deleteMessage(msgId);
            });
        });

        // 리액션 알약 클릭 → 토글
        container.querySelectorAll('.nx-reaction-pill').forEach((pill) => {
            pill.addEventListener('click', () => {
                toggleReaction(pill.dataset.msgId, pill.dataset.emoji);
            });
        });

        // 답장 인용 클릭 → 원본으로 스크롤
        container.querySelectorAll('.nx-msg-reply-quote').forEach((q) => {
            q.addEventListener('click', () => {
                const target = container.querySelector(`[data-msg-id="${q.dataset.scrollTo}"]`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.style.transition = 'background 0.3s';
                    target.style.background = 'rgba(67,97,238,0.1)';
                    setTimeout(() => { target.style.background = ''; }, 1000);
                }
            });
        });

        // 이미지 라이트박스
        container.querySelectorAll('[data-lightbox]').forEach((img) => {
            img.addEventListener('click', () => showLightbox(img.dataset.lightbox));
        });
    }

    function showReactionPicker(e, msgId) {
        document.querySelectorAll('.nx-emoji-picker').forEach((p) => p.remove());
        const picker = document.createElement('div');
        picker.className = 'nx-emoji-picker';
        picker.innerHTML = QUICK_EMOJIS.map((em) => `<button type="button" data-emoji="${em}">${em}</button>`).join('');
        const rect = e.currentTarget.getBoundingClientRect();
        picker.style.top  = (rect.bottom + 4) + 'px';
        picker.style.left = rect.left + 'px';
        document.body.appendChild(picker);
        picker.querySelectorAll('button').forEach((b) => {
            b.addEventListener('click', () => {
                toggleReaction(msgId, b.dataset.emoji);
                picker.remove();
            });
        });
        setTimeout(() => {
            document.addEventListener('click', function once(ev) {
                if (!picker.contains(ev.target)) {
                    picker.remove();
                    document.removeEventListener('click', once);
                }
            });
        }, 0);
    }

    // ============ 답장 ============
    function startReply(msgId) {
        const messages = state.messages[state.activeRoomId] || [];
        const msg = messages.find((m) => m.id === msgId);
        if (!msg) return;
        state.replyTo = msg;
        renderReplyIndicator();
        const input = document.getElementById('nx-chat-input');
        if (input) input.focus();
    }

    function cancelReply() {
        state.replyTo = null;
        renderReplyIndicator();
    }

    function renderReplyIndicator() {
        const container = document.getElementById('nx-chat-reply-indicator');
        if (!container) return;
        if (!state.replyTo) {
            container.innerHTML = '';
            return;
        }
        const sender = getProfile(state.replyTo.sender_id);
        const content = state.replyTo.deleted_at ? '(삭제됨)'
                      : state.replyTo.message_type === 'image' ? '📷 사진'
                      : state.replyTo.message_type === 'file'  ? '📎 파일'
                      : (state.replyTo.content || '');
        container.innerHTML = `<div class="nx-chat-reply-indicator">
            <i class="fa-solid fa-reply" style="color:var(--primary-color);"></i>
            <div class="nx-reply-info">
                <strong>${escapeHtml(sender.full_name || '동료')}</strong>
                <span>${escapeHtml(content)}</span>
            </div>
            <button class="nx-chat-reply-cancel" type="button" id="nx-chat-reply-cancel-btn">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>`;
        const cancelBtn = document.getElementById('nx-chat-reply-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', cancelReply);
    }

    // ============ 첨부파일 ============
    function handleFileSelect(e) {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => {
            if (file.size > 25 * 1024 * 1024) {
                state.showToast('파일 크기는 25MB 이하여야 합니다.');
                return;
            }
            const item = { file, previewUrl: null };
            if (file.type.startsWith('image/')) {
                item.previewUrl = URL.createObjectURL(file);
            }
            state.attachments.push(item);
        });
        e.target.value = ''; // 같은 파일 다시 선택 가능
        renderAttachPreview();
    }

    function renderAttachPreview() {
        const container = document.getElementById('nx-chat-attach-preview');
        if (!container) return;
        if (!state.attachments.length) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }
        container.style.display = 'flex';
        container.innerHTML = state.attachments.map((a, i) => {
            const isImg = a.file.type.startsWith('image/');
            return `<div class="nx-attach-preview-item">
                ${isImg ? `<img src="${a.previewUrl}" alt="">`
                        : `<i class="fa-solid fa-file" style="font-size:1.5rem;color:var(--primary-color);"></i>`}
                <div>
                    <div class="name">${escapeHtml(a.file.name)}</div>
                    <div style="font-size:0.68rem;color:var(--text-muted);">${escapeHtml(fmtSize(a.file.size))}</div>
                </div>
                <button class="nx-attach-preview-remove" type="button" data-idx="${i}">✕</button>
            </div>`;
        }).join('');
        container.querySelectorAll('.nx-attach-preview-remove').forEach((b) => {
            b.addEventListener('click', () => {
                const idx = parseInt(b.dataset.idx, 10);
                const removed = state.attachments.splice(idx, 1)[0];
                if (removed && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
                renderAttachPreview();
            });
        });
    }

    async function uploadAttachment(file) {
        const me = getCurrentUser();
        if (!state.supabase || !me) throw new Error('not authenticated');
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
        const path = `${me.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await state.supabase.storage
            .from(state.storageBucket)
            .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (error) throw error;
        const { data } = state.supabase.storage.from(state.storageBucket).getPublicUrl(path);
        return {
            url: data.publicUrl,
            path: path,
            name: file.name,
            size: file.size,
            mime: file.type,
            type: file.type.startsWith('image/') ? 'image' : 'file'
        };
    }

    // ============ 메시지 전송 ============
    async function sendMessage() {
        const input = document.getElementById('nx-chat-input');
        if (!input) return;
        const content = input.value.trim();
        if (!content && !state.attachments.length) return;
        if (!state.activeRoomId) return;

        input.value = '';
        input.style.height = 'auto';

        const me = getCurrentUser();
        const myId = me ? me.id : 'me';
        const replyTo = state.replyTo ? state.replyTo.id : null;
        const attachments = state.attachments.slice();
        state.attachments = [];
        state.replyTo = null;
        renderAttachPreview();
        renderReplyIndicator();

        // 1) 첨부 없으면 단순 텍스트 메시지
        if (!attachments.length) {
            await insertMessage({
                room_id: state.activeRoomId,
                sender_id: myId,
                content: content,
                message_type: 'text',
                reply_to: replyTo
            });
            return;
        }

        // 2) 첨부 있음 → 각 파일을 별도 메시지로 전송 (UX 깔끔)
        // 첫 첨부에만 content 텍스트 포함
        for (let i = 0; i < attachments.length; i++) {
            const a = attachments[i];
            const textContent = i === 0 ? content : '';
            try {
                let uploaded = null;
                if (state.supabase && me) {
                    uploaded = await uploadAttachment(a.file);
                } else {
                    // 샘플 모드 → 로컬 URL 사용
                    uploaded = {
                        url: a.previewUrl || '#',
                        name: a.file.name,
                        size: a.file.size,
                        mime: a.file.type,
                        type: a.file.type.startsWith('image/') ? 'image' : 'file'
                    };
                }
                await insertMessage({
                    room_id: state.activeRoomId,
                    sender_id: myId,
                    content: textContent,
                    message_type: uploaded.type,
                    attachment_url: uploaded.url,
                    attachment_name: uploaded.name,
                    attachment_size: uploaded.size,
                    attachment_mime: uploaded.mime,
                    reply_to: i === 0 ? replyTo : null
                });
            } catch (e) {
                console.warn('[Messenger] 첨부 업로드 실패', e);
                state.showToast('파일 업로드 실패: ' + escapeHtml(a.file.name));
            }
        }
    }

    async function insertMessage(msgData) {
        const myId = msgData.sender_id;

        // 낙관적 업데이트
        const tempMsg = Object.assign({
            id: 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            created_at: new Date().toISOString(),
        }, msgData);

        if (!state.messages[state.activeRoomId]) state.messages[state.activeRoomId] = [];
        state.messages[state.activeRoomId].push(tempMsg);
        renderMessages();

        // 방 목록의 last_message 업데이트
        const room = state.rooms.find((r) => r.id === state.activeRoomId);
        if (room) {
            room.last_message = tempMsg;
            renderRoomList();
        }

        // 샘플 모드 또는 미연결
        if (isSampleMode() || String(state.activeRoomId).startsWith('room-')) return;

        try {
            const insert = {
                room_id: msgData.room_id,
                sender_id: myId,
                content: msgData.content || '',
                message_type: msgData.message_type || 'text',
                is_read: false
            };
            if (msgData.attachment_url)  insert.attachment_url  = msgData.attachment_url;
            if (msgData.attachment_name) insert.attachment_name = msgData.attachment_name;
            if (msgData.attachment_size) insert.attachment_size = msgData.attachment_size;
            if (msgData.attachment_mime) insert.attachment_mime = msgData.attachment_mime;
            if (msgData.reply_to)        insert.reply_to        = msgData.reply_to;

            // 1:1 호환: receiver_id 도 채워두기 (구버전 코드 호환)
            if (room && room.type === 'direct') {
                const other = (room.members || []).find((m) => m.user_id !== myId);
                if (other) insert.receiver_id = other.user_id;
            }

            const { data, error } = await state.supabase
                .from('messages')
                .insert([insert])
                .select()
                .single();

            if (!error && data) {
                const arr = state.messages[state.activeRoomId];
                const idx = arr.findIndex((m) => m.id === tempMsg.id);
                if (idx !== -1) arr[idx] = data;
                renderMessages();
            }
        } catch (e) {
            console.warn('[Messenger] insertMessage 실패', e);
        }
    }

    // ============ 메시지 수정/삭제 ============
    function startEdit(msgId) {
        const messages = state.messages[state.activeRoomId] || [];
        const msg = messages.find((m) => m.id === msgId);
        if (!msg || msg.deleted_at) return;
        const newContent = prompt('메시지 수정', msg.content || '');
        if (newContent == null || newContent === msg.content) return;
        editMessage(msgId, newContent.trim());
    }

    async function editMessage(msgId, newContent) {
        const arr = state.messages[state.activeRoomId] || [];
        const msg = arr.find((m) => m.id === msgId);
        if (!msg) return;
        msg.content = newContent;
        msg.edited_at = new Date().toISOString();
        renderMessages();

        if (isSampleMode()) return;
        try {
            await state.supabase
                .from('messages')
                .update({ content: newContent, edited_at: msg.edited_at })
                .eq('id', msgId);
        } catch (e) {}
    }

    async function deleteMessage(msgId) {
        if (!confirm('이 메시지를 삭제하시겠습니까?')) return;
        const arr = state.messages[state.activeRoomId] || [];
        const msg = arr.find((m) => m.id === msgId);
        if (!msg) return;
        msg.deleted_at = new Date().toISOString();
        renderMessages();

        if (isSampleMode()) return;
        try {
            await state.supabase
                .from('messages')
                .update({ deleted_at: msg.deleted_at })
                .eq('id', msgId);
        } catch (e) {}
    }

    // ============ 이모지 반응 ============
    async function toggleReaction(msgId, emoji) {
        const me = getMyId() || 'me';
        if (!state.reactions[msgId]) state.reactions[msgId] = [];
        const list = state.reactions[msgId];
        const mineIdx = list.findIndex((r) => r.user_id === me && r.emoji === emoji);

        if (mineIdx !== -1) {
            // 제거
            list.splice(mineIdx, 1);
            renderMessages();
            if (isSampleMode()) return;
            try {
                await state.supabase
                    .from('message_reactions')
                    .delete()
                    .eq('message_id', msgId)
                    .eq('user_id', me)
                    .eq('emoji', emoji);
            } catch (e) {}
        } else {
            // 추가
            list.push({ message_id: msgId, user_id: me, emoji: emoji });
            renderMessages();
            if (isSampleMode()) return;
            try {
                await state.supabase
                    .from('message_reactions')
                    .insert([{ message_id: msgId, user_id: me, emoji: emoji }]);
            } catch (e) {}
        }
    }

    // ============ 북마크 ============
    async function loadBookmarks() {
        if (isSampleMode()) {
            state.bookmarks = [];
            return;
        }
        try {
            const { data } = await state.supabase
                .from('message_bookmarks')
                .select('message_id')
                .eq('user_id', getMyId());
            state.bookmarks = (data || []).map((b) => b.message_id);
        } catch (e) { state.bookmarks = []; }
    }

    async function toggleBookmark(msgId, btn) {
        const me = getMyId();
        const isBookmarked = state.bookmarks.includes(msgId);

        if (isBookmarked) {
            state.bookmarks = state.bookmarks.filter((id) => id !== msgId);
            if (btn) {
                btn.classList.remove('starred');
                btn.querySelector('i').className = 'fa-regular fa-star';
            }
            if (isSampleMode()) return;
            try {
                await state.supabase
                    .from('message_bookmarks')
                    .delete()
                    .eq('user_id', me)
                    .eq('message_id', msgId);
            } catch (e) {}
        } else {
            state.bookmarks.push(msgId);
            if (btn) {
                btn.classList.add('starred');
                btn.querySelector('i').className = 'fa-solid fa-star';
            }
            state.showToast('별표 표시됨 ⭐');
            if (isSampleMode()) return;
            try {
                await state.supabase
                    .from('message_bookmarks')
                    .insert([{ user_id: me, message_id: msgId }]);
            } catch (e) {}
        }
    }

    // ============ 핀 (고정 메시지) ============
    async function togglePin(msgId) {
        const arr = state.pinned[state.activeRoomId] || [];
        const existing = arr.find((m) => m.id === msgId);

        if (existing) {
            state.pinned[state.activeRoomId] = arr.filter((m) => m.id !== msgId);
            renderPinnedBar();
            if (isSampleMode()) return;
            try {
                await state.supabase
                    .from('pinned_messages')
                    .delete()
                    .eq('room_id', state.activeRoomId)
                    .eq('message_id', msgId);
            } catch (e) {}
        } else {
            const messages = state.messages[state.activeRoomId] || [];
            const msg = messages.find((m) => m.id === msgId);
            if (!msg) return;
            if (!state.pinned[state.activeRoomId]) state.pinned[state.activeRoomId] = [];
            state.pinned[state.activeRoomId].unshift(msg);
            renderPinnedBar();
            state.showToast('메시지가 고정되었습니다 📌');
            if (isSampleMode()) return;
            try {
                await state.supabase
                    .from('pinned_messages')
                    .insert([{ room_id: state.activeRoomId, message_id: msgId, pinned_by: getMyId() }]);
            } catch (e) {}
        }
    }

    function renderPinnedBar() {
        const container = document.getElementById('nx-pinned-bar-container');
        if (!container) return;
        const pins = state.pinned[state.activeRoomId] || [];
        if (!pins.length) {
            container.innerHTML = '';
            return;
        }
        const top = pins[0];
        const content = top.deleted_at ? '(삭제됨)'
                      : top.message_type === 'image' ? '📷 사진'
                      : top.message_type === 'file'  ? '📎 파일'
                      : (top.content || '');
        container.innerHTML = `<div class="nx-pinned-bar">
            <i class="fa-solid fa-thumbtack"></i>
            <div class="nx-pinned-bar-content">${escapeHtml(content)}</div>
            ${pins.length > 1 ? `<span style="font-size:0.72rem;color:var(--text-muted);">+${pins.length - 1}</span>` : ''}
            <button class="nx-pinned-bar-close" id="nx-pinned-bar-list" type="button" title="고정 목록"><i class="fa-solid fa-list"></i></button>
        </div>`;
        container.querySelector('.nx-pinned-bar').addEventListener('click', (e) => {
            if (e.target.closest('.nx-pinned-bar-close')) return;
            // 원본 메시지로 스크롤
            const target = document.querySelector(`.nx-chat-message[data-msg-id="${top.id}"]`);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        const listBtn = container.querySelector('#nx-pinned-bar-list');
        if (listBtn) listBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPinnedDialog();
        });
    }

    // ============ 안 읽음 처리 ============
    async function markRoomAsRead(roomId) {
        const room = state.rooms.find((r) => r.id === roomId);
        if (room) {
            room.unread = 0;
            room.last_read_at = new Date().toISOString();
        }
        updateUnreadBadges();
        renderRoomList();

        if (isSampleMode() || String(roomId).startsWith('room-')) return;
        try {
            await state.supabase
                .from('chat_room_members')
                .update({ last_read_at: new Date().toISOString() })
                .eq('room_id', roomId)
                .eq('user_id', getMyId());
        } catch (e) {}
    }

    function updateUnreadBadges() {
        const total = state.rooms.reduce((sum, r) => sum + (r.unread || 0), 0);
        const display = total > 9 ? '9+' : String(total);

        const floating = document.getElementById('nx-floating-msg-badge');
        if (floating) {
            floating.style.display = total > 0 ? 'flex' : 'none';
            floating.textContent = display;
        }
        if (state.headerBadgeId) {
            const header = document.getElementById(state.headerBadgeId);
            if (header) {
                header.style.display = total > 0 ? 'flex' : 'none';
                header.textContent = display;
            }
        }
        if (typeof state.onUnreadChange === 'function') {
            try { state.onUnreadChange(total); } catch (e) {}
        }
    }

    // ============ 보조 다이얼로그들 ============
    function showSubModal(title, bodyHtml, footerHtml) {
        let overlay = document.getElementById('nx-sub-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'nx-sub-modal-overlay';
            overlay.id = 'nx-sub-modal-overlay';
            overlay.innerHTML = `<div class="nx-sub-modal-box">
                <div class="nx-sub-modal-header">
                    <h3 id="nx-sub-modal-title"></h3>
                    <button class="nx-msg-modal-close" type="button"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="nx-sub-modal-body" id="nx-sub-modal-body"></div>
                <div class="nx-sub-modal-footer" id="nx-sub-modal-footer"></div>
            </div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('.nx-msg-modal-close').addEventListener('click', () => overlay.classList.remove('open'));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
        }
        overlay.querySelector('#nx-sub-modal-title').textContent = title;
        overlay.querySelector('#nx-sub-modal-body').innerHTML = bodyHtml;
        const footer = overlay.querySelector('#nx-sub-modal-footer');
        footer.innerHTML = footerHtml || '';
        footer.style.display = footerHtml ? 'flex' : 'none';
        overlay.classList.add('open');
        return overlay;
    }

    function closeSubModal() {
        const overlay = document.getElementById('nx-sub-modal-overlay');
        if (overlay) overlay.classList.remove('open');
    }

    // --- 새 채팅 (1:1 시작 또는 그룹 만들기) ---
    function openNewChatDialog() {
        const body = `
            <div style="margin-bottom:12px;">
                <input type="text" id="nx-new-group-name" placeholder="그룹 이름 (1:1은 비워두세요)" class="nx-chat-search" />
            </div>
            <input type="text" id="nx-new-chat-search" placeholder="이름/부서 검색..." class="nx-chat-search" style="margin-bottom:10px;" />
            <div class="nx-member-checklist" id="nx-new-chat-members"></div>
            <p id="nx-new-chat-hint" style="font-size:0.78rem;color:var(--text-muted);margin-top:10px;">
                💡 1명 선택 → 1:1 채팅 / 2명 이상 → 그룹 이름 필수
            </p>
        `;
        const footer = `
            <button class="nx-btn-secondary" id="nx-new-chat-cancel" type="button">취소</button>
            <button class="nx-btn-primary" id="nx-new-chat-create" type="button" disabled>채팅 시작</button>
        `;
        showSubModal('새 채팅', body, footer);

        const memList = document.getElementById('nx-new-chat-members');
        const searchInput = document.getElementById('nx-new-chat-search');
        const nameInput = document.getElementById('nx-new-group-name');
        const createBtn = document.getElementById('nx-new-chat-create');

        const selected = new Set();
        const renderMemList = (filterQ) => {
            const q = (filterQ || '').toLowerCase();
            const profiles = state.allChatProfiles.filter((p) =>
                !q || (p.full_name || '').toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q)
            );
            if (!profiles.length) {
                memList.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px;">동료가 없습니다</p>';
                return;
            }
            memList.innerHTML = profiles.map((p) => {
                const av = p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`;
                return `<label class="nx-member-check-item">
                    <input type="checkbox" data-uid="${escapeAttr(p.id)}" data-name="${escapeAttr(p.full_name || '')}" data-avatar="${escapeAttr(av)}" ${selected.has(p.id) ? 'checked' : ''}>
                    <div class="nx-avatar" style="background-image:url('${escapeAttr(av)}');"></div>
                    <div class="info">
                        <h5>${escapeHtml(p.full_name || '동료')}</h5>
                        <p>${escapeHtml(p.department || '')}</p>
                    </div>
                </label>`;
            }).join('');
            memList.querySelectorAll('input[type=checkbox]').forEach((cb) => {
                cb.addEventListener('change', () => {
                    const uid = cb.dataset.uid;
                    if (cb.checked) selected.add(uid); else selected.delete(uid);
                    updateCreateBtn();
                });
            });
        };

        const updateCreateBtn = () => {
            const count = selected.size;
            const name = (nameInput.value || '').trim();
            createBtn.disabled = count === 0 || (count >= 2 && !name);
            createBtn.textContent = count === 0 ? '채팅 시작'
                                  : count === 1 ? '1:1 채팅 시작'
                                  : `그룹 만들기 (${count}명)`;
        };

        searchInput.addEventListener('input', (e) => renderMemList(e.target.value));
        nameInput.addEventListener('input', updateCreateBtn);
        document.getElementById('nx-new-chat-cancel').addEventListener('click', closeSubModal);
        createBtn.addEventListener('click', async () => {
            const ids = Array.from(selected);
            const name = (nameInput.value || '').trim();
            if (!ids.length) return;
            if (ids.length === 1) {
                // 1:1 — 마지막 체크박스에서 정보 얻기
                const cb = memList.querySelector(`input[data-uid="${ids[0]}"]`);
                openDirectWithUser(ids[0], cb && cb.dataset.name, cb && cb.dataset.avatar);
                closeSubModal();
            } else {
                if (!name) return;
                await createGroupRoom(name, ids);
                closeSubModal();
            }
        });

        renderMemList('');
        updateCreateBtn();
    }

    async function openDirectWithUser(userId, userName, userAvatar) {
        // 이미 있는 1:1 방 찾기
        const me = getMyId() || 'me';
        const existing = state.rooms.find((r) => {
            if (r.type !== 'direct') return false;
            const ids = (r.members || []).map((m) => m.user_id);
            return ids.includes(userId) && ids.includes(me);
        });
        if (existing) {
            openRoom(existing.id);
            return;
        }

        // 새로 생성
        if (isSampleMode()) {
            // 샘플 모드: 즉석 방 생성
            const newRoom = {
                id: 'room-new-' + Date.now(),
                type: 'direct',
                members: [
                    { user_id: me, profiles: getCurrentProfile() || { full_name: '나' } },
                    { user_id: userId, profiles: { full_name: userName, avatar_url: userAvatar, id: userId } }
                ],
                last_message: null,
                unread: 0
            };
            state.rooms.unshift(newRoom);
            state.messages[newRoom.id] = [];
            renderRoomList();
            openRoom(newRoom.id);
            return;
        }

        try {
            const { data: roomId } = await state.supabase.rpc('get_or_create_direct_room', { other_user_id: userId });
            if (!roomId) throw new Error('방 생성 실패');
            await loadRooms();
            openRoom(roomId);
        } catch (e) {
            console.warn('[Messenger] 1:1 방 생성 실패', e);
            state.showToast('채팅방을 생성할 수 없습니다.');
        }
    }

    async function createGroupRoom(name, memberIds) {
        if (isSampleMode()) {
            const me = getMyId() || 'me';
            const myProf = getCurrentProfile() || { full_name: '나' };
            const newRoom = {
                id: 'room-new-' + Date.now(),
                type: 'group',
                name: name,
                members: [
                    { user_id: me, role: 'owner', profiles: myProf },
                    ...memberIds.map((id) => {
                        const p = state.allChatProfiles.find((x) => x.id === id) || { id, full_name: '동료' };
                        return { user_id: id, role: 'member', profiles: p };
                    })
                ],
                last_message: null,
                unread: 0,
                my_role: 'owner'
            };
            state.rooms.unshift(newRoom);
            state.messages[newRoom.id] = [
                { id: 'sm-sys', room_id: newRoom.id, sender_id: 'system', content: `${name} 그룹이 생성되었습니다.`, created_at: new Date().toISOString(), message_type: 'system' }
            ];
            renderRoomList();
            openRoom(newRoom.id);
            state.showToast('그룹 채팅방이 생성되었습니다 ✨');
            return newRoom.id;
        }

        try {
            const { data: roomId } = await state.supabase.rpc('create_group_room', {
                room_name: name,
                member_ids: memberIds
            });
            if (!roomId) throw new Error('생성 실패');

            // 시스템 메시지
            await state.supabase.from('messages').insert([{
                room_id: roomId,
                sender_id: getMyId(),
                content: `${name} 그룹이 생성되었습니다.`,
                message_type: 'system'
            }]);

            await loadRooms();
            openRoom(roomId);
            state.showToast('그룹 채팅방이 생성되었습니다 ✨');
            return roomId;
        } catch (e) {
            console.warn('[Messenger] 그룹 생성 실패', e);
            state.showToast('그룹을 생성할 수 없습니다.');
            return null;
        }
    }

    // --- 그룹 멤버 보기 ---
    function openMembersDialog() {
        const room = state.activeRoom;
        if (!room || room.type !== 'group') return;
        const me = getMyId() || 'me';
        const isOwner = room.my_role === 'owner' || room.my_role === 'admin';

        const body = `
            <div style="margin-bottom:14px;font-size:0.85rem;color:var(--text-muted);">
                <strong style="color:var(--text-main);">${(room.members || []).length}명</strong>의 멤버
            </div>
            <div class="nx-member-checklist">
                ${(room.members || []).map((m) => {
                    const p = m.profiles || {};
                    const av = p.avatar_url || `https://i.pravatar.cc/150?u=${m.user_id}`;
                    const isMe = m.user_id === me;
                    return `<div class="nx-member-check-item" style="cursor:default;">
                        <div class="nx-avatar" style="background-image:url('${escapeAttr(av)}');"></div>
                        <div class="info">
                            <h5>${escapeHtml(p.full_name || '동료')} ${isMe ? '<span style="color:var(--primary-color);font-size:0.72rem;">(나)</span>' : ''}</h5>
                            <p>${escapeHtml(p.department || '')} ${m.role === 'owner' ? '· 👑 방장' : m.role === 'admin' ? '· 관리자' : ''}</p>
                        </div>
                        ${state.onlineUsers.has(m.user_id) ? '<span class="nx-online-dot online" style="position:static;border:none;width:8px;height:8px;"></span>' : ''}
                    </div>`;
                }).join('')}
            </div>
            ${isOwner ? '<button class="nx-btn-secondary" id="nx-add-member-btn" style="margin-top:14px;width:100%;"><i class="fa-solid fa-user-plus"></i> 멤버 추가</button>' : ''}
        `;
        const footer = `
            <button class="nx-btn-secondary" id="nx-leave-room-btn" type="button" style="color:var(--danger);">방 나가기</button>
            <button class="nx-btn-primary" id="nx-close-members" type="button">확인</button>
        `;
        showSubModal('그룹 멤버', body, footer);
        document.getElementById('nx-close-members').addEventListener('click', closeSubModal);
        document.getElementById('nx-leave-room-btn').addEventListener('click', leaveCurrentRoom);
        const addBtn = document.getElementById('nx-add-member-btn');
        if (addBtn) addBtn.addEventListener('click', openAddMemberDialog);
    }

    function openAddMemberDialog() {
        const room = state.activeRoom;
        if (!room) return;
        const existingIds = new Set((room.members || []).map((m) => m.user_id));
        const candidates = state.allChatProfiles.filter((p) => !existingIds.has(p.id));

        const body = `
            <input type="text" id="nx-add-mem-search" placeholder="이름/부서 검색..." class="nx-chat-search" style="margin-bottom:10px;" />
            <div class="nx-member-checklist" id="nx-add-mem-list"></div>
        `;
        const footer = `
            <button class="nx-btn-secondary" id="nx-add-mem-cancel" type="button">취소</button>
            <button class="nx-btn-primary" id="nx-add-mem-confirm" type="button" disabled>추가</button>
        `;
        showSubModal('멤버 추가', body, footer);

        const memList = document.getElementById('nx-add-mem-list');
        const confirmBtn = document.getElementById('nx-add-mem-confirm');
        const selected = new Set();

        const render = (q) => {
            q = (q || '').toLowerCase();
            const filtered = candidates.filter((p) =>
                !q || (p.full_name || '').toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q)
            );
            if (!filtered.length) {
                memList.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:20px;">추가 가능한 동료가 없습니다</p>';
                return;
            }
            memList.innerHTML = filtered.map((p) => {
                const av = p.avatar_url || `https://i.pravatar.cc/150?u=${p.id}`;
                return `<label class="nx-member-check-item">
                    <input type="checkbox" data-uid="${escapeAttr(p.id)}" ${selected.has(p.id) ? 'checked' : ''}>
                    <div class="nx-avatar" style="background-image:url('${escapeAttr(av)}');"></div>
                    <div class="info">
                        <h5>${escapeHtml(p.full_name || '동료')}</h5>
                        <p>${escapeHtml(p.department || '')}</p>
                    </div>
                </label>`;
            }).join('');
            memList.querySelectorAll('input').forEach((cb) => {
                cb.addEventListener('change', () => {
                    if (cb.checked) selected.add(cb.dataset.uid); else selected.delete(cb.dataset.uid);
                    confirmBtn.disabled = selected.size === 0;
                });
            });
        };

        document.getElementById('nx-add-mem-search').addEventListener('input', (e) => render(e.target.value));
        document.getElementById('nx-add-mem-cancel').addEventListener('click', closeSubModal);
        confirmBtn.addEventListener('click', () => addMembersToRoom(Array.from(selected)));
        render('');
    }

    async function addMembersToRoom(memberIds) {
        if (!memberIds.length || !state.activeRoom) return;
        const room = state.activeRoom;

        if (isSampleMode()) {
            memberIds.forEach((id) => {
                const p = state.allChatProfiles.find((x) => x.id === id);
                if (p && !room.members.find((m) => m.user_id === id)) {
                    room.members.push({ user_id: id, role: 'member', profiles: p });
                }
            });
            state.showToast(`${memberIds.length}명을 추가했습니다`);
            closeSubModal();
            openRoom(room.id);
            return;
        }

        try {
            const rows = memberIds.map((id) => ({ room_id: room.id, user_id: id, role: 'member' }));
            await state.supabase.from('chat_room_members').insert(rows);
            // 시스템 메시지
            const names = memberIds.map((id) => {
                const p = state.allChatProfiles.find((x) => x.id === id);
                return p ? p.full_name : '동료';
            }).join(', ');
            await state.supabase.from('messages').insert([{
                room_id: room.id, sender_id: getMyId(),
                content: `${names} 님이 추가되었습니다.`, message_type: 'system'
            }]);
            await loadRooms();
            openRoom(room.id);
            closeSubModal();
            state.showToast('멤버가 추가되었습니다');
        } catch (e) {
            console.warn('[Messenger] 멤버 추가 실패', e);
            state.showToast('멤버를 추가할 수 없습니다');
        }
    }

    async function leaveCurrentRoom() {
        const room = state.activeRoom;
        if (!room) return;
        if (!confirm(`"${getRoomDisplay(room).name}" 에서 나가시겠습니까?`)) return;

        if (isSampleMode()) {
            state.rooms = state.rooms.filter((r) => r.id !== room.id);
            state.activeRoomId = null;
            state.activeRoom = null;
            renderRoomList();
            const mainArea = document.getElementById('nx-chat-main-area');
            if (mainArea) mainArea.innerHTML = `<div class="nx-chat-empty"><i class="fa-solid fa-comments"></i><p>대화 상대를 선택하세요</p></div>`;
            closeSubModal();
            return;
        }

        try {
            await state.supabase
                .from('chat_room_members')
                .delete()
                .eq('room_id', room.id)
                .eq('user_id', getMyId());
            await loadRooms();
            state.activeRoomId = null;
            state.activeRoom = null;
            const mainArea = document.getElementById('nx-chat-main-area');
            if (mainArea) mainArea.innerHTML = `<div class="nx-chat-empty"><i class="fa-solid fa-comments"></i><p>대화 상대를 선택하세요</p></div>`;
            closeSubModal();
        } catch (e) {}
    }

    // --- 메시지 검색 ---
    function openSearchDialog() {
        const body = `
            <input type="text" id="nx-msg-search-input" placeholder="검색어를 입력하세요..." class="nx-chat-search" style="margin-bottom:12px;" />
            <div id="nx-msg-search-results"><p style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:30px 0;">검색어를 입력해주세요</p></div>
        `;
        showSubModal('메시지 검색', body, '');
        const input = document.getElementById('nx-msg-search-input');
        input.focus();
        let timer = null;
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => doSearch(input.value), 300);
        });
    }

    async function doSearch(query) {
        const container = document.getElementById('nx-msg-search-results');
        if (!container) return;
        query = (query || '').trim();
        if (!query) {
            container.innerHTML = `<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:30px 0;">검색어를 입력해주세요</p>`;
            return;
        }

        let results = [];
        if (isSampleMode()) {
            // 샘플 모드: 메모리에서 검색
            Object.keys(state.messages).forEach((rid) => {
                (state.messages[rid] || []).forEach((m) => {
                    if (m.content && m.content.toLowerCase().includes(query.toLowerCase()) && !m.deleted_at) {
                        results.push(Object.assign({}, m, { _room_id: rid }));
                    }
                });
            });
        } else {
            try {
                const myRoomIds = state.rooms.map((r) => r.id);
                const { data } = await state.supabase
                    .from('messages')
                    .select('*')
                    .in('room_id', myRoomIds)
                    .ilike('content', `%${query}%`)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
                    .limit(50);
                results = (data || []).map((m) => Object.assign({}, m, { _room_id: m.room_id }));
            } catch (e) { results = []; }
        }

        if (!results.length) {
            container.innerHTML = `<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:30px 0;">검색 결과가 없습니다</p>`;
            return;
        }

        const q = query.toLowerCase();
        container.innerHTML = `<div style="margin-bottom:10px;font-size:0.78rem;color:var(--text-muted);">${results.length}개의 결과</div>` +
            results.map((m) => {
                const room = state.rooms.find((r) => r.id === m._room_id);
                const roomName = room ? getRoomDisplay(room).name : '대화방';
                const sender = getProfile(m.sender_id);
                const date = new Date(m.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const content = (m.content || '').replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="highlight">$1</span>');
                return `<div class="nx-search-result-item" data-room-id="${escapeAttr(m._room_id)}" data-msg-id="${escapeAttr(m.id)}">
                    <div class="meta">
                        <span>${escapeHtml(roomName)} · ${escapeHtml(sender.full_name || '동료')}</span>
                        <span>${date}</span>
                    </div>
                    <div class="content">${content}</div>
                </div>`;
            }).join('');

        container.querySelectorAll('.nx-search-result-item').forEach((item) => {
            item.addEventListener('click', async () => {
                closeSubModal();
                await openRoom(item.dataset.roomId);
                // 해당 메시지로 스크롤
                setTimeout(() => {
                    const target = document.querySelector(`.nx-chat-message[data-msg-id="${item.dataset.msgId}"]`);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.style.transition = 'background 0.3s';
                        target.style.background = 'rgba(250,204,21,0.2)';
                        setTimeout(() => { target.style.background = ''; }, 1500);
                    }
                }, 300);
            });
        });
    }

    // --- 북마크(별표) 목록 ---
    async function openBookmarksDialog() {
        await loadBookmarks();
        const body = `<div id="nx-bookmarks-list"></div>`;
        showSubModal('⭐ 별표 메시지', body, '');
        renderBookmarksList();
    }

    async function renderBookmarksList() {
        const container = document.getElementById('nx-bookmarks-list');
        if (!container) return;

        if (!state.bookmarks.length) {
            container.innerHTML = `<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:30px 0;">별표 표시한 메시지가 없습니다</p>`;
            return;
        }

        let msgs = [];
        if (isSampleMode()) {
            Object.keys(state.messages).forEach((rid) => {
                (state.messages[rid] || []).forEach((m) => {
                    if (state.bookmarks.includes(m.id)) msgs.push(Object.assign({}, m, { _room_id: rid }));
                });
            });
        } else {
            try {
                const { data } = await state.supabase
                    .from('messages')
                    .select('*')
                    .in('id', state.bookmarks)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false });
                msgs = (data || []).map((m) => Object.assign({}, m, { _room_id: m.room_id }));
            } catch (e) { msgs = []; }
        }

        if (!msgs.length) {
            container.innerHTML = `<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:30px 0;">별표 메시지가 없습니다</p>`;
            return;
        }

        container.innerHTML = msgs.map((m) => {
            const room = state.rooms.find((r) => r.id === m._room_id);
            const roomName = room ? getRoomDisplay(room).name : '대화방';
            const sender = getProfile(m.sender_id);
            const date = new Date(m.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `<div class="nx-search-result-item" data-room-id="${escapeAttr(m._room_id)}" data-msg-id="${escapeAttr(m.id)}">
                <div class="meta">
                    <span>${escapeHtml(roomName)} · ${escapeHtml(sender.full_name || '동료')}</span>
                    <span>${date}</span>
                </div>
                <div class="content">${escapeHtml(m.content || (m.message_type === 'image' ? '📷 사진' : m.message_type === 'file' ? '📎 파일' : ''))}</div>
            </div>`;
        }).join('');

        container.querySelectorAll('.nx-search-result-item').forEach((item) => {
            item.addEventListener('click', async () => {
                closeSubModal();
                await openRoom(item.dataset.roomId);
                setTimeout(() => {
                    const target = document.querySelector(`.nx-chat-message[data-msg-id="${item.dataset.msgId}"]`);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.style.background = 'rgba(250,204,21,0.2)';
                        setTimeout(() => { target.style.background = ''; }, 1500);
                    }
                }, 300);
            });
        });
    }

    // --- 고정 메시지 목록 ---
    function openPinnedDialog() {
        const pins = state.pinned[state.activeRoomId] || [];
        let body;
        if (!pins.length) {
            body = `<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;padding:30px 0;">고정된 메시지가 없습니다<br><small>메시지에 마우스를 올리고 📌 버튼을 누르세요</small></p>`;
        } else {
            body = pins.map((m) => {
                const sender = getProfile(m.sender_id);
                const date = new Date(m.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `<div class="nx-search-result-item" data-msg-id="${escapeAttr(m.id)}">
                    <div class="meta">
                        <span>📌 ${escapeHtml(sender.full_name || '동료')}</span>
                        <span>${date}</span>
                    </div>
                    <div class="content">${escapeHtml(m.content || (m.message_type === 'image' ? '📷 사진' : m.message_type === 'file' ? '📎 파일' : ''))}</div>
                </div>`;
            }).join('');
        }
        showSubModal('📌 고정된 메시지', body, '');
        document.querySelectorAll('#nx-sub-modal-body .nx-search-result-item').forEach((item) => {
            item.addEventListener('click', () => {
                closeSubModal();
                setTimeout(() => {
                    const target = document.querySelector(`.nx-chat-message[data-msg-id="${item.dataset.msgId}"]`);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.style.background = 'rgba(67,97,238,0.1)';
                        setTimeout(() => { target.style.background = ''; }, 1500);
                    }
                }, 200);
            });
        });
    }

    // ============ 실시간 구독 (Realtime) ============
    function subscribeToRealtime() {
        const me = getCurrentUser();
        if (!me || !state.supabase) return;

        // 기존 구독 해제
        state.subscriptions.forEach((sub) => {
            try { state.supabase.removeChannel(sub); } catch (e) {}
        });
        state.subscriptions = [];

        // 메시지 INSERT 구독 — 내가 속한 방들
        const myRoomIds = state.rooms.map((r) => r.id);
        if (!myRoomIds.length) return;

        const msgChannel = state.supabase
            .channel('nx_messages_v2')
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages'
            }, (payload) => handleNewMessage(payload.new))
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'messages'
            }, (payload) => handleMessageUpdate(payload.new))
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'message_reactions'
            }, (payload) => handleReactionChange(payload.new, 'add'))
            .on('postgres_changes', {
                event: 'DELETE', schema: 'public', table: 'message_reactions'
            }, (payload) => handleReactionChange(payload.old, 'remove'))
            .subscribe();

        state.subscriptions.push(msgChannel);

        // Presence (온라인 상태)
        subscribePresence();
    }

    function subscribePresence() {
        const me = getCurrentUser();
        if (!me || !state.supabase) return;

        if (state.presenceChannel) {
            try { state.supabase.removeChannel(state.presenceChannel); } catch (e) {}
        }

        const channel = state.supabase.channel('nx_presence', {
            config: { presence: { key: me.id } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const ps = channel.presenceState();
                state.onlineUsers = new Set(Object.keys(ps));
                renderRoomList();
                refreshActiveRoomStatus();
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                handleTypingBroadcast(payload.payload);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() });
                }
            });

        state.presenceChannel = channel;
    }

    function refreshActiveRoomStatus() {
        if (!state.activeRoom || state.activeRoom.type !== 'direct') return;
        const d = getRoomDisplay(state.activeRoom);
        const statusEl = document.getElementById('nx-chat-user-status');
        if (statusEl && d.otherUserId) {
            statusEl.textContent = state.onlineUsers.has(d.otherUserId) ? '🟢 온라인' : '오프라인';
            statusEl.classList.remove('typing-indicator');
        }
    }

    function broadcastTyping() {
        if (!state.presenceChannel || !state.activeRoom) return;
        if (state.activeRoom.type !== 'direct') return; // 1:1 만 우선 구현
        const d = getRoomDisplay(state.activeRoom);
        if (!d.otherUserId) return;
        try {
            state.presenceChannel.send({
                type: 'broadcast',
                event: 'typing',
                payload: { from: getMyId(), to: d.otherUserId, room_id: state.activeRoomId }
            });
        } catch (e) {}
    }

    function handleTypingBroadcast(payload) {
        if (!payload || payload.to !== getMyId()) return;
        if (!state.activeRoom || state.activeRoom.id !== payload.room_id) return;
        const statusEl = document.getElementById('nx-chat-user-status');
        if (!statusEl) return;
        statusEl.textContent = '입력 중...';
        statusEl.classList.add('typing-indicator');
        clearTimeout(state.typingTimeout);
        state.typingTimeout = setTimeout(() => refreshActiveRoomStatus(), 2000);
    }

    function handleNewMessage(msg) {
        if (!msg || !msg.room_id) return;
        const room = state.rooms.find((r) => r.id === msg.room_id);
        if (!room) {
            // 새로 추가된 방일 수도 있음 → 방 목록 리프레시
            loadRooms();
            return;
        }

        if (!state.messages[msg.room_id]) state.messages[msg.room_id] = [];
        // 중복 체크 (낙관적 업데이트와 충돌 방지)
        if (state.messages[msg.room_id].some((m) => m.id === msg.id)) return;

        state.messages[msg.room_id].push(msg);
        room.last_message = msg;

        const myId = getMyId();
        if (msg.sender_id === myId) {
            renderRoomList();
            if (msg.room_id === state.activeRoomId) renderMessages();
            return;
        }

        // 활성 방 → 바로 표시 & 읽음 처리
        if (msg.room_id === state.activeRoomId && state.opened) {
            renderMessages();
            markRoomAsRead(msg.room_id);
        } else {
            room.unread = (room.unread || 0) + 1;
            updateUnreadBadges();
            renderRoomList();
            showMessageNotification(msg, room);
        }
    }

    function handleMessageUpdate(msg) {
        if (!msg || !msg.room_id) return;
        const arr = state.messages[msg.room_id];
        if (!arr) return;
        const idx = arr.findIndex((m) => m.id === msg.id);
        if (idx === -1) return;
        arr[idx] = msg;
        if (msg.room_id === state.activeRoomId) renderMessages();
    }

    function handleReactionChange(r, action) {
        if (!r || !r.message_id) return;
        if (!state.reactions[r.message_id]) state.reactions[r.message_id] = [];
        if (action === 'add') {
            // 중복 방지
            if (!state.reactions[r.message_id].some((x) => x.user_id === r.user_id && x.emoji === r.emoji)) {
                state.reactions[r.message_id].push(r);
            }
        } else {
            state.reactions[r.message_id] = state.reactions[r.message_id]
                .filter((x) => !(x.user_id === r.user_id && x.emoji === r.emoji));
        }
        renderMessages();
    }

    // ============ 알림 팝업 ============
    function showMessageNotification(msg, room) {
        const sender = getProfile(msg.sender_id);
        const senderName = sender.full_name || '동료';
        const senderAvatar = sender.avatar_url || `https://i.pravatar.cc/150?u=${msg.sender_id}`;
        const roomName = getRoomDisplay(room).name;
        const isGroup = room.type === 'group';

        const container = document.getElementById('nx-msg-notification-container');
        if (!container) return;

        const notifId = 'nx-msg-notif-' + Date.now();
        const card = document.createElement('div');
        card.className = 'nx-msg-notif-card';
        card.id = notifId;

        const previewText = msg.message_type === 'image' ? '📷 사진'
                          : msg.message_type === 'file'  ? '📎 ' + (msg.attachment_name || '파일')
                          : msg.content;

        card.innerHTML = `
            <div class="nx-msg-notif-avatar" style="background-image:url('${escapeAttr(senderAvatar)}');"></div>
            <div class="nx-msg-notif-content">
                <h5>${escapeHtml(senderName)}${isGroup ? ` <span style="font-weight:normal;color:var(--text-muted);">· ${escapeHtml(roomName)}</span>` : ''}</h5>
                <p>${escapeHtml(previewText)}</p>
            </div>
            <button class="nx-msg-notif-close" type="button" aria-label="닫기">✕</button>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                openRoom(room.id);
                if (!state.opened) openMessenger();
                dismissNotif(notifId);
            }
        });
        card.querySelector('.nx-msg-notif-close').addEventListener('click', (e) => {
            e.stopPropagation();
            dismissNotif(notifId);
        });

        container.appendChild(card);
        setTimeout(() => dismissNotif(notifId), 5000);
    }

    function dismissNotif(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('hiding');
        setTimeout(() => el.remove(), 300);
    }

    // ============ 화상회의 ============
    function startInstantMeeting() {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const link = `https://meet.nexus.com/${code}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).catch(() => {});
        }
        // 채팅방에 자동 메시지
        const input = document.getElementById('nx-chat-input');
        if (input && state.activeRoomId) {
            input.value = `📹 화상회의를 시작합니다: ${link}`;
            sendMessage();
        }
        state.showToast(`<strong>${link}</strong><br>링크가 클립보드에 복사되었습니다.`);
    }

    // ============ 메신저 모달 열기/닫기 ============
    function openMessenger() {
        const modal = document.getElementById('nx-messenger-modal');
        if (!modal) return;
        modal.classList.add('open');
        state.opened = true;
        loadRooms();
        loadBookmarks();
    }

    function closeMessenger() {
        const modal = document.getElementById('nx-messenger-modal');
        if (!modal) return;
        modal.classList.remove('open');
        state.opened = false;
    }

    // ============ 정리 ============
    window.addEventListener('beforeunload', () => {
        state.subscriptions.forEach((sub) => {
            try { state.supabase.removeChannel(sub); } catch (e) {}
        });
        if (state.presenceChannel && state.supabase) {
            try { state.supabase.removeChannel(state.presenceChannel); } catch (e) {}
        }
    });

    // ============ 공개 API ============
    window.Messenger = {
        __initialized: false,

        init: function (options) {
            options = options || {};

            state.supabase = options.supabaseClient || window.supabaseClient || null;
            state.getCurrentUser = options.getCurrentUser || (() => window.currentUser || null);
            state.getCurrentProfile = options.getCurrentProfile || (() => window.currentProfile || null);
            state.showToast = options.showToast || window.showToast || ((m) => console.log('[Toast]', m));
            state.headerBadgeId = options.headerBadgeId || null;
            state.onUnreadChange = options.onUnreadChange || null;
            state.storageBucket = options.storageBucket || 'messenger-files';

            const initLogic = () => {
                injectModal();
                injectNotificationContainer();
                injectImageLightbox();
                if (options.floatingButton !== false) injectFloatingButton();

                if (state.supabase && getCurrentUser()) {
                    loadRooms();
                    loadBookmarks();
                }
                this.__initialized = true;
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initLogic.bind(this));
            } else {
                initLogic.call(this);
            }
            return this;
        },

        open: openMessenger,
        close: closeMessenger,
        openWith: openDirectWithUser,
        openRoom: openRoom,
        createGroup: createGroupRoom,
        refresh: loadRooms,
        getUnreadCount: function () {
            return state.rooms.reduce((s, r) => s + (r.unread || 0), 0);
        }
    };
})(window, document);