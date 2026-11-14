/**
 * @file educator_tips.js
 * @description SeleneSight — Educator Mode Science Cards
 * Curated by: Adith V S (Lead Mission Scientist & Documentation Lead)
 * 
 * Explains lunar polar environmental phenomena, orbital mechanics, and
 * robotic exploration challenges in clear, accessible language.
 * 
 * @author Adith V S (Lead Mission Scientist & Documentation Lead)
 * @project SeleneSight — Lunar South Pole Horizon, Solar Power & DTE Comm Evaluator
 * @event 2026 NASA Space Apps Challenge
 */

/**
 * @typedef {Object} EducatorTip
 * @property {string} id - Unique identifier (e.g., "lunar_axial_tilt")
 * @property {string} category - Category tag ("Orbital Mechanics" | "Thermal & Environment" | "Communications" | "Power Systems" | "CSA Robotics")
 * @property {string} title - Engaging title
 * @property {string} shortHeadline - 1-sentence teaser
 * @property {string} body - 2-3 sentence clear, scientifically accurate explanation
 * @property {string} keyFact - Highlighting a memorable metric or contrast with Earth
 * @property {string} nasaCitationUrl - URL to official NASA/CSA/scientific resource
 * @property {string} citationLabel - Display text for the citation link
 */

/**
 * Recognized categories in SeleneSight Educator Mode
 */
export const CATEGORIES = Object.freeze([
  "Orbital Mechanics",
  "Thermal & Environment",
  "Communications",
  "Power Systems",
  "CSA Robotics"
]);

/**
 * Curated list of Educator Mode science cards.
 * @type {EducatorTip[]}
 */
