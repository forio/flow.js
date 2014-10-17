/**

++++++++   ++++++++   ++++++++           Flow.js
++++++++   ,+++++++~   ++++++++          v0.6.5
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
window.Flow.version = '0.7.0'; //populated by grunt

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
                run: {
                    account: '',
                    project: '',
                    model: model
                }
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

    var rm = new F.manager.RunManager(config);
    var rs = rm.run;

    var $creationPromise = rm.getRun();
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
        if ($.isFunction(value) && name !== 'variables'  && name !== 'create') {
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

},{"./operations-channel":10,"./variables-channel":11}],8:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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


},{"./no-op-attr":19,"./events/init-event-attr":20,"./events/default-event-attr":21,"./binds/checkbox-radio-bind-attr":22,"./binds/input-bind-attr":23,"./class-attr":24,"./positive-boolean-attr":25,"./negative-boolean-attr":26,"./binds/default-bind-attr":27,"./default-attr":28}],11:[function(require,module,exports){
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
                    //console.log('inner', innerVariables);
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
        var propName = this.$el.data(config.binderAttr);

        if (propName) {
            this.$el.on(this.uiChangeEvent, function () {
                var val = me.getUIValue();

                var params = {};
                params[propName] = val;

                me.$el.trigger(config.events.trigger, params);
            });
        }

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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9hcHAuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZmxvdy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vZG9tLW1hbmFnZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY2hhbm5lbHMvY2hhbm5lbC1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy91dGlscy9wYXJzZS11dGlscy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jaGFubmVscy9vcGVyYXRpb25zLWNoYW5uZWwuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvbm9kZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbnZlcnRlcnMvbnVtYmVyLWNvbnZlcnRlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jb252ZXJ0ZXJzL3N0cmluZy1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2luaXQtZXZlbnQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9jaGVja2JveC1yYWRpby1iaW5kLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvYmluZHMvaW5wdXQtYmluZC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2NsYXNzLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvcG9zaXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2V2ZW50cy9kZWZhdWx0LWV2ZW50LWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2RlZmF1bHQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvaW5wdXQtY2hlY2tib3gtbm9kZS5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL25vZGVzL2Jhc2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIndpbmRvdy5GbG93ID0gcmVxdWlyZSgnLi9mbG93LmpzJyk7XG53aW5kb3cuRmxvdy52ZXJzaW9uID0gJzwlPSB2ZXJzaW9uICU+JzsgLy9wb3B1bGF0ZWQgYnkgZ3J1bnRcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRvbU1hbmFnZXIgPSByZXF1aXJlKCcuL2RvbS9kb20tbWFuYWdlcicpO1xudmFyIENoYW5uZWwgPSByZXF1aXJlKCcuL2NoYW5uZWxzL2NoYW5uZWwtbWFuYWdlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkb206IGRvbU1hbmFnZXIsXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgdmFyIG1vZGVsID0gJCgnYm9keScpLmRhdGEoJ2YtbW9kZWwnKTtcblxuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBjaGFubmVsOiB7XG4gICAgICAgICAgICAgICAgcnVuOiB7XG4gICAgICAgICAgICAgICAgICAgIGFjY291bnQ6ICcnLFxuICAgICAgICAgICAgICAgICAgICBwcm9qZWN0OiAnJyxcbiAgICAgICAgICAgICAgICAgICAgbW9kZWw6IG1vZGVsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRvbToge1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIG9wdGlvbnMgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGVmYXVsdHMsIGNvbmZpZyk7XG4gICAgICAgIGlmIChjb25maWcgJiYgY29uZmlnLmNoYW5uZWwgJiYgKGNvbmZpZy5jaGFubmVsIGluc3RhbmNlb2YgQ2hhbm5lbCkpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IGNvbmZpZy5jaGFubmVsO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gbmV3IENoYW5uZWwob3B0aW9ucy5jaGFubmVsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvbU1hbmFnZXIuaW5pdGlhbGl6ZSgkLmV4dGVuZCh0cnVlLCB7XG4gICAgICAgICAgICBjaGFubmVsOiB0aGlzLmNoYW5uZWxcbiAgICAgICAgfSkpO1xuICAgIH1cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgdmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG4gICAgdmFyIG5vZGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9ub2Rlcy9ub2RlLW1hbmFnZXIuanMnKTtcbiAgICB2YXIgYXR0ck1hbmFnZXIgPSByZXF1aXJlKCcuL2F0dHJpYnV0ZXMvYXR0cmlidXRlLW1hbmFnZXIuanMnKTtcbiAgICB2YXIgY29udmVydGVyTWFuYWdlciA9IHJlcXVpcmUoJy4uL2NvbnZlcnRlcnMvY29udmVydGVyLW1hbmFnZXIuanMnKTtcblxuICAgIHZhciBwYXJzZVV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvcGFyc2UtdXRpbHMnKTtcblxuICAgIC8vSnF1ZXJ5IHNlbGVjdG9yIHRvIHJldHVybiBldmVyeXRoaW5nIHdoaWNoIGhhcyBhIGYtIHByb3BlcnR5IHNldFxuICAgICQuZXhwclsnOiddW2NvbmZpZy5wcmVmaXhdID0gZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgdmFyICR0aGlzID0gJChvYmopO1xuICAgICAgICB2YXIgZGF0YXByb3BzID0gXy5rZXlzKCR0aGlzLmRhdGEoKSk7XG5cbiAgICAgICAgdmFyIG1hdGNoID0gXy5maW5kKGRhdGFwcm9wcywgZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKGNvbmZpZy5wcmVmaXgpID09PSAwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuICEhKG1hdGNoKTtcbiAgICB9O1xuXG4gICAgJC5leHByWyc6J10ud2ViY29tcG9uZW50ID0gZnVuY3Rpb24ob2JqKXtcbiAgICAgICAgcmV0dXJuIG9iai5ub2RlTmFtZS5pbmRleE9mKCctJykgIT09IC0xO1xuICAgIH07XG5cbiAgICB2YXIgcHVibGljQVBJID0ge1xuXG4gICAgICAgIG5vZGVzOiBub2RlTWFuYWdlcixcbiAgICAgICAgYXR0cmlidXRlczogYXR0ck1hbmFnZXIsXG4gICAgICAgIGNvbnZlcnRlcnM6IGNvbnZlcnRlck1hbmFnZXIsXG4gICAgICAgIC8vdXRpbHMgZm9yIHRlc3RpbmdcbiAgICAgICAgcHJpdmF0ZToge1xuXG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgICAgIHJvb3Q6ICdib2R5JyxcbiAgICAgICAgICAgICAgICBjaGFubmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgJC5leHRlbmQoZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgICAgICB2YXIgY2hhbm5lbCA9IGRlZmF1bHRzLmNoYW5uZWw7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgICAgICB2YXIgJHJvb3QgPSAkKGRlZmF1bHRzLnJvb3QpO1xuICAgICAgICAgICAgJChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIC8vcGFyc2UgdGhyb3VnaCBkb20gYW5kIGZpbmQgZXZlcnl0aGluZyB3aXRoIG1hdGNoaW5nIGF0dHJpYnV0ZXNcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hlZEVsZW1lbnRzID0gJHJvb3QuZmluZCgnOicgKyBjb25maWcucHJlZml4KTtcbiAgICAgICAgICAgICAgICBpZiAoJHJvb3QuaXMoJzonICsgY29uZmlnLnByZWZpeCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZEVsZW1lbnRzID0gbWF0Y2hlZEVsZW1lbnRzLmFkZCgkKGRlZmF1bHRzLnJvb3QpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBtZS5wcml2YXRlLm1hdGNoZWRFbGVtZW50cyA9IG1hdGNoZWRFbGVtZW50cztcblxuICAgICAgICAgICAgICAgICQuZWFjaChtYXRjaGVkRWxlbWVudHMsIGZ1bmN0aW9uKGluZGV4LCBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgSGFuZGxlciA9IG5vZGVNYW5hZ2VyLmdldEhhbmRsZXIoJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgbmV3IEhhbmRsZXIuaGFuZGxlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsOiBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhck1hcCA9ICRlbC5kYXRhKCd2YXJpYWJsZS1hdHRyLW1hcCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXZhck1hcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyTWFwID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICAvL05PVEU6IGxvb3BpbmcgdGhyb3VnaCBhdHRyaWJ1dGVzIGluc3RlYWQgb2YgLmRhdGEgYmVjYXVzZSAuZGF0YSBhdXRvbWF0aWNhbGx5IGNhbWVsY2FzZXMgcHJvcGVydGllcyBhbmQgbWFrZSBpdCBoYXJkIHRvIHJldHJ2aWV2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgJChlbGVtZW50LmF0dHJpYnV0ZXMpLmVhY2goZnVuY3Rpb24oaW5kZXgsIG5vZGVNYXApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRyID0gbm9kZU1hcC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9IG5vZGVNYXAudmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2FudGVkUHJlZml4ID0gJ2RhdGEtZi0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyLmluZGV4T2Yod2FudGVkUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKHdhbnRlZFByZWZpeCwgJycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihhdHRyLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNCaW5kYWJsZUF0dHIgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFuZGxlciAmJiBoYW5kbGVyLmluaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQmluZGFibGVBdHRyID0gaGFuZGxlci5pbml0LmNhbGwoJGVsLCBhdHRyLCBhdHRyVmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0JpbmRhYmxlQXR0cikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9Db252ZXJ0IHBpcGVzIHRvIGNvbnZlcnRlciBhdHRyc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdpdGhDb252ID0gXy5pbnZva2UoYXR0clZhbC5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpdGhDb252Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyVmFsID0gd2l0aENvbnYuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGF0YSgnZi1jb252ZXJ0ZXJzLScgKyBhdHRyLCB3aXRoQ29udik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb21tYVJlZ2V4ID0gLywoPyFbXlxcW10qXFxdKS87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0clZhbC5zcGxpdChjb21tYVJlZ2V4KS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdHJpZ2dlcmVycyA9IHRyaWdnZXJlcnMuY29uY2F0KHZhbC5zcGxpdCgnLCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhck1hcFthdHRyVmFsXSA9IGF0dHI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRlbC5kYXRhKCd2YXJpYWJsZS1hdHRyLW1hcCcsIHZhck1hcCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgc3Vic2NyaWJhYmxlID0gT2JqZWN0LmtleXModmFyTWFwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1YnNjcmliYWJsZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5uZWwudmFyaWFibGVzLnN1YnNjcmliZShPYmplY3Qua2V5cyh2YXJNYXApLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvL0F0dGFjaCBsaXN0ZW5lcnNcbiAgICAgICAgICAgICAgICAvL1RPRE86IHNwbGl0IGluaXRpYWxpemUgaW50byBtdWx0aXBsZSBzdWIgZXZlbnRzLCBhdCBsZWFzdCBBZGQgJiB0aGVuIGF0dGFjaCBoYW5kbGVyc1xuICAgICAgICAgICAgICAgICRyb290Lm9mZihjb25maWcuZXZlbnRzLnJlYWN0KS5vbihjb25maWcuZXZlbnRzLnJlYWN0LCBmdW5jdGlvbihldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXZ0LnRhcmdldCwgZGF0YSwgXCJyb290IG9uXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhcm1hcCA9ICRlbC5kYXRhKCd2YXJpYWJsZS1hdHRyLW1hcCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICQuZWFjaChkYXRhLCBmdW5jdGlvbih2YXJpYWJsZU5hbWUsIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlUb1VwZGF0ZSA9IHZhcm1hcFt2YXJpYWJsZU5hbWUudHJpbSgpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eVRvVXBkYXRlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2YtY29udmVydGVycy0qIGlzIGFscmVhZHkgc2V0IHdoaWxlIHBhcnNpbmcgdGhlIHZhcm1hcCwgYXMgYW4gYXJyYXkgdG8gYm9vdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnRlcnMtJyArIHByb3BlcnR5VG9VcGRhdGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycyAmJiBwcm9wZXJ0eVRvVXBkYXRlID09PSAnYmluZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciAkcGFyZW50RWwgPSAkZWwuY2xvc2VzdCgnW2RhdGEtZi1jb252ZXJ0XScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRwYXJlbnRFbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJHBhcmVudEVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9IGF0dHJDb252ZXJ0ZXJzLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnZlcnRlZFZhbHVlID0gY29udmVydGVyTWFuYWdlci5jb252ZXJ0KHZhbHVlLCBhdHRyQ29udmVydGVycyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVRvVXBkYXRlID0gcHJvcGVydHlUb1VwZGF0ZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGVyID0gYXR0ck1hbmFnZXIuZ2V0SGFuZGxlcihwcm9wZXJ0eVRvVXBkYXRlLCAkZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZXIuaGFuZGxlLmNhbGwoJGVsLCBjb252ZXJ0ZWRWYWx1ZSwgcHJvcGVydHlUb1VwZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKGNvbmZpZy5ldmVudHMudHJpZ2dlcikub24oY29uZmlnLmV2ZW50cy50cmlnZ2VyLCBmdW5jdGlvbihldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcnNlZERhdGEgPSB7fTsgLy9pZiBub3QgYWxsIHN1YnNlcXVlbnQgbGlzdGVuZXJzIHdpbGwgZ2V0IHRoZSBtb2RpZmllZCBkYXRhXG5cbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy9mLWNvbnZlcnRlcnMtKiBpcyBhbHJlYWR5IHNldCB3aGlsZSBwYXJzaW5nIHRoZSB2YXJtYXAsIGFzIGFuIGFycmF5IHRvIGJvb3RcbiAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydGVycy1iaW5kJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciAkcGFyZW50RWwgPSAkZWwuY2xvc2VzdCgnW2RhdGEtZi1jb252ZXJ0XScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkcGFyZW50RWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkcGFyZW50RWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSBhdHRyQ29udmVydGVycy5zcGxpdCgnfCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEsIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5ID0ga2V5LnNwbGl0KCd8JylbMF0udHJpbSgpOyAvL2luIGNhc2UgdGhlIHBpcGUgZm9ybWF0dGluZyBzeW50YXggd2FzIHVzZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IGNvbnZlcnRlck1hbmFnZXIucGFyc2UodmFsLCBhdHRyQ29udmVydGVycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWREYXRhW2tleV0gPSBwYXJzZVV0aWxzLnRvSW1wbGljaXRUeXBlKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjaGFubmVsLnZhcmlhYmxlcy5wdWJsaXNoKHBhcnNlZERhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKCdmLnVpLm9wZXJhdGUnKS5vbignZi51aS5vcGVyYXRlJywgZnVuY3Rpb24oZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSAkLmV4dGVuZCh0cnVlLCB7fSwgZGF0YSk7IC8vaWYgbm90IGFsbCBzdWJzZXF1ZW50IGxpc3RlbmVycyB3aWxsIGdldCB0aGUgbW9kaWZpZWQgZGF0YVxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YS5vcGVyYXRpb25zLCBmdW5jdGlvbiAob3BuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIG9wbi5wYXJhbXMgPSBfLm1hcChvcG4ucGFyYW1zLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSgkLnRyaW0odmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goZGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIHJldHVybiAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xufSgpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFZhcnNDaGFubmVsID0gcmVxdWlyZSgnLi92YXJpYWJsZXMtY2hhbm5lbCcpO1xudmFyIE9wZXJhdGlvbnNDaGFubmVsID0gcmVxdWlyZSgnLi9vcGVyYXRpb25zLWNoYW5uZWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICBjb25maWcgPSB7fTtcbiAgICB9XG5cbiAgICB2YXIgcm0gPSBuZXcgRi5tYW5hZ2VyLlJ1bk1hbmFnZXIoY29uZmlnKTtcbiAgICB2YXIgcnMgPSBybS5ydW47XG5cbiAgICB2YXIgJGNyZWF0aW9uUHJvbWlzZSA9IHJtLmdldFJ1bigpO1xuICAgIHJzLmN1cnJlbnRQcm9taXNlID0gJGNyZWF0aW9uUHJvbWlzZTtcblxuICAgIHZhciBjcmVhdGVBbmRUaGVuID0gZnVuY3Rpb24odmFsdWUsIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIF8ud3JhcCh2YWx1ZSwgZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgdmFyIHBhc3NlZEluUGFyYW1zID0gXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMSk7XG4gICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2UudGhlbihmdW5jdGlvbiAoKXtcbiAgICAgICAgICAgICAgICBycy5jdXJyZW50UHJvbWlzZSA9IGZ1bmMuYXBwbHkoY29udGV4dCwgcGFzc2VkSW5QYXJhbXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy9NYWtlIHN1cmUgbm90aGluZyBoYXBwZW5zIGJlZm9yZSB0aGUgcnVuIGlzIGNyZWF0ZWRcbiAgICBfLmVhY2gocnMsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIGlmICgkLmlzRnVuY3Rpb24odmFsdWUpICYmIG5hbWUgIT09ICd2YXJpYWJsZXMnICAmJiBuYW1lICE9PSAnY3JlYXRlJykge1xuICAgICAgICAgICAgcnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCBycyk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgdnMgPSBycy52YXJpYWJsZXMoKTtcbiAgICBfLmVhY2godnMsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIGlmICgkLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICB2c1tuYW1lXSA9IGNyZWF0ZUFuZFRoZW4odmFsdWUsIHZzKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5ydW4gPSBycztcbiAgICB0aGlzLnZhcmlhYmxlcyA9IG5ldyBWYXJzQ2hhbm5lbCh7cnVuOiBycywgdmVudDogdGhpc30pO1xuICAgIHRoaXMub3BlcmF0aW9ucyA9IG5ldyBPcGVyYXRpb25zQ2hhbm5lbCh7cnVuOiBycywgdmVudDogdGhpc30pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByZWZpeDogJ2YnLFxuICAgIGRlZmF1bHRBdHRyOiAnYmluZCcsXG5cbiAgICBiaW5kZXJBdHRyOiAnZi1iaW5kJyxcblxuICAgIGV2ZW50czoge1xuICAgICAgICB0cmlnZ2VyOiAndXBkYXRlLmYudWknLFxuICAgICAgICByZWFjdDogJ3VwZGF0ZS5mLm1vZGVsJ1xuICAgIH1cblxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0b0ltcGxpY2l0VHlwZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJicmFjZSA9IC9eKD86XFx7LipcXH18XFxbLipcXF0pJC87XG4gICAgICAgIHZhciBjb252ZXJ0ZWQgPSBkYXRhO1xuICAgICAgICBpZiAoIHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJyApIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkYXRhID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkYXRhID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZGF0YSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYoY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1xcJycgfHwgY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGRhdGEuc3Vic3RyaW5nKDEsIGRhdGEubGVuZ3RoIC0xKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCQuaXNOdW1lcmljKCBkYXRhICkpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSArZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCByYnJhY2UudGVzdCggZGF0YSApKSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPOiBUaGlzIG9ubHkgd29ya3Mgd2l0aCBkb3VibGUgcXVvdGVzLCBpLmUuLCBbMSxcIjJcIl0gd29ya3MgYnV0IG5vdCBbMSwnMiddXG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJC5wYXJzZUpTT04oIGRhdGEgKSA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHt9O1xuICAgIH1cbiAgICB2YXIgcnVuID0gY29uZmlnLnJ1bjtcbiAgICB2YXIgdmVudCA9IGNvbmZpZy52ZW50O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgbGlzdGVuZXJNYXA6IHt9LFxuXG4gICAgICAgIC8vQ2hlY2sgZm9yIHVwZGF0ZXNcbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24ob3BlcmF0aW9uLHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAvLyB2YXIgRElSVFlfT1BFUkFUSU9OUyA9IFsnc3RhcnRfZ2FtZScsICdpbml0aWFsaXplJywgJ3N0ZXAnXTtcbiAgICAgICAgICAgIC8vIGlmIChfLmNvbnRhaW5zKERJUlRZX09QRVJBVElPTlMsIG9wZXJhdGlvbikpIHtcbiAgICAgICAgICAgICQodmVudCkudHJpZ2dlcignZGlydHknLCB7b3BuOiBvcGVyYXRpb24sIHJlc3BvbnNlOiByZXNwb25zZX0pO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBPcGVyYXRpb24gbmFtZSAmIHBhcmFtZXRlcnMgdG8gc2VuZCB0byBvcGVyYXRpb25zIEFQSVxuICAgICAgICAgKiBAcGFyYW0gIHtzdHJpbmcgfCBvYmplY3R9IG9wZXJhdGlvbiBOYW1lIG9mIE9wZXJhdGlvbi4gSWYgYXJyYXksIG5lZWRzIHRvIGJlIGluIHtvcGVyYXRpb25zOiBbe25hbWU6IG9wbiwgcGFyYW1zOltdfV0sIHNlcmlhbDogYm9vbGVhbn1dIGZvcm1hdFxuICAgICAgICAgKiBAcGFyYW0gIHsqfSBwYXJhbXMgKG9wdGlvbmFsKSAgIHBhcmFtcyB0byBzZW5kIHRvIG9wZXJ0YWlvblxuICAgICAgICAgKiBAcmV0dXJuIHskcHJvbWlzZX1cbiAgICAgICAgICovXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uKG9wZXJhdGlvbiwgcGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5vcGVyYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuID0gKG9wZXJhdGlvbi5zZXJpYWwpID8gcnVuLnNlcmlhbCA6IHJ1bi5wYXJhbGxlbDtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbChydW4sIG9wZXJhdGlvbi5vcGVyYXRpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUucmVmcmVzaC5jYWxsKG1lLCBfKG9wZXJhdGlvbi5vcGVyYXRpb25zKS5wbHVjaygnbmFtZScpLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vVE9ETzogY2hlY2sgaWYgaW50ZXJwb2xhdGVkXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ1bi5kby5hcHBseShydW4sIGFyZ3VtZW50cylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIG9wZXJhdGlvbiwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdvcGVyYXRpb25zIHB1Ymxpc2gnLCBvcGVyYXRpb24sIHBhcmFtcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbihvcGVyYXRpb25zLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBzdWJzY3JpYmUnLCBvcGVyYXRpb25zLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIG9wZXJhdGlvbnMgPSBbXS5jb25jYXQob3BlcmF0aW9ucyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICAvL1RPRE86IHN1YnNjcmliZXIgY2FuIGJlIGEgZnVuY3Rpb25cbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbikge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC5vcGVyYXRpb24nKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICAkLmVhY2gob3BlcmF0aW9ucywgZnVuY3Rpb24oaW5kZXgsIG9wbikge1xuICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBtZS5saXN0ZW5lck1hcFtvcG5dLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbih2YXJpYWJsZSwgdG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJNYXAgPSBfLnJlamVjdCh0aGlzLmxpc3RlbmVyTWFwLCBmdW5jdGlvbihzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJNYXAgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICAvL25vbWFsaXplKCdmbGlwJywgZm4pXG4gICAgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIpKSB7XG4gICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgIGFsaWFzOiBhbGlhcyxcbiAgICAgICAgICAgIGNvbnZlcnQ6IGNvbnZlcnRlclxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pc09iamVjdChjb252ZXJ0ZXIpICYmIGNvbnZlcnRlci5jb252ZXJ0KSB7XG4gICAgICAgIGNvbnZlcnRlci5hbGlhcyA9IGFsaWFzO1xuICAgICAgICByZXQucHVzaChjb252ZXJ0ZXIpO1xuICAgIH1cbiAgICBlbHNlIGlmKF8uaXNPYmplY3QoYWxpYXMpKSB7XG4gICAgICAgIC8vbm9ybWFsaXplKHthbGlhczogJ2ZsaXAnLCBjb252ZXJ0OiBmdW5jdGlvbn0pXG4gICAgICAgIGlmIChhbGlhcy5jb252ZXJ0KSB7XG4gICAgICAgICAgICByZXQucHVzaChhbGlhcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBub3JtYWxpemUoe2ZsaXA6IGZ1bn0pXG4gICAgICAgICAgICAkLmVhY2goYWxpYXMsIGZ1bmN0aW9uIChrZXksIHZhbCkge1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgYWxpYXM6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgY29udmVydDogdmFsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIG1hdGNoQ29udmVydGVyID0gZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBhbGlhcyA9PT0gY29udmVydGVyLmFsaWFzO1xuICAgIH1cbiAgICBlbHNlIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzKGFsaWFzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pc1JlZ2V4KGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5hbGlhcy5tYXRjaChhbGlhcyk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjb252ZXJ0ZXJNYW5hZ2VyID0ge1xuICAgIHByaXZhdGU6IHtcbiAgICAgICAgbWF0Y2hDb252ZXJ0ZXI6IG1hdGNoQ29udmVydGVyXG4gICAgfSxcblxuICAgIGxpc3Q6IFtdLFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgY29udmVydGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfGZ1bmN0aW9ufHJlZ2V4fSBhbGlhcyBmb3JtYXR0ZXIgbmFtZVxuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gY29udmVydGVyICAgIGNvbnZlcnRlciBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24sIHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIHZhbHVlLCBvciBhbiBvYmplY3Qgd2l0aCB7YWxpYXM6ICcnLCBwYXJzZTogJC5ub29wLCBjb252ZXJ0OiAkLm5vb3B9XG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkID0gbm9ybWFsaXplKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB0aGlzLmxpc3QgPSBub3JtYWxpemVkLmNvbmNhdCh0aGlzLmxpc3QpO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbihhbGlhcywgY29udmVydGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oY3VycmVudENvbnZlcnRlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQ29udmVydGVyKGFsaWFzLCBjdXJyZW50Q29udmVydGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlcilbMF0pO1xuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXI6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQ29udmVydGVyKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSl7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydGVyLmNvbnZlcnQoY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvdW50ZXItcGFydCB0byAnY29udmVydCcuIFRyYW5zbGF0ZXMgY29udmVydGVkIHZhbHVlcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGZvcm1cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHBhcnNlXG4gICAgICogQHBhcmFtICB7U3RyaW5nIHwgQXJyYXl9IGxpc3QgIExpc3Qgb2YgcGFyc2VycyB0byBydW4gdGhpcyB0aHJvdWdoLiBPdXRlcm1vc3QgaXMgaW52b2tlZCBmaXJzdFxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KS5yZXZlcnNlKCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKXtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZXIgPSBtZS5nZXRDb252ZXJ0ZXIoY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICBpZiAoY29udmVydGVyLnBhcnNlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydGVyLnBhcnNlKGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgIH1cbn07XG5cblxuLy9Cb290c3RyYXBcbnZhciBkZWZhdWx0Y29udmVydGVycyA9IFtcbiAgICByZXF1aXJlKCcuL251bWJlci1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL3N0cmluZy1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL2FycmF5LWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vbnVtYmVyZm9ybWF0LWNvbnZlcnRlcicpLFxuXTtcblxuJC5lYWNoKGRlZmF1bHRjb252ZXJ0ZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24oaW5kZXgsIGNvbnZlcnRlcikge1xuICAgIGNvbnZlcnRlck1hbmFnZXIucmVnaXN0ZXIoY29udmVydGVyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnZlcnRlck1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgICBzZWxlY3RvciA9ICcqJztcbiAgICB9XG4gICAgaGFuZGxlci5zZWxlY3RvciA9IHNlbGVjdG9yO1xuICAgIHJldHVybiBoYW5kbGVyO1xufTtcblxudmFyIG1hdGNoID0gZnVuY3Rpb24gKHRvTWF0Y2gsIG5vZGUpIHtcbiAgICBpZiAoXy5pc1N0cmluZyh0b01hdGNoKSkge1xuICAgICAgICByZXR1cm4gdG9NYXRjaCA9PT0gbm9kZS5zZWxlY3RvcjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiAkKHRvTWF0Y2gpLmlzKG5vZGUuc2VsZWN0b3IpO1xuICAgIH1cbn07XG5cbnZhciBub2RlTWFuYWdlciA9IHtcbiAgICBsaXN0OiBbXSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBub2RlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IHNlbGVjdG9yIGpRdWVyeS1jb21wYXRpYmxlIHNlbGVjdG9yIHRvIHVzZSB0byBtYXRjaCBub2Rlc1xuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufSBoYW5kbGVyICBIYW5kbGVycyBhcmUgbmV3LWFibGUgZnVuY3Rpb25zLiBUaGV5IHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsIGFzIGNvbnRleHQuPyBUT0RPOiBUaGluayB0aGlzIHRocm91Z2hcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMubGlzdC51bnNoaWZ0KG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoKHNlbGVjdG9yLCBub2RlKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHJlcGxhY2U6IGZ1bmN0aW9uKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oY3VycmVudEhhbmRsZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChzZWxlY3RvciA9PT0gY3VycmVudEhhbmRsZXIuc2VsZWN0b3IpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5saXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKHNlbGVjdG9yLCBoYW5kbGVyKSk7XG4gICAgfVxufTtcblxuLy9ib290c3RyYXBzXG52YXIgZGVmYXVsdEhhbmRsZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vaW5wdXQtY2hlY2tib3gtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1pbnB1dC1ub2RlJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKVxuXTtcbl8uZWFjaChkZWZhdWx0SGFuZGxlcnMucmV2ZXJzZSgpLCBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgbm9kZU1hbmFnZXIucmVnaXN0ZXIoaGFuZGxlci5zZWxlY3RvciwgaGFuZGxlcik7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBub2RlTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL25vLW9wLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2V2ZW50cy9pbml0LWV2ZW50LWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2V2ZW50cy9kZWZhdWx0LWV2ZW50LWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvaW5wdXQtYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9jbGFzcy1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9wb3NpdGl2ZS1ib29sZWFuLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL25lZ2F0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvZGVmYXVsdC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtYXR0cicpXG5dO1xuXG52YXIgaGFuZGxlcnNMaXN0ID0gW107XG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYXR0cmlidXRlTWF0Y2hlciwgbm9kZU1hdGNoZXIsIGhhbmRsZXIpIHtcbiAgICBpZiAoIW5vZGVNYXRjaGVyKSB7XG4gICAgICAgIG5vZGVNYXRjaGVyID0gJyonO1xuICAgIH1cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgICAgIGhhbmRsZXIgPSB7XG4gICAgICAgICAgICBoYW5kbGU6IGhhbmRsZXJcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuICQuZXh0ZW5kKGhhbmRsZXIsIHt0ZXN0OiBhdHRyaWJ1dGVNYXRjaGVyLCB0YXJnZXQ6IG5vZGVNYXRjaGVyfSk7XG59O1xuXG4kLmVhY2goZGVmYXVsdEhhbmRsZXJzLCBmdW5jdGlvbihpbmRleCwgaGFuZGxlcikge1xuICAgIGhhbmRsZXJzTGlzdC5wdXNoKG5vcm1hbGl6ZShoYW5kbGVyLnRlc3QsIGhhbmRsZXIudGFyZ2V0LCBoYW5kbGVyKSk7XG59KTtcblxuXG52YXIgbWF0Y2hBdHRyID0gZnVuY3Rpb24gKG1hdGNoRXhwciwgYXR0ciwgJGVsKSB7XG4gICAgdmFyIGF0dHJNYXRjaDtcblxuICAgIGlmIChfLmlzU3RyaW5nKG1hdGNoRXhwcikpIHtcbiAgICAgICAgYXR0ck1hdGNoID0gKG1hdGNoRXhwciA9PT0gJyonIHx8IChtYXRjaEV4cHIudG9Mb3dlckNhc2UoKSA9PT0gYXR0ci50b0xvd2VyQ2FzZSgpKSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKF8uaXNGdW5jdGlvbihtYXRjaEV4cHIpKSB7XG4gICAgICAgIC8vVE9ETzogcmVtb3ZlIGVsZW1lbnQgc2VsZWN0b3JzIGZyb20gYXR0cmlidXRlc1xuICAgICAgICBhdHRyTWF0Y2ggPSBtYXRjaEV4cHIoYXR0ciwgJGVsKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pc1JlZ0V4cChtYXRjaEV4cHIpKSB7XG4gICAgICAgIGF0dHJNYXRjaCA9IGF0dHIubWF0Y2gobWF0Y2hFeHByKTtcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJNYXRjaDtcbn07XG5cbnZhciBtYXRjaE5vZGUgPSBmdW5jdGlvbiAodGFyZ2V0LCBub2RlRmlsdGVyKSB7XG4gICAgcmV0dXJuIChfLmlzU3RyaW5nKG5vZGVGaWx0ZXIpKSA/IChub2RlRmlsdGVyID09PSB0YXJnZXQpIDogbm9kZUZpbHRlci5pcyh0YXJnZXQpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogaGFuZGxlcnNMaXN0LFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgaGFuZGxlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ3xmdW5jdGlvbnxyZWdleH0gYXR0cmlidXRlTWF0Y2hlciBEZXNjcmlwdGlvbiBvZiB3aGljaCBhdHRyaWJ1dGVzIHRvIG1hdGNoXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBub2RlTWF0Y2hlciAgICAgIFdoaWNoIG5vZGVzIHRvIGFsbCBhdHRyaWJ1dGVzIHRvLiBVc2UganF1ZXJ5IFNlbGVjdG9yIHN5bnRheFxuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gaGFuZGxlciAgICBIYW5kbGVyIGNhbiBlaXRoZXIgYmUgYSBmdW5jdGlvbiAoVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdpdGggJGVsZW1lbnQgYXMgY29udGV4dCwgYW5kIGF0dHJpYnV0ZSB2YWx1ZSArIG5hbWUpLCBvciBhbiBvYmplY3Qgd2l0aCB7aW5pdDogZm4sICBoYW5kbGU6IGZufS4gVGhlIGluaXQgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2hlbiBwYWdlIGxvYWRzOyB1c2UgdGhpcyB0byBkZWZpbmUgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgICAgIGhhbmRsZXJzTGlzdC51bnNoaWZ0KG5vcm1hbGl6ZS5hcHBseShudWxsLCBhcmd1bWVudHMpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBhbiBhdHRyaWJ1dGUgbWF0Y2hlciBtYXRjaGluZyBzb21lIGNyaXRlcmlhXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBhdHRyRmlsdGVyIGF0dHJpYnV0ZSB0byBtYXRjaFxuICAgICAqIEBwYXJhbSAge3N0cmluZyB8ICRlbH0gbm9kZUZpbHRlciBub2RlIHRvIG1hdGNoXG4gICAgICogQHJldHVybiB7YXJyYXl8bnVsbH1cbiAgICAgKi9cbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIpIHtcbiAgICAgICAgdmFyIGZpbHRlcmVkID0gXy5zZWxlY3QoaGFuZGxlcnNMaXN0LCBmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQXR0cihoYW5kbGVyLnRlc3QsIGF0dHJGaWx0ZXIpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKG5vZGVGaWx0ZXIpIHtcbiAgICAgICAgICAgIGZpbHRlcmVkID0gXy5zZWxlY3QoZmlsdGVyZWQsIGZ1bmN0aW9uIChoYW5kbGVyKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hOb2RlKGhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZDtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24oYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hBdHRyKGN1cnJlbnRIYW5kbGVyLnRlc3QsIGF0dHJGaWx0ZXIpICYmIG1hdGNoTm9kZShjdXJyZW50SGFuZGxlci50YXJnZXQsIG5vZGVGaWx0ZXIpKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGhhbmRsZXJzTGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShhdHRyRmlsdGVyLCBub2RlRmlsdGVyLCBoYW5kbGVyKSk7XG4gICAgfSxcblxuICAgIGdldEhhbmRsZXI6IGZ1bmN0aW9uKHByb3BlcnR5LCAkZWwpIHtcbiAgICAgICAgdmFyIGZpbHRlcmVkID0gdGhpcy5maWx0ZXIocHJvcGVydHksICRlbCk7XG4gICAgICAgIC8vVGhlcmUgY291bGQgYmUgbXVsdGlwbGUgbWF0Y2hlcywgYnV0IHRoZSB0b3AgZmlyc3QgaGFzIHRoZSBtb3N0IHByaW9yaXR5XG4gICAgICAgIHJldHVybiBmaWx0ZXJlZFswXTtcbiAgICB9XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIHZhciB2cyA9IG9wdGlvbnMucnVuLnZhcmlhYmxlcygpO1xuICAgIHZhciB2ZW50ICA9IG9wdGlvbnMudmVudDtcblxuICAgIHZhciBjdXJyZW50RGF0YSA9IHt9O1xuXG4gICAgLy9UT0RPOiBhY3R1YWxseSBjb21wYXJlIG9iamVjdHMgYW5kIHNvIG9uXG4gICAgdmFyIGlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuXG4gICAgdmFyIGdldElubmVyVmFyaWFibGVzID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgIHZhciBpbm5lciA9IHN0ci5tYXRjaCgvPCguKj8pPi9nKTtcbiAgICAgICAgaW5uZXIgPSBfLm1hcChpbm5lciwgZnVuY3Rpb24odmFsKXtcbiAgICAgICAgICAgIHJldHVybiB2YWwuc3Vic3RyaW5nKDEsIHZhbC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBpbm5lcjtcbiAgICB9O1xuXG4gICAgLy9SZXBsYWNlcyBzdHViYmVkIG91dCBrZXluYW1lcyBpbiB2YXJpYWJsZXN0b2ludGVycG9sYXRlIHdpdGggdGhlaXIgY29ycmVzcG9uZGluZyBjYWx1ZXNcbiAgICB2YXIgaW50ZXJwb2xhdGUgPSBmdW5jdGlvbih2YXJpYWJsZXNUb0ludGVycG9sYXRlLCB2YWx1ZXMpIHtcbiAgICAgICAgdmFyIGludGVycG9sYXRpb25NYXAgPSB7fTtcbiAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IHt9O1xuXG4gICAgICAgIF8uZWFjaCh2YXJpYWJsZXNUb0ludGVycG9sYXRlLCBmdW5jdGlvbiAodmFsLCBvdXRlclZhcmlhYmxlKSB7XG4gICAgICAgICAgICB2YXIgaW5uZXIgPSBnZXRJbm5lclZhcmlhYmxlcyhvdXRlclZhcmlhYmxlKTtcbiAgICAgICAgICAgIHZhciBvcmlnaW5hbE91dGVyID0gb3V0ZXJWYXJpYWJsZTtcbiAgICAgICAgICAgICQuZWFjaChpbm5lciwgZnVuY3Rpb24oaW5kZXgsIGlubmVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGhpc3ZhbCA9IHZhbHVlc1tpbm5lclZhcmlhYmxlXTtcbiAgICAgICAgICAgICAgICBpZiAodGhpc3ZhbCAhPT0gbnVsbCAmJiB0aGlzdmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheSh0aGlzdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9Gb3IgYXJyYXllZCB0aGluZ3MgZ2V0IHRoZSBsYXN0IG9uZSBmb3IgaW50ZXJwb2xhdGlvbiBwdXJwb3Nlc1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc3ZhbCA9IHRoaXN2YWxbdGhpc3ZhbC5sZW5ndGggLTFdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG91dGVyVmFyaWFibGUgPSBvdXRlclZhcmlhYmxlLnJlcGxhY2UoJzwnICsgaW5uZXJWYXJpYWJsZSArICc+JywgdGhpc3ZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwW291dGVyVmFyaWFibGVdID0gb3JpZ2luYWxPdXRlcjtcbiAgICAgICAgICAgIGludGVycG9sYXRlZFtvdXRlclZhcmlhYmxlXSA9IHZhbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGludGVycG9sYXRlZDogaW50ZXJwb2xhdGVkLFxuICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcDogaW50ZXJwb2xhdGlvbk1hcFxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgcHVibGljQVBJID0ge1xuICAgICAgICAvL2ZvciB0ZXN0aW5nLCB0byBiZSByZW1vdmVkIGxhdGVyXG4gICAgICAgIHByaXZhdGU6IHtcbiAgICAgICAgICAgIGdldElubmVyVmFyaWFibGVzOiBnZXRJbm5lclZhcmlhYmxlcyxcbiAgICAgICAgICAgIGludGVycG9sYXRlOiBpbnRlcnBvbGF0ZVxuICAgICAgICB9LFxuXG4gICAgICAgIC8vSW50ZXJwb2xhdGVkIHZhcmlhYmxlcyB3aGljaCBuZWVkIHRvIGJlIHJlc29sdmVkIGJlZm9yZSB0aGUgb3V0ZXIgb25lcyBjYW4gYmVcbiAgICAgICAgaW5uZXJWYXJpYWJsZXNMaXN0OiBbXSxcbiAgICAgICAgdmFyaWFibGVMaXN0ZW5lck1hcDoge30sXG5cbiAgICAgICAgLy9DaGVjayBmb3IgdXBkYXRlc1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICAgIHZhciBnZXRWYXJpYWJsZXMgPSBmdW5jdGlvbih2YXJzLCBpcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeSh2YXJzKS50aGVuKGZ1bmN0aW9uKHZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnR290IHZhcmlhYmxlcycsIHZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaCh2YXJpYWJsZXMsIGZ1bmN0aW9uKHZhbHVlLCB2bmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9sZFZhbHVlID0gY3VycmVudERhdGFbdm5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0VxdWFsKHZhbHVlLCBvbGRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50RGF0YVt2bmFtZV0gPSB2YWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2biA9IChpcCAmJiBpcFt2bmFtZV0pID8gaXBbdm5hbWVdIDogdm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWUubm90aWZ5KHZuLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChtZS5pbm5lclZhcmlhYmxlc0xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KG1lLmlubmVyVmFyaWFibGVzTGlzdCkudGhlbihmdW5jdGlvbiAoaW5uZXJWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnaW5uZXInLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgICQuZXh0ZW5kKGN1cnJlbnREYXRhLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpcCA9ICBpbnRlcnBvbGF0ZShtZS52YXJpYWJsZUxpc3RlbmVyTWFwLCBpbm5lclZhcmlhYmxlcyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvdXRlciA9IF8ua2V5cyhpcC5pbnRlcnBvbGF0ZWQpO1xuICAgICAgICAgICAgICAgICAgICBnZXRWYXJpYWJsZXMob3V0ZXIsIGlwLmludGVycG9sYXRpb25NYXApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldFZhcmlhYmxlcyhfLmtleXMobWUudmFyaWFibGVMaXN0ZW5lck1hcCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sXG5cbiAgICAgICAgbm90aWZ5OiBmdW5jdGlvbiAodmFyaWFibGUsIHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy52YXJpYWJsZUxpc3RlbmVyTWFwW3ZhcmlhYmxlXTtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHBhcmFtc1t2YXJpYWJsZV0gPSB2YWx1ZTtcblxuICAgICAgICAgICAgXy5lYWNoKGxpc3RlbmVycywgZnVuY3Rpb24gKGxpc3RlbmVyKXtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci50YXJnZXQudHJpZ2dlcihjb25maWcuZXZlbnRzLnJlYWN0LCBwYXJhbXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24odmFyaWFibGUsIHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygncHVibGlzaCcsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAvLyBUT0RPOiBjaGVjayBpZiBpbnRlcnBvbGF0ZWRcbiAgICAgICAgICAgIHZhciBhdHRycztcbiAgICAgICAgICAgIGlmICgkLmlzUGxhaW5PYmplY3QodmFyaWFibGUpKSB7XG4gICAgICAgICAgICAgICAgYXR0cnMgPSB2YXJpYWJsZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgKGF0dHJzID0ge30pW3ZhcmlhYmxlXSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGludGVycG9sYXRlZCA9IGludGVycG9sYXRlKGF0dHJzLCBjdXJyZW50RGF0YSkuaW50ZXJwb2xhdGVkO1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgdnMuc2F2ZS5jYWxsKHZzLCBpbnRlcnBvbGF0ZWQpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN1YnNjcmliZTogZnVuY3Rpb24ocHJvcGVydGllcywgc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3N1YnNjcmliaW5nJywgcHJvcGVydGllcywgc3Vic2NyaWJlcik7XG5cbiAgICAgICAgICAgIHByb3BlcnRpZXMgPSBbXS5jb25jYXQocHJvcGVydGllcyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICAvL1RPRE86IHN1YnNjcmliZXIgY2FuIGJlIGEgZnVuY3Rpb25cbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbikge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC52YXJpYWJsZScpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHRhcmdldDogc3Vic2NyaWJlclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgICQuZWFjaChwcm9wZXJ0aWVzLCBmdW5jdGlvbihpbmRleCwgcHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5uZXIgPSBnZXRJbm5lclZhcmlhYmxlcyhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgaWYgKGlubmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBtZS5pbm5lclZhcmlhYmxlc0xpc3QgPSBtZS5pbm5lclZhcmlhYmxlc0xpc3QuY29uY2F0KGlubmVyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWUuaW5uZXJWYXJpYWJsZXNMaXN0ID0gXy51bmlxKG1lLmlubmVyVmFyaWFibGVzTGlzdCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1lLnZhcmlhYmxlTGlzdGVuZXJNYXBbcHJvcGVydHldKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLnZhcmlhYmxlTGlzdGVuZXJNYXBbcHJvcGVydHldID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1lLnZhcmlhYmxlTGlzdGVuZXJNYXBbcHJvcGVydHldID0gbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0uY29uY2F0KGRhdGEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uKHZhcmlhYmxlLCB0b2tlbikge1xuICAgICAgICAgICAgdGhpcy52YXJpYWJsZUxpc3RlbmVyTWFwID0gXy5yZWplY3QodGhpcy52YXJpYWJsZUxpc3RlbmVyTWFwLCBmdW5jdGlvbihzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMudmFyaWFibGVMaXN0ZW5lck1hcCA9IHt9O1xuICAgICAgICAgICAgdGhpcy5pbm5lclZhcmlhYmxlc0xpc3QgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAkLmV4dGVuZCh0aGlzLCBwdWJsaWNBUEkpO1xuICAgIHZhciBtZSA9IHRoaXM7XG4gICAgJCh2ZW50KS5vbignZGlydHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG1lLnJlZnJlc2guYXBwbHkobWUsIGFyZ3VtZW50cyk7XG4gICAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYWxpYXM6ICdpJyxcbiAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQodmFsdWUsIDEwKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgczogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gdmFsICsgJyc7XG4gICAgfSxcblxuICAgIHVwcGVyQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCArICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgIH0sXG4gICAgbG93ZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgfSxcbiAgICB0aXRsZUNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsID0gdmFsICsgJyc7XG4gICAgICAgIHJldHVybiB2YWwucmVwbGFjZSgvXFx3XFxTKi9nLCBmdW5jdGlvbih0eHQpe3JldHVybiB0eHQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0eHQuc3Vic3RyKDEpLnRvTG93ZXJDYXNlKCk7fSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuIFtdLmNvbmNhdCh2YWwpO1xuICAgIH0sXG4gICAgbGFzdDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgcmV0dXJuIHZhbFt2YWwubGVuZ3RoIC0gMV07XG4gICAgfSxcbiAgICBmaXJzdDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSBbXS5jb25jYXQodmFsKTtcbiAgICAgICAgcmV0dXJuIHZhbFswXTtcbiAgICB9LFxuICAgIHByZXZpb3VzOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICByZXR1cm4gKHZhbC5sZW5ndGggPD0gMSkgPyB2YWxbMF0gOiB2YWxbdmFsLmxlbmd0aCAtIDJdO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhbGlhczogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgLy9UT0RPOiBGYW5jeSByZWdleCB0byBtYXRjaCBudW1iZXIgZm9ybWF0cyBoZXJlXG4gICAgICAgIHJldHVybiAobmFtZS5pbmRleE9mKCcjJykgIT09IC0xIHx8IG5hbWUuaW5kZXhPZignMCcpICE9PSAtMSApO1xuICAgIH0sXG5cbiAgICBwYXJzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwrPSAnJztcbiAgICAgICAgdmFyIGlzTmVnYXRpdmUgPSB2YWwuY2hhckF0KDApID09PSAnLSc7XG5cbiAgICAgICAgdmFsICA9IHZhbC5yZXBsYWNlKC8sL2csICcnKTtcbiAgICAgICAgdmFyIGZsb2F0TWF0Y2hlciA9IC8oWy0rXT9bMC05XSpcXC4/WzAtOV0rKShLP00/Qj8lPykvaTtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBmbG9hdE1hdGNoZXIuZXhlYyh2YWwpO1xuICAgICAgICB2YXIgbnVtYmVyLCBzdWZmaXggPSAnJztcbiAgICAgICAgaWYocmVzdWx0cyAmJiByZXN1bHRzWzFdKXtcbiAgICAgICAgICAgIG51bWJlciA9IHJlc3VsdHNbMV07XG4gICAgICAgIH1cbiAgICAgICAgaWYocmVzdWx0cyAmJiByZXN1bHRzWzJdKXtcbiAgICAgICAgICAgIHN1ZmZpeCA9IHJlc3VsdHNbMl0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaChzdWZmaXgpe1xuICAgICAgICAgICAgY2FzZSAnJSc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyIC8gMTAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnayc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ20nOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDAwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwMDAwMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIG51bWJlciA9IHBhcnNlRmxvYXQobnVtYmVyKTtcbiAgICAgICAgaWYoaXNOZWdhdGl2ZSAmJiBudW1iZXIgPiAwKSB7XG4gICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAtMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgIH0sXG5cbiAgICBjb252ZXJ0OiAoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdmFyIHNjYWxlcyA9IFsnJywgJ0snLCAnTScsICdCJywgJ1QnXTtcblxuICAgICAgICBmdW5jdGlvbiBnZXREaWdpdHModmFsdWUsIGRpZ2l0cykge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA9PT0gMCA/IDAgOiByb3VuZFRvKHZhbHVlLCBNYXRoLm1heCgwLCBkaWdpdHMgLSBNYXRoLmNlaWwoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjEwKSkpO1xuXG4gICAgICAgICAgICB2YXIgVFhUID0gJyc7XG4gICAgICAgICAgICB2YXIgbnVtYmVyVFhUID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFsU2V0ID0gZmFsc2U7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGlUWFQgPSAwOyBpVFhUIDwgbnVtYmVyVFhULmxlbmd0aDsgaVRYVCsrKSB7XG4gICAgICAgICAgICAgICAgVFhUICs9IG51bWJlclRYVC5jaGFyQXQoaVRYVCk7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5jaGFyQXQoaVRYVCkgPT09ICcuJykge1xuICAgICAgICAgICAgICAgICAgICBkZWNpbWFsU2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkaWdpdHMtLTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZGlnaXRzIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFRYVDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVjaW1hbFNldCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnLic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoZGlnaXRzID4gMCkge1xuICAgICAgICAgICAgICAgIFRYVCArPSAnMCc7XG4gICAgICAgICAgICAgICAgZGlnaXRzLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkRGVjaW1hbHModmFsdWUsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICBoYXNDb21tYXMgPSBoYXNDb21tYXMgfHwgdHJ1ZTtcbiAgICAgICAgICAgIHZhciBudW1iZXJUWFQgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIGhhc0RlY2ltYWxzID0gKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA+IDEpO1xuICAgICAgICAgICAgdmFyIGlEZWMgPSAwO1xuXG4gICAgICAgICAgICBpZiAoaGFzQ29tbWFzKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaUNoYXIgPSBudW1iZXJUWFQubGVuZ3RoIC0gMTsgaUNoYXIgPiAwOyBpQ2hhci0tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNEZWNpbWFscykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULmNoYXJBdChpQ2hhcikgIT09ICcuJyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpRGVjID0gKGlEZWMgKyAxKSAlIDM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaURlYyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCA9IG51bWJlclRYVC5zdWJzdHIoMCwgaUNoYXIpICsgJywnICsgbnVtYmVyVFhULnN1YnN0cihpQ2hhcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkZWNpbWFscyA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgdG9BREQ7XG4gICAgICAgICAgICAgICAgaWYgKG51bWJlclRYVC5zcGxpdCgnLicpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHM7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlclRYVCArPSAnLic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0b0FERCA9IG1pbkRlY2ltYWxzIC0gbnVtYmVyVFhULnNwbGl0KCcuJylbMV0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlICh0b0FERCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcwJztcbiAgICAgICAgICAgICAgICAgICAgdG9BREQtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVtYmVyVFhUO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcm91bmRUbyh2YWx1ZSwgZGlnaXRzKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh2YWx1ZSAqIE1hdGgucG93KDEwLCBkaWdpdHMpKSAvIE1hdGgucG93KDEwLCBkaWdpdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0U3VmZml4KGZvcm1hdFRYVCkge1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJy4nLCAnJyk7XG4gICAgICAgICAgICB2YXIgZml4ZXNUWFQgPSBmb3JtYXRUWFQuc3BsaXQobmV3IFJlZ0V4cCgnWzB8LHwjXSsnLCAnZycpKTtcbiAgICAgICAgICAgIHJldHVybiAoZml4ZXNUWFQubGVuZ3RoID4gMSkgPyBmaXhlc1RYVFsxXS50b1N0cmluZygpIDogJyc7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBpc0N1cnJlbmN5KHN0cmluZykge1xuICAgICAgICAgICAgdmFyIHMgPSAkLnRyaW0oc3RyaW5nKTtcblxuICAgICAgICAgICAgaWYgKHMgPT09ICckJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKsJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKlJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKjJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKhJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKxJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdLw4Q/JyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICdrcicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4LCoicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqicgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw4bigJknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqknIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqsnKSB7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZm9ybWF0KG51bWJlciwgZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0FycmF5KG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXJbbnVtYmVyLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfLmlzU3RyaW5nKG51bWJlcikgJiYgIV8uaXNOdW1iZXIobnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZm9ybWF0VFhUIHx8IGZvcm1hdFRYVC50b0xvd2VyQ2FzZSgpID09PSAnZGVmYXVsdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc05hTihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICc/JztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy92YXIgZm9ybWF0VFhUO1xuICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnJlcGxhY2UoJyZldXJvOycsICfDouKAmsKsJyk7XG5cbiAgICAgICAgICAgIC8vIERpdmlkZSArLy0gTnVtYmVyIEZvcm1hdFxuICAgICAgICAgICAgdmFyIGZvcm1hdHMgPSBmb3JtYXRUWFQuc3BsaXQoJzsnKTtcbiAgICAgICAgICAgIGlmIChmb3JtYXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0KE1hdGguYWJzKG51bWJlciksIGZvcm1hdHNbKChudW1iZXIgPj0gMCkgPyAwIDogMSldKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2F2ZSBTaWduXG4gICAgICAgICAgICB2YXIgc2lnbiA9IChudW1iZXIgPj0gMCkgPyAnJyA6ICctJztcbiAgICAgICAgICAgIG51bWJlciA9IE1hdGguYWJzKG51bWJlcik7XG5cblxuICAgICAgICAgICAgdmFyIGxlZnRPZkRlY2ltYWwgPSBmb3JtYXRUWFQ7XG4gICAgICAgICAgICB2YXIgZCA9IGxlZnRPZkRlY2ltYWwuaW5kZXhPZignLicpO1xuICAgICAgICAgICAgaWYgKGQgPiAtMSkge1xuICAgICAgICAgICAgICAgIGxlZnRPZkRlY2ltYWwgPSBsZWZ0T2ZEZWNpbWFsLnN1YnN0cmluZygwLCBkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBsZWZ0T2ZEZWNpbWFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSBub3JtYWxpemVkLmxhc3RJbmRleE9mKCdzJyk7XG4gICAgICAgICAgICB2YXIgaXNTaG9ydEZvcm1hdCA9IGluZGV4ID4gLTE7XG5cbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIG5leHRDaGFyID0gbGVmdE9mRGVjaW1hbC5jaGFyQXQoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICBpZiAobmV4dENoYXIgPT09ICcgJykge1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbGVhZGluZ1RleHQgPSBpc1Nob3J0Rm9ybWF0ID8gZm9ybWF0VFhULnN1YnN0cmluZygwLCBpbmRleCkgOiAnJztcbiAgICAgICAgICAgIHZhciByaWdodE9mUHJlZml4ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKSA6IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXgpO1xuXG4gICAgICAgICAgICAvL2ZpcnN0IGNoZWNrIHRvIG1ha2Ugc3VyZSAncycgaXMgYWN0dWFsbHkgc2hvcnQgZm9ybWF0IGFuZCBub3QgcGFydCBvZiBzb21lIGxlYWRpbmcgdGV4dFxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0ID0gL1swLTkjKl0vO1xuICAgICAgICAgICAgICAgIHZhciBzaG9ydEZvcm1hdFRlc3RSZXN1bHQgPSByaWdodE9mUHJlZml4Lm1hdGNoKHNob3J0Rm9ybWF0VGVzdCk7XG4gICAgICAgICAgICAgICAgaWYgKCFzaG9ydEZvcm1hdFRlc3RSZXN1bHQgfHwgc2hvcnRGb3JtYXRUZXN0UmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvL25vIHNob3J0IGZvcm1hdCBjaGFyYWN0ZXJzIHNvIHRoaXMgbXVzdCBiZSBsZWFkaW5nIHRleHQgaWUuICd3ZWVrcyAnXG4gICAgICAgICAgICAgICAgICAgIGlzU2hvcnRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgbGVhZGluZ1RleHQgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vaWYgKGZvcm1hdFRYVC5jaGFyQXQoMCkgPT0gJ3MnKVxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsU2NhbGUgPSBudW1iZXIgPT09IDAgPyAwIDogTWF0aC5mbG9vcihNYXRoLmxvZyhNYXRoLmFicyhudW1iZXIpKSAvICgzICogTWF0aC5MTjEwKSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSAoKG51bWJlciAvIE1hdGgucG93KDEwLCAzICogdmFsU2NhbGUpKSA8IDEwMDApID8gdmFsU2NhbGUgOiAodmFsU2NhbGUgKyAxKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWF4KHZhbFNjYWxlLCAwKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9IE1hdGgubWluKHZhbFNjYWxlLCA0KTtcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKTtcbiAgICAgICAgICAgICAgICAvL2lmICghaXNOYU4oTnVtYmVyKGZvcm1hdFRYVC5zdWJzdHIoMSkgKSApIClcblxuICAgICAgICAgICAgICAgIGlmICghaXNOYU4oTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSAmJiByaWdodE9mUHJlZml4LmluZGV4T2YoJy4nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpbWl0RGlnaXRzID0gTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobnVtYmVyIDwgTWF0aC5wb3coMTAsIGxpbWl0RGlnaXRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIGdldERpZ2l0cyhudW1iZXIsIE51bWJlcihyaWdodE9mUHJlZml4KSkgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIGdldERpZ2l0cyhudW1iZXIsIE51bWJlcihyaWdodE9mUHJlZml4KSkgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyBzaWduICsgTWF0aC5yb3VuZChudW1iZXIpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cigxKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cihpbmRleCArIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgU1VGRklYID0gZ2V0U3VmZml4KGZvcm1hdFRYVCk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMCwgZm9ybWF0VFhULmxlbmd0aCAtIFNVRkZJWC5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxXaXRob3V0TGVhZGluZyA9IGZvcm1hdCgoKHNpZ24gPT09ICcnKSA/IDEgOiAtMSkgKiBudW1iZXIsIGZvcm1hdFRYVCkgKyBzY2FsZXNbdmFsU2NhbGVdICsgU1VGRklYO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkgJiYgc2lnbiAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbFdpdGhvdXRMZWFkaW5nID0gdmFsV2l0aG91dExlYWRpbmcuc3Vic3RyKHNpZ24ubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHZhbFdpdGhvdXRMZWFkaW5nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN1YkZvcm1hdHMgPSBmb3JtYXRUWFQuc3BsaXQoJy4nKTtcbiAgICAgICAgICAgIHZhciBkZWNpbWFscztcbiAgICAgICAgICAgIHZhciBtaW5EZWNpbWFscztcbiAgICAgICAgICAgIGlmIChzdWJGb3JtYXRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IHN1YkZvcm1hdHNbMV0ubGVuZ3RoIC0gc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJ1swfCNdKycsICdnJyksICcnKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgbWluRGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCcwKycsICdnJyksICcnKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gc3ViRm9ybWF0c1swXSArIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlY2ltYWxzID0gMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGZpeGVzVFhUID0gZm9ybWF0VFhULnNwbGl0KG5ldyBSZWdFeHAoJ1swfCx8I10rJywgJ2cnKSk7XG4gICAgICAgICAgICB2YXIgcHJlZmZpeCA9IGZpeGVzVFhUWzBdLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgc3VmZml4ID0gKGZpeGVzVFhULmxlbmd0aCA+IDEpID8gZml4ZXNUWFRbMV0udG9TdHJpbmcoKSA6ICcnO1xuXG4gICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAoKGZvcm1hdFRYVC5zcGxpdCgnJScpLmxlbmd0aCA+IDEpID8gMTAwIDogMSk7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgIGlmKGZvcm1hdFRYVC5pbmRleE9mKCclJykgIT09IC0xKSBudW1iZXIgPSBudW1iZXIgKiAxMDA7XG4gICAgICAgICAgICBudW1iZXIgPSByb3VuZFRvKG51bWJlciwgZGVjaW1hbHMpO1xuXG4gICAgICAgICAgICBzaWduID0gKG51bWJlciA9PT0gMCkgPyAnJyA6IHNpZ247XG5cbiAgICAgICAgICAgIHZhciBoYXNDb21tYXMgPSAoZm9ybWF0VFhULnN1YnN0cihmb3JtYXRUWFQubGVuZ3RoIC0gNCAtIHN1ZmZpeC5sZW5ndGgsIDEpID09PSAnLCcpO1xuICAgICAgICAgICAgdmFyIGZvcm1hdHRlZCA9IHNpZ24gKyBwcmVmZml4ICsgYWRkRGVjaW1hbHMobnVtYmVyLCBkZWNpbWFscywgbWluRGVjaW1hbHMsIGhhc0NvbW1hcykgKyBzdWZmaXg7XG5cbiAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhvcmlnaW5hbE51bWJlciwgb3JpZ2luYWxGb3JtYXQsIGZvcm1hdHRlZClcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXR0ZWQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybWF0O1xuICAgIH0oKSlcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIEF0dHJpYnV0ZXMgd2hpY2ggYXJlIGp1c3QgcGFyYW1ldGVycyB0byBvdGhlcnMgYW5kIGNhbiBqdXN0IGJlIGlnbm9yZWRcbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/Om1vZGVsfGNvbnZlcnQpJC9pLFxuXG4gICAgaGFuZGxlOiAkLm5vb3AsXG5cbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiBmdW5jdGlvbiAoYXR0ciwgJG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoJ29uLWluaXQnKSA9PT0gMCk7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKGF0dHIsIHZhbHVlKSB7XG4gICAgICAgIGF0dHIgPSBhdHRyLnJlcGxhY2UoJ29uLWluaXQnLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGxpc3RPZk9wZXJhdGlvbnMgPSBfLmludm9rZSh2YWx1ZS5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgbGlzdE9mT3BlcmF0aW9ucyA9IGxpc3RPZk9wZXJhdGlvbnMubWFwKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBmbk5hbWUgPSB2YWx1ZS5zcGxpdCgnKCcpWzBdO1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB2YWx1ZS5zdWJzdHJpbmcodmFsdWUuaW5kZXhPZignKCcpICsgMSwgdmFsdWUuaW5kZXhPZignKScpKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9ICgkLnRyaW0ocGFyYW1zKSAhPT0gJycpID8gcGFyYW1zLnNwbGl0KCcsJykgOiBbXTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge25hbWU6IGZuTmFtZSwgcGFyYW1zOiBhcmdzfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7b3BlcmF0aW9uczogbGlzdE9mT3BlcmF0aW9ucywgc2VyaWFsOiB0cnVlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJzpjaGVja2JveCw6cmFkaW8nLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNldHRhYmxlVmFsdWUgPSB0aGlzLmF0dHIoJ3ZhbHVlJyk7IC8vaW5pdGlhbCB2YWx1ZVxuICAgICAgICAvKmpzbGludCBlcWVxOiB0cnVlKi9cbiAgICAgICAgdmFyIGlzQ2hlY2tlZCA9IChzZXR0YWJsZVZhbHVlICE9PSB1bmRlZmluZWQpID8gKHNldHRhYmxlVmFsdWUgPT0gdmFsdWUpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKCdjaGVja2VkJywgaXNDaGVja2VkKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0YXJnZXQ6ICdpbnB1dCwgc2VsZWN0JyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmFsKHZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdjbGFzcycsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYWRkZWRDbGFzc2VzID0gdGhpcy5kYXRhKCdhZGRlZC1jbGFzc2VzJyk7XG4gICAgICAgIGlmICghYWRkZWRDbGFzc2VzKSB7XG4gICAgICAgICAgICBhZGRlZENsYXNzZXMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWRkZWRDbGFzc2VzW3Byb3BdKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKGFkZGVkQ2xhc3Nlc1twcm9wXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc051bWJlcih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gJ3ZhbHVlLScgKyB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBhZGRlZENsYXNzZXNbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgLy9GaXhtZTogcHJvcCBpcyBhbHdheXMgXCJjbGFzc1wiXG4gICAgICAgIHRoaXMuYWRkQ2xhc3ModmFsdWUpO1xuICAgICAgICB0aGlzLmRhdGEoJ2FkZGVkLWNsYXNzZXMnLCBhZGRlZENsYXNzZXMpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzpjaGVja2VkfHNlbGVjdGVkfGFzeW5jfGF1dG9mb2N1c3xhdXRvcGxheXxjb250cm9sc3xkZWZlcnxpc21hcHxsb29wfG11bHRpcGxlfG9wZW58cmVxdWlyZWR8c2NvcGVkKSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciB2YWwgPSAodGhpcy5hdHRyKCd2YWx1ZScpKSA/ICh2YWx1ZSA9PSB0aGlzLnByb3AoJ3ZhbHVlJykpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbCk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24tJykgPT09IDApO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbihhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi0nLCAnJyk7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIHRoaXMub24oYXR0ciwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7bmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3N9O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG1lLnRyaWdnZXIoJ2YudWkub3BlcmF0ZScsIHtvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmRpc2FibGVkfGhpZGRlbnxyZWFkb25seSkkL2ksXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCAhdmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVt2YWx1ZS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmh0bWwodmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGVzdDogJyonLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWx1ZSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1pbnB1dC1ub2RlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKCB7XG5cbiAgICBwcm9wZXJ0eUhhbmRsZXJzIDogW1xuXG4gICAgXSxcblxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbCA9IHRoaXMuJGVsO1xuICAgICAgICAvL1RPRE86IGZpbGUgYSBpc3N1ZSBmb3IgdGhlIHZlbnNpbSBtYW5hZ2VyIHRvIGNvbnZlcnQgdHJ1ZXMgdG8gMXMgYW5kIHNldCB0aGlzIHRvIHRydWUgYW5kIGZhbHNlXG5cbiAgICAgICAgdmFyIG9mZlZhbCA9ICAoJGVsLmRhdGEoJ2Ytb2ZmJykgIT09IHVuZGVmaW5lZCApID8gJGVsLmRhdGEoJ2Ytb2ZmJykgOiAwO1xuICAgICAgICAvL2F0dHIgPSBpbml0aWFsIHZhbHVlLCBwcm9wID0gY3VycmVudCB2YWx1ZVxuICAgICAgICB2YXIgb25WYWwgPSAoJGVsLmF0dHIoJ3ZhbHVlJykgIT09IHVuZGVmaW5lZCApID8gJGVsLnByb3AoJ3ZhbHVlJyk6IDE7XG5cbiAgICAgICAgdmFyIHZhbCA9ICgkZWwuaXMoJzpjaGVja2VkJykpID8gb25WYWwgOiBvZmZWYWw7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwge3NlbGVjdG9yOiAnOmNoZWNrYm94LDpyYWRpbyd9KTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi8uLi9jb25maWcnKTtcbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKCB7XG4gICAgcHJvcGVydHlIYW5kbGVycyA6IFtdLFxuXG4gICAgdWlDaGFuZ2VFdmVudDogJ2NoYW5nZScsXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwudmFsKCk7XG4gICAgfSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgdmFyIHByb3BOYW1lID0gdGhpcy4kZWwuZGF0YShjb25maWcuYmluZGVyQXR0cik7XG5cbiAgICAgICAgaWYgKHByb3BOYW1lKSB7XG4gICAgICAgICAgICB0aGlzLiRlbC5vbih0aGlzLnVpQ2hhbmdlRXZlbnQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gbWUuZ2V0VUlWYWx1ZSgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgICAgIHBhcmFtc1twcm9wTmFtZV0gPSB2YWw7XG5cbiAgICAgICAgICAgICAgICBtZS4kZWwudHJpZ2dlcihjb25maWcuZXZlbnRzLnRyaWdnZXIsIHBhcmFtcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwge3NlbGVjdG9yOiAnaW5wdXQsIHNlbGVjdCd9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKCB7XG4gICAgcHJvcGVydHlIYW5kbGVycyA6IFtcblxuICAgIF0sXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgfVxufSwge3NlbGVjdG9yOiAnKid9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGV4dGVuZCA9IGZ1bmN0aW9uKHByb3RvUHJvcHMsIHN0YXRpY1Byb3BzKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgdmFyIGNoaWxkO1xuXG4gICAgLy8gVGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciB0aGUgbmV3IHN1YmNsYXNzIGlzIGVpdGhlciBkZWZpbmVkIGJ5IHlvdVxuICAgIC8vICh0aGUgXCJjb25zdHJ1Y3RvclwiIHByb3BlcnR5IGluIHlvdXIgYGV4dGVuZGAgZGVmaW5pdGlvbiksIG9yIGRlZmF1bHRlZFxuICAgIC8vIGJ5IHVzIHRvIHNpbXBseSBjYWxsIHRoZSBwYXJlbnQncyBjb25zdHJ1Y3Rvci5cbiAgICBpZiAocHJvdG9Qcm9wcyAmJiBfLmhhcyhwcm90b1Byb3BzLCAnY29uc3RydWN0b3InKSkge1xuICAgICAgICBjaGlsZCA9IHByb3RvUHJvcHMuY29uc3RydWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2hpbGQgPSBmdW5jdGlvbigpeyByZXR1cm4gcGFyZW50LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7IH07XG4gICAgfVxuXG4gICAgLy8gQWRkIHN0YXRpYyBwcm9wZXJ0aWVzIHRvIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiwgaWYgc3VwcGxpZWQuXG4gICAgXy5leHRlbmQoY2hpbGQsIHBhcmVudCwgc3RhdGljUHJvcHMpO1xuXG4gICAgLy8gU2V0IHRoZSBwcm90b3R5cGUgY2hhaW4gdG8gaW5oZXJpdCBmcm9tIGBwYXJlbnRgLCB3aXRob3V0IGNhbGxpbmdcbiAgICAvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgIHZhciBTdXJyb2dhdGUgPSBmdW5jdGlvbigpeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH07XG4gICAgU3Vycm9nYXRlLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgY2hpbGQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZSgpO1xuXG4gICAgLy8gQWRkIHByb3RvdHlwZSBwcm9wZXJ0aWVzIChpbnN0YW5jZSBwcm9wZXJ0aWVzKSB0byB0aGUgc3ViY2xhc3MsXG4gICAgLy8gaWYgc3VwcGxpZWQuXG4gICAgaWYgKHByb3RvUHJvcHMpIHtcbiAgICAgICAgXy5leHRlbmQoY2hpbGQucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgYSBjb252ZW5pZW5jZSBwcm9wZXJ0eSBpbiBjYXNlIHRoZSBwYXJlbnQncyBwcm90b3R5cGUgaXMgbmVlZGVkXG4gICAgLy8gbGF0ZXIuXG4gICAgY2hpbGQuX19zdXBlcl9fID0gcGFyZW50LnByb3RvdHlwZTtcblxuICAgIHJldHVybiBjaGlsZDtcbn07XG5cbnZhciBWaWV3ID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHRoaXMuJGVsID0gJChvcHRpb25zLmVsKTtcbiAgICB0aGlzLmVsID0gb3B0aW9ucy5lbDtcbiAgICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxufTtcblxuXy5leHRlbmQoVmlldy5wcm90b3R5cGUsIHtcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpe30sXG59KTtcblxuVmlldy5leHRlbmQgPSBleHRlbmQ7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldztcbiJdfQ==
;