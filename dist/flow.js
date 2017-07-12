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
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
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
/******/ 	return __webpack_require__(__webpack_require__.s = 46);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = {
    prefix: 'f',
    defaultAttr: 'bind',

    binderAttr: 'f-bind',

    events: {
        //UI Change to publish to the channel.
        trigger: 'update.f.ui',

        //Payload is of form {topic: value}. When triggered on a element dom-manager will trigger 'f.convert' on every attribute subscribed to that topic
        channelDataReceived: 'update.f.model',

        //Trigger with payload '{attrToUpdate: value}', for e.g. { bind: 34 }. This will run this through all the converts and pass it to attr handler. Useful to by-pass getting this from the model directly.
        convert: 'f.convert',

        //When triggered posts the payload to the operations API. Assumes payloaded is formmatted in a way Run Channel can understand
        operate: 'f.ui.operate'
    },

    attrs: {
        //Array with shape [{ attr: attribute, topics:[list of topics attribute is listening to]}]
        bindingsList: 'f-attr-bindings',

        //Subscription id returned by the channel. Used to ubsubscribe later
        subscriptionId: 'f-subscription-id',

        //Used by the classes attr handler to keep track of which classes were added by itself
        classesAdded: 'f-added-classes',

        //Used by repeat attr handler to keep track of template after first evaluation
        repeat: {
            template: 'repeat-template', //don't prefix by f or dom-manager unbind will kill it
            templateId: 'repeat-template-id'
        },

        //Used by foreach attr handler to keep track of template after first evaluation
        foreachTemplate: 'f-foreach-template',
        keyAs: 'f-foreach-key-as',
        valueAs: 'f-foreach-value-as',

        //Used by bind attr handler to keep track of template after first evaluation
        bindTemplate: 'f-bind-template'
    }
};

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__silencable__ = __webpack_require__(24);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "f", function() { return __WEBPACK_IMPORTED_MODULE_0__silencable__["a"]; });
/* harmony export (immutable) */ __webpack_exports__["h"] = stripSuffixDelimiter;
/* harmony export (immutable) */ __webpack_exports__["c"] = prefix;
/* harmony export (immutable) */ __webpack_exports__["d"] = defaultPrefix;
/* harmony export (immutable) */ __webpack_exports__["b"] = regex;
/* harmony export (immutable) */ __webpack_exports__["g"] = mapWithPrefix;
/* harmony export (immutable) */ __webpack_exports__["a"] = withPrefix;
/* harmony export (immutable) */ __webpack_exports__["e"] = unprefix;
var CHANNEL_DELIMITER = ':';



function stripSuffixDelimiter(text) {
    if (text && text.indexOf(CHANNEL_DELIMITER) === text.length - 1) {
        text = text.replace(CHANNEL_DELIMITER, '');
    }
    return text;
}

function prefix(prefix) {
    return function matchPrefix(topic) {
        return topic.indexOf(prefix) === 0 ? prefix : false;
    };
}
function defaultPrefix(prefix) {
    return function matchPrefix(topic) {
        return prefix;
    };
}

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

function mapWithPrefix(dataArray, prefix) {
    if (!prefix) return dataArray;
    return (dataArray || []).map(function (datapt) {
        return $.extend(true, {}, datapt, { name: prefix + datapt.name });
    });
}

function withPrefix(callback, prefixList) {
    prefixList = [].concat(prefixList);
    return function (data) {
        prefixList.forEach(function (prefix) {
            var mapped = mapWithPrefix(data, prefix);
            callback(mapped);
        });
    };
}

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
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__ = __webpack_require__(1);
/* unused harmony export notifySubscribeHandlers */
/* unused harmony export notifyUnsubscribeHandlers */
/* unused harmony export passthroughPublishInterceptors */
/* harmony export (immutable) */ __webpack_exports__["a"] = Router;



/**
 * Handle subscriptions
 * @param  {Array} handlers Array of the form [{ match: function (){}, }]
 * @param  {Array} topics   Array of strings
 * @return {Array} Returns the original topics array
 */
function notifySubscribeHandlers(handlers, topics) {
    var grouped = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["a" /* groupByHandlers */])(topics, handlers);
    grouped.forEach(function (handler) {
        if (handler.subscribeHandler) {
            var unprefixed = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["e" /* unprefix */])(handler.data, handler.matched);
            handler.subscribeHandler(unprefixed, handler.matched);
        }
    });
    return topics;
}

function notifyUnsubscribeHandlers(handlers, recentlyUnsubscribedTopics, remainingTopics) {
    handlers = handlers.map(function (h, index) {
        h.unsubsKey = index;
        return h;
    });

    var unsubsGrouped = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["a" /* groupByHandlers */])(recentlyUnsubscribedTopics, handlers);
    var remainingGrouped = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["a" /* groupByHandlers */])(remainingTopics, handlers);

    unsubsGrouped.forEach(function (handler) {
        if (handler.unsubscribeHandler) {
            var unprefixedUnsubs = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["e" /* unprefix */])(handler.data, handler.matched);
            var matchingRemainingHandler = _.find(remainingGrouped, function (remainingHandler) {
                return remainingHandler.unsubsKey === handler.unsubsKey;
            });
            var matchingTopicsRemaining = matchingRemainingHandler ? matchingRemainingHandler.data : [];
            var unprefixedRemaining = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["e" /* unprefix */])(matchingTopicsRemaining || [], handler.matched);
            handler.unsubscribeHandler(unprefixedUnsubs, unprefixedRemaining);
        }
    });
}

function passthroughPublishInterceptors(handlers, publishData, options) {
    var grouped = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["b" /* groupSequentiallyByHandlers */])(publishData, handlers);
    var $initialProm = $.Deferred().resolve([]).promise();
    grouped.forEach(function (handler) {
        $initialProm = $initialProm.then(function (dataSoFar) {
            var mergedOptions = $.extend(true, {}, handler.options, options);
            if (mergedOptions.readOnly) {
                console.warn('Tried to publish to a readonly channel', handler);
                return dataSoFar;
            }
            var unprefixed = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["e" /* unprefix */])(handler.data, handler.matched);
            var result = handler.publishHandler ? handler.publishHandler(unprefixed, handler.matched) : unprefixed;
            var publishProm = $.Deferred().resolve(result).promise();
            return publishProm.then(function (published) {
                return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["f" /* silencable */])(published, mergedOptions.silent);
            }).then(function (published) {
                var mapped = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["g" /* mapWithPrefix */])(published, handler.matched);
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
 * @param  {Array} handlers Array of the form [{ subscribeHandler, unsubscribeHandler, publishHandler }]
 * @return {Router}
 */
function Router(handlers) {
    return {
        subscribeHandler: function (topics) {
            return notifySubscribeHandlers(handlers, topics);
        },
        unsubscribeHandler: function (recentlyUnsubscribedTopics, remainingTopics) {
            return notifyUnsubscribeHandlers(handlers, recentlyUnsubscribedTopics, remainingTopics);
        },
        publishHandler: function (data, options) {
            return passthroughPublishInterceptors(handlers, data, options);
        }

    };
}

/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export findBestHandler */
/* harmony export (immutable) */ __webpack_exports__["c"] = objectToArray;
/* harmony export (immutable) */ __webpack_exports__["d"] = arrayToObject;
/* harmony export (immutable) */ __webpack_exports__["e"] = normalizeParamOptions;
/* harmony export (immutable) */ __webpack_exports__["a"] = groupByHandlers;
/* harmony export (immutable) */ __webpack_exports__["b"] = groupSequentiallyByHandlers;
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
function objectToArray(obj) {
    var mapped = Object.keys(obj || {}).map(function (t) {
        return { name: t, value: obj[t] };
    });
    return mapped;
}
function arrayToObject(arr) {
    var result = (arr || []).reduce(function (accum, topic) {
        accum[topic.name] = topic.value;
        return accum;
    }, {});
    return result;
}

function normalizeParamOptions(topic, publishValue, options) {
    if (!topic) {
        return { params: [], options: {} };
    }
    if ($.isPlainObject(topic)) {
        return { params: objectToArray(topic), options: publishValue };
    }
    if ($.isArray(topic)) {
        return { params: topic, options: publishValue };
    }
    return { params: [{ name: topic, value: publishValue }], options: options };
}

/**
 * [groupByHandlers description]
 * @param  {Array} topics   List of topics to match. Format can be anything your handler.match function handles
 * @param  {Array} handlers Handlers of type [{ match: func }]
 * @return {Array} The handler array with each item now having an additional 'data' attr added to it
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
    return _.values(topicMapping);
}

/**
 * Takes a `publish` dataset and groups it by handler maintaining the data sequence
 * @param  {Array} data     Of the form [{ name: 'X', }]
 * @param  {Array} handlers Handlers of type [{ match: func }]
 * @return {Array} The handler array with each item now having an additional 'data' attr added to it
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
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = {

    toImplicitType: function (data) {
        var rbrace = /^(?:\{.*\}|\[.*])$/;
        var converted = data;
        if (typeof data === 'string') {
            data = data.trim();

            if (data === 'true') {
                converted = true;
            } else if (data === 'false') {
                converted = false;
            } else if (data === 'null') {
                converted = null;
            } else if (data === 'undefined') {
                converted = '';
            } else if (converted.charAt(0) === '\'' || converted.charAt(0) === '"') {
                converted = data.substring(1, data.length - 1);
            } else if ($.isNumeric(data)) {
                converted = +data;
            } else if (rbrace.test(data)) {
                //TODO: This only works with double quotes, i.e., [1,"2"] works but not [1,'2']
                converted = JSON.parse(data);
            }
        }
        return converted;
    }
};

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_meta_channel__ = __webpack_require__(17);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__run_variables_channel__ = __webpack_require__(19);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__run_operations_channel__ = __webpack_require__(18);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_channels_channel_router__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__ = __webpack_require__(1);
/* harmony export (immutable) */ __webpack_exports__["a"] = RunRouter;







function RunRouter(config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {
            variables: {
                autoFetch: true,
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
                readOnly: false
            }
        }
    };
    var opts = $.extend(true, {}, defaults, config);

    var serviceOptions = _.result(opts, 'serviceOptions');

    var $initialProm = null;
    if (serviceOptions instanceof window.F.service.Run) {
        $initialProm = $.Deferred().resolve(serviceOptions).promise();
    } else if (serviceOptions.then) {
        $initialProm = serviceOptions;
    } else {
        var rs = new window.F.service.Run(serviceOptions);
        $initialProm = $.Deferred().resolve(rs).promise();
    }

    var metaChannel = new __WEBPACK_IMPORTED_MODULE_0__run_meta_channel__["a" /* default */]($initialProm, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["a" /* withPrefix */])(notifier, 'meta:'));
    var operationsChannel = new __WEBPACK_IMPORTED_MODULE_2__run_operations_channel__["a" /* default */]($initialProm, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["a" /* withPrefix */])(notifier, 'operations:'));
    var variableschannel = new __WEBPACK_IMPORTED_MODULE_1__run_variables_channel__["a" /* default */]($initialProm, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["a" /* withPrefix */])(notifier, ['variables:', '']));

    var handlers = [$.extend({}, metaChannel, {
        name: 'meta',
        match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["c" /* prefix */])('meta:'),
        options: opts.channelOptions.meta
    }), $.extend({}, operationsChannel, {
        name: 'operations',
        match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["c" /* prefix */])('operations:'),
        options: opts.channelOptions.operations
    }), $.extend({}, variableschannel, {
        isDefault: true,
        name: 'variables',
        match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["d" /* defaultPrefix */])('variables:'),
        options: opts.channelOptions.variables
    })];

    var router = new __WEBPACK_IMPORTED_MODULE_3_channels_channel_router__["a" /* default */](handlers, notifier);
    var oldhandler = router.publishHandler;
    router.publishHandler = function () {
        var prom = oldhandler.apply(router, arguments);
        return prom.then(function (result) {
            //all the silencing will be taken care of by the router
            if (result && result.length) {
                variableschannel.fetch();
            }
            return result;
        });
    };
    return router;
}

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var extend = function (protoProps, staticProps) {
    var me = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
    } else {
        child = function () {
            return me.apply(this, arguments);
        };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, me, staticProps);

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
        _.extend(child.prototype, protoProps);
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

