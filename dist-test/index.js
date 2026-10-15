var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var isWorkerdProcessV2 = globalThis.Cloudflare.compatibilityFlags.enable_nodejs_process_v2;
var unenvProcess = new Process({
  env: globalProcess.env,
  // `hrtime` is only available from workerd process v2
  hrtime: isWorkerdProcessV2 ? workerdProcess.hrtime : hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  // Always implemented by workerd
  env,
  // Only implemented in workerd v2
  hrtime: hrtime3,
  // Always implemented by workerd
  nextTick
} = unenvProcess;
var {
  _channel,
  _disconnect,
  _events,
  _eventsCount,
  _handleQueue,
  _maxListeners,
  _pendingMessage,
  _send,
  assert: assert2,
  disconnect,
  mainModule
} = unenvProcess;
var {
  // @ts-expect-error `_debugEnd` is missing typings
  _debugEnd,
  // @ts-expect-error `_debugProcess` is missing typings
  _debugProcess,
  // @ts-expect-error `_exiting` is missing typings
  _exiting,
  // @ts-expect-error `_fatalException` is missing typings
  _fatalException,
  // @ts-expect-error `_getActiveHandles` is missing typings
  _getActiveHandles,
  // @ts-expect-error `_getActiveRequests` is missing typings
  _getActiveRequests,
  // @ts-expect-error `_kill` is missing typings
  _kill,
  // @ts-expect-error `_linkedBinding` is missing typings
  _linkedBinding,
  // @ts-expect-error `_preload_modules` is missing typings
  _preload_modules,
  // @ts-expect-error `_rawDebug` is missing typings
  _rawDebug,
  // @ts-expect-error `_startProfilerIdleNotifier` is missing typings
  _startProfilerIdleNotifier,
  // @ts-expect-error `_stopProfilerIdleNotifier` is missing typings
  _stopProfilerIdleNotifier,
  // @ts-expect-error `_tickCallback` is missing typings
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  availableMemory,
  // @ts-expect-error `binding` is missing typings
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  // @ts-expect-error `domain` is missing typings
  domain,
  emit,
  emitWarning,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  // @ts-expect-error `initgroups` is missing typings
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  memoryUsage,
  // @ts-expect-error `moduleLoadList` is missing typings
  moduleLoadList,
  off,
  on,
  once,
  // @ts-expect-error `openStdin` is missing typings
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  // @ts-expect-error `reallyExit` is missing typings
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = isWorkerdProcessV2 ? workerdProcess : unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
}, "bufferToFormData");

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");
var throwNestingLimitExceeded = /* @__PURE__ */ __name(() => {
  throw new Error("Nesting limit exceeded");
}, "throwNestingLimitExceeded");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str, "tryDecodeURIComponent");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) return "";
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context: context2
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count3 = 0;
        for (const k in headers) if (++count3 > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  }, "text");
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = /* @__PURE__ */ __name((location2, status) => {
    const locationString = String(location2);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context2, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context2.error = err;
          res = await onError(err, context2);
          isError = true;
        } else throw err;
      }
      else if (context2.finalized === false && onNotFound) res = await onNotFound(context2);
      if (res && (context2.finalized === false || isError)) context2.res = res;
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class Hono2 {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) return res;
      await next();
    }, "handler");
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  }, "request");
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/utils.js
var createNullObject = /* @__PURE__ */ __name(() => /* @__PURE__ */ Object.create(null), "createNullObject");

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }, "match");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === ".*" || a === "(?:|/.*)") return b === "(?:|/.*)" ? -1 : 1;
  else if (b === ".*" || b === "(?:|/.*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class Node2 {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context2, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ".*"
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (regexpStr === ".*") throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ".*" && regexpStr !== "(?:|/.*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context2.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(`^${path.replace(/\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g, (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ".*" : `/:${LABEL_REG_EXP_STR}`)}$`);
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) if (buildWildcardRegExp(k).test(path)) return [...middleware[k]];
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { ["ALL"]: createNullObject() };
    this.#routes = { ["ALL"]: createNullObject() };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap["ALL"]) {
          handlerMap[method][p] = [...handlerMap["ALL"][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) if (!middleware[m][path]) {
        this.#insertPath(m, path);
        middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware["ALL"], path) || [];
      }
      for (const handlerMap of [middleware, routes]) for (const m of methods) for (const p in handlerMap[m]) re.test(p) && handlerMap[m][p].push([handler, path]);
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!routes[m][path2]) {
        this.#insertPath(m, path2);
        routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware["ALL"], path2) || [];
      }
      routes[m][path2].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) matchers[method] = this.#buildMatcher(method);
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) for (const path in r) {
      const handlers = r[path];
      const pathData = trie.paths[path];
      if (!pathData) {
        staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
        continue;
      }
      handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [h, trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
        map[key] = paramReplacementMap[pathData[1][i][1]];
        return map;
      }, createNullObject())]);
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  static {
    __name(this, "Node");
  }
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// src/lib/errors.ts
var AppError = class extends Error {
  static {
    __name(this, "AppError");
  }
  status;
  code;
  details;
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
};
var BadRequestError = class extends AppError {
  static {
    __name(this, "BadRequestError");
  }
  constructor(code, message, details) {
    super(400, code, message, details);
  }
};
var NotFoundError = class extends AppError {
  static {
    __name(this, "NotFoundError");
  }
  constructor(code, message) {
    super(404, code, message);
  }
};
var ConflictError = class extends AppError {
  static {
    __name(this, "ConflictError");
  }
  constructor(code, message, details) {
    super(409, code, message, details);
  }
};
var TooManyRequestsError = class extends AppError {
  static {
    __name(this, "TooManyRequestsError");
  }
  constructor(code, message, details) {
    super(429, code, message, details);
  }
};

// src/lib/response.ts
function errorBody(code, message, details) {
  return {
    error: {
      code,
      message,
      ...details === void 0 ? {} : { details }
    }
  };
}
__name(errorBody, "errorBody");

// node_modules/hono/dist/helper/factory/index.js
var createMiddleware = /* @__PURE__ */ __name((middleware) => middleware, "createMiddleware");

// src/middleware/access.ts
var accessGuard = createMiddleware(async (c, next) => {
  if (c.env.SKIP_ACCESS_DEV === "true") {
    c.set("accessIdentity", { email: "dev@localhost" });
    return next();
  }
  let email = c.req.header("Cf-Access-Authenticated-User-Email") ?? null;
  const ctx = c.executionCtx;
  if (!email && ctx.access) {
    try {
      const identity = await ctx.access.getIdentity();
      email = identity?.email ?? null;
    } catch {
      email = null;
    }
  }
  if (!email) {
    const url = new URL(c.req.url);
    if (url.pathname.startsWith("/api/")) {
      return c.json(errorBody("unauthorized", "\u9700\u8981 Cloudflare Access \u9274\u6743"), 401);
    }
    const login = new URL("/cdn-cgi/access/login", url.origin);
    login.searchParams.set("redirect_url", url.pathname + url.search);
    return c.redirect(login.toString(), 302);
  }
  c.set("accessIdentity", { email });
  return next();
});
function currentActor(c) {
  const identity = c.get("accessIdentity");
  return identity?.email ?? null;
}
__name(currentActor, "currentActor");

// src/lib/ids.ts
function newId() {
  return crypto.randomUUID();
}
__name(newId, "newId");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");

// src/lib/audit.ts
function auditStatement(db, event) {
  return db.prepare(
    "INSERT INTO audit_log (id, actor, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(
    newId(),
    event.actor ?? null,
    event.action,
    event.target ?? null,
    event.detail === void 0 ? null : JSON.stringify(event.detail),
    nowIso()
  );
}
__name(auditStatement, "auditStatement");
async function recordAudit(db, event) {
  await auditStatement(db, event).run();
}
__name(recordAudit, "recordAudit");

// src/submissions/notify.ts
async function sendMail(env2, input) {
  if (!env2.MAIL_ENDPOINT) {
    return { sent: false, skipped: true };
  }
  const headers = { "content-type": "application/json" };
  if (env2.MAIL_API_KEY) headers.authorization = `Bearer ${env2.MAIL_API_KEY}`;
  try {
    const res = await fetch(env2.MAIL_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: env2.MAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text
      })
    });
    return { sent: res.ok, status: res.status };
  } catch {
    return { sent: false };
  }
}
__name(sendMail, "sendMail");
var STATUS_LABEL = {
  pending: "\u5DF2\u6536\u5230",
  approved: "\u5DF2\u901A\u8FC7",
  rejected: "\u672A\u901A\u8FC7",
  published: "\u5DF2\u53D1\u5E03"
};
async function notifyStatus(env2, input) {
  const email = input.email?.trim();
  if (!email) {
    return { sent: false, skipped: true };
  }
  const label = STATUS_LABEL[input.status] ?? input.status;
  const queryUrl = `/submit?token=${input.token}`;
  const subject = `[\u5170\u53F0] \u6570\u636E\u96C6 ${input.datasetSlug} \u7684\u63D0\u4EA4${label}`;
  const text = [
    `\u60A8\u5BF9\u6570\u636E\u96C6\u300C${input.datasetSlug}\u300D\u7684\u63D0\u4EA4\u901A\u77E5`,
    ``,
    `\u5F53\u524D\u72B6\u6001\uFF1A${label}\uFF08${input.status}\uFF09`,
    `\u8FFD\u8E2A\u4EE4\u724C\uFF1A${input.token}`,
    `\u67E5\u8BE2\u94FE\u63A5\uFF1A${queryUrl}`,
    ``,
    `\u8BF7\u59A5\u5584\u4FDD\u7BA1\u8FFD\u8E2A\u4EE4\u724C\uFF0C\u53EF\u51ED\u5176\u67E5\u8BE2\u63D0\u4EA4\u72B6\u6001\u3002`
  ].join("\n");
  return sendMail(env2, { to: email, subject, text });
}
__name(notifyStatus, "notifyStatus");

// src/ops/quota.ts
var DEFAULT_REQUESTS_PER_DAY = 8e4;
function evaluateQuota(usage, thresholds) {
  const limit = thresholds.requestsPerDay;
  const ratio = limit > 0 ? usage.requestsToday / limit : 0;
  let level = "ok";
  if (ratio >= 1) level = "critical";
  else if (ratio >= 0.8) level = "warn";
  const percent = Math.round(ratio * 100);
  const message = level === "ok" ? `\u914D\u989D\u6B63\u5E38\uFF08${percent}%\uFF09` : level === "warn" ? `\u914D\u989D\u63A5\u8FD1\u9608\u503C\uFF08${percent}%\uFF09` : `\u914D\u989D\u5DF2\u8D85\u9608\u503C\uFF08${percent}%\uFF09`;
  return { level, ratio, message };
}
__name(evaluateQuota, "evaluateQuota");
async function runQuotaCheck(env2, usage) {
  const parsed = Number(env2.QUOTA_ALERT_THRESHOLD ?? `${DEFAULT_REQUESTS_PER_DAY}`);
  const requestsPerDay = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REQUESTS_PER_DAY;
  const evaluation = evaluateQuota(usage ?? { requestsToday: 0 }, { requestsPerDay });
  if (evaluation.level === "ok") {
    return { evaluation, alerted: false, mailed: false };
  }
  let mailed = false;
  const admin = env2.ADMIN_FALLBACK_EMAIL?.trim();
  if (admin) {
    const result = await sendMail(env2, {
      to: admin,
      subject: "[\u5170\u53F0] \u514D\u8D39\u914D\u989D\u544A\u8B66",
      text: evaluation.message
    });
    mailed = result.sent;
  }
  await recordAudit(env2.DB, {
    actor: null,
    action: "ops.quota.alert",
    target: null,
    detail: { level: evaluation.level, ratio: evaluation.ratio, threshold: requestsPerDay }
  });
  return { evaluation, alerted: true, mailed };
}
__name(runQuotaCheck, "runQuotaCheck");

// src/ops/cron.ts
async function handleScheduled(_controller, env2, _ctx) {
  const result = await runQuotaCheck(env2);
  console.log(
    "ops.cron.quota",
    JSON.stringify({
      level: result.evaluation.level,
      ratio: result.evaluation.ratio,
      alerted: result.alerted,
      mailed: result.mailed
    })
  );
}
__name(handleScheduled, "handleScheduled");

