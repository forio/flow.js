/*!
 * 
 * ++++++++   ++++++++   ++++++++         Flow.js
 * ++++++++   ,+++++++~   ++++++++        v0.11.0
 *  ++++++++   ++++++++   ++++++++
 *  ~+++++++~   ++++++++   ++++++++       Github: https://github.com/forio/flow.js
 *   ++++++++   ++++++++   ++++++++:
 *    :++++++++   ++++++++   ++++++++
 *      ++++++++   =+++++++   ,+++++++=
 *       ++++++++   ++++++++   ++++++++
 *       =+++++++    +++++++=   ++++++++
 *        ++++++++   ++++++++   ++++++++
 *        ,+++++++:   +++++++~   ++++++++
 *         +++++++=   +++++++=   ++++++++
 *        ++++++++   ++++++++   ++++++++
 *        ++++++++   ++++++++   ++++++++
 *        ++++++++   =+++++++   :+++++++,
 *         ++++++++   ++++++++   ++++++++
 *         ++++++++   ~+++++++    +++++++=
 *          ++++++++   ++++++++   ++++++++
 * 
 */
var Flow =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 17);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = _;

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = {
    prefix: 'f',
    binderAttr: 'f-bind',

    events: {
        /** UI Change to publish to the channel. */
        trigger: 'update.f.ui',

        /** Trigger with payload '{attrToUpdate: value}', for e.g. { bind: 34 }. This will run this through all the converts and pass it to attr handler. Useful to by-pass getting this from the model directly.  */
        convert: 'f.convert',

        /** On a bind or other flow-related error  */
        error: 'f.error'
    },

    attrs: {
        checkboxOffValue: 'data-off-value',
        //Used by repeat attr handler to keep track of template after first evaluation
        repeat: {
            templateId: 'repeat-template-id' //don't prefix by f or dom-manager unbind will kill it
        }
    },

    errorAttr: 'data-flow-error',
    animation: {
        addAttr: 'data-add',
        changeAttr: 'data-update',
        initialAttr: 'data-initial'
    }
};

/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["d"] = stripSuffixDelimiter;
/* harmony export (immutable) */ __webpack_exports__["b"] = mapWithPrefix;
/* harmony export (immutable) */ __webpack_exports__["g"] = withPrefix;
/* harmony export (immutable) */ __webpack_exports__["f"] = unprefixTopics;
/* harmony export (immutable) */ __webpack_exports__["e"] = unprefix;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__silencable__ = __webpack_require__(56);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return __WEBPACK_IMPORTED_MODULE_0__silencable__["a"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__exclude_read_only__ = __webpack_require__(57);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_1__exclude_read_only__["a"]; });
var CHANNEL_DELIMITER = ':';




/**
 * 
 * @param {string} text
 * @returns {string}
 */
function stripSuffixDelimiter(text) {
    if (text && text.indexOf(CHANNEL_DELIMITER) === text.length - 1) {
        text = text.replace(CHANNEL_DELIMITER, '');
    }
    return text;
}

/**
 * 
 * @param {Publishable[]} dataArray 
 * @param {string} prefix 
 * @returns {Publishable[]} array with name prefixed
 */
function mapWithPrefix(dataArray, prefix) {
    if (!prefix) return dataArray;
    return (dataArray || []).map(function (datapt) {
        var name = (prefix + datapt.name).replace(/:$/, ''); //replace trailing delimiters
        return $.extend(true, {}, datapt, { name: name });
    });
}

/**
 * 
 * @param {Function} callback 
 * @param {string|string[]} prefixList
 * @returns {Function}
 */
function withPrefix(callback, prefixList) {
    var arr = [].concat(prefixList);

    /**
     * @param {Publishable[]} data
     */
    return function (data) {
        arr.forEach(function (prefix) {
            var mapped = mapWithPrefix(data, prefix);
            callback(mapped);
        });
    };
}

/**
 * 
 * @param {string[]} list 
 * @param {string} prefix
 * @returns {string[]} Item with prefix removed
 */
function unprefixTopics(list, prefix) {
    if (!prefix) return list;
    var unprefixed = list.map(function (item) {
        return item.replace(prefix, '');
    });
    return unprefixed;
}

/**
 * 
 * @param {Publishable[]} list 
 * @param {string} prefix
 * @returns {Publishable[]} Item with prefix removed
 */
function unprefix(list, prefix) {
    if (!prefix) return list;
    var unprefixed = list.map(function (item) {
        if (item.name) {
            return $.extend(true, {}, item, { name: item.name.replace(prefix, '') });
        }
        return item.replace(prefix, '');
    });
    return unprefixed;
}

/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["b"] = objectToPublishable;
/* harmony export (immutable) */ __webpack_exports__["c"] = publishableToObject;
/* harmony export (immutable) */ __webpack_exports__["a"] = normalizeParamOptions;
/**
 * 
 * @param {Object} obj
 * @returns {Publishable[]}
 */
function objectToPublishable(obj) {
    var mapped = Object.keys(obj || {}).map(function (t) {
        return { name: t, value: obj[t] };
    });
    return mapped;
}

/**
 * Converts arrays of the form [{ name: '', value: ''}] to {[name]: value}
 * @param {Publishable[]} arr
 * @param {Object} [mergeWith]
 * @returns {Object}
 */
function publishableToObject(arr, mergeWith) {
    var result = (arr || []).reduce(function (accum, topic) {
        accum[topic.name] = topic.value;
        return accum;
    }, $.extend(true, {}, mergeWith));
    return result;
}

/**
 * @typedef NormalizedParam
 * @property {Publishable[]} params
 * @property {Object} options
 */

/**
 *
 * @param {string|Object|Array} topic 
 * @param {*} publishValue 
 * @param {Object} [options]
 * @returns {NormalizedParam}
 */
function normalizeParamOptions(topic, publishValue, options) {
    if (!topic) {
        return { params: [], options: {} };
    }
    if ($.isPlainObject(topic)) {
        return { params: objectToPublishable(topic), options: publishValue };
    }
    if (Array.isArray(topic)) {
        return { params: topic, options: publishValue };
    }
    return { params: [{ name: topic, value: publishValue }], options: options };
}

/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export notifySubscribeHandlers */
/* unused harmony export notifyUnsubscribeHandlers */
/* unused harmony export passthroughPublishInterceptors */
/* harmony export (immutable) */ __webpack_exports__["a"] = router;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__utils_handler_utils__ = __webpack_require__(55);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_utils_general__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_lodash__);





/**
 * Handle subscriptions
 * @param  {Handler[]} handlers Array of the form [{ match: function (){}, }]
 * @param  {Array<string>} topics   Array of strings
 * @param  {SubscribeOptions} [options]
 * @returns {Promise<Publishable[]>} Returns populated topics if available
 */
function notifySubscribeHandlers(handlers, topics, options) {
    var grouped = Object(__WEBPACK_IMPORTED_MODULE_0__utils_handler_utils__["a" /* groupByHandlers */])(topics, handlers);
    var promises = [];
    grouped.filter(function (handler) {
        return handler.subscribeHandler;
    }).forEach(function (handler) {
        var mergedOptions = $.extend(true, {}, handler.options, options);
        var unprefixed = Object(__WEBPACK_IMPORTED_MODULE_1__utils__["f" /* unprefixTopics */])(handler.data, handler.matched);
        var promise = Object(__WEBPACK_IMPORTED_MODULE_2_utils_general__["b" /* makePromise */])(function () {
            var subsResponse = handler.subscribeHandler(unprefixed, mergedOptions, handler.matched);
            return subsResponse;
        }).then(function (topicsWithData) {
            var normalized = Object(__WEBPACK_IMPORTED_MODULE_0__utils_handler_utils__["c" /* normalizeSubscribeResponse */])(topicsWithData, unprefixed);
            var prefixed = Object(__WEBPACK_IMPORTED_MODULE_1__utils__["b" /* mapWithPrefix */])(normalized, handler.matched);
            return prefixed;
        });
        promises.push(promise);
    });
    return $.when.apply(null, promises).then(function () {
        var arr = [].concat.apply([], arguments);
        return arr;
    });
}

/**
 * 
 * @param {Handler[]} handlers 
 * @param {Array<string>} recentlyUnsubscribedTopics
 * @param {Array<string>} remainingTopics 
 */
function notifyUnsubscribeHandlers(handlers, recentlyUnsubscribedTopics, remainingTopics) {
    handlers = handlers.map(function (h, index) {
        h.unsubsKey = index;
        return h;
    });

    var unsubsGrouped = Object(__WEBPACK_IMPORTED_MODULE_0__utils_handler_utils__["a" /* groupByHandlers */])(recentlyUnsubscribedTopics, handlers);
    var remainingGrouped = Object(__WEBPACK_IMPORTED_MODULE_0__utils_handler_utils__["a" /* groupByHandlers */])(remainingTopics, handlers);

    unsubsGrouped.filter(function (h) {
        return h.unsubscribeHandler;
    }).forEach(function (handler) {
        var unprefixedUnsubs = Object(__WEBPACK_IMPORTED_MODULE_1__utils__["f" /* unprefixTopics */])(handler.data, handler.matched);
        var matchingRemainingHandler = __WEBPACK_IMPORTED_MODULE_3_lodash___default.a.find(remainingGrouped, function (remainingHandler) {
            return remainingHandler.unsubsKey === handler.unsubsKey;
        });
        var matchingTopicsRemaining = matchingRemainingHandler ? matchingRemainingHandler.data : [];
        var unprefixedRemaining = Object(__WEBPACK_IMPORTED_MODULE_1__utils__["f" /* unprefixTopics */])(matchingTopicsRemaining || [], handler.matched);
        handler.unsubscribeHandler(unprefixedUnsubs, unprefixedRemaining);
    });
}
/**
 * 
 * @param {Handler[]} handlers 
 * @param {Publishable[]} publishData 
 * @param {PublishOptions} [options]
 * @returns {Promise}
 */
function passthroughPublishInterceptors(handlers, publishData, options) {
    var grouped = Object(__WEBPACK_IMPORTED_MODULE_0__utils_handler_utils__["b" /* groupSequentiallyByHandlers */])(publishData, handlers);
    var $initialProm = $.Deferred().resolve([]).promise();
    grouped.forEach(function (handler) {
        $initialProm = $initialProm.then(function (dataSoFar) {
            var mergedOptions = $.extend(true, {}, handler.options, options);
            var unprefixed = Object(__WEBPACK_IMPORTED_MODULE_1__utils__["e" /* unprefix */])(handler.data, handler.matched);

            var publishableData = Object(__WEBPACK_IMPORTED_MODULE_1__utils__["a" /* excludeReadOnly */])(unprefixed, mergedOptions.readOnly);
            if (!publishableData.length) {
                return dataSoFar;
            }

            var result = handler.publishHandler ? handler.publishHandler(publishableData, mergedOptions, handler.matched) : publishableData;
            var publishProm = $.Deferred().resolve(result).promise();
            return publishProm.then(function (published) {
                return Object(__WEBPACK_IMPORTED_MODULE_1__utils__["c" /* silencable */])(published, mergedOptions.silent);
            }).then(function (published) {
                var mapped = Object(__WEBPACK_IMPORTED_MODULE_1__utils__["b" /* mapWithPrefix */])(published, handler.matched);
                if (handler.isDefault && handler.matched) {
                    mapped = mapped.concat(published);
                }
                return mapped;
            }).then(function (mapped) {
                return [].concat(dataSoFar, mapped);
            });
        });
    });
    return $initialProm;
}

/**
 * Router
 * @param  {Handler[]} handlers
 * @param {Object} [options]
 * @param {Function} [notifier]
 * @returns {Router}
 */
function router(handlers, options, notifier) {
    var _this = this;

    var myHandlers = (handlers || []).map(function (Handler) {
        var handler = Handler;
        if (__WEBPACK_IMPORTED_MODULE_3_lodash___default.a.isFunction(Handler)) {
            handler = new Handler(options, notifier);
            $.extend(_this, handler.expose);
        }
        if (typeof handler.match === 'string') {
            var matchString = handler.match;
            handler.name = matchString;
            handler.match = function (t) {
                return t === matchString ? '' : false;
            };
        }
        return handler;
    });

    var expose = myHandlers.reduce(function (accum, h) {
        $.extend(true, accum, h.expose);
        return accum;
    }, {});

    return {
        expose: expose,
        match: function (topic) {
            return myHandlers.reduce(function (match, handler) {
                var matched = handler.match(topic);
                if (match === false && matched !== false) {
                    return '';
                }
                return match;
            }, false);
        },

        /**
         * @param {Array<string>} topics
         * @param {SubscribeOptions} [options]
         * @returns {Promise<Publishable[]>} Returns populated topics if available
         */
        subscribeHandler: function (topics, options) {
            return notifySubscribeHandlers(myHandlers, topics, options);
        },
        /**
         * @param {Array<string>} recentlyUnsubscribedTopics
         * @param {Array<string>} remainingTopics
         * @returns {void}
         */
        unsubscribeHandler: function (recentlyUnsubscribedTopics, remainingTopics) {
            return notifyUnsubscribeHandlers(myHandlers, recentlyUnsubscribedTopics, remainingTopics);
        },

        /**
         * @param {Publishable[]} data
         * @param {PublishOptions} [options]
         * @returns {Promise}
         */
        publishHandler: function (data, options) {
            return passthroughPublishInterceptors(myHandlers, data, options);
        },

        addRoute: function (handler) {
            if (!handler || !handler.match) {
                throw Error('Handler does not have a valid `match` property');
            }
            handler.id = __WEBPACK_IMPORTED_MODULE_3_lodash___default.a.uniqueId('routehandler-');
            myHandlers.unshift(handler);
            return handler.id;
        },
        removeRoute: function (routeid) {
            myHandlers = myHandlers.filter(function (handler) {
                return handler.id !== routeid;
            });
        }
    };
}

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return toImplicitType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return toPublishableFormat; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return splitNameArgs; });
/* eslint-disable complexity */
function toImplicitType(data) {
    var objRegex = /^(?:\{.*\})$/;
    var arrRegex = /^(?:\[.*])$/;

    var converted = data;
    if (typeof data === 'string') {
        converted = data.trim();

        if (converted === 'true') {
            converted = true;
        } else if (converted === 'false') {
            converted = false;
        } else if (converted === 'null') {
            converted = null;
        } else if (converted === 'undefined') {
            converted = '';
        } else if (converted.charAt(0) === '\'' || converted.charAt(0) === '"') {
            converted = converted.substring(1, converted.length - 1);
        } else if ($.isNumeric(converted)) {
            converted = +converted;
        } else if (arrRegex.test(converted)) {
            var bracketReplaced = converted.replace(/[[\]]/g, '');
            if (!bracketReplaced) return [];
            var parsed = bracketReplaced.split(/,(?![^[]*])/).map(function (val) {
                return toImplicitType(val);
            });
            return parsed;
        } else if (objRegex.test(converted)) {
            try {
                converted = JSON.parse(converted);
            } catch (e) {
                console.error('toImplicitType: couldn\'t convert', converted);
            }
        }
    }
    return converted;
}

function splitUnescapedCommas(str) {
    var regex = /(\\.|[^,])+/g;
    var m = void 0;

    var op = [];
    while ((m = regex.exec(str)) !== null) {
        //eslint-disable-line
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        m.forEach(function (match, groupIndex) {
            if (groupIndex === 0) {
                op.push(match.replace('\\', ''));
            }
        });
    }
    return op;
}

function splitNameArgs(value) {
    value = value.trim();
    var fnName = value.split('(')[0];
    var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
    var args = splitUnescapedCommas(params).map(function (p) {
        return p.trim();
    });
    return { name: fnName, args: args };
}

/**
 * @param  {string} value
 * @returns {{ name: string, value: any}[]}       [description]
 */
function toPublishableFormat(value) {
    var OPERATIONS_SEPERATOR = '&&';
    var split = (value || '').split(OPERATIONS_SEPERATOR);
    var listOfOperations = split.map(function (value) {
        if (value && value.indexOf('=') !== -1) {
            var _split = value.split('=');
            return { name: _split[0].trim(), value: _split[1].trim() };
        }
        var parsed = splitNameArgs(value);
        return { name: parsed.name, value: parsed.args };
    });
    return listOfOperations;
}



/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["b"] = matchPrefix;
/* harmony export (immutable) */ __webpack_exports__["a"] = matchDefaultPrefix;
/* harmony export (immutable) */ __webpack_exports__["c"] = matchRegex;
var ROUTE_DELIMITER = ':';

/**
 * 
 * @param {string} prefix
 * @returns {matchFunction}
 */
function matchPrefix(prefix) {
    return function prefixMatcher(topic) {
        var hasPrefix = topic.indexOf(prefix) === 0;
        if (hasPrefix) return prefix;

        var isOnlyPrefix = prefix.replace(/:/g, '') === topic;
        if (isOnlyPrefix) return topic;

        return false;
    };
}

/**
* 
* @param {string} prefix
* @returns {matchFunction}
*/
function matchDefaultPrefix(prefix) {
    return function defaultPrefixMatcher(topic, forcePrefix) {
        var hasPrefix = topic.indexOf(prefix) === 0;
        return hasPrefix || forcePrefix ? prefix : '';
    };
}

/**
 * 
 * @param {string} regex
 * @returns {matchFunction}
 */
function matchRegex(regex) {
    var toMatch = new RegExp('^' + regex + ROUTE_DELIMITER);
    return function regexMatcher(topic) {
        var match = topic.match(toMatch);
        if (match && match.length) {
            return match[0];
        }
        return false;
    };
}

/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["c"] = random;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__promise_utils__ = __webpack_require__(14);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return __WEBPACK_IMPORTED_MODULE_1__promise_utils__["a"]; });
/* unused harmony reexport promisify */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__debounce_and_merge__ = __webpack_require__(41);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_2__debounce_and_merge__["a"]; });





function random(prefix, min, max) {
    if (!min) {
        min = parseInt(Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["uniqueId"])(), 10);
    }
    if (!max) {
        max = 100000; //eslint-disable-line no-magic-numbers
    }
    var rnd = Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["random"])(min, max, false) + '';
    if (prefix) {
        rnd = prefix + rnd;
    }
    return rnd;
}

/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export VARIABLES_PREFIX */
/* unused harmony export META_PREFIX */
/* unused harmony export OPERATIONS_PREFIX */
/* unused harmony export _shouldFetch */
/* harmony export (immutable) */ __webpack_exports__["a"] = GenericRunRouteHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_meta_route_handler__ = __webpack_require__(62);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__run_variables_route_handler__ = __webpack_require__(63);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__run_operations_route_hander__ = __webpack_require__(65);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_channels_channel_router__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_channels_channel_router_utils__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_channels_route_handlers_route_matchers__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_6_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_channels_channel_utils__ = __webpack_require__(3);











var VARIABLES_PREFIX = 'variables:';
var META_PREFIX = 'meta:';
var OPERATIONS_PREFIX = 'operations:';

/**
 * 
 * @param {Publishable[]} result 
 * @param {string[]} ignoreOperations 
 * @returns {boolean}
 */
function _shouldFetch(result, ignoreOperations) {
    var filtered = (result || []).filter(function (r) {
        var name = r.name || '';
        var isIgnored = (ignoreOperations || []).indexOf(name.replace(OPERATIONS_PREFIX, '')) !== -1;
        var isVariable = name.indexOf(VARIABLES_PREFIX) === 0;
        var isOperation = name.indexOf(OPERATIONS_PREFIX) === 0;

        return isVariable || isOperation && !isIgnored;
    });
    return filtered.length > 0;
}

var RunService = F.service.Run;
function GenericRunRouteHandler(config, notifier) {
    var _this = this;

    var defaults = {
        serviceOptions: {},
        channelOptions: {
            variables: {
                autoFetch: true,
                debounce: 200,
                silent: false,
                readOnly: false
            },
            operations: {
                readOnly: false,
                silent: false
            },
            meta: {
                silent: false,
                autoFetch: true,
                readOnly: ['id', 'created', 'account', 'project', 'model', 'lastModified']
            }
        }
    };
    var opts = $.extend(true, {}, defaults, config);

    var serviceOptions = __WEBPACK_IMPORTED_MODULE_6_lodash___default.a.result(opts, 'serviceOptions');

    var $initialProm = null;
    if (serviceOptions instanceof RunService) {
        $initialProm = $.Deferred().resolve(serviceOptions).promise();
    } else if (serviceOptions.then) {
        $initialProm = serviceOptions;
    } else {
        var rs = new RunService(serviceOptions);
        $initialProm = $.Deferred().resolve(rs).promise();
    }

    var operationNotifier = Object(__WEBPACK_IMPORTED_MODULE_4_channels_channel_router_utils__["g" /* withPrefix */])(notifier, OPERATIONS_PREFIX);
    var variableNotifier = Object(__WEBPACK_IMPORTED_MODULE_4_channels_channel_router_utils__["g" /* withPrefix */])(notifier, [VARIABLES_PREFIX, '']);

    var metaHandler = new __WEBPACK_IMPORTED_MODULE_0__run_meta_route_handler__["a" /* default */]($initialProm, Object(__WEBPACK_IMPORTED_MODULE_4_channels_channel_router_utils__["g" /* withPrefix */])(notifier, META_PREFIX));
    var operationsHandler = new __WEBPACK_IMPORTED_MODULE_2__run_operations_route_hander__["a" /* default */]($initialProm, operationNotifier);
    var variablesHandler = new __WEBPACK_IMPORTED_MODULE_1__run_variables_route_handler__["a" /* default */]($initialProm, variableNotifier);

    var subscribed = false;
    var channelOptions = opts.channelOptions;
    $initialProm.then(function (rs) {
        if (rs.channel && !subscribed) {
            subscribed = true;
            var TOPICS = rs.channel.TOPICS;

            var subscribeOpts = { includeMine: false };
            //TODO: Provide subscription fn to individual channels and let them handle it?
            rs.channel.subscribe(TOPICS.RUN_VARIABLES, function (data, meta) {
                var publishable = Object(__WEBPACK_IMPORTED_MODULE_7_channels_channel_utils__["b" /* objectToPublishable */])(data);
                var excludingSilenced = Object(__WEBPACK_IMPORTED_MODULE_4_channels_channel_router_utils__["c" /* silencable */])(publishable, channelOptions.variables.silent);
                if (!excludingSilenced.length) {
                    return;
                }
                variablesHandler.notify(excludingSilenced, meta);
                variablesHandler.fetch(); //Variables channel #notify also does a fetch, but this is not supposed to know about that. Debouncing will take care of duplicate fetches anyway.
            }, _this, subscribeOpts);
            rs.channel.subscribe(TOPICS.RUN_OPERATIONS, function (data, meta) {
                var publishable = [{ name: data.name, value: data.result }];
                var excludingSilenced = Object(__WEBPACK_IMPORTED_MODULE_4_channels_channel_router_utils__["c" /* silencable */])(publishable, channelOptions.operations.silent);
                if (!excludingSilenced.length) {
                    return;
                }
                operationsHandler.notify(excludingSilenced, meta);
                variablesHandler.fetch();
            }, _this, subscribeOpts);
            rs.channel.subscribe(TOPICS.CONSENSUS_UPDATE, function (consensus, meta) {
                if (consensus.closed) {
                    variablesHandler.fetch();
                    // I should also do operationsHandler.notify but I don't know what to notify them about
                    //Just remove the 'include Mine' check for operations? That's just cached anyway
                }
            }, _this, { includeMine: true });
            rs.channel.subscribe(TOPICS.RUN_RESET, function (data, meta) {
                var publishable = [{ name: 'reset', value: data }];
                var excludingSilenced = Object(__WEBPACK_IMPORTED_MODULE_4_channels_channel_router_utils__["c" /* silencable */])(publishable, channelOptions.operations.silent);
                if (!excludingSilenced.length) {
                    return;
                }
                operationsHandler.notify(excludingSilenced, meta);
            }, _this, subscribeOpts);

            // rs.channel.subscribe('', (data, meta)=> {
            //     console.log('everything', data, meta);
            // });
        }
    });

    var handlers = [$.extend({}, metaHandler, {
        name: 'meta',
        match: Object(__WEBPACK_IMPORTED_MODULE_5_channels_route_handlers_route_matchers__["b" /* matchPrefix */])(META_PREFIX),
        options: opts.channelOptions.meta
    }), $.extend({}, operationsHandler, {
        name: 'operations',
        match: Object(__WEBPACK_IMPORTED_MODULE_5_channels_route_handlers_route_matchers__["b" /* matchPrefix */])(OPERATIONS_PREFIX),
        options: opts.channelOptions.operations
    }), $.extend({}, variablesHandler, {
        isDefault: true,
        name: 'variables',
        match: Object(__WEBPACK_IMPORTED_MODULE_5_channels_route_handlers_route_matchers__["a" /* matchDefaultPrefix */])(VARIABLES_PREFIX),
        options: opts.channelOptions.variables
    })];

    // router.addRoute(prefix('meta:'), metaChannel, opts.channelOptions.meta);

    var runRouter = Object(__WEBPACK_IMPORTED_MODULE_3_channels_channel_router__["a" /* default */])(handlers);
    var oldhandler = runRouter.publishHandler;
    runRouter.publishHandler = function (publishable) {
        var prom = oldhandler.apply(__WEBPACK_IMPORTED_MODULE_3_channels_channel_router__["a" /* default */], arguments);
        return prom.then(function (result) {
            //all the silencing will be taken care of by the router
            var shouldFetch = _shouldFetch(result, ['reset']);
            if (shouldFetch) {
                var excludeFromFetch = result.map(function (r) {
                    return r.name;
                }); //This was just published, no need to get the value again
                variablesHandler.fetch({ exclude: excludeFromFetch });
            }
            return result;
        });
    };
    return runRouter;
}

