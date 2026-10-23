/* Salaam School — teachers management. */
(function () {
  'use strict';

  let cache = { teachers: [], classes: [], students: [], attendance: [] };
  let state = { q: '', status: '' };

  function classNames(ids) {
    return (ids || []).map((id) => { const c = cache.classes.find((x) => x.id === id); return c ? c.className : ''; }).filter(Boolean).join(' · ') || '—';
  }
  function filtered() {
    return cache.teachers.filter((t) => {
      if (state.status && t.status !== state.status) return false;
      if (state.q && !(`${t.fullName} ${t.employeeId} ${t.email} ${(t.subjects || []).join(' ')}`.includes(state.q))) return false;
      return true;
    });
  }

  function rowsHtml(list) {
    if (!list.length) return `<tr><td colspan="6">${App.empty('user-check', 'لا يوجد مدرسون', 'أضف مدرسًا جديدًا.')}</td></tr>`;
    return list.map((t) => `<tr>
      <td><div class="cell-main">${App.avatar(t.fullName)}<div><div class="name">${U.esc(t.fullName)}</div><div class="sub">${U.esc(t.employeeId)}</div></div></div></td>
      <td>${U.esc((t.subjects || []).join(' · '))}</td>
      <td>${U.esc(classNames(t.classes))}</td>
      <td>${U.money(t.salary)}</td>
      <td>${U.badge(t.status === 'active' ? 'نشط' : 'غير نشط', t.status === 'active' ? 'success' : 'muted')}</td>
      <td><div class="table-actions">
        <button class="btn btn-sm btn-ghost" data-view="${t.id}"><i data-feather="eye"></i></button>
        <button class="btn btn-sm btn-ghost" data-edit="${t.id}"><i data-feather="edit-2"></i></button>
        <button class="btn btn-sm btn-danger" data-del="${t.id}"><i data-feather="trash-2"></i></button>
      </div></td></tr>`).join('');
  }

  function renderTable() {
    const list = filtered();
    const el = document.getElementById('teachers-table');
    if (el) el.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>المدرس</th><th>المواد</th><th>الفصول</th><th>الراتب</th><th>الحالة</th><th></th></tr></thead><tbody>${rowsHtml(list)}</tbody></table></div>`;
    const count = document.getElementById('teachers-count');
    if (count) count.textContent = `${list.length} مدرس`;
    bind();
    if (window.feather) feather.replace();
  }

  function bind() {
    document.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => viewTeacher(Number(b.dataset.view)); });
    document.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => openForm(cache.teachers.find((t) => t.id === Number(b.dataset.edit))); });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const t = cache.teachers.find((x) => x.id === Number(b.dataset.del));
        if (!t) return;
        const ok = await App.confirm(`حذف المدرس "${t.fullName}"؟`, { danger: true, confirmText: 'حذف' });
        if (!ok) return;
        await DB.del('teachers', t.id);
        App.toast('تم حذف المدرس');
        await load();
      };
    });
  }

  function viewTeacher(id) {
    const t = cache.teachers.find((x) => x.id === id);
    if (!t) return;
    const students = cache.students.filter((s) => (t.classes || []).includes(s.classId));
    const rows = cache.attendance.filter((a) => students.some((s) => s.id === a.studentId));
    const rate = rows.length ? Math.round((rows.filter((a) => a.status === 'present' || a.status === 'late').length / rows.length) * 100) : 0;
    const m = App.modal({
      title: 'ملف المدرس',
      wide: true,
      body: `<div class="profile-hero">${App.avatar(t.fullName, '', 'xl')}<div class="meta"><div class="name">${U.esc(t.fullName)}</div><div class="sub">${U.esc(t.employeeId)} · ${U.esc((t.subjects || []).join(' · '))}</div><div class="pill-row mt-1">${U.badge(t.status === 'active' ? 'نشط' : 'غير نشط', t.status === 'active' ? 'success' : 'muted')}<span class="pill">${U.esc(t.email)}</span><span class="pill" dir="ltr">${U.esc(t.phone)}</span></div></div></div>
        <div class="stats-grid mt-3" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          ${App.statCard({ icon: 'layers', label: 'الفصول', value: (t.classes || []).length, tone: 'primary' })}
          ${App.statCard({ icon: 'users', label: 'الطلاب', value: students.length, tone: 'cyan' })}
          ${App.statCard({ icon: 'check-circle', label: 'حضور الطلاب', value: `${rate}%`, tone: 'success' })}
        </div>
        <div class="grid grid-2 mt-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="layers"></i> الفصول المسندة</div></div><div class="card-body tight"><div class="list">${(t.classes || []).map((cid) => { const c = cache.classes.find((x) => x.id === cid); return c ? `<div class="list-item"><div class="meta"><div class="name">${U.esc(c.className)}</div><div class="sub">${U.esc(c.room)} · ${cache.students.filter((s) => s.classId === c.id).length} طالب</div></div></div>` : ''; }).join('') || '<div class="small muted">لا توجد فصول</div>'}</div></div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="briefcase"></i> بيانات التوظيف</div></div><div class="card-body"><div class="kv"><div><div class="k">تاريخ التعيين</div><div class="v">${U.fmtDate(t.hireDate)}</div></div><div><div class="k">الراتب</div><div class="v">${U.money(t.salary)}</div></div><div><div class="k">البريد</div><div class="v">${U.esc(t.email)}</div></div><div><div class="k">الهاتف</div><div class="v" dir="ltr">${U.esc(t.phone)}</div></div></div></div></div>
        </div>`,
      footer: `<button class="btn btn-ghost" data-close>إغلاق</button>`,
    });
    m.root.querySelector('[data-close]').onclick = m.close;
  }

  function openForm(teacher) {
    const isEdit = !!teacher;
    const t = teacher || { fullName: '', employeeId: `T-${String(cache.teachers.length + 1).padStart(3, '0')}`, email: '', phone: '', subjects: [], classes: [], salary: 8000, hireDate: U.todayISO(), status: 'active' };
    const classChecks = cache.classes.map((c) => `<label class="check"><input type="checkbox" name="classes" value="${c.id}" ${(t.classes || []).includes(c.id) ? 'checked' : ''}> ${U.esc(c.className)}</label>`).join('');
    const m = App.modal({
      title: isEdit ? 'تعديل المدرس' : 'إضافة مدرس',
      wide: true,
      body: `<form id="teacher-form" class="form-grid">
        <div class="field"><label>الاسم الكامل *</label><input class="input" name="fullName" value="${U.esc(t.fullName)}" required></div>
        <div class="field"><label>رقم الموظف *</label><input class="input" name="employeeId" value="${U.esc(t.employeeId)}" required></div>
        <div class="field"><label>البريد الإلكتروني</label><input class="input" type="email" name="email" value="${U.esc(t.email)}"></div>
        <div class="field"><label>الهاتف</label><input class="input" name="phone" value="${U.esc(t.phone)}" dir="ltr"></div>
        <div class="field full-span"><label>المواد (افصل بفاصلة)</label><input class="input" name="subjects" value="${U.esc((t.subjects || []).join(', '))}" placeholder="الرياضيات, العلوم"></div>
        <div class="field"><label>الراتب</label><input class="input" type="number" name="salary" value="${t.salary}"></div>
        <div class="field"><label>تاريخ التعيين</label><input class="input" type="date" name="hireDate" value="${U.esc(t.hireDate)}"></div>
        <div class="field"><label>الحالة</label><select class="select" name="status"><option value="active" ${t.status === 'active' ? 'selected' : ''}>نشط</option><option value="inactive" ${t.status === 'inactive' ? 'selected' : ''}>غير نشط</option></select></div>
        <div class="field full-span"><label>الفصول المسندة</label><div class="row wrap" style="gap:8px 14px">${classChecks}</div></div>
      </form>`,
      footer: `<button class="btn btn-ghost" data-cancel>إلغاء</button><button class="btn btn-primary" id="save-teacher"><i data-feather="save"></i> حفظ</button>`,
    });
    m.root.querySelector('[data-cancel]').onclick = m.close;
    m.root.querySelector('#save-teacher').onclick = async () => {
      const form = m.root.querySelector('#teacher-form');
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const value = {
        fullName: String(fd.get('fullName')).trim(),
        employeeId: String(fd.get('employeeId')).trim(),
        email: String(fd.get('email')).trim(),
        phone: String(fd.get('phone')).trim(),
        subjects: String(fd.get('subjects')).split(',').map((s) => s.trim()).filter(Boolean),
        classes: fd.getAll('classes').map(Number),
        salary: Number(fd.get('salary')),
        hireDate: fd.get('hireDate'),
        status: fd.get('status'),
      };
      if (isEdit) { value.id = t.id; await DB.put('teachers', value); App.toast('تم تحديث المدرس'); }
      else { await DB.add('teachers', value); App.toast('تمت إضافة المدرس'); }
      m.close();
      await load();
    };
  }

  async function load() {
    const [teachers, classes, students, attendance] = await Promise.all([DB.all('teachers'), DB.all('classes'), DB.all('students'), DB.all('attendance')]);
    cache = { teachers, classes, students, attendance };
    renderTable();
  }

  App.pages.teachers = {
    async render(container) {
      await load();
      container.innerHTML = `<div class="page-head"><div><h1>المدرسون</h1><div class="subtitle">إدارة هيئة التدريس، المواد، والفصول المسندة.</div></div><div class="page-actions"><button class="btn btn-primary" id="add-teacher"><i data-feather="plus"></i> إضافة مدرس</button></div></div>
        <div class="card"><div class="card-head"><div class="row wrap" style="gap:8px;width:100%">
          <div class="search"><i data-feather="search"></i><input class="input" id="teacher-search" placeholder="ابحث بالاسم أو الرقم أو المادة..."></div>
          <select class="select" id="teacher-status" style="width:auto"><option value="">كل الحالات</option><option value="active">نشط</option><option value="inactive">غير نشط</option></select>
          <span class="badge badge-primary" id="teachers-count" style="margin-right:auto">0 مدرس</span>
        </div></div><div class="card-body"><div id="teachers-table"></div></div></div>`;
      renderTable();
      document.getElementById('teacher-search').addEventListener('input', U.debounce((e) => { state.q = e.target.value; renderTable(); }, 180));
      document.getElementById('teacher-status').addEventListener('change', (e) => { state.status = e.target.value; renderTable(); });
      document.getElementById('add-teacher').onclick = () => openForm(null);
    },
  };
})();