// src/r2/keys.ts
var PLATFORM_INDEX_KEY = "index.json";
var SEARCH_INDEX_KEY = "search/index.json";
function schemaKey(slug, schemaVersion) {
  return `schemas/${slug}/${schemaVersion}.json`;
}
__name(schemaKey, "schemaKey");
function manifestKey(slug) {
  return `${slug}/manifest.json`;
}
__name(manifestKey, "manifestKey");
function latestPointerKey(slug) {
  return `${slug}/latest.json`;
}
__name(latestPointerKey, "latestPointerKey");
function previewPointerKey(slug) {
  return `${slug}/preview.json`;
}
__name(previewPointerKey, "previewPointerKey");
function dataSnapshotKey(slug, dataVersion) {
  return `${slug}/versions/${dataVersion}.json`;
}
__name(dataSnapshotKey, "dataSnapshotKey");
function datasetSearchIndexKey(slug) {
  return `${slug}/search-index.json`;
}
__name(datasetSearchIndexKey, "datasetSearchIndexKey");
var IMMUTABLE_PATTERNS = [
  /^schemas\/[a-z0-9-]+\/[0-9A-Za-z.-]+\.json$/,
  /^[a-z0-9-]+\/versions\/[0-9A-Za-z.-]+\.json$/
];
var POINTER_PATTERNS = [/^[a-z0-9-]+\/latest\.json$/, /^[a-z0-9-]+\/preview\.json$/];
function cacheClassForKey(key) {
  if (IMMUTABLE_PATTERNS.some((re) => re.test(key))) return "immutable";
  if (POINTER_PATTERNS.some((re) => re.test(key))) return "pointer";
  return "index";
}
__name(cacheClassForKey, "cacheClassForKey");
var CACHE_CONTROL = {
  immutable: "public, max-age=31536000, immutable",
  pointer: "public, max-age=60, must-revalidate",
  index: "public, max-age=300"
};
function cacheControlForKey(key) {
  return CACHE_CONTROL[cacheClassForKey(key)];
}
__name(cacheControlForKey, "cacheControlForKey");
var PUBLIC_PATTERNS = [
  /^index\.json$/,
  /^schemas\/[a-z0-9-]+\/[0-9A-Za-z.-]+\.json$/,
  /^search\/index\.json$/,
  /^[a-z0-9-]+\/manifest\.json$/,
  /^[a-z0-9-]+\/latest\.json$/,
  /^[a-z0-9-]+\/preview\.json$/,
  /^[a-z0-9-]+\/versions\/[0-9A-Za-z.-]+\.json$/,
  /^[a-z0-9-]+\/search-index\.json$/
];
function r2KeyForPublicPath(pathname) {
  const normalized = pathname.replace(/^\/+/, "");
  if (normalized === "") return null;
  return PUBLIC_PATTERNS.some((re) => re.test(normalized)) ? normalized : null;
}
__name(r2KeyForPublicPath, "r2KeyForPublicPath");

// src/datasets/repository.ts
var FIRST_VERSION = "1.0.0";
async function getDatasetById(env2, id) {
  const row = await env2.DB.prepare("SELECT * FROM dataset WHERE id = ?").bind(id).first();
  if (!row) throw new NotFoundError("dataset_not_found", `\u6570\u636E\u96C6\u4E0D\u5B58\u5728\uFF1A${id}`);
  return row;
}
__name(getDatasetById, "getDatasetById");
async function getDatasetBySlug(env2, slug) {
  return env2.DB.prepare("SELECT * FROM dataset WHERE slug = ?").bind(slug).first();
}
__name(getDatasetBySlug, "getDatasetBySlug");
async function listDatasets(env2) {
  const result = await env2.DB.prepare("SELECT * FROM dataset ORDER BY slug ASC").all();
  return result.results ?? [];
}
__name(listDatasets, "listDatasets");
async function getSchemaVersion(env2, datasetId, version2) {
  const row = await env2.DB.prepare(
    "SELECT * FROM schema_version WHERE dataset_id = ? AND version = ?"
  ).bind(datasetId, version2).first();
  if (!row) {
    throw new NotFoundError("schema_version_not_found", `Schema \u7248\u672C\u4E0D\u5B58\u5728\uFF1A${version2}`);
  }
  return row;
}
__name(getSchemaVersion, "getSchemaVersion");
async function listSchemaVersions(env2, datasetId) {
  const result = await env2.DB.prepare(
    "SELECT * FROM schema_version WHERE dataset_id = ? ORDER BY created_at ASC"
  ).bind(datasetId).all();
  return result.results ?? [];
}
__name(listSchemaVersions, "listSchemaVersions");
async function createDataset(env2, input) {
  const existing = await getDatasetBySlug(env2, input.slug);
  if (existing) {
    throw new ConflictError("slug_exists", `slug \u5DF2\u88AB\u5360\u7528\uFF1A${input.slug}`, { slug: input.slug });
  }
  const datasetId = newId();
  const createdAt = nowIso();
  const dataset = {
    id: datasetId,
    slug: input.slug,
    title: input.title,
    current_schema_version: null,
    current_data_version: null,
    current_preview_version: null,
    created_at: createdAt
  };
  await env2.DB.batch([
    env2.DB.prepare(
      "INSERT INTO dataset (id, slug, title, current_schema_version, created_at) VALUES (?, ?, ?, NULL, ?)"
    ).bind(datasetId, input.slug, input.title, createdAt),
    env2.DB.prepare(
      "INSERT INTO schema_version (id, dataset_id, version, json_schema, status, created_at) VALUES (?, ?, ?, ?, 'draft', ?)"
    ).bind(newId(), datasetId, FIRST_VERSION, JSON.stringify(input.schema), createdAt),
    auditStatement(env2.DB, {
      actor: input.actor,
      action: "dataset.register",
      target: input.slug,
      detail: { version: FIRST_VERSION }
    })
  ]);
  return dataset;
}
__name(createDataset, "createDataset");
async function addSchemaVersion(env2, input) {
  const dataset = await getDatasetById(env2, input.datasetId);
  const duplicate = await env2.DB.prepare(
    "SELECT id FROM schema_version WHERE dataset_id = ? AND version = ?"
  ).bind(input.datasetId, input.version).first();
  if (duplicate) {
    throw new ConflictError("schema_version_exists", `Schema \u7248\u672C\u5DF2\u5B58\u5728\uFF1A${input.version}`);
  }
  const row = {
    id: newId(),
    dataset_id: input.datasetId,
    version: input.version,
    json_schema: JSON.stringify(input.schema),
    status: "draft",
    created_at: nowIso()
  };
  await env2.DB.batch([
    env2.DB.prepare(
      "INSERT INTO schema_version (id, dataset_id, version, json_schema, status, created_at) VALUES (?, ?, ?, ?, 'draft', ?)"
    ).bind(row.id, row.dataset_id, row.version, row.json_schema, row.created_at),
    auditStatement(env2.DB, {
      actor: input.actor,
      action: "schema.version.add",
      target: `${dataset.slug}@${input.version}`
    })
  ]);
  return row;
}
__name(addSchemaVersion, "addSchemaVersion");

// src/lib/body.ts
async function readJsonBody(c) {
  let parsed;
  try {
    parsed = await c.req.json();
  } catch {
    throw new BadRequestError("invalid_body", "\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F\u5408\u6CD5 JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestError("invalid_body", "\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F JSON \u5BF9\u8C61");
  }
  return parsed;
}
__name(readJsonBody, "readJsonBody");
function asString(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
__name(asString, "asString");

// src/r2/store.ts
var JSON_CONTENT_TYPE = "application/json; charset=utf-8";
async function readJson(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return null;
  return JSON.parse(await object.text());
}
__name(readJson, "readJson");
async function putImmutable(bucket, key, value) {
  const existing = await bucket.head(key);
  if (existing) {
    throw new ConflictError("immutable_key_exists", `R2 \u4E2D\u5DF2\u5B58\u5728\u4E0D\u53EF\u53D8\u5BF9\u8C61\uFF0C\u62D2\u7EDD\u8986\u76D6\uFF1A${key}`, {
      key
    });
  }
  return putReplaceable(bucket, key, value);
}
__name(putImmutable, "putImmutable");
async function putReplaceable(bucket, key, value) {
  const cacheControl = cacheControlForKey(key);
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: JSON_CONTENT_TYPE, cacheControl }
  });
  return { key, cacheControl, contentType: JSON_CONTENT_TYPE };
}
__name(putReplaceable, "putReplaceable");

// src/r2/catalog.ts
var EMPTY_CATALOG = { generatedAt: "", datasets: [] };
async function readCatalog(bucket) {
  return await readJson(bucket, PLATFORM_INDEX_KEY) ?? EMPTY_CATALOG;
}
__name(readCatalog, "readCatalog");
async function upsertCatalogEntry(bucket, entry) {
  const existing = await readCatalog(bucket);
  const datasets = existing.datasets.filter((d) => d.slug !== entry.slug);
  datasets.push(entry);
  datasets.sort((a, b) => a.slug.localeCompare(b.slug));
  const next = { generatedAt: (/* @__PURE__ */ new Date()).toISOString(), datasets };
  await putReplaceable(bucket, PLATFORM_INDEX_KEY, next);
  return next;
}
__name(upsertCatalogEntry, "upsertCatalogEntry");

// src/schema/compat.ts
function parseVersion(version2) {
  const match2 = /^(\d+)\.(\d+)\.(\d+)$/.exec(version2);
  if (!match2) return null;
  return { major: Number(match2[1]), minor: Number(match2[2]), patch: Number(match2[3]) };
}
__name(parseVersion, "parseVersion");
function formatVersion(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}
__name(formatVersion, "formatVersion");
function bumpVersion(current, kind) {
  if (current === null || kind === "initial") return "1.0.0";
  const parsed = parseVersion(current);
  if (!parsed) throw new BadRequestError("invalid_version", `\u5F53\u524D\u7248\u672C\u53F7\u975E\u6CD5\uFF1A${current}`);
  if (kind === "compatible") {
    return formatVersion({ major: parsed.major, minor: parsed.minor + 1, patch: 0 });
  }
  return formatVersion({ major: parsed.major + 1, minor: 0, patch: 0 });
}
__name(bumpVersion, "bumpVersion");
function asObjectSchema(schema) {
  return schema ?? {};
}
__name(asObjectSchema, "asObjectSchema");
function classifyChange(prev, next) {
  const p = asObjectSchema(prev);
  const n = asObjectSchema(next);
  if (p.type !== n.type) return "breaking";
  if (p.enum !== void 0 || n.enum !== void 0) {
    const prevEnum = new Set((p.enum ?? []).map((v) => JSON.stringify(v)));
    const nextEnum = new Set((n.enum ?? []).map((v) => JSON.stringify(v)));
    if (n.enum !== void 0 && p.enum === void 0) return "breaking";
    for (const value of prevEnum) {
      if (!nextEnum.has(value)) return "breaking";
    }
  }
  const prevRequired = new Set(p.required ?? []);
  const nextRequired = new Set(n.required ?? []);
  const prevProps = p.properties ?? {};
  const nextProps = n.properties ?? {};
  for (const key of Object.keys(prevProps)) {
    if (!(key in nextProps)) return "breaking";
    if (classifyChange(prevProps[key], nextProps[key]) === "breaking") return "breaking";
  }
  for (const key of Object.keys(nextProps)) {
    if (key in prevProps) continue;
    if (nextRequired.has(key) && !prevRequired.has(key)) return "breaking";
  }
  for (const key of nextRequired) {
    if (!prevRequired.has(key) && key in prevProps) return "breaking";
  }
  return "compatible";
}
__name(classifyChange, "classifyChange");

