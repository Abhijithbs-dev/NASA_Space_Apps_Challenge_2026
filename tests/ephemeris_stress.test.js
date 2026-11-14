/**
 * @fileoverview Adversarial empirical stress testing suite for EphemerisEngine (Milestone M1).
 * Tests high-dimensional edge cases, synthetic landing sites across planetary extremes,
 * boundary wrap conditions, Meeus Julian Date progressions across centuries, solar flux exactness,
 * and state transition countdown robustness.
 *
 * Adheres to zero external npm dependencies and native Node v22 runtime.
 */

import {
  describe, test, it,
  assert, assertFalse,
  assertEqual, assertNotEqual, assertDeepEqual,
  assertApproxEqual,
  assertGreaterThan, assertGreaterThanOrEqual,
  assertLessThan, assertLessThanOrEqual,
  assertBetween,
  assertNull, assertNotNull,
  assertDefined,
} from './testHarness.js';

import {
  InterfaceContract,
  STEP_SCHEMA_KEYS,
  SUMMARY_SCHEMA_KEYS,
} from '../src/core/interfaceContract.js';

import {
  EphemerisEngine,
  ephemerisEngine,
} from '../src/core/ephemerisEngine.js';

describe('Adversarial Stress Test: Canonical Landing Sites & Schema Integrity', () => {
  const canonicalSites = InterfaceContract.getMockSites();
  const arrayTypes = ['vertical_mast', 'sun_tracking', 'horizontal_deck'];

  for (const site of canonicalSites) {
    for (const arrayType of arrayTypes) {
      test(`Site ${site.id} with ${arrayType} generates 709 valid steps conforming to schemas`, () => {
        const cycle = ephemerisEngine.computeFullCycle(site, '2026-11-14', arrayType);

        assert(InterfaceContract.validateCycleData(cycle), `Cycle failed InterfaceContract for ${site.id}`);
        assertEqual(cycle.steps.length, 709, `Cycle steps length must be exactly 709`);
        assertEqual(cycle.arrayType, arrayType);
        assertEqual(cycle.epochDateStr, '2026-11-14');

        // Verify summary keys
        for (const key of SUMMARY_SCHEMA_KEYS) {
          assert(key in cycle, `Missing summary key: ${key}`);
          assert(!Number.isNaN(cycle[key]), `Summary key ${key} is NaN`);
          assert(cycle[key] !== null && cycle[key] !== undefined, `Summary key ${key} is null/undefined`);
        }

        assertBetween(cycle.sunlitHours, 0, 709);
        assertBetween(cycle.dteHours, 0, 709);
        assertBetween(cycle.dualHours, 0, 709);
        assertBetween(cycle.sunlitPct, 0.0, 100.0);
        assertBetween(cycle.dtePct, 0.0, 100.0);
        assertBetween(cycle.dualPct, 0.0, 100.0);
        assertBetween(cycle.avgPowerEff, 0.0, 100.0);
        assertBetween(cycle.viabilityScore, 0, 100);

        // Verify all 709 steps
        for (let h = 0; h < 709; h++) {
          const step = cycle.steps[h];
          assertEqual(step.hourOffset, h, `Step hourOffset mismatch at h=${h}`);

          // Schema keys presence
          for (const key of STEP_SCHEMA_KEYS) {
            assert(key in step, `Step at h=${h} missing key: ${key}`);
            const val = step[key];
            assert(val !== null && val !== undefined, `Step ${key} at h=${h} is null/undefined`);
            if (typeof val === 'number') {
              assert(!Number.isNaN(val), `Step ${key} at h=${h} is NaN`);
              assert(Number.isFinite(val), `Step ${key} at h=${h} is not finite`);
            }
          }

          // Strict azimuth range: [0.0, 360.0) - CAN NEVER BE 360.0!
          assertGreaterThanOrEqual(step.sunAzDeg, 0.0, `sunAzDeg < 0 at h=${h}`);
          assertLessThan(step.sunAzDeg, 360.0, `sunAzDeg >= 360.0 at h=${h}: got ${step.sunAzDeg}`);

          assertGreaterThanOrEqual(step.earthAzDeg, 0.0, `earthAzDeg < 0 at h=${h}`);
          assertLessThan(step.earthAzDeg, 360.0, `earthAzDeg >= 360.0 at h=${h}: got ${step.earthAzDeg}`);

          // Solar flux exact identity
          const expectedFlux = Math.round(((step.arrayEfficiency / 100.0) * 1361.0) * 10.0) / 10.0;
          assertEqual(step.solarFluxWm2, expectedFlux,
            `Solar flux mismatch at h=${h}: expected ${expectedFlux}, got ${step.solarFluxWm2}`);

          // Optical libration bounds
          assertBetween(step.libLatDeg, -6.68, 6.68);
          assertBetween(step.libLonDeg, -7.90, 7.90);

          // Sub-solar latitude bounds
          assertBetween(step.subSolarLatDeg, -1.55, 1.55);

          // Array efficiency bounds
          assertBetween(step.arrayEfficiency, 0.0, 100.0);

          // If shadowed, efficiency and flux must be 0
          if (!step.isSunlit) {
            assertEqual(step.arrayEfficiency, 0.0, `Non-sunlit step has non-zero efficiency at h=${h}`);
            assertEqual(step.solarFluxWm2, 0.0, `Non-sunlit step has non-zero flux at h=${h}`);
          }
        }
      });
    }
  }

  test('Shackleton Rim h=624 sunAzDeg and Malapert Massif h=294,698 earthAzDeg wrap to 0.0 and never 360.0', () => {
    const shackleton = canonicalSites.find(s => s.id === 'shackleton_rim_primary');
    const malapert = canonicalSites.find(s => s.id === 'malapert_massif_summit');

    const cycleShackleton = ephemerisEngine.computeFullCycle(shackleton, '2026-11-14');
    assertEqual(cycleShackleton.steps[624].sunAzDeg, 0.0, `Shackleton h=624 sunAzDeg must be 0.0, not 360.0`);

    const cycleMalapert = ephemerisEngine.computeFullCycle(malapert, '2026-11-14');
    assertEqual(cycleMalapert.steps[294].earthAzDeg, 0.0, `Malapert h=294 earthAzDeg must be 0.0, not 360.0`);
    assertEqual(cycleMalapert.steps[698].earthAzDeg, 0.0, `Malapert h=698 earthAzDeg must be 0.0, not 360.0`);
  });
});

