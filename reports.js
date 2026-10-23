/* Salaam School — reports and analytics. */
(function () {
  'use strict';

  let cache = {};

  function classOf(id) { const c = cache.classes.find((x) => x.id === id); return c ? c.className : '—'; }
  function avgFor(studentId) {
    const rows = cache.grades.filter((g) => g.studentId === studentId);
    if (!rows.length) return 0;
    return rows.reduce((s, g) => s + (g.score / g.maxScore) * 100, 0) / rows.length;
  }
  function attendanceRate(rows) {
    if (!rows.length) return 0;
    return Math.round((rows.filter((a) => a.status === 'present' || a.status === 'late').length / rows.length) * 100);
  }

  async function load() {
    const [students, classes, teachers, attendance, grades, payments, subjects] = await Promise.all([
      DB.all('students'), DB.all('classes'), DB.all('teachers'), DB.all('attendance'), DB.all('grades'), DB.all('payments'), DB.all('subjects'),
    ]);
    cache = { students, classes, teachers, attendance, grades, payments, subjects };
  }

  function reportHtml() {
    const totalStudents = cache.students.length;
    const att = attendanceRate(cache.attendance);
    const revenue = cache.payments.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const pass = cache.grades.filter((g) => (g.score / g.maxScore) * 100 >= 60).length;
    const passRate = cache.grades.length ? Math.round((pass / cache.grades.length) * 100) : 0;
    const top = cache.students.map((s) => ({ ...s, avg: avgFor(s.id) })).sort((a, b) => b.avg - a.avg).slice(0, 8);
    const classRows = cache.classes.map((c) => {
      const rows = cache.attendance.filter((a) => a.classId === c.id);
      return { name: c.className, count: cache.students.filter((s) => s.classId === c.id).length, rate: attendanceRate(rows) };
    });
    return `<div class="stats-grid mb-3">
      ${App.statCard({ icon: 'users', label: 'الطلاب', value: U.num(totalStudents), tone: 'primary' })}
      ${App.statCard({ icon: 'check-circle', label: 'نسبة الحضور', value: `${att}%`, tone: 'success' })}
      ${App.statCard({ icon: 'credit-card', label: 'المحصّل', value: U.money(revenue), tone: 'warning' })}
      ${App.statCard({ icon: 'award', label: 'نسبة النجاح', value: `${passRate}%`, tone: 'cyan' })}
    </div>
    <div class="chart-grid mb-3">
      <div class="card"><div class="card-head"><div class="card-title"><i data-feather="trending-up"></i> الإيرادات الشهرية</div></div><div class="card-body"><div class="chart-box"><canvas id="rep-rev"></canvas></div></div></div>
      <div class="card"><div class="card-head"><div class="card-title"><i data-feather="pie-chart"></i> توزيع الطلاب</div></div><div class="card-body"><div class="chart-box sm"><canvas id="rep-grade"></canvas></div></div></div>
    </div>
    <div class="grid grid-2 mb-3">
      <div class="card"><div class="card-head"><div class="card-title"><i data-feather="bar-chart-2"></i> الحضور حسب الفصل</div></div><div class="card-body"><div class="chart-box sm"><canvas id="rep-att"></canvas></div></div></div>
      <div class="card"><div class="card-head"><div class="card-title"><i data-feather="award"></i> توزيع التقديرات</div></div><div class="card-body"><div class="chart-box sm"><canvas id="rep-dist"></canvas></div></div></div>
    </div>
    <div class="grid grid-2">
      <div class="card"><div class="card-head"><div class="card-title"><i data-feather="star"></i> أفضل الطلاب</div></div><div class="card-body"><div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>الطالب</th><th>الفصل</th><th>المعدل</th></tr></thead><tbody>${top.map((s, i) => `<tr><td>${i + 1}</td><td>${U.esc(s.fullName)}</td><td>${U.esc(classOf(s.classId))}</td><td>${s.avg.toFixed(1)}%</td></tr>`).join('')}</tbody></table></div></div></div>
      <div class="card"><div class="card-head"><div class="card-title"><i data-feather="layers"></i> أداء الفصول</div></div><div class="card-body"><div class="table-wrap"><table class="data"><thead><tr><th>الفصل</th><th>الطلاب</th><th>الحضور</th></tr></thead><tbody>${classRows.map((c) => `<tr><td>${U.esc(c.name)}</td><td>${c.count}</td><td>${c.rate}%</td></tr>`).join('')}</tbody></table></div></div></div>
    </div>`;
  }

  App.pages.reports = {
    async render(container) {
      await load();
      container.innerHTML = `<div class="page-head"><div><h1>التقارير والإحصائيات</h1><div class="subtitle">نظرة شاملة على الأداء الأكاديمي والحضور والإيرادات.</div></div><div class="page-actions"><button class="btn btn-ghost" id="print-report"><i data-feather="printer"></i> طباعة التقرير</button></div></div>
        <div id="reports-body">${reportHtml()}</div>`;
      Charts.revenue(document.getElementById('rep-rev'), cache.payments);
      Charts.studentsByGrade(document.getElementById('rep-grade'), cache.classes, cache.students);
      Charts.attendanceByClass(document.getElementById('rep-att'), cache.classes, cache.attendance);
      Charts.gradeDistribution(document.getElementById('rep-dist'), cache.grades);
      document.getElementById('print-report').onclick = () => {
        const el = document.getElementById('reports-body');
        U.print(`<div class="head"><div><h1>تقرير مدرسة السلام</h1><div class="muted">${U.fmtDate(U.todayISO())}</div></div><div class="logo">س</div></div>${el.innerHTML}`, 'تقرير المدرسة');
      };
    },
  };
})();