// src/r2/manifest.ts
function buildManifest(input) {
  return {
    slug: input.slug,
    title: input.title,
    schema: {
      version: input.schemaVersion,
      url: `/schemas/${input.slug}/${input.schemaVersion}.json`
    },
    dataVersions: (input.dataVersions ?? []).slice().sort((a, b) => a.version.localeCompare(b.version, void 0, { numeric: true })),
    latest: input.latest ?? null,
    preview: input.preview ?? null,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildManifest, "buildManifest");
async function writeManifest(bucket, manifest) {
  await putReplaceable(bucket, manifestKey(manifest.slug), manifest);
}
__name(writeManifest, "writeManifest");

// node_modules/@cfworker/json-schema/dist/esm/deep-compare-strict.js
function deepCompareStrict(a, b) {
  const typeofa = typeof a;
  if (typeofa !== typeof b) {
    return false;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return false;
    }
    const length = a.length;
    if (length !== b.length) {
      return false;
    }
    for (let i = 0; i < length; i++) {
      if (!deepCompareStrict(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (typeofa === "object") {
    if (!a || !b) {
      return a === b;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    const length = aKeys.length;
    if (length !== bKeys.length) {
      return false;
    }
    for (const k of aKeys) {
      if (!deepCompareStrict(a[k], b[k])) {
        return false;
      }
    }
    return true;
  }
  return a === b;
}
__name(deepCompareStrict, "deepCompareStrict");

// node_modules/@cfworker/json-schema/dist/esm/pointer.js
function encodePointer(p) {
  return encodeURI(escapePointer(p));
}
__name(encodePointer, "encodePointer");
function escapePointer(p) {
  return p.replace(/~/g, "~0").replace(/\//g, "~1");
}
__name(escapePointer, "escapePointer");

// node_modules/@cfworker/json-schema/dist/esm/dereference.js
var schemaArrayKeyword = {
  prefixItems: true,
  items: true,
  allOf: true,
  anyOf: true,
  oneOf: true
};
var schemaMapKeyword = {
  $defs: true,
  definitions: true,
  properties: true,
  patternProperties: true,
  dependentSchemas: true
};
var ignoredKeyword = {
  id: true,
  $id: true,
  $ref: true,
  $schema: true,
  $anchor: true,
  $vocabulary: true,
  $comment: true,
  default: true,
  enum: true,
  const: true,
  required: true,
  type: true,
  maximum: true,
  minimum: true,
  exclusiveMaximum: true,
  exclusiveMinimum: true,
  multipleOf: true,
  maxLength: true,
  minLength: true,
  pattern: true,
  format: true,
  maxItems: true,
  minItems: true,
  uniqueItems: true,
  maxProperties: true,
  minProperties: true
};
var initialBaseURI = typeof self !== "undefined" && self.location && self.location.origin !== "null" ? new URL(self.location.origin + self.location.pathname + location.search) : new URL("https://github.com/cfworker");
function dereference(schema, lookup = /* @__PURE__ */ Object.create(null), baseURI = initialBaseURI, basePointer = "") {
  if (schema && typeof schema === "object" && !Array.isArray(schema)) {
    const id = schema.$id || schema.id;
    if (id) {
      const url = new URL(id, baseURI.href);
      if (url.hash.length > 1) {
        lookup[url.href] = schema;
      } else {
        url.hash = "";
        if (basePointer === "") {
          baseURI = url;
        } else {
          dereference(schema, lookup, baseURI);
        }
      }
    }
  } else if (schema !== true && schema !== false) {
    return lookup;
  }
  const schemaURI = baseURI.href + (basePointer ? "#" + basePointer : "");
  if (lookup[schemaURI] !== void 0) {
    throw new Error(`Duplicate schema URI "${schemaURI}".`);
  }
  lookup[schemaURI] = schema;
  if (schema === true || schema === false) {
    return lookup;
  }
  if (schema.__absolute_uri__ === void 0) {
    Object.defineProperty(schema, "__absolute_uri__", {
      enumerable: false,
      value: schemaURI
    });
  }
  if (schema.$ref && schema.__absolute_ref__ === void 0) {
    const url = new URL(schema.$ref, baseURI.href);
    url.hash = url.hash;
    Object.defineProperty(schema, "__absolute_ref__", {
      enumerable: false,
      value: url.href
    });
  }
  if (schema.$recursiveRef && schema.__absolute_recursive_ref__ === void 0) {
    const url = new URL(schema.$recursiveRef, baseURI.href);
    url.hash = url.hash;
    Object.defineProperty(schema, "__absolute_recursive_ref__", {
      enumerable: false,
      value: url.href
    });
  }
  if (schema.$anchor) {
    const url = new URL("#" + schema.$anchor, baseURI.href);
    lookup[url.href] = schema;
  }
  for (let key in schema) {
    if (ignoredKeyword[key]) {
      continue;
    }
    const keyBase = `${basePointer}/${encodePointer(key)}`;
    const subSchema = schema[key];
    if (Array.isArray(subSchema)) {
      if (schemaArrayKeyword[key]) {
        const length = subSchema.length;
        for (let i = 0; i < length; i++) {
          dereference(subSchema[i], lookup, baseURI, `${keyBase}/${i}`);
        }
      }
    } else if (schemaMapKeyword[key]) {
      for (let subKey in subSchema) {
        dereference(subSchema[subKey], lookup, baseURI, `${keyBase}/${encodePointer(subKey)}`);
      }
    } else {
      dereference(subSchema, lookup, baseURI, keyBase);
    }
  }
  return lookup;
}
__name(dereference, "dereference");

// node_modules/@cfworker/json-schema/dist/esm/format.js
var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d(?::?\d\d)?)?$/i;
var HOSTNAME = /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i;
var URIREF = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
var URITEMPLATE = /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
var URL_ = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu;
var UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
var JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
var JSON_POINTER_URI_FRAGMENT = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
var RELATIVE_JSON_POINTER = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;
var EMAIL = /* @__PURE__ */ __name((input) => {
  if (input[0] === '"')
    return false;
  const [name, host, ...rest] = input.split("@");
  if (!name || !host || rest.length !== 0 || name.length > 64 || host.length > 253)
    return false;
  if (name[0] === "." || name.endsWith(".") || name.includes(".."))
    return false;
  if (!/^[a-z0-9.-]+$/i.test(host) || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(name))
    return false;
  return host.split(".").every((part) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(part));
}, "EMAIL");
var IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
var IPV6 = /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i;
var DURATION = /* @__PURE__ */ __name((input) => input.length > 1 && input.length < 80 && (/^P\d+([.,]\d+)?W$/.test(input) || /^P[\dYMDTHS]*(\d[.,]\d+)?[YMDHS]$/.test(input) && /^P([.,\d]+Y)?([.,\d]+M)?([.,\d]+D)?(T([.,\d]+H)?([.,\d]+M)?([.,\d]+S)?)?$/.test(input)), "DURATION");
function bind(r) {
  return r.test.bind(r);
}
__name(bind, "bind");
var format = {
  date,
  time: time3.bind(void 0, false),
  "date-time": date_time,
  duration: DURATION,
  uri,
  "uri-reference": bind(URIREF),
  "uri-template": bind(URITEMPLATE),
  url: bind(URL_),
  email: EMAIL,
  hostname: bind(HOSTNAME),
  ipv4: bind(IPV4),
  ipv6: bind(IPV6),
  regex,
  uuid: bind(UUID),
  "json-pointer": bind(JSON_POINTER),
  "json-pointer-uri-fragment": bind(JSON_POINTER_URI_FRAGMENT),
  "relative-json-pointer": bind(RELATIVE_JSON_POINTER)
};
function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
__name(isLeapYear, "isLeapYear");
function date(str) {
  const matches = str.match(DATE);
  if (!matches)
    return false;
  const year = +matches[1];
  const month = +matches[2];
  const day = +matches[3];
  return month >= 1 && month <= 12 && day >= 1 && day <= (month == 2 && isLeapYear(year) ? 29 : DAYS[month]);
}
__name(date, "date");
function time3(full, str) {
  const matches = str.match(TIME);
  if (!matches)
    return false;
  const hour = +matches[1];
  const minute = +matches[2];
  const second = +matches[3];
  const timeZone = !!matches[5];
  return (hour <= 23 && minute <= 59 && second <= 59 || hour == 23 && minute == 59 && second == 60) && (!full || timeZone);
}
__name(time3, "time");
var DATE_TIME_SEPARATOR = /t|\s/i;
function date_time(str) {
  const dateTime = str.split(DATE_TIME_SEPARATOR);
  return dateTime.length == 2 && date(dateTime[0]) && time3(true, dateTime[1]);
}
__name(date_time, "date_time");
var NOT_URI_FRAGMENT = /\/|:/;
var URI_PATTERN = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
function uri(str) {
  return NOT_URI_FRAGMENT.test(str) && URI_PATTERN.test(str);
}
__name(uri, "uri");
var Z_ANCHOR = /[^\\]\\Z/;
function regex(str) {
  if (Z_ANCHOR.test(str))
    return false;
  try {
    new RegExp(str, "u");
    return true;
  } catch (e) {
    return false;
  }
}
__name(regex, "regex");

// node_modules/@cfworker/json-schema/dist/esm/types.js
var OutputFormat;
(function(OutputFormat2) {
  OutputFormat2[OutputFormat2["Flag"] = 1] = "Flag";
  OutputFormat2[OutputFormat2["Basic"] = 2] = "Basic";
  OutputFormat2[OutputFormat2["Detailed"] = 4] = "Detailed";
})(OutputFormat || (OutputFormat = {}));

// node_modules/@cfworker/json-schema/dist/esm/ucs2-length.js
function ucs2length(s) {
  let result = 0;
  let length = s.length;
  let index = 0;
  let charCode;
  while (index < length) {
    result++;
    charCode = s.charCodeAt(index++);
    if (charCode >= 55296 && charCode <= 56319 && index < length) {
      charCode = s.charCodeAt(index);
      if ((charCode & 64512) == 56320) {
        index++;
      }
    }
  }
  return result;
}
__name(ucs2length, "ucs2length");

// node_modules/@cfworker/json-schema/dist/esm/validate.js
function validate(instance, schema, draft = "2019-09", lookup = dereference(schema), shortCircuit = true, recursiveAnchor = null, instanceLocation = "#", schemaLocation = "#", evaluated = /* @__PURE__ */ Object.create(null)) {
  if (schema === true) {
    return { valid: true, errors: [] };
  }
  if (schema === false) {
    return {
      valid: false,
      errors: [
        {
          instanceLocation,
          keyword: "false",
          keywordLocation: instanceLocation,
          error: "False boolean schema."
        }
      ]
    };
  }
  const rawInstanceType = typeof instance;
  let instanceType;
  switch (rawInstanceType) {
    case "boolean":
    case "number":
    case "string":
      instanceType = rawInstanceType;
      break;
    case "object":
      if (instance === null) {
        instanceType = "null";
      } else if (Array.isArray(instance)) {
        instanceType = "array";
      } else {
        instanceType = "object";
      }
      break;
    default:
      throw new Error(`Instances of "${rawInstanceType}" type are not supported.`);
  }
  const { $ref, $recursiveRef, $recursiveAnchor, type: $type, const: $const, enum: $enum, required: $required, not: $not, anyOf: $anyOf, allOf: $allOf, oneOf: $oneOf, if: $if, then: $then, else: $else, format: $format, properties: $properties, patternProperties: $patternProperties, additionalProperties: $additionalProperties, unevaluatedProperties: $unevaluatedProperties, minProperties: $minProperties, maxProperties: $maxProperties, propertyNames: $propertyNames, dependentRequired: $dependentRequired, dependentSchemas: $dependentSchemas, dependencies: $dependencies, prefixItems: $prefixItems, items: $items, additionalItems: $additionalItems, unevaluatedItems: $unevaluatedItems, contains: $contains, minContains: $minContains, maxContains: $maxContains, minItems: $minItems, maxItems: $maxItems, uniqueItems: $uniqueItems, minimum: $minimum, maximum: $maximum, exclusiveMinimum: $exclusiveMinimum, exclusiveMaximum: $exclusiveMaximum, multipleOf: $multipleOf, minLength: $minLength, maxLength: $maxLength, pattern: $pattern, __absolute_ref__, __absolute_recursive_ref__ } = schema;
  const errors = [];
  if ($recursiveAnchor === true && recursiveAnchor === null) {
    recursiveAnchor = schema;
  }
  if ($recursiveRef === "#") {
    const refSchema = recursiveAnchor === null ? lookup[__absolute_recursive_ref__] : recursiveAnchor;
    const keywordLocation = `${schemaLocation}/$recursiveRef`;
    const result = validate(instance, recursiveAnchor === null ? schema : recursiveAnchor, draft, lookup, shortCircuit, refSchema, instanceLocation, keywordLocation, evaluated);
    if (!result.valid) {
      errors.push({
        instanceLocation,
        keyword: "$recursiveRef",
        keywordLocation,
        error: "A subschema had errors."
      }, ...result.errors);
    }
  }
  if ($ref !== void 0) {
    const uri2 = __absolute_ref__ || $ref;
    const refSchema = lookup[uri2];
    if (refSchema === void 0) {
      let message = `Unresolved $ref "${$ref}".`;
      if (__absolute_ref__ && __absolute_ref__ !== $ref) {
        message += `  Absolute URI "${__absolute_ref__}".`;
      }
      message += `
Known schemas:
- ${Object.keys(lookup).join("\n- ")}`;
      throw new Error(message);
    }
    const keywordLocation = `${schemaLocation}/$ref`;
    const result = validate(instance, refSchema, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, keywordLocation, evaluated);
    if (!result.valid) {
      errors.push({
        instanceLocation,
        keyword: "$ref",
        keywordLocation,
        error: "A subschema had errors."
      }, ...result.errors);
    }
    if (draft === "4" || draft === "7") {
      return { valid: errors.length === 0, errors };
    }
  }
  if (Array.isArray($type)) {
    let length = $type.length;
    let valid = false;
    for (let i = 0; i < length; i++) {
      if (instanceType === $type[i] || $type[i] === "integer" && instanceType === "number" && instance % 1 === 0 && instance === instance) {
        valid = true;
        break;
      }
    }
    if (!valid) {
      errors.push({
        instanceLocation,
        keyword: "type",
        keywordLocation: `${schemaLocation}/type`,
        error: `Instance type "${instanceType}" is invalid. Expected "${$type.join('", "')}".`
      });
    }
  } else if ($type === "integer") {
    if (instanceType !== "number" || instance % 1 || instance !== instance) {
      errors.push({
        instanceLocation,
        keyword: "type",
        keywordLocation: `${schemaLocation}/type`,
        error: `Instance type "${instanceType}" is invalid. Expected "${$type}".`
      });
    }
  } else if ($type !== void 0 && instanceType !== $type) {
    errors.push({
      instanceLocation,
      keyword: "type",
      keywordLocation: `${schemaLocation}/type`,
      error: `Instance type "${instanceType}" is invalid. Expected "${$type}".`
    });
  }
  if ($const !== void 0) {
    if (instanceType === "object" || instanceType === "array") {
      if (!deepCompareStrict(instance, $const)) {
        errors.push({
          instanceLocation,
          keyword: "const",
          keywordLocation: `${schemaLocation}/const`,
          error: `Instance does not match ${JSON.stringify($const)}.`
        });
      }
    } else if (instance !== $const) {
      errors.push({
        instanceLocation,
        keyword: "const",
        keywordLocation: `${schemaLocation}/const`,
        error: `Instance does not match ${JSON.stringify($const)}.`
      });
    }
  }
  if ($enum !== void 0) {
    if (instanceType === "object" || instanceType === "array") {
      if (!$enum.some((value) => deepCompareStrict(instance, value))) {
        errors.push({
          instanceLocation,
          keyword: "enum",
          keywordLocation: `${schemaLocation}/enum`,
          error: `Instance does not match any of ${JSON.stringify($enum)}.`
        });
      }
    } else if (!$enum.some((value) => instance === value)) {
      errors.push({
        instanceLocation,
        keyword: "enum",
        keywordLocation: `${schemaLocation}/enum`,
        error: `Instance does not match any of ${JSON.stringify($enum)}.`
      });
    }
  }
  if ($not !== void 0) {
    const keywordLocation = `${schemaLocation}/not`;
    const result = validate(instance, $not, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, keywordLocation);
    if (result.valid) {
      errors.push({
        instanceLocation,
        keyword: "not",
        keywordLocation,
        error: 'Instance matched "not" schema.'
      });
    }
  }
  let subEvaluateds = [];
  if ($anyOf !== void 0) {
    const keywordLocation = `${schemaLocation}/anyOf`;
    const errorsLength = errors.length;
    let anyValid = false;
    for (let i = 0; i < $anyOf.length; i++) {
      const subSchema = $anyOf[i];
      const subEvaluated = Object.create(evaluated);
      const result = validate(instance, subSchema, draft, lookup, shortCircuit, $recursiveAnchor === true ? recursiveAnchor : null, instanceLocation, `${keywordLocation}/${i}`, subEvaluated);
      errors.push(...result.errors);
      anyValid = anyValid || result.valid;
      if (result.valid) {
        subEvaluateds.push(subEvaluated);
      }
    }
    if (anyValid) {
      errors.length = errorsLength;
    } else {
      errors.splice(errorsLength, 0, {
        instanceLocation,
        keyword: "anyOf",
        keywordLocation,
        error: "Instance does not match any subschemas."
      });
    }
  }
  if ($allOf !== void 0) {
    const keywordLocation = `${schemaLocation}/allOf`;
    const errorsLength = errors.length;
    let allValid = true;
    for (let i = 0; i < $allOf.length; i++) {
      const subSchema = $allOf[i];
      const subEvaluated = Object.create(evaluated);
      const result = validate(instance, subSchema, draft, lookup, shortCircuit, $recursiveAnchor === true ? recursiveAnchor : null, instanceLocation, `${keywordLocation}/${i}`, subEvaluated);
      errors.push(...result.errors);
      allValid = allValid && result.valid;
      if (result.valid) {
        subEvaluateds.push(subEvaluated);
      }
    }
    if (allValid) {
      errors.length = errorsLength;
    } else {
      errors.splice(errorsLength, 0, {
        instanceLocation,
        keyword: "allOf",
        keywordLocation,
        error: `Instance does not match every subschema.`
      });
    }
  }
  if ($oneOf !== void 0) {
    const keywordLocation = `${schemaLocation}/oneOf`;
    const errorsLength = errors.length;
    const matches = $oneOf.filter((subSchema, i) => {
      const subEvaluated = Object.create(evaluated);
      const result = validate(instance, subSchema, draft, lookup, shortCircuit, $recursiveAnchor === true ? recursiveAnchor : null, instanceLocation, `${keywordLocation}/${i}`, subEvaluated);
      errors.push(...result.errors);
      if (result.valid) {
        subEvaluateds.push(subEvaluated);
      }
      return result.valid;
    }).length;
    if (matches === 1) {
      errors.length = errorsLength;
    } else {
      errors.splice(errorsLength, 0, {
        instanceLocation,
        keyword: "oneOf",
        keywordLocation,
        error: `Instance does not match exactly one subschema (${matches} matches).`
      });
    }
  }
  if (instanceType === "object" || instanceType === "array") {
    Object.assign(evaluated, ...subEvaluateds);
  }
  if ($if !== void 0) {
    const keywordLocation = `${schemaLocation}/if`;
    const conditionResult = validate(instance, $if, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, keywordLocation, evaluated).valid;
    if (conditionResult) {
      if ($then !== void 0) {
        const thenResult = validate(instance, $then, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${schemaLocation}/then`, evaluated);
        if (!thenResult.valid) {
          errors.push({
            instanceLocation,
            keyword: "if",
            keywordLocation,
            error: `Instance does not match "then" schema.`
          }, ...thenResult.errors);
        }
      }
    } else if ($else !== void 0) {
      const elseResult = validate(instance, $else, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${schemaLocation}/else`, evaluated);
      if (!elseResult.valid) {
        errors.push({
          instanceLocation,
          keyword: "if",
          keywordLocation,
          error: `Instance does not match "else" schema.`
        }, ...elseResult.errors);
      }
    }
  }
  if (instanceType === "object") {
    if ($required !== void 0) {
      for (const key of $required) {
        if (!(key in instance)) {
          errors.push({
            instanceLocation,
            keyword: "required",
            keywordLocation: `${schemaLocation}/required`,
            error: `Instance does not have required property "${key}".`
          });
        }
      }
    }
    const keys = Object.keys(instance);
    if ($minProperties !== void 0 && keys.length < $minProperties) {
      errors.push({
        instanceLocation,
        keyword: "minProperties",
        keywordLocation: `${schemaLocation}/minProperties`,
        error: `Instance does not have at least ${$minProperties} properties.`
      });
    }
    if ($maxProperties !== void 0 && keys.length > $maxProperties) {
      errors.push({
        instanceLocation,
        keyword: "maxProperties",
        keywordLocation: `${schemaLocation}/maxProperties`,
        error: `Instance does not have at least ${$maxProperties} properties.`
      });
    }
    if ($propertyNames !== void 0) {
      const keywordLocation = `${schemaLocation}/propertyNames`;
      for (const key in instance) {
        const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
        const result = validate(key, $propertyNames, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, keywordLocation);
        if (!result.valid) {
          errors.push({
            instanceLocation,
            keyword: "propertyNames",
            keywordLocation,
            error: `Property name "${key}" does not match schema.`
          }, ...result.errors);
        }
      }
    }
    if ($dependentRequired !== void 0) {
      const keywordLocation = `${schemaLocation}/dependantRequired`;
      for (const key in $dependentRequired) {
        if (key in instance) {
          const required = $dependentRequired[key];
          for (const dependantKey of required) {
            if (!(dependantKey in instance)) {
              errors.push({
                instanceLocation,
                keyword: "dependentRequired",
                keywordLocation,
                error: `Instance has "${key}" but does not have "${dependantKey}".`
              });
            }
          }
        }
      }
    }
    if ($dependentSchemas !== void 0) {
      for (const key in $dependentSchemas) {
        const keywordLocation = `${schemaLocation}/dependentSchemas`;
        if (key in instance) {
          const result = validate(instance, $dependentSchemas[key], draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${keywordLocation}/${encodePointer(key)}`, evaluated);
          if (!result.valid) {
            errors.push({
              instanceLocation,
              keyword: "dependentSchemas",
              keywordLocation,
              error: `Instance has "${key}" but does not match dependant schema.`
            }, ...result.errors);
          }
        }
      }
    }
    if ($dependencies !== void 0) {
      const keywordLocation = `${schemaLocation}/dependencies`;
      for (const key in $dependencies) {
        if (key in instance) {
          const propsOrSchema = $dependencies[key];
          if (Array.isArray(propsOrSchema)) {
            for (const dependantKey of propsOrSchema) {
              if (!(dependantKey in instance)) {
                errors.push({
                  instanceLocation,
                  keyword: "dependencies",
                  keywordLocation,
                  error: `Instance has "${key}" but does not have "${dependantKey}".`
                });
              }
            }
          } else {
            const result = validate(instance, propsOrSchema, draft, lookup, shortCircuit, recursiveAnchor, instanceLocation, `${keywordLocation}/${encodePointer(key)}`);
            if (!result.valid) {
              errors.push({
                instanceLocation,
                keyword: "dependencies",
                keywordLocation,
                error: `Instance has "${key}" but does not match dependant schema.`
              }, ...result.errors);
            }
          }
        }
      }
    }
    const thisEvaluated = /* @__PURE__ */ Object.create(null);
    let stop = false;
    if ($properties !== void 0) {
      const keywordLocation = `${schemaLocation}/properties`;
      for (const key in $properties) {
        if (!(key in instance)) {
          continue;
        }
        const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
        const result = validate(instance[key], $properties[key], draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, `${keywordLocation}/${encodePointer(key)}`);
        if (result.valid) {
          evaluated[key] = thisEvaluated[key] = true;
        } else {
          stop = shortCircuit;
          errors.push({
            instanceLocation,
            keyword: "properties",
            keywordLocation,
            error: `Property "${key}" does not match schema.`
          }, ...result.errors);
          if (stop)
            break;
        }
      }
    }
    if (!stop && $patternProperties !== void 0) {
      const keywordLocation = `${schemaLocation}/patternProperties`;
      for (const pattern in $patternProperties) {
        const regex2 = new RegExp(pattern, "u");
        const subSchema = $patternProperties[pattern];
        for (const key in instance) {
          if (!regex2.test(key)) {
            continue;
          }
          const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
          const result = validate(instance[key], subSchema, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, `${keywordLocation}/${encodePointer(pattern)}`);
          if (result.valid) {
            evaluated[key] = thisEvaluated[key] = true;
          } else {
            stop = shortCircuit;
            errors.push({
              instanceLocation,
              keyword: "patternProperties",
              keywordLocation,
              error: `Property "${key}" matches pattern "${pattern}" but does not match associated schema.`
            }, ...result.errors);
          }
        }
      }
    }
    if (!stop && $additionalProperties !== void 0) {
      const keywordLocation = `${schemaLocation}/additionalProperties`;
      for (const key in instance) {
        if (thisEvaluated[key]) {
          continue;
        }
        const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
        const result = validate(instance[key], $additionalProperties, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, keywordLocation);
        if (result.valid) {
          evaluated[key] = true;
        } else {
          stop = shortCircuit;
          errors.push({
            instanceLocation,
            keyword: "additionalProperties",
            keywordLocation,
            error: `Property "${key}" does not match additional properties schema.`
          }, ...result.errors);
        }
      }
    } else if (!stop && $unevaluatedProperties !== void 0) {
      const keywordLocation = `${schemaLocation}/unevaluatedProperties`;
      for (const key in instance) {
        if (!evaluated[key]) {
          const subInstancePointer = `${instanceLocation}/${encodePointer(key)}`;
          const result = validate(instance[key], $unevaluatedProperties, draft, lookup, shortCircuit, recursiveAnchor, subInstancePointer, keywordLocation);
          if (result.valid) {
            evaluated[key] = true;
          } else {
            errors.push({
              instanceLocation,
              keyword: "unevaluatedProperties",
              keywordLocation,
              error: `Property "${key}" does not match unevaluated properties schema.`
            }, ...result.errors);
          }
        }
      }
    }
  } else if (instanceType === "array") {
    if ($maxItems !== void 0 && instance.length > $maxItems) {
      errors.push({
        instanceLocation,
        keyword: "maxItems",
        keywordLocation: `${schemaLocation}/maxItems`,
        error: `Array has too many items (${instance.length} > ${$maxItems}).`
      });
    }
    if ($minItems !== void 0 && instance.length < $minItems) {
      errors.push({
        instanceLocation,
        keyword: "minItems",
        keywordLocation: `${schemaLocation}/minItems`,
        error: `Array has too few items (${instance.length} < ${$minItems}).`
      });
    }
    const length = instance.length;
    let i = 0;
    let stop = false;
    if ($prefixItems !== void 0) {
      const keywordLocation = `${schemaLocation}/prefixItems`;
      const length2 = Math.min($prefixItems.length, length);
      for (; i < length2; i++) {
        const result = validate(instance[i], $prefixItems[i], draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, `${keywordLocation}/${i}`);
        evaluated[i] = true;
        if (!result.valid) {
          stop = shortCircuit;
          errors.push({
            instanceLocation,
            keyword: "prefixItems",
            keywordLocation,
            error: `Items did not match schema.`
          }, ...result.errors);
          if (stop)
            break;
        }
      }
    }
    if ($items !== void 0) {
      const keywordLocation = `${schemaLocation}/items`;
      if (Array.isArray($items)) {
        const length2 = Math.min($items.length, length);
        for (; i < length2; i++) {
          const result = validate(instance[i], $items[i], draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, `${keywordLocation}/${i}`);
          evaluated[i] = true;
          if (!result.valid) {
            stop = shortCircuit;
            errors.push({
              instanceLocation,
              keyword: "items",
              keywordLocation,
              error: `Items did not match schema.`
            }, ...result.errors);
            if (stop)
              break;
          }
        }
      } else {
        for (; i < length; i++) {
          const result = validate(instance[i], $items, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, keywordLocation);
          evaluated[i] = true;
          if (!result.valid) {
            stop = shortCircuit;
            errors.push({
              instanceLocation,
              keyword: "items",
              keywordLocation,
              error: `Items did not match schema.`
            }, ...result.errors);
            if (stop)
              break;
          }
        }
      }
      if (!stop && $additionalItems !== void 0) {
        const keywordLocation2 = `${schemaLocation}/additionalItems`;
        for (; i < length; i++) {
          const result = validate(instance[i], $additionalItems, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, keywordLocation2);
          evaluated[i] = true;
          if (!result.valid) {
            stop = shortCircuit;
            errors.push({
              instanceLocation,
              keyword: "additionalItems",
              keywordLocation: keywordLocation2,
              error: `Items did not match additional items schema.`
            }, ...result.errors);
          }
        }
      }
    }
    if ($contains !== void 0) {
      if (length === 0 && $minContains === void 0) {
        errors.push({
          instanceLocation,
          keyword: "contains",
          keywordLocation: `${schemaLocation}/contains`,
          error: `Array is empty. It must contain at least one item matching the schema.`
        });
      } else if ($minContains !== void 0 && length < $minContains) {
        errors.push({
          instanceLocation,
          keyword: "minContains",
          keywordLocation: `${schemaLocation}/minContains`,
          error: `Array has less items (${length}) than minContains (${$minContains}).`
        });
      } else {
        const keywordLocation = `${schemaLocation}/contains`;
        const errorsLength = errors.length;
        let contained = 0;
        for (let j = 0; j < length; j++) {
          const result = validate(instance[j], $contains, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${j}`, keywordLocation);
          if (result.valid) {
            evaluated[j] = true;
            contained++;
          } else {
            errors.push(...result.errors);
          }
        }
        if (contained >= ($minContains || 0)) {
          errors.length = errorsLength;
        }
        if ($minContains === void 0 && $maxContains === void 0 && contained === 0) {
          errors.splice(errorsLength, 0, {
            instanceLocation,
            keyword: "contains",
            keywordLocation,
            error: `Array does not contain item matching schema.`
          });
        } else if ($minContains !== void 0 && contained < $minContains) {
          errors.push({
            instanceLocation,
            keyword: "minContains",
            keywordLocation: `${schemaLocation}/minContains`,
            error: `Array must contain at least ${$minContains} items matching schema. Only ${contained} items were found.`
          });
        } else if ($maxContains !== void 0 && contained > $maxContains) {
          errors.push({
            instanceLocation,
            keyword: "maxContains",
            keywordLocation: `${schemaLocation}/maxContains`,
            error: `Array may contain at most ${$maxContains} items matching schema. ${contained} items were found.`
          });
        }
      }
    }
    if (!stop && $unevaluatedItems !== void 0) {
      const keywordLocation = `${schemaLocation}/unevaluatedItems`;
      for (i; i < length; i++) {
        if (evaluated[i]) {
          continue;
        }
        const result = validate(instance[i], $unevaluatedItems, draft, lookup, shortCircuit, recursiveAnchor, `${instanceLocation}/${i}`, keywordLocation);
        evaluated[i] = true;
        if (!result.valid) {
          errors.push({
            instanceLocation,
            keyword: "unevaluatedItems",
            keywordLocation,
            error: `Items did not match unevaluated items schema.`
          }, ...result.errors);
        }
      }
    }
    if ($uniqueItems) {
      for (let j = 0; j < length; j++) {
        const a = instance[j];
        const ao = typeof a === "object" && a !== null;
        for (let k = 0; k < length; k++) {
          if (j === k) {
            continue;
          }
          const b = instance[k];
          const bo = typeof b === "object" && b !== null;
          if (a === b || ao && bo && deepCompareStrict(a, b)) {
            errors.push({
              instanceLocation,
              keyword: "uniqueItems",
              keywordLocation: `${schemaLocation}/uniqueItems`,
              error: `Duplicate items at indexes ${j} and ${k}.`
            });
            j = Number.MAX_SAFE_INTEGER;
            k = Number.MAX_SAFE_INTEGER;
          }
        }
      }
    }
  } else if (instanceType === "number") {
    if (draft === "4") {
      if ($minimum !== void 0 && ($exclusiveMinimum === true && instance <= $minimum || instance < $minimum)) {
        errors.push({
          instanceLocation,
          keyword: "minimum",
          keywordLocation: `${schemaLocation}/minimum`,
          error: `${instance} is less than ${$exclusiveMinimum ? "or equal to " : ""} ${$minimum}.`
        });
      }
      if ($maximum !== void 0 && ($exclusiveMaximum === true && instance >= $maximum || instance > $maximum)) {
        errors.push({
          instanceLocation,
          keyword: "maximum",
          keywordLocation: `${schemaLocation}/maximum`,
          error: `${instance} is greater than ${$exclusiveMaximum ? "or equal to " : ""} ${$maximum}.`
        });
      }
    } else {
      if ($minimum !== void 0 && instance < $minimum) {
        errors.push({
          instanceLocation,
          keyword: "minimum",
          keywordLocation: `${schemaLocation}/minimum`,
          error: `${instance} is less than ${$minimum}.`
        });
      }
      if ($maximum !== void 0 && instance > $maximum) {
        errors.push({
          instanceLocation,
          keyword: "maximum",
          keywordLocation: `${schemaLocation}/maximum`,
          error: `${instance} is greater than ${$maximum}.`
        });
      }
      if ($exclusiveMinimum !== void 0 && instance <= $exclusiveMinimum) {
        errors.push({
          instanceLocation,
          keyword: "exclusiveMinimum",
          keywordLocation: `${schemaLocation}/exclusiveMinimum`,
          error: `${instance} is less than ${$exclusiveMinimum}.`
        });
      }
      if ($exclusiveMaximum !== void 0 && instance >= $exclusiveMaximum) {
        errors.push({
          instanceLocation,
          keyword: "exclusiveMaximum",
          keywordLocation: `${schemaLocation}/exclusiveMaximum`,
          error: `${instance} is greater than or equal to ${$exclusiveMaximum}.`
        });
      }
    }
    if ($multipleOf !== void 0) {
      const remainder = instance % $multipleOf;
      if (Math.abs(0 - remainder) >= 11920929e-14 && Math.abs($multipleOf - remainder) >= 11920929e-14) {
        errors.push({
          instanceLocation,
          keyword: "multipleOf",
          keywordLocation: `${schemaLocation}/multipleOf`,
          error: `${instance} is not a multiple of ${$multipleOf}.`
        });
      }
    }
  } else if (instanceType === "string") {
    const length = $minLength === void 0 && $maxLength === void 0 ? 0 : ucs2length(instance);
    if ($minLength !== void 0 && length < $minLength) {
      errors.push({
        instanceLocation,
        keyword: "minLength",
        keywordLocation: `${schemaLocation}/minLength`,
        error: `String is too short (${length} < ${$minLength}).`
      });
    }
    if ($maxLength !== void 0 && length > $maxLength) {
      errors.push({
        instanceLocation,
        keyword: "maxLength",
        keywordLocation: `${schemaLocation}/maxLength`,
        error: `String is too long (${length} > ${$maxLength}).`
      });
    }
    if ($pattern !== void 0 && !new RegExp($pattern, "u").test(instance)) {
      errors.push({
        instanceLocation,
        keyword: "pattern",
        keywordLocation: `${schemaLocation}/pattern`,
        error: `String does not match pattern.`
      });
    }
    if ($format !== void 0 && format[$format] && !format[$format](instance)) {
      errors.push({
        instanceLocation,
        keyword: "format",
        keywordLocation: `${schemaLocation}/format`,
        error: `String does not match format "${$format}".`
      });
    }
  }
  return { valid: errors.length === 0, errors };
}
__name(validate, "validate");

// node_modules/@cfworker/json-schema/dist/esm/validator.js
var Validator = class {
  static {
    __name(this, "Validator");
  }
  schema;
  draft;
  shortCircuit;
  lookup;
  constructor(schema, draft = "2019-09", shortCircuit = true) {
    this.schema = schema;
    this.draft = draft;
    this.shortCircuit = shortCircuit;
    this.lookup = dereference(schema);
  }
  validate(instance) {
    return validate(instance, this.schema, this.draft, this.lookup, this.shortCircuit);
  }
  addSchema(schema, id) {
    if (id) {
      schema = { ...schema, $id: id };
    }
    dereference(schema, this.lookup);
  }
};

// src/schema/validate.ts
var JSON_SCHEMA_TYPES = /* @__PURE__ */ new Set([
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
  "null"
]);
function assertSchemaShape(schema) {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    throw new BadRequestError("invalid_schema", "JSON Schema \u5FC5\u987B\u662F\u5BF9\u8C61");
  }
  const s = schema;
  if (s.type !== void 0) {
    if (typeof s.type !== "string" || !JSON_SCHEMA_TYPES.has(s.type)) {
      throw new BadRequestError("invalid_schema", `\u4E0D\u652F\u6301\u7684 type\uFF1A${String(s.type)}`);
    }
  }
  if (s.properties !== void 0) {
    const props = s.properties;
    if (typeof props !== "object" || props === null || Array.isArray(props)) {
      throw new BadRequestError("invalid_schema", "properties \u5FC5\u987B\u662F\u5BF9\u8C61");
    }
  }
  if (s.required !== void 0) {
    if (!Array.isArray(s.required) || s.required.some((r) => typeof r !== "string")) {
      throw new BadRequestError("invalid_schema", "required \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4");
    }
  }
  if (s.items !== void 0 && (typeof s.items !== "object" || s.items === null)) {
    throw new BadRequestError("invalid_schema", "items \u5FC5\u987B\u662F\u5BF9\u8C61");
  }
}
__name(assertSchemaShape, "assertSchemaShape");
function validatePayload(schema, payload) {
  const validator = new Validator(schema, "2020-12", false);
  const result = validator.validate(payload);
  return {
    valid: result.valid,
    errors: result.errors.map((e) => `${e.instanceLocation || "/"}: ${e.error}`)
  };
}
__name(validatePayload, "validatePayload");

// src/schema/freeze.ts
async function freezeSchemaVersion(env2, datasetId, version2, actor) {
  const dataset = await getDatasetById(env2, datasetId);
  const row = await getSchemaVersion(env2, datasetId, version2);
  if (row.status === "frozen") {
    throw new ConflictError("already_frozen", `Schema \u7248\u672C ${version2} \u5DF2\u51BB\u7ED3\uFF0C\u4E0D\u53EF\u91CD\u590D\u51BB\u7ED3`);
  }
  const schemaDoc = JSON.parse(row.json_schema);
  assertSchemaShape(schemaDoc);
  const currentVersion = dataset.current_schema_version;
  let changeKind;
  if (!currentVersion) {
    changeKind = "initial";
  } else {
    const current = await getSchemaVersion(env2, datasetId, currentVersion);
    changeKind = classifyChange(JSON.parse(current.json_schema), schemaDoc);
  }
  const expectedVersion = bumpVersion(currentVersion, changeKind);
  if (version2 !== expectedVersion) {
    throw new ConflictError(
      "version_mismatch",
      `\u4F9D\u636E\u517C\u5BB9\u6027\u5224\u5B9A\u672C\u6B21\u51BB\u7ED3\u5E94\u4F7F\u7528\u7248\u672C ${expectedVersion}`,
      {
        expectedVersion,
        changeKind
      }
    );
  }
  const frozenAt = nowIso();
  await env2.DB.batch([
    env2.DB.prepare("UPDATE schema_version SET status = 'frozen' WHERE id = ?").bind(row.id),
    env2.DB.prepare("UPDATE dataset SET current_schema_version = ? WHERE id = ?").bind(
      version2,
      datasetId
    ),
    auditStatement(env2.DB, {
      actor,
      action: "schema.freeze",
      target: `${dataset.slug}@${version2}`,
      detail: { changeKind }
    })
  ]);
  await putImmutable(env2.BUCKET, schemaKey(dataset.slug, version2), schemaDoc);
  const catalog = await upsertCatalogEntry(env2.BUCKET, {
    slug: dataset.slug,
    title: dataset.title,
    currentSchemaVersion: version2,
    currentDataVersion: dataset.current_data_version ?? null,
    updatedAt: frozenAt
  });
  const manifest = buildManifest({
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion: version2,
    latest: dataset.current_data_version ?? null,
    preview: dataset.current_preview_version ?? null
  });
  await writeManifest(env2.BUCKET, manifest);
  return {
    dataset: { ...dataset, current_schema_version: version2 },
    schemaVersion: { ...row, status: "frozen" },
    changeKind,
    expectedVersion,
    catalog,
    manifest
  };
}
__name(freezeSchemaVersion, "freezeSchemaVersion");

// src/routes/admin-datasets.ts
var SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;
function actorOf(c) {
  return c.get("accessIdentity")?.email ?? null;
}
__name(actorOf, "actorOf");
var datasetsAdminRoutes = new Hono3();
datasetsAdminRoutes.post("/datasets", async (c) => {
  const body = await readJsonBody(c);
  const slug = asString(body.slug);
  const title2 = asString(body.title);
  if (!slug || !SLUG_RE.test(slug)) {
    throw new BadRequestError("invalid_slug", "slug \u5FC5\u987B\u4E3A 1-63 \u4F4D\u5C0F\u5199\u5B57\u6BCD\u3001\u6570\u5B57\u6216\u8FDE\u5B57\u7B26");
  }
  if (!title2) throw new BadRequestError("invalid_title", "title \u4E0D\u80FD\u4E3A\u7A7A");
  assertSchemaShape(body.schema);
  const dataset = await createDataset(c.env, {
    slug,
    title: title2,
    schema: body.schema,
    actor: actorOf(c)
  });
  return c.json({ dataset, schemaVersion: FIRST_VERSION }, 201);
});
datasetsAdminRoutes.post("/datasets/:id/schema-versions", async (c) => {
  const body = await readJsonBody(c);
  const version2 = asString(body.version);
  if (!version2 || !parseVersion(version2)) {
    throw new BadRequestError("invalid_version", "version \u5FC5\u987B\u5F62\u5982 x.y.z");
  }
  assertSchemaShape(body.schema);
  const row = await addSchemaVersion(c.env, {
    datasetId: c.req.param("id"),
    version: version2,
    schema: body.schema,
    actor: actorOf(c)
  });
  return c.json({ schemaVersion: { version: row.version, status: row.status } }, 201);
});
datasetsAdminRoutes.post("/datasets/:id/freeze", async (c) => {
  const body = await readJsonBody(c);
  const version2 = asString(body.version);
  if (!version2 || !parseVersion(version2)) {
    throw new BadRequestError("invalid_version", "version \u5FC5\u987B\u5F62\u5982 x.y.z");
  }
  const result = await freezeSchemaVersion(c.env, c.req.param("id"), version2, actorOf(c));
  return c.json({
    dataset: {
      id: result.dataset.id,
      slug: result.dataset.slug,
      title: result.dataset.title,
      currentSchemaVersion: version2
    },
    frozenVersion: version2,
    changeKind: result.changeKind,
    catalog: result.catalog
  });
});
datasetsAdminRoutes.get("/datasets", async (c) => {
  const datasets = await listDatasets(c.env);
  const datasetsWithVersions = await Promise.all(
    datasets.map(async (dataset) => {
      const versions2 = await listSchemaVersions(c.env, dataset.id);
      return {
        id: dataset.id,
        slug: dataset.slug,
        title: dataset.title,
        currentSchemaVersion: dataset.current_schema_version,
        currentDataVersion: dataset.current_data_version ?? null,
        schemaVersions: versions2.map((v) => ({ version: v.version, status: v.status }))
      };
    })
  );
  return c.json({ datasets: datasetsWithVersions });
});
datasetsAdminRoutes.get("/datasets/:id", async (c) => {
  const dataset = await getDatasetById(c.env, c.req.param("id"));
  const versions2 = await listSchemaVersions(c.env, dataset.id);
  return c.json({
    dataset: {
      id: dataset.id,
      slug: dataset.slug,
      title: dataset.title,
      currentSchemaVersion: dataset.current_schema_version,
      currentDataVersion: dataset.current_data_version ?? null
    },
    schemaVersions: versions2.map((v) => ({ version: v.version, status: v.status }))
  });
});
datasetsAdminRoutes.get("/catalog", async (c) => c.json(await readCatalog(c.env.BUCKET)));

// src/publish/pointer.ts
async function writeLatestPointer(bucket, slug, pointer) {
  await putReplaceable(bucket, latestPointerKey(slug), pointer);
}
__name(writeLatestPointer, "writeLatestPointer");
async function writePreviewPointer(bucket, slug, pointer) {
  await putReplaceable(bucket, previewPointerKey(slug), pointer);
}
__name(writePreviewPointer, "writePreviewPointer");
function readLatestPointer(bucket, slug) {
  return readJson(bucket, latestPointerKey(slug));
}
__name(readLatestPointer, "readLatestPointer");
function readPreviewPointer(bucket, slug) {
  return readJson(bucket, previewPointerKey(slug));
}
__name(readPreviewPointer, "readPreviewPointer");

// src/ops/retention.ts
var RETENTION_WINDOW_DAYS = 7;
function retentionCutoff(days = RETENTION_WINDOW_DAYS) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString();
}
__name(retentionCutoff, "retentionCutoff");
async function listOrphanPreviewSnapshots(env2, slug, currentPreview) {
  const listed = await env2.BUCKET.list({ prefix: `${slug}/versions/preview-` });
  const keys = [];
  for (const object of listed.objects) {
    if (!object.key.endsWith(".json")) continue;
    if (currentPreview && object.key === dataSnapshotKey(slug, currentPreview)) continue;
    keys.push(object.key);
  }
  return keys.sort();
}
__name(listOrphanPreviewSnapshots, "listOrphanPreviewSnapshots");
async function planRetention(env2) {
  const datasets = await listDatasets(env2);
  const previewSnapshots = [];
  for (const dataset of datasets) {
    const pointer = await readPreviewPointer(env2.BUCKET, dataset.slug);
    const current = pointer?.dataVersion ?? null;
    previewSnapshots.push(...await listOrphanPreviewSnapshots(env2, dataset.slug, current));
  }
  const rejected = await env2.DB.prepare(
    "SELECT id FROM submission WHERE status = 'rejected' AND created_at < ? ORDER BY created_at ASC"
  ).bind(retentionCutoff()).all();
  return {
    previewSnapshots: previewSnapshots.sort(),
    rejectedSubmissions: (rejected.results ?? []).map((row) => row.id)
  };
}
__name(planRetention, "planRetention");
async function runRetention(env2, actor, confirmed) {
  const plan = await planRetention(env2);
  if (confirmed !== true) {
    return { confirmed: false, plan, deletedPreviews: 0, clearedSubmissions: 0 };
  }
  if (plan.previewSnapshots.length > 0) {
    await env2.BUCKET.delete(plan.previewSnapshots);
  }
  for (const id of plan.rejectedSubmissions) {
    await env2.DB.prepare(
      "UPDATE submission SET payload = ?, updated_at = ? WHERE id = ? AND status = 'rejected'"
    ).bind("", nowIso(), id).run();
  }
  await recordAudit(env2.DB, {
    actor,
    action: "ops.retention.run",
    target: null,
    detail: {
      deletedPreviews: plan.previewSnapshots.length,
      clearedSubmissions: plan.rejectedSubmissions.length
    }
  });
  return {
    confirmed: true,
    plan,
    deletedPreviews: plan.previewSnapshots.length,
    clearedSubmissions: plan.rejectedSubmissions.length
  };
}
__name(runRetention, "runRetention");

// src/routes/admin-ops.ts
function parseDetail(detail) {
  if (detail === null) return null;
  try {
    return JSON.parse(detail);
  } catch {
    return detail;
  }
}
__name(parseDetail, "parseDetail");
var opsAdminRoutes = new Hono3();
opsAdminRoutes.get("/ops", async (c) => {
  const retention = await planRetention(c.env);
  const audit = await c.env.DB.prepare(
    "SELECT actor, action, target, detail, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5"
  ).all();
  return c.json({
    environment: c.env.ENVIRONMENT ?? "development",
    quotaThreshold: c.env.QUOTA_ALERT_THRESHOLD ?? "80000",
    retention,
    latestAudit: (audit.results ?? []).map((row) => ({
      actor: row.actor,
      action: row.action,
      target: row.target,
      detail: parseDetail(row.detail),
      createdAt: row.created_at
    }))
  });
});
opsAdminRoutes.post("/ops/retention/run", async (c) => {
  const body = await readJsonBody(c);
  const result = await runRetention(c.env, currentActor(c), body.confirm === true);
  return c.json(result, 200);
});

// src/lib/hash.ts
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}
__name(sha256Hex, "sha256Hex");
function toHex(bytes) {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}
__name(toHex, "toHex");

// src/lib/stable-json.ts
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const source = value;
    const sorted = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortValue(source[key]);
    }
    return sorted;
  }
  return value;
}
__name(sortValue, "sortValue");
function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}
__name(stableStringify, "stableStringify");

