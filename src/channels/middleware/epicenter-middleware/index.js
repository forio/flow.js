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

    var handlers = [customRunChannel];
    if (opts.scenarioManager) {
        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new ScenarioRouter(scenarioManagerOpts, withPrefix(notifier, ''));
        handlers.push($.extend({}, sm, { 
            match: prefixMatch(''),
            options: scenarioManagerOpts.channelOptions,
        }));
    }

    var runManagerOpts = getOptions(opts, 'runManager');
    if (opts.runManager || (!opts.scenarioManager && runManagerOpts.run)) {
        var prefix = config.scenarioManager ? 'runManager:' : ''; //only need to disambiguate if you specify both

        var rm = new RunManagerRouter(runManagerOpts, withPrefix(notifier, prefix));
        handlers.push($.extend({}, rm, { 
            match: prefixMatch(prefix),
            options: runManagerOpts.channelOptions,
        }));
    }

    var router = new Router(handlers, notifier);
    return router;
}
