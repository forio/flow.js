import WorldUsersChannel from './world-users-channel';
import WorldCurrentUserChannel from './world-current-user-channel';

import { withPrefix } from 'channels/channel-router/utils';
import { matchPrefix, matchDefaultPrefix } from 'channels/route-handlers/route-matchers';

import RunChannel from '../run-router';
import router from 'channels/channel-router';

const { F } = window;

//TODO: Add custom worldid channel as well
//
export default function (config, notifier) {
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

    const currentRunChannelOpts = $.extend(true, { serviceOptions: $runPromise }, opts.defaults, opts.current);
    const currentRunChannel = new RunChannel(currentRunChannelOpts, withPrefix(notifier, ['run:', '']));

    const handlers = [];

    const runRouteHandler = $.extend(currentRunChannel, { 
        match: matchDefaultPrefix('run:'),
        name: 'World Run',
        isDefault: true,
        options: currentRunChannelOpts.channelOptions,
    });
    handlers.unshift(runRouteHandler);

    const worldPromise = getRunPromise.then((run)=> {
        return run.world;
    });
    const multiUserChannel = new WorldUsersChannel(worldPromise, withPrefix(notifier, 'users:'));
    const multiUserHandler = $.extend(multiUserChannel, { 
        match: matchPrefix('users:'),
        name: 'world users',
    });
    handlers.unshift(multiUserHandler);
    
    const userChannel = new WorldCurrentUserChannel(worldPromise, withPrefix(notifier, 'user:'));
    const userHandler = $.extend(userChannel, {
        match: matchPrefix('user:'),
        name: 'current user',
    });
    handlers.unshift(userHandler);

    const runMangerRouter = router(handlers);
    runMangerRouter.expose = { runManager: rm };

    return runMangerRouter;
}
