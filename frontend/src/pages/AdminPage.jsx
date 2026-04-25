import { useNavigate } from 'react-router-dom';
import AdminBookings from '../components/AdminBookings';
import '../styles/bookings.css';

export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <div className="bookings-wrapper">
      <div className="bookings-navbar">
        <span className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          🎓 Smart Campus
        </span>
        <div className="nav-links">
          <button className="btn-admin-nav" onClick={() => navigate('/')}>← Home</button>
        </div>
      </div>

      <div className="bookings-hero">
        <h1>🔧 Admin Panel</h1>
        <p>Review, approve, and manage all booking requests</p>
      </div>

      <div className="bookings-content">
        <AdminBookings />
      </div>
    </div>
  );
}