describe('Adversarial Stress Test: Synthetic Sites & Planetary Extremes', () => {
  const syntheticSites = [
    {
      id: 'synth_north_pole',
      name: 'Exact Lunar North Pole',
      shortName: 'North Pole',
      lat: 90.0,
      lon: 0.0,
      elevM: 0,
      slopeDeg: 0.0,
      horizonProfile: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      id: 'synth_south_pole',
      name: 'Exact Lunar South Pole',
      shortName: 'South Pole',
      lat: -90.0,
      lon: 0.0,
      elevM: 0,
      slopeDeg: 0.0,
      horizonProfile: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      id: 'synth_deep_crater_floor',
      name: 'Ultra-Deep Crater Floor',
      shortName: 'Deep Floor',
      lat: -88.5,
      lon: 45.0,
      elevM: -9000,
      slopeDeg: 25.0,
      horizonProfile: [45, 50, 55, 60, 65, 70, 75, 70, 65, 60, 55, 50],
    },
    {
      id: 'synth_ultra_high_summit',
      name: 'Ultra-High Mountain Summit',
      shortName: 'High Summit',
      lat: -84.0,
      lon: -120.0,
      elevM: 12000,
      slopeDeg: 4.0,
      horizonProfile: [0.1, 0.2, 0.1, 0.3, 0.2, 0.1, 0.2, 0.3, 0.1, 0.2, 0.1, 0.2],
    },
    {
      id: 'synth_equator_meridian',
      name: 'Equatorial Prime Meridian',
      shortName: 'Equator',
      lat: 0.0,
      lon: 0.0,
      elevM: 100,
      slopeDeg: 1.0,
      horizonProfile: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1],
    },
    {
      id: 'synth_far_side_south_pole',
      name: 'Far Side Polar Basin Rim',
      shortName: 'Far Polar Rim',
      lat: -89.8,
      lon: 180.0,
      elevM: 3500,
      slopeDeg: 12.0,
      horizonProfile: [2.5, 3.0, 1.5, 0.5, 1.0, 2.0, 3.5, 4.0, 2.5, 1.0, 0.8, 1.5],
    },
    {
      id: 'synth_extreme_slope',
      name: 'Cliff Edge (Extreme Slope)',
      shortName: 'Cliff Edge',
      lat: -87.2,
      lon: 90.0,
      elevM: 1500,
      slopeDeg: 85.0,
      horizonProfile: [10, 15, 20, 25, 30, 35, 40, 35, 30, 25, 20, 15],
    },
    {
      id: 'synth_flat_blocked_sky',
      name: 'Subterranean Skylight (Totally Blocked)',
      shortName: 'Skylight',
      lat: -89.0,
      lon: -60.0,
      elevM: -500,
      slopeDeg: 0.0,
      horizonProfile: [89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89],
    },
  ];

  for (const site of syntheticSites) {
    test(`Synthetic extreme site ${site.id} computes without NaN, wraps azimuth cleanly, and conforms`, () => {
      assert(InterfaceContract.validateSite(site), `Synthetic site ${site.id} should validate`);

      const cycle = ephemerisEngine.computeFullCycle(site, '2026-11-14', 'vertical_mast');
      assert(InterfaceContract.validateCycleData(cycle));

      assertEqual(cycle.steps.length, 709);

      for (let h = 0; h < 709; h++) {
        const step = cycle.steps[h];
        assertGreaterThanOrEqual(step.sunAzDeg, 0.0);
        assertLessThan(step.sunAzDeg, 360.0);
        assertGreaterThanOrEqual(step.earthAzDeg, 0.0);
        assertLessThan(step.earthAzDeg, 360.0);
        assert(!Number.isNaN(step.sunElDeg));
        assert(!Number.isNaN(step.earthElDeg));
        assert(!Number.isNaN(step.solarFluxWm2));

        const expectedFlux = Math.round(((step.arrayEfficiency / 100.0) * 1361.0) * 10.0) / 10.0;
        assertEqual(step.solarFluxWm2, expectedFlux);
      }
    });
  }

  test('Fuzz test: 25 randomized planetary sites maintain numerical stability and azimuth bounds', () => {
    for (let i = 0; i < 25; i++) {
      const lat = -90.0 + Math.random() * 180.0; // [-90, +90]
      const lon = -180.0 + Math.random() * 360.0; // [-180, +180]
      const elevM = -8000 + Math.random() * 18000; // [-8000, 10000]
      const slopeDeg = Math.random() * 60.0;
      const horizonProfile = Array.from({ length: 12 }, () => Math.random() * 20.0);

      const fuzzedSite = {
        id: `fuzz_site_${i}`,
        name: `Fuzz Site ${i}`,
        shortName: `Fuzz ${i}`,
        lat,
        lon,
        elevM,
        slopeDeg,
        horizonProfile,
      };

      const cycle = ephemerisEngine.computeFullCycle(fuzzedSite, '2026-11-14');
      assertEqual(cycle.steps.length, 709);

      for (let h = 0; h < 709; h += 30) {
        const step = cycle.steps[h];
        assertGreaterThanOrEqual(step.sunAzDeg, 0.0);
        assertLessThan(step.sunAzDeg, 360.0);
        assertGreaterThanOrEqual(step.earthAzDeg, 0.0);
        assertLessThan(step.earthAzDeg, 360.0);
        assert(!Number.isNaN(step.sunElDeg));
        assert(!Number.isNaN(step.earthElDeg));
        assert(!Number.isNaN(step.solarFluxWm2));
      }
    }
  });
});

