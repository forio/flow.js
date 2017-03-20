import VariablesChannel from './saved-runs-variables';
import OperationsChannel from './saved-runs-operations';

import Router from 'channels/channel-router';
import { withPrefix, prefix } from 'channels/middleware/utils';

export default function RunRouter(config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {
            variables: {
                autoFetch: true,
                silent: false,
                readOnly: false,
            },
            operations: {
                readOnly: false,
                silent: false,
            },
        }
    };
    var opts = $.extend(true, {}, defaults, config);

    var serviceOptions = _.result(opts, 'serviceOptions');

    var savedRunsManager;
    if (serviceOptions instanceof window.F.manager.SavedRunsManager) {
        savedRunsManager = serviceOptions;
    } else {
        savedRunsManager = new window.F.manager.SavedRunsManager(serviceOptions);
    }


    var operationsChannel = new OperationsChannel(savedRunsManager, withPrefix(notifier, 'operations:'));
    var variableschannel = new VariablesChannel(savedRunsManager, notifier);

    var handlers = [
        $.extend({}, operationsChannel, { 
            name: 'operations',
            match: prefix('operations:'),
            options: opts.channelOptions.operations,
        }),
        $.extend({}, variableschannel, { 
            name: 'savedDefault',
            isDefault: true,
            match: prefix(''),
            options: opts.channelOptions.variables,
        }),
    ];

    var router = new Router(handlers, notifier);
    var oldhandler = router.publishHandler;
    router.publishHandler = function () {
        var prom = oldhandler.apply(router, arguments);
        return prom.then(function (result) {
            if (result && result.length) {
                variableschannel.fetch();
            }
            return result;
        });
    };
    return router;
}