/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export _findMostConsequtive */
/* harmony export (immutable) */ __webpack_exports__["a"] = addChangeClassesToList;
/* harmony export (immutable) */ __webpack_exports__["b"] = addContentAndAnimate;
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _findMostConsequtive(arr, match) {
    var reduced = arr.reduce(function (accum, val) {
        if (val === match) {
            if (accum.prev === match) {
                accum.count = accum.count + 1;
            } else {
                accum.count = 1;
            }
        }
        accum.maxCount = Math.max(accum.maxCount, accum.count);
        accum.prev = val;
        return accum;
    }, { prev: null, count: 0, maxCount: 0 });
    return reduced.maxCount;
}

function buildDiffArray(currentcontents, newContents) {
    return newContents.map(function (contents, index) {
        var isSame = contents === currentcontents[index];
        return isSame;
    });
}

function fill(count, val) {
    var a = [];
    for (var i = 0; i < count; i++) {
        a.push(val);
    }
    return a;
}

function elToContents(el) {
    //ignore data attributes for comparison
    return el.outerHTML.replace(/\s?data-[a-zA-Z]*=['"][a-zA-Z0-9]*['"]/g, '').replace(/\s\s/g, ' ').trim();
}

function elementsToContents($els) {
    return $els.map(function (index, child) {
        return elToContents(child);
    }).get();
}

var defaults = {
    addAttr: 'data-add',
    changeAttr: 'data-update',
    initialAttr: 'data-initial'
};

/**
 * Compares 2 lists and Adds add or update classes
 * @param {JQuery<HTMLElement>} $currentEls existing elements
 * @param {JQuery<HTMLElement>} $newEls   new elements
 * @param {boolean} isInitial check if this is initial data or it's updating
 * @param {{ addAttr: string, changeAttr: string}} [options]
 * @returns {JQuery<HTMLElement>} elements with updated attributes
 */
function addChangeClassesToList($currentEls, $newEls, isInitial, options) {
    var opts = $.extend({}, defaults, options);

    var currentcontents = elementsToContents($currentEls);
    var newContents = elementsToContents($newEls);
    var reversedContents = currentcontents;

    //Guess if data was added to end or beginning of array
    var diffFromEnd = buildDiffArray(currentcontents, newContents);
    var diffFromBeginning = buildDiffArray(reversedContents.slice().reverse(), newContents.slice().reverse());

    var endMatches = _findMostConsequtive(diffFromEnd, true);
    var beginningMatches = _findMostConsequtive(diffFromBeginning, true);

    var placeHoldersCount = newContents.length - currentcontents.length;
    var placeHolders = fill(placeHoldersCount, undefined);

    if (beginningMatches <= endMatches) {
        currentcontents = currentcontents.concat(placeHolders);
    } else {
        currentcontents = placeHolders.concat(currentcontents);
    }

    for (var i = 0; i < newContents.length; i++) {
        var $el = $newEls.eq(i);
        var curr = currentcontents[i];
        $el.removeAttr(opts.initialAttr);

        var contents = elToContents($el.get(0));
        if (curr === undefined) {
            var _$el$attr;

            $el.attr((_$el$attr = {}, _defineProperty(_$el$attr, opts.addAttr, true), _defineProperty(_$el$attr, opts.initialAttr, isInitial || null), _$el$attr));
            $el.removeAttr(opts.changeAttr);
        } else if (curr !== contents) {
            var _$el$attr2;

            $el.attr((_$el$attr2 = {}, _defineProperty(_$el$attr2, opts.changeAttr, true), _defineProperty(_$el$attr2, opts.initialAttr, isInitial || null), _$el$attr2));
            $el.removeAttr(opts.addAttr);
        } else {
            $el.removeAttr(opts.addAttr + ' ' + opts.changeAttr);
        }
    }

    return $newEls;
}

function addContentAndAnimate($el, newValue, isInitial, options) {
    var opts = $.extend({}, defaults, options);
    var current = $el.html().trim();

    $el.removeAttr(opts.changeAttr + ' ' + opts.initialAttr);
    if (current === ('' + newValue).trim()) {
        return $el;
    }

    $el.html(newValue);
    setTimeout(function () {
        var _$el$attr3;

        $el.attr((_$el$attr3 = {}, _defineProperty(_$el$attr3, opts.changeAttr, true), _defineProperty(_$el$attr3, opts.initialAttr, isInitial || null), _$el$attr3));
    }, 0); //need this to trigger animation
}

/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["d"] = getKnownDataForEl;
/* harmony export (immutable) */ __webpack_exports__["i"] = updateKnownDataForEl;
/* harmony export (immutable) */ __webpack_exports__["g"] = removeKnownData;
/* unused harmony export getTemplateTags */
/* harmony export (immutable) */ __webpack_exports__["f"] = isTemplated;
/* harmony export (immutable) */ __webpack_exports__["c"] = findMissingReferences;
/* harmony export (immutable) */ __webpack_exports__["h"] = stubMissingReferences;
/* harmony export (immutable) */ __webpack_exports__["a"] = addBackMissingReferences;
/* harmony export (immutable) */ __webpack_exports__["e"] = getOriginalContents;
/* harmony export (immutable) */ __webpack_exports__["b"] = clearOriginalContents;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


var CURRENT_INDEX_KEY = 'current-index';
var CURRENT_INDEX_ATTR = 'data-' + CURRENT_INDEX_KEY;

function getKnownDataForEl($el) {
    var closestKnownDataEl = $el.closest('[' + CURRENT_INDEX_ATTR + ']');
    var knownData = {};
    if (closestKnownDataEl.length) {
        knownData = closestKnownDataEl.data(CURRENT_INDEX_KEY);
    }
    return knownData;
}
function updateKnownDataForEl($el, data) {
    $el.attr(CURRENT_INDEX_ATTR, JSON.stringify(data));
}
function removeKnownData($el) {
    $el.removeAttr(CURRENT_INDEX_ATTR);
}

function getTemplateTags(template) {
    template = template.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    var templateTagsUsed = template.match(/<%[=-]?([\s\S]+?)%>/g);
    return templateTagsUsed || [];
}
function isTemplated(template) {
    return getTemplateTags(template).length > 0;
}

function findMissingReferences(template, knownDataKeys) {
    function isKnownTag(tag, knownTags) {
        var match = knownDataKeys.find(function (key) {
            var regex = new RegExp('\\b' + key + '\\b');
            return regex.test(tag);
        });
        return match;
    }

    template = template.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    var missingReferences = {};
    var templateTagsUsed = getTemplateTags(template);
    if (templateTagsUsed) {
        templateTagsUsed.forEach(function (tag) {
            if (tag.match(/\w+/) && !isKnownTag(tag, knownDataKeys)) {
                var refKey = missingReferences[tag];
                if (!refKey) {
                    refKey = Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["uniqueId"])('no-ref');
                    missingReferences[tag] = refKey;
                }
            }
        });
    }
    return missingReferences;
}

function refToMarkup(refKey) {
    return '<!--' + refKey + '-->';
}

function stubMissingReferences(template, missingReferences) {
    template = template.replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    Object.keys(missingReferences).forEach(function (tag) {
        var refId = missingReferences[tag];
        var r = new RegExp(tag, 'g');
        template = template.replace(r, refToMarkup(refId));
    });
    return template;
}

function addBackMissingReferences(template, missingReferences) {
    Object.keys(missingReferences).forEach(function (originalTemplateVal) {
        var commentRef = missingReferences[originalTemplateVal];
        var r = new RegExp(refToMarkup(commentRef), 'g');
        template = template.replace(r, originalTemplateVal);
    });

    return template;
}

var elTemplateMap = new WeakMap();
function getOriginalContents($el, resolver) {
    var el = $el.get(0);
    var originalHTML = elTemplateMap.get(el);
    if (!originalHTML && resolver) {
        originalHTML = resolver($el).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        elTemplateMap.set(el, originalHTML);
    }
    return originalHTML;
}
function clearOriginalContents($el) {
    var el = $el.get(0);
    elTemplateMap.delete(el);
}

/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__config__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__config___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__config__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__default_node__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__default_node___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__default_node__);



/* harmony default export */ __webpack_exports__["default"] = (__WEBPACK_IMPORTED_MODULE_1__default_node___default.a.extend({
    propertyHandlers: [],

    uiChangeEvent: 'change.f-node-event',
    getUIValue: function () {
        return this.$el.val();
    },

    removeEvents: function () {
        this.$el.off(this.uiChangeEvent);
    },

    initialize: function () {
        var me = this;
        var propName = this.$el.data(__WEBPACK_IMPORTED_MODULE_0__config__["binderAttr"]);

        if (propName) {
            this.$el.off(this.uiChangeEvent).on(this.uiChangeEvent, function () {
                var val = me.getUIValue();
                var payload = [{ name: propName, value: val }];
                me.$el.trigger(__WEBPACK_IMPORTED_MODULE_0__config__["events"].trigger, { data: payload, source: 'bind' });
            });
        }
        __WEBPACK_IMPORTED_MODULE_1__default_node___default.a.prototype.initialize.apply(this, arguments);
    }
}, { selector: 'input, select, textarea' }));

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var BaseView = __webpack_require__(35);

module.exports = BaseView.extend({
    propertyHandlers: [],

    initialize: function () {}
}, { selector: '*' });

/***/ }),
/* 13 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export extractVariableName */
/* unused harmony export parseKeyAlias */
/* unused harmony export parseValueAlias */
/* harmony export (immutable) */ __webpack_exports__["a"] = aliasesFromTopics;
/* harmony export (immutable) */ __webpack_exports__["b"] = parseTopics;
var IN_OF_REGEX = /\((.*)\) (?:in|of)\s+(.*)/;
var KEY_VALUE_REGEX = /(.*),(.*)/;

/**
 * @param {string} attrVal 
 * @returns {string}
 */
function extractVariableName(attrVal) {
    var inMatch = attrVal.trim().match(IN_OF_REGEX);
    var varName = inMatch ? inMatch[2] : attrVal;
    return varName.trim();
}

/**
 * @param {string} attrVal 
 * @returns {string}
 */
function parseKeyAlias(attrVal) {
    var inMatch = attrVal.match(IN_OF_REGEX);
    if (!inMatch) {
        return undefined;
    }
    var itMatch = inMatch[1].match(KEY_VALUE_REGEX);
    var alias = itMatch ? itMatch[1].trim() : undefined;
    return alias;
}

/**
 * @param {string} attrVal 
 * @returns {string}
 */
function parseValueAlias(attrVal) {
    var inMatch = attrVal.match(IN_OF_REGEX);
    if (!inMatch) {
        return undefined;
    }
    var itMatch = inMatch[1].match(KEY_VALUE_REGEX);
    var alias = itMatch ? itMatch[2] : inMatch[1];
    return alias.trim();
}

//Public exports

function aliasesFromTopics(topics, value) {
    var relevantTopic = topics[0]; //doesn't support multiple topics

    var defaultKey = $.isPlainObject(value) ? 'key' : 'index';
    var keyAlias = relevantTopic.keyAlias || defaultKey;
    var valueAlias = relevantTopic.valueAlias || 'value';

    return { keyAlias: keyAlias, valueAlias: valueAlias };
}
function parseTopics(topics) {
    var attrVal = topics[0].name; //doesn't support multiple topics
    return [{
        name: extractVariableName(attrVal),
        keyAlias: parseKeyAlias(attrVal),
        valueAlias: parseValueAlias(attrVal)
    }];
}

/***/ }),
/* 14 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = makePromise;
/* harmony export (immutable) */ __webpack_exports__["b"] = promisify;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


/**
 * @param {any} val 
 * @returns {Promise}
 */
function makePromise(val) {
    //Can be replaced with Promise.resolve when we drop IE11;
    // if (isFunction(val)) {
    //     return Promise.resolve(val());
    // }
    // return Promise.resolve(val);
    if (val && val.then) {
        return val;
    }
    var $def = $.Deferred();
    if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(val)) {
        try {
            var toReturn = val();
            if (toReturn && toReturn.then) {
                return toReturn.then(function (r) {
                    return $def.resolve(r);
                }, function (e) {
                    return $def.reject(e);
                });
            }
            $def.resolve(toReturn);
        } catch (e) {
            $def.reject(e);
        }
    } else {
        $def.resolve(val);
    }
    return $def.promise();
}

/**
 * 
 * @param {function(*)} fn 
 * @returns {function(...any): Promise}
 */
function promisify(fn) {
    if (!Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(fn)) {
        throw new Error('Promisify requires a function, received ' + typeof fn);
    }
    /**
     * @param {...*} args 
     * @returns {Promise}
     */
    return function promisifiedFunction(args) {
        var $def = $.Deferred();
        try {
            var toReturn = fn.apply(fn, arguments);
            if (toReturn && toReturn.then) {
                return toReturn.then(function (r) {
                    return $def.resolve(r);
                }, function (e) {
                    return $def.reject(e);
                });
            } else {
                $def.resolve(toReturn);
            }
        } catch (e) {
            $def.reject(e);
        }
        return $def.promise();
    };
}

/***/ }),
/* 15 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = makeConsensusService;
function makeConsensusService(consensisAPIResponse) {
    return new window.F.service.Consensus({
        name: consensisAPIResponse.stage,
        consensusGroup: consensisAPIResponse.name,
        worldId: consensisAPIResponse.worldId
    });
}

/***/ }),
/* 16 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = extractDependencies;
/* harmony export (immutable) */ __webpack_exports__["b"] = interpolateWithValues;
var interpolationRegex = /<(.*?)>/g;
/**
 *  
 * @param {string} topic topic to extract dependencies from
 * @returns {string[]} dependencies
 */
function extractDependencies(topic) {
    var deps = (topic.match(interpolationRegex) || []).map(function (val) {
        return val.substring(1, val.length - 1);
    });
    return deps;
}

/**
 * @param {string} topic topic with dependencies
 * @param {{string: any}} data object with values of dependencies
 * @returns {string} interpolated string
 */
function interpolateWithValues(topic, data) {
    var interpolatedTopic = topic.replace(interpolationRegex, function (match, dependency) {
        var val = data[dependency];
        var toReplace = Array.isArray(val) ? val[val.length - 1] : val;
        return toReplace;
    });
    return interpolatedTopic;
}

/***/ }),
/* 17 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__dom_dom_manager__ = __webpack_require__(18);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_configured_channel_manager__ = __webpack_require__(52);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_config__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_config___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_config__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__utils__ = __webpack_require__(81);







var Flow = {
    dom: __WEBPACK_IMPORTED_MODULE_0__dom_dom_manager__["a" /* default */],
    utils: __WEBPACK_IMPORTED_MODULE_3__utils__,
    initialize: function (config) {
        var model = $('body').data('f-model');
        var defaults = {
            channel: {
                //FIXME: Defaults can't be here..
                defaults: {
                    run: {
                        model: model
                    }
                }
            },
            dom: {
                root: 'body',
                autoBind: true
            }
        };

        var options = $.extend(true, {}, defaults, config);

        if (config && config.channel && config.channel instanceof __WEBPACK_IMPORTED_MODULE_1_channels_configured_channel_manager__["a" /* default */]) {
            this.channel = config.channel;
        } else {
            this.channel = new __WEBPACK_IMPORTED_MODULE_1_channels_configured_channel_manager__["a" /* default */](options.channel);
        }

        var prom = __WEBPACK_IMPORTED_MODULE_0__dom_dom_manager__["a" /* default */].initialize($.extend(true, {
            channel: this.channel
        }, options.dom));

        this.channel.subscribe('operations:reset', function () {
            __WEBPACK_IMPORTED_MODULE_0__dom_dom_manager__["a" /* default */].unbindAll();
            __WEBPACK_IMPORTED_MODULE_0__dom_dom_manager__["a" /* default */].bindAll();
        });

        return prom;
    }
};
Flow.ChannelManager = __WEBPACK_IMPORTED_MODULE_1_channels_configured_channel_manager__["a" /* default */];
Flow.constants = __WEBPACK_IMPORTED_MODULE_2_config___default.a;
//set by grunt
if (true) Flow.version = "0.11.0"; //eslint-disable-line no-undef
/* harmony default export */ __webpack_exports__["default"] = (Flow);

