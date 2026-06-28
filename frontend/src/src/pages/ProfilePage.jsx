import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) return setError('Name is required.');

    if (form.password && form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }

    if (form.password && form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    const payload = { name: form.name, phone: form.phone };
    if (form.password) payload.password = form.password;

    setLoading(true);
    try {
      const res = await api.put('/auth/me', payload);
      updateUser(res.data.user);
      setSuccess('Profile updated successfully!');
      setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '600px' }}>
        <h1 className="section-title">My Profile</h1>

        {/* Current info card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'var(--primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', fontWeight: 700, flexShrink: 0,
              }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{user?.name}</h2>
                <p className="text-muted">{user?.email}</p>
                <span className={`badge ${user?.role === 'admin' ? 'badge-warning' : 'badge-info'}`} style={{ marginTop: '0.35rem' }}>
                  {user?.role === 'admin' ? '⚙️ Admin' : '👤 User'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>Edit Profile</h3>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-control"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="form-control"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>

              <hr style={{ margin: '1.25rem 0', borderColor: 'var(--gray-200)' }} />
              <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.88rem' }}>
                Leave password fields blank to keep your current password.
              </p>

              <div className="form-group">
                <label htmlFor="password">New Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="New password (optional)"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="form-control"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat new password"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
