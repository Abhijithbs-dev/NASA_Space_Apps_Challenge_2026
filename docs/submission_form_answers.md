# NASA Space Apps Challenge 2026 — Official Project Submission Text

**Project Name:** SeleneSight: Lunar South Pole Horizon, Solar Power & Direct-to-Earth (DTE) Comm Evaluator  
**Team Name:** Team SeleneSight  
**Team Members:**  
1. **Abhijith B S** — Team Lead, Full-Stack Architect & Ephemeris Engine Lead  
2. **Anusree S** — Lunar Topography, LOLA Horizon Masks & Spatial Data Lead  
3. **Alfiya S** — UI/UX, 360° Skyplot Canvas & Interactive Visualization Lead  
4. **Adith V S** — Mission Science, Documentation, CSA Integration & 7-Slide Demo Lead  

**Submission Window:** Opens Saturday, Nov 14, 2026 at 9:00 AM — Closes **Sunday, Nov 15, 2026 at 11:59 PM** (Local Time)  

---

## 1. Project Title & Short Subtitle

- **Project Title:** SeleneSight: Lunar South Pole Horizon, Solar Power & Direct-to-Earth (DTE) Comm Evaluator
- **Short Subtitle / Tagline:** Instant 708-hour topocentric illumination, LOLA terrain horizon masking, and Direct-to-Earth communication evaluator for Artemis and CLPS landing site selection.

---

## 2. High-Level Project Summary (Word count: ~150 words; strict limit: 50–200 words)

Landing at the Lunar South Pole presents an unprecedented aerospace challenge: because the Moon’s rotational axis is tilted only 1.54°, the Sun skims the horizon in a 360° circle, casting 20-kilometer shadows from crater rims that plunge landing zones into darkness. Concurrently, lunar optical libration (±6.68° latitude, ±7.90° longitude) causes the Earth to bob above and below mountainous massifs, intermittently severing Direct-to-Earth (DTE) radio links.

SeleneSight solves this operational bottleneck through a lightweight, zero-dependency web application that computes 708-hour synodic cycle ephemerides in seconds. By coupling NASA LOLA digital elevation models with JPL Horizons orbital geometry, SeleneSight delivers interactive 360° polar skyplots, crater-wall horizon masks, power generation curves, and a Side-by-Side Scenario Comparator. SeleneSight transforms complex orbital mechanics into actionable landing decisions for mission planners, educators, and the public.

---

## 3. Detailed Project Description (Addressing the 5 Space Apps Judging Criteria)

### A. The Challenge & Core Problem
As humanity prepares to return to the Moon through NASA's Artemis campaign and commercial CLPS landers, the Lunar South Pole represents the highest priority exploration target due to massive volatile water-ice deposits trapped within cryogenic Permanently Shadowed Regions (PSRs). However, the extreme polar geometry makes surface operations perilous:
1. Sunlight skims the terrain at grazing angles under 1.5°, turning even modest crater rims into towering shadow barriers with zero atmospheric scattering or twilight.
2. Earth bobs near the horizon due to optical libration, periodically dipping behind elevated ridges and severing radio contact with NASA's Deep Space Network (DSN).
3. Mission planners cannot rely on generic planetary ephemerides; they require topocentric, terrain-occluded evaluations for specific landing coordinates and launch epochs.
4. Traditional desktop mission planning tools (such as SPICE toolkit scripts and heavy GIS suites) require complex installations, command-line proficiency, and minutes to hours of execution time.

### B. Our Solution & Technical Architecture
SeleneSight provides an intuitive, browser-based evaluation suite that executes entirely on client devices with zero server latency:
1. **Interactive 360° Polar Dome & Linear Skyplots:** Renders dynamic solar and Earth trajectories against a true LOLA terrain shadow mask polygon, visually illustrating shadow ingress and libration figure-eights.
2. **708-Hour Synodic Ribbon Timeline:** Visualizes continuous hourly power output and DTE communication windows across a complete 29.53-day synodic day.
3. **Side-by-Side Scenario Comparator:** Empowers mission architects to compare Site/Date A against Site/Date B, displaying instant delta trade-offs for total sunlight hours, continuous DTE coverage, and simultaneous "Golden Hours".
4. **Transition Countdown Clocks:** Real-time telemetry computing exact hours until the next Sunset, Sunrise, Earthset, or Earthrise.
5. **JPL Horizons Export & Deep-Linking:** Generates downloadable CSV/JSON ephemeris tables and links directly to LROC QuickMap, Moon Trek, and CSA portals.

