// FIX #6 – Past days are now visually disabled and unselectable in the calendar.

import { useState, useEffect } from 'react';
import { resourceApi } from '../api/resourceApi';
import { StatusBadge, TypeBadge } from './ResourceCard';
import { useNavigate } from 'react-router-dom';

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAYS_LONG  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getMonday = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const fmtDate = (d) => d.toISOString().split('T')[0];

const ResourceAvailabilityModal = ({ resource, onClose }) => {
  const navigate = useNavigate();
  const [weekStart,    setWeekStart]    = useState(() => fmtDate(getMonday()));
  const [avData,       setAvData]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [selectedDay,  setSelectedDay]  = useState(null);

  const today = fmtDate(new Date());

  useEffect(() => {
    if (!resource) return;
    setLoading(true);
    setError(null);
    setSelectedDay(null);
    resourceApi.getAvailability(resource.id, weekStart)
      .then(d => setAvData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [resource, weekStart]);

  if (!resource) return null;

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    // FIX #6: don't allow going to a week entirely in the past
    const newMonday = fmtDate(d);
    const thisMonday = fmtDate(getMonday());
    if (newMonday < thisMonday) return; // block going before current week
    setWeekStart(newMonday);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(fmtDate(d));
  };

  const days = avData?.days || [];

  const isPastDate = (dateStr) => dateStr < today;

  const daySlots = selectedDay !== null ? days[selectedDay] : null;

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={modalHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#1e3a5f' }}>{resource.name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <TypeBadge type={resource.type} />
              <StatusBadge status={resource.status} />
              {resource.location && (
                <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>📍 {resource.location}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {resource.availabilityWindows && (
            <div style={infoBanner}>
              🕐 <strong>Scheduled hours:</strong> {resource.availabilityWindows}
              {resource.capacity && <span style={{ marginLeft: 12 }}>· 👥 Capacity: <strong>{resource.capacity}</strong></span>}
            </div>
          )}

          {/* Week nav — FIX #6: prev disabled on current week */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button
              onClick={prevWeek}
              disabled={weekStart <= fmtDate(getMonday())}
              style={{
                ...navBtn,
                opacity: weekStart <= fmtDate(getMonday()) ? 0.4 : 1,
                cursor:  weekStart <= fmtDate(getMonday()) ? 'not-allowed' : 'pointer',
              }}>
              ← Prev Week
            </button>
            <span style={{ fontWeight: 600, color: '#1e3a5f', fontSize: 14 }}>
              {new Date(weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              {' – '}
              {(() => { const e = new Date(weekStart); e.setDate(e.getDate() + 6); return e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); })()}
            </span>
            <button onClick={nextWeek} style={navBtn}>Next Week →</button>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>Loading…</div>}
          {error && <div style={{ color: '#dc2626', padding: 12, background: '#fef2f2', borderRadius: 8, marginBottom: 12 }}>⚠ {error}</div>}

          {/* 7-day grid */}
          {!loading && days.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 16 }}>
              {days.map((day, i) => {
                const past     = isPastDate(day.date);     // FIX #6
                const isToday  = day.date === today;
                const isSelected = selectedDay === i;
                const avail    = resource.status === 'ACTIVE' && day.available && !past;
                const slotCount = day.slots?.length || 0;

                return (
                  <button
                    key={day.date}
                    // FIX #6: past days not selectable
                    onClick={() => !past && setSelectedDay(isSelected ? null : i)}
                    disabled={past}
                    style={{
                      background: past
                        ? '#f3f4f6'
                        : isSelected
                          ? '#1e3a5f'
                          : avail
                            ? '#f0fdf4'
                            : '#fef2f2',
                      border: isToday
                        ? '2px solid #1e3a5f'
                        : `1px solid ${past ? '#e5e7eb' : avail ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: 10, padding: '10px 4px', textAlign: 'center',
                      cursor: past ? 'not-allowed' : 'pointer',
                      opacity: past ? 0.5 : 1,
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                      color: isSelected ? 'rgba(255,255,255,0.7)' : '#9ca3af', marginBottom: 3 }}>
                      {DAYS_SHORT[i]}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700,
                      color: isSelected ? '#fff' : isToday ? '#1e3a5f' : past ? '#9ca3af' : '#111827', marginBottom: 3 }}>
                      {new Date(day.date).getUTCDate()}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600,
                      color: isSelected ? 'rgba(255,255,255,0.85)' : past ? '#9ca3af' : avail ? '#16a34a' : '#dc2626' }}>
                      {past ? 'Past' : resource.status !== 'ACTIVE' ? 'Unavail' : avail ? `${slotCount} slots` : 'Closed'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { color: '#f0fdf4', border: '#bbf7d0', label: 'Available' },
              { color: '#fef2f2', border: '#fecaca', label: 'Unavailable' },
              { color: '#f3f4f6', border: '#e5e7eb', label: 'Past (disabled)' },
              { color: '#1e3a5f', border: '#1e3a5f', label: 'Selected' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color, border: `1px solid ${l.border}` }} />
                <span style={{ color: '#6b7280' }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Slot detail */}
          {daySlots && !isPastDate(daySlots.date) && (
            <div style={slotBox}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#1e3a5f' }}>
                {DAYS_LONG[selectedDay]} – {new Date(daySlots.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              {!daySlots.available || resource.status !== 'ACTIVE' ? (
                <p style={{ color: '#6b7280', fontSize: 14 }}>Not available on this day.</p>
              ) : daySlots.slots?.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 14 }}>No time slots for this day.</p>
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
                    Open {daySlots.openTime} – {daySlots.closeTime} · {daySlots.slots.length} slots
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                    {daySlots.slots.map((slot, si) => (
                      <div key={si} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>{slot.start} – {slot.end}</div>
                        <div style={{ fontSize: 11, color: '#16a34a', marginTop: 3 }}>Available</div>
                        <button
                          onClick={() => {
                            onClose();
                            navigate('/booking', {
                              state: {
                                preSelected: {
                                  resource,
                                  slot: { start: `${daySlots.date}T${slot.start}:00` },
                                }
                              }
                            });
                          }}
                          style={{ marginTop: 8, padding: '5px 12px', background: '#1e3a5f', color: 'white',
                            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                          Book Now
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!daySlots && !loading && days.length > 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Click a day to see available time slots</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceAvailabilityModal;

const backdrop    = { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 };
const modal       = { background:'white', borderRadius:16, width:'95%', maxWidth:720, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' };
const modalHeader = { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'20px 24px 0', borderBottom:'1.5px solid #f3f4f6', paddingBottom:16 };
const closeBtn    = { background:'none', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:16, color:'#6b7280' };
const infoBanner  = { background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'9px 14px', fontSize:13, color:'#1e40af', marginBottom:16, display:'flex', alignItems:'center', gap:6 };
const navBtn      = { padding:'7px 14px', background:'white', border:'1.5px solid #e5e7eb', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151' };
const slotBox     = { background:'white', border:'1px solid #e5e7eb', borderRadius:10, padding:18 };