/**
 * @fileoverview Topocentric lunar ephemeris calculation engine.
 * Computes solar and terrestrial vectors, optical librations, terrain mask
 * clearance, and photovoltaic conversion efficiency from lunar surface positions.
 *
 * Adheres to Google JavaScript Style Guide.
 * Pure ECMAScript 2022 module with zero runtime dependencies.
 */

/**
 * Mean lunar radius in kilometers.
 * @const {number}
 */
const LUNAR_RADIUS_KM = 1737.4;

/**
 * Lunar rotational axis obliquity relative to ecliptic normal in degrees.
 * @const {number}
 */
const LUNAR_OBLIQUITY_DEG = 1.5424;

/**
 * Mean lunar synodic month duration in decimal hours (29.53059 days).
 * @const {number}
 */
const SYNODIC_MONTH_HOURS = 708.73414;

/**
 * Mean solar irradiance at 1 AU in Watts per square meter.
 * @const {number}
 */
const SOLAR_CONSTANT_WM2 = 1361.0;

/**
 * Conversion factor: degrees to radians.
 * @const {number}
 */
const DEG_TO_RAD = Math.PI / 180.0;

/**
 * Conversion factor: radians to degrees.
 * @const {number}
 */
const RAD_TO_DEG = 180.0 / Math.PI;

/**
 * Topocentric ephemeris engine for lunar surface coordinates.
 */
export class EphemerisEngine {
  constructor() {
    this.lunarRadiusKm = LUNAR_RADIUS_KM;
    this.obliquityDeg = LUNAR_OBLIQUITY_DEG;
    this.synodicHours = SYNODIC_MONTH_HOURS;
    this.solarConstant = SOLAR_CONSTANT_WM2;
  }

  /**
   * Converts a standard ISO date string (YYYY-MM-DD) to Julian Date.
   * Uses standard Meeus astronomical algorithm.
   * @param {string} dateStr Calendar date string.
   * @return {number} Julian Date at 00:00:00 UTC.
   */
  dateToJulianDate(dateStr) {
    const parts = dateStr.split('-').map(Number);
    let year = parts[0];
    let month = parts[1];
    const day = parts[2];

    if (month <= 2) {
      year -= 1;
      month += 12;
    }

    const a = Math.floor(year / 100);
    const b = 2 - a + Math.floor(a / 4);

    return Math.floor(365.25 * (year + 4716)) +
           Math.floor(30.6001 * (month + 1)) +
           day + b - 1524.5;
  }

  /**
   * Calculates Julian centuries elapsed since J2000.0 epoch.
   * @param {string} dateStr Calendar date string (YYYY-MM-DD).
   * @param {number=} hourOffset Additional elapsed hours.
   * @return {number} Elapsed centuries T since J2000.0.
   */
  centuriesSinceJ2000(dateStr, hourOffset = 0) {
    const jd = this.dateToJulianDate(dateStr) + (hourOffset / 24.0);
    return (jd - 2451545.0) / 36525.0;
  }

  /**
   * Performs continuous linear interpolation on a 12-sector (30-degree bins)
   * crater-rim horizon profile at an arbitrary azimuth.
   * @param {!Array<number>} profile 12-element horizon elevation array.
   * @param {number} azimuthDeg Target topocentric azimuth in degrees [0, 360).
   * @return {number} Interpolated terrain elevation threshold in degrees.
   */
  interpolateHorizon(profile, azimuthDeg) {
    if (!profile || profile.length !== 12) {
      return 0.0;
    }

    const normAz = ((azimuthDeg % 360.0) + 360.0) % 360.0;
    const sectorFloat = normAz / 30.0;
    const idx1 = Math.floor(sectorFloat) % 12;
    const idx2 = (idx1 + 1) % 12;
    const fraction = sectorFloat - Math.floor(sectorFloat);

    const interpolated = profile[idx1] * (1.0 - fraction) + profile[idx2] * fraction;
    return Math.round(interpolated * 100.0) / 100.0;
  }