/***/ }),
/* 18 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__dom_manager_utils_dom_parse_helpers__ = __webpack_require__(19);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__dom_manager_utils_dom_channel_prefix_helpers__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_utils_parse_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__config__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__config___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4__config__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_converter_manager__ = __webpack_require__(24);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__nodes_node_manager__ = __webpack_require__(33);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__attribute_manager__ = __webpack_require__(36);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__plugins_auto_update_bindings__ = __webpack_require__(51);
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }















/* harmony default export */ __webpack_exports__["a"] = ((function () {
    //Jquery selector to return everything which has a f- property set
    $.expr.pseudos[__WEBPACK_IMPORTED_MODULE_4__config__["prefix"]] = function (el) {
        if (!el || !el.attributes) {
            return false;
        }
        for (var i = 0; i < el.attributes.length; i++) {
            var attr = el.attributes[i].nodeName;
            if (attr.indexOf('data-' + __WEBPACK_IMPORTED_MODULE_4__config__["prefix"]) === 0) {
                return true;
            }
        }
        return false;
    };

    /**
     * @param {JQuery<HTMLElement>} root
     * @returns {JQuery<HTMLElement>}
     */
    function getMatchingElements(root) {
        var $root = $(root);
        var matchedElements = $root.find(':' + __WEBPACK_IMPORTED_MODULE_4__config__["prefix"]);
        if ($root.is(':' + __WEBPACK_IMPORTED_MODULE_4__config__["prefix"])) {
            matchedElements = matchedElements.add($root);
        }
        return matchedElements;
    }

    /**
     * @param {JQuery<HTMLElement> | HTMLElement} element
     * @param {*} [context]
     * @returns {HTMLElement}
     */
    function getElementOrError(element, context) {
        var el = element instanceof $ ? element.get(0) : element;
        if (!el || !el.nodeName) {
            console.error(context, 'Expected to get DOM Element, got ', element);
            throw new Error(context + ': Expected to get DOM Element, got' + typeof element);
        }
        return el;
    }

    //Unbind utils
    function triggerError($el, e) {
        var msg = e.message || e;
        if ($.isPlainObject(msg)) {
            msg = JSON.stringify(msg);
        }
        $el.attr(__WEBPACK_IMPORTED_MODULE_4__config__["errorAttr"], msg).trigger(__WEBPACK_IMPORTED_MODULE_4__config__["events"].error, e);
    }
    function unbindAllAttributes(domEl) {
        var $el = $(domEl);
        $(domEl.attributes).each(function (index, nodeMap) {
            var attr = nodeMap.nodeName;
            var wantedPrefix = 'data-f-';
            if (attr.indexOf(wantedPrefix) === 0) {
                attr = attr.replace(wantedPrefix, '');
                var handler = __WEBPACK_IMPORTED_MODULE_7__attribute_manager__["a" /* default */].getHandler(attr, $el);
                if (handler.unbind) {
                    handler.unbind(attr, $el);
                }
            }
        });
    }
    function unbindAllNodeHandlers(domEl) {
        var $el = $(domEl);
        //FIXME: have to readd events to be able to remove them. Ugly
        var Handler = __WEBPACK_IMPORTED_MODULE_6__nodes_node_manager__["a" /* default */].getHandler($el);
        var h = new Handler.handle({
            el: domEl
        });
        if (h.removeEvents) {
            h.removeEvents();
        }
    }
    function removeAllSubscriptions(subscriptions, channel, el) {
        [].concat(subscriptions).forEach(function (subs) {
            try {
                channel.unsubscribe(subs);
            } catch (e) {
                triggerError(el, e);
            }
        });
    }

    var publicAPI = {

        nodes: __WEBPACK_IMPORTED_MODULE_6__nodes_node_manager__["a" /* default */],
        attributes: __WEBPACK_IMPORTED_MODULE_7__attribute_manager__["a" /* default */],
        converters: __WEBPACK_IMPORTED_MODULE_5_converter_manager__["a" /* default */],

        matchedElements: new Map(),

        /**
         * Unbind the element; unsubscribe from all updates on the relevant channels.
         *
         * @param {JQuery<HTMLElement> | HTMLElement} element The element to remove from the data binding.
         * @param {Channel} channel (Optional) The channel from which to unsubscribe. Defaults to the [variables channel](../channels/variables-channel/).
         * @returns {void}
         */
        unbindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            var domEl = getElementOrError(element);
            var $el = $(element);
            var existingData = this.matchedElements.get(domEl);
            if (!$el.is(':' + __WEBPACK_IMPORTED_MODULE_4__config__["prefix"]) || !existingData) {
                return;
            }
            this.matchedElements.delete(element);
            var subscriptions = Object.keys(existingData).reduce(function (accum, a) {
                var subsid = existingData[a].subscriptionId;
                if (subsid) accum.push(subsid);
                return accum;
            }, []);

            unbindAllNodeHandlers(domEl);
            unbindAllAttributes(domEl);
            removeAllSubscriptions(subscriptions, channel, $el);

            var animAttrs = Object.keys(__WEBPACK_IMPORTED_MODULE_4__config__["animation"]).join(' ');
            $el.removeAttr(animAttrs);

            Object.keys($el.data()).forEach(function (key) {
                if (key.indexOf('f-') === 0 || key.match(/^f[A-Z]/)) {
                    $el.removeData(key);
                }
            });
        },

        /**
         * Bind the element: subscribe from updates on the relevant channels.
         *
         * @param {HTMLElement | JQuery<HTMLElement>} element The element to add to the data binding.
         * @param {Channel} channel (Optional) The channel to subscribe to. Defaults to the [run channel](../channels/run-channel/).
         * @returns {void}
         */
        bindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            // this.unbindElement(element); //unbind actually removes the data,and jquery doesn't refetch when .data() is called..
            var domEl = getElementOrError(element);
            var $el = $(domEl);
            if (!$el.is(':' + __WEBPACK_IMPORTED_MODULE_4__config__["prefix"])) {
                return;
            }

            //Send to node manager to handle ui changes
            var Handler = __WEBPACK_IMPORTED_MODULE_6__nodes_node_manager__["a" /* default */].getHandler($el);
            new Handler.handle({
                el: domEl
            });

            var filterPrefix = 'data-' + __WEBPACK_IMPORTED_MODULE_4__config__["prefix"] + '-';
            var attrList = {};
            $(domEl.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                if (attr.indexOf(filterPrefix) !== 0) {
                    return;
                }
                attr = attr.replace(filterPrefix, '');

                var attrVal = nodeMap.value;
                var topics = Object(__WEBPACK_IMPORTED_MODULE_0__dom_manager_utils_dom_parse_helpers__["d" /* parseTopicsFromAttributeValue */])(attrVal);

                var handler = __WEBPACK_IMPORTED_MODULE_7__attribute_manager__["a" /* default */].getHandler(attr, $el);
                if (handler && handler.init) {
                    handler.init(attr, topics, $el);
                }
                if (topics.length && handler && handler.parse) {
                    topics = [].concat(handler.parse(topics));
                }

                var channelPrefix = Object(__WEBPACK_IMPORTED_MODULE_0__dom_manager_utils_dom_parse_helpers__["b" /* getChannelForAttribute */])($el, attr);
                topics = Object(__WEBPACK_IMPORTED_MODULE_1__dom_manager_utils_dom_channel_prefix_helpers__["b" /* addPrefixToTopics */])(topics, channelPrefix);

                var converters = Object(__WEBPACK_IMPORTED_MODULE_0__dom_manager_utils_dom_parse_helpers__["c" /* getConvertersForEl */])($el, attr);
                attrList[attr] = {
                    channelPrefix: channelPrefix,
                    topics: topics,
                    converters: converters //Store once instead of calculating on demand. Avoids having to parse through dom every time
                };
            });
            //Need this to be set before subscribing or callback maybe called before it's set
            this.matchedElements.set(domEl, attrList);

            var channelConfig = Object(__WEBPACK_IMPORTED_MODULE_0__dom_manager_utils_dom_parse_helpers__["a" /* getChannelConfigForElement */])(domEl);
            var attrsWithSubscriptions = Object.keys(attrList).reduce(function (accum, name) {
                var attr = attrList[name];
                var topics = attr.topics,
                    channelPrefix = attr.channelPrefix;

                if (!topics.length) {
                    accum[name] = attr;
                    return accum;
                }

                var subsOptions = $.extend({
                    batch: true,
                    onError: function (e) {
                        console.error('DomManager: Subscription error', domEl, e);
                        triggerError($el, e);
                    }
                }, channelConfig);
                var subscribableTopics = topics.map(function (t) {
                    return t.name;
                });
                var subsid = channel.subscribe(subscribableTopics, function (data, meta) {
                    if (meta && Object(__WEBPACK_IMPORTED_MODULE_3_lodash__["isEqual"])(data, meta.previousData)) {
                        return;
                    }
                    var toConvert = {};
                    if (subscribableTopics.length === 1) {
                        //If I'm only interested in 1 thing pass in value directly, else make a map;
                        toConvert[name] = data[subscribableTopics[0]];
                    } else {
                        var dataForAttr = Object(__WEBPACK_IMPORTED_MODULE_3_lodash__["pick"])(data, subscribableTopics) || {};
                        toConvert[name] = Object.keys(dataForAttr).reduce(function (accum, key) {
                            //If this was through a auto-prefixed channel attr return what was bound
                            var toReplace = new RegExp('^' + channelPrefix + ':');
                            var k = channelPrefix ? key.replace(toReplace, '') : key;
                            accum[k] = dataForAttr[key];
                            return accum;
                        }, {});
                    }
                    $el.removeAttr(__WEBPACK_IMPORTED_MODULE_4__config__["errorAttr"]).trigger(__WEBPACK_IMPORTED_MODULE_4__config__["events"].convert, toConvert);
                }, subsOptions);

                accum[name] = Object.assign({}, attr, { subscriptionId: subsid });
                return accum;
            }, {});

            this.matchedElements.set(domEl, attrsWithSubscriptions);
        },

        /**
         * Bind all provided elements.
         *
         * @param  {JQuery<HTMLElement> | HTMLElement[]} [elementsToBind] (Optional) If not provided, binds all matching elements within default root provided at initialization.
         * @returns {void}
         */
        bindAll: function (elementsToBind) {
            var _this = this;

            if (!elementsToBind) {
                elementsToBind = getMatchingElements(this.options.root);
            } else if (!Array.isArray(elementsToBind)) {
                elementsToBind = getMatchingElements(elementsToBind);
            }

            //parse through dom and find everything with matching attributes
            $.each(elementsToBind, function (index, element) {
                _this.bindElement(element, _this.options.channel);
            });
        },
        /**
         * Unbind provided elements.
         *
         * @param  {JQuery<HTMLElement> | HTMLElement[]} [elementsToUnbind] (Optional) If not provided, unbinds everything.
         * @returns {void}
         */
        unbindAll: function (elementsToUnbind) {
            var me = this;
            if (!elementsToUnbind) {
                elementsToUnbind = [];
                this.matchedElements.forEach(function (val, key) {
                    elementsToUnbind.push(key);
                });
            } else if (!Array.isArray(elementsToUnbind)) {
                elementsToUnbind = getMatchingElements(elementsToUnbind);
            }
            $.each(elementsToUnbind, function (index, element) {
                me.unbindElement(element, me.options.channel);
            });
        },

        plugins: {},

        /**
         * Initialize the DOM Manager to work with a particular HTML element and all elements within that root. Data bindings between individual HTML elements and the model variables specified in the attributes will happen via the channel.
         *
         * @param {Object} options (Optional) Overrides for the default options.
         * @param {string} options.root The root HTML element being managed by this instance of the DOM Manager. Defaults to `body`.
         * @param {Object} options.channel The channel to communicate with. Defaults to the Channel Manager from [Epicenter.js](../../../api_adapters/).
         * @param {boolean} options.autoBind If `true` (default), any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.
         * @returns {Promise}
         */
        initialize: function (options) {
            var defaults = {
                /**
                 * Root of the element for flow.js to manage from.
                 * @type {string} jQuery selector
                 */
                root: 'body',
                channel: null,

                /**
                 * Any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.
                 * @type {boolean}
                 */
                autoBind: true
            };
            $.extend(defaults, options);

            var channel = defaults.channel;

            this.options = defaults;

            var me = this;
            var $root = $(defaults.root);

            function attachUIListeners($root) {
                function parseValue(value, converters) {
                    if (Array.isArray(value)) {
                        var parsed = value.map(function (val) {
                            return Object(__WEBPACK_IMPORTED_MODULE_2_utils_parse_utils__["b" /* toImplicitType */])(val);
                        });
                        return __WEBPACK_IMPORTED_MODULE_5_converter_manager__["a" /* default */].parse(parsed, converters);
                    }
                    return __WEBPACK_IMPORTED_MODULE_5_converter_manager__["a" /* default */].parse(Object(__WEBPACK_IMPORTED_MODULE_2_utils_parse_utils__["b" /* toImplicitType */])(value), converters);
                }

                $root.off(__WEBPACK_IMPORTED_MODULE_4__config__["events"].trigger).on(__WEBPACK_IMPORTED_MODULE_4__config__["events"].trigger, function (evt, params) {
                    var elMeta = me.matchedElements.get(evt.target);
                    var data = params.data,
                        source = params.source,
                        options = params.options;

                    if (!elMeta || !data) {
                        return;
                    }
                    var sourceMeta = elMeta[source] || {};
                    var channelPrefix = sourceMeta.channelPrefix,
                        converters = sourceMeta.converters;

                    var $el = $(evt.target);

                    var parsed = [].concat(data).map(function (action) {
                        var name = action.name,
                            value = action.value;

                        var parsedValue = parseValue(value, converters);
                        var actualName = name.split('|')[0].trim(); //FIXME: this shouldn't know about the pipe syntax
                        var prefixedName = Object(__WEBPACK_IMPORTED_MODULE_1__dom_manager_utils_dom_channel_prefix_helpers__["a" /* addDefaultPrefix */])(actualName, source, channelPrefix);
                        return { name: prefixedName, value: parsedValue };
                    }, []);

                    channel.publish(parsed, options).then(function (result) {
                        if (!result || !result.length) {
                            return;
                        }
                        var last = result[result.length - 1];
                        $el.trigger(__WEBPACK_IMPORTED_MODULE_4__config__["events"].convert, _defineProperty({}, source, last.value));
                    }, function (e) {
                        triggerError($el, e);
                    });
                });
            }

            function attachConversionListner($root) {
                // data = {proptoupdate: value}
                $root.off(__WEBPACK_IMPORTED_MODULE_4__config__["events"].convert).on(__WEBPACK_IMPORTED_MODULE_4__config__["events"].convert, function (evt, data) {
                    var $el = $(evt.target);

                    var elMeta = me.matchedElements.get(evt.target);
                    if (!elMeta) {
                        return;
                    }

                    Object.keys(data).forEach(function (prop) {
                        var val = data[prop];
                        var _elMeta$prop = elMeta[prop],
                            converters = _elMeta$prop.converters,
                            topics = _elMeta$prop.topics;

                        var convertedValue = __WEBPACK_IMPORTED_MODULE_5_converter_manager__["a" /* default */].convert(val, converters);

                        var handler = __WEBPACK_IMPORTED_MODULE_7__attribute_manager__["a" /* default */].getHandler(prop, $el);
                        handler.handle(convertedValue, prop, $el, topics);
                    });
                });
            }

            var deferred = $.Deferred();
            $(function () {
                me.bindAll();

                attachUIListeners($root);
                attachConversionListner($root);

                me.plugins.autoBind = Object(__WEBPACK_IMPORTED_MODULE_8__plugins_auto_update_bindings__["a" /* default */])($root.get(0), me, me.options.autoBind);

                deferred.resolve($root);
                $root.trigger('f.domready');
            });

            return deferred.promise();
        }
    };

    return $.extend(this, publicAPI);
})());

/***/ }),
/* 19 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__parse_converters__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__parse_channel__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__parse_topics__ = __webpack_require__(22);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return __WEBPACK_IMPORTED_MODULE_0__parse_converters__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return __WEBPACK_IMPORTED_MODULE_1__parse_channel__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_1__parse_channel__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return __WEBPACK_IMPORTED_MODULE_2__parse_topics__["a"]; });






/***/ }),
/* 20 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = getConvertersForEl;
/**
 * @param {string} conv 
 * @returns {string[]}
 */
function convertersToArray(conv) {
    if (!conv || !conv.trim()) return [];
    return conv.split('|').map(function (v) {
        return v.trim();
    });
}

/**
 * @param {JQuery<HTMLElement>} $el
 * @param {string} attribute 
 * @returns {string[]}
 */
function getConvertersFromAttr($el, attribute) {
    var attrVal = $el.attr('data-f-' + attribute);
    var withConv = convertersToArray(attrVal);
    if (withConv.length > 1) {
        return withConv.slice(1); //First item will be the topic
    }
    return [];
}
function getFConvertAttrVal($el, suffix) {
    var baseAttr = 'data-f-convert';
    var suffixAttr = suffix ? '-' + suffix : '';
    var conv = $el.attr('' + baseAttr + suffixAttr); //.data shows value cached by jquery
    return convertersToArray(conv);
}

/**
 * @param {JQuery<HTMLElement>} $el  
 * @param {string} attribute 
 * @returns {string[]} converters
 */
function getConvertersForEl($el, attribute) {
    function getAllConverters($el, attribute) {
        var convertersAsPipes = getConvertersFromAttr($el, attribute);
        if (convertersAsPipes.length) {
            return convertersAsPipes;
        }

        var whiteListedGenericAttributes = ['bind', 'foreach', 'repeat'];
        var canUseFConvert = whiteListedGenericAttributes.indexOf(attribute) !== -1;
        if (canUseFConvert) {
            return getFConvertAttrVal($el, '');
        }
        return getFConvertAttrVal($el, attribute);
    }

    var converters = getAllConverters($el, attribute);
    var $parentEl = $el.parents('[data-f-convert]').eq(0);
    var resolvedConverters = converters.reduce(function (accum, val) {
        if (val === 'inherit') {
            var parentConv = getConvertersForEl($parentEl, attribute);
            accum = accum.concat(parentConv);
        } else {
            accum = accum.concat(val);
        }
        return accum;
    }, []);

    if (!resolvedConverters.length && $parentEl.length) {
        return getConvertersForEl($parentEl, attribute);
    }
    return resolvedConverters;
}

/***/ }),
/* 21 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["b"] = getChannelForAttribute;
/* harmony export (immutable) */ __webpack_exports__["a"] = getChannelConfigForElement;
/**
 * 
 * @param {JQuery<HTMLElement>} $el  
 * @param {string} attr 
 * @returns {string|undefined}
 */
function getChannelForAttribute($el, attr) {
    attr = attr.replace('data-f-', '');
    var channel = $el.data('f-channel-' + attr);
    if (channel === undefined) {
        channel = $el.attr('data-f-channel'); //.data shows value cached by jquery
    }
    if (channel === undefined) {
        var $parentEl = $el.closest('[data-f-channel]');
        if ($parentEl) {
            channel = $parentEl.attr('data-f-channel');
        }
    }
    return channel;
}

/**
 * @param {HTMLElement} el
 * @returns {Object}
 */
function getChannelConfigForElement(el) {
    //TODO: Should this look at parents too?
    var attrs = el.attributes;
    var config = {};
    for (var i = 0; i < attrs.length; i++) {
        var attrib = el.attributes[i];
        if (attrib.specified && attrib.name.indexOf('data-f-channel-') === 0) {
            var key = attrib.name.replace('data-f-channel-', '');
            config[key] = attrib.value;
        }
    }
    return config;
}

/***/ }),
/* 22 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = parseTopicsFromAttributeValue;
/**
 * @param {string} attrVal 
 * @returns {NormalizedTopic[]} variables
 */
function parseTopicsFromAttributeValue(attrVal) {
    var commaRegex = /,(?![^[(]*[\])])/; //split except on a[b,c] or a(v,c)
    var topicsPart = attrVal.split('|')[0];
    if (topicsPart.indexOf('<%') !== -1) {
        //Assume it's templated for later use
        return [];
    }
    var split = topicsPart.split(commaRegex);
    if (split.length > 1) {
        return split.map(function (v) {
            return { name: v.trim() };
        });
    }
    return [{ name: topicsPart.trim() }];
}

/***/ }),
/* 23 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["b"] = addPrefixToTopics;
/* harmony export (immutable) */ __webpack_exports__["a"] = addDefaultPrefix;
/**
 * 
 * @param {NormalizedTopic[]} topics 
 * @param {string} prefix 
 * @returns {NormalizedTopic[]}
 */
function addPrefixToTopics(topics, prefix) {
    if (!prefix) {
        return topics;
    }
    var mappedTopics = topics.map(function (topic) {
        var currentName = topic.name;
        var hasChannelDefined = currentName.indexOf(':') !== -1;
        if (!hasChannelDefined) {
            topic.name = prefix + ':' + currentName;
        }
        return topic;
    });
    return mappedTopics;
}

var DEFAULT_OPERATIONS_PREFIX = 'operations:';
var DEFAULT_VARIABLES_PREFIX = 'variables:';

function addDefaultPrefix(name, source, channelPrefix) {
    var isUnprefixed = name.indexOf(':') === -1;

    var defaultPrefix = source.indexOf('on-') === 0 ? DEFAULT_OPERATIONS_PREFIX : DEFAULT_VARIABLES_PREFIX;
    var needsDefaultPrefix = defaultPrefix !== DEFAULT_VARIABLES_PREFIX;

    if (isUnprefixed && needsDefaultPrefix) {
        name = '' + defaultPrefix + name;
    }
    var hasDefaultPrefix = name.indexOf(defaultPrefix) === 0;
    if ((isUnprefixed || hasDefaultPrefix) && channelPrefix) {
        name = channelPrefix + ':' + name;
    }
    return name;
}

/***/ }),
/* 24 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__utils_parse_utils__ = __webpack_require__(5);



var normalize = function (alias, converter, acceptList) {
    var ret = [];
    //nomalize('flip', fn)
    if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(converter)) {
        ret.push({
            alias: alias,
            convert: converter,
            acceptList: acceptList
        });
    } else if ($.isPlainObject(converter) && converter.convert) {
        converter.alias = alias;
        converter.acceptList = acceptList;
        ret.push(converter);
    } else if ($.isPlainObject(alias)) {
        //normalize({alias: 'flip', convert: function})
        if (alias.convert) {
            ret.push(alias);
        } else {
            // normalize({flip: fun})
            $.each(alias, function (key, val) {
                ret.push({
                    alias: key,
                    convert: val,
                    acceptList: acceptList
                });
            });
        }
    }
    return ret;
};

var matchConverter = function (alias, converter) {
    if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isString"])(converter.alias)) {
        return alias === converter.alias;
    } else if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(converter.alias)) {
        return converter.alias(alias);
    } else if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isRegExp"])(converter.alias)) {
        return converter.alias.match(alias);
    }
    return false;
};

var converterManager = {
    private: {
        matchConverter: matchConverter
    },

    list: [],
    /**
     * Add a new attribute converter to this instance of Flow.js.
     *
     * **Example**
     *
     *      Flow.dom.converters.register('max', function (value) {
     *          return max(value);
     *      }, true);
     *
     *      Flow.dom.converters.register({
     *          alias: 'sig',
     *          parse: $.noop,
     *          convert: function (value) {
     *              return value.firstName + ' ' + value.lastName + ', ' + value.jobTitle;
     *      }, false);
     *
     *      <div>
     *          The largest sales you had was <span data-f-bind="salesByYear | max | $#,###"></span>.
     *          The current sales manager is <span data-f-bind="salesMgr | sig"></span>.
     *      </div>
     *
     * @param  {string|Function|RegExp} alias Formatter name.
     * @param  {Function|Object} [converter] If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
     * @param {boolean} [acceptList] Determines if the converter is a 'list' converter or not. List converters take in arrays as inputs, others expect single values.
     * @returns {void}
     */
    register: function (alias, converter, acceptList) {
        var normalized = normalize(alias, converter, acceptList);
        this.list = normalized.concat(this.list);
    },

    /**
     * Replace an already registered converter with a new one of the same name.
     *
     * @param {string} alias Formatter name.
     * @param {Function|Object} converter If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
     * @returns {void}
     */
    replace: function (alias, converter) {
        var index;
        this.list.forEach(function (currentConverter, i) {
            if (matchConverter(alias, currentConverter)) {
                index = i;
                return false;
            }
        });
        this.list.splice(index, 1, normalize(alias, converter)[0]);
    },

    getConverter: function (alias) {
        var norm = Object(__WEBPACK_IMPORTED_MODULE_1__utils_parse_utils__["a" /* splitNameArgs */])(alias);
        norm.args = norm.args.map(__WEBPACK_IMPORTED_MODULE_1__utils_parse_utils__["b" /* toImplicitType */]);

        var conv = Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["find"])(this.list, function (converter) {
            return matchConverter(norm.name, converter);
        });
        if (conv && norm.args) {
            return $.extend({}, conv, { convert: Function.bind.apply(conv.convert, [null].concat(norm.args)) });
        }
        return conv;
    },

    /**
     * Pipes the value sequentially through a list of provided converters.
     *
     * @param  {*} value Input for the converter to tag.
     * @param  {string|string[]} list List of converters (maps to converter alias).
     *
     * @returns {*} Converted value.
     */
    convert: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list).map(function (v) {
            return v.trim();
        });

        var currentValue = value;
        var me = this;

        var convertArray = function (converter, val, converterName) {
            return val.map(function (v) {
                return converter.convert(v, converterName);
            });
        };
        var convert = function (converter, value, converterName) {
            var converted;
            if (Array.isArray(value) && converter.acceptList !== true) {
                converted = convertArray(converter, value, converterName);
            } else {
                converted = converter.convert(value, converterName);
            }
            return converted;
        };
        var convertObject = function (converter, value, converterName) {
            return Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["mapValues"])(value, function (val) {
                return convert(converter, val, converterName);
            });
        };
        list.forEach(function (converterName) {
            var converter = me.getConverter(converterName);
            if (!converter) {
                throw new Error('Could not find converter for ' + converterName);
            }
            if ($.isPlainObject(currentValue) && converter.acceptList !== true) {
                currentValue = convertObject(converter, currentValue, converterName);
            } else {
                currentValue = convert(converter, currentValue, converterName);
            }
        });
        return currentValue;
    },

    /**
     * Counter-part to `convert()`. Translates converted values back to their original form.
     *
     * @param  {*} value Value to parse.
     * @param  {string|string[]} list  List of parsers to run the value through. Outermost is invoked first.
     * @returns {*} Original value.
     */
    parse: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list).reverse().map(function (v) {
            return v.trim();
        });

        var currentValue = value;
        var me = this;
        list.forEach(function (converterName) {
            var converter = me.getConverter(converterName);
            if (!converter) {
                throw new Error('parse: Could not find converter ' + converterName);
            }
            if (converter.parse) {
                currentValue = converter.parse(currentValue, converterName);
            }
        });
        return currentValue;
    }
};

//Bootstrap
var defaultconverters = [__webpack_require__(25), __webpack_require__(26), __webpack_require__(27), __webpack_require__(28), __webpack_require__(29), __webpack_require__(30), __webpack_require__(31), __webpack_require__(32)];

defaultconverters.reverse().forEach(function (converter) {
    if (Array.isArray(converter)) {
        converter.forEach(function (c) {
            converterManager.register(c);
        });
    } else {
        converterManager.register(converter);
    }
});

/* harmony default export */ __webpack_exports__["a"] = (converterManager);

