/**

++++++++   ++++++++   ++++++++           Flow.js
++++++++   ,+++++++~   ++++++++          v0.8.2
 ++++++++   ++++++++   ++++++++
 ~+++++++~   ++++++++   ++++++++         Github: https://github.com/forio/flow.js
  ++++++++   ++++++++   ++++++++:
   :++++++++   ++++++++   ++++++++
     ++++++++   =+++++++   ,+++++++=
      ++++++++   ++++++++   ++++++++
      =+++++++    +++++++=   ++++++++
       ++++++++   ++++++++   ++++++++
       ,+++++++:   +++++++~   ++++++++
        +++++++=   +++++++=   ++++++++
       ++++++++   ++++++++   ++++++++
       ++++++++   ++++++++   ++++++++
       ++++++++   =+++++++   :+++++++,
        ++++++++   ++++++++   ++++++++
        ++++++++   ~+++++++    +++++++=
         ++++++++   ++++++++   ++++++++

**/

;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
window.Flow = require('./flow.js');
window.Flow.version = '0.8.2'; //populated by grunt

},{"./flow.js":2}],2:[function(require,module,exports){
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
                root: 'body'
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

},{"./dom/dom-manager":3,"./channels/run-channel":4}],3:[function(require,module,exports){
module.exports = (function () {
    'use strict';
    var config = require('../config');

    var nodeManager = require('./nodes/node-manager');
    var attrManager = require('./attributes/attribute-manager');
    var converterManager = require('../converters/converter-manager');

    var parseUtils = require('../utils/parse-utils');
    var domUtils = require('../utils/dom');

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

    var publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,
        converters: converterManager,
        //utils for testing
        private: {
            matchedElements: []
        },

        initialize: function (options) {
            var defaults = {
                root: 'body',
                channel: null
            };
            $.extend(defaults, options);

            var channel = defaults.channel;

            this.options = defaults;

            var me = this;
            var $root = $(defaults.root);
            $(function () {
                //parse through dom and find everything with matching attributes
                var matchedElements = $root.find(':' + config.prefix);
                if ($root.is(':' + config.prefix)) {
                    matchedElements = matchedElements.add($(defaults.root));
                }

                me.private.matchedElements = matchedElements;

                $.each(matchedElements, function (index, element) {
                    var $el = $(element);
                    var Handler = nodeManager.getHandler($el);
                    new Handler.handle({
                        el: element
                    });


                    var varMap = $el.data('variable-attr-map');
                    if (!varMap) {
                        varMap = {};
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
                                        $el.data('f-converters-' + attr, withConv);
                                    }

                                    var commaRegex = /,(?![^\[]*\])/;
                                    if (attrVal.split(commaRegex).length > 1) {
                                        //TODO
                                        // triggerers = triggerers.concat(val.split(','));
                                    } else {
                                        varMap[attrVal] = attr;
                                    }
                                }
                            }
                        });
                        $el.data('variable-attr-map', varMap);
                    }

                    var subscribable = Object.keys(varMap);
                    if (subscribable.length) {
                        channel.variables.subscribe(Object.keys(varMap), $el);
                    }
                });
                $root.trigger('f.domready');

                //Attach listeners
                // Listen for changes from api and update ui
                $root.off(config.events.react).on(config.events.react, function (evt, data) {
                    // console.log(evt.target, data, "root on");
                    var $el = $(evt.target);
                    var varmap = $el.data('variable-attr-map');

                    var convertible = {};
                    $.each(data, function (variableName, value) {
                        var propertyToUpdate = varmap[variableName.trim()];
                        if (propertyToUpdate) {
                            convertible[propertyToUpdate] = value;
                        }
                    });
                    $el.trigger('f.convert', convertible);
                });

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

                // data = {proptoupdate: value}
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
            });
        }
    };

    return $.extend(this, publicAPI);
}());

},{"../config":5,"./nodes/node-manager":6,"./attributes/attribute-manager":7,"../converters/converter-manager":8,"../utils/parse-utils":9,"../utils/dom":10}],4:[function(require,module,exports){
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

},{"./variables-channel":11,"./operations-channel":12}],5:[function(require,module,exports){
module.exports = {
    prefix: 'f',
    defaultAttr: 'bind',

    binderAttr: 'f-bind',

    events: {
        trigger: 'update.f.ui',
        react: 'update.f.model'
    }

};

},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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
        var attrConverters = $el.data('f-converters-' + property);

        if (!attrConverters && property === 'bind') {
            //Only bind inherits from parents
            attrConverters = $el.data('f-convert');
            if (!attrConverters) {
                var $parentEl = $el.closest('[data-f-convert]');
                if ($parentEl) {
                    attrConverters = $parentEl.data('f-convert');
                }
            }

            if (attrConverters) {
                attrConverters = attrConverters.split('|');
            }
        }

        return attrConverters;
    }
};

},{}],8:[function(require,module,exports){
'use strict';

//TODO: Make all underscore filters available

var normalize = function (alias, converter) {
    var ret = [];
    //nomalize('flip', fn)
    if (_.isFunction(converter)) {
        ret.push({
            alias: alias,
            convert: converter
        });
    } else if (_.isObject(converter) && converter.convert) {
        converter.alias = alias;
        ret.push(converter);
    } else if (_.isObject(alias)) {
        //normalize({alias: 'flip', convert: function})
        if (alias.convert) {
            ret.push(alias);
        } else {
            // normalize({flip: fun})
            $.each(alias, function (key, val) {
                ret.push({
                    alias: key,
                    convert: val
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
     */
    register: function (alias, converter) {
        var normalized = normalize(alias, converter);
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

    convert: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list);
        list = _.invoke(list, 'trim');

        var currentValue = value;
        var me = this;
        _.each(list, function (converterName) {
            var converter = me.getConverter(converterName);
            currentValue = converter.convert(currentValue, converterName);
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
    converterManager.register(converter);
});

module.exports = converterManager;

},{"./number-converter":13,"./string-converter":14,"./array-converter":15,"./numberformat-converter":16}],11:[function(require,module,exports){
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
        silent: false
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
        var interpolated = {};

        _.each(variablesToInterpolate, function (val, outerVariable) {
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
            interpolated[outerVariable] = val;
        });

        return {
            interpolated: interpolated,
            interpolationMap: interpolationMap
        };
    };

    var publicAPI = {
        //for testing
        private: {
            getInnerVariables: getInnerVariables,
            interpolate: interpolate,
            options: channelOptions
        },

        //Interpolated variables which need to be resolved before the outer ones can be
        innerVariablesList: [],
        variableListenerMap: {},

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

            var getVariables = function (vars, interpolationMap) {
                return vs.query(vars).then(function (variables) {
                    // console.log('Got variables', variables);
                    _.each(variables, function (value, vname) {
                        var oldValue = currentData[vname];
                        if (!isEqual(value, oldValue)) {
                            currentData[vname] = value;

                            if (me.variableListenerMap[vname]) {
                                //is anyone lisenting for this value explicitly
                                me.notify(vname, value);
                            }
                            if (interpolationMap && interpolationMap[vname]) {
                                var map = [].concat(interpolationMap[vname]);
                                _.each(map, function (interpolatedName) {
                                    if (me.variableListenerMap[interpolatedName]) {
                                        //is anyone lisenting for the interpolated value
                                        me.notify(interpolatedName, value);
                                    }
                                });
                            }
                        }
                    });
                });
            };
            if (me.innerVariablesList.length) {
                return vs.query(me.innerVariablesList).then(function (innerVariables) {
                    //console.log('inner', innerVariables);
                    $.extend(currentData, innerVariables);
                    var ip =  interpolate(me.variableListenerMap, innerVariables);
                    var outer = _.keys(ip.interpolated);
                    getVariables(outer, ip.interpolationMap);
                });
            } else {
                return getVariables(_.keys(me.variableListenerMap));
            }

        },

        notify: function (variable, value) {
            var listeners = this.variableListenerMap[variable];
            var params = {};
            params[variable] = value;

            _.each(listeners, function (listener) {
                var target = listener.target;
                if (_.isFunction(target)) {
                    target.call(null, params);
                } else if (target.trigger) {
                    listener.target.trigger(config.events.react, params);
                } else {
                    throw new Error('Unknown listerer format for ' + variable);
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
            // TODO: check if interpolated
            var attrs;
            if ($.isPlainObject(variable)) {
                attrs = variable;
                options = value;
            } else {
                (attrs = {})[variable] = value;
            }
            var interpolated = interpolate(attrs, currentData).interpolated;

            var me = this;
            vs.save.call(vs, interpolated)
                .then(function () {
                    if (!options || !options.silent) {
                        me.refresh.call(me, attrs);
                    }
                });
        },

        subscribe: function (properties, subscriber) {
            // console.log('subscribing', properties, subscriber);

            properties = [].concat(properties);
            //use jquery to make event sink
            if (!subscriber.on && !_.isFunction(subscriber)) {
                subscriber = $(subscriber);
            }

            var id  = _.uniqueId('epichannel.variable');
            var data = {
                id: id,
                target: subscriber
            };

            var me = this;
            $.each(properties, function (index, property) {
                var inner = getInnerVariables(property);
                if (inner.length) {
                    me.innerVariablesList = me.innerVariablesList.concat(inner);
                }
                me.innerVariablesList = _.uniq(me.innerVariablesList);

                if (!me.variableListenerMap[property]) {
                    me.variableListenerMap[property] = [];
                }
                me.variableListenerMap[property] = me.variableListenerMap[property].concat(data);
            });

            return id;
        },
        unsubscribe: function (variable, token) {
            this.variableListenerMap[variable] = _.reject(this.variableListenerMap[variable], function (subs) {
                return subs.id === token;
            });
        },
        unsubscribeAll: function () {
            this.variableListenerMap = {};
            this.innerVariablesList = [];
        }
    };

    $.extend(this, publicAPI);
    var me = this;
    $(vent).off('dirty').on('dirty', function () {
        me.refresh.call(me, null, true);
    });
};

},{"../config":5}],12:[function(require,module,exports){
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
                shouldSilence = _.intersection(silent, executedOpns).length >= 1;
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

},{"../config":5}],6:[function(require,module,exports){
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

},{"./input-checkbox-node":17,"./default-input-node":18,"./default-node":19}],7:[function(require,module,exports){
'use strict';

var defaultHandlers = [
    require('./no-op-attr'),
    require('./events/init-event-attr'),
    require('./events/default-event-attr'),
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


},{"./no-op-attr":20,"./events/init-event-attr":21,"./events/default-event-attr":22,"./binds/checkbox-radio-bind-attr":23,"./binds/input-bind-attr":24,"./class-attr":25,"./positive-boolean-attr":26,"./negative-boolean-attr":27,"./binds/default-bind-attr":28,"./default-attr":29}],13:[function(require,module,exports){
'use strict';
module.exports = {
    alias: 'i',
    convert: function (value) {
        return parseFloat(value, 10);
    }
};

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
'use strict';
module.exports = {
    list: function (val) {
        return [].concat(val);
    },
    last: function (val) {
        val = [].concat(val);
        return val[val.length - 1];
    },
    first: function (val) {
        val = [].concat(val);
        return val[0];
    },
    previous: function (val) {
        val = [].concat(val);
        return (val.length <= 1) ? val[0] : val[val.length - 2];
    }
};

},{}],16:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-') === 0);
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        this.html(value);
    }
};

},{}],29:[function(require,module,exports){
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

},{"./default-input-node":18}],18:[function(require,module,exports){
'use strict';
var config = require('../../config');
var BaseView = require('./default-node');

module.exports = BaseView.extend({
    propertyHandlers: [],

    uiChangeEvent: 'change',
    getUIValue: function () {
        return this.$el.val();
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

},{"../../config":5,"./default-node":19}],19:[function(require,module,exports){
'use strict';

var BaseView = require('./base');

module.exports = BaseView.extend({
    propertyHandlers: [

    ],

    initialize: function () {
    }
}, { selector: '*' });

},{"./base":30}],30:[function(require,module,exports){
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
    this.$el = $(options.el);
    this.el = options.el;
    this.initialize.apply(this, arguments);

};

_.extend(View.prototype, {
    initialize: function () {},
});

View.extend = extend;

module.exports = View;

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9hcHAuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZmxvdy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vZG9tLW1hbmFnZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY2hhbm5lbHMvcnVuLWNoYW5uZWwuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29uZmlnLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL3V0aWxzL3BhcnNlLXV0aWxzLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jb252ZXJ0ZXJzL2NvbnZlcnRlci1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NoYW5uZWxzL29wZXJhdGlvbnMtY2hhbm5lbC5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvbm9kZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbnZlcnRlcnMvbnVtYmVyLWNvbnZlcnRlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jb252ZXJ0ZXJzL3N0cmluZy1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2luaXQtZXZlbnQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9wb3NpdGl2ZS1ib29sZWFuLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2RlZmF1bHQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvaW5wdXQtY2hlY2tib3gtbm9kZS5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL25vZGVzL2Jhc2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJ3aW5kb3cuRmxvdyA9IHJlcXVpcmUoJy4vZmxvdy5qcycpO1xud2luZG93LkZsb3cudmVyc2lvbiA9ICc8JT0gdmVyc2lvbiAlPic7IC8vcG9wdWxhdGVkIGJ5IGdydW50XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkb21NYW5hZ2VyID0gcmVxdWlyZSgnLi9kb20vZG9tLW1hbmFnZXInKTtcbnZhciBDaGFubmVsID0gcmVxdWlyZSgnLi9jaGFubmVscy9ydW4tY2hhbm5lbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkb206IGRvbU1hbmFnZXIsXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgICAgIHZhciBtb2RlbCA9ICQoJ2JvZHknKS5kYXRhKCdmLW1vZGVsJyk7XG5cbiAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgY2hhbm5lbDoge1xuICAgICAgICAgICAgICAgIHJ1bjoge1xuICAgICAgICAgICAgICAgICAgICBhY2NvdW50OiAnJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvamVjdDogJycsXG4gICAgICAgICAgICAgICAgICAgIG1vZGVsOiBtb2RlbCxcblxuICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG9tOiB7XG4gICAgICAgICAgICAgICAgcm9vdDogJ2JvZHknXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIGNvbmZpZyk7XG4gICAgICAgIGlmIChjb25maWcgJiYgY29uZmlnLmNoYW5uZWwgJiYgKGNvbmZpZy5jaGFubmVsIGluc3RhbmNlb2YgQ2hhbm5lbCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IGNvbmZpZy5jaGFubmVsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gbmV3IENoYW5uZWwob3B0aW9ucy5jaGFubmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciAkcm9vdCA9ICQob3B0aW9ucy5kb20ucm9vdCk7XG4gICAgICAgIHZhciBpbml0Rm4gPSAkcm9vdC5kYXRhKCdmLW9uLWluaXQnKTtcbiAgICAgICAgdmFyIG9wblNpbGVudCA9IG9wdGlvbnMuY2hhbm5lbC5ydW4ub3BlcmF0aW9ucy5zaWxlbnQ7XG4gICAgICAgIHZhciBpc0luaXRPcGVyYXRpb25TaWxlbnQgPSBpbml0Rm4gJiYgKG9wblNpbGVudCA9PT0gdHJ1ZSB8fCAoXy5pc0FycmF5KG9wblNpbGVudCkgJiYgXy5jb250YWlucyhvcG5TaWxlbnQsIGluaXRGbikpKTtcbiAgICAgICAgdmFyIHByZUZldGNoVmFyaWFibGVzID0gIWluaXRGbiB8fCBpc0luaXRPcGVyYXRpb25TaWxlbnQ7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgaWYgKHByZUZldGNoVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAkcm9vdC5vZmYoJ2YuZG9tcmVhZHknKS5vbignZi5kb21yZWFkeScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBtZS5jaGFubmVsLnZhcmlhYmxlcy5yZWZyZXNoKG51bGwsIHRydWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBkb21NYW5hZ2VyLmluaXRpYWxpemUoJC5leHRlbmQodHJ1ZSwge1xuICAgICAgICAgICAgY2hhbm5lbDogdGhpcy5jaGFubmVsXG4gICAgICAgIH0sIG9wdGlvbnMuZG9tKSk7XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG4gICAgdmFyIG5vZGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9ub2Rlcy9ub2RlLW1hbmFnZXInKTtcbiAgICB2YXIgYXR0ck1hbmFnZXIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXMvYXR0cmlidXRlLW1hbmFnZXInKTtcbiAgICB2YXIgY29udmVydGVyTWFuYWdlciA9IHJlcXVpcmUoJy4uL2NvbnZlcnRlcnMvY29udmVydGVyLW1hbmFnZXInKTtcblxuICAgIHZhciBwYXJzZVV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvcGFyc2UtdXRpbHMnKTtcbiAgICB2YXIgZG9tVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9kb20nKTtcblxuICAgIC8vSnF1ZXJ5IHNlbGVjdG9yIHRvIHJldHVybiBldmVyeXRoaW5nIHdoaWNoIGhhcyBhIGYtIHByb3BlcnR5IHNldFxuICAgICQuZXhwclsnOiddW2NvbmZpZy5wcmVmaXhdID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgJHRoaXMgPSAkKG9iaik7XG4gICAgICAgIHZhciBkYXRhcHJvcHMgPSBfLmtleXMoJHRoaXMuZGF0YSgpKTtcblxuICAgICAgICB2YXIgbWF0Y2ggPSBfLmZpbmQoZGF0YXByb3BzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoY29uZmlnLnByZWZpeCkgPT09IDApO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gISEobWF0Y2gpO1xuICAgIH07XG5cbiAgICAkLmV4cHJbJzonXS53ZWJjb21wb25lbnQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmoubm9kZU5hbWUuaW5kZXhPZignLScpICE9PSAtMTtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcblxuICAgICAgICBub2Rlczogbm9kZU1hbmFnZXIsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJNYW5hZ2VyLFxuICAgICAgICBjb252ZXJ0ZXJzOiBjb252ZXJ0ZXJNYW5hZ2VyLFxuICAgICAgICAvL3V0aWxzIGZvciB0ZXN0aW5nXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIG1hdGNoZWRFbGVtZW50czogW11cbiAgICAgICAgfSxcblxuICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBjaGFubmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgJC5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICB2YXIgY2hhbm5lbCA9IGRlZmF1bHRzLmNoYW5uZWw7XG5cbiAgICAgICAgICAgIHRoaXMub3B0aW9ucyA9IGRlZmF1bHRzO1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdmFyICRyb290ID0gJChkZWZhdWx0cy5yb290KTtcbiAgICAgICAgICAgICQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vcGFyc2UgdGhyb3VnaCBkb20gYW5kIGZpbmQgZXZlcnl0aGluZyB3aXRoIG1hdGNoaW5nIGF0dHJpYnV0ZXNcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hlZEVsZW1lbnRzID0gJHJvb3QuZmluZCgnOicgKyBjb25maWcucHJlZml4KTtcbiAgICAgICAgICAgICAgICBpZiAoJHJvb3QuaXMoJzonICsgY29uZmlnLnByZWZpeCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZEVsZW1lbnRzID0gbWF0Y2hlZEVsZW1lbnRzLmFkZCgkKGRlZmF1bHRzLnJvb3QpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBtZS5wcml2YXRlLm1hdGNoZWRFbGVtZW50cyA9IG1hdGNoZWRFbGVtZW50cztcblxuICAgICAgICAgICAgICAgICQuZWFjaChtYXRjaGVkRWxlbWVudHMsIGZ1bmN0aW9uIChpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIEhhbmRsZXIgPSBub2RlTWFuYWdlci5nZXRIYW5kbGVyKCRlbCk7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBIYW5kbGVyLmhhbmRsZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbDogZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YXJNYXAgPSAkZWwuZGF0YSgndmFyaWFibGUtYXR0ci1tYXAnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2YXJNYXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhck1hcCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9OT1RFOiBsb29waW5nIHRocm91Z2ggYXR0cmlidXRlcyBpbnN0ZWFkIG9mIC5kYXRhIGJlY2F1c2UgLmRhdGEgYXV0b21hdGljYWxseSBjYW1lbGNhc2VzIHByb3BlcnRpZXMgYW5kIG1ha2UgaXQgaGFyZCB0byByZXRydmlldmVcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZWxlbWVudC5hdHRyaWJ1dGVzKS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgbm9kZU1hcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRyID0gbm9kZU1hcC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9IG5vZGVNYXAudmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2FudGVkUHJlZml4ID0gJ2RhdGEtZi0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyLmluZGV4T2Yod2FudGVkUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKHdhbnRlZFByZWZpeCwgJycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihhdHRyLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNCaW5kYWJsZUF0dHIgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmluaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQmluZGFibGVBdHRyID0gaGFuZGxlci5pbml0LmNhbGwoJGVsLCBhdHRyLCBhdHRyVmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0JpbmRhYmxlQXR0cikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Db252ZXJ0IHBpcGVzIHRvIGNvbnZlcnRlciBhdHRyc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpdGhDb252ID0gXy5pbnZva2UoYXR0clZhbC5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpdGhDb252Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyVmFsID0gd2l0aENvbnYuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGF0YSgnZi1jb252ZXJ0ZXJzLScgKyBhdHRyLCB3aXRoQ29udik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb21tYVJlZ2V4ID0gLywoPyFbXlxcW10qXFxdKS87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0clZhbC5zcGxpdChjb21tYVJlZ2V4KS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdHJpZ2dlcmVycyA9IHRyaWdnZXJlcnMuY29uY2F0KHZhbC5zcGxpdCgnLCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyTWFwW2F0dHJWYWxdID0gYXR0cjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ3ZhcmlhYmxlLWF0dHItbWFwJywgdmFyTWFwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBzdWJzY3JpYmFibGUgPSBPYmplY3Qua2V5cyh2YXJNYXApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaWJhYmxlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC52YXJpYWJsZXMuc3Vic2NyaWJlKE9iamVjdC5rZXlzKHZhck1hcCksICRlbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAkcm9vdC50cmlnZ2VyKCdmLmRvbXJlYWR5Jyk7XG5cbiAgICAgICAgICAgICAgICAvL0F0dGFjaCBsaXN0ZW5lcnNcbiAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIGNoYW5nZXMgZnJvbSBhcGkgYW5kIHVwZGF0ZSB1aVxuICAgICAgICAgICAgICAgICRyb290Lm9mZihjb25maWcuZXZlbnRzLnJlYWN0KS5vbihjb25maWcuZXZlbnRzLnJlYWN0LCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGV2dC50YXJnZXQsIGRhdGEsIFwicm9vdCBvblwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YXJtYXAgPSAkZWwuZGF0YSgndmFyaWFibGUtYXR0ci1tYXAnKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydGlibGUgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uICh2YXJpYWJsZU5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlUb1VwZGF0ZSA9IHZhcm1hcFt2YXJpYWJsZU5hbWUudHJpbSgpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eVRvVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udmVydGlibGVbcHJvcGVydHlUb1VwZGF0ZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICRlbC50cmlnZ2VyKCdmLmNvbnZlcnQnLCBjb252ZXJ0aWJsZSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBMaXN0ZW4gZm9yIGNoYW5nZXMgdG8gdWkgYW5kIHB1Ymxpc2ggdG8gYXBpXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKGNvbmZpZy5ldmVudHMudHJpZ2dlcikub24oY29uZmlnLmV2ZW50cy50cmlnZ2VyLCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJzZWREYXRhID0ge307IC8vaWYgbm90IGFsbCBzdWJzZXF1ZW50IGxpc3RlbmVycyB3aWxsIGdldCB0aGUgbW9kaWZpZWQgZGF0YVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAgZG9tVXRpbHMuZ2V0Q29udmVydGVyc0xpc3QoJGVsLCAnYmluZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleSA9IGtleS5zcGxpdCgnfCcpWzBdLnRyaW0oKTsgLy9pbiBjYXNlIHRoZSBwaXBlIGZvcm1hdHRpbmcgc3ludGF4IHdhcyB1c2VkXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBjb252ZXJ0ZXJNYW5hZ2VyLnBhcnNlKHZhbCwgYXR0ckNvbnZlcnRlcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkRGF0YVtrZXldID0gcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSh2YWwpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwudHJpZ2dlcignZi5jb252ZXJ0JywgeyBiaW5kOiB2YWwgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2gocGFyc2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBkYXRhID0ge3Byb3B0b3VwZGF0ZTogdmFsdWV9XG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLmNvbnZlcnQnKS5vbignZi5jb252ZXJ0JywgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnZlcnQgPSBmdW5jdGlvbiAodmFsLCBwcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wID0gcHJvcC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gIGRvbVV0aWxzLmdldENvbnZlcnRlcnNMaXN0KCRlbCwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIocHJvcCwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ZWRWYWx1ZSA9IGNvbnZlcnRlck1hbmFnZXIuY29udmVydCh2YWwsIGF0dHJDb252ZXJ0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuaGFuZGxlLmNhbGwoJGVsLCBjb252ZXJ0ZWRWYWx1ZSwgcHJvcCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEsIGNvbnZlcnQpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udmVydChkYXRhLCAnYmluZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoJ2YudWkub3BlcmF0ZScpLm9uKCdmLnVpLm9wZXJhdGUnLCBmdW5jdGlvbiAoZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGF0YSk7IC8vaWYgbm90IGFsbCBzdWJzZXF1ZW50IGxpc3RlbmVycyB3aWxsIGdldCB0aGUgbW9kaWZpZWQgZGF0YVxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YS5vcGVyYXRpb25zLCBmdW5jdGlvbiAob3BuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIG9wbi5wYXJhbXMgPSBfLm1hcChvcG4ucGFyYW1zLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSgkLnRyaW0odmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn0oKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBWYXJzQ2hhbm5lbCA9IHJlcXVpcmUoJy4vdmFyaWFibGVzLWNoYW5uZWwnKTtcbnZhciBPcGVyYXRpb25zQ2hhbm5lbCA9IHJlcXVpcmUoJy4vb3BlcmF0aW9ucy1jaGFubmVsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIHJ1bjoge1xuICAgICAgICAgICAgdmFyaWFibGVzOiB7XG5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcGVyYXRpb25zOiB7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIGNvbmZpZyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICB2YXIgcm0gPSBuZXcgRi5tYW5hZ2VyLlJ1bk1hbmFnZXIoY29uZmlnKTtcbiAgICB2YXIgcnMgPSBybS5ydW47XG5cbiAgICB2YXIgJGNyZWF0aW9uUHJvbWlzZSA9IHJtLmdldFJ1bigpO1xuICAgIHJzLmN1cnJlbnRQcm9taXNlID0gJGNyZWF0aW9uUHJvbWlzZTtcblxuICAgIHZhciBjcmVhdGVBbmRUaGVuID0gZnVuY3Rpb24gKGZuLCBjb250ZXh0KSB7XG4gICAgICAgIHJldHVybiBfLndyYXAoZm4sIGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgICAgICAgICB2YXIgcGFzc2VkSW5QYXJhbXMgPSBfLnRvQXJyYXkoYXJndW1lbnRzKS5zbGljZSgxKTtcbiAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBycy5jdXJyZW50UHJvbWlzZSA9IGZ1bmMuYXBwbHkoY29udGV4dCwgcGFzc2VkSW5QYXJhbXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy9NYWtlIHN1cmUgbm90aGluZyBoYXBwZW5zIGJlZm9yZSB0aGUgcnVuIGlzIGNyZWF0ZWRcbiAgICBfLmVhY2gocnMsIGZ1bmN0aW9uICh2YWx1ZSwgbmFtZSkge1xuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSAmJiBuYW1lICE9PSAndmFyaWFibGVzJyAgJiYgbmFtZSAhPT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICAgIHJzW25hbWVdID0gY3JlYXRlQW5kVGhlbih2YWx1ZSwgcnMpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgb3JpZ2luYWxWYXJpYWJsZXNGbiA9IHJzLnZhcmlhYmxlcztcbiAgICBycy52YXJpYWJsZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2cyA9IG9yaWdpbmFsVmFyaWFibGVzRm4uYXBwbHkocnMsIGFyZ3VtZW50cyk7XG4gICAgICAgIF8uZWFjaCh2cywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHZzW25hbWVdID0gY3JlYXRlQW5kVGhlbih2YWx1ZSwgdnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHZzO1xuICAgIH07XG5cbiAgICB0aGlzLnJ1biA9IHJzO1xuICAgIHRoaXMudmFyaWFibGVzID0gbmV3IFZhcnNDaGFubmVsKCQuZXh0ZW5kKHRydWUsIHt9LCBjb25maWcucnVuLnZhcmlhYmxlcywgeyBydW46IHJzLCB2ZW50OiB0aGlzIH0pKTtcbiAgICB0aGlzLm9wZXJhdGlvbnMgPSBuZXcgT3BlcmF0aW9uc0NoYW5uZWwoJC5leHRlbmQodHJ1ZSwge30sIGNvbmZpZy5ydW4ub3BlcmF0aW9ucywgeyBydW46IHJzLCB2ZW50OiB0aGlzIH0pKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcmVmaXg6ICdmJyxcbiAgICBkZWZhdWx0QXR0cjogJ2JpbmQnLFxuXG4gICAgYmluZGVyQXR0cjogJ2YtYmluZCcsXG5cbiAgICBldmVudHM6IHtcbiAgICAgICAgdHJpZ2dlcjogJ3VwZGF0ZS5mLnVpJyxcbiAgICAgICAgcmVhY3Q6ICd1cGRhdGUuZi5tb2RlbCdcbiAgICB9XG5cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdG9JbXBsaWNpdFR5cGU6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHZhciByYnJhY2UgPSAvXig/Olxcey4qXFx9fFxcWy4qXFxdKSQvO1xuICAgICAgICB2YXIgY29udmVydGVkID0gZGF0YTtcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICcnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjb252ZXJ0ZWQuY2hhckF0KDApID09PSAnXFwnJyB8fCBjb252ZXJ0ZWQuY2hhckF0KDApID09PSAnXCInKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZGF0YS5zdWJzdHJpbmcoMSwgZGF0YS5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJC5pc051bWVyaWMoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSArZGF0YTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmJyYWNlLnRlc3QoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAvL1RPRE86IFRoaXMgb25seSB3b3JrcyB3aXRoIGRvdWJsZSBxdW90ZXMsIGkuZS4sIFsxLFwiMlwiXSB3b3JrcyBidXQgbm90IFsxLCcyJ11cbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSAkLnBhcnNlSlNPTihkYXRhKSA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIG1hdGNoOiBmdW5jdGlvbiAobWF0Y2hFeHByLCBtYXRjaFZhbHVlLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBtYXRjaFZhbHVlLnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24obWF0Y2hFeHByKSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoRXhwcihtYXRjaFZhbHVlLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFZhbHVlLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0Q29udmVydGVyc0xpc3Q6IGZ1bmN0aW9uICgkZWwsIHByb3BlcnR5KSB7XG4gICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnRlcnMtJyArIHByb3BlcnR5KTtcblxuICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzICYmIHByb3BlcnR5ID09PSAnYmluZCcpIHtcbiAgICAgICAgICAgIC8vT25seSBiaW5kIGluaGVyaXRzIGZyb20gcGFyZW50c1xuICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgdmFyICRwYXJlbnRFbCA9ICRlbC5jbG9zZXN0KCdbZGF0YS1mLWNvbnZlcnRdJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRwYXJlbnRFbCkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRwYXJlbnRFbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gYXR0ckNvbnZlcnRlcnMuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhdHRyQ29udmVydGVycztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vL1RPRE86IE1ha2UgYWxsIHVuZGVyc2NvcmUgZmlsdGVycyBhdmFpbGFibGVcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIC8vbm9tYWxpemUoJ2ZsaXAnLCBmbilcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGNvbnZlcnRlcikpIHtcbiAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgYWxpYXM6IGFsaWFzLFxuICAgICAgICAgICAgY29udmVydDogY29udmVydGVyXG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdChjb252ZXJ0ZXIpICYmIGNvbnZlcnRlci5jb252ZXJ0KSB7XG4gICAgICAgIGNvbnZlcnRlci5hbGlhcyA9IGFsaWFzO1xuICAgICAgICByZXQucHVzaChjb252ZXJ0ZXIpO1xuICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdChhbGlhcykpIHtcbiAgICAgICAgLy9ub3JtYWxpemUoe2FsaWFzOiAnZmxpcCcsIGNvbnZlcnQ6IGZ1bmN0aW9ufSlcbiAgICAgICAgaWYgKGFsaWFzLmNvbnZlcnQpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGFsaWFzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vcm1hbGl6ZSh7ZmxpcDogZnVufSlcbiAgICAgICAgICAgICQuZWFjaChhbGlhcywgZnVuY3Rpb24gKGtleSwgdmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBhbGlhczoga2V5LFxuICAgICAgICAgICAgICAgICAgICBjb252ZXJ0OiB2YWxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgbWF0Y2hDb252ZXJ0ZXIgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgIGlmIChfLmlzU3RyaW5nKGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGFsaWFzID09PSBjb252ZXJ0ZXIuYWxpYXM7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzKGFsaWFzKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNSZWdleChjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIuYWxpYXMubWF0Y2goYWxpYXMpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgY29udmVydGVyTWFuYWdlciA9IHtcbiAgICBwcml2YXRlOiB7XG4gICAgICAgIG1hdGNoQ29udmVydGVyOiBtYXRjaENvbnZlcnRlclxuICAgIH0sXG5cbiAgICBsaXN0OiBbXSxcbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgYXR0cmlidXRlIGNvbnZlcnRlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ3xmdW5jdGlvbnxyZWdleH0gYWxpYXMgZm9ybWF0dGVyIG5hbWVcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbnxvYmplY3R9IGNvbnZlcnRlciAgICBjb252ZXJ0ZXIgY2FuIGVpdGhlciBiZSBhIGZ1bmN0aW9uLCB3aGljaCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSB2YWx1ZSwgb3IgYW4gb2JqZWN0IHdpdGgge2FsaWFzOiAnJywgcGFyc2U6ICQubm9vcCwgY29udmVydDogJC5ub29wfVxuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgICAgICB2YXIgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZShhbGlhcywgY29udmVydGVyKTtcbiAgICAgICAgdGhpcy5saXN0ID0gbm9ybWFsaXplZC5jb25jYXQodGhpcy5saXN0KTtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2godGhpcy5saXN0LCBmdW5jdGlvbiAoY3VycmVudENvbnZlcnRlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQ29udmVydGVyKGFsaWFzLCBjdXJyZW50Q29udmVydGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlcilbMF0pO1xuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXI6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQ29udmVydGVyKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlciA9IG1lLmdldENvbnZlcnRlcihjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRlci5jb252ZXJ0KGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3VudGVyLXBhcnQgdG8gJ2NvbnZlcnQnLiBUcmFuc2xhdGVzIGNvbnZlcnRlZCB2YWx1ZXMgYmFjayB0byB0aGVpciBvcmlnaW5hbCBmb3JtXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byBwYXJzZVxuICAgICAqIEBwYXJhbSAge1N0cmluZyB8IEFycmF5fSBsaXN0ICBMaXN0IG9mIHBhcnNlcnMgdG8gcnVuIHRoaXMgdGhyb3VnaC4gT3V0ZXJtb3N0IGlzIGludm9rZWQgZmlyc3RcbiAgICAgKiBAcmV0dXJuIHsqfVxuICAgICAqL1xuICAgIHBhcnNlOiBmdW5jdGlvbiAodmFsdWUsIGxpc3QpIHtcbiAgICAgICAgaWYgKCFsaXN0IHx8ICFsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGxpc3QgPSBbXS5jb25jYXQobGlzdCkucmV2ZXJzZSgpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlciA9IG1lLmdldENvbnZlcnRlcihjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIGlmIChjb252ZXJ0ZXIucGFyc2UpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0ZXIucGFyc2UoY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfVxufTtcblxuXG4vL0Jvb3RzdHJhcFxudmFyIGRlZmF1bHRjb252ZXJ0ZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vbnVtYmVyLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vc3RyaW5nLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vYXJyYXktY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9udW1iZXJmb3JtYXQtY29udmVydGVyJyksXG5dO1xuXG4kLmVhY2goZGVmYXVsdGNvbnZlcnRlcnMucmV2ZXJzZSgpLCBmdW5jdGlvbiAoaW5kZXgsIGNvbnZlcnRlcikge1xuICAgIGNvbnZlcnRlck1hbmFnZXIucmVnaXN0ZXIoY29udmVydGVyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnZlcnRlck1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRlcm1pbmUgd2hlbiB0byB1cGRhdGUgc3RhdGVcbiAgICAgICAgICogQHR5cGUge1N0cmluZyB8IEFycmF5IHwgT2JqZWN0fSBQb3NzaWJsZSBvcHRpb25zIGFyZVxuICAgICAgICAgKiAgICAgICAtIHRydWU6IG5ldmVyIHRyaWdnZXIgYW55IHVwZGF0ZXMuIFVzZSB0aGlzIGlmIHlvdSBrbm93IHlvdXIgbW9kZWwgc3RhdGUgd29uJ3QgY2hhbmdlIGJhc2VkIG9uIG90aGVyIHZhcmlhYmxlc1xuICAgICAgICAgKiAgICAgICAtIGZhbHNlOiBhbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKiAgICAgICAtIFthcnJheSBvZiB2YXJpYWJsZSBuYW1lc106IFZhcmlhYmxlcyBpbiB0aGlzIGFycmF5IHdpbGwgbm90IHRyaWdnZXIgdXBkYXRlcywgZXZlcnl0aGluZyBlbHNlIHdpbGxcbiAgICAgICAgICogICAgICAgLSB7IGV4Y2VwdDogW2FycmF5IG9mIHZhcmlhYmxlc119OiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSB3aWxsIHRyaWdnZXIgdXBkYXRlcywgbm90aGluZyBlbHNlIHdpbGxcbiAgICAgICAgICovXG4gICAgICAgIHNpbGVudDogZmFsc2VcbiAgICB9O1xuXG4gICAgdmFyIGNoYW5uZWxPcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB2YXIgdnMgPSBjaGFubmVsT3B0aW9ucy5ydW4udmFyaWFibGVzKCk7XG4gICAgdmFyIHZlbnQgPSBjaGFubmVsT3B0aW9ucy52ZW50O1xuXG4gICAgdmFyIGN1cnJlbnREYXRhID0ge307XG5cbiAgICAvL1RPRE86IGFjdHVhbGx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgc28gb25cbiAgICB2YXIgaXNFcXVhbCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIGdldElubmVyVmFyaWFibGVzID0gZnVuY3Rpb24gKHN0cikge1xuICAgICAgICB2YXIgaW5uZXIgPSBzdHIubWF0Y2goLzwoLio/KT4vZyk7XG4gICAgICAgIGlubmVyID0gXy5tYXAoaW5uZXIsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWwuc3Vic3RyaW5nKDEsIHZhbC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpbm5lcjtcbiAgICB9O1xuXG4gICAgLy9SZXBsYWNlcyBzdHViYmVkIG91dCBrZXluYW1lcyBpbiB2YXJpYWJsZXN0b2ludGVycG9sYXRlIHdpdGggdGhlaXIgY29ycmVzcG9uZGluZyB2YWx1ZXNcbiAgICB2YXIgaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAodmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgdmFsdWVzKSB7XG4gICAgICAgIC8ve3ByaWNlWzFdOiBwcmljZVs8dGltZT5dfVxuICAgICAgICB2YXIgaW50ZXJwb2xhdGlvbk1hcCA9IHt9O1xuICAgICAgICAvL3twcmljZVsxXTogMX1cbiAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IHt9O1xuXG4gICAgICAgIF8uZWFjaCh2YXJpYWJsZXNUb0ludGVycG9sYXRlLCBmdW5jdGlvbiAodmFsLCBvdXRlclZhcmlhYmxlKSB7XG4gICAgICAgICAgICB2YXIgaW5uZXIgPSBnZXRJbm5lclZhcmlhYmxlcyhvdXRlclZhcmlhYmxlKTtcbiAgICAgICAgICAgIGlmIChpbm5lciAmJiBpbm5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3JpZ2luYWxPdXRlciA9IG91dGVyVmFyaWFibGU7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGlubmVyLCBmdW5jdGlvbiAoaW5kZXgsIGlubmVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXN2YWwgPSB2YWx1ZXNbaW5uZXJWYXJpYWJsZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzdmFsICE9PSBudWxsICYmIHRoaXN2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0aGlzdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vRm9yIGFycmF5ZWQgdGhpbmdzIGdldCB0aGUgbGFzdCBvbmUgZm9yIGludGVycG9sYXRpb24gcHVycG9zZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzdmFsID0gdGhpc3ZhbFt0aGlzdmFsLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBSZWdleCB0byBtYXRjaCBzcGFjZXMgYW5kIHNvIG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRlclZhcmlhYmxlID0gb3V0ZXJWYXJpYWJsZS5yZXBsYWNlKCc8JyArIGlubmVyVmFyaWFibGUgKyAnPicsIHRoaXN2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSA9IChpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdKSA/IFtvcmlnaW5hbE91dGVyXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSkgOiBvcmlnaW5hbE91dGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW50ZXJwb2xhdGVkW291dGVyVmFyaWFibGVdID0gdmFsO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkOiBpbnRlcnBvbGF0ZWQsXG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwOiBpbnRlcnBvbGF0aW9uTWFwXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgZ2V0SW5uZXJWYXJpYWJsZXM6IGdldElubmVyVmFyaWFibGVzLFxuICAgICAgICAgICAgaW50ZXJwb2xhdGU6IGludGVycG9sYXRlLFxuICAgICAgICAgICAgb3B0aW9uczogY2hhbm5lbE9wdGlvbnNcbiAgICAgICAgfSxcblxuICAgICAgICAvL0ludGVycG9sYXRlZCB2YXJpYWJsZXMgd2hpY2ggbmVlZCB0byBiZSByZXNvbHZlZCBiZWZvcmUgdGhlIG91dGVyIG9uZXMgY2FuIGJlXG4gICAgICAgIGlubmVyVmFyaWFibGVzTGlzdDogW10sXG4gICAgICAgIHZhcmlhYmxlTGlzdGVuZXJNYXA6IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVjayBhbmQgbm90aWZ5IGFsbCBsaXN0ZW5lcnNcbiAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBjaGFuZ2VPYmoga2V5LXZhbHVlIHBhaXJzIG9mIGNoYW5nZWQgdmFyaWFibGVzXG4gICAgICAgICAqL1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoY2hhbmdlT2JqLCBmb3JjZSkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZhciBzaWxlbnQgPSBjaGFubmVsT3B0aW9ucy5zaWxlbnQ7XG4gICAgICAgICAgICB2YXIgY2hhbmdlZFZhcmlhYmxlcyA9IF8ua2V5cyhjaGFuZ2VPYmopO1xuXG4gICAgICAgICAgICB2YXIgc2hvdWxkU2lsZW5jZSA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoc2lsZW50KSAmJiBjaGFuZ2VkVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgc2hvdWxkU2lsZW5jZSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudCwgY2hhbmdlZFZhcmlhYmxlcykubGVuZ3RoID49IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHNpbGVudCkgJiYgY2hhbmdlZFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBjaGFuZ2VkVmFyaWFibGVzKS5sZW5ndGggIT09IGNoYW5nZWRWYXJpYWJsZXMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2hvdWxkU2lsZW5jZSAmJiBmb3JjZSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkLkRlZmVycmVkKCkucmVzb2x2ZSgpLnByb21pc2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGdldFZhcmlhYmxlcyA9IGZ1bmN0aW9uICh2YXJzLCBpbnRlcnBvbGF0aW9uTWFwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KHZhcnMpLnRoZW4oZnVuY3Rpb24gKHZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnR290IHZhcmlhYmxlcycsIHZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaCh2YXJpYWJsZXMsIGZ1bmN0aW9uICh2YWx1ZSwgdm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGN1cnJlbnREYXRhW3ZuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNFcXVhbCh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudERhdGFbdm5hbWVdID0gdmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWUudmFyaWFibGVMaXN0ZW5lck1hcFt2bmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9pcyBhbnlvbmUgbGlzZW50aW5nIGZvciB0aGlzIHZhbHVlIGV4cGxpY2l0bHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUubm90aWZ5KHZuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlcnBvbGF0aW9uTWFwICYmIGludGVycG9sYXRpb25NYXBbdm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSBbXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFt2bmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2gobWFwLCBmdW5jdGlvbiAoaW50ZXJwb2xhdGVkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lLnZhcmlhYmxlTGlzdGVuZXJNYXBbaW50ZXJwb2xhdGVkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2lzIGFueW9uZSBsaXNlbnRpbmcgZm9yIHRoZSBpbnRlcnBvbGF0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5ub3RpZnkoaW50ZXJwb2xhdGVkTmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChtZS5pbm5lclZhcmlhYmxlc0xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KG1lLmlubmVyVmFyaWFibGVzTGlzdCkudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW5uZXInLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpcCA9ICBpbnRlcnBvbGF0ZShtZS52YXJpYWJsZUxpc3RlbmVyTWFwLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvdXRlciA9IF8ua2V5cyhpcC5pbnRlcnBvbGF0ZWQpO1xuICAgICAgICAgICAgICAgICAgICBnZXRWYXJpYWJsZXMob3V0ZXIsIGlwLmludGVycG9sYXRpb25NYXApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VmFyaWFibGVzKF8ua2V5cyhtZS52YXJpYWJsZUxpc3RlbmVyTWFwKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSxcblxuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uICh2YXJpYWJsZSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXBbdmFyaWFibGVdO1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW3ZhcmlhYmxlXSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFyZ2V0ID0gbGlzdGVuZXIudGFyZ2V0O1xuICAgICAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24odGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2FsbChudWxsLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0LnRyaWdnZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIudGFyZ2V0LnRyaWdnZXIoY29uZmlnLmV2ZW50cy5yZWFjdCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbGlzdGVyZXIgZm9ybWF0IGZvciAnICsgdmFyaWFibGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWYXJpYWJsZSBuYW1lICYgcGFyYW1ldGVycyB0byBzZW5kIHZhcmlhYmxlcyBBUElcbiAgICAgICAgICogQHBhcmFtICB7c3RyaW5nIHwgb2JqZWN0fSB2YXJpYWJsZSBzdHJpbmcgb3Ige3ZhcmlhYmxlbmFtZTogdmFsdWV9XG4gICAgICAgICAqIEBwYXJhbSAgeyp9IHZhbHVlIChvcHRpb25hbCkgICB2YWx1ZSBvZiB2YXJpYWJsZSBpZiBwcmV2aW91cyBhcmcgd2FzIGEgc3RyaW5nXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIFN1cHBvcnRlZCBvcHRpb25zOiB7c2lsZW50OiBCb29sZWFufVxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uICh2YXJpYWJsZSwgdmFsdWUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwdWJsaXNoJywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIGlmIGludGVycG9sYXRlZFxuICAgICAgICAgICAgdmFyIGF0dHJzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YXJpYWJsZSkpIHtcbiAgICAgICAgICAgICAgICBhdHRycyA9IHZhcmlhYmxlO1xuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKGF0dHJzID0ge30pW3ZhcmlhYmxlXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IGludGVycG9sYXRlKGF0dHJzLCBjdXJyZW50RGF0YSkuaW50ZXJwb2xhdGVkO1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdnMuc2F2ZS5jYWxsKHZzLCBpbnRlcnBvbGF0ZWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdGlvbnMgfHwgIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIGF0dHJzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnNjcmliZTogZnVuY3Rpb24gKHByb3BlcnRpZXMsIHN1YnNjcmliZXIpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdzdWJzY3JpYmluZycsIHByb3BlcnRpZXMsIHN1YnNjcmliZXIpO1xuXG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gW10uY29uY2F0KHByb3BlcnRpZXMpO1xuICAgICAgICAgICAgLy91c2UganF1ZXJ5IHRvIG1ha2UgZXZlbnQgc2lua1xuICAgICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLm9uICYmICFfLmlzRnVuY3Rpb24oc3Vic2NyaWJlcikpIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyID0gJChzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGlkICA9IF8udW5pcXVlSWQoJ2VwaWNoYW5uZWwudmFyaWFibGUnKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICAkLmVhY2gocHJvcGVydGllcywgZnVuY3Rpb24gKGluZGV4LCBwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICBpZiAoaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLmlubmVyVmFyaWFibGVzTGlzdCA9IG1lLmlubmVyVmFyaWFibGVzTGlzdC5jb25jYXQoaW5uZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtZS5pbm5lclZhcmlhYmxlc0xpc3QgPSBfLnVuaXEobWUuaW5uZXJWYXJpYWJsZXNMaXN0KTtcblxuICAgICAgICAgICAgICAgIGlmICghbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0pIHtcbiAgICAgICAgICAgICAgICAgICAgbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0gPSBtZS52YXJpYWJsZUxpc3RlbmVyTWFwW3Byb3BlcnR5XS5jb25jYXQoZGF0YSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9LFxuICAgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24gKHZhcmlhYmxlLCB0b2tlbikge1xuICAgICAgICAgICAgdGhpcy52YXJpYWJsZUxpc3RlbmVyTWFwW3ZhcmlhYmxlXSA9IF8ucmVqZWN0KHRoaXMudmFyaWFibGVMaXN0ZW5lck1hcFt2YXJpYWJsZV0sIGZ1bmN0aW9uIChzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXAgPSB7fTtcbiAgICAgICAgICAgIHRoaXMuaW5uZXJWYXJpYWJsZXNMaXN0ID0gW107XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbiAgICB2YXIgbWUgPSB0aGlzO1xuICAgICQodmVudCkub2ZmKCdkaXJ0eScpLm9uKCdkaXJ0eScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBudWxsLCB0cnVlKTtcbiAgICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRlcm1pbmUgd2hlbiB0byB1cGRhdGUgc3RhdGVcbiAgICAgICAgICogQHR5cGUge1N0cmluZyB8IEFycmF5IHwgT2JqZWN0fSBQb3NzaWJsZSBvcHRpb25zIGFyZVxuICAgICAgICAgKiAgICAgICAtIHRydWU6IG5ldmVyIHRyaWdnZXIgYW55IHVwZGF0ZXMuIFVzZSB0aGlzIGlmIHlvdSBrbm93IHlvdXIgbW9kZWwgc3RhdGUgd29uJ3QgY2hhbmdlIGJhc2VkIG9uIG9wZXJhdGlvbnNcbiAgICAgICAgICogICAgICAgLSBmYWxzZTogYWx3YXlzIHRyaWdnZXIgdXBkYXRlcy5cbiAgICAgICAgICogICAgICAgLSBbYXJyYXkgb2YgdmFyaWFibGUgbmFtZXNdOiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSB3aWxsIG5vdCB0cmlnZ2VyIHVwZGF0ZXMsIGV2ZXJ5dGhpbmcgZWxzZSB3aWxsXG4gICAgICAgICAqICAgICAgIC0geyBleGNlcHQ6IFthcnJheSBvZiBvcGVyYXRpb25zXX06IFZhcmlhYmxlcyBpbiB0aGlzIGFycmF5IHdpbGwgdHJpZ2dlciB1cGRhdGVzLCBub3RoaW5nIGVsc2Ugd2lsbFxuICAgICAgICAgKi9cbiAgICAgICAgc2lsZW50OiBmYWxzZVxuICAgIH07XG5cbiAgICB2YXIgY2hhbm5lbE9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgIHZhciBydW4gPSBjaGFubmVsT3B0aW9ucy5ydW47XG4gICAgdmFyIHZlbnQgPSBjaGFubmVsT3B0aW9ucy52ZW50O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgLy9mb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBvcHRpb25zOiBjaGFubmVsT3B0aW9uc1xuICAgICAgICB9LFxuXG4gICAgICAgIGxpc3RlbmVyTWFwOiB7fSxcblxuICAgICAgICAvL0NoZWNrIGZvciB1cGRhdGVzXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUcmlnZ2VycyB1cGRhdGUgb24gc2libGluZyB2YXJpYWJsZXMgY2hhbm5lbFxuICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmd8YXJyYXl9IGV4ZWN1dGVkT3BucyBvcGVyYXRpb25zIHdoaWNoIGp1c3QgaGFwcGVuZWRcbiAgICAgICAgICogQHBhcmFtICB7Kn0gcmVzcG9uc2UgIHJlc3BvbnNlIGZyb20gdGhlIG9wZXJhdGlvblxuICAgICAgICAgKiBAcGFyYW0gIHtib29sZWFufSBmb3JjZSAgaWdub3JlIGFsbCBzaWxlbmNlIG9wdGlvbnMgYW5kIGZvcmNlIHJlZnJlc2hcbiAgICAgICAgICovXG4gICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uIChleGVjdXRlZE9wbnMsIHJlc3BvbnNlLCBmb3JjZSkge1xuICAgICAgICAgICAgdmFyIHNpbGVudCA9IGNoYW5uZWxPcHRpb25zLnNpbGVudDtcblxuICAgICAgICAgICAgdmFyIHNob3VsZFNpbGVuY2UgPSBzaWxlbnQgPT09IHRydWU7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KHNpbGVudCkgJiYgZXhlY3V0ZWRPcG5zKSB7XG4gICAgICAgICAgICAgICAgc2hvdWxkU2lsZW5jZSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudCwgZXhlY3V0ZWRPcG5zKS5sZW5ndGggPj0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3Qoc2lsZW50KSAmJiBleGVjdXRlZE9wbnMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LmV4Y2VwdCwgZXhlY3V0ZWRPcG5zKS5sZW5ndGggIT09IGV4ZWN1dGVkT3Bucy5sZW5ndGg7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghc2hvdWxkU2lsZW5jZSB8fCBmb3JjZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICQodmVudCkudHJpZ2dlcignZGlydHknLCB7IG9wbjogZXhlY3V0ZWRPcG5zLCByZXNwb25zZTogcmVzcG9uc2UgfSk7XG4gICAgICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgICAgICBfLmVhY2goZXhlY3V0ZWRPcG5zLCBmdW5jdGlvbiAob3BuKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLm5vdGlmeShvcG4sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5saXN0ZW5lck1hcFtvcGVyYXRpb25dO1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW29wZXJhdGlvbl0gPSB2YWx1ZTtcblxuICAgICAgICAgICAgXy5lYWNoKGxpc3RlbmVycywgZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhcmdldCA9IGxpc3RlbmVyLnRhcmdldDtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNhbGwobnVsbCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC50cmlnZ2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLnRhcmdldC50cmlnZ2VyKGNvbmZpZy5ldmVudHMucmVhY3QsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGxpc3RlcmVyIGZvcm1hdCBmb3IgJyArIG9wZXJhdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE9wZXJhdGlvbiBuYW1lICYgcGFyYW1ldGVycyB0byBzZW5kIHRvIG9wZXJhdGlvbnMgQVBJXG4gICAgICAgICAqIEBwYXJhbSAge3N0cmluZyB8IG9iamVjdH0gb3BlcmF0aW9uIE5hbWUgb2YgT3BlcmF0aW9uLiBJZiBhcnJheSwgbmVlZHMgdG8gYmUgaW4ge29wZXJhdGlvbnM6IFt7bmFtZTogb3BuLCBwYXJhbXM6W119XSwgc2VyaWFsOiBib29sZWFufV0gZm9ybWF0XG4gICAgICAgICAqIEBwYXJhbSAgeyp9IHBhcmFtcyAob3B0aW9uYWwpICAgcGFyYW1zIHRvIHNlbmQgdG8gb3BlcnRhaW9uXG4gICAgICAgICAqIEBwYXJhbSB7b3B0aW9ufSBvcHRpb25zIFN1cHBvcnRlZCBvcHRpb25zOiB7c2lsZW50OiBCb29sZWFufVxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uIChvcGVyYXRpb24sIHBhcmFtcywgb3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3Qob3BlcmF0aW9uKSAmJiBvcGVyYXRpb24ub3BlcmF0aW9ucykge1xuICAgICAgICAgICAgICAgIHZhciBmbiA9IChvcGVyYXRpb24uc2VyaWFsKSA/IHJ1bi5zZXJpYWwgOiBydW4ucGFyYWxsZWw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLmNhbGwocnVuLCBvcGVyYXRpb24ub3BlcmF0aW9ucylcbiAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcGFyYW1zIHx8ICFwYXJhbXMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgXy5wbHVjayhvcGVyYXRpb24ub3BlcmF0aW9ucywgJ25hbWUnKSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvL1RPRE86IGNoZWNrIGlmIGludGVycG9sYXRlZFxuICAgICAgICAgICAgICAgIHZhciBvcHRzID0gKCQuaXNQbGFpbk9iamVjdChvcGVyYXRpb24pKSA/IHBhcmFtcyA6IG9wdGlvbnM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ1bi5kby5hcHBseShydW4sIGFyZ3VtZW50cylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9wdHMgfHwgIW9wdHMuc2lsZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBbb3BlcmF0aW9uXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdvcGVyYXRpb25zIHB1Ymxpc2gnLCBvcGVyYXRpb24sIHBhcmFtcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbiAob3BlcmF0aW9ucywgc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ29wZXJhdGlvbnMgc3Vic2NyaWJlJywgb3BlcmF0aW9ucywgc3Vic2NyaWJlcik7XG4gICAgICAgICAgICBvcGVyYXRpb25zID0gW10uY29uY2F0KG9wZXJhdGlvbnMpO1xuICAgICAgICAgICAgLy91c2UganF1ZXJ5IHRvIG1ha2UgZXZlbnQgc2lua1xuICAgICAgICAgICAgLy9UT0RPOiBzdWJzY3JpYmVyIGNhbiBiZSBhIGZ1bmN0aW9uXG4gICAgICAgICAgICBpZiAoIXN1YnNjcmliZXIub24gJiYgIV8uaXNGdW5jdGlvbihzdWJzY3JpYmVyKSkge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC5vcGVyYXRpb24nKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICAgICQuZWFjaChvcGVyYXRpb25zLCBmdW5jdGlvbiAoaW5kZXgsIG9wbikge1xuICAgICAgICAgICAgICAgIGlmICghbWUubGlzdGVuZXJNYXBbb3BuXSkge1xuICAgICAgICAgICAgICAgICAgICBtZS5saXN0ZW5lck1hcFtvcG5dID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBtZS5saXN0ZW5lck1hcFtvcG5dLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAob3BlcmF0aW9uLCB0b2tlbikge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lck1hcFtvcGVyYXRpb25dID0gXy5yZWplY3QodGhpcy5saXN0ZW5lck1hcFtvcGVyYXRpb25dLCBmdW5jdGlvbiAoc3Vicykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWJzLmlkID09PSB0b2tlbjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICB1bnN1YnNjcmliZUFsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lck1hcCA9IHt9O1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgICBzZWxlY3RvciA9ICcqJztcbiAgICB9XG4gICAgaGFuZGxlci5zZWxlY3RvciA9IHNlbGVjdG9yO1xuICAgIHJldHVybiBoYW5kbGVyO1xufTtcblxudmFyIG1hdGNoID0gZnVuY3Rpb24gKHRvTWF0Y2gsIG5vZGUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyh0b01hdGNoKSkge1xuICAgICAgICByZXR1cm4gdG9NYXRjaCA9PT0gbm9kZS5zZWxlY3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJCh0b01hdGNoKS5pcyhub2RlLnNlbGVjdG9yKTtcbiAgICB9XG59O1xuXG52YXIgbm9kZU1hbmFnZXIgPSB7XG4gICAgbGlzdDogW10sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgbm9kZSBoYW5kbGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBzZWxlY3RvciBqUXVlcnktY29tcGF0aWJsZSBzZWxlY3RvciB0byB1c2UgdG8gbWF0Y2ggbm9kZXNcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbn0gaGFuZGxlciAgSGFuZGxlcnMgYXJlIG5ldy1hYmxlIGZ1bmN0aW9ucy4gVGhleSB3aWxsIGJlIGNhbGxlZCB3aXRoICRlbCBhcyBjb250ZXh0Lj8gVE9ETzogVGhpbmsgdGhpcyB0aHJvdWdoXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgICAgICB0aGlzLmxpc3QudW5zaGlmdChub3JtYWxpemUoc2VsZWN0b3IsIGhhbmRsZXIpKTtcbiAgICB9LFxuXG4gICAgZ2V0SGFuZGxlcjogZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoKHNlbGVjdG9yLCBub2RlKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHJlcGxhY2U6IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChjdXJyZW50SGFuZGxlciwgaSkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yID09PSBjdXJyZW50SGFuZGxlci5zZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoc2VsZWN0b3IsIGhhbmRsZXIpKTtcbiAgICB9XG59O1xuXG4vL2Jvb3RzdHJhcHNcbnZhciBkZWZhdWx0SGFuZGxlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9pbnB1dC1jaGVja2JveC1ub2RlJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtbm9kZScpXG5dO1xuXy5lYWNoKGRlZmF1bHRIYW5kbGVycy5yZXZlcnNlKCksIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgbm9kZU1hbmFnZXIucmVnaXN0ZXIoaGFuZGxlci5zZWxlY3RvciwgaGFuZGxlcik7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBub2RlTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL25vLW9wLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2V2ZW50cy9pbml0LWV2ZW50LWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2V2ZW50cy9kZWZhdWx0LWV2ZW50LWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvaW5wdXQtYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9jbGFzcy1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9wb3NpdGl2ZS1ib29sZWFuLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL25lZ2F0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvZGVmYXVsdC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtYXR0cicpXG5dO1xuXG52YXIgaGFuZGxlcnNMaXN0ID0gW107XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYXR0cmlidXRlTWF0Y2hlciwgbm9kZU1hdGNoZXIsIGhhbmRsZXIpIHtcbiAgICBpZiAoIW5vZGVNYXRjaGVyKSB7XG4gICAgICAgIG5vZGVNYXRjaGVyID0gJyonO1xuICAgIH1cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuICQuZXh0ZW5kKGhhbmRsZXIsIHsgdGVzdDogYXR0cmlidXRlTWF0Y2hlciwgdGFyZ2V0OiBub2RlTWF0Y2hlciB9KTtcbn07XG5cbiQuZWFjaChkZWZhdWx0SGFuZGxlcnMsIGZ1bmN0aW9uIChpbmRleCwgaGFuZGxlcikge1xuICAgIGhhbmRsZXJzTGlzdC5wdXNoKG5vcm1hbGl6ZShoYW5kbGVyLnRlc3QsIGhhbmRsZXIudGFyZ2V0LCBoYW5kbGVyKSk7XG59KTtcblxuXG52YXIgbWF0Y2hBdHRyID0gZnVuY3Rpb24gKG1hdGNoRXhwciwgYXR0ciwgJGVsKSB7XG4gICAgdmFyIGF0dHJNYXRjaDtcblxuICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgYXR0ck1hdGNoID0gKG1hdGNoRXhwciA9PT0gJyonIHx8IChtYXRjaEV4cHIudG9Mb3dlckNhc2UoKSA9PT0gYXR0ci50b0xvd2VyQ2FzZSgpKSk7XG4gICAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24obWF0Y2hFeHByKSkge1xuICAgICAgICAvL1RPRE86IHJlbW92ZSBlbGVtZW50IHNlbGVjdG9ycyBmcm9tIGF0dHJpYnV0ZXNcbiAgICAgICAgYXR0ck1hdGNoID0gbWF0Y2hFeHByKGF0dHIsICRlbCk7XG4gICAgfSBlbHNlIGlmIChfLmlzUmVnRXhwKG1hdGNoRXhwcikpIHtcbiAgICAgICAgYXR0ck1hdGNoID0gYXR0ci5tYXRjaChtYXRjaEV4cHIpO1xuICAgIH1cbiAgICByZXR1cm4gYXR0ck1hdGNoO1xufTtcblxudmFyIG1hdGNoTm9kZSA9IGZ1bmN0aW9uICh0YXJnZXQsIG5vZGVGaWx0ZXIpIHtcbiAgICByZXR1cm4gKF8uaXNTdHJpbmcobm9kZUZpbHRlcikpID8gKG5vZGVGaWx0ZXIgPT09IHRhcmdldCkgOiBub2RlRmlsdGVyLmlzKHRhcmdldCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsaXN0OiBoYW5kbGVyc0xpc3QsXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IGF0dHJpYnV0ZSBoYW5kbGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfGZ1bmN0aW9ufHJlZ2V4fSBhdHRyaWJ1dGVNYXRjaGVyIERlc2NyaXB0aW9uIG9mIHdoaWNoIGF0dHJpYnV0ZXMgdG8gbWF0Y2hcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IG5vZGVNYXRjaGVyICAgICAgV2hpY2ggbm9kZXMgdG8gYWxsIGF0dHJpYnV0ZXMgdG8uIFVzZSBqcXVlcnkgU2VsZWN0b3Igc3ludGF4XG4gICAgICogQHBhcmFtICB7ZnVuY3Rpb258b2JqZWN0fSBoYW5kbGVyICAgIEhhbmRsZXIgY2FuIGVpdGhlciBiZSBhIGZ1bmN0aW9uIChUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2l0aCAkZWxlbWVudCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZSksIG9yIGFuIG9iamVjdCB3aXRoIHtpbml0OiBmbiwgIGhhbmRsZTogZm59LiBUaGUgaW5pdCBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aGVuIHBhZ2UgbG9hZHM7IHVzZSB0aGlzIHRvIGRlZmluZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoYXR0cmlidXRlTWF0Y2hlciwgbm9kZU1hdGNoZXIsIGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlcnNMaXN0LnVuc2hpZnQobm9ybWFsaXplLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaW5kIGFuIGF0dHJpYnV0ZSBtYXRjaGVyIG1hdGNoaW5nIHNvbWUgY3JpdGVyaWFcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IGF0dHJGaWx0ZXIgYXR0cmlidXRlIHRvIG1hdGNoXG4gICAgICogQHBhcmFtICB7c3RyaW5nIHwgJGVsfSBub2RlRmlsdGVyIG5vZGUgdG8gbWF0Y2hcbiAgICAgKiBAcmV0dXJuIHthcnJheXxudWxsfVxuICAgICAqL1xuICAgIGZpbHRlcjogZnVuY3Rpb24gKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIpIHtcbiAgICAgICAgdmFyIGZpbHRlcmVkID0gXy5zZWxlY3QoaGFuZGxlcnNMaXN0LCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQXR0cihoYW5kbGVyLnRlc3QsIGF0dHJGaWx0ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG5vZGVGaWx0ZXIpIHtcbiAgICAgICAgICAgIGZpbHRlcmVkID0gXy5zZWxlY3QoZmlsdGVyZWQsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoTm9kZShoYW5kbGVyLnRhcmdldCwgbm9kZUZpbHRlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgfSxcblxuICAgIHJlcGxhY2U6IGZ1bmN0aW9uIChhdHRyRmlsdGVyLCBub2RlRmlsdGVyLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKGhhbmRsZXJzTGlzdCwgZnVuY3Rpb24gKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hBdHRyKGN1cnJlbnRIYW5kbGVyLnRlc3QsIGF0dHJGaWx0ZXIpICYmIG1hdGNoTm9kZShjdXJyZW50SGFuZGxlci50YXJnZXQsIG5vZGVGaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGhhbmRsZXJzTGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShhdHRyRmlsdGVyLCBub2RlRmlsdGVyLCBoYW5kbGVyKSk7XG4gICAgfSxcblxuICAgIGdldEhhbmRsZXI6IGZ1bmN0aW9uIChwcm9wZXJ0eSwgJGVsKSB7XG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyKHByb3BlcnR5LCAkZWwpO1xuICAgICAgICAvL1RoZXJlIGNvdWxkIGJlIG11bHRpcGxlIG1hdGNoZXMsIGJ1dCB0aGUgdG9wIGZpcnN0IGhhcyB0aGUgbW9zdCBwcmlvcml0eVxuICAgICAgICByZXR1cm4gZmlsdGVyZWRbMF07XG4gICAgfVxufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYWxpYXM6ICdpJyxcbiAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsdWUsIDEwKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgczogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gdmFsICsgJyc7XG4gICAgfSxcblxuICAgIHVwcGVyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgIH0sXG4gICAgbG93ZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcbiAgICB0aXRsZUNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsID0gdmFsICsgJyc7XG4gICAgICAgIHJldHVybiB2YWwucmVwbGFjZSgvXFx3XFxTKi9nLCBmdW5jdGlvbiAodHh0KSB7cmV0dXJuIHR4dC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHR4dC5zdWJzdHIoMSkudG9Mb3dlckNhc2UoKTt9KTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gW10uY29uY2F0KHZhbCk7XG4gICAgfSxcbiAgICBsYXN0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICByZXR1cm4gdmFsW3ZhbC5sZW5ndGggLSAxXTtcbiAgICB9LFxuICAgIGZpcnN0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICByZXR1cm4gdmFsWzBdO1xuICAgIH0sXG4gICAgcHJldmlvdXM6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgIHJldHVybiAodmFsLmxlbmd0aCA8PSAxKSA/IHZhbFswXSA6IHZhbFt2YWwubGVuZ3RoIC0gMl07XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFsaWFzOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAvL1RPRE86IEZhbmN5IHJlZ2V4IHRvIG1hdGNoIG51bWJlciBmb3JtYXRzIGhlcmVcbiAgICAgICAgcmV0dXJuIChuYW1lLmluZGV4T2YoJyMnKSAhPT0gLTEgfHwgbmFtZS5pbmRleE9mKCcwJykgIT09IC0xKTtcbiAgICB9LFxuXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsKz0gJyc7XG4gICAgICAgIHZhciBpc05lZ2F0aXZlID0gdmFsLmNoYXJBdCgwKSA9PT0gJy0nO1xuXG4gICAgICAgIHZhbCAgPSB2YWwucmVwbGFjZSgvLC9nLCAnJyk7XG4gICAgICAgIHZhciBmbG9hdE1hdGNoZXIgPSAvKFstK10/WzAtOV0qXFwuP1swLTldKykoSz9NP0I/JT8pL2k7XG4gICAgICAgIHZhciByZXN1bHRzID0gZmxvYXRNYXRjaGVyLmV4ZWModmFsKTtcbiAgICAgICAgdmFyIG51bWJlciwgc3VmZml4ID0gJyc7XG4gICAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHNbMV0pIHtcbiAgICAgICAgICAgIG51bWJlciA9IHJlc3VsdHNbMV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdHMgJiYgcmVzdWx0c1syXSkge1xuICAgICAgICAgICAgc3VmZml4ID0gcmVzdWx0c1syXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChzdWZmaXgpIHtcbiAgICAgICAgICAgIGNhc2UgJyUnOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAvIDEwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2snOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBudW1iZXIgPSBwYXJzZUZsb2F0KG51bWJlcik7XG4gICAgICAgIGlmIChpc05lZ2F0aXZlICYmIG51bWJlciA+IDApIHtcbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIC0xO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgfSxcblxuICAgIGNvbnZlcnQ6IChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHNjYWxlcyA9IFsnJywgJ0snLCAnTScsICdCJywgJ1QnXTtcblxuICAgICAgICBmdW5jdGlvbiBnZXREaWdpdHModmFsdWUsIGRpZ2l0cykge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA9PT0gMCA/IDAgOiByb3VuZFRvKHZhbHVlLCBNYXRoLm1heCgwLCBkaWdpdHMgLSBNYXRoLmNlaWwoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjEwKSkpO1xuXG4gICAgICAgICAgICB2YXIgVFhUID0gJyc7XG4gICAgICAgICAgICB2YXIgbnVtYmVyVFhUID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFsU2V0ID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGlUWFQgPSAwOyBpVFhUIDwgbnVtYmVyVFhULmxlbmd0aDsgaVRYVCsrKSB7XG4gICAgICAgICAgICAgICAgVFhUICs9IG51bWJlclRYVC5jaGFyQXQoaVRYVCk7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5jaGFyQXQoaVRYVCkgPT09ICcuJykge1xuICAgICAgICAgICAgICAgICAgICBkZWNpbWFsU2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkaWdpdHMtLTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZGlnaXRzIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVjaW1hbFNldCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnLic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoZGlnaXRzID4gMCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnMCc7XG4gICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkRGVjaW1hbHModmFsdWUsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICBoYXNDb21tYXMgPSBoYXNDb21tYXMgfHwgdHJ1ZTtcbiAgICAgICAgICAgIHZhciBudW1iZXJUWFQgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIGhhc0RlY2ltYWxzID0gKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA+IDEpO1xuICAgICAgICAgICAgdmFyIGlEZWMgPSAwO1xuXG4gICAgICAgICAgICBpZiAoaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaUNoYXIgPSBudW1iZXJUWFQubGVuZ3RoIC0gMTsgaUNoYXIgPiAwOyBpQ2hhci0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNEZWNpbWFscykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULmNoYXJBdChpQ2hhcikgIT09ICcuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpRGVjID0gKGlEZWMgKyAxKSAlIDM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaURlYyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCA9IG51bWJlclRYVC5zdWJzdHIoMCwgaUNoYXIpICsgJywnICsgbnVtYmVyVFhULnN1YnN0cihpQ2hhcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkZWNpbWFscyA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9BREQ7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHM7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCArPSAnLic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0b0FERCA9IG1pbkRlY2ltYWxzIC0gbnVtYmVyVFhULnNwbGl0KCcuJylbMV0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcwJztcbiAgICAgICAgICAgICAgICAgICAgdG9BREQtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVtYmVyVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcm91bmRUbyh2YWx1ZSwgZGlnaXRzKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh2YWx1ZSAqIE1hdGgucG93KDEwLCBkaWdpdHMpKSAvIE1hdGgucG93KDEwLCBkaWdpdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U3VmZml4KGZvcm1hdFRYVCkge1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJy4nLCAnJyk7XG4gICAgICAgICAgICB2YXIgZml4ZXNUWFQgPSBmb3JtYXRUWFQuc3BsaXQobmV3IFJlZ0V4cCgnWzB8LHwjXSsnLCAnZycpKTtcbiAgICAgICAgICAgIHJldHVybiAoZml4ZXNUWFQubGVuZ3RoID4gMSkgPyBmaXhlc1RYVFsxXS50b1N0cmluZygpIDogJyc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc0N1cnJlbmN5KHN0cmluZykge1xuICAgICAgICAgICAgdmFyIHMgPSAkLnRyaW0oc3RyaW5nKTtcblxuICAgICAgICAgICAgaWYgKHMgPT09ICckJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKsJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKlJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKjJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKhJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKxJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdLw4Q/JyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdrcicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCoicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4bigJknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqsnKSB7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZm9ybWF0KG51bWJlciwgZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXJbbnVtYmVyLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfLmlzU3RyaW5nKG51bWJlcikgJiYgIV8uaXNOdW1iZXIobnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZm9ybWF0VFhUIHx8IGZvcm1hdFRYVC50b0xvd2VyQ2FzZSgpID09PSAnZGVmYXVsdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc05hTihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICc/JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy92YXIgZm9ybWF0VFhUO1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJyZldXJvOycsICfDouKAmsKsJyk7XG5cbiAgICAgICAgICAgIC8vIERpdmlkZSArLy0gTnVtYmVyIEZvcm1hdFxuICAgICAgICAgICAgdmFyIGZvcm1hdHMgPSBmb3JtYXRUWFQuc3BsaXQoJzsnKTtcbiAgICAgICAgICAgIGlmIChmb3JtYXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0KE1hdGguYWJzKG51bWJlciksIGZvcm1hdHNbKChudW1iZXIgPj0gMCkgPyAwIDogMSldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2F2ZSBTaWduXG4gICAgICAgICAgICB2YXIgc2lnbiA9IChudW1iZXIgPj0gMCkgPyAnJyA6ICctJztcbiAgICAgICAgICAgIG51bWJlciA9IE1hdGguYWJzKG51bWJlcik7XG5cblxuICAgICAgICAgICAgdmFyIGxlZnRPZkRlY2ltYWwgPSBmb3JtYXRUWFQ7XG4gICAgICAgICAgICB2YXIgZCA9IGxlZnRPZkRlY2ltYWwuaW5kZXhPZignLicpO1xuICAgICAgICAgICAgaWYgKGQgPiAtMSkge1xuICAgICAgICAgICAgICAgIGxlZnRPZkRlY2ltYWwgPSBsZWZ0T2ZEZWNpbWFsLnN1YnN0cmluZygwLCBkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBsZWZ0T2ZEZWNpbWFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBub3JtYWxpemVkLmxhc3RJbmRleE9mKCdzJyk7XG4gICAgICAgICAgICB2YXIgaXNTaG9ydEZvcm1hdCA9IGluZGV4ID4gLTE7XG5cbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIG5leHRDaGFyID0gbGVmdE9mRGVjaW1hbC5jaGFyQXQoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09ICcgJykge1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbGVhZGluZ1RleHQgPSBpc1Nob3J0Rm9ybWF0ID8gZm9ybWF0VFhULnN1YnN0cmluZygwLCBpbmRleCkgOiAnJztcbiAgICAgICAgICAgIHZhciByaWdodE9mUHJlZml4ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKSA6IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXgpO1xuXG4gICAgICAgICAgICAvL2ZpcnN0IGNoZWNrIHRvIG1ha2Ugc3VyZSAncycgaXMgYWN0dWFsbHkgc2hvcnQgZm9ybWF0IGFuZCBub3QgcGFydCBvZiBzb21lIGxlYWRpbmcgdGV4dFxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0ID0gL1swLTkjKl0vO1xuICAgICAgICAgICAgICAgIHZhciBzaG9ydEZvcm1hdFRlc3RSZXN1bHQgPSByaWdodE9mUHJlZml4Lm1hdGNoKHNob3J0Rm9ybWF0VGVzdCk7XG4gICAgICAgICAgICAgICAgaWYgKCFzaG9ydEZvcm1hdFRlc3RSZXN1bHQgfHwgc2hvcnRGb3JtYXRUZXN0UmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvL25vIHNob3J0IGZvcm1hdCBjaGFyYWN0ZXJzIHNvIHRoaXMgbXVzdCBiZSBsZWFkaW5nIHRleHQgaWUuICd3ZWVrcyAnXG4gICAgICAgICAgICAgICAgICAgIGlzU2hvcnRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgbGVhZGluZ1RleHQgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vaWYgKGZvcm1hdFRYVC5jaGFyQXQoMCkgPT0gJ3MnKVxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsU2NhbGUgPSBudW1iZXIgPT09IDAgPyAwIDogTWF0aC5mbG9vcihNYXRoLmxvZyhNYXRoLmFicyhudW1iZXIpKSAvICgzICogTWF0aC5MTjEwKSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSAoKG51bWJlciAvIE1hdGgucG93KDEwLCAzICogdmFsU2NhbGUpKSA8IDEwMDApID8gdmFsU2NhbGUgOiAodmFsU2NhbGUgKyAxKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWF4KHZhbFNjYWxlLCAwKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWluKHZhbFNjYWxlLCA0KTtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKTtcbiAgICAgICAgICAgICAgICAvL2lmICghaXNOYU4oTnVtYmVyKGZvcm1hdFRYVC5zdWJzdHIoMSkgKSApIClcblxuICAgICAgICAgICAgICAgIGlmICghaXNOYU4oTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSAmJiByaWdodE9mUHJlZml4LmluZGV4T2YoJy4nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpbWl0RGlnaXRzID0gTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVtYmVyIDwgTWF0aC5wb3coMTAsIGxpbWl0RGlnaXRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIGdldERpZ2l0cyhudW1iZXIsIE51bWJlcihyaWdodE9mUHJlZml4KSkgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyBzaWduICsgZ2V0RGlnaXRzKG51bWJlciwgTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgTWF0aC5yb3VuZChudW1iZXIpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2Zvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIFNVRkZJWCA9IGdldFN1ZmZpeChmb3JtYXRUWFQpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDAsIGZvcm1hdFRYVC5sZW5ndGggLSBTVUZGSVgubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsV2l0aG91dExlYWRpbmcgPSBmb3JtYXQoKChzaWduID09PSAnJykgPyAxIDogLTEpICogbnVtYmVyLCBmb3JtYXRUWFQpICsgc2NhbGVzW3ZhbFNjYWxlXSArIFNVRkZJWDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpICYmIHNpZ24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxXaXRob3V0TGVhZGluZyA9IHZhbFdpdGhvdXRMZWFkaW5nLnN1YnN0cihzaWduLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdWJGb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbHM7XG4gICAgICAgICAgICB2YXIgbWluRGVjaW1hbHM7XG4gICAgICAgICAgICBpZiAoc3ViRm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIG1pbkRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnMCsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IHN1YkZvcm1hdHNbMF0gKyBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgdmFyIHByZWZmaXggPSBmaXhlc1RYVFswXS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIHN1ZmZpeCA9IChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcblxuICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogKChmb3JtYXRUWFQuc3BsaXQoJyUnKS5sZW5ndGggPiAxKSA/IDEwMCA6IDEpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICBpZiAoZm9ybWF0VFhULmluZGV4T2YoJyUnKSAhPT0gLTEpIG51bWJlciA9IG51bWJlciAqIDEwMDtcbiAgICAgICAgICAgIG51bWJlciA9IHJvdW5kVG8obnVtYmVyLCBkZWNpbWFscyk7XG5cbiAgICAgICAgICAgIHNpZ24gPSAobnVtYmVyID09PSAwKSA/ICcnIDogc2lnbjtcblxuICAgICAgICAgICAgdmFyIGhhc0NvbW1hcyA9IChmb3JtYXRUWFQuc3Vic3RyKGZvcm1hdFRYVC5sZW5ndGggLSA0IC0gc3VmZml4Lmxlbmd0aCwgMSkgPT09ICcsJyk7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVkID0gc2lnbiArIHByZWZmaXggKyBhZGREZWNpbWFscyhudW1iZXIsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSArIHN1ZmZpeDtcblxuICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKG9yaWdpbmFsTnVtYmVyLCBvcmlnaW5hbEZvcm1hdCwgZm9ybWF0dGVkKVxuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXQ7XG4gICAgfSgpKVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gQXR0cmlidXRlcyB3aGljaCBhcmUganVzdCBwYXJhbWV0ZXJzIHRvIG90aGVycyBhbmQgY2FuIGp1c3QgYmUgaWdub3JlZFxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86bW9kZWx8Y29udmVydCkkL2ksXG5cbiAgICBoYW5kbGU6ICQubm9vcCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiBmdW5jdGlvbiAoYXR0ciwgJG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoJ29uLWluaXQnKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi1pbml0JywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3MgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7IG9wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiBmdW5jdGlvbiAoYXR0ciwgJG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoJ29uLScpID09PSAwKTtcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2UoJ29uLScsICcnKTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgdGhpcy5vZmYoYXR0cikub24oYXR0ciwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGxpc3RPZk9wZXJhdGlvbnMgPSBfLmludm9rZSh2YWx1ZS5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgbGlzdE9mT3BlcmF0aW9ucyA9IGxpc3RPZk9wZXJhdGlvbnMubWFwKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBmbk5hbWUgPSB2YWx1ZS5zcGxpdCgnKCcpWzBdO1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB2YWx1ZS5zdWJzdHJpbmcodmFsdWUuaW5kZXhPZignKCcpICsgMSwgdmFsdWUuaW5kZXhPZignKScpKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9ICgkLnRyaW0ocGFyYW1zKSAhPT0gJycpID8gcGFyYW1zLnNwbGl0KCcsJykgOiBbXTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBmbk5hbWUsIHBhcmFtczogYXJncyB9O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG1lLnRyaWdnZXIoJ2YudWkub3BlcmF0ZScsIHsgb3BlcmF0aW9uczogbGlzdE9mT3BlcmF0aW9ucywgc2VyaWFsOiB0cnVlIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvL0Rvbid0IGJvdGhlciBiaW5kaW5nIG9uIHRoaXMgYXR0ci4gTk9URTogRG8gcmVhZG9ubHksIHRydWUgaW5zdGVhZD87XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICc6Y2hlY2tib3gsOnJhZGlvJyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZXR0YWJsZVZhbHVlID0gdGhpcy5hdHRyKCd2YWx1ZScpOyAvL2luaXRpYWwgdmFsdWVcbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciBpc0NoZWNrZWQgPSAoc2V0dGFibGVWYWx1ZSAhPT0gdW5kZWZpbmVkKSA/IChzZXR0YWJsZVZhbHVlID09IHZhbHVlKSA6ICEhdmFsdWU7XG4gICAgICAgIHRoaXMucHJvcCgnY2hlY2tlZCcsIGlzQ2hlY2tlZCk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnaW5wdXQsIHNlbGVjdCcsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnZhbCh2YWx1ZSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnY2xhc3MnLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhZGRlZENsYXNzZXMgPSB0aGlzLmRhdGEoJ2FkZGVkLWNsYXNzZXMnKTtcbiAgICAgICAgaWYgKCFhZGRlZENsYXNzZXMpIHtcbiAgICAgICAgICAgIGFkZGVkQ2xhc3NlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChhZGRlZENsYXNzZXNbcHJvcF0pIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoYWRkZWRDbGFzc2VzW3Byb3BdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSAndmFsdWUtJyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGFkZGVkQ2xhc3Nlc1twcm9wXSA9IHZhbHVlO1xuICAgICAgICAvL0ZpeG1lOiBwcm9wIGlzIGFsd2F5cyBcImNsYXNzXCJcbiAgICAgICAgdGhpcy5hZGRDbGFzcyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycsIGFkZGVkQ2xhc3Nlcyk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmNoZWNrZWR8c2VsZWN0ZWR8YXN5bmN8YXV0b2ZvY3VzfGF1dG9wbGF5fGNvbnRyb2xzfGRlZmVyfGlzbWFwfGxvb3B8bXVsdGlwbGV8b3BlbnxyZXF1aXJlZHxzY29wZWQpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciB2YWwgPSAodGhpcy5hdHRyKCd2YWx1ZScpKSA/ICh2YWx1ZSA9PSB0aGlzLnByb3AoJ3ZhbHVlJykpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbCk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86ZGlzYWJsZWR8aGlkZGVufHJlYWRvbmx5KSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCAhdmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmh0bWwodmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGVzdDogJyonLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICB0aGlzLnByb3AocHJvcCwgdmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCh7XG5cbiAgICBwcm9wZXJ0eUhhbmRsZXJzOiBbXG5cbiAgICBdLFxuXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGVsID0gdGhpcy4kZWw7XG4gICAgICAgIC8vVE9ETzogZmlsZSBhIGlzc3VlIGZvciB0aGUgdmVuc2ltIG1hbmFnZXIgdG8gY29udmVydCB0cnVlcyB0byAxcyBhbmQgc2V0IHRoaXMgdG8gdHJ1ZSBhbmQgZmFsc2VcblxuICAgICAgICB2YXIgb2ZmVmFsID0gICgkZWwuZGF0YSgnZi1vZmYnKSAhPT0gdW5kZWZpbmVkKSA/ICRlbC5kYXRhKCdmLW9mZicpIDogMDtcbiAgICAgICAgLy9hdHRyID0gaW5pdGlhbCB2YWx1ZSwgcHJvcCA9IGN1cnJlbnQgdmFsdWVcbiAgICAgICAgdmFyIG9uVmFsID0gKCRlbC5hdHRyKCd2YWx1ZScpICE9PSB1bmRlZmluZWQpID8gJGVsLnByb3AoJ3ZhbHVlJyk6IDE7XG5cbiAgICAgICAgdmFyIHZhbCA9ICgkZWwuaXMoJzpjaGVja2VkJykpID8gb25WYWwgOiBvZmZWYWw7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwgeyBzZWxlY3RvcjogJzpjaGVja2JveCw6cmFkaW8nIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2NvbmZpZycpO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuICAgIHByb3BlcnR5SGFuZGxlcnM6IFtdLFxuXG4gICAgdWlDaGFuZ2VFdmVudDogJ2NoYW5nZScsXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwudmFsKCk7XG4gICAgfSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgdmFyIHByb3BOYW1lID0gdGhpcy4kZWwuZGF0YShjb25maWcuYmluZGVyQXR0cik7XG5cbiAgICAgICAgaWYgKHByb3BOYW1lKSB7XG4gICAgICAgICAgICB0aGlzLiRlbC5vZmYodGhpcy51aUNoYW5nZUV2ZW50KS5vbih0aGlzLnVpQ2hhbmdlRXZlbnQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gbWUuZ2V0VUlWYWx1ZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgICAgIHBhcmFtc1twcm9wTmFtZV0gPSB2YWw7XG5cbiAgICAgICAgICAgICAgICBtZS4kZWwudHJpZ2dlcihjb25maWcuZXZlbnRzLnRyaWdnZXIsIHBhcmFtcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICdpbnB1dCwgc2VsZWN0JyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBwcm9wZXJ0eUhhbmRsZXJzOiBbXG5cbiAgICBdLFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICcqJyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGV4dGVuZCA9IGZ1bmN0aW9uIChwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIHZhciBjaGlsZDtcblxuICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIG5ldyBzdWJjbGFzcyBpcyBlaXRoZXIgZGVmaW5lZCBieSB5b3VcbiAgICAvLyAodGhlIFwiY29uc3RydWN0b3JcIiBwcm9wZXJ0eSBpbiB5b3VyIGBleHRlbmRgIGRlZmluaXRpb24pLCBvciBkZWZhdWx0ZWRcbiAgICAvLyBieSB1cyB0byBzaW1wbHkgY2FsbCB0aGUgcGFyZW50J3MgY29uc3RydWN0b3IuXG4gICAgaWYgKHByb3RvUHJvcHMgJiYgXy5oYXMocHJvdG9Qcm9wcywgJ2NvbnN0cnVjdG9yJykpIHtcbiAgICAgICAgY2hpbGQgPSBwcm90b1Byb3BzLmNvbnN0cnVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNoaWxkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gcGFyZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH07XG4gICAgfVxuXG4gICAgLy8gQWRkIHN0YXRpYyBwcm9wZXJ0aWVzIHRvIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiwgaWYgc3VwcGxpZWQuXG4gICAgXy5leHRlbmQoY2hpbGQsIHBhcmVudCwgc3RhdGljUHJvcHMpO1xuXG4gICAgLy8gU2V0IHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gaW5oZXJpdCBmcm9tIGBwYXJlbnRgLCB3aXRob3V0IGNhbGxpbmdcbiAgICAvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgIHZhciBTdXJyb2dhdGUgPSBmdW5jdGlvbiAoKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfTtcbiAgICBTdXJyb2dhdGUucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBuZXcgU3Vycm9nYXRlKCk7XG5cbiAgICAvLyBBZGQgcHJvdG90eXBlIHByb3BlcnRpZXMgKGluc3RhbmNlIHByb3BlcnRpZXMpIHRvIHRoZSBzdWJjbGFzcyxcbiAgICAvLyBpZiBzdXBwbGllZC5cbiAgICBpZiAocHJvdG9Qcm9wcykge1xuICAgICAgICBfLmV4dGVuZChjaGlsZC5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIH1cblxuICAgIC8vIFNldCBhIGNvbnZlbmllbmNlIHByb3BlcnR5IGluIGNhc2UgdGhlIHBhcmVudCdzIHByb3RvdHlwZSBpcyBuZWVkZWRcbiAgICAvLyBsYXRlci5cbiAgICBjaGlsZC5fX3N1cGVyX18gPSBwYXJlbnQucHJvdG90eXBlO1xuXG4gICAgcmV0dXJuIGNoaWxkO1xufTtcblxudmFyIFZpZXcgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHRoaXMuJGVsID0gJChvcHRpb25zLmVsKTtcbiAgICB0aGlzLmVsID0gb3B0aW9ucy5lbDtcbiAgICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxufTtcblxuXy5leHRlbmQoVmlldy5wcm90b3R5cGUsIHtcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7fSxcbn0pO1xuXG5WaWV3LmV4dGVuZCA9IGV4dGVuZDtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIl19
;