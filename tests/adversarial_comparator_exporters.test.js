/**
/**
 * @fileoverview Adversarial empirical stress test suite for Scenario Comparator deltas
 * and Exporters (CSV & JSON) in AppStateStore (Milestone M2).
 *
 * Stress tests:
 * 1. Scenario Comparator Invariants: Site A === Site B -> all 6 deltas === 0, strictly no -0 on slopeDelta.
 * 2. Scenario Comparator Antisymmetry: delta(B, A) === -delta(A, B) across all 16 site combinations.
 * 3. Method Aliases & Reactivity: selectSiteA & selectSiteB across all 4 canonical NASA sites.
 * 4. Boundary & Edge Cases: uninitialized store, invalid site IDs, null/undefined inputs.
 * 5. CSV Exporter: 710 exact lines, 13 exact columns, strict '0'/'1' binary flags, 0 NaN/undefined/null across 8,508 data cells.
 * 6. JSON Exporter: 2-space indentation, JSON parseability, and InterfaceContract schema compliance across 12 cycles.
 *
 * Adheres strictly to ECMAScript 2022 and zero external dependencies.
 */

import {
  describe, test, it, beforeEach, afterEach,
  assert, assertFalse,
  assertEqual, assertNotEqual, assertDeepEqual,
  assertApproxEqual,
  assertGreaterThan, assertGreaterThanOrEqual,
  assertLessThan, assertLessThanOrEqual,
  assertBetween,
  assertThrows,
  assertNotNull, assertNull,
  assertIncludes,
} from './testHarness.js';

import { AppStateStore, appState } from '../src/core/appState.js';
import { InterfaceContract, STEP_SCHEMA_KEYS, SUMMARY_SCHEMA_KEYS } from '../src/core/interfaceContract.js';

describe('Adversarial M2: Scenario Comparator Invariance & Antisymmetry', () => {
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

  test('Invariance: When Site A === Site B, all 6 deltas evaluate to exactly zero with strictly no -0 on slopeDelta', () => {
    const sites = store.sites;
    assertEqual(sites.length, 4, 'Must have 4 canonical NASA sites loaded');

    for (const site of sites) {
      store.selectSiteA(site.id);
      store.selectSiteB(site.id);

      const delta = store.computeScenarioDelta();
      assertNotNull(delta, `Scenario delta must not be null for site ${site.id}`);

      // All 6 delta fields must equal 0
      assertEqual(delta.sunlitHoursDelta, 0, `sunlitHoursDelta must be 0 for identical site ${site.id}`);
      assertEqual(delta.dteHoursDelta, 0, `dteHoursDelta must be 0 for identical site ${site.id}`);
      assertEqual(delta.dualHoursDelta, 0, `dualHoursDelta must be 0 for identical site ${site.id}`);
      assertEqual(delta.viabilityScoreDelta, 0, `viabilityScoreDelta must be 0 for identical site ${site.id}`);
      assertEqual(delta.elevMDelta, 0, `elevMDelta must be 0 for identical site ${site.id}`);
      assertEqual(delta.slopeDelta, 0, `slopeDelta must be 0 for identical site ${site.id}`);

      // Crucial empirical check: verify strictly positive zero (+0), NOT negative zero (-0)
      assertFalse(
        Object.is(delta.slopeDelta, -0),
        `slopeDelta must NOT be -0 for site ${site.id} (Object.is check)`
      );
      assert(
        Object.is(delta.slopeDelta, 0),
        `slopeDelta must be strictly +0 for site ${site.id}`
      );
      assertEqual(
        1 / delta.slopeDelta,
        Infinity,
        `1 / slopeDelta must evaluate to positive Infinity (+Infinity), not -Infinity for site ${site.id}`
      );

      // Verify sign invariance across other deltas
      assertFalse(Object.is(delta.elevMDelta, -0), `elevMDelta must NOT be -0 for site ${site.id}`);
      assertFalse(Object.is(delta.viabilityScoreDelta, -0), `viabilityScoreDelta must NOT be -0 for site ${site.id}`);
    }
  });

  test('Antisymmetry: Swapping Site A and Site B strictly inverts the signs of all deltas across all 16 site pairs', () => {
    const sites = store.sites;
    const metrics = [
      'sunlitHoursDelta',
      'dteHoursDelta',
      'dualHoursDelta',
      'viabilityScoreDelta',
      'elevMDelta',
      'slopeDelta',
    ];

    for (const siteA of sites) {
      for (const siteB of sites) {
        store.selectSiteA(siteA.id);
        store.selectSiteB(siteB.id);
        const deltaAB = store.computeScenarioDelta();

        store.selectSiteA(siteB.id);
        store.selectSiteB(siteA.id);
        const deltaBA = store.computeScenarioDelta();

        assertNotNull(deltaAB, `deltaAB must not be null for ${siteA.id} -> ${siteB.id}`);
        assertNotNull(deltaBA, `deltaBA must not be null for ${siteB.id} -> ${siteA.id}`);

        for (const metric of metrics) {
          assertEqual(
            deltaBA[metric],
            -deltaAB[metric],
            `Antisymmetry failure on ${metric} between ${siteA.id} and ${siteB.id}: deltaBA=${deltaBA[metric]}, -deltaAB=${-deltaAB[metric]}`
          );
        }
      }
    }
  });

  test('Custom synthetic site with identical slope: slopeDelta never evaluates to -0', () => {
    const syntheticSites = [
      {
        ...InterfaceContract.getMockSite(),
        id: 'synthetic_flat_1',
        slopeDeg: 0.0,
      },
      {
        ...InterfaceContract.getMockSite(),
        id: 'synthetic_flat_2',
        slopeDeg: 0.0,
      },
    ];

    const customStore = new AppStateStore();
    customStore.init(syntheticSites);

    customStore.selectSiteA('synthetic_flat_1');
    customStore.selectSiteB('synthetic_flat_2');

    const delta = customStore.computeScenarioDelta();
    assertEqual(delta.slopeDelta, 0);
    assertFalse(Object.is(delta.slopeDelta, -0), 'Zero slope delta between 0.0 deg sites must be +0, not -0');
    assertEqual(1 / delta.slopeDelta, Infinity);
  });
});

