(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.Flow = require('./flow.js');
window.Flow.version = '0.8.2'; //populated by grunt

},{"./flow.js":30}],2:[function(require,module,exports){
'use strict';
var config = require('../config');

module.exports = function (options) {
    var defaults = {
        /**
         * Determine when to update state
         * @type {String | Array | Object} Possible options are
         *       - true: never trigger any updates. Use this if you know your model state won't change based on operations
         *       - false: always trigger updates.
         *       - [array of variable names]: Variables in this array will not trigger updates, everything else will
         *       - { except: [array of operations]}: Variables in this array will trigger updates, nothing else will
         */
        silent: false
    };

    var channelOptions = $.extend(true, {}, defaults, options);
    var run = channelOptions.run;
    var vent = channelOptions.vent;

    var publicAPI = {
        //for testing
        private: {
            options: channelOptions
        },

        listenerMap: {},

        //Check for updates
        /**
         * Triggers update on sibling variables channel
         * @param  {string|array} executedOpns operations which just happened
         * @param  {*} response  response from the operation
         * @param  {boolean} force  ignore all silence options and force refresh
         */
        refresh: function (executedOpns, response, force) {
            var silent = channelOptions.silent;

            var shouldSilence = silent === true;
            if (_.isArray(silent) && executedOpns) {
                shouldSilence = _.intersection(silent, executedOpns).length === silent.length;
            }
            if ($.isPlainObject(silent) && executedOpns) {
                shouldSilence = _.intersection(silent.except, executedOpns).length !== executedOpns.length;
            }

            if (!shouldSilence || force === true) {
                $(vent).trigger('dirty', { opn: executedOpns, response: response });
                var me = this;
                _.each(executedOpns, function (opn) {
                    me.notify(opn, response);
                });
            }
        },

        notify: function (operation, value) {
            var listeners = this.listenerMap[operation];
            var params = {};
            params[operation] = value;

            _.each(listeners, function (listener) {
                var target = listener.target;
                if (_.isFunction(target)) {
                    target.call(null, params);
                } else if (target.trigger) {
                    listener.target.trigger(config.events.react, params);
                } else {
                    throw new Error('Unknown listerer format for ' + operation);
                }
            });
        },

        /**
         * Operation name & parameters to send to operations API
         * @param  {string | object} operation Name of Operation. If array, needs to be in {operations: [{name: opn, params:[]}], serial: boolean}] format
         * @param  {*} params (optional)   params to send to opertaion
         * @param {option} options Supported options: {silent: Boolean}
         * @return {$promise}
         */
        publish: function (operation, params, options) {
            var me = this;
            if ($.isPlainObject(operation) && operation.operations) {
                var fn = (operation.serial) ? run.serial : run.parallel;
                return fn.call(run, operation.operations)
                        .then(function (response) {
                            if (!params || !params.silent) {
                                me.refresh.call(me, _.pluck(operation.operations, 'name'), response);
                            }
                        });
            } else {
                //TODO: check if interpolated
                var opts = ($.isPlainObject(operation)) ? params : options;
                return run.do.apply(run, arguments)
                    .then(function (response) {
                        if (!opts || !opts.silent) {
                            me.refresh.call(me, [operation], response);
                        }
                    });
            }
            // console.log('operations publish', operation, params);
        },

        subscribe: function (operations, subscriber) {
            // console.log('operations subscribe', operations, subscriber);
            operations = [].concat(operations);
            //use jquery to make event sink
            //TODO: subscriber can be a function
            if (!subscriber.on && !_.isFunction(subscriber)) {
                subscriber = $(subscriber);
            }

            var id  = _.uniqueId('epichannel.operation');
            var data = {
                id: id,
                target: subscriber
            };

            var me = this;

            $.each(operations, function (index, opn) {
                if (!me.listenerMap[opn]) {
                    me.listenerMap[opn] = [];
                }
                me.listenerMap[opn] = me.listenerMap[opn].concat(data);
            });

            return id;
        },
        unsubscribe: function (operation, token) {
            this.listenerMap[operation] = _.reject(this.listenerMap[operation], function (subs) {
                return subs.id === token;
            });
        },
        unsubscribeAll: function () {
            this.listenerMap = {};
        }
    };
    return $.extend(this, publicAPI);
};

},{"../config":5}],3:[function(require,module,exports){
'use strict';

var VarsChannel = require('./variables-channel');
var OperationsChannel = require('./operations-channel');

module.exports = function (options) {
    var defaults = {
        run: {
            variables: {

            },
            operations: {

            }
        }
    };
    var config = $.extend(true, {}, defaults, options);

    var rm = new F.manager.RunManager(config);
    var rs = rm.run;

    var $creationPromise = rm.getRun();
    rs.currentPromise = $creationPromise;

    var createAndThen = function (fn, context) {
        return _.wrap(fn, function (func) {
            var passedInParams = _.toArray(arguments).slice(1);
            return rs.currentPromise.then(function () {
                rs.currentPromise = func.apply(context, passedInParams);
                return rs.currentPromise;
            });
        });
    };

    //Make sure nothing happens before the run is created
    _.each(rs, function (value, name) {
        if (_.isFunction(value) && name !== 'variables'  && name !== 'create') {
            rs[name] = createAndThen(value, rs);
        }
    });

    var originalVariablesFn = rs.variables;
    rs.variables = function () {
        var vs = originalVariablesFn.apply(rs, arguments);
        _.each(vs, function (value, name) {
            if (_.isFunction(value)) {
                vs[name] = createAndThen(value, vs);
            }
        });
        return vs;
    };

    this.run = rs;
    this.variables = new VarsChannel($.extend(true, {}, config.run.variables, { run: rs, vent: this }));
    this.operations = new OperationsChannel($.extend(true, {}, config.run.operations, { run: rs, vent: this }));
};

},{"./operations-channel":2,"./variables-channel":4}],4:[function(require,module,exports){
'use strict';
var config = require('../config');

module.exports = function (options) {
    var defaults = {
        /**
         * Determine when to update state
         * @type {String | Array | Object} Possible options are
         *       - true: never trigger any updates. Use this if you know your model state won't change based on other variables
         *       - false: always trigger updates.
         *       - [array of variable names]: Variables in this array will not trigger updates, everything else will
         *       - { except: [array of variables]}: Variables in this array will trigger updates, nothing else will
         */
        silent: false,

        autoFetch: false
    };

    var channelOptions = $.extend(true, {}, defaults, options);
    var vs = channelOptions.run.variables();
    var vent = channelOptions.vent;

    var currentData = {};

    //TODO: actually compare objects and so on
    var isEqual = function (a, b) {
        return false;
    };

    var getInnerVariables = function (str) {
        var inner = str.match(/<(.*?)>/g);
        inner = _.map(inner, function (val) {
            return val.substring(1, val.length - 1);
        });
        return inner;
    };

    //Replaces stubbed out keynames in variablestointerpolate with their corresponding values
    var interpolate = function (variablesToInterpolate, values) {
        //{price[1]: price[<time>]}
        var interpolationMap = {};
        //{price[1]: 1}
        var interpolated = [];

        _.each(variablesToInterpolate, function (outerVariable) {
            var inner = getInnerVariables(outerVariable);
            if (inner && inner.length) {
                var originalOuter = outerVariable;
                $.each(inner, function (index, innerVariable) {
                    var thisval = values[innerVariable];
                    if (thisval !== null && thisval !== undefined) {
                        if (_.isArray(thisval)) {
                            //For arrayed things get the last one for interpolation purposes
                            thisval = thisval[thisval.length - 1];
                        }
                        //TODO: Regex to match spaces and so on
                        outerVariable = outerVariable.replace('<' + innerVariable + '>', thisval);
                    }
                });
                interpolationMap[outerVariable] = (interpolationMap[outerVariable]) ? [originalOuter].concat(interpolationMap[outerVariable]) : originalOuter;
            }
            interpolated.push(outerVariable);
        });

        var op = {
            interpolated: interpolated,
            interpolationMap: interpolationMap
        };
        return op;
    };

    var lastCheckTime = _.now();
    var publicAPI = {
        //for testing
        private: {
            getInnerVariables: getInnerVariables,
            interpolate: interpolate,
            options: channelOptions
        },

        subscriptions: [],

        unfetched: [],

        getSubscribers: function (topic) {
            if (topic) {
                return _.filter(this.subscriptions, function (subs) {
                    return _.contains(subs.topics, topic);
                });
            } else {
                return this.subscriptions;
            }
        },
        getAllTopics: function () {
            return _(this.subscriptions).pluck('topics').flatten().uniq().value();
        },
        getTopicDependencies: function (list) {
            if (!list) {
                list = this.getAllTopics();
            }
            var innerList = [];
            _.each(list, function (vname) {
                var inner = getInnerVariables(vname);
                if (inner.length) {
                    innerList = _.uniq(innerList.concat(inner));
                }
            });
            return innerList;
        },

        updateAndCheckForRefresh: function (topics) {
            this.unfetched = _.uniq(this.unfetched.concat(topics));
            // if it has been a second since you last checked, or there are at least 5 items in the pending queue
            var TIME_BETWEEN_CHECKS = 200;
            var MAX_ITEMS_IN_QUEUE = 5;
            var me = this;
            var now = _.now();
            if (channelOptions.autoFetch && (now - lastCheckTime > TIME_BETWEEN_CHECKS || this.unfetched.length > MAX_ITEMS_IN_QUEUE)) {
                this.fetch(this.unfetched).then(function (changed) {
                    // console.log("fetched", _.now())
                    $.extend(currentData, changed);
                    me.unfetched = [];
                    lastCheckTime = now;
                    me.notify(changed);
                });
            } else {
                // console.log("not time yet", (now - lastCheckTime))
            }
        },

        fetch: function (variablesList) {
            variablesList = [].concat(variablesList);
            var innerVariables = this.getTopicDependencies(variablesList);
            var getVariables = function (vars, interpolationMap) {
                return vs.query(vars).then(function (variables) {
                    // console.log('Got variables', variables);
                    var changeSet = {};
                    _.each(variables, function (value, vname) {
                        var oldValue = currentData[vname];
                        if (!isEqual(value, oldValue)) {
                            changeSet[vname] = value;
                            if (interpolationMap && interpolationMap[vname]) {
                                var map = [].concat(interpolationMap[vname]);
                                _.each(map, function (interpolatedName) {
                                    changeSet[interpolatedName] = value;
                                });
                            }
                        }
                    });
                    return changeSet;
                });
            };
            if (innerVariables.length) {
                return vs.query(innerVariables).then(function (innerVariables) {
                    //console.log('inner', innerVariables);
                    $.extend(currentData, innerVariables);
                    var ip =  interpolate(variablesList, innerVariables);
                    return getVariables(ip.interpolated, ip.interpolationMap);
                });
            } else {
                return getVariables(variablesList);
            }
        },

        /**
         * Check and notify all listeners
         * @param  {Object} changeObj key-value pairs of changed variables
         */
        refresh: function (changeObj, force) {
            var me = this;
            var silent = channelOptions.silent;
            var changedVariables = _.keys(changeObj);

            var shouldSilence = silent === true;
            if (_.isArray(silent) && changedVariables) {
                shouldSilence = _.intersection(silent, changedVariables).length >= 1;
            }
            if ($.isPlainObject(silent) && changedVariables) {
                shouldSilence = _.intersection(silent.except, changedVariables).length !== changedVariables.length;
            }

            if (shouldSilence && force !== true) {
                return $.Deferred().resolve().promise();
            }

            var variables = this.getAllTopics();
            return this.fetch(variables).then(function (changeSet) {
                me.unfetched = [];
                $.extend(currentData, changeSet);
                me.notify(changeSet);
            });
        },

        notify: function (topics, value) {
            var callTarget = function (target, params) {
                if (_.isFunction(target)) {
                    target.call(null, params);
                } else {
                    target.trigger(config.events.react, params);
                }
            };

            if (!$.isPlainObject(topics)) {
                topics = _.object([topics], [value]);
            }
            _.each(this.subscriptions, function (subscription) {
                var target = subscription.target;
                if (subscription.batch) {
                    var matchingTopics = _.pick(topics, subscription.topics);
                    if (_.size(matchingTopics) === _.size(subscription.topics)) {
                        callTarget(target, matchingTopics);
                    }
                } else {
                    _.each(subscription.topics, function (topic) {
                        var matchingTopics = _.pick(topics, topic);
                        if (_.size(matchingTopics)) {
                            callTarget(target, matchingTopics);
                        }
                    });
                }
            });
        },

        /**
         * Variable name & parameters to send variables API
         * @param  {string | object} variable string or {variablename: value}
         * @param  {*} value (optional)   value of variable if previous arg was a string
         * @param {object} options Supported options: {silent: Boolean}
         * @return {$promise}
         */
        publish: function (variable, value, options) {
            // console.log('publish', arguments);
            var attrs;
            if ($.isPlainObject(variable)) {
                attrs = variable;
                options = value;
            } else {
                (attrs = {})[variable] = value;
            }
            var it = interpolate(_.keys(attrs), currentData);

            var toSave = {};
            _.each(attrs, function (val, attr) {
               var key = (it.interpolationMap[attr]) ? it.interpolationMap[attr] : attr;
               toSave[key] = val;
            });
            var me = this;
            return vs.save.call(vs, toSave)
                .then(function () {
                    if (!options || !options.silent) {
                        me.refresh.call(me, attrs);
                    }
                });
        },

        /**
         * Subscribe to changes on a channel
         * @param  {Array|String} topics List of tasks
         * @param  {function|object} subscriber
         * @param  {Object} options  (Optional)
         * @return {String}            Subscription ID
         */
        subscribe: function (topics, subscriber, options) {
            // console.log('subscribing', topics, subscriber);
            var defaults = {
                batch: false
            };

            topics = [].concat(topics);
            //use jquery to make event sink
            if (!subscriber.on && !_.isFunction(subscriber)) {
                subscriber = $(subscriber);
            }

            var id  = _.uniqueId('epichannel.variable');
            var data = $.extend({
                id: id,
                topics: topics,
                target: subscriber
            }, defaults, options);

            this.subscriptions.push(data);

            this.updateAndCheckForRefresh(topics);
            return id;
        },


        unsubscribe: function (token) {
            this.subscriptions = _.reject(this.subscriptions, function (subs) {
                return subs.id === token;
            });
        },
        unsubscribeAll: function () {
            this.subscriptions = [];
        }
    };

    $.extend(this, publicAPI);
    var me = this;
    $(vent).off('dirty').on('dirty', function () {
        me.refresh.call(me, null, true);
    });
};

},{"../config":5}],5:[function(require,module,exports){
module.exports = {
    prefix: 'f',
    defaultAttr: 'bind',

    binderAttr: 'f-bind',

    events: {
        trigger: 'update.f.ui',
        react: 'update.f.model'
    }

};

},{}],6:[function(require,module,exports){
'use strict';
var list = [
    {
        alias: 'list',
        acceptList: true,
        convert: function (val) {
            return [].concat(val);
        }
    },
    {
        alias: 'last',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return val[val.length - 1];
        }
    },
    {
        alias: 'first',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return val[0];
        }
    },
    {
        alias: 'previous',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return (val.length <= 1) ? val[0] : val[val.length - 2];
        }
    }
];

