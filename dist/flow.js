(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.Flow = require('./flow.js');
window.Flow.version = '0.8.2'; //populated by grunt

},{"./flow.js":31}],2:[function(require,module,exports){
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

    var publicAPI = {
        //for testing
        private: {
            options: channelOptions
        },

        listenerMap: {},

        getSubscribers: function (topic) {
            var topicSubscribers = this.listenerMap[topic] || [];
            var globalSubscribers = this.listenerMap['*'] || [];
            return topicSubscribers.concat(globalSubscribers);
        },

        //Check for updates
        /**
         * Triggers update on sibling variables channel
         * @param  {string|array} executedOpns operations which just happened
         * @param  {*} response  response from the operation
         * @param  {boolean} force  ignore all silence options and force refresh
         */
        refresh: function (executedOpns, response, force) {
            // console.log('Operations refresh', executedOpns);
            var silent = channelOptions.silent;

            var shouldSilence = silent === true;
            if (_.isArray(silent) && executedOpns) {
                shouldSilence = _.intersection(silent, executedOpns).length === silent.length;
            }
            if ($.isPlainObject(silent) && executedOpns) {
                shouldSilence = _.intersection(silent.except, executedOpns).length !== executedOpns.length;
            }

            if (!shouldSilence || force === true) {
                var me = this;
                _.each(executedOpns, function (opn) {
                    me.notify(opn, response);
                });
            }
        },

        notify: function (operation, value) {
            var listeners = this.getSubscribers(operation);
            var params = {};
            params[operation] = value;

            _.each(listeners, function (listener) {
                var target = listener.target;
                if (_.isFunction(target)) {
                    target.call(null, params, value, operation);
                } else if (target.trigger) {
                    listener.target.trigger(config.events.react, params);
                } else {
                    throw new Error('Unknown listener format for ' + operation);
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
    var varOptions = config.run.variables;
    this.variables = new VarsChannel($.extend(true, {}, varOptions, { run: rs }));
    this.operations = new OperationsChannel($.extend(true, {}, config.run.operations, { run: rs }));

    var me = this;
    var debouncedRefresh = _.debounce(function (data) {
        me.variables.refresh.call(me.variables, null, true);
        if (me.variables.options.autoFetch.enable) {
            me.variables.startAutoFetch();
        }
    }, 200, { leading: true });

    this.operations.subscribe('*', debouncedRefresh);
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

        /**
         * Allows you to auto-fetch variables from the API as they're being subscribed. If this is set to enabled: false you'll need to explicitly call #refresh to get data and notify your listeners
         * @type {Object}
         */
        autoFetch: {
            /**
             * Enable auto-fetch behavior. If set to false during instantiation there's no way to enable this again.
             * @type {Boolean}
             */
            enable: true,
            /**
             * If auto-fetch is enabled control when to start fetching. Typically you'd want to start right-away, but if you want to wait till something else happens (like an operation or user action) set to false and control using the #startAutoFetch function
             * @type {Boolean}
             */
            start: true,

            /**
             * Control time to wait between calls to #subscribe before calling #fetch. See http://drupalmotion.com/article/debounce-and-throttle-visual-explanation for an explanation of how debouncing works
             * @type {Number} Milliseconds to wait
             */
            debounce: 200
        }
    };

    var channelOptions = $.extend(true, {}, defaults, options);
    this.options = channelOptions;

    var vs = channelOptions.run.variables();

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
        var interpolated = {};

        _.each(variablesToInterpolate, function (outerVariable) {
            var inner = getInnerVariables(outerVariable);
            var originalOuter = outerVariable;
            if (inner && inner.length) {
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
            interpolated[originalOuter] = outerVariable;
        });

        var op = {
            interpolated: interpolated,
            interpolationMap: interpolationMap
        };
        return op;
    };

    var publicAPI = {
        //for testing
        private: {
            getInnerVariables: getInnerVariables,
            interpolate: interpolate,
            currentData: currentData,
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

        updateAndCheckForRefresh: function (topics, options) {
            if (topics) {
                this.unfetched = _.uniq(this.unfetched.concat(topics));
            }
            if (!channelOptions.autoFetch.enable || !channelOptions.autoFetch.start || !this.unfetched.length) {
                return false;
            }
            if (!this.debouncedFetch) {
                var debounceOptions = $.extend(true, {}, {
                    maxWait: channelOptions.autoFetch.debounce * 4,
                    leading: false
                }, options);

                this.debouncedFetch = _.debounce(function (topics) {
                    this.fetch(this.unfetched).then(function (changed) {
                        $.extend(currentData, changed);
                        this.unfetched = [];
                        this.notify(changed);
                    }.bind(this));
                }, channelOptions.autoFetch.debounce, debounceOptions);
            }

            this.debouncedFetch(topics);
        },

        fetch: function (variablesList) {
            // console.log('fetch called', variablesList);
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
                    return getVariables(_.values(ip.interpolated), ip.interpolationMap);
                });
            } else {
                return getVariables(variablesList);
            }
        },

        startAutoFetch: function () {
            channelOptions.autoFetch.start = true;
            this.updateAndCheckForRefresh();
        },

        stopAutoFetch: function () {
            channelOptions.autoFetch.start = false;
        },

        /**
         * Check and notify all listeners
         * @param  {Object | Array} changeList Array or key-value pairs of changed variables.
         * @param  {Boolean} force skipping checking for silent updates and force trigger
         */
        refresh: function (changeList, force) {
            var me = this;
            var silent = channelOptions.silent;
            var changedVariables = _.isArray(changeList) ?  changeList : _.keys(changeList);

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
            me.unfetched = [];

            return this.fetch(variables).then(function (changeSet) {
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
         * Variable name & parameters to send to variables API
         * @param  {String | Object} variable string or {variablename: value}
         * @param  {*} value (optional)   value of variable if previous arg was a string
         * @param {Object} options Supported options: {silent: Boolean}
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
               var key = (it.interpolated[attr]) ? it.interpolated[attr] : attr;
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
        * @param  {Array|String} topics List of topics
        * @param  {Function|Object} subscriber If this is not a function, a `trigger` method is called if available, if not event is triggered on $(object).
        * @param  {Object} options       Set `batch` to true or false
        * @return {String}            Subscription ID. Use this to un-subcribe later
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

        /**
         * Un-subscribe from all subscriptions referenced by this token.
         * @param  {String} token Token obtained from subscribe
         */
        unsubscribe: function (token) {
            this.subscriptions = _.reject(this.subscriptions, function (subs) {
                return subs.id === token;
            });
        },

        /**
         * Un-subscribe from everything.
         * @return {[type]} [description]
         */
        unsubscribeAll: function () {
            this.subscriptions = [];
        }
    };

    $.extend(this, publicAPI);
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
        alias: 'reverse',
        acceptList: true,
        convert: function (val) {
            val = [].concat(val);
            return val.reverse();
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
            if (!converter) {
                throw new Error('Could not find not find converter for ' + converterName);
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
    require('./underscore-utils-converter'),
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

},{"./array-converter":6,"./number-converter":8,"./numberformat-converter":9,"./string-converter":10,"./underscore-utils-converter":11}],8:[function(require,module,exports){
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
var list = [];

var supported = [
    'values', 'keys', 'compact', 'difference',
    'flatten', 'rest',
    'union',
    'uniq', 'zip', 'without',
    'xor', 'zip'
];
_.each(supported, function (fn) {
    var item = {
        alias: fn,
        acceptList: true,
        convert: function (val) {
            if ($.isPlainObject(val)) {
                return _.mapValues(val, _[fn]);
            } else {
                return _[fn](val);
            }
        }
    };
    list.push(item);
});
module.exports = list;

},{}],12:[function(require,module,exports){
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


},{"./binds/checkbox-radio-bind-attr":13,"./binds/default-bind-attr":14,"./binds/input-bind-attr":15,"./class-attr":16,"./default-attr":17,"./events/default-event-attr":18,"./events/init-event-attr":19,"./foreach/default-foreach-attr":20,"./negative-boolean-attr":21,"./no-op-attr":22,"./positive-boolean-attr":23}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        var templated;
        var valueToTemplate = value;
        if (!$.isPlainObject(value)) {
            var variableName = this.data('f-bind');//Hack because i don't have access to variable name here otherwise
            valueToTemplate = { value: value };
            valueToTemplate[variableName] = value;
        }
        var bindTemplate = this.data('bind-template');
        if (bindTemplate) {
            templated = _.template(bindTemplate, valueToTemplate);
            this.html(templated);
        } else {
            var oldHTML = this.html();
            var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            templated = _.template(cleanedHTML, valueToTemplate);
            if (cleanedHTML === templated) { //templating did nothing
                if (_.isArray(value)) {
                    value = value[value.length - 1];
                }
                value += '';
                this.html(value);
            } else {
                this.data('bind-template', cleanedHTML);
                this.html(templated);
            }
        }
    }
};

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
'use strict';

module.exports = {

    test: '*',

    target: '*',

    handle: function (value, prop) {
        this.prop(prop, value);
    }
};

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{"../../../utils/parse-utils":33}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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
                /**
                 * Root of the element for flow to manage from.
                 * @type {String} jQuery selector
                 */
                root: 'body',
                channel: null,

                /**
                 * Any variables added to the dom after Flow.initialize has been called will be automatically parsed and subscriptions added to channels. Note, this does not work in IE versions < 11
                 * @type {Boolean}
                 */
                autoBind: true
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

                if (me.options.autoBind) {
                    autoUpdatePlugin($root.get(0), me);
                }
            });
        }
    };

    return $.extend(this, publicAPI);
}());

},{"../config":5,"../converters/converter-manager":7,"../utils/dom":32,"../utils/parse-utils":33,"./attributes/attribute-manager":12,"./nodes/node-manager":29,"./plugins/auto-update-bindings":30}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{"../../config":5,"./default-node":27}],27:[function(require,module,exports){
'use strict';

var BaseView = require('./base');

module.exports = BaseView.extend({
    propertyHandlers: [

    ],

    initialize: function () {
    }
}, { selector: '*' });

},{"./base":25}],28:[function(require,module,exports){
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

},{"./default-input-node":26}],29:[function(require,module,exports){
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

},{"./default-input-node":26,"./default-node":27,"./input-checkbox-node":28}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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
                    },
                    variables: {
                        autoFetch: {
                            start: false
                        }
                    }
                }
            },
            dom: {
                root: 'body',
                autoBind: true
            }
        };

        var options = $.extend(true, {}, defaults, config);
        var $root = $(options.dom.root);
        var initFn = $root.data('f-on-init');
        var opnSilent = options.channel.run.operations.silent;
        var isInitOperationSilent = initFn && (opnSilent === true || (_.isArray(opnSilent) && _.contains(opnSilent, initFn)));
        var preFetchVariables = !initFn || isInitOperationSilent;

        if (preFetchVariables) {
            options.channel.run.variables.autoFetch.start = true;
        }

        if (config && config.channel && (config.channel instanceof Channel)) {
            this.channel = config.channel;
        } else {
            this.channel = new Channel(options.channel);
        }

        domManager.initialize($.extend(true, {
            channel: this.channel
        }, options.dom));
    }
};

},{"./channels/run-channel":3,"./dom/dom-manager":24}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NoYW5uZWxzL29wZXJhdGlvbnMtY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy9ydW4tY2hhbm5lbC5qcyIsInNyYy9jaGFubmVscy92YXJpYWJsZXMtY2hhbm5lbC5qcyIsInNyYy9jb25maWcuanMiLCJzcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsInNyYy9jb252ZXJ0ZXJzL251bWJlci1jb252ZXJ0ZXIuanMiLCJzcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwic3JjL2NvbnZlcnRlcnMvc3RyaW5nLWNvbnZlcnRlci5qcyIsInNyYy9jb252ZXJ0ZXJzL3VuZGVyc2NvcmUtdXRpbHMtY29udmVydGVyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9kZWZhdWx0LWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0ci5qcyIsInNyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvaW5pdC1ldmVudC1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL2ZvcmVhY2gvZGVmYXVsdC1mb3JlYWNoLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCJzcmMvZG9tL2F0dHJpYnV0ZXMvcG9zaXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwic3JjL2RvbS9kb20tbWFuYWdlci5qcyIsInNyYy9kb20vbm9kZXMvYmFzZS5qcyIsInNyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwic3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL2lucHV0LWNoZWNrYm94LW5vZGUuanMiLCJzcmMvZG9tL25vZGVzL25vZGUtbWFuYWdlci5qcyIsInNyYy9kb20vcGx1Z2lucy9hdXRvLXVwZGF0ZS1iaW5kaW5ncy5qcyIsInNyYy9mbG93LmpzIiwic3JjL3V0aWxzL2RvbS5qcyIsInNyYy91dGlscy9wYXJzZS11dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwid2luZG93LkZsb3cgPSByZXF1aXJlKCcuL2Zsb3cuanMnKTtcbndpbmRvdy5GbG93LnZlcnNpb24gPSAnPCU9IHZlcnNpb24gJT4nOyAvL3BvcHVsYXRlZCBieSBncnVudFxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlXG4gICAgICAgICAqIEB0eXBlIHtTdHJpbmcgfCBBcnJheSB8IE9iamVjdH0gUG9zc2libGUgb3B0aW9ucyBhcmVcbiAgICAgICAgICogICAgICAgLSB0cnVlOiBuZXZlciB0cmlnZ2VyIGFueSB1cGRhdGVzLiBVc2UgdGhpcyBpZiB5b3Uga25vdyB5b3VyIG1vZGVsIHN0YXRlIHdvbid0IGNoYW5nZSBiYXNlZCBvbiBvcGVyYXRpb25zXG4gICAgICAgICAqICAgICAgIC0gZmFsc2U6IGFsd2F5cyB0cmlnZ2VyIHVwZGF0ZXMuXG4gICAgICAgICAqICAgICAgIC0gW2FycmF5IG9mIHZhcmlhYmxlIG5hbWVzXTogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgd2lsbCBub3QgdHJpZ2dlciB1cGRhdGVzLCBldmVyeXRoaW5nIGVsc2Ugd2lsbFxuICAgICAgICAgKiAgICAgICAtIHsgZXhjZXB0OiBbYXJyYXkgb2Ygb3BlcmF0aW9uc119OiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSB3aWxsIHRyaWdnZXIgdXBkYXRlcywgbm90aGluZyBlbHNlIHdpbGxcbiAgICAgICAgICovXG4gICAgICAgIHNpbGVudDogZmFsc2VcbiAgICB9O1xuXG4gICAgdmFyIGNoYW5uZWxPcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB2YXIgcnVuID0gY2hhbm5lbE9wdGlvbnMucnVuO1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgLy9mb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBvcHRpb25zOiBjaGFubmVsT3B0aW9uc1xuICAgICAgICB9LFxuXG4gICAgICAgIGxpc3RlbmVyTWFwOiB7fSxcblxuICAgICAgICBnZXRTdWJzY3JpYmVyczogZnVuY3Rpb24gKHRvcGljKSB7XG4gICAgICAgICAgICB2YXIgdG9waWNTdWJzY3JpYmVycyA9IHRoaXMubGlzdGVuZXJNYXBbdG9waWNdIHx8IFtdO1xuICAgICAgICAgICAgdmFyIGdsb2JhbFN1YnNjcmliZXJzID0gdGhpcy5saXN0ZW5lck1hcFsnKiddIHx8IFtdO1xuICAgICAgICAgICAgcmV0dXJuIHRvcGljU3Vic2NyaWJlcnMuY29uY2F0KGdsb2JhbFN1YnNjcmliZXJzKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvL0NoZWNrIGZvciB1cGRhdGVzXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUcmlnZ2VycyB1cGRhdGUgb24gc2libGluZyB2YXJpYWJsZXMgY2hhbm5lbFxuICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmd8YXJyYXl9IGV4ZWN1dGVkT3BucyBvcGVyYXRpb25zIHdoaWNoIGp1c3QgaGFwcGVuZWRcbiAgICAgICAgICogQHBhcmFtICB7Kn0gcmVzcG9uc2UgIHJlc3BvbnNlIGZyb20gdGhlIG9wZXJhdGlvblxuICAgICAgICAgKiBAcGFyYW0gIHtib29sZWFufSBmb3JjZSAgaWdub3JlIGFsbCBzaWxlbmNlIG9wdGlvbnMgYW5kIGZvcmNlIHJlZnJlc2hcbiAgICAgICAgICovXG4gICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uIChleGVjdXRlZE9wbnMsIHJlc3BvbnNlLCBmb3JjZSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ09wZXJhdGlvbnMgcmVmcmVzaCcsIGV4ZWN1dGVkT3Bucyk7XG4gICAgICAgICAgICB2YXIgc2lsZW50ID0gY2hhbm5lbE9wdGlvbnMuc2lsZW50O1xuXG4gICAgICAgICAgICB2YXIgc2hvdWxkU2lsZW5jZSA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoc2lsZW50KSAmJiBleGVjdXRlZE9wbnMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LCBleGVjdXRlZE9wbnMpLmxlbmd0aCA9PT0gc2lsZW50Lmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3Qoc2lsZW50KSAmJiBleGVjdXRlZE9wbnMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LmV4Y2VwdCwgZXhlY3V0ZWRPcG5zKS5sZW5ndGggIT09IGV4ZWN1dGVkT3Bucy5sZW5ndGg7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghc2hvdWxkU2lsZW5jZSB8fCBmb3JjZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgXy5lYWNoKGV4ZWN1dGVkT3BucywgZnVuY3Rpb24gKG9wbikge1xuICAgICAgICAgICAgICAgICAgICBtZS5ub3RpZnkob3BuLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgbm90aWZ5OiBmdW5jdGlvbiAob3BlcmF0aW9uLCB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0U3Vic2NyaWJlcnMob3BlcmF0aW9uKTtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHBhcmFtc1tvcGVyYXRpb25dID0gdmFsdWU7XG5cbiAgICAgICAgICAgIF8uZWFjaChsaXN0ZW5lcnMsIGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSBsaXN0ZW5lci50YXJnZXQ7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5jYWxsKG51bGwsIHBhcmFtcywgdmFsdWUsIG9wZXJhdGlvbik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0YXJnZXQudHJpZ2dlcikge1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci50YXJnZXQudHJpZ2dlcihjb25maWcuZXZlbnRzLnJlYWN0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBsaXN0ZW5lciBmb3JtYXQgZm9yICcgKyBvcGVyYXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBPcGVyYXRpb24gbmFtZSAmIHBhcmFtZXRlcnMgdG8gc2VuZCB0byBvcGVyYXRpb25zIEFQSVxuICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmcgfCBvYmplY3R9IG9wZXJhdGlvbiBOYW1lIG9mIE9wZXJhdGlvbi4gSWYgYXJyYXksIG5lZWRzIHRvIGJlIGluIHtvcGVyYXRpb25zOiBbe25hbWU6IG9wbiwgcGFyYW1zOltdfV0sIHNlcmlhbDogYm9vbGVhbn1dIGZvcm1hdFxuICAgICAgICAgKiBAcGFyYW0gIHsqfSBwYXJhbXMgKG9wdGlvbmFsKSAgIHBhcmFtcyB0byBzZW5kIHRvIG9wZXJ0YWlvblxuICAgICAgICAgKiBAcGFyYW0ge29wdGlvbn0gb3B0aW9ucyBTdXBwb3J0ZWQgb3B0aW9uczoge3NpbGVudDogQm9vbGVhbn1cbiAgICAgICAgICogQHJldHVybiB7JHByb21pc2V9XG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaXNoOiBmdW5jdGlvbiAob3BlcmF0aW9uLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KG9wZXJhdGlvbikgJiYgb3BlcmF0aW9uLm9wZXJhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSAob3BlcmF0aW9uLnNlcmlhbCkgPyBydW4uc2VyaWFsIDogcnVuLnBhcmFsbGVsO1xuICAgICAgICAgICAgICAgIHJldHVybiBmbi5jYWxsKHJ1biwgb3BlcmF0aW9uLm9wZXJhdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcmFtcyB8fCAhcGFyYW1zLnNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIF8ucGx1Y2sob3BlcmF0aW9uLm9wZXJhdGlvbnMsICduYW1lJyksIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPOiBjaGVjayBpZiBpbnRlcnBvbGF0ZWRcbiAgICAgICAgICAgICAgICB2YXIgb3B0cyA9ICgkLmlzUGxhaW5PYmplY3Qob3BlcmF0aW9uKSkgPyBwYXJhbXMgOiBvcHRpb25zO1xuICAgICAgICAgICAgICAgIHJldHVybiBydW4uZG8uYXBwbHkocnVuLCBhcmd1bWVudHMpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvcHRzIHx8ICFvcHRzLnNpbGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgW29wZXJhdGlvbl0sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBwdWJsaXNoJywgb3BlcmF0aW9uLCBwYXJhbXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnNjcmliZTogZnVuY3Rpb24gKG9wZXJhdGlvbnMsIHN1YnNjcmliZXIpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdvcGVyYXRpb25zIHN1YnNjcmliZScsIG9wZXJhdGlvbnMsIHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgb3BlcmF0aW9ucyA9IFtdLmNvbmNhdChvcGVyYXRpb25zKTtcbiAgICAgICAgICAgIC8vdXNlIGpxdWVyeSB0byBtYWtlIGV2ZW50IHNpbmtcbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbiAmJiAhXy5pc0Z1bmN0aW9uKHN1YnNjcmliZXIpKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLm9wZXJhdGlvbicpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHRhcmdldDogc3Vic2NyaWJlclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgICAgICAgJC5lYWNoKG9wZXJhdGlvbnMsIGZ1bmN0aW9uIChpbmRleCwgb3BuKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtZS5saXN0ZW5lck1hcFtvcG5dKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWUubGlzdGVuZXJNYXBbb3BuXSA9IG1lLmxpc3RlbmVyTWFwW29wbl0uY29uY2F0KGRhdGEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0gPSBfLnJlamVjdCh0aGlzLmxpc3RlbmVyTWFwW29wZXJhdGlvbl0sIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVyTWFwID0ge307XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFZhcnNDaGFubmVsID0gcmVxdWlyZSgnLi92YXJpYWJsZXMtY2hhbm5lbCcpO1xudmFyIE9wZXJhdGlvbnNDaGFubmVsID0gcmVxdWlyZSgnLi9vcGVyYXRpb25zLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgcnVuOiB7XG4gICAgICAgICAgICB2YXJpYWJsZXM6IHtcblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9wZXJhdGlvbnM6IHtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29uZmlnID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgIHZhciBybSA9IG5ldyBGLm1hbmFnZXIuUnVuTWFuYWdlcihjb25maWcpO1xuICAgIHZhciBycyA9IHJtLnJ1bjtcblxuICAgIHZhciAkY3JlYXRpb25Qcm9taXNlID0gcm0uZ2V0UnVuKCk7XG4gICAgcnMuY3VycmVudFByb21pc2UgPSAkY3JlYXRpb25Qcm9taXNlO1xuXG4gICAgdmFyIGNyZWF0ZUFuZFRoZW4gPSBmdW5jdGlvbiAoZm4sIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIF8ud3JhcChmbiwgZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgICAgIHZhciBwYXNzZWRJblBhcmFtcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDEpO1xuICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJzLmN1cnJlbnRQcm9taXNlID0gZnVuYy5hcHBseShjb250ZXh0LCBwYXNzZWRJblBhcmFtcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvL01ha2Ugc3VyZSBub3RoaW5nIGhhcHBlbnMgYmVmb3JlIHRoZSBydW4gaXMgY3JlYXRlZFxuICAgIF8uZWFjaChycywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpICYmIG5hbWUgIT09ICd2YXJpYWJsZXMnICAmJiBuYW1lICE9PSAnY3JlYXRlJykge1xuICAgICAgICAgICAgcnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCBycyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHZhciBvcmlnaW5hbFZhcmlhYmxlc0ZuID0gcnMudmFyaWFibGVzO1xuICAgIHJzLnZhcmlhYmxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZzID0gb3JpZ2luYWxWYXJpYWJsZXNGbi5hcHBseShycywgYXJndW1lbnRzKTtcbiAgICAgICAgXy5lYWNoKHZzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCB2cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdnM7XG4gICAgfTtcblxuICAgIHRoaXMucnVuID0gcnM7XG4gICAgdmFyIHZhck9wdGlvbnMgPSBjb25maWcucnVuLnZhcmlhYmxlcztcbiAgICB0aGlzLnZhcmlhYmxlcyA9IG5ldyBWYXJzQ2hhbm5lbCgkLmV4dGVuZCh0cnVlLCB7fSwgdmFyT3B0aW9ucywgeyBydW46IHJzIH0pKTtcbiAgICB0aGlzLm9wZXJhdGlvbnMgPSBuZXcgT3BlcmF0aW9uc0NoYW5uZWwoJC5leHRlbmQodHJ1ZSwge30sIGNvbmZpZy5ydW4ub3BlcmF0aW9ucywgeyBydW46IHJzIH0pKTtcblxuICAgIHZhciBtZSA9IHRoaXM7XG4gICAgdmFyIGRlYm91bmNlZFJlZnJlc2ggPSBfLmRlYm91bmNlKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIG1lLnZhcmlhYmxlcy5yZWZyZXNoLmNhbGwobWUudmFyaWFibGVzLCBudWxsLCB0cnVlKTtcbiAgICAgICAgaWYgKG1lLnZhcmlhYmxlcy5vcHRpb25zLmF1dG9GZXRjaC5lbmFibGUpIHtcbiAgICAgICAgICAgIG1lLnZhcmlhYmxlcy5zdGFydEF1dG9GZXRjaCgpO1xuICAgICAgICB9XG4gICAgfSwgMjAwLCB7IGxlYWRpbmc6IHRydWUgfSk7XG5cbiAgICB0aGlzLm9wZXJhdGlvbnMuc3Vic2NyaWJlKCcqJywgZGVib3VuY2VkUmVmcmVzaCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogRGV0ZXJtaW5lIHdoZW4gdG8gdXBkYXRlIHN0YXRlXG4gICAgICAgICAqIEB0eXBlIHtTdHJpbmcgfCBBcnJheSB8IE9iamVjdH0gUG9zc2libGUgb3B0aW9ucyBhcmVcbiAgICAgICAgICogICAgICAgLSB0cnVlOiBuZXZlciB0cmlnZ2VyIGFueSB1cGRhdGVzLiBVc2UgdGhpcyBpZiB5b3Uga25vdyB5b3VyIG1vZGVsIHN0YXRlIHdvbid0IGNoYW5nZSBiYXNlZCBvbiBvdGhlciB2YXJpYWJsZXNcbiAgICAgICAgICogICAgICAgLSBmYWxzZTogYWx3YXlzIHRyaWdnZXIgdXBkYXRlcy5cbiAgICAgICAgICogICAgICAgLSBbYXJyYXkgb2YgdmFyaWFibGUgbmFtZXNdOiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSB3aWxsIG5vdCB0cmlnZ2VyIHVwZGF0ZXMsIGV2ZXJ5dGhpbmcgZWxzZSB3aWxsXG4gICAgICAgICAqICAgICAgIC0geyBleGNlcHQ6IFthcnJheSBvZiB2YXJpYWJsZXNdfTogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgd2lsbCB0cmlnZ2VyIHVwZGF0ZXMsIG5vdGhpbmcgZWxzZSB3aWxsXG4gICAgICAgICAqL1xuICAgICAgICBzaWxlbnQ6IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBbGxvd3MgeW91IHRvIGF1dG8tZmV0Y2ggdmFyaWFibGVzIGZyb20gdGhlIEFQSSBhcyB0aGV5J3JlIGJlaW5nIHN1YnNjcmliZWQuIElmIHRoaXMgaXMgc2V0IHRvIGVuYWJsZWQ6IGZhbHNlIHlvdSdsbCBuZWVkIHRvIGV4cGxpY2l0bHkgY2FsbCAjcmVmcmVzaCB0byBnZXQgZGF0YSBhbmQgbm90aWZ5IHlvdXIgbGlzdGVuZXJzXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqL1xuICAgICAgICBhdXRvRmV0Y2g6IHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5hYmxlIGF1dG8tZmV0Y2ggYmVoYXZpb3IuIElmIHNldCB0byBmYWxzZSBkdXJpbmcgaW5zdGFudGlhdGlvbiB0aGVyZSdzIG5vIHdheSB0byBlbmFibGUgdGhpcyBhZ2Fpbi5cbiAgICAgICAgICAgICAqIEB0eXBlIHtCb29sZWFufVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlbmFibGU6IHRydWUsXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIElmIGF1dG8tZmV0Y2ggaXMgZW5hYmxlZCBjb250cm9sIHdoZW4gdG8gc3RhcnQgZmV0Y2hpbmcuIFR5cGljYWxseSB5b3UnZCB3YW50IHRvIHN0YXJ0IHJpZ2h0LWF3YXksIGJ1dCBpZiB5b3Ugd2FudCB0byB3YWl0IHRpbGwgc29tZXRoaW5nIGVsc2UgaGFwcGVucyAobGlrZSBhbiBvcGVyYXRpb24gb3IgdXNlciBhY3Rpb24pIHNldCB0byBmYWxzZSBhbmQgY29udHJvbCB1c2luZyB0aGUgI3N0YXJ0QXV0b0ZldGNoIGZ1bmN0aW9uXG4gICAgICAgICAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc3RhcnQ6IHRydWUsXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ29udHJvbCB0aW1lIHRvIHdhaXQgYmV0d2VlbiBjYWxscyB0byAjc3Vic2NyaWJlIGJlZm9yZSBjYWxsaW5nICNmZXRjaC4gU2VlIGh0dHA6Ly9kcnVwYWxtb3Rpb24uY29tL2FydGljbGUvZGVib3VuY2UtYW5kLXRocm90dGxlLXZpc3VhbC1leHBsYW5hdGlvbiBmb3IgYW4gZXhwbGFuYXRpb24gb2YgaG93IGRlYm91bmNpbmcgd29ya3NcbiAgICAgICAgICAgICAqIEB0eXBlIHtOdW1iZXJ9IE1pbGxpc2Vjb25kcyB0byB3YWl0XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRlYm91bmNlOiAyMDBcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgY2hhbm5lbE9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIHRoaXMub3B0aW9ucyA9IGNoYW5uZWxPcHRpb25zO1xuXG4gICAgdmFyIHZzID0gY2hhbm5lbE9wdGlvbnMucnVuLnZhcmlhYmxlcygpO1xuXG4gICAgdmFyIGN1cnJlbnREYXRhID0ge307XG5cbiAgICAvL1RPRE86IGFjdHVhbGx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgc28gb25cbiAgICB2YXIgaXNFcXVhbCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIGdldElubmVyVmFyaWFibGVzID0gZnVuY3Rpb24gKHN0cikge1xuICAgICAgICB2YXIgaW5uZXIgPSBzdHIubWF0Y2goLzwoLio/KT4vZyk7XG4gICAgICAgIGlubmVyID0gXy5tYXAoaW5uZXIsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWwuc3Vic3RyaW5nKDEsIHZhbC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpbm5lcjtcbiAgICB9O1xuXG4gICAgLy9SZXBsYWNlcyBzdHViYmVkIG91dCBrZXluYW1lcyBpbiB2YXJpYWJsZXN0b2ludGVycG9sYXRlIHdpdGggdGhlaXIgY29ycmVzcG9uZGluZyB2YWx1ZXNcbiAgICB2YXIgaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAodmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgdmFsdWVzKSB7XG4gICAgICAgIC8ve3ByaWNlWzFdOiBwcmljZVs8dGltZT5dfVxuICAgICAgICB2YXIgaW50ZXJwb2xhdGlvbk1hcCA9IHt9O1xuICAgICAgICAvL3twcmljZVsxXTogMX1cbiAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IHt9O1xuXG4gICAgICAgIF8uZWFjaCh2YXJpYWJsZXNUb0ludGVycG9sYXRlLCBmdW5jdGlvbiAob3V0ZXJWYXJpYWJsZSkge1xuICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXMob3V0ZXJWYXJpYWJsZSk7XG4gICAgICAgICAgICB2YXIgb3JpZ2luYWxPdXRlciA9IG91dGVyVmFyaWFibGU7XG4gICAgICAgICAgICBpZiAoaW5uZXIgJiYgaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGlubmVyLCBmdW5jdGlvbiAoaW5kZXgsIGlubmVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXN2YWwgPSB2YWx1ZXNbaW5uZXJWYXJpYWJsZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzdmFsICE9PSBudWxsICYmIHRoaXN2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0aGlzdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vRm9yIGFycmF5ZWQgdGhpbmdzIGdldCB0aGUgbGFzdCBvbmUgZm9yIGludGVycG9sYXRpb24gcHVycG9zZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzdmFsID0gdGhpc3ZhbFt0aGlzdmFsLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBSZWdleCB0byBtYXRjaCBzcGFjZXMgYW5kIHNvIG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRlclZhcmlhYmxlID0gb3V0ZXJWYXJpYWJsZS5yZXBsYWNlKCc8JyArIGlubmVyVmFyaWFibGUgKyAnPicsIHRoaXN2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSA9IChpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdKSA/IFtvcmlnaW5hbE91dGVyXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSkgOiBvcmlnaW5hbE91dGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW50ZXJwb2xhdGVkW29yaWdpbmFsT3V0ZXJdID0gb3V0ZXJWYXJpYWJsZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIG9wID0ge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkOiBpbnRlcnBvbGF0ZWQsXG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwOiBpbnRlcnBvbGF0aW9uTWFwXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBvcDtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgLy9mb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBnZXRJbm5lclZhcmlhYmxlczogZ2V0SW5uZXJWYXJpYWJsZXMsXG4gICAgICAgICAgICBpbnRlcnBvbGF0ZTogaW50ZXJwb2xhdGUsXG4gICAgICAgICAgICBjdXJyZW50RGF0YTogY3VycmVudERhdGEsXG4gICAgICAgICAgICBvcHRpb25zOiBjaGFubmVsT3B0aW9uc1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnNjcmlwdGlvbnM6IFtdLFxuXG4gICAgICAgIHVuZmV0Y2hlZDogW10sXG5cbiAgICAgICAgZ2V0U3Vic2NyaWJlcnM6IGZ1bmN0aW9uICh0b3BpYykge1xuICAgICAgICAgICAgaWYgKHRvcGljKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uZmlsdGVyKHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF8uY29udGFpbnMoc3Vicy50b3BpY3MsIHRvcGljKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3Vic2NyaXB0aW9ucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0QWxsVG9waWNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXyh0aGlzLnN1YnNjcmlwdGlvbnMpLnBsdWNrKCd0b3BpY3MnKS5mbGF0dGVuKCkudW5pcSgpLnZhbHVlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFRvcGljRGVwZW5kZW5jaWVzOiBmdW5jdGlvbiAobGlzdCkge1xuICAgICAgICAgICAgaWYgKCFsaXN0KSB7XG4gICAgICAgICAgICAgICAgbGlzdCA9IHRoaXMuZ2V0QWxsVG9waWNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW5uZXJMaXN0ID0gW107XG4gICAgICAgICAgICBfLmVhY2gobGlzdCwgZnVuY3Rpb24gKHZuYW1lKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXModm5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5uZXJMaXN0ID0gXy51bmlxKGlubmVyTGlzdC5jb25jYXQoaW5uZXIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBpbm5lckxpc3Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlQW5kQ2hlY2tGb3JSZWZyZXNoOiBmdW5jdGlvbiAodG9waWNzLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAodG9waWNzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51bmZldGNoZWQgPSBfLnVuaXEodGhpcy51bmZldGNoZWQuY29uY2F0KHRvcGljcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guZW5hYmxlIHx8ICFjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guc3RhcnQgfHwgIXRoaXMudW5mZXRjaGVkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5kZWJvdW5jZWRGZXRjaCkge1xuICAgICAgICAgICAgICAgIHZhciBkZWJvdW5jZU9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwge1xuICAgICAgICAgICAgICAgICAgICBtYXhXYWl0OiBjaGFubmVsT3B0aW9ucy5hdXRvRmV0Y2guZGVib3VuY2UgKiA0LFxuICAgICAgICAgICAgICAgICAgICBsZWFkaW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5kZWJvdW5jZWRGZXRjaCA9IF8uZGVib3VuY2UoZnVuY3Rpb24gKHRvcGljcykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoKHRoaXMudW5mZXRjaGVkKS50aGVuKGZ1bmN0aW9uIChjaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50RGF0YSwgY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVuZmV0Y2hlZCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3RpZnkoY2hhbmdlZCk7XG4gICAgICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgfSwgY2hhbm5lbE9wdGlvbnMuYXV0b0ZldGNoLmRlYm91bmNlLCBkZWJvdW5jZU9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmRlYm91bmNlZEZldGNoKHRvcGljcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmV0Y2g6IGZ1bmN0aW9uICh2YXJpYWJsZXNMaXN0KSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnZmV0Y2ggY2FsbGVkJywgdmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICB2YXJpYWJsZXNMaXN0ID0gW10uY29uY2F0KHZhcmlhYmxlc0xpc3QpO1xuICAgICAgICAgICAgdmFyIGlubmVyVmFyaWFibGVzID0gdGhpcy5nZXRUb3BpY0RlcGVuZGVuY2llcyh2YXJpYWJsZXNMaXN0KTtcbiAgICAgICAgICAgIHZhciBnZXRWYXJpYWJsZXMgPSBmdW5jdGlvbiAodmFycywgaW50ZXJwb2xhdGlvbk1hcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeSh2YXJzKS50aGVuKGZ1bmN0aW9uICh2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ0dvdCB2YXJpYWJsZXMnLCB2YXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2hhbmdlU2V0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaCh2YXJpYWJsZXMsIGZ1bmN0aW9uICh2YWx1ZSwgdm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGN1cnJlbnREYXRhW3ZuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNFcXVhbCh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W3ZuYW1lXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlcnBvbGF0aW9uTWFwICYmIGludGVycG9sYXRpb25NYXBbdm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSBbXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFt2bmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2gobWFwLCBmdW5jdGlvbiAoaW50ZXJwb2xhdGVkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlU2V0W2ludGVycG9sYXRlZE5hbWVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGFuZ2VTZXQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGlubmVyVmFyaWFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeShpbm5lclZhcmlhYmxlcykudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW5uZXInLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpcCA9ICBpbnRlcnBvbGF0ZSh2YXJpYWJsZXNMaXN0LCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXMoXy52YWx1ZXMoaXAuaW50ZXJwb2xhdGVkKSwgaXAuaW50ZXJwb2xhdGlvbk1hcCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXModmFyaWFibGVzTGlzdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RhcnRBdXRvRmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5zdGFydCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFuZENoZWNrRm9yUmVmcmVzaCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0b3BBdXRvRmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNoYW5uZWxPcHRpb25zLmF1dG9GZXRjaC5zdGFydCA9IGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVjayBhbmQgbm90aWZ5IGFsbCBsaXN0ZW5lcnNcbiAgICAgICAgICogQHBhcmFtICB7T2JqZWN0IHwgQXJyYXl9IGNoYW5nZUxpc3QgQXJyYXkgb3Iga2V5LXZhbHVlIHBhaXJzIG9mIGNoYW5nZWQgdmFyaWFibGVzLlxuICAgICAgICAgKiBAcGFyYW0gIHtCb29sZWFufSBmb3JjZSBza2lwcGluZyBjaGVja2luZyBmb3Igc2lsZW50IHVwZGF0ZXMgYW5kIGZvcmNlIHRyaWdnZXJcbiAgICAgICAgICovXG4gICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uIChjaGFuZ2VMaXN0LCBmb3JjZSkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZhciBzaWxlbnQgPSBjaGFubmVsT3B0aW9ucy5zaWxlbnQ7XG4gICAgICAgICAgICB2YXIgY2hhbmdlZFZhcmlhYmxlcyA9IF8uaXNBcnJheShjaGFuZ2VMaXN0KSA/ICBjaGFuZ2VMaXN0IDogXy5rZXlzKGNoYW5nZUxpc3QpO1xuXG4gICAgICAgICAgICB2YXIgc2hvdWxkU2lsZW5jZSA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoc2lsZW50KSAmJiBjaGFuZ2VkVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgc2hvdWxkU2lsZW5jZSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudCwgY2hhbmdlZFZhcmlhYmxlcykubGVuZ3RoID49IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHNpbGVudCkgJiYgY2hhbmdlZFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBjaGFuZ2VkVmFyaWFibGVzKS5sZW5ndGggIT09IGNoYW5nZWRWYXJpYWJsZXMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2hvdWxkU2lsZW5jZSAmJiBmb3JjZSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkLkRlZmVycmVkKCkucmVzb2x2ZSgpLnByb21pc2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHZhcmlhYmxlcyA9IHRoaXMuZ2V0QWxsVG9waWNzKCk7XG4gICAgICAgICAgICBtZS51bmZldGNoZWQgPSBbXTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2godmFyaWFibGVzKS50aGVuKGZ1bmN0aW9uIChjaGFuZ2VTZXQpIHtcbiAgICAgICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50RGF0YSwgY2hhbmdlU2V0KTtcbiAgICAgICAgICAgICAgICBtZS5ub3RpZnkoY2hhbmdlU2V0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIG5vdGlmeTogZnVuY3Rpb24gKHRvcGljcywgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBjYWxsVGFyZ2V0ID0gZnVuY3Rpb24gKHRhcmdldCwgcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldC5jYWxsKG51bGwsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LnRyaWdnZXIoY29uZmlnLmV2ZW50cy5yZWFjdCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoISQuaXNQbGFpbk9iamVjdCh0b3BpY3MpKSB7XG4gICAgICAgICAgICAgICAgdG9waWNzID0gXy5vYmplY3QoW3RvcGljc10sIFt2YWx1ZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXy5lYWNoKHRoaXMuc3Vic2NyaXB0aW9ucywgZnVuY3Rpb24gKHN1YnNjcmlwdGlvbikge1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXQgPSBzdWJzY3JpcHRpb24udGFyZ2V0O1xuICAgICAgICAgICAgICAgIGlmIChzdWJzY3JpcHRpb24uYmF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1hdGNoaW5nVG9waWNzID0gXy5waWNrKHRvcGljcywgc3Vic2NyaXB0aW9uLnRvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLnNpemUobWF0Y2hpbmdUb3BpY3MpID09PSBfLnNpemUoc3Vic2NyaXB0aW9uLnRvcGljcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxUYXJnZXQodGFyZ2V0LCBtYXRjaGluZ1RvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfLmVhY2goc3Vic2NyaXB0aW9uLnRvcGljcywgZnVuY3Rpb24gKHRvcGljKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWF0Y2hpbmdUb3BpY3MgPSBfLnBpY2sodG9waWNzLCB0b3BpYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoXy5zaXplKG1hdGNoaW5nVG9waWNzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxUYXJnZXQodGFyZ2V0LCBtYXRjaGluZ1RvcGljcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWYXJpYWJsZSBuYW1lICYgcGFyYW1ldGVycyB0byBzZW5kIHRvIHZhcmlhYmxlcyBBUElcbiAgICAgICAgICogQHBhcmFtICB7U3RyaW5nIHwgT2JqZWN0fSB2YXJpYWJsZSBzdHJpbmcgb3Ige3ZhcmlhYmxlbmFtZTogdmFsdWV9XG4gICAgICAgICAqIEBwYXJhbSAgeyp9IHZhbHVlIChvcHRpb25hbCkgICB2YWx1ZSBvZiB2YXJpYWJsZSBpZiBwcmV2aW91cyBhcmcgd2FzIGEgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFN1cHBvcnRlZCBvcHRpb25zOiB7c2lsZW50OiBCb29sZWFufVxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uICh2YXJpYWJsZSwgdmFsdWUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwdWJsaXNoJywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBhdHRycztcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QodmFyaWFibGUpKSB7XG4gICAgICAgICAgICAgICAgYXR0cnMgPSB2YXJpYWJsZTtcbiAgICAgICAgICAgICAgICBvcHRpb25zID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIChhdHRycyA9IHt9KVt2YXJpYWJsZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpdCA9IGludGVycG9sYXRlKF8ua2V5cyhhdHRycyksIGN1cnJlbnREYXRhKTtcblxuICAgICAgICAgICAgdmFyIHRvU2F2ZSA9IHt9O1xuICAgICAgICAgICAgXy5lYWNoKGF0dHJzLCBmdW5jdGlvbiAodmFsLCBhdHRyKSB7XG4gICAgICAgICAgICAgICB2YXIga2V5ID0gKGl0LmludGVycG9sYXRlZFthdHRyXSkgPyBpdC5pbnRlcnBvbGF0ZWRbYXR0cl0gOiBhdHRyO1xuICAgICAgICAgICAgICAgdG9TYXZlW2tleV0gPSB2YWw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gdnMuc2F2ZS5jYWxsKHZzLCB0b1NhdmUpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMgfHwgIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIGF0dHJzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG5cblxuICAgICAgIC8qKlxuICAgICAgICAqIFN1YnNjcmliZSB0byBjaGFuZ2VzIG9uIGEgY2hhbm5lbFxuICAgICAgICAqIEBwYXJhbSAge0FycmF5fFN0cmluZ30gdG9waWNzIExpc3Qgb2YgdG9waWNzXG4gICAgICAgICogQHBhcmFtICB7RnVuY3Rpb258T2JqZWN0fSBzdWJzY3JpYmVyIElmIHRoaXMgaXMgbm90IGEgZnVuY3Rpb24sIGEgYHRyaWdnZXJgIG1ldGhvZCBpcyBjYWxsZWQgaWYgYXZhaWxhYmxlLCBpZiBub3QgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uICQob2JqZWN0KS5cbiAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG9wdGlvbnMgICAgICAgU2V0IGBiYXRjaGAgdG8gdHJ1ZSBvciBmYWxzZVxuICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgICBTdWJzY3JpcHRpb24gSUQuIFVzZSB0aGlzIHRvIHVuLXN1YmNyaWJlIGxhdGVyXG4gICAgICAgICovXG4gICAgICAgIHN1YnNjcmliZTogZnVuY3Rpb24gKHRvcGljcywgc3Vic2NyaWJlciwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3N1YnNjcmliaW5nJywgdG9waWNzLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICBiYXRjaDogZmFsc2VcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRvcGljcyA9IFtdLmNvbmNhdCh0b3BpY3MpO1xuICAgICAgICAgICAgLy91c2UganF1ZXJ5IHRvIG1ha2UgZXZlbnQgc2lua1xuICAgICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLm9uICYmICFfLmlzRnVuY3Rpb24oc3Vic2NyaWJlcikpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyID0gJChzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGlkICA9IF8udW5pcXVlSWQoJ2VwaWNoYW5uZWwudmFyaWFibGUnKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0gJC5leHRlbmQoe1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0b3BpY3M6IHRvcGljcyxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH0sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2goZGF0YSk7XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlQW5kQ2hlY2tGb3JSZWZyZXNoKHRvcGljcyk7XG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFVuLXN1YnNjcmliZSBmcm9tIGFsbCBzdWJzY3JpcHRpb25zIHJlZmVyZW5jZWQgYnkgdGhpcyB0b2tlbi5cbiAgICAgICAgICogQHBhcmFtICB7U3RyaW5nfSB0b2tlbiBUb2tlbiBvYnRhaW5lZCBmcm9tIHN1YnNjcmliZVxuICAgICAgICAgKi9cbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uICh0b2tlbikge1xuICAgICAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25zID0gXy5yZWplY3QodGhpcy5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoc3Vicykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWJzLmlkID09PSB0b2tlbjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBVbi1zdWJzY3JpYmUgZnJvbSBldmVyeXRoaW5nLlxuICAgICAgICAgKiBAcmV0dXJuIHtbdHlwZV19IFtkZXNjcmlwdGlvbl1cbiAgICAgICAgICovXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByZWZpeDogJ2YnLFxuICAgIGRlZmF1bHRBdHRyOiAnYmluZCcsXG5cbiAgICBiaW5kZXJBdHRyOiAnZi1iaW5kJyxcblxuICAgIGV2ZW50czoge1xuICAgICAgICB0cmlnZ2VyOiAndXBkYXRlLmYudWknLFxuICAgICAgICByZWFjdDogJ3VwZGF0ZS5mLm1vZGVsJ1xuICAgIH1cblxufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBsaXN0ID0gW1xuICAgIHtcbiAgICAgICAgYWxpYXM6ICdsaXN0JyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGFsaWFzOiAnbGFzdCcsXG4gICAgICAgIGFjY2VwdExpc3Q6IHRydWUsXG4gICAgICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbFt2YWwubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgYWxpYXM6ICdyZXZlcnNlJyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsLnJldmVyc2UoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBhbGlhczogJ2ZpcnN0JyxcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsWzBdO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGFsaWFzOiAncHJldmlvdXMnLFxuICAgICAgICBhY2NlcHRMaXN0OiB0cnVlLFxuICAgICAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgICAgIHJldHVybiAodmFsLmxlbmd0aCA8PSAxKSA/IHZhbFswXSA6IHZhbFt2YWwubGVuZ3RoIC0gMl07XG4gICAgICAgIH1cbiAgICB9XG5dO1xuXG5fLmVhY2gobGlzdCwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgIHZhciBvbGRmbiA9IGl0ZW0uY29udmVydDtcbiAgIHZhciBuZXdmbiA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcFZhbHVlcyh2YWwsIG9sZGZuKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG9sZGZuKHZhbCk7XG4gICAgICAgfVxuICAgfTtcbiAgIGl0ZW0uY29udmVydCA9IG5ld2ZuO1xufSk7XG5tb2R1bGUuZXhwb3J0cyA9IGxpc3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vVE9ETzogTWFrZSBhbGwgdW5kZXJzY29yZSBmaWx0ZXJzIGF2YWlsYWJsZVxuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIsIGFjY2VwdExpc3QpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgLy9ub21hbGl6ZSgnZmxpcCcsIGZuKVxuICAgIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyKSkge1xuICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICBhbGlhczogYWxpYXMsXG4gICAgICAgICAgICBjb252ZXJ0OiBjb252ZXJ0ZXIsXG4gICAgICAgICAgICBhY2NlcHRMaXN0OiBhY2NlcHRMaXN0XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoJC5pc1BsYWluT2JqZWN0KGNvbnZlcnRlcikgJiYgY29udmVydGVyLmNvbnZlcnQpIHtcbiAgICAgICAgY29udmVydGVyLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIGNvbnZlcnRlci5hY2NlcHRMaXN0ID0gYWNjZXB0TGlzdDtcbiAgICAgICAgcmV0LnB1c2goY29udmVydGVyKTtcbiAgICB9IGVsc2UgaWYgKCQuaXNQbGFpbk9iamVjdChhbGlhcykpIHtcbiAgICAgICAgLy9ub3JtYWxpemUoe2FsaWFzOiAnZmxpcCcsIGNvbnZlcnQ6IGZ1bmN0aW9ufSlcbiAgICAgICAgaWYgKGFsaWFzLmNvbnZlcnQpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGFsaWFzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vcm1hbGl6ZSh7ZmxpcDogZnVufSlcbiAgICAgICAgICAgICQuZWFjaChhbGlhcywgZnVuY3Rpb24gKGtleSwgdmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBhbGlhczoga2V5LFxuICAgICAgICAgICAgICAgICAgICBjb252ZXJ0OiB2YWwsXG4gICAgICAgICAgICAgICAgICAgIGFjY2VwdExpc3Q6IGFjY2VwdExpc3RcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgbWF0Y2hDb252ZXJ0ZXIgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgIGlmIChfLmlzU3RyaW5nKGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGFsaWFzID09PSBjb252ZXJ0ZXIuYWxpYXM7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzKGFsaWFzKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNSZWdleChjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIuYWxpYXMubWF0Y2goYWxpYXMpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgY29udmVydGVyTWFuYWdlciA9IHtcbiAgICBwcml2YXRlOiB7XG4gICAgICAgIG1hdGNoQ29udmVydGVyOiBtYXRjaENvbnZlcnRlclxuICAgIH0sXG5cbiAgICBsaXN0OiBbXSxcbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgYXR0cmlidXRlIGNvbnZlcnRlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ3xmdW5jdGlvbnxyZWdleH0gYWxpYXMgZm9ybWF0dGVyIG5hbWVcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbnxvYmplY3R9IGNvbnZlcnRlciAgICBjb252ZXJ0ZXIgY2FuIGVpdGhlciBiZSBhIGZ1bmN0aW9uLCB3aGljaCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZSwgb3IgYW4gb2JqZWN0IHdpdGgge2FsaWFzOiAnJywgcGFyc2U6ICQubm9vcCwgY29udmVydDogJC5ub29wfVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWNjZXB0TGlzdCBkZWNpZGVzIGlmIHRoZSBjb252ZXJ0ZXIgaXMgYSAnbGlzdCcgY29udmVydGVyIG9yIG5vdDsgbGlzdCBjb252ZXJ0ZXJzIHRha2UgaW4gYXJyYXlzIGFzIGlucHV0cywgb3RoZXJzIGV4cGVjdCBzaW5nbGUgdmFsdWVzLlxuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlciwgYWNjZXB0TGlzdCkge1xuICAgICAgICB2YXIgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZShhbGlhcywgY29udmVydGVyLCBhY2NlcHRMaXN0KTtcbiAgICAgICAgdGhpcy5saXN0ID0gbm9ybWFsaXplZC5jb25jYXQodGhpcy5saXN0KTtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2godGhpcy5saXN0LCBmdW5jdGlvbiAoY3VycmVudENvbnZlcnRlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQ29udmVydGVyKGFsaWFzLCBjdXJyZW50Q29udmVydGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlcilbMF0pO1xuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXI6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQ29udmVydGVyKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUGlwZXMgdGhlIHZhbHVlIHNlcXVlbnRpYWxseSB0aHJvdWdoIGEgbGlzdCBvZiBwcm92aWRlZCBjb252ZXJ0ZXJzXG4gICAgICogQHBhcmFtICB7Kn0gdmFsdWUgSW5wdXQgZm9yIHRoZSBjb252ZXJ0ZXIgdG8gdGFnXG4gICAgICogQHBhcmFtICB7QXJyYXl8T2JqZWN0fSBsaXN0ICBsaXN0IG9mIGNvbnZlcnRlcnMgKG1hcHMgdG8gY29udmVydGVyIGFsaWFzKVxuICAgICAqIEByZXR1cm4geyp9ICAgICAgIGNvbnZlcnRlZCB2YWx1ZVxuICAgICAqL1xuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KTtcbiAgICAgICAgbGlzdCA9IF8uaW52b2tlKGxpc3QsICd0cmltJyk7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgIHZhciBjb252ZXJ0QXJyYXkgPSBmdW5jdGlvbiAoY29udmVydGVyLCB2YWwsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcCh2YWwsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5jb252ZXJ0KHYsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBjb252ZXJ0T2JqZWN0ID0gZnVuY3Rpb24gKGNvbnZlcnRlciwgdmFsdWUsIGNvbnZlcnRlck5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLm1hcFZhbHVlcyh2YWx1ZSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICByZXR1cm4gY29udmVydChjb252ZXJ0ZXIsIHZhbCwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgY29udmVydCA9IGZ1bmN0aW9uIChjb252ZXJ0ZXIsIHZhbHVlLCBjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVkO1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgJiYgY29udmVydGVyLmFjY2VwdExpc3QgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QXJyYXkoY29udmVydGVyLCB2YWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRlci5jb252ZXJ0KHZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjb252ZXJ0ZWQ7XG4gICAgICAgIH07XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlciA9IG1lLmdldENvbnZlcnRlcihjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIGlmICghY29udmVydGVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCBub3QgZmluZCBjb252ZXJ0ZXIgZm9yICcgKyBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QoY3VycmVudFZhbHVlKSAmJiBjb252ZXJ0ZXIuYWNjZXB0TGlzdCAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRPYmplY3QoY29udmVydGVyLCBjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0KGNvbnZlcnRlciwgY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvdW50ZXItcGFydCB0byAnY29udmVydCcuIFRyYW5zbGF0ZXMgY29udmVydGVkIHZhbHVlcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGZvcm1cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHBhcnNlXG4gICAgICogQHBhcmFtICB7U3RyaW5nIHwgQXJyYXl9IGxpc3QgIExpc3Qgb2YgcGFyc2VycyB0byBydW4gdGhpcyB0aHJvdWdoLiBPdXRlcm1vc3QgaXMgaW52b2tlZCBmaXJzdFxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KS5yZXZlcnNlKCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgaWYgKGNvbnZlcnRlci5wYXJzZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRlci5wYXJzZShjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICB9XG59O1xuXG5cbi8vQm9vdHN0cmFwXG52YXIgZGVmYXVsdGNvbnZlcnRlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9udW1iZXItY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9zdHJpbmctY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9hcnJheS1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL3VuZGVyc2NvcmUtdXRpbHMtY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9udW1iZXJmb3JtYXQtY29udmVydGVyJyksXG5dO1xuXG4kLmVhY2goZGVmYXVsdGNvbnZlcnRlcnMucmV2ZXJzZSgpLCBmdW5jdGlvbiAoaW5kZXgsIGNvbnZlcnRlcikge1xuICAgIGlmIChfLmlzQXJyYXkoY29udmVydGVyKSkge1xuICAgICAgICBfLmVhY2goY29udmVydGVyLCBmdW5jdGlvbiAoYykge1xuICAgICAgICAgICBjb252ZXJ0ZXJNYW5hZ2VyLnJlZ2lzdGVyKGMpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb252ZXJ0ZXJNYW5hZ2VyLnJlZ2lzdGVyKGNvbnZlcnRlcik7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29udmVydGVyTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFsaWFzOiAnaScsXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlLCAxMCk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFsaWFzOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAvL1RPRE86IEZhbmN5IHJlZ2V4IHRvIG1hdGNoIG51bWJlciBmb3JtYXRzIGhlcmVcbiAgICAgICAgcmV0dXJuIChuYW1lLmluZGV4T2YoJyMnKSAhPT0gLTEgfHwgbmFtZS5pbmRleE9mKCcwJykgIT09IC0xKTtcbiAgICB9LFxuXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsKz0gJyc7XG4gICAgICAgIHZhciBpc05lZ2F0aXZlID0gdmFsLmNoYXJBdCgwKSA9PT0gJy0nO1xuXG4gICAgICAgIHZhbCAgPSB2YWwucmVwbGFjZSgvLC9nLCAnJyk7XG4gICAgICAgIHZhciBmbG9hdE1hdGNoZXIgPSAvKFstK10/WzAtOV0qXFwuP1swLTldKykoSz9NP0I/JT8pL2k7XG4gICAgICAgIHZhciByZXN1bHRzID0gZmxvYXRNYXRjaGVyLmV4ZWModmFsKTtcbiAgICAgICAgdmFyIG51bWJlciwgc3VmZml4ID0gJyc7XG4gICAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHNbMV0pIHtcbiAgICAgICAgICAgIG51bWJlciA9IHJlc3VsdHNbMV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0c1syXSkge1xuICAgICAgICAgICAgc3VmZml4ID0gcmVzdWx0c1syXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChzdWZmaXgpIHtcbiAgICAgICAgICAgIGNhc2UgJyUnOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAvIDEwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2snOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBudW1iZXIgPSBwYXJzZUZsb2F0KG51bWJlcik7XG4gICAgICAgIGlmIChpc05lZ2F0aXZlICYmIG51bWJlciA+IDApIHtcbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIC0xO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgfSxcblxuICAgIGNvbnZlcnQ6IChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHNjYWxlcyA9IFsnJywgJ0snLCAnTScsICdCJywgJ1QnXTtcblxuICAgICAgICBmdW5jdGlvbiBnZXREaWdpdHModmFsdWUsIGRpZ2l0cykge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA9PT0gMCA/IDAgOiByb3VuZFRvKHZhbHVlLCBNYXRoLm1heCgwLCBkaWdpdHMgLSBNYXRoLmNlaWwoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjEwKSkpO1xuXG4gICAgICAgICAgICB2YXIgVFhUID0gJyc7XG4gICAgICAgICAgICB2YXIgbnVtYmVyVFhUID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFsU2V0ID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGlUWFQgPSAwOyBpVFhUIDwgbnVtYmVyVFhULmxlbmd0aDsgaVRYVCsrKSB7XG4gICAgICAgICAgICAgICAgVFhUICs9IG51bWJlclRYVC5jaGFyQXQoaVRYVCk7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5jaGFyQXQoaVRYVCkgPT09ICcuJykge1xuICAgICAgICAgICAgICAgICAgICBkZWNpbWFsU2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkaWdpdHMtLTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZGlnaXRzIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVjaW1hbFNldCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnLic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoZGlnaXRzID4gMCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnMCc7XG4gICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkRGVjaW1hbHModmFsdWUsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICBoYXNDb21tYXMgPSBoYXNDb21tYXMgfHwgdHJ1ZTtcbiAgICAgICAgICAgIHZhciBudW1iZXJUWFQgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIGhhc0RlY2ltYWxzID0gKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA+IDEpO1xuICAgICAgICAgICAgdmFyIGlEZWMgPSAwO1xuXG4gICAgICAgICAgICBpZiAoaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaUNoYXIgPSBudW1iZXJUWFQubGVuZ3RoIC0gMTsgaUNoYXIgPiAwOyBpQ2hhci0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNEZWNpbWFscykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULmNoYXJBdChpQ2hhcikgIT09ICcuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpRGVjID0gKGlEZWMgKyAxKSAlIDM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaURlYyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCA9IG51bWJlclRYVC5zdWJzdHIoMCwgaUNoYXIpICsgJywnICsgbnVtYmVyVFhULnN1YnN0cihpQ2hhcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkZWNpbWFscyA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9BREQ7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHM7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCArPSAnLic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0b0FERCA9IG1pbkRlY2ltYWxzIC0gbnVtYmVyVFhULnNwbGl0KCcuJylbMV0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcwJztcbiAgICAgICAgICAgICAgICAgICAgdG9BREQtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVtYmVyVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcm91bmRUbyh2YWx1ZSwgZGlnaXRzKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh2YWx1ZSAqIE1hdGgucG93KDEwLCBkaWdpdHMpKSAvIE1hdGgucG93KDEwLCBkaWdpdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U3VmZml4KGZvcm1hdFRYVCkge1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJy4nLCAnJyk7XG4gICAgICAgICAgICB2YXIgZml4ZXNUWFQgPSBmb3JtYXRUWFQuc3BsaXQobmV3IFJlZ0V4cCgnWzB8LHwjXSsnLCAnZycpKTtcbiAgICAgICAgICAgIHJldHVybiAoZml4ZXNUWFQubGVuZ3RoID4gMSkgPyBmaXhlc1RYVFsxXS50b1N0cmluZygpIDogJyc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc0N1cnJlbmN5KHN0cmluZykge1xuICAgICAgICAgICAgdmFyIHMgPSAkLnRyaW0oc3RyaW5nKTtcblxuICAgICAgICAgICAgaWYgKHMgPT09ICckJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKsJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKlJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKjJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKhJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKxJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdLw4Q/JyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdrcicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCoicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4bigJknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqsnKSB7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZm9ybWF0KG51bWJlciwgZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXJbbnVtYmVyLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfLmlzU3RyaW5nKG51bWJlcikgJiYgIV8uaXNOdW1iZXIobnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZm9ybWF0VFhUIHx8IGZvcm1hdFRYVC50b0xvd2VyQ2FzZSgpID09PSAnZGVmYXVsdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc05hTihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICc/JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy92YXIgZm9ybWF0VFhUO1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJyZldXJvOycsICfDouKAmsKsJyk7XG5cbiAgICAgICAgICAgIC8vIERpdmlkZSArLy0gTnVtYmVyIEZvcm1hdFxuICAgICAgICAgICAgdmFyIGZvcm1hdHMgPSBmb3JtYXRUWFQuc3BsaXQoJzsnKTtcbiAgICAgICAgICAgIGlmIChmb3JtYXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0KE1hdGguYWJzKG51bWJlciksIGZvcm1hdHNbKChudW1iZXIgPj0gMCkgPyAwIDogMSldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2F2ZSBTaWduXG4gICAgICAgICAgICB2YXIgc2lnbiA9IChudW1iZXIgPj0gMCkgPyAnJyA6ICctJztcbiAgICAgICAgICAgIG51bWJlciA9IE1hdGguYWJzKG51bWJlcik7XG5cblxuICAgICAgICAgICAgdmFyIGxlZnRPZkRlY2ltYWwgPSBmb3JtYXRUWFQ7XG4gICAgICAgICAgICB2YXIgZCA9IGxlZnRPZkRlY2ltYWwuaW5kZXhPZignLicpO1xuICAgICAgICAgICAgaWYgKGQgPiAtMSkge1xuICAgICAgICAgICAgICAgIGxlZnRPZkRlY2ltYWwgPSBsZWZ0T2ZEZWNpbWFsLnN1YnN0cmluZygwLCBkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBsZWZ0T2ZEZWNpbWFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBub3JtYWxpemVkLmxhc3RJbmRleE9mKCdzJyk7XG4gICAgICAgICAgICB2YXIgaXNTaG9ydEZvcm1hdCA9IGluZGV4ID4gLTE7XG5cbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIG5leHRDaGFyID0gbGVmdE9mRGVjaW1hbC5jaGFyQXQoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09ICcgJykge1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbGVhZGluZ1RleHQgPSBpc1Nob3J0Rm9ybWF0ID8gZm9ybWF0VFhULnN1YnN0cmluZygwLCBpbmRleCkgOiAnJztcbiAgICAgICAgICAgIHZhciByaWdodE9mUHJlZml4ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKSA6IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXgpO1xuXG4gICAgICAgICAgICAvL2ZpcnN0IGNoZWNrIHRvIG1ha2Ugc3VyZSAncycgaXMgYWN0dWFsbHkgc2hvcnQgZm9ybWF0IGFuZCBub3QgcGFydCBvZiBzb21lIGxlYWRpbmcgdGV4dFxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0ID0gL1swLTkjKl0vO1xuICAgICAgICAgICAgICAgIHZhciBzaG9ydEZvcm1hdFRlc3RSZXN1bHQgPSByaWdodE9mUHJlZml4Lm1hdGNoKHNob3J0Rm9ybWF0VGVzdCk7XG4gICAgICAgICAgICAgICAgaWYgKCFzaG9ydEZvcm1hdFRlc3RSZXN1bHQgfHwgc2hvcnRGb3JtYXRUZXN0UmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvL25vIHNob3J0IGZvcm1hdCBjaGFyYWN0ZXJzIHNvIHRoaXMgbXVzdCBiZSBsZWFkaW5nIHRleHQgaWUuICd3ZWVrcyAnXG4gICAgICAgICAgICAgICAgICAgIGlzU2hvcnRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgbGVhZGluZ1RleHQgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vaWYgKGZvcm1hdFRYVC5jaGFyQXQoMCkgPT0gJ3MnKVxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsU2NhbGUgPSBudW1iZXIgPT09IDAgPyAwIDogTWF0aC5mbG9vcihNYXRoLmxvZyhNYXRoLmFicyhudW1iZXIpKSAvICgzICogTWF0aC5MTjEwKSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSAoKG51bWJlciAvIE1hdGgucG93KDEwLCAzICogdmFsU2NhbGUpKSA8IDEwMDApID8gdmFsU2NhbGUgOiAodmFsU2NhbGUgKyAxKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWF4KHZhbFNjYWxlLCAwKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWluKHZhbFNjYWxlLCA0KTtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKTtcbiAgICAgICAgICAgICAgICAvL2lmICghaXNOYU4oTnVtYmVyKGZvcm1hdFRYVC5zdWJzdHIoMSkgKSApIClcblxuICAgICAgICAgICAgICAgIGlmICghaXNOYU4oTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSAmJiByaWdodE9mUHJlZml4LmluZGV4T2YoJy4nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpbWl0RGlnaXRzID0gTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVtYmVyIDwgTWF0aC5wb3coMTAsIGxpbWl0RGlnaXRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIGdldERpZ2l0cyhudW1iZXIsIE51bWJlcihyaWdodE9mUHJlZml4KSkgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyBzaWduICsgZ2V0RGlnaXRzKG51bWJlciwgTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgTWF0aC5yb3VuZChudW1iZXIpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2Zvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIFNVRkZJWCA9IGdldFN1ZmZpeChmb3JtYXRUWFQpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDAsIGZvcm1hdFRYVC5sZW5ndGggLSBTVUZGSVgubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsV2l0aG91dExlYWRpbmcgPSBmb3JtYXQoKChzaWduID09PSAnJykgPyAxIDogLTEpICogbnVtYmVyLCBmb3JtYXRUWFQpICsgc2NhbGVzW3ZhbFNjYWxlXSArIFNVRkZJWDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpICYmIHNpZ24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxXaXRob3V0TGVhZGluZyA9IHZhbFdpdGhvdXRMZWFkaW5nLnN1YnN0cihzaWduLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdWJGb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbHM7XG4gICAgICAgICAgICB2YXIgbWluRGVjaW1hbHM7XG4gICAgICAgICAgICBpZiAoc3ViRm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIG1pbkRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnMCsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IHN1YkZvcm1hdHNbMF0gKyBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgdmFyIHByZWZmaXggPSBmaXhlc1RYVFswXS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIHN1ZmZpeCA9IChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcblxuICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogKChmb3JtYXRUWFQuc3BsaXQoJyUnKS5sZW5ndGggPiAxKSA/IDEwMCA6IDEpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICBpZiAoZm9ybWF0VFhULmluZGV4T2YoJyUnKSAhPT0gLTEpIG51bWJlciA9IG51bWJlciAqIDEwMDtcbiAgICAgICAgICAgIG51bWJlciA9IHJvdW5kVG8obnVtYmVyLCBkZWNpbWFscyk7XG5cbiAgICAgICAgICAgIHNpZ24gPSAobnVtYmVyID09PSAwKSA/ICcnIDogc2lnbjtcblxuICAgICAgICAgICAgdmFyIGhhc0NvbW1hcyA9IChmb3JtYXRUWFQuc3Vic3RyKGZvcm1hdFRYVC5sZW5ndGggLSA0IC0gc3VmZml4Lmxlbmd0aCwgMSkgPT09ICcsJyk7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVkID0gc2lnbiArIHByZWZmaXggKyBhZGREZWNpbWFscyhudW1iZXIsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSArIHN1ZmZpeDtcblxuICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKG9yaWdpbmFsTnVtYmVyLCBvcmlnaW5hbEZvcm1hdCwgZm9ybWF0dGVkKVxuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXQ7XG4gICAgfSgpKVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHM6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuIHZhbCArICcnO1xuICAgIH0sXG5cbiAgICB1cHBlckNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuICh2YWwgKyAnJykudG9VcHBlckNhc2UoKTtcbiAgICB9LFxuICAgIGxvd2VyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG4gICAgdGl0bGVDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IHZhbCArICcnO1xuICAgICAgICByZXR1cm4gdmFsLnJlcGxhY2UoL1xcd1xcUyovZywgZnVuY3Rpb24gKHR4dCkge3JldHVybiB0eHQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0eHQuc3Vic3RyKDEpLnRvTG93ZXJDYXNlKCk7fSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBsaXN0ID0gW107XG5cbnZhciBzdXBwb3J0ZWQgPSBbXG4gICAgJ3ZhbHVlcycsICdrZXlzJywgJ2NvbXBhY3QnLCAnZGlmZmVyZW5jZScsXG4gICAgJ2ZsYXR0ZW4nLCAncmVzdCcsXG4gICAgJ3VuaW9uJyxcbiAgICAndW5pcScsICd6aXAnLCAnd2l0aG91dCcsXG4gICAgJ3hvcicsICd6aXAnXG5dO1xuXy5lYWNoKHN1cHBvcnRlZCwgZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgIGFsaWFzOiBmbixcbiAgICAgICAgYWNjZXB0TGlzdDogdHJ1ZSxcbiAgICAgICAgY29udmVydDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YWwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8ubWFwVmFsdWVzKHZhbCwgX1tmbl0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX1tmbl0odmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgbGlzdC5wdXNoKGl0ZW0pO1xufSk7XG5tb2R1bGUuZXhwb3J0cyA9IGxpc3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0SGFuZGxlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9uby1vcC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvaW5pdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9mb3JlYWNoL2RlZmF1bHQtZm9yZWFjaC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9jaGVja2JveC1yYWRpby1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2lucHV0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vY2xhc3MtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vcG9zaXRpdmUtYm9vbGVhbi1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9uZWdhdGl2ZS1ib29sZWFuLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LWF0dHInKVxuXTtcblxudmFyIGhhbmRsZXJzTGlzdCA9IFtdO1xuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgaWYgKCFub2RlTWF0Y2hlcikge1xuICAgICAgICBub2RlTWF0Y2hlciA9ICcqJztcbiAgICB9XG4gICAgaWYgKF8uaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgICAgICBoYW5kbGVyID0ge1xuICAgICAgICAgICAgaGFuZGxlOiBoYW5kbGVyXG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiAkLmV4dGVuZChoYW5kbGVyLCB7IHRlc3Q6IGF0dHJpYnV0ZU1hdGNoZXIsIHRhcmdldDogbm9kZU1hdGNoZXIgfSk7XG59O1xuXG4kLmVhY2goZGVmYXVsdEhhbmRsZXJzLCBmdW5jdGlvbiAoaW5kZXgsIGhhbmRsZXIpIHtcbiAgICBoYW5kbGVyc0xpc3QucHVzaChub3JtYWxpemUoaGFuZGxlci50ZXN0LCBoYW5kbGVyLnRhcmdldCwgaGFuZGxlcikpO1xufSk7XG5cblxudmFyIG1hdGNoQXR0ciA9IGZ1bmN0aW9uIChtYXRjaEV4cHIsIGF0dHIsICRlbCkge1xuICAgIHZhciBhdHRyTWF0Y2g7XG5cbiAgICBpZiAoXy5pc1N0cmluZyhtYXRjaEV4cHIpKSB7XG4gICAgICAgIGF0dHJNYXRjaCA9IChtYXRjaEV4cHIgPT09ICcqJyB8fCAobWF0Y2hFeHByLnRvTG93ZXJDYXNlKCkgPT09IGF0dHIudG9Mb3dlckNhc2UoKSkpO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKG1hdGNoRXhwcikpIHtcbiAgICAgICAgLy9UT0RPOiByZW1vdmUgZWxlbWVudCBzZWxlY3RvcnMgZnJvbSBhdHRyaWJ1dGVzXG4gICAgICAgIGF0dHJNYXRjaCA9IG1hdGNoRXhwcihhdHRyLCAkZWwpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cChtYXRjaEV4cHIpKSB7XG4gICAgICAgIGF0dHJNYXRjaCA9IGF0dHIubWF0Y2gobWF0Y2hFeHByKTtcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJNYXRjaDtcbn07XG5cbnZhciBtYXRjaE5vZGUgPSBmdW5jdGlvbiAodGFyZ2V0LCBub2RlRmlsdGVyKSB7XG4gICAgcmV0dXJuIChfLmlzU3RyaW5nKG5vZGVGaWx0ZXIpKSA/IChub2RlRmlsdGVyID09PSB0YXJnZXQpIDogbm9kZUZpbHRlci5pcyh0YXJnZXQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaGFuZGxlcnNMaXN0LFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgaGFuZGxlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ3xmdW5jdGlvbnxyZWdleH0gYXR0cmlidXRlTWF0Y2hlciBEZXNjcmlwdGlvbiBvZiB3aGljaCBhdHRyaWJ1dGVzIHRvIG1hdGNoXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBub2RlTWF0Y2hlciAgICAgIFdoaWNoIG5vZGVzIHRvIGFsbCBhdHRyaWJ1dGVzIHRvLiBVc2UganF1ZXJ5IFNlbGVjdG9yIHN5bnRheFxuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gaGFuZGxlciAgICBIYW5kbGVyIGNhbiBlaXRoZXIgYmUgYSBmdW5jdGlvbiAoVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsZW1lbnQgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUpLCBvciBhbiBvYmplY3Qgd2l0aCB7aW5pdDogZm4sICBoYW5kbGU6IGZufS4gVGhlIGluaXQgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbiBwYWdlIGxvYWRzOyB1c2UgdGhpcyB0byBkZWZpbmUgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJzTGlzdC51bnNoaWZ0KG5vcm1hbGl6ZS5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBhbiBhdHRyaWJ1dGUgbWF0Y2hlciBtYXRjaGluZyBzb21lIGNyaXRlcmlhXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBhdHRyRmlsdGVyIGF0dHJpYnV0ZSB0byBtYXRjaFxuICAgICAqIEBwYXJhbSAge3N0cmluZyB8ICRlbH0gbm9kZUZpbHRlciBub2RlIHRvIG1hdGNoXG4gICAgICogQHJldHVybiB7YXJyYXl8bnVsbH1cbiAgICAgKi9cbiAgICBmaWx0ZXI6IGZ1bmN0aW9uIChhdHRyRmlsdGVyLCBub2RlRmlsdGVyKSB7XG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IF8uc2VsZWN0KGhhbmRsZXJzTGlzdCwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaEF0dHIoaGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChub2RlRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWx0ZXJlZCA9IF8uc2VsZWN0KGZpbHRlcmVkLCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaE5vZGUoaGFuZGxlci50YXJnZXQsIG5vZGVGaWx0ZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbiAoYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uIChjdXJyZW50SGFuZGxlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQXR0cihjdXJyZW50SGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKSAmJiBtYXRjaE5vZGUoY3VycmVudEhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBoYW5kbGVyc0xpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbiAocHJvcGVydHksICRlbCkge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSB0aGlzLmZpbHRlcihwcm9wZXJ0eSwgJGVsKTtcbiAgICAgICAgLy9UaGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBtYXRjaGVzLCBidXQgdGhlIHRvcCBmaXJzdCBoYXMgdGhlIG1vc3QgcHJpb3JpdHlcbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkWzBdO1xuICAgIH1cbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICc6Y2hlY2tib3gsOnJhZGlvJyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZXR0YWJsZVZhbHVlID0gdGhpcy5hdHRyKCd2YWx1ZScpOyAvL2luaXRpYWwgdmFsdWVcbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciBpc0NoZWNrZWQgPSAoc2V0dGFibGVWYWx1ZSAhPT0gdW5kZWZpbmVkKSA/IChzZXR0YWJsZVZhbHVlID09IHZhbHVlKSA6ICEhdmFsdWU7XG4gICAgICAgIHRoaXMucHJvcCgnY2hlY2tlZCcsIGlzQ2hlY2tlZCk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciB0ZW1wbGF0ZWQ7XG4gICAgICAgIHZhciB2YWx1ZVRvVGVtcGxhdGUgPSB2YWx1ZTtcbiAgICAgICAgaWYgKCEkLmlzUGxhaW5PYmplY3QodmFsdWUpKSB7XG4gICAgICAgICAgICB2YXIgdmFyaWFibGVOYW1lID0gdGhpcy5kYXRhKCdmLWJpbmQnKTsvL0hhY2sgYmVjYXVzZSBpIGRvbid0IGhhdmUgYWNjZXNzIHRvIHZhcmlhYmxlIG5hbWUgaGVyZSBvdGhlcndpc2VcbiAgICAgICAgICAgIHZhbHVlVG9UZW1wbGF0ZSA9IHsgdmFsdWU6IHZhbHVlIH07XG4gICAgICAgICAgICB2YWx1ZVRvVGVtcGxhdGVbdmFyaWFibGVOYW1lXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBiaW5kVGVtcGxhdGUgPSB0aGlzLmRhdGEoJ2JpbmQtdGVtcGxhdGUnKTtcbiAgICAgICAgaWYgKGJpbmRUZW1wbGF0ZSkge1xuICAgICAgICAgICAgdGVtcGxhdGVkID0gXy50ZW1wbGF0ZShiaW5kVGVtcGxhdGUsIHZhbHVlVG9UZW1wbGF0ZSk7XG4gICAgICAgICAgICB0aGlzLmh0bWwodGVtcGxhdGVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvbGRIVE1MID0gdGhpcy5odG1sKCk7XG4gICAgICAgICAgICB2YXIgY2xlYW5lZEhUTUwgPSBvbGRIVE1MLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgICAgICB0ZW1wbGF0ZWQgPSBfLnRlbXBsYXRlKGNsZWFuZWRIVE1MLCB2YWx1ZVRvVGVtcGxhdGUpO1xuICAgICAgICAgICAgaWYgKGNsZWFuZWRIVE1MID09PSB0ZW1wbGF0ZWQpIHsgLy90ZW1wbGF0aW5nIGRpZCBub3RoaW5nXG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFsdWUgKz0gJyc7XG4gICAgICAgICAgICAgICAgdGhpcy5odG1sKHZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhKCdiaW5kLXRlbXBsYXRlJywgY2xlYW5lZEhUTUwpO1xuICAgICAgICAgICAgICAgIHRoaXMuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnaW5wdXQsIHNlbGVjdCcsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZhbCh2YWx1ZSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnY2xhc3MnLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhZGRlZENsYXNzZXMgPSB0aGlzLmRhdGEoJ2FkZGVkLWNsYXNzZXMnKTtcbiAgICAgICAgaWYgKCFhZGRlZENsYXNzZXMpIHtcbiAgICAgICAgICAgIGFkZGVkQ2xhc3NlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChhZGRlZENsYXNzZXNbcHJvcF0pIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoYWRkZWRDbGFzc2VzW3Byb3BdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSAndmFsdWUtJyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGFkZGVkQ2xhc3Nlc1twcm9wXSA9IHZhbHVlO1xuICAgICAgICAvL0ZpeG1lOiBwcm9wIGlzIGFsd2F5cyBcImNsYXNzXCJcbiAgICAgICAgdGhpcy5hZGRDbGFzcyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycsIGFkZGVkQ2xhc3Nlcyk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnKicsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWx1ZSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24tJykgPT09IDApO1xuICAgIH0sXG5cbiAgICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHRoaXMub2ZmKGF0dHIpO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24tJywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB0aGlzLm9mZihhdHRyKS5vbihhdHRyLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGZuTmFtZSwgcGFyYW1zOiBhcmdzIH07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWUudHJpZ2dlcignZi51aS5vcGVyYXRlJywgeyBvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWUgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi1pbml0JykgPT09IDApO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24taW5pdCcsICcnKTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgJChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGZuTmFtZSwgcGFyYW1zOiBhcmdzIH07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWUudHJpZ2dlcignZi51aS5vcGVyYXRlJywgeyBvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWUgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi91dGlscy9wYXJzZS11dGlscycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnZm9yZWFjaCcsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHZhbHVlID0gKCQuaXNQbGFpbk9iamVjdCh2YWx1ZSkgPyB2YWx1ZSA6IFtdLmNvbmNhdCh2YWx1ZSkpO1xuICAgICAgICB2YXIgJGxvb3BUZW1wbGF0ZSA9IHRoaXMuZGF0YSgnZm9yZWFjaC10ZW1wbGF0ZScpO1xuICAgICAgICBpZiAoISRsb29wVGVtcGxhdGUpIHtcbiAgICAgICAgICAgICRsb29wVGVtcGxhdGUgPSB0aGlzLmNoaWxkcmVuKCk7XG4gICAgICAgICAgICB0aGlzLmRhdGEoJ2ZvcmVhY2gtdGVtcGxhdGUnLCAkbG9vcFRlbXBsYXRlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgJG1lID0gdGhpcy5lbXB0eSgpO1xuICAgICAgICBfLmVhY2godmFsdWUsIGZ1bmN0aW9uIChkYXRhdmFsLCBkYXRha2V5KSB7XG4gICAgICAgICAgICBkYXRhdmFsID0gZGF0YXZhbCArICcnO1xuICAgICAgICAgICAgdmFyIG5vZGVzID0gJGxvb3BUZW1wbGF0ZS5jbG9uZSgpO1xuICAgICAgICAgICAgbm9kZXMuZWFjaChmdW5jdGlvbiAoaSwgbmV3Tm9kZSkge1xuICAgICAgICAgICAgICAgIG5ld05vZGUgPSAkKG5ld05vZGUpO1xuICAgICAgICAgICAgICAgIF8uZWFjaChuZXdOb2RlLmRhdGEoKSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZWQgPSAgXy50ZW1wbGF0ZSh2YWwsIHsgdmFsdWU6IGRhdGF2YWwsIGluZGV4OiBkYXRha2V5LCBrZXk6IGRhdGFrZXkgfSk7XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUuZGF0YShrZXksIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodGVtcGxhdGVkKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIG9sZEhUTUwgPSBuZXdOb2RlLmh0bWwoKTtcbiAgICAgICAgICAgICAgICB2YXIgY2xlYW5lZEhUTUwgPSBvbGRIVE1MLnJlcGxhY2UoLyZsdDsvZywgJzwnKS5yZXBsYWNlKC8mZ3Q7L2csICc+Jyk7XG4gICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlZCA9IF8udGVtcGxhdGUoY2xlYW5lZEhUTUwsIHsgdmFsdWU6IGRhdGF2YWwsIGtleTogZGF0YWtleSwgaW5kZXg6IGRhdGFrZXkgfSk7XG4gICAgICAgICAgICAgICAgaWYgKGNsZWFuZWRIVE1MID09PSB0ZW1wbGF0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3Tm9kZS5odG1sKGRhdGF2YWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld05vZGUuaHRtbCh0ZW1wbGF0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkbWUuYXBwZW5kKG5ld05vZGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmRpc2FibGVkfGhpZGRlbnxyZWFkb25seSkkL2ksXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByb3AocHJvcCwgIXZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBBdHRyaWJ1dGVzIHdoaWNoIGFyZSBqdXN0IHBhcmFtZXRlcnMgdG8gb3RoZXJzIGFuZCBjYW4ganVzdCBiZSBpZ25vcmVkXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzptb2RlbHxjb252ZXJ0KSQvaSxcblxuICAgIGhhbmRsZTogJC5ub29wLFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmNoZWNrZWR8c2VsZWN0ZWR8YXN5bmN8YXV0b2ZvY3VzfGF1dG9wbGF5fGNvbnRyb2xzfGRlZmVyfGlzbWFwfGxvb3B8bXVsdGlwbGV8b3BlbnxyZXF1aXJlZHxzY29wZWQpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciB2YWwgPSAodGhpcy5hdHRyKCd2YWx1ZScpKSA/ICh2YWx1ZSA9PSB0aGlzLnByb3AoJ3ZhbHVlJykpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbCk7XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG4gICAgdmFyIG5vZGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9ub2Rlcy9ub2RlLW1hbmFnZXInKTtcbiAgICB2YXIgYXR0ck1hbmFnZXIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXMvYXR0cmlidXRlLW1hbmFnZXInKTtcbiAgICB2YXIgY29udmVydGVyTWFuYWdlciA9IHJlcXVpcmUoJy4uL2NvbnZlcnRlcnMvY29udmVydGVyLW1hbmFnZXInKTtcblxuICAgIHZhciBwYXJzZVV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvcGFyc2UtdXRpbHMnKTtcbiAgICB2YXIgZG9tVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9kb20nKTtcblxuICAgIHZhciBhdXRvVXBkYXRlUGx1Z2luID0gcmVxdWlyZSgnLi9wbHVnaW5zL2F1dG8tdXBkYXRlLWJpbmRpbmdzJyk7XG5cbiAgICAvL0pxdWVyeSBzZWxlY3RvciB0byByZXR1cm4gZXZlcnl0aGluZyB3aGljaCBoYXMgYSBmLSBwcm9wZXJ0eSBzZXRcbiAgICAkLmV4cHJbJzonXVtjb25maWcucHJlZml4XSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyICR0aGlzID0gJChvYmopO1xuICAgICAgICB2YXIgZGF0YXByb3BzID0gXy5rZXlzKCR0aGlzLmRhdGEoKSk7XG5cbiAgICAgICAgdmFyIG1hdGNoID0gXy5maW5kKGRhdGFwcm9wcywgZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKGNvbmZpZy5wcmVmaXgpID09PSAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuICEhKG1hdGNoKTtcbiAgICB9O1xuXG4gICAgJC5leHByWyc6J10ud2ViY29tcG9uZW50ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqLm5vZGVOYW1lLmluZGV4T2YoJy0nKSAhPT0gLTE7XG4gICAgfTtcblxuICAgIHZhciBnZXRNYXRjaGluZ0VsZW1lbnRzID0gZnVuY3Rpb24gKHJvb3QpIHtcbiAgICAgICAgdmFyICRyb290ID0gJChyb290KTtcbiAgICAgICAgdmFyIG1hdGNoZWRFbGVtZW50cyA9ICRyb290LmZpbmQoJzonICsgY29uZmlnLnByZWZpeCk7XG4gICAgICAgIGlmICgkcm9vdC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgbWF0Y2hlZEVsZW1lbnRzID0gbWF0Y2hlZEVsZW1lbnRzLmFkZCgkcm9vdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1hdGNoZWRFbGVtZW50cztcbiAgICB9O1xuXG4gICAgdmFyIGdldEVsZW1lbnRPckVycm9yID0gZnVuY3Rpb24gKGVsZW1lbnQsIGNvbnRleHQpIHtcbiAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiAkKSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5nZXQoMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFlbGVtZW50IHx8ICFlbGVtZW50Lm5vZGVOYW1lKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGNvbnRleHQsICdFeHBlY3RlZCB0byBnZXQgRE9NIEVsZW1lbnQsIGdvdCAnLCBlbGVtZW50KTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihjb250ZXh0ICsgJzogRXhwZWN0ZWQgdG8gZ2V0IERPTSBFbGVtZW50LCBnb3QnICsgKHR5cGVvZiBlbGVtZW50KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG5cbiAgICAgICAgbm9kZXM6IG5vZGVNYW5hZ2VyLFxuICAgICAgICBhdHRyaWJ1dGVzOiBhdHRyTWFuYWdlcixcbiAgICAgICAgY29udmVydGVyczogY29udmVydGVyTWFuYWdlcixcbiAgICAgICAgLy91dGlscyBmb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBtYXRjaGVkRWxlbWVudHM6IFtdXG4gICAgICAgIH0sXG5cbiAgICAgICAgdW5iaW5kRWxlbWVudDogZnVuY3Rpb24gKGVsZW1lbnQsIGNoYW5uZWwpIHtcbiAgICAgICAgICAgIGlmICghY2hhbm5lbCkge1xuICAgICAgICAgICAgICAgIGNoYW5uZWwgPSB0aGlzLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbGVtZW50ID0gZ2V0RWxlbWVudE9yRXJyb3IoZWxlbWVudCk7XG4gICAgICAgICAgICB2YXIgJGVsID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGlmICghJGVsLmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cyA9IF8ud2l0aG91dCh0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzLCBlbGVtZW50KTtcblxuICAgICAgICAgICAgLy9GSVhNRTogaGF2ZSB0byByZWFkZCBldmVudHMgdG8gYmUgYWJsZSB0byByZW1vdmUgdGhlbS4gVWdseVxuICAgICAgICAgICAgdmFyIEhhbmRsZXIgPSBub2RlTWFuYWdlci5nZXRIYW5kbGVyKCRlbCk7XG4gICAgICAgICAgICB2YXIgaCA9IG5ldyBIYW5kbGVyLmhhbmRsZSh7XG4gICAgICAgICAgICAgICAgZWw6IGVsZW1lbnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGgucmVtb3ZlRXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgaC5yZW1vdmVFdmVudHMoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJChlbGVtZW50LmF0dHJpYnV0ZXMpLmVhY2goZnVuY3Rpb24gKGluZGV4LCBub2RlTWFwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBub2RlTWFwLm5vZGVOYW1lO1xuICAgICAgICAgICAgICAgIHZhciB3YW50ZWRQcmVmaXggPSAnZGF0YS1mLSc7XG4gICAgICAgICAgICAgICAgaWYgKGF0dHIuaW5kZXhPZih3YW50ZWRQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2Uod2FudGVkUHJlZml4LCAnJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKGF0dHIsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyLnN0b3BMaXN0ZW5pbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuc3RvcExpc3RlbmluZy5jYWxsKCRlbCwgYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHN1YnNpZCA9ICRlbC5kYXRhKCdmLXN1YnNjcmlwdGlvbi1pZCcpIHx8IFtdO1xuICAgICAgICAgICAgXy5lYWNoKHN1YnNpZCwgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsLnVuc3Vic2NyaWJlKHN1YnMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYmluZEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50LCBjaGFubmVsKSB7XG4gICAgICAgICAgICBpZiAoIWNoYW5uZWwpIHtcbiAgICAgICAgICAgICAgICBjaGFubmVsID0gdGhpcy5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxlbWVudCA9IGdldEVsZW1lbnRPckVycm9yKGVsZW1lbnQpO1xuICAgICAgICAgICAgdmFyICRlbCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoISRlbC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghXy5jb250YWlucyh0aGlzLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzLCBlbGVtZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9TZW5kIHRvIG5vZGUgbWFuYWdlciB0byBoYW5kbGUgdWkgY2hhbmdlc1xuICAgICAgICAgICAgdmFyIEhhbmRsZXIgPSBub2RlTWFuYWdlci5nZXRIYW5kbGVyKCRlbCk7XG4gICAgICAgICAgICBuZXcgSGFuZGxlci5oYW5kbGUoe1xuICAgICAgICAgICAgICAgIGVsOiBlbGVtZW50XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHN1YnNjcmliZSA9IGZ1bmN0aW9uIChjaGFubmVsLCB2YXJzVG9CaW5kLCAkZWwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXZhcnNUb0JpbmQgfHwgIXZhcnNUb0JpbmQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHN1YnNpZCA9IGNoYW5uZWwuc3Vic2NyaWJlKHZhcnNUb0JpbmQsICRlbCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld3N1YnMgPSAoJGVsLmRhdGEoJ2Ytc3Vic2NyaXB0aW9uLWlkJykgfHwgW10pLmNvbmNhdChzdWJzaWQpO1xuICAgICAgICAgICAgICAgICRlbC5kYXRhKCdmLXN1YnNjcmlwdGlvbi1pZCcsIG5ld3N1YnMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGF0dHJCaW5kaW5ncyA9IFtdO1xuICAgICAgICAgICAgdmFyIG5vbkJhdGNoYWJsZVZhcmlhYmxlcyA9IFtdO1xuICAgICAgICAgICAgLy9OT1RFOiBsb29waW5nIHRocm91Z2ggYXR0cmlidXRlcyBpbnN0ZWFkIG9mIC5kYXRhIGJlY2F1c2UgLmRhdGEgYXV0b21hdGljYWxseSBjYW1lbGNhc2VzIHByb3BlcnRpZXMgYW5kIG1ha2UgaXQgaGFyZCB0byByZXRydmlldmVcbiAgICAgICAgICAgICQoZWxlbWVudC5hdHRyaWJ1dGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbm9kZU1hcCkge1xuICAgICAgICAgICAgICAgIHZhciBhdHRyID0gbm9kZU1hcC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9IG5vZGVNYXAudmFsdWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgd2FudGVkUHJlZml4ID0gJ2RhdGEtZi0nO1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLmluZGV4T2Yod2FudGVkUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKHdhbnRlZFByZWZpeCwgJycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihhdHRyLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXNCaW5kYWJsZUF0dHIgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmluaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQmluZGFibGVBdHRyID0gaGFuZGxlci5pbml0LmNhbGwoJGVsLCBhdHRyLCBhdHRyVmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0JpbmRhYmxlQXR0cikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9Db252ZXJ0IHBpcGVzIHRvIGNvbnZlcnRlciBhdHRyc1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpdGhDb252ID0gXy5pbnZva2UoYXR0clZhbC5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpdGhDb252Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyVmFsID0gd2l0aENvbnYuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGF0YSgnZi1jb252ZXJ0LScgKyBhdHRyLCB3aXRoQ29udik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiaW5kaW5nID0geyBhdHRyOiBhdHRyIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29tbWFSZWdleCA9IC8sKD8hW15cXFtdKlxcXSkvO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJWYWwuaW5kZXhPZignPCUnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0Fzc3VtZSBpdCdzIHRlbXBsYXRlZCBmb3IgbGF0ZXIgdXNlXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXR0clZhbC5zcGxpdChjb21tYVJlZ2V4KS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhcnNUb0JpbmQgPSBfLmludm9rZShhdHRyVmFsLnNwbGl0KGNvbW1hUmVnZXgpLCAndHJpbScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZShjaGFubmVsLCB2YXJzVG9CaW5kLCAkZWwsIHsgYmF0Y2g6IHRydWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmluZGluZy50b3BpY3MgPSB2YXJzVG9CaW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaW5kaW5nLnRvcGljcyA9IFthdHRyVmFsXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub25CYXRjaGFibGVWYXJpYWJsZXMucHVzaChhdHRyVmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJCaW5kaW5ncy5wdXNoKGJpbmRpbmcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZWwuZGF0YSgnYXR0ci1iaW5kaW5ncycsIGF0dHJCaW5kaW5ncyk7XG4gICAgICAgICAgICBpZiAobm9uQmF0Y2hhYmxlVmFyaWFibGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdzdWJzY3JpYmUnLCBub25CYXRjaGFibGVWYXJpYWJsZXMsICRlbC5nZXQoMCkpXG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlKGNoYW5uZWwsIG5vbkJhdGNoYWJsZVZhcmlhYmxlcywgJGVsLCB7IGJhdGNoOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQmluZCBhbGwgcHJvdmlkZWQgZWxlbWVudHNcbiAgICAgICAgICogQHBhcmFtICB7QXJyYXl8alF1ZXJ5U2VsZWN0b3J9IGVsZW1lbnRzVG9CaW5kIChPcHRpb25hbCkgSWYgbm90IHByb3ZpZGVkIHVzZXMgdGhlIGRlZmF1bHQgcm9vdCBwcm92aWRlZCBhdCBpbml0aWFsaXphdGlvblxuICAgICAgICAgKi9cbiAgICAgICAgYmluZEFsbDogZnVuY3Rpb24gKGVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzVG9CaW5kKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHNUb0JpbmQgPSBnZXRNYXRjaGluZ0VsZW1lbnRzKHRoaXMub3B0aW9ucy5yb290KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIV8uaXNBcnJheShlbGVtZW50c1RvQmluZCkpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvQmluZCA9IGdldE1hdGNoaW5nRWxlbWVudHMoZWxlbWVudHNUb0JpbmQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgLy9wYXJzZSB0aHJvdWdoIGRvbSBhbmQgZmluZCBldmVyeXRoaW5nIHdpdGggbWF0Y2hpbmcgYXR0cmlidXRlc1xuICAgICAgICAgICAgJC5lYWNoKGVsZW1lbnRzVG9CaW5kLCBmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBtZS5iaW5kRWxlbWVudC5jYWxsKG1lLCBlbGVtZW50LCBtZS5vcHRpb25zLmNoYW5uZWwudmFyaWFibGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogVW5iaW5kIHByb3ZpZGVkIGVsZW1lbnRzXG4gICAgICAgICAqIEBwYXJhbSAge0FycmF5fSBlbGVtZW50c1RvVW5iaW5kIChPcHRpb25hbCkuIElmIG5vdCBwcm92aWRlZCB1bmJpbmRzIGV2ZXJ5dGhpbmdcbiAgICAgICAgICovXG4gICAgICAgIHVuYmluZEFsbDogZnVuY3Rpb24gKGVsZW1lbnRzVG9VbmJpbmQpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICBpZiAoIWVsZW1lbnRzVG9VbmJpbmQpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1RvVW5iaW5kID0gdGhpcy5wcml2YXRlLm1hdGNoZWRFbGVtZW50cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQuZWFjaChlbGVtZW50c1RvVW5iaW5kLCBmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBtZS51bmJpbmRFbGVtZW50LmNhbGwobWUsIGVsZW1lbnQsIG1lLm9wdGlvbnMuY2hhbm5lbC52YXJpYWJsZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiBSb290IG9mIHRoZSBlbGVtZW50IGZvciBmbG93IHRvIG1hbmFnZSBmcm9tLlxuICAgICAgICAgICAgICAgICAqIEB0eXBlIHtTdHJpbmd9IGpRdWVyeSBzZWxlY3RvclxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBjaGFubmVsOiBudWxsLFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogQW55IHZhcmlhYmxlcyBhZGRlZCB0byB0aGUgZG9tIGFmdGVyIEZsb3cuaW5pdGlhbGl6ZSBoYXMgYmVlbiBjYWxsZWQgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHBhcnNlZCBhbmQgc3Vic2NyaXB0aW9ucyBhZGRlZCB0byBjaGFubmVscy4gTm90ZSwgdGhpcyBkb2VzIG5vdCB3b3JrIGluIElFIHZlcnNpb25zIDwgMTFcbiAgICAgICAgICAgICAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICBhdXRvQmluZDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICQuZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBkZWZhdWx0cy5jaGFubmVsO1xuXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSBkZWZhdWx0cztcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZhciAkcm9vdCA9ICQoZGVmYXVsdHMucm9vdCk7XG4gICAgICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBtZS5iaW5kQWxsKCk7XG4gICAgICAgICAgICAgICAgJHJvb3QudHJpZ2dlcignZi5kb21yZWFkeScpO1xuXG4gICAgICAgICAgICAgICAgLy9BdHRhY2ggbGlzdGVuZXJzXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciBjaGFuZ2VzIHRvIHVpIGFuZCBwdWJsaXNoIHRvIGFwaVxuICAgICAgICAgICAgICAgICRyb290Lm9mZihjb25maWcuZXZlbnRzLnRyaWdnZXIpLm9uKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyc2VkRGF0YSA9IHt9OyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcblxuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gIGRvbVV0aWxzLmdldENvbnZlcnRlcnNMaXN0KCRlbCwgJ2JpbmQnKTtcblxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXkgPSBrZXkuc3BsaXQoJ3wnKVswXS50cmltKCk7IC8vaW4gY2FzZSB0aGUgcGlwZSBmb3JtYXR0aW5nIHN5bnRheCB3YXMgdXNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gY29udmVydGVyTWFuYWdlci5wYXJzZSh2YWwsIGF0dHJDb252ZXJ0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGFba2V5XSA9IHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodmFsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsLnRyaWdnZXIoJ2YuY29udmVydCcsIHsgYmluZDogdmFsIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLnZhcmlhYmxlcy5wdWJsaXNoKHBhcnNlZERhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciBjaGFuZ2VzIGZyb20gYXBpIGFuZCB1cGRhdGUgdWlcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy5yZWFjdCkub24oY29uZmlnLmV2ZW50cy5yZWFjdCwgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhldnQudGFyZ2V0LCBkYXRhLCBcInJvb3Qgb25cIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmluZGluZ3MgPSAkZWwuZGF0YSgnYXR0ci1iaW5kaW5ncycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0b2NvbnZlcnQgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2goYmluZGluZ3MsIGZ1bmN0aW9uIChiaW5kaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uY29udGFpbnMoYmluZGluZy50b3BpY3MsIHZhcmlhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJpbmRpbmcudG9waWNzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvY29udmVydFtiaW5kaW5nLmF0dHJdID0gXy5waWNrKGRhdGEsIGJpbmRpbmcudG9waWNzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvY29udmVydFtiaW5kaW5nLmF0dHJdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICRlbC50cmlnZ2VyKCdmLmNvbnZlcnQnLCB0b2NvbnZlcnQpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gZGF0YSA9IHtwcm9wdG91cGRhdGU6IHZhbHVlfSB8fCBqdXN0IGEgdmFsdWUgKGFzc3VtZXMgJ2JpbmQnIGlmIHNvKVxuICAgICAgICAgICAgICAgICRyb290Lm9mZignZi5jb252ZXJ0Jykub24oJ2YuY29udmVydCcsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKHZhbCwgcHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHByb3AudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICBkb21VdGlscy5nZXRDb252ZXJ0ZXJzTGlzdCgkZWwsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKHByb3AsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydGVkVmFsdWUgPSBjb252ZXJ0ZXJNYW5hZ2VyLmNvbnZlcnQodmFsLCBhdHRyQ29udmVydGVycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLmhhbmRsZS5jYWxsKCRlbCwgY29udmVydGVkVmFsdWUsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLCBjb252ZXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnQoZGF0YSwgJ2JpbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLnVpLm9wZXJhdGUnKS5vbignZi51aS5vcGVyYXRlJywgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gJC5leHRlbmQodHJ1ZSwge30sIGRhdGEpOyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEub3BlcmF0aW9ucywgZnVuY3Rpb24gKG9wbikge1xuICAgICAgICAgICAgICAgICAgICAgICBvcG4ucGFyYW1zID0gXy5tYXAob3BuLnBhcmFtcywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUoJC50cmltKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1lLm9wdGlvbnMuYXV0b0JpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgYXV0b1VwZGF0ZVBsdWdpbigkcm9vdC5nZXQoMCksIG1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn0oKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBleHRlbmQgPSBmdW5jdGlvbiAocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgY2hpbGQ7XG5cbiAgICAvLyBUaGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHRoZSBuZXcgc3ViY2xhc3MgaXMgZWl0aGVyIGRlZmluZWQgYnkgeW91XG4gICAgLy8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG4gICAgLy8gYnkgdXMgdG8gc2ltcGx5IGNhbGwgdGhlIHBhcmVudCdzIGNvbnN0cnVjdG9yLlxuICAgIGlmIChwcm90b1Byb3BzICYmIF8uaGFzKHByb3RvUHJvcHMsICdjb25zdHJ1Y3RvcicpKSB7XG4gICAgICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9O1xuICAgIH1cblxuICAgIC8vIEFkZCBzdGF0aWMgcHJvcGVydGllcyB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24sIGlmIHN1cHBsaWVkLlxuICAgIF8uZXh0ZW5kKGNoaWxkLCBwYXJlbnQsIHN0YXRpY1Byb3BzKTtcblxuICAgIC8vIFNldCB0aGUgcHJvdG90eXBlIGNoYWluIHRvIGluaGVyaXQgZnJvbSBgcGFyZW50YCwgd2l0aG91dCBjYWxsaW5nXG4gICAgLy8gYHBhcmVudGAncyBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICB2YXIgU3Vycm9nYXRlID0gZnVuY3Rpb24gKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH07XG4gICAgU3Vycm9nYXRlLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgY2hpbGQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZSgpO1xuXG4gICAgLy8gQWRkIHByb3RvdHlwZSBwcm9wZXJ0aWVzIChpbnN0YW5jZSBwcm9wZXJ0aWVzKSB0byB0aGUgc3ViY2xhc3MsXG4gICAgLy8gaWYgc3VwcGxpZWQuXG4gICAgaWYgKHByb3RvUHJvcHMpIHtcbiAgICAgICAgXy5leHRlbmQoY2hpbGQucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgYSBjb252ZW5pZW5jZSBwcm9wZXJ0eSBpbiBjYXNlIHRoZSBwYXJlbnQncyBwcm90b3R5cGUgaXMgbmVlZGVkXG4gICAgLy8gbGF0ZXIuXG4gICAgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblxuICAgIHJldHVybiBjaGlsZDtcbn07XG5cbnZhciBWaWV3ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbCA9IChvcHRpb25zLiRlbCkgfHwgJChvcHRpb25zLmVsKTtcbiAgICB0aGlzLmVsID0gb3B0aW9ucy5lbDtcbiAgICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxufTtcblxuXy5leHRlbmQoVmlldy5wcm90b3R5cGUsIHtcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7fSxcbn0pO1xuXG5WaWV3LmV4dGVuZCA9IGV4dGVuZDtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2NvbmZpZycpO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtdLFxuXG4gICAgdWlDaGFuZ2VFdmVudDogJ2NoYW5nZScsXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwudmFsKCk7XG4gICAgfSxcblxuICAgIHJlbW92ZUV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLiRlbC5vZmYodGhpcy51aUNoYW5nZUV2ZW50KTtcbiAgICB9LFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB2YXIgcHJvcE5hbWUgPSB0aGlzLiRlbC5kYXRhKGNvbmZpZy5iaW5kZXJBdHRyKTtcblxuICAgICAgICBpZiAocHJvcE5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLm9mZih0aGlzLnVpQ2hhbmdlRXZlbnQpLm9uKHRoaXMudWlDaGFuZ2VFdmVudCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBtZS5nZXRVSVZhbHVlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgcGFyYW1zW3Byb3BOYW1lXSA9IHZhbDtcblxuICAgICAgICAgICAgICAgIG1lLiRlbC50cmlnZ2VyKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgcGFyYW1zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJ2lucHV0LCBzZWxlY3QnIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtcblxuICAgIF0sXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJyonIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuXG4gICAgcHJvcGVydHlIYW5kbGVyczogW1xuXG4gICAgXSxcblxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbCA9IHRoaXMuJGVsO1xuICAgICAgICAvL1RPRE86IGZpbGUgYSBpc3N1ZSBmb3IgdGhlIHZlbnNpbSBtYW5hZ2VyIHRvIGNvbnZlcnQgdHJ1ZXMgdG8gMXMgYW5kIHNldCB0aGlzIHRvIHRydWUgYW5kIGZhbHNlXG5cbiAgICAgICAgdmFyIG9mZlZhbCA9ICAoJGVsLmRhdGEoJ2Ytb2ZmJykgIT09IHVuZGVmaW5lZCkgPyAkZWwuZGF0YSgnZi1vZmYnKSA6IDA7XG4gICAgICAgIC8vYXR0ciA9IGluaXRpYWwgdmFsdWUsIHByb3AgPSBjdXJyZW50IHZhbHVlXG4gICAgICAgIHZhciBvblZhbCA9ICgkZWwuYXR0cigndmFsdWUnKSAhPT0gdW5kZWZpbmVkKSA/ICRlbC5wcm9wKCd2YWx1ZScpOiAxO1xuXG4gICAgICAgIHZhciB2YWwgPSAoJGVsLmlzKCc6Y2hlY2tlZCcpKSA/IG9uVmFsIDogb2ZmVmFsO1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICc6Y2hlY2tib3gsOnJhZGlvJyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHNlbGVjdG9yID0gJyonO1xuICAgIH1cbiAgICBoYW5kbGVyLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgcmV0dXJuIGhhbmRsZXI7XG59O1xuXG52YXIgbWF0Y2ggPSBmdW5jdGlvbiAodG9NYXRjaCwgbm9kZSkge1xuICAgIGlmIChfLmlzU3RyaW5nKHRvTWF0Y2gpKSB7XG4gICAgICAgIHJldHVybiB0b01hdGNoID09PSBub2RlLnNlbGVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAkKHRvTWF0Y2gpLmlzKG5vZGUuc2VsZWN0b3IpO1xuICAgIH1cbn07XG5cbnZhciBub2RlTWFuYWdlciA9IHtcbiAgICBsaXN0OiBbXSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBub2RlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IHNlbGVjdG9yIGpRdWVyeS1jb21wYXRpYmxlIHNlbGVjdG9yIHRvIHVzZSB0byBtYXRjaCBub2Rlc1xuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyICBIYW5kbGVycyBhcmUgbmV3LWFibGUgZnVuY3Rpb25zLiBUaGV5IHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsIGFzIGNvbnRleHQuPyBUT0RPOiBUaGluayB0aGlzIHRocm91Z2hcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMubGlzdC51bnNoaWZ0KG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2goc2VsZWN0b3IsIG5vZGUpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24gKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGN1cnJlbnRIYW5kbGVyLnNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH1cbn07XG5cbi8vYm9vdHN0cmFwc1xudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL2lucHV0LWNoZWNrYm94LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJylcbl07XG5fLmVhY2goZGVmYXVsdEhhbmRsZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICBub2RlTWFuYWdlci5yZWdpc3RlcihoYW5kbGVyLnNlbGVjdG9yLCBoYW5kbGVyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vZGVNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0YXJnZXQsIGRvbU1hbmFnZXIpIHtcbiAgICBpZiAoIXdpbmRvdy5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYW4gb2JzZXJ2ZXIgaW5zdGFuY2VcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAobXV0YXRpb25zKSB7XG4gICAgICBtdXRhdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAobXV0YXRpb24pIHtcbiAgICAgICAgdmFyIGFkZGVkID0gJChtdXRhdGlvbi5hZGRlZE5vZGVzKS5maW5kKCc6ZicpO1xuICAgICAgICBhZGRlZCA9IGFkZGVkLmFkZCgkKG11dGF0aW9uLmFkZGVkTm9kZXMpLmZpbHRlcignOmYnKSk7XG5cbiAgICAgICAgdmFyIHJlbW92ZWQgPSAkKG11dGF0aW9uLnJlbW92ZWROb2RlcykuZmluZCgnOmYnKTtcbiAgICAgICAgcmVtb3ZlZCA9IHJlbW92ZWQuYWRkKCQobXV0YXRpb24ucmVtb3ZlZE5vZGVzKS5maWx0ZXIoJzpmJykpO1xuXG4gICAgICAgIGlmIChhZGRlZCAmJiBhZGRlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGlvbiBvYnNlcnZlciBhZGRlZCcsIGFkZGVkLmdldCgpLCBtdXRhdGlvbi5hZGRlZE5vZGVzKTtcbiAgICAgICAgICAgIGRvbU1hbmFnZXIuYmluZEFsbChhZGRlZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlbW92ZWQgJiYgcmVtb3ZlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdtdXRhdGlvbiBvYnNlcnZlciByZW1vdmVkJywgcmVtb3ZlZCk7XG4gICAgICAgICAgICBkb21NYW5hZ2VyLnVuYmluZEFsbChyZW1vdmVkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB2YXIgbXV0Y29uZmlnID0ge1xuICAgICAgICBhdHRyaWJ1dGVzOiBmYWxzZSxcbiAgICAgICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICBzdWJ0cmVlOiB0cnVlLFxuICAgICAgICBjaGFyYWN0ZXJEYXRhOiBmYWxzZVxuICAgIH07XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZSh0YXJnZXQsIG11dGNvbmZpZyk7XG4gICAgLy8gTGF0ZXIsIHlvdSBjYW4gc3RvcCBvYnNlcnZpbmdcbiAgICAvLyBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZG9tTWFuYWdlciA9IHJlcXVpcmUoJy4vZG9tL2RvbS1tYW5hZ2VyJyk7XG52YXIgQ2hhbm5lbCA9IHJlcXVpcmUoJy4vY2hhbm5lbHMvcnVuLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZG9tOiBkb21NYW5hZ2VyLFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICB2YXIgbW9kZWwgPSAkKCdib2R5JykuZGF0YSgnZi1tb2RlbCcpO1xuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudDogJycsXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICcnLFxuICAgICAgICAgICAgICAgICAgICBtb2RlbDogbW9kZWwsXG5cbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9GZXRjaDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvbToge1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBhdXRvQmluZDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25maWcpO1xuICAgICAgICB2YXIgJHJvb3QgPSAkKG9wdGlvbnMuZG9tLnJvb3QpO1xuICAgICAgICB2YXIgaW5pdEZuID0gJHJvb3QuZGF0YSgnZi1vbi1pbml0Jyk7XG4gICAgICAgIHZhciBvcG5TaWxlbnQgPSBvcHRpb25zLmNoYW5uZWwucnVuLm9wZXJhdGlvbnMuc2lsZW50O1xuICAgICAgICB2YXIgaXNJbml0T3BlcmF0aW9uU2lsZW50ID0gaW5pdEZuICYmIChvcG5TaWxlbnQgPT09IHRydWUgfHwgKF8uaXNBcnJheShvcG5TaWxlbnQpICYmIF8uY29udGFpbnMob3BuU2lsZW50LCBpbml0Rm4pKSk7XG4gICAgICAgIHZhciBwcmVGZXRjaFZhcmlhYmxlcyA9ICFpbml0Rm4gfHwgaXNJbml0T3BlcmF0aW9uU2lsZW50O1xuXG4gICAgICAgIGlmIChwcmVGZXRjaFZhcmlhYmxlcykge1xuICAgICAgICAgICAgb3B0aW9ucy5jaGFubmVsLnJ1bi52YXJpYWJsZXMuYXV0b0ZldGNoLnN0YXJ0ID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcgJiYgY29uZmlnLmNoYW5uZWwgJiYgKGNvbmZpZy5jaGFubmVsIGluc3RhbmNlb2YgQ2hhbm5lbCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IGNvbmZpZy5jaGFubmVsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gbmV3IENoYW5uZWwob3B0aW9ucy5jaGFubmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbU1hbmFnZXIuaW5pdGlhbGl6ZSgkLmV4dGVuZCh0cnVlLCB7XG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLmNoYW5uZWxcbiAgICAgICAgfSwgb3B0aW9ucy5kb20pKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIG1hdGNoOiBmdW5jdGlvbiAobWF0Y2hFeHByLCBtYXRjaFZhbHVlLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBtYXRjaFZhbHVlLnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24obWF0Y2hFeHByKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoRXhwcihtYXRjaFZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFZhbHVlLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0Q29udmVydGVyc0xpc3Q6IGZ1bmN0aW9uICgkZWwsIHByb3BlcnR5KSB7XG4gICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnQtJyArIHByb3BlcnR5KTtcblxuICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzICYmIChwcm9wZXJ0eSA9PT0gJ2JpbmQnIHx8IHByb3BlcnR5ID09PSAnZm9yZWFjaCcpKSB7XG4gICAgICAgICAgICAvL09ubHkgYmluZCBpbmhlcml0cyBmcm9tIHBhcmVudHNcbiAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgIHZhciAkcGFyZW50RWwgPSAkZWwuY2xvc2VzdCgnW2RhdGEtZi1jb252ZXJ0XScpO1xuICAgICAgICAgICAgICAgIGlmICgkcGFyZW50RWwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkcGFyZW50RWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9IF8uaW52b2tlKGF0dHJDb252ZXJ0ZXJzLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXR0ckNvbnZlcnRlcnM7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0b0ltcGxpY2l0VHlwZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJicmFjZSA9IC9eKD86XFx7LipcXH18XFxbLipcXF0pJC87XG4gICAgICAgIHZhciBjb252ZXJ0ZWQgPSBkYXRhO1xuICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBkYXRhID0gZGF0YS50cmltKCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICdudWxsJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJyc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcXCcnIHx8IGNvbnZlcnRlZC5jaGFyQXQoMCkgPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBkYXRhLnN1YnN0cmluZygxLCBkYXRhLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkLmlzTnVtZXJpYyhkYXRhKSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICtkYXRhO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyYnJhY2UudGVzdChkYXRhKSkge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogVGhpcyBvbmx5IHdvcmtzIHdpdGggZG91YmxlIHF1b3RlcywgaS5lLiwgWzEsXCIyXCJdIHdvcmtzIGJ1dCBub3QgWzEsJzInXVxuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICQucGFyc2VKU09OKGRhdGEpIDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udmVydGVkO1xuICAgIH1cbn07XG4iXX0=
