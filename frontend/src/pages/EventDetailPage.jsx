import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking state
  const [quantities, setQuantities] = useState({});
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(res => {
        const ev = res.data.event || res.data;
        setEvent(ev);
        // Init quantities to 0 for each tier
        const init = {};
        (ev.ticketTiers || []).forEach(t => { init[t._id] = 0; });
        setQuantities(init);
      })
      .catch(() => setError('Event not found or failed to load.'))
      .finally(() => setLoading(false));
  }, [id]);

  const totalPrice = event
    ? (event.ticketTiers || []).reduce((acc, tier) => {
        return acc + (quantities[tier._id] || 0) * tier.price;
      }, 0)
    : 0;

  const totalTickets = Object.values(quantities || {}).reduce((a, b) => a + b, 0);

  const handleBook = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const tickets = (event.ticketTiers || [])
      .filter(t => (quantities[t._id] || 0) > 0)
      .map(t => ({ tierId: t._id, tierName: t.name, quantity: quantities[t._id] }));

    if (tickets.length === 0) {
      setBookingError('Please select at least one ticket.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    try {
      const res = await api.post('/bookings', { eventId: id, tickets });
      setBookingSuccess(res.data.booking || res.data);
      // Reset quantities
      const init = {};
      (event.ticketTiers || []).forEach(t => { init[t._id] = 0; });
      setQuantities(init);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="spinner-container"><div className="spinner"></div></div>;
  if (error) return <div className="container section"><div className="alert alert-error">{error}</div></div>;
  if (!event) return null;

  const formattedDate = new Date(event.date).toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const formattedTime = new Date(event.date).toLocaleTimeString('en-AU', {
    hour: '2-digit', minute: '2-digit',
  });

  const statusColors = { published: 'badge-success', draft: 'badge-secondary', cancelled: 'badge-danger' };

  return (
    <div>
      {/* Hero Banner */}
      <div className="event-detail-hero">
        {event.bannerImage ? (
          <img src={event.bannerImage} alt={event.title} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--primary) 0%,var(--primary-mid) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>
            {event.category?.icon || '🎫'}
          </div>
        )}
        <div className="event-detail-overlay">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {event.category && <span className="badge badge-info">{event.category.icon} {event.category.name}</span>}
            <span className={`badge ${statusColors[event.status] || 'badge-secondary'}`}>{event.status}</span>
          </div>
          <h1>{event.title}</h1>
        </div>
      </div>

      {/* Cancelled Banner */}
      {event.status === 'cancelled' && (
        <div className="alert alert-error" style={{ borderRadius: 0, margin: 0 }}>
          ⚠️ This event has been cancelled. No new bookings are being accepted.
        </div>
      )}

      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>

          {/* Left: Event Info */}
          <div>
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '2px' }}>DATE & TIME</p>
                <p style={{ fontWeight: 600 }}>📅 {formattedDate}</p>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>🕐 {formattedTime}</p>
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '2px' }}>VENUE</p>
                <p style={{ fontWeight: 600 }}>📍 {event.venue?.name || event.venue}</p>
                {(event.venue?.city || event.city) && <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>{event.venue?.city || event.city}</p>}
              </div>
              <div>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '2px' }}>CAPACITY</p>
                <p style={{ fontWeight: 600 }}>👥 {event.capacity} total</p>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>{event.seatsRemaining} seats left</p>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>About This Event</h2>
              <p style={{ lineHeight: 1.8, color: 'var(--gray-600)' }}>{event.description}</p>
            </div>

            {/* Ticket Tiers Table */}
            <div>
              <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>Ticket Tiers</h2>
              <table>
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Price</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {(event.ticketTiers || []).map(tier => {
                    const available = tier.quantity - tier.sold;
                    return (
                      <tr key={tier._id}>
                        <td style={{ fontWeight: 600 }}>{tier.name}</td>
                        <td>${tier.price.toFixed(2)}</td>
                        <td>
                          {available > 0
                            ? <span className="badge badge-success">{available} left</span>
                            : <span className="badge badge-danger">Sold Out</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Booking Form */}
          <div>
            <div className="card" style={{ position: 'sticky', top: '80px' }}>
              <div className="card-body">
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>
                  {event.status === 'cancelled' ? '🚫 Event Cancelled' : 'Book Tickets'}
                </h3>

                {bookingSuccess ? (
                  <div>
                    <div className="alert alert-success">
                      ✅ Booking confirmed! Booking ID: <strong>{bookingSuccess._id}</strong>
                    </div>
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Payment Ref: <strong>{bookingSuccess.paymentRef}</strong>
                    </p>
                    {bookingSuccess.qrCode && (
                      <div className="qr-section">
                        <p style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--primary)' }}>Your QR Code</p>
                        <img src={bookingSuccess.qrCode} alt="QR Code" style={{ maxWidth: '180px', margin: '0 auto' }} />
                        <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                          Show this at the venue entrance
                        </p>
                      </div>
                    )}
                    <button
                      className="btn btn-outline"
                      style={{ width: '100%', marginTop: '1rem' }}
                      onClick={() => setBookingSuccess(null)}
                    >
                      Book More Tickets
                    </button>
                  </div>
                ) : (
                  <>
                    {event.status !== 'cancelled' ? (
                      <>
                        {(event.ticketTiers || []).filter(t => (t.quantity - t.sold) > 0).length === 0 ? (
                          <div className="alert alert-warning">This event is sold out.</div>
                        ) : (
                          <>
                            {(event.ticketTiers || []).map(tier => {
                              const available = tier.quantity - tier.sold;
                              if (available <= 0) return null;
                              return (
                                <div key={tier._id} className="form-group">
                                  <label>{tier.name} — ${tier.price.toFixed(2)}</label>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setQuantities(q => ({ ...q, [tier._id]: Math.max(0, (q[tier._id] || 0) - 1) }))}
                                    >-</button>
                                    <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                                      {quantities[tier._id] || 0}
                                    </span>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => setQuantities(q => ({ ...q, [tier._id]: Math.min(available, (q[tier._id] || 0) + 1) }))}
                                    >+</button>
                                    <span className="text-muted" style={{ fontSize: '0.82rem' }}>({available} left)</span>
                                  </div>
                                </div>
                              );
                            })}

                            <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 600 }}>Total ({totalTickets} ticket{totalTickets !== 1 ? 's' : ''})</span>
                                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>${totalPrice.toFixed(2)}</span>
                              </div>

                              {bookingError && <div className="alert alert-error">{bookingError}</div>}

                              {!user ? (
                                <div className="alert alert-info">
                                  Please <a href="/login" style={{ color: 'var(--primary-mid)', fontWeight: 600 }}>login</a> to book tickets.
                                </div>
                              ) : (
                                <button
                                  className="btn btn-primary"
                                  style={{ width: '100%' }}
                                  onClick={handleBook}
                                  disabled={bookingLoading || totalTickets === 0}
                                >
                                  {bookingLoading ? 'Booking...' : 'Book Now'}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="alert alert-error">This event has been cancelled.</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}