_.extend(View.prototype, {
    initialize: function () {}
});

View.extend = extend;

module.exports = View;

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var config = __webpack_require__(0);
var BaseView = __webpack_require__(8);

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

                var params = {};
                params[propName] = val;

                me.$el.trigger(config.events.trigger, params);
            });
        }
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: 'input, select' });

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var BaseView = __webpack_require__(6);

module.exports = BaseView.extend({
    propertyHandlers: [],

    initialize: function () {}
}, { selector: '*' });

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = {
    random: function (prefix, min, max) {
        if (!min) {
            min = parseInt(_.uniqueId(), 10);
        }
        if (!max) {
            max = 100000; //eslint-disable-line no-magic-numbers
        }
        var number = _.random(min, max, false) + '';
        if (prefix) {
            number = prefix + number;
        }
        return number;
    },

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
            var newArgs = _.toArray(arguments);
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
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__middleware_json_parse_middleware__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__middleware_epicenter_middleware__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__channel_manager__ = __webpack_require__(12);
/* harmony export (immutable) */ __webpack_exports__["default"] = ChannelManager;




//Moving  epicenter-centric glue here so channel-manager can be tested in isolation
function ChannelManager(opts) {
    return new __WEBPACK_IMPORTED_MODULE_2__channel_manager__["a" /* default */]($.extend(true, {}, {
        middlewares: [__WEBPACK_IMPORTED_MODULE_0__middleware_json_parse_middleware__["a" /* default */], __WEBPACK_IMPORTED_MODULE_1__middleware_epicenter_middleware__["a" /* default */]]
    }, opts));
}

/***/ }),
/* 11 */
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


