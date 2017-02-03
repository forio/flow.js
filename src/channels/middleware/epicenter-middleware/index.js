var RunManagerRouter = require('./run-manager-router');
var ScenarioRouter = require('./scenario-manager-router');
var CustomRunRouter = require('./custom-run-router');

var withPrefix = require('channels/middleware/utils').withPrefix;
var prefixMatch = require('channels/middleware/utils').prefix;

var Middleware = require('channels/middleware/channel-router');

function getOptions(opts, key) {
    var serviceOptions = $.extend(true, {}, opts.defaults, opts[key]);
    var channelOptions = $.extend(true, {}, serviceOptions.channelOptions);
    delete serviceOptions.channelOptions;

    return { serviceOptions: serviceOptions, channelOptions: channelOptions };
}

module.exports = function (config, notifier) {
    var opts = $.extend(true, {}, config);

    var customRunChannelOpts = getOptions(opts, 'runid');
    var customRunChannel = new CustomRunRouter(customRunChannelOpts, notifier);

    var handlers = [
        $.extend({}, customRunChannel, { name: 'runid' })
    ];
    var prefix = '';
    if (opts.runManager) {
        prefix = config.scenarioManager ? 'run' : '';

        var runManagerOpts = getOptions(opts, 'runManager');
        var rm = new RunManagerRouter(runManagerOpts, withPrefix(notifier, prefix));
        handlers.push($.extend({}, rm, { name: 'runManager', match: prefixMatch(prefix) }));
    }

    if (opts.scenarioManager) {
        prefix = config.runManager ? 'scenario' : '';

        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new ScenarioRouter(scenarioManagerOpts, withPrefix(notifier, prefix));
        handlers.push($.extend({}, sm, { name: 'scenarioManager', match: prefixMatch(prefix) }));
    }
    var middleware = new Middleware(handlers, notifier);
    return middleware;
};
