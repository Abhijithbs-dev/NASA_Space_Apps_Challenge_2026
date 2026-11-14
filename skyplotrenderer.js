/**
 * SeleneSight — 360° Polar Dome & Linear Horizon Canvas Renderer
 * Owned by: Alfiya S (feat/alfiya-ui-visuals)
 *
 * Exports:
 *   renderSkyplot(canvasElement, cycleData, currentHour, viewMode)
 */

const DEG_TO_RAD = Math.PI / 180;

/**
 * Linearly interpolates the 12-sector (30° step) LOLA horizon profile at any azimuth (0–360°).
 * @param {number[]} profile - 12 elevation angles in degrees (0°, 30°, ..., 330°)
 * @param {number} azDeg - Azimuth in degrees
 * @returns {number} Interpolated horizon mask elevation in degrees
 */
function sampleHorizonProfile(profile, azDeg) {
  if (!Array.isArray(profile) || profile.length === 0) return 0;
  const normAz = ((azDeg % 360) + 360) % 360;
  const step = 360 / profile.length;
  const idx0 = Math.floor(normAz / step) % profile.length;
  const idx1 = (idx0 + 1) % profile.length;
  const t = (normAz - idx0 * step) / step;
  return profile[idx0] * (1 - t) + profile[idx1] * t;
}

/**
 * Configures canvas for crisp high-DPI rendering and returns logical width/height.
 */
function setupHiDPICanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width || canvas.width || 600, 300);
  const height = Math.max(rect.height || canvas.height || 460, 260);
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

/**
 * Renders either the 360° Polar Dome ("polar") or Linear Horizon Panorama ("linear").
 *
 * @param {HTMLCanvasElement} canvasElement
 * @param {Object} cycleData - Output from ephemerisEngine.computeFullCycle()
 * @param {number} currentHour - Active hour index (0..708)
 * @param {"polar"|"linear"} [viewMode="polar"]
 */
export function renderSkyplot(canvasElement, cycleData, currentHour = 0, viewMode = "polar") {
  if (!canvasElement) return;
  const { ctx, width, height } = setupHiDPICanvas(canvasElement);

  // Clear background
  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, width, height);

  if (!cycleData || !Array.isArray(cycleData.steps) || cycleData.steps.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Select a lunar landing site to render skyplot", width / 2, height / 2);
    return;
  }

  const hourIdx = Math.max(0, Math.min(Math.round(currentHour), cycleData.steps.length - 1));
  if (viewMode === "linear") {
    drawLinearHorizon(ctx, width, height, cycleData, hourIdx);
  } else {
    drawPolarDome(ctx, width, height, cycleData, hourIdx);
  }
}

