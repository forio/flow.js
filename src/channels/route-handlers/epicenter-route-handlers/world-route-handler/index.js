import WorldUsersRouteHandler from './world-users-route-handler';
import WorldCurrentUserRouteHandler from './world-current-user-route-handler';

import { withPrefix } from 'channels/channel-router/utils';
import { matchPrefix, matchDefaultPrefix } from 'channels/route-handlers/route-matchers';

import RunRouteHandler from '../run-route-handler';
import router from 'channels/channel-router';

const { F } = window;

//TODO: Add custom worldid channel as well
//
export default function WorldRoutesHandler(config, notifier) {
    const defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    const opts = $.extend(true, {}, defaults, config);

    const rmOptions = opts.serviceOptions;
    const rm = new F.manager.RunManager(rmOptions);
    
    const getRunPromise = rm.getRun().then((run)=> {
        if (!run.world) {
            console.error('No world found in run. Make sure you\'re using EpicenterJS version > 2.7');
            throw new Error('Could not find world');
        }
        return run;
    }, (err)=> {
        console.error('Run manager get run error', err);
        throw err;
    });
    const $runPromise = getRunPromise.then((run)=> {
        if (rm.run.channel) {
            return rm.run;
        }
        const channelManager = new F.manager.ChannelManager();
        const worldChannel = channelManager.getWorldChannel(run.world);

        worldChannel.subscribe(worldChannel.TOPICS.RUN_RESET, (run)=> {
            rm.run.updateConfig({ filter: run.id });
        }, this, { includeMine: false });
        rm.run.channel = worldChannel;
        return rm.run;
    });

    const currentRunHandlerOpts = $.extend(true, { serviceOptions: $runPromise }, opts.defaults, opts.current);
    const currentRunHandler = new RunRouteHandler(currentRunHandlerOpts, withPrefix(notifier, ['run:', '']));

    const handlers = [];

    const runRouteHandler = $.extend(currentRunHandler, { 
        match: matchDefaultPrefix('run:'),
        name: 'World Run',
        isDefault: true,
        options: currentRunHandlerOpts.channelOptions,
    });
    handlers.unshift(runRouteHandler);

    const worldPromise = getRunPromise.then((run)=> {
        return run.world;
    });
    const usersRouteHandler = new WorldUsersRouteHandler(worldPromise, withPrefix(notifier, 'users:'));
    const usersHandler = $.extend(usersRouteHandler, { 
        match: matchPrefix('users:'),
        name: 'world users',
    });
    handlers.unshift(usersHandler);
    
    const currentUserRouteHandler = new WorldCurrentUserRouteHandler(worldPromise, withPrefix(notifier, 'user:'));
    const currentUserHandler = $.extend(currentUserRouteHandler, {
        match: matchPrefix('user:'),
        name: 'world current user',
    });
    handlers.unshift(currentUserHandler);

    const runMangerRouter = router(handlers);
    runMangerRouter.expose = { runManager: rm };

    return runMangerRouter;
}
