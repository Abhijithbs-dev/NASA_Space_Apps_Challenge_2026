/**
 * @fileoverview Tier 4 Real-World Application Scenarios Test Suite for SeleneSight.
 * Realistic NASA Artemis III & CLPS mission application workload scenarios:
 * - Scenario 1: Artemis III Crewed Landing at Shackleton Rim Primary
 * - Scenario 2: Artemis High-Altitude Communications Relay at Malapert Massif Summit
 * - Scenario 3: NASA CLPS IM-2 Polar Rover Traverse at Mons Mouton Plateau
 * - Scenario 4: Autonomous Rover Transit Corridor at Connecting Ridge South
 * - Scenario 5: Multi-Site Artemis Candidate Trade-Off Comparison
 * - Scenario 6: Mission Telemetry Export Pipeline for NASA Ground Segment
 * - Scenario 7: Seasonal Mission Timing Optimization (Summer vs Winter Solstice)
 * - Scenario 8: Long-Duration Rover Battery Depletion & Shadow Survival Simulation
 * - Scenario 9: Optical Libration Extreme Drift & DTE Link Margin Verification
 * - Scenario 10: Multi-Speed Playback Telemetry Scrubbing During Critical EVA Window
 * - Scenario 11: Multi-Site Artemis Candidate Matrix Viability Ranking
 * - Scenario 12: Emergency Relocation & Solar Array Reconfiguration
 * - Scenario 13: High-Latitude Far-Side Telemetry Baseline & Relay Requirement
 *
 * Adheres strictly to zero external npm dependencies and opaque-box verification.
 */

import {
  describe, test, beforeEach, afterEach,
  assert, assertFalse,
  assertEqual, assertNotEqual, assertDeepEqual,
  assertApproxEqual,
  assertGreaterThan, assertGreaterThanOrEqual,
  assertLessThan, assertLessThanOrEqual,
  assertBetween,
  assertThrows,
  assertIncludes, assertMatch,
  assertDefined, assertUndefined,
  assertNull, assertNotNull,
} from './testHarness.js';

import { EphemerisEngine, ephemerisEngine } from '../src/core/ephemerisEngine.js';
import { InterfaceContract, STEP_SCHEMA_KEYS, SUMMARY_SCHEMA_KEYS } from '../src/core/interfaceContract.js';
import { AppStateStore, appState } from '../src/core/appState.js';

// ============================================================================
// SCENARIO 1: Artemis III Crewed Landing at Shackleton Rim Primary
// ============================================================================
describe('Tier 4: Scenario 1 - Artemis III Crewed Landing at Shackleton Rim Primary', () => {
  let engine;
  let shackletonSite;

  beforeEach(() => {
    engine = new EphemerisEngine();
    shackletonSite = InterfaceContract.getMockSite();
  });

  test('executes 708-hour synodic surface evaluation with continuous grazing polar sunlight', () => {
    // Mission Epoch: 2026-11-14, Vertical Mast array (optimized for polar grazing sunlight)
    const cycle = engine.computeFullCycle(shackletonSite, '2026-11-14', 'vertical_mast');

    // 1. Schema & Step Count Verification
    assert(InterfaceContract.validateCycleData(cycle), 'Cycle must pass InterfaceContract validation');
    assertEqual(cycle.steps.length, 709, 'Must generate exactly 709 hourly steps (h in [0, 708])');

    // 2. Continuous Polar Sunlight Verification
    assertEqual(cycle.sunlitHours, 709, 'Shackleton Rim must achieve 100% continuous illumination at this epoch');
    assertEqual(cycle.sunlitPct, 100.0, 'Sunlit percentage must be exactly 100.0%');

    // 3. Grazing Polar Solar Elevation Verification
    // Solar elevation on mean sphere is low (< 1.8 deg); with 2100m elevation dip (~2.81 deg),
    // topocentric elevation ranges between ~1.2 deg and ~2.8 deg.
    for (const step of cycle.steps) {
      assert(step.isSunlit, `Step ${step.hourOffset} must be sunlit`);
      assertGreaterThan(step.sunElDeg, step.sunHorizonMaskDeg,
        `Sun elevation must clear LOLA crater rim mask at step ${step.hourOffset}`);
      assertBetween(step.sunElDeg, 1.0, 3.5,
        `Sun elevation should remain within grazing bounds [1.0, 3.5] deg on Shackleton Rim`);
    }

    // 4. Vertical Mast Solar Array Efficiency & Power Yield
    // cos(El) for El in [1.2, 2.8] deg yields efficiency ~ 99.88% - 99.98%
    assertEqual(cycle.avgPowerEff, 99.9, 'Average vertical mast efficiency must round to 99.9%');
    for (const step of cycle.steps) {
      assertApproxEqual(step.arrayEfficiency, 99.9, 0.2, 'Vertical mast efficiency must remain ~99.9%');
      assertApproxEqual(step.solarFluxWm2, 1359.6, 2.5, 'Solar flux must remain ~1359.6 W/m2');
    }

    // 5. Direct-to-Earth (DTE) Communication Windows
    // Earth visibility is governed by draconic libration (653.09h cycle)
    assertEqual(cycle.dteHours, 388, 'Shackleton Rim DTE hours must equal 388 hours');
    assertEqual(cycle.dtePct, 54.7, 'DTE percentage must be 54.7%');
    assertEqual(cycle.dualHours, 388, 'Dual sunlit + DTE hours must equal 388 hours');

    // 6. Multi-Criteria Site Viability Score
    // 0.45 * 100 + 0.35 * 54.7 + 0.20 * (100 - 8.5*5 = 57.5) = 45 + 19.145 + 11.5 = 75.645 -> 76
    assertEqual(cycle.viabilityScore, 76, 'Shackleton Rim viability score must be 76');
  });
});