export const EDUCATOR_TIPS = [
  {
    id: "lunar_axial_tilt",
    category: "Orbital Mechanics",
    title: "The Skimming Sun: 1.54° Lunar Obliquity",
    shortHeadline: "Why the Sun circles the horizon like a beacon instead of rising overhead.",
    body: "Unlike Earth's 23.44° axial tilt which generates distinct seasonal changes, the Moon's rotational axis is tilted only 1.54° relative to the ecliptic. At the Lunar South Pole, the Sun never climbs high into the sky; instead, it grazes the jagged horizon in a continuous 360-degree 29.53-day circle.",
    keyFact: "Solar elevation at the South Pole rarely exceeds 1.5° above or below the flat horizon.",
    nasaCitationUrl: "https://svs.gsfc.nasa.gov/5326/",
    citationLabel: "NASA Scientific Visualization Studio — Lunar Tilt"
  },
  {
    id: "permanent_shadow_psrs",
    category: "Thermal & Environment",
    title: "Cold Traps & Water Ice: Inside the PSRs",
    shortHeadline: "Craters that have not seen sunlight in over two billion years.",
    body: "Because of the extremely low solar angle, deep impact crater floors near the poles cast permanent shadows. Known as Permanently Shadowed Regions (PSRs), these zones plunge to temperatures as frigid as 40 Kelvin (-233°C), acting as cryogenic cold traps that preserve volatile water ice vital for life support and rocket propellant.",
    keyFact: "Temperatures inside Shackleton and Faustini craters are colder than the surface of Pluto.",
    nasaCitationUrl: "https://www.nasa.gov/missions/lro/nasas-lro-finds-lunar-craters-are-colder-than-pluto/",
    citationLabel: "NASA LRO — Lunar Cryogenic Temperatures"
  },
  {
    id: "zero_atmosphere_optics",
    category: "Orbital Mechanics",
    title: "Zero Atmospheric Refraction: Knife-Edge Shadows",
    shortHeadline: "Why there is no dawn, dusk, or twilight on the lunar surface.",
    body: "On Earth, atmospheric molecules scatter blue light and bend solar rays around the horizon, providing prolonged twilight. On the Moon, the hard vacuum creates instant, binary transitions: when a crater rim blocks the Sun, local solar flux drops abruptly to zero with razor-sharp shadow boundaries.",
    keyFact: "A rover stepping from sunlight into shadow can experience an instantaneous 150°C thermal drop.",
    nasaCitationUrl: "https://moon.nasa.gov/inside-and-out/atmosphere/",
    citationLabel: "NASA Moon — The Lunar Vacuum & Exosphere"
  },
  {
    id: "optical_libration",
    category: "Communications",
    title: "The Lunar Wobble: Earth Libration",
    shortHeadline: "How a wobbling Moon causes Earth to rise and sink at the poles.",
    body: "Because the Moon's orbit is elliptical (eccentricity 0.0549) and tilted by 5.14° relative to the ecliptic, an observer on the Moon observes Earth nodding up and down by ±6.68° (draconic period) and wagging east-west by ±7.90° (anomalistic period). At polar horizons, this libration causes Earth to dip below mountain ridges, cutting off direct radio communication.",
    keyFact: "Earth traces a slow Lissajous figure-eight loop in the polar sky over 27.3 days.",
    nasaCitationUrl: "https://svs.gsfc.nasa.gov/5199/",
    citationLabel: "NASA SVS — Lunar Libration Dynamics"
  },
  {
    id: "dte_comm_occultation",
    category: "Communications",
    title: "Direct-to-Earth (DTE) Line of Sight",
    shortHeadline: "Crater rims acting as massive radio-frequency walls.",
    body: "Direct-to-Earth (DTE) communication requires an unobstructed geometric vector between the lunar surface antenna and NASA's Deep Space Network (DSN) ground stations. Even when Earth is above the theoretical spherical horizon, towering massif rims (like Malapert or Shackleton) frequently occlude direct radio signals.",
    keyFact: "A 2,000-meter crater wall 10 km away casts an elevation shadow mask of over 11 degrees.",
    nasaCitationUrl: "https://www.nasa.gov/directorates/somd/space-communications-and-navigation-scan/",
    citationLabel: "NASA SCaN — Deep Space Communications"
  },
  {
    id: "solar_array_geometry",
    category: "Power Systems",
    title: "Vertical vs. Horizontal Solar Panels",
    shortHeadline: "Why horizontal solar panels are virtually useless at the Lunar South Pole.",
    body: "Because the Sun hovers within 1.5° of the horizon, incoming solar rays hit horizontal decks at a grazing incidence, producing power proportional to sin(elevation) ≈ 0.026 (under 3% efficiency). Polar landers and rovers must deploy tall, vertical solar masts (power proportional to cos(elevation) ≈ 0.999) or 2-axis sun-tracking gimbals.",
    keyFact: "A vertical solar cylinder captures near-100% solar flux continuously as the Sun rotates 360° around it.",
    nasaCitationUrl: "https://techport.nasa.gov/view/94829",
    citationLabel: "NASA TechPort — Vertical Solar Array Technology"
  },
  {
    id: "csa_canadarm3_robotics",
    category: "CSA Robotics",
    title: "Canadian Robotics: From Canadarm to Lunar Gateway",
    shortHeadline: "Autonomous Canadian AI robotics pioneering lunar surface & orbital operations.",
    body: "The Canadian Space Agency (CSA) is contributing Canadarm3 to the NASA-led Lunar Gateway space station. Canadarm3 employs cutting-edge artificial intelligence and computer vision to perform maintenance, capture visiting spacecraft, and deploy science payloads autonomously without requiring continuous ground control.",
    keyFact: "Canadarm3 can operate independently for weeks during Gateway uncrewed periods.",
    nasaCitationUrl: "https://www.asc-csa.gc.ca/eng/canadarm3/about.asp",
    citationLabel: "Canadian Space Agency — Canadarm3 Overview"
  },
  {
    id: "csa_lunar_rover_power",
    category: "CSA Robotics",
    title: "Canadian Lunar Utility Vehicle (LUV) & Rover Power",
    shortHeadline: "Navigating extreme shadows with high-efficiency battery reserves.",
    body: "CSA's lunar rover initiatives focus on traversing rugged polar terrains and venturing into Permanently Shadowed Regions. Without direct sunlight in crater bowls, Canadian rovers must budget energy with precision, utilizing SeleneSight-style horizon analysis to time sorties and return to sunlit rims before battery depletion.",
    keyFact: "Traversing into a PSR requires surviving extreme -200°C temperatures on internal battery heaters.",
    nasaCitationUrl: "https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/canadian-utility-rover-on-the-moon.asp",
    citationLabel: "CSA — Canadian Lunar Exploration Vehicles"
  },
  {
    id: "synodic_vs_sidereal",
    category: "Orbital Mechanics",
    title: "The 708-Hour Synodic Day",
    shortHeadline: "Why one lunar day lasts almost four full Earth weeks.",
    body: "The Moon takes 27.3 Earth days to complete one rotation relative to distant stars (sidereal day). However, because the Earth-Moon system orbits the Sun simultaneously, it takes 29.53 Earth days (708.7 hours) for the Sun to return to the exact same position in the lunar sky (synodic day).",
    keyFact: "One complete day-night cycle on the Moon equals approximately 708.7 continuous hours.",
    nasaCitationUrl: "https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question32.html",
    citationLabel: "NASA StarChild — The Moon's Orbit and Phases"
  },
  {
    id: "simultaneous_window_value",
    category: "Power Systems",
    title: "The 'Golden Window': Coincident Sunlit & DTE Hours",
    shortHeadline: "The rarest and most valuable operational resource at the lunar south pole.",
    body: "Surface EVAs (spacewalks) and high-data-rate instrument transmissions require both active solar power generation AND unobstructed direct line-of-sight to Earth. SeleneSight isolates these simultaneous 'Golden Windows', enabling mission directors to plan science tasks when rovers are not draining reserves.",
    keyFact: "Peaks near Shackleton offer up to 86% annual sunlight, but simultaneous DTE drops to ~65%.",
    nasaCitationUrl: "https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/",
    citationLabel: "NASA Artemis III Candidate Regions"
  }
];

/**
 * Find a specific tip by unique ID.
 * @param {string} tipId
 * @returns {EducatorTip | undefined}
 */
export function getTipById(tipId) {
  return EDUCATOR_TIPS.find(tip => tip.id === tipId);
}

/**
 * Filter tips by category.
 * @param {string} category
 * @returns {EducatorTip[]}
 */
export function getTipsByCategory(category) {
  return EDUCATOR_TIPS.filter(tip => tip.category === category);
}

/**
 * Default export providing the complete array.
 */
export default EDUCATOR_TIPS;
