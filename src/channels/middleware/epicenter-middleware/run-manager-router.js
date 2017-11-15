import RunChannel from './run-router';
import WorldUsersChannel from './world-users-channel';
import WorldCurrentUserChannel from './world-current-user-channel';

import { withPrefix, defaultPrefix, prefix } from 'channels/middleware/utils';
import router from 'channels/channel-router';

const { F } = window;

export default function (config, notifier) {
    const defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    const opts = $.extend(true, {}, defaults, config);

    const rmOptions = opts.serviceOptions;
    const rm = new F.manager.RunManager(rmOptions);
    const isMultiplayer = rmOptions && rmOptions.strategy === 'multiplayer';

    
    const getRunPromise = rm.getRun().catch((err)=> {
        console.error('Run manager get run error', err);
        throw err;
    });
    const $creationPromise = getRunPromise.then((run)=> {
        if (run.world && !rm.run.getChannel) {
            const channelManager = new F.manager.ChannelManager();
            const worldChannel = channelManager.getWorldChannel(run.world);

            worldChannel.subscribe('reset', (run)=> {
                rm.run.updateConfig({ filter: run.id });
            }, this, { includeMine: false });
            rm.run.channel = worldChannel;
        }
        return rm.run;
    });
    const currentChannelOpts = $.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    const currentRunChannel = new RunChannel(currentChannelOpts, withPrefix(notifier, ['current:', '']));

    const runRouteHandler = $.extend(currentRunChannel, { 
        match: defaultPrefix('current:'),
        name: 'Current Run',
        isDefault: true,
        options: currentChannelOpts.channelOptions,
    });
    const handlers = [
        runRouteHandler
    ];
    if (isMultiplayer) {
        const worldPromise = getRunPromise.then((run)=> {
            return run.world;
        });
        const presenceChannel = new WorldUsersChannel(worldPromise, withPrefix(notifier, 'users:'));
        const presenceHandler = $.extend(presenceChannel, { 
            match: prefix('users:'),
            name: 'world users',
        });
        handlers.unshift(presenceHandler);
        
        const userChannel = new WorldCurrentUserChannel(worldPromise, withPrefix(notifier, 'user:'));
        const userHandler = $.extend(userChannel, {
            match: prefix('user:'),
            name: 'current user',
        });
        handlers.unshift(userHandler);
    }

    const runMangerRouter = router(handlers);
    runMangerRouter.expose = { runManager: rm };

    return runMangerRouter;
}
