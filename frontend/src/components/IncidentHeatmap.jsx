// src/components/IncidentHeatmap.jsx
import { useMemo } from 'react';

const STATUS_COLORS = {
  OPEN:        '#dc2626',
  IN_PROGRESS: '#d97706',
  RESOLVED:    '#16a34a',
  CLOSED:      '#6b7280',
  REJECTED:    '#9ca3af',
};

const RISK_THRESHOLDS = { high: 5, medium: 3 };

const getRiskLevel = (openCount) => {
  if (openCount >= RISK_THRESHOLDS.high)   return { label: 'High Risk',   color: '#dc2626', bg: '#fef2f2' };
  if (openCount >= RISK_THRESHOLDS.medium) return { label: 'Medium Risk', color: '#d97706', bg: '#fffbeb' };
  return                                          { label: 'Low Risk',    color: '#16a34a', bg: '#f0fdf4' };
};

export default function IncidentHeatmap({ tickets, resources }) {
  const buildingData = useMemo(() => {
    const map = {};
    (tickets || []).forEach(ticket => {
      const resource = resources?.find(r => r.id === ticket.resourceId);
      const building = resource?.building || ticket.building || ticket.location || 'Unspecified';
      if (!map[building]) {
        map[building] = { building, OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0, REJECTED: 0, total: 0 };
      }
      map[building][ticket.status] = (map[building][ticket.status] || 0) + 1;
      map[building].total += 1;
    });
    return Object.values(map).sort((a, b) => b.OPEN - a.OPEN);
  }, [tickets, resources]);

  const totalOpen      = (tickets || []).filter(t => t.status === 'OPEN').length;
  const worstBuilding  = buildingData[0];
  const avgPerBuilding = buildingData.length ? (tickets.length / buildingData.length).toFixed(1) : 0;
  const maxTotal       = worstBuilding?.total || 1;

  if (!tickets || tickets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
        <span style={{ fontSize: 48 }}>🗺️</span>
        <p style={{ marginTop: 12 }}>No ticket data to display yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <SummaryCard icon="🔴" label="Open Incidents" value={totalOpen}                      sub="Requiring attention"              color="#dc2626" />
        <SummaryCard icon="🏛️" label="Worst Area"     value={worstBuilding?.building || '—'} sub={`${worstBuilding?.OPEN || 0} open tickets`} color="#d97706" small />
        <SummaryCard icon="📊" label="Avg per Area"   value={avgPerBuilding}                 sub="tickets per building"             color="#2563eb" />
      </div>

      {/* CSS Bar Chart */}
      <div style={chartCard}>
        <h3 style={sectionTitle}>📊 Ticket Volume by Building</h3>

        {/* Y-axis labels + bars */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end',
          overflowX: 'auto', paddingBottom: 8, minHeight: 200 }}>
          {buildingData.map((b) => {
            const heightPct = Math.round((b.total / maxTotal) * 160);
            return (
              <div key={b.building} style={{ display: 'flex', flexDirection: 'column',
                alignItems: 'center', minWidth: 60, flex: '1 1 60px' }}>
                {/* Count label */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                  {b.total}
                </div>
                {/* Stacked bar */}
                <div style={{ width: '100%', maxWidth: 48, display: 'flex',
                  flexDirection: 'column-reverse', height: 160,
                  justifyContent: 'flex-start', borderRadius: 4, overflow: 'hidden',
                  background: '#f3f4f6', position: 'relative' }}>
                  {Object.entries(STATUS_COLORS).map(([status, color]) => {
                    const segH = b[status] > 0
                      ? Math.max(4, Math.round((b[status] / maxTotal) * 160))
                      : 0;
                    return segH > 0 ? (
                      <div key={status} title={`${status}: ${b[status]}`}
                        style={{ width: '100%', height: segH, background: color,
                          transition: 'height 0.4s ease' }} />
                    ) : null;
                  })}
                </div>
                {/* Building label */}
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6,
                  textAlign: 'center', wordBreak: 'break-word',
                  maxWidth: 56, lineHeight: 1.3 }}>
                  {b.building}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16, paddingTop: 12,
          borderTop: '1px solid #f3f4f6' }}>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ color: '#6b7280' }}>{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk table */}
      <div style={chartCard}>
        <h3 style={sectionTitle}>🌡️ Incident Heatmap — Risk by Area</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {buildingData.map((b) => {
            const risk       = getRiskLevel(b.OPEN);
            const barPercent = Math.round((b.total / maxTotal) * 100);

            return (
              <div key={b.building} style={{
                background: risk.bg, border: `1px solid ${risk.color}33`,
                borderRadius: 10, padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>
                      {b.OPEN >= RISK_THRESHOLDS.high ? '🔴'
                        : b.OPEN >= RISK_THRESHOLDS.medium ? '🟡' : '🟢'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{b.building}</div>
                      <div style={{ fontSize: 11, color: risk.color, fontWeight: 600 }}>{risk.label}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: risk.color }}>{b.OPEN}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>open</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, marginBottom: 8 }}>
                  <div style={{ width: `${barPercent}%`, background: risk.color,
                    borderRadius: 4, height: '100%', transition: 'width 0.4s ease' }} />
                </div>

                {/* Status pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS_COLORS).map(([status, color]) =>
                    b[status] > 0 ? (
                      <span key={status} style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px',
                        borderRadius: 20, background: `${color}18`,
                        color, border: `1px solid ${color}44`,
                      }}>
                        {status.replace('_', ' ')}: {b[status]}
                      </span>
                    ) : null
                  )}
                  <span style={{ fontSize: 10, color: '#9ca3af', padding: '2px 8px', marginLeft: 'auto' }}>
                    {b.total} total
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Predictive insight 
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: 10, padding: '14px 18px', marginTop: 16, fontSize: 13, color: '#1e40af' }}>
        💡 <strong>Predictive Insight:</strong> Buildings with consistently high open ticket counts
        may benefit from scheduled preventive maintenance. Consider increasing inspection
        frequency for <strong>{worstBuilding?.building}</strong>.
      </div>
      */}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, color, small }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: small ? 16 : 26, fontWeight: 800, color, marginTop: 6, wordBreak: 'break-word' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

const chartCard    = { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 };
const sectionTitle = { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e3a5f' };