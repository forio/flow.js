;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
window.Flow = require('./flow.js');

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
        console.log(obj);
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
                    console.log(element, Handler.selector);
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

                                var withConv = _.invoke(attrVal.split('|'), 'trim');
                                if (withConv.length > 1) {
                                    attrVal = withConv.shift();
                                    $el.data('f-converters-' + attr, withConv);
                                }

                                var handler = attrManager.getHandler(attr, $el);
                                var isBindableAttr = true;
                                if (handler && handler.init) {
                                    isBindableAttr = handler.init.call($el, attr, attrVal);
                                }

                                if (isBindableAttr) {
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

                    // console.log(view, node.selector);
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
                    data.args = _.map(data.args, function (val) {
                        return parseUtils.toImplicitType($.trim(val));
                    });
                    channel.operations.publish(data.fn, data.args);
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

        publish: function(operation, params) {
            console.log('operations publish', operation, params);

            //TODO: check if interpolated
            var me = this;
            return run.do.apply(run, arguments)
                .then(function (response) {
                    me.refresh.call(me, operation, response);
                });
        },

        subscribe: function(operations, subscriber) {
            console.log('operations subscribe', operations, subscriber);
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
    require('./numberformat-converter'),
];

$.each(defaultconverters.reverse(), function(index, converter) {
    converterManager.register(converter);
});

module.exports = converterManager;

},{"./number-converter":12,"./string-converter":13,"./numberformat-converter":14}],5:[function(require,module,exports){
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

},{"./input-checkbox-node":15,"./default-input-node":16,"./default-node":17}],6:[function(require,module,exports){
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


},{"./no-op-attr":18,"./events/init-event-attr":19,"./events/default-event-attr":20,"./binds/checkbox-radio-bind-attr":21,"./binds/input-bind-attr":22,"./class-attr":23,"./positive-boolean-attr":24,"./negative-boolean-attr":25,"./binds/default-bind-attr":26,"./default-attr":27}],10:[function(require,module,exports){
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
                    console.log('Got variables', variables);
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
            console.log('subscribing', properties, subscriber);

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
    alias: function (name) {
        //TODO: Fancy regex to match number formats here
        return (name.indexOf('#') !== -1 || name.indexOf('0') !== -1 );
    },

    parse: function (val) {
        val+= '';
        var isNegative = val.charAt(0) === '-';

        val  = val.replace(/,/g, '');
        var floatMatcher = /([-+]?[0-9]*\.?[0-9]+)(K?M?B?)/i;
        var results = floatMatcher.exec(val);
        var number, suffix = '';
        if(results && results[1]){
            number = results[1];
        }
        if(results && results[2]){
            suffix = results[2].toLowerCase();
        }

        switch(suffix){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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
            var fnName = value.split('(')[0];
            var params = value.substring(value.indexOf('(') + 1, value.indexOf(')')).split(',');
            var args = ($.trim(params) !== '') ? params.split(',') : [];

            me.trigger('f.ui.operate', {fn: fnName, args: args});
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

},{}],20:[function(require,module,exports){
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
            var fnName = value.split('(')[0];
            var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
            var args = ($.trim(params) !== '') ? params.split(',') : [];
            me.trigger('f.ui.operate', {fn: fnName, args: args});
        });
        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
    }
};

},{}],21:[function(require,module,exports){
'use strict';

module.exports = {

    target: ':checkbox,:radio',

    test: 'bind',

    handle: function (value) {
        var settableValue = this.attr('value'); //initial value
        /*jslint eqeq: true*/
        var isChecked = (settableValue !== undefined) ? (settableValue == value) : !!value;
        this.prop('checked', isChecked);
    }
};

},{}],22:[function(require,module,exports){
'use strict';

module.exports = {
    target: 'input, select',

    test: 'bind',

    handle: function (value) {
        this.val(value);
    }
};

},{}],23:[function(require,module,exports){
'use strict';

module.exports = {

    test: 'class',

    target: '*',

    handle: function(value, prop) {
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

},{}],24:[function(require,module,exports){
'use strict';

module.exports = {
    target: '*',

    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped)$/i,

    handle: function(value, prop) {
        /*jslint eqeq: true*/
        var val = (this.attr('value')) ? (value == this.prop('value')) : !!value;
        this.prop(prop, val);
    }
};

},{}],25:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: /^(?:disabled|hidden|readonly)$/i,

    handle: function(value, prop) {
        this.prop(prop, !value);
    }
};

},{}],26:[function(require,module,exports){
'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        this.html(value);
    }
};

},{}],27:[function(require,module,exports){
'use strict';

module.exports = {

    test: '*',

    target: '*',

    handle: function(value, prop) {
        this.prop(prop, value);
    }
};

},{}],15:[function(require,module,exports){
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

},{"./default-input-node":16}],16:[function(require,module,exports){
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

},{"../../config":8,"./default-node":17}],17:[function(require,module,exports){
'use strict';

var BaseView = require('./base');

module.exports = BaseView.extend( {
    propertyHandlers : [

    ],

    initialize: function () {
    }
}, {selector: '*'});

},{"./base":28}],28:[function(require,module,exports){
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9hcHAuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZmxvdy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vZG9tLW1hbmFnZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY2hhbm5lbHMvY2hhbm5lbC1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbmZpZy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy91dGlscy9wYXJzZS11dGlscy5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jaGFubmVscy9vcGVyYXRpb25zLWNoYW5uZWwuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvbm9kZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2F0dHJpYnV0ZS1tYW5hZ2VyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NoYW5uZWxzL3ZhcmlhYmxlcy1jaGFubmVsLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2NvbnZlcnRlcnMvbnVtYmVyLWNvbnZlcnRlci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9jb252ZXJ0ZXJzL3N0cmluZy1jb252ZXJ0ZXIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvY29udmVydGVycy9udW1iZXJmb3JtYXQtY29udmVydGVyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL25vLW9wLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvZXZlbnRzL2luaXQtZXZlbnQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2NoZWNrYm94LXJhZGlvLWJpbmQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9iaW5kcy9pbnB1dC1iaW5kLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvY2xhc3MtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vYXR0cmlidXRlcy9wb3NpdGl2ZS1ib29sZWFuLWF0dHIuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL2F0dHJpYnV0ZXMvbmVnYXRpdmUtYm9vbGVhbi1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9hdHRyaWJ1dGVzL2RlZmF1bHQtYXR0ci5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvaW5wdXQtY2hlY2tib3gtbm9kZS5qcyIsIi9Vc2Vycy9uYXJlbnJhbmppdC9GUHJqcy9mbG93LmpzL3NyYy9kb20vbm9kZXMvZGVmYXVsdC1pbnB1dC1ub2RlLmpzIiwiL1VzZXJzL25hcmVucmFuaml0L0ZQcmpzL2Zsb3cuanMvc3JjL2RvbS9ub2Rlcy9kZWZhdWx0LW5vZGUuanMiLCIvVXNlcnMvbmFyZW5yYW5qaXQvRlByanMvZmxvdy5qcy9zcmMvZG9tL25vZGVzL2Jhc2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsid2luZG93LkZsb3cgPSByZXF1aXJlKCcuL2Zsb3cuanMnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRvbU1hbmFnZXIgPSByZXF1aXJlKCcuL2RvbS9kb20tbWFuYWdlcicpO1xudmFyIENoYW5uZWwgPSByZXF1aXJlKCcuL2NoYW5uZWxzL2NoYW5uZWwtbWFuYWdlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkb206IGRvbU1hbmFnZXIsXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgdmFyIG1vZGVsID0gJCgnYm9keScpLmRhdGEoJ2YtbW9kZWwnKTtcblxuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBjaGFubmVsOiB7XG4gICAgICAgICAgICAgICAgYWNjb3VudDogJycsXG4gICAgICAgICAgICAgICAgcHJvamVjdDogJycsXG4gICAgICAgICAgICAgICAgbW9kZWw6IG1vZGVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZG9tOiB7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgb3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkZWZhdWx0cywgY29uZmlnKTtcbiAgICAgICAgaWYgKGNvbmZpZyAmJiBjb25maWcuY2hhbm5lbCAmJiAoY29uZmlnLmNoYW5uZWwgaW5zdGFuY2VvZiBDaGFubmVsKSkge1xuICAgICAgICAgICAgdGhpcy5jaGFubmVsID0gY29uZmlnLmNoYW5uZWw7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNoYW5uZWwgPSBuZXcgQ2hhbm5lbChvcHRpb25zLmNoYW5uZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9tTWFuYWdlci5pbml0aWFsaXplKCQuZXh0ZW5kKHRydWUsIHtcbiAgICAgICAgICAgIGNoYW5uZWw6IHRoaXMuY2hhbm5lbFxuICAgICAgICB9KSk7XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICB2YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5cbiAgICB2YXIgbm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL25vZGVzL25vZGUtbWFuYWdlci5qcycpO1xuICAgIHZhciBhdHRyTWFuYWdlciA9IHJlcXVpcmUoJy4vYXR0cmlidXRlcy9hdHRyaWJ1dGUtbWFuYWdlci5qcycpO1xuICAgIHZhciBjb252ZXJ0ZXJNYW5hZ2VyID0gcmVxdWlyZSgnLi4vY29udmVydGVycy9jb252ZXJ0ZXItbWFuYWdlci5qcycpO1xuXG4gICAgdmFyIHBhcnNlVXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9wYXJzZS11dGlscycpO1xuXG4gICAgLy9KcXVlcnkgc2VsZWN0b3IgdG8gcmV0dXJuIGV2ZXJ5dGhpbmcgd2hpY2ggaGFzIGEgZi0gcHJvcGVydHkgc2V0XG4gICAgJC5leHByWyc6J11bY29uZmlnLnByZWZpeF0gPSBmdW5jdGlvbihvYmope1xuICAgICAgICB2YXIgJHRoaXMgPSAkKG9iaik7XG4gICAgICAgIHZhciBkYXRhcHJvcHMgPSBfLmtleXMoJHRoaXMuZGF0YSgpKTtcblxuICAgICAgICB2YXIgbWF0Y2ggPSBfLmZpbmQoZGF0YXByb3BzLCBmdW5jdGlvbiAoYXR0cikge1xuICAgICAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoY29uZmlnLnByZWZpeCkgPT09IDApO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gISEobWF0Y2gpO1xuICAgIH07XG5cbiAgICAkLmV4cHJbJzonXS53ZWJjb21wb25lbnQgPSBmdW5jdGlvbihvYmope1xuICAgICAgICBjb25zb2xlLmxvZyhvYmopO1xuICAgICAgICByZXR1cm4gb2JqLm5vZGVOYW1lLmluZGV4T2YoJy0nKSAhPT0gLTE7XG4gICAgfTtcblxuICAgIHZhciBwdWJsaWNBUEkgPSB7XG5cbiAgICAgICAgbm9kZXM6IG5vZGVNYW5hZ2VyLFxuICAgICAgICBhdHRyaWJ1dGVzOiBhdHRyTWFuYWdlcixcbiAgICAgICAgY29udmVydGVyczogY29udmVydGVyTWFuYWdlcixcbiAgICAgICAgLy91dGlscyBmb3IgdGVzdGluZ1xuICAgICAgICBwcml2YXRlOiB7XG5cbiAgICAgICAgfSxcblxuICAgICAgICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgcm9vdDogJ2JvZHknLFxuICAgICAgICAgICAgICAgIGNoYW5uZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkLmV4dGVuZChkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgICAgIHZhciBjaGFubmVsID0gZGVmYXVsdHMuY2hhbm5lbDtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICAgIHZhciAkcm9vdCA9ICQoZGVmYXVsdHMucm9vdCk7XG4gICAgICAgICAgICAkKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgLy9wYXJzZSB0aHJvdWdoIGRvbSBhbmQgZmluZCBldmVyeXRoaW5nIHdpdGggbWF0Y2hpbmcgYXR0cmlidXRlc1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVkRWxlbWVudHMgPSAkcm9vdC5maW5kKCc6JyArIGNvbmZpZy5wcmVmaXgpO1xuICAgICAgICAgICAgICAgIGlmICgkcm9vdC5pcygnOicgKyBjb25maWcucHJlZml4KSkge1xuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkRWxlbWVudHMgPSBtYXRjaGVkRWxlbWVudHMuYWRkKCQoZGVmYXVsdHMucm9vdCkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG1lLnByaXZhdGUubWF0Y2hlZEVsZW1lbnRzID0gbWF0Y2hlZEVsZW1lbnRzO1xuXG4gICAgICAgICAgICAgICAgJC5lYWNoKG1hdGNoZWRFbGVtZW50cywgZnVuY3Rpb24oaW5kZXgsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyICRlbCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBIYW5kbGVyID0gbm9kZU1hbmFnZXIuZ2V0SGFuZGxlcigkZWwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlbGVtZW50LCBIYW5kbGVyLnNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgbmV3IEhhbmRsZXIuaGFuZGxlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsOiBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhck1hcCA9ICRlbC5kYXRhKCd2YXJpYWJsZS1hdHRyLW1hcCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXZhck1hcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyTWFwID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICAvL05PVEU6IGxvb3BpbmcgdGhyb3VnaCBhdHRyaWJ1dGVzIGluc3RlYWQgb2YgLmRhdGEgYmVjYXVzZSAuZGF0YSBhdXRvbWF0aWNhbGx5IGNhbWVsY2FzZXMgcHJvcGVydGllcyBhbmQgbWFrZSBpdCBoYXJkIHRvIHJldHJ2aWV2ZVxuICAgICAgICAgICAgICAgICAgICAgICAgJChlbGVtZW50LmF0dHJpYnV0ZXMpLmVhY2goZnVuY3Rpb24oaW5kZXgsIG5vZGVNYXApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdHRyID0gbm9kZU1hcC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXR0clZhbCA9IG5vZGVNYXAudmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2FudGVkUHJlZml4ID0gJ2RhdGEtZi0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyLmluZGV4T2Yod2FudGVkUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKHdhbnRlZFByZWZpeCwgJycpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3aXRoQ29udiA9IF8uaW52b2tlKGF0dHJWYWwuc3BsaXQoJ3wnKSwgJ3RyaW0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpdGhDb252Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJWYWwgPSB3aXRoQ29udi5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGVsLmRhdGEoJ2YtY29udmVydGVycy0nICsgYXR0ciwgd2l0aENvbnYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKGF0dHIsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpc0JpbmRhYmxlQXR0ciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVyICYmIGhhbmRsZXIuaW5pdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNCaW5kYWJsZUF0dHIgPSBoYW5kbGVyLmluaXQuY2FsbCgkZWwsIGF0dHIsIGF0dHJWYWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQmluZGFibGVBdHRyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29tbWFSZWdleCA9IC8sKD8hW15cXFtdKlxcXSkvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJWYWwuc3BsaXQoY29tbWFSZWdleCkubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ET1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRyaWdnZXJlcnMgPSB0cmlnZ2VyZXJzLmNvbmNhdCh2YWwuc3BsaXQoJywnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJNYXBbYXR0clZhbF0gPSBhdHRyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZWwuZGF0YSgndmFyaWFibGUtYXR0ci1tYXAnLCB2YXJNYXApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codmlldywgbm9kZS5zZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdWJzY3JpYmFibGUgPSBPYmplY3Qua2V5cyh2YXJNYXApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3Vic2NyaWJhYmxlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC52YXJpYWJsZXMuc3Vic2NyaWJlKE9iamVjdC5rZXlzKHZhck1hcCksICRlbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vQXR0YWNoIGxpc3RlbmVyc1xuICAgICAgICAgICAgICAgIC8vVE9ETzogc3BsaXQgaW5pdGlhbGl6ZSBpbnRvIG11bHRpcGxlIHN1YiBldmVudHMsIGF0IGxlYXN0IEFkZCAmIHRoZW4gYXR0YWNoIGhhbmRsZXJzXG4gICAgICAgICAgICAgICAgJHJvb3Qub2ZmKGNvbmZpZy5ldmVudHMucmVhY3QpLm9uKGNvbmZpZy5ldmVudHMucmVhY3QsIGZ1bmN0aW9uKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhldnQudGFyZ2V0LCBkYXRhLCBcInJvb3Qgb25cIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciAkZWwgPSAkKGV2dC50YXJnZXQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFybWFwID0gJGVsLmRhdGEoJ3ZhcmlhYmxlLWF0dHItbWFwJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgJC5lYWNoKGRhdGEsIGZ1bmN0aW9uKHZhcmlhYmxlTmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eVRvVXBkYXRlID0gdmFybWFwW3ZhcmlhYmxlTmFtZS50cmltKCldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5VG9VcGRhdGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vZi1jb252ZXJ0ZXJzLSogaXMgYWxyZWFkeSBzZXQgd2hpbGUgcGFyc2luZyB0aGUgdmFybWFwLCBhcyBhbiBhcnJheSB0byBib290XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0dHJDb252ZXJ0ZXJzID0gJGVsLmRhdGEoJ2YtY29udmVydGVycy0nICsgcHJvcGVydHlUb1VwZGF0ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzICYmIHByb3BlcnR5VG9VcGRhdGUgPT09ICdiaW5kJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRlbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyICRwYXJlbnRFbCA9ICRlbC5jbG9zZXN0KCdbZGF0YS1mLWNvbnZlcnRdJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJHBhcmVudEVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkcGFyZW50RWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJDb252ZXJ0ZXJzID0gYXR0ckNvbnZlcnRlcnMuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29udmVydGVkVmFsdWUgPSBjb252ZXJ0ZXJNYW5hZ2VyLmNvbnZlcnQodmFsdWUsIGF0dHJDb252ZXJ0ZXJzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VG9VcGRhdGUgPSBwcm9wZXJ0eVRvVXBkYXRlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZXIgPSBhdHRyTWFuYWdlci5nZXRIYW5kbGVyKHByb3BlcnR5VG9VcGRhdGUsICRlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5oYW5kbGUuY2FsbCgkZWwsIGNvbnZlcnRlZFZhbHVlLCBwcm9wZXJ0eVRvVXBkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoY29uZmlnLmV2ZW50cy50cmlnZ2VyKS5vbihjb25maWcuZXZlbnRzLnRyaWdnZXIsIGZ1bmN0aW9uKGV2dCwgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyc2VkRGF0YSA9IHt9OyAvL2lmIG5vdCBhbGwgc3Vic2VxdWVudCBsaXN0ZW5lcnMgd2lsbCBnZXQgdGhlIG1vZGlmaWVkIGRhdGFcblxuICAgICAgICAgICAgICAgICAgICB2YXIgJGVsID0gJChldnQudGFyZ2V0KTtcblxuICAgICAgICAgICAgICAgICAgICAvL2YtY29udmVydGVycy0qIGlzIGFscmVhZHkgc2V0IHdoaWxlIHBhcnNpbmcgdGhlIHZhcm1hcCwgYXMgYW4gYXJyYXkgdG8gYm9vdFxuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0ZXJzLWJpbmQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRyQ29udmVydGVycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0ckNvbnZlcnRlcnMgPSAkZWwuZGF0YSgnZi1jb252ZXJ0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWF0dHJDb252ZXJ0ZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyICRwYXJlbnRFbCA9ICRlbC5jbG9zZXN0KCdbZGF0YS1mLWNvbnZlcnRdJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRwYXJlbnRFbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9ICRwYXJlbnRFbC5kYXRhKCdmLWNvbnZlcnQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ckNvbnZlcnRlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyQ29udmVydGVycyA9IGF0dHJDb252ZXJ0ZXJzLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBfLmVhY2goZGF0YSwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXkgPSBrZXkuc3BsaXQoJ3wnKVswXS50cmltKCk7IC8vaW4gY2FzZSB0aGUgcGlwZSBmb3JtYXR0aW5nIHN5bnRheCB3YXMgdXNlZFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gY29udmVydGVyTWFuYWdlci5wYXJzZSh2YWwsIGF0dHJDb252ZXJ0ZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZERhdGFba2V5XSA9IHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUodmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGNoYW5uZWwudmFyaWFibGVzLnB1Ymxpc2gocGFyc2VkRGF0YSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAkcm9vdC5vZmYoJ2YudWkub3BlcmF0ZScpLm9uKCdmLnVpLm9wZXJhdGUnLCBmdW5jdGlvbihldnQsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YSA9ICQuZXh0ZW5kKHRydWUsIHt9LCBkYXRhKTsgLy9pZiBub3QgYWxsIHN1YnNlcXVlbnQgbGlzdGVuZXJzIHdpbGwgZ2V0IHRoZSBtb2RpZmllZCBkYXRhXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuYXJncyA9IF8ubWFwKGRhdGEuYXJncywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVXRpbHMudG9JbXBsaWNpdFR5cGUoJC50cmltKHZhbCkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY2hhbm5lbC5vcGVyYXRpb25zLnB1Ymxpc2goZGF0YS5mbiwgZGF0YS5hcmdzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59KCkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmFyc0NoYW5uZWwgPSByZXF1aXJlKCcuL3ZhcmlhYmxlcy1jaGFubmVsJyk7XG52YXIgT3BlcmF0aW9uc0NoYW5uZWwgPSByZXF1aXJlKCcuL29wZXJhdGlvbnMtY2hhbm5lbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHt9O1xuICAgIH1cblxuICAgIHZhciBydW5wYXJhbXMgPSBjb25maWc7XG5cbiAgICB2YXIgcnMgPSBuZXcgRi5zZXJ2aWNlLlJ1bihydW5wYXJhbXMpO1xuXG4gICAgd2luZG93LnJ1biA9IHJzO1xuICAgIC8vVE9ETzogc3RvcmUgcnVuaWQgaW4gdG9rZW4gZXRjLiBCdXQgaWYgeW91IGRvIHRoaXMsIG1ha2Ugc3VyZSB5b3UgcmVtb3ZlIHRva2VuIG9uIHJlc2V0XG4gICAgdmFyICRjcmVhdGlvblByb21pc2UgPSBycy5jcmVhdGUoY29uZmlnLm1vZGVsKTtcbiAgICBycy5jdXJyZW50UHJvbWlzZSA9ICRjcmVhdGlvblByb21pc2U7XG5cbiAgICB2YXIgY3JlYXRlQW5kVGhlbiA9IGZ1bmN0aW9uKHZhbHVlLCBjb250ZXh0KSB7XG4gICAgICAgIHJldHVybiBfLndyYXAodmFsdWUsIGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgIHZhciBwYXNzZWRJblBhcmFtcyA9IF8udG9BcnJheShhcmd1bWVudHMpLnNsaWNlKDEpO1xuICAgICAgICAgICAgcmV0dXJuIHJzLmN1cnJlbnRQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCl7XG4gICAgICAgICAgICAgICAgcnMuY3VycmVudFByb21pc2UgPSBmdW5jLmFwcGx5KGNvbnRleHQsIHBhc3NlZEluUGFyYW1zKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnMuY3VycmVudFByb21pc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vTWFrZSBzdXJlIG5vdGhpbmcgaGFwcGVucyBiZWZvcmUgdGhlIHJ1biBpcyBjcmVhdGVkXG4gICAgXy5lYWNoKHJzLCBmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICBpZiAoJC5pc0Z1bmN0aW9uKHZhbHVlKSAmJiBuYW1lICE9PSAndmFyaWFibGVzJykge1xuICAgICAgICAgICAgcnNbbmFtZV0gPSBjcmVhdGVBbmRUaGVuKHZhbHVlLCBycyk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgdnMgPSBycy52YXJpYWJsZXMoKTtcbiAgICBfLmVhY2godnMsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIGlmICgkLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICB2c1tuYW1lXSA9IGNyZWF0ZUFuZFRoZW4odmFsdWUsIHZzKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5ydW4gPSBycztcbiAgICB0aGlzLnZhcmlhYmxlcyA9IG5ldyBWYXJzQ2hhbm5lbCh7cnVuOiBycywgdmVudDogdGhpc30pO1xuICAgIHRoaXMub3BlcmF0aW9ucyA9IG5ldyBPcGVyYXRpb25zQ2hhbm5lbCh7cnVuOiBycywgdmVudDogdGhpc30pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByZWZpeDogJ2YnLFxuICAgIGRlZmF1bHRBdHRyOiAnYmluZCcsXG5cbiAgICBiaW5kZXJBdHRyOiAnZi1iaW5kJyxcblxuICAgIGV2ZW50czoge1xuICAgICAgICB0cmlnZ2VyOiAndXBkYXRlLmYudWknLFxuICAgICAgICByZWFjdDogJ3VwZGF0ZS5mLm1vZGVsJ1xuICAgIH1cblxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICB0b0ltcGxpY2l0VHlwZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgdmFyIHJicmFjZSA9IC9eKD86XFx7LipcXH18XFxbLipcXF0pJC87XG4gICAgICAgIHZhciBjb252ZXJ0ZWQgPSBkYXRhO1xuICAgICAgICBpZiAoIHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJyApIHtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnRyaW0oKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkYXRhID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChkYXRhID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZGF0YSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYoY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1xcJycgfHwgY29udmVydGVkLmNoYXJBdCgwKSA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICAgIGNvbnZlcnRlZCA9IGRhdGEuc3Vic3RyaW5nKDEsIGRhdGEubGVuZ3RoIC0xKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCQuaXNOdW1lcmljKCBkYXRhICkpIHtcbiAgICAgICAgICAgICAgICBjb252ZXJ0ZWQgPSArZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKCByYnJhY2UudGVzdCggZGF0YSApKSB7XG4gICAgICAgICAgICAgICAgLy9UT0RPOiBUaGlzIG9ubHkgd29ya3Mgd2l0aCBkb3VibGUgcXVvdGVzLCBpLmUuLCBbMSxcIjJcIl0gd29ya3MgYnV0IG5vdCBbMSwnMiddXG4gICAgICAgICAgICAgICAgY29udmVydGVkID0gJC5wYXJzZUpTT04oIGRhdGEgKSA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlZDtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHt9O1xuICAgIH1cbiAgICB2YXIgcnVuID0gY29uZmlnLnJ1bjtcbiAgICB2YXIgdmVudCA9IGNvbmZpZy52ZW50O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgbGlzdGVuZXJNYXA6IHt9LFxuXG4gICAgICAgIC8vQ2hlY2sgZm9yIHVwZGF0ZXNcbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24ob3BlcmF0aW9uLHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAvLyB2YXIgRElSVFlfT1BFUkFUSU9OUyA9IFsnc3RhcnRfZ2FtZScsICdpbml0aWFsaXplJywgJ3N0ZXAnXTtcbiAgICAgICAgICAgIC8vIGlmIChfLmNvbnRhaW5zKERJUlRZX09QRVJBVElPTlMsIG9wZXJhdGlvbikpIHtcbiAgICAgICAgICAgICQodmVudCkudHJpZ2dlcignZGlydHknLCB7b3BuOiBvcGVyYXRpb24sIHJlc3BvbnNlOiByZXNwb25zZX0pO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICB9LFxuXG4gICAgICAgIHB1Ymxpc2g6IGZ1bmN0aW9uKG9wZXJhdGlvbiwgcGFyYW1zKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBwdWJsaXNoJywgb3BlcmF0aW9uLCBwYXJhbXMpO1xuXG4gICAgICAgICAgICAvL1RPRE86IGNoZWNrIGlmIGludGVycG9sYXRlZFxuICAgICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiBydW4uZG8uYXBwbHkocnVuLCBhcmd1bWVudHMpXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSwgb3BlcmF0aW9uLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbihvcGVyYXRpb25zLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnb3BlcmF0aW9ucyBzdWJzY3JpYmUnLCBvcGVyYXRpb25zLCBzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgIG9wZXJhdGlvbnMgPSBbXS5jb25jYXQob3BlcmF0aW9ucyk7XG4gICAgICAgICAgICAvL3VzZSBqcXVlcnkgdG8gbWFrZSBldmVudCBzaW5rXG4gICAgICAgICAgICAvL1RPRE86IHN1YnNjcmliZXIgY2FuIGJlIGEgZnVuY3Rpb25cbiAgICAgICAgICAgIGlmICghc3Vic2NyaWJlci5vbikge1xuICAgICAgICAgICAgICAgIHN1YnNjcmliZXIgPSAkKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaWQgID0gXy51bmlxdWVJZCgnZXBpY2hhbm5lbC5vcGVyYXRpb24nKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHN1YnNjcmliZXJcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICAkLmVhY2gob3BlcmF0aW9ucywgZnVuY3Rpb24oaW5kZXgsIG9wbikge1xuICAgICAgICAgICAgICAgIG1lLmxpc3RlbmVyTWFwW29wbl0gPSBtZS5saXN0ZW5lck1hcFtvcG5dLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gaWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbih2YXJpYWJsZSwgdG9rZW4pIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJNYXAgPSBfLnJlamVjdCh0aGlzLmxpc3RlbmVyTWFwLCBmdW5jdGlvbihzdWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1YnMuaWQgPT09IHRva2VuO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc3Vic2NyaWJlQWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJNYXAgPSBbXTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgcmV0dXJuICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAoYWxpYXMsIGNvbnZlcnRlcikge1xuICAgIHZhciByZXQgPSBbXTtcbiAgICAvL25vbWFsaXplKCdmbGlwJywgZm4pXG4gICAgaWYgKF8uaXNGdW5jdGlvbihjb252ZXJ0ZXIpKSB7XG4gICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgIGFsaWFzOiBhbGlhcyxcbiAgICAgICAgICAgIGNvbnZlcnQ6IGNvbnZlcnRlclxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pc09iamVjdChjb252ZXJ0ZXIpICYmIGNvbnZlcnRlci5jb252ZXJ0KSB7XG4gICAgICAgIGNvbnZlcnRlci5hbGlhcyA9IGFsaWFzO1xuICAgICAgICByZXQucHVzaChjb252ZXJ0ZXIpO1xuICAgIH1cbiAgICBlbHNlIGlmKF8uaXNPYmplY3QoYWxpYXMpKSB7XG4gICAgICAgIC8vbm9ybWFsaXplKHthbGlhczogJ2ZsaXAnLCBjb252ZXJ0OiBmdW5jdGlvbn0pXG4gICAgICAgIGlmIChhbGlhcy5jb252ZXJ0KSB7XG4gICAgICAgICAgICByZXQucHVzaChhbGlhcyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBub3JtYWxpemUoe2ZsaXA6IGZ1bn0pXG4gICAgICAgICAgICAkLmVhY2goYWxpYXMsIGZ1bmN0aW9uIChrZXksIHZhbCkge1xuICAgICAgICAgICAgICAgIHJldC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgYWxpYXM6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgY29udmVydDogdmFsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufTtcblxudmFyIG1hdGNoQ29udmVydGVyID0gZnVuY3Rpb24gKGFsaWFzLCBjb252ZXJ0ZXIpIHtcbiAgICBpZiAoXy5pc1N0cmluZyhjb252ZXJ0ZXIuYWxpYXMpKSB7XG4gICAgICAgIHJldHVybiBhbGlhcyA9PT0gY29udmVydGVyLmFsaWFzO1xuICAgIH1cbiAgICBlbHNlIGlmIChfLmlzRnVuY3Rpb24oY29udmVydGVyLmFsaWFzKSkge1xuICAgICAgICByZXR1cm4gY29udmVydGVyLmFsaWFzKGFsaWFzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoXy5pc1JlZ2V4KGNvbnZlcnRlci5hbGlhcykpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRlci5hbGlhcy5tYXRjaChhbGlhcyk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBjb252ZXJ0ZXJNYW5hZ2VyID0ge1xuICAgIHByaXZhdGU6IHtcbiAgICAgICAgbWF0Y2hDb252ZXJ0ZXI6IG1hdGNoQ29udmVydGVyXG4gICAgfSxcblxuICAgIGxpc3Q6IFtdLFxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBhdHRyaWJ1dGUgY29udmVydGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfGZ1bmN0aW9ufHJlZ2V4fSBhbGlhcyBmb3JtYXR0ZXIgbmFtZVxuICAgICAqIEBwYXJhbSAge2Z1bmN0aW9ufG9iamVjdH0gY29udmVydGVyICAgIGNvbnZlcnRlciBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24sIHdoaWNoIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIHZhbHVlLCBvciBhbiBvYmplY3Qgd2l0aCB7YWxpYXM6ICcnLCBwYXJzZTogJC5ub29wLCBjb252ZXJ0OiAkLm5vb3B9XG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhbGlhcywgY29udmVydGVyKSB7XG4gICAgICAgIHZhciBub3JtYWxpemVkID0gbm9ybWFsaXplKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB0aGlzLmxpc3QgPSBub3JtYWxpemVkLmNvbmNhdCh0aGlzLmxpc3QpO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbihhbGlhcywgY29udmVydGVyKSB7XG4gICAgICAgIHZhciBpbmRleDtcbiAgICAgICAgXy5lYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oY3VycmVudENvbnZlcnRlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQ29udmVydGVyKGFsaWFzLCBjdXJyZW50Q29udmVydGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYWxpYXMsIGNvbnZlcnRlcilbMF0pO1xuICAgIH0sXG5cbiAgICBnZXRDb252ZXJ0ZXI6IGZ1bmN0aW9uIChhbGlhcykge1xuICAgICAgICByZXR1cm4gXy5maW5kKHRoaXMubGlzdCwgZnVuY3Rpb24gKGNvbnZlcnRlcikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoQ29udmVydGVyKGFsaWFzLCBjb252ZXJ0ZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgY29udmVydDogZnVuY3Rpb24gKHZhbHVlLCBsaXN0KSB7XG4gICAgICAgIGlmICghbGlzdCB8fCAhbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICBsaXN0ID0gW10uY29uY2F0KGxpc3QpO1xuICAgICAgICBsaXN0ID0gXy5pbnZva2UobGlzdCwgJ3RyaW0nKTtcblxuICAgICAgICB2YXIgY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgIF8uZWFjaChsaXN0LCBmdW5jdGlvbiAoY29udmVydGVyTmFtZSl7XG4gICAgICAgICAgICB2YXIgY29udmVydGVyID0gbWUuZ2V0Q29udmVydGVyKGNvbnZlcnRlck5hbWUpO1xuICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydGVyLmNvbnZlcnQoY3VycmVudFZhbHVlLCBjb252ZXJ0ZXJOYW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjdXJyZW50VmFsdWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvdW50ZXItcGFydCB0byAnY29udmVydCcuIFRyYW5zbGF0ZXMgY29udmVydGVkIHZhbHVlcyBiYWNrIHRvIHRoZWlyIG9yaWdpbmFsIGZvcm1cbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHZhbHVlIFZhbHVlIHRvIHBhcnNlXG4gICAgICogQHBhcmFtICB7U3RyaW5nIHwgQXJyYXl9IGxpc3QgIExpc3Qgb2YgcGFyc2VycyB0byBydW4gdGhpcyB0aHJvdWdoLiBPdXRlcm1vc3QgaXMgaW52b2tlZCBmaXJzdFxuICAgICAqIEByZXR1cm4geyp9XG4gICAgICovXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWx1ZSwgbGlzdCkge1xuICAgICAgICBpZiAoIWxpc3QgfHwgIWxpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgbGlzdCA9IFtdLmNvbmNhdChsaXN0KS5yZXZlcnNlKCk7XG4gICAgICAgIGxpc3QgPSBfLmludm9rZShsaXN0LCAndHJpbScpO1xuXG4gICAgICAgIHZhciBjdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgXy5lYWNoKGxpc3QsIGZ1bmN0aW9uIChjb252ZXJ0ZXJOYW1lKXtcbiAgICAgICAgICAgIHZhciBjb252ZXJ0ZXIgPSBtZS5nZXRDb252ZXJ0ZXIoY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICBpZiAoY29udmVydGVyLnBhcnNlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlID0gY29udmVydGVyLnBhcnNlKGN1cnJlbnRWYWx1ZSwgY29udmVydGVyTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY3VycmVudFZhbHVlO1xuICAgIH1cbn07XG5cblxuLy9Cb290c3RyYXBcbnZhciBkZWZhdWx0Y29udmVydGVycyA9IFtcbiAgICByZXF1aXJlKCcuL251bWJlci1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL3N0cmluZy1jb252ZXJ0ZXInKSxcbiAgICByZXF1aXJlKCcuL251bWJlcmZvcm1hdC1jb252ZXJ0ZXInKSxcbl07XG5cbiQuZWFjaChkZWZhdWx0Y29udmVydGVycy5yZXZlcnNlKCksIGZ1bmN0aW9uKGluZGV4LCBjb252ZXJ0ZXIpIHtcbiAgICBjb252ZXJ0ZXJNYW5hZ2VyLnJlZ2lzdGVyKGNvbnZlcnRlcik7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb252ZXJ0ZXJNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgICAgICBoYW5kbGVyID0ge1xuICAgICAgICAgICAgaGFuZGxlOiBoYW5kbGVyXG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmICghc2VsZWN0b3IpIHtcbiAgICAgICAgc2VsZWN0b3IgPSAnKic7XG4gICAgfVxuICAgIGhhbmRsZXIuc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiAgICByZXR1cm4gaGFuZGxlcjtcbn07XG5cbnZhciBtYXRjaCA9IGZ1bmN0aW9uICh0b01hdGNoLCBub2RlKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcodG9NYXRjaCkpIHtcbiAgICAgICAgcmV0dXJuIHRvTWF0Y2ggPT09IG5vZGUuc2VsZWN0b3I7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gJCh0b01hdGNoKS5pcyhub2RlLnNlbGVjdG9yKTtcbiAgICB9XG59O1xuXG52YXIgbm9kZU1hbmFnZXIgPSB7XG4gICAgbGlzdDogW10sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgbm9kZSBoYW5kbGVyXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBzZWxlY3RvciBqUXVlcnktY29tcGF0aWJsZSBzZWxlY3RvciB0byB1c2UgdG8gbWF0Y2ggbm9kZXNcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbn0gaGFuZGxlciAgSGFuZGxlcnMgYXJlIG5ldy1hYmxlIGZ1bmN0aW9ucy4gVGhleSB3aWxsIGJlIGNhbGxlZCB3aXRoICRlbCBhcyBjb250ZXh0Lj8gVE9ETzogVGhpbmsgdGhpcyB0aHJvdWdoXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChzZWxlY3RvciwgaGFuZGxlcikge1xuICAgICAgICB0aGlzLmxpc3QudW5zaGlmdChub3JtYWxpemUoc2VsZWN0b3IsIGhhbmRsZXIpKTtcbiAgICB9LFxuXG4gICAgZ2V0SGFuZGxlcjogZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZCh0aGlzLmxpc3QsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaChzZWxlY3Rvciwgbm9kZSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICByZXBsYWNlOiBmdW5jdGlvbihzZWxlY3RvciwgaGFuZGxlcikge1xuICAgICAgICB2YXIgaW5kZXg7XG4gICAgICAgIF8uZWFjaCh0aGlzLmxpc3QsIGZ1bmN0aW9uKGN1cnJlbnRIYW5kbGVyLCBpKSB7XG4gICAgICAgICAgICBpZiAoc2VsZWN0b3IgPT09IGN1cnJlbnRIYW5kbGVyLnNlbGVjdG9yKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMubGlzdC5zcGxpY2UoaW5kZXgsIDEsIG5vcm1hbGl6ZShzZWxlY3RvciwgaGFuZGxlcikpO1xuICAgIH1cbn07XG5cbi8vYm9vdHN0cmFwc1xudmFyIGRlZmF1bHRIYW5kbGVycyA9IFtcbiAgICByZXF1aXJlKCcuL2lucHV0LWNoZWNrYm94LW5vZGUnKSxcbiAgICByZXF1aXJlKCcuL2RlZmF1bHQtaW5wdXQtbm9kZScpLFxuICAgIHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJylcbl07XG5fLmVhY2goZGVmYXVsdEhhbmRsZXJzLnJldmVyc2UoKSwgZnVuY3Rpb24oaGFuZGxlcikge1xuICAgIG5vZGVNYW5hZ2VyLnJlZ2lzdGVyKGhhbmRsZXIuc2VsZWN0b3IsIGhhbmRsZXIpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbm9kZU1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0SGFuZGxlcnMgPSBbXG4gICAgcmVxdWlyZSgnLi9uby1vcC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvaW5pdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9ldmVudHMvZGVmYXVsdC1ldmVudC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9iaW5kcy9jaGVja2JveC1yYWRpby1iaW5kLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2lucHV0LWJpbmQtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vY2xhc3MtYXR0cicpLFxuICAgIHJlcXVpcmUoJy4vcG9zaXRpdmUtYm9vbGVhbi1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9uZWdhdGl2ZS1ib29sZWFuLWF0dHInKSxcbiAgICByZXF1aXJlKCcuL2JpbmRzL2RlZmF1bHQtYmluZC1hdHRyJyksXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0LWF0dHInKVxuXTtcblxudmFyIGhhbmRsZXJzTGlzdCA9IFtdO1xuXG52YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKGF0dHJpYnV0ZU1hdGNoZXIsIG5vZGVNYXRjaGVyLCBoYW5kbGVyKSB7XG4gICAgaWYgKCFub2RlTWF0Y2hlcikge1xuICAgICAgICBub2RlTWF0Y2hlciA9ICcqJztcbiAgICB9XG4gICAgaWYgKF8uaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgICAgICBoYW5kbGVyID0ge1xuICAgICAgICAgICAgaGFuZGxlOiBoYW5kbGVyXG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiAkLmV4dGVuZChoYW5kbGVyLCB7dGVzdDogYXR0cmlidXRlTWF0Y2hlciwgdGFyZ2V0OiBub2RlTWF0Y2hlcn0pO1xufTtcblxuJC5lYWNoKGRlZmF1bHRIYW5kbGVycywgZnVuY3Rpb24oaW5kZXgsIGhhbmRsZXIpIHtcbiAgICBoYW5kbGVyc0xpc3QucHVzaChub3JtYWxpemUoaGFuZGxlci50ZXN0LCBoYW5kbGVyLnRhcmdldCwgaGFuZGxlcikpO1xufSk7XG5cblxudmFyIG1hdGNoQXR0ciA9IGZ1bmN0aW9uIChtYXRjaEV4cHIsIGF0dHIsICRlbCkge1xuICAgIHZhciBhdHRyTWF0Y2g7XG5cbiAgICBpZiAoXy5pc1N0cmluZyhtYXRjaEV4cHIpKSB7XG4gICAgICAgIGF0dHJNYXRjaCA9IChtYXRjaEV4cHIgPT09ICcqJyB8fCAobWF0Y2hFeHByLnRvTG93ZXJDYXNlKCkgPT09IGF0dHIudG9Mb3dlckNhc2UoKSkpO1xuICAgIH1cbiAgICBlbHNlIGlmIChfLmlzRnVuY3Rpb24obWF0Y2hFeHByKSkge1xuICAgICAgICAvL1RPRE86IHJlbW92ZSBlbGVtZW50IHNlbGVjdG9ycyBmcm9tIGF0dHJpYnV0ZXNcbiAgICAgICAgYXR0ck1hdGNoID0gbWF0Y2hFeHByKGF0dHIsICRlbCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKF8uaXNSZWdFeHAobWF0Y2hFeHByKSkge1xuICAgICAgICBhdHRyTWF0Y2ggPSBhdHRyLm1hdGNoKG1hdGNoRXhwcik7XG4gICAgfVxuICAgIHJldHVybiBhdHRyTWF0Y2g7XG59O1xuXG52YXIgbWF0Y2hOb2RlID0gZnVuY3Rpb24gKHRhcmdldCwgbm9kZUZpbHRlcikge1xuICAgIHJldHVybiAoXy5pc1N0cmluZyhub2RlRmlsdGVyKSkgPyAobm9kZUZpbHRlciA9PT0gdGFyZ2V0KSA6IG5vZGVGaWx0ZXIuaXModGFyZ2V0KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGxpc3Q6IGhhbmRsZXJzTGlzdCxcbiAgICAvKipcbiAgICAgKiBBZGQgYSBuZXcgYXR0cmlidXRlIGhhbmRsZXJcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd8ZnVuY3Rpb258cmVnZXh9IGF0dHJpYnV0ZU1hdGNoZXIgRGVzY3JpcHRpb24gb2Ygd2hpY2ggYXR0cmlidXRlcyB0byBtYXRjaFxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gbm9kZU1hdGNoZXIgICAgICBXaGljaCBub2RlcyB0byBhbGwgYXR0cmlidXRlcyB0by4gVXNlIGpxdWVyeSBTZWxlY3RvciBzeW50YXhcbiAgICAgKiBAcGFyYW0gIHtmdW5jdGlvbnxvYmplY3R9IGhhbmRsZXIgICAgSGFuZGxlciBjYW4gZWl0aGVyIGJlIGEgZnVuY3Rpb24gKFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB3aXRoICRlbGVtZW50IGFzIGNvbnRleHQsIGFuZCBhdHRyaWJ1dGUgdmFsdWUgKyBuYW1lKSwgb3IgYW4gb2JqZWN0IHdpdGgge2luaXQ6IGZuLCAgaGFuZGxlOiBmbn0uIFRoZSBpbml0IGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW4gcGFnZSBsb2FkczsgdXNlIHRoaXMgdG8gZGVmaW5lIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXRjaGVyLCBub2RlTWF0Y2hlciwgaGFuZGxlcikge1xuICAgICAgICBoYW5kbGVyc0xpc3QudW5zaGlmdChub3JtYWxpemUuYXBwbHkobnVsbCwgYXJndW1lbnRzKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZpbmQgYW4gYXR0cmlidXRlIG1hdGNoZXIgbWF0Y2hpbmcgc29tZSBjcml0ZXJpYVxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gYXR0ckZpbHRlciBhdHRyaWJ1dGUgdG8gbWF0Y2hcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmcgfCAkZWx9IG5vZGVGaWx0ZXIgbm9kZSB0byBtYXRjaFxuICAgICAqIEByZXR1cm4ge2FycmF5fG51bGx9XG4gICAgICovXG4gICAgZmlsdGVyOiBmdW5jdGlvbihhdHRyRmlsdGVyLCBub2RlRmlsdGVyKSB7XG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IF8uc2VsZWN0KGhhbmRsZXJzTGlzdCwgZnVuY3Rpb24gKGhhbmRsZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaEF0dHIoaGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChub2RlRmlsdGVyKSB7XG4gICAgICAgICAgICBmaWx0ZXJlZCA9IF8uc2VsZWN0KGZpbHRlcmVkLCBmdW5jdGlvbiAoaGFuZGxlcil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoTm9kZShoYW5kbGVyLnRhcmdldCwgbm9kZUZpbHRlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmlsdGVyZWQ7XG4gICAgfSxcblxuICAgIHJlcGxhY2U6IGZ1bmN0aW9uKGF0dHJGaWx0ZXIsIG5vZGVGaWx0ZXIsIGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICBfLmVhY2goaGFuZGxlcnNMaXN0LCBmdW5jdGlvbihjdXJyZW50SGFuZGxlciwgaSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoQXR0cihjdXJyZW50SGFuZGxlci50ZXN0LCBhdHRyRmlsdGVyKSAmJiBtYXRjaE5vZGUoY3VycmVudEhhbmRsZXIudGFyZ2V0LCBub2RlRmlsdGVyKSkge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBoYW5kbGVyc0xpc3Quc3BsaWNlKGluZGV4LCAxLCBub3JtYWxpemUoYXR0ckZpbHRlciwgbm9kZUZpbHRlciwgaGFuZGxlcikpO1xuICAgIH0sXG5cbiAgICBnZXRIYW5kbGVyOiBmdW5jdGlvbihwcm9wZXJ0eSwgJGVsKSB7XG4gICAgICAgIHZhciBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyKHByb3BlcnR5LCAkZWwpO1xuICAgICAgICAvL1RoZXJlIGNvdWxkIGJlIG11bHRpcGxlIG1hdGNoZXMsIGJ1dCB0aGUgdG9wIGZpcnN0IGhhcyB0aGUgbW9zdCBwcmlvcml0eVxuICAgICAgICByZXR1cm4gZmlsdGVyZWRbMF07XG4gICAgfVxufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cbiAgICB2YXIgdnMgPSBvcHRpb25zLnJ1bi52YXJpYWJsZXMoKTtcbiAgICB2YXIgdmVudCAgPSBvcHRpb25zLnZlbnQ7XG5cbiAgICB2YXIgY3VycmVudERhdGEgPSB7fTtcblxuICAgIC8vVE9ETzogYWN0dWFsbHkgY29tcGFyZSBvYmplY3RzIGFuZCBzbyBvblxuICAgIHZhciBpc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHZhciBnZXRJbm5lclZhcmlhYmxlcyA9IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICB2YXIgaW5uZXIgPSBzdHIubWF0Y2goLzwoLio/KT4vZyk7XG4gICAgICAgIGlubmVyID0gXy5tYXAoaW5uZXIsIGZ1bmN0aW9uKHZhbCl7XG4gICAgICAgICAgICByZXR1cm4gdmFsLnN1YnN0cmluZygxLCB2YWwubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaW5uZXI7XG4gICAgfTtcblxuICAgIC8vUmVwbGFjZXMgc3R1YmJlZCBvdXQga2V5bmFtZXMgaW4gdmFyaWFibGVzdG9pbnRlcnBvbGF0ZSB3aXRoIHRoZWlyIGNvcnJlc3BvbmRpbmcgY2FsdWVzXG4gICAgdmFyIGludGVycG9sYXRlID0gZnVuY3Rpb24odmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhciBpbnRlcnBvbGF0aW9uTWFwID0ge307XG4gICAgICAgIHZhciBpbnRlcnBvbGF0ZWQgPSB7fTtcblxuICAgICAgICBfLmVhY2godmFyaWFibGVzVG9JbnRlcnBvbGF0ZSwgZnVuY3Rpb24gKHZhbCwgb3V0ZXJWYXJpYWJsZSkge1xuICAgICAgICAgICAgdmFyIGlubmVyID0gZ2V0SW5uZXJWYXJpYWJsZXMob3V0ZXJWYXJpYWJsZSk7XG4gICAgICAgICAgICB2YXIgb3JpZ2luYWxPdXRlciA9IG91dGVyVmFyaWFibGU7XG4gICAgICAgICAgICAkLmVhY2goaW5uZXIsIGZ1bmN0aW9uKGluZGV4LCBpbm5lclZhcmlhYmxlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRoaXN2YWwgPSB2YWx1ZXNbaW5uZXJWYXJpYWJsZV07XG4gICAgICAgICAgICAgICAgaWYgKHRoaXN2YWwgIT09IG51bGwgJiYgdGhpc3ZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkodGhpc3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vRm9yIGFycmF5ZWQgdGhpbmdzIGdldCB0aGUgbGFzdCBvbmUgZm9yIGludGVycG9sYXRpb24gcHVycG9zZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXN2YWwgPSB0aGlzdmFsW3RoaXN2YWwubGVuZ3RoIC0xXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdXRlclZhcmlhYmxlID0gb3V0ZXJWYXJpYWJsZS5yZXBsYWNlKCc8JyArIGlubmVyVmFyaWFibGUgKyAnPicsIHRoaXN2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaW50ZXJwb2xhdGlvbk1hcFtvdXRlclZhcmlhYmxlXSA9IG9yaWdpbmFsT3V0ZXI7XG4gICAgICAgICAgICBpbnRlcnBvbGF0ZWRbb3V0ZXJWYXJpYWJsZV0gPSB2YWw7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBpbnRlcnBvbGF0ZWQ6IGludGVycG9sYXRlZCxcbiAgICAgICAgICAgIGludGVycG9sYXRpb25NYXA6IGludGVycG9sYXRpb25NYXBcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIHB1YmxpY0FQSSA9IHtcbiAgICAgICAgLy9mb3IgdGVzdGluZywgdG8gYmUgcmVtb3ZlZCBsYXRlclxuICAgICAgICBwcml2YXRlOiB7XG4gICAgICAgICAgICBnZXRJbm5lclZhcmlhYmxlczogZ2V0SW5uZXJWYXJpYWJsZXMsXG4gICAgICAgICAgICBpbnRlcnBvbGF0ZTogaW50ZXJwb2xhdGVcbiAgICAgICAgfSxcblxuICAgICAgICAvL0ludGVycG9sYXRlZCB2YXJpYWJsZXMgd2hpY2ggbmVlZCB0byBiZSByZXNvbHZlZCBiZWZvcmUgdGhlIG91dGVyIG9uZXMgY2FuIGJlXG4gICAgICAgIGlubmVyVmFyaWFibGVzTGlzdDogW10sXG4gICAgICAgIHZhcmlhYmxlTGlzdGVuZXJNYXA6IHt9LFxuXG4gICAgICAgIC8vQ2hlY2sgZm9yIHVwZGF0ZXNcbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgICAgICAgICB2YXIgZ2V0VmFyaWFibGVzID0gZnVuY3Rpb24odmFycywgaXApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdnMucXVlcnkodmFycykudGhlbihmdW5jdGlvbih2YXJpYWJsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0dvdCB2YXJpYWJsZXMnLCB2YXJpYWJsZXMpO1xuICAgICAgICAgICAgICAgICAgICBfLmVhY2godmFyaWFibGVzLCBmdW5jdGlvbih2YWx1ZSwgdm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IGN1cnJlbnREYXRhW3ZuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNFcXVhbCh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudERhdGFbdm5hbWVdID0gdmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdm4gPSAoaXAgJiYgaXBbdm5hbWVdKSA/IGlwW3ZuYW1lXSA6IHZuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lLm5vdGlmeSh2biwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAobWUuaW5uZXJWYXJpYWJsZXNMaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2cy5xdWVyeShtZS5pbm5lclZhcmlhYmxlc0xpc3QpLnRoZW4oZnVuY3Rpb24gKGlubmVyVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdpbm5lcicsIGlubmVyVmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgJC5leHRlbmQoY3VycmVudERhdGEsIGlubmVyVmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlwID0gIGludGVycG9sYXRlKG1lLnZhcmlhYmxlTGlzdGVuZXJNYXAsIGlubmVyVmFyaWFibGVzKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG91dGVyID0gXy5rZXlzKGlwLmludGVycG9sYXRlZCk7XG4gICAgICAgICAgICAgICAgICAgIGdldFZhcmlhYmxlcyhvdXRlciwgaXAuaW50ZXJwb2xhdGlvbk1hcCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0VmFyaWFibGVzKF8ua2V5cyhtZS52YXJpYWJsZUxpc3RlbmVyTWFwKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSxcblxuICAgICAgICBub3RpZnk6IGZ1bmN0aW9uICh2YXJpYWJsZSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXBbdmFyaWFibGVdO1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW3ZhcmlhYmxlXSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpe1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyLnRhcmdldC50cmlnZ2VyKGNvbmZpZy5ldmVudHMucmVhY3QsIHBhcmFtcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBwdWJsaXNoOiBmdW5jdGlvbih2YXJpYWJsZSwgdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwdWJsaXNoJywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIC8vIFRPRE86IGNoZWNrIGlmIGludGVycG9sYXRlZFxuICAgICAgICAgICAgdmFyIGF0dHJzO1xuICAgICAgICAgICAgaWYgKCQuaXNQbGFpbk9iamVjdCh2YXJpYWJsZSkpIHtcbiAgICAgICAgICAgICAgICBhdHRycyA9IHZhcmlhYmxlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAoYXR0cnMgPSB7fSlbdmFyaWFibGVdID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgaW50ZXJwb2xhdGVkID0gaW50ZXJwb2xhdGUoYXR0cnMsIGN1cnJlbnREYXRhKS5pbnRlcnBvbGF0ZWQ7XG5cbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICAgICAgICB2cy5zYXZlLmNhbGwodnMsIGludGVycG9sYXRlZClcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLnJlZnJlc2guY2FsbChtZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbihwcm9wZXJ0aWVzLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc3Vic2NyaWJpbmcnLCBwcm9wZXJ0aWVzLCBzdWJzY3JpYmVyKTtcblxuICAgICAgICAgICAgcHJvcGVydGllcyA9IFtdLmNvbmNhdChwcm9wZXJ0aWVzKTtcbiAgICAgICAgICAgIC8vdXNlIGpxdWVyeSB0byBtYWtlIGV2ZW50IHNpbmtcbiAgICAgICAgICAgIC8vVE9ETzogc3Vic2NyaWJlciBjYW4gYmUgYSBmdW5jdGlvblxuICAgICAgICAgICAgaWYgKCFzdWJzY3JpYmVyLm9uKSB7XG4gICAgICAgICAgICAgICAgc3Vic2NyaWJlciA9ICQoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpZCAgPSBfLnVuaXF1ZUlkKCdlcGljaGFubmVsLnZhcmlhYmxlJyk7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiBzdWJzY3JpYmVyXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAgICAgJC5lYWNoKHByb3BlcnRpZXMsIGZ1bmN0aW9uKGluZGV4LCBwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHZhciBpbm5lciA9IGdldElubmVyVmFyaWFibGVzKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICBpZiAoaW5uZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIG1lLmlubmVyVmFyaWFibGVzTGlzdCA9IG1lLmlubmVyVmFyaWFibGVzTGlzdC5jb25jYXQoaW5uZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtZS5pbm5lclZhcmlhYmxlc0xpc3QgPSBfLnVuaXEobWUuaW5uZXJWYXJpYWJsZXNMaXN0KTtcblxuICAgICAgICAgICAgICAgIGlmICghbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0pIHtcbiAgICAgICAgICAgICAgICAgICAgbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWUudmFyaWFibGVMaXN0ZW5lck1hcFtwcm9wZXJ0eV0gPSBtZS52YXJpYWJsZUxpc3RlbmVyTWFwW3Byb3BlcnR5XS5jb25jYXQoZGF0YSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9LFxuICAgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24odmFyaWFibGUsIHRva2VuKSB7XG4gICAgICAgICAgICB0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXAgPSBfLnJlamVjdCh0aGlzLnZhcmlhYmxlTGlzdGVuZXJNYXAsIGZ1bmN0aW9uKHN1YnMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3Vicy5pZCA9PT0gdG9rZW47XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zdWJzY3JpYmVBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy52YXJpYWJsZUxpc3RlbmVyTWFwID0ge307XG4gICAgICAgICAgICB0aGlzLmlubmVyVmFyaWFibGVzTGlzdCA9IFtdO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgICQuZXh0ZW5kKHRoaXMsIHB1YmxpY0FQSSk7XG4gICAgdmFyIG1lID0gdGhpcztcbiAgICAkKHZlbnQpLm9uKCdkaXJ0eScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbWUucmVmcmVzaC5hcHBseShtZSwgYXJndW1lbnRzKTtcbiAgICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBhbGlhczogJ2knLFxuICAgIGNvbnZlcnQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZSwgMTApO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiB2YWwgKyAnJztcbiAgICB9LFxuXG4gICAgdXBwZXJDYXNlOiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiAodmFsICsgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgfSxcbiAgICBsb3dlckNhc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuICh2YWwgKyAnJykudG9Mb3dlckNhc2UoKTtcbiAgICB9LFxuICAgIHRpdGxlQ2FzZTogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YWwgPSB2YWwgKyAnJztcbiAgICAgICAgcmV0dXJuIHZhbC5yZXBsYWNlKC9cXHdcXFMqL2csIGZ1bmN0aW9uKHR4dCl7cmV0dXJuIHR4dC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHR4dC5zdWJzdHIoMSkudG9Mb3dlckNhc2UoKTt9KTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYWxpYXM6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIC8vVE9ETzogRmFuY3kgcmVnZXggdG8gbWF0Y2ggbnVtYmVyIGZvcm1hdHMgaGVyZVxuICAgICAgICByZXR1cm4gKG5hbWUuaW5kZXhPZignIycpICE9PSAtMSB8fCBuYW1lLmluZGV4T2YoJzAnKSAhPT0gLTEgKTtcbiAgICB9LFxuXG4gICAgcGFyc2U6IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFsKz0gJyc7XG4gICAgICAgIHZhciBpc05lZ2F0aXZlID0gdmFsLmNoYXJBdCgwKSA9PT0gJy0nO1xuXG4gICAgICAgIHZhbCAgPSB2YWwucmVwbGFjZSgvLC9nLCAnJyk7XG4gICAgICAgIHZhciBmbG9hdE1hdGNoZXIgPSAvKFstK10/WzAtOV0qXFwuP1swLTldKykoSz9NP0I/KS9pO1xuICAgICAgICB2YXIgcmVzdWx0cyA9IGZsb2F0TWF0Y2hlci5leGVjKHZhbCk7XG4gICAgICAgIHZhciBudW1iZXIsIHN1ZmZpeCA9ICcnO1xuICAgICAgICBpZihyZXN1bHRzICYmIHJlc3VsdHNbMV0pe1xuICAgICAgICAgICAgbnVtYmVyID0gcmVzdWx0c1sxXTtcbiAgICAgICAgfVxuICAgICAgICBpZihyZXN1bHRzICYmIHJlc3VsdHNbMl0pe1xuICAgICAgICAgICAgc3VmZml4ID0gcmVzdWx0c1syXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoKHN1ZmZpeCl7XG4gICAgICAgICAgICBjYXNlICdrJzpcbiAgICAgICAgICAgICAgICBudW1iZXIgPSBudW1iZXIgKiAxMDAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbSc6XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogMTAwMDAwMDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2InOlxuICAgICAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIDEwMDAwMDAwMDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbnVtYmVyID0gcGFyc2VGbG9hdChudW1iZXIpO1xuICAgICAgICBpZihpc05lZ2F0aXZlICYmIG51bWJlciA+IDApIHtcbiAgICAgICAgICAgIG51bWJlciA9IG51bWJlciAqIC0xO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudW1iZXI7XG4gICAgfSxcblxuICAgIGNvbnZlcnQ6IChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB2YXIgc2NhbGVzID0gWycnLCAnSycsICdNJywgJ0InLCAnVCddO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldERpZ2l0cyh2YWx1ZSwgZGlnaXRzKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID09PSAwID8gMCA6IHJvdW5kVG8odmFsdWUsIE1hdGgubWF4KDAsIGRpZ2l0cyAtIE1hdGguY2VpbChNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMTApKSk7XG5cbiAgICAgICAgICAgIHZhciBUWFQgPSAnJztcbiAgICAgICAgICAgIHZhciBudW1iZXJUWFQgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIGRlY2ltYWxTZXQgPSBmYWxzZTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaVRYVCA9IDA7IGlUWFQgPCBudW1iZXJUWFQubGVuZ3RoOyBpVFhUKyspIHtcbiAgICAgICAgICAgICAgICBUWFQgKz0gbnVtYmVyVFhULmNoYXJBdChpVFhUKTtcbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyVFhULmNoYXJBdChpVFhUKSA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlY2ltYWxTZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRpZ2l0cy0tO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChkaWdpdHMgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVFhUO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFkZWNpbWFsU2V0KSB7XG4gICAgICAgICAgICAgICAgVFhUICs9ICcuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChkaWdpdHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgVFhUICs9ICcwJztcbiAgICAgICAgICAgICAgICBkaWdpdHMtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBUWFQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGREZWNpbWFscyh2YWx1ZSwgZGVjaW1hbHMsIG1pbkRlY2ltYWxzLCBoYXNDb21tYXMpIHtcbiAgICAgICAgICAgIGhhc0NvbW1hcyA9IGhhc0NvbW1hcyB8fCB0cnVlO1xuICAgICAgICAgICAgdmFyIG51bWJlclRYVCA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICB2YXIgaGFzRGVjaW1hbHMgPSAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoID4gMSk7XG4gICAgICAgICAgICB2YXIgaURlYyA9IDA7XG5cbiAgICAgICAgICAgIGlmIChoYXNDb21tYXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpQ2hhciA9IG51bWJlclRYVC5sZW5ndGggLSAxOyBpQ2hhciA+IDA7IGlDaGFyLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0RlY2ltYWxzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNEZWNpbWFscyA9IChudW1iZXJUWFQuY2hhckF0KGlDaGFyKSAhPT0gJy4nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlEZWMgPSAoaURlYyArIDEpICUgMztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpRGVjID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUID0gbnVtYmVyVFhULnN1YnN0cigwLCBpQ2hhcikgKyAnLCcgKyBudW1iZXJUWFQuc3Vic3RyKGlDaGFyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRlY2ltYWxzID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciB0b0FERDtcbiAgICAgICAgICAgICAgICBpZiAobnVtYmVyVFhULnNwbGl0KCcuJykubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9BREQgPSBtaW5EZWNpbWFscztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyVFhUICs9ICcuJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRvQUREID0gbWluRGVjaW1hbHMgLSBudW1iZXJUWFQuc3BsaXQoJy4nKVsxXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRvQUREID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXJUWFQgKz0gJzAnO1xuICAgICAgICAgICAgICAgICAgICB0b0FERC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudW1iZXJUWFQ7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiByb3VuZFRvKHZhbHVlLCBkaWdpdHMpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlICogTWF0aC5wb3coMTAsIGRpZ2l0cykpIC8gTWF0aC5wb3coMTAsIGRpZ2l0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRTdWZmaXgoZm9ybWF0VFhUKSB7XG4gICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQucmVwbGFjZSgnLicsICcnKTtcbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgcmV0dXJuIChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGlzQ3VycmVuY3koc3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgcyA9ICQudHJpbShzdHJpbmcpO1xuXG4gICAgICAgICAgICBpZiAocyA9PT0gJyQnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqwnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqUnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8OCwqMnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawqEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ8Oi4oCawrEnIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ0vDhD8nIHx8XG4gICAgICAgICAgICAgICAgcyA9PT0gJ2tyJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDgsKiJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDouKAmsKqJyB8fFxuICAgICAgICAgICAgICAgIHMgPT09ICfDhuKAmScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqScgfHxcbiAgICAgICAgICAgICAgICBzID09PSAnw6LigJrCqycpIHtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmb3JtYXQobnVtYmVyLCBmb3JtYXRUWFQpIHtcbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhudW1iZXIpICYmICFfLmlzTnVtYmVyKG51bWJlcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVtYmVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZvcm1hdFRYVCB8fCBmb3JtYXRUWFQudG9Mb3dlckNhc2UoKSA9PT0gJ2RlZmF1bHQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bWJlci50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaXNOYU4obnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnPyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vdmFyIGZvcm1hdFRYVDtcbiAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5yZXBsYWNlKCcmZXVybzsnLCAnw6LigJrCrCcpO1xuXG4gICAgICAgICAgICAvLyBEaXZpZGUgKy8tIE51bWJlciBGb3JtYXRcbiAgICAgICAgICAgIHZhciBmb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCc7Jyk7XG4gICAgICAgICAgICBpZiAoZm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm1hdChNYXRoLmFicyhudW1iZXIpLCBmb3JtYXRzWygobnVtYmVyID49IDApID8gMCA6IDEpXSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgU2lnblxuICAgICAgICAgICAgdmFyIHNpZ24gPSAobnVtYmVyID49IDApID8gJycgOiAnLSc7XG4gICAgICAgICAgICBudW1iZXIgPSBNYXRoLmFicyhudW1iZXIpO1xuXG5cbiAgICAgICAgICAgIHZhciBsZWZ0T2ZEZWNpbWFsID0gZm9ybWF0VFhUO1xuICAgICAgICAgICAgdmFyIGQgPSBsZWZ0T2ZEZWNpbWFsLmluZGV4T2YoJy4nKTtcbiAgICAgICAgICAgIGlmIChkID4gLTEpIHtcbiAgICAgICAgICAgICAgICBsZWZ0T2ZEZWNpbWFsID0gbGVmdE9mRGVjaW1hbC5zdWJzdHJpbmcoMCwgZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBub3JtYWxpemVkID0gbGVmdE9mRGVjaW1hbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gbm9ybWFsaXplZC5sYXN0SW5kZXhPZigncycpO1xuICAgICAgICAgICAgdmFyIGlzU2hvcnRGb3JtYXQgPSBpbmRleCA+IC0xO1xuXG4gICAgICAgICAgICBpZiAoaXNTaG9ydEZvcm1hdCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXh0Q2hhciA9IGxlZnRPZkRlY2ltYWwuY2hhckF0KGluZGV4ICsgMSk7XG4gICAgICAgICAgICAgICAgaWYgKG5leHRDaGFyID09PSAnICcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNTaG9ydEZvcm1hdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGxlYWRpbmdUZXh0ID0gaXNTaG9ydEZvcm1hdCA/IGZvcm1hdFRYVC5zdWJzdHJpbmcoMCwgaW5kZXgpIDogJyc7XG4gICAgICAgICAgICB2YXIgcmlnaHRPZlByZWZpeCA9IGlzU2hvcnRGb3JtYXQgPyBmb3JtYXRUWFQuc3Vic3RyKGluZGV4ICsgMSkgOiBmb3JtYXRUWFQuc3Vic3RyKGluZGV4KTtcblxuICAgICAgICAgICAgLy9maXJzdCBjaGVjayB0byBtYWtlIHN1cmUgJ3MnIGlzIGFjdHVhbGx5IHNob3J0IGZvcm1hdCBhbmQgbm90IHBhcnQgb2Ygc29tZSBsZWFkaW5nIHRleHRcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNob3J0Rm9ybWF0VGVzdCA9IC9bMC05IypdLztcbiAgICAgICAgICAgICAgICB2YXIgc2hvcnRGb3JtYXRUZXN0UmVzdWx0ID0gcmlnaHRPZlByZWZpeC5tYXRjaChzaG9ydEZvcm1hdFRlc3QpO1xuICAgICAgICAgICAgICAgIGlmICghc2hvcnRGb3JtYXRUZXN0UmVzdWx0IHx8IHNob3J0Rm9ybWF0VGVzdFJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy9ubyBzaG9ydCBmb3JtYXQgY2hhcmFjdGVycyBzbyB0aGlzIG11c3QgYmUgbGVhZGluZyB0ZXh0IGllLiAnd2Vla3MgJ1xuICAgICAgICAgICAgICAgICAgICBpc1Nob3J0Rm9ybWF0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGxlYWRpbmdUZXh0ID0gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2lmIChmb3JtYXRUWFQuY2hhckF0KDApID09ICdzJylcbiAgICAgICAgICAgIGlmIChpc1Nob3J0Rm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbFNjYWxlID0gbnVtYmVyID09PSAwID8gMCA6IE1hdGguZmxvb3IoTWF0aC5sb2coTWF0aC5hYnMobnVtYmVyKSkgLyAoMyAqIE1hdGguTE4xMCkpO1xuICAgICAgICAgICAgICAgIHZhbFNjYWxlID0gKChudW1iZXIgLyBNYXRoLnBvdygxMCwgMyAqIHZhbFNjYWxlKSkgPCAxMDAwKSA/IHZhbFNjYWxlIDogKHZhbFNjYWxlICsgMSk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1heCh2YWxTY2FsZSwgMCk7XG4gICAgICAgICAgICAgICAgdmFsU2NhbGUgPSBNYXRoLm1pbih2YWxTY2FsZSwgNCk7XG4gICAgICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyIC8gTWF0aC5wb3coMTAsIDMgKiB2YWxTY2FsZSk7XG4gICAgICAgICAgICAgICAgLy9pZiAoIWlzTmFOKE51bWJlcihmb3JtYXRUWFQuc3Vic3RyKDEpICkgKSApXG5cbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKE51bWJlcihyaWdodE9mUHJlZml4KSkgJiYgcmlnaHRPZlByZWZpeC5pbmRleE9mKCcuJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsaW1pdERpZ2l0cyA9IE51bWJlcihyaWdodE9mUHJlZml4KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bWJlciA8IE1hdGgucG93KDEwLCBsaW1pdERpZ2l0cykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsZWFkaW5nVGV4dCArIHNpZ24gKyBnZXREaWdpdHMobnVtYmVyLCBOdW1iZXIocmlnaHRPZlByZWZpeCkpICsgc2NhbGVzW3ZhbFNjYWxlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0N1cnJlbmN5KGxlYWRpbmdUZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzaWduICsgbGVhZGluZ1RleHQgKyBNYXRoLnJvdW5kKG51bWJlcikgKyBzY2FsZXNbdmFsU2NhbGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxlYWRpbmdUZXh0ICsgc2lnbiArIE1hdGgucm91bmQobnVtYmVyKSArIHNjYWxlc1t2YWxTY2FsZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2Zvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IGZvcm1hdFRYVC5zdWJzdHIoaW5kZXggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIFNVRkZJWCA9IGdldFN1ZmZpeChmb3JtYXRUWFQpO1xuICAgICAgICAgICAgICAgICAgICBmb3JtYXRUWFQgPSBmb3JtYXRUWFQuc3Vic3RyKDAsIGZvcm1hdFRYVC5sZW5ndGggLSBTVUZGSVgubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsV2l0aG91dExlYWRpbmcgPSBmb3JtYXQoKChzaWduID09PSAnJykgPyAxIDogLTEpICogbnVtYmVyLCBmb3JtYXRUWFQpICsgc2NhbGVzW3ZhbFNjYWxlXSArIFNVRkZJWDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ3VycmVuY3kobGVhZGluZ1RleHQpICYmIHNpZ24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxXaXRob3V0TGVhZGluZyA9IHZhbFdpdGhvdXRMZWFkaW5nLnN1YnN0cihzaWduLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2lnbiArIGxlYWRpbmdUZXh0ICsgdmFsV2l0aG91dExlYWRpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGVhZGluZ1RleHQgKyB2YWxXaXRob3V0TGVhZGluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzdWJGb3JtYXRzID0gZm9ybWF0VFhULnNwbGl0KCcuJyk7XG4gICAgICAgICAgICB2YXIgZGVjaW1hbHM7XG4gICAgICAgICAgICB2YXIgbWluRGVjaW1hbHM7XG4gICAgICAgICAgICBpZiAoc3ViRm9ybWF0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgZGVjaW1hbHMgPSBzdWJGb3JtYXRzWzFdLmxlbmd0aCAtIHN1YkZvcm1hdHNbMV0ucmVwbGFjZShuZXcgUmVnRXhwKCdbMHwjXSsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIG1pbkRlY2ltYWxzID0gc3ViRm9ybWF0c1sxXS5sZW5ndGggLSBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnMCsnLCAnZycpLCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvcm1hdFRYVCA9IHN1YkZvcm1hdHNbMF0gKyBzdWJGb3JtYXRzWzFdLnJlcGxhY2UobmV3IFJlZ0V4cCgnWzB8I10rJywgJ2cnKSwgJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWNpbWFscyA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmaXhlc1RYVCA9IGZvcm1hdFRYVC5zcGxpdChuZXcgUmVnRXhwKCdbMHwsfCNdKycsICdnJykpO1xuICAgICAgICAgICAgdmFyIHByZWZmaXggPSBmaXhlc1RYVFswXS50b1N0cmluZygpO1xuICAgICAgICAgICAgdmFyIHN1ZmZpeCA9IChmaXhlc1RYVC5sZW5ndGggPiAxKSA/IGZpeGVzVFhUWzFdLnRvU3RyaW5nKCkgOiAnJztcblxuICAgICAgICAgICAgbnVtYmVyID0gbnVtYmVyICogKChmb3JtYXRUWFQuc3BsaXQoJyUnKS5sZW5ndGggPiAxKSA/IDEwMCA6IDEpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICBpZihmb3JtYXRUWFQuaW5kZXhPZignJScpICE9PSAtMSkgbnVtYmVyID0gbnVtYmVyICogMTAwO1xuICAgICAgICAgICAgbnVtYmVyID0gcm91bmRUbyhudW1iZXIsIGRlY2ltYWxzKTtcblxuICAgICAgICAgICAgc2lnbiA9IChudW1iZXIgPT09IDApID8gJycgOiBzaWduO1xuXG4gICAgICAgICAgICB2YXIgaGFzQ29tbWFzID0gKGZvcm1hdFRYVC5zdWJzdHIoZm9ybWF0VFhULmxlbmd0aCAtIDQgLSBzdWZmaXgubGVuZ3RoLCAxKSA9PT0gJywnKTtcbiAgICAgICAgICAgIHZhciBmb3JtYXR0ZWQgPSBzaWduICsgcHJlZmZpeCArIGFkZERlY2ltYWxzKG51bWJlciwgZGVjaW1hbHMsIG1pbkRlY2ltYWxzLCBoYXNDb21tYXMpICsgc3VmZml4O1xuXG4gICAgICAgICAgICAvLyAgY29uc29sZS5sb2cob3JpZ2luYWxOdW1iZXIsIG9yaWdpbmFsRm9ybWF0LCBmb3JtYXR0ZWQpXG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1hdDtcbiAgICB9KCkpXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBBdHRyaWJ1dGVzIHdoaWNoIGFyZSBqdXN0IHBhcmFtZXRlcnMgdG8gb3RoZXJzIGFuZCBjYW4ganVzdCBiZSBpZ25vcmVkXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogL14oPzptb2RlbHxjb252ZXJ0KSQvaSxcblxuICAgIGhhbmRsZTogJC5ub29wLFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJyonLFxuXG4gICAgdGVzdDogZnVuY3Rpb24gKGF0dHIsICRub2RlKSB7XG4gICAgICAgIHJldHVybiAoYXR0ci5pbmRleE9mKCdvbi1pbml0JykgPT09IDApO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbihhdHRyLCB2YWx1ZSkge1xuICAgICAgICBhdHRyID0gYXR0ci5yZXBsYWNlKCdvbi1pbml0JywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICAkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBmbk5hbWUgPSB2YWx1ZS5zcGxpdCgnKCcpWzBdO1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHZhbHVlLnN1YnN0cmluZyh2YWx1ZS5pbmRleE9mKCcoJykgKyAxLCB2YWx1ZS5pbmRleE9mKCcpJykpLnNwbGl0KCcsJyk7XG4gICAgICAgICAgICB2YXIgYXJncyA9ICgkLnRyaW0ocGFyYW1zKSAhPT0gJycpID8gcGFyYW1zLnNwbGl0KCcsJykgOiBbXTtcblxuICAgICAgICAgICAgbWUudHJpZ2dlcignZi51aS5vcGVyYXRlJywge2ZuOiBmbk5hbWUsIGFyZ3M6IGFyZ3N9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy9Eb24ndCBib3RoZXIgYmluZGluZyBvbiB0aGlzIGF0dHIuIE5PVEU6IERvIHJlYWRvbmx5LCB0cnVlIGluc3RlYWQ/O1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiBmdW5jdGlvbiAoYXR0ciwgJG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIChhdHRyLmluZGV4T2YoJ29uLScpID09PSAwKTtcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24oYXR0ciwgdmFsdWUpIHtcbiAgICAgICAgYXR0ciA9IGF0dHIucmVwbGFjZSgnb24tJywgJycpO1xuICAgICAgICB2YXIgbWUgPSB0aGlzO1xuICAgICAgICB0aGlzLm9uKGF0dHIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGZuTmFtZSA9IHZhbHVlLnNwbGl0KCcoJylbMF07XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0gdmFsdWUuc3Vic3RyaW5nKHZhbHVlLmluZGV4T2YoJygnKSArIDEsIHZhbHVlLmluZGV4T2YoJyknKSk7XG4gICAgICAgICAgICB2YXIgYXJncyA9ICgkLnRyaW0ocGFyYW1zKSAhPT0gJycpID8gcGFyYW1zLnNwbGl0KCcsJykgOiBbXTtcbiAgICAgICAgICAgIG1lLnRyaWdnZXIoJ2YudWkub3BlcmF0ZScsIHtmbjogZm5OYW1lLCBhcmdzOiBhcmdzfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7IC8vRG9uJ3QgYm90aGVyIGJpbmRpbmcgb24gdGhpcyBhdHRyLiBOT1RFOiBEbyByZWFkb25seSwgdHJ1ZSBpbnN0ZWFkPztcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRhcmdldDogJzpjaGVja2JveCw6cmFkaW8nLFxuXG4gICAgdGVzdDogJ2JpbmQnLFxuXG4gICAgaGFuZGxlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHNldHRhYmxlVmFsdWUgPSB0aGlzLmF0dHIoJ3ZhbHVlJyk7IC8vaW5pdGlhbCB2YWx1ZVxuICAgICAgICAvKmpzbGludCBlcWVxOiB0cnVlKi9cbiAgICAgICAgdmFyIGlzQ2hlY2tlZCA9IChzZXR0YWJsZVZhbHVlICE9PSB1bmRlZmluZWQpID8gKHNldHRhYmxlVmFsdWUgPT0gdmFsdWUpIDogISF2YWx1ZTtcbiAgICAgICAgdGhpcy5wcm9wKCdjaGVja2VkJywgaXNDaGVja2VkKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0YXJnZXQ6ICdpbnB1dCwgc2VsZWN0JyxcblxuICAgIHRlc3Q6ICdiaW5kJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMudmFsKHZhbHVlKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHRlc3Q6ICdjbGFzcycsXG5cbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIGhhbmRsZTogZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcbiAgICAgICAgdmFyIGFkZGVkQ2xhc3NlcyA9IHRoaXMuZGF0YSgnYWRkZWQtY2xhc3NlcycpO1xuICAgICAgICBpZiAoIWFkZGVkQ2xhc3Nlcykge1xuICAgICAgICAgICAgYWRkZWRDbGFzc2VzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFkZGVkQ2xhc3Nlc1twcm9wXSkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDbGFzcyhhZGRlZENsYXNzZXNbcHJvcF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF8uaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICd2YWx1ZS0nICsgdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgYWRkZWRDbGFzc2VzW3Byb3BdID0gdmFsdWU7XG4gICAgICAgIC8vRml4bWU6IHByb3AgaXMgYWx3YXlzIFwiY2xhc3NcIlxuICAgICAgICB0aGlzLmFkZENsYXNzKHZhbHVlKTtcbiAgICAgICAgdGhpcy5kYXRhKCdhZGRlZC1jbGFzc2VzJywgYWRkZWRDbGFzc2VzKTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0YXJnZXQ6ICcqJyxcblxuICAgIHRlc3Q6IC9eKD86Y2hlY2tlZHxzZWxlY3RlZHxhc3luY3xhdXRvZm9jdXN8YXV0b3BsYXl8Y29udHJvbHN8ZGVmZXJ8aXNtYXB8bG9vcHxtdWx0aXBsZXxvcGVufHJlcXVpcmVkfHNjb3BlZCkkL2ksXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIC8qanNsaW50IGVxZXE6IHRydWUqL1xuICAgICAgICB2YXIgdmFsID0gKHRoaXMuYXR0cigndmFsdWUnKSkgPyAodmFsdWUgPT0gdGhpcy5wcm9wKCd2YWx1ZScpKSA6ICEhdmFsdWU7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWwpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAvXig/OmRpc2FibGVkfGhpZGRlbnxyZWFkb25seSkkL2ksXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCAhdmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICB0ZXN0OiAnYmluZCcsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmh0bWwodmFsdWUpO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgdGVzdDogJyonLFxuXG4gICAgdGFyZ2V0OiAnKicsXG5cbiAgICBoYW5kbGU6IGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XG4gICAgICAgIHRoaXMucHJvcChwcm9wLCB2YWx1ZSk7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1pbnB1dC1ub2RlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKCB7XG5cbiAgICBwcm9wZXJ0eUhhbmRsZXJzIDogW1xuXG4gICAgXSxcblxuICAgIGdldFVJVmFsdWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlbCA9IHRoaXMuJGVsO1xuICAgICAgICAvL1RPRE86IGZpbGUgYSBpc3N1ZSBmb3IgdGhlIHZlbnNpbSBtYW5hZ2VyIHRvIGNvbnZlcnQgdHJ1ZXMgdG8gMXMgYW5kIHNldCB0aGlzIHRvIHRydWUgYW5kIGZhbHNlXG5cbiAgICAgICAgdmFyIG9mZlZhbCA9ICAoJGVsLmRhdGEoJ2Ytb2ZmJykgIT09IHVuZGVmaW5lZCApID8gJGVsLmRhdGEoJ2Ytb2ZmJykgOiAwO1xuICAgICAgICAvL2F0dHIgPSBpbml0aWFsIHZhbHVlLCBwcm9wID0gY3VycmVudCB2YWx1ZVxuICAgICAgICB2YXIgb25WYWwgPSAoJGVsLmF0dHIoJ3ZhbHVlJykgIT09IHVuZGVmaW5lZCApID8gJGVsLnByb3AoJ3ZhbHVlJyk6IDE7XG5cbiAgICAgICAgdmFyIHZhbCA9ICgkZWwuaXMoJzpjaGVja2VkJykpID8gb25WYWwgOiBvZmZWYWw7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgfSxcbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEJhc2VWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSwge3NlbGVjdG9yOiAnOmNoZWNrYm94LDpyYWRpbyd9KTtcbiIsIid1c2Ugc3RyaWN0JztcbnZhciBjb25maWcgPSByZXF1aXJlKCcuLi8uLi9jb25maWcnKTtcbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vZGVmYXVsdC1ub2RlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZVZpZXcuZXh0ZW5kKCB7XG4gICAgcHJvcGVydHlIYW5kbGVycyA6IFtdLFxuXG4gICAgdWlDaGFuZ2VFdmVudDogJ2NoYW5nZScsXG4gICAgZ2V0VUlWYWx1ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy4kZWwudmFsKCk7XG4gICAgfSxcblxuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgdGhpcy4kZWwub24odGhpcy51aUNoYW5nZUV2ZW50LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdmFsID0gbWUuZ2V0VUlWYWx1ZSgpO1xuICAgICAgICAgICAgdmFyIHByb3BOYW1lID0gbWUuJGVsLmRhdGEoY29uZmlnLmJpbmRlckF0dHIpO1xuXG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXNbcHJvcE5hbWVdID0gdmFsO1xuXG4gICAgICAgICAgICBtZS4kZWwudHJpZ2dlcihjb25maWcuZXZlbnRzLnRyaWdnZXIsIHBhcmFtcyk7XG4gICAgICAgIH0pO1xuICAgICAgICBCYXNlVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0sIHtzZWxlY3RvcjogJ2lucHV0LCBzZWxlY3QnfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBCYXNlVmlldyA9IHJlcXVpcmUoJy4vYmFzZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhc2VWaWV3LmV4dGVuZCgge1xuICAgIHByb3BlcnR5SGFuZGxlcnMgOiBbXG5cbiAgICBdLFxuXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgIH1cbn0sIHtzZWxlY3RvcjogJyonfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBleHRlbmQgPSBmdW5jdGlvbihwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzO1xuICAgIHZhciBjaGlsZDtcblxuICAgIC8vIFRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIG5ldyBzdWJjbGFzcyBpcyBlaXRoZXIgZGVmaW5lZCBieSB5b3VcbiAgICAvLyAodGhlIFwiY29uc3RydWN0b3JcIiBwcm9wZXJ0eSBpbiB5b3VyIGBleHRlbmRgIGRlZmluaXRpb24pLCBvciBkZWZhdWx0ZWRcbiAgICAvLyBieSB1cyB0byBzaW1wbHkgY2FsbCB0aGUgcGFyZW50J3MgY29uc3RydWN0b3IuXG4gICAgaWYgKHByb3RvUHJvcHMgJiYgXy5oYXMocHJvdG9Qcm9wcywgJ2NvbnN0cnVjdG9yJykpIHtcbiAgICAgICAgY2hpbGQgPSBwcm90b1Byb3BzLmNvbnN0cnVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNoaWxkID0gZnVuY3Rpb24oKXsgcmV0dXJuIHBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpOyB9O1xuICAgIH1cblxuICAgIC8vIEFkZCBzdGF0aWMgcHJvcGVydGllcyB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24sIGlmIHN1cHBsaWVkLlxuICAgIF8uZXh0ZW5kKGNoaWxkLCBwYXJlbnQsIHN0YXRpY1Byb3BzKTtcblxuICAgIC8vIFNldCB0aGUgcHJvdG90eXBlIGNoYWluIHRvIGluaGVyaXQgZnJvbSBgcGFyZW50YCwgd2l0aG91dCBjYWxsaW5nXG4gICAgLy8gYHBhcmVudGAncyBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICB2YXIgU3Vycm9nYXRlID0gZnVuY3Rpb24oKXsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9O1xuICAgIFN1cnJvZ2F0ZS5wcm90b3R5cGUgPSBwYXJlbnQucHJvdG90eXBlO1xuICAgIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBTdXJyb2dhdGUoKTtcblxuICAgIC8vIEFkZCBwcm90b3R5cGUgcHJvcGVydGllcyAoaW5zdGFuY2UgcHJvcGVydGllcykgdG8gdGhlIHN1YmNsYXNzLFxuICAgIC8vIGlmIHN1cHBsaWVkLlxuICAgIGlmIChwcm90b1Byb3BzKSB7XG4gICAgICAgIF8uZXh0ZW5kKGNoaWxkLnByb3RvdHlwZSwgcHJvdG9Qcm9wcyk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGEgY29udmVuaWVuY2UgcHJvcGVydHkgaW4gY2FzZSB0aGUgcGFyZW50J3MgcHJvdG90eXBlIGlzIG5lZWRlZFxuICAgIC8vIGxhdGVyLlxuICAgIGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7XG5cbiAgICByZXR1cm4gY2hpbGQ7XG59O1xuXG52YXIgVmlldyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbCA9ICQob3B0aW9ucy5lbCk7XG4gICAgdGhpcy5lbCA9IG9wdGlvbnMuZWw7XG4gICAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbn07XG5cbl8uZXh0ZW5kKFZpZXcucHJvdG90eXBlLCB7XG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKXt9LFxufSk7XG5cblZpZXcuZXh0ZW5kID0gZXh0ZW5kO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG4iXX0=
;