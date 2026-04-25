import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BookingForm from '../components/BookingForm';
import MyBookings from '../components/MyBookings';
import '../styles/bookings.css';

const USER = { email: 'staff@test.com', name: 'Academic Staff', role: 'STAFF' };

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState('my');
  const navigate = useNavigate();

  return (
    <div className="bookings-wrapper">
      <div className="bookings-navbar">
        <span className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          🎓 Smart Campus
        </span>
        <div className="nav-links">
          <span className="nav-user">👩‍🏫 {USER.name}</span>
          <button className="btn-admin-nav" onClick={() => navigate('/')}>← Home</button>
        </div>
      </div>

      <div className="bookings-hero">
        <h1>📅 Staff Bookings</h1>
        <p>Reserve resources for lectures, research and faculty meetings</p>
      </div>

      <div className="bookings-content">
        <div className="tab-bar">
          <button className={activeTab === 'my' ? 'tab active' : 'tab'} onClick={() => setActiveTab('my')}>
            My Bookings
          </button>
          <button className={activeTab === 'new' ? 'tab active' : 'tab'} onClick={() => setActiveTab('new')}>
            + New Booking
          </button>
        </div>

        {activeTab === 'my' && <MyBookings userEmail={USER.email} />}
        {activeTab === 'new' && (
          <BookingForm userEmail={USER.email} userName={USER.name} onSuccess={() => setActiveTab('my')} />
        )}
      </div>
    </div>
  );
}