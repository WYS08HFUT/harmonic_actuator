import {
  externalToothHalfAngle,
  GEAR_COLORS,
  gearParams,
  internalToothHalfAngle,
} from './harmonicGears.ts';
import type { GearParams } from './harmonicGears.ts';

export interface ToothRadii {
  fsTip: number;
  fsRoot: number;
  csTip: number;
  csRoot: number;
}

export function toothRadii(ratio: number): ToothRadii {
  const p = gearParams(ratio);
  return {
    fsTip: p.fsTipRadius,
    fsRoot: p.fsRootRadius,
    csTip: p.csTipRadius,
    csRoot: p.csRootRadius,
  };
}

export interface MeshDiagramState {
  ratio: number;
  waveAngle: number;
  outputAngle: number;
  inputRpm: number;
}

const LOGICAL = 360;
const STRIP = { x: 14, y: 42, w: 332, h: 150 };
const SPAN = 0.3;
const R_MID = 24.5;
const BALL_COUNT = 18;
const BALL_RADIUS = 1.25;
const CAM_MAJOR_GAP = 3.5;

const COLORS = {
  ink: '#26241f',
  muted: '#7c776d',
  line: '#ddd7cc',
  paper: '#fbfaf7',
  copper: '#c2652a',
  steel: '#4f708f',
  flex: GEAR_COLORS.flexspline,
  circular: GEAR_COLORS.circularSpline,
  ball: GEAR_COLORS.balls,
};

const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

const ellipseRadius = (major: number, minor: number, phi: number): number =>
  (major * minor) /
  Math.sqrt(
    (minor * Math.cos(phi)) ** 2 + (major * Math.sin(phi)) ** 2,
  );

/**
 * Canvas inset for the harmonic mesh. The upper strip unrolls a +/-17 degree
 * window around the wave generator's major axis at a large scale, so the
 * flexspline tooth engagement is readable; the lower-left ring shows the
 * whole set with the ellipse exaggerated to match the 3D view.
 */
