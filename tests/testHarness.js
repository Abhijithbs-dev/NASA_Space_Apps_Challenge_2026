/**
 * @fileoverview Pure ECMAScript 2022 test framework and assertion harness for SeleneSight.
 * Provides BDD-style test suites, lifecycle hooks, comprehensive assertions,
 * and high-precision floating point comparison with zero external dependencies.
 */

/**
 * Custom error class for test assertion failures.
 */
export class AssertionError extends Error {
  /**
   * @param {string} message Descriptive failure message.
   * @param {*=} actual Actual value received.
   * @param {*=} expected Expected value.
   * @param {string=} operator Assertion operator name.
   */
  constructor(message, actual, expected, operator = 'assert') {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
    this.operator = operator;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AssertionError);
    }
  }
}

// -------------------------------------------------------------------------
// Deep Equality Helper
// -------------------------------------------------------------------------

/**
 * Performs recursive deep equality comparison across primitives, objects, arrays,
 * Dates, and Sets/Maps.
 * @param {*} a First operand.
 * @param {*} b Second operand.
 * @return {boolean} True if deeply equal.
 */
export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  if (a.constructor !== b.constructor) return false;

  if (a instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a instanceof Set) {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  if (a instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !deepEqual(v, b.get(k))) return false;
    }
    return true;
  }

  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Formats a value for error diagnostics.
 * @param {*} val
 * @return {string}
 */
function formatVal(val) {
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'number' || typeof val === 'boolean' || val === null || val === undefined) {
    return String(val);
  }
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

// -------------------------------------------------------------------------
// Assertion Functions
// -------------------------------------------------------------------------

/**
 * Asserts truthiness of condition.
 * @param {*} condition
 * @param {string=} message
 */
export function assert(condition, message = 'Expected condition to be truthy') {
  if (!condition) {
    throw new AssertionError(message, condition, true, 'assert');
  }
}

/**
 * Asserts falsiness of condition.
 * @param {*} condition
 * @param {string=} message
 */
export function assertFalse(condition, message = 'Expected condition to be falsy') {
  if (condition) {
    throw new AssertionError(message, condition, false, 'assertFalse');
  }
}

/**
 * Asserts strict equality (===).
 * @param {*} actual
 * @param {*} expected
 * @param {string=} message
 */
export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    const defaultMsg = `Expected ${formatVal(actual)} to strictly equal ${formatVal(expected)}`;
    throw new AssertionError(message || defaultMsg, actual, expected, 'assertEqual');
  }
}

/**
 * Asserts strict inequality (!==).
 * @param {*} actual
 * @param {*} expected
 * @param {string=} message
 */
export function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    const defaultMsg = `Expected ${formatVal(actual)} to not equal ${formatVal(expected)}`;
    throw new AssertionError(message || defaultMsg, actual, expected, 'assertNotEqual');
  }
}

/**
 * Asserts recursive deep equality.
 * @param {*} actual
 * @param {*} expected
 * @param {string=} message
 */
export function assertDeepEqual(actual, expected, message) {
  if (!deepEqual(actual, expected)) {
    const defaultMsg = `Expected deep equality:\nActual:   ${formatVal(actual)}\nExpected: ${formatVal(expected)}`;
    throw new AssertionError(message || defaultMsg, actual, expected, 'assertDeepEqual');
  }
}

/**
 * Asserts numerical proximity within absolute tolerance.
 * Essential for orbital and celestial coordinates.
 * @param {number} actual
 * @param {number} expected
 * @param {number=} tolerance Absolute error margin (default: 1e-4).
 * @param {string=} message
 */
export function assertApproxEqual(actual, expected, tolerance = 1e-4, message) {
  if (typeof actual !== 'number' || typeof expected !== 'number') {
    throw new AssertionError(
      `assertApproxEqual requires number operands. Received: actual=${typeof actual}, expected=${typeof expected}`,
      actual,
      expected,
      'assertApproxEqual'
    );
  }

  if (Number.isNaN(actual) && Number.isNaN(expected)) {
    return;
  }

  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    const defaultMsg = `Expected ${actual} to approximate ${expected} within ±${tolerance} (delta was ${diff.toFixed(6)})`;
    throw new AssertionError(message || defaultMsg, actual, expected, 'assertApproxEqual');
  }
}