/***/ }),
/* 25 */
/***/ (function(module, exports) {

module.exports = {
    alias: 'i',
    /**
     * Convert the model variable to an integer. Often used for chaining to another converter.
     *
     * **Example**
     *
     *      <div>
     *          Your car has driven
     *          <span data-f-bind="Odometer | i | s0.0"></span> miles.
     *      </div>
     *
     * @param {string} value The model variable.
     * @returns {number}
     */
    convert: function (value) {
        return parseFloat(value);
    }
};

/***/ }),
/* 26 */
/***/ (function(module, exports) {

module.exports = {

    /**
     * Convert the model variable to a string. Often used for chaining to another converter.
     *
     * **Example**
     *
     *      <div>
     *          This year you are in charge of sales for
     *          <span data-f-bind="salesMgr.region | s | upperCase"></span>.
     *      </div>
     *
     * @param {Array} val The model variable.
     * @returns {string} converted string
     */
    s: function (val) {
        return val + '';
    },

    /**
     * Convert the model variable to UPPER CASE.
     *
     * **Example**
     *
     *      <div>
     *          This year you are in charge of sales for
     *          <span data-f-bind="salesMgr.region | s | upperCase"></span>.
     *      </div>
     *
     * @param {Array} val The model variable.
     * @returns {string} converted string
     */
    upperCase: function (val) {
        return (val + '').toUpperCase();
    },

    /**
     * Convert the model variable to lower case.
     *
     * **Example**
     *
     *      <div>
     *          Enter your user name:
     *          <input data-f-bind="userName | lowerCase"></input>.
     *      </div>
     *
     * @param {Array} val The model variable.
     * @returns {string} converted string
     */
    lowerCase: function (val) {
        return (val + '').toLowerCase();
    },

    /**
     * Convert the model variable to Title Case.
     *
     * **Example**
     *
     *      <div>
     *          Congratulations on your promotion!
     *          Your new title is: <span data-f-bind="currentRole | titleCase"></span>.
     *      </div>
     *
     * @param {string} val The model variable.
     * @returns {string} converted string
     */
    titleCase: function (val) {
        val = val + '';
        return val.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }
};

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

var _ = __webpack_require__(0);

function parseLimitArgs(starting, limit, val) {
    var toRet = {};
    if (arguments.length === 3) {
        //eslint-disable-line
        toRet = {
            input: limit,
            limit: starting
        };
    } else if (arguments.length === 2) {
        toRet = {
            input: starting
        };
    } else {
        console.error('Too many arguments passed to last', arguments);
        throw new Error('Too many arguments passed to last');
    }

    toRet.input = [].concat(toRet.input);
    return toRet;
}

var list = {
    /**
     * Convert the input into an array. 
     *
     * @param {any[]} val The array model variable.
     * @returns {any[]}
     */
    list: function (val) {
        return [].concat(val);
    },

    /**
     * Reverse the array.
     *
     * **Example**
     *
     *      <p>Show the history of our sales, starting with the last (most recent):</p>
     *      <ul data-f-foreach="Sales | reverse">
     *          <li></li>
     *      </ul>
     *
     * @param {any[]} val The array model variable.
     * @returns {any[]} the reversed array
     */
    reverse: function (val) {
        return [].concat(val).reverse();
    },

    /**
     * Select only the last element of the array.
     *
     * **Example**
     *
     *      <div>
     *          In the current year, we have <span data-f-bind="Sales | last"></span> in sales.
     *      </div>
     *
     * @param {number} n number of items to get
     * @param {any[]} val The array model variable.
     * @returns {any} last element of array
     */
    last: function (n, val) {
        var parsed = parseLimitArgs.apply(null, arguments);
        var stripped = parsed.input.slice(-(parsed.limit || 1));
        if (stripped.length <= 1) {
            return stripped[0];
        }
        return stripped;
    },

    /**
     * Select only the first element of the array.
     *
     * **Example**
     *
     *      <div>
     *          Our initial investment was <span data-f-bind="Capital | first"></span>.
     *      </div>
     *
     * @param {number} n number of items to get
     * @param {any[]} val The array model variable.
     * @returns {any} first element of the array
     */
    first: function (n, val) {
        var parsed = parseLimitArgs.apply(null, arguments);
        var stripped = parsed.input.slice(0, parsed.limit || 1);
        if (stripped.length <= 1) {
            return stripped[0];
        }
        return stripped;
    },

    /**
     * Select only the previous (second to last) element of the array.
     *
     * **Example**
     *
     *      <div>
     *          Last year we had <span data-f-bind="Sales | previous"></span> in sales.
     *      </div>
     *
     * @param {any[]} val The array model variable.
     * @returns {any} the previous (second to last) element of the array.
     */
    previous: function (val) {
        val = [].concat(val);
        return val.length <= 1 ? val[0] : val[val.length - 2];
    },

    /**
     * Returns length of array
     *
     * **Example**
     * Total Items: <h6 data-f-bind="items | size"></h6>
     * 
     * @param  {any[]} src array
     * @returns {number}     length of array
     */
    size: function (src) {
        return [].concat(src).length;
    },

    /**
     * Select every nth item from array
     *
     * **Example**
     * <!-- select every 10th item starting from itself
     * <ul data-f-foreach="Time | pickEvery(10)"><li></li></ul>
     * <!-- select every 10th item starting from the fifth
     * <ul data-f-foreach="Time | pickEvery(10, 5)"><li></li></ul>
     * 
     * @param  {number} n          nth item to select
     * @param  {number} [startIndex] index to start from
     * @param  {any[]} [val]        source array
     * @returns {any[]}            shortened array
     */
    pickEvery: function (n, startIndex, val) {
        if (arguments.length === 3) {
            //eslint-disable-line
            //last item is match string
            val = startIndex;
            startIndex = 0;
        }
        val = [].concat(val);
        val = val.slice(startIndex);
        return val.filter(function (item, index) {
            return index % n === 0;
        });
    }
};

var mapped = Object.keys(list).map(function (alias) {
    var fn = list[alias];
    var newfn = function () {
        var args = _.toArray(arguments);
        var indexOfActualValue = args.length - 2; //last item is the matchstring
        var val = args[indexOfActualValue];
        if ($.isPlainObject(val)) {
            return Object.keys(val).reduce(function (accum, key) {
                var arr = val[key];
                var newArgs = args.slice();
                newArgs[indexOfActualValue] = arr;
                accum[key] = fn.apply(fn, newArgs);
                return accum;
            }, {});
        }
        return fn.apply(fn, arguments);
    };
    return {
        alias: alias,
        acceptList: true,
        convert: newfn
    };
});
module.exports = mapped;

/***/ }),
/* 28 */
/***/ (function(module, exports) {

function parseArgs(toCompare, trueVal, falseVal, valueToCompare, matchString) {
    var toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 5:
            //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: valueToCompare });
        case 4:
            //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: falseVal });
        case 3:
            //eslint-disable-line
            return $.extend(toReturn, { input: trueVal, falseVal: trueVal });
        default:
            return toReturn;
    }
}

module.exports = [{
    alias: 'is',
    acceptList: false,
    convert: function (toCompare) {
        var args = parseArgs.apply(null, arguments);
        return args.input === toCompare ? args.trueVal : args.falseVal;
    }
}];

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

var _require = __webpack_require__(0),
    isString = _require.isString,
    isNumber = _require.isNumber;

function isAllowedLeading(str) {
    var validPrefixes = ['₹', '$', '£', '¥', '±', '’', '¢', '€'];
    return validPrefixes.indexOf(str.trim()) !== -1;
}

module.exports = {
    /**
     * @param {string} name
     * @returns {boolean}
     */
    alias: function (name) {
        /**
         * @param {string} v
         * @returns {boolean}
         */
        function checkValMatch(v) {
            var validStandalone = ['#', '0', '%'];
            if (v.length === 1) {
                return validStandalone.indexOf(v) !== -1;
            }

            var validFirstChars = ['s', '#', '0', '.'];
            var validLastChars = ['%', '#', '0'];

            if (isAllowedLeading(v.charAt(0))) {
                v = v.slice(1);
            }
            var isValidFirstChar = validFirstChars.indexOf(v.charAt(0)) !== -1;
            var isValidLastChar = validLastChars.indexOf(v.charAt(v.length - 1)) !== -1;

            if (v.length === 2) {
                return isValidFirstChar && isValidLastChar;
            }

            var validRemainingChars = ['#', '0', '.', ','];
            var areRemainingCharactersValid = v.substr(1, v.length - 2).split('').reduce(function (accum, char) {
                var isMatch = validRemainingChars.indexOf(char) !== -1;
                if (!isMatch) {
                    accum = false;
                }
                return accum;
            }, true);

            return isValidFirstChar && isValidLastChar && areRemainingCharactersValid;
        }

        var parts = name.split(' ');
        if (parts.length === 3) {
            return checkValMatch(parts[1]); //prefix and suffix
        } else if (parts.length === 1) {
            return checkValMatch(parts[0]); //just the number
        } else if (parts.length === 2) {
            return checkValMatch(parts[0]) || checkValMatch(parts[1]); //either prefix or suffix
        }
        return false;
    },

    /**
     * @param {string} val
     * @returns {number}
     */
    parse: function (val) {
        val += '';
        var isNegative = val.charAt(0) === '-';

        val = val.replace(/,/g, '');
        var floatMatcher = /([-+]?[0-9]*\.?[0-9]+)(K?M?B?%?)/i;
        var results = floatMatcher.exec(val);
        var number;
        var suffix = '';
        if (results && results[1]) {
            number = results[1];
        }
        if (results && results[2]) {
            suffix = results[2].toLowerCase();
        }

        /*eslint no-magic-numbers: 0 complexity: 0 */
        switch (suffix) {
            case '%':
                number = number / 100;
                break;
            case 'k':
                number = number * 1000;
                break;
            case 'm':
                number = number * 1000000;
                break;
            case 'b':
                number = number * 1000000000;
                break;
            default:
        }
        number = parseFloat(number);
        if (isNegative && number > 0) {
            number = number * -1;
        }
        return number;
    },

    convert: function (value) {
        var scales = ['', 'K', 'M', 'B', 'T'];
        function roundTo(value, digits) {
            return Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
        }

        function getDigits(value, digits) {
            value = value === 0 ? 0 : roundTo(value, Math.max(0, digits - Math.ceil(Math.log(value) / Math.LN10)));

            var TXT = '';
            var numberTXT = value.toString();
            var decimalSet = false;

            for (var iTXT = 0; iTXT < numberTXT.length; iTXT++) {
                TXT += numberTXT.charAt(iTXT);
                if (numberTXT.charAt(iTXT) === '.') {
                    decimalSet = true;
                } else {
                    digits--;
                }

                if (digits <= 0) {
                    return TXT;
                }
            }

            if (!decimalSet) {
                TXT += '.';
            }
            while (digits > 0) {
                TXT += '0';
                digits--;
            }
            return TXT;
        }

        function addDecimals(value, decimals, minDecimals, hasCommas) {
            hasCommas = !!hasCommas;
            var numberTXT = value.toString();
            var hasDecimals = numberTXT.split('.').length > 1;
            var iDec = 0;

            if (hasCommas) {
                for (var iChar = numberTXT.length - 1; iChar > 0; iChar--) {
                    if (hasDecimals) {
                        hasDecimals = numberTXT.charAt(iChar) !== '.';
                    } else {
                        iDec = (iDec + 1) % 3;
                        if (iDec === 0) {
                            numberTXT = numberTXT.substr(0, iChar) + ',' + numberTXT.substr(iChar);
                        }
                    }
                }
            }
            if (decimals > 0) {
                var toADD;
                if (numberTXT.split('.').length <= 1) {
                    toADD = minDecimals;
                    if (toADD > 0) {
                        numberTXT += '.';
                    }
                } else {
                    toADD = minDecimals - numberTXT.split('.')[1].length;
                }

                while (toADD > 0) {
                    numberTXT += '0';
                    toADD--;
                }
            }
            return numberTXT;
        }

        function getSuffix(formatTXT) {
            formatTXT = formatTXT.replace('.', '');
            var fixesTXT = formatTXT.split(new RegExp('[0|,|#]+', 'g'));
            return fixesTXT.length > 1 ? fixesTXT[1].toString() : '';
        }

        function format(number, formatTXT) {
            // eslint-disable-line
            if (Array.isArray(number)) {
                number = number[number.length - 1];
            }
            if (!isString(number) && !isNumber(number)) {
                return number;
            }

            if (!formatTXT || formatTXT.toLowerCase() === 'default') {
                return number.toString();
            }

            if (isNaN(number)) {
                return '?';
            }

            //var formatTXT;
            var entityCodeMapping = {
                '&euro;': '€',
                '&dollar;': '$',
                '&cent;': '¢',
                '&pound;': '£',
                '&yen;': '¥'
            };
            Object.keys(entityCodeMapping).forEach(function (code) {
                formatTXT = formatTXT.replace(code, entityCodeMapping[code]);
            });

            // Divide +/- Number Format
            var formats = formatTXT.split(';');
            if (formats.length > 1) {
                return format(Math.abs(number), formats[number >= 0 ? 0 : 1]);
            }

            // Save Sign
            var sign = number >= 0 ? '' : '-';
            number = Math.abs(number);

            var leftOfDecimal = formatTXT;
            var d = leftOfDecimal.indexOf('.');
            if (d > -1) {
                leftOfDecimal = leftOfDecimal.substring(0, d);
            }

            var normalized = leftOfDecimal.toLowerCase();
            var index = normalized.lastIndexOf('s');
            var isShortFormat = index > -1;

            if (isShortFormat) {
                var nextChar = leftOfDecimal.charAt(index + 1);
                if (nextChar === ' ') {
                    isShortFormat = false;
                }
            }

            var leadingText = isShortFormat ? formatTXT.substring(0, index) : '';
            var rightOfPrefix = isShortFormat ? formatTXT.substr(index + 1) : formatTXT.substr(index);

            //first check to make sure 's' is actually short format and not part of some leading text
            if (isShortFormat) {
                var shortFormatTest = /[0-9#*]/;
                var shortFormatTestResult = rightOfPrefix.match(shortFormatTest);
                if (!shortFormatTestResult || shortFormatTestResult.length === 0) {
                    //no short format characters so this must be leading text ie. 'weeks '
                    isShortFormat = false;
                    leadingText = '';
                }
            }

            //if (formatTXT.charAt(0) == 's')
            if (isShortFormat) {
                var valScale = number === 0 ? 0 : Math.floor(Math.log(Math.abs(number)) / (3 * Math.LN10));
                valScale = number / Math.pow(10, 3 * valScale) < 1000 ? valScale : valScale + 1;
                valScale = Math.max(valScale, 0);
                valScale = Math.min(valScale, 4);
                number = number / Math.pow(10, 3 * valScale);
                //if (!isNaN(Number(formatTXT.substr(1) ) ) )

                if (!isNaN(Number(rightOfPrefix)) && rightOfPrefix.indexOf('.') === -1) {
                    var limitDigits = Number(rightOfPrefix);
                    if (number < Math.pow(10, limitDigits)) {
                        if (isAllowedLeading(leadingText)) {
                            return sign + leadingText + getDigits(number, Number(rightOfPrefix)) + scales[valScale];
                        } else {
                            return leadingText + sign + getDigits(number, Number(rightOfPrefix)) + scales[valScale];
                        }
                    } else if (isAllowedLeading(leadingText)) {
                        return sign + leadingText + Math.round(number) + scales[valScale];
                    } else {
                        return leadingText + sign + Math.round(number) + scales[valScale];
                    }
                } else {
                    //formatTXT = formatTXT.substr(1);
                    formatTXT = formatTXT.substr(index + 1);
                    var SUFFIX = getSuffix(formatTXT);
                    formatTXT = formatTXT.substr(0, formatTXT.length - SUFFIX.length);

                    var valWithoutLeading = format((sign === '' ? 1 : -1) * number, formatTXT) + scales[valScale] + SUFFIX;
                    if (isAllowedLeading(leadingText) && sign !== '') {
                        valWithoutLeading = valWithoutLeading.substr(sign.length);
                        return sign + leadingText + valWithoutLeading;
                    }

                    return leadingText + valWithoutLeading;
                }
            }

            var subFormats = formatTXT.split('.');
            var decimals;
            var minDecimals;
            if (subFormats.length > 1) {
                decimals = subFormats[1].length - subFormats[1].replace(new RegExp('[0|#]+', 'g'), '').length;
                minDecimals = subFormats[1].length - subFormats[1].replace(new RegExp('0+', 'g'), '').length;
                formatTXT = subFormats[0] + subFormats[1].replace(new RegExp('[0|#]+', 'g'), '');
            } else {
                decimals = 0;
            }

            var fixesTXT = formatTXT.split(new RegExp('[0|,|#]+', 'g'));
            var preffix = fixesTXT[0].toString();
            var suffix = fixesTXT.length > 1 ? fixesTXT[1].toString() : '';

            number = number * (formatTXT.split('%').length > 1 ? 100 : 1);
            //            if (formatTXT.indexOf('%') !== -1) number = number * 100;
            number = roundTo(number, decimals);

            sign = number === 0 ? '' : sign;

            var hasCommas = formatTXT.substr(formatTXT.length - 4 - suffix.length, 1) === ',';
            var formatted = sign + preffix + addDecimals(number, decimals, minDecimals, hasCommas) + suffix;

            //  console.log(originalNumber, originalFormat, formatted)
            return formatted;
        }

        return format;
    }()
};

/***/ }),
/* 30 */
/***/ (function(module, exports) {

function parseArgs(limit, trueVal, falseVal, valueToCompare, matchString) {
    var toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 5:
            //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: valueToCompare });
        case 4:
            //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: falseVal });
        case 3:
            //eslint-disable-line
            return $.extend(toReturn, { input: trueVal, falseVal: trueVal });
        default:
            return toReturn;
    }
}
module.exports = {
    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is greater than the limit.
     *
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | greaterThan(50)"></span> 
     *
     *          <!-- displays custom text -->
     *          <span data-f-bind="widgets | greaterThan(50, 'Congratulations!', 'Better luck next year')"></span>
     *      </div>
     *
     * @param {number} limit The reference value to compare the model variable against.
     * @param {string} trueVal (Optional) The format (value) to display if the model variable is greater than `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {string} falseVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @returns {*} If the model variable is greater than `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    greaterThan: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) > Number(limit) ? args.trueVal : args.falseVal;
    },

    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is greater than or equal to the limit.
     *
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | greaterThan(50)"></span> 
     *
     *          <!-- displays custom text -->
     *          <span data-f-bind="widgets | greaterThan(50, 'Congratulations!', 'Better luck next year')"></span>
     *      </div>
     *
     * @param {number} limit The reference value to compare the model variable against.
     * @param {string} trueVal (Optional) The format (value) to display if the model variable is greater than or equal to `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {string} falseVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @returns {*} If the model variable is greater than or equal to `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    greaterThanEqual: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) >= Number(limit) ? args.trueVal : args.falseVal;
    },

    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is equal to the limit.
     *
     * 
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | equalsNumber(50)"></span> 
     *
     *          <!-- display custom text -->
     *          <span data-f-bind="widgets | equalsNumber(50, 'Met the goal exactly!', 'Not an exact match')"></span>
     *      </div>
     *
     * @param {number} limit The reference value to compare the model variable against.
     * @param {string} trueVal (Optional) The format (value) to display if the model variable is equal to `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {string} falseVal (Optional) The format (value) to display if the model variable is not equal to `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @returns {*} If the model variable equals `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    equalsNumber: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) === Number(limit) ? args.trueVal : args.falseVal;
    },

    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is less than the limit.
     *
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | lessThan(50)"></span> 
     *
     *          <!-- display custom text -->
     *          <span data-f-bind="widgets | lessThan(50, 'Oops didn't make quite enough!', 'Built a lot of widgets this year!')"></span>
     *      </div>
     *
     * @param {number} limit The reference value to compare the model variable against.
     * @param {string} trueVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {string} falseVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @returns {*} If the model variable is less than `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    lessThan: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) < Number(limit) ? args.trueVal : args.falseVal;
    },

    /**
     * Convert the model variable to true, or other values passed to the converter, based on whether the model variable is less than or equal to the limit.
     *
     * **Example**
     *
     *      <div>
     *          <!-- displays true or the number of widgets -->
     *          <span data-f-bind="widgets | lessThanEqual(50)"></span> 
     *
     *          <!-- display custom text -->
     *          <span data-f-bind="widgets | lessThanEqual(50, 'Oops didn't make quite enough!', 'Built a lot of widgets this year!')"></span>
     *      </div>
     *
     * @param {number} limit The reference value to compare the model variable against.
     * @param {string} trueVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {string} falseVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @returns {*} If the model variable is less than or equal to `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    lessThanEqual: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) <= Number(limit) ? args.trueVal : args.falseVal;
    }
};

/***/ }),
/* 31 */
/***/ (function(module, exports) {

function parseArgs(trueVal, falseVal, input, matchString) {
    var toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 4:
            //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: input });
        case 3:
            //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: falseVal });
        default:
            return toReturn;
    }
}

module.exports = {
    /**
     * Convert 'truthy' values to true and 'falsy' values to false.
     *
     * **Example**
     *
     *      <!-- displays "true" or "false" -->
     *      <!-- in particular, true if sampleVar is truthy (1, true, 'some string', [] etc.), 
     *            false if sampleVar is falsy (0, false, '') -->
     *      <span data-f-bind="sampleVar | toBool"></span>
     * 
     * @param {Any} value
     * @returns {boolean}
     */
    toBool: function (value) {
        return !!value;
    },

    /**
     * Converts values to boolean and negates.
     *
     * **Example**
     *
     *      <!-- disables input if isGameInProgress is false -->
     *      <input type="text" data-f-disabled="isGameInProgress | not" />
     * 
     * @param {Any} value
     * @returns {boolean}
     */
    not: function (value) {
        return !value;
    },

    /**
     * Convert the input to a new value (for example, some text), based on whether it is true or false.
     *
     * **Example**
     *
     *      <div>
     *          <span data-f-bind="sampleVar | ifTrue('yes! please move forward', 'not ready to proceed')"></span> 
     *          <span data-f-bind="sampleVar | ifTrue('yes! please move forward')"></span>
     *      </div>
     *
     * @param {string} trueVal The value to display if the input is true. If there are commas in this argument, they must be escaped with `\`.
     * @param {string} falseVal (Optional) The value to display if the input is false. If not included, returns the input. If there are commas in this argument, they must be escaped with `\`.
     * @param {Any} input (Optional) The input to test. If not included, the output of the previous argument is used.
     * @returns {Any} If input is true, returns trueVal. If input is false, returns falseVal if provided, or echoes the input.
     */
    ifTrue: function () {
        var args = parseArgs.apply(null, arguments);
        return args.input ? args.trueVal : args.falseVal;
    },
    /**
     * Convert the input to a new value (for example, some text), based on whether it is false or true.
     *
     * **Example**
     *
     *      <div>
     *          <span data-f-bind="sampleVar | ifFalse('not ready to proceed', 'actually this is still true')"></span> 
     *          <span data-f-bind="sampleVar | ifFalse('not ready to proceed')"></span>
     *      </div>
     *
     * @param {string} trueVal The value to display if the input is false. If there are commas in this argument, they must be escaped with `\`.
     * @param {string} falseVal (Optional) The value to display if the input is true. If not included, returns the input. If there are commas in this argument, they must be escaped with `\`.
     * @param {Any} input (Optional) The input to test. If not included, the output of the previous argument is used.
     * @returns {Any} If input is false, returns trueVal. If input is true, returns falseVal if provided, or echoes the input.
     */
    ifFalse: function () {
        var args = parseArgs.apply(null, arguments);
        return !args.input ? args.trueVal : args.falseVal;
    }
};

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

var _ = __webpack_require__(0);

var list = {
    /**
     * Returns all values in array matching argument
     *
     * ** Example **
     * <!-- list online users -->
     * <ul data-f-foreach="users | filter(isOnline)"><li></li></button>
     * 
     * @param  {string|number|boolean} valueToFilterBy value to reject
     * @param  {any[]} source The arrayed model variable
     * @returns {any[]}     filtered lsit
     */
    filter: function (valueToFilterBy, source) {
        source = [].concat(source);
        if ($.isPlainObject(source[0])) {
            return _.filter(source, valueToFilterBy);
        }
        return source.filter(function (v) {
            return v === valueToFilterBy;
        });
    },

    /**
     * Returns all values in array excluding match
     *
     * ** Example **
     * <!-- list offline users -->
     * <ul data-f-foreach="users | except(isOnline)"><li></li></button>
     * 
     * @param  {string|number|boolean} valueToReject value to reject
     * @param  {any[]} source The arrayed model variable
     * @returns {any[]}     filtered lsit
     */
    except: function (valueToReject, source) {
        source = [].concat(source);
        if ($.isPlainObject(source[0])) {
            return _.reject(source, valueToReject);
        }
        return source.filter(function (v) {
            return v !== valueToReject;
        });
    },

    /**
     * Checks if array contains *any* item passing the test
     *
     * ** Example **
     * <!-- hides button if any of the users are not online -->
     * <button data-f-hideif="users | any(isOnline) | not">Get Started</button>
     * <button data-f-hideif="users | any({ isOnline: false })">Get Started</button>
     * 
     * @param  {string|Object} value value to check for
     * @param  {any[]} source The arrayed model variable
     * @returns {boolean}     True if match found in array
     */
    any: function (value, source) {
        source = [].concat(source);
        if ($.isPlainObject(source[0])) {
            return _.some(source, value);
        }
        return source.indexOf(value) !== -1;
    },

    /**
     * Checks if *every* item in the array passes the test
     *
     * ** Example **
     * <!-- shows button if any of the users are not online -->
     * <button data-f-showif="users | every(isOnline)">Get Started</button>
     * 
     * @param  {string|Object} value value to check for
     * @param  {any[]} source The arrayed model variable
     * @returns {boolean}     True if match found in array
     */
    every: function (value, source) {
        source = [].concat(source);
        if ($.isPlainObject(source[0])) {
            return _.every(source, value);
        }
        return source.filter(function (v) {
            return v === value;
        }).length === source.length;
    }
};
var converters = Object.keys(list).map(function (name) {
    return {
        alias: name,
        acceptList: true,
        convert: list[name]
    };
});

module.exports = converters;

/***/ }),
/* 33 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);

/**
 * @typedef NodeHandler
 * @property {string} selector
 * @property {Function} handle
 */

