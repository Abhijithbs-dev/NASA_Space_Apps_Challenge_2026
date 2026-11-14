/**
 * @fileoverview Tier 3 Pairwise Combinations & Subsystem Integration Test Suite for SeleneSight.
 * Multi-variable pairwise combinatorial tests across the 23 core features:
 * - Pairwise 1: Solar Array Geometry x Topographic Horizon Mask
 * - Pairwise 2: Sub-solar Synodic Drift x Seasonal Obliquity x Observer Coordinates
 * - Pairwise 3: Optical Libration Cycles x Topocentric Earth Vectors x Horizon Occlusion
 * - Pairwise 4: Observer Elevation Dip x Crater Rim Horizon Mask Clearance
 * - Pairwise 5: Reactive State Store x Timeline Scrubber Playback x Array Geometry Switching
 * - Pairwise 6: Scenario Comparator x Multi-Criteria Viability Scoring x Exporter Pipeline
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
// PAIRWISE 1: Solar Array Geometry x Topographic Horizon Mask
// ============================================================================
describe('Tier 3: Pairwise 1 - Solar Array Geometry x Topographic Horizon Mask', () => {
  let engine;
  let mockSites;

  beforeEach(() => {
    engine = new EphemerisEngine();
    mockSites = InterfaceContract.getMockSites();
  });

  test('P01-1: Full cross-matrix (3 array geometries x 4 canonical sites) yields compliant cycles', () => {
    const arrayTypes = ['vertical_mast', 'sun_tracking', 'horizontal_deck'];

    for (const site of mockSites) {
      for (const arrayType of arrayTypes) {
        const cycle = engine.computeFullCycle(site, '2026-11-14', arrayType);

        assert(InterfaceContract.validateCycleData(cycle),
          `Cycle must conform to schema for site ${site.id} and array ${arrayType}`);
        assertEqual(cycle.arrayType, arrayType);
        assertEqual(cycle.site.id, site.id);
        assertEqual(cycle.steps.length, 709);

        // Sunlit hours and DTE hours must be identical across array types for the same site
        // because illumination is determined by terrain mask, not array geometry
        const baseCycle = engine.computeFullCycle(site, '2026-11-14', 'vertical_mast');
        assertEqual(cycle.sunlitHours, baseCycle.sunlitHours,
          `Sunlit hours must be invariant to array geometry for site ${site.id}`);
        assertEqual(cycle.dteHours, baseCycle.dteHours,
          `DTE hours must be invariant to array geometry for site ${site.id}`);
      }
    }
  });

  test('P01-2: Polar grazing sunlight hierarchy: tracking >= vertical mast >> horizontal deck', () => {
    // At lunar south pole sites, solar elevation is typically < 2.5 degrees.
    // cos(El) ~ 0.999 while sin(El) ~ 0.035. Therefore vertical mast vastly outperforms horizontal.
    for (const site of mockSites) {
      const vertCycle = engine.computeFullCycle(site, '2026-11-14', 'vertical_mast');
      const trackCycle = engine.computeFullCycle(site, '2026-11-14', 'sun_tracking');
      const horizCycle = engine.computeFullCycle(site, '2026-11-14', 'horizontal_deck');

      assertGreaterThanOrEqual(trackCycle.avgPowerEff, vertCycle.avgPowerEff,
        `Tracking efficiency must be >= vertical mast for site ${site.id}`);
      assertGreaterThan(vertCycle.avgPowerEff, horizCycle.avgPowerEff,
        `Vertical mast efficiency must vastly exceed horizontal deck for site ${site.id}`);

      // Quantify polar geometry ratio: vertical should exceed horizontal by at least 10x on polar peaks
      if (vertCycle.sunlitHours > 100) {
        assertGreaterThan(
          vertCycle.avgPowerEff / (horizCycle.avgPowerEff || 0.01),
          10.0,
          `Polar grazing sunlight must make vertical mast at least 10x more efficient than horizontal deck on ${site.id}`
        );
      }
    }
  });

  test('P01-3: Horizon shadow occlusion override enforces 0% efficiency and 0 W/m2 flux regardless of array type', () => {
    // Malapert Massif Summit has intermittent shadow sectors (467 sunlit / 242 shadowed)
    const malapert = mockSites.find(s => s.id === 'malapert_massif_summit');
    const arrayTypes = ['vertical_mast', 'sun_tracking', 'horizontal_deck'];

    for (const arrayType of arrayTypes) {
      const cycle = engine.computeFullCycle(malapert, '2026-11-14', arrayType);
      let shadowedCount = 0;

      for (const step of cycle.steps) {
        if (!step.isSunlit) {
          shadowedCount++;
          assertEqual(step.arrayEfficiency, 0.0,
            `Array efficiency must be exactly 0.0 when shadowed for array ${arrayType} at step ${step.hourOffset}`);
          assertEqual(step.solarFluxWm2, 0.0,
            `Solar flux must be exactly 0.0 W/m2 when shadowed for array ${arrayType} at step ${step.hourOffset}`);
        }
      }
      assertGreaterThan(shadowedCount, 200, 'Malapert Massif must have significant shadowed hours');
    }
  });

  test('P01-4: Sunlit flux adheres strictly to geometric solar constant formulation across array models', () => {
    const shackleton = mockSites.find(s => s.id === 'shackleton_rim_primary');
    const vertCycle = engine.computeFullCycle(shackleton, '2026-11-14', 'vertical_mast');
    const trackCycle = engine.computeFullCycle(shackleton, '2026-11-14', 'sun_tracking');
    const horizCycle = engine.computeFullCycle(shackleton, '2026-11-14', 'horizontal_deck');

    for (let h = 0; h < 709; h += 24) {
      const sVert = vertCycle.steps[h];
      const sTrack = trackCycle.steps[h];
      const sHoriz = horizCycle.steps[h];

      if (sTrack.isSunlit) {
        // Tracking: 100% efficiency -> 1361.0 W/m2
        assertEqual(sTrack.arrayEfficiency, 100.0);
        assertEqual(sTrack.solarFluxWm2, 1361.0);

        // Vertical: cos(El) * 100
        const expectedVertEff = Math.round(Math.max(0, Math.cos(sVert.sunElDeg * (Math.PI / 180))) * 1000) / 10;
        assertApproxEqual(sVert.arrayEfficiency, expectedVertEff, 0.15);
        const expectedVertFlux = Math.round(((sVert.arrayEfficiency / 100.0) * 1361.0) * 10.0) / 10.0;
        assertEqual(sVert.solarFluxWm2, expectedVertFlux);

        // Horizontal: sin(El) * 100
        const expectedHorizEff = Math.round(Math.max(0, Math.sin(sHoriz.sunElDeg * (Math.PI / 180))) * 1000) / 10;
        assertApproxEqual(sHoriz.arrayEfficiency, expectedHorizEff, 0.15);
        const expectedHorizFlux = Math.round(((sHoriz.arrayEfficiency / 100.0) * 1361.0) * 10.0) / 10.0;
        assertEqual(sHoriz.solarFluxWm2, expectedHorizFlux);
      }
    }
  });

  test('P01-5: High-elevation plateau (Mons Mouton 5400m) increases solar elevation and total flux yield', () => {
    const monsMouton = mockSites.find(s => s.id === 'mons_mouton_plateau');
    const vertCycle = engine.computeFullCycle(monsMouton, '2026-11-14', 'vertical_mast');

    // Mons Mouton elevation is 5,400m, providing ~4.51 deg dip allowance
    // Sun elevation should remain higher than a zero-elevation observer at same lat/lon
    const zeroElevSite = {
      ...monsMouton,
      id: 'mons_mouton_sea_level',
      elevM: 0,
    };
    const zeroCycle = engine.computeFullCycle(zeroElevSite, '2026-11-14', 'vertical_mast');

    assertGreaterThan(vertCycle.sunlitHours, zeroCycle.sunlitHours,
      '5400m summit elevation must produce more sunlit hours than sea-level baseline');
    assertGreaterThan(vertCycle.avgPowerEff, zeroCycle.avgPowerEff,
      '5400m summit must provide higher average power efficiency due to extended illumination');
  });
});

// ============================================================================
// PAIRWISE 2: Sub-solar Synodic Drift x Seasonal Obliquity x Observer Coordinates
// ============================================================================
describe('Tier 3: Pairwise 2 - Sub-solar Synodic Drift x Seasonal Obliquity x Observer Coordinates', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('P02-1: Seasonal sub-solar latitude progression creates winter/summer solar elevation divergence at South Pole', () => {
    const site = InterfaceContract.getMockSite(); // Shackleton (-89.54 lat)

    // Southern Summer Solstice (around March: sub-solar lat is negative, favoring South Pole)
    const summerCycle = engine.computeFullCycle(site, '2026-03-20', 'vertical_mast');
    // Southern Winter Solstice (around September: sub-solar lat is positive, disfavoring South Pole)
    const winterCycle = engine.computeFullCycle(site, '2026-09-22', 'vertical_mast');

    // In southern summer, solar elevation is systematically higher
    const avgSummerSunEl = summerCycle.steps.reduce((acc, s) => acc + s.sunElDeg, 0) / 709;
    const avgWinterSunEl = winterCycle.steps.reduce((acc, s) => acc + s.sunElDeg, 0) / 709;

    assertGreaterThan(avgSummerSunEl, avgWinterSunEl,
      'Southern summer must produce higher average solar elevation at lunar south pole than winter');
    // The theoretical peak-to-peak seasonal solar elevation shift is ~2 * 1.5424 = ~3.08 degrees
    const elDifference = avgSummerSunEl - avgWinterSunEl;
    assertBetween(elDifference, 2.5, 3.5,
      'Seasonal solar elevation delta must approximate the Moon obliquity swing (~3.08 deg)');

    // Consequently, winter illumination hours must be significantly lower
    assertGreaterThan(summerCycle.sunlitHours, winterCycle.sunlitHours,
      'Summer must provide more sunlit hours than winter on crater rims');
  });

  test('P02-2: Sub-solar synodic drift rate (0.507948 deg/hr) maintains invariant progression across observer locations', () => {
    const sites = InterfaceContract.getMockSites();
    const cycle0 = engine.computeFullCycle(sites[0], '2026-11-14', 'vertical_mast');
    const cycle1 = engine.computeFullCycle(sites[1], '2026-11-14', 'vertical_mast');

    // Sub-solar coordinates are independent of observer site
    for (let h = 0; h < 709; h++) {
      assertEqual(cycle0.steps[h].subSolarLonDeg, cycle1.steps[h].subSolarLonDeg,
        `Sub-solar longitude at step ${h} must be identical regardless of observer site`);
      assertEqual(cycle0.steps[h].subSolarLatDeg, cycle1.steps[h].subSolarLatDeg,
        `Sub-solar latitude at step ${h} must be identical regardless of observer site`);
    }

    // Verify mean drift rate between steps: 360 / 708.73414 ~ 0.5079 deg/hr
    const totalDriftDeg = (cycle0.steps[708].subSolarLonDeg - cycle0.steps[0].subSolarLonDeg + 360.0) % 360.0;
    assertBetween(totalDriftDeg, 358.5, 360.0, '708-hour synodic sweep must cover ~359.6 degrees of longitude');
  });

  test('P02-3: Observer longitude separation shifts diurnal solar azimuth trajectory and solar noon timing', () => {
    // Shackleton Rim (+137.0 deg lon) vs Connecting Ridge South (-136.0 deg lon = 224.0 deg lon)
    // Longitude separation: 224 - 137 = 87 degrees
    // Drift rate = 0.507948 deg/hr -> expected time offset = 87 / 0.507948 ~ 171 hours
    const shackleton = InterfaceContract.getMockSite();
    const connecting = InterfaceContract.getMockSites().find(s => s.id === 'connecting_ridge_south');

    const cycleShack = engine.computeFullCycle(shackleton, '2026-11-14', 'vertical_mast');
    const cycleConn = engine.computeFullCycle(connecting, '2026-11-14', 'vertical_mast');

    // Find the hour when sun azimuth is closest to 180 degrees (due South / local meridian transit)
    let minDiffShack = 360;
    let hourNoonShack = 0;
    let minDiffConn = 360;
    let hourNoonConn = 0;

    for (let h = 0; h < 709; h++) {
      const diffS = Math.abs(cycleShack.steps[h].sunAzDeg - 180.0);
      if (diffS < minDiffShack) {
        minDiffShack = diffS;
        hourNoonShack = h;
      }
      const diffC = Math.abs(cycleConn.steps[h].sunAzDeg - 180.0);
      if (diffC < minDiffConn) {
        minDiffConn = diffC;
        hourNoonConn = h;
      }
    }

    // The two sites must not peak at the same hour
    assertNotEqual(hourNoonShack, hourNoonConn, 'Different site longitudes must produce different solar noon hours');
    const hourDelta = Math.abs(hourNoonConn - hourNoonShack);
    // 87 deg offset corresponds to ~171 hours, modulo synodic period if wrapped
    assert(hourDelta > 50, 'Longitude separation must shift meridian transit by dozens of hours');
  });

  test('P02-4: Terrain mask interaction with seasonal solar elevation modulates sunset/sunrise occurrence', () => {
    const site = InterfaceContract.getMockSite(); // Shackleton
    // In summer (continuous illumination), nextSunset is null
    const summerCycle = engine.computeFullCycle(site, '2026-03-20', 'vertical_mast');
    const summerCountdowns = engine.getTransitionCountdowns(summerCycle.steps, 0);
    assertNull(summerCountdowns.nextSunset, 'Perpetual summer illumination must yield null nextSunset');

    // In winter (occulted in low sectors), transitions occur
    const winterCycle = engine.computeFullCycle(site, '2026-09-22', 'vertical_mast');
    let foundSunset = false;
    for (let h = 0; h < 700; h++) {
      const cd = engine.getTransitionCountdowns(winterCycle.steps, h);
      if (cd.nextSunset !== null) {
        foundSunset = true;
        assertGreaterThan(cd.nextSunset, 0, 'nextSunset delta must be positive');
        assertLessThanOrEqual(cd.nextSunset, 708 - h, 'nextSunset cannot exceed remaining simulation hours');
        break;
      }
    }
    assert(foundSunset, 'Winter cycle on Shackleton must contain sunset transitions');
  });
});

// ============================================================================
// PAIRWISE 3: Optical Libration Cycles x Topocentric Earth Vectors x Horizon
// ============================================================================
describe('Tier 3: Pairwise 3 - Optical Libration Cycles x Topocentric Earth Vectors x Horizon', () => {
  let engine;
  let mockSites;

  beforeEach(() => {
    engine = new EphemerisEngine();
    mockSites = InterfaceContract.getMockSites();
  });

  test('P03-1: Dual asynchronous libration periods (draconic 653.09h vs anomalistic 661.31h) create non-repeating Earth vector beat', () => {
    const malapert = mockSites.find(s => s.id === 'malapert_massif_summit');
    const cycle = engine.computeFullCycle(malapert, '2026-11-14', 'vertical_mast');

    // Verify draconic cycle period: Earth lat reaches 0 at h=0, peaks at ~653.09/4 ~ 163h, crosses 0 at ~326h
    assertEqual(cycle.steps[0].libLatDeg, 0.0);
    assertApproxEqual(cycle.steps[163].libLatDeg, 6.68, 0.05, 'Draconic lat peak at quarter-period');
    assertApproxEqual(cycle.steps[327].libLatDeg, 0.0, 0.15, 'Draconic lat zero crossing at half-period');

    // Verify anomalistic cycle period: Earth lon reaches 0 at h=0, peaks at ~661.31/4 ~ 165h, crosses 0 at ~331h
    assertEqual(cycle.steps[0].libLonDeg, 0.0);
    assertApproxEqual(cycle.steps[165].libLonDeg, 7.90, 0.05, 'Anomalistic lon peak at quarter-period');
    assertApproxEqual(cycle.steps[331].libLonDeg, 0.0, 0.15, 'Anomalistic lon zero crossing at half-period');

    // The phase difference between the two cycles increases monotonically over time
    const phaseDrac708 = (708 / 653.093) % 1;
    const phaseAnom708 = (708 / 661.309) % 1;
    assertNotEqual(phaseDrac708, phaseAnom708, 'Draconic and anomalistic libration phases must drift apart');
  });

  test('P03-2: Observer latitude controls baseline Earth elevation: lower south latitude increases Earth elevation', () => {
    // Malapert Massif (lat: -86.0) is 3.54 degrees further north than Shackleton (lat: -89.54)
    const malapert = mockSites.find(s => s.id === 'malapert_massif_summit');
    const shackleton = mockSites.find(s => s.id === 'shackleton_rim_primary');

    const cycleMalapert = engine.computeFullCycle(malapert, '2026-11-14', 'vertical_mast');
    const cycleShack = engine.computeFullCycle(shackleton, '2026-11-14', 'vertical_mast');

    // Mean Earth elevation on Malapert Massif should be significantly higher than on Shackleton Rim
    const avgEarthElMalapert = cycleMalapert.steps.reduce((acc, s) => acc + s.earthElDeg, 0) / 709;
    const avgEarthElShack = cycleShack.steps.reduce((acc, s) => acc + s.earthElDeg, 0) / 709;

    assertGreaterThan(avgEarthElMalapert, avgEarthElShack,
      'Observer closer to equator (-86.0 deg) must have higher average Earth elevation than polar rim (-89.54 deg)');
    assertGreaterThan(avgEarthElMalapert - avgEarthElShack, 2.0,
      'Earth elevation difference between -86.0 and -89.54 deg sites must exceed 2.0 degrees');
  });

  test('P03-3: Continuous DTE lock on Malapert Massif summit across all libration extremes', () => {
    const malapert = mockSites.find(s => s.id === 'malapert_massif_summit');
    const cycle = engine.computeFullCycle(malapert, '2026-11-14', 'vertical_mast');

    // Malapert Massif has 100% DTE coverage across the entire 708-hour cycle
    assertEqual(cycle.dteHours, 709, 'Malapert Massif summit must maintain 100% continuous DTE lock');
    assertEqual(cycle.dtePct, 100.0);

    for (const step of cycle.steps) {
      assert(step.isEarthVisible, `Earth must be visible at step ${step.hourOffset}`);
      assertGreaterThan(step.earthElDeg, step.earthHorizonMaskDeg,
        `Earth elevation must clear horizon mask at step ${step.hourOffset}`);
    }
  });

  test('P03-4: Earthset and Earthrise transition cycles on Shackleton Rim driven by libration wobble', () => {
    const shackleton = mockSites.find(s => s.id === 'shackleton_rim_primary');
    const cycle = engine.computeFullCycle(shackleton, '2026-11-14', 'vertical_mast');

    // Shackleton Rim experiences intermittent DTE lock (~388 hours visible, ~321 hours occulted)
    assertBetween(cycle.dteHours, 350, 420, 'Shackleton must experience partial DTE visibility');
    assertFalse(cycle.dtePct === 100.0, 'Shackleton cannot have 100% DTE visibility');
    assertFalse(cycle.dtePct === 0.0, 'Shackleton cannot have 0% DTE visibility');

    // Verify Earth visibility toggles (contains both earthset and earthrise)
    let earthsetCount = 0;
    let earthriseCount = 0;
    for (let h = 1; h < 709; h++) {
      if (cycle.steps[h - 1].isEarthVisible && !cycle.steps[h].isEarthVisible) {
        earthsetCount++;
      }
      if (!cycle.steps[h - 1].isEarthVisible && cycle.steps[h].isEarthVisible) {
        earthriseCount++;
      }
    }
    assertGreaterThanOrEqual(earthsetCount, 1, 'Shackleton must observe at least one earthset transition');
    assertGreaterThanOrEqual(earthriseCount, 1, 'Shackleton must observe at least one earthrise transition');
  });

  test('P03-5: Libration extrema guarantee bounded Earth topocentric coordinates', () => {
    for (const site of mockSites) {
      const cycle = engine.computeFullCycle(site, '2026-11-14', 'vertical_mast');
      for (const step of cycle.steps) {
        assertLessThanOrEqual(Math.abs(step.libLatDeg), 6.68, 'libLatDeg must never exceed 6.68');
        assertLessThanOrEqual(Math.abs(step.libLonDeg), 7.90, 'libLonDeg must never exceed 7.90');
        assertBetween(step.earthAzDeg, 0.0, 359.99, 'earthAzDeg must be within [0, 360)');
      }
    }
  });
});

// ============================================================================
// PAIRWISE 4: Observer Elevation Dip x Crater Rim Horizon Mask Clearance
// ============================================================================
describe('Tier 3: Pairwise 4 - Observer Elevation Dip x Crater Rim Horizon Mask Clearance', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('P04-1: Analytical elevation dip formula matches sqrt(2h/R) across full elevation spectrum', () => {
    const testElevations = [0, 500, 1000, 2100, 4800, 5400, 10000];
    const rMoonKm = 1737.4;

    for (const elevM of testElevations) {
      const topo = engine.calculateTopocentric(-89.0, 0.0, elevM, 0.0, 0.0);
      const topoSeaLevel = engine.calculateTopocentric(-89.0, 0.0, 0, 0.0, 0.0);

      const expectedDipDeg = elevM > 0
        ? Math.sqrt((2.0 * (elevM / 1000.0)) / rMoonKm) * (180.0 / Math.PI)
        : 0.0;

      const observedDipDelta = topo.elevDeg - topoSeaLevel.elevDeg;
      assertApproxEqual(observedDipDelta, expectedDipDeg, 0.02,
        `Elevation dip delta at h=${elevM}m must match analytical formula`);
    }
  });

  test('P04-2: Elevation dip enables geometric visibility for targets below mean sphere horizontal', () => {
    // Observer at Mons Mouton (elev: 5400m, dip: ~4.51 deg)
    // Target at elevation where distRad > 90 deg (geometric elevation = -2.0 deg)
    // With 4.51 deg dip, topocentric elevation = -2.0 + 4.51 = +2.51 deg
    const targetLat = -85.6 + 92.0; // Dist > 90 deg -> geometric elevation < 0
    const siteElevM = 5400;

    const topoHigh = engine.calculateTopocentric(-85.6, 0.0, siteElevM, targetLat, 0.0);
    const topoSeaLevel = engine.calculateTopocentric(-85.6, 0.0, 0, targetLat, 0.0);

    assertLessThan(topoSeaLevel.elevDeg, 0.0, 'Target must be geometrically below sphere horizon at sea level');
    assertGreaterThan(topoHigh.elevDeg, 0.0, 'Target must become visible due to observer elevation dip at 5400m');
    assertApproxEqual(topoHigh.elevDeg - topoSeaLevel.elevDeg, 4.51, 0.05);
  });

  test('P04-3: Strict monotonicity: elevation dip strictly increases topocentric elevation at all azimuths', () => {
    const siteLat = -89.54;
    const siteLon = 137.0;

    const elevs = [0, 1000, 2000, 3000, 5000];
    for (let i = 1; i < elevs.length; i++) {
      const topoLow = engine.calculateTopocentric(siteLat, siteLon, elevs[i - 1], -1.5, 180.0);
      const topoHigh = engine.calculateTopocentric(siteLat, siteLon, elevs[i], -1.5, 180.0);

      assertGreaterThan(topoHigh.elevDeg, topoLow.elevDeg,
        `Elevation ${elevs[i]}m must yield strictly higher elevation angle than ${elevs[i - 1]}m`);
      assertEqual(topoHigh.azDeg, topoLow.azDeg,
        'Topocentric azimuth must remain invariant to observer elevation');
    }
  });

  test('P04-4: High crater rim mask overrides elevation dip to enforce terrain occlusion', () => {
    // Malapert Massif (4800m, dip ~4.25 deg)
    // If the crater rim mask in a sector is 8.0 deg, a target at 5.0 deg topocentric elevation is still occulted
    const customSite = {
      id: 'custom_high_rim',
      name: 'Custom High Rim Massif',
      shortName: 'High Rim',
      lat: -86.0,
      lon: 2.7,
      elevM: 4800,
      slopeDeg: 10.0,
      horizonProfile: [8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0],
    };

    const cycle = engine.computeFullCycle(customSite, '2026-11-14', 'vertical_mast');
    // At lunar south pole, solar elevation is typically < 4 degrees; with 8 deg mask, it should be 100% shadowed
    assertEqual(cycle.sunlitHours, 0, 'An 8-degree uniform horizon mask must occlude low-angle polar sun');
    assertEqual(cycle.sunlitPct, 0.0);
  });
});

// ============================================================================
// PAIRWISE 5: Reactive State Store x Timeline Scrubber x Array Switching
// ============================================================================
describe('Tier 3: Pairwise 5 - Reactive State Store x Timeline Scrubber x Array Switching', () => {
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

  test('P05-1: Switching array type during active timeline position preserves current hour and updates power metrics', () => {
    store.setHour(354);
    assertEqual(store.currentHour, 354);
    assertEqual(store.arrayType, 'vertical_mast');

    const vertPowerEff = store.cycleData.avgPowerEff;
    const vertStepFlux = store.cycleData.steps[354].solarFluxWm2;

    // Switch to sun_tracking
    let eventFired = false;
    store.addEventListener('arrayTypeChanged', (e) => {
      eventFired = true;
      assertEqual(e.detail.arrayType, 'sun_tracking');
    });

    store.setArrayType('sun_tracking');
    assert(eventFired, 'arrayTypeChanged event must fire');
    assertEqual(store.currentHour, 354, 'Current hour must remain unchanged after array type switch');
    assertEqual(store.arrayType, 'sun_tracking');

    const trackPowerEff = store.cycleData.avgPowerEff;
    const trackStepFlux = store.cycleData.steps[354].solarFluxWm2;

    assertGreaterThanOrEqual(trackPowerEff, vertPowerEff);
    assertGreaterThanOrEqual(trackStepFlux, vertStepFlux);
  });

  test('P05-2: Scrubber timeline boundary wrap-around during playback maintains state coherence', () => {
    store.setHour(708);
    assertEqual(store.currentHour, 708);

    // Call setHour beyond 708 directly
    store.setHour(709);
    assertEqual(store.currentHour, 708, 'Direct setHour(709) must clamp to 708');

    // Simulate playback step advancing past 708: playback loop wraps 709 -> 0
    let nextHour = store.currentHour + 1;
    if (nextHour > 708) nextHour = 0;
    store.setHour(nextHour);
    assertEqual(store.currentHour, 0, 'Playback step past 708 must wrap to hour 0');
  });

  test('P05-3: Playback speed transitions (1x -> 3x -> 6x -> 1x) execute cleanly without timer duplication', () => {
    assertEqual(store.playSpeed, 1);
    store.play();
    assert(store.isPlaying, 'Store must be playing');

    store.setPlaybackSpeed(3);
    assertEqual(store.playSpeed, 3);
    assert(store.isPlaying, 'Store must remain playing across speed change');

    store.setPlaybackSpeed(6);
    assertEqual(store.playSpeed, 6);
    assert(store.isPlaying, 'Store must remain playing at 6x');

    store.pause();
    assertFalse(store.isPlaying, 'Store must pause cleanly');
    store.setPlaybackSpeed(1);
    assertEqual(store.playSpeed, 1);
  });

  test('P05-4: Multiple decoupled event subscribers receive identical event details without cross-contamination', () => {
    let sub1Hour = -1;
    let sub2Hour = -1;

    const sub1 = (e) => { sub1Hour = e.detail.currentHour; };
    const sub2 = (e) => { sub2Hour = e.detail.currentHour; };

    store.addEventListener('hourChanged', sub1);
    store.addEventListener('hourChanged', sub2);

    store.setHour(420);
    assertEqual(sub1Hour, 420);
    assertEqual(sub2Hour, 420);

    store.removeEventListener('hourChanged', sub1);
    store.setHour(500);
    assertEqual(sub1Hour, 420, 'Unsubscribed sub1 must not receive update');
    assertEqual(sub2Hour, 500, 'Active sub2 must receive update');

    store.removeEventListener('hourChanged', sub2);
  });
});

// ============================================================================
// PAIRWISE 6: Scenario Comparator x Viability Scoring x Exporter Pipeline
// ============================================================================
describe('Tier 3: Pairwise 6 - Scenario Comparator x Viability Scoring x Exporter Pipeline', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('P06-1: Comparative delta anti-symmetry: Delta(B - A) equals -Delta(A - B) across all 6 metrics', () => {
    store.setScenarioSite('A', 'shackleton_rim_primary');
    store.setScenarioSite('B', 'malapert_massif_summit');

    const deltaForward = store.computeScenarioDelta();
    assertNotNull(deltaForward);

    // Invert the scenario assignments
    store.setScenarioSite('A', 'malapert_massif_summit');
    store.setScenarioSite('B', 'shackleton_rim_primary');

    const deltaInverted = store.computeScenarioDelta();
    assertNotNull(deltaInverted);

    assertEqual(deltaForward.sunlitHoursDelta, -deltaInverted.sunlitHoursDelta);
    assertEqual(deltaForward.dteHoursDelta, -deltaInverted.dteHoursDelta);
    assertEqual(deltaForward.dualHoursDelta, -deltaInverted.dualHoursDelta);
    assertEqual(deltaForward.viabilityScoreDelta, -deltaInverted.viabilityScoreDelta);
    assertEqual(deltaForward.elevMDelta, -deltaInverted.elevMDelta);
    assertApproxEqual(deltaForward.slopeDelta, -deltaInverted.slopeDelta, 0.01);
  });

  test('P06-2: Self-comparison delta strictly zeroes out all 6 comparative metrics', () => {
    for (const site of store.sites) {
      store.setScenarioSite('A', site.id);
      store.setScenarioSite('B', site.id);

      const delta = store.computeScenarioDelta();
      assertNotNull(delta);
      assertEqual(delta.sunlitHoursDelta, 0, `Self comparison sunlitDelta must be 0 for ${site.id}`);
      assertEqual(delta.dteHoursDelta, 0, `Self comparison dteDelta must be 0 for ${site.id}`);
      assertEqual(delta.dualHoursDelta, 0, `Self comparison dualDelta must be 0 for ${site.id}`);
      assertEqual(delta.viabilityScoreDelta, 0, `Self comparison viabilityDelta must be 0 for ${site.id}`);
      assertEqual(delta.elevMDelta, 0, `Self comparison elevMDelta must be 0 for ${site.id}`);
      assertEqual(delta.slopeDelta, 0.0, `Self comparison slopeDelta must be 0.0 for ${site.id}`);
    }
  });

  test('P06-3: Multi-criteria viability score sensitivity matches formula 0.45*sunlit + 0.35*dte + 0.20*slopePenalty', () => {
    for (const site of store.sites) {
      const cycle = ephemerisEngine.computeFullCycle(site, '2026-11-14', 'vertical_mast');
      const expectedSlopePenalty = Math.max(0.0, 100.0 - (site.slopeDeg * 5.0));
      const expectedScore = Math.round(
        (cycle.sunlitPct * 0.45) + (cycle.dtePct * 0.35) + (expectedSlopePenalty * 0.20)
      );
      assertEqual(cycle.viabilityScore, expectedScore,
        `Viability score for site ${site.id} must strictly adhere to mathematical weighting`);
    }
  });

  test('P06-4: Switching active site updates CSV and JSON exports with complete schema compliance', () => {
    store.setActiveSite('mons_mouton_plateau');
    assertEqual(store.activeSite.id, 'mons_mouton_plateau');

    // CSV verification
    const csv = store.exportToCSV();
    assert(typeof csv === 'string', 'CSV export must be a string');
    const lines = csv.trim().split('\n');
    assertEqual(lines.length, 710, 'CSV export must contain 1 header line + 709 data rows');
    assertIncludes(lines[0], 'Hour_Offset,Sun_Az_Deg,Sun_El_Deg');

    // JSON verification & schema round-trip
    const jsonStr = store.exportToJSON();
    assert(typeof jsonStr === 'string', 'JSON export must be a string');
    const parsedCycle = JSON.parse(jsonStr);

    assert(InterfaceContract.validateCycleData(parsedCycle),
      'Parsed exported JSON must pass InterfaceContract.validateCycleData');
    assertEqual(parsedCycle.site.id, 'mons_mouton_plateau');
    assertEqual(parsedCycle.steps.length, 709);
  });

  test('P06-5: Full state and comparison workflow integration pipeline executes without exception', () => {
    // 1. Initialize store
    const localStore = new AppStateStore();
    localStore.init();

    // 2. Select site A and B
    localStore.selectSiteA('connecting_ridge_south');
    localStore.selectSiteB('malapert_massif_summit');

    // 3. Compute delta
    const delta = localStore.computeScenarioDelta();
    assertNotNull(delta);

    // 4. Set timeline index
    localStore.setTimeIndex(200);
    assertEqual(localStore.currentHour, 200);

    // 5. Change array type
    localStore.setArrayType('horizontal_deck');
    assertEqual(localStore.arrayType, 'horizontal_deck');

    // 6. Export outputs
    const csv = localStore.exportToCSV();
    const json = localStore.exportToJSON();
    assertGreaterThan(csv.length, 1000);
    assertGreaterThan(json.length, 1000);
  });
});
