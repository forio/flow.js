import RunManagerRouter from './run-manager-router';
import ScenarioRouter from './scenario-manager-router';
import CustomRunRouter from './custom-run-router';

import { withPrefix, prefix as prefixMatch } from 'channels/middleware/utils';

import Router from 'channels/middleware/channel-router';

function getOptions(opts, key) {
    var serviceOptions = $.extend(true, {}, opts.defaults, opts[key]);
    var channelOptions = $.extend(true, {}, serviceOptions.channelOptions);
    delete serviceOptions.channelOptions;

    return { serviceOptions: serviceOptions, channelOptions: channelOptions };
}

export default function (config, notifier) {
    var opts = $.extend(true, {}, config);

    var customRunChannelOpts = getOptions(opts, 'runid');
    var customRunChannel = new CustomRunRouter(customRunChannelOpts, notifier);

    var handlers = [
        $.extend({}, customRunChannel, { name: 'runid' })
    ];
    var prefix = '';
    if (opts.scenarioManager) {
        prefix = config.runManager ? 'scenario:' : '';

        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new ScenarioRouter(scenarioManagerOpts, withPrefix(notifier, prefix));
        handlers.push($.extend({}, sm, { 
            name: 'scenarioManager', 
            match: prefixMatch(prefix),
            options: scenarioManagerOpts.channelOptions,
        }));
    }

    if (opts.runManager || !opts.scenarioManager) {
        prefix = config.scenarioManager ? 'run:' : '';

        var runManagerOpts = getOptions(opts, 'runManager');
        var rm = new RunManagerRouter(runManagerOpts, withPrefix(notifier, prefix));
        handlers.push($.extend({}, rm, { 
            name: 'runManager',
            match: prefixMatch(prefix),
            options: runManagerOpts.channelOptions,
        }));
    }

    var router = new Router(handlers, notifier);
    return router;
}
