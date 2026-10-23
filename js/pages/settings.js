/* Salaam School — settings and data tools. */
(function () {
  'use strict';

  function getSettings() {
    try { return JSON.parse(localStorage.getItem('salaam_settings') || '{}'); } catch (_) { return {}; }
  }
  function saveSettings() {
    localStorage.setItem('salaam_settings', JSON.stringify({
      schoolName: document.getElementById('set-school').value.trim(),
      year: document.getElementById('set-year').value.trim(),
      aiEndpoint: document.getElementById('set-ai').value.trim(),
    }));
  }

  App.pages.settings = {
    async render(container) {
      const s = getSettings();
      container.innerHTML = `<div class="page-head"><div><h1>الإعدادات</h1><div class="subtitle">إعدادات المدرسة، البيانات، والنسخ الاحتياطي.</div></div></div>
        <div class="grid grid-2">
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="settings"></i> إعدادات عامة</div></div><div class="card-body">
            <div class="field mb-2"><label>اسم المدرسة</label><input class="input" id="set-school" value="${U.esc(s.schoolName || 'مدرسة السلام')}"></div>
            <div class="field mb-2"><label>العام الدراسي</label><input class="input" id="set-year" value="${U.esc(s.year || '2026-2027')}"></div>
            <div class="field mb-2"><label>رابط مساعد Claude الاختياري (Proxy)</label><input class="input" id="set-ai" value="${U.esc(s.aiEndpoint || '')}" placeholder="http://127.0.0.1:8787/api/ai" dir="ltr"><div class="hint">اتركه فارغًا لاستخدام المساعد المحلي. لا تضع مفتاح API هنا.</div></div>
            <button class="btn btn-primary" id="save-settings"><i data-feather="save"></i> حفظ الإعدادات</button>
          </div></div>
          <div class="card"><div class="card-head"><div class="card-title"><i data-feather="database"></i> البيانات</div></div><div class="card-body">
            <p class="small muted mb-3">البيانات محفوظة في IndexedDB على هذا المتصفح. يمكنك تصدير نسخة JSON واستعادتها.</p>
            <div class="row wrap" style="gap:8px"><button class="btn btn-ghost" id="export-data"><i data-feather="download"></i> تصدير JSON</button><label class="btn btn-ghost" style="cursor:pointer"><i data-feather="upload"></i> استيراد JSON<input type="file" id="import-data" accept="application/json" hidden></label><button class="btn btn-danger" id="reset-data"><i data-feather="refresh-cw"></i> إعادة البيانات التجريبية</button></div>
            <div class="divider"></div>
            <div class="kv"><div><div class="k">قاعدة البيانات</div><div class="v">IndexedDB — salaam_school</div></div><div><div class="k">عدد الطلاب</div><div class="v" id="db-students">—</div></div><div><div class="k">عدد السجلات</div><div class="v" id="db-total">—</div></div></div>
          </div></div>
        </div>
        <div class="card mt-3"><div class="card-head"><div class="card-title"><i data-feather="key"></i> الحسابات التجريبية</div></div><div class="card-body"><div class="table-wrap"><table class="data"><thead><tr><th>الدور</th><th>البريد</th><th>كلمة المرور</th></tr></thead><tbody>
          <tr><td>مدير</td><td>admin@salaam.edu</td><td>Admin@123</td></tr>
          <tr><td>مدرس</td><td>teacher@salaam.edu</td><td>Teacher@123</td></tr>
          <tr><td>طالب</td><td>student@salaam.edu</td><td>Student@123</td></tr>
          <tr><td>ولي أمر</td><td>parent@salaam.edu</td><td>Parent@123</td></tr>
        </tbody></table></div><p class="small muted mt-2">هذه نسخة محلية تعليمية؛ كلمات المرور مخزنة محليًا وليست مصادقة إنتاجية.</p></div></div>
        <div class="card mt-3"><div class="card-head"><div class="card-title"><i data-feather="info"></i> عن النظام</div></div><div class="card-body"><p class="small muted">نظام إدارة مدرسة السلام v1.0 — HTML/CSS/JavaScript، IndexedDB، Chart.js، html2pdf. واجهة عربية RTL بتصميم داكن. البيانات تجريبية وقابلة للاستبدال.</p></div></div>`;
      const [students, teachers, classes] = await Promise.all([DB.count('students'), DB.count('teachers'), DB.count('classes')]);
      document.getElementById('db-students').textContent = String(students);
      document.getElementById('db-total').textContent = String(students + teachers + classes + (await DB.count('attendance')) + (await DB.count('grades')) + (await DB.count('payments')));
      document.getElementById('save-settings').onclick = () => { saveSettings(); App.toast('تم حفظ الإعدادات'); };
      document.getElementById('export-data').onclick = async () => {
        const data = await Seed.exportJSON();
        U.download(`salaam-backup-${U.todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json');
      };
      document.getElementById('import-data').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ok = await App.confirm('استيراد نسخة جديدة سيستبدل البيانات الحالية. متابعة؟', { danger: true, confirmText: 'استيراد' });
        if (!ok) return;
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          await Seed.importJSON(data);
          App.toast('تم استيراد البيانات'); setTimeout(() => location.reload(), 600);
        } catch (error) { App.toast(`ملف غير صالح: ${error.message}`, 'error'); }
      });
      document.getElementById('reset-data').onclick = async () => {
        const ok = await App.confirm('سيتم حذف كل البيانات الحالية وإعادة البيانات التجريبية. متابعة؟', { danger: true, confirmText: 'إعادة التعيين' });
        if (!ok) return;
        await DB.reset();
        location.reload();
      };
      if (window.feather) feather.replace();
    },
  };
})();
