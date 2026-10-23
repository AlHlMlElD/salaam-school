/* Salaam School — classes management. */
(function () {
  'use strict';

  let user = null;
  let cache = { classes: [], students: [], teachers: [] };
  let state = { q: '', grade: '' };

  function studentCount(classId) { return cache.students.filter((s) => s.classId === classId).length; }
  function teacherName(id) { const t = cache.teachers.find((x) => x.id === id); return t ? t.fullName : '—'; }
  function filtered() {
    return cache.classes.filter((c) => {
      if (state.grade && c.grade !== state.grade) return false;
      if (state.q && !(`${c.className} ${c.section} ${c.room}`.includes(state.q))) return false;
      return true;
    });
  }

  function cardsHtml(list) {
    if (!list.length) return `<div class="card"><div class="card-body">${App.empty('layers', 'لا توجد فصول', 'أضف فصلاً جديدًا للبدء.')}</div></div>`;
    return list.map((c) => {
      const count = studentCount(c.id);
      const fill = Math.round((count / c.capacity) * 100);
      return `<div class="class-card">
        <div class="top"><div class="icon"><i data-feather="layers"></i></div><div class="row" style="gap:5px">${U.badge(`الصف ${c.grade}`, 'primary')}${U.badge(c.section, 'muted')}</div></div>
        <h3>${U.esc(c.className)}</h3><div class="teacher">${U.esc(teacherName(c.teacherId))} · ${U.esc(c.room)}</div>
        <div class="stats"><span>الطلاب <b>${count}</b></span><span>السعة <b>${c.capacity}</b></span><span>الامتلاء <b>${fill}%</b></span></div>
        <div class="progress mt-2 ${fill > 90 ? 'red' : fill > 70 ? 'amber' : 'green'}"><span style="width:${Math.min(100, fill)}%"></span></div>
        <div class="row mt-2" style="justify-content:space-between"><span class="small muted">${U.esc(c.year)}</span><div class="table-actions">
          <button class="btn btn-sm btn-ghost" data-view="${c.id}"><i data-feather="users"></i> الطلاب</button>
          ${user.role === 'admin' ? `<button class="btn btn-sm btn-ghost" data-edit="${c.id}"><i data-feather="edit-2"></i></button><button class="btn btn-sm btn-danger" data-del="${c.id}"><i data-feather="trash-2"></i></button>` : ''}
        </div></div>
      </div>`;
    }).join('');
  }

  function renderCards() {
    const el = document.getElementById('class-grid');
    if (el) el.innerHTML = cardsHtml(filtered());
    const count = document.getElementById('class-count');
    if (count) count.textContent = `${filtered().length} فصل`;
    bind();
    if (window.feather) feather.replace();
  }

  function bind() {
    document.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => viewClass(Number(b.dataset.view)); });
    document.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => openForm(cache.classes.find((c) => c.id === Number(b.dataset.edit))); });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const c = cache.classes.find((x) => x.id === Number(b.dataset.del));
        if (!c) return;
        const count = studentCount(c.id);
        const ok = await App.confirm(count ? `الفصل "${c.className}" به ${count} طالب. حذف الفصل لن يحذف الطلاب، لكن سيصبحون بدون فصل.` : `حذف الفصل "${c.className}"؟`, { danger: true, confirmText: 'حذف' });
        if (!ok) return;
        await DB.del('classes', c.id);
        App.toast('تم حذف الفصل');
        await load();
      };
    });
  }

  function viewClass(id) {
    const c = cache.classes.find((x) => x.id === id);
    if (!c) return;
    const students = cache.students.filter((s) => s.classId === id);
    const m = App.modal({
      title: `طلاب ${c.className}`,
      wide: true,
      body: `<div class="row-between mb-3"><div><div class="strong">${U.esc(c.className)}</div><div class="small muted">${U.esc(teacherName(c.teacherId))} · ${U.esc(c.room)} · ${U.esc(c.year)}</div></div><span class="badge badge-primary">${students.length} طالب</span></div>
        ${students.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>الطالب</th><th>رقم الطالب</th><th>الحالة</th><th></th></tr></thead><tbody>${students.map((s) => `<tr><td><div class="cell-main">${App.avatar(s.fullName, s.photo)}<div class="name">${U.esc(s.fullName)}</div></div></td><td>${U.esc(s.studentId)}</td><td>${U.badge(s.status === 'active' ? 'نشط' : 'غير نشط', s.status === 'active' ? 'success' : 'muted')}</td><td><a class="btn btn-sm btn-ghost" href="${App.base()}pages/students.html?student=${s.id}">ملف</a></td></tr>`).join('')}</tbody></table></div>` : App.empty('users', 'لا يوجد طلاب', 'هذا الفصل فارغ حاليًا.')}`,
      footer: `<button class="btn btn-ghost" data-close>إغلاق</button>`,
    });
    m.root.querySelector('[data-close]').onclick = m.close;
  }

  function openForm(cls) {
    const isEdit = !!cls;
    const c = cls || { className: '', grade: '1', section: 'أ', teacherId: cache.teachers[0] ? cache.teachers[0].id : '', capacity: 30, room: '', year: '2026-2027' };
    const teacherOptions = cache.teachers.map((t) => `<option value="${t.id}" ${String(t.id) === String(c.teacherId) ? 'selected' : ''}>${U.esc(t.fullName)}</option>`).join('');
    const m = App.modal({
      title: isEdit ? 'تعديل الفصل' : 'إضافة فصل',
      body: `<form id="class-form" class="form-grid">
        <div class="field full-span"><label>اسم الفصل *</label><input class="input" name="className" value="${U.esc(c.className)}" required placeholder="مثال: الصف الأول أ"></div>
        <div class="field"><label>الصف</label><select class="select" name="grade">${['1', '2', '3'].map((g) => `<option value="${g}" ${c.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
        <div class="field"><label>الشعبة</label><input class="input" name="section" value="${U.esc(c.section)}" required></div>
        <div class="field"><label>المدرس المسؤول</label><select class="select" name="teacherId">${teacherOptions}</select></div>
        <div class="field"><label>السعة</label><input class="input" type="number" min="1" name="capacity" value="${c.capacity}"></div>
        <div class="field"><label>القاعة</label><input class="input" name="room" value="${U.esc(c.room)}"></div>
        <div class="field"><label>العام الدراسي</label><input class="input" name="year" value="${U.esc(c.year)}"></div>
      </form>`,
      footer: `<button class="btn btn-ghost" data-cancel>إلغاء</button><button class="btn btn-primary" id="save-class"><i data-feather="save"></i> حفظ</button>`,
    });
    m.root.querySelector('[data-cancel]').onclick = m.close;
    m.root.querySelector('#save-class').onclick = async () => {
      const form = m.root.querySelector('#class-form');
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const value = {
        className: String(fd.get('className')).trim(), grade: fd.get('grade'), section: String(fd.get('section')).trim(),
        teacherId: Number(fd.get('teacherId')), capacity: Number(fd.get('capacity')), room: String(fd.get('room')).trim(), year: String(fd.get('year')).trim(),
      };
      if (isEdit) { value.id = c.id; await DB.put('classes', value); App.toast('تم تحديث الفصل'); }
      else { await DB.add('classes', value); App.toast('تمت إضافة الفصل'); }
      m.close();
      await load();
    };
  }

  async function load() {
    const [classes, students, teachers] = await Promise.all([DB.all('classes'), DB.all('students'), DB.all('teachers')]);
    cache = { classes, students, teachers };
    if (user.role === 'teacher') {
      const me = teachers.find((t) => t.id === user.teacherId);
      const ids = me ? (me.classes || []) : [];
      cache.classes = classes.filter((c) => ids.includes(c.id));
    }
    renderCards();
  }

  App.pages.classes = {
    async render(container, currentUser) {
      user = currentUser;
      await load();
      container.innerHTML = `<div class="page-head"><div><h1>الفصول الدراسية</h1><div class="subtitle">نظرة عامة على الفصول، السعة، والمدرسين المسؤولين.</div></div>
        <div class="page-actions">${user.role === 'admin' ? `<button class="btn btn-primary" id="add-class"><i data-feather="plus"></i> إضافة فصل</button>` : ''}</div></div>
        <div class="card mb-3"><div class="card-body"><div class="row wrap" style="gap:8px">
          <div class="search"><i data-feather="search"></i><input class="input" id="class-search" placeholder="ابحث عن فصل..."></div>
          <select class="select" id="grade-filter" style="width:auto"><option value="">كل الصفوف</option><option value="1">الصف الأول</option><option value="2">الصف الثاني</option><option value="3">الصف الثالث</option></select>
          <span class="badge badge-primary" id="class-count" style="margin-right:auto">0 فصل</span>
        </div></div></div>
        <div class="class-grid" id="class-grid"></div>`;
      renderCards();
      document.getElementById('class-search').addEventListener('input', U.debounce((e) => { state.q = e.target.value; renderCards(); }, 180));
      document.getElementById('grade-filter').addEventListener('change', (e) => { state.grade = e.target.value; renderCards(); });
      const add = document.getElementById('add-class');
      if (add) add.onclick = () => openForm(null);
    },
  };
})();
