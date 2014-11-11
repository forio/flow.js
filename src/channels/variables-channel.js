'use strict';
var config = require('../config');

module.exports = function (options) {
    var defaults = {
        silent: {
            /**
             * Exclude the following variables from triggering a refresh operation
             * @type {Array} List of variable names to exclude
             */
            on: [],

            /**
             * Determine when to trigger the refresh event. This is useful if you know before-hand which variables need to update dependencies in the UI
             * @type {String | Array }  Possible options are
             *       - all: Trigger a refresh when any variable changes
             *       - none: Never trigger a refresh
             *       - variableName: trigger a refresh when specific variable changes
             *       - [variableNames..]: trigger a refresh when the following variables change
             */
            except: 'all'
        }
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
        refresh: function (changeObj) {
            var me = this;
            var silenceBlacklist = channelOptions.silent.except;
            var silenceWhitelist = channelOptions.silent.on;

            var changedVariables = _.keys(changeObj);
            var isStringRefreshMatch = changedVariables && _.isString(silenceBlacklist) && _.contains(changedVariables, silenceBlacklist);
            var isArrayRefreshMatch = changedVariables && _.isArray(silenceBlacklist) && _.intersection(silenceBlacklist, changedVariables).length >= 1;

            var isExcluded = changeObj && (_.intersection(silenceWhitelist, changedVariables).length === changedVariables.length);
            var needsRefresh = (!isExcluded && (silenceBlacklist === 'all' || isStringRefreshMatch || isArrayRefreshMatch));

            if (!needsRefresh) {
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
    $(vent).on('dirty', function () {
        me.refresh.call(me);
    });
};
