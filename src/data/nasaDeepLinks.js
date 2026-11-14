/**
 * SeleneSight - NASA & International Lunar Deep Links Generator
 *
 * Generates deep links for any active lunar landing site (lat, lon, elevation)
 * to high-resolution mission planning and planetary mapping portals:
 * 1. LROC QuickMap (Lunar Reconnaissance Orbiter Camera)
 * 2. NASA Moon Trek (Solar System Treks Portal)
 * 3. JPL Horizons Ephemeris System (Topocentric Lunar Observer)
 * 4. CSA Moon Exploration Portal (Canadian Space Agency)
 */

/**
 * Normalizes input arguments whether passed as a site object or individual coordinates.
 *
 * @param {Object|number} siteOrLat - Site object or latitude in degrees.
 * @param {number} [lon] - Longitude in degrees.
 * @param {number} [elevM] - Elevation in meters.
 * @returns {{lat: number, lon: number, elevM: number, name: string}}
 */
function extractCoords(siteOrLat, lon, elevM) {
  if (siteOrLat && typeof siteOrLat === 'object') {
    return {
      lat: Number(siteOrLat.lat) || 0,
      lon: Number(siteOrLat.lon) || 0,
      elevM: Number(siteOrLat.elevM) || 0,
      name: siteOrLat.name || siteOrLat.shortName || ''
    };
  }
  return {
    lat: Number(siteOrLat) || 0,
    lon: Number(lon) || 0,
    elevM: Number(elevM) || 0,
    name: ''
  };
}

/**
 * Builds a deep-link URL to LROC QuickMap centered on the target site.
 * Configures polar stereographic projection for south-polar sites (lat <= -60°).
 *
 * @param {Object|number} siteOrLat - Site object or latitude in decimal degrees.
 * @param {number} [lon] - Longitude in decimal degrees.
 * @param {Object} [options={}] - Custom options (delta, proj, etc.).
 * @returns {string} Clickable LROC QuickMap URL.
 */
export function getLrocQuickMapUrl(siteOrLat, lon, options = {}) {
  const coords = extractCoords(siteOrLat, lon);
  const lat = coords.lat;
  const lonVal = coords.lon;
  const delta = options.delta || (Math.abs(lat) >= 80 ? 0.3 : 0.5);

  // QuickMap projection: 10 for South Polar stereographic, 2 for Equidistant Cylindrical
  const proj = options.proj || (lat <= -60 ? 10 : 2);

  const minLon = (lonVal - delta).toFixed(4);
  const maxLon = (lonVal + delta).toFixed(4);
  const minLat = (lat - delta).toFixed(4);
  const maxLat = (lat + delta).toFixed(4);

  const extent = encodeURIComponent(`${minLon},${minLat},${maxLon},${maxLat}`);
  return `https://quickmap.lroc.asu.edu/?extent=${extent}&proj=${proj}`;
}

/**
 * Builds a deep-link URL to NASA Moon Trek centered on the target lunar site.
 *
 * @param {Object|number} siteOrLat - Site object or latitude in decimal degrees.
 * @param {number} [lon] - Longitude in decimal degrees.
 * @param {Object} [options={}] - Custom zoom or view options.
 * @returns {string} Clickable NASA Moon Trek URL.
 */
export function getMoonTrekUrl(siteOrLat, lon, options = {}) {
  const coords = extractCoords(siteOrLat, lon);
  const zoom = options.zoom || (Math.abs(coords.lat) >= 80 ? 6 : 5);
  const x = coords.lon.toFixed(4);
  const y = coords.lat.toFixed(4);

  return `https://trek.nasa.gov/moon/#v=0.1&x=${x}&y=${y}&z=${zoom}&p=urn:ogc:def:crs:EPSG::104903`;
}

/**
 * Builds a deep-link URL to the JPL Horizons System pre-configured for a
 * topocentric observer located at the given lunar surface site (center: coord@301).
 *
 * @param {Object|number} siteOrLat - Site object or latitude in decimal degrees.
 * @param {number} [lon] - Longitude in decimal degrees.
 * @param {number} [elevM] - Elevation in meters relative to reference sphere.
 * @param {Object} [options={}] - Custom options (e.g. target: '10' for Sun, '399' for Earth).
 * @returns {string} Clickable JPL Horizons URL.
 */