/**
 * Asserts actual > expected.
 * @param {number} actual
 * @param {number} expected
 * @param {string=} message
 */
export function assertGreaterThan(actual, expected, message) {
  if (!(actual > expected)) {
    const defaultMsg = `Expected ${actual} > ${expected}`;
    throw new AssertionError(message || defaultMsg, actual, expected, 'assertGreaterThan');
  }
}

/**
 * Asserts actual >= expected.
 * @param {number} actual
 * @param {number} expected
 * @param {string=} message
 */
export function assertGreaterThanOrEqual(actual, expected, message) {
  if (!(actual >= expected)) {
    const defaultMsg = `Expected ${actual} >= ${expected}`;
    throw new AssertionError(message || defaultMsg, actual, expected, 'assertGreaterThanOrEqual');
  }
}

/**
 * Asserts actual < expected.
 * @param {number} actual
 * @param {number} expected
 * @param {string=} message
 */
export function assertLessThan(actual, expected, message) {
  if (!(actual < expected)) {
    const defaultMsg = `Expected ${actual} < ${expected}`;
    throw new AssertionError(message || defaultMsg, actual, expected, 'assertLessThan');
  }
}

/**
 * Asserts actual <= expected.
 * @param {number} actual
 * @param {number} expected
 * @param {string=} message
 */
export function assertLessThanOrEqual(actual, expected, message) {
  if (!(actual <= expected)) {
    const defaultMsg = `Expected ${actual} <= ${expected}`;
    throw new AssertionError(message || defaultMsg, actual, expected, 'assertLessThanOrEqual');
  }
}

/**
 * Asserts actual is within [min, max] inclusive.
 * @param {number} actual
 * @param {number} min
 * @param {number} max
 * @param {string=} message
 */
export function assertBetween(actual, min, max, message) {
  if (actual < min || actual > max) {
    const defaultMsg = `Expected ${actual} to be in range [${min}, ${max}]`;
    throw new AssertionError(message || defaultMsg, actual, { min, max }, 'assertBetween');
  }
}

/**
 * Asserts that a function throws an exception.
 * @param {Function} fn Function expected to throw.
 * @param {(Function|RegExp|string)=} expectedError Error constructor, message substring, or regex.
 * @param {string=} message
 * @return {Error} Caught error for further assertions.
 */
export function assertThrows(fn, expectedError, message) {
  let thrown = null;
  try {
    fn();
  } catch (err) {
    thrown = err;
  }

  if (!thrown) {
    const defaultMsg = message || 'Expected function to throw an exception, but it succeeded.';
    throw new AssertionError(defaultMsg, null, expectedError, 'assertThrows');
  }

  if (expectedError) {
    if (typeof expectedError === 'function') {
      if (!(thrown instanceof expectedError)) {
        throw new AssertionError(
          message || `Expected thrown error to be instance of ${expectedError.name}, received ${thrown.constructor.name}`,
          thrown,
          expectedError,
          'assertThrows'
        );
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(thrown.message)) {
        throw new AssertionError(
          message || `Expected error message "${thrown.message}" to match ${expectedError}`,
          thrown.message,
          expectedError,
          'assertThrows'
        );
      }
    } else if (typeof expectedError === 'string') {
      if (!thrown.message.includes(expectedError)) {
        throw new AssertionError(
          message || `Expected error message "${thrown.message}" to include "${expectedError}"`,
          thrown.message,
          expectedError,
          'assertThrows'
        );
      }
    }
  }

  return thrown;
}

/**
 * Asserts that a Promise or async function rejects.
 * @param {(Promise|Function)} target
 * @param {(Function|RegExp|string)=} expectedError
 * @param {string=} message
 * @return {Promise<Error>}
 */
