//create an appointment on date '10/23/2025' doctor2 for cancel
// create an appointment on date 2025-10-28 3:00 pm doctor1 for same slot


import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'patient1@gmail.com');
  await page.fill('#password', 'patient1@123');
  await page.click('#login-button');
}


test('Patient registration',async({page})=>{
  await page.goto('http://localhost:3000');
  await page.click('#nav-register-link');
  await page.fill('#name','testingPatient');
  await page.fill('#email','testingpatient@gmail.com');
  await page.fill('#password','asdfghhj');
  await page.click('#register');
  await expect(page.getByText("Registration successful")).toBeVisible();
})

test('Patient logs in successfully with valid credentials',async({page})=>{
    await login(page);
    await expect(page).toHaveURL(/patient/);
})
test('Patient logs in  with invalid credentials',async({page})=>{
    await page.goto('http://localhost:3000/login');
  await page.fill('#email', 'wrong@gmail.com');
  await page.fill('#password', 'wrong123');
  await page.click('#login-button');
  await expect(page.getByText('Invalid email or password')).toBeVisible();
})
test('Patient books appointment', async ({ page }) => {
  await login(page);
  await page.click('#book-appointment-link');

  // Wait for the booking form to appear
  await page.waitForSelector('#book-appointment-form');

  // Step 1: Select a doctor
  await page.selectOption('#doctor-select', { label: 'doctor1 (Physician)' }); 
  await page.waitForSelector('#date-select'); 
  await page.fill('#date-select', '2025-10-30'); 
  await page.waitForSelector('#time-slot-select'); 
  await page.selectOption('#time-slot-select', '10:00 AM'); 
  await page.click('#confirm-appointment-button'); 
  // After booking the appointment as per your flow
const bookedDoctor = 'doctor1';
const bookedDate = '10/30/2025';   // Format matching your table's date format
const bookedTime = '10:00 AM';

// Locate a table row containing all these details
const appointmentRow = page.locator(`#patient-appointment-table tr`, {
  hasText: bookedDoctor,
  hasText: bookedDate,
  hasText: bookedTime
});

// Assert that such a row exists (count >= 1)
await expect(appointmentRow).toHaveCount(1, { timeout: 10000 });
});




test('Patient tries to book past appointment',async({page})=>{
  await login(page);
   await page.click('#book-appointment-link');

  // Wait for the booking form to appear
  await page.waitForSelector('#book-appointment-form');

  await page.selectOption('#doctor-select', { label: 'doctor1 (Physician)' }); 
  await page.waitForSelector('#date-select'); 
  await page.fill('#date-select', '2025-10-15'); 
  await expect(page.getByText('Error: Cannot fetch time slots for past dates')).toBeVisible();
  
})
test('Patient cancels appointment', async ({ page }) => {
  await login(page);
  await page.click('#my-appointments-link');

  const doctorName = 'doctor2';
  const appointmentDate = '10/23/2025';

  // Locate the appointment row matching doctor and date
  const appointmentRow = page.locator(`#patient-appointment-table tr`, {
    hasText: doctorName,
    hasText: appointmentDate
  });

  // Find the cancel button inside that row
  const cancelButton = appointmentRow.locator('button[id^="cancel-patient-appointment-"]');

  // Click the cancel button
  page.once('dialog', async dialog => {
    await dialog.accept();
  });

  await Promise.all([
    page.waitForResponse(response => response.ok()), 
    cancelButton.click(),
  ]);

  // Assert the cancel button is no longer visible (absent)
  await expect(cancelButton).toHaveCount(0);

  // Assert the status cell text changed to "cancelled"
  const statusCell = appointmentRow.locator('td').nth(5);  // Status column (6th cell)
  await expect(statusCell).toHaveText(/cancelled/i);
});


test('Patient book appointment for one slot other cannot book for same slot',async({page})=>{
 await login(page);
  await page.click('#book-appointment-link');

  await page.waitForSelector('#book-appointment-form');

  const bookedTime = '3:00 PM'; // the time slot already booked (note no space)

await page.selectOption('#doctor-select', { label: 'doctor1 (Physician)' });
await page.waitForSelector('#date-select');
await page.fill('#date-select', '2025-10-28');
await page.waitForSelector('#time-slot-select');

// Get all option texts in the time slot select dropdown
const options = await page.$$eval('#time-slot-select option', options =>
  options.map(o => o.textContent.trim())
);

// Assert the booked time slot is not present in options
expect(options).not.toContain(bookedTime);
})
test('Patient logout',async({page})=>{
  await login(page);
  await page.click('#nav-logout-button');
   await expect(page.locator('text=Patient Dashboard')).toHaveCount(0);
  //await expect(page.getByText('Login')).toBeVisible();
})
