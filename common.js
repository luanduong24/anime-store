/* =============================
   Anime Store – common.js (shared cart)
   ============================= */
(function(){
  'use strict';

  // ---- Helpers ----
  const fmt = new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' });
  const $  = (s,ctx=document)=>ctx.querySelector(s);
  const $$ = (s,ctx=document)=>Array.from(ctx.querySelectorAll(s));
  const esc = (s)=>String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // ---- DOM refs (đặt theo HTML bạn gửi) ----
  const openCartBtn  = $('#openCartBtn');
  const cartPopup    = $('#cartPopup');
  const cartContent  = cartPopup?.querySelector('.cart-content');
  const cartItemsEl  = $('#cartItems');
  const cartTotalEl  = $('#cartTotal');
  const cartCountEl  = $('#cartCount');

  // ---- State ----
  const CART_KEY = 'as_cart_v1';

  function readCart(){
    try{ return JSON.parse(localStorage.getItem(CART_KEY)||'[]'); }
    catch{ return []; }
  }
  function writeCart(items){
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    updateCartBadge(items);
  }
  function updateCartBadge(items=readCart()){
    const count = items.reduce((s,i)=>s+i.qty,0);
    if(cartCountEl) cartCountEl.textContent = String(count);
  }

  // ---- UI ----
  function cartItemRow(item){
    return `
      <div class="cart-item" data-id="${esc(item.id)}">
        <img src="${esc(item.img)}" alt="${esc(item.name)}">
        <div>
          <div class="title">${esc(item.name)}</div>
          <div class="price">${fmt.format(item.price)}</div>
        </div>
        <div class="cart-qty">
          <button class="qty-btn" data-act="dec" aria-label="Giảm">-</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-act="inc" aria-label="Tăng">+</button>
          <button class="remove-btn" data-act="rem" title="Xóa">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>`;
  }

  function updateCartUI(){
    if(!cartItemsEl) return;
    const items = readCart();
    if(items.length===0){
      cartItemsEl.innerHTML = '<p>Giỏ hàng trống.</p>';
      if(cartTotalEl) cartTotalEl.textContent = '';
      updateCartBadge(items);
      return;
    }
    cartItemsEl.innerHTML = items.map(cartItemRow).join('');
    const total = items.reduce((s,i)=>s + i.price*i.qty, 0);
    if(cartTotalEl) cartTotalEl.textContent = `Tổng cộng: ${fmt.format(total)}`;
    updateCartBadge(items);
  }

  // ---- Open/Close ----
  function toggleCart(show){
    if(!cartPopup) return;
    const willShow = (typeof show === 'boolean') ? show : !cartPopup.classList.contains('show');
    cartPopup.classList.toggle('show', willShow);
    cartPopup.style.display = willShow ? 'block' : 'none';
    cartPopup.setAttribute('aria-hidden', willShow ? 'false' : 'true');
    document.body.classList.toggle('modal-open', willShow);
    if(willShow){
      // focus an toàn
      setTimeout(()=> cartContent?.focus?.(), 0);
    }
  }

  // ---- Events ----
  openCartBtn?.addEventListener('click', ()=> toggleCart(true));
  cartPopup?.addEventListener('click', (e)=>{
    // Click ra ngoài nội dung để đóng
    if(e.target === cartPopup) toggleCart(false);
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && cartPopup?.classList.contains('show')) toggleCart(false);
  });

  // Item actions (inc/dec/remove)
  cartItemsEl?.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    const row = e.target.closest('.cart-item');
    const id  = row?.dataset.id;
    if(!id) return;

    const items = readCart();
    const idx = items.findIndex(i=>i.id===id);
    if(idx<0) return;

    const act = btn.dataset.act;
    if(act==='inc') items[idx].qty += 1;
    if(act==='dec') items[idx].qty = Math.max(1, items[idx].qty-1);
    if(act==='rem') items.splice(idx,1);

    writeCart(items);
    updateCartUI();
  });

  // ---- Public API: addToCart + auto bind .add-to-cart ----
  function buildId(name, img){
    return `${String(name||'').toLowerCase().trim()}|${img||''}`;
  }
  function addToCart(name, price, img){
    const items = readCart();
    const id = buildId(name, img);
    const found = items.find(i=>i.id===id);
    if(found){ found.qty += 1; }
    else { items.push({ id, name, price: Number(price||0), img: img||'', qty:1 }); }
    writeCart(items);
    updateCartUI();
    toggleCart(true);
  }
  window.addToCart = addToCart;
  window.toggleCart = toggleCart;

  // Delegation cho nút .add-to-cart (nếu có)
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.add-to-cart');
    if(!btn) return;
    // Hỗ trợ 2 dạng data:
    // 1) data-id data-name data-price data-img
    // 2) data-addtocart='{"id":"","name":"","price":0,"img":""}'
    let payload = null;
    const raw = btn.getAttribute('data-addtocart');
    if(raw){
      try{ payload = JSON.parse(raw); }catch{}
    }else{
      payload = {
        id:   btn.dataset.id || '',
        name: btn.dataset.name || '',
        price: Number(btn.dataset.price || 0),
        img:  btn.dataset.img || ''
      };
    }
    if(!payload || !payload.name) return;
    addToCart(payload.name, payload.price, payload.img);
  });

  // ---- Invoice printing (dựa theo markup bạn đã có) ----
  const invoiceTime  = $('#invoiceTime');
  const invoiceItems = $('#invoiceItems');
  const invoiceTotal = $('#invoiceTotal');
  const qrImage      = $('#qrImage');

  function printInvoice(){
    const items = readCart();
    if(items.length===0){ alert('Giỏ hàng đang trống.'); return; }
    const now = new Date();
    if(invoiceTime) invoiceTime.textContent = now.toLocaleString('vi-VN', {hour12:false});

    if(invoiceItems){
      invoiceItems.innerHTML = items.map((it,idx)=>{
        const line = it.price * it.qty;
        return `<tr>
          <td style="border:1px solid #ccc;padding:8px;text-align:center;">${idx+1}</td>
          <td style="border:1px solid #ccc;padding:8px;text-align:left;">${esc(it.name)}</td>
          <td style="border:1px solid #ccc;padding:8px;text-align:right;">${fmt.format(it.price)}</td>
          <td style="border:1px solid #ccc;padding:8px;text-align:center;">${it.qty}</td>
          <td style="border:1px solid #ccc;padding:8px;text-align:right;">${fmt.format(line)}</td>
        </tr>`;
      }).join('');
    }
    const total = items.reduce((s,i)=>s + i.price*i.qty, 0);
    if(invoiceTotal) invoiceTotal.textContent = `Tổng thanh toán: ${fmt.format(total)}`;
    if(qrImage && !qrImage.src) qrImage.src = 'qr-bidv.png';

    const html = $('#invoiceContent')?.outerHTML || '<h2>Hóa đơn</h2>';
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Hóa đơn</title></head><body>${html}<script>window.onload=()=>{window.print(); setTimeout(()=>window.close(), 200)};<\/script></body></html>`);
    w.document.close();
  }
  window.printInvoice = printInvoice;

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', ()=>{
    // Gắn role/aria cho popup nếu thiếu
    if(cartPopup){
      cartPopup.setAttribute('role','dialog');
      cartPopup.setAttribute('aria-modal','true');
      cartPopup.setAttribute('aria-hidden','true');
    }
    updateCartBadge();
    updateCartUI();
  });
})();
