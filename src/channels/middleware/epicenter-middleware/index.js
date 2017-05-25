import RunManagerRouter from './run-manager-router';
import ScenarioRouter from './scenario-manager-router';
import CustomRunRouter from './custom-run-router';

import RunsRouter from './runs-router';

import { regex, withPrefix, prefix as prefixMatch, defaultPrefix } from 'channels/middleware/utils';

import Router from 'channels/channel-router';

function getOptions(opts, key) {
    var serviceOptions = $.extend(true, {}, opts.defaults, opts[key]);
    var channelOptions = $.extend(true, {}, serviceOptions.channelOptions);
    delete serviceOptions.channelOptions;

    return { serviceOptions: serviceOptions, channelOptions: channelOptions };
}

var SCENARIO_PREFIX = 'sm:';
var RUN_PREFIX = 'rm:';

var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
var runidRegex = '(?:.{' + sampleRunidLength + '})';

export default function (config, notifier, channelManagerContext) {
    var opts = $.extend(true, {}, config);

    var customRunChannelOpts = getOptions(opts, 'runid');
    var customRunChannel = new CustomRunRouter(customRunChannelOpts, notifier);
    var runsChannel = new RunsRouter(customRunChannelOpts, withPrefix(notifier, 'runs'), channelManagerContext);

    var handlers = [$.extend({}, customRunChannel, { 
        name: 'customRun',
        match: regex(runidRegex),
        options: customRunChannelOpts.channelOptions,
    }), $.extend({}, runsChannel, {
        name: 'archiveRuns',
        match: prefixMatch('runs'),
        options: customRunChannelOpts.channelOptions,
    })];
    var exposable = {};
    if (opts.scenarioManager) {
        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new ScenarioRouter(scenarioManagerOpts, withPrefix(notifier, [SCENARIO_PREFIX, '']));
        handlers.push($.extend({}, sm, { 
            name: 'scenario',
            match: defaultPrefix(SCENARIO_PREFIX),
            options: scenarioManagerOpts.channelOptions,
            isDefault: true,
        }));

        $.extend(exposable, sm.expose);
    }

    var runManagerOpts = getOptions(opts, 'runManager');
    if (opts.runManager || (!opts.scenarioManager && runManagerOpts.serviceOptions.run)) {
        var rm;
        if (opts.scenarioManager) {
            rm = new RunManagerRouter(runManagerOpts, withPrefix(notifier, RUN_PREFIX));
            handlers.push($.extend({}, rm, { 
                name: 'run',
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

        $.extend(exposable, rm.expose);
    }

    var router = new Router(handlers, notifier);
    router.expose = exposable;
    
    return router;
}
