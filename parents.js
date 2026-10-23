/* Salaam School — parents directory. */
(function () {
  'use strict';

  let cache = { parents: [], students: [], classes: [], payments: [], attendance: [], grades: [] };
  let state = { q: '' };

  function childrenOf(parent) { return cache.students.filter((s) => (parent.childIds || []).includes(s.id)); }
  function unpaidFor(children) {
    const ids = children.map((c) => c.id);
    return cache.payments.filter((p) => ids.includes(p.studentId) && p.status !== 'paid').reduce((sum, p) => sum + Math.max(0, Number(p.amount) - Number(p.paidAmount || 0)), 0);
  }
  function filtered() {
    return cache.parents.filter((p) => !state.q || `${p.name} ${p.email} ${p.phone}`.includes(state.q));
  }

  function renderTable() {
    const list = filtered();
    const el = document.getElementById('parents-table');
    if (!el) return;
    el.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>ولي الأمر</th><th>الأبناء</th><th>الهاتف</th><th>البريد</th><th>مستحقات</th><th></th></tr></thead><tbody>${list.length ? list.map((p) => {
      const children = childrenOf(p);
      return `<tr><td><div class="cell-main">${App.avatar(p.name)}<div><div class="name">${U.esc(p.name)}</div><div class="sub">${children.length} ابن/ابنة</div></div></div></td>
        <td>${children.map((c) => `<span class="pill">${U.esc(c.fullName)}</span>`).join(' ') || '—'}</td>
        <td dir="ltr" style="text-align:right">${U.esc(p.phone)}</td>
        <td>${U.esc(p.email)}</td>
        <td>${U.money(unpaidFor(children))}</td>
        <td><button class="btn btn-sm btn-ghost" data-view="${p.id}"><i data-feather="eye"></i></button></td></tr>`;
    }).join('') : `<tr><td colspan="6">${App.empty('users', 'لا يوجد أولياء أمور', '')}</td></tr>`}</tbody></table></div>`;
    document.getElementById('parents-count').textContent = `${list.length} ولي أمر`;
    bind();
    if (window.feather) feather.replace();
  }

  function bind() {
    document.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => viewParent(Number(b.dataset.view)); });
  }

  function viewParent(id) {
    const p = cache.parents.find((x) => x.id === id);
    if (!p) return;
    const children = childrenOf(p);
    const cards = children.map((child) => {
      const att = cache.attendance.filter((a) => a.studentId === child.id);
      const rate = att.length ? Math.round((att.filter((a) => a.status === 'present' || a.status === 'late').length / att.length) * 100) : 0;
      const grades = cache.grades.filter((g) => g.studentId === child.id);
      const avg = grades.length ? grades.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / grades.length : 0;
      const cls = cache.classes.find((c) => c.id === child.classId);
      return `<div class="card"><div class="card-body"><div class="row" style="gap:10px">${App.avatar(child.fullName, child.photo, 'lg')}<div><div class="strong">${U.esc(child.fullName)}</div><div class="small muted">${U.esc(cls ? cls.className : '—')} · ${U.esc(child.studentId)}</div></div></div><div class="grid grid-3 mt-2" style="gap:6px"><div><div class="small muted">المعدل</div><b>${avg.toFixed(1)}%</b></div><div><div class="small muted">الحضور</div><b>${rate}%</b></div><div><div class="small muted">مستحق</div><b>${U.money(unpaidFor([child]))}</b></div></div></div></div>`;
    }).join('');
    const m = App.modal({
      title: 'ملف ولي الأمر',
      wide: true,
      body: `<div class="profile-hero">${App.avatar(p.name, '', 'xl')}<div class="meta"><div class="name">${U.esc(p.name)}</div><div class="sub">${U.esc(p.email)} · <span dir="ltr">${U.esc(p.phone)}</span></div><div class="pill-row mt-1"><span class="pill">${children.length} أبناء</span><span class="pill">${U.money(unpaidFor(children))} مستحقات</span></div></div></div>
        <div class="grid grid-2 mt-3">${cards || App.empty('users', 'لا يوجد أبناء مرتبطون', '')}</div>`,
      footer: `<button class="btn btn-ghost" data-close>إغلاق</button>`,
    });
    m.root.querySelector('[data-close]').onclick = m.close;
  }

  async function load() {
    const [users, students, classes, payments, attendance, grades] = await Promise.all([DB.all('users'), DB.all('students'), DB.all('classes'), DB.all('payments'), DB.all('attendance'), DB.all('grades')]);
    cache = { parents: users.filter((u) => u.role === 'parent'), students, classes, payments, attendance, grades };
    renderTable();
  }

  App.pages.parents = {
    async render(container) {
      await load();
      container.innerHTML = `<div class="page-head"><div><h1>أولياء الأمور</h1><div class="subtitle">دليل أولياء الأمور والأبناء المرتبطين بهم.</div></div></div>
        <div class="card"><div class="card-head"><div class="row wrap" style="gap:8px;width:100%"><div class="search"><i data-feather="search"></i><input class="input" id="parent-search" placeholder="ابحث بالاسم أو البريد أو الهاتف..."></div><span class="badge badge-primary" id="parents-count" style="margin-right:auto">0</span></div></div><div class="card-body"><div id="parents-table"></div></div></div>`;
      renderTable();
      document.getElementById('parent-search').addEventListener('input', U.debounce((e) => { state.q = e.target.value; renderTable(); }, 160));
    },
  };
})();
