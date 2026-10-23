/* Salaam School — grades entry and review. */
(function () {
  'use strict';

  let user = null;
  let cache = { students: [], classes: [], subjects: [], grades: [], teachers: [] };
  let state = { classId: '', subjectId: '', examType: 'monthly', childId: '' };

  function className(id) { const c = cache.classes.find((x) => x.id === id); return c ? c.className : '—'; }
  function subjectName(id) { const s = cache.subjects.find((x) => x.id === id); return s ? s.subjectName : '—'; }
  function studentName(id) { const s = cache.students.find((x) => x.id === id); return s ? s.fullName : '—'; }
  function scopedStudents() { return cache.students.filter((s) => String(s.classId) === String(state.classId)); }
  function existing(studentId) {
    return cache.grades.find((g) => g.studentId === studentId && g.subjectId === Number(state.subjectId) && g.examType === state.examType && g.term === 'first');
  }
  function pct(score, max) { return max ? (Number(score) / Number(max)) * 100 : 0; }

  function sheetHtml(students) {
    if (!students.length) return App.empty('users', 'لا يوجد طلاب', 'اختر فصلاً به طلاب.');
    return `<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>الطالب</th><th>الدرجة (من 100)</th><th>التقدير</th></tr></thead><tbody>${students.map((s, i) => {
      const g = existing(s.id);
      const score = g ? g.score : '';
      return `<tr><td>${i + 1}</td><td><div class="cell-main">${App.avatar(s.fullName, s.photo)}<div><div class="name">${U.esc(s.fullName)}</div><div class="sub">${U.esc(s.studentId)}</div></div></div></td>
        <td><input class="input score-input" style="width:100px" type="number" min="0" max="100" step="0.5" name="score-${s.id}" value="${score}" data-student="${s.id}"></td>
        <td><span class="grade-cell" id="grade-${s.id}">${g ? U.badge(U.gradeLabel(pct(g.score, g.maxScore)), U.gradeTone(pct(g.score, g.maxScore))) : '—'}</span></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function refreshGrades() {
    document.querySelectorAll('.score-input').forEach((input) => {
      const id = input.dataset.student;
      const cell = document.getElementById(`grade-${id}`);
      if (!cell) return;
      const v = Number(input.value);
      if (!input.value) { cell.innerHTML = '—'; return; }
      cell.innerHTML = U.badge(U.gradeLabel(v), U.gradeTone(v));
    });
    refreshStats();
  }

  function refreshStats() {
    const vals = [...document.querySelectorAll('.score-input')].map((i) => Number(i.value)).filter((v) => Number.isFinite(v) && v > 0);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const pass = vals.filter((v) => v >= 60).length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('grade-avg', `${avg.toFixed(1)}%`);
    set('grade-pass', `${vals.length ? Math.round((pass / vals.length) * 100) : 0}%`);
    set('grade-high', vals.length ? Math.max(...vals) : '—');
    set('grade-low', vals.length ? Math.min(...vals) : '—');
  }

  async function saveAll() {
    const students = scopedStudents();
    const btn = document.getElementById('save-grades');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> جاري الحفظ...'; }
    try {
      for (const s of students) {
        const input = document.querySelector(`input[name="score-${s.id}"]`);
        if (!input || input.value === '') continue;
        const value = { studentId: s.id, subjectId: Number(state.subjectId), examType: state.examType, score: Number(input.value), maxScore: 100, term: 'first', year: '2026-2027', date: U.todayISO() };
        const g = existing(s.id);
        if (g) { value.id = g.id; await DB.put('grades', value); } else await DB.add('grades', value);
      }
      App.toast('تم حفظ الدرجات');
      await load();
      renderSheetOnly();
    } catch (error) {
      App.toast(`تعذر الحفظ: ${error.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-feather="save"></i> حفظ الدرجات'; if (window.feather) feather.replace(); }
    }
  }

  function readOnlyTable(students) {
    const ids = students.map((s) => s.id);
    const rows = cache.grades.filter((g) => ids.includes(g.studentId));
    const subjects = [...new Set(rows.map((g) => g.subjectId))];
    const summary = subjects.map((sid) => {
      const rs = rows.filter((g) => g.subjectId === sid);
      const avg = rs.reduce((sum, g) => sum + pct(g.score, g.maxScore), 0) / rs.length;
      return `<tr><td>${U.esc(subjectName(sid))}</td><td>${rs.length}</td><td>${avg.toFixed(1)}%</td><td>${U.badge(U.gradeLabel(avg), U.gradeTone(avg))}</td></tr>`;
    }).join('');
    const allAvg = rows.length ? rows.reduce((sum, g) => sum + pct(g.score, g.maxScore), 0) / rows.length : 0;
    return `<div class="stats-grid mb-3" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      ${App.statCard({ icon: 'award', label: 'المعدل العام', value: `${allAvg.toFixed(1)}%`, tone: 'primary' })}
      ${App.statCard({ icon: 'book-open', label: 'عدد الدرجات', value: rows.length, tone: 'cyan' })}
      ${App.statCard({ icon: 'trending-up', label: 'التقدير', value: U.gradeLabel(allAvg), tone: 'success' })}
    </div>
    <div class="card"><div class="card-head"><div class="card-title"><i data-feather="bar-chart-2"></i> المعدل حسب المادة</div></div><div class="card-body"><div class="table-wrap"><table class="data"><thead><tr><th>المادة</th><th>عدد الاختبارات</th><th>المعدل</th><th>التقدير</th></tr></thead><tbody>${summary || `<tr><td colspan="4">${App.empty('award', 'لا توجد درجات', '')}</td></tr>`}</tbody></table></div></div></div>
    <div class="card mt-3"><div class="card-head"><div class="card-title"><i data-feather="list"></i> كل الدرجات</div></div><div class="card-body"><div class="table-wrap"><table class="data"><thead><tr><th>الطالب</th><th>المادة</th><th>الاختبار</th><th>الدرجة</th><th>التقدير</th></tr></thead><tbody>${rows.sort((a, b) => b.id - a.id).map((g) => `<tr><td>${U.esc(studentName(g.studentId))}</td><td>${U.esc(subjectName(g.subjectId))}</td><td>${U.examType(g.examType)}</td><td>${U.num(g.score)} / ${U.num(g.maxScore)}</td><td>${U.badge(U.gradeLabel(pct(g.score, g.maxScore)), U.gradeTone(pct(g.score, g.maxScore)))}</td></tr>`).join('') || `<tr><td colspan="5">${App.empty('award', 'لا توجد درجات', '')}</td></tr>`}</tbody></table></div></div></div>`;
  }

  function controlsHtml() {
    if (user.role === 'student' || user.role === 'parent') {
      if (user.role === 'parent') return `<select class="select" id="grade-child" style="width:auto">${cache.students.filter((s) => (user.childIds || []).includes(s.id)).map((s) => `<option value="${s.id}" ${String(s.id) === String(state.childId) ? 'selected' : ''}>${U.esc(s.fullName)}</option>`).join('')}</select>`;
      return '';
    }
    const classes = user.role === 'teacher' ? cache.classes.filter((c) => c.teacherId === user.teacherId) : cache.classes;
    const subjects = user.role === 'teacher' ? cache.subjects.filter((s) => s.teacherId === user.teacherId || true) : cache.subjects;
    return `<div class="row wrap" style="gap:8px">
      <select class="select" id="grade-class" style="width:auto">${classes.map((c) => `<option value="${c.id}" ${String(c.id) === String(state.classId) ? 'selected' : ''}>${U.esc(c.className)}</option>`).join('')}</select>
      <select class="select" id="grade-subject" style="width:auto">${subjects.map((s) => `<option value="${s.id}" ${String(s.id) === String(state.subjectId) ? 'selected' : ''}>${U.esc(s.subjectName)}</option>`).join('')}</select>
      <select class="select" id="grade-exam" style="width:auto">${[['monthly', 'شهري'], ['midterm', 'نصف السنة'], ['final', 'نهاية السنة']].map(([v, l]) => `<option value="${v}" ${state.examType === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn btn-primary" id="save-grades"><i data-feather="save"></i> حفظ الدرجات</button>
    </div>`;
  }

  async function load() {
    const [students, classes, subjects, grades, teachers] = await Promise.all([DB.all('students'), DB.all('classes'), DB.all('subjects'), DB.all('grades'), DB.all('teachers')]);
    cache = { students, classes, subjects, grades, teachers };
    if (!state.classId) {
      if (user.role === 'teacher') { const c = classes.find((x) => x.teacherId === user.teacherId) || classes[0]; state.classId = c ? c.id : ''; }
      else if (user.role === 'student') { const s = students.find((x) => x.id === user.studentId); state.classId = s ? s.classId : (classes[0] ? classes[0].id : ''); }
      else state.classId = classes[0] ? classes[0].id : '';
    }
    if (!state.subjectId) state.subjectId = subjects[0] ? subjects[0].id : '';
    if (user.role === 'parent' && !state.childId) state.childId = (user.childIds || [])[0] || '';
  }

  App.pages.grades = {
    async render(container, currentUser) {
      user = currentUser;
      await load();
      const readOnly = user.role === 'student' || user.role === 'parent';
      const students = readOnly
        ? user.role === 'student' ? cache.students.filter((s) => s.id === user.studentId) : cache.students.filter((s) => s.id === Number(state.childId))
        : scopedStudents();
      container.innerHTML = `<div class="page-head"><div><h1>الدرجات</h1><div class="subtitle">${readOnly ? 'نتائجك ومعدلاتك حسب المواد.' : 'إدخال درجات الاختبارات مع حساب التقدير والترتيب.'}</div></div><div class="page-actions">${controlsHtml()}</div></div>
        ${readOnly ? readOnlyTable(students) : `<div class="stats-grid mb-3" style="grid-template-columns:repeat(4,minmax(0,1fr))">
          ${App.statCard({ icon: 'award', label: 'متوسط الدرجات', value: '<span id="grade-avg">0%</span>', tone: 'primary' })}
          ${App.statCard({ icon: 'check-circle', label: 'نسبة النجاح', value: '<span id="grade-pass">0%</span>', tone: 'success' })}
          ${App.statCard({ icon: 'trending-up', label: 'أعلى درجة', value: '<span id="grade-high">—</span>', tone: 'cyan' })}
          ${App.statCard({ icon: 'trending-down', label: 'أقل درجة', value: '<span id="grade-low">—</span>', tone: 'danger' })}
        </div>
        <div class="card"><div class="card-head"><div class="card-title"><i data-feather="award"></i> ${U.esc(subjectName(state.subjectId))} — ${U.examType(state.examType)} · ${U.esc(className(state.classId))}</div><span class="badge badge-primary">من 100</span></div><div class="card-body"><div id="grades-sheet">${sheetHtml(students)}</div></div></div>`}`;
      if (readOnly) {
        const child = document.getElementById('grade-child');
        if (child) child.addEventListener('change', async (e) => { state.childId = e.target.value; await App.pages.grades.render(container, user); });
        return;
      }
      document.querySelectorAll('.score-input').forEach((input) => input.addEventListener('input', refreshGrades));
      refreshGrades();
      const cls = document.getElementById('grade-class');
      if (cls) cls.addEventListener('change', (e) => { state.classId = e.target.value; renderSheetOnly(students); });
      const sub = document.getElementById('grade-subject');
      if (sub) sub.addEventListener('change', (e) => { state.subjectId = e.target.value; renderSheetOnly(students); });
      const exam = document.getElementById('grade-exam');
      if (exam) exam.addEventListener('change', (e) => { state.examType = e.target.value; renderSheetOnly(students); });
      document.getElementById('save-grades').onclick = saveAll;
    },
  };

  function renderSheetOnly() {
    const el = document.getElementById('grades-sheet');
    if (!el) return;
    el.innerHTML = sheetHtml(scopedStudents());
    document.querySelectorAll('.score-input').forEach((input) => input.addEventListener('input', refreshGrades));
    refreshGrades();
    if (window.feather) feather.replace();
  }
})();
