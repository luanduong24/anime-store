/* ============================================
   Bộ sưu tập - JS v2 (dùng chung giỏ hàng)
   - Filter chips, sort (cross-browser)
   - Gallery thumbs
   - Scroll tới block
   - Wishlist (localStorage: {name, price, img})
   - Reveal on scroll, Search
   - Cart: gọi common-cart.js (addToCart, updateCartCount, toggleCart)
   ============================================ */
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  // ---------- SELECTORS & STATE (không còn key cart riêng) ----------
  const WISHLIST_KEY = 'wishlist';
  const SELECTORS = {
    chips: '.chips .chip',
    seriesBlocks: '.series-block',
    productGrid: '.product-grid',
    productCard: '.p-card',
    thumbs: '.thumbs .thumb',
    heroImg: '.hero',
    addBtn: '.btn-mini.add',
    favBtn: '.btn-mini.outline',
    sortSelect: '#sortSelect',
    scrollBtn: '[data-scroll]',
    searchInput: '#searchInput',
    searchButton: '#searchButton',
  };

  // ---------- UTILS ----------
  const vnd = n => (n||0).toLocaleString('vi-VN') + '₫';
  const read = (k, def=[]) => { try{ return JSON.parse(localStorage.getItem(k)) || def; }catch{ return def; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ---------- WISHLIST ----------
  const readWish = () => read(WISHLIST_KEY);
  const writeWish = (d) => write(WISHLIST_KEY, d);
  const isWished = (name) => readWish().some(x => x.name === name);

  function toggleWish(item){
    const list = readWish();
    const idx = list.findIndex(x => x.name === item.name);
    if(idx >= 0) list.splice(idx,1);
    else list.push({name:item.name, price:item.price||0, img:item.img||''});
    writeWish(list);
  }
  function syncFavButton(btn, active){
    btn.classList.toggle('is-on', !!active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    const icon = btn.querySelector('i');
    if(icon){ icon.classList.toggle('fa-regular', !active); icon.classList.toggle('fa-solid', active); }
    const label = active ? 'Bỏ yêu thích' : 'Yêu thích';
    const textNode = [...btn.childNodes].find(n => n.nodeType === 3);
    if(textNode) textNode.nodeValue = ' ' + label;
  }

  // ---------- FILTER ----------
  function applyFilter(series){
    const blocks = $$(SELECTORS.seriesBlocks);
    if(series === 'all'){ blocks.forEach(b => b.style.display = ''); return; }
    blocks.forEach(b => { b.style.display = (b.getAttribute('data-series') === series) ? '' : 'none'; });
  }
  function initChips(){
    const chips = $$(SELECTORS.chips);
    chips.forEach(chip => chip.addEventListener('click', () => {
      chips.forEach(c => { c.classList.remove('is-active'); c.setAttribute('aria-selected','false'); });
      chip.classList.add('is-active'); chip.setAttribute('aria-selected','true');
      const series = chip.dataset.filter || 'all';
      applyFilter(series); history.replaceState(null,'',`#${series}`);
    }));
    const hash = (location.hash||'').replace('#','').trim();
    if(hash){ const target = chips.find(c => c.dataset.filter === hash); if(target) target?.click(); }
  }

  // ---------- SORT ----------
  const sorters = {
    'featured': (a,b)=>0,
    'price-asc': (a,b)=>(+a.dataset.price||0) - (+b.dataset.price||0),
    'price-desc': (a,b)=>(+b.dataset.price||0) - (+a.dataset.price||0),
    'rating-desc': (a,b)=>(+b.dataset.rating||0) - (+a.dataset.rating||0),
    'newest': (a,b)=> (Date.parse(b.dataset.newest||0) - Date.parse(a.dataset.newest||0))
  };
  function initSort(){
    const sel = $(SELECTORS.sortSelect); if(!sel) return;
    sel.addEventListener('change', () => {
      const val = sel.value; const sortFn = sorters[val] || sorters.featured;
      $$(SELECTORS.productGrid).forEach(grid => {
        const cards = $$(SELECTORS.productCard, grid);
        const sorted = cards.slice().sort(sortFn);
        sorted.forEach(card => grid.appendChild(card));
      });
    });
  }

  // ---------- GALLERY THUMBS ----------
  function initThumbs(){
    $$('.series-overview').forEach(over => {
      const hero = $(SELECTORS.heroImg, over);
      const thumbs = $$(SELECTORS.thumbs, over);
      if(!hero || !thumbs.length) return;
      thumbs.forEach(btn => btn.addEventListener('click', () => {
        thumbs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected','false'); });
        btn.classList.add('is-active'); btn.setAttribute('aria-selected','true');
        const src = btn.dataset.src; if(src) hero.src = src;
      }));
    });
  }

  // ---------- SCROLL TO BLOCK ----------
  function initScrollBtns(){
    $$(SELECTORS.scrollBtn).forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault(); const el = document.querySelector(btn.dataset.scroll || '');
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    }));
  }

  // ---------- ADD TO CART (gọi common-cart.js) ----------
  function initAddButtons(){
    $$(SELECTORS.addBtn).forEach(btn => btn.addEventListener('click', () => {
      const item = {
        // Truyền đủ name/img để common-cart.js map sang title/image
        name: btn.dataset.name || 'Sản phẩm',
        price: parseInt(btn.dataset.price||'0', 10),
        img: btn.dataset.img || '',
        quantity: 1
      };
      if (window.addToCart) {
        window.addToCart(item);       // common-cart sẽ tự mở drawer + cập nhật số lượng
      } else {
        // fallback cực nhẹ (trường hợp thiếu common-cart.js)
        alert('Đã thêm vào giỏ!');
      }
      btn.animate(
        [{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],
        {duration:250,easing:'ease-out'}
      );
    }));
  }

  // ---------- WISHLIST BIND ----------
  function initWishlist(){
    $$('.card-actions').forEach(row => {
      const addBtn = row.querySelector(SELECTORS.addBtn);
      const favBtn = row.querySelector(SELECTORS.favBtn);
      if(!addBtn || !favBtn) return;
      const item = {
        name: addBtn.dataset.name || row.closest('.p-card')?.querySelector('h4')?.textContent?.trim() || 'Sản phẩm',
        price: parseInt(addBtn.dataset.price||'0',10),
        img: addBtn.dataset.img||''
      };
      syncFavButton(favBtn, isWished(item.name));
      favBtn.addEventListener('click', () => {
        toggleWish(item);
        syncFavButton(favBtn, isWished(item.name));
        favBtn.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}], {duration:220});
      });
    });
  }

  // ---------- SEARCH ----------
  function initSearch(){
    const input=$('#searchInput'), button=$('#searchButton'); if(!input||!button) return;
    const go=()=>{ const q=(input.value||'').trim(); if(!q) return; location.href = `danhmuc.html?q=${encodeURIComponent(q)}`; };
    button.addEventListener('click', go);
    input.addEventListener('keydown', e=>{ if(e.key==='Enter') go(); });
  }

  // ---------- REVEAL ON SCROLL ----------
  function initReveal(){
    const els = $$('.reveal');
    if(!('IntersectionObserver' in window)){ els.forEach(e=>e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries=>{
      entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
    }, {threshold:.12});
    els.forEach(e=>io.observe(e));
  }

  // ---------- INIT ----------
  document.addEventListener('DOMContentLoaded', () => {
    // Đồng bộ đếm giỏ chung
    if (window.updateCartCount) window.updateCartCount();

    initChips();
    initSort();
    initThumbs();
    initScrollBtns();
    initAddButtons();      // dùng addToCart từ common-cart.js
    initWishlist();
    initSearch();
    initReveal();

    // Nhận tab từ danh mục
    const tab = localStorage.getItem('tab');
    if(tab){
      const chip = document.querySelector(`.chip[data-filter="${tab}"]`);
      if(chip){ chip.click(); }
      localStorage.removeItem('tab');
    }
  });
})();
