import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/analytics')
      .then(res => setAnalytics(res.data))
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status) => {
    if (status === 'confirmed') return <span className="badge badge-success">Confirmed</span>;
    if (status === 'cancelled') return <span className="badge badge-danger">Cancelled</span>;
    if (status === 'refunded') return <span className="badge badge-warning">Refunded</span>;
    return <span className="badge badge-secondary">{status}</span>;
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      {loading && <div className="spinner-container"><div className="spinner"></div></div>}
      {error && <div className="alert alert-error">{error}</div>}

      {analytics && (
        <>
          {/* Stat Cards */}
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-value">{analytics.totalUsers ?? 0}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.totalEvents ?? 0}</div>
              <div className="stat-label">Total Events</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.confirmedBookings ?? analytics.totalBookings ?? 0}</div>
              <div className="stat-label">Confirmed Bookings</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>
                ${(analytics.totalRevenue ?? 0).toFixed(2)}
              </div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>

          {/* Recent Bookings */}
          {analytics.recentBookings && analytics.recentBookings.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 className="section-title" style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Recent Bookings</h2>
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Event</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recentBookings.map(b => (
                    <tr key={b._id}>
                      <td>{b.user?.name || '—'}</td>
                      <td>{b.event?.title || '—'}</td>
                      <td>${(b.totalAmount || 0).toFixed(2)}</td>
                      <td>{getStatusBadge(b.status)}</td>
                      <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Booking Trend */}
          {analytics.bookingTrend && analytics.bookingTrend.length > 0 && (
            <div>
              <h2 className="section-title" style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Booking Trend (Last 7 Days)</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bookings</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.bookingTrend.map((row, i) => (
                    <tr key={i}>
                      <td>{row._id || row.date}</td>
                      <td>{row.count ?? row.bookings ?? 0}</td>
                      <td>${(row.revenue ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
