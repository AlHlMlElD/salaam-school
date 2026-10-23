/* Salaam School — application shell, navigation, and shared UI. */
(function () {
  'use strict';

  const App = { pages: {} };
  const PAGES = {
    dashboard: 'لوحة التحكم', students: 'الطلاب', classes: 'الفصول', teachers: 'المدرسون',
    subjects: 'المواد', parents: 'أولياء الأمور', schedule: 'الجداول', attendance: 'الحضور والغياب',
    grades: 'الدرجات', certificates: 'الشهادات', payments: 'المصروفات', reports: 'التقارير',
    notifications: 'الإشعارات', settings: 'الإعدادات',
  };

  function base() { return Auth.base(); }

  function navFor(role) {
    const b = base();
    const dash = `${b}${Auth.home(role)}`;
    if (role === 'admin') {
      return [
        { title: 'الرئيسية', items: [{ page: 'dashboard', label: 'لوحة التحكم', icon: 'home', href: dash }] },
        { title: 'الإدارة', items: [
          { page: 'students', label: 'الطلاب', icon: 'users', href: `${b}pages/students.html` },
          { page: 'classes', label: 'الفصول', icon: 'layers', href: `${b}pages/classes.html` },
          { page: 'teachers', label: 'المدرسون', icon: 'user-check', href: `${b}pages/teachers.html` },
          { page: 'subjects', label: 'المواد', icon: 'book-open', href: `${b}pages/subjects.html` },
          { page: 'parents', label: 'أولياء الأمور', icon: 'users', href: `${b}pages/parents.html` },
        ] },
        { title: 'العمليات', items: [
          { page: 'schedule', label: 'الجداول', icon: 'calendar', href: `${b}pages/schedule.html` },
          { page: 'attendance', label: 'الحضور', icon: 'check-square', href: `${b}pages/attendance.html` },
          { page: 'grades', label: 'الدرجات', icon: 'award', href: `${b}pages/grades.html` },
          { page: 'certificates', label: 'الشهادات', icon: 'file-text', href: `${b}pages/certificates.html` },
          { page: 'payments', label: 'المصروفات', icon: 'credit-card', href: `${b}pages/payments.html` },
        ] },
        { title: 'المتابعة', items: [
          { page: 'reports', label: 'التقارير', icon: 'bar-chart-2', href: `${b}pages/reports.html` },
          { page: 'notifications', label: 'الإشعارات', icon: 'bell', href: `${b}pages/notifications.html` },
        ] },
      ];
    }
    if (role === 'teacher') {
      return [
        { title: 'الرئيسية', items: [{ page: 'dashboard', label: 'لوحة التحكم', icon: 'home', href: dash }] },
        { title: 'العمل اليومي', items: [
          { page: 'students', label: 'طلابي', icon: 'users', href: `${b}pages/students.html` },
          { page: 'classes', label: 'فصولي', icon: 'layers', href: `${b}pages/classes.html` },
          { page: 'schedule', label: 'جدولي', icon: 'calendar', href: `${b}pages/schedule.html` },
          { page: 'attendance', label: 'الحضور', icon: 'check-square', href: `${b}pages/attendance.html` },
          { page: 'grades', label: 'الدرجات', icon: 'award', href: `${b}pages/grades.html` },
        ] },
        { title: 'المتابعة', items: [{ page: 'notifications', label: 'الإشعارات', icon: 'bell', href: `${b}pages/notifications.html` }] },
      ];
    }
    if (role === 'student') {
      return [
        { title: 'الرئيسية', items: [{ page: 'dashboard', label: 'لوحة التحكم', icon: 'home', href: dash }] },
        { title: 'ملفي', items: [
          { page: 'schedule', label: 'جدولي', icon: 'calendar', href: `${b}pages/schedule.html` },
          { page: 'grades', label: 'درجاتي', icon: 'award', href: `${b}pages/grades.html` },
          { page: 'attendance', label: 'حضوري', icon: 'check-square', href: `${b}pages/attendance.html` },
          { page: 'certificates', label: 'شهاداتي', icon: 'file-text', href: `${b}pages/certificates.html` },
          { page: 'notifications', label: 'الإشعارات', icon: 'bell', href: `${b}pages/notifications.html` },
        ] },
      ];
    }
    return [
      { title: 'الرئيسية', items: [{ page: 'dashboard', label: 'لوحة التحكم', icon: 'home', href: dash }] },
      { title: 'متابعة الأبناء', items: [
        { page: 'schedule', label: 'الجداول', icon: 'calendar', href: `${b}pages/schedule.html` },
        { page: 'grades', label: 'الدرجات', icon: 'award', href: `${b}pages/grades.html` },
        { page: 'attendance', label: 'الحضور', icon: 'check-square', href: `${b}pages/attendance.html` },
        { page: 'payments', label: 'المصروفات', icon: 'credit-card', href: `${b}pages/payments.html` },
        { page: 'certificates', label: 'الشهادات', icon: 'file-text', href: `${b}pages/certificates.html` },
        { page: 'notifications', label: 'الإشعارات', icon: 'bell', href: `${b}pages/notifications.html` },
      ] },
    ];
  }

  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '؟';
    return parts.slice(0, 2).map((p) => p[0]).join('');
  }

  function avatar(name, photo, extra) {
    const cls = `avatar ${extra || ''}`.trim();
    if (photo) return `<span class="${cls}"><img src="${U.esc(photo)}" alt="${U.esc(name)}"></span>`;
    return `<span class="${cls}">${U.esc(initials(name))}</span>`;
  }

  function statCard(opts) {
    return `<div class="stat-card tone-${opts.tone || 'primary'}">
      <div class="stat-top"><div class="stat-icon"><i data-feather="${opts.icon || 'activity'}"></i></div>${opts.action || ''}</div>
      <div class="stat-value">${opts.value}</div>
      <div class="stat-label">${U.esc(opts.label)}</div>
      ${opts.delta ? `<div class="stat-delta ${opts.deltaTone || 'neutral'}">${opts.delta}</div>` : ''}
    </div>`;
  }

  function pageHead(title, subtitle, actions) {
    return `<div class="page-head">
      <div><h1>${U.esc(title)}</h1>${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}</div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>`;
  }

  function empty(icon, title, text) {
    return `<div class="empty"><div class="icon"><i data-feather="${icon || 'inbox'}"></i></div><h3>${U.esc(title)}</h3><p>${U.esc(text || '')}</p></div>`;
  }

  function toast(message, type) {
    let root = document.getElementById('toast-root');
    if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
    root.replaceChildren();
    const el = document.createElement('div');
    el.className = `toast ${type || 'success'}`;
    el.innerHTML = `<span class="dot"></span><span>${U.esc(message)}</span>`;
    root.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; setTimeout(() => el.remove(), 250); }, 3800);
  }

  function modal(opts) {
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head"><div class="modal-title">${U.esc(opts.title || '')}</div><button class="modal-close" type="button" aria-label="إغلاق"><i data-feather="x"></i></button></div>
      <div class="modal-body">${opts.body || ''}</div>
      ${opts.footer === false ? '' : `<div class="modal-foot">${opts.footer || ''}</div>`}
    </div>`;
    document.body.appendChild(root);
    const close = () => {
      root.remove();
      document.removeEventListener('keydown', onKey);
      if (opts.onClose) opts.onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    root.querySelector('.modal-close').onclick = close;
    if (window.feather) feather.replace();
    return { root, body: root.querySelector('.modal-body'), foot: root.querySelector('.modal-foot'), close };
  }

  function confirm(message, opts) {
    const o = opts || {};
    return new Promise((resolve) => {
      const m = modal({
        title: o.title || 'تأكيد',
        body: `<p style="color:var(--text);line-height:1.9">${U.esc(message)}</p>`,
        footer: `<button class="btn btn-ghost" data-no>إلغاء</button><button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" data-yes>${U.esc(o.confirmText || 'تأكيد')}</button>`,
      });
      m.root.querySelector('[data-no]').onclick = () => { m.close(); resolve(false); };
      m.root.querySelector('[data-yes]').onclick = () => { m.close(); resolve(true); };
    });
  }

  function visibleNotifications(user, list) {
    return list.filter((n) => n.targetRole === 'all' || n.targetRole === user.role)
      .filter((n) => !n.targetId || n.targetId === user.id || (user.childIds || []).includes(n.targetId));
  }

  async function refreshNotifications(user) {
    const all = await DB.all('notifications');
    const list = visibleNotifications(user, all).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const unread = list.filter((n) => !n.isRead).length;
    document.querySelectorAll('[data-notif-count]').forEach((el) => {
      el.textContent = unread > 9 ? '9+' : String(unread);
      el.classList.toggle('hidden', unread === 0);
    });
    const dropdown = document.getElementById('notif-list');
    if (dropdown) {
      if (!list.length) dropdown.innerHTML = empty('bell', 'لا توجد إشعارات', 'ستظهر هنا إشعارات المدرسة.');
      else dropdown.innerHTML = list.slice(0, 5).map((n) => `<div class="notif-item ${n.isRead ? '' : 'unread'}" data-notif-id="${n.id}">
        <div class="ico"><i data-feather="${n.type === 'warning' || n.type === 'alert' ? 'alert-triangle' : n.type === 'success' ? 'check-circle' : 'info'}"></i></div>
        <div class="txt"><div class="t">${U.esc(n.title)}</div><div class="b">${U.esc(n.body)}</div><div class="d">${U.fmtDate(n.createdAt)}</div></div>
      </div>`).join('');
      dropdown.querySelectorAll('[data-notif-id]').forEach((el) => {
        el.onclick = async () => {
          const id = Number(el.dataset.notifId);
          const n = await DB.get('notifications', id);
          if (n) { n.isRead = true; await DB.put('notifications', n); }
          await refreshNotifications(user);
          el.classList.remove('unread');
        };
      });
    }
    if (window.feather) feather.replace();
    return list;
  }

  function buildShell(user, page) {
    const b = base();
    const nav = navFor(user.role).map((group) => `<div class="nav-section">
      <div class="nav-title">${group.title}</div>
      ${group.items.map((item) => `<a class="nav-link ${item.page === page ? 'active' : ''}" href="${item.href}">
        <i data-feather="${item.icon}"></i><span>${item.label}</span>
        ${item.page === 'notifications' ? '<span class="nav-badge hidden" data-notif-count></span>' : ''}
      </a>`).join('')}
    </div>`).join('');

    const title = PAGES[page] || 'لوحة التحكم';
    document.getElementById('app').innerHTML = `<div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="sidebar-brand" href="${b}${Auth.home(user.role)}">
          <span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" fill="#fff" opacity=".96"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21.5V5.5Z" fill="#fff" opacity=".78"/><path d="M12 3v16" stroke="#6d28d9" stroke-width="1.1"/></svg></span>
          <span class="brand-text"><span class="brand-name">مدرسة السلام</span><span class="brand-sub">نظام الإدارة المدرسية</span></span>
        </a>
        <div class="sidebar-scroll">${nav}</div>
        <div class="sidebar-user">
          ${avatar(user.name, user.avatar)}
          <div class="meta"><div class="name">${U.esc(user.name)}</div><div class="role">${U.roleLabel(user.role)}</div></div>
          <button class="logout" id="sidebar-logout" title="تسجيل الخروج"><i data-feather="log-out"></i></button>
        </div>
        <div class="sidebar-foot"><span>السلام © 2026</span><span>v1.0</span></div>
      </aside>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="app-main">
        <header class="topbar">
          <button class="menu-btn" id="menu-btn" aria-label="القائمة"><i data-feather="menu"></i></button>
          <div class="topbar-title"><div class="crumb">مدرسة السلام / ${U.roleLabel(user.role)}</div><div class="title">${U.esc(title)}</div></div>
          <div class="topbar-spacer"></div>
          <div class="topbar-actions">
            ${user.role === 'admin' || user.role === 'teacher' ? `<div class="search" id="global-search-wrap"><i data-feather="search"></i><input class="input" id="global-search" placeholder="بحث سريع..." autocomplete="off"></div>` : ''}
            <div class="notif-wrap">
              <button class="icon-btn" id="notif-btn" aria-label="الإشعارات"><i data-feather="bell"></i><span class="dot-badge hidden" data-notif-count></span></button>
              <div class="notif-dropdown" id="notif-dropdown">
                <div class="notif-head"><span>الإشعارات</span><button class="btn btn-sm btn-ghost" id="notif-read-all">قرأت الكل</button></div>
                <div class="notif-list" id="notif-list"></div>
                <div class="notif-foot"><a href="${b}pages/notifications.html">عرض كل الإشعارات</a></div>
              </div>
            </div>
            <div class="user-menu">
              <button class="user-chip" id="user-btn">${avatar(user.name, user.avatar)}<span class="meta"><span class="name">${U.esc(user.name)}</span><span class="role">${U.roleLabel(user.role)}</span></span><i data-feather="chevron-down" style="width:14px;height:14px"></i></button>
              <div class="user-dropdown" id="user-dropdown">
                ${user.role === 'admin' ? `<a href="${b}pages/settings.html"><i data-feather="settings"></i>الإعدادات</a>` : ''}
                <a href="${b}${Auth.home(user.role)}"><i data-feather="user"></i>ملفي</a>
                <button class="danger" id="topbar-logout"><i data-feather="log-out"></i>تسجيل الخروج</button>
              </div>
            </div>
          </div>
        </header>
        <main class="page" id="page"></main>
      </div>
    </div>`;

    document.getElementById('menu-btn').onclick = () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebar-overlay').classList.add('show');
    };
    document.getElementById('sidebar-overlay').onclick = closeSidebar;
    document.querySelectorAll('.nav-link').forEach((a) => a.addEventListener('click', closeSidebar));
    document.getElementById('sidebar-logout').onclick = Auth.logout;
    document.getElementById('topbar-logout').onclick = Auth.logout;

    const userBtn = document.getElementById('user-btn');
    const userDropdown = document.getElementById('user-dropdown');
    userBtn.onclick = (e) => { e.stopPropagation(); userDropdown.classList.toggle('show'); document.getElementById('notif-dropdown').classList.remove('show'); };
    const notifBtn = document.getElementById('notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    notifBtn.onclick = (e) => { e.stopPropagation(); notifDropdown.classList.toggle('show'); userDropdown.classList.remove('show'); };
    document.addEventListener('click', () => { userDropdown.classList.remove('show'); notifDropdown.classList.remove('show'); });
    notifDropdown.onclick = (e) => e.stopPropagation();
    document.getElementById('notif-read-all').onclick = async (e) => {
      e.stopPropagation();
      const all = await DB.all('notifications');
      for (const n of visibleNotifications(user, all)) {
        if (!n.isRead) { n.isRead = true; await DB.put('notifications', n); }
      }
      await refreshNotifications(user);
      toast('تم تعليم كل الإشعارات كمقروءة');
    };

    initGlobalSearch(user);
    refreshNotifications(user);
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  }

  function initGlobalSearch(user) {
    if (user.role !== 'admin' && user.role !== 'teacher') return;
    const input = document.getElementById('global-search');
    const wrap = document.getElementById('global-search-wrap');
    if (!input) return;
    const pop = document.createElement('div');
    pop.className = 'search-pop';
    wrap.appendChild(pop);
    const run = U.debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) { pop.classList.remove('show'); return; }
      const [students, classes, teachers] = await Promise.all([DB.all('students'), DB.all('classes'), DB.all('teachers')]);
      let scoped = students;
      if (user.role === 'teacher') {
        const me = teachers.find((t) => t.id === user.teacherId);
        const classIds = me ? (me.classes || []) : [];
        scoped = students.filter((s) => classIds.includes(s.classId));
      }
      const matches = scoped.filter((s) => s.fullName.includes(q) || String(s.studentId).includes(q)).slice(0, 6);
      if (!matches.length) { pop.innerHTML = '<div class="search-empty">لا توجد نتائج</div>'; pop.classList.add('show'); return; }
      pop.innerHTML = matches.map((s) => {
        const cls = classes.find((c) => c.id === s.classId);
        return `<button type="button" class="search-item" data-student="${s.id}">${avatar(s.fullName, s.photo)}<span class="meta"><span class="n">${U.esc(s.fullName)}</span><span class="s">${U.esc(s.studentId)} · ${U.esc(cls ? cls.className : '—')}</span></span></button>`;
      }).join('');
      pop.classList.add('show');
      pop.querySelectorAll('[data-student]').forEach((btn) => {
        btn.onclick = () => { location.href = `${base()}pages/students.html?student=${btn.dataset.student}`; };
      });
    }, 180);
    input.addEventListener('input', run);
    input.addEventListener('focus', run);
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) pop.classList.remove('show'); });
  }

  App.start = async function start() {
    try {
      await DB.open();
      await Seed.run();
      const page = document.body.dataset.page || 'dashboard';
      const roles = document.body.dataset.roles || '';
      const user = Auth.guard(roles);
      if (!user) return;
      buildShell(user, page);
      const container = document.getElementById('page');
      const mod = App.pages[page];
      if (!mod || typeof mod.render !== 'function') {
        container.innerHTML = empty('alert-circle', 'الصفحة غير موجودة', 'هذه الصفحة لم تُسجّل بعد.');
      } else {
        await mod.render(container, user);
      }
      if (window.AI) AI.init(user);
      if (window.feather) feather.replace();
    } catch (error) {
      console.error(error);
      const app = document.getElementById('app');
      if (app) app.innerHTML = `<div class="page"><div class="card"><div class="card-body"><h2>تعذر تشغيل التطبيق</h2><p class="muted mt-2">${U.esc(error.message)}</p><button class="btn btn-primary mt-3" onclick="location.reload()">إعادة المحاولة</button></div></div></div>`;
    }
  };

  App.modal = modal;
  App.confirm = confirm;
  App.toast = toast;
  App.empty = empty;
  App.statCard = statCard;
  App.pageHead = pageHead;
  App.avatar = avatar;
  App.initials = initials;
  App.refreshNotifications = refreshNotifications;
  App.visibleNotifications = visibleNotifications;
  App.base = base;
  App.PAGES = PAGES;
  window.App = App;
})();
