/**
 * @fileoverview Adversarial Stress Test Suite for AppStateStore & API Aliases (Milestone M2).
 * Empirically challenges playback timer integrity, interval leakage, rapid cycling,
 * speed switching on the fly, auto-looping boundary, scrubber clamping, and event contracts.
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
  assertDefined,
  assertNotNull, assertNull,
} from './testHarness.js';

import { AppStateStore } from '../src/core/appState.js';
import { InterfaceContract } from '../src/core/interfaceContract.js';

describe('Adversarial M2: Playback Timer Integrity & Interval Leakage', () => {
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

  test('rapid play/pause cycling (100 toggles): no timer leaks, isPlaying strictly matches interval presence', () => {
    assertEqual(store.isPlaying, false);
    assertEqual(store.playbackTimer_, null, 'Initial playback timer must be null');

    let playStateChanges = 0;
    store.addEventListener('playStateChanged', () => {
      playStateChanges++;
    });

    // Perform 100 rapid toggles
    for (let i = 0; i < 100; i++) {
      store.togglePlay();
      if (store.isPlaying) {
        assertNotNull(store.playbackTimer_, `Timer handle must be non-null when isPlaying is true (iter ${i})`);
      } else {
        assertNull(store.playbackTimer_, `Timer handle must be null when isPlaying is false (iter ${i})`);
      }
    }

    assertEqual(store.isPlaying, false, 'After 100 toggles from false, isPlaying must be false');
    assertNull(store.playbackTimer_, 'Playback timer handle must be strictly null after 100 toggles');
    assertEqual(playStateChanges, 100, 'playStateChanged must be dispatched exactly 100 times');
  });

  test('rapid play/pause pairs (100 rapid sequences of play() then pause()): leaves zero lingering timers', () => {
    for (let i = 0; i < 100; i++) {
      store.play();
      assert(store.isPlaying, `Must be playing after play() in iteration ${i}`);
      assertNotNull(store.playbackTimer_, `Timer must exist during play in iteration ${i}`);

      store.pause();
      assertFalse(store.isPlaying, `Must be paused after pause() in iteration ${i}`);
      assertNull(store.playbackTimer_, `Timer must be null after pause in iteration ${i}`);
    }

    assertEqual(store.isPlaying, false);
    assertNull(store.playbackTimer_);
  });

  test('consecutively calling play() 10 times: exactly 1 interval exists, speed is not multiplied, event fires once', async () => {
    let playStateEventCount = 0;
    store.addEventListener('playStateChanged', () => {
      playStateEventCount++;
    });

    store.setTimeIndex(0);
    store.setPlaybackSpeed(1); // 100ms interval

    // Call play() 10 consecutive times
    for (let i = 0; i < 10; i++) {
      store.play();
    }

    assertEqual(store.isPlaying, true, 'Store must be playing');
    assertNotNull(store.playbackTimer_, 'Playback timer must exist');
    assertEqual(playStateEventCount, 1, 'playStateChanged must fire only ONCE for idempotent play() calls');

    const firstTimerHandle = store.playbackTimer_;

    // Call play() another 5 times while running
    for (let i = 0; i < 5; i++) {
      store.play();
      assertEqual(store.playbackTimer_, firstTimerHandle, 'Timer handle must NOT be replaced on redundant play()');
    }

    // Measure tick rate over ~150ms: with a 100ms interval, exactly 1 tick should occur (at most 2 with timing jitter).
    // If 15 intervals had been spawned, it would tick 15-30 times.
    await new Promise(resolve => setTimeout(resolve, 150));

    store.pause();
    assertBetween(store.currentHour, 1, 3, `Hour should have advanced by 1-2 ticks, got ${store.currentHour}`);
  });

  test('consecutively calling pause() 10 times: interval is null, no errors thrown, event fires once', async () => {
    store.play();
    assertEqual(store.isPlaying, true);
    assertNotNull(store.playbackTimer_);

    let pauseEventCount = 0;
    store.addEventListener('playStateChanged', () => {
      pauseEventCount++;
    });

    // Call pause() 10 consecutive times
    for (let i = 0; i < 10; i++) {
      store.pause();
      assertEqual(store.isPlaying, false, `Must remain paused on call ${i}`);
      assertNull(store.playbackTimer_, `Timer handle must remain null on call ${i}`);
    }

    assertEqual(pauseEventCount, 1, 'playStateChanged must fire only ONCE when pausing from active play');

    // Wait 120ms to verify zero ticks execute
    const hourBeforeWait = store.currentHour;
    await new Promise(resolve => setTimeout(resolve, 120));
    assertEqual(store.currentHour, hourBeforeWait, 'Current hour must not advance while paused');
  });

  test('playback speed switching on the fly while running (1x -> 3x -> 6x -> 1x): renews interval cleanly without leak', () => {
    store.setPlaybackSpeed(1);
    store.play();
    assertEqual(store.isPlaying, true);

    const speeds = [3, 6, 1, 6, 3, 1];
    let speedEvents = [];
    store.addEventListener('speedChanged', (e) => {
      speedEvents.push(e.detail.playSpeed);
    });

    for (const spd of speeds) {
      const prevTimer = store.playbackTimer_;
      store.setPlaybackSpeed(spd);

      assertEqual(store.playSpeed, spd, `Playback speed must be ${spd}`);
      assertEqual(store.isPlaying, true, 'Store must remain playing after speed switch');
      assertNotNull(store.playbackTimer_, 'Playback timer must remain active');
      // The old timer should have been cleared and replaced with a new interval handle
      assertNotEqual(store.playbackTimer_, prevTimer, 'Timer handle must be renewed on speed switch');
    }

    assertEqual(speedEvents.length, speeds.length, 'All speedChanged events must be dispatched');
    assertDeepEqual(speedEvents, speeds);

    store.pause();
    assertNull(store.playbackTimer_, 'Timer must be null after pausing');
  });

  test('playback speed switching while paused: updates speed property, leaves timer null, fires speedChanged', () => {
    store.pause();
    assertEqual(store.isPlaying, false);
    assertNull(store.playbackTimer_);

    const speeds = [3, 6, 1];
    const recordedEvents = [];
    store.addEventListener('speedChanged', (e) => {
      recordedEvents.push(e.detail.playSpeed);
    });

    for (const spd of speeds) {
      store.setPlaybackSpeed(spd);
      assertEqual(store.playSpeed, spd);
      assertEqual(store.isPlaying, false, 'Store must NOT start playing when speed is adjusted while paused');
      assertNull(store.playbackTimer_, 'Timer must remain null while paused');
    }

    assertDeepEqual(recordedEvents, speeds);
  });

  test('auto-looping boundary test: set hour to 708, trigger tick, verify it wraps to 0', async () => {
    store.setTimeIndex(708);
    assertEqual(store.currentHour, 708);

    const hourEvents = [];
    store.addEventListener('hourChanged', (e) => {
      hourEvents.push(e.detail.currentHour);
    });

    store.setPlaybackSpeed(6); // 30ms timer
    store.play();

    // Wait for 1-2 ticks (~70ms)
    await new Promise(resolve => setTimeout(resolve, 75));

    store.pause();

    // After ticking past 708, the first tick must wrap to 0
    assertGreaterThanOrEqual(hourEvents.length, 1, 'At least 1 hourChanged event should have fired');
    assertEqual(hourEvents[0], 0, `First tick after hour 708 must wrap to hour 0 (got ${hourEvents[0]})`);
    assertBetween(store.currentHour, 0, 3, 'Current hour must have wrapped into [0, 3]');
  });

  test('relative playback rate verification: 6x advances faster than 1x empirically', async () => {
    // Test 1x speed rate
    store.setTimeIndex(0);
    store.setPlaybackSpeed(1); // 100ms
    store.play();
    await new Promise(resolve => setTimeout(resolve, 250));
    store.pause();
    const ticks1x = store.currentHour;

    // Test 6x speed rate
    store.setTimeIndex(0);
    store.setPlaybackSpeed(6); // 30ms
    store.play();
    await new Promise(resolve => setTimeout(resolve, 250));
    store.pause();
    const ticks6x = store.currentHour;

    assertGreaterThan(ticks6x, ticks1x, `6x ticks (${ticks6x}) must be strictly greater than 1x ticks (${ticks1x})`);
  });
});

describe('Adversarial M2: Scrubber & Alias Boundary Conditions', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('setTimeIndex clamping and conversion across required boundary inputs', () => {
    // setTimeIndex(-999) -> clamps to 0
    store.setTimeIndex(-999);
    assertEqual(store.currentHour, 0, 'setTimeIndex(-999) must clamp to 0');

    // setTimeIndex(0) -> exactly 0
    store.setTimeIndex(0);
    assertEqual(store.currentHour, 0, 'setTimeIndex(0) must equal 0');

    // setTimeIndex(708) -> exactly 708
    store.setTimeIndex(708);
    assertEqual(store.currentHour, 708, 'setTimeIndex(708) must equal 708');

    // setTimeIndex(9999) -> clamps to 708
    store.setTimeIndex(9999);
    assertEqual(store.currentHour, 708, 'setTimeIndex(9999) must clamp to 708');

    // setTimeIndex(354.4) -> rounds to 354
    store.setTimeIndex(354.4);
    assertEqual(store.currentHour, 354, 'setTimeIndex(354.4) must round to 354');

    // setTimeIndex("500") -> converts to 500
    store.setTimeIndex('500');
    assertEqual(store.currentHour, 500, 'setTimeIndex("500") must convert to 500');
  });

  test('additional decimal boundary values: rounding before clamping', () => {
    store.setTimeIndex(354.6);
    assertEqual(store.currentHour, 355, '354.6 must round to 355');

    store.setTimeIndex(354.5);
    assertEqual(store.currentHour, 355, '354.5 must round to 355');

    store.setTimeIndex(-0.4);
    assertEqual(store.currentHour, 0, '-0.4 rounds to -0 which clamps to 0');

    store.setTimeIndex(-0.6);
    assertEqual(store.currentHour, 0, '-0.6 rounds to -1 which clamps to 0');

    store.setTimeIndex(707.49);
    assertEqual(store.currentHour, 707, '707.49 must round to 707');

    store.setTimeIndex(707.51);
    assertEqual(store.currentHour, 708, '707.51 must round to 708');

    store.setTimeIndex(708.49);
    assertEqual(store.currentHour, 708, '708.49 rounds to 708');

    store.setTimeIndex(708.51);
    assertEqual(store.currentHour, 708, '708.51 rounds to 709 and clamps to 708');
  });

  test('string numeric input variants handled safely', () => {
    store.setTimeIndex('-500');
    assertEqual(store.currentHour, 0, 'Negative numeric string "-500" must clamp to 0');

    store.setTimeIndex('0');
    assertEqual(store.currentHour, 0, '"0" must equal 0');

    store.setTimeIndex('708');
    assertEqual(store.currentHour, 708, '"708" must equal 708');

    store.setTimeIndex('1500');
    assertEqual(store.currentHour, 708, '"1500" must clamp to 708');

    store.setTimeIndex('42.7');
    assertEqual(store.currentHour, 43, '"42.7" must round to 43');
  });

  test('event listeners tracking hourChanged with payload fidelity and deduping', () => {
    const receivedHours = [];
    const listener = (e) => {
      assertDefined(e.detail, 'Event detail must be defined');
      assertDefined(e.detail.currentHour, 'Event detail.currentHour must be defined');
      receivedHours.push(e.detail.currentHour);
    };

    store.addEventListener('hourChanged', listener);

    // Initial hour is 0; setting to 0 again should NOT fire event
    store.setTimeIndex(0);
    assertEqual(receivedHours.length, 0, 'No event should fire when hour does not change');

    // Setting to 100
    store.setTimeIndex(100);
    assertEqual(receivedHours.length, 1);
    assertEqual(receivedHours[0], 100);

    // Setting to 100 again (no-op)
    store.setTimeIndex(100);
    assertEqual(receivedHours.length, 1, 'Redundant setTimeIndex(100) must NOT fire hourChanged');

    // Setting to 200
    store.setTimeIndex(200);
    assertEqual(receivedHours.length, 2);
    assertEqual(receivedHours[1], 200);

    store.removeEventListener('hourChanged', listener);
    store.setTimeIndex(300);
    assertEqual(receivedHours.length, 2, 'Unsubscribed listener must NOT receive events');
  });

  test('event listeners tracking playStateChanged with boolean payload', () => {
    const states = [];
    const listener = (e) => {
      assertDefined(e.detail);
      assertDefined(e.detail.isPlaying);
      assertEqual(typeof e.detail.isPlaying, 'boolean');
      states.push(e.detail.isPlaying);
    };

    store.addEventListener('playStateChanged', listener);

    store.play();
    store.play(); // redundant
    store.pause();
    store.pause(); // redundant
    store.play();
    store.pause();

    assertDeepEqual(states, [true, false, true, false], 'Only state transitions must be dispatched');
    store.removeEventListener('playStateChanged', listener);
  });

  test('event listeners tracking speedChanged with numeric payload', () => {
    const speeds = [];
    const listener = (e) => {
      assertDefined(e.detail);
      assertDefined(e.detail.playSpeed);
      assertEqual(typeof e.detail.playSpeed, 'number');
      speeds.push(e.detail.playSpeed);
    };

    store.addEventListener('speedChanged', listener);

    store.setPlaybackSpeed(3);
    store.setPlaybackSpeed(6);
    store.setPlaybackSpeed(1);

    assertDeepEqual(speeds, [3, 6, 1]);
    store.removeEventListener('speedChanged', listener);
  });

  test('selectSiteA and selectSiteB convenience aliases trigger scenariosUpdated with deltas', () => {
    let scenarioEventDetail = null;
    let eventCount = 0;

    store.addEventListener('scenariosUpdated', (e) => {
      eventCount++;
      scenarioEventDetail = e.detail;
    });

    // Use selectSiteA alias
    store.selectSiteA('mons_mouton_plateau');
    assertEqual(store.scenarioA.siteId, 'mons_mouton_plateau');
    assertNotNull(scenarioEventDetail);
    assertEqual(scenarioEventDetail.a.siteId, 'mons_mouton_plateau');
    assertNotNull(scenarioEventDetail.delta);

    // Use selectSiteB alias
    store.selectSiteB('connecting_ridge_south');
    assertEqual(store.scenarioB.siteId, 'connecting_ridge_south');
    assertEqual(scenarioEventDetail.b.siteId, 'connecting_ridge_south');
    assertNotNull(scenarioEventDetail.delta);

    assertEqual(eventCount, 2);

    // Verify delta keys
    const deltaKeys = [
      'sunlitHoursDelta', 'dteHoursDelta', 'dualHoursDelta',
      'viabilityScoreDelta', 'elevMDelta', 'slopeDelta',
    ];
    for (const key of deltaKeys) {
      assertDefined(scenarioEventDetail.delta[key], `Delta must contain ${key}`);
      assertEqual(typeof scenarioEventDetail.delta[key], 'number', `${key} must be number`);
    }
  });
});

describe('Adversarial M2: Concurrency, Scrubbing During Playback & Exporter Stability', () => {
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

  test('scrubbing timeline during active playback does not crash or corrupt timer loop', async () => {
    store.setPlaybackSpeed(6);
    store.play();
    assertEqual(store.isPlaying, true);

    // Rapidly jump timeline while interval is ticking
    store.setTimeIndex(100);
    assertEqual(store.currentHour, 100);

    store.setTimeIndex(500);
    assertEqual(store.currentHour, 500);

    store.setTimeIndex(708);
    assertEqual(store.currentHour, 708);

    // Let tick advance past 708
    await new Promise(resolve => setTimeout(resolve, 60));

    assertEqual(store.isPlaying, true, 'Must still be playing');
    // Must have wrapped past 708
    assertBetween(store.currentHour, 0, 5, 'Must have auto-looped cleanly to beginning of cycle');

    store.pause();
    assertEqual(store.isPlaying, false);
    assertNull(store.playbackTimer_);
  });

  test('exportToCSV and exportToJSON during active playback produce valid immutable snapshots', async () => {
    store.setPlaybackSpeed(6);
    store.play();

    // Export repeatedly while timer is running
    for (let i = 0; i < 5; i++) {
      const csv = store.exportToCSV();
      assert(typeof csv === 'string', 'exportToCSV must return string');
      assertEqual(csv.split('\n').length, 710, 'CSV must have 710 lines (1 header + 709 data rows)');

      const jsonStr = store.exportToJSON();
      assert(typeof jsonStr === 'string', 'exportToJSON must return string');
      const parsed = JSON.parse(jsonStr);
      assertEqual(parsed.steps.length, 709, 'JSON must contain 709 steps');

      await new Promise(resolve => setTimeout(resolve, 20));
    }

    store.pause();
  });

  test('high subscriber load: 50 listeners receive all dispatched events without dropped callbacks', () => {
    const listenerCounts = {
      hour: 0,
      playState: 0,
      speed: 0,
    };

    const listeners = [];
    for (let i = 0; i < 50; i++) {
      const hListener = () => { listenerCounts.hour++; };
      const pListener = () => { listenerCounts.playState++; };
      const sListener = () => { listenerCounts.speed++; };

      store.addEventListener('hourChanged', hListener);
      store.addEventListener('playStateChanged', pListener);
      store.addEventListener('speedChanged', sListener);

      listeners.push({ hListener, pListener, sListener });
    }

    store.setTimeIndex(42);
    assertEqual(listenerCounts.hour, 50, 'All 50 hourChanged listeners must be invoked');

    store.play();
    assertEqual(listenerCounts.playState, 50, 'All 50 playStateChanged listeners must be invoked');

    store.setPlaybackSpeed(3);
    assertEqual(listenerCounts.speed, 50, 'All 50 speedChanged listeners must be invoked');

    store.pause();
    assertEqual(listenerCounts.playState, 100, 'All 50 playStateChanged listeners must be invoked on pause');

    // Clean up
    for (const { hListener, pListener, sListener } of listeners) {
      store.removeEventListener('hourChanged', hListener);
      store.removeEventListener('playStateChanged', pListener);
      store.removeEventListener('speedChanged', sListener);
    }

    store.setTimeIndex(43);
    assertEqual(listenerCounts.hour, 50, 'No removed listener should be invoked');
  });

  test('alias method existence and functional equivalence check', () => {
    // Check all required convenience aliases exist as functions on AppStateStore prototype or instance
    assertEqual(typeof store.setTimeIndex, 'function', 'store.setTimeIndex alias must exist');
    assertEqual(typeof store.play, 'function', 'store.play alias must exist');
    assertEqual(typeof store.pause, 'function', 'store.pause alias must exist');
    assertEqual(typeof store.setPlaybackSpeed, 'function', 'store.setPlaybackSpeed alias must exist');
    assertEqual(typeof store.selectSiteA, 'function', 'store.selectSiteA alias must exist');
    assertEqual(typeof store.selectSiteB, 'function', 'store.selectSiteB alias must exist');

    // Equivalence: setTimeIndex vs setHour
    store.setTimeIndex(250);
    assertEqual(store.currentHour, 250);
    store.setHour(300);
    assertEqual(store.currentHour, 300);

    // Equivalence: setPlaybackSpeed vs setPlaySpeed
    store.setPlaybackSpeed(3);
    assertEqual(store.playSpeed, 3);
    store.setPlaySpeed(6);
    assertEqual(store.playSpeed, 6);

    // Equivalence: selectSiteA vs setScenarioSite('A')
    store.selectSiteA('shackleton_rim_primary');
    assertEqual(store.scenarioA.siteId, 'shackleton_rim_primary');
    store.setScenarioSite('A', 'malapert_massif_summit');
    assertEqual(store.scenarioA.siteId, 'malapert_massif_summit');

    // Equivalence: selectSiteB vs setScenarioSite('B')
    store.selectSiteB('mons_mouton_plateau');
    assertEqual(store.scenarioB.siteId, 'mons_mouton_plateau');
    store.setScenarioSite('B', 'connecting_ridge_south');
    assertEqual(store.scenarioB.siteId, 'connecting_ridge_south');
  });
});
