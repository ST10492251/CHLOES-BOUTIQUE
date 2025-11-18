
/* js/script.js
   Unified script: nav, products -> cart, cart page, lightbox, forms
*/
(() => {
  'use strict';

  const CART_KEY = 'chloes_boutique_cart_v2';
  const SHIPPING = 30; // R30 flat shipping

  /* Helpers */
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from((ctx || document).querySelectorAll(s));
  const fmtR = n => `R${Number(n).toFixed(2)}`;

  function loadCart(){ try{ const r=localStorage.getItem(CART_KEY); return r?JSON.parse(r):[] }catch(e){console.warn(e);return[]}}
  function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)) }
  function findItem(c,id){ return c.find(x=>String(x.id)===String(id)) }
  function totals(c){
    const subtotal = c.reduce((s,i)=>s + (Number(i.price)*i.qty),0);
    const shipping = subtotal>0?SHIPPING:0;
    return {subtotal,shipping,total:subtotal+shipping};
  }

  /* Update cart badge */
  function updateBadge(){
    const badges = $$('.cart-badge');
    const cart = loadCart();
    const count = cart.reduce((s,i)=>s+i.qty,0);
    badges.forEach(b=>b.textContent = count>0?String(count):'');
  }

  /* Add to cart */
  function addToCart(item){
    const cart = loadCart();
    const existing = findItem(cart,item.id);
    if(existing) existing.qty += 1;
    else cart.push({id:String(item.id),name:item.name,price: Number(item.price),image:item.image||'',qty:1});
    saveCart(cart);
    updateBadge();
    // small toast
    const t = document.createElement('div'); t.textContent='Added to cart'; t.style.cssText='position:fixed;right:20px;bottom:20px;background:var(--pink-2);color:#fff;padding:0.6rem 0.9rem;border-radius:8px;z-index:9999';
    document.body.appendChild(t); setTimeout(()=>t.remove(),900);
  }

  /* Init product page (buttons) */
  function initProducts(){
    $$('.add-to-cart').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.preventDefault();
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const price = btn.dataset.price;
        const image = btn.dataset.image || btn.closest('.product-card')?.querySelector('img')?.src || '';
        addToCart({id,name,price,image});
      });
    });
  }

  /* Render cart on cart.html */
  function initCartPage(){
    const container = $('#cartItems');
    const totalBox = $('#cartTotal');
    const checkout = $('#checkoutBtn');
    const clear = $('#clearCartBtn');
    if(!container) return;

    function render(){
      const cart = loadCart();
      container.innerHTML = '';
      if(!cart.length){
        container.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
        totalBox.innerHTML = fmtR(0);
        return;
      }
      const table = document.createElement('table'); table.className='cart-table';
      table.innerHTML = `<thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>`;
      const tbody = document.createElement('tbody');

      cart.forEach((it,idx)=>{
        const tr = document.createElement('tr');
        const subtotal = (Number(it.price)*it.qty).toFixed(2);
        tr.innerHTML = `
          <td><div style="display:flex;align-items:center;gap:0.6rem"><img src="${it.image}" alt="${it.name}" class="cart-thumb"><div>${it.name}</div></div></td>
          <td>${fmtR(Number(it.price))}</td>
          <td><input type="number" min="1" value="${it.qty}" data-idx="${idx}" class="qty-input"></td>
          <td>${fmtR(Number(subtotal))}</td>
          <td><button class="remove-btn" data-idx="${idx}">Remove</button></td>
        `;
        tbody.appendChild(tr);
      });

      table.appendChild(tbody); container.appendChild(table);

      const t = totals(cart);
      totalBox.innerHTML = `
        <div>Subtotal: <strong>${fmtR(t.subtotal)}</strong></div>
        <div>Shipping: <strong>${fmtR(t.shipping)}</strong></div>
        <div class="total">Total: <strong>${fmtR(t.total)}</strong></div>
      `;

      // handlers
      $$('.qty-input', tbody).forEach(inp=>{
        inp.addEventListener('change', e=>{
          const idx = Number(e.target.dataset.idx); let v = parseInt(e.target.value,10); if(isNaN(v)||v<1){v=1; e.target.value=1}
          const cart = loadCart(); cart[idx].qty = v; saveCart(cart); render(); updateBadge();
        });
      });
      $$('.remove-btn', tbody).forEach(b=>{
        b.addEventListener('click', e=>{
          const idx = Number(e.currentTarget.dataset.idx);
          const cart = loadCart(); cart.splice(idx,1); saveCart(cart); render(); updateBadge();
        });
      });
    }

    render();

    if(checkout) checkout.addEventListener('click', e=>{
      e.preventDefault();
      const cart = loadCart();
      if(!cart.length){alert('Your cart is empty'); return;}
      checkout.textContent='Processing...'; checkout.disabled=true;
      setTimeout(()=>{ alert('Order placed (simulated). Thank you!'); saveCart([]); render(); updateBadge(); checkout.textContent='Checkout'; checkout.disabled=false; },1000);
    });

    if(clear) clear.addEventListener('click', e=>{
      e.preventDefault(); if(!confirm('Clear cart?')) return; saveCart([]); render(); updateBadge();
    });

    /* Keep in sync if other tabs update cart */
    window.addEventListener('storage', e=>{
      if(e.key===CART_KEY) render();
    });
  }

  /* Lightbox */
  function initLightbox(){
    const items = $$('.gallery-item');
    if(!items.length) return;
    const lb = document.createElement('div'); lb.id='galleryLightbox'; lb.innerHTML=`<button class="close-btn" aria-label="Close">&times;</button><img alt="">`; document.body.appendChild(lb);
    const img = lb.querySelector('img'); const close = lb.querySelector('.close-btn');
    items.forEach(it=>it.addEventListener('click', ()=>{
      const src = it.dataset.large || it.querySelector('img')?.src; img.src=src; lb.classList.add('open'); lb.style.display='flex'; document.body.style.overflow='hidden';
    }));
    close.addEventListener('click', ()=>{ lb.classList.remove('open'); lb.style.display='none'; document.body.style.overflow=''; });
    lb.addEventListener('click', e=>{ if(e.target===lb) { lb.classList.remove('open'); lb.style.display='none'; document.body.style.overflow=''; } });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ lb.classList.remove('open'); lb.style.display='none'; document.body.style.overflow=''; } });
  }

  /* Contact form */
  function initContact(){
    const form = $('#contactForm'); if(!form) return;
    form.addEventListener('submit', e=>{ e.preventDefault();
      const name = form.querySelector('input[name="name"]'), email = form.querySelector('input[name="email"]'), msg = form.querySelector('textarea[name="message"]');
      if(!name.value.trim()){ alert('Enter your name'); name.focus(); return;}
      if(!/\S+@\S+\.\S+/.test(email.value)){ alert('Enter valid email'); email.focus(); return;}
      if(!msg.value.trim()){ alert('Enter a message'); msg.focus(); return;}
      alert('Message sent (simulated). Thank you!'); form.reset();
    });
  }

  /* Nav toggle */
  function initNav(){
    const t = document.querySelector('.nav-toggle'), nav = document.querySelector('.nav');
    if(!t) return;
    t.addEventListener('click', ()=> nav.classList.toggle('open'));
  }

  /* Init on DOM ready */
  document.addEventListener('DOMContentLoaded', ()=>{
    updateBadge();
    initNav();
    initProducts();
    initCartPage();
    initLightbox();
    initContact();
    const yr = document.getElementById('year'); if(yr) yr.textContent = new Date().getFullYear();
  });

  /* Expose for debugging */
  window.Chloes = { loadCart, saveCart, addToCart, totals };
})();
