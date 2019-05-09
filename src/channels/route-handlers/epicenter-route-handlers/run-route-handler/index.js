import MetaRouteHandler from './run-meta-route-handler';
import VariablesRouteHandler from './run-variables-route-handler';
import OperationsRouteHandler from './run-operations-route-hander';

import router from 'channels/channel-router';
import { withPrefix, silencable } from 'channels/channel-router/utils';
import { matchPrefix, matchDefaultPrefix } from 'channels/route-handlers/route-matchers';

import _ from 'lodash';
import { objectToPublishable } from 'channels/channel-utils';

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

const RunService = F.service.Run;
export default function GenericRunRouteHandler(config, notifier) {
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
    if (serviceOptions instanceof RunService) {
        $initialProm = $.Deferred().resolve(serviceOptions).promise();
    } else if (serviceOptions.then) {
        $initialProm = serviceOptions;
    } else {
        const rs = new RunService(serviceOptions);
        $initialProm = $.Deferred().resolve(rs).promise();
    }

    const operationNotifier = withPrefix(notifier, OPERATIONS_PREFIX);
    const variableNotifier = withPrefix(notifier, [VARIABLES_PREFIX, '']);

    const metaHandler = new MetaRouteHandler($initialProm, withPrefix(notifier, META_PREFIX));
    const operationsHandler = new OperationsRouteHandler($initialProm, operationNotifier);
    const variablesHandler = new VariablesRouteHandler($initialProm, variableNotifier);

    let subscribed = false;
    const channelOptions = opts.channelOptions;
    $initialProm.then((rs)=> {
        if (rs.channel && !subscribed) {
            subscribed = true;
            const { TOPICS } = rs.channel;
            const subscribeOpts = { includeMine: false };
            //TODO: Provide subscription fn to individual channels and let them handle it?
            rs.channel.subscribe(TOPICS.RUN_VARIABLES, (data, meta)=> {
                const publishable = objectToPublishable(data);
                const excludingSilenced = silencable(publishable, channelOptions.variables.silent);
                if (!excludingSilenced.length) {
                    return;
                }
                variablesHandler.notify(excludingSilenced, meta);
                variablesHandler.fetch();//Variables channel #notify also does a fetch, but this is not supposed to know about that. Debouncing will take care of duplicate fetches anyway.
            }, this, subscribeOpts);
            rs.channel.subscribe(TOPICS.RUN_OPERATIONS, (data, meta)=> {
                const publishable = [{ name: data.name, value: data.result }];
                const excludingSilenced = silencable(publishable, channelOptions.operations.silent);
                if (!excludingSilenced.length) {
                    return;
                }
                operationsHandler.notify(excludingSilenced, meta);
                variablesHandler.fetch();
            }, this, subscribeOpts);
            rs.channel.subscribe(TOPICS.CONSENSUS_UPDATE, (consensus, meta)=> {
                if (consensus.closed) {
                    variablesHandler.fetch(); 
                    // I should also do operationsHandler.notify but I don't know what to notify them about
                    //Just remove the 'include Mine' check for operations? That's just cached anyway
                }
            }, this, { includeMine: true });
            rs.channel.subscribe(TOPICS.RUN_RESET, (data, meta)=> {
                const publishable = [{ name: 'reset', value: data }];
                const excludingSilenced = silencable(publishable, channelOptions.operations.silent);
                if (!excludingSilenced.length) {
                    return;
                }
                operationsHandler.notify(excludingSilenced, meta);
            }, this, subscribeOpts);


            // rs.channel.subscribe('', (data, meta)=> {
            //     console.log('everything', data, meta);
            // });
        }
    });

    const handlers = [
        $.extend({}, metaHandler, { 
            name: 'meta',
            match: matchPrefix(META_PREFIX),
            options: opts.channelOptions.meta,
        }),
        $.extend({}, operationsHandler, { 
            name: 'operations',
            match: matchPrefix(OPERATIONS_PREFIX),
            options: opts.channelOptions.operations,
        }),
        $.extend({}, variablesHandler, { 
            isDefault: true,
            name: 'variables',
            match: matchDefaultPrefix(VARIABLES_PREFIX),
            options: opts.channelOptions.variables,
        }),
    ];

    // router.addRoute(prefix('meta:'), metaChannel, opts.channelOptions.meta);

    const runRouter = router(handlers);
    const oldhandler = runRouter.publishHandler;
    runRouter.publishHandler = function (publishable) {
        const prom = oldhandler.apply(router, arguments);
        return prom.then(function (result) { //all the silencing will be taken care of by the router
            const shouldFetch = _shouldFetch(result, ['reset']);
            if (shouldFetch) {
                const excludeFromFetch = result.map((r)=> r.name); //This was just published, no need to get the value again
                variablesHandler.fetch({ exclude: excludeFromFetch });
            }
            return result;
        });
    };
    return runRouter;
}
