(function () {
  // ====== Keys dùng chung toàn site ======
  const LS_USERS = "users";         // [{name,email,pass,avatar?}]
  const LS_CURRENT = "currentUser"; // {name,email,avatar?}

  // ====== Helpers: LocalStorage ======
  const readJSON = (k, d = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const getUsers   = () => readJSON(LS_USERS, []);
  const saveUsers  = (arr) => writeJSON(LS_USERS, arr);

  const getCurrent = () => readJSON(LS_CURRENT, null);
  const setCurrent = (u) => { writeJSON(LS_CURRENT, u); dispatchAuth(u); };
  const clearCurrent = () => { localStorage.removeItem(LS_CURRENT); dispatchAuth(null); };

  const dispatchAuth = (detail) => window.dispatchEvent(new CustomEvent("auth:changed", { detail }));

  // ====== DOM utils ======
  const qs  = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const after = (el, html) => el.insertAdjacentHTML("afterend", html);

  // ====== Validation helpers ======
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // ≥8, có chữ, số, ký tự đặc biệt
  const passRe  = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+[{\]};:'",.<>/?\\|`~]).{8,}$/;

  const isValidEmail = (v) => emailRe.test(String(v).trim().toLowerCase());
  const isStrongPass = (v) => passRe.test(String(v));

  function setErr(input, msg) {
    if (!input) return;
    const id = input.id ? input.id + "Err" : "";
    let box = id ? qs("#" + id) : null;
    if (!box && id) {
      after(input, `<div class="auth-err" id="${id}"></div>`);
      box = qs("#" + id);
    }
    if (box) box.textContent = msg || "";
    input.classList.toggle("invalid", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  const clearErr = (input) => setErr(input, "");

  // ====== Header anchors ======
  function ensureHeaderAnchors() {
    const actions = qs(".header-actions");
    if (!actions) return;
    if (!qs("#loginBtn", actions)) {
      const btn = document.createElement("button");
      btn.id = "loginBtn";
      btn.className = "member-btn";
      btn.innerHTML = '<i class="fa-solid fa-user"></i> Thành Viên';
      actions.appendChild(btn);
    }
    if (!qs("#userInfo", actions)) {
      const span = document.createElement("div");
      span.id = "userInfo";
      actions.insertBefore(span, actions.firstChild);
    }
  }

  // ====== Inject CSS ======
  function injectStyles() {
    if (qs('#authStyles')) return;
    const css = `
    .auth-popup{position:fixed;inset:0;display:none;background:rgba(0,0,0,.6);z-index:3000}
    .auth-popup.show{display:block}
    .auth-panel{width:min(420px,94%);background:#0f1426;color:#fff;border:1px solid rgba(255,255,255,.08);
      border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.45);position:absolute;left:50%;top:50%;
      transform:translate(-50%,-50%);padding:18px 18px 16px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial}
    .auth-close{position:absolute;right:10px;top:10px;width:36px;height:36px;border-radius:999px;
      background:#15192a;color:#fff;border:1px solid rgba(255,255,255,.12);display:grid;place-items:center;cursor:pointer}
    .auth-panel h2{margin:4px 0 14px;font-size:20px}
    .auth-field{display:grid;gap:6px;margin:10px 0}
    .auth-field label{font-size:13px;color:#9fb1d6}
    .auth-field input{background:#10182f;border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:10px 12px;outline:none}
    .auth-actions{display:flex;gap:8px;margin-top:12px}
    .auth-actions .btn-buy{flex:1}
    .auth-msg{color:#ffb3b3;font-size:13px;margin-top:6px;min-height:18px}
    .auth-switch{margin:10px 0 0;font-size:13px;color:#9fb1d6}
    .auth-switch .link{background:none;border:0;color:#7c5cff;cursor:pointer;text-decoration:underline}
    .auth-err{color:#ff9aa2;font-size:12px;margin-top:4px;min-height:14px}
    .invalid{border-color:#ff6b6b !important; box-shadow:0 0 0 2px rgba(255,107,107,.15)}
    .btn-buy[disabled]{opacity:.6;cursor:not-allowed}
    /* Avatar + menu */
    .avatar-btn{width:40px;height:40px;padding:0;border-radius:999px;border:1px solid rgba(255,255,255,.12);
      background:#15192a;display:grid;place-items:center;cursor:pointer}
    .avatar-btn .avatar{width:32px;height:32px;border-radius:999px;display:grid;place-items:center;
      font-weight:700;letter-spacing:.5px;background:linear-gradient(180deg,#7c5cff,#5b43f3);color:#fff;user-select:none}
    .auth-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:200px;background:#111629;color:#dfe6f7;
      border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:8px;box-shadow:0 10px 30px rgba(0,0,0,.35);display:none;z-index:2600}
    .auth-menu.show{display:block}
    .auth-menu button{width:100%;text-align:left;background:transparent;border:0;color:#dfe6f7;padding:10px;border-radius:10px;cursor:pointer}
    .auth-menu button:hover{background:#1b2136}
    `;
    const style = document.createElement('style');
    style.id = 'authStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ====== Inject popups nếu trang chưa có ======
  function injectPopups() {
    if (!qs("#loginPopup")) {
      document.body.insertAdjacentHTML("beforeend", `
      <div id="loginPopup" class="auth-popup" aria-hidden="true">
        <div class="auth-panel" role="dialog" aria-modal="true" aria-labelledby="lgTitle">
          <button class="auth-close" data-auth-close aria-label="Đóng">&times;</button>
          <h2 id="lgTitle" class="auth-title">Đăng nhập thành viên</h2>
          <form id="authLogin" autocomplete="on" novalidate>
            <div class="auth-field">
              <label for="lgIdentifier">Email hoặc tên hiển thị</label>
              <input id="lgIdentifier" name="identifier" type="text" placeholder="vd: luffy@example.com" required>
            </div>
            <div class="auth-field">
              <label for="lgPass">Mật khẩu</label>
              <input id="lgPass" name="pass" type="password" placeholder="••••••••" required>
            </div>
            <div class="auth-msg" id="lgMsg"></div>
            <div class="auth-actions">
              <button type="submit" class="btn-buy" id="lgSubmit"><i class="fa-solid fa-right-to-bracket"></i> Đăng nhập</button>
              <button type="button" class="btn-mini outline" data-auth-close>Hủy</button>
            </div>
            <p class="auth-switch">Chưa có tài khoản?
              <button type="button" class="link" id="openRegisterFromLogin">Đăng ký</button>
            </p>
          </form>
        </div>
      </div>`);
    }
    if (!qs("#registerPopup")) {
      document.body.insertAdjacentHTML("beforeend", `
      <div id="registerPopup" class="auth-popup" aria-hidden="true">
        <div class="auth-panel" role="dialog" aria-modal="true" aria-labelledby="rgTitle">
          <button class="auth-close" data-auth-close aria-label="Đóng">&times;</button>
          <h2 id="rgTitle" class="auth-title">Tạo tài khoản mới</h2>
          <form id="authRegister" autocomplete="on" novalidate>
            <div class="auth-field">
              <label for="rgName">Tên hiển thị</label>
              <input id="rgName" name="name" type="text" placeholder="vd: Luffy" required>
            </div>
            <div class="auth-field">
              <label for="rgEmail">Email</label>
              <input id="rgEmail" name="email" type="email" placeholder="vd: luffy@example.com" required>
            </div>
            <div class="auth-field">
              <label for="rgPass">Mật khẩu (≥ 8 ký tự, gồm chữ + số + ký tự đặc biệt)</label>
              <input id="rgPass" name="pass" type="password" minlength="8" placeholder="••••••••" required>
            </div>
            <div class="auth-field">
              <label for="rgConfirm">Nhập lại mật khẩu</label>
              <input id="rgConfirm" name="confirm" type="password" minlength="8" placeholder="••••••••" required>
            </div>
            <label style="display:flex;gap:8px;align-items:center;margin-top:6px;color:#9fb1d6;font-size:13px">
              <input type="checkbox" id="rgTerms" required> Tôi đồng ý điều khoản
            </label>
            <div class="auth-msg" id="rgMsg"></div>
            <div class="auth-actions">
              <button type="submit" class="btn-buy" id="rgSubmit"><i class="fa-solid fa-user-plus"></i> Đăng ký</button>
              <button type="button" class="btn-mini outline" id="backToLogin">Đã có tài khoản</button>
            </div>
          </form>
        </div>
      </div>`);
    }
  }

  // ====== Popup controls ======
  const openPopup = (sel) => { const el = qs(sel); if (el) el.classList.add("show"); };
  const closeAllPopups = () => qsa(".auth-popup.show").forEach(p => p.classList.remove("show"));

  function bindPopupEvents() {
    document.body.addEventListener("click", (e) => {
      if (e.target.matches("[data-auth-close]") || e.target.classList.contains("auth-popup")) closeAllPopups();
      if (e.target.id === "openRegisterFromLogin") { closeAllPopups(); openPopup("#registerPopup"); }
      if (e.target.id === "backToLogin") { closeAllPopups(); openPopup("#loginPopup"); }
    });
  }

  // ====== Realtime validation (LOGIN) ======
  function setupLoginValidation() {
    const id = qs("#lgIdentifier");
    const pass = qs("#lgPass");
    const submit = qs("#lgSubmit");
    const msg = qs("#lgMsg");
    if (!id || !pass || !submit) return;

    function validateLogin() {
      let ok = true;
      msg.textContent = "";
      if (!id.value.trim()) { setErr(id, "Vui lòng nhập email hoặc tên hiển thị."); ok = false; }
      else {
        clearErr(id);
        if (id.value.includes("@") && !isValidEmail(id.value)) { setErr(id, "Email không hợp lệ."); ok = false; }
        else clearErr(id);
      }
      if (!pass.value) { setErr(pass, "Vui lòng nhập mật khẩu."); ok = false; } else clearErr(pass);
      submit.disabled = !ok;
      return ok;
    }

    id.addEventListener("input", validateLogin);
    pass.addEventListener("input", validateLogin);

    document.body.addEventListener("submit", (e) => {
      if (e.target.id !== "authLogin") return;
      e.preventDefault();
      if (!validateLogin()) return;

      const users = getUsers();
      const found = users.find(u =>
        (u.email?.toLowerCase() === id.value.trim().toLowerCase()
         || u.name?.toLowerCase() === id.value.trim().toLowerCase())
        && u.pass === pass.value
      );

      if (!found) {
        msg.innerHTML = 'Không tìm thấy tài khoản hoặc sai mật khẩu. <button id="gotoReg" class="link" type="button">Tạo tài khoản</button>';
        qs("#gotoReg")?.addEventListener("click", () => { closeAllPopups(); openPopup("#registerPopup"); });
        return;
      }
      setCurrent({ name: found.name, email: found.email, avatar: found.avatar || "" });
      closeAllPopups();
      renderAuthUI();
      // >>> chạy callback chờ (nếu có)
      if (pendingAction) { try { pendingAction(); } finally { pendingAction = null; } }
    });

    submit.disabled = true;
  }

  // ====== Realtime validation (REGISTER) ======
  function setupRegisterValidation() {
    const name = qs("#rgName");
    const email = qs("#rgEmail");
    const pass = qs("#rgPass");
    const confirm = qs("#rgConfirm");
    const terms = qs("#rgTerms");
    const submit = qs("#rgSubmit");
    const msg = qs("#rgMsg");
    if (!name || !email || !pass || !confirm || !terms || !submit) return;

    [name, email, pass, confirm].forEach(i => setErr(i, ""));

    function validateName() {
      if (!name.value.trim()) { setErr(name, "Vui lòng nhập tên hiển thị."); return false; }
      if (name.value.trim().length < 2) { setErr(name, "Tên tối thiểu 2 ký tự."); return false; }
      clearErr(name); return true;
    }
    function validateEmailField() {
      const v = email.value.trim();
      if (!v) { setErr(email, "Vui lòng nhập email."); return false; }
      if (!isValidEmail(v)) { setErr(email, "Định dạng email không hợp lệ."); return false; }
      const exists = getUsers().some(u => u.email?.toLowerCase() === v.toLowerCase());
      if (exists) { setErr(email, "Email đã tồn tại."); return false; }
      clearErr(email); return true;
    }
    function validatePassField() {
      const v = pass.value;
      if (!v) { setErr(pass, "Vui lòng nhập mật khẩu."); return false; }
      if (!isStrongPass(v)) { setErr(pass, "Mật khẩu ≥ 8 ký tự, gồm chữ, số và ký tự đặc biệt."); return false; }
      clearErr(pass); return true;
    }
    function validateConfirmField() {
      if (!confirm.value) { setErr(confirm, "Vui lòng nhập lại mật khẩu."); return false; }
      if (confirm.value !== pass.value) { setErr(confirm, "Mật khẩu nhập lại không khớp."); return false; }
      clearErr(confirm); return true;
    }
    function validateTerms() {
      if (!terms.checked) { msg.textContent = "Bạn cần đồng ý điều khoản."; return false; }
      msg.textContent = ""; return true;
    }
    function validateAll() {
      const a = validateName();
      const b = validateEmailField();
      const c = validatePassField();
      const d = validateConfirmField();
      const e = validateTerms();
      submit.disabled = !(a && b && c && d && e);
      return !submit.disabled;
    }

    name.addEventListener("input", validateAll);
    email.addEventListener("input", validateAll);
    pass.addEventListener("input", () => { validatePassField(); validateConfirmField(); validateAll(); });
    confirm.addEventListener("input", () => { validateConfirmField(); validateAll(); });
    terms.addEventListener("change", validateAll);

    document.body.addEventListener("submit", (e) => {
      if (e.target.id !== "authRegister") return;
      e.preventDefault();
      if (!validateAll()) return;

      const users = getUsers();
      const vEmail = email.value.trim().toLowerCase();
      if (users.some(u => u.email?.toLowerCase() === vEmail)) {
        setErr(email, "Email đã tồn tại."); validateAll(); return;
      }
      const avatar = (name.value.trim()[0] || "U").toUpperCase();
      users.push({ name: name.value.trim(), email: vEmail, pass: pass.value, avatar });
      saveUsers(users);
      setCurrent({ name: name.value.trim(), email: vEmail, avatar });
      closeAllPopups();
      renderAuthUI();
      // >>> chạy callback chờ (nếu có)
      if (pendingAction) { try { pendingAction(); } finally { pendingAction = null; } }
    });

    submit.disabled = true;
    pass.setAttribute("minlength", "8");
    confirm.setAttribute("minlength", "8");
  }

  // ====== Avatar UI ======
  function createAvatar(initial = "U") {
    const btn = document.createElement("button");
    btn.id = "avatarBtn";
    btn.className = "avatar-btn";
    btn.setAttribute("aria-haspopup", "menu");
    btn.type = "button";
    btn.innerHTML = `<div class="avatar">${initial}</div>`;
    return btn;
  }

  function ensureMenu() {
    let menu = qs("#authMenu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "authMenu";
      menu.className = "auth-menu";
      menu.innerHTML = `
        <button type="button" id="meBtn"><i class="fa-regular fa-user"></i> Tài khoản</button>
        <button type="button" id="ordersBtn"><i class="fa-regular fa-clipboard"></i> Đơn hàng</button>
        <button type="button" id="logoutBtn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất</button>
      `;
      const actions = qs(".header-actions") || document.body;
      if (getComputedStyle(actions).position === 'static') actions.style.position = "relative";
      actions.appendChild(menu);

      menu.addEventListener("click", (e) => {
        const id = e.target.id || e.target.closest("button")?.id;
        if (id === "logoutBtn") { clearCurrent(); renderAuthUI(); hideMenu(); }
        if (id === "meBtn") { hideMenu(); alert("Trang tài khoản (demo)"); }
        if (id === "ordersBtn") { hideMenu(); alert("Trang đơn hàng (demo)"); }
      });
    }
    return menu;
  }
  const hideMenu = () => qs("#authMenu")?.classList.remove("show");

  function renderAuthUI() {
    const current = getCurrent();
    const loginBtn = qs("#loginBtn");
    let avatarBtn = qs("#avatarBtn");
    const userInfo = qs("#userInfo");

    if (current) {
      if (loginBtn) loginBtn.style.display = "none";
      if (!avatarBtn) {
        avatarBtn = createAvatar(current.avatar || (current.name?.[0] || "U").toUpperCase());
        (qs(".header-actions") || document.body).appendChild(avatarBtn);
        avatarBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const menu = ensureMenu();
          menu.classList.toggle("show");
        });
        document.addEventListener("click", hideMenu);
      } else {
        avatarBtn.querySelector(".avatar").textContent = current.avatar || (current.name?.[0] || "U").toUpperCase();
        avatarBtn.style.display = "";
      }
      if (userInfo) userInfo.textContent = `Xin chào, ${current.name}`;
    } else {
      if (loginBtn) loginBtn.style.display = "";
      if (avatarBtn) avatarBtn.remove();
      if (userInfo) userInfo.textContent = "";
    }
  }

  // ====== Bind header buttons ======
  function bindHeaderButtons() {
    const loginBtn = qs("#loginBtn");
    loginBtn?.addEventListener("click", () => openPopup("#loginPopup"));
  }

  // ====== Pending callback cho Auth.require(cb) ======
  let pendingAction = null;

  // ====== Public API ======
  window.Auth = {
    getCurrent,
    logout: () => { clearCurrent(); renderAuthUI(); },
    onChange: (cb) => window.addEventListener("auth:changed", (e) => cb?.(e.detail)),
    // FIX: lưu callback & tự chạy sau khi login/đăng ký thành công
    require: (cbIfOk) => {
      if (getCurrent()) return cbIfOk?.();
      pendingAction = typeof cbIfOk === 'function' ? cbIfOk : null;
      openPopup("#loginPopup");
    }
  };

  // ====== Init ======
  document.addEventListener("DOMContentLoaded", () => {
    ensureHeaderAnchors();
    injectStyles();
    injectPopups();
    bindPopupEvents();
    bindHeaderButtons();

    // gắn realtime validation sau khi popup có mặt trong DOM
    setupLoginValidation();
    setupRegisterValidation();

    renderAuthUI();
  });
})();
