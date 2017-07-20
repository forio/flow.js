import MetaChannel from './run-meta-channel';
import VariablesChannel from './run-variables-channel';
import OperationsChannel from './run-operations-channel';

import Router from 'channels/channel-router';
import { withPrefix, prefix, defaultPrefix } from 'channels/middleware/utils';

export default function RunRouter(config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {
            variables: {
                autoFetch: true,
                debounce: 200,
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
                readOnly: ['id', 'created', 'account', 'project', 'model', 'lastModified']
            },
        }
    };
    var opts = $.extend(true, {}, defaults, config);

    var serviceOptions = _.result(opts, 'serviceOptions');

    var $initialProm = null;
    if (serviceOptions instanceof window.F.service.Run) {
        $initialProm = $.Deferred().resolve(serviceOptions).promise();
    } else if (serviceOptions.then) {
        $initialProm = serviceOptions;
    } else {
        var rs = new window.F.service.Run(serviceOptions);
        $initialProm = $.Deferred().resolve(rs).promise();
    }


    var metaChannel = new MetaChannel($initialProm, withPrefix(notifier, 'meta:'));
    var operationsChannel = new OperationsChannel($initialProm, withPrefix(notifier, 'operations:'));
    var variableschannel = new VariablesChannel($initialProm, withPrefix(notifier, ['variables:', '']));

    var handlers = [
        $.extend({}, metaChannel, { 
            name: 'meta',
            match: prefix('meta:'),
            options: opts.channelOptions.meta,
        }),
        $.extend({}, operationsChannel, { 
            name: 'operations',
            match: prefix('operations:'),
            options: opts.channelOptions.operations,
        }),
        $.extend({}, variableschannel, { 
            isDefault: true,
            name: 'variables',
            match: defaultPrefix('variables:'),
            options: opts.channelOptions.variables,
        }),
    ];

    var router = new Router(handlers, notifier);
    var oldhandler = router.publishHandler;
    router.publishHandler = function () {
        var prom = oldhandler.apply(router, arguments);
        return prom.then(function (result) { //all the silencing will be taken care of by the router
            var hasOperation = _.find(result, (r)=> r.name.indexOf('operations:') === 0);
            if (hasOperation) {
                variableschannel.fetch();
            }
            return result;
        });
    };
    return router;
}
