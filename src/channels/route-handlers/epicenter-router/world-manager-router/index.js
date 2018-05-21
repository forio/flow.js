import WorldUsersChannel from './world-users-channel';
import WorldCurrentUserChannel from './world-current-user-channel';

import { withPrefix } from 'channels/route-handlers/utils';
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
    
    const getRunPromise = rm.getRun().catch((err)=> {
        console.error('Run manager get run error', err);
        throw err;
    });
    const $runPromise = getRunPromise.then((run)=> {
        if (!run.world) {
            console.error('No world found in run. Make sure you\'re using EpicenterJS version > 2.4');
            throw new Error('Could not find world');
        }
        if (rm.run.getChannel) {
            return rm.run;
        }

        const channelManager = new F.manager.ChannelManager();
        const worldChannel = channelManager.getWorldChannel(run.world);

        worldChannel.subscribe('reset', (run)=> {
            rm.run.updateConfig({ filter: run.id });
        }, this, { includeMine: false });
        rm.run.channel = worldChannel;
        return rm.run;
    });
    const currentChannelOpts = $.extend(true, 
        { serviceOptions: $runPromise }, opts.defaults, opts.current);
    const currentRunChannel = new RunChannel(currentChannelOpts, withPrefix(notifier, ['run:', '']));

    const runRouteHandler = $.extend(currentRunChannel, { 
        match: matchDefaultPrefix('run:'),
        name: 'World Run',
        isDefault: true,
        options: currentChannelOpts.channelOptions,
    });
    const handlers = [
        runRouteHandler
    ];
    const worldPromise = getRunPromise.then((run)=> {
        return run.world;
    });
    const presenceChannel = new WorldUsersChannel(worldPromise, withPrefix(notifier, 'users:'));
    const presenceHandler = $.extend(presenceChannel, { 
        match: matchPrefix('users:'),
        name: 'world users',
    });
    handlers.unshift(presenceHandler);
    
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
