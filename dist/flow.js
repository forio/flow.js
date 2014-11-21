/**

++++++++   ++++++++   ++++++++           Flow.js
++++++++   ,+++++++~   ++++++++          v0.8.1
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
window.Flow.version = '0.8.1'; //populated by grunt

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

},{}],12:[function(require,module,exports){
'use strict';

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
            }
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
            if (!subscriber.on) {
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

},{"./string-converter":13,"./array-converter":14,"./number-converter":15,"./numberformat-converter":16}],6:[function(require,module,exports){
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


},{"./no-op-attr":20,"./events/init-event-attr":21,"./events/default-event-attr":22,"./binds/checkbox-radio-bind-attr":23,"./binds/input-bind-attr":24,"./class-attr":25,"./positive-boolean-attr":26,"./negative-boolean-attr":27,"./binds/default-bind-attr":28,"./default-attr":29}],11:[function(require,module,exports){
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
                listener.target.trigger(config.events.react, params);
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
            //TODO: subscriber can be a function
            if (!subscriber.on) {
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

},{"../config":5}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
'use strict';
module.exports = {
    alias: 'i',
    convert: function (value) {
        return parseFloat(value, 10);
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9hcHAuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZmxvdy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vZG9tLW1hbmFnZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY2hhbm5lbHMvcnVuLWNoYW5uZWwuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29uZmlnLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL3V0aWxzL3BhcnNlLXV0aWxzLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jaGFubmVscy9vcGVyYXRpb25zLWNoYW5uZWwuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvbm9kZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbnZlcnRlcnMvc3RyaW5nLWNvbnZlcnRlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jb252ZXJ0ZXJzL2FycmF5LWNvbnZlcnRlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jb252ZXJ0ZXJzL251bWJlci1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2luaXQtZXZlbnQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9wb3NpdGl2ZS1ib29sZWFuLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2RlZmF1bHQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvaW5wdXQtY2hlY2tib3gtbm9kZS5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL25vZGVzL2Jhc2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsid2luZG93LkZsb3cgPSByZXF1aXJlKCcuL2Zsb3cuanMnKTtcbndpbmRvdy5GbG93LnZlcnNpb24gPSAnPCU9IHZlcnNpb24gJT4nOyAvL3BvcHVsYXRlZCBieSBncnVudFxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZG9tTWFuYWdlciA9IHJlcXVpcmUoJy4vZG9tL2RvbS1tYW5hZ2VyJyk7XG52YXIgQ2hhbm5lbCA9IHJlcXVpcmUoJy4vY2hhbm5lbHMvcnVuLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZG9tOiBkb21NYW5hZ2VyLFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICB2YXIgbW9kZWwgPSAkKCdib2R5JykuZGF0YSgnZi1tb2RlbCcpO1xuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICAgICAgICBydW46IHtcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudDogJycsXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3Q6ICcnLFxuICAgICAgICAgICAgICAgICAgICBtb2RlbDogbW9kZWwsXG5cbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvbToge1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25maWcpO1xuICAgICAgICBpZiAoY29uZmlnICYmIGNvbmZpZy5jaGFubmVsICYmIChjb25maWcuY2hhbm5lbCBpbnN0YW5jZW9mIENoYW5uZWwpKSB7XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwgPSBjb25maWcuY2hhbm5lbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IG5ldyBDaGFubmVsKG9wdGlvbnMuY2hhbm5lbCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgJHJvb3QgPSAkKG9wdGlvbnMuZG9tLnJvb3QpO1xuICAgICAgICB2YXIgaW5pdEZuID0gJHJvb3QuZGF0YSgnZi1vbi1pbml0Jyk7XG4gICAgICAgIHZhciBvcG5TaWxlbnQgPSBvcHRpb25zLmNoYW5uZWwucnVuLm9wZXJhdGlvbnMuc2lsZW50O1xuICAgICAgICB2YXIgaXNJbml0T3BlcmF0aW9uU2lsZW50ID0gaW5pdEZuICYmIChvcG5TaWxlbnQgPT09IHRydWUgfHwgKF8uaXNBcnJheShvcG5TaWxlbnQpICYmIF8uY29udGFpbnMob3BuU2lsZW50LCBpbml0Rm4pKSk7XG4gICAgICAgIHZhciBwcmVGZXRjaFZhcmlhYmxlcyA9ICFpbml0Rm4gfHwgaXNJbml0T3BlcmF0aW9uU2lsZW50O1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgIGlmIChwcmVGZXRjaFZhcmlhYmxlcykge1xuICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLmRvbXJlYWR5Jykub24oJ2YuZG9tcmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbWUuY2hhbm5lbC52YXJpYWJsZXMucmVmcmVzaChudWxsLCB0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tTWFuYWdlci5pbml0aWFsaXplKCQuZXh0ZW5kKHRydWUsIHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHRoaXMuY2hhbm5lbFxuICAgICAgICB9LCBvcHRpb25zLmRvbSkpO1xuICAgIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiAoKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxuICAgIHZhciBub2RlTWFuYWdlciA9IHJlcXVpcmUoJy4vbm9kZXMvbm9kZS1tYW5hZ2VyJyk7XG4gICAgdmFyIGF0dHJNYW5hZ2VyID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyJyk7XG4gICAgdmFyIGNvbnZlcnRlck1hbmFnZXIgPSByZXF1aXJlKCcuLi9jb252ZXJ0ZXJzL2NvbnZlcnRlci1tYW5hZ2VyJyk7XG5cbiAgICB2YXIgcGFyc2VVdGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3BhcnNlLXV0aWxzJyk7XG4gICAgdmFyIGRvbVV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvZG9tJyk7XG5cbiAgICAvL0pxdWVyeSBzZWxlY3RvciB0byByZXR1cm4gZXZlcnl0aGluZyB3aGljaCBoYXMgYSBmLSBwcm9wZXJ0eSBzZXRcbiAgICAkLmV4cHJbJzonXVtjb25maWcucHJlZml4XSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyICR0aGlzID0gJChvYmopO1xuICAgICAgICB2YXIgZGF0YXByb3BzID0gXy5rZXlzKCR0aGlzLmRhdGEoKSk7XG5cbiAgICAgICAgdmFyIG1hdGNoID0gXy5maW5kKGRhdGFwcm9wcywgZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKGNvbmZpZy5wcmVmaXgpID09PSAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuICEhKG1hdGNoKTtcbiAgICB9O1xuXG4gICAgJC5leHByWyc6J10ud2ViY29tcG9uZW50ID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICByZXR1cm4gb2JqLm5vZGVOYW1lLmluZGV4T2YoJy0nKSAhPT0gLTE7XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG5cbiAgICAgICAgbm9kZXM6IG5vZGVNYW5hZ2VyLFxuICAgICAgICBhdHRyaWJ1dGVzOiBhdHRyTWFuYWdlcixcbiAgICAgICAgY29udmVydGVyczogY29udmVydGVyTWFuYWdlcixcbiAgICAgICAgLy91dGlscyBmb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBtYXRjaGVkRWxlbWVudHM6IFtdXG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICByb290OiAnYm9keScsXG4gICAgICAgICAgICAgICAgY2hhbm5lbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICQuZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBkZWZhdWx0cy5jaGFubmVsO1xuXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSBkZWZhdWx0cztcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZhciAkcm9vdCA9ICQoZGVmYXVsdHMucm9vdCk7XG4gICAgICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvL3BhcnNlIHRocm91Z2ggZG9tIGFuZCBmaW5kIGV2ZXJ5dGhpbmcgd2l0aCBtYXRjaGluZyBhdHRyaWJ1dGVzXG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoZWRFbGVtZW50cyA9ICRyb290LmZpbmQoJzonICsgY29uZmlnLnByZWZpeCk7XG4gICAgICAgICAgICAgICAgaWYgKCRyb290LmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRFbGVtZW50cyA9IG1hdGNoZWRFbGVtZW50cy5hZGQoJChkZWZhdWx0cy5yb290KSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbWUucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMgPSBtYXRjaGVkRWxlbWVudHM7XG5cbiAgICAgICAgICAgICAgICAkLmVhY2gobWF0Y2hlZEVsZW1lbnRzLCBmdW5jdGlvbiAoaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBIYW5kbGVyID0gbm9kZU1hbmFnZXIuZ2V0SGFuZGxlcigkZWwpO1xuICAgICAgICAgICAgICAgICAgICBuZXcgSGFuZGxlci5oYW5kbGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgZWw6IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFyTWFwID0gJGVsLmRhdGEoJ3ZhcmlhYmxlLWF0dHItbWFwJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFyTWFwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJNYXAgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vTk9URTogbG9vcGluZyB0aHJvdWdoIGF0dHJpYnV0ZXMgaW5zdGVhZCBvZiAuZGF0YSBiZWNhdXNlIC5kYXRhIGF1dG9tYXRpY2FsbHkgY2FtZWxjYXNlcyBwcm9wZXJ0aWVzIGFuZCBtYWtlIGl0IGhhcmQgdG8gcmV0cnZpZXZlXG4gICAgICAgICAgICAgICAgICAgICAgICAkKGVsZW1lbnQuYXR0cmlidXRlcykuZWFjaChmdW5jdGlvbiAoaW5kZXgsIG5vZGVNYXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IG5vZGVNYXAubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJWYWwgPSBub2RlTWFwLnZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdhbnRlZFByZWZpeCA9ICdkYXRhLWYtJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ci5pbmRleE9mKHdhbnRlZFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSh3YW50ZWRQcmVmaXgsICcnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIoYXR0ciwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQmluZGFibGVBdHRyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5pbml0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0JpbmRhYmxlQXR0ciA9IGhhbmRsZXIuaW5pdC5jYWxsKCRlbCwgYXR0ciwgYXR0clZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNCaW5kYWJsZUF0dHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQ29udmVydCBwaXBlcyB0byBjb252ZXJ0ZXIgYXR0cnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aXRoQ29udiA9IF8uaW52b2tlKGF0dHJWYWwuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3aXRoQ29udi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0clZhbCA9IHdpdGhDb252LnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ2YtY29udmVydGVycy0nICsgYXR0ciwgd2l0aENvbnYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29tbWFSZWdleCA9IC8sKD8hW15cXFtdKlxcXSkvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJWYWwuc3BsaXQoY29tbWFSZWdleCkubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ET1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRyaWdnZXJlcnMgPSB0cmlnZ2VyZXJzLmNvbmNhdCh2YWwuc3BsaXQoJywnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhck1hcFthdHRyVmFsXSA9IGF0dHI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbC5kYXRhKCd2YXJpYWJsZS1hdHRyLW1hcCcsIHZhck1hcCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgc3Vic2NyaWJhYmxlID0gT2JqZWN0LmtleXModmFyTWFwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1YnNjcmliYWJsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5uZWwudmFyaWFibGVzLnN1YnNjcmliZShPYmplY3Qua2V5cyh2YXJNYXApLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJHJvb3QudHJpZ2dlcignZi5kb21yZWFkeScpO1xuXG4gICAgICAgICAgICAgICAgLy9BdHRhY2ggbGlzdGVuZXJzXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciBjaGFuZ2VzIGZyb20gYXBpIGFuZCB1cGRhdGUgdWlcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy5yZWFjdCkub24oY29uZmlnLmV2ZW50cy5yZWFjdCwgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhldnQudGFyZ2V0LCBkYXRhLCBcInJvb3Qgb25cIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFybWFwID0gJGVsLmRhdGEoJ3ZhcmlhYmxlLWF0dHItbWFwJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnZlcnRpYmxlID0ge307XG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbiAodmFyaWFibGVOYW1lLCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByb3BlcnR5VG9VcGRhdGUgPSB2YXJtYXBbdmFyaWFibGVOYW1lLnRyaW0oKV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlUb1VwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnRpYmxlW3Byb3BlcnR5VG9VcGRhdGVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAkZWwudHJpZ2dlcignZi5jb252ZXJ0JywgY29udmVydGlibGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTGlzdGVuIGZvciBjaGFuZ2VzIHRvIHVpIGFuZCBwdWJsaXNoIHRvIGFwaVxuICAgICAgICAgICAgICAgICRyb290Lm9mZihjb25maWcuZXZlbnRzLnRyaWdnZXIpLm9uKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyc2VkRGF0YSA9IHt9OyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcblxuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gIGRvbVV0aWxzLmdldENvbnZlcnRlcnNMaXN0KCRlbCwgJ2JpbmQnKTtcblxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXkgPSBrZXkuc3BsaXQoJ3wnKVswXS50cmltKCk7IC8vaW4gY2FzZSB0aGUgcGlwZSBmb3JtYXR0aW5nIHN5bnRheCB3YXMgdXNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gY29udmVydGVyTWFuYWdlci5wYXJzZSh2YWwsIGF0dHJDb252ZXJ0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGFba2V5XSA9IHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodmFsKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJGVsLnRyaWdnZXIoJ2YuY29udmVydCcsIHsgYmluZDogdmFsIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLnZhcmlhYmxlcy5wdWJsaXNoKHBhcnNlZERhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gZGF0YSA9IHtwcm9wdG91cGRhdGU6IHZhbHVlfVxuICAgICAgICAgICAgICAgICRyb290Lm9mZignZi5jb252ZXJ0Jykub24oJ2YuY29udmVydCcsIGZ1bmN0aW9uIChldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ID0gZnVuY3Rpb24gKHZhbCwgcHJvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcCA9IHByb3AudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICBkb21VdGlscy5nZXRDb252ZXJ0ZXJzTGlzdCgkZWwsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKHByb3AsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydGVkVmFsdWUgPSBjb252ZXJ0ZXJNYW5hZ2VyLmNvbnZlcnQodmFsLCBhdHRyQ29udmVydGVycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLmhhbmRsZS5jYWxsKCRlbCwgY29udmVydGVkVmFsdWUsIHByb3ApO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLCBjb252ZXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnQoZGF0YSwgJ2JpbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLnVpLm9wZXJhdGUnKS5vbignZi51aS5vcGVyYXRlJywgZnVuY3Rpb24gKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gJC5leHRlbmQodHJ1ZSwge30sIGRhdGEpOyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEub3BlcmF0aW9ucywgZnVuY3Rpb24gKG9wbikge1xuICAgICAgICAgICAgICAgICAgICAgICBvcG4ucGFyYW1zID0gXy5tYXAob3BuLnBhcmFtcywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUoJC50cmltKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59KCkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmFyc0NoYW5uZWwgPSByZXF1aXJlKCcuL3ZhcmlhYmxlcy1jaGFubmVsJyk7XG52YXIgT3BlcmF0aW9uc0NoYW5uZWwgPSByZXF1aXJlKCcuL29wZXJhdGlvbnMtY2hhbm5lbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICBydW46IHtcbiAgICAgICAgICAgIHZhcmlhYmxlczoge1xuXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3BlcmF0aW9uczoge1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBjb25maWcgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgdmFyIHJtID0gbmV3IEYubWFuYWdlci5SdW5NYW5hZ2VyKGNvbmZpZyk7XG4gICAgdmFyIHJzID0gcm0ucnVuO1xuXG4gICAgdmFyICRjcmVhdGlvblByb21pc2UgPSBybS5nZXRSdW4oKTtcbiAgICBycy5jdXJyZW50UHJvbWlzZSA9ICRjcmVhdGlvblByb21pc2U7XG5cbiAgICB2YXIgY3JlYXRlQW5kVGhlbiA9IGZ1bmN0aW9uIChmbiwgY29udGV4dCkge1xuICAgICAgICByZXR1cm4gXy53cmFwKGZuLCBmdW5jdGlvbiAoZnVuYykge1xuICAgICAgICAgICAgdmFyIHBhc3NlZEluUGFyYW1zID0gXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMSk7XG4gICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcnMuY3VycmVudFByb21pc2UgPSBmdW5jLmFwcGx5KGNvbnRleHQsIHBhc3NlZEluUGFyYW1zKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vTWFrZSBzdXJlIG5vdGhpbmcgaGFwcGVucyBiZWZvcmUgdGhlIHJ1biBpcyBjcmVhdGVkXG4gICAgXy5lYWNoKHJzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkgJiYgbmFtZSAhPT0gJ3ZhcmlhYmxlcycgICYmIG5hbWUgIT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgICByc1tuYW1lXSA9IGNyZWF0ZUFuZFRoZW4odmFsdWUsIHJzKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIG9yaWdpbmFsVmFyaWFibGVzRm4gPSBycy52YXJpYWJsZXM7XG4gICAgcnMudmFyaWFibGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdnMgPSBvcmlnaW5hbFZhcmlhYmxlc0ZuLmFwcGx5KHJzLCBhcmd1bWVudHMpO1xuICAgICAgICBfLmVhY2godnMsIGZ1bmN0aW9uICh2YWx1ZSwgbmFtZSkge1xuICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2c1tuYW1lXSA9IGNyZWF0ZUFuZFRoZW4odmFsdWUsIHZzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB2cztcbiAgICB9O1xuXG4gICAgdGhpcy5ydW4gPSBycztcbiAgICB0aGlzLnZhcmlhYmxlcyA9IG5ldyBWYXJzQ2hhbm5lbCgkLmV4dGVuZCh0cnVlLCB7fSwgY29uZmlnLnJ1bi52YXJpYWJsZXMsIHsgcnVuOiBycywgdmVudDogdGhpcyB9KSk7XG4gICAgdGhpcy5vcGVyYXRpb25zID0gbmV3IE9wZXJhdGlvbnNDaGFubmVsKCQuZXh0ZW5kKHRydWUsIHt9LCBjb25maWcucnVuLm9wZXJhdGlvbnMsIHsgcnVuOiBycywgdmVudDogdGhpcyB9KSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJlZml4OiAnZicsXG4gICAgZGVmYXVsdEF0dHI6ICdiaW5kJyxcblxuICAgIGJpbmRlckF0dHI6ICdmLWJpbmQnLFxuXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIHRyaWdnZXI6ICd1cGRhdGUuZi51aScsXG4gICAgICAgIHJlYWN0OiAndXBkYXRlLmYubW9kZWwnXG4gICAgfVxuXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRvSW1wbGljaXRUeXBlOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB2YXIgcmJyYWNlID0gL14oPzpcXHsuKlxcfXxcXFsuKlxcXSkkLztcbiAgICAgICAgdmFyIGNvbnZlcnRlZCA9IGRhdGE7XG4gICAgICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSAnJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1xcJycgfHwgY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGRhdGEuc3Vic3RyaW5nKDEsIGRhdGEubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCQuaXNOdW1lcmljKGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gK2RhdGE7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJicmFjZS50ZXN0KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPOiBUaGlzIG9ubHkgd29ya3Mgd2l0aCBkb3VibGUgcXVvdGVzLCBpLmUuLCBbMSxcIjJcIl0gd29ya3MgYnV0IG5vdCBbMSwnMiddXG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJC5wYXJzZUpTT04oZGF0YSkgO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZWQ7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBtYXRjaDogZnVuY3Rpb24gKG1hdGNoRXhwciwgbWF0Y2hWYWx1ZSwgY29udGV4dCkge1xuICAgICAgICBpZiAoXy5pc1N0cmluZyhtYXRjaEV4cHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gKG1hdGNoRXhwciA9PT0gJyonIHx8IChtYXRjaEV4cHIudG9Mb3dlckNhc2UoKSA9PT0gbWF0Y2hWYWx1ZS50b0xvd2VyQ2FzZSgpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKG1hdGNoRXhwcikpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaEV4cHIobWF0Y2hWYWx1ZSwgY29udGV4dCk7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1JlZ0V4cChtYXRjaEV4cHIpKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hWYWx1ZS5tYXRjaChtYXRjaEV4cHIpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGdldENvbnZlcnRlcnNMaXN0OiBmdW5jdGlvbiAoJGVsLCBwcm9wZXJ0eSkge1xuICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0ZXJzLScgKyBwcm9wZXJ0eSk7XG5cbiAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycyAmJiBwcm9wZXJ0eSA9PT0gJ2JpbmQnKSB7XG4gICAgICAgICAgICAvL09ubHkgYmluZCBpbmhlcml0cyBmcm9tIHBhcmVudHNcbiAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgIHZhciAkcGFyZW50RWwgPSAkZWwuY2xvc2VzdCgnW2RhdGEtZi1jb252ZXJ0XScpO1xuICAgICAgICAgICAgICAgIGlmICgkcGFyZW50RWwpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkcGFyZW50RWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9IGF0dHJDb252ZXJ0ZXJzLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXR0ckNvbnZlcnRlcnM7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGVybWluZSB3aGVuIHRvIHVwZGF0ZSBzdGF0ZVxuICAgICAgICAgKiBAdHlwZSB7U3RyaW5nIHwgQXJyYXkgfCBPYmplY3R9IFBvc3NpYmxlIG9wdGlvbnMgYXJlXG4gICAgICAgICAqICAgICAgIC0gdHJ1ZTogbmV2ZXIgdHJpZ2dlciBhbnkgdXBkYXRlcy4gVXNlIHRoaXMgaWYgeW91IGtub3cgeW91ciBtb2RlbCBzdGF0ZSB3b24ndCBjaGFuZ2UgYmFzZWQgb24gb3BlcmF0aW9uc1xuICAgICAgICAgKiAgICAgICAtIGZhbHNlOiBhbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKiAgICAgICAtIFthcnJheSBvZiB2YXJpYWJsZSBuYW1lc106IFZhcmlhYmxlcyBpbiB0aGlzIGFycmF5IHdpbGwgbm90IHRyaWdnZXIgdXBkYXRlcywgZXZlcnl0aGluZyBlbHNlIHdpbGxcbiAgICAgICAgICogICAgICAgLSB7IGV4Y2VwdDogW2FycmF5IG9mIG9wZXJhdGlvbnNdfTogVmFyaWFibGVzIGluIHRoaXMgYXJyYXkgd2lsbCB0cmlnZ2VyIHVwZGF0ZXMsIG5vdGhpbmcgZWxzZSB3aWxsXG4gICAgICAgICAqL1xuICAgICAgICBzaWxlbnQ6IGZhbHNlXG4gICAgfTtcblxuICAgIHZhciBjaGFubmVsT3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgdmFyIHJ1biA9IGNoYW5uZWxPcHRpb25zLnJ1bjtcbiAgICB2YXIgdmVudCA9IGNoYW5uZWxPcHRpb25zLnZlbnQ7XG5cbiAgICB2YXIgcHVibGljQVBJID0ge1xuICAgICAgICAvL2ZvciB0ZXN0aW5nXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIG9wdGlvbnM6IGNoYW5uZWxPcHRpb25zXG4gICAgICAgIH0sXG5cbiAgICAgICAgbGlzdGVuZXJNYXA6IHt9LFxuXG4gICAgICAgIC8vQ2hlY2sgZm9yIHVwZGF0ZXNcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRyaWdnZXJzIHVwZGF0ZSBvbiBzaWJsaW5nIHZhcmlhYmxlcyBjaGFubmVsXG4gICAgICAgICAqIEBwYXJhbSAge3N0cmluZ3xhcnJheX0gZXhlY3V0ZWRPcG5zIG9wZXJhdGlvbnMgd2hpY2gganVzdCBoYXBwZW5lZFxuICAgICAgICAgKiBAcGFyYW0gIHsqfSByZXNwb25zZSAgcmVzcG9uc2UgZnJvbSB0aGUgb3BlcmF0aW9uXG4gICAgICAgICAqIEBwYXJhbSAge2Jvb2xlYW59IGZvcmNlICBpZ25vcmUgYWxsIHNpbGVuY2Ugb3B0aW9ucyBhbmQgZm9yY2UgcmVmcmVzaFxuICAgICAgICAgKi9cbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24gKGV4ZWN1dGVkT3BucywgcmVzcG9uc2UsIGZvcmNlKSB7XG4gICAgICAgICAgICB2YXIgc2lsZW50ID0gY2hhbm5lbE9wdGlvbnMuc2lsZW50O1xuXG4gICAgICAgICAgICB2YXIgc2hvdWxkU2lsZW5jZSA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoc2lsZW50KSAmJiBleGVjdXRlZE9wbnMpIHtcbiAgICAgICAgICAgICAgICBzaG91bGRTaWxlbmNlID0gXy5pbnRlcnNlY3Rpb24oc2lsZW50LCBleGVjdXRlZE9wbnMpLmxlbmd0aCA+PSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChzaWxlbnQpICYmIGV4ZWN1dGVkT3Bucykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBleGVjdXRlZE9wbnMpLmxlbmd0aCAhPT0gZXhlY3V0ZWRPcG5zLmxlbmd0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFzaG91bGRTaWxlbmNlIHx8IGZvcmNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJCh2ZW50KS50cmlnZ2VyKCdkaXJ0eScsIHsgb3BuOiBleGVjdXRlZE9wbnMsIHJlc3BvbnNlOiByZXNwb25zZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogT3BlcmF0aW9uIG5hbWUgJiBwYXJhbWV0ZXJzIHRvIHNlbmQgdG8gb3BlcmF0aW9ucyBBUElcbiAgICAgICAgICogQHBhcmFtICB7c3RyaW5nIHwgb2JqZWN0fSBvcGVyYXRpb24gTmFtZSBvZiBPcGVyYXRpb24uIElmIGFycmF5LCBuZWVkcyB0byBiZSBpbiB7b3BlcmF0aW9uczogW3tuYW1lOiBvcG4sIHBhcmFtczpbXX1dLCBzZXJpYWw6IGJvb2xlYW59XSBmb3JtYXRcbiAgICAgICAgICogQHBhcmFtICB7Kn0gcGFyYW1zIChvcHRpb25hbCkgICBwYXJhbXMgdG8gc2VuZCB0byBvcGVydGFpb25cbiAgICAgICAgICogQHBhcmFtIHtvcHRpb259IG9wdGlvbnMgU3VwcG9ydGVkIG9wdGlvbnM6IHtzaWxlbnQ6IEJvb2xlYW59XG4gICAgICAgICAqIEByZXR1cm4geyRwcm9taXNlfVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24gKG9wZXJhdGlvbiwgcGFyYW1zLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdChvcGVyYXRpb24pICYmIG9wZXJhdGlvbi5vcGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gKG9wZXJhdGlvbi5zZXJpYWwpID8gcnVuLnNlcmlhbCA6IHJ1bi5wYXJhbGxlbDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbChydW4sIG9wZXJhdGlvbi5vcGVyYXRpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXJhbXMgfHwgIXBhcmFtcy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBfLnBsdWNrKG9wZXJhdGlvbi5vcGVyYXRpb25zLCAnbmFtZScpLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogY2hlY2sgaWYgaW50ZXJwb2xhdGVkXG4gICAgICAgICAgICAgICAgdmFyIG9wdHMgPSAoJC5pc1BsYWluT2JqZWN0KG9wZXJhdGlvbikpID8gcGFyYW1zIDogb3B0aW9ucztcbiAgICAgICAgICAgICAgICByZXR1cm4gcnVuLmRvLmFwcGx5KHJ1biwgYXJndW1lbnRzKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb3B0cyB8fCAhb3B0cy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIFtvcGVyYXRpb25dLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ29wZXJhdGlvbnMgcHVibGlzaCcsIG9wZXJhdGlvbiwgcGFyYW1zKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uIChvcGVyYXRpb25zLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBzdWJzY3JpYmUnLCBvcGVyYXRpb25zLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIG9wZXJhdGlvbnMgPSBbXS5jb25jYXQob3BlcmF0aW9ucyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICAvL1RPRE86IHN1YnNjcmliZXIgY2FuIGJlIGEgZnVuY3Rpb25cbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbikge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC5vcGVyYXRpb24nKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICAgICQuZWFjaChvcGVyYXRpb25zLCBmdW5jdGlvbiAoaW5kZXgsIG9wbikge1xuICAgICAgICAgICAgICAgIGlmICghbWUubGlzdGVuZXJNYXBbb3BuXSkge1xuICAgICAgICAgICAgICAgICAgICBtZS5saXN0ZW5lck1hcFtvcG5dID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBtZS5saXN0ZW5lck1hcFtvcG5dLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAob3BlcmF0aW9uLCB0b2tlbikge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lck1hcFtvcGVyYXRpb25dID0gXy5yZWplY3QodGhpcy5saXN0ZW5lck1hcFtvcGVyYXRpb25dLCBmdW5jdGlvbiAoc3Vicykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWJzLmlkID09PSB0b2tlbjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICB1bnN1YnNjcmliZUFsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lck1hcCA9IHt9O1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vVE9ETzogTWFrZSBhbGwgdW5kZXJzY29yZSBmaWx0ZXJzIGF2YWlsYWJsZVxuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgLy9ub21hbGl6ZSgnZmxpcCcsIGZuKVxuICAgIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyKSkge1xuICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICBhbGlhczogYWxpYXMsXG4gICAgICAgICAgICBjb252ZXJ0OiBjb252ZXJ0ZXJcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KGNvbnZlcnRlcikgJiYgY29udmVydGVyLmNvbnZlcnQpIHtcbiAgICAgICAgY29udmVydGVyLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIHJldC5wdXNoKGNvbnZlcnRlcik7XG4gICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KGFsaWFzKSkge1xuICAgICAgICAvL25vcm1hbGl6ZSh7YWxpYXM6ICdmbGlwJywgY29udmVydDogZnVuY3Rpb259KVxuICAgICAgICBpZiAoYWxpYXMuY29udmVydCkge1xuICAgICAgICAgICAgcmV0LnB1c2goYWxpYXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbm9ybWFsaXplKHtmbGlwOiBmdW59KVxuICAgICAgICAgICAgJC5lYWNoKGFsaWFzLCBmdW5jdGlvbiAoa2V5LCB2YWwpIHtcbiAgICAgICAgICAgICAgICByZXQucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGFsaWFzOiBrZXksXG4gICAgICAgICAgICAgICAgICAgIGNvbnZlcnQ6IHZhbFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBtYXRjaENvbnZlcnRlciA9IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcoY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gYWxpYXMgPT09IGNvbnZlcnRlci5hbGlhcztcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIuYWxpYXMoYWxpYXMpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1JlZ2V4KGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5hbGlhcy5tYXRjaChhbGlhcyk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjb252ZXJ0ZXJNYW5hZ2VyID0ge1xuICAgIHByaXZhdGU6IHtcbiAgICAgICAgbWF0Y2hDb252ZXJ0ZXI6IG1hdGNoQ29udmVydGVyXG4gICAgfSxcblxuICAgIGxpc3Q6IFtdLFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgY29udmVydGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfGZ1bmN0aW9ufHJlZ2V4fSBhbGlhcyBmb3JtYXR0ZXIgbmFtZVxuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gY29udmVydGVyICAgIGNvbnZlcnRlciBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24sIHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIHZhbHVlLCBvciBhbiBvYmplY3Qgd2l0aCB7YWxpYXM6ICcnLCBwYXJzZTogJC5ub29wLCBjb252ZXJ0OiAkLm5vb3B9XG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkID0gbm9ybWFsaXplKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB0aGlzLmxpc3QgPSBub3JtYWxpemVkLmNvbmNhdCh0aGlzLmxpc3QpO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChjdXJyZW50Q29udmVydGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hDb252ZXJ0ZXIoYWxpYXMsIGN1cnJlbnRDb252ZXJ0ZXIpKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShhbGlhcywgY29udmVydGVyKVswXSk7XG4gICAgfSxcblxuICAgIGdldENvbnZlcnRlcjogZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbiAoY29udmVydGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hDb252ZXJ0ZXIoYWxpYXMsIGNvbnZlcnRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsdWUsIGxpc3QpIHtcbiAgICAgICAgaWYgKCFsaXN0IHx8ICFsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGxpc3QgPSBbXS5jb25jYXQobGlzdCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydGVyLmNvbnZlcnQoY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvdW50ZXItcGFydCB0byAnY29udmVydCcuIFRyYW5zbGF0ZXMgY29udmVydGVkIHZhbHVlcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGZvcm1cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHBhcnNlXG4gICAgICogQHBhcmFtICB7U3RyaW5nIHwgQXJyYXl9IGxpc3QgIExpc3Qgb2YgcGFyc2VycyB0byBydW4gdGhpcyB0aHJvdWdoLiBPdXRlcm1vc3QgaXMgaW52b2tlZCBmaXJzdFxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KS5yZXZlcnNlKCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKSB7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgaWYgKGNvbnZlcnRlci5wYXJzZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IGNvbnZlcnRlci5wYXJzZShjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICB9XG59O1xuXG5cbi8vQm9vdHN0cmFwXG52YXIgZGVmYXVsdGNvbnZlcnRlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9udW1iZXItY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9zdHJpbmctY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9hcnJheS1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL251bWJlcmZvcm1hdC1jb252ZXJ0ZXInKSxcbl07XG5cbiQuZWFjaChkZWZhdWx0Y29udmVydGVycy5yZXZlcnNlKCksIGZ1bmN0aW9uIChpbmRleCwgY29udmVydGVyKSB7XG4gICAgY29udmVydGVyTWFuYWdlci5yZWdpc3Rlcihjb252ZXJ0ZXIpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29udmVydGVyTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHNlbGVjdG9yID0gJyonO1xuICAgIH1cbiAgICBoYW5kbGVyLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgcmV0dXJuIGhhbmRsZXI7XG59O1xuXG52YXIgbWF0Y2ggPSBmdW5jdGlvbiAodG9NYXRjaCwgbm9kZSkge1xuICAgIGlmIChfLmlzU3RyaW5nKHRvTWF0Y2gpKSB7XG4gICAgICAgIHJldHVybiB0b01hdGNoID09PSBub2RlLnNlbGVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAkKHRvTWF0Y2gpLmlzKG5vZGUuc2VsZWN0b3IpO1xuICAgIH1cbn07XG5cbnZhciBub2RlTWFuYWdlciA9IHtcbiAgICBsaXN0OiBbXSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBub2RlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IHNlbGVjdG9yIGpRdWVyeS1jb21wYXRpYmxlIHNlbGVjdG9yIHRvIHVzZSB0byBtYXRjaCBub2Rlc1xuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyICBIYW5kbGVycyBhcmUgbmV3LWFibGUgZnVuY3Rpb25zLiBUaGV5IHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsIGFzIGNvbnRleHQuPyBUT0RPOiBUaGluayB0aGlzIHRocm91Z2hcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMubGlzdC51bnNoaWZ0KG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2goc2VsZWN0b3IsIG5vZGUpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24gKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGN1cnJlbnRIYW5kbGVyLnNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH1cbn07XG5cbi8vYm9vdHN0cmFwc1xudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL2lucHV0LWNoZWNrYm94LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJylcbl07XG5fLmVhY2goZGVmYXVsdEhhbmRsZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICBub2RlTWFuYWdlci5yZWdpc3RlcihoYW5kbGVyLnNlbGVjdG9yLCBoYW5kbGVyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vZGVNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmYXVsdEhhbmRsZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vbm8tb3AtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2luaXQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvY2hlY2tib3gtcmFkaW8tYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9pbnB1dC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2NsYXNzLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL3Bvc2l0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vbmVnYXRpdmUtYm9vbGVhbi1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1hdHRyJylcbl07XG5cbnZhciBoYW5kbGVyc0xpc3QgPSBbXTtcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgIGlmICghbm9kZU1hdGNoZXIpIHtcbiAgICAgICAgbm9kZU1hdGNoZXIgPSAnKic7XG4gICAgfVxuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gJC5leHRlbmQoaGFuZGxlciwgeyB0ZXN0OiBhdHRyaWJ1dGVNYXRjaGVyLCB0YXJnZXQ6IG5vZGVNYXRjaGVyIH0pO1xufTtcblxuJC5lYWNoKGRlZmF1bHRIYW5kbGVycywgZnVuY3Rpb24gKGluZGV4LCBoYW5kbGVyKSB7XG4gICAgaGFuZGxlcnNMaXN0LnB1c2gobm9ybWFsaXplKGhhbmRsZXIudGVzdCwgaGFuZGxlci50YXJnZXQsIGhhbmRsZXIpKTtcbn0pO1xuXG5cbnZhciBtYXRjaEF0dHIgPSBmdW5jdGlvbiAobWF0Y2hFeHByLCBhdHRyLCAkZWwpIHtcbiAgICB2YXIgYXR0ck1hdGNoO1xuXG4gICAgaWYgKF8uaXNTdHJpbmcobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBhdHRyLnRvTG93ZXJDYXNlKCkpKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihtYXRjaEV4cHIpKSB7XG4gICAgICAgIC8vVE9ETzogcmVtb3ZlIGVsZW1lbnQgc2VsZWN0b3JzIGZyb20gYXR0cmlidXRlc1xuICAgICAgICBhdHRyTWF0Y2ggPSBtYXRjaEV4cHIoYXR0ciwgJGVsKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNSZWdFeHAobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSBhdHRyLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgfVxuICAgIHJldHVybiBhdHRyTWF0Y2g7XG59O1xuXG52YXIgbWF0Y2hOb2RlID0gZnVuY3Rpb24gKHRhcmdldCwgbm9kZUZpbHRlcikge1xuICAgIHJldHVybiAoXy5pc1N0cmluZyhub2RlRmlsdGVyKSkgPyAobm9kZUZpbHRlciA9PT0gdGFyZ2V0KSA6IG5vZGVGaWx0ZXIuaXModGFyZ2V0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGhhbmRsZXJzTGlzdCxcbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgYXR0cmlidXRlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd8ZnVuY3Rpb258cmVnZXh9IGF0dHJpYnV0ZU1hdGNoZXIgRGVzY3JpcHRpb24gb2Ygd2hpY2ggYXR0cmlidXRlcyB0byBtYXRjaFxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gbm9kZU1hdGNoZXIgICAgICBXaGljaCBub2RlcyB0byBhbGwgYXR0cmlidXRlcyB0by4gVXNlIGpxdWVyeSBTZWxlY3RvciBzeW50YXhcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbnxvYmplY3R9IGhhbmRsZXIgICAgSGFuZGxlciBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24gKFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aXRoICRlbGVtZW50IGFzIGNvbnRleHQsIGFuZCBhdHRyaWJ1dGUgdmFsdWUgKyBuYW1lKSwgb3IgYW4gb2JqZWN0IHdpdGgge2luaXQ6IGZuLCAgaGFuZGxlOiBmbn0uIFRoZSBpbml0IGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW4gcGFnZSBsb2FkczsgdXNlIHRoaXMgdG8gZGVmaW5lIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVyc0xpc3QudW5zaGlmdChub3JtYWxpemUuYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZpbmQgYW4gYXR0cmlidXRlIG1hdGNoZXIgbWF0Y2hpbmcgc29tZSBjcml0ZXJpYVxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gYXR0ckZpbHRlciBhdHRyaWJ1dGUgdG8gbWF0Y2hcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmcgfCAkZWx9IG5vZGVGaWx0ZXIgbm9kZSB0byBtYXRjaFxuICAgICAqIEByZXR1cm4ge2FycmF5fG51bGx9XG4gICAgICovXG4gICAgZmlsdGVyOiBmdW5jdGlvbiAoYXR0ckZpbHRlciwgbm9kZUZpbHRlcikge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSBfLnNlbGVjdChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hBdHRyKGhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobm9kZUZpbHRlcikge1xuICAgICAgICAgICAgZmlsdGVyZWQgPSBfLnNlbGVjdChmaWx0ZXJlZCwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hOb2RlKGhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24gKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2goaGFuZGxlcnNMaXN0LCBmdW5jdGlvbiAoY3VycmVudEhhbmRsZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEF0dHIoY3VycmVudEhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcikgJiYgbWF0Y2hOb2RlKGN1cnJlbnRIYW5kbGVyLnRhcmdldCwgbm9kZUZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaGFuZGxlcnNMaXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpKTtcbiAgICB9LFxuXG4gICAgZ2V0SGFuZGxlcjogZnVuY3Rpb24gKHByb3BlcnR5LCAkZWwpIHtcbiAgICAgICAgdmFyIGZpbHRlcmVkID0gdGhpcy5maWx0ZXIocHJvcGVydHksICRlbCk7XG4gICAgICAgIC8vVGhlcmUgY291bGQgYmUgbXVsdGlwbGUgbWF0Y2hlcywgYnV0IHRoZSB0b3AgZmlyc3QgaGFzIHRoZSBtb3N0IHByaW9yaXR5XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZFswXTtcbiAgICB9XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRlcm1pbmUgd2hlbiB0byB1cGRhdGUgc3RhdGVcbiAgICAgICAgICogQHR5cGUge1N0cmluZyB8IEFycmF5IHwgT2JqZWN0fSBQb3NzaWJsZSBvcHRpb25zIGFyZVxuICAgICAgICAgKiAgICAgICAtIHRydWU6IG5ldmVyIHRyaWdnZXIgYW55IHVwZGF0ZXMuIFVzZSB0aGlzIGlmIHlvdSBrbm93IHlvdXIgbW9kZWwgc3RhdGUgd29uJ3QgY2hhbmdlIGJhc2VkIG9uIG90aGVyIHZhcmlhYmxlc1xuICAgICAgICAgKiAgICAgICAtIGZhbHNlOiBhbHdheXMgdHJpZ2dlciB1cGRhdGVzLlxuICAgICAgICAgKiAgICAgICAtIFthcnJheSBvZiB2YXJpYWJsZSBuYW1lc106IFZhcmlhYmxlcyBpbiB0aGlzIGFycmF5IHdpbGwgbm90IHRyaWdnZXIgdXBkYXRlcywgZXZlcnl0aGluZyBlbHNlIHdpbGxcbiAgICAgICAgICogICAgICAgLSB7IGV4Y2VwdDogW2FycmF5IG9mIHZhcmlhYmxlc119OiBWYXJpYWJsZXMgaW4gdGhpcyBhcnJheSB3aWxsIHRyaWdnZXIgdXBkYXRlcywgbm90aGluZyBlbHNlIHdpbGxcbiAgICAgICAgICovXG4gICAgICAgIHNpbGVudDogZmFsc2VcbiAgICB9O1xuXG4gICAgdmFyIGNoYW5uZWxPcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICB2YXIgdnMgPSBjaGFubmVsT3B0aW9ucy5ydW4udmFyaWFibGVzKCk7XG4gICAgdmFyIHZlbnQgPSBjaGFubmVsT3B0aW9ucy52ZW50O1xuXG4gICAgdmFyIGN1cnJlbnREYXRhID0ge307XG5cbiAgICAvL1RPRE86IGFjdHVhbGx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgc28gb25cbiAgICB2YXIgaXNFcXVhbCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIGdldElubmVyVmFyaWFibGVzID0gZnVuY3Rpb24gKHN0cikge1xuICAgICAgICB2YXIgaW5uZXIgPSBzdHIubWF0Y2goLzwoLio/KT4vZyk7XG4gICAgICAgIGlubmVyID0gXy5tYXAoaW5uZXIsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWwuc3Vic3RyaW5nKDEsIHZhbC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpbm5lcjtcbiAgICB9O1xuXG4gICAgLy9SZXBsYWNlcyBzdHViYmVkIG91dCBrZXluYW1lcyBpbiB2YXJpYWJsZXN0b2ludGVycG9sYXRlIHdpdGggdGhlaXIgY29ycmVzcG9uZGluZyB2YWx1ZXNcbiAgICB2YXIgaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAodmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgdmFsdWVzKSB7XG4gICAgICAgIC8ve3ByaWNlWzFdOiBwcmljZVs8dGltZT5dfVxuICAgICAgICB2YXIgaW50ZXJwb2xhdGlvbk1hcCA9IHt9O1xuICAgICAgICAvL3twcmljZVsxXTogMX1cbiAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IHt9O1xuXG4gICAgICAgIF8uZWFjaCh2YXJpYWJsZXNUb0ludGVycG9sYXRlLCBmdW5jdGlvbiAodmFsLCBvdXRlclZhcmlhYmxlKSB7XG4gICAgICAgICAgICB2YXIgaW5uZXIgPSBnZXRJbm5lclZhcmlhYmxlcyhvdXRlclZhcmlhYmxlKTtcbiAgICAgICAgICAgIGlmIChpbm5lciAmJiBpbm5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3JpZ2luYWxPdXRlciA9IG91dGVyVmFyaWFibGU7XG4gICAgICAgICAgICAgICAgJC5lYWNoKGlubmVyLCBmdW5jdGlvbiAoaW5kZXgsIGlubmVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXN2YWwgPSB2YWx1ZXNbaW5uZXJWYXJpYWJsZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzdmFsICE9PSBudWxsICYmIHRoaXN2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0aGlzdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vRm9yIGFycmF5ZWQgdGhpbmdzIGdldCB0aGUgbGFzdCBvbmUgZm9yIGludGVycG9sYXRpb24gcHVycG9zZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzdmFsID0gdGhpc3ZhbFt0aGlzdmFsLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBSZWdleCB0byBtYXRjaCBzcGFjZXMgYW5kIHNvIG9uXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRlclZhcmlhYmxlID0gb3V0ZXJWYXJpYWJsZS5yZXBsYWNlKCc8JyArIGlubmVyVmFyaWFibGUgKyAnPicsIHRoaXN2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSA9IChpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdKSA/IFtvcmlnaW5hbE91dGVyXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSkgOiBvcmlnaW5hbE91dGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW50ZXJwb2xhdGVkW291dGVyVmFyaWFibGVdID0gdmFsO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkOiBpbnRlcnBvbGF0ZWQsXG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwOiBpbnRlcnBvbGF0aW9uTWFwXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgZ2V0SW5uZXJWYXJpYWJsZXM6IGdldElubmVyVmFyaWFibGVzLFxuICAgICAgICAgICAgaW50ZXJwb2xhdGU6IGludGVycG9sYXRlLFxuICAgICAgICAgICAgb3B0aW9uczogY2hhbm5lbE9wdGlvbnNcbiAgICAgICAgfSxcblxuICAgICAgICAvL0ludGVycG9sYXRlZCB2YXJpYWJsZXMgd2hpY2ggbmVlZCB0byBiZSByZXNvbHZlZCBiZWZvcmUgdGhlIG91dGVyIG9uZXMgY2FuIGJlXG4gICAgICAgIGlubmVyVmFyaWFibGVzTGlzdDogW10sXG4gICAgICAgIHZhcmlhYmxlTGlzdGVuZXJNYXA6IHt9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVjayBhbmQgbm90aWZ5IGFsbCBsaXN0ZW5lcnNcbiAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBjaGFuZ2VPYmoga2V5LXZhbHVlIHBhaXJzIG9mIGNoYW5nZWQgdmFyaWFibGVzXG4gICAgICAgICAqL1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbiAoY2hhbmdlT2JqLCBmb3JjZSkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZhciBzaWxlbnQgPSBjaGFubmVsT3B0aW9ucy5zaWxlbnQ7XG4gICAgICAgICAgICB2YXIgY2hhbmdlZFZhcmlhYmxlcyA9IF8ua2V5cyhjaGFuZ2VPYmopO1xuXG4gICAgICAgICAgICB2YXIgc2hvdWxkU2lsZW5jZSA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoc2lsZW50KSAmJiBjaGFuZ2VkVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgc2hvdWxkU2lsZW5jZSA9IF8uaW50ZXJzZWN0aW9uKHNpbGVudCwgY2hhbmdlZFZhcmlhYmxlcykubGVuZ3RoID49IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHNpbGVudCkgJiYgY2hhbmdlZFZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgIHNob3VsZFNpbGVuY2UgPSBfLmludGVyc2VjdGlvbihzaWxlbnQuZXhjZXB0LCBjaGFuZ2VkVmFyaWFibGVzKS5sZW5ndGggIT09IGNoYW5nZWRWYXJpYWJsZXMubGVuZ3RoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2hvdWxkU2lsZW5jZSAmJiBmb3JjZSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkLkRlZmVycmVkKCkucmVzb2x2ZSgpLnByb21pc2UoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGdldFZhcmlhYmxlcyA9IGZ1bmN0aW9uICh2YXJzLCBpbnRlcnBvbGF0aW9uTWFwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KHZhcnMpLnRoZW4oZnVuY3Rpb24gKHZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnR290IHZhcmlhYmxlcycsIHZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaCh2YXJpYWJsZXMsIGZ1bmN0aW9uICh2YWx1ZSwgdm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGN1cnJlbnREYXRhW3ZuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNFcXVhbCh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudERhdGFbdm5hbWVdID0gdmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWUudmFyaWFibGVMaXN0ZW5lck1hcFt2bmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9pcyBhbnlvbmUgbGlzZW50aW5nIGZvciB0aGlzIHZhbHVlIGV4cGxpY2l0bHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUubm90aWZ5KHZuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlcnBvbGF0aW9uTWFwICYmIGludGVycG9sYXRpb25NYXBbdm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtYXAgPSBbXS5jb25jYXQoaW50ZXJwb2xhdGlvbk1hcFt2bmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2gobWFwLCBmdW5jdGlvbiAoaW50ZXJwb2xhdGVkTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lLnZhcmlhYmxlTGlzdGVuZXJNYXBbaW50ZXJwb2xhdGVkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2lzIGFueW9uZSBsaXNlbnRpbmcgZm9yIHRoZSBpbnRlcnBvbGF0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5ub3RpZnkoaW50ZXJwb2xhdGVkTmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChtZS5pbm5lclZhcmlhYmxlc0xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KG1lLmlubmVyVmFyaWFibGVzTGlzdCkudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW5uZXInLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpcCA9ICBpbnRlcnBvbGF0ZShtZS52YXJpYWJsZUxpc3RlbmVyTWFwLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvdXRlciA9IF8ua2V5cyhpcC5pbnRlcnBvbGF0ZWQpO1xuICAgICAgICAgICAgICAgICAgICBnZXRWYXJpYWJsZXMob3V0ZXIsIGlwLmludGVycG9sYXRpb25NYXApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VmFyaWFibGVzKF8ua2V5cyhtZS52YXJpYWJsZUxpc3RlbmVyTWFwKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSxcblxuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uICh2YXJpYWJsZSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXBbdmFyaWFibGVdO1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW3ZhcmlhYmxlXSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci50YXJnZXQudHJpZ2dlcihjb25maWcuZXZlbnRzLnJlYWN0LCBwYXJhbXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZhcmlhYmxlIG5hbWUgJiBwYXJhbWV0ZXJzIHRvIHNlbmQgdmFyaWFibGVzIEFQSVxuICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmcgfCBvYmplY3R9IHZhcmlhYmxlIHN0cmluZyBvciB7dmFyaWFibGVuYW1lOiB2YWx1ZX1cbiAgICAgICAgICogQHBhcmFtICB7Kn0gdmFsdWUgKG9wdGlvbmFsKSAgIHZhbHVlIG9mIHZhcmlhYmxlIGlmIHByZXZpb3VzIGFyZyB3YXMgYSBzdHJpbmdcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgU3VwcG9ydGVkIG9wdGlvbnM6IHtzaWxlbnQ6IEJvb2xlYW59XG4gICAgICAgICAqIEByZXR1cm4geyRwcm9taXNlfVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24gKHZhcmlhYmxlLCB2YWx1ZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3B1Ymxpc2gnLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgaWYgaW50ZXJwb2xhdGVkXG4gICAgICAgICAgICB2YXIgYXR0cnM7XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHZhcmlhYmxlKSkge1xuICAgICAgICAgICAgICAgIGF0dHJzID0gdmFyaWFibGU7XG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAoYXR0cnMgPSB7fSlbdmFyaWFibGVdID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW50ZXJwb2xhdGVkID0gaW50ZXJwb2xhdGUoYXR0cnMsIGN1cnJlbnREYXRhKS5pbnRlcnBvbGF0ZWQ7XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICB2cy5zYXZlLmNhbGwodnMsIGludGVycG9sYXRlZClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghb3B0aW9ucyB8fCAhb3B0aW9ucy5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgYXR0cnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbiAocHJvcGVydGllcywgc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3N1YnNjcmliaW5nJywgcHJvcGVydGllcywgc3Vic2NyaWJlcik7XG5cbiAgICAgICAgICAgIHByb3BlcnRpZXMgPSBbXS5jb25jYXQocHJvcGVydGllcyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICAvL1RPRE86IHN1YnNjcmliZXIgY2FuIGJlIGEgZnVuY3Rpb25cbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbikge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC52YXJpYWJsZScpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHRhcmdldDogc3Vic2NyaWJlclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgICQuZWFjaChwcm9wZXJ0aWVzLCBmdW5jdGlvbiAoaW5kZXgsIHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXMocHJvcGVydHkpO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWUuaW5uZXJWYXJpYWJsZXNMaXN0ID0gbWUuaW5uZXJWYXJpYWJsZXNMaXN0LmNvbmNhdChpbm5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1lLmlubmVyVmFyaWFibGVzTGlzdCA9IF8udW5pcShtZS5pbm5lclZhcmlhYmxlc0xpc3QpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFtZS52YXJpYWJsZUxpc3RlbmVyTWFwW3Byb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgICAgICBtZS52YXJpYWJsZUxpc3RlbmVyTWFwW3Byb3BlcnR5XSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtZS52YXJpYWJsZUxpc3RlbmVyTWFwW3Byb3BlcnR5XSA9IG1lLnZhcmlhYmxlTGlzdGVuZXJNYXBbcHJvcGVydHldLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAodmFyaWFibGUsIHRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXBbdmFyaWFibGVdID0gXy5yZWplY3QodGhpcy52YXJpYWJsZUxpc3RlbmVyTWFwW3ZhcmlhYmxlXSwgZnVuY3Rpb24gKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmVBbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudmFyaWFibGVMaXN0ZW5lck1hcCA9IHt9O1xuICAgICAgICAgICAgdGhpcy5pbm5lclZhcmlhYmxlc0xpc3QgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xuICAgIHZhciBtZSA9IHRoaXM7XG4gICAgJCh2ZW50KS5vZmYoJ2RpcnR5Jykub24oJ2RpcnR5JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIG51bGwsIHRydWUpO1xuICAgIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHM6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuIHZhbCArICcnO1xuICAgIH0sXG5cbiAgICB1cHBlckNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuICh2YWwgKyAnJykudG9VcHBlckNhc2UoKTtcbiAgICB9LFxuICAgIGxvd2VyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG4gICAgdGl0bGVDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IHZhbCArICcnO1xuICAgICAgICByZXR1cm4gdmFsLnJlcGxhY2UoL1xcd1xcUyovZywgZnVuY3Rpb24gKHR4dCkge3JldHVybiB0eHQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0eHQuc3Vic3RyKDEpLnRvTG93ZXJDYXNlKCk7fSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCh2YWwpO1xuICAgIH0sXG4gICAgbGFzdDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgcmV0dXJuIHZhbFt2YWwubGVuZ3RoIC0gMV07XG4gICAgfSxcbiAgICBmaXJzdDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgcmV0dXJuIHZhbFswXTtcbiAgICB9LFxuICAgIHByZXZpb3VzOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICByZXR1cm4gKHZhbC5sZW5ndGggPD0gMSkgPyB2YWxbMF0gOiB2YWxbdmFsLmxlbmd0aCAtIDJdO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhbGlhczogJ2knLFxuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZSwgMTApO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhbGlhczogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgLy9UT0RPOiBGYW5jeSByZWdleCB0byBtYXRjaCBudW1iZXIgZm9ybWF0cyBoZXJlXG4gICAgICAgIHJldHVybiAobmFtZS5pbmRleE9mKCcjJykgIT09IC0xIHx8IG5hbWUuaW5kZXhPZignMCcpICE9PSAtMSk7XG4gICAgfSxcblxuICAgIHBhcnNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCs9ICcnO1xuICAgICAgICB2YXIgaXNOZWdhdGl2ZSA9IHZhbC5jaGFyQXQoMCkgPT09ICctJztcblxuICAgICAgICB2YWwgID0gdmFsLnJlcGxhY2UoLywvZywgJycpO1xuICAgICAgICB2YXIgZmxvYXRNYXRjaGVyID0gLyhbLStdP1swLTldKlxcLj9bMC05XSspKEs/TT9CPyU/KS9pO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IGZsb2F0TWF0Y2hlci5leGVjKHZhbCk7XG4gICAgICAgIHZhciBudW1iZXIsIHN1ZmZpeCA9ICcnO1xuICAgICAgICBpZiAocmVzdWx0cyAmJiByZXN1bHRzWzFdKSB7XG4gICAgICAgICAgICBudW1iZXIgPSByZXN1bHRzWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHRzICYmIHJlc3VsdHNbMl0pIHtcbiAgICAgICAgICAgIHN1ZmZpeCA9IHJlc3VsdHNbMl0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoc3VmZml4KSB7XG4gICAgICAgICAgICBjYXNlICclJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyAxMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdrJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbSc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2InOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDAwMDAwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbnVtYmVyID0gcGFyc2VGbG9hdChudW1iZXIpO1xuICAgICAgICBpZiAoaXNOZWdhdGl2ZSAmJiBudW1iZXIgPiAwKSB7XG4gICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAtMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgIH0sXG5cbiAgICBjb252ZXJ0OiAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBzY2FsZXMgPSBbJycsICdLJywgJ00nLCAnQicsICdUJ107XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RGlnaXRzKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPT09IDAgPyAwIDogcm91bmRUbyh2YWx1ZSwgTWF0aC5tYXgoMCwgZGlnaXRzIC0gTWF0aC5jZWlsKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4xMCkpKTtcblxuICAgICAgICAgICAgdmFyIFRYVCA9ICcnO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbFNldCA9IGZhbHNlO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpVFhUID0gMDsgaVRYVCA8IG51bWJlclRYVC5sZW5ndGg7IGlUWFQrKykge1xuICAgICAgICAgICAgICAgIFRYVCArPSBudW1iZXJUWFQuY2hhckF0KGlUWFQpO1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJUWFQuY2hhckF0KGlUWFQpID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVjaW1hbFNldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGRpZ2l0cyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBUWFQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRlY2ltYWxTZXQpIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJy4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGRpZ2l0cyA+IDApIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgIGRpZ2l0cy0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZERlY2ltYWxzKHZhbHVlLCBkZWNpbWFscywgbWluRGVjaW1hbHMsIGhhc0NvbW1hcykge1xuICAgICAgICAgICAgaGFzQ29tbWFzID0gaGFzQ29tbWFzIHx8IHRydWU7XG4gICAgICAgICAgICB2YXIgbnVtYmVyVFhUID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBoYXNEZWNpbWFscyA9IChudW1iZXJUWFQuc3BsaXQoJy4nKS5sZW5ndGggPiAxKTtcbiAgICAgICAgICAgIHZhciBpRGVjID0gMDtcblxuICAgICAgICAgICAgaWYgKGhhc0NvbW1hcykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGlDaGFyID0gbnVtYmVyVFhULmxlbmd0aCAtIDE7IGlDaGFyID4gMDsgaUNoYXItLSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzRGVjaW1hbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0RlY2ltYWxzID0gKG51bWJlclRYVC5jaGFyQXQoaUNoYXIpICE9PSAnLicpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaURlYyA9IChpRGVjICsgMSkgJSAzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlEZWMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgPSBudW1iZXJUWFQuc3Vic3RyKDAsIGlDaGFyKSArICcsJyArIG51bWJlclRYVC5zdWJzdHIoaUNoYXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGVjaW1hbHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvQUREO1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJUWFQuc3BsaXQoJy4nKS5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0b0FERCA9IG1pbkRlY2ltYWxzO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9BREQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgKz0gJy4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BREQgPSBtaW5EZWNpbWFscyAtIG51bWJlclRYVC5zcGxpdCgnLicpWzFdLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAodG9BREQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCArPSAnMCc7XG4gICAgICAgICAgICAgICAgICAgIHRvQURELS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bWJlclRYVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJvdW5kVG8odmFsdWUsIGRpZ2l0cykge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQodmFsdWUgKiBNYXRoLnBvdygxMCwgZGlnaXRzKSkgLyBNYXRoLnBvdygxMCwgZGlnaXRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFN1ZmZpeChmb3JtYXRUWFQpIHtcbiAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5yZXBsYWNlKCcuJywgJycpO1xuICAgICAgICAgICAgdmFyIGZpeGVzVFhUID0gZm9ybWF0VFhULnNwbGl0KG5ldyBSZWdFeHAoJ1swfCx8I10rJywgJ2cnKSk7XG4gICAgICAgICAgICByZXR1cm4gKGZpeGVzVFhULmxlbmd0aCA+IDEpID8gZml4ZXNUWFRbMV0udG9TdHJpbmcoKSA6ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNDdXJyZW5jeShzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBzID0gJC50cmltKHN0cmluZyk7XG5cbiAgICAgICAgICAgIGlmIChzID09PSAnJCcgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCrCcgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCpScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCoycgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCoScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCsScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnS8OEPycgfHxcbiAgICAgICAgICAgICAgICBzID09PSAna3InIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqInIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqonIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OG4oCZJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKpJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKrJykge1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdChudW1iZXIsIGZvcm1hdFRYVCkge1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyW251bWJlci5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhudW1iZXIpICYmICFfLmlzTnVtYmVyKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZvcm1hdFRYVCB8fCBmb3JtYXRUWFQudG9Mb3dlckNhc2UoKSA9PT0gJ2RlZmF1bHQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bWJlci50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaXNOYU4obnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnPyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vdmFyIGZvcm1hdFRYVDtcbiAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5yZXBsYWNlKCcmZXVybzsnLCAnw6LigJrCrCcpO1xuXG4gICAgICAgICAgICAvLyBEaXZpZGUgKy8tIE51bWJlciBGb3JtYXRcbiAgICAgICAgICAgIHZhciBmb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCc7Jyk7XG4gICAgICAgICAgICBpZiAoZm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm1hdChNYXRoLmFicyhudW1iZXIpLCBmb3JtYXRzWygobnVtYmVyID49IDApID8gMCA6IDEpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgU2lnblxuICAgICAgICAgICAgdmFyIHNpZ24gPSAobnVtYmVyID49IDApID8gJycgOiAnLSc7XG4gICAgICAgICAgICBudW1iZXIgPSBNYXRoLmFicyhudW1iZXIpO1xuXG5cbiAgICAgICAgICAgIHZhciBsZWZ0T2ZEZWNpbWFsID0gZm9ybWF0VFhUO1xuICAgICAgICAgICAgdmFyIGQgPSBsZWZ0T2ZEZWNpbWFsLmluZGV4T2YoJy4nKTtcbiAgICAgICAgICAgIGlmIChkID4gLTEpIHtcbiAgICAgICAgICAgICAgICBsZWZ0T2ZEZWNpbWFsID0gbGVmdE9mRGVjaW1hbC5zdWJzdHJpbmcoMCwgZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkID0gbGVmdE9mRGVjaW1hbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gbm9ybWFsaXplZC5sYXN0SW5kZXhPZigncycpO1xuICAgICAgICAgICAgdmFyIGlzU2hvcnRGb3JtYXQgPSBpbmRleCA+IC0xO1xuXG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0Q2hhciA9IGxlZnRPZkRlY2ltYWwuY2hhckF0KGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSAnICcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNTaG9ydEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxlYWRpbmdUZXh0ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHJpbmcoMCwgaW5kZXgpIDogJyc7XG4gICAgICAgICAgICB2YXIgcmlnaHRPZlByZWZpeCA9IGlzU2hvcnRGb3JtYXQgPyBmb3JtYXRUWFQuc3Vic3RyKGluZGV4ICsgMSkgOiBmb3JtYXRUWFQuc3Vic3RyKGluZGV4KTtcblxuICAgICAgICAgICAgLy9maXJzdCBjaGVjayB0byBtYWtlIHN1cmUgJ3MnIGlzIGFjdHVhbGx5IHNob3J0IGZvcm1hdCBhbmQgbm90IHBhcnQgb2Ygc29tZSBsZWFkaW5nIHRleHRcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNob3J0Rm9ybWF0VGVzdCA9IC9bMC05IypdLztcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0UmVzdWx0ID0gcmlnaHRPZlByZWZpeC5tYXRjaChzaG9ydEZvcm1hdFRlc3QpO1xuICAgICAgICAgICAgICAgIGlmICghc2hvcnRGb3JtYXRUZXN0UmVzdWx0IHx8IHNob3J0Rm9ybWF0VGVzdFJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy9ubyBzaG9ydCBmb3JtYXQgY2hhcmFjdGVycyBzbyB0aGlzIG11c3QgYmUgbGVhZGluZyB0ZXh0IGllLiAnd2Vla3MgJ1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGxlYWRpbmdUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2lmIChmb3JtYXRUWFQuY2hhckF0KDApID09ICdzJylcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbFNjYWxlID0gbnVtYmVyID09PSAwID8gMCA6IE1hdGguZmxvb3IoTWF0aC5sb2coTWF0aC5hYnMobnVtYmVyKSkgLyAoMyAqIE1hdGguTE4xMCkpO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gKChudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKSkgPCAxMDAwKSA/IHZhbFNjYWxlIDogKHZhbFNjYWxlICsgMSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1heCh2YWxTY2FsZSwgMCk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1pbih2YWxTY2FsZSwgNCk7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyIC8gTWF0aC5wb3coMTAsIDMgKiB2YWxTY2FsZSk7XG4gICAgICAgICAgICAgICAgLy9pZiAoIWlzTmFOKE51bWJlcihmb3JtYXRUWFQuc3Vic3RyKDEpICkgKSApXG5cbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKE51bWJlcihyaWdodE9mUHJlZml4KSkgJiYgcmlnaHRPZlByZWZpeC5pbmRleE9mKCcuJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaW1pdERpZ2l0cyA9IE51bWJlcihyaWdodE9mUHJlZml4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bWJlciA8IE1hdGgucG93KDEwLCBsaW1pdERpZ2l0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIGdldERpZ2l0cyhudW1iZXIsIE51bWJlcihyaWdodE9mUHJlZml4KSkgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHNpZ24gKyBNYXRoLnJvdW5kKG51bWJlcikgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9mb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDEpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBTVUZGSVggPSBnZXRTdWZmaXgoZm9ybWF0VFhUKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cigwLCBmb3JtYXRUWFQubGVuZ3RoIC0gU1VGRklYLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbFdpdGhvdXRMZWFkaW5nID0gZm9ybWF0KCgoc2lnbiA9PT0gJycpID8gMSA6IC0xKSAqIG51bWJlciwgZm9ybWF0VFhUKSArIHNjYWxlc1t2YWxTY2FsZV0gKyBTVUZGSVg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSAmJiBzaWduICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsV2l0aG91dExlYWRpbmcgPSB2YWxXaXRob3V0TGVhZGluZy5zdWJzdHIoc2lnbi5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIHZhbFdpdGhvdXRMZWFkaW5nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3ViRm9ybWF0cyA9IGZvcm1hdFRYVC5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIGRlY2ltYWxzO1xuICAgICAgICAgICAgdmFyIG1pbkRlY2ltYWxzO1xuICAgICAgICAgICAgaWYgKHN1YkZvcm1hdHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBtaW5EZWNpbWFscyA9IHN1YkZvcm1hdHNbMV0ubGVuZ3RoIC0gc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJzArJywgJ2cnKSwgJycpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBzdWJGb3JtYXRzWzBdICsgc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJ1swfCNdKycsICdnJyksICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZml4ZXNUWFQgPSBmb3JtYXRUWFQuc3BsaXQobmV3IFJlZ0V4cCgnWzB8LHwjXSsnLCAnZycpKTtcbiAgICAgICAgICAgIHZhciBwcmVmZml4ID0gZml4ZXNUWFRbMF0udG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBzdWZmaXggPSAoZml4ZXNUWFQubGVuZ3RoID4gMSkgPyBmaXhlc1RYVFsxXS50b1N0cmluZygpIDogJyc7XG5cbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqICgoZm9ybWF0VFhULnNwbGl0KCclJykubGVuZ3RoID4gMSkgPyAxMDAgOiAxKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgaWYgKGZvcm1hdFRYVC5pbmRleE9mKCclJykgIT09IC0xKSBudW1iZXIgPSBudW1iZXIgKiAxMDA7XG4gICAgICAgICAgICBudW1iZXIgPSByb3VuZFRvKG51bWJlciwgZGVjaW1hbHMpO1xuXG4gICAgICAgICAgICBzaWduID0gKG51bWJlciA9PT0gMCkgPyAnJyA6IHNpZ247XG5cbiAgICAgICAgICAgIHZhciBoYXNDb21tYXMgPSAoZm9ybWF0VFhULnN1YnN0cihmb3JtYXRUWFQubGVuZ3RoIC0gNCAtIHN1ZmZpeC5sZW5ndGgsIDEpID09PSAnLCcpO1xuICAgICAgICAgICAgdmFyIGZvcm1hdHRlZCA9IHNpZ24gKyBwcmVmZml4ICsgYWRkRGVjaW1hbHMobnVtYmVyLCBkZWNpbWFscywgbWluRGVjaW1hbHMsIGhhc0NvbW1hcykgKyBzdWZmaXg7XG5cbiAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhvcmlnaW5hbE51bWJlciwgb3JpZ2luYWxGb3JtYXQsIGZvcm1hdHRlZClcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXR0ZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0O1xuICAgIH0oKSlcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIEF0dHJpYnV0ZXMgd2hpY2ggYXJlIGp1c3QgcGFyYW1ldGVycyB0byBvdGhlcnMgYW5kIGNhbiBqdXN0IGJlIGlnbm9yZWRcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/Om1vZGVsfGNvbnZlcnQpJC9pLFxuXG4gICAgaGFuZGxlOiAkLm5vb3AsXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi1pbml0JykgPT09IDApO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24taW5pdCcsICcnKTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgJChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGZuTmFtZSwgcGFyYW1zOiBhcmdzIH07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWUudHJpZ2dlcignZi51aS5vcGVyYXRlJywgeyBvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWUgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi0nKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uIChhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHRoaXMub2ZmKGF0dHIpLm9uKGF0dHIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3MgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7IG9wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnOmNoZWNrYm94LDpyYWRpbycsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2V0dGFibGVWYWx1ZSA9IHRoaXMuYXR0cigndmFsdWUnKTsgLy9pbml0aWFsIHZhbHVlXG4gICAgICAgIC8qanNsaW50IGVxZXE6IHRydWUqL1xuICAgICAgICB2YXIgaXNDaGVja2VkID0gKHNldHRhYmxlVmFsdWUgIT09IHVuZGVmaW5lZCkgPyAoc2V0dGFibGVWYWx1ZSA9PSB2YWx1ZSkgOiAhIXZhbHVlO1xuICAgICAgICB0aGlzLnByb3AoJ2NoZWNrZWQnLCBpc0NoZWNrZWQpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHRhcmdldDogJ2lucHV0LCBzZWxlY3QnLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy52YWwodmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGVzdDogJ2NsYXNzJyxcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYWRkZWRDbGFzc2VzID0gdGhpcy5kYXRhKCdhZGRlZC1jbGFzc2VzJyk7XG4gICAgICAgIGlmICghYWRkZWRDbGFzc2VzKSB7XG4gICAgICAgICAgICBhZGRlZENsYXNzZXMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWRkZWRDbGFzc2VzW3Byb3BdKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKGFkZGVkQ2xhc3Nlc1twcm9wXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc051bWJlcih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gJ3ZhbHVlLScgKyB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBhZGRlZENsYXNzZXNbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgLy9GaXhtZTogcHJvcCBpcyBhbHdheXMgXCJjbGFzc1wiXG4gICAgICAgIHRoaXMuYWRkQ2xhc3ModmFsdWUpO1xuICAgICAgICB0aGlzLmRhdGEoJ2FkZGVkLWNsYXNzZXMnLCBhZGRlZENsYXNzZXMpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzpjaGVja2VkfHNlbGVjdGVkfGFzeW5jfGF1dG9mb2N1c3xhdXRvcGxheXxjb250cm9sc3xkZWZlcnxpc21hcHxsb29wfG11bHRpcGxlfG9wZW58cmVxdWlyZWR8c2NvcGVkKSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIC8qanNsaW50IGVxZXE6IHRydWUqL1xuICAgICAgICB2YXIgdmFsID0gKHRoaXMuYXR0cigndmFsdWUnKSkgPyAodmFsdWUgPT0gdGhpcy5wcm9wKCd2YWx1ZScpKSA6ICEhdmFsdWU7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWwpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmRpc2FibGVkfGhpZGRlbnxyZWFkb25seSkkL2ksXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByb3AocHJvcCwgIXZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5odG1sKHZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICcqJyxcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUsIHByb3ApIHtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoe1xuXG4gICAgcHJvcGVydHlIYW5kbGVyczogW1xuXG4gICAgXSxcblxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbCA9IHRoaXMuJGVsO1xuICAgICAgICAvL1RPRE86IGZpbGUgYSBpc3N1ZSBmb3IgdGhlIHZlbnNpbSBtYW5hZ2VyIHRvIGNvbnZlcnQgdHJ1ZXMgdG8gMXMgYW5kIHNldCB0aGlzIHRvIHRydWUgYW5kIGZhbHNlXG5cbiAgICAgICAgdmFyIG9mZlZhbCA9ICAoJGVsLmRhdGEoJ2Ytb2ZmJykgIT09IHVuZGVmaW5lZCkgPyAkZWwuZGF0YSgnZi1vZmYnKSA6IDA7XG4gICAgICAgIC8vYXR0ciA9IGluaXRpYWwgdmFsdWUsIHByb3AgPSBjdXJyZW50IHZhbHVlXG4gICAgICAgIHZhciBvblZhbCA9ICgkZWwuYXR0cigndmFsdWUnKSAhPT0gdW5kZWZpbmVkKSA/ICRlbC5wcm9wKCd2YWx1ZScpOiAxO1xuXG4gICAgICAgIHZhciB2YWwgPSAoJGVsLmlzKCc6Y2hlY2tlZCcpKSA/IG9uVmFsIDogb2ZmVmFsO1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHsgc2VsZWN0b3I6ICc6Y2hlY2tib3gsOnJhZGlvJyB9KTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi8uLi9jb25maWcnKTtcbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKHtcbiAgICBwcm9wZXJ0eUhhbmRsZXJzOiBbXSxcblxuICAgIHVpQ2hhbmdlRXZlbnQ6ICdjaGFuZ2UnLFxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLnZhbCgpO1xuICAgIH0sXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHZhciBwcm9wTmFtZSA9IHRoaXMuJGVsLmRhdGEoY29uZmlnLmJpbmRlckF0dHIpO1xuXG4gICAgICAgIGlmIChwcm9wTmFtZSkge1xuICAgICAgICAgICAgdGhpcy4kZWwub2ZmKHRoaXMudWlDaGFuZ2VFdmVudCkub24odGhpcy51aUNoYW5nZUV2ZW50LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IG1lLmdldFVJVmFsdWUoKTtcblxuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgICAgICBwYXJhbXNbcHJvcE5hbWVdID0gdmFsO1xuXG4gICAgICAgICAgICAgICAgbWUuJGVsLnRyaWdnZXIoY29uZmlnLmV2ZW50cy50cmlnZ2VyLCBwYXJhbXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgQmFzZVZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59LCB7IHNlbGVjdG9yOiAnaW5wdXQsIHNlbGVjdCcgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vYmFzZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCh7XG4gICAgcHJvcGVydHlIYW5kbGVyczogW1xuXG4gICAgXSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB9XG59LCB7IHNlbGVjdG9yOiAnKicgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBleHRlbmQgPSBmdW5jdGlvbiAocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgY2hpbGQ7XG5cbiAgICAvLyBUaGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHRoZSBuZXcgc3ViY2xhc3MgaXMgZWl0aGVyIGRlZmluZWQgYnkgeW91XG4gICAgLy8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG4gICAgLy8gYnkgdXMgdG8gc2ltcGx5IGNhbGwgdGhlIHBhcmVudCdzIGNvbnN0cnVjdG9yLlxuICAgIGlmIChwcm90b1Byb3BzICYmIF8uaGFzKHByb3RvUHJvcHMsICdjb25zdHJ1Y3RvcicpKSB7XG4gICAgICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9O1xuICAgIH1cblxuICAgIC8vIEFkZCBzdGF0aWMgcHJvcGVydGllcyB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24sIGlmIHN1cHBsaWVkLlxuICAgIF8uZXh0ZW5kKGNoaWxkLCBwYXJlbnQsIHN0YXRpY1Byb3BzKTtcblxuICAgIC8vIFNldCB0aGUgcHJvdG90eXBlIGNoYWluIHRvIGluaGVyaXQgZnJvbSBgcGFyZW50YCwgd2l0aG91dCBjYWxsaW5nXG4gICAgLy8gYHBhcmVudGAncyBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICB2YXIgU3Vycm9nYXRlID0gZnVuY3Rpb24gKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH07XG4gICAgU3Vycm9nYXRlLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgY2hpbGQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZSgpO1xuXG4gICAgLy8gQWRkIHByb3RvdHlwZSBwcm9wZXJ0aWVzIChpbnN0YW5jZSBwcm9wZXJ0aWVzKSB0byB0aGUgc3ViY2xhc3MsXG4gICAgLy8gaWYgc3VwcGxpZWQuXG4gICAgaWYgKHByb3RvUHJvcHMpIHtcbiAgICAgICAgXy5leHRlbmQoY2hpbGQucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgYSBjb252ZW5pZW5jZSBwcm9wZXJ0eSBpbiBjYXNlIHRoZSBwYXJlbnQncyBwcm90b3R5cGUgaXMgbmVlZGVkXG4gICAgLy8gbGF0ZXIuXG4gICAgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblxuICAgIHJldHVybiBjaGlsZDtcbn07XG5cbnZhciBWaWV3ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbCA9ICQob3B0aW9ucy5lbCk7XG4gICAgdGhpcy5lbCA9IG9wdGlvbnMuZWw7XG4gICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbn07XG5cbl8uZXh0ZW5kKFZpZXcucHJvdG90eXBlLCB7XG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge30sXG59KTtcblxuVmlldy5leHRlbmQgPSBleHRlbmQ7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiJdfQ==
;