// create an appointment for doctor1 on '10/23/2025'  2:00 pm for reject
// create an appointment for doctor1 on '10/24/2025'  4:00 pm for accept

import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'doctor1@gmail.com');
  await page.fill('#password', 'doctor1@123');
  await page.click('#login-button');
}
test('Doctor logs in successfully with valid credentials',async({page})=>{
    await login(page);
    await expect(page).toHaveURL(/doctor/);
})
test('Doctor logs in with invalid credentials',async({page})=>{
    await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'wrong@gmail.com');
  await page.fill('#password', 'wrong123');
  await page.click('#login-button');
  await expect(page.getByText('Invalid email or password')).toBeVisible();
})
test('Doctor toggles availability',async({page})=>{
   await login(page);
  
  await page.click('#doctor-availability-link');

  // Wait for Friday toggle button to be visible
  await page.waitForSelector('#weekly-friday-toggle');

  // Click the Disable button for Friday
  await page.click('#weekly-friday-toggle');

  // Verify the badge has changed to Disabled and red badge class
  const badge = page.locator('#weekly-friday strong').locator('..').locator('span.badge-danger');
  await expect(badge).toHaveText('Disabled');

})
test('Doctor views upcoming appointments',async({page})=>{
await login(page);
await page.click('#doctor-appointments-link');
await expect(page.getByText('My Appointments')).toBeVisible();


})
test('Doctor rejects appointment',async({page})=>{
  await login(page);
  await page.click('#doctor-appointments-link');
  const targetDate = '10/23/2025';
const targetTime = '2:00 PM';
const appointmentRow = page.locator('#doctor-appointment-table tr', {
  hasText: targetDate,
  hasText: targetTime
});

const statusCell = appointmentRow.locator('td').nth(5); // status column

// Accept appointment with dialog handling
page.once('dialog', async dialog => {
  console.log('Dialog message:', dialog.message());
  await dialog.accept();
});


const rejectButton = appointmentRow.locator('button[id^="reject-appointment-"]');
await Promise.all([
  page.waitForResponse(response => response.ok()),
  rejectButton.click(),
]);

await expect(statusCell).toHaveText(/rejected/i, { timeout: 5000 });
})
test('Doctor accepts appointment',async({page})=>{
  await login(page);
await page.click('#doctor-appointments-link');
const targetDate = '10/24/2025';
const targetTime = '4:00 PM';
const appointmentRow = page.locator('#doctor-appointment-table tr', {
  hasText: targetDate,
  hasText: targetTime
});

const statusCell = appointmentRow.locator('td').nth(5); // status column

// Accept appointment with dialog handling
page.once('dialog', async dialog => {
  console.log('Dialog message:', dialog.message());
  await dialog.accept();
});

const acceptButton = appointmentRow.locator('button[id^="accept-appointment-"]');
await Promise.all([
  page.waitForResponse(response => response.ok()), // wait for backend response
  acceptButton.click(),
]);

await expect(statusCell).toHaveText(/accepted/i, { timeout: 5000 });


})
test('Doctor can update his details except specialization',async({page})=>{
  await login(page);
  await page.click('#doctor-profile-link');
  await page.fill('#number','4444444444');
  await page.click('#update-profile');
  await expect(page.getByText('Profile updated successfully!')).toBeVisible();
})
test('Doctor logout',async({page})=>{
  await login(page);
  await page.click('#nav-logout-button');
   await expect(page.locator('text=Doctor Dashboard')).toHaveCount(0);
 //await expect(page.getByText('Login')).toBeVisible();
})

