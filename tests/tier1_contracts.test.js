/**
 * @fileoverview Tier 1 Feature Coverage Test Suite: Interface Contracts & NASA Site Profiles.
 * Tests Features F14 through F16 with >=5 genuine test cases per feature (>=15 total).
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

import {
  InterfaceContract,
  STEP_SCHEMA_KEYS,
  SUMMARY_SCHEMA_KEYS,
} from '../src/core/interfaceContract.js';

import { ephemerisEngine } from '../src/core/ephemerisEngine.js';

describe('Tier 1: F14 - Site Schema Runtime Validation', () => {
  test('F14-1: validates compliant canonical landing site descriptor successfully', () => {
    const site = InterfaceContract.getMockSite();
    assert(InterfaceContract.validateSite(site), 'Canonical mock site must pass validation');
  });

  test('F14-2: rejects null, undefined, primitive, or non-object arguments', () => {
    assertFalse(InterfaceContract.validateSite(null));
    assertFalse(InterfaceContract.validateSite(undefined));
    assertFalse(InterfaceContract.validateSite('shackleton'));
    assertFalse(InterfaceContract.validateSite(42));
    assertFalse(InterfaceContract.validateSite(true));
    assertFalse(InterfaceContract.validateSite([]));
  });

  test('F14-3: rejects site descriptors missing any of the 8 required schema properties', () => {
    const requiredProps = [
      'id', 'name', 'shortName', 'lat', 'lon',
      'elevM', 'slopeDeg', 'horizonProfile',
    ];

    for (const prop of requiredProps) {
      const defectiveSite = { ...InterfaceContract.getMockSite() };
      delete defectiveSite[prop];
      assertFalse(
        InterfaceContract.validateSite(defectiveSite),
        `validateSite must fail when required property "${prop}" is missing`
      );
    }
  });

  test('F14-4: rejects horizonProfile when not an array or when length is not exactly 12', () => {
    const site = InterfaceContract.getMockSite();

    assertFalse(InterfaceContract.validateSite({ ...site, horizonProfile: 'invalid-string' }));
    assertFalse(InterfaceContract.validateSite({ ...site, horizonProfile: { 0: 1.0 } }));
    assertFalse(InterfaceContract.validateSite({ ...site, horizonProfile: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] })); // length 11
    assertFalse(InterfaceContract.validateSite({ ...site, horizonProfile: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] })); // length 13
    assertFalse(InterfaceContract.validateSite({ ...site, horizonProfile: [] }));
  });

  test('F14-5: rejects out-of-bounds latitude and longitude coordinates', () => {
    const site = InterfaceContract.getMockSite();

    // Latitude must be in [-90.0, 90.0]
    assertFalse(InterfaceContract.validateSite({ ...site, lat: -90.01 }));
    assertFalse(InterfaceContract.validateSite({ ...site, lat: 90.01 }));
    assertFalse(InterfaceContract.validateSite({ ...site, lat: -95.0 }));
    assertFalse(InterfaceContract.validateSite({ ...site, lat: 95.0 }));
    assertFalse(InterfaceContract.validateSite({ ...site, lat: 'south' }));

    // Longitude must be in [-180.0, 360.0]
    assertFalse(InterfaceContract.validateSite({ ...site, lon: -180.1 }));
    assertFalse(InterfaceContract.validateSite({ ...site, lon: 360.1 }));
    assertFalse(InterfaceContract.validateSite({ ...site, lon: -200.0 }));
    assertFalse(InterfaceContract.validateSite({ ...site, lon: 400.0 }));
    assertFalse(InterfaceContract.validateSite({ ...site, lon: 'east' }));
  });

  test('F14-6: rejects invalid elevation and negative slope values', () => {
    const site = InterfaceContract.getMockSite();

    assertFalse(InterfaceContract.validateSite({ ...site, elevM: '2100' })); // string
    assertFalse(InterfaceContract.validateSite({ ...site, slopeDeg: -0.1 })); // negative slope
    assertFalse(InterfaceContract.validateSite({ ...site, slopeDeg: -10.0 }));
    assertFalse(InterfaceContract.validateSite({ ...site, slopeDeg: 'flat' }));
  });
});

describe('Tier 1: F15 - Cycle Data Runtime Validation', () => {
  test('F15-1: validates computed 709-hour ephemeris cycle output successfully', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = ephemerisEngine.computeFullCycle(site);
    assert(InterfaceContract.validateCycleData(cycle), 'Computed cycle must pass validateCycleData');
  });

  test('F15-2: rejects null, undefined, non-objects, and objects without a steps array', () => {
    assertFalse(InterfaceContract.validateCycleData(null));
    assertFalse(InterfaceContract.validateCycleData(undefined));
    assertFalse(InterfaceContract.validateCycleData('cycle'));
    assertFalse(InterfaceContract.validateCycleData(12345));
    assertFalse(InterfaceContract.validateCycleData({}));
    assertFalse(InterfaceContract.validateCycleData({ steps: 'not-an-array' }));
  });

  test('F15-3: rejects cycle datasets with step count not strictly equal to 709', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = ephemerisEngine.computeFullCycle(site);

    const cycleShort = { ...cycle, steps: cycle.steps.slice(0, 708) }; // 708 steps
    assertFalse(InterfaceContract.validateCycleData(cycleShort), 'Cycle with 708 steps must fail');

    const cycleLong = { ...cycle, steps: [...cycle.steps, { ...cycle.steps[0] }] }; // 710 steps
    assertFalse(InterfaceContract.validateCycleData(cycleLong), 'Cycle with 710 steps must fail');

    const cycleEmpty = { ...cycle, steps: [] };
    assertFalse(InterfaceContract.validateCycleData(cycleEmpty), 'Cycle with 0 steps must fail');
  });

  test('F15-4: rejects cycle when step 0 is missing any required STEP_SCHEMA_KEYS', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = ephemerisEngine.computeFullCycle(site);

    for (const key of STEP_SCHEMA_KEYS) {
      const defectiveStep0 = { ...cycle.steps[0] };
      delete defectiveStep0[key];

      const defectiveSteps = [defectiveStep0, ...cycle.steps.slice(1)];
      const defectiveCycle = { ...cycle, steps: defectiveSteps };

      assertFalse(
        InterfaceContract.validateCycleData(defectiveCycle),
        `validateCycleData must fail when step 0 is missing key "${key}"`
      );
    }
  });

  test('F15-5: rejects cycle when missing any required SUMMARY_SCHEMA_KEYS', () => {
    const site = InterfaceContract.getMockSite();
    const cycle = ephemerisEngine.computeFullCycle(site);

    for (const key of SUMMARY_SCHEMA_KEYS) {
      const defectiveCycle = { ...cycle };
      delete defectiveCycle[key];

      assertFalse(
        InterfaceContract.validateCycleData(defectiveCycle),
        `validateCycleData must fail when summary key "${key}" is missing`
      );
    }
  });

  test('F15-6: verifies schema key constant immutability via Object.isFrozen', () => {
    assert(Object.isFrozen(STEP_SCHEMA_KEYS), 'STEP_SCHEMA_KEYS must be frozen');
    assert(Object.isFrozen(SUMMARY_SCHEMA_KEYS), 'SUMMARY_SCHEMA_KEYS must be frozen');
    assertEqual(STEP_SCHEMA_KEYS.length, 15, 'STEP_SCHEMA_KEYS must contain exactly 15 keys');
    assertEqual(SUMMARY_SCHEMA_KEYS.length, 8, 'SUMMARY_SCHEMA_KEYS must contain exactly 8 keys');
  });
});

describe('Tier 1: F16 - Canonical NASA Site Profiles', () => {
  test('F16-1: provides exactly 4 canonical lunar south pole landing site profiles', () => {
    const sites = InterfaceContract.getMockSites();
    assert(Array.isArray(sites));
    assertEqual(sites.length, 4, 'getMockSites must return exactly 4 canonical sites');
  });

  test('F16-2: ensures all 4 canonical site profiles strictly pass InterfaceContract.validateSite', () => {
    const sites = InterfaceContract.getMockSites();
    for (const site of sites) {
      assert(InterfaceContract.validateSite(site), `Site "${site.id}" must pass validateSite`);
    }
  });

  test('F16-3: verifies primary canonical site matches Shackleton Crater Connecting Ridge', () => {
    const primary = InterfaceContract.getMockSite();
    const sites = InterfaceContract.getMockSites();

    assertEqual(primary.id, 'shackleton_rim_primary');
    assertEqual(primary.id, sites[0].id);
    assertEqual(primary.name, 'Shackleton Crater Connecting Ridge');
    assertEqual(primary.shortName, 'Shackleton Ridge');
    assertEqual(primary.lat, -89.54);
    assertEqual(primary.lon, 137.0);
    assertEqual(primary.elevM, 2100);
    assertEqual(primary.slopeDeg, 8.5);
  });

  test('F16-4: ensures all canonical site coordinates lie within lunar south polar target zone', () => {
    const sites = InterfaceContract.getMockSites();
    for (const site of sites) {
      // Polar mission candidate regions lie between -90 and -80 deg latitude
      assertBetween(site.lat, -90.0, -80.0, `Site ${site.id} latitude must be in south polar zone [-90, -80]`);
      assertBetween(site.lon, -180.0, 360.0, `Site ${site.id} longitude must be valid`);
    }
  });

  test('F16-5: verifies realistic elevation, slope, and PSR proximity parameters across all profiles', () => {
    const sites = InterfaceContract.getMockSites();
    const siteIds = new Set();

    for (const site of sites) {
      assertFalse(siteIds.has(site.id), `Site ID "${site.id}" must be unique`);
      siteIds.add(site.id);

      // Elevated peaks: 2000 to 5500 meters
      assertGreaterThanOrEqual(site.elevM, 2000, `Site ${site.id} elevation must be >= 2000m`);
      assertLessThanOrEqual(site.elevM, 6000, `Site ${site.id} elevation must be <= 6000m`);

      // Slopes within safe/moderate exploration grades: 5.0 to 15.0 degrees
      assertBetween(site.slopeDeg, 5.0, 15.0, `Site ${site.id} slope must be in [5.0, 15.0] deg`);

      // Distance to PSR in kilometers
      assertDefined(site.psrDistKm, `Site ${site.id} should document psrDistKm`);
      assertGreaterThan(site.psrDistKm, 0.0);
    }
  });

  test('F16-6: verifies 12-sector LOLA horizon profiles contain realistic ridge angles', () => {
    const sites = InterfaceContract.getMockSites();
    for (const site of sites) {
      assertEqual(site.horizonProfile.length, 12);
      for (let i = 0; i < 12; i++) {
        const angle = site.horizonProfile[i];
        assertGreaterThanOrEqual(angle, 0.0, `Horizon mask in sector ${i} must be >= 0 deg`);
        assertLessThanOrEqual(angle, 5.0, `Horizon mask in sector ${i} must be <= 5.0 deg`);
      }
    }
  });
});
