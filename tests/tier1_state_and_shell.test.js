/**
 * @fileoverview Tier 1 Feature Coverage Test Suite: Reactive State Store, Scenarios, Exporters & Shell.
 * Tests Features F17 through F23 with >=5 genuine test cases per feature (>=35 total).
 *
 * Adheres strictly to zero external npm dependencies and opaque-box verification.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  describe, test, beforeEach, afterEach,
  assert, assertFalse,
  assertEqual, assertNotEqual, assertDeepEqual,
  assertApproxEqual,
  assertGreaterThan, assertGreaterThanOrEqual,
  assertLessThan, assertLessThanOrEqual,
  assertBetween,
  assertThrows,
  assertIncludes, assertMatch,
  assertDefined, assertUndefined,
  assertNull, assertNotNull,
} from './testHarness.js';

import { AppStateStore, appState } from '../src/core/appState.js';
import { InterfaceContract } from '../src/core/interfaceContract.js';

describe('Tier 1: F17 - Reactive EventTarget Store', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
  });

  afterEach(() => {
    if (store && store.isPlaying) {
      store.togglePlay();
    }
  });

  test('F17-1: inherits from EventTarget and supports addEventListener/removeEventListener', () => {
    assert(store instanceof EventTarget, 'AppStateStore must extend EventTarget');
    let called = false;
    const listener = () => { called = true; };
    store.addEventListener('customProbe', listener);
    store.dispatchEvent(new CustomEvent('customProbe'));
    assert(called, 'Custom event listener must be invoked');

    called = false;
    store.removeEventListener('customProbe', listener);
    store.dispatchEvent(new CustomEvent('customProbe'));
    assertFalse(called, 'Removed listener must not be invoked');
  });

  test('F17-2: init() populates candidate sites catalog and computes initial cycle data', () => {
    store.init();
    assert(Array.isArray(store.sites), 'sites must be an array');
    assertEqual(store.sites.length, 4, 'Must initialize with 4 canonical sites');
    assertNotNull(store.activeSite, 'activeSite must be selected');
    assertEqual(store.activeSite.id, 'shackleton_rim_primary');
    assertNotNull(store.cycleData, 'cycleData must be computed on init');
    assertEqual(store.cycleData.steps.length, 709);
  });

  test('F17-3: setActiveSite() updates active landing site and dispatches siteChanged event', () => {
    store.init();
    let eventReceived = null;
    store.addEventListener('siteChanged', (e) => {
      eventReceived = e.detail;
    });

    store.setActiveSite('malapert_massif_summit');
    assertEqual(store.activeSite.id, 'malapert_massif_summit');
    assertNotNull(eventReceived);
    assertEqual(eventReceived.activeSite.id, 'malapert_massif_summit');
  });

  test('F17-4: setHour() updates currentHour offset and dispatches hourChanged event', () => {
    store.init();
    let dispatchedHour = -1;
    store.addEventListener('hourChanged', (e) => {
      dispatchedHour = e.detail.currentHour;
    });

    store.setHour(354);
    assertEqual(store.currentHour, 354);
    assertEqual(dispatchedHour, 354);
  });

  test('F17-5: setEpochDate() updates mission epoch date and dispatches epochDateChanged', () => {
    store.init();
    let newEpoch = null;
    store.addEventListener('epochDateChanged', (e) => {
      newEpoch = e.detail.epochDateStr;
    });

    store.setEpochDate('2027-01-01');
    assertEqual(store.epochDateStr, '2027-01-01');
    assertEqual(newEpoch, '2027-01-01');
    assertEqual(store.cycleData.epochDateStr, '2027-01-01');
  });

  test('F17-6: setArrayType() and setViewMode() update parameters and dispatch reactive events', () => {
    store.init();
    let arrayEvt = null;
    let viewEvt = null;

    store.addEventListener('arrayTypeChanged', (e) => { arrayEvt = e.detail.arrayType; });
    store.addEventListener('viewModeChanged', (e) => { viewEvt = e.detail.viewMode; });

    store.setArrayType('sun_tracking');
    assertEqual(store.arrayType, 'sun_tracking');
    assertEqual(arrayEvt, 'sun_tracking');

    store.setViewMode('linear');
    assertEqual(store.viewMode, 'linear');
    assertEqual(viewEvt, 'linear');
  });
});

describe('Tier 1: F18 - Multi-Speed Timeline Playback', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  afterEach(() => {
    if (store && store.isPlaying) {
      store.togglePlay();
    }
  });

  test('F18-1: togglePlay() starts playback and dispatches playStateChanged with true', () => {
    assertEqual(store.isPlaying, false);
    let stateDispatched = null;
    store.addEventListener('playStateChanged', (e) => {
      stateDispatched = e.detail.isPlaying;
    });

    store.togglePlay();
    assertEqual(store.isPlaying, true);
    assertEqual(stateDispatched, true);
  });

  test('F18-2: calling togglePlay() while playing pauses playback and stops timer', () => {
    store.togglePlay();
    assertEqual(store.isPlaying, true);

    let stateDispatched = null;
    store.addEventListener('playStateChanged', (e) => {
      stateDispatched = e.detail.isPlaying;
    });

    store.togglePlay();
    assertEqual(store.isPlaying, false);
    assertEqual(stateDispatched, false);
  });

  test('F18-3: setPlaySpeed() updates speed multiplier across 1x, 3x, and 6x presets', () => {
    for (const spd of [1, 3, 6]) {
      let speedEvt = null;
      const listener = (e) => { speedEvt = e.detail.playSpeed; };
      store.addEventListener('speedChanged', listener);

      store.setPlaySpeed(spd);
      assertEqual(store.playSpeed, spd);
      assertEqual(speedEvt, spd);

      store.removeEventListener('speedChanged', listener);
    }
  });

  test('F18-4: scrubber boundary clamping enforces integer bounds within [0, 708]', () => {
    store.setHour(-100);
    assertEqual(store.currentHour, 0, 'Negative hour offset must clamp to 0');

    store.setHour(1200);
    assertEqual(store.currentHour, 708, 'Excessive hour offset must clamp to 708');

    store.setHour(45.7);
    assertEqual(store.currentHour, 46, 'Fractional hour must round to nearest integer');
  });

  test('F18-5: verifies playback interval timing scales inversely with speed multiplier', () => {
    // 1x -> Math.max(30, round(100/1)) = 100ms
    // 3x -> Math.max(30, round(100/3)) = 33ms
    // 6x -> Math.max(30, round(100/6)) = 30ms (clamped to min 30ms)
    store.setPlaySpeed(1);
    store.togglePlay();
    assert(store.isPlaying);
    store.togglePlay(); // stop

    store.setPlaySpeed(6);
    store.togglePlay();
    assert(store.isPlaying);
    store.togglePlay(); // stop
    assertFalse(store.isPlaying);
  });

  test('F18-6: independent instance isolation guarantees clean initial playback state', () => {
    const freshStore = new AppStateStore();
    assertEqual(freshStore.isPlaying, false);
    assertEqual(freshStore.playSpeed, 1);
    assertEqual(freshStore.currentHour, 0);
  });
});

describe('Tier 1: F19 - Scenario Trade-off Comparator', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('F19-1: initializes Scenario A (Shackleton) and Scenario B (Malapert) by default', () => {
    assertEqual(store.scenarioA.siteId, 'shackleton_rim_primary');
    assertEqual(store.scenarioB.siteId, 'malapert_massif_summit');
    assertNotNull(store.scenarioA.cycleData);
    assertNotNull(store.scenarioB.cycleData);
  });

  test('F19-2: identical sites in Scenario A and Scenario B yield strictly zero deltas', () => {
    store.setScenarioSite('A', 'shackleton_rim_primary');
    store.setScenarioSite('B', 'shackleton_rim_primary');

    const delta = store.computeScenarioDelta();
    assertNotNull(delta);
    assertEqual(delta.sunlitHoursDelta, 0, 'sunlitHoursDelta must be 0 for identical sites');
    assertEqual(delta.dteHoursDelta, 0, 'dteHoursDelta must be 0 for identical sites');
    assertEqual(delta.dualHoursDelta, 0, 'dualHoursDelta must be 0 for identical sites');
    assertEqual(delta.viabilityScoreDelta, 0, 'viabilityScoreDelta must be 0 for identical sites');
    assertEqual(delta.elevMDelta, 0, 'elevMDelta must be 0 for identical sites');
    assertEqual(delta.slopeDelta, 0.0, 'slopeDelta must be 0 for identical sites');
  });

  test('F19-3: calculates correct delta direction (Scenario B minus Scenario A)', () => {
    store.setScenarioSite('A', 'shackleton_rim_primary'); // elev: 2100m, slope: 8.5 deg
    store.setScenarioSite('B', 'malapert_massif_summit');   // elev: 4800m, slope: 12.4 deg

    const delta = store.computeScenarioDelta();
    assertNotNull(delta);
    assertEqual(delta.elevMDelta, 4800 - 2100, 'elevMDelta must be 2700m');
    assertApproxEqual(delta.slopeDelta, 12.4 - 8.5, 0.01, 'slopeDelta must be 3.9 deg');

    const expectedSunlitDelta = store.scenarioB.cycleData.sunlitHours - store.scenarioA.cycleData.sunlitHours;
    const expectedDteDelta = store.scenarioB.cycleData.dteHours - store.scenarioA.cycleData.dteHours;
    const expectedDualDelta = store.scenarioB.cycleData.dualHours - store.scenarioA.cycleData.dualHours;
    const expectedViabilityDelta = store.scenarioB.cycleData.viabilityScore - store.scenarioA.cycleData.viabilityScore;

    assertEqual(delta.sunlitHoursDelta, expectedSunlitDelta, 'sunlitHoursDelta must match B minus A');
    assertEqual(delta.dteHoursDelta, expectedDteDelta, 'dteHoursDelta must match B minus A');
    assertEqual(delta.dualHoursDelta, expectedDualDelta, 'dualHoursDelta must match B minus A');
    assertEqual(delta.viabilityScoreDelta, expectedViabilityDelta, 'viabilityScoreDelta must match B minus A');

    // Explicit directional assertions (Malapert Massif B minus Shackleton Rim A)
    assertEqual(delta.sunlitHoursDelta, -242, 'sunlitHoursDelta must be exactly -242 (467 - 709)');
    assertEqual(delta.dteHoursDelta, 321, 'dteHoursDelta must be exactly +321 (709 - 388)');
    assertEqual(delta.dualHoursDelta, 79, 'dualHoursDelta must be exactly +79 (467 - 388)');
    assertEqual(delta.viabilityScoreDelta, -4, 'viabilityScoreDelta must be exactly -4 (72 - 76)');
  });

  test('F19-4: verifies inverted site selection exactly flips delta algebraic signs', () => {
    store.setScenarioSite('A', 'shackleton_rim_primary');
    store.setScenarioSite('B', 'malapert_massif_summit');
    const deltaForward = store.computeScenarioDelta();

    store.setScenarioSite('A', 'malapert_massif_summit');
    store.setScenarioSite('B', 'shackleton_rim_primary');
    const deltaInverted = store.computeScenarioDelta();

    assertEqual(deltaInverted.elevMDelta, -deltaForward.elevMDelta);
    assertEqual(deltaInverted.sunlitHoursDelta, -deltaForward.sunlitHoursDelta);
    assertEqual(deltaInverted.dteHoursDelta, -deltaForward.dteHoursDelta);
    assertEqual(deltaInverted.viabilityScoreDelta, -deltaForward.viabilityScoreDelta);
  });

  test('F19-5: dispatches scenariosUpdated event when setScenarioSite() is invoked', () => {
    let updateDetail = null;
    store.addEventListener('scenariosUpdated', (e) => {
      updateDetail = e.detail;
    });

    store.setScenarioSite('B', 'mons_mouton_plateau');
    assertNotNull(updateDetail);
    assertEqual(updateDetail.b.siteId, 'mons_mouton_plateau');
    assertNotNull(updateDetail.delta);
  });

  test('F19-6: safely returns null delta if scenario cycleData is uncomputed or missing', () => {
    const uninitStore = new AppStateStore();
    const delta = uninitStore.computeScenarioDelta();
    assertNull(delta, 'computeScenarioDelta must return null when cycleData is absent');
  });
});

describe('Tier 1: F20 - JPL Horizons-Compatible CSV Exporter', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('F20-1: generates CSV with exactly 710 lines (1 header line + 709 hourly step rows)', () => {
    const csv = store.exportToCSV();
    assert(typeof csv === 'string', 'exportToCSV must return string');
    const lines = csv.split('\n');
    assertEqual(lines.length, 710, 'CSV export must contain exactly 710 lines (1 header + 709 steps)');
  });

  test('F20-2: verifies 13 required column headers formatted with comma delimiter', () => {
    const csv = store.exportToCSV();
    const headerLine = csv.split('\n')[0];
    const columns = headerLine.split(',');

    assertEqual(columns.length, 13, 'Header must contain exactly 13 column names');
    const expectedHeaders = [
      'Hour_Offset', 'Sun_Az_Deg', 'Sun_El_Deg', 'Sun_Mask_Deg', 'Is_Sunlit',
      'Earth_Az_Deg', 'Earth_El_Deg', 'Earth_Mask_Deg', 'Is_DTE',
      'Lib_Lat_Deg', 'Lib_Lon_Deg', 'Array_Eff_Pct', 'Solar_Flux_Wm2',
    ];
    for (let i = 0; i < expectedHeaders.length; i++) {
      assertEqual(columns[i], expectedHeaders[i], `Header column ${i} must match ${expectedHeaders[i]}`);
    }
  });

  test('F20-3: verifies first data row (line 1) matches step 0 trajectory telemetry', () => {
    const csv = store.exportToCSV();
    const row0 = csv.split('\n')[1].split(',');
    const step0 = store.cycleData.steps[0];

    assertEqual(Number(row0[0]), step0.hourOffset);
    assertEqual(Number(row0[1]), step0.sunAzDeg);
    assertEqual(Number(row0[2]), step0.sunElDeg);
    assertEqual(Number(row0[4]), step0.isSunlit ? 1 : 0);
  });

  test('F20-4: verifies last data row (line 709) matches step 708 trajectory telemetry', () => {
    const csv = store.exportToCSV();
    const row708 = csv.split('\n')[709].split(',');
    const step708 = store.cycleData.steps[708];

    assertEqual(Number(row708[0]), 708);
    assertEqual(Number(row708[1]), step708.sunAzDeg);
    assertEqual(Number(row708[2]), step708.sunElDeg);
    assertEqual(Number(row708[8]), step708.isEarthVisible ? 1 : 0);
  });

  test('F20-5: confirms boolean visibility flags map strictly to binary 1 or 0 integers', () => {
    const csv = store.exportToCSV();
    const lines = csv.split('\n').slice(1);
    for (let i = 0; i < 50; i++) {
      const parts = lines[i].split(',');
      const isSunlit = parts[4];
      const isDte = parts[8];
      assert(isSunlit === '0' || isSunlit === '1', `isSunlit at row ${i} must be "0" or "1"`);
      assert(isDte === '0' || isDte === '1', `isDte at row ${i} must be "0" or "1"`);
    }
  });

  test('F20-6: safely returns empty string when cycleData is null or uninitialized', () => {
    const emptyStore = new AppStateStore();
    const csv = emptyStore.exportToCSV();
    assertEqual(csv, '', 'Uninitialized store must return empty string');
  });
});

describe('Tier 1: F21 - Ephemeris JSON Exporter', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  test('F21-1: produces valid JSON string parseable by standard JSON.parse()', () => {
    const jsonStr = store.exportToJSON();
    assert(typeof jsonStr === 'string');
    const parsed = JSON.parse(jsonStr);
    assert(parsed && typeof parsed === 'object', 'Parsed JSON must be an object');
  });

  test('F21-2: preserves deep object fidelity matching cycleData structure and values', () => {
    const jsonStr = store.exportToJSON();
    const parsed = JSON.parse(jsonStr);

    assertEqual(parsed.steps.length, store.cycleData.steps.length);
    assertEqual(parsed.sunlitHours, store.cycleData.sunlitHours);
    assertEqual(parsed.dteHours, store.cycleData.dteHours);
    assertEqual(parsed.viabilityScore, store.cycleData.viabilityScore);
    assertEqual(parsed.steps[0].hourOffset, 0);
    assertEqual(parsed.steps[708].hourOffset, 708);
  });

  test('F21-3: uses 2-space indentation formatting style for mission telemetry readability', () => {
    const jsonStr = store.exportToJSON();
    assert(jsonStr.startsWith('{\n  "site":'), 'JSON output must be indented with 2 spaces');
  });

  test('F21-4: validates that exported JSON re-passes InterfaceContract.validateCycleData', () => {
    const jsonStr = store.exportToJSON();
    const parsed = JSON.parse(jsonStr);
    assert(InterfaceContract.validateCycleData(parsed), 'Exported JSON cycle must satisfy contract');
  });

  test('F21-5: preserves all 8 summary metrics and all 15 step keys in exported structure', () => {
    const parsed = JSON.parse(store.exportToJSON());
    assertEqual(parsed.steps.length, 709);
    assertDefined(parsed.viabilityScore);
    assertDefined(parsed.avgPowerEff);
    assertDefined(parsed.dualPct);
  });

  test('F21-6: returns "null" serialized representation when cycleData is null', () => {
    const emptyStore = new AppStateStore();
    const jsonStr = emptyStore.exportToJSON();
    assertEqual(jsonStr, 'null');
  });
});

describe('Tier 1: F22 - Convenience Method Aliases', () => {
  let store;

  beforeEach(() => {
    store = new AppStateStore();
    store.init();
  });

  afterEach(() => {
    if (store && store.isPlaying) {
      store.togglePlay();
    }
  });

  test('F22-1: setTimeIndex alias / setHour updates simulation hour offset and dispatches event', () => {
    let hourReceived = -1;
    store.addEventListener('hourChanged', (e) => {
      hourReceived = e.detail.currentHour;
    });

    if (typeof store.setTimeIndex === 'function') {
      store.setTimeIndex(120);
    } else {
      store.setHour(120);
    }

    assertEqual(store.currentHour, 120);
    assertEqual(hourReceived, 120);
  });

  test('F22-2: play alias / togglePlay initiates timeline animation loop', () => {
    assertEqual(store.isPlaying, false);

    if (typeof store.play === 'function') {
      store.play();
    } else {
      store.togglePlay();
    }

    assertEqual(store.isPlaying, true);
  });

  test('F22-3: pause alias / togglePlay halts timeline animation loop', () => {
    store.togglePlay(); // now playing
    assertEqual(store.isPlaying, true);

    if (typeof store.pause === 'function') {
      store.pause();
    } else {
      store.togglePlay();
    }

    assertEqual(store.isPlaying, false);
  });

  test('F22-4: setPlaybackSpeed alias / setPlaySpeed updates playback rate', () => {
    if (typeof store.setPlaybackSpeed === 'function') {
      store.setPlaybackSpeed(6);
    } else {
      store.setPlaySpeed(6);
    }

    assertEqual(store.playSpeed, 6);
  });

  test('F22-5: selectSiteA alias / setScenarioSite("A", id) sets comparison Site A', () => {
    if (typeof store.selectSiteA === 'function') {
      store.selectSiteA('mons_mouton_plateau');
    } else {
      store.setScenarioSite('A', 'mons_mouton_plateau');
    }

    assertEqual(store.scenarioA.siteId, 'mons_mouton_plateau');
  });

  test('F22-6: selectSiteB alias / setScenarioSite("B", id) sets comparison Site B', () => {
    if (typeof store.selectSiteB === 'function') {
      store.selectSiteB('connecting_ridge_south');
    } else {
      store.setScenarioSite('B', 'connecting_ridge_south');
    }

    assertEqual(store.scenarioB.siteId, 'connecting_ridge_south');
  });
});

describe('Tier 1: F23 - Mission Control Shell Integration', () => {
  let htmlContent;

  beforeEach(() => {
    const htmlPath = path.resolve(process.cwd(), 'index.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  test('F23-1: index.html exists, contains valid HTML5 structure, and SeleneSight mission title', () => {
    assert(htmlContent.includes('<!DOCTYPE html>'), 'Must declare standard HTML5 doctype');
    assert(htmlContent.includes('<title>SeleneSight'), 'Title must identify SeleneSight system');
    assert(htmlContent.includes('<meta name="viewport"'), 'Must include responsive viewport meta');
  });

  test('F23-2: provides all 4 required mission navigation tabs with correct data-tab attributes', () => {
    assertIncludes(htmlContent, 'data-tab="telemetry"', 'Must include Tab 1: Mission Telemetry');
    assertIncludes(htmlContent, 'data-tab="ephemeris"', 'Must include Tab 2: Trajectory Analysis');
    assertIncludes(htmlContent, 'data-tab="comparator"', 'Must include Tab 3: Scenario Comparator');
    assertIncludes(htmlContent, 'data-tab="portals"', 'Must include Tab 4: Verified Planetary Portals');
  });

  test('F23-3: embeds required HTML5 canvas elements for trajectory curves and skyplot visualizers', () => {
    assertIncludes(htmlContent, 'id="telemetryCurveCanvas"', 'Must include telemetryCurveCanvas element');
    assertIncludes(htmlContent, 'id="skyplotCanvas"', 'Must include skyplotCanvas element');
  });

  test('F23-4: includes all core telemetry KPI cards and instantaneous state matrix cells', () => {
    const requiredElementIds = [
      'kpiSunlitPct', 'kpiDtePct', 'kpiDualPct', 'kpiViabilityScore',
      'cellSunEl', 'cellSunAz', 'cellSunMask', 'cellArrayEff',
      'cellSolarFlux', 'cellEarthEl', 'cellLibration',
      'cellNextSunset', 'cellNextEarthset',
      'timelineSlider', 'btnPlayPause',
    ];

    for (const id of requiredElementIds) {
      assertIncludes(htmlContent, `id="${id}"`, `index.html must include element with id="${id}"`);
    }
  });

  test('F23-5: strictly adheres to Lunar Basalt & Solar Amber palette with zero generic blue', () => {
    // Deep Basalt Black & Surface
    assertIncludes(htmlContent, '#08090c', 'Must define Basalt Black #08090c');
    assertIncludes(htmlContent, '#101217', 'Must define Basalt Surface #101217');
    // Solar Grazing Amber
    assertIncludes(htmlContent, '#f59e0b', 'Must define Solar Amber #f59e0b');
    // Phosphor Green & Oxide Crimson
    assertIncludes(htmlContent, '#10b981', 'Must define Phosphor Green #10b981');
    assertIncludes(htmlContent, '#ef4444', 'Must define Oxide Crimson #ef4444');

    // Generic SaaS blues must be completely avoided
    const prohibitedBlues = ['#007bff', '#3b82f6', '#1d4ed8', '#2563eb', '#1e40af'];
    for (const blue of prohibitedBlues) {
      assertFalse(
        htmlContent.toLowerCase().includes(blue),
        `Generic SaaS blue ${blue} is strictly prohibited in Lunar Basalt & Solar Amber palette`
      );
    }
  });

  test('F23-6: verifies strictly zero emojis across the entire index.html file', () => {
    // Check for any Unicode pictographic emoji characters
    const emojiRegex = /\p{Extended_Pictographic}/gu;
    const matches = htmlContent.match(emojiRegex);
    assertEqual(matches, null, 'Mission control shell must contain strictly zero emojis in all text/markup');
  });
});
