var config = require('../config');

module.exports = function() {
    'use strict';

    var rs = new F.service.Run();
    var vs = rs.variables();

    var listeners = {};
    var currentData;

    var isEqual = function(a, b) {
        return a === b;
    };

    var updateAllListeners = function() {
        // $.each(listeners, function(pro) {};)
        var variableNames = _.keys(listeners);
        rs.variables.query(variableNames).then(function(variables) {
            console.log('Got variables', variables);
            _(variables).each(function(vname) {
                var oldValue = currentData[vname];
                if (isEqual(variables[vname], oldValue)) {
                    currentData[vname] = variables[vname];

                    //let all listeners know
                    $(listeners).each(function(target) {
                        var fn = (target.trigger) ? target.trigger : $(target).trigger;
                        fn(config.event.react, vname, variables[vname]);
                    });
                }
            });
        });
    };

    var publicAPI = {

        /**
         * @param  {String} property Model property to listen for changes on
         * @param  {Object|function} target If provided an object, it triggers a 'changed.flow' event on it. If a function, executes it when the property changes
         */
        bind: function(property, target) {
            if (!listeners[property]) {
                listeners[property] = [];
            }
            listeners[property].push(target);

            $(target).on(config.events.trigger, function(modelVar, value) {
                if (rs.id) {
                    vs.save(modelVar).then(updateAllListeners);
                }
                else {
                    rs.create().then(function() {
                        rs.variables().save(modelVar).then(updateAllListeners);
                    });
                }
            });
        },

        /**
         * @param  {String} property Model property to stop listening to
         * @param  {Object|function} context  The original context passed to bind
         */
        unbind: function() {

        },
    };

    return publicAPI;
};
