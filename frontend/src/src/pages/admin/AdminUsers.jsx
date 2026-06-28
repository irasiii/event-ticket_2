import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchUsers = (q = '') => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.append('search', q.trim());
    api.get(`/admin/users?${params.toString()}`)
      .then(res => setUsers(res.data.users || res.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleToggleActive = async (userId, currentIsActive) => {
    if (userId === currentUser?._id) return alert('You cannot modify your own account.');
    try {
      await api.put(`/admin/users/${userId}`, { isActive: !currentIsActive });
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: !currentIsActive } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    if (userId === currentUser?._id) return alert('You cannot modify your own account.');
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
    try {
      await api.put(`/admin/users/${userId}`, { role: newRole });
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role.');
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Users</h1>
      </div>

      <form onSubmit={handleSearch} className="filter-bar">
        <input
          type="text"
          className="form-control"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '360px' }}
        />
        <button type="submit" className="btn btn-primary">Search</button>
        {search && (
          <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); fetchUsers(''); }}>
            Clear
          </button>
        )}
      </form>

      {loading && <div className="spinner-container"><div className="spinner"></div></div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No users found</td></tr>
            ) : users.map(u => (
              <tr key={u._id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  {u._id !== currentUser?._id ? (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => handleToggleActive(u._id, u.isActive)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleRole(u._id, u.role)}
                      >
                        Make {u.role === 'admin' ? 'User' : 'Admin'}
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted" style={{ fontSize: '0.82rem' }}>You</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
