import RunRouteHandler from '../run-route-handler';
import { withPrefix } from 'channels/channel-router/utils';
import router from 'channels/channel-router';
import { matchPrefix, matchDefaultPrefix, } from 'channels/route-handlers/route-matchers';


export default function ScenarioManagerRouteHandler(config, notifier) {
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

    var baselineHandler = new RunRouteHandler(baselineOptions, withPrefix(notifier, 'baseline:'));
    var currentRunHandler = new RunRouteHandler(runOptions, withPrefix(notifier, ['current:', '']));
    var handlers = [
        $.extend(baselineHandler, {
            name: 'baseline',
            match: matchPrefix('baseline:'),
            options: baselineOptions.channelOptions,
        }),
        $.extend(currentRunHandler, {
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
