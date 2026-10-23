/* Salaam School — demo authentication over the local database. */
(function () {
  'use strict';

  const SESSION_KEY = 'salaam_user';

  function base() {
    const path = location.pathname.replace(/\\/g, '/');
    return path.includes('/pages/') ? '../' : '';
  }

  function home(role) {
    return {
      admin: 'dashboard-admin.html',
      teacher: 'dashboard-teacher.html',
      student: 'dashboard-student.html',
      parent: 'dashboard-parent.html',
    }[role] || 'index.html';
  }

  function current() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function login(email, password) {
    const normalized = String(email || '').trim().toLowerCase();
    const users = await DB.all('users');
    const user = users.find((u) => String(u.email).toLowerCase() === normalized && u.password === password);
    if (!user) return null;
    const safe = { ...user };
    delete safe.password;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    return safe;
  }

  function guard(roles) {
    const user = current();
    if (!user) {
      location.replace(`${base()}index.html`);
      return null;
    }
    const allowed = String(roles || '').split(',').map((r) => r.trim()).filter(Boolean);
    if (allowed.length && !allowed.includes(user.role)) {
      location.replace(`${base()}${home(user.role)}`);
      return null;
    }
    return user;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.href = `${base()}index.html`;
  }

  window.Auth = { login, logout, current, guard, base, home, SESSION_KEY };
})();
