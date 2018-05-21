import RunChannel from './run-router';

import { withPrefix } from 'channels/route-handlers/utils';
import router from 'channels/channel-router';
import { matchDefaultPrefix } from 'channels/route-handlers/route-matchers';

const { F } = window;

const RUN_PREFIX = 'current:';

export default function (config, notifier) {
    const defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    const opts = $.extend(true, {}, defaults, config);

    const rmOptions = opts.serviceOptions;
    const rm = new F.manager.RunManager(rmOptions);

    const $creationPromise = rm.getRun().then((run)=> {
        return rm.run;
    });
    const currentChannelOpts = $.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    const currentRunChannel = new RunChannel(currentChannelOpts, withPrefix(notifier, [RUN_PREFIX, '']));

    const runRouteHandler = $.extend(currentRunChannel, { 
        match: matchDefaultPrefix(RUN_PREFIX), //TODO: Just remove prefix?
        name: 'Current Run',
        isDefault: true,
        options: currentChannelOpts.channelOptions,
    });
    const handlers = [
        runRouteHandler
    ];

    const runMangerRouter = router(handlers);
    runMangerRouter.expose = { runManager: rm };

    return runMangerRouter;
}
