// contexts/MeetingRoomContext.jsx
// 회의실 예약 데이터 로직 단일 출처.
// 원본 script.js 14번(회의실 예약) + 15번(관리자 회의실 추가/삭제) 블록을
// React 상태로 이관.
//
// 설계 메모:
//  - 테이블 2개: meeting_rooms(회의실 마스터), room_bookings(예약).
//  - 원본의 데모 데이터 폴백은 옮기지 않는다. 로그인 사용자 기준으로만 동작.
//  - 관리자 회의실 추가/삭제(addRoom/deleteRoom)는 이 Context 에 구현해 두지만
//    UI(관리자 페이지)는 아직 없다 — 관리자 페이지 마이그레이션 때 useMeetingRoom()
//    으로 꺼내 쓰면 된다. 지금은 호출부가 없어도 정상.
//  - Realtime 대신 날짜 변경/예약 변경 시 명시적 refetch (디버깅 메모: Realtime +
//    StrictMode 충돌 회피). 폴링은 두지 않는다 — 예약 화면은 날짜 단위 조회라
//    사용자가 날짜를 바꾸거나 액션할 때만 갱신하면 충분.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr } from '../config/meetingRoomConfig';

const MeetingRoomContext = createContext(null);

export function MeetingRoomProvider({ children }) {
  const { user, profile } = useAuth();

  /* 선택된 날짜 (YYYY-MM-DD) */
  const [date, setDate] = useState(() => todayStr());

  /* 회의실 마스터 + 선택 날짜의 예약 목록 */
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── 모달 상태 ──
     예약 모달:        bookingModal = { open, room, timeSlot } | closed
     예약 수정/삭제:   editModal = { open, booking } | closed
     (관리자 추가 모달은 관리자 페이지 소관이므로 여기서 관리하지 않음) */
  const [bookingModal, setBookingModal] = useState({
    open: false,
    room: null,
    timeSlot: null,
  });
  const [editModal, setEditModal] = useState({ open: false, booking: null });

  const openBookingModal = useCallback(
    (room, timeSlot) => setBookingModal({ open: true, room, timeSlot }),
    []
  );
  const closeBookingModal = useCallback(
    () => setBookingModal({ open: false, room: null, timeSlot: null }),
    []
  );
  const openEditModal = useCallback(
    (booking) => setEditModal({ open: true, booking }),
    []
  );
  const closeEditModal = useCallback(
    () => setEditModal({ open: false, booking: null }),
    []
  );

  /* StrictMode 이중 호출 / 언마운트 후 setState 방어 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ── 데이터 로드 — 원본 loadMeetingRooms 이관 ──
     회의실 마스터 + 해당 날짜 예약을 함께 조회. */
  const refresh = useCallback(
    async (targetDate = date) => {
      if (!user) {
        setRooms([]);
        setBookings([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [{ data: roomData, error: e1 }, { data: bookData, error: e2 }] =
          await Promise.all([
            supabase.from('meeting_rooms').select('*').order('name'),
            supabase
              .from('room_bookings')
              .select('*')
              .eq('date', targetDate),
          ]);
        if (e1) throw e1;
        if (e2) throw e2;

        if (!mountedRef.current) return;
        setRooms(roomData || []);
        setBookings(bookData || []);
      } catch (err) {
        console.error('[MeetingRoomContext.refresh]', err);
        if (mountedRef.current) {
          setError(err.message || '데이터 로드 실패');
          setRooms([]);
          setBookings([]);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [user, date]
  );

  /* 날짜 변경 / 로그인 변경 시 재로드 — 원본 date-picker change 리스너 대응 */
  useEffect(() => {
    refresh(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, user]);

  /* ── 예약 생성 — 원본 confirmRoomBooking 이관 ──
     args: { roomId, timeSlot, reason } */
  const createBooking = useCallback(
    async ({ roomId, timeSlot, reason }) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      const trimmed = (reason || '').trim();
      if (!trimmed) return { ok: false, error: '사용 목적을 입력해주세요.' };

      try {
        const { error } = await supabase.from('room_bookings').insert([
          {
            room_id: roomId,
            date,
            time_slot: timeSlot,
            user_id: user.id,
            user_name: profile?.full_name || '내 예약',
            reason: trimmed,
          },
        ]);
        if (error) throw error;
        await refresh(date);
        return { ok: true };
      } catch (err) {
        console.error('[MeetingRoomContext.createBooking]', err);
        return { ok: false, error: err.message };
      }
    },
    [user, profile, date, refresh]
  );

  /* ─── 특정 날짜의 모든 회의실 예약 조회 (외부 페이지에서 사용) ─── */
  const fetchBookingsForDate = useCallback(async (targetDate) => {
    try {
      const { data, error } = await supabase
        .from('room_bookings')
        .select('*')
        .eq('date', targetDate);
      if (error) throw error;
      return { ok: true, bookings: data || [] };
    } catch (err) {
      console.error('[MeetingRoom] fetchBookingsForDate:', err);
      return { ok: false, error: err.message, bookings: [] };
    }
  }, []);

  /* ─── 회의실 마스터 목록 (외부 페이지에서 사용) ─── */
  const fetchRoomsOnly = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_rooms')
        .select('*')
        .order('name');
      if (error) throw error;
      return { ok: true, rooms: data || [] };
    } catch (err) {
      console.error('[MeetingRoom] fetchRoomsOnly:', err);
      return { ok: false, error: err.message, rooms: [] };
    }
  }, []);

  /* ─── 특정 날짜+슬롯에 빈 회의실 찾기 ─── */
  const findAvailableRooms = useCallback(async (targetDate, timeSlot) => {
    try {
      const [roomsResult, bookingsResult] = await Promise.all([
        fetchRoomsOnly(),
        fetchBookingsForDate(targetDate),
      ]);
      if (!roomsResult.ok || !bookingsResult.ok) {
        return { ok: false, rooms: [] };
      }
      const bookedRoomIds = new Set(
        bookingsResult.bookings
          .filter((b) => b.time_slot === timeSlot)
          .map((b) => b.room_id)
      );
      const available = roomsResult.rooms.filter((r) => !bookedRoomIds.has(r.id));
      return { ok: true, rooms: available, allRooms: roomsResult.rooms, bookings: bookingsResult.bookings };
    } catch (err) {
      console.error('[MeetingRoom] findAvailableRooms:', err);
      return { ok: false, rooms: [] };
    }
  }, [fetchRoomsOnly, fetchBookingsForDate]);

  /* ─── 일정 연동용 예약 생성 ─── */
  const createBookingForSchedule = useCallback(
    async ({ roomId, date: bookingDate, timeSlot, reason, scheduleEventId }) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { data, error } = await supabase
          .from('room_bookings')
          .insert([{
            room_id: roomId,
            date: bookingDate,
            time_slot: timeSlot,
            user_id: user.id,
            user_name: profile?.full_name || '내 예약',
            reason: (reason || '').trim() || '일정 연동 예약',
            schedule_event_id: scheduleEventId || null,
          }])
          .select()
          .single();
        if (error) throw error;
        /* 현재 보고 있는 날짜와 같으면 로컬 상태도 갱신 */
        if (mountedRef.current && bookingDate === date) {
          setBookings((prev) => [...prev, data]);
        }
        return { ok: true, booking: data };
      } catch (err) {
        console.error('[MeetingRoom] createBookingForSchedule:', err);
        return { ok: false, error: err.message };
      }
    },
    [user, profile, date]
  );

  /* ─── 일정 연동 예약 취소 ─── */
  const deleteBookingForSchedule = useCallback(
    async (bookingId) => {
      if (!bookingId) return { ok: true };
      try {
        const { error } = await supabase
          .from('room_bookings')
          .delete()
          .eq('id', bookingId);
        if (error) throw error;
        if (mountedRef.current) {
          setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        }
        return { ok: true };
      } catch (err) {
        console.error('[MeetingRoom] deleteBookingForSchedule:', err);
        return { ok: false, error: err.message };
      }
    },
    []
  );

  /* ── 예약 사용목적 수정 — 원본 updateRoomBooking 이관 ── */
  const updateBooking = useCallback(
    async (bookingId, reason) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      const trimmed = (reason || '').trim();
      if (!trimmed)
        return { ok: false, error: '변경할 사용 목적을 입력해주세요.' };

      try {
        const { error } = await supabase
          .from('room_bookings')
          .update({ reason: trimmed })
          .eq('id', bookingId);
        if (error) throw error;
        await refresh(date);
        return { ok: true };
      } catch (err) {
        console.error('[MeetingRoomContext.updateBooking]', err);
        return { ok: false, error: err.message };
      }
    },
    [user, date, refresh]
  );

  /* ── 예약 취소 — 원본 deleteRoomBooking 이관 ── */
  const deleteBooking = useCallback(
    async (bookingId) => {
      if (!user) return { ok: false, error: '로그인이 필요합니다.' };
      try {
        const { error } = await supabase
          .from('room_bookings')
          .delete()
          .eq('id', bookingId);
        if (error) throw error;
        await refresh(date);
        return { ok: true };
      } catch (err) {
        console.error('[MeetingRoomContext.deleteBooking]', err);
        return { ok: false, error: err.message };
      }
    },
    [user, date, refresh]
  );

  /* ── 관리자: 회의실 추가 — 원본 addMeetingRoom 이관 ──
     UI 는 아직 없음. 관리자 페이지 마이그레이션 때 사용.
     args: { name, capacity, equipment } */
  const addRoom = useCallback(
    async ({ name, capacity, equipment }) => {
      if (profile?.is_admin !== true) {
        return { ok: false, error: '관리자만 회의실을 추가할 수 있습니다.' };
      }
      if (!name?.trim() || !capacity) {
        return { ok: false, error: '회의실 이름과 수용인원을 입력해주세요.' };
      }
      try {
        const { error } = await supabase.from('meeting_rooms').insert([
          {
            name: name.trim(),
            capacity: parseInt(capacity, 10),
            equipment: (equipment || '').trim(),
          },
        ]);
        if (error) throw error;
        await refresh(date);
        return { ok: true };
      } catch (err) {
        console.error('[MeetingRoomContext.addRoom]', err);
        return { ok: false, error: err.message };
      }
    },
    [profile, date, refresh]
  );

  /* ── 관리자: 회의실 삭제 — 원본 deleteMeetingRoom 이관 ──
     UI 는 아직 없음. 관리자 페이지 마이그레이션 때 사용. */
  const deleteRoom = useCallback(
    async (roomId) => {
      if (profile?.is_admin !== true) {
        return { ok: false, error: '관리자만 회의실을 삭제할 수 있습니다.' };
      }
      try {
        const { error } = await supabase
          .from('meeting_rooms')
          .delete()
          .eq('id', roomId);
        if (error) throw error;
        await refresh(date);
        return { ok: true };
      } catch (err) {
        console.error('[MeetingRoomContext.deleteRoom]', err);
        return { ok: false, error: err.message };
      }
    },
    [profile, date, refresh]
  );

  /* 특정 예약이 "내 예약"인지 판단 — 원본 isMyBooking 로직 이관.
     본인 예약이거나 관리자면 수정/삭제 가능. */
  const isMyBooking = useCallback(
    (booking) => {
      if (!booking) return false;
      if (profile?.is_admin === true) return true;
      return !!user && booking.user_id === user.id;
    },
    [user, profile]
  );

  const value = {
    // 상태
    date,
    setDate,
    rooms,
    bookings,
    loading,
    error,
    refresh,
    // 예약 액션
    createBooking,
    updateBooking,
    deleteBooking,
    isMyBooking,
    // 관리자 회의실 액션 (UI 는 관리자 페이지에서)
    addRoom,
    deleteRoom,
    // 모달 상태 + 액션
    bookingModal,
    openBookingModal,
    closeBookingModal,
    editModal,
    openEditModal,
    closeEditModal,
    fetchBookingsForDate,    // ← 추가
    fetchRoomsOnly,          // ← 추가
    findAvailableRooms,      // ← 추가
    createBookingForSchedule, // ← 추가
    deleteBookingForSchedule, // ← 추가
  };

  return (
    <MeetingRoomContext.Provider value={value}>
      {children}
    </MeetingRoomContext.Provider>
  );
}

export function useMeetingRoom() {
  const ctx = useContext(MeetingRoomContext);
  if (!ctx) {
    throw new Error('useMeetingRoom must be used within a MeetingRoomProvider');
  }
  return ctx;
}