// src/ops/search-index.ts
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
__name(asRecord, "asRecord");
function fieldsFromSchema(schemaJson) {
  const root = asRecord(JSON.parse(schemaJson));
  const properties = root ? asRecord(root.properties) : null;
  if (!properties) return [];
  return Object.keys(properties).map((name) => {
    const prop = asRecord(properties[name]);
    const title2 = prop && typeof prop.title === "string" ? prop.title : null;
    const type = prop && typeof prop.type === "string" ? prop.type : null;
    return { name, title: title2, type };
  });
}
__name(fieldsFromSchema, "fieldsFromSchema");
async function buildDatasetSearchDoc(env2, datasetId) {
  const dataset = await getDatasetById(env2, datasetId);
  let fields = [];
  if (dataset.current_schema_version) {
    const schemaRow = await getSchemaVersion(env2, datasetId, dataset.current_schema_version);
    fields = fieldsFromSchema(schemaRow.json_schema);
  }
  return {
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion: dataset.current_schema_version ?? null,
    dataVersion: dataset.current_data_version ?? null,
    fields
  };
}
__name(buildDatasetSearchDoc, "buildDatasetSearchDoc");
async function writeDatasetSearchIndex(env2, datasetId) {
  const doc = await buildDatasetSearchDoc(env2, datasetId);
  await putReplaceable(env2.BUCKET, datasetSearchIndexKey(doc.slug), doc);
  return doc;
}
__name(writeDatasetSearchIndex, "writeDatasetSearchIndex");
async function rebuildGlobalSearchIndex(env2) {
  const datasets = await listDatasets(env2);
  const docs = [];
  for (const dataset of datasets) {
    docs.push(await writeDatasetSearchIndex(env2, dataset.id));
  }
  const index = { generatedAt: nowIso(), datasets: docs };
  await putReplaceable(env2.BUCKET, SEARCH_INDEX_KEY, index);
  return { count: docs.length };
}
__name(rebuildGlobalSearchIndex, "rebuildGlobalSearchIndex");

