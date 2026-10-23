/* Salaam School — role dashboards. */
(function () {
  'use strict';

  const YEAR_END = '2027-06-30';
  let cdTimer = null;

  function className(classes, id) {
    const c = classes.find((x) => x.id === id);
    return c ? c.className : '—';
  }
  function subjectName(subjects, id) {
    const s = subjects.find((x) => x.id === id);
    return s ? s.subjectName : '—';
  }
  function studentName(students, id) {
    const s = students.find((x) => x.id === id);
    return s ? s.fullName : '—';
  }
  function latestDate(rows) {
    return rows.reduce((max, r) => (r.date > max ? r.date : max), '');
  }
  function rate(rows) {
    if (!rows.length) return 0;
    return Math.round((rows.filter((r) => r.status === 'present' || r.status === 'late').length / rows.length) * 100);
  }
  function avgFor(studentId, grades) {
    const rows = grades.filter((g) => g.studentId === studentId);
    if (!rows.length) return 0;
    return rows.reduce((sum, g) => sum + (Number(g.score) / Number(g.maxScore || 100)) * 100, 0) / rows.length;
  }
  function scope(user, data) {
    if (user.role === 'student') {
      const student = data.students.find((s) => s.id === user.studentId);
      const classIds = student ? [student.classId] : [];
      return { students: student ? [student] : [], classes: data.classes, subjects: data.subjects, schedule: data.schedule.filter((s) => classIds.includes(s.classId)), attendance: data.attendance.filter((a) => a.studentId === user.studentId), grades: data.grades.filter((g) => g.studentId === user.studentId), payments: data.payments.filter((p) => p.studentId === user.studentId) };
    }
    if (user.role === 'parent') {
      const ids = user.childIds || [];
      const students = data.students.filter((s) => ids.includes(s.id));
      const classIds = students.map((s) => s.classId);
      return { students, classes: data.classes, subjects: data.subjects, schedule: data.schedule.filter((s) => classIds.includes(s.classId)), attendance: data.attendance.filter((a) => ids.includes(a.studentId)), grades: data.grades.filter((g) => ids.includes(g.studentId)), payments: data.payments.filter((p) => ids.includes(p.studentId)) };
    }
    if (user.role === 'teacher') {
      const me = data.teachers.find((t) => t.id === user.teacherId);
      const classIds = me ? (me.classes || []) : [];
      const students = data.students.filter((s) => classIds.includes(s.classId));
      const ids = students.map((s) => s.id);
      return { students, classes: data.classes.filter((c) => classIds.includes(c.id)), subjects: data.subjects.filter((s) => s.teacherId === user.teacherId), schedule: data.schedule.filter((s) => s.teacherId === user.teacherId), attendance: data.attendance.filter((a) => ids.includes(a.studentId)), grades: data.grades.filter((g) => ids.includes(g.studentId)), payments: data.payments.filter((p) => ids.includes(p.studentId)), teacher: me, classIds };
    }
    return data;
  }

  function countdownHtml() {
    return `<div class="countdown" id="countdown">
      <div class="cd-unit"><b id="cd-years">00</b><span>سنة</span></div>
      <div class="cd-unit"><b id="cd-months">00</b><span>شهر</span></div>
      <div class="cd-unit"><b id="cd-days">00</b><span>يوم</span></div>
      <div class="cd-unit"><b id="cd-hours">00</b><span>ساعة</span></div>
      <div class="cd-unit"><b id="cd-mins">00</b><span>دقيقة</span></div>
    </div>`;
  }

  function tickCountdown() {
    const target = new Date(`${YEAR_END}T23:59:59`).getTime();
    const now = Date.now();
    const diff = Math.max(0, target - now);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const d = days % 30;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v).padStart(2, '0'); };
    set('cd-years', years); set('cd-months', months); set('cd-days', d);
    set('cd-hours', hours % 24); set('cd-mins', mins % 60);
  }

  function ringHtml(pct, present, absent) {
    return `<div class="ring-wrap">
      <div class="ring" style="--p:${pct}"><div class="val"><b>${pct}%</b><span>حضور اليوم</span></div></div>
      <div class="ring-legend">
        <div class="item"><span><span class="dot" style="background:var(--cyan)"></span>حاضر</span><b>${present}</b></div>
        <div class="item"><span><span class="dot" style="background:var(--danger)"></span>غائب</span><b>${absent}</b></div>
        <div class="item"><span><span class="dot" style="background:var(--warning)"></span>متأخر</span><b>${Math.max(0, 100 - pct)}%</b></div>
      </div>
    </div>`;
  }

  function notificationsCard(user, notifications) {
    const list = App.visibleNotifications(user, notifications).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 4);
    return `<div class="card"><div class="card-head"><div class="card-title"><i data-feather="bell"></i> آخر الإشعارات</div><a class="btn btn-sm btn-ghost" href="${App.base()}pages/notifications.html">الكل</a></div>
      <div class="card-body tight">${list.length ? `<div class="list">${list.map((n) => `<div class="list-item"><span class="avatar" style="width:30px;height:30px;border-radius:9px"><i data-feather="${n.type === 'warning' || n.type === 'alert' ? 'alert-triangle' : n.type === 'success' ? 'check-circle' : 'info'}"></i></span><div class="meta"><div class="name">${U.esc(n.title)}</div><div class="sub">${U.esc(n.body).slice(0, 70)}</div></div><div class="end">${U.fmtDateShort(n.createdAt)}</div></div>`).join('')}</div>` : App.empty('bell', 'لا توجد إشعارات', '')}</div></div>`;
  }

  async function renderDashboard(container, user) {
    const [students, classes, teachers, subjects, attendance, grades, payments, schedule, notifications] = await Promise.all([
      DB.all('students'), DB.all('classes'), DB.all('teachers'), DB.all('subjects'),
      DB.all('attendance'), DB.all('grades'), DB.all('payments'), DB.all('schedule'), DB.all('notifications'),
    ]);
    const all = { students, classes, teachers, subjects, attendance, grades, payments, schedule, notifications };
    const data = scope(user, all);
    const latest = latestDate(data.attendance);
    const latestRows = data.attendance.filter((a) => a.date === latest);
    const present = latestRows.filter((a) => a.status === 'present' || a.status === 'late').length;
    const absent = latestRows.filter((a) => a.status === 'absent').length;
    const attendanceRate = rate(latestRows);
    const totalRevenue = data.payments.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
    const unpaid = data.payments.filter((p) => p.status !== 'paid').reduce((sum, p) => sum + Math.max(0, Number(p.amount) - Number(p.paidAmount || 0)), 0);
    const b = App.base();
    const todayName = U.DAYS[new Date().getDay()];
    const schoolDay = todayName === 'الجمعة' || todayName === 'السبت' ? 'الأحد' : todayName;

    if (user.role === 'admin') {
      const recentStudents = [...data.students].sort((a, b2) => b2.id - a.id).slice(0, 6);
      const recentPayments = [...data.payments].sort((a, b2) => b2.id - a.id).slice(0, 5);
      const absentRows = latestRows.filter((a) => a.status === 'absent').slice(0, 5);
      container.innerHTML = `
        <div class="hero-card mb-3"><div class="hero-inner">
          <div><div class="hero-greet">مرحبًا بك مجددًا،</div><div class="hero-name">${U.esc(user.name)}</div><div class="hero-sub">${U.fmtDate(U.todayISO())} · إليك نظرة سريعة على مدرستك اليوم.</div>
          <div class="hero-actions mt-3"><a class="btn btn-primary" href="${b}pages/students.html"><i data-feather="user-plus"></i> إضافة طالب</a><a class="btn btn-cyan" href="${b}pages/attendance.html"><i data-feather="check-square"></i> تسجيل الحضور</a><a class="btn btn-ghost" href="${b}pages/reports.html"><i data-feather="bar-chart-2"></i> التقارير</a></div></div>
          <div class="hero-orb"><i data-feather="shield"></i></div>
        </div></div>
        <div class="stats-grid mb-3">
          ${App.statCard({ icon: 'users', label: 'إجمالي الطلاب', value: U.num(data.students.length), tone: 'primary', delta: `▲ ${data.students.filter((s) => s.status === 'active').length} نشط`, deltaTone: 'up' })}
          ${App.statCard({ icon: 'user-check', label: 'المدرسون', value: U.num(data.teachers.length), tone: 'cyan', delta: 'هيئة التدريس', deltaTone: 'neutral' })}
          ${App.statCard({ icon: 'layers', label: 'الفصول الدراسية', value: U.num(data.classes.length), tone: 'success', delta: `سعة ${U.num(data.classes.reduce((s, c) => s + c.capacity, 0))}`, deltaTone: 'neutral' })}
          ${App.statCard({ icon: 'credit-card', label: 'المحصّل من المصروفات', value: U.money(totalRevenue), tone: 'warning', delta: `متأخر ${U.money(unpaid)}`, deltaTone: 'down' })}
        </div>
        <div class="chart-grid mb-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="trending-up"></i> الإيرادات الشهرية</div><span class="badge badge-primary">2026</span></div><div class="card-body"><div class="chart-box"><canvas id="rev-chart"></canvas></div></div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="pie-chart"></i> توزيع الطلاب</div></div><div class="card-body"><div class="chart-box sm"><canvas id="grade-chart"></canvas></div></div></div>
        </div>
        <div class="grid grid-2 mb-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="bar-chart-2"></i> الحضور حسب الفصل</div><span class="small muted">آخر ${data.attendance.length ? new Set(data.attendance.map((a) => a.date)).size : 0} أيام</span></div><div class="card-body"><div class="chart-box sm"><canvas id="att-chart"></canvas></div></div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="clock"></i> حضور اليوم</div><span class="badge badge-cyan">${latest ? U.fmtDateShort(latest) : '—'}</span></div><div class="card-body">${ringHtml(attendanceRate, present, absent)}<div class="divider"></div><div class="row-between"><span class="small muted">الفصول النشطة</span><b>${data.classes.length}</b></div></div></div>
        </div>
        <div class="grid grid-2 mb-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="users"></i> أحدث الطلاب</div><a class="btn btn-sm btn-ghost" href="${b}pages/students.html">عرض الكل</a></div><div class="card-body tight"><div class="table-wrap"><table class="data"><thead><tr><th>الطالب</th><th>الفصل</th><th>الحالة</th></tr></thead><tbody>${recentStudents.map((s) => `<tr><td><div class="cell-main">${App.avatar(s.fullName, s.photo)}<div><div class="name">${U.esc(s.fullName)}</div><div class="sub">${U.esc(s.studentId)}</div></div></div></td><td>${U.esc(className(data.classes, s.classId))}</td><td>${U.badge(s.status === 'active' ? 'نشط' : 'غير نشط', s.status === 'active' ? 'success' : 'muted')}</td></tr>`).join('')}</tbody></table></div></div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="alert-triangle"></i> غياب اليوم</div><span class="badge badge-danger">${absent} طالب</span></div><div class="card-body tight">${absentRows.length ? `<div class="list">${absentRows.map((a) => `<div class="list-item">${App.avatar(studentName(data.students, a.studentId))}<div class="meta"><div class="name">${U.esc(studentName(data.students, a.studentId))}</div><div class="sub">${U.esc(className(data.classes, a.classId))}</div></div><span class="badge badge-danger">غائب</span></div>`).join('')}</div>` : App.empty('check-circle', 'لا يوجد غياب', 'كل الطلاب حاضرون اليوم.')}</div></div>
        </div>
        <div class="grid grid-2 mb-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="credit-card"></i> أحدث المدفوعات</div><a class="btn btn-sm btn-ghost" href="${b}pages/payments.html">الكل</a></div><div class="card-body tight"><div class="table-wrap"><table class="data"><thead><tr><th>الطالب</th><th>النوع</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>${recentPayments.map((p) => `<tr><td>${U.esc(studentName(data.students, p.studentId))}</td><td>${U.paymentType(p.type)}</td><td>${U.money(p.amount)}</td><td>${U.badge(U.paymentStatus(p.status), U.paymentTone(p.status))}</td></tr>`).join('')}</tbody></table></div></div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="clock"></i> المتبقي على نهاية العام</div></div><div class="card-body">${countdownHtml()}<div class="center mt-2 small muted">30 يونيو 2027</div></div></div>
        </div>
        <div class="grid grid-2">${notificationsCard(user, notifications)}<div class="card"><div class="card-head"><div class="card-title"><i data-feather="zap"></i> إجراءات سريعة</div></div><div class="card-body"><div class="quick-grid">${[
          { icon: 'user-plus', label: 'طالب جديد', href: `${b}pages/students.html` },
          { icon: 'check-square', label: 'تسجيل حضور', href: `${b}pages/attendance.html` },
          { icon: 'award', label: 'إدخال درجات', href: `${b}pages/grades.html` },
          { icon: 'file-text', label: 'شهادة', href: `${b}pages/certificates.html` },
          { icon: 'credit-card', label: 'دفعة', href: `${b}pages/payments.html` },
          { icon: 'calendar', label: 'الجدول', href: `${b}pages/schedule.html` },
          { icon: 'bar-chart-2', label: 'تقرير', href: `${b}pages/reports.html` },
          { icon: 'bell', label: 'إشعار', href: `${b}pages/notifications.html` },
        ].map((q) => `<a class="quick" href="${q.href}"><i data-feather="${q.icon}"></i><span>${q.label}</span></a>`).join('')}</div></div></div></div>`;
      Charts.revenue(document.getElementById('rev-chart'), data.payments);
      Charts.studentsByGrade(document.getElementById('grade-chart'), data.classes, data.students);
      Charts.attendanceByClass(document.getElementById('att-chart'), data.classes, data.attendance);
    } else if (user.role === 'teacher') {
      const me = data.teacher || {};
      const myClasses = data.classes;
      const myStudents = data.students;
      const todaySchedule = data.schedule.filter((s) => s.teacherId === user.teacherId && s.day === schoolDay).sort((a, b2) => a.period - b2.period);
      const recentGrades = [...data.grades].sort((a, b2) => b2.id - a.id).slice(0, 6);
      container.innerHTML = `
        <div class="hero-card mb-3"><div class="hero-inner">
          <div><div class="hero-greet">أهلًا بك،</div><div class="hero-name">${U.esc(user.name)}</div><div class="hero-sub">${U.esc(me.subjects ? me.subjects.join(' · ') : 'مدرس')} · ${U.fmtDate(U.todayISO())}</div>
          <div class="hero-actions mt-3"><a class="btn btn-primary" href="${b}pages/attendance.html"><i data-feather="check-square"></i> تسجيل الحضور</a><a class="btn btn-cyan" href="${b}pages/grades.html"><i data-feather="award"></i> إدخال درجات</a><a class="btn btn-ghost" href="${b}pages/schedule.html"><i data-feather="calendar"></i> جدولي</a></div></div>
          <div class="hero-orb"><i data-feather="user-check"></i></div>
        </div></div>
        <div class="stats-grid mb-3">
          ${App.statCard({ icon: 'layers', label: 'فصولي', value: U.num(myClasses.length), tone: 'primary', delta: 'فصول مسندة إليك', deltaTone: 'neutral' })}
          ${App.statCard({ icon: 'users', label: 'طلابي', value: U.num(myStudents.length), tone: 'cyan', delta: 'طالب', deltaTone: 'neutral' })}
          ${App.statCard({ icon: 'calendar', label: 'حصص اليوم', value: U.num(todaySchedule.length), tone: 'success', delta: schoolDay, deltaTone: 'neutral' })}
          ${App.statCard({ icon: 'check-circle', label: 'نسبة الحضور', value: `${attendanceRate}%`, tone: 'warning', delta: `${present} حاضر · ${absent} غائب`, deltaTone: 'neutral' })}
        </div>
        <div class="grid grid-2 mb-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="calendar"></i> جدول اليوم — ${schoolDay}</div><a class="btn btn-sm btn-ghost" href="${b}pages/schedule.html">الجدول الكامل</a></div><div class="card-body tight">${todaySchedule.length ? `<div class="list">${todaySchedule.map((s) => `<div class="list-item"><span class="avatar" style="width:32px;height:32px;border-radius:9px"><i data-feather="book-open"></i></span><div class="meta"><div class="name">${U.esc(subjectName(data.subjects, s.subjectId))} — ${U.esc(className(data.classes, s.classId))}</div><div class="sub">الحصة ${s.period} · ${s.startTime} - ${s.endTime} · ${U.esc(s.room)}</div></div><span class="badge badge-primary">${s.startTime}</span></div>`).join('')}</div>` : App.empty('calendar', 'لا توجد حصص اليوم', 'استمتع بيومك.')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="clock"></i> حضور اليوم</div><span class="badge badge-cyan">${latest ? U.fmtDateShort(latest) : '—'}</span></div><div class="card-body">${ringHtml(attendanceRate, present, absent)}</div></div>
        </div>
        <div class="grid grid-2 mb-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="award"></i> أحدث الدرجات</div><a class="btn btn-sm btn-ghost" href="${b}pages/grades.html">الكل</a></div><div class="card-body tight"><div class="table-wrap"><table class="data"><thead><tr><th>الطالب</th><th>المادة</th><th>الدرجة</th><th>التقدير</th></tr></thead><tbody>${recentGrades.map((g) => `<tr><td>${U.esc(studentName(data.students, g.studentId))}</td><td>${U.esc(subjectName(data.subjects, g.subjectId))}</td><td>${U.num(g.score)} / ${U.num(g.maxScore)}</td><td>${U.badge(U.gradeLabel((g.score / g.maxScore) * 100), U.gradeTone((g.score / g.maxScore) * 100))}</td></tr>`).join('')}</tbody></table></div></div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="users"></i> فصولي</div></div><div class="card-body tight"><div class="list">${myClasses.map((c) => `<div class="list-item"><span class="avatar" style="width:32px;height:32px;border-radius:9px"><i data-feather="layers"></i></span><div class="meta"><div class="name">${U.esc(c.className)}</div><div class="sub">${data.students.filter((s) => s.classId === c.id).length} طالب · ${U.esc(c.room)}</div></div><a class="btn btn-sm btn-ghost" href="${b}pages/students.html?class=${c.id}">عرض</a></div>`).join('')}</div></div></div>
        </div>
        <div class="grid grid-2">${notificationsCard(user, notifications)}<div class="card"><div class="card-head"><div class="card-title"><i data-feather="zap"></i> إجراءات سريعة</div></div><div class="card-body"><div class="quick-grid">${[
          { icon: 'check-square', label: 'حضور', href: `${b}pages/attendance.html` },
          { icon: 'award', label: 'درجات', href: `${b}pages/grades.html` },
          { icon: 'calendar', label: 'جدولي', href: `${b}pages/schedule.html` },
          { icon: 'users', label: 'طلابي', href: `${b}pages/students.html` },
        ].map((q) => `<a class="quick" href="${q.href}"><i data-feather="${q.icon}"></i><span>${q.label}</span></a>`).join('')}</div></div></div></div>`;
    } else if (user.role === 'student') {
      const student = data.students[0];
      const myGrades = data.grades;
      const avg = avgFor(student ? student.id : 0, myGrades);
      const myAttendance = data.attendance;
      const mySchedule = data.schedule.filter((s) => s.classId === (student ? student.classId : 0) && s.day === schoolDay).sort((a, b2) => a.period - b2.period);
      const subjectsCount = new Set(myGrades.map((g) => g.subjectId)).size;
      const classStudents = all.students.filter((s) => s.classId === (student ? student.classId : 0));
      const rank = classStudents.map((s) => ({ id: s.id, avg: avgFor(s.id, all.grades) })).sort((a, b2) => b2.avg - a.avg).findIndex((x) => x.id === (student ? student.id : 0)) + 1;
      container.innerHTML = `
        <div class="hero-card mb-3"><div class="hero-inner">
          <div><div class="hero-greet">أهلًا،</div><div class="hero-name">${U.esc(user.name)}</div><div class="hero-sub">${U.esc(className(data.classes, student ? student.classId : 0))} · ${U.esc(student ? student.studentId : '')}</div>
          <div class="hero-actions mt-3"><a class="btn btn-primary" href="${b}pages/grades.html"><i data-feather="award"></i> درجاتي</a><a class="btn btn-cyan" href="${b}pages/schedule.html"><i data-feather="calendar"></i> جدولي</a><a class="btn btn-ghost" href="${b}pages/attendance.html"><i data-feather="check-square"></i> حضوري</a></div></div>
          <div class="hero-orb"><i data-feather="user"></i></div>
        </div></div>
        <div class="stats-grid mb-3">
          ${App.statCard({ icon: 'award', label: 'المعدل العام', value: `${avg.toFixed(1)}%`, tone: 'primary', delta: U.gradeLabel(avg), deltaTone: 'up' })}
          ${App.statCard({ icon: 'check-circle', label: 'نسبة الحضور', value: `${rate(myAttendance)}%`, tone: 'success', delta: `${myAttendance.filter((a) => a.status === 'absent').length} غياب`, deltaTone: 'neutral' })}
          ${App.statCard({ icon: 'book-open', label: 'المواد', value: U.num(subjectsCount), tone: 'cyan', delta: 'مادة', deltaTone: 'neutral' })}
          ${App.statCard({ icon: 'trending-up', label: 'ترتيبي في الفصل', value: rank ? `#${rank}` : '—', tone: 'warning', delta: `من ${classStudents.length} طالب`, deltaTone: 'neutral' })}
        </div>
        <div class="grid grid-2 mb-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="calendar"></i> جدول اليوم — ${schoolDay}</div><a class="btn btn-sm btn-ghost" href="${b}pages/schedule.html">الجدول الكامل</a></div><div class="card-body tight">${mySchedule.length ? `<div class="list">${mySchedule.map((s) => `<div class="list-item"><span class="avatar" style="width:32px;height:32px;border-radius:9px"><i data-feather="book-open"></i></span><div class="meta"><div class="name">${U.esc(subjectName(data.subjects, s.subjectId))}</div><div class="sub">الحصة ${s.period} · ${s.startTime} - ${s.endTime} · ${U.esc(s.room)}</div></div><span class="badge badge-primary">${s.startTime}</span></div>`).join('')}</div>` : App.empty('calendar', 'لا توجد حصص اليوم', 'استمتع بيومك.')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="clock"></i> حضوري</div></div><div class="card-body">${ringHtml(rate(myAttendance), myAttendance.filter((a) => a.status === 'present' || a.status === 'late').length, myAttendance.filter((a) => a.status === 'absent').length)}</div></div>
        </div>
        <div class="grid grid-2 mb-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="award"></i> درجاتي الأخيرة</div><a class="btn btn-sm btn-ghost" href="${b}pages/grades.html">الكل</a></div><div class="card-body tight"><div class="table-wrap"><table class="data"><thead><tr><th>المادة</th><th>الاختبار</th><th>الدرجة</th><th>التقدير</th></tr></thead><tbody>${[...myGrades].sort((a, b2) => b2.id - a.id).slice(0, 6).map((g) => `<tr><td>${U.esc(subjectName(data.subjects, g.subjectId))}</td><td>${U.examType(g.examType)}</td><td>${U.num(g.score)} / ${U.num(g.maxScore)}</td><td>${U.badge(U.gradeLabel((g.score / g.maxScore) * 100), U.gradeTone((g.score / g.maxScore) * 100))}</td></tr>`).join('')}</tbody></table></div></div></div>
          ${notificationsCard(user, notifications)}
        </div>`;
    } else {
      const children = data.students;
      const cards = children.map((child) => {
        const avg = avgFor(child.id, data.grades);
        const att = rate(data.attendance.filter((a) => a.studentId === child.id));
        const due = data.payments.filter((p) => p.studentId === child.id && p.status !== 'paid').reduce((sum, p) => sum + Math.max(0, Number(p.amount) - Number(p.paidAmount || 0)), 0);
        return `<div class="card"><div class="card-body"><div class="row" style="gap:12px">${App.avatar(child.fullName, child.photo, 'lg')}<div style="flex:1;min-width:0"><div class="strong">${U.esc(child.fullName)}</div><div class="small muted">${U.esc(child.studentId)} · ${U.esc(className(data.classes, child.classId))}</div></div>${U.badge(child.status === 'active' ? 'نشط' : 'غير نشط', child.status === 'active' ? 'success' : 'muted')}</div>
          <div class="grid grid-3 mt-3" style="gap:8px"><div><div class="small muted">المعدل</div><div class="strong">${avg.toFixed(1)}%</div></div><div><div class="small muted">الحضور</div><div class="strong">${att}%</div></div><div><div class="small muted">مستحق</div><div class="strong ${due ? 'danger-text' : 'success-text'}">${U.money(due)}</div></div></div>
          <div class="progress mt-2 ${att >= 85 ? 'green' : att >= 70 ? 'amber' : 'red'}"><span style="width:${att}%"></span></div></div></div>`;
      }).join('');
      const dueRows = data.payments.filter((p) => p.status !== 'paid').slice(0, 6);
      container.innerHTML = `
        <div class="hero-card mb-3"><div class="hero-inner"><div><div class="hero-greet">أهلًا،</div><div class="hero-name">${U.esc(user.name)}</div><div class="hero-sub">متابعة أبنائك: ${children.map((c) => c.fullName).join(' · ') || '—'}</div><div class="hero-actions mt-3"><a class="btn btn-primary" href="${b}pages/grades.html"><i data-feather="award"></i> الدرجات</a><a class="btn btn-cyan" href="${b}pages/attendance.html"><i data-feather="check-square"></i> الحضور</a><a class="btn btn-ghost" href="${b}pages/payments.html"><i data-feather="credit-card"></i> المصروفات</a></div></div><div class="hero-orb"><i data-feather="users"></i></div></div></div>
        <div class="grid grid-2 mb-3" style="grid-template-columns:repeat(${Math.min(children.length, 2)},minmax(0,1fr))">${cards || App.empty('users', 'لا يوجد أبناء مرتبطون', '')}</div>
        <div class="grid grid-2 mb-3">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="credit-card"></i> مستحقات قادمة</div><a class="btn btn-sm btn-ghost" href="${b}pages/payments.html">الكل</a></div><div class="card-body tight">${dueRows.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>الطالب</th><th>النوع</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody>${dueRows.map((p) => `<tr><td>${U.esc(studentName(data.students, p.studentId))}</td><td>${U.paymentType(p.type)}</td><td>${U.money(Math.max(0, p.amount - (p.paidAmount || 0)))}</td><td>${U.badge(U.paymentStatus(p.status), U.paymentTone(p.status))}</td></tr>`).join('')}</tbody></table></div>` : App.empty('check-circle', 'كل المصروفات مسددة', '')}</div></div>
          ${notificationsCard(user, notifications)}
        </div>`;
    }

    tickCountdown();
    if (cdTimer) clearInterval(cdTimer);
    if (document.getElementById('countdown')) cdTimer = setInterval(tickCountdown, 30000);
    if (window.feather) feather.replace();
  }

  App.pages.dashboard = { render: renderDashboard };
})();
