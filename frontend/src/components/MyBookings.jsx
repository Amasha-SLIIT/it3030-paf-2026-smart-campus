import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING: '#f59e0b', APPROVED: '#16a34a', REJECTED: '#ef4444', CANCELLED: '#6b7280',
};
const STATUS_BG = {
  PENDING: '#fffbeb', APPROVED: '#f0fdf4', REJECTED: '#fef2f2', CANCELLED: '#f9fafb',
};

// ── Slot helpers (same logic as BookingForm) ──────────────────────────
const getTodayStr = () => new Date().toISOString().split('T')[0];

const parseAvailability = (windowStr) => {
  if (!windowStr) return { days: [], open: '08:00', close: '18:00' };
  const parts = windowStr.trim().split(' ');
  const dayPart  = parts[0] || 'MON-SUN';
  const timePart = parts[1] || '08:00-18:00';
  const [open, close] = timePart.split('-');
  const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  let days = allDays;
  if (dayPart.includes('-')) {
    const [startDay, endDay] = dayPart.split('-');
    const s = allDays.indexOf(startDay);
    const e = allDays.indexOf(endDay);
    if (s !== -1 && e !== -1) days = allDays.slice(s, e + 1);
  } else {
    days = [dayPart];
  }
  return { days, open: open || '08:00', close: close || '18:00' };
};

const generateSlots = (open, close, selectedDate) => {
  const slots = [];
  const [openH]  = open.split(':').map(Number);
  const [closeH] = close.split(':').map(Number);
  const now = new Date();
  const isToday = selectedDate === now.toISOString().split('T')[0];
  const currentHour   = now.getHours();
  const currentMinute = now.getMinutes();

  for (let h = openH; h + 1 <= closeH; h++) {
    if (isToday && (h < currentHour || (h === currentHour && currentMinute > 0))) continue;
    const start = `${String(h).padStart(2, '0')}:00`;
    const end   = `${String(h + 1).padStart(2, '0')}:00`;
    slots.push({ label: `${start} – ${end}`, start, end });
  }
  return slots;
};

const isDayAvailable = (dateStr, days) => {
  if (!dateStr || !days.length) return true;
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days.includes(dayNames[new Date(dateStr).getDay()]);
};

// Pull HH:MM from a LocalDateTime string like "2025-06-15T10:00:00"
const extractTime = (dt) => (dt ? dt.slice(11, 16) : '');
const extractDate = (dt) => (dt ? dt.slice(0, 10) : '');

