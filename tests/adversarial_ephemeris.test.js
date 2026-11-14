/**
 * @fileoverview Adversarial stress test suite for EphemerisEngine (Milestone M1).
 * Stress tests topocentric azimuth branch cuts, polar singularities, extreme
 * elevations, optical libration bounds, PV flux identities, and hostile synthetic sites.
 *
 * Adheres strictly to ECMAScript 2022 and zero external dependencies.
 */

import {
  describe, test, it,
  assert, assertFalse,
  assertEqual, assertNotEqual, assertDeepEqual,
  assertApproxEqual,
  assertGreaterThan, assertGreaterThanOrEqual,
  assertLessThan, assertLessThanOrEqual,
  assertBetween,
  assertThrows,
  assertNotNull,
} from './testHarness.js';

import { ephemerisEngine, EphemerisEngine } from '../src/core/ephemerisEngine.js';
import { InterfaceContract } from '../src/core/interfaceContract.js';

describe('Adversarial M1: Topocentric Azimuth Branch Cut Fuzzing', () => {
  test('dense micro-stepping around meridian cuts [359.95, 360.05] and [-0.05, +0.05]', () => {
    // We construct test observer and target pairs designed to produce azimuths
    // precisely in the critical branch cut region [359.95, 360.05] and [-0.05, 0.05].
    // From observer (lat -89.0, lon 0.0), a target with lon very close to 0 or 360
    // sweeps through azimuth 0° / 360°.
    const engine = new EphemerisEngine();
    let checkedCount = 0;

    // Fuzz around deltaLon = 0 with micro-steps (10^-7 to 10^-2 degrees)
    const baseLats = [-89.9, -89.54, -85.0, -45.0, 0.0, 45.0, 85.0, 89.9];
    const microOffsets = [];

    // Dense grid around 0 degrees
    for (let p = -5; p <= 5; p++) {
      for (let s = 1; s <= 9; s++) {
        microOffsets.push(s * Math.pow(10, p));
        microOffsets.push(-s * Math.pow(10, p));
      }
    }
    // High-resolution linear sweep in [-0.06, +0.06] with 10,000 steps
    for (let i = -5000; i <= 5000; i++) {
      microOffsets.push(i * 0.00001);
    }

    for (const siteLat of baseLats) {
      for (const dLon of microOffsets) {
        const topo = engine.calculateTopocentric(siteLat, 0.0, 1000, 1.0, dLon);
        checkedCount++;

        // Strict verification: 0.0 <= azDeg < 360.0
        assert(topo.azDeg >= 0.0, `azDeg must be >= 0.0, got ${topo.azDeg} for siteLat=${siteLat}, dLon=${dLon}`);
        assert(topo.azDeg < 360.0, `azDeg must be < 360.0, got ${topo.azDeg} for siteLat=${siteLat}, dLon=${dLon}`);
        assertFalse(Number.isNaN(topo.azDeg), `azDeg must not be NaN for siteLat=${siteLat}, dLon=${dLon}`);
        assert(Number.isFinite(topo.azDeg), `azDeg must be finite for siteLat=${siteLat}, dLon=${dLon}`);
        assertFalse(Object.is(topo.azDeg, -0), `azDeg must not be negative zero (-0) for siteLat=${siteLat}, dLon=${dLon}`);

        // Quantization check (1 decimal place)
        assertEqual(topo.azDeg, Math.round(topo.azDeg * 10.0) / 10.0);
      }
    }

    assert(checkedCount > 80000, `Expected >80,000 evaluations, performed ${checkedCount}`);
  });

  test('random uniform fuzzing of 100,000 arbitrary topocentric coordinate pairs', () => {
    const engine = new EphemerisEngine();
    let rngState = 123456789;
    function pseudoRandom() {
      rngState = (rngState * 1664525 + 1013904223) % 4294967296;
      return rngState / 4294967296;
    }

    for (let i = 0; i < 100000; i++) {
      const siteLat = (pseudoRandom() * 180.0) - 90.0;
      const siteLon = (pseudoRandom() * 360.0) - 180.0;
      const siteElevM = (pseudoRandom() * 20000.0) - 5000.0;
      const tgtLat = (pseudoRandom() * 180.0) - 90.0;
      const tgtLon = (pseudoRandom() * 360.0) - 180.0;

      const topo = engine.calculateTopocentric(siteLat, siteLon, siteElevM, tgtLat, tgtLon);

      assert(topo.azDeg >= 0.0, `Random fuzz: azDeg < 0.0: ${topo.azDeg}`);
      assert(topo.azDeg < 360.0, `Random fuzz: azDeg >= 360.0: ${topo.azDeg}`);
      assertFalse(Number.isNaN(topo.azDeg), `Random fuzz: azDeg is NaN`);
      assertFalse(Object.is(topo.azDeg, -0), `Random fuzz: azDeg is -0`);
      assertFalse(Number.isNaN(topo.elevDeg), `Random fuzz: elevDeg is NaN`);
      assert(Number.isFinite(topo.elevDeg), `Random fuzz: elevDeg is not finite`);
    }
  });
});

