/* Salaam School — payments and receipts. */
(function () {
  'use strict';

  let user = null;
  let cache = { payments: [], students: [], classes: [] };
  let state = { q: '', status: '', type: '' };

  function studentName(id) { const s = cache.students.find((x) => x.id === id); return s ? s.fullName : '—'; }
  function className(id) { const c = cache.classes.find((x) => x.id === id); return c ? c.className : '—'; }
  function scoped() {
    if (user.role === 'parent') return cache.payments.filter((p) => (user.childIds || []).includes(p.studentId));
    return cache.payments;
  }
  function filtered() {
    const q = state.q.trim();
    return scoped().filter((p) => {
      if (state.status && p.status !== state.status) return false;
      if (state.type && p.type !== state.type) return false;
      if (q && !`${studentName(p.studentId)} ${p.receiptNo}`.includes(q)) return false;
      return true;
    });
  }

  function statsHtml() {
    const rows = scoped();
    const total = rows.reduce((s, p) => s + Number(p.amount || 0), 0);
    const paid = rows.reduce((s, p) => s + Number(p.paidAmount || 0), 0);
    const remaining = Math.max(0, total - paid);
    const overdue = rows.filter((p) => p.status === 'overdue').reduce((s, p) => s + Math.max(0, Number(p.amount) - Number(p.paidAmount || 0)), 0);
    return `<div class="stats-grid mb-3">
      ${App.statCard({ icon: 'credit-card', label: 'إجمالي المستحقات', value: U.money(total), tone: 'primary' })}
      ${App.statCard({ icon: 'check-circle', label: 'المحصّل', value: U.money(paid), tone: 'success' })}
      ${App.statCard({ icon: 'clock', label: 'المتبقي', value: U.money(remaining), tone: 'warning' })}
      ${App.statCard({ icon: 'alert-triangle', label: 'المتأخر', value: U.money(overdue), tone: 'danger' })}
    </div>`;
  }

  function renderTable() {
    const list = filtered();
    const el = document.getElementById('payments-table');
    if (!el) return;
    el.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>الطالب</th><th>النوع</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الاستحقاق</th><th>الحالة</th><th></th></tr></thead><tbody>${list.length ? list.map((p) => `<tr>
      <td><div class="cell-main">${App.avatar(studentName(p.studentId))}<div><div class="name">${U.esc(studentName(p.studentId))}</div><div class="sub">${U.esc(className((cache.students.find((s) => s.id === p.studentId) || {}).classId))}</div></div></div></td>
      <td>${U.paymentType(p.type)}</td><td>${U.money(p.amount)}</td><td>${U.money(p.paidAmount)}</td><td>${U.money(Math.max(0, p.amount - (p.paidAmount || 0)))}</td>
      <td>${U.fmtDateShort(p.dueDate)}</td><td>${U.badge(U.paymentStatus(p.status), U.paymentTone(p.status))}</td>
      <td><div class="table-actions"><button class="btn btn-sm btn-ghost" data-receipt="${p.id}" title="إيصال"><i data-feather="file-text"></i></button>${user.role === 'admin' ? `<button class="btn btn-sm btn-ghost" data-edit="${p.id}"><i data-feather="edit-2"></i></button><button class="btn btn-sm btn-danger" data-del="${p.id}"><i data-feather="trash-2"></i></button>` : ''}</div></td>
    </tr>`).join('') : `<tr><td colspan="8">${App.empty('credit-card', 'لا توجد مدفوعات', '')}</td></tr>`}</tbody></table></div>`;
    const count = document.getElementById('payments-count');
    if (count) count.textContent = `${list.length} سجل`;
    bind();
    if (window.feather) feather.replace();
  }

  function bind() {
    document.querySelectorAll('[data-receipt]').forEach((b) => { b.onclick = () => receipt(Number(b.dataset.receipt)); });
    document.querySelectorAll('[data-edit]').forEach((b) => { b.onclick = () => openForm(cache.payments.find((p) => p.id === Number(b.dataset.edit))); });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const p = cache.payments.find((x) => x.id === Number(b.dataset.del));
        if (!p) return;
        const ok = await App.confirm(`حذف سجل الدفع ${p.receiptNo}؟`, { danger: true, confirmText: 'حذف' });
        if (!ok) return;
        await DB.del('payments', p.id);
        App.toast('تم حذف السجل');
        await load();
      };
    });
  }

  function receipt(id) {
    const p = cache.payments.find((x) => x.id === id);
    if (!p) return;
    const student = cache.students.find((s) => s.id === p.studentId);
    const html = `<div class="head"><div><h1>إيصال دفع</h1><div class="muted">مدرسة السلام — ${U.fmtDate(U.todayISO())}</div></div><div class="logo">س</div></div>
      <h2>رقم الإيصال: ${U.esc(p.receiptNo)}</h2>
      <table><tbody>
        <tr><th style="width:160px">الطالب</th><td>${U.esc(studentName(p.studentId))}</td></tr>
        <tr><th>الفصل</th><td>${U.esc(student ? className(student.classId) : '—')}</td></tr>
        <tr><th>نوع الدفع</th><td>${U.paymentType(p.type)}</td></tr>
        <tr><th>المبلغ</th><td>${U.money(p.amount)}</td></tr>
        <tr><th>المدفوع</th><td>${U.money(p.paidAmount)}</td></tr>
        <tr><th>المتبقي</th><td>${U.money(Math.max(0, p.amount - (p.paidAmount || 0)))}</td></tr>
        <tr><th>تاريخ الاستحقاق</th><td>${U.fmtDate(p.dueDate)}</td></tr>
        <tr><th>الحالة</th><td>${U.paymentStatus(p.status)}</td></tr>
      </tbody></table>
      <div style="display:flex;justify-content:space-between;margin-top:40px"><div>توقيع المحاسب: ................</div><div>ختم المدرسة</div></div>`;
    U.print(html, `إيصال ${p.receiptNo}`);
  }

  function openForm(payment) {
    const isEdit = !!payment;
    const p = payment || { studentId: cache.students[0] ? cache.students[0].id : '', type: 'tuition', amount: 2500, paidAmount: 0, dueDate: U.todayISO(), paidDate: '', status: 'pending', receiptNo: `R-2026-${String(cache.payments.length + 1).padStart(4, '0')}`, notes: '' };
    const studentOptions = cache.students.map((s) => `<option value="${s.id}" ${String(s.id) === String(p.studentId) ? 'selected' : ''}>${U.esc(s.fullName)} — ${U.esc(className(s.classId))}</option>`).join('');
    const m = App.modal({
      title: isEdit ? 'تعديل سجل الدفع' : 'إضافة دفعة',
      body: `<form id="payment-form" class="form-grid">
        <div class="field full-span"><label>الطالب</label><select class="select" name="studentId">${studentOptions}</select></div>
        <div class="field"><label>النوع</label><select class="select" name="type">${[['tuition', 'مصاريف دراسية'], ['bus', 'رسوم النقل'], ['activity', 'أنشطة'], ['uniform', 'زي مدرسي'], ['other', 'أخرى']].map(([v, l]) => `<option value="${v}" ${p.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>الحالة</label><select class="select" name="status">${[['pending', 'معلق'], ['paid', 'مدفوع'], ['overdue', 'متأخر']].map(([v, l]) => `<option value="${v}" ${p.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>المبلغ</label><input class="input" type="number" min="0" name="amount" value="${p.amount}"></div>
        <div class="field"><label>المدفوع</label><input class="input" type="number" min="0" name="paidAmount" value="${p.paidAmount}"></div>
        <div class="field"><label>تاريخ الاستحقاق</label><input class="input" type="date" name="dueDate" value="${p.dueDate}"></div>
        <div class="field"><label>تاريخ الدفع</label><input class="input" type="date" name="paidDate" value="${p.paidDate || ''}"></div>
        <div class="field"><label>رقم الإيصال</label><input class="input" name="receiptNo" value="${U.esc(p.receiptNo)}"></div>
        <div class="field full-span"><label>ملاحظات</label><input class="input" name="notes" value="${U.esc(p.notes || '')}"></div>
      </form>`,
      footer: `<button class="btn btn-ghost" data-cancel>إلغاء</button><button class="btn btn-primary" id="save-payment"><i data-feather="save"></i> حفظ</button>`,
    });
    m.root.querySelector('[data-cancel]').onclick = m.close;
    m.root.querySelector('#save-payment').onclick = async () => {
      const form = m.root.querySelector('#payment-form');
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const amount = Number(fd.get('amount'));
      const paid = Number(fd.get('paidAmount'));
      let status = fd.get('status');
      if (paid >= amount && amount > 0) status = 'paid';
      const value = { studentId: Number(fd.get('studentId')), type: fd.get('type'), amount, paidAmount: paid, dueDate: fd.get('dueDate'), paidDate: fd.get('paidDate') || null, status, receiptNo: String(fd.get('receiptNo')).trim(), notes: String(fd.get('notes')).trim() };
      if (isEdit) { value.id = p.id; await DB.put('payments', value); App.toast('تم تحديث السجل'); }
      else { await DB.add('payments', value); App.toast('تمت إضافة الدفعة'); }
      m.close();
      await load();
    };
  }

  async function load() {
    const [payments, students, classes] = await Promise.all([DB.all('payments'), DB.all('students'), DB.all('classes')]);
    cache = { payments, students, classes };
    renderTable();
  }

  App.pages.payments = {
    async render(container, currentUser) {
      user = currentUser;
      await load();
      container.innerHTML = `<div class="page-head"><div><h1>المصروفات والمدفوعات</h1><div class="subtitle">متابعة المصاريف الدراسية، النقل، الأنشطة، والإيصالات.</div></div><div class="page-actions">${user.role === 'admin' ? `<button class="btn btn-primary" id="add-payment"><i data-feather="plus"></i> إضافة دفعة</button>` : ''}</div></div>
        ${statsHtml()}
        <div class="card"><div class="card-head"><div class="row wrap" style="gap:8px;width:100%"><div class="search"><i data-feather="search"></i><input class="input" id="payment-search" placeholder="ابحث بالطالب أو الإيصال..."></div>
          <select class="select" id="payment-status" style="width:auto"><option value="">كل الحالات</option><option value="paid">مدفوع</option><option value="pending">معلق</option><option value="overdue">متأخر</option></select>
          <select class="select" id="payment-type" style="width:auto"><option value="">كل الأنواع</option><option value="tuition">مصاريف</option><option value="bus">نقل</option><option value="activity">أنشطة</option><option value="uniform">زي</option></select>
          <span class="badge badge-primary" id="payments-count" style="margin-right:auto">0</span></div></div><div class="card-body"><div id="payments-table"></div></div></div>`;
      renderTable();
      document.getElementById('payment-search').addEventListener('input', U.debounce((e) => { state.q = e.target.value; renderTable(); }, 160));
      document.getElementById('payment-status').addEventListener('change', (e) => { state.status = e.target.value; renderTable(); });
      document.getElementById('payment-type').addEventListener('change', (e) => { state.type = e.target.value; renderTable(); });
      const add = document.getElementById('add-payment');
      if (add) add.onclick = () => openForm(null);
    },
  };
})();