### C. Alignment with the 5 Space Apps Judging Criteria
1. **Impact:** SeleneSight eliminates the barrier of complex command-line SPICE kernels, allowing mission designers, academic researchers, students, and educators to evaluate landing candidate viability in seconds.
2. **Creativity:** The fusion of stereographic 360° polar horizons with dual synodic timeline tracking and side-by-side scenario trade-offs delivers a unique, cohesive mission control interface.
3. **Validity & Scientific Rigor:** All calculations incorporate verified physical parameters: 1.5424° lunar obliquity, 29.53059-day synodic cycles, draconic/anomalistic libration periods, LOLA DEM crater-wall elevation masks, and array geometry cosine efficiency laws.
4. **Relevance:** Directly addresses the urgent operational planning requirements of Artemis III candidate regions, CLPS commercial landers, and international partners including the Canadian Space Agency (CSA).
5. **Presentation:** Built with a modern glassmorphic responsive interface, dual aerospace/educator modes, and zero external build dependencies for instant, barrier-free access on any modern web browser.

---

## 4. Space Agency Data Citations (Mandatory Section)

SeleneSight directly integrates and cites open data from:
1. **NASA Lunar Orbiter Laser Altimeter (LOLA):**
   - *Dataset:* LOLA Gridded Data Records (GDR) & Lunar South Pole Topography (80°S–90°S).
   - *URL:* https://pgda.gsfc.nasa.gov/products/78
   - *Usage:* Interpolated 12-sector azimuthal horizon elevation masks for all 12 candidate landing sites.
2. **NASA JPL Horizons On-Line Ephemeris System:**
   - *System:* SSD JPL Horizons Vector & Observer Ephemerides.
   - *URL:* https://ssd.jpl.nasa.gov/horizons/
   - *Usage:* Calibration of topocentric sub-solar and sub-Earth vectors and optical libration limits.
3. **NASA Lunar Reconnaissance Orbiter Camera (LROC) QuickMap:**
   - *Portal:* LROC QuickMap (Arizona State University / NASA).
   - *URL:* https://quickmap.lroc.asu.edu/
   - *Usage:* Interactive site verification and high-resolution crater morphology inspection.
4. **NASA Moon Trek:**
   - *Portal:* NASA Solar System Treks — Moon.
   - *URL:* https://trek.nasa.gov/moon/
   - *Usage:* Topographic profile cross-referencing and slope validation.

---

## 5. Space Agency Partner Integration: Canadian Space Agency (CSA)

SeleneSight highlights the contributions of the **Canadian Space Agency (CSA)** to the Artemis lunar architecture:
- **Canadarm3 Integration:** Explores how autonomous AI-driven robotics aboard the Lunar Gateway handle deep-space orbital maintenance during uncrewed periods.
- **Canadian Lunar Utility Vehicle (LUV) & Rover Operations:** Models power budgeting, battery preservation, and line-of-sight DTE communications required for Canadian surface rovers traversing crater rims and entering Permanently Shadowed Regions.
- *Official Citation:* [CSA Moon Exploration](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/) & [CSA Canadarm3](https://www.asc-csa.gc.ca/eng/canadarm3/about.asp).

---

## 6. Super Intelligence (AI) Disclosure Statement

In strict adherence to page 9 of the NASA Space Apps Challenge Project Submission Guide:
- **AI Tools Used:** Google DeepMind Gemini (Advanced Agentic Coding Environment).
- **Application Scope:** Gemini was utilized to assist in scaffolding modular ES Module code structure, formatting mathematical formulas, generating glassmorphic CSS styling, and synthesizing educational text cards.
- **Human Verification:** All mathematical formulations (orbital periods, libration amplitudes, Lambertian flux laws), LOLA elevation coordinates, and UI telemetry were independently verified and reviewed by team members against NASA and CSA publications.

---

## 7. Open Source Repository & Public Demonstration Links
- **Public GitHub Repository:** https://github.com/Abhijithbs-dev/NASA_Space_Apps_Challenge_2026
- **Live Web Application:** https://abhijithbs-dev.github.io/NASA_Space_Apps_Challenge_2026/
- **7-Slide Interactive Deck:** https://abhijithbs-dev.github.io/NASA_Space_Apps_Challenge_2026/docs/demo_deck/
- **FortiGuard Web Category Submission:** Category: *Educational* / *Web-based application*, Company Name: `N/A`.
