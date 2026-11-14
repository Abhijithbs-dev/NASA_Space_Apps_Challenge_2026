/**
 * @fileoverview Tier 5 Unified Adversarial Hardening Test Suite for SeleneSight.
 *
 * Consolidates adversarial stress scenarios and edge-case validations discovered during
 * Milestone M4 Phase 2 audit across:
 * 1. InterfaceContract: validateSite runtime bounds, finiteness, non-empty strings, and profile checks.
 * 2. InterfaceContract: validateCycleData complete 709-step validation, NaN guards, and summary checks.
 * 3. EphemerisEngine: Malformed epoch recovery, subSolarLonDeg modulo 360 wrapping, fractional countdowns.
 * 4. AppStateStore: -0 prevention on slopeDelta, scenario comparator sync, NaN setHour immunity, init defense.
 * 5. AppStateStore: Playback speed 0/overflow immunity and convenience aliases.
 *
 * Adheres strictly to zero external npm dependencies and ECMAScript 2022 Native.
 */

import {
  describe, test, beforeEach, afterEach,
  assert, assertFalse,
  assertEqual, assertNotEqual, assertDeepEqual,
  assertApproxEqual,
  assertGreaterThan, assertGreaterThanOrEqual,
  assertLessThan, assertLessThanOrEqual,
  assertBetween,
  assertNull, assertNotNull,
  assertThrows,
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

import { AppStateStore } from '../src/core/appState.js';

// -----------------------------------------------------------------------------
// Suite 1: InterfaceContract validateSite Hardening
// -----------------------------------------------------------------------------
describe('Tier 5 Hardened: InterfaceContract.validateSite Requirements', () => {
  const canonicalSite = InterfaceContract.getMockSite();

  test('T5-SPEC-SITE-01: Rejection of NaN values in numeric coordinates and properties', () => {
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lat: NaN }), 'lat=NaN must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, lon: NaN }), 'lon=NaN must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, elevM: NaN }), 'elevM=NaN must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, slopeDeg: NaN }), 'slopeDeg=NaN must be rejected');
  });

  test('T5-SPEC-SITE-02: Rejection of Infinity / -Infinity in elevation and slope', () => {
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, elevM: Infinity }), 'elevM=+Infinity must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, elevM: -Infinity }), 'elevM=-Infinity must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, slopeDeg: Infinity }), 'slopeDeg=+Infinity must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, slopeDeg: -Infinity }), 'slopeDeg=-Infinity must be rejected');
  });

  test('T5-SPEC-SITE-03: Validation of horizonProfile array element finiteness and types', () => {
    const profilesWithBadElements = [
      [NaN, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [Infinity, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ['-Infinity', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ['ridge', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [undefined, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];

    for (const badProfile of profilesWithBadElements) {
      assertFalse(
        InterfaceContract.validateSite({ ...canonicalSite, horizonProfile: badProfile }),
        'horizonProfile with non-finite/non-numeric elements must be rejected'
      );
    }
  });

  test('T5-SPEC-SITE-04: Non-empty string requirements on id, name, and shortName', () => {
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, id: null }), 'null id must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, id: '' }), 'empty string id must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, id: '   ' }), 'whitespace id must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, name: '' }), 'empty string name must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, name: '   ' }), 'whitespace name must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, shortName: '' }), 'empty string shortName must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, shortName: '   ' }), 'whitespace shortName must be rejected');
    assertFalse(InterfaceContract.validateSite({ ...canonicalSite, id: 12345 }), 'non-string id must be rejected');
  });
});

