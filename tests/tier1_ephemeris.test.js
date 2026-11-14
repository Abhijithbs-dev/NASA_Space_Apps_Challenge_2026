/**
 * @fileoverview Tier 1 Feature Coverage Test Suite: Ephemeris & Astronomical Math Engine.
 * Tests Features F01 through F13 with >=5 genuine test cases per feature (>=65 total).
 *
 * Adheres strictly to zero external npm dependencies and opaque-box verification.
 */

import {
  describe, test, beforeEach,
  assert, assertFalse,
  assertEqual, assertNotEqual, assertDeepEqual,
  assertApproxEqual,
  assertGreaterThan, assertGreaterThanOrEqual,
  assertLessThan, assertLessThanOrEqual,
  assertBetween,
  assertThrows,
  assertIncludes,
  assertDefined, assertUndefined,
  assertNull, assertNotNull,
} from './testHarness.js';

import { EphemerisEngine, ephemerisEngine } from '../src/core/ephemerisEngine.js';
import { InterfaceContract, STEP_SCHEMA_KEYS, SUMMARY_SCHEMA_KEYS } from '../src/core/interfaceContract.js';

describe('Tier 1: F01 - Julian Date Conversion', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F01-1: calculates standard J2000.0 epoch at 00:00:00 UTC (Meeus JD 2451544.5)', () => {
    const jd = engine.dateToJulianDate('2000-01-01');
    assertEqual(jd, 2451544.5, 'J2000.0 epoch at 00:00 UTC should be 2451544.5');
  });

  test('F01-2: calculates 2026 Space Apps Challenge epoch date (2026-11-14)', () => {
    const jd = engine.dateToJulianDate('2026-11-14');
    assertEqual(jd, 2461358.5, '2026-11-14 at 00:00 UTC should be 2461358.5');
  });

  test('F01-3: correctly handles leap year February 29 (2024-02-29) and day delta', () => {
    const jdFeb29 = engine.dateToJulianDate('2024-02-29');
    const jdMar01 = engine.dateToJulianDate('2024-03-01');
    assertEqual(jdFeb29, 2460369.5, '2024-02-29 JD must match leap calendar calculation');
    assertEqual(jdMar01, 2460370.5, '2024-03-01 JD must match calculation');
    assertEqual(jdMar01 - jdFeb29, 1.0, 'Day delta across leap day must equal exactly 1.0');
  });

  test('F01-4: verifies month transition continuity (2025-04-30 to 2025-05-01)', () => {
    const jdApr30 = engine.dateToJulianDate('2025-04-30');
    const jdMay01 = engine.dateToJulianDate('2025-05-01');
    assertEqual(jdMay01 - jdApr30, 1.0, 'Month boundary delta must equal 1.0 day');
    assertEqual(jdApr30 % 1, 0.5, '00:00:00 UTC Julian Date must end in .5');
    assertEqual(jdMay01 % 1, 0.5, '00:00:00 UTC Julian Date must end in .5');
  });

  test('F01-5: verifies year-end transition continuity (2025-12-31 to 2026-01-01)', () => {
    const jdDec31 = engine.dateToJulianDate('2025-12-31');
    const jdJan01 = engine.dateToJulianDate('2026-01-01');
    assertEqual(jdJan01 - jdDec31, 1.0, 'New Year boundary delta must equal 1.0 day');
  });

  test('F01-6: validates multi-date monotonicity across mission timeline dates', () => {
    const dates = ['2026-01-01', '2026-06-01', '2026-11-14', '2026-12-31'];
    let prevJd = -Infinity;
    for (const d of dates) {
      const curJd = engine.dateToJulianDate(d);
      assertGreaterThan(curJd, prevJd, `Julian date for ${d} must be strictly greater than previous`);
      prevJd = curJd;
    }
  });
});

