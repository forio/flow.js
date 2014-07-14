var config = require('../config');

module.exports = (function() {
    'use strict';

    var rs = new F.service.Run({
        account: 'nranjit',
        project: 'sales_forecaster',
    });
    // var vs = rs.variables();

    var created = false;

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


    var initRun = function() {
        return rs.create({model: 'pdasim.vmf'});
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


        populate: function() {
            var me = this;
            var updateNow = function() {
                // $.each(variableListenerMap, function(pro) {};)
                var vs = rs.variables();

                if (this.innerVariablesList.length) {
                    vs.query(this.innerVariablesList).then(function (innerVariables) {
                        var ip =  interpolate(me.variableListenerMap, innerVariables);
                        var outer = _.keys(ip.interpolated);
                        vs.query(outer).then(function(variables) {
                            console.log('Got variables', variables);
                            _(variables).each(function(vname) {
                                var oldValue = currentData[vname];
                                if (!isEqual(variables[vname], oldValue)) {
                                    currentData[vname] = variables[vname];

                                    var vn =  (ip[vname]) ? ip[vname] : vname;
                                    me.updateListeners(vn, variables[vname]);
                                }
                            });
                        });
                    });
                }
            };

            if (created) {
                updateNow();
            }
            else {
                initRun().then(updateNow);
            }
        },

        /**
         * @param  {String| Array} property Model property to listen for changes on
         * @param  {Object|function} target If provided an object, it triggers a 'changed.flow' event on it. If a function, executes it when the property changes
         */
        bind: function(properties, target) {
            var me = this;

            //use jquery to make event sink
            if (!target.on) {
                target = $(target);
            }
            this.bindOneWay.call(this, properties, target);

            //Assume you won't be setting variables before calling any init functions
            target.on(config.events.trigger, function(evt, data) {
                if (created) {
                    rs.variables().save(data).then(me.populate);
                }
                else {
                    initRun()
                    .then(function() {
                        created = true;
                        rs.variables().save(data)
                        .then(me.populate);
                    });
                }
            });

            target.on('f.ui.operate', function(evt, operation, data) {
                console.log(arguments);
                // initRun()
                // .then(function() {
                //     rs
                //     .do(operation, data)
                //     .then(me.populate);
                // });
            });
        },

        bindOneWay: function(properties, target) {
            properties = [].concat(properties);
            //use jquery to make event sink
            if (!target.on) {
                target = $(target);
            }

            var me = this;
            $.each(properties, function(index, property) {
                var inner = getInnerVariables(property);
                if (inner.length) {
                    me.innerVariablesList = me.innerVariablesList.concat(inner);
                }

                if (!me.variableListenerMap[property]) {
                    me.variableListenerMap[property] = [];
                }
                me.variableListenerMap[property] = me.variableListenerMap[property].concat(target);
            });
        },
        /**
         * @param  {String} property Model property to stop listening to
         * @param  {Object|function} context  The original context passed to bind
         */
        unbind: function(property, context) {
            var listeners = this.variableListenerMap[property];
            $.each(listeners, function(index, listener) {
                if (!context || (context && isEqual(listener, context))) {
                    //TODO: need to actually make isequal work
                    listener.off('f.ui.operate');
                    listener.off(config.events.trigger);

                    listeners.splice(index, 1);
                    return false;
                }
            });
        },

        unbindAll: function() {
            _.each(this.variableListenerMap, function(listeners, variable) {
                _.each(listeners, function(listener) {
                    listener.off('f.ui.operate');
                    listener.off(config.events.trigger);
                });
            });
            this.variableListenerMap = {};
            this.innerVariablesList = [];
        },

        updateListeners: function(variable, value) {
            var listeners  = this.variableListenerMap[variable];

            var params = {};
            params[variable] = value;

            $.each(listeners, function(index, listener){
                listener.trigger.call(listener, config.events.react, params);
            });
        }
    };

    return publicAPI;
}());
