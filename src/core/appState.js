/**
 * @fileoverview Application state store and scenario trade-off comparator.
 * Extends EventTarget to support decoupled reactive UI bindings.
 *
 * Adheres to Google JavaScript Style Guide.
 * Pure ECMAScript 2022 module with zero runtime dependencies.
 */

import { ephemerisEngine } from './ephemerisEngine.js';
import { InterfaceContract } from './interfaceContract.js';

/**
 * Reactive state store managing active landing site, mission epoch,
 * timeline scrubber playback, scenario comparison, and data exports.
 */
export class AppStateStore extends EventTarget {
  constructor() {
    super();

    /** @type {!Array<!Object>} Registered landing site profiles. */
    this.sites = [];

    /** @type {?Object} Currently active landing site profile. */
    this.activeSite = null;

    /** @type {number} Current hour offset into synodic cycle [0, 708]. */
    this.currentHour = 0;

    /** @type {string} Mission epoch calendar date (YYYY-MM-DD). */
    this.epochDateStr = '2026-11-14';

    /** @type {string} Solar array mounting geometry. */
    this.arrayType = 'vertical_mast';

    /** @type {string} Active visualizer projection mode. */
    this.viewMode = 'polar';

    /** @type {string} Currently active navigation view tab. */
    this.activeTab = 'telemetry';

    /** @type {boolean} Timeline animation playback state. */
    this.isPlaying = false;

    /** @type {number} Playback speed multiplier (1, 3, or 6). */
    this.playSpeed = 1;

    /** @type {?Object} Full 709-hour ephemeris calculation results. */
    this.cycleData = null;

    /** @type {!{siteId: ?string, date: string, cycleData: ?Object}} Scenario A comparator state. */
    this.scenarioA = { siteId: null, date: '2026-11-14', cycleData: null };

    /** @type {!{siteId: ?string, date: string, cycleData: ?Object}} Scenario B comparator state. */
    this.scenarioB = { siteId: null, date: '2026-11-14', cycleData: null };

    /** @private {?number} Interval timer handle for playback loop. */
    this.playbackTimer_ = null;
  }

  /**
   * Initializes the store with a list of landing sites.
   * Falls back to canonical test fixtures if the supplied list is empty.
   * @param {?Array<!Object>} sitesList Candidate landing sites array.
   */
  init(sitesList) {
    const validSites = (Array.isArray(sitesList) ? sitesList : []).filter(s => InterfaceContract.validateSite(s));

    if (validSites.length === 0) {
      this.sites = InterfaceContract.getMockSites();
    } else {
      this.sites = validSites;
    }

    this.activeSite = this.sites[0];
    this.recomputeCycle();

    if (this.sites.length > 1) {
      this.scenarioA.siteId = this.sites[0].id;
      this.scenarioB.siteId = this.sites[1].id;
      this.recomputeScenarios();
    }
  }

  /**
   * Recomputes the full synodic cycle for the active site and dispatches update event.
   */
  recomputeCycle() {
    if (!this.activeSite) {
      return;
    }

    this.cycleData = ephemerisEngine.computeFullCycle(
      this.activeSite,
      this.epochDateStr,
      this.arrayType
    );

    this.dispatchEvent(new CustomEvent('cycleChanged', {
      detail: { cycleData: this.cycleData },
    }));
  }

  /**
   * Selects an active landing site by identifier.
   * @param {string} siteId Target site identifier string.
   */
  setActiveSite(siteId) {
    const target = this.sites.find(s => s.id === siteId);
    if (!target || target === this.activeSite) {
      return;
    }

    this.activeSite = target;
    this.recomputeCycle();

    this.dispatchEvent(new CustomEvent('siteChanged', {
      detail: { activeSite: this.activeSite },
    }));
  }

  /**
   * Convenience alias for setActiveSite to select active landing site.
   * @param {string} siteId Target site identifier string.
   */
  selectSite(siteId) {
    this.setActiveSite(siteId);
  }

  /**
   * Updates the current timeline hour offset.
   * @param {number} hour Target hour [0, 708].
   */
  setHour(hour) {
    const parsed = Number(hour);
    const num = Number.isFinite(parsed) ? parsed : 0;
    const clamped = Math.max(0, Math.min(708, Math.round(num)));
    if (clamped === this.currentHour) {
      return;
    }

    this.currentHour = clamped;
    this.dispatchEvent(new CustomEvent('hourChanged', {
      detail: { currentHour: this.currentHour },
    }));
  }

