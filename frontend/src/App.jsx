import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyTicketsPage from './pages/MyTicketsPage';
import ProfilePage from './pages/ProfilePage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminEventForm from './pages/admin/AdminEventForm';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBookings from './pages/admin/AdminBookings';
import AdminCategories from './pages/admin/AdminCategories';
import AdminVenues from './pages/admin/AdminVenues';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NotificationProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/my-tickets" element={<MyTicketsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/events" element={<AdminEvents />} />
              <Route path="/admin/events/new" element={<AdminEventForm />} />
              <Route path="/admin/events/:id/edit" element={<AdminEventForm />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/venues" element={<AdminVenues />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </CartProvider>
    </AuthProvider>
  );
}
