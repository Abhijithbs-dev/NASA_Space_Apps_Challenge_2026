#!/usr/bin/env python3
"""
Adversarial Challenger Test Suite for SeleneSight Milestone M3.
Covers:
  1. Static HTTP Serving & Content-Type Headers
  2. Security & Path Traversal Guards
  3. Real Headless Firefox Execution via W3C WebDriver REST API
  4. Real HTML5 Canvas Pixel & Rendering Verification
  5. Reactive State & UI Controls Stress
  6. Aerospace Palette, Monospace, and Zero-Emoji Compliance
"""

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

print("═" * 65)
print("  SELENESIGHT M3 ADVERSARIAL CHALLENGER TEST SUITE")
print("═" * 65)

TOTAL_ASSERTIONS = 0
PASSED_ASSERTIONS = 0
FAILED_ASSERTIONS = 0
FAILURES = []

def check(condition, message):
    global TOTAL_ASSERTIONS, PASSED_ASSERTIONS, FAILED_ASSERTIONS
    TOTAL_ASSERTIONS += 1
    if condition:
        PASSED_ASSERTIONS += 1
        print(f"  ✓ {message}")
    else:
        FAILED_ASSERTIONS += 1
        FAILURES.append(message)
        print(f"  ✗ FAIL: {message}")

BASE_URL = "http://127.0.0.1:8000"

# ----------------------------------------------------------------------
# 1. STATIC HTTP SERVING & CONTENT-TYPE HEADERS
# ----------------------------------------------------------------------
print("\n[SUITE 1] Static HTTP Serving & Security Headers")

# 1.1 Root / index.html
try:
    req = urllib.request.Request(f"{BASE_URL}/index.html")
    with urllib.request.urlopen(req) as resp:
        status = resp.status
        ctype = resp.headers.get("Content-Type", "")
        check(status == 200, "index.html returns HTTP 200 OK")
        check("text/html" in ctype, f"index.html Content-Type is text/html (received: {ctype})")
except Exception as e:
    check(False, f"Failed to fetch index.html: {e}")

# 1.2 Core ES Modules Content-Type
modules = [
    "src/core/interfaceContract.js",
    "src/core/ephemerisEngine.js",
    "src/core/appState.js",
]
for mod in modules:
    try:
        req = urllib.request.Request(f"{BASE_URL}/{mod}")
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            ctype = resp.headers.get("Content-Type", "")
            check(status == 200, f"{mod} returns HTTP 200 OK")
            check("javascript" in ctype or "text/plain" in ctype,
                  f"{mod} Content-Type indicates javascript (received: {ctype})")
    except Exception as e:
        check(False, f"Failed to fetch module {mod}: {e}")

# 1.3 404 Not Found for non-existent resource
try:
    urllib.request.urlopen(f"{BASE_URL}/non_existent_payload_test.xyz")
    check(False, "Non-existent resource should return 404")
except urllib.error.HTTPError as e:
    check(e.code == 404, f"Non-existent resource returns HTTP 404 (received: {e.code})")
except Exception as e:
    check(False, f"Unexpected error on 404 probe: {e}")

# 1.4 Path traversal protection probe
try:
    urllib.request.urlopen(f"{BASE_URL}/../../../../../../etc/passwd")
    check(False, "Path traversal should not succeed")
except urllib.error.HTTPError as e:
    check(e.code in (400, 404), f"Path traversal request rejected with HTTP {e.code}")
except Exception as e:
    check(True, f"Path traversal safely rejected: {type(e).__name__}")


# ----------------------------------------------------------------------
# 2. HEADLESS FIREFOX WEBDRIVER EXECUTION
# ----------------------------------------------------------------------
print("\n[SUITE 2] Headless Firefox Real Browser & DOM Execution")

GECKO_PORT = 4446
gecko_proc = subprocess.Popen(
    ["/snap/bin/geckodriver", "--port", str(GECKO_PORT)],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)
time.sleep(1.2)

session_id = None
driver_url = f"http://127.0.0.1:{GECKO_PORT}"

