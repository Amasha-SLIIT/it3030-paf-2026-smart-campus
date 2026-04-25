export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.spinner} />
        <p style={styles.text}>{text}</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#f8fafc',
  },
  box: { textAlign: 'center' },
  spinner: {
    width: 44, height: 44, margin: '0 auto 16px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #1e3a5f',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  text: { color: '#6b7280', fontSize: 14 },
};