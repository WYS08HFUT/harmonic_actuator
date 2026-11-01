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

  const shell = await page.evaluate(() => {
    const canvas = document.querySelector('#scene-container canvas');
    const ids = ['#btn-reset', '#explode', '#btn-cut', '#btn-drive', '#btn-diagram'];
    const controls = ids.map((selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return { selector, width: rect?.width ?? 0, height: rect?.height ?? 0 };
    });
    return {
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      controls,
    };
  });
  if (!shell.canvas || shell.canvas.width <= 0 || shell.canvas.height <= 0) {
    throw new Error(`canvas missing or zero-sized: ${JSON.stringify(shell.canvas)}`);
  }
  const hiddenControl = shell.controls.find((control) => control.width <= 0 || control.height <= 0);
  if (hiddenControl) throw new Error(`control not visible: ${JSON.stringify(hiddenControl)}`);
  console.log('shell check', JSON.stringify({ canvas: shell.canvas, controls: shell.controls.length }));

  const shadows = await page.evaluate(() => window.__ha.shadows());
  if (shadows !== false) throw new Error('real-time shadows are still enabled');

  await page.keyboard.press('Tab');
  await wait(900);
  const tabState = await page.evaluate(() => ({
    selected: document.body.classList.contains('has-selection'),
    title: document.querySelector('#part-title')?.textContent ?? '',
  }));
  if (!tabState.selected) throw new Error('Tab did not open a part card');
  await page.keyboard.press('Escape');
  await wait(900);
  const cameraA = await page.evaluate(() => window.__ha.camera());
  await page.keyboard.press('ArrowLeft');
  await wait(300);
  const cameraB = await page.evaluate(() => window.__ha.camera());
  if (JSON.stringify(cameraA.position) === JSON.stringify(cameraB.position)) {
    throw new Error('ArrowLeft did not rotate the camera');
  }
  await page.keyboard.press('=');
  await wait(300);
  const cameraC = await page.evaluate(() => window.__ha.camera());
  if (JSON.stringify(cameraB.position) === JSON.stringify(cameraC.position)) {
    throw new Error('+ did not zoom the camera');
  }
  await page.keyboard.press('r');
  await wait(1000);
  console.log('keyboard check', JSON.stringify({ tab: tabState.title, rotate: true, zoom: true }));
  await shot('initial');

  await page.evaluate(() => {
    const slider = document.querySelector('#explode');
    slider.value = '100';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(2000);
  const pauseA = await page.evaluate(() => window.__ha.drive());
  await wait(400);
  const pauseB = await page.evaluate(() => window.__ha.drive());
  if (!pauseA.paused || pauseA.waveAngle !== pauseB.waveAngle) {
    throw new Error(`explode did not pause the drive: ${JSON.stringify({ pauseA, pauseB })}`);
  }
  console.log('explode pause', JSON.stringify({ paused: pauseB.paused, value: '100' }));
  await shot('explode');
  await page.click('#btn-reset');
  await wait(1100);
  const resumed = await page.evaluate(() => window.__ha.drive());
  if (!resumed.enabled || resumed.paused) {
    throw new Error(`reset did not resume the drive: ${JSON.stringify(resumed)}`);
  }

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

  const gearCamera = await page.evaluate(() => {
    const cam = window.__ha.camera();
    const dx = cam.position[0] - cam.target[0];
    const dy = cam.position[1] - cam.target[1];
    const dz = cam.position[2] - cam.target[2];
    const distance = Math.hypot(dx, dy, dz);
    return {
      distance,
      angleFromAxis: (Math.acos(Math.abs(dy) / distance) * 180) / Math.PI,
    };
  });
  if (gearCamera.distance > 160 || gearCamera.angleFromAxis > 30) {
    throw new Error(`gear camera is not a close axial view: ${JSON.stringify(gearCamera)}`);
  }
  console.log('gear camera', JSON.stringify(gearCamera));

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

  await page.click('#btn-view-overview');
  await wait(1000);
  await shot('drive-50');
  await page.evaluate(() => {
    const slider = document.querySelector('#ratio');
    slider.value = '30';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(700);
  const rpm30 = await page.$eval('#output-rpm', (element) => element.textContent ?? '');
  if (!rpm30.includes('33.3')) {
    throw new Error(`ratio 30 readout wrong: "${rpm30}"`);
  }
  console.log('drive 30', JSON.stringify({ outputRpm: rpm30.trim() }));
  await shot('drive-30');

  const readoutLabel = await page.$eval('.drive-readout', (element) => element.textContent ?? '');
  if (!readoutLabel.includes('反向')) throw new Error('output direction is not labeled');
  await page.evaluate(() => window.__ha.setInputRpm(500));
  await wait(300);
  await page.click('#btn-reset');
  await wait(1000);
  const defaults = await page.evaluate(() => window.__ha.drive());
  if (defaults.ratio !== 50 || defaults.inputRpm !== 1000 || Math.abs(defaults.outputRpm - 20) > 0.01) {
    throw new Error(`reset did not restore defaults: ${JSON.stringify(defaults)}`);
  }
  console.log('reset defaults', JSON.stringify({ ratio: defaults.ratio, inputRpm: defaults.inputRpm }));

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

  const figure = await page.$('.diagram-figure');
  const figureBox = await figure.boundingBox();
  if (!figureBox) throw new Error('diagram figure has no box');
  await page.mouse.move(figureBox.x + figureBox.width / 2, figureBox.y + figureBox.height / 2);
  await page.mouse.wheel({ deltaY: -300 });
  await wait(250);
  const zoomTransform = await page.$eval(
    '#diagram-static',
    (element) => getComputedStyle(element).transform,
  );
  if (zoomTransform === 'none' || zoomTransform.startsWith('matrix(1, 0, 0, 1')) {
    throw new Error(`diagram did not zoom: ${zoomTransform}`);
  }
  console.log('diagram zoom', zoomTransform);

  await page.keyboard.press('Escape');
  await wait(300);
  const closed = await page.evaluate(() => window.__ha.diagram());
  if (closed.open || closed.canvasVisible) {
    throw new Error(`Escape did not close the diagram: ${JSON.stringify(closed)}`);
  }

  await page.evaluate(() => {
    const slider = document.querySelector('#explode');
    slider.value = '50';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(700);
  await page.evaluate(() => {
    const slider = document.querySelector('#explode');
    slider.value = '0';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(700);
  const restoreOpacity = await page.evaluate(() => window.__ha.materialOpacity('Body_Housing'));
  if (!restoreOpacity.length || restoreOpacity.some((value) => Math.abs(value - 0.2) > 1e-6)) {
    throw new Error(`transmission ghost was not restored at 0%: ${JSON.stringify(restoreOpacity)}`);
  }
  const restoredDrive = await page.evaluate(() => window.__ha.drive());
  if (restoredDrive.paused) throw new Error('drive stayed paused after explode returned to 0');
  console.log('explode restore', JSON.stringify({ opacity: restoreOpacity[0] }));

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.reload({ waitUntil: 'networkidle0', timeout: 90_000 });
  await wait(2400);
  const mobile = await page.evaluate(() => {
    const canvas = document.querySelector('#scene-container canvas');
    const bar = document.querySelector('.console');
    const rect = bar?.getBoundingClientRect();
    return {
      canvas: canvas ? { width: canvas.clientWidth, height: canvas.clientHeight } : null,
      bar: rect ? { top: rect.top, bottom: rect.bottom, width: rect.width } : null,
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  if (!mobile.canvas || mobile.canvas.height <= 300) {
    throw new Error(`mobile canvas too small: ${JSON.stringify(mobile.canvas)}`);
  }
  if (!mobile.bar || mobile.bar.top < 0 || mobile.bar.bottom > mobile.viewport.height + 1) {
    throw new Error(`mobile control bar outside viewport: ${JSON.stringify(mobile.bar)}`);
  }
  if (mobile.scrollWidth > mobile.viewport.width + 1) {
    throw new Error(`mobile horizontal overflow: ${JSON.stringify(mobile)}`);
  }
  const mobileChrome = await page.evaluate(() => {
    const intro = document.querySelector('#mobile-intro');
    const fineprint = document.querySelector('.console-fineprint');
    return {
      intro: intro ? intro.getBoundingClientRect().width : 0,
      disclaimer: fineprint ? fineprint.textContent?.trim() ?? '' : '',
    };
  });
  if (mobileChrome.intro <= 0 || !mobileChrome.disclaimer.includes('结构原理示意')) {
    throw new Error(`mobile narrative/disclaimer missing: ${JSON.stringify(mobileChrome)}`);
  }
  console.log('mobile chrome', JSON.stringify(mobileChrome));
  await shot('mobile');

  await page.click('#btn-diagram');
  await wait(800);
  const mobileDiagram = await page.evaluate(() => {
    const canvas = document.querySelector('#diagram-canvas');
    return {
      open: window.__ha.diagram().open,
      width: canvas?.clientWidth ?? 0,
    };
  });
  if (!mobileDiagram.open || mobileDiagram.width <= 0) {
    throw new Error(`mobile diagram unusable: ${JSON.stringify(mobileDiagram)}`);
  }
  await shot('mobile-diagram');
  await page.keyboard.press('Escape');
  await wait(300);

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.reload({ waitUntil: 'networkidle0', timeout: 90_000 });
  await wait(2400);
  const motion = await page.evaluate(() => window.__ha.motion());
  if (!motion.reduceMotion || motion.driveEnabled) {
    throw new Error(`reduced motion did not start static: ${JSON.stringify(motion)}`);
  }
  await page.evaluate(() => {
    const slider = document.querySelector('#explode');
    slider.value = '40';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(400);
  const snapped = await page.$eval('#explode', (element) => element.value);
  if (snapped !== '50') {
    throw new Error(`reduced-motion explode did not snap to 50: "${snapped}"`);
  }
  const reducedA = await page.evaluate(() => window.__ha.drive());
  await wait(500);
  const reducedB = await page.evaluate(() => window.__ha.drive());
  if (reducedA.waveAngle !== reducedB.waveAngle) {
    throw new Error('reduced motion still advances the drive');
  }
  console.log('reduced motion check', JSON.stringify({ snapped, drive: reducedB.enabled }));
  await page.click('#btn-diagram');
  await wait(700);
  await shot('reduced-motion');
  await page.keyboard.press('Escape');

  const errorPage = await browser.newPage();
  await errorPage.setRequestInterception(true);
  errorPage.on('request', (request) => {
    if (request.url().includes('.glb')) request.abort();
    else request.continue();
  });
  await errorPage.goto(URL, { waitUntil: 'networkidle0', timeout: 90_000 });
  await wait(1800);
  const errorState = await errorPage.evaluate(() => {
    const panel = document.querySelector('#error');
    return {
      hidden: panel?.hidden ?? true,
      message: document.querySelector('#error-message')?.textContent ?? '',
      retry: Boolean(panel?.querySelector('button')),
    };
  });
  await errorPage.close();
  if (errorState.hidden || !errorState.retry || !errorState.message) {
    throw new Error(`load failure did not show the error panel: ${JSON.stringify(errorState)}`);
  }
  console.log('error state', JSON.stringify({ retry: errorState.retry }));

  if (errors.length) throw new Error(errors.join('\n'));
  console.log('visual check PASS');
} finally {
  await browser.close();
}
