#!/usr/bin/env node
/**
 * @fileoverview Adversarial Mathematical Stress Test for SeleneSight Canvas Renderers.
 * Evaluates Trajectory Curve Canvas and Topocentric Skyplot Canvas (Polar & Linear)
 * against extreme mathematical edge cases, boundary conditions, and resolution matrices.
 *
 * Adheres strictly to zero external npm dependencies.
 */

import { ephemerisEngine } from '../src/core/ephemerisEngine.js';
import { InterfaceContract } from '../src/core/interfaceContract.js';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║   ADVERSARIAL CANVAS MATHEMATICAL STRESS & BOUNDARY HARNESS   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

function assert(cond, msg) {
  totalTests++;
  if (cond) {
    passedTests++;
  } else {
    failedTests++;
    failureDetails.push(msg);
    console.error(`  FAIL: ${msg}`);
  }
}

/**
 * Creates an instrumented Canvas 2D Mock Context that records all operations,
 * asserts no NaN / Infinity coordinate arguments, and tracks clipping state.
 */
function createInstrumentedContext(width, height) {
  const operations = [];
  let clipRect = null;
  const clipStack = [];
  let inClippedRegion = false;

  const checkNumeric = (name, ...vals) => {
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (typeof v === 'number' && (Number.isNaN(v) || !Number.isFinite(v))) {
        throw new Error(`Canvas method ${name} received invalid numeric argument at pos ${i}: ${v}`);
      }
    }
  };

  const ctx = {
    canvas: { width, height },
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px monospace',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineDash: [],

    clearRect(x, y, w, h) {
      checkNumeric('clearRect', x, y, w, h);
      operations.push({ op: 'clearRect', args: [x, y, w, h] });
    },
    fillRect(x, y, w, h) {
      checkNumeric('fillRect', x, y, w, h);
      operations.push({ op: 'fillRect', args: [x, y, w, h] });
    },
    strokeRect(x, y, w, h) {
      checkNumeric('strokeRect', x, y, w, h);
      operations.push({ op: 'strokeRect', args: [x, y, w, h] });
    },
    beginPath() {
      operations.push({ op: 'beginPath' });
    },
    closePath() {
      operations.push({ op: 'closePath' });
    },
    moveTo(x, y) {
      checkNumeric('moveTo', x, y);
      operations.push({ op: 'moveTo', args: [x, y], clipped: inClippedRegion });
    },
    lineTo(x, y) {
      checkNumeric('lineTo', x, y);
      operations.push({ op: 'lineTo', args: [x, y], clipped: inClippedRegion });
    },
    arc(x, y, r, sa, ea, ccw) {
      checkNumeric('arc', x, y, r, sa, ea);
      operations.push({ op: 'arc', args: [x, y, r, sa, ea, ccw], clipped: inClippedRegion });
    },
    rect(x, y, w, h) {
      checkNumeric('rect', x, y, w, h);
      operations.push({ op: 'rect', args: [x, y, w, h] });
    },
    fill() {
      operations.push({ op: 'fill', clipped: inClippedRegion });
    },
    stroke() {
      operations.push({ op: 'stroke', clipped: inClippedRegion });
    },
    fillText(text, x, y) {
      checkNumeric('fillText', x, y);
      operations.push({ op: 'fillText', text, args: [x, y] });
    },
    setLineDash(dash) {
      ctx.lineDash = [...dash];
      operations.push({ op: 'setLineDash', dash });
    },
    save() {
      clipStack.push(clipRect);
      operations.push({ op: 'save' });
    },
    restore() {
      clipRect = clipStack.pop() || null;
      inClippedRegion = clipRect !== null;
      operations.push({ op: 'restore' });
    },
    clip() {
      // Find the last rect op
      for (let i = operations.length - 1; i >= 0; i--) {
        if (operations[i].op === 'rect') {
          clipRect = operations[i].args;
          inClippedRegion = true;
          break;
        }
      }
      operations.push({ op: 'clip', rect: clipRect });
    },

    // Introspection
    getOperations() { return operations; },
    getClipRect() { return clipRect; },
    isInClippedRegion() { return inClippedRegion; },
  };

  return ctx;
}