// ============================================================================
// SCENARIO 2: Artemis High-Altitude Communications Relay at Malapert Massif
// ============================================================================
describe('Tier 4: Scenario 2 - Artemis Communications Relay at Malapert Massif Summit', () => {
  let engine;
  let malapertSite;

  beforeEach(() => {
    engine = new EphemerisEngine();
    malapertSite = InterfaceContract.getMockSites().find(s => s.id === 'malapert_massif_summit');
  });

  test('validates 4,800m summit elevation dip advantage and 100% continuous Earth visibility', () => {
    // 2-axis tracking array to maximize power harvest during sunlit periods
    const cycle = engine.computeFullCycle(malapertSite, '2026-11-14', 'sun_tracking');

    assert(InterfaceContract.validateCycleData(cycle));
    assertEqual(cycle.site.elevM, 4800, 'Malapert Massif elevation must be 4800m');

    // 1. Continuous Earth Visibility (100% DTE Lock)
    assertEqual(cycle.dteHours, 709, 'Malapert Massif summit must provide 709 hours (100%) continuous DTE lock');
    assertEqual(cycle.dtePct, 100.0);

    // Verify Earth elevation strictly clears horizon mask across all 709 steps
    for (const step of cycle.steps) {
      assert(step.isEarthVisible, `Earth must be visible at step ${step.hourOffset}`);
      assertGreaterThan(step.earthElDeg, step.earthHorizonMaskDeg,
        `Earth elevation must clear horizon mask at step ${step.hourOffset}`);
    }

    // 2. Elevation Dip Contribution
    // delta_elev = sqrt(2 * 4.8 / 1737.4) * (180/pi) ~ 4.25 degrees
    const topoHigh = engine.calculateTopocentric(malapertSite.lat, malapertSite.lon, malapertSite.elevM, 0, 0);
    const topoSea = engine.calculateTopocentric(malapertSite.lat, malapertSite.lon, 0, 0, 0);
    assertApproxEqual(topoHigh.elevDeg - topoSea.elevDeg, 4.25, 0.05,
      'Observer elevation dip allowance at 4800m must equal ~4.25 degrees');

    // 3. Solar Power Generation & Terrain Shadow Periods
    assertEqual(cycle.sunlitHours, 467, 'Malapert Massif must have 467 sunlit hours');
    assertEqual(cycle.sunlitPct, 65.9);
    assertEqual(cycle.dualHours, 467, 'Dual hours must equal sunlit hours since DTE is 100%');

    // Tracking array delivers 100% efficiency (1361 W/m2) when sunlit, 0 when shadowed
    for (const step of cycle.steps) {
      if (step.isSunlit) {
        assertEqual(step.arrayEfficiency, 100.0);
        assertEqual(step.solarFluxWm2, 1361.0);
      } else {
        assertEqual(step.arrayEfficiency, 0.0);
        assertEqual(step.solarFluxWm2, 0.0);
      }
    }

    // 4. Steep Terrain Slope Penalty
    // Slope: 12.4 deg -> slopePenalty = max(0, 100 - 12.4*5) = 38.0
    // Viability = round(65.9 * 0.45 + 100 * 0.35 + 38.0 * 0.20) = round(29.655 + 35.0 + 7.6) = round(72.255) = 72
    assertEqual(cycle.viabilityScore, 72, 'Malapert Massif viability score must be 72');
  });
});