describe('Adversarial Stress Test: Astronomical Epoch Progression & Julian Date', () => {
  const mockSite = InterfaceContract.getMockSite();

  test('Meeus Julian Date algorithm calculates standard epochs accurately', () => {
    // J2000.0 epoch: 2000-01-01 at 12:00:00 UTC = 2451545.0
    // dateToJulianDate calculates at 00:00:00 UTC = 2451544.5
    const jd2000_00h = ephemerisEngine.dateToJulianDate('2000-01-01');
    assertEqual(jd2000_00h, 2451544.5);

    // Centuries since J2000 at hour 12:00 = 0.0
    const centuriesAtJ2000 = ephemerisEngine.centuriesSinceJ2000('2000-01-01', 12);
    assertApproxEqual(centuriesAtJ2000, 0.0, 1e-9);

    // Apollo 11 lunar landing date: 1969-07-20
    const jdApollo = ephemerisEngine.dateToJulianDate('1969-07-20');
    assertEqual(jdApollo, 2440422.5);

    // Leap year date: 2024-02-29
    const jdLeap = ephemerisEngine.dateToJulianDate('2024-02-29');
    assertEqual(jdLeap, 2460369.5);

    // Future epoch: 2030-01-01
    const jd2030 = ephemerisEngine.dateToJulianDate('2030-01-01');
    assertEqual(jd2030, 2462502.5);
  });

  test('Sub-solar latitude tracks seasonal variation across tropical year across epochs', () => {
    // Vernal Equinox 2026: ~March 20
    const cycleMarch = ephemerisEngine.computeFullCycle(mockSite, '2026-03-20');
    const sunLatMarch = cycleMarch.steps[0].subSolarLatDeg;

    // Autumnal Equinox 2026: ~September 22
    const cycleSept = ephemerisEngine.computeFullCycle(mockSite, '2026-09-22');
    const sunLatSept = cycleSept.steps[0].subSolarLatDeg;

    // The sub-solar latitudes at opposite equinoxes should have opposite signs
    assert(Math.sign(sunLatMarch) !== Math.sign(sunLatSept),
      `Equinox latitudes should have opposite signs: March=${sunLatMarch}, Sept=${sunLatSept}`);

    assertBetween(sunLatMarch, -1.55, 1.55);
    assertBetween(sunLatSept, -1.55, 1.55);

    // Variation over 708 hours (29.5 days) should be smooth seasonal progression (~0.1 - 0.3 deg), NOT 360 deg
    const deltaMarch = Math.abs(cycleMarch.steps[708].subSolarLatDeg - cycleMarch.steps[0].subSolarLatDeg);
    assertLessThan(deltaMarch, 0.5,
      `Sub-solar latitude variation over 1 month should be gradual seasonal change (<0.5 deg), was ${deltaMarch}`);
  });

  test('Epoch fallback: handles empty strings, whitespace, null, or undefined', () => {
    const cycleDefault = ephemerisEngine.computeFullCycle(mockSite);
    assertEqual(cycleDefault.epochDateStr, '2026-11-14');

    const cycleEmpty = ephemerisEngine.computeFullCycle(mockSite, '');
    assertEqual(cycleEmpty.epochDateStr, '2026-11-14');

    const cycleWhitespace = ephemerisEngine.computeFullCycle(mockSite, '   ');
    assertEqual(cycleWhitespace.epochDateStr, '2026-11-14');

    const cycleNull = ephemerisEngine.computeFullCycle(mockSite, null);
    assertEqual(cycleNull.epochDateStr, '2026-11-14');
  });
});

