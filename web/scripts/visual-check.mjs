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

  const driveStart = await page.evaluate(() => window.__ha.drive());
  if (!driveStart.enabled || driveStart.inputRpm !== 1000) {
    throw new Error(`transmission did not auto-start: ${JSON.stringify(driveStart)}`);
  }
  await wait(500);
  const driveAfter = await page.evaluate(() => window.__ha.drive());
  if (!(driveAfter.waveAngle > driveStart.waveAngle)) {
    throw new Error(`wave generator did not advance: ${JSON.stringify({ driveStart, driveAfter })}`);
  }
  if (!(driveAfter.outputAngle < driveStart.outputAngle)) {
    throw new Error(`output did not turn backwards: ${JSON.stringify({ driveStart, driveAfter })}`);
  }
  console.log('drive auto-run', JSON.stringify({ inputRpm: driveStart.inputRpm, ratio: driveStart.ratio }));
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
  const gear50 = await page.evaluate(() => window.__ha.gear());
  if (gear50.children.length !== 5) {
    throw new Error(`live gear set missing children: ${JSON.stringify(gear50)}`);
  }
  if (gear50.zf !== 100 || gear50.zc !== 102) {
    throw new Error(`50:1 tooth counts wrong: ${JSON.stringify(gear50)}`);
  }
  console.log('gear check', JSON.stringify({ ratio: gear50.ratio, zf: gear50.zf, zc: gear50.zc, pickMeshes: gear50.pickMeshes }));

  const flexA = await page.evaluate(() => window.__ha.drive());
  await wait(600);
  const flexB = await page.evaluate(() => window.__ha.drive());
  if (flexA.psi === null || flexB.psi === null || flexA.psi === flexB.psi) {
    throw new Error(`flexspline psi did not update: ${JSON.stringify({ flexA, flexB })}`);
  }
  if (!(flexB.waveAngle > flexA.waveAngle) || !(flexB.outputAngle < flexA.outputAngle)) {
    throw new Error(`transmission stalled in gear view: ${JSON.stringify({ flexA, flexB })}`);
  }
  console.log('flex check', JSON.stringify({ psiA: flexA.psi, psiB: flexB.psi }));
  await shot('gear');

  await page.evaluate(() => window.__ha.setInputRpm(0));
  await wait(400);
  const stopA = await page.evaluate(() => window.__ha.drive());
  await wait(500);
  const stopB = await page.evaluate(() => window.__ha.drive());
  if (stopA.waveAngle !== stopB.waveAngle || stopA.outputAngle !== stopB.outputAngle) {
    throw new Error(`input 0 rpm did not stop: ${JSON.stringify({ stopA, stopB })}`);
  }
  console.log('stop check', JSON.stringify({ waveAngle: stopB.waveAngle }));
  await page.evaluate(() => window.__ha.setInputRpm(1000));

  await page.evaluate(() => {
    const slider = document.querySelector('#ratio');
    slider.value = '100';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(700);
  const gear100 = await page.evaluate(() => window.__ha.gear());
  if (gear100.ratio !== 100 || gear100.zf !== 200 || gear100.zc !== 202) {
    throw new Error(`ratio rebuild failed: ${JSON.stringify(gear100)}`);
  }
  const drive100 = await page.evaluate(() => window.__ha.drive());
  if (drive100.ratio !== 100 || Math.abs(drive100.outputRpm - 10) > 0.01) {
    throw new Error(`drive did not adopt ratio 100: ${JSON.stringify(drive100)}`);
  }
  console.log('ratio rebuild', JSON.stringify({ ratio: gear100.ratio, zf: gear100.zf, zc: gear100.zc, outputRpm: drive100.outputRpm }));
  await shot('gear100');
  await page.evaluate(() => {
    const slider = document.querySelector('#ratio');
    slider.value = '50';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(500);

  await page.click('#btn-view-output');
  await wait(1100);
  const bodyOpacity = await page.evaluate(() => window.__ha.materialOpacity('Body_Housing'));
  if (!bodyOpacity.length || bodyOpacity.some((value) => value !== 1)) {
    throw new Error(`housing kept a ghost state: ${JSON.stringify(bodyOpacity)}`);
  }
  console.log('ghost restore', JSON.stringify(bodyOpacity));
  await shot('output');

  await page.click('#btn-view-overview');
  await wait(1000);
  await shot('overview');

  await page.click('#btn-diagram');
  await wait(900);
  const diagram = await page.evaluate(() => window.__ha.diagram());
  if (!diagram.open || !diagram.canvasVisible) {
    throw new Error(`diagram panel did not open: ${JSON.stringify(diagram)}`);
  }
  const staticLoaded = await page.evaluate(() => {
    const image = document.querySelector('#diagram-static');
    return Boolean(image && image.complete && image.naturalWidth > 0);
  });
  if (!staticLoaded) throw new Error('static section SVG did not load');
  const insetA = await page.evaluate(() => window.__ha.drive());
  await wait(500);
  const insetB = await page.evaluate(() => window.__ha.drive());
  if (!(insetB.waveAngle > insetA.waveAngle)) {
    throw new Error('live inset is not advancing with the drive');
  }
  console.log('diagram check', JSON.stringify({ open: diagram.open, live: true }));
  await shot('diagram');
  await page.keyboard.press('Escape');
  await wait(300);
  const closed = await page.evaluate(() => window.__ha.diagram());
  if (closed.open || closed.canvasVisible) {
    throw new Error(`Escape did not close the diagram: ${JSON.stringify(closed)}`);
  }

  await page.evaluate(() => {
    const slider = document.querySelector('#explode');
    slider.value = '20';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(600);
  const pauseA = await page.evaluate(() => window.__ha.drive());
  await wait(400);
  const pauseB = await page.evaluate(() => window.__ha.drive());
  if (!pauseA.paused || pauseA.waveAngle !== pauseB.waveAngle) {
    throw new Error(`explode did not pause the drive: ${JSON.stringify({ pauseA, pauseB })}`);
  }
  console.log('pause check', JSON.stringify({ paused: pauseB.paused }));
  await page.click('#btn-reset');
  await wait(400);
  const resumed = await page.evaluate(() => window.__ha.drive());
  if (!resumed.enabled || resumed.paused) {
    throw new Error(`reset did not resume the drive: ${JSON.stringify(resumed)}`);
  }

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('visual check PASS');
} finally {
  await browser.close();
}
