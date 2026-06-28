import { NavLink } from 'react-router-dom';

export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">Admin Panel</div>
        <NavLink to="/admin" end className={({ isActive }) => isActive ? 'active' : ''}>
          📊 Dashboard
        </NavLink>
        <NavLink to="/admin/events" className={({ isActive }) => isActive ? 'active' : ''}>
          🎭 Events
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'active' : ''}>
          👥 Users
        </NavLink>
        <NavLink to="/admin/bookings" className={({ isActive }) => isActive ? 'active' : ''}>
          🎫 Bookings
        </NavLink>
        <NavLink to="/admin/categories" className={({ isActive }) => isActive ? 'active' : ''}>
          🏷️ Categories
        </NavLink>
        <NavLink to="/admin/venues" className={({ isActive }) => isActive ? 'active' : ''}>
          🏟️ Venues
        </NavLink>
      </aside>
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}