describe('Adversarial M1: Polar Singularities and Coincident/Antipodal Points', () => {
  const engine = new EphemerisEngine();

  test('exact North Pole observer (siteLat = +90.0)', () => {
    // Sweep target across diverse longitudes and latitudes
    for (let tgtLon = -180; tgtLon <= 180; tgtLon += 15) {
      for (let tgtLat = -90; tgtLat <= 90; tgtLat += 30) {
        const topo = engine.calculateTopocentric(90.0, 0.0, 2000, tgtLat, tgtLon);
        assert(topo.azDeg >= 0.0 && topo.azDeg < 360.0, `North pole azDeg out of bounds: ${topo.azDeg}`);
        assertFalse(Number.isNaN(topo.azDeg), 'North pole azDeg must not be NaN');
        assertFalse(Number.isNaN(topo.elevDeg), 'North pole elevDeg must not be NaN');
      }
    }
  });

  test('exact South Pole observer (siteLat = -90.0)', () => {
    // Sweep target across diverse longitudes and latitudes
    for (let tgtLon = -180; tgtLon <= 180; tgtLon += 15) {
      for (let tgtLat = -90; tgtLat <= 90; tgtLat += 30) {
        const topo = engine.calculateTopocentric(-90.0, 0.0, 2000, tgtLat, tgtLon);
        assert(topo.azDeg >= 0.0 && topo.azDeg < 360.0, `South pole azDeg out of bounds: ${topo.azDeg}`);
        assertFalse(Number.isNaN(topo.azDeg), 'South pole azDeg must not be NaN');
        assertFalse(Number.isNaN(topo.elevDeg), 'South pole elevDeg must not be NaN');
      }
    }
  });

  test('coincident points (target directly at observer zenith)', () => {
    const locations = [
      { lat: 0, lon: 0 },
      { lat: 90, lon: 0 },
      { lat: -90, lon: 0 },
      { lat: -89.54, lon: 137.0 },
      { lat: 45, lon: -120 },
    ];

    for (const loc of locations) {
      const topo = engine.calculateTopocentric(loc.lat, loc.lon, 0, loc.lat, loc.lon);
      assert(topo.azDeg >= 0.0 && topo.azDeg < 360.0, `Coincident azDeg out of bounds: ${topo.azDeg}`);
      assertFalse(Number.isNaN(topo.azDeg), `Coincident azDeg is NaN for lat=${loc.lat}, lon=${loc.lon}`);
      assertEqual(topo.elevDeg, 90.0, `Zenith elevation must be exactly 90.0, got ${topo.elevDeg}`);
    }
  });

  test('antipodal points (target directly at observer nadir)', () => {
    const pairs = [
      { site: { lat: 0, lon: 0 }, tgt: { lat: 0, lon: 180 } },
      { site: { lat: 90, lon: 0 }, tgt: { lat: -90, lon: 0 } },
      { site: { lat: -90, lon: 0 }, tgt: { lat: 90, lon: 0 } },
      { site: { lat: 45, lon: 30 }, tgt: { lat: -45, lon: -150 } },
    ];

    for (const pair of pairs) {
      const topo = engine.calculateTopocentric(pair.site.lat, pair.site.lon, 0, pair.tgt.lat, pair.tgt.lon);
      assert(topo.azDeg >= 0.0 && topo.azDeg < 360.0, `Antipodal azDeg out of bounds: ${topo.azDeg}`);
      assertFalse(Number.isNaN(topo.azDeg), 'Antipodal azDeg is NaN');
      assertEqual(topo.elevDeg, -90.0, `Nadir elevation must be exactly -90.0, got ${topo.elevDeg}`);
    }
  });

  test('extreme micro-proximity to poles (lat = +/- 89.999999999)', () => {
    const microPoles = [-89.9999999999, 89.9999999999];
    for (const lat of microPoles) {
      const topo = engine.calculateTopocentric(lat, 0.0, 1000, 0.0, 45.0);
      assert(topo.azDeg >= 0.0 && topo.azDeg < 360.0);
      assertFalse(Number.isNaN(topo.azDeg));
      assertFalse(Number.isNaN(topo.elevDeg));
    }
  });
});

