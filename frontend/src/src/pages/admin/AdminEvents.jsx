import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import api from '../../api/axios';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const fetchEvents = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 10 });
    if (statusFilter) params.append('status', statusFilter);

    api.get(`/admin/events?${params.toString()}`)
      .then(res => {
        setEvents(res.data.events || res.data);
        setTotalPages(res.data.pages || res.data.totalPages || 1);
      })
      .catch(() => setError('Failed to load events.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, [page, statusFilter]);

  const handleCancel = async (id, title) => {
    if (!window.confirm(`Cancel event "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/events/${id}`);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel event.');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'published') return <span className="badge badge-success">Published</span>;
    if (status === 'draft') return <span className="badge badge-secondary">Draft</span>;
    if (status === 'cancelled') return <span className="badge badge-danger">Cancelled</span>;
    return <span className="badge badge-secondary">{status}</span>;
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Events</h1>
        <Link to="/admin/events/new" className="btn btn-primary">+ Create Event</Link>
      </div>

      {/* Status Filter */}
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <select className="form-control" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: '180px' }}>
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading && <div className="spinner-container"><div className="spinner"></div></div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && (
        <>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th>Venue</th>
                <th>Status</th>
                <th>Capacity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No events found</td></tr>
              ) : events.map(event => (
                <tr key={event._id}>
                  <td style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.title}
                  </td>
                  <td>{event.category?.name || '—'}</td>
                  <td>{new Date(event.date).toLocaleDateString()}</td>
                  <td>{event.venue?.name || event.venue}</td>
                  <td>{getStatusBadge(event.status)}</td>
                  <td>{event.capacity}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/admin/events/${event._id}/edit`)}>
                        Edit
                      </button>
                      {event.status !== 'cancelled' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(event._id, event.title)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