  /**
   * Convenience alias for setHour to update simulation timeline offset.
   * @param {number} hour Target hour [0, 708].
   */
  setTimeIndex(hour) {
    this.setHour(hour);
  }

  /**
   * Updates the mission epoch date string.
   * @param {string} dateStr Calendar date string (YYYY-MM-DD).
   */
  setEpochDate(dateStr) {
    if (!dateStr || dateStr === this.epochDateStr) {
      return;
    }

    this.epochDateStr = dateStr;
    this.recomputeCycle();

    this.dispatchEvent(new CustomEvent('epochDateChanged', {
      detail: { epochDateStr: this.epochDateStr },
    }));
  }

  /**
   * Selects solar array mounting geometry.
   * @param {string} type Array configuration type.
   */
  setArrayType(type) {
    if (type === this.arrayType) {
      return;
    }

    this.arrayType = type;
    this.recomputeCycle();
    this.recomputeScenarios();

    this.dispatchEvent(new CustomEvent('arrayTypeChanged', {
      detail: { arrayType: this.arrayType },
    }));
  }

  /**
   * Convenience alias for setArrayType to select solar array mounting geometry.
   * @param {string} type Array configuration type.
   */
  selectArrayType(type) {
    this.setArrayType(type);
  }

  /**
   * Toggles projection view mode (polar or linear).
   * @param {string} mode Projection view mode name.
   */
  setViewMode(mode) {
    if (mode === this.viewMode) {
      return;
    }

    this.viewMode = mode;
    this.dispatchEvent(new CustomEvent('viewModeChanged', {
      detail: { viewMode: this.viewMode },
    }));
  }

  /**
   * Updates active navigation view tab.
   * @param {string} tabName Target tab name.
   */
  setActiveTab(tabName) {
    if (tabName === this.activeTab) {
      return;
    }

    this.activeTab = tabName;
    this.dispatchEvent(new CustomEvent('tabChanged', {
      detail: { activeTab: this.activeTab },
    }));
  }

  /**
   * Toggles timeline animation playback.
   */
  togglePlay() {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.startPlayback_();
    } else {
      this.stopPlayback_();
    }