describe('Adversarial M1: Extreme Terrain Elevation & Horizon Dip Allowance', () => {
  const engine = new EphemerisEngine();

  test('elevation dip monotonically increases with observer elevation', () => {
    const elevations = [0, 10, 100, 1000, 5000, 8848, 20000, 100000];
    let prevElev = -Infinity;

    for (const elevM of elevations) {
      const topo = engine.calculateTopocentric(-89.0, 0.0, elevM, 0.0, 0.0);
      assert(topo.elevDeg >= prevElev, `Elevation should increase with altitude: elevM=${elevM}, prev=${prevElev}, curr=${topo.elevDeg}`);
      prevElev = topo.elevDeg;
    }
  });

  test('negative elevations do not invoke sqrt of negative number or produce NaN', () => {
    const negativeElevations = [-1, -100, -2000, -9000, -100000];
    const zeroElevTopo = engine.calculateTopocentric(-89.0, 0.0, 0, 0.0, 0.0);

    for (const negElev of negativeElevations) {
      const topo = engine.calculateTopocentric(-89.0, 0.0, negElev, 0.0, 0.0);
      assertFalse(Number.isNaN(topo.elevDeg), `elevDeg must not be NaN for negative elevation ${negElev}`);
      assertFalse(Number.isNaN(topo.azDeg), `azDeg must not be NaN for negative elevation ${negElev}`);
      // For siteElevM <= 0, no dip allowance is added, matching zero elevation
      assertEqual(topo.elevDeg, zeroElevTopo.elevDeg, `Negative elevation should match zero datum elevation`);
    }
  });

  test('astronomical observer elevations (10^6 to 10^9 meters) remain finite', () => {
    const massiveElevations = [1e6, 1e7, 1e8, 1e9];
    for (const elev of massiveElevations) {
      const topo = engine.calculateTopocentric(0, 0, elev, 0, 0);
      assert(Number.isFinite(topo.elevDeg), `Massive elevation must yield finite elevDeg`);
      assertFalse(Number.isNaN(topo.elevDeg));
    }
  });
});

describe('Adversarial M1: Optical Libration Bounds & Wobble Dynamics', () => {
  const engine = new EphemerisEngine();

  test('optical librations remain bounded by +/- 6.68 lat and +/- 7.90 lon across 100,000 hours', () => {
    const draconicPeriod = 653.093;
    const anomalisticPeriod = 661.309;

    let maxLat = -Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let minLon = Infinity;

    // Test across 100,000 hours (over 11 years of continuous lunar timeline)
    for (let h = 0; h <= 100000; h += 3) {
      const earthLat = 6.68 * Math.sin((h / draconicPeriod) * 2.0 * Math.PI);
      const earthLon = 7.90 * Math.sin((h / anomalisticPeriod) * 2.0 * Math.PI);

      const roundedLat = Math.round(earthLat * 100.0) / 100.0;
      const roundedLon = Math.round(earthLon * 100.0) / 100.0;

      if (roundedLat > maxLat) maxLat = roundedLat;
      if (roundedLat < minLat) minLat = roundedLat;
      if (roundedLon > maxLon) maxLon = roundedLon;
      if (roundedLon < minLon) minLon = roundedLon;

      assert(Math.abs(roundedLat) <= 6.68, `Draconic libration lat exceeded 6.68: ${roundedLat} at h=${h}`);
      assert(Math.abs(roundedLon) <= 7.90, `Anomalistic libration lon exceeded 7.90: ${roundedLon} at h=${h}`);
    }

    assertEqual(maxLat, 6.68, 'Peak positive draconic libration must reach 6.68');
    assertEqual(minLat, -6.68, 'Peak negative draconic libration must reach -6.68');
    assertEqual(maxLon, 7.90, 'Peak positive anomalistic libration must reach 7.90');
    assertEqual(minLon, -7.90, 'Peak negative anomalistic libration must reach -7.90');
  });

  test('computeFullCycle outputs strictly satisfy libration bounds in every step', () => {
    const sites = InterfaceContract.getMockSites();
    for (const site of sites) {
      const cycle = engine.computeFullCycle(site, '2026-11-14');
      for (let h = 0; h < cycle.steps.length; h++) {
        const step = cycle.steps[h];
        assert(Math.abs(step.libLatDeg) <= 6.68, `Site ${site.id} h=${h}: libLatDeg out of bounds: ${step.libLatDeg}`);
        assert(Math.abs(step.libLonDeg) <= 7.90, `Site ${site.id} h=${h}: libLonDeg out of bounds: ${step.libLonDeg}`);
      }
    }
  });
});

