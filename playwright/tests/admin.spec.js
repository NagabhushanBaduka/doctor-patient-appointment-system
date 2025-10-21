// create a doctor gmail fake@gmail.com for approve
// create a doctor gmail fake1@gmail.com for edit 
// create a doctor gmail fake2@gmail.com for delete
// create a patient gmail fakepatient@gmail.com


import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'admin@gmail.com');
  await page.fill('#password', 'admin@123');
  await page.click('#login-button');
}
test('Admin logs in with valid credentials',async({page})=>{
    await login(page);
    await expect(page).toHaveURL(/admin/);
})
test('Admin logs in with invalid credentials',async({page})=>{
    await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'wrong@gmail.com');
  await page.fill('#password', 'wrong123');
  await page.click('#login-button');
  await expect(page.getByText('Invalid email or password')).toBeVisible();
})

test('admin creates new doctor Account',async({page})=>{
  await login(page);
  await expect(page).toHaveURL(/admin/);
  await page.click('#manage-doctors-link');
await page.waitForLoadState('networkidle');

await page.waitForSelector("[id='add-doctor-link']", { state: 'visible' });
  await page.click("[id='add-doctor-link']");

  await page.fill('#name','testing');
  await page.fill('#email','testing@gmail.com');
  await page.fill('#password','testing@123');
  await page.selectOption('#specialization', 'Physician');
  await page.fill('#contactNumber','1111111111');
  await page.fill('#bio','This is for testing');
  await page.click("[id='add-doctor-button']")
  await expect(page.locator('#doctor-table')).toContainText('testing@gmail.com');


})


test('Admin Approves doctor profile', async ({ page }) => {
  await login(page);
  await page.click('#manage-doctors-link');
  await page.waitForLoadState('networkidle');

  const targetEmail = 'fake@gmail.com';
  const doctorRow = page.locator(`#doctor-table tr:has-text("${targetEmail}")`);
  const approveButton = doctorRow.locator('button[id^="approve-doctor-"]');

  page.once('dialog', async (dialog) => {
    console.log('Dialog message:', dialog.message());
    await dialog.accept(); // Clicks OK
  });


  await Promise.all([
    page.waitForResponse(res => res.url().includes('/approve') && res.ok()).catch(() => {}),
    approveButton.click(),
  ]);


  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

 
  const updatedRow = page.locator(`#doctor-table tr:has-text("${targetEmail}")`);

  await expect(updatedRow).toContainText('Yes', { timeout: 10000 });
});


test('Admin updates doctor profile', async ({ page }) => {
  await login(page);
  await page.click('#manage-doctors-link');
  await page.waitForLoadState('networkidle');

  const targetEmail = 'fake1@gmail.com'; // must match an existing email in the table
  const doctorRow = page.locator(`#doctor-table tr:has-text("${targetEmail}")`);
  const editButton = doctorRow.locator('a[id^="edit-doctor-"]'); // Edit button is an <a> tag in your HTML

  // Extract the doctor ID for clarity (optional)
  const doctorId = await editButton.getAttribute('id');
  console.log('Editing doctor:', doctorId);

  // Navigate to edit page
  await editButton.click();

  // Wait for form page to load
  await page.waitForSelector('#update-doctor-button');

  // Perform update
  await page.fill('#name', 'name changed');
  await page.click('#update-doctor-button');

  // ✅ Wait for navigation or AJAX update back to doctor list
  await page.waitForLoadState('networkidle');

  // ✅ Confirm the updated value in the table
  const updatedRow = page.locator(`#doctor-table tr:has-text("${targetEmail}")`);
  await expect(updatedRow).toContainText('name changed', { timeout: 10000 });
});



test('Admin deletes a Doctor', async ({ page }) => {
  await login(page);
  await page.click('#manage-doctors-link');
  await page.waitForLoadState('networkidle');

  const targetEmail = 'fake2@gmail.com';
  const doctorRow = page.locator(`#doctor-table tr:has-text("${targetEmail}")`);
  const deleteButton = doctorRow.locator('button[id^="delete-doctor-"]');

  const doctorId = await deleteButton.getAttribute('id');
  console.log('Deleting doctor:', doctorId);

  page.once('dialog', async (dialog) => {
    console.log(dialog.message());
    await dialog.accept();
  });

 
  await Promise.all([
    page.waitForLoadState('domcontentloaded'), // handles page reloads / redirects
    deleteButton.click(),
  ]);

  expect(await page.isClosed()).toBeFalsy();

  const deletedRow = page.locator(`#doctor-table tr:has-text("${targetEmail}")`);
  await expect(deletedRow).toHaveCount(0, { timeout: 5000 });
});
test('View Patients',async({page})=>{
  await login(page);
  await page.click('#manage-patients-link');
  await expect(page.getByText('Manage Patients')).toBeVisible();
})
test('Deleting the patient',async({page})=>{
  await login(page);
  await page.click('#manage-patients-link');
  const targetEmail='fakepatient@gmail.com';
  const patientRow = page.locator(`#patient-table tr:has-text("${targetEmail}")`);
  const deleteButton = patientRow.locator('button[id^="delete-patient"]'); 
    const patientId = await deleteButton.getAttribute('id');
  console.log('Deleting patient:', patientId);

  page.once('dialog', async (dialog) => {
    console.log(dialog.message());
    await dialog.accept();
  });
  
 
  await Promise.all([
    page.waitForLoadState('domcontentloaded'), // handles page reloads / redirects
    deleteButton.click(),
  ]);

  expect(await page.isClosed()).toBeFalsy();

  const deletedRow = page.locator(`#patient-table tr:has-text("${targetEmail}")`);
  await expect(deletedRow).toHaveCount(0, { timeout: 5000 });
})

test("Admin logout",async({page})=>{
  await login(page);
  await page.click('#nav-logout-button');
  await expect(page.locator('text=Admin Dashboard')).toHaveCount(0);
 // await expect(page.getByText('Login')).toBeVisible();
})








