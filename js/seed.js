/* Salaam School — deterministic demo data. */
(function () {
  'use strict';

  const BASE_DATE = '2026-10-22';
  const YEAR = '2026-2027';
  let rngState = 20261023;

  function rnd() {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  }
  function pick(list) { return list[Math.floor(rnd() * list.length)]; }
  function int(min, max) { return Math.floor(rnd() * (max - min + 1)) + min; }

  function iso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function addDays(dateIso, days) {
    const d = new Date(`${dateIso}T12:00:00`);
    d.setDate(d.getDate() + days);
    return iso(d);
  }
  function schoolDays(count) {
    const out = [];
    let cursor = new Date(`${BASE_DATE}T12:00:00`);
    while (out.length < count) {
      const day = cursor.getDay();
      if (day !== 5 && day !== 6) out.push(iso(cursor));
      cursor.setDate(cursor.getDate() - 1);
    }
    return out;
  }

  const STUDENT_NAMES = [
    'محمد أحمد', 'فاطمة علي', 'عمر محمود', 'مريم حسن',
    'يوسف إبراهيم', 'سلمى خالد', 'أحمد سمير', 'نور هشام',
    'كريم مصطفى', 'هبة عادل', 'علياء طارق', 'زياد وليد',
    'جنة محمد', 'مالك أشرف', 'رنا سامي', 'حسين فتحي',
    'ليلى رمضان', 'سيف الدين', 'ملك عمرو', 'إياد شريف',
    'حبيبة ناصر', 'مؤمن صلاح', 'رقية ياسر', 'آدم أيمن',
  ];
  const PARENT_NAMES = [
    'والد محمد أحمد', 'والدة فاطمة علي', 'والد عمر محمود', 'والدة مريم حسن',
    'والد يوسف إبراهيم', 'والدة سلمى خالد', 'والد أحمد سمير', 'والدة نور هشام',
  ];
  const TEACHERS = [
    { name: 'أحمد محمد', subject: 'الرياضيات' },
    { name: 'سارة عبد الله', subject: 'اللغة العربية' },
    { name: 'محمود حسن', subject: 'اللغة الإنجليزية' },
    { name: 'نهى كمال', subject: 'العلوم' },
    { name: 'خالد منصور', subject: 'التربية الدينية' },
    { name: 'هدى سعيد', subject: 'الدراسات الاجتماعية' },
    { name: 'ياسر فؤاد', subject: 'التربية الرياضية' },
    { name: 'منى عادل', subject: 'الفنون' },
  ];
  const SUBJECTS = [
    { name: 'الرياضيات', code: 'MATH' },
    { name: 'اللغة العربية', code: 'ARB' },
    { name: 'اللغة الإنجليزية', code: 'ENG' },
    { name: 'العلوم', code: 'SCI' },
    { name: 'التربية الدينية', code: 'REL' },
    { name: 'الدراسات الاجتماعية', code: 'SOC' },
  ];
  const CLASSES = [
    { name: 'الصف الأول أ', grade: '1', section: 'أ' },
    { name: 'الصف الأول ب', grade: '1', section: 'ب' },
    { name: 'الصف الثاني أ', grade: '2', section: 'أ' },
    { name: 'الصف الثاني ب', grade: '2', section: 'ب' },
    { name: 'الصف الثالث أ', grade: '3', section: 'أ' },
    { name: 'الصف الثالث ب', grade: '3', section: 'ب' },
  ];
  const TIMES = [
    ['08:00', '08:45'], ['08:50', '09:35'], ['09:45', '10:30'],
    ['10:35', '11:20'], ['11:30', '12:15'], ['12:20', '13:05'],
  ];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  function build() {
    rngState = 20261023;
    const users = [
      { id: 1, role: 'admin', email: 'admin@salaam.edu', password: 'Admin@123', name: 'المدير العام', phone: '01000000001', avatar: '' },
      { id: 2, role: 'teacher', email: 'teacher@salaam.edu', password: 'Teacher@123', name: 'أحمد محمد', phone: '01000000002', teacherId: 1, avatar: '' },
      { id: 3, role: 'student', email: 'student@salaam.edu', password: 'Student@123', name: 'محمد أحمد', phone: '01000000003', studentId: 1, avatar: '' },
      { id: 4, role: 'parent', email: 'parent@salaam.edu', password: 'Parent@123', name: 'والد محمد أحمد', phone: '01000000004', childIds: [1], avatar: '' },
    ];
    for (let i = 1; i < 8; i += 1) {
      users.push({
        id: 4 + i,
        role: 'parent',
        email: `parent${i + 1}@salaam.edu`,
        password: 'Parent@123',
        name: PARENT_NAMES[i],
        phone: `0100000000${4 + i}`,
        childIds: [i + 1],
        avatar: '',
      });
    }

    const teachers = TEACHERS.map((t, i) => ({
      id: i + 1,
      employeeId: `T-${String(i + 1).padStart(3, '0')}`,
      fullName: t.name,
      email: `teacher${i + 1}@salaam.edu`,
      phone: `0110000000${i + 1}`,
      subjects: [t.subject],
      classes: i < 6 ? [i + 1] : [1, 2],
      salary: 8000 + i * 350,
      hireDate: '2020-09-01',
      status: 'active',
      avatar: '',
    }));

    const classes = CLASSES.map((c, i) => ({
      id: i + 1,
      className: c.name,
      grade: c.grade,
      section: c.section,
      teacherId: i + 1,
      capacity: 30,
      year: YEAR,
      room: `قاعة ${i + 1}`,
    }));

    const subjects = SUBJECTS.map((s, i) => ({
      id: i + 1,
      subjectName: s.name,
      code: s.code,
      grade: String(Math.min(3, Math.floor(i / 2) + 1)),
      teacherId: i + 1,
      hoursWeek: [5, 5, 4, 3, 2, 2][i],
    }));

    const students = STUDENT_NAMES.map((name, i) => ({
      id: i + 1,
      studentId: `2026-${String(i + 1).padStart(3, '0')}`,
      fullName: name,
      birthDate: `201${8 + (i % 3)}-0${(i % 9) + 1}-1${i % 9}`,
      gender: i % 2 === 0 ? 'male' : 'female',
      classId: Math.floor(i / 4) + 1,
      parentId: i < 8 ? 4 + i : null,
      phone: `012000000${String(i + 1).padStart(2, '0')}`,
      address: 'القاهرة، مصر',
      photo: '',
      enrollDate: '2026-09-01',
      status: i === 23 ? 'inactive' : 'active',
      createdAt: '2026-09-01',
    }));

    const schedule = [];
    let scheduleId = 1;
    classes.forEach((cls, ci) => {
      DAYS.forEach((day, di) => {
        TIMES.forEach((time, pi) => {
          const subject = subjects[(ci + di + pi) % subjects.length];
          schedule.push({
            id: scheduleId++,
            classId: cls.id,
            subjectId: subject.id,
            teacherId: subject.teacherId,
            day,
            period: pi + 1,
            startTime: time[0],
            endTime: time[1],
            room: cls.room,
          });
        });
      });
    });

    const attendance = [];
    let attendanceId = 1;
    schoolDays(10).forEach((date) => {
      students.forEach((student) => {
        const r = rnd();
        let status = 'present';
        if (r > 0.93) status = 'absent';
        else if (r > 0.88) status = 'late';
        else if (r > 0.86) status = 'excused';
        attendance.push({
          id: attendanceId++,
          studentId: student.id,
          classId: student.classId,
          date,
          status,
          notes: status === 'absent' ? 'غياب بدون إذن' : '',
          recordedBy: 2,
        });
      });
    });

    const grades = [];
    let gradeId = 1;
    const examDates = { monthly: '2026-10-08', midterm: '2026-11-12', final: '2026-12-17' };
    students.forEach((student) => {
      subjects.forEach((subject) => {
        ['monthly', 'midterm', 'final'].forEach((examType) => {
          grades.push({
            id: gradeId++,
            studentId: student.id,
            subjectId: subject.id,
            examType,
            score: int(54, 100),
            maxScore: 100,
            term: 'first',
            year: YEAR,
            date: examDates[examType],
          });
        });
      });
    });

    const payments = [];
    let paymentId = 1;
    let receipt = 1;
    const feeTypes = [
      { type: 'tuition', amount: 2500, due: '2026-09-01' },
      { type: 'bus', amount: 600, due: '2026-10-01' },
      { type: 'activity', amount: 300, due: '2026-10-15' },
    ];
    students.forEach((student) => {
      feeTypes.forEach((fee) => {
        const r = rnd();
        let status = 'pending';
        let paidAmount = 0;
        let paidDate = null;
        if (r < 0.56) { status = 'paid'; paidAmount = fee.amount; paidDate = addDays(fee.due, int(0, 8)); }
        else if (r < 0.72) { status = 'pending'; paidAmount = Math.round(fee.amount * 0.5); }
        else if (r < 0.9) { status = 'pending'; paidAmount = 0; }
        else { status = 'overdue'; paidAmount = 0; }
        payments.push({
          id: paymentId++,
          studentId: student.id,
          type: fee.type,
          amount: fee.amount,
          paidAmount,
          dueDate: fee.due,
          paidDate,
          status,
          receiptNo: `R-2026-${String(receipt++).padStart(4, '0')}`,
          notes: status === 'overdue' ? 'مطلوب متابعة' : '',
        });
      });
    });

    const notifications = [
      { title: 'بدء العام الدراسي', body: 'نرحب بجميع الطلاب وأولياء الأمور في العام الدراسي 2026-2027.', targetRole: 'all', type: 'info', isRead: false, createdAt: '2026-09-01' },
      { title: 'غياب اليوم', body: 'تم تسجيل غياب 3 طلاب اليوم. يرجى متابعة أولياء الأمور.', targetRole: 'admin', type: 'warning', isRead: false, createdAt: '2026-10-22' },
      { title: 'موعد سداد المصروفات', body: 'آخر موعد لسداد القسط الثاني هو 2026-11-01.', targetRole: 'parent', type: 'alert', isRead: false, createdAt: '2026-10-20' },
      { title: 'نتيجة الشهر الأول', body: 'تم رفع نتائج الشهر الأول لجميع الصفوف.', targetRole: 'student', type: 'success', isRead: false, createdAt: '2026-10-18' },
      { title: 'اجتماع المدرسين', body: 'اجتماع هيئة التدريس يوم الأحد الساعة 10 صباحًا.', targetRole: 'teacher', type: 'info', isRead: false, createdAt: '2026-10-17' },
      { title: 'فعالية اليوم الرياضي', body: 'اليوم الرياضي السنوي يوم الخميس القادم.', targetRole: 'all', type: 'info', isRead: true, createdAt: '2026-10-15' },
      { title: 'تأخر سداد', body: 'لديك 3 طلاب متأخرين في المصروفات.', targetRole: 'admin', type: 'warning', isRead: true, createdAt: '2026-10-12' },
      { title: 'شهادة تقدير', body: 'تم إصدار شهادات التقدير للطلاب المتميزين.', targetRole: 'parent', type: 'success', isRead: true, createdAt: '2026-10-10' },
    ].map((n, i) => ({ ...n, id: i + 1 }));

    return { users, teachers, classes, subjects, students, schedule, attendance, grades, payments, notifications };
  }

  async function run() {
    if (await DB.count('users') > 0) return false;
    const data = build();
    for (const name of DB.stores) {
      if (data[name]) await DB.bulkPut(name, data[name]);
    }
    return true;
  }

  async function exportJSON() {
    const out = {};
    for (const name of DB.stores) out[name] = await DB.all(name);
    return out;
  }

  async function importJSON(data) {
    for (const name of DB.stores) {
      await DB.clear(name);
      if (Array.isArray(data[name])) await DB.bulkPut(name, data[name]);
    }
  }

  window.Seed = { run, build, exportJSON, importJSON, BASE_DATE, YEAR };
})();
