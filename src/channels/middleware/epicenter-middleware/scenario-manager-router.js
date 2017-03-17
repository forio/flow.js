import RunChannel from './run-router';

import { prefix, withPrefix, defaultPrefix } from 'channels/middleware/utils';
import Router from 'channels/channel-router';

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

    var baselineRunChannel = new RunChannel(baselineOptions, withPrefix(notifier, 'baseline:'));
    var currentRunChannel = new RunChannel(runOptions, withPrefix(notifier, ['current:', '']));

    var handlers = [
        $.extend(baselineRunChannel, {
            match: prefix('baseline:'),
            options: baselineOptions.channelOptions,
        }),
        $.extend(currentRunChannel, { 
            isDefault: true, 
            match: defaultPrefix('current:'),
            options: runOptions.channelOptions,
        }),
    ];
    
    var router = new Router(handlers, notifier);
    router.scenarioManager = sm;
    return router;
}
