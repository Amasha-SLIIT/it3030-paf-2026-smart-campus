import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import api from '../api/axiosInstance';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectAfterLogin = (userData) => {
    if (userData.role === 'ADMIN') navigate('/admin/dashboard');
    else navigate('/dashboard');
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const googleUser = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userData = await loginWithGoogle(googleUser.data);
      redirectAfterLogin(userData);
    },
    onError: () => setError('Google login failed. Please try again.'),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await api.post(endpoint, form);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      redirectAfterLogin(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎓 Smart Campus</h1>
        <p style={styles.subtitle}>Operations Hub</p>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(isRegister ? {} : styles.activeTab) }}
            onClick={() => { setIsRegister(false); setError(''); }}
          >Login</button>
          <button
            style={{ ...styles.tab, ...(isRegister ? styles.activeTab : {}) }}
            onClick={() => { setIsRegister(true); setError(''); }}
          >Register</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <input
              style={styles.input}
              placeholder="Full Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Login'}
          </button>
        </form>

        <div style={styles.divider}><span>or</span></div>

        <button style={styles.googleBtn} onClick={() => handleGoogleLogin()}>
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google" style={{ width: 20, marginRight: 10 }}
          />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)',
  },
  card: {
    background: 'white', borderRadius: 16, padding: '40px 36px',
    textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxWidth: 400, width: '100%',
  },
  title: { fontSize: 28, margin: 0, color: '#1e3a5f' },
  subtitle: { color: '#2d6a9f', fontSize: 14, marginTop: 4, marginBottom: 20 },
  tabs: { display: 'flex', marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' },
  tab: {
    flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
    background: 'white', fontSize: 14, fontWeight: 600, color: '#6b7280',
  },
  activeTab: { background: '#1e3a5f', color: 'white' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none',
  },
  error: { color: '#ef4444', fontSize: 13, margin: 0 },
  submitBtn: {
    padding: '12px', background: '#1e3a5f', color: 'white',
    border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 15, fontWeight: 600,
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '20px 0', color: '#9ca3af', fontSize: 13,
  },
  googleBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', padding: '12px', border: '1.5px solid #e0e0e0',
    borderRadius: 8, background: 'white', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, color: '#333',
  },
};