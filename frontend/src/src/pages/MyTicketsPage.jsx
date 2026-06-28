import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function MyTicketsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = () => {
    setLoading(true);
    api.get('/bookings/my')
      .then(res => setBookings(res.data.bookings || res.data))
      .catch(() => setError('Failed to load your tickets.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancellingId(bookingId);
    try {
      await api.delete(`/bookings/${bookingId}`);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const now = new Date();
  const upcoming = bookings.filter(b => {
    const eventDate = new Date(b.event?.date);
    return b.status === 'confirmed' && eventDate >= now;
  });
  const past = bookings.filter(b => {
    const eventDate = new Date(b.event?.date);
    return b.status !== 'confirmed' || eventDate < now;
  });

  const displayed = activeTab === 'upcoming' ? upcoming : past;

  const getStatusBadge = (status) => {
    if (status === 'confirmed') return <span className="badge badge-success">Confirmed</span>;
    if (status === 'cancelled') return <span className="badge badge-danger">Cancelled</span>;
    if (status === 'refunded') return <span className="badge badge-warning">Refunded</span>;
    return <span className="badge badge-secondary">{status}</span>;
  };

  return (
    <div className="section">
      <div className="container">
        <h1 className="section-title">My Tickets</h1>

        <div className="tabs">
          <button className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
            Upcoming ({upcoming.length})
          </button>
          <button className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`} onClick={() => setActiveTab('past')}>
            Past & Cancelled ({past.length})
          </button>
        </div>

        {loading && <div className="spinner-container"><div className="spinner"></div></div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && displayed.length === 0 && (
          <div className="empty-state">
            <h3>No tickets here</h3>
            <p style={{ marginBottom: '1rem' }}>
              {activeTab === 'upcoming' ? "You have no upcoming bookings." : "No past or cancelled bookings."}
            </p>
            <Link to="/events" className="btn btn-primary">Browse Events →</Link>
          </div>
        )}

        {!loading && displayed.map(booking => (
          <div key={booking._id} className="booking-card">
            <div className="booking-card-header">
              <div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                  {booking.event?.title || 'Unknown Event'}
                </h3>
                {booking.event?.date && (
                  <p style={{ fontSize: '0.85rem', opacity: 0.85 }}>
                    📅 {new Date(booking.event.date).toLocaleDateString('en-AU', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    {' '} | 📍 {booking.event.venue?.name || booking.event.venue}
                  </p>
                )}
              </div>
              {getStatusBadge(booking.status)}
            </div>
            <div className="booking-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>TICKETS</p>
                  {(booking.tickets || []).map((t, i) => (
                    <p key={i} style={{ fontSize: '0.9rem' }}>
                      {t.tierName} × {t.quantity} @ ${t.unitPrice.toFixed(2)}
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>TOTAL AMOUNT</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                    ${booking.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                  Payment Ref: <strong>{booking.paymentRef}</strong> | Booked: {new Date(booking.createdAt).toLocaleDateString()}
                </p>
                {booking.status === 'confirmed' && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCancel(booking._id)}
                    disabled={cancellingId === booking._id}
                  >
                    {cancellingId === booking._id ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                )}
              </div>

              {booking.status === 'confirmed' && booking.qrCode && (
                <div className="qr-section">
                  <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>QR Code — Show at Entrance</p>
                  <img src={booking.qrCode} alt="QR Code" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
