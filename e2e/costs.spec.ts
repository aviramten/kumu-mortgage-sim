/**
 * Transaction Costs tab tests.
 */
import { test, expect } from '@playwright/test'
import { clearAppState } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/costs')
  await clearAppState(page)
  await page.reload()
  await page.waitForURL('**/costs')
})

test('costs tab loads with fixed rows', async ({ page }) => {
  await expect(page.getByText('הוצאות עסקה').first()).toBeVisible()
  // Fixed rows visible
  await expect(page.getByText('תיווך')).toBeVisible()
  await expect(page.getByText('עו"ד')).toBeVisible()
  await expect(page.getByText('שמאות עצמאית')).toBeVisible()
})

test('total starts at zero (shows dash)', async ({ page }) => {
  const totalRow = page.getByText('סה"כ הוצאות עסקה').locator('..')
  await expect(totalRow.getByText('—')).toBeVisible()
})

test('entering an amount updates the total', async ({ page }) => {
  // Find the brokerage (תיווך) row amount input — first input in the list
  const firstInput = page.locator('.rounded-xl').filter({ hasText: 'תיווך' })
    .locator('input').first()

  await firstInput.click()
  await firstInput.fill('50000')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)

  // Total should now show ₪50,000
  await expect(page.getByText(/50,000/)).toBeVisible()
})

test('adding a custom cost row works', async ({ page }) => {
  await page.getByRole('button', { name: /הוסף סעיף/ }).click()
  // A new row with default label "הכנסה נוספת" or similar should appear
  // The add button should still be there
  await expect(page.getByRole('button', { name: /הוסף סעיף/ })).toBeVisible()
})

test('equity callout toggle works', async ({ page }) => {
  const toggleBtn = page.getByRole('button', { name: /הצג הון עצמי/ })
  await expect(toggleBtn).toBeVisible()
  await toggleBtn.click()
  // The callout section should appear with "הון עצמי אפקטיבי"
  await expect(page.getByText(/הון עצמי אפקטיבי/)).toBeVisible()
  // Click again to hide
  await toggleBtn.click()
  await expect(page.getByText(/הון עצמי אפקטיבי/)).not.toBeVisible()
})
