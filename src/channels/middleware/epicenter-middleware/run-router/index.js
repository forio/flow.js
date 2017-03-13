import MetaChannel from './run-meta-channel';
import VariablesChannel from './run-variables-channel';
import OperationsChannel from './run-operations-channel';

import Middleware from 'channels/middleware/channel-router';
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
            meta: {
                silent: false,
                autoFetch: true,
                readOnly: false
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

    //TODO: Need 2 different channel instances because the fetch is debounced, and hence will bundle variables up otherwise.
    //also, notify needs to be called twice (with different arguments). Different way?
    var variableschannel = new VariablesChannel($initialProm, withPrefix(notifier, 'variable:'));
    var defaultVariablesChannel = new VariablesChannel($initialProm, notifier);
    var metaChannel = new MetaChannel($initialProm, withPrefix(notifier, 'meta:'));
    var operationsChannel = new OperationsChannel($initialProm, withPrefix(notifier, 'operation:'));

    var handlers = [
        $.extend({}, variableschannel, { name: 'variables', match: prefix('variable:') }),
        $.extend({}, metaChannel, { name: 'meta', match: prefix('meta:') }),
        $.extend({}, operationsChannel, { name: 'operations', match: prefix('operation:') }),
        $.extend({}, defaultVariablesChannel, { name: 'variables', match: prefix('') }),
    ];

    var middleware = new Middleware(handlers, notifier);
    return middleware;
}
