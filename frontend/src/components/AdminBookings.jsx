import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  APPROVED: '#16a34a',
  REJECTED: '#ef4444',
  CANCELLED: '#6b7280',
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const url = filter
        ? `http://localhost:8080/api/bookings?status=${filter}`
        : 'http://localhost:8080/api/bookings';
      const res = await axios.get(url);
      setBookings(res.data);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [filter]);

  const handleDecision = async (id, approved) => {
    let reason = '';
    if (!approved) {
      reason = window.prompt('Enter rejection reason:');
      if (!reason) return;
    }
    try {
      const res = await axios.patch(
        `http://localhost:8080/api/bookings/${id}/decision`,
        { approved, reason }
      );
      setBookings(bookings.map(b => b.id === id ? res.data : b));
      toast.success(approved ? 'Booking approved!' : 'Booking rejected');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  return (
    <div className="admin-bookings">
      <h2>All Bookings</h2>

      <div className="filter-bar">
        {['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(s => (
          <button
            key={s || 'ALL'}
            className={filter === s ? 'tab active' : 'tab'}
            onClick={() => setFilter(s)}
          >
            {s || 'ALL'}
          </button>
        ))}
      </div>

      {loading && <div className="empty-state">Loading...</div>}
      {!loading && bookings.length === 0 && (
        <div className="empty-state">📭 No bookings found.</div>
      )}

      {bookings.map(b => (
        <div key={b.id} className="booking-card">
          <div className="booking-header">
            <strong>{b.resourceName}</strong>
            <span className="status-badge" style={{ background: STATUS_COLORS[b.status] }}>
              {b.status}
            </span>
          </div>
          <p>👤 {b.userName} ({b.userEmail})</p>
          <p>📅 {new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}</p>
          <p>📝 {b.purpose}</p>
          {b.expectedAttendees && <p>👥 {b.expectedAttendees} attendees</p>}
          {b.adminReason && <p className="admin-reason">Note: {b.adminReason}</p>}
          {b.status === 'PENDING' && (
            <div className="action-buttons">
              <button className="btn-success" onClick={() => handleDecision(b.id, true)}>
                ✓ Approve
              </button>
              <button className="btn-danger" onClick={() => handleDecision(b.id, false)}>
                ✗ Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}