describe('Adversarial M2: Method Aliases & Scenario Reactivity', () => {
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

  test('Aliases selectSiteA and selectSiteB correctly update scenario state across all 4 canonical sites', () => {
    const canonicalIds = [
      'shackleton_rim_primary',
      'malapert_massif_summit',
      'mons_mouton_plateau',
      'connecting_ridge_south',
    ];

    for (const idA of canonicalIds) {
      store.selectSiteA(idA);
      assertEqual(store.scenarioA.siteId, idA, `scenarioA.siteId must update to ${idA}`);
      assertEqual(store.scenarioA.cycleData.site.id, idA, `scenarioA.cycleData site must match ${idA}`);
    }

    for (const idB of canonicalIds) {
      store.selectSiteB(idB);
      assertEqual(store.scenarioB.siteId, idB, `scenarioB.siteId must update to ${idB}`);
      assertEqual(store.scenarioB.cycleData.site.id, idB, `scenarioB.cycleData site must match ${idB}`);
    }
  });

  test('Event dispatch: selectSiteA and selectSiteB trigger scenariosUpdated with { a, b, delta }', () => {
    let eventReceived = null;
    let eventCallCount = 0;

    const listener = (e) => {
      eventCallCount++;
      eventReceived = e.detail;
    };

    store.addEventListener('scenariosUpdated', listener);

    store.selectSiteA('malapert_massif_summit');
    assertEqual(eventCallCount, 1, 'scenariosUpdated must be dispatched on selectSiteA');
    assertNotNull(eventReceived);
    assertEqual(eventReceived.a.siteId, 'malapert_massif_summit');
    assertNotNull(eventReceived.delta);

    store.selectSiteB('mons_mouton_plateau');
    assertEqual(eventCallCount, 2, 'scenariosUpdated must be dispatched on selectSiteB');
    assertEqual(eventReceived.b.siteId, 'mons_mouton_plateau');
    assertEqual(eventReceived.delta.elevMDelta, 600, 'Malapert (4800m) to Mons Mouton (5400m) elev delta must be 600m');

    store.removeEventListener('scenariosUpdated', listener);
  });
});

describe('Adversarial M2: Scenario Comparator Extreme & Edge Cases', () => {
  test('Edge Case: calling computeScenarioDelta() before init() returns null safely', () => {
    const freshStore = new AppStateStore();
    const delta = freshStore.computeScenarioDelta();
    assertNull(delta, 'computeScenarioDelta() must return null before init() is called');
  });

  test('Edge Case: calling selectSiteA or selectSiteB before init() does not crash', () => {
    const freshStore = new AppStateStore();
    freshStore.selectSiteA('shackleton_rim_primary');
    freshStore.selectSiteB('malapert_massif_summit');
    const delta = freshStore.computeScenarioDelta();
    assertNull(delta, 'computeScenarioDelta() must return null when cycleData is not computed');
  });

  test('Edge Case: invalid site IDs passed to selectSiteA or selectSiteB handle gracefully', () => {
    const store = new AppStateStore();
    store.init();

    // Pass non-existent site ID
    store.selectSiteA('invalid_non_existent_site_alpha');
    assertEqual(store.scenarioA.siteId, 'invalid_non_existent_site_alpha');

    // Should not throw and computeScenarioDelta uses safe fallbacks
    const delta = store.computeScenarioDelta();
    assertNotNull(delta, 'computeScenarioDelta must compute with defensive fallbacks');
    assertEqual(typeof delta.elevMDelta, 'number');
    assertEqual(typeof delta.slopeDelta, 'number');

    // Pass extreme invalid types
    const hostileInputs = [null, undefined, 42, {}, [], false, ''];
    for (const hostile of hostileInputs) {
      store.selectSiteA(hostile);
      store.selectSiteB(hostile);
      const d = store.computeScenarioDelta();
      assertNotNull(d);
      assertEqual(typeof d.elevMDelta, 'number');
      assertEqual(typeof d.slopeDelta, 'number');
    }
  });

  test('Edge Case: partially null cycleData returns null safely', () => {
    const store = new AppStateStore();
    store.init();

    store.scenarioA.cycleData = null;
    assertNull(store.computeScenarioDelta(), 'computeScenarioDelta must return null when scenarioA cycleData is null');

    store.init();
    store.scenarioB.cycleData = null;
    assertNull(store.computeScenarioDelta(), 'computeScenarioDelta must return null when scenarioB cycleData is null');
  });
});

