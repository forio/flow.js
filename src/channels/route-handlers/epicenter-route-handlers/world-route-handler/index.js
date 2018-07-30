import WorldUsersRouteHandler from './world-users-route-handler';
import WorldCurrentUserRouteHandler from './world-current-user-route-handler';
import ConsensusRouteHandler from './consensus-route-handler';

import { withPrefix } from 'channels/channel-router/utils';
import { matchPrefix, matchDefaultPrefix } from 'channels/route-handlers/route-matchers';

import RunRouteHandler from '../run-route-handler';
import router from 'channels/channel-router';

const { F } = window;

const RUN_PREFIX = 'run:';
const MULTI_USER_PREFIX = 'users:';
const USER_PREFIX = 'user:';
const CONSENSUS_PREFIX = 'consensus:';

//TODO: Add custom worldid channel as well
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
        const alreadyStubbedRunChannel = rm.run.channel; //FIXME: Explicitly pass instead of stubbing on a channel
        if (alreadyStubbedRunChannel) {
            return rm.run;
        }
        const channelManager = new F.manager.ChannelManager();
        const worldChannel = channelManager.getWorldChannel(run.world);

        worldChannel.subscribe(worldChannel.TOPICS.RUN_RESET, (run)=> {
            rm.run.updateConfig({ filter: run.id });//Run handler is also listening on the run and will take care of notifying
        }, this, { includeMine: false });
        rm.run.channel = worldChannel;
        return rm.run;
    });

    const currentRunHandlerOpts = $.extend(true, { serviceOptions: $runPromise }, opts.defaults, opts.current);
    const currentRunHandler = new RunRouteHandler(currentRunHandlerOpts, withPrefix(notifier, [RUN_PREFIX, '']));

    const handlers = [];

    const runRouteHandler = $.extend(currentRunHandler, { 
        match: matchDefaultPrefix(RUN_PREFIX),
        name: 'World Run',
        isDefault: true,
        options: currentRunHandlerOpts.channelOptions,
    });
    handlers.unshift(runRouteHandler);

    let $worldProm = null;
    function getWorld() {
        if (!$worldProm) {
            $worldProm = getRunPromise.then((run)=> {
                return run.world;
            });
        }
        return $worldProm;
    }

    const worldChannelMap = {};
    const channelManager = new F.manager.ChannelManager();
    function getChannelForWorld(worldid) {
        if (!worldChannelMap[worldid]) {
            worldChannelMap[worldid] = channelManager.getWorldChannel(worldid);
        }
        return worldChannelMap[worldid];
    }

    const am = new F.manager.AuthManager();
    const handlerOptions = {
        serviceOptions: {
            getWorld: getWorld,
            getSession: ()=> am.getCurrentUserSessionInfo(),
            getChannel: getChannelForWorld,
        },
        channelOptions: {}
    };
    
    const usersRouteHandler = new WorldUsersRouteHandler(handlerOptions, withPrefix(notifier, MULTI_USER_PREFIX));
    const usersHandler = $.extend(usersRouteHandler, { 
        match: matchPrefix(MULTI_USER_PREFIX),
        name: 'world users',
    });
    handlers.unshift(usersHandler);
    
    const currentUserRouteHandler = new WorldCurrentUserRouteHandler(handlerOptions, withPrefix(notifier, USER_PREFIX));
    const currentUserHandler = $.extend(currentUserRouteHandler, {
        match: matchPrefix(USER_PREFIX),
        name: 'world current user',
    });
    handlers.unshift(currentUserHandler);

    const consensusRouteHandler = new ConsensusRouteHandler(handlerOptions, withPrefix(notifier, CONSENSUS_PREFIX));
    const consensusHandler = $.extend(consensusRouteHandler, {
        match: matchPrefix(CONSENSUS_PREFIX),
        name: 'consensus',
    });
    handlers.unshift(consensusHandler);

    const worldRouteHandler = router(handlers);
    worldRouteHandler.expose = { runManager: rm };

    return worldRouteHandler;
}