describe('Adversarial Stress Test: Synodic Rate & Optical Libration Bounds', () => {
  const mockSite = InterfaceContract.getMockSite();

  test('Sub-solar longitude drifts at exact synodic mean rate (~0.507948 deg/hr)', () => {
    const cycle = ephemerisEngine.computeFullCycle(mockSite, '2026-11-14');
    const expectedRate = 360.0 / 708.73414; // ~0.5079482 deg/hr
    assertApproxEqual(expectedRate, 0.507948, 1e-4);

    // Initial sub-solar longitude at h=0 is 180.0
    assertEqual(cycle.steps[0].subSolarLonDeg, 180.0);

    // Verify hourly advance across all 708 steps
    for (let h = 0; h < 708; h++) {
      const lon1 = cycle.steps[h].subSolarLonDeg;
      const lon2 = cycle.steps[h + 1].subSolarLonDeg;
      let diff = lon2 - lon1;
      if (diff < 0) diff += 360.0; // handle wrap around 360
      // Due to 1-decimal-place rounding of subSolarLonDeg, step diff must be 0.5 or 0.6
      assertApproxEqual(diff, 0.51, 0.15);
    }

    // Total drift at h=708: (180.0 + 708 * 0.5079482) % 360 = (180.0 + 359.6273) % 360 = 539.6273 % 360 = 179.6273
    const expectedFinalLon = Math.round(((180.0 + 708 * expectedRate) % 360.0) * 10.0) / 10.0;
    assertEqual(cycle.steps[708].subSolarLonDeg, expectedFinalLon);
  });

  test('Optical librations stay within rigorous astronomical draconic and anomalistic bounds', () => {
    const cycle = ephemerisEngine.computeFullCycle(mockSite, '2026-11-14');

    for (let h = 0; h <= 708; h++) {
      const step = cycle.steps[h];
      assertBetween(step.libLatDeg, -6.68, 6.68);
      assertBetween(step.libLonDeg, -7.90, 7.90);
    }

    // Verify periodicity: draconic period ~653.093h, anomalistic period ~661.309h
    // Earth latitude should cross 0 near h=0 and h ~ 326.5h
    assertApproxEqual(cycle.steps[0].libLatDeg, 0.0, 0.01);
    assertApproxEqual(cycle.steps[327].libLatDeg, 0.0, 0.1);
  });
});

