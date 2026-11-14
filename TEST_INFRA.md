# TEST INFRASTRUCTURE & ARCHITECTURE SPECIFICATION
**Project:** SeleneSight — Lunar South Pole Horizon, Solar Power & Direct-to-Earth (DTE) Comm Evaluator  
**Event:** 2026 NASA Space Apps Challenge  
**Document:** Canonical Test Infrastructure, Verification Strategy & Feature Mapping  
**Execution Runtime:** Native ECMAScript 2022 / Node.js v22 (`ELECTRON_RUN_AS_NODE=1`)

---

## 1. Test Philosophy & Strategy

The SeleneSight testing infrastructure implements an **opaque-box, requirement-driven, zero-internal-coupling verification framework**. The system is treated as a celestial mechanics and aerospace mission telemetry black box: inputs are astronomical dates, landing site coordinates, and rover configurations; outputs are ephemeris trajectories, power generation models, communication windows, and state transitions.

### 1.1 Core Tenets
1. **Opaque-Box Verification:** Tests interact strictly with public module interfaces (`InterfaceContract`, `EphemerisEngine`, `AppStateStore`, and UI contract fixtures). Internal private helper functions are not coupled to test assertions, guaranteeing refactor safety.
2. **Deterministic Physics Oracles:** All expected astronomical quantities are derived from authoritative celestial mechanics sources:
   - Jean Meeus *Astronomical Algorithms* (Julian Dates, sub-solar longitude drift $\omega_{\text{syn}} \approx 0.507948^\circ/\text{hr}$, seasonal sub-solar latitude $\pm 1.5424^\circ$).
   - NASA Lunar Reconnaissance Orbiter (LRO) LOLA Digital Elevation Model (DEM) topographic horizon profiles.
   - NASA JPL Horizons lunar ephemeris standards (optical libration in latitude $\pm 6.68^\circ$ / draconic cycle 653.093h, optical libration in longitude $\pm 7.90^\circ$ / anomalistic cycle 661.309h).
   - Solar constant at 1 AU ($1,361.0\text{ W/m}^2$) and geometric photovoltaic efficiency formulations.
3. **Rigorous Test Methodologies:**
   - **Category-Partitioning:** Systematic parameter decomposition into equivalence classes (e.g., illuminated vs shadowed, line-of-sight vs crater-occulted, positive vs negative elevations).
   - **Boundary Value Analysis (BVA):** Testing exact transition thresholds (e.g., $El_{\text{sun}} = \text{mask}$, $Az \in [359.95^\circ, 360.0^\circ) \to 0.0^\circ$, step boundaries $h=0$ and $h=708$).
   - **Pairwise Combinatorial Testing:** Exercising multi-variable parameter spaces across array mounting types, site elevations, libration phases, and timeline playback states.
   - **Real-World Mission Workload Scenarios:** Full synodic cycle simulations for authentic Artemis III and CLPS candidate landing sites.
4. **Non-Negotiable Integrity:**
   - Zero mocked physics or hardcoded pass assertions.
   - Zero test facade implementations.
   - Independent verification by automated audit tooling.

---

## 2. Feature Inventory Mapping (Tiers 1–3)

SeleneSight encompasses 23 core functional features across the mathematical engine, schema contracts, reactive state store, and UI shell. Each feature is mapped across Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner Cases), and Tier 3 (Pairwise Interactions):

