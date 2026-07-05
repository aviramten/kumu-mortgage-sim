/**
 * Navigation tests — verifies all 7 tabs open and show correct content.
 */
import { test, expect } from '@playwright/test'
import { clearAppState } from './helpers'

const TABS = [
  { label: "תמהיל א'", url: '/mix-a',        content: 'נתוני הנכס' },
  { label: "תמהיל ב'", url: '/mix-b',        content: "תמהיל ב' מחכה לכם" },
  { label: "תמהיל ג'", url: '/mix-c',        content: "תמהיל ג' מחכה לכם" },
  { label: 'השוואה',   url: '/comparison',   content: 'השוואה ראש בראש' },
  { label: 'הוצאות עסקה', url: '/costs',     content: 'הוצאות עסקה' },
  { label: 'כושר החזר',   url: '/affordability', content: 'הכנסות חודשיות' },
  { label: 'מחשבון השקעה', url: '/investment', content: 'פרמטרי ההשקעה' },
]

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await clearAppState(page)
  await page.reload()
  await page.waitForURL('**/mix-a')
})

test('default route redirects to Mix A', async ({ page }) => {
  await expect(page).toHaveURL(/\/mix-a/)
  await expect(page.getByText('נתוני הנכס')).toBeVisible()
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

test('keyboard shortcut Ctrl+1 navigates to Mix A', async ({ page }) => {
  // Start on a different tab
  await page.goto('/costs')
  await page.waitForLoadState('networkidle')
  // Dispatch directly to window to bypass browser-level Ctrl+N interception
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true, bubbles: true, cancelable: true }))
  })
  await expect(page).toHaveURL(/\/mix-a/)
})

test('keyboard shortcut Ctrl+5 navigates to Costs tab', async ({ page }) => {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', ctrlKey: true, bubbles: true, cancelable: true }))
  })
  await expect(page).toHaveURL(/\/costs/)
})

test('keyboard shortcut Ctrl+6 navigates to Affordability tab', async ({ page }) => {
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '6', ctrlKey: true, bubbles: true, cancelable: true }))
  })
  await expect(page).toHaveURL(/\/affordability/)
})

test('old /capacity URL redirects to /affordability', async ({ page }) => {
  await page.goto('/capacity')
  await expect(page).toHaveURL(/\/affordability/)
})

test('unknown route redirects to Mix A', async ({ page }) => {
  await page.goto('/nonexistent-page')
  await expect(page).toHaveURL(/\/mix-a/)
})