// ============================================================================
// SCENARIO 3: NASA CLPS IM-2 Polar Rover Traverse at Mons Mouton Plateau
// ============================================================================
describe('Tier 4: Scenario 3 - NASA CLPS IM-2 Polar Rover Traverse at Mons Mouton Plateau', () => {
  let engine;
  let moutonSite;

  beforeEach(() => {
    engine = new EphemerisEngine();
    moutonSite = InterfaceContract.getMockSites().find(s => s.id === 'mons_mouton_plateau');
  });

  test('evaluates rover trafficability on gentle 6.2 deg slope and compares 3 solar array configurations', () => {
    assertEqual(moutonSite.slopeDeg, 6.2, 'Mons Mouton slope must be 6.2 degrees');
    assertEqual(moutonSite.elevM, 5400, 'Mons Mouton elevation must be 5400m');

    // 1. Terrain Trafficability: Low slope yields high safety score
    const slopePenalty = Math.max(0.0, 100.0 - (moutonSite.slopeDeg * 5.0));
    assertEqual(slopePenalty, 69.0, 'Slope score must be 69.0 for gentle 6.2 deg terrain');

    // 2. Solar Array Trade Study
    const vertCycle = engine.computeFullCycle(moutonSite, '2026-11-14', 'vertical_mast');
    const trackCycle = engine.computeFullCycle(moutonSite, '2026-11-14', 'sun_tracking');
    const horizCycle = engine.computeFullCycle(moutonSite, '2026-11-14', 'horizontal_deck');

    // All array types observe identical sunlit and DTE hours
    assertEqual(vertCycle.sunlitHours, 521, 'Mons Mouton has 521 sunlit hours');
    assertEqual(trackCycle.sunlitHours, 521);
    assertEqual(horizCycle.sunlitHours, 521);
    assertEqual(vertCycle.dteHours, 709, 'Mons Mouton has 100% continuous DTE lock');

    // Array power efficiency comparison: tracking (73.5%) >= vertical mast (73.1%) >> horizontal deck (6.6%)
    assertEqual(trackCycle.avgPowerEff, 73.5, 'Tracking array yields 73.5% average efficiency');
    assertEqual(vertCycle.avgPowerEff, 73.1, 'Vertical mast yields 73.1% average efficiency');
    assertEqual(horizCycle.avgPowerEff, 6.6, 'Horizontal deck yields 6.6% average efficiency due to low polar angle');
    assertGreaterThan(vertCycle.avgPowerEff, horizCycle.avgPowerEff * 10.0,
      'Vertical mast must exceed horizontal deck by over 10x on Mons Mouton');

    // 3. Highest Overall Viability Score among canonical sites
    // 0.45 * 73.5 + 0.35 * 100.0 + 0.20 * 69.0 = 33.075 + 35.0 + 13.8 = 81.875 -> 82
    assertEqual(vertCycle.viabilityScore, 82, 'Mons Mouton achieves viability score of 82');
    assertEqual(trackCycle.viabilityScore, 82);
  });
});

