import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import api from '../../api/axios';

const EMPTY_FORM = { name: '', address: '', city: '', country: 'Australia', capacity: '', description: '', facilities: '' };

export default function AdminVenues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchVenues = () => {
    setLoading(true);
    api.get('/venues')
      .then(res => setVenues(res.data.venues))
      .catch(() => setError('Failed to load venues'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (venue) => {
    setEditId(venue._id);
    setForm({
      name: venue.name,
      address: venue.address,
      city: venue.city,
      country: venue.country || 'Australia',
      capacity: venue.capacity || '',
      description: venue.description || '',
      facilities: (venue.facilities || []).join(', '),
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim() || !form.city.trim()) {
      setError('Name, address, and city are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        capacity: form.capacity ? Number(form.capacity) : 0,
        facilities: form.facilities ? form.facilities.split(',').map(f => f.trim()).filter(Boolean) : [],
      };
      if (editId) {
        await api.put(`/venues/${editId}`, payload);
        setSuccess('Venue updated successfully.');
      } else {
        await api.post('/venues', payload);
        setSuccess('Venue created successfully.');
      }
      setShowForm(false);
      setEditId(null);
      fetchVenues();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save venue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete venue "${name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.delete(`/venues/${id}`);
      setSuccess(`Venue "${name}" deleted.`);
      fetchVenues();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete venue.');
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">🏟️ Venue Management</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Venue</button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h2 style={{ marginBottom: '1.25rem', fontSize: '1.2rem', color: 'var(--primary)' }}>
            {editId ? 'Edit Venue' : 'New Venue'}
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Venue Name *</label>
                <input className="form-control" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Brisbane Entertainment Centre" required />
              </div>
              <div className="form-group">
                <label>City *</label>
                <input className="form-control" name="city" value={form.city} onChange={handleChange} placeholder="e.g. Brisbane" required />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Address *</label>
                <input className="form-control" name="address" value={form.address} onChange={handleChange} placeholder="e.g. 40 Lang Park, Milton" required />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input className="form-control" name="country" value={form.country} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input className="form-control" type="number" name="capacity" value={form.capacity} onChange={handleChange} min="0" placeholder="e.g. 5000" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea className="form-control" name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Brief description of the venue..." />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Facilities <span style={{ fontWeight: 400, color: 'var(--gray-500)' }}>(comma-separated)</span></label>
                <input className="form-control" name="facilities" value={form.facilities} onChange={handleChange} placeholder="e.g. Parking, Wheelchair Access, Bar" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '.5rem' }}>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : editId ? 'Save Changes' : 'Create Venue'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="spinner-container"><div className="spinner" /></div>
      ) : venues.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
          No venues yet. Click "Add Venue" to create one.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Venue Name</th>
              <th>Address</th>
              <th>City</th>
              <th>Capacity</th>
              <th>Facilities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {venues.map(v => (
              <tr key={v._id}>
                <td><strong>{v.name}</strong></td>
                <td>{v.address}</td>
                <td>{v.city}</td>
                <td>{v.capacity ? v.capacity.toLocaleString() : '—'}</td>
                <td style={{ maxWidth: '200px', whiteSpace: 'normal', fontSize: '.82rem' }}>
                  {v.facilities?.length ? v.facilities.join(', ') : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(v)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v._id, v.name)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