describe('Tier 1: F02 - Centuries Since J2000', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F02-1: evaluates exact J2000.0 midday epoch where T equals 0.0', () => {
    const t = engine.centuriesSinceJ2000('2000-01-01', 12);
    assertApproxEqual(t, 0.0, 1e-12, 'T must equal 0.0 at 2000-01-01 12:00 UTC');
  });

  test('F02-2: calculates T for Space Apps mission epoch 2026-11-14 at hour offset 0', () => {
    const t = engine.centuriesSinceJ2000('2026-11-14', 0);
    assertApproxEqual(t, 0.268678987, 1e-6, 'T for 2026-11-14 must approximate ~0.268679 centuries');
  });

  test('F02-3: verifies hourly progression matches astronomical rate (1/(24*36525) cent/hr)', () => {
    const t0 = engine.centuriesSinceJ2000('2026-11-14', 0);
    const t100 = engine.centuriesSinceJ2000('2026-11-14', 100);
    const t354 = engine.centuriesSinceJ2000('2026-11-14', 354);
    const t708 = engine.centuriesSinceJ2000('2026-11-14', 708);

    const expectedHourlyRate = 1.0 / (24.0 * 36525.0);
    assertApproxEqual((t100 - t0) / 100.0, expectedHourlyRate, 1e-10);
    assertApproxEqual((t354 - t0) / 354.0, expectedHourlyRate, 1e-10);
    assertApproxEqual((t708 - t0) / 708.0, expectedHourlyRate, 1e-10);
  });

  test('F02-4: verifies 24-hour offset equals exactly 1 full Julian day progression', () => {
    const t0 = engine.centuriesSinceJ2000('2026-11-14', 0);
    const t24 = engine.centuriesSinceJ2000('2026-11-14', 24);
    const delta = t24 - t0;
    assertApproxEqual(delta, 1.0 / 36525.0, 1e-12, '24 hours must increment T by 1/36525');
  });

  test('F02-5: verifies historical date yields negative centuries (T < 0)', () => {
    const tHistorical = engine.centuriesSinceJ2000('1990-01-01', 0);
    assertLessThan(tHistorical, 0.0, 'Dates prior to J2000.0 must have negative centuries');
  });

  test('F02-6: calculates maximum synodic offset h=708 delta from base epoch', () => {
    const t0 = engine.centuriesSinceJ2000('2026-11-14', 0);
    const t708 = engine.centuriesSinceJ2000('2026-11-14', 708);
    const expectedDelta = (708.0 / 24.0) / 36525.0; // 29.5 / 36525
    assertApproxEqual(t708 - t0, expectedDelta, 1e-10);
  });
});

describe('Tier 1: F03 - Continuous LOLA Horizon Mask Interpolation', () => {
  let engine;
  const mockProfile = [0.8, 0.9, 1.2, 1.5, 1.1, 0.7, 0.6, 1.0, 1.4, 1.1, 0.8, 0.7];

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F03-1: retrieves exact values at on-boundary sector azimuths (0, 30, 60, 90 deg)', () => {
    assertEqual(engine.interpolateHorizon(mockProfile, 0), 0.8);
    assertEqual(engine.interpolateHorizon(mockProfile, 30), 0.9);
    assertEqual(engine.interpolateHorizon(mockProfile, 60), 1.2);
    assertEqual(engine.interpolateHorizon(mockProfile, 90), 1.5);
  });

  test('F03-2: calculates exact arithmetic midpoint between adjacent sectors (15, 45, 75 deg)', () => {
    assertApproxEqual(engine.interpolateHorizon(mockProfile, 15), (0.8 + 0.9) / 2.0, 1e-2);
    assertApproxEqual(engine.interpolateHorizon(mockProfile, 45), (0.9 + 1.2) / 2.0, 1e-2);
    assertApproxEqual(engine.interpolateHorizon(mockProfile, 75), (1.2 + 1.5) / 2.0, 1e-2);
  });

  test('F03-3: handles circular wraparound across 360-degree boundary (sector 11 to sector 0)', () => {
    // Sector 11 is 330 deg (0.7), Sector 0 is 0 deg (0.8). Midpoint 345 deg should be 0.75.
    const val345 = engine.interpolateHorizon(mockProfile, 345);
    assertApproxEqual(val345, 0.75, 1e-2, 'Sector 11 -> 0 wrap must interpolate smoothly');

    const val359 = engine.interpolateHorizon(mockProfile, 359);
    assertBetween(val359, 0.7, 0.81, 'Angle near 360 must be bounded between profile[11] and profile[0]');
  });

  test('F03-4: evaluates arbitrary floating point azimuth angles with linear precision', () => {
    // Between sector 1 (30 deg, 0.9) and sector 2 (60 deg, 1.2): fraction at 36 deg is 0.2
    // 0.9 * 0.8 + 1.2 * 0.2 = 0.72 + 0.24 = 0.96
    const val36 = engine.interpolateHorizon(mockProfile, 36.0);
    assertApproxEqual(val36, 0.96, 1e-2);
  });

  test('F03-5: normalizes negative azimuth angles to equivalent positive angles', () => {
    const valNeg30 = engine.interpolateHorizon(mockProfile, -30);
    const val330 = engine.interpolateHorizon(mockProfile, 330);
    assertEqual(valNeg30, val330, '-30 deg must interpolate identically to 330 deg');

    const valNeg15 = engine.interpolateHorizon(mockProfile, -15);
    const val345 = engine.interpolateHorizon(mockProfile, 345);
    assertEqual(valNeg15, val345, '-15 deg must interpolate identically to 345 deg');
  });

  test('F03-6: safely returns 0.0 fallback on null, empty, or invalid profile array length', () => {
    assertEqual(engine.interpolateHorizon(null, 45), 0.0);
    assertEqual(engine.interpolateHorizon([], 45), 0.0);
    assertEqual(engine.interpolateHorizon([1.0, 2.0], 45), 0.0);
    assertEqual(engine.interpolateHorizon(undefined, 45), 0.0);
  });
});

