import { useState, useEffect } from 'react';
import axios from 'axios';
//import toast from 'react-hot-toast';
import { toast } from 'react-toastify';


const STUDENT_ALLOWED_TYPES = ['LAB', 'MEETING_ROOM'];

const getTodayStr = () => new Date().toISOString().split('T')[0];

// Parse availability window string like "MON-SUN 08:00-18:00"
const parseAvailability = (windowStr) => {
  if (!windowStr) return { days: [], open: '08:00', close: '18:00' };
  const parts = windowStr.trim().split(' ');
  const dayPart = parts[0] || 'MON-SUN';
  const timePart = parts[1] || '08:00-18:00';
  const [open, close] = timePart.split('-');
  
  const allDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  let days = allDays;
  if (dayPart.includes('-')) {
    const [startDay, endDay] = dayPart.split('-');
    const startIdx = allDays.indexOf(startDay);
    const endIdx = allDays.indexOf(endDay);
    if (startIdx !== -1 && endIdx !== -1) {
      days = allDays.slice(startIdx, endIdx + 1);
    }
  } else {
    days = [dayPart];
  }
  return { days, open: open || '08:00', close: close || '18:00' };
};

// Generate 1-hour slots between open and close times
const generateSlots = (open, close, selectedDate) => {
  const slots = [];
  const [openH] = open.split(':').map(Number);
  const [closeH] = close.split(':').map(Number);
  
  const now = new Date();
  const isToday = selectedDate === now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (let h = openH; h + 1 <= closeH; h += 1) {
    // If today, skip slots that have already passed
    if (isToday) {
      // Skip if this hour has already started or passed
      if (h < currentHour || (h === currentHour && currentMinute > 0)) {
        continue;
      }
    }
    const start = `${String(h).padStart(2, '0')}:00`;
    const end = `${String(h + 1).padStart(2, '0')}:00`;
    slots.push({ label: `${start} – ${end}`, start, end });
  }
  return slots;
};

// Check if selected date is within availability days
const isDayAvailable = (dateStr, days) => {
  if (!dateStr || !days.length) return true;
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = dayNames[new Date(dateStr).getDay()];
  return days.includes(dayName);
};

