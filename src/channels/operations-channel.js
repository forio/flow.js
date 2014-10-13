'use strict';

module.exports = function(options) {
    var defaults = {
        refresh: {
            /**
             * Determine when to trigger the refresh event. This is useful if you know before-hand which operations need to update dependencies in the UI
             * @type {String | Array }  Possible options are
             *       - all: Trigger a refresh on any operation
             *       - none: Never trigger a refresh
             *       - operationName: trigger a refresh on a specific operation
             *       - [operations..]: trigger a refresh when the following opertions happen
             */

            on: 'all',

            /**
             * Exclude the following variables from triggering a refresh operation
             * @type {Array} List of variable names to exclude
             */
            except: []
        }
    };

    var channelOptions = $.extend(true, {}, defaults, options);
    var run = channelOptions.run;
    var vent = channelOptions.vent;

    var publicAPI = {
        listenerMap: {},

        //Check for updates
        refresh: function(operation,response) {
            var refreshOn = channelOptions.refresh.on;

            var isStringRefreshMatch = operation && _.isString(refreshOn) && refreshOn === operation;
            var isArrayRefreshMatch = operation && _.isArray(refreshOn) && _.contains(refreshOn, operation);
            var isExcluded = operation && _.contains(refreshOn.exclude, operation);
            var needsRefresh = (!isExcluded && (refreshOn === 'all' || isStringRefreshMatch || isArrayRefreshMatch));

            if (needsRefresh) {
                $(vent).trigger('dirty', {opn: operation, response: response});
            }
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
                if (!me.listenerMap[opn]) {
                    me.listenerMap[opn] = [];
                }
                me.listenerMap[opn] = me.listenerMap[opn].concat(data);
            });

            return id;
        },
        unsubscribe: function(operation, token) {
            this.listenerMap[operation] = _.reject(this.listenerMap[operation], function(subs) {
                return subs.id === token;
            });
        },
        unsubscribeAll: function() {
            this.listenerMap = [];
        }
    };
    return $.extend(this, publicAPI);
};