| # | Feature Name | Tier 1: Feature Coverage (>=5 tests) | Tier 2: Boundary & Corner Cases (>=5 tests) | Tier 3: Pairwise Combinations |
|---|--------------|--------------------------------------|---------------------------------------------|-------------------------------|
| **F01** | **Julian Date Conversion** | ISO date parsing for J2000 epoch, 2026 Space Apps date, leap year Feb 29, month transitions, year-end boundaries. | Historical years < 1900, far-future > 2100, fractional day transitions, leap-second boundaries, invalid format rejection. | Epoch date $\times$ observer coordinates $\to$ initial sub-solar position. |
| **F02** | **Centuries Since J2000** | Century calculations at $T=0.0$ (2000-01-01), 2026 epoch ($T \approx 0.2687$), hourly offsets at $h=100, 354, 708$. | Negative centuries ($T < 0$), zero offset boundary, maximum offset $h=708$, extreme hour values ($h > 1000$). | Century progress $\times$ sub-solar declination progression. |
| **F03** | **LOLA Horizon Mask Interpolation** | Sector on-boundary azimuths ($0^\circ, 30^\circ, 60^\circ$), exact mid-sector azimuths ($15^\circ, 45^\circ$), 12-sector array lookup. | Circular wrap across $359.9^\circ \to 0.0^\circ$, negative azimuth normalization, flat horizon ($0.0^\circ$), high rim peaks ($> 15.0^\circ$). | Horizon profile $\times$ low-angle grazing solar elevation $\to$ shadow occlusion. |
| **F04** | **Topocentric Vector Solver** | Az/El computation for South Pole sites, observer elevation dip allowance $\delta_{\text{elev}} = \sqrt{2h/R}$, positive elevation gain. | Observer at exact pole ($\phi = -90.0^\circ$), sea-level ($h=0\text{m}$), extreme summit ($h=5400\text{m}$), zenith/nadir limits. | Elevation dip $\times$ crater rim clearance $\to$ extended line-of-sight. |
| **F05** | **Azimuth Normalization (360° Wrap Guard)** | Standard modulo arithmetic across $[0^\circ, 360^\circ)$, quadrant transitions ($90^\circ, 180^\circ, 270^\circ$). | Rounding wrap guard: $[359.95^\circ, 360.0^\circ) \to 0.0^\circ$, negative angle wrap ($-0.01^\circ \to 359.99^\circ$), exact $0.0^\circ$ preserve. | Azimuth wrap $\times$ 12-sector horizon bin transition. |
| **F06** | **Sub-Solar Seasonal Latitude** | Orbital obliquity sine progression ($\pm 1.5424^\circ$), annual period (365.25 days), seasonal extrema. | Solstice extrema ($\pm 1.5424^\circ$), equinox zero-crossings, leap-year annual drift. | Seasonal latitude $\times$ observer polar latitude $\to$ polar day/night duration. |
| **F07** | **Sub-Solar Synodic Drift** | Synodic drift rate $\omega_{\text{syn}} \approx 0.507948^\circ/\text{hr}$, 708-hour synodic sweep ($\sim 359.6^\circ$), longitudinal continuity. | Step $h=0$ start position, step $h=708$ completion, hour-to-hour monotonicity, longitude wrap $[0^\circ, 360^\circ)$. | Synodic drift $\times$ site longitude $\to$ local solar noon timing. |
| **F08** | **Optical Libration (Draconic & Anomalistic)** | Draconic latitudinal wobble ($\pm 6.68^\circ$, period 653.093h), anomalistic longitudinal wobble ($\pm 7.90^\circ$, period 661.309h). | Phase zero-crossings, peak amplitude boundaries, asynchronous period phase drift. | Libration vectors $\times$ topocentric Earth vector $\to$ DTE lock persistence. |
| **F09** | **Solar Array PV Efficiency Models** | Vertical mast ($\max(0, \cos El) \times 100$), 2-axis tracking ($100\%$ when sunlit), horizontal deck ($\max(0, \sin El) \times 100$). | Zero illumination when occulted, grazing angles ($El = 0.1^\circ$), vertical vs horizontal efficiency crossover ($\sim 45^\circ$). | Array geometry $\times$ low polar elevation angle $\to$ net energy yield. |
| **F10** | **Incident Solar Flux Calculation** | Solar flux equation $1361.0 \times (\eta / 100)\text{ W/m}^2$, zero flux when shadowed ($El \le \text{mask}$), peak tracking flux. | Occlusion threshold boundary, minimal positive flux, numerical precision formatting. | Incident flux $\times$ terrain shadow clearance $\to$ battery charging windows. |
| **F11** | **Synodic Cycle Ephemeris Generation** | 709 hourly steps ($h \in [0, 708]$), all 15 `STEP_SCHEMA_KEYS` populated, 8 `SUMMARY_SCHEMA_KEYS` generated. | Verification at step 0 and step 708, missing optional arguments fallback, invalid array type handling. | Ephemeris cycle data $\times$ InterfaceContract validation. |
| **F12** | **State Transition Countdowns** | Next sunset countdown, next sunrise countdown, next earthset countdown, next earthrise countdown. | Perpetual sunlight (countdown null / -1), perpetual darkness, perpetual DTE link, step 708 end-of-sim. | State countdowns $\times$ timeline scrubbing $\to$ dynamic UI countdown indicators. |
| **F13** | **Multi-Criteria Site Viability Scoring** | Weight equation $0.45 \cdot \text{sunlitPct} + 0.35 \cdot \text{dtePct} + 0.20 \cdot \text{slopePenalty}$, score normalization $[0, 100]$. | Zero sunlit (PSR), 100% sunlit peak, extreme slope ($> 30^\circ$, max penalty), zero slope flat surface. | Viability score $\times$ comparative delta analysis between sites. |
| **F14** | **Site Schema Runtime Validation** | `validateSite` passes for valid site descriptors with 8 required keys, 12-element horizon array, valid latitude/longitude. | Missing properties, non-array horizon profile, horizon array length $\ne 12$, latitude $> 90^\circ$ or $< -90^\circ$, negative slope. | Site validation $\times$ AppState catalog initialization. |
| **F15** | **Cycle Data Runtime Validation** | `validateCycleData` passes for compliant 709-step ephemeris with all 15 step keys and 8 summary keys. | Step count $\ne 709$, missing step schema keys, missing summary schema keys, non-array steps. | Ephemeris calculation $\times$ cycle validation gate. |
| **F16** | **Canonical NASA Site Profiles** | Integrity of 4 canonical profiles: Shackleton Rim Primary, Malapert Massif Summit, Mons Mouton Plateau, Connecting Ridge South. | Coordinate validity ($\phi \in [-90^\circ, -80^\circ]$), elevation in meters, slope angle ranges, horizon profile bounds. | Canonical fixtures $\times$ multi-site comparative analysis. |
| **F17** | **Reactive EventTarget Store** | AppStateStore event dispatching (`siteChanged`, `cycleChanged`, `hourChanged`, `playStateChanged`, `speedChanged`, `scenariosUpdated`). | Multiple subscribers, unsubscribed listeners, duplicate event dispatches, unhandled custom events. | Reactive state store $\times$ UI view-mode / tab navigation. |
| **F18** | **Multi-Speed Timeline Playback** | Speed presets (1x, 3x, 6x), play/pause toggling, periodic hour advancement, timer cleanup. | Scrubber boundary clamping $[0, 708]$, auto-looping from 708 to 0, rapid pause/play spamming. | Playback animation loop $\times$ real-time telemetry card updates. |
| **F19** | **Scenario Trade-off Comparator** | Delta computation: `sunlitHoursDelta`, `dteHoursDelta`, `dualHoursDelta`, `viabilityScoreDelta`, `elevMDelta`, `slopeDelta`. | Identical Site A and Site B (all deltas = 0), inverted site comparison (signs flip), null scenario handling. | Comparator deltas $\times$ Site selection switching in AppState. |
| **F20** | **JPL Horizons-Compatible CSV Exporter** | CSV format: 13 column headers, exactly 710 lines (1 header + 709 steps), comma delimiter, correct columns. | Special numeric values, column order invariance, line ending consistency (`\n`), valid CSV parseability. | CSV export $\times$ computed ephemeris dataset. |
| **F21** | **Ephemeris JSON Exporter** | JSON export: valid JSON parseability, 2-space indentation, preserving all steps and summary metrics. | Empty cycle data handling, deep object fidelity, special character encoding. | JSON export $\times$ cycle data schema re-validation. |
| **F22** | **Convenience Method Aliases** | Aliases: `setTimeIndex` $\to$ `setHour`, `play`, `pause`, `setPlaybackSpeed`, `selectSiteA`, `selectSiteB`. | Null/undefined inputs to aliases, out-of-range hour offsets, string-typed numeric inputs. | Convenience methods $\times$ external UI controller integration. |
| **F23** | **Mission Control Shell Integration** | DOM contract verification: 4 navigation tabs, telemetry display containers, canvas visualizer elements. | Lunar Basalt & Solar Amber palette compliance (`#08090c`, `#101217`, `#f59e0b`, zero blue), strictly zero emojis in text. | Shell DOM event hooks $\times$ AppStateStore event subscriptions. |

