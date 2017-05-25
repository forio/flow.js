/**
 * ## Run Manager Router
 *
 * Routers allow Flow.js to route incoming requests to the correct underlying API. The Run Manager Router routes requests to the current run. This is common for "turn-by-turn" projects, where end users advance through the project's model step-by-step, working either individually or together to make decisions at each step. This is also the default behavior in Flow.js; most of the examples (for instance, [displaying and updating model variables](../../attributes-overview/)) use the run manager router without explicitly calling it.
 *
 * **Initializing a Run Manager Router**
 *
 * When you initialize Flow.js on a page in your user interface, each router can take different options:
 *
 *      Flow.initialize({
 *          // default options apply to all routers
 *          defaults: {
 *              run: { 
 *                  account: 'teamId',
 *                  project: 'projectId',
 *                  model: 'model.py',
 *                  server: { host: 'api.forio.com' }
 *              },
 *              channelOptions: {
 *                  variables: { },
 *                  operations: { }
 *              }
 *          },
 *          // runManager options override the defaults and apply only to the run manager router
 *          runManager: {
 *              run: {
 *
 *              },
 *              channelOptions: {
 *                  variables: { silent: ['sampleVar'] },
 *                  operations: { silent: false }
 *              }   
 *          }
 *      });
 *
 * **Using a Run Manager Router**
 *
 * There are two ways to route specific Flow.js custom HTML attributes to the run manager:
 *
 * * Preface the values of the attributes with `run`: `data-f-bind="run:price"`.
 * * If your `Flow.initialize()` call ONLY includes `runManager` options (and no `scenarioManager` options), then `runManager` is assumed to be the default for this page, and no preface is needed: `data-f-bind="price"`.
 *
 * For example:
 *
 *      <!-- using the 'run' preface -->
 *      Set the price: <input data-f-bind="run:price"></input>
 *      Step the run: <button data-f-on-click="run:step()">Step</button>
 *      View the sales for the year: <span data-f-bind="run:sales"></span>
 *
 *      <!-- if you are only working with the run manager router, no preface needed -->
 *      Set the price: <input data-f-bind="price"></input>
 *      Step the run: <button data-f-on-click="step()">Step</button>
 *      View the sales for the year: <span data-f-bind="sales"></span>
 *
 */

import RunChannel from './run-router';

import { withPrefix, defaultPrefix } from 'channels/middleware/utils';
import Router from 'channels/channel-router';

export default function (config, notifier) {
    var defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    var opts = $.extend(true, {}, defaults, config);

    var rm = new window.F.manager.RunManager(opts.serviceOptions);
    var $creationPromise = rm.getRun().then(()=> rm.run);
    var currentChannelOpts = $.extend(true, 
        { serviceOptions: $creationPromise }, opts.defaults, opts.current);
    var currentRunChannel = new RunChannel(currentChannelOpts, withPrefix(notifier, ['current:', '']));

    var handlers = [
        $.extend(currentRunChannel, { 
            match: defaultPrefix('current:'),
            isDefault: true,
            options: currentChannelOpts.channelOptions,
        })
    ];

    var router = new Router(handlers, notifier);
    router.manager = rm;
    rm.currentRun = rm.run; //because run.manager.run sounds weird
    return router;
}
