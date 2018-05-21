import RunRouter from './run-router';
import { withPrefix } from 'channels/route-handlers/utils';
import router from 'channels/channel-router';
import { matchPrefix, matchDefaultPrefix, } from 'channels/route-handlers/route-matchers';


export default function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {},
    };
    var opts = $.extend(true, {}, defaults, config);

    var sm = new window.F.manager.ScenarioManager(opts.serviceOptions);

    var baselinePromise = sm.baseline.getRun().then(()=> sm.baseline.run);
    var baselineOptions = $.extend(true, {
        serviceOptions: baselinePromise,
        channelOptions: {
            meta: {
                readOnly: true
            },
            variables: {
                readOnly: true
            }
        }
    }, opts.defaults, opts.baseline);
    var currentRunPromise = sm.current.getRun().then(()=> sm.current.run);

    var runOptions = $.extend(true, {
        serviceOptions: currentRunPromise,
    }, opts.defaults, opts.current);

    var baselineChannel = new RunRouter(baselineOptions, withPrefix(notifier, 'baseline:'));
    var currentRunChannel = new RunRouter(runOptions, withPrefix(notifier, ['current:', '']));
    var handlers = [
        $.extend(baselineChannel, {
            name: 'baseline',
            match: matchPrefix('baseline:'),
            options: baselineOptions.channelOptions,
        }),
        $.extend(currentRunChannel, { 
            isDefault: true, 
            name: 'current',
            match: matchDefaultPrefix('current:'),
            options: runOptions.channelOptions,
        }),

    ];
    
    var scenarioManagerRouter = router(handlers, notifier);
    scenarioManagerRouter.expose = { scenarioManager: sm };
    return scenarioManagerRouter;
}
