import RunChannel from './run-router';

import { oneOf } from 'utils/functional';
import { withPrefix, prefix, defaultPrefix } from 'channels/middleware/utils';
import Router from 'channels/middleware/channel-router';

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
            match: oneOf(prefix('current:'), defaultPrefix('prefix:')),
            isDefault: true,
            options: currentChannelOpts.channelOptions,
        })
    ];

    var router = new Router(handlers, notifier);
    router.runManager = rm;
    
    return router;
}