  /**
   * Computes topocentric azimuth and elevation angles for an observer located
   * on the lunar surface targeting an extraterrestrial object vector.
   * @param {number} siteLat Observer latitude in degrees [-90, +90].
   * @param {number} siteLon Observer longitude in degrees [-180, +180].
   * @param {number} siteElevM Observer elevation in meters above mean sphere.
   * @param {number} targetLat Sub-target latitude in degrees.
   * @param {number} targetLon Sub-target longitude in degrees.
   * @return {!{azDeg: number, elevDeg: number}} Topocentric coordinates.
   */
  calculateTopocentric(siteLat, siteLon, siteElevM, targetLat, targetLon) {
    const phiSite = siteLat * DEG_TO_RAD;
    const lamSite = siteLon * DEG_TO_RAD;
    const phiTgt = targetLat * DEG_TO_RAD;
    const lamTgt = targetLon * DEG_TO_RAD;

    const deltaLam = lamTgt - lamSite;

    // Great-circle angular distance on mean lunar sphere
    const cosDist = Math.sin(phiSite) * Math.sin(phiTgt) +
                    Math.cos(phiSite) * Math.cos(phiTgt) * Math.cos(deltaLam);
    const distRad = Math.acos(Math.max(-1.0, Math.min(1.0, cosDist)));

    // Geometric elevation relative to local horizontal plane
    let elevDeg = 90.0 - (distRad * RAD_TO_DEG);

    // Observer elevation dip allowance over sphere
    if (siteElevM > 0) {
      const dipAllowanceRad = Math.sqrt((2.0 * (siteElevM / 1000.0)) / this.lunarRadiusKm);
      elevDeg += dipAllowanceRad * RAD_TO_DEG;
    }

    // Topocentric Azimuth (clockwise from north meridian)
    const y = Math.sin(deltaLam) * Math.cos(phiTgt);
    const x = Math.cos(phiSite) * Math.sin(phiTgt) -
              Math.sin(phiSite) * Math.cos(phiTgt) * Math.cos(deltaLam);

    let azDeg = Math.atan2(y, x) * RAD_TO_DEG;
    azDeg = ((azDeg % 360.0) + 360.0) % 360.0;
    azDeg = (Math.round(azDeg * 10.0) / 10.0) % 360.0;

    return {
      azDeg,
      elevDeg: Math.round(elevDeg * 100.0) / 100.0,
    };
  }

  /**
   * Calculates solar array geometric conversion efficiency based on array type.
   * @param {number} sunElevDeg Sun elevation angle in degrees.
   * @param {string} arrayType Array configuration name.
   * @return {number} Percentage efficiency [0.0, 100.0].
   */
  computeArrayEfficiency(sunElevDeg, arrayType = 'vertical_mast') {
    if (sunElevDeg <= 0) {
      return 0.0;
    }

    const elevRad = sunElevDeg * DEG_TO_RAD;

    switch (arrayType) {
      case 'vertical_mast':
        // Optimal for low polar grazing sunlight (cos(elevation))
        return Math.max(0.0, Math.cos(elevRad)) * 100.0;
      case 'sun_tracking':
        // Dual-axis normal tracking
        return 100.0;
      case 'horizontal_deck':
        // Planar horizontal deck (sin(elevation))
        return Math.max(0.0, Math.sin(elevRad)) * 100.0;
      default:
        return Math.max(0.0, Math.cos(elevRad)) * 100.0;
    }
  }

