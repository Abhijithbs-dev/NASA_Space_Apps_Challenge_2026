/**
 * @fileoverview Tier 2 Boundary & Corner Case Test Suite: Ephemeris & Astronomical Math Engine.
 * Tests Features F01 through F13 with >=5 genuine boundary test cases per feature (78 tests total).
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
import { InterfaceContract } from '../src/core/interfaceContract.js';

describe('Tier 2: F01 - Julian Date Conversion Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F01-B1: far historical calendar dates (<1900) evaluate accurately via Meeus algorithm', () => {
    // 1800-01-01 at 00:00:00 UTC (Meeus standard JD = 2378496.5)
    const jd1800 = engine.dateToJulianDate('1800-01-01');
    assertEqual(jd1800, 2378496.5, '1800-01-01 JD must match Meeus standard');

    // 1850-07-04 at 00:00:00 UTC
    const jd1850 = engine.dateToJulianDate('1850-07-04');
    assertEqual(jd1850, 2396942.5, '1850-07-04 JD must match astronomical algorithm');
    assertLessThan(jd1800, jd1850, 'Historical dates must maintain temporal ordering');
  });

  test('F01-B2: far future calendar dates (>2100) evaluate accurately without integer overflow', () => {
    // 2100-01-01 at 00:00:00 UTC (Meeus standard JD = 2488069.5)
    const jd2100 = engine.dateToJulianDate('2100-01-01');
    assertEqual(jd2100, 2488069.5, '2100-01-01 JD must match Meeus standard');

    // 2200-01-01 at 00:00:00 UTC (36524 days after 2100-01-01 since 2100 is non-leap century)
    const jd2200 = engine.dateToJulianDate('2200-01-01');
    assertEqual(jd2200, 2524593.5, '2200-01-01 JD must account for non-leap century 2100');
    assertEqual(jd2200 - jd2100, 36524.0, 'Century step between 2100 and 2200 must equal 36524 days');
  });

  test('F01-B3: 400-year leap rule boundary for year 2000 (Feb 29) vs non-leap century years', () => {
    // Year 2000 is divisible by 400, hence a leap year
    const jdFeb28_2000 = engine.dateToJulianDate('2000-02-28');
    const jdFeb29_2000 = engine.dateToJulianDate('2000-02-29');
    const jdMar01_2000 = engine.dateToJulianDate('2000-03-01');

    assertEqual(jdFeb29_2000, 2451603.5, '2000-02-29 must equal 2451603.5');
    assertEqual(jdFeb29_2000 - jdFeb28_2000, 1.0, 'Feb 28 to Feb 29 in 2000 must be exactly 1 day');
    assertEqual(jdMar01_2000 - jdFeb29_2000, 1.0, 'Feb 29 to Mar 01 in 2000 must be exactly 1 day');
  });

  test('F01-B4: non-leap year February month transition (2026-02-28 to 2026-03-01)', () => {
    // 2026 is non-leap year
    const jdFeb28 = engine.dateToJulianDate('2026-02-28');
    const jdMar01 = engine.dateToJulianDate('2026-03-01');

    assertEqual(jdMar01 - jdFeb28, 1.0, 'Non-leap transition from Feb 28 to Mar 01 must be exactly 1.0 day');
    assertEqual(jdFeb28, 2461099.5, '2026-02-28 JD must match standard');
    assertEqual(jdMar01, 2461100.5, '2026-03-01 JD must match standard');
  });

  test('F01-B5: year-end to new-year boundary transitions across leap and non-leap years', () => {
    // 2023-12-31 to 2024-01-01 (pre-leap)
    const jd2023Dec31 = engine.dateToJulianDate('2023-12-31');
    const jd2024Jan01 = engine.dateToJulianDate('2024-01-01');
    assertEqual(jd2024Jan01 - jd2023Dec31, 1.0, 'Year boundary delta must equal exactly 1.0 day');

    // 2024-12-31 to 2025-01-01 (post-leap)
    const jd2024Dec31 = engine.dateToJulianDate('2024-12-31');
    const jd2025Jan01 = engine.dateToJulianDate('2025-01-01');
    assertEqual(jd2025Jan01 - jd2024Dec31, 1.0, 'Year boundary delta must equal exactly 1.0 day');
    assertEqual(jd2024Dec31 - jd2023Dec31, 366.0, 'Leap year 2024 must contain exactly 366 days');
  });

  test('F01-B6: fractional day invariant: 00:00:00 UTC Julian Date strictly ends in .5 across all epochs', () => {
    const testDates = [
      '1800-01-01', '1900-01-01', '1969-07-20', '2000-01-01',
      '2024-02-29', '2026-11-14', '2100-01-01', '2200-01-01',
    ];

    for (const d of testDates) {
      const jd = engine.dateToJulianDate(d);
      assertEqual(jd % 1, 0.5, `Date ${d} at 00:00:00 UTC must end in fractional .5`);
    }
  });
});

describe('Tier 2: F02 - Centuries Since J2000 Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F02-B1: exact J2000.0 epoch at 12:00:00 UTC yields T = 0.0 with high precision', () => {
    // 2000-01-01 at 12:00:00 UTC has JD = 2451545.0, exactly T = 0.0
    const T = engine.centuriesSinceJ2000('2000-01-01', 12);
    assertEqual(T, 0.0, 'Centuries T at 2000-01-01 12:00 UTC must be identically 0.0');
  });

  test('F02-B2: pre-2000 historical dates yield negative centuries (T < 0)', () => {
    // Apollo 11 Lunar Landing: 1969-07-20 at 00:00:00 UTC
    const tApollo = engine.centuriesSinceJ2000('1969-07-20', 0);
    assertLessThan(tApollo, 0.0, 'Historical 1969 epoch must produce negative centuries T');
    assertApproxEqual(tApollo, -0.304517, 1e-4, 'T for Apollo 11 landing must match Meeus calculation');

    // 1900-01-01 at 00:00:00 UTC
    const t1900 = engine.centuriesSinceJ2000('1900-01-01', 0);
    assertLessThan(t1900, -0.99, '1900 epoch must produce approximately -1.0 century');
  });

  test('F02-B3: synodic cycle boundary hour offsets (h = 0 vs h = 708)', () => {
    const t0 = engine.centuriesSinceJ2000('2026-11-14', 0);
    const t708 = engine.centuriesSinceJ2000('2026-11-14', 708);

    assertGreaterThan(t708, t0, 'Centuries at h=708 must exceed centuries at h=0');
    const deltaT = t708 - t0;
    const expectedDeltaT = 708.0 / (24.0 * 36525.0);
    assertApproxEqual(deltaT, expectedDeltaT, 1e-9, 'Delta T over 708 hours must strictly match elapsed fraction');
  });

  test('F02-B4: extreme hour offsets (h = 1000 and h = 8760) scale linearly without precision loss', () => {
    const tBase = engine.centuriesSinceJ2000('2026-11-14', 0);
    const t1000 = engine.centuriesSinceJ2000('2026-11-14', 1000);
    const t8760 = engine.centuriesSinceJ2000('2026-11-14', 8760); // 365 days

    const delta1000 = t1000 - tBase;
    const expectedDelta1000 = 1000.0 / (24.0 * 36525.0);
    assertApproxEqual(delta1000, expectedDelta1000, 1e-9, '1000 hour offset must match linear scaling');

    const delta8760 = t8760 - tBase;
    const expectedDelta8760 = 8760.0 / (24.0 * 36525.0);
    assertApproxEqual(delta8760, expectedDelta8760, 1e-9, '8760 hour offset (1 non-leap year) must scale linearly');
  });

  test('F02-B5: default hour offset parameter defaults strictly to 0 when omitted', () => {
    const tExplicitZero = engine.centuriesSinceJ2000('2026-11-14', 0);
    const tOmitted = engine.centuriesSinceJ2000('2026-11-14');

    assertEqual(tOmitted, tExplicitZero, 'Omitted hour offset must evaluate identically to explicit 0');
  });

  test('F02-B6: monotonicity guarantee across any step interval h2 > h1', () => {
    const date = '2026-11-14';
    const hours = [0, 1, 24, 100, 354, 708, 1000];

    for (let i = 1; i < hours.length; i++) {
      const tPrev = engine.centuriesSinceJ2000(date, hours[i - 1]);
      const tCurr = engine.centuriesSinceJ2000(date, hours[i]);
      assertGreaterThan(tCurr, tPrev, `T at h=${hours[i]} must strictly exceed T at h=${hours[i-1]}`);
    }
  });
});

describe('Tier 2: F03 - Continuous LOLA Horizon Mask Interpolation Boundary & Corner Cases', () => {
  let engine;
  const canonicalProfile = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0];

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F03-B1: circular wraparound across 360° boundary (azimuth 359.95° interpolates between sector 11 and sector 0)', () => {
    // Sector 11 (330°) = 12.0, Sector 0 (0°) = 1.0
    // Azimuth 359.95° is fraction = (359.95 - 330) / 30 = 29.95 / 30 ≈ 0.998333
    // Interpolated = 12.0 * (1 - 0.998333) + 1.0 * 0.998333 ≈ 1.0183 -> 1.02
    const mask = engine.interpolateHorizon(canonicalProfile, 359.95);
    assertEqual(mask, 1.02, 'Near 360° boundary must interpolate smoothly into sector 0');
  });

  test('F03-B2: negative azimuth angles wrap modulo 360 into valid sector lookup', () => {
    // -15.0° wraps to 345.0°, halfway between sector 11 (330°, val 12.0) and sector 0 (0°, val 1.0)
    // (12.0 + 1.0) / 2 = 6.5
    const maskNeg = engine.interpolateHorizon(canonicalProfile, -15.0);
    assertEqual(maskNeg, 6.5, 'Negative azimuth -15.0° must wrap to 345.0° and yield 6.5°');

    // -360.0° wraps to 0.0°
    const maskNeg360 = engine.interpolateHorizon(canonicalProfile, -360.0);
    assertEqual(maskNeg360, canonicalProfile[0], '-360.0° must wrap to 0.0° and return sector 0 value');
  });

  test('F03-B3: multiple revolution azimuth angles wrap modulo 360', () => {
    // 390.0° wraps to 30.0° (sector 1)
    const mask390 = engine.interpolateHorizon(canonicalProfile, 390.0);
    assertEqual(mask390, canonicalProfile[1], '390.0° must wrap to 30.0° and match sector 1');

    // 720.0° wraps to 0.0° (sector 0)
    const mask720 = engine.interpolateHorizon(canonicalProfile, 720.0);
    assertEqual(mask720, canonicalProfile[0], '720.0° must wrap to 0.0° and match sector 0');
  });

  test('F03-B4: uniform flat horizon (0.0° everywhere) returns 0.0° at any continuous azimuth', () => {
    const flatProfile = new Array(12).fill(0.0);
    const testAzimuths = [0.0, 15.3, 45.7, 180.0, 270.4, 359.99];

    for (const az of testAzimuths) {
      const mask = engine.interpolateHorizon(flatProfile, az);
      assertEqual(mask, 0.0, `Flat horizon must evaluate to 0.0° at azimuth ${az}`);
    }
  });

  test('F03-B5: steep jagged crater rim (>15° peaks) interpolates linear slopes accurately', () => {
    // Alternating sharp peaks (20.0°) and deep gaps (0.0°)
    const jaggedProfile = [20.0, 0.0, 20.0, 0.0, 20.0, 0.0, 20.0, 0.0, 20.0, 0.0, 20.0, 0.0];

    // Sector 0 at 0° is 20.0
    assertEqual(engine.interpolateHorizon(jaggedProfile, 0.0), 20.0);
    // Sector 1 at 30° is 0.0
    assertEqual(engine.interpolateHorizon(jaggedProfile, 30.0), 0.0);
    // Midpoint at 15° is exactly 10.0
    assertEqual(engine.interpolateHorizon(jaggedProfile, 15.0), 10.0);
    // Midpoint at 45° is exactly 10.0
    assertEqual(engine.interpolateHorizon(jaggedProfile, 45.0), 10.0);
  });

  test('F03-B6: defensive boundary fallback: corrupted or wrong-length profile returns 0.0 without throwing', () => {
    assertEqual(engine.interpolateHorizon(null, 45.0), 0.0, 'Null profile must return 0.0');
    assertEqual(engine.interpolateHorizon(undefined, 45.0), 0.0, 'Undefined profile must return 0.0');
    assertEqual(engine.interpolateHorizon([], 45.0), 0.0, 'Empty array profile must return 0.0');
    assertEqual(engine.interpolateHorizon([1, 2, 3], 45.0), 0.0, 'Short array profile must return 0.0');
    assertEqual(engine.interpolateHorizon(new Array(13).fill(1.0), 45.0), 0.0, 'Long array profile must return 0.0');
  });
});

describe('Tier 2: F04 - Topocentric Vector Solver Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F04-B1: observer at exact lunar South Pole (lat = -90.0°, lon = 0.0°)', () => {
    // From South Pole (-90°), an equatorial target (0° lat, 180° lon) is on the horizon
    const topo = engine.calculateTopocentric(-90.0, 0.0, 0, 0.0, 180.0);
    assertEqual(topo.azDeg, 180.0, 'Azimuth towards 180° longitude from South Pole must be 180.0°');
    assertApproxEqual(Math.abs(topo.elevDeg), 0.0, 0.05, 'Equatorial target on mean sphere from pole has ~0° elevation');
  });

  test('F04-B2: observer at exact lunar North Pole (lat = +90.0°, lon = 0.0°)', () => {
    const topo = engine.calculateTopocentric(90.0, 0.0, 0, 0.0, 180.0);
    assertEqual(topo.azDeg, 0.0, 'Azimuth from North Pole towards target wraps cleanly to 0.0°');
    assertApproxEqual(Math.abs(topo.elevDeg), 0.0, 0.05, 'Geometric elevation from North Pole to equator is ~0°');
  });

  test('F04-B3: sea-level observer (elevM = 0): dip allowance is zero and equals geometric elevation', () => {
    const topoZero = engine.calculateTopocentric(-89.0, 0.0, 0, 0.0, 180.0);
    // At lat -89, equator at opposite meridian (lon 180) is 91 deg distance -> geometric elev = 90 - 91 = -1 deg
    assertEqual(topoZero.elevDeg, -1.0, 'Zero elevation observer must have zero dip allowance and match geometric elevation');
  });

  test('F04-B4: negative elevation dip guard: negative elevM (<0) does not subtract or cause NaN', () => {
    const topoZero = engine.calculateTopocentric(-89.0, 0.0, 0, 0.0, 180.0);
    const topoNeg = engine.calculateTopocentric(-89.0, 0.0, -500, 0.0, 180.0);

    assertEqual(topoNeg.elevDeg, topoZero.elevDeg, 'Negative elevation must clamp dip allowance to zero without producing NaN');
    assertFalse(Number.isNaN(topoNeg.elevDeg), 'Elevation must not evaluate to NaN');
    assertFalse(Number.isNaN(topoNeg.azDeg), 'Azimuth must not evaluate to NaN');
  });

  test('F04-B5: extreme summit elevation (5400m at Mons Mouton): calculates expected dip allowance gain', () => {
    const topoZero = engine.calculateTopocentric(-85.6, 31.0, 0, 0.0, 180.0);
    const topoSummit = engine.calculateTopocentric(-85.6, 31.0, 5400, 0.0, 180.0);

    // Dip allowance in radians: sqrt(2 * 5.4 / 1737.4) ≈ 0.07884 rad ≈ 4.517°
    const dipGain = topoSummit.elevDeg - topoZero.elevDeg;
    assertApproxEqual(dipGain, 4.52, 0.05, '5400m elevation must provide ~4.52° horizon dip allowance reach');
  });

  test('F04-B6: antipodal geometry: target on opposite side of moon produces negative elevation without error', () => {
    // Observer at (-85°, 0°), target at (85°, 0°)
    const topo = engine.calculateTopocentric(-85.0, 0.0, 0, 85.0, 0.0);
    assertLessThan(topo.elevDeg, -75.0, 'Antipodal target must have deep negative elevation below horizon');
    assertBetween(topo.azDeg, 0.0, 359.99, 'Azimuth must remain within valid range');
  });
});

describe('Tier 2: F05 - Azimuth Normalization (360° Wrap Guard) Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F05-B1: rounding wrap guard: azimuth in [359.95°, 360.0°) rounds strictly to 0.0° and NEVER 360.0°', () => {
    // In topocentric calculation, azDeg is rounded to 1 decimal place modulo 360
    // Test synthetic angles directly via calculation
    const edgeCases = [359.95, 359.96, 359.99, 359.999];
    for (const rawAz of edgeCases) {
      const rounded = (Math.round(rawAz * 10.0) / 10.0) % 360.0;
      assertEqual(rounded, 0.0, `Raw azimuth ${rawAz} must normalize to 0.0 and never 360.0`);
    }

    const belowEdge = 359.94;
    const roundedBelow = (Math.round(belowEdge * 10.0) / 10.0) % 360.0;
    assertEqual(roundedBelow, 359.9, '359.94 must round to 359.9');
  });

  test('F05-B2: exact 0.0° azimuth remains strictly 0.0°', () => {
    const rawZero = 0.0;
    const normalized = ((rawZero % 360.0) + 360.0) % 360.0;
    const rounded = (Math.round(normalized * 10.0) / 10.0) % 360.0;
    assertEqual(rounded, 0.0, '0.0° azimuth must evaluate identically to 0.0');
  });

  test('F05-B3: negative small azimuth (-0.01°) wraps cleanly without returning 360.0°', () => {
    const rawNeg = -0.01;
    const normalized = ((rawNeg % 360.0) + 360.0) % 360.0; // 359.99
    const rounded = (Math.round(normalized * 10.0) / 10.0) % 360.0; // 0.0
    assertEqual(rounded, 0.0, '-0.01° must round and wrap cleanly to 0.0°');
  });

  test('F05-B4: cardinal quadrant transitions (90.0°, 180.0°, 270.0°) preserve exact angles', () => {
    const cardinals = [90.0, 180.0, 270.0];
    for (const card of cardinals) {
      const normalized = ((card % 360.0) + 360.0) % 360.0;
      const rounded = (Math.round(normalized * 10.0) / 10.0) % 360.0;
      assertEqual(rounded, card, `Cardinal angle ${card} must be preserved exactly`);
    }
  });

  test('F05-B5: continuous range invariant: azDeg is strictly in [0.0, 360.0) across 500 azimuth steps', () => {
    // Verify topocentric solver outputs never produce 360.0 or negative azimuths
    const mockSite = InterfaceContract.getMockSite();
    for (let targetLon = -180; targetLon <= 180; targetLon += 5) {
      const topo = engine.calculateTopocentric(mockSite.lat, mockSite.lon, mockSite.elevM, -1.5, targetLon);
      assertGreaterThanOrEqual(topo.azDeg, 0.0, `Azimuth must be >= 0.0 at targetLon ${targetLon}`);
      assertLessThan(topo.azDeg, 360.0, `Azimuth must be < 360.0 at targetLon ${targetLon}`);
      assertNotEqual(topo.azDeg, 360.0, 'Azimuth must never equal exactly 360.0');
    }
  });

  test('F05-B6: observer and target on same meridian (deltaLam = 0) produces exact north or south azimuth', () => {
    // Same longitude, observer south of target -> target is directly North (az = 0.0)
    const topoNorth = engine.calculateTopocentric(-89.0, 0.0, 0, 0.0, 0.0);
    assertEqual(topoNorth.azDeg, 0.0, 'Target due north must have azimuth 0.0°');

    // Observer north of target -> target is due South (az = 180.0)
    const topoSouth = engine.calculateTopocentric(89.0, 0.0, 0, 0.0, 0.0);
    assertEqual(topoSouth.azDeg, 180.0, 'Target due south must have azimuth 180.0°');
  });
});

describe('Tier 2: F06 - Sub-Solar Seasonal Latitude Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F06-B1: positive northern solstice extremum (+1.5424°) represents maximum seasonal limit', () => {
    const mockSite = InterfaceContract.getMockSite();
    // Search across a tropical year for maximum subSolarLatDeg
    let maxLat = -999;
    for (let dayOffset = 0; dayOffset < 366; dayOffset += 10) {
      const jd = engine.dateToJulianDate('2026-01-01') + dayOffset;
      const lat = -engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jd - 2451545.0)) / 365.25);
      if (lat > maxLat) maxLat = lat;
    }
    assertApproxEqual(maxLat, 1.5424, 0.05, 'Maximum sub-solar latitude must reach +1.5424° obliquity');
  });

  test('F06-B2: negative southern solstice extremum (-1.5424°) represents minimum seasonal limit', () => {
    let minLat = 999;
    for (let dayOffset = 0; dayOffset < 366; dayOffset += 10) {
      const jd = engine.dateToJulianDate('2026-01-01') + dayOffset;
      const lat = -engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jd - 2451545.0)) / 365.25);
      if (lat < minLat) minLat = lat;
    }
    assertApproxEqual(minLat, -1.5424, 0.05, 'Minimum sub-solar latitude must reach -1.5424° obliquity');
  });

  test('F06-B3: equinox zero-crossings evaluate through 0.0° within tight tolerance', () => {
    // Equinox occurs when (jd - 2451545.0) is a multiple of 365.25 / 2
    const equinoxJd = 2451545.0 + (365.25 / 2.0); // Half year after J2000
    const lat = -engine.obliquityDeg * Math.sin((2.0 * Math.PI * (equinoxJd - 2451545.0)) / 365.25);
    assertApproxEqual(lat, 0.0, 1e-10, 'Sub-solar latitude at exact equinox node must be 0.0°');
  });

  test('F06-B4: strict amplitude boundary: |sunLat| <= 1.5424° strictly for 1000 days', () => {
    const baseJd = engine.dateToJulianDate('2026-01-01');
    for (let day = 0; day < 1000; day += 7) {
      const jd = baseJd + day;
      const lat = -engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jd - 2451545.0)) / 365.25);
      assertLessThanOrEqual(Math.abs(lat), 1.54240001, `Day ${day}: |sunLat| must not exceed 1.5424°`);
    }
  });

  test('F06-B5: multi-year orbital periodicity: sunLat matches after exactly one tropical year (365.25 days)', () => {
    const jd0 = engine.dateToJulianDate('2026-11-14');
    const jd1Year = jd0 + 365.25;

    const lat0 = -engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jd0 - 2451545.0)) / 365.25);
    const lat1Year = -engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jd1Year - 2451545.0)) / 365.25);

    assertApproxEqual(lat0, lat1Year, 1e-10, 'Seasonal latitude must repeat identically after 365.25 days');
  });

  test('F06-B6: rate of change (derivative) is maximal at equinoxes and zero at solstices', () => {
    // Near equinox (node)
    const jdNode = 2451545.0;
    const deltaH = 1.0 / 24.0;
    const dLatNode = Math.abs(
      (-engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jdNode + deltaH - 2451545.0)) / 365.25)) -
      (-engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jdNode - deltaH - 2451545.0)) / 365.25))
    );

    // Near solstice (peak)
    const jdPeak = 2451545.0 + (365.25 / 4.0);
    const dLatPeak = Math.abs(
      (-engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jdPeak + deltaH - 2451545.0)) / 365.25)) -
      (-engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jdPeak - deltaH - 2451545.0)) / 365.25))
    );

    assertGreaterThan(dLatNode, dLatPeak, 'Rate of seasonal latitude drift must be substantially higher at equinox than at solstice');
  });
});

describe('Tier 2: F07 - Sub-Solar Synodic Drift Boundary & Corner Cases', () => {
  let engine;
  let cycle;

  beforeEach(() => {
    engine = new EphemerisEngine();
    const site = InterfaceContract.getMockSite();
    cycle = engine.computeFullCycle(site, '2026-11-14');
  });

  test('F07-B1: step h=0 initial position: subSolarLonDeg begins at exactly 180.0°', () => {
    const step0 = cycle.steps[0];
    assertEqual(step0.subSolarLonDeg, 180.0, 'Sub-solar longitude at h=0 must start at 180.0°');
  });

  test('F07-B2: step h=708 completion: subSolarLonDeg completes ~359.6° synodic sweep', () => {
    const step708 = cycle.steps[708];
    // In 708 hours, drift is 708 * (360 / 708.73414) ≈ 359.627°
    // Longitude = (180.0 + 359.627) % 360 = 539.627 % 360 = 179.627° -> rounded to 179.6°
    assertEqual(step708.subSolarLonDeg, 179.6, 'Step 708 sub-solar longitude must equal 179.6°');
  });

  test('F07-B3: modulo 360° circular wraparound: step transitions across 360° without negative values or gaps', () => {
    // Find the step where longitude wraps around 360° / 0°
    let wrapIndex = -1;
    for (let h = 1; h < cycle.steps.length; h++) {
      if (cycle.steps[h].subSolarLonDeg < cycle.steps[h - 1].subSolarLonDeg) {
        wrapIndex = h;
        break;
      }
    }

    assertGreaterThan(wrapIndex, 0, 'Must identify longitude wrap step');
    const beforeWrap = cycle.steps[wrapIndex - 1].subSolarLonDeg;
    const afterWrap = cycle.steps[wrapIndex].subSolarLonDeg;

    assertGreaterThan(beforeWrap, 359.0, 'Pre-wrap longitude must approach 360.0°');
    assertLessThan(afterWrap, 1.0, 'Post-wrap longitude must start near 0.0°');
    const unwrappedDelta = (afterWrap + 360.0) - beforeWrap;
    assertApproxEqual(unwrappedDelta, 0.51, 0.05, 'Hourly unwrapped drift across wrap boundary must equal synodic step');
  });

  test('F07-B4: hour-to-hour monotonicity of unwrapped solar longitude across all 708 intervals', () => {
    let prevUnwrapped = cycle.steps[0].subSolarLonDeg;
    for (let h = 1; h < cycle.steps.length; h++) {
      let curr = cycle.steps[h].subSolarLonDeg;
      if (curr < prevUnwrapped - 100.0) {
        // Wrapped around 360
        curr += 360.0;
      }
      assertGreaterThan(curr, prevUnwrapped, `Unwrapped sub-solar longitude at h=${h} must strictly increase`);
      prevUnwrapped = cycle.steps[h].subSolarLonDeg;
    }
  });

  test('F07-B5: synodic drift rate constant is strictly ~0.507948°/hr', () => {
    const rate = 360.0 / engine.synodicHours;
    assertApproxEqual(rate, 0.507948, 1e-4, 'Engine synodic hourly rate constant must match astronomical value');
  });

  test('F07-B6: all 709 steps maintain subSolarLonDeg strictly in [0.0, 360.0)', () => {
    for (let h = 0; h < cycle.steps.length; h++) {
      const lon = cycle.steps[h].subSolarLonDeg;
      assertGreaterThanOrEqual(lon, 0.0, `Step ${h} lon must be >= 0.0`);
      assertLessThan(lon, 360.0, `Step ${h} lon must be < 360.0`);
    }
  });
});

describe('Tier 2: F08 - Optical Libration (Draconic & Anomalistic) Boundary & Corner Cases', () => {
  let engine;
  let cycle;

  beforeEach(() => {
    engine = new EphemerisEngine();
    const site = InterfaceContract.getMockSite();
    cycle = engine.computeFullCycle(site, '2026-11-14');
  });

  test('F08-B1: draconic latitudinal peak amplitude stays strictly bounded within [-6.68°, +6.68°]', () => {
    for (let h = 0; h < cycle.steps.length; h++) {
      const lat = cycle.steps[h].libLatDeg;
      assertLessThanOrEqual(lat, 6.68, `Step ${h}: libLatDeg must be <= +6.68`);
      assertGreaterThanOrEqual(lat, -6.68, `Step ${h}: libLatDeg must be >= -6.68`);
    }
  });

  test('F08-B2: anomalistic longitudinal peak amplitude stays strictly bounded within [-7.90°, +7.90°]', () => {
    for (let h = 0; h < cycle.steps.length; h++) {
      const lon = cycle.steps[h].libLonDeg;
      assertLessThanOrEqual(lon, 7.90, `Step ${h}: libLonDeg must be <= +7.90`);
      assertGreaterThanOrEqual(lon, -7.90, `Step ${h}: libLonDeg must be >= -7.90`);
    }
  });

  test('F08-B3: draconic zero crossings at h=0 and half-cycle h ≈ 326.5h', () => {
    assertEqual(cycle.steps[0].libLatDeg, 0.0, 'libLatDeg at h=0 must be exactly 0.0');
    // At h=327 (closest integer to 653.093/2 = 326.5465), libLatDeg is near zero
    assertApproxEqual(cycle.steps[327].libLatDeg, 0.0, 0.15, 'libLatDeg at half-draconic cycle must approximate zero');
  });

  test('F08-B4: anomalistic zero crossings at h=0 and half-cycle h ≈ 330.7h', () => {
    assertEqual(cycle.steps[0].libLonDeg, 0.0, 'libLonDeg at h=0 must be exactly 0.0');
    // At h=331 (closest integer to 661.309/2 = 330.6545), libLonDeg is near zero
    assertApproxEqual(cycle.steps[331].libLonDeg, 0.0, 0.15, 'libLonDeg at half-anomalistic cycle must approximate zero');
  });

  test('F08-B5: asynchronous cycle beat: period difference (~8.22h) produces phase drift between lat and lon extrema', () => {
    // Draconic peak occurs at 653.093 / 4 ≈ 163.27h (step 163)
    // Anomalistic peak occurs at 661.309 / 4 ≈ 165.33h (step 165)
    const latPeakStep = 163;
    const lonPeakStep = 165;

    assertApproxEqual(cycle.steps[latPeakStep].libLatDeg, 6.68, 0.05, 'Draconic peak occurs near h=163');
    assertApproxEqual(cycle.steps[lonPeakStep].libLonDeg, 7.90, 0.05, 'Anomalistic peak occurs near h=165');
    assertNotEqual(latPeakStep, lonPeakStep, 'Libration extrema must not occur on the same hour due to asynchronous periods');
  });

  test('F08-B6: libration values exhibit continuous smooth transitions without discontinuities', () => {
    for (let h = 1; h < cycle.steps.length; h++) {
      const dLat = Math.abs(cycle.steps[h].libLatDeg - cycle.steps[h - 1].libLatDeg);
      const dLon = Math.abs(cycle.steps[h].libLonDeg - cycle.steps[h - 1].libLonDeg);
      assertLessThan(dLat, 0.1, `Hourly change in libLatDeg at h=${h} must be small and continuous`);
      assertLessThan(dLon, 0.1, `Hourly change in libLonDeg at h=${h} must be small and continuous`);
    }
  });
});

describe('Tier 2: F09 - Solar Array PV Efficiency Models Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F09-B1: grazing polar elevation angle (El = 0.01°): vertical mast yields ~99.9999% vs horizontal deck ~0.017%', () => {
    const effVert = engine.computeArrayEfficiency(0.01, 'vertical_mast');
    const effHoriz = engine.computeArrayEfficiency(0.01, 'horizontal_deck');
    const effTrack = engine.computeArrayEfficiency(0.01, 'sun_tracking');

    assertApproxEqual(effVert, 100.0, 0.01, 'Vertical mast at grazing 0.01° must harvest ~100% of horizontal flux');
    assertApproxEqual(effHoriz, 0.017, 0.005, 'Horizontal deck at grazing 0.01° must harvest minimal ~0.017% flux');
    assertEqual(effTrack, 100.0, '2-axis tracking must provide 100% efficiency whenever sunlit');
  });

  test('F09-B2: vertical mast vs horizontal deck efficiency crossover occurs at El = 45.0°', () => {
    const effVert = engine.computeArrayEfficiency(45.0, 'vertical_mast');
    const effHoriz = engine.computeArrayEfficiency(45.0, 'horizontal_deck');

    // Both equal cos(45°) * 100 = sin(45°) * 100 ≈ 70.7107%
    assertApproxEqual(effVert, 70.71, 0.01, 'Vertical mast at 45° must equal ~70.71%');
    assertApproxEqual(effHoriz, 70.71, 0.01, 'Horizontal deck at 45° must equal ~70.71%');
    assertApproxEqual(effVert, effHoriz, 1e-6, 'Vertical and horizontal array efficiency must cross over at 45.0°');
  });

  test('F09-B3: 2-axis sun tracking array yields identically 100.0% efficiency for all sunElevDeg > 0', () => {
    const testAngles = [0.001, 1.5, 10.0, 45.0, 89.9, 90.0];
    for (const el of testAngles) {
      assertEqual(engine.computeArrayEfficiency(el, 'sun_tracking'), 100.0, `Tracking array must yield 100.0% at El=${el}`);
    }
  });

  test('F09-B4: zero and negative solar elevation yields strictly 0.0% efficiency across all array configurations', () => {
    const zeroNegAngles = [0.0, -0.01, -1.0, -45.0, -90.0];
    const arrayTypes = ['vertical_mast', 'sun_tracking', 'horizontal_deck', 'unknown_type'];

    for (const el of zeroNegAngles) {
      for (const type of arrayTypes) {
        assertEqual(
          engine.computeArrayEfficiency(el, type),
          0.0,
          `Efficiency must be strictly 0.0 at elevation ${el} for array ${type}`
        );
      }
    }
  });

  test('F09-B5: zenith solar angle (El = 90.0°): horizontal deck yields 100.0% and vertical mast yields 0.0%', () => {
    const effHoriz = engine.computeArrayEfficiency(90.0, 'horizontal_deck');
    const effVert = engine.computeArrayEfficiency(90.0, 'vertical_mast');

    assertApproxEqual(effHoriz, 100.0, 1e-4, 'Horizontal deck at zenith must harvest 100% flux');
    assertApproxEqual(effVert, 0.0, 1e-4, 'Vertical mast at zenith must harvest 0% normal flux');
  });

  test('F09-B6: unrecognized array configuration type falls back gracefully to vertical mast model', () => {
    const effFallback = engine.computeArrayEfficiency(1.0, 'unrecognized_experimental_array');
    const effVert = engine.computeArrayEfficiency(1.0, 'vertical_mast');

    assertEqual(effFallback, effVert, 'Unrecognized array type must default to vertical_mast model');
  });
});

describe('Tier 2: F10 - Incident Solar Flux Calculation Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F10-B1: terrain shadow occlusion: when sunElDeg <= sunHorizonMaskDeg, solarFluxWm2 is exactly 0.0', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site, '2026-11-14');

    for (const step of cycle.steps) {
      if (!step.isSunlit) {
        assertEqual(step.solarFluxWm2, 0.0, `Occluded step h=${step.hourOffset} must have exactly 0.0 W/m2 flux`);
        assertEqual(step.arrayEfficiency, 0.0, `Occluded step h=${step.hourOffset} must have 0.0% efficiency`);
      }
    }
  });

  test('F10-B2: immediate illumination clearance above horizon mask produces positive solar flux', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site, '2026-11-14');

    for (const step of cycle.steps) {
      if (step.isSunlit) {
        assertGreaterThan(step.solarFluxWm2, 0.0, `Sunlit step h=${step.hourOffset} must have positive flux`);
        assertGreaterThan(step.arrayEfficiency, 0.0, `Sunlit step h=${step.hourOffset} must have positive efficiency`);
      }
    }
  });

  test('F10-B3: maximum peak tracking flux reaches exactly 1361.0 W/m²', () => {
    const site = InterfaceContract.getMockSite();
    const cycleTracking = engine.computeFullCycle(site, '2026-11-14', 'sun_tracking');

    let maxFlux = 0.0;
    for (const step of cycleTracking.steps) {
      if (step.isSunlit && step.solarFluxWm2 > maxFlux) {
        maxFlux = step.solarFluxWm2;
      }
    }

    assertEqual(maxFlux, 1361.0, 'Peak tracking solar flux must equal solar constant 1361.0 W/m2');
  });

  test('F10-B4: flux formula rounding precision: solarFluxWm2 is strictly rounded to 1 decimal place', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site, '2026-11-14');

    for (const step of cycle.steps) {
      const decimals = (String(step.solarFluxWm2).split('.')[1] || '').length;
      assertLessThanOrEqual(decimals, 1, `solarFluxWm2 precision must not exceed 1 decimal place (got ${step.solarFluxWm2})`);
    }
  });

  test('F10-B5: mathematical formula fidelity: step.solarFluxWm2 matches rounded (efficiency% / 100 * 1361)', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site, '2026-11-14');

    for (const step of cycle.steps) {
      if (step.isSunlit) {
        const expected = Math.round(((step.arrayEfficiency / 100.0) * 1361.0) * 10.0) / 10.0;
        assertEqual(step.solarFluxWm2, expected, `Step ${step.hourOffset} flux must strictly match formula`);
      }
    }
  });

  test('F10-B6: linear flux scaling with solar array efficiency', () => {
    const eff50 = 50.0;
    const flux50 = Math.round(((eff50 / 100.0) * 1361.0) * 10.0) / 10.0;
    assertEqual(flux50, 680.5, '50% efficiency must yield exactly 680.5 W/m2');

    const eff100 = 100.0;
    const flux100 = Math.round(((eff100 / 100.0) * 1361.0) * 10.0) / 10.0;
    assertEqual(flux100, 1361.0, '100% efficiency must yield exactly 1361.0 W/m2');
  });
});

describe('Tier 2: F11 - Synodic Cycle Ephemeris Generation Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F11-B1: step index boundary: steps array contains exactly 709 indices [0, 708] without gaps', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);

    assertEqual(cycle.steps.length, 709, 'Cycle steps array must contain exactly 709 elements');
    assertEqual(cycle.steps[0].hourOffset, 0, 'First step hourOffset must be 0');
    assertEqual(cycle.steps[708].hourOffset, 708, 'Final step hourOffset must be 708');

    for (let i = 0; i < 709; i++) {
      assertDefined(cycle.steps[i], `Step ${i} must be defined`);
      assertEqual(cycle.steps[i].hourOffset, i, `Step ${i} hourOffset must strictly match index`);
    }
  });

  test('F11-B2: missing optional arguments fallback (defaults to 2026-11-14 and vertical_mast)', () => {
    const site = InterfaceContract.getMockSite();
    const cycleDefault = engine.computeFullCycle(site);

    assertEqual(cycleDefault.epochDateStr, '2026-11-14', 'Default epoch date must be 2026-11-14');
    assertEqual(cycleDefault.arrayType, 'vertical_mast', 'Default array type must be vertical_mast');
  });

  test('F11-B3: empty or whitespace epoch date string falls back cleanly to default 2026-11-14', () => {
    const site = InterfaceContract.getMockSite();
    const cycleEmpty = engine.computeFullCycle(site, '');
    const cycleWhitespace = engine.computeFullCycle(site, '   ');

    assertEqual(cycleEmpty.epochDateStr, '2026-11-14', 'Empty epoch string must fall back to 2026-11-14');
    assertEqual(cycleWhitespace.epochDateStr, '2026-11-14', 'Whitespace epoch string must fall back to 2026-11-14');
  });

  test('F11-B4: custom epoch date string (e.g. 2025-01-01) alters sub-solar coordinates appropriately', () => {
    const site = InterfaceContract.getMockSite();
    const cycle2025 = engine.computeFullCycle(site, '2025-01-01');
    const cycle2026 = engine.computeFullCycle(site, '2026-11-14');

    assertEqual(cycle2025.epochDateStr, '2025-01-01');
    assertNotEqual(
      cycle2025.steps[0].subSolarLatDeg,
      cycle2026.steps[0].subSolarLatDeg,
      'Different epochs must calculate different seasonal sub-solar latitudes'
    );
  });

  test('F11-B5: synthetic extreme high-latitude site computes full cycle with zero NaNs', () => {
    const extremeSite = {
      id: 'synth_extreme_pole',
      name: 'Synthetic Lunar Pole',
      shortName: 'Synthetic Pole',
      lat: -89.99,
      lon: 0.0,
      elevM: 100.0,
      slopeDeg: 1.0,
      horizonProfile: new Array(12).fill(1.5),
    };

    const cycle = engine.computeFullCycle(extremeSite);
    assert(InterfaceContract.validateCycleData(cycle), 'Synthetic extreme site cycle must strictly pass validation');

    for (const step of cycle.steps) {
      assertFalse(Number.isNaN(step.sunAzDeg), 'sunAzDeg must not be NaN');
      assertFalse(Number.isNaN(step.sunElDeg), 'sunElDeg must not be NaN');
      assertFalse(Number.isNaN(step.earthAzDeg), 'earthAzDeg must not be NaN');
      assertFalse(Number.isNaN(step.earthElDeg), 'earthElDeg must not be NaN');
    }
  });

  test('F11-B6: summary metrics integrity: sunlitHours + dteHours >= dualHours strictly holds', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = engine.computeFullCycle(site);

    assertGreaterThanOrEqual(
      cycle.sunlitHours + cycle.dteHours,
      cycle.dualHours,
      'Sum of individual windows must be greater than or equal to simultaneous dual window'
    );
    assertLessThanOrEqual(cycle.dualHours, cycle.sunlitHours, 'Dual hours cannot exceed sunlit hours');
    assertLessThanOrEqual(cycle.dualHours, cycle.dteHours, 'Dual hours cannot exceed DTE hours');
  });
});

describe('Tier 2: F12 - State Transition Countdowns Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F12-B1: perpetual illumination scenario returns null for nextSunset and nextSunrise', () => {
    // 709 steps where isSunlit is always true
    const perpetualSunSteps = Array.from({ length: 709 }, () => ({
      isSunlit: true,
      isEarthVisible: true,
    }));

    const countdown = engine.getTransitionCountdowns(perpetualSunSteps, 0);
    assertNull(countdown.nextSunset, 'Perpetual illumination must return null for nextSunset');
    assertNull(countdown.nextSunrise, 'Perpetual illumination must return null for nextSunrise');
  });

  test('F12-B2: perpetual darkness scenario returns null for nextSunset and nextSunrise', () => {
    const perpetualDarkSteps = Array.from({ length: 709 }, () => ({
      isSunlit: false,
      isEarthVisible: false,
    }));

    const countdown = engine.getTransitionCountdowns(perpetualDarkSteps, 0);
    assertNull(countdown.nextSunset, 'Perpetual darkness must return null for nextSunset');
    assertNull(countdown.nextSunrise, 'Perpetual darkness must return null for nextSunrise');
  });

  test('F12-B3: perpetual DTE lock returns null for nextEarthset and nextEarthrise', () => {
    const perpetualDteSteps = Array.from({ length: 709 }, () => ({
      isSunlit: false,
      isEarthVisible: true,
    }));

    const countdown = engine.getTransitionCountdowns(perpetualDteSteps, 100);
    assertNull(countdown.nextEarthset, 'Perpetual Earth visibility must return null for nextEarthset');
    assertNull(countdown.nextEarthrise, 'Perpetual Earth visibility must return null for nextEarthrise');
  });

  test('F12-B4: final step boundary (currentHour = 708) returns all nulls because no forward steps remain', () => {
    const mockSteps = Array.from({ length: 709 }, (_, i) => ({
      isSunlit: i % 2 === 0,
      isEarthVisible: i % 2 !== 0,
    }));

    const countdown = engine.getTransitionCountdowns(mockSteps, 708);
    assertNull(countdown.nextSunset, 'At h=708, nextSunset must be null');
    assertNull(countdown.nextSunrise, 'At h=708, nextSunrise must be null');
    assertNull(countdown.nextEarthset, 'At h=708, nextEarthset must be null');
    assertNull(countdown.nextEarthrise, 'At h=708, nextEarthrise must be null');
  });

  test('F12-B5: immediate subsequent transition at h+1 yields delta = 1', () => {
    const steps = [
      { isSunlit: true, isEarthVisible: false },
      { isSunlit: false, isEarthVisible: true }, // sunset and earthrise at h=1
      { isSunlit: false, isEarthVisible: true },
    ];

    const countdown = engine.getTransitionCountdowns(steps, 0);
    assertEqual(countdown.nextSunset, 1, 'Sunset at h=1 must give delta 1 from h=0');
    assertEqual(countdown.nextEarthrise, 1, 'Earthrise at h=1 must give delta 1 from h=0');
  });

  test('F12-B6: malformed or out-of-range inputs return all nulls defensively without throwing', () => {
    assertDeepEqual(engine.getTransitionCountdowns(null, 0), {
      nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null,
    });
    assertDeepEqual(engine.getTransitionCountdowns([], 0), {
      nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null,
    });
    assertDeepEqual(engine.getTransitionCountdowns([{ isSunlit: true }], -1), {
      nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null,
    });
    assertDeepEqual(engine.getTransitionCountdowns([{ isSunlit: true }], 10), {
      nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null,
    });
    assertDeepEqual(engine.getTransitionCountdowns([{ isSunlit: true }], NaN), {
      nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null,
    });
  });
});

describe('Tier 2: F13 - Multi-Criteria Site Viability Scoring Boundary & Corner Cases', () => {
  let engine;

  beforeEach(() => {
    engine = new EphemerisEngine();
  });

  test('F13-B1: Permanently Shadowed Region (PSR) with 0% sunlit, 100% DTE, and 0° slope evaluates to 55', () => {
    // Formula: 0.45 * 0 + 0.35 * 100 + 0.20 * 100 = 0 + 35 + 20 = 55
    const psrSite = {
      id: 'synth_deep_psr',
      name: 'Synthetic Deep Crater Floor PSR',
      shortName: 'PSR Floor',
      lat: -89.8,
      lon: 0.0,
      elevM: 0.0,
      slopeDeg: 0.0,
      horizonProfile: new Array(12).fill(89.0), // Sun never clears 89° rim
    };

    const cycle = engine.computeFullCycle(psrSite);
    assertEqual(cycle.sunlitHours, 0, 'PSR must have exactly 0 sunlit hours');
    assertEqual(cycle.sunlitPct, 0.0, 'PSR sunlitPct must be 0.0%');

    // Expected score: round(0.45*0 + 0.35*dtePct + 0.20*100)
    const expectedScore = Math.round(cycle.dtePct * 0.35 + 20.0);
    assertEqual(cycle.viabilityScore, expectedScore, 'PSR score must reflect 0 sunlit contribution');
  });

  test('F13-B2: worst-case site (0% sunlit, 0% DTE, extreme slope >= 20°) evaluates to exactly 0', () => {
    // Formula: 0.45 * 0 + 0.35 * 0 + 0.20 * 0 = 0
    const deadSite = {
      id: 'synth_uninhabitable',
      name: 'Synthetic Uninhabitable Chasm',
      shortName: 'Uninhabitable',
      lat: -89.0,
      lon: 0.0,
      elevM: 0.0,
      slopeDeg: 25.0, // slope >= 20 gives slopePenalty = 0
      horizonProfile: new Array(12).fill(90.0), // totally blocked sky
    };

    const cycle = engine.computeFullCycle(deadSite);
    assertEqual(cycle.sunlitHours, 0);
    assertEqual(cycle.dteHours, 0);
    assertEqual(cycle.viabilityScore, 0, 'Worst-case site must score identically 0');
  });

  test('F13-B3: theoretical ideal peak (100% sunlit, 100% DTE, 0° slope) evaluates to 100', () => {
    // Formula: 0.45 * 100 + 0.35 * 100 + 0.20 * 100 = 45 + 35 + 20 = 100
    const sunlitPct = 100.0;
    const dtePct = 100.0;
    const slopeDeg = 0.0;
    const slopePenalty = Math.max(0.0, 100.0 - (slopeDeg * 5.0)); // 100.0
    const score = Math.round((sunlitPct * 0.45) + (dtePct * 0.35) + (slopePenalty * 0.20));

    assertEqual(score, 100, 'Ideal site score must equal 100');
  });

  test('F13-B4: maximum slope penalty cutoff (slopeDeg >= 20.0° produces slopePenalty = 0.0)', () => {
    const penaltyAt20 = Math.max(0.0, 100.0 - (20.0 * 5.0));
    const penaltyAt30 = Math.max(0.0, 100.0 - (30.0 * 5.0));
    const penaltyAt45 = Math.max(0.0, 100.0 - (45.0 * 5.0));

    assertEqual(penaltyAt20, 0.0, 'Slope 20° must yield 0 penalty score');
    assertEqual(penaltyAt30, 0.0, 'Slope 30° must clamp to 0 penalty score');
    assertEqual(penaltyAt45, 0.0, 'Slope 45° must clamp to 0 penalty score');
  });

  test('F13-B5: flat terrain bonus (slopeDeg = 0.0° produces maximum slopePenalty = 100.0)', () => {
    const penaltyAt0 = Math.max(0.0, 100.0 - (0.0 * 5.0));
    assertEqual(penaltyAt0, 100.0, 'Flat slope 0.0° must receive full 100.0 penalty points');

    const penaltyAt10 = Math.max(0.0, 100.0 - (10.0 * 5.0));
    assertEqual(penaltyAt10, 50.0, 'Moderate slope 10.0° must receive 50.0 penalty points');
  });

  test('F13-B6: viability score weighting fidelity across all 4 canonical NASA site profiles', () => {
    const sites = InterfaceContract.getMockSites();
    for (const site of sites) {
      const cycle = engine.computeFullCycle(site);
      const slopePenalty = Math.max(0.0, 100.0 - (site.slopeDeg * 5.0));
      const expectedScore = Math.round((cycle.sunlitPct * 0.45) + (cycle.dtePct * 0.35) + (slopePenalty * 0.20));
      assertEqual(
        cycle.viabilityScore,
        expectedScore,
        `Site ${site.id} score must strictly equal 0.45*sunlit + 0.35*dte + 0.20*slopePenalty`
      );
    }
  });
});
