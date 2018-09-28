import DefaultRunRouteHandler from './default-run-route-handler';
import ScenarioRouteHandler from './scenario-route-handler';
import RunidRouteHandler from './runid-route-handler';
import WorldRouteHandler from './world-route-handler';

import MultiRunRouteHandler from './multi-run-route-handler';


import { withPrefix } from 'channels/channel-router/utils';
import { matchPrefix, matchDefaultPrefix, matchRegex } from 'channels/route-handlers/route-matchers';

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

export default function EpicenterRouteHandler(config, notifier, channelManagerContext) {
    var opts = $.extend(true, {}, config);

    var runidHandlerOpts = getOptions(opts, 'runid');
    var runidHandler = new RunidRouteHandler(runidHandlerOpts, notifier);
    var multiRunHandler = new MultiRunRouteHandler(runidHandlerOpts, withPrefix(notifier, 'runs'), channelManagerContext);
    // var userChannel = new UserRouter(getOptions(opts, 'runManager').run, withPrefix(notifier, 'user:'), channelManagerContext);
    
    /** @type {Handler[]} **/
    var handlers = [
        $.extend({}, runidHandler, { 
            name: 'customRun',
            match: matchRegex(runidRegex),
            options: runidHandlerOpts.channelOptions,
        }), 
        $.extend({}, multiRunHandler, {
            name: 'archiveRuns',
            match: matchPrefix('runs:'),
            options: runidHandlerOpts.channelOptions,
        }),  
        // $.extend({}, userChannel, {
        //     name: 'User Channel',
        //     match: matchPrefix('user:'),
        // })
    ];
    var exposable = {};

    var runManagerOpts = getOptions(opts, 'runManager');
    if (opts.runManager || (!opts.scenarioManager && runManagerOpts.serviceOptions.run)) {
        var rm;
        const isMultiplayer = runManagerOpts.serviceOptions.strategy === 'multiplayer';
        if (opts.scenarioManager) {
            rm = new DefaultRunRouteHandler(runManagerOpts, withPrefix(notifier, RUN_PREFIX));
            handlers.push($.extend({}, rm, { 
                name: 'run',
                match: matchPrefix(RUN_PREFIX), //if both scenario manager and run manager are being used, require a prefix
                options: runManagerOpts.channelOptions,
            }));
        } else if (isMultiplayer) {
            //Ignore case where both scenario manager and multiplayer are being used
            rm = new WorldRouteHandler(runManagerOpts, withPrefix(notifier, [WORLD_PREFIX, '']));
            handlers.push($.extend({}, rm, { 
                name: 'World run',
                match: matchDefaultPrefix(WORLD_PREFIX),
                isDefault: true,
                options: runManagerOpts.channelOptions,
            }));
        } else {
            rm = new DefaultRunRouteHandler(runManagerOpts, withPrefix(notifier, [RUN_PREFIX, '']));
            handlers.push($.extend({}, rm, { 
                name: 'run',
                match: matchDefaultPrefix(RUN_PREFIX),
                isDefault: true,
                options: runManagerOpts.channelOptions,
            }));
        }

        $.extend(exposable, rm.expose);
    }

    if (opts.scenarioManager) {
        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new ScenarioRouteHandler(scenarioManagerOpts, withPrefix(notifier, [SCENARIO_PREFIX, '']));
        handlers.push($.extend({}, sm, { 
            name: 'scenario',
            match: matchDefaultPrefix(SCENARIO_PREFIX),
            options: scenarioManagerOpts.channelOptions,
            isDefault: true,
        }));

        $.extend(exposable, sm.expose);
    }

    var epicenterRouter = router(handlers, notifier);
    epicenterRouter.expose = exposable;
    
    return epicenterRouter;
}
