import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function UserDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/bookings/my'),
      api.get('/events?limit=3&status=published'),
    ])
      .then(([bookRes, evtRes]) => {
        setBookings(bookRes.data.bookings || []);
        setEvents(evtRes.data.events || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const confirmed  = bookings.filter(b => b.status === 'confirmed');
  const cancelled  = bookings.filter(b => b.status === 'cancelled');
  const upcoming   = confirmed.filter(b => b.event && new Date(b.event.date) > new Date());
  const totalSpent = confirmed.reduce((sum, b) => sum + b.totalAmount, 0);

  const fmt = (d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  const statusBadge = (s) => {
    if (s === 'confirmed') return <span className="badge badge-success">Confirmed</span>;
    if (s === 'cancelled') return <span className="badge badge-danger">Cancelled</span>;
    return <span className="badge badge-warning">{s}</span>;
  };

  if (loading) return <div className="container" style={{ padding: '3rem' }}><div className="spinner" /></div>;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '3rem' }}>
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 100%)', color: 'white', padding: '2.5rem 0' }}>
        <div className="container">
          <h1 style={{ fontSize: '2rem', marginBottom: '.5rem' }}>👋 Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p style={{ opacity: .85 }}>Here's an overview of your activity on TicketHub.</p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2rem' }}>
        {/* Stat Cards */}
        <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-value">{confirmed.length}</div>
            <div className="stat-label">Active Bookings</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#16a34a' }}>
            <div className="stat-value" style={{ color: '#16a34a' }}>{upcoming.length}</div>
            <div className="stat-label">Upcoming Events</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: 'var(--accent)' }}>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>${totalSpent.toFixed(2)}</div>
            <div className="stat-label">Total Spent</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#6b7280' }}>
            <div className="stat-value" style={{ color: '#6b7280' }}>{cancelled.length}</div>
            <div className="stat-label">Cancelled</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Recent Bookings */}
          <div>
            <div className="page-header" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>Recent Bookings</h2>
              <Link to="/my-tickets" style={{ color: 'var(--primary-mid)', fontSize: '.9rem' }}>View all →</Link>
            </div>
            {bookings.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                <p>No bookings yet.</p>
                <Link to="/events" className="btn btn-primary" style={{ marginTop: '1rem' }}>Browse Events</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {bookings.slice(0, 5).map(b => (
                  <div key={b._id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{b.event?.title || 'Event'}</div>
                      <div style={{ fontSize: '.82rem', color: 'var(--gray-500)', marginTop: '.2rem' }}>
                        {b.event?.date ? fmt(b.event.date) : '—'} • ${b.totalAmount.toFixed(2)}
                      </div>
                    </div>
                    {statusBadge(b.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div>
            <div className="page-header" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>Discover Events</h2>
              <Link to="/events" style={{ color: 'var(--primary-mid)', fontSize: '.9rem' }}>See all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {events.map(e => (
                <Link key={e._id} to={`/events/${e._id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {e.bannerImage ? (
                      <img src={e.bannerImage} alt={e.title} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 6, background: 'var(--primary)', flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{e.title}</div>
                      <div style={{ fontSize: '.82rem', color: 'var(--gray-500)', marginTop: '.2rem' }}>
                        {fmt(e.date)} • {e.venue?.city || ''}
                      </div>
                      <div style={{ fontSize: '.82rem', color: 'var(--primary-mid)', marginTop: '.2rem' }}>
                        From ${e.ticketTiers?.[0]?.price?.toFixed(2) ?? '0.00'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '2rem', background: 'white', borderRadius: 8, padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/events" className="btn btn-primary">🔍 Browse Events</Link>
            <Link to="/my-tickets" className="btn btn-secondary">🎫 My Tickets</Link>
            <Link to="/profile" className="btn btn-secondary">👤 Edit Profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