---

## 3. Test Architecture & Runner Specification

### 3.1 Directory Layout
```
/run/media/abhijithbs/Shared/NASA/
├── TEST_INFRA.md                   # Canonical test infrastructure specification (this document)
├── tests/
│   ├── testHarness.js              # Pure ECMAScript test framework & assertion library
│   ├── runAll.js                   # Unified CLI test runner with tier filtering & ANSI reporting
│   ├── infra_sanity.test.js        # Infrastructure & assertion sanity verification suite
│   ├── tier1_ephemeris.test.js     # Tier 1: Core Ephemeris Engine feature tests
│   ├── tier1_state.test.js         # Tier 1: State management, comparator & exporter tests
│   ├── tier1_contract.test.js      # Tier 1: Schema validation & fixture contract tests
│   ├── tier2_boundaries.test.js    # Tier 2: Boundary value & edge condition tests
│   ├── tier3_pairwise.test.js      # Tier 3: Combinatorial & subsystem integration tests
│   └── tier4_scenarios.test.js     # Tier 4: Real-world mission workload scenarios
```

### 3.2 Test Execution Command
All tests run in the project environment using native Node v22 via the Electron runtime binary:
```bash
ELECTRON_RUN_AS_NODE=1 /snap/antigravity-ide-snap/current/usr/share/antigravity-ide/antigravity-ide tests/runAll.js
```