// ============================================================================
// SCENARIO 4: Autonomous Rover Transit Corridor at Connecting Ridge South
// ============================================================================
describe('Tier 4: Scenario 4 - Autonomous Rover Transit Corridor at Connecting Ridge South', () => {
  let engine;
  let connSite;

  beforeEach(() => {
    engine = new EphemerisEngine();
    connSite = InterfaceContract.getMockSites().find(s => s.id === 'connecting_ridge_south');
  });

  test('validates safe traverse operational windows and continuous dual-lock segments', () => {
    const cycle = engine.computeFullCycle(connSite, '2026-11-14', 'vertical_mast');

    // 1. Continuous Illumination Corridor
    assertEqual(cycle.sunlitHours, 709, 'Connecting Ridge South provides 100% continuous sunlight');
    assertEqual(cycle.sunlitPct, 100.0);

    // 2. DTE Operational Communication Windows
    assertEqual(cycle.dteHours, 403, 'Connecting Ridge South provides 403 DTE hours');
    assertEqual(cycle.dtePct, 56.8);
    assertEqual(cycle.dualHours, 403, 'Dual hours equals 403 hours');

    // 3. Transit Window Analysis: Identify longest continuous dual-window segment
    let currentSegment = 0;
    let maxSegment = 0;
    for (const step of cycle.steps) {
      if (step.isSunlit && step.isEarthVisible) {
        currentSegment++;
        if (currentSegment > maxSegment) maxSegment = currentSegment;
      } else {
        currentSegment = 0;
      }
    }
    assertGreaterThan(maxSegment, 300, 'Longest continuous traverse window must exceed 300 hours');

    // 4. Forward Countdown Predictions
    // During perpetual sunlight, nextSunset is null
    const countdown = engine.getTransitionCountdowns(cycle.steps, 0);
    assertNull(countdown.nextSunset, 'Continuous sunlight yields null nextSunset');

    // Next earthset transition countdown
    if (cycle.steps[0].isEarthVisible) {
      assertNotNull(countdown.nextEarthset, 'Must predict upcoming earthset transition');
      assertBetween(countdown.nextEarthset, 1, 708);
    } else {
      assertNotNull(countdown.nextEarthrise, 'Must predict upcoming earthrise transition');
      assertBetween(countdown.nextEarthrise, 1, 708);
    }
  });
});

// ============================================================================
// SCENARIO 5: Multi-Site Artemis Candidate Selection Trade Study
// ============================================================================
describe('Tier 4: Scenario 5 - Multi-Site Artemis Candidate Selection Trade Study', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('evaluates side-by-side trade-offs between Shackleton Ridge and Malapert Massif', () => {
    // Set Scenario A: Shackleton Crater Connecting Ridge
    store.selectSiteA('shackleton_rim_primary');
    // Set Scenario B: Malapert Massif Summit
    store.selectSiteB('malapert_massif_summit');

    const delta = store.computeScenarioDelta();
    assertNotNull(delta, 'Scenario delta must be computed');

    // Verify delta metrics (Scenario B minus Scenario A):
    // Malapert sunlit (467) - Shackleton sunlit (709) = -242 hours
    assertEqual(delta.sunlitHoursDelta, -242, 'Malapert has 242 fewer sunlit hours than Shackleton');

    // Malapert DTE (709) - Shackleton DTE (388) = +321 hours
    assertEqual(delta.dteHoursDelta, 321, 'Malapert has 321 more DTE hours than Shackleton');

    // Malapert dual (467) - Shackleton dual (388) = +79 hours
    assertEqual(delta.dualHoursDelta, 79, 'Malapert has 79 more dual-coverage hours');

    // Malapert elev (4800m) - Shackleton elev (2100m) = +2700 meters
    assertEqual(delta.elevMDelta, 2700, 'Elevation delta must be exactly +2700m');

    // Malapert slope (12.4 deg) - Shackleton slope (8.5 deg) = +3.9 degrees
    assertApproxEqual(delta.slopeDelta, 3.9, 0.05, 'Slope delta must be +3.9 degrees');

    // Malapert viability (72) - Shackleton viability (76) = -4 points
    assertEqual(delta.viabilityScoreDelta, -4, 'Viability score delta must be -4 points');
  });
});