module.exports = function () {
    var config = __webpack_require__(0);
    var parseUtils = __webpack_require__(4);
    var domUtils = __webpack_require__(48);

    var converterManager = __webpack_require__(26);
    var nodeManager = __webpack_require__(44);
    var attrManager = __webpack_require__(31);
    var autoUpdatePlugin = __webpack_require__(45);

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

    var getMatchingElements = function (root) {
        var $root = $(root);
        var matchedElements = $root.find(':' + config.prefix);
        if ($root.is(':' + config.prefix)) {
            matchedElements = matchedElements.add($root);
        }
        return matchedElements;
    };

    var getElementOrError = function (element, context) {
        if (element instanceof $) {
            element = element.get(0);
        }
        if (!element || !element.nodeName) {
            console.error(context, 'Expected to get DOM Element, got ', element);
            throw new Error(context + ': Expected to get DOM Element, got' + typeof element);
        }
        return element;
    };

    var publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,
        converters: converterManager,
        //utils for testing
        private: {
            matchedElements: []
        },

        /**
         * Unbind the element: unsubscribe from all updates on the relevant channels.
         *
         * @param {DomElement} element The element to remove from the data binding.
         * @param {ChannelInstance} channel (Optional) The channel from which to unsubscribe. Defaults to the [variables channel](../channels/variables-channel/).
         * @returns {undefined}
         */
        unbindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            element = getElementOrError(element);
            var $el = $(element);
            if (!$el.is(':' + config.prefix)) {
                return false;
            }
            this.private.matchedElements = _.without(this.private.matchedElements, element);

            //FIXME: have to readd events to be able to remove them. Ugly
            var Handler = nodeManager.getHandler($el);
            var h = new Handler.handle({
                el: element
            });
            if (h.removeEvents) {
                h.removeEvents();
            }

            $(element.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var wantedPrefix = 'data-f-';
                if (attr.indexOf(wantedPrefix) === 0) {
                    attr = attr.replace(wantedPrefix, '');
                    var handler = attrManager.getHandler(attr, $el);
                    if (handler.unbind) {
                        handler.unbind.call($el, attr);
                    }
                }
            });

            var subsid = $el.data(config.attrs.subscriptionId) || [];
            _.each(subsid, function (subs) {
                channel.unsubscribe(subs);
            });

            _.each($el.data(), function (val, key) {
                if (key.indexOf('f-') === 0 || key.match(/^f[A-Z]/)) {
                    $el.removeData(key);
                    // var hyphenated = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    // $el.removeData(hyphenated);
                }
            });

            return this;
        },

        /**
         * Bind the element: subscribe from updates on the relevant channels.
         *
         * @param {DomElement} element The element to add to the data binding.
         * @param {ChannelInstance} channel (Optional) The channel to subscribe to. Defaults to the [run channel](../channels/run-channel/).
         * @returns {undefined}
         */
        bindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            element = getElementOrError(element);
            var $el = $(element);
            if (!$el.is(':' + config.prefix)) {
                return false;
            }
            if (!_.includes(this.private.matchedElements, element)) {
                this.private.matchedElements.push(element);
            }

            //Send to node manager to handle ui changes
            var Handler = nodeManager.getHandler($el);
            new Handler.handle({
                el: element
            });

            var subscribe = function (subsChannel, varsToBind, $bindEl, options) {
                if (!varsToBind || !varsToBind.length) {
                    return false;
                }

                var subsid = subsChannel.subscribe(varsToBind, function (params) {
                    $bindEl.trigger(config.events.channelDataReceived, params);
                }, options);
                var newsubs = ($el.data(config.attrs.subscriptionId) || []).concat(subsid);
                $el.data(config.attrs.subscriptionId, newsubs);
            };

            var attrBindings = [];
            var nonBatchableVariables = [];
            //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve. Also don't want to index dynamically added (by flow) data attrs
            $(element.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var attrVal = nodeMap.value;

                var channelPrefix = domUtils.getChannel($el, attr);

                var wantedPrefix = 'data-f-';
                if (attr.indexOf(wantedPrefix) === 0) {
                    attr = attr.replace(wantedPrefix, '');

                    var handler = attrManager.getHandler(attr, $el);
                    var isBindableAttr = true;
                    if (handler && handler.init) {
                        isBindableAttr = handler.init.call($el, attr, attrVal);
                    }

                    if (isBindableAttr) {
                        //Convert pipes to converter attrs
                        var withConv = _.invokeMap(attrVal.split('|'), 'trim');
                        if (withConv.length > 1) {
                            attrVal = withConv.shift();
                            $el.data('f-convert-' + attr, withConv);
                        }

                        var binding = { attr: attr };
                        var commaRegex = /,(?![^[]*])/;

                        //NOTE: do this within init?
                        if (handler && handler.parse) {
                            //Let the handler do any pre-processing of inputs necessary
                            attrVal = handler.parse.call($el, attrVal);
                        }

                        if (attrVal.indexOf('<%') !== -1) {
                            //Assume it's templated for later use

                        } else if (attrVal.split(commaRegex).length > 1) {
                            var varsToBind = _.invokeMap(attrVal.split(commaRegex), 'trim');
                            if (channelPrefix) {
                                varsToBind = varsToBind.map(function (v) {
                                    return channelPrefix + ':' + v;
                                });
                            }
                            subscribe(channel, varsToBind, $el, { batch: true });
                            binding.topics = varsToBind;
                        } else {
                            if (channelPrefix) {
                                attrVal = channelPrefix + ':' + attrVal;
                            }
                            binding.topics = [attrVal];
                            nonBatchableVariables.push(attrVal);
                        }
                        attrBindings.push(binding);
                    }
                }
            });
            $el.data(config.attrs.bindingsList, attrBindings);
            if (nonBatchableVariables.length) {
                subscribe(channel, nonBatchableVariables, $el, { batch: false });
            }
        },

        /**
         * Bind all provided elements.
         *
         * @param  {Array|jQuerySelector} elementsToBind (Optional) If not provided, binds all matching elements within default root provided at initialization.
         * @returns {undefined}
         */
        bindAll: function (elementsToBind) {
            if (!elementsToBind) {
                elementsToBind = getMatchingElements(this.options.root);
            } else if (!_.isArray(elementsToBind)) {
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
         * @param  {Array} elementsToUnbind (Optional) If not provided, unbinds everything.
         * @returns {undefined}
         */
        unbindAll: function (elementsToUnbind) {
            var me = this;
            if (!elementsToUnbind) {
                elementsToUnbind = this.private.matchedElements;
            } else if (!_.isArray(elementsToUnbind)) {
                elementsToUnbind = getMatchingElements(elementsToUnbind);
            }
            $.each(elementsToUnbind, function (index, element) {
                me.unbindElement(element, me.options.channel);
            });
        },

        /**
         * Initialize the DOM Manager to work with a particular HTML element and all elements within that root. Data bindings between individual HTML elements and the model variables specified in the attributes will happen via the channel.
         *
         * @param {Object} options (Optional) Overrides for the default options.
         * @param {String} options.root The root HTML element being managed by this instance of the DOM Manager. Defaults to `body`.
         * @param {Object} options.channel The channel to communicate with. Defaults to the Channel Manager from [Epicenter.js](../../../api_adapters/).
         * @param {Boolean} options.autoBind If `true` (default), any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.
         * @returns {undefined}
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

            var attachChannelListener = function ($root) {
                $root.off(config.events.channelDataReceived).on(config.events.channelDataReceived, function (evt, data) {
                    var $el = $(evt.target);
                    var bindings = $el.data(config.attrs.bindingsList);
                    var toconvert = {};
                    $.each(data, function (variableName, value) {
                        _.each(bindings, function (binding) {
                            var channelPrefix = domUtils.getChannel($el, binding.attr);
                            var interestedTopics = binding.topics;
                            if (_.includes(interestedTopics, variableName)) {
                                if (binding.topics.length > 1) {
                                    var matching = _.pick(data, interestedTopics);
                                    if (!channelPrefix) {
                                        value = matching;
                                    } else {
                                        value = Object.keys(matching).reduce(function (accum, key) {
                                            var k = key.replace(channelPrefix + ':', '');
                                            accum[k] = matching[key];
                                            return accum;
                                        }, {});
                                    }
                                }
                                toconvert[binding.attr] = value;
                            }
                        });
                    });
                    $el.trigger(config.events.convert, toconvert);
                });
            };

            var attachUIVariablesListener = function ($root) {
                $root.off(config.events.trigger).on(config.events.trigger, function (evt, data) {
                    var parsedData = {}; //if not all subsequent listeners will get the modified data

                    var $el = $(evt.target);
                    var attrConverters = domUtils.getConvertersList($el, 'bind');

                    _.each(data, function (val, key) {
                        key = key.split('|')[0].trim(); //in case the pipe formatting syntax was used
                        val = converterManager.parse(val, attrConverters);
                        parsedData[key] = parseUtils.toImplicitType(val);

                        $el.trigger(config.events.convert, { bind: val });
                    });

                    channel.publish(parsedData);
                });
            };

            var attachUIOperationsListener = function ($root) {
                $root.off(config.events.operate).on(config.events.operate, function (evt, data) {
                    var filtered = [].concat(data.operations || []).reduce(function (accum, operation) {
                        operation.params = operation.params.map(function (val) {
                            return parseUtils.toImplicitType($.trim(val));
                        });
                        var isConverter = converterManager.getConverter(operation.name);
                        if (isConverter) {
                            accum.converters.push(operation);
                        } else {
                            accum.operations.push({ name: 'operations:' + operation.name, value: operation.params });
                        }
                        return accum;
                    }, { operations: [], converters: [] });

                    var promise = filtered.operations.length ? channel.publish(filtered.operations) : $.Deferred().resolve().promise();

                    //FIXME: Needed for the 'gotopage' in interfacebuilder. Remove this once we add a window channel
                    promise.then(function (args) {
                        _.each(filtered.converters, function (con) {
                            converterManager.convert(con.params, [con.name]);
                        });
                    });
                });
            };

            var attachConversionListner = function ($root) {
                // data = {proptoupdate: value} || just a value (assumes 'bind' if so)
                $root.off(config.events.convert).on(config.events.convert, function (evt, data) {
                    var $el = $(evt.target);

                    var convert = function (val, prop) {
                        prop = prop.toLowerCase();
                        var attrConverters = domUtils.getConvertersList($el, prop);

                        var handler = attrManager.getHandler(prop, $el);
                        var convertedValue = converterManager.convert(val, attrConverters);
                        handler.handle.call($el, convertedValue, prop);
                    };

                    if ($.isPlainObject(data)) {
                        _.each(data, convert);
                    } else {
                        convert(data, 'bind');
                    }
                });
            };

            channel.subscribe('operations:reset', function () {
                me.unbindAll();
                me.bindAll();
                // console.log('Reset called', channel);
            });
            var promise = $.Deferred();
            $(function () {
                me.bindAll();

                attachChannelListener($root);
                attachUIVariablesListener($root);
                attachUIOperationsListener($root);
                attachConversionListner($root);

                if (me.options.autoBind) {
                    autoUpdatePlugin($root.get(0), me);
                }

                promise.resolve($root);
                $root.trigger('f.domready');
            });

            return promise;
        }
    };

    return $.extend(this, publicAPI);
}();

/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_create_class__ = __webpack_require__(47);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_create_class___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_utils_create_class__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__channel_utils__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__middleware_middleware_manager__ = __webpack_require__(23);






function makeSubs(topics, callback, options) {
    var id = _.uniqueId('subs-');
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
    var opts = $.extend({}, defaults, options);
    return $.extend(true, {
        id: id,
        topics: topics,
        callback: callback
    }, opts);
}

function callbackIfChanged(subscription, data) {
    if (!_.isEqual(subscription.lastSent, data)) {
        subscription.lastSent = data;
        subscription.callback(data);
    }
}

//[{ name, value}]
function checkAndNotifyBatch(topics, subscription) {
    var merged = topics.reduce(function (accum, topic) {
        accum[topic.name] = topic.value;
        return accum;
    }, subscription.availableData || {});
    var matchingTopics = _.intersection(Object.keys(merged), subscription.topics);
    if (matchingTopics.length > 0) {
        var toSend = subscription.topics.reduce(function (accum, topic) {
            accum[topic] = merged[topic];
            return accum;
        }, {});

        if (subscription.cache) {
            subscription.availableData = toSend;
        }
        if (matchingTopics.length === subscription.topics.length) {
            callbackIfChanged(subscription, toSend);
        }
    }
}

//[{ name, value}]
function checkAndNotify(topics, subscription) {
    topics.forEach(function (topic) {
        if (_.includes(subscription.topics, topic.name) || _.includes(subscription.topics, '*')) {
            var toSend = {};
            toSend[topic.name] = topic.value;
            callbackIfChanged(subscription, toSend);
        }
    });
}

function getTopicsFromSubsList(subcriptionList) {
    return subcriptionList.reduce(function (accum, subs) {
        accum = accum.concat(subs.topics);
        return accum;
    }, []);
}
var ChannelManager = function () {
    function ChannelManager(options) {
        var defaults = {
            middlewares: []
        };
        var opts = $.extend(true, {}, defaults, options);
        this.middlewares = new __WEBPACK_IMPORTED_MODULE_2__middleware_middleware_manager__["a" /* default */](opts, this.notify.bind(this), this);
    }

    __WEBPACK_IMPORTED_MODULE_0_utils_create_class___default()(ChannelManager, {
        subscriptions: [],

        publish: function (topic, value, options) {
            var normalized = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__channel_utils__["e" /* normalizeParamOptions */])(topic, value, options);
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
            prom = prom.then(this.notify.bind(this));
            return prom;
        },

        notify: function (topic, value, options) {
            var normalized = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__channel_utils__["e" /* normalizeParamOptions */])(topic, value, options);
            console.log('notify', normalized);
            return this.subscriptions.forEach(function (subs) {
                var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                fn(normalized.params, subs);
            });
        },

        //TODO: Allow subscribing to regex? Will solve problem of listening only to variables etc
        subscribe: function (topics, cb, options) {
            var subs = makeSubs(topics, cb, options);
            this.subscriptions = this.subscriptions.concat(subs);
            var middlewares = this.middlewares.filter('subscribe');

            var toSend = subs.topics;
            middlewares.forEach(function (middleware) {
                toSend = middleware(toSend) || toSend;
            });
            return subs.id;
        },
        unsubscribe: function (token) {
            var data = this.subscriptions.reduce(function (accum, subs) {
                if (subs.id === token) {
                    accum.unsubscribed.push(subs);
                } else {
                    accum.remaining.push(subs);
                }
                return accum;
            }, { remaining: [], unsubscribed: [] });

            if (!data.unsubscribed.length) {
                throw new Error('No subscription found for token ' + token);
            }
            this.subscriptions = data.remaining;

            var remainingTopics = getTopicsFromSubsList(data.remaining);
            var unsubscribedTopics = getTopicsFromSubsList(data.unsubscribed);

            var middlewares = this.middlewares.filter('unsubscribe');
            middlewares.forEach(function (middleware) {
                return middleware(unsubscribedTopics, remainingTopics);
            });
        },
        unsubscribeAll: function () {
            var currentlySubscribed = this.getSubscribedTopics();
            this.subscriptions = [];
            var middlewares = this.middlewares.filter('unsubscribe');
            middlewares.forEach(function (middleware) {
                return middleware(currentlySubscribed, []);
            });
        },
        getSubscribedTopics: function () {
            var list = _.uniq(getTopicsFromSubsList(this.subscriptions));
            return list;
        },
        getSubscribers: function (topic) {
            if (topic) {
                return this.subscriptions.filter(function (subs) {
                    return _.includes(subs.topics, topic);
                });
            }
            return this.subscriptions;
        }
    });

    return ChannelManager;
}();

