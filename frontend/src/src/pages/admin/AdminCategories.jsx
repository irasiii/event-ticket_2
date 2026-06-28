import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import api from '../../api/axios';

const emptyForm = { icon: '🎫', name: '', description: '' };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addForm, setAddForm] = useState(emptyForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchCategories = () => {
    setLoading(true);
    api.get('/categories')
      .then(res => setCategories(res.data.categories || res.data))
      .catch(() => setError('Failed to load categories.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAddChange = e => setAddForm({ ...addForm, [e.target.name]: e.target.value });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    if (!addForm.name.trim()) return setAddError('Category name is required.');
    setAddLoading(true);
    try {
      await api.post('/categories', addForm);
      setAddSuccess(`Category "${addForm.name}" created!`);
      setAddForm(emptyForm);
      fetchCategories();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create category.');
    } finally {
      setAddLoading(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setEditForm({ icon: cat.icon, name: cat.name, description: cat.description });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = e => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const saveEdit = async (catId) => {
    if (!editForm.name.trim()) return alert('Name is required.');
    try {
      await api.put(`/categories/${catId}`, editForm);
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update category.');
    }
  };

  const handleDelete = async (catId, catName) => {
    if (!window.confirm(`Delete category "${catName}"? This will fail if events are using it.`)) return;
    try {
      await api.delete(`/categories/${catId}`);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category. It may be in use by events.');
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
      </div>

      {/* Add Category Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body">
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Add New Category</h3>
          {addError && <div className="alert alert-error">{addError}</div>}
          {addSuccess && <div className="alert alert-success">{addSuccess}</div>}
          <form onSubmit={handleAddSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 2fr auto', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Icon</label>
                <input name="icon" type="text" className="form-control" value={addForm.icon} onChange={handleAddChange} maxLength={4} style={{ textAlign: 'center', fontSize: '1.3rem' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Name *</label>
                <input name="name" type="text" className="form-control" value={addForm.name} onChange={handleAddChange} placeholder="e.g. Music" required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Description</label>
                <input name="description" type="text" className="form-control" value={addForm.description} onChange={handleAddChange} placeholder="Brief description..." />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addLoading}>
                {addLoading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Categories Table */}
      {loading && <div className="spinner-container"><div className="spinner"></div></div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && (
        <table>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Icon</th>
              <th>Name</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No categories yet</td></tr>
            ) : categories.map(cat => (
              <tr key={cat._id}>
                {editingId === cat._id ? (
                  <>
                    <td>
                      <input
                        name="icon"
                        type="text"
                        className="form-control"
                        value={editForm.icon}
                        onChange={handleEditChange}
                        maxLength={4}
                        style={{ textAlign: 'center', fontSize: '1.2rem', width: '54px', padding: '0.3rem' }}
                      />
                    </td>
                    <td>
                      <input
                        name="name"
                        type="text"
                        className="form-control"
                        value={editForm.name}
                        onChange={handleEditChange}
                        required
                      />
                    </td>
                    <td>
                      <input
                        name="description"
                        type="text"
                        className="form-control"
                        value={editForm.description}
                        onChange={handleEditChange}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(cat._id)}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontSize: '1.4rem', textAlign: 'center' }}>{cat.icon}</td>
                    <td style={{ fontWeight: 600 }}>{cat.name}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{cat.description || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => startEdit(cat)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat._id, cat.name)}>Delete</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