/**
 * @param {string | undefined} selector
 * @param {Function | NodeHandler } handler
 * @returns {NodeHandler}
 */
var normalize = function (selector, handler) {
    if (!selector) {
        selector = '*';
    }
    if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(handler)) {
        handler = {
            selector: selector,
            handle: handler
        };
    }

    handler.selector = selector;
    return handler;
};

/**
 * @param {string|HTMLElement|JQuery<HTMLElement>} toMatch
 * @param { {selector:string} } node
 * @returns {boolean}
 */
var match = function (toMatch, node) {
    if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isString"])(toMatch)) {
        return toMatch === node.selector;
    }
    return $(toMatch).is(node.selector);
};

var nodeManager = {
    list: [],

    /**
     * Add a new node handler
     * @param  {string} selector jQuery-compatible selector to use to match nodes
     * @param  {Function} handler  Handlers are new-able functions. They will be called with $el as context.? TODO: Think this through
     * @returns {void}
     */
    register: function (selector, handler) {
        this.list.unshift(normalize(selector, handler));
    },

    /**
     * @param {string|HTMLElement|JQuery<HTMLElement>} selector
     * @returns NodeHandler
     */
    getHandler: function (selector) {
        return this.list.find(function (node) {
            return match(selector, node);
        });
    },

    replace: function (selector, handler) {
        var index = void 0;
        this.list.forEach(function (currentHandler, i) {
            if (selector === currentHandler.selector) {
                index = i;
                return false;
            }
        });
        this.list.splice(index, 1, normalize(selector, handler));
    }
};

//bootstraps
var defaultHandlers = [__webpack_require__(34).default, __webpack_require__(11).default, __webpack_require__(12)];
defaultHandlers.reverse().forEach(function (handler) {
    nodeManager.register(handler.selector, handler);
});

/* harmony default export */ __webpack_exports__["a"] = (nodeManager);

/***/ }),
/* 34 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__default_input_node__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_config__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_config___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_config__);



var offAttr = __WEBPACK_IMPORTED_MODULE_1_config___default.a.attrs.checkboxOffValue;

/* harmony default export */ __webpack_exports__["default"] = (__WEBPACK_IMPORTED_MODULE_0__default_input_node__["default"].extend({
    propertyHandlers: [],

    getUIValue: function () {
        var $el = this.$el;
        var offAttrVal = $el.attr(offAttr);
        var offVal = offAttrVal && typeof offAttrVal !== 'undefined' ? offAttrVal : false;

        var onAttrVal = $el.attr('value');
        //attr = initial value, prop = current value
        var onVal = onAttrVal && typeof onAttrVal !== 'undefined' ? $el.prop('value') : true;

        var val = $el.is(':checked') ? onVal : offVal;
        return val;
    },
    initialize: function () {
        __WEBPACK_IMPORTED_MODULE_0__default_input_node__["default"].prototype.initialize.apply(this, arguments);
    }
}, { selector: ':checkbox,:radio' }));

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

var _require = __webpack_require__(0),
    extend = _require.extend,
    has = _require.has;

var extendView = function (protoProps, staticProps) {
    var me = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && has(protoProps, 'constructor')) {
        child = protoProps.constructor;
    } else {
        child = function () {
            return me.apply(this, arguments);
        };
    }

    // Add static properties to the constructor function, if supplied.
    extend(child, me, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function () {
        this.constructor = child;
    };
    Surrogate.prototype = me.prototype;
    child.prototype = new Surrogate();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) {
        extend(child.prototype, protoProps);
    }

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = me.prototype; //eslint-disable-line no-underscore-dangle

    return child;
};

var View = function (options) {
    this.$el = options.$el || $(options.el);
    this.el = options.el;
    this.initialize.apply(this, arguments);
};
extend(View.prototype, {
    initialize: function () {}
});

View.extend = extendView;

module.exports = View;

/***/ }),
/* 36 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


var defaultHandlers = [__webpack_require__(37).default, __webpack_require__(38).default, __webpack_require__(39).default, __webpack_require__(40).default, __webpack_require__(42).default, __webpack_require__(43).default, __webpack_require__(44).default, __webpack_require__(45).default, __webpack_require__(46).default, __webpack_require__(47).default, __webpack_require__(48).default, __webpack_require__(50).default];

var handlersList = [];

var normalize = function (attributeMatcher, nodeMatcher, handler) {
    if (!nodeMatcher) {
        nodeMatcher = '*';
    }
    if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(handler)) {
        handler = {
            handle: handler
        };
    }
    return $.extend(handler, { test: attributeMatcher, target: nodeMatcher });
};

defaultHandlers.forEach(function (handler) {
    handlersList.push(normalize(handler.test, handler.target, handler));
});

var matchAttr = function (matchExpr, attr, $el) {
    var attrMatch = void 0;

    if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isString"])(matchExpr)) {
        attrMatch = matchExpr === '*' || matchExpr.toLowerCase() === attr.toLowerCase();
    } else if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(matchExpr)) {
        //TODO: remove element selectors from attributes
        attrMatch = matchExpr(attr, $el);
    } else if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isRegExp"])(matchExpr)) {
        attrMatch = attr.match(matchExpr);
    }
    return attrMatch;
};

var matchNode = function (target, nodeFilter) {
    return Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isString"])(nodeFilter) ? nodeFilter === target : nodeFilter.is(target);
};

var attributeManager = {
    list: handlersList,
    /**
     * Add a new attribute handler.
     *
     * @param  {string|Function|RegExp} attributeMatcher Description of which attributes to match.
     * @param  {string|JQuery<HTMLElement>} nodeMatcher Which nodes to add attributes to. Use [jquery Selector syntax](https://api.jquery.com/category/selectors/).
     * @param  {Function|Object} handler If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
     * @returns {void}
     */
    register: function (attributeMatcher, nodeMatcher, handler) {
        handlersList.unshift(normalize.apply(null, arguments));
    },

    /**
     * Find an attribute matcher matching some criteria.
     *
     * @param  {string} attrFilter Attribute to match.
     * @param  {string|JQuery<HTMLElement>} nodeFilter Node to match.
     *
     * @returns {AttributeHandler[]} An array of matching attribute handlers, or null if no matches found.
     */
    filter: function (attrFilter, nodeFilter) {
        var filtered = handlersList.filter(function (handler) {
            return matchAttr(handler.test, attrFilter);
        });
        if (nodeFilter) {
            filtered = filtered.filter(function (handler) {
                return matchNode(handler.target, nodeFilter);
            });
        }
        return filtered;
    },

    /**
     * Replace an existing attribute handler.
     *
     * @param  {string} attrFilter Attribute to match.
     * @param  {string|JQuery<HTMLElement>} nodeFilter Node to match.
     * @param  {Function|Object} handler The updated attribute handler. If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
     * @returns {void}
     */
    replace: function (attrFilter, nodeFilter, handler) {
        var index = void 0;
        Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["each"])(handlersList, function (currentHandler, i) {
            if (matchAttr(currentHandler.test, attrFilter) && matchNode(currentHandler.target, nodeFilter)) {
                index = i;
                return false;
            }
        });
        handlersList.splice(index, 1, normalize(attrFilter, nodeFilter, handler));
    },

    /**
     *  Retrieve the appropriate handler for a particular attribute. There may be multiple matching handlers, but the first (most exact) match is always used.
     *
     * @param {string} attr The attribute.
     * @param {string|JQuery<HTMLElement>} $el The DOM element.
     *
     * @returns {AttributeHandler|undefined} The attribute handler, if a matching one is found
     */
    getHandler: function (attr, $el) {
        var filtered = this.filter(attr, $el);
        //There could be multiple matches, but the top first has the most priority
        return filtered[0];
    }
};

/* harmony default export */ __webpack_exports__["a"] = (attributeManager);

/***/ }),
/* 37 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/**
 * @type AttributeHandler 
 */
var noopAttr = {

    target: '*',

    test: /^(?:model|convert|channel|on-init)/i,

    handle: function () {},
    parse: function () {
        return [];
    }
};

/* harmony default export */ __webpack_exports__["default"] = (noopAttr);

/***/ }),
/* 38 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_config__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_config___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_config__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_utils_parse_utils__ = __webpack_require__(5);



function eventNameFromAttr(attr) {
    var eventName = attr.replace('on-', '');
    var nameSpacedEvent = eventName + '.f-event';
    return nameSpacedEvent;
}
/**
 * @type AttributeHandler 
 */
var defaultEventAttr = {

    target: '*',

    test: function (attr) {
        return attr.indexOf('on-') === 0;
    },

    unbind: function (attr, $el) {
        var eventName = eventNameFromAttr(attr);
        $el.off(eventName);
    },

    parse: function () {
        return [];
    }, //There's nothing to subscribe to on an event
    handle: function () {},

    init: function (attr, topics, $el) {
        var matching = topics[0] && topics[0].name; //multiple topics aren't really relevant here
        var eventName = eventNameFromAttr(attr);
        $el.off(eventName).on(eventName, function (evt) {
            evt.preventDefault();
            var listOfOperations = Object(__WEBPACK_IMPORTED_MODULE_1_utils_parse_utils__["c" /* toPublishableFormat */])(matching);
            $el.trigger(__WEBPACK_IMPORTED_MODULE_0_config__["events"].trigger, { data: listOfOperations, source: attr });
        });
    }
};

/* harmony default export */ __webpack_exports__["default"] = (defaultEventAttr);

/***/ }),
/* 39 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_parse_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_config__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_config___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_config__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__loop_attr_utils__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_utils_animation__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_4_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__ = __webpack_require__(10);
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }










var elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

/**
 * @type AttributeHandler
 */
var foreachAttr = {

    test: 'foreach',

    target: '*',

    unbind: function (attr, $el) {
        var el = $el.get(0);
        elAnimatedMap.delete(el);

        var template = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["e" /* getOriginalContents */])($el);
        var current = $el.html();
        if (template && current !== template) {
            $el.html(template);
        }
        Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["b" /* clearOriginalContents */])($el);
        Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["g" /* removeKnownData */])($el);
    },

    parse: function (topics) {
        return Object(__WEBPACK_IMPORTED_MODULE_2__loop_attr_utils__["b" /* parseTopics */])(topics);
    },

    handle: function (value, prop, $el, topics) {
        value = $.isPlainObject(value) ? value : [].concat(value);

        var _aliasesFromTopics = Object(__WEBPACK_IMPORTED_MODULE_2__loop_attr_utils__["a" /* aliasesFromTopics */])(topics, value),
            keyAlias = _aliasesFromTopics.keyAlias,
            valueAlias = _aliasesFromTopics.valueAlias;

        var originalHTML = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["e" /* getOriginalContents */])($el, function ($el) {
            return $el.html();
        });
        var knownData = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["d" /* getKnownDataForEl */])($el);
        var missingReferences = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["c" /* findMissingReferences */])(originalHTML, [keyAlias, valueAlias].concat(Object.keys(knownData)));
        var stubbedTemplate = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["h" /* stubMissingReferences */])(originalHTML, missingReferences);

        var templateFn = Object(__WEBPACK_IMPORTED_MODULE_4_lodash__["template"])(stubbedTemplate);
        var $dummyEl = $('<div></div>');
        Object(__WEBPACK_IMPORTED_MODULE_4_lodash__["each"])(value, function (dataval, datakey) {
            var _$$extend;

            if (dataval === undefined || dataval === null) {
                dataval = dataval + ''; //convert undefineds to strings
            }
            var templateData = $.extend(true, {}, knownData, (_$$extend = {}, _defineProperty(_$$extend, keyAlias, datakey), _defineProperty(_$$extend, valueAlias, dataval), _$$extend));

            var nodes = void 0;
            var isTemplated = void 0;
            try {
                var templated = templateFn(templateData);
                var templatedWithReferences = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["a" /* addBackMissingReferences */])(templated, missingReferences);
                isTemplated = templatedWithReferences !== stubbedTemplate;
                nodes = $(templatedWithReferences);
            } catch (e) {
                //you don't have all the references you need;
                nodes = $(stubbedTemplate);
                isTemplated = true;
                Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["i" /* updateKnownDataForEl */])($(nodes), templateData);
            }

            nodes.each(function (i, newNode) {
                var $newNode = $(newNode);
                Object(__WEBPACK_IMPORTED_MODULE_4_lodash__["each"])($newNode.data(), function (val, key) {
                    $newNode.data(key, Object(__WEBPACK_IMPORTED_MODULE_0_utils_parse_utils__["b" /* toImplicitType */])(val));
                });
                if (!isTemplated && !$newNode.html().trim()) {
                    $newNode.html(dataval);
                }
            });
            $dummyEl.append(nodes);
        });

        var el = $el.get(0);
        var isInitialAnim = !elAnimatedMap.get(el);
        var $withAnimAttrs = Object(__WEBPACK_IMPORTED_MODULE_3_utils_animation__["a" /* addChangeClassesToList */])($el.children(), $dummyEl.children(), isInitialAnim, __WEBPACK_IMPORTED_MODULE_1_config__["animation"]);
        $el.empty().append($withAnimAttrs);

        elAnimatedMap.set(el, true);
    }
};

/* harmony default export */ __webpack_exports__["default"] = (foreachAttr);

/***/ }),
/* 40 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_utils_parse_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_utils_general__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_config__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_config___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_config__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_utils_animation__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__loop_attr_utils__ = __webpack_require__(13);
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }






var templateIdAttr = __WEBPACK_IMPORTED_MODULE_3_config__["attrs"].repeat.templateId;



var elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value





/**
 * @type AttributeHandler 
 */
var loopAttrHandler = {
    test: 'repeat',

    target: '*',

    unbind: function (attr, $el) {
        var id = $el.data(templateIdAttr);
        if (id) {
            $el.nextUntil(':not([data-' + id + '])').remove();
            // $el.removeAttr('data-' + templateIdAttr); //FIXME: Something about calling rebind multiple times in IB makes this happen without the removal
        }

        var el = $el.get(0);
        elAnimatedMap.delete(el);

        var originalHTML = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["e" /* getOriginalContents */])($el);
        var current = $el.get(0).outerHTML;
        if (originalHTML && current !== originalHTML) {
            $el.replaceWith(originalHTML);
        }
        Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["b" /* clearOriginalContents */])($el);
        Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["g" /* removeKnownData */])($el);
    },

    parse: function (topics) {
        return Object(__WEBPACK_IMPORTED_MODULE_6__loop_attr_utils__["b" /* parseTopics */])(topics);
    },

    init: function (attr, value, $el) {},

    handle: function (value, prop, $el, topics) {
        value = $.isPlainObject(value) ? value : [].concat(value);
        var id = $el.data(templateIdAttr);

        $el.removeAttr('hidden');
        var originalHTML = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["e" /* getOriginalContents */])($el, function ($el) {
            return $el.get(0).outerHTML;
        });

        var $dummyOldDiv = $('<div></div>');
        if (id) {
            var $removed = $el.nextUntil(':not([data-' + id + '])').remove();
            $dummyOldDiv.append($removed);
        } else {
            id = Object(__WEBPACK_IMPORTED_MODULE_2_utils_general__["c" /* random */])('repeat-');
            $el.attr('data-' + templateIdAttr, id);
        }

        var _aliasesFromTopics = Object(__WEBPACK_IMPORTED_MODULE_6__loop_attr_utils__["a" /* aliasesFromTopics */])(topics, value),
            keyAlias = _aliasesFromTopics.keyAlias,
            valueAlias = _aliasesFromTopics.valueAlias;

        var knownData = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["d" /* getKnownDataForEl */])($el);
        var missingReferences = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["c" /* findMissingReferences */])(originalHTML, [keyAlias, valueAlias].concat(Object.keys(knownData)));
        var stubbedTemplate = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["h" /* stubMissingReferences */])(originalHTML, missingReferences);

        if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isEmpty"])(value)) {
            $el.attr('hidden', true); //There's always going to be 1 el otherwise
            return;
        }

        var templateFn = Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["template"])(stubbedTemplate);
        var last = void 0;
        Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["each"])(value, function (dataval, datakey) {
            var _$$extend;

            if (dataval === undefined || dataval === null) {
                dataval = dataval + ''; //convert undefineds to strings
            }
            var templateData = $.extend(true, {}, knownData, (_$$extend = {}, _defineProperty(_$$extend, keyAlias, datakey), _defineProperty(_$$extend, valueAlias, dataval), _$$extend));

            var nodes = void 0;
            var isTemplated = void 0;
            try {
                var templated = templateFn(templateData);
                var templatedWithReferences = Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["a" /* addBackMissingReferences */])(templated, missingReferences);
                isTemplated = templatedWithReferences !== stubbedTemplate;
                nodes = $(templatedWithReferences);
            } catch (e) {
                //you don't have all the references you need;
                nodes = $(stubbedTemplate);
                isTemplated = true;
                Object(__WEBPACK_IMPORTED_MODULE_5_dom_attribute_manager_attr_template_utils__["i" /* updateKnownDataForEl */])($(nodes), templateData);
            }

            var hasData = dataval !== null && dataval !== undefined;
            nodes.each(function (i, newNode) {
                var $newNode = $(newNode);
                $newNode.removeAttr('data-f-repeat').removeAttr('data-' + templateIdAttr);
                Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["each"])($newNode.data(), function (val, key) {
                    if (!last) {
                        $el.data(key, Object(__WEBPACK_IMPORTED_MODULE_1_utils_parse_utils__["b" /* toImplicitType */])(val));
                    } else {
                        $newNode.data(key, Object(__WEBPACK_IMPORTED_MODULE_1_utils_parse_utils__["b" /* toImplicitType */])(val));
                    }
                });
                $newNode.attr('data-' + id, true);
                if (!isTemplated && !$newNode.children().length && hasData) {
                    $newNode.html(dataval + '');
                }
            });
            if (!last) {
                last = $el.html(nodes.html());
            } else {
                last = nodes.insertAfter(last);
            }
        });

        var $newEls = $el.nextUntil(':not(\'[data-' + id + ']\')');

        var el = $el.get(0);
        var isInitialAnim = !elAnimatedMap.get(el);
        Object(__WEBPACK_IMPORTED_MODULE_4_utils_animation__["a" /* addChangeClassesToList */])($dummyOldDiv.children(), $newEls, isInitialAnim, __WEBPACK_IMPORTED_MODULE_3_config__["animation"]);

        elAnimatedMap.set(el, true);
    }
};

/* harmony default export */ __webpack_exports__["default"] = (loopAttrHandler);

/***/ }),
/* 41 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = debounceAndMerge;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__promise_utils__ = __webpack_require__(14);


function executeAndResolve(fn, args, $def) {
    var promisifiedFn = Object(__WEBPACK_IMPORTED_MODULE_0__promise_utils__["b" /* promisify */])(fn);
    return promisifiedFn.apply(fn, args).then(function (result) {
        $def.resolve(result);
    }, function (e) {
        $def.reject(e);
    });
}

/**
 * Returns debounced version of original (optionally promise returning) function
 * 
 * @param {function(*):Promise} fn function to debounce
 * @param {number} debounceInterval 
 * @param {Function[]} [argumentsReducers] pass in 1 reducer for each option your function takes
 * @returns {Function} debounced function
 */
function debounceAndMerge(fn, debounceInterval, argumentsReducers) {
    if (!argumentsReducers) {
        var arrayReducer = function (accum, newVal) {
            return (accum || []).concat(newVal);
        };
        argumentsReducers = [arrayReducer];
    }

    var queue = [];
    var timer = null;

    function mergeArgs(oldArgs, newArgs) {
        var merged = newArgs.map(function (newArg, index) {
            var reducer = argumentsReducers[index];
            if (reducer) {
                return reducer(oldArgs[index], newArg);
            }
            return newArg;
        });
        return merged;
    }

    /**
     * @returns {Promise}
     */
    return function debouncedFunction() {
        var newArgs = Array.prototype.slice.call(arguments);
        if (timer) {
            clearTimeout(timer);
            var mergedArgs = mergeArgs(queue[0].args, newArgs);
            queue[0].args = mergedArgs;
        } else {
            var args = mergeArgs([], newArgs);
            queue.push({
                $def: $.Deferred(),
                args: args
            });
        }

        timer = setTimeout(function () {
            timer = null;
            var item = queue.pop();
            executeAndResolve(fn, item.args, item.$def);
        }, debounceInterval);

        return queue[0].$def.promise();
    };
}

/***/ }),
/* 42 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


var elClassesMap = new WeakMap();
function deleteAddedClasses($el) {
    var el = $el.get(0);
    var addedClasses = elClassesMap.get(el);
    if (addedClasses) {
        $el.removeClass(addedClasses);
    }
}
/**
 * @type AttributeHandler
 */
var classAttr = {
    test: 'class',

    target: '*',

    unbind: function (attr, $el) {
        var el = $el.get(0);
        deleteAddedClasses($el);
        elClassesMap.delete(el);
    },

    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }

        var el = $el.get(0);
        deleteAddedClasses($el);

        if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isNumber"])(value)) {
            value = 'value-' + value;
        }
        setTimeout(function () {
            $el.addClass(value); //If the classes have an animation set, removing with a timeout will trigger it
        }, 0);
        elClassesMap.set(el, value);
    }
};

/* harmony default export */ __webpack_exports__["default"] = (classAttr);

/***/ }),
/* 43 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/**
 * @type AttributeHandler 
 */
var booleanAttrHandler = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped|disabled|hidden|readonly)$/i,

    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        var val = $el.attr('value') ? value == $el.prop('value') : !!value; //eslint-disable-line eqeqeq
        $el.prop(prop, val);
    }
};

/* harmony default export */ __webpack_exports__["default"] = (booleanAttrHandler);

/***/ }),
/* 44 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/**
  * @type AttributeHandler
  */
var showifHandler = {
    test: 'showif',

    target: '*',

    init: function (attr, value, $el) {
        $el.hide(); //hide by default; if not this shows text until data is fetched
    },

    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        return value && ('' + value).trim() ? $el.show() : $el.hide();
    }
};

/* harmony default export */ __webpack_exports__["default"] = (showifHandler);

/***/ }),
/* 45 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/**
  * @type AttributeHandler
  */
var hideifHandler = {
    test: 'hideif',

    target: '*',

    init: function (attr, value, $el) {
        $el.hide(); //hide by default; if not this shows text until data is fetched
    },
    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        if (value && ('' + value).trim()) {
            $el.hide();
        } else {
            $el.show();
        }
    }
};

/* harmony default export */ __webpack_exports__["default"] = (hideifHandler);

/***/ }),
/* 46 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/**
  * @type {AttributeHandler}
  */
var checkboxAttrHandler = {

    target: ':checkbox,:radio',

    test: 'bind',

    handle: function (value, prop, $el) {
        if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        var settableValue = $el.attr('value'); //initial value
        var isChecked = typeof settableValue !== 'undefined' ? settableValue == value : !!value; //eslint-disable-line eqeqeq
        $el.prop('checked', isChecked);
    }
};

/* harmony default export */ __webpack_exports__["default"] = (checkboxAttrHandler);

/***/ }),
/* 47 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/**
 * @type AttributeHandler 
 */