describe('Adversarial Stress Test: Array Geometry Models & Photovoltaic Power', () => {
  test('computeArrayEfficiency accurately implements geometric projection models', () => {
    // When sun is below horizon or at horizon (<= 0), efficiency is 0
    assertEqual(ephemerisEngine.computeArrayEfficiency(-10.0, 'vertical_mast'), 0.0);
    assertEqual(ephemerisEngine.computeArrayEfficiency(0.0, 'vertical_mast'), 0.0);
    assertEqual(ephemerisEngine.computeArrayEfficiency(-5.0, 'sun_tracking'), 0.0);
    assertEqual(ephemerisEngine.computeArrayEfficiency(0.0, 'sun_tracking'), 0.0);
    assertEqual(ephemerisEngine.computeArrayEfficiency(-1.0, 'horizontal_deck'), 0.0);
    assertEqual(ephemerisEngine.computeArrayEfficiency(0.0, 'horizontal_deck'), 0.0);

    // Vertical mast: cos(elev) * 100
    // At grazing 0.01 deg: cos(0.01) * 100 ~= 99.998%
    assertApproxEqual(ephemerisEngine.computeArrayEfficiency(0.01, 'vertical_mast'), 100.0, 0.01);
    // At 60 deg: cos(60) * 100 = 50.0%
    assertApproxEqual(ephemerisEngine.computeArrayEfficiency(60.0, 'vertical_mast'), 50.0, 1e-4);
    // At 90 deg: cos(90) * 100 = 0.0%
    assertApproxEqual(ephemerisEngine.computeArrayEfficiency(90.0, 'vertical_mast'), 0.0, 1e-4);

    // Sun tracking: exactly 100.0% whenever sun > 0
    assertEqual(ephemerisEngine.computeArrayEfficiency(0.5, 'sun_tracking'), 100.0);
    assertEqual(ephemerisEngine.computeArrayEfficiency(45.0, 'sun_tracking'), 100.0);
    assertEqual(ephemerisEngine.computeArrayEfficiency(90.0, 'sun_tracking'), 100.0);

    // Horizontal deck: sin(elev) * 100
    // At grazing 0.01 deg: sin(0.01) * 100 ~= 0.017%
    assertApproxEqual(ephemerisEngine.computeArrayEfficiency(0.01, 'horizontal_deck'), 0.0175, 1e-3);
    // At 30 deg: sin(30) * 100 = 50.0%
    assertApproxEqual(ephemerisEngine.computeArrayEfficiency(30.0, 'horizontal_deck'), 50.0, 1e-4);
    // At 90 deg: sin(90) * 100 = 100.0%
    assertApproxEqual(ephemerisEngine.computeArrayEfficiency(90.0, 'horizontal_deck'), 100.0, 1e-4);

    // Unknown array type falls back to vertical mast
    assertApproxEqual(ephemerisEngine.computeArrayEfficiency(60.0, 'unknown_gimbal'), 50.0, 1e-4);
  });
});

