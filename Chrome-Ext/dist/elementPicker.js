(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/localforage/dist/localforage.js
  var require_localforage = __commonJS({
    "node_modules/localforage/dist/localforage.js"(exports, module) {
      (function(f) {
        if (typeof exports === "object" && typeof module !== "undefined") {
          module.exports = f();
        } else if (typeof define === "function" && define.amd) {
          define([], f);
        } else {
          var g;
          if (typeof window !== "undefined") {
            g = window;
          } else if (typeof global !== "undefined") {
            g = global;
          } else if (typeof self !== "undefined") {
            g = self;
          } else {
            g = this;
          }
          g.localforage = f();
        }
      })(function() {
        var define2, module2, exports2;
        return function e(t, n, r) {
          function s(o2, u) {
            if (!n[o2]) {
              if (!t[o2]) {
                var a = typeof __require == "function" && __require;
                if (!u && a)
                  return a(o2, true);
                if (i)
                  return i(o2, true);
                var f = new Error("Cannot find module '" + o2 + "'");
                throw f.code = "MODULE_NOT_FOUND", f;
              }
              var l = n[o2] = { exports: {} };
              t[o2][0].call(l.exports, function(e2) {
                var n2 = t[o2][1][e2];
                return s(n2 ? n2 : e2);
              }, l, l.exports, e, t, n, r);
            }
            return n[o2].exports;
          }
          var i = typeof __require == "function" && __require;
          for (var o = 0; o < r.length; o++)
            s(r[o]);
          return s;
        }({ 1: [function(_dereq_, module3, exports3) {
          (function(global2) {
            "use strict";
            var Mutation = global2.MutationObserver || global2.WebKitMutationObserver;
            var scheduleDrain;
            {
              if (Mutation) {
                var called = 0;
                var observer = new Mutation(nextTick);
                var element = global2.document.createTextNode("");
                observer.observe(element, {
                  characterData: true
                });
                scheduleDrain = function() {
                  element.data = called = ++called % 2;
                };
              } else if (!global2.setImmediate && typeof global2.MessageChannel !== "undefined") {
                var channel = new global2.MessageChannel();
                channel.port1.onmessage = nextTick;
                scheduleDrain = function() {
                  channel.port2.postMessage(0);
                };
              } else if ("document" in global2 && "onreadystatechange" in global2.document.createElement("script")) {
                scheduleDrain = function() {
                  var scriptEl = global2.document.createElement("script");
                  scriptEl.onreadystatechange = function() {
                    nextTick();
                    scriptEl.onreadystatechange = null;
                    scriptEl.parentNode.removeChild(scriptEl);
                    scriptEl = null;
                  };
                  global2.document.documentElement.appendChild(scriptEl);
                };
              } else {
                scheduleDrain = function() {
                  setTimeout(nextTick, 0);
                };
              }
            }
            var draining;
            var queue = [];
            function nextTick() {
              draining = true;
              var i, oldQueue;
              var len = queue.length;
              while (len) {
                oldQueue = queue;
                queue = [];
                i = -1;
                while (++i < len) {
                  oldQueue[i]();
                }
                len = queue.length;
              }
              draining = false;
            }
            module3.exports = immediate;
            function immediate(task) {
              if (queue.push(task) === 1 && !draining) {
                scheduleDrain();
              }
            }
          }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
        }, {}], 2: [function(_dereq_, module3, exports3) {
          "use strict";
          var immediate = _dereq_(1);
          function INTERNAL() {
          }
          var handlers = {};
          var REJECTED = ["REJECTED"];
          var FULFILLED = ["FULFILLED"];
          var PENDING = ["PENDING"];
          module3.exports = Promise2;
          function Promise2(resolver) {
            if (typeof resolver !== "function") {
              throw new TypeError("resolver must be a function");
            }
            this.state = PENDING;
            this.queue = [];
            this.outcome = void 0;
            if (resolver !== INTERNAL) {
              safelyResolveThenable(this, resolver);
            }
          }
          Promise2.prototype["catch"] = function(onRejected) {
            return this.then(null, onRejected);
          };
          Promise2.prototype.then = function(onFulfilled, onRejected) {
            if (typeof onFulfilled !== "function" && this.state === FULFILLED || typeof onRejected !== "function" && this.state === REJECTED) {
              return this;
            }
            var promise = new this.constructor(INTERNAL);
            if (this.state !== PENDING) {
              var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
              unwrap(promise, resolver, this.outcome);
            } else {
              this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
            }
            return promise;
          };
          function QueueItem(promise, onFulfilled, onRejected) {
            this.promise = promise;
            if (typeof onFulfilled === "function") {
              this.onFulfilled = onFulfilled;
              this.callFulfilled = this.otherCallFulfilled;
            }
            if (typeof onRejected === "function") {
              this.onRejected = onRejected;
              this.callRejected = this.otherCallRejected;
            }
          }
          QueueItem.prototype.callFulfilled = function(value) {
            handlers.resolve(this.promise, value);
          };
          QueueItem.prototype.otherCallFulfilled = function(value) {
            unwrap(this.promise, this.onFulfilled, value);
          };
          QueueItem.prototype.callRejected = function(value) {
            handlers.reject(this.promise, value);
          };
          QueueItem.prototype.otherCallRejected = function(value) {
            unwrap(this.promise, this.onRejected, value);
          };
          function unwrap(promise, func, value) {
            immediate(function() {
              var returnValue;
              try {
                returnValue = func(value);
              } catch (e) {
                return handlers.reject(promise, e);
              }
              if (returnValue === promise) {
                handlers.reject(promise, new TypeError("Cannot resolve promise with itself"));
              } else {
                handlers.resolve(promise, returnValue);
              }
            });
          }
          handlers.resolve = function(self2, value) {
            var result = tryCatch(getThen, value);
            if (result.status === "error") {
              return handlers.reject(self2, result.value);
            }
            var thenable = result.value;
            if (thenable) {
              safelyResolveThenable(self2, thenable);
            } else {
              self2.state = FULFILLED;
              self2.outcome = value;
              var i = -1;
              var len = self2.queue.length;
              while (++i < len) {
                self2.queue[i].callFulfilled(value);
              }
            }
            return self2;
          };
          handlers.reject = function(self2, error) {
            self2.state = REJECTED;
            self2.outcome = error;
            var i = -1;
            var len = self2.queue.length;
            while (++i < len) {
              self2.queue[i].callRejected(error);
            }
            return self2;
          };
          function getThen(obj) {
            var then = obj && obj.then;
            if (obj && (typeof obj === "object" || typeof obj === "function") && typeof then === "function") {
              return function appyThen() {
                then.apply(obj, arguments);
              };
            }
          }
          function safelyResolveThenable(self2, thenable) {
            var called = false;
            function onError(value) {
              if (called) {
                return;
              }
              called = true;
              handlers.reject(self2, value);
            }
            function onSuccess(value) {
              if (called) {
                return;
              }
              called = true;
              handlers.resolve(self2, value);
            }
            function tryToUnwrap() {
              thenable(onSuccess, onError);
            }
            var result = tryCatch(tryToUnwrap);
            if (result.status === "error") {
              onError(result.value);
            }
          }
          function tryCatch(func, value) {
            var out = {};
            try {
              out.value = func(value);
              out.status = "success";
            } catch (e) {
              out.status = "error";
              out.value = e;
            }
            return out;
          }
          Promise2.resolve = resolve;
          function resolve(value) {
            if (value instanceof this) {
              return value;
            }
            return handlers.resolve(new this(INTERNAL), value);
          }
          Promise2.reject = reject;
          function reject(reason) {
            var promise = new this(INTERNAL);
            return handlers.reject(promise, reason);
          }
          Promise2.all = all;
          function all(iterable) {
            var self2 = this;
            if (Object.prototype.toString.call(iterable) !== "[object Array]") {
              return this.reject(new TypeError("must be an array"));
            }
            var len = iterable.length;
            var called = false;
            if (!len) {
              return this.resolve([]);
            }
            var values = new Array(len);
            var resolved = 0;
            var i = -1;
            var promise = new this(INTERNAL);
            while (++i < len) {
              allResolver(iterable[i], i);
            }
            return promise;
            function allResolver(value, i2) {
              self2.resolve(value).then(resolveFromAll, function(error) {
                if (!called) {
                  called = true;
                  handlers.reject(promise, error);
                }
              });
              function resolveFromAll(outValue) {
                values[i2] = outValue;
                if (++resolved === len && !called) {
                  called = true;
                  handlers.resolve(promise, values);
                }
              }
            }
          }
          Promise2.race = race;
          function race(iterable) {
            var self2 = this;
            if (Object.prototype.toString.call(iterable) !== "[object Array]") {
              return this.reject(new TypeError("must be an array"));
            }
            var len = iterable.length;
            var called = false;
            if (!len) {
              return this.resolve([]);
            }
            var i = -1;
            var promise = new this(INTERNAL);
            while (++i < len) {
              resolver(iterable[i]);
            }
            return promise;
            function resolver(value) {
              self2.resolve(value).then(function(response) {
                if (!called) {
                  called = true;
                  handlers.resolve(promise, response);
                }
              }, function(error) {
                if (!called) {
                  called = true;
                  handlers.reject(promise, error);
                }
              });
            }
          }
        }, { "1": 1 }], 3: [function(_dereq_, module3, exports3) {
          (function(global2) {
            "use strict";
            if (typeof global2.Promise !== "function") {
              global2.Promise = _dereq_(2);
            }
          }).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
        }, { "2": 2 }], 4: [function(_dereq_, module3, exports3) {
          "use strict";
          var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
            return typeof obj;
          } : function(obj) {
            return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
          };
          function _classCallCheck(instance, Constructor) {
            if (!(instance instanceof Constructor)) {
              throw new TypeError("Cannot call a class as a function");
            }
          }
          function getIDB() {
            try {
              if (typeof indexedDB !== "undefined") {
                return indexedDB;
              }
              if (typeof webkitIndexedDB !== "undefined") {
                return webkitIndexedDB;
              }
              if (typeof mozIndexedDB !== "undefined") {
                return mozIndexedDB;
              }
              if (typeof OIndexedDB !== "undefined") {
                return OIndexedDB;
              }
              if (typeof msIndexedDB !== "undefined") {
                return msIndexedDB;
              }
            } catch (e) {
              return;
            }
          }
          var idb = getIDB();
          function isIndexedDBValid() {
            try {
              if (!idb || !idb.open) {
                return false;
              }
              var isSafari = typeof openDatabase !== "undefined" && /(Safari|iPhone|iPad|iPod)/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent) && !/BlackBerry/.test(navigator.platform);
              var hasFetch = typeof fetch === "function" && fetch.toString().indexOf("[native code") !== -1;
              return (!isSafari || hasFetch) && typeof indexedDB !== "undefined" && // some outdated implementations of IDB that appear on Samsung
              // and HTC Android devices <4.4 are missing IDBKeyRange
              // See: https://github.com/mozilla/localForage/issues/128
              // See: https://github.com/mozilla/localForage/issues/272
              typeof IDBKeyRange !== "undefined";
            } catch (e) {
              return false;
            }
          }
          function createBlob(parts, properties) {
            parts = parts || [];
            properties = properties || {};
            try {
              return new Blob(parts, properties);
            } catch (e) {
              if (e.name !== "TypeError") {
                throw e;
              }
              var Builder = typeof BlobBuilder !== "undefined" ? BlobBuilder : typeof MSBlobBuilder !== "undefined" ? MSBlobBuilder : typeof MozBlobBuilder !== "undefined" ? MozBlobBuilder : WebKitBlobBuilder;
              var builder = new Builder();
              for (var i = 0; i < parts.length; i += 1) {
                builder.append(parts[i]);
              }
              return builder.getBlob(properties.type);
            }
          }
          if (typeof Promise === "undefined") {
            _dereq_(3);
          }
          var Promise$1 = Promise;
          function executeCallback(promise, callback) {
            if (callback) {
              promise.then(function(result) {
                callback(null, result);
              }, function(error) {
                callback(error);
              });
            }
          }
          function executeTwoCallbacks(promise, callback, errorCallback) {
            if (typeof callback === "function") {
              promise.then(callback);
            }
            if (typeof errorCallback === "function") {
              promise["catch"](errorCallback);
            }
          }
          function normalizeKey(key2) {
            if (typeof key2 !== "string") {
              console.warn(key2 + " used as a key, but it is not a string.");
              key2 = String(key2);
            }
            return key2;
          }
          function getCallback() {
            if (arguments.length && typeof arguments[arguments.length - 1] === "function") {
              return arguments[arguments.length - 1];
            }
          }
          var DETECT_BLOB_SUPPORT_STORE = "local-forage-detect-blob-support";
          var supportsBlobs = void 0;
          var dbContexts = {};
          var toString = Object.prototype.toString;
          var READ_ONLY = "readonly";
          var READ_WRITE = "readwrite";
          function _binStringToArrayBuffer(bin) {
            var length2 = bin.length;
            var buf = new ArrayBuffer(length2);
            var arr = new Uint8Array(buf);
            for (var i = 0; i < length2; i++) {
              arr[i] = bin.charCodeAt(i);
            }
            return buf;
          }
          function _checkBlobSupportWithoutCaching(idb2) {
            return new Promise$1(function(resolve) {
              var txn = idb2.transaction(DETECT_BLOB_SUPPORT_STORE, READ_WRITE);
              var blob = createBlob([""]);
              txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob, "key");
              txn.onabort = function(e) {
                e.preventDefault();
                e.stopPropagation();
                resolve(false);
              };
              txn.oncomplete = function() {
                var matchedChrome = navigator.userAgent.match(/Chrome\/(\d+)/);
                var matchedEdge = navigator.userAgent.match(/Edge\//);
                resolve(matchedEdge || !matchedChrome || parseInt(matchedChrome[1], 10) >= 43);
              };
            })["catch"](function() {
              return false;
            });
          }
          function _checkBlobSupport(idb2) {
            if (typeof supportsBlobs === "boolean") {
              return Promise$1.resolve(supportsBlobs);
            }
            return _checkBlobSupportWithoutCaching(idb2).then(function(value) {
              supportsBlobs = value;
              return supportsBlobs;
            });
          }
          function _deferReadiness(dbInfo) {
            var dbContext = dbContexts[dbInfo.name];
            var deferredOperation = {};
            deferredOperation.promise = new Promise$1(function(resolve, reject) {
              deferredOperation.resolve = resolve;
              deferredOperation.reject = reject;
            });
            dbContext.deferredOperations.push(deferredOperation);
            if (!dbContext.dbReady) {
              dbContext.dbReady = deferredOperation.promise;
            } else {
              dbContext.dbReady = dbContext.dbReady.then(function() {
                return deferredOperation.promise;
              });
            }
          }
          function _advanceReadiness(dbInfo) {
            var dbContext = dbContexts[dbInfo.name];
            var deferredOperation = dbContext.deferredOperations.pop();
            if (deferredOperation) {
              deferredOperation.resolve();
              return deferredOperation.promise;
            }
          }
          function _rejectReadiness(dbInfo, err) {
            var dbContext = dbContexts[dbInfo.name];
            var deferredOperation = dbContext.deferredOperations.pop();
            if (deferredOperation) {
              deferredOperation.reject(err);
              return deferredOperation.promise;
            }
          }
          function _getConnection(dbInfo, upgradeNeeded) {
            return new Promise$1(function(resolve, reject) {
              dbContexts[dbInfo.name] = dbContexts[dbInfo.name] || createDbContext();
              if (dbInfo.db) {
                if (upgradeNeeded) {
                  _deferReadiness(dbInfo);
                  dbInfo.db.close();
                } else {
                  return resolve(dbInfo.db);
                }
              }
              var dbArgs = [dbInfo.name];
              if (upgradeNeeded) {
                dbArgs.push(dbInfo.version);
              }
              var openreq = idb.open.apply(idb, dbArgs);
              if (upgradeNeeded) {
                openreq.onupgradeneeded = function(e) {
                  var db = openreq.result;
                  try {
                    db.createObjectStore(dbInfo.storeName);
                    if (e.oldVersion <= 1) {
                      db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);
                    }
                  } catch (ex) {
                    if (ex.name === "ConstraintError") {
                      console.warn('The database "' + dbInfo.name + '" has been upgraded from version ' + e.oldVersion + " to version " + e.newVersion + ', but the storage "' + dbInfo.storeName + '" already exists.');
                    } else {
                      throw ex;
                    }
                  }
                };
              }
              openreq.onerror = function(e) {
                e.preventDefault();
                reject(openreq.error);
              };
              openreq.onsuccess = function() {
                var db = openreq.result;
                db.onversionchange = function(e) {
                  e.target.close();
                };
                resolve(db);
                _advanceReadiness(dbInfo);
              };
            });
          }
          function _getOriginalConnection(dbInfo) {
            return _getConnection(dbInfo, false);
          }
          function _getUpgradedConnection(dbInfo) {
            return _getConnection(dbInfo, true);
          }
          function _isUpgradeNeeded(dbInfo, defaultVersion) {
            if (!dbInfo.db) {
              return true;
            }
            var isNewStore = !dbInfo.db.objectStoreNames.contains(dbInfo.storeName);
            var isDowngrade = dbInfo.version < dbInfo.db.version;
            var isUpgrade = dbInfo.version > dbInfo.db.version;
            if (isDowngrade) {
              if (dbInfo.version !== defaultVersion) {
                console.warn('The database "' + dbInfo.name + `" can't be downgraded from version ` + dbInfo.db.version + " to version " + dbInfo.version + ".");
              }
              dbInfo.version = dbInfo.db.version;
            }
            if (isUpgrade || isNewStore) {
              if (isNewStore) {
                var incVersion = dbInfo.db.version + 1;
                if (incVersion > dbInfo.version) {
                  dbInfo.version = incVersion;
                }
              }
              return true;
            }
            return false;
          }
          function _encodeBlob(blob) {
            return new Promise$1(function(resolve, reject) {
              var reader = new FileReader();
              reader.onerror = reject;
              reader.onloadend = function(e) {
                var base64 = btoa(e.target.result || "");
                resolve({
                  __local_forage_encoded_blob: true,
                  data: base64,
                  type: blob.type
                });
              };
              reader.readAsBinaryString(blob);
            });
          }
          function _decodeBlob(encodedBlob) {
            var arrayBuff = _binStringToArrayBuffer(atob(encodedBlob.data));
            return createBlob([arrayBuff], { type: encodedBlob.type });
          }
          function _isEncodedBlob(value) {
            return value && value.__local_forage_encoded_blob;
          }
          function _fullyReady(callback) {
            var self2 = this;
            var promise = self2._initReady().then(function() {
              var dbContext = dbContexts[self2._dbInfo.name];
              if (dbContext && dbContext.dbReady) {
                return dbContext.dbReady;
              }
            });
            executeTwoCallbacks(promise, callback, callback);
            return promise;
          }
          function _tryReconnect(dbInfo) {
            _deferReadiness(dbInfo);
            var dbContext = dbContexts[dbInfo.name];
            var forages = dbContext.forages;
            for (var i = 0; i < forages.length; i++) {
              var forage = forages[i];
              if (forage._dbInfo.db) {
                forage._dbInfo.db.close();
                forage._dbInfo.db = null;
              }
            }
            dbInfo.db = null;
            return _getOriginalConnection(dbInfo).then(function(db) {
              dbInfo.db = db;
              if (_isUpgradeNeeded(dbInfo)) {
                return _getUpgradedConnection(dbInfo);
              }
              return db;
            }).then(function(db) {
              dbInfo.db = dbContext.db = db;
              for (var i2 = 0; i2 < forages.length; i2++) {
                forages[i2]._dbInfo.db = db;
              }
            })["catch"](function(err) {
              _rejectReadiness(dbInfo, err);
              throw err;
            });
          }
          function createTransaction(dbInfo, mode, callback, retries) {
            if (retries === void 0) {
              retries = 1;
            }
            try {
              var tx = dbInfo.db.transaction(dbInfo.storeName, mode);
              callback(null, tx);
            } catch (err) {
              if (retries > 0 && (!dbInfo.db || err.name === "InvalidStateError" || err.name === "NotFoundError")) {
                return Promise$1.resolve().then(function() {
                  if (!dbInfo.db || err.name === "NotFoundError" && !dbInfo.db.objectStoreNames.contains(dbInfo.storeName) && dbInfo.version <= dbInfo.db.version) {
                    if (dbInfo.db) {
                      dbInfo.version = dbInfo.db.version + 1;
                    }
                    return _getUpgradedConnection(dbInfo);
                  }
                }).then(function() {
                  return _tryReconnect(dbInfo).then(function() {
                    createTransaction(dbInfo, mode, callback, retries - 1);
                  });
                })["catch"](callback);
              }
              callback(err);
            }
          }
          function createDbContext() {
            return {
              // Running localForages sharing a database.
              forages: [],
              // Shared database.
              db: null,
              // Database readiness (promise).
              dbReady: null,
              // Deferred operations on the database.
              deferredOperations: []
            };
          }
          function _initStorage(options) {
            var self2 = this;
            var dbInfo = {
              db: null
            };
            if (options) {
              for (var i in options) {
                dbInfo[i] = options[i];
              }
            }
            var dbContext = dbContexts[dbInfo.name];
            if (!dbContext) {
              dbContext = createDbContext();
              dbContexts[dbInfo.name] = dbContext;
            }
            dbContext.forages.push(self2);
            if (!self2._initReady) {
              self2._initReady = self2.ready;
              self2.ready = _fullyReady;
            }
            var initPromises = [];
            function ignoreErrors() {
              return Promise$1.resolve();
            }
            for (var j = 0; j < dbContext.forages.length; j++) {
              var forage = dbContext.forages[j];
              if (forage !== self2) {
                initPromises.push(forage._initReady()["catch"](ignoreErrors));
              }
            }
            var forages = dbContext.forages.slice(0);
            return Promise$1.all(initPromises).then(function() {
              dbInfo.db = dbContext.db;
              return _getOriginalConnection(dbInfo);
            }).then(function(db) {
              dbInfo.db = db;
              if (_isUpgradeNeeded(dbInfo, self2._defaultConfig.version)) {
                return _getUpgradedConnection(dbInfo);
              }
              return db;
            }).then(function(db) {
              dbInfo.db = dbContext.db = db;
              self2._dbInfo = dbInfo;
              for (var k = 0; k < forages.length; k++) {
                var forage2 = forages[k];
                if (forage2 !== self2) {
                  forage2._dbInfo.db = dbInfo.db;
                  forage2._dbInfo.version = dbInfo.version;
                }
              }
            });
          }
          function getItem(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.get(key2);
                    req.onsuccess = function() {
                      var value = req.result;
                      if (value === void 0) {
                        value = null;
                      }
                      if (_isEncodedBlob(value)) {
                        value = _decodeBlob(value);
                      }
                      resolve(value);
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function iterate(iterator, callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.openCursor();
                    var iterationNumber = 1;
                    req.onsuccess = function() {
                      var cursor = req.result;
                      if (cursor) {
                        var value = cursor.value;
                        if (_isEncodedBlob(value)) {
                          value = _decodeBlob(value);
                        }
                        var result = iterator(value, cursor.key, iterationNumber++);
                        if (result !== void 0) {
                          resolve(result);
                        } else {
                          cursor["continue"]();
                        }
                      } else {
                        resolve();
                      }
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function setItem(key2, value, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              var dbInfo;
              self2.ready().then(function() {
                dbInfo = self2._dbInfo;
                if (toString.call(value) === "[object Blob]") {
                  return _checkBlobSupport(dbInfo.db).then(function(blobSupport) {
                    if (blobSupport) {
                      return value;
                    }
                    return _encodeBlob(value);
                  });
                }
                return value;
              }).then(function(value2) {
                createTransaction(self2._dbInfo, READ_WRITE, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    if (value2 === null) {
                      value2 = void 0;
                    }
                    var req = store.put(value2, key2);
                    transaction.oncomplete = function() {
                      if (value2 === void 0) {
                        value2 = null;
                      }
                      resolve(value2);
                    };
                    transaction.onabort = transaction.onerror = function() {
                      var err2 = req.error ? req.error : req.transaction.error;
                      reject(err2);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function removeItem(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_WRITE, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store["delete"](key2);
                    transaction.oncomplete = function() {
                      resolve();
                    };
                    transaction.onerror = function() {
                      reject(req.error);
                    };
                    transaction.onabort = function() {
                      var err2 = req.error ? req.error : req.transaction.error;
                      reject(err2);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function clear2(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_WRITE, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.clear();
                    transaction.oncomplete = function() {
                      resolve();
                    };
                    transaction.onabort = transaction.onerror = function() {
                      var err2 = req.error ? req.error : req.transaction.error;
                      reject(err2);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function length(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.count();
                    req.onsuccess = function() {
                      resolve(req.result);
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function key(n, callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              if (n < 0) {
                resolve(null);
                return;
              }
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var advanced = false;
                    var req = store.openKeyCursor();
                    req.onsuccess = function() {
                      var cursor = req.result;
                      if (!cursor) {
                        resolve(null);
                        return;
                      }
                      if (n === 0) {
                        resolve(cursor.key);
                      } else {
                        if (!advanced) {
                          advanced = true;
                          cursor.advance(n);
                        } else {
                          resolve(cursor.key);
                        }
                      }
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function keys(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                createTransaction(self2._dbInfo, READ_ONLY, function(err, transaction) {
                  if (err) {
                    return reject(err);
                  }
                  try {
                    var store = transaction.objectStore(self2._dbInfo.storeName);
                    var req = store.openKeyCursor();
                    var keys2 = [];
                    req.onsuccess = function() {
                      var cursor = req.result;
                      if (!cursor) {
                        resolve(keys2);
                        return;
                      }
                      keys2.push(cursor.key);
                      cursor["continue"]();
                    };
                    req.onerror = function() {
                      reject(req.error);
                    };
                  } catch (e) {
                    reject(e);
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function dropInstance(options, callback) {
            callback = getCallback.apply(this, arguments);
            var currentConfig = this.config();
            options = typeof options !== "function" && options || {};
            if (!options.name) {
              options.name = options.name || currentConfig.name;
              options.storeName = options.storeName || currentConfig.storeName;
            }
            var self2 = this;
            var promise;
            if (!options.name) {
              promise = Promise$1.reject("Invalid arguments");
            } else {
              var isCurrentDb = options.name === currentConfig.name && self2._dbInfo.db;
              var dbPromise = isCurrentDb ? Promise$1.resolve(self2._dbInfo.db) : _getOriginalConnection(options).then(function(db) {
                var dbContext = dbContexts[options.name];
                var forages = dbContext.forages;
                dbContext.db = db;
                for (var i = 0; i < forages.length; i++) {
                  forages[i]._dbInfo.db = db;
                }
                return db;
              });
              if (!options.storeName) {
                promise = dbPromise.then(function(db) {
                  _deferReadiness(options);
                  var dbContext = dbContexts[options.name];
                  var forages = dbContext.forages;
                  db.close();
                  for (var i = 0; i < forages.length; i++) {
                    var forage = forages[i];
                    forage._dbInfo.db = null;
                  }
                  var dropDBPromise = new Promise$1(function(resolve, reject) {
                    var req = idb.deleteDatabase(options.name);
                    req.onerror = function() {
                      var db2 = req.result;
                      if (db2) {
                        db2.close();
                      }
                      reject(req.error);
                    };
                    req.onblocked = function() {
                      console.warn('dropInstance blocked for database "' + options.name + '" until all open connections are closed');
                    };
                    req.onsuccess = function() {
                      var db2 = req.result;
                      if (db2) {
                        db2.close();
                      }
                      resolve(db2);
                    };
                  });
                  return dropDBPromise.then(function(db2) {
                    dbContext.db = db2;
                    for (var i2 = 0; i2 < forages.length; i2++) {
                      var _forage = forages[i2];
                      _advanceReadiness(_forage._dbInfo);
                    }
                  })["catch"](function(err) {
                    (_rejectReadiness(options, err) || Promise$1.resolve())["catch"](function() {
                    });
                    throw err;
                  });
                });
              } else {
                promise = dbPromise.then(function(db) {
                  if (!db.objectStoreNames.contains(options.storeName)) {
                    return;
                  }
                  var newVersion = db.version + 1;
                  _deferReadiness(options);
                  var dbContext = dbContexts[options.name];
                  var forages = dbContext.forages;
                  db.close();
                  for (var i = 0; i < forages.length; i++) {
                    var forage = forages[i];
                    forage._dbInfo.db = null;
                    forage._dbInfo.version = newVersion;
                  }
                  var dropObjectPromise = new Promise$1(function(resolve, reject) {
                    var req = idb.open(options.name, newVersion);
                    req.onerror = function(err) {
                      var db2 = req.result;
                      db2.close();
                      reject(err);
                    };
                    req.onupgradeneeded = function() {
                      var db2 = req.result;
                      db2.deleteObjectStore(options.storeName);
                    };
                    req.onsuccess = function() {
                      var db2 = req.result;
                      db2.close();
                      resolve(db2);
                    };
                  });
                  return dropObjectPromise.then(function(db2) {
                    dbContext.db = db2;
                    for (var j = 0; j < forages.length; j++) {
                      var _forage2 = forages[j];
                      _forage2._dbInfo.db = db2;
                      _advanceReadiness(_forage2._dbInfo);
                    }
                  })["catch"](function(err) {
                    (_rejectReadiness(options, err) || Promise$1.resolve())["catch"](function() {
                    });
                    throw err;
                  });
                });
              }
            }
            executeCallback(promise, callback);
            return promise;
          }
          var asyncStorage = {
            _driver: "asyncStorage",
            _initStorage,
            _support: isIndexedDBValid(),
            iterate,
            getItem,
            setItem,
            removeItem,
            clear: clear2,
            length,
            key,
            keys,
            dropInstance
          };
          function isWebSQLValid() {
            return typeof openDatabase === "function";
          }
          var BASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
          var BLOB_TYPE_PREFIX = "~~local_forage_type~";
          var BLOB_TYPE_PREFIX_REGEX = /^~~local_forage_type~([^~]+)~/;
          var SERIALIZED_MARKER = "__lfsc__:";
          var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;
          var TYPE_ARRAYBUFFER = "arbf";
          var TYPE_BLOB = "blob";
          var TYPE_INT8ARRAY = "si08";
          var TYPE_UINT8ARRAY = "ui08";
          var TYPE_UINT8CLAMPEDARRAY = "uic8";
          var TYPE_INT16ARRAY = "si16";
          var TYPE_INT32ARRAY = "si32";
          var TYPE_UINT16ARRAY = "ur16";
          var TYPE_UINT32ARRAY = "ui32";
          var TYPE_FLOAT32ARRAY = "fl32";
          var TYPE_FLOAT64ARRAY = "fl64";
          var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH + TYPE_ARRAYBUFFER.length;
          var toString$1 = Object.prototype.toString;
          function stringToBuffer(serializedString) {
            var bufferLength = serializedString.length * 0.75;
            var len = serializedString.length;
            var i;
            var p = 0;
            var encoded1, encoded2, encoded3, encoded4;
            if (serializedString[serializedString.length - 1] === "=") {
              bufferLength--;
              if (serializedString[serializedString.length - 2] === "=") {
                bufferLength--;
              }
            }
            var buffer = new ArrayBuffer(bufferLength);
            var bytes = new Uint8Array(buffer);
            for (i = 0; i < len; i += 4) {
              encoded1 = BASE_CHARS.indexOf(serializedString[i]);
              encoded2 = BASE_CHARS.indexOf(serializedString[i + 1]);
              encoded3 = BASE_CHARS.indexOf(serializedString[i + 2]);
              encoded4 = BASE_CHARS.indexOf(serializedString[i + 3]);
              bytes[p++] = encoded1 << 2 | encoded2 >> 4;
              bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
              bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
            }
            return buffer;
          }
          function bufferToString(buffer) {
            var bytes = new Uint8Array(buffer);
            var base64String = "";
            var i;
            for (i = 0; i < bytes.length; i += 3) {
              base64String += BASE_CHARS[bytes[i] >> 2];
              base64String += BASE_CHARS[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
              base64String += BASE_CHARS[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
              base64String += BASE_CHARS[bytes[i + 2] & 63];
            }
            if (bytes.length % 3 === 2) {
              base64String = base64String.substring(0, base64String.length - 1) + "=";
            } else if (bytes.length % 3 === 1) {
              base64String = base64String.substring(0, base64String.length - 2) + "==";
            }
            return base64String;
          }
          function serialize(value, callback) {
            var valueType = "";
            if (value) {
              valueType = toString$1.call(value);
            }
            if (value && (valueType === "[object ArrayBuffer]" || value.buffer && toString$1.call(value.buffer) === "[object ArrayBuffer]")) {
              var buffer;
              var marker = SERIALIZED_MARKER;
              if (value instanceof ArrayBuffer) {
                buffer = value;
                marker += TYPE_ARRAYBUFFER;
              } else {
                buffer = value.buffer;
                if (valueType === "[object Int8Array]") {
                  marker += TYPE_INT8ARRAY;
                } else if (valueType === "[object Uint8Array]") {
                  marker += TYPE_UINT8ARRAY;
                } else if (valueType === "[object Uint8ClampedArray]") {
                  marker += TYPE_UINT8CLAMPEDARRAY;
                } else if (valueType === "[object Int16Array]") {
                  marker += TYPE_INT16ARRAY;
                } else if (valueType === "[object Uint16Array]") {
                  marker += TYPE_UINT16ARRAY;
                } else if (valueType === "[object Int32Array]") {
                  marker += TYPE_INT32ARRAY;
                } else if (valueType === "[object Uint32Array]") {
                  marker += TYPE_UINT32ARRAY;
                } else if (valueType === "[object Float32Array]") {
                  marker += TYPE_FLOAT32ARRAY;
                } else if (valueType === "[object Float64Array]") {
                  marker += TYPE_FLOAT64ARRAY;
                } else {
                  callback(new Error("Failed to get type for BinaryArray"));
                }
              }
              callback(marker + bufferToString(buffer));
            } else if (valueType === "[object Blob]") {
              var fileReader = new FileReader();
              fileReader.onload = function() {
                var str = BLOB_TYPE_PREFIX + value.type + "~" + bufferToString(this.result);
                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
              };
              fileReader.readAsArrayBuffer(value);
            } else {
              try {
                callback(JSON.stringify(value));
              } catch (e) {
                console.error("Couldn't convert value into a JSON string: ", value);
                callback(null, e);
              }
            }
          }
          function deserialize(value) {
            if (value.substring(0, SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
              return JSON.parse(value);
            }
            var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
            var type = value.substring(SERIALIZED_MARKER_LENGTH, TYPE_SERIALIZED_MARKER_LENGTH);
            var blobType;
            if (type === TYPE_BLOB && BLOB_TYPE_PREFIX_REGEX.test(serializedString)) {
              var matcher = serializedString.match(BLOB_TYPE_PREFIX_REGEX);
              blobType = matcher[1];
              serializedString = serializedString.substring(matcher[0].length);
            }
            var buffer = stringToBuffer(serializedString);
            switch (type) {
              case TYPE_ARRAYBUFFER:
                return buffer;
              case TYPE_BLOB:
                return createBlob([buffer], { type: blobType });
              case TYPE_INT8ARRAY:
                return new Int8Array(buffer);
              case TYPE_UINT8ARRAY:
                return new Uint8Array(buffer);
              case TYPE_UINT8CLAMPEDARRAY:
                return new Uint8ClampedArray(buffer);
              case TYPE_INT16ARRAY:
                return new Int16Array(buffer);
              case TYPE_UINT16ARRAY:
                return new Uint16Array(buffer);
              case TYPE_INT32ARRAY:
                return new Int32Array(buffer);
              case TYPE_UINT32ARRAY:
                return new Uint32Array(buffer);
              case TYPE_FLOAT32ARRAY:
                return new Float32Array(buffer);
              case TYPE_FLOAT64ARRAY:
                return new Float64Array(buffer);
              default:
                throw new Error("Unkown type: " + type);
            }
          }
          var localforageSerializer = {
            serialize,
            deserialize,
            stringToBuffer,
            bufferToString
          };
          function createDbTable(t, dbInfo, callback, errorCallback) {
            t.executeSql("CREATE TABLE IF NOT EXISTS " + dbInfo.storeName + " (id INTEGER PRIMARY KEY, key unique, value)", [], callback, errorCallback);
          }
          function _initStorage$1(options) {
            var self2 = this;
            var dbInfo = {
              db: null
            };
            if (options) {
              for (var i in options) {
                dbInfo[i] = typeof options[i] !== "string" ? options[i].toString() : options[i];
              }
            }
            var dbInfoPromise = new Promise$1(function(resolve, reject) {
              try {
                dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version), dbInfo.description, dbInfo.size);
              } catch (e) {
                return reject(e);
              }
              dbInfo.db.transaction(function(t) {
                createDbTable(t, dbInfo, function() {
                  self2._dbInfo = dbInfo;
                  resolve();
                }, function(t2, error) {
                  reject(error);
                });
              }, reject);
            });
            dbInfo.serializer = localforageSerializer;
            return dbInfoPromise;
          }
          function tryExecuteSql(t, dbInfo, sqlStatement, args, callback, errorCallback) {
            t.executeSql(sqlStatement, args, callback, function(t2, error) {
              if (error.code === error.SYNTAX_ERR) {
                t2.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [dbInfo.storeName], function(t3, results) {
                  if (!results.rows.length) {
                    createDbTable(t3, dbInfo, function() {
                      t3.executeSql(sqlStatement, args, callback, errorCallback);
                    }, errorCallback);
                  } else {
                    errorCallback(t3, error);
                  }
                }, errorCallback);
              } else {
                errorCallback(t2, error);
              }
            }, errorCallback);
          }
          function getItem$1(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT * FROM " + dbInfo.storeName + " WHERE key = ? LIMIT 1", [key2], function(t2, results) {
                    var result = results.rows.length ? results.rows.item(0).value : null;
                    if (result) {
                      result = dbInfo.serializer.deserialize(result);
                    }
                    resolve(result);
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function iterate$1(iterator, callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT * FROM " + dbInfo.storeName, [], function(t2, results) {
                    var rows = results.rows;
                    var length2 = rows.length;
                    for (var i = 0; i < length2; i++) {
                      var item = rows.item(i);
                      var result = item.value;
                      if (result) {
                        result = dbInfo.serializer.deserialize(result);
                      }
                      result = iterator(result, item.key, i + 1);
                      if (result !== void 0) {
                        resolve(result);
                        return;
                      }
                    }
                    resolve();
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function _setItem(key2, value, callback, retriesLeft) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                if (value === void 0) {
                  value = null;
                }
                var originalValue = value;
                var dbInfo = self2._dbInfo;
                dbInfo.serializer.serialize(value, function(value2, error) {
                  if (error) {
                    reject(error);
                  } else {
                    dbInfo.db.transaction(function(t) {
                      tryExecuteSql(t, dbInfo, "INSERT OR REPLACE INTO " + dbInfo.storeName + " (key, value) VALUES (?, ?)", [key2, value2], function() {
                        resolve(originalValue);
                      }, function(t2, error2) {
                        reject(error2);
                      });
                    }, function(sqlError) {
                      if (sqlError.code === sqlError.QUOTA_ERR) {
                        if (retriesLeft > 0) {
                          resolve(_setItem.apply(self2, [key2, originalValue, callback, retriesLeft - 1]));
                          return;
                        }
                        reject(sqlError);
                      }
                    });
                  }
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function setItem$1(key2, value, callback) {
            return _setItem.apply(this, [key2, value, callback, 1]);
          }
          function removeItem$1(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "DELETE FROM " + dbInfo.storeName + " WHERE key = ?", [key2], function() {
                    resolve();
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function clear$1(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "DELETE FROM " + dbInfo.storeName, [], function() {
                    resolve();
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function length$1(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT COUNT(key) as c FROM " + dbInfo.storeName, [], function(t2, results) {
                    var result = results.rows.item(0).c;
                    resolve(result);
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function key$1(n, callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT key FROM " + dbInfo.storeName + " WHERE id = ? LIMIT 1", [n + 1], function(t2, results) {
                    var result = results.rows.length ? results.rows.item(0).key : null;
                    resolve(result);
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function keys$1(callback) {
            var self2 = this;
            var promise = new Promise$1(function(resolve, reject) {
              self2.ready().then(function() {
                var dbInfo = self2._dbInfo;
                dbInfo.db.transaction(function(t) {
                  tryExecuteSql(t, dbInfo, "SELECT key FROM " + dbInfo.storeName, [], function(t2, results) {
                    var keys2 = [];
                    for (var i = 0; i < results.rows.length; i++) {
                      keys2.push(results.rows.item(i).key);
                    }
                    resolve(keys2);
                  }, function(t2, error) {
                    reject(error);
                  });
                });
              })["catch"](reject);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function getAllStoreNames(db) {
            return new Promise$1(function(resolve, reject) {
              db.transaction(function(t) {
                t.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name <> '__WebKitDatabaseInfoTable__'", [], function(t2, results) {
                  var storeNames = [];
                  for (var i = 0; i < results.rows.length; i++) {
                    storeNames.push(results.rows.item(i).name);
                  }
                  resolve({
                    db,
                    storeNames
                  });
                }, function(t2, error) {
                  reject(error);
                });
              }, function(sqlError) {
                reject(sqlError);
              });
            });
          }
          function dropInstance$1(options, callback) {
            callback = getCallback.apply(this, arguments);
            var currentConfig = this.config();
            options = typeof options !== "function" && options || {};
            if (!options.name) {
              options.name = options.name || currentConfig.name;
              options.storeName = options.storeName || currentConfig.storeName;
            }
            var self2 = this;
            var promise;
            if (!options.name) {
              promise = Promise$1.reject("Invalid arguments");
            } else {
              promise = new Promise$1(function(resolve) {
                var db;
                if (options.name === currentConfig.name) {
                  db = self2._dbInfo.db;
                } else {
                  db = openDatabase(options.name, "", "", 0);
                }
                if (!options.storeName) {
                  resolve(getAllStoreNames(db));
                } else {
                  resolve({
                    db,
                    storeNames: [options.storeName]
                  });
                }
              }).then(function(operationInfo) {
                return new Promise$1(function(resolve, reject) {
                  operationInfo.db.transaction(function(t) {
                    function dropTable(storeName) {
                      return new Promise$1(function(resolve2, reject2) {
                        t.executeSql("DROP TABLE IF EXISTS " + storeName, [], function() {
                          resolve2();
                        }, function(t2, error) {
                          reject2(error);
                        });
                      });
                    }
                    var operations = [];
                    for (var i = 0, len = operationInfo.storeNames.length; i < len; i++) {
                      operations.push(dropTable(operationInfo.storeNames[i]));
                    }
                    Promise$1.all(operations).then(function() {
                      resolve();
                    })["catch"](function(e) {
                      reject(e);
                    });
                  }, function(sqlError) {
                    reject(sqlError);
                  });
                });
              });
            }
            executeCallback(promise, callback);
            return promise;
          }
          var webSQLStorage = {
            _driver: "webSQLStorage",
            _initStorage: _initStorage$1,
            _support: isWebSQLValid(),
            iterate: iterate$1,
            getItem: getItem$1,
            setItem: setItem$1,
            removeItem: removeItem$1,
            clear: clear$1,
            length: length$1,
            key: key$1,
            keys: keys$1,
            dropInstance: dropInstance$1
          };
          function isLocalStorageValid() {
            try {
              return typeof localStorage !== "undefined" && "setItem" in localStorage && // in IE8 typeof localStorage.setItem === 'object'
              !!localStorage.setItem;
            } catch (e) {
              return false;
            }
          }
          function _getKeyPrefix(options, defaultConfig) {
            var keyPrefix = options.name + "/";
            if (options.storeName !== defaultConfig.storeName) {
              keyPrefix += options.storeName + "/";
            }
            return keyPrefix;
          }
          function checkIfLocalStorageThrows() {
            var localStorageTestKey = "_localforage_support_test";
            try {
              localStorage.setItem(localStorageTestKey, true);
              localStorage.removeItem(localStorageTestKey);
              return false;
            } catch (e) {
              return true;
            }
          }
          function _isLocalStorageUsable() {
            return !checkIfLocalStorageThrows() || localStorage.length > 0;
          }
          function _initStorage$2(options) {
            var self2 = this;
            var dbInfo = {};
            if (options) {
              for (var i in options) {
                dbInfo[i] = options[i];
              }
            }
            dbInfo.keyPrefix = _getKeyPrefix(options, self2._defaultConfig);
            if (!_isLocalStorageUsable()) {
              return Promise$1.reject();
            }
            self2._dbInfo = dbInfo;
            dbInfo.serializer = localforageSerializer;
            return Promise$1.resolve();
          }
          function clear$2(callback) {
            var self2 = this;
            var promise = self2.ready().then(function() {
              var keyPrefix = self2._dbInfo.keyPrefix;
              for (var i = localStorage.length - 1; i >= 0; i--) {
                var key2 = localStorage.key(i);
                if (key2.indexOf(keyPrefix) === 0) {
                  localStorage.removeItem(key2);
                }
              }
            });
            executeCallback(promise, callback);
            return promise;
          }
          function getItem$2(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              var result = localStorage.getItem(dbInfo.keyPrefix + key2);
              if (result) {
                result = dbInfo.serializer.deserialize(result);
              }
              return result;
            });
            executeCallback(promise, callback);
            return promise;
          }
          function iterate$2(iterator, callback) {
            var self2 = this;
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              var keyPrefix = dbInfo.keyPrefix;
              var keyPrefixLength = keyPrefix.length;
              var length2 = localStorage.length;
              var iterationNumber = 1;
              for (var i = 0; i < length2; i++) {
                var key2 = localStorage.key(i);
                if (key2.indexOf(keyPrefix) !== 0) {
                  continue;
                }
                var value = localStorage.getItem(key2);
                if (value) {
                  value = dbInfo.serializer.deserialize(value);
                }
                value = iterator(value, key2.substring(keyPrefixLength), iterationNumber++);
                if (value !== void 0) {
                  return value;
                }
              }
            });
            executeCallback(promise, callback);
            return promise;
          }
          function key$2(n, callback) {
            var self2 = this;
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              var result;
              try {
                result = localStorage.key(n);
              } catch (error) {
                result = null;
              }
              if (result) {
                result = result.substring(dbInfo.keyPrefix.length);
              }
              return result;
            });
            executeCallback(promise, callback);
            return promise;
          }
          function keys$2(callback) {
            var self2 = this;
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              var length2 = localStorage.length;
              var keys2 = [];
              for (var i = 0; i < length2; i++) {
                var itemKey = localStorage.key(i);
                if (itemKey.indexOf(dbInfo.keyPrefix) === 0) {
                  keys2.push(itemKey.substring(dbInfo.keyPrefix.length));
                }
              }
              return keys2;
            });
            executeCallback(promise, callback);
            return promise;
          }
          function length$2(callback) {
            var self2 = this;
            var promise = self2.keys().then(function(keys2) {
              return keys2.length;
            });
            executeCallback(promise, callback);
            return promise;
          }
          function removeItem$2(key2, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = self2.ready().then(function() {
              var dbInfo = self2._dbInfo;
              localStorage.removeItem(dbInfo.keyPrefix + key2);
            });
            executeCallback(promise, callback);
            return promise;
          }
          function setItem$2(key2, value, callback) {
            var self2 = this;
            key2 = normalizeKey(key2);
            var promise = self2.ready().then(function() {
              if (value === void 0) {
                value = null;
              }
              var originalValue = value;
              return new Promise$1(function(resolve, reject) {
                var dbInfo = self2._dbInfo;
                dbInfo.serializer.serialize(value, function(value2, error) {
                  if (error) {
                    reject(error);
                  } else {
                    try {
                      localStorage.setItem(dbInfo.keyPrefix + key2, value2);
                      resolve(originalValue);
                    } catch (e) {
                      if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
                        reject(e);
                      }
                      reject(e);
                    }
                  }
                });
              });
            });
            executeCallback(promise, callback);
            return promise;
          }
          function dropInstance$2(options, callback) {
            callback = getCallback.apply(this, arguments);
            options = typeof options !== "function" && options || {};
            if (!options.name) {
              var currentConfig = this.config();
              options.name = options.name || currentConfig.name;
              options.storeName = options.storeName || currentConfig.storeName;
            }
            var self2 = this;
            var promise;
            if (!options.name) {
              promise = Promise$1.reject("Invalid arguments");
            } else {
              promise = new Promise$1(function(resolve) {
                if (!options.storeName) {
                  resolve(options.name + "/");
                } else {
                  resolve(_getKeyPrefix(options, self2._defaultConfig));
                }
              }).then(function(keyPrefix) {
                for (var i = localStorage.length - 1; i >= 0; i--) {
                  var key2 = localStorage.key(i);
                  if (key2.indexOf(keyPrefix) === 0) {
                    localStorage.removeItem(key2);
                  }
                }
              });
            }
            executeCallback(promise, callback);
            return promise;
          }
          var localStorageWrapper = {
            _driver: "localStorageWrapper",
            _initStorage: _initStorage$2,
            _support: isLocalStorageValid(),
            iterate: iterate$2,
            getItem: getItem$2,
            setItem: setItem$2,
            removeItem: removeItem$2,
            clear: clear$2,
            length: length$2,
            key: key$2,
            keys: keys$2,
            dropInstance: dropInstance$2
          };
          var sameValue = function sameValue2(x, y) {
            return x === y || typeof x === "number" && typeof y === "number" && isNaN(x) && isNaN(y);
          };
          var includes = function includes2(array, searchElement) {
            var len = array.length;
            var i = 0;
            while (i < len) {
              if (sameValue(array[i], searchElement)) {
                return true;
              }
              i++;
            }
            return false;
          };
          var isArray = Array.isArray || function(arg) {
            return Object.prototype.toString.call(arg) === "[object Array]";
          };
          var DefinedDrivers = {};
          var DriverSupport = {};
          var DefaultDrivers = {
            INDEXEDDB: asyncStorage,
            WEBSQL: webSQLStorage,
            LOCALSTORAGE: localStorageWrapper
          };
          var DefaultDriverOrder = [DefaultDrivers.INDEXEDDB._driver, DefaultDrivers.WEBSQL._driver, DefaultDrivers.LOCALSTORAGE._driver];
          var OptionalDriverMethods = ["dropInstance"];
          var LibraryMethods = ["clear", "getItem", "iterate", "key", "keys", "length", "removeItem", "setItem"].concat(OptionalDriverMethods);
          var DefaultConfig = {
            description: "",
            driver: DefaultDriverOrder.slice(),
            name: "localforage",
            // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
            // we can use without a prompt.
            size: 4980736,
            storeName: "keyvaluepairs",
            version: 1
          };
          function callWhenReady(localForageInstance, libraryMethod) {
            localForageInstance[libraryMethod] = function() {
              var _args = arguments;
              return localForageInstance.ready().then(function() {
                return localForageInstance[libraryMethod].apply(localForageInstance, _args);
              });
            };
          }
          function extend() {
            for (var i = 1; i < arguments.length; i++) {
              var arg = arguments[i];
              if (arg) {
                for (var _key in arg) {
                  if (arg.hasOwnProperty(_key)) {
                    if (isArray(arg[_key])) {
                      arguments[0][_key] = arg[_key].slice();
                    } else {
                      arguments[0][_key] = arg[_key];
                    }
                  }
                }
              }
            }
            return arguments[0];
          }
          var LocalForage = function() {
            function LocalForage2(options) {
              _classCallCheck(this, LocalForage2);
              for (var driverTypeKey in DefaultDrivers) {
                if (DefaultDrivers.hasOwnProperty(driverTypeKey)) {
                  var driver = DefaultDrivers[driverTypeKey];
                  var driverName = driver._driver;
                  this[driverTypeKey] = driverName;
                  if (!DefinedDrivers[driverName]) {
                    this.defineDriver(driver);
                  }
                }
              }
              this._defaultConfig = extend({}, DefaultConfig);
              this._config = extend({}, this._defaultConfig, options);
              this._driverSet = null;
              this._initDriver = null;
              this._ready = false;
              this._dbInfo = null;
              this._wrapLibraryMethodsWithReady();
              this.setDriver(this._config.driver)["catch"](function() {
              });
            }
            LocalForage2.prototype.config = function config(options) {
              if ((typeof options === "undefined" ? "undefined" : _typeof(options)) === "object") {
                if (this._ready) {
                  return new Error("Can't call config() after localforage has been used.");
                }
                for (var i in options) {
                  if (i === "storeName") {
                    options[i] = options[i].replace(/\W/g, "_");
                  }
                  if (i === "version" && typeof options[i] !== "number") {
                    return new Error("Database version must be a number.");
                  }
                  this._config[i] = options[i];
                }
                if ("driver" in options && options.driver) {
                  return this.setDriver(this._config.driver);
                }
                return true;
              } else if (typeof options === "string") {
                return this._config[options];
              } else {
                return this._config;
              }
            };
            LocalForage2.prototype.defineDriver = function defineDriver(driverObject, callback, errorCallback) {
              var promise = new Promise$1(function(resolve, reject) {
                try {
                  var driverName = driverObject._driver;
                  var complianceError = new Error("Custom driver not compliant; see https://mozilla.github.io/localForage/#definedriver");
                  if (!driverObject._driver) {
                    reject(complianceError);
                    return;
                  }
                  var driverMethods = LibraryMethods.concat("_initStorage");
                  for (var i = 0, len = driverMethods.length; i < len; i++) {
                    var driverMethodName = driverMethods[i];
                    var isRequired = !includes(OptionalDriverMethods, driverMethodName);
                    if ((isRequired || driverObject[driverMethodName]) && typeof driverObject[driverMethodName] !== "function") {
                      reject(complianceError);
                      return;
                    }
                  }
                  var configureMissingMethods = function configureMissingMethods2() {
                    var methodNotImplementedFactory = function methodNotImplementedFactory2(methodName) {
                      return function() {
                        var error = new Error("Method " + methodName + " is not implemented by the current driver");
                        var promise2 = Promise$1.reject(error);
                        executeCallback(promise2, arguments[arguments.length - 1]);
                        return promise2;
                      };
                    };
                    for (var _i = 0, _len = OptionalDriverMethods.length; _i < _len; _i++) {
                      var optionalDriverMethod = OptionalDriverMethods[_i];
                      if (!driverObject[optionalDriverMethod]) {
                        driverObject[optionalDriverMethod] = methodNotImplementedFactory(optionalDriverMethod);
                      }
                    }
                  };
                  configureMissingMethods();
                  var setDriverSupport = function setDriverSupport2(support) {
                    if (DefinedDrivers[driverName]) {
                      console.info("Redefining LocalForage driver: " + driverName);
                    }
                    DefinedDrivers[driverName] = driverObject;
                    DriverSupport[driverName] = support;
                    resolve();
                  };
                  if ("_support" in driverObject) {
                    if (driverObject._support && typeof driverObject._support === "function") {
                      driverObject._support().then(setDriverSupport, reject);
                    } else {
                      setDriverSupport(!!driverObject._support);
                    }
                  } else {
                    setDriverSupport(true);
                  }
                } catch (e) {
                  reject(e);
                }
              });
              executeTwoCallbacks(promise, callback, errorCallback);
              return promise;
            };
            LocalForage2.prototype.driver = function driver() {
              return this._driver || null;
            };
            LocalForage2.prototype.getDriver = function getDriver(driverName, callback, errorCallback) {
              var getDriverPromise = DefinedDrivers[driverName] ? Promise$1.resolve(DefinedDrivers[driverName]) : Promise$1.reject(new Error("Driver not found."));
              executeTwoCallbacks(getDriverPromise, callback, errorCallback);
              return getDriverPromise;
            };
            LocalForage2.prototype.getSerializer = function getSerializer(callback) {
              var serializerPromise = Promise$1.resolve(localforageSerializer);
              executeTwoCallbacks(serializerPromise, callback);
              return serializerPromise;
            };
            LocalForage2.prototype.ready = function ready(callback) {
              var self2 = this;
              var promise = self2._driverSet.then(function() {
                if (self2._ready === null) {
                  self2._ready = self2._initDriver();
                }
                return self2._ready;
              });
              executeTwoCallbacks(promise, callback, callback);
              return promise;
            };
            LocalForage2.prototype.setDriver = function setDriver(drivers, callback, errorCallback) {
              var self2 = this;
              if (!isArray(drivers)) {
                drivers = [drivers];
              }
              var supportedDrivers = this._getSupportedDrivers(drivers);
              function setDriverToConfig() {
                self2._config.driver = self2.driver();
              }
              function extendSelfWithDriver(driver) {
                self2._extend(driver);
                setDriverToConfig();
                self2._ready = self2._initStorage(self2._config);
                return self2._ready;
              }
              function initDriver(supportedDrivers2) {
                return function() {
                  var currentDriverIndex = 0;
                  function driverPromiseLoop() {
                    while (currentDriverIndex < supportedDrivers2.length) {
                      var driverName = supportedDrivers2[currentDriverIndex];
                      currentDriverIndex++;
                      self2._dbInfo = null;
                      self2._ready = null;
                      return self2.getDriver(driverName).then(extendSelfWithDriver)["catch"](driverPromiseLoop);
                    }
                    setDriverToConfig();
                    var error = new Error("No available storage method found.");
                    self2._driverSet = Promise$1.reject(error);
                    return self2._driverSet;
                  }
                  return driverPromiseLoop();
                };
              }
              var oldDriverSetDone = this._driverSet !== null ? this._driverSet["catch"](function() {
                return Promise$1.resolve();
              }) : Promise$1.resolve();
              this._driverSet = oldDriverSetDone.then(function() {
                var driverName = supportedDrivers[0];
                self2._dbInfo = null;
                self2._ready = null;
                return self2.getDriver(driverName).then(function(driver) {
                  self2._driver = driver._driver;
                  setDriverToConfig();
                  self2._wrapLibraryMethodsWithReady();
                  self2._initDriver = initDriver(supportedDrivers);
                });
              })["catch"](function() {
                setDriverToConfig();
                var error = new Error("No available storage method found.");
                self2._driverSet = Promise$1.reject(error);
                return self2._driverSet;
              });
              executeTwoCallbacks(this._driverSet, callback, errorCallback);
              return this._driverSet;
            };
            LocalForage2.prototype.supports = function supports(driverName) {
              return !!DriverSupport[driverName];
            };
            LocalForage2.prototype._extend = function _extend(libraryMethodsAndProperties) {
              extend(this, libraryMethodsAndProperties);
            };
            LocalForage2.prototype._getSupportedDrivers = function _getSupportedDrivers(drivers) {
              var supportedDrivers = [];
              for (var i = 0, len = drivers.length; i < len; i++) {
                var driverName = drivers[i];
                if (this.supports(driverName)) {
                  supportedDrivers.push(driverName);
                }
              }
              return supportedDrivers;
            };
            LocalForage2.prototype._wrapLibraryMethodsWithReady = function _wrapLibraryMethodsWithReady() {
              for (var i = 0, len = LibraryMethods.length; i < len; i++) {
                callWhenReady(this, LibraryMethods[i]);
              }
            };
            LocalForage2.prototype.createInstance = function createInstance(options) {
              return new LocalForage2(options);
            };
            return LocalForage2;
          }();
          var localforage_js = new LocalForage();
          module3.exports = localforage_js;
        }, { "3": 3 }] }, {}, [4])(4);
      });
    }
  });

  // node_modules/pick-dom-element/dist/element-overlay.js
  var ElementOverlay = class {
    constructor(options) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
      this.overlay = document.createElement("div");
      this.overlay.className = options.className || "_ext-element-overlay";
      this.overlay.style.background = ((_a = options.style) === null || _a === void 0 ? void 0 : _a.background) || "rgba(250, 240, 202, 0.2)";
      this.overlay.style.borderColor = ((_b = options.style) === null || _b === void 0 ? void 0 : _b.borderColor) || "#F95738";
      this.overlay.style.borderStyle = ((_c = options.style) === null || _c === void 0 ? void 0 : _c.borderStyle) || "solid";
      this.overlay.style.borderRadius = ((_d = options.style) === null || _d === void 0 ? void 0 : _d.borderRadius) || "1px";
      this.overlay.style.borderWidth = ((_e = options.style) === null || _e === void 0 ? void 0 : _e.borderWidth) || "1px";
      this.overlay.style.boxSizing = ((_f = options.style) === null || _f === void 0 ? void 0 : _f.boxSizing) || "border-box";
      this.overlay.style.cursor = ((_g = options.style) === null || _g === void 0 ? void 0 : _g.cursor) || "crosshair";
      this.overlay.style.position = ((_h = options.style) === null || _h === void 0 ? void 0 : _h.position) || "absolute";
      this.overlay.style.zIndex = ((_j = options.style) === null || _j === void 0 ? void 0 : _j.zIndex) || "2147483647";
      this.overlay.style.margin = ((_k = options.style) === null || _k === void 0 ? void 0 : _k.margin) || "0px";
      this.overlay.style.padding = ((_l = options.style) === null || _l === void 0 ? void 0 : _l.padding) || "0px";
      this.shadowContainer = document.createElement("div");
      this.shadowContainer.className = "_ext-element-overlay-container";
      this.shadowContainer.style.position = "absolute";
      this.shadowContainer.style.top = "0px";
      this.shadowContainer.style.left = "0px";
      this.shadowContainer.style.margin = "0px";
      this.shadowContainer.style.padding = "0px";
      this.shadowRoot = this.shadowContainer.attachShadow({ mode: "open" });
    }
    addToDOM(parent, useShadowDOM) {
      this.usingShadowDOM = useShadowDOM;
      if (useShadowDOM) {
        parent.insertBefore(this.shadowContainer, parent.firstChild);
        this.shadowRoot.appendChild(this.overlay);
      } else {
        parent.appendChild(this.overlay);
      }
    }
    removeFromDOM() {
      this.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      this.overlay.remove();
      if (this.usingShadowDOM) {
        this.shadowContainer.remove();
      }
    }
    captureCursor() {
      this.overlay.style.pointerEvents = "auto";
    }
    ignoreCursor() {
      this.overlay.style.pointerEvents = "none";
    }
    setBounds({ x, y, width, height: height2 }) {
      this.overlay.style.left = x + "px";
      this.overlay.style.top = y + "px";
      this.overlay.style.width = width + "px";
      this.overlay.style.height = height2 + "px";
    }
  };

  // node_modules/pick-dom-element/dist/utils.js
  var getElementBounds = (el) => {
    const rect = el.getBoundingClientRect();
    return {
      x: window.pageXOffset + rect.left,
      y: window.pageYOffset + rect.top,
      width: el.offsetWidth,
      height: el.offsetHeight
    };
  };

  // node_modules/pick-dom-element/dist/element-picker.js
  var ElementPicker = class {
    constructor(overlayOptions) {
      this.handleMouseMove = (event) => {
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
      };
      this.handleClick = (event) => {
        var _a;
        if (this.target && ((_a = this.options) === null || _a === void 0 ? void 0 : _a.onClick)) {
          this.options.onClick(this.target);
        }
        event.preventDefault();
      };
      this.tick = () => {
        this.updateTarget();
        this.tickReq = window.requestAnimationFrame(this.tick);
      };
      this.active = false;
      this.overlay = new ElementOverlay(overlayOptions !== null && overlayOptions !== void 0 ? overlayOptions : {});
    }
    start(options) {
      var _a, _b;
      if (this.active) {
        return false;
      }
      this.active = true;
      this.options = options;
      document.addEventListener("mousemove", this.handleMouseMove, true);
      document.addEventListener("click", this.handleClick, true);
      this.overlay.addToDOM((_a = options.parentElement) !== null && _a !== void 0 ? _a : document.body, (_b = options.useShadowDOM) !== null && _b !== void 0 ? _b : true);
      this.tick();
      return true;
    }
    stop() {
      this.active = false;
      this.options = void 0;
      document.removeEventListener("mousemove", this.handleMouseMove, true);
      document.removeEventListener("click", this.handleClick, true);
      this.overlay.removeFromDOM();
      this.target = void 0;
      this.mouseX = void 0;
      this.mouseY = void 0;
      if (this.tickReq) {
        window.cancelAnimationFrame(this.tickReq);
      }
    }
    updateTarget() {
      var _a, _b;
      if (this.mouseX === void 0 || this.mouseY === void 0) {
        return;
      }
      this.overlay.ignoreCursor();
      const elAtCursor = document.elementFromPoint(this.mouseX, this.mouseY);
      const newTarget = elAtCursor;
      this.overlay.captureCursor();
      if (!newTarget || newTarget === this.target) {
        return;
      }
      if ((_a = this.options) === null || _a === void 0 ? void 0 : _a.elementFilter) {
        if (!this.options.elementFilter(newTarget)) {
          this.target = void 0;
          this.overlay.setBounds({ x: 0, y: 0, width: 0, height: 0 });
          return;
        }
      }
      this.target = newTarget;
      const bounds = getElementBounds(newTarget);
      this.overlay.setBounds(bounds);
      if ((_b = this.options) === null || _b === void 0 ? void 0 : _b.onHover) {
        this.options.onHover(newTarget);
      }
    }
  };

  // node_modules/css-selector-generator/esm/utilities-iselement.js
  function isElement(input) {
    return typeof input === "object" && input !== null && input.nodeType === Node.ELEMENT_NODE;
  }

  // node_modules/css-selector-generator/esm/types.js
  var OPERATOR = {
    NONE: "",
    DESCENDANT: " ",
    CHILD: " > "
  };
  var CSS_SELECTOR_TYPE = {
    id: "id",
    class: "class",
    tag: "tag",
    attribute: "attribute",
    nthchild: "nthchild",
    nthoftype: "nthoftype"
  };

  // node_modules/css-selector-generator/esm/utilities-typescript.js
  function isEnumValue(haystack, needle) {
    return Object.values(haystack).includes(needle);
  }

  // node_modules/css-selector-generator/esm/utilities-messages.js
  var libraryName = "CssSelectorGenerator";
  function showWarning(id = "unknown problem", ...args) {
    console.warn(`${libraryName}: ${id}`, ...args);
  }

  // node_modules/css-selector-generator/esm/utilities-options.js
  var DEFAULT_OPTIONS = {
    selectors: [
      CSS_SELECTOR_TYPE.id,
      CSS_SELECTOR_TYPE.class,
      CSS_SELECTOR_TYPE.tag,
      CSS_SELECTOR_TYPE.attribute
    ],
    // if set to true, always include tag name
    includeTag: false,
    whitelist: [],
    blacklist: [],
    combineWithinSelector: true,
    combineBetweenSelectors: true,
    root: null,
    maxCombinations: Number.POSITIVE_INFINITY,
    maxCandidates: Number.POSITIVE_INFINITY
  };
  function sanitizeSelectorTypes(input) {
    if (!Array.isArray(input)) {
      return [];
    }
    return input.filter((item) => isEnumValue(CSS_SELECTOR_TYPE, item));
  }
  function isRegExp(input) {
    return input instanceof RegExp;
  }
  function isCssSelectorMatch(input) {
    return ["string", "function"].includes(typeof input) || isRegExp(input);
  }
  function sanitizeCssSelectorMatchList(input) {
    if (!Array.isArray(input)) {
      return [];
    }
    return input.filter(isCssSelectorMatch);
  }
  function isNode(input) {
    return input instanceof Node;
  }
  function isParentNode(input) {
    const validParentNodeTypes = [
      Node.DOCUMENT_NODE,
      Node.DOCUMENT_FRAGMENT_NODE,
      // this includes Shadow DOM root
      Node.ELEMENT_NODE
    ];
    return isNode(input) && validParentNodeTypes.includes(input.nodeType);
  }
  function sanitizeRoot(input, element) {
    if (isParentNode(input)) {
      if (!input.contains(element)) {
        showWarning("element root mismatch", "Provided root does not contain the element. This will most likely result in producing a fallback selector using element's real root node. If you plan to use the selector using provided root (e.g. `root.querySelector`), it will not work as intended.");
      }
      return input;
    }
    const rootNode = element.getRootNode({ composed: false });
    if (isParentNode(rootNode)) {
      if (rootNode !== document) {
        showWarning("shadow root inferred", "You did not provide a root and the element is a child of Shadow DOM. This will produce a selector using ShadowRoot as a root. If you plan to use the selector using document as a root (e.g. `document.querySelector`), it will not work as intended.");
      }
      return rootNode;
    }
    return getRootNode(element);
  }
  function sanitizeMaxNumber(input) {
    return typeof input === "number" ? input : Number.POSITIVE_INFINITY;
  }
  function sanitizeOptions(element, custom_options = {}) {
    const options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), custom_options);
    return {
      selectors: sanitizeSelectorTypes(options.selectors),
      whitelist: sanitizeCssSelectorMatchList(options.whitelist),
      blacklist: sanitizeCssSelectorMatchList(options.blacklist),
      root: sanitizeRoot(options.root, element),
      combineWithinSelector: !!options.combineWithinSelector,
      combineBetweenSelectors: !!options.combineBetweenSelectors,
      includeTag: !!options.includeTag,
      maxCombinations: sanitizeMaxNumber(options.maxCombinations),
      maxCandidates: sanitizeMaxNumber(options.maxCandidates)
    };
  }

  // node_modules/css-selector-generator/esm/utilities-data.js
  function getIntersection(items = []) {
    const [firstItem = [], ...otherItems] = items;
    if (otherItems.length === 0) {
      return firstItem;
    }
    return otherItems.reduce((accumulator, currentValue) => {
      return accumulator.filter((item) => currentValue.includes(item));
    }, firstItem);
  }
  function flattenArray(input) {
    return [].concat(...input);
  }
  function wildcardToRegExp(input) {
    return input.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".+");
  }
  function createPatternMatcher(list) {
    const matchFunctions = list.map((item) => {
      if (isRegExp(item)) {
        return (input) => item.test(input);
      }
      if (typeof item === "function") {
        return (input) => {
          const result = item(input);
          if (typeof result !== "boolean") {
            showWarning("pattern matcher function invalid", "Provided pattern matching function does not return boolean. It's result will be ignored.", item);
            return false;
          }
          return result;
        };
      }
      if (typeof item === "string") {
        const re = new RegExp("^" + wildcardToRegExp(item) + "$");
        return (input) => re.test(input);
      }
      showWarning("pattern matcher invalid", "Pattern matching only accepts strings, regular expressions and/or functions. This item is invalid and will be ignored.", item);
      return () => false;
    });
    return (input) => matchFunctions.some((matchFunction) => matchFunction(input));
  }

  // node_modules/css-selector-generator/esm/utilities-dom.js
  function testSelector(elements, selector, root2) {
    const result = Array.from(sanitizeRoot(root2, elements[0]).querySelectorAll(selector));
    return result.length === elements.length && elements.every((element) => result.includes(element));
  }
  function getElementParents(element, root2) {
    root2 = root2 !== null && root2 !== void 0 ? root2 : getRootNode(element);
    const result = [];
    let parent = element;
    while (isElement(parent) && parent !== root2) {
      result.push(parent);
      parent = parent.parentElement;
    }
    return result;
  }
  function getParents(elements, root2) {
    return getIntersection(elements.map((element) => getElementParents(element, root2)));
  }
  function getRootNode(element) {
    return element.ownerDocument.querySelector(":root");
  }

  // node_modules/css-selector-generator/esm/constants.js
  var SELECTOR_SEPARATOR = ", ";
  var INVALID_ID_RE = new RegExp([
    "^$",
    // empty or not set
    "\\s"
    // contains whitespace
  ].join("|"));
  var INVALID_CLASS_RE = new RegExp([
    "^$"
    // empty or not set
  ].join("|"));
  var SELECTOR_PATTERN = [
    CSS_SELECTOR_TYPE.nthoftype,
    CSS_SELECTOR_TYPE.tag,
    CSS_SELECTOR_TYPE.id,
    CSS_SELECTOR_TYPE.class,
    CSS_SELECTOR_TYPE.attribute,
    CSS_SELECTOR_TYPE.nthchild
  ];

  // node_modules/css-selector-generator/esm/selector-attribute.js
  var attributeBlacklistMatch = createPatternMatcher([
    "class",
    "id",
    // Angular attributes
    "ng-*"
  ]);
  function attributeNodeToSimplifiedSelector({ name }) {
    return `[${name}]`;
  }
  function attributeNodeToSelector({ name, value }) {
    return `[${name}='${value}']`;
  }
  function isValidAttributeNode({ nodeName, nodeValue }, element) {
    const tagName = element.tagName.toLowerCase();
    if (["input", "option"].includes(tagName) && nodeName === "value") {
      return false;
    }
    if (nodeName === "src" && (nodeValue === null || nodeValue === void 0 ? void 0 : nodeValue.startsWith("data:"))) {
      return false;
    }
    return !attributeBlacklistMatch(nodeName);
  }
  function sanitizeAttributeData({ nodeName, nodeValue }) {
    return {
      name: sanitizeSelectorItem(nodeName),
      value: sanitizeSelectorItem(nodeValue !== null && nodeValue !== void 0 ? nodeValue : void 0)
    };
  }
  function getElementAttributeSelectors(element) {
    const validAttributes = Array.from(element.attributes).filter((attributeNode) => isValidAttributeNode(attributeNode, element)).map(sanitizeAttributeData);
    return [
      ...validAttributes.map(attributeNodeToSimplifiedSelector),
      ...validAttributes.map(attributeNodeToSelector)
    ];
  }
  function getAttributeSelectors(elements) {
    const elementSelectors = elements.map(getElementAttributeSelectors);
    return getIntersection(elementSelectors);
  }

  // node_modules/css-selector-generator/esm/selector-class.js
  function getElementClassSelectors(element) {
    var _a;
    return ((_a = element.getAttribute("class")) !== null && _a !== void 0 ? _a : "").trim().split(/\s+/).filter((item) => !INVALID_CLASS_RE.test(item)).map((item) => `.${sanitizeSelectorItem(item)}`);
  }
  function getClassSelectors(elements) {
    const elementSelectors = elements.map(getElementClassSelectors);
    return getIntersection(elementSelectors);
  }

  // node_modules/css-selector-generator/esm/selector-id.js
  function getElementIdSelectors(element) {
    var _a;
    const id = (_a = element.getAttribute("id")) !== null && _a !== void 0 ? _a : "";
    const selector = `#${sanitizeSelectorItem(id)}`;
    const rootNode = element.getRootNode({ composed: false });
    return !INVALID_ID_RE.test(id) && testSelector([element], selector, rootNode) ? [selector] : [];
  }
  function getIdSelector(elements) {
    return elements.length === 0 || elements.length > 1 ? [] : getElementIdSelectors(elements[0]);
  }

  // node_modules/css-selector-generator/esm/selector-nth-child.js
  function getElementNthChildSelector(element) {
    const parent = element.parentNode;
    if (parent) {
      const siblings2 = Array.from(parent.childNodes).filter(isElement);
      const elementIndex = siblings2.indexOf(element);
      if (elementIndex > -1) {
        return [
          `:nth-child(${String(elementIndex + 1)})`
        ];
      }
    }
    return [];
  }
  function getNthChildSelector(elements) {
    return getIntersection(elements.map(getElementNthChildSelector));
  }

  // node_modules/css-selector-generator/esm/selector-tag.js
  function getElementTagSelectors(element) {
    return [
      sanitizeSelectorItem(element.tagName.toLowerCase())
    ];
  }
  function getTagSelector(elements) {
    const selectors = [
      ...new Set(flattenArray(elements.map(getElementTagSelectors)))
    ];
    return selectors.length === 0 || selectors.length > 1 ? [] : [selectors[0]];
  }

  // node_modules/css-selector-generator/esm/selector-nth-of-type.js
  function getElementNthOfTypeSelector(element) {
    const tag = getTagSelector([element])[0];
    const parentElement = element.parentElement;
    if (parentElement) {
      const siblings2 = Array.from(parentElement.children).filter((element2) => element2.tagName.toLowerCase() === tag);
      const elementIndex = siblings2.indexOf(element);
      if (elementIndex > -1) {
        return [
          `${tag}:nth-of-type(${String(elementIndex + 1)})`
        ];
      }
    }
    return [];
  }
  function getNthOfTypeSelector(elements) {
    return getIntersection(elements.map(getElementNthOfTypeSelector));
  }

  // node_modules/css-selector-generator/esm/utilities-powerset.js
  function* powerSetGenerator(input = [], { maxResults = Number.POSITIVE_INFINITY } = {}) {
    let resultCounter = 0;
    let offsets = generateOffsets(1);
    while (offsets.length <= input.length && resultCounter < maxResults) {
      resultCounter += 1;
      const result = offsets.map((offset2) => input[offset2]);
      yield result;
      offsets = bumpOffsets(offsets, input.length - 1);
    }
  }
  function getPowerSet(input = [], { maxResults = Number.POSITIVE_INFINITY } = {}) {
    return Array.from(powerSetGenerator(input, { maxResults }));
  }
  function bumpOffsets(offsets = [], maxValue = 0) {
    const size = offsets.length;
    if (size === 0) {
      return [];
    }
    const result = [...offsets];
    result[size - 1] += 1;
    for (let index = size - 1; index >= 0; index--) {
      if (result[index] > maxValue) {
        if (index === 0) {
          return generateOffsets(size + 1);
        } else {
          result[index - 1]++;
          result[index] = result[index - 1] + 1;
        }
      }
    }
    if (result[size - 1] > maxValue) {
      return generateOffsets(size + 1);
    }
    return result;
  }
  function generateOffsets(size = 1) {
    return Array.from(Array(size).keys());
  }

  // node_modules/css-selector-generator/esm/utilities-cartesian.js
  function getCartesianProduct(input = {}) {
    let result = [];
    Object.entries(input).forEach(([key, values]) => {
      result = values.flatMap((value) => {
        if (result.length === 0) {
          return [{ [key]: value }];
        } else {
          return result.map((memo) => Object.assign(Object.assign({}, memo), { [key]: value }));
        }
      });
    });
    return result;
  }

  // node_modules/css-selector-generator/esm/utilities-selectors.js
  var ESCAPED_COLON = ":".charCodeAt(0).toString(16).toUpperCase();
  var SPECIAL_CHARACTERS_RE = /[ !"#$%&'()\[\]{|}<>*+,./;=?@^`~\\]/;
  function sanitizeSelectorItem(input = "") {
    return CSS ? CSS.escape(input) : legacySanitizeSelectorItem(input);
  }
  function legacySanitizeSelectorItem(input = "") {
    return input.split("").map((character) => {
      if (character === ":") {
        return `\\${ESCAPED_COLON} `;
      }
      if (SPECIAL_CHARACTERS_RE.test(character)) {
        return `\\${character}`;
      }
      return escape(character).replace(/%/g, "\\");
    }).join("");
  }
  var SELECTOR_TYPE_GETTERS = {
    tag: getTagSelector,
    id: getIdSelector,
    class: getClassSelectors,
    attribute: getAttributeSelectors,
    nthchild: getNthChildSelector,
    nthoftype: getNthOfTypeSelector
  };
  var ELEMENT_SELECTOR_TYPE_GETTERS = {
    tag: getElementTagSelectors,
    id: getElementIdSelectors,
    class: getElementClassSelectors,
    attribute: getElementAttributeSelectors,
    nthchild: getElementNthChildSelector,
    nthoftype: getElementNthOfTypeSelector
  };
  function getElementSelectorsByType(element, selectorType) {
    return ELEMENT_SELECTOR_TYPE_GETTERS[selectorType](element);
  }
  function getSelectorsByType(elements, selector_type) {
    const getter = SELECTOR_TYPE_GETTERS[selector_type];
    return getter(elements);
  }
  function filterSelectors(list = [], matchBlacklist, matchWhitelist) {
    return list.filter((item) => matchWhitelist(item) || !matchBlacklist(item));
  }
  function orderSelectors(list = [], matchWhitelist) {
    return list.sort((a, b) => {
      const a_is_whitelisted = matchWhitelist(a);
      const b_is_whitelisted = matchWhitelist(b);
      if (a_is_whitelisted && !b_is_whitelisted) {
        return -1;
      }
      if (!a_is_whitelisted && b_is_whitelisted) {
        return 1;
      }
      return 0;
    });
  }
  function getAllSelectors(elements, root2, options) {
    const selectors_list = getSelectorsList(elements, options);
    const type_combinations = getTypeCombinations(selectors_list, options);
    const all_selectors = flattenArray(type_combinations);
    return [...new Set(all_selectors)];
  }
  function getSelectorsList(elements, options) {
    const { blacklist, whitelist, combineWithinSelector, maxCombinations } = options;
    const matchBlacklist = createPatternMatcher(blacklist);
    const matchWhitelist = createPatternMatcher(whitelist);
    const reducer = (data, selector_type) => {
      const selectors_by_type = getSelectorsByType(elements, selector_type);
      const filtered_selectors = filterSelectors(selectors_by_type, matchBlacklist, matchWhitelist);
      const found_selectors = orderSelectors(filtered_selectors, matchWhitelist);
      data[selector_type] = combineWithinSelector ? getPowerSet(found_selectors, { maxResults: maxCombinations }) : found_selectors.map((item) => [item]);
      return data;
    };
    return getSelectorsToGet(options).reduce(reducer, {});
  }
  function getSelectorsToGet(options) {
    const { selectors, includeTag } = options;
    const selectors_to_get = [...selectors];
    if (includeTag && !selectors_to_get.includes("tag")) {
      selectors_to_get.push("tag");
    }
    return selectors_to_get;
  }
  function addTagTypeIfNeeded(list) {
    return list.includes(CSS_SELECTOR_TYPE.tag) || list.includes(CSS_SELECTOR_TYPE.nthoftype) ? [...list] : [...list, CSS_SELECTOR_TYPE.tag];
  }
  function combineSelectorTypes(options) {
    const { selectors, combineBetweenSelectors, includeTag, maxCandidates } = options;
    const combinations = combineBetweenSelectors ? getPowerSet(selectors, { maxResults: maxCandidates }) : selectors.map((item) => [item]);
    return includeTag ? combinations.map(addTagTypeIfNeeded) : combinations;
  }
  function getTypeCombinations(selectors_list, options) {
    return combineSelectorTypes(options).map((item) => {
      return constructSelectors(item, selectors_list);
    }).filter((item) => item.length > 0);
  }
  function constructSelectors(selector_types, selectors_by_type) {
    const data = {};
    selector_types.forEach((selector_type) => {
      const selector_variants = selectors_by_type[selector_type];
      if (selector_variants && selector_variants.length > 0) {
        data[selector_type] = selector_variants;
      }
    });
    const combinations = getCartesianProduct(data);
    return combinations.map(constructSelector);
  }
  function constructSelectorType(selector_type, selectors_data) {
    return selectors_data[selector_type] ? selectors_data[selector_type].join("") : "";
  }
  function constructSelector(selectorData = {}) {
    const pattern = [...SELECTOR_PATTERN];
    if (selectorData[CSS_SELECTOR_TYPE.tag] && selectorData[CSS_SELECTOR_TYPE.nthoftype]) {
      pattern.splice(pattern.indexOf(CSS_SELECTOR_TYPE.tag), 1);
    }
    return pattern.map((type) => constructSelectorType(type, selectorData)).join("");
  }
  function generateCandidateCombinations(selectors, rootSelector) {
    return [
      ...selectors.map((selector) => rootSelector + OPERATOR.DESCENDANT + selector),
      ...selectors.map((selector) => rootSelector + OPERATOR.CHILD + selector)
    ];
  }
  function generateCandidates(selectors, rootSelector) {
    return rootSelector === "" ? selectors : generateCandidateCombinations(selectors, rootSelector);
  }
  function getSelectorWithinRoot(elements, root2, rootSelector = "", options) {
    const elementSelectors = getAllSelectors(elements, root2, options);
    const selectorCandidates = generateCandidates(elementSelectors, rootSelector);
    for (const candidateSelector of selectorCandidates) {
      if (testSelector(elements, candidateSelector, root2)) {
        return candidateSelector;
      }
    }
    return null;
  }
  function getClosestIdentifiableParent(elements, root2, rootSelector = "", options) {
    if (elements.length === 0) {
      return null;
    }
    const candidatesList = [
      elements.length > 1 ? elements : [],
      ...getParents(elements, root2).map((element) => [element])
    ];
    for (const currentElements of candidatesList) {
      const result = getSelectorWithinRoot(currentElements, root2, rootSelector, options);
      if (result) {
        return {
          foundElements: currentElements,
          selector: result
        };
      }
    }
    return null;
  }
  function sanitizeSelectorNeedle(needle) {
    if (needle instanceof NodeList || needle instanceof HTMLCollection) {
      needle = Array.from(needle);
    }
    const elements = (Array.isArray(needle) ? needle : [needle]).filter(isElement);
    return [...new Set(elements)];
  }

  // node_modules/css-selector-generator/esm/utilities-element-data.js
  function createElementSelectorData(selector) {
    return {
      value: selector,
      include: false
    };
  }
  function createElementData(element, selectorTypes, operator = OPERATOR.NONE) {
    const selectors = {};
    selectorTypes.forEach((selectorType) => {
      Reflect.set(selectors, selectorType, getElementSelectorsByType(element, selectorType).map(createElementSelectorData));
    });
    return {
      element,
      operator,
      selectors
    };
  }
  function constructElementSelector({ selectors, operator }) {
    let pattern = [...SELECTOR_PATTERN];
    if (selectors[CSS_SELECTOR_TYPE.tag] && selectors[CSS_SELECTOR_TYPE.nthoftype]) {
      pattern = pattern.filter((item) => item !== CSS_SELECTOR_TYPE.tag);
    }
    let selector = "";
    pattern.forEach((selectorType) => {
      var _a;
      const selectorsOfType = (_a = selectors[selectorType]) !== null && _a !== void 0 ? _a : [];
      selectorsOfType.forEach(({ value, include }) => {
        if (include) {
          selector += value;
        }
      });
    });
    return operator + selector;
  }

  // node_modules/css-selector-generator/esm/selector-fallback.js
  function getElementFallbackSelector(element) {
    const parentElements = getElementParents(element).reverse();
    const elementsData = parentElements.map((element2) => {
      const elementData = createElementData(element2, [CSS_SELECTOR_TYPE.nthchild], OPERATOR.CHILD);
      elementData.selectors.nthchild.forEach((selectorData) => {
        selectorData.include = true;
      });
      return elementData;
    });
    return [":root", ...elementsData.map(constructElementSelector)].join("");
  }
  function getFallbackSelector(elements) {
    return elements.map(getElementFallbackSelector).join(SELECTOR_SEPARATOR);
  }

  // node_modules/css-selector-generator/esm/index.js
  function getCssSelector(needle, custom_options = {}) {
    var _a;
    const elements = sanitizeSelectorNeedle(needle);
    const options = sanitizeOptions(elements[0], custom_options);
    const root2 = (_a = options.root) !== null && _a !== void 0 ? _a : getRootNode(elements[0]);
    let partialSelector = "";
    let currentRoot = root2;
    function updateIdentifiableParent() {
      return getClosestIdentifiableParent(elements, currentRoot, partialSelector, options);
    }
    let closestIdentifiableParent = updateIdentifiableParent();
    while (closestIdentifiableParent) {
      const { foundElements, selector } = closestIdentifiableParent;
      if (testSelector(elements, selector, root2)) {
        return selector;
      }
      currentRoot = foundElements[0];
      partialSelector = selector;
      closestIdentifiableParent = updateIdentifiableParent();
    }
    if (elements.length > 1) {
      return elements.map((element) => getCssSelector(element, options)).join(SELECTOR_SEPARATOR);
    }
    return getFallbackSelector(elements);
  }

  // node_modules/dom-helpers/esm/canUseDOM.js
  var canUseDOM_default = !!(typeof window !== "undefined" && window.document && window.document.createElement);

  // node_modules/dom-helpers/esm/addEventListener.js
  var optionsSupported = false;
  var onceSupported = false;
  try {
    const options = {
      get passive() {
        return optionsSupported = true;
      },
      get once() {
        return onceSupported = optionsSupported = true;
      }
    };
    if (canUseDOM_default) {
      window.addEventListener("test", options, options);
      window.removeEventListener("test", options, true);
    }
  } catch (e) {
  }

  // node_modules/dom-helpers/esm/animationFrame.js
  var prev = (/* @__PURE__ */ new Date()).getTime();
  function fallback(fn) {
    const curr = (/* @__PURE__ */ new Date()).getTime();
    const ms = Math.max(0, 16 - (curr - prev));
    const handle = setTimeout(fn, ms);
    prev = curr;
    return handle;
  }
  var vendors = ["", "webkit", "moz", "o", "ms"];
  var cancelMethod = "clearTimeout";
  var rafImpl = fallback;
  var getKey = (vendor, k) => `${vendor + (!vendor ? k : k[0].toUpperCase() + k.substr(1))}AnimationFrame`;
  if (canUseDOM_default) {
    vendors.some((vendor) => {
      const rafMethod = getKey(vendor, "request");
      if (rafMethod in window) {
        cancelMethod = getKey(vendor, "cancel");
        rafImpl = (cb) => window[rafMethod](cb);
      }
      return !!rafImpl;
    });
  }

  // node_modules/dom-helpers/esm/childNodes.js
  var toArray = Function.prototype.bind.call(Function.prototype.call, [].slice);

  // node_modules/dom-helpers/esm/querySelectorAll.js
  var toArray2 = Function.prototype.bind.call(Function.prototype.call, [].slice);

  // node_modules/dom-helpers/esm/isDocument.js
  function isDocument(element) {
    return "nodeType" in element && element.nodeType === document.DOCUMENT_NODE;
  }

  // node_modules/dom-helpers/esm/isWindow.js
  function isWindow(node) {
    if ("window" in node && node.window === node)
      return node;
    if (isDocument(node))
      return node.defaultView || false;
    return false;
  }

  // node_modules/dom-helpers/esm/getScrollAccessor.js
  function getscrollAccessor(offset2) {
    const prop = offset2 === "pageXOffset" ? "scrollLeft" : "scrollTop";
    function scrollAccessor(node, val) {
      const win = isWindow(node);
      if (val === void 0) {
        return win ? win[offset2] : node[prop];
      }
      if (win) {
        win.scrollTo(win[offset2], val);
      } else {
        node[prop] = val;
      }
    }
    return scrollAccessor;
  }

  // node_modules/dom-helpers/esm/scrollLeft.js
  var scrollLeft_default = getscrollAccessor("pageXOffset");

  // node_modules/dom-helpers/esm/scrollTop.js
  var scrollTop_default = getscrollAccessor("pageYOffset");

  // node_modules/dom-helpers/esm/isVisible.js
  function isVisible(node) {
    return node ? !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length) : false;
  }

  // node_modules/lodash-es/_freeGlobal.js
  var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
  var freeGlobal_default = freeGlobal;

  // node_modules/lodash-es/_root.js
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;
  var root = freeGlobal_default || freeSelf || Function("return this")();
  var root_default = root;

  // node_modules/lodash-es/_Symbol.js
  var Symbol2 = root_default.Symbol;
  var Symbol_default = Symbol2;

  // node_modules/lodash-es/_getRawTag.js
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var nativeObjectToString = objectProto.toString;
  var symToStringTag = Symbol_default ? Symbol_default.toStringTag : void 0;
  function getRawTag(value) {
    var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
    try {
      value[symToStringTag] = void 0;
      var unmasked = true;
    } catch (e) {
    }
    var result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  var getRawTag_default = getRawTag;

  // node_modules/lodash-es/_objectToString.js
  var objectProto2 = Object.prototype;
  var nativeObjectToString2 = objectProto2.toString;
  function objectToString(value) {
    return nativeObjectToString2.call(value);
  }
  var objectToString_default = objectToString;

  // node_modules/lodash-es/_baseGetTag.js
  var nullTag = "[object Null]";
  var undefinedTag = "[object Undefined]";
  var symToStringTag2 = Symbol_default ? Symbol_default.toStringTag : void 0;
  function baseGetTag(value) {
    if (value == null) {
      return value === void 0 ? undefinedTag : nullTag;
    }
    return symToStringTag2 && symToStringTag2 in Object(value) ? getRawTag_default(value) : objectToString_default(value);
  }
  var baseGetTag_default = baseGetTag;

  // node_modules/lodash-es/isObjectLike.js
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  var isObjectLike_default = isObjectLike;

  // node_modules/lodash-es/isSymbol.js
  var symbolTag = "[object Symbol]";
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike_default(value) && baseGetTag_default(value) == symbolTag;
  }
  var isSymbol_default = isSymbol;

  // node_modules/lodash-es/_trimmedEndIndex.js
  var reWhitespace = /\s/;
  function trimmedEndIndex(string) {
    var index = string.length;
    while (index-- && reWhitespace.test(string.charAt(index))) {
    }
    return index;
  }
  var trimmedEndIndex_default = trimmedEndIndex;

  // node_modules/lodash-es/_baseTrim.js
  var reTrimStart = /^\s+/;
  function baseTrim(string) {
    return string ? string.slice(0, trimmedEndIndex_default(string) + 1).replace(reTrimStart, "") : string;
  }
  var baseTrim_default = baseTrim;

  // node_modules/lodash-es/isObject.js
  function isObject(value) {
    var type = typeof value;
    return value != null && (type == "object" || type == "function");
  }
  var isObject_default = isObject;

  // node_modules/lodash-es/toNumber.js
  var NAN = 0 / 0;
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
  var reIsBinary = /^0b[01]+$/i;
  var reIsOctal = /^0o[0-7]+$/i;
  var freeParseInt = parseInt;
  function toNumber(value) {
    if (typeof value == "number") {
      return value;
    }
    if (isSymbol_default(value)) {
      return NAN;
    }
    if (isObject_default(value)) {
      var other = typeof value.valueOf == "function" ? value.valueOf() : value;
      value = isObject_default(other) ? other + "" : other;
    }
    if (typeof value != "string") {
      return value === 0 ? value : +value;
    }
    value = baseTrim_default(value);
    var isBinary = reIsBinary.test(value);
    return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
  }
  var toNumber_default = toNumber;

  // node_modules/lodash-es/now.js
  var now = function() {
    return root_default.Date.now();
  };
  var now_default = now;

  // node_modules/lodash-es/debounce.js
  var FUNC_ERROR_TEXT = "Expected a function";
  var nativeMax = Math.max;
  var nativeMin = Math.min;
  function debounce(func, wait, options) {
    var lastArgs, lastThis, maxWait, result, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
    if (typeof func != "function") {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = toNumber_default(wait) || 0;
    if (isObject_default(options)) {
      leading = !!options.leading;
      maxing = "maxWait" in options;
      maxWait = maxing ? nativeMax(toNumber_default(options.maxWait) || 0, wait) : maxWait;
      trailing = "trailing" in options ? !!options.trailing : trailing;
    }
    function invokeFunc(time) {
      var args = lastArgs, thisArg = lastThis;
      lastArgs = lastThis = void 0;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }
    function leadingEdge(time) {
      lastInvokeTime = time;
      timerId = setTimeout(timerExpired, wait);
      return leading ? invokeFunc(time) : result;
    }
    function remainingWait(time) {
      var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
      return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
    }
    function shouldInvoke(time) {
      var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
      return lastCallTime === void 0 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
    }
    function timerExpired() {
      var time = now_default();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      timerId = setTimeout(timerExpired, remainingWait(time));
    }
    function trailingEdge(time) {
      timerId = void 0;
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = void 0;
      return result;
    }
    function cancel2() {
      if (timerId !== void 0) {
        clearTimeout(timerId);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timerId = void 0;
    }
    function flush() {
      return timerId === void 0 ? result : trailingEdge(now_default());
    }
    function debounced() {
      var time = now_default(), isInvoking = shouldInvoke(time);
      lastArgs = arguments;
      lastThis = this;
      lastCallTime = time;
      if (isInvoking) {
        if (timerId === void 0) {
          return leadingEdge(lastCallTime);
        }
        if (maxing) {
          clearTimeout(timerId);
          timerId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timerId === void 0) {
        timerId = setTimeout(timerExpired, wait);
      }
      return result;
    }
    debounced.cancel = cancel2;
    debounced.flush = flush;
    return debounced;
  }
  var debounce_default = debounce;

  // src/elementPicker-refactored.js
  var import_localforage = __toESM(require_localforage());
  (() => {
    const elementStorage = import_localforage.default.createInstance({
      name: "web-llm-elements",
      storeName: "elements",
      description: "Stored DOM elements for Web LLM Assistant"
    });
    class ElementManager {
      constructor() {
        this.elementStore = /* @__PURE__ */ new Map();
        this.elementCounter = 1;
        this.mutationObservers = /* @__PURE__ */ new Map();
        this.loadStoredElements();
      }
      // Load elements from localforage
      async loadStoredElements() {
        try {
          const stored = await elementStorage.getItem("elementData");
          if (stored) {
            this.elementStore = new Map(stored.elements || []);
            this.elementCounter = stored.counter || 1;
            console.log(`Loaded ${this.elementStore.size} stored elements`);
          }
        } catch (error) {
          console.error("Error loading stored elements:", error);
        }
      }
      // Save elements to localforage with debouncing
      saveElements = debounce_default(async () => {
        try {
          const dataToStore = {
            elements: Array.from(this.elementStore.entries()),
            counter: this.elementCounter,
            timestamp: Date.now()
          };
          await elementStorage.setItem("elementData", dataToStore);
          console.log("Elements saved to storage");
        } catch (error) {
          console.error("Error saving elements:", error);
        }
      }, 300);
      // Clear all stored elements
      async clearStoredElements() {
        try {
          this.mutationObservers.forEach((observer) => observer.disconnect());
          this.mutationObservers.clear();
          this.elementStore.clear();
          this.elementCounter = 1;
          await elementStorage.clear();
          console.log("All stored elements cleared");
          return true;
        } catch (error) {
          console.error("Error clearing elements:", error);
          return false;
        }
      }
      // Delete a single element
      async deleteElement(elementId) {
        try {
          if (!this.elementStore.has(elementId)) {
            console.warn(`Element "${elementId}" not found`);
            return false;
          }
          const observer = this.mutationObservers.get(elementId);
          if (observer) {
            observer.disconnect();
            this.mutationObservers.delete(elementId);
          }
          this.elementStore.delete(elementId);
          await this.saveElements();
          console.log(`Element "${elementId}" deleted successfully`);
          return true;
        } catch (error) {
          console.error("Error deleting element:", error);
          return false;
        }
      }
      // Add a new element
      async addElement(data, options = {}) {
        const elementId = `element${this.elementCounter}`;
        this.elementCounter++;
        const elementData = {
          ...data,
          customName: null,
          defaultId: elementId,
          capturedAt: Date.now(),
          lastVerified: Date.now()
        };
        this.elementStore.set(elementId, elementData);
        if (data.selector && data.trackChanges && options.enableMutationObserver !== false) {
          this.setupElementTracking(elementId, data.selector);
        }
        await this.saveElements();
        console.log("Element added with ID:", elementId);
        return { id: elementId, data: elementData };
      }
      // Setup IntersectionObserver for element tracking
      setupElementTracking(elementId, selector) {
        try {
          const element = document.querySelector(selector);
          if (!element)
            return;
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              const data = this.elementStore.get(elementId);
              if (data) {
                data.lastModified = Date.now();
                data.isVisible = entry.isIntersecting;
                data.intersectionRatio = entry.intersectionRatio;
                data.boundingClientRect = entry.boundingClientRect;
                this.elementStore.set(elementId, data);
                this.saveElements();
              }
            });
          }, {
            threshold: [0, 0.25, 0.5, 0.75, 1]
          });
          observer.observe(element);
          this.mutationObservers.set(elementId, observer);
        } catch (error) {
          console.error("Error setting up element tracking:", error);
        }
      }
      // Rename an element
      async renameElement(currentName, newName) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
          throw new Error("Invalid name. Use only letters, numbers, and underscores. Must start with a letter.");
        }
        const existingElement = this.findElementByName(newName);
        if (existingElement && existingElement !== currentName) {
          throw new Error(`Name "@${newName}" is already in use.`);
        }
        const elementData = this.elementStore.get(currentName);
        if (!elementData) {
          throw new Error(`Element "@${currentName}" not found.`);
        }
        if (newName !== elementData.defaultId) {
          this.elementStore.delete(currentName);
          elementData.customName = newName;
          this.elementStore.set(newName, elementData);
        } else {
          elementData.customName = null;
          if (currentName !== elementData.defaultId) {
            this.elementStore.delete(currentName);
            this.elementStore.set(elementData.defaultId, elementData);
          }
        }
        await this.saveElements();
        return true;
      }
      // Find element by custom name or default ID
      findElementByName(name) {
        for (const [key, data] of this.elementStore.entries()) {
          if (key === name || data.customName === name) {
            return key;
          }
        }
        return null;
      }
      // Get element data by reference
      getElementData(elementRef) {
        return this.elementStore.get(elementRef);
      }
      // Get all stored elements
      getAllElements() {
        return Array.from(this.elementStore.entries()).map(([id, data]) => ({
          id,
          displayName: data.customName || id,
          data,
          name: data.id ? `#${data.id}` : data.className ? `.${data.className.toString().split(" ")[0]}` : `<${data.tagName}>`
        }));
      }
      // Process message to replace element references
      processElementReferences(message) {
        const elementPattern = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let processedMessage = message;
        let foundElements = [];
        message.replace(elementPattern, (match, elementRef) => {
          let elementData = this.getElementData(elementRef);
          if (!elementData) {
            const actualKey = this.findElementByName(elementRef);
            if (actualKey) {
              elementData = this.getElementData(actualKey);
            }
          }
          if (elementData) {
            foundElements.push({ id: elementRef, data: elementData });
          }
          return match;
        });
        if (foundElements.length > 0) {
          processedMessage += "\n\n--- Referenced Elements ---\n";
          foundElements.forEach(({ id, data }) => {
            processedMessage += `
@${id}:
${this.formatElementInfo(data)}
`;
          });
        }
        return processedMessage;
      }
      // Format element info for display
      formatElementInfo(data) {
        const styles = Object.entries(data.styles || {}).filter(([, value]) => value && value !== "none" && value !== "auto" && value !== "").map(([key, value]) => `  ${key}: ${value}`).join("\n");
        const attributes = Object.entries(data.attributes || {}).map(([key, value]) => `  ${key}: ${value}`).join("\n");
        return `Element: ${data.selector}
${data.fallbackSelectors ? `Fallback Selectors: ${data.fallbackSelectors.join(", ")}` : ""}
Tag: <${data.tagName}>
${data.id ? `ID: ${data.id}` : ""}
${data.className ? `Classes: ${data.className}` : ""}
${data.position ? `Position: ${data.position.x}px, ${data.position.y}px (${data.position.width}x${data.position.height})` : ""}
${data.isVisible !== void 0 ? `Visible: ${data.isVisible}` : ""}

HTML:
\`\`\`html
${data.html}
\`\`\`

${data.text ? `Text Content: "${data.text}"` : ""}

${attributes ? `Attributes:
${attributes}
` : ""}

Key Styles:
\`\`\`css
${styles}
\`\`\``;
      }
      // Format element summary
      formatElementSummary(data, elementId) {
        const elementName = data.id ? `#${data.id}` : data.className ? `.${data.className.toString().split(" ")[0]}` : `<${data.tagName}>`;
        const text2 = data.text ? ` - "${data.text.slice(0, 50)}${data.text.length > 50 ? "..." : ""}"` : "";
        const displayName = data.customName || elementId;
        const validity = data.isValid !== void 0 ? data.isValid ? "\u2713" : "\u2717" : "";
        return `\u{1F3AF} **@${displayName}** ${validity} saved: ${elementName}${text2} (Type "rename @${displayName} newname" to rename)`;
      }
    }
    class ElementPicker2 {
      constructor(elementManager, options = {}) {
        this.elementManager = elementManager;
        this.options = {
          borderColor: "#ff6b35",
          backgroundColor: "rgba(255, 107, 53, 0.1)",
          ...options
        };
        this.picker = null;
        this.isActive = false;
      }
      start() {
        if (this.isActive)
          return;
        console.log("Starting modern element picker...");
        this.isActive = true;
        this.picker = new ElementPicker({
          style: {
            borderColor: this.options.borderColor,
            backgroundColor: this.options.backgroundColor,
            borderWidth: "2px",
            borderStyle: "solid"
          }
        });
        this.picker.start({
          onHover: (element) => {
            this.showElementPreview(element);
          },
          onClick: (element) => {
            this.selectElement(element);
            this.stop();
          }
        });
        document.body.style.cursor = "crosshair";
      }
      stop() {
        if (!this.isActive)
          return;
        console.log("Stopping element picker...");
        this.isActive = false;
        if (this.picker) {
          this.picker.stop();
          this.picker = null;
        }
        document.body.style.cursor = "";
      }
      showElementPreview(element) {
        var _a;
        const selector = this.getOptimalSelector(element);
        const tagName = element.tagName.toLowerCase();
        const text2 = ((_a = element.textContent) == null ? void 0 : _a.trim().slice(0, 30)) || "";
        console.log(`Hovering: <${tagName}> ${selector} ${text2 ? `"${text2}..."` : ""}`);
      }
      selectElement(element) {
        console.log("Element selected:", element);
        const data = this.extractElementData(element);
        chrome.runtime.sendMessage({
          action: "elementSelected",
          data
        });
      }
      // Extract comprehensive element data
      extractElementData(element) {
        var _a;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const selector = this.getOptimalSelector(element);
        return {
          // Basic info
          tagName: element.tagName.toLowerCase(),
          id: element.id || null,
          className: element.className || null,
          selector,
          fallbackSelectors: this.generateFallbackSelectors(element),
          text: ((_a = element.textContent) == null ? void 0 : _a.trim().slice(0, 200)) || null,
          html: element.outerHTML.length > 1e3 ? element.outerHTML.slice(0, 1e3) + "..." : element.outerHTML,
          // Position and dimensions
          position: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            viewport: {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left
            }
          },
          // Key styles
          styles: {
            display: style.display,
            position: style.position,
            width: style.width,
            height: style.height,
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontSize: style.fontSize,
            opacity: style.opacity,
            visibility: style.visibility,
            cursor: style.cursor
          },
          // Interaction properties
          isVisible: isVisible(element),
          isClickable: this.isElementClickable(element),
          isInteractive: this.isElementInteractive(element),
          // All attributes
          attributes: this.getAttributes(element),
          // Form properties
          formProperties: this.getFormProperties(element),
          // Advanced manipulation examples
          manipulationExamples: this.generateManipulationExamples(element, selector),
          // Tracking preferences
          trackChanges: false
        };
      }
      // Get optimal selector using css-selector-generator
      getOptimalSelector(element) {
        try {
          return getCssSelector(element, {
            selectors: ["id", "class", "tag", "attribute", "nthchild"],
            blacklist: [/^[a-f0-9]{6,}$/i, /temp|tmp|generated|random/i, /^auto_/],
            root: document.body,
            combineWithinSelector: true,
            includeTag: true
          });
        } catch (error) {
          console.warn("css-selector-generator failed:", error);
          return this.getSimpleSelector(element);
        }
      }
      // Simple fallback selector
      getSimpleSelector(element) {
        if (element.id)
          return `#${CSS.escape(element.id)}`;
        if (element.className) {
          const classes = element.className.toString().trim().split(/\s+/);
          if (classes.length > 0) {
            return `.${CSS.escape(classes[0])}`;
          }
        }
        return element.tagName.toLowerCase();
      }
      // Generate fallback selectors
      generateFallbackSelectors(element) {
        const fallbacks = [];
        if (element.id)
          fallbacks.push(`#${CSS.escape(element.id)}`);
        if (element.className) {
          const classes = element.className.toString().trim().split(/\s+/);
          fallbacks.push(...classes.map((cls) => `.${CSS.escape(cls)}`));
        }
        ["name", "type", "placeholder", "aria-label"].forEach((attr) => {
          const value = element.getAttribute(attr);
          if (value) {
            fallbacks.push(`[${attr}="${CSS.escape(value)}"]`);
          }
        });
        return [...new Set(fallbacks)];
      }
      // Check if element is clickable
      isElementClickable(element) {
        const clickableTags = ["a", "button", "input", "select", "textarea", "label"];
        const clickableRoles = ["button", "link", "checkbox", "radio", "menuitem", "tab"];
        return clickableTags.includes(element.tagName.toLowerCase()) || element.onclick || element.getAttribute("onclick") || clickableRoles.includes(element.getAttribute("role")) || getComputedStyle(element).cursor === "pointer";
      }
      // Check if element is interactive
      isElementInteractive(element) {
        return element.isContentEditable || element.getAttribute("contenteditable") === "true" || ["input", "textarea", "select"].includes(element.tagName.toLowerCase()) || element.tabIndex >= 0;
      }
      // Get all attributes
      getAttributes(element) {
        return Array.from(element.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {});
      }
      // Get form properties
      getFormProperties(element) {
        const tagName = element.tagName.toLowerCase();
        if (["input", "textarea", "select"].includes(tagName)) {
          return {
            type: element.type || null,
            name: element.name || null,
            value: element.value || null,
            placeholder: element.placeholder || null,
            required: element.required || false,
            disabled: element.disabled || false,
            readonly: element.readOnly || false,
            checked: element.checked || false
          };
        }
        return null;
      }
      // Generate manipulation examples
      generateManipulationExamples(element, selector) {
        const examples = {};
        const tagName = element.tagName.toLowerCase();
        examples["Click"] = `document.querySelector('${selector}').click()`;
        examples["Focus"] = `document.querySelector('${selector}').focus()`;
        if (["input", "textarea"].includes(tagName)) {
          examples["Set Value"] = `document.querySelector('${selector}').value = 'new value'`;
          examples["Clear"] = `document.querySelector('${selector}').value = ''`;
        }
        if (element.type === "checkbox" || element.type === "radio") {
          examples["Check"] = `document.querySelector('${selector}').checked = true`;
          examples["Uncheck"] = `document.querySelector('${selector}').checked = false`;
        }
        if (tagName === "select") {
          examples["Select Option"] = `document.querySelector('${selector}').value = 'option-value'`;
        }
        examples["Hide"] = `document.querySelector('${selector}').style.display = 'none'`;
        examples["Show"] = `document.querySelector('${selector}').style.display = 'block'`;
        return examples;
      }
    }
    window.ElementPicker = ElementPicker2;
    window.ElementManager = ElementManager;
  })();
})();
/*! Bundled license information:

localforage/dist/localforage.js:
  (*!
      localForage -- Offline Storage, Improved
      Version 1.10.0
      https://localforage.github.io/localForage
      (c) 2013-2017 Mozilla, Apache License 2.0
  *)

lodash-es/lodash.js:
  (**
   * @license
   * Lodash (Custom Build) <https://lodash.com/>
   * Build: `lodash modularize exports="es" -o ./`
   * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   *)
*/
