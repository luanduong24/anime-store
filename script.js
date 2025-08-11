/* =============================
   Anime Store – script.js
   Page-only logic: nav, slider, modal quick-view, search, reviews
   ============================= */
(function(){
  const $ = (sel, ctx=document)=>ctx.querySelector(sel);
  const $$ = (sel, ctx=document)=>Array.from(ctx.querySelectorAll(sel));

  // ==== Mobile Nav Toggle ====
  const navToggle = $('#navToggle');
  const mainNav = $('.main-nav');
  navToggle?.addEventListener('click', ()=>{
    const opened = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', opened? 'true':'false');
  });
  document.addEventListener('click', (e)=>{
    if(!mainNav?.classList.contains('open')) return;
    const inside = e.target.closest('.main-nav') || e.target.closest('#navToggle');
    if(!inside) mainNav.classList.remove('open');
  });

  // ==== Search (simple) ====
  const searchInput = $('#searchInput');
  const searchButton = $('#searchButton');
  function doSearch(){
    const q = (searchInput?.value||'').trim();
    if(!q){ searchInput?.focus(); return; }
    localStorage.setItem('search_query', q);
    window.location.href = 'danhmuc.html';
  }
  searchButton?.addEventListener('click', doSearch);
  searchInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSearch(); });

  // ==== Slider (auto + controls) ====
  const slides = $$('#slides .slide');
  const prev = $('#prevSlide');
  const next = $('#nextSlide');
  let idx = 0; let timerId;
  function show(i){ slides.forEach((s, k)=> s.classList.toggle('active', k===i)); }
  function nextSlide(){ idx = (idx+1) % slides.length; show(idx); }
  function prevSlide(){ idx = (idx-1+slides.length) % slides.length; show(idx); }
  function autoplay(){ clearInterval(timerId); timerId = setInterval(nextSlide, 5000); }
  next?.addEventListener('click', ()=>{ nextSlide(); autoplay(); });
  prev?.addEventListener('click', ()=>{ prevSlide(); autoplay(); });
  autoplay();

  // ==== Quick View Modal ====
  const productModal = $('#productModal');
  const modalContent = $('.modal-content');
  const modalTitle   = $('#modalTitle');
  const modalDesc    = $('#modalDesc');
  const modalImg     = $('#modalImg');
  const modalPrice   = $('#modalPrice');
  const modalAddBtn  = $('#modalAddBtn');

  function lockBodyScroll(lock){
    document.body.style.overflow = lock ? 'hidden' : '';
  }
  function openProductModal({title, desc, img, priceText, price}){
    modalTitle.textContent = title || '';
    modalDesc.textContent  = desc  || '';
    modalImg.src           = img   || '';
    modalPrice.textContent = priceText || '0₫';
    modalAddBtn.onclick    = ()=> addToCart(`Mô hình ${title}`, Number(price||0), img||'');
    productModal.style.display = 'grid';
    productModal.setAttribute('aria-hidden','false');
    lockBodyScroll(true);
    modalContent && (modalContent.scrollTop = 0);
    setTimeout(()=>{ modalAddBtn?.focus(); }, 50);
  }
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-open-modal]');
    if(!btn) return;
    const title     = btn.dataset.title || '';
    const desc      = btn.dataset.desc  || '';
    const img       = btn.dataset.img   || '';
    const priceText = btn.dataset.price || '0';
    const price     = Number(priceText.replace(/\D/g,'') || 0);
    openProductModal({title, desc, img, priceText, price});
  });
  productModal?.addEventListener('click', (e)=>{
    if(e.target.classList.contains('modal')) closeModal();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') closeModal();
  });
  window.closeModal = function(){
    if(!productModal) return;
    productModal.style.display = 'none';
    productModal.setAttribute('aria-hidden','true');
    lockBodyScroll(false);
  };

  // ==== Star Rating + Reviews (per product) ====
  const starsWrap = $('#starRating');
  const reviewComment = $('#reviewComment');
  const sendReview = $('#sendReview');
  const reviewList = $('#reviewList');

  function storageKey(){ return `as_reviews_${(modalTitle?.textContent||'').trim()}`; }
  function getReviews(){ try{ return JSON.parse(localStorage.getItem(storageKey())||'[]'); }catch{ return []; } }
  function setReviews(list){ localStorage.setItem(storageKey(), JSON.stringify(list)); }
  function renderReviews(){
    const list = getReviews();
    if(!list.length){ reviewList.textContent = 'Chưa có đánh giá nào.'; return; }
    reviewList.innerHTML = list.map(r=>`
      <div style="border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin-top:8px">
        <div style="color:#fbbf24">${'★'.repeat(r.star)}${'☆'.repeat(5-r.star)}</div>
        <div>${r.text}</div>
      </div>`).join('');
  }
  let currentStar = 0;
  starsWrap?.addEventListener('mouseover', (e)=>{
    const i = e.target.closest('i'); if(!i) return;
    const star = Number(i.dataset.star||0); highlight(star);
  });
  starsWrap?.addEventListener('mouseout', ()=> highlight(currentStar));
  starsWrap?.addEventListener('click', (e)=>{
    const i = e.target.closest('i'); if(!i) return;
    currentStar = Number(i.dataset.star||0); highlight(currentStar);
  });
  function highlight(n){ $$('#starRating i').forEach(i=> i.classList.toggle('active', Number(i.dataset.star)<=n)); }
  sendReview?.addEventListener('click', ()=>{
    const text = (reviewComment?.value||'').trim();
    if(!currentStar){ alert('Chọn số sao trước đã nhé!'); return; }
    if(!text){ alert('Hãy nhập nhận xét.'); return; }
    const list = getReviews(); list.push({star: currentStar, text});
    setReviews(list);
    reviewComment.value = ''; currentStar = 0; highlight(0); renderReviews();
  });
  const observer = new MutationObserver(()=>{
    if($('#productModal')?.style.display !== 'none') renderReviews();
  });
  productModal && observer.observe(productModal, { attributes:true, attributeFilter:['style'] });
})();
