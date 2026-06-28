import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import api from '../../api/axios';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 15 });
    if (statusFilter) params.append('status', statusFilter);

    api.get(`/admin/bookings?${params.toString()}`)
      .then(res => {
        setBookings(res.data.bookings || res.data);
        setTotalPages(res.data.pages || res.data.totalPages || 1);
      })
      .catch(() => setError('Failed to load bookings.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Cancel this booking?')) return;
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

  const getStatusBadge = (status) => {
    if (status === 'confirmed') return <span className="badge badge-success">Confirmed</span>;
    if (status === 'cancelled') return <span className="badge badge-danger">Cancelled</span>;
    if (status === 'refunded') return <span className="badge badge-warning">Refunded</span>;
    return <span className="badge badge-secondary">{status}</span>;
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Bookings</h1>
      </div>

      <div className="filter-bar">
        <select className="form-control" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: '180px' }}>
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {loading && <div className="spinner-container"><div className="spinner"></div></div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && (
        <>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Event</th>
                <th>Tickets</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Booked At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No bookings found</td></tr>
              ) : bookings.map((b, idx) => (
                <tr key={b._id}>
                  <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{(page - 1) * 15 + idx + 1}</td>
                  <td>{b.user?.name || '—'}</td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.event?.title || '—'}
                  </td>
                  <td>
                    {(b.tickets || []).reduce((acc, t) => acc + t.quantity, 0)} ticket(s)
                  </td>
                  <td>${(b.totalAmount || 0).toFixed(2)}</td>
                  <td>{getStatusBadge(b.status)}</td>
                  <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td>
                    {b.status === 'confirmed' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancel(b._id)}
                        disabled={cancellingId === b._id}
                      >
                        {cancellingId === b._id ? '...' : 'Cancel'}
                      </button>
                    )}
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
