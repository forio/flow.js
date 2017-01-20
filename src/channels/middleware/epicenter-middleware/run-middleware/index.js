var MetaChannel = require('./run-meta-channel');
var VariablesChannel = require('./run-variables-channel');
var OperationsChannel = require('./run-operations-channel');
var silencable = require('channels/middleware/utils/silencable');

var Middleware = require('channels/middleware/general-middleware');

var prefix = require('channels/middleware/utils').prefix;
var mapWithPrefix = require('channels/middleware/utils').mapWithPrefix;
var channelUtils = require('channels/channel-utils');

module.exports = function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {
            initialOperation: [],
            variables: {
                autoFetch: true,
                silent: false,
                readOnly: false,
            },
            operations: {
                readOnly: false,
                silent: false,
            },
            meta: {
                silent: false,
                autoFetch: true,
                readOnly: false
            },
        }
    };
    var opts = $.extend(true, {}, defaults, config);

    var serviceOptions = _.result(opts, 'serviceOptions');
    var channelOptions = opts.channelOptions;

    var $initialProm = null;
    if (serviceOptions instanceof window.F.service.Run) {
        $initialProm = $.Deferred().resolve(serviceOptions).promise();
    } else if (serviceOptions.then) {
        $initialProm = serviceOptions;
    } else {
        var rs = new window.F.service.Run(serviceOptions);
        $initialProm = $.Deferred().resolve(rs).promise();
    }

    // if (channelOptions.initialOperation.length) {
    //     //FIXME: Move run initialization logic to run-manager, as a strategy option. Technically only it should know what to do with it.
    //     //For e.g, if there was a reset operation performed on the run, the run service instance will be the same so we wouldn't know
    //     $initialProm = $initialProm.then(function (runService) {
    //         if (!runService.initialize) {
    //             runService.initialize = runService.serial(channelOptions.initialOperation);
    //         }
    //         return runService.initialize.then(function () {
    //             return runService;
    //         });
    //     });
    // }

    //TODO: Need 2 different channel instances because the fetch is debounced, and hence will bundle variables up otherwise.
    //also, notify needs to be called twice (with different arguments). Different way?
    var variableschannel = new VariablesChannel($initialProm);
    var defaultVariablesChannel = new VariablesChannel($initialProm);
    var metaChannel = new MetaChannel($initialProm);
    var operationsChannel = new OperationsChannel($initialProm);

    var handlers = [
        $.extend({}, variableschannel, { name: 'variables', match: prefix('variable:') }),
        $.extend({}, metaChannel, { name: 'meta', match: prefix('meta:') }),
        $.extend({}, operationsChannel, { name: 'operations', match: prefix('operation:') }),
        $.extend({}, defaultVariablesChannel, { name: 'variables', match: prefix('') }),
    ];

    var middleware = new Middleware(handlers, notifier);
    return middleware;
};