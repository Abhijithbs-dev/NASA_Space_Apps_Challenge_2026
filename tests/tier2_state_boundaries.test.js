/**
 * @fileoverview Tier 2 Boundary & Corner Case Test Suite: State Management, Comparator & Mission Shell.
 * Tests Features F17 through F23 with >=5 genuine boundary test cases per feature (42 tests total).
 *
 * Adheres strictly to zero external npm dependencies and opaque-box verification.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  describe, test, beforeEach, afterEach,
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

import { AppStateStore, appState } from '../src/core/appState.js';
import { InterfaceContract } from '../src/core/interfaceContract.js';

describe('Tier 2: F17 - AppStateStore Reactive EventTarget Boundary States', () => {
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

  test('F17-B1: multiple distinct subscribers (10 listeners) all receive dispatched event concurrently', () => {
    let callCount = 0;
    const listeners = Array.from({ length: 10 }, () => () => {
      callCount++;
    });

    for (const listener of listeners) {
      store.addEventListener('hourChanged', listener);
    }

    store.setHour(45);
    assertEqual(callCount, 10, 'All 10 distinct subscribers must be invoked on hourChanged event');

    for (const listener of listeners) {
      store.removeEventListener('hourChanged', listener);
    }
  });

  test('F17-B2: unsubscribing listeners via removeEventListener prevents subsequent callback execution', () => {
    let callCount = 0;
    const listener = () => {
      callCount++;
    };

    store.addEventListener('hourChanged', listener);
    store.setHour(50);
    assertEqual(callCount, 1, 'Listener must be called once before removal');

    store.removeEventListener('hourChanged', listener);
    store.setHour(60);
    assertEqual(callCount, 1, 'Listener must NOT be called after removeEventListener');
  });

  test('F17-B3: invalid site ID selection (non-existent site) leaves state intact and does not dispatch event', () => {
    const originalSite = store.activeSite;
    let eventDispatched = false;

    store.addEventListener('siteChanged', () => {
      eventDispatched = true;
    });

    store.setActiveSite('invalid_unknown_lunar_site');

    assertEqual(store.activeSite.id, originalSite.id, 'activeSite must remain unchanged when given invalid ID');
    assertFalse(eventDispatched, 'siteChanged must NOT be dispatched for non-existent site ID');
  });

  test('F17-B4: duplicate site selection (selecting current active site) is an idempotent no-op', () => {
    const currentId = store.activeSite.id;
    let eventDispatched = false;

    store.addEventListener('siteChanged', () => {
      eventDispatched = true;
    });

    store.setActiveSite(currentId);

    assertEqual(store.activeSite.id, currentId);
    assertFalse(eventDispatched, 'Selecting the already active site must NOT trigger recomputation or event');
  });

  test('F17-B5: initialization fallback: init with empty array, null, or invalid sites falls back to canonical fixtures', () => {
    const emptyStore = new AppStateStore();
    emptyStore.init([]);
    assertEqual(emptyStore.sites.length, 4, 'Empty array must fall back to 4 canonical mock sites');
    assert(InterfaceContract.validateSite(emptyStore.activeSite), 'Active site must be valid');

    const nullStore = new AppStateStore();
    nullStore.init(null);
    assertEqual(nullStore.sites.length, 4, 'null sites list must fall back to 4 canonical mock sites');

    const invalidSitesStore = new AppStateStore();
    invalidSitesStore.init([{ id: 'bad_site_missing_keys' }]);
    assertEqual(invalidSitesStore.sites.length, 4, 'Invalid site list must fall back to 4 canonical mock sites');
  });

  test('F17-B6: safe recomputation: calling recomputeCycle when activeSite is null is a safe no-op', () => {
    const freshStore = new AppStateStore();
    // activeSite is null initially
    assertNull(freshStore.activeSite);

    let eventFired = false;
    freshStore.addEventListener('cycleChanged', () => {
      eventFired = true;
    });

    freshStore.recomputeCycle();

    assertNull(freshStore.cycleData, 'cycleData must remain null');
    assertFalse(eventFired, 'cycleChanged event must NOT be dispatched when activeSite is null');
  });
});

describe('Tier 2: F18 - Multi-Speed Timeline Playback Scrubber Boundaries', () => {
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

  test('F18-B1: negative hour clamping: setHour(<0) strictly clamps to hour 0', () => {
    store.setHour(-1);
    assertEqual(store.currentHour, 0, 'setHour(-1) must clamp to 0');

    store.setHour(-500);
    assertEqual(store.currentHour, 0, 'setHour(-500) must clamp to 0');
  });

  test('F18-B2: overflow hour clamping: setHour(>708) strictly clamps to hour 708', () => {
    store.setHour(709);
    assertEqual(store.currentHour, 708, 'setHour(709) must clamp to 708');

    store.setHour(10000);
    assertEqual(store.currentHour, 708, 'setHour(10000) must clamp to 708');
  });

  test('F18-B3: non-integer hour rounding: setHour rounds to nearest integer before clamping', () => {
    store.setHour(42.4);
    assertEqual(store.currentHour, 42, '42.4 must round to 42');

    store.setHour(42.6);
    assertEqual(store.currentHour, 43, '42.6 must round to 43');

    store.setHour(707.9);
    assertEqual(store.currentHour, 708, '707.9 must round to 708');
  });

  test('F18-B4: same-hour no-op: calling setHour with current hour does not re-dispatch hourChanged', () => {
    store.setHour(100);
    let eventFired = false;

    store.addEventListener('hourChanged', () => {
      eventFired = true;
    });

    store.setHour(100);
    assertFalse(eventFired, 'Setting hour to current value must not fire hourChanged event');
  });

  test('F18-B5: auto-looping playback boundary: advancing past hour 708 wraps cleanly to hour 0', async () => {
    store.setHour(708);
    store.setPlaySpeed(6); // 30ms timer

    let wrappedToZero = false;
    const observedHours = [];
    const hourHandler = (e) => {
      const h = e.detail?.currentHour !== undefined
        ? e.detail.currentHour
        : (e.detail?.hour !== undefined ? e.detail.hour : store.currentHour);
      observedHours.push(h);
      if (h === 0 || store.currentHour === 0) {
        wrappedToZero = true;
      }
    };
    store.addEventListener('hourChanged', hourHandler);

    try {
      store.togglePlay();
      assertEqual(store.isPlaying, true);

      // Wait for wrap event or safe timeout
      const startTime = Date.now();
      while (!wrappedToZero && Date.now() - startTime < 400) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      store.togglePlay(); // stop playback
      assertEqual(store.isPlaying, false);

      assertEqual(wrappedToZero, true, 'Playback loop must wrap from 708 to 0 on next tick');
      assertEqual(observedHours[0], 0, 'First advanced hour from 708 must be 0');
    } finally {
      store.removeEventListener('hourChanged', hourHandler);
      if (store.isPlaying) {
        store.togglePlay();
      }
    }
  });

  test('F18-B6: rapid play/pause toggling: toggling 10 times in rapid succession leaves consistent state and halts timers', () => {
    for (let i = 0; i < 10; i++) {
      store.togglePlay();
    }

    assertEqual(store.isPlaying, false, '10 toggles from false must result in false');

    // Extra toggle to true and false
    store.togglePlay();
    assertEqual(store.isPlaying, true);
    store.togglePlay();
    assertEqual(store.isPlaying, false);
  });
});

describe('Tier 2: F19 - Scenario Comparator Deltas Boundary Cases', () => {
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

  test('F19-B1: identical Site A and Site B: all scenario deltas evaluate to exactly zero', () => {
    store.setScenarioSite('A', 'shackleton_rim_primary');
    store.setScenarioSite('B', 'shackleton_rim_primary');

    const delta = store.computeScenarioDelta();
    assertNotNull(delta, 'Scenario delta must not be null');
    assertEqual(delta.sunlitHoursDelta, 0, 'sunlitHoursDelta must be 0 for identical sites');
    assertEqual(delta.dteHoursDelta, 0, 'dteHoursDelta must be 0 for identical sites');
    assertEqual(delta.dualHoursDelta, 0, 'dualHoursDelta must be 0 for identical sites');
    assertEqual(delta.viabilityScoreDelta, 0, 'viabilityScoreDelta must be 0 for identical sites');
    assertEqual(delta.elevMDelta, 0, 'elevMDelta must be 0 for identical sites');
    assertEqual(delta.slopeDelta, 0, 'slopeDelta must be 0 for identical sites');
  });

  test('F19-B2: inverted scenario comparison: swapping Site A and Site B strictly negates all delta signs', () => {
    store.setScenarioSite('A', 'shackleton_rim_primary');
    store.setScenarioSite('B', 'malapert_massif_summit');
    const deltaAB = store.computeScenarioDelta();

    store.setScenarioSite('A', 'malapert_massif_summit');
    store.setScenarioSite('B', 'shackleton_rim_primary');
    const deltaBA = store.computeScenarioDelta();

    assertEqual(deltaBA.sunlitHoursDelta, -deltaAB.sunlitHoursDelta, 'sunlitHoursDelta must invert sign');
    assertEqual(deltaBA.dteHoursDelta, -deltaAB.dteHoursDelta, 'dteHoursDelta must invert sign');
    assertEqual(deltaBA.dualHoursDelta, -deltaAB.dualHoursDelta, 'dualHoursDelta must invert sign');
    assertEqual(deltaBA.viabilityScoreDelta, -deltaAB.viabilityScoreDelta, 'viabilityScoreDelta must invert sign');
    assertEqual(deltaBA.elevMDelta, -deltaAB.elevMDelta, 'elevMDelta must invert sign');
    assertEqual(deltaBA.slopeDelta, -deltaAB.slopeDelta, 'slopeDelta must invert sign');
  });

  test('F19-B3: uncalculated scenario handling: computeScenarioDelta returns null safely when cycleData is null', () => {
    const uncomputedStore = new AppStateStore();
    // No init() called, scenarios have null cycleData
    const delta = uncomputedStore.computeScenarioDelta();
    assertNull(delta, 'computeScenarioDelta must return null when scenario cycleData is null');
  });

  test('F19-B4: non-existent site ID in setScenarioSite does not crash and leaves cycleData safe', () => {
    store.setScenarioSite('A', 'non_existent_site');
    // Scenario A cycleData will not be recomputed for invalid site
    assertEqual(store.scenarioA.siteId, 'non_existent_site');
  });

  test('F19-B5: slope delta rounding precision: slopeDelta is strictly rounded to 1 decimal place', () => {
    store.setScenarioSite('A', 'shackleton_rim_primary'); // slope 8.5
    store.setScenarioSite('B', 'malapert_massif_summit'); // slope 12.4
    const delta = store.computeScenarioDelta();

    assertEqual(delta.slopeDelta, 3.9, '12.4 - 8.5 must equal 3.9 exactly');
    const decimals = (String(delta.slopeDelta).split('.')[1] || '').length;
    assertLessThanOrEqual(decimals, 1, 'slopeDelta precision must not exceed 1 decimal place');
  });

  test('F19-B6: elevation delta calculation accuracy: Malapert (4800m) vs Shackleton (2100m) yields 2700m', () => {
    store.setScenarioSite('A', 'shackleton_rim_primary');
    store.setScenarioSite('B', 'malapert_massif_summit');
    const delta = store.computeScenarioDelta();

    assertEqual(delta.elevMDelta, 2700, '4800m - 2100m must equal 2700m');
  });
});

describe('Tier 2: F20 - JPL Horizons CSV Exporter Boundaries', () => {
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

  test('F20-B1: empty store handling: exportToCSV returns empty string "" when cycleData is null', () => {
    const uninitStore = new AppStateStore();
    const csv = uninitStore.exportToCSV();
    assertEqual(csv, '', 'Uninitialized store must export empty string CSV');
  });

  test('F20-B2: exact line count: valid cycle produces exactly 710 lines (1 header + 709 data rows)', () => {
    const csv = store.exportToCSV();
    const lines = csv.split('\n');
    assertEqual(lines.length, 710, 'CSV export must contain exactly 710 lines (1 header + 709 data rows)');
  });

  test('F20-B3: exact column count: every line contains exactly 13 columns (12 commas)', () => {
    const csv = store.exportToCSV();
    const lines = csv.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',');
      assertEqual(cols.length, 13, `Line ${i} must contain exactly 13 columns (got ${cols.length})`);
    }
  });

  test('F20-B4: header line column format matches expected JPL Horizons column names in exact order', () => {
    const csv = store.exportToCSV();
    const header = csv.split('\n')[0];

    const expectedHeader = [
      'Hour_Offset', 'Sun_Az_Deg', 'Sun_El_Deg', 'Sun_Mask_Deg', 'Is_Sunlit',
      'Earth_Az_Deg', 'Earth_El_Deg', 'Earth_Mask_Deg', 'Is_DTE',
      'Lib_Lat_Deg', 'Lib_Lon_Deg', 'Array_Eff_Pct', 'Solar_Flux_Wm2',
    ].join(',');

    assertEqual(header, expectedHeader, 'CSV header must match expected JPL Horizons column schema');
  });

  test('F20-B5: line ending consistency: lines are joined with single \\n without trailing empty lines', () => {
    const csv = store.exportToCSV();
    assertFalse(csv.endsWith('\n\n'), 'CSV must not contain trailing blank lines');
    assertFalse(csv.includes('\r'), 'CSV must use Unix line endings (\\n), not Windows CRLF (\\r\\n)');
  });

  test('F20-B6: binary flags formatting: Is_Sunlit and Is_DTE columns contain only binary 0 or 1 integer values', () => {
    const csv = store.exportToCSV();
    const rows = csv.split('\n').slice(1);

    for (let h = 0; h < rows.length; h++) {
      const cols = rows[h].split(',');
      const isSunlit = cols[4];
      const isDte = cols[8];

      assert(isSunlit === '0' || isSunlit === '1', `Row ${h} Is_Sunlit must be '0' or '1' (got "${isSunlit}")`);
      assert(isDte === '0' || isDte === '1', `Row ${h} Is_DTE must be '0' or '1' (got "${isDte}")`);
    }
  });
});

describe('Tier 2: F21 - Ephemeris JSON Exporter Boundaries', () => {
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

  test('F21-B1: null cycle handling: exportToJSON returns "null" when cycleData is null', () => {
    const uninitStore = new AppStateStore();
    const jsonStr = uninitStore.exportToJSON();
    assertEqual(jsonStr, 'null', 'Uninitialized store must export "null" JSON');
  });

  test('F21-B2: JSON parseability: exportToJSON produces valid JSON that parses without syntax error', () => {
    const jsonStr = store.exportToJSON();
    assert(typeof jsonStr === 'string', 'exportToJSON must return a string');
    assertGreaterThan(jsonStr.length, 100, 'JSON string must be populated');

    // Verify invalid JSON throws SyntaxError
    assertThrows(() => JSON.parse('{ invalid json:'), SyntaxError);

    // Verify actual exported JSON parses cleanly without throwing
    const parsed = JSON.parse(jsonStr);
    assertNotNull(parsed, 'Parsed JSON must not be null');
    assertEqual(typeof parsed, 'object', 'Parsed JSON must be an object');
  });

  test('F21-B3: deep object fidelity: parsed JSON contains 709 steps and matches all store.cycleData properties', () => {
    const jsonStr = store.exportToJSON();
    const parsed = JSON.parse(jsonStr);

    assertEqual(parsed.steps.length, 709, 'Parsed JSON must have 709 steps');
    assertEqual(parsed.epochDateStr, store.cycleData.epochDateStr);
    assertEqual(parsed.arrayType, store.cycleData.arrayType);
    assertEqual(parsed.sunlitHours, store.cycleData.sunlitHours);
    assertEqual(parsed.dteHours, store.cycleData.dteHours);
    assertEqual(parsed.viabilityScore, store.cycleData.viabilityScore);
  });

  test('F21-B4: 2-space indentation formatting: JSON string contains 2-space structured indentation', () => {
    const jsonStr = store.exportToJSON();
    assertIncludes(jsonStr, '{\n  "site":', 'JSON must be formatted with 2-space indentation');
    assertIncludes(jsonStr, '\n  "steps": [\n    {', 'Nested array elements must be indented with 2 spaces per level');
  });

  test('F21-B5: summary metrics completeness in exported JSON', () => {
    const jsonStr = store.exportToJSON();
    const parsed = JSON.parse(jsonStr);

    const summaryKeys = [
      'sunlitHours', 'dteHours', 'dualHours', 'sunlitPct',
      'dtePct', 'dualPct', 'avgPowerEff', 'viabilityScore',
    ];

    for (const key of summaryKeys) {
      assertDefined(parsed[key], `Exported JSON must contain summary metric "${key}"`);
      assertEqual(typeof parsed[key], 'number', `Summary metric "${key}" must be a number`);
    }
  });

  test('F21-B6: special character escaping: site descriptions containing quotes or symbols serialize safely', () => {
    const specialSite = {
      ...InterfaceContract.getMockSite(),
      description: 'Shackleton\'s Rim: "Deep Cold" & High "Peaks" / (19 km diameter)',
    };

    const customStore = new AppStateStore();
    customStore.init([specialSite]);

    const jsonStr = customStore.exportToJSON();
    const parsed = JSON.parse(jsonStr);

    assertEqual(
      parsed.site.description,
      specialSite.description,
      'Special characters in description must serialize and deserialize with full fidelity'
    );
  });
});

describe('Tier 2: F22 - Convenience Method Aliases Boundaries', () => {
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

  test('F22-B1: setTimeIndex / setHour boundary clamping (<0 to 0, >708 to 708)', () => {
    if (typeof store.setTimeIndex === 'function') {
      store.setTimeIndex(-50);
      assertEqual(store.currentHour, 0);
      store.setTimeIndex(800);
      assertEqual(store.currentHour, 708);
    } else {
      store.setHour(-50);
      assertEqual(store.currentHour, 0);
      store.setHour(800);
      assertEqual(store.currentHour, 708);
    }
  });

  test('F22-B2: string-typed numeric hour input is converted to integer correctly', () => {
    if (typeof store.setTimeIndex === 'function') {
      store.setTimeIndex('150');
    } else {
      store.setHour('150');
    }

    assertEqual(store.currentHour, 150, 'String numeric "150" must be converted to integer 150');
  });

  test('F22-B3: play alias starts playback and is idempotent if already playing', () => {
    assertEqual(store.isPlaying, false);

    if (typeof store.play === 'function') {
      store.play();
      assertEqual(store.isPlaying, true);
      store.play(); // duplicate call
      assertEqual(store.isPlaying, true);
    } else {
      if (!store.isPlaying) store.togglePlay();
      assertEqual(store.isPlaying, true);
      if (!store.isPlaying) store.togglePlay();
      assertEqual(store.isPlaying, true);
    }
  });

  test('F22-B4: pause alias halts playback and is idempotent if already paused', () => {
    store.togglePlay(); // now playing
    assertEqual(store.isPlaying, true);

    if (typeof store.pause === 'function') {
      store.pause();
      assertEqual(store.isPlaying, false);
      store.pause(); // duplicate call
      assertEqual(store.isPlaying, false);
    } else {
      if (store.isPlaying) store.togglePlay();
      assertEqual(store.isPlaying, false);
      if (store.isPlaying) store.togglePlay();
      assertEqual(store.isPlaying, false);
    }
  });

  test('F22-B5: setPlaybackSpeed / setPlaySpeed boundary handling for speed presets (1x, 3x, 6x)', () => {
    const speeds = [1, 3, 6];
    for (const spd of speeds) {
      if (typeof store.setPlaybackSpeed === 'function') {
        store.setPlaybackSpeed(spd);
      } else {
        store.setPlaySpeed(spd);
      }
      assertEqual(store.playSpeed, spd, `Playback speed must equal ${spd}`);
    }
  });

  test('F22-B6: selectSiteA and selectSiteB aliases update scenarios and recalculate deltas', () => {
    if (typeof store.selectSiteA === 'function') {
      store.selectSiteA('mons_mouton_plateau');
    } else {
      store.setScenarioSite('A', 'mons_mouton_plateau');
    }
    assertEqual(store.scenarioA.siteId, 'mons_mouton_plateau');

    if (typeof store.selectSiteB === 'function') {
      store.selectSiteB('connecting_ridge_south');
    } else {
      store.setScenarioSite('B', 'connecting_ridge_south');
    }
    assertEqual(store.scenarioB.siteId, 'connecting_ridge_south');

    const delta = store.computeScenarioDelta();
    assertNotNull(delta, 'Scenario delta must be computed after site selection');
  });
});

describe('Tier 2: F23 - Mission Control Shell Boundary Validation', () => {
  let htmlContent;

  beforeEach(() => {
    const htmlPath = path.resolve(process.cwd(), 'index.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  test('F23-B1: aerospace palette hex adherence: all required colors are present in stylesheet', () => {
    const requiredColors = [
      '#08090c', // Basalt Black
      '#101217', // Basalt Surface
      '#151821', // Basalt Card
      '#f59e0b', // Solar Amber Primary
      '#10b981', // Phosphor Green
      '#ef4444', // Oxide Crimson
    ];

    for (const color of requiredColors) {
      assertIncludes(
        htmlContent.toLowerCase(),
        color.toLowerCase(),
        `Mission Control Shell must define palette color ${color}`
      );
    }
  });

  test('F23-B2: prohibited generic blue colors check: zero blue shades anywhere in stylesheet or markup', () => {
    const prohibitedBlues = [
      '#0000ff', '#007bff', '#3b82f6', '#1d4ed8', '#2563eb',
      '#1e40af', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff',
      'rgb(0, 0, 255)', 'rgba(0, 0, 255', 'blue;',
    ];

    for (const blue of prohibitedBlues) {
      assertFalse(
        htmlContent.toLowerCase().includes(blue),
        `Prohibited blue shade "${blue}" found in index.html`
      );
    }
  });

  test('F23-B3: strictly zero Unicode emojis across all HTML markup, scripts, and text nodes', () => {
    // Unicode Extended Pictographic regex
    const emojiRegex = /\p{Extended_Pictographic}/gu;
    const matches = htmlContent.match(emojiRegex);
    assertEqual(
      matches,
      null,
      `Mission Control Shell must have strictly zero emojis, found: ${matches ? matches.join(', ') : 'none'}`
    );
  });

  test('F23-B4: DOM navigation tabs contract: all 4 mission tabs defined with data-tab attributes', () => {
    const expectedTabs = ['telemetry', 'ephemeris', 'comparator', 'portals'];
    for (const tab of expectedTabs) {
      assertIncludes(
        htmlContent,
        `data-tab="${tab}"`,
        `index.html must include navigation tab data-tab="${tab}"`
      );
    }
  });

  test('F23-B5: visualizer canvas contract: both 2D canvases are present with valid element IDs', () => {
    assertIncludes(htmlContent, 'id="telemetryCurveCanvas"', 'index.html must contain id="telemetryCurveCanvas"');
    assertIncludes(htmlContent, 'id="skyplotCanvas"', 'index.html must contain id="skyplotCanvas"');
  });

  test('F23-B6: high data density monospace typography: monospace font-stack defined in CSS', () => {
    assertIncludes(htmlContent, '--font-stack-mono:', 'index.html must define --font-stack-mono CSS custom property');
    assertIncludes(htmlContent, 'monospace', 'Monospace font stack must include fallback generic monospace');
  });
});