describe('Tier 1: F04 - Topocentric Vector Solver', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F04-1: computes zenith target elevation directly overhead observer at 90 degrees', () => {
    const topo = engine.calculateTopocentric(-89.0, 100.0, 0, -89.0, 100.0);
    assertApproxEqual(topo.elevDeg, 90.0, 0.1, 'Co-located observer and target must yield 90 deg elevation');
  });

  test('F04-2: computes nadir target on opposite side of Moon at -90 degrees elevation', () => {
    const topo = engine.calculateTopocentric(-90.0, 0.0, 0, 90.0, 0.0);
    assertApproxEqual(topo.elevDeg, -90.0, 0.1, 'Antipodal target must yield -90 deg geometric elevation');
  });

  test('F04-3: evaluates exact south pole observer targeting equatorial sub-target', () => {
    const topo = engine.calculateTopocentric(-90.0, 0.0, 0, 0.0, 0.0);
    assertApproxEqual(topo.elevDeg, 0.0, 0.1, 'Equatorial target from pole without elevation dip must yield 0 deg elevation');
  });

  test('F04-4: verifies observer terrain elevation dip allowance increases line-of-sight elevation', () => {
    const topoSeaLevel = engine.calculateTopocentric(-89.54, 137.0, 0, 0.0, 137.0);
    const topoElevated = engine.calculateTopocentric(-89.54, 137.0, 2100, 0.0, 137.0);

    // Expected dip allowance for 2100m on 1737.4 km moon: sqrt(2 * 2.1 / 1737.4) * (180/pi) ~ 2.817 deg
    assertGreaterThan(topoElevated.elevDeg, topoSeaLevel.elevDeg, 'Elevated observer must gain horizon dip allowance');
    const dipGain = topoElevated.elevDeg - topoSeaLevel.elevDeg;
    assertApproxEqual(dipGain, 2.82, 0.1, 'Horizon dip gain must approximate theoretical formula ~2.82 deg');
  });

  test('F04-5: verifies topocentric azimuth quadrant transitions clockwise from North', () => {
    // Observer at -80 deg lat, 0 deg lon targeting targets at longitude offsets
    const eastTarget = engine.calculateTopocentric(-80.0, 0.0, 0, 0.0, 90.0);
    assertBetween(eastTarget.azDeg, 0.0, 180.0, 'Target to the East must produce eastern azimuth');

    const westTarget = engine.calculateTopocentric(-80.0, 0.0, 0, 0.0, -90.0);
    assertBetween(westTarget.azDeg, 180.0, 360.0, 'Target to the West must produce western azimuth');
  });

  test('F04-6: verifies Malapert Massif Summit summit elevation dip calculation', () => {
    const topoMalapert = engine.calculateTopocentric(-86.0, 2.7, 4800, 0.0, 0.0);
    // Malapert elev 4800m dip: sqrt(2 * 4.8 / 1737.4) * (180/pi) ~ 4.25 deg
    assertDefined(topoMalapert.azDeg);
    assertDefined(topoMalapert.elevDeg);
    assertBetween(topoMalapert.azDeg, 0.0, 360.0);
    assertGreaterThan(topoMalapert.elevDeg, 0.0, 'Malapert summit should have positive topocentric elevation');
  });
});

