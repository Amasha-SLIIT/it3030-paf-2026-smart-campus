import { useState } from 'react';

const TYPES = ['', 'LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'EQUIPMENT'];
const STATUSES = ['', 'ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE'];
const TYPE_LABELS = { LECTURE_HALL: 'Lecture Hall', LAB: 'Laboratory', MEETING_ROOM: 'Meeting Room', EQUIPMENT: 'Equipment' };
const STATUS_LABELS = { ACTIVE: 'Active', UNDER_MAINTENANCE: 'Under Maintenance', OUT_OF_SERVICE: 'Out of Service' };

const SearchFilterBar = ({ onSearch, loading }) => {
  const [filters, setFilters] = useState({ name: '', type: '', status: '', location: '', minCapacity: '' });
  const [nameError, setNameError] = useState('');

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const handleNameChange = (e) => {
    const raw = e.target.value;
    // Strip anything that is not a letter, digit, or dash
    const clean = raw.replace(/[^a-zA-Z0-9-]/g, '');
    if (raw !== clean) {
      setNameError('Only letters, numbers and - are allowed');
      setTimeout(() => setNameError(''), 2000);
    } else {
      setNameError('');
    }
    set('name', clean);
  };

  const handleSearch = () => onSearch(filters);

  const handleReset = () => {
    const reset = { name: '', type: '', status: '', location: '', minCapacity: '' };
    setFilters(reset);
    setNameError('');
    onSearch(reset);
  };

  return (
    <div className="filter-bar">
      <div className="form-group" style={{ flex: 2, minWidth: 160 }}>
        <label className="form-label">Search by Name</label>
        <input
          className="form-input"
          value={filters.name}
          onChange={handleNameChange}
          placeholder="Resource name…"
          title="Only letters, numbers and dashes (-) allowed"
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={nameError ? { borderColor: 'var(--terracotta)' } : {}}
        />
        {nameError && (
          <span style={{ color: 'var(--terracotta)', fontSize: 11.5, marginTop: 2 }}>
            ⚠ {nameError}
          </span>
        )}
      </div>

      <div className="form-group" style={{ flex: 1, minWidth: 130 }}>
        <label className="form-label">Type</label>
        <select className="form-select" value={filters.type} onChange={e => set('type', e.target.value)}>
          <option value="">All Types</option>
          {TYPES.filter(Boolean).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
        <label className="form-label">Status</label>
        <select className="form-select" value={filters.status} onChange={e => set('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
        <label className="form-label">Location</label>
        <input className="form-input" value={filters.location} onChange={e => set('location', e.target.value)}
          placeholder="e.g. Block A, Floor 2" onKeyDown={e => e.key === 'Enter' && handleSearch()} />
      </div>

      <div className="form-group" style={{ flex: 1, minWidth: 110 }}>
        <label className="form-label">Min Capacity</label>
        <input type="number" className="form-input" value={filters.minCapacity}
          onChange={e => set('minCapacity', e.target.value)} placeholder="e.g. 30" min="1"
          onKeyDown={e => e.key === 'Enter' && handleSearch()} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? '…' : '🔍 Search'}
        </button>
        <button className="btn btn-secondary" onClick={handleReset}>Reset</button>
      </div>
    </div>
  );
};

export default SearchFilterBar;