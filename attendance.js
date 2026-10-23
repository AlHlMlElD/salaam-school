/* Salaam School — attendance. */
(function () {
  'use strict';

  let user = null;
  let cache = { students: [], classes: [], attendance: [], notifications: [] };
  let state = { classId: '', date: '', childId: '' };

  function className(id) { const c = cache.classes.find((x) => x.id === id); return c ? c.className : '—'; }
  function studentName(id) { const s = cache.students.find((x) => x.id === id); return s ? s.fullName : '—'; }
  function scopedStudents() {
    if (user.role === 'teacher') {
      const ids = new Set(cache.classes.filter((c) => Array.isArray(c.teacherId) ? false : c.teacherId === user.teacherId).map((c) => c.id));
      return cache.students.filter((s) => ids.has(s.classId) || s.classId === Number(state.classId));
    }
    return cache.students.filter((s) => String(s.classId) === String(state.classId));
  }
  function existing(studentId) {
    return cache.attendance.find((a) => a.studentId === studentId && a.date === state.date);
  }

  function summary(rows) {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }

  function sheetHtml(students) {
    if (!students.length) return App.empty('users', 'لا يوجد طلاب', 'اختر فصلاً به طلاب.');
    return `<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>الطالب</th><th>الحالة</th><th>ملاحظات</th></tr></thead><tbody>${students.map((s, i) => {
      const a = existing(s.id);
      const status = a ? a.status : 'present';
      return `<tr><td>${i + 1}</td><td><div class="cell-main">${App.avatar(s.fullName, s.photo)}<div><div class="name">${U.esc(s.fullName)}</div><div class="sub">${U.esc(s.studentId)}</div></div></div></td>
        <td><div class="seg">${[['present', 'حاضر'], ['absent', 'غائب'], ['late', 'متأخر'], ['excused', 'بعذر']].map(([v, l]) => `<label><input type="radio" name="att-${s.id}" value="${v}" ${status === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></td>
        <td><input class="input" style="min-width:130px" name="note-${s.id}" value="${U.esc(a && a.notes ? a.notes : '')}" placeholder="اختياري"></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function renderSheet() {
    const students = scopedStudents();
    const el = document.getElementById('attendance-sheet');
    if (!el) return;
    el.innerHTML = sheetHtml(students);
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    students.forEach((s) => { const a = existing(s.id); counts[a ? a.status : 'present'] += 1; });
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('att-present', counts.present); set('att-absent', counts.absent); set('att-late', counts.late); set('att-excused', counts.excused);
    set('att-total', students.length);
    if (window.feather) feather.replace();
  }

  function historyHtml() {
    const rows = user.role === 'student'
      ? cache.attendance.filter((a) => a.studentId === user.studentId)
      : user.role === 'parent'
        ? cache.attendance.filter((a) => (user.childIds || []).includes(a.studentId))
        : cache.attendance.filter((a) => String(a.classId) === String(state.classId));
    const dates = [...new Set(rows.map((a) => a.date))].sort((a, b) => b.localeCompare(a)).slice(0, 6);
    return `<div class="table-wrap"><table class="data"><thead><tr><th>التاريخ</th><th>حاضر</th><th>غائب</th><th>متأخر</th><th>بعذر</th><th>النسبة</th></tr></thead><tbody>${dates.map((d) => {
      const dayRows = rows.filter((a) => a.date === d);
      const c = summary(dayRows);
      const pct = dayRows.length ? Math.round(((c.present + c.late) / dayRows.length) * 100) : 0;
      return `<tr><td>${U.fmtDate(d)}</td><td>${c.present}</td><td>${c.absent}</td><td>${c.late}</td><td>${c.excused}</td><td><span class="badge ${pct >= 85 ? 'badge-success' : pct >= 70 ? 'badge-warning' : 'badge-danger'}">${pct}%</span></td></tr>`;
    }).join('') || `<tr><td colspan="6">${App.empty('check-square', 'لا توجد سجلات', '')}</td></tr>`}</tbody></table></div>`;
  }

  async function saveAll() {
    const students = scopedStudents();
    const btn = document.getElementById('save-attendance');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> جاري الحفظ...'; }
    try {
      for (const s of students) {
        const checked = document.querySelector(`input[name="att-${s.id}"]:checked`);
        const status = checked ? checked.value : 'present';
        const note = document.querySelector(`input[name="note-${s.id}"]`);
        const value = { studentId: s.id, classId: s.classId, date: state.date, status, notes: note ? note.value.trim() : '', recordedBy: user.teacherId || 2 };
        const a = existing(s.id);
        if (a) { value.id = a.id; await DB.put('attendance', value); }
        else await DB.add('attendance', value);
        if (status === 'absent' && s.parentId) {
          const all = await DB.all('notifications');
          const title = `غياب ${s.fullName}`;
          const body = `تم تسجيل غياب ${s.fullName} بتاريخ ${U.fmtDate(state.date)}.`;
          if (!all.some((n) => n.title === title && n.body === body)) {
            await DB.add('notifications', { title, body, targetRole: 'parent', targetId: s.parentId, isRead: false, createdAt: state.date, type: 'warning' });
          }
        }
      }
      App.toast('تم حفظ الحضور بنجاح');
      await load();
    } catch (error) {
      App.toast(`تعذر الحفظ: ${error.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-feather="save"></i> حفظ الحضور'; if (window.feather) feather.replace(); }
    }
  }

  function markAll(status) {
    document.querySelectorAll('#attendance-sheet input[type="radio"]').forEach((r) => { if (r.value === status) r.checked = true; });
  }

  async function load() {
    const [students, classes, attendance, notifications] = await Promise.all([DB.all('students'), DB.all('classes'), DB.all('attendance'), DB.all('notifications')]);
    cache = { students, classes, attendance, notifications };
    if (!state.classId) {
      if (user.role === 'student') { const s = students.find((x) => x.id === user.studentId); state.classId = s ? s.classId : (classes[0] ? classes[0].id : ''); }
      else if (user.role === 'parent') { const s = students.find((x) => x.id === Number(state.childId)); state.classId = s ? s.classId : (classes[0] ? classes[0].id : ''); }
      else if (user.role === 'teacher') { const c = classes.find((x) => x.teacherId === user.teacherId) || classes[0]; state.classId = c ? c.id : ''; }
      else state.classId = classes[0] ? classes[0].id : '';
    }
    if (!state.date) {
      const dates = attendance.map((a) => a.date).sort((a, b) => b.localeCompare(a));
      state.date = dates[0] || U.todayISO();
    }
    renderSheet();
    const hist = document.getElementById('attendance-history');
    if (hist) hist.innerHTML = historyHtml();
  }

  function controlsHtml() {
    if (user.role === 'admin' || user.role === 'teacher') {
      const classes = user.role === 'teacher' ? cache.classes.filter((c) => c.teacherId === user.teacherId || c.id === Number(state.classId)) : cache.classes;
      return `<div class="row wrap" style="gap:8px"><select class="select" id="att-class" style="width:auto">${classes.map((c) => `<option value="${c.id}" ${String(c.id) === String(state.classId) ? 'selected' : ''}>${U.esc(c.className)}</option>`).join('')}</select><input class="input" type="date" id="att-date" value="${state.date}" style="width:auto"><button class="btn btn-success" id="mark-present">حضور الكل</button><button class="btn btn-danger" id="mark-absent">غياب الكل</button><button class="btn btn-primary" id="save-attendance"><i data-feather="save"></i> حفظ الحضور</button></div>`;
    }
    if (user.role === 'parent') {
      return `<select class="select" id="att-child" style="width:auto">${cache.students.filter((s) => (user.childIds || []).includes(s.id)).map((s) => `<option value="${s.id}" ${String(s.id) === String(state.childId) ? 'selected' : ''}>${U.esc(s.fullName)}</option>`).join('')}</select>`;
    }
    return '';
  }

  App.pages.attendance = {
    async render(container, currentUser) {
      user = currentUser;
      if (user.role === 'parent') state.childId = (user.childIds || [])[0] || '';
      await load();
      const readOnly = user.role === 'student' || user.role === 'parent';
      container.innerHTML = `<div class="page-head"><div><h1>الحضور والغياب</h1><div class="subtitle">${readOnly ? 'سجل الحضور الخاص بك.' : 'تسجيل حضور الفصل دفعة واحدة، مع إشعار أولياء أمور الغائبين.'}</div></div><div class="page-actions">${controlsHtml()}</div></div>
        ${readOnly ? '' : `<div class="stats-grid mb-3">
          ${App.statCard({ icon: 'users', label: 'إجمالي الطلاب', value: '<span id="att-total">0</span>', tone: 'primary' })}
          ${App.statCard({ icon: 'check-circle', label: 'حاضر', value: '<span id="att-present">0</span>', tone: 'success' })}
          ${App.statCard({ icon: 'x-circle', label: 'غائب', value: '<span id="att-absent">0</span>', tone: 'danger' })}
          ${App.statCard({ icon: 'clock', label: 'متأخر / بعذر', value: '<span id="att-late">0</span> / <span id="att-excused">0</span>', tone: 'warning' })}
        </div>`}
        <div class="card mb-3"><div class="card-head"><div class="card-title"><i data-feather="check-square"></i> ${readOnly ? 'سجل الحضور' : 'كشف الحضور'}</div><span class="badge badge-primary">${readOnly ? U.fmtDate(U.todayISO()) : U.fmtDate(state.date)}</span></div><div class="card-body"><div id="attendance-sheet"></div></div></div>
        <div class="card"><div class="card-head"><div class="card-title"><i data-feather="clock"></i> آخر الأيام</div></div><div class="card-body"><div id="attendance-history"></div></div></div>`;
      // The sheet is only rendered for the editable view; for read-only show history only.
      if (readOnly) {
        const sheet = document.getElementById('attendance-sheet');
        if (sheet) sheet.innerHTML = App.empty('check-square', 'عرض السجل', 'استخدم الجدول بالأسفل لمتابعة الحضور.');
        const hist = document.getElementById('attendance-history');
        if (hist) hist.innerHTML = historyHtml();
      } else {
        renderSheet();
        const hist = document.getElementById('attendance-history');
        if (hist) hist.innerHTML = historyHtml();
      }
      const cls = document.getElementById('att-class');
      if (cls) cls.addEventListener('change', async (e) => { state.classId = e.target.value; await load(); });
      const date = document.getElementById('att-date');
      if (date) date.addEventListener('change', (e) => { state.date = e.target.value; renderSheet(); });
      const present = document.getElementById('mark-present');
      if (present) present.onclick = () => markAll('present');
      const absent = document.getElementById('mark-absent');
      if (absent) absent.onclick = () => markAll('absent');
      const save = document.getElementById('save-attendance');
      if (save) save.onclick = saveAll;
      const child = document.getElementById('att-child');
      if (child) child.addEventListener('change', async (e) => { state.childId = e.target.value; const s = cache.students.find((x) => x.id === Number(state.childId)); state.classId = s ? s.classId : state.classId; const hist = document.getElementById('attendance-history'); if (hist) hist.innerHTML = historyHtml(); });
    },
  };
})();