/* harmony default export */ __webpack_exports__["a"] = (ChannelManager);

/***/ }),
/* 13 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_router_factory__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__ = __webpack_require__(1);



/* harmony default export */ __webpack_exports__["a"] = (function (options, notifier) {
    if (!options) options = {};

    var opts = {};
    opts.serviceOptions = options.serviceOptions && options.serviceOptions.run ? options.serviceOptions.run : {};
    opts.channelOptions = options.channelOptions;

    return {
        subscribeHandler: function (topics, prefix) {
            var runid = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["h" /* stripSuffixDelimiter */])(prefix);
            var channel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__run_router_factory__["a" /* default */])(runid, opts, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["a" /* withPrefix */])(notifier, prefix));
            return channel.subscribeHandler(topics);
        },
        publishHandler: function (topics, prefix) {
            var runid = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["h" /* stripSuffixDelimiter */])(prefix);
            var channel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__run_router_factory__["a" /* default */])(runid, opts, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["a" /* withPrefix */])(notifier, prefix));
            return channel.publishHandler(topics);
        }
    };
});

/***/ }),
/* 14 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_manager_router__ = __webpack_require__(15);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__scenario_manager_router__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__custom_run_router__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__runs_router__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_channels_channel_router__ = __webpack_require__(2);










function getOptions(opts, key) {
    var serviceOptions = $.extend(true, {}, opts.defaults, opts[key]);
    var channelOptions = $.extend(true, {}, serviceOptions.channelOptions);
    delete serviceOptions.channelOptions;

    return { serviceOptions: serviceOptions, channelOptions: channelOptions };
}

var SCENARIO_PREFIX = 'sm:';
var RUN_PREFIX = 'rm:';

var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
var runidRegex = '(?:.{' + sampleRunidLength + '})';

/* harmony default export */ __webpack_exports__["a"] = (function (config, notifier, channelManagerContext) {
    var opts = $.extend(true, {}, config);

    var customRunChannelOpts = getOptions(opts, 'runid');
    var customRunChannel = new __WEBPACK_IMPORTED_MODULE_2__custom_run_router__["a" /* default */](customRunChannelOpts, notifier);
    var runsChannel = new __WEBPACK_IMPORTED_MODULE_3__runs_router__["a" /* default */](customRunChannelOpts, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["a" /* withPrefix */])(notifier, 'runs'), channelManagerContext);

    var handlers = [$.extend({}, customRunChannel, {
        name: 'customRun',
        match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["b" /* regex */])(runidRegex),
        options: customRunChannelOpts.channelOptions
    }), $.extend({}, runsChannel, {
        name: 'archiveRuns',
        match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["c" /* prefix */])('runs'),
        options: customRunChannelOpts.channelOptions
    })];
    var exposable = {};
    if (opts.scenarioManager) {
        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new __WEBPACK_IMPORTED_MODULE_1__scenario_manager_router__["a" /* default */](scenarioManagerOpts, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["a" /* withPrefix */])(notifier, [SCENARIO_PREFIX, '']));
        handlers.push($.extend({}, sm, {
            name: 'scenario',
            match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["d" /* defaultPrefix */])(SCENARIO_PREFIX),
            options: scenarioManagerOpts.channelOptions,
            isDefault: true
        }));

        $.extend(exposable, sm.expose);
    }

    var runManagerOpts = getOptions(opts, 'runManager');
    if (opts.runManager || !opts.scenarioManager && runManagerOpts.serviceOptions.run) {
        var rm;
        if (opts.scenarioManager) {
            rm = new __WEBPACK_IMPORTED_MODULE_0__run_manager_router__["a" /* default */](runManagerOpts, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["a" /* withPrefix */])(notifier, RUN_PREFIX));
            handlers.push($.extend({}, rm, {
                name: 'run',
                match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["c" /* prefix */])(RUN_PREFIX),
                options: runManagerOpts.channelOptions
            }));
        } else {
            rm = new __WEBPACK_IMPORTED_MODULE_0__run_manager_router__["a" /* default */](runManagerOpts, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["a" /* withPrefix */])(notifier, [RUN_PREFIX, '']));
            handlers.push($.extend({}, rm, {
                name: 'run',
                match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_channels_middleware_utils__["d" /* defaultPrefix */])(RUN_PREFIX),
                isDefault: true,
                options: runManagerOpts.channelOptions
            }));
        }

        $.extend(exposable, rm.expose);
    }

    var router = new __WEBPACK_IMPORTED_MODULE_5_channels_channel_router__["a" /* default */](handlers, notifier);
    router.expose = exposable;

    return router;
});

/***/ }),
/* 15 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_router__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_channels_channel_router__ = __webpack_require__(2);





/* harmony default export */ __webpack_exports__["a"] = (function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    var opts = $.extend(true, {}, defaults, config);

    var rm = new window.F.manager.RunManager(opts.serviceOptions);
    var $creationPromise = rm.getRun().then(function () {
        return rm.run;
    });
    var currentChannelOpts = $.extend(true, { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    var currentRunChannel = new __WEBPACK_IMPORTED_MODULE_0__run_router__["a" /* default */](currentChannelOpts, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["a" /* withPrefix */])(notifier, ['current:', '']));

    var handlers = [$.extend(currentRunChannel, {
        match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["d" /* defaultPrefix */])('current:'),
        isDefault: true,
        options: currentChannelOpts.channelOptions
    })];

    var router = new __WEBPACK_IMPORTED_MODULE_2_channels_channel_router__["a" /* default */](handlers, notifier);
    router.expose = { runManager: rm };
    return router;
});

/***/ }),
/* 16 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_router__ = __webpack_require__(5);

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
/* 17 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__ = __webpack_require__(3);
/* harmony export (immutable) */ __webpack_exports__["a"] = RunMetaChannel;