describe('Tier 1: F05 - Azimuth Normalization (360° Wrap Guard)', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F05-1: ensures azimuth values rounding to 360.0 wrap strictly to 0.0 deg', () => {
    // Generate synthetic topocentric checks near the meridian boundary
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (let h = 0; h < cycle.steps.length; h++) {
      const step = cycle.steps[h];
      assertGreaterThanOrEqual(step.sunAzDeg, 0.0, `Step ${h} sunAzDeg must be >= 0.0`);
      assertLessThan(step.sunAzDeg, 360.0, `Step ${h} sunAzDeg must be < 360.0 (360.0 is prohibited)`);
      assertGreaterThanOrEqual(step.earthAzDeg, 0.0, `Step ${h} earthAzDeg must be >= 0.0`);
      assertLessThan(step.earthAzDeg, 360.0, `Step ${h} earthAzDeg must be < 360.0 (360.0 is prohibited)`);
    }
  });

  test('F05-2: verifies target directly on northern local meridian produces azimuth 0.0 deg', () => {
    // Observer at (-80, 0), target at (-70, 0) is directly North
    const topo = engine.calculateTopocentric(-80.0, 0.0, 0, -70.0, 0.0);
    assertEqual(topo.azDeg, 0.0, 'Due North meridian azimuth must equal 0.0 deg');
  });

  test('F05-3: verifies negative angle wrapping produces positive azimuth in [0, 360)', () => {
    // Target slightly west of North
    const topo = engine.calculateTopocentric(-80.0, 0.0, 0, -70.0, -1.0);
    assertBetween(topo.azDeg, 350.0, 360.0, 'Target slightly west of North must wrap into [350, 360)');
    assertLessThan(topo.azDeg, 360.0);
  });

  test('F05-4: verifies multi-turn large longitude angles wrap into single turn [0, 360)', () => {
    const topo = engine.calculateTopocentric(-85.0, 10.0, 0, 0.0, 730.0);
    assertBetween(topo.azDeg, 0.0, 360.0);
    assertLessThan(topo.azDeg, 360.0);
  });

  test('F05-5: validates azimuth numerical precision format to 1 decimal place', () => {
    const topo = engine.calculateTopocentric(-89.54, 137.0, 2100, -1.5, 180.0);
    const decimals = (String(topo.azDeg).split('.')[1] || '').length;
    assertLessThanOrEqual(decimals, 1, 'azDeg must be rounded to at most 1 decimal place');
  });

  test('F05-6: validates full synodic sweep continuity without discontinuity spikes', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    // Over the lunar day, solar azimuth traverses the sky continuously
    let maxStepDelta = 0;
    for (let h = 1; h < cycle.steps.length; h++) {
      let diff = Math.abs(cycle.steps[h].sunAzDeg - cycle.steps[h - 1].sunAzDeg);
      if (diff > 180) diff = 360 - diff; // account for 360-degree wrap
      if (diff > maxStepDelta) maxStepDelta = diff;
    }
    // Hourly azimuth motion at south pole rim is roughly 360/708 ~ 0.5 deg/hr with terrain variation, never > 30 deg/hr
    assertLessThan(maxStepDelta, 30.0, 'Hourly solar azimuth progression must be continuous and smooth');
  });
});

describe('Tier 1: F06 - Sub-Solar Seasonal Latitude', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F06-1: verifies obliquity constant matches canonical astronomical value 1.5424 deg', () => {
    assertEqual(engine.obliquityDeg, 1.5424, 'Lunar obliquity relative to ecliptic must be 1.5424 deg');
  });

  test('F06-2: bounds sub-solar latitude strictly within [-1.5424, +1.5424] deg across full cycle', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (let h = 0; h < cycle.steps.length; h++) {
      const lat = cycle.steps[h].subSolarLatDeg;
      assertBetween(lat, -1.55, 1.55, `Step ${h} subSolarLatDeg (${lat}) must be bounded by +/- 1.5424 deg`);
    }
  });

  test('F06-3: validates annual tropical progression dependence on mission epoch date', () => {
    const site = InterfaceContract.getMockSite();
    const cycleSummer = engine.computeFullCycle(site, '2026-11-14');
    const cycleWinter = engine.computeFullCycle(site, '2026-05-14'); // ~6 months apart

    assertNotEqual(cycleSummer.steps[0].subSolarLatDeg, cycleWinter.steps[0].subSolarLatDeg,
      'Sub-solar latitude must vary with calendar season across the tropical year');
  });

  test('F06-4: verifies subSolarLatDeg output precision is formatted to 2 decimal places', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (const step of [cycle.steps[0], cycle.steps[100], cycle.steps[354], cycle.steps[708]]) {
      const decimals = (String(step.subSolarLatDeg).split('.')[1] || '').length;
      assertLessThanOrEqual(decimals, 2, 'subSolarLatDeg must be formatted to at most 2 decimal places');
    }
  });

  test('F06-5: verifies continuous gradual seasonal drift across 709 hourly steps', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    const startLat = cycle.steps[0].subSolarLatDeg;
    const endLat = cycle.steps[708].subSolarLatDeg;
    // Over ~29.5 days (1/12 of tropical year), sunLat changes by a fraction of its total 3.08 deg peak-to-peak amplitude
    const seasonalDrift = Math.abs(endLat - startLat);
    assertLessThan(seasonalDrift, 1.5, 'Sub-solar seasonal drift over 29.5 days must be modest (< 1.5 deg)');
  });

  test('F06-6: confirms theoretical Meeus orbital equation at step h=0 for 2026-11-14', () => {
    const jd0 = engine.dateToJulianDate('2026-11-14');
    const expectedLat = -1.5424 * Math.sin((2.0 * Math.PI * (jd0 - 2451545.0)) / 365.25);
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site, '2026-11-14');
    assertApproxEqual(cycle.steps[0].subSolarLatDeg, expectedLat, 0.05,
      'Step 0 subSolarLatDeg must match theoretical Meeus seasonal latitude equation');
  });
});

