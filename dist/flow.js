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
/******/ 	return __webpack_require__(__webpack_require__.s = 15);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = _;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = {
    prefix: 'f',
    defaultAttr: 'bind',

    binderAttr: 'f-bind',

    events: {
        //UI Change to publish to the channel.
        trigger: 'update.f.ui',

        //Trigger with payload '{attrToUpdate: value}', for e.g. { bind: 34 }. This will run this through all the converts and pass it to attr handler. Useful to by-pass getting this from the model directly.
        convert: 'f.convert',

        //When triggered posts the payload to the operations API. Assumes payloaded is formmatted in a way Run Channel can understand
        operate: 'f.ui.operate'
    },

    attrs: {
        //Used by the classes attr handler to keep track of which classes were added by itself
        classesAdded: 'f-added-classes',

        //Used by repeat attr handler to keep track of template after first evaluation
        repeat: {
            templateId: 'repeat-template-id' //don't prefix by f or dom-manager unbind will kill it
        }
    },
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
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toImplicitType", function() { return toImplicitType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toPublishableFormat", function() { return toPublishableFormat; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "splitNameArgs", function() { return splitNameArgs; });
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
 * @return {{ name: string, value: string[]}[]}       [description]
 */
function toPublishableFormat(value) {
    var split = (value || '').split('|');
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
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["g"] = stripSuffixDelimiter;
/* harmony export (immutable) */ __webpack_exports__["d"] = prefix;
/* harmony export (immutable) */ __webpack_exports__["a"] = defaultPrefix;
/* harmony export (immutable) */ __webpack_exports__["e"] = regex;
/* harmony export (immutable) */ __webpack_exports__["c"] = mapWithPrefix;
/* harmony export (immutable) */ __webpack_exports__["i"] = withPrefix;
/* harmony export (immutable) */ __webpack_exports__["h"] = unprefix;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__silencable__ = __webpack_require__(55);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "f", function() { return __WEBPACK_IMPORTED_MODULE_0__silencable__["a"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__exclude_read_only__ = __webpack_require__(56);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return __WEBPACK_IMPORTED_MODULE_1__exclude_read_only__["a"]; });
var CHANNEL_DELIMITER = ':';




/**
 * 
 * @param {string} text
 * @return {string}
 */
function stripSuffixDelimiter(text) {
    if (text && text.indexOf(CHANNEL_DELIMITER) === text.length - 1) {
        text = text.replace(CHANNEL_DELIMITER, '');
    }
    return text;
}

/**
 * 
 * @param {string} prefix
 * @returns {matchFunction}
 */
function prefix(prefix) {
    return function matchPrefix(topic) {
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
function defaultPrefix(prefix) {
    return function matchPrefix(topic) {
        return prefix;
    };
}

/**
 * 
 * @param {string} regex
 * @returns {matchFunction}
 */
function regex(regex) {
    var toMatch = new RegExp('^' + regex + CHANNEL_DELIMITER);
    return function matchRegex(topic) {
        var match = topic.match(toMatch);
        if (match && match.length) {
            return match[0];
        }
        return false;
    };
}

/**
 * 
 * @param {Publishable[]} dataArray 
 * @param {string} prefix 
 * @return {Publishable[]} array with name prefixed
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
 * @return {Function}
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
 * @param {Publishable[]} list 
 * @param {string} prefix
 * @return {Publishable[]} Item with prefix removed
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
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export findBestHandler */
/* harmony export (immutable) */ __webpack_exports__["d"] = objectToPublishable;
/* harmony export (immutable) */ __webpack_exports__["e"] = publishableToObject;
/* harmony export (immutable) */ __webpack_exports__["c"] = normalizeParamOptions;
/* harmony export (immutable) */ __webpack_exports__["a"] = groupByHandlers;
/* harmony export (immutable) */ __webpack_exports__["b"] = groupSequentiallyByHandlers;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


/**
 * @param {String} topic
 * @param {Handler[]} handlers
 * @return {MatchedHandler | undefined}
 */
function findBestHandler(topic, handlers) {
    for (var i = 0; i < handlers.length; i++) {
        var thishandler = handlers[i];
        var match = thishandler.match(topic);
        if (match !== false) {
            return $.extend(true, {}, thishandler, { matched: match });
        }
    }
    return undefined;
}

/**
 * 
 * @param {object} obj
 * @return {Publishable[]}
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
 * @param {object} [mergeWith]
 * @returns {object}
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
 * @param {String|Object|array} topic 
 * @param {*} publishValue 
 * @param {Object} options
 * @return {NormalizedParam}
 */
function normalizeParamOptions(topic, publishValue, options) {
    if (!topic) {
        return { params: [], options: {} };
    }
    if ($.isPlainObject(topic)) {
        return { params: objectToPublishable(topic), options: publishValue };
    }
    if ($.isArray(topic)) {
        return { params: topic, options: publishValue };
    }
    return { params: [{ name: topic, value: publishValue }], options: options };
}

/**
 * [groupByHandlers description]
 * @param  {String[]} topics   List of topics to match. Format can be anything your handler.match function handles
 * @param  {Handler[]} handlers Handlers of type [{ match: func }]
 * @return {MatchedHandler[]} The handler array with each item now having an additional 'data' attr added to it
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
 * @return {MatchedHandler[]} The handler array with each item now having an additional 'data' attr added to it
 */
function groupSequentiallyByHandlers(data, handlers) {
    handlers = handlers.map(function (h, index) {
        h.key = index;
        return h;
    });
    var grouped = data.reduce(function (accum, dataPt) {
        var lastHandler = accum[accum.length - 1];
        var bestHandler = findBestHandler(dataPt.name, handlers);
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

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export notifySubscribeHandlers */
/* unused harmony export notifyUnsubscribeHandlers */
/* unused harmony export passthroughPublishInterceptors */
/* harmony export (immutable) */ __webpack_exports__["a"] = router;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);




/**
 * Handle subscriptions
 * @param  {Handler[]} handlers Array of the form [{ match: function (){}, }]
 * @param  {String[]} topics   Array of strings
 * @param  {SubscribeOptions} [options]
 * @return {String[]} Returns the original topics array
 */
function notifySubscribeHandlers(handlers, topics, options) {
    var grouped = Object(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["a" /* groupByHandlers */])(topics, handlers);
    grouped.forEach(function (handler) {
        if (handler.subscribeHandler) {
            var mergedOptions = $.extend(true, {}, handler.options, options);
            var unprefixed = Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["h" /* unprefix */])(handler.data, handler.matched);
            handler.subscribeHandler(unprefixed, mergedOptions, handler.matched);
        }
    });
    return topics;
}

/**
 * 
 * @param {Handler[]} handlers 
 * @param {String[]} recentlyUnsubscribedTopics
 * @param {String[]} remainingTopics 
 */
function notifyUnsubscribeHandlers(handlers, recentlyUnsubscribedTopics, remainingTopics) {
    handlers = handlers.map(function (h, index) {
        h.unsubsKey = index;
        return h;
    });

    var unsubsGrouped = Object(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["a" /* groupByHandlers */])(recentlyUnsubscribedTopics, handlers);
    var remainingGrouped = Object(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["a" /* groupByHandlers */])(remainingTopics, handlers);

    unsubsGrouped.forEach(function (handler) {
        if (handler.unsubscribeHandler) {
            var unprefixedUnsubs = Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["h" /* unprefix */])(handler.data, handler.matched);
            var matchingRemainingHandler = __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.find(remainingGrouped, function (remainingHandler) {
                return remainingHandler.unsubsKey === handler.unsubsKey;
            });
            var matchingTopicsRemaining = matchingRemainingHandler ? matchingRemainingHandler.data : [];
            var unprefixedRemaining = Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["h" /* unprefix */])(matchingTopicsRemaining || [], handler.matched);
            handler.unsubscribeHandler(unprefixedUnsubs, unprefixedRemaining);
        }
    });
}

/**
 * 
 * @param {Handler[]} handlers 
 * @param {Publishable[]} publishData 
 * @param {PublishOptions} [options]
 * @return {Promise}
 */
function passthroughPublishInterceptors(handlers, publishData, options) {
    var grouped = Object(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["b" /* groupSequentiallyByHandlers */])(publishData, handlers);
    var $initialProm = $.Deferred().resolve([]).promise();
    grouped.forEach(function (handler) {
        $initialProm = $initialProm.then(function (dataSoFar) {
            var mergedOptions = $.extend(true, {}, handler.options, options);
            var unprefixed = Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["h" /* unprefix */])(handler.data, handler.matched);

            var publishableData = Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["b" /* excludeReadOnly */])(unprefixed, mergedOptions.readOnly);
            if (!publishableData.length) {
                return dataSoFar;
            }

            var result = handler.publishHandler ? handler.publishHandler(publishableData, mergedOptions, handler.matched) : publishableData;
            var publishProm = $.Deferred().resolve(result).promise();
            return publishProm.then(function (published) {
                return Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["f" /* silencable */])(published, mergedOptions.silent);
            }).then(function (published) {
                var mapped = Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["c" /* mapWithPrefix */])(published, handler.matched);
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
 * @param  {Handler[]} myHandlers
 * @return {Router}
 */
function router(handlers) {
    var myHandlers = handlers || [];
    return {
        /**
         * @param {String[]} topics
         * @param {SubscribeOptions} [options]
         * @return {String[]} Returns the original topics array
         */
        subscribeHandler: function (topics, options) {
            return notifySubscribeHandlers(myHandlers, topics, options);
        },
        /**
         * @param {String[]} recentlyUnsubscribedTopics
         * @param {String[]} remainingTopics
         * @return {void}
         */
        unsubscribeHandler: function (recentlyUnsubscribedTopics, remainingTopics) {
            return notifyUnsubscribeHandlers(myHandlers, recentlyUnsubscribedTopics, remainingTopics);
        },

        /**
         * @param {Publishable[]} data
         * @param {PublishOptions} [options]
         * @return {Promise}
         */
        publishHandler: function (data, options) {
            return passthroughPublishInterceptors(myHandlers, data, options);
        },

        addRoute: function (handler) {
            if (!handler || !handler.match) {
                throw Error('Handler does not have a valid `match` property');
            }
            handler.id = __WEBPACK_IMPORTED_MODULE_2_lodash___default.a.uniqueId('routehandler-');
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
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export VARIABLES_PREFIX */
/* unused harmony export META_PREFIX */
/* unused harmony export OPERATIONS_PREFIX */
/* unused harmony export _shouldFetch */
/* harmony export (immutable) */ __webpack_exports__["a"] = RunRouter;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_meta_channel__ = __webpack_require__(52);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__run_variables_channel__ = __webpack_require__(53);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__run_operations_channel__ = __webpack_require__(54);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_channels_channel_router__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_lodash__);









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

function RunRouter(config, notifier) {
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

    var serviceOptions = __WEBPACK_IMPORTED_MODULE_5_lodash___default.a.result(opts, 'serviceOptions');

    var $initialProm = null;
    if (serviceOptions instanceof window.F.service.Run) {
        $initialProm = $.Deferred().resolve(serviceOptions).promise();
    } else if (serviceOptions.then) {
        $initialProm = serviceOptions;
    } else {
        var rs = new window.F.service.Run(serviceOptions);
        $initialProm = $.Deferred().resolve(rs).promise();
    }

    var operationNotifier = Object(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["i" /* withPrefix */])(notifier, OPERATIONS_PREFIX);
    var variableNotifier = Object(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["i" /* withPrefix */])(notifier, [VARIABLES_PREFIX, '']);

    var metaChannel = new __WEBPACK_IMPORTED_MODULE_0__run_meta_channel__["a" /* default */]($initialProm, Object(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["i" /* withPrefix */])(notifier, META_PREFIX));
    var operationsChannel = new __WEBPACK_IMPORTED_MODULE_2__run_operations_channel__["a" /* default */]($initialProm, operationNotifier);
    var variableschannel = new __WEBPACK_IMPORTED_MODULE_1__run_variables_channel__["a" /* default */]($initialProm, variableNotifier);

    var subscribed = false;
    $initialProm.then(function (rs) {
        if (rs.channel && !subscribed) {
            subscribed = true;

            var subscribeOpts = { includeMine: false };
            //FIXME: Exclude silenced -- let notify take care of this?
            //FIXME: Provide subscription fn to individual channels and let them handle it
            rs.channel.subscribe('variables', function (data, meta) {
                variableschannel.notify(data, meta);
                variableschannel.fetch();
            }, _this, subscribeOpts);
            rs.channel.subscribe('operation', function (data, meta) {
                operationsChannel.notify(data, meta);
                variableschannel.fetch();
            }, _this, subscribeOpts);
            //
            rs.channel.subscribe('reset', function (data, meta) {
                operationsChannel.notify({ name: 'reset', result: data }, meta);
            }, _this, subscribeOpts);

            // rs.channel.subscribe('', (data, meta)=> {
            //     console.log('everything', data, meta);
            // });
        }
    });

    var handlers = [$.extend({}, metaChannel, {
        name: 'meta',
        match: Object(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["d" /* prefix */])(META_PREFIX),
        options: opts.channelOptions.meta
    }), $.extend({}, operationsChannel, {
        name: 'operations',
        match: Object(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["d" /* prefix */])(OPERATIONS_PREFIX),
        options: opts.channelOptions.operations
    }), $.extend({}, variableschannel, {
        isDefault: true,
        name: 'variables',
        match: Object(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["a" /* defaultPrefix */])(VARIABLES_PREFIX),
        options: opts.channelOptions.variables
    })];

    // router.addRoute(prefix('meta:'), metaChannel, opts.channelOptions.meta);

    var runRouter = Object(__WEBPACK_IMPORTED_MODULE_3_channels_channel_router__["a" /* default */])(handlers);
    var oldhandler = runRouter.publishHandler;
    runRouter.publishHandler = function () {
        var prom = oldhandler.apply(__WEBPACK_IMPORTED_MODULE_3_channels_channel_router__["a" /* default */], arguments);
        return prom.then(function (result) {
            //all the silencing will be taken care of by the router
            var shouldFetch = _shouldFetch(result, ['reset']);
            if (shouldFetch) {
                variableschannel.fetch();
            }
            return result;
        });
    };
    return runRouter;
}

/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (immutable) */ __webpack_exports__["_findMostConsequtive"] = _findMostConsequtive;
/* harmony export (immutable) */ __webpack_exports__["addChangeClassesToList"] = addChangeClassesToList;
/* harmony export (immutable) */ __webpack_exports__["addContentAndAnimate"] = addContentAndAnimate;
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
 * @param {Boolean} isInitial check if this is initial data or it's updating
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

        return $el.attr((_$el$attr3 = {}, _defineProperty(_$el$attr3, opts.changeAttr, true), _defineProperty(_$el$attr3, opts.initialAttr, isInitial || null), _$el$attr3), true);
    }, 0); //need this to trigger animation
}

/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (immutable) */ __webpack_exports__["getKnownDataForEl"] = getKnownDataForEl;
/* harmony export (immutable) */ __webpack_exports__["updateKnownDataForEl"] = updateKnownDataForEl;
/* harmony export (immutable) */ __webpack_exports__["removeKnownData"] = removeKnownData;
/* harmony export (immutable) */ __webpack_exports__["getTemplateTags"] = getTemplateTags;
/* harmony export (immutable) */ __webpack_exports__["isTemplated"] = isTemplated;
/* harmony export (immutable) */ __webpack_exports__["findMissingReferences"] = findMissingReferences;
/* harmony export (immutable) */ __webpack_exports__["stubMissingReferences"] = stubMissingReferences;
/* harmony export (immutable) */ __webpack_exports__["addBackMissingReferences"] = addBackMissingReferences;
/* harmony export (immutable) */ __webpack_exports__["getOriginalContents"] = getOriginalContents;
/* harmony export (immutable) */ __webpack_exports__["clearOriginalContents"] = clearOriginalContents;
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
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

var _require = __webpack_require__(0),
    uniqueId = _require.uniqueId,
    random = _require.random,
    toArray = _require.toArray;

module.exports = {

    random: function (prefix, min, max) {
        if (!min) {
            min = parseInt(uniqueId(), 10);
        }
        if (!max) {
            max = 100000; //eslint-disable-line no-magic-numbers
        }
        var rnd = random(min, max, false) + '';
        if (prefix) {
            rnd = prefix + rnd;
        }
        return rnd;
    },

    /**
     * A promise-returning debounce function. Also lets you decide what to do with arguments passed in while being debounced
     * @param  {Function} fn                function to debounce
     * @param  {Number}   debounceInterval  interval
     * @param  {Array}   argumentsReducers A reducer for each argument to the function
     * @return {Function}                     
     */
    debounceAndMerge: function (fn, debounceInterval, argumentsReducers) {
        var timer = null;

        var argsToPass = [];
        if (!argumentsReducers) {
            var arrayReducer = function (accum, newVal) {
                if (!accum) {
                    accum = [];
                }
                return accum.concat(newVal);
            };
            argumentsReducers = [arrayReducer];
        }
        return function () {
            var $def = $.Deferred();
            var newArgs = toArray(arguments);
            argsToPass = newArgs.map(function (arg, index) {
                var reducer = argumentsReducers[index];
                if (reducer) {
                    return reducer(argsToPass[index], arg);
                } else {
                    return arg;
                }
            });

            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(function () {
                timer = null;
                var res = fn.apply(fn, argsToPass);
                if (res && res.then) {
                    return res.then(function (arg) {
                        argsToPass = [];
                        $def.resolve(arg);
                    });
                } else {
                    argsToPass = [];
                    $def.resolve(res);
                }
            }, debounceInterval);

            return $def.promise();
        };
    }
};

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var config = __webpack_require__(1);
var BaseView = __webpack_require__(11);

module.exports = BaseView.extend({
    propertyHandlers: [],

    uiChangeEvent: 'change',
    getUIValue: function () {
        return this.$el.val();
    },

    removeEvents: function () {
        this.$el.off(this.uiChangeEvent);
    },

    initialize: function () {
        var me = this;
        var propName = this.$el.data(config.binderAttr);

        if (propName) {
            this.$el.off(this.uiChangeEvent).on(this.uiChangeEvent, function () {
                var val = me.getUIValue();

                var payload = [{ name: propName, value: val }];
                me.$el.trigger(config.events.trigger, { data: payload, source: 'bind' });
            });
        }
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: 'input, select, textarea' });

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var BaseView = __webpack_require__(12);

module.exports = BaseView.extend({
    propertyHandlers: [],

    initialize: function () {}
}, { selector: '*' });

/***/ }),
/* 12 */
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
/* 13 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (immutable) */ __webpack_exports__["extractVariableName"] = extractVariableName;
/* harmony export (immutable) */ __webpack_exports__["parseKeyAlias"] = parseKeyAlias;
/* harmony export (immutable) */ __webpack_exports__["parseValueAlias"] = parseValueAlias;
function extractVariableName(attrVal, $el) {
    var inMatch = attrVal.trim().match(/(.*) (?:in|of) (.*)/);
    var varName = inMatch ? inMatch[2] : attrVal;
    return varName.trim();
}

function parseKeyAlias(attrVal, data) {
    var defaultKey = $.isPlainObject(data) ? 'key' : 'index';
    var inMatch = attrVal.match(/(.*) (?:in|of) (.*)/);
    if (!inMatch) {
        return defaultKey;
    }
    var itMatch = inMatch[1].match(/(.*),(.*)/);
    var alias = itMatch ? itMatch[1].trim() : defaultKey;
    return alias;
}

function parseValueAlias(attrVal) {
    var defaultValueProp = 'value';
    var inMatch = attrVal.match(/(.*) (?:in|of) (.*)/);
    if (!inMatch) {
        return defaultValueProp;
    }

    var itMatch = inMatch[1].match(/(.*),(.*)/);
    var alias = itMatch ? itMatch[2] : inMatch[1];
    return alias.trim();
}

/***/ }),
/* 14 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = extractDependencies;
/* harmony export (immutable) */ __webpack_exports__["b"] = interpolateWithValues;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


var interpolationRegex = /<(.*?)>/g;
/**
 *  
 * @param {String} topic topic to extract dependencies from
 * @return {String[]} dependencies
 */
function extractDependencies(topic) {
    var deps = (topic.match(interpolationRegex) || []).map(function (val) {
        return val.substring(1, val.length - 1);
    });
    return deps;
}

/**
 * @param {String} topic topic with dependencies
 * @param {Object} data object with values of dependencies
 * @return {String} interpolated string
 */
function interpolateWithValues(topic, data) {
    var interpolatedTopic = topic.replace(interpolationRegex, function (match, dependency) {
        var val = data[dependency];
        var toReplace = Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isArray"])(val) ? val[val.length - 1] : val;
        return toReplace;
    });
    return interpolatedTopic;
}

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Flow.js Initialization
 *
 * To use Flow.js in your project, simply call `Flow.initialize()` in your user interface. In the basic case, `Flow.initialize()` can be called without any arguments. While Flow.js needs to know the account, project, and model you are using, by default these values are extracted from the URL of Epicenter project and by the use of `data-f-model` in your `<body>` tag. See more on the [basics of using Flow.js in your project.](../../#using_in_project).
 *
 * However, sometimes you want to be explicit in your initialization call, and there are also some additional parameters that let you customize your use of Flow.js.
 *
 * #### Parameters
 *
 * The parameters for initializing Flow.js include:
 *
 * * `channel` Configuration details for the channel Flow.js uses in connecting with underlying APIs.
 * * `channel.strategy` The run creation strategy describes when to create new runs when an end user visits this page. The default is `new-if-persisted`, which creates a new run when the end user is idle for longer than your project's **Model Session Timeout** (configured in your project's [Settings](../../../updating_your_settings/)), but otherwise uses the current run.. See more on [Run Strategies](../../../api_adapters/generated/strategies/).
 * * `channel.run` Configuration details for each run created.
 * * `channel.run.account` The **User ID** or **Team ID** for this project. By default, taken from the URL where the user interface is hosted, so you only need to supply this is you are running your project's user interface [on your own server](../../../how_to/self_hosting/).
 * * `channel.run.project` The **Project ID** for this project.
 * * `channel.run.model` Name of the primary model file for this project. By default, taken from `data-f-model` in your HTML `<body>` tag.
 * * `channel.run.variables` Configuration options for the variables being listened to on this channel.
 * * `channel.run.variables.silent` Provides granular control over when user interface updates happen for changes on this channel. See below for possible values.
 * * `channel.run.variables.autoFetch` Options for fetching variables from the API as they're being subscribed. See [Variables Channel](../channels/variables-channel/) for details.
 * * `channel.run.operations` Configuration options for the operations being listened to on this channel. Currently there is only one configuration option: `silent`.
 * * `channel.run.operations.silent` Provides granular control over when user interface updates happen for changes on this channel. See below for possible values.
 * * `channel.run.server` Object with additional server configuration, defaults to `host: 'api.forio.com'`.
 * * `channel.run.transport` An object which takes all of the jquery.ajax options at <a href="http://api.jquery.com/jQuery.ajax/">http://api.jquery.com/jQuery.ajax/</a>.
 * * `dom` Configuration options for the DOM where this instance of Flow.js is created.
 * * `dom.root` The root HTML element being managed by the Flow.js DOM Manager. Defaults to `body`.
 * * `dom.autoBind` If `true` (default), automatically parse variables added to the DOM after this `Flow.initialize()` call. Note, this does not work in IE versions < 11.
 *
 * The `silent` configuration option for the `run.variables` and `run.operations` is a flag for providing more granular control over when user interface updates happen for changes on this channel. Values can be:
 *
 * * `false`: Always update the UI for any changes (variables updated, operations called) on this channel. This is the default behavior.
 * * `true`: Never update the UI for any on changes (variables updated, operations called) on this channel.
 * * Array of variables or operations for which the UI *should not* be updated. For example, `variables: { silent: [ 'price', 'sales' ] }` means this channel is silent (no updates for the UI) when the variables 'price' or 'sales' change, and the UI is always updated for any changes to other variables. This is useful if you know that changing 'price' or 'sales' does not impact anything else in the UI directly, for instance.
 * * `except`: With array of variables or operations for which the UI *should* be updated. For example, `variables { silent: { except: [ 'price', 'sales' ] } }` is the converse of the above. The UI is always updated when anything on this channel changes *except* when the variables 'price' or 'sales' are updated.
 *
 * Although Flow.js provides a bi-directional binding between the model and the user interface, the `silent` configuration option applies only for the binding from the model to the user interface; updates in the user interface (including calls to operations) are still sent to the model.
 *
 * The `Flow.initialize()` call is based on the Epicenter.js [Run Service](../../../api_adapters/generated/run-api-service/) from the [API Adapters](../../../api_adapters/). See those pages for additional information on parameters.
 *
 * The `Flow.initialize()` call returns a promise, which is resolved when initialization is complete.
 *
 * #### Example
 *
 *      Flow.initialize({
 *          channel: {
 *              strategy: 'new-if-persisted',
 *              run: {
 *                  model: 'supply-chain-game.py',
 *                  account: 'acme-simulations',
 *                  project: 'supply-chain-game',
 *                  server: { host: 'api.forio.com' },
 *                  variables: { silent: ['price', 'sales'] },
 *                  operations: { silent: false },
 *                  transport: {
 *                      beforeSend: function() { $('body').addClass('loading'); },
 *                      complete: function() { $('body').removeClass('loading'); }
 *                  }
 *              }
 *          }
 *      }).then(function() {
 *          // code that depends on initialization
 *      });
 *
 */

var domManager = __webpack_require__(16);
var BaseView = __webpack_require__(12);

var ChannelManager = __webpack_require__(47).default;

var Flow = {
    dom: domManager,
    utils: {
        BaseView: BaseView
    },
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

        if (config && config.channel && config.channel instanceof ChannelManager) {
            this.channel = config.channel;
        } else {
            this.channel = new ChannelManager(options.channel);
        }

        var prom = domManager.initialize($.extend(true, {
            channel: this.channel
        }, options.dom));

        this.channel.subscribe('operations:reset', function () {
            domManager.unbindAll();
            domManager.bindAll();
        });

        return prom;
    }
};
Flow.ChannelManager = ChannelManager;
//set by grunt
if (true) Flow.version = "0.11.0"; //eslint-disable-line no-undef
module.exports = Flow;

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## DOM Manager
 *
 * The Flow.js DOM Manager provides two-way data bindings from your project's user interface to the channel. The DOM Manager is the 'glue' through which HTML DOM elements -- including the attributes and attribute handlers provided by Flow.js for [variables](../../attributes-overview/), [operations](../../operations-overview/) and [conversion](../../converter-overview/), and those [you create](./attributes/attribute-manager/) -- are bound to the variable and operations [channels](../../channel-overview/) to link them with your project's model. See the [Epicenter architecture details](../../../creating_your_interface/arch_details/) for a visual description of how the DOM Manager relates to the [rest of the Epicenter stack](../../../creating_your_interface/).
 *
 * The DOM Manager is an integral part of the Flow.js architecture but, in keeping with our general philosophy of extensibility and configurability, it is also replaceable. For instance, if you want to manage your DOM state with [Backbone Views](http://backbonejs.org) or [Angular.js](https://angularjs.org), while still using the channels to handle the communication with your model, this is the piece you'd replace. [Contact us](http://forio.com/about/contact/) if you are interested in extending Flow.js in this way -- we'll be happy to talk about it in more detail.
 *
 */


var _ = __webpack_require__(0);

var _require = __webpack_require__(17),
    getConvertersForEl = _require.getConvertersForEl,
    getChannelForAttribute = _require.getChannelForAttribute,
    getChannelConfigForElement = _require.getChannelConfigForElement,
    parseTopicsFromAttributeValue = _require.parseTopicsFromAttributeValue;

var _require2 = __webpack_require__(0),
    pick = _require2.pick;

var config = __webpack_require__(1);
var parseUtils = __webpack_require__(2);

var converterManager = __webpack_require__(21);
var nodeManager = __webpack_require__(30);
var attrManager = __webpack_require__(32);
var autoUpdatePlugin = __webpack_require__(46);

module.exports = function () {
    //Jquery selector to return everything which has a f- property set
    $.expr.pseudos[config.prefix] = function (el) {
        if (!el || !el.attributes) {
            return false;
        }
        for (var i = 0; i < el.attributes.length; i++) {
            var attr = el.attributes[i].nodeName;
            if (attr.indexOf('data-' + config.prefix) === 0) {
                return true;
            }
        }
        return false;
    };

    $.expr.pseudos.webcomponent = function (obj) {
        return obj.nodeName.indexOf('-') !== -1;
    };

    /**
     * @param {JQuery<HTMLElement>} root
     * @return {JQuery<HTMLElement>}
     */
    function getMatchingElements(root) {
        var $root = $(root);
        var matchedElements = $root.find(':' + config.prefix);
        if ($root.is(':' + config.prefix)) {
            matchedElements = matchedElements.add($root);
        }
        return matchedElements;
    }

    /**
     * @param {JQuery<HTMLElement> | HTMLElement} element
     * @param {*} [context]
     * @return {HTMLElement}
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
    function removeAllSubscriptions(subscriptions, channel) {
        [].concat(subscriptions).forEach(function (subs) {
            channel.unsubscribe(subs);
        });
    }
    function unbindAllAttributes(domEl) {
        var $el = $(domEl);
        $(domEl.attributes).each(function (index, nodeMap) {
            var attr = nodeMap.nodeName;
            var wantedPrefix = 'data-f-';
            if (attr.indexOf(wantedPrefix) === 0) {
                attr = attr.replace(wantedPrefix, '');
                var handler = attrManager.getHandler(attr, $el);
                if (handler.unbind) {
                    handler.unbind.call($el, attr, $el);
                }
            }
        });
    }
    function unbindAllNodeHandlers(domEl) {
        var $el = $(domEl);
        //FIXME: have to readd events to be able to remove them. Ugly
        var Handler = nodeManager.getHandler($el);
        var h = new Handler.handle({
            el: domEl
        });
        if (h.removeEvents) {
            h.removeEvents();
        }
    }

    var publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,
        converters: converterManager,

        matchedElements: new Map(),

        /**
         * Unbind the element; unsubscribe from all updates on the relevant channels.
         *
         * @param {JQuery<HTMLElement> | HTMLElement} element The element to remove from the data binding.
         * @param {ChannelInstance} channel (Optional) The channel from which to unsubscribe. Defaults to the [variables channel](../channels/variables-channel/).
         * @returns {void}
         */
        unbindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            var domEl = getElementOrError(element);
            var $el = $(element);
            var existingData = this.matchedElements.get(domEl);
            if (!$el.is(':' + config.prefix) || !existingData) {
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
            removeAllSubscriptions(subscriptions, channel);

            var animAttrs = Object.keys(config.animation).join(' ');
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
         * @param {JQuery<HTMLElement>} element The element to add to the data binding.
         * @param {ChannelInstance} channel (Optional) The channel to subscribe to. Defaults to the [run channel](../channels/run-channel/).
         * @returns {void}
         */
        bindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            // this.unbindElement(element); //unbind actually removes the data,and jquery doesn't refetch when .data() is called..
            var domEl = getElementOrError(element);
            var $el = $(domEl);
            if (!$el.is(':' + config.prefix)) {
                return;
            }

            //Send to node manager to handle ui changes
            var Handler = nodeManager.getHandler($el);
            new Handler.handle({
                el: domEl
            });

            var filterPrefix = 'data-' + config.prefix + '-';
            var attrList = {};
            $(domEl.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                if (attr.indexOf(filterPrefix) !== 0) {
                    return;
                }
                attr = attr.replace(filterPrefix, '');

                var attrVal = nodeMap.value;
                var handler = attrManager.getHandler(attr, $el);
                if (handler && handler.parse) {
                    attrVal = handler.parse(attrVal, $el); //Parse value to return variable name
                }

                var initVal = handler && handler.init && handler.init.call($el, attr, attrVal, $el);
                var isBindable = initVal !== false;

                var converters = getConvertersForEl($el, attr);

                var topics = parseTopicsFromAttributeValue(attrVal);
                if (topics && topics.length) {
                    var channelPrefix = getChannelForAttribute($el, attr);
                    if (channelPrefix) {
                        topics = topics.map(function (v) {
                            var hasChannelDefined = v.indexOf(':') !== -1;
                            return hasChannelDefined ? v : channelPrefix + ':' + v;
                        });
                    }
                    var channelConfig = getChannelConfigForElement(domEl);
                    attrList[attr] = {
                        isBindable: isBindable,
                        channelPrefix: channelPrefix,
                        channelConfig: channelConfig,
                        topics: topics,
                        converters: converters
                    };
                }
            });
            //Need this to be set before subscribing or callback maybe called before it's set
            this.matchedElements.set(domEl, attrList);

            var attrsWithSubscriptions = Object.keys(attrList).reduce(function (accum, name) {
                var attr = attrList[name];
                var topics = attr.topics,
                    channelPrefix = attr.channelPrefix,
                    channelConfig = attr.channelConfig,
                    isBindable = attr.isBindable;

                if (!isBindable) {
                    accum[name] = attr;
                    return accum;
                }

                var subsOptions = $.extend({ batch: true }, channelConfig);
                var subsid = channel.subscribe(topics, function (data) {
                    var toConvert = {};
                    if (topics.length === 1) {
                        //If I'm only interested in 1 thing pass in value directly, else mke a map;
                        toConvert[name] = data[topics[0]];
                    } else {
                        var dataForAttr = pick(data, topics) || {};
                        toConvert[name] = Object.keys(dataForAttr).reduce(function (accum, key) {
                            //If this was through a 'hidden' channel attr return what was bound
                            var toReplace = new RegExp('^' + channelPrefix + ':');
                            var k = channelPrefix ? key.replace(toReplace, '') : key;
                            accum[k] = dataForAttr[key];
                            return accum;
                        }, {});
                    }
                    $el.trigger(config.events.convert, toConvert);
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
            if (!elementsToBind) {
                elementsToBind = getMatchingElements(this.options.root);
            } else if (!Array.isArray(elementsToBind)) {
                elementsToBind = getMatchingElements(elementsToBind);
            }

            var me = this;
            //parse through dom and find everything with matching attributes
            $.each(elementsToBind, function (index, element) {
                me.bindElement(element, me.options.channel);
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
                 * @type {String} jQuery selector
                 */
                root: 'body',
                channel: null,

                /**
                 * Any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.
                 * @type {Boolean}
                 */
                autoBind: true
            };
            $.extend(defaults, options);

            var channel = defaults.channel;

            this.options = defaults;

            var me = this;
            var $root = $(defaults.root);

            var DEFAULT_OPERATIONS_PREFIX = 'operations:';
            var DEFAULT_VARIABLES_PREFIX = 'variables:';

            //TODO: Merge the two listeners and just have prefix by 'source';
            //TODO: ONce it's merged, support && for multiple operations and | to pipe to converters
            function attachUIVariablesListener($root) {
                $root.off(config.events.trigger).on(config.events.trigger, function (evt, params) {
                    var elMeta = me.matchedElements.get(evt.target);
                    if (!elMeta) {
                        return;
                    }

                    var data = params.data,
                        source = params.source,
                        options = params.options;

                    var _ref = elMeta[source] || {},
                        converters = _ref.converters,
                        channelPrefix = _ref.channelPrefix;

                    var $el = $(evt.target);

                    var parsed = [];
                    data.forEach(function (d) {
                        var value = d.value,
                            name = d.name;

                        var converted = converterManager.parse(value, converters);
                        var typed = parseUtils.toImplicitType(converted);

                        var key = name.split('|')[0].trim(); //in case the pipe formatting syntax was used
                        var canPrefix = key.indexOf(':') === -1 || key.indexOf(DEFAULT_VARIABLES_PREFIX) === 0;
                        if (canPrefix && channelPrefix) {
                            key = channelPrefix + ':' + key;
                        }
                        parsed.push({ name: key, value: typed });

                        var convertParams = {};
                        convertParams[source] = typed;
                        $el.trigger(config.events.convert, convertParams);
                    });
                    channel.publish(parsed, options);
                });
            }

            function attachUIOperationsListener($root) {
                $root.off(config.events.operate).on(config.events.operate, function (evt, params) {
                    var elMeta = me.matchedElements.get(evt.target);
                    if (!elMeta) {
                        return;
                    }
                    var data = params.data,
                        source = params.source,
                        options = params.options;

                    var sourceMeta = elMeta[source] || {};

                    var filtered = [].concat(data || []).reduce(function (accum, operation) {
                        var val = operation.value;
                        if (Array.isArray(val)) {
                            operation.value = val.map(function (val) {
                                return parseUtils.toImplicitType(val);
                            });
                        } else {
                            operation.value = parseUtils.toImplicitType(val);
                        }

                        var isConverter = converterManager.getConverter(operation.name);
                        if (isConverter) {
                            accum.converters.push(operation);
                        } else {
                            if (operation.name.indexOf(':') === -1) {
                                operation.name = '' + DEFAULT_OPERATIONS_PREFIX + operation.name;
                            }
                            if (operation.name.indexOf(DEFAULT_OPERATIONS_PREFIX) === 0 && sourceMeta.channelPrefix) {
                                operation.name = sourceMeta.channelPrefix + ':' + operation.name;
                            }
                            accum.operations.push(operation);
                        }
                        return accum;
                    }, { operations: [], converters: [] });

                    var promise = filtered.operations.length ? channel.publish(filtered.operations, options) : $.Deferred().resolve().promise();

                    //FIXME: Needed for the 'gotopage' in interfacebuilder. Remove this once we add a window channel
                    promise.then(function (args) {
                        filtered.converters.forEach(function (con) {
                            converterManager.convert(con.value, [con.name]);
                        });
                    });
                });
            }

            function attachConversionListner($root) {
                // data = {proptoupdate: value} || just a value (assumes 'bind' if so)
                $root.off(config.events.convert).on(config.events.convert, function (evt, data) {
                    var $el = $(evt.target);

                    var elMeta = me.matchedElements.get(evt.target);
                    if (!elMeta) {
                        return;
                    }
                    function convert(val, prop) {
                        var attrConverters = elMeta[prop].converters;

                        var handler = attrManager.getHandler(prop, $el);
                        var convertedValue = converterManager.convert(val, attrConverters);
                        handler.handle.call($el, convertedValue, prop, $el);
                    }

                    if ($.isPlainObject(data)) {
                        _.each(data, convert);
                    } else {
                        convert(data, 'bind');
                    }
                });
            }

            var promise = $.Deferred();
            $(function () {
                me.bindAll();

                attachUIVariablesListener($root);
                attachUIOperationsListener($root);
                attachConversionListner($root);

                me.plugins.autoBind = autoUpdatePlugin($root.get(0), me, me.options.autoBind);

                promise.resolve($root);
                $root.trigger('f.domready');
            });

            return promise;
        }
    };

    return $.extend(this, publicAPI);
}();

/***/ }),
/* 17 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__parse_converters__ = __webpack_require__(18);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__parse_channel__ = __webpack_require__(19);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__parse_topics__ = __webpack_require__(20);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "getConvertersForEl", function() { return __WEBPACK_IMPORTED_MODULE_0__parse_converters__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "getChannelForAttribute", function() { return __WEBPACK_IMPORTED_MODULE_1__parse_channel__["b"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "getChannelConfigForElement", function() { return __WEBPACK_IMPORTED_MODULE_1__parse_channel__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "parseTopicsFromAttributeValue", function() { return __WEBPACK_IMPORTED_MODULE_2__parse_topics__["a"]; });






/***/ }),
/* 18 */
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
function findConvertersForEl($el) {
    var conv = $el.attr('data-f-convert'); //.data shows value cached by jquery
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
        if (whiteListedGenericAttributes.indexOf(attribute) === -1) {
            return [];
        }

        var convertersOnElement = findConvertersForEl($el);
        if (convertersOnElement.length) {
            return convertersOnElement;
        }

        return [];
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
/* 19 */
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
 * @return {Object}
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
/* 20 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = parseTopicsFromAttributeValue;
/**
 * @param {string} attrVal 
 * @returns {string[]} variables
 */
function parseTopicsFromAttributeValue(attrVal) {
    var commaRegex = /,(?![^[]*])/;
    var topicsPart = attrVal.split('|')[0];
    if (topicsPart.indexOf('<%') !== -1) {
        //Assume it's templated for later use
        return;
    }
    if (topicsPart.split(commaRegex).length > 1) {
        return topicsPart.split(commaRegex).map(function (v) {
            return v.trim();
        });
    }
    return [topicsPart.trim()];
}

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Converter Manager: Make your own Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * Basic converting and formatting options are built in to Flow.js.
 *
 * You can also create your own converters. Each converter should be a function that takes in a value or values to convert. To use your converter, `register()` it in your instance of Flow.js.
 *
 */

var _ = __webpack_require__(0);

var _require = __webpack_require__(0),
    isFunction = _require.isFunction,
    isString = _require.isString,
    isRegExp = _require.isRegExp,
    find = _require.find,
    mapValues = _require.mapValues;

var _require2 = __webpack_require__(2),
    splitNameArgs = _require2.splitNameArgs,
    toImplicitType = _require2.toImplicitType;

var normalize = function (alias, converter, acceptList) {
    var ret = [];
    //nomalize('flip', fn)
    if (isFunction(converter)) {
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
    if (isString(converter.alias)) {
        return alias === converter.alias;
    } else if (isFunction(converter.alias)) {
        return converter.alias(alias);
    } else if (isRegExp(converter.alias)) {
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
     * @param  {string|function|RegExp} alias Formatter name.
     * @param  {function|object} [converter] If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
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
     * @param {function|object} converter If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
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
        var norm = splitNameArgs(alias);
        norm.args = norm.args.map(toImplicitType);

        var conv = find(this.list, function (converter) {
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
     * @return {*} Converted value.
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
            return _.map(val, function (v) {
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
            return mapValues(value, function (val) {
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
     * @return {*} Original value.
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
            if (converter.parse) {
                currentValue = converter.parse(currentValue, converterName);
            }
        });
        return currentValue;
    }
};

//Bootstrap
var defaultconverters = [__webpack_require__(22), __webpack_require__(23), __webpack_require__(24), __webpack_require__(25), __webpack_require__(26), __webpack_require__(27), __webpack_require__(28), __webpack_require__(29)];

defaultconverters.reverse().forEach(function (converter) {
    if (Array.isArray(converter)) {
        converter.forEach(function (c) {
            converterManager.register(c);
        });
    } else {
        converterManager.register(converter);
    }
});

module.exports = converterManager;

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## Number Converters
 *
 * Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
 * * Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.
 *
 */



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
   * @return {number}
   */
  convert: function (value) {
    return parseFloat(value);
  }
};

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## String Converters
 *
 * Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
 * * Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.
 *
 * For model variables that are strings (or that have been converted to strings), there are several special string formats you can apply.
 */



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
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Array Converters
 *
 * Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
 * * Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.
 *
 * In general, if the model variable is an array, the converter is applied to each element of the array. There are a few built in array converters which, rather than converting all elements of an array, select particular elements from within the array or otherwise treat array variables specially.
 *
 */

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
     * @return {number}     length of array
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
     * @return {any[]}            shortened array
     */
    pickEvery: function (n, startIndex, val) {
        if (arguments.length === 3) {
            //eslint-disable-line
            //last item is match string
            val = startIndex;
            startIndex = n - 1;
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
/* 25 */
/***/ (function(module, exports) {

function parseArgs(toCompare, trueVal, falseVal, valueToCompare, matchString) {
    var toReturn = { trueVal: true, falseVal: false };
    switch (arguments.length) {
        case 5:
            //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, falseVal: falseVal, input: valueToCompare });
        case 4:
            //eslint-disable-line
            return $.extend(toReturn, { trueVal: trueVal, input: falseVal });
        case 3:
            //eslint-disable-line
            return $.extend(toReturn, { input: trueVal });
        default:
            return toReturn;
    }
}

module.exports = [{
    alias: 'is',
    acceptList: true,
    convert: function (toCompare) {
        var args = parseArgs.apply(null, arguments);
        return args.input === toCompare ? args.trueVal : args.falseVal;
    }
}];

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Number Format Converters
 *
 * Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
 * * Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.
 *
 * For model variables that are numbers (or that have been [converted to numbers](../number-converter/)), there are several special number formats you can apply.
 *
 * #### Currency Number Format
 *
 * After the `|` (pipe) character, use `$` (dollar sign), `0`, and `.` (decimal point) in your converter to describe how currency should appear. The specifications follow the Excel currency formatting conventions.
 *
 * **Example**
 *
 *      <!-- convert to dollars (include cents) -->
 *      <input type="text" data-f-bind="price[car]" data-f-convert="$0.00" />
 *      <input type="text" data-f-bind="price[car] | $0.00" />
 *
 *      <!-- convert to dollars (truncate cents) -->
 *      <input type="text" data-f-bind="price[car]" data-f-convert="$0." />
 *      <input type="text" data-f-bind="price[car] | $0." />
 *
 *
 * #### Specific Digits Number Format
 *
 * After the `|` (pipe) character, use `#` (pound) and `,` (comma) in your converter to describe how the number should appear. The specifications follow the Excel number formatting conventions.
 *
 * **Example**
 *
 *      <!-- convert to thousands -->
 *      <input type="text" data-f-bind="sales[car]" data-f-convert="#,###" />
 *      <input type="text" data-f-bind="sales[car] | #,###" />
 *
 *
 * #### Percentage Number Format
 *
 * After the `|` (pipe) character, use `%` (percent) and `0` in your converter to display the number as a percent.
 *
 * **Example**
 *
 *      <!-- convert to percentage -->
 *      <input type="text" data-f-bind="profitMargin[car]" data-f-convert="0%" />
 *      <input type="text" data-f-bind="profitMargin[car] | 0%" />
 *
 *
 * #### Short Number Format
 *
 * After the `|` (pipe) character, use `s` and `0` in your converter to describe how the number should appear.
 *
 * The `0`s describe the significant digits.
 *
 * The `s` describes the "short format," which uses 'K' for thousands, 'M' for millions, 'B' for billions. For example, `2468` converted with `s0.0` displays as `2.5K`.
 *
 * **Example**
 *
 *      <!-- convert to thousands (show 12,468 as 12.5K) -->
 *      <span type="text" data-f-bind="price[car] | s0.0"></span>
 *
 */

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

            var isValidFirstChar = validFirstChars.indexOf(v.charAt(0)) !== -1 || isAllowedLeading(v.charAt(0));
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
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## Number Comparison Converters
 *
 * Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.
 *
 * For a number comparison converter, the original format is your model variable, and the resulting "format" is a (possibly unrelated) value of your choosing. This resulting value is selected based on how the value of the model variable compares to a reference value that you pass to the converter.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
 * * Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.
 *
 * For example:
 *
 *      <!-- displays "true" or the number of widgets -->
 *      <span data-f-bind="widgets | greaterThan(50)"></span>
 *
 *      <!-- displays the first string if true, the second if false -->
 *      <span data-f-bind="widgets | greaterThan(50, 'nice job!', 'not enough widgets')"></span>
 *
 * You can also chain multiple converters to simulate evaluating multiple if\else conditions; for e.g. the following logic
 *
 *      if (temperature > 80) {
 *          return 'hot';
 *      } else if (temperature > 60) {
 *          return 'pleasant';
 *      } else if (temperature >= 30) {
 *          return 'cold';
 *      } else {
 *          return 'freezing!';
 *      }
 *
 * can be represented as
 *
 *      <h4 data-f-bind="temperature | greaterThan(80, hot) | greaterThan(60, pleasant) | greaterThanEqual(30, cold, freezing!)"></h4>
 */



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
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is greater than `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {Any} If the model variable is greater than `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
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
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is greater than or equal to `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {Any} If the model variable is greater than or equal to `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
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
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is equal to `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is not equal to `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {Any} If the model variable equals `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
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
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is less than `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {Any} If the model variable is less than `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
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
     * @param {Number} limit The reference value to compare the model variable against.
     * @param {String} trueVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is `true`. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The format (value) to display if the model variable is less than or equal to `limit`. If not included, the display is the value of the model variable. If there are commas in this argument, they must be escaped with `\`.
     * @return {Any} If the model variable is less than or equal to `limit`, returns trueVal or `true`. Otherwise returns falseVal if provided, or echoes the input.
     */
    lessThanEqual: function (limit) {
        var args = parseArgs.apply(null, arguments);
        return Number(args.input) <= Number(limit) ? args.trueVal : args.falseVal;
    }
};

/***/ }),
/* 28 */
/***/ (function(module, exports) {

/**
 * ## Boolean Conditional Converters
 *
 * Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.
 *
 * For a boolean conditional converter, the original format is your model variable, and the resulting "format" is a boolean value, or another value of your choosing.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
 * * Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.
 *
 * For example:
 *
 *      <!-- displays "true" or "false" -->
 *      <!-- in particular, true if sampleVar is truthy (1, true, 'some string', [] etc.), 
 *            false if sampleVar is falsy (0, false, '') -->
 *      <span data-f-bind="sampleVar | toBool"></span>
 *
 */

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
     * @return {Boolean}
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
     * @return {Boolean}
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
     * @param {String} trueVal The value to display if the input is true. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The value to display if the input is false. If not included, returns the input. If there are commas in this argument, they must be escaped with `\`.
     * @param {Any} input (Optional) The input to test. If not included, the output of the previous argument is used.
     * @return {Any} If input is true, returns trueVal. If input is false, returns falseVal if provided, or echoes the input.
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
     * @param {String} trueVal The value to display if the input is false. If there are commas in this argument, they must be escaped with `\`.
     * @param {String} falseVal (Optional) The value to display if the input is true. If not included, returns the input. If there are commas in this argument, they must be escaped with `\`.
     * @param {Any} input (Optional) The input to test. If not included, the output of the previous argument is used.
     * @return {Any} If input is false, returns trueVal. If input is true, returns falseVal if provided, or echoes the input.
     */
    ifFalse: function () {
        var args = parseArgs.apply(null, arguments);
        return !args.input ? args.trueVal : args.falseVal;
    }
};

/***/ }),
/* 29 */
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
     * @return {any[]}     filtered lsit
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
     * @return {any[]}     filtered lsit
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
     * @param  {string|object} value value to check for
     * @param  {any[]} source The arrayed model variable
     * @return {boolean}     True if match found in array
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
     * @param  {string|object} value value to check for
     * @param  {any[]} source The arrayed model variable
     * @return {boolean}     True if match found in array
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
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

var _ = __webpack_require__(0);

var _require = __webpack_require__(0),
    isString = _require.isString,
    isFunction = _require.isFunction;
/**
 * @typedef NodeHandler
 * @property {string} selector
 * @property {Function} handle
 */

/**
 * @param {string | undefined} selector
 * @param {Function | NodeHandler } handler
 * @return {NodeHandler}
 */


var normalize = function (selector, handler) {
    if (!selector) {
        selector = '*';
    }
    if (isFunction(handler)) {
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
 * @return {boolean}
 */
var match = function (toMatch, node) {
    if (isString(toMatch)) {
        return toMatch === node.selector;
    }
    return $(toMatch).is(node.selector);
};

var nodeManager = {
    list: [],

    /**
     * Add a new node handler
     * @param  {string} selector jQuery-compatible selector to use to match nodes
     * @param  {function} handler  Handlers are new-able functions. They will be called with $el as context.? TODO: Think this through
     * @returns {void}
     */
    register: function (selector, handler) {
        this.list.unshift(normalize(selector, handler));
    },

    /**
     * @param {string|HTMLElement|JQuery<HTMLElement>} selector
     * @return NodeHandler
     */
    getHandler: function (selector) {
        return _.find(this.list, function (node) {
            return match(selector, node);
        });
    },

    replace: function (selector, handler) {
        var index;
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
var defaultHandlers = [__webpack_require__(31), __webpack_require__(10), __webpack_require__(11)];
defaultHandlers.reverse().forEach(function (handler) {
    nodeManager.register(handler.selector, handler);
});

module.exports = nodeManager;

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var BaseView = __webpack_require__(10);

module.exports = BaseView.extend({

    propertyHandlers: [],

    getUIValue: function () {
        var $el = this.$el;
        var offVal = typeof $el.data('f-off') !== 'undefined' ? $el.data('f-off') : false;
        //attr = initial value, prop = current value
        var onVal = typeof $el.attr('value') !== 'undefined' ? $el.prop('value') : true;

        var val = $el.is(':checked') ? onVal : offVal;
        return val;
    },
    initialize: function () {
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: ':checkbox,:radio' });

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Attribute Manager
 *
 * Flow.js provides a set of custom DOM attributes that serve as a data binding between variables and operations in your project's model and HTML elements in your project's user interface. Under the hood, Flow.js is doing automatic conversion of these custom attributes, like `data-f-bind`, into HTML specific to the attribute's assigned value, like the current value of `myModelVar`.
 *
 * If you are looking for examples of using particular attributes, see the [specific attributes subpages](../../../../attributes-overview/).
 *
 * If you would like to extend Flow.js with your own custom attributes, you can add them to Flow.js using the Attribute Manager.
 *
 * The Attribute Manager is specific to adding custom attributes and describing their implementation (handlers). (The [Dom Manager](../../) contains the general implementation.)
 *
 *
 * **Examples**
 *
 * Built-in attribute handlers like `data-f-value` and `data-f-foreach` automatically bind variables in your project's model to particular HTML elements. However, your UI may sometimes require displaying only part of the variable (e.g. if it's an object), or "doing something" with the value of the variable, rather than simply displaying it.
 *
 * One example of when custom attribute handlers are useful is when your model variable is a complex object and you want to display the fields in a particular way, or you only want to display some of the fields. While the combination of the [`data-f-foreach` attribute](../loop-attrs/foreach-attr/) and [templating](../../../../#templates) can help with this, sometimes it's easier to write your own attribute handler. (This is especially true if you will be reusing the attribute handler -- you won't have to copy your templating code over and over.)
 *
 *      Flow.dom.attributes.register('showSched', '*', function (sched) {
 *            // display all the schedule milestones
 *            // sched is an object, each element is an array
 *            // of ['Formal Milestone Name', milestoneMonth, completionPercentage]
 *
 *            var schedStr = '<ul>';
 *            var sortedSched = sortBy(sched, function(el) { return el[1]; });
 *
 *            for (var i = 0; i < sortedSched.length; i++) {
 *                  schedStr += '<li><strong>' + sortedSched[i][0]
 *                        + '</strong> currently scheduled for <strong>Month '
 *                        + sortedSched[i][1] + '</strong></li>';
 *            }
 *            schedStr += '</ul>';
 *
 *            this.html(schedStr);
 *      });
 *
 * Then, you can use the attribute handler in your HTML just like other Flow.js attributes:
 *
 *      <div data-f-showSched="schedule"></div>
 *
 */

var _require = __webpack_require__(0),
    isString = _require.isString,
    isFunction = _require.isFunction,
    isRegExp = _require.isRegExp,
    filter = _require.filter,
    each = _require.each;

var defaultHandlers = [__webpack_require__(33), __webpack_require__(34), __webpack_require__(35), __webpack_require__(36), __webpack_require__(37), __webpack_require__(38), __webpack_require__(39), __webpack_require__(40), __webpack_require__(41), __webpack_require__(42), __webpack_require__(43), __webpack_require__(44), __webpack_require__(45)];

/**
 * @typedef AttributeHandler
 * @property {string|Function|RegExp} test
 * @property {Function} handle
 * @property {string|JQuery<HTMLElement>} target
 */

var handlersList = [];

var normalize = function (attributeMatcher, nodeMatcher, handler) {
    if (!nodeMatcher) {
        nodeMatcher = '*';
    }
    if (isFunction(handler)) {
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
    var attrMatch;

    if (isString(matchExpr)) {
        attrMatch = matchExpr === '*' || matchExpr.toLowerCase() === attr.toLowerCase();
    } else if (isFunction(matchExpr)) {
        //TODO: remove element selectors from attributes
        attrMatch = matchExpr(attr, $el);
    } else if (isRegExp(matchExpr)) {
        attrMatch = attr.match(matchExpr);
    }
    return attrMatch;
};

var matchNode = function (target, nodeFilter) {
    return isString(nodeFilter) ? nodeFilter === target : nodeFilter.is(target);
};

module.exports = {
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
     * @return {Array|Null} An array of matching attribute handlers, or null if no matches found.
     */
    filter: function (attrFilter, nodeFilter) {
        var filtered = filter(handlersList, function (handler) {
            return matchAttr(handler.test, attrFilter);
        });
        if (nodeFilter) {
            filtered = filter(filtered, function (handler) {
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
        var index;
        each(handlersList, function (currentHandler, i) {
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
     * @param {string} property The attribute.
     * @param {JQuery<HTMLElement>} $el The DOM element.
     *
     * @return {Object} The attribute handler.
     */
    getHandler: function (property, $el) {
        var filtered = this.filter(property, $el);
        //There could be multiple matches, but the top first has the most priority
        return filtered[0];
    }
};

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## No-op Attributes
 *
 * Flow.js provides special handling for both `data-f-model` (described [here](../../../../#using_in_project)) and `data-f-convert` (described [here](../../../../converter-overview/)). For these attributes, the default behavior is to do nothing, so that this additional special handling can take precendence.
 *
 */



// Attributes which are just parameters to others and can just be ignored

module.exports = {

    target: '*',

    test: /^(?:model|convert|channel|on-init)/i,

    handle: $.noop,

    init: function () {
        return false;
    }
};

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## Call Operation in Response to User Action
 *
 * Many models call particular operations in response to end user actions, such as clicking a button or submitting a form.
 *
 * #### data-f-on-event
 *
 * For any HTML attribute using `on` -- typically on click or on submit -- you can add the attribute `data-f-on-XXX`, and set the value to the name of the operation. To call multiple operations, use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed.
 *
 * **Example**
 *
 *      <button data-f-on-click="reset">Reset</button>
 *
 *      <button data-f-on-click="step(1)">Advance One Step</button>
 *
 */



var config = __webpack_require__(1);
var toPublishableFormat = __webpack_require__(2).toPublishableFormat;

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return attr.indexOf('on-') === 0;
    },

    unbind: function (attr) {
        var eventName = attr.replace('on-', '');
        this.off(eventName);
    },

    init: function (attr, value) {
        var eventName = attr.replace('on-', '');
        var me = this;
        this.off(eventName).on(eventName, function (evt) {
            evt.preventDefault();
            var listOfOperations = toPublishableFormat(value);
            me.trigger(config.events.operate, { data: listOfOperations, source: attr });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * ## Display Array and Object Variables: data-f-foreach
 *
 * If your model variable is an array, you can reference specific elements of the array using `data-f-bind`: `data-f-bind="sales[3]"` or `data-f-bind="sales[<currentRegion>]"`, as described under [data-f-bind](../../binds/default-bind-attr/).
 *
 * However, sometimes you want to loop over *all* of the children of the referenced variable. The `data-f-foreach` attribute allows you to automatically loop over all the 'children' of a referenced variable &mdash; that is, all the elements of an array, or all the fields of an object.
 *
 * You can use the `data-f-foreach` attribute to name the variable, then use a combination of templates and aliases to access the index and value of each child for display. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)
 *
 * **To display a DOM element based on an array variable from your model:**
 *
 * 1. Add the `data-f-foreach` attribute to any HTML element that has repeated sub-elements. The two most common examples are lists and tables. The `data-f-foreach` goes on the enclosing element. For a list, this is the `<ul>`, and for a table, it's the `<tbody>`.
 * 2. Set the value of the `data-f-foreach` attribute in your top-level HTML element to reference the model array variable. You can do this either with or without introducing an alias to reference the array elements: `<ul data-f-foreach="Time"></ul>` or `<ul data-f-foreach="t in Time"></ul>`.
 * 3. Add the HTML in which the value of your model array variable should appear. Optionally, inside this inner HTML element, you can use templates (`<%= %>`) to reference the `index` (for arrays) or `key` (for objects) and `value` to display, or to reference the alias you introduced. The `index`, `key`, and `value` are special variables that Flow.js populates for you. 
 *
 *
 * **Examples:**
 *
 * **Basic use of data-f-foreach.** Start with an HTML element that has repeated sub-elements. Add the model variable to this HTML element. Then, add the HTML sub-element where your model variable should appear. 
 *
 * By default, the `value` of the array element or object field is automatically added to the generated HTML:
 *
 *      <!-- the model variable Time is an array of years
 *          create a list that shows which year -->
 *
 *      <ul data-f-foreach="Time">
 *          <li></li>
 *      </ul>
 *
 * In the third step of the model, this example generates the HTML:
 *
 *      <ul data-f-foreach="Time">
 *            <li>2015</li>
 *            <li>2016</li>
 *            <li>2017</li>
 *      </ul>
 *
 * which appears as:
 *
 *      * 2015
 *      * 2016
 *      * 2017
 *
 * **Add templates to reference the index and value.** Optionally, you can use templates (`<%= %>`) to reference the `index` and `value` of the array element to display.
 *
 *      <!-- the model variable Time is an array of years
 *          create a list that shows which year -->
 *
 *      <ul data-f-foreach="Time">
 *          <li> Year <%= index %>: <%= value %> </li>
 *      </ul>
 *
 * In the third step of the model, this example generates:
 *
 *      <ul data-f-foreach="Time">
 *          <li>Year 1: 2015</li>
 *          <li>Year 2: 2016</li>
 *          <li>Year 3: 2017</li>
 *      </ul>
 *
 * which appears as:
 *
 *      * Year 1: 2015
 *      * Year 2: 2016
 *      * Year 3: 2017
 *
 *
 * **Add an alias for the value.** Alternatively, you can add an alias when you initially introduce your model array variable, then reference that alias within templates (`<%= %>`). For example:
 *
 *      <ul data-f-foreach="f in Fruits">
 *          <li> <%= f %> </li>
 *      </ul>
 *
 * which generates:
 *
 *      <ul data-f-foreach="f in Fruits">
 *          <li> apples </li>
 *          <li> bananas </li>
 *          <li> cherries </li>
 *          <li> oranges </li>
 * 
 * **Nesting with aliases.** An advantage to introducing aliases is that you can nest HTML elements that have repeated sub-elements. For example:
 *
 *      <!-- given Sales, an array whose elements are themselves arrays of the sales for each Region -->
 *      <ul data-f-foreach="r in Regions">
 *          <li>Region <%= r %>: 
 *              <ul data-f-foreach="s in Sales[<%= r %>]">
 *                  <li>Sales <%= s %></li>
 *              </ul>
 *          </li>
 *      </ul>
 *
 * **Logic, data processing.** Finally, note that you can add logic to the display of your data by combining templating with either the `value` or an alias. For example, suppose you only want to display the sales total if it is greater than 250:
 *
 *      <table>
 *          <tbody data-f-foreach="r in regions">
 *              <tr data-f-foreach="s in sales">
 *                  <td><%= r + ": " %> <%= (s > 250) ? s : "sales below threshold" %></td>
 *              </tr>
 *          </tbody>
 *      </table>
 *
 * (However, if you want to completely hide the table cell for the region if the sales total is too low, you still need to [write your own converter](../../../../../converter-overview).)
 *
 * **Notes:**
 *
 * * You can use the `data-f-foreach` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
 * * You can use nested `data-f-foreach` attributes to created nested loops of your data. 
 * * The `data-f-foreach`, whether using aliases or not, goes on the enclosing element. For a list, this is the `<ul>`, and for a table, it's the `<tbody>`.
 * * The template syntax is to enclose each code fragment (including `index`, `key`, `variable`, or alias) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).
 * * The `key`, `index`, and `value` are special variables that Flow.js populates for you. However, they are *no longer available* if you use aliases.
 * * As with other `data-f-` attributes, you can specify [converters](../../../../../converter-overview) to convert data from one form to another:
 *
 *          <ul data-f-foreach="Sales | $x,xxx">
 *              <li> Year <%= index %>: Sales of <%= value %> </li>
 *          </ul>
 *
 * * The `data-f-foreach` attribute is [similar to the `data-f-repeat` attribute](../../loop-attrs/repeat-attr/), so you may want to review the examples there as well.
 */
var parseUtils = __webpack_require__(2);
var config = __webpack_require__(1);

var _require = __webpack_require__(13),
    extractVariableName = _require.extractVariableName,
    parseKeyAlias = _require.parseKeyAlias,
    parseValueAlias = _require.parseValueAlias;

var _require2 = __webpack_require__(7),
    addChangeClassesToList = _require2.addChangeClassesToList;

var _require3 = __webpack_require__(0),
    each = _require3.each,
    template = _require3.template;

var _require4 = __webpack_require__(8),
    getKnownDataForEl = _require4.getKnownDataForEl,
    updateKnownDataForEl = _require4.updateKnownDataForEl,
    removeKnownData = _require4.removeKnownData,
    findMissingReferences = _require4.findMissingReferences,
    stubMissingReferences = _require4.stubMissingReferences,
    addBackMissingReferences = _require4.addBackMissingReferences;

var elTemplateMap = new WeakMap();
var elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

module.exports = {

    test: 'foreach',

    target: '*',

    unbind: function (attr, $el) {
        var el = $el.get(0);
        elAnimatedMap.delete(el);

        var template = elTemplateMap.get(el);
        if (template) {
            $el.html(template);
            elTemplateMap.delete(el);
        }

        removeKnownData($el);
    },

    //provide variable name from bound
    parse: function (attrVal) {
        return extractVariableName(attrVal);
    },

    handle: function (value, prop, $el) {
        value = $.isPlainObject(value) ? value : [].concat(value);

        var el = $el.get(0);
        var originalHTML = elTemplateMap.get(el);
        if (!originalHTML) {
            originalHTML = $el.html().replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            elTemplateMap.set(el, originalHTML);
        }

        var attrVal = $el.data('f-' + prop);
        var keyAttr = parseKeyAlias(attrVal, value);
        var valueAttr = parseValueAlias(attrVal, value);

        // Go through matching template tags and make a list of references you don't know about
        //  -- replace with a comment ref id, or lodash will break on missing references
        // Try templating data with what you know
        //  -- if success, nothing to do
        //  -- if fail, store your data and wait for someone else to take it and template
        // 
        var knownData = getKnownDataForEl($el);
        var missingReferences = findMissingReferences(originalHTML, [keyAttr, valueAttr].concat(Object.keys(knownData)));
        var stubbedTemplate = stubMissingReferences(originalHTML, missingReferences);

        var templateFn = template(stubbedTemplate);
        var $dummyEl = $('<div></div>');
        each(value, function (dataval, datakey) {
            var _$$extend;

            if (dataval === undefined || dataval === null) {
                dataval = dataval + ''; //convert undefineds to strings
            }
            var templateData = $.extend(true, {}, knownData, (_$$extend = {}, _defineProperty(_$$extend, keyAttr, datakey), _defineProperty(_$$extend, valueAttr, dataval), _$$extend));

            var nodes = void 0;
            var isTemplated = void 0;
            try {
                var templated = templateFn(templateData);
                var templatedWithReferences = addBackMissingReferences(templated, missingReferences);
                isTemplated = templatedWithReferences !== stubbedTemplate;
                nodes = $(templatedWithReferences);
            } catch (e) {
                //you don't have all the references you need;
                nodes = $(stubbedTemplate);
                isTemplated = true;
                updateKnownDataForEl($(nodes), templateData);
            }

            nodes.each(function (i, newNode) {
                var $newNode = $(newNode);
                each($newNode.data(), function (val, key) {
                    $newNode.data(key, parseUtils.toImplicitType(val));
                });
                if (!isTemplated && !$newNode.html().trim()) {
                    $newNode.html(dataval);
                }
            });
            $dummyEl.append(nodes);
        });

        var isInitialAnim = !elAnimatedMap.get(el);
        var $withAnimAttrs = addChangeClassesToList($el.children(), $dummyEl.children(), isInitialAnim, config.animation);
        $el.empty().append($withAnimAttrs);

        elAnimatedMap.set(el, true);
    }
};

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * ## Display Array Variables: data-f-repeat
 *
 * The `data-f-repeat` attribute allows you to automatically loop over a referenced variable. The most common use case is in time-based models, like those written in [SimLang](../../../../../model_code/forio_simlang/) or [Vensim](../../../../../model_code/vensim/), when you want to report the value of the variable at every time step so far. The `data-f-repeat` attribute automatically repeats the DOM element it's attached to, filling in the value.
 *
 * **To display a DOM element repeatedly based on an array variable from the model:**
 *
 * 1. Add the `data-f-repeat` attribute to any HTML element that has repeated sub-elements. The two most common examples are lists and tables.
 * 2. Set the value of the `data-f-repeat` attribute in the HTML element you want to repeat to the name of the array variable.
 * 3. Optionally, you can use templates (`<%= %>`) to reference the `index` (for arrays) or `key` (for objects) and `value` to display. The `index`, `key`, and `value` are special variables that Flow.js populates for you.
 *
 *
 * **Examples:**
 *
 * For example, to create a table that displays the year and cost for every step of the model that has occurred so far:
 *
 *      <table>
 *          <tr>
 *              <td>Year</td>
 *              <td data-f-repeat="Cost[Products]"><%= index + 1 %></td>
 *          </tr>
 *          <tr>
 *              <td>Cost of Products</td>
 *              <td data-f-repeat="Cost[Products]"></td>
 *          </tr>
 *      </table>
 *
 * In the third step of the model, this example generates the HTML:
 *
 *      <table>
 *          <tr>
 *              <td>Year</td>
 *              <td data-f-repeat="Cost[Products]">1</td>
 *              <td>2</td>
 *              <td>3</td>
 *          </tr>
 *          <tr>
 *              <td>Cost of Products</td>
 *              <td data-f-repeat="Cost[Products]">100</td>
 *              <td>102</td>
 *              <td>105</td>
 *          </tr>
 *      </table>
 *
 * You can also use this with a `<div>` and have the `<div>` itself repeated. For example:
 *
 *      <div data-f-repeat="sample_array"></div>
 *
 * generates:
 *
 *      <div data-f-repeat="sample_array">2</div>
 *      <div>4</div>
 *      <div>6</div>
 *
 * **Notes:**
 *
 * * You can use the `data-f-repeat` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
 * * The `key`, `index`, and `value` are special variables that Flow.js populates for you.
 * * The template syntax is to enclose each keyword (`index`, `key`, `variable`) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../#templates).
 * * In most cases the same effect can be achieved with the [`data-f-foreach` attribute](../../attributes/loop-attrs/foreach-attr/), which is similar. In the common use case of a table of data displayed over time, the `data-f-repeat` can be more concise and easier to read. However, the `data-f-foreach` allows aliasing, and so can be more useful especially if you are nesting HTML elements or want to introduce logic about how to display the values.
 *
 */

var _require = __webpack_require__(0),
    each = _require.each,
    template = _require.template;

var parseUtils = __webpack_require__(2);
var gutils = __webpack_require__(9);
var config = __webpack_require__(1);

var templateIdAttr = config.attrs.repeat.templateId;

var _require2 = __webpack_require__(7),
    addChangeClassesToList = _require2.addChangeClassesToList;

var elTemplateMap = new WeakMap(); //<domel>: template
var elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

var _require3 = __webpack_require__(8),
    getKnownDataForEl = _require3.getKnownDataForEl,
    updateKnownDataForEl = _require3.updateKnownDataForEl,
    removeKnownData = _require3.removeKnownData,
    findMissingReferences = _require3.findMissingReferences,
    stubMissingReferences = _require3.stubMissingReferences,
    addBackMissingReferences = _require3.addBackMissingReferences;

var _require4 = __webpack_require__(13),
    extractVariableName = _require4.extractVariableName,
    parseKeyAlias = _require4.parseKeyAlias,
    parseValueAlias = _require4.parseValueAlias;

module.exports = {

    test: 'repeat',

    target: '*',

    unbind: function (attr, $el) {
        var id = $el.data(templateIdAttr);
        if (id) {
            $el.nextUntil(':not([data-' + id + '])').remove();
            // this.removeAttr('data-' + templateIdAttr); //FIXME: Something about calling rebind multiple times in IB makes this happen without the removal
        }

        var el = $el.get(0);
        elAnimatedMap.delete(el);

        var originalHTML = elTemplateMap.get(el);
        if (originalHTML) {
            elTemplateMap.delete(el);
            $el.replaceWith(originalHTML);
        }

        removeKnownData($el);
    },

    parse: function (attrVal) {
        return extractVariableName(attrVal);
    },

    handle: function (value, prop, $el) {
        value = $.isPlainObject(value) ? value : [].concat(value);
        var id = $el.data(templateIdAttr);

        var el = $el.get(0);

        var originalHTML = elTemplateMap.get(el);
        if (!originalHTML) {
            originalHTML = el.outerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            elTemplateMap.set(el, originalHTML);
        }

        var $dummyOldDiv = $('<div></div>');
        if (id) {
            var $removed = $el.nextUntil(':not([data-' + id + '])').remove();
            $dummyOldDiv.append($removed);
        } else {
            id = gutils.random('repeat-');
            $el.attr('data-' + templateIdAttr, id);
        }

        var attrVal = $el.data('f-' + prop);
        var keyAttr = parseKeyAlias(attrVal, value);
        var valueAttr = parseValueAlias(attrVal, value);

        var knownData = getKnownDataForEl($el);
        var missingReferences = findMissingReferences(originalHTML, [keyAttr, valueAttr].concat(Object.keys(knownData)));
        var stubbedTemplate = stubMissingReferences(originalHTML, missingReferences);

        var templateFn = template(stubbedTemplate);
        var last;
        each(value, function (dataval, datakey) {
            var _$$extend;

            if (dataval === undefined || dataval === null) {
                dataval = dataval + ''; //convert undefineds to strings
            }
            var templateData = $.extend(true, {}, knownData, (_$$extend = {}, _defineProperty(_$$extend, keyAttr, datakey), _defineProperty(_$$extend, valueAttr, dataval), _$$extend));

            var nodes = void 0;
            var isTemplated = void 0;
            try {
                var templated = templateFn(templateData);
                var templatedWithReferences = addBackMissingReferences(templated, missingReferences);
                isTemplated = templatedWithReferences !== stubbedTemplate;
                nodes = $(templatedWithReferences);
            } catch (e) {
                //you don't have all the references you need;
                nodes = $(stubbedTemplate);
                isTemplated = true;
                updateKnownDataForEl($(nodes), templateData);
            }

            var hasData = dataval !== null && dataval !== undefined;
            nodes.each(function (i, newNode) {
                var $newNode = $(newNode);
                $newNode.removeAttr('data-f-repeat').removeAttr('data-' + templateIdAttr);
                each($newNode.data(), function (val, key) {
                    if (!last) {
                        $el.data(key, parseUtils.toImplicitType(val));
                    } else {
                        $newNode.data(key, parseUtils.toImplicitType(val));
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
        var isInitialAnim = !elAnimatedMap.get(el);
        addChangeClassesToList($dummyOldDiv.children(), $newEls, isInitialAnim, config.animation);

        elAnimatedMap.set(el, true);
    }
};

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Checkboxes and Radio Buttons
 *
 * In the [default case](../default-bind-attr/), the `data-f-bind` attribute creates a bi-directional binding between the DOM element and the model variable. This binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated.
 *
 * Flow.js provides special handling for DOM elements with `type="checkbox"` and `type="radio"`.
 *
 * In particular, if you add the `data-f-bind` attribute to an `input` with `type="checkbox"` and `type="radio"`, the checkbox or radio button is automatically selected if the `value` matches the value of the model variable referenced, or if the model variable is `true`.
 *
 * **Example**
 *
 *      <!-- radio button, selected if sampleInt is 8 -->
 *      <input type="radio" data-f-bind="sampleInt" value="8" />
 *
 *      <!-- checkbox, checked if sampleBool is true -->
 *      <input type="checkbox" data-f-bind="sampleBool" />
 *
 */
var _require = __webpack_require__(0),
    isArray = _require.isArray;

module.exports = {

    target: ':checkbox,:radio',

    test: 'bind',

    /**
     * @param {string[]|number[]|string|number} value
     * @return {void}
     */
    handle: function (value) {
        if (isArray(value)) {
            value = value[value.length - 1];
        }
        var settableValue = this.attr('value'); //initial value
        var isChecked = typeof settableValue !== 'undefined' ? settableValue == value : !!value; //eslint-disable-line eqeqeq
        this.prop('checked', isChecked);
    }
};

/***/ }),
/* 38 */
/***/ (function(module, exports) {

/**
 * ## Inputs and Selects
 *
 * In the [default case](../default-bind-attr/), the `data-f-bind` attribute creates a bi-directional binding between the DOM element and the model variable. This binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated.
 *
 * Flow.js provides special handling for DOM elements `input` and `select`.
 *
 * In particular, if you add the `data-f-bind` attribute to a `select` or `input` element, the option matching the value of the model variable is automatically selected.
 *
 * **Example**
 *
 * 		<!-- option selected if sample_int is 8, 10, or 12 -->
 * 		<select data-f-bind="sample_int">
 * 			<option value="8"> 8 </option>
 * 			<option value="10"> 10 </option>
 * 			<option value="12"> 12 </option>
 * 		</select>
 *
 */
module.exports = {
    target: 'input, select, textarea',

    test: 'bind',

    /**
    * @param {string[]|number[]|string|number} value
    * @return {void}
    */
    handle: function (value) {
        if (value === undefined) {
            value = '';
        } else if (Array.isArray(value)) {
            value = value[value.length - 1];
        }
        this.val(value);
    }
};

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Class Attribute: data-f-class
 *
 * You can bind model variables to names of CSS classes, so that you can easily change the styling of HTML elements based on the values of model variables.
 *
 * **To bind model variables to CSS classes:**
 *
 * 1. Add the `data-f-class` attribute to an HTML element.
 * 2. Set the value to the name of the model variable.
 * 3. Optionally, add an additional `class` attribute to the HTML element.
 *      * If you only use the `data-f-class` attribute, the value of `data-f-class` is the class name.
 *      * If you *also* add a `class` attribute, the value of `data-f-class` is *appended* to the class name.
 * 4. Add classes to your CSS code whose names include possible values of that model variable.
 *
 * **Example**
 *
 *      <style type="text/css">
 *          .North { color: grey }
 *          .South { color: purple }
 *          .East { color: blue }
 *          .West { color: orange }
 *          .sales.good { color: green }
 *          .sales.bad { color: red }
 *          .sales.value-100 { color: yellow }
 *       </style>
 *
 *       <div data-f-class="salesMgr.region">
 *           Content colored by region
 *       </div>
 *
 *       <div data-f-class="salesMgr.performance" class="sales">
 *           Content green if salesMgr.performance is good, red if bad
 *       </div>
 *
 *       <div data-f-class="salesMgr.numRegions" class="sales">
 *           Content yellow if salesMgr.numRegions is 100
 *       </div>
 *
 */
var _require = __webpack_require__(0),
    isArray = _require.isArray,
    isNumber = _require.isNumber;

var config = __webpack_require__(1);

module.exports = {

    test: 'class',

    target: '*',

    handle: function (value, prop) {
        if (isArray(value)) {
            value = value[value.length - 1];
        }

        var addedClasses = this.data(config.classesAdded);
        if (!addedClasses) {
            addedClasses = {};
        }
        if (addedClasses[prop]) {
            this.removeClass(addedClasses[prop]);
        }

        if (isNumber(value)) {
            value = 'value-' + value;
        }
        addedClasses[prop] = value;
        //Fixme: prop is always "class"
        this.addClass(value);
        this.data(config.classesAdded, addedClasses);
    }
};

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Binding for data-f-[boolean]
 *
 * Flow.js provides special handling for HTML attributes that take Boolean values.
 *
 * In particular, for most HTML attributes that expect Boolean values, the attribute is directly set to the value of the model variable. This is true for `checked`, `selected`, `async`, `autofocus`, `autoplay`, `controls`, `defer`, `ismap`, `loop`, `multiple`, `open`, `required`, and `scoped`.
 *
 * However, there are a few notable exceptions. For the HTML attributes `disabled`, `hidden`, and `readonly`, the attribute is set to the *opposite* of the value of the model variable. This makes the resulting HTML easier to read.
 *
 * **Example**
 *
 *      <!-- this checkbox is CHECKED when sampleBool is TRUE,
 *           and UNCHECKED when sampleBool is FALSE -->
 *      <input type="checkbox" data-f-checked="sampleBool" />
 *
 *      <!-- this button is ENABLED when sampleBool is TRUE,
 *           and DISABLED when sampleBool is FALSE -->
 *      <button data-f-disabled="sampleBool">Click Me</button>
 *
 */

var _require = __webpack_require__(0),
    isArray = _require.isArray;

module.exports = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped)$/i,

    handle: function (value, prop) {
        if (isArray(value)) {
            value = value[value.length - 1];
        }
        var val = this.attr('value') ? value == this.prop('value') : !!value; //eslint-disable-line eqeqeq
        this.prop(prop, val);
    }
};

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Binding for data-f-[boolean]
 *
 * Flow.js provides special handling for HTML attributes that take Boolean values.
 *
 * In particular, for most HTML attributes that expect Boolean values, the attribute is directly set to the value of the model variable. This is true for `checked`, `selected`, `async`, `autofocus`, `autoplay`, `controls`, `defer`, `ismap`, `loop`, `multiple`, `open`, `required`, and `scoped`.
 *
 * However, there are a few notable exceptions. For the HTML attributes `disabled`, `hidden`, and `readonly`, the attribute is set to the *opposite* of the value of the model variable. This makes the resulting HTML easier to read.
 *
 * **Example**
 *
 *      <!-- this checkbox is CHECKED when sampleBool is TRUE,
 *           and UNCHECKED when sampleBool is FALSE -->
 *      <input type="checkbox" data-f-checked="sampleBool" />
 *
 *      <!-- this button is ENABLED when sampleBool is TRUE,
 *           and DISABLED when sampleBool is FALSE -->
 *      <button data-f-disabled="sampleBool">Click Me</button>
 *
 */

var _require = __webpack_require__(0),
    isArray = _require.isArray;

module.exports = {

    target: '*',

    test: /^(?:disabled|hidden|readonly)$/i,

    handle: function (value, prop) {
        if (isArray(value)) {
            value = value[value.length - 1];
        }
        this.prop(prop, !value);
    }
};

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Display Elements Conditionally (showif)
 *
 * The `data-f-showif` attribute allows you to display DOM elements based on either the value of the model variable (true or false), or the value of a [comparison (Number Comparison Converter)](../../../../converters/number-compare-converter/) using a model variable.
 *
 * **Examples:**
 *
 *      <!-- model variable already has a boolean value -->
 *      <div data-f-showif="sampleBooleanModelVariable">Only appears if the model variable is true</div>
 *
 *      <!-- chain with the greaterThan converter to produce a boolean value,
 *          text is shown when widgets is greater than 50 -->
 *      <div data-f-showif="widgets | greaterThan(50)"/>Nice job, we've sold plenty of widgets!</div>
 *
 * **Notes:**
 *
 * * By default, the DOM element to which you add the `data-f-showif` attribute is *not* displayed.
 * * You can chain model variable(s) together with any number of converters. The result of the conversion must be boolean.
 */

var _require = __webpack_require__(0),
    isArray = _require.isArray;

module.exports = {
    test: 'showif',

    target: '*',

    init: function (attr, value, $el) {
        $el.hide(); //hide by default; if not this shows text until data is fetched
        return true;
    },

    handle: function (value, prop, $el) {
        if (isArray(value)) {
            value = value[value.length - 1];
        }
        return value && ('' + value).trim() ? $el.show() : $el.hide();
    }
};

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * ## Display Elements Conditionally (hideif)
 *
 * The `data-f-hideif` attribute allows you to hide DOM elements based on either the value of the model variable (true or false), or the value of a [comparison (Number Comparison Converter)](../../../../converters/number-compare-converter/) using a model variable.
 *
 * **Examples:**
 *
 *      <!-- model variable already has a boolean value -->
 *      <div data-f-hideif="sampleBooleanModelVariable">Remains hidden if the model variable is true</div>
 *
 *      <!-- chain with the greaterThan converter to produce a boolean value, 
 *          text is hidden when widgets is greater than 10 -->
 *      <div data-f-hideif="widgets | greaterThan(10)"/>Get to work, we need to sell more widgets!</div>
 *
 * **Notes:**
 *
 * * By default, the DOM element to which you add the `data-f-hideif` attribute is *not* displayed.
 * * You can chain model variable(s) together with any number of converters. The result of the conversion must be boolean.
 */

var _require = __webpack_require__(0),
    isArray = _require.isArray;

module.exports = {
    test: 'hideif',

    target: '*',

    init: function (attr, value, $el) {
        $el.hide(); //hide by default; if not this shows text until data is fetched
        return true;
    },
    handle: function (value, prop, $el) {
        if (isArray(value)) {
            value = value[value.length - 1];
        }
        if (value && ('' + value).trim()) {
            $el.hide();
        } else {
            $el.show();
        }
    }
};

/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## Default Bi-directional Binding: data-f-bind
 *
 * The most commonly used attribute provided by Flow.js is the `data-f-bind` attribute.
 *
 * #### data-f-bind with a single value
 *
 * You can bind variables from the model in your interface by setting the `data-f-bind` attribute. This attribute binding is bi-directional, meaning that as the model changes, the interface is automatically updated; and when users change values in the interface, the model is automatically updated. Specifically:
 *
 * * The binding from the model to the interface ensures that the current value of the variable is displayed in the HTML element. This includes automatic updates to the displayed value if something else changes in the model.
 *
 * * The binding from the interface to the model ensures that if the HTML element is editable, changes are sent to the model.
 *
 * Once you set `data-f-bind`, Flow.js figures out the appropriate action to take based on the element type and the data response from your model.
 *
 * **To display and automatically update a variable in the interface:**
 *
 * 1. Add the `data-f-bind` attribute to any HTML element that normally takes a value.
 * 2. Set the value of the `data-f-bind` attribute to the name of the variable.
 *
 * **Example**
 *
 *      <span data-f-bind="salesManager.name" />
 *
 *      <input type="text" data-f-bind="sampleString" />
 *
 * **Notes:**
 *
 * * Use square brackets, `[]`, to reference arrayed variables: `sales[West]`.
 * * Use angle brackets, `<>`, to reference other variables in your array index: `sales[<currentRegion>]`.
 * * Remember that if your model is in Vensim, the time step is the last array index.
 * * By default, all HTML elements update for any change for each variable. However, you can prevent the user interface from updating &mdash; either for all variables or for particular variables &mdash; by setting the `silent` property when you initialize Flow.js. See more on [additional options for the Flow.initialize() method](../../../../../#custom-initialize).
 *
 * #### data-f-bind with multiple values and templates
 *
 * If you have multiple variables, you can use the shortcut of listing multiple variables in an enclosing HTML element and then referencing each variable using templates. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)
 *
 * **To display and automatically update multiple variables in the interface:**
 *
 * 1. Add the `data-f-bind` attribute to any HTML element from which you want to reference model variables, such as a `div` or `table`.
 * 2. Set the value of the `data-f-bind` attribute in your top-level HTML element to a comma-separated list of the variables. (The variables may or may not be case-sensitive, depending on your modeling language.)
 *
 * 3. Inside the HTML element, use templates (`<%= %>`) to reference the specific variable names. These variable names are case-sensitive: they should match the case you used in the `data-f-bind` in step 2.
 *
 * **Example**
 *
 *      <!-- make these three model variables available throughout div -->
 *
 *      <div data-f-bind="CurrentYear, Revenue, Profit">
 *          In <%= CurrentYear %>,
 *          our company earned <%= Revenue %>,
 *          resulting in <%= Profit %> profit.
 *      </div>
 *
 * This example is shorthand for repeatedly using data-f-bind. For instance, this code also generates the same output:
 *
 *      <div>
 *          In <span data-f-bind="CurrentYear"></span>,
 *          our company earned <span data-f-bind="Revenue"></span>,
 *          resulting in <span data-f-bind="Profit"> profit</span>.
 *      </div>
 *
 * **Notes:**
 *
 * * Adding `data-f-bind` to the enclosing HTML element rather than repeatedly using it within the element is a code style preference. In many cases, adding `data-f-bind` at the top level, as in the first example, can make your code easier to read and maintain.
 * * However, you might choose to repeatedly use `data-f-bind` in some cases, for example if you want different [formatting](../../../../../converter-overview/) for different variables:
 *
 *          <div>
 *              In <span data-f-bind="CurrentYear | #"></span>,
 *              our company earned <span data-f-bind="Revenue | $#,###"></span>
 *          </div>
 *
 * * Because everything within your template (`<%= %>`) is evaluated as JavaScript, you can use templates to pass expressions to other Flow.js attributes. For example,
 *
 *          <div data-f-bind="myCurrentTimeStep">
 *              <div data-f-bind="Revenue[<%= value + 1%>]"></div>
 *          </div>
 *
 * will display the value of `Revenue[myCurrentTimeStep + 1]` (for example an estimate of future revenue in your model).
 *
 */



var _require = __webpack_require__(0),
    template = _require.template;

var _require2 = __webpack_require__(7),
    addContentAndAnimate = _require2.addContentAndAnimate;

var config = __webpack_require__(1);

var _require3 = __webpack_require__(8),
    getKnownDataForEl = _require3.getKnownDataForEl,
    updateKnownDataForEl = _require3.updateKnownDataForEl,
    removeKnownData = _require3.removeKnownData,
    findMissingReferences = _require3.findMissingReferences,
    stubMissingReferences = _require3.stubMissingReferences,
    addBackMissingReferences = _require3.addBackMissingReferences,
    isTemplated = _require3.isTemplated;

var elTemplateMap = new WeakMap(); //<dom-element>: template
var elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

function translateDataToInsertable(value) {
    if (Array.isArray(value)) {
        value = value[value.length - 1];
    }
    value = $.isPlainObject(value) ? JSON.stringify(value) : value + '';
    return value;
}
function translateDataToTemplatable(value, alias) {
    var templateData = {};
    if (!$.isPlainObject(value)) {
        templateData = { value: value };
        if (alias) {
            templateData[alias] = value;
        }
    } else {
        templateData = $.extend({}, value, {
            value: value //If the key has 'weird' characters like '<>' hard to get at with a template otherwise
        });
    }
    return templateData;
}

module.exports = {

    target: '*',

    test: 'bind',

    /**
     * @param {string} attr
     * @param {JQuery<HTMLElement>} $el
     * @return {void}
     */
    unbind: function (attr, $el) {
        var el = $el.get(0);
        elAnimatedMap.delete(el);

        var bindTemplate = elTemplateMap.get(el);
        if (bindTemplate) {
            $el.html(bindTemplate);
            elTemplateMap.delete(el);
        }
        removeKnownData($el);
    },

    /**
    * @param {any} value
    * @param {string} prop
    * @param {JQuery<HTMLElement>} $el
    * @return {void}
    */
    handle: function (value, prop, $el) {
        function getNewContent(currentContents, value) {
            if (!isTemplated(currentContents)) {
                return translateDataToInsertable(value);
            }

            var templateData = translateDataToTemplatable(value, $el.data('f-' + prop));
            var knownData = getKnownDataForEl($el);
            $.extend(templateData, knownData);

            var missingReferences = findMissingReferences(currentContents, Object.keys(templateData));
            var stubbedTemplate = stubMissingReferences(currentContents, missingReferences);

            var templateFn = template(stubbedTemplate);
            try {
                var templatedHTML = templateFn(templateData);
                var templatedWithReferences = addBackMissingReferences(templatedHTML, missingReferences);
                return templatedWithReferences;
            } catch (e) {
                //you don't have all the references you need;
                updateKnownDataForEl($el, templateData);
                return currentContents;
            }
        }

        var el = $el.get(0);
        var originalContents = elTemplateMap.get(el);
        if (!originalContents) {
            originalContents = $el.html().replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            elTemplateMap.set(el, originalContents);
        }

        var contents = getNewContent(originalContents, value);
        addContentAndAnimate($el, contents, !elAnimatedMap.has(el), config.animation);
        elAnimatedMap.set(el, true);
    }
};

/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## Default Attribute Handling: Read-only Binding
 *
 * Flow.js uses the HTML5 convention of prepending data- to any custom HTML attribute. Flow.js also adds `f` for easy identification of Flow.js. For example, Flow.js provides several custom attributes and attribute handlers -- including [data-f-bind](../binds/default-bind-attr), [data-f-foreach](../loop-attrs/foreach-attr/), etc. You can also [add your own attribute handlers](../attribute-manager/).
 *
 * The default behavior for handling a known attribute is to use the value of the model variable as the value of the attribute. (There are exceptions for some [boolean attributes](../boolean-attr/).)
 *
 * This means you can bind variables from the model in your interface by adding the `data-f-` prefix to any standard DOM attribute. This attribute binding is **read-only**, so as the model changes, the interface is automatically updated; but when users change values in the interface, no action occurs.
 *
 * **To display a DOM element based on a variable from the model:**
 *
 * 1. Add the prefix `data-f-` to any attribute in any HTML element that normally takes a value.
 * 2. Set the value of the attribute to the name of the model variable.
 *
 * **Example**
 *
 * 		<!-- input element displays value of sample_int, however,
 * 			no call to the model is made if user changes sample_int
 *
 *			if sample_int is 8, this is the equivalent of <input value="8"></input> -->
 *
 *		<input data-f-value="sample_int"></input>
 *
 */



module.exports = {

    test: '*',

    target: '*',

    handle: function (value, prop) {
        //FIXME: The _right_ way to do this would be to set attr, not prop. 
        //However Polymer 1.0 doesn't link attrs with stringified JSON, and that's really the primary use-case for this, so, ignoring
        //However Polymer is fine with 'data-X' attrs having stringified JSON. Eventually we should make this attr and fix polymer
        //but can't do that for backwards comptability reason. See commit bbc4a49039fb73faf1ef591a07b371d7d667cf57
        this.prop(prop, value);
    }
};

/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/**
 * Hooks up dom elements to mutation observer
 * @param  {HTMLElement} target     [description]
 * @param  {Object} domManager [description]
 * @return {void}
 */

module.exports = function (target, domManager, isEnabled) {
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
        attributeFilter: ['data-f-channel'], //FIXME: Make this a config param
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
    // 
};

/***/ }),
/* 47 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (immutable) */ __webpack_exports__["default"] = ChannelManager;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__channel_manager__ = __webpack_require__(48);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__middleware_epicenter_router__ = __webpack_require__(50);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__middleware_json_router__ = __webpack_require__(64);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__middleware_default_router__ = __webpack_require__(65);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__channel_manager_enhancements__ = __webpack_require__(66);








//Moving  connecting glue here so channel-manager can be tested in isolation
var InterpolatableChannelManagerWithMiddleware = Object(__WEBPACK_IMPORTED_MODULE_4__channel_manager_enhancements__["a" /* interpolatable */])(Object(__WEBPACK_IMPORTED_MODULE_4__channel_manager_enhancements__["b" /* withMiddleware */])(__WEBPACK_IMPORTED_MODULE_0__channel_manager__["a" /* default */]));
function ChannelManager(opts) {
    var cm = new InterpolatableChannelManagerWithMiddleware($.extend(true, {}, {
        middlewares: [__WEBPACK_IMPORTED_MODULE_3__middleware_default_router__["a" /* default */], __WEBPACK_IMPORTED_MODULE_2__middleware_json_router__["a" /* default */], __WEBPACK_IMPORTED_MODULE_1__middleware_epicenter_router__["a" /* default */]]
    }, opts));
    return cm;
}

/***/ }),
/* 48 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_jquery__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_jquery___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_jquery__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__channel_utils__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }




/**
 * 
 * @param {String[]|String} topics 
 * @param {Function} callback 
 * @param {Object} options
 * @return {Subscription}
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
         * @type {Boolean}
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
function callbackIfChanged(subscription, data) {
    var id = subscription.id;
    if (!Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["isEqual"])(sentDataBySubsId[id], data)) {
        sentDataBySubsId[id] = copy(data);
        subscription.callback(data, { id: id });
    }
}

/**
* @param {Publishable[]} topics
* @param {Subscription} subscription 
*/
function checkAndNotifyBatch(topics, subscription) {
    var cached = cacheBySubsId[subscription.id] || {};
    var merged = __WEBPACK_IMPORTED_MODULE_0_jquery___default.a.extend(true, {}, cached, Object(__WEBPACK_IMPORTED_MODULE_1__channel_utils__["e" /* publishableToObject */])(topics));
    var matchingTopics = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["intersection"])(Object.keys(merged), subscription.topics);
    if (matchingTopics.length > 0) {
        var toSend = subscription.topics.reduce(function (accum, topic) {
            accum[topic] = merged[topic];
            return accum;
        }, {});

        if (subscription.cache) {
            cacheBySubsId[subscription.id] = toSend;
        }
        if (matchingTopics.length === subscription.topics.length) {
            callbackIfChanged(subscription, toSend);
        }
    }
}

/**
 * @param {Publishable[]} topics
 * @param {Subscription} subscription 
 */
function checkAndNotify(topics, subscription) {
    topics.forEach(function (topic) {
        if (Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["includes"])(subscription.topics, topic.name) || Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["includes"])(subscription.topics, '*')) {
            var toSend = {};
            toSend[topic.name] = topic.value;
            callbackIfChanged(subscription, toSend);
        }
    });
}

/**
* @param {Subscription[]} subcriptionList
* @return {String[]}
*/
function getTopicsFromSubsList(subcriptionList) {
    return subcriptionList.reduce(function (accum, subs) {
        accum = accum.concat(subs.topics);
        return accum;
    }, []);
}

/**
 * @implements {ChannelManager}
 */

var ChannelManager = function () {
    function ChannelManager(options) {
        _classCallCheck(this, ChannelManager);

        this.subscriptions = [];
    }

    /**
     * @param {String | Publishable } topic
     * @param {any} [value] item to publish
     * @param {Object} [options]
     * @return {Promise}
     */


    _createClass(ChannelManager, [{
        key: 'publish',
        value: function publish(topic, value, options) {
            var normalized = Object(__WEBPACK_IMPORTED_MODULE_1__channel_utils__["c" /* normalizeParamOptions */])(topic, value, options);
            var prom = __WEBPACK_IMPORTED_MODULE_0_jquery___default.a.Deferred().resolve(normalized.params).promise();
            prom = prom.then(this.notify.bind(this));
            return prom;
        }
    }, {
        key: 'notify',
        value: function notify(topic, value, options) {
            var normalized = Object(__WEBPACK_IMPORTED_MODULE_1__channel_utils__["c" /* normalizeParamOptions */])(topic, value, options);
            // console.log('notify', normalized.params);
            return this.subscriptions.forEach(function (subs) {
                var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                fn(normalized.params, subs);
            });
        }

        //TODO: Allow subscribing to regex? Will solve problem of listening only to variables etc
        /**
         * @param {String[] | String} topics
         * @param {Function} cb
         * @param {Object} [options]
         * @return {String}
         */

    }, {
        key: 'subscribe',
        value: function subscribe(topics, cb, options) {
            var subs = makeSubs(topics, cb, options);
            this.subscriptions = this.subscriptions.concat(subs);
            return subs.id;
        }

        /**
         * @param {String} token
         */

    }, {
        key: 'unsubscribe',
        value: function unsubscribe(token) {
            var olderLength = this.subscriptions.length;
            if (!olderLength) {
                throw new Error('No subscriptions found to unsubscribe from');
            }

            var remaining = this.subscriptions.filter(function (subs) {
                return subs.id !== token;
            });
            if (!remaining.length === olderLength) {
                throw new Error('No subscription found for token ' + token);
            }
            delete cacheBySubsId[token];
            delete sentDataBySubsId[token];
            this.subscriptions = remaining;
        }
    }, {
        key: 'unsubscribeAll',
        value: function unsubscribeAll() {
            this.subscriptions = [];
        }

        /**
         * @return {String[]}
         */

    }, {
        key: 'getSubscribedTopics',
        value: function getSubscribedTopics() {
            var list = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniq"])(getTopicsFromSubsList(this.subscriptions));
            return list;
        }

        /**
         * @param {String} [topic] optional topic to filter by
         * @return {Subscription[]}
         */

    }, {
        key: 'getSubscribers',
        value: function getSubscribers(topic) {
            if (topic) {
                return this.subscriptions.filter(function (subs) {
                    return Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["includes"])(subs.topics, topic);
                });
            }
            return this.subscriptions;
        }
    }]);

    return ChannelManager;
}();

/* harmony default export */ __webpack_exports__["a"] = (ChannelManager);

/***/ }),
/* 49 */
/***/ (function(module, exports) {

module.exports = jQuery;

/***/ }),
/* 50 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_manager_router__ = __webpack_require__(51);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__scenario_manager_router__ = __webpack_require__(57);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__custom_run_router__ = __webpack_require__(58);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__world_manager_router__ = __webpack_require__(60);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__runs_router__ = __webpack_require__(63);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_channels_channel_router__ = __webpack_require__(5);







// import UserRouter from './user-router/current-user-channel';





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

/* harmony default export */ __webpack_exports__["a"] = (function (config, notifier, channelManagerContext) {
    var opts = $.extend(true, {}, config);

    var customRunChannelOpts = getOptions(opts, 'runid');
    var customRunChannel = new __WEBPACK_IMPORTED_MODULE_2__custom_run_router__["a" /* default */](customRunChannelOpts, notifier);
    var runsChannel = new __WEBPACK_IMPORTED_MODULE_4__runs_router__["a" /* default */](customRunChannelOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["i" /* withPrefix */])(notifier, 'runs'), channelManagerContext);
    // var userChannel = new UserRouter(getOptions(opts, 'runManager').run, withPrefix(notifier, 'user:'), channelManagerContext);

    /** @type {Handler[]} **/
    var handlers = [$.extend({}, customRunChannel, {
        name: 'customRun',
        match: Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["e" /* regex */])(runidRegex),
        options: customRunChannelOpts.channelOptions
    }), $.extend({}, runsChannel, {
        name: 'archiveRuns',
        match: Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["d" /* prefix */])('runs:'),
        options: customRunChannelOpts.channelOptions
    })];
    var exposable = {};

    var runManagerOpts = getOptions(opts, 'runManager');
    if (opts.runManager || !opts.scenarioManager && runManagerOpts.serviceOptions.run) {
        var rm;
        var isMultiplayer = runManagerOpts.serviceOptions.strategy === 'multiplayer';
        if (opts.scenarioManager) {
            rm = new __WEBPACK_IMPORTED_MODULE_0__run_manager_router__["a" /* default */](runManagerOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["i" /* withPrefix */])(notifier, RUN_PREFIX));
            handlers.push($.extend({}, rm, {
                name: 'run',
                match: Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["d" /* prefix */])(RUN_PREFIX), //if both scenario manager and run manager are being used, require a prefix
                options: runManagerOpts.channelOptions
            }));
        } else if (isMultiplayer) {
            //Ignore case where both scenario manager and multiplayer are being used
            rm = new __WEBPACK_IMPORTED_MODULE_3__world_manager_router__["a" /* default */](runManagerOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["i" /* withPrefix */])(notifier, [WORLD_PREFIX, '']));
            handlers.push($.extend({}, rm, {
                name: 'World run',
                match: Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["a" /* defaultPrefix */])(WORLD_PREFIX),
                isDefault: true,
                options: runManagerOpts.channelOptions
            }));
        } else {
            rm = new __WEBPACK_IMPORTED_MODULE_0__run_manager_router__["a" /* default */](runManagerOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["i" /* withPrefix */])(notifier, [RUN_PREFIX, '']));
            handlers.push($.extend({}, rm, {
                name: 'run',
                match: Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["a" /* defaultPrefix */])(RUN_PREFIX),
                isDefault: true,
                options: runManagerOpts.channelOptions
            }));
        }

        $.extend(exposable, rm.expose);
    }

    if (opts.scenarioManager) {
        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new __WEBPACK_IMPORTED_MODULE_1__scenario_manager_router__["a" /* default */](scenarioManagerOpts, Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["i" /* withPrefix */])(notifier, [SCENARIO_PREFIX, '']));
        handlers.push($.extend({}, sm, {
            name: 'scenario',
            match: Object(__WEBPACK_IMPORTED_MODULE_5_channels_middleware_utils__["a" /* defaultPrefix */])(SCENARIO_PREFIX),
            options: scenarioManagerOpts.channelOptions,
            isDefault: true
        }));

        $.extend(exposable, sm.expose);
    }

    var epicenterRouter = Object(__WEBPACK_IMPORTED_MODULE_6_channels_channel_router__["a" /* default */])(handlers, notifier);
    epicenterRouter.expose = exposable;

    return epicenterRouter;
});

/***/ }),
/* 51 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_router__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_channels_channel_router__ = __webpack_require__(5);





var _window = window,
    F = _window.F;


var RUN_PREFIX = 'current:';

/* harmony default export */ __webpack_exports__["a"] = (function (config, notifier) {
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
    var currentChannelOpts = $.extend(true, { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    var currentRunChannel = new __WEBPACK_IMPORTED_MODULE_0__run_router__["a" /* default */](currentChannelOpts, Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["i" /* withPrefix */])(notifier, [RUN_PREFIX, '']));

    var runRouteHandler = $.extend(currentRunChannel, {
        match: Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["a" /* defaultPrefix */])(RUN_PREFIX), //TODO: Just remove prefix?
        name: 'Current Run',
        isDefault: true,
        options: currentChannelOpts.channelOptions
    });
    var handlers = [runRouteHandler];

    var runMangerRouter = Object(__WEBPACK_IMPORTED_MODULE_2_channels_channel_router__["a" /* default */])(handlers);
    runMangerRouter.expose = { runManager: rm };

    return runMangerRouter;
});

/***/ }),
/* 52 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunMetaChannel;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_lodash__);



function RunMetaChannel($runServicePromise, notifier) {

    function mergeAndSend(runMeta, requestedTopics) {
        var toSend = [].concat(requestedTopics).reduce(function (accum, meta) {
            accum.push({ name: meta, value: runMeta[meta] });
            return accum;
        }, []);
        return notifier(toSend);
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
                    mergeAndSend(data, topics);
                });
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = Object(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["e" /* publishableToObject */])(topics);
                return runService.save(toSave).then(function (res) {
                    runService.runMeta = $.extend({}, true, runService.runMeta, res);
                    return Object(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["d" /* objectToPublishable */])(res);
                });
            });
        }
    };
}

/***/ }),
/* 53 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export groupByContigousArrayItems */
/* unused harmony export groupVariableBySubscripts */
/* unused harmony export optimizedFetch */
/* harmony export (immutable) */ __webpack_exports__["a"] = RunVariablesChannel;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_general__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_general___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_utils_general__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);




/**
 * @param {number[]} subscripts 
 * @returns {number[][]}
 */
function groupByContigousArrayItems(subscripts) {
    var grouped = subscripts.reduce(function (accum, thisSub, index) {
        if (index === 0) {
            accum.last = [thisSub];
            return accum;
        }

        var last = accum.last[accum.last.length - 1];
        if (last + 1 !== thisSub) {
            accum.soFar.push(accum.last);
            accum.last = [thisSub];

            if (index === subscripts.length - 1) {
                accum.soFar.push([thisSub]);
            }
        } else {
            accum.last.push(thisSub);
            if (index === subscripts.length - 1) {
                accum.soFar.push(accum.last);
            }
        }
        return accum;
    }, { soFar: [], last: [] });
    return grouped.soFar;
}

//FIXME: this doesn' do multiple subs
function groupVariableBySubscripts(variables) {
    var groupedBySubscripts = variables.reduce(function (accum, v) {
        var subscriptMatches = v.match(/\[\s*([^)]+?)\s*\]/);
        var vname = v.split('[')[0];
        if (subscriptMatches && subscriptMatches[1]) {
            var subscripts = subscriptMatches[1].split(/\s*,\s*/).map(function (subscript) {
                return parseInt(subscript.trim(), 10);
            });
            accum[vname] = (accum[vname] || []).concat(subscripts);
        } else {
            accum[vname] = [];
        }
        return accum;
    }, {});
    return groupedBySubscripts;
}

function optimizedFetch(runService, variables) {
    var groupedBySubscripts = groupVariableBySubscripts(variables);

    var reducedVariables = variables.reduce(function (accum, v) {
        var vname = v.split('[')[0];
        var subs = groupedBySubscripts[vname];
        if (!groupedBySubscripts[vname].length) {
            accum.regular.push(vname);
        } else {
            var sortedSubs = subs.sort(function (a, b) {
                return a - b;
            });
            var groupedSubs = groupByContigousArrayItems(sortedSubs);
            groupedSubs.forEach(function (grouping) {
                var subs = grouping.length === 1 ? grouping[0] : grouping[0] + '..' + grouping[grouping.length - 1];
                accum.grouped[vname + '[' + subs + ']'] = grouping;
            });
        }
        return accum;
    }, { regular: [], grouped: {} });

    var toFetch = [].concat(reducedVariables.regular, Object.keys(reducedVariables.grouped));
    return runService.variables().query(toFetch).then(function (values) {
        var deparsed = Object.keys(values).reduce(function (accum, vname) {
            var groupedSubs = reducedVariables.grouped[vname];
            if (!groupedSubs) {
                accum[vname] = values[vname];
            } else {
                groupedSubs.forEach(function (subscript, index) {
                    var v = vname.split('[')[0];
                    accum[v + '[' + subscript + ']'] = values[vname][index];
                });
            }
            return accum;
        }, {});
        return deparsed;
    });
}

function RunVariablesChannel($runServicePromise, notifier) {

    var id = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniqueId"])('variable-channel');

    var fetchFn = function (runService, debounceInterval) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
        if (!runService.debouncedFetchers[id]) {
            runService.debouncedFetchers[id] = Object(__WEBPACK_IMPORTED_MODULE_0_utils_general__["debounceAndMerge"])(function (variables) {
                if (!variables || !variables.length) {
                    return $.Deferred().resolve([]).promise();
                }
                return optimizedFetch(runService, variables).then(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["d" /* objectToPublishable */]);
            }, debounceInterval, [function mergeVariables(accum, newval) {
                if (!accum) {
                    accum = [];
                }
                return Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniq"])(accum.concat(newval)).filter(function (v) {
                    return !!(v && v.trim());
                });
            }]);
        }
        return runService.debouncedFetchers[id];
    };

    var knownTopics = [];
    return {
        fetch: function () {
            return $runServicePromise.then(function (runService) {
                return fetchFn(runService, 0)(knownTopics).then(notifier);
            });
        },

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics, options) {
            var isAutoFetchEnabled = options.autoFetch;
            var debounceInterval = options.debounce;

            return $runServicePromise.then(function (runService) {
                knownTopics = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["uniq"])(knownTopics.concat(topics));
                if (!knownTopics.length) {
                    return $.Deferred().resolve([]).promise();
                } else if (!isAutoFetchEnabled) {
                    return $.Deferred().resolve(topics).promise();
                }
                return fetchFn(runService, debounceInterval)(topics).then(notifier);
            });
        },
        notify: function (variableObj) {
            return $runServicePromise.then(function (runService) {
                var variables = Object.keys(variableObj);
                return runService.variables().query(variables).then(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["d" /* objectToPublishable */]).then(notifier);
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["e" /* publishableToObject */])(topics);
                return runService.variables().save(toSave).then(function (response) {
                    var variables = Object.keys(toSave);
                    //Get the latest from the server because what you think you saved may not be what was saved
                    //bool -> 1, scalar to array for time-based models etc
                    //FIXME: This causes dupe requests, one here and one after fetch by the run-variables channel
                    //FIXME: Other publish can't do anything till this is done, so debouncing won't help. Only way out is caching
                    return runService.variables().query(variables).then(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["d" /* objectToPublishable */]);
                });
            });
        }
    };
}

/***/ }),
/* 54 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunOperationsChannel;
function RunOperationsChannel($runServicePromise, notifier) {
    return {
        notify: function (operationsResponse) {
            var parsed = [{ name: operationsResponse.name, value: operationsResponse.result }];
            return notifier(parsed);
        },

        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = topics.map(function (topic) {
                    return { name: topic.name, params: topic.value };
                });
                return runService.serial(toSave).then(function (result) {
                    var toReturn = result.map(function (response, index) {
                        return { name: topics[index].name, value: response };
                    });
                    return toReturn;
                });
            });
        }
    };
}

/***/ }),
/* 55 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = silencable;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


/**
 * @param {Publishable[]} published 
 * @param {boolean|String[]|{except: String[]}} [silentOptions]
 * @return {Publishable[]} filtered list
 */
function silencable(published, silentOptions) {
    if (silentOptions === true || !published) {
        return [];
    } else if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isArray"])(silentOptions)) {
        return published.filter(function (data) {
            return !Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["includes"])(silentOptions, data.name);
        });
    } else if (silentOptions && silentOptions.except) {
        return published.filter(function (data) {
            return Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["includes"])(silentOptions.except || [], data.name);
        });
    }
    return published;
}

/***/ }),
/* 56 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = excludeReadOnly;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


/**
 * 
 * @param {Publishable[]} publishable 
 * @param {boolean|string[]|Function} readOnlyOptions 
 * @return {Publishable[]} filtered list
 */
function excludeReadOnly(publishable, readOnlyOptions) {
    if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(readOnlyOptions)) {
        readOnlyOptions = readOnlyOptions();
    }
    if (readOnlyOptions === true) {
        console.error('Tried to publish to a readonly channel', publishable);
        return [];
    } else if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isArray"])(readOnlyOptions)) {
        var split = publishable.reduce(function (accum, data) {
            var isReadonly = Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["includes"])(readOnlyOptions, data.name);
            if (isReadonly) {
                accum.readOnly.push(data);
            } else {
                accum.remaining.push(data);
            }
            return accum;
        }, { readOnly: [], remaining: [] });

        if (split.readOnly.length) {
            console.error('Ignoring readonly publishes', split.readOnly);
        }
        return split.remaining;
    }
    return publishable;
}

/***/ }),
/* 57 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_router__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_channels_channel_router__ = __webpack_require__(5);




/* harmony default export */ __webpack_exports__["a"] = (function (config, notifier) {
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

    var baselineChannel = new __WEBPACK_IMPORTED_MODULE_0__run_router__["a" /* default */](baselineOptions, Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["i" /* withPrefix */])(notifier, 'baseline:'));
    var currentRunChannel = new __WEBPACK_IMPORTED_MODULE_0__run_router__["a" /* default */](runOptions, Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["i" /* withPrefix */])(notifier, ['current:', '']));
    var handlers = [$.extend(baselineChannel, {
        name: 'baseline',
        match: Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["d" /* prefix */])('baseline:'),
        options: baselineOptions.channelOptions
    }), $.extend(currentRunChannel, {
        isDefault: true,
        name: 'current',
        match: Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["a" /* defaultPrefix */])('current:'),
        options: runOptions.channelOptions
    })];

    var scenarioManagerRouter = Object(__WEBPACK_IMPORTED_MODULE_2_channels_channel_router__["a" /* default */])(handlers, notifier);
    scenarioManagerRouter.expose = { scenarioManager: sm };
    return scenarioManagerRouter;
});

/***/ }),
/* 58 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_router_factory__ = __webpack_require__(59);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__ = __webpack_require__(3);



/* harmony default export */ __webpack_exports__["a"] = (function (options, notifier) {
    if (!options) options = {};

    var opts = {};
    opts.serviceOptions = options.serviceOptions && options.serviceOptions.run ? options.serviceOptions.run : {};
    opts.channelOptions = options.channelOptions;

    return {
        subscribeHandler: function (topics, options, prefix) {
            var runid = Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["g" /* stripSuffixDelimiter */])(prefix);
            //FIXME: Should i merge options here?
            var channel = Object(__WEBPACK_IMPORTED_MODULE_0__run_router_factory__["a" /* default */])(runid, opts, Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["i" /* withPrefix */])(notifier, prefix));
            return channel.subscribeHandler(topics, options, prefix);
        },
        publishHandler: function (topics, options, prefix) {
            var runid = Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["g" /* stripSuffixDelimiter */])(prefix);
            var channel = Object(__WEBPACK_IMPORTED_MODULE_0__run_router_factory__["a" /* default */])(runid, opts, Object(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["i" /* withPrefix */])(notifier, prefix));
            return channel.publishHandler(topics);
        }
    };
});

/***/ }),
/* 59 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_router__ = __webpack_require__(6);

var knownRunIDServiceChannels = {};

/* harmony default export */ __webpack_exports__["a"] = (function (runid, options, notifier) {
    var runChannel = knownRunIDServiceChannels[runid];
    if (!runChannel) {
        var runOptions = $.extend(true, {}, options, { serviceOptions: { id: runid } });
        runChannel = new __WEBPACK_IMPORTED_MODULE_0__run_router__["a" /* default */](runOptions, notifier);
        knownRunIDServiceChannels[runid] = runChannel;
    }
    return runChannel;
});

/***/ }),
/* 60 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__world_users_channel__ = __webpack_require__(61);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__world_current_user_channel__ = __webpack_require__(62);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_channels_middleware_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__run_router__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_channels_channel_router__ = __webpack_require__(5);







var _window = window,
    F = _window.F;

//TODO: Add custom worldid channel as well
//

/* harmony default export */ __webpack_exports__["a"] = (function (config, notifier) {
    var _this = this;

    var defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    var opts = $.extend(true, {}, defaults, config);

    var rmOptions = opts.serviceOptions;
    var rm = new F.manager.RunManager(rmOptions);

    var getRunPromise = rm.getRun().catch(function (err) {
        console.error('Run manager get run error', err);
        throw err;
    });
    var $runPromise = getRunPromise.then(function (run) {
        if (!run.world) {
            console.error('No world found in run. Make sure you\'re using EpicenterJS version > 2.4');
            throw new Error('Could not find world');
        }
        if (rm.run.getChannel) {
            return rm.run;
        }

        var channelManager = new F.manager.ChannelManager();
        var worldChannel = channelManager.getWorldChannel(run.world);

        worldChannel.subscribe('reset', function (run) {
            rm.run.updateConfig({ filter: run.id });
        }, _this, { includeMine: false });
        rm.run.channel = worldChannel;
        return rm.run;
    });
    var currentChannelOpts = $.extend(true, { serviceOptions: $runPromise }, opts.defaults, opts.current);
    var currentRunChannel = new __WEBPACK_IMPORTED_MODULE_3__run_router__["a" /* default */](currentChannelOpts, Object(__WEBPACK_IMPORTED_MODULE_2_channels_middleware_utils__["i" /* withPrefix */])(notifier, ['run:', '']));

    var runRouteHandler = $.extend(currentRunChannel, {
        match: Object(__WEBPACK_IMPORTED_MODULE_2_channels_middleware_utils__["a" /* defaultPrefix */])('run:'),
        name: 'World Run',
        isDefault: true,
        options: currentChannelOpts.channelOptions
    });
    var handlers = [runRouteHandler];
    var worldPromise = getRunPromise.then(function (run) {
        return run.world;
    });
    var presenceChannel = new __WEBPACK_IMPORTED_MODULE_0__world_users_channel__["a" /* default */](worldPromise, Object(__WEBPACK_IMPORTED_MODULE_2_channels_middleware_utils__["i" /* withPrefix */])(notifier, 'users:'));
    var presenceHandler = $.extend(presenceChannel, {
        match: Object(__WEBPACK_IMPORTED_MODULE_2_channels_middleware_utils__["d" /* prefix */])('users:'),
        name: 'world users'
    });
    handlers.unshift(presenceHandler);

    var userChannel = new __WEBPACK_IMPORTED_MODULE_1__world_current_user_channel__["a" /* default */](worldPromise, Object(__WEBPACK_IMPORTED_MODULE_2_channels_middleware_utils__["i" /* withPrefix */])(notifier, 'user:'));
    var userHandler = $.extend(userChannel, {
        match: Object(__WEBPACK_IMPORTED_MODULE_2_channels_middleware_utils__["d" /* prefix */])('user:'),
        name: 'current user'
    });
    handlers.unshift(userHandler);

    var runMangerRouter = Object(__WEBPACK_IMPORTED_MODULE_4_channels_channel_router__["a" /* default */])(handlers);
    runMangerRouter.expose = { runManager: rm };

    return runMangerRouter;
});

/***/ }),
/* 61 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = WorldUsersChanngel;
var F = window.F;

function WorldUsersChanngel(worldPromise, notifier) {
    var subsid = void 0;

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
    var channelManager = new F.manager.ChannelManager();

    var parsedUsersPromise = worldPromise.then(function (world) {
        var am = new F.manager.AuthManager();
        var session = am.getCurrentUserSessionInfo();
        var parsed = world.users.map(function (u) {
            u.name = u.lastName;
            u.isMe = u.userId === session.userId;
            u.isOnline = u.isMe; //Assume i'm the only online one by default
            return u;
        });
        store.users = parsed;
        return parsed;
    });

    return {
        unsubscribeHandler: function (knownTopics, remainingTopics) {
            if (remainingTopics.length || !subsid) {
                return;
            }
            worldPromise.then(function (world) {
                var worldChannel = channelManager.getWorldChannel(world);
                worldChannel.unsubscribe(subsid);
                subsid = null;
            });
        },
        subscribeHandler: function (userids) {
            if (!subsid) {
                worldPromise.then(function (world) {
                    var worldChannel = channelManager.getWorldChannel(world);
                    subsid = worldChannel.subscribe('presence', function (user, meta) {
                        // console.log('presence', user, meta);
                        var userid = user.id;
                        store.mark(userid, user.isOnline);

                        return notifier([{ name: '', value: store.users }]);
                    }, { includeMine: false });
                });
            }
            return parsedUsersPromise.then(function (users) {
                return notifier([{ name: '', value: users }]);
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
/* 62 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = WorldUsersChanngel;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


var F = window.F;

function WorldUsersChanngel(worldPromise, notifier) {
    var subsid = void 0;

    var am = new F.manager.AuthManager();
    var store = $.extend(true, {
        isMe: true,
        isOnline: true
    }, am.getCurrentUserSessionInfo());
    var channelManager = new F.manager.ChannelManager();

    return {
        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            if (remainingTopics.length || !subsid) {
                return;
            }

            worldPromise.then(function (world) {
                var worldChannel = channelManager.getWorldChannel(world);
                worldChannel.unsubscribe(subsid);
            });
            subsid = null;
        },
        subscribeHandler: function (userFields) {
            return worldPromise.then(function (world) {
                var session = am.getCurrentUserSessionInfo();
                var myUser = __WEBPACK_IMPORTED_MODULE_0_lodash___default.a.find(world.users, function (user) {
                    return user.userId === session.userId;
                });
                $.extend(store, myUser);

                var toNotify = userFields.reduce(function (accum, field) {
                    if (store[field] !== undefined) {
                        accum.push({ name: field, value: store[field] });
                    }
                    return accum;
                }, []);
                notifier(toNotify);

                //TODO: Also subscribe to presence?
                if (!subsid) {
                    var worldChannel = channelManager.getWorldChannel(world);
                    subsid = worldChannel.subscribe('roles', function (user, meta) {
                        // console.log('Roles notification', user, meta);
                        if (user.userId === store.userId && user.role !== store.role) {
                            store.role = user.role;
                            notifier([{ name: 'role', value: user.role }]);
                        }
                    });
                }
            });
        }
    };
}

/***/ }),
/* 63 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunsRouter;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_general__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_general___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_utils_general__);
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();


var _window = window,
    F = _window.F;


function RunsRouter(options, notifier, channelManagerContext) {
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
            console.log('unsubs');
            // knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics, options) {
            var topic = [].concat(topics)[0];

            var filters = extractFiltersFromTopic(topic);
            var variables = options && options.include;

            var debounceInterval = 300;
            var debouncedFetch = Object(__WEBPACK_IMPORTED_MODULE_0_utils_general__["debounceAndMerge"])(fetch, debounceInterval, function (accum, newval) {
                return newval;
            });
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
/* 64 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export match */
/* harmony export (immutable) */ __webpack_exports__["a"] = JSONRouter;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_parse_utils__ = __webpack_require__(2);


function match(topic) {
    var parsed = Object(__WEBPACK_IMPORTED_MODULE_0_utils_parse_utils__["toImplicitType"])(topic);
    return typeof parsed !== 'string';
}

function JSONRouter(config, notifier) {
    return {
        match: match,
        name: 'JSON Route',
        subscribeHandler: function (topics, options, prefix) {
            var parsed = topics.reduce(function (accum, t) {
                if (match(t)) {
                    accum.claimed.push({
                        name: t,
                        value: Object(__WEBPACK_IMPORTED_MODULE_0_utils_parse_utils__["toImplicitType"])(t)
                    });
                } else {
                    accum.rest.push(t);
                }
                return accum;
            }, { claimed: [], rest: [] });
            setTimeout(function () {
                notifier(parsed.claimed);
            }, 0);
            return parsed.rest;
        }
    };
}

/***/ }),
/* 65 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__channel_router__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_utils_parse_utils__ = __webpack_require__(2);



//FIXME: This doesn't handle add-route
/* harmony default export */ __webpack_exports__["a"] = (function (config, notifier, channelManagerContext) {
    var options = $.extend(true, {}, {
        routes: []
    }, config);

    var routes = options.routes.map(function (r) {
        var router = typeof r === 'function' ? new r(config, notifier) : r;
        var oldSubsHandler = router.subscribeHandler;

        if (typeof router.match === 'string') {
            var oldMatch = router.match;
            router.match = function (t) {
                return t === oldMatch;
            };
        }

        router.subscribeHandler = function (topics) {
            var parsed = topics.reduce(function (accum, t) {
                if (router.match(t)) {
                    accum.claimed.push({
                        name: t,
                        value: oldSubsHandler(t)
                    });
                } else {
                    accum.rest.push(t);
                }
                return accum;
            }, { claimed: [], rest: [] });
            setTimeout(function () {
                if (parsed.claimed.length) {
                    notifier(parsed.claimed);
                }
            }, 0);
            return parsed.rest;
        };
        return router;
    });
    var defaultRouter = Object(__WEBPACK_IMPORTED_MODULE_0__channel_router__["a" /* default */])(routes, notifier);
    var oldHandler = defaultRouter.subscribeHandler;
    defaultRouter.subscribeHandler = function (topics, options) {
        var parsed = topics.reduce(function (accum, topic) {
            routes.forEach(function (route) {
                if (route.match(topic)) {
                    accum.claimed.push(topic);
                } else {
                    accum.rest.push(topic);
                }
            });
            return accum;
        }, { claimed: [], rest: [] });
        if (parsed.claimed.length) {
            oldHandler(parsed.claimed);
            return parsed.rest;
        }
        return topics;
    };

    defaultRouter.expose = { router: defaultRouter };
    return defaultRouter;
});

/***/ }),
/* 66 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__interpolatable__ = __webpack_require__(67);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_0__interpolatable__["a"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__with_middleware__ = __webpack_require__(70);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return __WEBPACK_IMPORTED_MODULE_1__with_middleware__["a"]; });



/***/ }),
/* 67 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = interpolatable;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__subscribe_interpolator__ = __webpack_require__(68);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__publish_interpolator__ = __webpack_require__(69);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }




/**
 * Decorates passed channel manager with interpolation functionality
 * @param  {ChannelManager} ChannelManager
 * @return {ChannelManager}                wrapped channel manager
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
                }, { autoFetch: true, batch: true });
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
/* 68 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export getDependencies */
/* unused harmony export interpolateWithDependencies */
/* unused harmony export mergeInterpolatedTopicsWithData */
/* harmony export (immutable) */ __webpack_exports__["a"] = subscribeInterpolator;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__interpolatable_utils__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_lodash__);



/**
 * @param {String[]} topics
 * @return {String[]} interpolated
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
 * @param {String[]} topics
 * @param {Object} data
 * @return {String[]}
 */
function interpolateWithDependencies(topics, data) {
    return topics.map(function (topic) {
        return Object(__WEBPACK_IMPORTED_MODULE_0__interpolatable_utils__["b" /* interpolateWithValues */])(topic, data);
    });
}

/**
 * @param  {String[]} originalTopics     
 * @param  {String[]} interpolatedTopics 
 * @param  {Object} data               
 * @return {Object}                    Interpolated
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
 * @return {Function}                    wrapped function
 */
function subscribeInterpolator(subscribeFn, onDependencyChange) {
    return function interpolatedSubscribe(topics, cb, options) {
        topics = [].concat(topics);
        var dependencies = getDependencies(topics);
        if (!dependencies.length) {
            return subscribeFn(topics, cb, options);
        }
        var innerSubsId = subscribeFn(dependencies, function handleDependencyValueChange(data, dependenciesMeta) {
            var interpolatedTopics = interpolateWithDependencies(topics, data);

            var outerSubsId = subscribeFn(interpolatedTopics, function handleInterpolatedValueChange(actualData, actualMeta) {
                var toSendback = mergeInterpolatedTopicsWithData(topics, interpolatedTopics, actualData);

                cb(toSendback, actualMeta);
            }, options);

            (onDependencyChange || $.noop)(dependenciesMeta.id, outerSubsId);
            return outerSubsId;
        }, { autoFetch: true, batch: true });

        return innerSubsId;
    };
}

/***/ }),
/* 69 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export getDependencies */
/* unused harmony export interpolateWithDependencies */
/* harmony export (immutable) */ __webpack_exports__["a"] = publishInterpolator;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__interpolatable_utils__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);





/**
 * @param {Publishable[]} publishInputs
 * @returns {String[]} dependencies for inputs
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
 * @param {Object} valuesToInterpolate
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
 * @param  {Function} fetchFn         function to get interpolated values from
 * @return {Function}                 wrapped function
 */
function publishInterpolator(publishFunction, fetchFn) {
    return function interpolatedPublishfunction(topic, value, options) {
        var normalizedPublishInputs = Object(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["c" /* normalizeParamOptions */])(topic, value, options);
        var dependencies = getDependencies(normalizedPublishInputs.params);
        if (!dependencies.length) {
            return publishFunction(topic, value, options);
        }

        var prom = $.Deferred();
        fetchFn(dependencies, function handleDependencyChange(resolvedDependencies) {
            var interpolated = interpolateWithDependencies(normalizedPublishInputs.params, resolvedDependencies);
            var newPublishProm = publishFunction(interpolated, normalizedPublishInputs.options);
            prom.resolve(newPublishProm);
        });
        return prom.promise();
    };
}

/***/ }),
/* 70 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = withMiddleware;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__middleware_manager__ = __webpack_require__(71);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__channel_utils__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }





function getTopicsFromSubsList(subcriptionList) {
    return subcriptionList.reduce(function (accum, subs) {
        accum = accum.concat(subs.topics);
        return accum;
    }, []);
}

/**
 * Decorates passed channel manager with middleware functionality
 * @param  {ChannelManager} ChannelManager
 * @return {ChannelManager}                wrapped channel manager
 */
function withMiddleware(ChannelManager) {
    /**
     * @implements {ChannelManager}
     */
    return function (_ChannelManager) {
        _inherits(ChannelWithMiddleware, _ChannelManager);

        function ChannelWithMiddleware(options) {
            _classCallCheck(this, ChannelWithMiddleware);

            var _this = _possibleConstructorReturn(this, (ChannelWithMiddleware.__proto__ || Object.getPrototypeOf(ChannelWithMiddleware)).call(this, options));

            var defaults = {
                middlewares: []
            };
            var opts = $.extend(true, {}, defaults, options);
            _this.middlewares = new __WEBPACK_IMPORTED_MODULE_0__middleware_manager__["a" /* default */](opts, _this.notify.bind(_this), _this);
            return _this;
        }

        /**
         * Allow intercepting and handling/suppressing data to publish calls.
         * @param {string | Publishable } topic
         * @param {any} [value] item to publish
         * @param {Object} [options]
         * @return {Promise}
         */


        _createClass(ChannelWithMiddleware, [{
            key: 'publish',
            value: function publish(topic, value, options) {
                var _this2 = this;

                var normalized = Object(__WEBPACK_IMPORTED_MODULE_1__channel_utils__["c" /* normalizeParamOptions */])(topic, value, options);
                var prom = $.Deferred().resolve(normalized.params).promise();
                var lastAvailableData = normalized.params;
                var middlewares = this.middlewares.filter('publish');
                middlewares.forEach(function (middleware) {
                    prom = prom.then(function (publishResponse) {
                        return middleware(publishResponse, normalized.options);
                    }).then(function (response) {
                        lastAvailableData = response || lastAvailableData;
                        return lastAvailableData;
                    });
                });
                prom = prom.then(function (published) {
                    return _get(ChannelWithMiddleware.prototype.__proto__ || Object.getPrototypeOf(ChannelWithMiddleware.prototype), 'publish', _this2).call(_this2, published, normalized.options);
                });
                return prom;
            }
            /**
             * Allow intercepting and excluding topics from by subsequent middlewares
             * @param  {string | string[]}   topics
             * @param  {Function} cb
             * @param  {Object}   options
             * @return {string}           subscription id
             */

        }, {
            key: 'subscribe',
            value: function subscribe(topics, cb, options) {
                var subsid = _get(ChannelWithMiddleware.prototype.__proto__ || Object.getPrototypeOf(ChannelWithMiddleware.prototype), 'subscribe', this).call(this, topics, cb, options);
                var subscribeMiddlewares = this.middlewares.filter('subscribe');
                //Subscription needs to happen first, or if you skip topics they'll never be subscribed, so you can't notify
                var newTopics = [].concat(topics);
                subscribeMiddlewares.forEach(function (middleware) {
                    newTopics = middleware(newTopics, options) || newTopics;
                });
                return subsid;
            }

            /**
             * Calls unsubscribe middleware *after* unsubscription with a list of recently unsubscribed topics
             * @param  {string} token
             * @return {void}
             */

        }, {
            key: 'unsubscribe',
            value: function unsubscribe(token) {
                var currentTopics = getTopicsFromSubsList(this.subscriptions);
                _get(ChannelWithMiddleware.prototype.__proto__ || Object.getPrototypeOf(ChannelWithMiddleware.prototype), 'unsubscribe', this).call(this, token);
                var remainingTopics = getTopicsFromSubsList(this.subscriptions);

                var unsubscribedTopics = Object(__WEBPACK_IMPORTED_MODULE_2_lodash__["difference"])(currentTopics, remainingTopics);
                var middlewares = this.middlewares.filter('unsubscribe');
                middlewares.forEach(function (middleware) {
                    return middleware(unsubscribedTopics, remainingTopics);
                });
            }

            /**
             * Calls unsubscribe middleware after unsubscribeAll on the channel
             * @return {void}
             */

        }, {
            key: 'unsubscribeAll',
            value: function unsubscribeAll() {
                var currentlySubscribed = this.getSubscribedTopics();
                _get(ChannelWithMiddleware.prototype.__proto__ || Object.getPrototypeOf(ChannelWithMiddleware.prototype), 'unsubscribeAll', this).call(this);
                var middlewares = this.middlewares.filter('unsubscribe');
                middlewares.forEach(function (middleware) {
                    return middleware(currentlySubscribed, []);
                });
            }
        }]);

        return ChannelWithMiddleware;
    }(ChannelManager);
}

/***/ }),
/* 71 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = MiddlewareManager;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_lodash__);


function MiddlewareManager(options, notifier, channelManagerContext) {
    var defaults = {
        middlewares: []
    };
    var opts = $.extend(true, {}, defaults, options);
    var optsToPassOn = Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["omit"])(opts, Object.keys(defaults));

    var list = [];
    var publicAPI = {
        list: list,

        add: function (middleware, index) {
            if (Object(__WEBPACK_IMPORTED_MODULE_0_lodash__["isFunction"])(middleware)) {
                //FIXME: move channelManagerContext functionality to router
                middleware = new middleware(optsToPassOn, notifier, channelManagerContext);
            }
            $.extend(channelManagerContext, middleware.expose); //add any public props middleware wants to expose
            list.push(middleware);
        },

        filter: function (type) {
            type = type + 'Handler';
            return list.reduce(function (accum, m) {
                if (m[type]) {
                    accum.push(m[type]);
                }
                return accum;
            }, []);
        }
    };

    $.extend(this, publicAPI);
    opts.middlewares.forEach(this.add);
}

/***/ })
/******/ ]);
//# sourceMappingURL=flow.js.map