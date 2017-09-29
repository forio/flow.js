import MetaChannel from './run-meta-channel';
import VariablesChannel from './run-variables-channel';
import OperationsChannel from './run-operations-channel';

import router from 'channels/channel-router';
import { withPrefix, prefix, defaultPrefix } from 'channels/middleware/utils';

import _ from 'lodash';

export default function RunRouter(config, notifier) {
    const defaults = {
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
    const opts = $.extend(true, {}, defaults, config);

    const serviceOptions = _.result(opts, 'serviceOptions');

    let $initialProm = null;
    if (serviceOptions instanceof window.F.service.Run) {
        $initialProm = $.Deferred().resolve(serviceOptions).promise();
    } else if (serviceOptions.then) {
        $initialProm = serviceOptions;
    } else {
        const rs = new window.F.service.Run(serviceOptions);
        $initialProm = $.Deferred().resolve(rs).promise();
    }

    const VARIABLES_PREFIX = 'variables:';
    const META_PREFIX = 'meta:';
    const OPERATIONS_PREFIX = 'operations:';

    const metaChannel = new MetaChannel($initialProm, withPrefix(notifier, META_PREFIX));
    const operationsChannel = new OperationsChannel($initialProm, withPrefix(notifier, OPERATIONS_PREFIX));
    const variableschannel = new VariablesChannel($initialProm, withPrefix(notifier, [VARIABLES_PREFIX, '']));

    const handlers = [
        $.extend({}, metaChannel, { 
            name: 'meta',
            match: prefix(META_PREFIX),
            options: opts.channelOptions.meta,
        }),
        $.extend({}, operationsChannel, { 
            name: 'operations',
            match: prefix(OPERATIONS_PREFIX),
            options: opts.channelOptions.operations,
        }),
        $.extend({}, variableschannel, { 
            isDefault: true,
            name: 'variables',
            match: defaultPrefix(VARIABLES_PREFIX),
            options: opts.channelOptions.variables,
        }),
    ];

    // router.addRoute(prefix('meta:'), metaChannel, opts.channelOptions.meta);

    const runRouter = router(handlers, notifier);
    const oldhandler = runRouter.publishHandler;
    runRouter.publishHandler = function () {
        const noFetchOperations = ['reset']; //don't fetch on reset since subscribed variables will be obsolete anyway
        const prom = oldhandler.apply(router, arguments);
        return prom.then(function (result) { //all the silencing will be taken care of by the router
            const shouldFetch = _.find(result, (r)=> {
                const isVariable = r.name.indexOf(VARIABLES_PREFIX) === 0;
                const isOperation = r.name.indexOf(OPERATIONS_PREFIX) === 0;
                const isNoFetchOperation = _.find(noFetchOperations, (opnName)=> r.name.indexOf(opnName) !== -1);

                return isVariable || (isOperation && !isNoFetchOperation);
            });
            if (shouldFetch) {
                variableschannel.fetch();
            }
            return result;
        });
    };
    return runRouter;
}