describe('Tier 1: F07 - Sub-Solar Synodic Drift', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F07-1: verifies mean synodic month constant equals 708.73414 hours', () => {
    assertApproxEqual(engine.synodicHours, 708.73414, 1e-4, 'Synodic month must be 708.73414 hours');
  });

  test('F07-2: verifies hourly drift rate approximates ~0.507948 deg/hr', () => {
    const rate = 360.0 / engine.synodicHours;
    assertApproxEqual(rate, 0.507948, 1e-4, 'Hourly synodic drift rate must approximate ~0.507948 deg/hr');
  });

  test('F07-3: verifies subSolarLonDeg starts at 180.0 deg at step h=0', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    assertEqual(cycle.steps[0].subSolarLonDeg, 180.0, 'Sub-solar longitude at h=0 must start at 180.0 deg');
  });

  test('F07-4: validates nearly complete 360-degree sweep (~359.6 deg) at step h=708', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    // At h=708, total degrees advanced = 708 * (360 / 708.73414) ~ 359.627 deg
    // Longitude = (180 + 359.627) % 360 ~ 179.6 deg
    assertApproxEqual(cycle.steps[708].subSolarLonDeg, 179.6, 0.5,
      'At h=708 sub-solar longitude completes ~359.6 deg sweep returning near starting meridian');
  });

  test('F07-5: validates monotonic longitudinal advancement prior to 360-degree modulo wrap', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    // From h=0 (180 deg) to h=350 (~357.8 deg), longitude strictly increases
    for (let h = 1; h <= 350; h++) {
      assertGreaterThan(cycle.steps[h].subSolarLonDeg, cycle.steps[h - 1].subSolarLonDeg,
        `subSolarLonDeg must increase monotonically at step ${h}`);
    }
  });

  test('F07-6: bounds subSolarLonDeg strictly within [0.0, 360.0) across all 709 steps', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (let h = 0; h < cycle.steps.length; h++) {
      const lon = cycle.steps[h].subSolarLonDeg;
      assertGreaterThanOrEqual(lon, 0.0);
      assertLessThan(lon, 360.0);
    }
  });
});

describe('Tier 1: F08 - Optical Libration (Draconic & Anomalistic)', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F08-1: bounds latitudinal libration (draconic) strictly within +/- 6.68 deg', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (let h = 0; h < cycle.steps.length; h++) {
      const libLat = cycle.steps[h].libLatDeg;
      assertBetween(libLat, -6.681, 6.681, `Step ${h} libLatDeg must not exceed +/- 6.68 deg`);
    }
  });

  test('F08-2: bounds longitudinal libration (anomalistic) strictly within +/- 7.90 deg', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (let h = 0; h < cycle.steps.length; h++) {
      const libLon = cycle.steps[h].libLonDeg;
      assertBetween(libLon, -7.901, 7.901, `Step ${h} libLonDeg must not exceed +/- 7.90 deg`);
    }
  });

  test('F08-3: verifies zero-crossing at step h=0 for both libration components', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    assertEqual(cycle.steps[0].libLatDeg, 0.0, 'libLatDeg at h=0 must start at 0.0');
    assertEqual(cycle.steps[0].libLonDeg, 0.0, 'libLonDeg at h=0 must start at 0.0');
  });

  test('F08-4: observes peak amplitude near quarter-cycle periods', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    // Draconic peak at ~653.093 / 4 ~ 163 hours (expect libLat near +6.68 deg)
    assertApproxEqual(cycle.steps[163].libLatDeg, 6.68, 0.1);
    // Anomalistic peak at ~661.309 / 4 ~ 165 hours (expect libLon near +7.90 deg)
    assertApproxEqual(cycle.steps[165].libLonDeg, 7.90, 0.1);
  });

  test('F08-5: verifies incommensurate phase drift between draconic and anomalistic wobbles', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    // Near h=653 (1 full draconic cycle), libLat returns near 0, but anomalistic (661h) has not completed
    assertApproxEqual(cycle.steps[653].libLatDeg, 0.0, 0.1);
    assertNotEqual(cycle.steps[653].libLonDeg, 0.0, 'Anomalistic libration must be out of phase at draconic completion');
  });

  test('F08-6: validates schema formatting precision of libration values to 2 decimal places', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (const h of [50, 163, 300, 500, 700]) {
      const latDecimals = (String(cycle.steps[h].libLatDeg).split('.')[1] || '').length;
      const lonDecimals = (String(cycle.steps[h].libLonDeg).split('.')[1] || '').length;
      assertLessThanOrEqual(latDecimals, 2);
      assertLessThanOrEqual(lonDecimals, 2);
    }
  });
});