// src/publish/repository.ts
async function nextDataVersionNumber(env2, datasetId) {
  const result = await env2.DB.prepare(
    "SELECT version FROM data_version WHERE dataset_id = ? AND status = 'published'"
  ).bind(datasetId).all();
  const rows = result.results ?? [];
  let max = 0;
  for (const row of rows) {
    if (/^\d+$/.test(row.version)) {
      const value = Number(row.version);
      if (value > max) max = value;
    }
  }
  return max + 1;
}
__name(nextDataVersionNumber, "nextDataVersionNumber");
function insertDataVersion(env2, row) {
  return env2.DB.prepare(
    "INSERT INTO data_version (id, dataset_id, version, r2_key, content_hash, source_submission_id, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    row.id,
    row.dataset_id,
    row.version,
    row.r2_key,
    row.content_hash,
    row.source_submission_id,
    row.status,
    row.published_at
  );
}
__name(insertDataVersion, "insertDataVersion");
async function listDataVersions(env2, datasetId) {
  const result = await env2.DB.prepare(
    "SELECT * FROM data_version WHERE dataset_id = ? ORDER BY published_at ASC"
  ).bind(datasetId).all();
  return result.results ?? [];
}
__name(listDataVersions, "listDataVersions");
async function getDataVersion(env2, datasetId, version2) {
  return env2.DB.prepare("SELECT * FROM data_version WHERE dataset_id = ? AND version = ?").bind(datasetId, version2).first();
}
__name(getDataVersion, "getDataVersion");

