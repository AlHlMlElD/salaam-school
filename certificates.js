/* Salaam School — printable certificates. */
(function () {
  'use strict';

  let user = null;
  let cache = { students: [], classes: [], subjects: [], grades: [], attendance: [] };
  let state = { studentId: '', type: 'result', childId: '' };

  function className(id) { const c = cache.classes.find((x) => x.id === id); return c ? c.className : '—'; }
  function subjectName(id) { const s = cache.subjects.find((x) => x.id === id); return s ? s.subjectName : '—'; }
  function avgFor(studentId, subjectId) {
    const rows = cache.grades.filter((g) => g.studentId === studentId && (!subjectId || g.subjectId === subjectId));
    if (!rows.length) return 0;
    return rows.reduce((sum, g) => sum + (Number(g.score) / Number(g.maxScore || 100)) * 100, 0) / rows.length;
  }
  function attendanceRate(studentId) {
    const rows = cache.attendance.filter((a) => a.studentId === studentId);
    if (!rows.length) return 0;
    return Math.round((rows.filter((a) => a.status === 'present' || a.status === 'late').length / rows.length) * 100);
  }

  function certificateHtml(student) {
    const cls = cache.classes.find((c) => c.id === student.classId);
    const subjects = [...new Set(cache.grades.filter((g) => g.studentId === student.id).map((g) => g.subjectId))];
    const rows = subjects.map((sid) => {
      const avg = avgFor(student.id, sid);
      return `<tr><td>${U.esc(subjectName(sid))}</td><td>${avg.toFixed(1)}</td><td>${U.gradeLabel(avg)}</td></tr>`;
    }).join('');
    const overall = avgFor(student.id);
    const att = attendanceRate(student.id);
    const titles = { result: 'شهادة نتيجة الفصل الدراسي', appreciation: 'شهادة تقدير', attendance: 'شهادة حضور منتظم', transcript: 'كشف درجات' };
    const body = state.type === 'appreciation'
      ? `<p>تشهد إدارة مدرسة السلام بأن الطالب/الطالبة <b>${U.esc(student.fullName)}</b> قد أظهر تفوقًا وتميزًا في التحصيل الدراسي والسلوك خلال العام الدراسي 2026-2027.</p><p>معدله العام: <b>${overall.toFixed(1)}%</b> — ${U.gradeLabel(overall)}.</p>`
      : state.type === 'attendance'
        ? `<p>تشهد إدارة مدرسة السلام بأن الطالب/الطالبة <b>${U.esc(student.fullName)}</b> قد حافظ على حضور منتظم خلال العام الدراسي 2026-2027.</p><p>نسبة الحضور: <b>${att}%</b>.</p>`
        : `<p>تشهد إدارة مدرسة السلام بأن الطالب/الطالبة <b>${U.esc(student.fullName)}</b> قد أتم دراسة الصف <b>${U.esc(cls ? cls.className : '')}</b> للعام الدراسي 2026-2027، وحصل على النتائج التالية:</p>`;
    return `<div class="certificate" id="certificate">
      <div class="cert-head"><div class="brand"><div class="brand-mark"><svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" fill="#fff"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21.5V5.5Z" fill="#fff" opacity=".8"/></svg></div><div><h2>مدرسة السلام</h2><div class="muted">Salaam School · العام الدراسي 2026-2027</div></div></div><div class="muted">${U.fmtDate(U.todayISO())}</div></div>
      <div class="cert-title">${titles[state.type] || titles.result}</div>
      <div class="cert-sub">${U.esc(cls ? cls.className : '')} · ${U.esc(student.studentId)}</div>
      <div class="cert-name">${U.esc(student.fullName)}</div>
      <div class="cert-body">${body}
        ${state.type !== 'appreciation' && state.type !== 'attendance' ? `<table><thead><tr><th>المادة</th><th>المعدل</th><th>التقدير</th></tr></thead><tbody>${rows || '<tr><td colspan="3">لا توجد درجات</td></tr>'}</tbody></table><p style="text-align:center;font-size:15px"><b>المعدل العام: ${overall.toFixed(1)}% — ${U.gradeLabel(overall)}</b></p>` : ''}
      </div>
      <div class="cert-foot"><div><div>مدير المدرسة</div><div style="margin-top:18px">............................</div></div><div class="seal">ختم<br>المدرسة</div><div><div>ولي الأمر</div><div style="margin-top:18px">............................</div></div></div>
    </div>`;
  }

  function selectedStudent() {
    if (user.role === 'student') return cache.students.find((s) => s.id === user.studentId);
    if (user.role === 'parent') return cache.students.find((s) => s.id === Number(state.childId));
    return cache.students.find((s) => s.id === Number(state.studentId));
  }

  function renderPreview() {
    const student = selectedStudent();
    const el = document.getElementById('cert-preview');
    if (!el) return;
    el.innerHTML = student ? certificateHtml(student) : App.empty('user', 'اختر طالبًا', 'لعرض الشهادة.');
    if (window.feather) feather.replace();
  }

  function controlsHtml() {
    const b = App.base();
    if (user.role === 'admin' || user.role === 'teacher') {
      return `<div class="row wrap" style="gap:8px">
        <select class="select" id="cert-student" style="width:auto">${cache.students.map((s) => `<option value="${s.id}" ${String(s.id) === String(state.studentId) ? 'selected' : ''}>${U.esc(s.fullName)} — ${U.esc(className(s.classId))}</option>`).join('')}</select>
        <select class="select" id="cert-type" style="width:auto">${[['result', 'نتيجة الفصل'], ['appreciation', 'تقدير'], ['attendance', 'حضور منتظم'], ['transcript', 'كشف درجات']].map(([v, l]) => `<option value="${v}" ${state.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="btn btn-ghost" id="cert-print"><i data-feather="printer"></i> طباعة</button>
        <button class="btn btn-primary" id="cert-pdf"><i data-feather="download"></i> PDF</button>
      </div>`;
    }
    if (user.role === 'parent') {
      return `<div class="row wrap" style="gap:8px"><select class="select" id="cert-child" style="width:auto">${cache.students.filter((s) => (user.childIds || []).includes(s.id)).map((s) => `<option value="${s.id}" ${String(s.id) === String(state.childId) ? 'selected' : ''}>${U.esc(s.fullName)}</option>`).join('')}</select><select class="select" id="cert-type" style="width:auto">${[['result', 'نتيجة الفصل'], ['appreciation', 'تقدير'], ['attendance', 'حضور منتظم']].map(([v, l]) => `<option value="${v}" ${state.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn btn-ghost" id="cert-print"><i data-feather="printer"></i> طباعة</button><button class="btn btn-primary" id="cert-pdf"><i data-feather="download"></i> PDF</button></div>`;
    }
    return `<button class="btn btn-ghost" id="cert-print"><i data-feather="printer"></i> طباعة</button><button class="btn btn-primary" id="cert-pdf"><i data-feather="download"></i> PDF</button>`;
  }

  async function load() {
    const [students, classes, subjects, grades, attendance] = await Promise.all([DB.all('students'), DB.all('classes'), DB.all('subjects'), DB.all('grades'), DB.all('attendance')]);
    cache = { students, classes, subjects, grades, attendance };
    if (!state.studentId) state.studentId = students[0] ? students[0].id : '';
    if (user.role === 'parent' && !state.childId) state.childId = (user.childIds || [])[0] || '';
  }

  function bind() {
    const print = document.getElementById('cert-print');
    if (print) print.onclick = () => { const el = document.getElementById('certificate'); if (el) U.print(el.outerHTML, 'شهادة'); };
    const pdf = document.getElementById('cert-pdf');
    if (pdf) pdf.onclick = async () => {
      const el = document.getElementById('certificate');
      if (!el) return;
      if (typeof html2pdf === 'undefined') { App.toast('مكتبة PDF غير متاحة', 'error'); return; }
      pdf.disabled = true;
      try {
        await html2pdf().set({ margin: 6, filename: `certificate-${state.studentId}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(el).save();
      } catch (error) { App.toast(`تعذر إنشاء PDF: ${error.message}`, 'error'); }
      finally { pdf.disabled = false; }
    };
  }

  App.pages.certificates = {
    async render(container, currentUser) {
      user = currentUser;
      await load();
      container.innerHTML = `<div class="page-head"><div><h1>الشهادات</h1><div class="subtitle">إصدار شهادات النتيجة والتقدير والحضور وكشف الدرجات.</div></div><div class="page-actions">${controlsHtml()}</div></div>
        <div class="card"><div class="card-body"><div id="cert-preview"></div></div></div>`;
      renderPreview();
      const student = document.getElementById('cert-student');
      if (student) student.addEventListener('change', (e) => { state.studentId = e.target.value; renderPreview(); });
      const type = document.getElementById('cert-type');
      if (type) type.addEventListener('change', (e) => { state.type = e.target.value; renderPreview(); });
      const child = document.getElementById('cert-child');
      if (child) child.addEventListener('change', (e) => { state.childId = e.target.value; renderPreview(); });
      bind();
    },
  };
})();