var inputBindAttr = {
    target: 'input, select, textarea',

    test: 'bind',

    handle: function (value, prop, $el) {
        if ($el.is(':focus')) {
            return; //If an user is actively typing in a value, don't overwrite it
        }
        if (value === undefined) {
            value = '';
        } else if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        $el.val(value + '');
    }
};

/* harmony default export */ __webpack_exports__["default"] = (inputBindAttr);

/***/ }),
/* 48 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_utils_animation__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_config__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_config___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_config__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__bind_utils__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__ = __webpack_require__(10);








var elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

function toAliasMap(topics) {
    return (topics || []).reduce(function (accum, topic) {
        accum[topic.name] = topic.alias;
        return accum;
    }, {});
}

function getNewContent(currentContents, value, $el, topics) {
    if (!Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["f" /* isTemplated */])(currentContents)) {
        return Object(__WEBPACK_IMPORTED_MODULE_3__bind_utils__["c" /* translateDataToInsertable */])(value);
    }

    var templateData = Object(__WEBPACK_IMPORTED_MODULE_3__bind_utils__["d" /* translateDataToTemplatable */])(value, toAliasMap(topics));
    var knownData = Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["d" /* getKnownDataForEl */])($el);
    $.extend(templateData, knownData);

    var missingReferences = Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["c" /* findMissingReferences */])(currentContents, Object.keys(templateData));
    var stubbedTemplate = Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["h" /* stubMissingReferences */])(currentContents, missingReferences);

    var templateFn = Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["template"])(stubbedTemplate);
    try {
        var templatedHTML = templateFn(templateData);
        var templatedWithReferences = Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["a" /* addBackMissingReferences */])(templatedHTML, missingReferences);
        return templatedWithReferences;
    } catch (e) {
        //you don't have all the references you need;
        Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["i" /* updateKnownDataForEl */])($el, templateData);
        return currentContents;
    }
}

/**
 * @type AttributeHandler 
 */
var bindAttrHandler = {

    target: '*',

    test: 'bind',

    parse: function (topics) {
        return topics.map(function (topic) {
            var attrVal = topic.name;
            return {
                name: Object(__WEBPACK_IMPORTED_MODULE_3__bind_utils__["b" /* extractVariableName */])(attrVal),
                alias: Object(__WEBPACK_IMPORTED_MODULE_3__bind_utils__["a" /* extractAlias */])(attrVal)
            };
        });
    },

    //FIXME: Can't do this because if you have a bind within a foreach, foreach overwrites the old el with a new el, and at that points contents are lost
    // But if i don't do this the <%= %> is going to show up
    // init: function (attr, value, $el) {
    //     const contents = getOriginalContents($el, ($el)=> $el.html());
    //     if (isTemplated(contents)) {
    //         $el.empty();
    //     }
    // },

    unbind: function (attr, $el) {
        var el = $el.get(0);
        elAnimatedMap.delete(el);

        var bindTemplate = Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["e" /* getOriginalContents */])($el);
        var current = $el.html();
        if (bindTemplate && current !== bindTemplate) {
            $el.html(bindTemplate);
        }
        Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["b" /* clearOriginalContents */])($el);
        Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["g" /* removeKnownData */])($el);
    },

    handle: function (value, prop, $el, topics) {
        var el = $el.get(0);
        var originalContents = Object(__WEBPACK_IMPORTED_MODULE_4_dom_attribute_manager_attr_template_utils__["e" /* getOriginalContents */])($el, function ($el) {
            return $el.html();
        });
        var contents = getNewContent(originalContents, value, $el, topics);

        Object(__WEBPACK_IMPORTED_MODULE_1_utils_animation__["b" /* addContentAndAnimate */])($el, contents, !elAnimatedMap.has(el), __WEBPACK_IMPORTED_MODULE_2_config__["animation"]);
        elAnimatedMap.set(el, true);
    }
};

/* harmony default export */ __webpack_exports__["default"] = (bindAttrHandler);

/***/ }),
/* 49 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["c"] = translateDataToInsertable;
/* harmony export (immutable) */ __webpack_exports__["d"] = translateDataToTemplatable;
/* harmony export (immutable) */ __webpack_exports__["b"] = extractVariableName;
/* harmony export (immutable) */ __webpack_exports__["a"] = extractAlias;
function translateDataToInsertable(value) {
    if (Array.isArray(value)) {
        value = value[value.length - 1];
    }
    value = $.isPlainObject(value) ? JSON.stringify(value) : value + '';
    return value;
}

/**
 * @param {any} value
 * @param {Object} aliasMap
 * @returns {{value: any}}
 */
function translateDataToTemplatable(value, aliasMap) {
    var templateData = { value: value };
    if ($.isPlainObject(value)) {
        Object.keys(value).forEach(function (originalName) {
            var alias = aliasMap[originalName] || originalName;
            templateData[alias] = value[originalName];
        });
    } else {
        Object.keys(aliasMap).forEach(function (originalName) {
            var alias = aliasMap[originalName] || originalName;
            templateData[alias] = value;
        });
    }

    return templateData;
}

var AS_REGEX = /(.*) (?:as)\s+\((.*)\)/;

/**
 * @param {string} attrVal 
 * @returns {string}
 */
function extractVariableName(attrVal) {
    var asMatch = attrVal.trim().match(AS_REGEX);
    var varName = asMatch && asMatch[1] ? asMatch[1] : attrVal;
    return varName.trim();
}

/**
 * @param {string} attrVal 
 * @returns {string}
 */
function extractAlias(attrVal) {
    var asMatch = attrVal.trim().match(AS_REGEX);
    var alias = asMatch && asMatch[2] ? asMatch[2] : attrVal;
    return alias.trim();
}

/***/ }),
/* 50 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/**
 * @type AttributeHandler 
 */
var defaultAttr = {
    test: '*',

    target: '*',

    handle: function (value, prop, $el) {
        //FIXME: The _right_ way to do this would be to set attr, not prop. 
        //However Polymer 1.0 doesn't link attrs with stringified JSON, and that's really the primary use-case for this, so, ignoring
        //However Polymer is fine with 'data-X' attrs having stringified JSON. Eventually we should make this attr and fix polymer
        //but can't do that for backwards comptability reason. See commit bbc4a49039fb73faf1ef591a07b371d7d667cf57
        $el.prop(prop, value);
    }
};

/* harmony default export */ __webpack_exports__["default"] = (defaultAttr);

/***/ }),
/* 51 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/**
 * Hooks up dom elements to mutation observer
 * @param  {HTMLElement} target     root to start observing from
 * @param  {Object} domManager 
 * @param  {boolean} isEnabled Determines if it's enabled by default
 * @returns {Object}
 */
/* harmony default export */ __webpack_exports__["a"] = (function (target, domManager, isEnabled) {
    if (typeof MutationObserver === 'undefined') {
        return;
    }
    // Create an observer instance
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            var added = $(mutation.addedNodes).find(':f');
            added = added.add($(mutation.addedNodes).filter(':f'));
            var removed = $(mutation.removedNodes).find(':f');
            removed = removed.add($(mutation.removedNodes).filter(':f'));
            if (added && added.length) {
                domManager.bindAll(added);
            }
            if (removed && removed.length) {
                domManager.unbindAll(removed);
            }
            if (mutation.attributeName === 'data-f-channel') {
                domManager.unbindAll(mutation.target);
                domManager.bindAll(mutation.target);
            }
        });
    });
    var mutconfig = {
        attributes: true,
        attributeFilter: ['data-f-channel'],
        childList: true,
        subtree: true,
        characterData: false
    };
    var publicApi = {
        enable: function () {
            observer.observe(target, mutconfig);
        },
        disable: function () {
            observer.disconnect();
        }
    };
    if (isEnabled) {
        publicApi.enable();
    }
    return publicApi;
});

/***/ }),
/* 52 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = ChannelManager;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__channel_manager__ = __webpack_require__(53);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_router__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__route_handlers__ = __webpack_require__(58);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__channel_manager_enhancements__ = __webpack_require__(76);






//Moving connecting glue here so channel-manager can be tested in isolation
var InterpolatableRoutableChannelManager = Object(__WEBPACK_IMPORTED_MODULE_3__channel_manager_enhancements__["a" /* interpolatable */])(Object(__WEBPACK_IMPORTED_MODULE_3__channel_manager_enhancements__["b" /* routable */])(__WEBPACK_IMPORTED_MODULE_0__channel_manager__["a" /* default */], __WEBPACK_IMPORTED_MODULE_1_channels_channel_router__["a" /* default */]));
function ChannelManager(opts) {
    var defaultRouteHandlers = [__WEBPACK_IMPORTED_MODULE_2__route_handlers__["b" /* JSONRouteHandler */], __WEBPACK_IMPORTED_MODULE_2__route_handlers__["a" /* EpicenterRouteHandler */]];
    var routes = opts && opts.routes ? opts.routes : [];
    var cm = new InterpolatableRoutableChannelManager($.extend(true, {}, {
        routes: [].concat(routes, defaultRouteHandlers)
    }, opts));
    return cm;
}

/***/ }),
/* 53 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_jquery__ = __webpack_require__(54);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_jquery___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_jquery__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__channel_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }




/**
 * 
 * @param {Array<string>|string} topics 
 * @param {Function} callback 
 * @param {Object} options
 * @returns {Subscription}
 */
function makeSubs(topics, callback, options) {
    var id = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniqueId"])('subs-');
    var defaults = {
        batch: false,

        /**
         * Determines if the last published data should be cached for future notifications. For e.g.,
         *
         * channel.subscribe(['price', 'cost'], callback1, { batch: true, cache: false });
         * channel.subscribe(['price', 'cost'], callback2, { batch: true, cache: true });
         *
         * channel.publish({ price: 1 });
         * channel.publish({ cost: 1 });
         *
         * callback1 will have been called once, and callback2 will not have been called. i.e., the channel caches the first publish value and notifies after all dependent topics have data
         * If we'd done channel.publish({ price: 1, cost: 1 }) would have called both callback1 and callback2
         *
         * `cache: true` is useful if you know if your topics will can published individually, but you still want to handle them together.
         * `cache: false` is useful if you know if your topics will *always* be published together and they'll be called at the same time.
         *
         * Note this has no discernible effect if batch is false
         * @type {boolean}
         */
        cache: true
    };
    var opts = __WEBPACK_IMPORTED_MODULE_0_jquery___default.a.extend({}, defaults, options);
    if (!callback || !Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["isFunction"])(callback)) {
        throw new Error('subscribe callback should be a function');
    }
    return __WEBPACK_IMPORTED_MODULE_0_jquery___default.a.extend(true, {
        id: id,
        topics: [].concat(topics),
        callback: callback
    }, opts);
}

var cacheBySubsId = {};
var sentDataBySubsId = {};

function copy(data) {
    if (Array.isArray(data)) {
        return data.map(function (d) {
            return copy(d);
        });
    } else if (__WEBPACK_IMPORTED_MODULE_0_jquery___default.a.isPlainObject(data)) {
        return Object.keys(data).reduce(function (accum, key) {
            accum[key] = copy(data[key]);
            return accum;
        }, {});
    }
    return data;
}
/**
* @param {Subscription} subscription 
* @param {*} data
*/
function callbackSubscriber(subscription, data) {
    var id = subscription.id;
    subscription.callback(data, { id: id, previousData: sentDataBySubsId[id] });
    sentDataBySubsId[id] = copy(data);
}

/**
* @param {Publishable[]} topics
* @param {Subscription} subscription 
*/
function checkAndNotifyBatch(topics, subscription) {
    var publishData = Object(__WEBPACK_IMPORTED_MODULE_1__channel_utils__["c" /* publishableToObject */])(topics);
    var matchingTopics = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["intersection"])(Object.keys(publishData), subscription.topics);
    if (!matchingTopics.length) {
        return;
    }

    var relevantDataFromPublish = matchingTopics.reduce(function (accum, topic) {
        accum[topic] = publishData[topic];
        return accum;
    }, {});
    var cachedDataForSubs = cacheBySubsId[subscription.id] || {};
    var knownDataForSubs = __WEBPACK_IMPORTED_MODULE_0_jquery___default.a.extend({}, cachedDataForSubs, relevantDataFromPublish); //jQ Deep clone here will also concat arrays.

    if (subscription.cache) {
        cacheBySubsId[subscription.id] = knownDataForSubs;
    }
    var hasDataForAllTopics = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["intersection"])(Object.keys(knownDataForSubs), subscription.topics).length === subscription.topics.length;
    if (hasDataForAllTopics) {
        callbackSubscriber(subscription, knownDataForSubs);
    }
}

/**
 * @param {Publishable[]} topics
 * @param {Subscription} subscription 
 */
function checkAndNotify(topics, subscription) {
    topics.forEach(function (topic) {
        var needsThisTopic = subscription.topics.indexOf(topic.name) !== -1;
        var isWildCard = subscription.topics.indexOf('*') !== -1;
        if (needsThisTopic || isWildCard) {
            callbackSubscriber(subscription, _defineProperty({}, topic.name, topic.value));
        }
    });
}

/**
* @param {Subscription[]} subcriptionList
* @returns {Array<string>}
*/
function getTopicsFromSubsList(subcriptionList) {
    return subcriptionList.reduce(function (accum, subs) {
        accum = accum.concat(subs.topics);
        return accum;
    }, []);
}

/**
 * @class ChannelManager
 */

var ChannelManager = function () {
    function ChannelManager(options) {
        _classCallCheck(this, ChannelManager);

        this.subscriptions = [];
    }

    /**
     * @param {string|Publishable} topic
     * @param {any} [value] item to publish
     * @param {PublishOptions} [options]
     * @returns {Promise}
     */


    _createClass(ChannelManager, [{
        key: 'publish',
        value: function publish(topic, value, options) {
            var _this = this;

            var normalized = Object(__WEBPACK_IMPORTED_MODULE_1__channel_utils__["a" /* normalizeParamOptions */])(topic, value, options);
            var prom = __WEBPACK_IMPORTED_MODULE_0_jquery___default.a.Deferred().resolve(normalized.params).promise();
            prom = prom.then(function (publishResponses) {
                _this.notify(publishResponses, options);
                return publishResponses;
            });
            return prom;
        }
    }, {
        key: 'notify',
        value: function notify(topic, value, options) {
            var normalized = Object(__WEBPACK_IMPORTED_MODULE_1__channel_utils__["a" /* normalizeParamOptions */])(topic, value, options);
            // console.log('notify', normalized.params);
            return this.subscriptions.forEach(function (subs) {
                var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                fn(normalized.params, subs);
            });
        }

        /**
         * @param {Array<string>|string} topics
         * @param {Function} cb
         * @param {Object} [options]
         * @returns {string}
         */

    }, {
        key: 'subscribe',
        value: function subscribe(topics, cb, options) {
            var subs = makeSubs(topics, cb, options);
            delete cacheBySubsId[subs.id]; //Just in case subsid is being reused
            delete sentDataBySubsId[subs.id];
            this.subscriptions = this.subscriptions.concat(subs);
            return subs.id;
        }

        /**
         * @param {string} token
         */

    }, {
        key: 'unsubscribe',
        value: function unsubscribe(token) {
            var olderLength = this.subscriptions.length;
            var remaining = this.subscriptions.filter(function (subs) {
                return subs.id !== token;
            });
            if (remaining.length === olderLength) {
                throw new Error('No subscription found for token ' + token);
            }
            delete cacheBySubsId[token];
            delete sentDataBySubsId[token];
            this.subscriptions = remaining;
        }
    }, {
        key: 'unsubscribeAll',
        value: function unsubscribeAll() {
            cacheBySubsId = {};
            sentDataBySubsId = {};
            this.subscriptions = [];
        }

        /**
         * @returns {Array<string>}
         */

    }, {
        key: 'getSubscribedTopics',
        value: function getSubscribedTopics() {
            var list = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniq"])(getTopicsFromSubsList(this.subscriptions));
            return list;
        }

        /**
         * @param {string} [topic] optional topic to filter by
         * @returns {Subscription[]}
         */

    }, {
        key: 'getSubscribers',
        value: function getSubscribers(topic) {
            if (!topic) {
                return this.subscriptions;
            }
            return this.subscriptions.filter(function (subs) {
                return subs.topics.indexOf(topic) !== -1;
            });
        }
    }]);

    return ChannelManager;
}();

/* harmony default export */ __webpack_exports__["a"] = (ChannelManager);

/***/ }),
/* 54 */
/***/ (function(module, exports) {

module.exports = jQuery;

/***/ }),
/* 55 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export findBestHandler */
/* harmony export (immutable) */ __webpack_exports__["a"] = groupByHandlers;
/* harmony export (immutable) */ __webpack_exports__["b"] = groupSequentiallyByHandlers;
/* harmony export (immutable) */ __webpack_exports__["c"] = normalizeSubscribeResponse;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


/**
 * @param {string} topic
 * @param {Handler[]} handlers
 * @param {any} [matchOptions] options to pass on to matcher
 * @returns {Handler | undefined}
 */
function findBestHandler(topic, handlers, matchOptions) {
    for (var i = 0; i < handlers.length; i++) {
        var thishandler = handlers[i];
        var match = thishandler.match(topic, matchOptions);
        if (match !== false) {
            return $.extend(true, {}, thishandler, { matched: match });
        }
    }
    return undefined;
}

/**
 * [groupByHandlers description]
 * @param  {Array<string>} topics   List of topics to match. Format can be anything your handler.match function handles
 * @param  {Handler[]} handlers Handlers of type [{ match: func }]
 * @returns {HandlerWithTopics[]} The handler array with each item now having an additional 'data' attr added to it with the matching topics
 */
function groupByHandlers(topics, handlers) {
    handlers = handlers.map(function (h, index) {
        h.key = index;
        return h;
    });
    var topicMapping = [].concat(topics).reduce(function (accum, topic) {
        var bestHandler = findBestHandler(topic, handlers);
        if (bestHandler) {
            //if handler matches different strings treat both as different handlers
            var key = bestHandler.key + bestHandler.matched;
            if (!accum[key]) {
                bestHandler.data = [];
                accum[key] = bestHandler;
            }
            accum[key].data.push(topic);
        }
        return accum;
    }, {});
    return __WEBPACK_IMPORTED_MODULE_0_lodash___default.a.values(topicMapping);
}

/**
 * Takes a `publish` dataset and groups it by handler maintaining the data sequence
 * @param  {Publishable[]} data     Of the form [{ name: 'X', }]
 * @param  {Handler[]} handlers Handlers of type [{ match: func }]
 * @returns {HandlerWithData[]} The handler array with each item now having an additional 'data' attr added to it with the publishable data
 */
function groupSequentiallyByHandlers(data, handlers) {
    handlers = handlers.map(function (h, index) {
        h.key = index;
        return h;
    });
    var grouped = data.reduce(function (accum, dataPt) {
        var lastHandler = accum[accum.length - 1];
        var bestHandler = findBestHandler(dataPt.name, handlers, true);
        if (bestHandler) {
            if (lastHandler && bestHandler.key === lastHandler.key) {
                lastHandler.data.push(dataPt);
            } else {
                accum.push($.extend({}, bestHandler, { data: [dataPt] }));
            }
        } else {
            accum.push({ data: [dataPt], matched: false });
        }
        return accum;
    }, []);
    return grouped;
}

/**
 * @param {any} response 
 * @param {string[]} topics 
 * @returns {Publishable[]}
 */
function normalizeSubscribeResponse(response, topics) {
    // @ts-ignore
    if (response === undefined) {
        return [];
    }
    var isAlreadyInPublishableFormat = Array.isArray(response) && (!response.length || response[0].name !== undefined);
    if (isAlreadyInPublishableFormat) {
        return response;
    }
    if (typeof response === 'object' && !Array.isArray(response)) {
        return topics.reduce(function (accum, t) {
            accum.push({ name: t, value: response[t] });
            return accum;
        }, []);
    }
    if (topics.length === 1) {
        //it's not in a publishable format, so someone just returned a string or something
        var name = topics[0];
        return [{ name: name, value: response }];
    }
    throw new Error('unrecognized subscribe response format');
}

/***/ }),
/* 56 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = silencable;
/**
 * @param {Publishable[]} published 
 * @param {boolean|Array<string>|{except: Array<string>}} [silentOptions]
 * @returns {Publishable[]} filtered list
 */
function silencable(published, silentOptions) {
    if (silentOptions === true || !published) {
        return [];
    } else if (Array.isArray(silentOptions)) {
        return published.filter(function (data) {
            var found = silentOptions.indexOf(data.name) !== -1;
            return !found;
        });
    } else if (silentOptions && silentOptions.except) {
        return published.filter(function (data) {
            var found = (silentOptions.except || []).indexOf(data.name) !== -1;
            return found;
        });
    }
    return published;
}

/***/ }),
/* 57 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = excludeReadOnly;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


/**
 * 
 * @param {Publishable[]} publishable 
 * @param {boolean|string[]|Function} readOnlyOptions 
 * @returns {Publishable[]} filtered list
 */
function excludeReadOnly(publishable, readOnlyOptions) {
    if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(readOnlyOptions)) {
        readOnlyOptions = readOnlyOptions();
    }
    if (readOnlyOptions === true) {
        console.error('Tried to publish to a readonly channel', publishable);
        return [];
    }
    if (Array.isArray(readOnlyOptions)) {
        var split = publishable.reduce(function (accum, data) {
            var isReadonly = readOnlyOptions.indexOf(data.name) !== -1;
            if (isReadonly) {
                accum.readOnly.push(data);
            } else {
                accum.remaining.push(data);
            }
            return accum;
        }, { readOnly: [], remaining: [] });

        if (split.readOnly.length) {
            console.warn('Ignoring readonly publishes', split.readOnly);
        }
        return split.remaining;
    }
    return publishable;
}

/***/ }),
/* 58 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__json_route_handler__ = __webpack_require__(59);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return __WEBPACK_IMPORTED_MODULE_0__json_route_handler__["a"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__epicenter_route_handlers__ = __webpack_require__(60);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_1__epicenter_route_handlers__["a"]; });



/***/ }),
/* 59 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export match */
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_parse_utils__ = __webpack_require__(5);


function match(topic) {
    var parsed = Object(__WEBPACK_IMPORTED_MODULE_0_utils_parse_utils__["b" /* toImplicitType */])(topic);
    return typeof parsed !== 'string' ? '' : false;
}

/* harmony default export */ __webpack_exports__["a"] = ({
    match: match,
    name: 'JSON Route',
    subscribeHandler: function (topics) {
        var parsed = topics.map(function (t) {
            return {
                name: t,
                value: Object(__WEBPACK_IMPORTED_MODULE_0_utils_parse_utils__["b" /* toImplicitType */])(t)
            };
        });
        return parsed;
    }
});