export async function assertReject(target, expectedError, message) {
  let thrown = null;
  try {
    if (typeof target === 'function') {
      await target();
    } else {
      await target;
    }
  } catch (err) {
    thrown = err;
  }

  if (!thrown) {
    const defaultMsg = message || 'Expected promise to reject, but it resolved.';
    throw new AssertionError(defaultMsg, null, expectedError, 'assertReject');
  }

  if (expectedError) {
    if (typeof expectedError === 'function') {
      if (!(thrown instanceof expectedError)) {
        throw new AssertionError(
          message || `Expected rejection to be instance of ${expectedError.name}, received ${thrown.constructor.name}`,
          thrown,
          expectedError,
          'assertReject'
        );
      }
    } else if (expectedError instanceof RegExp) {
      if (!expectedError.test(thrown.message)) {
        throw new AssertionError(
          message || `Expected rejection message "${thrown.message}" to match ${expectedError}`,
          thrown.message,
          expectedError,
          'assertReject'
        );
      }
    } else if (typeof expectedError === 'string') {
      if (!thrown.message.includes(expectedError)) {
        throw new AssertionError(
          message || `Expected rejection message "${thrown.message}" to include "${expectedError}"`,
          thrown.message,
          expectedError,
          'assertReject'
        );
      }
    }
  }

  return thrown;
}

/**
 * Asserts that a string, array, or Set includes the given element.
 * @param {(string|Array|Set)} collection
 * @param {*} element
 * @param {string=} message
 */
export function assertIncludes(collection, element, message) {
  let includes = false;
  if (typeof collection === 'string') {
    includes = collection.includes(String(element));
  } else if (Array.isArray(collection)) {
    includes = collection.includes(element);
  } else if (collection instanceof Set) {
    includes = collection.has(element);
  } else if (collection && typeof collection === 'object') {
    includes = element in collection;
  }

  if (!includes) {
    const defaultMsg = `Expected collection to include ${formatVal(element)}`;
    throw new AssertionError(message || defaultMsg, collection, element, 'assertIncludes');
  }
}

/**
 * Asserts that a string matches a RegExp.
 * @param {string} str
 * @param {RegExp} regex
 * @param {string=} message
 */
export function assertMatch(str, regex, message) {
  if (typeof str !== 'string' || !regex.test(str)) {
    const defaultMsg = `Expected "${str}" to match ${regex}`;
    throw new AssertionError(message || defaultMsg, str, regex, 'assertMatch');
  }
}

/**
 * Asserts value is defined (not undefined).
 * @param {*} val
 * @param {string=} message
 */
export function assertDefined(val, message) {
  if (val === undefined) {
    throw new AssertionError(message || 'Expected value to be defined', val, 'defined', 'assertDefined');
  }
}

/**
 * Asserts value is undefined.
 * @param {*} val
 * @param {string=} message
 */
export function assertUndefined(val, message) {
  if (val !== undefined) {
    throw new AssertionError(message || `Expected undefined, received ${formatVal(val)}`, val, undefined, 'assertUndefined');
  }
}

/**
 * Asserts value is null.
 * @param {*} val
 * @param {string=} message
 */
export function assertNull(val, message) {
  if (val !== null) {
    throw new AssertionError(message || `Expected null, received ${formatVal(val)}`, val, null, 'assertNull');
  }
}

/**
 * Asserts value is not null.
 * @param {*} val
 * @param {string=} message
 */
export function assertNotNull(val, message) {
  if (val === null) {
    throw new AssertionError(message || 'Expected non-null value, received null', val, 'not-null', 'assertNotNull');
  }
}

// -------------------------------------------------------------------------
// Test Suite & Runner Framework
// -------------------------------------------------------------------------

/**
 * Test case descriptor.
 * @typedef {{
 *   name: string,
 *   fn: Function,
 *   skipped: boolean,
 *   tier: ?number
 * }}
 */

