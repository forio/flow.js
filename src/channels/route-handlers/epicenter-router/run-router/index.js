import MetaChannel from './run-meta-channel';
import VariablesChannel from './run-variables-channel';
import OperationsChannel from './run-operations-channel';

import router from 'channels/channel-router';
import { withPrefix } from 'channels/channel-router/utils';
import { matchPrefix, matchDefaultPrefix } from 'channels/route-handlers/route-matchers';

import _ from 'lodash';

export const VARIABLES_PREFIX = 'variables:';
export const META_PREFIX = 'meta:';
export const OPERATIONS_PREFIX = 'operations:';

/**
 * 
 * @param {Publishable[]} result 
 * @param {string[]} ignoreOperations 
 * @returns {boolean}
 */
export function _shouldFetch(result, ignoreOperations) {
    const filtered = (result || []).filter((r)=> {
        const name = r.name || '';
        const isIgnored = (ignoreOperations || []).indexOf(name.replace(OPERATIONS_PREFIX, '')) !== -1;
        const isVariable = name.indexOf(VARIABLES_PREFIX) === 0;
        const isOperation = name.indexOf(OPERATIONS_PREFIX) === 0;

        return isVariable || (isOperation && !isIgnored);
    });
    return filtered.length > 0;
}

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
            //FIXME: Provide subscription fn to individual channels and let them handle it
            rs.channel.subscribe('variables', (data, meta)=> {
                variableschannel.notify(data, meta);
                variableschannel.fetch();
            }, this, subscribeOpts);
            rs.channel.subscribe('operation', (data, meta)=> {
                operationsChannel.notify(data, meta);
                variableschannel.fetch();
            }, this, subscribeOpts);
            //
            rs.channel.subscribe('reset', (data, meta)=> {
                operationsChannel.notify({ name: 'reset', result: data }, meta);
            }, this, subscribeOpts);

            // rs.channel.subscribe('', (data, meta)=> {
            //     console.log('everything', data, meta);
            // });
        }
    });

    const handlers = [
        $.extend({}, metaChannel, { 
            name: 'meta',
            match: matchPrefix(META_PREFIX),
            options: opts.channelOptions.meta,
        }),
        $.extend({}, operationsChannel, { 
            name: 'operations',
            match: matchPrefix(OPERATIONS_PREFIX),
            options: opts.channelOptions.operations,
        }),
        $.extend({}, variableschannel, { 
            isDefault: true,
            name: 'variables',
            match: matchDefaultPrefix(VARIABLES_PREFIX),
            options: opts.channelOptions.variables,
        }),
    ];

    // router.addRoute(prefix('meta:'), metaChannel, opts.channelOptions.meta);

    const runRouter = router(handlers);
    const oldhandler = runRouter.publishHandler;
    runRouter.publishHandler = function () {
        const prom = oldhandler.apply(router, arguments);
        return prom.then(function (result) { //all the silencing will be taken care of by the router
            const shouldFetch = _shouldFetch(result, ['reset']);
            if (shouldFetch) {
                variableschannel.fetch();
            }
            return result;
        });
    };
    return runRouter;
}