/***/ }),
/* 60 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = EpicenterRouteHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__default_run_route_handler__ = __webpack_require__(61);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__scenario_route_handler__ = __webpack_require__(66);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__runid_route_handler__ = __webpack_require__(67);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__world_route_handler__ = __webpack_require__(69);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__multi_run_route_handler__ = __webpack_require__(75);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_channels_channel_router_utils__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_channels_route_handlers_route_matchers__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_channels_channel_router__ = __webpack_require__(4);












function getOptions(opts, key) {
    var serviceOptions = $.extend(true, {}, opts.defaults, opts[key]);
    var channelOptions = $.extend(true, {}, serviceOptions.channelOptions);
    delete serviceOptions.channelOptions;

    return { serviceOptions: serviceOptions, channelOptions: channelOptions };
}

var SCENARIO_PREFIX = 'sm:';
var RUN_PREFIX = 'rm:';
var WORLD_PREFIX = 'world:';

var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
var runidRegex = '(?:.{' + sampleRunidLength + '})';

function EpicenterRouteHandler(config, notifier, channelManagerContext) {
    var opts = $.extend(true, {}, config);

    var runidHandlerOpts = getOptions(opts, 'runid');
    var runidHandler = new __WEBPACK_IMPORTED_MODULE_2__runid_route_handler__["a" /* default */](runidHandlerOpts, notifier);
    var multiRunHandler = new __WEBPACK_IMPORTED_MODULE_4__multi_run_route_handler__["a" /* default */](runidHandlerOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_channel_router_utils__["g" /* withPrefix */])(notifier, 'runs'), channelManagerContext);
    // var userChannel = new UserRouter(getOptions(opts, 'runManager').run, withPrefix(notifier, 'user:'), channelManagerContext);

    /** @type {Handler[]} **/
    var handlers = [$.extend({}, runidHandler, {
        name: 'customRun',
        match: Object(__WEBPACK_IMPORTED_MODULE_6_channels_route_handlers_route_matchers__["c" /* matchRegex */])(runidRegex),
        options: runidHandlerOpts.channelOptions
    }), $.extend({}, multiRunHandler, {
        name: 'archiveRuns',
        match: Object(__WEBPACK_IMPORTED_MODULE_6_channels_route_handlers_route_matchers__["b" /* matchPrefix */])('runs:'),
        options: runidHandlerOpts.channelOptions
    })];
    var exposable = {};

    var runManagerOpts = getOptions(opts, 'runManager');
    if (opts.runManager || !opts.scenarioManager && runManagerOpts.serviceOptions.run) {
        var rm;
        var isMultiplayer = runManagerOpts.serviceOptions.strategy === 'multiplayer' || runManagerOpts.serviceOptions.isMultiplayer;
        if (opts.scenarioManager) {
            rm = new __WEBPACK_IMPORTED_MODULE_0__default_run_route_handler__["a" /* default */](runManagerOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_channel_router_utils__["g" /* withPrefix */])(notifier, RUN_PREFIX));
            handlers.push($.extend({}, rm, {
                name: 'run',
                match: Object(__WEBPACK_IMPORTED_MODULE_6_channels_route_handlers_route_matchers__["b" /* matchPrefix */])(RUN_PREFIX), //if both scenario manager and run manager are being used, require a prefix
                options: runManagerOpts.channelOptions
            }));
        } else if (isMultiplayer) {
            //Ignore case where both scenario manager and multiplayer are being used
            rm = new __WEBPACK_IMPORTED_MODULE_3__world_route_handler__["a" /* default */](runManagerOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_channel_router_utils__["g" /* withPrefix */])(notifier, [WORLD_PREFIX, '']));
            handlers.push($.extend({}, rm, {
                name: 'World run',
                match: Object(__WEBPACK_IMPORTED_MODULE_6_channels_route_handlers_route_matchers__["a" /* matchDefaultPrefix */])(WORLD_PREFIX),
                isDefault: true,
                options: runManagerOpts.channelOptions
            }));
        } else {
            rm = new __WEBPACK_IMPORTED_MODULE_0__default_run_route_handler__["a" /* default */](runManagerOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_channel_router_utils__["g" /* withPrefix */])(notifier, [RUN_PREFIX, '']));
            handlers.push($.extend({}, rm, {
                name: 'run',
                match: Object(__WEBPACK_IMPORTED_MODULE_6_channels_route_handlers_route_matchers__["a" /* matchDefaultPrefix */])(RUN_PREFIX),
                isDefault: true,
                options: runManagerOpts.channelOptions
            }));
        }

        $.extend(exposable, rm.expose);
    }

    if (opts.scenarioManager) {
        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new __WEBPACK_IMPORTED_MODULE_1__scenario_route_handler__["a" /* default */](scenarioManagerOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_channel_router_utils__["g" /* withPrefix */])(notifier, [SCENARIO_PREFIX, '']));
        handlers.push($.extend({}, sm, {
            name: 'scenario',
            match: Object(__WEBPACK_IMPORTED_MODULE_6_channels_route_handlers_route_matchers__["a" /* matchDefaultPrefix */])(SCENARIO_PREFIX),
            options: scenarioManagerOpts.channelOptions,
            isDefault: true
        }));

        $.extend(exposable, sm.expose);
    }

    var epicenterRouter = Object(__WEBPACK_IMPORTED_MODULE_7_channels_channel_router__["a" /* default */])(handlers, notifier);
    epicenterRouter.expose = exposable;

    return epicenterRouter;
}

/***/ }),
/* 61 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunManagerRouteHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_route_handler__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_channels_channel_router__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_channels_route_handlers_route_matchers__ = __webpack_require__(6);






var _window = window,
    F = _window.F;


var RUN_PREFIX = 'current:';

function RunManagerRouteHandler(config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    var opts = $.extend(true, {}, defaults, config);

    var rmOptions = opts.serviceOptions;
    var rm = new F.manager.RunManager(rmOptions);

    var $creationPromise = rm.getRun().then(function (run) {
        return rm.run;
    });
    var currentChannelOpts = $.extend(true, { serviceOptions: $creationPromise, channelOptions: opts.channelOptions }, opts.defaults, opts.current);
    var currentRunChannel = new __WEBPACK_IMPORTED_MODULE_0__run_route_handler__["a" /* default */](currentChannelOpts, Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__["g" /* withPrefix */])(notifier, [RUN_PREFIX, '']));

    var runRouteHandler = $.extend(currentRunChannel, {
        match: Object(__WEBPACK_IMPORTED_MODULE_3_channels_route_handlers_route_matchers__["a" /* matchDefaultPrefix */])(RUN_PREFIX), //TODO: Just remove prefix?
        name: 'Current Run',
        isDefault: true,
        options: currentChannelOpts.channelOptions
    });
    var handlers = [runRouteHandler];

    var runMangerRouter = Object(__WEBPACK_IMPORTED_MODULE_2_channels_channel_router__["a" /* default */])(handlers);
    runMangerRouter.expose = { runManager: rm };

    return runMangerRouter;
}

/***/ }),
/* 62 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunMetaRouteHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_lodash__);



function RunMetaRouteHandler($runServicePromise, notifier) {

    function mergeAndSend(runMeta, requestedTopics) {
        var toSend = [].concat(requestedTopics).reduce(function (accum, meta) {
            accum.push({ name: meta, value: runMeta[meta] });
            return accum;
        }, []);
        return toSend;
        // return notifier(toSend);
    }
    return {
        subscribeHandler: function (topics, options) {
            topics = [].concat(topics);

            return $runServicePromise.then(function (runService) {
                var cachedValues = Object(__WEBPACK_IMPORTED_MODULE_1_lodash__["intersection"])(Object.keys(runService.runMeta || {}), topics);
                if (options.autoFetch === false) {
                    return $.Deferred().resolve({}).promise();
                } else if (cachedValues.length === topics.length) {
                    //FIXME: Add 'updated time' to meta, and fetch if that's < debounce interval -- use the custom debounce fn with the custom merge (debounce save as well?)
                    //Make run service factory return patched run-service?
                    return $.Deferred().resolve(mergeAndSend(runService.runMeta, topics)).promise();
                }if (!runService.loadPromise) {
                    runService.loadPromise = runService.load().then(function (data) {
                        runService.runMeta = data;
                        return data;
                    });
                }
                return runService.loadPromise.then(function (data) {
                    return mergeAndSend(data, topics);
                });
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = Object(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["c" /* publishableToObject */])(topics);
                return runService.save(toSave).then(function (res) {
                    runService.runMeta = $.extend({}, true, runService.runMeta, res);
                    return Object(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["b" /* objectToPublishable */])(res);
                });
            });
        }
    };
}

/***/ }),
/* 63 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunVariablesRouteHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_general__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__retriable_variable_fetch__ = __webpack_require__(64);




// import { optimizedFetch } from './optimized-variables-fetch';

function mergeVariables(accum, newval) {
    if (!accum) {
        accum = [];
    }
    var merged = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniq"])(accum.concat(newval)).filter(function (v) {
        return !!(v && v.trim());
    });
    // console.log(merged, 'merged');
    return merged;
}

function RunVariablesRouteHandler($runServicePromise, notifier) {
    var id = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniqueId"])('variable-route-handler');

    function debouncedVariableQuery(runService, debounceInterval) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
        if (!runService.debouncedFetchers[id]) {
            runService.debouncedFetchers[id] = Object(__WEBPACK_IMPORTED_MODULE_0_utils_general__["a" /* debounceAndMerge */])(function (variables) {
                return Object(__WEBPACK_IMPORTED_MODULE_3__retriable_variable_fetch__["a" /* retriableFetch */])(runService, variables);
            }, debounceInterval, [mergeVariables]);
        }
        return runService.debouncedFetchers[id];
    }

    var knownTopics = [];
    return {
        /**
         * @param {{exclude:? boolean}} options 
         * @returns {Promise}
         */
        fetch: function (options) {
            var opts = $.extend({ exclude: [] }, options);
            return $runServicePromise.then(function (runService) {
                var variablesToFetch = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["difference"])([].concat(knownTopics), opts.exclude);
                if (!variablesToFetch.length) {
                    return [];
                }
                return Object(__WEBPACK_IMPORTED_MODULE_3__retriable_variable_fetch__["a" /* retriableFetch */])(runService, [].concat(variablesToFetch)).then(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["b" /* objectToPublishable */]).then(notifier);
            });
        },

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            knownTopics = knownTopics.filter(function (t) {
                return unsubscribedTopics.indexOf(t) === -1;
            });
        },
        subscribeHandler: function (topics, options) {
            // console.log('subscribe', JSON.stringify(topics));
            var isAutoFetchEnabled = options.autoFetch;
            var debounceInterval = options.debounce;

            return $runServicePromise.then(function (runService) {
                knownTopics = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniq"])(knownTopics.concat(topics));
                if (!knownTopics.length) {
                    return $.Deferred().resolve([]).promise();
                } else if (!isAutoFetchEnabled) {
                    return $.Deferred().resolve(topics).promise();
                }
                return debouncedVariableQuery(runService, debounceInterval)(topics).then(function (response) {
                    var missingVariables = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["difference"])(topics, Object.keys(response));
                    if (missingVariables.length) {
                        return $.Deferred().reject({
                            context: missingVariables,
                            message: 'Missing variables: ' + missingVariables.join(',')
                        }).promise();
                    }
                    return response;
                });
            });
        },
        /**
         * 
         * @param {Publishable[]} variableData
         */
        notify: function (variableData) {
            return $runServicePromise.then(function (runService) {
                var variables = variableData.map(function (v) {
                    return v.name;
                });
                //Need to fetch again because for Vensim, i'm notified about the Current value, while i need the value over time
                return Object(__WEBPACK_IMPORTED_MODULE_3__retriable_variable_fetch__["a" /* retriableFetch */])(runService, variables).then(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["b" /* objectToPublishable */]).then(notifier);
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["c" /* publishableToObject */])(topics);
                return runService.variables().save(toSave).then(function (response) {
                    var variables = Object.keys(toSave);
                    //Get the latest from the server because what you think you saved may not be what was saved
                    //bool -> 1, scalar to array for time-based models etc
                    return Object(__WEBPACK_IMPORTED_MODULE_3__retriable_variable_fetch__["a" /* retriableFetch */])(runService, variables).then(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["b" /* objectToPublishable */]);
                });
            });
        }
    };
}

/***/ }),
/* 64 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = retriableFetch;
//Opaquely handle missing variables
function retriableFetch(runService, variables) {
    if (!variables || !variables.length) {
        return $.Deferred().resolve({}).promise();
    }
    return runService.variables().query(variables).catch(function (e) {
        var response = e.responseJSON;
        var info = response.information;
        if (info.code !== 'VARIABLE_NOT_FOUND') {
            throw e;
        }
        var goodVariables = variables.filter(function (vName) {
            var baseName = vName.split('[')[0];
            var isBad = info.context.names.indexOf(baseName) !== -1;
            return !isBad;
        });
        return retriableFetch(runService, goodVariables);
    });
}

/***/ }),
/* 65 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunOperationsRouteHandler;
function RunOperationsRouteHandler($runServicePromise, notifier) {
    return {
        /**
         * 
         * @param {Publishable[]} operationsResponse 
         */
        notify: function (operationsResponse) {
            return notifier([].concat(operationsResponse));
        },

        subscribeHandler: function () {
            return []; //Cannot subscribe to operations
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = topics.map(function (topic) {
                    return { name: topic.name, params: topic.value };
                });
                return runService.serial(toSave).then(function (result) {
                    var toReturn = result.map(function (response, index) {
                        return { name: topics[index].name, value: response.result };
                    });
                    return toReturn;
                });
            });
        }
    };
}

/***/ }),
/* 66 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = ScenarioManagerRouteHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_route_handler__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_channels_channel_router__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_channels_route_handlers_route_matchers__ = __webpack_require__(6);





function ScenarioManagerRouteHandler(config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    var opts = $.extend(true, {}, defaults, config);

    var sm = new window.F.manager.ScenarioManager(opts.serviceOptions);

    var baselinePromise = sm.baseline.getRun().then(function () {
        return sm.baseline.run;
    });
    var baselineOptions = $.extend(true, {
        serviceOptions: baselinePromise,
        channelOptions: {
            meta: {
                readOnly: true
            },
            variables: {
                readOnly: true
            }
        }
    }, opts.defaults, opts.baseline);
    var currentRunPromise = sm.current.getRun().then(function () {
        return sm.current.run;
    });

    var runOptions = $.extend(true, {
        serviceOptions: currentRunPromise
    }, opts.defaults, opts.current);

    var baselineHandler = new __WEBPACK_IMPORTED_MODULE_0__run_route_handler__["a" /* default */](baselineOptions, Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__["g" /* withPrefix */])(notifier, 'baseline:'));
    var currentRunHandler = new __WEBPACK_IMPORTED_MODULE_0__run_route_handler__["a" /* default */](runOptions, Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__["g" /* withPrefix */])(notifier, ['current:', '']));
    var handlers = [$.extend(baselineHandler, {
        name: 'baseline',
        match: Object(__WEBPACK_IMPORTED_MODULE_3_channels_route_handlers_route_matchers__["b" /* matchPrefix */])('baseline:'),
        options: baselineOptions.channelOptions
    }), $.extend(currentRunHandler, {
        isDefault: true,
        name: 'current',
        match: Object(__WEBPACK_IMPORTED_MODULE_3_channels_route_handlers_route_matchers__["a" /* matchDefaultPrefix */])('current:'),
        options: runOptions.channelOptions
    })];

    var scenarioManagerRouter = Object(__WEBPACK_IMPORTED_MODULE_2_channels_channel_router__["a" /* default */])(handlers, notifier);
    scenarioManagerRouter.expose = { scenarioManager: sm };
    return scenarioManagerRouter;
}

/***/ }),
/* 67 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunidRouteHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_router_factory__ = __webpack_require__(68);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__ = __webpack_require__(2);



function RunidRouteHandler(options, notifier) {
    if (!options) options = {};

    var opts = {};
    opts.serviceOptions = options.serviceOptions && options.serviceOptions.run ? options.serviceOptions.run : {};
    opts.channelOptions = options.channelOptions;

    return {
        subscribeHandler: function (topics, options, prefix) {
            var runid = Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__["d" /* stripSuffixDelimiter */])(prefix);
            //FIXME: Should i merge options here?
            var channel = Object(__WEBPACK_IMPORTED_MODULE_0__run_router_factory__["a" /* default */])(runid, opts, Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__["g" /* withPrefix */])(notifier, prefix));
            return channel.subscribeHandler(topics, options, prefix);
        },
        publishHandler: function (topics, options, prefix) {
            var runid = Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__["d" /* stripSuffixDelimiter */])(prefix);
            var channel = Object(__WEBPACK_IMPORTED_MODULE_0__run_router_factory__["a" /* default */])(runid, opts, Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_router_utils__["g" /* withPrefix */])(notifier, prefix));
            return channel.publishHandler(topics);
        }
    };
}

/***/ }),
/* 68 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_route_handler__ = __webpack_require__(8);

var knownRunIDServiceChannels = {};

/* harmony default export */ __webpack_exports__["a"] = (function (runid, options, notifier) {
    var runChannel = knownRunIDServiceChannels[runid];
    if (!runChannel) {
        var runOptions = $.extend(true, {}, options, { serviceOptions: { id: runid } });
        runChannel = new __WEBPACK_IMPORTED_MODULE_0__run_route_handler__["a" /* default */](runOptions, notifier);
        knownRunIDServiceChannels[runid] = runChannel;
    }
    return runChannel;
});

/***/ }),
/* 69 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = WorldRoutesHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__world_users_route_handler__ = __webpack_require__(70);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__world_current_user_route_handler__ = __webpack_require__(71);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__consensus_route_handler__ = __webpack_require__(72);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_channels_channel_router_utils__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_channels_route_handlers_route_matchers__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__run_route_handler__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_channels_channel_router__ = __webpack_require__(4);










var _window = window,
    F = _window.F;


var RUN_PREFIX = 'run:';
var MULTI_USER_PREFIX = 'users:';
var USER_PREFIX = 'user:';
var CONSENSUS_PREFIX = 'consensus:';

//TODO: Add custom worldid channel as well
function WorldRoutesHandler(config, notifier) {
    var _this = this;

    var defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    var opts = $.extend(true, {}, defaults, config);

    var rmOptions = opts.serviceOptions;
    var rm = new F.manager.RunManager(rmOptions);

    var runPromise = null;
    function getRun() {
        if (!runPromise) {
            runPromise = rm.getRun().then(function (run) {
                if (!run.world) {
                    console.error('No world found in run. Make sure you\'re using EpicenterJS version > 2.7');
                    throw new Error('Could not find world');
                }
                return run;
            }, function (err) {
                console.error('Run manager get run error', err);
                throw err;
            });
        }
        return runPromise;
    }
    var $runPromise = getRun().then(function (run) {
        var alreadyStubbedRunChannel = rm.run.channel; //FIXME: Explicitly pass instead of stubbing on a channel
        if (alreadyStubbedRunChannel) {
            return rm.run;
        }
        var channelManager = new F.manager.ChannelManager();
        var worldChannel = channelManager.getWorldChannel(run.world);

        worldChannel.subscribe(worldChannel.TOPICS.RUN_RESET, function (run) {
            rm.run.updateConfig({ filter: run.id }); //Run handler is also listening on the run and will take care of notifying
        }, _this, { includeMine: false });
        rm.run.channel = worldChannel;
        return rm.run;
    });

    var currentRunHandlerOpts = $.extend(true, { serviceOptions: $runPromise, channelOptions: opts.channelOptions }, opts.defaults, opts.current);
    var currentRunHandler = new __WEBPACK_IMPORTED_MODULE_5__run_route_handler__["a" /* default */](currentRunHandlerOpts, Object(__WEBPACK_IMPORTED_MODULE_3_channels_channel_router_utils__["g" /* withPrefix */])(notifier, [RUN_PREFIX, '']));

    var handlers = [];

    var runRouteHandler = $.extend(currentRunHandler, {
        match: Object(__WEBPACK_IMPORTED_MODULE_4_channels_route_handlers_route_matchers__["a" /* matchDefaultPrefix */])(RUN_PREFIX),
        name: 'World Run',
        isDefault: true,
        options: currentRunHandlerOpts.channelOptions
    });
    handlers.unshift(runRouteHandler);

    var $worldProm = null;
    function getWorld() {
        if (!$worldProm) {
            $worldProm = getRun().then(function (run) {
                return run.world;
            });
        }
        return $worldProm;
    }

    var worldChannelMap = {};
    var channelManager = new F.manager.ChannelManager();
    function getChannelForWorld(worldid) {
        if (!worldChannelMap[worldid]) {
            worldChannelMap[worldid] = channelManager.getWorldChannel(worldid);
        }
        return worldChannelMap[worldid];
    }

    var am = new F.manager.AuthManager();
    var handlerOptions = {
        serviceOptions: {
            getRun: getRun,
            getWorld: getWorld,
            getSession: function () {
                return am.getCurrentUserSessionInfo();
            },
            getChannel: getChannelForWorld
        },
        channelOptions: opts.channelOptions
    };

    var usersRouteHandler = new __WEBPACK_IMPORTED_MODULE_0__world_users_route_handler__["a" /* default */](handlerOptions, Object(__WEBPACK_IMPORTED_MODULE_3_channels_channel_router_utils__["g" /* withPrefix */])(notifier, MULTI_USER_PREFIX));
    var usersHandler = $.extend(usersRouteHandler, {
        match: Object(__WEBPACK_IMPORTED_MODULE_4_channels_route_handlers_route_matchers__["b" /* matchPrefix */])(MULTI_USER_PREFIX),
        name: 'world users'
    });
    handlers.unshift(usersHandler);

    var currentUserRouteHandler = new __WEBPACK_IMPORTED_MODULE_1__world_current_user_route_handler__["a" /* default */](handlerOptions, Object(__WEBPACK_IMPORTED_MODULE_3_channels_channel_router_utils__["g" /* withPrefix */])(notifier, USER_PREFIX));
    var currentUserHandler = $.extend(currentUserRouteHandler, {
        match: Object(__WEBPACK_IMPORTED_MODULE_4_channels_route_handlers_route_matchers__["b" /* matchPrefix */])(USER_PREFIX),
        name: 'world current user'
    });
    handlers.unshift(currentUserHandler);

    var ConsensusManager = window.F.manager.ConsensusManager;
    if (ConsensusManager) {
        //epijs < 2.80 did not have this
        var consensusRouteHandler = new __WEBPACK_IMPORTED_MODULE_2__consensus_route_handler__["a" /* default */](handlerOptions, Object(__WEBPACK_IMPORTED_MODULE_3_channels_channel_router_utils__["g" /* withPrefix */])(notifier, CONSENSUS_PREFIX));
        var consensusHandler = $.extend(consensusRouteHandler, {
            match: Object(__WEBPACK_IMPORTED_MODULE_4_channels_route_handlers_route_matchers__["b" /* matchPrefix */])(CONSENSUS_PREFIX),
            name: 'consensus'
        });
        handlers.unshift(consensusHandler);
    }

    var worldRouteHandler = Object(__WEBPACK_IMPORTED_MODULE_6_channels_channel_router__["a" /* default */])(handlers);
    worldRouteHandler.expose = { runManager: rm };

    return worldRouteHandler;
}

