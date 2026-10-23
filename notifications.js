/* Salaam School — notifications center. */
(function () {
  'use strict';

  let user = null;
  let cache = { notifications: [] };
  let state = { q: '', type: '', unread: false };

  function visible() { return App.visibleNotifications(user, cache.notifications); }
  function filtered() {
    return visible().filter((n) => {
      if (state.type && n.type !== state.type) return false;
      if (state.unread && n.isRead) return false;
      if (state.q && !`${n.title} ${n.body}`.includes(state.q)) return false;
      return true;
    }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  function iconFor(type) { return type === 'warning' || type === 'alert' ? 'alert-triangle' : type === 'success' ? 'check-circle' : 'info'; }

  function renderList() {
    const list = filtered();
    const el = document.getElementById('notifications-list');
    if (!el) return;
    el.innerHTML = list.length ? list.map((n) => `<div class="card mb-2 ${n.isRead ? '' : 'unread-card'}" style="${n.isRead ? '' : 'border-color:rgba(139,92,246,.28)'}">
      <div class="card-body"><div class="row" style="align-items:flex-start;gap:12px">
        <div class="icon-lg" style="background:${n.type === 'warning' || n.type === 'alert' ? 'var(--warning-soft)' : n.type === 'success' ? 'var(--success-soft)' : 'var(--primary-soft)'};color:${n.type === 'warning' || n.type === 'alert' ? 'var(--warning)' : n.type === 'success' ? 'var(--success)' : 'var(--primary-2)'}"><i data-feather="${iconFor(n.type)}"></i></div>
        <div style="flex:1;min-width:0"><div class="row-between"><div class="strong">${U.esc(n.title)}</div><span class="small muted">${U.fmtDate(n.createdAt)}</span></div>
        <div class="small muted mt-1" style="line-height:1.9">${U.esc(n.body)}</div>
        <div class="pill-row mt-2">${U.badge(n.targetRole === 'all' ? 'للجميع' : U.roleLabel(n.targetRole), 'muted')}${n.isRead ? U.badge('مقروء', 'muted') : U.badge('جديد', 'primary')}</div></div>
        <div class="table-actions" style="flex-direction:column">${!n.isRead ? `<button class="btn btn-sm btn-ghost" data-read="${n.id}">قرأت</button>` : ''}${user.role === 'admin' ? `<button class="btn btn-sm btn-danger" data-del="${n.id}"><i data-feather="trash-2"></i></button>` : ''}</div>
      </div></div></div>`).join('') : `<div class="card"><div class="card-body">${App.empty('bell', 'لا توجد إشعارات', '')}</div></div>`;
    const count = document.getElementById('notif-total');
    if (count) count.textContent = `${list.length}`;
    const unread = document.getElementById('notif-unread');
    if (unread) unread.textContent = `${list.filter((n) => !n.isRead).length}`;
    bind();
    if (window.feather) feather.replace();
  }

  function bind() {
    document.querySelectorAll('[data-read]').forEach((b) => {
      b.onclick = async () => { const n = await DB.get('notifications', Number(b.dataset.read)); if (n) { n.isRead = true; await DB.put('notifications', n); } await load(); };
    });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const ok = await App.confirm('حذف هذا الإشعار؟', { danger: true, confirmText: 'حذف' });
        if (!ok) return;
        await DB.del('notifications', Number(b.dataset.del)); App.toast('تم حذف الإشعار'); await load();
      };
    });
  }

  function openForm() {
    const m = App.modal({
      title: 'إرسال إشعار',
      body: `<form id="notif-form" class="form-grid">
        <div class="field full-span"><label>العنوان *</label><input class="input" name="title" required placeholder="عنوان الإشعار"></div>
        <div class="field full-span"><label>النص *</label><textarea class="textarea" name="body" required placeholder="تفاصيل الإشعار..."></textarea></div>
        <div class="field"><label>الموجه إلى</label><select class="select" name="targetRole"><option value="all">الجميع</option><option value="admin">الإدارة</option><option value="teacher">المدرسون</option><option value="student">الطلاب</option><option value="parent">أولياء الأمور</option></select></div>
        <div class="field"><label>النوع</label><select class="select" name="type"><option value="info">معلومة</option><option value="success">نجاح</option><option value="warning">تحذير</option><option value="alert">تنبيه</option></select></div>
      </form>`,
      footer: `<button class="btn btn-ghost" data-cancel>إلغاء</button><button class="btn btn-primary" id="send-notif"><i data-feather="send"></i> إرسال</button>`,
    });
    m.root.querySelector('[data-cancel]').onclick = m.close;
    m.root.querySelector('#send-notif').onclick = async () => {
      const form = m.root.querySelector('#notif-form');
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      await DB.add('notifications', { title: String(fd.get('title')).trim(), body: String(fd.get('body')).trim(), targetRole: fd.get('targetRole'), type: fd.get('type'), isRead: false, createdAt: U.todayISO() });
      m.close(); App.toast('تم إرسال الإشعار'); await load();
    };
  }

  async function load() {
    cache.notifications = await DB.all('notifications');
    renderList();
    if (user) await App.refreshNotifications(user);
  }

  App.pages.notifications = {
    async render(container, currentUser) {
      user = currentUser;
      await load();
      container.innerHTML = `<div class="page-head"><div><h1>الإشعارات</h1><div class="subtitle">كل التنبيهات والإعلانات الموجهة لك.</div></div><div class="page-actions">${user.role === 'admin' ? `<button class="btn btn-primary" id="add-notif"><i data-feather="plus"></i> إشعار جديد</button>` : ''}<button class="btn btn-ghost" id="read-all"><i data-feather="check-circle"></i> قرأت الكل</button></div></div>
        <div class="stats-grid mb-3" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          ${App.statCard({ icon: 'bell', label: 'إجمالي الإشعارات', value: '<span id="notif-total">0</span>', tone: 'primary' })}
          ${App.statCard({ icon: 'circle', label: 'غير مقروءة', value: '<span id="notif-unread">0</span>', tone: 'danger' })}
          ${App.statCard({ icon: 'users', label: 'موجهة للجميع', value: visible().filter((n) => n.targetRole === 'all').length, tone: 'cyan' })}
        </div>
        <div class="card mb-3"><div class="card-body"><div class="row wrap" style="gap:8px">
          <div class="search"><i data-feather="search"></i><input class="input" id="notif-search" placeholder="ابحث في الإشعارات..."></div>
          <select class="select" id="notif-type" style="width:auto"><option value="">كل الأنواع</option><option value="info">معلومة</option><option value="success">نجاح</option><option value="warning">تحذير</option><option value="alert">تنبيه</option></select>
          <label class="check"><input type="checkbox" id="notif-unread-only"> غير مقروءة فقط</label>
        </div></div></div>
        <div id="notifications-list"></div>`;
      renderList();
      document.getElementById('notif-search').addEventListener('input', U.debounce((e) => { state.q = e.target.value; renderList(); }, 160));
      document.getElementById('notif-type').addEventListener('change', (e) => { state.type = e.target.value; renderList(); });
      document.getElementById('notif-unread-only').addEventListener('change', (e) => { state.unread = e.target.checked; renderList(); });
      document.getElementById('read-all').onclick = async () => {
        for (const n of visible()) { if (!n.isRead) { n.isRead = true; await DB.put('notifications', n); } }
        App.toast('تم تعليم الكل كمقروء'); await load();
      };
      const add = document.getElementById('add-notif');
      if (add) add.onclick = openForm;
    },
  };
})();
