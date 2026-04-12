import { useState, useEffect } from 'react';
import { resourceApi } from '../api/resourceApi';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
};

const fmt = (d) => d.toISOString().split('T')[0];

const parseAvailabilityWindow = (windowStr) => {
  if (!windowStr) return null;
  // Format: "MON-FRI 08:00-18:00" or "MON 09:00-17:00"
  const match = windowStr.match(/^([A-Z]{3})(?:-([A-Z]{3}))?\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!match) return null;
  const [, startDay, endDay, startTime, endTime] = match;
  const dayIdx = (d) => DAYS.indexOf(d);
  const start = dayIdx(startDay);
  const end = endDay ? dayIdx(endDay) : start;
  return { startDay: start, endDay: end, startTime, endTime };
};

const AvailabilityCalendar = ({ resourceId, resourceName, availabilityWindows, resourceStatus }) => {
  const [weekStart, setWeekStart] = useState(() => fmt(getMonday(new Date())));
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!resourceId) return;
    setLoading(true);
    setError(null);
    resourceApi.getAvailability(resourceId, weekStart)
      .then(setAvailability)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [resourceId, weekStart]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(fmt(d));
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(fmt(d));
  };

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const parsed = parseAvailabilityWindow(availabilityWindows);
  const today = fmt(new Date());

  const isDayAvailable = (date) => {
    if (resourceStatus !== 'ACTIVE') return false;
    if (!parsed) return true; // Assume available if no window set
    const dayIdx = date.getDay();
    // Convert Sunday=0 to MON=1 index
    const mondayBased = dayIdx === 0 ? 6 : dayIdx - 1;
    // Backend DAYS: SUN=0, MON=1...SAT=6
    // Our parsed uses DAYS array order: SUN=0,MON=1,...
    // date.getDay() returns 0=Sun,...,6=Sat
    // parsed.startDay and endDay are indices in DAYS array (SUN=0,MON=1...SAT=6)
    return dayIdx >= parsed.startDay && dayIdx <= parsed.endDay;
  };

  // Use API data if available, otherwise fall back to window parsing
  const getDayStatus = (date) => {
    if (resourceStatus === 'OUT_OF_SERVICE') return 'out';
    if (resourceStatus === 'UNDER_MAINTENANCE') return 'maintenance';
    if (availability?.dailyStatus) {
      const ds = availability.dailyStatus[fmt(date)];
      if (ds === 'AVAILABLE') return 'available';
      if (ds === 'UNAVAILABLE') return 'unavailable';
    }
    return isDayAvailable(date) ? 'available' : 'unavailable';
  };

  const statusColors = {
    available: { bg: 'var(--forest-soft)', color: 'var(--forest-mid)', label: 'Available' },
    unavailable: { bg: 'var(--terracotta-pale)', color: 'var(--terracotta)', label: 'Unavailable' },
    maintenance: { bg: 'var(--amber-pale)', color: 'var(--amber)', label: 'Maintenance' },
    out: { bg: '#f5f5f5', color: '#aaa', label: 'Out of Service' },
  };

  return (
    <div>
      {/* Week Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={prevWeek}>← Prev</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--forest)' }}>
            Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          {resourceName && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{resourceName}</div>}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={nextWeek}>Next →</button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(statusColors).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: v.bg, border: `1px solid ${v.color}33` }} />
            <span style={{ color: 'var(--text-muted)' }}>{v.label}</span>
          </div>
        ))}
      </div>

      {loading && <div className="spinner" />}
      {error && <div style={{ color: 'var(--terracotta)', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 8,
      }}>
        {weekDates.map((date, i) => {
          const status = getDayStatus(date);
          const sc = statusColors[status];
          const isToday = fmt(date) === today;
          return (
            <div key={i} style={{
              background: sc.bg,
              border: `1px solid ${sc.color}44`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 8px',
              textAlign: 'center',
              outline: isToday ? `2px solid var(--forest)` : 'none',
              outlineOffset: 2,
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {DAY_NAMES[date.getDay()]}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: isToday ? 'var(--forest)' : 'var(--text-dark)', margin: '4px 0' }}>
                {date.getDate()}
              </div>
              <div style={{ fontSize: 11, color: sc.color, fontWeight: 600 }}>
                {sc.label}
              </div>
              {parsed && status === 'available' && (
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
                  {parsed.startTime}–{parsed.endTime}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Raw availability window info */}
      {availabilityWindows && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--forest-pale)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--forest-mid)' }}>
          📅 Scheduled availability: <strong>{availabilityWindows}</strong>
        </div>
      )}

      {/* API-returned extra data */}
      {availability && Object.keys(availability).filter(k => k !== 'dailyStatus').length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {availability.availableDays != null && (
            <div style={{ padding: '8px 14px', background: 'var(--forest-soft)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              ✅ Available days this week: <strong>{availability.availableDays}</strong>
            </div>
          )}
          {availability.maintenanceScheduled != null && (
            <div style={{ padding: '8px 14px', background: 'var(--amber-pale)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              🔧 Maintenance scheduled: <strong>{availability.maintenanceScheduled ? 'Yes' : 'No'}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
