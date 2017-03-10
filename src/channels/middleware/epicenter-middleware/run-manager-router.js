import RunChannel from './run-router';

import { withPrefix, prefix } from 'channels/middleware/utils';
import Middleware from 'channels/middleware/channel-router';

export default function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    var opts = $.extend(true, {}, defaults, config);

    var rm = new window.F.manager.RunManager(opts.serviceOptions);
    var $creationPromise = rm.getRun().then(function () {
        return rm.run;
    });
    var currentChannelOpts = $.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    var currentRunChannel = new RunChannel(currentChannelOpts, withPrefix(notifier, 'current'));
    var defaultRunChannel = new RunChannel(currentChannelOpts, notifier);

    var handlers = [
        $.extend(currentRunChannel, { 
            name: 'current', 
            match: prefix('current:'),
            options: currentChannelOpts.channelOptions,
        }),
        $.extend(defaultRunChannel, { 
            name: 'default', 
            match: prefix(''),
            options: currentChannelOpts.channelOptions,
        }),
    ];

    var middleware = new Middleware(handlers, notifier);
    middleware.runManager = rm;
    
    return middleware;
}
