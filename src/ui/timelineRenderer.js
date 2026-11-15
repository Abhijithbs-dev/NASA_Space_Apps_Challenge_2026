/**
 * SeleneSight — 708-Hour Synodic Power & DTE Comm Ribbon Chart & Scrubber
 * Owned by: Alfiya S (feat/alfiya-ui-visuals)
 *
 * Exports:
 *   renderTimelineChart(canvasElement, cycleData, currentHour, onScrubHourCallback)
 */

function setupHiDPICanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width || canvas.width || 720, 320);
  const height = Math.max(rect.height || canvas.height || 240, 180);
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
 * Renders the 708-hour synodic timeline with Sunlit/DTE ribbons, elevation curves,
 * LOLA terrain cutoff, and interactive click/drag scrubbing.
 *
 * @param {HTMLCanvasElement} canvasElement
 * @param {Object} cycleData - Output from ephemerisEngine.computeFullCycle()
 * @param {number} currentHour - Active hour index (0..708)
 * @param {Function} onScrubHourCallback - Called with integer hour when user clicks/drags
 */
export function renderTimelineChart(
  canvasElement,
  cycleData,
  currentHour = 0,
  onScrubHourCallback = null
) {
  if (!canvasElement) return;
  const { ctx, width, height } = setupHiDPICanvas(canvasElement);

  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, width, height);

  if (!cycleData || !Array.isArray(cycleData.steps) || cycleData.steps.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Timeline awaiting ephemeris cycle data...", width / 2, height / 2);
    return;
  }

  const steps = cycleData.steps;
  const maxHours = steps.length - 1;
  const hourIdx = Math.max(0, Math.min(Math.round(currentHour), maxHours));

  const pad = { top: 46, right: 20, bottom: 32, left: 46 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const isPolar = Math.abs(cycleData.site?.lat ?? -89) >= 75;
  const minEl = -8;
  const maxEl = isPolar ? 16 : 90;

  const hourToX = (h) => pad.left + (h / maxHours) * plotW;
  const elToY = (el) => {
    const clamped = Math.max(minEl, Math.min(maxEl, el));
    return pad.top + ((maxEl - clamped) / (maxEl - minEl)) * plotH;
  };

  // Status Ribbons above the elevation plot (Sunlit = Gold, DTE = Cyan)
  const ribbonY = 26;
  const ribbonH = 6;
  const sliceW = Math.max(1, plotW / steps.length + 0.5);

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const x = hourToX(i);

    if (s.isSunlit) {
      ctx.fillStyle = "rgba(251, 191, 36, 0.85)";
      ctx.fillRect(x, ribbonY, sliceW, ribbonH);
    } else {
      ctx.fillStyle = "rgba(51, 65, 85, 0.35)";
      ctx.fillRect(x, ribbonY, sliceW, ribbonH);
    }

    if (s.isEarthVisible) {
      ctx.fillStyle = "rgba(34, 211, 238, 0.85)";
      ctx.fillRect(x, ribbonY + ribbonH + 2, sliceW, ribbonH);
    } else {
      ctx.fillStyle = "rgba(51, 65, 85, 0.35)";
      ctx.fillRect(x, ribbonY + ribbonH + 2, sliceW, ribbonH);
    }
  }

  // Ribbon labels
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 9px JetBrains Mono, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("SUN", pad.left - 6, ribbonY + ribbonH / 2);
  ctx.fillText("DTE", pad.left - 6, ribbonY + ribbonH + 2 + ribbonH / 2);

  // Plot area backdrop
  ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
  ctx.fillRect(pad.left, pad.top, plotW, plotH);

  // Elevation gridlines
  const elTicks = isPolar ? [-5, 0, 5, 10, 15] : [0, 30, 60, 90];
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.textAlign = "right";
  for (const el of elTicks) {
    const y = elToY(el);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.strokeStyle = el === 0 ? "rgba(148, 163, 184, 0.45)" : "rgba(148, 163, 184, 0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${el}°`, pad.left - 6, y);
  }

  // Day ticks along X-axis (0d, 7d, 14d, 21d, 29.5d)
  const dayMarks = [0, 168, 336, 504, 708];
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const h of dayMarks) {
    if (h > maxHours) continue;
    const x = hourToX(h);
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + plotH);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
    ctx.stroke();

    const dayLabel = h === 708 ? "Day 29.5" : `Day ${Math.round(h / 24)}`;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(dayLabel, x, pad.top + plotH + 8);
  }

  // Dashed LOLA terrain cutoff line for Sun
  ctx.save();
  ctx.beginPath();
  steps.forEach((s, i) => {
    const x = hourToX(i);
    const y = elToY(s.sunHorizonMaskDeg ?? 0);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(251, 113, 133, 0.75)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // Sun Elevation Curve (Gold)
  ctx.beginPath();
  steps.forEach((s, i) => {
    const x = hourToX(i);
    const y = elToY(s.sunElDeg);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Earth Elevation Curve (Cyan)
  ctx.beginPath();
  steps.forEach((s, i) => {
    const x = hourToX(i);
    const y = elToY(s.earthElDeg);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Active Playhead Line
  const playX = hourToX(hourIdx);
  ctx.beginPath();
  ctx.moveTo(playX, ribbonY - 2);
  ctx.lineTo(playX, pad.top + plotH);
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Playhead handle
  ctx.beginPath();
  ctx.arc(playX, pad.top, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();

  // Header & Legend
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("708-Hour Synodic Power & Direct-to-Earth Timeline", pad.left, 6);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px JetBrains Mono, monospace";
  ctx.textAlign = "right";
  const curStep = steps[hourIdx];
  ctx.fillText(
    `Hour ${hourIdx}/${maxHours} (Day ${(hourIdx / 24).toFixed(1)}) | Eff: ${curStep.arrayEfficiency.toFixed(0)}%`,
    width - pad.right,
    6
  );

  // Store scrub geometry & attach click/drag scrubber once
  canvasElement._timelineGeom = { padLeft: pad.left, plotW, maxHours };
  canvasElement._onScrubHour = onScrubHourCallback;

  if (!canvasElement._timelineListenersAttached) {
    const scrubFromEvent = (e) => {
      const cb = canvasElement._onScrubHour;
      const geom = canvasElement._timelineGeom;
      if (!cb || !geom) return;
      const rect = canvasElement.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, (mx - geom.padLeft) / geom.plotW));
      cb(Math.round(ratio * geom.maxHours));
    };

    canvasElement.addEventListener("mousedown", (e) => {
      canvasElement._isScrubbing = true;
      scrubFromEvent(e);
    });
    window.addEventListener("mousemove", (e) => {
      if (canvasElement._isScrubbing) scrubFromEvent(e);
    });
    window.addEventListener("mouseup", () => {
      canvasElement._isScrubbing = false;
    });
    canvasElement.style.cursor = "ew-resize";
    canvasElement._timelineListenersAttached = true;
  }
}