  /**
   * Evaluates the complete 709-hour synodic lunar cycle for a candidate landing site.
   * @param {!Object} site Landing site descriptor object.
   * @param {string=} epochDateStr Mission epoch date string (YYYY-MM-DD).
   * @param {string=} arrayType Solar array configuration type.
   * @return {!Object} Full-cycle calculated trajectory dataset and metrics.
   */
  computeFullCycle(site, epochDateStr = '2026-11-14', arrayType = 'vertical_mast') {
    const steps = new Array(709);
    let sunlitHours = 0;
    let dteHours = 0;
    let dualHours = 0;
    let totalEfficiency = 0.0;

    const baseSunLon = 180.0;
    const synodicRatePerHour = 360.0 / this.synodicHours;

    // Libration cycles: draconic (653.09h) and anomalistic (661.31h)
    const draconicPeriodHours = 653.093;
    const anomalisticPeriodHours = 661.309;

    const effectiveEpoch = (typeof epochDateStr === 'string' && epochDateStr.trim())
      ? epochDateStr.trim()
      : '2026-11-14';
    let baseJd = this.dateToJulianDate(effectiveEpoch);
    if (Number.isNaN(baseJd)) {
      baseJd = this.dateToJulianDate('2026-11-14');
    }

    for (let h = 0; h <= 708; h++) {
      // Sub-solar selenographic coordinates
      const sunLon = ((baseSunLon + (h * synodicRatePerHour)) % 360.0 + 360.0) % 360.0;
      const jd = baseJd + (h / 24.0);
      const sunLat = -this.obliquityDeg * Math.sin((2.0 * Math.PI * (jd - 2451545.0)) / 365.25);

      // Sub-Earth selenographic coordinates including optical librations
      const earthLat = 6.68 * Math.sin((h / draconicPeriodHours) * 2.0 * Math.PI);
      const earthLon = 7.90 * Math.sin((h / anomalisticPeriodHours) * 2.0 * Math.PI);

      // Topocentric observer vectors
      const sunTopo = this.calculateTopocentric(site.lat, site.lon, site.elevM, sunLat, sunLon);
      const earthTopo = this.calculateTopocentric(site.lat, site.lon, site.elevM, earthLat, earthLon);

      // LOLA crater-rim horizon mask clearance
      const sunMask = this.interpolateHorizon(site.horizonProfile, sunTopo.azDeg);
      const earthMask = this.interpolateHorizon(site.horizonProfile, earthTopo.azDeg);

      const isSunlit = sunTopo.elevDeg > sunMask;
      const isEarthVisible = earthTopo.elevDeg > earthMask;

      if (isSunlit) sunlitHours++;
      if (isEarthVisible) dteHours++;
      if (isSunlit && isEarthVisible) dualHours++;

      const eff = isSunlit ? this.computeArrayEfficiency(sunTopo.elevDeg, arrayType) : 0.0;
      totalEfficiency += eff;
      const effRounded = Math.round(eff * 10.0) / 10.0;
      const fluxRounded = Math.round(((effRounded / 100.0) * this.solarConstant) * 10.0) / 10.0;

      steps[h] = {
        hourOffset: h,
        sunElDeg: sunTopo.elevDeg,
        sunAzDeg: sunTopo.azDeg,
        sunHorizonMaskDeg: sunMask,
        isSunlit,
        earthElDeg: earthTopo.elevDeg,
        earthAzDeg: earthTopo.azDeg,
        earthHorizonMaskDeg: earthMask,
        isEarthVisible,
        libLatDeg: Math.round(earthLat * 100.0) / 100.0,
        libLonDeg: Math.round(earthLon * 100.0) / 100.0,
        subSolarLonDeg: (Math.round(sunLon * 10.0) / 10.0) % 360.0,
        subSolarLatDeg: Math.round(sunLat * 100.0) / 100.0,
        arrayEfficiency: effRounded,
        solarFluxWm2: fluxRounded,
      };
    }

    const sunlitPct = Math.round((sunlitHours / 709.0) * 1000.0) / 10.0;
    const dtePct = Math.round((dteHours / 709.0) * 1000.0) / 10.0;
    const dualPct = Math.round((dualHours / 709.0) * 1000.0) / 10.0;
    const avgPowerEff = Math.round((totalEfficiency / 709.0) * 10.0) / 10.0;

    const slopePenalty = Math.max(0.0, 100.0 - (site.slopeDeg * 5.0));
    const viabilityScore = Math.round((sunlitPct * 0.45) + (dtePct * 0.35) + (slopePenalty * 0.20));

    return {
      site,
      epochDateStr: effectiveEpoch,
      arrayType,
      steps,
      sunlitHours,
      dteHours,
      dualHours,
      sunlitPct,
      dtePct,
      dualPct,
      avgPowerEff,
      viabilityScore,
    };
  }

  /**
   * Scans forward from current hour to locate subsequent state transitions.
   * @param {!Array<!Object>} steps Calculated hourly steps.
   * @param {number} currentHour Current hour index into trajectory steps.
   * @return {!{nextSunset: ?number, nextSunrise: ?number, nextEarthset: ?number, nextEarthrise: ?number}}
   */
  getTransitionCountdowns(steps, currentHour) {
    if (!Array.isArray(steps) || steps.length === 0 ||
        typeof currentHour !== 'number' || Number.isNaN(currentHour)) {
      return {
        nextSunset: null,
        nextSunrise: null,
        nextEarthset: null,
        nextEarthrise: null,
      };
    }

    currentHour = Math.floor(currentHour);
    if (currentHour < 0 || currentHour >= steps.length) {
      return {
        nextSunset: null,
        nextSunrise: null,
        nextEarthset: null,
        nextEarthrise: null,
      };
    }

    let nextSunset = null;
    let nextSunrise = null;
    let nextEarthset = null;
    let nextEarthrise = null;

    for (let h = currentHour + 1; h < steps.length; h++) {
      const prev = steps[h - 1];
      const curr = steps[h];
      if (!prev || !curr) {
        continue;
      }
      const delta = h - currentHour;

      if (nextSunset === null && prev.isSunlit && !curr.isSunlit) {
        nextSunset = delta;
      }
      if (nextSunrise === null && !prev.isSunlit && curr.isSunlit) {
        nextSunrise = delta;
      }
      if (nextEarthset === null && prev.isEarthVisible && !curr.isEarthVisible) {
        nextEarthset = delta;
      }
      if (nextEarthrise === null && !prev.isEarthVisible && curr.isEarthVisible) {
        nextEarthrise = delta;
      }

      if (nextSunset !== null && nextSunrise !== null &&
          nextEarthset !== null && nextEarthrise !== null) {
        break;
      }
    }

    return { nextSunset, nextSunrise, nextEarthset, nextEarthrise };
  }
}

/**
 * Singleton instance of the ephemeris calculation engine.
 * @const {!EphemerisEngine}
 */
export const ephemerisEngine = new EphemerisEngine();
