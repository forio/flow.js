import RunChannel from './run-router';

import { withPrefix, defaultPrefix } from 'channels/middleware/utils';
import Router from 'channels/channel-router';

export default function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    var opts = $.extend(true, {}, defaults, config);

    var rm = new window.F.manager.RunManager(opts.serviceOptions);
    var $creationPromise = rm.getRun().then(()=> rm.run);
    var currentChannelOpts = $.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    var currentRunChannel = new RunChannel(currentChannelOpts, withPrefix(notifier, ['current:', '']));

    var handlers = [
        $.extend(currentRunChannel, { 
            match: defaultPrefix('current:'),
            isDefault: true,
            options: currentChannelOpts.channelOptions,
        })
    ];

    var router = new Router(handlers, notifier);
    router.manager = rm;
    rm.currentRun = rm.run; //because run.manager.run sounds weird
    return router;
}
