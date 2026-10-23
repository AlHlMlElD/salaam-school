/* Salaam School — Chart.js wrappers with the dark theme. */
(function () {
  'use strict';

  const instances = [];
  const PALETTE = ['#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#60a5fa'];

  function destroyAll() {
    while (instances.length) {
      try { instances.pop().destroy(); } catch (_) { /* noop */ }
    }
  }

  function available(canvas) {
    if (typeof Chart === 'undefined') {
      const parent = canvas && canvas.parentElement;
      if (parent) parent.innerHTML = '<div class="empty"><div class="icon">!</div><h3>الرسوم غير متاحة</h3><p>تعذر تحميل Chart.js.</p></div>';
      return false;
    }
    return true;
  }

  function baseOptions(extra) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 650 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0b1425', borderColor: 'rgba(148,163,184,.24)', borderWidth: 1,
          titleColor: '#e8edf7', bodyColor: '#a8b6ca', padding: 10, cornerRadius: 8,
          titleFont: { family: 'Cairo', size: 12 }, bodyFont: { family: 'Cairo', size: 11 },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(148,163,184,.07)' }, ticks: { color: '#7c8ca5', font: { family: 'Cairo', size: 10 } }, border: { display: false } },
        y: { grid: { color: 'rgba(148,163,184,.07)' }, ticks: { color: '#7c8ca5', font: { family: 'Cairo', size: 10 } }, border: { display: false }, beginAtZero: true },
      },
    }, extra || {});
  }

  function make(canvas, config) {
    if (!available(canvas)) return null;
    const chart = new Chart(canvas.getContext('2d'), config);
    instances.push(chart);
    return chart;
  }

  function revenue(canvas, payments) {
    const totals = Array(12).fill(0);
    payments.forEach((p) => {
      const iso = p.paidDate || p.dueDate;
      const d = iso ? new Date(`${iso}T12:00:00`) : null;
      if (!d || Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== 2026) return;
      totals[d.getMonth()] += Number(p.paidAmount || 0);
    });
    return make(canvas, {
      type: 'line',
      data: {
        labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
        datasets: [{
          data: totals, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,.16)',
          fill: true, tension: 0.38, pointRadius: 2.5, pointHoverRadius: 5,
          pointBackgroundColor: '#a78bfa', borderWidth: 2.5,
        }],
      },
      options: baseOptions({
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${Number(ctx.raw).toLocaleString('ar-EG')} ج.م` },
            backgroundColor: '#0b1425', borderColor: 'rgba(148,163,184,.24)', borderWidth: 1,
            titleColor: '#e8edf7', bodyColor: '#a8b6ca', padding: 10, cornerRadius: 8,
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7c8ca5', font: { family: 'Cairo', size: 9 } }, border: { display: false } },
          y: { grid: { color: 'rgba(148,163,184,.07)' }, ticks: { color: '#7c8ca5', font: { family: 'Cairo', size: 9 }, callback: (v) => `${v / 1000}k` }, border: { display: false }, beginAtZero: true },
        },
      }),
    });
  }

  function attendanceByClass(canvas, classes, attendance) {
    const labels = classes.map((c) => c.className);
    const values = classes.map((c) => {
      const rows = attendance.filter((a) => a.classId === c.id);
      if (!rows.length) return 0;
      return Math.round((rows.filter((a) => a.status === 'present' || a.status === 'late').length / rows.length) * 100);
    });
    return make(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: values.map((_, i) => `${PALETTE[i % PALETTE.length]}cc`), borderRadius: 7, borderSkipped: false, maxBarThickness: 34 }],
      },
      options: baseOptions({
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw}% حضور` }, backgroundColor: '#0b1425', borderColor: 'rgba(148,163,184,.24)', borderWidth: 1, titleColor: '#e8edf7', bodyColor: '#a8b6ca', padding: 10, cornerRadius: 8 } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7c8ca5', font: { family: 'Cairo', size: 9 } }, border: { display: false } },
          y: { min: 0, max: 100, grid: { color: 'rgba(148,163,184,.07)' }, ticks: { color: '#7c8ca5', font: { family: 'Cairo', size: 9 }, callback: (v) => `${v}%` }, border: { display: false } },
        },
      }),
    });
  }

  function studentsByGrade(canvas, classes, students) {
    const grades = ['1', '2', '3'];
    const counts = grades.map((g) => students.filter((s) => {
      const cls = classes.find((c) => c.id === s.classId);
      return cls && cls.grade === g;
    }).length);
    return make(canvas, {
      type: 'doughnut',
      data: { labels: ['الصف الأول', 'الصف الثاني', 'الصف الثالث'], datasets: [{ data: counts, backgroundColor: ['#8b5cf6', '#22d3ee', '#34d399'], borderColor: '#0d1728', borderWidth: 4, hoverOffset: 5 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Cairo', size: 10 }, boxWidth: 8, boxHeight: 8, usePointStyle: true, padding: 12 } },
          tooltip: { backgroundColor: '#0b1425', borderColor: 'rgba(148,163,184,.24)', borderWidth: 1, titleColor: '#e8edf7', bodyColor: '#a8b6ca', padding: 10, cornerRadius: 8 },
        },
      },
    });
  }

  function gradeDistribution(canvas, grades) {
    const labels = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'راسب'];
    const counts = [0, 0, 0, 0, 0];
    grades.forEach((g) => {
      const pct = (Number(g.score) / Number(g.maxScore || 100)) * 100;
      if (pct >= 90) counts[0] += 1; else if (pct >= 80) counts[1] += 1; else if (pct >= 70) counts[2] += 1; else if (pct >= 60) counts[3] += 1; else counts[4] += 1;
    });
    return make(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ data: counts, backgroundColor: ['#34d399cc', '#22d3eecc', '#8b5cf6cc', '#fbbf24cc', '#fb7185cc'], borderRadius: 7, maxBarThickness: 36 }] },
      options: baseOptions({ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#7c8ca5', font: { family: 'Cairo', size: 10 } }, border: { display: false } }, y: { grid: { color: 'rgba(148,163,184,.07)' }, ticks: { color: '#7c8ca5', font: { family: 'Cairo', size: 9 } }, border: { display: false }, beginAtZero: true } } }),
    });
  }

  window.Charts = { revenue, attendanceByClass, studentsByGrade, gradeDistribution, destroyAll, PALETTE };
})();
