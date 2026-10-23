/* Salaam School — students management. */
(function () {
  'use strict';

  let state = { page: 1, perPage: 10, q: '', classId: '', status: '', gender: '' };
  let cache = { students: [], classes: [], parents: [], attendance: [], grades: [], payments: [], teachers: [] };
  let scoped = [];
  let user = null;

  function parentName(id) {
    const p = cache.parents.find((x) => x.id === id);
    return p ? p.name : '—';
  }
  function className(id) {
    const c = cache.classes.find((x) => x.id === id);
    return c ? c.className : '—';
  }
  function filtered() {
    const q = state.q.trim();
    return scoped.filter((s) => {
      if (state.classId && String(s.classId) !== String(state.classId)) return false;
      if (state.status && s.status !== state.status) return false;
      if (state.gender && s.gender !== state.gender) return false;
      if (q && !(s.fullName.includes(q) || String(s.studentId).includes(q) || String(s.phone).includes(q))) return false;
      return true;
    });
  }
  function rateFor(studentId) {
    const rows = cache.attendance.filter((a) => a.studentId === studentId);
    if (!rows.length) return 0;
    return Math.round((rows.filter((a) => a.status === 'present' || a.status === 'late').length / rows.length) * 100);
  }
  function avgFor(studentId) {
    const rows = cache.grades.filter((g) => g.studentId === studentId);
    if (!rows.length) return 0;
    return rows.reduce((sum, g) => sum + (Number(g.score) / Number(g.maxScore || 100)) * 100, 0) / rows.length;
  }

  function rowsHtml(list) {
    if (!list.length) return `<tr><td colspan="7">${App.empty('users', 'لا يوجد طلاب', 'جرّب تغيير البحث أو الفلتر.')}</td></tr>`;
    return list.map((s) => `<tr>
      <td><div class="cell-main">${App.avatar(s.fullName, s.photo)}<div><div class="name">${U.esc(s.fullName)}</div><div class="sub">${U.esc(s.studentId)}</div></div></div></td>
      <td>${U.esc(className(s.classId))}</td>
      <td>${s.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
      <td>${U.esc(parentName(s.parentId))}</td>
      <td dir="ltr" style="text-align:right">${U.esc(s.phone)}</td>
      <td>${U.badge(s.status === 'active' ? 'نشط' : 'غير نشط', s.status === 'active' ? 'success' : 'muted')}</td>
      <td><div class="table-actions">
        <button class="btn btn-sm btn-ghost" data-view="${s.id}" title="عرض"><i data-feather="eye"></i></button>
        ${user.role === 'admin' ? `<button class="btn btn-sm btn-ghost" data-edit="${s.id}" title="تعديل"><i data-feather="edit-2"></i></button><button class="btn btn-sm btn-danger" data-del="${s.id}" title="حذف"><i data-feather="trash-2"></i></button>` : ''}
      </div></td>
    </tr>`).join('');
  }

  function tableHtml(list) {
    return `<div class="table-wrap"><table class="data"><thead><tr><th>الطالب</th><th>الفصل</th><th>الجنس</th><th>ولي الأمر</th><th>الهاتف</th><th>الحالة</th><th></th></tr></thead><tbody>${rowsHtml(list)}</tbody></table></div>`;
  }

  function paginationHtml(total) {
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    const current = Math.min(state.page, pages);
    let start = Math.max(1, current - 2);
    let end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    const buttons = [];
    for (let i = start; i <= end; i += 1) buttons.push(`<button class="page-btn ${i === current ? 'active' : ''}" data-page="${i}">${i}</button>`);
    return `<div class="pagination"><div class="info">عرض ${total ? (current - 1) * state.perPage + 1 : 0}–${Math.min(current * state.perPage, total)} من ${total}</div>
      <div class="pages"><button class="page-btn" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>‹</button>${buttons.join('')}<button class="page-btn" data-page="${current + 1}" ${current === pages ? 'disabled' : ''}>›</button></div></div>`;
  }

  function renderTable() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / state.perPage));
    if (state.page > pages) state.page = pages;
    const start = (state.page - 1) * state.perPage;
    const visible = list.slice(start, start + state.perPage);
    const body = document.getElementById('students-table');
    const pag = document.getElementById('students-pagination');
    if (body) body.innerHTML = tableHtml(visible);
    if (pag) pag.innerHTML = paginationHtml(list.length);
    bindRows();
    if (window.feather) feather.replace();
  }

  function bindRows() {
    document.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => viewStudent(Number(b.dataset.view)); });
    document.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => openForm(cache.students.find((s) => s.id === Number(b.dataset.edit))); });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const s = cache.students.find((x) => x.id === Number(b.dataset.del));
        if (!s) return;
        const ok = await App.confirm(`حذف الطالب "${s.fullName}"؟ سيتم حذف بياناته الأساسية.`, { danger: true, confirmText: 'حذف' });
        if (!ok) return;
        await DB.del('students', s.id);
        App.toast('تم حذف الطالب');
        await load();
      };
    });
    document.querySelectorAll('[data-page]').forEach((b) => {
      b.onclick = () => { const p = Number(b.dataset.page); if (p >= 1) { state.page = p; renderTable(); } };
    });
  }

  function viewStudent(id) {
    const s = cache.students.find((x) => x.id === id);
    if (!s) return;
    const rate = rateFor(s.id);
    const avg = avgFor(s.id);
    const due = cache.payments.filter((p) => p.studentId === s.id && p.status !== 'paid').reduce((sum, p) => sum + Math.max(0, Number(p.amount) - Number(p.paidAmount || 0)), 0);
    const absences = cache.attendance.filter((a) => a.studentId === s.id && a.status === 'absent').length;
    const m = App.modal({
      title: 'ملف الطالب',
      wide: true,
      body: `<div class="profile-hero">${App.avatar(s.fullName, s.photo, 'xl')}<div class="meta"><div class="name">${U.esc(s.fullName)}</div><div class="sub">${U.esc(s.studentId)} · ${U.esc(className(s.classId))}</div><div class="pill-row mt-1">${U.badge(s.status === 'active' ? 'نشط' : 'غير نشط', s.status === 'active' ? 'success' : 'muted')}<span class="pill">${s.gender === 'male' ? 'ذكر' : 'أنثى'}</span><span class="pill">${U.fmtDate(s.enrollDate)}</span></div></div></div>
        <div class="stats-grid mt-3" style="grid-template-columns:repeat(4,minmax(0,1fr))">
          ${App.statCard({ icon: 'check-circle', label: 'نسبة الحضور', value: `${rate}%`, tone: 'success' })}
          ${App.statCard({ icon: 'award', label: 'المعدل', value: `${avg.toFixed(1)}%`, tone: 'primary' })}
          ${App.statCard({ icon: 'alert-triangle', label: 'مرات الغياب', value: U.num(absences), tone: 'danger' })}
          ${App.statCard({ icon: 'credit-card', label: 'مستحق', value: U.money(due), tone: 'warning' })}
        </div>
        <div class="grid grid-2 mt-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="user"></i> البيانات الأساسية</div></div><div class="card-body"><div class="kv">
            <div><div class="k">تاريخ الميلاد</div><div class="v">${U.fmtDate(s.birthDate)}</div></div>
            <div><div class="k">ولي الأمر</div><div class="v">${U.esc(parentName(s.parentId))}</div></div>
            <div><div class="k">الهاتف</div><div class="v" dir="ltr">${U.esc(s.phone)}</div></div>
            <div><div class="k">العنوان</div><div class="v">${U.esc(s.address)}</div></div>
          </div></div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="clock"></i> آخر سجلات الحضور</div></div><div class="card-body tight"><div class="list">${cache.attendance.filter((a) => a.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((a) => `<div class="list-item"><span class="small">${U.fmtDateShort(a.date)}</span><div class="meta"></div>${U.badge(U.attendanceLabel(a.status), U.attendanceTone(a.status))}</div>`).join('') || '<div class="small muted">لا توجد سجلات</div>'}</div></div></div>
        </div>`,
      footer: `<button class="btn btn-ghost" data-close>إغلاق</button>`,
    });
    m.root.querySelector('[data-close]').onclick = m.close;
  }

  async function openForm(student) {
    const isEdit = !!student;
    const s = student || { fullName: '', studentId: `2026-${String(cache.students.length + 1).padStart(3, '0')}`, classId: cache.classes[0] ? cache.classes[0].id : '', gender: 'male', birthDate: '2015-01-01', parentId: '', phone: '', address: 'القاهرة، مصر', status: 'active', photo: '', enrollDate: U.todayISO() };
    const classOptions = cache.classes.map((c) => `<option value="${c.id}" ${String(c.id) === String(s.classId) ? 'selected' : ''}>${U.esc(c.className)}</option>`).join('');
    const parentOptions = `<option value="">— بدون —</option>` + cache.parents.map((p) => `<option value="${p.id}" ${String(p.id) === String(s.parentId) ? 'selected' : ''}>${U.esc(p.name)}</option>`).join('');
    const m = App.modal({
      title: isEdit ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد',
      wide: true,
      body: `<form id="student-form" class="form-grid">
        <div class="field"><label>الاسم الكامل *</label><input class="input" name="fullName" value="${U.esc(s.fullName)}" required></div>
        <div class="field"><label>رقم الطالب *</label><input class="input" name="studentId" value="${U.esc(s.studentId)}" required></div>
        <div class="field"><label>الفصل *</label><select class="select" name="classId" required>${classOptions}</select></div>
        <div class="field"><label>ولي الأمر</label><select class="select" name="parentId">${parentOptions}</select></div>
        <div class="field"><label>الجنس</label><select class="select" name="gender"><option value="male" ${s.gender === 'male' ? 'selected' : ''}>ذكر</option><option value="female" ${s.gender === 'female' ? 'selected' : ''}>أنثى</option></select></div>
        <div class="field"><label>تاريخ الميلاد</label><input class="input" type="date" name="birthDate" value="${U.esc(s.birthDate)}"></div>
        <div class="field"><label>الهاتف</label><input class="input" name="phone" value="${U.esc(s.phone)}" dir="ltr"></div>
        <div class="field"><label>الحالة</label><select class="select" name="status"><option value="active" ${s.status === 'active' ? 'selected' : ''}>نشط</option><option value="inactive" ${s.status === 'inactive' ? 'selected' : ''}>غير نشط</option></select></div>
        <div class="field full-span"><label>العنوان</label><input class="input" name="address" value="${U.esc(s.address)}"></div>
        <div class="field full-span"><label>الصورة (اختياري)</label><input class="input" type="file" name="photo" accept="image/*"></div>
      </form>`,
      footer: `<button class="btn btn-ghost" data-cancel>إلغاء</button><button class="btn btn-primary" id="save-student"><i data-feather="save"></i> حفظ</button>`,
    });
    m.root.querySelector('[data-cancel]').onclick = m.close;
    m.root.querySelector('#save-student').onclick = async () => {
      const form = m.root.querySelector('#student-form');
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const value = {
        fullName: String(fd.get('fullName')).trim(),
        studentId: String(fd.get('studentId')).trim(),
        classId: Number(fd.get('classId')),
        parentId: fd.get('parentId') ? Number(fd.get('parentId')) : null,
        gender: fd.get('gender'),
        birthDate: fd.get('birthDate'),
        phone: String(fd.get('phone')).trim(),
        address: String(fd.get('address')).trim(),
        status: fd.get('status'),
        enrollDate: s.enrollDate || U.todayISO(),
        photo: s.photo || '',
      };
      const file = fd.get('photo');
      if (file && file.size) value.photo = await U.readFile(file);
      if (isEdit) { value.id = s.id; await DB.put('students', value); App.toast('تم تحديث بيانات الطالب'); }
      else { await DB.add('students', value); App.toast('تمت إضافة الطالب'); }
      m.close();
      await load();
    };
  }

  function exportCsv() {
    const list = filtered();
    U.csv('students.csv', ['الاسم', 'رقم الطالب', 'الفصل', 'الجنس', 'ولي الأمر', 'الهاتف', 'الحالة'], list.map((s) => [s.fullName, s.studentId, className(s.classId), s.gender === 'male' ? 'ذكر' : 'أنثى', parentName(s.parentId), s.phone, s.status === 'active' ? 'نشط' : 'غير نشط']));
  }

  async function load() {
    const [students, classes, parents, attendance, grades, payments, teachers] = await Promise.all([
      DB.all('students'), DB.all('classes'), DB.all('users'), DB.all('attendance'), DB.all('grades'), DB.all('payments'), DB.all('teachers'),
    ]);
    cache = { students, classes, parents: parents.filter((p) => p.role === 'parent'), attendance, grades, payments, teachers };
    let list = students;
    if (user.role === 'teacher') {
      const me = teachers.find((t) => t.id === user.teacherId);
      const ids = me ? (me.classes || []) : [];
      list = students.filter((s) => ids.includes(s.classId));
    }
    scoped = list;
    renderTable();
  }

  App.pages.students = {
    async render(container, currentUser) {
      user = currentUser;
      const b = App.base();
      await load();
      container.innerHTML = `<div class="page-head"><div><h1>الطلاب</h1><div class="subtitle">إدارة بيانات الطلاب، الفصول، وأولياء الأمور.</div></div>
        <div class="page-actions">
          <button class="btn btn-ghost" id="export-students"><i data-feather="download"></i> تصدير CSV</button>
          <button class="btn btn-ghost" id="print-students"><i data-feather="printer"></i> طباعة</button>
          ${user.role === 'admin' ? `<button class="btn btn-primary" id="add-student"><i data-feather="user-plus"></i> إضافة طالب</button>` : ''}
        </div></div>
        <div class="card"><div class="card-head"><div class="row wrap" style="gap:8px;width:100%">
          <div class="search"><i data-feather="search"></i><input class="input" id="student-search" placeholder="ابحث بالاسم أو الرقم أو الهاتف..."></div>
          <select class="select" id="class-filter" style="width:auto"><option value="">كل الفصول</option>${cache.classes.map((c) => `<option value="${c.id}">${U.esc(c.className)}</option>`).join('')}</select>
          <select class="select" id="status-filter" style="width:auto"><option value="">كل الحالات</option><option value="active">نشط</option><option value="inactive">غير نشط</option></select>
          <select class="select" id="gender-filter" style="width:auto"><option value="">الكل</option><option value="male">ذكر</option><option value="female">أنثى</option></select>
          <span class="badge badge-primary" id="student-count" style="margin-right:auto">0 طالب</span>
        </div></div><div class="card-body"><div id="students-table"></div><div id="students-pagination"></div></div></div>`;
      renderTable();
      document.getElementById('student-count').textContent = `${scoped.length} طالب`;
      const search = document.getElementById('student-search');
      search.addEventListener('input', U.debounce(() => { state.q = search.value; state.page = 1; renderTable(); }, 180));
      document.getElementById('class-filter').addEventListener('change', (e) => { state.classId = e.target.value; state.page = 1; renderTable(); });
      document.getElementById('status-filter').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; renderTable(); });
      document.getElementById('gender-filter').addEventListener('change', (e) => { state.gender = e.target.value; state.page = 1; renderTable(); });
      const add = document.getElementById('add-student');
      if (add) add.onclick = () => openForm(null);
      document.getElementById('export-students').onclick = exportCsv;
      document.getElementById('print-students').onclick = () => {
        U.print(`<div class="head"><div><h1>قائمة الطلاب</h1><div class="muted">مدرسة السلام — ${U.fmtDate(U.todayISO())}</div></div><div class="logo">س</div></div>${tableHtml(filtered())}`, 'قائمة الطلاب');
      };
      const params = new URLSearchParams(location.search);
      if (params.get('class')) { state.classId = params.get('class'); document.getElementById('class-filter').value = state.classId; renderTable(); }
      if (params.get('student')) viewStudent(Number(params.get('student')));
    },
  };
})();
