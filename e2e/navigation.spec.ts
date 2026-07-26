/**
 * Navigation tests — verifies all 7 tabs open and show correct content.
 */
import { test, expect } from '@playwright/test'
import { clearAppState } from './helpers'

const TABS = [
  { label: 'נתוני עסקה',    url: '/transaction',   content: 'נתוני העסקה' },
  { label: "תמהיל א'",      url: '/mix-a',          content: 'נתוני הנכס' },
  { label: "תמהיל ב'",      url: '/mix-b',          content: "תמהיל ב' מחכה לכם" },
  { label: "תמהיל ג'",      url: '/mix-c',          content: "תמהיל ג' מחכה לכם" },
  { label: 'השוואה',         url: '/comparison',     content: 'השוואה ראש בראש' },
  { label: 'כושר החזר',     url: '/affordability',  content: 'הכנסות חודשיות' },
  { label: 'מחשבון השקעה',  url: '/investment',     content: 'פרמטרי ההשקעה' },
]

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await clearAppState(page)
  await page.reload()
  await page.waitForURL('**/transaction')
})

test('default route redirects to Transaction tab', async ({ page }) => {
  await expect(page).toHaveURL(/\/transaction/)
  await expect(page.getByText('נתוני העסקה').first()).toBeVisible()
})

test('all 7 tabs are visible in the navigation bar', async ({ page }) => {
  for (const tab of TABS) {
    await expect(page.getByRole('link', { name: tab.label })).toBeVisible()
  }
})

test('clicking each tab navigates and shows correct content', async ({ page }) => {
  for (const tab of TABS) {
    await page.getByRole('link', { name: tab.label }).click()
    await expect(page).toHaveURL(new RegExp(tab.url.replace('/', '\\/')))
    await expect(page.getByText(tab.content).first()).toBeVisible()
  }
})

test('keyboard shortcut Ctrl+1 navigates to Transaction tab', async ({ page }) => {
  // Start on a different tab
  await page.goto('/mix-a')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true, bubbles: true, cancelable: true }))
  })
  await expect(page).toHaveURL(/\/transaction/)
})

test('keyboard shortcut Ctrl+2 navigates to Mix A', async ({ page }) => {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', ctrlKey: true, bubbles: true, cancelable: true }))
  })
  await expect(page).toHaveURL(/\/mix-a/)
})

test('keyboard shortcut Ctrl+5 navigates to Comparison tab', async ({ page }) => {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', ctrlKey: true, bubbles: true, cancelable: true }))
  })
  await expect(page).toHaveURL(/\/comparison/)
})

test('keyboard shortcut Ctrl+6 navigates to Affordability tab', async ({ page }) => {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '6', ctrlKey: true, bubbles: true, cancelable: true }))
  })
  await expect(page).toHaveURL(/\/affordability/)
})

test('old /costs URL redirects to /transaction', async ({ page }) => {
  await page.goto('/costs')
  await expect(page).toHaveURL(/\/transaction/)
})

test('old /capacity URL redirects to /affordability', async ({ page }) => {
  await page.goto('/capacity')
  await expect(page).toHaveURL(/\/affordability/)
})

test('unknown route redirects to Transaction tab', async ({ page }) => {
  await page.goto('/nonexistent-page')
  await expect(page).toHaveURL(/\/transaction/)
})
