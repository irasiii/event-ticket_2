import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');
  const closeMenu = () => setMenuOpen(false);

  const CartIcon = () => (
    <Link
      to="/cart"
      onClick={closeMenu}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', color: 'white', fontSize: '1.2rem', textDecoration: 'none' }}
      title={`Cart (${totalItems})`}
    >
      🛒
      {totalItems > 0 && (
        <span style={{
          position: 'absolute', top: -8, right: -10,
          background: 'var(--accent)', color: 'white',
          borderRadius: '50%', width: 18, height: 18,
          fontSize: '0.65rem', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {totalItems > 9 ? '9+' : totalItems}
        </span>
      )}
    </Link>
  );

  return (
    <>
      <nav className="navbar">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" className="nav-logo" onClick={closeMenu}>🎫 TicketHub</Link>

          {/* Desktop links */}
          <div className="nav-links nav-desktop">
            <Link to="/events" style={isActive('/events') ? { borderBottom: '2px solid var(--accent)', paddingBottom: 2 } : {}}>Events</Link>
            {user && <Link to="/dashboard" style={isActive('/dashboard') ? { borderBottom: '2px solid var(--accent)', paddingBottom: 2 } : {}}>Dashboard</Link>}
            {user && <Link to="/my-tickets" style={isActive('/my-tickets') ? { borderBottom: '2px solid var(--accent)', paddingBottom: 2 } : {}}>My Tickets</Link>}
            {user?.role === 'admin' && <Link to="/admin" style={isActive('/admin') ? { borderBottom: '2px solid var(--accent)', paddingBottom: 2 } : {}}>Admin</Link>}
            <CartIcon />
            {!user ? (
              <>
                <Link to="/login"><button className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}>Login</button></Link>
                <Link to="/register"><button className="btn btn-primary btn-sm" style={{ background: 'var(--accent)' }}>Register</button></Link>
              </>
            ) : (
              <>
                <Link to="/profile" className="nav-user" style={{ color: 'rgba(255,255,255,0.9)', textDecoration: 'none' }}>
                  Hi, {user.name.split(' ')[0]}
                </Link>
                <button className="btn btn-sm" onClick={handleLogout}
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile controls */}
          <div className="nav-mobile-controls" style={{ display: 'none', alignItems: 'center', gap: '1rem' }}>
            <CartIcon />
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', fontSize: '1.5rem', padding: '0.25rem', lineHeight: 1 }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          background: 'var(--primary)', borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
          position: 'sticky', top: 60, zIndex: 999,
        }}>
          <Link to="/events" onClick={closeMenu} style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Events</Link>
          {user && <Link to="/dashboard" onClick={closeMenu} style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>}
          {user && <Link to="/my-tickets" onClick={closeMenu} style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>My Tickets</Link>}
          {user?.role === 'admin' && <Link to="/admin" onClick={closeMenu} style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Admin Panel</Link>}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!user ? (
              <>
                <Link to="/login" onClick={closeMenu} className="btn btn-outline btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>Login</Link>
                <Link to="/register" onClick={closeMenu} className="btn btn-primary btn-sm" style={{ background: 'var(--accent)' }}>Register</Link>
              </>
            ) : (
              <>
                <Link to="/profile" onClick={closeMenu} style={{ color: 'rgba(255,255,255,0.85)', alignSelf: 'center', textDecoration: 'none' }}>
                  👤 {user.name}
                </Link>
                <button className="btn btn-sm" onClick={handleLogout}
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-controls { display: flex !important; }
        }
      `}</style>
    </>
  );
}
