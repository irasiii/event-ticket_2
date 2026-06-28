import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => removeNotification(id), duration);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = {
    success: (msg) => addNotification(msg, 'success'),
    error:   (msg) => addNotification(msg, 'error'),
    info:    (msg) => addNotification(msg, 'info'),
    warning: (msg) => addNotification(msg, 'warning'),
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '.75rem',
        zIndex: 9999, maxWidth: '360px',
      }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            padding: '.9rem 1.2rem',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'flex-start', gap: '.75rem',
            background: n.type === 'success' ? '#f0fdf4'
                      : n.type === 'error'   ? '#fef2f2'
                      : n.type === 'warning' ? '#fffbeb'
                      : '#eff6ff',
            borderLeft: `4px solid ${
              n.type === 'success' ? '#16a34a'
            : n.type === 'error'   ? '#dc2626'
            : n.type === 'warning' ? '#d97706'
            : '#2563eb'}`,
            animation: 'slideIn .25s ease',
          }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
              {n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : n.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <p style={{ flex: 1, fontSize: '.9rem', margin: 0,
              color: n.type === 'success' ? '#166534'
                   : n.type === 'error'   ? '#991b1b'
                   : n.type === 'warning' ? '#92400e'
                   : '#1e40af' }}>
              {n.message}
            </p>
            <button onClick={() => removeNotification(n.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1rem', opacity: .6, flexShrink: 0, lineHeight: 1,
            }}>✕</button>
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
export default NotificationContext;
