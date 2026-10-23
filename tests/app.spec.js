import { test, expect } from '@playwright/test';

async function login(page, role) {
  await page.goto('/');
  await page.locator(`[data-demo="${role}"]`).click();
  await page.waitForURL(/dashboard-/);
  await page.waitForSelector('.sidebar');
}

test('admin dashboard loads with stats and charts', async ({ page }) => {
  await login(page, 'admin');
  await expect(page.locator('.hero-name')).toContainText('المدير العام');
  await expect(page.locator('.stat-card')).toHaveCount(4);
  await expect(page.locator('#rev-chart')).toBeVisible();
  await expect(page.locator('#grade-chart')).toBeVisible();
  await expect(page.locator('#att-chart')).toBeVisible();
  await expect(page.locator('.sidebar .nav-link.active')).toContainText('لوحة التحكم');
});

test('students: add, search, edit and delete', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/pages/students.html');
  await expect(page.locator('#students-table tbody tr').first()).toBeVisible();

  await page.click('#add-student');
  await page.fill('#student-form [name="fullName"]', 'طالب اختبار');
  await page.fill('#student-form [name="studentId"]', '2026-999');
  await page.fill('#student-form [name="phone"]', '01099999999');
  await page.click('#save-student');
  await expect(page.locator('.toast').last()).toContainText('تمت إضافة الطالب');

  await page.fill('#student-search', 'طالب اختبار');
  await expect(page.locator('#students-table')).toContainText('طالب اختبار');

  await page.locator('[data-edit]').first().click();
  await page.fill('#student-form [name="fullName"]', 'طالب اختبار معدل');
  await page.click('#save-student');
  await expect(page.locator('.toast').last()).toContainText('تم تحديث');

  await page.fill('#student-search', 'طالب اختبار معدل');
  await page.locator('[data-del]').first().click();
  await page.locator('.modal [data-yes]').click();
  await expect(page.locator('.toast').last()).toContainText('تم حذف الطالب');
});

test('attendance: mark all absent and save', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/pages/attendance.html');
  await expect(page.locator('#attendance-sheet table')).toBeVisible();
  await page.click('#mark-absent');
  await page.click('#save-attendance');
  await expect(page.locator('.toast').last()).toContainText('تم حفظ الحضور');
  await expect(page.locator('#attendance-history')).toContainText('النسبة');
});

test('grades: enter a score and save', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/pages/grades.html');
  const input = page.locator('.score-input').first();
  await input.fill('88');
  await page.click('#save-grades');
  await expect(page.locator('.toast').last()).toContainText('تم حفظ الدرجات');
  await expect(page.locator('.grade-cell').first()).toContainText('جيد جداً');
});

test('payments: add a payment and open receipt', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/pages/payments.html');
  await page.click('#add-payment');
  await page.fill('#payment-form [name="amount"]', '1500');
  await page.fill('#payment-form [name="paidAmount"]', '1500');
  await page.click('#save-payment');
  await expect(page.locator('.toast').last()).toContainText('تمت إضافة الدفعة');
  await expect(page.locator('#payments-table')).toContainText('مدفوع');
});

test('notifications: send and mark all read', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/pages/notifications.html');
  await page.click('#add-notif');
  await page.fill('#notif-form [name="title"]', 'إشعار اختبار');
  await page.fill('#notif-form [name="body"]', 'هذا إشعار تجريبي من الاختبار.');
  await page.click('#send-notif');
  await expect(page.locator('.toast').last()).toContainText('تم إرسال الإشعار');
  await expect(page.locator('#notifications-list')).toContainText('إشعار اختبار');
  await page.click('#read-all');
  await expect(page.locator('.toast').last()).toContainText('تم تعليم الكل');
});

test('teacher dashboard and scoped navigation', async ({ page }) => {
  await login(page, 'teacher');
  await expect(page.locator('.hero-name')).toContainText('أحمد محمد');
  await expect(page.locator('.sidebar')).toContainText('طلابي');
  await expect(page.locator('.sidebar')).toContainText('فصولي');
});

test('student dashboard and read-only grades', async ({ page }) => {
  await login(page, 'student');
  await expect(page.locator('.hero-name')).toContainText('محمد أحمد');
  await page.goto('/pages/grades.html');
  await expect(page.locator('.card').first()).toContainText('المعدل حسب المادة');
  await expect(page.locator('#save-grades')).toHaveCount(0);
});

test('parent dashboard shows children', async ({ page }) => {
  await login(page, 'parent');
  await expect(page.locator('.hero-name')).toContainText('والد محمد');
  await expect(page.locator('.hero-sub')).toContainText('محمد أحمد');
});

test('mobile sidebar toggles', async ({ page }) => {
  await login(page, 'admin');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('#menu-btn')).toBeVisible();
  await page.click('#menu-btn');
  await expect(page.locator('#sidebar')).toHaveClass(/open/);
  await page.click('#sidebar-overlay');
  await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
});
