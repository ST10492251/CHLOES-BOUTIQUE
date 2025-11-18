
/* js/script.js
   Chloe's Boutique — unified, production-ready script
   Features: persistent cart, add-to-cart, cart page, nav, lightbox, contact validation
*/

(() => {
  'use strict';

  /* -------------------- Configuration -------------------- */
  const CART_KEY = 'chloes_boutique_cart_v1';
  const SHIPPING_CENTS = 3000; // flat R30 (3000 cents) when subtotal > 0

  /* -------------------- Small helpers -------------------- */
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from((ctx || document).querySelectorAll(s));
  const toCents = (n) => Math.round(Number(n) * 100);
  const fromCents = (c) => (c / 100).toFixed(2);
  const fmtR = (n) => `R${Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  /* -------------------- Cart (persistent) -------------------- */
  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('loadCart error', e);
      return [];
    }
  }
  function saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('saveCart error', e);
    }
  }
  function broadcastCartUpdate() {
    updateCartBadge();
    document.dispatchEvent(new CustomEvent('cart-updated', { detail: loadCart() }));
  }
  function findItem(cart, id) {
    return cart.find(i => String(i.id) === String(id));
  }
  function getCartTotals(cart) {
    const subtotalCents = cart.reduce((acc, it) => acc + toCents(it.price) * it.qty, 0);
    const shippingCents = subtotalCents > 0 ? SHIPPING_CENTS : 0;
    return {
      subtotal: fromCents(subtotalCents),
      shipping: fromCents(shippingCents),
      total: fromCents(subtotalCents + shippingCents)
    };
  }

  /* -------------------- Public cart API -------------------- */
  function addToCart(item) {
    // item: { id, name, price (number or numeric string), image }
    const cart = loadCart();
    const existing = findItem(cart, item.id);
    if (existing) existing.qty += 1;
    else cart.push({ id: String(item.id), name: item.name, price: Number(item.price), image: item.image || '', qty: 1 });
    saveCart(cart);
    broadcastCartUpdate();
  }
  function setQty(id, qty) {
    const cart = loadCart();
    const it = findItem(cart, id);
    if (!it) return;
    it.qty = Math.max(0, Math.floor(qty));
    if (it.qty === 0) {
      const idx = cart.findIndex(x => String(x.id) === String(id));
      if (idx >= 0) cart.splice(idx, 1);
    }
    saveCart(cart);
    broadcastCartUpdate();
  }
  function removeFromCart(id) {
    const cart = loadCart().filter(x => String(x.id) !== String(id));
    saveCart(cart);
    broadcastCartUpdate();
  }
  function clearCart() {
    saveCart([]);
    broadcastCartUpdate();
  }

  /* -------------------- UI: cart badge -------------------- */
  function updateCartBadge() {
    const badgeEls = document.querySelectorAll('.cart-badge');
    const cart = loadCart();
    const count = cart.reduce((s, it) => s + (it.qty || 0), 0);
    badgeEls.forEach(b => { b.textContent = count > 0 ? String(count) : ''; });
  }

  /* -------------------- Products page: add-to-cart handlers -------------------- */
  function initProductsPage() {
    const productCards = $$('.product-card');
    if (!productCards.length) return;
    productCards.forEach(card => {
      const btn =