// src/publish/publish.ts
async function resolveFrozenSchema(env2, datasetId, dataset) {
  const schemaVersion = dataset.current_schema_version;
  if (!schemaVersion) {
    throw new ConflictError("schema_not_frozen", "\u6570\u636E\u96C6\u5C1A\u672A\u51BB\u7ED3 Schema\uFF0C\u65E0\u6CD5\u53D1\u5E03\u6570\u636E");
  }
  const schemaRow = await getSchemaVersion(env2, datasetId, schemaVersion);
  return schemaRow.json_schema;
}
__name(resolveFrozenSchema, "resolveFrozenSchema");
function assertValidPayload(schemaJson, payload) {
  const validation = validatePayload(JSON.parse(schemaJson), payload);
  if (!validation.valid) {
    throw new BadRequestError("schema_validation_failed", "payload \u672A\u901A\u8FC7\u51BB\u7ED3 Schema \u6821\u9A8C", {
      errors: validation.errors
    });
  }
}
__name(assertValidPayload, "assertValidPayload");
function toManifestVersions(rows, latest, preview) {
  return rows.map((row) => ({
    version: row.version,
    publishedAt: row.published_at,
    isLatest: row.version === latest,
    isPreview: preview !== null && row.version === preview
  }));
}
__name(toManifestVersions, "toManifestVersions");
async function publishDataset(env2, datasetId, payload, actor) {
  const dataset = await getDatasetById(env2, datasetId);
  const schemaJson = await resolveFrozenSchema(env2, datasetId, dataset);
  assertValidPayload(schemaJson, payload);
  const schemaVersion = dataset.current_schema_version;
  const version2 = String(await nextDataVersionNumber(env2, datasetId));
  const contentHash = await sha256Hex(stableStringify(payload));
  const r2Key = dataSnapshotKey(dataset.slug, version2);
  await putImmutable(env2.BUCKET, r2Key, payload);
  const publishedAt = nowIso();
  const pointer = {
    dataset: dataset.slug,
    dataVersion: version2,
    schemaVersion,
    publishedAt,
    contentHash
  };
  await writeLatestPointer(env2.BUCKET, dataset.slug, pointer);
  const row = {
    id: newId(),
    dataset_id: datasetId,
    version: version2,
    r2_key: r2Key,
    content_hash: contentHash,
    source_submission_id: null,
    status: "published",
    published_at: publishedAt
  };
  await env2.DB.batch([
    insertDataVersion(env2, row),
    env2.DB.prepare("UPDATE dataset SET current_data_version = ?, updated_at = ? WHERE id = ?").bind(
      version2,
      publishedAt,
      datasetId
    ),
    auditStatement(env2.DB, {
      actor,
      action: "data.publish",
      target: `${dataset.slug}@${version2}`,
      detail: { contentHash }
    })
  ]);
  const preview = dataset.current_preview_version ?? (await readPreviewPointer(env2.BUCKET, dataset.slug))?.dataVersion ?? null;
  const versions2 = await listDataVersions(env2, datasetId);
  const manifest = buildManifest({
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion,
    dataVersions: toManifestVersions(versions2, version2, preview),
    latest: version2,
    preview
  });
  await writeManifest(env2.BUCKET, manifest);
  await upsertCatalogEntry(env2.BUCKET, {
    slug: dataset.slug,
    title: dataset.title,
    currentSchemaVersion: schemaVersion,
    currentDataVersion: version2,
    updatedAt: publishedAt
  });
  await rebuildGlobalSearchIndex(env2);
  return { version: version2, r2Key, contentHash, pointer };
}
__name(publishDataset, "publishDataset");
async function stageDataset(env2, datasetId, payload, actor) {
  const dataset = await getDatasetById(env2, datasetId);
  const schemaJson = await resolveFrozenSchema(env2, datasetId, dataset);
  assertValidPayload(schemaJson, payload);
  const schemaVersion = dataset.current_schema_version;
  const version2 = `preview-${Date.now()}`;
  const r2Key = dataSnapshotKey(dataset.slug, version2);
  await putImmutable(env2.BUCKET, r2Key, payload);
  const stagedAt = nowIso();
  const pointer = {
    dataset: dataset.slug,
    dataVersion: version2,
    schemaVersion,
    stagedAt,
    nonProduction: true
  };
  await writePreviewPointer(env2.BUCKET, dataset.slug, pointer);
  await env2.DB.batch([
    env2.DB.prepare(
      "UPDATE dataset SET current_preview_version = ?, updated_at = ? WHERE id = ?"
    ).bind(version2, stagedAt, datasetId),
    auditStatement(env2.DB, {
      actor,
      action: "data.stage",
      target: `${dataset.slug}@${version2}`
    })
  ]);
  return { version: version2, pointer };
}
__name(stageDataset, "stageDataset");

