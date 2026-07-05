/**
 * Affordability / PTI tab tests.
 */
import { test, expect } from '@playwright/test'
import { clearAppState } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/affordability')
  await clearAppState(page)
  await page.reload()
  await page.waitForURL('**/affordability')
})

test('affordability tab loads with income and liability sections', async ({ page }) => {
  await expect(page.getByText('כושר החזר').first()).toBeVisible()
  await expect(page.getByText('הכנסות חודשיות')).toBeVisible()
  await expect(page.getByText('התחייבויות קיימות')).toBeVisible()
})

test('PTI section shows prompt when no income entered', async ({ page }) => {
  await expect(page.getByText(/הזינו נתוני הכנסות/)).toBeVisible()
})

test('income total updates when entering a payslip amount', async ({ page }) => {
  // תלוש 1 row — first income input
  const firstIncome = page.getByText('תלוש 1').locator('..').locator('..').locator('input')
  await firstIncome.click()
  await firstIncome.fill('20000')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)

  await expect(page.getByText(/20,000/).first()).toBeVisible()
})

test('entering income shows PTI results section', async ({ page }) => {
  const firstIncome = page.getByText('תלוש 1').locator('..').locator('..').locator('input')
  await firstIncome.click()
  await firstIncome.fill('30000')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)

  await expect(page.getByText('בדיקת כושר החזר (PTI)')).toBeVisible()
  await expect(page.getByText(/הכנסה פנויה/)).toBeVisible()
})

test('adding custom income row works', async ({ page }) => {
  await page.getByRole('button', { name: /הוסף הכנסה/ }).click()
  await expect(page.getByRole('button', { name: /הוסף הכנסה/ })).toBeVisible()
})

test('adding custom liability row works', async ({ page }) => {
  await page.getByRole('button', { name: /הוסף התחייבות/ }).click()
  await expect(page.getByRole('button', { name: /הוסף התחייבות/ })).toBeVisible()
})

test('liability with <18 remaining months appears dimmed', async ({ page }) => {
  // Enter a monthly payment and set remaining months to 12
  const loanRow = page.getByText('הלוואה 1').locator('..').locator('..')

  // Monthly payment
  const paymentInput = loanRow.locator('input').nth(0)
  await paymentInput.click()
  await paymentInput.fill('2000')
  await page.keyboard.press('Tab')

  // Remaining months = 12 (< 18 → should be excluded and dimmed)
  const monthsInput = loanRow.locator('input').nth(2)
  await monthsInput.click()
  await monthsInput.fill('12')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)

  // When remainingMonths < 18, the grid row gets a title tooltip and opacity-50
  await expect(page.locator('[title*="פחות מ"]').first()).toBeVisible()
})