export default function BookingForm({ userEmail, userName, userRole, preSelected, onSuccess }) {
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [form, setForm] = useState({
    resourceId: '',
    resourceName: '',
    purpose: '',
    expectedAttendees: 1,
  });
  const [loading, setLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [capacityWarning, setCapacityWarning] = useState('');

  // Fetch resources
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:8080/api/resources?status=ACTIVE', {
      headers: { Authorization: `Bearer ${token}` }
    })
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

  // When resource changes, parse availability and generate slots
  useEffect(() => {
    if (selectedResource?.availabilityWindows) {
      const parsed = parseAvailability(selectedResource.availabilityWindows);
      setAvailability(parsed);
      setSelectedDate('');
      setSelectedSlot(null);
      setAvailableSlots([]);
    } else {
      setAvailability(null);
      setAvailableSlots([]);
    }
  }, [selectedResource]);

  // When date changes, generate slots for that day
  useEffect(() => {
    if (!selectedDate || !availability) return;
    if (!isDayAvailable(selectedDate, availability.days)) {
      setAvailableSlots([]);
      toast.error(`This resource is not available on ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}s`);
      return;
    }
    const slots = generateSlots(availability.open, availability.close, selectedDate);
    setAvailableSlots(slots);
    setSelectedSlot(null);
  }, [selectedDate, availability]);

  // Pre-selected from Amasha's Book Now button
  useEffect(() => {
    if (preSelected?.resource?.id && resources.length > 0) {
      const resource = resources.find(r => r.id === preSelected.resource.id);
      setSelectedResource(resource || null);
      setForm(f => ({ ...f, resourceId: preSelected.resource.id, resourceName: preSelected.resource.name }));
      if (preSelected.slot?.start) {
        const dateStr = preSelected.slot.start.split('T')[0];
        setSelectedDate(dateStr);
      }
    }
  }, [preSelected, resources]);

  // Capacity check
  useEffect(() => {
    if (selectedResource?.capacity && form.expectedAttendees) {
      if (Number(form.expectedAttendees) > selectedResource.capacity) {
        setCapacityWarning(`⚠️ Exceeds capacity! Max ${selectedResource.capacity} people.`);
      } else {
        setCapacityWarning('');
      }
    } else {
      setCapacityWarning('');
    }
  }, [form.expectedAttendees, selectedResource]);

  const handleResourceSelect = (e) => {
    const selected = resources.find(r => r.id === Number(e.target.value));
    setSelectedResource(selected || null);
    setSelectedDate('');
    setSelectedSlot(null);
    if (selected) setForm({ ...form, resourceId: selected.id, resourceName: selected.name });
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

    const startTime = `${selectedDate}T${selectedSlot.start}:00`;
    const endTime = `${selectedDate}T${selectedSlot.end}:00`;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:8080/api/bookings?userEmail=${userEmail}&userName=${encodeURIComponent(userName)}`,
        {
          resourceId: Number(form.resourceId),
          resourceName: form.resourceName,
          startTime,
          endTime,
          purpose: form.purpose,
          expectedAttendees: Number(form.expectedAttendees),
        },
        { headers: { Authorization: `Bearer ${token}` } }
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

      {/* Resource */}
      <div style={fg}>
        <label style={ls}>Select Resource *</label>
        {resourcesLoading ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading resources...</p>
        ) : (
          <select value={form.resourceId} onChange={handleResourceSelect} style={is}>
            <option value="">-- Select a resource --</option>
            {resources.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.type?.replace(/_/g, ' ')} — {r.location}{r.capacity ? ` — Cap: ${r.capacity}` : ''}
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
          <input
            type="date"
            value={selectedDate}
            min={getTodayStr()}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ ...is, colorScheme: 'light' }}
          />
        </div>
      )}

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
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1.5px solid',
                  borderColor: selectedSlot?.label === slot.label ? '#1e3a5f' : '#e0e0e0',
                  background: selectedSlot?.label === slot.label ? '#1e3a5f' : 'white',
                  color: selectedSlot?.label === slot.label ? 'white' : '#374151',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
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
        <div style={{ ...infoBox, background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
          ❌ No time slots available on this day.
        </div>
      )}

      {/* Purpose */}
      <div style={fg}>
        <label style={ls}>Purpose *</label>
        <input
          name="purpose"
          placeholder="e.g. Group project meeting"
          value={form.purpose}
          onChange={e => setForm({ ...form, purpose: e.target.value })}
          style={is}
        />
      </div>

      {/* Attendees */}
      <div style={fg}>
        <label style={ls}>Expected Attendees</label>
        <input
          name="expectedAttendees"
          type="number"
          min="1"
          max={selectedResource?.capacity || undefined}
          value={form.expectedAttendees}
          onChange={e => setForm({ ...form, expectedAttendees: e.target.value })}
          style={{ ...is, borderColor: capacityWarning ? '#ef4444' : '#e0e0e0' }}
        />
        {capacityWarning && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{capacityWarning}</p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !!capacityWarning}
        style={{
          padding: '11px 24px',
          background: (loading || capacityWarning) ? '#9ca3af' : '#1e3a5f',
          color: 'white', border: 'none', borderRadius: 8, fontSize: 14,
          fontWeight: 600,
          cursor: (loading || capacityWarning) ? 'not-allowed' : 'pointer',
          width: 'fit-content',
        }}
      >
        {loading ? 'Submitting...' : 'Submit Booking Request'}
      </button>
    </div>
  );
}

const formCard = { background: 'white', borderRadius: 14, padding: '28px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 16 };
const fg = { display: 'flex', flexDirection: 'column', gap: 5 };
const ls = { fontWeight: 600, fontSize: 13, color: '#374151', textAlign: 'left' };
const is = { padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', color: '#111827', background: 'white', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const infoBox = { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1d4ed8' };
const availBox = { background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534' };