// src/publish/rollback.ts
async function rollbackDataset(env2, datasetId, targetVersion, actor) {
  const dataset = await getDatasetById(env2, datasetId);
  const schemaVersion = dataset.current_schema_version;
  if (!schemaVersion) {
    throw new ConflictError("schema_not_frozen", "\u6570\u636E\u96C6\u5C1A\u672A\u51BB\u7ED3 Schema\uFF0C\u65E0\u6CD5\u56DE\u6EDA\u6570\u636E");
  }
  const target = await getDataVersion(env2, datasetId, targetVersion);
  if (target?.status !== "published") {
    throw new NotFoundError("data_version_not_found", `\u6570\u636E\u7248\u672C\u4E0D\u5B58\u5728\uFF1A${targetVersion}`);
  }
  const previous = dataset.current_data_version ?? null;
  const rolledAt = nowIso();
  const pointer = {
    dataset: dataset.slug,
    dataVersion: targetVersion,
    schemaVersion,
    publishedAt: target.published_at,
    contentHash: target.content_hash
  };
  await writeLatestPointer(env2.BUCKET, dataset.slug, pointer);
  await env2.DB.batch([
    env2.DB.prepare("UPDATE dataset SET current_data_version = ?, updated_at = ? WHERE id = ?").bind(
      targetVersion,
      rolledAt,
      datasetId
    ),
    auditStatement(env2.DB, {
      actor,
      action: "data.rollback",
      target: `${dataset.slug}@${targetVersion}`,
      detail: { from: previous, to: targetVersion }
    })
  ]);
  const preview = dataset.current_preview_version ?? null;
  const versions2 = await listDataVersions(env2, datasetId);
  const dataVersions = versions2.map((row) => ({
    version: row.version,
    publishedAt: row.published_at,
    isLatest: row.version === targetVersion,
    isPreview: preview !== null && row.version === preview
  }));
  const manifest = buildManifest({
    slug: dataset.slug,
    title: dataset.title,
    schemaVersion,
    dataVersions,
    latest: targetVersion,
    preview
  });
  await writeManifest(env2.BUCKET, manifest);
  await upsertCatalogEntry(env2.BUCKET, {
    slug: dataset.slug,
    title: dataset.title,
    currentSchemaVersion: schemaVersion,
    currentDataVersion: targetVersion,
    updatedAt: rolledAt
  });
  return { rolledBackTo: targetVersion, previous };
}
__name(rollbackDataset, "rollbackDataset");

// src/routes/admin-publish.ts
var publishAdminRoutes = new Hono3();
publishAdminRoutes.post("/datasets/:id/publish", async (c) => {
  const body = await readJsonBody(c);
  const result = await publishDataset(c.env, c.req.param("id"), body.payload, currentActor(c));
  return c.json(
    { dataVersion: result.version, r2Key: result.r2Key, contentHash: result.contentHash },
    201
  );
});
publishAdminRoutes.post("/datasets/:id/stage", async (c) => {
  const body = await readJsonBody(c);
  const result = await stageDataset(c.env, c.req.param("id"), body.payload, currentActor(c));
  return c.json({ previewVersion: result.version, pointer: result.pointer }, 201);
});
publishAdminRoutes.post("/datasets/:id/rollback", async (c) => {
  const body = await readJsonBody(c);
  const version2 = asString(body.version);
  if (!version2) throw new BadRequestError("invalid_version", "version \u4E0D\u80FD\u4E3A\u7A7A");
  const result = await rollbackDataset(c.env, c.req.param("id"), version2, currentActor(c));
  return c.json(result);
});
publishAdminRoutes.get("/datasets/:id/versions", async (c) => {
  const versions2 = await listDataVersions(c.env, c.req.param("id"));
  return c.json({
    versions: versions2.map((v) => ({
      version: v.version,
      status: v.status,
      publishedAt: v.published_at,
      contentHash: v.content_hash
    }))
  });
});

// src/submissions/repository.ts
function insertSubmission(env2, input) {
  const now = nowIso();
  return env2.DB.prepare(
    "INSERT INTO submission (id, dataset_id, slug, schema_version, status, token, payload, contact_email, source_ip_hash, staged_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    input.id,
    input.datasetId,
    input.slug,
    input.schemaVersion,
    input.status,
    input.token,
    JSON.stringify(input.payload),
    input.contactEmail ?? null,
    input.sourceIpHash ?? null,
    input.stagedVersion ?? null,
    now,
    now
  );
}
__name(insertSubmission, "insertSubmission");
async function getSubmissionByToken(env2, token) {
  return env2.DB.prepare("SELECT * FROM submission WHERE token = ?").bind(token).first();
}
__name(getSubmissionByToken, "getSubmissionByToken");
async function getSubmissionById(env2, id) {
  const row = await env2.DB.prepare("SELECT * FROM submission WHERE id = ?").bind(id).first();
  if (!row) throw new NotFoundError("submission_not_found", `\u63D0\u4EA4\u8BB0\u5F55\u4E0D\u5B58\u5728\uFF1A${id}`);
  return row;
}
__name(getSubmissionById, "getSubmissionById");
async function listSubmissions(env2, statuses) {
  if (statuses.length === 0) return [];
  const placeholders = statuses.map(() => "?").join(", ");
  const result = await env2.DB.prepare(
    `SELECT * FROM submission WHERE status IN (${placeholders}) ORDER BY created_at DESC`
  ).bind(...statuses).all();
  return result.results ?? [];
}
__name(listSubmissions, "listSubmissions");

// src/review/state-machine.ts
var TERMINAL = /* @__PURE__ */ new Set(["published", "rejected"]);
var ALLOWED = {
  pending: ["staged", "rejected"],
  staged: ["published", "rejected"],
  published: [],
  rejected: []
};
function canTransition(from, to) {
  if (TERMINAL.has(from)) return false;
  return (ALLOWED[from] ?? []).includes(to);
}
__name(canTransition, "canTransition");
function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new ConflictError("illegal_transition", `\u975E\u6CD5\u72B6\u6001\u8FC1\u79FB\uFF1A${from} \u2192 ${to}`, { from, to });
  }
}
__name(assertTransition, "assertTransition");

// src/review/actions.ts
async function stageSubmission(env2, submissionId, actor) {
  const submission = await getSubmissionById(env2, submissionId);
  assertTransition(submission.status, "staged");
  const payload = JSON.parse(submission.payload);
  const staged = await stageDataset(env2, submission.dataset_id, payload, actor);
  const stagedAt = nowIso();
  await env2.DB.batch([
    env2.DB.prepare(
      "UPDATE submission SET status = 'staged', staged_version = ?, staged_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?"
    ).bind(staged.version, stagedAt, actor, stagedAt, submission.id),
    auditStatement(env2.DB, {
      actor,
      action: "review.stage",
      target: submission.id,
      detail: { previewVersion: staged.version }
    })
  ]);
  await notifyStatus(env2, {
    email: submission.contact_email,
    datasetSlug: submission.slug,
    status: "staged",
    token: submission.token
  });
  return {
    status: "staged",
    previewVersion: staged.version,
    stagingUrl: `/${submission.slug}/preview.json`
  };
}
__name(stageSubmission, "stageSubmission");
async function promoteSubmission(env2, submissionId, actor) {
  const submission = await getSubmissionById(env2, submissionId);
  assertTransition(submission.status, "published");
  const payload = JSON.parse(submission.payload);
  const published = await publishDataset(env2, submission.dataset_id, payload, actor);
  const publishedAt = nowIso();
  await env2.DB.batch([
    env2.DB.prepare(
      "UPDATE submission SET status = 'published', published_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?"
    ).bind(publishedAt, actor, publishedAt, submission.id),
    auditStatement(env2.DB, {
      actor,
      action: "review.promote",
      target: submission.id,
      detail: { dataVersion: published.version }
    })
  ]);
  await notifyStatus(env2, {
    email: submission.contact_email,
    datasetSlug: submission.slug,
    status: "published",
    token: submission.token
  });
  return { status: "published", dataVersion: published.version };
}
__name(promoteSubmission, "promoteSubmission");
async function rejectSubmission(env2, submissionId, actor, reason) {
  const submission = await getSubmissionById(env2, submissionId);
  assertTransition(submission.status, "rejected");
  const rejectedAt = nowIso();
  const normalizedReason = reason ?? null;
  await env2.DB.batch([
    env2.DB.prepare(
      "UPDATE submission SET status = 'rejected', reject_reason = ?, reviewed_by = ?, updated_at = ? WHERE id = ?"
    ).bind(normalizedReason, actor, rejectedAt, submission.id),
    auditStatement(env2.DB, {
      actor,
      action: "review.reject",
      target: submission.id,
      detail: { reason: normalizedReason }
    })
  ]);
  await notifyStatus(env2, {
    email: submission.contact_email,
    datasetSlug: submission.slug,
    status: "rejected",
    token: submission.token
  });
  return { status: "rejected" };
}
__name(rejectSubmission, "rejectSubmission");

// src/review/diff.ts
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
__name(isPlainObject, "isPlainObject");
function escapePointerSegment(segment) {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
__name(escapePointerSegment, "escapePointerSegment");
function joinPointer(basePath, segment) {
  return `${basePath}/${escapePointerSegment(segment)}`;
}
__name(joinPointer, "joinPointer");
function equal(before, after) {
  return stableStringify(before) === stableStringify(after);
}
__name(equal, "equal");
function diffValue(before, after, path) {
  if (isPlainObject(before) && isPlainObject(after)) {
    const entries = [];
    const keys = /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const childPath = joinPointer(path, key);
      const inBefore = Object.hasOwn(before, key);
      const inAfter = Object.hasOwn(after, key);
      if (inBefore && !inAfter) {
        entries.push({ path: childPath, kind: "removed", before: before[key] });
      } else if (!inBefore && inAfter) {
        entries.push({ path: childPath, kind: "added", after: after[key] });
      } else {
        entries.push(...diffValue(before[key], after[key], childPath));
      }
    }
    return entries;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const entries = [];
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      const childPath = joinPointer(path, String(index));
      if (index >= after.length) {
        entries.push({ path: childPath, kind: "removed", before: before[index] });
      } else if (index >= before.length) {
        entries.push({ path: childPath, kind: "added", after: after[index] });
      } else {
        entries.push(...diffValue(before[index], after[index], childPath));
      }
    }
    return entries;
  }
  if (!equal(before, after)) {
    return [{ path, kind: "changed", before, after }];
  }
  return [];
}
__name(diffValue, "diffValue");
function diffJson(before, after, basePath = "") {
  return diffValue(before, after, basePath);
}
__name(diffJson, "diffJson");