### 3.3 CLI Runner Options
The runner `tests/runAll.js` accepts command-line flags for granular test selection:
- **Run all suites:** `tests/runAll.js`
- **Filter by tier:**
  - `--tier=sanity` (runs `infra_sanity.test.js`)
  - `--tier=1` (runs all Tier 1 feature tests)
  - `--tier=2` (runs Tier 2 boundary and corner tests)
  - `--tier=3` (runs Tier 3 pairwise integration tests)
  - `--tier=4` (runs Tier 4 mission workload scenarios)
  - `--tier=1,2,3,4` (runs all tier test suites)
- **Filter by suite name/file pattern:**
  - `--filter=ephemeris`
  - `--filter=state`
- **Verbosity:**
  - `--verbose` or `-v` (prints detailed assertions per test)
- **Exit codes:**
  - Exit `0`: All executed test suites passed.
  - Exit `1`: One or more assertions failed or uncaught exceptions occurred.

### 3.4 Test Framework Interface (`tests/testHarness.js`)
The custom test harness requires zero third-party dependencies and exports standard BDD/TDD primitives:

```javascript
import {
  describe, test, it,
  beforeAll, afterAll, beforeEach, afterEach,
  assert, assertEqual, assertNotEqual, assertDeepEqual,
  assertApproxEqual, assertGreaterThan, assertLessThan,
  assertBetween, assertThrows, assertReject,
  assertIncludes, assertMatch, assertFalse,
} from './testHarness.js';

describe('Ephemeris Engine Topocentric Solver', () => {
  beforeEach(() => { /* setup fixture */ });

  test('calculates solar elevation within astronomical tolerance', () => {
    const el = calculateElevation(...);
    assertApproxEqual(el, 1.45, 0.01, 'Solar elevation should match theoretical angle');
  });

  test('throws TypeError on invalid site descriptor', () => {
    assertThrows(() => validateSite(null), 'Site descriptor must be an object');
  });
});
```

---

## 4. Real-World Application Scenarios (Tier 4 Workload Testing)

Tier 4 exercises complete, multi-day mission workloads across authentic NASA Artemis and CLPS candidate landing sites:

### 4.1 Scenario 1: Artemis III Shackleton Rim Primary Exploration
- **Target Site:** `shackleton_rim_primary` ($\phi = -89.54^\circ, \lambda = 137.0^\circ$, elev: 2,100 m, slope: $8.5^\circ$)
- **Mission Context:** Crewed lunar surface sortie over a full 708-hour synodic cycle starting 2026-11-14.
- **Workload Verification:**
  - Continuous grazing solar elevation tracking ($\le 1.8^\circ$ above mean horizon).
  - High-efficiency vertical mast solar array performance during continuous illumination peaks.
  - Verification of line-of-sight terrain clearance over 12-sector LOLA crater-rim horizon profile.
  - DTE communication lock during favorable draconic libration cycles ($\beta_{\oplus} > 0^\circ$).

### 4.2 Scenario 2: VIPER / CLPS Malapert Massif Summit Long-Duration Station
- **Target Site:** `malapert_massif_summit` ($\phi = -86.0^\circ, \lambda = 2.7^\circ$, elev: 4,800 m, slope: $12.4^\circ$)
- **Mission Context:** Robotic long-duration science station and communication relay outpost.
- **Workload Verification:**
  - Extreme elevation dip allowance ($\delta_{\text{elev}} \approx 4.25^\circ$), granting near-continuous Direct-to-Earth visibility.
  - Evaluation of 2-axis sun tracking array maximizing power harvest on steep massif ridges.
  - Viability score balancing high DTE availability against terrain slope penalties.

### 4.3 Scenario 3: Mons Mouton Plateau Deep PSR & Resource Survey
- **Target Site:** `mons_mouton_plateau` ($\phi = -85.6^\circ, \lambda = 31.0^\circ$, elev: 5,400 m, slope: $6.2^\circ$)
- **Mission Context:** Volatiles prospecting mission exploring permanently shadowed regions (PSRs).
- **Workload Verification:**
  - Low-slope plateau trafficability assessment for rover traverse routes.
  - Periodic eclipse and shadow transitions, requiring accurate state transition countdowns (`nextSunset`, `nextSunrise`).
  - Dual illumination + DTE communication windows for real-time high-bandwidth teleoperation.

### 4.4 Scenario 4: Connecting Ridge South Site-Selection Trade-off
- **Target Sites:** `connecting_ridge_south` vs `shackleton_rim_primary`
- **Mission Context:** Artemis traverse corridor optimization and landing site selection trade study.
- **Workload Verification:**
  - Side-by-side comparative trade-off calculation (`computeScenarioDelta`).
  - Analysis of sunlit hours delta, DTE hours delta, and slope safety margins.
  - Complete JPL Horizons CSV export and JSON export validation under production workloads.

---

## 5. Coverage Thresholds & Quality Gates

To satisfy the NASA Space Apps Challenge evaluators and the SeleneSight Quality Assurance charter, the test suite must meet or exceed the following metrics:

| Tier | Category | Minimum Test Count | Target Test Count |
|------|----------|-------------------|-------------------|
| **Sanity** | Test Harness & Environment Verification | $\ge 10$ tests | 15 tests |
| **Tier 1** | Feature Coverage ($\ge 5$ tests $\times$ 23 features) | $\ge 115$ tests | 120 tests |
| **Tier 2** | Boundary & Corner Testing ($\ge 5$ tests $\times$ 23 features) | $\ge 115$ tests | 120 tests |
| **Tier 3** | Pairwise Subsystem Integration | $\ge 25$ tests | 30 tests |
| **Tier 4** | Real-World Artemis / CLPS Workloads | $\ge 10$ tests | 12 tests |
| **Total** | **Full SeleneSight E2E Test Suite** | **$\ge 275$ tests** | **$\ge 297$ tests** |

*(Requirement formula: $\ge 11 \cdot N + \max(5, \lfloor N/2 \rfloor) = 11 \cdot 23 + 12 = 265\text{ tests}$. The target of $\ge 275$ tests comfortably exceeds all specification floors).*

### 5.1 Verification Gate Execution
1. Every automated test must be runnable locally without internet access or external API keys.
2. All assertions must evaluate in under 5.0 seconds total across the complete suite.
3. Code changes in `src/core/` must pass all tiers prior to merging.
4. Git ownership boundaries (`src/data/*`, `src/ui/*`, `docs/*`) are respected without modifying teammate stubs.
