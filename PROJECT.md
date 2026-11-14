# Project: SeleneSight Lunar Ephemeris Evaluation Platform

## Architecture
SeleneSight is a browser-native ECMAScript 2022 topocentric lunar south pole illumination, solar power, and Direct-to-Earth (DTE) communication ephemeris evaluation platform developed for the 2026 NASA Space Apps Challenge evaluators.

### Core Architecture & Module Boundaries
- `src/core/ephemerisEngine.js`: Pure mathematical physics calculation engine. Converts calendar epoch dates to Julian Dates (Meeus algorithm), computes sub-solar and sub-Earth coordinates (synodic drift, draconic/anomalistic optical librations), calculates topocentric azimuth and elevation with observer elevation dip allowance, evaluates 12-sector LOLA crater-rim horizon obstruction via continuous linear interpolation, computes photovoltaic conversion efficiency across vertical mast, 2-axis tracking, and horizontal deck arrays, forward-scans state transitions, and calculates multi-criteria site viability scores.
- `src/core/interfaceContract.js`: Interface contracts, runtime schema definitions (`STEP_SCHEMA_KEYS` with 15 keys, `SUMMARY_SCHEMA_KEYS` with 8 keys, `SITE_SCHEMA_KEYS` with 8 keys), validation guards (`validateSite`, `validateCycleData`), and 4 canonical NASA south pole candidate landing site fixtures (`shackleton_rim_primary`, `malapert_massif_summit`, `mons_mouton_plateau`, `connecting_ridge_south`).
- `src/core/appState.js`: EventTarget-based reactive state store. Manages landing sites catalog, active site selection, simulation timeline scrubbing and animation playback (0–708 hours at 1x/3x/6x), side-by-side comparative trade-off delta evaluation (Site A vs Site B across 6 parameters), and ephemeris data export to JPL Horizons-compatible CSV and formatted JSON.
- `index.html`: Aerospace Mission Control Shell. Responsive application interface adhering strictly to the Lunar Basalt & Solar Grazing Amber palette (`#08090c`, `#101217`, `#151821`, `#f59e0b`, `#10b981`, `#ef4444`, zero blue, monospace typography, zero emojis). Embeds HTML5 canvas visualizers (708-hour dual-curve elevation trajectory and polar/linear skyplots) and dynamic NASA LROC QuickMap / Moon Trek deep links.
- Teammate Git Ownership Boundaries:
  - `src/data/*` (Anusree S - `feat/anusree-lunar-data`): `landingSites.js`, `horizonMasks.js`, `nasaDeepLinks.js`. Maintained as clean stubs.
  - `src/ui/*` (Alfiya S - `feat/alfiya-ui-visuals`): `polarMapRenderer.js`, `skyplotRenderer.js`, `timelineRenderer.js`, `styles.css`. Maintained as clean stubs.
  - `docs/*` (Adith V S - `feat/adith-docs-demo`): `csa_mission_context.md`, `educator_tips.js`, `submission_form_answers.md`, `demo_deck/`. Maintained as clean stubs.

