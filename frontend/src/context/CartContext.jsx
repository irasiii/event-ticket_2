import { createContext, useContext, useState, useCallback } from 'react';

/**
 * CartContext — inspired by the Figma Make CartContext pattern.
 * Allows users to add tickets from multiple events before checking out.
 */
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  // Add or increment a ticket tier in the cart
  const addToCart = useCallback((event, tier, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.tierId === tier._id);
      if (existing) {
        return prev.map(i =>
          i.tierId === tier._id
            ? { ...i, quantity: Math.min(i.quantity + quantity, tier.quantity - tier.sold) }
            : i
        );
      }
      return [...prev, {
        tierId:    tier._id,
        tierName:  tier.name,
        price:     tier.price,
        eventId:   event._id,
        eventTitle: event.title,
        eventDate:  event.date,
        venueName:  event.venue?.name || event.venue,
        maxQty:    tier.quantity - tier.sold,
        quantity,
      }];
    });
  }, []);

  const updateQuantity = useCallback((tierId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(tierId);
      return;
    }
    setItems(prev =>
      prev.map(i => i.tierId === tierId ? { ...i, quantity: Math.min(quantity, i.maxQty) } : i)
    );
  }, []);

  const removeFromCart = useCallback((tierId) => {
    setItems(prev => prev.filter(i => i.tierId !== tierId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  // Group cart items by event for display
  const itemsByEvent = items.reduce((acc, item) => {
    if (!acc[item.eventId]) {
      acc[item.eventId] = { eventId: item.eventId, eventTitle: item.eventTitle, eventDate: item.eventDate, venueName: item.venueName, tiers: [] };
    }
    acc[item.eventId].tiers.push(item);
    return acc;
  }, {});

  return (
    <CartContext.Provider value={{ items, itemsByEvent, totalItems, totalPrice, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
