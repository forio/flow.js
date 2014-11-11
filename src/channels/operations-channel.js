'use strict';

module.exports = function (options) {
    var defaults = {
        silent: {
            /**
             * Determine when to trigger the refresh event. This is useful if you know before-hand which operations need to update dependencies in the UI
             * @type {String | Array }  Possible options are
             *       - all: Trigger a refresh on any operation
             *       - none: Never trigger a refresh
             *       - operationName: trigger a refresh on a specific operation
             *       - [operations..]: trigger a refresh when the following opertions happen
             */
            except: 'all',

            /**
             * Exclude the following variables from triggering a refresh operation
             * @type {Array} List of variable names to exclude
             */
            on: []
        }
    };

    var channelOptions = $.extend(true, {}, defaults, options);
    var run = channelOptions.run;
    var vent = channelOptions.vent;

    var publicAPI = {
        //for testing
        private: {
            options: channelOptions
        },

        listenerMap: {},

        //Check for updates
        /**
         * Triggers update on sibling variables channel
         * @param  {string|array} executedOpns operations which just happened
         * @param  {*} response  response from the operation
         */
        refresh: function (executedOpns, response) {
            var silenceBlacklist = channelOptions.silent.except;
            var silenceWhitelist = [].concat(channelOptions.silent.on);

            var isStringRefreshMatch = executedOpns && _.isString(silenceBlacklist) && _.contains(executedOpns, silenceBlacklist);
            var isArrayRefreshMatch = executedOpns && _.isArray(silenceBlacklist) && _.intersection(silenceBlacklist, executedOpns).length >= 1;

            var isExcluded = executedOpns && (_.intersection(silenceWhitelist, executedOpns).length === executedOpns.length);
            var needsRefresh = (!isExcluded && (silenceBlacklist === 'all' || isStringRefreshMatch || isArrayRefreshMatch));

            if (needsRefresh) {
                $(vent).trigger('dirty', { opn: executedOpns, response: response });
            }
        },

        /**
         * Operation name & parameters to send to operations API
         * @param  {string | object} operation Name of Operation. If array, needs to be in {operations: [{name: opn, params:[]}], serial: boolean}] format
         * @param  {*} params (optional)   params to send to opertaion
         * @param {option} options Supported options: {silent: Boolean}
         * @return {$promise}
         */
        publish: function (operation, params, options) {
            var me = this;
            if ($.isPlainObject(operation) && operation.operations) {
                var fn = (operation.serial) ? run.serial : run.parallel;
                return fn.call(run, operation.operations)
                        .then(function (response) {
                            if (!params || !params.silent) {
                                me.refresh.call(me, _(operation.operations).pluck('name'), response);
                            }
                        });
            } else {
                //TODO: check if interpolated
                var opts = ($.isPlainObject(operation)) ? params : options;
                return run.do.apply(run, arguments)
                    .then(function (response) {
                        if (!opts || !opts.silent) {
                            me.refresh.call(me, [operation], response);
                        }
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
                if (!me.listenerMap[opn]) {
                    me.listenerMap[opn] = [];
                }
                me.listenerMap[opn] = me.listenerMap[opn].concat(data);
            });

            return id;
        },
        unsubscribe: function (operation, token) {
            this.listenerMap[operation] = _.reject(this.listenerMap[operation], function (subs) {
                return subs.id === token;
            });
        },
        unsubscribeAll: function () {
            this.listenerMap = {};
        }
    };
    return $.extend(this, publicAPI);
};
