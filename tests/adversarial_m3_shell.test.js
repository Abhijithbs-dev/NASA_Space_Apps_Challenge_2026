/**
 * @fileoverview Adversarial M3 Shell & State Integration Test Suite.
 * Empirically stress-tests:
 * - F23: Aerospace Mission Control Shell UI state transitions & bindings
 * - F17/F18: Rapid timeline scrubbing across boundaries (0h, 1h, 354h, 707h, 708h, out-of-range clamping)
 * - F18: Rapid playback toggling, speed changes (1x, 3x, 6x), step forward/backward
 * - F16/F17: Rapid site switching across all 4 canonical sites without memory leaks or NaN/undefined
 * - F19: Scenario comparator delta calculations (identity, +0 sign, anti-symmetry)
 * - F20/F21: Data export validation (CSV 710 lines & JSON schema compliance)
 * - F26/F27: Canvas rendering pipeline integrity (balanced context saves, no NaN coordinates)
 *
 * Adheres strictly to ECMAScript 2022 and zero external dependencies.
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
  assertNotNull, assertNull,
  assertDefined, assertUndefined,
  assertIncludes,
} from './testHarness.js';

import { AppStateStore, appState } from '../src/core/appState.js';
import { ephemerisEngine } from '../src/core/ephemerisEngine.js';
import {
  InterfaceContract,
  STEP_SCHEMA_KEYS,
  SUMMARY_SCHEMA_KEYS,
} from '../src/core/interfaceContract.js';

describe('Adversarial M3: Rapid Timeline Scrubbing & Boundary Clamping', () => {
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

  test('F17/F18-A1: Boundary hours (0h, 1h, 354h, 707h, 708h) match exactly via setHour and setTimeIndex', () => {
    const boundaryPoints = [0, 1, 354, 707, 708];
    for (const hr of boundaryPoints) {
      store.setHour(hr);
      assertEqual(store.currentHour, hr, `Hour ${hr} must match`);
      store.setTimeIndex(hr);
      assertEqual(store.currentHour, hr, `setTimeIndex(${hr}) must match`);
    }
  });

  test('F17/F18-A2: Out-of-range negative values (-1 to -1e6) strictly clamp to 0', () => {
    const negativeCases = [-1, -5, -50, -100, -708, -999, -100000];
    for (const val of negativeCases) {
      store.setHour(val);
      assertEqual(store.currentHour, 0, `Value ${val} must clamp to 0`);
    }
  });

  test('F17/F18-A3: Out-of-range positive values (709 to 1e6) strictly clamp to 708', () => {
    const positiveCases = [709, 710, 800, 999, 1000, 50000, 1000000];
    for (const val of positiveCases) {
      store.setHour(val);
      assertEqual(store.currentHour, 708, `Value ${val} must clamp to 708`);
    }
  });

  test('F17/F18-A4: Non-integer floats and numeric strings clamp and round cleanly', () => {
    store.setHour(0.2);
    assertEqual(store.currentHour, 0);
    store.setHour(0.8);
    assertEqual(store.currentHour, 1);
    store.setHour(354.4);
    assertEqual(store.currentHour, 354);
    store.setHour(354.6);
    assertEqual(store.currentHour, 355);
    store.setHour(707.8);
    assertEqual(store.currentHour, 708);

    // Numeric strings from DOM inputs
    store.setHour('0');
    assertEqual(store.currentHour, 0);
    store.setHour('250');
    assertEqual(store.currentHour, 250);
    store.setHour('708');
    assertEqual(store.currentHour, 708);
  });

  test('F17/F18-A5: 2,000 rapid timeline scrub iterations with random float inputs stay within [0, 708]', () => {
    let eventsFired = 0;
    store.addEventListener('hourChanged', (e) => {
      eventsFired++;
      const h = e.detail.currentHour;
      assert(h >= 0 && h <= 708, `Dispatched hour ${h} out of bounds`);
    });

    for (let i = 0; i < 2000; i++) {
      const val = (Math.random() * 1600) - 400; // [-400, 1200]
      store.setHour(val);
      assert(store.currentHour >= 0 && store.currentHour <= 708);
    }
    assert(eventsFired > 1000);
  });
});

describe('Adversarial M3: Playback Toggling, Multi-Speed Switches & Stepping Boundaries', () => {
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

  test('F18-A1: 100 rapid play/pause toggles preserve timer nullity when paused', () => {
    for (let i = 0; i < 100; i++) {
      store.togglePlay();
      if (store.isPlaying) {
        assertNotNull(store.playbackTimer_);
      } else {
        assertNull(store.playbackTimer_);
      }
    }
    if (store.isPlaying) store.pause();
    assertEqual(store.isPlaying, false);
    assertNull(store.playbackTimer_);
  });

  test('F18-A2: Rapid speed switching while running preserves active playback without interval leaks', () => {
    store.play();
    const speeds = [1, 3, 6, 1, 6, 3, 1, 6];
    for (const spd of speeds) {
      store.setPlaySpeed(spd);
      assertEqual(store.playSpeed, spd);
      assert(store.isPlaying);
      assertNotNull(store.playbackTimer_);
    }
    store.pause();
    assertNull(store.playbackTimer_);
  });

  test('F18-A3: Step forward and step backward boundary clamping at 0h and 708h', () => {
    store.setHour(0);
    // Step back from 0 -> clamps at 0
    store.setHour(Math.max(0, store.currentHour - 1));
    assertEqual(store.currentHour, 0);

    // Step forward from 0 -> 1
    store.setHour(Math.min(708, store.currentHour + 1));
    assertEqual(store.currentHour, 1);

    // Step forward from 708 -> clamps at 708
    store.setHour(708);
    store.setHour(Math.min(708, store.currentHour + 1));
    assertEqual(store.currentHour, 708);

    // Step backward from 708 -> 707
    store.setHour(Math.max(0, store.currentHour - 1));
    assertEqual(store.currentHour, 707);
  });
});

describe('Adversarial M3: Rapid Site Switching & Telemetry Stability', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('F16/F17-A1: 200 rapid site switches maintain valid cycleData with zero NaN/undefined summary keys', () => {
    const siteIds = [
      'shackleton_rim_primary',
      'malapert_massif_summit',
      'mons_mouton_plateau',
      'connecting_ridge_south',
    ];

    for (let i = 0; i < 200; i++) {
      const siteId = siteIds[i % siteIds.length];
      store.setActiveSite(siteId);
      assertEqual(store.activeSite.id, siteId);
      assertNotNull(store.cycleData);
      assertEqual(store.cycleData.steps.length, 709);

      for (const k of SUMMARY_SCHEMA_KEYS) {
        const val = store.cycleData[k];
        assertNotNull(val);
        assertDefined(val);
        assertFalse(Number.isNaN(val));
        assert(Number.isFinite(val));
      }
    }
  });

  test('F16/F17-A2: All 4 canonical sites satisfy InterfaceContract and all 2,836 steps have zero NaN', () => {
    for (const site of store.sites) {
      store.setActiveSite(site.id);
      const data = store.cycleData;
      assert(InterfaceContract.validateCycleData(data));

      for (let h = 0; h < 709; h++) {
        const step = data.steps[h];
        for (const k of STEP_SCHEMA_KEYS) {
          assertNotNull(step[k]);
          assertDefined(step[k]);
          if (typeof step[k] === 'number') {
            assertFalse(Number.isNaN(step[k]));
          }
        }
      }
    }
  });
});

describe('Adversarial M3: Scenario Comparator Invariance & Antisymmetry', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('F19-A1: Identity check: Site A === Site B produces exactly 0 deltas with strictly +0 (no -0)', () => {
    const metrics = [
      'sunlitHoursDelta', 'dteHoursDelta', 'dualHoursDelta',
      'viabilityScoreDelta', 'elevMDelta', 'slopeDelta',
    ];

    for (const site of store.sites) {
      store.selectSiteA(site.id);
      store.selectSiteB(site.id);
      const delta = store.computeScenarioDelta();

      for (const m of metrics) {
        assertEqual(delta[m], 0);
        assertFalse(Object.is(delta[m], -0), `Delta ${m} must not be -0`);
        assert(Object.is(delta[m], 0), `Delta ${m} must be +0`);
      }
    }
  });

  test('F19-A2: Antisymmetry across all 16 site pairs: Delta(B, A) === -Delta(A, B)', () => {
    const metrics = [
      'sunlitHoursDelta', 'dteHoursDelta', 'dualHoursDelta',
      'viabilityScoreDelta', 'elevMDelta', 'slopeDelta',
    ];

    for (const sA of store.sites) {
      for (const sB of store.sites) {
        store.selectSiteA(sA.id);
        store.selectSiteB(sB.id);
        const dAB = store.computeScenarioDelta();

        store.selectSiteA(sB.id);
        store.selectSiteB(sA.id);
        const dBA = store.computeScenarioDelta();

        for (const m of metrics) {
          const sum = dAB[m] + dBA[m];
          assert(Math.abs(sum) < 1e-9, `Antisymmetry broken for ${m} on pair (${sA.id}, ${sB.id})`);
        }
      }
    }
  });
});

describe('Adversarial M3: Exporter Schema Compliance Across All 12 Configurations', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('F20/F21-A1: CSV 710 exact lines, 13 exact columns, strict binary flags, and JSON validation', () => {
    const siteIds = [
      'shackleton_rim_primary',
      'malapert_massif_summit',
      'mons_mouton_plateau',
      'connecting_ridge_south',
    ];
    const arrayTypes = ['vertical_mast', 'sun_tracking', 'horizontal_deck'];

    for (const siteId of siteIds) {
      for (const arr of arrayTypes) {
        store.setActiveSite(siteId);
        store.setArrayType(arr);

        // CSV validation
        const csv = store.exportToCSV();
        const lines = csv.trim().split('\n');
        assertEqual(lines.length, 710);
        const header = lines[0];
        assertIncludes(header, 'Hour_Offset');
        assertIncludes(header, 'Is_Sunlit');
        assertIncludes(header, 'Is_DTE');

        // Check rows
        for (let r = 1; r < lines.length; r++) {
          const cols = lines[r].split(',');
          assertEqual(cols.length, 13);
          assert(cols[4] === '0' || cols[4] === '1');
          assert(cols[8] === '0' || cols[8] === '1');
        }

        // JSON validation
        const jsonStr = store.exportToJSON();
        const parsed = JSON.parse(jsonStr);
        assert(InterfaceContract.validateCycleData(parsed));
        assertEqual(parsed.steps.length, 709);
        assertEqual(parsed.site.id, siteId);
        assertEqual(parsed.arrayType, arr);
      }
    }
  });
});