describe('Adversarial Stress Test: LOLA Horizon Mask Linear Interpolation', () => {
  const profile = [0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0];

  test('Interpolates exact sector centers and linear midpoints', () => {
    // Exact sector centers (multiples of 30 deg)
    for (let i = 0; i < 12; i++) {
      const az = i * 30.0;
      assertEqual(ephemerisEngine.interpolateHorizon(profile, az), profile[i]);
    }

    // Midpoints (e.g. 15 deg between sector 0 (0.0) and sector 1 (5.0) -> 2.5)
    assertEqual(ephemerisEngine.interpolateHorizon(profile, 15.0), 2.5);
    assertEqual(ephemerisEngine.interpolateHorizon(profile, 45.0), 7.5);

    // Wrap boundary: between sector 11 (55.0 at 330 deg) and sector 0 (0.0 at 360 deg)
    // At 345 deg (halfway): (55.0 + 0.0) / 2 = 27.5
    assertEqual(ephemerisEngine.interpolateHorizon(profile, 345.0), 27.5);

    // At 359.9 deg: fraction = 29.9 / 30.0 ~= 0.99667 -> 55 * (1 - 0.99667) + 0 = 0.18
    assertApproxEqual(ephemerisEngine.interpolateHorizon(profile, 359.9), 0.18, 0.05);

    // Normalization with large/negative angles
    assertEqual(ephemerisEngine.interpolateHorizon(profile, 360.0), 0.0);
    assertEqual(ephemerisEngine.interpolateHorizon(profile, 720.0), 0.0);
    assertEqual(ephemerisEngine.interpolateHorizon(profile, -330.0), 5.0); // -330 = +30 deg
  });

  test('Defensively handles invalid, empty, or wrong-length profiles without throwing', () => {
    assertEqual(ephemerisEngine.interpolateHorizon(null, 45.0), 0.0);
    assertEqual(ephemerisEngine.interpolateHorizon(undefined, 45.0), 0.0);
    assertEqual(ephemerisEngine.interpolateHorizon([], 45.0), 0.0);
    assertEqual(ephemerisEngine.interpolateHorizon([1, 2, 3], 45.0), 0.0);
  });
});