export class MeshDiagram {
  private readonly ctx: CanvasRenderingContext2D;
  private state: MeshDiagramState = {
    ratio: 50,
    waveAngle: 0,
    outputAngle: 0,
    inputRpm: 1000,
  };
  private visible = false;
  private frame: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    this.ctx = context;
  }

  setState(state: MeshDiagramState): void {
    this.state = state;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      if (this.frame === null) this.frame = requestAnimationFrame(this.loop);
    } else if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  dispose(): void {
    this.setVisible(false);
    this.ctx.clearRect(0, 0, LOGICAL, LOGICAL);
  }

  private loop = (): void => {
    if (!this.visible) {
      this.frame = null;
      return;
    }
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  };

  private resize(): void {
    const css = Math.max(1, this.canvas.clientWidth || LOGICAL);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = Math.round(css * dpr);
    if (this.canvas.width !== pixels || this.canvas.height !== pixels) {
      this.canvas.width = pixels;
      this.canvas.height = pixels;
    }
    const scale = pixels / LOGICAL;
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  private draw(): void {
    this.resize();
    const ctx = this.ctx;
    const p = gearParams(this.state.ratio);

    ctx.clearRect(0, 0, LOGICAL, LOGICAL);
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, LOGICAL, LOGICAL);

    this.drawHeader(p);
    this.drawToothStrip(p);
    this.drawRing(p);
    this.drawLegend();
  }

  private drawHeader(p: GearParams): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.ink;
    ctx.font = '600 13px Inter, "Noto Sans SC", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(
      `Zf = ${p.zf} · Zc = ${p.zc} · i = ${Number.isInteger(p.ratio) ? p.ratio : p.ratio.toFixed(1)}:1`,
      STRIP.x,
      22,
    );

    ctx.fillStyle = COLORS.copper;
    ctx.font = '600 10px Inter, "Noto Sans SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('局部放大', STRIP.x + STRIP.w, 22);
  }

  private drawToothStrip(p: GearParams): void {
    const ctx = this.ctx;
    const psi = this.state.waveAngle;
    const xScale = STRIP.w / (2 * SPAN * R_MID);
    const rMax = Math.max(p.csRootRadius + 0.8, 27.2);
    const rMin = p.wgMinorRadius - 3.4;
    const yScale = STRIP.h / (rMax - rMin);

    const xAt = (theta: number): number =>
      STRIP.x + STRIP.w / 2 + wrap(theta - psi) * R_MID * xScale;
    const yAt = (radius: number): number => STRIP.y + (rMax - radius) * yScale;
    const delta = (theta: number): number =>
      p.module * Math.cos(2 * (theta - psi));
    const visible = (theta: number): boolean =>
      Math.abs(wrap(theta - psi)) <= SPAN + 0.06;
    const pxPerMm = xScale;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(STRIP.x, STRIP.y, STRIP.w, STRIP.h, 8);
    ctx.clip();
    ctx.fillStyle = '#f4f2ec';
    ctx.fillRect(STRIP.x, STRIP.y, STRIP.w, STRIP.h);

    // Circular spline: rim band plus inward-pointing teeth.
    const csBandTop = yAt(rMax);
    ctx.fillStyle = COLORS.circular;
    ctx.fillRect(STRIP.x, csBandTop, STRIP.w, yAt(p.csRootRadius) - csBandTop + 0.6);

    const csPitch = (Math.PI * 2) / p.zc;
    const csTipHalf = internalToothHalfAngle(p, p.csTipRadius);
    const csRootHalf = internalToothHalfAngle(p, p.csRootRadius);
    for (let j = 0; j < p.zc; j += 1) {
      const center = (j + 0.5) * csPitch;
      if (!visible(center)) continue;
      ctx.beginPath();
      ctx.moveTo(xAt(center - csRootHalf), yAt(p.csRootRadius));
      ctx.lineTo(xAt(center - csTipHalf), yAt(p.csTipRadius));
      ctx.lineTo(xAt(center + csTipHalf), yAt(p.csTipRadius));
      ctx.lineTo(xAt(center + csRootHalf), yAt(p.csRootRadius));
      ctx.closePath();
      ctx.fillStyle = COLORS.circular;
      ctx.fill();
      ctx.strokeStyle = '#5b626c';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // Flexspline: deformed base band under the external teeth.
    const bandSteps = 72;
    ctx.beginPath();
    for (let i = 0; i <= bandSteps; i += 1) {
      const theta = psi - SPAN - 0.05 + ((SPAN + 0.05) * 2 * i) / bandSteps;
      const radius = p.fsRootRadius + delta(theta);
      if (i === 0) ctx.moveTo(xAt(theta), yAt(radius));
      else ctx.lineTo(xAt(theta), yAt(radius));
    }
    for (let i = bandSteps; i >= 0; i -= 1) {
      const theta = psi - SPAN - 0.05 + ((SPAN + 0.05) * 2 * i) / bandSteps;
      ctx.lineTo(xAt(theta), yAt(p.fsInnerRadius + delta(theta)));
    }
    ctx.closePath();
    ctx.fillStyle = '#a9b8cb';
    ctx.fill();

    const fsPitch = (Math.PI * 2) / p.zf;
    const fsTipHalf = externalToothHalfAngle(p, p.fsTipRadius);
    const fsRootHalf = externalToothHalfAngle(p, p.fsRootRadius);
    for (let i = 0; i < p.zf; i += 1) {
      const center = this.state.outputAngle + i * fsPitch;
      if (!visible(center)) continue;
      const rootL = center - fsRootHalf;
      const tipL = center - fsTipHalf;
      const tipR = center + fsTipHalf;
      const rootR = center + fsRootHalf;
      ctx.beginPath();
      ctx.moveTo(xAt(rootL), yAt(p.fsRootRadius + delta(rootL)));
      ctx.lineTo(xAt(tipL), yAt(p.fsTipRadius + delta(tipL)));
      ctx.lineTo(xAt(tipR), yAt(p.fsTipRadius + delta(tipR)));
      ctx.lineTo(xAt(rootR), yAt(p.fsRootRadius + delta(rootR)));
      ctx.closePath();
      ctx.fillStyle = '#a9b8cb';
      ctx.fill();
      ctx.strokeStyle = '#5f7189';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    // Wave generator cam outline and balls.
    const camMajor = p.wgMajorRadius - CAM_MAJOR_GAP;
    const camMinor = p.wgMinorRadius - CAM_MAJOR_GAP;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 90; i += 1) {
      const theta = psi - SPAN - 0.05 + ((SPAN + 0.05) * 2 * i) / 90;
      const radius = ellipseRadius(camMajor, camMinor, theta - psi);
      const y = yAt(radius);
      if (!started) {
        ctx.moveTo(xAt(theta), y);
        started = true;
      } else {
        ctx.lineTo(xAt(theta), y);
      }
    }
    ctx.strokeStyle = 'rgba(192, 138, 62, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    const ballMajor = p.wgMajorRadius - 1 - BALL_RADIUS;
    const ballMinor = p.wgMinorRadius - 1 - BALL_RADIUS;
    for (let k = 0; k < BALL_COUNT; k += 1) {
      const phi = (k * Math.PI * 2) / BALL_COUNT;
      const theta = psi + phi;
      if (!visible(theta)) continue;
      const radius = ellipseRadius(ballMajor, ballMinor, phi);
      ctx.beginPath();
      ctx.arc(xAt(theta), yAt(radius), BALL_RADIUS * pxPerMm, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ball;
      ctx.fill();
      ctx.strokeStyle = '#9aa5b3';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Major-axis contact highlight.
    const contactWidth = 34;
    ctx.fillStyle = 'rgba(194, 101, 42, 0.10)';
    ctx.fillRect(STRIP.x + STRIP.w / 2 - contactWidth / 2, STRIP.y, contactWidth, STRIP.h);
    ctx.strokeStyle = 'rgba(194, 101, 42, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(STRIP.x + STRIP.w / 2, STRIP.y);
    ctx.lineTo(STRIP.x + STRIP.w / 2, STRIP.y + STRIP.h);
    ctx.stroke();

    ctx.restore();
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(STRIP.x, STRIP.y, STRIP.w, STRIP.h, 8);
    ctx.stroke();

    ctx.fillStyle = COLORS.muted;
    ctx.font = '400 10px Inter, "Noto Sans SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('长轴附近齿部 · 局部放大（真实变形）', STRIP.x, STRIP.y + STRIP.h + 14);
  }

  private drawRing(p: GearParams): void {
    const ctx = this.ctx;
    const psi = this.state.waveAngle;
    const cx = 92;
    const cy = 286;
    const scale = 58 / p.csOuterRadius;
    const delta = (theta: number): number =>
      p.module * Math.cos(2 * (theta - psi));

    // Circular spline annulus.
    ctx.beginPath();
    ctx.arc(cx, cy, p.csOuterRadius * scale, 0, Math.PI * 2);
    ctx.arc(cx, cy, p.csTipRadius * scale, 0, Math.PI * 2, true);
    ctx.fillStyle = COLORS.circular;
    ctx.fill('evenodd');

    // Flexspline deformed silhouette.
    ctx.beginPath();
    for (let i = 0; i <= 180; i += 1) {
      const theta = (i / 180) * Math.PI * 2;
      const radius = (p.fsTipRadius + delta(theta)) * scale;
      const x = cx + Math.cos(theta) * radius;
      const y = cy + Math.sin(theta) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = 180; i >= 0; i -= 1) {
      const theta = (i / 180) * Math.PI * 2;
      const radius = (p.fsInnerRadius + delta(theta)) * scale;
      ctx.lineTo(cx + Math.cos(theta) * radius, cy + Math.sin(theta) * radius);
    }
    ctx.closePath();
    ctx.fillStyle = COLORS.flex;
    ctx.fill('evenodd');

    // Wave generator cam and balls.
    const camMajor = (p.wgMajorRadius - CAM_MAJOR_GAP) * scale;
    const camMinor = (p.wgMinorRadius - CAM_MAJOR_GAP) * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy, camMajor, camMinor, psi, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(192, 138, 62, 0.95)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const ballMajor = p.wgMajorRadius - 1 - BALL_RADIUS;
    const ballMinor = p.wgMinorRadius - 1 - BALL_RADIUS;
    for (let k = 0; k < BALL_COUNT; k += 1) {
      const phi = (k * Math.PI * 2) / BALL_COUNT;
      const theta = psi + phi;
      const radius = ellipseRadius(ballMajor, ballMinor, phi) * scale;
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(theta) * radius,
        cy + Math.sin(theta) * radius,
        1.6,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = COLORS.ball;
      ctx.fill();
      ctx.strokeStyle = '#8d98a6';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Major and minor axes.
    ctx.strokeStyle = COLORS.copper;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(psi) * 62, cy + Math.sin(psi) * 62);
    ctx.stroke();
    ctx.strokeStyle = COLORS.steel;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(psi + Math.PI / 2) * 62, cy + Math.sin(psi + Math.PI / 2) * 62);
    ctx.stroke();
  }

  private drawLegend(): void {
    const ctx = this.ctx;
    const x = 170;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '500 11px Inter, "Noto Sans SC", sans-serif';

    ctx.fillStyle = COLORS.copper;
    ctx.beginPath();
    ctx.arc(x + 4, 250, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.fillText('长轴啮合', x + 14, 250);

    ctx.fillStyle = COLORS.steel;
    ctx.beginPath();
    ctx.arc(x + 4, 272, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.fillText('短轴脱开', x + 14, 272);

    ctx.fillStyle = COLORS.muted;
    ctx.font = '400 10px Inter, "Noto Sans SC", sans-serif';
    ctx.fillText('刚轮固定 · 柔轮输出', x, 296);
    ctx.fillText('18 滚珠 · 波发生器输入', x, 314);
    ctx.fillText(
      this.state.inputRpm > 0 ? `输入 ${this.state.inputRpm} rpm` : '输入停止',
      x,
      332,
    );
    ctx.fillText('径向变形与刚轮/波发生器同尺度', x, 350);
  }
}
