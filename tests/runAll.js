#!/usr/bin/env node
/**
 * @fileoverview Unified CLI Test Runner for SeleneSight Planetary Ephemeris Evaluation Platform.
 * Supports tier filtering (--tier=1,2,3,4,sanity), substring filtering, pretty ANSI
 * console reporting in Lunar Basalt & Solar Amber palette, and exits with code 0 or 1.
 *
 * Adheres strictly to zero external npm dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resetRegistry, runSuites } from './testHarness.js';

// Signal to test harness that unified runner is orchestrating execution
globalThis.__SELENE_RUNNER__ = true;

// -------------------------------------------------------------------------
// Theme & ANSI Palette: Lunar Basalt & Solar Grazing Amber
// -------------------------------------------------------------------------
const AMBER = '\x1b[38;2;245;158;11m';       // Solar Amber (#f59e0b)
const BRIGHT_AMBER = '\x1b[38;2;251;191;36m';// (#fbbf24)
const GREEN = '\x1b[38;2;16;185;129m';       // Phosphor Avionics Green (#10b981)
const RED = '\x1b[38;2;239;68;68m';          // Oxide Crimson (#ef4444)
const MUTED = '\x1b[38;2;100;116;139m';      // Lunar Regolith Slate (#64748b)
const WHITE = '\x1b[38;2;241;245;249m';      // High-contrast readout (#f1f5f9)
const CYAN = '\x1b[38;2;56;189;248m';        // Telemetry cyan
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// -------------------------------------------------------------------------
// CLI Argument Parsing
// -------------------------------------------------------------------------
function parseArgs(args) {
  const options = {
    tiers: null,      // Set of requested tiers (e.g. Set {'1', '2'}) or null for all
    filter: null,     // Substring filter for test file names
    verbose: false,   // Verbose error logging
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg.startsWith('--tier=')) {
      const val = arg.split('=')[1].trim().toLowerCase();
      if (val === 'all') {
        options.tiers = null;
      } else {
        options.tiers = new Set(val.split(',').map(s => s.trim()));
      }
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1].trim();
    }
  }

  return options;
}

function printHelp() {
  console.log(`
${AMBER}${BOLD}SeleneSight Automated E2E Test Runner${RESET}
${MUTED}Usage: ELECTRON_RUN_AS_NODE=1 <node> tests/runAll.js [options]${RESET}

${BOLD}Options:${RESET}
  ${WHITE}--tier=<tiers>${RESET}      Filter test suites by tier (comma-separated, e.g. --tier=1,2 or --tier=sanity)
                      Tiers: sanity, 1, 2, 3, 4, 5, all
  ${WHITE}--filter=<string>${RESET}   Filter test files by filename substring (e.g. --filter=ephemeris)
  ${WHITE}--verbose, -v${RESET}       Print detailed error stack traces and timing
  ${WHITE}--help, -h${RESET}          Display this help message and exit
`);
}

// -------------------------------------------------------------------------
// File Discovery & Tier Classification
// -------------------------------------------------------------------------
function classifyTier(filename) {
  if (filename.includes('sanity') || filename.includes('infra')) {
    return 'sanity';
  }
  const match = filename.match(/tier(\d+)/i);
  if (match) {
    return match[1];
  }
  return 'other';
}

function discoverTestFiles(testsDir, options) {
  if (!fs.existsSync(testsDir)) {
    return [];
  }

  const entries = fs.readdirSync(testsDir);
  const testFiles = [];

  for (const entry of entries) {
    if (!entry.endsWith('.test.js')) continue;

    const fullPath = path.join(testsDir, entry);
    const tier = classifyTier(entry);

    // Apply tier filter
    if (options.tiers !== null) {
      const matchTier = options.tiers.has(tier) ||
        (tier === 'sanity' && options.tiers.has('0')) ||
        (tier === '0' && options.tiers.has('sanity'));
      if (!matchTier) continue;
    }

    // Apply name filter
    if (options.filter && !entry.toLowerCase().includes(options.filter.toLowerCase())) {
      continue;
    }

    testFiles.push({
      filename: entry,
      fullPath,
      tier,
    });
  }

  // Sort files: sanity first, then tier 1..5, then others
  testFiles.sort((a, b) => {
    const tierOrder = { sanity: 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, other: 99 };
    const orderA = tierOrder[a.tier] ?? 50;
    const orderB = tierOrder[b.tier] ?? 50;
    if (orderA !== orderB) return orderA - orderB;
    return a.filename.localeCompare(b.filename);
  });

  return testFiles;
}

// -------------------------------------------------------------------------
// Main Execution Pipeline
// -------------------------------------------------------------------------
async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const testFiles = discoverTestFiles(scriptDir, options);

  // Print Banner
  console.log(`\n${AMBER}${BOLD}┌─────────────────────────────────────────────────────────────┐${RESET}`);
  console.log(`${AMBER}${BOLD}│       SELENESIGHT MISSION CONTROL E2E VERIFICATION SUITE    │${RESET}`);
  console.log(`${AMBER}${BOLD}│     Lunar South Pole Ephemeris & Telemetry Test Runner      │${RESET}`);
  console.log(`${AMBER}${BOLD}└─────────────────────────────────────────────────────────────┘${RESET}`);
  console.log(`${MUTED}Runtime: Node.js ${process.version} | Target: ECMAScript 2022 Native${RESET}`);
  console.log(`${MUTED}Active Filter: ${options.tiers ? `Tiers [${Array.from(options.tiers).join(', ')}]` : 'ALL TIERS'}` +
    `${options.filter ? ` | Name contains "${options.filter}"` : ''}${RESET}\n`);

  if (testFiles.length === 0) {
    console.log(`${RED}${BOLD}No test files matched the specified criteria.${RESET}`);
    console.log(`${MUTED}Tests directory: ${scriptDir}${RESET}\n`);
    process.exit(1);
  }

  console.log(`${MUTED}Discovered ${testFiles.length} test suite file(s) to execute...${RESET}\n`);

  const totalResults = {
    filesCount: testFiles.length,
    suitesCount: 0,
    testsCount: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    startTime: performance.now(),
    failures: [],
  };

  for (const file of testFiles) {
    const relativeName = file.filename;
    const tierBadge = file.tier === 'sanity'
      ? `${AMBER}[SANITY]${RESET}`
      : `${AMBER}[TIER ${file.tier}]${RESET}`;

    console.log(`${BOLD}${tierBadge} ${WHITE}${relativeName}${RESET}`);

    // Reset harness registry for clean per-file isolation
    resetRegistry();

    try {
      // Dynamic import with cache busting query parameter if needed
      const fileUrl = pathToFileURL(file.fullPath).href + `?t=${Date.now()}`;
      await import(fileUrl);
    } catch (importErr) {
      console.log(`  ${RED}✗ Failed to load test file: ${importErr.message}${RESET}`);
      totalResults.failed++;
      totalResults.failures.push({
        file: relativeName,
        suite: 'Import Phase',
        test: relativeName,
        error: importErr,
      });
      continue;
    }

    // Execute registered test suites for this file
    const fileResult = await runSuites({
      onSuiteStart: (suiteName) => {
        totalResults.suitesCount++;
        console.log(`  ${CYAN}${suiteName}${RESET}`);
      },
      onTestPass: (testName) => {
        console.log(`    ${GREEN}✓${RESET} ${testName}`);
      },
      onTestFail: (testName, suiteName, err) => {
        console.log(`    ${RED}✗ ${testName}${RESET}`);
        console.log(`      ${RED}Error: ${err.message}${RESET}`);
        totalResults.failures.push({
          file: relativeName,
          suite: suiteName,
          test: testName,
          error: err,
        });
      },
      onTestSkip: (testName) => {
        console.log(`    ${MUTED}- ${testName} (skipped)${RESET}`);
      },
    });

    totalResults.testsCount += fileResult.total;
    totalResults.passed += fileResult.passed;
    totalResults.failed += fileResult.failed;
    totalResults.skipped += fileResult.skipped;

    console.log(); // Blank line between files
  }

  const totalDuration = performance.now() - totalResults.startTime;

  // -------------------------------------------------------------------------
  // Failure Diagnostics Details (if any)
  // -------------------------------------------------------------------------
  if (totalResults.failures.length > 0) {
    console.log(`${RED}${BOLD}─────────────────────────────────────────────────────────────${RESET}`);
    console.log(`${RED}${BOLD}FAILURE DIAGNOSTICS (${totalResults.failures.length} failure(s)):${RESET}\n`);

    totalResults.failures.forEach((f, idx) => {
      console.log(`${RED}${BOLD}[${idx + 1}] ${f.file} » ${f.suite} » ${f.test}${RESET}`);
      console.log(`    ${RED}${f.error.message}${RESET}`);
      if (options.verbose && f.error.stack) {
        console.log(`${MUTED}${f.error.stack.split('\n').slice(1, 5).join('\n')}${RESET}`);
      }
      console.log();
    });
  }

  // -------------------------------------------------------------------------
  // Telemetry Summary Box
  // -------------------------------------------------------------------------
  const isSuccess = totalResults.failed === 0;
  const statusColor = isSuccess ? GREEN : RED;
  const statusText = isSuccess ? 'SYSTEM NOMINAL — ALL VERIFICATIONS PASSED' : 'VERIFICATION ANOMALY DETECTED';

  console.log(`${statusColor}${BOLD}═════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${statusColor}${BOLD} ${statusText} ${RESET}`);
  console.log(`${statusColor}${BOLD}═════════════════════════════════════════════════════════════${RESET}`);
  console.log(`  ${BOLD}Test Files Executed:${RESET}  ${WHITE}${totalResults.filesCount}${RESET}`);
  console.log(`  ${BOLD}Total Test Suites:${RESET}    ${WHITE}${totalResults.suitesCount}${RESET}`);
  console.log(`  ${BOLD}Total Assertions/Tests:${RESET} ${WHITE}${totalResults.testsCount}${RESET}`);
  console.log(`  ${BOLD}Passed Tests:${RESET}          ${GREEN}${BOLD}${totalResults.passed}${RESET}`);
  console.log(`  ${BOLD}Failed Tests:${RESET}          ${totalResults.failed > 0 ? RED + BOLD : MUTED}${totalResults.failed}${RESET}`);
  console.log(`  ${BOLD}Skipped Tests:${RESET}         ${MUTED}${totalResults.skipped}${RESET}`);
  console.log(`  ${BOLD}Total Execution Time:${RESET}  ${CYAN}${totalDuration.toFixed(2)} ms${RESET}`);
  console.log(`${statusColor}${BOLD}═════════════════════════════════════════════════════════════${RESET}\n`);

  process.exit(isSuccess ? 0 : 1);
}

main().catch(err => {
  console.error(`${RED}${BOLD}FATAL RUNNER EXCEPTION:${RESET}`, err);
  process.exit(1);
});
