(function(){
  const WISHLIST_KEY='wishlist';
  const CART_KEY='cart';
  const $=(s,r=document)=>r.querySelector(s);
  const vnd=n=>(n||0).toLocaleString('vi-VN')+'₫';

  const readWish=()=>{ try{return JSON.parse(localStorage.getItem(WISHLIST_KEY))||[]}catch{return[]} };
  const writeWish=(d)=> localStorage.setItem(WISHLIST_KEY, JSON.stringify(d));
  const readCart=()=>{ try{return JSON.parse(localStorage.getItem(CART_KEY))||[]}catch{return[]} };
  const writeCart=(d)=> localStorage.setItem(CART_KEY, JSON.stringify(d));
  const setCount=()=>{ const c=readCart().reduce((s,i)=>s+(i.qty||1),0); const el=$('#cartCount'); if(el) el.textContent=c; };

  function addToCart(item){
    const cart=readCart();
    const idx=cart.findIndex(x=>x.name===item.name);
    if(idx>=0) cart[idx].qty=(cart[idx].qty||1)+1; else cart.push({...item, qty:1});
    writeCart(cart); setCount();
  }
  function removeWish(name){
    const list=readWish();
    const idx=list.findIndex(x=>x.name===name);
    if(idx>=0){ list.splice(idx,1); writeWish(list); }
  }

  function render(){
    const grid=$('#wishGrid');
    const empty=$('#wishEmpty');
    const list=readWish();
    grid.innerHTML='';
    if(list.length===0){ empty.hidden=false; setCount(); return; }
    empty.hidden=true;

    list.forEach(it=>{
      const card=document.createElement('div');
      card.className='w-card';
      card.innerHTML=`
        <div class="img"><img src="${it.img||''}" alt=""></div>
        <h4>${it.name}</h4>
        <div class="price">${vnd(it.price)}</div>
        <div class="actions">
          <button class="btn-mini add"><i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ</button>
          <button class="btn-mini outline remove"><i class="fa-regular fa-heart"></i> Bỏ yêu thích</button>
        </div>
      `;
      grid.appendChild(card);

      card.querySelector('.add').addEventListener('click', ()=>{
        addToCart({name:it.name, price:it.price, img:it.img});
        card.querySelector('.add').animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:220});
      });
      card.querySelector('.remove').addEventListener('click', ()=>{
        removeWish(it.name); render();
      });
    });
    setCount();
  }

  document.addEventListener('DOMContentLoaded', render);
})();