// src/review/views.ts
function schemaTypeOf(schema, fallback) {
  if (isPlainObject(schema) && typeof schema.type === "string") return schema.type;
  if (Array.isArray(fallback)) return "array";
  return typeof fallback;
}
__name(schemaTypeOf, "schemaTypeOf");
function titleOf(schema, fallback) {
  if (isPlainObject(schema) && typeof schema.title === "string" && schema.title.trim() !== "") {
    return schema.title;
  }
  return fallback;
}
__name(titleOf, "titleOf");
function renderField(key, schema, value) {
  const type = schemaTypeOf(schema, value);
  const field = { key, title: titleOf(schema, key), type, value: null };
  if (type === "object" && isPlainObject(value)) {
    const props = isPlainObject(schema) && isPlainObject(schema.properties) ? schema.properties : {};
    field.children = Object.keys(value).map(
      (childKey) => renderField(childKey, props[childKey], value[childKey])
    );
    return field;
  }
  if (type === "array" && Array.isArray(value)) {
    const items = isPlainObject(schema) && isPlainObject(schema.items) ? schema.items : void 0;
    field.children = value.map((item, index) => renderField(`[${index}]`, items, item));
    return field;
  }
  field.value = value;
  return field;
}
__name(renderField, "renderField");
function buildRender(schema, payload) {
  const root = isPlainObject(schema) ? schema : {};
  const type = typeof root.type === "string" ? root.type : void 0;
  if (type === "array" && Array.isArray(payload)) {
    const items = isPlainObject(root.items) ? root.items : void 0;
    return payload.map((item, index) => renderField(`[${index}]`, items, item));
  }
  if (isPlainObject(payload)) {
    const props = isPlainObject(root.properties) ? root.properties : {};
    return Object.keys(payload).map((key) => renderField(key, props[key], payload[key]));
  }
  return [renderField("", root, payload)];
}
__name(buildRender, "buildRender");
async function buildReviewViews(env2, submissionId) {
  const submission = await getSubmissionById(env2, submissionId);
  const schemaRow = await getSchemaVersion(env2, submission.dataset_id, submission.schema_version);
  const schema = JSON.parse(schemaRow.json_schema);
  const candidate = JSON.parse(submission.payload);
  const pointer = await readLatestPointer(env2.BUCKET, submission.slug);
  const current = pointer ? await readJson(env2.BUCKET, dataSnapshotKey(submission.slug, pointer.dataVersion)) : null;
  return {
    submission: {
      id: submission.id,
      slug: submission.slug,
      datasetId: submission.dataset_id,
      status: submission.status,
      schemaVersion: submission.schema_version,
      createdAt: submission.created_at,
      hasEmail: submission.contact_email !== null && submission.contact_email.trim() !== ""
    },
    schema,
    render: buildRender(schema, candidate),
    jsonTree: candidate,
    diff: diffJson(current, candidate),
    diffBase: "latest-published",
    current
  };
}
__name(buildReviewViews, "buildReviewViews");

// src/routes/admin-review.ts
var DEFAULT_STATUSES = ["pending", "staged"];
var reviewAdminRoutes = new Hono3();
reviewAdminRoutes.get("/submissions", async (c) => {
  const raw2 = c.req.query("status");
  const statuses = raw2 ? raw2.split(",").map((s) => s.trim()).filter((s) => s !== "") : DEFAULT_STATUSES;
  const rows = await listSubmissions(c.env, statuses);
  return c.json({
    submissions: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      datasetId: row.dataset_id,
      status: row.status,
      schemaVersion: row.schema_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      hasEmail: row.contact_email !== null && row.contact_email.trim() !== ""
    }))
  });
});
reviewAdminRoutes.get("/submissions/:id", async (c) => {
  const views = await buildReviewViews(c.env, c.req.param("id"));
  return c.json(views);
});
reviewAdminRoutes.post("/submissions/:id/stage", async (c) => {
  const result = await stageSubmission(c.env, c.req.param("id"), currentActor(c));
  return c.json(result, 200);
});
reviewAdminRoutes.post("/submissions/:id/promote", async (c) => {
  const result = await promoteSubmission(c.env, c.req.param("id"), currentActor(c));
  return c.json(result, 200);
});
reviewAdminRoutes.post("/submissions/:id/reject", async (c) => {
  const body = await readJsonBody(c);
  const reason = asString(body.reason) ?? null;
  const result = await rejectSubmission(c.env, c.req.param("id"), currentActor(c), reason);
  return c.json(result, 200);
});

// src/routes/admin.ts
var adminApi = new Hono3();
adminApi.use("*", accessGuard);
adminApi.route("/", datasetsAdminRoutes);
adminApi.route("/", publishAdminRoutes);
adminApi.route("/", reviewAdminRoutes);
adminApi.route("/", opsAdminRoutes);

// src/routes/health.ts
var healthApi = new Hono3();
healthApi.get(
  "/health",
  (c) => c.json({
    ok: true,
    service: "lantai",
    environment: c.env.ENVIRONMENT ?? "development"
  })
);

// src/lib/tokens.ts
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function newTrackingToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += ALPHABET[byte % 64];
  }
  return out;
}
__name(newTrackingToken, "newTrackingToken");
function isWellFormedToken(token) {
  return /^[A-Za-z0-9_-]{20,128}$/.test(token);
}
__name(isWellFormedToken, "isWellFormedToken");

// src/submissions/ratelimit.ts
var WINDOW_MS = 6e4;
var PER_KEY_LIMIT = 5;
var GLOBAL_LIMIT = 1e3;
var buckets = /* @__PURE__ */ new Map();
var globalHits = [];
function retryAfterSeconds(oldest, now) {
  return Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1e3));
}
__name(retryAfterSeconds, "retryAfterSeconds");
function checkRateLimit(key, now = Date.now()) {
  const cutoff = now - WINDOW_MS;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  globalHits = globalHits.filter((t) => t > cutoff);
  if (globalHits.length >= GLOBAL_LIMIT) {
    buckets.set(key, hits);
    return { allowed: false, retryAfter: retryAfterSeconds(globalHits[0], now) };
  }
  if (hits.length >= PER_KEY_LIMIT) {
    buckets.set(key, hits);
    return { allowed: false, retryAfter: retryAfterSeconds(hits[0], now) };
  }
  hits.push(now);
  globalHits.push(now);
  buckets.set(key, hits);
  return { allowed: true };
}
__name(checkRateLimit, "checkRateLimit");

// src/submissions/turnstile.ts
var SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
async function verifyTurnstile(env2, token, ip) {
  const secret = env2.TURNSTILE_SECRET;
  if (!secret) {
    return { success: true, mode: "dev-bypass" };
  }
  if (!token) {
    return { success: false, mode: "rejected", error: "missing-token" };
  }
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form });
    const data = await res.json();
    if (data.success) {
      return { success: true, mode: "verified" };
    }
    const codes = data["error-codes"] ?? [];
    return {
      success: false,
      mode: "rejected",
      error: codes.length > 0 ? codes.join(",") : "siteverify-failed"
    };
  } catch {
    return { success: false, mode: "rejected", error: "siteverify-unreachable" };
  }
}
__name(verifyTurnstile, "verifyTurnstile");

// src/submissions/submit.ts
async function submitChange(env2, input) {
  const dataset = await getDatasetBySlug(env2, input.slug);
  if (!dataset) {
    throw new NotFoundError("dataset_not_found", `\u6570\u636E\u96C6\u4E0D\u5B58\u5728\uFF1A${input.slug}`);
  }
  const schemaVersion = dataset.current_schema_version;
  if (!schemaVersion) {
    throw new ConflictError("schema_not_frozen", `\u6570\u636E\u96C6\u5C1A\u672A\u51BB\u7ED3 Schema\uFF1A${input.slug}`, {
      slug: input.slug
    });
  }
  const turnstile = await verifyTurnstile(env2, input.turnstileToken, input.ip);
  if (!turnstile.success) {
    throw new BadRequestError("turnstile_failed", "\u4EBA\u673A\u6821\u9A8C\u672A\u901A\u8FC7", {
      mode: turnstile.mode,
      reason: turnstile.error
    });
  }
  const ipHash = await sha256Hex(`${env2.IP_HASH_SALT ?? "lantai"}:${input.ip ?? "unknown"}`);
  const limit = checkRateLimit(ipHash, input.now);
  if (!limit.allowed) {
    throw new TooManyRequestsError("rate_limited", "\u63D0\u4EA4\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5", {
      retryAfter: limit.retryAfter
    });
  }
  const schemaRow = await getSchemaVersion(env2, dataset.id, schemaVersion);
  const validation = validatePayload(JSON.parse(schemaRow.json_schema), input.payload);
  if (!validation.valid) {
    throw new BadRequestError("schema_validation_failed", "\u63D0\u4EA4\u5185\u5BB9\u4E0D\u7B26\u5408\u6570\u636E\u96C6 Schema", {
      errors: validation.errors
    });
  }
  const id = newId();
  const token = newTrackingToken();
  await env2.DB.batch([
    insertSubmission(env2, {
      id,
      datasetId: dataset.id,
      slug: dataset.slug,
      schemaVersion,
      status: "pending",
      token,
      payload: input.payload,
      contactEmail: input.email ?? null,
      sourceIpHash: ipHash
    }),
    auditStatement(env2.DB, {
      action: "submission.create",
      target: dataset.slug,
      detail: { sub: id }
    })
  ]);
  if (input.email) {
    await notifyStatus(env2, {
      email: input.email,
      datasetSlug: dataset.slug,
      status: "pending",
      token
    });
  }
  return { submissionId: id, token, status: "pending" };
}
__name(submitChange, "submitChange");
async function trackSubmission(env2, token) {
  if (!isWellFormedToken(token)) {
    throw new NotFoundError("submission_not_found", "\u63D0\u4EA4\u8BB0\u5F55\u4E0D\u5B58\u5728");
  }
  const row = await getSubmissionByToken(env2, token);
  if (!row) {
    throw new NotFoundError("submission_not_found", "\u63D0\u4EA4\u8BB0\u5F55\u4E0D\u5B58\u5728");
  }
  return {
    slug: row.slug,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stagedVersion: row.staged_version
  };
}
__name(trackSubmission, "trackSubmission");

// src/routes/submissions.ts
var submissionsApi = new Hono3();
submissionsApi.post("/submissions", async (c) => {
  const body = await readJsonBody(c);
  const slug = asString(body.slug);
  if (!slug) throw new BadRequestError("invalid_slug", "slug \u4E0D\u80FD\u4E3A\u7A7A");
  const result = await submitChange(c.env, {
    slug,
    payload: body.payload,
    email: asString(body.email),
    turnstileToken: asString(body.turnstileToken),
    ip: c.req.header("CF-Connecting-IP") ?? void 0
  });
  return c.json(result, 201);
});
submissionsApi.get("/submissions/:token", async (c) => {
  const status = await trackSubmission(c.env, c.req.param("token"));
  return c.json(status);
});

// src/index.ts
var app = new Hono3();
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(errorBody(err.code, err.message, err.details), err.status);
  }
  console.error("unhandled_error", err);
  return c.json(errorBody("internal_error", "\u670D\u52A1\u5185\u90E8\u9519\u8BEF"), 500);
});
app.route("/api", healthApi);
app.route("/api/admin", adminApi);
app.route("/api", submissionsApi);
function servePage(path) {
  return (c) => c.env.ASSETS.fetch(
    new Request(new URL(path, c.req.url).toString(), {
      method: "GET",
      headers: c.req.raw.headers
    })
  );
}
__name(servePage, "servePage");
app.get("/admin", accessGuard, servePage("/admin.html"));
app.get("/review", accessGuard, servePage("/review.html"));
app.get("/ops", accessGuard, servePage("/ops.html"));
app.get("/submit", servePage("/submit.html"));
app.get("*", async (c, next) => {
  if (c.env.ALLOW_DEV_STATIC === "true") {
    const key = r2KeyForPublicPath(new URL(c.req.url).pathname);
    if (key) return serveR2Object(c.env.BUCKET, key);
  }
  return next();
});
app.all("/api/*", (c) => c.json(errorBody("not_found", "\u63A5\u53E3\u4E0D\u5B58\u5728"), 404));
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));
async function serveR2Object(bucket, key) {
  const object = await bucket.get(key);
  if (!object) {
    return Response.json(errorBody("not_found", `\u672A\u627E\u5230\u9759\u6001\u5BF9\u8C61\uFF1A${key}`), { status: 404 });
  }
  const headers = new Headers();
  headers.set(
    "content-type",
    object.httpMetadata?.contentType ?? "application/json; charset=utf-8"
  );
  headers.set("cache-control", object.httpMetadata?.cacheControl ?? "public, max-age=60");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  headers.set("x-lantai-served-by", "worker-dev-static");
  return new Response(object.body, { headers });
}
__name(serveR2Object, "serveR2Object");
var index_default = {
  fetch: app.fetch,
  scheduled: handleScheduled
};
export {
  app,
  index_default as default
};
//# sourceMappingURL=index.js.map
