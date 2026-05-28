import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

// Category colour map — inspired by Figma Make colour treatment
const CATEGORY_COLORS = {
  Music:      ['#7c3aed', '#a78bfa'],
  Sport:      ['#065f46', '#34d399'],
  Sports:     ['#065f46', '#34d399'],
  Conference: ['#1e40af', '#60a5fa'],
  Festival:   ['#92400e', '#fbbf24'],
  Theatre:    ['#831843', '#f472b6'],
  Comedy:     ['#b45309', '#fcd34d'],
  Art:        ['#0e7490', '#22d3ee'],
  Food:       ['#166534', '#86efac'],
  default:    ['#1F3864', '#2E75B6'],
};

function getCategoryColors(categoryName) {
  const key = Object.keys(CATEGORY_COLORS).find(k =>
    categoryName?.toLowerCase().includes(k.toLowerCase())
  );
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
}

export default function EventCard({ event }) {
  const { addToCart, items } = useCart();

  const minPrice = event.ticketTiers?.length > 0
    ? Math.min(...event.ticketTiers.map(t => t.price))
    : null;

  const seatsRemaining = event.seatsRemaining !== undefined
    ? event.seatsRemaining
    : (event.ticketTiers || []).reduce((acc, t) => acc + (t.quantity - t.sold), 0);

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('en-AU', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      })
    : '';

  const [c1, c2] = getCategoryColors(event.category?.name);
  const isSoldOut = seatsRemaining === 0;
  const isLowStock = !isSoldOut && seatsRemaining <= 20;

  // Quick-add cheapest available tier to cart
  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const cheapestTier = event.ticketTiers
      ?.filter(t => (t.quantity - t.sold) > 0)
      .sort((a, b) => a.price - b.price)[0];
    if (cheapestTier) addToCart(event, cheapestTier, 1);
  };

  const inCart = items.some(i => event.ticketTiers?.some(t => t._id === i.tierId));

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Image / gradient banner */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden', flexShrink: 0 }}>
        {event.bannerImage ? (
          <img
            src={event.bannerImage}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.04)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem',
          }}>
            {event.category?.icon || '🎫'}
          </div>
        )}

        {/* Sold out overlay */}
        {isSoldOut && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem', letterSpacing: 2, background: '#dc2626', padding: '0.4rem 1rem', borderRadius: 4 }}>
              SOLD OUT
            </span>
          </div>
        )}

        {/* Low-stock badge */}
        {isLowStock && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <span className="badge badge-warning">🔥 {seatsRemaining} left</span>
          </div>
        )}

        {/* Category badge */}
        {event.category && (
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ background: `${c1}dd`, color: 'white', padding: '0.25rem 0.6rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
              {event.category.icon} {event.category.name}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{
          fontSize: '1rem', fontWeight: 700, color: 'var(--gray-700)',
          marginBottom: '0.5rem', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {event.title}
        </h3>

        <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>📅 {formattedDate}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>
          📍 {event.venue?.name || event.venue}{(event.venue?.city || event.city) ? `, ${event.venue?.city || event.city}` : ''}
        </p>

        {/* Price row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: c1 }}>
            {minPrice !== null && minPrice > 0 ? `From $${minPrice.toFixed(2)}` : '🆓 Free'}
          </span>
          {!isSoldOut && !isLowStock && (
            <span className="badge badge-success">{seatsRemaining} seats</span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/events/${event._id}`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }}>
            View Details
          </Link>
          {!isSoldOut && (
            <button
              className="btn btn-secondary"
              onClick={handleQuickAdd}
              title={inCart ? 'Added to cart' : 'Quick add to cart'}
              style={{ padding: '0 0.75rem', fontSize: '1rem', minWidth: 42 }}
            >
              {inCart ? '✓' : '🛒'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
