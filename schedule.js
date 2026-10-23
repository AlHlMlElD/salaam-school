/* Salaam School — weekly schedule. */
(function () {
  'use strict';

  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const TIMES = [['08:00', '08:45'], ['08:50', '09:35'], ['09:45', '10:30'], ['10:35', '11:20'], ['11:30', '12:15'], ['12:20', '13:05']];
  let user = null;
  let cache = { classes: [], subjects: [], teachers: [], schedule: [], students: [] };
  let state = { classId: '', childId: '' };

  function className(id) { const c = cache.classes.find((x) => x.id === id); return c ? c.className : '—'; }
  function subjectName(id) { const s = cache.subjects.find((x) => x.id === id); return s ? s.subjectName : '—'; }
  function teacherName(id) { const t = cache.teachers.find((x) => x.id === id); return t ? t.fullName : '—'; }

  function scopeRows() {
    if (user.role === 'teacher') return cache.schedule.filter((s) => s.teacherId === user.teacherId);
    if (user.role === 'student') {
      const student = cache.students.find((s) => s.id === user.studentId);
      return student ? cache.schedule.filter((s) => s.classId === student.classId) : [];
    }
    if (user.role === 'parent') {
      const child = cache.students.find((s) => s.id === Number(state.childId));
      return child ? cache.schedule.filter((s) => s.classId === child.classId) : [];
    }
    return cache.schedule.filter((s) => String(s.classId) === String(state.classId));
  }

  function gridHtml() {
    const rows = scopeRows();
    return `<div class="schedule-wrap"><table class="schedule"><thead><tr><th style="width:90px">الحصة</th>${DAYS.map((d) => `<th>${d}</th>`).join('')}</tr></thead><tbody>
      ${TIMES.map((time, i) => `<tr><td><div class="slot" style="cursor:default;text-align:center"><div class="period">${i + 1}</div><div class="s">${time[0]}</div><div class="t">${time[1]}</div></div></td>
        ${DAYS.map((day) => {
          const matches = rows.filter((s) => s.day === day && s.period === i + 1);
          if (!matches.length) return `<td><div class="slot free" ${user.role === 'admin' ? `data-add="1" data-day="${day}" data-period="${i + 1}"` : ''}><div class="t">—</div></div></td>`;
          return `<td>${matches.map((s) => `<div class="slot" ${user.role === 'admin' ? `data-edit="${s.id}"` : ''}><div class="s">${U.esc(subjectName(s.subjectId))}</div><div class="t">${U.esc(teacherName(s.teacherId))}</div><div class="r">${U.esc(s.room)} · ${U.esc(className(s.classId))}</div></div>`).join('')}</td>`;
        }).join('')}
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  function renderGrid() {
    const el = document.getElementById('schedule-grid');
    if (el) el.innerHTML = gridHtml();
    bind();
    if (window.feather) feather.replace();
  }

  function bind() {
    document.querySelectorAll('[data-edit]').forEach((el) => { el.onclick = () => openForm(cache.schedule.find((s) => s.id === Number(el.dataset.edit))); });
    document.querySelectorAll('[data-add]').forEach((el) => { el.onclick = () => openForm(null, el.dataset.day, Number(el.dataset.period)); });
  }

  function openForm(lesson, day, period) {
    if (user.role !== 'admin') return;
    const isEdit = !!lesson;
    const s = lesson || { classId: Number(state.classId), subjectId: cache.subjects[0] ? cache.subjects[0].id : '', teacherId: cache.subjects[0] ? cache.subjects[0].teacherId : '', day: day || DAYS[0], period: period || 1, startTime: TIMES[(period || 1) - 1][0], endTime: TIMES[(period || 1) - 1][1], room: '' };
    const classOptions = cache.classes.map((c) => `<option value="${c.id}" ${String(c.id) === String(s.classId) ? 'selected' : ''}>${U.esc(c.className)}</option>`).join('');
    const subjectOptions = cache.subjects.map((x) => `<option value="${x.id}" ${String(x.id) === String(s.subjectId) ? 'selected' : ''}>${U.esc(x.subjectName)}</option>`).join('');
    const teacherOptions = cache.teachers.map((t) => `<option value="${t.id}" ${String(t.id) === String(s.teacherId) ? 'selected' : ''}>${U.esc(t.fullName)}</option>`).join('');
    const m = App.modal({
      title: isEdit ? 'تعديل الحصة' : 'إضافة حصة',
      body: `<form id="schedule-form" class="form-grid">
        <div class="field"><label>الفصل</label><select class="select" name="classId">${classOptions}</select></div>
        <div class="field"><label>المادة</label><select class="select" name="subjectId" id="slot-subject">${subjectOptions}</select></div>
        <div class="field"><label>المدرس</label><select class="select" name="teacherId" id="slot-teacher">${teacherOptions}</select></div>
        <div class="field"><label>اليوم</label><select class="select" name="day">${DAYS.map((d) => `<option value="${d}" ${s.day === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="field"><label>الحصة</label><select class="select" name="period">${TIMES.map((_, i) => `<option value="${i + 1}" ${Number(s.period) === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
        <div class="field"><label>القاعة</label><input class="input" name="room" value="${U.esc(s.room)}"></div>
        <div class="field"><label>من</label><input class="input" type="time" name="startTime" value="${s.startTime}"></div>
        <div class="field"><label>إلى</label><input class="input" type="time" name="endTime" value="${s.endTime}"></div>
      </form>`,
      footer: `${isEdit ? '<button class="btn btn-danger" data-del-slot>حذف</button>' : ''}<button class="btn btn-ghost" data-cancel>إلغاء</button><button class="btn btn-primary" id="save-slot"><i data-feather="save"></i> حفظ</button>`,
    });
    m.root.querySelector('[data-cancel]').onclick = m.close;
    const subject = m.root.querySelector('#slot-subject');
    subject.addEventListener('change', () => {
      const sub = cache.subjects.find((x) => x.id === Number(subject.value));
      if (sub) m.root.querySelector('#slot-teacher').value = sub.teacherId;
    });
    const del = m.root.querySelector('[data-del-slot]');
    if (del) del.onclick = async () => {
      const ok = await App.confirm('حذف هذه الحصة من الجدول؟', { danger: true, confirmText: 'حذف' });
      if (!ok) return;
      await DB.del('schedule', s.id);
      m.close(); App.toast('تم حذف الحصة'); await load();
    };
    m.root.querySelector('#save-slot').onclick = async () => {
      const form = m.root.querySelector('#schedule-form');
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const value = {
        classId: Number(fd.get('classId')), subjectId: Number(fd.get('subjectId')), teacherId: Number(fd.get('teacherId')),
        day: fd.get('day'), period: Number(fd.get('period')), startTime: fd.get('startTime'), endTime: fd.get('endTime'), room: String(fd.get('room')).trim(),
      };
      const clash = cache.schedule.find((x) => x.classId === value.classId && x.day === value.day && x.period === value.period && (!isEdit || x.id !== s.id));
      if (clash) { App.toast('هذا الوقت محجوز بالفعل لهذا الفصل', 'error'); return; }
      if (isEdit) { value.id = s.id; await DB.put('schedule', value); App.toast('تم تحديث الحصة'); }
      else { await DB.add('schedule', value); App.toast('تمت إضافة الحصة'); }
      m.close(); await load();
    };
  }

  async function load() {
    const [classes, subjects, teachers, schedule, students] = await Promise.all([DB.all('classes'), DB.all('subjects'), DB.all('teachers'), DB.all('schedule'), DB.all('students')]);
    cache = { classes, subjects, teachers, schedule, students };
    renderGrid();
  }

  function controlsHtml() {
    if (user.role === 'admin') {
      return `<div class="row wrap" style="gap:8px"><select class="select" id="schedule-class" style="width:auto">${cache.classes.map((c) => `<option value="${c.id}" ${String(c.id) === String(state.classId) ? 'selected' : ''}>${U.esc(c.className)}</option>`).join('')}</select><button class="btn btn-ghost" id="print-schedule"><i data-feather="printer"></i> طباعة</button></div>`;
    }
    if (user.role === 'parent') {
      return `<div class="row wrap" style="gap:8px"><select class="select" id="schedule-child" style="width:auto">${cache.students.filter((s) => (user.childIds || []).includes(s.id)).map((s) => `<option value="${s.id}" ${String(s.id) === String(state.childId) ? 'selected' : ''}>${U.esc(s.fullName)}</option>`).join('')}</select><button class="btn btn-ghost" id="print-schedule"><i data-feather="printer"></i> طباعة</button></div>`;
    }
    return `<button class="btn btn-ghost" id="print-schedule"><i data-feather="printer"></i> طباعة</button>`;
  }

  App.pages.schedule = {
    async render(container, currentUser) {
      user = currentUser;
      await load();
      if (user.role === 'admin' && !state.classId) state.classId = cache.classes[0] ? cache.classes[0].id : '';
      if (user.role === 'parent' && !state.childId) state.childId = (user.childIds || [])[0] || '';
      container.innerHTML = `<div class="page-head"><div><h1>الجداول الدراسية</h1><div class="subtitle">${user.role === 'admin' ? 'جدول أسبوعي لكل فصل، مع إمكانية التعديل.' : 'جدولك الأسبوعي.'}</div></div><div class="page-actions">${controlsHtml()}</div></div>
        <div class="card"><div class="card-head"><div class="card-title"><i data-feather="calendar"></i> ${user.role === 'admin' ? U.esc(className(state.classId)) : user.role === 'teacher' ? 'جدول المدرس' : 'الجدول الأسبوعي'}</div><span class="badge badge-primary">الأحد — الخميس</span></div><div class="card-body">${gridHtml()}</div></div>`;
      if (user.role === 'admin') document.getElementById('schedule-class').addEventListener('change', async (e) => { state.classId = e.target.value; await load(); });
      if (user.role === 'parent') document.getElementById('schedule-child').addEventListener('change', (e) => { state.childId = e.target.value; renderGrid(); });
      document.getElementById('print-schedule').onclick = () => {
        U.print(`<div class="head"><div><h1>الجدول الدراسي</h1><div class="muted">${user.role === 'admin' ? U.esc(className(state.classId)) : 'مدرسة السلام'} — ${U.fmtDate(U.todayISO())}</div></div><div class="logo">س</div></div>${gridHtml()}`, 'الجدول الدراسي');
      };
      bind();
    },
  };
})();
