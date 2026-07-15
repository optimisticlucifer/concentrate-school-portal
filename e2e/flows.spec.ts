import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('unauthenticated users are redirected to login', async ({ page }) => {
  await page.goto('/student');
  await expect(page).toHaveURL(/\/login/);
});

test('student signs in and sees their work', async ({ page }) => {
  await loginAs(page, 'student1@concentrate.test');
  await expect(page).toHaveURL(/\/student/);
  await expect(page.getByRole('heading', { name: 'Your work' })).toBeVisible();
  await expect(page.getByText('Thought for today')).toBeVisible();
});

test('teacher signs in and sees their classes', async ({ page }) => {
  await loginAs(page, 'teacher@concentrate.test');
  await expect(page).toHaveURL(/\/teacher/);
  await expect(page.getByRole('heading', { name: 'My classes' })).toBeVisible();
});

test('admin signs in and sees administration', async ({ page }) => {
  await loginAs(page, 'admin@concentrate.test');
  await expect(page).toHaveURL(/\/admin/);
  await expect(
    page.getByRole('heading', { name: 'Administration' })
  ).toBeVisible();
});

test('a student can submit an assignment', async ({ page }) => {
  await loginAs(page, 'student1@concentrate.test');
  await page.getByRole('button', { name: /submit work/i }).first().click();
  await page.getByLabel(/Submission for/).first().fill('My answer for the E2E test.');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByText('Submitted').first()).toBeVisible();
});