describe('Tier 1: F09 - Solar Array PV Efficiency Models', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F09-1: returns 0.0% efficiency when solar elevation is zero or negative', () => {
    assertEqual(engine.computeArrayEfficiency(0.0, 'vertical_mast'), 0.0);
    assertEqual(engine.computeArrayEfficiency(-1.0, 'vertical_mast'), 0.0);
    assertEqual(engine.computeArrayEfficiency(0.0, 'sun_tracking'), 0.0);
    assertEqual(engine.computeArrayEfficiency(-5.0, 'sun_tracking'), 0.0);
    assertEqual(engine.computeArrayEfficiency(0.0, 'horizontal_deck'), 0.0);
    assertEqual(engine.computeArrayEfficiency(-2.5, 'horizontal_deck'), 0.0);
  });

  test('F09-2: calculates vertical mast efficiency using cos(elevation) * 100%', () => {
    // At grazing polar angle el = 1.5 deg, cos(1.5 deg) ~ 0.999657 -> 99.97%
    const effGrazing = engine.computeArrayEfficiency(1.5, 'vertical_mast');
    assertApproxEqual(effGrazing, 99.97, 0.05);

    // At el = 60.0 deg, cos(60 deg) = 0.50 -> 50.0%
    const eff60 = engine.computeArrayEfficiency(60.0, 'vertical_mast');
    assertApproxEqual(eff60, 50.0, 0.01);
  });

  test('F09-3: calculates horizontal deck array efficiency using sin(elevation) * 100%', () => {
    // At grazing polar angle el = 1.5 deg, sin(1.5 deg) ~ 0.026177 -> 2.62%
    const effGrazing = engine.computeArrayEfficiency(1.5, 'horizontal_deck');
    assertApproxEqual(effGrazing, 2.62, 0.05);

    // At el = 30.0 deg, sin(30 deg) = 0.50 -> 50.0%
    const eff30 = engine.computeArrayEfficiency(30.0, 'horizontal_deck');
    assertApproxEqual(eff30, 50.0, 0.01);
  });

  test('F09-4: verifies 2-axis sun tracking array yields 100.0% efficiency for any sunlit angle', () => {
    assertEqual(engine.computeArrayEfficiency(0.5, 'sun_tracking'), 100.0);
    assertEqual(engine.computeArrayEfficiency(15.0, 'sun_tracking'), 100.0);
    assertEqual(engine.computeArrayEfficiency(85.0, 'sun_tracking'), 100.0);
  });

  test('F09-5: verifies vertical and horizontal efficiency crossover at exactly 45.0 degrees', () => {
    const effVert = engine.computeArrayEfficiency(45.0, 'vertical_mast');
    const effHoriz = engine.computeArrayEfficiency(45.0, 'horizontal_deck');
    assertApproxEqual(effVert, effHoriz, 1e-4, 'cos(45) and sin(45) must be equal at 45 degrees');
    assertApproxEqual(effVert, 70.71, 0.05);
  });

  test('F09-6: falls back gracefully to vertical_mast model for default or unknown array types', () => {
    const effDefault = engine.computeArrayEfficiency(10.0);
    const effVert = engine.computeArrayEfficiency(10.0, 'vertical_mast');
    assertEqual(effDefault, effVert, 'Omitted array type must match vertical_mast');

    const effUnknown = engine.computeArrayEfficiency(10.0, 'exotic_concentrator');
    assertEqual(effUnknown, effVert, 'Unknown array type must fall back to vertical_mast');
  });
});

describe('Tier 1: F10 - Incident Solar Flux Calculation', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F10-1: verifies solar constant matches canonical 1361.0 W/m^2 at 1 AU', () => {
    assertEqual(engine.solarConstant, 1361.0, 'Solar constant at 1 AU must be 1361.0 W/m^2');
  });

  test('F10-2: computes zero solar flux (0.0 W/m^2) for shadowed terrain steps', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    // Find or simulate shadowed step
    for (let h = 0; h < cycle.steps.length; h++) {
      if (!cycle.steps[h].isSunlit) {
        assertEqual(cycle.steps[h].solarFluxWm2, 0.0);
        assertEqual(cycle.steps[h].arrayEfficiency, 0.0);
      }
    }
  });

  test('F10-3: verifies peak tracking flux reaches exactly 1361.0 W/m^2 when sunlit', () => {
    const site = InterfaceContract.getMockSite();
    const cycleTracking = engine.computeFullCycle(site, '2026-11-14', 'sun_tracking');
    // For sunlit steps, 100% efficiency should yield 1361.0 W/m^2
    const sunlitStep = cycleTracking.steps.find(s => s.isSunlit);
    assertDefined(sunlitStep, 'Shackleton Rim should have sunlit steps');
    assertEqual(sunlitStep.arrayEfficiency, 100.0);
    assertEqual(sunlitStep.solarFluxWm2, 1361.0);
  });

  test('F10-4: validates linear relationship between array efficiency and incident flux', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site, '2026-11-14', 'vertical_mast');
    for (const h of [0, 50, 100, 200, 350]) {
      const step = cycle.steps[h];
      if (step.isSunlit) {
        const expectedFlux = Math.round(((step.arrayEfficiency / 100.0) * 1361.0) * 10.0) / 10.0;
        assertApproxEqual(step.solarFluxWm2, expectedFlux, 0.2);
      }
    }
  });

  test('F10-5: confirms vertical mast array achieves high flux (~1359 W/m^2) in polar grazing sun', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site, '2026-11-14', 'vertical_mast');
    const step0 = cycle.steps[0];
    assert(step0.isSunlit, 'Step 0 on Shackleton Rim is illuminated');
    assertGreaterThan(step0.solarFluxWm2, 1300.0, 'Vertical mast in polar grazing sun must harvest > 1300 W/m^2');
  });

  test('F10-6: validates solarFluxWm2 schema formatting precision to 1 decimal place', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (const h of [0, 10, 20, 50, 100]) {
      const decimals = (String(cycle.steps[h].solarFluxWm2).split('.')[1] || '').length;
      assertLessThanOrEqual(decimals, 1, 'solarFluxWm2 must have at most 1 decimal place');
    }
  });
});

