/**
 * SeleneSight — South Polar Stereographic Map (90°S to 78°S) & Click Hitboxes
 * Owned by: Alfiya S (feat/alfiya-ui-visuals)
 *
 * Exports:
 *   renderPolarMap(canvasElement, activeSite, currentStep, allSites, onSelectSiteCallback)
 */

const DEG_TO_RAD = Math.PI / 180;
const MIN_LAT_EDGE = -78; // Outer boundary at 78°S (covers 80°S–90°S + buffer)

function setupHiDPICanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width || canvas.width || 420, 260);
  const height = Math.max(rect.height || canvas.height || 420, 260);
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
 * Projects selenographic (lat, lon) onto the South Polar Stereographic plane.
 * 0° East (toward Earth) is oriented at the top (12 o'clock) to match the skyplot.
 */
function projectSouthPole(lat, lon, cx, cy, maxRadius) {
  const colatDeg = Math.min(90 - Math.abs(MIN_LAT_EDGE), Math.max(0, 90 + lat));
  const r = (colatDeg / (90 - Math.abs(MIN_LAT_EDGE))) * maxRadius;
  const theta = (lon - 90) * DEG_TO_RAD;
  return {
    x: cx + r * Math.cos(theta),
    y: cy + r * Math.sin(theta),
    inBounds: lat <= MIN_LAT_EDGE,
  };
}

/**
 * Renders the South Polar Stereographic Map with sub-solar illumination shading
 * and interactive landing-site markers.
 *
 * @param {HTMLCanvasElement} canvasElement
 * @param {Object} activeSite
 * @param {Object} currentStep - Current hourly ephemeris step (contains subSolarLonDeg)
 * @param {Array<Object>} allSites - LANDING_SITES array
 * @param {Function} onSelectSiteCallback - Called with site.id when user clicks a marker
 */
export function renderPolarMap(
  canvasElement,
  activeSite,
  currentStep,
  allSites = [],
  onSelectSiteCallback = null
) {
  if (!canvasElement) return;
  const { ctx, width, height } = setupHiDPICanvas(canvasElement);

  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2 + 8;
  const maxRadius = Math.min(width, height) * 0.39;

  // Base lunar regolith disc
  ctx.beginPath();
  ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#111827";
  ctx.fill();

  // Dynamic sub-solar hemisphere illumination shading
  const subSolarLon = currentStep?.subSolarLonDeg ?? 0;
  const sunRad = (subSolarLon - 90) * DEG_TO_RAD;
  const sx = cx + maxRadius * 0.85 * Math.cos(sunRad);
  const sy = cy + maxRadius * 0.85 * Math.sin(sunRad);
  const nx = cx - maxRadius * 0.85 * Math.cos(sunRad);
  const ny = cy - maxRadius * 0.85 * Math.sin(sunRad);

  const illumGrad = ctx.createLinearGradient(sx, sy, nx, ny);
  illumGrad.addColorStop(0, "rgba(251, 191, 36, 0.24)");
  illumGrad.addColorStop(0.48, "rgba(148, 163, 184, 0.08)");
  illumGrad.addColorStop(0.55, "rgba(2, 6, 23, 0.55)");
  illumGrad.addColorStop(1, "rgba(2, 6, 23, 0.85)");

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = illumGrad;
  ctx.fillRect(cx - maxRadius, cy - maxRadius, maxRadius * 2, maxRadius * 2);
  ctx.restore();

  // Latitude rings: 85°S, 80°S, 78°S
  const latRings = [
    { lat: -85, label: "85°S", dash: [3, 4] },
    { lat: -80, label: "80°S", dash: [3, 4] },
    { lat: -78, label: "78°S", dash: [] },
  ];
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.textAlign = "left";
  for (const ring of latRings) {
    const pt = projectSouthPole(ring.lat, 0, cx, cy, maxRadius);
    const r = Math.hypot(pt.x - cx, pt.y - cy);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.setLineDash(ring.dash);
    ctx.strokeStyle = ring.lat === -78 ? "rgba(148, 163, 184, 0.45)" : "rgba(148, 163, 184, 0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.fillText(ring.label, cx + 4, cy - r + 11);
  }

  // Longitude spokes
  const lonSpokes = [
    { lon: 0, label: "0° (Earth)" },
    { lon: 90, label: "90°E" },
    { lon: 180, label: "180°" },
    { lon: -90, label: "90°W" },
  ];
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 10px Inter, system-ui, sans-serif";
  for (const s of lonSpokes) {
    const edge = projectSouthPole(MIN_LAT_EDGE, s.lon, cx, cy, maxRadius);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(edge.x, edge.y);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const lbl = projectSouthPole(MIN_LAT_EDGE + 1.4, s.lon, cx, cy, maxRadius);
    ctx.textAlign = s.lon === 90 ? "left" : s.lon === -90 ? "right" : "center";
    ctx.textBaseline = s.lon === 0 ? "bottom" : s.lon === 180 ? "top" : "middle";
    ctx.fillText(s.label, lbl.x, lbl.y);
  }

  // South Pole crosshair (90°S)
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();

  // Compute hitboxes & draw landing site markers
  const hitboxes = [];
  const sitesToDraw = Array.isArray(allSites) && allSites.length > 0 ? allSites : activeSite ? [activeSite] : [];

  for (const site of sitesToDraw) {
    if (site.lat > MIN_LAT_EDGE) continue; // Only plot sites within 78°S–90°S polar stereographic disc
    const pos = projectSouthPole(site.lat, site.lon, cx, cy, maxRadius);
    const isActive = activeSite && site.id === activeSite.id;

    hitboxes.push({ id: site.id, x: pos.x, y: pos.y, r: isActive ? 14 : 11 });

    if (isActive) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 211, 238, 0.22)";
      ctx.fill();
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, isActive ? 5 : 3.8, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? "#22d3ee" : "#fbbf24";
    ctx.fill();
    ctx.strokeStyle = "#070b14";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (isActive) {
      ctx.fillStyle = "#f8fafc";
      ctx.font = "600 11px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(site.shortName || site.name, pos.x + 12, pos.y);
    }
  }

  // Note if active site is outside the 78°S–90°S polar map (e.g., Chandrayaan-3 or Apollo)
  if (activeSite && activeSite.lat > MIN_LAT_EDGE) {
    ctx.fillStyle = "rgba(251, 191, 36, 0.9)";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `Active site (${activeSite.shortName}: ${activeSite.lat.toFixed(2)}°) is north of 78°S`,
      cx,
      height - 14
    );
  }

  // Header
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("South Polar Stereographic Map (78°S–90°S)", 14, 12);

  // Store hitboxes and wire up click + hover handlers once
  canvasElement._polarHitboxes = hitboxes;
  canvasElement._onSelectSite = onSelectSiteCallback;

  if (!canvasElement._polarListenersAttached) {
    canvasElement.addEventListener("click", (e) => {
      const cb = canvasElement._onSelectSite;
      const boxes = canvasElement._polarHitboxes || [];
      if (!cb || boxes.length === 0) return;

      const rect = canvasElement.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const box of boxes) {
        if (Math.hypot(mx - box.x, my - box.y) <= box.r) {
          cb(box.id);
          break;
        }
      }
    });

    canvasElement.addEventListener("mousemove", (e) => {
      const boxes = canvasElement._polarHitboxes || [];
      const rect = canvasElement.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hovering = boxes.some((b) => Math.hypot(mx - b.x, my - b.y) <= b.r);
      canvasElement.style.cursor = hovering ? "pointer" : "default";
    });

    canvasElement._polarListenersAttached = true;
  }
}