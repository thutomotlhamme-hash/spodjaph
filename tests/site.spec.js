const { test, expect } = require('@playwright/test');

const siteData={ok:true,grad:{packages:[{slug:'mini',name:'MINI',tagline:'Quick. Clean.',price_cents:130000,duration_minutes:20,edited_images:12,reel_seconds:0},{slug:'signature',name:'SIGNATURE',tagline:'The sweet spot.',price_cents:170000,duration_minutes:35,edited_images:18,reel_seconds:0},{slug:'prestige',name:'PRESTIGE',tagline:'Full story.',price_cents:250000,duration_minutes:60,edited_images:30,reel_seconds:45}],campaigns:[{slug:'gauteng-september-2026',name:'September 2026',university:'',starts_on:'2026-09-01',ends_on:'2026-09-30',status:'live'}],locations:[{slug:'centurion',name:'Centurion',area:'Gauteng',travel_fee_cents:0}],portfolio:[]}};
async function mockData(page){await page.route('**/spodja-site-data',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(siteData)}));}
async function mockEnquiry(page){await page.route('**/spodja-create-enquiry',r=>r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,enquiry_ref:'SPJ-TEST123'})}));}

test('home behaves like reception',async({page})=>{
  await mockData(page);await page.goto('/');
  await expect(page.getByRole('heading',{name:/Stories made visible/i})).toBeVisible();
  await expect(page.locator('.reception-desk')).toHaveCount(0);
  for(const name of ['Grad House','Wedding Lane','Events Avenue','Portrait Room','Brand Desk']){
    await expect(page.locator('.topbar').getByRole('link',{name:new RegExp(name,'i')})).toBeVisible();
  }
});

test('events avenue switches mini-tabs and submits a structured request',async({page})=>{
  await mockData(page);await mockEnquiry(page);await page.goto('/events/');
  await expect(page.getByRole('heading',{name:/Walk in for the event/i})).toBeVisible();
  await page.getByRole('button',{name:'Content + event'}).click();
  await expect(page.locator('input[name="client_type"]')).toHaveValue('content');
  await page.locator('input[name="shoot_date"]').fill('2026-09-12');
  await page.locator('input[name="venue"]').fill('Centurion');
  await page.locator('input[name="contact_name"]').fill('Test Client');
  await page.locator('input[name="contact_phone"]').fill('0821234567');
  await page.getByRole('button',{name:/Send my booking request/i}).click();
  await page.waitForURL('**/payment/?ref=SPJ-TEST123');
  await expect(page.getByText(/SPJ-TEST123/)).toBeVisible();
});

test('wedding lane exposes the three ceremony paths',async({page})=>{
  await mockData(page);await page.goto('/weddings/');
  await expect(page.getByRole('button',{name:'Intimate / short'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Traditional / Lobola'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Full wedding'})).toBeVisible();
});

test('grad page keeps live package and time flow',async({page})=>{
  await mockData(page);
  await page.route('**/grad-custom-times**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({times:[{starts_at:'2026-09-17T08:00:00.000Z',recommendation:'Best fit'}]})}));
  await page.goto('/graduation/?package=signature');
  await expect(page.locator('#package')).toHaveValue('signature');
  await page.locator('#location').selectOption('centurion');
  await page.getByRole('button',{name:/Check live times/i}).click();
  await expect(page.locator('.time-btn')).toHaveCount(1);
});

test('payment stage is wallet-first for fixed packages',async({page})=>{
  await mockData(page);
  await page.goto('/events/');
  await page.evaluate(()=>sessionStorage.setItem('spodja_checkout_SPJ-PAY',JSON.stringify({version:1,ref:'SPJ-PAY',service:'events',subtype:'birthdays',packageLabel:'Birthday Essential · R2,200',totalCents:220000,custom:false,shootDate:'2026-09-20',venue:'Centurion'})));
  await page.goto('/payment/?ref=SPJ-PAY');
  await expect(page.getByRole('button',{name:/Apple Pay/i})).toBeVisible();
  await expect(page.getByRole('button',{name:/Google Pay/i})).toBeVisible();
  await expect(page.getByText('R 1 100')).toBeVisible();
});

test('all estate routes load',async({page})=>{
  for(const path of ['/','/graduation/','/weddings/','/events/','/portraits/','/brands/','/payment/','/success/']){
    await mockData(page);await page.goto(path);await expect(page.locator('body')).toBeVisible();
  }
});
