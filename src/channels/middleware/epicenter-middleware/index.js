import RunManagerRouter from './run-manager-router';
import ScenarioRouter from './scenario-manager-router';
import CustomRunRouter from './custom-run-router';

import { withPrefix, prefix as prefixMatch, defaultPrefix } from 'channels/middleware/utils';

import Router from 'channels/channel-router';

function getOptions(opts, key) {
    var serviceOptions = $.extend(true, {}, opts.defaults, opts[key]);
    var channelOptions = $.extend(true, {}, serviceOptions.channelOptions);
    delete serviceOptions.channelOptions;

    return { serviceOptions: serviceOptions, channelOptions: channelOptions };
}

var SCENARIO_PREFIX = 'sm:';
var RUN_PREFIX = 'rm:';

export default function (config, notifier) {
    var opts = $.extend(true, {}, config);

    var customRunChannelOpts = getOptions(opts, 'runid');
    var customRunChannel = new CustomRunRouter(customRunChannelOpts, notifier);

    var handlers = [customRunChannel];
    var namesList = {};
    if (opts.scenarioManager) {
        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new ScenarioRouter(scenarioManagerOpts, withPrefix(notifier, [SCENARIO_PREFIX, '']));
        handlers.push($.extend({}, sm, { 
            match: defaultPrefix(SCENARIO_PREFIX),
            options: scenarioManagerOpts.channelOptions,
            isDefault: true,
        }));

        namesList.scenario = sm;
    }

    var runManagerOpts = getOptions(opts, 'runManager');
    if (opts.runManager || (!opts.scenarioManager && runManagerOpts.run)) {
        var rm;
        if (opts.scenarioManager) {
            rm = new RunManagerRouter(runManagerOpts, withPrefix(notifier, RUN_PREFIX));
            handlers.push($.extend({}, rm, { 
                name: 'scenario',
                match: prefixMatch(RUN_PREFIX),
                options: runManagerOpts.channelOptions,
            }));
        } else {
            rm = new RunManagerRouter(runManagerOpts, withPrefix(notifier, [RUN_PREFIX, '']));
            handlers.push($.extend({}, rm, { 
                name: 'run',
                match: defaultPrefix(RUN_PREFIX),
                isDefault: true,
                options: runManagerOpts.channelOptions,
            }));
        }

        namesList.run = rm;
    }

    var router = new Router(handlers, notifier);
    router.name = 'epi';
    
    return $.extend(router, namesList);
}