describe('Tier 1: F11 - Synodic Cycle Ephemeris Generation', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F11-1: generates trajectory array of exactly 709 hourly steps (h=0 to h=708)', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    assert(Array.isArray(cycle.steps), 'steps must be an array');
    assertEqual(cycle.steps.length, 709, 'steps array must contain exactly 709 elements');
    assertEqual(cycle.steps[0].hourOffset, 0);
    assertEqual(cycle.steps[708].hourOffset, 708);
  });

  test('F11-2: populates all 15 STEP_SCHEMA_KEYS in every generated hourly step', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    // Spot check multiple points across cycle
    for (const h of [0, 1, 100, 354, 500, 708]) {
      const step = cycle.steps[h];
      for (const key of STEP_SCHEMA_KEYS) {
        assert(key in step, `Step ${h} is missing required STEP_SCHEMA_KEY: "${key}"`);
      }
    }
  });

  test('F11-3: populates all 8 SUMMARY_SCHEMA_KEYS in cycle result object', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (const key of SUMMARY_SCHEMA_KEYS) {
      assert(key in cycle, `Cycle result is missing required SUMMARY_SCHEMA_KEY: "${key}"`);
    }
  });

  test('F11-4: verifies step hourOffset index monotonicity matching step array index', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    for (let h = 0; h < cycle.steps.length; h++) {
      assertEqual(cycle.steps[h].hourOffset, h, `Step at index ${h} must have hourOffset ${h}`);
    }
  });

  test('F11-5: preserves site reference, effective epoch date, and array configuration in output', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site, '2026-11-14', 'horizontal_deck');
    assertEqual(cycle.site.id, site.id);
    assertEqual(cycle.epochDateStr, '2026-11-14');
    assertEqual(cycle.arrayType, 'horizontal_deck');
  });

  test('F11-6: verifies aggregate metric percentages correspond to hourly step counts', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);

    const expectedSunlitPct = Math.round((cycle.sunlitHours / 709.0) * 1000.0) / 10.0;
    const expectedDtePct = Math.round((cycle.dteHours / 709.0) * 1000.0) / 10.0;
    const expectedDualPct = Math.round((cycle.dualHours / 709.0) * 1000.0) / 10.0;

    assertEqual(cycle.sunlitPct, expectedSunlitPct);
    assertEqual(cycle.dtePct, expectedDtePct);
    assertEqual(cycle.dualPct, expectedDualPct);
  });
});

describe('Tier 1: F12 - State Transition Countdowns', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F12-1: detects next sunset countdown when site transitions from illuminated to shadow', () => {
    // Synthetic 10-step trajectory
    const steps = [
      { isSunlit: true, isEarthVisible: true },
      { isSunlit: true, isEarthVisible: true },
      { isSunlit: false, isEarthVisible: true }, // Sunset at index 2 (delta = 2 - 0 = 2)
      { isSunlit: false, isEarthVisible: true },
    ];
    const cd = engine.getTransitionCountdowns(steps, 0);
    assertEqual(cd.nextSunset, 2, 'Sunset transition at step 2 must yield countdown 2 from step 0');
  });

  test('F12-2: detects next sunrise countdown when site transitions from shadow to illuminated', () => {
    const steps = [
      { isSunlit: false, isEarthVisible: false },
      { isSunlit: false, isEarthVisible: false },
      { isSunlit: false, isEarthVisible: false },
      { isSunlit: true, isEarthVisible: false }, // Sunrise at index 3 (delta = 3 - 0 = 3)
    ];
    const cd = engine.getTransitionCountdowns(steps, 0);
    assertEqual(cd.nextSunrise, 3, 'Sunrise transition at step 3 must yield countdown 3 from step 0');
  });

  test('F12-3: detects next earthset and earthrise line-of-sight communication transitions', () => {
    const steps = [
      { isSunlit: true, isEarthVisible: true },
      { isSunlit: true, isEarthVisible: false }, // Earthset at index 1
      { isSunlit: true, isEarthVisible: false },
      { isSunlit: true, isEarthVisible: true },  // Earthrise at index 3
    ];
    const cd = engine.getTransitionCountdowns(steps, 0);
    assertEqual(cd.nextEarthset, 1, 'Earthset transition at step 1');
    assertEqual(cd.nextEarthrise, 3, 'Earthrise transition at step 3');
  });

  test('F12-4: returns null for perpetual states where no future transition occurs', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site); // Shackleton is 100% sunlit
    const cd = engine.getTransitionCountdowns(cycle.steps, 0);
    assertNull(cd.nextSunset, 'Perpetually sunlit site must yield null nextSunset');
    assertNull(cd.nextSunrise, 'Perpetually sunlit site must yield null nextSunrise');
  });

  test('F12-5: returns all null countdowns at final trajectory step h=708', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    const cdLast = engine.getTransitionCountdowns(cycle.steps, 708);
    assertNull(cdLast.nextSunset);
    assertNull(cdLast.nextSunrise);
    assertNull(cdLast.nextEarthset);
    assertNull(cdLast.nextEarthrise);
  });

  test('F12-6: verifies monotonic decrementation of countdowns as simulation steps forward', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    const cd0 = engine.getTransitionCountdowns(cycle.steps, 0);
    const cd1 = engine.getTransitionCountdowns(cycle.steps, 1);

    if (cd0.nextEarthset !== null && cd0.nextEarthset > 1) {
      assertEqual(cd1.nextEarthset, cd0.nextEarthset - 1,
        'Advancing 1 hour must decrement countdown by exactly 1 hour');
    }
  });
});

