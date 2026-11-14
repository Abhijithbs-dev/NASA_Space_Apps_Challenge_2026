/**
 * SeleneSight - Lunar Horizon Masks & Topographic Occlusion Evaluator
 *
 * Implements terrain horizon angle interpolation and lunar vacuum horizon
 * calculations for evaluating solar power generation and Direct-to-Earth (DTE)
 * communications visibility.
 */

// Mean volumetric radius of the Moon in meters (IAU / LOLA datum)
export const LUNAR_MEAN_RADIUS_M = 1737400;

// The Moon is in a hard vacuum; zero atmospheric refraction applies
export const LUNAR_ATMOSPHERIC_REFRACTION_DEG = 0.0;

// Standard reference height for lander mast / solar panel / astronaut in meters
export const DEFAULT_OBSERVER_HEIGHT_M = 2.0;

/**
 * Calculates the geometric horizon dip angle below the local astronomical
 * horizontal tangent plane for a spherical Moon in vacuum.
 *
 * theta_dip = acos(R / (R + h)) in radians, converted to degrees.
 *
 * @param {number} [observerHeightM=DEFAULT_OBSERVER_HEIGHT_M] - Observer/instrument height above surface in meters.
 * @returns {number} Geometric horizon dip angle in degrees (positive magnitude).
 */
export function calculateLunarHorizonDip(observerHeightM = DEFAULT_OBSERVER_HEIGHT_M) {
  const h = Math.max(0, Number(observerHeightM) || 0);
  const r = LUNAR_MEAN_RADIUS_M;
  const dipRad = Math.acos(r / (r + h));
  return (dipRad * 180) / Math.PI;
}

/**
 * Interpolates the 12-sector horizonProfile across any azimuth angle (0° to 360°)
 * and determines the effective terrain horizon elevation angle above the local tangent plane.
 *
 * Accounts for:
 * 1. Continuous cyclic interpolation between 30° sectors of the 12-point profile.
 * 2. Smooth wrapping across the 360° / 0° azimuth boundary.
 * 3. Zero atmospheric refraction on the Moon (vacuum condition).
 * 4. Geometric lunar sphere dip allowance (horizon cannot dip below the spherical vacuum horizon).
 *
 * @param {Object|Array<number>} site - Landing site object containing `horizonProfile` or the profile array itself.
 * @param {number} azimuthDeg - Azimuth angle in degrees (0° = North, 90° = East, 180° = South, 270° = West).
 * @param {number} [observerHeightM=DEFAULT_OBSERVER_HEIGHT_M] - Height of observer/sensor in meters.
 * @returns {number} Horizon elevation angle in degrees relative to the local horizontal plane.
 */
export function getTerrainHorizonAngle(site, azimuthDeg, observerHeightM = DEFAULT_OBSERVER_HEIGHT_M) {
  const profile = Array.isArray(site)
    ? site
    : Array.isArray(site?.horizonProfile)
      ? site.horizonProfile
      : null;

  // Geometric lunar vacuum horizon dip (negative elevation below tangent plane)
  const dipDeg = calculateLunarHorizonDip(observerHeightM);
  const sphericalVacuumHorizon = -dipDeg;

  if (!profile || profile.length === 0) {
    return sphericalVacuumHorizon + LUNAR_ATMOSPHERIC_REFRACTION_DEG;
  }

  // Normalize azimuth to [0, 360)
  let az = Number(azimuthDeg);
  if (isNaN(az)) {
    az = 0;
  }
  az = ((az % 360) + 360) % 360;

  const numSectors = profile.length;
  const sectorStep = 360 / numSectors; // e.g. 30° for 12 sectors

  // Sector indices and linear interpolation fraction
  const sectorIndex = Math.floor(az / sectorStep);
  const nextSectorIndex = (sectorIndex + 1) % numSectors;
  const fraction = (az - sectorIndex * sectorStep) / sectorStep;

  const elev1 = Number(profile[sectorIndex]) || 0;
  const elev2 = Number(profile[nextSectorIndex]) || 0;

  // Interpolated crater wall / terrain elevation angle
  const interpolatedTerrainAngle = elev1 + fraction * (elev2 - elev1);

  // The effective horizon is the higher of local terrain features and the spherical lunar dip.
  // With zero atmospheric refraction on the Moon, no atmospheric bending occurs.
  const effectiveHorizon = Math.max(interpolatedTerrainAngle, sphericalVacuumHorizon) + LUNAR_ATMOSPHERIC_REFRACTION_DEG;

  return effectiveHorizon;
}

/**
 * Checks whether a celestial object (e.g. Sun, Earth) at a given azimuth and elevation
 * is occluded by local terrain or the lunar horizon.
 *
 * @param {Object|Array<number>} site - Landing site object or horizonProfile array.
 * @param {number} azimuthDeg - Azimuth angle of the target in degrees.
 * @param {number} targetElevationDeg - Elevation angle of the target in degrees.
 * @param {number} [observerHeightM=DEFAULT_OBSERVER_HEIGHT_M] - Height of observer/sensor in meters.
 * @returns {boolean} True if the target is occluded (below the horizon mask), false if visible.
 */
export function isTargetOccluded(site, azimuthDeg, targetElevationDeg, observerHeightM = DEFAULT_OBSERVER_HEIGHT_M) {
  const horizonAngle = getTerrainHorizonAngle(site, azimuthDeg, observerHeightM);
  return Number(targetElevationDeg) < horizonAngle;
}

/**
 * Generates a full 360° high-resolution horizon mask curve for charting or 3D terrain rendering.
 *
 * @param {Object|Array<number>} site - Landing site object or horizonProfile array.
 * @param {number} [stepDeg=1] - Azimuth step in degrees (default 1°).
 * @param {number} [observerHeightM=DEFAULT_OBSERVER_HEIGHT_M] - Height of observer/sensor in meters.
 * @returns {Array<{azimuth: number, horizonAngle: number}>} Array of azimuth-elevation pairs.
 */
export function getHorizonMaskProfile(site, stepDeg = 1, observerHeightM = DEFAULT_OBSERVER_HEIGHT_M) {
  const step = Math.max(0.1, Number(stepDeg) || 1);
  const points = [];
  for (let az = 0; az < 360; az += step) {
    points.push({
      azimuth: az,
      horizonAngle: getTerrainHorizonAngle(site, az, observerHeightM)
    });
  }
  return points;
}

export default {
  LUNAR_MEAN_RADIUS_M,
  LUNAR_ATMOSPHERIC_REFRACTION_DEG,
  DEFAULT_OBSERVER_HEIGHT_M,
  calculateLunarHorizonDip,
  getTerrainHorizonAngle,
  isTargetOccluded,
  getHorizonMaskProfile
};
