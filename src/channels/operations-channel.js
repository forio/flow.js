'use strict';

module.exports = function(config) {
    if (!config) {
        config = {};
    }
    var run = config.run;


    var publicAPI = {
        listenerMap: {},

        //Check for updates
        refresh: function() {

        },

        publish: function(operation, params) {
            console.log('operations publish', operation, params);

            //TODO: check if interpolated
            var me = this;
            run.do.apply(run, arguments)
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