export default function MyBookings({ userEmail }) {
  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('');

  // Edit modal
  const [editingBooking, setEditingBooking] = useState(null);
  const [editResource, setEditResource]     = useState(null);
  const [availability, setAvailability]     = useState(null);
  const [selectedDate, setSelectedDate]     = useState('');
  const [selectedSlot, setSelectedSlot]     = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [purpose, setPurpose]               = useState('');
  const [attendees, setAttendees]           = useState(1);
  const [editLoading, setEditLoading]       = useState(false);
  const [resourceLoading, setResourceLoading] = useState(false);

  const loadBookings = () => {
    const token = localStorage.getItem('token');
    axios.get(`http://localhost:8080/api/bookings/my?userEmail=${userEmail}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setBookings(res.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBookings(); }, [userEmail]);

  // When date changes inside edit modal, regenerate slots
  useEffect(() => {
    if (!selectedDate || !availability) return;

    if (!isDayAvailable(selectedDate, availability.days)) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      toast.error(`This resource is not available on ${dayNames[new Date(selectedDate + 'T12:00').getDay()]}s`);
      return;
    }

    const slots = generateSlots(availability.open, availability.close, selectedDate);
    setAvailableSlots(slots);
    setSelectedSlot(null); // reset slot when date changes
  }, [selectedDate, availability]);

  const openEditModal = async (booking) => {
    setEditingBooking(booking);
    setPurpose(booking.purpose || '');
    setAttendees(booking.expectedAttendees || 1);
    setSelectedDate('');
    setSelectedSlot(null);
    setAvailableSlots([]);
    setAvailability(null);
    setEditResource(null);

    // Fetch the resource to get availabilityWindows
    setResourceLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `http://localhost:8080/api/resources/${booking.resourceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const resource = res.data;
      setEditResource(resource);

      const parsed = parseAvailability(resource.availabilityWindows);
      setAvailability(parsed);

      // Pre-select the existing booking's date and slot
      const existingDate = extractDate(booking.startTime);
      const existingStart = extractTime(booking.startTime);
      const existingEnd   = extractTime(booking.endTime);

      // Only pre-select if the existing date is today or future
      if (existingDate >= getTodayStr()) {
        setSelectedDate(existingDate);
        // The slot will be set after availableSlots regenerates via useEffect,
        // so we store the target slot and match it below
        const slots = generateSlots(parsed.open, parsed.close, existingDate);
        setAvailableSlots(slots);
        const match = slots.find(s => s.start === existingStart && s.end === existingEnd);
        if (match) setSelectedSlot(match);
      }
    } catch {
      toast.error('Could not load resource details');
    } finally {
      setResourceLoading(false);
    }
  };

  const closeEditModal = () => {
    setEditingBooking(null);
    setEditResource(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setAvailableSlots([]);
    setAvailability(null);
  };

  const handleEditSubmit = async () => {
    if (!selectedDate || !selectedSlot || !purpose.trim()) {
      toast.error('Please select a date, time slot, and enter a purpose');
      return;
    }

    setEditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:8080/api/bookings/${editingBooking.id}?userEmail=${userEmail}`,
        {
          startTime: `${selectedDate}T${selectedSlot.start}:00`,
          endTime:   `${selectedDate}T${selectedSlot.end}:00`,
          purpose,
          expectedAttendees: Number(attendees),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookings(bookings.map(b => b.id === editingBooking.id ? res.data : b));
      toast.success('Booking updated successfully!');
      closeEditModal();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update booking');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(
        `http://localhost:8080/api/bookings/${id}?userEmail=${userEmail}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookings(bookings.map(b => b.id === id ? res.data : b));
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const filtered = filter ? bookings.filter(b => b.status === filter) : bookings;

  if (loading) return <div style={emptyState}>Loading your bookings...</div>;

  return (
    <div>
      {/* Header + filter tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#1e3a5f' }}>My Bookings</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => (
            <button key={s || 'ALL'} onClick={() => setFilter(s)} style={{
              padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              background: filter === s ? '#1e3a5f' : 'white',
              color: filter === s ? 'white' : '#6b7280',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {s || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && <div style={emptyState}>📭 No bookings found.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(b => (
          <div key={b.id} style={{
            background: STATUS_BG[b.status] || 'white',
            borderRadius: 12, padding: '18px 22px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: `1.5px solid ${STATUS_COLORS[b.status]}33`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 16, color: '#111827' }}>{b.resourceName}</strong>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px',
                borderRadius: 20, color: 'white', background: STATUS_COLORS[b.status],
              }}>
                {b.status}
              </span>
            </div>
            <p style={pStyle}>📅 {new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}</p>
            <p style={pStyle}>📝 {b.purpose}</p>
            {b.expectedAttendees && <p style={pStyle}>👥 {b.expectedAttendees} attendees</p>}
            {b.adminReason && (
              <p style={{ ...pStyle, fontStyle: 'italic', color: '#9ca3af' }}>
                💬 Admin note: {b.adminReason}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {b.status === 'PENDING' && (
                <button onClick={() => openEditModal(b)} style={editBtn}>✏️ Edit</button>
              )}
              {b.status === 'APPROVED' && (
                <button onClick={() => handleCancel(b.id)} style={cancelBtn}>Cancel Booking</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Edit Modal ── */}
      {editingBooking && (
        <div style={modalBackdrop}>
          <div style={modalBox}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#1e3a5f' }}>Edit Booking</h3>
              <button onClick={closeEditModal} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            {/* Resource — read only */}
            <div style={readOnlyBox}>
              📦 <strong>{editingBooking.resourceName}</strong>
              {editResource?.capacity && (
                <span style={{ marginLeft: 12 }}>👥 Max: <strong>{editResource.capacity}</strong></span>
              )}
            </div>

            {/* Availability info */}
            {editResource?.availabilityWindows && (
              <div style={availBox}>
                🕒 Available: <strong>{editResource.availabilityWindows}</strong>
              </div>
            )}

            {resourceLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af' }}>
                Loading availability...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Date picker */}
                <div style={fg}>
                  <label style={ls}>Select Date *</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={getTodayStr()}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{ ...inputStyle, colorScheme: 'light' }}
                  />
                </div>

                {/* Time slots */}
                {selectedDate && availableSlots.length > 0 && (
                  <div style={fg}>
                    <label style={ls}>Select Time Slot *</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                      {availableSlots.map(slot => (
                        <button
                          key={slot.label}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          style={{
                            padding: '8px 14px', borderRadius: 8, border: '1.5px solid',
                            borderColor: selectedSlot?.label === slot.label ? '#1e3a5f' : '#e0e0e0',
                            background: selectedSlot?.label === slot.label ? '#1e3a5f' : 'white',
                            color: selectedSlot?.label === slot.label ? 'white' : '#374151',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No slots available */}
                {selectedDate && availableSlots.length === 0 && (
                  <div style={noSlotBox}>❌ No time slots available on this day.</div>
                )}

                {/* Purpose */}
                <div style={fg}>
                  <label style={ls}>Purpose *</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="e.g. Group project meeting"
                    style={inputStyle}
                  />
                </div>

                {/* Attendees */}
                <div style={fg}>
                  <label style={ls}>Expected Attendees</label>
                  <input
                    type="number"
                    min="1"
                    max={editResource?.capacity || undefined}
                    value={attendees}
                    onChange={e => setAttendees(e.target.value)}
                    style={{
                      ...inputStyle,
                      borderColor: editResource?.capacity && Number(attendees) > editResource.capacity
                        ? '#ef4444' : '#e0e0e0',
                    }}
                  />
                  {editResource?.capacity && Number(attendees) > editResource.capacity && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>
                      ⚠️ Exceeds capacity! Max {editResource.capacity} people.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button
                    onClick={handleEditSubmit}
                    disabled={
                      editLoading ||
                      !selectedSlot ||
                      (editResource?.capacity && Number(attendees) > editResource.capacity)
                    }
                    style={{
                      flex: 1, padding: '11px 0',
                      background: editLoading || !selectedSlot ? '#9ca3af' : '#1e3a5f',
                      color: 'white', border: 'none', borderRadius: 8,
                      fontWeight: 600, fontSize: 14,
                      cursor: editLoading || !selectedSlot ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={closeEditModal} style={secondaryBtn}>
                    Cancel
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const pStyle        = { margin: '4px 0', fontSize: 14, color: '#4b5563', textAlign: 'left' };
const emptyState    = { textAlign: 'center', color: '#9ca3af', padding: 40, background: 'white', borderRadius: 12, fontSize: 15 };
const editBtn       = { padding: '7px 16px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const cancelBtn     = { padding: '7px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const modalBackdrop = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 };
const modalBox      = { background: 'white', borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const readOnlyBox   = { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534', marginBottom: 12 };
const availBox      = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1d4ed8', marginBottom: 4 };
const noSlotBox     = { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' };
const fg            = { display: 'flex', flexDirection: 'column', gap: 5 };
const ls            = { fontWeight: 600, fontSize: 13, color: '#374151' };
const inputStyle    = { padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', color: '#111827', background: 'white', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const secondaryBtn  = { flex: 1, padding: '11px 0', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' };