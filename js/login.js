/* Salaam School — login screen. */
(function () {
  'use strict';

  const DEMO = {
    admin: { email: 'admin@salaam.edu', password: 'Admin@123' },
    teacher: { email: 'teacher@salaam.edu', password: 'Teacher@123' },
    student: { email: 'student@salaam.edu', password: 'Student@123' },
    parent: { email: 'parent@salaam.edu', password: 'Parent@123' },
  };

  function showError(message) {
    const box = document.getElementById('login-error');
    box.textContent = message;
    box.classList.add('show');
  }

  function clearError() {
    document.getElementById('login-error').classList.remove('show');
  }

  async function submit(email, password) {
    clearError();
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> جاري الدخول...';
    try {
      const user = await Auth.login(email, password);
      if (!user) {
        showError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        return;
      }
      const params = new URLSearchParams(location.search);
      const next = params.get('next');
      location.href = next && /^[a-zA-Z0-9_\-./]+$/.test(next) ? next : Auth.home(user.role);
    } catch (error) {
      showError(`تعذر تسجيل الدخول: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-feather="log-in"></i> تسجيل الدخول';
      if (window.feather) feather.replace();
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (window.feather) feather.replace();
    try {
      await DB.open();
      await Seed.run();
      const current = Auth.current();
      if (current) { location.replace(Auth.home(current.role)); return; }
    } catch (error) {
      showError(`تعذر تهيئة البيانات: ${error.message}`);
    }

    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submit(document.getElementById('email').value.trim(), document.getElementById('password').value);
    });

    document.querySelectorAll('[data-demo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const demo = DEMO[btn.dataset.demo];
        document.getElementById('email').value = demo.email;
        document.getElementById('password').value = demo.password;
        submit(demo.email, demo.password);
      });
    });

    document.getElementById('forgot').addEventListener('click', () => {
      AppModalInfo();
    });
  });

  function AppModalInfo() {
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `<div class="modal" style="width:min(430px,100%)">
      <div class="modal-head"><div class="modal-title">استعادة كلمة المرور</div><button class="modal-close" data-close><i data-feather="x"></i></button></div>
      <div class="modal-body"><p class="muted">هذه نسخة محلية تجريبية. استخدم الحسابات التجريبية الموجودة في الصفحة، أو تواصل مع مدير المدرسة لتغيير كلمة المرور.</p></div>
      <div class="modal-foot"><button class="btn btn-primary" data-close>حسنًا</button></div>
    </div>`;
    document.body.appendChild(root);
    if (window.feather) feather.replace();
    const close = () => root.remove();
    root.querySelectorAll('[data-close]').forEach((b) => { b.onclick = close; });
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
  }
})();
