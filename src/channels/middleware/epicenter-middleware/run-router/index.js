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

    const operationNotifier = withPrefix(notifier, OPERATIONS_PREFIX);
    const variableNotifier = withPrefix(notifier, [VARIABLES_PREFIX, '']);

    const metaChannel = new MetaChannel($initialProm, withPrefix(notifier, META_PREFIX));
    const operationsChannel = new OperationsChannel($initialProm, operationNotifier);
    const variableschannel = new VariablesChannel($initialProm, variableNotifier);

    let subscribed = false;
    $initialProm.then((rs)=> {
        if (rs.channel && !subscribed) {
            subscribed = true;
            
            const subscribeOpts = { includeMine: false };
            //FIXME: Exclude silenced -- let notify take care of this?
            rs.channel.subscribe('variables', (data, meta)=> {
                variableschannel.notify(data, meta);
            }, subscribeOpts);
            rs.channel.subscribe('operation', (data, meta)=> {
                operationsChannel.notify(data, meta);
                variableschannel.fetch();
            }, subscribeOpts);
            rs.channel.subscribe('reset', (data, meta)=> {
                operationsChannel.notify({ name: 'reset', result: data }, meta);
            }, subscribeOpts);

            rs.channel.subscribe('', (data, meta)=> {
                console.log('everything', data, meta);
            });
        }
    });

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

    const runRouter = router(handlers);
    const oldhandler = runRouter.publishHandler;
    runRouter.publishHandler = function () {
        const ignoreOperation = ['reset']; //don't fetch on reset since subscribed variables will be obsolete anyway
        const prom = oldhandler.apply(router, arguments);
        return prom.then(function (result) { //all the silencing will be taken care of by the router
            const shouldFetch = !!_.find(result, (r)=> {
                const isVariable = r.name.indexOf(VARIABLES_PREFIX) === 0;
                const isOperation = r.name.indexOf(OPERATIONS_PREFIX) === 0;
                const isIgnoredOperation = !!_.find(ignoreOperation, (opnName)=> r.name.indexOf(opnName) !== -1);

                return isVariable || (isOperation && !isIgnoredOperation);
            });
            if (shouldFetch) {
                variableschannel.fetch();
            }
            return result;
        });
    };
    return runRouter;
}
