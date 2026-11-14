#!/usr/bin/env python3
"""
Live Headless Browser Adversarial Stress Test Suite for SeleneSight Milestone M3.
Automates Headless Firefox via GeckoDriver (W3C WebDriver HTTP Protocol).

Empirically stresses:
1. Timeline scrubbing, step forward/backward boundary clamping (0h, 708h).
2. Playback start/stop toggling, speed changes (1x, 3x, 6x), auto-looping.
3. Rapid site switching across all 4 canonical landing sites.
4. Telemetry cards, KPI summary cards, and status badge DOM validation (zero NaN/undefined).
5. Canvas rendering pixel density inspection (Trajectory Canvas & Polar/Linear Skyplot).
6. Scenario comparator tab: site pairing, delta calculations, anti-symmetry, and zero delta on identical sites.
7. Dynamic geoportal link updates (QuickMap, Moon Trek, Horizons).
8. Data export buttons (CSV and JSON) and data schema compliance.
9. Browser console errors: strictly 0 uncaught runtime exceptions.
"""

import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

GECKODRIVER_BIN = '/snap/bin/geckodriver'
GECKODRIVER_PORT = 4444
BASE_URL = 'http://127.0.0.1:8000/index.html'

total_checks = 0
passed_checks = 0
failed_checks = 0
failures = []

def check(condition, desc):
    global total_checks, passed_checks, failed_checks
    total_checks += 1
    if condition:
        passed_checks += 1
    else:
        failed_checks += 1
        failures.append(desc)
        print(f"  [X] FAIL: {desc}")

def http_json(url, data=None, method=None):
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'}, method=method or 'POST')
    else:
        req = urllib.request.Request(url, method=method or 'GET')
    
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

class WebDriverClient:
    def __init__(self, port=GECKODRIVER_PORT):
        self.base = f'http://127.0.0.1:{port}'
        self.session_id = None

    def start_session(self):
        payload = {
            'capabilities': {
                'alwaysMatch': {
                    'moz:firefoxOptions': {
                        'args': ['-headless']
                    }
                }
            }
        }
        res = http_json(f'{self.base}/session', payload)
        self.session_id = res['value']['sessionId']
        return self.session_id

    def navigate(self, url):
        http_json(f'{self.base}/session/{self.session_id}/url', {'url': url})

    def execute_script(self, script, args=[]):
        res = http_json(f'{self.base}/session/{self.session_id}/execute/sync', {
            'script': script,
            'args': args
        })
        return res.get('value')

    def find_element(self, by, value):
        res = http_json(f'{self.base}/session/{self.session_id}/element', {
            'using': by,
            'value': value
        })
        return res['value']

    def click(self, element_id):
        elem_key = list(element_id.keys())[0] if isinstance(element_id, dict) else element_id
        actual_id = element_id[elem_key] if isinstance(element_id, dict) else element_id
        http_json(f'{self.base}/session/{self.session_id}/element/{actual_id}/click', {})

    def close(self):
        if self.session_id:
            try:
                req = urllib.request.Request(f'{self.base}/session/{self.session_id}', method='DELETE')
                urllib.request.urlopen(req)
            except Exception:
                pass
            self.session_id = None

