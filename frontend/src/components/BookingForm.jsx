import { useState, useEffect } from 'react';
import api from '../api/axiosInstance'; // ← use your axios instance, not raw axios
import { toast } from 'react-toastify';

const STUDENT_ALLOWED_TYPES = ['LAB', 'MEETING_ROOM'];
const getTodayStr = () => new Date().toISOString().split('T')[0];

const parseAvailability = (windowStr) => {
  if (!windowStr) return { days: [], open: '08:00', close: '18:00' };
  const parts   = windowStr.trim().split(' ');
  const dayPart = parts[0] || 'MON-SUN';
  const timePart = parts[1] || '08:00-18:00';
  const [open, close] = timePart.split('-');
  const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  let days = allDays;
  if (dayPart.includes('-')) {
    const [startDay, endDay] = dayPart.split('-');
    const startIdx = allDays.indexOf(startDay);
    const endIdx   = allDays.indexOf(endDay);
    if (startIdx !== -1 && endIdx !== -1) days = allDays.slice(startIdx, endIdx + 1);
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

export default function BookingForm({ userEmail, userName, userRole, preSelected, onSuccess }) {
  const [resources,       setResources]       = useState([]);
  const [selectedResource,setSelectedResource]= useState(null);
  const [selectedDate,    setSelectedDate]    = useState('');
  const [selectedSlot,    setSelectedSlot]    = useState(null);
  const [availableSlots,  setAvailableSlots]  = useState([]);
  const [availability,    setAvailability]    = useState(null);
  const [form,            setForm]            = useState({ resourceId: '', resourceName: '', purpose: '', expectedAttendees: 1 });
  const [loading,         setLoading]         = useState(false);
  const [resourcesLoading,setResourcesLoading]= useState(true);
  const [capacityWarning, setCapacityWarning] = useState('');

  // Fetch all active resources
  useEffect(() => {
    api.get('/resources', { params: { status: 'ACTIVE' } })
      .then(res => {
        let data = res.data;
        if (userRole === 'USER') {
          data = data.filter(r => STUDENT_ALLOWED_TYPES.includes(r.type));
        }
        setResources(data);
      })
      .catch(() => toast.error('Could not load resources'))
      .finally(() => setResourcesLoading(false));
  }, [userRole]);

  // ── Pre-fill from "Book Now" button ──────────────────────────────────────
  // Runs once resources are loaded AND preSelected is provided
  useEffect(() => {
    if (!preSelected || resources.length === 0) return;

    const res = resources.find(r => r.id === preSelected.resource?.id);
    if (!res) return;

    // Set the resource
    setSelectedResource(res);
    setForm(f => ({ ...f, resourceId: res.id, resourceName: res.name }));

    // Set the date from the slot start
    if (preSelected.slot?.start) {
      const dateStr = preSelected.slot.start.split('T')[0];
      setSelectedDate(dateStr);

      // Parse the pre-selected time slot so we can auto-select it
      const timeStr = preSelected.slot.start.split('T')[1]?.slice(0, 5); // "09:00"
      if (timeStr) {
        const [h] = timeStr.split(':').map(Number);
        const start = `${String(h).padStart(2, '0')}:00`;
        const end   = `${String(h + 1).padStart(2, '0')}:00`;
        setSelectedSlot({ label: `${start} – ${end}`, start, end });
      }
    }
  }, [preSelected, resources]);

  // Parse availability windows when resource changes
  useEffect(() => {
    if (selectedResource?.availabilityWindows) {
      setAvailability(parseAvailability(selectedResource.availabilityWindows));
    } else {
      setAvailability(null);
      setAvailableSlots([]);
    }
  }, [selectedResource]);

  // Generate slots when date or availability changes
  useEffect(() => {
    if (!selectedDate || !availability) return;
    if (!isDayAvailable(selectedDate, availability.days)) {
      setAvailableSlots([]);
      toast.error(`Not available on ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}s`);
      return;
    }
    const slots = generateSlots(availability.open, availability.close, selectedDate);
    setAvailableSlots(slots);

    // Re-select the pre-selected slot if it exists in generated slots
    if (selectedSlot) {
      const match = slots.find(s => s.start === selectedSlot.start);
      setSelectedSlot(match || null);
    }
  }, [selectedDate, availability]);

  // Capacity check
  useEffect(() => {
    if (selectedResource?.capacity && form.expectedAttendees) {
      setCapacityWarning(
        Number(form.expectedAttendees) > selectedResource.capacity
          ? `⚠️ Exceeds capacity! Max ${selectedResource.capacity} people.`
          : ''
      );
    } else {
      setCapacityWarning('');
    }
  }, [form.expectedAttendees, selectedResource]);

  const handleResourceSelect = (e) => {
    const res = resources.find(r => r.id === Number(e.target.value));
    setSelectedResource(res || null);
    setSelectedDate('');
    setSelectedSlot(null);
    setAvailableSlots([]);
    if (res) setForm(f => ({ ...f, resourceId: res.id, resourceName: res.name }));
  };

  const handleSubmit = async () => {
    if (!form.resourceId || !selectedDate || !selectedSlot || !form.purpose) {
      toast.error('Please fill in all required fields and select a time slot');
      return;
    }
    if (capacityWarning) {
      toast.error('Please reduce the number of attendees — capacity exceeded!');
      return;
    }
    setLoading(true);
    try {
      await api.post(
        `/bookings?userEmail=${userEmail}&userName=${encodeURIComponent(userName)}`,
        {
          resourceId:        Number(form.resourceId),
          resourceName:      form.resourceName,
          startTime:         `${selectedDate}T${selectedSlot.start}:00`,
          endTime:           `${selectedDate}T${selectedSlot.end}:00`,
          purpose:           form.purpose,
          expectedAttendees: Number(form.expectedAttendees),
        }
      );
      toast.success('✅ Booking submitted! Waiting for approval.');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={formCard}>
      <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#1e3a5f', textAlign: 'left' }}>
        Request a Booking
      </h2>

      {userRole === 'USER' && (
        <div style={infoBox}>
          ℹ️ As a student, you can book <strong>Labs</strong> and <strong>Meeting Rooms</strong> only.
        </div>
      )}

      {/* ── Pre-filled resource banner ── */}
      {selectedResource && preSelected?.resource?.id === selectedResource.id && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
          padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {selectedResource.imageUrl && (
            <img src={selectedResource.imageUrl} alt={selectedResource.name}
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8,
                border: '1px solid #bbf7d0', flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#166534' }}>{selectedResource.name}</div>
            <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>
              {selectedResource.type?.replace(/_/g, ' ')}
              {selectedResource.location && ` · 📍 ${selectedResource.location}`}
              {selectedResource.capacity && ` · 👥 Cap: ${selectedResource.capacity}`}
            </div>
            {selectedDate && (
              <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                📅 {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US',
                  { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {selectedSlot && ` · 🕐 ${selectedSlot.label}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resource selector */}
      <div style={fg}>
        <label style={ls}>Select Resource *</label>
        {resourcesLoading ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading resources...</p>
        ) : (
          <select value={form.resourceId} onChange={handleResourceSelect} style={is}>
            <option value="">-- Select a resource --</option>
            {resources.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.type?.replace(/_/g, ' ')} — {r.location}
                {r.capacity ? ` — Cap: ${r.capacity}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Availability info */}
      {selectedResource && (
        <div style={availBox}>
          🕒 Available: <strong>{selectedResource.availabilityWindows || 'Contact admin for availability'}</strong>
          {selectedResource.capacity && (
            <span style={{ marginLeft: 12 }}>👥 Max: <strong>{selectedResource.capacity}</strong></span>
          )}
        </div>
      )}

      {/* Date picker */}
      {selectedResource && (
        <div style={fg}>
          <label style={ls}>Select Date *</label>
          <input type="date" value={selectedDate} min={getTodayStr()}
            onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
            style={{ ...is, colorScheme: 'light' }} />
        </div>
      )}

      {/* Time slots */}
      {selectedDate && availableSlots.length > 0 && (
        <div style={fg}>
          <label style={ls}>Select Time Slot *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {availableSlots.map(slot => {
              const isActive = selectedSlot?.label === slot.label;
              return (
                <button key={slot.label} type="button" onClick={() => setSelectedSlot(slot)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: '1.5px solid',
                    borderColor: isActive ? '#1e3a5f' : '#e0e0e0',
                    background:  isActive ? '#1e3a5f' : 'white',
                    color:       isActive ? 'white'   : '#374151',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedDate && availableSlots.length === 0 && (
        <div style={{ ...infoBox, background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
          ❌ No time slots available on this day.
        </div>
      )}

      {/* Purpose */}
      <div style={fg}>
        <label style={ls}>Purpose *</label>
        <input placeholder="e.g. Group project meeting" value={form.purpose}
          onChange={e => setForm({ ...form, purpose: e.target.value })} style={is} />
      </div>

      {/* Attendees */}
      <div style={fg}>
        <label style={ls}>Expected Attendees</label>
        <input type="number" min="1" max={selectedResource?.capacity || undefined}
          value={form.expectedAttendees}
          onChange={e => setForm({ ...form, expectedAttendees: e.target.value })}
          style={{ ...is, borderColor: capacityWarning ? '#ef4444' : '#e0e0e0' }} />
        {capacityWarning && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{capacityWarning}</p>
        )}
      </div>

      <button onClick={handleSubmit} disabled={loading || !!capacityWarning}
        style={{
          padding: '11px 24px', fontSize: 14, fontWeight: 600,
          background: (loading || capacityWarning) ? '#9ca3af' : '#1e3a5f',
          color: 'white', border: 'none', borderRadius: 8,
          cursor: (loading || capacityWarning) ? 'not-allowed' : 'pointer',
          width: 'fit-content',
        }}>
        {loading ? 'Submitting...' : 'Submit Booking Request'}
      </button>
    </div>
  );
}

const formCard  = { background: 'white', borderRadius: 14, padding: '28px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 16 };
const fg        = { display: 'flex', flexDirection: 'column', gap: 5 };
const ls        = { fontWeight: 600, fontSize: 13, color: '#374151', textAlign: 'left' };
const is        = { padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', color: '#111827', background: 'white', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const infoBox   = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1d4ed8' };
const availBox  = { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534' };
