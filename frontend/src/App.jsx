import { useApp } from './context/AppContext';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import './styles/global.css';
import './App.css';

const App = () => {
  const { role, setRole, toast } = useApp();

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-mark">🎓</div>
          <div>
            <div className="app-logo-text">SmartCampus</div>
            <div className="app-logo-sub">Resource Management</div>
          </div>
        </div>

        <div className="app-header-spacer" />

        {/* Role Switcher */}
        <div className="role-switcher">
          <span className="role-label">View as</span>
          <button
            className={`role-btn ${role === 'USER' ? 'active' : ''}`}
            onClick={() => setRole('USER')}
          >👤 User</button>
          <button
            className={`role-btn ${role === 'ADMIN' ? 'active' : ''}`}
            onClick={() => setRole('ADMIN')}
          >🛡 Admin</button>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {role === 'ADMIN' ? <AdminPage /> : <UserPage />}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
};

export default App;
