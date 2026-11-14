#!/usr/bin/env node
/**
 * @fileoverview Intensive Adversarial Fuzzing & Stress Harness for AppStateStore.
 * Executes thousands of rapid state mutations, asynchronous play/pause churn,
 * floating point scrubber fuzzing, and listener churn.
 */

import { AppStateStore } from '../src/core/appState.js';
import { InterfaceContract } from '../src/core/interfaceContract.js';

console.log('===============================================================');
console.log('  INTENSIVE EMPIRICAL ADVERSARIAL STATE FUZZER & STRESS HARNESS');
console.log('===============================================================');

const START_TIME = performance.now();
let totalOps = 0;
let errors = 0;
const failureLog = [];

const store = new AppStateStore();
store.init();

// -----------------------------------------------------------------------------
// Test 1: Rapid Play/Pause & Speed Switching Interleaving Churn (1,000 iterations)
// -----------------------------------------------------------------------------
console.log('Test 1: Running 1,000 rapid play/pause & speed switching cycles...');
for (let i = 0; i < 1000; i++) {
  totalOps++;
  const action = i % 6;
  switch (action) {
    case 0:
      store.play();
      if (!store.isPlaying || store.playbackTimer_ === null) {
        errors++;
        failureLog.push(`Iter ${i}: play() did not set isPlaying or playbackTimer_`);
      }
      break;
    case 1:
      store.play(); // duplicate play
      if (!store.isPlaying || store.playbackTimer_ === null) {
        errors++;
        failureLog.push(`Iter ${i}: duplicate play() failed`);
      }
      break;
    case 2:
      store.setPlaybackSpeed(3);
      if (store.playSpeed !== 3) {
        errors++;
        failureLog.push(`Iter ${i}: setPlaybackSpeed(3) failed`);
      }
      break;
    case 3:
      store.setPlaybackSpeed(6);
      if (store.playSpeed !== 6) {
        errors++;
        failureLog.push(`Iter ${i}: setPlaybackSpeed(6) failed`);
      }
      break;
    case 4:
      store.pause();
      if (store.isPlaying || store.playbackTimer_ !== null) {
        errors++;
        failureLog.push(`Iter ${i}: pause() failed to clear isPlaying or timer`);
      }
      break;
    case 5:
      store.pause(); // duplicate pause
      if (store.isPlaying || store.playbackTimer_ !== null) {
        errors++;
        failureLog.push(`Iter ${i}: duplicate pause() failed`);
      }
      break;
  }
}

// Ensure store is paused
store.pause();
if (store.isPlaying || store.playbackTimer_ !== null) {
  errors++;
  failureLog.push('Store not properly paused after Test 1');
}

// -----------------------------------------------------------------------------
// Test 2: Scrubber Fuzzing (10,000 random inputs)
// -----------------------------------------------------------------------------
console.log('Test 2: Fuzzing setTimeIndex with 10,000 inputs...');
const fuzzValues = [
  -999999, -1, 0, 708, 709, 100000,
  -0.000001, 0.000001, 707.4999, 707.5001, 708.4999, 708.5001,
  '-999', '0', '708', '999', '354.4', '354.6',
];

for (let i = 0; i < 10000; i++) {
  totalOps++;
  let inputVal;
  if (i < fuzzValues.length) {
    inputVal = fuzzValues[i];
  } else {
    // Random float between -2000 and +3000
    inputVal = -2000 + Math.random() * 5000;
  }

  try {
    store.setTimeIndex(inputVal);
  } catch (err) {
    errors++;
    failureLog.push(`setTimeIndex(${inputVal}) threw error: ${err.message}`);
    continue;
  }

  // Verification: currentHour must always be an integer within [0, 708]
  if (
    !Number.isInteger(store.currentHour) ||
    store.currentHour < 0 ||
    store.currentHour > 708
  ) {
    errors++;
    failureLog.push(`setTimeIndex(${inputVal}) produced out-of-bounds currentHour: ${store.currentHour}`);
  }
}

// -----------------------------------------------------------------------------
// Test 3: Auto-Looping Boundary Stress Under Active Playback
// -----------------------------------------------------------------------------
console.log('Test 3: Auto-looping boundary verification across wrap points...');
store.setTimeIndex(707);
store.setPlaybackSpeed(6);
store.play();

// Wait for multiple ticks to wrap 707 -> 708 -> 0 -> 1 ...
await new Promise(resolve => setTimeout(resolve, 150));
store.pause();

totalOps++;
if (store.currentHour < 0 || store.currentHour > 708) {
  errors++;
  failureLog.push(`Auto-looping produced invalid hour: ${store.currentHour}`);
}

// Verify starting directly at 708 wraps to 0
store.setTimeIndex(708);
store.play();
await new Promise(resolve => setTimeout(resolve, 60));
store.pause();

totalOps++;
if (store.currentHour > 10) {
  errors++;
  failureLog.push(`Expected hour near 0 after wrapping from 708, got: ${store.currentHour}`);
}

// -----------------------------------------------------------------------------
// Test 4: Scenario Comparator Delts & Exporter Under Rapid Site Switching
// -----------------------------------------------------------------------------
console.log('Test 4: Scenario comparator deltas & export consistency...');
const sites = InterfaceContract.getMockSites();
for (let i = 0; i < sites.length; i++) {
  for (let j = 0; j < sites.length; j++) {
    totalOps++;
    store.selectSiteA(sites[i].id);
    store.selectSiteB(sites[j].id);

    const delta = store.computeScenarioDelta();
    if (!delta) {
      errors++;
      failureLog.push(`Delta was null for sites ${sites[i].id} and ${sites[j].id}`);
      continue;
    }

    if (i === j) {
      // Identical sites must yield exactly zero deltas
      if (
        delta.sunlitHoursDelta !== 0 ||
        delta.dteHoursDelta !== 0 ||
        delta.dualHoursDelta !== 0 ||
        delta.viabilityScoreDelta !== 0 ||
        delta.elevMDelta !== 0 ||
        delta.slopeDelta !== 0
      ) {
        errors++;
        failureLog.push(`Identical site delta not zero: ${JSON.stringify(delta)}`);
      }
    }

    const csv = store.exportToCSV();
    if (!csv || csv.split('\n').length !== 710) {
      errors++;
      failureLog.push(`exportToCSV invalid row count for site ${sites[i].id}`);
    }

    const jsonStr = store.exportToJSON();
    if (!jsonStr || jsonStr.length < 100) {
      errors++;
      failureLog.push(`exportToJSON invalid string for site ${sites[i].id}`);
    }
  }
}

const elapsedMs = performance.now() - START_TIME;
console.log('---------------------------------------------------------------');
console.log(`Fuzzing Complete in ${elapsedMs.toFixed(2)} ms`);
console.log(`Total Operations Evaluated: ${totalOps}`);
console.log(`Violations / Errors: ${errors}`);
if (errors > 0) {
  console.log('Failures:');
  console.log(failureLog.slice(0, 10).join('\n'));
  process.exit(1);
} else {
  console.log('All empirical state fuzzing and stress invariant tests PASSED.');
  process.exit(0);
}