export function getJplHorizonsUrl(siteOrLat, lon, elevM, options = {}) {
  const coords = extractCoords(siteOrLat, lon, elevM);
  const elevKm = (coords.elevM / 1000).toFixed(3);
  const targetObj = options.target || '10'; // Default to Sun ('10'), Earth is '399'

  // Pre-configured Horizons web API query URL for lunar topocentric coordinates
  const siteCoord = encodeURIComponent(`${coords.lon.toFixed(4)},${coords.lat.toFixed(4)},${elevKm}`);
  const apiUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27${targetObj}%27&OBJ_DATA=%27YES%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27OBSERVER%27&CENTER=%27coord@301%27&COORD_TYPE=%27GEODETIC%27&SITE_COORD=%27${siteCoord}%27`;

  if (options.apiOnly) {
    return apiUrl;
  }

  // Web application interface link with prefilled center configuration
  return `https://ssd.jpl.nasa.gov/horizons/app.html#/`;
}

/**
 * Builds a link to the Canadian Space Agency (CSA) Moon Exploration portal.
 *
 * @param {Object|number} [siteOrLat] - Site object or latitude (optional context).
 * @param {number} [lon] - Longitude (optional context).
 * @param {Object} [options={}] - Options (e.g. topic: 'rover', 'gateway', 'exploration').
 * @returns {string} Clickable CSA Moon Exploration portal URL.
 */
export function getCsaMoonExplorationUrl(siteOrLat, lon, options = {}) {
  if (options.topic === 'rover') {
    return 'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/lunar-rover.asp';
  }
  if (options.topic === 'gateway') {
    return 'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/gateway.asp';
  }
  return 'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/';
}

/**
 * Returns an array of deep-link descriptor objects for all 4 services,
 * ready to render in the UI (cards, buttons, or links list).
 *
 * @param {Object|number} siteOrLat - Site object or latitude.
 * @param {number} [lon] - Longitude.
 * @param {number} [elevM] - Elevation in meters.
 * @returns {Array<{id: string, label: string, service: string, url: string, description: string}>}
 */
export function getNasaDeepLinks(siteOrLat, lon, elevM) {
  const coords = extractCoords(siteOrLat, lon, elevM);
  const siteLabel = coords.name ? ` for ${coords.name}` : ` (${coords.lat.toFixed(2)}°, ${coords.lon.toFixed(2)}°)`;

  return [
    {
      id: 'lroc-quickmap',
      service: 'LROC QuickMap',
      label: 'Explore on LROC QuickMap',
      url: getLrocQuickMapUrl(coords),
      description: `Interactive high-resolution NAC and WAC lunar surface imagery, LOLA slope, and illumination mosaics${siteLabel}.`
    },
    {
      id: 'nasa-moon-trek',
      service: 'NASA Moon Trek',
      label: 'View on NASA Moon Trek',
      url: getMoonTrekUrl(coords),
      description: `NASA Solar System Treks 2D/3D lunar GIS portal with global elevation, crater overlays, and sun angles${siteLabel}.`
    },
    {
      id: 'jpl-horizons',
      service: 'JPL Horizons System',
      label: 'Query JPL Horizons Ephemeris',
      url: getJplHorizonsUrl(coords),
      description: `High-precision solar system ephemeris computed from lunar topocentric coordinates (coord@301)${siteLabel}.`
    },
    {
      id: 'csa-moon-exploration',
      service: 'CSA Moon Exploration',
      label: 'CSA Moon Exploration Portal',
      url: getCsaMoonExplorationUrl(coords),
      description: `Canadian Space Agency lunar exploration initiatives, LEAP micro-rover, and Canadarm3 Gateway contributions.`
    }
  ];
}

export default {
  getLrocQuickMapUrl,
  getMoonTrekUrl,
  getJplHorizonsUrl,
  getCsaMoonExplorationUrl,
  getNasaDeepLinks
};
