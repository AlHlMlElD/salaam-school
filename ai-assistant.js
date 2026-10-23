/* Salaam School — data-aware assistant.
 * Works offline with deterministic answers over IndexedDB. An optional
 * Claude-compatible proxy can be set from Settings; the demo never embeds a key.
 */
(function () {
  'use strict';

  let user = null;
  let panel = null;
  let body = null;
  let input = null;
  let busy = false;

  const SUGGESTIONS = [
    'كم طالب غايب اليوم؟',
    'مين لسه مدفعش المصاريف؟',
    'أفضل 3 طلاب',
    'نسبة الحضور',
    'ملخص المدرسة',
  ];

  function init(currentUser) {
    user = currentUser;
    if (!document.getElementById('ai-fab')) build();
    bind();
  }

  function build() {
    const fab = document.createElement('button');
    fab.id = 'ai-fab';
    fab.className = 'ai-fab';
    fab.title = 'المساعد الذكي';
    fab.innerHTML = '<i data-feather="star"></i>';
    document.body.appendChild(fab);

    const wrap = document.createElement('section');
    wrap.id = 'ai-panel';
    wrap.className = 'ai-panel';
    wrap.setAttribute('aria-label', 'المساعد الذكي');
    wrap.innerHTML = `
      <div class="ai-head">
        <div class="ai-avatar"><i data-feather="star"></i></div>
        <div class="meta"><div class="name">مساعد السلام</div><div class="status">● متصل بالبيانات المحلية</div></div>
        <button class="icon-btn" id="ai-close" title="إغلاق"><i data-feather="x"></i></button>
      </div>
      <div class="ai-body" id="ai-body"></div>
      <div class="ai-suggestions" id="ai-suggestions"></div>
      <form class="ai-input" id="ai-form">
        <input class="input" id="ai-text" placeholder="اسألني عن الطلاب، الحضور، المصاريف..." autocomplete="off">
        <button type="submit" title="إرسال"><i data-feather="send"></i></button>
      </form>`;
    document.body.appendChild(wrap);
    panel = wrap;
    body = document.getElementById('ai-body');
    input = document.getElementById('ai-text');

    const suggestions = document.getElementById('ai-suggestions');
    SUGGESTIONS.forEach((text) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ai-chip';
      b.textContent = text;
      b.addEventListener('click', () => ask(text));
      suggestions.appendChild(b);
    });

    addMessage('bot', 'أهلًا بك 👋 أنا مساعد السلام. أقدر أجاوبك من بيانات المدرسة المحلية عن الحضور، الدرجات، المصاريف، والطلاب.');
    if (window.feather) feather.replace();
  }

  function bind() {
    const fab = document.getElementById('ai-fab');
    const close = document.getElementById('ai-close');
    const form = document.getElementById('ai-form');
    if (fab) fab.onclick = () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) setTimeout(() => input && input.focus(), 50);
    };
    if (close) close.onclick = () => panel.classList.remove('open');
    if (form) form.onsubmit = (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      ask(text);
    };
  }

  function addMessage(kind, text) {
    const el = document.createElement('div');
    el.className = `ai-msg ${kind}`;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function typing() {
    const el = document.createElement('div');
    el.className = 'ai-msg bot';
    el.id = 'ai-typing';
    el.textContent = '...';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function stopTyping() {
    const el = document.getElementById('ai-typing');
    if (el) el.remove();
  }

  async function ask(text) {
    if (busy) return;
    busy = true;
    addMessage('user', text);
    typing();
    try {
      const answer = await answerQuestion(text);
      stopTyping();
      addMessage('bot', answer);
    } catch (error) {
      stopTyping();
      addMessage('bot', `حصل خطأ أثناء قراءة البيانات: ${error.message}`);
    } finally {
      busy = false;
    }
  }

  function scopeStudents(students) {
    if (!user) return students;
    if (user.role === 'student') return students.filter((s) => s.id === user.studentId);
    if (user.role === 'parent') return students.filter((s) => (user.childIds || []).includes(s.id));
    return students;
  }

  async function load() {
    const [students, classes, teachers, attendance, grades, payments, subjects] = await Promise.all([
      DB.all('students'), DB.all('classes'), DB.all('teachers'), DB.all('attendance'),
      DB.all('grades'), DB.all('payments'), DB.all('subjects'),
    ]);
    return { students: scopeStudents(students), classes, teachers, attendance, grades, payments, subjects };
  }

  function latestDate(rows) {
    return rows.reduce((max, r) => (r.date > max ? r.date : max), '');
  }

  function studentName(students, id) {
    const s = students.find((x) => x.id === id);
    return s ? s.fullName : '—';
  }

  function avgFor(studentId, grades) {
    const rows = grades.filter((g) => g.studentId === studentId);
    if (!rows.length) return 0;
    return rows.reduce((sum, g) => sum + (Number(g.score) / Number(g.maxScore || 100)) * 100, 0) / rows.length;
  }

  async function answerQuestion(question) {
    const q = question.replace(/[؟?]/g, '').trim();
    const data = await load();
    const { students, classes, teachers, attendance, grades, payments } = data;
    const ids = new Set(students.map((s) => s.id));
    const scopedAttendance = attendance.filter((a) => ids.has(a.studentId));
    const scopedGrades = grades.filter((g) => ids.has(g.studentId));
    const scopedPayments = payments.filter((p) => ids.has(p.studentId));

    if (/غايب|غياب|غاب|absence/i.test(q)) {
      const date = latestDate(scopedAttendance) || U.todayISO();
      const rows = scopedAttendance.filter((a) => a.date === date && a.status === 'absent');
      if (!rows.length) return `لا يوجد غياب مسجل في ${U.fmtDate(date)}. ✅`;
      const names = rows.map((a) => `• ${studentName(students, a.studentId)}`).join('\n');
      return `الغياب في ${U.fmtDate(date)}: ${rows.length} طالب\n${names}`;
    }

    if (/حضور|نسبة|attendance/i.test(q)) {
      if (!scopedAttendance.length) return 'لا توجد سجلات حضور بعد.';
      const present = scopedAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
      const rate = Math.round((present / scopedAttendance.length) * 100);
      return `نسبة الحضور الإجمالية: ${rate}%\nعدد السجلات: ${scopedAttendance.length}، الحضور: ${present}.`;
    }

    if (/مدفع|دفع|مصاريف|متأخر|فلوس|payment/i.test(q)) {
      const due = scopedPayments.filter((p) => p.status === 'pending' || p.status === 'overdue');
      if (!due.length) return 'كل المصروفات مسددة. ✅';
      const total = due.reduce((sum, p) => sum + Math.max(0, Number(p.amount) - Number(p.paidAmount || 0)), 0);
      const names = [...new Set(due.map((p) => studentName(students, p.studentId)))].slice(0, 8).map((n) => `• ${n}`).join('\n');
      return `يوجد ${due.length} مستحق غير مسدد بإجمالي ${U.money(total)}.\n${names}${due.length > 8 ? '\n…' : ''}`;
    }

    if (/أفضل|متفوق|ترتيب|top/i.test(q)) {
      const ranked = students.map((s) => ({ name: s.fullName, avg: avgFor(s.id, scopedGrades) }))
        .filter((x) => x.avg > 0).sort((a, b) => b.avg - a.avg).slice(0, 3);
      if (!ranked.length) return 'لا توجد درجات كافية بعد.';
      return `أفضل الطلاب:\n${ranked.map((x, i) => `${i + 1}. ${x.name} — ${x.avg.toFixed(1)}%`).join('\n')}`;
    }

    if (/طلاب|عدد الطلاب|students/i.test(q)) return `عدد الطلاب: ${students.length} طالب.`;

    if (/مدرسين|معلمين|teachers/i.test(q)) return `عدد المدرسين: ${teachers.length} مدرس.`;

    if (/فصول|classes/i.test(q)) return `عدد الفصول: ${classes.length} فصل.`;

    if (/درجات|نتيجة|معدل/i.test(q)) {
      if (!scopedGrades.length) return 'لا توجد درجات مسجلة.';
      const avg = scopedGrades.reduce((sum, g) => sum + (Number(g.score) / Number(g.maxScore || 100)) * 100, 0) / scopedGrades.length;
      return `متوسط الدرجات: ${avg.toFixed(1)}% — ${U.gradeLabel(avg)}.\nعدد الدرجات: ${scopedGrades.length}.`;
    }

    if (/ملخص|تقرير|summary/i.test(q)) {
      const present = scopedAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
      const rate = scopedAttendance.length ? Math.round((present / scopedAttendance.length) * 100) : 0;
      const due = scopedPayments.filter((p) => p.status !== 'paid').reduce((sum, p) => sum + Math.max(0, Number(p.amount) - Number(p.paidAmount || 0)), 0);
      return `ملخص سريع:\n• الطلاب: ${students.length}\n• الفصول: ${classes.length}\n• المدرسون: ${teachers.length}\n• نسبة الحضور: ${rate}%\n• مستحقات غير مسددة: ${U.money(due)}`;
    }

    // Optional remote Claude-compatible proxy, configured in Settings.
    const endpoint = localStorage.getItem('salaam_ai_endpoint');
    if (endpoint) {
      try {
        const summary = {
          students: students.length, classes: classes.length, teachers: teachers.length,
          attendanceRate: scopedAttendance.length ? Math.round((scopedAttendance.filter((a) => a.status !== 'absent').length / scopedAttendance.length) * 100) : 0,
          unpaid: scopedPayments.filter((p) => p.status !== 'paid').length,
        };
        const res = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6', max_tokens: 700,
            system: `أنت مساعد مدرسة السلام. أجب بالعربية وباختصار. ملخص البيانات: ${JSON.stringify(summary)}`,
            messages: [{ role: 'user', content: question }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const text = json?.content?.[0]?.text || json?.choices?.[0]?.message?.content;
        if (text) return text;
      } catch (_) { /* fall back below */ }
    }

    return 'أقدر أساعدك في: الغياب، نسبة الحضور، المصاريف غير المسددة، أفضل الطلاب، عدد الطلاب/المدرسين/الفصول، وملخص المدرسة. جرّب أحد الاقتراحات بالأسفل.';
  }

  window.AI = { init, ask };
})();
