import MetaChannel from './run-meta-channel';
import VariablesChannel from './run-variables-channel';
import OperationsChannel from './run-operations-channel';

import Router from 'channels/middleware/channel-router';
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

    var dualPrefixNotifier = function (prefix) {
        return function (data) {
            withPrefix(notifier, prefix)(data);
            notifier(data);
        };
    };

    var dualMatcher = function (prefixString) {
        return function (input) {
            return prefix(prefixString)(input) || prefix('')(input);
        };
    };
    var variableschannel = new VariablesChannel($initialProm, dualPrefixNotifier('variables:'));
    var metaChannel = new MetaChannel($initialProm, withPrefix(notifier, 'meta:'));
    var operationsChannel = new OperationsChannel($initialProm, withPrefix(notifier, 'operations:'));

    var handlers = [
        $.extend({}, metaChannel, { match: prefix('meta:') }),
        $.extend({}, operationsChannel, { match: prefix('operations:') }),
        $.extend({}, variableschannel, { match: dualMatcher('variables:') }),
    ];

    var router = new Router(handlers, notifier);
    var oldhandler = router.publishHandler;
    router.publishHandler = function () {
        var prom = oldhandler.apply(oldhandler, arguments);
        return prom.then(function (result) {
            if (result && result.length) {
                variableschannel.fetch();
            }
            return result;
        });
    };
    return router;
}
