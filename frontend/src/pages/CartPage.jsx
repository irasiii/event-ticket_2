import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function CartPage() {
  const { items, itemsByEvent, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successBookings, setSuccessBookings] = useState([]);

  const handleCheckout = async () => {
    if (!user) { navigate('/login'); return; }
    setError('');
    setLoading(true);

    try {
      const bookingResults = [];
      // Group items by event and create one booking per event
      for (const group of Object.values(itemsByEvent)) {
        const tickets = group.tiers.map(t => ({
          tierId: t.tierId,
          tierName: t.tierName,
          quantity: t.quantity,
        }));
        const res = await api.post('/bookings', { eventId: group.eventId, tickets });
        bookingResults.push(res.data.booking || res.data);
      }
      setSuccessBookings(bookingResults);
      clearCart();
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────
  if (successBookings.length > 0) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 680 }}>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Booking Confirmed!</h1>
            <p style={{ color: 'var(--gray-500)', marginBottom: '2rem' }}>
              Your tickets have been booked. Show your QR codes at the venue entrance.
            </p>
          </div>

          {successBookings.map(booking => (
            <div key={booking._id} className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--primary)' }}>{booking.event?.title || 'Event'}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                      Booking ID: {booking._id} · Ref: {booking.paymentRef}
                    </p>
                  </div>
                  <span className="badge badge-success">Confirmed</span>
                </div>
                {booking.qrCode && (
                  <div className="qr-section">
                    <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>Your QR Code</p>
                    <img src={booking.qrCode} alt="QR Code" style={{ maxWidth: 160, margin: '0 auto' }} />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <Link to="/my-tickets" className="btn btn-primary">View My Tickets</Link>
            <Link to="/events" className="btn btn-secondary">Browse More Events</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty cart ────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 600 }}>
          <div className="empty-state">
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛒</div>
            <h2>Your cart is empty</h2>
            <p style={{ marginBottom: '1.5rem' }}>Browse events and add tickets to get started.</p>
            <Link to="/events" className="btn btn-primary">Browse Events</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Cart with items ───────────────────────────────────────────
  return (
    <div className="section">
      <div className="container">
        <h1 className="section-title">🛒 Your Cart</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>

          {/* Cart Items */}
          <div>
            {Object.values(itemsByEvent).map(group => (
              <div key={group.eventId} className="card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 100%)', padding: '1rem 1.25rem', borderRadius: '8px 8px 0 0' }}>
                  <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '0.2rem' }}>{group.eventTitle}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
                    📅 {new Date(group.eventDate).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    {group.venueName ? `  ·  📍 ${group.venueName}` : ''}
                  </p>
                </div>
                <div className="card-body">
                  {group.tiers.map(item => (
                    <div key={item.tierId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{item.tierName}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>${item.price.toFixed(2)} each</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => updateQuantity(item.tierId, item.quantity - 1)}
                          style={{ width: 30, padding: 0, textAlign: 'center' }}
                        >−</button>
                        <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => updateQuantity(item.tierId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxQty}
                          style={{ width: 30, padding: 0, textAlign: 'center' }}
                        >+</button>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 64, textAlign: 'right' }}>
                          ${(item.quantity * item.price).toFixed(2)}
                        </span>
                        <button
                          className="btn btn-sm"
                          onClick={() => removeFromCart(item.tierId)}
                          style={{ color: '#dc2626', background: 'transparent', padding: '0 0.25rem' }}
                          title="Remove"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="card">
              <div className="card-body">
                <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>Order Summary</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {items.map(item => (
                    <div key={item.tierId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--gray-600)' }}>{item.tierName} × {item.quantity}</span>
                      <span>${(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '2px solid var(--gray-200)', paddingTop: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700 }}>Total ({totalItems} ticket{totalItems !== 1 ? 's' : ''})</span>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

                {!user && (
                  <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                    Please <Link to="/login" style={{ fontWeight: 600 }}>login</Link> to checkout.
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '1rem', padding: '0.75rem' }}
                  onClick={handleCheckout}
                  disabled={loading || !user}
                >
                  {loading ? 'Processing...' : '✓ Confirm & Pay'}
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  onClick={clearCart}
                >
                  Clear Cart
                </button>

                <Link to="/events" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', color: 'var(--primary-mid)', fontSize: '0.9rem' }}>
                  ← Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