describe('Adversarial M2: Data Exporter exportToCSV() Verification', () => {
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

  test('exportToCSV returns empty string "" before init()', () => {
    const freshStore = new AppStateStore();
    assertEqual(freshStore.exportToCSV(), '', 'exportToCSV must return empty string on uninitialized store');
  });

  test('Line count: Exactly 710 lines (1 header + 709 data rows) across all 4 canonical sites', () => {
    for (const site of store.sites) {
      store.setActiveSite(site.id);
      const csv = store.exportToCSV();
      const lines = csv.split('\n');
      assertEqual(
        lines.length,
        710,
        `Site ${site.id} CSV line count must be exactly 710 (got ${lines.length})`
      );
    }
  });

  test('Header columns: Exactly 13 named columns matching JPL Horizons schema', () => {
    const expectedHeaders = [
      'Hour_Offset', 'Sun_Az_Deg', 'Sun_El_Deg', 'Sun_Mask_Deg', 'Is_Sunlit',
      'Earth_Az_Deg', 'Earth_El_Deg', 'Earth_Mask_Deg', 'Is_DTE',
      'Lib_Lat_Deg', 'Lib_Lon_Deg', 'Array_Eff_Pct', 'Solar_Flux_Wm2',
    ];

    const csv = store.exportToCSV();
    const headerLine = csv.split('\n')[0];
    const actualHeaders = headerLine.split(',');

    assertEqual(actualHeaders.length, 13, 'Header must have exactly 13 columns');
    assertDeepEqual(actualHeaders, expectedHeaders, 'Header column names must strictly match schema');
  });

  test('Data rows column count & binary flags across all 4 sites (2,836 total data rows checked)', () => {
    let rowsChecked = 0;

    for (const site of store.sites) {
      store.setActiveSite(site.id);
      const csv = store.exportToCSV();
      const lines = csv.split('\n');

      for (let h = 1; h < lines.length; h++) {
        rowsChecked++;
        const row = lines[h];
        const cols = row.split(',');

        assertEqual(cols.length, 13, `Row ${h} of site ${site.id} must have exactly 13 columns`);

        // Hour offset monotonicity
        const hourOffset = parseInt(cols[0], 10);
        assertEqual(hourOffset, h - 1, `Hour offset at row ${h} must be ${h - 1}`);

        // Binary flags formatting
        const isSunlit = cols[4];
        const isDte = cols[8];

        assert(
          isSunlit === '0' || isSunlit === '1',
          `Row ${h} Is_Sunlit must strictly be "0" or "1", received: "${isSunlit}"`
        );
        assert(
          isDte === '0' || isDte === '1',
          `Row ${h} Is_DTE must strictly be "0" or "1", received: "${isDte}"`
        );

        // Check for NaN, undefined, or null substrings in each cell
        for (let c = 0; c < cols.length; c++) {
          assertNotEqual(cols[c], 'NaN', `Row ${h} col ${c} cannot be NaN`);
          assertNotEqual(cols[c], 'undefined', `Row ${h} col ${c} cannot be undefined`);
          assertNotEqual(cols[c], 'null', `Row ${h} col ${c} cannot be null`);
          assert(cols[c].length > 0, `Row ${h} col ${c} cannot be empty`);
        }
      }
    }

    assertEqual(rowsChecked, 4 * 709, 'Must have verified exactly 2,836 data rows');
  });

  test('CSV export across all 3 solar array geometry models', () => {
    const arrayGeometries = ['vertical_mast', 'sun_tracking', 'horizontal_deck'];

    for (const geom of arrayGeometries) {
      store.setArrayType(geom);
      const csv = store.exportToCSV();
      const lines = csv.split('\n');
      assertEqual(lines.length, 710, `CSV for array geometry ${geom} must have 710 lines`);
    }
  });
});

