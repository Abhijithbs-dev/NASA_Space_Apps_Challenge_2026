/**
 * @fileoverview Tier 2 Boundary & Corner Case Test Suite: Interface Contracts & Schema Validation.
 * Tests Features F14 through F16 with >=5 genuine boundary test cases per feature (18 tests total).
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

import { InterfaceContract, STEP_SCHEMA_KEYS, SUMMARY_SCHEMA_KEYS } from '../src/core/interfaceContract.js';

describe('Tier 2: F14 - Site Schema Runtime Validation Boundary & Corner Cases', () => {
  let canonicalSite;

  beforeEach(() => {
    canonicalSite = InterfaceContract.getMockSite();
  });

  test('F14-B1: individual missing required properties: omitting any of the 8 schema keys returns false', () => {
    const requiredProps = [
      'id', 'name', 'shortName', 'lat', 'lon',
      'elevM', 'slopeDeg', 'horizonProfile',
    ];

    for (const prop of requiredProps) {
      const corruptSite = { ...canonicalSite };
      delete corruptSite[prop];
      assertFalse(
        InterfaceContract.validateSite(corruptSite),
        `validateSite must return false when required property "${prop}" is missing`
      );
    }
  });

  test('F14-B2: horizonProfile length boundaries: rejects lengths 0, 11, 13, and 24; strictly requires 12', () => {
    // Length 11
    const len11 = { ...canonicalSite, horizonProfile: canonicalSite.horizonProfile.slice(0, 11) };
    assertFalse(InterfaceContract.validateSite(len11), 'horizonProfile of length 11 must be rejected');

    // Length 13
    const len13 = { ...canonicalSite, horizonProfile: [...canonicalSite.horizonProfile, 1.0] };
    assertFalse(InterfaceContract.validateSite(len13), 'horizonProfile of length 13 must be rejected');

    // Length 0 (empty)
    const len0 = { ...canonicalSite, horizonProfile: [] };
    assertFalse(InterfaceContract.validateSite(len0), 'Empty horizonProfile must be rejected');

    // Length 24
    const len24 = { ...canonicalSite, horizonProfile: [...canonicalSite.horizonProfile, ...canonicalSite.horizonProfile] };
    assertFalse(InterfaceContract.validateSite(len24), 'horizonProfile of length 24 must be rejected');

    // Exactly 12
    assert(InterfaceContract.validateSite(canonicalSite), 'Exact 12-element horizonProfile must be valid');
  });

  test('F14-B3: horizonProfile non-array types: rejects null, undefined, objects, numbers, and strings', () => {
    const invalidTypes = [null, undefined, {}, { 0: 1.0, length: 12 }, 42, 'flat_horizon', true];

    for (const val of invalidTypes) {
      const corrupt = { ...canonicalSite, horizonProfile: val };
      assertFalse(
        InterfaceContract.validateSite(corrupt),
        `horizonProfile with type ${typeof val} must be rejected`
      );
    }
  });

  test('F14-B4: latitude exact boundaries [-90.0, +90.0]: allows extremes, rejects out-of-bounds', () => {
    // Allowed exact limits
    assert(InterfaceContract.validateSite({ ...canonicalSite, lat: -90.0 }), 'Latitude -90.0° must be valid');
    assert(InterfaceContract.validateSite({ ...canonicalSite, lat: 90.0 }), 'Latitude +90.0° must be valid');
    assert(InterfaceContract.validateSite({ ...canonicalSite, lat: 0.0 }), 'Latitude 0.0° must be valid');

    // Rejected out-of-bounds
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lat: -90.001 }), 'Latitude -90.001° must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lat: 90.001 }), 'Latitude +90.001° must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lat: -180.0 }), 'Latitude -180.0° must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lat: 180.0 }), 'Latitude 180.0° must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lat: '-89.5' }), 'String latitude must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lat: true }), 'Boolean latitude must be rejected');
  });

  test('F14-B5: longitude exact boundaries [-180.0, +360.0]: allows lunar ranges, rejects out-of-bounds', () => {
    // Allowed ranges
    assert(InterfaceContract.validateSite({ ...canonicalSite, lon: -180.0 }), 'Longitude -180.0° must be valid');
    assert(InterfaceContract.validateSite({ ...canonicalSite, lon: 0.0 }), 'Longitude 0.0° must be valid');
    assert(InterfaceContract.validateSite({ ...canonicalSite, lon: 180.0 }), 'Longitude 180.0° must be valid');
    assert(InterfaceContract.validateSite({ ...canonicalSite, lon: 360.0 }), 'Longitude 360.0° must be valid');

    // Rejected out-of-bounds
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lon: -180.001 }), 'Longitude -180.001° must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lon: 360.001 }), 'Longitude 360.001° must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lon: -360.0 }), 'Longitude -360.0° must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lon: 720.0 }), 'Longitude 720.0° must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lon: '137.0' }), 'String longitude must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lon: false }), 'Boolean longitude must be rejected');
  });

  test('F14-B6: slope and elevation boundary conditions: slope >= 0.0, numeric types enforced', () => {
    // Zero slope (flat) is valid
    assert(InterfaceContract.validateSite({ ...canonicalSite, slopeDeg: 0.0 }), 'Zero slope 0.0° must be valid');

    // Negative slope is strictly invalid
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, slopeDeg: -0.001 }), 'Negative slope -0.001° must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, slopeDeg: -15.0 }), 'Negative slope -15.0° must be rejected');

    // Non-numeric elevation or slope
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, elevM: '2100' }), 'String elevM must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, elevM: null }), 'null elevM must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, elevM: [2100] }), 'Array elevM must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, slopeDeg: '8.5' }), 'String slopeDeg must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, slopeDeg: {} }), 'Object slopeDeg must be rejected');

    // Primitive and null site descriptors
    assertFalse(InterfaceContract.validateSite(null), 'null site must be rejected');
    assertFalse(InterfaceContract.validateSite(undefined), 'undefined site must be rejected');
    assertFalse(InterfaceContract.validateSite('shackleton'), 'string site must be rejected');
    assertFalse(InterfaceContract.validateSite(12345), 'number site must be rejected');
  });
});

describe('Tier 2: F15 - Cycle Data Runtime Validation Boundary & Corner Cases', () => {
  let mockStep;
  let validCycle;

  beforeEach(() => {
    mockStep = {};
    for (const key of STEP_SCHEMA_KEYS) {
      mockStep[key] = (key === 'isSunlit' || key === 'isEarthVisible') ? true : 0.0;
    }

    validCycle = {
      site: InterfaceContract.getMockSite(),
      epochDateStr: '2026-11-14',
      arrayType: 'vertical_mast',
      steps: new Array(709).fill(null).map((_, i) => ({ ...mockStep, hourOffset: i })),
    };

    for (const key of SUMMARY_SCHEMA_KEYS) {
      validCycle[key] = 0.0;
    }
  });

  test('F15-B1: step count boundary: strictly 709 steps required (708, 710, 0, 1 are all rejected)', () => {
    // Exactly 709 is valid
    assert(InterfaceContract.validateCycleData(validCycle), '709-step cycle must pass validation');

    // 708 steps (one short)
    const len708 = { ...validCycle, steps: validCycle.steps.slice(0, 708) };
    assertFalse(InterfaceContract.validateCycleData(len708), '708-step cycle must be rejected');

    // 710 steps (one too many)
    const len710 = { ...validCycle, steps: [...validCycle.steps, { ...mockStep, hourOffset: 709 }] };
    assertFalse(InterfaceContract.validateCycleData(len710), '710-step cycle must be rejected');

    // 0 steps (empty)
    const len0 = { ...validCycle, steps: [] };
    assertFalse(InterfaceContract.validateCycleData(len0), '0-step cycle must be rejected');

    // 1 step
    const len1 = { ...validCycle, steps: [validCycle.steps[0]] };
    assertFalse(InterfaceContract.validateCycleData(len1), '1-step cycle must be rejected');
  });

  test('F15-B2: step 0 schema completeness: omitting any of the 15 STEP_SCHEMA_KEYS returns false', () => {
    for (const key of STEP_SCHEMA_KEYS) {
      const corruptStep0 = { ...mockStep };
      delete corruptStep0[key];

      const corruptCycle = {
        ...validCycle,
        steps: [corruptStep0, ...validCycle.steps.slice(1)],
      };

      assertFalse(
        InterfaceContract.validateCycleData(corruptCycle),
        `validateCycleData must reject cycle when step 0 is missing key "${key}"`
      );
    }
  });

  test('F15-B3: summary schema completeness: omitting any of the 8 SUMMARY_SCHEMA_KEYS returns false', () => {
    for (const key of SUMMARY_SCHEMA_KEYS) {
      const corruptCycle = { ...validCycle };
      delete corruptCycle[key];

      assertFalse(
        InterfaceContract.validateCycleData(corruptCycle),
        `validateCycleData must reject cycle when missing summary key "${key}"`
      );
    }
  });

  test('F15-B4: steps property non-array types: rejects null, undefined, objects, numbers, and strings', () => {
    const invalidStepValues = [null, undefined, {}, { 0: mockStep, length: 709 }, 709, '709_steps'];

    for (const val of invalidStepValues) {
      const corrupt = { ...validCycle, steps: val };
      assertFalse(
        InterfaceContract.validateCycleData(corrupt),
        `validateCycleData must reject cycle when steps is ${typeof val}`
      );
    }
  });

  test('F15-B5: null, undefined, primitive, and empty object cycleData arguments return false', () => {
    assertFalse(InterfaceContract.validateCycleData(null), 'null cycleData must return false');
    assertFalse(InterfaceContract.validateCycleData(undefined), 'undefined cycleData must return false');
    assertFalse(InterfaceContract.validateCycleData('cycleData'), 'string cycleData must return false');
    assertFalse(InterfaceContract.validateCycleData(42), 'number cycleData must return false');
    assertFalse(InterfaceContract.validateCycleData({}), 'empty object cycleData must return false');
  });

  test('F15-B6: schema key immutability: STEP_SCHEMA_KEYS and SUMMARY_SCHEMA_KEYS are frozen objects', () => {
    assert(Object.isFrozen(STEP_SCHEMA_KEYS), 'STEP_SCHEMA_KEYS array must be frozen');
    assert(Object.isFrozen(SUMMARY_SCHEMA_KEYS), 'SUMMARY_SCHEMA_KEYS array must be frozen');
    assertEqual(STEP_SCHEMA_KEYS.length, 15, 'STEP_SCHEMA_KEYS must contain exactly 15 keys');
    assertEqual(SUMMARY_SCHEMA_KEYS.length, 8, 'SUMMARY_SCHEMA_KEYS must contain exactly 8 keys');
  });
});

describe('Tier 2: F16 - Canonical NASA Site Profiles Boundary Checks', () => {
  let mockSites;

  beforeEach(() => {
    mockSites = InterfaceContract.getMockSites();
  });

  test('F16-B1: canonical site catalog size is strictly 4 distinct lunar south pole candidate sites', () => {
    assertEqual(mockSites.length, 4, 'getMockSites must return exactly 4 canonical profiles');

    const expectedIds = [
      'shackleton_rim_primary',
      'malapert_massif_summit',
      'mons_mouton_plateau',
      'connecting_ridge_south',
    ];

    const actualIds = mockSites.map(s => s.id);
    assertDeepEqual(actualIds, expectedIds, 'Canonical site IDs must match required fixtures in exact order');
  });

  test('F16-B2: polar latitude boundary: all 4 profiles lie strictly within [-90.0°, -80.0°] south polar zone', () => {
    for (const site of mockSites) {
      assertBetween(
        site.lat,
        -90.0,
        -80.0,
        `Site ${site.id} latitude (${site.lat}) must be within [-90.0°, -80.0°]`
      );
    }
  });

  test('F16-B3: elevation boundaries: all profiles have realistic lunar topography in [0m, 6000m]', () => {
    for (const site of mockSites) {
      assertBetween(
        site.elevM,
        0,
        6000,
        `Site ${site.id} elevation (${site.elevM}m) must be realistic [0m, 6000m]`
      );
    }

    // Mons Mouton is the highest plateau (~5400m)
    const mouton = mockSites.find(s => s.id === 'mons_mouton_plateau');
    assertEqual(mouton.elevM, 5400, 'Mons Mouton elevation must be 5400m');

    // Malapert Massif is 4800m
    const malapert = mockSites.find(s => s.id === 'malapert_massif_summit');
    assertEqual(malapert.elevM, 4800, 'Malapert Massif elevation must be 4800m');
  });

  test('F16-B4: terrain slope boundaries: all profiles have trafficable or ridge slopes in [0.0°, 20.0°]', () => {
    for (const site of mockSites) {
      assertBetween(
        site.slopeDeg,
        0.0,
        20.0,
        `Site ${site.id} slope (${site.slopeDeg}°) must be within [0.0°, 20.0°]`
      );
    }

    // Mons Mouton Plateau has gentler slope (6.2°) for trafficability
    const mouton = mockSites.find(s => s.id === 'mons_mouton_plateau');
    assertLessThan(mouton.slopeDeg, 10.0, 'Mons Mouton slope must be moderate for rover trafficability');
  });

  test('F16-B5: 12-sector LOLA horizon profiles: all sectors are finite positive angles in [0.0°, 10.0°]', () => {
    for (const site of mockSites) {
      assertEqual(site.horizonProfile.length, 12, `Site ${site.id} must have 12 sectors`);
      for (let s = 0; s < 12; s++) {
        const angle = site.horizonProfile[s];
        assertFalse(Number.isNaN(angle), `Sector ${s} in ${site.id} must not be NaN`);
        assertBetween(
          angle,
          0.0,
          10.0,
          `Site ${site.id} sector ${s} angle (${angle}°) must be within [0.0°, 10.0°]`
        );
      }
    }
  });

  test('F16-B6: fixture idempotence: calling getMockSite and getMockSites returns compliant data on repeated calls', () => {
    const site1 = InterfaceContract.getMockSite();
    const site2 = InterfaceContract.getMockSite();
    assertDeepEqual(site1, site2, 'getMockSite must return identical canonical data');

    const sites1 = InterfaceContract.getMockSites();
    const sites2 = InterfaceContract.getMockSites();
    assertEqual(sites1.length, sites2.length);
    assertDeepEqual(sites1[0], sites2[0]);
  });
});