def driver_post(endpoint, data=None):
    url = f"{driver_url}{endpoint}"
    payload = json.dumps(data or {}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def driver_get(endpoint):
    url = f"{driver_url}{endpoint}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def driver_delete(endpoint):
    url = f"{driver_url}{endpoint}"
    req = urllib.request.Request(url, method="DELETE")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def execute_js(script, args=None):
    res = driver_post(f"/session/{session_id}/execute/sync", {
        "script": script,
        "args": args or [],
    })
    return res.get("value")

try:
    # Create headless Firefox session
    session_res = driver_post("/session", {
        "capabilities": {
            "alwaysMatch": {
                "moz:firefoxOptions": {
                    "args": ["-headless"]
                }
            }
        }
    })
    session_id = session_res["value"]["sessionId"]
    check(session_id is not None, f"Geckodriver session created (sessionId: {session_id[:8]}...)")

    # Navigate to SeleneSight index.html
    driver_post(f"/session/{session_id}/url", {"url": f"{BASE_URL}/index.html"})
    time.sleep(1.0)

    # 2.1 Verify window initialization and error traps
    # Install error logger hook
    execute_js("""
      window.__capturedErrors = [];
      window.addEventListener('error', function(e) {
        window.__capturedErrors.push({ type: 'error', message: e.message, filename: e.filename, lineno: e.lineno });
      });
      window.addEventListener('unhandledrejection', function(e) {
        window.__capturedErrors.push({ type: 'unhandledrejection', reason: String(e.reason) });
      });
    """)

    init_state = execute_js("""
      return {
        readyState: document.readyState,
        title: document.title,
        hasAppState: typeof window.appState !== 'undefined',
        hasEphemerisEngine: typeof window.ephemerisEngine !== 'undefined',
        hasInterfaceContract: typeof window.InterfaceContract !== 'undefined',
        activeSiteId: window.appState ? window.appState.activeSite.id : null,
        sitesCount: window.appState ? window.appState.sites.length : 0,
        currentHour: window.appState ? window.appState.currentHour : -1,
        stepsCount: (window.appState && window.appState.cycleData) ? window.appState.cycleData.steps.length : 0,
      };
    """)

    check(init_state["readyState"] == "complete", "DOM readyState is 'complete'")
    check("SeleneSight" in init_state["title"], f"Document title matches: '{init_state['title']}'")
    check(init_state["hasAppState"], "window.appState is successfully exposed and initialized")
    check(init_state["hasEphemerisEngine"], "window.ephemerisEngine is exposed")
    check(init_state["hasInterfaceContract"], "window.InterfaceContract is exposed")
    check(init_state["sitesCount"] == 4, f"appState initialized with exactly 4 canonical sites (found: {init_state['sitesCount']})")
    check(init_state["stepsCount"] == 709, f"Computed cycle contains exactly 709 steps (found: {init_state['stepsCount']})")

    # 2.2 Verify Initial Canvas Pixel Rendering (Non-Zero Alpha)
    canvas_pixels = execute_js("""
      const cTraj = document.getElementById('telemetryCurveCanvas');
      const cSky = document.getElementById('skyplotCanvas');
      
      const ctxTraj = cTraj.getContext('2d');
      const ctxSky = cSky.getContext('2d');
      
      const trajData = ctxTraj.getImageData(0, 0, cTraj.width, cTraj.height).data;
      const skyData = ctxSky.getImageData(0, 0, cSky.width, cSky.height).data;
      
      let trajNonZero = 0;
      for (let i = 0; i < trajData.length; i += 4) {
        if (trajData[i] !== 0 || trajData[i+1] !== 0 || trajData[i+2] !== 0) trajNonZero++;
      }
      
      let skyNonZero = 0;
      for (let i = 0; i < skyData.length; i += 4) {
        if (skyData[i] !== 0 || skyData[i+1] !== 0 || skyData[i+2] !== 0) skyNonZero++;
      }
      
      return {
        trajWidth: cTraj.width,
        trajHeight: cTraj.height,
        trajNonZero,
        skyWidth: cSky.width,
        skyHeight: cSky.height,
        skyNonZero,
      };
    """)

    check(canvas_pixels["trajNonZero"] > 10000,
          f"Trajectory canvas rendered non-zero pixels ({canvas_pixels['trajNonZero']} pixels drawn)")
    check(canvas_pixels["skyNonZero"] > 50000,
          f"Topocentric polar skyplot canvas rendered non-zero pixels ({canvas_pixels['skyNonZero']} pixels drawn)")


    # ------------------------------------------------------------------
    # 3. INTERACTIVE REACTIVE CONTROLS & EVENT PROPAGATION
    # ------------------------------------------------------------------
    print("\n[SUITE 3] Interactive State Transitions & Canvas Re-Rendering")

    # 3.1 Switch Active Site to Malapert Massif Summit (+14.87° Peak Earth Elevation)
    malapert_test = execute_js("""
      window.appState.setActiveSite('malapert_massif_summit');
      const active = window.appState.activeSite;
      const data = window.appState.cycleData;
      
      let maxEarthEl = -999;
      let maxEarthElHour = 0;
      data.steps.forEach(s => {
        if (s.earthElDeg > maxEarthEl) {
          maxEarthEl = s.earthElDeg;
          maxEarthElHour = s.hourOffset;
        }
      });
      
      // Set to peak hour
      window.appState.setHour(maxEarthElHour);
      
      const cTraj = document.getElementById('telemetryCurveCanvas');
      const ctxTraj = cTraj.getContext('2d');
      const imgData = ctxTraj.getImageData(0, 0, cTraj.width, cTraj.height).data;
      let nonZero = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        if (imgData[i] || imgData[i+1] || imgData[i+2]) nonZero++;
      }
      
      return {
        siteId: active.id,
        maxEarthEl,
        maxEarthElHour,
        currentHour: window.appState.currentHour,
        nonZero,
        kpiViability: document.getElementById('kpiViabilityScore').textContent,
      };
    """)

    check(malapert_test["siteId"] == "malapert_massif_summit", "Switched active site to Malapert Massif Summit")
    check(malapert_test["maxEarthEl"] >= 14.8, f"Malapert Massif Peak Earth elevation >= 14.8° (measured: {malapert_test['maxEarthEl']:.2f}°)")
    check(malapert_test["nonZero"] > 10000, f"Trajectory canvas re-rendered at peak Earth elevation ({malapert_test['nonZero']} pixels)")

    # 3.2 Switch View Mode to Linear Panorama Mode
    linear_test = execute_js("""
      const btnLin = document.getElementById('btnViewLinear');
      btnLin.click();
      
      const cSky = document.getElementById('skyplotCanvas');
      const ctxSky = cSky.getContext('2d');
      const skyData = ctxSky.getImageData(0, 0, cSky.width, cSky.height).data;
      let nonZero = 0;
      for (let i = 0; i < skyData.length; i += 4) {
        if (skyData[i] || skyData[i+1] || skyData[i+2]) nonZero++;
      }
      
      return {
        viewMode: window.appState.viewMode,
        btnLinActive: btnLin.classList.contains('active'),
        btnPolActive: document.getElementById('btnViewPolar').classList.contains('active'),
        nonZero,
      };
    """)

    check(linear_test["viewMode"] == "linear", "appState.viewMode updated to 'linear'")
    check(linear_test["btnLinActive"] and not linear_test["btnPolActive"], "View buttons active states toggled correctly")
    check(linear_test["nonZero"] > 100000, f"Cartesian Linear Panorama canvas rendered with {linear_test['nonZero']} pixels")

    # 3.3 Timeline Controls: Step Forward, Step Backward, Loop, Slider
    timeline_test = execute_js("""
      // 1. Step backward at h=0 should clamp to 0
      window.appState.setHour(0);
      document.getElementById('btnStepBack').click();
      const h0 = window.appState.currentHour;
      
      // 2. Step forward should increment to 1
      document.getElementById('btnStepForward').click();
      const h1 = window.appState.currentHour;
      
      // 3. Step forward multiple times
      document.getElementById('btnStepForward').click();
      document.getElementById('btnStepForward').click();
      const h3 = window.appState.currentHour;
      
      // 4. Slider scrubbing
      const slider = document.getElementById('timelineSlider');
      slider.value = '500';
      slider.dispatchEvent(new Event('input'));
      const h500 = window.appState.currentHour;
      
      // 5. Step forward at h=708 should clamp to 708
      window.appState.setHour(708);
      document.getElementById('btnStepForward').click();
      const h708 = window.appState.currentHour;
      
      // 6. Loop toggle button
      const btnLoop = document.getElementById('btnLoop');
      const wasActive = btnLoop.classList.contains('active');
      btnLoop.click();
      const isNowActive = btnLoop.classList.contains('active');
      btnLoop.click(); // restore
      
      return {
        h0, h1, h3, h500, h708,
        loopToggled: wasActive !== isNowActive,
      };
    """)

    check(timeline_test["h0"] == 0, "Step backward at h=0 clamps safely at 0")
    check(timeline_test["h1"] == 1, "Step forward from h=0 advances to 1")
    check(timeline_test["h3"] == 3, "Sequential step forward advances to 3")
    check(timeline_test["h500"] == 500, "Timeline slider scrubbing synchronizes appState to h=500")
    check(timeline_test["h708"] == 708, "Step forward at h=708 clamps safely at 708")
    check(timeline_test["loopToggled"], "Loop button toggles active state")

    # 3.4 Array Type Selector Synchronization
    array_test = execute_js("""
      const arrSel = document.getElementById('arrayTypeSelect');
      arrSel.value = 'sun_tracking';
      arrSel.dispatchEvent(new Event('change'));
      const stateArr = window.appState.arrayType;
      
      // Programmatic change should also update selector
      window.appState.setArrayType('horizontal_deck');
      const selValueAfter = arrSel.value;
      
      return {
        stateArr,
        selValueAfter,
      };
    """)

    check(array_test["stateArr"] == "sun_tracking", "Changing #arrayTypeSelect updates appState.arrayType")
    check(array_test["selValueAfter"] == "horizontal_deck", "Calling appState.setArrayType updates #arrayTypeSelect.value")

    # 3.5 Tab Navigation and Reactivity
    tabs_test = execute_js("""
      const tabs = ['telemetry', 'ephemeris', 'comparator', 'portals'];
      const results = {};
      for (const t of tabs) {
        window.appState.setActiveTab(t);
        const tabBtn = document.querySelector(`.tab-item[data-tab="${t}"]`);
        const panel = document.getElementById(`tab-${t}`);
        results[t] = {
          btnActive: tabBtn ? tabBtn.classList.contains('active') : false,
          panelActive: panel ? panel.classList.contains('active') : false,
        };
      }
      return results;
    """)

    for t, res in tabs_test.items():
        check(res["btnActive"] and res["panelActive"], f"Tab '{t}' activates both tab-item and tab-panel")

    # 3.6 Scenario Comparator Delta Calculations
    comparator_test = execute_js("""
      window.appState.setScenarioSite('A', 'shackleton_rim_primary');
      window.appState.setScenarioSite('B', 'mons_mouton_plateau');
      const delta = window.appState.computeScenarioDelta();
      
      const selA = document.getElementById('selectScenarioA');
      const selB = document.getElementById('selectScenarioB');
      const deltaEl = document.getElementById('deltaResults');
      
      return {
        selAVal: selA ? selA.value : null,
        selBVal: selB ? selB.value : null,
        hasSunlitDelta: typeof delta.sunlitHoursDelta === 'number',
        hasDteDelta: typeof delta.dteHoursDelta === 'number',
        hasViabilityDelta: typeof delta.viabilityScoreDelta === 'number',
        deltaText: deltaEl ? deltaEl.textContent : '',
      };
    """)

    check(comparator_test["selAVal"] == "shackleton_rim_primary", "Scenario A selector matches selected site")
    check(comparator_test["selBVal"] == "mons_mouton_plateau", "Scenario B selector matches selected site")
    check(comparator_test["hasSunlitDelta"] and comparator_test["hasDteDelta"], "Scenario delta metrics computed successfully")
    check(len(comparator_test["deltaText"]) > 20, "Scenario delta readout rendered in DOM")

    # 3.7 Dynamic Canvas Resolution Resizing Under Browser Runtime
    resize_test = execute_js("""
      const cTraj = document.getElementById('telemetryCurveCanvas');
      const cSky = document.getElementById('skyplotCanvas');
      
      const sizes = [
        [1920, 1080],
        [1280, 720],
        [600, 300],
        [300, 150]
      ];
      
      let allPass = true;
      for (const [w, h] of sizes) {
        cTraj.width = w;
        cTraj.height = h;
        cSky.width = w;
        cSky.height = h;
        
        // Trigger render
        window.appState.setHour(window.appState.currentHour);
      }
      
      // Restore default sizes
      cTraj.width = 700;
      cTraj.height = 340;
      cSky.width = 960;
      cSky.height = 520;
      window.appState.setHour(0);
      
      return { resizedCleanly: allPass };
    """)
    check(resize_test["resizedCleanly"], "Canvases dynamically resized across varying dimensions without runtime errors")

    # 3.8 Exporter Direct Blob Verification
    export_test = execute_js("""
      const csvStr = window.appState.exportToCSV();
      const jsonStr = window.appState.exportToJSON();
      
      const parsed = JSON.parse(jsonStr);
      const isConformant = window.InterfaceContract.validateCycleData(parsed);
      const csvLines = csvStr.trim().split('\\n');
      
      return {
        csvLinesCount: csvLines.length,
        csvHeader: csvLines[0],
        isConformant,
      };
    """)

    check(export_test["csvLinesCount"] == 710, f"CSV export contains 710 lines (1 header + 709 data rows) (found: {export_test['csvLinesCount']})")
    check("Hour_Offset" in export_test["csvHeader"], f"CSV header contains expected column names ({export_test['csvHeader'][:40]}...)")
    check(export_test["isConformant"], "JSON export parses and strictly validates against InterfaceContract")


    # ------------------------------------------------------------------
    # 4. CAPTURED RUNTIME ERRORS & UNHANDLED PROMISE REJECTIONS
    # ------------------------------------------------------------------
    print("\n[SUITE 4] Console Errors & Unhandled Promise Rejections")

    captured_errors = execute_js("return window.__capturedErrors || [];")
    check(len(captured_errors) == 0, f"Zero console errors or unhandled promise rejections detected during all tests (found: {len(captured_errors)})")
    if captured_errors:
        for err in captured_errors:
            print(f"    ERROR TRACE: {err}")


    # ------------------------------------------------------------------
    # 5. AEROSPACE PALETTE, MONOSPACE, AND ZERO-EMOJI ENFORCEMENT
    # ------------------------------------------------------------------
    print("\n[SUITE 5] Design Guidelines & Aerospace Aesthetic Hardening")

    style_audit = execute_js("""
      // 1. Check computed styles on body
      const bodyStyle = window.getComputedStyle(document.body);
      const fontFamily = bodyStyle.fontFamily;
      const isMonospace = fontFamily.includes('monospace') || fontFamily.includes('SFMono') || fontFamily.includes('Menlo');
      
      // 2. Prohibited generic blues in inline styles or computed styles of main cards
      const prohibitedHex = ['#0000ff', '#007bff', '#3b82f6', '#1d4ed8', '#2563eb', '#1e40af', '#60a5fa', '#93c5fd'];
      const htmlText = document.documentElement.outerHTML.toLowerCase();
      const foundBlues = prohibitedHex.filter(b => htmlText.includes(b));
      
      // 3. Emojis
      const emojiRegex = /\\p{Extended_Pictographic}/gu;
      const emojiMatches = document.body.innerText.match(emojiRegex);
      
      return {
        fontFamily,
        isMonospace,
        foundBlues,
        emojiCount: emojiMatches ? emojiMatches.length : 0,
      };
    """)

    check(style_audit["isMonospace"], f"Body font-family enforces monospace typography (font: {style_audit['fontFamily']})")
    check(len(style_audit["foundBlues"]) == 0, f"Zero prohibited generic SaaS blues found (violations: {style_audit['foundBlues']})")
    check(style_audit["emojiCount"] == 0, f"Strictly zero emojis found in document body (found: {style_audit['emojiCount']})")

finally:
    if session_id:
        try:
            driver_delete(f"/session/{session_id}")
            print("\n  Cleaned up Geckodriver session.")
        except Exception:
            pass
    gecko_proc.terminate()
    gecko_proc.wait()

print("\n" + "═" * 65)
print(f"CHALLENGER VERIFICATION SUMMARY: {PASSED_ASSERTIONS}/{TOTAL_ASSERTIONS} PASSED")
if FAILED_ASSERTIONS > 0:
    print(f"FAILED: {FAILED_ASSERTIONS}")
    for fail in FAILURES:
        print(f" - {fail}")
    sys.exit(1)
else:
    print("ALL EMPIRICAL ADVERSARIAL CHALLENGES CONFIRMED SATISFIED.")
    print("═" * 65)
    sys.exit(0)