describe('Adversarial Stress Test: Transition Countdowns Robustness', () => {
  test('Continuous sunlight: returns null for nextSunset and nextSunrise', () => {
    const steps = Array.from({ length: 100 }, (_, i) => ({
      hourOffset: i,
      isSunlit: true,
      isEarthVisible: true,
    }));

    const result = ephemerisEngine.getTransitionCountdowns(steps, 0);
    assertNull(result.nextSunset);
    assertNull(result.nextSunrise);
    assertNull(result.nextEarthset);
    assertNull(result.nextEarthrise);
  });

  test('Continuous darkness: returns null for nextSunset and nextSunrise', () => {
    const steps = Array.from({ length: 100 }, (_, i) => ({
      hourOffset: i,
      isSunlit: false,
      isEarthVisible: false,
    }));

    const result = ephemerisEngine.getTransitionCountdowns(steps, 0);
    assertNull(result.nextSunset);
    assertNull(result.nextSunrise);
    assertNull(result.nextEarthset);
    assertNull(result.nextEarthrise);
  });

  test('Calculates exact transition deltas for interleaved illumination and visibility states', () => {
    // Setup specific sequence:
    // h=0..9: Sunlit=true, Earth=true
    // h=10..19: Sunlit=false, Earth=true  -> Sunset at h=10
    // h=20..29: Sunlit=true, Earth=false  -> Sunrise at h=20, Earthset at h=20
    // h=30..39: Sunlit=false, Earth=true  -> Sunset at h=30, Earthrise at h=30
    const steps = [];
    for (let h = 0; h < 40; h++) {
      steps.push({
        hourOffset: h,
        isSunlit: (h < 10) || (h >= 20 && h < 30),
        isEarthVisible: (h < 20) || (h >= 30),
      });
    }

    // At h=0:
    // Next sunset: at h=10 (delta = 10)
    // Next sunrise: at h=20 (delta = 20)
    // Next earthset: at h=20 (delta = 20)
    // Next earthrise: at h=30 (delta = 30)
    const at0 = ephemerisEngine.getTransitionCountdowns(steps, 0);
    assertEqual(at0.nextSunset, 10);
    assertEqual(at0.nextSunrise, 20);
    assertEqual(at0.nextEarthset, 20);
    assertEqual(at0.nextEarthrise, 30);

    // At h=9 (one hour before sunset):
    const at9 = ephemerisEngine.getTransitionCountdowns(steps, 9);
    assertEqual(at9.nextSunset, 1);
    assertEqual(at9.nextSunrise, 11);
    assertEqual(at9.nextEarthset, 11);
    assertEqual(at9.nextEarthrise, 21);

    // At h=10 (first hour of night):
    const at10 = ephemerisEngine.getTransitionCountdowns(steps, 10);
    assertEqual(at10.nextSunset, 20); // next sunset at h=30 (delta=20)
    assertEqual(at10.nextSunrise, 10); // next sunrise at h=20 (delta=10)
    assertEqual(at10.nextEarthset, 10); // next earthset at h=20 (delta=10)
    assertEqual(at10.nextEarthrise, 20); // next earthrise at h=30 (delta=20)
  });

  test('At final step of cycle (h=708), all countdowns return null', () => {
    const mockSite = InterfaceContract.getMockSite();
    const cycle = ephemerisEngine.computeFullCycle(mockSite, '2026-11-14');

    const result = ephemerisEngine.getTransitionCountdowns(cycle.steps, 708);
    assertNull(result.nextSunset);
    assertNull(result.nextSunrise);
    assertNull(result.nextEarthset);
    assertNull(result.nextEarthrise);
  });

  test('Defensive execution on corrupted, malformed, or out-of-bound inputs', () => {
    // null or undefined steps
    assertDeepEqual(ephemerisEngine.getTransitionCountdowns(null, 0),
      { nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null });
    assertDeepEqual(ephemerisEngine.getTransitionCountdowns(undefined, 0),
      { nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null });

    // Empty steps array
    assertDeepEqual(ephemerisEngine.getTransitionCountdowns([], 0),
      { nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null });

    // Non-array steps
    assertDeepEqual(ephemerisEngine.getTransitionCountdowns('not_an_array', 0),
      { nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null });

    // Negative currentHour
    assertDeepEqual(ephemerisEngine.getTransitionCountdowns([{ isSunlit: true }], -1),
      { nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null });

    // currentHour >= steps.length
    assertDeepEqual(ephemerisEngine.getTransitionCountdowns([{ isSunlit: true }], 1),
      { nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null });

    // currentHour is NaN
    assertDeepEqual(ephemerisEngine.getTransitionCountdowns([{ isSunlit: true }], NaN),
      { nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null });

    // currentHour is string
    assertDeepEqual(ephemerisEngine.getTransitionCountdowns([{ isSunlit: true }], '0'),
      { nextSunset: null, nextSunrise: null, nextEarthset: null, nextEarthrise: null });

    // Steps array containing null / sparse entries does not crash
    const sparseSteps = [
      { isSunlit: true, isEarthVisible: true },
      null,
      { isSunlit: false, isEarthVisible: false },
    ];
    const sparseResult = ephemerisEngine.getTransitionCountdowns(sparseSteps, 0);
    assertNotNull(sparseResult);
  });
});