// ============================================================================
// SCENARIO 6: Mission Telemetry Export Pipeline for NASA Ground Segment
// ============================================================================
describe('Tier 4: Scenario 6 - Mission Telemetry Export Pipeline for NASA Ground Segment', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('validates JPL Horizons-compatible CSV export and lossless JSON round-trip serialization', () => {
    store.setActiveSite('shackleton_rim_primary');

    // 1. CSV Export Validation
    const csvData = store.exportToCSV();
    assert(typeof csvData === 'string' && csvData.length > 0, 'CSV export must return non-empty string');

    const lines = csvData.trim().split('\n');
    assertEqual(lines.length, 710, 'CSV must contain exactly 1 header line + 709 data rows');

    const header = lines[0];
    const expectedHeaders = [
      'Hour_Offset', 'Sun_Az_Deg', 'Sun_El_Deg', 'Sun_Mask_Deg', 'Is_Sunlit',
      'Earth_Az_Deg', 'Earth_El_Deg', 'Earth_Mask_Deg', 'Is_DTE',
      'Lib_Lat_Deg', 'Lib_Lon_Deg', 'Array_Eff_Pct', 'Solar_Flux_Wm2',
    ];
    assertEqual(header, expectedHeaders.join(','), 'CSV headers must conform to JPL Horizons schema');

    // Inspect individual CSV rows
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      assertEqual(cols.length, 13, `Line ${i} must contain 13 columns`);

      const hourOffset = Number(cols[0]);
      assertEqual(hourOffset, i - 1, `Hour offset in line ${i} must match row index`);

      const sunAz = Number(cols[1]);
      assertBetween(sunAz, 0.0, 359.99, `Sun Az in line ${i} must be within [0, 360)`);

      const isSunlit = cols[4];
      assert(isSunlit === '1' || isSunlit === '0', 'isSunlit flag must be 1 or 0');

      const isDte = cols[8];
      assert(isDte === '1' || isDte === '0', 'isDte flag must be 1 or 0');

      const flux = Number(cols[12]);
      assertGreaterThanOrEqual(flux, 0.0, 'Solar flux must be non-negative');
    }

    // 2. JSON Export & Schema Round-Trip Validation
    const jsonStr = store.exportToJSON();
    assert(typeof jsonStr === 'string' && jsonStr.length > 0);

    const parsed = JSON.parse(jsonStr);
    assert(InterfaceContract.validateCycleData(parsed), 'Parsed JSON must pass schema validation');
    assertEqual(parsed.site.id, 'shackleton_rim_primary');
    assertEqual(parsed.steps.length, 709);
    assertEqual(parsed.sunlitHours, 709);
    assertEqual(parsed.dteHours, 388);
  });
});

// ============================================================================
// SCENARIO 7: Seasonal Mission Timing (Summer vs Winter Solstice)
// ============================================================================
describe('Tier 4: Scenario 7 - Seasonal Mission Timing Optimization', () => {
  let engine;
  let site;

  beforeEach(() => {
    engine = new EphemerisEngine();
    site = InterfaceContract.getMockSite(); // Shackleton Rim
  });

  test('demonstrates southern summer solstice provides superior solar illumination over winter solstice', () => {
    // Southern Summer Solstice: 2026-03-20
    const summer = engine.computeFullCycle(site, '2026-03-20', 'vertical_mast');
    // Southern Winter Solstice: 2026-09-22
    const winter = engine.computeFullCycle(site, '2026-09-22', 'vertical_mast');

    // 1. Sunlit Hours Comparison
    assertEqual(summer.sunlitHours, 709, 'Summer solstice provides 100% continuous illumination (709 hrs)');
    assertEqual(winter.sunlitHours, 486, 'Winter solstice provides only 486 sunlit hours due to crater rim occlusion');
    assertGreaterThan(summer.sunlitHours - winter.sunlitHours, 200,
      'Summer delivers over 200 additional hours of solar power');

    // 2. Solar Elevation Extrema
    const summerMinEl = Math.min(...summer.steps.map(s => s.sunElDeg));
    const summerMaxEl = Math.max(...summer.steps.map(s => s.sunElDeg));
    const winterMinEl = Math.min(...winter.steps.map(s => s.sunElDeg));
    const winterMaxEl = Math.max(...winter.steps.map(s => s.sunElDeg));

    assertGreaterThan(summerMinEl, winterMinEl, 'Summer minimum sun elevation must exceed winter minimum');
    assertGreaterThan(summerMaxEl, winterMaxEl, 'Summer maximum sun elevation must exceed winter maximum');

    // 3. Total Synodic Solar Energy Harvest Deficit
    const summerEnergyWm2Hr = summer.steps.reduce((acc, s) => acc + s.solarFluxWm2, 0);
    const winterEnergyWm2Hr = winter.steps.reduce((acc, s) => acc + s.solarFluxWm2, 0);
    assertGreaterThan(summerEnergyWm2Hr, winterEnergyWm2Hr * 1.4,
      'Summer mission window must generate at least 40% more total photovoltaic energy than winter');
  });
});

