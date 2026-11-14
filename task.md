# TASK SPECIFICATION: Team Lead, Full-Stack Architect & Core Ephemeris Lead

**Project:** SeleneSight — Lunar South Pole Horizon, Solar Power & Direct-to-Earth (DTE) Comm Evaluator  
**Event:** 2026 NASA Space Apps Challenge  
**Assigned Owner:** **Abhijith B S** (`feat/abhijith-core-ephemeris` & `main`)  
**Git Repository:** [https://github.com/Abhijithbs-dev/NASA_Space_Apps_Challenge_2026.git](https://github.com/Abhijithbs-dev/NASA_Space_Apps_Challenge_2026.git)  
**Status:** Canonical Role Blueprint & System Specification  

---

## 1. Executive Summary & Ownership Boundaries

As Team Lead, Full-Stack Architect, and Git Maintainer, **Abhijith B S** holds complete technical authority over:
- System integration and main application shell (`index.html`)
- Core mathematical physics & ephemeris engine (`src/core/ephemerisEngine.js`)
- Application state manager & scenario comparator (`src/core/appState.js`)
- Interface schema contracts & validation guards (`src/core/interfaceContract.js`)
- Git repository hygiene rules (`.gitignore`) and architecture documentation (`README.md`, `task.md`)

All other files in `src/data/*`, `src/ui/*`, and `docs/*` belong strictly to teammates (**Anusree S**, **Alfiya S**, **Adith V S**) and are maintained as clean stubs on Abhijith's branch to prevent merge conflicts.

```
NASA_Space_Apps_Challenge_2026/
├── index.html                        # [OWNED BY ABHIJITH B S] Main app shell, layout, module orchestration
├── .gitignore                        # [OWNED BY ABHIJITH B S] Clean Git hygiene rules
├── task.md                           # [OWNED BY ABHIJITH B S] Master role specification
├── README.md                         # [OWNED BY ABHIJITH B S] Architecture and planetary data citations
└── src/
    └── core/                         # [OWNED BY ABHIJITH B S EXCLUSIVELY]
        ├── interfaceContract.js      # JSDoc schemas, validation guards, canonical NASA test fixtures
        ├── ephemerisEngine.js        # Topocentric solar/Earth vector math, libration, power/DTE solver
        └── appState.js               # Reactive state manager, playback controller, Scenario Comparator, exporters
```

---

## 2. Mathematical & Astronomical Foundation

The ephemeris engine in `src/core/ephemerisEngine.js` computes topocentric azimuth and elevation of both the Sun and the Earth from any lunar coordinate $(\phi, \lambda)$ at lunar elevation $h$ over a 708-hour synodic lunar cycle.

```
       Z (Zenith: Normal to Mean Lunar Sphere at Landing Site)
       ▲
       │       .·' Sun Vector S (Az_sun, El_sun)
       │   .·'
       │ .·'
       │' 
       ├──────────────► N (North Horizon: Local Meridian)
      / \
     /   \
    /     \
   ▼       ▼
  W         E (East Horizon)
```

### 2.1 Time Epoch & J2000 Calculation
Calculations start from a user-specified UTC date $D$ at step $h \in [0, 708]$:
$$\Delta t_{\text{hours}} = h$$
$$JD = \text{JulianDate}(D) + \frac{h}{24.0}$$
$$T = \frac{JD - 2451545.0}{36525.0} \quad \text{(Julian centuries from J2000.0)}$$

### 2.2 Sub-Solar Selenographic Coordinates
The Moon's rotation axis is inclined by $1.5424^\circ$ relative to the ecliptic pole. Over the 29.530589-day synodic cycle:
$$\text{Mean Synodic Rate: } \omega_{\text{syn}} = \frac{360^\circ}{708.73414\text{ hours}} \approx 0.507948^\circ/\text{hour}$$
$$\lambda_{\odot}(h) = \left( \lambda_{\odot,0} + \omega_{\text{syn}} \cdot h \right) \pmod{360^\circ}$$
$$\beta_{\odot}(h) = -1.5424^\circ \cdot \sin\left( \frac{2\pi (JD - 2451545.0)}{365.25} \right)$$

### 2.3 Sub-Earth Selenographic Coordinates & Optical Libration
Because the Moon is tidally locked in an eccentric ($e = 0.0549$) and inclined ($i = 5.145^\circ$) orbit, the apparent position of the Earth wobbles:
- **Libration in Latitude ($\beta_{\oplus}$):** Draconic cycle ($P_{\text{drac}} = 27.21222\text{ days} = 653.093\text{ hrs}$):
  $$\beta_{\oplus}(h) = 6.68^\circ \cdot \sin\left( \frac{2\pi \cdot h}{653.093} \right)$$
- **Libration in Longitude ($\lambda_{\oplus}$):** Anomalistic cycle ($P_{\text{anom}} = 27.55455\text{ days} = 661.309\text{ hrs}$):
  $$\lambda_{\oplus}(h) = 7.90^\circ \cdot \sin\left( \frac{2\pi \cdot h}{661.309} \right)$$

### 2.4 Topocentric Horizon Coordinates (Azimuth & Elevation)
For a lunar surface observer at latitude $\phi_{\text{site}}$ and longitude $\lambda_{\text{site}}$:
1. Longitude separation: $\Delta \lambda = \lambda_{\text{target}} - \lambda_{\text{site}}$
2. Angular separation $\sigma$ from lunar center to target:
   $$\cos(\sigma) = \sin(\phi_{\text{site}})\sin(\beta_{\text{target}}) + \cos(\phi_{\text{site}})\cos(\beta_{\text{target}})\cos(\Delta \lambda)$$
3. Topocentric elevation angle above geometric sphere ($R_{\text{moon}} = 1737.4\text{ km}$):
   $$\text{El}_{\text{geom}} = 90^\circ - \sigma$$
   $$\text{Terrain Elevation Dip Allowance: } \delta_{\text{elev}} = \sqrt{\frac{2 \cdot \max(0, h_{\text{elev}})}{R_{\text{moon}}}} \cdot \left(\frac{180^\circ}{\pi}\right)$$
   $$\text{El}_{\text{topocentric}} = \text{El}_{\text{geom}} + \delta_{\text{elev}}$$
4. Azimuth $\text{Az} \in [0^\circ, 360^\circ)$ measured clockwise from Lunar North:
   $$\tan(\text{Az}) = \frac{\sin(\Delta \lambda)\cos(\beta_{\text{target}})}{\cos(\phi_{\text{site}})\sin(\beta_{\text{target}}) - \sin(\phi_{\text{site}})\cos(\beta_{\text{target}})\cos(\Delta \lambda)}$$

### 2.5 Topographic Crater-Rim Mask Collision Check
Zero atmosphere means zero refraction. Target is visible if and only if:
$$\text{IsVisible} = \text{El}_{\text{topocentric}} > \text{HorizonMask}(\text{Az})$$

### 2.6 Solar Photovoltaic Generation Models
Solar constant at 1 AU = $1,361\text{ W/m}^2$. For an illuminated step ($\text{IsSunlit} = \text{true}$):
1. **Vertical Mast / Cylindrical Array** (optimized for low polar grazing sun):
   $$\eta_{\text{vert}} = \max\left(0, \cos(\text{El}_{\odot})\right) \cdot 100\%$$
2. **2-Axis Sun Tracking Array**:
   $$\eta_{\text{track}} = 100\% \quad (\text{if IsSunlit}, 0\%\text{ if shadowed})$$
3. **Horizontal Deck Array**:
   $$\eta_{\text{horiz}} = \max\left(0, \sin(\text{El}_{\odot})\right) \cdot 100\%$$
$$\text{Flux}_{\text{effective}} = 1361\text{ W/m}^2 \cdot \left(\frac{\eta}{100}\right)$$

---

## 3. Verified Planetary Portals Integration

SeleneSight incorporates direct deep links and validated data citations for:
- **NASA LROC QuickMap**: [https://quickmap.lroc.asu.edu/](https://quickmap.lroc.asu.edu/)
- **NASA Moon Trek**: [https://trek.nasa.gov/moon/](https://trek.nasa.gov/moon/)
- **NASA JPL Horizons**: [https://ssd.jpl.nasa.gov/horizons/](https://ssd.jpl.nasa.gov/horizons/)
- **CSA Moon Exploration**: [https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/)

---

## 4. UI Design Mandate: Lunar Basalt & Solar Grazing Amber (Zero Blue)

The application adheres strictly to the following aesthetic rules:
- **Zero Blue:** No generic SaaS blue or neon gradients.
- **Deep Basalt Black (`#08090c`, `#101217`)**: Representing the deep space vacuum and cold lunar shadows.
- **Solar Grazing Amber (`#f59e0b`, `#fbbf24`)**: Representing low-angle polar sunlight striking mountain peaks.
- **Phosphor Avionics Green (`#10b981`)**: Representing active communication locks and line-of-sight status.
- **Oxide Crimson (`#ef4444`)**: Representing permanently shadowed regions (PSRs) and terrain occultation.
- **Monospace Telemetry Readouts**: High data density with zero emojis.