    this.dispatchEvent(new CustomEvent('playStateChanged', {
      detail: { isPlaying: this.isPlaying },
    }));
  }

  /**
   * Begins timeline animation playback if not already playing.
   */
  play() {
    if (!this.isPlaying) {
      this.togglePlay();
    }
  }

  /**
   * Halts timeline animation playback if currently playing.
   */
  pause() {
    if (this.isPlaying) {
      this.togglePlay();
    }
  }

  /**
   * Sets timeline animation playback speed multiplier.
   * @param {number} speed Speed multiplier (1, 3, or 6).
   */
  setPlaySpeed(speed) {
    this.playSpeed = speed;

    if (this.isPlaying) {
      this.stopPlayback_();
      this.startPlayback_();
    }

    this.dispatchEvent(new CustomEvent('speedChanged', {
      detail: { playSpeed: this.playSpeed },
    }));
  }

  /**
   * Convenience alias for setPlaySpeed to set playback rate multiplier.
   * @param {number} speed Speed multiplier (1, 3, or 6).
   */
  setPlaybackSpeed(speed) {
    this.setPlaySpeed(speed);
  }

  /**
   * Starts the internal animation interval timer.
   * @private
   */
  startPlayback_() {
    const speed = (Number.isFinite(this.playSpeed) && this.playSpeed > 0) ? this.playSpeed : 1;
    const intervalMs = Math.max(30, Math.round(100 / speed));
    this.playbackTimer_ = setInterval(() => {
      let nextHour = this.currentHour + 1;
      if (nextHour > 708) {
        nextHour = 0;
      }
      this.setHour(nextHour);
    }, intervalMs);
  }

  /**
   * Stops the internal animation interval timer.
   * @private
   */
  stopPlayback_() {
    if (this.playbackTimer_) {
      clearInterval(this.playbackTimer_);
      this.playbackTimer_ = null;
    }
  }

  /**
   * Updates site assignment for scenario A or B.
   * @param {'A'|'B'} scenario Scenario slot.
   * @param {string} siteId Target site identifier.
   */
  setScenarioSite(scenario, siteId) {
    if (scenario === 'A') {
      this.scenarioA.siteId = siteId;
    } else {
      this.scenarioB.siteId = siteId;
    }
    this.recomputeScenarios();
  }

  /**
   * Convenience alias to select landing site for Scenario A.
   * @param {string} siteId Target site identifier string.
   */
  selectSiteA(siteId) {
    this.setScenarioSite('A', siteId);
  }

  /**
   * Convenience alias to select landing site for Scenario B.
   * @param {string} siteId Target site identifier string.
   */
  selectSiteB(siteId) {
    this.setScenarioSite('B', siteId);
  }

  /**
   * Recomputes ephemeris trajectories for both comparison scenarios and calculates delta.
   */
  recomputeScenarios() {
    const siteA = this.sites.find(s => s.id === this.scenarioA.siteId);
    const siteB = this.sites.find(s => s.id === this.scenarioB.siteId);

    if (siteA) {
      this.scenarioA.cycleData = ephemerisEngine.computeFullCycle(
        siteA,
        this.scenarioA.date,
        this.arrayType
      );
    }

    if (siteB) {
      this.scenarioB.cycleData = ephemerisEngine.computeFullCycle(
        siteB,
        this.scenarioB.date,
        this.arrayType
      );
    }

    this.dispatchEvent(new CustomEvent('scenariosUpdated', {
      detail: {
        a: this.scenarioA,
        b: this.scenarioB,
        delta: this.computeScenarioDelta(),
      },
    }));
  }

  /**
   * Calculates differential trade-off metrics (Scenario B minus Scenario A).
   * @return {?Object} Calculated delta values.
   */
  computeScenarioDelta() {
    const a = this.scenarioA.cycleData;
    const b = this.scenarioB.cycleData;

    if (!a || !b) {
      return null;
    }

    const siteA = this.sites.find(s => s.id === this.scenarioA.siteId);
    const siteB = this.sites.find(s => s.id === this.scenarioB.siteId);

    const rawSlopeDelta = Math.round(((siteB ? siteB.slopeDeg : 0) - (siteA ? siteA.slopeDeg : 0)) * 10.0) / 10.0;
    const normalizedSlopeDelta = rawSlopeDelta === 0 ? 0 : rawSlopeDelta;

    return {
      sunlitHoursDelta: b.sunlitHours - a.sunlitHours,
      dteHoursDelta: b.dteHours - a.dteHours,
      dualHoursDelta: b.dualHours - a.dualHours,
      viabilityScoreDelta: b.viabilityScore - a.viabilityScore,
      elevMDelta: (siteB ? siteB.elevM : 0) - (siteA ? siteA.elevM : 0),
      slopeDelta: normalizedSlopeDelta,
    };
  }

  /**
   * Formats the active cycle ephemeris dataset as CSV.
   * Compatible with NASA JPL Horizons tabulation schemas.
   * @return {string} CSV formatted data string.
   */
  exportToCSV() {
    if (!this.cycleData || !this.cycleData.steps) {
      return '';
    }

    const headers = [
      'Hour_Offset', 'Sun_Az_Deg', 'Sun_El_Deg', 'Sun_Mask_Deg', 'Is_Sunlit',
      'Earth_Az_Deg', 'Earth_El_Deg', 'Earth_Mask_Deg', 'Is_DTE',
      'Lib_Lat_Deg', 'Lib_Lon_Deg', 'Array_Eff_Pct', 'Solar_Flux_Wm2',
    ];

    const rows = this.cycleData.steps.map(s => [
      s.hourOffset, s.sunAzDeg, s.sunElDeg, s.sunHorizonMaskDeg, s.isSunlit ? 1 : 0,
      s.earthAzDeg, s.earthElDeg, s.earthHorizonMaskDeg, s.isEarthVisible ? 1 : 0,
      s.libLatDeg, s.libLonDeg, s.arrayEfficiency, s.solarFluxWm2,
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Formats the active cycle ephemeris dataset as serialized JSON.
   * @return {string} Pretty-printed JSON string.
   */
  exportToJSON() {
    return JSON.stringify(this.cycleData, null, 2);
  }
}

/**
 * Singleton instance of the application state store.
 * @const {!AppStateStore}
 */
export const appState = new AppStateStore();
