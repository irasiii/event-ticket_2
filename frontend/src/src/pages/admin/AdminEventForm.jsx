import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import api from '../../api/axios';

const emptyTier = () => ({ name: '', price: '', quantity: '' });

const toDatetimeLocal = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminEventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: '', description: '', category: '', date: '', endDate: '',
    venue: '', city: '', capacity: '', status: 'draft', bannerImage: '',
  });
  const [tiers, setTiers] = useState([emptyTier()]);
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/categories')
      .then(res => setCategories(res.data.categories || res.data))
      .catch(() => {});
    api.get('/venues')
      .then(res => setVenues(res.data.venues || res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get(`/events/${id}`)
        .then(res => {
          const ev = res.data.event || res.data;
          setForm({
            title: ev.title || '',
            description: ev.description || '',
            category: ev.category?._id || ev.category || '',
            date: toDatetimeLocal(ev.date),
            endDate: toDatetimeLocal(ev.endDate),
            venue: ev.venue?._id || ev.venue || '',
            city: ev.city || ev.venue?.city || '',
            capacity: ev.capacity || '',
            status: ev.status || 'draft',
            bannerImage: ev.bannerImage || '',
          });
          if (ev.ticketTiers && ev.ticketTiers.length > 0) {
            setTiers(ev.ticketTiers.map(t => ({ name: t.name, price: t.price, quantity: t.quantity })));
          }
        })
        .catch(() => setError('Failed to load event data.'))
        .finally(() => setFetchLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleVenueChange = e => {
    const selectedVenue = venues.find(v => v._id === e.target.value);
    setForm({
      ...form,
      venue: e.target.value,
      city: selectedVenue?.city || form.city,
    });
  };

  const handleTierChange = (index, field, value) => {
    const updated = tiers.map((t, i) => i === index ? { ...t, [field]: value } : t);
    setTiers(updated);
  };

  const addTier = () => setTiers([...tiers, emptyTier()]);

  const removeTier = (index) => {
    if (tiers.length === 1) return;
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title.trim() || !form.description.trim() || !form.category || !form.date || !form.venue || !form.capacity) {
      return setError('Please fill in all required fields.');
    }

    for (const tier of tiers) {
      if (!tier.name.trim() || tier.price === '' || tier.quantity === '') {
        return setError('Please complete all ticket tier fields.');
      }
    }

    const payload = {
      ...form,
      capacity: Number(form.capacity),
      ticketTiers: tiers.map(t => ({ name: t.name, price: Number(t.price), quantity: Number(t.quantity) })),
    };
    if (!payload.endDate) delete payload.endDate;
    if (!payload.bannerImage) delete payload.bannerImage;

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/events/${id}`, payload);
        setSuccess('Event updated successfully!');
      } else {
        await api.post('/events', payload);
        setSuccess('Event created successfully!');
        setTimeout(() => navigate('/admin/events'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <AdminLayout><div className="spinner-container"><div className="spinner"></div></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Edit Event' : 'Create Event'}</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/events')}>← Back</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="grid-2">
              <div className="form-group">
                <label>Title *</label>
                <input name="title" type="text" className="form-control" value={form.title} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <select name="category" className="form-control" value={form.category} onChange={handleChange} required>
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea name="description" className="form-control" rows="4" value={form.description} onChange={handleChange} required />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Start Date & Time *</label>
                <input name="date" type="datetime-local" className="form-control" value={form.date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>End Date & Time (optional)</label>
                <input name="endDate" type="datetime-local" className="form-control" value={form.endDate} onChange={handleChange} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Venue *</label>
                <select name="venue" className="form-control" value={form.venue} onChange={handleVenueChange} required>
                  <option value="">Select venue...</option>
                  {venues.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.name} — {v.city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>City</label>
                <input name="city" type="text" className="form-control" value={form.city} onChange={handleChange} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Capacity *</label>
                <input name="capacity" type="number" min="1" className="form-control" value={form.capacity} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" className="form-control" value={form.status} onChange={handleChange}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Banner Image URL</label>
              <input name="bannerImage" type="url" className="form-control" value={form.bannerImage} onChange={handleChange} placeholder="https://example.com/image.jpg" />
            </div>

            {/* Ticket Tiers */}
            <hr style={{ margin: '1.5rem 0', borderColor: 'var(--gray-200)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--primary)' }}>Ticket Tiers</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addTier}>+ Add Tier</button>
            </div>

            <div style={{ marginBottom: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem' }}>
              <label style={{ marginBottom: 0, fontSize: '0.82rem', color: 'var(--gray-500)' }}>Tier Name</label>
              <label style={{ marginBottom: 0, fontSize: '0.82rem', color: 'var(--gray-500)' }}>Price ($)</label>
              <label style={{ marginBottom: 0, fontSize: '0.82rem', color: 'var(--gray-500)' }}>Quantity</label>
              <span></span>
            </div>

            {tiers.map((tier, index) => (
              <div key={index} className="ticket-tier-row">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. General Admission"
                  value={tier.name}
                  onChange={e => handleTierChange(index, 'name', e.target.value)}
                  required
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={tier.price}
                  onChange={e => handleTierChange(index, 'price', e.target.value)}
                  required
                />
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  placeholder="100"
                  value={tier.quantity}
                  onChange={e => handleTierChange(index, 'quantity', e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeTier(index)}
                  disabled={tiers.length === 1}
                  title="Remove tier"
                >
                  ✕
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/events')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
