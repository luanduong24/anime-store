// (function(){
//   const CART_KEY = 'cart';
//   const $ = (s, r=document)=>r.querySelector(s);
//   const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
//   const vnd = n => (n||0).toLocaleString('vi-VN') + '₫';

//   const read = ()=>{ try{return JSON.parse(localStorage.getItem(CART_KEY))||[]}catch{ return []} };
//   const write = (d)=> localStorage.setItem(CART_KEY, JSON.stringify(d));
//   const recalcCount = ()=> { const el = $('#cartCount'); if(el) el.textContent = read().reduce((s,i)=>s+(i.qty||1),0); };

//   function render(){
//     const listEl = $('#cartList');
//     const emptyEl = $('#cartEmpty');
//     listEl.innerHTML = '';
//     const cart = read();
//     if(cart.length === 0){
//       emptyEl.hidden = false;
//       $('#subTotal').textContent = vnd(0);
//       $('#grandTotal').textContent = vnd(0);
//       recalcCount();
//       return;
//     }
//     emptyEl.hidden = true;

//     let sub = 0;
//     cart.forEach((it, idx) => {
//       const li = document.createElement('li');
//       li.className = 'cart-item';
//       li.innerHTML = `
//         <img src="${it.img||''}" alt="">
//         <div>
//           <h4>${it.name}</h4>
//           <div class="price">${vnd(it.price)}</div>
//           <div class="qty">
//             <button aria-label="Giảm" data-act="dec">−</button>
//             <input type="text" value="${it.qty||1}" inputmode="numeric" aria-label="Số lượng">
//             <button aria-label="Tăng" data-act="inc">+</button>
//           </div>
//         </div>
//         <div class="item-actions">
//           <div><strong>${vnd((it.qty||1)*it.price)}</strong></div>
//           <button class="remove" aria-label="Xóa" data-act="remove"><i class="fa-regular fa-trash-can"></i></button>
//         </div>
//       `;
//       listEl.appendChild(li);

//       // events
//       const input = $('input', li);
//       const btnInc = $('[data-act="inc"]', li);
//       const btnDec = $('[data-act="dec"]', li);
//       const btnRem = $('[data-act="remove"]', li);

//       const apply = (newQty)=>{
//         newQty = Math.max(1, Math.min(999, parseInt(newQty||'1',10)));
//         cart[idx].qty = newQty;
//         write(cart);
//         render();
//       };
//       btnInc.addEventListener('click', ()=> apply((it.qty||1)+1));
//       btnDec.addEventListener('click', ()=> apply((it.qty||1)-1));
//       input.addEventListener('change', ()=> apply(input.value));
//       btnRem.addEventListener('click', ()=>{
//         cart.splice(idx,1); write(cart); render();
//       });

//       sub += (it.qty||1) * (it.price||0);
//     });

//     $('#subTotal').textContent = vnd(sub);
//     $('#discount').textContent = vnd(0);
//     $('#grandTotal').textContent = vnd(sub);
//     recalcCount();
//   }

//   function printInvoice(){
//     const cart = read();
//     if(cart.length===0){ alert('Giỏ hàng trống.'); return; }
//     const now = new Date();
//     const win = window.open('', '_blank');
//     const vnd = n => (n||0).toLocaleString('vi-VN') + '₫';
//     const rows = cart.map(i=>`
//       <tr><td>${i.name}</td><td>${i.qty||1}</td><td>${vnd(i.price)}</td><td>${vnd((i.qty||1)*i.price)}</td></tr>
//     `).join('');
//     const total = cart.reduce((s,i)=>s+(i.qty||1)*i.price,0);

//     win.document.write(`
//       <html><head><title>Hóa đơn</title>
//       <style>
//         body{font-family:system-ui; padding:20px}
//         h1{margin:0 0 8px}
//         table{width:100%; border-collapse:collapse; margin-top:10px}
//         th,td{border:1px solid #ccc; padding:8px; text-align:left}
//         tfoot td{font-weight:bold}
//       </style></head>
//       <body>
//         <h1>Anime Store</h1>
//         <div>Ngày: ${now.toLocaleString('vi-VN')}</div>
//         <table>
//           <thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
//           <tbody>${rows}</tbody>
//           <tfoot><tr><td colspan="3">Tổng cộng</td><td>${vnd(total)}</td></tr></tfoot>
//         </table>
//         <script>window.onload = () => window.print();<\/script>
//       </body></html>
//     `);
//     win.document.close();
//   }

//   document.addEventListener('DOMContentLoaded', ()=>{
//     render();
//     $('#btnClear').addEventListener('click', ()=>{
//       if(confirm('Xóa toàn bộ giỏ hàng?')){
//         localStorage.setItem(CART_KEY, '[]'); render();
//       }
//     });
//     $('#btnPrint').addEventListener('click', printInvoice);
//     $('#btnCheckout').addEventListener('click', ()=> alert('Demo: tích hợp thanh toán sau nhé!'));
//   });
// })();


