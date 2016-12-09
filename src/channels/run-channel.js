'use strict';

var VarsChannel = require('./variables-channel');
var OperationsChannel = require('./operations-channel');

module.exports = function (options, initFn) {
    var defaults = {
        variables: {
            autoFetch: {
                start: true
            }
        },
        operations: {

        }
    };
    var config = $.extend(true, {}, defaults, options);

    var opnSilent = config.operations.silent;
    var isInitOperationSilent = initFn && (opnSilent === true || (_.isArray(opnSilent) && _.contains(opnSilent, initFn)));
    var preFetchVariables = !initFn || isInitOperationSilent;

    if (preFetchVariables) {
        config.variables.autoFetch.start = true;
    }


    var rm = new window.F.manager.RunManager({ run: config });
    var rs = rm.run;

    var $creationPromise = rm.getRun();
    rs.currentPromise = $creationPromise;

    // $creationPromise
    //     .then(function () {
    //         console.log('done');
    //     })
    //     .fail(function () {
    //         console.log('failt');
    //     });

    var createAndThen = function (fn, context) {
        return _.wrap(fn, function (func) {
            var passedInParams = _.toArray(arguments).slice(1);
            return rs.currentPromise.then(function () {
                rs.currentPromise = func.apply(context, passedInParams);
                return rs.currentPromise;
            }).fail(function () {
                console.warn('This failed, but we\'re moving ahead with the next one anyway', arguments);
                rs.currentPromise = func.apply(context, passedInParams);
                return rs.currentPromise;
            });
        });
    };

    //Make sure nothing happens before the run is created
    var nonWrapped = ['variables', 'create', 'load', 'getCurrentConfig', 'updateConfig'];
    _.each(rs, function (value, name) {
        if (_.isFunction(value) && !_.contains(nonWrapped, name)) {
            rs[name] = createAndThen(value, rs);
        }
    });

    var originalVariablesFn = rs.variables;
    rs.variables = function () {
        var vs = originalVariablesFn.apply(rs, arguments);
        _.each(vs, function (value, name) {
            if (_.isFunction(value)) {
                vs[name] = createAndThen(value, vs);
            }
        });
        return vs;
    };

    this.run = rs;
    this.variables = new VarsChannel($.extend(true, {}, config.variables, { run: rs }));
    this.operations = new OperationsChannel($.extend(true, {}, config.operations, { run: rs }));

    var me = this;
    var DEBOUNCE_INTERVAL = 200;
    var debouncedRefresh = _.debounce(function () {
        me.variables.refresh(null, true);
        if (me.variables.options.autoFetch.enable) {
            me.variables.startAutoFetch();
        }
    }, DEBOUNCE_INTERVAL, { leading: false });

    this.operations.subscribe('*', debouncedRefresh);
};
