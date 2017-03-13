import RunChannel from './run-router';

import { prefix, withPrefix } from 'channels/middleware/utils';
import Middleware from 'channels/middleware/channel-router';

export default function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {},
    };
    var opts = $.extend(true, {}, defaults, config);

    var sm = new window.F.manager.ScenarioManager(opts.serviceOptions);

    var baselinePromise = sm.baseline.getRun().then(function () {
        return sm.baseline.run;
    });
    var baselineOptions = $.extend(true, {}, {
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
    var currentRunPromise = sm.current.getRun().then(function () {
        return sm.current.run;
    });

    var runOptions = $.extend(true, {}, {
        serviceOptions: currentRunPromise,
    }, opts.defaults, opts.current);

    var baselineRunChannel = new RunChannel(baselineOptions, withPrefix(notifier, 'baseline:'));
    var currentRunChannel = new RunChannel(runOptions, withPrefix(notifier, 'current:'));
    var defaultRunChannel = new RunChannel(runOptions, withPrefix(notifier, ''));

    var handlers = [
        $.extend(baselineRunChannel, { match: prefix('baseline:') }),
        $.extend(currentRunChannel, { match: prefix('current:') }),
        $.extend(defaultRunChannel, { match: prefix('') }),
    ];
    
    var middleware = new Middleware(handlers, notifier);
    middleware.scenarioManager = sm;
    return middleware;
}