// -----------------------------------------------------------------------------
// Suite 2: InterfaceContract validateCycleData Hardening
// -----------------------------------------------------------------------------
describe('Tier 5 Hardened: InterfaceContract.validateCycleData Requirements', () => {
  const mockStep = {};
  for (const key of STEP_SCHEMA_KEYS) {
    mockStep[key] = (key === 'isSunlit' || key === 'isEarthVisible') ? true : 0.0;
  }
  const validSummary = {};
  for (const key of SUMMARY_SCHEMA_KEYS) {
    validSummary[key] = 50.0;
  }

  test('T5-SPEC-CYCLE-01: Rejection of cycle datasets with null or missing steps across [0, 708]', () => {
    // Corrupt middle step
    const middleCorrupt = {
      steps: new Array(709).fill(null).map((_, i) => (i === 354 ? null : { ...mockStep, hourOffset: i })),
      ...validSummary,
    };
    assertFalse(InterfaceContract.validateCycleData(middleCorrupt), 'Cycle with null step at h=354 must be rejected');

    // Corrupt final step
    const endCorrupt = {
      steps: new Array(709).fill(null).map((_, i) => (i === 708 ? undefined : { ...mockStep, hourOffset: i })),
      ...validSummary,
    };
    assertFalse(InterfaceContract.validateCycleData(endCorrupt), 'Cycle with undefined step at h=708 must be rejected');
  });

  test('T5-SPEC-CYCLE-02: Rejection of cycle datasets containing NaN or non-finite values', () => {
    const nanStep = { ...mockStep, sunElDeg: NaN };
    const nanCycle = {
      steps: [nanStep, ...new Array(708).fill(mockStep)],
      ...validSummary,
    };
    assertFalse(InterfaceContract.validateCycleData(nanCycle), 'Cycle containing step with sunElDeg=NaN must be rejected');

    const nanSummaryCycle = {
      steps: new Array(709).fill(mockStep),
      ...validSummary,
      viabilityScore: NaN,
    };
    assertFalse(InterfaceContract.validateCycleData(nanSummaryCycle), 'Cycle with viabilityScore=NaN must be rejected');
  });

  test('T5-SPEC-CYCLE-03: Rejection of non-boolean values for isSunlit or isEarthVisible in steps', () => {
    const badBoolStep = { ...mockStep, isSunlit: 'true' };
    const badBoolCycle = {
      steps: [badBoolStep, ...new Array(708).fill(mockStep)],
      ...validSummary,
    };
    assertFalse(InterfaceContract.validateCycleData(badBoolCycle), 'String "true" for isSunlit must be rejected');
  });
});

// -----------------------------------------------------------------------------
// Suite 3: EphemerisEngine Resilient Math Execution
// -----------------------------------------------------------------------------
describe('Tier 5 Hardened: EphemerisEngine Resilient Math Execution', () => {
  const canonicalSite = InterfaceContract.getMockSite();

  test('T5-SPEC-ENGINE-01: computeFullCycle falls back gracefully to default epoch on malformed date string', () => {
    const malformedEpochs = ['invalid-date', 'not-a-date', '2026', 'bad-input', '2026-99-99'];

    for (const epoch of malformedEpochs) {
      const cycle = ephemerisEngine.computeFullCycle(canonicalSite, epoch);
      assertEqual(cycle.steps.length, 709);
      assertFalse(Number.isNaN(cycle.steps[0].subSolarLatDeg), `Step 0 subSolarLatDeg must not be NaN for epoch "${epoch}"`);
      assertFalse(Number.isNaN(cycle.steps[0].sunElDeg), `Step 0 sunElDeg must not be NaN for epoch "${epoch}"`);
      assertFalse(Number.isNaN(cycle.viabilityScore), `viabilityScore must not be NaN for epoch "${epoch}"`);
      assert(InterfaceContract.validateCycleData(cycle), `Fallback cycle must pass validateCycleData for epoch "${epoch}"`);
    }
  });

  test('T5-SPEC-ENGINE-02: subSolarLonDeg strictly wraps to 0.0 on [359.95, 360.0) float boundary', () => {
    for (let h = 0; h < 709; h++) {
      const cycle = ephemerisEngine.computeFullCycle(canonicalSite, '2026-11-14');
      const step = cycle.steps[h];
      assertGreaterThanOrEqual(step.subSolarLonDeg, 0.0);
      assertLessThan(step.subSolarLonDeg, 360.0, `subSolarLonDeg must be < 360.0 at h=${h}`);
    }
  });

  test('T5-SPEC-ENGINE-03: getTransitionCountdowns handles fractional currentHour cleanly', () => {
    const steps = [
      { isSunlit: true, isEarthVisible: true },
      { isSunlit: false, isEarthVisible: false },
      { isSunlit: true, isEarthVisible: true },
    ];

    const res = ephemerisEngine.getTransitionCountdowns(steps, 0.2);
    assertEqual(res.nextSunset, 1, 'Sunset should be detected at index delta 1');
  });
});