describe('Adversarial M2: Data Exporter exportToJSON() Verification', () => {
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

  test('exportToJSON returns "null" string before init()', () => {
    const freshStore = new AppStateStore();
    assertEqual(freshStore.exportToJSON(), 'null', 'exportToJSON must return "null" on uninitialized store');
  });

  test('JSON parseability and 2-space indentation formatting', () => {
    const jsonStr = store.exportToJSON();
    assert(typeof jsonStr === 'string', 'exportToJSON must return a string');

    // Parseability
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      assert(false, `JSON parsing failed: ${err.message}`);
    }
    assertNotNull(parsed);

    // 2-space indentation check
    const lines = jsonStr.split('\n');
    assert(lines[1].startsWith('  "'), 'Level 1 properties must be indented with 2 spaces');
    assertIncludes(jsonStr, '{\n  "site":', 'Root object must open with 2-space indentation');
    assertIncludes(jsonStr, '\n  "steps": [\n    {', 'Steps array elements must have 4-space indentation');
  });

  test('Re-validation via InterfaceContract.validateCycleData across 12 cycles (4 sites x 3 array types)', () => {
    const arrayTypes = ['vertical_mast', 'sun_tracking', 'horizontal_deck'];
    let validatedCycles = 0;

    for (const arrayType of arrayTypes) {
      store.setArrayType(arrayType);

      for (const site of store.sites) {
        store.setActiveSite(site.id);
        const jsonStr = store.exportToJSON();
        const parsed = JSON.parse(jsonStr);

        const isValid = InterfaceContract.validateCycleData(parsed);
        assert(isValid, `Exported JSON for ${site.id} (${arrayType}) must strictly pass validateCycleData`);

        // Verify steps count
        assertEqual(parsed.steps.length, 709, `Steps count must be 709 for ${site.id}`);

        // Verify STEP_SCHEMA_KEYS (all 15 keys present on every step)
        for (const key of STEP_SCHEMA_KEYS) {
          assert(key in parsed.steps[0], `Step 0 missing key ${key}`);
          assert(key in parsed.steps[354], `Step 354 missing key ${key}`);
          assert(key in parsed.steps[708], `Step 708 missing key ${key}`);
        }

        // Verify SUMMARY_SCHEMA_KEYS (all 8 keys present)
        for (const key of SUMMARY_SCHEMA_KEYS) {
          assert(key in parsed, `Summary missing key ${key}`);
          assertEqual(typeof parsed[key], 'number', `Summary key ${key} must be numeric`);
        }

        validatedCycles++;
      }
    }

    assertEqual(validatedCycles, 12, 'Must have re-validated all 12 combinations via InterfaceContract');
  });

  test('Round-trip numeric and string property fidelity against active cycleData', () => {
    const jsonStr = store.exportToJSON();
    const parsed = JSON.parse(jsonStr);
    const original = store.cycleData;

    assertEqual(parsed.site.id, original.site.id);
    assertEqual(parsed.epochDateStr, original.epochDateStr);
    assertEqual(parsed.arrayType, original.arrayType);
    assertEqual(parsed.sunlitHours, original.sunlitHours);
    assertEqual(parsed.dteHours, original.dteHours);
    assertEqual(parsed.dualHours, original.dualHours);
    assertEqual(parsed.sunlitPct, original.sunlitPct);
    assertEqual(parsed.dtePct, original.dtePct);
    assertEqual(parsed.dualPct, original.dualPct);
    assertEqual(parsed.avgPowerEff, original.avgPowerEff);
    assertEqual(parsed.viabilityScore, original.viabilityScore);

    // Sample step check
    for (const stepIdx of [0, 100, 350, 708]) {
      assertEqual(parsed.steps[stepIdx].hourOffset, original.steps[stepIdx].hourOffset);
      assertEqual(parsed.steps[stepIdx].sunAzDeg, original.steps[stepIdx].sunAzDeg);
      assertEqual(parsed.steps[stepIdx].sunElDeg, original.steps[stepIdx].sunElDeg);
      assertEqual(parsed.steps[stepIdx].isSunlit, original.steps[stepIdx].isSunlit);
      assertEqual(parsed.steps[stepIdx].earthAzDeg, original.steps[stepIdx].earthAzDeg);
      assertEqual(parsed.steps[stepIdx].earthElDeg, original.steps[stepIdx].earthElDeg);
      assertEqual(parsed.steps[stepIdx].isEarthVisible, original.steps[stepIdx].isEarthVisible);
      assertEqual(parsed.steps[stepIdx].solarFluxWm2, original.steps[stepIdx].solarFluxWm2);
    }
  });
});
