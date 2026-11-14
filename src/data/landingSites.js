/**
 * SeleneSight - Curated Lunar Landing Sites
 *
 * Dataset of 12 high-priority lunar landing sites including Artemis South Pole
 * candidate regions, commercial landers (CLPS), international missions, and
 * historic Apollo benchmark sites.
 *
 * Each site includes topographic properties, proximity to Permanently Shadowed
 * Regions (PSRs), and a 12-point horizon elevation profile (elevation angle in
 * degrees from azimuth 0° to 330° in 30° steps).
 */

export const LANDING_SITES = [
  {
    id: 'shackleton-rim',
    name: 'Shackleton Rim',
    shortName: 'Shackleton Rim',
    program: 'Artemis',
    lat: -89.68,
    lon: 166.0,
    elevM: 1150,
    slopeDeg: 8.5,
    psrDistKm: 0.1,
    description: 'Perched directly on the rim crest of the 21 km-wide Shackleton Crater at the lunar South Pole. Features near-permanent solar illumination (>85-90% of the lunar year) on elevated peaks and immediate access to ultra-cold permanently shadowed regions containing potential water-ice volatiles.',
    horizonProfile: [1.2, 1.5, 2.1, 3.5, 2.8, 4.2, 1.8, 2.4, 3.0, 1.9, 1.5, 1.1]
  },
  {
    id: 'peak-near-shackleton',
    name: 'Peak Near Shackleton',
    shortName: 'Peak Near Shackleton',
    program: 'Artemis',
    lat: -88.80,
    lon: 124.0,
    elevM: 1450,
    slopeDeg: 6.2,
    psrDistKm: 2.5,
    description: 'A high-elevation topographic ridge point situated ~50 km from the South Pole. Offers prolonged solar visibility periods and excellent line-of-sight Direct-to-Earth (DTE) communications with moderate slope traverses toward nearby shadowed depressions.',
    horizonProfile: [1.8, 2.2, 1.5, 0.8, 1.2, 2.7, 3.4, 2.9, 1.6, 1.1, 0.9, 1.4]
  },
  {
    id: 'malapert-massif',
    name: 'Malapert Massif',
    shortName: 'Malapert Massif',
    program: 'Artemis',
    lat: -85.99,
    lon: 2.9,
    elevM: 5020,
    slopeDeg: 5.0,
    psrDistKm: 7.0,
    description: 'A towering mountain massif rising over 5 km above the surrounding terrain. Known as a prime communications hub because Earth is perpetually visible above the northern horizon, providing near 100% continuous Direct-to-Earth telemetry and robust solar power.',
    horizonProfile: [0.5, 0.8, 1.2, 1.8, 2.5, 2.1, 1.6, 1.0, 0.6, 0.4, 0.5, 0.6]
  },
  {
    id: 'mons-mouton-plateau',
    name: 'Mons Mouton Plateau',
    shortName: 'Mons Mouton',
    program: 'Artemis',
    lat: -84.90,
    lon: 323.7,
    elevM: 6100,
    slopeDeg: 4.2,
    psrDistKm: 4.5,
    description: 'A massive, ancient flat-topped highland plateau (formerly Leibnitz Beta) soaring 6 km high. Designated as a key landing area for robotic and crewed exploration due to its smooth summit landing zones, geologic antiquity, and proximity to shadowed volatile traps.',
    horizonProfile: [0.8, 1.1, 1.4, 1.9, 2.2, 1.8, 1.2, 0.9, 0.7, 0.5, 0.6, 0.7]
  },
  {
    id: 'nobile-rim-1',
    name: 'Nobile Rim 1',
    shortName: 'Nobile Rim 1',
    program: 'Artemis',
    lat: -85.25,
    lon: 36.9,
    elevM: 3800,
    slopeDeg: 7.1,
    psrDistKm: 1.2,
    description: 'Located along the southern rim of the 73 km-wide impact crater Nobile. Selected as an Artemis candidate region and target study area for volatile-hunting surface rovers like VIPER due to its accessible terrain and clustered mini-PSRs.',
    horizonProfile: [1.5, 2.4, 3.1, 2.8, 2.0, 1.4, 1.1, 1.7, 2.5, 2.9, 2.2, 1.6]
  },
  {
    id: 'haworth-crater-region',
    name: 'Haworth Crater Region',
    shortName: 'Haworth Region',
    program: 'Artemis',
    lat: -87.87,
    lon: 355.0,
    elevM: 1950,
    slopeDeg: 9.4,
    psrDistKm: 0.8,
    description: 'Highland terrain adjacent to the intensely shadowed floor of Haworth Crater. Represents one of the coldest cryogenic environments in the Solar System (<40 K), presenting high potential for subsurface ice deposits alongside complex illumination horizons.',
    horizonProfile: [2.0, 3.2, 4.1, 3.6, 2.5, 1.8, 1.4, 2.1, 3.5, 4.0, 3.1, 2.2]
  },
  {
    id: 'connecting-ridge',
    name: 'Connecting Ridge',
    shortName: 'Connecting Ridge',
    program: 'Artemis',
    lat: -89.44,
    lon: 222.6,
    elevM: 1720,
    slopeDeg: 7.8,
    psrDistKm: 0.5,
    description: 'A prominent topographic saddle connecting the rims of Shackleton and de Gerlache craters. Offers complementary illumination profiles where shadow periods on one crest coincide with sunshine on the other, creating prime opportunities for surface power infrastructure.',
    horizonProfile: [1.4, 2.0, 2.8, 3.5, 2.9, 2.1, 1.7, 2.3, 3.1, 2.6, 1.9, 1.5]
  },
  {
    id: 'de-gerlache-rim-1',
    name: 'de Gerlache Rim 1',
    shortName: 'de Gerlache 1',
    program: 'Artemis',
    lat: -88.71,
    lon: 291.0,
    elevM: 2150,
    slopeDeg: 6.8,
    psrDistKm: 0.9,
    description: 'An elevated ridge crest along the eastern flank of de Gerlache Crater. Provides long-duration sunlight windows, favorable line-of-sight communication to Earth, and a natural gateway to inspect pristine deep-shadow volatile traps inside the crater basin.',
    horizonProfile: [1.9, 2.7, 3.4, 2.8, 2.1, 1.6, 1.2, 1.8, 2.9, 3.3, 2.5, 2.0]
  },
  {
    id: 'malapert-a',
    name: 'Malapert A (CLPS IM-1)',
    shortName: 'IM-1 Odysseus',
    program: 'CLPS',
    lat: -80.13,
    lon: 1.44,
    elevM: 2580,
    slopeDeg: 11.5,
    psrDistKm: 15.0,
    description: 'Historic landing site of Intuitive Machines IM-1 Nova-C lander (Odysseus) in February 2024, marking the first commercial lunar touchdown. Located in heavily cratered southern highlands north of Malapert Crater on an undulating 12-degree slope.',
    horizonProfile: [1.2, 1.6, 2.2, 2.7, 2.3, 1.7, 1.1, 1.4, 2.0, 2.4, 1.8, 1.3]
  },
  {
    id: 'statio-shiv-shakti',
    name: 'Statio Shiv Shakti (Chandrayaan-3)',
    shortName: 'Chandrayaan-3',
    program: 'ISRO',
    lat: -69.373,
    lon: 32.319,
    elevM: -250,
    slopeDeg: 2.8,
    psrDistKm: 45.0,
    description: "Designated landing site of India's Chandrayaan-3 Vikram lander and Pragyan rover in August 2023. Located in the southern sub-polar highlands between Manzinus C and Simpelius N, providing a relatively flat, crater-sparse plain for in-situ soil thermophysical experiments.",
    horizonProfile: [0.9, 1.2, 1.4, 1.1, 0.8, 0.7, 0.9, 1.3, 1.5, 1.2, 0.8, 0.7]
  },
  {
    id: 'apollo-11',
    name: 'Apollo 11',
    shortName: 'Tranquility Base',
    program: 'Apollo',
    lat: 0.674,
    lon: 23.473,
    elevM: -1520,
    slopeDeg: 1.5,
    psrDistKm: 999.0,
    description: 'The historic first crewed lunar landing site at Tranquility Base (Mare Tranquillitatis), touched down by Neil Armstrong and Buzz Aldrin on July 20, 1969. Characterized by a flat basaltic mare plain with unobstructed low horizons and direct Earth visibility overhead.',
    horizonProfile: [0.4, 0.5, 0.3, 0.4, 0.6, 0.5, 0.4, 0.3, 0.4, 0.5, 0.4, 0.3]
  },
  {
    id: 'apollo-15',
    name: 'Apollo 15',
    shortName: 'Hadley-Apennine',
    program: 'Apollo',
    lat: 26.132,
    lon: 3.633,
    elevM: -1810,
    slopeDeg: 3.2,
    psrDistKm: 999.0,
    description: 'Site of the first J-class mission featuring the Lunar Roving Vehicle at Hadley-Apennine. Bordered by the towering Montes Apenninus rising 3-4 km above the mare floor and the sinuous rille Rima Hadley, producing an asymmetric high-elevation horizon profile to the south.',
    horizonProfile: [0.6, 0.8, 1.2, 3.5, 6.8, 8.2, 7.5, 4.2, 1.5, 0.8, 0.5, 0.5]
  }
];

export default LANDING_SITES;
