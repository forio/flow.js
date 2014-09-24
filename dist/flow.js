;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
window.Flow = require('./flow.js');
window.Flow.version = '0.6.3'; //populated by grunt

},{"./flow.js":2}],2:[function(require,module,exports){
'use strict';

var domManager = require('./dom/dom-manager');
var Channel = require('./channels/channel-manager');

module.exports = {
    dom: domManager,

    initialize: function(config) {
        var model = $('body').data('f-model');

        var defaults = {
            channel: {
                account: '',
                project: '',
                model: model
            },
            dom: {

            }
        };

        var options = $.extend(true, {}, defaults, config);
        if (config && config.channel && (config.channel instanceof Channel)) {
            this.channel = config.channel;
        }
        else {
            this.channel = new Channel(options.channel);
        }

        domManager.initialize($.extend(true, {
            channel: this.channel
        }));
    }
};

},{"./dom/dom-manager":3,"./channels/channel-manager":4}],3:[function(require,module,exports){
module.exports = (function() {
    'use strict';
    var config = require('../config');

    var nodeManager = require('./nodes/node-manager.js');
    var attrManager = require('./attributes/attribute-manager.js');
    var converterManager = require('../converters/converter-manager.js');

    var parseUtils = require('../utils/parse-utils');

    //Jquery selector to return everything which has a f- property set
    $.expr[':'][config.prefix] = function(obj){
        var $this = $(obj);
        var dataprops = _.keys($this.data());

        var match = _.find(dataprops, function (attr) {
            return (attr.indexOf(config.prefix) === 0);
        });

        return !!(match);
    };

    $.expr[':'].webcomponent = function(obj){
        return obj.nodeName.indexOf('-') !== -1;
    };

    var publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,
        converters: converterManager,
        //utils for testing
        private: {

        },

        initialize: function(options) {
            var defaults = {
                root: 'body',
                channel: null
            };
            $.extend(defaults, options);

            var channel = defaults.channel;
            var me = this;

            var $root = $(defaults.root);
            $(function(){
                //parse through dom and find everything with matching attributes
                var matchedElements = $root.find(':' + config.prefix);
                if ($root.is(':' + config.prefix)) {
                    matchedElements = matchedElements.add($(defaults.root));
                }

                me.private.matchedElements = matchedElements;

                $.each(matchedElements, function(index, element) {
                    var $el = $(element);
                    var Handler = nodeManager.getHandler($el);
                    new Handler.handle({
                        el: element
                    });


                    var varMap = $el.data('variable-attr-map');
                    if (!varMap) {
                        varMap = {};
                        //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve
                        $(element.attributes).each(function(index, nodeMap){
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
                                    }
                                    else {
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

                //Attach listeners
                //TODO: split initialize into multiple sub events, at least Add & then attach handlers
                $root.off(config.events.react).on(config.events.react, function(evt, data) {
                    // console.log(evt.target, data, "root on");
                    var $el = $(evt.target);
                    var varmap = $el.data('variable-attr-map');

                    $.each(data, function(variableName, value) {
                        var propertyToUpdate = varmap[variableName.trim()];
                        if (propertyToUpdate){
                            //f-converters-* is already set while parsing the varmap, as an array to boot
                            var attrConverters = $el.data('f-converters-' + propertyToUpdate);

                            if (!attrConverters && propertyToUpdate === 'bind') {
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
                            var convertedValue = converterManager.convert(value, attrConverters);

                            propertyToUpdate = propertyToUpdate.toLowerCase();
                            var handler = attrManager.getHandler(propertyToUpdate, $el);
                            handler.handle.call($el, convertedValue, propertyToUpdate);
                        }
                    });
                });

                $root.off(config.events.trigger).on(config.events.trigger, function(evt, data) {
                    var parsedData = {}; //if not all subsequent listeners will get the modified data

                    var $el = $(evt.target);

                    //f-converters-* is already set while parsing the varmap, as an array to boot
                    var attrConverters = $el.data('f-converters-bind');
                    if (!attrConverters) {
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

                    _.each(data, function (val, key) {
                        key = key.split('|')[0].trim(); //in case the pipe formatting syntax was used
                        val = converterManager.parse(val, attrConverters);
                        parsedData[key] = parseUtils.toImplicitType(val);
                    });
                    channel.variables.publish(parsedData);
                });

                $root.off('f.ui.operate').on('f.ui.operate', function(evt, data) {
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

},{"./nodes/node-manager.js":5,"./attributes/attribute-manager.js":6,"../converters/converter-manager.js":7,"../config":8,"../utils/parse-utils":9}],4:[function(require,module,exports){
'use strict';

var VarsChannel = require('./variables-channel');
var OperationsChannel = require('./operations-channel');

module.exports = function(config) {
    if (!config) {
        config = {};
    }

    var runparams = config;

    var rs = new F.service.Run(runparams);

    window.run = rs;
    //TODO: store runid in token etc. But if you do this, make sure you remove token on reset
    var $creationPromise = rs.create(config.model);
    rs.currentPromise = $creationPromise;

    var createAndThen = function(value, context) {
        return _.wrap(value, function(func) {
            var passedInParams = _.toArray(arguments).slice(1);
            return rs.currentPromise.then(function (){
                rs.currentPromise = func.apply(context, passedInParams);
                return rs.currentPromise;
            });
        });
    };

    //Make sure nothing happens before the run is created
    _.each(rs, function(value, name) {
        if ($.isFunction(value) && name !== 'variables') {
            rs[name] = createAndThen(value, rs);
        }
    });
    var vs = rs.variables();
    _.each(vs, function(value, name) {
        if ($.isFunction(value)) {
            vs[name] = createAndThen(value, vs);
        }
    });

    this.run = rs;
    this.variables = new VarsChannel({run: rs, vent: this});
    this.operations = new OperationsChannel({run: rs, vent: this});
};

},{"./variables-channel":10,"./operations-channel":11}],8:[function(require,module,exports){
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
        if ( typeof data === 'string' ) {
            data = data.trim();

            if (data === 'true') {
                converted = true;
            }
            else if (data === 'false') {
                converted = false;
            }
            else if (data === 'null') {
                converted = null;
            }
            else if (data === 'undefined') {
                converted = '';
            }
            else if(converted.charAt(0) === '\'' || converted.charAt(0) === '"') {
                converted = data.substring(1, data.length -1);
            }
            else if ($.isNumeric( data )) {
                converted = +data;
            }
            else if ( rbrace.test( data )) {
                //TODO: This only works with double quotes, i.e., [1,"2"] works but not [1,'2']
                converted = $.parseJSON( data ) ;
            }
        }
        return converted;
    }
};

},{}],11:[function(require,module,exports){
'use strict';

module.exports = function(config) {
    if (!config) {
        config = {};
    }
    var run = config.run;
    var vent = config.vent;

    var publicAPI = {
        listenerMap: {},

        //Check for updates
        refresh: function(operation,response) {
            // var DIRTY_OPERATIONS = ['start_game', 'initialize', 'step'];
            // if (_.contains(DIRTY_OPERATIONS, operation)) {
            $(vent).trigger('dirty', {opn: operation, response: response});
            // }
        },

        /**
         * Operation name & parameters to send to operations API
         * @param  {string | object} operation Name of Operation. If array, needs to be in {operations: [{name: opn, params:[]}], serial: boolean}] format
         * @param  {*} params (optional)   params to send to opertaion
         * @return {$promise}
         */
        publish: function(operation, params) {
            var me = this;
            if (operation.operations) {
                var fn = (operation.serial) ? run.serial : run.parallel;
                return fn.call(run, operation.operations)
                        .then(function (response) {
                            me.refresh.call(me, _(operation.operations).pluck('name'), response);
                        });
            }
            else {
                //TODO: check if interpolated
                return run.do.apply(run, arguments)
                    .then(function (response) {
                        me.refresh.call(me, operation, response);
                    });
            }
            // console.log('operations publish', operation, params);
        },

        subscribe: function(operations, subscriber) {
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
            $.each(operations, function(index, opn) {
                me.listenerMap[opn] = me.listenerMap[opn].concat(data);
            });

            return id;
        },
        unsubscribe: function(variable, token) {
            this.listenerMap = _.reject(this.listenerMap, function(subs) {
                return subs.id === token;
            });
        },
        unsubscribeAll: function() {
            this.listenerMap = [];
        }
    };
    return $.extend(this, publicAPI);
};

},{}],7:[function(require,module,exports){
'use strict';


var normalize = function (alias, converter) {
    var ret = [];
    //nomalize('flip', fn)
    if (_.isFunction(converter)) {
        ret.push({
            alias: alias,
            convert: converter
        });
    }
    else if (_.isObject(converter) && converter.convert) {
        converter.alias = alias;
        ret.push(converter);
    }
    else if(_.isObject(alias)) {
        //normalize({alias: 'flip', convert: function})
        if (alias.convert) {
            ret.push(alias);
        }
        else {
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
    }
    else if (_.isFunction(converter.alias)) {
        return converter.alias(alias);
    }
    else if (_.isRegex(converter.alias)) {
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

    replace: function(alias, converter) {
        var index;
        _.each(this.list, function(currentConverter, i) {
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
        _.each(list, function (converterName){
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
        _.each(list, function (converterName){
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

$.each(defaultconverters.reverse(), function(index, converter) {
    converterManager.register(converter);
});

module.exports = converterManager;

},{"./number-converter":12,"./string-converter":13,"./array-converter":14,"./numberformat-converter":15}],5:[function(require,module,exports){
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
    }
    else {
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

    getHandler: function(selector) {
        return _.find(this.list, function(node) {
            return match(selector, node);
        });
    },

    replace: function(selector, handler) {
        var index;
        _.each(this.list, function(currentHandler, i) {
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
_.each(defaultHandlers.reverse(), function(handler) {
    nodeManager.register(handler.selector, handler);
});

module.exports = nodeManager;

},{"./input-checkbox-node":16,"./default-input-node":17,"./default-node":18}],6:[function(require,module,exports){
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
    return $.extend(handler, {test: attributeMatcher, target: nodeMatcher});
};

$.each(defaultHandlers, function(index, handler) {
    handlersList.push(normalize(handler.test, handler.target, handler));
});


var matchAttr = function (matchExpr, attr, $el) {
    var attrMatch;

    if (_.isString(matchExpr)) {
        attrMatch = (matchExpr === '*' || (matchExpr.toLowerCase() === attr.toLowerCase()));
    }
    else if (_.isFunction(matchExpr)) {
        //TODO: remove element selectors from attributes
        attrMatch = matchExpr(attr, $el);
    }
    else if (_.isRegExp(matchExpr)) {
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
    filter: function(attrFilter, nodeFilter) {
        var filtered = _.select(handlersList, function (handler) {
            return matchAttr(handler.test, attrFilter);
        });
        if (nodeFilter) {
            filtered = _.select(filtered, function (handler){
                return matchNode(handler.target, nodeFilter);
            });
        }
        return filtered;
    },

    replace: function(attrFilter, nodeFilter, handler) {
        var index;
        _.each(handlersList, function(currentHandler, i) {
            if (matchAttr(currentHandler.test, attrFilter) && matchNode(currentHandler.target, nodeFilter)) {
                index = i;
                return false;
            }
        });
        handlersList.splice(index, 1, normalize(attrFilter, nodeFilter, handler));
    },

    getHandler: function(property, $el) {
        var filtered = this.filter(property, $el);
        //There could be multiple matches, but the top first has the most priority
        return filtered[0];
    }
};


},{"./no-op-attr":19,"./events/init-event-attr":20,"./events/default-event-attr":21,"./binds/checkbox-radio-bind-attr":22,"./binds/input-bind-attr":23,"./class-attr":24,"./positive-boolean-attr":25,"./negative-boolean-attr":26,"./binds/default-bind-attr":27,"./default-attr":28}],10:[function(require,module,exports){
'use strict';
var config = require('../config');

module.exports = function(options) {
    if (!options) {
        options = {};
    }
    var vs = options.run.variables();
    var vent  = options.vent;

    var currentData = {};

    //TODO: actually compare objects and so on
    var isEqual = function(a, b) {
        return false;
    };

    var getInnerVariables = function(str) {
        var inner = str.match(/<(.*?)>/g);
        inner = _.map(inner, function(val){
            return val.substring(1, val.length - 1);
        });
        return inner;
    };

    //Replaces stubbed out keynames in variablestointerpolate with their corresponding calues
    var interpolate = function(variablesToInterpolate, values) {
        var interpolationMap = {};
        var interpolated = {};

        _.each(variablesToInterpolate, function (val, outerVariable) {
            var inner = getInnerVariables(outerVariable);
            var originalOuter = outerVariable;
            $.each(inner, function(index, innerVariable) {
                var thisval = values[innerVariable];
                if (thisval !== null && thisval !== undefined) {
                    if (_.isArray(thisval)) {
                        //For arrayed things get the last one for interpolation purposes
                        thisval = thisval[thisval.length -1];
                    }
                    outerVariable = outerVariable.replace('<' + innerVariable + '>', thisval);
                }
            });
            interpolationMap[outerVariable] = originalOuter;
            interpolated[outerVariable] = val;
        });

        return {
            interpolated: interpolated,
            interpolationMap: interpolationMap
        };
    };

    var publicAPI = {
        //for testing, to be removed later
        private: {
            getInnerVariables: getInnerVariables,
            interpolate: interpolate
        },

        //Interpolated variables which need to be resolved before the outer ones can be
        innerVariablesList: [],
        variableListenerMap: {},

        //Check for updates
        refresh: function() {
            var me = this;

            var getVariables = function(vars, ip) {
                return vs.query(vars).then(function(variables) {
                    // console.log('Got variables', variables);
                    _.each(variables, function(value, vname) {
                        var oldValue = currentData[vname];
                        if (!isEqual(value, oldValue)) {
                            currentData[vname] = value;

                            var vn = (ip && ip[vname]) ? ip[vname] : vname;
                            me.notify(vn, value);
                        }
                    });
                });
            };
            if (me.innerVariablesList.length) {
                return vs.query(me.innerVariablesList).then(function (innerVariables) {
                    console.log('inner', innerVariables);
                    $.extend(currentData, innerVariables);
                    var ip =  interpolate(me.variableListenerMap, innerVariables);
                    var outer = _.keys(ip.interpolated);
                    getVariables(outer, ip.interpolationMap);
                });
            }
            else {
                return getVariables(_.keys(me.variableListenerMap));
            }

        },

        notify: function (variable, value) {
            var listeners = this.variableListenerMap[variable];
            var params = {};
            params[variable] = value;

            _.each(listeners, function (listener){
                listener.target.trigger(config.events.react, params);
            });
        },

        publish: function(variable, value) {
            // console.log('publish', arguments);
            // TODO: check if interpolated
            var attrs;
            if ($.isPlainObject(variable)) {
                attrs = variable;
            } else {
                (attrs = {})[variable] = value;
            }
            var interpolated = interpolate(attrs, currentData).interpolated;

            var me = this;
            vs.save.call(vs, interpolated)
                .then(function () {
                    me.refresh.call(me);
                });
        },

        subscribe: function(properties, subscriber) {
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
            $.each(properties, function(index, property) {
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
        unsubscribe: function(variable, token) {
            this.variableListenerMap = _.reject(this.variableListenerMap, function(subs) {
                return subs.id === token;
            });
        },
        unsubscribeAll: function() {
            this.variableListenerMap = {};
            this.innerVariablesList = [];
        }
    };

    $.extend(this, publicAPI);
    var me = this;
    $(vent).on('dirty', function () {
        me.refresh.apply(me, arguments);
    });
};

},{"../config":8}],12:[function(require,module,exports){
'use strict';
module.exports = {
    alias: 'i',
    convert: function (value) {
        return parseFloat(value, 10);
    }
};

},{}],13:[function(require,module,exports){
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
        return val.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
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
    alias: function (name) {
        //TODO: Fancy regex to match number formats here
        return (name.indexOf('#') !== -1 || name.indexOf('0') !== -1 );
    },

    parse: function (val) {
        val+= '';
        var isNegative = val.charAt(0) === '-';

        val  = val.replace(/,/g, '');
        var floatMatcher = /([-+]?[0-9]*\.?[0-9]+)(K?M?B?%?)/i;
        var results = floatMatcher.exec(val);
        var number, suffix = '';
        if(results && results[1]){
            number = results[1];
        }
        if(results && results[2]){
            suffix = results[2].toLowerCase();
        }

        switch(suffix){
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
        if(isNegative && number > 0) {
            number = number * -1;
        }
        return number;
    },

    convert: (function(value) {
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
                        }
                        else {
                            return leadingText + sign + getDigits(number, Number(rightOfPrefix)) + scales[valScale];
                        }
                    } else {
                        if (isCurrency(leadingText)) {
                            return sign + leadingText + Math.round(number) + scales[valScale];
                        }
                        else {
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
            //            if(formatTXT.indexOf('%') !== -1) number = number * 100;
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

},{}],19:[function(require,module,exports){
'use strict';

// Attributes which are just parameters to others and can just be ignored
module.exports = {

    target: '*',

    test: /^(?:model|convert)$/i,

    handle: $.noop,

    init: function() {
        return false;
    }
};

},{}],20:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-init') === 0);
    },

    init: function(attr, value) {
        attr = attr.replace('on-init', '');
        var me = this;
        $(function () {
            var listOfOperations = _.invoke(value.split('|'), 'trim');
            listOfOperations = listOfOperations.map(function (value) {
                var fnName = value.split('(')[0];
                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
                var args = ($.trim(params) !== '') ? params.split(',') : [];
                return {name: fnName, params: args};
            });

            me.trigger('f.ui.operate', {operations: listOfOperations, serial: true});
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

},{}],21:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: function (attr, $node) {
        return (attr.indexOf('on-') === 0);
    },

    init: function(attr, value) {
        attr = attr.replace('on-', '');
        var me = this;
        this.on(attr, function() {
            var listOfOperations = _.invoke(value.split('|'), 'trim');
            listOfOperations = listOfOperations.map(function (value) {
                var fnName = value.split('(')[0];
                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
                var args = ($.trim(params) !== '') ? params.split(',') : [];
                return {name: fnName, params: args};
            });

            me.trigger('f.ui.operate', {operations: listOfOperations, serial: true});
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
'use strict';

module.exports = {

    test: 'class',

    target: '*',

    handle: function(value, prop) {
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

},{}],25:[function(require,module,exports){
'use strict';

module.exports = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped)$/i,

    handle: function(value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        /*jslint eqeq: true*/
        var val = (this.attr('value')) ? (value == this.prop('value')) : !!value;
        this.prop(prop, val);
    }
};

},{}],26:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: /^(?:disabled|hidden|readonly)$/i,

    handle: function(value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        this.prop(prop, !value);
    }
};

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
'use strict';

module.exports = {

    test: '*',

    target: '*',

    handle: function(value, prop) {
        this.prop(prop, value);
    }
};

},{}],16:[function(require,module,exports){
'use strict';
var BaseView = require('./default-input-node');

module.exports = BaseView.extend( {

    propertyHandlers : [

    ],

    getUIValue: function () {
        var $el = this.$el;
        //TODO: file a issue for the vensim manager to convert trues to 1s and set this to true and false

        var offVal =  ($el.data('f-off') !== undefined ) ? $el.data('f-off') : 0;
        //attr = initial value, prop = current value
        var onVal = ($el.attr('value') !== undefined ) ? $el.prop('value'): 1;

        var val = ($el.is(':checked')) ? onVal : offVal;
        return val;
    },
    initialize: function () {
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, {selector: ':checkbox,:radio'});

},{"./default-input-node":17}],17:[function(require,module,exports){
'use strict';
var config = require('../../config');
var BaseView = require('./default-node');

module.exports = BaseView.extend( {
    propertyHandlers : [],

    uiChangeEvent: 'change',
    getUIValue: function () {
        return this.$el.val();
    },

    initialize: function () {
        var me = this;
        this.$el.on(this.uiChangeEvent, function () {
            var val = me.getUIValue();
            var propName = me.$el.data(config.binderAttr);

            var params = {};
            params[propName] = val;

            me.$el.trigger(config.events.trigger, params);
        });
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, {selector: 'input, select'});

},{"../../config":8,"./default-node":18}],18:[function(require,module,exports){
'use strict';

var BaseView = require('./base');

module.exports = BaseView.extend( {
    propertyHandlers : [

    ],

    initialize: function () {
    }
}, {selector: '*'});

},{"./base":29}],29:[function(require,module,exports){
'use strict';

var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
        child = protoProps.constructor;
    } else {
        child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
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

var View = function(options) {
    this.$el = $(options.el);
    this.el = options.el;
    this.initialize.apply(this, arguments);

};

_.extend(View.prototype, {
    initialize: function(){},
});

View.extend = extend;

module.exports = View;

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9hcHAuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZmxvdy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vZG9tLW1hbmFnZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY2hhbm5lbHMvY2hhbm5lbC1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy91dGlscy9wYXJzZS11dGlscy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jaGFubmVscy9vcGVyYXRpb25zLWNoYW5uZWwuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvbm9kZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbnZlcnRlcnMvbnVtYmVyLWNvbnZlcnRlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jb252ZXJ0ZXJzL3N0cmluZy1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2luaXQtZXZlbnQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9wb3NpdGl2ZS1ib29sZWFuLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2RlZmF1bHQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvaW5wdXQtY2hlY2tib3gtbm9kZS5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL25vZGVzL2Jhc2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy5GbG93ID0gcmVxdWlyZSgnLi9mbG93LmpzJyk7XG53aW5kb3cuRmxvdy52ZXJzaW9uID0gJzwlPSB2ZXJzaW9uICU+JzsgLy9wb3B1bGF0ZWQgYnkgZ3J1bnRcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRvbU1hbmFnZXIgPSByZXF1aXJlKCcuL2RvbS9kb20tbWFuYWdlcicpO1xudmFyIENoYW5uZWwgPSByZXF1aXJlKCcuL2NoYW5uZWxzL2NoYW5uZWwtbWFuYWdlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkb206IGRvbU1hbmFnZXIsXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgdmFyIG1vZGVsID0gJCgnYm9keScpLmRhdGEoJ2YtbW9kZWwnKTtcblxuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBjaGFubmVsOiB7XG4gICAgICAgICAgICAgICAgYWNjb3VudDogJycsXG4gICAgICAgICAgICAgICAgcHJvamVjdDogJycsXG4gICAgICAgICAgICAgICAgbW9kZWw6IG1vZGVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG9tOiB7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgY29uZmlnKTtcbiAgICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcuY2hhbm5lbCAmJiAoY29uZmlnLmNoYW5uZWwgaW5zdGFuY2VvZiBDaGFubmVsKSkge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gY29uZmlnLmNoYW5uZWw7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwgPSBuZXcgQ2hhbm5lbChvcHRpb25zLmNoYW5uZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tTWFuYWdlci5pbml0aWFsaXplKCQuZXh0ZW5kKHRydWUsIHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHRoaXMuY2hhbm5lbFxuICAgICAgICB9KSk7XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbiAgICB2YXIgbm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL25vZGVzL25vZGUtbWFuYWdlci5qcycpO1xuICAgIHZhciBhdHRyTWFuYWdlciA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcy9hdHRyaWJ1dGUtbWFuYWdlci5qcycpO1xuICAgIHZhciBjb252ZXJ0ZXJNYW5hZ2VyID0gcmVxdWlyZSgnLi4vY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcycpO1xuXG4gICAgdmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9wYXJzZS11dGlscycpO1xuXG4gICAgLy9KcXVlcnkgc2VsZWN0b3IgdG8gcmV0dXJuIGV2ZXJ5dGhpbmcgd2hpY2ggaGFzIGEgZi0gcHJvcGVydHkgc2V0XG4gICAgJC5leHByWyc6J11bY29uZmlnLnByZWZpeF0gPSBmdW5jdGlvbihvYmope1xuICAgICAgICB2YXIgJHRoaXMgPSAkKG9iaik7XG4gICAgICAgIHZhciBkYXRhcHJvcHMgPSBfLmtleXMoJHRoaXMuZGF0YSgpKTtcblxuICAgICAgICB2YXIgbWF0Y2ggPSBfLmZpbmQoZGF0YXByb3BzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoY29uZmlnLnByZWZpeCkgPT09IDApO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gISEobWF0Y2gpO1xuICAgIH07XG5cbiAgICAkLmV4cHJbJzonXS53ZWJjb21wb25lbnQgPSBmdW5jdGlvbihvYmope1xuICAgICAgICByZXR1cm4gb2JqLm5vZGVOYW1lLmluZGV4T2YoJy0nKSAhPT0gLTE7XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG5cbiAgICAgICAgbm9kZXM6IG5vZGVNYW5hZ2VyLFxuICAgICAgICBhdHRyaWJ1dGVzOiBhdHRyTWFuYWdlcixcbiAgICAgICAgY29udmVydGVyczogY29udmVydGVyTWFuYWdlcixcbiAgICAgICAgLy91dGlscyBmb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG5cbiAgICAgICAgfSxcblxuICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgcm9vdDogJ2JvZHknLFxuICAgICAgICAgICAgICAgIGNoYW5uZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHZhciBjaGFubmVsID0gZGVmYXVsdHMuY2hhbm5lbDtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICAgIHZhciAkcm9vdCA9ICQoZGVmYXVsdHMucm9vdCk7XG4gICAgICAgICAgICAkKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgLy9wYXJzZSB0aHJvdWdoIGRvbSBhbmQgZmluZCBldmVyeXRoaW5nIHdpdGggbWF0Y2hpbmcgYXR0cmlidXRlc1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVkRWxlbWVudHMgPSAkcm9vdC5maW5kKCc6JyArIGNvbmZpZy5wcmVmaXgpO1xuICAgICAgICAgICAgICAgIGlmICgkcm9vdC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkRWxlbWVudHMgPSBtYXRjaGVkRWxlbWVudHMuYWRkKCQoZGVmYXVsdHMucm9vdCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1lLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzID0gbWF0Y2hlZEVsZW1lbnRzO1xuXG4gICAgICAgICAgICAgICAgJC5lYWNoKG1hdGNoZWRFbGVtZW50cywgZnVuY3Rpb24oaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBIYW5kbGVyID0gbm9kZU1hbmFnZXIuZ2V0SGFuZGxlcigkZWwpO1xuICAgICAgICAgICAgICAgICAgICBuZXcgSGFuZGxlci5oYW5kbGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgZWw6IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFyTWFwID0gJGVsLmRhdGEoJ3ZhcmlhYmxlLWF0dHItbWFwJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmFyTWFwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJNYXAgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vTk9URTogbG9vcGluZyB0aHJvdWdoIGF0dHJpYnV0ZXMgaW5zdGVhZCBvZiAuZGF0YSBiZWNhdXNlIC5kYXRhIGF1dG9tYXRpY2FsbHkgY2FtZWxjYXNlcyBwcm9wZXJ0aWVzIGFuZCBtYWtlIGl0IGhhcmQgdG8gcmV0cnZpZXZlXG4gICAgICAgICAgICAgICAgICAgICAgICAkKGVsZW1lbnQuYXR0cmlidXRlcykuZWFjaChmdW5jdGlvbihpbmRleCwgbm9kZU1hcCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBub2RlTWFwLm5vZGVOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRyVmFsID0gbm9kZU1hcC52YWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3YW50ZWRQcmVmaXggPSAnZGF0YS1mLSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHIuaW5kZXhPZih3YW50ZWRQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2Uod2FudGVkUHJlZml4LCAnJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKGF0dHIsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0JpbmRhYmxlQXR0ciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyICYmIGhhbmRsZXIuaW5pdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNCaW5kYWJsZUF0dHIgPSBoYW5kbGVyLmluaXQuY2FsbCgkZWwsIGF0dHIsIGF0dHJWYWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQmluZGFibGVBdHRyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL0NvbnZlcnQgcGlwZXMgdG8gY29udmVydGVyIGF0dHJzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2l0aENvbnYgPSBfLmludm9rZShhdHRyVmFsLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAod2l0aENvbnYubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJWYWwgPSB3aXRoQ29udi5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlbC5kYXRhKCdmLWNvbnZlcnRlcnMtJyArIGF0dHIsIHdpdGhDb252KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbW1hUmVnZXggPSAvLCg/IVteXFxbXSpcXF0pLztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyVmFsLnNwbGl0KGNvbW1hUmVnZXgpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0cmlnZ2VyZXJzID0gdHJpZ2dlcmVycy5jb25jYXQodmFsLnNwbGl0KCcsJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyTWFwW2F0dHJWYWxdID0gYXR0cjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ3ZhcmlhYmxlLWF0dHItbWFwJywgdmFyTWFwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBzdWJzY3JpYmFibGUgPSBPYmplY3Qua2V5cyh2YXJNYXApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaWJhYmxlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC52YXJpYWJsZXMuc3Vic2NyaWJlKE9iamVjdC5rZXlzKHZhck1hcCksICRlbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vQXR0YWNoIGxpc3RlbmVyc1xuICAgICAgICAgICAgICAgIC8vVE9ETzogc3BsaXQgaW5pdGlhbGl6ZSBpbnRvIG11bHRpcGxlIHN1YiBldmVudHMsIGF0IGxlYXN0IEFkZCAmIHRoZW4gYXR0YWNoIGhhbmRsZXJzXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKGNvbmZpZy5ldmVudHMucmVhY3QpLm9uKGNvbmZpZy5ldmVudHMucmVhY3QsIGZ1bmN0aW9uKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhldnQudGFyZ2V0LCBkYXRhLCBcInJvb3Qgb25cIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFybWFwID0gJGVsLmRhdGEoJ3ZhcmlhYmxlLWF0dHItbWFwJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKHZhcmlhYmxlTmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eVRvVXBkYXRlID0gdmFybWFwW3ZhcmlhYmxlTmFtZS50cmltKCldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5VG9VcGRhdGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vZi1jb252ZXJ0ZXJzLSogaXMgYWxyZWFkeSBzZXQgd2hpbGUgcGFyc2luZyB0aGUgdmFybWFwLCBhcyBhbiBhcnJheSB0byBib290XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydGVycy0nICsgcHJvcGVydHlUb1VwZGF0ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzICYmIHByb3BlcnR5VG9VcGRhdGUgPT09ICdiaW5kJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyICRwYXJlbnRFbCA9ICRlbC5jbG9zZXN0KCdbZGF0YS1mLWNvbnZlcnRdJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHBhcmVudEVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkcGFyZW50RWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gYXR0ckNvbnZlcnRlcnMuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydGVkVmFsdWUgPSBjb252ZXJ0ZXJNYW5hZ2VyLmNvbnZlcnQodmFsdWUsIGF0dHJDb252ZXJ0ZXJzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VG9VcGRhdGUgPSBwcm9wZXJ0eVRvVXBkYXRlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKHByb3BlcnR5VG9VcGRhdGUsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5oYW5kbGUuY2FsbCgkZWwsIGNvbnZlcnRlZFZhbHVlLCBwcm9wZXJ0eVRvVXBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy50cmlnZ2VyKS5vbihjb25maWcuZXZlbnRzLnRyaWdnZXIsIGZ1bmN0aW9uKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyc2VkRGF0YSA9IHt9OyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcblxuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcblxuICAgICAgICAgICAgICAgICAgICAvL2YtY29udmVydGVycy0qIGlzIGFscmVhZHkgc2V0IHdoaWxlIHBhcnNpbmcgdGhlIHZhcm1hcCwgYXMgYW4gYXJyYXkgdG8gYm9vdFxuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0ZXJzLWJpbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyICRwYXJlbnRFbCA9ICRlbC5jbG9zZXN0KCdbZGF0YS1mLWNvbnZlcnRdJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRwYXJlbnRFbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRwYXJlbnRFbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9IGF0dHJDb252ZXJ0ZXJzLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXkgPSBrZXkuc3BsaXQoJ3wnKVswXS50cmltKCk7IC8vaW4gY2FzZSB0aGUgcGlwZSBmb3JtYXR0aW5nIHN5bnRheCB3YXMgdXNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gY29udmVydGVyTWFuYWdlci5wYXJzZSh2YWwsIGF0dHJDb252ZXJ0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGFba2V5XSA9IHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2gocGFyc2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoJ2YudWkub3BlcmF0ZScpLm9uKCdmLnVpLm9wZXJhdGUnLCBmdW5jdGlvbihldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YSA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkYXRhKTsgLy9pZiBub3QgYWxsIHN1YnNlcXVlbnQgbGlzdGVuZXJzIHdpbGwgZ2V0IHRoZSBtb2RpZmllZCBkYXRhXG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLm9wZXJhdGlvbnMsIGZ1bmN0aW9uIChvcG4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgb3BuLnBhcmFtcyA9IF8ubWFwKG9wbi5wYXJhbXMsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKCQudHJpbSh2YWwpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLm9wZXJhdGlvbnMucHVibGlzaChkYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59KCkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmFyc0NoYW5uZWwgPSByZXF1aXJlKCcuL3ZhcmlhYmxlcy1jaGFubmVsJyk7XG52YXIgT3BlcmF0aW9uc0NoYW5uZWwgPSByZXF1aXJlKCcuL29wZXJhdGlvbnMtY2hhbm5lbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHt9O1xuICAgIH1cblxuICAgIHZhciBydW5wYXJhbXMgPSBjb25maWc7XG5cbiAgICB2YXIgcnMgPSBuZXcgRi5zZXJ2aWNlLlJ1bihydW5wYXJhbXMpO1xuXG4gICAgd2luZG93LnJ1biA9IHJzO1xuICAgIC8vVE9ETzogc3RvcmUgcnVuaWQgaW4gdG9rZW4gZXRjLiBCdXQgaWYgeW91IGRvIHRoaXMsIG1ha2Ugc3VyZSB5b3UgcmVtb3ZlIHRva2VuIG9uIHJlc2V0XG4gICAgdmFyICRjcmVhdGlvblByb21pc2UgPSBycy5jcmVhdGUoY29uZmlnLm1vZGVsKTtcbiAgICBycy5jdXJyZW50UHJvbWlzZSA9ICRjcmVhdGlvblByb21pc2U7XG5cbiAgICB2YXIgY3JlYXRlQW5kVGhlbiA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0KSB7XG4gICAgICAgIHJldHVybiBfLndyYXAodmFsdWUsIGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgIHZhciBwYXNzZWRJblBhcmFtcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDEpO1xuICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCl7XG4gICAgICAgICAgICAgICAgcnMuY3VycmVudFByb21pc2UgPSBmdW5jLmFwcGx5KGNvbnRleHQsIHBhc3NlZEluUGFyYW1zKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vTWFrZSBzdXJlIG5vdGhpbmcgaGFwcGVucyBiZWZvcmUgdGhlIHJ1biBpcyBjcmVhdGVkXG4gICAgXy5lYWNoKHJzLCBmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICBpZiAoJC5pc0Z1bmN0aW9uKHZhbHVlKSAmJiBuYW1lICE9PSAndmFyaWFibGVzJykge1xuICAgICAgICAgICAgcnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCBycyk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgdnMgPSBycy52YXJpYWJsZXMoKTtcbiAgICBfLmVhY2godnMsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIGlmICgkLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICB2c1tuYW1lXSA9IGNyZWF0ZUFuZFRoZW4odmFsdWUsIHZzKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5ydW4gPSBycztcbiAgICB0aGlzLnZhcmlhYmxlcyA9IG5ldyBWYXJzQ2hhbm5lbCh7cnVuOiBycywgdmVudDogdGhpc30pO1xuICAgIHRoaXMub3BlcmF0aW9ucyA9IG5ldyBPcGVyYXRpb25zQ2hhbm5lbCh7cnVuOiBycywgdmVudDogdGhpc30pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByZWZpeDogJ2YnLFxuICAgIGRlZmF1bHRBdHRyOiAnYmluZCcsXG5cbiAgICBiaW5kZXJBdHRyOiAnZi1iaW5kJyxcblxuICAgIGV2ZW50czoge1xuICAgICAgICB0cmlnZ2VyOiAndXBkYXRlLmYudWknLFxuICAgICAgICByZWFjdDogJ3VwZGF0ZS5mLm1vZGVsJ1xuICAgIH1cblxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0b0ltcGxpY2l0VHlwZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJicmFjZSA9IC9eKD86XFx7LipcXH18XFxbLipcXF0pJC87XG4gICAgICAgIHZhciBjb252ZXJ0ZWQgPSBkYXRhO1xuICAgICAgICBpZiAoIHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJyApIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkYXRhID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkYXRhID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZGF0YSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYoY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1xcJycgfHwgY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGRhdGEuc3Vic3RyaW5nKDEsIGRhdGEubGVuZ3RoIC0xKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCQuaXNOdW1lcmljKCBkYXRhICkpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSArZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCByYnJhY2UudGVzdCggZGF0YSApKSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPOiBUaGlzIG9ubHkgd29ya3Mgd2l0aCBkb3VibGUgcXVvdGVzLCBpLmUuLCBbMSxcIjJcIl0gd29ya3MgYnV0IG5vdCBbMSwnMiddXG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJC5wYXJzZUpTT04oIGRhdGEgKSA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHt9O1xuICAgIH1cbiAgICB2YXIgcnVuID0gY29uZmlnLnJ1bjtcbiAgICB2YXIgdmVudCA9IGNvbmZpZy52ZW50O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgbGlzdGVuZXJNYXA6IHt9LFxuXG4gICAgICAgIC8vQ2hlY2sgZm9yIHVwZGF0ZXNcbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24ob3BlcmF0aW9uLHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAvLyB2YXIgRElSVFlfT1BFUkFUSU9OUyA9IFsnc3RhcnRfZ2FtZScsICdpbml0aWFsaXplJywgJ3N0ZXAnXTtcbiAgICAgICAgICAgIC8vIGlmIChfLmNvbnRhaW5zKERJUlRZX09QRVJBVElPTlMsIG9wZXJhdGlvbikpIHtcbiAgICAgICAgICAgICQodmVudCkudHJpZ2dlcignZGlydHknLCB7b3BuOiBvcGVyYXRpb24sIHJlc3BvbnNlOiByZXNwb25zZX0pO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBPcGVyYXRpb24gbmFtZSAmIHBhcmFtZXRlcnMgdG8gc2VuZCB0byBvcGVyYXRpb25zIEFQSVxuICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmcgfCBvYmplY3R9IG9wZXJhdGlvbiBOYW1lIG9mIE9wZXJhdGlvbi4gSWYgYXJyYXksIG5lZWRzIHRvIGJlIGluIHtvcGVyYXRpb25zOiBbe25hbWU6IG9wbiwgcGFyYW1zOltdfV0sIHNlcmlhbDogYm9vbGVhbn1dIGZvcm1hdFxuICAgICAgICAgKiBAcGFyYW0gIHsqfSBwYXJhbXMgKG9wdGlvbmFsKSAgIHBhcmFtcyB0byBzZW5kIHRvIG9wZXJ0YWlvblxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uKG9wZXJhdGlvbiwgcGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5vcGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gKG9wZXJhdGlvbi5zZXJpYWwpID8gcnVuLnNlcmlhbCA6IHJ1bi5wYXJhbGxlbDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbChydW4sIG9wZXJhdGlvbi5vcGVyYXRpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBfKG9wZXJhdGlvbi5vcGVyYXRpb25zKS5wbHVjaygnbmFtZScpLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogY2hlY2sgaWYgaW50ZXJwb2xhdGVkXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ1bi5kby5hcHBseShydW4sIGFyZ3VtZW50cylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIG9wZXJhdGlvbiwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdvcGVyYXRpb25zIHB1Ymxpc2gnLCBvcGVyYXRpb24sIHBhcmFtcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbihvcGVyYXRpb25zLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBzdWJzY3JpYmUnLCBvcGVyYXRpb25zLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIG9wZXJhdGlvbnMgPSBbXS5jb25jYXQob3BlcmF0aW9ucyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICAvL1RPRE86IHN1YnNjcmliZXIgY2FuIGJlIGEgZnVuY3Rpb25cbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbikge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC5vcGVyYXRpb24nKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICAkLmVhY2gob3BlcmF0aW9ucywgZnVuY3Rpb24oaW5kZXgsIG9wbikge1xuICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBtZS5saXN0ZW5lck1hcFtvcG5dLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbih2YXJpYWJsZSwgdG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJNYXAgPSBfLnJlamVjdCh0aGlzLmxpc3RlbmVyTWFwLCBmdW5jdGlvbihzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJNYXAgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICAvL25vbWFsaXplKCdmbGlwJywgZm4pXG4gICAgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIpKSB7XG4gICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgIGFsaWFzOiBhbGlhcyxcbiAgICAgICAgICAgIGNvbnZlcnQ6IGNvbnZlcnRlclxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pc09iamVjdChjb252ZXJ0ZXIpICYmIGNvbnZlcnRlci5jb252ZXJ0KSB7XG4gICAgICAgIGNvbnZlcnRlci5hbGlhcyA9IGFsaWFzO1xuICAgICAgICByZXQucHVzaChjb252ZXJ0ZXIpO1xuICAgIH1cbiAgICBlbHNlIGlmKF8uaXNPYmplY3QoYWxpYXMpKSB7XG4gICAgICAgIC8vbm9ybWFsaXplKHthbGlhczogJ2ZsaXAnLCBjb252ZXJ0OiBmdW5jdGlvbn0pXG4gICAgICAgIGlmIChhbGlhcy5jb252ZXJ0KSB7XG4gICAgICAgICAgICByZXQucHVzaChhbGlhcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBub3JtYWxpemUoe2ZsaXA6IGZ1bn0pXG4gICAgICAgICAgICAkLmVhY2goYWxpYXMsIGZ1bmN0aW9uIChrZXksIHZhbCkge1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgYWxpYXM6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgY29udmVydDogdmFsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIG1hdGNoQ29udmVydGVyID0gZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBhbGlhcyA9PT0gY29udmVydGVyLmFsaWFzO1xuICAgIH1cbiAgICBlbHNlIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzKGFsaWFzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pc1JlZ2V4KGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5hbGlhcy5tYXRjaChhbGlhcyk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjb252ZXJ0ZXJNYW5hZ2VyID0ge1xuICAgIHByaXZhdGU6IHtcbiAgICAgICAgbWF0Y2hDb252ZXJ0ZXI6IG1hdGNoQ29udmVydGVyXG4gICAgfSxcblxuICAgIGxpc3Q6IFtdLFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgY29udmVydGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfGZ1bmN0aW9ufHJlZ2V4fSBhbGlhcyBmb3JtYXR0ZXIgbmFtZVxuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gY29udmVydGVyICAgIGNvbnZlcnRlciBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24sIHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIHZhbHVlLCBvciBhbiBvYmplY3Qgd2l0aCB7YWxpYXM6ICcnLCBwYXJzZTogJC5ub29wLCBjb252ZXJ0OiAkLm5vb3B9XG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkID0gbm9ybWFsaXplKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB0aGlzLmxpc3QgPSBub3JtYWxpemVkLmNvbmNhdCh0aGlzLmxpc3QpO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbihhbGlhcywgY29udmVydGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oY3VycmVudENvbnZlcnRlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQ29udmVydGVyKGFsaWFzLCBjdXJyZW50Q29udmVydGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlcilbMF0pO1xuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXI6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQ29udmVydGVyKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSl7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydGVyLmNvbnZlcnQoY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvdW50ZXItcGFydCB0byAnY29udmVydCcuIFRyYW5zbGF0ZXMgY29udmVydGVkIHZhbHVlcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGZvcm1cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHBhcnNlXG4gICAgICogQHBhcmFtICB7U3RyaW5nIHwgQXJyYXl9IGxpc3QgIExpc3Qgb2YgcGFyc2VycyB0byBydW4gdGhpcyB0aHJvdWdoLiBPdXRlcm1vc3QgaXMgaW52b2tlZCBmaXJzdFxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KS5yZXZlcnNlKCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKXtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZXIgPSBtZS5nZXRDb252ZXJ0ZXIoY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICBpZiAoY29udmVydGVyLnBhcnNlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydGVyLnBhcnNlKGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgIH1cbn07XG5cblxuLy9Cb290c3RyYXBcbnZhciBkZWZhdWx0Y29udmVydGVycyA9IFtcbiAgICByZXF1aXJlKCcuL251bWJlci1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL3N0cmluZy1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL2FycmF5LWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vbnVtYmVyZm9ybWF0LWNvbnZlcnRlcicpLFxuXTtcblxuJC5lYWNoKGRlZmF1bHRjb252ZXJ0ZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24oaW5kZXgsIGNvbnZlcnRlcikge1xuICAgIGNvbnZlcnRlck1hbmFnZXIucmVnaXN0ZXIoY29udmVydGVyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnZlcnRlck1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgICBzZWxlY3RvciA9ICcqJztcbiAgICB9XG4gICAgaGFuZGxlci5zZWxlY3RvciA9IHNlbGVjdG9yO1xuICAgIHJldHVybiBoYW5kbGVyO1xufTtcblxudmFyIG1hdGNoID0gZnVuY3Rpb24gKHRvTWF0Y2gsIG5vZGUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyh0b01hdGNoKSkge1xuICAgICAgICByZXR1cm4gdG9NYXRjaCA9PT0gbm9kZS5zZWxlY3RvcjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiAkKHRvTWF0Y2gpLmlzKG5vZGUuc2VsZWN0b3IpO1xuICAgIH1cbn07XG5cbnZhciBub2RlTWFuYWdlciA9IHtcbiAgICBsaXN0OiBbXSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBub2RlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IHNlbGVjdG9yIGpRdWVyeS1jb21wYXRpYmxlIHNlbGVjdG9yIHRvIHVzZSB0byBtYXRjaCBub2Rlc1xuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyICBIYW5kbGVycyBhcmUgbmV3LWFibGUgZnVuY3Rpb25zLiBUaGV5IHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsIGFzIGNvbnRleHQuPyBUT0RPOiBUaGluayB0aGlzIHRocm91Z2hcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMubGlzdC51bnNoaWZ0KG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoKHNlbGVjdG9yLCBub2RlKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHJlcGxhY2U6IGZ1bmN0aW9uKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oY3VycmVudEhhbmRsZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gY3VycmVudEhhbmRsZXIuc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5saXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKHNlbGVjdG9yLCBoYW5kbGVyKSk7XG4gICAgfVxufTtcblxuLy9ib290c3RyYXBzXG52YXIgZGVmYXVsdEhhbmRsZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vaW5wdXQtY2hlY2tib3gtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1pbnB1dC1ub2RlJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKVxuXTtcbl8uZWFjaChkZWZhdWx0SGFuZGxlcnMucmV2ZXJzZSgpLCBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgbm9kZU1hbmFnZXIucmVnaXN0ZXIoaGFuZGxlci5zZWxlY3RvciwgaGFuZGxlcik7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBub2RlTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL25vLW9wLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2V2ZW50cy9pbml0LWV2ZW50LWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2V2ZW50cy9kZWZhdWx0LWV2ZW50LWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvaW5wdXQtYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9jbGFzcy1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9wb3NpdGl2ZS1ib29sZWFuLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL25lZ2F0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvZGVmYXVsdC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtYXR0cicpXG5dO1xuXG52YXIgaGFuZGxlcnNMaXN0ID0gW107XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYXR0cmlidXRlTWF0Y2hlciwgbm9kZU1hdGNoZXIsIGhhbmRsZXIpIHtcbiAgICBpZiAoIW5vZGVNYXRjaGVyKSB7XG4gICAgICAgIG5vZGVNYXRjaGVyID0gJyonO1xuICAgIH1cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuICQuZXh0ZW5kKGhhbmRsZXIsIHt0ZXN0OiBhdHRyaWJ1dGVNYXRjaGVyLCB0YXJnZXQ6IG5vZGVNYXRjaGVyfSk7XG59O1xuXG4kLmVhY2goZGVmYXVsdEhhbmRsZXJzLCBmdW5jdGlvbihpbmRleCwgaGFuZGxlcikge1xuICAgIGhhbmRsZXJzTGlzdC5wdXNoKG5vcm1hbGl6ZShoYW5kbGVyLnRlc3QsIGhhbmRsZXIudGFyZ2V0LCBoYW5kbGVyKSk7XG59KTtcblxuXG52YXIgbWF0Y2hBdHRyID0gZnVuY3Rpb24gKG1hdGNoRXhwciwgYXR0ciwgJGVsKSB7XG4gICAgdmFyIGF0dHJNYXRjaDtcblxuICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgYXR0ck1hdGNoID0gKG1hdGNoRXhwciA9PT0gJyonIHx8IChtYXRjaEV4cHIudG9Mb3dlckNhc2UoKSA9PT0gYXR0ci50b0xvd2VyQ2FzZSgpKSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKF8uaXNGdW5jdGlvbihtYXRjaEV4cHIpKSB7XG4gICAgICAgIC8vVE9ETzogcmVtb3ZlIGVsZW1lbnQgc2VsZWN0b3JzIGZyb20gYXR0cmlidXRlc1xuICAgICAgICBhdHRyTWF0Y2ggPSBtYXRjaEV4cHIoYXR0ciwgJGVsKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pc1JlZ0V4cChtYXRjaEV4cHIpKSB7XG4gICAgICAgIGF0dHJNYXRjaCA9IGF0dHIubWF0Y2gobWF0Y2hFeHByKTtcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJNYXRjaDtcbn07XG5cbnZhciBtYXRjaE5vZGUgPSBmdW5jdGlvbiAodGFyZ2V0LCBub2RlRmlsdGVyKSB7XG4gICAgcmV0dXJuIChfLmlzU3RyaW5nKG5vZGVGaWx0ZXIpKSA/IChub2RlRmlsdGVyID09PSB0YXJnZXQpIDogbm9kZUZpbHRlci5pcyh0YXJnZXQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaGFuZGxlcnNMaXN0LFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgaGFuZGxlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ3xmdW5jdGlvbnxyZWdleH0gYXR0cmlidXRlTWF0Y2hlciBEZXNjcmlwdGlvbiBvZiB3aGljaCBhdHRyaWJ1dGVzIHRvIG1hdGNoXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBub2RlTWF0Y2hlciAgICAgIFdoaWNoIG5vZGVzIHRvIGFsbCBhdHRyaWJ1dGVzIHRvLiBVc2UganF1ZXJ5IFNlbGVjdG9yIHN5bnRheFxuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gaGFuZGxlciAgICBIYW5kbGVyIGNhbiBlaXRoZXIgYmUgYSBmdW5jdGlvbiAoVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsZW1lbnQgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUpLCBvciBhbiBvYmplY3Qgd2l0aCB7aW5pdDogZm4sICBoYW5kbGU6IGZufS4gVGhlIGluaXQgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbiBwYWdlIGxvYWRzOyB1c2UgdGhpcyB0byBkZWZpbmUgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJzTGlzdC51bnNoaWZ0KG5vcm1hbGl6ZS5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBhbiBhdHRyaWJ1dGUgbWF0Y2hlciBtYXRjaGluZyBzb21lIGNyaXRlcmlhXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBhdHRyRmlsdGVyIGF0dHJpYnV0ZSB0byBtYXRjaFxuICAgICAqIEBwYXJhbSAge3N0cmluZyB8ICRlbH0gbm9kZUZpbHRlciBub2RlIHRvIG1hdGNoXG4gICAgICogQHJldHVybiB7YXJyYXl8bnVsbH1cbiAgICAgKi9cbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIpIHtcbiAgICAgICAgdmFyIGZpbHRlcmVkID0gXy5zZWxlY3QoaGFuZGxlcnNMaXN0LCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQXR0cihoYW5kbGVyLnRlc3QsIGF0dHJGaWx0ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG5vZGVGaWx0ZXIpIHtcbiAgICAgICAgICAgIGZpbHRlcmVkID0gXy5zZWxlY3QoZmlsdGVyZWQsIGZ1bmN0aW9uIChoYW5kbGVyKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hOb2RlKGhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24oYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hBdHRyKGN1cnJlbnRIYW5kbGVyLnRlc3QsIGF0dHJGaWx0ZXIpICYmIG1hdGNoTm9kZShjdXJyZW50SGFuZGxlci50YXJnZXQsIG5vZGVGaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGhhbmRsZXJzTGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShhdHRyRmlsdGVyLCBub2RlRmlsdGVyLCBoYW5kbGVyKSk7XG4gICAgfSxcblxuICAgIGdldEhhbmRsZXI6IGZ1bmN0aW9uKHByb3BlcnR5LCAkZWwpIHtcbiAgICAgICAgdmFyIGZpbHRlcmVkID0gdGhpcy5maWx0ZXIocHJvcGVydHksICRlbCk7XG4gICAgICAgIC8vVGhlcmUgY291bGQgYmUgbXVsdGlwbGUgbWF0Y2hlcywgYnV0IHRoZSB0b3AgZmlyc3QgaGFzIHRoZSBtb3N0IHByaW9yaXR5XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZFswXTtcbiAgICB9XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIHZhciB2cyA9IG9wdGlvbnMucnVuLnZhcmlhYmxlcygpO1xuICAgIHZhciB2ZW50ICA9IG9wdGlvbnMudmVudDtcblxuICAgIHZhciBjdXJyZW50RGF0YSA9IHt9O1xuXG4gICAgLy9UT0RPOiBhY3R1YWxseSBjb21wYXJlIG9iamVjdHMgYW5kIHNvIG9uXG4gICAgdmFyIGlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIGdldElubmVyVmFyaWFibGVzID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgIHZhciBpbm5lciA9IHN0ci5tYXRjaCgvPCguKj8pPi9nKTtcbiAgICAgICAgaW5uZXIgPSBfLm1hcChpbm5lciwgZnVuY3Rpb24odmFsKXtcbiAgICAgICAgICAgIHJldHVybiB2YWwuc3Vic3RyaW5nKDEsIHZhbC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpbm5lcjtcbiAgICB9O1xuXG4gICAgLy9SZXBsYWNlcyBzdHViYmVkIG91dCBrZXluYW1lcyBpbiB2YXJpYWJsZXN0b2ludGVycG9sYXRlIHdpdGggdGhlaXIgY29ycmVzcG9uZGluZyBjYWx1ZXNcbiAgICB2YXIgaW50ZXJwb2xhdGUgPSBmdW5jdGlvbih2YXJpYWJsZXNUb0ludGVycG9sYXRlLCB2YWx1ZXMpIHtcbiAgICAgICAgdmFyIGludGVycG9sYXRpb25NYXAgPSB7fTtcbiAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IHt9O1xuXG4gICAgICAgIF8uZWFjaCh2YXJpYWJsZXNUb0ludGVycG9sYXRlLCBmdW5jdGlvbiAodmFsLCBvdXRlclZhcmlhYmxlKSB7XG4gICAgICAgICAgICB2YXIgaW5uZXIgPSBnZXRJbm5lclZhcmlhYmxlcyhvdXRlclZhcmlhYmxlKTtcbiAgICAgICAgICAgIHZhciBvcmlnaW5hbE91dGVyID0gb3V0ZXJWYXJpYWJsZTtcbiAgICAgICAgICAgICQuZWFjaChpbm5lciwgZnVuY3Rpb24oaW5kZXgsIGlubmVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGhpc3ZhbCA9IHZhbHVlc1tpbm5lclZhcmlhYmxlXTtcbiAgICAgICAgICAgICAgICBpZiAodGhpc3ZhbCAhPT0gbnVsbCAmJiB0aGlzdmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0aGlzdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9Gb3IgYXJyYXllZCB0aGluZ3MgZ2V0IHRoZSBsYXN0IG9uZSBmb3IgaW50ZXJwb2xhdGlvbiBwdXJwb3Nlc1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc3ZhbCA9IHRoaXN2YWxbdGhpc3ZhbC5sZW5ndGggLTFdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG91dGVyVmFyaWFibGUgPSBvdXRlclZhcmlhYmxlLnJlcGxhY2UoJzwnICsgaW5uZXJWYXJpYWJsZSArICc+JywgdGhpc3ZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdID0gb3JpZ2luYWxPdXRlcjtcbiAgICAgICAgICAgIGludGVycG9sYXRlZFtvdXRlclZhcmlhYmxlXSA9IHZhbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGludGVycG9sYXRlZDogaW50ZXJwb2xhdGVkLFxuICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcDogaW50ZXJwb2xhdGlvbk1hcFxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgcHVibGljQVBJID0ge1xuICAgICAgICAvL2ZvciB0ZXN0aW5nLCB0byBiZSByZW1vdmVkIGxhdGVyXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIGdldElubmVyVmFyaWFibGVzOiBnZXRJbm5lclZhcmlhYmxlcyxcbiAgICAgICAgICAgIGludGVycG9sYXRlOiBpbnRlcnBvbGF0ZVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vSW50ZXJwb2xhdGVkIHZhcmlhYmxlcyB3aGljaCBuZWVkIHRvIGJlIHJlc29sdmVkIGJlZm9yZSB0aGUgb3V0ZXIgb25lcyBjYW4gYmVcbiAgICAgICAgaW5uZXJWYXJpYWJsZXNMaXN0OiBbXSxcbiAgICAgICAgdmFyaWFibGVMaXN0ZW5lck1hcDoge30sXG5cbiAgICAgICAgLy9DaGVjayBmb3IgdXBkYXRlc1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICAgIHZhciBnZXRWYXJpYWJsZXMgPSBmdW5jdGlvbih2YXJzLCBpcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeSh2YXJzKS50aGVuKGZ1bmN0aW9uKHZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnR290IHZhcmlhYmxlcycsIHZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaCh2YXJpYWJsZXMsIGZ1bmN0aW9uKHZhbHVlLCB2bmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9sZFZhbHVlID0gY3VycmVudERhdGFbdm5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0VxdWFsKHZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50RGF0YVt2bmFtZV0gPSB2YWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2biA9IChpcCAmJiBpcFt2bmFtZV0pID8gaXBbdm5hbWVdIDogdm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUubm90aWZ5KHZuLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChtZS5pbm5lclZhcmlhYmxlc0xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KG1lLmlubmVyVmFyaWFibGVzTGlzdCkudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2lubmVyJywgaW5uZXJWYXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICAkLmV4dGVuZChjdXJyZW50RGF0YSwgaW5uZXJWYXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXAgPSAgaW50ZXJwb2xhdGUobWUudmFyaWFibGVMaXN0ZW5lck1hcCwgaW5uZXJWYXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb3V0ZXIgPSBfLmtleXMoaXAuaW50ZXJwb2xhdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgZ2V0VmFyaWFibGVzKG91dGVyLCBpcC5pbnRlcnBvbGF0aW9uTWFwKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBnZXRWYXJpYWJsZXMoXy5rZXlzKG1lLnZhcmlhYmxlTGlzdGVuZXJNYXApKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9LFxuXG4gICAgICAgIG5vdGlmeTogZnVuY3Rpb24gKHZhcmlhYmxlLCB2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMudmFyaWFibGVMaXN0ZW5lck1hcFt2YXJpYWJsZV07XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXNbdmFyaWFibGVdID0gdmFsdWU7XG5cbiAgICAgICAgICAgIF8uZWFjaChsaXN0ZW5lcnMsIGZ1bmN0aW9uIChsaXN0ZW5lcil7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXIudGFyZ2V0LnRyaWdnZXIoY29uZmlnLmV2ZW50cy5yZWFjdCwgcGFyYW1zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uKHZhcmlhYmxlLCB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3B1Ymxpc2gnLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgaWYgaW50ZXJwb2xhdGVkXG4gICAgICAgICAgICB2YXIgYXR0cnM7XG4gICAgICAgICAgICBpZiAoJC5pc1BsYWluT2JqZWN0KHZhcmlhYmxlKSkge1xuICAgICAgICAgICAgICAgIGF0dHJzID0gdmFyaWFibGU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIChhdHRycyA9IHt9KVt2YXJpYWJsZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBpbnRlcnBvbGF0ZWQgPSBpbnRlcnBvbGF0ZShhdHRycywgY3VycmVudERhdGEpLmludGVycG9sYXRlZDtcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHZzLnNhdmUuY2FsbCh2cywgaW50ZXJwb2xhdGVkKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uKHByb3BlcnRpZXMsIHN1YnNjcmliZXIpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdzdWJzY3JpYmluZycsIHByb3BlcnRpZXMsIHN1YnNjcmliZXIpO1xuXG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gW10uY29uY2F0KHByb3BlcnRpZXMpO1xuICAgICAgICAgICAgLy91c2UganF1ZXJ5IHRvIG1ha2UgZXZlbnQgc2lua1xuICAgICAgICAgICAgLy9UT0RPOiBzdWJzY3JpYmVyIGNhbiBiZSBhIGZ1bmN0aW9uXG4gICAgICAgICAgICBpZiAoIXN1YnNjcmliZXIub24pIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpYmVyID0gJChzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGlkICA9IF8udW5pcXVlSWQoJ2VwaWNoYW5uZWwudmFyaWFibGUnKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICAkLmVhY2gocHJvcGVydGllcywgZnVuY3Rpb24oaW5kZXgsIHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXMocHJvcGVydHkpO1xuICAgICAgICAgICAgICAgIGlmIChpbm5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWUuaW5uZXJWYXJpYWJsZXNMaXN0ID0gbWUuaW5uZXJWYXJpYWJsZXNMaXN0LmNvbmNhdChpbm5lcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1lLmlubmVyVmFyaWFibGVzTGlzdCA9IF8udW5pcShtZS5pbm5lclZhcmlhYmxlc0xpc3QpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFtZS52YXJpYWJsZUxpc3RlbmVyTWFwW3Byb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgICAgICBtZS52YXJpYWJsZUxpc3RlbmVyTWFwW3Byb3BlcnR5XSA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtZS52YXJpYWJsZUxpc3RlbmVyTWFwW3Byb3BlcnR5XSA9IG1lLnZhcmlhYmxlTGlzdGVuZXJNYXBbcHJvcGVydHldLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbih2YXJpYWJsZSwgdG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMudmFyaWFibGVMaXN0ZW5lck1hcCA9IF8ucmVqZWN0KHRoaXMudmFyaWFibGVMaXN0ZW5lck1hcCwgZnVuY3Rpb24oc3Vicykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdWJzLmlkID09PSB0b2tlbjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICB1bnN1YnNjcmliZUFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXAgPSB7fTtcbiAgICAgICAgICAgIHRoaXMuaW5uZXJWYXJpYWJsZXNMaXN0ID0gW107XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbiAgICB2YXIgbWUgPSB0aGlzO1xuICAgICQodmVudCkub24oJ2RpcnR5JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBtZS5yZWZyZXNoLmFwcGx5KG1lLCBhcmd1bWVudHMpO1xuICAgIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFsaWFzOiAnaScsXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KHZhbHVlLCAxMCk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHM6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuIHZhbCArICcnO1xuICAgIH0sXG5cbiAgICB1cHBlckNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuICh2YWwgKyAnJykudG9VcHBlckNhc2UoKTtcbiAgICB9LFxuICAgIGxvd2VyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgIH0sXG4gICAgdGl0bGVDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IHZhbCArICcnO1xuICAgICAgICByZXR1cm4gdmFsLnJlcGxhY2UoL1xcd1xcUyovZywgZnVuY3Rpb24odHh0KXtyZXR1cm4gdHh0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdHh0LnN1YnN0cigxKS50b0xvd2VyQ2FzZSgpO30pO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsaXN0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiBbXS5jb25jYXQodmFsKTtcbiAgICB9LFxuICAgIGxhc3Q6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgIHJldHVybiB2YWxbdmFsLmxlbmd0aCAtIDFdO1xuICAgIH0sXG4gICAgZmlyc3Q6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgIHJldHVybiB2YWxbMF07XG4gICAgfSxcbiAgICBwcmV2aW91czogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgcmV0dXJuICh2YWwubGVuZ3RoIDw9IDEpID8gdmFsWzBdIDogdmFsW3ZhbC5sZW5ndGggLSAyXTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYWxpYXM6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIC8vVE9ETzogRmFuY3kgcmVnZXggdG8gbWF0Y2ggbnVtYmVyIGZvcm1hdHMgaGVyZVxuICAgICAgICByZXR1cm4gKG5hbWUuaW5kZXhPZignIycpICE9PSAtMSB8fCBuYW1lLmluZGV4T2YoJzAnKSAhPT0gLTEgKTtcbiAgICB9LFxuXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsKz0gJyc7XG4gICAgICAgIHZhciBpc05lZ2F0aXZlID0gdmFsLmNoYXJBdCgwKSA9PT0gJy0nO1xuXG4gICAgICAgIHZhbCAgPSB2YWwucmVwbGFjZSgvLC9nLCAnJyk7XG4gICAgICAgIHZhciBmbG9hdE1hdGNoZXIgPSAvKFstK10/WzAtOV0qXFwuP1swLTldKykoSz9NP0I/JT8pL2k7XG4gICAgICAgIHZhciByZXN1bHRzID0gZmxvYXRNYXRjaGVyLmV4ZWModmFsKTtcbiAgICAgICAgdmFyIG51bWJlciwgc3VmZml4ID0gJyc7XG4gICAgICAgIGlmKHJlc3VsdHMgJiYgcmVzdWx0c1sxXSl7XG4gICAgICAgICAgICBudW1iZXIgPSByZXN1bHRzWzFdO1xuICAgICAgICB9XG4gICAgICAgIGlmKHJlc3VsdHMgJiYgcmVzdWx0c1syXSl7XG4gICAgICAgICAgICBzdWZmaXggPSByZXN1bHRzWzJdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2goc3VmZml4KXtcbiAgICAgICAgICAgIGNhc2UgJyUnOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAvIDEwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2snOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBudW1iZXIgPSBwYXJzZUZsb2F0KG51bWJlcik7XG4gICAgICAgIGlmKGlzTmVnYXRpdmUgJiYgbnVtYmVyID4gMCkge1xuICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogLTE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bWJlcjtcbiAgICB9LFxuXG4gICAgY29udmVydDogKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHZhciBzY2FsZXMgPSBbJycsICdLJywgJ00nLCAnQicsICdUJ107XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0RGlnaXRzKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPT09IDAgPyAwIDogcm91bmRUbyh2YWx1ZSwgTWF0aC5tYXgoMCwgZGlnaXRzIC0gTWF0aC5jZWlsKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4xMCkpKTtcblxuICAgICAgICAgICAgdmFyIFRYVCA9ICcnO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbFNldCA9IGZhbHNlO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpVFhUID0gMDsgaVRYVCA8IG51bWJlclRYVC5sZW5ndGg7IGlUWFQrKykge1xuICAgICAgICAgICAgICAgIFRYVCArPSBudW1iZXJUWFQuY2hhckF0KGlUWFQpO1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJUWFQuY2hhckF0KGlUWFQpID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVjaW1hbFNldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGRpZ2l0cyA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBUWFQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRlY2ltYWxTZXQpIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJy4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2hpbGUgKGRpZ2l0cyA+IDApIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgIGRpZ2l0cy0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZERlY2ltYWxzKHZhbHVlLCBkZWNpbWFscywgbWluRGVjaW1hbHMsIGhhc0NvbW1hcykge1xuICAgICAgICAgICAgaGFzQ29tbWFzID0gaGFzQ29tbWFzIHx8IHRydWU7XG4gICAgICAgICAgICB2YXIgbnVtYmVyVFhUID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBoYXNEZWNpbWFscyA9IChudW1iZXJUWFQuc3BsaXQoJy4nKS5sZW5ndGggPiAxKTtcbiAgICAgICAgICAgIHZhciBpRGVjID0gMDtcblxuICAgICAgICAgICAgaWYgKGhhc0NvbW1hcykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGlDaGFyID0gbnVtYmVyVFhULmxlbmd0aCAtIDE7IGlDaGFyID4gMDsgaUNoYXItLSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzRGVjaW1hbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0RlY2ltYWxzID0gKG51bWJlclRYVC5jaGFyQXQoaUNoYXIpICE9PSAnLicpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaURlYyA9IChpRGVjICsgMSkgJSAzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlEZWMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgPSBudW1iZXJUWFQuc3Vic3RyKDAsIGlDaGFyKSArICcsJyArIG51bWJlclRYVC5zdWJzdHIoaUNoYXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGVjaW1hbHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvQUREO1xuICAgICAgICAgICAgICAgIGlmIChudW1iZXJUWFQuc3BsaXQoJy4nKS5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICB0b0FERCA9IG1pbkRlY2ltYWxzO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9BREQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgKz0gJy4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BREQgPSBtaW5EZWNpbWFscyAtIG51bWJlclRYVC5zcGxpdCgnLicpWzFdLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAodG9BREQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCArPSAnMCc7XG4gICAgICAgICAgICAgICAgICAgIHRvQURELS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bWJlclRYVDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJvdW5kVG8odmFsdWUsIGRpZ2l0cykge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQodmFsdWUgKiBNYXRoLnBvdygxMCwgZGlnaXRzKSkgLyBNYXRoLnBvdygxMCwgZGlnaXRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFN1ZmZpeChmb3JtYXRUWFQpIHtcbiAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5yZXBsYWNlKCcuJywgJycpO1xuICAgICAgICAgICAgdmFyIGZpeGVzVFhUID0gZm9ybWF0VFhULnNwbGl0KG5ldyBSZWdFeHAoJ1swfCx8I10rJywgJ2cnKSk7XG4gICAgICAgICAgICByZXR1cm4gKGZpeGVzVFhULmxlbmd0aCA+IDEpID8gZml4ZXNUWFRbMV0udG9TdHJpbmcoKSA6ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXNDdXJyZW5jeShzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBzID0gJC50cmltKHN0cmluZyk7XG5cbiAgICAgICAgICAgIGlmIChzID09PSAnJCcgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCrCcgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCpScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCoycgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCoScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCsScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnS8OEPycgfHxcbiAgICAgICAgICAgICAgICBzID09PSAna3InIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqInIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqonIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OG4oCZJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKpJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKrJykge1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdChudW1iZXIsIGZvcm1hdFRYVCkge1xuICAgICAgICAgICAgaWYgKF8uaXNBcnJheShudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyW251bWJlci5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhudW1iZXIpICYmICFfLmlzTnVtYmVyKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZvcm1hdFRYVCB8fCBmb3JtYXRUWFQudG9Mb3dlckNhc2UoKSA9PT0gJ2RlZmF1bHQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bWJlci50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaXNOYU4obnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnPyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vdmFyIGZvcm1hdFRYVDtcbiAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5yZXBsYWNlKCcmZXVybzsnLCAnw6LigJrCrCcpO1xuXG4gICAgICAgICAgICAvLyBEaXZpZGUgKy8tIE51bWJlciBGb3JtYXRcbiAgICAgICAgICAgIHZhciBmb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCc7Jyk7XG4gICAgICAgICAgICBpZiAoZm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm1hdChNYXRoLmFicyhudW1iZXIpLCBmb3JtYXRzWygobnVtYmVyID49IDApID8gMCA6IDEpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgU2lnblxuICAgICAgICAgICAgdmFyIHNpZ24gPSAobnVtYmVyID49IDApID8gJycgOiAnLSc7XG4gICAgICAgICAgICBudW1iZXIgPSBNYXRoLmFicyhudW1iZXIpO1xuXG5cbiAgICAgICAgICAgIHZhciBsZWZ0T2ZEZWNpbWFsID0gZm9ybWF0VFhUO1xuICAgICAgICAgICAgdmFyIGQgPSBsZWZ0T2ZEZWNpbWFsLmluZGV4T2YoJy4nKTtcbiAgICAgICAgICAgIGlmIChkID4gLTEpIHtcbiAgICAgICAgICAgICAgICBsZWZ0T2ZEZWNpbWFsID0gbGVmdE9mRGVjaW1hbC5zdWJzdHJpbmcoMCwgZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkID0gbGVmdE9mRGVjaW1hbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gbm9ybWFsaXplZC5sYXN0SW5kZXhPZigncycpO1xuICAgICAgICAgICAgdmFyIGlzU2hvcnRGb3JtYXQgPSBpbmRleCA+IC0xO1xuXG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0Q2hhciA9IGxlZnRPZkRlY2ltYWwuY2hhckF0KGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSAnICcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNTaG9ydEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxlYWRpbmdUZXh0ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHJpbmcoMCwgaW5kZXgpIDogJyc7XG4gICAgICAgICAgICB2YXIgcmlnaHRPZlByZWZpeCA9IGlzU2hvcnRGb3JtYXQgPyBmb3JtYXRUWFQuc3Vic3RyKGluZGV4ICsgMSkgOiBmb3JtYXRUWFQuc3Vic3RyKGluZGV4KTtcblxuICAgICAgICAgICAgLy9maXJzdCBjaGVjayB0byBtYWtlIHN1cmUgJ3MnIGlzIGFjdHVhbGx5IHNob3J0IGZvcm1hdCBhbmQgbm90IHBhcnQgb2Ygc29tZSBsZWFkaW5nIHRleHRcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNob3J0Rm9ybWF0VGVzdCA9IC9bMC05IypdLztcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0UmVzdWx0ID0gcmlnaHRPZlByZWZpeC5tYXRjaChzaG9ydEZvcm1hdFRlc3QpO1xuICAgICAgICAgICAgICAgIGlmICghc2hvcnRGb3JtYXRUZXN0UmVzdWx0IHx8IHNob3J0Rm9ybWF0VGVzdFJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy9ubyBzaG9ydCBmb3JtYXQgY2hhcmFjdGVycyBzbyB0aGlzIG11c3QgYmUgbGVhZGluZyB0ZXh0IGllLiAnd2Vla3MgJ1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGxlYWRpbmdUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2lmIChmb3JtYXRUWFQuY2hhckF0KDApID09ICdzJylcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbFNjYWxlID0gbnVtYmVyID09PSAwID8gMCA6IE1hdGguZmxvb3IoTWF0aC5sb2coTWF0aC5hYnMobnVtYmVyKSkgLyAoMyAqIE1hdGguTE4xMCkpO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gKChudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKSkgPCAxMDAwKSA/IHZhbFNjYWxlIDogKHZhbFNjYWxlICsgMSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1heCh2YWxTY2FsZSwgMCk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1pbih2YWxTY2FsZSwgNCk7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyIC8gTWF0aC5wb3coMTAsIDMgKiB2YWxTY2FsZSk7XG4gICAgICAgICAgICAgICAgLy9pZiAoIWlzTmFOKE51bWJlcihmb3JtYXRUWFQuc3Vic3RyKDEpICkgKSApXG5cbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKE51bWJlcihyaWdodE9mUHJlZml4KSkgJiYgcmlnaHRPZlByZWZpeC5pbmRleE9mKCcuJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaW1pdERpZ2l0cyA9IE51bWJlcihyaWdodE9mUHJlZml4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bWJlciA8IE1hdGgucG93KDEwLCBsaW1pdERpZ2l0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHNpZ24gKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBNYXRoLnJvdW5kKG51bWJlcikgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2Zvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIFNVRkZJWCA9IGdldFN1ZmZpeChmb3JtYXRUWFQpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDAsIGZvcm1hdFRYVC5sZW5ndGggLSBTVUZGSVgubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsV2l0aG91dExlYWRpbmcgPSBmb3JtYXQoKChzaWduID09PSAnJykgPyAxIDogLTEpICogbnVtYmVyLCBmb3JtYXRUWFQpICsgc2NhbGVzW3ZhbFNjYWxlXSArIFNVRkZJWDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpICYmIHNpZ24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxXaXRob3V0TGVhZGluZyA9IHZhbFdpdGhvdXRMZWFkaW5nLnN1YnN0cihzaWduLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdWJGb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbHM7XG4gICAgICAgICAgICB2YXIgbWluRGVjaW1hbHM7XG4gICAgICAgICAgICBpZiAoc3ViRm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIG1pbkRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnMCsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IHN1YkZvcm1hdHNbMF0gKyBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgdmFyIHByZWZmaXggPSBmaXhlc1RYVFswXS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIHN1ZmZpeCA9IChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcblxuICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogKChmb3JtYXRUWFQuc3BsaXQoJyUnKS5sZW5ndGggPiAxKSA/IDEwMCA6IDEpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICBpZihmb3JtYXRUWFQuaW5kZXhPZignJScpICE9PSAtMSkgbnVtYmVyID0gbnVtYmVyICogMTAwO1xuICAgICAgICAgICAgbnVtYmVyID0gcm91bmRUbyhudW1iZXIsIGRlY2ltYWxzKTtcblxuICAgICAgICAgICAgc2lnbiA9IChudW1iZXIgPT09IDApID8gJycgOiBzaWduO1xuXG4gICAgICAgICAgICB2YXIgaGFzQ29tbWFzID0gKGZvcm1hdFRYVC5zdWJzdHIoZm9ybWF0VFhULmxlbmd0aCAtIDQgLSBzdWZmaXgubGVuZ3RoLCAxKSA9PT0gJywnKTtcbiAgICAgICAgICAgIHZhciBmb3JtYXR0ZWQgPSBzaWduICsgcHJlZmZpeCArIGFkZERlY2ltYWxzKG51bWJlciwgZGVjaW1hbHMsIG1pbkRlY2ltYWxzLCBoYXNDb21tYXMpICsgc3VmZml4O1xuXG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2cob3JpZ2luYWxOdW1iZXIsIG9yaWdpbmFsRm9ybWF0LCBmb3JtYXR0ZWQpXG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9KCkpXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBBdHRyaWJ1dGVzIHdoaWNoIGFyZSBqdXN0IHBhcmFtZXRlcnMgdG8gb3RoZXJzIGFuZCBjYW4ganVzdCBiZSBpZ25vcmVkXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzptb2RlbHxjb252ZXJ0KSQvaSxcblxuICAgIGhhbmRsZTogJC5ub29wLFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi1pbml0JykgPT09IDApO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbihhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi1pbml0JywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBsaXN0T2ZPcGVyYXRpb25zID0gXy5pbnZva2UodmFsdWUuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgIGxpc3RPZk9wZXJhdGlvbnMgPSBsaXN0T2ZPcGVyYXRpb25zLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm5OYW1lID0gdmFsdWUuc3BsaXQoJygnKVswXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSAoJC50cmltKHBhcmFtcykgIT09ICcnKSA/IHBhcmFtcy5zcGxpdCgnLCcpIDogW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtuYW1lOiBmbk5hbWUsIHBhcmFtczogYXJnc307XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbWUudHJpZ2dlcignZi51aS5vcGVyYXRlJywge29wZXJhdGlvbnM6IGxpc3RPZk9wZXJhdGlvbnMsIHNlcmlhbDogdHJ1ZX0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvL0Rvbid0IGJvdGhlciBiaW5kaW5nIG9uIHRoaXMgYXR0ci4gTk9URTogRG8gcmVhZG9ubHksIHRydWUgaW5zdGVhZD87XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24tJykgPT09IDApO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbihhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHRoaXMub24oYXR0ciwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7bmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3N9O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG1lLnRyaWdnZXIoJ2YudWkub3BlcmF0ZScsIHtvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnOmNoZWNrYm94LDpyYWRpbycsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc2V0dGFibGVWYWx1ZSA9IHRoaXMuYXR0cigndmFsdWUnKTsgLy9pbml0aWFsIHZhbHVlXG4gICAgICAgIC8qanNsaW50IGVxZXE6IHRydWUqL1xuICAgICAgICB2YXIgaXNDaGVja2VkID0gKHNldHRhYmxlVmFsdWUgIT09IHVuZGVmaW5lZCkgPyAoc2V0dGFibGVWYWx1ZSA9PSB2YWx1ZSkgOiAhIXZhbHVlO1xuICAgICAgICB0aGlzLnByb3AoJ2NoZWNrZWQnLCBpc0NoZWNrZWQpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHRhcmdldDogJ2lucHV0LCBzZWxlY3QnLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy52YWwodmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGVzdDogJ2NsYXNzJyxcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhZGRlZENsYXNzZXMgPSB0aGlzLmRhdGEoJ2FkZGVkLWNsYXNzZXMnKTtcbiAgICAgICAgaWYgKCFhZGRlZENsYXNzZXMpIHtcbiAgICAgICAgICAgIGFkZGVkQ2xhc3NlcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChhZGRlZENsYXNzZXNbcHJvcF0pIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2xhc3MoYWRkZWRDbGFzc2VzW3Byb3BdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfLmlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSAndmFsdWUtJyArIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGFkZGVkQ2xhc3Nlc1twcm9wXSA9IHZhbHVlO1xuICAgICAgICAvL0ZpeG1lOiBwcm9wIGlzIGFsd2F5cyBcImNsYXNzXCJcbiAgICAgICAgdGhpcy5hZGRDbGFzcyh2YWx1ZSk7XG4gICAgICAgIHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycsIGFkZGVkQ2xhc3Nlcyk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmNoZWNrZWR8c2VsZWN0ZWR8YXN5bmN8YXV0b2ZvY3VzfGF1dG9wbGF5fGNvbnRyb2xzfGRlZmVyfGlzbWFwfGxvb3B8bXVsdGlwbGV8b3BlbnxyZXF1aXJlZHxzY29wZWQpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICAvKmpzbGludCBlcWVxOiB0cnVlKi9cbiAgICAgICAgdmFyIHZhbCA9ICh0aGlzLmF0dHIoJ3ZhbHVlJykpID8gKHZhbHVlID09IHRoaXMucHJvcCgndmFsdWUnKSkgOiAhIXZhbHVlO1xuICAgICAgICB0aGlzLnByb3AocHJvcCwgdmFsKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzpkaXNhYmxlZHxoaWRkZW58cmVhZG9ubHkpJC9pLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByb3AocHJvcCwgIXZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5odG1sKHZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICcqJyxcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xuICAgICAgICB0aGlzLnByb3AocHJvcCwgdmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCgge1xuXG4gICAgcHJvcGVydHlIYW5kbGVycyA6IFtcblxuICAgIF0sXG5cbiAgICBnZXRVSVZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkZWwgPSB0aGlzLiRlbDtcbiAgICAgICAgLy9UT0RPOiBmaWxlIGEgaXNzdWUgZm9yIHRoZSB2ZW5zaW0gbWFuYWdlciB0byBjb252ZXJ0IHRydWVzIHRvIDFzIGFuZCBzZXQgdGhpcyB0byB0cnVlIGFuZCBmYWxzZVxuXG4gICAgICAgIHZhciBvZmZWYWwgPSAgKCRlbC5kYXRhKCdmLW9mZicpICE9PSB1bmRlZmluZWQgKSA/ICRlbC5kYXRhKCdmLW9mZicpIDogMDtcbiAgICAgICAgLy9hdHRyID0gaW5pdGlhbCB2YWx1ZSwgcHJvcCA9IGN1cnJlbnQgdmFsdWVcbiAgICAgICAgdmFyIG9uVmFsID0gKCRlbC5hdHRyKCd2YWx1ZScpICE9PSB1bmRlZmluZWQgKSA/ICRlbC5wcm9wKCd2YWx1ZScpOiAxO1xuXG4gICAgICAgIHZhciB2YWwgPSAoJGVsLmlzKCc6Y2hlY2tlZCcpKSA/IG9uVmFsIDogb2ZmVmFsO1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHtzZWxlY3RvcjogJzpjaGVja2JveCw6cmFkaW8nfSk7XG4iLCIndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vLi4vY29uZmlnJyk7XG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2RlZmF1bHQtbm9kZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCgge1xuICAgIHByb3BlcnR5SGFuZGxlcnMgOiBbXSxcblxuICAgIHVpQ2hhbmdlRXZlbnQ6ICdjaGFuZ2UnLFxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsLnZhbCgpO1xuICAgIH0sXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGVsLm9uKHRoaXMudWlDaGFuZ2VFdmVudCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHZhbCA9IG1lLmdldFVJVmFsdWUoKTtcbiAgICAgICAgICAgIHZhciBwcm9wTmFtZSA9IG1lLiRlbC5kYXRhKGNvbmZpZy5iaW5kZXJBdHRyKTtcblxuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW3Byb3BOYW1lXSA9IHZhbDtcblxuICAgICAgICAgICAgbWUuJGVsLnRyaWdnZXIoY29uZmlnLmV2ZW50cy50cmlnZ2VyLCBwYXJhbXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgQmFzZVZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59LCB7c2VsZWN0b3I6ICdpbnB1dCwgc2VsZWN0J30pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoIHtcbiAgICBwcm9wZXJ0eUhhbmRsZXJzIDogW1xuXG4gICAgXSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB9XG59LCB7c2VsZWN0b3I6ICcqJ30pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24ocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgY2hpbGQ7XG5cbiAgICAvLyBUaGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHRoZSBuZXcgc3ViY2xhc3MgaXMgZWl0aGVyIGRlZmluZWQgYnkgeW91XG4gICAgLy8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG4gICAgLy8gYnkgdXMgdG8gc2ltcGx5IGNhbGwgdGhlIHBhcmVudCdzIGNvbnN0cnVjdG9yLlxuICAgIGlmIChwcm90b1Byb3BzICYmIF8uaGFzKHByb3RvUHJvcHMsICdjb25zdHJ1Y3RvcicpKSB7XG4gICAgICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZCA9IGZ1bmN0aW9uKCl7IHJldHVybiBwYXJlbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfTtcbiAgICB9XG5cbiAgICAvLyBBZGQgc3RhdGljIHByb3BlcnRpZXMgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLCBpZiBzdXBwbGllZC5cbiAgICBfLmV4dGVuZChjaGlsZCwgcGFyZW50LCBzdGF0aWNQcm9wcyk7XG5cbiAgICAvLyBTZXQgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBpbmhlcml0IGZyb20gYHBhcmVudGAsIHdpdGhvdXQgY2FsbGluZ1xuICAgIC8vIGBwYXJlbnRgJ3MgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gICAgdmFyIFN1cnJvZ2F0ZSA9IGZ1bmN0aW9uKCl7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfTtcbiAgICBTdXJyb2dhdGUucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBuZXcgU3Vycm9nYXRlKCk7XG5cbiAgICAvLyBBZGQgcHJvdG90eXBlIHByb3BlcnRpZXMgKGluc3RhbmNlIHByb3BlcnRpZXMpIHRvIHRoZSBzdWJjbGFzcyxcbiAgICAvLyBpZiBzdXBwbGllZC5cbiAgICBpZiAocHJvdG9Qcm9wcykge1xuICAgICAgICBfLmV4dGVuZChjaGlsZC5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIH1cblxuICAgIC8vIFNldCBhIGNvbnZlbmllbmNlIHByb3BlcnR5IGluIGNhc2UgdGhlIHBhcmVudCdzIHByb3RvdHlwZSBpcyBuZWVkZWRcbiAgICAvLyBsYXRlci5cbiAgICBjaGlsZC5fX3N1cGVyX18gPSBwYXJlbnQucHJvdG90eXBlO1xuXG4gICAgcmV0dXJuIGNoaWxkO1xufTtcblxudmFyIFZpZXcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuZWwpO1xuICAgIHRoaXMuZWwgPSBvcHRpb25zLmVsO1xuICAgIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG59O1xuXG5fLmV4dGVuZChWaWV3LnByb3RvdHlwZSwge1xuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCl7fSxcbn0pO1xuXG5WaWV3LmV4dGVuZCA9IGV4dGVuZDtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIl19
;