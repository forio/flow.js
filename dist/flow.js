/**

++++++++   ++++++++   ++++++++           Flow.js
++++++++   ,+++++++~   ++++++++          v0.6.4
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
window.Flow.version = '<%= version %>'; //populated by grunt

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


},{"./no-op-attr":19,"./events/init-event-attr":20,"./events/default-event-attr":21,"./binds/input-bind-attr":22,"./binds/checkbox-radio-bind-attr":23,"./class-attr":24,"./positive-boolean-attr":25,"./negative-boolean-attr":26,"./binds/default-bind-attr":27,"./default-attr":28}],10:[function(require,module,exports){
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
    target: 'input, select',

    test: 'bind',

    handle: function (value) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        this.val(value);
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9hcHAuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZmxvdy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vZG9tLW1hbmFnZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY2hhbm5lbHMvY2hhbm5lbC1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy91dGlscy9wYXJzZS11dGlscy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jaGFubmVscy9vcGVyYXRpb25zLWNoYW5uZWwuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvbm9kZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbnZlcnRlcnMvbnVtYmVyLWNvbnZlcnRlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jb252ZXJ0ZXJzL3N0cmluZy1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9hcnJheS1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2luaXQtZXZlbnQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2lucHV0LWJpbmQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9jaGVja2JveC1yYWRpby1iaW5kLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9wb3NpdGl2ZS1ib29sZWFuLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2RlZmF1bHQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvaW5wdXQtY2hlY2tib3gtbm9kZS5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL25vZGVzL2Jhc2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsid2luZG93LkZsb3cgPSByZXF1aXJlKCcuL2Zsb3cuanMnKTtcbndpbmRvdy5GbG93LnZlcnNpb24gPSAnPCU9IHZlcnNpb24gJT4nOyAvL3BvcHVsYXRlZCBieSBncnVudFxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZG9tTWFuYWdlciA9IHJlcXVpcmUoJy4vZG9tL2RvbS1tYW5hZ2VyJyk7XG52YXIgQ2hhbm5lbCA9IHJlcXVpcmUoJy4vY2hhbm5lbHMvY2hhbm5lbC1tYW5hZ2VyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGRvbTogZG9tTWFuYWdlcixcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICB2YXIgbW9kZWwgPSAkKCdib2R5JykuZGF0YSgnZi1tb2RlbCcpO1xuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHtcbiAgICAgICAgICAgICAgICBhY2NvdW50OiAnJyxcbiAgICAgICAgICAgICAgICBwcm9qZWN0OiAnJyxcbiAgICAgICAgICAgICAgICBtb2RlbDogbW9kZWxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkb206IHtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBvcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIGRlZmF1bHRzLCBjb25maWcpO1xuICAgICAgICBpZiAoY29uZmlnICYmIGNvbmZpZy5jaGFubmVsICYmIChjb25maWcuY2hhbm5lbCBpbnN0YW5jZW9mIENoYW5uZWwpKSB7XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwgPSBjb25maWcuY2hhbm5lbDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2hhbm5lbCA9IG5ldyBDaGFubmVsKG9wdGlvbnMuY2hhbm5lbCk7XG4gICAgICAgIH1cblxuICAgICAgICBkb21NYW5hZ2VyLmluaXRpYWxpemUoJC5leHRlbmQodHJ1ZSwge1xuICAgICAgICAgICAgY2hhbm5lbDogdGhpcy5jaGFubmVsXG4gICAgICAgIH0pKTtcbiAgICB9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIHZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxuICAgIHZhciBub2RlTWFuYWdlciA9IHJlcXVpcmUoJy4vbm9kZXMvbm9kZS1tYW5hZ2VyLmpzJyk7XG4gICAgdmFyIGF0dHJNYW5hZ2VyID0gcmVxdWlyZSgnLi9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzJyk7XG4gICAgdmFyIGNvbnZlcnRlck1hbmFnZXIgPSByZXF1aXJlKCcuLi9jb252ZXJ0ZXJzL2NvbnZlcnRlci1tYW5hZ2VyLmpzJyk7XG5cbiAgICB2YXIgcGFyc2VVdGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3BhcnNlLXV0aWxzJyk7XG5cbiAgICAvL0pxdWVyeSBzZWxlY3RvciB0byByZXR1cm4gZXZlcnl0aGluZyB3aGljaCBoYXMgYSBmLSBwcm9wZXJ0eSBzZXRcbiAgICAkLmV4cHJbJzonXVtjb25maWcucHJlZml4XSA9IGZ1bmN0aW9uKG9iail7XG4gICAgICAgIHZhciAkdGhpcyA9ICQob2JqKTtcbiAgICAgICAgdmFyIGRhdGFwcm9wcyA9IF8ua2V5cygkdGhpcy5kYXRhKCkpO1xuXG4gICAgICAgIHZhciBtYXRjaCA9IF8uZmluZChkYXRhcHJvcHMsIGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZihjb25maWcucHJlZml4KSA9PT0gMCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiAhIShtYXRjaCk7XG4gICAgfTtcblxuICAgICQuZXhwclsnOiddLndlYmNvbXBvbmVudCA9IGZ1bmN0aW9uKG9iail7XG4gICAgICAgIHJldHVybiBvYmoubm9kZU5hbWUuaW5kZXhPZignLScpICE9PSAtMTtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcblxuICAgICAgICBub2Rlczogbm9kZU1hbmFnZXIsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJNYW5hZ2VyLFxuICAgICAgICBjb252ZXJ0ZXJzOiBjb252ZXJ0ZXJNYW5hZ2VyLFxuICAgICAgICAvL3V0aWxzIGZvciB0ZXN0aW5nXG4gICAgICAgIHByaXZhdGU6IHtcblxuICAgICAgICB9LFxuXG4gICAgICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgICAgICByb290OiAnYm9keScsXG4gICAgICAgICAgICAgICAgY2hhbm5lbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICQuZXh0ZW5kKGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBkZWZhdWx0cy5jaGFubmVsO1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgICAgICAgdmFyICRyb290ID0gJChkZWZhdWx0cy5yb290KTtcbiAgICAgICAgICAgICQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAvL3BhcnNlIHRocm91Z2ggZG9tIGFuZCBmaW5kIGV2ZXJ5dGhpbmcgd2l0aCBtYXRjaGluZyBhdHRyaWJ1dGVzXG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoZWRFbGVtZW50cyA9ICRyb290LmZpbmQoJzonICsgY29uZmlnLnByZWZpeCk7XG4gICAgICAgICAgICAgICAgaWYgKCRyb290LmlzKCc6JyArIGNvbmZpZy5wcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRFbGVtZW50cyA9IG1hdGNoZWRFbGVtZW50cy5hZGQoJChkZWZhdWx0cy5yb290KSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbWUucHJpdmF0ZS5tYXRjaGVkRWxlbWVudHMgPSBtYXRjaGVkRWxlbWVudHM7XG5cbiAgICAgICAgICAgICAgICAkLmVhY2gobWF0Y2hlZEVsZW1lbnRzLCBmdW5jdGlvbihpbmRleCwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIEhhbmRsZXIgPSBub2RlTWFuYWdlci5nZXRIYW5kbGVyKCRlbCk7XG4gICAgICAgICAgICAgICAgICAgIG5ldyBIYW5kbGVyLmhhbmRsZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbDogZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YXJNYXAgPSAkZWwuZGF0YSgndmFyaWFibGUtYXR0ci1tYXAnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2YXJNYXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhck1hcCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9OT1RFOiBsb29waW5nIHRocm91Z2ggYXR0cmlidXRlcyBpbnN0ZWFkIG9mIC5kYXRhIGJlY2F1c2UgLmRhdGEgYXV0b21hdGljYWxseSBjYW1lbGNhc2VzIHByb3BlcnRpZXMgYW5kIG1ha2UgaXQgaGFyZCB0byByZXRydmlldmVcbiAgICAgICAgICAgICAgICAgICAgICAgICQoZWxlbWVudC5hdHRyaWJ1dGVzKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBub2RlTWFwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IG5vZGVNYXAubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJWYWwgPSBub2RlTWFwLnZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHdhbnRlZFByZWZpeCA9ICdkYXRhLWYtJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ci5pbmRleE9mKHdhbnRlZFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSh3YW50ZWRQcmVmaXgsICcnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIoYXR0ciwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzQmluZGFibGVBdHRyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhbmRsZXIgJiYgaGFuZGxlci5pbml0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0JpbmRhYmxlQXR0ciA9IGhhbmRsZXIuaW5pdC5jYWxsKCRlbCwgYXR0ciwgYXR0clZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNCaW5kYWJsZUF0dHIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vQ29udmVydCBwaXBlcyB0byBjb252ZXJ0ZXIgYXR0cnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aXRoQ29udiA9IF8uaW52b2tlKGF0dHJWYWwuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3aXRoQ29udi5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0clZhbCA9IHdpdGhDb252LnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ2YtY29udmVydGVycy0nICsgYXR0ciwgd2l0aENvbnYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29tbWFSZWdleCA9IC8sKD8hW15cXFtdKlxcXSkvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJWYWwuc3BsaXQoY29tbWFSZWdleCkubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ET1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRyaWdnZXJlcnMgPSB0cmlnZ2VyZXJzLmNvbmNhdCh2YWwuc3BsaXQoJywnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJNYXBbYXR0clZhbF0gPSBhdHRyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGF0YSgndmFyaWFibGUtYXR0ci1tYXAnLCB2YXJNYXApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHN1YnNjcmliYWJsZSA9IE9iamVjdC5rZXlzKHZhck1hcCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWJzY3JpYmFibGUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFubmVsLnZhcmlhYmxlcy5zdWJzY3JpYmUoT2JqZWN0LmtleXModmFyTWFwKSwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy9BdHRhY2ggbGlzdGVuZXJzXG4gICAgICAgICAgICAgICAgLy9UT0RPOiBzcGxpdCBpbml0aWFsaXplIGludG8gbXVsdGlwbGUgc3ViIGV2ZW50cywgYXQgbGVhc3QgQWRkICYgdGhlbiBhdHRhY2ggaGFuZGxlcnNcbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy5yZWFjdCkub24oY29uZmlnLmV2ZW50cy5yZWFjdCwgZnVuY3Rpb24oZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGV2dC50YXJnZXQsIGRhdGEsIFwicm9vdCBvblwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZXZ0LnRhcmdldCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB2YXJtYXAgPSAkZWwuZGF0YSgndmFyaWFibGUtYXR0ci1tYXAnKTtcblxuICAgICAgICAgICAgICAgICAgICAkLmVhY2goZGF0YSwgZnVuY3Rpb24odmFyaWFibGVOYW1lLCB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByb3BlcnR5VG9VcGRhdGUgPSB2YXJtYXBbdmFyaWFibGVOYW1lLnRyaW0oKV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlUb1VwZGF0ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9mLWNvbnZlcnRlcnMtKiBpcyBhbHJlYWR5IHNldCB3aGlsZSBwYXJzaW5nIHRoZSB2YXJtYXAsIGFzIGFuIGFycmF5IHRvIGJvb3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0ZXJzLScgKyBwcm9wZXJ0eVRvVXBkYXRlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYXR0ckNvbnZlcnRlcnMgJiYgcHJvcGVydHlUb1VwZGF0ZSA9PT0gJ2JpbmQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgJHBhcmVudEVsID0gJGVsLmNsb3Nlc3QoJ1tkYXRhLWYtY29udmVydF0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkcGFyZW50RWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRwYXJlbnRFbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSBhdHRyQ29udmVydGVycy5zcGxpdCgnfCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb252ZXJ0ZWRWYWx1ZSA9IGNvbnZlcnRlck1hbmFnZXIuY29udmVydCh2YWx1ZSwgYXR0ckNvbnZlcnRlcnMpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUb1VwZGF0ZSA9IHByb3BlcnR5VG9VcGRhdGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlciA9IGF0dHJNYW5hZ2VyLmdldEhhbmRsZXIocHJvcGVydHlUb1VwZGF0ZSwgJGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLmhhbmRsZS5jYWxsKCRlbCwgY29udmVydGVkVmFsdWUsIHByb3BlcnR5VG9VcGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICRyb290Lm9mZihjb25maWcuZXZlbnRzLnRyaWdnZXIpLm9uKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgZnVuY3Rpb24oZXZ0LCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJzZWREYXRhID0ge307IC8vaWYgbm90IGFsbCBzdWJzZXF1ZW50IGxpc3RlbmVycyB3aWxsIGdldCB0aGUgbW9kaWZpZWQgZGF0YVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vZi1jb252ZXJ0ZXJzLSogaXMgYWxyZWFkeSBzZXQgd2hpbGUgcGFyc2luZyB0aGUgdmFybWFwLCBhcyBhbiBhcnJheSB0byBib290XG4gICAgICAgICAgICAgICAgICAgIHZhciBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnRlcnMtYmluZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgJHBhcmVudEVsID0gJGVsLmNsb3Nlc3QoJ1tkYXRhLWYtY29udmVydF0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHBhcmVudEVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gJHBhcmVudEVsLmRhdGEoJ2YtY29udmVydCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gYXR0ckNvbnZlcnRlcnMuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChkYXRhLCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleSA9IGtleS5zcGxpdCgnfCcpWzBdLnRyaW0oKTsgLy9pbiBjYXNlIHRoZSBwaXBlIGZvcm1hdHRpbmcgc3ludGF4IHdhcyB1c2VkXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBjb252ZXJ0ZXJNYW5hZ2VyLnBhcnNlKHZhbCwgYXR0ckNvbnZlcnRlcnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkRGF0YVtrZXldID0gcGFyc2VVdGlscy50b0ltcGxpY2l0VHlwZSh2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC52YXJpYWJsZXMucHVibGlzaChwYXJzZWREYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICRyb290Lm9mZignZi51aS5vcGVyYXRlJykub24oJ2YudWkub3BlcmF0ZScsIGZ1bmN0aW9uKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gJC5leHRlbmQodHJ1ZSwge30sIGRhdGEpOyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGRhdGEub3BlcmF0aW9ucywgZnVuY3Rpb24gKG9wbikge1xuICAgICAgICAgICAgICAgICAgICAgICBvcG4ucGFyYW1zID0gXy5tYXAob3BuLnBhcmFtcywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUoJC50cmltKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwub3BlcmF0aW9ucy5wdWJsaXNoKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn0oKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBWYXJzQ2hhbm5lbCA9IHJlcXVpcmUoJy4vdmFyaWFibGVzLWNoYW5uZWwnKTtcbnZhciBPcGVyYXRpb25zQ2hhbm5lbCA9IHJlcXVpcmUoJy4vb3BlcmF0aW9ucy1jaGFubmVsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgY29uZmlnID0ge307XG4gICAgfVxuXG4gICAgdmFyIHJ1bnBhcmFtcyA9IGNvbmZpZztcblxuICAgIHZhciBycyA9IG5ldyBGLnNlcnZpY2UuUnVuKHJ1bnBhcmFtcyk7XG5cbiAgICB3aW5kb3cucnVuID0gcnM7XG4gICAgLy9UT0RPOiBzdG9yZSBydW5pZCBpbiB0b2tlbiBldGMuIEJ1dCBpZiB5b3UgZG8gdGhpcywgbWFrZSBzdXJlIHlvdSByZW1vdmUgdG9rZW4gb24gcmVzZXRcbiAgICB2YXIgJGNyZWF0aW9uUHJvbWlzZSA9IHJzLmNyZWF0ZShjb25maWcubW9kZWwpO1xuICAgIHJzLmN1cnJlbnRQcm9taXNlID0gJGNyZWF0aW9uUHJvbWlzZTtcblxuICAgIHZhciBjcmVhdGVBbmRUaGVuID0gZnVuY3Rpb24odmFsdWUsIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIF8ud3JhcCh2YWx1ZSwgZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgdmFyIHBhc3NlZEluUGFyYW1zID0gXy50b0FycmF5KGFyZ3VtZW50cykuc2xpY2UoMSk7XG4gICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2UudGhlbihmdW5jdGlvbiAoKXtcbiAgICAgICAgICAgICAgICBycy5jdXJyZW50UHJvbWlzZSA9IGZ1bmMuYXBwbHkoY29udGV4dCwgcGFzc2VkSW5QYXJhbXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBycy5jdXJyZW50UHJvbWlzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy9NYWtlIHN1cmUgbm90aGluZyBoYXBwZW5zIGJlZm9yZSB0aGUgcnVuIGlzIGNyZWF0ZWRcbiAgICBfLmVhY2gocnMsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIGlmICgkLmlzRnVuY3Rpb24odmFsdWUpICYmIG5hbWUgIT09ICd2YXJpYWJsZXMnKSB7XG4gICAgICAgICAgICByc1tuYW1lXSA9IGNyZWF0ZUFuZFRoZW4odmFsdWUsIHJzKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHZhciB2cyA9IHJzLnZhcmlhYmxlcygpO1xuICAgIF8uZWFjaCh2cywgZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgaWYgKCQuaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZzW25hbWVdID0gY3JlYXRlQW5kVGhlbih2YWx1ZSwgdnMpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLnJ1biA9IHJzO1xuICAgIHRoaXMudmFyaWFibGVzID0gbmV3IFZhcnNDaGFubmVsKHtydW46IHJzLCB2ZW50OiB0aGlzfSk7XG4gICAgdGhpcy5vcGVyYXRpb25zID0gbmV3IE9wZXJhdGlvbnNDaGFubmVsKHtydW46IHJzLCB2ZW50OiB0aGlzfSk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJlZml4OiAnZicsXG4gICAgZGVmYXVsdEF0dHI6ICdiaW5kJyxcblxuICAgIGJpbmRlckF0dHI6ICdmLWJpbmQnLFxuXG4gICAgZXZlbnRzOiB7XG4gICAgICAgIHRyaWdnZXI6ICd1cGRhdGUuZi51aScsXG4gICAgICAgIHJlYWN0OiAndXBkYXRlLmYubW9kZWwnXG4gICAgfVxuXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRvSW1wbGljaXRUeXBlOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB2YXIgcmJyYWNlID0gL14oPzpcXHsuKlxcfXxcXFsuKlxcXSkkLztcbiAgICAgICAgdmFyIGNvbnZlcnRlZCA9IGRhdGE7XG4gICAgICAgIGlmICggdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICkge1xuICAgICAgICAgICAgZGF0YSA9IGRhdGEudHJpbSgpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRhdGEgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGRhdGEgPT09ICdudWxsJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkYXRhID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZihjb252ZXJ0ZWQuY2hhckF0KDApID09PSAnXFwnJyB8fCBjb252ZXJ0ZWQuY2hhckF0KDApID09PSAnXCInKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZGF0YS5zdWJzdHJpbmcoMSwgZGF0YS5sZW5ndGggLTEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoJC5pc051bWVyaWMoIGRhdGEgKSkge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9ICtkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoIHJicmFjZS50ZXN0KCBkYXRhICkpIHtcbiAgICAgICAgICAgICAgICAvL1RPRE86IFRoaXMgb25seSB3b3JrcyB3aXRoIGRvdWJsZSBxdW90ZXMsIGkuZS4sIFsxLFwiMlwiXSB3b3JrcyBidXQgbm90IFsxLCcyJ11cbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSAkLnBhcnNlSlNPTiggZGF0YSApIDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udmVydGVkO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgY29uZmlnID0ge307XG4gICAgfVxuICAgIHZhciBydW4gPSBjb25maWcucnVuO1xuICAgIHZhciB2ZW50ID0gY29uZmlnLnZlbnQ7XG5cbiAgICB2YXIgcHVibGljQVBJID0ge1xuICAgICAgICBsaXN0ZW5lck1hcDoge30sXG5cbiAgICAgICAgLy9DaGVjayBmb3IgdXBkYXRlc1xuICAgICAgICByZWZyZXNoOiBmdW5jdGlvbihvcGVyYXRpb24scmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vIHZhciBESVJUWV9PUEVSQVRJT05TID0gWydzdGFydF9nYW1lJywgJ2luaXRpYWxpemUnLCAnc3RlcCddO1xuICAgICAgICAgICAgLy8gaWYgKF8uY29udGFpbnMoRElSVFlfT1BFUkFUSU9OUywgb3BlcmF0aW9uKSkge1xuICAgICAgICAgICAgJCh2ZW50KS50cmlnZ2VyKCdkaXJ0eScsIHtvcG46IG9wZXJhdGlvbiwgcmVzcG9uc2U6IHJlc3BvbnNlfSk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE9wZXJhdGlvbiBuYW1lICYgcGFyYW1ldGVycyB0byBzZW5kIHRvIG9wZXJhdGlvbnMgQVBJXG4gICAgICAgICAqIEBwYXJhbSAge3N0cmluZyB8IG9iamVjdH0gb3BlcmF0aW9uIE5hbWUgb2YgT3BlcmF0aW9uLiBJZiBhcnJheSwgbmVlZHMgdG8gYmUgaW4ge29wZXJhdGlvbnM6IFt7bmFtZTogb3BuLCBwYXJhbXM6W119XSwgc2VyaWFsOiBib29sZWFufV0gZm9ybWF0XG4gICAgICAgICAqIEBwYXJhbSAgeyp9IHBhcmFtcyAob3B0aW9uYWwpICAgcGFyYW1zIHRvIHNlbmQgdG8gb3BlcnRhaW9uXG4gICAgICAgICAqIEByZXR1cm4geyRwcm9taXNlfVxuICAgICAgICAgKi9cbiAgICAgICAgcHVibGlzaDogZnVuY3Rpb24ob3BlcmF0aW9uLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uLm9wZXJhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSAob3BlcmF0aW9uLnNlcmlhbCkgPyBydW4uc2VyaWFsIDogcnVuLnBhcmFsbGVsO1xuICAgICAgICAgICAgICAgIHJldHVybiBmbi5jYWxsKHJ1biwgb3BlcmF0aW9uLm9wZXJhdGlvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5yZWZyZXNoLmNhbGwobWUsIF8ob3BlcmF0aW9uLm9wZXJhdGlvbnMpLnBsdWNrKCduYW1lJyksIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPOiBjaGVjayBpZiBpbnRlcnBvbGF0ZWRcbiAgICAgICAgICAgICAgICByZXR1cm4gcnVuLmRvLmFwcGx5KHJ1biwgYXJndW1lbnRzKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgb3BlcmF0aW9uLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ29wZXJhdGlvbnMgcHVibGlzaCcsIG9wZXJhdGlvbiwgcGFyYW1zKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uKG9wZXJhdGlvbnMsIHN1YnNjcmliZXIpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdvcGVyYXRpb25zIHN1YnNjcmliZScsIG9wZXJhdGlvbnMsIHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgb3BlcmF0aW9ucyA9IFtdLmNvbmNhdChvcGVyYXRpb25zKTtcbiAgICAgICAgICAgIC8vdXNlIGpxdWVyeSB0byBtYWtlIGV2ZW50IHNpbmtcbiAgICAgICAgICAgIC8vVE9ETzogc3Vic2NyaWJlciBjYW4gYmUgYSBmdW5jdGlvblxuICAgICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLm9uKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLm9wZXJhdGlvbicpO1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIHRhcmdldDogc3Vic2NyaWJlclxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgICQuZWFjaChvcGVyYXRpb25zLCBmdW5jdGlvbihpbmRleCwgb3BuKSB7XG4gICAgICAgICAgICAgICAgbWUubGlzdGVuZXJNYXBbb3BuXSA9IG1lLmxpc3RlbmVyTWFwW29wbl0uY29uY2F0KGRhdGEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBpZDtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmU6IGZ1bmN0aW9uKHZhcmlhYmxlLCB0b2tlbikge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lck1hcCA9IF8ucmVqZWN0KHRoaXMubGlzdGVuZXJNYXAsIGZ1bmN0aW9uKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmVBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lck1hcCA9IFtdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gJC5leHRlbmQodGhpcywgcHVibGljQVBJKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgdmFyIHJldCA9IFtdO1xuICAgIC8vbm9tYWxpemUoJ2ZsaXAnLCBmbilcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGNvbnZlcnRlcikpIHtcbiAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgYWxpYXM6IGFsaWFzLFxuICAgICAgICAgICAgY29udmVydDogY29udmVydGVyXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIGlmIChfLmlzT2JqZWN0KGNvbnZlcnRlcikgJiYgY29udmVydGVyLmNvbnZlcnQpIHtcbiAgICAgICAgY29udmVydGVyLmFsaWFzID0gYWxpYXM7XG4gICAgICAgIHJldC5wdXNoKGNvbnZlcnRlcik7XG4gICAgfVxuICAgIGVsc2UgaWYoXy5pc09iamVjdChhbGlhcykpIHtcbiAgICAgICAgLy9ub3JtYWxpemUoe2FsaWFzOiAnZmxpcCcsIGNvbnZlcnQ6IGZ1bmN0aW9ufSlcbiAgICAgICAgaWYgKGFsaWFzLmNvbnZlcnQpIHtcbiAgICAgICAgICAgIHJldC5wdXNoKGFsaWFzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vcm1hbGl6ZSh7ZmxpcDogZnVufSlcbiAgICAgICAgICAgICQuZWFjaChhbGlhcywgZnVuY3Rpb24gKGtleSwgdmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBhbGlhczoga2V5LFxuICAgICAgICAgICAgICAgICAgICBjb252ZXJ0OiB2YWxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG52YXIgbWF0Y2hDb252ZXJ0ZXIgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgIGlmIChfLmlzU3RyaW5nKGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGFsaWFzID09PSBjb252ZXJ0ZXIuYWxpYXM7XG4gICAgfVxuICAgIGVsc2UgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIuYWxpYXMoYWxpYXMpO1xuICAgIH1cbiAgICBlbHNlIGlmIChfLmlzUmVnZXgoY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzLm1hdGNoKGFsaWFzKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIGNvbnZlcnRlck1hbmFnZXIgPSB7XG4gICAgcHJpdmF0ZToge1xuICAgICAgICBtYXRjaENvbnZlcnRlcjogbWF0Y2hDb252ZXJ0ZXJcbiAgICB9LFxuXG4gICAgbGlzdDogW10sXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IGF0dHJpYnV0ZSBjb252ZXJ0ZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd8ZnVuY3Rpb258cmVnZXh9IGFsaWFzIGZvcm1hdHRlciBuYW1lXG4gICAgICogQHBhcmFtICB7ZnVuY3Rpb258b2JqZWN0fSBjb252ZXJ0ZXIgICAgY29udmVydGVyIGNhbiBlaXRoZXIgYmUgYSBmdW5jdGlvbiwgd2hpY2ggd2lsbCBiZSBjYWxsZWQgd2l0aCB0aGUgdmFsdWUsIG9yIGFuIG9iamVjdCB3aXRoIHthbGlhczogJycsIHBhcnNlOiAkLm5vb3AsIGNvbnZlcnQ6ICQubm9vcH1cbiAgICAgKi9cbiAgICByZWdpc3RlcjogZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICAgICAgdmFyIG5vcm1hbGl6ZWQgPSBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlcik7XG4gICAgICAgIHRoaXMubGlzdCA9IG5vcm1hbGl6ZWQuY29uY2F0KHRoaXMubGlzdCk7XG4gICAgfSxcblxuICAgIHJlcGxhY2U6IGZ1bmN0aW9uKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2godGhpcy5saXN0LCBmdW5jdGlvbihjdXJyZW50Q29udmVydGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hDb252ZXJ0ZXIoYWxpYXMsIGN1cnJlbnRDb252ZXJ0ZXIpKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShhbGlhcywgY29udmVydGVyKVswXSk7XG4gICAgfSxcblxuICAgIGdldENvbnZlcnRlcjogZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbiAoY29udmVydGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hDb252ZXJ0ZXIoYWxpYXMsIGNvbnZlcnRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBjb252ZXJ0OiBmdW5jdGlvbiAodmFsdWUsIGxpc3QpIHtcbiAgICAgICAgaWYgKCFsaXN0IHx8ICFsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGxpc3QgPSBbXS5jb25jYXQobGlzdCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKXtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZXIgPSBtZS5nZXRDb252ZXJ0ZXIoY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0ZXIuY29udmVydChjdXJyZW50VmFsdWUsIGNvbnZlcnRlck5hbWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRWYWx1ZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ291bnRlci1wYXJ0IHRvICdjb252ZXJ0Jy4gVHJhbnNsYXRlcyBjb252ZXJ0ZWQgdmFsdWVzIGJhY2sgdG8gdGhlaXIgb3JpZ2luYWwgZm9ybVxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gdmFsdWUgVmFsdWUgdG8gcGFyc2VcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmcgfCBBcnJheX0gbGlzdCAgTGlzdCBvZiBwYXJzZXJzIHRvIHJ1biB0aGlzIHRocm91Z2guIE91dGVybW9zdCBpcyBpbnZva2VkIGZpcnN0XG4gICAgICogQHJldHVybiB7Kn1cbiAgICAgKi9cbiAgICBwYXJzZTogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpLnJldmVyc2UoKTtcbiAgICAgICAgbGlzdCA9IF8uaW52b2tlKGxpc3QsICd0cmltJyk7XG5cbiAgICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICBfLmVhY2gobGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlck5hbWUpe1xuICAgICAgICAgICAgdmFyIGNvbnZlcnRlciA9IG1lLmdldENvbnZlcnRlcihjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIGlmIChjb252ZXJ0ZXIucGFyc2UpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBjb252ZXJ0ZXIucGFyc2UoY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfVxufTtcblxuXG4vL0Jvb3RzdHJhcFxudmFyIGRlZmF1bHRjb252ZXJ0ZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vbnVtYmVyLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vc3RyaW5nLWNvbnZlcnRlcicpLFxuICAgIHJlcXVpcmUoJy4vYXJyYXktY29udmVydGVyJyksXG4gICAgcmVxdWlyZSgnLi9udW1iZXJmb3JtYXQtY29udmVydGVyJyksXG5dO1xuXG4kLmVhY2goZGVmYXVsdGNvbnZlcnRlcnMucmV2ZXJzZSgpLCBmdW5jdGlvbihpbmRleCwgY29udmVydGVyKSB7XG4gICAgY29udmVydGVyTWFuYWdlci5yZWdpc3Rlcihjb252ZXJ0ZXIpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gY29udmVydGVyTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICAgIHNlbGVjdG9yID0gJyonO1xuICAgIH1cbiAgICBoYW5kbGVyLnNlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgcmV0dXJuIGhhbmRsZXI7XG59O1xuXG52YXIgbWF0Y2ggPSBmdW5jdGlvbiAodG9NYXRjaCwgbm9kZSkge1xuICAgIGlmIChfLmlzU3RyaW5nKHRvTWF0Y2gpKSB7XG4gICAgICAgIHJldHVybiB0b01hdGNoID09PSBub2RlLnNlbGVjdG9yO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuICQodG9NYXRjaCkuaXMobm9kZS5zZWxlY3Rvcik7XG4gICAgfVxufTtcblxudmFyIG5vZGVNYW5hZ2VyID0ge1xuICAgIGxpc3Q6IFtdLFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IG5vZGUgaGFuZGxlclxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gc2VsZWN0b3IgalF1ZXJ5LWNvbXBhdGlibGUgc2VsZWN0b3IgdG8gdXNlIHRvIG1hdGNoIG5vZGVzXG4gICAgICogQHBhcmFtICB7ZnVuY3Rpb259IGhhbmRsZXIgIEhhbmRsZXJzIGFyZSBuZXctYWJsZSBmdW5jdGlvbnMuIFRoZXkgd2lsbCBiZSBjYWxsZWQgd2l0aCAkZWwgYXMgY29udGV4dC4/IFRPRE86IFRoaW5rIHRoaXMgdGhyb3VnaFxuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICAgICAgdGhpcy5saXN0LnVuc2hpZnQobm9ybWFsaXplKHNlbGVjdG9yLCBoYW5kbGVyKSk7XG4gICAgfSxcblxuICAgIGdldEhhbmRsZXI6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2goc2VsZWN0b3IsIG5vZGUpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVwbGFjZTogZnVuY3Rpb24oc2VsZWN0b3IsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2godGhpcy5saXN0LCBmdW5jdGlvbihjdXJyZW50SGFuZGxlciwgaSkge1xuICAgICAgICAgICAgaWYgKHNlbGVjdG9yID09PSBjdXJyZW50SGFuZGxlci5zZWxlY3Rvcikge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoc2VsZWN0b3IsIGhhbmRsZXIpKTtcbiAgICB9XG59O1xuXG4vL2Jvb3RzdHJhcHNcbnZhciBkZWZhdWx0SGFuZGxlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9pbnB1dC1jaGVja2JveC1ub2RlJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtbm9kZScpXG5dO1xuXy5lYWNoKGRlZmF1bHRIYW5kbGVycy5yZXZlcnNlKCksIGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICBub2RlTWFuYWdlci5yZWdpc3RlcihoYW5kbGVyLnNlbGVjdG9yLCBoYW5kbGVyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vZGVNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVmYXVsdEhhbmRsZXJzID0gW1xuICAgIHJlcXVpcmUoJy4vbm8tb3AtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2luaXQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZXZlbnRzL2RlZmF1bHQtZXZlbnQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vYmluZHMvY2hlY2tib3gtcmFkaW8tYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9pbnB1dC1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2NsYXNzLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL3Bvc2l0aXZlLWJvb2xlYW4tYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vbmVnYXRpdmUtYm9vbGVhbi1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9kZWZhdWx0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1hdHRyJylcbl07XG5cbnZhciBoYW5kbGVyc0xpc3QgPSBbXTtcblxudmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgIGlmICghbm9kZU1hdGNoZXIpIHtcbiAgICAgICAgbm9kZU1hdGNoZXIgPSAnKic7XG4gICAgfVxuICAgIGlmIChfLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICAgICAgaGFuZGxlciA9IHtcbiAgICAgICAgICAgIGhhbmRsZTogaGFuZGxlclxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gJC5leHRlbmQoaGFuZGxlciwge3Rlc3Q6IGF0dHJpYnV0ZU1hdGNoZXIsIHRhcmdldDogbm9kZU1hdGNoZXJ9KTtcbn07XG5cbiQuZWFjaChkZWZhdWx0SGFuZGxlcnMsIGZ1bmN0aW9uKGluZGV4LCBoYW5kbGVyKSB7XG4gICAgaGFuZGxlcnNMaXN0LnB1c2gobm9ybWFsaXplKGhhbmRsZXIudGVzdCwgaGFuZGxlci50YXJnZXQsIGhhbmRsZXIpKTtcbn0pO1xuXG5cbnZhciBtYXRjaEF0dHIgPSBmdW5jdGlvbiAobWF0Y2hFeHByLCBhdHRyLCAkZWwpIHtcbiAgICB2YXIgYXR0ck1hdGNoO1xuXG4gICAgaWYgKF8uaXNTdHJpbmcobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSAobWF0Y2hFeHByID09PSAnKicgfHwgKG1hdGNoRXhwci50b0xvd2VyQ2FzZSgpID09PSBhdHRyLnRvTG93ZXJDYXNlKCkpKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKG1hdGNoRXhwcikpIHtcbiAgICAgICAgLy9UT0RPOiByZW1vdmUgZWxlbWVudCBzZWxlY3RvcnMgZnJvbSBhdHRyaWJ1dGVzXG4gICAgICAgIGF0dHJNYXRjaCA9IG1hdGNoRXhwcihhdHRyLCAkZWwpO1xuICAgIH1cbiAgICBlbHNlIGlmIChfLmlzUmVnRXhwKG1hdGNoRXhwcikpIHtcbiAgICAgICAgYXR0ck1hdGNoID0gYXR0ci5tYXRjaChtYXRjaEV4cHIpO1xuICAgIH1cbiAgICByZXR1cm4gYXR0ck1hdGNoO1xufTtcblxudmFyIG1hdGNoTm9kZSA9IGZ1bmN0aW9uICh0YXJnZXQsIG5vZGVGaWx0ZXIpIHtcbiAgICByZXR1cm4gKF8uaXNTdHJpbmcobm9kZUZpbHRlcikpID8gKG5vZGVGaWx0ZXIgPT09IHRhcmdldCkgOiBub2RlRmlsdGVyLmlzKHRhcmdldCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBsaXN0OiBoYW5kbGVyc0xpc3QsXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IGF0dHJpYnV0ZSBoYW5kbGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfGZ1bmN0aW9ufHJlZ2V4fSBhdHRyaWJ1dGVNYXRjaGVyIERlc2NyaXB0aW9uIG9mIHdoaWNoIGF0dHJpYnV0ZXMgdG8gbWF0Y2hcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IG5vZGVNYXRjaGVyICAgICAgV2hpY2ggbm9kZXMgdG8gYWxsIGF0dHJpYnV0ZXMgdG8uIFVzZSBqcXVlcnkgU2VsZWN0b3Igc3ludGF4XG4gICAgICogQHBhcmFtICB7ZnVuY3Rpb258b2JqZWN0fSBoYW5kbGVyICAgIEhhbmRsZXIgY2FuIGVpdGhlciBiZSBhIGZ1bmN0aW9uIChUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2l0aCAkZWxlbWVudCBhcyBjb250ZXh0LCBhbmQgYXR0cmlidXRlIHZhbHVlICsgbmFtZSksIG9yIGFuIG9iamVjdCB3aXRoIHtpbml0OiBmbiwgIGhhbmRsZTogZm59LiBUaGUgaW5pdCBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aGVuIHBhZ2UgbG9hZHM7IHVzZSB0aGlzIHRvIGRlZmluZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAoYXR0cmlidXRlTWF0Y2hlciwgbm9kZU1hdGNoZXIsIGhhbmRsZXIpIHtcbiAgICAgICAgaGFuZGxlcnNMaXN0LnVuc2hpZnQobm9ybWFsaXplLmFwcGx5KG51bGwsIGFyZ3VtZW50cykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaW5kIGFuIGF0dHJpYnV0ZSBtYXRjaGVyIG1hdGNoaW5nIHNvbWUgY3JpdGVyaWFcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IGF0dHJGaWx0ZXIgYXR0cmlidXRlIHRvIG1hdGNoXG4gICAgICogQHBhcmFtICB7c3RyaW5nIHwgJGVsfSBub2RlRmlsdGVyIG5vZGUgdG8gbWF0Y2hcbiAgICAgKiBAcmV0dXJuIHthcnJheXxudWxsfVxuICAgICAqL1xuICAgIGZpbHRlcjogZnVuY3Rpb24oYXR0ckZpbHRlciwgbm9kZUZpbHRlcikge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSBfLnNlbGVjdChoYW5kbGVyc0xpc3QsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hBdHRyKGhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcik7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAobm9kZUZpbHRlcikge1xuICAgICAgICAgICAgZmlsdGVyZWQgPSBfLnNlbGVjdChmaWx0ZXJlZCwgZnVuY3Rpb24gKGhhbmRsZXIpe1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaE5vZGUoaGFuZGxlci50YXJnZXQsIG5vZGVGaWx0ZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbihhdHRyRmlsdGVyLCBub2RlRmlsdGVyLCBoYW5kbGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKGhhbmRsZXJzTGlzdCwgZnVuY3Rpb24oY3VycmVudEhhbmRsZXIsIGkpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEF0dHIoY3VycmVudEhhbmRsZXIudGVzdCwgYXR0ckZpbHRlcikgJiYgbWF0Y2hOb2RlKGN1cnJlbnRIYW5kbGVyLnRhcmdldCwgbm9kZUZpbHRlcikpIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaGFuZGxlcnNMaXN0LnNwbGljZShpbmRleCwgMSwgbm9ybWFsaXplKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpKTtcbiAgICB9LFxuXG4gICAgZ2V0SGFuZGxlcjogZnVuY3Rpb24ocHJvcGVydHksICRlbCkge1xuICAgICAgICB2YXIgZmlsdGVyZWQgPSB0aGlzLmZpbHRlcihwcm9wZXJ0eSwgJGVsKTtcbiAgICAgICAgLy9UaGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBtYXRjaGVzLCBidXQgdGhlIHRvcCBmaXJzdCBoYXMgdGhlIG1vc3QgcHJpb3JpdHlcbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkWzBdO1xuICAgIH1cbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG4gICAgdmFyIHZzID0gb3B0aW9ucy5ydW4udmFyaWFibGVzKCk7XG4gICAgdmFyIHZlbnQgID0gb3B0aW9ucy52ZW50O1xuXG4gICAgdmFyIGN1cnJlbnREYXRhID0ge307XG5cbiAgICAvL1RPRE86IGFjdHVhbGx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgc28gb25cbiAgICB2YXIgaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0SW5uZXJWYXJpYWJsZXMgPSBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgdmFyIGlubmVyID0gc3RyLm1hdGNoKC88KC4qPyk+L2cpO1xuICAgICAgICBpbm5lciA9IF8ubWFwKGlubmVyLCBmdW5jdGlvbih2YWwpe1xuICAgICAgICAgICAgcmV0dXJuIHZhbC5zdWJzdHJpbmcoMSwgdmFsLmxlbmd0aCAtIDEpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGlubmVyO1xuICAgIH07XG5cbiAgICAvL1JlcGxhY2VzIHN0dWJiZWQgb3V0IGtleW5hbWVzIGluIHZhcmlhYmxlc3RvaW50ZXJwb2xhdGUgd2l0aCB0aGVpciBjb3JyZXNwb25kaW5nIGNhbHVlc1xuICAgIHZhciBpbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uKHZhcmlhYmxlc1RvSW50ZXJwb2xhdGUsIHZhbHVlcykge1xuICAgICAgICB2YXIgaW50ZXJwb2xhdGlvbk1hcCA9IHt9O1xuICAgICAgICB2YXIgaW50ZXJwb2xhdGVkID0ge307XG5cbiAgICAgICAgXy5lYWNoKHZhcmlhYmxlc1RvSW50ZXJwb2xhdGUsIGZ1bmN0aW9uICh2YWwsIG91dGVyVmFyaWFibGUpIHtcbiAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKG91dGVyVmFyaWFibGUpO1xuICAgICAgICAgICAgdmFyIG9yaWdpbmFsT3V0ZXIgPSBvdXRlclZhcmlhYmxlO1xuICAgICAgICAgICAgJC5lYWNoKGlubmVyLCBmdW5jdGlvbihpbmRleCwgaW5uZXJWYXJpYWJsZSkge1xuICAgICAgICAgICAgICAgIHZhciB0aGlzdmFsID0gdmFsdWVzW2lubmVyVmFyaWFibGVdO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzdmFsICE9PSBudWxsICYmIHRoaXN2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5pc0FycmF5KHRoaXN2YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL0ZvciBhcnJheWVkIHRoaW5ncyBnZXQgdGhlIGxhc3Qgb25lIGZvciBpbnRlcnBvbGF0aW9uIHB1cnBvc2VzXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzdmFsID0gdGhpc3ZhbFt0aGlzdmFsLmxlbmd0aCAtMV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0ZXJWYXJpYWJsZSA9IG91dGVyVmFyaWFibGUucmVwbGFjZSgnPCcgKyBpbm5lclZhcmlhYmxlICsgJz4nLCB0aGlzdmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGludGVycG9sYXRpb25NYXBbb3V0ZXJWYXJpYWJsZV0gPSBvcmlnaW5hbE91dGVyO1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkW291dGVyVmFyaWFibGVdID0gdmFsO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW50ZXJwb2xhdGVkOiBpbnRlcnBvbGF0ZWQsXG4gICAgICAgICAgICBpbnRlcnBvbGF0aW9uTWFwOiBpbnRlcnBvbGF0aW9uTWFwXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG4gICAgICAgIC8vZm9yIHRlc3RpbmcsIHRvIGJlIHJlbW92ZWQgbGF0ZXJcbiAgICAgICAgcHJpdmF0ZToge1xuICAgICAgICAgICAgZ2V0SW5uZXJWYXJpYWJsZXM6IGdldElubmVyVmFyaWFibGVzLFxuICAgICAgICAgICAgaW50ZXJwb2xhdGU6IGludGVycG9sYXRlXG4gICAgICAgIH0sXG5cbiAgICAgICAgLy9JbnRlcnBvbGF0ZWQgdmFyaWFibGVzIHdoaWNoIG5lZWQgdG8gYmUgcmVzb2x2ZWQgYmVmb3JlIHRoZSBvdXRlciBvbmVzIGNhbiBiZVxuICAgICAgICBpbm5lclZhcmlhYmxlc0xpc3Q6IFtdLFxuICAgICAgICB2YXJpYWJsZUxpc3RlbmVyTWFwOiB7fSxcblxuICAgICAgICAvL0NoZWNrIGZvciB1cGRhdGVzXG4gICAgICAgIHJlZnJlc2g6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgICAgICAgdmFyIGdldFZhcmlhYmxlcyA9IGZ1bmN0aW9uKHZhcnMsIGlwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZzLnF1ZXJ5KHZhcnMpLnRoZW4oZnVuY3Rpb24odmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdHb3QgdmFyaWFibGVzJywgdmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKHZhcmlhYmxlcywgZnVuY3Rpb24odmFsdWUsIHZuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2xkVmFsdWUgPSBjdXJyZW50RGF0YVt2bmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRXF1YWwodmFsdWUsIG9sZFZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnREYXRhW3ZuYW1lXSA9IHZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZuID0gKGlwICYmIGlwW3ZuYW1lXSkgPyBpcFt2bmFtZV0gOiB2bmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZS5ub3RpZnkodm4sIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKG1lLmlubmVyVmFyaWFibGVzTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdnMucXVlcnkobWUuaW5uZXJWYXJpYWJsZXNMaXN0KS50aGVuKGZ1bmN0aW9uIChpbm5lclZhcmlhYmxlcykge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdpbm5lcicsIGlubmVyVmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgJC5leHRlbmQoY3VycmVudERhdGEsIGlubmVyVmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlwID0gIGludGVycG9sYXRlKG1lLnZhcmlhYmxlTGlzdGVuZXJNYXAsIGlubmVyVmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG91dGVyID0gXy5rZXlzKGlwLmludGVycG9sYXRlZCk7XG4gICAgICAgICAgICAgICAgICAgIGdldFZhcmlhYmxlcyhvdXRlciwgaXAuaW50ZXJwb2xhdGlvbk1hcCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VmFyaWFibGVzKF8ua2V5cyhtZS52YXJpYWJsZUxpc3RlbmVyTWFwKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSxcblxuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uICh2YXJpYWJsZSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXBbdmFyaWFibGVdO1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW3ZhcmlhYmxlXSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpe1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLnRhcmdldC50cmlnZ2VyKGNvbmZpZy5ldmVudHMucmVhY3QsIHBhcmFtcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBwdWJsaXNoOiBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwdWJsaXNoJywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIGlmIGludGVycG9sYXRlZFxuICAgICAgICAgICAgdmFyIGF0dHJzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YXJpYWJsZSkpIHtcbiAgICAgICAgICAgICAgICBhdHRycyA9IHZhcmlhYmxlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAoYXR0cnMgPSB7fSlbdmFyaWFibGVdID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW50ZXJwb2xhdGVkID0gaW50ZXJwb2xhdGUoYXR0cnMsIGN1cnJlbnREYXRhKS5pbnRlcnBvbGF0ZWQ7XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICB2cy5zYXZlLmNhbGwodnMsIGludGVycG9sYXRlZClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbihwcm9wZXJ0aWVzLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnc3Vic2NyaWJpbmcnLCBwcm9wZXJ0aWVzLCBzdWJzY3JpYmVyKTtcblxuICAgICAgICAgICAgcHJvcGVydGllcyA9IFtdLmNvbmNhdChwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIC8vdXNlIGpxdWVyeSB0byBtYWtlIGV2ZW50IHNpbmtcbiAgICAgICAgICAgIC8vVE9ETzogc3Vic2NyaWJlciBjYW4gYmUgYSBmdW5jdGlvblxuICAgICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLm9uKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLnZhcmlhYmxlJyk7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgJC5lYWNoKHByb3BlcnRpZXMsIGZ1bmN0aW9uKGluZGV4LCBwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICBpZiAoaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLmlubmVyVmFyaWFibGVzTGlzdCA9IG1lLmlubmVyVmFyaWFibGVzTGlzdC5jb25jYXQoaW5uZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtZS5pbm5lclZhcmlhYmxlc0xpc3QgPSBfLnVuaXEobWUuaW5uZXJWYXJpYWJsZXNMaXN0KTtcblxuICAgICAgICAgICAgICAgIGlmICghbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0pIHtcbiAgICAgICAgICAgICAgICAgICAgbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0gPSBtZS52YXJpYWJsZUxpc3RlbmVyTWFwW3Byb3BlcnR5XS5jb25jYXQoZGF0YSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9LFxuICAgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24odmFyaWFibGUsIHRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXAgPSBfLnJlamVjdCh0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXAsIGZ1bmN0aW9uKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmVBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy52YXJpYWJsZUxpc3RlbmVyTWFwID0ge307XG4gICAgICAgICAgICB0aGlzLmlubmVyVmFyaWFibGVzTGlzdCA9IFtdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG4gICAgdmFyIG1lID0gdGhpcztcbiAgICAkKHZlbnQpLm9uKCdkaXJ0eScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWUucmVmcmVzaC5hcHBseShtZSwgYXJndW1lbnRzKTtcbiAgICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhbGlhczogJ2knLFxuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZSwgMTApO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiB2YWwgKyAnJztcbiAgICB9LFxuXG4gICAgdXBwZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgfSxcbiAgICBsb3dlckNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuICh2YWwgKyAnJykudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuICAgIHRpdGxlQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSB2YWwgKyAnJztcbiAgICAgICAgcmV0dXJuIHZhbC5yZXBsYWNlKC9cXHdcXFMqL2csIGZ1bmN0aW9uKHR4dCl7cmV0dXJuIHR4dC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHR4dC5zdWJzdHIoMSkudG9Mb3dlckNhc2UoKTt9KTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbGlzdDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gW10uY29uY2F0KHZhbCk7XG4gICAgfSxcbiAgICBsYXN0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICByZXR1cm4gdmFsW3ZhbC5sZW5ndGggLSAxXTtcbiAgICB9LFxuICAgIGZpcnN0OiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCA9IFtdLmNvbmNhdCh2YWwpO1xuICAgICAgICByZXR1cm4gdmFsWzBdO1xuICAgIH0sXG4gICAgcHJldmlvdXM6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsID0gW10uY29uY2F0KHZhbCk7XG4gICAgICAgIHJldHVybiAodmFsLmxlbmd0aCA8PSAxKSA/IHZhbFswXSA6IHZhbFt2YWwubGVuZ3RoIC0gMl07XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0Jztcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGFsaWFzOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAvL1RPRE86IEZhbmN5IHJlZ2V4IHRvIG1hdGNoIG51bWJlciBmb3JtYXRzIGhlcmVcbiAgICAgICAgcmV0dXJuIChuYW1lLmluZGV4T2YoJyMnKSAhPT0gLTEgfHwgbmFtZS5pbmRleE9mKCcwJykgIT09IC0xICk7XG4gICAgfSxcblxuICAgIHBhcnNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhbCs9ICcnO1xuICAgICAgICB2YXIgaXNOZWdhdGl2ZSA9IHZhbC5jaGFyQXQoMCkgPT09ICctJztcblxuICAgICAgICB2YWwgID0gdmFsLnJlcGxhY2UoLywvZywgJycpO1xuICAgICAgICB2YXIgZmxvYXRNYXRjaGVyID0gLyhbLStdP1swLTldKlxcLj9bMC05XSspKEs/TT9CPyU/KS9pO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IGZsb2F0TWF0Y2hlci5leGVjKHZhbCk7XG4gICAgICAgIHZhciBudW1iZXIsIHN1ZmZpeCA9ICcnO1xuICAgICAgICBpZihyZXN1bHRzICYmIHJlc3VsdHNbMV0pe1xuICAgICAgICAgICAgbnVtYmVyID0gcmVzdWx0c1sxXTtcbiAgICAgICAgfVxuICAgICAgICBpZihyZXN1bHRzICYmIHJlc3VsdHNbMl0pe1xuICAgICAgICAgICAgc3VmZml4ID0gcmVzdWx0c1syXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoKHN1ZmZpeCl7XG4gICAgICAgICAgICBjYXNlICclJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgLyAxMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdrJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbSc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2InOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDAwMDAwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbnVtYmVyID0gcGFyc2VGbG9hdChudW1iZXIpO1xuICAgICAgICBpZihpc05lZ2F0aXZlICYmIG51bWJlciA+IDApIHtcbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIC0xO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgfSxcblxuICAgIGNvbnZlcnQ6IChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB2YXIgc2NhbGVzID0gWycnLCAnSycsICdNJywgJ0InLCAnVCddO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldERpZ2l0cyh2YWx1ZSwgZGlnaXRzKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID09PSAwID8gMCA6IHJvdW5kVG8odmFsdWUsIE1hdGgubWF4KDAsIGRpZ2l0cyAtIE1hdGguY2VpbChNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMTApKSk7XG5cbiAgICAgICAgICAgIHZhciBUWFQgPSAnJztcbiAgICAgICAgICAgIHZhciBudW1iZXJUWFQgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIGRlY2ltYWxTZXQgPSBmYWxzZTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaVRYVCA9IDA7IGlUWFQgPCBudW1iZXJUWFQubGVuZ3RoOyBpVFhUKyspIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gbnVtYmVyVFhULmNoYXJBdChpVFhUKTtcbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyVFhULmNoYXJBdChpVFhUKSA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlY2ltYWxTZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRpZ2l0cy0tO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChkaWdpdHMgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVFhUO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFkZWNpbWFsU2V0KSB7XG4gICAgICAgICAgICAgICAgVFhUICs9ICcuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChkaWdpdHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgVFhUICs9ICcwJztcbiAgICAgICAgICAgICAgICBkaWdpdHMtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBUWFQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGREZWNpbWFscyh2YWx1ZSwgZGVjaW1hbHMsIG1pbkRlY2ltYWxzLCBoYXNDb21tYXMpIHtcbiAgICAgICAgICAgIGhhc0NvbW1hcyA9IGhhc0NvbW1hcyB8fCB0cnVlO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoID4gMSk7XG4gICAgICAgICAgICB2YXIgaURlYyA9IDA7XG5cbiAgICAgICAgICAgIGlmIChoYXNDb21tYXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpQ2hhciA9IG51bWJlclRYVC5sZW5ndGggLSAxOyBpQ2hhciA+IDA7IGlDaGFyLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0RlY2ltYWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNEZWNpbWFscyA9IChudW1iZXJUWFQuY2hhckF0KGlDaGFyKSAhPT0gJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlEZWMgPSAoaURlYyArIDEpICUgMztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpRGVjID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUID0gbnVtYmVyVFhULnN1YnN0cigwLCBpQ2hhcikgKyAnLCcgKyBudW1iZXJUWFQuc3Vic3RyKGlDaGFyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRlY2ltYWxzID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciB0b0FERDtcbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BREQgPSBtaW5EZWNpbWFscztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcuJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHMgLSBudW1iZXJUWFQuc3BsaXQoJy4nKVsxXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgICAgICB0b0FERC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudW1iZXJUWFQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByb3VuZFRvKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlICogTWF0aC5wb3coMTAsIGRpZ2l0cykpIC8gTWF0aC5wb3coMTAsIGRpZ2l0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRTdWZmaXgoZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQucmVwbGFjZSgnLicsICcnKTtcbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgcmV0dXJuIChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzQ3VycmVuY3koc3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgcyA9ICQudHJpbShzdHJpbmcpO1xuXG4gICAgICAgICAgICBpZiAocyA9PT0gJyQnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqwnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqUnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqMnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawrEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ0vDhD8nIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ2tyJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKiJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKqJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDhuKAmScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqycpIHtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmb3JtYXQobnVtYmVyLCBmb3JtYXRUWFQpIHtcbiAgICAgICAgICAgIGlmIChfLmlzQXJyYXkobnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlcltudW1iZXIubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uaXNTdHJpbmcobnVtYmVyKSAmJiAhXy5pc051bWJlcihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bWJlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFmb3JtYXRUWFQgfHwgZm9ybWF0VFhULnRvTG93ZXJDYXNlKCkgPT09ICdkZWZhdWx0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiBudW1iZXIudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzTmFOKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJz8nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL3ZhciBmb3JtYXRUWFQ7XG4gICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQucmVwbGFjZSgnJmV1cm87JywgJ8Oi4oCawqwnKTtcblxuICAgICAgICAgICAgLy8gRGl2aWRlICsvLSBOdW1iZXIgRm9ybWF0XG4gICAgICAgICAgICB2YXIgZm9ybWF0cyA9IGZvcm1hdFRYVC5zcGxpdCgnOycpO1xuICAgICAgICAgICAgaWYgKGZvcm1hdHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtYXQoTWF0aC5hYnMobnVtYmVyKSwgZm9ybWF0c1soKG51bWJlciA+PSAwKSA/IDAgOiAxKV0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTYXZlIFNpZ25cbiAgICAgICAgICAgIHZhciBzaWduID0gKG51bWJlciA+PSAwKSA/ICcnIDogJy0nO1xuICAgICAgICAgICAgbnVtYmVyID0gTWF0aC5hYnMobnVtYmVyKTtcblxuXG4gICAgICAgICAgICB2YXIgbGVmdE9mRGVjaW1hbCA9IGZvcm1hdFRYVDtcbiAgICAgICAgICAgIHZhciBkID0gbGVmdE9mRGVjaW1hbC5pbmRleE9mKCcuJyk7XG4gICAgICAgICAgICBpZiAoZCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgbGVmdE9mRGVjaW1hbCA9IGxlZnRPZkRlY2ltYWwuc3Vic3RyaW5nKDAsIGQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbm9ybWFsaXplZCA9IGxlZnRPZkRlY2ltYWwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IG5vcm1hbGl6ZWQubGFzdEluZGV4T2YoJ3MnKTtcbiAgICAgICAgICAgIHZhciBpc1Nob3J0Rm9ybWF0ID0gaW5kZXggPiAtMTtcblxuICAgICAgICAgICAgaWYgKGlzU2hvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dENoYXIgPSBsZWZ0T2ZEZWNpbWFsLmNoYXJBdChpbmRleCArIDEpO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0Q2hhciA9PT0gJyAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzU2hvcnRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBsZWFkaW5nVGV4dCA9IGlzU2hvcnRGb3JtYXQgPyBmb3JtYXRUWFQuc3Vic3RyaW5nKDAsIGluZGV4KSA6ICcnO1xuICAgICAgICAgICAgdmFyIHJpZ2h0T2ZQcmVmaXggPSBpc1Nob3J0Rm9ybWF0ID8gZm9ybWF0VFhULnN1YnN0cihpbmRleCArIDEpIDogZm9ybWF0VFhULnN1YnN0cihpbmRleCk7XG5cbiAgICAgICAgICAgIC8vZmlyc3QgY2hlY2sgdG8gbWFrZSBzdXJlICdzJyBpcyBhY3R1YWxseSBzaG9ydCBmb3JtYXQgYW5kIG5vdCBwYXJ0IG9mIHNvbWUgbGVhZGluZyB0ZXh0XG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBzaG9ydEZvcm1hdFRlc3QgPSAvWzAtOSMqXS87XG4gICAgICAgICAgICAgICAgdmFyIHNob3J0Rm9ybWF0VGVzdFJlc3VsdCA9IHJpZ2h0T2ZQcmVmaXgubWF0Y2goc2hvcnRGb3JtYXRUZXN0KTtcbiAgICAgICAgICAgICAgICBpZiAoIXNob3J0Rm9ybWF0VGVzdFJlc3VsdCB8fCBzaG9ydEZvcm1hdFRlc3RSZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vbm8gc2hvcnQgZm9ybWF0IGNoYXJhY3RlcnMgc28gdGhpcyBtdXN0IGJlIGxlYWRpbmcgdGV4dCBpZS4gJ3dlZWtzICdcbiAgICAgICAgICAgICAgICAgICAgaXNTaG9ydEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBsZWFkaW5nVGV4dCA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9pZiAoZm9ybWF0VFhULmNoYXJBdCgwKSA9PSAncycpXG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWxTY2FsZSA9IG51bWJlciA9PT0gMCA/IDAgOiBNYXRoLmZsb29yKE1hdGgubG9nKE1hdGguYWJzKG51bWJlcikpIC8gKDMgKiBNYXRoLkxOMTApKTtcbiAgICAgICAgICAgICAgICB2YWxTY2FsZSA9ICgobnVtYmVyIC8gTWF0aC5wb3coMTAsIDMgKiB2YWxTY2FsZSkpIDwgMTAwMCkgPyB2YWxTY2FsZSA6ICh2YWxTY2FsZSArIDEpO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gTWF0aC5tYXgodmFsU2NhbGUsIDApO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gTWF0aC5taW4odmFsU2NhbGUsIDQpO1xuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAvIE1hdGgucG93KDEwLCAzICogdmFsU2NhbGUpO1xuICAgICAgICAgICAgICAgIC8vaWYgKCFpc05hTihOdW1iZXIoZm9ybWF0VFhULnN1YnN0cigxKSApICkgKVxuXG4gICAgICAgICAgICAgICAgaWYgKCFpc05hTihOdW1iZXIocmlnaHRPZlByZWZpeCkpICYmIHJpZ2h0T2ZQcmVmaXguaW5kZXhPZignLicpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGltaXREaWdpdHMgPSBOdW1iZXIocmlnaHRPZlByZWZpeCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChudW1iZXIgPCBNYXRoLnBvdygxMCwgbGltaXREaWdpdHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgZ2V0RGlnaXRzKG51bWJlciwgTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyBzaWduICsgZ2V0RGlnaXRzKG51bWJlciwgTnVtYmVyKHJpZ2h0T2ZQcmVmaXgpKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNDdXJyZW5jeShsZWFkaW5nVGV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgTWF0aC5yb3VuZChudW1iZXIpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHNpZ24gKyBNYXRoLnJvdW5kKG51bWJlcikgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9mb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDEpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBTVUZGSVggPSBnZXRTdWZmaXgoZm9ybWF0VFhUKTtcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0VFhUID0gZm9ybWF0VFhULnN1YnN0cigwLCBmb3JtYXRUWFQubGVuZ3RoIC0gU1VGRklYLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbFdpdGhvdXRMZWFkaW5nID0gZm9ybWF0KCgoc2lnbiA9PT0gJycpID8gMSA6IC0xKSAqIG51bWJlciwgZm9ybWF0VFhUKSArIHNjYWxlc1t2YWxTY2FsZV0gKyBTVUZGSVg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSAmJiBzaWduICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsV2l0aG91dExlYWRpbmcgPSB2YWxXaXRob3V0TGVhZGluZy5zdWJzdHIoc2lnbi5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpZ24gKyBsZWFkaW5nVGV4dCArIHZhbFdpdGhvdXRMZWFkaW5nO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc3ViRm9ybWF0cyA9IGZvcm1hdFRYVC5zcGxpdCgnLicpO1xuICAgICAgICAgICAgdmFyIGRlY2ltYWxzO1xuICAgICAgICAgICAgdmFyIG1pbkRlY2ltYWxzO1xuICAgICAgICAgICAgaWYgKHN1YkZvcm1hdHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgIGRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBtaW5EZWNpbWFscyA9IHN1YkZvcm1hdHNbMV0ubGVuZ3RoIC0gc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJzArJywgJ2cnKSwgJycpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBzdWJGb3JtYXRzWzBdICsgc3ViRm9ybWF0c1sxXS5yZXBsYWNlKG5ldyBSZWdFeHAoJ1swfCNdKycsICdnJyksICcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgZml4ZXNUWFQgPSBmb3JtYXRUWFQuc3BsaXQobmV3IFJlZ0V4cCgnWzB8LHwjXSsnLCAnZycpKTtcbiAgICAgICAgICAgIHZhciBwcmVmZml4ID0gZml4ZXNUWFRbMF0udG9TdHJpbmcoKTtcbiAgICAgICAgICAgIHZhciBzdWZmaXggPSAoZml4ZXNUWFQubGVuZ3RoID4gMSkgPyBmaXhlc1RYVFsxXS50b1N0cmluZygpIDogJyc7XG5cbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqICgoZm9ybWF0VFhULnNwbGl0KCclJykubGVuZ3RoID4gMSkgPyAxMDAgOiAxKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgaWYoZm9ybWF0VFhULmluZGV4T2YoJyUnKSAhPT0gLTEpIG51bWJlciA9IG51bWJlciAqIDEwMDtcbiAgICAgICAgICAgIG51bWJlciA9IHJvdW5kVG8obnVtYmVyLCBkZWNpbWFscyk7XG5cbiAgICAgICAgICAgIHNpZ24gPSAobnVtYmVyID09PSAwKSA/ICcnIDogc2lnbjtcblxuICAgICAgICAgICAgdmFyIGhhc0NvbW1hcyA9IChmb3JtYXRUWFQuc3Vic3RyKGZvcm1hdFRYVC5sZW5ndGggLSA0IC0gc3VmZml4Lmxlbmd0aCwgMSkgPT09ICcsJyk7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVkID0gc2lnbiArIHByZWZmaXggKyBhZGREZWNpbWFscyhudW1iZXIsIGRlY2ltYWxzLCBtaW5EZWNpbWFscywgaGFzQ29tbWFzKSArIHN1ZmZpeDtcblxuICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKG9yaWdpbmFsTnVtYmVyLCBvcmlnaW5hbEZvcm1hdCwgZm9ybWF0dGVkKVxuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmb3JtYXQ7XG4gICAgfSgpKVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gQXR0cmlidXRlcyB3aGljaCBhcmUganVzdCBwYXJhbWV0ZXJzIHRvIG90aGVycyBhbmQgY2FuIGp1c3QgYmUgaWdub3JlZFxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86bW9kZWx8Y29udmVydCkkL2ksXG5cbiAgICBoYW5kbGU6ICQubm9vcCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IGZ1bmN0aW9uIChhdHRyLCAkbm9kZSkge1xuICAgICAgICByZXR1cm4gKGF0dHIuaW5kZXhPZignb24taW5pdCcpID09PSAwKTtcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24oYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24taW5pdCcsICcnKTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgJChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbGlzdE9mT3BlcmF0aW9ucyA9IF8uaW52b2tlKHZhbHVlLnNwbGl0KCd8JyksICd0cmltJyk7XG4gICAgICAgICAgICBsaXN0T2ZPcGVyYXRpb25zID0gbGlzdE9mT3BlcmF0aW9ucy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gKCQudHJpbShwYXJhbXMpICE9PSAnJykgPyBwYXJhbXMuc3BsaXQoJywnKSA6IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7bmFtZTogZm5OYW1lLCBwYXJhbXM6IGFyZ3N9O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIG1lLnRyaWdnZXIoJ2YudWkub3BlcmF0ZScsIHtvcGVyYXRpb25zOiBsaXN0T2ZPcGVyYXRpb25zLCBzZXJpYWw6IHRydWV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiBmdW5jdGlvbiAoYXR0ciwgJG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoJ29uLScpID09PSAwKTtcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24oYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24tJywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB0aGlzLm9uKGF0dHIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGxpc3RPZk9wZXJhdGlvbnMgPSBfLmludm9rZSh2YWx1ZS5zcGxpdCgnfCcpLCAndHJpbScpO1xuICAgICAgICAgICAgbGlzdE9mT3BlcmF0aW9ucyA9IGxpc3RPZk9wZXJhdGlvbnMubWFwKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBmbk5hbWUgPSB2YWx1ZS5zcGxpdCgnKCcpWzBdO1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB2YWx1ZS5zdWJzdHJpbmcodmFsdWUuaW5kZXhPZignKCcpICsgMSwgdmFsdWUuaW5kZXhPZignKScpKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9ICgkLnRyaW0ocGFyYW1zKSAhPT0gJycpID8gcGFyYW1zLnNwbGl0KCcsJykgOiBbXTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge25hbWU6IGZuTmFtZSwgcGFyYW1zOiBhcmdzfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBtZS50cmlnZ2VyKCdmLnVpLm9wZXJhdGUnLCB7b3BlcmF0aW9uczogbGlzdE9mT3BlcmF0aW9ucywgc2VyaWFsOiB0cnVlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0YXJnZXQ6ICdpbnB1dCwgc2VsZWN0JyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudmFsKHZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJzpjaGVja2JveCw6cmFkaW8nLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNldHRhYmxlVmFsdWUgPSB0aGlzLmF0dHIoJ3ZhbHVlJyk7IC8vaW5pdGlhbCB2YWx1ZVxuICAgICAgICAvKmpzbGludCBlcWVxOiB0cnVlKi9cbiAgICAgICAgdmFyIGlzQ2hlY2tlZCA9IChzZXR0YWJsZVZhbHVlICE9PSB1bmRlZmluZWQpID8gKHNldHRhYmxlVmFsdWUgPT0gdmFsdWUpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKCdjaGVja2VkJywgaXNDaGVja2VkKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdjbGFzcycsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYWRkZWRDbGFzc2VzID0gdGhpcy5kYXRhKCdhZGRlZC1jbGFzc2VzJyk7XG4gICAgICAgIGlmICghYWRkZWRDbGFzc2VzKSB7XG4gICAgICAgICAgICBhZGRlZENsYXNzZXMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYWRkZWRDbGFzc2VzW3Byb3BdKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNsYXNzKGFkZGVkQ2xhc3Nlc1twcm9wXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXy5pc051bWJlcih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gJ3ZhbHVlLScgKyB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBhZGRlZENsYXNzZXNbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgLy9GaXhtZTogcHJvcCBpcyBhbHdheXMgXCJjbGFzc1wiXG4gICAgICAgIHRoaXMuYWRkQ2xhc3ModmFsdWUpO1xuICAgICAgICB0aGlzLmRhdGEoJ2FkZGVkLWNsYXNzZXMnLCBhZGRlZENsYXNzZXMpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzpjaGVja2VkfHNlbGVjdGVkfGFzeW5jfGF1dG9mb2N1c3xhdXRvcGxheXxjb250cm9sc3xkZWZlcnxpc21hcHxsb29wfG11bHRpcGxlfG9wZW58cmVxdWlyZWR8c2NvcGVkKSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgLypqc2xpbnQgZXFlcTogdHJ1ZSovXG4gICAgICAgIHZhciB2YWwgPSAodGhpcy5hdHRyKCd2YWx1ZScpKSA/ICh2YWx1ZSA9PSB0aGlzLnByb3AoJ3ZhbHVlJykpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbCk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86ZGlzYWJsZWR8aGlkZGVufHJlYWRvbmx5KSQvaSxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcbiAgICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWVbdmFsdWUubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wcm9wKHByb3AsICF2YWx1ZSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW3ZhbHVlLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaHRtbCh2YWx1ZSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0ZXN0OiAnKicsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcbiAgICAgICAgdGhpcy5wcm9wKHByb3AsIHZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LWlucHV0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoIHtcblxuICAgIHByb3BlcnR5SGFuZGxlcnMgOiBbXG5cbiAgICBdLFxuXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgJGVsID0gdGhpcy4kZWw7XG4gICAgICAgIC8vVE9ETzogZmlsZSBhIGlzc3VlIGZvciB0aGUgdmVuc2ltIG1hbmFnZXIgdG8gY29udmVydCB0cnVlcyB0byAxcyBhbmQgc2V0IHRoaXMgdG8gdHJ1ZSBhbmQgZmFsc2VcblxuICAgICAgICB2YXIgb2ZmVmFsID0gICgkZWwuZGF0YSgnZi1vZmYnKSAhPT0gdW5kZWZpbmVkICkgPyAkZWwuZGF0YSgnZi1vZmYnKSA6IDA7XG4gICAgICAgIC8vYXR0ciA9IGluaXRpYWwgdmFsdWUsIHByb3AgPSBjdXJyZW50IHZhbHVlXG4gICAgICAgIHZhciBvblZhbCA9ICgkZWwuYXR0cigndmFsdWUnKSAhPT0gdW5kZWZpbmVkICkgPyAkZWwucHJvcCgndmFsdWUnKTogMTtcblxuICAgICAgICB2YXIgdmFsID0gKCRlbC5pcygnOmNoZWNrZWQnKSkgPyBvblZhbCA6IG9mZlZhbDtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9LFxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQmFzZVZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59LCB7c2VsZWN0b3I6ICc6Y2hlY2tib3gsOnJhZGlvJ30pO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2NvbmZpZycpO1xudmFyIEJhc2VWaWV3ID0gcmVxdWlyZSgnLi9kZWZhdWx0LW5vZGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoIHtcbiAgICBwcm9wZXJ0eUhhbmRsZXJzIDogW10sXG5cbiAgICB1aUNoYW5nZUV2ZW50OiAnY2hhbmdlJyxcbiAgICBnZXRVSVZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLiRlbC52YWwoKTtcbiAgICB9LFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB2YXIgcHJvcE5hbWUgPSB0aGlzLiRlbC5kYXRhKGNvbmZpZy5iaW5kZXJBdHRyKTtcblxuICAgICAgICBpZiAocHJvcE5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKHRoaXMudWlDaGFuZ2VFdmVudCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBtZS5nZXRVSVZhbHVlKCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgcGFyYW1zW3Byb3BOYW1lXSA9IHZhbDtcblxuICAgICAgICAgICAgICAgIG1lLiRlbC50cmlnZ2VyKGNvbmZpZy5ldmVudHMudHJpZ2dlciwgcGFyYW1zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgQmFzZVZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59LCB7c2VsZWN0b3I6ICdpbnB1dCwgc2VsZWN0J30pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQmFzZVZpZXcgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlVmlldy5leHRlbmQoIHtcbiAgICBwcm9wZXJ0eUhhbmRsZXJzIDogW1xuXG4gICAgXSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICB9XG59LCB7c2VsZWN0b3I6ICcqJ30pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24ocHJvdG9Qcm9wcywgc3RhdGljUHJvcHMpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgY2hpbGQ7XG5cbiAgICAvLyBUaGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHRoZSBuZXcgc3ViY2xhc3MgaXMgZWl0aGVyIGRlZmluZWQgYnkgeW91XG4gICAgLy8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG4gICAgLy8gYnkgdXMgdG8gc2ltcGx5IGNhbGwgdGhlIHBhcmVudCdzIGNvbnN0cnVjdG9yLlxuICAgIGlmIChwcm90b1Byb3BzICYmIF8uaGFzKHByb3RvUHJvcHMsICdjb25zdHJ1Y3RvcicpKSB7XG4gICAgICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZCA9IGZ1bmN0aW9uKCl7IHJldHVybiBwYXJlbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfTtcbiAgICB9XG5cbiAgICAvLyBBZGQgc3RhdGljIHByb3BlcnRpZXMgdG8gdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLCBpZiBzdXBwbGllZC5cbiAgICBfLmV4dGVuZChjaGlsZCwgcGFyZW50LCBzdGF0aWNQcm9wcyk7XG5cbiAgICAvLyBTZXQgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBpbmhlcml0IGZyb20gYHBhcmVudGAsIHdpdGhvdXQgY2FsbGluZ1xuICAgIC8vIGBwYXJlbnRgJ3MgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gICAgdmFyIFN1cnJvZ2F0ZSA9IGZ1bmN0aW9uKCl7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfTtcbiAgICBTdXJyb2dhdGUucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICBjaGlsZC5wcm90b3R5cGUgPSBuZXcgU3Vycm9nYXRlKCk7XG5cbiAgICAvLyBBZGQgcHJvdG90eXBlIHByb3BlcnRpZXMgKGluc3RhbmNlIHByb3BlcnRpZXMpIHRvIHRoZSBzdWJjbGFzcyxcbiAgICAvLyBpZiBzdXBwbGllZC5cbiAgICBpZiAocHJvdG9Qcm9wcykge1xuICAgICAgICBfLmV4dGVuZChjaGlsZC5wcm90b3R5cGUsIHByb3RvUHJvcHMpO1xuICAgIH1cblxuICAgIC8vIFNldCBhIGNvbnZlbmllbmNlIHByb3BlcnR5IGluIGNhc2UgdGhlIHBhcmVudCdzIHByb3RvdHlwZSBpcyBuZWVkZWRcbiAgICAvLyBsYXRlci5cbiAgICBjaGlsZC5fX3N1cGVyX18gPSBwYXJlbnQucHJvdG90eXBlO1xuXG4gICAgcmV0dXJuIGNoaWxkO1xufTtcblxudmFyIFZpZXcgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuZWwpO1xuICAgIHRoaXMuZWwgPSBvcHRpb25zLmVsO1xuICAgIHRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG59O1xuXG5fLmV4dGVuZChWaWV3LnByb3RvdHlwZSwge1xuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCl7fSxcbn0pO1xuXG5WaWV3LmV4dGVuZCA9IGV4dGVuZDtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuIl19
;