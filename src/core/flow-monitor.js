var config = require('../config');

module.exports = (function() {
    'use strict';

    var rs = new F.service.Run({
        account: 'nranjit',
        project: 'sales_forecaster',
    });
    // var vs = rs.variables();

    var created = false;
    var variableListenerMap = {};
    var currentData = {};

    var isEqual = function(a, b) {
        return a === b;
    };


    var initRun = function() {
        var $d = $.Deferred();

        rs.create({model: 'pdasim.vmf'}).then(function () {
            rs.do('start_game').then(function () {
                $d.resolve();
            });
        });

        return $d.promise();
    };

    var publicAPI = {

        populate: function() {
            var me = this;
            var updateNow = function() {
                // $.each(variableListenerMap, function(pro) {};)
                var variableNames = _.keys(variableListenerMap);
                rs.variables().query(variableNames).then(function(variables) {
                    console.log('Got variables', variables);
                    _(variables).each(function(vname) {
                        var oldValue = currentData[vname];
                        if (!isEqual(variables[vname], oldValue)) {
                            currentData[vname] = variables[vname];

                            me.updateListeners(vname, variables[vname]);
                        }
                    });
                });
            };

            if (created) {
                updateNow();
            }
            else {
                initRun().then(updateNow);
            }
        },

        /**
         * @param  {String} property Model property to listen for changes on
         * @param  {Object|function} target If provided an object, it triggers a 'changed.flow' event on it. If a function, executes it when the property changes
         */
        bind: function(properties, target) {
            var me = this;
            this.bindOneWay.apply(this, arguments);
            $(target).on(config.events.trigger, function(evt, data) {
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

            $(target).on('f.ui.operate', function(evt, operation, data) {
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

            $.each(properties, function(index, property) {
                if (!variableListenerMap[property]) {
                    variableListenerMap[property] = [];
                }
                variableListenerMap[property] = variableListenerMap[property].concat(target);
            });
        },
        /**
         * @param  {String} property Model property to stop listening to
         * @param  {Object|function} context  The original context passed to bind
         */
        unbind: function() {

        },

        updateListeners: function(variable, value) {
            var listeners  = variableListenerMap[variable];

            var params = {};
            params[variable] = value;

            $.each(listeners, function(index, listener){
                listener.trigger.call(listener, config.events.react, params);
            });
        }
    };

    return publicAPI;
}());
