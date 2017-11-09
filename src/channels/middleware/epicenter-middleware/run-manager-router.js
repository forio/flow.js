import RunChannel from './run-router';

import { withPrefix, defaultPrefix } from 'channels/middleware/utils';
import router from 'channels/channel-router';

const { F } = window;

export default function (config, notifier) {
    const defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    const opts = $.extend(true, {}, defaults, config);

    const rm = new F.manager.RunManager(opts.serviceOptions);
    const $creationPromise = rm.getRun().then((run)=> {
        if (run.world && !rm.run.getChannel) {
            const channelManager = new F.manager.ChannelManager();
            const worldChannel = channelManager.getWorldChannel(run.world);

            worldChannel.subscribe('reset', (run)=> {
                rm.run.updateConfig({ filter: run.id });
            }, { includeMine: false });
            rm.run.channel = worldChannel;
        }
        return rm.run;
    });
    const currentChannelOpts = $.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    const currentRunChannel = new RunChannel(currentChannelOpts, withPrefix(notifier, ['current:', '']));

    const handlers = [
        $.extend(currentRunChannel, { 
            match: defaultPrefix('current:'),
            isDefault: true,
            options: currentChannelOpts.channelOptions,
        })
    ];

    const runMangerRouter = router(handlers, notifier);
    runMangerRouter.expose = { runManager: rm };
    return runMangerRouter;
}