function RunMetaChannel($runServicePromise, notifier) {

    function mergeAndSend(runMeta, requestedTopics) {
        var toSend = [].concat(requestedTopics).reduce(function (accum, meta) {
            if (runMeta[meta] !== undefined) {
                accum.push({ name: meta, value: runMeta[meta] });
            }
            return accum;
        }, []);
        return notifier(toSend);
    }
    return {
        subscribeHandler: function (topics) {
            return $runServicePromise.then(function (runService) {
                if (runService.runMeta) {
                    return $.Deferred().resolve(mergeAndSend(runService.runMeta, topics)).promise();
                }

                if (!runService.loadPromise) {
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
                var toSave = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["d" /* arrayToObject */])(topics);
                return runService.save(toSave).then(function (res) {
                    runService.runMeta = $.extend({}, true, runService.runMeta, res);
                    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_channels_channel_utils__["c" /* objectToArray */])(res);
                });
            });
        }
    };
}

/***/ }),
/* 18 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunOperationsChannel;
function RunOperationsChannel($runServicePromise) {
    return {
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
/* 19 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_general__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_utils_general___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_utils_general__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__ = __webpack_require__(3);
/* harmony export (immutable) */ __webpack_exports__["a"] = RunVariablesChannel;



function RunVariablesChannel($runServicePromise, notifier) {

    var id = _.uniqueId('variable-channel');

    var fetchFn = function (runService) {
        if (!runService.debouncedFetchers) {
            runService.debouncedFetchers = {};
        }
        var debounceInterval = 200; //todo: make this over-ridable
        if (!runService.debouncedFetchers[id]) {
            runService.debouncedFetchers[id] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_utils_general__["debounceAndMerge"])(function (variables) {
                if (!variables || !variables.length) {
                    return $.Deferred().resolve([]).promise();
                }
                return runService.variables().query(variables).then(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["c" /* objectToArray */]);
            }, debounceInterval, [function mergeVariables(accum, newval) {
                if (!accum) {
                    accum = [];
                }
                return _.uniq(accum.concat(newval)).filter(function (v) {
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
                return fetchFn(runService)(knownTopics).then(notifier);
            });
        },

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics) {
            return $runServicePromise.then(function (runService) {
                knownTopics = _.uniq(knownTopics.concat(topics));
                if (!knownTopics.length) {
                    return $.Deferred().resolve([]).promise();
                }
                return fetchFn(runService)(topics).then(notifier);
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["d" /* arrayToObject */])(topics);
                return runService.variables().save(toSave).then(function (response) {
                    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_channel_utils__["c" /* objectToArray */])(response);
                });
            });
        }
    };
}

/***/ }),
/* 20 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = RunsRouter;
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _window = window;
const F = _window.F;


function RunsRouter(options, notifier, channelManagerContext) {
    var runService = new F.service.Run(options.serviceOptions.run);

    var topicParamMap = {};

    function extractFromTopic(topicString) {
        var commaRegex = /,(?![^[]*])/;

        var _topicString$split = topicString.split(')('),
            _topicString$split2 = _slicedToArray(_topicString$split, 2),
            filters = _topicString$split2[0],
            variables = _topicString$split2[1];

        filters = filters.replace('(', '').replace(')', '');
        var filterParam = filters.split(';').reduce(function (accum, filter) {
            var _filter$split = filter.split('='),
                _filter$split2 = _slicedToArray(_filter$split, 2),
                key = _filter$split2[0],
                val = _filter$split2[1];

            accum[key] = val;
            return accum;
        }, {});

        variables = variables.replace('(', '').replace(')', '');
        variables = variables.split(commaRegex);

        return { filter: filterParam, variables: variables };
    }

    function fetch(topic) {
        var params = extractFromTopic(topic);
        return runService.query(params.filter, { include: params.variables }).then(function (runs) {
            notifier([{ name: topic, value: runs }]);
            return runs;
        });
    }

    return {
        fetch: fetch,

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            console.log('unsubs');
            // knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics) {
            var topic = [].concat(topics)[0];

            var params = extractFromTopic(topic);

            if (topicParamMap[topic]) {
                channelManagerContext.unsubscribe(topicParamMap[topic]);
            }
            return fetch(topic).then(function (runs) {
                runs.forEach(function (run) {
                    var subscriptions = Object.keys(params.filter).map(function (filter) {
                        return run.id + ':meta:' + filter;
                    });
                    var subsid = channelManagerContext.subscribe(subscriptions, function () {
                        fetch(topic);
                    }, { batch: false, autoLoad: false, cache: false });
                    topicParamMap[topic] = subsid;
                });
                return runs;
            });
        }
    };
}

/***/ }),
/* 21 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__run_router__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_channels_channel_router__ = __webpack_require__(2);




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

    var baselineChannel = new __WEBPACK_IMPORTED_MODULE_0__run_router__["a" /* default */](baselineOptions, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["a" /* withPrefix */])(notifier, 'baseline:'));
    var currentRunChannel = new __WEBPACK_IMPORTED_MODULE_0__run_router__["a" /* default */](runOptions, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["a" /* withPrefix */])(notifier, ['current:', '']));
    var handlers = [$.extend(baselineChannel, {
        name: 'baseline',
        match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["c" /* prefix */])('baseline:'),
        options: baselineOptions.channelOptions
    }), $.extend(currentRunChannel, {
        isDefault: true,
        name: 'current',
        match: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_channels_middleware_utils__["d" /* defaultPrefix */])('current:'),
        options: runOptions.channelOptions
    })];

    var router = new __WEBPACK_IMPORTED_MODULE_2_channels_channel_router__["a" /* default */](handlers, notifier);
    router.expose = { scenarioManager: sm };
    return router;
});

/***/ }),
/* 22 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = JSONMiddleware;
var parseUtils = __webpack_require__(4);
function JSONMiddleware(config, notifier) {
    return {
        subscribeHandler: function (topics) {
            var sorted = [].concat(topics).reduce(function (acc, topic) {
                var parsed = parseUtils.toImplicitType(topic);
                if (typeof parsed === 'string') {
                    acc.rest.push(topic);
                } else {
                    acc.claimed.push(topic);
                }
                return acc;
            }, { claimed: [], rest: [] });

            var mapped = sorted.claimed.map(function (item) {
                return { name: item, value: parseUtils.toImplicitType(item) };
            });
            notifier(mapped);

            return sorted.rest;
        }
    };
}

/***/ }),
/* 23 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = MiddlewareManager;
function MiddlewareManager(options, notifier, channelManagerContext) {
    var defaults = {
        middlewares: []
    };
    var opts = $.extend(true, {}, defaults, options);
    var optsToPassOn = _.omit(opts, Object.keys(defaults));

    var list = [];
    var publicAPI = {
        list: list,

        add: function (middleware, index) {
            if (_.isFunction(middleware)) {
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

/***/ }),
/* 24 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (immutable) */ __webpack_exports__["a"] = silencable;
var _ref = _,
    isArray = _ref.isArray,
    includes = _ref.includes;


function silencable(published, silentOptions) {
    if (silentOptions === true || !published) {
        return [];
    } else if (isArray(silentOptions)) {
        return published.reduce(function (accum, data) {
            if (!includes(silentOptions, data.name)) {
                accum.push(data);
            }
            return accum;
        }, []);
    } else if (silentOptions && silentOptions.except) {
        return published.reduce(function (accum, data) {
            if (includes(silentOptions.except || [], data.name)) {
                accum.push(data);
            }
            return accum;
        }, []);
    }
    return published;
}

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## Array Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 * In general, if the model variable is an array, the converter is applied to each element of the array. There are a few built in array converters which, rather than converting all elements of an array, select particular elements from within the array or otherwise treat array variables specially.
 *
 */



var list = [{
    /**
     * Convert the input into an array. Concatenates all elements of the input.
     *
     * @param {Array} val The array model variable.
     */
    alias: 'list',
    acceptList: true,
    convert: function (val) {
        return [].concat(val);
    }
}, {
    /**
     * Select only the last element of the array.
     *
     * **Example**
     *
     *      <div>
     *          In the current year, we have <span data-f-bind="Sales | last"></span> in sales.
     *      </div>
     *
     * @param {Array} val The array model variable.
     */
    alias: 'last',
    acceptList: true,
    convert: function (val) {
        val = [].concat(val);
        return val[val.length - 1];
    }
}, {
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
     * @param {Array} val The array model variable.
     */
    alias: 'reverse',
    acceptList: true,
    convert: function (val) {
        val = [].concat(val);
        return val.reverse();
    }
}, {
    /**
     * Select only the first element of the array.
     *
     * **Example**
     *
     *      <div>
     *          Our initial investment was <span data-f-bind="Capital | first"></span>.
     *      </div>
     *
     * @param {Array} val The array model variable.
     */
    alias: 'first',
    acceptList: true,
    convert: function (val) {
        val = [].concat(val);
        return val[0];
    }
}, {
    /**
     * Select only the previous (second to last) element of the array.
     *
     * **Example**
     *
     *      <div>
     *          Last year we had <span data-f-bind="Sales | previous"></span> in sales.
     *      </div>
     *
     * @param {Array} val The array model variable.
     */
    alias: 'previous',
    acceptList: true,
    convert: function (val) {
        val = [].concat(val);
        return val.length <= 1 ? val[0] : val[val.length - 2];
    }
}];