/***/ }),
/* 70 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = WorldUsersRouteHandler;
var F = window.F;

function WorldUsersRouteHandler(config, notifier) {
    var options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {}
    }, config);

    var _options$serviceOptio = options.serviceOptions,
        getWorld = _options$serviceOptio.getWorld,
        getSession = _options$serviceOptio.getSession,
        getChannel = _options$serviceOptio.getChannel;


    var store = {
        users: [],
        mark: function (userid, isOnline) {
            store.users = store.users.map(function (u) {
                if (u.userId === userid) {
                    u.isOnline = isOnline;
                }
                return u;
            });
            return store.users;
        }
    };

    var parsedUsersPromise = getWorld().then(function (world) {
        var session = getSession();
        var parsed = world.users.map(function (u) {
            u.name = u.lastName;
            u.isMe = u.userId === session.userId;
            u.isOnline = u.isMe; //Assume i'm the only online one by default
            return u;
        });
        store.users = parsed;
        return parsed;
    });

    var presenceSubsId = void 0;
    return {
        unsubscribeHandler: function (knownTopics, remainingTopics) {
            if (remainingTopics.length || !presenceSubsId) {
                return;
            }
            getWorld().then(function (world) {
                var worldChannel = getChannel(world.id);
                worldChannel.unsubscribe(presenceSubsId);
                presenceSubsId = null;
            });
        },
        subscribeHandler: function (userids) {
            if (!presenceSubsId) {
                //TODO: Also listen to roles channel to update users
                getWorld().then(function (world) {
                    var worldChannel = getChannel(world.id);
                    presenceSubsId = worldChannel.subscribe(worldChannel.TOPICS.PRESENCE, function (user, meta) {
                        var userid = user.id;
                        store.mark(userid, user.isOnline);
                        return notifier([{ name: '', value: store.users }]);
                    }, { includeMine: false });
                });
            }
            return parsedUsersPromise.then(function (users) {
                return [{ name: '', value: users }];
            });
        },
        publishHandler: function (topics, options) {
            var ps = new F.service.Presence();
            topics.forEach(function (topic) {
                var split = topic.name.split(':');
                if (split[1]) {
                    if (split[1] === 'markOnline') {
                        ps.markOnline(split[0]);
                    } else if (split[1] === 'markOffline') {
                        ps.markOffline(split[0]);
                    }
                }
            });
            return topics;
        }
    };
}

/***/ }),
/* 71 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = WorldCurrentUserRouteHandler;
function WorldCurrentUserRouteHandler(config, notifier) {
    var options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {}
    }, config);

    var _options$serviceOptio = options.serviceOptions,
        getWorld = _options$serviceOptio.getWorld,
        getSession = _options$serviceOptio.getSession,
        getChannel = _options$serviceOptio.getChannel;


    var subsid = void 0;

    var store = $.extend(true, {
        isMe: true,
        isOnline: true
    }, getSession());

    return {
        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            var stillNeedRoles = remainingTopics.indexOf('role') !== -1;
            if (!stillNeedRoles && subsid) {
                getWorld().then(function (world) {
                    var worldChannel = getChannel(world.id);
                    worldChannel.unsubscribe(subsid);
                });
                subsid = null;
            }
        },
        subscribeHandler: function (userFields) {
            return getWorld().then(function (world) {
                var session = getSession();
                var myUser = world.users.find(function (user) {
                    return user.userId === session.userId;
                });
                $.extend(store, myUser);

                var toNotify = userFields.reduce(function (accum, field) {
                    if (field === '') {
                        //the entire user object
                        accum.push({ name: field, value: store });
                    } else if (store[field] !== undefined) {
                        accum.push({ name: field, value: store[field] });
                    }
                    return accum;
                }, []);

                var isSubscribingToRole = userFields.indexOf('role') !== -1;
                if (isSubscribingToRole && !subsid) {
                    var worldChannel = getChannel(world.id);
                    subsid = worldChannel.subscribe(worldChannel.TOPICS.ROLES, function (users, meta) {
                        var myUser = users.find(function (u) {
                            return u.userId === session.userId;
                        });
                        if (myUser && myUser.role !== store.role) {
                            store.role = myUser.role;
                            notifier([{ name: 'role', value: myUser.role }]);
                        }
                    });
                }
                return toNotify;
            });
        }
    };
}

/***/ }),
/* 72 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = ConsensusRouteHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__consensus_operations_handler__ = __webpack_require__(73);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__consensus_status_handler__ = __webpack_require__(74);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_channels_channel_router__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_channels_route_handlers_route_matchers__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_channels_channel_router_utils__ = __webpack_require__(2);






var ConsensusManager = window.F.manager.ConsensusManager;

var OPERATIONS_PREFIX = 'operations:';

function ConsensusRouteHandler(config, notifier) {
    var options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {}
    }, config);

    var _options$serviceOptio = options.serviceOptions,
        getWorld = _options$serviceOptio.getWorld,
        getRun = _options$serviceOptio.getRun,
        getSession = _options$serviceOptio.getSession,
        getChannel = _options$serviceOptio.getChannel;


    var cm = new ConsensusManager();

    var consensusProm = null;
    function getConsensus(force) {
        if (!consensusProm || force) {
            consensusProm = getRun().then(function () {
                return cm.getCurrent(); //TODO: GetRun deletes the barrier if it overlaps with this call, so synchronize them
            });
        }
        return consensusProm;
    }

    var handlerOptions = {
        serviceOptions: {
            getConsensus: getConsensus,
            getSession: getSession
        },
        channelOptions: {}
    };

    var opnHandler = Object(__WEBPACK_IMPORTED_MODULE_0__consensus_operations_handler__["a" /* default */])(handlerOptions, Object(__WEBPACK_IMPORTED_MODULE_4_channels_channel_router_utils__["g" /* withPrefix */])(notifier, OPERATIONS_PREFIX));
    var statusHandler = Object(__WEBPACK_IMPORTED_MODULE_1__consensus_status_handler__["a" /* default */])(handlerOptions, notifier);

    var handlers = [$.extend({}, opnHandler, {
        name: 'consensus operations',
        match: Object(__WEBPACK_IMPORTED_MODULE_3_channels_route_handlers_route_matchers__["b" /* matchPrefix */])(OPERATIONS_PREFIX),
        options: handlerOptions.channelOptions.operations
    }), $.extend({}, statusHandler, {
        name: 'consensus status',
        match: Object(__WEBPACK_IMPORTED_MODULE_3_channels_route_handlers_route_matchers__["b" /* matchPrefix */])(''),
        isDefault: true,
        options: handlerOptions.channelOptions.status
    })];

    getWorld().then(function (world) {
        var channel = getChannel(world.id);
        channel.subscribe(channel.TOPICS.RUN_RESET, function () {
            getConsensus(true).then(function (consensus) {
                statusHandler.notify(consensus);
            });
        });
        // FIXME: Filter by stage here
        channel.subscribe(channel.TOPICS.CONSENSUS_UPDATE, function (consensus) {
            var isComplete = consensus.closed;
            if (isComplete) {
                getConsensus(true).then(function (consensus) {
                    statusHandler.notify(consensus);
                });
            } else {
                statusHandler.notify(consensus);
            }
        });
    });

    var consensusRouteHandler = Object(__WEBPACK_IMPORTED_MODULE_2_channels_channel_router__["a" /* default */])(handlers, notifier);
    consensusRouteHandler.expose = { consensusManager: cm };

    return consensusRouteHandler;
}

/***/ }),
/* 73 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = ConsensusOperationsHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__consensus_utils__ = __webpack_require__(15);


function ConsensusOperationsHandler(config, notifier) {
    var options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {}
    }, config);

    var getConsensus = options.serviceOptions.getConsensus;


    return {
        subscribeHandler: function () {
            return [];
        },
        publishHandler: function (topics, options) {
            return getConsensus().then(function (consensus) {
                var actions = topics.map(function (topic) {
                    return { name: topic.name, arguments: topic.value };
                });
                var cs = Object(__WEBPACK_IMPORTED_MODULE_0__consensus_utils__["a" /* makeConsensusService */])(consensus);
                return cs.submitActions(actions).then(function () {
                    return topics;
                });
            });
        }
    };
}

/***/ }),
/* 74 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = ConsensusStatusHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__consensus_utils__ = __webpack_require__(15);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);




function ConsensusStatusHandler(config, notifier) {
    var options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {}
    }, config);

    var _options$serviceOptio = options.serviceOptions,
        getConsensus = _options$serviceOptio.getConsensus,
        getSession = _options$serviceOptio.getSession;


    function normalizePlayers(rolePlayerMap) {
        var session = getSession();
        var normalized = Object.keys(rolePlayerMap).reduce(function (accum, role) {
            var playersForRole = rolePlayerMap[role];
            var playersWithRole = playersForRole.map(function (p) {
                var player = p.user || p; //submitted puts user under an extra object because of course
                return Object.assign({}, player, {
                    role: role,
                    userName: player.userName.split('/')[0], //API adds user/project because of course
                    name: player.lastName,
                    isMe: player.userName === session.userName // so you can do :submitted:users | reject('isMe')
                });
            });
            accum = accum.concat(playersWithRole);
            return accum;
        }, []);
        return normalized;
    }
    function normalizeConsensus(consensus) {
        var session = getSession();
        var submitted = normalizePlayers(consensus.submitted);
        var amWaiting = submitted.find(function (u) {
            return u.userName === session.userName;
        });
        var normalized = $.extend(true, {}, consensus, {
            amWaiting: !!amWaiting,
            submitted: submitted,
            pending: normalizePlayers(consensus.pending)
        });
        return normalized;
    }

    return {
        notify: function (consensus) {
            var normalizedConsensus = normalizeConsensus(consensus);
            notifier(Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["b" /* objectToPublishable */])(normalizedConsensus));
        },
        subscribeHandler: function (topics) {
            return getConsensus().then(function (consensus) {
                var normalized = normalizeConsensus(consensus);
                var dataForTopics = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["pick"])(normalized, topics);
                return Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["b" /* objectToPublishable */])(dataForTopics);
            });
        },
        publishHandler: function (topics) {
            return getConsensus().then(function (consensus) {
                if (topics.length > 1 || topics[0].name !== 'close') {
                    throw new TypeError('Can only publish `close` on consensus:status');
                }
                var cs = Object(__WEBPACK_IMPORTED_MODULE_0__consensus_utils__["a" /* makeConsensusService */])(consensus);
                return cs.forceClose().then(function () {
                    return topics;
                });
            });
        }
    };
}

/***/ }),
/* 75 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = MultiRunRouteHandler;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_general__ = __webpack_require__(7);
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();


var _window = window,
    F = _window.F;


function MultiRunRouteHandler(options, notifier, channelManagerContext) {
    var runService = new F.service.Run(options.serviceOptions.run);

    var topicParamMap = {};

    function extractFiltersFromTopic(topicString) {
        var filters = topicString.replace('(', '').replace(')', '');
        var filterParam = filters.split(';').reduce(function (accum, filter) {
            var _filter$split = filter.split('='),
                _filter$split2 = _slicedToArray(_filter$split, 2),
                key = _filter$split2[0],
                val = _filter$split2[1];

            if (val) {
                val = true;
            }
            accum[key] = val;
            return accum;
        }, {});
        return filterParam;
    }

    function fetch(topic, variables) {
        var filters = extractFiltersFromTopic(topic);
        return runService.query(filters, { include: variables }).then(function (runs) {
            notifier([{ name: topic, value: runs }]);

            // if (topicParamMap[topic]) {
            //     Object.keys(topicParamMap[topic]).forEach((runid)=> {
            //         channelManagerContext.unsubscribe(topicParamMap[topic][runid]);
            //     });
            // }

            return runs;
        });
    }

    return {
        fetch: fetch,

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            // knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics, options) {
            var topic = [].concat(topics)[0];

            var filters = extractFiltersFromTopic(topic);
            var variables = options && options.include;

            var debounceInterval = 300;
            var debouncedFetch = Object(__WEBPACK_IMPORTED_MODULE_0_utils_general__["a" /* debounceAndMerge */])(fetch, debounceInterval, [function (accum, newval) {
                return newval;
            }]);
            return fetch(topic, variables).then(function (runs) {
                var subsMap = {};
                //TODO: Provide this meta information to runs-factory so it doesn't trigger a fetch to get meta for each run
                runs.forEach(function (run) {
                    var subscriptions = Object.keys(filters).map(function (filter) {
                        return run.id + ':meta:' + filter;
                    });
                    var subsid = channelManagerContext.subscribe(subscriptions, function () {
                        debouncedFetch(topic, variables);
                    }, { batch: false, autoFetch: false, cache: false });
                    subsMap[run.id] = subsid;
                });

                topicParamMap[topic] = subsMap;
                return runs;
            });
        }
    };
}

/***/ }),
/* 76 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__interpolatable__ = __webpack_require__(77);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_0__interpolatable__["a"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__routable__ = __webpack_require__(80);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return __WEBPACK_IMPORTED_MODULE_1__routable__["a"]; });


// export { default as withMiddleware } from './with-middleware';

/***/ }),
/* 77 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = interpolatable;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__subscribe_interpolator__ = __webpack_require__(78);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__publish_interpolator__ = __webpack_require__(79);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }




/**
 * Decorates passed channel manager with interpolation functionality
 * @param  {ChannelManager} ChannelManager
 * @returns {ChannelManager}                wrapped channel manager
 */
function interpolatable(ChannelManager) {
    var subsidMap = {};

    /**
     * @implements {ChannelManager}
     */
    return function (_ChannelManager) {
        _inherits(InterpolatedChannelManager, _ChannelManager);

        function InterpolatedChannelManager(options) {
            _classCallCheck(this, InterpolatedChannelManager);

            //FIXME: Add on-error (from routable) here?
            var _this = _possibleConstructorReturn(this, (InterpolatedChannelManager.__proto__ || Object.getPrototypeOf(InterpolatedChannelManager)).call(this, options));

            _this.subscribe = Object(__WEBPACK_IMPORTED_MODULE_0__subscribe_interpolator__["a" /* default */])(_this.subscribe.bind(_this), function (dependencySubsId, newDependentId) {
                var existing = subsidMap[dependencySubsId];
                if (existing) {
                    _this.unsubscribe(existing);
                }
                subsidMap[dependencySubsId] = newDependentId;
            });

            _this.publish = Object(__WEBPACK_IMPORTED_MODULE_1__publish_interpolator__["a" /* default */])(_this.publish.bind(_this), function (variables, cb) {
                _get(InterpolatedChannelManager.prototype.__proto__ || Object.getPrototypeOf(InterpolatedChannelManager.prototype), 'subscribe', _this).call(_this, variables, function (response, meta) {
                    _this.unsubscribe(meta.id);
                    cb(response);
                }, { autoFetch: true, batch: true, onError: function (e) {
                        throw e;
                    } });
            });
            return _this;
        }

        _createClass(InterpolatedChannelManager, [{
            key: 'unsubscribe',
            value: function unsubscribe(token) {
                var existing = subsidMap[token];
                if (existing) {
                    _get(InterpolatedChannelManager.prototype.__proto__ || Object.getPrototypeOf(InterpolatedChannelManager.prototype), 'unsubscribe', this).call(this, existing);
                }
                _get(InterpolatedChannelManager.prototype.__proto__ || Object.getPrototypeOf(InterpolatedChannelManager.prototype), 'unsubscribe', this).call(this, token);
                delete subsidMap[token];
            }
        }, {
            key: 'unsubscribeAll',
            value: function unsubscribeAll() {
                subsidMap = {};
                _get(InterpolatedChannelManager.prototype.__proto__ || Object.getPrototypeOf(InterpolatedChannelManager.prototype), 'unsubscribeAll', this).call(this);
            }
        }]);

        return InterpolatedChannelManager;
    }(ChannelManager);
}

/***/ }),
/* 78 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export getDependencies */
/* unused harmony export interpolateWithDependencies */
/* unused harmony export mergeInterpolatedTopicsWithData */
/* harmony export (immutable) */ __webpack_exports__["a"] = subscribeInterpolator;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__interpolatable_utils__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_lodash__);



/**
 * @param {string[]} topics
 * @returns {string[]} interpolated
 */
function getDependencies(topics) {
    var deps = topics.reduce(function (accum, topic) {
        var inner = Object(__WEBPACK_IMPORTED_MODULE_0__interpolatable_utils__["a" /* extractDependencies */])(topic);
        accum = accum.concat(inner);
        return accum;
    }, []);
    return Object(__WEBPACK_IMPORTED_MODULE_1_lodash__["uniq"])(deps);
}

/**
 * @param {string[]} topics
 * @param {Object} data
 * @returns {string[]}
 */
function interpolateWithDependencies(topics, data) {
    return topics.map(function (topic) {
        return Object(__WEBPACK_IMPORTED_MODULE_0__interpolatable_utils__["b" /* interpolateWithValues */])(topic, data);
    });
}

/**
 * @param  {string[]} originalTopics     
 * @param  {string[]} interpolatedTopics 
 * @param  {Object} data               
 * @returns {Object}                    Interpolated
 */
function mergeInterpolatedTopicsWithData(originalTopics, interpolatedTopics, data) {
    return interpolatedTopics.reduce(function (accum, interpolatedTopic, index) {
        var original = originalTopics[index];
        var val = data[interpolatedTopic];
        if (val !== undefined) {
            accum[original] = data[interpolatedTopic];
        }
        return accum;
    }, {});
}

/**
 * Takes a subscribe function and resolves any interpolated inputs
 * @param  {Function} subscribeFn        function to wrap
 * @param  {Function} onDependencyChange callback function when any dependencies change
 * @returns {Function}                    wrapped function
 */
function subscribeInterpolator(subscribeFn, onDependencyChange) {
    return function interpolatedSubscribe(topics, cb, options) {
        topics = [].concat(topics);
        var dependencies = getDependencies(topics);
        if (!dependencies.length) {
            return subscribeFn(topics, cb, options);
        }
        var innerSubsId = subscribeFn(dependencies, function handleDependencyValueChange(data, dependenciesMeta) {
            var isSameData = Object(__WEBPACK_IMPORTED_MODULE_1_lodash__["isEqual"])(data, dependenciesMeta.previousData);
            if (isSameData) return;

            var interpolatedTopics = interpolateWithDependencies(topics, data);
            var outerSubsId = subscribeFn(interpolatedTopics, function handleInterpolatedValueChange(actualData, actualMeta) {
                var toSendback = mergeInterpolatedTopicsWithData(topics, interpolatedTopics, actualData);

                cb(toSendback, actualMeta);
            }, options);

            (onDependencyChange || $.noop)(dependenciesMeta.id, outerSubsId);
            return outerSubsId;
        }, $.extend(options, { autoFetch: true, batch: true }));

        return innerSubsId;
    };
}

/***/ }),
/* 79 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export getDependencies */
/* unused harmony export interpolateWithDependencies */
/* harmony export (immutable) */ __webpack_exports__["a"] = publishInterpolator;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__interpolatable_utils__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);





/**
 * @param {Publishable[]} publishInputs
 * @returns {string[]} dependencies for inputs
 */
function getDependencies(publishInputs) {
    var deps = publishInputs.reduce(function (accum, input) {
        var inner = Object(__WEBPACK_IMPORTED_MODULE_0__interpolatable_utils__["a" /* extractDependencies */])(input.name);
        accum = accum.concat(inner);
        return accum;
    }, []);
    return Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniq"])(deps);
}

/**
 * @param {Publishable[]} publishInputs
 * @param {{string: any}} valuesToInterpolate
 * @returns {Publishable[]} inputs with resolved dependencies
 */
function interpolateWithDependencies(publishInputs, valuesToInterpolate) {
    return publishInputs.map(function (ip) {
        return {
            name: Object(__WEBPACK_IMPORTED_MODULE_0__interpolatable_utils__["b" /* interpolateWithValues */])(ip.name, valuesToInterpolate),
            value: ip.value
        };
    });
}

/**
 * Publish function to wrap
 * @param  {Function} publishFunction
 * @param  {function(string[], function({string: any}):void):void} fetchFn         function to get interpolated values from
 * @returns {Function}                 wrapped function
 */
function publishInterpolator(publishFunction, fetchFn) {
    return function interpolatedPublishfunction(topic, value, options) {
        var normalizedPublishInputs = Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["a" /* normalizeParamOptions */])(topic, value, options);
        var dependencies = getDependencies(normalizedPublishInputs.params);
        if (!dependencies.length) {
            return publishFunction(topic, value, options);
        }

        var prom = $.Deferred();
        fetchFn(dependencies, function handleDependencyChange(resolvedDependencies) {
            var interpolated = interpolateWithDependencies(normalizedPublishInputs.params, resolvedDependencies);
            var newPublishProm = publishFunction(interpolated, normalizedPublishInputs.options);
            newPublishProm.then(prom.resolve, prom.reject);
        });
        return prom.promise();
    };
}

/***/ }),
/* 80 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = withRouter;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__channel_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_lodash__);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }




function getTopicsFromSubsList(subcriptionList) {
    var allTopics = subcriptionList.reduce(function (accum, subs) {
        accum = accum.concat(subs.topics);
        return accum;
    }, []);
    return Object(__WEBPACK_IMPORTED_MODULE_1_lodash__["uniq"])(allTopics);
}

/**
 * Decorates passed channel manager with middleware functionality
 * @param  {ChannelManager} BaseChannelManager
 * @param  {Object} router
 * @returns {ChannelManager} wrapped channel manager
 */
function withRouter(BaseChannelManager, router) {
    /**
     * @augments ChannelManager
     */
    return function (_BaseChannelManager) {
        _inherits(ChannelWithRouter, _BaseChannelManager);

        function ChannelWithRouter(options) {
            _classCallCheck(this, ChannelWithRouter);

            var _this = _possibleConstructorReturn(this, (ChannelWithRouter.__proto__ || Object.getPrototypeOf(ChannelWithRouter)).call(this, options));

            var defaults = {
                routes: []
            };
            var opts = $.extend(true, {}, defaults, options);
            var optsToPassOn = Object(__WEBPACK_IMPORTED_MODULE_1_lodash__["omit"])(opts, Object.keys(defaults));

            var rt = router(opts.routes, optsToPassOn, _this.notify.bind(_this));
            Object.assign(_this, rt.expose || {});
            _this.router = rt;
            return _this;
        }

        /**
         * Allow intercepting and excluding topics from by subsequent middlewares
         * @param  {string | string[]}   topics
         * @param  {Function} cb
         * @param  {Object}   options
         * @returns {string}           subscription id
         */


        _createClass(ChannelWithRouter, [{
            key: 'subscribe',
            value: function subscribe(topics, cb, options) {
                var _this2 = this;

                var subsid = _get(ChannelWithRouter.prototype.__proto__ || Object.getPrototypeOf(ChannelWithRouter.prototype), 'subscribe', this).call(this, topics, cb, options);
                this.router.subscribeHandler([].concat(topics), options).then(function (topicsWithData) {
                    if (topicsWithData && topicsWithData.length) {
                        _this2.notify([].concat(topicsWithData));
                    }
                }, function (err) {
                    _this2.unsubscribe(subsid);
                    if (options && options.onError) {
                        options.onError(err);
                    }
                });
                return subsid;
            }

            /**
             * Allow intercepting and handling/suppressing data to publish calls.
             * @param {string | Publishable } topic
             * @param {any} [value] item to publish
             * @param {Object} [options]
             * @returns {Promise}
             */

        }, {
            key: 'publish',
            value: function publish(topic, value, options) {
                var _this3 = this;

                var publishData = Object(__WEBPACK_IMPORTED_MODULE_0__channel_utils__["a" /* normalizeParamOptions */])(topic, value, options);
                return this.router.publishHandler(publishData.params, publishData.options).then(function (published) {
                    return _get(ChannelWithRouter.prototype.__proto__ || Object.getPrototypeOf(ChannelWithRouter.prototype), 'publish', _this3).call(_this3, published, publishData.options);
                });
            }

            /**
             * Calls unsubscribe middleware *after* unsubscription with a list of recently unsubscribed topics
             * @param  {string} token
             * @returns {void}
             */

        }, {
            key: 'unsubscribe',
            value: function unsubscribe(token) {
                var originalTopics = getTopicsFromSubsList(this.subscriptions);
                _get(ChannelWithRouter.prototype.__proto__ || Object.getPrototypeOf(ChannelWithRouter.prototype), 'unsubscribe', this).call(this, token);
                var remainingTopics = getTopicsFromSubsList(this.subscriptions);
                var unsubscribedTopics = Object(__WEBPACK_IMPORTED_MODULE_1_lodash__["difference"])(originalTopics, remainingTopics);

                this.router.unsubscribeHandler(unsubscribedTopics, remainingTopics);
            }

            /**
             * Calls unsubscribe middleware after unsubscribeAll on the channel
             * @returns {void}
             */

        }, {
            key: 'unsubscribeAll',
            value: function unsubscribeAll() {
                var originalTopics = getTopicsFromSubsList(this.subscriptions);
                _get(ChannelWithRouter.prototype.__proto__ || Object.getPrototypeOf(ChannelWithRouter.prototype), 'unsubscribeAll', this).call(this);

                return this.router.unsubscribeHandler(originalTopics, []);
            }
        }]);

        return ChannelWithRouter;
    }(BaseChannelManager);
}

/***/ }),
/* 81 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__general__ = __webpack_require__(7);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "makePromise", function() { return __WEBPACK_IMPORTED_MODULE_0__general__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "debounceAndMerge", function() { return __WEBPACK_IMPORTED_MODULE_0__general__["a"]; });


/***/ })
/******/ ])["default"];
//# sourceMappingURL=flow.js.map