import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL ?? 'http://127.0.0.1:5173/';
const OUT = process.env.OUT ?? '/tmp/ha';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}-${name}.png` });
  console.log(`saved ${OUT}-${name}.png`);
};

try {
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 90_000 });
  await wait(2400);
  await shot('initial');

  await page.click('#btn-cut');
  await wait(900);
  const cut = await page.evaluate(() => window.__ha.checkCut());
  if (!cut.cutEnabled || !cut.bodyClipped) throw new Error(`cut not applied: ${JSON.stringify(cut)}`);
  if (!cut.fsUnclipped || !cut.wgUnclipped || !cut.outputFlangeUnclipped) {
    throw new Error(`FS/WG/output flange were clipped: ${JSON.stringify(cut)}`);
  }
  console.log('cut check', JSON.stringify(cut));
  await shot('cut');

  await page.click('#btn-view-gear');
  await wait(1100);
  await shot('gear');

  await page.click('#btn-view-output');
  await wait(1100);
  await shot('output');

  await page.click('#btn-view-overview');
  await wait(1000);
  await shot('overview');

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('visual check PASS');
} finally {
  await browser.close();
}
