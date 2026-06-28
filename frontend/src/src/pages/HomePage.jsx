import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import EventCard from '../components/EventCard';

const CATEGORY_ICONS = {
  Music: '🎵', Sport: '⚽', Sports: '⚽', Conference: '🎤',
  Festival: '🎪', Theatre: '🎭', Comedy: '😂', Art: '🎨',
  Food: '🍴',
};

const STATS = [
  { icon: '🎫', value: '10,000+', label: 'Tickets Sold' },
  { icon: '🌆', value: '50+', label: 'Cities' },
  { icon: '👥', value: '5,000+', label: 'Happy Customers' },
  { icon: '🎪', value: '200+', label: 'Events Hosted' },
];

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, catsRes] = await Promise.all([
          api.get('/events?limit=9&status=published'),
          api.get('/categories').catch(() => ({ data: [] })),
        ]);
        setEvents(eventsRes.data.events || eventsRes.data);
        setCategories(catsRes.data || []);
      } catch (err) {
        setError('Failed to load events. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/events');
    }
  };

  // Filter displayed events by selected category
  const filteredEvents = selectedCategory
    ? events.filter(ev => ev.category?.name === selectedCategory || ev.category === selectedCategory)
    : events;

  const displayedEvents = filteredEvents.slice(0, 6);

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero" style={{ padding: '4rem 0 3rem' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎫</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem' }}>
            Discover & Book<br />Amazing Events
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', maxWidth: 520, margin: '0 auto 2rem' }}>
            Find concerts, sports, conferences, festivals and more. Book your tickets in seconds.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', maxWidth: 520, margin: '0 auto 2rem', gap: 0 }}>
            <input
              type="text"
              placeholder="Search events, venues, cities…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1, padding: '0.8rem 1.2rem', border: 'none',
                borderRadius: '8px 0 0 8px', fontSize: '0.95rem',
                outline: 'none', color: 'var(--gray-700)',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ borderRadius: '0 8px 8px 0', padding: '0.8rem 1.4rem', background: 'var(--accent)', whiteSpace: 'nowrap' }}
            >
              🔍 Search
            </button>
          </form>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/events" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', fontSize: '1rem', padding: '0.65rem 1.75rem' }}>
              Browse All Events
            </Link>
            <Link to="/register" className="btn btn-primary" style={{ background: 'var(--accent)', fontSize: '1rem', padding: '0.65rem 1.75rem' }}>
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────── */}
      <section style={{ background: 'white', borderBottom: '1px solid var(--gray-100)', padding: '1.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem, 4vw, 4rem)', flexWrap: 'wrap' }}>
            {STATS.map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--primary)', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Events ───────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Featured Events</h2>
            <Link to="/events" style={{ color: 'var(--primary-mid)', fontWeight: 600, fontSize: '0.9rem' }}>View all →</Link>
          </div>

          {/* Category filter pills */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  border: '2px solid var(--primary)',
                  background: selectedCategory === null ? 'var(--primary)' : 'transparent',
                  color: selectedCategory === null ? 'white' : 'var(--primary)',
                  transition: 'all 0.15s',
                }}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat.name === selectedCategory ? null : cat.name)}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                    border: '2px solid var(--primary)',
                    background: selectedCategory === cat.name ? 'var(--primary)' : 'transparent',
                    color: selectedCategory === cat.name ? 'white' : 'var(--primary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat.icon || CATEGORY_ICONS[cat.name] || '🎪'} {cat.name}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="spinner-container"><div className="spinner"></div></div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {!loading && !error && displayedEvents.length === 0 && (
            <div className="empty-state">
              <h3>No events {selectedCategory ? `in ${selectedCategory}` : 'available'} yet</h3>
              <p>{selectedCategory ? 'Try another category or' : 'Check back soon —'} more events are coming!</p>
              {selectedCategory && (
                <button className="btn btn-outline" onClick={() => setSelectedCategory(null)} style={{ marginTop: '1rem' }}>
                  Show all events
                </button>
              )}
            </div>
          )}

          {!loading && !error && displayedEvents.length > 0 && (
            <>
              <div className="grid-3">
                {displayedEvents.map(event => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <Link
                  to={selectedCategory ? `/events?category=${encodeURIComponent(selectedCategory)}` : '/events'}
                  className="btn btn-outline"
                  style={{ padding: '0.7rem 2rem', fontWeight: 600 }}
                >
                  View All Events →
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center' }}>How It Works</h2>
          <p style={{ textAlign: 'center', color: 'var(--gray-500)', marginBottom: '2.5rem', marginTop: '-0.5rem' }}>
            Book tickets in 3 easy steps
          </p>
          <div className="grid-3">
            {[
              { step: '1', icon: '🔍', title: 'Find Your Event', desc: 'Browse hundreds of events across music, sports, theatre, food, and more.' },
              { step: '2', icon: '🛒', title: 'Choose Your Tickets', desc: 'Select your ticket tier and quantity. Add multiple events to one cart.' },
              { step: '3', icon: '🎉', title: 'Enjoy the Show', desc: 'Get instant QR code confirmation. Show at the door and you\'re in!' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{ textAlign: 'center', padding: '2rem 1.5rem', position: 'relative' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem', fontSize: '1.4rem',
                }}>
                  {icon}
                </div>
                <div style={{
                  position: 'absolute', top: '1.6rem', left: '50%', transform: 'translateX(-50%)',
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--accent)', color: 'white',
                  fontSize: '0.7rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: 20,
                }}>
                  {step}
                </div>
                <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.05rem' }}>{title}</h3>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why TicketHub ─────────────────────────────────────── */}
      <section className="section" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-mid) 100%)', color: 'white' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Why Choose TicketHub?</h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', marginBottom: '2.5rem' }}>Built for event lovers, trusted by organisers</p>
          <div className="grid-3">
            {[
              { icon: '⚡', title: 'Instant Booking', desc: 'Book in under 60 seconds. No queues, no waiting.' },
              { icon: '📱', title: 'QR Code Tickets', desc: 'Digital tickets on your device — no printing needed.' },
              { icon: '🔒', title: 'Secure Payments', desc: 'Your bookings and data are always protected.' },
              { icon: '🎯', title: 'Smart Discovery', desc: 'Find events by category, date, and location easily.' },
              { icon: '📊', title: 'Organiser Tools', desc: 'Powerful admin dashboard for event organisers.' },
              { icon: '🌟', title: 'Real Reviews', desc: 'Verified attendee reviews to help you choose.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '1.5rem',
                backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{icon}</div>
                <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '0.4rem' }}>{title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <section style={{ background: 'var(--accent)', padding: '3rem 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ color: 'white', fontSize: '1.7rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Ready to experience something unforgettable?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.88)', marginBottom: '1.75rem', fontSize: '1.05rem' }}>
            Join thousands of event-goers already on TicketHub.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/events" className="btn" style={{ background: 'white', color: 'var(--accent)', fontWeight: 700, padding: '0.75rem 2rem', fontSize: '1rem' }}>
              Browse Events
            </Link>
            <Link to="/register" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.7)', padding: '0.75rem 2rem', fontSize: '1rem' }}>
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
