/**
 * Shared helpers for all E2E tests.
 */
import { type Page } from '@playwright/test'

/** Clear persisted Zustand state between tests */
export async function clearAppState(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('kumu-mix-store')
    localStorage.removeItem('kumu-costs-store')
    localStorage.removeItem('kumu-affordability-store')
  })
}

/**
 * Fill a blur-triggered numeric input (our custom NumericInput components).
 * Clicks, clears, types the value, then presses Tab to commit.
 */
export async function fillNumeric(page: Page, selector: string, value: string | number) {
  const loc = page.locator(selector)
  await loc.click()
  await loc.fill('')
  await loc.fill(String(value))
  await page.keyboard.press('Tab')
  // Small settle time for React state update
  await page.waitForTimeout(100)
}

/**
 * Fill the first matching blur-triggered input within a parent locator.
 */
export async function fillNumericIn(
  page: Page,
  parentSelector: string,
  testId: string,
  value: string | number,
) {
  const input = page.locator(parentSelector).locator(`[data-testid="${testId}"]`).first()
  await input.click()
  await input.fill('')
  await input.fill(String(value))
  await page.keyboard.press('Tab')
  await page.waitForTimeout(100)
}