// -----------------------------------------------------------------------------
// Suite 4: AppStateStore Edge Cases & Hardening
// -----------------------------------------------------------------------------
describe('Tier 5 Adversarial: AppStateStore Edge Cases & Hardening', () => {
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

  test('T5-APP-01: slopeDelta strictly evaluates to +0 and never -0 for near-identical slopes', () => {
    const sites = [
      { ...InterfaceContract.getMockSite(), id: 'slope_a', slopeDeg: 7.02 },
      { ...InterfaceContract.getMockSite(), id: 'slope_b', slopeDeg: 7.00 },
    ];
    const customStore = new AppStateStore();
    customStore.init(sites);

    customStore.selectSiteA('slope_a');
    customStore.selectSiteB('slope_b');

    const delta = customStore.computeScenarioDelta();
    assertNotNull(delta);
    assertEqual(delta.slopeDelta, 0, 'Rounded slopeDelta should be 0');
    assertFalse(Object.is(delta.slopeDelta, -0), 'slopeDelta must NOT be negative zero (-0)');
    assertEqual(1 / delta.slopeDelta, Infinity, '1 / slopeDelta must evaluate to +Infinity');
  });

  test('T5-APP-02: setArrayType synchronizes both active cycleData and Scenario Comparator cycles', () => {
    assertEqual(store.arrayType, 'vertical_mast');
    const initScenarioA = store.scenarioA.cycleData;
    const initScenarioB = store.scenarioB.cycleData;

    store.setArrayType('sun_tracking');
    assertEqual(store.arrayType, 'sun_tracking');

    assertNotEqual(
      store.scenarioA.cycleData,
      initScenarioA,
      'Scenario A cycleData must be recomputed upon setArrayType'
    );
    assertNotEqual(
      store.scenarioB.cycleData,
      initScenarioB,
      'Scenario B cycleData must be recomputed upon setArrayType'
    );
  });

  test('T5-APP-03: setHour(NaN) and setHour(undefined) are immune to corruption and do not stall playback', async () => {
    store.setHour(NaN);
    assert(!isNaN(store.currentHour), 'currentHour must not become NaN when passed NaN');
    assertBetween(store.currentHour, 0, 708);

    store.setHour(undefined);
    assert(!isNaN(store.currentHour), 'currentHour must not become NaN when passed undefined');
    assertBetween(store.currentHour, 0, 708);

    // Playback loop must advance normally after bad setHour input
    store.setPlaySpeed(6);
    store.play();
    await new Promise(r => setTimeout(r, 80));
    store.pause();
    assert(!isNaN(store.currentHour), 'Playback loop must not produce NaN');
  });

  test('T5-APP-04: store.init() gracefully handles primitives and objects without throwing TypeError', () => {
    const s1 = new AppStateStore();
    s1.init(123);
    assertEqual(s1.sites.length, 4, 'Number input should fall back to mock sites');

    const s2 = new AppStateStore();
    s2.init('not-an-array');
    assertEqual(s2.sites.length, 4, 'String input should fall back to mock sites');

    const s3 = new AppStateStore();
    s3.init({ some: 'object' });
    assertEqual(s3.sites.length, 4, 'Object input should fall back to mock sites');

    const s4 = new AppStateStore();
    s4.init(null);
    assertEqual(s4.sites.length, 4, 'Null input should fall back to mock sites');
  });

  test('T5-APP-05: setPlaySpeed(0) and invalid speeds clamp interval safely without Infinity overflow', () => {
    store.setPlaySpeed(0);
    store.play();
    assertNotNull(store.playbackTimer_);
    store.pause();
    assertNull(store.playbackTimer_);

    store.setPlaySpeed(-5);
    store.play();
    assertNotNull(store.playbackTimer_);
    store.pause();
    assertNull(store.playbackTimer_);

    store.setPlaySpeed(NaN);
    store.play();
    assertNotNull(store.playbackTimer_);
    store.pause();
    assertNull(store.playbackTimer_);
  });

  test('T5-APP-06: AppStateStore convenience aliases selectSite and selectArrayType match methods', () => {
    assertEqual(typeof store.selectSite, 'function', 'store.selectSite must be a function');
    store.selectSite('malapert_massif_summit');
    assertEqual(store.activeSite.id, 'malapert_massif_summit');

    assertEqual(typeof store.selectArrayType, 'function', 'store.selectArrayType must be a function');
    store.selectArrayType('sun_tracking');
    assertEqual(store.arrayType, 'sun_tracking');
  });
});