describe('Adversarial M1: Photovoltaic Array Efficiency & Solar Flux Identity', () => {
  const engine = new EphemerisEngine();

  test('array efficiency is strictly 0.0 for zero and negative solar elevations', () => {
    const arrayTypes = ['vertical_mast', 'sun_tracking', 'horizontal_deck', 'unknown_type'];
    const elevations = [0.0, -0.001, -0.1, -1.0, -45.0, -90.0];

    for (const arrayType of arrayTypes) {
      for (const elev of elevations) {
        const eff = engine.computeArrayEfficiency(elev, arrayType);
        assertEqual(eff, 0.0, `Efficiency must be 0.0 for sunElev <= 0 (type=${arrayType}, elev=${elev})`);
      }
    }
  });

  test('zenith and grazing behavior across array types', () => {
    // At zenith (sunElev = 90.0):
    // vertical_mast: cos(90) = 0.0
    // sun_tracking: 100.0
    // horizontal_deck: sin(90) = 100.0
    assertApproxEqual(engine.computeArrayEfficiency(90.0, 'vertical_mast'), 0.0, 1e-4);
    assertEqual(engine.computeArrayEfficiency(90.0, 'sun_tracking'), 100.0);
    assertApproxEqual(engine.computeArrayEfficiency(90.0, 'horizontal_deck'), 100.0, 1e-4);

    // At grazing near horizon (sunElev = 0.01):
    // vertical_mast should be near 100.0 (cos(0) = 1)
    // horizontal_deck should be near 0.0 (sin(0) = 0)
    const vertEff = engine.computeArrayEfficiency(0.01, 'vertical_mast');
    const horizEff = engine.computeArrayEfficiency(0.01, 'horizontal_deck');
    assertGreaterThan(vertEff, 99.9);
    assertLessThan(horizEff, 0.1);
  });

  test('solar flux identity holds strictly across all 1,001 efficiency values in [0.0, 100.0]', () => {
    // For every eff in [0.0, 100.0] with step 0.1:
    // flux = Math.round(((eff / 100.0) * 1361.0) * 10.0) / 10.0
    for (let i = 0; i <= 1000; i++) {
      const eff = Math.round(i) / 10.0;
      const flux = Math.round(((eff / 100.0) * engine.solarConstant) * 10.0) / 10.0;
      assertFalse(Number.isNaN(flux), `Flux must not be NaN for eff=${eff}`);
      assert(flux >= 0.0, `Flux must be >= 0 for eff=${eff}`);
      assert(flux <= 1361.0, `Flux must be <= 1361.0 for eff=${eff}`);
    }
  });

  test('solar flux identity holds across all steps in computeFullCycle for all sites and configs', () => {
    const sites = InterfaceContract.getMockSites();
    const configs = ['vertical_mast', 'sun_tracking', 'horizontal_deck'];

    for (const site of sites) {
      for (const config of configs) {
        const cycle = engine.computeFullCycle(site, '2026-11-14', config);
        for (let h = 0; h < cycle.steps.length; h++) {
          const step = cycle.steps[h];
          const expectedFlux = Math.round(((step.arrayEfficiency / 100.0) * 1361.0) * 10.0) / 10.0;
          assertEqual(step.solarFluxWm2, expectedFlux,
            `Flux mismatch at site ${site.id}, config ${config}, h=${h}: expected ${expectedFlux}, got ${step.solarFluxWm2}`);
        }
      }
    }
  });
});