_.each(list, function (item) {
   var oldfn = item.convert;
   var newfn = function (val) {
       if ($.isPlainObject(val)) {
            return _.mapValues(val, oldfn);
       } else {
            return oldfn(val);
       }
   };
   item.convert = newfn;
});
module.exports = list;

},{}],7:[function(require,module,exports){
'use strict';

//TODO: Make all underscore filters available

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
     * Add a new attribute converter
     * @param  {string|function|regex} alias formatter name
     * @param  {function|object} converter    converter can either be a function, which will be called with the value, or an object with {alias: '', parse: $.noop, convert: $.noop}
     * @param {Boolean} acceptList decides if the converter is a 'list' converter or not; list converters take in arrays as inputs, others expect single values.
     */
    register: function (alias, converter, acceptList) {
        var normalized = normalize(alias, converter, acceptList);
        this.list = normalized.concat(this.list);
    },

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
     * Pipes the value sequentially through a list of provided converters
     * @param  {*} value Input for the converter to tag
     * @param  {Array|Object} list  list of converters (maps to converter alias)
     * @return {*}       converted value
     */
    convert: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list);
        list = _.invoke(list, 'trim');

        var currentValue = value;
        var me = this;

        var convertArray = function (converter, val, converterName) {
            return _.map(val, function (v) {
                return converter.convert(v, converterName);
            });
        };
        var convertObject = function (converter, value, converterName) {
            return _.mapValues(value, function (val, key) {
               return convert(converter, val, converterName);
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
        _.each(list, function (converterName) {
            var converter = me.getConverter(converterName);
            if ($.isPlainObject(currentValue) && converter.acceptList !== true) {
                currentValue = convertObject(converter, currentValue, converterName);
            } else {
                currentValue = convert(converter, currentValue, converterName);
            }
        });
        return currentValue;
    },

    /**
     * Counter-part to 'convert'. Translates converted values back to their original form
     * @param  {String} value Value to parse
     * @param  {String | Array} list  List of parsers to run this through. Outermost is invoked first
     * @return {*}
     */
    parse: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list).reverse();
        list = _.invoke(list, 'trim');

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
var defaultconverters = [
    require('./number-converter'),
    require('./string-converter'),
    require('./array-converter'),
    require('./numberformat-converter'),
];

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

},{"./array-converter":6,"./number-converter":8,"./numberformat-converter":9,"./string-converter":10}],8:[function(require,module,exports){
'use strict';
module.exports = {
    alias: 'i',
    convert: function (value) {
        return parseFloat(value, 10);
    }
};

},{}],9:[function(require,module,exports){
'use strict';
module.exports = {
    alias: function (name) {
        //TODO: Fancy regex to match number formats here
        return (name.indexOf('#') !== -1 || name.indexOf('0') !== -1);
    },

    parse: function (val) {
        val+= '';
        var isNegative = val.charAt(0) === '-';

        val  = val.replace(/,/g, '');
        var floatMatcher = /([-+]?[0-9]*\.?[0-9]+)(K?M?B?%?)/i;
        var results = floatMatcher.exec(val);
        var number, suffix = '';
        if (results && results[1]) {
            number = results[1];
        }
        if (results && results[2]) {
            suffix = results[2].toLowerCase();
        }

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
        }
        number = parseFloat(number);
        if (isNegative && number > 0) {
            number = number * -1;
        }
        return number;
    },

    convert: (function (value) {
        var scales = ['', 'K', 'M', 'B', 'T'];

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
            hasCommas = hasCommas || true;
            var numberTXT = value.toString();
            var hasDecimals = (numberTXT.split('.').length > 1);
            var iDec = 0;

            if (hasCommas) {
                for (var iChar = numberTXT.length - 1; iChar > 0; iChar--) {
                    if (hasDecimals) {
                        hasDecimals = (numberTXT.charAt(iChar) !== '.');
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

        function roundTo(value, digits) {
            return Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
        }

        function getSuffix(formatTXT) {
            formatTXT = formatTXT.replace('.', '');
            var fixesTXT = formatTXT.split(new RegExp('[0|,|#]+', 'g'));
            return (fixesTXT.length > 1) ? fixesTXT[1].toString() : '';
        }

        function isCurrency(string) {
            var s = $.trim(string);

            if (s === '$' ||
                s === 'â‚¬' ||
                s === 'Â¥' ||
                s === 'Â£' ||
                s === 'â‚¡' ||
                s === 'â‚±' ||
                s === 'KÄ?' ||
                s === 'kr' ||
                s === 'Â¢' ||
                s === 'â‚ª' ||
                s === 'Æ’' ||
                s === 'â‚©' ||
                s === 'â‚«') {

                return true;
            }

            return false;
        }

        function format(number, formatTXT) {
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
                return format(Math.abs(number), formats[((number >= 0) ? 0 : 1)]);
            }

            // Save Sign
            var sign = (number >= 0) ? '' : '-';
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
                valScale = ((number / Math.pow(10, 3 * valScale)) < 1000) ? valScale : (valScale + 1);
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
                    } else {
                        if (isCurrency(leadingText)) {
                            return sign + leadingText + Math.round(number) + scales[valScale];
                        } else {
                            return leadingText + sign + Math.round(number) + scales[valScale];
                        }
                    }
                } else {
                    //formatTXT = formatTXT.substr(1);
                    formatTXT = formatTXT.substr(index + 1);
                    var SUFFIX = getSuffix(formatTXT);
                    formatTXT = formatTXT.substr(0, formatTXT.length - SUFFIX.length);

                    var valWithoutLeading = format(((sign === '') ? 1 : -1) * number, formatTXT) + scales[valScale] + SUFFIX;
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
            var suffix = (fixesTXT.length > 1) ? fixesTXT[1].toString() : '';

            number = number * ((formatTXT.split('%').length > 1) ? 100 : 1);
            //            if (formatTXT.indexOf('%') !== -1) number = number * 100;
            number = roundTo(number, decimals);

            sign = (number === 0) ? '' : sign;

            var hasCommas = (formatTXT.substr(formatTXT.length - 4 - suffix.length, 1) === ',');
            var formatted = sign + preffix + addDecimals(number, decimals, minDecimals, hasCommas) + suffix;

            //  console.log(originalNumber, originalFormat, formatted)
            return formatted;
        }

        return format;
    }())
};

},{}],10:[function(require,module,exports){
'use strict';
module.exports = {
    s: function (val) {
        return val + '';
    },

    upperCase: function (val) {
        return (val + '').toUpperCase();
    },
    lowerCase: function (val) {
        return (val + '').toLowerCase();
    },
    titleCase: function (val) {
        val = val + '';
        return val.replace(/\w\S*/g, function (txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
};

},{}],11:[function(require,module,exports){
'use strict';

var defaultHandlers = [
    require('./no-op-attr'),
    require('./events/init-event-attr'),
    require('./events/default-event-attr'),
    require('./foreach/default-foreach-attr'),
    require('./binds/checkbox-radio-bind-attr'),
    require('./binds/input-bind-attr'),
    require('./class-attr'),
    require('./positive-boolean-attr'),
    require('./negative-boolean-attr'),
    require('./binds/default-bind-attr'),
    require('./default-attr')
];

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
        attrMatch = (matchExpr === '*' || (matchExpr.toLowerCase() === attr.toLowerCase()));
    } else if (_.isFunction(matchExpr)) {
        //TODO: remove element selectors from attributes
        attrMatch = matchExpr(attr, $el);
    } else if (_.isRegExp(matchExpr)) {
        attrMatch = attr.match(matchExpr);
    }
    return attrMatch;
};

var matchNode = function (target, nodeFilter) {
    return (_.isString(nodeFilter)) ? (nodeFilter === target) : nodeFilter.is(target);
};

module.exports = {
    list: handlersList,
    /**
     * Add a new attribute handler
     * @param  {string|function|regex} attributeMatcher Description of which attributes to match
     * @param  {string} nodeMatcher      Which nodes to all attributes to. Use jquery Selector syntax
     * @param  {function|object} handler    Handler can either be a function (The function will be called with $element as context, and attribute value + name), or an object with {init: fn,  handle: fn}. The init function will be called when page loads; use this to define event handlers
     */
    register: function (attributeMatcher, nodeMatcher, handler) {
        handlersList.unshift(normalize.apply(null, arguments));
    },

    /**
     * Find an attribute matcher matching some criteria
     * @param  {string} attrFilter attribute to match
     * @param  {string | $el} nodeFilter node to match
     * @return {array|null}
     */
    filter: function (attrFilter, nodeFilter) {
        var filtered = _.select(handlersList, function (handler) {
            return matchAttr(handler.test, attrFilter);
        });
        if (nodeFilter) {
            filtered = _.select(filtered, function (handler) {
                return matchNode(handler.target, nodeFilter);
            });
        }
        return filtered;
    },

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

    getHandler: function (property, $el) {
        var filtered = this.filter(property, $el);
        //There could be multiple matches, but the top first has the most priority
        return filtered[0];
    }
};


},{"./binds/checkbox-radio-bind-attr":12,"./binds/default-bind-attr":13,"./binds/input-bind-attr":14,"./class-attr":15,"./default-attr":16,"./events/default-event-attr":17,"./events/init-event-attr":18,"./foreach/default-foreach-attr":19,"./negative-boolean-attr":20,"./no-op-attr":21,"./positive-boolean-attr":22}],12:[function(require,module,exports){
'use strict';

module.exports = {

    target: ':checkbox,:radio',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        var settableValue = this.attr('value'); //initial value
        /*jslint eqeq: true*/
        var isChecked = (settableValue !== undefined) ? (settableValue == value) : !!value;
        this.prop('checked', isChecked);
    }
};

},{}],13:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        var oldHTML = this.html();
        var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        var valueToTemplate = ($.isPlainObject(value)) ? value : { value: value };
        var templated = _.template(cleanedHTML, valueToTemplate);
        if (cleanedHTML === templated) {
            if (_.isArray(value)) {
                value = value[value.length - 1];
            }
            this.html(value);
        } else {
            this.html(templated);
        }
    }
};

},{}],14:[function(require,module,exports){
'use strict';

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

},{}],15:[function(require,module,exports){
'use strict';

module.exports = {

    test: 'class',

    target: '*',

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }

        var addedClasses = this.data('added-classes');
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
        this.data('added-classes', addedClasses);
    }
};

},{}],16:[function(require,module,exports){
'use strict';

module.exports = {

    test: '*',

    target: '*',

    handle: function (value, prop) {
        this.prop(prop, value);
    }
};

},{}],17:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-') === 0);
    },

    stopListening: function (attr) {
        attr = attr.replace('on-', '');
        this.off(attr);
    },

    init: function (attr, value) {
        attr = attr.replace('on-', '');
        var me = this;
        this.off(attr).on(attr, function () {
            var listOfOperations = _.invoke(value.split('|'), 'trim');
            listOfOperations = listOfOperations.map(function (value) {
                var fnName = value.split('(')[0];
                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
                var args = ($.trim(params) !== '') ? params.split(',') : [];
                return { name: fnName, params: args };
            });

            me.trigger('f.ui.operate', { operations: listOfOperations, serial: true });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

},{}],18:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-init') === 0);
    },

    init: function (attr, value) {
        attr = attr.replace('on-init', '');
        var me = this;
        $(function () {
            var listOfOperations = _.invoke(value.split('|'), 'trim');
            listOfOperations = listOfOperations.map(function (value) {
                var fnName = value.split('(')[0];
                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
                var args = ($.trim(params) !== '') ? params.split(',') : [];
                return { name: fnName, params: args };
            });

            me.trigger('f.ui.operate', { operations: listOfOperations, serial: true });
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

},{}],19:[function(require,module,exports){
'use strict';
var parseUtils = require('../../../utils/parse-utils');
module.exports = {

    test: 'foreach',

    target: '*',

    handle: function (value, prop) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        var $loopTemplate = this.data('foreach-template');
        if (!$loopTemplate) {
            $loopTemplate = this.children();
            this.data('foreach-template', $loopTemplate);
        }
        var $me = this.empty();
        _.each(value, function (dataval, datakey) {
            dataval = dataval + '';
            var nodes = $loopTemplate.clone();
            nodes.each(function (i, newNode) {
                newNode = $(newNode);
                _.each(newNode.data(), function (val, key) {
                    var templated =  _.template(val, { value: dataval, index: datakey, key: datakey });
                    newNode.data(key, parseUtils.toImplicitType(templated));
                });
                var oldHTML = newNode.html();
                var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                var templated = _.template(cleanedHTML, { value: dataval, key: datakey, index: datakey });
                if (cleanedHTML === templated) {
                    newNode.html(dataval);
                } else {
                    newNode.html(templated);
                }
                $me.append(newNode);
            });
        });
    }
};

},{"../../../utils/parse-utils":32}],20:[function(require,module,exports){
'use strict';

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

},{}],21:[function(require,module,exports){
'use strict';

// Attributes which are just parameters to others and can just be ignored
module.exports = {

    target: '*',

    test: /^(?:model|convert)$/i,

    handle: $.noop,

    init: function () {
        return false;
    }
};

},{}],22:[function(require,module,exports){
'use strict';

module.exports = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped)$/i,

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        /*jslint eqeq: true*/
        var val = (this.attr('value')) ? (value == this.prop('value')) : !!value;
        this.prop(prop, val);
    }
};

},{}],23:[function(require,module,exports){
module.exports = (function () {
    'use strict';
    var config = require('../config');

    var nodeManager = require('./nodes/node-manager');
    var attrManager = require('./attributes/attribute-manager');
    var converterManager = require('../converters/converter-manager');

    var parseUtils = require('../utils/parse-utils');
    var domUtils = require('../utils/dom');

    var autoUpdatePlugin = require('./plugins/auto-update-bindings');

    //Jquery selector to return everything which has a f- property set
    $.expr[':'][config.prefix] = function (obj) {
        var $this = $(obj);
        var dataprops = _.keys($this.data());

        var match = _.find(dataprops, function (attr) {
            return (attr.indexOf(config.prefix) === 0);
        });

        return !!(match);
    };

    $.expr[':'].webcomponent = function (obj) {
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
            throw new Error(context + ': Expected to get DOM Element, got' + (typeof element));
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

        unbindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel.variables;
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
                    if (handler.stopListening) {
                        handler.stopListening.call($el, attr);
                    }
                }
            });

            var subsid = $el.data('f-subscription-id') || [];
            _.each(subsid, function (subs) {
                channel.unsubscribe(subs);
            });
        },

        bindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel.variables;
            }
            element = getElementOrError(element);
            var $el = $(element);
            if (!$el.is(':' + config.prefix)) {
                return false;
            }
            if (!_.contains(this.private.matchedElements, element)) {
                this.private.matchedElements.push(element);
            }

            //Send to node manager to handle ui changes
            var Handler = nodeManager.getHandler($el);
            new Handler.handle({
                el: element
            });

            var subscribe = function (channel, varsToBind, $el, options) {
                if (!varsToBind || !varsToBind.length) {
                    return false;
                }
                var subsid = channel.subscribe(varsToBind, $el, options);
                var newsubs = ($el.data('f-subscription-id') || []).concat(subsid);
                $el.data('f-subscription-id', newsubs);
            };

            var attrBindings = [];
            var nonBatchableVariables = [];
            //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve
            $(element.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var attrVal = nodeMap.value;

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
                        var withConv = _.invoke(attrVal.split('|'), 'trim');
                        if (withConv.length > 1) {
                            attrVal = withConv.shift();
                            $el.data('f-convert-' + attr, withConv);
                        }

                        var binding = { attr: attr };
                        var commaRegex = /,(?![^\[]*\])/;
                        if (attrVal.indexOf('<%') !== -1) {
                            //Assume it's templated for later use

                        } else if (attrVal.split(commaRegex).length > 1) {
                            var varsToBind = _.invoke(attrVal.split(commaRegex), 'trim');
                            subscribe(channel, varsToBind, $el, { batch: true });
                            binding.topics = varsToBind;
                        } else {
                            binding.topics = [attrVal];
                            nonBatchableVariables.push(attrVal);
                        }
                        attrBindings.push(binding);
                    }
                }
            });
            $el.data('attr-bindings', attrBindings);
            if (nonBatchableVariables.length) {
                // console.log('subscribe', nonBatchableVariables, $el.get(0))
                subscribe(channel, nonBatchableVariables, $el, { batch: false });
            }
        },

        /**
         * Bind all provided elements
         * @param  {Array|jQuerySelector} elementsToBind (Optional) If not provided uses the default root provided at initialization
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
                me.bindElement.call(me, element, me.options.channel.variables);
            });
        },
        /**
         * Unbind provided elements
         * @param  {Array} elementsToUnbind (Optional). If not provided unbinds everything
         */
        unbindAll: function (elementsToUnbind) {
            var me = this;
            if (!elementsToUnbind) {
                elementsToUnbind = this.private.matchedElements;
            }
            $.each(elementsToUnbind, function (index, element) {
                me.unbindElement.call(me, element, me.options.channel.variables);
            });
        },

        initialize: function (options) {
            var defaults = {
                root: 'body',
                channel: null,
                plugins: {}
            };
            $.extend(defaults, options);

            var channel = defaults.channel;

            this.options = defaults;

            var me = this;
            var $root = $(defaults.root);
            $(function () {
                me.bindAll();
                $root.trigger('f.domready');

                //Attach listeners
                // Listen for changes to ui and publish to api
                $root.off(config.events.trigger).on(config.events.trigger, function (evt, data) {
                    var parsedData = {}; //if not all subsequent listeners will get the modified data

                    var $el = $(evt.target);
                    var attrConverters =  domUtils.getConvertersList($el, 'bind');

                    _.each(data, function (val, key) {
                        key = key.split('|')[0].trim(); //in case the pipe formatting syntax was used
                        val = converterManager.parse(val, attrConverters);
                        parsedData[key] = parseUtils.toImplicitType(val);

                        $el.trigger('f.convert', { bind: val });
                    });

                    channel.variables.publish(parsedData);
                });

                // Listen for changes from api and update ui
                $root.off(config.events.react).on(config.events.react, function (evt, data) {
                    // console.log(evt.target, data, "root on");
                    var $el = $(evt.target);
                    var bindings = $el.data('attr-bindings');

                    var toconvert = {};
                    $.each(data, function (variableName, value) {
                        _.each(bindings, function (binding) {
                            if (_.contains(binding.topics, variableName)) {
                                if (binding.topics.length > 1) {
                                    toconvert[binding.attr] = _.pick(data, binding.topics);
                                } else {
                                    toconvert[binding.attr] = value;
                                }
                            }
                        });
                    });
                    $el.trigger('f.convert', toconvert);
                });

                // data = {proptoupdate: value} || just a value (assumes 'bind' if so)
                $root.off('f.convert').on('f.convert', function (evt, data) {
                    var $el = $(evt.target);
                    var convert = function (val, prop) {
                        prop = prop.toLowerCase();
                        var attrConverters =  domUtils.getConvertersList($el, prop);
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

                $root.off('f.ui.operate').on('f.ui.operate', function (evt, data) {
                    data = $.extend(true, {}, data); //if not all subsequent listeners will get the modified data
                    _.each(data.operations, function (opn) {
                       opn.params = _.map(opn.params, function (val) {
                           return parseUtils.toImplicitType($.trim(val));
                       });
                    });
                    channel.operations.publish(data);
                });

                if (me.options.plugins.autoUpdateBindings) {
                    autoUpdatePlugin($root.get(0), me);
                }
            });
        }
    };

    return $.extend(this, publicAPI);
}());

},{"../config":5,"../converters/converter-manager":7,"../utils/dom":31,"../utils/parse-utils":32,"./attributes/attribute-manager":11,"./nodes/node-manager":28,"./plugins/auto-update-bindings":29}],24:[function(require,module,exports){
'use strict';

var extend = function (protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
    } else {
        child = function () { return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function () { this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) {
        _.extend(child.prototype, protoProps);
    }

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
};

var View = function (options) {
    this.$el = (options.$el) || $(options.el);
    this.el = options.el;
    this.initialize.apply(this, arguments);

};

_.extend(View.prototype, {
    initialize: function () {},
});

View.extend = extend;

module.exports = View;

},{}],25:[function(require,module,exports){
'use strict';
var config = require('../../config');
var BaseView = require('./default-node');

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

},{"../../config":5,"./default-node":26}],26:[function(require,module,exports){
'use strict';

var BaseView = require('./base');

module.exports = BaseView.extend({
    propertyHandlers: [

    ],

    initialize: function () {
    }
}, { selector: '*' });

},{"./base":24}],27:[function(require,module,exports){
'use strict';
var BaseView = require('./default-input-node');

module.exports = BaseView.extend({

    propertyHandlers: [

    ],

    getUIValue: function () {
        var $el = this.$el;
        //TODO: file a issue for the vensim manager to convert trues to 1s and set this to true and false

        var offVal =  ($el.data('f-off') !== undefined) ? $el.data('f-off') : 0;
        //attr = initial value, prop = current value
        var onVal = ($el.attr('value') !== undefined) ? $el.prop('value'): 1;

        var val = ($el.is(':checked')) ? onVal : offVal;
        return val;
    },
    initialize: function () {
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: ':checkbox,:radio' });

},{"./default-input-node":25}],28:[function(require,module,exports){
'use strict';

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
    } else {
        return $(toMatch).is(node.selector);
    }
};

var nodeManager = {
    list: [],

    /**
     * Add a new node handler
     * @param  {string} selector jQuery-compatible selector to use to match nodes
     * @param  {function} handler  Handlers are new-able functions. They will be called with $el as context.? TODO: Think this through
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
var defaultHandlers = [
    require('./input-checkbox-node'),
    require('./default-input-node'),
    require('./default-node')
];
_.each(defaultHandlers.reverse(), function (handler) {
    nodeManager.register(handler.selector, handler);
});

module.exports = nodeManager;

},{"./default-input-node":25,"./default-node":26,"./input-checkbox-node":27}],29:[function(require,module,exports){
'use strict';

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
            // console.log('mutation observer added', added.get(), mutation.addedNodes);
            domManager.bindAll(added);
        }
        if (removed && removed.length) {
            // console.log('mutation observer removed', removed);
            domManager.unbindAll(removed);
        }
      });
    });

    var mutconfig = {
        attributes: false,
        childList: true,
        subtree: true,
        characterData: false
    };
    observer.observe(target, mutconfig);
    // Later, you can stop observing
    // observer.disconnect();
};

},{}],30:[function(require,module,exports){
'use strict';

var domManager = require('./dom/dom-manager');
var Channel = require('./channels/run-channel');

module.exports = {
    dom: domManager,

    initialize: function (config) {
        var model = $('body').data('f-model');

        var defaults = {
            channel: {
                run: {
                    account: '',
                    project: '',
                    model: model,

                    operations: {
                    }
                }
            },
            dom: {
                root: 'body',
                plugins: {
                    autoUpdateBindings: true
                }
            }
        };

        var options = $.extend(true, {}, defaults, config);
        if (config && config.channel && (config.channel instanceof Channel)) {
            this.channel = config.channel;
        } else {
            this.channel = new Channel(options.channel);
        }

        var $root = $(options.dom.root);
        var initFn = $root.data('f-on-init');
        var opnSilent = options.channel.run.operations.silent;
        var isInitOperationSilent = initFn && (opnSilent === true || (_.isArray(opnSilent) && _.contains(opnSilent, initFn)));
        var preFetchVariables = !initFn || isInitOperationSilent;
        var me = this;

        if (preFetchVariables) {
            $root.off('f.domready').on('f.domready', function () {
                me.channel.variables.refresh(null, true);
            });
        }

        domManager.initialize($.extend(true, {
            channel: this.channel
        }, options.dom));
    }
};

},{"./channels/run-channel":3,"./dom/dom-manager":23}],31:[function(require,module,exports){
'use strict';

module.exports = {

    match: function (matchExpr, matchValue, context) {
        if (_.isString(matchExpr)) {
            return (matchExpr === '*' || (matchExpr.toLowerCase() === matchValue.toLowerCase()));
        } else if (_.isFunction(matchExpr)) {
            return matchExpr(matchValue, context);
        } else if (_.isRegExp(matchExpr)) {
            return matchValue.match(matchExpr);
        }
    },

    getConvertersList: function ($el, property) {
        var attrConverters = $el.data('f-convert-' + property);

        if (!attrConverters && (property === 'bind' || property === 'foreach')) {
            //Only bind inherits from parents
            attrConverters = $el.data('f-convert');
            if (!attrConverters) {
                var $parentEl = $el.closest('[data-f-convert]');
                if ($parentEl) {
                    attrConverters = $parentEl.data('f-convert');
                }
            }

            if (attrConverters) {
                attrConverters = _.invoke(attrConverters.split('|'), 'trim');
            }
        }

        return attrConverters;
    }
};

},{}],32:[function(require,module,exports){
'use strict';

module.exports = {

    toImplicitType: function (data) {
        var rbrace = /^(?:\{.*\}|\[.*\])$/;
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
                converted = $.parseJSON(data) ;
            }
        }
        return converted;
    }
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NoYW5uZWxzL29wZXJhdGlvbnMtY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy9ydW4tY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsInNyYy9jb252ZXJ0ZXJzL251bWJlci1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwic3JjL2NvbnZlcnRlcnMvc3RyaW5nLWNvbnZlcnRlci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9hdHRyaWJ1dGUtbWFuYWdlci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9jaGVja2JveC1yYWRpby1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvYmluZHMvZGVmYXVsdC1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvYmluZHMvaW5wdXQtYmluZC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2NsYXNzLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZGVmYXVsdC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2V2ZW50cy9kZWZhdWx0LWV2ZW50LWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2luaXQtZXZlbnQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL25lZ2F0aXZlLWJvb2xlYW4tYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9uby1vcC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL3Bvc2l0aXZlLWJvb2xlYW4tYXR0ci5qcyIsInNyYy9kb20vZG9tLW1hbmFnZXIuanMiLCJzcmMvZG9tL25vZGVzL2Jhc2UuanMiLCJzcmMvZG9tL25vZGVzL2RlZmF1bHQtaW5wdXQtbm9kZS5qcyIsInNyYy9kb20vbm9kZXMvZGVmYXVsdC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9pbnB1dC1jaGVja2JveC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9ub2RlLW1hbmFnZXIuanMiLCJzcmMvZG9tL3BsdWdpbnMvYXV0by11cGRhdGUtYmluZGluZ3MuanMiLCJzcmMvZmxvdy5qcyIsInNyYy91dGlscy9kb20uanMiLCJzcmMvdXRpbHMvcGFyc2UtdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkZsb3cgPSByZXF1aXJlKCcuL2Zsb3cuanMnKTtcbndpbmRvdy5GbG93LnZlcnNpb24gPSAnPCU9IHZlcnNpb24gJT4nOyAvL3BvcHVsYXRlZCBieSBncnVudFxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlXG4gICAgICAgICAqIEB0eXBlIHtTdHJpbmcgfCBBcnJheSB8IE9iamVjdH0gUG9zc2libGUgb3B0aW9ucyBhcmVcbiAgICAgICAgICogICAgICAgLSB0cnVlOiBuZXZlciB0cmlnZ2VyIGFueSB1cGRhdGVzLiBVc2UgdGhpcyBpZiB5b3Uga25vdyB5b3VyIG1vZGVsIHN0YXRlIHdvbid0IGNoYW5nZSBiYXNlZCBvbiBvcGVyYXRpb25zXG4gICAgICAgICAqICAgICAgIC0gZmFsc2U6IGFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqICAgICAgIC0gW2FycmF5IG9mIHZhcmlhYmxlIG5hbWVzXTogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgd2lsbCBub3QgdHJpZ2dlciB1cGRhdGVzLCBldmVyeXRoaW5nIGVsc2Ugd2lsbFxuICAgICAgICAgKiAgICAgICAtIHsgZXhjZXB0OiBbYXJyYXkgb2Ygb3BlcmF0aW9uc119OiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSB3aWxsIHRyaWdnZXIgdXBkYXRlcywgbm90aGluZyBlbHNlIHdpbGxcbiAgICAgICAgICovXG4gICAgICAgIHNpbGVudDogZmFsc2VcbiAgICB9O1xuXG4gICAgdmFyIGNoYW5uZWxPcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB2YXIgcnVuID0gY2hhbm5lbE9wdGlvbnMucnVuO1xuICAgIHZhciB2ZW50ID0gY2hhbm5lbE9wdGlvbnMudmVudDtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgb3B0aW9uczogY2hhbm5lbE9wdGlvbnNcbiAgICAgICAgfSxcblxuICAgICAgICBsaXN0ZW5lck1hcDoge30sXG5cbiAgICAgICAgLy9DaGVjayBmb3IgdXBkYXRlc1xuICAgICAgICAvKipcbiAgICAgICAgICogVHJpZ2dlcnMgdXBkYXRlIG9uIHNpYmxpbmcgdmFyaWFibGVzIGNoYW5uZWxcbiAgICAgICAgICogQHBhcmFtICB7c3RyaW5nfGFycmF5fSBleGVjdXRlZE9wbnMgb3BlcmF0aW9ucyB3aGljaCBqdXN0IGhhcHBlbmVkXG4gICAgICAgICAqIEBwYXJhbSAgeyp9IHJlc3BvbnNlICByZXNwb25zZSBmcm9tIHRoZSBvcGVyYXRpb25cbiAgICAgICAgICogQHBhcmFtICB7Ym9vbGVhbn0gZm9yY2UgIGlnbm9yZSBhbGwgc2lsZW5jZSBvcHRpb25zIGFuZCBmb3JjZSByZWZyZXNoXG4gICAgICAgICAqL1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoZXhlY3V0ZWRPcG5zLCByZXNwb25zZSwgZm9yY2UpIHtcbiAgICAgICAgICAgIHZhciBzaWxlbnQgPSBjaGFubmVsT3B0aW9ucy5zaWxlbnQ7XG5cbiAgICAgICAgICAgIHZhciBzaG91bGRTaWxlbmNlID0gc2lsZW50ID09PSB0cnVlO1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShzaWxlbnQpICYmIGV4ZWN1dGVkT3Bucykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQsIGV4ZWN1dGVkT3BucykubGVuZ3RoID09PSBzaWxlbnQubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChzaWxlbnQpICYmIGV4ZWN1dGVkT3Bucykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBleGVjdXRlZE9wbnMpLmxlbmd0aCAhPT0gZXhlY3V0ZWRPcG5zLmxlbmd0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFzaG91bGRTaWxlbmNlIHx8IGZvcmNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJCh2ZW50KS50cmlnZ2VyKCdkaXJ0eScsIHsgb3BuOiBleGVjdXRlZE9wbnMsIHJlc3BvbnNlOiByZXNwb25zZSB9KTtcbiAgICAgICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgICAgIF8uZWFjaChleGVjdXRlZE9wbnMsIGZ1bmN0aW9uIChvcG4pIHtcbiAgICAgICAgICAgICAgICAgICAgbWUubm90aWZ5KG9wbiwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIG5vdGlmeTogZnVuY3Rpb24gKG9wZXJhdGlvbiwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl07XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXNbb3BlcmF0aW9uXSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gbGlzdGVuZXIudGFyZ2V0O1xuICAgICAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2FsbChudWxsLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0LnRyaWdnZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIudGFyZ2V0LnRyaWdnZXIoY29uZmlnLmV2ZW50cy5yZWFjdCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbGlzdGVyZXIgZm9ybWF0IGZvciAnICsgb3BlcmF0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogT3BlcmF0aW9uIG5hbWUgJiBwYXJhbWV0ZXJzIHRvIHNlbmQgdG8gb3BlcmF0aW9ucyBBUElcbiAgICAgICAgICogQHBhcmFtICB7c3RyaW5nIHwgb2JqZWN0fSBvcGVyYXRpb24gTmFtZSBvZiBPcGVyYXRpb24uIElmIGFycmF5LCBuZWVkcyB0byBiZSBpbiB7b3BlcmF0aW9uczogW3tuYW1lOiBvcG4sIHBhcmFtczpbXX1dLCBzZXJpYWw6IGJvb2xlYW59XSBmb3JtYXRcbiAgICAgICAgICogQHBhcmFtICB7Kn0gcGFyYW1zIChvcHRpb25hbCkgICBwYXJhbXMgdG8gc2VuZCB0byBvcGVydGFpb25cbiAgICAgICAgICogQHBhcmFtIHtvcHRpb259IG9wdGlvbnMgU3VwcG9ydGVkIG9wdGlvbnM6IHtzaWxlbnQ6IEJvb2xlYW59XG4gICAgICAgICAqIEByZXR1cm4geyRwcm9taXNlfVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24gKG9wZXJhdGlvbiwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChvcGVyYXRpb24pICYmIG9wZXJhdGlvbi5vcGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gKG9wZXJhdGlvbi5zZXJpYWwpID8gcnVuLnNlcmlhbCA6IHJ1bi5wYXJhbGxlbDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbChydW4sIG9wZXJhdGlvbi5vcGVyYXRpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXJhbXMgfHwgIXBhcmFtcy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBfLnBsdWNrKG9wZXJhdGlvbi5vcGVyYXRpb25zLCAnbmFtZScpLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogY2hlY2sgaWYgaW50ZXJwb2xhdGVkXG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSAoJC5pc1BsYWluT2JqZWN0KG9wZXJhdGlvbikpID8gcGFyYW1zIDogb3B0aW9ucztcbiAgICAgICAgICAgICAgICByZXR1cm4gcnVuLmRvLmFwcGx5KHJ1biwgYXJndW1lbnRzKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0cyB8fCAhb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIFtvcGVyYXRpb25dLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ29wZXJhdGlvbnMgcHVibGlzaCcsIG9wZXJhdGlvbiwgcGFyYW1zKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb25zLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBzdWJzY3JpYmUnLCBvcGVyYXRpb25zLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIG9wZXJhdGlvbnMgPSBbXS5jb25jYXQob3BlcmF0aW9ucyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICAvL1RPRE86IHN1YnNjcmliZXIgY2FuIGJlIGEgZnVuY3Rpb25cbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbiAmJiAhXy5pc0Z1bmN0aW9uKHN1YnNjcmliZXIpKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLm9wZXJhdGlvbicpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHRhcmdldDogc3Vic2NyaWJlclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgICAgICAgJC5lYWNoKG9wZXJhdGlvbnMsIGZ1bmN0aW9uIChpbmRleCwgb3BuKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtZS5saXN0ZW5lck1hcFtvcG5dKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWUubGlzdGVuZXJNYXBbb3BuXSA9IG1lLmxpc3RlbmVyTWFwW29wbl0uY29uY2F0KGRhdGEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0gPSBfLnJlamVjdCh0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0sIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwID0ge307XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFZhcnNDaGFubmVsID0gcmVxdWlyZSgnLi92YXJpYWJsZXMtY2hhbm5lbCcpO1xudmFyIE9wZXJhdGlvbnNDaGFubmVsID0gcmVxdWlyZSgnLi9vcGVyYXRpb25zLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgcnVuOiB7XG4gICAgICAgICAgICB2YXJpYWJsZXM6IHtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9wZXJhdGlvbnM6IHtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29uZmlnID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgIHZhciBybSA9IG5ldyBGLm1hbmFnZXIuUnVuTWFuYWdlcihjb25maWcpO1xuICAgIHZhciBycyA9IHJtLnJ1bjtcblxuICAgIHZhciAkY3JlYXRpb25Qcm9taXNlID0gcm0uZ2V0UnVuKCk7XG4gICAgcnMuY3VycmVudFByb21pc2UgPSAkY3JlYXRpb25Qcm9taXNlO1xuXG4gICAgdmFyIGNyZWF0ZUFuZFRoZW4gPSBmdW5jdGlvbiAoZm4sIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIF8ud3JhcChmbiwgZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgICAgIHZhciBwYXNzZWRJblBhcmFtcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDEpO1xuICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJzLmN1cnJlbnRQcm9taXNlID0gZnVuYy5hcHBseShjb250ZXh0LCBwYXNzZWRJblBhcmFtcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvL01ha2Ugc3VyZSBub3RoaW5nIGhhcHBlbnMgYmVmb3JlIHRoZSBydW4gaXMgY3JlYXRlZFxuICAgIF8uZWFjaChycywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpICYmIG5hbWUgIT09ICd2YXJpYWJsZXMnICAmJiBuYW1lICE9PSAnY3JlYXRlJykge1xuICAgICAgICAgICAgcnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCBycyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBvcmlnaW5hbFZhcmlhYmxlc0ZuID0gcnMudmFyaWFibGVzO1xuICAgIHJzLnZhcmlhYmxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZzID0gb3JpZ2luYWxWYXJpYWJsZXNGbi5hcHBseShycywgYXJndW1lbnRzKTtcbiAgICAgICAgXy5lYWNoKHZzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCB2cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdnM7XG4gICAgfTtcblxuICAgIHRoaXMucnVuID0gcnM7XG4gICAgdGhpcy52YXJpYWJsZXMgPSBuZXcgVmFyc0NoYW5uZWwoJC5leHRlbmQodHJ1ZSwge30sIGNvbmZpZy5ydW4udmFyaWFibGVzLCB7IHJ1bjogcnMsIHZlbnQ6IHRoaXMgfSkpO1xuICAgIHRoaXMub3BlcmF0aW9ucyA9IG5ldyBPcGVyYXRpb25zQ2hhbm5lbCgkLmV4dGVuZCh0cnVlLCB7fSwgY29uZmlnLnJ1bi5vcGVyYXRpb25zLCB7IHJ1bjogcnMsIHZlbnQ6IHRoaXMgfSkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZVxuICAgICAgICAgKiBAdHlwZSB7U3RyaW5nIHwgQXJyYXkgfCBPYmplY3R9IFBvc3NpYmxlIG9wdGlvbnMgYXJlXG4gICAgICAgICAqICAgICAgIC0gdHJ1ZTogbmV2ZXIgdHJpZ2dlciBhbnkgdXBkYXRlcy4gVXNlIHRoaXMgaWYgeW91IGtub3cgeW91ciBtb2RlbCBzdGF0ZSB3b24ndCBjaGFuZ2UgYmFzZWQgb24gb3RoZXIgdmFyaWFibGVzXG4gICAgICAgICAqICAgICAgIC0gZmFsc2U6IGFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqICAgICAgIC0gW2FycmF5IG9mIHZhcmlhYmxlIG5hbWVzXTogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgd2lsbCBub3QgdHJpZ2dlciB1cGRhdGVzLCBldmVyeXRoaW5nIGVsc2Ugd2lsbFxuICAgICAgICAgKiAgICAgICAtIHsgZXhjZXB0OiBbYXJyYXkgb2YgdmFyaWFibGVzXX06IFZhcmlhYmxlcyBpbiB0aGlzIGFycmF5IHdpbGwgdHJpZ2dlciB1cGRhdGVzLCBub3RoaW5nIGVsc2Ugd2lsbFxuICAgICAgICAgKi9cbiAgICAgICAgc2lsZW50OiBmYWxzZSxcblxuICAgICAgICBhdXRvRmV0Y2g6IGZhbHNlXG4gICAgfTtcblxuICAgIHZhciBjaGFubmVsT3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgdmFyIHZzID0gY2hhbm5lbE9wdGlvbnMucnVuLnZhcmlhYmxlcygpO1xuICAgIHZhciB2ZW50ID0gY2hhbm5lbE9wdGlvbnMudmVudDtcblxuICAgIHZhciBjdXJyZW50RGF0YSA9IHt9O1xuXG4gICAgLy9UT0RPOiBhY3R1YWxseSBjb21wYXJlIG9iamVjdHMgYW5kIHNvIG9uXG4gICAgdmFyIGlzRXF1YWwgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHZhciBnZXRJbm5lclZhcmlhYmxlcyA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgdmFyIGlubmVyID0gc3RyLm1hdGNoKC88KC4qPyk+L2cpO1xuICAgICAgICBpbm5lciA9IF8ubWFwKGlubmVyLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsLnN1YnN0cmluZygxLCB2YWwubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaW5uZXI7XG4gICAgfTtcblxuICAgIC8vUmVwbGFjZXMgc3R1YmJlZCBvdXQga2V5bmFtZXMgaW4gdmFyaWFibGVzdG9pbnRlcnBvbGF0ZSB3aXRoIHRoZWlyIGNvcnJlc3BvbmRpbmcgdmFsdWVzXG4gICAgdmFyIGludGVycG9sYXRlID0gZnVuY3Rpb24gKHZhcmlhYmxlc1RvSW50ZXJwb2xhdGUsIHZhbHVlcykge1xuICAgICAgICAvL3twcmljZVsxXTogcHJpY2VbPHRpbWU+XX1cbiAgICAgICAgdmFyIGludGVycG9sYXRpb25NYXAgPSB7fTtcbiAgICAgICAgLy97cHJpY2VbMV06IDF9XG4gICAgICAgIHZhciBpbnRlcnBvbGF0ZWQgPSBbXTtcblxuICAgICAgICBfLmVhY2godmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgZnVuY3Rpb24gKG91dGVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKG91dGVyVmFyaWFibGUpO1xuICAgICAgICAgICAgaWYgKGlubmVyICYmIGlubmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBvcmlnaW5hbE91dGVyID0gb3V0ZXJWYXJpYWJsZTtcbiAgICAgICAgICAgICAgICAkLmVhY2goaW5uZXIsIGZ1bmN0aW9uIChpbmRleCwgaW5uZXJWYXJpYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhpc3ZhbCA9IHZhbHVlc1tpbm5lclZhcmlhYmxlXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXN2YWwgIT09IG51bGwgJiYgdGhpc3ZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KHRoaXN2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Gb3IgYXJyYXllZCB0aGluZ3MgZ2V0IHRoZSBsYXN0IG9uZSBmb3IgaW50ZXJwb2xhdGlvbiBwdXJwb3Nlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXN2YWwgPSB0aGlzdmFsW3RoaXN2YWwubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE86IFJlZ2V4IHRvIG1hdGNoIHNwYWNlcyBhbmQgc28gb25cbiAgICAgICAgICAgICAgICAgICAgICAgIG91dGVyVmFyaWFibGUgPSBvdXRlclZhcmlhYmxlLnJlcGxhY2UoJzwnICsgaW5uZXJWYXJpYWJsZSArICc+JywgdGhpc3ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdID0gKGludGVycG9sYXRpb25NYXBbb3V0ZXJWYXJpYWJsZV0pID8gW29yaWdpbmFsT3V0ZXJdLmNvbmNhdChpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdKSA6IG9yaWdpbmFsT3V0ZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbnRlcnBvbGF0ZWQucHVzaChvdXRlclZhcmlhYmxlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG9wID0ge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkOiBpbnRlcnBvbGF0ZWQsXG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwOiBpbnRlcnBvbGF0aW9uTWFwXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBvcDtcbiAgICB9O1xuXG4gICAgdmFyIGxhc3RDaGVja1RpbWUgPSBfLm5vdygpO1xuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgZ2V0SW5uZXJWYXJpYWJsZXM6IGdldElubmVyVmFyaWFibGVzLFxuICAgICAgICAgICAgaW50ZXJwb2xhdGU6IGludGVycG9sYXRlLFxuICAgICAgICAgICAgb3B0aW9uczogY2hhbm5lbE9wdGlvbnNcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJzY3JpcHRpb25zOiBbXSxcblxuICAgICAgICB1bmZldGNoZWQ6IFtdLFxuXG4gICAgICAgIGdldFN1YnNjcmliZXJzOiBmdW5jdGlvbiAodG9waWMpIHtcbiAgICAgICAgICAgIGlmICh0b3BpYykge1xuICAgICAgICAgICAgICAgIHJldHVybiBfLmZpbHRlcih0aGlzLnN1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfLmNvbnRhaW5zKHN1YnMudG9waWNzLCB0b3BpYyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN1YnNjcmlwdGlvbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldEFsbFRvcGljczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF8odGhpcy5zdWJzY3JpcHRpb25zKS5wbHVjaygndG9waWNzJykuZmxhdHRlbigpLnVuaXEoKS52YWx1ZSgpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRUb3BpY0RlcGVuZGVuY2llczogZnVuY3Rpb24gKGxpc3QpIHtcbiAgICAgICAgICAgIGlmICghbGlzdCkge1xuICAgICAgICAgICAgICAgIGxpc3QgPSB0aGlzLmdldEFsbFRvcGljcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlubmVyTGlzdCA9IFtdO1xuICAgICAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uICh2bmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKHZuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlubmVyTGlzdCA9IF8udW5pcShpbm5lckxpc3QuY29uY2F0KGlubmVyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gaW5uZXJMaXN0O1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaDogZnVuY3Rpb24gKHRvcGljcykge1xuICAgICAgICAgICAgdGhpcy51bmZldGNoZWQgPSBfLnVuaXEodGhpcy51bmZldGNoZWQuY29uY2F0KHRvcGljcykpO1xuICAgICAgICAgICAgLy8gaWYgaXQgaGFzIGJlZW4gYSBzZWNvbmQgc2luY2UgeW91IGxhc3QgY2hlY2tlZCwgb3IgdGhlcmUgYXJlIGF0IGxlYXN0IDUgaXRlbXMgaW4gdGhlIHBlbmRpbmcgcXVldWVcbiAgICAgICAgICAgIHZhciBUSU1FX0JFVFdFRU5fQ0hFQ0tTID0gMjAwO1xuICAgICAgICAgICAgdmFyIE1BWF9JVEVNU19JTl9RVUVVRSA9IDU7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICAgICAgICBpZiAoY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoICYmIChub3cgLSBsYXN0Q2hlY2tUaW1lID4gVElNRV9CRVRXRUVOX0NIRUNLUyB8fCB0aGlzLnVuZmV0Y2hlZC5sZW5ndGggPiBNQVhfSVRFTVNfSU5fUVVFVUUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mZXRjaCh0aGlzLnVuZmV0Y2hlZCkudGhlbihmdW5jdGlvbiAoY2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImZldGNoZWRcIiwgXy5ub3coKSlcbiAgICAgICAgICAgICAgICAgICAgJC5leHRlbmQoY3VycmVudERhdGEsIGNoYW5nZWQpO1xuICAgICAgICAgICAgICAgICAgICBtZS51bmZldGNoZWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbGFzdENoZWNrVGltZSA9IG5vdztcbiAgICAgICAgICAgICAgICAgICAgbWUubm90aWZ5KGNoYW5nZWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIm5vdCB0aW1lIHlldFwiLCAobm93IC0gbGFzdENoZWNrVGltZSkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmV0Y2g6IGZ1bmN0aW9uICh2YXJpYWJsZXNMaXN0KSB7XG4gICAgICAgICAgICB2YXJpYWJsZXNMaXN0ID0gW10uY29uY2F0KHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgdmFyIGlubmVyVmFyaWFibGVzID0gdGhpcy5nZXRUb3BpY0RlcGVuZGVuY2llcyh2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIHZhciBnZXRWYXJpYWJsZXMgPSBmdW5jdGlvbiAodmFycywgaW50ZXJwb2xhdGlvbk1hcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeSh2YXJzKS50aGVuKGZ1bmN0aW9uICh2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ0dvdCB2YXJpYWJsZXMnLCB2YXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2hhbmdlU2V0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaCh2YXJpYWJsZXMsIGZ1bmN0aW9uICh2YWx1ZSwgdm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGN1cnJlbnREYXRhW3ZuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNFcXVhbCh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W3ZuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlcnBvbGF0aW9uTWFwICYmIGludGVycG9sYXRpb25NYXBbdm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSBbXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFt2bmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2gobWFwLCBmdW5jdGlvbiAoaW50ZXJwb2xhdGVkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W2ludGVycG9sYXRlZE5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGFuZ2VTZXQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGlubmVyVmFyaWFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeShpbm5lclZhcmlhYmxlcykudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW5uZXInLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpcCA9ICBpbnRlcnBvbGF0ZSh2YXJpYWJsZXNMaXN0LCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXMoaXAuaW50ZXJwb2xhdGVkLCBpcC5pbnRlcnBvbGF0aW9uTWFwKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldFZhcmlhYmxlcyh2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2sgYW5kIG5vdGlmeSBhbGwgbGlzdGVuZXJzXG4gICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gY2hhbmdlT2JqIGtleS12YWx1ZSBwYWlycyBvZiBjaGFuZ2VkIHZhcmlhYmxlc1xuICAgICAgICAgKi9cbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24gKGNoYW5nZU9iaiwgZm9yY2UpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgc2lsZW50ID0gY2hhbm5lbE9wdGlvbnMuc2lsZW50O1xuICAgICAgICAgICAgdmFyIGNoYW5nZWRWYXJpYWJsZXMgPSBfLmtleXMoY2hhbmdlT2JqKTtcblxuICAgICAgICAgICAgdmFyIHNob3VsZFNpbGVuY2UgPSBzaWxlbnQgPT09IHRydWU7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHNpbGVudCkgJiYgY2hhbmdlZFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQsIGNoYW5nZWRWYXJpYWJsZXMpLmxlbmd0aCA+PSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChzaWxlbnQpICYmIGNoYW5nZWRWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LmV4Y2VwdCwgY2hhbmdlZFZhcmlhYmxlcykubGVuZ3RoICE9PSBjaGFuZ2VkVmFyaWFibGVzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHNob3VsZFNpbGVuY2UgJiYgZm9yY2UgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJC5EZWZlcnJlZCgpLnJlc29sdmUoKS5wcm9taXNlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB2YXJpYWJsZXMgPSB0aGlzLmdldEFsbFRvcGljcygpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2godmFyaWFibGVzKS50aGVuKGZ1bmN0aW9uIChjaGFuZ2VTZXQpIHtcbiAgICAgICAgICAgICAgICBtZS51bmZldGNoZWQgPSBbXTtcbiAgICAgICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50RGF0YSwgY2hhbmdlU2V0KTtcbiAgICAgICAgICAgICAgICBtZS5ub3RpZnkoY2hhbmdlU2V0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIG5vdGlmeTogZnVuY3Rpb24gKHRvcGljcywgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBjYWxsVGFyZ2V0ID0gZnVuY3Rpb24gKHRhcmdldCwgcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5jYWxsKG51bGwsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnRyaWdnZXIoY29uZmlnLmV2ZW50cy5yZWFjdCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoISQuaXNQbGFpbk9iamVjdCh0b3BpY3MpKSB7XG4gICAgICAgICAgICAgICAgdG9waWNzID0gXy5vYmplY3QoW3RvcGljc10sIFt2YWx1ZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXy5lYWNoKHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnNjcmlwdGlvbikge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSBzdWJzY3JpcHRpb24udGFyZ2V0O1xuICAgICAgICAgICAgICAgIGlmIChzdWJzY3JpcHRpb24uYmF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoaW5nVG9waWNzID0gXy5waWNrKHRvcGljcywgc3Vic2NyaXB0aW9uLnRvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLnNpemUobWF0Y2hpbmdUb3BpY3MpID09PSBfLnNpemUoc3Vic2NyaXB0aW9uLnRvcGljcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxUYXJnZXQodGFyZ2V0LCBtYXRjaGluZ1RvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfLmVhY2goc3Vic2NyaXB0aW9uLnRvcGljcywgZnVuY3Rpb24gKHRvcGljKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2hpbmdUb3BpY3MgPSBfLnBpY2sodG9waWNzLCB0b3BpYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5zaXplKG1hdGNoaW5nVG9waWNzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxUYXJnZXQodGFyZ2V0LCBtYXRjaGluZ1RvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWYXJpYWJsZSBuYW1lICYgcGFyYW1ldGVycyB0byBzZW5kIHZhcmlhYmxlcyBBUElcbiAgICAgICAgICogQHBhcmFtICB7c3RyaW5nIHwgb2JqZWN0fSB2YXJpYWJsZSBzdHJpbmcgb3Ige3ZhcmlhYmxlbmFtZTogdmFsdWV9XG4gICAgICAgICAqIEBwYXJhbSAgeyp9IHZhbHVlIChvcHRpb25hbCkgICB2YWx1ZSBvZiB2YXJpYWJsZSBpZiBwcmV2aW91cyBhcmcgd2FzIGEgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIFN1cHBvcnRlZCBvcHRpb25zOiB7c2lsZW50OiBCb29sZWFufVxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uICh2YXJpYWJsZSwgdmFsdWUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwdWJsaXNoJywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBhdHRycztcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QodmFyaWFibGUpKSB7XG4gICAgICAgICAgICAgICAgYXR0cnMgPSB2YXJpYWJsZTtcbiAgICAgICAgICAgICAgICBvcHRpb25zID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIChhdHRycyA9IHt9KVt2YXJpYWJsZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpdCA9IGludGVycG9sYXRlKF8ua2V5cyhhdHRycyksIGN1cnJlbnREYXRhKTtcblxuICAgICAgICAgICAgdmFyIHRvU2F2ZSA9IHt9O1xuICAgICAgICAgICAgXy5lYWNoKGF0dHJzLCBmdW5jdGlvbiAodmFsLCBhdHRyKSB7XG4gICAgICAgICAgICAgICB2YXIga2V5ID0gKGl0LmludGVycG9sYXRpb25NYXBbYXR0cl0pID8gaXQuaW50ZXJwb2xhdGlvbk1hcFthdHRyXSA6IGF0dHI7XG4gICAgICAgICAgICAgICB0b1NhdmVba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiB2cy5zYXZlLmNhbGwodnMsIHRvU2F2ZSlcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucyB8fCAhb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgYXR0cnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN1YnNjcmliZSB0byBjaGFuZ2VzIG9uIGEgY2hhbm5lbFxuICAgICAgICAgKiBAcGFyYW0gIHtBcnJheXxTdHJpbmd9IHRvcGljcyBMaXN0IG9mIHRhc2tzXG4gICAgICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gc3Vic2NyaWJlclxuICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnMgIChPcHRpb25hbClcbiAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSAgICAgICAgICAgIFN1YnNjcmlwdGlvbiBJRFxuICAgICAgICAgKi9cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbiAodG9waWNzLCBzdWJzY3JpYmVyLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnc3Vic2NyaWJpbmcnLCB0b3BpY3MsIHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgICAgIGJhdGNoOiBmYWxzZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdG9waWNzID0gW10uY29uY2F0KHRvcGljcyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICBpZiAoIXN1YnNjcmliZXIub24gJiYgIV8uaXNGdW5jdGlvbihzdWJzY3JpYmVyKSkge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC52YXJpYWJsZScpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSAkLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHRvcGljczogdG9waWNzLFxuICAgICAgICAgICAgICAgIHRhcmdldDogc3Vic2NyaWJlclxuICAgICAgICAgICAgfSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaChkYXRhKTtcblxuICAgICAgICAgICAgdGhpcy51cGRhdGVBbmRDaGVja0ZvclJlZnJlc2godG9waWNzKTtcbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfSxcblxuXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IF8ucmVqZWN0KHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmVBbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IFtdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG4gICAgdmFyIG1lID0gdGhpcztcbiAgICAkKHZlbnQpLm9mZignZGlydHknKS5vbignZGlydHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgbnVsbCwgdHJ1ZSk7XG4gICAgfSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJlZml4OiAnZicsXG4gICAgZGVmYXVsdEF0dHI6ICdiaW5kJyxcblxuICAgIGJpbmRlckF0dHI6ICdmLWJpbmQnLFxuXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIHRyaWdnZXI6ICd1cGRhdGUuZi51aScsXG4gICAgICAgIHJlYWN0OiAndXBkYXRlLmYubW9kZWwnXG4gICAgfVxuXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGxpc3QgPSBbXG4gICAge1xuICAgICAgICBhbGlhczogJ2xpc3QnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gW10uY29uY2F0KHZhbCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgYWxpYXM6ICdsYXN0JyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsW3ZhbC5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBhbGlhczogJ2ZpcnN0JyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsWzBdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGFsaWFzOiAncHJldmlvdXMnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiAodmFsLmxlbmd0aCA8PSAxKSA/IHZhbFswXSA6IHZhbFt2YWwubGVuZ3RoIC0gMl07XG4gICAgICAgIH1cbiAgICB9XG5dO1xuXG5fLmVhY2gobGlzdCwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgIHZhciBvbGRmbiA9IGl0ZW0uY29udmVydDtcbiAgIHZhciBuZXdmbiA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcFZhbHVlcyh2YWwsIG9sZGZuKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9sZGZuKHZhbCk7XG4gICAgICAgfVxuICAgfTtcbiAgIGl0ZW0uY29udmVydCA9IG5ld2ZuO1xufSk7XG5tb2R1bGUuZXhwb3J0cyA9IGxpc3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vVE9ETzogTWFrZSBhbGwgdW5kZXJzY29yZSBmaWx0ZXJzIGF2YWlsYWJsZVxuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIsIGFjY2VwdExpc3QpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgLy9ub21hbGl6ZSgnZmxpcCcsIGZuKVxuICAgIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyKSkge1xuICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICBhbGlhczogYWxpYXMsXG4gICAgICAgICAgICBjb252ZXJ0OiBjb252ZXJ0ZXIsXG4gICAgICAgICAgICBhY2NlcHRMaXN0OiBhY2NlcHRMaXN0XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoJC5pc1BsYWluT2JqZWN0KGNvbnZlcnRlcikgJiYgY29udmVydGVyLmNvbnZlcnQpIHtcbiAgICAgICAgY29udmVydGVyLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIGNvbnZlcnRlci5hY2NlcHRMaXN0ID0gYWNjZXB0TGlzdDtcbiAgICAgICAgcmV0LnB1c2goY29udmVydGVyKTtcbiAgICB9IGVsc2UgaWYgKCQuaXNQbGFpbk9iamVjdChhbGlhcykpIHtcbiAgICAgICAgLy9ub3JtYWxpemUoe2FsaWFzOiAnZmxpcCcsIGNvbnZlcnQ6IGZ1bmN0aW9ufSlcbiAgICAgICAgaWYgKGFsaWFzLmNvbnZlcnQpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGFsaWFzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vcm1hbGl6ZSh7ZmxpcDogZnVufSlcbiAgICAgICAgICAgICQuZWFjaChhbGlhcywgZnVuY3Rpb24gKGtleSwgdmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBhbGlhczoga2V5LFxuICAgICAgICAgICAgICAgICAgICBjb252ZXJ0OiB2YWwsXG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdExpc3Q6IGFjY2VwdExpc3RcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgbWF0Y2hDb252ZXJ0ZXIgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgIGlmIChfLmlzU3RyaW5nKGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGFsaWFzID09PSBjb252ZXJ0ZXIuYWxpYXM7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzKGFsaWFzKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNSZWdleChjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIuYWxpYXMubWF0Y2goYWxpYXMpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgY29udmVydGVyTWFuYWdlciA9IHtcbiAgICBwcml2YXRlOiB7XG4gICAgICAgIG1hdGNoQ29udmVydGVyOiBtYXRjaENvbnZlcnRlclxuICAgIH0sXG5cbiAgICBsaXN0OiBbXSxcbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgYXR0cmlidXRlIGNvbnZlcnRlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ3xmdW5jdGlvbnxyZWdleH0gYWxpYXMgZm9ybWF0dGVyIG5hbWVcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbnxvYmplY3R9IGNvbnZlcnRlciAgICBjb252ZXJ0ZXIgY2FuIGVpdGhlciBiZSBhIGZ1bmN0aW9uLCB3aGljaCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZSwgb3IgYW4gb2JqZWN0IHdpdGgge2FsaWFzOiAnJywgcGFyc2U6ICQubm9vcCwgY29udmVydDogJC5ub29wfVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWNjZXB0TGlzdCBkZWNpZGVzIGlmIHRoZSBjb252ZXJ0ZXIgaXMgYSAnbGlzdCcgY29udmVydGVyIG9yIG5vdDsgbGlzdCBjb252ZXJ0ZXJzIHRha2UgaW4gYXJyYXlzIGFzIGlucHV0cywgb3RoZXJzIGV4cGVjdCBzaW5nbGUgdmFsdWVzLlxuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlciwgYWNjZXB0TGlzdCkge1xuICAgICAgICB2YXIgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZShhbGlhcywgY29udmVydGVyLCBhY2NlcHRMaXN0KTtcbiAgICAgICAgdGhpcy5saXN0ID0gbm9ybWFsaXplZC5jb25jYXQodGhpcy5saXN0KTtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2godGhpcy5saXN0LCBmdW5jdGlvbiAoY3VycmVudENvbnZlcnRlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQ29udmVydGVyKGFsaWFzLCBjdXJyZW50Q29udmVydGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlcilbMF0pO1xuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXI6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQ29udmVydGVyKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGlwZXMgdGhlIHZhbHVlIHNlcXVlbnRpYWxseSB0aHJvdWdoIGEgbGlzdCBvZiBwcm92aWRlZCBjb252ZXJ0ZXJzXG4gICAgICogQHBhcmFtICB7Kn0gdmFsdWUgSW5wdXQgZm9yIHRoZSBjb252ZXJ0ZXIgdG8gdGFnXG4gICAgICogQHBhcmFtICB7QXJyYXl8T2JqZWN0fSBsaXN0ICBsaXN0IG9mIGNvbnZlcnRlcnMgKG1hcHMgdG8gY29udmVydGVyIGFsaWFzKVxuICAgICAqIEByZXR1cm4geyp9ICAgICAgIGNvbnZlcnRlZCB2YWx1ZVxuICAgICAqL1xuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KTtcbiAgICAgICAgbGlzdCA9IF8uaW52b2tlKGxpc3QsICd0cmltJyk7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgIHZhciBjb252ZXJ0QXJyYXkgPSBmdW5jdGlvbiAoY29udmVydGVyLCB2YWwsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcCh2YWwsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5jb252ZXJ0KHYsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBjb252ZXJ0T2JqZWN0ID0gZnVuY3Rpb24gKGNvbnZlcnRlciwgdmFsdWUsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcFZhbHVlcyh2YWx1ZSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICByZXR1cm4gY29udmVydChjb252ZXJ0ZXIsIHZhbCwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uIChjb252ZXJ0ZXIsIHZhbHVlLCBjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVkO1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgJiYgY29udmVydGVyLmFjY2VwdExpc3QgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QXJyYXkoY29udmVydGVyLCB2YWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRlci5jb252ZXJ0KHZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjb252ZXJ0ZWQ7XG4gICAgICAgIH07XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlciA9IG1lLmdldENvbnZlcnRlcihjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QoY3VycmVudFZhbHVlKSAmJiBjb252ZXJ0ZXIuYWNjZXB0TGlzdCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRPYmplY3QoY29udmVydGVyLCBjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0KGNvbnZlcnRlciwgY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvdW50ZXItcGFydCB0byAnY29udmVydCcuIFRyYW5zbGF0ZXMgY29udmVydGVkIHZhbHVlcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGZvcm1cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHBhcnNlXG4gICAgICogQHBhcmFtICB7U3RyaW5nIHwgQXJyYXl9IGxpc3QgIExpc3Qgb2YgcGFyc2VycyB0byBydW4gdGhpcyB0aHJvdWdoLiBPdXRlcm1vc3QgaXMgaW52b2tlZCBmaXJzdFxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KS5yZXZlcnNlKCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgaWYgKGNvbnZlcnRlci5wYXJzZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRlci5wYXJzZShjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICB9XG59O1xuXG5cbi8vQm9vdHN0cmFwXG52YXIgZGVmYXVsdGNvbnZlcnRlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9udW1iZXItY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9zdHJpbmctY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9hcnJheS1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL251bWJlcmZvcm1hdC1jb252ZXJ0ZXInKSxcbl07XG5cbiQuZWFjaChkZWZhdWx0Y29udmVydGVycy5yZXZlcnNlKCksIGZ1bmN0aW9uIChpbmRleCwgY29udmVydGVyKSB7XG4gICAgaWYgKF8uaXNBcnJheShjb252ZXJ0ZXIpKSB7XG4gICAgICAgIF8uZWFjaChjb252ZXJ0ZXIsIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgIGNvbnZlcnRlck1hbmFnZXIucmVnaXN0ZXIoYyk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnZlcnRlck1hbmFnZXIucmVnaXN0ZXIoY29udmVydGVyKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb252ZXJ0ZXJNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYWxpYXM6ICdpJyxcbiAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsdWUsIDEwKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYWxpYXM6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIC8vVE9ETzogRmFuY3kgcmVnZXggdG8gbWF0Y2ggbnVtYmVyIGZvcm1hdHMgaGVyZVxuICAgICAgICByZXR1cm4gKG5hbWUuaW5kZXhPZignIycpICE9PSAtMSB8fCBuYW1lLmluZGV4T2YoJzAnKSAhPT0gLTEpO1xuICAgIH0sXG5cbiAgICBwYXJzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwrPSAnJztcbiAgICAgICAgdmFyIGlzTmVnYXRpdmUgPSB2YWwuY2hhckF0KDApID09PSAnLSc7XG5cbiAgICAgICAgdmFsICA9IHZhbC5yZXBsYWNlKC8sL2csICcnKTtcbiAgICAgICAgdmFyIGZsb2F0TWF0Y2hlciA9IC8oWy0rXT9bMC05XSpcXC4/WzAtOV0rKShLP00/Qj8lPykvaTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBmbG9hdE1hdGNoZXIuZXhlYyh2YWwpO1xuICAgICAgICB2YXIgbnVtYmVyLCBzdWZmaXggPSAnJztcbiAgICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0c1sxXSkge1xuICAgICAgICAgICAgbnVtYmVyID0gcmVzdWx0c1sxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0cyAmJiByZXN1bHRzWzJdKSB7XG4gICAgICAgICAgICBzdWZmaXggPSByZXN1bHRzWzJdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKHN1ZmZpeCkge1xuICAgICAgICAgICAgY2FzZSAnJSc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyIC8gMTAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnayc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ20nOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDAwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwMDAwMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG51bWJlciA9IHBhcnNlRmxvYXQobnVtYmVyKTtcbiAgICAgICAgaWYgKGlzTmVnYXRpdmUgJiYgbnVtYmVyID4gMCkge1xuICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogLTE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bWJlcjtcbiAgICB9LFxuXG4gICAgY29udmVydDogKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgc2NhbGVzID0gWycnLCAnSycsICdNJywgJ0InLCAnVCddO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldERpZ2l0cyh2YWx1ZSwgZGlnaXRzKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID09PSAwID8gMCA6IHJvdW5kVG8odmFsdWUsIE1hdGgubWF4KDAsIGRpZ2l0cyAtIE1hdGguY2VpbChNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMTApKSk7XG5cbiAgICAgICAgICAgIHZhciBUWFQgPSAnJztcbiAgICAgICAgICAgIHZhciBudW1iZXJUWFQgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIGRlY2ltYWxTZXQgPSBmYWxzZTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaVRYVCA9IDA7IGlUWFQgPCBudW1iZXJUWFQubGVuZ3RoOyBpVFhUKyspIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gbnVtYmVyVFhULmNoYXJBdChpVFhUKTtcbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyVFhULmNoYXJBdChpVFhUKSA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlY2ltYWxTZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRpZ2l0cy0tO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChkaWdpdHMgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVFhUO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFkZWNpbWFsU2V0KSB7XG4gICAgICAgICAgICAgICAgVFhUICs9ICcuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChkaWdpdHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgVFhUICs9ICcwJztcbiAgICAgICAgICAgICAgICBkaWdpdHMtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBUWFQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGREZWNpbWFscyh2YWx1ZSwgZGVjaW1hbHMsIG1pbkRlY2ltYWxzLCBoYXNDb21tYXMpIHtcbiAgICAgICAgICAgIGhhc0NvbW1hcyA9IGhhc0NvbW1hcyB8fCB0cnVlO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoID4gMSk7XG4gICAgICAgICAgICB2YXIgaURlYyA9IDA7XG5cbiAgICAgICAgICAgIGlmIChoYXNDb21tYXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpQ2hhciA9IG51bWJlclRYVC5sZW5ndGggLSAxOyBpQ2hhciA+IDA7IGlDaGFyLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0RlY2ltYWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNEZWNpbWFscyA9IChudW1iZXJUWFQuY2hhckF0KGlDaGFyKSAhPT0gJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlEZWMgPSAoaURlYyArIDEpICUgMztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpRGVjID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUID0gbnVtYmVyVFhULnN1YnN0cigwLCBpQ2hhcikgKyAnLCcgKyBudW1iZXJUWFQuc3Vic3RyKGlDaGFyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRlY2ltYWxzID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciB0b0FERDtcbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BREQgPSBtaW5EZWNpbWFscztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcuJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHMgLSBudW1iZXJUWFQuc3BsaXQoJy4nKVsxXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgICAgICB0b0FERC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudW1iZXJUWFQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByb3VuZFRvKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlICogTWF0aC5wb3coMTAsIGRpZ2l0cykpIC8gTWF0aC5wb3coMTAsIGRpZ2l0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRTdWZmaXgoZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQucmVwbGFjZSgnLicsICcnKTtcbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgcmV0dXJuIChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzQ3VycmVuY3koc3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgcyA9ICQudHJpbShzdHJpbmcpO1xuXG4gICAgICAgICAgICBpZiAocyA9PT0gJyQnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqwnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqUnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqMnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawrEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ0vDhD8nIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ2tyJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKiJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKqJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDhuKAmScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqycpIHtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmb3JtYXQobnVtYmVyLCBmb3JtYXRUWFQpIHtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkobnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlcltudW1iZXIubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uaXNTdHJpbmcobnVtYmVyKSAmJiAhXy5pc051bWJlcihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bWJlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFmb3JtYXRUWFQgfHwgZm9ybWF0VFhULnRvTG93ZXJDYXNlKCkgPT09ICdkZWZhdWx0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXIudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzTmFOKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJz8nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL3ZhciBmb3JtYXRUWFQ7XG4gICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQucmVwbGFjZSgnJmV1cm87JywgJ8Oi4oCawqwnKTtcblxuICAgICAgICAgICAgLy8gRGl2aWRlICsvLSBOdW1iZXIgRm9ybWF0XG4gICAgICAgICAgICB2YXIgZm9ybWF0cyA9IGZvcm1hdFRYVC5zcGxpdCgnOycpO1xuICAgICAgICAgICAgaWYgKGZvcm1hdHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXQoTWF0aC5hYnMobnVtYmVyKSwgZm9ybWF0c1soKG51bWJlciA+PSAwKSA/IDAgOiAxKV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTYXZlIFNpZ25cbiAgICAgICAgICAgIHZhciBzaWduID0gKG51bWJlciA+PSAwKSA/ICcnIDogJy0nO1xuICAgICAgICAgICAgbnVtYmVyID0gTWF0aC5hYnMobnVtYmVyKTtcblxuXG4gICAgICAgICAgICB2YXIgbGVmdE9mRGVjaW1hbCA9IGZvcm1hdFRYVDtcbiAgICAgICAgICAgIHZhciBkID0gbGVmdE9mRGVjaW1hbC5pbmRleE9mKCcuJyk7XG4gICAgICAgICAgICBpZiAoZCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgbGVmdE9mRGVjaW1hbCA9IGxlZnRPZkRlY2ltYWwuc3Vic3RyaW5nKDAsIGQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbm9ybWFsaXplZCA9IGxlZnRPZkRlY2ltYWwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IG5vcm1hbGl6ZWQubGFzdEluZGV4T2YoJ3MnKTtcbiAgICAgICAgICAgIHZhciBpc1Nob3J0Rm9ybWF0ID0gaW5kZXggPiAtMTtcblxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dENoYXIgPSBsZWZ0T2ZEZWNpbWFsLmNoYXJBdChpbmRleCArIDEpO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0Q2hhciA9PT0gJyAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzU2hvcnRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBsZWFkaW5nVGV4dCA9IGlzU2hvcnRGb3JtYXQgPyBmb3JtYXRUWFQuc3Vic3RyaW5nKDAsIGluZGV4KSA6ICcnO1xuICAgICAgICAgICAgdmFyIHJpZ2h0T2ZQcmVmaXggPSBpc1Nob3J0Rm9ybWF0ID8gZm9ybWF0VFhULnN1YnN0cihpbmRleCArIDEpIDogZm9ybWF0VFhULnN1YnN0cihpbmRleCk7XG5cbiAgICAgICAgICAgIC8vZmlyc3QgY2hlY2sgdG8gbWFrZSBzdXJlICdzJyBpcyBhY3R1YWxseSBzaG9ydCBmb3JtYXQgYW5kIG5vdCBwYXJ0IG9mIHNvbWUgbGVhZGluZyB0ZXh0XG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBzaG9ydEZvcm1hdFRlc3QgPSAvWzAtOSMqXS87XG4gICAgICAgICAgICAgICAgdmFyIHNob3J0Rm9ybWF0VGVzdFJlc3VsdCA9IHJpZ2h0T2ZQcmVmaXgubWF0Y2goc2hvcnRGb3JtYXRUZXN0KTtcbiAgICAgICAgICAgICAgICBpZiAoIXNob3J0Rm9ybWF0VGVzdFJlc3VsdCB8fCBzaG9ydEZvcm1hdFRlc3RSZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vbm8gc2hvcnQgZm9ybWF0IGNoYXJhY3RlcnMgc28gdGhpcyBtdXN0IGJlIGxlYWRpbmcgdGV4dCBpZS4gJ3dlZWtzICdcbiAgICAgICAgICAgICAgICAgICAgaXNTaG9ydEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBsZWFkaW5nVGV4dCA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9pZiAoZm9ybWF0VFhULmNoYXJBdCgwKSA9PSAncycpXG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWxTY2FsZSA9IG51bWJlciA9PT0gMCA/IDAgOiBNYXRoLmZsb29yKE1hdGgubG9nKE1hdGguYWJzKG51bWJlcikpIC8gKDMgKiBNYXRoLkxOMTApKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9ICgobnVtYmVyIC8gTWF0aC5wb3coMTAsIDMgKiB2YWxTY2FsZSkpIDwgMTAwMCkgPyB2YWxTY2FsZSA6ICh2YWxTY2FsZSArIDEpO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gTWF0aC5tYXgodmFsU2NhbGUsIDApO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gTWF0aC5taW4odmFsU2NhbGUsIDQpO1xuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAvIE1hdGgucG93KDEwLCAzICogdmFsU2NhbGUpO1xuICAgICAgICAgICAgICAgIC8vaWYgKCFpc05hTihOdW1iZXIoZm9ybWF0VFhULnN1YnN0cigxKSApICkgKVxuXG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihOdW1iZXIocmlnaHRPZlByZWZpeCkpICYmIHJpZ2h0T2ZQcmVmaXguaW5kZXhPZignLicpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGltaXREaWdpdHMgPSBOdW1iZXIocmlnaHRPZlByZWZpeCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudW1iZXIgPCBNYXRoLnBvdygxMCwgbGltaXREaWdpdHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgZ2V0RGlnaXRzKG51bWJlciwgTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHNpZ24gKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBNYXRoLnJvdW5kKG51bWJlcikgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyBzaWduICsgTWF0aC5yb3VuZChudW1iZXIpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cigxKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cihpbmRleCArIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgU1VGRklYID0gZ2V0U3VmZml4KGZvcm1hdFRYVCk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMCwgZm9ybWF0VFhULmxlbmd0aCAtIFNVRkZJWC5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxXaXRob3V0TGVhZGluZyA9IGZvcm1hdCgoKHNpZ24gPT09ICcnKSA/IDEgOiAtMSkgKiBudW1iZXIsIGZvcm1hdFRYVCkgKyBzY2FsZXNbdmFsU2NhbGVdICsgU1VGRklYO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkgJiYgc2lnbiAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbFdpdGhvdXRMZWFkaW5nID0gdmFsV2l0aG91dExlYWRpbmcuc3Vic3RyKHNpZ24ubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHZhbFdpdGhvdXRMZWFkaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN1YkZvcm1hdHMgPSBmb3JtYXRUWFQuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFscztcbiAgICAgICAgICAgIHZhciBtaW5EZWNpbWFscztcbiAgICAgICAgICAgIGlmIChzdWJGb3JtYXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IHN1YkZvcm1hdHNbMV0ubGVuZ3RoIC0gc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJ1swfCNdKycsICdnJyksICcnKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbWluRGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCcwKycsICdnJyksICcnKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gc3ViRm9ybWF0c1swXSArIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlY2ltYWxzID0gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZpeGVzVFhUID0gZm9ybWF0VFhULnNwbGl0KG5ldyBSZWdFeHAoJ1swfCx8I10rJywgJ2cnKSk7XG4gICAgICAgICAgICB2YXIgcHJlZmZpeCA9IGZpeGVzVFhUWzBdLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgc3VmZml4ID0gKGZpeGVzVFhULmxlbmd0aCA+IDEpID8gZml4ZXNUWFRbMV0udG9TdHJpbmcoKSA6ICcnO1xuXG4gICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAoKGZvcm1hdFRYVC5zcGxpdCgnJScpLmxlbmd0aCA+IDEpID8gMTAwIDogMSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgIGlmIChmb3JtYXRUWFQuaW5kZXhPZignJScpICE9PSAtMSkgbnVtYmVyID0gbnVtYmVyICogMTAwO1xuICAgICAgICAgICAgbnVtYmVyID0gcm91bmRUbyhudW1iZXIsIGRlY2ltYWxzKTtcblxuICAgICAgICAgICAgc2lnbiA9IChudW1iZXIgPT09IDApID8gJycgOiBzaWduO1xuXG4gICAgICAgICAgICB2YXIgaGFzQ29tbWFzID0gKGZvcm1hdFRYVC5zdWJzdHIoZm9ybWF0VFhULmxlbmd0aCAtIDQgLSBzdWZmaXgubGVuZ3RoLCAxKSA9PT0gJywnKTtcbiAgICAgICAgICAgIHZhciBmb3JtYXR0ZWQgPSBzaWduICsgcHJlZmZpeCArIGFkZERlY2ltYWxzKG51bWJlciwgZGVjaW1hbHMsIG1pbkRlY2ltYWxzLCBoYXNDb21tYXMpICsgc3VmZml4O1xuXG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2cob3JpZ2luYWxOdW1iZXIsIG9yaWdpbmFsRm9ybWF0LCBmb3JtYXR0ZWQpXG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9KCkpXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgczogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gdmFsICsgJyc7XG4gICAgfSxcblxuICAgIHVwcGVyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgIH0sXG4gICAgbG93ZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcbiAgICB0aXRsZUNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsID0gdmFsICsgJyc7XG4gICAgICAgIHJldHVybiB2YWwucmVwbGFjZSgvXFx3XFxTKi9nLCBmdW5jdGlvbiAodHh0KSB7cmV0dXJuIHR4dC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHR4dC5zdWJzdHIoMSkudG9Mb3dlckNhc2UoKTt9KTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmYXVsdEhhbmRsZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vbm8tb3AtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2luaXQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZm9yZWFjaC9kZWZhdWx0LWZvcmVhY2gtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvY2hlY2tib3gtcmFkaW8tYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9pbnB1dC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2NsYXNzLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL3Bvc2l0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vbmVnYXRpdmUtYm9vbGVhbi1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1hdHRyJylcbl07XG5cbnZhciBoYW5kbGVyc0xpc3QgPSBbXTtcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgIGlmICghbm9kZU1hdGNoZXIpIHtcbiAgICAgICAgbm9kZU1hdGNoZXIgPSAnKic7XG4gICAgfVxuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gJC5leHRlbmQoaGFuZGxlciwgeyB0ZXN0OiBhdHRyaWJ1dGVNYXRjaGVyLCB0YXJnZXQ6IG5vZGVNYXRjaGVyIH0pO1xufTtcblxuJC5lYWNoKGRlZmF1bHRIYW5kbGVycywgZnVuY3Rpb24gKGluZGV4LCBoYW5kbGVyKSB7XG4gICAgaGFuZGxlcnNMaXN0LnB1c2gobm9ybWFsaXplKGhhbmRsZXIudGVzdCwgaGFuZGxlci50YXJnZXQsIGhhbmRsZXIpKTtcbn0pO1xuXG5cbnZhciBtYXRjaEF0dHIgPSBmdW5jdGlvbiAobWF0Y2hFeHByLCBhdHRyLCAkZWwpIHtcbiAgICB2YXIgYXR0ck1hdGNoO1xuXG4gICAgaWYgKF8uaXNTdHJpbmcobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBhdHRyLnRvTG93ZXJDYXNlKCkpKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihtYXRjaEV4cHIpKSB7XG4gICAgICAgIC8vVE9ETzogcmVtb3ZlIGVsZW1lbnQgc2VsZWN0b3JzIGZyb20gYXR0cmlidXRlc1xuICAgICAgICBhdHRyTWF0Y2ggPSBtYXRjaEV4cHIoYXR0ciwgJGVsKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSBhdHRyLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgfVxuICAgIHJldHVybiBhdHRyTWF0Y2g7XG59O1xuXG52YXIgbWF0Y2hOb2RlID0gZnVuY3Rpb24gKHRhcmdldCwgbm9kZUZpbHRlcikge1xuICAgIHJldHVybiAoXy5pc1N0cmluZyhub2RlRmlsdGVyKSkgPyAobm9kZUZpbHRlciA9PT0gdGFyZ2V0KSA6IG5vZGVGaWx0ZXIuaXModGFyZ2V0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGhhbmRsZXJzTGlzdCxcbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgYXR0cmlidXRlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd8ZnVuY3Rpb258cmVnZXh9IGF0dHJpYnV0ZU1hdGNoZXIgRGVzY3JpcHRpb24gb2Ygd2hpY2ggYXR0cmlidXRlcyB0byBtYXRjaFxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gbm9kZU1hdGNoZXIgICAgICBXaGljaCBub2RlcyB0byBhbGwgYXR0cmlidXRlcyB0by4gVXNlIGpxdWVyeSBTZWxlY3RvciBzeW50YXhcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbnxvYmplY3R9IGhhbmRsZXIgICAgSGFuZGxlciBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24gKFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aXRoICRlbGVtZW50IGFzIGNvbnRleHQsIGFuZCBhdHRyaWJ1dGUgdmFsdWUgKyBuYW1lKSwgb3IgYW4gb2JqZWN0IHdpdGgge2luaXQ6IGZuLCAgaGFuZGxlOiBmbn0uIFRoZSBpbml0IGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW4gcGFnZSBsb2FkczsgdXNlIHRoaXMgdG8gZGVmaW5lIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVyc0xpc3QudW5zaGlmdChub3JtYWxpemUuYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZpbmQgYW4gYXR0cmlidXRlIG1hdGNoZXIgbWF0Y2hpbmcgc29tZSBjcml0ZXJpYVxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gYXR0ckZpbHRlciBhdHRyaWJ1dGUgdG8gbWF0Y2hcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmcgfCAkZWx9IG5vZGVGaWx0ZXIgbm9kZSB0byBtYXRjaFxuICAgICAqIEByZXR1cm4ge2FycmF5fG51bGx9XG4gICAgICovXG4gICAgZmlsdGVyOiBmdW5jdGlvbiAoYXR0ckZpbHRlciwgbm9kZUZpbHRlcikge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSBfLnNlbGVjdChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hBdHRyKGhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobm9kZUZpbHRlcikge1xuICAgICAgICAgICAgZmlsdGVyZWQgPSBfLnNlbGVjdChmaWx0ZXJlZCwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hOb2RlKGhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2goaGFuZGxlcnNMaXN0LCBmdW5jdGlvbiAoY3VycmVudEhhbmRsZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEF0dHIoY3VycmVudEhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcikgJiYgbWF0Y2hOb2RlKGN1cnJlbnRIYW5kbGVyLnRhcmdldCwgbm9kZUZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaGFuZGxlcnNMaXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpKTtcbiAgICB9LFxuXG4gICAgZ2V0SGFuZGxlcjogZnVuY3Rpb24gKHByb3BlcnR5LCAkZWwpIHtcbiAgICAgICAgdmFyIGZpbHRlcmVkID0gdGhpcy5maWx0ZXIocHJvcGVydHksICRlbCk7XG4gICAgICAgIC8vVGhlcmUgY291bGQgYmUgbXVsdGlwbGUgbWF0Y2hlcywgYnV0IHRoZSB0b3AgZmlyc3QgaGFzIHRoZSBtb3N0IHByaW9yaXR5XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZFswXTtcbiAgICB9XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnOmNoZWNrYm94LDpyYWRpbycsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2V0dGFibGVWYWx1ZSA9IHRoaXMuYXR0cigndmFsdWUnKTsgLy9pbml0aWFsIHZhbHVlXG4gICAgICAgIC8qanNsaW50IGVxZXE6IHRydWUqL1xuICAgICAgICB2YXIgaXNDaGVja2VkID0gKHNldHRhYmxlVmFsdWUgIT09IHVuZGVmaW5lZCkgPyAoc2V0dGFibGVWYWx1ZSA9PSB2YWx1ZSkgOiAhIXZhbHVlO1xuICAgICAgICB0aGlzLnByb3AoJ2NoZWNrZWQnLCBpc0NoZWNrZWQpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB2YXIgb2xkSFRNTCA9IHRoaXMuaHRtbCgpO1xuICAgICAgICB2YXIgY2xlYW5lZEhUTUwgPSBvbGRIVE1MLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgIHZhciB2YWx1ZVRvVGVtcGxhdGUgPSAoJC5pc1BsYWluT2JqZWN0KHZhbHVlKSkgPyB2YWx1ZSA6IHsgdmFsdWU6IHZhbHVlIH07XG4gICAgICAgIHZhciB0ZW1wbGF0ZWQgPSBfLnRlbXBsYXRlKGNsZWFuZWRIVE1MLCB2YWx1ZVRvVGVtcGxhdGUpO1xuICAgICAgICBpZiAoY2xlYW5lZEhUTUwgPT09IHRlbXBsYXRlZCkge1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5odG1sKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnaW5wdXQsIHNlbGVjdCcsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZhbCh2YWx1ZSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnY2xhc3MnLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhZGRlZENsYXNzZXMgPSB0aGlzLmRhdGEoJ2FkZGVkLWNsYXNzZXMnKTtcbiAgICAgICAgaWYgKCFhZGRlZENsYXNzZXMpIHtcbiAgICAgICAgICAgIGFkZGVkQ2xhc3NlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChhZGRlZENsYXNzZXNbcHJvcF0pIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoYWRkZWRDbGFzc2VzW3Byb3BdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSAndmFsdWUtJyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGFkZGVkQ2xhc3Nlc1twcm9wXSA9IHZhbHVlO1xuICAgICAgICAvL0ZpeG1lOiBwcm9wIGlzIGFsd2F5cyBcImNsYXNzXCJcbiAgICAgICAgdGhpcy5hZGRDbGFzcyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycsIGFkZGVkQ2xhc3Nlcyk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnKicsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWx1ZSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24tJykgPT09IDApO1xuICAgIH0sXG5cbiAgICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHRoaXMub2ZmKGF0dHIpO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24tJywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB0aGlzLm9mZihhdHRyKS5vbihhdHRyLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGZuTmFtZSwgcGFyYW1zOiBhcmdzIH07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWUudHJpZ2dlcignZi51aS5vcGVyYXRlJywgeyBvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWUgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi1pbml0JykgPT09IDApO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24taW5pdCcsICcnKTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgJChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGZuTmFtZSwgcGFyYW1zOiBhcmdzIH07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWUudHJpZ2dlcignZi51aS5vcGVyYXRlJywgeyBvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWUgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi91dGlscy9wYXJzZS11dGlscycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnZm9yZWFjaCcsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHZhbHVlID0gKCQuaXNQbGFpbk9iamVjdCh2YWx1ZSkgPyB2YWx1ZSA6IFtdLmNvbmNhdCh2YWx1ZSkpO1xuICAgICAgICB2YXIgJGxvb3BUZW1wbGF0ZSA9IHRoaXMuZGF0YSgnZm9yZWFjaC10ZW1wbGF0ZScpO1xuICAgICAgICBpZiAoISRsb29wVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICRsb29wVGVtcGxhdGUgPSB0aGlzLmNoaWxkcmVuKCk7XG4gICAgICAgICAgICB0aGlzLmRhdGEoJ2ZvcmVhY2gtdGVtcGxhdGUnLCAkbG9vcFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgJG1lID0gdGhpcy5lbXB0eSgpO1xuICAgICAgICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uIChkYXRhdmFsLCBkYXRha2V5KSB7XG4gICAgICAgICAgICBkYXRhdmFsID0gZGF0YXZhbCArICcnO1xuICAgICAgICAgICAgdmFyIG5vZGVzID0gJGxvb3BUZW1wbGF0ZS5jbG9uZSgpO1xuICAgICAgICAgICAgbm9kZXMuZWFjaChmdW5jdGlvbiAoaSwgbmV3Tm9kZSkge1xuICAgICAgICAgICAgICAgIG5ld05vZGUgPSAkKG5ld05vZGUpO1xuICAgICAgICAgICAgICAgIF8uZWFjaChuZXdOb2RlLmRhdGEoKSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZWQgPSAgXy50ZW1wbGF0ZSh2YWwsIHsgdmFsdWU6IGRhdGF2YWwsIGluZGV4OiBkYXRha2V5LCBrZXk6IGRhdGFrZXkgfSk7XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUuZGF0YShrZXksIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodGVtcGxhdGVkKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIG9sZEhUTUwgPSBuZXdOb2RlLmh0bWwoKTtcbiAgICAgICAgICAgICAgICB2YXIgY2xlYW5lZEhUTUwgPSBvbGRIVE1MLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlZCA9IF8udGVtcGxhdGUoY2xlYW5lZEhUTUwsIHsgdmFsdWU6IGRhdGF2YWwsIGtleTogZGF0YWtleSwgaW5kZXg6IGRhdGFrZXkgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGNsZWFuZWRIVE1MID09PSB0ZW1wbGF0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5odG1sKGRhdGF2YWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkbWUuYXBwZW5kKG5ld05vZGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmRpc2FibGVkfGhpZGRlbnxyZWFkb25seSkkL2ksXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByb3AocHJvcCwgIXZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBBdHRyaWJ1dGVzIHdoaWNoIGFyZSBqdXN0IHBhcmFtZXRlcnMgdG8gb3RoZXJzIGFuZCBjYW4ganVzdCBiZSBpZ25vcmVkXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzptb2RlbHxjb252ZXJ0KSQvaSxcblxuICAgIGhhbmRsZTogJC5ub29wLFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmNoZWNrZWR8c2VsZWN0ZWR8YXN5bmN8YXV0b2ZvY3VzfGF1dG9wbGF5fGNvbnRyb2xzfGRlZmVyfGlzbWFwfGxvb3B8bXVsdGlwbGV8b3BlbnxyZXF1aXJlZHxzY29wZWQpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciB2YWwgPSAodGhpcy5hdHRyKCd2YWx1ZScpKSA/ICh2YWx1ZSA9PSB0aGlzLnByb3AoJ3ZhbHVlJykpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbCk7XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG4gICAgdmFyIG5vZGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9ub2Rlcy9ub2RlLW1hbmFnZXInKTtcbiAgICB2YXIgYXR0ck1hbmFnZXIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXMvYXR0cmlidXRlLW1hbmFnZXInKTtcbiAgICB2YXIgY29udmVydGVyTWFuYWdlciA9IHJlcXVpcmUoJy4uL2NvbnZlcnRlcnMvY29udmVydGVyLW1hbmFnZXInKTtcblxuICAgIHZhciBwYXJzZVV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvcGFyc2UtdXRpbHMnKTtcbiAgICB2YXIgZG9tVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9kb20nKTtcblxuICAgIHZhciBhdXRvVXBkYXRlUGx1Z2luID0gcmVxdWlyZSgnLi9wbHVnaW5zL2F1dG8tdXBkYXRlLWJpbmRpbmdzJyk7XG5cbiAgICAvL0pxdWVyeSBzZWxlY3RvciB0byByZXR1cm4gZXZlcnl0aGluZyB3aGljaCBoYXMgYSBmLSBwcm9wZXJ0eSBzZXRcbiAgICAkLmV4cHJbJzonXVtjb25maWcucHJlZml4XSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyICR0aGlzID0gJChvYmopO1xuICAgICAgICB2YXIgZGF0YXByb3BzID0gXy5rZXlzKCR0aGlzLmRhdGEoKSk7XG5cbiAgICAgICAgdmFyIG1hdGNoID0gXy5maW5kKGRhdGFwcm9wcywgZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKGNvbmZpZy5wcmVmaXgpID09PSAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuICEhKG1hdGNoKTtcbiAgICB9O1xuXG4gICAgJC5leHByWyc6J10ud2ViY29tcG9uZW50ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqLm5vZGVOYW1lLmluZGV4T2YoJy0nKSAhPT0gLTE7XG4gICAgfTtcblxuICAgIHZhciBnZXRNYXRjaGluZ0VsZW1lbnRzID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgdmFyICRyb290ID0gJChyb290KTtcbiAgICAgICAgdmFyIG1hdGNoZWRFbGVtZW50cyA9ICRyb290LmZpbmQoJzonICsgY29uZmlnLnByZWZpeCk7XG4gICAgICAgIGlmICgkcm9vdC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgbWF0Y2hlZEVsZW1lbnRzID0gbWF0Y2hlZEVsZW1lbnRzLmFkZCgkcm9vdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hdGNoZWRFbGVtZW50cztcbiAgICB9O1xuXG4gICAgdmFyIGdldEVsZW1lbnRPckVycm9yID0gZnVuY3Rpb24gKGVsZW1lbnQsIGNvbnRleHQpIHtcbiAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiAkKSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5nZXQoMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFlbGVtZW50IHx8ICFlbGVtZW50Lm5vZGVOYW1lKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGNvbnRleHQsICdFeHBlY3RlZCB0byBnZXQgRE9NIEVsZW1lbnQsIGdvdCAnLCBlbGVtZW50KTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihjb250ZXh0ICsgJzogRXhwZWN0ZWQgdG8gZ2V0IERPTSBFbGVtZW50LCBnb3QnICsgKHR5cGVvZiBlbGVtZW50KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG5cbiAgICAgICAgbm9kZXM6IG5vZGVNYW5hZ2VyLFxuICAgICAgICBhdHRyaWJ1dGVzOiBhdHRyTWFuYWdlcixcbiAgICAgICAgY29udmVydGVyczogY29udmVydGVyTWFuYWdlcixcbiAgICAgICAgLy91dGlscyBmb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBtYXRjaGVkRWxlbWVudHM6IFtdXG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5iaW5kRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQsIGNoYW5uZWwpIHtcbiAgICAgICAgICAgIGlmICghY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgIGNoYW5uZWwgPSB0aGlzLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtZW50ID0gZ2V0RWxlbWVudE9yRXJyb3IoZWxlbWVudCk7XG4gICAgICAgICAgICB2YXIgJGVsID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGlmICghJGVsLmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cyA9IF8ud2l0aG91dCh0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzLCBlbGVtZW50KTtcblxuICAgICAgICAgICAgLy9GSVhNRTogaGF2ZSB0byByZWFkZCBldmVudHMgdG8gYmUgYWJsZSB0byByZW1vdmUgdGhlbS4gVWdseVxuICAgICAgICAgICAgdmFyIEhhbmRsZXIgPSBub2RlTWFuYWdlci5nZXRIYW5kbGVyKCRlbCk7XG4gICAgICAgICAgICB2YXIgaCA9IG5ldyBIYW5kbGVyLmhhbmRsZSh7XG4gICAgICAgICAgICAgICAgZWw6IGVsZW1lbnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGgucmVtb3ZlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaC5yZW1vdmVFdmVudHMoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJChlbGVtZW50LmF0dHJpYnV0ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBub2RlTWFwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBub2RlTWFwLm5vZGVOYW1lO1xuICAgICAgICAgICAgICAgIHZhciB3YW50ZWRQcmVmaXggPSAnZGF0YS1mLSc7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIuaW5kZXhPZih3YW50ZWRQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2Uod2FudGVkUHJlZml4LCAnJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKGF0dHIsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyLnN0b3BMaXN0ZW5pbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuc3RvcExpc3RlbmluZy5jYWxsKCRlbCwgYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHN1YnNpZCA9ICRlbC5kYXRhKCdmLXN1YnNjcmlwdGlvbi1pZCcpIHx8IFtdO1xuICAgICAgICAgICAgXy5lYWNoKHN1YnNpZCwgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsLnVuc3Vic2NyaWJlKHN1YnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYmluZEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50LCBjaGFubmVsKSB7XG4gICAgICAgICAgICBpZiAoIWNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsID0gdGhpcy5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbWVudCA9IGdldEVsZW1lbnRPckVycm9yKGVsZW1lbnQpO1xuICAgICAgICAgICAgdmFyICRlbCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoISRlbC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghXy5jb250YWlucyh0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzLCBlbGVtZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9TZW5kIHRvIG5vZGUgbWFuYWdlciB0byBoYW5kbGUgdWkgY2hhbmdlc1xuICAgICAgICAgICAgdmFyIEhhbmRsZXIgPSBub2RlTWFuYWdlci5nZXRIYW5kbGVyKCRlbCk7XG4gICAgICAgICAgICBuZXcgSGFuZGxlci5oYW5kbGUoe1xuICAgICAgICAgICAgICAgIGVsOiBlbGVtZW50XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHN1YnNjcmliZSA9IGZ1bmN0aW9uIChjaGFubmVsLCB2YXJzVG9CaW5kLCAkZWwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXZhcnNUb0JpbmQgfHwgIXZhcnNUb0JpbmQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHN1YnNpZCA9IGNoYW5uZWwuc3Vic2NyaWJlKHZhcnNUb0JpbmQsICRlbCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld3N1YnMgPSAoJGVsLmRhdGEoJ2Ytc3Vic2NyaXB0aW9uLWlkJykgfHwgW10pLmNvbmNhdChzdWJzaWQpO1xuICAgICAgICAgICAgICAgICRlbC5kYXRhKCdmLXN1YnNjcmlwdGlvbi1pZCcsIG5ld3N1YnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGF0dHJCaW5kaW5ncyA9IFtdO1xuICAgICAgICAgICAgdmFyIG5vbkJhdGNoYWJsZVZhcmlhYmxlcyA9IFtdO1xuICAgICAgICAgICAgLy9OT1RFOiBsb29waW5nIHRocm91Z2ggYXR0cmlidXRlcyBpbnN0ZWFkIG9mIC5kYXRhIGJlY2F1c2UgLmRhdGEgYXV0b21hdGljYWxseSBjYW1lbGNhc2VzIHByb3BlcnRpZXMgYW5kIG1ha2UgaXQgaGFyZCB0byByZXRydmlldmVcbiAgICAgICAgICAgICQoZWxlbWVudC5hdHRyaWJ1dGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbm9kZU1hcCkge1xuICAgICAgICAgICAgICAgIHZhciBhdHRyID0gbm9kZU1hcC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9IG5vZGVNYXAudmFsdWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgd2FudGVkUHJlZml4ID0gJ2RhdGEtZi0nO1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLmluZGV4T2Yod2FudGVkUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKHdhbnRlZFByZWZpeCwgJycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihhdHRyLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXNCaW5kYWJsZUF0dHIgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmluaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQmluZGFibGVBdHRyID0gaGFuZGxlci5pbml0LmNhbGwoJGVsLCBhdHRyLCBhdHRyVmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0JpbmRhYmxlQXR0cikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9Db252ZXJ0IHBpcGVzIHRvIGNvbnZlcnRlciBhdHRyc1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpdGhDb252ID0gXy5pbnZva2UoYXR0clZhbC5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpdGhDb252Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyVmFsID0gd2l0aENvbnYuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGF0YSgnZi1jb252ZXJ0LScgKyBhdHRyLCB3aXRoQ29udik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiaW5kaW5nID0geyBhdHRyOiBhdHRyIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29tbWFSZWdleCA9IC8sKD8hW15cXFtdKlxcXSkvO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJWYWwuaW5kZXhPZignPCUnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0Fzc3VtZSBpdCdzIHRlbXBsYXRlZCBmb3IgbGF0ZXIgdXNlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXR0clZhbC5zcGxpdChjb21tYVJlZ2V4KS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhcnNUb0JpbmQgPSBfLmludm9rZShhdHRyVmFsLnNwbGl0KGNvbW1hUmVnZXgpLCAndHJpbScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZShjaGFubmVsLCB2YXJzVG9CaW5kLCAkZWwsIHsgYmF0Y2g6IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZGluZy50b3BpY3MgPSB2YXJzVG9CaW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaW5kaW5nLnRvcGljcyA9IFthdHRyVmFsXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub25CYXRjaGFibGVWYXJpYWJsZXMucHVzaChhdHRyVmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJCaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZWwuZGF0YSgnYXR0ci1iaW5kaW5ncycsIGF0dHJCaW5kaW5ncyk7XG4gICAgICAgICAgICBpZiAobm9uQmF0Y2hhYmxlVmFyaWFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdzdWJzY3JpYmUnLCBub25CYXRjaGFibGVWYXJpYWJsZXMsICRlbC5nZXQoMCkpXG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlKGNoYW5uZWwsIG5vbkJhdGNoYWJsZVZhcmlhYmxlcywgJGVsLCB7IGJhdGNoOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQmluZCBhbGwgcHJvdmlkZWQgZWxlbWVudHNcbiAgICAgICAgICogQHBhcmFtICB7QXJyYXl8alF1ZXJ5U2VsZWN0b3J9IGVsZW1lbnRzVG9CaW5kIChPcHRpb25hbCkgSWYgbm90IHByb3ZpZGVkIHVzZXMgdGhlIGRlZmF1bHQgcm9vdCBwcm92aWRlZCBhdCBpbml0aWFsaXphdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgYmluZEFsbDogZnVuY3Rpb24gKGVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHNUb0JpbmQgPSBnZXRNYXRjaGluZ0VsZW1lbnRzKHRoaXMub3B0aW9ucy5yb290KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheShlbGVtZW50c1RvQmluZCkpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvQmluZCA9IGdldE1hdGNoaW5nRWxlbWVudHMoZWxlbWVudHNUb0JpbmQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgLy9wYXJzZSB0aHJvdWdoIGRvbSBhbmQgZmluZCBldmVyeXRoaW5nIHdpdGggbWF0Y2hpbmcgYXR0cmlidXRlc1xuICAgICAgICAgICAgJC5lYWNoKGVsZW1lbnRzVG9CaW5kLCBmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBtZS5iaW5kRWxlbWVudC5jYWxsKG1lLCBlbGVtZW50LCBtZS5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogVW5iaW5kIHByb3ZpZGVkIGVsZW1lbnRzXG4gICAgICAgICAqIEBwYXJhbSAge0FycmF5fSBlbGVtZW50c1RvVW5iaW5kIChPcHRpb25hbCkuIElmIG5vdCBwcm92aWRlZCB1bmJpbmRzIGV2ZXJ5dGhpbmdcbiAgICAgICAgICovXG4gICAgICAgIHVuYmluZEFsbDogZnVuY3Rpb24gKGVsZW1lbnRzVG9VbmJpbmQpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzVG9VbmJpbmQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvVW5iaW5kID0gdGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQuZWFjaChlbGVtZW50c1RvVW5iaW5kLCBmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBtZS51bmJpbmRFbGVtZW50LmNhbGwobWUsIGVsZW1lbnQsIG1lLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICByb290OiAnYm9keScsXG4gICAgICAgICAgICAgICAgY2hhbm5lbDogbnVsbCxcbiAgICAgICAgICAgICAgICBwbHVnaW5zOiB7fVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICQuZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBkZWZhdWx0cy5jaGFubmVsO1xuXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSBkZWZhdWx0cztcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZhciAkcm9vdCA9ICQoZGVmYXVsdHMucm9vdCk7XG4gICAgICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBtZS5iaW5kQWxsKCk7XG4gICAgICAgICAgICAgICAgJHJvb3QudHJpZ2dlcignZi5kb21yZWFkeScpO1xuXG4gICAgICAgICAgICAgICAgLy9BdHRhY2ggbGlzdGVuZXJzXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciBjaGFuZ2VzIHRvIHVpIGFuZCBwdWJsaXNoIHRvIGFwaVxuICAgICAgICAgICAgICAgICRyb290Lm9mZihjb25maWcuZXZlbnRzLnRyaWdnZXIpLm9uKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyc2VkRGF0YSA9IHt9OyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcblxuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gIGRvbVV0aWxzLmdldENvbnZlcnRlcnNMaXN0KCRlbCwgJ2JpbmQnKTtcblxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXkgPSBrZXkuc3BsaXQoJ3wnKVswXS50cmltKCk7IC8vaW4gY2FzZSB0aGUgcGlwZSBmb3JtYXR0aW5nIHN5bnRheCB3YXMgdXNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gY29udmVydGVyTWFuYWdlci5wYXJzZSh2YWwsIGF0dHJDb252ZXJ0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGFba2V5XSA9IHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodmFsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsLnRyaWdnZXIoJ2YuY29udmVydCcsIHsgYmluZDogdmFsIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLnZhcmlhYmxlcy5wdWJsaXNoKHBhcnNlZERhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciBjaGFuZ2VzIGZyb20gYXBpIGFuZCB1cGRhdGUgdWlcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy5yZWFjdCkub24oY29uZmlnLmV2ZW50cy5yZWFjdCwgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhldnQudGFyZ2V0LCBkYXRhLCBcInJvb3Qgb25cIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmluZGluZ3MgPSAkZWwuZGF0YSgnYXR0ci1iaW5kaW5ncycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0b2NvbnZlcnQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2goYmluZGluZ3MsIGZ1bmN0aW9uIChiaW5kaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uY29udGFpbnMoYmluZGluZy50b3BpY3MsIHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJpbmRpbmcudG9waWNzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvY29udmVydFtiaW5kaW5nLmF0dHJdID0gXy5waWNrKGRhdGEsIGJpbmRpbmcudG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvY29udmVydFtiaW5kaW5nLmF0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICRlbC50cmlnZ2VyKCdmLmNvbnZlcnQnLCB0b2NvbnZlcnQpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gZGF0YSA9IHtwcm9wdG91cGRhdGU6IHZhbHVlfSB8fCBqdXN0IGEgdmFsdWUgKGFzc3VtZXMgJ2JpbmQnIGlmIHNvKVxuICAgICAgICAgICAgICAgICRyb290Lm9mZignZi5jb252ZXJ0Jykub24oJ2YuY29udmVydCcsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKHZhbCwgcHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHByb3AudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICBkb21VdGlscy5nZXRDb252ZXJ0ZXJzTGlzdCgkZWwsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKHByb3AsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydGVkVmFsdWUgPSBjb252ZXJ0ZXJNYW5hZ2VyLmNvbnZlcnQodmFsLCBhdHRyQ29udmVydGVycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLmhhbmRsZS5jYWxsKCRlbCwgY29udmVydGVkVmFsdWUsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLCBjb252ZXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnQoZGF0YSwgJ2JpbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLnVpLm9wZXJhdGUnKS5vbignZi51aS5vcGVyYXRlJywgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gJC5leHRlbmQodHJ1ZSwge30sIGRhdGEpOyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEub3BlcmF0aW9ucywgZnVuY3Rpb24gKG9wbikge1xuICAgICAgICAgICAgICAgICAgICAgICBvcG4ucGFyYW1zID0gXy5tYXAob3BuLnBhcmFtcywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUoJC50cmltKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1lLm9wdGlvbnMucGx1Z2lucy5hdXRvVXBkYXRlQmluZGluZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgYXV0b1VwZGF0ZVBsdWdpbigkcm9vdC5nZXQoMCksIG1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn0oKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBleHRlbmQgPSBmdW5jdGlvbiAocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgY2hpbGQ7XG5cbiAgICAvLyBUaGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHRoZSBuZXcgc3ViY2xhc3MgaXMgZWl0aGVyIGRlZmluZWQgYnkgeW91XG4gICAgLy8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG4gICAgLy8gYnkgdXMgdG8gc2ltcGx5IGNhbGwgdGhlIHBhcmVudCdzIGNvbnN0cnVjdG9yLlxuICAgIGlmIChwcm90b1Byb3BzICYmIF8uaGFzKHByb3RvUHJvcHMsICdjb25zdHJ1Y3RvcicpKSB7XG4gICAgICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9O1xuICAgIH1cblxuICAgIC8vIEFkZCBzdGF0aWMgcHJvcGVydGllcyB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24sIGlmIHN1cHBsaWVkLlxuICAgIF8uZXh0ZW5kKGNoaWxkLCBwYXJlbnQsIHN0YXRpY1Byb3BzKTtcblxuICAgIC8vIFNldCB0aGUgcHJvdG90eXBlIGNoYWluIHRvIGluaGVyaXQgZnJvbSBgcGFyZW50YCwgd2l0aG91dCBjYWxsaW5nXG4gICAgLy8gYHBhcmVudGAncyBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICB2YXIgU3Vycm9nYXRlID0gZnVuY3Rpb24gKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH07XG4gICAgU3Vycm9nYXRlLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgY2hpbGQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZSgpO1xuXG4gICAgLy8gQWRkIHByb3RvdHlwZSBwcm9wZXJ0aWVzIChpbnN0YW5jZSBwcm9wZXJ0aWVzKSB0byB0aGUgc3ViY2xhc3MsXG4gICAgLy8gaWYgc3VwcGxpZWQuXG4gICAgaWYgKHByb3RvUHJvcHMpIHtcbiAgICAgICAgXy5leHRlbmQoY2hpbGQucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgYSBjb252ZW5pZW5jZSBwcm9wZXJ0eSBpbiBjYXNlIHRoZSBwYXJlbnQncyBwcm90b3R5cGUgaXMgbmVlZGVkXG4gICAgLy8gbGF0ZXIuXG4gICAgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblxuICAgIHJldHVybiBjaGlsZDtcbn07XG5cbnZhciBWaWV3ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbCA9IChvcHRpb25zLiRlbCkgfHwgJChvcHRpb25zLmVsKTtcbiAgICB0aGlzLmVsID0gb3B0aW9ucy5lbDtcbiAgICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxufTtcblxuXy5leHRlbmQoVmlldy5wcm90b3R5cGUsIHtcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7fSxcbn0pO1xuXG5WaWV3LmV4dGVuZCA9IGV4dGVuZDtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2NvbmZpZycpO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtdLFxuXG4gICAgdWlDaGFuZ2VFdmVudDogJ2NoYW5nZScsXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwudmFsKCk7XG4gICAgfSxcblxuICAgIHJlbW92ZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLiRlbC5vZmYodGhpcy51aUNoYW5nZUV2ZW50KTtcbiAgICB9LFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB2YXIgcHJvcE5hbWUgPSB0aGlzLiRlbC5kYXRhKGNvbmZpZy5iaW5kZXJBdHRyKTtcblxuICAgICAgICBpZiAocHJvcE5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLm9mZih0aGlzLnVpQ2hhbmdlRXZlbnQpLm9uKHRoaXMudWlDaGFuZ2VFdmVudCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBtZS5nZXRVSVZhbHVlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgcGFyYW1zW3Byb3BOYW1lXSA9IHZhbDtcblxuICAgICAgICAgICAgICAgIG1lLiRlbC50cmlnZ2VyKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgcGFyYW1zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJ2lucHV0LCBzZWxlY3QnIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtcblxuICAgIF0sXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJyonIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuXG4gICAgcHJvcGVydHlIYW5kbGVyczogW1xuXG4gICAgXSxcblxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbCA9IHRoaXMuJGVsO1xuICAgICAgICAvL1RPRE86IGZpbGUgYSBpc3N1ZSBmb3IgdGhlIHZlbnNpbSBtYW5hZ2VyIHRvIGNvbnZlcnQgdHJ1ZXMgdG8gMXMgYW5kIHNldCB0aGlzIHRvIHRydWUgYW5kIGZhbHNlXG5cbiAgICAgICAgdmFyIG9mZlZhbCA9ICAoJGVsLmRhdGEoJ2Ytb2ZmJykgIT09IHVuZGVmaW5lZCkgPyAkZWwuZGF0YSgnZi1vZmYnKSA6IDA7XG4gICAgICAgIC8vYXR0ciA9IGluaXRpYWwgdmFsdWUsIHByb3AgPSBjdXJyZW50IHZhbHVlXG4gICAgICAgIHZhciBvblZhbCA9ICgkZWwuYXR0cigndmFsdWUnKSAhPT0gdW5kZWZpbmVkKSA/ICRlbC5wcm9wKCd2YWx1ZScpOiAxO1xuXG4gICAgICAgIHZhciB2YWwgPSAoJGVsLmlzKCc6Y2hlY2tlZCcpKSA/IG9uVmFsIDogb2ZmVmFsO1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICc6Y2hlY2tib3gsOnJhZGlvJyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHNlbGVjdG9yID0gJyonO1xuICAgIH1cbiAgICBoYW5kbGVyLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgcmV0dXJuIGhhbmRsZXI7XG59O1xuXG52YXIgbWF0Y2ggPSBmdW5jdGlvbiAodG9NYXRjaCwgbm9kZSkge1xuICAgIGlmIChfLmlzU3RyaW5nKHRvTWF0Y2gpKSB7XG4gICAgICAgIHJldHVybiB0b01hdGNoID09PSBub2RlLnNlbGVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAkKHRvTWF0Y2gpLmlzKG5vZGUuc2VsZWN0b3IpO1xuICAgIH1cbn07XG5cbnZhciBub2RlTWFuYWdlciA9IHtcbiAgICBsaXN0OiBbXSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBub2RlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IHNlbGVjdG9yIGpRdWVyeS1jb21wYXRpYmxlIHNlbGVjdG9yIHRvIHVzZSB0byBtYXRjaCBub2Rlc1xuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyICBIYW5kbGVycyBhcmUgbmV3LWFibGUgZnVuY3Rpb25zLiBUaGV5IHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsIGFzIGNvbnRleHQuPyBUT0RPOiBUaGluayB0aGlzIHRocm91Z2hcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMubGlzdC51bnNoaWZ0KG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2goc2VsZWN0b3IsIG5vZGUpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24gKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGN1cnJlbnRIYW5kbGVyLnNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH1cbn07XG5cbi8vYm9vdHN0cmFwc1xudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL2lucHV0LWNoZWNrYm94LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJylcbl07XG5fLmVhY2goZGVmYXVsdEhhbmRsZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICBub2RlTWFuYWdlci5yZWdpc3RlcihoYW5kbGVyLnNlbGVjdG9yLCBoYW5kbGVyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vZGVNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0YXJnZXQsIGRvbU1hbmFnZXIpIHtcbiAgICBpZiAoIXdpbmRvdy5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYW4gb2JzZXJ2ZXIgaW5zdGFuY2VcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAobXV0YXRpb25zKSB7XG4gICAgICBtdXRhdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAobXV0YXRpb24pIHtcbiAgICAgICAgdmFyIGFkZGVkID0gJChtdXRhdGlvbi5hZGRlZE5vZGVzKS5maW5kKCc6ZicpO1xuICAgICAgICBhZGRlZCA9IGFkZGVkLmFkZCgkKG11dGF0aW9uLmFkZGVkTm9kZXMpLmZpbHRlcignOmYnKSk7XG5cbiAgICAgICAgdmFyIHJlbW92ZWQgPSAkKG11dGF0aW9uLnJlbW92ZWROb2RlcykuZmluZCgnOmYnKTtcbiAgICAgICAgcmVtb3ZlZCA9IHJlbW92ZWQuYWRkKCQobXV0YXRpb24ucmVtb3ZlZE5vZGVzKS5maWx0ZXIoJzpmJykpO1xuXG4gICAgICAgIGlmIChhZGRlZCAmJiBhZGRlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGlvbiBvYnNlcnZlciBhZGRlZCcsIGFkZGVkLmdldCgpLCBtdXRhdGlvbi5hZGRlZE5vZGVzKTtcbiAgICAgICAgICAgIGRvbU1hbmFnZXIuYmluZEFsbChhZGRlZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbW92ZWQgJiYgcmVtb3ZlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGlvbiBvYnNlcnZlciByZW1vdmVkJywgcmVtb3ZlZCk7XG4gICAgICAgICAgICBkb21NYW5hZ2VyLnVuYmluZEFsbChyZW1vdmVkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbXV0Y29uZmlnID0ge1xuICAgICAgICBhdHRyaWJ1dGVzOiBmYWxzZSxcbiAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgICAgICBjaGFyYWN0ZXJEYXRhOiBmYWxzZVxuICAgIH07XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXQsIG11dGNvbmZpZyk7XG4gICAgLy8gTGF0ZXIsIHlvdSBjYW4gc3RvcCBvYnNlcnZpbmdcbiAgICAvLyBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZG9tTWFuYWdlciA9IHJlcXVpcmUoJy4vZG9tL2RvbS1tYW5hZ2VyJyk7XG52YXIgQ2hhbm5lbCA9IHJlcXVpcmUoJy4vY2hhbm5lbHMvcnVuLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZG9tOiBkb21NYW5hZ2VyLFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICB2YXIgbW9kZWwgPSAkKCdib2R5JykuZGF0YSgnZi1tb2RlbCcpO1xuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudDogJycsXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICcnLFxuICAgICAgICAgICAgICAgICAgICBtb2RlbDogbW9kZWwsXG5cbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvbToge1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBwbHVnaW5zOiB7XG4gICAgICAgICAgICAgICAgICAgIGF1dG9VcGRhdGVCaW5kaW5nczogdHJ1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgY29uZmlnKTtcbiAgICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcuY2hhbm5lbCAmJiAoY29uZmlnLmNoYW5uZWwgaW5zdGFuY2VvZiBDaGFubmVsKSkge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gY29uZmlnLmNoYW5uZWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwgPSBuZXcgQ2hhbm5lbChvcHRpb25zLmNoYW5uZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyICRyb290ID0gJChvcHRpb25zLmRvbS5yb290KTtcbiAgICAgICAgdmFyIGluaXRGbiA9ICRyb290LmRhdGEoJ2Ytb24taW5pdCcpO1xuICAgICAgICB2YXIgb3BuU2lsZW50ID0gb3B0aW9ucy5jaGFubmVsLnJ1bi5vcGVyYXRpb25zLnNpbGVudDtcbiAgICAgICAgdmFyIGlzSW5pdE9wZXJhdGlvblNpbGVudCA9IGluaXRGbiAmJiAob3BuU2lsZW50ID09PSB0cnVlIHx8IChfLmlzQXJyYXkob3BuU2lsZW50KSAmJiBfLmNvbnRhaW5zKG9wblNpbGVudCwgaW5pdEZuKSkpO1xuICAgICAgICB2YXIgcHJlRmV0Y2hWYXJpYWJsZXMgPSAhaW5pdEZuIHx8IGlzSW5pdE9wZXJhdGlvblNpbGVudDtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgICBpZiAocHJlRmV0Y2hWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICRyb290Lm9mZignZi5kb21yZWFkeScpLm9uKCdmLmRvbXJlYWR5JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG1lLmNoYW5uZWwudmFyaWFibGVzLnJlZnJlc2gobnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbU1hbmFnZXIuaW5pdGlhbGl6ZSgkLmV4dGVuZCh0cnVlLCB7XG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLmNoYW5uZWxcbiAgICAgICAgfSwgb3B0aW9ucy5kb20pKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIG1hdGNoOiBmdW5jdGlvbiAobWF0Y2hFeHByLCBtYXRjaFZhbHVlLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBtYXRjaFZhbHVlLnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24obWF0Y2hFeHByKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoRXhwcihtYXRjaFZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFZhbHVlLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0Q29udmVydGVyc0xpc3Q6IGZ1bmN0aW9uICgkZWwsIHByb3BlcnR5KSB7XG4gICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnQtJyArIHByb3BlcnR5KTtcblxuICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzICYmIChwcm9wZXJ0eSA9PT0gJ2JpbmQnIHx8IHByb3BlcnR5ID09PSAnZm9yZWFjaCcpKSB7XG4gICAgICAgICAgICAvL09ubHkgYmluZCBpbmhlcml0cyBmcm9tIHBhcmVudHNcbiAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgIHZhciAkcGFyZW50RWwgPSAkZWwuY2xvc2VzdCgnW2RhdGEtZi1jb252ZXJ0XScpO1xuICAgICAgICAgICAgICAgIGlmICgkcGFyZW50RWwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkcGFyZW50RWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9IF8uaW52b2tlKGF0dHJDb252ZXJ0ZXJzLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXR0ckNvbnZlcnRlcnM7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0b0ltcGxpY2l0VHlwZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJicmFjZSA9IC9eKD86XFx7LipcXH18XFxbLipcXF0pJC87XG4gICAgICAgIHZhciBjb252ZXJ0ZWQgPSBkYXRhO1xuICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YS50cmltKCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICdudWxsJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJyc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcXCcnIHx8IGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBkYXRhLnN1YnN0cmluZygxLCBkYXRhLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkLmlzTnVtZXJpYyhkYXRhKSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICtkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyYnJhY2UudGVzdChkYXRhKSkge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogVGhpcyBvbmx5IHdvcmtzIHdpdGggZG91YmxlIHF1b3RlcywgaS5lLiwgWzEsXCIyXCJdIHdvcmtzIGJ1dCBub3QgWzEsJzInXVxuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICQucGFyc2VKU09OKGRhdGEpIDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udmVydGVkO1xuICAgIH1cbn07XG4iXX0=