// ============================================================================
// SCENARIO 8: Rover Battery Depletion & Shadow Survival Simulation
// ============================================================================
describe('Tier 4: Scenario 8 - Rover Battery Depletion & Shadow Survival Simulation', () => {
  let engine;
  let site;

  beforeEach(() => {
    engine = new EphemerisEngine();
    site = InterfaceContract.getMockSite();
  });

  test('tracks shadow onset and verifies countdown predictions for rover battery survival sizing', () => {
    // In winter cycle (2026-09-22), Shackleton experiences shadow intervals
    const winter = engine.computeFullCycle(site, '2026-09-22', 'vertical_mast');

    // Find the first sunset transition
    let sunsetHour = -1;
    for (let h = 0; h < 708; h++) {
      if (winter.steps[h].isSunlit && !winter.steps[h + 1].isSunlit) {
        sunsetHour = h;
        break;
      }
    }
    assertGreaterThan(sunsetHour, 0, 'Must find a sunset transition in winter cycle');

    // At sunsetHour, the sun is still visible; at sunsetHour + 1, it enters shadow
    assert(winter.steps[sunsetHour].isSunlit);
    assertFalse(winter.steps[sunsetHour + 1].isSunlit);

    // Verify solar flux drops to 0.0 W/m2 in shadow
    assertEqual(winter.steps[sunsetHour + 1].solarFluxWm2, 0.0);
    assertEqual(winter.steps[sunsetHour + 1].arrayEfficiency, 0.0);

    // Forward countdown at sunsetHour: nextSunset is 1, nextSunrise predicts exact darkness duration
    const countdown = engine.getTransitionCountdowns(winter.steps, sunsetHour);
    assertEqual(countdown.nextSunset, 1, 'Next sunset occurs in 1 hour');
    assertNotNull(countdown.nextSunrise, 'Must predict next sunrise');

    // Verify that the shadow continues for exactly nextSunrise - 1 hours
    const shadowDuration = countdown.nextSunrise - 1;
    assertGreaterThan(shadowDuration, 10, 'Shadow duration must be multi-hour');

    for (let dh = 1; dh <= shadowDuration; dh++) {
      const h = sunsetHour + dh;
      assertFalse(winter.steps[h].isSunlit, `Step ${h} must remain in darkness`);
      assertEqual(winter.steps[h].solarFluxWm2, 0.0);
    }

    // Immediately upon next sunrise, step must become sunlit
    const sunriseStep = sunsetHour + countdown.nextSunrise;
    assert(winter.steps[sunriseStep].isSunlit, `Step ${sunriseStep} must be illuminated`);
    assertGreaterThan(winter.steps[sunriseStep].solarFluxWm2, 1000.0);
  });
});

// ============================================================================
// SCENARIO 9: Optical Libration Extreme Drift & DTE Link Margin Verification
// ============================================================================
describe('Tier 4: Scenario 9 - Optical Libration Extreme Drift & DTE Link Margin Verification', () => {
  let engine;
  let site;

  beforeEach(() => {
    engine = new EphemerisEngine();
    site = InterfaceContract.getMockSite();
  });

  test('verifies Earth vector wobble limits and identifies link margin clearance windows', () => {
    const cycle = engine.computeFullCycle(site, '2026-11-14', 'vertical_mast');

    let minEarthEl = 90;
    let maxEarthEl = -90;
    let minLibLat = 90;
    let maxLibLat = -90;
    let minLibLon = 90;
    let maxLibLon = -90;

    for (const step of cycle.steps) {
      if (step.earthElDeg < minEarthEl) minEarthEl = step.earthElDeg;
      if (step.earthElDeg > maxEarthEl) maxEarthEl = step.earthElDeg;
      if (step.libLatDeg < minLibLat) minLibLat = step.libLatDeg;
      if (step.libLatDeg > maxLibLat) maxLibLat = step.libLatDeg;
      if (step.libLonDeg < minLibLon) minLibLon = step.libLonDeg;
      if (step.libLonDeg > maxLibLon) maxLibLon = step.libLonDeg;
    }

    // Astronomical libration amplitude verification
    assertApproxEqual(maxLibLat, 6.68, 0.05, 'Draconic latitudinal wobble upper bound must reach +6.68 deg');
    assertApproxEqual(minLibLat, -6.68, 0.05, 'Draconic latitudinal wobble lower bound must reach -6.68 deg');
    assertApproxEqual(maxLibLon, 7.90, 0.05, 'Anomalistic longitudinal wobble upper bound must reach +7.90 deg');
    assertApproxEqual(minLibLon, -7.90, 0.05, 'Anomalistic longitudinal wobble lower bound must reach -7.90 deg');

    // Earth elevation bounds at Shackleton Rim
    assertBetween(minEarthEl, -5.0, 0.5, 'Minimum Earth elevation must dip near or below horizon');
    assertBetween(maxEarthEl, 7.0, 11.0, 'Maximum Earth elevation must peak at ~9 degrees');

    // Link Margin: Find steps where Earth is visible with < 1.0 deg margin (grazing horizon)
    let lowMarginCount = 0;
    for (const step of cycle.steps) {
      if (step.isEarthVisible) {
        const margin = step.earthElDeg - step.earthHorizonMaskDeg;
        if (margin > 0.0 && margin < 1.0) {
          lowMarginCount++;
        }
      }
    }
    assertGreaterThan(lowMarginCount, 0, 'Must identify critical link margin steps near horizon mask');
  });
});

