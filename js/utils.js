/* Salaam School — shared formatting and browser helpers. */
(function () {
  'use strict';

  const AR = 'ar-EG';
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function dateObj(iso) {
    if (!iso) return null;
    const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(iso) {
    const d = dateObj(iso);
    if (!d) return '—';
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function fmtDateShort(iso) {
    const d = dateObj(iso);
    if (!d) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function isoAdd(iso, days) {
    const d = dateObj(iso) || new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString(AR, { maximumFractionDigits: 0 })} ج.م`;
  }

  function num(value, digits) {
    return Number(value || 0).toLocaleString(AR, { maximumFractionDigits: digits == null ? 1 : digits });
  }

  function percent(value) {
    return `${Number(value || 0).toFixed(0)}%`;
  }

  function avg(values) {
    const list = values.filter((v) => Number.isFinite(Number(v)));
    if (!list.length) return 0;
    return list.reduce((sum, v) => sum + Number(v), 0) / list.length;
  }

  function gradeLabel(score) {
    const n = Number(score);
    if (!Number.isFinite(n)) return '—';
    if (n >= 90) return 'ممتاز';
    if (n >= 80) return 'جيد جداً';
    if (n >= 70) return 'جيد';
    if (n >= 60) return 'مقبول';
    return 'راسب';
  }

  function gradeTone(score) {
    const n = Number(score);
    if (n >= 90) return 'success';
    if (n >= 80) return 'info';
    if (n >= 70) return 'primary';
    if (n >= 60) return 'warning';
    return 'danger';
  }

  function attendanceLabel(status) {
    return { present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'بعذر' }[status] || status || '—';
  }

  function attendanceTone(status) {
    return { present: 'success', absent: 'danger', late: 'warning', excused: 'info' }[status] || 'muted';
  }

  function roleLabel(role) {
    return { admin: 'مدير', teacher: 'مدرس', student: 'طالب', parent: 'ولي أمر' }[role] || role || '—';
  }

  function paymentType(type) {
    return { tuition: 'مصاريف دراسية', bus: 'رسوم النقل', activity: 'أنشطة', uniform: 'زي مدرسي', other: 'أخرى' }[type] || type || '—';
  }

  function paymentStatus(status) {
    return { paid: 'مدفوع', pending: 'معلق', overdue: 'متأخر' }[status] || status || '—';
  }

  function paymentTone(status) {
    return { paid: 'success', pending: 'warning', overdue: 'danger' }[status] || 'muted';
  }

  function examType(type) {
    return { monthly: 'شهري', midterm: 'نصف السنة', final: 'نهاية السنة', quiz: 'اختبار قصير' }[type] || type || '—';
  }

  function dayLabel(day) {
    return day || '—';
  }

  function badge(text, tone) {
    return `<span class="badge badge-${esc(tone || 'muted')}">${esc(text)}</span>`;
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait || 250);
    };
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function csv(filename, headers, rows) {
    const quote = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const lines = [headers.map(quote).join(',')].concat(rows.map((row) => row.map(quote).join(',')));
    download(filename, `\uFEFF${lines.join('\r\n')}`, 'text/csv;charset=utf-8');
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function print(html, title) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title || 'طباعة')}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>body{font-family:Cairo,Tahoma,sans-serif;direction:rtl;padding:28px;color:#111827}h1,h2,h3{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #d1d5db;padding:8px;text-align:right;font-size:13px}th{background:#f3f4f6}.muted{color:#6b7280}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:18px}.logo{width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#22d3ee);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px}</style>
      </head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  }

  function pct(part, total) {
    return total ? Math.round((part / total) * 100) : 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.U = {
    esc, fmtDate, fmtDateShort, todayISO, isoAdd, money, num, percent, avg,
    gradeLabel, gradeTone, attendanceLabel, attendanceTone, roleLabel,
    paymentType, paymentStatus, paymentTone, examType, dayLabel, badge,
    debounce, download, csv, readFile, print, pct, clamp,
    DAYS, MONTHS,
  };
})();
