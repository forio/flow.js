import RunManagerRouter from './run-manager-router';
import ScenarioRouter from './scenario-manager-router';
import CustomRunRouter from './custom-run-router';
import WorldManagerRouter from './world-manager-router';

import RunsRouter from './runs-router';

// import UserRouter from './user-router/current-user-channel';

import { regex, withPrefix, prefix as prefixMatch, defaultPrefix } from 'channels/middleware/utils';

import router from 'channels/channel-router';

function getOptions(opts, key) {
    var serviceOptions = $.extend(true, {}, opts.defaults, opts[key]);
    var channelOptions = $.extend(true, {}, serviceOptions.channelOptions);
    delete serviceOptions.channelOptions;

    return { serviceOptions: serviceOptions, channelOptions: channelOptions };
}

var SCENARIO_PREFIX = 'sm:';
var RUN_PREFIX = 'rm:';
const WORLD_PREFIX = 'world:';

var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
var runidRegex = '(?:.{' + sampleRunidLength + '})';

export default function (config, notifier, channelManagerContext) {
    var opts = $.extend(true, {}, config);

    var customRunChannelOpts = getOptions(opts, 'runid');
    var customRunChannel = new CustomRunRouter(customRunChannelOpts, notifier);
    var runsChannel = new RunsRouter(customRunChannelOpts, withPrefix(notifier, 'runs'), channelManagerContext);
    // var userChannel = new UserRouter(getOptions(opts, 'runManager').run, withPrefix(notifier, 'user:'), channelManagerContext);
    
    /** @type {Handler[]} **/
    var handlers = [
        $.extend({}, customRunChannel, { 
            name: 'customRun',
            match: regex(runidRegex),
            options: customRunChannelOpts.channelOptions,
        }), 
        $.extend({}, runsChannel, {
            name: 'archiveRuns',
            match: prefixMatch('runs:'),
            options: customRunChannelOpts.channelOptions,
        }),  
        // $.extend({}, userChannel, {
        //     name: 'User Channel',
        //     match: prefixMatch('user:'),
        // })
    ];
    var exposable = {};

    var runManagerOpts = getOptions(opts, 'runManager');
    if (opts.runManager || (!opts.scenarioManager && runManagerOpts.serviceOptions.run)) {
        var rm;
        const isMultiplayer = runManagerOpts.serviceOptions.strategy === 'multiplayer';
        if (opts.scenarioManager) {
            rm = new RunManagerRouter(runManagerOpts, withPrefix(notifier, RUN_PREFIX));
            handlers.push($.extend({}, rm, { 
                name: 'run',
                match: prefixMatch(RUN_PREFIX), //if both scenario manager and run manager are being used, require a prefix
                options: runManagerOpts.channelOptions,
            }));
        } else if (isMultiplayer) {
            //Ignore case where both scenario manager and multiplayer are being used
            rm = new WorldManagerRouter(runManagerOpts, withPrefix(notifier, [WORLD_PREFIX, '']));
            handlers.push($.extend({}, rm, { 
                name: 'World run',
                match: defaultPrefix(WORLD_PREFIX),
                isDefault: true,
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

    var epicenterRouter = router(handlers, notifier);
    epicenterRouter.expose = exposable;
    
    return epicenterRouter;
}