_.each(list, function (item) {
    var oldfn = item.convert;
    var newfn = function (val) {
        if ($.isPlainObject(val)) {
            return _.mapValues(val, oldfn);
        }
        return oldfn(val);
    };
    item.convert = newfn;
});
module.exports = list;

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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



var normalize = function (alias, converter, acceptList) {
    var ret = [];
    //nomalize('flip', fn)
    if (_.isFunction(converter)) {
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
    if (_.isString(converter.alias)) {
        return alias === converter.alias;
    } else if (_.isFunction(converter.alias)) {
        return converter.alias(alias);
    } else if (_.isRegex(converter.alias)) {
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
     *          return _.max(value);
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
     * @param  {String|Function|Regex} alias Formatter name.
     * @param  {Function|Object} converter If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
     * @param {Boolean} acceptList Determines if the converter is a 'list' converter or not. List converters take in arrays as inputs, others expect single values.
     * @returns {undefined}
     */
    register: function (alias, converter, acceptList) {
        var normalized = normalize(alias, converter, acceptList);
        this.list = normalized.concat(this.list);
    },

    /**
     * Replace an already registered converter with a new one of the same name.
     *
     * @param {String} alias Formatter name.
     * @param {Function|Object} converter If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
     * @returns {undefined}
     */
    replace: function (alias, converter) {
        var index;
        _.each(this.list, function (currentConverter, i) {
            if (matchConverter(alias, currentConverter)) {
                index = i;
                return false;
            }
        });
        this.list.splice(index, 1, normalize(alias, converter)[0]);
    },

    getConverter: function (alias) {
        return _.find(this.list, function (converter) {
            return matchConverter(alias, converter);
        });
    },

    /**
     * Pipes the value sequentially through a list of provided converters.
     *
     * @param  {Any} value Input for the converter to tag.
     * @param  {Array|Object} list List of converters (maps to converter alias).
     *
     * @return {Any} Converted value.
     */
    convert: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list);
        list = _.invokeMap(list, 'trim');

        var currentValue = value;
        var me = this;

        var convertArray = function (converter, val, converterName) {
            return _.map(val, function (v) {
                return converter.convert(v, converterName);
            });
        };
        var convert = function (converter, value, converterName) {
            var converted;
            if (_.isArray(value) && converter.acceptList !== true) {
                converted = convertArray(converter, value, converterName);
            } else {
                converted = converter.convert(value, converterName);
            }
            return converted;
        };
        var convertObject = function (converter, value, converterName) {
            return _.mapValues(value, function (val) {
                return convert(converter, val, converterName);
            });
        };
        _.each(list, function (converterName) {
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
     * @param  {String} value Value to parse.
     * @param  {String|Array} list  List of parsers to run the value through. Outermost is invokeMapd first.
     * @return {Any} Original value.
     */
    parse: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list).reverse();
        list = _.invokeMap(list, 'trim');

        var currentValue = value;
        var me = this;
        _.each(list, function (converterName) {
            var converter = me.getConverter(converterName);
            if (converter.parse) {
                currentValue = converter.parse(currentValue, converterName);
            }
        });
        return currentValue;
    }
};

//Bootstrap
var defaultconverters = [__webpack_require__(27), __webpack_require__(29), __webpack_require__(25), __webpack_require__(30), __webpack_require__(28)];

$.each(defaultconverters.reverse(), function (index, converter) {
    if (_.isArray(converter)) {
        _.each(converter, function (c) {
            converterManager.register(c);
        });
    } else {
        converterManager.register(converter);
    }
});

module.exports = converterManager;

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## Number Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 */



module.exports = {
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
   * @param {Array} value The model variable.
   */
  alias: 'i',
  convert: function (value) {
    return parseFloat(value, 10);
  }
};

/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## Number Format Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
 *
 * For model variables that are numbers (or that have been [converted to numbers](../number-converter/)), there are several special number formats you can apply.
 *
 * ####Currency Number Format
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
 * ####Specific Digits Number Format
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
 * ####Percentage Number Format
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
 * ####Short Number Format
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



module.exports = {
    alias: function (name) {
        //TODO: Fancy regex to match number formats here
        return name.indexOf('#') !== -1 || name.indexOf('0') !== -1;
    },

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

        /*eslint no-magic-numbers: 0*/
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

        function isCurrency(string) {
            // eslint-disable-line
            var s = $.trim(string);

            if (s === '$' || s === 'â‚¬' || s === 'Â¥' || s === 'Â£' || s === 'â‚¡' || s === 'â‚±' || s === 'KÄ?' || s === 'kr' || s === 'Â¢' || s === 'â‚ª' || s === 'Æ’' || s === 'â‚©' || s === 'â‚«') {

                return true;
            }

            return false;
        }

        function format(number, formatTXT) {
            // eslint-disable-line
            if (_.isArray(number)) {
                number = number[number.length - 1];
            }
            if (!_.isString(number) && !_.isNumber(number)) {
                return number;
            }

            if (!formatTXT || formatTXT.toLowerCase() === 'default') {
                return number.toString();
            }

            if (isNaN(number)) {
                return '?';
            }

            //var formatTXT;
            formatTXT = formatTXT.replace('&euro;', 'â‚¬');

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
                        if (isCurrency(leadingText)) {
                            return sign + leadingText + getDigits(number, Number(rightOfPrefix)) + scales[valScale];
                        } else {
                            return leadingText + sign + getDigits(number, Number(rightOfPrefix)) + scales[valScale];
                        }
                    } else if (isCurrency(leadingText)) {
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
                    if (isCurrency(leadingText) && sign !== '') {
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
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## String Converters
 *
 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
 *
 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
 *
 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
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
     * @returns {String} converted string
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
     * @returns {String} converted string
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
     * @returns {String} converted string
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
     * @param {Array} val The model variable.
     * @returns {String} converted string
     */
    titleCase: function (val) {
        val = val + '';
        return val.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }
};

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var list = [];

var supported = ['values', 'keys', 'compact', 'difference', 'union', 'uniq', 'without', 'xor', 'zip'];
_.each(supported, function (fn) {
    var item = {
        alias: fn,
        acceptList: true,
        convert: function (val) {
            if ($.isPlainObject(val)) {
                return _.mapValues(val, _[fn]);
            }
            return _[fn](val);
        }
    };
    list.push(item);
});
module.exports = list;

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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
 * One example of when custom attribute handlers are useful is when your model variable is a complex object and you want to display the fields in a particular way, or you only want to display some of the fields. While the combination of the [`data-f-foreach` attribute](../foreach/default-foreach-attr/) and [templating](../../../../#templates) can help with this, sometimes it's easier to write your own attribute handler. (This is especially true if you will be reusing the attribute handler -- you won't have to copy your templating code over and over.)
 *
 *      Flow.dom.attributes.register('showSched', '*', function (sched) {
 *            // display all the schedule milestones
 *            // sched is an object, each element is an array
 *            // of ['Formal Milestone Name', milestoneMonth, completionPercentage]
 *
 *            var schedStr = '<ul>';
 *            var sortedSched = _.sortBy(sched, function(el) { return el[1]; });
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



var defaultHandlers = [__webpack_require__(40),
// require('./events/init-event-attr'),
__webpack_require__(37), __webpack_require__(38), __webpack_require__(32), __webpack_require__(34), __webpack_require__(35), __webpack_require__(42), __webpack_require__(41), __webpack_require__(39), __webpack_require__(33), __webpack_require__(36)];

var handlersList = [];

var normalize = function (attributeMatcher, nodeMatcher, handler) {
    if (!nodeMatcher) {
        nodeMatcher = '*';
    }
    if (_.isFunction(handler)) {
        handler = {
            handle: handler
        };
    }
    return $.extend(handler, { test: attributeMatcher, target: nodeMatcher });
};

$.each(defaultHandlers, function (index, handler) {
    handlersList.push(normalize(handler.test, handler.target, handler));
});

var matchAttr = function (matchExpr, attr, $el) {
    var attrMatch;

    if (_.isString(matchExpr)) {
        attrMatch = matchExpr === '*' || matchExpr.toLowerCase() === attr.toLowerCase();
    } else if (_.isFunction(matchExpr)) {
        //TODO: remove element selectors from attributes
        attrMatch = matchExpr(attr, $el);
    } else if (_.isRegExp(matchExpr)) {
        attrMatch = attr.match(matchExpr);
    }
    return attrMatch;
};

var matchNode = function (target, nodeFilter) {
    return _.isString(nodeFilter) ? nodeFilter === target : nodeFilter.is(target);
};

module.exports = {
    list: handlersList,
    /**
     * Add a new attribute handler.
     *
     * @param  {String|Function|Regex} attributeMatcher Description of which attributes to match.
     * @param  {String} nodeMatcher Which nodes to add attributes to. Use [jquery Selector syntax](https://api.jquery.com/category/selectors/).
     * @param  {Function|Object} handler If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
     * @returns {undefined}
     */
    register: function (attributeMatcher, nodeMatcher, handler) {
        handlersList.unshift(normalize.apply(null, arguments));
    },

    /**
     * Find an attribute matcher matching some criteria.
     *
     * @param  {String} attrFilter Attribute to match.
     * @param  {String|$el} nodeFilter Node to match.
     *
     * @return {Array|Null} An array of matching attribute handlers, or null if no matches found.
     */
    filter: function (attrFilter, nodeFilter) {
        var filtered = _.filter(handlersList, function (handler) {
            return matchAttr(handler.test, attrFilter);
        });
        if (nodeFilter) {
            filtered = _.filter(filtered, function (handler) {
                return matchNode(handler.target, nodeFilter);
            });
        }
        return filtered;
    },

    /**
     * Replace an existing attribute handler.
     *
     * @param  {String} attrFilter Attribute to match.
     * @param  {String | $el} nodeFilter Node to match.
     * @param  {Function|Object} handler The updated attribute handler. If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
     * @returns {undefined}
     */
    replace: function (attrFilter, nodeFilter, handler) {
        var index;
        _.each(handlersList, function (currentHandler, i) {
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
     * @param {String} property The attribute.
     * @param {$el} $el The DOM element.
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
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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



module.exports = {

    target: ':checkbox,:radio',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        var settableValue = this.attr('value'); //initial value
        var isChecked = typeof settableValue !== 'undefined' ? settableValue == value : !!value; //eslint-disable-line eqeqeq
        this.prop('checked', isChecked);
    }
};

/***/ }),
/* 33 */
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



var config = __webpack_require__(0);

module.exports = {

    target: '*',

    test: 'bind',

    unbind: function (attr) {
        var template = this.data(config.attrs.bindTemplate);
        if (template) {
            this.html(template);
        }
    },

    handle: function (value) {
        var templated;
        var valueToTemplate = $.extend({}, value);
        if (!$.isPlainObject(value)) {
            var variableName = this.data('f-bind'); //Hack because i don't have access to variable name here otherwise
            valueToTemplate = { value: value };
            valueToTemplate[variableName] = value;
        } else {
            valueToTemplate.value = value; //If the key has 'weird' characters like '<>' hard to get at with a template otherwise
        }
        var bindTemplate = this.data(config.attrs.bindTemplate);
        if (bindTemplate) {
            templated = _.template(bindTemplate)(valueToTemplate);
            this.html(templated);
        } else {
            var oldHTML = this.html();
            var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            templated = _.template(cleanedHTML)(valueToTemplate);
            if (cleanedHTML === templated) {
                //templating did nothing
                if (_.isArray(value)) {
                    value = value[value.length - 1];
                }
                value = $.isPlainObject(value) ? JSON.stringify(value) : value + '';
                this.html(value);
            } else {
                this.data(config.attrs.bindTemplate, cleanedHTML);
                this.html(templated);
            }
        }
    }
};

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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
    target: 'input, select',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        this.val(value);
    }
};

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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



var config = __webpack_require__(0);

module.exports = {

    test: 'class',

    target: '*',

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }

        var addedClasses = this.data(config.classesAdded);
        if (!addedClasses) {
            addedClasses = {};
        }
        if (addedClasses[prop]) {
            this.removeClass(addedClasses[prop]);
        }

        if (_.isNumber(value)) {
            value = 'value-' + value;
        }
        addedClasses[prop] = value;
        //Fixme: prop is always "class"
        this.addClass(value);
        this.data(config.classesAdded, addedClasses);
    }
};

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * ## Default Attribute Handling: Read-only Binding
 *
 * Flow.js uses the HTML5 convention of prepending data- to any custom HTML attribute. Flow.js also adds `f` for easy identification of Flow.js. For example, Flow.js provides several custom attributes and attribute handlers -- including [data-f-bind](../binds/default-bind-attr), [data-f-foreach](../foreach/default-foreach-attr/), [data-f-on-init](../events/init-event-attr/), etc. You can also [add your own attribute handlers](../attribute-manager/).
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
        this.prop(prop, value);
    }
};

/***/ }),
/* 37 */
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



