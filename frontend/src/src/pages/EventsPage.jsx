import { useState, useEffect } from 'react';
import api from '../api/axios';
import EventCard from '../components/EventCard';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    api.get('/categories')
      .then(res => setCategories(res.data.categories || res.data))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [page, category]);

  const fetchEvents = () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page, limit: 9, status: 'published' });
    if (search.trim()) params.append('search', search.trim());
    if (category) params.append('category', category);

    api.get(`/events?${params.toString()}`)
      .then(res => {
        setEvents(res.data.events || res.data);
        setTotalPages(res.data.pages || res.data.totalPages || 1);
      })
      .catch(err => {
        setError('Failed to load events.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  return (
    <div className="section">
      <div className="container">
        <h1 className="section-title">Browse Events</h1>

        {/* Filters */}
        <form onSubmit={handleSearch} className="filter-bar">
          <input
            type="text"
            className="form-control"
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
          <select className="form-control" value={category} onChange={handleCategoryChange} style={{ maxWidth: '200px' }}>
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
          {(search || category) && (
            <button type="button" className="btn btn-secondary" onClick={() => {
              setSearch('');
              setCategory('');
              setPage(1);
            }}>
              Clear
            </button>
          )}
        </form>

        {loading && (
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && events.length === 0 && (
          <div className="empty-state">
            <h3>No events found</h3>
            <p>Try adjusting your search filters.</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <>
            <div className="grid-3">
              {events.map(event => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
