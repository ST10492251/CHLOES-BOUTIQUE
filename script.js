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
      const btn = card.querySelector('.add-to-cart');
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = card.dataset.id || btn.dataset.id;
        const name = card.dataset.name || card.querySelector('.product-name')?.textContent?.trim() || 'Product';
        const price = Number(card.dataset.price || btn.dataset.price || card.querySelector('.product-price')?.textContent?.replace(/[^\d.]/g,'') || 0);
        const image = card.dataset.image || card.querySelector('img')?.src || '';
        addToCart({ id, name, price, image });

        // small UX: button feedback
        const orig = btn.textContent;
        btn.textContent = 'Added ✓';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 900);
      });
    });
  }

  /* -------------------- Cart page: render & interactions -------------------- */
  function renderCartPage() {
    const cartContainer = $('#cartItems');
    const cartTotalEl = $('#cartTotal');
    const checkoutBtn = $('#checkoutBtn');
    const clearBtn = $('#clearCartBtn');
    if (!cartContainer) return;

    function render() {
      const cart = loadCart();
      cartContainer.innerHTML = '';
      if (!cart.length) {
        cartContainer.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
        if (cartTotalEl) cartTotalEl.innerHTML = `<div class="totals-row">Total: <strong>R0.00</strong></div>`;
        return;
      }

      const table = document.createElement('table');
      table.className = 'cart-table';
      table.innerHTML = `<thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>`;
      const tbody = document.createElement('tbody');

      cart.forEach(item => {
        const price = Number(item.price);
        const subtotal = (price * item.qty).toFixed(2);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="prod-cell">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="cart-thumb">
            <div class="prod-meta"><div class="prod-name">${escapeHtml(item.name)}</div></div>
          </td>
          <td>${fmtR(price.toFixed(2))}</td>
          <td><input type="number" min="1" value="${item.qty}" data-id="${escapeHtml(item.id)}" class="qty-input"></td>
          <td>${fmtR(subtotal)}</td>
          <td><button class="remove-btn" data-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">Remove</button></td>
        `;
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      cartContainer.appendChild(table);

      const totals = getCartTotals(cart);
      if (cartTotalEl) {
        cartTotalEl.innerHTML = `
          <div class="totals-row">Subtotal: <strong>${fmtR(totals.subtotal)}</strong></div>
          <div class="totals-row">Shipping: <strong>${fmtR(totals.shipping)}</strong></div>
          <div class="totals-row total">Total: <strong>${fmtR(totals.total)}</strong></div>
        `;
      }

      // attach qty change handlers
      $$('.qty-input', table).forEach(input => {
        input.addEventListener('change', (ev) => {
          const id = ev.target.dataset.id;
          let newQty = parseInt(ev.target.value, 10);
          if (Number.isNaN(newQty) || newQty < 1) {
            newQty = 1;
            ev.target.value = 1;
          }
          setQty(id, newQty);
          render();
        });
      });

      $$('.remove-btn', table).forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const id = ev.currentTarget.dataset.id;
          removeFromCart(id);
          render();
        });
      });
    }

    render();

    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const cart = loadCart();
        if (!cart.length) { alert('Your cart is empty.'); return; }
        // Simulated checkout — replace with real payment flow
        checkoutBtn.disabled = true;
        checkoutBtn.textContent = 'Processing...';
        setTimeout(() => {
          alert('Thank you! Order placed (simulated).');
          clearCart();
          render();
          checkoutBtn.disabled = false;
          checkoutBtn.textContent = 'Checkout';
        }, 1200);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!confirm('Clear your cart?')) return;
        clearCart();
        render();
      });
    }

    // keep UI in sync when cart updates elsewhere
    document.addEventListener('cart-updated', render);
  }

  /* -------------------- Lightbox gallery -------------------- */
  function initLightbox() {
    const items = $$('.gallery-item');
    if (!items.length) return;
    // build lightbox once
    const lb = document.createElement('div');
    lb.id = 'galleryLightbox';
    lb.className = 'cb-lightbox';
    lb.innerHTML = `
      <div class="cb-lb-screen" role="dialog" aria-modal="true" aria-hidden="true" tabindex="-1">
        <button class="cb-lb-close" aria-label="Close">&times;</button>
        <img class="cb-lb-img" alt="">
        <div class="cb-lb-caption" aria-hidden="false"></div>
      </div>`;
    document.body.appendChild(lb);

    const screen = $('.cb-lb-screen', lb);
    const img = $('.cb-lb-img', lb);
    const closeBtn = $('.cb-lb-close', lb);
    const caption = $('.cb-lb-caption', lb);

    const open = (src, alt = '') => {
      img.src = src;
      img.alt = alt;
      caption.textContent = alt;
      screen.setAttribute('aria-hidden', 'false');
      lb.classList.add('open');
      document.documentElement.style.overflow = 'hidden';
      screen.focus();
    };
    const close = () => {
      lb.classList.remove('open');
      screen.setAttribute('aria-hidden', 'true');
      img.src = '';
      document.documentElement.style.overflow = '';
    };

    items.forEach(it => {
      it.addEventListener('click', () => {
        const large = it.dataset.large || it.querySelector('img')?.src;
        const alt = it.querySelector('img')?.alt || '';
        open(large, alt);
      });
      it.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const large = it.dataset.large || it.querySelector('img')?.src;
          const alt = it.querySelector('img')?.alt || '';
          open(large, alt);
        }
      });
    });

    closeBtn.addEventListener('click', close);
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
  }

  /* -------------------- Contact form validation -------------------- */
  function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('input[type="text"]');
      const email = form.querySelector('input[type="email"]');
      const msg = form.querySelector('textarea');

      if (!name.value.trim()) { alert('Please enter your name.'); name.focus(); return; }
      if (!/\S+@\S+\.\S+/.test(email.value)) { alert('Please enter a valid email.'); email.focus(); return; }
      if (!msg.value.trim()) { alert('Please enter a message.'); msg.focus(); return; }

      // simulated send
      alert('Thanks — your message was sent (simulated).');
      form.reset();
    });
  }

  /* -------------------- Navigation toggle (mobile) -------------------- */
  function initNavToggle() {
    const toggle = document.querySelector('.nav-toggle') || $('#menu-toggle');
    const primary = document.getElementById('primary-nav') || document.querySelector('.nav');
    if (!toggle || !primary) return;
    toggle.addEventListener('click', () => {
      primary.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(primary.classList.contains('open')));
    });
  }

  /* -------------------- Initialization -------------------- */
  function initAll() {
    updateCartBadge();
    initNavToggle();
    initProductsPage();
    renderCartPage();
    initLightbox();
    initContactForm();

    // set footer year
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // immediately update other listeners
    document.addEventListener('cart-updated', () => {
      // optional accessible live region
      const live = $('#cartA11yLive');
      if (live) live.textContent = `Cart updated. ${loadCart().reduce((s,i)=>s+i.qty,0)} items.`;
    });
  }

  // DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  /* expose some functions for console/testing (optional) */
  window.ChloesCart = {
    loadCart,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
    getCartTotals
  };

})();