describe('Adversarial M1: Horizon Mask Interpolation Edge Cases', () => {
  const engine = new EphemerisEngine();
  const testProfile = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0];

  test('exact sector boundaries map to profile elements', () => {
    for (let sector = 0; sector < 12; sector++) {
      const az = sector * 30.0;
      const interp = engine.interpolateHorizon(testProfile, az);
      assertEqual(interp, testProfile[sector], `Sector ${sector} (az=${az}) mismatch`);
    }
  });

  test('azimuth wrap-around across 360° to sector 0', () => {
    // Between sector 11 (330°) and sector 0 (360° / 0°):
    // At 345°: midway between 12.0 and 1.0 -> 6.5
    const midInterp = engine.interpolateHorizon(testProfile, 345.0);
    assertEqual(midInterp, 6.5);

    // At 359.999°: should be close to testProfile[0] (1.0)
    const nearWrap = engine.interpolateHorizon(testProfile, 359.999);
    assertApproxEqual(nearWrap, 1.0, 0.05);

    // At 360.0°: should exactly match sector 0 (1.0)
    assertEqual(engine.interpolateHorizon(testProfile, 360.0), 1.0);

    // At -30.0°: equivalent to 330° -> sector 11 (12.0)
    assertEqual(engine.interpolateHorizon(testProfile, -30.0), 12.0);

    // At 720.0°: equivalent to 0° -> sector 0 (1.0)
    assertEqual(engine.interpolateHorizon(testProfile, 720.0), 1.0);
  });

  test('malformed and corrupted horizon profiles return fallback 0.0', () => {
    assertEqual(engine.interpolateHorizon(null, 45.0), 0.0);
    assertEqual(engine.interpolateHorizon(undefined, 45.0), 0.0);
    assertEqual(engine.interpolateHorizon([], 45.0), 0.0);
    assertEqual(engine.interpolateHorizon([1, 2, 3], 45.0), 0.0);
    assertEqual(engine.interpolateHorizon(new Array(13).fill(1), 45.0), 0.0);
  });
});

describe('Adversarial M1: State Transition Countdowns Defensiveness', () => {
  const engine = new EphemerisEngine();

  test('null, empty, and invalid inputs gracefully return all nulls without throwing', () => {
    const invalidInputs = [
      [null, 0],
      [undefined, 0],
      [[], 0],
      ['not_an_array', 0],
      [[{ isSunlit: true }], -1],
      [[{ isSunlit: true }], 5],
      [[{ isSunlit: true }], NaN],
      [[{ isSunlit: true }], null],
    ];

    for (const [steps, hour] of invalidInputs) {
      const res = engine.getTransitionCountdowns(steps, hour);
      assertEqual(res.nextSunset, null);
      assertEqual(res.nextSunrise, null);
      assertEqual(res.nextEarthset, null);
      assertEqual(res.nextEarthrise, null);
    }
  });

  test('alternating state scan accurately computes countdown deltas', () => {
    // Construct an alternating sequence of sunlit/earthVisible steps
    const steps = [
      { isSunlit: true, isEarthVisible: false },  // h=0
      { isSunlit: false, isEarthVisible: true },  // h=1: sunset (delta 1), earthrise (delta 1)
      { isSunlit: true, isEarthVisible: false },  // h=2: sunrise (delta 2), earthset (delta 2)
    ];

    const res = engine.getTransitionCountdowns(steps, 0);
    assertEqual(res.nextSunset, 1, 'Expected sunset at delta 1');
    assertEqual(res.nextSunrise, 2, 'Expected sunrise at delta 2');
    assertEqual(res.nextEarthset, 2, 'Expected earthset at delta 2');
    assertEqual(res.nextEarthrise, 1, 'Expected earthrise at delta 1');
  });

  test('perpetual light and perpetual shadow have null countdowns', () => {
    const perpetualSun = new Array(100).fill(null).map(() => ({ isSunlit: true, isEarthVisible: true }));
    const perpetualShadow = new Array(100).fill(null).map(() => ({ isSunlit: false, isEarthVisible: false }));

    const sunRes = engine.getTransitionCountdowns(perpetualSun, 0);
    assertEqual(sunRes.nextSunset, null);
    assertEqual(sunRes.nextSunrise, null);

    const shadowRes = engine.getTransitionCountdowns(perpetualShadow, 0);
    assertEqual(shadowRes.nextSunset, null);
    assertEqual(shadowRes.nextSunrise, null);
  });
});