var config = __webpack_require__(0);

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return attr.indexOf('on-') === 0;
    },

    unbind: function (attr) {
        attr = attr.replace('on-', '');
        this.off(attr);
    },

    init: function (attr, value) {
        attr = attr.replace('on-', '');
        var me = this;
        this.off(attr).on(attr, function () {
            var listOfOperations = _.invokeMap(value.split('|'), 'trim');
            listOfOperations = listOfOperations.map(function (value) {
                var fnName = value.split('(')[0];
                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
                var args = $.trim(params) !== '' ? params.split(',') : [];

                return { name: fnName, params: args };
            });

            me.trigger(config.events.operate, { operations: listOfOperations });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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
 * * The `data-f-foreach` attribute is [similar to the `data-f-repeat` attribute](../../repeat-attr/), so you may want to review the examples there as well.
 */



var parseUtils = __webpack_require__(4);
var config = __webpack_require__(0);

function refToMarkup(refKey) {
    return '<!--' + refKey + '-->';
}

module.exports = {

    test: 'foreach',

    target: '*',

    unbind: function (attr) {
        var template = this.data(config.attrs.foreachTemplate);
        if (template) {
            this.html(template);
            this.removeData(config.attrs.foreachTemplate);
            this.removeData(config.attrs.keyAs);
            this.removeData(config.attrs.valueAs);
        }
    },

    parse: function (attrVal) {
        var inMatch = attrVal.match(/(.*) (?:in|of) (.*)/);
        if (inMatch) {
            var itMatch = inMatch[1].match(/\((.*),(.*)\)/);
            if (itMatch) {
                this.data(config.attrs.keyAs, itMatch[1].trim());
                this.data(config.attrs.valueAs, itMatch[2].trim());
            } else {
                this.data(config.attrs.valueAs, inMatch[1].trim());
            }
            attrVal = inMatch[2];
        }
        return attrVal;
    },

    handle: function (value, prop) {
        value = $.isPlainObject(value) ? value : [].concat(value);
        var loopTemplate = this.data(config.attrs.foreachTemplate);
        if (!loopTemplate) {
            loopTemplate = this.html();
            this.data(config.attrs.foreachTemplate, loopTemplate);
        }
        var $me = this.empty();
        var cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');

        var defaultKey = $.isPlainObject(value) ? 'key' : 'index';
        var keyAttr = $me.data(config.attrs.keyAs) || defaultKey;
        var valueAttr = $me.data(config.attrs.valueAs) || 'value';

        var keyRegex = new RegExp('\\b' + keyAttr + '\\b');
        var valueRegex = new RegExp('\\b' + valueAttr + '\\b');

        var closestKnownDataEl = this.closest('[data-current-index]');
        var knownData = {};
        if (closestKnownDataEl.length) {
            knownData = closestKnownDataEl.data('current-index');
        }
        var closestParentWithMissing = this.closest('[data-missing-references]');
        if (closestParentWithMissing.length) {
            //(grand)parent already stubbed out missing references
            var missing = closestParentWithMissing.data('missing-references');
            _.each(missing, function (replacement, template) {
                if (keyRegex.test(template) || valueRegex.test(template)) {
                    cloop = cloop.replace(refToMarkup(replacement), template);
                }
            });
        } else {
            var missingReferences = {};
            var templateTagsUsed = cloop.match(/<%[=-]?([\s\S]+?)%>/g);
            if (templateTagsUsed) {
                templateTagsUsed.forEach(function (tag) {
                    if (tag.match(/\w+/) && !keyRegex.test(tag) && !valueRegex.test(tag)) {
                        var refKey = missingReferences[tag];
                        if (!refKey) {
                            refKey = _.uniqueId('no-ref');
                            missingReferences[tag] = refKey;
                        }
                        var r = new RegExp(tag, 'g');
                        cloop = cloop.replace(r, refToMarkup(refKey));
                    }
                });
            }
            if (_.size(missingReferences)) {
                //Attr, not data, to make jQ selector easy. No f- prefix to keep this from flow.
                this.attr('data-missing-references', JSON.stringify(missingReferences));
            }
        }

        var templateFn = _.template(cloop);
        _.each(value, function (dataval, datakey) {
            if (!dataval) {
                dataval = dataval + '';
            }
            var templateData = {};
            templateData[keyAttr] = datakey;
            templateData[valueAttr] = dataval;

            $.extend(templateData, knownData);

            var nodes;
            var isTemplated;
            try {
                var templatedLoop = templateFn(templateData);
                isTemplated = templatedLoop !== cloop;
                nodes = $(templatedLoop);
            } catch (e) {
                //you don't have all the references you need;
                nodes = $(cloop);
                isTemplated = true;
                $(nodes).attr('data-current-index', JSON.stringify(templateData));
            }

            nodes.each(function (i, newNode) {
                newNode = $(newNode);
                _.each(newNode.data(), function (val, key) {
                    newNode.data(key, parseUtils.toImplicitType(val));
                });
                if (!isTemplated && !newNode.html().trim()) {
                    newNode.html(dataval);
                }
            });
            $me.append(nodes);
        });
    }
};

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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



module.exports = {

    target: '*',

    test: /^(?:disabled|hidden|readonly)$/i,

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        this.prop(prop, !value);
    }
};

/***/ }),
/* 40 */
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

    test: /^(?:model|convert|channel)$/i,

    handle: $.noop,

    init: function () {
        return false;
    }
};

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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



