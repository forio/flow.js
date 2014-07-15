'use strict';

module.exports = function(config) {
    if (!config) {
        config = {};
    }
    var vs = config.variables;


    var currentData = {};

    var isEqual = function(a, b) {
        return a === b;
    };

    var getInnerVariables = function(str) {
        var inner = str.match(/<(.*?)>/g);
        inner = _.map(inner, function(val){
            return val.substring(1, val.length - 1);
        });
        return inner;
    };

    var interpolate = function(variablesToInterpolate, values) {
        var interpolationMap = {};
        var interpolated = {};

        _.each(variablesToInterpolate, function (val, outerVariable) {
            var inner = getInnerVariables(outerVariable);
            var originalOuter = outerVariable;
            $.each(inner, function(index, innerVariable) {
                if (values[innerVariable]) {
                    outerVariable = outerVariable.replace('<' + innerVariable + '>', values[innerVariable]);
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
                    // _(variables).each(function(vname) {
                    //     var oldValue = currentData[vname];
                    //     if (!isEqual(variables[vname], oldValue)) {
                    //         currentData[vname] = variables[vname];

                    //         var vn = (ip && ip[vname]) ? ip[vname] : vname;
                    //         me.updateListeners(vn, variables[vname]);
                    //     }
                    // });
                });
            };
            if (me.innerVariablesList.length) {
                return vs.query(me.innerVariablesList).then(function (innerVariables) {
                    var ip =  interpolate(me.variableListenerMap, innerVariables);
                    var outer = _.keys(ip.interpolated);
                    getVariables(outer, ip.interpolationMap);
                });
            }
            else {
                return getVariables(_.keys(me.variableListenerMap));
            }

        },

        publish: function(variable, value) {
            //TODO: check if interpolated
            var attrs;
            if ($.isPlainObject(variable)) {
                attrs = variable;
            } else {
                (attrs = {})[variable] = value;
            }

            var args = arguments;
            var me = this;
            vs.save.apply(vs, args)
                .then(function () {
                    me.refresh.call(me);
                });
        },

        subscribe: function(properties, subscriber) {
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
    return $.extend(this, publicAPI);
};