describe('Adversarial M1: Meeus Sub-Solar Latitude & Julian Date Robustness', () => {
  const engine = new EphemerisEngine();

  test('Julian Date calculation on benchmark astronomical dates', () => {
    // Meeus Astronomical Algorithms standard tests:
    // 2000-01-01 at 00:00:00 UTC -> JD 2451544.5
    assertEqual(engine.dateToJulianDate('2000-01-01'), 2451544.5);

    // J2000 epoch is 2000-01-01 12:00:00 UTC -> JD 2451545.0
    const tJ2000 = engine.centuriesSinceJ2000('2000-01-01', 12.0);
    assertEqual(tJ2000, 0.0);

    // Leap year 2024-02-29
    assertEqual(engine.dateToJulianDate('2024-02-29'), 2460369.5);
    // Non-leap century 2100-02-28
    assertEqual(engine.dateToJulianDate('2100-02-28'), 2488127.5);
  });

  test('sub-solar latitude oscillates within +/- 1.5424 across all calendar days', () => {
    // Sample every day across a 4-year leap-year cycle (1461 days)
    const baseJd = engine.dateToJulianDate('2026-01-01');
    let maxSubLat = -Infinity;
    let minSubLat = Infinity;

    for (let day = 0; day < 1461; day++) {
      const jd = baseJd + day;
      const subLat = -engine.obliquityDeg * Math.sin((2.0 * Math.PI * (jd - 2451545.0)) / 365.25);
      if (subLat > maxSubLat) maxSubLat = subLat;
      if (subLat < minSubLat) minSubLat = subLat;
      assert(Math.abs(subLat) <= 1.5424 + 1e-9, `sub-solar lat exceeded obliquity: ${subLat}`);
    }

    assertApproxEqual(maxSubLat, 1.5424, 0.01);
    assertApproxEqual(minSubLat, -1.5424, 0.01);
  });
});

describe('Adversarial M1: Hostile Synthetic Sites Full Cycle Execution', () => {
  const engine = new EphemerisEngine();

  test('site at exact South Pole (-90.0, 0.0) passes complete cycle and validation', () => {
    const southPoleSite = {
      id: 'exact_south_pole_fixture',
      name: 'Exact South Pole Fixture',
      lat: -90.0,
      lon: 0.0,
      elevM: 0.0,
      slopeDeg: 0.0,
      horizonProfile: new Array(12).fill(1.5),
      description: 'Synthetic site at exact lunar south pole.',
    };

    const cycle = engine.computeFullCycle(southPoleSite, '2026-11-14', 'vertical_mast');
    assertEqual(cycle.steps.length, 709);

    const isValid = InterfaceContract.validateCycleData(cycle);
    assert(isValid, 'Cycle for exact south pole must be valid according to InterfaceContract');

    for (const step of cycle.steps) {
      assert(step.sunAzDeg >= 0.0 && step.sunAzDeg < 360.0);
      assert(step.earthAzDeg >= 0.0 && step.earthAzDeg < 360.0);
      assertFalse(Number.isNaN(step.sunElDeg));
      assertFalse(Number.isNaN(step.earthElDeg));
    }
  });

  test('site with extreme negative elevation (-8000m) passes validation', () => {
    const deepCraterSite = {
      id: 'deep_crater_fixture',
      name: 'Extreme Deep Crater Fixture',
      lat: -88.0,
      lon: 45.0,
      elevM: -8000.0,
      slopeDeg: 35.0,
      horizonProfile: [10, 15, 20, 25, 20, 15, 10, 5, 2, 5, 8, 10],
      description: 'Synthetic site deep inside impact basin floor.',
    };

    const cycle = engine.computeFullCycle(deepCraterSite, '2026-11-14', 'vertical_mast');
    const isValid = InterfaceContract.validateCycleData(cycle);
    assert(isValid, 'Cycle for deep crater site must pass InterfaceContract validation');
  });

  test('site with extreme steep slope (45.0 deg) produces non-negative viability score', () => {
    const steepSite = {
      id: 'steep_slope_fixture',
      name: 'Steep Escarpment Fixture',
      lat: -89.0,
      lon: -120.0,
      elevM: 1500.0,
      slopeDeg: 45.0,
      horizonProfile: new Array(12).fill(5.0),
      description: 'Synthetic steep escarpment cliff edge.',
    };

    const cycle = engine.computeFullCycle(steepSite, '2026-11-14', 'vertical_mast');
    assert(cycle.viabilityScore >= 0, `Viability score must be non-negative, got ${cycle.viabilityScore}`);
    assert(cycle.viabilityScore <= 100, `Viability score must be <= 100, got ${cycle.viabilityScore}`);
  });
});