describe('Adversarial Stress Test: Topocentric Vector Solver & Elevation Dip Allowance', () => {
  test('Topocentric azimuth never returns 360.0 on [359.95, 360.0) float edges', () => {
    // Target positioned slightly to the west of observer meridian
    // to test azDeg in [359.95, 360.0) range
    const siteLat = -89.0;
    const siteLon = 0.0;
    const siteElevM = 1000;

    // Small negative longitude offsets to hit the boundary
    for (let deltaLon = -0.001; deltaLon < 0; deltaLon += 0.00005) {
      const topo = ephemerisEngine.calculateTopocentric(siteLat, siteLon, siteElevM, -88.0, deltaLon);
      assertGreaterThanOrEqual(topo.azDeg, 0.0, `azDeg must be >= 0.0`);
      assertLessThan(topo.azDeg, 360.0, `azDeg must be < 360.0, got ${topo.azDeg}`);
      assertNotEqual(topo.azDeg, 360.0, `azDeg must never be 360.0`);
    }
  });

  test('Observer elevation dip allowance increases geometric horizon reach', () => {
    // Target at great-circle distance 91 degrees (geometric elevation = -1.0 deg)
    const siteLat = 0.0;
    const siteLon = 0.0;
    const targetLat = 0.0;
    const targetLon = 91.0;

    // Observer at 0m elevation: geometric elevation = 90 - 91 = -1.0 deg
    const topo0m = ephemerisEngine.calculateTopocentric(siteLat, siteLon, 0, targetLat, targetLon);
    assertEqual(topo0m.elevDeg, -1.0);

    // Observer at 5000m elevation:
    // Dip allowance = sqrt(2 * 5 / 1737.4) * (180 / pi) ~= 0.075866 * 57.2957795 ~= 4.3468 deg
    // Elev = -1.0 + 4.3468 ~= 3.35 deg
    const topo5000m = ephemerisEngine.calculateTopocentric(siteLat, siteLon, 5000, targetLat, targetLon);
    assertGreaterThan(topo5000m.elevDeg, topo0m.elevDeg);
    assertApproxEqual(topo5000m.elevDeg, 3.35, 0.05);

    // Observer at negative elevation (crater floor): dip allowance is not applied
    const topoNeg = ephemerisEngine.calculateTopocentric(siteLat, siteLon, -1000, targetLat, targetLon);
    assertEqual(topoNeg.elevDeg, -1.0);
  });
});

describe('Adversarial Stress Test: Multi-Criteria Viability Scoring', () => {
  test('Viability score adheres strictly to 0.45*sunlit + 0.35*dte + 0.20*slopePenalty', () => {
    // Construct sites with known parameters to test scoring bounds
    const testCases = [
      { slopeDeg: 0.0, expectedPenalty: 100.0 },
      { slopeDeg: 10.0, expectedPenalty: 50.0 },
      { slopeDeg: 20.0, expectedPenalty: 0.0 },
      { slopeDeg: 35.0, expectedPenalty: 0.0 }, // clamped at 0
    ];

    for (const tc of testCases) {
      const site = {
        id: `score_test_${tc.slopeDeg}`,
        name: `Score Test Slope ${tc.slopeDeg}`,
        shortName: `Score ${tc.slopeDeg}`,
        lat: -89.5,
        lon: 0.0,
        elevM: 1000,
        slopeDeg: tc.slopeDeg,
        horizonProfile: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      };

      const cycle = ephemerisEngine.computeFullCycle(site, '2026-11-14');
      const expectedScore = Math.round(
        (cycle.sunlitPct * 0.45) + (cycle.dtePct * 0.35) + (tc.expectedPenalty * 0.20)
      );

      assertEqual(cycle.viabilityScore, expectedScore,
        `Viability score mismatch for slope ${tc.slopeDeg}: expected ${expectedScore}, got ${cycle.viabilityScore}`);
      assertBetween(cycle.viabilityScore, 0, 100);
    }
  });
});
