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
                    getVariables(ip.interpolated, ip.interpolationMap);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NoYW5uZWxzL29wZXJhdGlvbnMtY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy9ydW4tY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsInNyYy9jb252ZXJ0ZXJzL251bWJlci1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwic3JjL2NvbnZlcnRlcnMvc3RyaW5nLWNvbnZlcnRlci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9hdHRyaWJ1dGUtbWFuYWdlci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9jaGVja2JveC1yYWRpby1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvYmluZHMvZGVmYXVsdC1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvYmluZHMvaW5wdXQtYmluZC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2NsYXNzLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZGVmYXVsdC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2V2ZW50cy9kZWZhdWx0LWV2ZW50LWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2luaXQtZXZlbnQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL25lZ2F0aXZlLWJvb2xlYW4tYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9uby1vcC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL3Bvc2l0aXZlLWJvb2xlYW4tYXR0ci5qcyIsInNyYy9kb20vZG9tLW1hbmFnZXIuanMiLCJzcmMvZG9tL25vZGVzL2Jhc2UuanMiLCJzcmMvZG9tL25vZGVzL2RlZmF1bHQtaW5wdXQtbm9kZS5qcyIsInNyYy9kb20vbm9kZXMvZGVmYXVsdC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9pbnB1dC1jaGVja2JveC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9ub2RlLW1hbmFnZXIuanMiLCJzcmMvZG9tL3BsdWdpbnMvYXV0by11cGRhdGUtYmluZGluZ3MuanMiLCJzcmMvZmxvdy5qcyIsInNyYy91dGlscy9kb20uanMiLCJzcmMvdXRpbHMvcGFyc2UtdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkZsb3cgPSByZXF1aXJlKCcuL2Zsb3cuanMnKTtcbndpbmRvdy5GbG93LnZlcnNpb24gPSAnPCU9IHZlcnNpb24gJT4nOyAvL3BvcHVsYXRlZCBieSBncnVudFxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlXG4gICAgICAgICAqIEB0eXBlIHtTdHJpbmcgfCBBcnJheSB8IE9iamVjdH0gUG9zc2libGUgb3B0aW9ucyBhcmVcbiAgICAgICAgICogICAgICAgLSB0cnVlOiBuZXZlciB0cmlnZ2VyIGFueSB1cGRhdGVzLiBVc2UgdGhpcyBpZiB5b3Uga25vdyB5b3VyIG1vZGVsIHN0YXRlIHdvbid0IGNoYW5nZSBiYXNlZCBvbiBvcGVyYXRpb25zXG4gICAgICAgICAqICAgICAgIC0gZmFsc2U6IGFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqICAgICAgIC0gW2FycmF5IG9mIHZhcmlhYmxlIG5hbWVzXTogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgd2lsbCBub3QgdHJpZ2dlciB1cGRhdGVzLCBldmVyeXRoaW5nIGVsc2Ugd2lsbFxuICAgICAgICAgKiAgICAgICAtIHsgZXhjZXB0OiBbYXJyYXkgb2Ygb3BlcmF0aW9uc119OiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSB3aWxsIHRyaWdnZXIgdXBkYXRlcywgbm90aGluZyBlbHNlIHdpbGxcbiAgICAgICAgICovXG4gICAgICAgIHNpbGVudDogZmFsc2VcbiAgICB9O1xuXG4gICAgdmFyIGNoYW5uZWxPcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB2YXIgcnVuID0gY2hhbm5lbE9wdGlvbnMucnVuO1xuICAgIHZhciB2ZW50ID0gY2hhbm5lbE9wdGlvbnMudmVudDtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgb3B0aW9uczogY2hhbm5lbE9wdGlvbnNcbiAgICAgICAgfSxcblxuICAgICAgICBsaXN0ZW5lck1hcDoge30sXG5cbiAgICAgICAgLy9DaGVjayBmb3IgdXBkYXRlc1xuICAgICAgICAvKipcbiAgICAgICAgICogVHJpZ2dlcnMgdXBkYXRlIG9uIHNpYmxpbmcgdmFyaWFibGVzIGNoYW5uZWxcbiAgICAgICAgICogQHBhcmFtICB7c3RyaW5nfGFycmF5fSBleGVjdXRlZE9wbnMgb3BlcmF0aW9ucyB3aGljaCBqdXN0IGhhcHBlbmVkXG4gICAgICAgICAqIEBwYXJhbSAgeyp9IHJlc3BvbnNlICByZXNwb25zZSBmcm9tIHRoZSBvcGVyYXRpb25cbiAgICAgICAgICogQHBhcmFtICB7Ym9vbGVhbn0gZm9yY2UgIGlnbm9yZSBhbGwgc2lsZW5jZSBvcHRpb25zIGFuZCBmb3JjZSByZWZyZXNoXG4gICAgICAgICAqL1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoZXhlY3V0ZWRPcG5zLCByZXNwb25zZSwgZm9yY2UpIHtcbiAgICAgICAgICAgIHZhciBzaWxlbnQgPSBjaGFubmVsT3B0aW9ucy5zaWxlbnQ7XG5cbiAgICAgICAgICAgIHZhciBzaG91bGRTaWxlbmNlID0gc2lsZW50ID09PSB0cnVlO1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShzaWxlbnQpICYmIGV4ZWN1dGVkT3Bucykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQsIGV4ZWN1dGVkT3BucykubGVuZ3RoID09PSBzaWxlbnQubGVuZ3RoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChzaWxlbnQpICYmIGV4ZWN1dGVkT3Bucykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBleGVjdXRlZE9wbnMpLmxlbmd0aCAhPT0gZXhlY3V0ZWRPcG5zLmxlbmd0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFzaG91bGRTaWxlbmNlIHx8IGZvcmNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJCh2ZW50KS50cmlnZ2VyKCdkaXJ0eScsIHsgb3BuOiBleGVjdXRlZE9wbnMsIHJlc3BvbnNlOiByZXNwb25zZSB9KTtcbiAgICAgICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgICAgIF8uZWFjaChleGVjdXRlZE9wbnMsIGZ1bmN0aW9uIChvcG4pIHtcbiAgICAgICAgICAgICAgICAgICAgbWUubm90aWZ5KG9wbiwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIG5vdGlmeTogZnVuY3Rpb24gKG9wZXJhdGlvbiwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl07XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXNbb3BlcmF0aW9uXSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gbGlzdGVuZXIudGFyZ2V0O1xuICAgICAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2FsbChudWxsLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0LnRyaWdnZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIudGFyZ2V0LnRyaWdnZXIoY29uZmlnLmV2ZW50cy5yZWFjdCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbGlzdGVyZXIgZm9ybWF0IGZvciAnICsgb3BlcmF0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogT3BlcmF0aW9uIG5hbWUgJiBwYXJhbWV0ZXJzIHRvIHNlbmQgdG8gb3BlcmF0aW9ucyBBUElcbiAgICAgICAgICogQHBhcmFtICB7c3RyaW5nIHwgb2JqZWN0fSBvcGVyYXRpb24gTmFtZSBvZiBPcGVyYXRpb24uIElmIGFycmF5LCBuZWVkcyB0byBiZSBpbiB7b3BlcmF0aW9uczogW3tuYW1lOiBvcG4sIHBhcmFtczpbXX1dLCBzZXJpYWw6IGJvb2xlYW59XSBmb3JtYXRcbiAgICAgICAgICogQHBhcmFtICB7Kn0gcGFyYW1zIChvcHRpb25hbCkgICBwYXJhbXMgdG8gc2VuZCB0byBvcGVydGFpb25cbiAgICAgICAgICogQHBhcmFtIHtvcHRpb259IG9wdGlvbnMgU3VwcG9ydGVkIG9wdGlvbnM6IHtzaWxlbnQ6IEJvb2xlYW59XG4gICAgICAgICAqIEByZXR1cm4geyRwcm9taXNlfVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24gKG9wZXJhdGlvbiwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChvcGVyYXRpb24pICYmIG9wZXJhdGlvbi5vcGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gKG9wZXJhdGlvbi5zZXJpYWwpID8gcnVuLnNlcmlhbCA6IHJ1bi5wYXJhbGxlbDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbChydW4sIG9wZXJhdGlvbi5vcGVyYXRpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXJhbXMgfHwgIXBhcmFtcy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBfLnBsdWNrKG9wZXJhdGlvbi5vcGVyYXRpb25zLCAnbmFtZScpLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogY2hlY2sgaWYgaW50ZXJwb2xhdGVkXG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSAoJC5pc1BsYWluT2JqZWN0KG9wZXJhdGlvbikpID8gcGFyYW1zIDogb3B0aW9ucztcbiAgICAgICAgICAgICAgICByZXR1cm4gcnVuLmRvLmFwcGx5KHJ1biwgYXJndW1lbnRzKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0cyB8fCAhb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIFtvcGVyYXRpb25dLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ29wZXJhdGlvbnMgcHVibGlzaCcsIG9wZXJhdGlvbiwgcGFyYW1zKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb25zLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBzdWJzY3JpYmUnLCBvcGVyYXRpb25zLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIG9wZXJhdGlvbnMgPSBbXS5jb25jYXQob3BlcmF0aW9ucyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICAvL1RPRE86IHN1YnNjcmliZXIgY2FuIGJlIGEgZnVuY3Rpb25cbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbiAmJiAhXy5pc0Z1bmN0aW9uKHN1YnNjcmliZXIpKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLm9wZXJhdGlvbicpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHRhcmdldDogc3Vic2NyaWJlclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgICAgICAgJC5lYWNoKG9wZXJhdGlvbnMsIGZ1bmN0aW9uIChpbmRleCwgb3BuKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtZS5saXN0ZW5lck1hcFtvcG5dKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWUubGlzdGVuZXJNYXBbb3BuXSA9IG1lLmxpc3RlbmVyTWFwW29wbl0uY29uY2F0KGRhdGEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0gPSBfLnJlamVjdCh0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0sIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwID0ge307XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFZhcnNDaGFubmVsID0gcmVxdWlyZSgnLi92YXJpYWJsZXMtY2hhbm5lbCcpO1xudmFyIE9wZXJhdGlvbnNDaGFubmVsID0gcmVxdWlyZSgnLi9vcGVyYXRpb25zLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgcnVuOiB7XG4gICAgICAgICAgICB2YXJpYWJsZXM6IHtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9wZXJhdGlvbnM6IHtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29uZmlnID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgIHZhciBybSA9IG5ldyBGLm1hbmFnZXIuUnVuTWFuYWdlcihjb25maWcpO1xuICAgIHZhciBycyA9IHJtLnJ1bjtcblxuICAgIHZhciAkY3JlYXRpb25Qcm9taXNlID0gcm0uZ2V0UnVuKCk7XG4gICAgcnMuY3VycmVudFByb21pc2UgPSAkY3JlYXRpb25Qcm9taXNlO1xuXG4gICAgdmFyIGNyZWF0ZUFuZFRoZW4gPSBmdW5jdGlvbiAoZm4sIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIF8ud3JhcChmbiwgZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgICAgIHZhciBwYXNzZWRJblBhcmFtcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDEpO1xuICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJzLmN1cnJlbnRQcm9taXNlID0gZnVuYy5hcHBseShjb250ZXh0LCBwYXNzZWRJblBhcmFtcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvL01ha2Ugc3VyZSBub3RoaW5nIGhhcHBlbnMgYmVmb3JlIHRoZSBydW4gaXMgY3JlYXRlZFxuICAgIF8uZWFjaChycywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpICYmIG5hbWUgIT09ICd2YXJpYWJsZXMnICAmJiBuYW1lICE9PSAnY3JlYXRlJykge1xuICAgICAgICAgICAgcnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCBycyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBvcmlnaW5hbFZhcmlhYmxlc0ZuID0gcnMudmFyaWFibGVzO1xuICAgIHJzLnZhcmlhYmxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZzID0gb3JpZ2luYWxWYXJpYWJsZXNGbi5hcHBseShycywgYXJndW1lbnRzKTtcbiAgICAgICAgXy5lYWNoKHZzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCB2cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdnM7XG4gICAgfTtcblxuICAgIHRoaXMucnVuID0gcnM7XG4gICAgdGhpcy52YXJpYWJsZXMgPSBuZXcgVmFyc0NoYW5uZWwoJC5leHRlbmQodHJ1ZSwge30sIGNvbmZpZy5ydW4udmFyaWFibGVzLCB7IHJ1bjogcnMsIHZlbnQ6IHRoaXMgfSkpO1xuICAgIHRoaXMub3BlcmF0aW9ucyA9IG5ldyBPcGVyYXRpb25zQ2hhbm5lbCgkLmV4dGVuZCh0cnVlLCB7fSwgY29uZmlnLnJ1bi5vcGVyYXRpb25zLCB7IHJ1bjogcnMsIHZlbnQ6IHRoaXMgfSkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZVxuICAgICAgICAgKiBAdHlwZSB7U3RyaW5nIHwgQXJyYXkgfCBPYmplY3R9IFBvc3NpYmxlIG9wdGlvbnMgYXJlXG4gICAgICAgICAqICAgICAgIC0gdHJ1ZTogbmV2ZXIgdHJpZ2dlciBhbnkgdXBkYXRlcy4gVXNlIHRoaXMgaWYgeW91IGtub3cgeW91ciBtb2RlbCBzdGF0ZSB3b24ndCBjaGFuZ2UgYmFzZWQgb24gb3RoZXIgdmFyaWFibGVzXG4gICAgICAgICAqICAgICAgIC0gZmFsc2U6IGFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqICAgICAgIC0gW2FycmF5IG9mIHZhcmlhYmxlIG5hbWVzXTogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgd2lsbCBub3QgdHJpZ2dlciB1cGRhdGVzLCBldmVyeXRoaW5nIGVsc2Ugd2lsbFxuICAgICAgICAgKiAgICAgICAtIHsgZXhjZXB0OiBbYXJyYXkgb2YgdmFyaWFibGVzXX06IFZhcmlhYmxlcyBpbiB0aGlzIGFycmF5IHdpbGwgdHJpZ2dlciB1cGRhdGVzLCBub3RoaW5nIGVsc2Ugd2lsbFxuICAgICAgICAgKi9cbiAgICAgICAgc2lsZW50OiBmYWxzZSxcblxuICAgICAgICBhdXRvRmV0Y2g6IGZhbHNlXG4gICAgfTtcblxuICAgIHZhciBjaGFubmVsT3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgdmFyIHZzID0gY2hhbm5lbE9wdGlvbnMucnVuLnZhcmlhYmxlcygpO1xuICAgIHZhciB2ZW50ID0gY2hhbm5lbE9wdGlvbnMudmVudDtcblxuICAgIHZhciBjdXJyZW50RGF0YSA9IHt9O1xuXG4gICAgLy9UT0RPOiBhY3R1YWxseSBjb21wYXJlIG9iamVjdHMgYW5kIHNvIG9uXG4gICAgdmFyIGlzRXF1YWwgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHZhciBnZXRJbm5lclZhcmlhYmxlcyA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgdmFyIGlubmVyID0gc3RyLm1hdGNoKC88KC4qPyk+L2cpO1xuICAgICAgICBpbm5lciA9IF8ubWFwKGlubmVyLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsLnN1YnN0cmluZygxLCB2YWwubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaW5uZXI7XG4gICAgfTtcblxuICAgIC8vUmVwbGFjZXMgc3R1YmJlZCBvdXQga2V5bmFtZXMgaW4gdmFyaWFibGVzdG9pbnRlcnBvbGF0ZSB3aXRoIHRoZWlyIGNvcnJlc3BvbmRpbmcgdmFsdWVzXG4gICAgdmFyIGludGVycG9sYXRlID0gZnVuY3Rpb24gKHZhcmlhYmxlc1RvSW50ZXJwb2xhdGUsIHZhbHVlcykge1xuICAgICAgICAvL3twcmljZVsxXTogcHJpY2VbPHRpbWU+XX1cbiAgICAgICAgdmFyIGludGVycG9sYXRpb25NYXAgPSB7fTtcbiAgICAgICAgLy97cHJpY2VbMV06IDF9XG4gICAgICAgIHZhciBpbnRlcnBvbGF0ZWQgPSBbXTtcblxuICAgICAgICBfLmVhY2godmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgZnVuY3Rpb24gKG91dGVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKG91dGVyVmFyaWFibGUpO1xuICAgICAgICAgICAgaWYgKGlubmVyICYmIGlubmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBvcmlnaW5hbE91dGVyID0gb3V0ZXJWYXJpYWJsZTtcbiAgICAgICAgICAgICAgICAkLmVhY2goaW5uZXIsIGZ1bmN0aW9uIChpbmRleCwgaW5uZXJWYXJpYWJsZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGhpc3ZhbCA9IHZhbHVlc1tpbm5lclZhcmlhYmxlXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXN2YWwgIT09IG51bGwgJiYgdGhpc3ZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KHRoaXN2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Gb3IgYXJyYXllZCB0aGluZ3MgZ2V0IHRoZSBsYXN0IG9uZSBmb3IgaW50ZXJwb2xhdGlvbiBwdXJwb3Nlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXN2YWwgPSB0aGlzdmFsW3RoaXN2YWwubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE86IFJlZ2V4IHRvIG1hdGNoIHNwYWNlcyBhbmQgc28gb25cbiAgICAgICAgICAgICAgICAgICAgICAgIG91dGVyVmFyaWFibGUgPSBvdXRlclZhcmlhYmxlLnJlcGxhY2UoJzwnICsgaW5uZXJWYXJpYWJsZSArICc+JywgdGhpc3ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdID0gKGludGVycG9sYXRpb25NYXBbb3V0ZXJWYXJpYWJsZV0pID8gW29yaWdpbmFsT3V0ZXJdLmNvbmNhdChpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdKSA6IG9yaWdpbmFsT3V0ZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbnRlcnBvbGF0ZWQucHVzaChvdXRlclZhcmlhYmxlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG9wID0ge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkOiBpbnRlcnBvbGF0ZWQsXG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwOiBpbnRlcnBvbGF0aW9uTWFwXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBvcDtcbiAgICB9O1xuXG4gICAgdmFyIGxhc3RDaGVja1RpbWUgPSBfLm5vdygpO1xuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgZ2V0SW5uZXJWYXJpYWJsZXM6IGdldElubmVyVmFyaWFibGVzLFxuICAgICAgICAgICAgaW50ZXJwb2xhdGU6IGludGVycG9sYXRlLFxuICAgICAgICAgICAgb3B0aW9uczogY2hhbm5lbE9wdGlvbnNcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJzY3JpcHRpb25zOiBbXSxcblxuICAgICAgICB1bmZldGNoZWQ6IFtdLFxuXG4gICAgICAgIGdldFN1YnNjcmliZXJzOiBmdW5jdGlvbiAodG9waWMpIHtcbiAgICAgICAgICAgIGlmICh0b3BpYykge1xuICAgICAgICAgICAgICAgIHJldHVybiBfLmZpbHRlcih0aGlzLnN1YnNjcmlwdGlvbnMsIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfLmNvbnRhaW5zKHN1YnMudG9waWNzLCB0b3BpYyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnN1YnNjcmlwdGlvbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldEFsbFRvcGljczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIF8odGhpcy5zdWJzY3JpcHRpb25zKS5wbHVjaygndG9waWNzJykuZmxhdHRlbigpLnVuaXEoKS52YWx1ZSgpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRUb3BpY0RlcGVuZGVuY2llczogZnVuY3Rpb24gKGxpc3QpIHtcbiAgICAgICAgICAgIGlmICghbGlzdCkge1xuICAgICAgICAgICAgICAgIGxpc3QgPSB0aGlzLmdldEFsbFRvcGljcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGlubmVyTGlzdCA9IFtdO1xuICAgICAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uICh2bmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKHZuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlubmVyTGlzdCA9IF8udW5pcShpbm5lckxpc3QuY29uY2F0KGlubmVyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gaW5uZXJMaXN0O1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaDogZnVuY3Rpb24gKHRvcGljcykge1xuICAgICAgICAgICAgdGhpcy51bmZldGNoZWQgPSBfLnVuaXEodGhpcy51bmZldGNoZWQuY29uY2F0KHRvcGljcykpO1xuICAgICAgICAgICAgLy8gaWYgaXQgaGFzIGJlZW4gYSBzZWNvbmQgc2luY2UgeW91IGxhc3QgY2hlY2tlZCwgb3IgdGhlcmUgYXJlIGF0IGxlYXN0IDUgaXRlbXMgaW4gdGhlIHBlbmRpbmcgcXVldWVcbiAgICAgICAgICAgIHZhciBUSU1FX0JFVFdFRU5fQ0hFQ0tTID0gMjAwO1xuICAgICAgICAgICAgdmFyIE1BWF9JVEVNU19JTl9RVUVVRSA9IDU7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICAgICAgICBpZiAoY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoICYmIChub3cgLSBsYXN0Q2hlY2tUaW1lID4gVElNRV9CRVRXRUVOX0NIRUNLUyB8fCB0aGlzLnVuZmV0Y2hlZC5sZW5ndGggPiBNQVhfSVRFTVNfSU5fUVVFVUUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mZXRjaCh0aGlzLnVuZmV0Y2hlZCkudGhlbihmdW5jdGlvbiAoY2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImZldGNoZWRcIiwgXy5ub3coKSlcbiAgICAgICAgICAgICAgICAgICAgJC5leHRlbmQoY3VycmVudERhdGEsIGNoYW5nZWQpO1xuICAgICAgICAgICAgICAgICAgICBtZS51bmZldGNoZWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbGFzdENoZWNrVGltZSA9IG5vdztcbiAgICAgICAgICAgICAgICAgICAgbWUubm90aWZ5KGNoYW5nZWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIm5vdCB0aW1lIHlldFwiLCAobm93IC0gbGFzdENoZWNrVGltZSkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmV0Y2g6IGZ1bmN0aW9uICh2YXJpYWJsZXNMaXN0KSB7XG4gICAgICAgICAgICB2YXJpYWJsZXNMaXN0ID0gW10uY29uY2F0KHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgdmFyIGlubmVyVmFyaWFibGVzID0gdGhpcy5nZXRUb3BpY0RlcGVuZGVuY2llcyh2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIHZhciBnZXRWYXJpYWJsZXMgPSBmdW5jdGlvbiAodmFycywgaW50ZXJwb2xhdGlvbk1hcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeSh2YXJzKS50aGVuKGZ1bmN0aW9uICh2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ0dvdCB2YXJpYWJsZXMnLCB2YXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2hhbmdlU2V0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaCh2YXJpYWJsZXMsIGZ1bmN0aW9uICh2YWx1ZSwgdm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGN1cnJlbnREYXRhW3ZuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNFcXVhbCh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W3ZuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlcnBvbGF0aW9uTWFwICYmIGludGVycG9sYXRpb25NYXBbdm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSBbXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFt2bmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2gobWFwLCBmdW5jdGlvbiAoaW50ZXJwb2xhdGVkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W2ludGVycG9sYXRlZE5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGFuZ2VTZXQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGlubmVyVmFyaWFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeShpbm5lclZhcmlhYmxlcykudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW5uZXInLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpcCA9ICBpbnRlcnBvbGF0ZSh2YXJpYWJsZXNMaXN0LCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIGdldFZhcmlhYmxlcyhpcC5pbnRlcnBvbGF0ZWQsIGlwLmludGVycG9sYXRpb25NYXApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VmFyaWFibGVzKHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVjayBhbmQgbm90aWZ5IGFsbCBsaXN0ZW5lcnNcbiAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBjaGFuZ2VPYmoga2V5LXZhbHVlIHBhaXJzIG9mIGNoYW5nZWQgdmFyaWFibGVzXG4gICAgICAgICAqL1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoY2hhbmdlT2JqLCBmb3JjZSkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZhciBzaWxlbnQgPSBjaGFubmVsT3B0aW9ucy5zaWxlbnQ7XG4gICAgICAgICAgICB2YXIgY2hhbmdlZFZhcmlhYmxlcyA9IF8ua2V5cyhjaGFuZ2VPYmopO1xuXG4gICAgICAgICAgICB2YXIgc2hvdWxkU2lsZW5jZSA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoc2lsZW50KSAmJiBjaGFuZ2VkVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgc2hvdWxkU2lsZW5jZSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudCwgY2hhbmdlZFZhcmlhYmxlcykubGVuZ3RoID49IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHNpbGVudCkgJiYgY2hhbmdlZFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBjaGFuZ2VkVmFyaWFibGVzKS5sZW5ndGggIT09IGNoYW5nZWRWYXJpYWJsZXMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2hvdWxkU2lsZW5jZSAmJiBmb3JjZSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkLkRlZmVycmVkKCkucmVzb2x2ZSgpLnByb21pc2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHZhcmlhYmxlcyA9IHRoaXMuZ2V0QWxsVG9waWNzKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaCh2YXJpYWJsZXMpLnRoZW4oZnVuY3Rpb24gKGNoYW5nZVNldCkge1xuICAgICAgICAgICAgICAgIG1lLnVuZmV0Y2hlZCA9IFtdO1xuICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBjaGFuZ2VTZXQpO1xuICAgICAgICAgICAgICAgIG1lLm5vdGlmeShjaGFuZ2VTZXQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbm90aWZ5OiBmdW5jdGlvbiAodG9waWNzLCB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGNhbGxUYXJnZXQgPSBmdW5jdGlvbiAodGFyZ2V0LCBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNhbGwobnVsbCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQudHJpZ2dlcihjb25maWcuZXZlbnRzLnJlYWN0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICghJC5pc1BsYWluT2JqZWN0KHRvcGljcykpIHtcbiAgICAgICAgICAgICAgICB0b3BpY3MgPSBfLm9iamVjdChbdG9waWNzXSwgW3ZhbHVlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfLmVhY2godGhpcy5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IHN1YnNjcmlwdGlvbi50YXJnZXQ7XG4gICAgICAgICAgICAgICAgaWYgKHN1YnNjcmlwdGlvbi5iYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2hpbmdUb3BpY3MgPSBfLnBpY2sodG9waWNzLCBzdWJzY3JpcHRpb24udG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uc2l6ZShtYXRjaGluZ1RvcGljcykgPT09IF8uc2l6ZShzdWJzY3JpcHRpb24udG9waWNzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFRhcmdldCh0YXJnZXQsIG1hdGNoaW5nVG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChzdWJzY3JpcHRpb24udG9waWNzLCBmdW5jdGlvbiAodG9waWMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXRjaGluZ1RvcGljcyA9IF8ucGljayh0b3BpY3MsIHRvcGljKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfLnNpemUobWF0Y2hpbmdUb3BpY3MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbFRhcmdldCh0YXJnZXQsIG1hdGNoaW5nVG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZhcmlhYmxlIG5hbWUgJiBwYXJhbWV0ZXJzIHRvIHNlbmQgdmFyaWFibGVzIEFQSVxuICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmcgfCBvYmplY3R9IHZhcmlhYmxlIHN0cmluZyBvciB7dmFyaWFibGVuYW1lOiB2YWx1ZX1cbiAgICAgICAgICogQHBhcmFtICB7Kn0gdmFsdWUgKG9wdGlvbmFsKSAgIHZhbHVlIG9mIHZhcmlhYmxlIGlmIHByZXZpb3VzIGFyZyB3YXMgYSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgU3VwcG9ydGVkIG9wdGlvbnM6IHtzaWxlbnQ6IEJvb2xlYW59XG4gICAgICAgICAqIEByZXR1cm4geyRwcm9taXNlfVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24gKHZhcmlhYmxlLCB2YWx1ZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3B1Ymxpc2gnLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGF0dHJzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YXJpYWJsZSkpIHtcbiAgICAgICAgICAgICAgICBhdHRycyA9IHZhcmlhYmxlO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKGF0dHJzID0ge30pW3ZhcmlhYmxlXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGl0ID0gaW50ZXJwb2xhdGUoXy5rZXlzKGF0dHJzKSwgY3VycmVudERhdGEpO1xuXG4gICAgICAgICAgICB2YXIgdG9TYXZlID0ge307XG4gICAgICAgICAgICBfLmVhY2goYXR0cnMsIGZ1bmN0aW9uICh2YWwsIGF0dHIpIHtcbiAgICAgICAgICAgICAgIHZhciBrZXkgPSAoaXQuaW50ZXJwb2xhdGlvbk1hcFthdHRyXSkgPyBpdC5pbnRlcnBvbGF0aW9uTWFwW2F0dHJdIDogYXR0cjtcbiAgICAgICAgICAgICAgIHRvU2F2ZVtrZXldID0gdmFsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIHZzLnNhdmUuY2FsbCh2cywgdG9TYXZlKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zIHx8ICFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3Vic2NyaWJlIHRvIGNoYW5nZXMgb24gYSBjaGFubmVsXG4gICAgICAgICAqIEBwYXJhbSAge0FycmF5fFN0cmluZ30gdG9waWNzIExpc3Qgb2YgdGFza3NcbiAgICAgICAgICogQHBhcmFtICB7ZnVuY3Rpb258b2JqZWN0fSBzdWJzY3JpYmVyXG4gICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9ucyAgKE9wdGlvbmFsKVxuICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9ICAgICAgICAgICAgU3Vic2NyaXB0aW9uIElEXG4gICAgICAgICAqL1xuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uICh0b3BpY3MsIHN1YnNjcmliZXIsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdzdWJzY3JpYmluZycsIHRvcGljcywgc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgYmF0Y2g6IGZhbHNlXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0b3BpY3MgPSBbXS5jb25jYXQodG9waWNzKTtcbiAgICAgICAgICAgIC8vdXNlIGpxdWVyeSB0byBtYWtlIGV2ZW50IHNpbmtcbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbiAmJiAhXy5pc0Z1bmN0aW9uKHN1YnNjcmliZXIpKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLnZhcmlhYmxlJyk7XG4gICAgICAgICAgICB2YXIgZGF0YSA9ICQuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgdG9waWNzOiB0b3BpY3MsXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKGRhdGEpO1xuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaCh0b3BpY3MpO1xuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9LFxuXG5cbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uICh0b2tlbikge1xuICAgICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25zID0gXy5yZWplY3QodGhpcy5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoc3Vicykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWJzLmlkID09PSB0b2tlbjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICB1bnN1YnNjcmliZUFsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25zID0gW107XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbiAgICB2YXIgbWUgPSB0aGlzO1xuICAgICQodmVudCkub2ZmKCdkaXJ0eScpLm9uKCdkaXJ0eScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBudWxsLCB0cnVlKTtcbiAgICB9KTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcmVmaXg6ICdmJyxcbiAgICBkZWZhdWx0QXR0cjogJ2JpbmQnLFxuXG4gICAgYmluZGVyQXR0cjogJ2YtYmluZCcsXG5cbiAgICBldmVudHM6IHtcbiAgICAgICAgdHJpZ2dlcjogJ3VwZGF0ZS5mLnVpJyxcbiAgICAgICAgcmVhY3Q6ICd1cGRhdGUuZi5tb2RlbCdcbiAgICB9XG5cbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgbGlzdCA9IFtcbiAgICB7XG4gICAgICAgIGFsaWFzOiAnbGlzdCcsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBhbGlhczogJ2xhc3QnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiB2YWxbdmFsLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGFsaWFzOiAnZmlyc3QnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiB2YWxbMF07XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgYWxpYXM6ICdwcmV2aW91cycsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICAgICAgcmV0dXJuICh2YWwubGVuZ3RoIDw9IDEpID8gdmFsWzBdIDogdmFsW3ZhbC5sZW5ndGggLSAyXTtcbiAgICAgICAgfVxuICAgIH1cbl07XG5cbl8uZWFjaChsaXN0LCBmdW5jdGlvbiAoaXRlbSkge1xuICAgdmFyIG9sZGZuID0gaXRlbS5jb252ZXJ0O1xuICAgdmFyIG5ld2ZuID0gZnVuY3Rpb24gKHZhbCkge1xuICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QodmFsKSkge1xuICAgICAgICAgICAgcmV0dXJuIF8ubWFwVmFsdWVzKHZhbCwgb2xkZm4pO1xuICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gb2xkZm4odmFsKTtcbiAgICAgICB9XG4gICB9O1xuICAgaXRlbS5jb252ZXJ0ID0gbmV3Zm47XG59KTtcbm1vZHVsZS5leHBvcnRzID0gbGlzdDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy9UT0RPOiBNYWtlIGFsbCB1bmRlcnNjb3JlIGZpbHRlcnMgYXZhaWxhYmxlXG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlciwgYWNjZXB0TGlzdCkge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICAvL25vbWFsaXplKCdmbGlwJywgZm4pXG4gICAgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIpKSB7XG4gICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgIGFsaWFzOiBhbGlhcyxcbiAgICAgICAgICAgIGNvbnZlcnQ6IGNvbnZlcnRlcixcbiAgICAgICAgICAgIGFjY2VwdExpc3Q6IGFjY2VwdExpc3RcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICgkLmlzUGxhaW5PYmplY3QoY29udmVydGVyKSAmJiBjb252ZXJ0ZXIuY29udmVydCkge1xuICAgICAgICBjb252ZXJ0ZXIuYWxpYXMgPSBhbGlhcztcbiAgICAgICAgY29udmVydGVyLmFjY2VwdExpc3QgPSBhY2NlcHRMaXN0O1xuICAgICAgICByZXQucHVzaChjb252ZXJ0ZXIpO1xuICAgIH0gZWxzZSBpZiAoJC5pc1BsYWluT2JqZWN0KGFsaWFzKSkge1xuICAgICAgICAvL25vcm1hbGl6ZSh7YWxpYXM6ICdmbGlwJywgY29udmVydDogZnVuY3Rpb259KVxuICAgICAgICBpZiAoYWxpYXMuY29udmVydCkge1xuICAgICAgICAgICAgcmV0LnB1c2goYWxpYXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbm9ybWFsaXplKHtmbGlwOiBmdW59KVxuICAgICAgICAgICAgJC5lYWNoKGFsaWFzLCBmdW5jdGlvbiAoa2V5LCB2YWwpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGFsaWFzOiBrZXksXG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnQ6IHZhbCxcbiAgICAgICAgICAgICAgICAgICAgYWNjZXB0TGlzdDogYWNjZXB0TGlzdFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBtYXRjaENvbnZlcnRlciA9IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcoY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gYWxpYXMgPT09IGNvbnZlcnRlci5hbGlhcztcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIuYWxpYXMoYWxpYXMpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1JlZ2V4KGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5hbGlhcy5tYXRjaChhbGlhcyk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjb252ZXJ0ZXJNYW5hZ2VyID0ge1xuICAgIHByaXZhdGU6IHtcbiAgICAgICAgbWF0Y2hDb252ZXJ0ZXI6IG1hdGNoQ29udmVydGVyXG4gICAgfSxcblxuICAgIGxpc3Q6IFtdLFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgY29udmVydGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfGZ1bmN0aW9ufHJlZ2V4fSBhbGlhcyBmb3JtYXR0ZXIgbmFtZVxuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gY29udmVydGVyICAgIGNvbnZlcnRlciBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24sIHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIHZhbHVlLCBvciBhbiBvYmplY3Qgd2l0aCB7YWxpYXM6ICcnLCBwYXJzZTogJC5ub29wLCBjb252ZXJ0OiAkLm5vb3B9XG4gICAgICogQHBhcmFtIHtCb29sZWFufSBhY2NlcHRMaXN0IGRlY2lkZXMgaWYgdGhlIGNvbnZlcnRlciBpcyBhICdsaXN0JyBjb252ZXJ0ZXIgb3Igbm90OyBsaXN0IGNvbnZlcnRlcnMgdGFrZSBpbiBhcnJheXMgYXMgaW5wdXRzLCBvdGhlcnMgZXhwZWN0IHNpbmdsZSB2YWx1ZXMuXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyLCBhY2NlcHRMaXN0KSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkID0gbm9ybWFsaXplKGFsaWFzLCBjb252ZXJ0ZXIsIGFjY2VwdExpc3QpO1xuICAgICAgICB0aGlzLmxpc3QgPSBub3JtYWxpemVkLmNvbmNhdCh0aGlzLmxpc3QpO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChjdXJyZW50Q29udmVydGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hDb252ZXJ0ZXIoYWxpYXMsIGN1cnJlbnRDb252ZXJ0ZXIpKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShhbGlhcywgY29udmVydGVyKVswXSk7XG4gICAgfSxcblxuICAgIGdldENvbnZlcnRlcjogZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbiAoY29udmVydGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hDb252ZXJ0ZXIoYWxpYXMsIGNvbnZlcnRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQaXBlcyB0aGUgdmFsdWUgc2VxdWVudGlhbGx5IHRocm91Z2ggYSBsaXN0IG9mIHByb3ZpZGVkIGNvbnZlcnRlcnNcbiAgICAgKiBAcGFyYW0gIHsqfSB2YWx1ZSBJbnB1dCBmb3IgdGhlIGNvbnZlcnRlciB0byB0YWdcbiAgICAgKiBAcGFyYW0gIHtBcnJheXxPYmplY3R9IGxpc3QgIGxpc3Qgb2YgY29udmVydGVycyAobWFwcyB0byBjb252ZXJ0ZXIgYWxpYXMpXG4gICAgICogQHJldHVybiB7Kn0gICAgICAgY29udmVydGVkIHZhbHVlXG4gICAgICovXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGNvbnZlcnRBcnJheSA9IGZ1bmN0aW9uIChjb252ZXJ0ZXIsIHZhbCwgY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIF8ubWFwKHZhbCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udmVydGVyLmNvbnZlcnQodiwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGNvbnZlcnRPYmplY3QgPSBmdW5jdGlvbiAoY29udmVydGVyLCB2YWx1ZSwgY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIF8ubWFwVmFsdWVzKHZhbHVlLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgIHJldHVybiBjb252ZXJ0KGNvbnZlcnRlciwgdmFsLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKGNvbnZlcnRlciwgdmFsdWUsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZWQ7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSAmJiBjb252ZXJ0ZXIuYWNjZXB0TGlzdCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRBcnJheShjb252ZXJ0ZXIsIHZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gY29udmVydGVyLmNvbnZlcnQodmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICAgICAgfTtcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChjdXJyZW50VmFsdWUpICYmIGNvbnZlcnRlci5hY2NlcHRMaXN0ICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydE9iamVjdChjb252ZXJ0ZXIsIGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnQoY29udmVydGVyLCBjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ291bnRlci1wYXJ0IHRvICdjb252ZXJ0Jy4gVHJhbnNsYXRlcyBjb252ZXJ0ZWQgdmFsdWVzIGJhY2sgdG8gdGhlaXIgb3JpZ2luYWwgZm9ybVxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gdmFsdWUgVmFsdWUgdG8gcGFyc2VcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmcgfCBBcnJheX0gbGlzdCAgTGlzdCBvZiBwYXJzZXJzIHRvIHJ1biB0aGlzIHRocm91Z2guIE91dGVybW9zdCBpcyBpbnZva2VkIGZpcnN0XG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICBwYXJzZTogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpLnJldmVyc2UoKTtcbiAgICAgICAgbGlzdCA9IF8uaW52b2tlKGxpc3QsICd0cmltJyk7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICBfLmVhY2gobGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZXIgPSBtZS5nZXRDb252ZXJ0ZXIoY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICBpZiAoY29udmVydGVyLnBhcnNlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydGVyLnBhcnNlKGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgIH1cbn07XG5cblxuLy9Cb290c3RyYXBcbnZhciBkZWZhdWx0Y29udmVydGVycyA9IFtcbiAgICByZXF1aXJlKCcuL251bWJlci1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL3N0cmluZy1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL2FycmF5LWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vbnVtYmVyZm9ybWF0LWNvbnZlcnRlcicpLFxuXTtcblxuJC5lYWNoKGRlZmF1bHRjb252ZXJ0ZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24gKGluZGV4LCBjb252ZXJ0ZXIpIHtcbiAgICBpZiAoXy5pc0FycmF5KGNvbnZlcnRlcikpIHtcbiAgICAgICAgXy5lYWNoKGNvbnZlcnRlciwgZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgY29udmVydGVyTWFuYWdlci5yZWdpc3RlcihjKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29udmVydGVyTWFuYWdlci5yZWdpc3Rlcihjb252ZXJ0ZXIpO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnZlcnRlck1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhbGlhczogJ2knLFxuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZSwgMTApO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhbGlhczogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgLy9UT0RPOiBGYW5jeSByZWdleCB0byBtYXRjaCBudW1iZXIgZm9ybWF0cyBoZXJlXG4gICAgICAgIHJldHVybiAobmFtZS5pbmRleE9mKCcjJykgIT09IC0xIHx8IG5hbWUuaW5kZXhPZignMCcpICE9PSAtMSk7XG4gICAgfSxcblxuICAgIHBhcnNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCs9ICcnO1xuICAgICAgICB2YXIgaXNOZWdhdGl2ZSA9IHZhbC5jaGFyQXQoMCkgPT09ICctJztcblxuICAgICAgICB2YWwgID0gdmFsLnJlcGxhY2UoLywvZywgJycpO1xuICAgICAgICB2YXIgZmxvYXRNYXRjaGVyID0gLyhbLStdP1swLTldKlxcLj9bMC05XSspKEs/TT9CPyU/KS9pO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IGZsb2F0TWF0Y2hlci5leGVjKHZhbCk7XG4gICAgICAgIHZhciBudW1iZXIsIHN1ZmZpeCA9ICcnO1xuICAgICAgICBpZiAocmVzdWx0cyAmJiByZXN1bHRzWzFdKSB7XG4gICAgICAgICAgICBudW1iZXIgPSByZXN1bHRzWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHNbMl0pIHtcbiAgICAgICAgICAgIHN1ZmZpeCA9IHJlc3VsdHNbMl0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoc3VmZml4KSB7XG4gICAgICAgICAgICBjYXNlICclJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyAxMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdrJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbSc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2InOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDAwMDAwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbnVtYmVyID0gcGFyc2VGbG9hdChudW1iZXIpO1xuICAgICAgICBpZiAoaXNOZWdhdGl2ZSAmJiBudW1iZXIgPiAwKSB7XG4gICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAtMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgIH0sXG5cbiAgICBjb252ZXJ0OiAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBzY2FsZXMgPSBbJycsICdLJywgJ00nLCAnQicsICdUJ107XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RGlnaXRzKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPT09IDAgPyAwIDogcm91bmRUbyh2YWx1ZSwgTWF0aC5tYXgoMCwgZGlnaXRzIC0gTWF0aC5jZWlsKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4xMCkpKTtcblxuICAgICAgICAgICAgdmFyIFRYVCA9ICcnO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbFNldCA9IGZhbHNlO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpVFhUID0gMDsgaVRYVCA8IG51bWJlclRYVC5sZW5ndGg7IGlUWFQrKykge1xuICAgICAgICAgICAgICAgIFRYVCArPSBudW1iZXJUWFQuY2hhckF0KGlUWFQpO1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJUWFQuY2hhckF0KGlUWFQpID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVjaW1hbFNldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGRpZ2l0cyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBUWFQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRlY2ltYWxTZXQpIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJy4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGRpZ2l0cyA+IDApIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgIGRpZ2l0cy0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZERlY2ltYWxzKHZhbHVlLCBkZWNpbWFscywgbWluRGVjaW1hbHMsIGhhc0NvbW1hcykge1xuICAgICAgICAgICAgaGFzQ29tbWFzID0gaGFzQ29tbWFzIHx8IHRydWU7XG4gICAgICAgICAgICB2YXIgbnVtYmVyVFhUID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBoYXNEZWNpbWFscyA9IChudW1iZXJUWFQuc3BsaXQoJy4nKS5sZW5ndGggPiAxKTtcbiAgICAgICAgICAgIHZhciBpRGVjID0gMDtcblxuICAgICAgICAgICAgaWYgKGhhc0NvbW1hcykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGlDaGFyID0gbnVtYmVyVFhULmxlbmd0aCAtIDE7IGlDaGFyID4gMDsgaUNoYXItLSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzRGVjaW1hbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0RlY2ltYWxzID0gKG51bWJlclRYVC5jaGFyQXQoaUNoYXIpICE9PSAnLicpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaURlYyA9IChpRGVjICsgMSkgJSAzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlEZWMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgPSBudW1iZXJUWFQuc3Vic3RyKDAsIGlDaGFyKSArICcsJyArIG51bWJlclRYVC5zdWJzdHIoaUNoYXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGVjaW1hbHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvQUREO1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJUWFQuc3BsaXQoJy4nKS5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0b0FERCA9IG1pbkRlY2ltYWxzO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9BREQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgKz0gJy4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BREQgPSBtaW5EZWNpbWFscyAtIG51bWJlclRYVC5zcGxpdCgnLicpWzFdLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAodG9BREQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCArPSAnMCc7XG4gICAgICAgICAgICAgICAgICAgIHRvQURELS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bWJlclRYVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJvdW5kVG8odmFsdWUsIGRpZ2l0cykge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQodmFsdWUgKiBNYXRoLnBvdygxMCwgZGlnaXRzKSkgLyBNYXRoLnBvdygxMCwgZGlnaXRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFN1ZmZpeChmb3JtYXRUWFQpIHtcbiAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5yZXBsYWNlKCcuJywgJycpO1xuICAgICAgICAgICAgdmFyIGZpeGVzVFhUID0gZm9ybWF0VFhULnNwbGl0KG5ldyBSZWdFeHAoJ1swfCx8I10rJywgJ2cnKSk7XG4gICAgICAgICAgICByZXR1cm4gKGZpeGVzVFhULmxlbmd0aCA+IDEpID8gZml4ZXNUWFRbMV0udG9TdHJpbmcoKSA6ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNDdXJyZW5jeShzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBzID0gJC50cmltKHN0cmluZyk7XG5cbiAgICAgICAgICAgIGlmIChzID09PSAnJCcgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCrCcgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCpScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCoycgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCoScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCsScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnS8OEPycgfHxcbiAgICAgICAgICAgICAgICBzID09PSAna3InIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqInIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqonIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OG4oCZJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKpJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKrJykge1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdChudW1iZXIsIGZvcm1hdFRYVCkge1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyW251bWJlci5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhudW1iZXIpICYmICFfLmlzTnVtYmVyKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZvcm1hdFRYVCB8fCBmb3JtYXRUWFQudG9Mb3dlckNhc2UoKSA9PT0gJ2RlZmF1bHQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bWJlci50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaXNOYU4obnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnPyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vdmFyIGZvcm1hdFRYVDtcbiAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5yZXBsYWNlKCcmZXVybzsnLCAnw6LigJrCrCcpO1xuXG4gICAgICAgICAgICAvLyBEaXZpZGUgKy8tIE51bWJlciBGb3JtYXRcbiAgICAgICAgICAgIHZhciBmb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCc7Jyk7XG4gICAgICAgICAgICBpZiAoZm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm1hdChNYXRoLmFicyhudW1iZXIpLCBmb3JtYXRzWygobnVtYmVyID49IDApID8gMCA6IDEpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgU2lnblxuICAgICAgICAgICAgdmFyIHNpZ24gPSAobnVtYmVyID49IDApID8gJycgOiAnLSc7XG4gICAgICAgICAgICBudW1iZXIgPSBNYXRoLmFicyhudW1iZXIpO1xuXG5cbiAgICAgICAgICAgIHZhciBsZWZ0T2ZEZWNpbWFsID0gZm9ybWF0VFhUO1xuICAgICAgICAgICAgdmFyIGQgPSBsZWZ0T2ZEZWNpbWFsLmluZGV4T2YoJy4nKTtcbiAgICAgICAgICAgIGlmIChkID4gLTEpIHtcbiAgICAgICAgICAgICAgICBsZWZ0T2ZEZWNpbWFsID0gbGVmdE9mRGVjaW1hbC5zdWJzdHJpbmcoMCwgZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkID0gbGVmdE9mRGVjaW1hbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gbm9ybWFsaXplZC5sYXN0SW5kZXhPZigncycpO1xuICAgICAgICAgICAgdmFyIGlzU2hvcnRGb3JtYXQgPSBpbmRleCA+IC0xO1xuXG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0Q2hhciA9IGxlZnRPZkRlY2ltYWwuY2hhckF0KGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSAnICcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNTaG9ydEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxlYWRpbmdUZXh0ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHJpbmcoMCwgaW5kZXgpIDogJyc7XG4gICAgICAgICAgICB2YXIgcmlnaHRPZlByZWZpeCA9IGlzU2hvcnRGb3JtYXQgPyBmb3JtYXRUWFQuc3Vic3RyKGluZGV4ICsgMSkgOiBmb3JtYXRUWFQuc3Vic3RyKGluZGV4KTtcblxuICAgICAgICAgICAgLy9maXJzdCBjaGVjayB0byBtYWtlIHN1cmUgJ3MnIGlzIGFjdHVhbGx5IHNob3J0IGZvcm1hdCBhbmQgbm90IHBhcnQgb2Ygc29tZSBsZWFkaW5nIHRleHRcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNob3J0Rm9ybWF0VGVzdCA9IC9bMC05IypdLztcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0UmVzdWx0ID0gcmlnaHRPZlByZWZpeC5tYXRjaChzaG9ydEZvcm1hdFRlc3QpO1xuICAgICAgICAgICAgICAgIGlmICghc2hvcnRGb3JtYXRUZXN0UmVzdWx0IHx8IHNob3J0Rm9ybWF0VGVzdFJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy9ubyBzaG9ydCBmb3JtYXQgY2hhcmFjdGVycyBzbyB0aGlzIG11c3QgYmUgbGVhZGluZyB0ZXh0IGllLiAnd2Vla3MgJ1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGxlYWRpbmdUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2lmIChmb3JtYXRUWFQuY2hhckF0KDApID09ICdzJylcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbFNjYWxlID0gbnVtYmVyID09PSAwID8gMCA6IE1hdGguZmxvb3IoTWF0aC5sb2coTWF0aC5hYnMobnVtYmVyKSkgLyAoMyAqIE1hdGguTE4xMCkpO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gKChudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKSkgPCAxMDAwKSA/IHZhbFNjYWxlIDogKHZhbFNjYWxlICsgMSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1heCh2YWxTY2FsZSwgMCk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1pbih2YWxTY2FsZSwgNCk7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyIC8gTWF0aC5wb3coMTAsIDMgKiB2YWxTY2FsZSk7XG4gICAgICAgICAgICAgICAgLy9pZiAoIWlzTmFOKE51bWJlcihmb3JtYXRUWFQuc3Vic3RyKDEpICkgKSApXG5cbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKE51bWJlcihyaWdodE9mUHJlZml4KSkgJiYgcmlnaHRPZlByZWZpeC5pbmRleE9mKCcuJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaW1pdERpZ2l0cyA9IE51bWJlcihyaWdodE9mUHJlZml4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bWJlciA8IE1hdGgucG93KDEwLCBsaW1pdERpZ2l0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIGdldERpZ2l0cyhudW1iZXIsIE51bWJlcihyaWdodE9mUHJlZml4KSkgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHNpZ24gKyBNYXRoLnJvdW5kKG51bWJlcikgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9mb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDEpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBTVUZGSVggPSBnZXRTdWZmaXgoZm9ybWF0VFhUKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cigwLCBmb3JtYXRUWFQubGVuZ3RoIC0gU1VGRklYLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbFdpdGhvdXRMZWFkaW5nID0gZm9ybWF0KCgoc2lnbiA9PT0gJycpID8gMSA6IC0xKSAqIG51bWJlciwgZm9ybWF0VFhUKSArIHNjYWxlc1t2YWxTY2FsZV0gKyBTVUZGSVg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSAmJiBzaWduICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsV2l0aG91dExlYWRpbmcgPSB2YWxXaXRob3V0TGVhZGluZy5zdWJzdHIoc2lnbi5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIHZhbFdpdGhvdXRMZWFkaW5nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3ViRm9ybWF0cyA9IGZvcm1hdFRYVC5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIGRlY2ltYWxzO1xuICAgICAgICAgICAgdmFyIG1pbkRlY2ltYWxzO1xuICAgICAgICAgICAgaWYgKHN1YkZvcm1hdHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBtaW5EZWNpbWFscyA9IHN1YkZvcm1hdHNbMV0ubGVuZ3RoIC0gc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJzArJywgJ2cnKSwgJycpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBzdWJGb3JtYXRzWzBdICsgc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJ1swfCNdKycsICdnJyksICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZml4ZXNUWFQgPSBmb3JtYXRUWFQuc3BsaXQobmV3IFJlZ0V4cCgnWzB8LHwjXSsnLCAnZycpKTtcbiAgICAgICAgICAgIHZhciBwcmVmZml4ID0gZml4ZXNUWFRbMF0udG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBzdWZmaXggPSAoZml4ZXNUWFQubGVuZ3RoID4gMSkgPyBmaXhlc1RYVFsxXS50b1N0cmluZygpIDogJyc7XG5cbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqICgoZm9ybWF0VFhULnNwbGl0KCclJykubGVuZ3RoID4gMSkgPyAxMDAgOiAxKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgaWYgKGZvcm1hdFRYVC5pbmRleE9mKCclJykgIT09IC0xKSBudW1iZXIgPSBudW1iZXIgKiAxMDA7XG4gICAgICAgICAgICBudW1iZXIgPSByb3VuZFRvKG51bWJlciwgZGVjaW1hbHMpO1xuXG4gICAgICAgICAgICBzaWduID0gKG51bWJlciA9PT0gMCkgPyAnJyA6IHNpZ247XG5cbiAgICAgICAgICAgIHZhciBoYXNDb21tYXMgPSAoZm9ybWF0VFhULnN1YnN0cihmb3JtYXRUWFQubGVuZ3RoIC0gNCAtIHN1ZmZpeC5sZW5ndGgsIDEpID09PSAnLCcpO1xuICAgICAgICAgICAgdmFyIGZvcm1hdHRlZCA9IHNpZ24gKyBwcmVmZml4ICsgYWRkRGVjaW1hbHMobnVtYmVyLCBkZWNpbWFscywgbWluRGVjaW1hbHMsIGhhc0NvbW1hcykgKyBzdWZmaXg7XG5cbiAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhvcmlnaW5hbE51bWJlciwgb3JpZ2luYWxGb3JtYXQsIGZvcm1hdHRlZClcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXR0ZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0O1xuICAgIH0oKSlcbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiB2YWwgKyAnJztcbiAgICB9LFxuXG4gICAgdXBwZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgfSxcbiAgICBsb3dlckNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuICh2YWwgKyAnJykudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuICAgIHRpdGxlQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSB2YWwgKyAnJztcbiAgICAgICAgcmV0dXJuIHZhbC5yZXBsYWNlKC9cXHdcXFMqL2csIGZ1bmN0aW9uICh0eHQpIHtyZXR1cm4gdHh0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdHh0LnN1YnN0cigxKS50b0xvd2VyQ2FzZSgpO30pO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0SGFuZGxlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9uby1vcC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvaW5pdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9jaGVja2JveC1yYWRpby1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2lucHV0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vY2xhc3MtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vcG9zaXRpdmUtYm9vbGVhbi1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9uZWdhdGl2ZS1ib29sZWFuLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LWF0dHInKVxuXTtcblxudmFyIGhhbmRsZXJzTGlzdCA9IFtdO1xuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgaWYgKCFub2RlTWF0Y2hlcikge1xuICAgICAgICBub2RlTWF0Y2hlciA9ICcqJztcbiAgICB9XG4gICAgaWYgKF8uaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgICAgICBoYW5kbGVyID0ge1xuICAgICAgICAgICAgaGFuZGxlOiBoYW5kbGVyXG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiAkLmV4dGVuZChoYW5kbGVyLCB7IHRlc3Q6IGF0dHJpYnV0ZU1hdGNoZXIsIHRhcmdldDogbm9kZU1hdGNoZXIgfSk7XG59O1xuXG4kLmVhY2goZGVmYXVsdEhhbmRsZXJzLCBmdW5jdGlvbiAoaW5kZXgsIGhhbmRsZXIpIHtcbiAgICBoYW5kbGVyc0xpc3QucHVzaChub3JtYWxpemUoaGFuZGxlci50ZXN0LCBoYW5kbGVyLnRhcmdldCwgaGFuZGxlcikpO1xufSk7XG5cblxudmFyIG1hdGNoQXR0ciA9IGZ1bmN0aW9uIChtYXRjaEV4cHIsIGF0dHIsICRlbCkge1xuICAgIHZhciBhdHRyTWF0Y2g7XG5cbiAgICBpZiAoXy5pc1N0cmluZyhtYXRjaEV4cHIpKSB7XG4gICAgICAgIGF0dHJNYXRjaCA9IChtYXRjaEV4cHIgPT09ICcqJyB8fCAobWF0Y2hFeHByLnRvTG93ZXJDYXNlKCkgPT09IGF0dHIudG9Mb3dlckNhc2UoKSkpO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKG1hdGNoRXhwcikpIHtcbiAgICAgICAgLy9UT0RPOiByZW1vdmUgZWxlbWVudCBzZWxlY3RvcnMgZnJvbSBhdHRyaWJ1dGVzXG4gICAgICAgIGF0dHJNYXRjaCA9IG1hdGNoRXhwcihhdHRyLCAkZWwpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cChtYXRjaEV4cHIpKSB7XG4gICAgICAgIGF0dHJNYXRjaCA9IGF0dHIubWF0Y2gobWF0Y2hFeHByKTtcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJNYXRjaDtcbn07XG5cbnZhciBtYXRjaE5vZGUgPSBmdW5jdGlvbiAodGFyZ2V0LCBub2RlRmlsdGVyKSB7XG4gICAgcmV0dXJuIChfLmlzU3RyaW5nKG5vZGVGaWx0ZXIpKSA/IChub2RlRmlsdGVyID09PSB0YXJnZXQpIDogbm9kZUZpbHRlci5pcyh0YXJnZXQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaGFuZGxlcnNMaXN0LFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgaGFuZGxlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ3xmdW5jdGlvbnxyZWdleH0gYXR0cmlidXRlTWF0Y2hlciBEZXNjcmlwdGlvbiBvZiB3aGljaCBhdHRyaWJ1dGVzIHRvIG1hdGNoXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBub2RlTWF0Y2hlciAgICAgIFdoaWNoIG5vZGVzIHRvIGFsbCBhdHRyaWJ1dGVzIHRvLiBVc2UganF1ZXJ5IFNlbGVjdG9yIHN5bnRheFxuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gaGFuZGxlciAgICBIYW5kbGVyIGNhbiBlaXRoZXIgYmUgYSBmdW5jdGlvbiAoVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsZW1lbnQgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUpLCBvciBhbiBvYmplY3Qgd2l0aCB7aW5pdDogZm4sICBoYW5kbGU6IGZufS4gVGhlIGluaXQgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbiBwYWdlIGxvYWRzOyB1c2UgdGhpcyB0byBkZWZpbmUgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJzTGlzdC51bnNoaWZ0KG5vcm1hbGl6ZS5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBhbiBhdHRyaWJ1dGUgbWF0Y2hlciBtYXRjaGluZyBzb21lIGNyaXRlcmlhXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBhdHRyRmlsdGVyIGF0dHJpYnV0ZSB0byBtYXRjaFxuICAgICAqIEBwYXJhbSAge3N0cmluZyB8ICRlbH0gbm9kZUZpbHRlciBub2RlIHRvIG1hdGNoXG4gICAgICogQHJldHVybiB7YXJyYXl8bnVsbH1cbiAgICAgKi9cbiAgICBmaWx0ZXI6IGZ1bmN0aW9uIChhdHRyRmlsdGVyLCBub2RlRmlsdGVyKSB7XG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IF8uc2VsZWN0KGhhbmRsZXJzTGlzdCwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaEF0dHIoaGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChub2RlRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWx0ZXJlZCA9IF8uc2VsZWN0KGZpbHRlcmVkLCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaE5vZGUoaGFuZGxlci50YXJnZXQsIG5vZGVGaWx0ZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbiAoYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uIChjdXJyZW50SGFuZGxlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQXR0cihjdXJyZW50SGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKSAmJiBtYXRjaE5vZGUoY3VycmVudEhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBoYW5kbGVyc0xpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbiAocHJvcGVydHksICRlbCkge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSB0aGlzLmZpbHRlcihwcm9wZXJ0eSwgJGVsKTtcbiAgICAgICAgLy9UaGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBtYXRjaGVzLCBidXQgdGhlIHRvcCBmaXJzdCBoYXMgdGhlIG1vc3QgcHJpb3JpdHlcbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkWzBdO1xuICAgIH1cbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICc6Y2hlY2tib3gsOnJhZGlvJyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZXR0YWJsZVZhbHVlID0gdGhpcy5hdHRyKCd2YWx1ZScpOyAvL2luaXRpYWwgdmFsdWVcbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciBpc0NoZWNrZWQgPSAoc2V0dGFibGVWYWx1ZSAhPT0gdW5kZWZpbmVkKSA/IChzZXR0YWJsZVZhbHVlID09IHZhbHVlKSA6ICEhdmFsdWU7XG4gICAgICAgIHRoaXMucHJvcCgnY2hlY2tlZCcsIGlzQ2hlY2tlZCk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBvbGRIVE1MID0gdGhpcy5odG1sKCk7XG4gICAgICAgIHZhciBjbGVhbmVkSFRNTCA9IG9sZEhUTUwucmVwbGFjZSgvJmx0Oy9nLCAnPCcpLnJlcGxhY2UoLyZndDsvZywgJz4nKTtcbiAgICAgICAgdmFyIHZhbHVlVG9UZW1wbGF0ZSA9ICgkLmlzUGxhaW5PYmplY3QodmFsdWUpKSA/IHZhbHVlIDogeyB2YWx1ZTogdmFsdWUgfTtcbiAgICAgICAgdmFyIHRlbXBsYXRlZCA9IF8udGVtcGxhdGUoY2xlYW5lZEhUTUwsIHZhbHVlVG9UZW1wbGF0ZSk7XG4gICAgICAgIGlmIChjbGVhbmVkSFRNTCA9PT0gdGVtcGxhdGVkKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmh0bWwodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5odG1sKHRlbXBsYXRlZCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0YXJnZXQ6ICdpbnB1dCwgc2VsZWN0JyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmFsKHZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdjbGFzcycsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFkZGVkQ2xhc3NlcyA9IHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycpO1xuICAgICAgICBpZiAoIWFkZGVkQ2xhc3Nlcykge1xuICAgICAgICAgICAgYWRkZWRDbGFzc2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFkZGVkQ2xhc3Nlc1twcm9wXSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhhZGRlZENsYXNzZXNbcHJvcF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICd2YWx1ZS0nICsgdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgYWRkZWRDbGFzc2VzW3Byb3BdID0gdmFsdWU7XG4gICAgICAgIC8vRml4bWU6IHByb3AgaXMgYWx3YXlzIFwiY2xhc3NcIlxuICAgICAgICB0aGlzLmFkZENsYXNzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5kYXRhKCdhZGRlZC1jbGFzc2VzJywgYWRkZWRDbGFzc2VzKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICcqJyxcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi0nKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIHN0b3BMaXN0ZW5pbmc6IGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2UoJ29uLScsICcnKTtcbiAgICAgICAgdGhpcy5vZmYoYXR0cik7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHRoaXMub2ZmKGF0dHIpLm9uKGF0dHIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3MgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7IG9wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiBmdW5jdGlvbiAoYXR0ciwgJG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoJ29uLWluaXQnKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi1pbml0JywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3MgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7IG9wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgcGFyc2VVdGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uL3V0aWxzL3BhcnNlLXV0aWxzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdmb3JlYWNoJyxcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgdmFsdWUgPSAoJC5pc1BsYWluT2JqZWN0KHZhbHVlKSA/IHZhbHVlIDogW10uY29uY2F0KHZhbHVlKSk7XG4gICAgICAgIHZhciAkbG9vcFRlbXBsYXRlID0gdGhpcy5kYXRhKCdmb3JlYWNoLXRlbXBsYXRlJyk7XG4gICAgICAgIGlmICghJGxvb3BUZW1wbGF0ZSkge1xuICAgICAgICAgICAgJGxvb3BUZW1wbGF0ZSA9IHRoaXMuY2hpbGRyZW4oKTtcbiAgICAgICAgICAgIHRoaXMuZGF0YSgnZm9yZWFjaC10ZW1wbGF0ZScsICRsb29wVGVtcGxhdGUpO1xuICAgICAgICB9XG4gICAgICAgIHZhciAkbWUgPSB0aGlzLmVtcHR5KCk7XG4gICAgICAgIF8uZWFjaCh2YWx1ZSwgZnVuY3Rpb24gKGRhdGF2YWwsIGRhdGFrZXkpIHtcbiAgICAgICAgICAgIGRhdGF2YWwgPSBkYXRhdmFsICsgJyc7XG4gICAgICAgICAgICB2YXIgbm9kZXMgPSAkbG9vcFRlbXBsYXRlLmNsb25lKCk7XG4gICAgICAgICAgICBub2Rlcy5lYWNoKGZ1bmN0aW9uIChpLCBuZXdOb2RlKSB7XG4gICAgICAgICAgICAgICAgbmV3Tm9kZSA9ICQobmV3Tm9kZSk7XG4gICAgICAgICAgICAgICAgXy5lYWNoKG5ld05vZGUuZGF0YSgpLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlZCA9ICBfLnRlbXBsYXRlKHZhbCwgeyB2YWx1ZTogZGF0YXZhbCwgaW5kZXg6IGRhdGFrZXksIGtleTogZGF0YWtleSB9KTtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5kYXRhKGtleSwgcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSh0ZW1wbGF0ZWQpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB2YXIgb2xkSFRNTCA9IG5ld05vZGUuaHRtbCgpO1xuICAgICAgICAgICAgICAgIHZhciBjbGVhbmVkSFRNTCA9IG9sZEhUTUwucmVwbGFjZSgvJmx0Oy9nLCAnPCcpLnJlcGxhY2UoLyZndDsvZywgJz4nKTtcbiAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGVkID0gXy50ZW1wbGF0ZShjbGVhbmVkSFRNTCwgeyB2YWx1ZTogZGF0YXZhbCwga2V5OiBkYXRha2V5LCBpbmRleDogZGF0YWtleSB9KTtcbiAgICAgICAgICAgICAgICBpZiAoY2xlYW5lZEhUTUwgPT09IHRlbXBsYXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdOb2RlLmh0bWwoZGF0YXZhbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5odG1sKHRlbXBsYXRlZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRtZS5hcHBlbmQobmV3Tm9kZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86ZGlzYWJsZWR8aGlkZGVufHJlYWRvbmx5KSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCAhdmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIEF0dHJpYnV0ZXMgd2hpY2ggYXJlIGp1c3QgcGFyYW1ldGVycyB0byBvdGhlcnMgYW5kIGNhbiBqdXN0IGJlIGlnbm9yZWRcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/Om1vZGVsfGNvbnZlcnQpJC9pLFxuXG4gICAgaGFuZGxlOiAkLm5vb3AsXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86Y2hlY2tlZHxzZWxlY3RlZHxhc3luY3xhdXRvZm9jdXN8YXV0b3BsYXl8Y29udHJvbHN8ZGVmZXJ8aXNtYXB8bG9vcHxtdWx0aXBsZXxvcGVufHJlcXVpcmVkfHNjb3BlZCkkL2ksXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICAvKmpzbGludCBlcWVxOiB0cnVlKi9cbiAgICAgICAgdmFyIHZhbCA9ICh0aGlzLmF0dHIoJ3ZhbHVlJykpID8gKHZhbHVlID09IHRoaXMucHJvcCgndmFsdWUnKSkgOiAhIXZhbHVlO1xuICAgICAgICB0aGlzLnByb3AocHJvcCwgdmFsKTtcbiAgICB9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbiAgICB2YXIgbm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL25vZGVzL25vZGUtbWFuYWdlcicpO1xuICAgIHZhciBhdHRyTWFuYWdlciA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcy9hdHRyaWJ1dGUtbWFuYWdlcicpO1xuICAgIHZhciBjb252ZXJ0ZXJNYW5hZ2VyID0gcmVxdWlyZSgnLi4vY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlcicpO1xuXG4gICAgdmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9wYXJzZS11dGlscycpO1xuICAgIHZhciBkb21VdGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL2RvbScpO1xuXG4gICAgdmFyIGF1dG9VcGRhdGVQbHVnaW4gPSByZXF1aXJlKCcuL3BsdWdpbnMvYXV0by11cGRhdGUtYmluZGluZ3MnKTtcblxuICAgIC8vSnF1ZXJ5IHNlbGVjdG9yIHRvIHJldHVybiBldmVyeXRoaW5nIHdoaWNoIGhhcyBhIGYtIHByb3BlcnR5IHNldFxuICAgICQuZXhwclsnOiddW2NvbmZpZy5wcmVmaXhdID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKG9iaik7XG4gICAgICAgIHZhciBkYXRhcHJvcHMgPSBfLmtleXMoJHRoaXMuZGF0YSgpKTtcblxuICAgICAgICB2YXIgbWF0Y2ggPSBfLmZpbmQoZGF0YXByb3BzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoY29uZmlnLnByZWZpeCkgPT09IDApO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gISEobWF0Y2gpO1xuICAgIH07XG5cbiAgICAkLmV4cHJbJzonXS53ZWJjb21wb25lbnQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmoubm9kZU5hbWUuaW5kZXhPZignLScpICE9PSAtMTtcbiAgICB9O1xuXG4gICAgdmFyIGdldE1hdGNoaW5nRWxlbWVudHMgPSBmdW5jdGlvbiAocm9vdCkge1xuICAgICAgICB2YXIgJHJvb3QgPSAkKHJvb3QpO1xuICAgICAgICB2YXIgbWF0Y2hlZEVsZW1lbnRzID0gJHJvb3QuZmluZCgnOicgKyBjb25maWcucHJlZml4KTtcbiAgICAgICAgaWYgKCRyb290LmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICBtYXRjaGVkRWxlbWVudHMgPSBtYXRjaGVkRWxlbWVudHMuYWRkKCRyb290KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWF0Y2hlZEVsZW1lbnRzO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0RWxlbWVudE9yRXJyb3IgPSBmdW5jdGlvbiAoZWxlbWVudCwgY29udGV4dCkge1xuICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mICQpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LmdldCgwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWVsZW1lbnQgfHwgIWVsZW1lbnQubm9kZU5hbWUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoY29udGV4dCwgJ0V4cGVjdGVkIHRvIGdldCBET00gRWxlbWVudCwgZ290ICcsIGVsZW1lbnQpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGNvbnRleHQgKyAnOiBFeHBlY3RlZCB0byBnZXQgRE9NIEVsZW1lbnQsIGdvdCcgKyAodHlwZW9mIGVsZW1lbnQpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcblxuICAgICAgICBub2Rlczogbm9kZU1hbmFnZXIsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJNYW5hZ2VyLFxuICAgICAgICBjb252ZXJ0ZXJzOiBjb252ZXJ0ZXJNYW5hZ2VyLFxuICAgICAgICAvL3V0aWxzIGZvciB0ZXN0aW5nXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIG1hdGNoZWRFbGVtZW50czogW11cbiAgICAgICAgfSxcblxuICAgICAgICB1bmJpbmRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCwgY2hhbm5lbCkge1xuICAgICAgICAgICAgaWYgKCFjaGFubmVsKSB7XG4gICAgICAgICAgICAgICAgY2hhbm5lbCA9IHRoaXMub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsZW1lbnQgPSBnZXRFbGVtZW50T3JFcnJvcihlbGVtZW50KTtcbiAgICAgICAgICAgIHZhciAkZWwgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKCEkZWwuaXMoJzonICsgY29uZmlnLnByZWZpeCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzID0gXy53aXRob3V0KHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMsIGVsZW1lbnQpO1xuXG4gICAgICAgICAgICAvL0ZJWE1FOiBoYXZlIHRvIHJlYWRkIGV2ZW50cyB0byBiZSBhYmxlIHRvIHJlbW92ZSB0aGVtLiBVZ2x5XG4gICAgICAgICAgICB2YXIgSGFuZGxlciA9IG5vZGVNYW5hZ2VyLmdldEhhbmRsZXIoJGVsKTtcbiAgICAgICAgICAgIHZhciBoID0gbmV3IEhhbmRsZXIuaGFuZGxlKHtcbiAgICAgICAgICAgICAgICBlbDogZWxlbWVudFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoaC5yZW1vdmVFdmVudHMpIHtcbiAgICAgICAgICAgICAgICBoLnJlbW92ZUV2ZW50cygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkKGVsZW1lbnQuYXR0cmlidXRlcykuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG5vZGVNYXApIHtcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IG5vZGVNYXAubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIHdhbnRlZFByZWZpeCA9ICdkYXRhLWYtJztcbiAgICAgICAgICAgICAgICBpZiAoYXR0ci5pbmRleE9mKHdhbnRlZFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSh3YW50ZWRQcmVmaXgsICcnKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIoYXR0ciwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZXIuc3RvcExpc3RlbmluZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5zdG9wTGlzdGVuaW5nLmNhbGwoJGVsLCBhdHRyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgc3Vic2lkID0gJGVsLmRhdGEoJ2Ytc3Vic2NyaXB0aW9uLWlkJykgfHwgW107XG4gICAgICAgICAgICBfLmVhY2goc3Vic2lkLCBmdW5jdGlvbiAoc3Vicykge1xuICAgICAgICAgICAgICAgIGNoYW5uZWwudW5zdWJzY3JpYmUoc3Vicyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBiaW5kRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQsIGNoYW5uZWwpIHtcbiAgICAgICAgICAgIGlmICghY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgIGNoYW5uZWwgPSB0aGlzLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtZW50ID0gZ2V0RWxlbWVudE9yRXJyb3IoZWxlbWVudCk7XG4gICAgICAgICAgICB2YXIgJGVsID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGlmICghJGVsLmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfLmNvbnRhaW5zKHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMsIGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL1NlbmQgdG8gbm9kZSBtYW5hZ2VyIHRvIGhhbmRsZSB1aSBjaGFuZ2VzXG4gICAgICAgICAgICB2YXIgSGFuZGxlciA9IG5vZGVNYW5hZ2VyLmdldEhhbmRsZXIoJGVsKTtcbiAgICAgICAgICAgIG5ldyBIYW5kbGVyLmhhbmRsZSh7XG4gICAgICAgICAgICAgICAgZWw6IGVsZW1lbnRcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgc3Vic2NyaWJlID0gZnVuY3Rpb24gKGNoYW5uZWwsIHZhcnNUb0JpbmQsICRlbCwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmICghdmFyc1RvQmluZCB8fCAhdmFyc1RvQmluZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgc3Vic2lkID0gY2hhbm5lbC5zdWJzY3JpYmUodmFyc1RvQmluZCwgJGVsLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3c3VicyA9ICgkZWwuZGF0YSgnZi1zdWJzY3JpcHRpb24taWQnKSB8fCBbXSkuY29uY2F0KHN1YnNpZCk7XG4gICAgICAgICAgICAgICAgJGVsLmRhdGEoJ2Ytc3Vic2NyaXB0aW9uLWlkJywgbmV3c3Vicyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgYXR0ckJpbmRpbmdzID0gW107XG4gICAgICAgICAgICB2YXIgbm9uQmF0Y2hhYmxlVmFyaWFibGVzID0gW107XG4gICAgICAgICAgICAvL05PVEU6IGxvb3BpbmcgdGhyb3VnaCBhdHRyaWJ1dGVzIGluc3RlYWQgb2YgLmRhdGEgYmVjYXVzZSAuZGF0YSBhdXRvbWF0aWNhbGx5IGNhbWVsY2FzZXMgcHJvcGVydGllcyBhbmQgbWFrZSBpdCBoYXJkIHRvIHJldHJ2aWV2ZVxuICAgICAgICAgICAgJChlbGVtZW50LmF0dHJpYnV0ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBub2RlTWFwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBub2RlTWFwLm5vZGVOYW1lO1xuICAgICAgICAgICAgICAgIHZhciBhdHRyVmFsID0gbm9kZU1hcC52YWx1ZTtcblxuICAgICAgICAgICAgICAgIHZhciB3YW50ZWRQcmVmaXggPSAnZGF0YS1mLSc7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIuaW5kZXhPZih3YW50ZWRQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2Uod2FudGVkUHJlZml4LCAnJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKGF0dHIsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpc0JpbmRhYmxlQXR0ciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyICYmIGhhbmRsZXIuaW5pdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNCaW5kYWJsZUF0dHIgPSBoYW5kbGVyLmluaXQuY2FsbCgkZWwsIGF0dHIsIGF0dHJWYWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQmluZGFibGVBdHRyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL0NvbnZlcnQgcGlwZXMgdG8gY29udmVydGVyIGF0dHJzXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2l0aENvbnYgPSBfLmludm9rZShhdHRyVmFsLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAod2l0aENvbnYubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJWYWwgPSB3aXRoQ29udi5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlbC5kYXRhKCdmLWNvbnZlcnQtJyArIGF0dHIsIHdpdGhDb252KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJpbmRpbmcgPSB7IGF0dHI6IGF0dHIgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb21tYVJlZ2V4ID0gLywoPyFbXlxcW10qXFxdKS87XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0clZhbC5pbmRleE9mKCc8JScpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQXNzdW1lIGl0J3MgdGVtcGxhdGVkIGZvciBsYXRlciB1c2VcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhdHRyVmFsLnNwbGl0KGNvbW1hUmVnZXgpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFyc1RvQmluZCA9IF8uaW52b2tlKGF0dHJWYWwuc3BsaXQoY29tbWFSZWdleCksICd0cmltJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlKGNoYW5uZWwsIHZhcnNUb0JpbmQsICRlbCwgeyBiYXRjaDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaW5kaW5nLnRvcGljcyA9IHZhcnNUb0JpbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJpbmRpbmcudG9waWNzID0gW2F0dHJWYWxdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vbkJhdGNoYWJsZVZhcmlhYmxlcy5wdXNoKGF0dHJWYWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckJpbmRpbmdzLnB1c2goYmluZGluZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRlbC5kYXRhKCdhdHRyLWJpbmRpbmdzJywgYXR0ckJpbmRpbmdzKTtcbiAgICAgICAgICAgIGlmIChub25CYXRjaGFibGVWYXJpYWJsZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3N1YnNjcmliZScsIG5vbkJhdGNoYWJsZVZhcmlhYmxlcywgJGVsLmdldCgwKSlcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmUoY2hhbm5lbCwgbm9uQmF0Y2hhYmxlVmFyaWFibGVzLCAkZWwsIHsgYmF0Y2g6IGZhbHNlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBCaW5kIGFsbCBwcm92aWRlZCBlbGVtZW50c1xuICAgICAgICAgKiBAcGFyYW0gIHtBcnJheXxqUXVlcnlTZWxlY3Rvcn0gZWxlbWVudHNUb0JpbmQgKE9wdGlvbmFsKSBJZiBub3QgcHJvdmlkZWQgdXNlcyB0aGUgZGVmYXVsdCByb290IHByb3ZpZGVkIGF0IGluaXRpYWxpemF0aW9uXG4gICAgICAgICAqL1xuICAgICAgICBiaW5kQWxsOiBmdW5jdGlvbiAoZWxlbWVudHNUb0JpbmQpIHtcbiAgICAgICAgICAgIGlmICghZWxlbWVudHNUb0JpbmQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvQmluZCA9IGdldE1hdGNoaW5nRWxlbWVudHModGhpcy5vcHRpb25zLnJvb3QpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghXy5pc0FycmF5KGVsZW1lbnRzVG9CaW5kKSkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzVG9CaW5kID0gZ2V0TWF0Y2hpbmdFbGVtZW50cyhlbGVtZW50c1RvQmluZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICAvL3BhcnNlIHRocm91Z2ggZG9tIGFuZCBmaW5kIGV2ZXJ5dGhpbmcgd2l0aCBtYXRjaGluZyBhdHRyaWJ1dGVzXG4gICAgICAgICAgICAkLmVhY2goZWxlbWVudHNUb0JpbmQsIGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIG1lLmJpbmRFbGVtZW50LmNhbGwobWUsIGVsZW1lbnQsIG1lLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVbmJpbmQgcHJvdmlkZWQgZWxlbWVudHNcbiAgICAgICAgICogQHBhcmFtICB7QXJyYXl9IGVsZW1lbnRzVG9VbmJpbmQgKE9wdGlvbmFsKS4gSWYgbm90IHByb3ZpZGVkIHVuYmluZHMgZXZlcnl0aGluZ1xuICAgICAgICAgKi9cbiAgICAgICAgdW5iaW5kQWxsOiBmdW5jdGlvbiAoZWxlbWVudHNUb1VuYmluZCkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIGlmICghZWxlbWVudHNUb1VuYmluZCkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzVG9VbmJpbmQgPSB0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJC5lYWNoKGVsZW1lbnRzVG9VbmJpbmQsIGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIG1lLnVuYmluZEVsZW1lbnQuY2FsbChtZSwgZWxlbWVudCwgbWUub3B0aW9ucy5jaGFubmVsLnZhcmlhYmxlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBjaGFubmVsOiBudWxsLFxuICAgICAgICAgICAgICAgIHBsdWdpbnM6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgJC5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICB2YXIgY2hhbm5lbCA9IGRlZmF1bHRzLmNoYW5uZWw7XG5cbiAgICAgICAgICAgIHRoaXMub3B0aW9ucyA9IGRlZmF1bHRzO1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdmFyICRyb290ID0gJChkZWZhdWx0cy5yb290KTtcbiAgICAgICAgICAgICQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIG1lLmJpbmRBbGwoKTtcbiAgICAgICAgICAgICAgICAkcm9vdC50cmlnZ2VyKCdmLmRvbXJlYWR5Jyk7XG5cbiAgICAgICAgICAgICAgICAvL0F0dGFjaCBsaXN0ZW5lcnNcbiAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIGNoYW5nZXMgdG8gdWkgYW5kIHB1Ymxpc2ggdG8gYXBpXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKGNvbmZpZy5ldmVudHMudHJpZ2dlcikub24oY29uZmlnLmV2ZW50cy50cmlnZ2VyLCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJzZWREYXRhID0ge307IC8vaWYgbm90IGFsbCBzdWJzZXF1ZW50IGxpc3RlbmVycyB3aWxsIGdldCB0aGUgbW9kaWZpZWQgZGF0YVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAgZG9tVXRpbHMuZ2V0Q29udmVydGVyc0xpc3QoJGVsLCAnYmluZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleSA9IGtleS5zcGxpdCgnfCcpWzBdLnRyaW0oKTsgLy9pbiBjYXNlIHRoZSBwaXBlIGZvcm1hdHRpbmcgc3ludGF4IHdhcyB1c2VkXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBjb252ZXJ0ZXJNYW5hZ2VyLnBhcnNlKHZhbCwgYXR0ckNvbnZlcnRlcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkRGF0YVtrZXldID0gcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSh2YWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwudHJpZ2dlcignZi5jb252ZXJ0JywgeyBiaW5kOiB2YWwgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2gocGFyc2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIGNoYW5nZXMgZnJvbSBhcGkgYW5kIHVwZGF0ZSB1aVxuICAgICAgICAgICAgICAgICRyb290Lm9mZihjb25maWcuZXZlbnRzLnJlYWN0KS5vbihjb25maWcuZXZlbnRzLnJlYWN0LCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGV2dC50YXJnZXQsIGRhdGEsIFwicm9vdCBvblwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9ICRlbC5kYXRhKCdhdHRyLWJpbmRpbmdzJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRvY29udmVydCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24gKHZhcmlhYmxlTmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZWFjaChiaW5kaW5ncywgZnVuY3Rpb24gKGJpbmRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5jb250YWlucyhiaW5kaW5nLnRvcGljcywgdmFyaWFibGVOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmluZGluZy50b3BpY3MubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9jb252ZXJ0W2JpbmRpbmcuYXR0cl0gPSBfLnBpY2soZGF0YSwgYmluZGluZy50b3BpY3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9jb252ZXJ0W2JpbmRpbmcuYXR0cl0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgJGVsLnRyaWdnZXIoJ2YuY29udmVydCcsIHRvY29udmVydCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBkYXRhID0ge3Byb3B0b3VwZGF0ZTogdmFsdWV9IHx8IGp1c3QgYSB2YWx1ZSAoYXNzdW1lcyAnYmluZCcgaWYgc28pXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLmNvbnZlcnQnKS5vbignZi5jb252ZXJ0JywgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnZlcnQgPSBmdW5jdGlvbiAodmFsLCBwcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wID0gcHJvcC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gIGRvbVV0aWxzLmdldENvbnZlcnRlcnNMaXN0KCRlbCwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIocHJvcCwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ZWRWYWx1ZSA9IGNvbnZlcnRlck1hbmFnZXIuY29udmVydCh2YWwsIGF0dHJDb252ZXJ0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuaGFuZGxlLmNhbGwoJGVsLCBjb252ZXJ0ZWRWYWx1ZSwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEsIGNvbnZlcnQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udmVydChkYXRhLCAnYmluZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoJ2YudWkub3BlcmF0ZScpLm9uKCdmLnVpLm9wZXJhdGUnLCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGF0YSk7IC8vaWYgbm90IGFsbCBzdWJzZXF1ZW50IGxpc3RlbmVycyB3aWxsIGdldCB0aGUgbW9kaWZpZWQgZGF0YVxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YS5vcGVyYXRpb25zLCBmdW5jdGlvbiAob3BuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIG9wbi5wYXJhbXMgPSBfLm1hcChvcG4ucGFyYW1zLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSgkLnRyaW0odmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobWUub3B0aW9ucy5wbHVnaW5zLmF1dG9VcGRhdGVCaW5kaW5ncykge1xuICAgICAgICAgICAgICAgICAgICBhdXRvVXBkYXRlUGx1Z2luKCRyb290LmdldCgwKSwgbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufSgpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGV4dGVuZCA9IGZ1bmN0aW9uIChwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIHZhciBjaGlsZDtcblxuICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIG5ldyBzdWJjbGFzcyBpcyBlaXRoZXIgZGVmaW5lZCBieSB5b3VcbiAgICAvLyAodGhlIFwiY29uc3RydWN0b3JcIiBwcm9wZXJ0eSBpbiB5b3VyIGBleHRlbmRgIGRlZmluaXRpb24pLCBvciBkZWZhdWx0ZWRcbiAgICAvLyBieSB1cyB0byBzaW1wbHkgY2FsbCB0aGUgcGFyZW50J3MgY29uc3RydWN0b3IuXG4gICAgaWYgKHByb3RvUHJvcHMgJiYgXy5oYXMocHJvdG9Qcm9wcywgJ2NvbnN0cnVjdG9yJykpIHtcbiAgICAgICAgY2hpbGQgPSBwcm90b1Byb3BzLmNvbnN0cnVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNoaWxkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gcGFyZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH07XG4gICAgfVxuXG4gICAgLy8gQWRkIHN0YXRpYyBwcm9wZXJ0aWVzIHRvIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiwgaWYgc3VwcGxpZWQuXG4gICAgXy5leHRlbmQoY2hpbGQsIHBhcmVudCwgc3RhdGljUHJvcHMpO1xuXG4gICAgLy8gU2V0IHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gaW5oZXJpdCBmcm9tIGBwYXJlbnRgLCB3aXRob3V0IGNhbGxpbmdcbiAgICAvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgIHZhciBTdXJyb2dhdGUgPSBmdW5jdGlvbiAoKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfTtcbiAgICBTdXJyb2dhdGUucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBuZXcgU3Vycm9nYXRlKCk7XG5cbiAgICAvLyBBZGQgcHJvdG90eXBlIHByb3BlcnRpZXMgKGluc3RhbmNlIHByb3BlcnRpZXMpIHRvIHRoZSBzdWJjbGFzcyxcbiAgICAvLyBpZiBzdXBwbGllZC5cbiAgICBpZiAocHJvdG9Qcm9wcykge1xuICAgICAgICBfLmV4dGVuZChjaGlsZC5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIH1cblxuICAgIC8vIFNldCBhIGNvbnZlbmllbmNlIHByb3BlcnR5IGluIGNhc2UgdGhlIHBhcmVudCdzIHByb3RvdHlwZSBpcyBuZWVkZWRcbiAgICAvLyBsYXRlci5cbiAgICBjaGlsZC5fX3N1cGVyX18gPSBwYXJlbnQucHJvdG90eXBlO1xuXG4gICAgcmV0dXJuIGNoaWxkO1xufTtcblxudmFyIFZpZXcgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHRoaXMuJGVsID0gKG9wdGlvbnMuJGVsKSB8fCAkKG9wdGlvbnMuZWwpO1xuICAgIHRoaXMuZWwgPSBvcHRpb25zLmVsO1xuICAgIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG59O1xuXG5fLmV4dGVuZChWaWV3LnByb3RvdHlwZSwge1xuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHt9LFxufSk7XG5cblZpZXcuZXh0ZW5kID0gZXh0ZW5kO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vLi4vY29uZmlnJyk7XG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2RlZmF1bHQtbm9kZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgcHJvcGVydHlIYW5kbGVyczogW10sXG5cbiAgICB1aUNoYW5nZUV2ZW50OiAnY2hhbmdlJyxcbiAgICBnZXRVSVZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC52YWwoKTtcbiAgICB9LFxuXG4gICAgcmVtb3ZlRXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuJGVsLm9mZih0aGlzLnVpQ2hhbmdlRXZlbnQpO1xuICAgIH0sXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHZhciBwcm9wTmFtZSA9IHRoaXMuJGVsLmRhdGEoY29uZmlnLmJpbmRlckF0dHIpO1xuXG4gICAgICAgIGlmIChwcm9wTmFtZSkge1xuICAgICAgICAgICAgdGhpcy4kZWwub2ZmKHRoaXMudWlDaGFuZ2VFdmVudCkub24odGhpcy51aUNoYW5nZUV2ZW50LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IG1lLmdldFVJVmFsdWUoKTtcblxuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICBwYXJhbXNbcHJvcE5hbWVdID0gdmFsO1xuXG4gICAgICAgICAgICAgICAgbWUuJGVsLnRyaWdnZXIoY29uZmlnLmV2ZW50cy50cmlnZ2VyLCBwYXJhbXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgQmFzZVZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59LCB7IHNlbGVjdG9yOiAnaW5wdXQsIHNlbGVjdCcgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vYmFzZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgcHJvcGVydHlIYW5kbGVyczogW1xuXG4gICAgXSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB9XG59LCB7IHNlbGVjdG9yOiAnKicgfSk7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCh7XG5cbiAgICBwcm9wZXJ0eUhhbmRsZXJzOiBbXG5cbiAgICBdLFxuXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGVsID0gdGhpcy4kZWw7XG4gICAgICAgIC8vVE9ETzogZmlsZSBhIGlzc3VlIGZvciB0aGUgdmVuc2ltIG1hbmFnZXIgdG8gY29udmVydCB0cnVlcyB0byAxcyBhbmQgc2V0IHRoaXMgdG8gdHJ1ZSBhbmQgZmFsc2VcblxuICAgICAgICB2YXIgb2ZmVmFsID0gICgkZWwuZGF0YSgnZi1vZmYnKSAhPT0gdW5kZWZpbmVkKSA/ICRlbC5kYXRhKCdmLW9mZicpIDogMDtcbiAgICAgICAgLy9hdHRyID0gaW5pdGlhbCB2YWx1ZSwgcHJvcCA9IGN1cnJlbnQgdmFsdWVcbiAgICAgICAgdmFyIG9uVmFsID0gKCRlbC5hdHRyKCd2YWx1ZScpICE9PSB1bmRlZmluZWQpID8gJGVsLnByb3AoJ3ZhbHVlJyk6IDE7XG5cbiAgICAgICAgdmFyIHZhbCA9ICgkZWwuaXMoJzpjaGVja2VkJykpID8gb25WYWwgOiBvZmZWYWw7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJzpjaGVja2JveCw6cmFkaW8nIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgICAgICBoYW5kbGVyID0ge1xuICAgICAgICAgICAgaGFuZGxlOiBoYW5kbGVyXG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgc2VsZWN0b3IgPSAnKic7XG4gICAgfVxuICAgIGhhbmRsZXIuc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiAgICByZXR1cm4gaGFuZGxlcjtcbn07XG5cbnZhciBtYXRjaCA9IGZ1bmN0aW9uICh0b01hdGNoLCBub2RlKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcodG9NYXRjaCkpIHtcbiAgICAgICAgcmV0dXJuIHRvTWF0Y2ggPT09IG5vZGUuc2VsZWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICQodG9NYXRjaCkuaXMobm9kZS5zZWxlY3Rvcik7XG4gICAgfVxufTtcblxudmFyIG5vZGVNYW5hZ2VyID0ge1xuICAgIGxpc3Q6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IG5vZGUgaGFuZGxlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gc2VsZWN0b3IgalF1ZXJ5LWNvbXBhdGlibGUgc2VsZWN0b3IgdG8gdXNlIHRvIG1hdGNoIG5vZGVzXG4gICAgICogQHBhcmFtICB7ZnVuY3Rpb259IGhhbmRsZXIgIEhhbmRsZXJzIGFyZSBuZXctYWJsZSBmdW5jdGlvbnMuIFRoZXkgd2lsbCBiZSBjYWxsZWQgd2l0aCAkZWwgYXMgY29udGV4dC4/IFRPRE86IFRoaW5rIHRoaXMgdGhyb3VnaFxuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5saXN0LnVuc2hpZnQobm9ybWFsaXplKHNlbGVjdG9yLCBoYW5kbGVyKSk7XG4gICAgfSxcblxuICAgIGdldEhhbmRsZXI6IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaChzZWxlY3Rvciwgbm9kZSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2godGhpcy5saXN0LCBmdW5jdGlvbiAoY3VycmVudEhhbmRsZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gY3VycmVudEhhbmRsZXIuc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5saXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKHNlbGVjdG9yLCBoYW5kbGVyKSk7XG4gICAgfVxufTtcblxuLy9ib290c3RyYXBzXG52YXIgZGVmYXVsdEhhbmRsZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vaW5wdXQtY2hlY2tib3gtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1pbnB1dC1ub2RlJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKVxuXTtcbl8uZWFjaChkZWZhdWx0SGFuZGxlcnMucmV2ZXJzZSgpLCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgIG5vZGVNYW5hZ2VyLnJlZ2lzdGVyKGhhbmRsZXIuc2VsZWN0b3IsIGhhbmRsZXIpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbm9kZU1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHRhcmdldCwgZG9tTWFuYWdlcikge1xuICAgIGlmICghd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBhbiBvYnNlcnZlciBpbnN0YW5jZVxuICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uIChtdXRhdGlvbnMpIHtcbiAgICAgIG11dGF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChtdXRhdGlvbikge1xuICAgICAgICB2YXIgYWRkZWQgPSAkKG11dGF0aW9uLmFkZGVkTm9kZXMpLmZpbmQoJzpmJyk7XG4gICAgICAgIGFkZGVkID0gYWRkZWQuYWRkKCQobXV0YXRpb24uYWRkZWROb2RlcykuZmlsdGVyKCc6ZicpKTtcblxuICAgICAgICB2YXIgcmVtb3ZlZCA9ICQobXV0YXRpb24ucmVtb3ZlZE5vZGVzKS5maW5kKCc6ZicpO1xuICAgICAgICByZW1vdmVkID0gcmVtb3ZlZC5hZGQoJChtdXRhdGlvbi5yZW1vdmVkTm9kZXMpLmZpbHRlcignOmYnKSk7XG5cbiAgICAgICAgaWYgKGFkZGVkICYmIGFkZGVkLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ211dGF0aW9uIG9ic2VydmVyIGFkZGVkJywgYWRkZWQuZ2V0KCksIG11dGF0aW9uLmFkZGVkTm9kZXMpO1xuICAgICAgICAgICAgZG9tTWFuYWdlci5iaW5kQWxsKGFkZGVkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVtb3ZlZCAmJiByZW1vdmVkLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ211dGF0aW9uIG9ic2VydmVyIHJlbW92ZWQnLCByZW1vdmVkKTtcbiAgICAgICAgICAgIGRvbU1hbmFnZXIudW5iaW5kQWxsKHJlbW92ZWQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBtdXRjb25maWcgPSB7XG4gICAgICAgIGF0dHJpYnV0ZXM6IGZhbHNlLFxuICAgICAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgICAgIHN1YnRyZWU6IHRydWUsXG4gICAgICAgIGNoYXJhY3RlckRhdGE6IGZhbHNlXG4gICAgfTtcbiAgICBvYnNlcnZlci5vYnNlcnZlKHRhcmdldCwgbXV0Y29uZmlnKTtcbiAgICAvLyBMYXRlciwgeW91IGNhbiBzdG9wIG9ic2VydmluZ1xuICAgIC8vIG9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkb21NYW5hZ2VyID0gcmVxdWlyZSgnLi9kb20vZG9tLW1hbmFnZXInKTtcbnZhciBDaGFubmVsID0gcmVxdWlyZSgnLi9jaGFubmVscy9ydW4tY2hhbm5lbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkb206IGRvbU1hbmFnZXIsXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgIHZhciBtb2RlbCA9ICQoJ2JvZHknKS5kYXRhKCdmLW1vZGVsJyk7XG5cbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgY2hhbm5lbDoge1xuICAgICAgICAgICAgICAgIHJ1bjoge1xuICAgICAgICAgICAgICAgICAgICBhY2NvdW50OiAnJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvamVjdDogJycsXG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOiBtb2RlbCxcblxuICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG9tOiB7XG4gICAgICAgICAgICAgICAgcm9vdDogJ2JvZHknLFxuICAgICAgICAgICAgICAgIHBsdWdpbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXV0b1VwZGF0ZUJpbmRpbmdzOiB0cnVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25maWcpO1xuICAgICAgICBpZiAoY29uZmlnICYmIGNvbmZpZy5jaGFubmVsICYmIChjb25maWcuY2hhbm5lbCBpbnN0YW5jZW9mIENoYW5uZWwpKSB7XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwgPSBjb25maWcuY2hhbm5lbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IG5ldyBDaGFubmVsKG9wdGlvbnMuY2hhbm5lbCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgJHJvb3QgPSAkKG9wdGlvbnMuZG9tLnJvb3QpO1xuICAgICAgICB2YXIgaW5pdEZuID0gJHJvb3QuZGF0YSgnZi1vbi1pbml0Jyk7XG4gICAgICAgIHZhciBvcG5TaWxlbnQgPSBvcHRpb25zLmNoYW5uZWwucnVuLm9wZXJhdGlvbnMuc2lsZW50O1xuICAgICAgICB2YXIgaXNJbml0T3BlcmF0aW9uU2lsZW50ID0gaW5pdEZuICYmIChvcG5TaWxlbnQgPT09IHRydWUgfHwgKF8uaXNBcnJheShvcG5TaWxlbnQpICYmIF8uY29udGFpbnMob3BuU2lsZW50LCBpbml0Rm4pKSk7XG4gICAgICAgIHZhciBwcmVGZXRjaFZhcmlhYmxlcyA9ICFpbml0Rm4gfHwgaXNJbml0T3BlcmF0aW9uU2lsZW50O1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgIGlmIChwcmVGZXRjaFZhcmlhYmxlcykge1xuICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLmRvbXJlYWR5Jykub24oJ2YuZG9tcmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbWUuY2hhbm5lbC52YXJpYWJsZXMucmVmcmVzaChudWxsLCB0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tTWFuYWdlci5pbml0aWFsaXplKCQuZXh0ZW5kKHRydWUsIHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHRoaXMuY2hhbm5lbFxuICAgICAgICB9LCBvcHRpb25zLmRvbSkpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgbWF0Y2g6IGZ1bmN0aW9uIChtYXRjaEV4cHIsIG1hdGNoVmFsdWUsIGNvbnRleHQpIHtcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcobWF0Y2hFeHByKSkge1xuICAgICAgICAgICAgcmV0dXJuIChtYXRjaEV4cHIgPT09ICcqJyB8fCAobWF0Y2hFeHByLnRvTG93ZXJDYXNlKCkgPT09IG1hdGNoVmFsdWUudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihtYXRjaEV4cHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hFeHByKG1hdGNoVmFsdWUsIGNvbnRleHQpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAobWF0Y2hFeHByKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoVmFsdWUubWF0Y2gobWF0Y2hFeHByKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXJzTGlzdDogZnVuY3Rpb24gKCRlbCwgcHJvcGVydHkpIHtcbiAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydC0nICsgcHJvcGVydHkpO1xuXG4gICAgICAgIGlmICghYXR0ckNvbnZlcnRlcnMgJiYgKHByb3BlcnR5ID09PSAnYmluZCcgfHwgcHJvcGVydHkgPT09ICdmb3JlYWNoJykpIHtcbiAgICAgICAgICAgIC8vT25seSBiaW5kIGluaGVyaXRzIGZyb20gcGFyZW50c1xuICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgdmFyICRwYXJlbnRFbCA9ICRlbC5jbG9zZXN0KCdbZGF0YS1mLWNvbnZlcnRdJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRwYXJlbnRFbCkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRwYXJlbnRFbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gXy5pbnZva2UoYXR0ckNvbnZlcnRlcnMuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhdHRyQ29udmVydGVycztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRvSW1wbGljaXRUeXBlOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB2YXIgcmJyYWNlID0gL14oPzpcXHsuKlxcfXxcXFsuKlxcXSkkLztcbiAgICAgICAgdmFyIGNvbnZlcnRlZCA9IGRhdGE7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSAnJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1xcJycgfHwgY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGRhdGEuc3Vic3RyaW5nKDEsIGRhdGEubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCQuaXNOdW1lcmljKGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gK2RhdGE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJicmFjZS50ZXN0KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPOiBUaGlzIG9ubHkgd29ya3Mgd2l0aCBkb3VibGUgcXVvdGVzLCBpLmUuLCBbMSxcIjJcIl0gd29ya3MgYnV0IG5vdCBbMSwnMiddXG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJC5wYXJzZUpTT04oZGF0YSkgO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZWQ7XG4gICAgfVxufTtcbiJdfQ==