/**
 * Trajectory curve rendering implementation identical to index.html lines 844-971.
 */
function renderTrajectoryCurveCanvas(canvas, cycleData, currentHour) {
  if (!canvas || !cycleData || !cycleData.steps) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  ctx.clearRect(0, 0, w, h);

  // Basalt background
  ctx.fillStyle = '#08090c';
  ctx.fillRect(padL, padT, plotW, plotH);

  const elMin = -8;
  const elMax = 16;
  const yForEl = (el) => padT + plotH * (1.0 - (el - elMin) / (elMax - elMin));
  const xForHour = (hr) => padL + (hr / 708.0) * plotW;

  // Elevation horizontal grid
  ctx.lineWidth = 1;
  for (let el = -6; el <= 14; el += 2) {
    const y = yForEl(el);
    ctx.strokeStyle = el === 0 ? 'rgba(245, 158, 11, 0.45)' : 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();

    ctx.fillStyle = el === 0 ? '#f59e0b' : '#6b7280';
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${el}°`, padL - 6, y + 3);
  }

  // Vertical time grid (every 100 hours)
  for (let hr = 0; hr <= 708; hr += 100) {
    const x = xForHour(hr);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();

    ctx.fillStyle = '#6b7280';
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`T+${hr}`, x, padT + plotH + 16);
  }

  // Plot boundary clipping
  ctx.save();
  ctx.beginPath();
  ctx.rect(padL, padT, plotW, plotH);
  ctx.clip();

  const steps = cycleData.steps;

  // 1. Draw Solar Elevation Curve (Solar Grazing Amber)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  for (let i = 0; i < steps.length; i++) {
    const x = xForHour(steps[i].hourOffset);
    const y = yForEl(steps[i].sunElDeg);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // 2. Draw Earth Elevation Curve (Phosphor Avionics Green)
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  for (let i = 0; i < steps.length; i++) {
    const x = xForHour(steps[i].hourOffset);
    const y = yForEl(steps[i].earthElDeg);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // 3. Draw LOLA Crater-Rim Mask Threshold (Oxide Crimson dashed)
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.lineWidth = 1.25;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  for (let i = 0; i < steps.length; i++) {
    const x = xForHour(steps[i].hourOffset);
    const y = yForEl(steps[i].sunHorizonMaskDeg);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. Current Time Needle
  const needleX = xForHour(currentHour);
  ctx.strokeStyle = '#f3f4f6';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(needleX, padT);
  ctx.lineTo(needleX, padT + plotH);
  ctx.stroke();

  ctx.restore();

  // Header Legend with protective backdrop pill
  const legX = padL + 10;
  const legY = padT + 6;
  ctx.fillStyle = 'rgba(16, 18, 23, 0.90)';
  ctx.fillRect(legX, legY, 355, 18);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeRect(legX, legY, 355, 18);

  ctx.font = '10.5px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('— Sun Elevation', legX + 8, legY + 13);
  ctx.fillStyle = '#10b981';
  ctx.fillText('— Earth Elevation', legX + 115, legY + 13);
  ctx.fillStyle = '#ef4444';
  ctx.fillText('-- LOLA Crater Mask', legX + 230, legY + 13);
}

/**
 * Skyplot rendering implementation identical to index.html lines 976-1289.
 */
function renderSkyplotCanvas(canvas, cycleData, currentHour, viewMode) {
  if (!canvas || !cycleData || !cycleData.steps) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const steps = cycleData.steps;
  const step = steps[currentHour] || steps[0];

  ctx.clearRect(0, 0, w, h);

  if (viewMode === 'polar') {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.42;

    // Background
    ctx.fillStyle = '#08090c';
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.fill();

    // Concentric elevation rings
    [0, 5, 15, 45].forEach((el) => {
      const r = maxR * (1.0 - (el / 90.0));
      ctx.strokeStyle = el === 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = el === 0 ? '#f59e0b' : '#6b7280';
      ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(`${el}°`, cx + 4, cy - r + 11);
    });

    // Azimuth spokes (30° step matching 12 LOLA sectors)
    for (let az = 0; az < 360; az += 30) {
      const rad = (az - 90) * (Math.PI / 180);
      ctx.strokeStyle = (az % 90 === 0) ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(rad), cy + maxR * Math.sin(rad));
      ctx.stroke();

      // Cardinal direction & azimuth degree labels
      const labelR = maxR + 14;
      const lx = cx + labelR * Math.cos(rad);
      const ly = cy + labelR * Math.sin(rad);

      let text;
      if (az === 0) text = 'N 000°';
      else if (az === 90) text = 'E 090°';
      else if (az === 180) text = 'S 180°';
      else if (az === 270) text = 'W 270°';
      else text = `${String(az).padStart(3, '0')}°`;

      ctx.font = '9.5px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = (az % 90 === 0) ? '#f3f4f6' : '#6b7280';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, lx, ly);
    }

    // LOLA Crater-Rim Mask (Oxide Crimson obstructed annular region outside rim: r_mask <= r <= maxR)
    if (cycleData.site && Array.isArray(cycleData.site.horizonProfile)) {
      const prof = cycleData.site.horizonProfile;
      // Shading obstructed annular region
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, -Math.PI / 2, Math.PI * 1.5, false);
      for (let a = 360; a >= 0; a -= 2) {
        const maskEl = ephemerisEngine.interpolateHorizon(prof, a);
        const r = maxR * Math.max(0.0, 1.0 - (maskEl / 90.0));
        const rad = (a - 90) * (Math.PI / 180);
        const px = cx + r * Math.cos(rad);
        const py = cy + r * Math.sin(rad);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.20)';
      ctx.fill();

      // Prominent crater rim boundary stroke
      ctx.beginPath();
      for (let a = 0; a <= 360; a += 2) {
        const maskEl = ephemerisEngine.interpolateHorizon(prof, a);
        const r = maxR * Math.max(0.0, 1.0 - (maskEl / 90.0));
        const rad = (a - 90) * (Math.PI / 180);
        const px = cx + r * Math.cos(rad);
        const py = cy + r * Math.sin(rad);
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Sun Orbit Track (Solar Amber dots)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    for (let i = 0; i < steps.length; i += 4) {
      const s = steps[i];
      const r = maxR * (1.0 - Math.max(0, s.sunElDeg) / 90.0);
      const rad = (s.sunAzDeg - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.arc(cx + r * Math.cos(rad), cy + r * Math.sin(rad), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Earth Libration Loop (Avionics Green dots)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
    for (let i = 0; i < steps.length; i += 4) {
      const s = steps[i];
      const r = maxR * (1.0 - Math.max(0, s.earthElDeg) / 90.0);
      const rad = (s.earthAzDeg - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.arc(cx + r * Math.cos(rad), cy + r * Math.sin(rad), 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active Sun Marker with Gold Halo
    const sunR = maxR * (1.0 - Math.max(0, step.sunElDeg) / 90.0);
    const sunRad = (step.sunAzDeg - 90) * (Math.PI / 180);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx + sunR * Math.cos(sunRad), cy + sunR * Math.sin(sunRad), 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Active Earth Marker with Green Halo
    const earthR = maxR * (1.0 - Math.max(0, step.earthElDeg) / 90.0);
    const earthRad = (step.earthAzDeg - 90) * (Math.PI / 180);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cx + earthR * Math.cos(earthRad), cy + earthR * Math.sin(earthRad), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();

  } else {
    // Cartesian Linear Panorama: X: Azimuth [0°, 360°], Y: Elevation [-10°, +45°]
    const padL = 50;
    const padR = 25;
    const padT = 30;
    const padB = 40;
    const pW = w - padL - padR;
    const pH = h - padT - padB;

    // Basalt Black sky background
    ctx.fillStyle = '#08090c';
    ctx.fillRect(padL, padT, pW, pH);

    const elMin = -10.0;
    const elMax = 45.0;
    const xForAz = (az) => padL + (az / 360.0) * pW;
    const yForEl = (el) => padT + pH * (1.0 - (el - elMin) / (elMax - elMin));

    // Horizontal elevation gridlines
    const elGrid = [-10, 0, 10, 20, 30, 40];
    ctx.lineWidth = 1;
    for (const el of elGrid) {
      const y = yForEl(el);
      ctx.strokeStyle = el === 0 ? 'rgba(245, 158, 11, 0.45)' : 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + pW, y);
      ctx.stroke();

      ctx.fillStyle = el === 0 ? '#f59e0b' : '#6b7280';
      ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${el > 0 ? '+' : ''}${el}°`, padL - 6, y);
    }

    // Vertical azimuth gridlines (every 30° matching 12 LOLA sectors)
    for (let az = 0; az <= 360; az += 30) {
      const x = xForAz(az);
      ctx.strokeStyle = (az % 90 === 0) ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + pH);
      ctx.stroke();

      let text;
      if (az === 0) text = 'N 000°';
      else if (az === 90) text = 'E 090°';
      else if (az === 180) text = 'S 180°';
      else if (az === 270) text = 'W 270°';
      else if (az === 360) text = 'N 360°';
      else text = `${String(az).padStart(3, '0')}°`;

      ctx.fillStyle = (az % 90 === 0) ? '#f3f4f6' : '#6b7280';
      ctx.font = '9.5px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(text, x, padT + pH + 8);
    }

    // Clip plot viewport
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, pW, pH);
    ctx.clip();

    // LOLA Crater-Rim Horizon Profile & Shaded Terrain
    if (cycleData.site && Array.isArray(cycleData.site.horizonProfile)) {
      const prof = cycleData.site.horizonProfile;

      // Shaded terrain below crater rim down to bottom
      ctx.beginPath();
      ctx.moveTo(padL, padT + pH);
      for (let az = 0; az <= 360; az += 1) {
        const maskEl = ephemerisEngine.interpolateHorizon(prof, az);
        ctx.lineTo(xForAz(az), yForEl(maskEl));
      }
      ctx.lineTo(padL + pW, padT + pH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.fill();

      // Stroke crater rim profile curve
      ctx.beginPath();
      for (let az = 0; az <= 360; az += 1) {
        const maskEl = ephemerisEngine.interpolateHorizon(prof, az);
        const x = xForAz(az);
        const y = yForEl(maskEl);
        if (az === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Sun Trajectory Trace (Solar Grazing Amber)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    for (let i = 0; i < steps.length; i += 3) {
      const s = steps[i];
      const x = xForAz(s.sunAzDeg);
      const y = yForEl(s.sunElDeg);
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Earth Trajectory Trace (Phosphor Avionics Green)
    ctx.fillStyle = 'rgba(16, 185, 129, 0.40)';
    for (let i = 0; i < steps.length; i += 3) {
      const s = steps[i];
      const x = xForAz(s.earthAzDeg);
      const y = yForEl(s.earthElDeg);
      ctx.beginPath();
      ctx.arc(x, y, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active Sun Marker with Gold Halo & Label
    const sunX = xForAz(step.sunAzDeg);
    const sunY = yForEl(step.sunElDeg);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = sunX > padL + pW - 130 ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    const sunOffset = sunX > padL + pW - 130 ? -10 : 10;
    ctx.fillText(`SUN [${step.sunAzDeg.toFixed(1)}°, ${step.sunElDeg.toFixed(1)}°]`, sunX + sunOffset, sunY - 4);

    // Active Earth Marker with Green Halo & Label
    const earthX = xForAz(step.earthAzDeg);
    const earthY = yForEl(step.earthElDeg);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(earthX, earthY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = earthX > padL + pW - 140 ? 'right' : 'left';
    ctx.textBaseline = 'top';
    const earthOffset = earthX > padL + pW - 140 ? -10 : 10;
    ctx.fillText(`EARTH [${step.earthAzDeg.toFixed(1)}°, ${step.earthElDeg.toFixed(1)}°]`, earthX + earthOffset, earthY + 8);

    ctx.restore();

    // Header Legend with protective backdrop pill
    const legX = padL + 10;
    const legY = padT + 6;
    ctx.fillStyle = 'rgba(16, 18, 23, 0.90)';
    ctx.fillRect(legX, legY, 355, 18);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(legX, legY, 355, 18);

    ctx.font = '10.5px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('— Sun Trajectory', legX + 8, legY + 9);
    ctx.fillStyle = '#10b981';
    ctx.fillText('— Earth Libration', legX + 120, legY + 9);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('-- LOLA Crater Rim', legX + 235, legY + 9);
  }
}

function makeCanvas(w, h) {
  const ctx = createInstrumentedContext(w, h);
  return {
    width: w,
    height: h,
    getContext: () => ctx,
    _ctx: ctx,
  };
}

// =========================================================================
// SECTION 1: CANONICAL SITES BASELINE TESTS
// =========================================================================
console.log('\n--- Section 1: Canonical Sites Baseline Stress ---');
const canonicalSites = InterfaceContract.getMockSites();
for (const site of canonicalSites) {
  const cycle = ephemerisEngine.computeFullCycle(site, '2026-11-14');

  // Trajectory canvas
  const cTraj = makeCanvas(700, 340);
  let trajThrew = false;
  try {
    renderTrajectoryCurveCanvas(cTraj, cycle, 354);
  } catch (err) {
    trajThrew = true;
    console.error(`Trajectory canvas error on site ${site.id}:`, err);
  }
  assert(!trajThrew, `Trajectory canvas renders without exceptions for site ${site.id}`);
  assert(cTraj._ctx.getOperations().length > 100, `Trajectory canvas executes >= 100 draw ops for site ${site.id}`);

  // Skyplot Polar
  const cSkyPol = makeCanvas(960, 520);
  let skyPolThrew = false;
  try {
    renderSkyplotCanvas(cSkyPol, cycle, 354, 'polar');
  } catch (err) {
    skyPolThrew = true;
    console.error(`Polar skyplot canvas error on site ${site.id}:`, err);
  }
  assert(!skyPolThrew, `Polar skyplot canvas renders without exceptions for site ${site.id}`);

  // Skyplot Linear
  const cSkyLin = makeCanvas(960, 520);
  let skyLinThrew = false;
  try {
    renderSkyplotCanvas(cSkyLin, cycle, 354, 'linear');
  } catch (err) {
    skyLinThrew = true;
    console.error(`Linear skyplot canvas error on site ${site.id}:`, err);
  }
  assert(!skyLinThrew, `Linear skyplot canvas renders without exceptions for site ${site.id}`);
}

// =========================================================================
// SECTION 2: EXTREME MATHEMATICAL INPUTS STRESS
// =========================================================================
console.log('\n--- Section 2: Extreme Mathematical Inputs Stress ---');

// 2.1 Earth Elevation Approaching and Exceeding +15° (Malapert Massif +14.87°, Extreme +15.99°, Outlier +25.0°)
console.log('Testing Earth elevation boundaries: +14.87°, +15.99°, +25.0°...');
const malapert = canonicalSites.find(s => s.id === 'malapert_massif_summit');
const malapertCycle = ephemerisEngine.computeFullCycle(malapert, '2026-11-14');

// Find max earth elevation in Malapert Massif
let maxEarthEl = -999;
let maxEarthElHour = 0;
malapertCycle.steps.forEach(s => {
  if (s.earthElDeg > maxEarthEl) {
    maxEarthEl = s.earthElDeg;
    maxEarthElHour = s.hourOffset;
  }
});
assert(maxEarthEl >= 14.0, `Malapert Massif Earth elevation reaches high value (${maxEarthEl.toFixed(2)}°)`);
console.log(`  Malapert Massif Peak Earth El: ${maxEarthEl.toFixed(2)}° at hour ${maxEarthElHour}`);

// Render trajectory at max Earth elevation
const cMalapert = makeCanvas(700, 340);
renderTrajectoryCurveCanvas(cMalapert, malapertCycle, maxEarthElHour);
const clipOp = cMalapert._ctx.getOperations().find(op => op.op === 'clip');
assert(clipOp !== undefined && clipOp.rect !== null, 'Trajectory canvas activates clipping rectangle');
const clipRect = clipOp ? clipOp.rect : null;
assert(clipRect && clipRect[0] === 40 && clipRect[1] === 20 && clipRect[2] === 640 && clipRect[3] === 290,
  'Clip rect matches [padL=40, padT=20, plotW=640, plotH=290]');

// Verify synthetic extreme cycles with earthElDeg up to +25° and -20°
const syntheticExtremeSteps = JSON.parse(JSON.stringify(malapertCycle.steps));
syntheticExtremeSteps[100].earthElDeg = 15.99;
syntheticExtremeSteps[101].earthElDeg = 25.0; // Outlier exceeding elMax = 16
syntheticExtremeSteps[102].earthElDeg = -20.0; // Outlier below elMin = -8
const syntheticCycle = { site: malapert, steps: syntheticExtremeSteps };

const cExtremeTraj = makeCanvas(700, 340);
let extremeTrajThrew = false;
try {
  renderTrajectoryCurveCanvas(cExtremeTraj, syntheticCycle, 101);
} catch (e) {
  extremeTrajThrew = true;
}
assert(!extremeTrajThrew, 'Trajectory canvas handles Earth elevation > 16° and < -8° without throwing');

// 2.2 Negative Solar Elevations During Lunar Night (-0.01°, -1.5°, -10°, -90°)
console.log('Testing Negative Solar Elevations: -0.01°, -1.5°, -10°, -90°...');
const nightSteps = JSON.parse(JSON.stringify(malapertCycle.steps));
[-0.01, -1.5, -5.0, -10.0, -90.0].forEach((negEl, idx) => {
  nightSteps[idx * 50].sunElDeg = negEl;
});
const nightCycle = { site: malapert, steps: nightSteps };

// Trajectory
const cNightTraj = makeCanvas(700, 340);
let nightTrajThrew = false;
try {
  renderTrajectoryCurveCanvas(cNightTraj, nightCycle, 0);
} catch (e) { nightTrajThrew = true; }
assert(!nightTrajThrew, 'Trajectory canvas handles negative sun elevations cleanly');

// Polar Skyplot with negative sun elevations
const cNightPol = makeCanvas(960, 520);
let nightPolThrew = false;
try {
  [-0.01, -1.5, -5.0, -10.0, -90.0].forEach((negEl, idx) => {
    renderSkyplotCanvas(cNightPol, nightCycle, idx * 50, 'polar');
  });
} catch (e) { nightPolThrew = true; }
assert(!nightPolThrew, 'Polar skyplot canvas handles negative sun elevations cleanly without radial overflow');

// Linear Skyplot with negative sun elevations
const cNightLin = makeCanvas(960, 520);
let nightLinThrew = false;
try {
  [-0.01, -1.5, -5.0, -10.0, -90.0].forEach((negEl, idx) => {
    renderSkyplotCanvas(cNightLin, nightCycle, idx * 50, 'linear');
  });
} catch (e) { nightLinThrew = true; }
assert(!nightLinThrew, 'Linear skyplot canvas handles negative sun elevations cleanly');

// 2.3 Zero LOLA Horizon Mask Angles and Extreme Angles (0.0° and 89.9°)
console.log('Testing Horizon Mask Angles: 0.0° (flat plane) and 89.9° (sheer wall)...');
const flatSite = { ...malapert, id: 'flat_site', horizonProfile: Array(12).fill(0.0) };
const flatCycle = ephemerisEngine.computeFullCycle(flatSite, '2026-11-14');

const cFlatTraj = makeCanvas(700, 340);
const cFlatPol = makeCanvas(960, 520);
const cFlatLin = makeCanvas(960, 520);
let flatThrew = false;
try {
  renderTrajectoryCurveCanvas(cFlatTraj, flatCycle, 0);
  renderSkyplotCanvas(cFlatPol, flatCycle, 0, 'polar');
  renderSkyplotCanvas(cFlatLin, flatCycle, 0, 'linear');
} catch (e) { flatThrew = true; }
assert(!flatThrew, 'Canvases handle 0.0° flat LOLA horizon profile without math or division by zero errors');

const wallSite = { ...malapert, id: 'wall_site', horizonProfile: Array(12).fill(89.9) };
const wallCycle = ephemerisEngine.computeFullCycle(wallSite, '2026-11-14');

const cWallTraj = makeCanvas(700, 340);
const cWallPol = makeCanvas(960, 520);
const cWallLin = makeCanvas(960, 520);
let wallThrew = false;
try {
  renderTrajectoryCurveCanvas(cWallTraj, wallCycle, 0);
  renderSkyplotCanvas(cWallPol, wallCycle, 0, 'polar');
  renderSkyplotCanvas(cWallLin, wallCycle, 0, 'linear');
} catch (e) { wallThrew = true; }
assert(!wallThrew, 'Canvases handle 89.9° sheer wall LOLA horizon profile cleanly');

// 2.4 Azimuth Wraparound: 360° Wrap Guard & Continuous Linear Boundaries
console.log('Testing 360° Azimuth Wraparound and Edge Coordinates...');
const wrapSteps = JSON.parse(JSON.stringify(malapertCycle.steps));
wrapSteps[0].sunAzDeg = 0.0;
wrapSteps[1].sunAzDeg = 359.99;
wrapSteps[2].sunAzDeg = 360.0; // Edge wrap
wrapSteps[3].earthAzDeg = 0.0;
wrapSteps[4].earthAzDeg = 359.99;
wrapSteps[5].earthAzDeg = 360.0;
const wrapCycle = { site: malapert, steps: wrapSteps };

const cWrapPol = makeCanvas(960, 520);
const cWrapLin = makeCanvas(960, 520);
let wrapThrew = false;
try {
  for (let h = 0; h < 6; h++) {
    renderSkyplotCanvas(cWrapPol, wrapCycle, h, 'polar');
    renderSkyplotCanvas(cWrapLin, wrapCycle, h, 'linear');
  }
} catch (e) { wrapThrew = true; }
assert(!wrapThrew, 'Skyplot handles azimuth 0.0°, 359.99°, and 360.0° wraps without throwing');

// =========================================================================
// SECTION 3: RESOLUTION & DIMENSION STRESS MATRIX
// =========================================================================
console.log('\n--- Section 3: Resolution & Dimension Stress Matrix ---');

const dimensionMatrix = [
  { w: 3840, h: 2160, desc: '4K Ultra HD' },
  { w: 2560, h: 1440, desc: '2K QHD' },
  { w: 1920, h: 1080, desc: 'Full HD' },
  { w: 1366, h: 768,  desc: 'Standard Laptop' },
  { w: 1024, h: 768,  desc: 'Tablet Landscape' },
  { w: 960,  h: 520,  desc: 'Default Skyplot' },
  { w: 700,  h: 340,  desc: 'Default Trajectory' },
  { w: 480,  h: 320,  desc: 'Mobile Compact' },
  { w: 100,  h: 100,  desc: 'Micro Thumbnail' },
  { w: 50,   h: 50,   desc: 'Sub-padding Boundary' },
  { w: 10000,h: 400,  desc: 'Extreme Wide Aspect' },
  { w: 400,  h: 10000,desc: 'Extreme Tall Aspect' },
];

for (const dim of dimensionMatrix) {
  const cT = makeCanvas(dim.w, dim.h);
  const cP = makeCanvas(dim.w, dim.h);
  const cL = makeCanvas(dim.w, dim.h);

  let err = null;
  try {
    renderTrajectoryCurveCanvas(cT, malapertCycle, 354);
    renderSkyplotCanvas(cP, malapertCycle, 354, 'polar');
    renderSkyplotCanvas(cL, malapertCycle, 354, 'linear');
  } catch (e) {
    err = e;
  }

  assert(err === null, `Renderers execute cleanly at dimension ${dim.w}x${dim.h} (${dim.desc})`);
}

// Zero-dimension resilience
const cZero = makeCanvas(0, 0);
let zeroThrew = false;
try {
  renderTrajectoryCurveCanvas(cZero, malapertCycle, 0);
  renderSkyplotCanvas(cZero, malapertCycle, 0, 'polar');
  renderSkyplotCanvas(cZero, malapertCycle, 0, 'linear');
} catch (e) {
  zeroThrew = true;
}
assert(!zeroThrew, 'Zero-dimension canvas handled without uncaught exceptions');

// Null / Malformed cycle resilience
const cNull = makeCanvas(700, 340);
let nullThrew = false;
try {
  renderTrajectoryCurveCanvas(cNull, null, 0);
  renderTrajectoryCurveCanvas(cNull, {}, 0);
  renderTrajectoryCurveCanvas(cNull, { steps: null }, 0);
  renderSkyplotCanvas(cNull, null, 0, 'polar');
  renderSkyplotCanvas(cNull, {}, 0, 'polar');
} catch (e) {
  nullThrew = true;
}
assert(!nullThrew, 'Renderers guard defensively against null or empty cycle data');

// =========================================================================
// SECTION 4: INTENSIVE FUZZING (100 RANDOM COMBINATIONS)
// =========================================================================
console.log('\n--- Section 4: Fuzzing 100 Extreme Random Synthetics ---');
let fuzzPassed = 0;
for (let i = 0; i < 100; i++) {
  const fWidth = Math.floor(Math.random() * 2000) + 100;
  const fHeight = Math.floor(Math.random() * 1500) + 100;
  const fSite = {
    id: `fuzz_${i}`,
    name: `Fuzz Site ${i}`,
    shortName: `Fuzz ${i}`,
    lat: -90 + Math.random() * 5,
    lon: -180 + Math.random() * 360,
    elevM: -5000 + Math.random() * 12000,
    slopeDeg: Math.random() * 45,
    horizonProfile: Array.from({ length: 12 }, () => Math.random() * 40),
  };
  const fCycle = ephemerisEngine.computeFullCycle(fSite, '2026-11-14');
  const fHour = Math.floor(Math.random() * 709);
  const fMode = Math.random() > 0.5 ? 'polar' : 'linear';

  const cT = makeCanvas(fWidth, fHeight);
  const cS = makeCanvas(fWidth, fHeight);

  let ok = true;
  try {
    renderTrajectoryCurveCanvas(cT, fCycle, fHour);
    renderSkyplotCanvas(cS, fCycle, fHour, fMode);
  } catch (e) {
    ok = false;
    console.error(`Fuzz iteration ${i} failed:`, e);
  }
  if (ok) fuzzPassed++;
}
assert(fuzzPassed === 100, `All 100 randomized fuzz cycles rendered with zero exceptions (${fuzzPassed}/100)`);

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  CANVAS STRESS HARNESS COMPLETE: ${passedTests}/${totalTests} ASSERTIONS PASSED`);
if (failedTests > 0) {
  console.log(`  FAILURES: ${failedTests}`);
  failureDetails.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log('  ALL ADVERSARIAL CANVAS STRESS TESTS CONFIRMED SATISFIED.');
  console.log('═══════════════════════════════════════════════════════════════');
  process.exit(0);
}