### Data Flow
```
[User / Timeline Scrubber / Site Selectors]
                    │
                    ▼
          [AppStateStore (EventTarget)]
                    │
                    ├── calls ──▶ [EphemerisEngine.computeFullCycle]
                    │                       │
                    │                       ▼
                    │             [InterfaceContract] (Validates 709 steps & schemas)
                    │
                    ├── dispatches events ──▶ [index.html UI Event Handlers]
                    │                                 │
                    ▼                                 ▼
      [Telemetry Tables & KPI Cards]       [HTML5 Canvas Renderers]
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Julian Date Conversion | Meeus astronomical algorithm converting ISO date string to Julian Date at 00:00:00 UTC | M1 | Survey |
| 2 | Centuries Since J2000 | Calculation of Julian centuries elapsed from J2000.0 epoch ($JD=2451545.0$) | M1 | Survey |
| 3 | Continuous LOLA Horizon Mask Interpolation | 2-point linear interpolation over 12-sector (30° bins) LOLA crater-rim horizon elevation angles | M1 | Survey |
| 4 | Topocentric Vector Solver | Spherical coordinate solver computing topocentric Az/El with observer elevation dip allowance | M1 | Survey |
| 5 | Azimuth Normalization (360° Wrap Guard) | Normalization of azimuth modulo 360 after rounding so $[359.95, 360.0) \to 0.0^\circ$ | M1 | Survey |
| 6 | Sub-Solar Seasonal Latitude (J2000 Orbit) | Sub-solar latitude based on tropical year Meeus Julian Date orbital progression | M1 | Survey |
| 7 | Sub-Solar Synodic Drift | Sub-solar longitude drift advancing at mean rate $\omega_{\text{syn}} \approx 0.507948^\circ/\text{hr}$ | M1 | Survey |
| 8 | Optical Libration (Draconic & Anomalistic) | Latitudinal wobble ($\pm6.68^\circ$, $653.093\text{h}$) and longitudinal wobble ($\pm7.90^\circ$, $661.309\text{h}$) | M1 | Survey |
| 9 | Solar Array PV Efficiency Models | Geometric collection efficiency for vertical mast, 2-axis tracking, and horizontal deck arrays | M1 | Survey |
| 10 | Incident Solar Flux Calculation | Direct solar power flux ($1361.0\text{ W/m}^2 \times \eta / 100$) with terrain shadow occlusion | M1 | Survey |
| 11 | Synodic Cycle Ephemeris Generation | 709 hourly steps ($h \in [0, 708]$) containing all 15 `STEP_SCHEMA_KEYS` and 8 `SUMMARY_SCHEMA_KEYS` | M1 | Survey |
| 12 | State Transition Countdowns | Forward-scanning state transitions for next sunset, sunrise, earthset, and earthrise | M1 | Survey |
| 13 | Multi-Criteria Site Viability Scoring | Scoring formula: $0.45 \cdot \text{sunlitPct} + 0.35 \cdot \text{dtePct} + 0.20 \cdot \text{slopePenalty}$ | M1 | Survey |
| 14 | Site Schema Runtime Validation | Validation of site descriptor coordinates, elevation, slope, and 12-sector profile | M1 | Survey |
| 15 | Cycle Data Runtime Validation | Validation of 709 steps, 15 step keys, and 8 summary keys via `InterfaceContract` | M1 | Survey |
| 16 | Canonical NASA Site Profiles | 4 canonical lunar south pole fixtures (Shackleton, Malapert, Mons Mouton, Connecting Ridge) | M1 | Survey |
| 17 | Reactive EventTarget Store | Centralized state store managing site selection, epoch date, hour, array type, view mode | M2 | Survey |
| 18 | Multi-Speed Timeline Playback | Animation controller advancing simulation at 1x (100ms), 3x (33ms), 6x (30ms) with auto-looping | M2 | Survey |
| 19 | Scenario Trade-off Comparator | Side-by-side delta analysis between Site A and Site B across 6 key metrics | M2 | Survey |
| 20 | JPL Horizons-Compatible CSV Exporter | 13-column formatted CSV export with standard column headers and 709 data rows | M2 | Survey |
| 21 | Ephemeris JSON Exporter | 2-space indented formatted JSON serialization of complete cycle dataset | M2 | Survey |
| 22 | Convenience Method Aliases | Aliases (`setTimeIndex`, `play`, `pause`, `setPlaybackSpeed`, `selectSiteA`, `selectSiteB`) on AppStateStore | M2 | Survey |
| 23 | Aerospace Mission Control Shell | 4-tab interface: Mission Telemetry, Trajectory Analysis, Scenario Comparator, Planetary Portals | M3 | Survey |
| 24 | Lunar Basalt & Solar Amber Palette | Palette enforcement (#08090c, #101217, #151821, #f59e0b, #10b981, #ef4444, zero blue) | M3 | Survey |
| 25 | Monospace Telemetry & Zero Emojis | High data-density monospace telemetry with strictly zero emojis | M3 | Survey |
| 26 | Dual-Curve Trajectory Canvas | HTML5 Canvas 2D plot of solar elevation, Earth elevation, horizon mask, and time needle | M3 | Survey |
| 27 | Topocentric Skyplot Canvas | HTML5 Canvas 2D polar celestial dome (0°, 5°, 15°, 45°) and linear panorama | M3 | Survey |
| 28 | Dynamic Geoportal Deep Links | Coordinate-anchored URLs for NASA LROC QuickMap, Moon Trek, and JPL Horizons | M3 | Survey |
| 29 | Teammate Clean Stub Preservation | Preserving `src/data/*`, `src/ui/*`, `docs/*` untouched to maintain Git ownership boundaries | M3 | Survey |
| 30 | Opaque-Box E2E Test Suite (Tiers 1-4) | Comprehensive requirement-driven test suite with >=11*N + max(5, N/2) tests | E2E | Survey |
| 31 | Full E2E Test Verification | 100% pass of all E2E test suites (Tiers 1-4) across ephemeris, state, UI, and contracts | M4 | Survey |
| 32 | White-Box Adversarial Hardening (Tier 5) | Adversarial stress testing, gap analysis, and test-coverage hardening | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status | Key Outputs |
|---|------|-------|-------------|--------|-------------|
| E2E | E2E Testing Suite (Tiers 1-4) | Requirements-driven opaque-box test suite (runner, fixtures, Tiers 1-4) | none | DONE | `TEST_INFRA.md`, `TEST_READY.md` published; 431/431 tests pass across 13 test files; Clean Audit |
| M1 | Core Ephemeris Engine Refinement | Mathematical engine fixes (azimuth 360 wrap, seasonal sunLat), schema compliance in `src/core/ephemerisEngine.js` | none | DONE | `src/core/ephemerisEngine.js` refined; 136/136 tests pass, 16.3M invariant checks confirm, Clean Audit |
| M2 | Reactive State Management & API Aliases | Method aliases, EventTarget reactive state, comparator deltas, CSV/JSON export in `src/core/appState.js` | M1 | DONE | `src/core/appState.js` updated with 6 aliases; 400/400 assertions pass across 11 test files, Clean Audit |
| M3 | Mission Control Shell Integration & UI Validation | HTML5 shell, telemetry bindings, canvas renderers, design palette & zero-emoji compliance in `index.html` | M2 | DONE | `index.html` refined; direct downloads, linear panorama, 30° reticle, 444/444 tests pass, Clean Audit |
| M4 | Final E2E Integration & Adversarial Hardening | Phase 1: 100% E2E test pass (Tiers 1-4); Phase 2: Tier 5 adversarial stress testing | E2E, M3 | IN_PROGRESS | Dispatching sub_orch_m4 |

## Interface Contracts

### `src/core/ephemerisEngine.js` ↔ `src/core/interfaceContract.js`
- `ephemerisEngine.computeFullCycle(site: SiteObject, epochDateStr?: string, arrayType?: string): CycleData`
  - Pre-condition: `InterfaceContract.validateSite(site) === true`.
  - Post-condition: `InterfaceContract.validateCycleData(cycleData) === true`.
  - `cycleData.steps.length === 709`.
  - `0.0 <= step.sunAzDeg < 360.0` and `0.0 <= step.earthAzDeg < 360.0`.
  - Libration bounds: `|step.libLatDeg| <= 6.68`, `|step.libLonDeg| <= 7.90`.
  - Solar flux: `step.solarFluxWm2 === (step.arrayEfficiency / 100.0) * 1361.0`.

### `src/core/appState.js` ↔ `src/core/ephemerisEngine.js`
- `appState.init(sitesList?: Array<SiteObject>): void`
  - Validates `sitesList` via `InterfaceContract.validateSite`. Falls back to `InterfaceContract.getMockSites()` if empty.
- `appState.recomputeCycle(): void`
  - Calls `ephemerisEngine.computeFullCycle(this.activeSite, this.epochDateStr, this.arrayType)`.
  - Dispatches `cycleChanged` with `{ cycleData }`.
- `appState.setHour(hour: number) / setTimeIndex(hour: number): void`
  - Clamps to integer `[0, 708]`. Dispatches `hourChanged`.
- `appState.computeScenarioDelta(): ScenarioDeltaObject`
  - Computes deltas: `sunlitHoursDelta`, `dteHoursDelta`, `dualHoursDelta`, `viabilityScoreDelta`, `elevMDelta`, `slopeDelta`.
- `appState.exportToCSV(): string`
  - Returns 710-line CSV string (1 header + 709 step rows).
- `appState.exportToJSON(): string`
  - Returns formatted JSON string of `this.cycleData`.

### `index.html` ↔ `src/core/*`
- `index.html` imports `InterfaceContract` from `./src/core/interfaceContract.js`.
- `index.html` imports `ephemerisEngine` from `./src/core/ephemerisEngine.js`.
- `index.html` imports `appState` from `./src/core/appState.js`.
- `index.html` listens to `appState` events (`cycleChanged`, `hourChanged`, `scenariosUpdated`, `playStateChanged`, `speedChanged`, `siteChanged`, `arrayTypeChanged`).
- Canvas renderers receive valid `cycleData` and `currentHour` and render telemetry graphics.

## Code Layout
- `src/core/`:
  - `ephemerisEngine.js`: Core topocentric mathematical ephemeris engine.
  - `interfaceContract.js`: Schemas, runtime guards, and canonical test fixtures.
  - `appState.js`: EventTarget-based reactive state store and scenario comparator.
- `index.html`: Browser-native mission control application shell.
- `tests/`: Automated unit and E2E verification test suites executed via native Node v22 (`ELECTRON_RUN_AS_NODE=1`).
- Clean Teammate Stubs (Read-Only):
  - `src/data/landingSites.js`, `src/data/horizonMasks.js`, `src/data/nasaDeepLinks.js`
  - `src/ui/polarMapRenderer.js`, `src/ui/skyplotRenderer.js`, `src/ui/timelineRenderer.js`, `src/ui/styles.css`
  - `docs/csa_mission_context.md`, `docs/educator_tips.js`, `docs/submission_form_answers.md`, `docs/demo_deck/`
