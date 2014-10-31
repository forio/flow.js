'use strict';

module.exports = function (config) {
    if (!config) {
        config = {};
    }
    var run = config.run;
    var vent = config.vent;

    var publicAPI = {
        listenerMap: {},

        //Check for updates
        refresh: function (operation,response) {
            // var DIRTY_OPERATIONS = ['start_game', 'initialize', 'step'];
            // if (_.contains(DIRTY_OPERATIONS, operation)) {
            $(vent).trigger('dirty', { opn: operation, response: response });
            // }
        },

        /**
         * Operation name & parameters to send to operations API
         * @param  {string | object} operation Name of Operation. If array, needs to be in {operations: [{name: opn, params:[]}], serial: boolean}] format
         * @param  {*} params (optional)   params to send to opertaion
         * @return {$promise}
         */
        publish: function (operation, params) {
            var me = this;
            if (operation.operations) {
                var fn = (operation.serial) ? run.serial : run.parallel;
                return fn.call(run, operation.operations)
                        .then(function (response) {
                            me.refresh.call(me, _(operation.operations).pluck('name'), response);
                        });
            } else {
                //TODO: check if interpolated
                return run.do.apply(run, arguments)
                    .then(function (response) {
                        me.refresh.call(me, operation, response);
                    });
            }
            // console.log('operations publish', operation, params);
        },

        subscribe: function (operations, subscriber) {
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
            $.each(operations, function (index, opn) {
                me.listenerMap[opn] = me.listenerMap[opn].concat(data);
            });

            return id;
        },
        unsubscribe: function (variable, token) {
            this.listenerMap = _.reject(this.listenerMap, function (subs) {
                return subs.id === token;
            });
        },
        unsubscribeAll: function () {
            this.listenerMap = [];
        }
    };
    return $.extend(this, publicAPI);
};