/**
 * Test suite descriptor.
 * @typedef {{
 *   name: string,
 *   tests: !Array<!Object>,
 *   beforeAll: !Array<Function>,
 *   afterAll: !Array<Function>,
 *   beforeEach: !Array<Function>,
 *   afterEach: !Array<Function>,
 *   suites: !Array<!Object>
 * }}
 */

class TestRegistry {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.suiteStack = [];
  }

  reset() {
    this.suites = [];
    this.currentSuite = null;
    this.suiteStack = [];
  }

  createSuite(name) {
    return {
      name,
      tests: [],
      beforeAll: [],
      afterAll: [],
      beforeEach: [],
      afterEach: [],
      suites: [],
    };
  }
}

const registry = new TestRegistry();

/**
 * Defines a test suite grouping related test cases.
 * @param {string} name Suite name.
 * @param {Function} fn Suite definition body.
 */
export function describe(name, fn) {
  const suite = registry.createSuite(name);

  if (registry.currentSuite) {
    registry.currentSuite.suites.push(suite);
  } else {
    registry.suites.push(suite);
  }

  registry.suiteStack.push(suite);
  registry.currentSuite = suite;

  try {
    fn();
  } finally {
    registry.suiteStack.pop();
    registry.currentSuite = registry.suiteStack.length > 0
      ? registry.suiteStack[registry.suiteStack.length - 1]
      : null;
  }
}

/**
 * Registers an individual test case.
 * @param {string} name Test name.
 * @param {Function} fn Test execution function (sync or async).
 * @param {Object=} options Optional metadata (e.g. { tier: 1 }).
 */
export function test(name, fn, options = {}) {
  let targetSuite = registry.currentSuite;
  if (!targetSuite) {
    targetSuite = registry.createSuite('Default Suite');
    registry.suites.push(targetSuite);
  }

  targetSuite.tests.push({
    name,
    fn,
    skipped: !!options.skip,
    tier: options.tier || null,
  });
}

/** Alias for test() */
export const it = test;

/** Registers a skipped test case */
test.skip = function (name, fn) {
  test(name, fn, { skip: true });
};
it.skip = test.skip;

/** Lifecycle hook: before all tests in current suite */
export function beforeAll(fn) {
  if (registry.currentSuite) {
    registry.currentSuite.beforeAll.push(fn);
  }
}

/** Lifecycle hook: after all tests in current suite */
export function afterAll(fn) {
  if (registry.currentSuite) {
    registry.currentSuite.afterAll.push(fn);
  }
}

/** Lifecycle hook: before each test in current suite */
export function beforeEach(fn) {
  if (registry.currentSuite) {
    registry.currentSuite.beforeEach.push(fn);
  }
}

/** Lifecycle hook: after each test in current suite */
export function afterEach(fn) {
  if (registry.currentSuite) {
    registry.currentSuite.afterEach.push(fn);
  }
}

/** Clears registered test suites */
export function resetRegistry() {
  registry.reset();
}

/** Returns the active suite registry */
export function getRegistry() {
  return registry.suites;
}

// -------------------------------------------------------------------------
// Suite Execution Engine
// -------------------------------------------------------------------------

/**
 * Executes a single suite and any nested child suites recursively.
 * @param {!Object} suite
 * @param {!Array<Function>} inheritedBeforeEach
 * @param {!Array<Function>} inheritedAfterEach
 * @param {!Object} results Aggregator.
 * @param {!Object} options Configuration options.
 */