def main():
    print("=" * 65)
    print("  LIVE BROWSER EMPIRICAL ADVERSARIAL STRESS SUITE (FIREFOX HEADLESS)")
    print("=" * 65)

    start_time = time.time()
    
    # 1. Start GeckoDriver
    print("\n[Step 1] Starting GeckoDriver on port 4444...")
    gecko_proc = subprocess.Popen(
        [GECKODRIVER_BIN, '--port', str(GECKODRIVER_PORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    time.sleep(1.5)

    client = WebDriverClient(GECKODRIVER_PORT)

    try:
        session_id = client.start_session()
        print(f"  ✓ Firefox headless session initialized: {session_id}")

        # 2. Navigate to application
        print(f"\n[Step 2] Navigating to {BASE_URL}...")
        client.navigate(BASE_URL)
        time.sleep(1.0)

        # Verify page readiness
        ready_state = client.execute_script("return document.readyState;")
        check(ready_state == 'complete', f"Document readyState must be 'complete', got '{ready_state}'")

        # Verify appState and InterfaceContract exposed
        core_check = client.execute_script("""
            return {
                hasAppState: typeof window.appState === 'object' && window.appState !== null,
                hasInterfaceContract: typeof window.InterfaceContract === 'object',
                hasEphemerisEngine: typeof window.ephemerisEngine === 'object',
                sitesCount: window.appState ? window.appState.sites.length : 0,
                activeSiteId: window.appState ? window.appState.activeSite.id : null,
                currentHour: window.appState ? window.appState.currentHour : -1
            };
        """)
        check(core_check['hasAppState'], "window.appState must be exposed on window")
        check(core_check['hasInterfaceContract'], "window.InterfaceContract must be exposed on window")
        check(core_check['hasEphemerisEngine'], "window.ephemerisEngine must be exposed on window")
        check(core_check['sitesCount'] == 4, f"appState.sites count must be 4, got {core_check['sitesCount']}")
        check(core_check['activeSiteId'] == 'shackleton_rim_primary', f"Default active site must be Shackleton, got {core_check['activeSiteId']}")
        check(core_check['currentHour'] == 0, f"Default currentHour must be 0, got {core_check['currentHour']}")
        print("  ✓ Mission Control Shell and core modules verified in DOM.")

        # 3. Stress Test Timeline Controls & Scrubbing
        print("\n[Step 3] Adversarial Stress: Timeline Scrubbing & Boundary Stepping...")
        
        # Test step forward button from 0 to 5
        for step in range(1, 6):
            client.execute_script("document.getElementById('btnStepForward').click();")
            hour = client.execute_script("return window.appState.currentHour;")
            badge = client.execute_script("return document.getElementById('currentEpochBadge').textContent.trim();")
            slider_val = client.execute_script("return document.getElementById('timelineSlider').value;")
            check(hour == step, f"StepForward #{step}: currentHour must be {step}, got {hour}")
            check(badge == f"T+{step}h", f"StepForward #{step}: badge must be T+{step}h, got '{badge}'")
            check(int(slider_val) == step, f"StepForward #{step}: slider.value must be {step}, got {slider_val}")

        # Test step backward button from 5 back to 0
        for step in range(4, -1, -1):
            client.execute_script("document.getElementById('btnStepBack').click();")
            hour = client.execute_script("return window.appState.currentHour;")
            check(hour == step, f"StepBack to {step}: currentHour must be {step}, got {hour}")

        # Boundary test: Step backward at 0h (should clamp at 0h)
        for _ in range(5):
            client.execute_script("document.getElementById('btnStepBack').click();")
            hour = client.execute_script("return window.appState.currentHour;")
            badge = client.execute_script("return document.getElementById('currentEpochBadge').textContent.trim();")
            check(hour == 0, f"StepBack clamp at 0: hour must remain 0, got {hour}")
            check(badge == "T+0h", f"StepBack clamp at 0: badge must be T+0h, got '{badge}'")

        # Boundary test: Jump to 708h, then step forward (should clamp at 708h)
        client.execute_script("window.appState.setHour(708);")
        for _ in range(5):
            client.execute_script("document.getElementById('btnStepForward').click();")
            hour = client.execute_script("return window.appState.currentHour;")
            badge = client.execute_script("return document.getElementById('currentEpochBadge').textContent.trim();")
            check(hour == 708, f"StepForward clamp at 708: hour must remain 708, got {hour}")
            check(badge == "T+708h", f"StepForward clamp at 708: badge must be T+708h, got '{badge}'")

        # Rapid slider scrubbing across 100 randomized positions
        slider_scrub_errors = client.execute_script("""
            const errors = [];
            const slider = document.getElementById('timelineSlider');
            const testHours = [0, 1, 50, 100, 200, 354, 500, 600, 707, 708];
            for (let i = 0; i < 100; i++) {
                const targetH = testHours[i % testHours.length];
                slider.value = targetH;
                slider.dispatchEvent(new Event('input', { bubbles: true }));
                
                if (window.appState.currentHour !== targetH) {
                    errors.push(`Iter ${i}: expected currentHour ${targetH}, got ${window.appState.currentHour}`);
                }
                const badgeText = document.getElementById('currentEpochBadge').textContent.trim();
                if (badgeText !== `T+${targetH}h`) {
                    errors.push(`Iter ${i}: expected badge T+${targetH}h, got ${badgeText}`);
                }
            }
            return errors;
        """)
        check(len(slider_scrub_errors) == 0, f"100 rapid slider scrubs must produce 0 errors, got: {slider_scrub_errors}")
        print("  ✓ Timeline stepping, boundary clamping (0h/708h), and slider scrubbing 100% verified.")

        # 4. Stress Test Playback Controls & Speed Switches
        print("\n[Step 4] Adversarial Stress: Playback Animation & Multi-Speed Switches...")
        
        # Rapid play/pause toggles
        playback_toggle_errors = client.execute_script("""
            const errors = [];
            const btnPlay = document.getElementById('btnPlayPause');
            for (let i = 0; i < 40; i++) {
                btnPlay.click();
                const expectedState = (i % 2 === 0); // starts false, so iter 0 clicks to true
                if (window.appState.isPlaying !== expectedState) {
                    errors.push(`Iter ${i}: expected isPlaying ${expectedState}, got ${window.appState.isPlaying}`);
                }
                const expectedText = expectedState ? 'Pause' : 'Play';
                if (btnPlay.textContent.trim() !== expectedText) {
                    errors.push(`Iter ${i}: expected button text '${expectedText}', got '${btnPlay.textContent.trim()}'`);
                }
            }
            if (window.appState.isPlaying) btnPlay.click();
            return errors;
        """)
        check(len(playback_toggle_errors) == 0, f"40 rapid play/pause clicks must produce 0 errors, got: {playback_toggle_errors}")

        # Speed switches and button active classes
        speed_switch_errors = client.execute_script("""
            const errors = [];
            const speeds = [1, 3, 6, 3, 1, 6, 1];
            for (const spd of speeds) {
                document.getElementById(`btnSpeed${spd}`).click();
                if (window.appState.playSpeed !== spd) {
                    errors.push(`Speed click ${spd}: expected playSpeed ${spd}, got ${window.appState.playSpeed}`);
                }
                const btn = document.getElementById(`btnSpeed${spd}`);
                if (!btn.classList.contains('active')) {
                    errors.push(`Speed click ${spd}: button missing 'active' class`);
                }
                // Verify other speed buttons do not have active class
                for (const other of [1, 3, 6]) {
                    if (other !== spd && document.getElementById(`btnSpeed${other}`).classList.contains('active')) {
                        errors.push(`Speed click ${spd}: btnSpeed${other} has lingering 'active' class`);
                    }
                }
            }
            return errors;
        """)
        check(len(speed_switch_errors) == 0, f"Speed switch active class tests produced errors: {speed_switch_errors}")

        # Live animation advancement test (run at 6x for 400ms)
        client.execute_script("""
            window.appState.setHour(10);
            window.appState.setPlaySpeed(6);
            window.appState.play();
        """)
        time.sleep(0.4)
        anim_hour = client.execute_script("""
            window.appState.pause();
            return window.appState.currentHour;
        """)
        check(anim_hour > 10, f"Live animation at 6x must advance hour past 10, reached {anim_hour}")
        print(f"  ✓ Playback animation advanced smoothly from 10h to {anim_hour}h.")

        # 5. Rapid Site Switching & Telemetry DOM Inspection
        print("\n[Step 5] Adversarial Stress: Rapid Site Switching & DOM Telemetry...")
        site_switch_results = client.execute_script("""
            const results = [];
            const siteSelector = document.getElementById('siteSelector');
            const canonicalSites = ['shackleton_rim_primary', 'malapert_massif_summit', 'mons_mouton_plateau', 'connecting_ridge_south'];
            
            for (let cycle = 0; cycle < 12; cycle++) {
                const siteId = canonicalSites[cycle % canonicalSites.length];
                siteSelector.value = siteId;
                siteSelector.dispatchEvent(new Event('change', { bubbles: true }));

                // Check activeSite
                if (window.appState.activeSite.id !== siteId) {
                    results.push(`Cycle ${cycle}: activeSite is ${window.appState.activeSite.id}, expected ${siteId}`);
                }

                // Check Telemetry text nodes for NaN, undefined, or empty values
                const cellIds = [
                    'kpiSunlitPct', 'kpiSunlitHours', 'kpiDtePct', 'kpiDteHours',
                    'kpiDualPct', 'kpiDualHours', 'kpiViabilityScore', 'kpiSlopeGrade',
                    'cellSunEl', 'cellSunAz', 'cellSunMask', 'cellArrayEff',
                    'cellSolarFlux', 'cellEarthEl', 'cellLibration', 'cellNextSunset', 'cellNextEarthset'
                ];

                for (const cid of cellIds) {
                    const el = document.getElementById(cid);
                    if (!el) {
                        results.push(`Cycle ${cycle}: Missing DOM element #${cid}`);
                        continue;
                    }
                    const text = el.textContent.trim();
                    if (text.includes('NaN')) results.push(`Cycle ${cycle} [${siteId}]: #${cid} contains NaN: '${text}'`);
                    if (text.includes('undefined')) results.push(`Cycle ${cycle} [${siteId}]: #${cid} contains undefined: '${text}'`);
                    if (text === '') results.push(`Cycle ${cycle} [${siteId}]: #${cid} is empty`);
                }

                // Check Geoportal deep links
                const qm = document.getElementById('linkQuickMap').href;
                const mt = document.getElementById('linkMoonTrek').href;
                const hz = document.getElementById('linkHorizons').href;

                if (!qm.includes('quickmap.lroc.asu.edu')) results.push(`QuickMap URL invalid: ${qm}`);
                if (!mt.includes('trek.nasa.gov/moon')) results.push(`MoonTrek URL invalid: ${mt}`);
                if (!hz.includes('ssd.jpl.nasa.gov/horizons')) results.push(`Horizons URL invalid: ${hz}`);
            }
            return results;
        """)
        check(len(site_switch_results) == 0, f"Rapid site switching produced DOM telemetry errors: {site_switch_results}")
        print("  ✓ 12 rapid site cycles verified across all telemetry cells and portal links.")

        # 6. Canvas Rendering Pixel Inspection
        print("\n[Step 6] Adversarial Stress: Live Canvas Rendering Pixel Density...")
        canvas_pixel_check = client.execute_script("""
            const trajCanvas = document.getElementById('telemetryCurveCanvas');
            const skyCanvas = document.getElementById('skyplotCanvas');

            const trajCtx = trajCanvas.getContext('2d');
            const trajData = trajCtx.getImageData(0, 0, trajCanvas.width, trajCanvas.height).data;
            let trajNonZero = 0;
            for (let i = 0; i < trajData.length; i += 4) {
                if (trajData[i] > 0 || trajData[i+1] > 0 || trajData[i+2] > 0) trajNonZero++;
            }

            // Test Polar Skyplot
            window.appState.setViewMode('polar');
            const skyCtx = skyCanvas.getContext('2d');
            const skyDataPolar = skyCtx.getImageData(0, 0, skyCanvas.width, skyCanvas.height).data;
            let polarNonZero = 0;
            for (let i = 0; i < skyDataPolar.length; i += 4) {
                if (skyDataPolar[i] > 0 || skyDataPolar[i+1] > 0 || skyDataPolar[i+2] > 0) polarNonZero++;
            }

            // Test Linear Panorama
            window.appState.setViewMode('linear');
            const skyDataLinear = skyCtx.getImageData(0, 0, skyCanvas.width, skyCanvas.height).data;
            let linearNonZero = 0;
            for (let i = 0; i < skyDataLinear.length; i += 4) {
                if (skyDataLinear[i] > 0 || skyDataLinear[i+1] > 0 || skyDataLinear[i+2] > 0) linearNonZero++;
            }

            return {
                trajNonZero,
                polarNonZero,
                linearNonZero,
                trajWidth: trajCanvas.width,
                trajHeight: trajCanvas.height,
                skyWidth: skyCanvas.width,
                skyHeight: skyCanvas.height
            };
        """)
        check(canvas_pixel_check['trajNonZero'] > 50000, f"Trajectory canvas must have >50k rendered pixels, got {canvas_pixel_check['trajNonZero']}")
        check(canvas_pixel_check['polarNonZero'] > 50000, f"Polar skyplot must have >50k rendered pixels, got {canvas_pixel_check['polarNonZero']}")
        check(canvas_pixel_check['linearNonZero'] > 50000, f"Linear panorama must have >50k rendered pixels, got {canvas_pixel_check['linearNonZero']}")
        print(f"  ✓ Canvases rendered successfully: Trajectory={canvas_pixel_check['trajNonZero']} px, Polar={canvas_pixel_check['polarNonZero']} px, Linear={canvas_pixel_check['linearNonZero']} px.")

        # 7. Scenario Comparator Tab DOM Invariants & Antisymmetry
        print("\n[Step 7] Adversarial Stress: Scenario Comparator Tab & Invariant Checks...")
        # Activate comparator tab
        client.execute_script("""
            const tabBtn = document.querySelector('.tab-item[data-tab=\"comparator\"]');
            if (tabBtn) tabBtn.click();
        """)
        
        scenario_stress_results = client.execute_script("""
            const results = [];
            const sites = window.appState.sites;
            const selA = document.getElementById('selectScenarioA');
            const selB = document.getElementById('selectScenarioB');
            const deltaResultsEl = document.getElementById('deltaResults');

            // 1. Identity check: Site A === Site B -> all deltas 0, no negative zero
            for (const site of sites) {
                selA.value = site.id;
                selA.dispatchEvent(new Event('change', { bubbles: true }));
                selB.value = site.id;
                selB.dispatchEvent(new Event('change', { bubbles: true }));

                const deltaText = deltaResultsEl.textContent;
                if (deltaText.includes('-0')) {
                    results.push(`Identical site ${site.id} produced negative zero '-0' in deltaResults`);
                }
                if (deltaText.includes('NaN')) {
                    results.push(`Identical site ${site.id} produced NaN in deltaResults`);
                }

                // Verify underlying delta object
                const delta = window.appState.computeScenarioDelta();
                for (const k of ['sunlitHoursDelta', 'dteHoursDelta', 'dualHoursDelta', 'viabilityScoreDelta', 'elevMDelta', 'slopeDelta']) {
                    if (delta[k] !== 0 || Object.is(delta[k], -0)) {
                        results.push(`Delta ${k} for identical site ${site.id} is ${delta[k]} (Object.is -0: ${Object.is(delta[k], -0)})`);
                    }
                }
            }

            // 2. Anti-symmetry check across all 16 site pairs
            for (const sA of sites) {
                for (const sB of sites) {
                    selA.value = sA.id;
                    selA.dispatchEvent(new Event('change', { bubbles: true }));
                    selB.value = sB.id;
                    selB.dispatchEvent(new Event('change', { bubbles: true }));
                    const dAB = window.appState.computeScenarioDelta();

                    selA.value = sB.id;
                    selA.dispatchEvent(new Event('change', { bubbles: true }));
                    selB.value = sA.id;
                    selB.dispatchEvent(new Event('change', { bubbles: true }));
                    const dBA = window.appState.computeScenarioDelta();

                    for (const k of ['sunlitHoursDelta', 'dteHoursDelta', 'dualHoursDelta', 'viabilityScoreDelta', 'elevMDelta', 'slopeDelta']) {
                        if (Math.abs(dAB[k] + dBA[k]) > 1e-9) {
                            results.push(`Anti-symmetry broken for ${k} on (${sA.id}, ${sB.id}): dAB=${dAB[k]}, dBA=${dBA[k]}`);
                        }
                    }
                }
            }
            return results;
        """)
        check(len(scenario_stress_results) == 0, f"Scenario comparator DOM stress errors: {scenario_stress_results}")
        print("  ✓ Scenario comparator tab verified: identity (+0, no -0) and anti-symmetry across all 16 combinations.")

        # 8. Data Export Validation in Browser Context
        print("\n[Step 8] Adversarial Stress: Data Export Direct Validation...")
        export_results = client.execute_script("""
            const results = [];
            // CSV
            const csv = window.appState.exportToCSV();
            if (typeof csv !== 'string') results.push('exportToCSV did not return string');
            const lines = csv.trim().split('\\n');
            if (lines.length !== 710) results.push(`CSV line count is ${lines.length}, expected 710`);
            
            // JSON
            const jsonStr = window.appState.exportToJSON();
            let parsed;
            try {
                parsed = JSON.parse(jsonStr);
            } catch (e) {
                results.push(`exportToJSON parse failed: ${e.message}`);
            }
            if (parsed) {
                if (!window.InterfaceContract.validateCycleData(parsed)) {
                    results.push('exportToJSON data failed window.InterfaceContract.validateCycleData');
                }
                if (!Array.isArray(parsed.steps) || parsed.steps.length !== 709) {
                    results.push(`exportToJSON steps length is ${parsed.steps?.length}, expected 709`);
                }
            }

            // Click export buttons to ensure no DOM exception thrown
            try {
                document.getElementById('btnExportCSV').click();
                document.getElementById('btnExportJSON').click();
            } catch (err) {
                results.push(`Clicking export buttons threw exception: ${err.message}`);
            }

            return results;
        """)
        check(len(export_results) == 0, f"Data export validation errors: {export_results}")
        print("  ✓ CSV and JSON export functions verified in browser execution context.")

        # 9. Browser Console Error Inspection
        print("\n[Step 9] Inspecting Browser Console Log Errors...")
        console_errors = client.execute_script("""
            return window.__browser_errors || [];
        """)
        check(len(console_errors) == 0, f"Browser recorded console runtime errors: {console_errors}")
        print("  ✓ Zero browser console errors recorded.")

    finally:
        print("\n[Teardown] Closing browser session and killing GeckoDriver...")
        client.close()
        gecko_proc.terminate()
        try:
            gecko_proc.wait(timeout=3)
        except Exception:
            gecko_proc.kill()

    duration = round(time.time() - start_time, 2)
    print("\n" + "=" * 65)
    print("  LIVE BROWSER EMPIRICAL ADVERSARIAL STRESS SUITE COMPLETE")
    print(f"  Duration:      {duration}s")
    print(f"  Total Checks:  {total_checks}")
    print(f"  Passed:        {passed_checks}")
    print(f"  Failed:        {failed_checks}")
    print("=" * 65)

    if failed_checks > 0:
        print("\nFAILURES:")
        for f in failures:
            print(f" - {f}")
        sys.exit(1)
    else:
        print("\nSTATUS: ALL BROWSER STRESS INVARIANTS SATISFIED (100% PASS)")
        sys.exit(0)

if __name__ == '__main__':
    main()
