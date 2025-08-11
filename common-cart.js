/* =========================================================================
   Anime Store – common-cart.js
   - Cart state (localStorage) + auth-gated actions
   - Popup giỏ: danh sách + tổng tiền + Tiếp tục mua / Xóa giỏ / In HĐ / Thanh toán
   - EmailJS + PDF VAT + QR (hook trên trang checkout.html)
   - Tương thích dữ liệu cũ (as_cart_v2 + quantity) & mới (cartItems + qty)
   ========================================================================= */

(() => {
  'use strict';

  /* =======================
     0) CONFIG
     ======================= */
  // ---- EmailJS (điền key thật của bạn) ----
  const EMAILJS_PUBLIC_KEY  = 'UVhn08ijBoENsIFVc';
  const EMAILJS_SERVICE_ID  = 'AnimeStore';
  const EMAILJS_TEMPLATE_ID = 'template_lveil5d';

  // ---- Shop / Phát hành hóa đơn ----
  const COMPANY = {
    name:   'Anime Store',
    taxId:  '0312345678',
    address:'123 Anime Street, Q.1, TP.HCM',
    phone:  '0939 999 888',
    email:  'support@animestore.vn',
    website:'https://animestore.vn',
    logoUrl:'' // có logo thì điền URL (CORS bật)
  };

  // ---- VAT ----
  const VAT = { rate: 0.10, label: 'VAT 10%', applyOn: 'subtotal' };

  // ---- Keys localStorage ----
  const CART_KEY_NEW = 'cartItems';
  const CART_KEY_OLD = 'as_cart_v2';
  const DISCOUNT_KEY = 'cartDiscount';

  // ---- Phí ship (tuỳ chỉnh) ----
  const calcShipping = (subtotal) => (subtotal > 1_000_000 ? 0 : 30_000);

  /* =======================
     1) UTILS & AUTH BRIDGE
     ======================= */
  const $  = (s) => document.querySelector(s);
  const $id= (id)=> document.getElementById(id);
  const fmtVND = (n) => Number(n||0).toLocaleString('vi-VN', {style:'currency', currency:'VND'});
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // Hỗ trợ cả common-auth.js (window.Auth) hoặc API khác
  const AuthBridge = {
    isLoggedIn() {
      if (window.AuthAPI?.getUser) return !!window.AuthAPI.getUser();
      if (window.Auth?.getCurrent) return !!window.Auth.getCurrent();
      // fallback: không có hệ thống đăng nhập → cho phép thao tác
      return true;
    },
    requireLogin(cb) {
      if (this.isLoggedIn()) return cb?.();
      if (window.AuthAPI?.requireLogin) return window.AuthAPI.requireLogin();
      if (window.Auth?.require) return window.Auth.require(cb);
      // không có auth → cứ chạy
      cb?.();
    }
  };
  const requireAuth = (fn) => AuthBridge.requireLogin(fn);

  /* =======================
     2) CART STORAGE + MIGRATE
     ======================= */
  function normalizeItem(raw){
    return {
      id:    raw.id || raw.sku || `${raw.title || raw.name || 'SP'}|${raw.image || ''}`,
      title: raw.title || raw.name || 'Sản phẩm',
      price: Number(raw.price || 0),
      image: raw.image || raw.img || '',
      qty:   Number(raw.qty ?? raw.quantity ?? 1)
    };
  }

  // migrate từ key cũ
  (function migrate(){
    const oldRaw = localStorage.getItem(CART_KEY_OLD);
    const newRaw = localStorage.getItem(CART_KEY_NEW);
    if (!oldRaw || newRaw) return;
    try {
      const oldItems = JSON.parse(oldRaw || '[]');
      const normalized = (oldItems||[]).map(normalizeItem);
      localStorage.setItem(CART_KEY_NEW, JSON.stringify(normalized));
      localStorage.removeItem(CART_KEY_OLD);
    } catch {}
  })();

  function readCart(){
    try { return (JSON.parse(localStorage.getItem(CART_KEY_NEW) || '[]')||[]).map(normalizeItem); }
    catch { return []; }
  }
  function writeCart(items){
    localStorage.setItem(CART_KEY_NEW, JSON.stringify((items||[]).map(normalizeItem)));
    updateCartCount();
  }
  function clearCart(){
    localStorage.removeItem(CART_KEY_NEW);
    updateCartCount();
  }

  const setDiscountVND = (v)=> localStorage.setItem(DISCOUNT_KEY, String(Number(v||0)));
  const getDiscountVND = ()=> Number(localStorage.getItem(DISCOUNT_KEY) || 0);

  function calcTotals(items){
    const subtotal = (items||[]).reduce((s,it)=> s + Number(it.price||0)*Number(it.qty||0), 0);
    const shipping = calcShipping(subtotal);
    const discount = getDiscountVND();
    const total    = Math.max(0, subtotal - discount + shipping); // chưa VAT
    return { subtotal, shipping, discount, total };
  }

  function updateCartCount(){
    const el = $id('cartCount');
    if (!el) return 0;
    const count = readCart().reduce((s,it)=> s + Number(it.qty||0), 0);
    el.textContent = String(count);
    return count;
  }
  window.addEventListener('storage', (e)=> {
    if (e.key === CART_KEY_NEW || e.key === DISCOUNT_KEY) updateCartCount();
  });
  document.addEventListener('DOMContentLoaded', updateCartCount);

  /* =======================
     3) CART POPUP UI
     ======================= */
  function ensureCartPopup(){
    // gỡ bản cũ (nếu HTML có)
    const old = document.getElementById('cartPopup');
    if (old) old.remove();

    const wrap = document.createElement('div');
    wrap.id = 'cartPopup';
    wrap.className = 'cart-popup';
    wrap.style.display = 'none';
    wrap.innerHTML = `
      <div class="cart-content">
        <button class="close-cart" aria-label="Đóng">&times;</button>
        <h2>Giỏ Hàng Của Bạn</h2>
        <div id="cartItems"></div>

        <div id="cartSummary" class="cart-summary" style="margin-top:10px">
          <div class="sum-row"><span>Tạm tính</span> <strong id="sumSubtotal">0₫</strong></div>
          <div class="sum-row"><span>Giảm giá</span> <strong id="sumDiscount">0₫</strong></div>
          <div class="sum-row"><span>Phí vận chuyển</span> <strong id="sumShipping">0₫</strong></div>
          <div class="sum-row total" style="margin-top:6px"><span>Tổng cộng</span> <strong id="sumTotal">0₫</strong></div>

          <div class="cart-links" style="display:flex;gap:12px;margin-top:10px;">
            <a href="#" id="continueShopping" class="link">Tiếp tục mua</a>
            <button id="clearCartBtn" class="link" style="color:#ff9aa2">Xóa giỏ</button>
          </div>

          <div class="cart-cta" style="display:flex;gap:10px;margin-top:10px;">
            <button class="btn-outline" id="invoiceBtn">In Hóa Đơn</button>
            <a id="goCheckout" class="btn-buy" href="checkout.html">Thanh toán</a>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    // Popup in hoá đơn (dùng cho nút In Hóa Đơn)
    if (!document.getElementById('invoicePopup')) {
      const inv = document.createElement('div');
      inv.id = 'invoicePopup';
      inv.style.display = 'none';
      inv.innerHTML = `
        <div id="invoiceContent" style="width:700px;margin:0 auto;font-family:Arial;padding:20px;text-align:center;">
          <h2 style="margin-bottom:5px;">🧾 HÓA ĐƠN BÁN HÀNG</h2>
          <p style="margin:0;">Anime Store - Mô hình Anime cực chất</p>
          <small>Hotline: ${esc(COMPANY.phone)} | Email: ${esc(COMPANY.email)}</small>
          <hr style="margin:20px 0;">
          <p><strong>Thời gian:</strong> <span id="invoiceTime"></span></p>
          <table style="width:100%;border-collapse:collapse;margin:20px auto;">
            <thead>
              <tr style="background:#f2f2f2;">
                <th style="border:1px solid #ccc;padding:8px;">STT</th>
                <th style="border:1px solid #ccc;padding:8px;">Tên sản phẩm</th>
                <th style="border:1px solid #ccc;padding:8px;">Đơn giá</th>
                <th style="border:1px solid #ccc;padding:8px;">Số lượng</th>
                <th style="border:1px solid #ccc;padding:8px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody id="invoiceItems"></tbody>
          </table>
          <h3 style="margin-top:20px;" id="invoiceTotal"></h3>
          <div style="margin-top:30px;">
            <p><strong>💳 Quét mã QR để thanh toán:</strong></p>
            <img id="qrImage" alt="QR thanh toán" style="width:220px;margin:10px auto;"/>
            <p><small>${esc(COMPANY.name)} • ${esc(COMPANY.address)}</small></p>
          </div>
          <p style="font-size:13px;margin-top:30px;">Cảm ơn bạn đã mua hàng tại <strong>${esc(COMPANY.name)}</strong>!</p>
        </div>`;
      document.body.appendChild(inv);
    }
  }

  function renderCart(){
    const box = document.getElementById('cartItems');
    const sSub = document.getElementById('sumSubtotal');
    const sDis = document.getElementById('sumDiscount');
    const sShip= document.getElementById('sumShipping');
    const sTot = document.getElementById('sumTotal');
    if (!box) return;

    const items = readCart();
    if (!items.length){
      box.innerHTML = `<p>Giỏ hàng trống.</p>`;
      if (sSub) sSub.textContent = fmtVND(0);
      if (sDis) sDis.textContent = fmtVND(getDiscountVND());
      if (sShip) sShip.textContent= fmtVND(0);
      if (sTot) sTot.textContent  = fmtVND(0);
      updateCartCount();
      return;
    }

    let subtotal = 0;
    box.innerHTML = items.map((it, idx) => {
      const line = Number(it.price||0) * Number(it.qty||0);
      subtotal += line;
      return `
        <div class="cart-item" data-idx="${idx}">
          ${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.title)}">`
                     : `<div style="width:64px;height:64px;border-radius:8px;background:#1c2239"></div>`}
          <div>
            <div style="font-weight:700">${esc(it.title)}</div>
            <div style="color:#9fb1d6">${fmtVND(it.price)}</div>
          </div>
          <div class="cart-qty">
            <button class="qty-btn" data-act="dec" aria-label="Giảm">−</button>
            <span>${it.qty}</span>
            <button class="qty-btn" data-act="inc" aria-label="Tăng">+</button>
            <button class="remove-btn" data-act="rem" title="Xóa" aria-label="Xóa">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    const discount = getDiscountVND();
    const shipping = calcShipping(subtotal);
    const total    = Math.max(0, subtotal - discount + shipping);

    if (sSub) sSub.textContent = fmtVND(subtotal);
    if (sDis) sDis.textContent = `-${fmtVND(discount)}`;
    if (sShip)sShip.textContent= fmtVND(shipping);
    if (sTot) sTot.textContent = fmtVND(total);

    updateCartCount();
  }

  function toggleCart(show){
    const popup = document.getElementById('cartPopup');
    if (!popup) return;
    popup.style.display = show ? 'block' : 'none';
    popup.setAttribute('aria-hidden', show ? 'false' : 'true');
    document.documentElement.classList.toggle('cart-open', !!show);
    if (show) renderCart();
  }

  // mini toast
  function toast(msg){
    try{
      const t = document.createElement('div');
      t.className = 'toast';
      t.textContent = msg;
      t.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#111629;color:#fff;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.08);z-index:4000';
      document.body.appendChild(t);
      setTimeout(()=>t.remove(), 2200);
    }catch{}
  }

  /* =======================
     4) CART ACTIONS
     ======================= */
  // addToCart('name', price, 'img') OR addToCart({title, price, image, qty, id})
  function addToCart(){
    requireAuth(() => {
      let title, price, image = '', qty = 1, id = '';
      if (typeof arguments[0] === 'object'){
        const p = arguments[0] || {};
        title = p.title || p.name || 'Sản phẩm';
        price = Number(p.price || 0);
        image = p.image || p.img || '';
        qty   = Number(p.qty ?? p.quantity ?? 1);
        id    = p.id || p.sku || `${title}|${image}`;
      } else {
        title = arguments[0];
        price = Number(arguments[1] || 0);
        image = arguments[2] || '';
        id    = `${title}|${image}`;
      }

      ensureCartPopup();

      const items = readCart();
      const found = items.find(it => it.id === id);
      if (found) found.qty += qty;
      else items.push(normalizeItem({ id, title, price, image, qty }));

      writeCart(items);
      renderCart();
      requestAnimationFrame(() => toggleCart(true));
      toast(`Đã thêm "${title}" vào giỏ!`);
    });
  }
  function changeQty(index, delta){
    const items = readCart();
    if (!items[index]) return;
    items[index].qty = Math.max(1, Number(items[index].qty||1) + delta);
    writeCart(items);
    renderCart();
  }
  function removeItem(index){
    const items = readCart();
    if (!items[index]) return;
    items.splice(index, 1);
    writeCart(items);
    renderCart();
  }

  function printInvoice(){
    const items = readCart();
    if (!items.length) { alert('Giỏ hàng trống.'); return; }

    const tbody = $id('invoiceItems');
    const totalEl = $id('invoiceTotal');
    const timeEl = $id('invoiceTime');
    const qrEl = $id('qrImage');
    if (!tbody || !totalEl || !timeEl) return;

    tbody.innerHTML = '';
    let total = 0;
    items.forEach((it, i) => {
      const line = Number(it.price||0) * Number(it.qty||0);
      total += line;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="border:1px solid #ccc;padding:8px;text-align:center;">${i+1}</td>
        <td style="border:1px solid #ccc;padding:8px;">${esc(it.title)}</td>
        <td style="border:1px solid #ccc;padding:8px;text-align:right;">${fmtVND(it.price)}</td>
        <td style="border:1px solid #ccc;padding:8px;text-align:center;">${it.qty}</td>
        <td style="border:1px solid #ccc;padding:8px;text-align:right;">${fmtVND(line)}</td>`;
      tbody.appendChild(tr);
    });

    totalEl.textContent = `Tổng cộng: ${fmtVND(total)}`;
    timeEl.textContent  = new Date().toLocaleString('vi-VN', { hour12:false });

    if (qrEl) {
      const url = `https://img.vietqr.io/image/BIDV-8813126063-compact2.png?amount=${total}&addInfo=AnimeStore%20Invoice`;
      qrEl.src = url;
    }

    const html = $id('invoiceContent')?.outerHTML || '';
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Hóa đơn</title>
      <style>body{font-family:Arial;text-align:center}</style>
      </head><body>${html}
      <script>window.onload=()=>{window.print(); setTimeout(()=>window.close(), 300)};<\/script>
      </body></html>`);
    w.document.close();
  }

  /* =======================
     5) EmailJS + PDF VAT + QR (dùng ở checkout.html)
     ======================= */
  function genOrderId(){
    const d = new Date();
    const ymd = [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('');
    const rand= Math.random().toString(16).slice(2,7).toUpperCase();
    return `AS-${ymd}-${rand}`;
  }

  async function loadImageAsBase64(url){
    if (!url) return null;
    try{
      const res = await fetch(url, { mode: 'cors' });
      const blob= await res.blob();
      const dataUrl = await new Promise((resolve,reject)=>{
        const r = new FileReader();
        r.onload  = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      return String(dataUrl).split(',')[1];
    } catch { return null; }
  }
  async function makePaymentQRBase64(payload, size=180){
    if (!payload || !window.QRCode) return null;
    const dataUrl = await window.QRCode.toDataURL(payload, { width:size, margin:1 });
    return String(dataUrl).split(',')[1];
  }

  function buildOrderTableHTML(items){
    const rows = (items||[]).map(it => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          <div style="font-weight:600;color:#0F172A">${esc(it.title)}</div>
          <div style="font-size:12px;color:#64748B">Mã: ${esc(it.id)}</div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${it.qty}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmtVND(it.price)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmtVND(Number(it.price)*Number(it.qty))}</td>
      </tr>`).join('');
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #E5E7EB;">
        <thead>
          <tr style="background:#F8FAFC;">
            <th align="left"  style="padding:10px;font-size:12px;color:#334155;">Sản phẩm</th>
            <th align="center"style="padding:10px;font-size:12px;color:#334155;">SL</th>
            <th align="right" style="padding:10px;font-size:12px;color:#334155;">Đơn giá</th>
            <th align="right" style="padding:10px;font-size:12px;color:#334155;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  async function buildInvoicePDFBase64_VAT({ orderId, customer, items, totals, meta }) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) throw new Error('Thiếu jsPDF. Thêm script jsPDF vào HTML.');

    const doc = new jsPDF({ unit:'pt', format:'a4' });
    const L=48, R=547; const line = (y)=> doc.line(L,y,R,y);
    let y=64;

    // Header + logo
    const logoB64 = await loadImageAsBase64(COMPANY.logoUrl);
    if (logoB64) doc.addImage(logoB64, 'PNG', L, y-12, 36, 36);

    doc.setFont('helvetica','bold'); doc.setFontSize(18);
    doc.text(COMPANY.name, L + (logoB64?44:0), y);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    if (COMPANY.website) doc.text(COMPANY.website, L + (logoB64?44:0), y+=14);
    [COMPANY.address, COMPANY.taxId?`MST: ${COMPANY.taxId}`:'', `Điện thoại: ${COMPANY.phone}`, `Email: ${COMPANY.email}`]
      .filter(Boolean).forEach((t,i)=> doc.text(t, L + (logoB64?44:0), y += (i?12:14)));

    doc.setFont('helvetica','bold');
    doc.text('HÓA ĐƠN / INVOICE', R, 64, { align:'right' });
    doc.setFont('helvetica','normal');
    doc.text(`Mã đơn: ${orderId}`, R, 80, { align:'right' });
    doc.text(`Ngày đặt: ${meta.orderDate}`, R, 94, { align:'right' });

    y = Math.max(y, 112); line(y += 12);

    // Khách hàng
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    doc.text('THÔNG TIN KHÁCH HÀNG', L, y += 24);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(`Họ tên: ${customer.name}`, L, y += 14);
    doc.text(`Email: ${customer.email}`, L, y += 14);
    if (customer.phone) doc.text(`SĐT: ${customer.phone}`, L, y += 14);
    doc.text('Địa chỉ:', L, y += 14);
    const addrLines = doc.splitTextToSize(customer.address || '-', R-L);
    doc.text(addrLines, L, y += 14); y += (addrLines.length-1)*12;
    if (customer.note){
      doc.text('Ghi chú:', L, y += 14);
      const noteLines = doc.splitTextToSize(customer.note, R-L);
      doc.text(noteLines, L, y += 14); y += (noteLines.length-1)*12;
    }

    // QR thanh toán
    if (meta.paymentQRPayload){
      try {
        const qrB64 = await makePaymentQRBase64(meta.paymentQRPayload, 180);
        const boxTop = y - 120 > 160 ? y - 120 : y + 12;
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text('THANH TOÁN', R, boxTop, { align:'right' });
        doc.setFont('helvetica','normal'); doc.setFontSize(10);
        doc.text(`Phương thức: ${meta.paymentMethod}`, R, boxTop+14, { align:'right' });
        doc.text(`Tình trạng: ${meta.paymentStatus}`, R, boxTop+28, { align:'right' });
        doc.text('Quét QR để thanh toán', R, boxTop+44, { align:'right' });
        if (qrB64) doc.addImage(qrB64, 'PNG', R-180, boxTop+52, 180, 180);
        y = Math.max(y, boxTop+52+180);
      } catch {}
    } else {
      doc.setFont('helvetica','bold'); doc.setFontSize(12);
      doc.text('THANH TOÁN', L, y += 18);
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      doc.text(`Phương thức: ${meta.paymentMethod}`, L, y += 14);
      doc.text(`Tình trạng: ${meta.paymentStatus}`, L, y += 14);
    }

    line(y += 12);

    // Bảng hàng hóa
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    const cols = [
      { label:'Sản phẩm (SKU)', x:L,     w:250 },
      { label:'SL',             x:L+260, w:30  },
      { label:'Đơn giá',        x:L+300, w:90  },
      { label:VAT.label,        x:L+395, w:70  },
      { label:'Thành tiền',     x:L+470, w:75  },
    ];
    let rowY = y + 22;
    cols.forEach(c => doc.text(c.label, c.x, rowY));
    line(rowY += 6);

    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    for (const it of items){
      const display = `${it.title} (${it.id})`;
      const nameLines = doc.splitTextToSize(display, cols[0].w);

      if (rowY + (nameLines.length-1)*12 + 24 > 780) {
        doc.addPage(); rowY = 64; line(rowY); rowY += 22;
        cols.forEach(c => doc.text(c.label, c.x, rowY));
        line(rowY += 6);
      }

      rowY += 18;
      doc.text(nameLines, cols[0].x, rowY);
      doc.text(String(it.qty), cols[1].x, rowY);
      doc.text(fmtVND(it.price), cols[2].x + cols[2].w, rowY, { align:'right' });
      doc.text('-', cols[3].x + cols[3].w, rowY, { align:'right' });
      doc.text(fmtVND(Number(it.price)*Number(it.qty)), cols[4].x + cols[4].w, rowY, { align:'right' });

      rowY += (nameLines.length-1)*12;
    }
    line(rowY += 10);

    // Tổng + VAT
    const taxableBase = VAT.applyOn === 'subtotal_plus_shipping'
      ? Math.max(0, totals.subtotal - totals.discount + totals.shipping)
      : Math.max(0, totals.subtotal - totals.discount);
    const vatAmount = Math.round(taxableBase * (VAT.rate || 0));

    const labelX = L+300, valueX = R;
    let tY = rowY + 22;
    doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text('Tạm tính:', labelX, tY);               doc.text(fmtVND(totals.subtotal), valueX, tY, {align:'right'});
    doc.setFont('helvetica','normal'); tY += 16;
    doc.text('Giảm giá:', labelX, tY);               doc.text(`-${fmtVND(totals.discount)}`, valueX, tY, {align:'right'});
    tY += 16;
    doc.text('Phí vận chuyển:', labelX, tY);         doc.text(fmtVND(totals.shipping), valueX, tY, {align:'right'});
    tY += 16;
    doc.text(`${VAT.label}:`, labelX, tY);           doc.text(fmtVND(vatAmount), valueX, tY, {align:'right'});
    doc.setFont('helvetica','bold'); tY += 20;
    const grandTotal = totals.total + vatAmount;
    doc.text('TỔNG CỘNG:', labelX, tY);              doc.text(fmtVND(grandTotal), valueX, tY, {align:'right'});

    // Footer
    tY += 28;
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    const note = 'Vui lòng giữ lại hóa đơn để đối chiếu khi cần thiết. Cảm ơn bạn đã mua hàng tại ' + COMPANY.name + '!';
    doc.text(doc.splitTextToSize(note, R-L), L, tY);
    tY += 32;
    doc.text('Người lập hóa đơn', L, tY);
    doc.text('(Ký và ghi rõ họ tên)', L, tY + 12);

    return doc.output('datauristring').split(',')[1];
  }

  async function emailjsSendWithAttachment({ toEmail, templateParams, pdfBase64, filename }){
    const payload = {
      publicKey: EMAILJS_PUBLIC_KEY,
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY, // tương thích tài liệu cũ
      template_params: { ...templateParams, to_email: toEmail },
      attachments: [{ name: filename, data: pdfBase64 }]
    };
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok){
      const t = await res.text().catch(()=> '');
      throw new Error(`EmailJS send failed: ${res.status} ${t}`);
    }
    return res.json().catch(()=> ({}));
  }

  async function sendOrderEmailWithPDF_VAT({ customer, items, paymentMethod='COD', paymentStatus='Chờ xử lý', paymentQRPayload=null }){
    const orderId   = genOrderId();
    const orderDate = new Date().toLocaleString('vi-VN');
    const totals    = calcTotals(items);

    const order_details_html = buildOrderTableHTML(items);

    const templateParams = {
      order_id: orderId,
      order_date: orderDate,
      customer_name: customer.name || '',
      to_email: customer.email || '',
      to_address: customer.address || '',
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      discount_text: totals.discount ? `-${fmtVND(totals.discount)}` : '0₫',
      total_price: fmtVND(totals.total),
      order_details_html,
      admin_name: 'Admin Anime Store',
      time: orderDate,
      logo_url: COMPANY.logoUrl
    };

    const pdfBase64 = await buildInvoicePDFBase64_VAT({
      orderId, customer, items, totals,
      meta: { orderDate, paymentMethod, paymentStatus, paymentQRPayload }
    });
    const filename = `invoice-${orderId}.pdf`;

    await emailjsSendWithAttachment({ toEmail: customer.email, templateParams, pdfBase64, filename });
    await emailjsSendWithAttachment({ toEmail: COMPANY.email, templateParams, pdfBase64, filename });

    return { orderId };
  }

  /* =======================
     6) EVENT WIRING
     ======================= */
  function bindEvents(){
    // mở giỏ
    const openBtn = $id('openCartBtn');
    if (openBtn){
      const clone = openBtn.cloneNode(true);
      openBtn.parentNode.replaceChild(clone, openBtn);
      clone.addEventListener('click', (e) => {
        e.preventDefault();
        // mở giỏ (không chặn login)
        toggleCart(true);
      });
    }

    // đóng overlay
    const popup = $id('cartPopup');
    popup?.addEventListener('click', (e)=> { if (e.target === popup) toggleCart(false); });
    popup?.querySelector('.close-cart')?.addEventListener('click', ()=> toggleCart(false));
    document.addEventListener('keydown', (e)=> {
      if (e.key === 'Escape' && popup && popup.style.display === 'block') toggleCart(false);
    });

    // tăng/giảm/xóa
    $id('cartItems')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const row = e.target.closest('.cart-item');
      const idx = Number(row?.dataset.idx);
      if (Number.isNaN(idx)) return;
      const act = btn.dataset.act;
      if (act === 'inc') changeQty(idx, +1);
      if (act === 'dec') changeQty(idx, -1);
      if (act === 'rem') removeItem(idx);
    });

    // actions trong popup
    $id('invoiceBtn')?.addEventListener('click', printInvoice);

    $id('continueShopping')?.addEventListener('click', (e)=>{
      e.preventDefault();
      toggleCart(false);
    });

    $id('clearCartBtn')?.addEventListener('click', ()=>{
      if (confirm('Bạn muốn xóa toàn bộ giỏ hàng?')){
        clearCart();
        renderCart();
      }
    });

    $id('goCheckout')?.addEventListener('click', (e)=>{
      e.preventDefault();
      const items = readCart();
      if (!items.length){ alert('Giỏ hàng trống.'); return; }
      requireAuth(()=>{ window.location.href = 'checkout.html'; });
    });

    // đồng bộ số lượng khi auth thay đổi (nếu có)
    window.addEventListener('auth:changed', updateCartCount);

    // Hook checkout (nếu trang có form)
    $('#confirmOrderBtn')?.addEventListener('click', async () => {
      const status = $('#checkoutStatus');
      const btn    = $('#confirmOrderBtn');

      const customer = {
        name:    $('#coName')?.value.trim(),
        email:   $('#coEmail')?.value.trim(),
        phone:   $('#coPhone')?.value.trim(),
        address: $('#coAddr')?.value.trim(),
        note:    $('#coNote')?.value.trim(),
      };
      const isEmail = (s)=> /^\S+@\S+\.\S+$/.test(s||'');

      if (!customer.name || !isEmail(customer.email) || !customer.address){
        status && (status.textContent = 'Vui lòng nhập Họ tên, Email hợp lệ và Địa chỉ.');
        status && status.classList.add('error');
        return;
      }

      const items = readCart();
      if (!items.length){
        status && (status.textContent = 'Giỏ hàng trống.');
        status && status.classList.add('error');
        return;
      }

      const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'COD';
      const paymentQRPayload = $('#qrPayload')?.value || '';

      btn && (btn.disabled = true, btn.textContent = 'Đang gửi...');
      status && (status.textContent = '', status.className = 'muted');

      try {
        const { orderId } = await sendOrderEmailWithPDF_VAT({
          customer, items,
          paymentMethod: payMethod,
          paymentStatus: payMethod === 'COD' ? 'Chưa thanh toán' : 'Chờ xác nhận',
          paymentQRPayload
        });

        clearCart();
        $('#cartCount') && ($('#cartCount').textContent = '0');
        status && (status.textContent = `Đặt hàng thành công! Mã đơn ${orderId}. Email kèm PDF đã gửi tới ${customer.email}.`,
                   status.classList.remove('error'), status.classList.add('ok'));
        btn && (btn.textContent = 'Đã gửi!');
      } catch (e) {
        console.error(e);
        status && (status.textContent = 'Gửi email thất bại. Vui lòng thử lại hoặc liên hệ shop.',
                   status.classList.add('error'));
        btn && (btn.textContent = 'Xác nhận đặt hàng');
      } finally {
        btn && (btn.disabled = false);
      }
    });
  }

  /* =======================
     7) PUBLIC API
     ======================= */
  window.CartAPI = {
    readCart, writeCart, clearCart,
    setDiscountVND, getDiscountVND,
    updateCartCount, fmtVND,
    sendOrderEmailWithPDF_VAT
  };
  window.addToCart  = addToCart;
  window.changeQty  = changeQty;
  window.removeItem = removeItem;
  window.toggleCart = toggleCart;
  window.renderCart = renderCart;
  window.printInvoice = printInvoice;

  /* =======================
     INIT
     ======================= */
  document.addEventListener('DOMContentLoaded', () => {
    ensureCartPopup();
    bindEvents();
    updateCartCount();
  });
})();
