/* Salaam School — subjects management. */
(function () {
  'use strict';

  let cache = { subjects: [], teachers: [], classes: [] };
  let state = { q: '' };

  function teacherName(id) { const t = cache.teachers.find((x) => x.id === id); return t ? t.fullName : '—'; }
  function filtered() {
    return cache.subjects.filter((s) => !state.q || `${s.subjectName} ${s.code}`.includes(state.q));
  }

  function renderTable() {
    const list = filtered();
    const el = document.getElementById('subjects-table');
    if (!el) return;
    el.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>المادة</th><th>الكود</th><th>الصف</th><th>المدرس</th><th>حصص/أسبوع</th><th></th></tr></thead><tbody>${list.length ? list.map((s) => `<tr>
      <td><div class="cell-main"><span class="avatar" style="border-radius:10px"><i data-feather="book-open"></i></span><div class="name">${U.esc(s.subjectName)}</div></div></td>
      <td><span class="pill">${U.esc(s.code)}</span></td>
      <td>${U.badge(`الصف ${s.grade}`, 'primary')}</td>
      <td>${U.esc(teacherName(s.teacherId))}</td>
      <td>${U.num(s.hoursWeek)}</td>
      <td><div class="table-actions"><button class="btn btn-sm btn-ghost" data-edit="${s.id}"><i data-feather="edit-2"></i></button><button class="btn btn-sm btn-danger" data-del="${s.id}"><i data-feather="trash-2"></i></button></div></td>
    </tr>`).join('') : `<tr><td colspan="6">${App.empty('book-open', 'لا توجد مواد', 'أضف مادة جديدة.')}</td></tr>`}</tbody></table></div>`;
    document.getElementById('subjects-count').textContent = `${list.length} مادة`;
    bind();
    if (window.feather) feather.replace();
  }

  function bind() {
    document.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => openForm(cache.subjects.find((s) => s.id === Number(b.dataset.edit))); });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const s = cache.subjects.find((x) => x.id === Number(b.dataset.del));
        if (!s) return;
        const ok = await App.confirm(`حذف مادة "${s.subjectName}"؟`, { danger: true, confirmText: 'حذف' });
        if (!ok) return;
        await DB.del('subjects', s.id);
        App.toast('تم حذف المادة');
        await load();
      };
    });
  }

  function openForm(subject) {
    const isEdit = !!subject;
    const s = subject || { subjectName: '', code: '', grade: '1', teacherId: cache.teachers[0] ? cache.teachers[0].id : '', hoursWeek: 3 };
    const teacherOptions = cache.teachers.map((t) => `<option value="${t.id}" ${String(t.id) === String(s.teacherId) ? 'selected' : ''}>${U.esc(t.fullName)}</option>`).join('');
    const m = App.modal({
      title: isEdit ? 'تعديل المادة' : 'إضافة مادة',
      body: `<form id="subject-form" class="form-grid">
        <div class="field full-span"><label>اسم المادة *</label><input class="input" name="subjectName" value="${U.esc(s.subjectName)}" required></div>
        <div class="field"><label>الكود *</label><input class="input" name="code" value="${U.esc(s.code)}" required placeholder="MATH"></div>
        <div class="field"><label>الصف</label><select class="select" name="grade">${['1', '2', '3'].map((g) => `<option value="${g}" ${s.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
        <div class="field"><label>المدرس</label><select class="select" name="teacherId">${teacherOptions}</select></div>
        <div class="field"><label>عدد الحصص أسبوعيًا</label><input class="input" type="number" min="1" max="12" name="hoursWeek" value="${s.hoursWeek}"></div>
      </form>`,
      footer: `<button class="btn btn-ghost" data-cancel>إلغاء</button><button class="btn btn-primary" id="save-subject"><i data-feather="save"></i> حفظ</button>`,
    });
    m.root.querySelector('[data-cancel]').onclick = m.close;
    m.root.querySelector('#save-subject').onclick = async () => {
      const form = m.root.querySelector('#subject-form');
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const value = { subjectName: String(fd.get('subjectName')).trim(), code: String(fd.get('code')).trim(), grade: fd.get('grade'), teacherId: Number(fd.get('teacherId')), hoursWeek: Number(fd.get('hoursWeek')) };
      if (isEdit) { value.id = s.id; await DB.put('subjects', value); App.toast('تم تحديث المادة'); }
      else { await DB.add('subjects', value); App.toast('تمت إضافة المادة'); }
      m.close();
      await load();
    };
  }

  async function load() {
    const [subjects, teachers, classes] = await Promise.all([DB.all('subjects'), DB.all('teachers'), DB.all('classes')]);
    cache = { subjects, teachers, classes };
    renderTable();
  }

  App.pages.subjects = {
    async render(container) {
      await load();
      container.innerHTML = `<div class="page-head"><div><h1>المواد الدراسية</h1><div class="subtitle">إدارة المواد، الأكواد، والمدرسين المسؤولين.</div></div><div class="page-actions"><button class="btn btn-primary" id="add-subject"><i data-feather="plus"></i> إضافة مادة</button></div></div>
        <div class="card"><div class="card-head"><div class="row wrap" style="gap:8px;width:100%"><div class="search"><i data-feather="search"></i><input class="input" id="subject-search" placeholder="ابحث بالاسم أو الكود..."></div><span class="badge badge-primary" id="subjects-count" style="margin-right:auto">0 مادة</span></div></div><div class="card-body"><div id="subjects-table"></div></div></div>`;
      renderTable();
      document.getElementById('subject-search').addEventListener('input', U.debounce((e) => { state.q = e.target.value; renderTable(); }, 160));
      document.getElementById('add-subject').onclick = () => openForm(null);
    },
  };
})();
