# SeleneSight 🌔
### Lunar South Pole Horizon, Solar Power & Direct-to-Earth (DTE) Comm Evaluator

[![NASA Space Apps Challenge 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-blue.svg)](https://www.spaceappschallenge.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Zero Git Conflicts](https://img.shields.io/badge/Git%20Architecture-Conflict--Free%20Modular-success.svg)](#architecture)
[![FortiGuard Category](https://img.shields.io/badge/FortiGuard-Educational%20Web%20App-brightgreen.svg)](#deployment)
[![Super Intelligence Disclosure](https://img.shields.io/badge/AI%20Disclosure-Compliant-informational.svg)](#compliance)

---

## 🌟 Executive Summary

**SeleneSight** is an open-source, interactive web application designed to solve one of the most critical challenges of the Artemis era: **rapid topocentric site and date evaluation at the Lunar South Pole**.

At lunar latitudes between 80°S and 90°S, the Moon's minuscule 1.54° axial tilt causes the Sun to permanently skim the horizon in a 360-degree circle over a 29.53-day (708-hour) synodic cycle. Mountainous crater rims—such as the Shackleton Rim and Malapert Massif—cast towering, razor-sharp shadows while lunar optical libration (±6.68° in latitude, ±7.90° in longitude) causes the Earth to nod and wag across the horizon, periodically severing direct radio links.

SeleneSight fuses **NASA Lunar Orbiter Laser Altimeter (LOLA)** topographic horizon profiles, **JPL Horizons** topocentric ephemerides, and interactive HTML5 visualization engines to compute illumination, solar power output, and Direct-to-Earth (DTE) communications over a full 708-hour lunar cycle in seconds.

---

## 🚀 Key Features

- **360° Polar Dome & Linear Horizon Skyplots:** Visualize the 29.53-day gold solar track and cyan Earth libration figure-eight loop against the rose-tinted LOLA terrain horizon shadow mask.
- **Topographic Terrain Shadow Masking:** Instant interpolation of 360° crater-wall elevation cutoffs derived from NASA LOLA digital elevation models.
- **708-Hour Synodic Power & Comm Ribbon Chart:** Track continuous hourly solar elevation, Earth elevation, array power generation efficiency, and DTE visibility.
- **Side-by-Side Scenario Comparator (Site A vs. Site B):** Compare candidate landing sites or launch dates with net trade-off delta metrics (sunlit hours, DTE hours, simultaneous dual hours, elevation difference, slope safety).
- **Countdown Clocks to Transitions:** Live telemetry predicting exact countdown hours to the next Sunset, Sunrise, Earthset, and Earthrise.
- **Dual Telemetry & Educator Modes:** Switch between high-precision aerospace telemetry (azimuth, elevation, W/m² flux) and interactive plain-language science cards.
- **One-Click JPL Horizons CSV & JSON Exporters:** Download verified 709-hour ephemeris tables ready for mission analysis or classroom use.
- **Deep-Link Verification:** Direct 1-click URL launchers into NASA LROC QuickMap, NASA Moon Trek, JPL Horizons, and CSA Moon Exploration.

---

## 🏛️ System Architecture & Modular Isolation

SeleneSight is architected with strict folder-level isolation to ensure zero Git merge conflicts and modular extensibility:

```text
NASA_Space_Apps_Challenge_2026/
├── index.html                        # App Shell & Module Orchestrator (Abhijith B S)
├── README.md                         # Project Documentation & Scientific Citations (Adith V S)
├── .gitignore                        # Standard OS & Editor Ignore Rules (Abhijith B S)
├── src/
│   ├── core/                         # Ephemeris, Libration & State Solver (Abhijith B S)
│   │   ├── ephemerisEngine.js        # JPL Horizons math, 29.53d cycle, libration & power
│   │   ├── appState.js               # State store, Scenario Comparator, CSV/JSON exporters
│   │   └── interfaceContract.js      # Shared JSDoc schema validator
│   ├── data/                         # Topography & Spatial Datasets (Anusree S)
│   │   ├── landingSites.js           # 12 curated Artemis III, CLPS, ISRO & Apollo sites
│   │   ├── horizonMasks.js           # 360° LOLA crater-rim elevation profiles
│   │   └── nasaDeepLinks.js          # Direct deep-link generators for NASA & CSA portals
│   └── ui/                           # High-DPI Interactive Canvases (Alfiya S)
│       ├── skyplotRenderer.js        # 360° Polar Dome & Linear Horizon renderer
│       ├── polarMapRenderer.js       # South Pole Stereographic Map (80°S–90°S)
│       ├── timelineRenderer.js       # 708-hour synodic ribbon chart & scrubber
│       └── styles.css                # Glassmorphic responsive dark theme
└── docs/                             # Mission Science, Docs & 7-Slide Deck (Adith V S)
    ├── submission_form_answers.md    # Pre-drafted NASA Space Apps Project Page text
    ├── csa_mission_context.md        # CSA Canadarm3 & Lunar Utility Vehicle briefs
    ├── educator_tips.js              # Plain-language science cards for Educator Mode
    └── demo_deck/                    # 7-Slide Project Demo presentation & notes
        ├── index.html                # Standalone interactive 7-slide web presentation
        ├── slides.css                # 16:9 presentation styling & print layout
        └── speaker_notes.md          # 30-second to 2-minute oral pitch script
```

---

## 🔬 Scientific Methodology & Governing Equations

### 1. Sub-Solar Selenographic Coordinates
$$\text{Days since J2000} = \text{Epoch}_{\text{UTC}} - 2451545.0$$
$$\lambda_{\odot}(t) = (\lambda_0 + \omega_{\text{synodic}} \cdot t) \pmod{360^\circ}$$
Where $\omega_{\text{synodic}} = \frac{360^\circ}{29.53059 \text{ days}} \approx 0.5079^\circ/\text{hour}$.

### 2. Lunar Optical Libration
Libration in latitude ($\Delta b$) and longitude ($\Delta l$) are modeled following the draconic (27.2122 d) and anomalistic (27.5545 d) periods:
$$l_{\text{Earth}}(t) = 7.90^\circ \sin\left(\frac{2\pi \cdot t}{27.5545 \text{ d}} + \phi_l\right)$$
$$b_{\text{Earth}}(t) = 6.68^\circ \sin\left(\frac{2\pi \cdot t}{27.2122 \text{ d}} + \phi_b\right)$$

### 3. Solar Flux & Array Geometry
With solar constant $S_0 = 1,361 \text{ W/m}^2$:
- **Vertical Mast Array:** $\eta_{\text{vert}} = \cos(\text{elevation}_{\odot})$ (ideal for polar horizons)
- **Horizontal Deck Array:** $\eta_{\text{horiz}} = \max(0, \sin(\text{elevation}_{\odot}))$
- **2-Axis Tracking Array:** $\eta_{\text{track}} = 1.0$ (when unshadowed)

---

## 🛰️ NASA & Partner Space Agency Data Citations

SeleneSight integrates open data products from the following space missions and archives:
1. **NASA Lunar Orbiter Laser Altimeter (LOLA):** [NASA Planetary Data System (PDS) LOLA Archive](https://pgda.gsfc.nasa.gov/products/78) — used for 360° azimuthal terrain horizon elevation profiles.
2. **NASA JPL Horizons On-Line Ephemeris System:** [JPL Horizons API](https://ssd.jpl.nasa.gov/horizons/) — used to calibrate sub-solar and sub-Earth selenographic vectors.
3. **NASA Lunar Reconnaissance Orbiter Camera (LROC) QuickMap:** [LROC QuickMap](https://quickmap.lroc.asu.edu/) — candidate site verification and morphological inspection.
4. **NASA Moon Trek:** [NASA Solar System Treks — Moon](https://trek.nasa.gov/moon/) — interactive 3D terrain cross-referencing.
5. **Canadian Space Agency (CSA):** [CSA Moon Exploration](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/) & [Canadarm3 Overview](https://www.asc-csa.gc.ca/eng/canadarm3/about.asp) — operational context for Canadian lunar robotics.

---

## ⚡ Quickstart Guide (Local Development)

SeleneSight is built with zero build steps, zero external npm package dependencies, and pure standard ES Modules.

```bash
# 1. Clone the repository
git clone https://github.com/Abhijithbs-dev/NASA_Space_Apps_Challenge_2026.git
cd NASA_Space_Apps_Challenge_2026

# 2. Run a local static HTTP server
python3 -m http.server 8000

# 3. Open in your browser
# Web App:   http://localhost:8000/
# 7-Slide Deck: http://localhost:8000/docs/demo_deck/
```

---

## 👥 The SeleneSight Team

| Member | Role | Assigned Focus & Git Branch |
| :--- | :--- | :--- |
| **Abhijith B S** | Team Lead & Full-Stack Architect | Core ephemeris engine, state management, deployment (`feat/abhijith-core-ephemeris`) |
| **Anusree S** | Lunar Topography & Spatial Lead | 12-site catalog, LOLA 360° horizon masks, deep-link engine (`feat/anusree-lunar-data`) |
| **Alfiya S** | UI/UX & Visualization Lead | 360° skyplot canvas, polar stereographic map, 708-h ribbon timeline (`feat/alfiya-ui-visuals`) |
| **Adith V S** | Mission Science & Documentation Lead | Educator tips, CSA integration, submission forms, 7-slide pitch deck (`feat/adith-docs-demo`) |

---

## ⚖️ Official Disclosures & Compliance

1. **Super Intelligence (AI) Disclosure:** In accordance with page 9 of the NASA Space Apps Challenge Project Submission Guide, generative AI tools (Google DeepMind Gemini) were utilized for code scaffolding, modular architecture structuring, and documentation drafting. All scientific equations, LOLA elevation data, and orbital parameters were validated against published NASA and CSA planetary literature.
2. **NASA Trademark Compliance:** This project adheres strictly to NASA regulations regarding non-commercial, educational challenge submissions. No official NASA insignias ("meatball" or "worm" logos) are utilized.
3. **Open Access:** Built for open, unauthenticated judging access without logins or paywalls.