// ============================================================================
// SCENARIO 10: Multi-Speed Playback Telemetry Scrubbing During EVA Window
// ============================================================================
describe('Tier 4: Scenario 10 - Multi-Speed Playback Telemetry Scrubbing During EVA Window', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  afterEach(() => {
    if (store && store.isPlaying) {
      store.pause();
    }
  });

  test('simulates flight controller timeline scrubbing across 1x, 3x, and 6x playback during EVA', () => {
    // EVA scheduled between hours 350 and 358 (inside the 307-673 continuous dual illumination + DTE window)
    store.setHour(350);
    assertEqual(store.currentHour, 350);

    const step350 = store.cycleData.steps[350];
    assert(step350.isSunlit, 'EVA start hour must be sunlit');
    assert(step350.isEarthVisible, 'EVA start hour must have DTE comm lock');

    // Track reactive hour updates
    const hoursVisited = [];
    const hourListener = (e) => {
      hoursVisited.push(e.detail.currentHour);
    };
    store.addEventListener('hourChanged', hourListener);

    // Scrub sequentially through EVA window
    for (let h = 351; h <= 358; h++) {
      store.setHour(h);
      assertEqual(store.currentHour, h);
    }

    assertEqual(hoursVisited.length, 8, 'Must dispatch exactly 8 hourChanged events');
    assertEqual(hoursVisited[0], 351);
    assertEqual(hoursVisited[7], 358);

    // Test playback speed configuration
    for (const speed of [1, 3, 6]) {
      let speedDispatched = null;
      const speedListener = (e) => { speedDispatched = e.detail.playSpeed; };
      store.addEventListener('speedChanged', speedListener);

      store.setPlaybackSpeed(speed);
      assertEqual(store.playSpeed, speed);
      assertEqual(speedDispatched, speed);

      store.removeEventListener('speedChanged', speedListener);
    }

    store.removeEventListener('hourChanged', hourListener);
  });
});

// ============================================================================
// SCENARIO 11: Multi-Site Artemis Candidate Matrix Viability Ranking
// ============================================================================
describe('Tier 4: Scenario 11 - Multi-Site Artemis Candidate Matrix Viability Ranking', () => {
  let engine;
  let sites;

  beforeEach(() => {
    engine = new EphemerisEngine();
    sites = InterfaceContract.getMockSites();
  });

  test('ranks all 4 candidate sites by multi-criteria viability score under identical mission parameters', () => {
    const scoredSites = sites.map(site => {
      const cycle = engine.computeFullCycle(site, '2026-11-14', 'vertical_mast');
      return {
        id: site.id,
        name: site.name,
        viabilityScore: cycle.viabilityScore,
        sunlitPct: cycle.sunlitPct,
        dtePct: cycle.dtePct,
        slopeDeg: site.slopeDeg,
      };
    });

    // Sort descending by viability score
    scoredSites.sort((a, b) => b.viabilityScore - a.viabilityScore);

    // Mons Mouton Plateau should rank #1 due to combination of high DTE (100%) and very gentle slope (6.2 deg)
    assertEqual(scoredSites[0].id, 'mons_mouton_plateau', '#1 candidate must be Mons Mouton Plateau');
    assertEqual(scoredSites[0].viabilityScore, 82);

    // Connecting Ridge South ranks #2
    assertEqual(scoredSites[1].id, 'connecting_ridge_south', '#2 candidate must be Connecting Ridge South');
    assertEqual(scoredSites[1].viabilityScore, 77);

    // Shackleton Rim Primary ranks #3
    assertEqual(scoredSites[2].id, 'shackleton_rim_primary', '#3 candidate must be Shackleton Rim');
    assertEqual(scoredSites[2].viabilityScore, 76);

    // Malapert Massif Summit ranks #4 due to slope penalty (12.4 deg) despite 100% DTE
    assertEqual(scoredSites[3].id, 'malapert_massif_summit', '#4 candidate must be Malapert Massif');
    assertEqual(scoredSites[3].viabilityScore, 72);
  });
});