async function executeSuite(suite, inheritedBeforeEach, inheritedAfterEach, results, options = {}) {
  const currentBeforeEach = [...inheritedBeforeEach, ...suite.beforeEach];
  const currentAfterEach = [...suite.afterEach, ...inheritedAfterEach];

  if (options.onSuiteStart) {
    options.onSuiteStart(suite.name);
  }

  // Run beforeAll hooks
  for (const hook of suite.beforeAll) {
    await hook();
  }

  for (const t of suite.tests) {
    results.total++;
    const testResult = {
      name: t.name,
      suiteName: suite.name,
      passed: false,
      skipped: t.skipped,
      error: null,
      durationMs: 0,
    };

    if (t.skipped) {
      results.skipped++;
      if (options.onTestSkip) options.onTestSkip(t.name, suite.name);
      results.tests.push(testResult);
      continue;
    }

    const start = performance.now();
    try {
      // Run beforeEach hooks
      for (const hook of currentBeforeEach) {
        await hook();
      }

      // Execute test
      await t.fn();

      testResult.passed = true;
      results.passed++;
      if (options.onTestPass) options.onTestPass(t.name, suite.name);
    } catch (err) {
      testResult.passed = false;
      testResult.error = err;
      results.failed++;
      if (options.onTestFail) options.onTestFail(t.name, suite.name, err);
    } finally {
      // Run afterEach hooks regardless of pass/fail
      for (const hook of currentAfterEach) {
        try {
          await hook();
        } catch (hookErr) {
          if (!testResult.error) {
            testResult.error = hookErr;
            testResult.passed = false;
            results.failed++;
          }
        }
      }
      testResult.durationMs = performance.now() - start;
    }

    results.tests.push(testResult);
  }

  // Recurse into nested suites
  for (const childSuite of suite.suites) {
    await executeSuite(childSuite, currentBeforeEach, currentAfterEach, results, options);
  }

  // Run afterAll hooks
  for (const hook of suite.afterAll) {
    await hook();
  }

  if (options.onSuiteEnd) {
    options.onSuiteEnd(suite.name);
  }
}

/**
 * Runs all registered test suites.
 * @param {!Object=} options Callback and execution options.
 * @return {Promise<!Object>} Aggregated run results.
 */
export async function runSuites(options = {}) {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    tests: [],
  };

  const startTime = performance.now();
  for (const suite of registry.suites) {
    await executeSuite(suite, [], [], results, options);
  }
  results.durationMs = performance.now() - startTime;
  return results;
}

// -------------------------------------------------------------------------
// Standalone Auto-Runner
// -------------------------------------------------------------------------

// If executed directly (not under runAll runner), run automatically on beforeExit
if (typeof process !== 'undefined' && process.on && !globalThis.__SELENE_RUNNER__) {
  let hasRun = false;
  const optionsVerbose = process.argv.includes('--verbose') || process.argv.includes('-v');

  process.on('beforeExit', async () => {
    if (hasRun || registry.suites.length === 0 || globalThis.__SELENE_RUNNER__) return;
    hasRun = true;

    const AMBER = '\x1b[38;2;245;158;11m';
    const GREEN = '\x1b[38;2;16;185;129m';
    const RED = '\x1b[38;2;239;68;68m';
    const GRAY = '\x1b[90m';
    const RESET = '\x1b[0m';
    const BOLD = '\x1b[1m';

    console.log(`\n${AMBER}${BOLD}=== SeleneSight Standalone Test Suite ===${RESET}\n`);

    const results = await runSuites({
      onSuiteStart: (name) => console.log(`${BOLD}${name}${RESET}`),
      onTestPass: (name) => console.log(`  ${GREEN}✓${RESET} ${name}`),
      onTestFail: (name, _, err) => {
        console.log(`  ${RED}✗ ${name}${RESET}`);
        console.log(`    ${RED}${err.message}${RESET}`);
        if (err.stack && optionsVerbose) {
          console.log(`    ${GRAY}${err.stack}${RESET}`);
        }
      },
      onTestSkip: (name) => console.log(`  ${GRAY}- ${name} (skipped)${RESET}`),
    });

    console.log(`\n${BOLD}Summary:${RESET} ` +
      `${GREEN}${results.passed} passed${RESET}, ` +
      `${results.failed > 0 ? RED : GRAY}${results.failed} failed${RESET}, ` +
      `${results.skipped} skipped ` +
      `${GRAY}(${results.durationMs.toFixed(1)}ms)${RESET}\n`);

    if (results.failed > 0) {
      process.exitCode = 1;
    }
  });
}