function drawPolarDome(ctx, width, height, cycleData, hourIdx) {
  const { site, steps } = cycleData;
  const step = steps[hourIdx];
  const cx = width / 2;
  const cy = height / 2 + 6;
  const radius = Math.min(width, height) * 0.40;
  const maxEl = 90;

  // Map elevation (0..90, or down to -10) to radial distance
  const elToR = (el) => {
    const clamped = Math.max(-8, Math.min(90, el));
    return ((maxEl - clamped) / maxEl) * radius;
  };

  // Azimuth 0° = North (top), clockwise
  const polarToXY = (azDeg, elDeg) => {
    const r = elToR(elDeg);
    const rad = (azDeg - 90) * DEG_TO_RAD;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  // Subtle radial sky dome backdrop
  const skyGrad = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius * 1.1);
  skyGrad.addColorStop(0, "rgba(30, 58, 138, 0.22)");
  skyGrad.addColorStop(0.75, "rgba(15, 23, 42, 0.55)");
  skyGrad.addColorStop(1, "rgba(7, 11, 20, 0.95)");
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.09, 0, Math.PI * 2);
  ctx.fillStyle = skyGrad;
  ctx.fill();

  // Elevation rings (0°, 5°, 15°, 45°)
  const rings = [
    { el: 0, label: "0° Horizon", dash: [] },
    { el: 5, label: "5°", dash: [3, 4] },
    { el: 15, label: "15°", dash: [3, 4] },
    { el: 45, label: "45°", dash: [3, 4] },
  ];

  ctx.save();
  for (const ring of rings) {
    const r = elToR(ring.el);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.setLineDash(ring.dash);
    ctx.strokeStyle = ring.el === 0 ? "rgba(148, 163, 184, 0.45)" : "rgba(148, 163, 184, 0.2)";
    ctx.lineWidth = ring.el === 0 ? 1.4 : 1;
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(ring.label, cx + 5, cy - r + 12);
  }
  ctx.restore();

  // Azimuth spokes every 30°
  for (let az = 0; az < 360; az += 30) {
    const outer = polarToXY(az, 0);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(outer.x, outer.y);
    ctx.strokeStyle = az % 90 === 0 ? "rgba(148, 163, 184, 0.28)" : "rgba(148, 163, 184, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Cardinal / Earth labels
  const cardinals = [
    { az: 0, text: "0° N (Toward Earth)" },
    { az: 90, text: "90° E" },
    { az: 180, text: "180° S (Far Side)" },
    { az: 270, text: "270° W" },
  ];
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 11px Inter, system-ui, sans-serif";
  for (const c of cardinals) {
    const pos = polarToXY(c.az, -9);
    ctx.textAlign = c.az === 90 ? "left" : c.az === 270 ? "right" : "center";
    ctx.textBaseline = c.az === 0 ? "bottom" : c.az === 180 ? "top" : "middle";
    ctx.fillText(c.text, pos.x, pos.y);
  }

  // LOLA Terrain Shadow Mask Polygon (rose-tinted outer ring down to horizon mask)
  const profile = site?.horizonProfile || [];
  if (profile.length > 0) {
    ctx.save();
    ctx.beginPath();
    // Outer boundary (0° horizon)
    ctx.arc(cx, cy, elToR(0), 0, Math.PI * 2, false);
    // Inner cutout (terrain elevation profile, wound counter-clockwise)
    for (let az = 360; az >= 0; az -= 3) {
      const maskEl = sampleHorizonProfile(profile, az);
      const pt = polarToXY(az, maskEl);
      if (az === 360) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(244, 63, 94, 0.22)";
    ctx.fill("evenodd");

    // Terrain rim outline
    ctx.beginPath();
    for (let az = 0; az <= 360; az += 3) {
      const maskEl = sampleHorizonProfile(profile, az);
      const pt = polarToXY(az, maskEl);
      if (az === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(251, 113, 133, 0.85)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  // 29.53-day Solar Track (Gold)
  ctx.save();
  ctx.beginPath();
  steps.forEach((s, idx) => {
    const pt = polarToXY(s.sunAzDeg, s.sunElDeg);
    if (idx === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.strokeStyle = "rgba(251, 191, 36, 0.72)";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // Earth Libration Figure-Eight Loop (Cyan)
  ctx.save();
  ctx.beginPath();
  steps.forEach((s, idx) => {
    const pt = polarToXY(s.earthAzDeg, s.earthElDeg);
    if (idx === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  });
  ctx.strokeStyle = "rgba(34, 211, 238, 0.78)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  // Active Sun Marker
  const sunPt = polarToXY(step.sunAzDeg, step.sunElDeg);
  drawBodyMarker(ctx, sunPt.x, sunPt.y, "#fbbf24", "rgba(251, 191, 36, 0.35)", step.isSunlit, "SUN");

  // Active Earth Marker
  const earthPt = polarToXY(step.earthAzDeg, step.earthElDeg);
  drawBodyMarker(ctx, earthPt.x, earthPt.y, "#22d3ee", "rgba(34, 211, 238, 0.35)", step.isEarthVisible, "EARTH");

  // Zenith crosshair
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(226, 232, 240, 0.5)";
  ctx.fill();

  // Header badge
  drawSkyplotHeader(ctx, width, site, step, "360° Polar Dome");
}

function drawLinearHorizon(ctx, width, height, cycleData, hourIdx) {
  const { site, steps } = cycleData;
  const step = steps[hourIdx];
  const pad = { top: 44, right: 24, bottom: 38, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const isPolar = Math.abs(site?.lat ?? -89) >= 75;
  const minEl = -10;
  const maxEl = isPolar ? 18 : 90;

  const azToX = (az) => pad.left + ((((az % 360) + 360) % 360) / 360) * plotW;
  const elToY = (el) => {
    const clamped = Math.max(minEl, Math.min(maxEl, el));
    return pad.top + ((maxEl - clamped) / (maxEl - minEl)) * plotH;
  };

  // Plot background
  ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
  ctx.fillRect(pad.left, pad.top, plotW, plotH);

  // Horizontal elevation gridlines
  const elTicks = isPolar ? [-10, -5, 0, 5, 10, 15] : [0, 15, 30, 45, 60, 75, 90];
  ctx.font = "11px JetBrains Mono, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (const el of elTicks) {
    const y = elToY(el);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.strokeStyle = el === 0 ? "rgba(148, 163, 184, 0.55)" : "rgba(148, 163, 184, 0.16)";
    ctx.lineWidth = el === 0 ? 1.4 : 1;
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${el}°`, pad.left - 8, y);
  }

  // Vertical azimuth gridlines
  const azTicks = [
    { az: 0, label: "0° N (Earth)" },
    { az: 90, label: "90° E" },
    { az: 180, label: "180° S" },
    { az: 270, label: "270° W" },
    { az: 360, label: "360° N" },
  ];
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const t of azTicks) {
    const x = pad.left + (t.az / 360) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + plotH);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(t.label, x, pad.top + plotH + 8);
  }

  // LOLA Terrain Shadow Mask Silhouette
  const profile = site?.horizonProfile || [];
  if (profile.length > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pad.left, elToY(minEl));
    for (let az = 0; az <= 360; az += 2) {
      const maskEl = sampleHorizonProfile(profile, az);
      const x = pad.left + (az / 360) * plotW;
      ctx.lineTo(x, elToY(maskEl));
    }
    ctx.lineTo(pad.left + plotW, elToY(minEl));
    ctx.closePath();
    ctx.fillStyle = "rgba(244, 63, 94, 0.24)";
    ctx.fill();

    // Rim stroke
    ctx.beginPath();
    for (let az = 0; az <= 360; az += 2) {
      const maskEl = sampleHorizonProfile(profile, az);
      const x = pad.left + (az / 360) * plotW;
      const y = elToY(maskEl);
      if (az === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(251, 113, 133, 0.9)";
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  // Solar Track (break line on 360° wrap-around)
  drawWrappedTrack(ctx, steps, (s) => s.sunAzDeg, (s) => s.sunElDeg, azToX, elToY, "rgba(251, 191, 36, 0.78)", 1.8);

  // Earth Libration Track
  drawWrappedTrack(ctx, steps, (s) => s.earthAzDeg, (s) => s.earthElDeg, azToX, elToY, "rgba(34, 211, 238, 0.8)", 1.6);

  // Active Markers
  drawBodyMarker(ctx, azToX(step.sunAzDeg), elToY(step.sunElDeg), "#fbbf24", "rgba(251, 191, 36, 0.35)", step.isSunlit, "SUN");
  drawBodyMarker(ctx, azToX(step.earthAzDeg), elToY(step.earthElDeg), "#22d3ee", "rgba(34, 211, 238, 0.35)", step.isEarthVisible, "EARTH");

  // Plot border
  ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.left, pad.top, plotW, plotH);

  drawSkyplotHeader(ctx, width, site, step, "Linear Horizon Panorama");
}

function drawWrappedTrack(ctx, steps, getAz, getEl, azToX, elToY, strokeStyle, lineWidth) {
  ctx.save();
  ctx.beginPath();
  let prevAz = null;
  steps.forEach((s, idx) => {
    const az = ((getAz(s) % 360) + 360) % 360;
    const x = azToX(az);
    const y = elToY(getEl(s));
    if (idx === 0 || (prevAz !== null && Math.abs(az - prevAz) > 180)) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    prevAz = az;
  });
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function drawBodyMarker(ctx, x, y, color, glowColor, isVisible, label) {
  ctx.save();
  // Outer glow
  ctx.beginPath();
  ctx.arc(x, y, isVisible ? 11 : 7, 0, Math.PI * 2);
  ctx.fillStyle = isVisible ? glowColor : "rgba(148, 163, 184, 0.15)";
  ctx.fill();

  // Core dot
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = isVisible ? color : "#64748b";
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Label
  ctx.fillStyle = isVisible ? "#f8fafc" : "#94a3b8";
  ctx.font = "600 10px JetBrains Mono, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(isVisible ? label : `${label} (OCCLUDED)`, x + 9, y);
  ctx.restore();
}

function drawSkyplotHeader(ctx, width, site, step, modeLabel) {
  ctx.save();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${site?.shortName || "Lunar Site"} — ${modeLabel}`, 14, 12);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px JetBrains Mono, monospace";
  ctx.textAlign = "right";
  ctx.fillText(
    `H+${step.hourOffset}h | Sun ${step.sunElDeg.toFixed(2)}° | Earth ${step.earthElDeg.toFixed(2)}°`,
    width - 14,
    12
  );
  ctx.restore();
}