// Client gallery: the sign-in gate must get out of the way once dismissed.
const { test, expect } = require('@playwright/test');

test('gallery: dismissed sign-in gate never blocks the gallery', async ({ page }) => {
  await page.route('https://agdzdhjkkkvjpwhzitlj.supabase.co/**', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.route(/\.(jpe?g|JPG|png)(\?.*)?$/, (r) => r.fulfill({ status: 204, body: '' }));
  await page.goto('/gallery/?g=demo');
  await expect(page.locator('#photo-grid .gallery-photo').first()).toBeAttached();
  const gate = page.locator('#gallery-register');
  await page.evaluate(() => { document.getElementById('gallery-register').hidden = false; });
  await expect(gate).toBeVisible();
  await page.evaluate(() => { document.getElementById('gallery-register').hidden = true; });
  await expect(gate).toBeHidden();
  await page.locator('#gallery-topbar [data-action="downloads"]').click();
  await expect(page.locator('#download-dialog')).toBeVisible();
});