// ============================================================================
// SCENARIO 12: Emergency Relocation & Solar Array Reconfiguration
// ============================================================================
describe('Tier 4: Scenario 12 - Emergency Relocation & Solar Array Reconfiguration', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('simulates solar tracking drive failure requiring instant switch to fixed vertical mast', () => {
    store.setActiveSite('mons_mouton_plateau');
    store.setArrayType('sun_tracking');
    store.setHour(250);

    assertEqual(store.arrayType, 'sun_tracking');
    assertEqual(store.currentHour, 250);

    const trackingEff = store.cycleData.steps[250].arrayEfficiency;
    const trackingFlux = store.cycleData.steps[250].solarFluxWm2;
    assertEqual(trackingEff, 100.0);
    assertEqual(trackingFlux, 1361.0);

    // Emergency reconfiguration event: tracking drive failure -> switch to vertical_mast
    let cycleUpdated = false;
    store.addEventListener('cycleChanged', () => { cycleUpdated = true; });

    store.setArrayType('vertical_mast');
    assert(cycleUpdated, 'cycleChanged event must be dispatched');
    assertEqual(store.arrayType, 'vertical_mast');
    assertEqual(store.currentHour, 250, 'Current hour index must be preserved');

    // Flux updates to vertical mast projection: 1361 * cos(sunEl)
    const vertEff = store.cycleData.steps[250].arrayEfficiency;
    const vertFlux = store.cycleData.steps[250].solarFluxWm2;
    assertBetween(vertEff, 95.0, 100.0);
    assertBetween(vertFlux, 1300.0, 1361.0);
    assert(InterfaceContract.validateCycleData(store.cycleData), 'Recomputed cycle must remain schema valid');
  });
});

// ============================================================================
// SCENARIO 13: High-Latitude Far-Side Telemetry Baseline & Relay Requirement
// ============================================================================
describe('Tier 4: Scenario 13 - High-Latitude Far-Side Telemetry Baseline & Relay Requirement', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('validates lunar far-side site produces 0% DTE coverage, proving orbital relay requirement', () => {
    // Synthetic candidate site in the South Pole-Aitken (SPA) far-side basin: lat = -80.0, lon = 180.0
    const farSideSite = {
      id: 'synth_far_side_spa',
      name: 'South Pole-Aitken Deep Basin',
      shortName: 'Far Side SPA',
      program: 'Autonomous Far Side Science',
      lat: -80.0,
      lon: 180.0,
      elevM: 0,
      slopeDeg: 4.0,
      psrDistKm: 5.0,
      horizonProfile: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    };

    assert(InterfaceContract.validateSite(farSideSite));

    const cycle = engine.computeFullCycle(farSideSite, '2026-11-14', 'vertical_mast');
    assert(InterfaceContract.validateCycleData(cycle));

    // Earth elevation must remain strictly negative throughout the entire synodic cycle
    // because Earth is permanently occluded by the bulk of the Moon
    assertEqual(cycle.dteHours, 0, 'Far-side site must have exactly 0 DTE hours');
    assertEqual(cycle.dtePct, 0.0);
    assertEqual(cycle.dualHours, 0);

    for (const step of cycle.steps) {
      assertFalse(step.isEarthVisible, `Earth must not be visible from far side at step ${step.hourOffset}`);
      assertLessThan(step.earthElDeg, 0.0, `Earth elevation must be below 0 deg at step ${step.hourOffset}`);
    }

    // Solar illumination still occurs as the Moon rotates
    assertGreaterThan(cycle.sunlitHours, 0, 'Far side south polar rim still receives solar illumination');
  });
});
