/**
 * @fileoverview Infrastructure Sanity Verification Test Suite.
 * Validates test harness assertions, lifecycle hooks, async execution,
 * and core module loading compatibility with Node v22.
 */

import {
  describe, test, it,
  beforeAll, afterAll, beforeEach, afterEach,
  assert, assertFalse,
  assertEqual, assertNotEqual, assertDeepEqual,
  assertApproxEqual,
  assertGreaterThan, assertGreaterThanOrEqual,
  assertLessThan, assertLessThanOrEqual,
  assertBetween,
  assertThrows, assertReject,
  assertIncludes, assertMatch,
  assertDefined, assertUndefined,
  assertNull, assertNotNull,
  AssertionError,
} from './testHarness.js';

import { InterfaceContract, STEP_SCHEMA_KEYS, SUMMARY_SCHEMA_KEYS } from '../src/core/interfaceContract.js';
import { EphemerisEngine, ephemerisEngine } from '../src/core/ephemerisEngine.js';
import { AppStateStore, appState } from '../src/core/appState.js';

describe('Test Infrastructure: Assertion Primitives', () => {
  test('assert and assertFalse evaluate truthiness correctly', () => {
    assert(true);
    assert(1);
    assert('non-empty string');
    assert({});
    assertFalse(false);
    assertFalse(0);
    assertFalse('');
    assertFalse(null);
    assertFalse(undefined);
  });

  test('assertEqual and assertNotEqual enforce strict equality', () => {
    assertEqual(42, 42);
    assertEqual('selene', 'selene');
    const obj = { a: 1 };
    assertEqual(obj, obj);

    assertNotEqual(42, '42');
    assertNotEqual(true, 1);
    assertNotEqual({ a: 1 }, { a: 1 });
  });

  test('assertDeepEqual handles primitives, nested arrays, and objects', () => {
    assertDeepEqual({ a: 1, b: [2, 3, { c: 'luna' }] }, { a: 1, b: [2, 3, { c: 'luna' }] });
    assertDeepEqual([1, 2, 3], [1, 2, 3]);
    assertDeepEqual(new Date('2026-11-14T00:00:00Z'), new Date('2026-11-14T00:00:00Z'));
  });

  test('assertApproxEqual validates high-precision celestial floats', () => {
    assertApproxEqual(0.507948, 0.507949, 1e-4);
    assertApproxEqual(1361.0, 1361.00001, 1e-3);
    assertApproxEqual(-89.54, -89.54005, 1e-3);
    assertApproxEqual(NaN, NaN);
  });

  test('numeric boundary assertions function accurately', () => {
    assertGreaterThan(5.0, 4.99);
    assertGreaterThanOrEqual(5.0, 5.0);
    assertLessThan(1.5424, 1.55);
    assertLessThanOrEqual(1.5424, 1.5424);
    assertBetween(180.0, 0.0, 360.0);
    assertBetween(0.0, 0.0, 360.0);
    assertBetween(360.0, 0.0, 360.0);
  });

  test('assertThrows catches synchronous exceptions and matches patterns', () => {
    const errorFn = () => {
      throw new TypeError('Invalid site coordinate bounds');
    };

    const caught = assertThrows(errorFn, TypeError);
    assertEqual(caught.name, 'TypeError');

    assertThrows(errorFn, /Invalid site coordinate/);
    assertThrows(errorFn, 'coordinate bounds');

    // Verify assertThrows fails when no exception is thrown
    let failedToThrow = false;
    try {
      assertThrows(() => { /* no-op */ });
    } catch (e) {
      failedToThrow = true;
      assert(e instanceof AssertionError);
    }
    assert(failedToThrow, 'assertThrows should throw AssertionError if target succeeds');
  });

  test('assertReject catches asynchronous Promise rejections', async () => {
    const asyncRejectingFn = async () => {
      throw new RangeError('Hour offset exceeds synodic cycle [0, 708]');
    };

    const caught = await assertReject(asyncRejectingFn, RangeError);
    assertEqual(caught.name, 'RangeError');
    await assertReject(Promise.reject(new Error('Network offline')), /Network offline/);
  });

  test('collection and string inspection assertions', () => {
    assertIncludes('SeleneSight Lunar Platform', 'Lunar');
    assertIncludes(['shackleton', 'malapert', 'mouton'], 'malapert');
    assertMatch('2026-11-14', /^\d{4}-\d{2}-\d{2}$/);
    assertDefined(0);
    assertUndefined(undefined);
    assertNull(null);
    assertNotNull('valid_node');
  });
});

describe('Test Infrastructure: Lifecycle Hooks & Async Coordination', () => {
  let hookCounter = 0;
  let suiteSetupVal = '';

  beforeAll(() => {
    suiteSetupVal = 'INITIALIZED';
  });

  beforeEach(() => {
    hookCounter += 1;
  });

  afterEach(() => {
    hookCounter += 10;
  });

  afterAll(() => {
    suiteSetupVal = 'CLEANED';
  });

  test('lifecycle test 1 runs with proper hook sequence', async () => {
    assertEqual(suiteSetupVal, 'INITIALIZED');
    assertEqual(hookCounter, 1);
    // Simulating async delay
    await new Promise(resolve => setTimeout(resolve, 5));
    assertEqual(hookCounter, 1);
  });

  test('lifecycle test 2 observes preceding afterEach and beforeEach', () => {
    // Test 1: +1 (beforeEach) + 10 (afterEach) = 11. Test 2: +1 (beforeEach) = 12.
    assertEqual(hookCounter, 12);
  });
});

describe('Test Infrastructure: Core Module Interoperability', () => {
  test('InterfaceContract exports schema constants and methods', () => {
    assertDefined(InterfaceContract);
    assertEqual(typeof InterfaceContract.validateSite, 'function');
    assertEqual(typeof InterfaceContract.validateCycleData, 'function');
    assertEqual(typeof InterfaceContract.getMockSite, 'function');
    assertEqual(typeof InterfaceContract.getMockSites, 'function');

    assertEqual(STEP_SCHEMA_KEYS.length, 15);
    assertEqual(SUMMARY_SCHEMA_KEYS.length, 8);

    const mockSite = InterfaceContract.getMockSite();
    assert(InterfaceContract.validateSite(mockSite), 'Canonical mock site must pass validation');
  });

  test('EphemerisEngine initializes with astronomical constants', () => {
    assertDefined(EphemerisEngine);
    assertDefined(ephemerisEngine);

    assertEqual(ephemerisEngine.lunarRadiusKm, 1737.4);
    assertApproxEqual(ephemerisEngine.obliquityDeg, 1.5424, 1e-4);
    assertApproxEqual(ephemerisEngine.synodicHours, 708.73414, 1e-4);
    assertEqual(ephemerisEngine.solarConstant, 1361.0);

    // Verify dateToJulianDate method is callable
    const jd = ephemerisEngine.dateToJulianDate('2000-01-01');
    assertApproxEqual(jd, 2451544.5, 0.5);
  });

  test('AppStateStore initializes with reactive event capabilities', () => {
    assertDefined(AppStateStore);
    assertDefined(appState);
    assert(appState instanceof EventTarget, 'appState must inherit from EventTarget');

    assertEqual(appState.currentHour, 0);
    assertEqual(appState.arrayType, 'vertical_mast');
    assertEqual(appState.isPlaying, false);
    assertEqual(appState.playSpeed, 1);
  });
});