module.exports = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped)$/i,

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        var val = this.attr('value') ? value == this.prop('value') : !!value; //eslint-disable-line eqeqeq
        this.prop(prop, val);
    }
};

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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
 * * In most cases the same effect can be achieved with the [`data-f-foreach` attribute](../../attributes/foreach/default-foreach-attr/), which is similar. In the common use case of a table of data displayed over time, the `data-f-repeat` can be more concise and easier to read. However, the `data-f-foreach` allows aliasing, and so can be more useful especially if you are nesting HTML elements or want to introduce logic about how to display the values.
 *
 */



var parseUtils = __webpack_require__(4);
var gutils = __webpack_require__(9);
var config = __webpack_require__(0).attrs;
module.exports = {

    test: 'repeat',

    target: '*',

    unbind: function (attr) {
        var id = this.data(config.repeat.templateId);
        if (id) {
            this.nextUntil(':not([data-' + id + '])').remove();
            this.removeAttr('data-' + config.repeat.templateId);
        }
        var loopTemplate = this.data(config.repeat.template);
        if (loopTemplate) {
            this.removeData(config.repeat.template);
            this.replaceWith(loopTemplate);
        }
    },

    handle: function (value, prop) {
        value = $.isPlainObject(value) ? value : [].concat(value);
        var loopTemplate = this.data(config.repeat.template);
        var id = this.data(config.repeat.templateId);

        if (!loopTemplate) {
            loopTemplate = this.get(0).outerHTML;
            this.data(config.repeat.template, loopTemplate);
        }

        if (id) {
            this.nextUntil(':not([data-' + id + '])').remove();
        } else {
            id = gutils.random('repeat-');
            this.attr('data-' + config.repeat.templateId, id);
        }

        var last;
        var me = this;
        _.each(value, function (dataval, datakey) {
            var cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            var templatedLoop = _.template(cloop)({ value: dataval, key: datakey, index: datakey });
            var isTemplated = templatedLoop !== cloop;
            var nodes = $(templatedLoop);
            var hasData = dataval !== null && dataval !== undefined;

            nodes.each(function (i, newNode) {
                newNode = $(newNode).removeAttr('data-f-repeat').removeAttr('data-' + config.repeat.templateId);
                _.each(newNode.data(), function (val, key) {
                    if (!last) {
                        me.data(key, parseUtils.toImplicitType(val));
                    } else {
                        newNode.data(key, parseUtils.toImplicitType(val));
                    }
                });
                newNode.attr('data-' + id, true);
                if (!isTemplated && !newNode.children().length && hasData) {
                    newNode.html(dataval + '');
                }
            });
            if (!last) {
                last = me.html(nodes.html());
            } else {
                last = nodes.insertAfter(last);
            }
        });
    }
};

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var BaseView = __webpack_require__(7);

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
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var normalize = function (selector, handler) {
    if (_.isFunction(handler)) {
        handler = {
            handle: handler
        };
    }
    if (!selector) {
        selector = '*';
    }
    handler.selector = selector;
    return handler;
};

var match = function (toMatch, node) {
    if (_.isString(toMatch)) {
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
     * @returns {undefined}
     */
    register: function (selector, handler) {
        this.list.unshift(normalize(selector, handler));
    },

    getHandler: function (selector) {
        return _.find(this.list, function (node) {
            return match(selector, node);
        });
    },

    replace: function (selector, handler) {
        var index;
        _.each(this.list, function (currentHandler, i) {
            if (selector === currentHandler.selector) {
                index = i;
                return false;
            }
        });
        this.list.splice(index, 1, normalize(selector, handler));
    }
};

//bootstraps
var defaultHandlers = [__webpack_require__(43), __webpack_require__(7), __webpack_require__(8)];
_.each(defaultHandlers.reverse(), function (handler) {
    nodeManager.register(handler.selector, handler);
});

module.exports = nodeManager;

/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = function (target, domManager) {
    if (!window.MutationObserver) {
        return false;
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
    observer.observe(target, mutconfig);
    // Later, you can stop observing
    // observer.disconnect();
};

/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
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
 * * `channel.strategy` The run creation strategy describes when to create new runs when an end user visits this page. The default is `new-if-persisted`, which creates a new run when the end user is idle for longer than your project's **Model Session Timeout** (configured in your project's [Settings](../../../updating_your_settings/)), but otherwise uses the current run.. See more on [Run Strategies](../../../api_adapters/strategy/).
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



var domManager = __webpack_require__(11);
var BaseView = __webpack_require__(6);

var ChannelManager = __webpack_require__(10).default;
// var parseUtils = require('utils/parse-utils');

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
        // var $root = $(options.dom.root);

        // var initialFn = $root.data('f-on-init');
        // //TOOD: Should move this to DOM Manager and just prioritize on-inits
        // if (initialFn) {
        //     var listOfOperations = _.invoke(initialFn.split('|'), 'trim');
        //     listOfOperations = listOfOperations.map(function (value) {
        //         var fnName = value.split('(')[0];
        //         var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
        //         var args = ($.trim(params) !== '') ? params.split(',') : [];
        //         args = args.map(function (a) {
        //             return parseUtils.toImplicitType(a.trim());
        //         });
        //         var toReturn = {};
        //         toReturn[fnName] = args;
        //         return toReturn;
        //     });

        //     //TODO: Make a channel configuration factory which gets the initial info
        //     options.channel.options.runManager.defaults.initialOperation = listOfOperations;
        // }

        if (config && config.channel && config.channel instanceof ChannelManager) {
            this.channel = config.channel;
        } else {
            this.channel = new ChannelManager(options.channel);
        }

        return domManager.initialize($.extend(true, {
            channel: this.channel
        }, options.dom));
    }
};
Flow.ChannelManager = ChannelManager;
//set by grunt
if (true) Flow.version = "0.11.0"; //eslint-disable-line no-undef
module.exports = Flow;

/***/ }),
/* 47 */
/***/ (function(module, exports) {

module.exports = function () {
    function defineProperties(target, props) {
        Object.keys(props).forEach(function (key) {
            var descriptor = {};
            descriptor.key = key;
            descriptor.value = props[key];
            descriptor.enumerable = false;
            descriptor.writable = true;
            descriptor.configurable = true;
            Object.defineProperty(target, key, descriptor);
        });
    }
    return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
    };
}();

/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = {

    match: function (matchExpr, matchValue, context) {
        if (_.isString(matchExpr)) {
            return matchExpr === '*' || matchExpr.toLowerCase() === matchValue.toLowerCase();
        } else if (_.isFunction(matchExpr)) {
            return matchExpr(matchValue, context);
        } else if (_.isRegExp(matchExpr)) {
            return matchValue.match(matchExpr);
        }
    },

    getChannel: function ($el, property) {
        property = property.replace('data-f-', '');
        var channel = $el.data('f-channel-' + property);
        if (channel === undefined) {
            channel = $el.attr('data-f-channel'); //.data shows value cached by jquery
            if (channel === undefined) {
                var $parentEl = $el.closest('[data-f-channel]');
                if ($parentEl) {
                    channel = $parentEl.attr('data-f-channel');
                }
            }
        }
        return channel;
    },
    getConvertersList: function ($el, property) {
        var attrConverters = $el.data('f-convert-' + property);
        //FIXME: figure out how not to hard-code names here
        if (!attrConverters && (property === 'bind' || property === 'foreach' || property === 'repeat')) {
            attrConverters = $el.attr('data-f-convert'); //.data shows value cached by jquery
            if (!attrConverters) {
                var $parentEl = $el.closest('[data-f-convert]');
                if ($parentEl) {
                    attrConverters = $parentEl.attr('data-f-convert');
                }
            }
            if (attrConverters) {
                attrConverters = _.invokeMap(attrConverters.split('|'), 'trim');
            }
        }

        return attrConverters;
    }
};

/***/ })
/******/ ]);
//# sourceMappingURL=flow.js.map