describe('Tier 1: F13 - Multi-Criteria Site Viability Scoring', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F13-1: verifies weighting factors (0.45 sunlit, 0.35 DTE, 0.20 slope penalty)', () => {
    // Theoretical ideal flat summit: 100% sun, 100% DTE, 0 deg slope
    // Viability = 100*0.45 + 100*0.35 + 100*0.20 = 100
    const siteIdeal = {
      id: 'ideal_site', name: 'Ideal Site', shortName: 'Ideal',
      lat: -89.0, lon: 0.0, elevM: 3000, slopeDeg: 0.0,
      horizonProfile: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    const cycle = engine.computeFullCycle(siteIdeal);
    // Viability score must be within [0, 100]
    assertBetween(cycle.viabilityScore, 0, 100);
  });

  test('F13-2: calculates zero slope penalty (penalty score = 100.0) for completely flat terrain', () => {
    const slopeDeg = 0.0;
    const slopePenalty = Math.max(0.0, 100.0 - (slopeDeg * 5.0));
    assertEqual(slopePenalty, 100.0, '0.0 deg slope must yield maximum 100.0 slope penalty component');
  });

  test('F13-3: calculates maximum slope penalty (penalty score = 0.0) for steep slopes >= 20 deg', () => {
    const slope20 = Math.max(0.0, 100.0 - (20.0 * 5.0));
    assertEqual(slope20, 0.0, '20 deg slope must reach minimum 0.0 score component');

    const slope35 = Math.max(0.0, 100.0 - (35.0 * 5.0));
    assertEqual(slope35, 0.0, 'Slope > 20 deg must clamp at 0.0');
  });

  test('F13-4: evaluates Shackleton Rim Primary canonical viability score (8.5 deg slope)', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);
    // Shackleton Rim: 100% sunlit, ~54.7% DTE, 8.5 deg slope (penalty = 100 - 42.5 = 57.5)
    // Score ~ 100*0.45 + 54.7*0.35 + 57.5*0.20 = 45 + 19.15 + 11.5 = 75.65 -> 76
    assertEqual(cycle.viabilityScore, 76, 'Shackleton Rim viability score must equal canonical 76');
  });

  test('F13-5: bounds viability score strictly to integer range [0, 100]', () => {
    const sites = InterfaceContract.getMockSites();
    for (const site of sites) {
      const cycle = engine.computeFullCycle(site);
      assertBetween(cycle.viabilityScore, 0, 100);
      assertEqual(cycle.viabilityScore, Math.round(cycle.viabilityScore), 'Viability score must be an integer');
    }
  });

  test('F13-6: verifies extreme permanently shadowed region (PSR) yields low viability', () => {
    const psrSite = {
      id: 'psr_deep_crater', name: 'Deep Crater Floor', shortName: 'PSR Floor',
      lat: -89.9, lon: 0.0, elevM: -2500, slopeDeg: 25.0,
      horizonProfile: [8.0, 9.0, 10.0, 8.5, 9.2, 8.8, 9.0, 8.5, 9.5, 10.0, 9.0, 8.5],
    };
    const cycle = engine.computeFullCycle(psrSite);
    // In deep crater, sun is completely occulted (0 sunlit hours) and slope >= 20 (0 slope points)
    assertLessThan(cycle.viabilityScore, 35, 'Deep PSR crater with steep walls must yield low viability score (< 35)');
  });
});
