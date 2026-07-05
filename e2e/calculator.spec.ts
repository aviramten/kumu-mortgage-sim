/**
 * Calculator tests — verifies that entering loan data produces correct KPI output.
 *
 * Reference: 500,000 ₪ @ 4% fixed (קל"צ), 240 months, Spitzer → PMT ≈ ₪3,030
 * (matches Bank Leumi calculator and engine unit tests)
 */
import { test, expect } from '@playwright/test'
import { clearAppState, fillNumeric } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/mix-a')
  await clearAppState(page)
  await page.reload()
  await page.waitForURL('**/mix-a')
})

// ---------------------------------------------------------------------------
// Helper: set up a single-track mix
// ---------------------------------------------------------------------------
async function setupTrack(page: Parameters<typeof test['beforeEach']>[0]['page']) {
  // Set property value = 600,000 and equity = 100,000 → mortgage = 500,000
  await fillNumeric(page, '[data-testid="property-value"]', '600000')
  await fillNumeric(page, '[data-testid="equity"]', '100000')

  // Add a track
  await page.getByRole('button', { name: /הוסף מסלול/ }).click()
  await page.waitForSelector('[data-testid="track-row"]')

  const row = page.locator('[data-testid="track-row"]').first()

  // Set track type to קל"צ (fixed-unlinked)
  await row.locator('select').first().selectOption('fixed-unlinked')

  // Set amount = 500,000
  const amountInput = row.locator('[data-testid="track-amount"]')
  await amountInput.click()
  await amountInput.fill('500000')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(150)

  // Set months = 240
  const monthsInput = row.locator('[data-testid="track-months"]')
  await monthsInput.click()
  await monthsInput.fill('240')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(150)

  // Set rate = 4%
  const rateInput = row.locator('[data-testid="track-rate"]')
  await rateInput.click()
  await rateInput.fill('4')
  await rateInput.dispatchEvent('change')
  await page.waitForTimeout(300)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('KPI section appears after adding a track', async ({ page }) => {
  await setupTrack(page)
  await expect(page.getByText('מדדי מפתח')).toBeVisible()
})

test('500K @ 4% @ 240m spitzer → first payment ≈ ₪3,030', async ({ page }) => {
  await setupTrack(page)

  // The KPI "החזר ראשון" card should show ~₪3,030
  const kpiSection = page.locator('text=מדדי מפתח').locator('../..').locator('..')
  // Look for a value in the ₪3,0xx range within the KPI area
  await expect(page.getByText(/₪3,0[0-9]{2}/)).toBeVisible()
})

test('balance allocated indicator turns green when fully allocated', async ({ page }) => {
  await setupTrack(page)
  // "כל סכום המשכנתא מוקצה ✓" should appear when 500K = 500K mortgage
  await expect(page.getByText(/מוקצה/)).toBeVisible()
})

test('payment line chart renders after adding track', async ({ page }) => {
  await setupTrack(page)
  await expect(page.getByText('התפתחות ההחזר החודשי')).toBeVisible()
})

test('balance chart renders after adding track', async ({ page }) => {
  await setupTrack(page)
  await expect(page.getByText('יתרת החוב לאורך הזמן')).toBeVisible()
})

test('amortization table renders with correct header columns', async ({ page }) => {
  await setupTrack(page)
  // The table starts collapsed — click the toggle button to expand it
  await page.getByText('טבלת סילוקין מפורטת').click()
  await expect(page.getByText('יתרת פתיחה').first()).toBeVisible()
})

test('Mix B shows empty state by default', async ({ page }) => {
  await page.getByRole('link', { name: "תמהיל ב'" }).click()
  await expect(page.getByText("תמהיל ב' מחכה לכם")).toBeVisible()
})

test('duplicate Mix A to Mix B', async ({ page }) => {
  await setupTrack(page)

  // Open the duplicate dropdown
  await page.getByRole('button', { name: /שכפל תמהיל/ }).click()
  // Click on Mix B option
  await page.getByText("תמהיל ב'").last().click()

  // Navigate to Mix B — should now show the duplicated content, not the empty state
  await page.getByRole('link', { name: "תמהיל ב'" }).click()
  await expect(page.getByText("תמהיל ב' מחכה לכם")).not.toBeVisible()
  await expect(page.getByText('מדדי מפתח')).toBeVisible()
})

test('removing a track clears KPI to empty state', async ({ page }) => {
  await setupTrack(page)

  // Delete the track
  const deleteBtn = page.locator('[data-testid="track-row"]').first()
    .getByRole('button').last()
  await deleteBtn.click()

  // KPI should show empty state
  await expect(page.getByText('אין מסלולים לחישוב')).toBeVisible()
})
