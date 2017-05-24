/**
 * ## Run Id Router
 *
 * TODO: move some of this to data-f-repeat / data-f-foreach: Routers allow Flow.js to route incoming requests to the correct underlying API. The Run Id Router routes requests to runs matching a particular filter. This is common for "scenario comparison" projects, in which end users set some initial decisions, then simulate the model to its end. Typically end users will do this several times, creating several runs, and compare the results. It's also common for facilitator pages, where a facilitator may want to view information from many runs.
 *
 * Routers allow Flow.js to route incoming requests to the correct underlying API. The Run Id Router routes requests to particular runs, based on the run id. TODO: use case example?
 *
 * **Initializing a Run Id Router**
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
 *          // runid options apply only to the run filter router
 *          runid: {
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
 * ** Using a Run Filter Router**
 *
 * There are two ways to route specific Flow.js custom HTML attributes to the run id:
 *
 * * Preface the values of the attributes with the run id, e.g. `data-f-bind="000001593dd81950d4ee4f3df14841769a0b:price"`.
 * * If your `Flow.initialize()` call ONLY includes `runid` options, then that run id is assumed to be the default for this page, and no preface is needed, e.g. `data-f-bind="price"`.
 *
 * For example:
 *
 *      <!-- using the run id preface -->
 *      Set the price: <input data-f-bind="000001593dd81950d4ee4f3df14841769a0b:price"></input>
 *      Step the run: <button data-f-on-click="000001593dd81950d4ee4f3df14841769a0b:step()">Step</button>
 *      View the sales for the year: <span data-f-bind="000001593dd81950d4ee4f3df14841769a0b:sales"></span>
 *
 *      <!-- if you are only working with the run id filter, no preface needed -->
 *      Set the price: <input data-f-bind="price"></input>
 *      Step the run: <button data-f-on-click="step()">Step</button>
 *      View the sales for the year: <span data-f-bind="sales"></span>
 *
 */

import runChannelFactory from './run-router-factory';
import { regex, withPrefix, stripSuffixDelimiter } from 'channels/middleware/utils';

var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
var runidRegex = '(?:.{' + sampleRunidLength + '})';

export default function (options, notifier) {
    if (!options) options = {};

    var opts = {};
    opts.serviceOptions = options.serviceOptions && options.serviceOptions.run ? options.serviceOptions.run : {};
    opts.channelOptions = options.channelOptions;

    return {
        match: regex(runidRegex),
        subscribeHandler: function (topics, prefix) {
            var runid = stripSuffixDelimiter(prefix);
            var channel = runChannelFactory(runid, opts, withPrefix(notifier, prefix));
            return channel.subscribeHandler(topics);
        },
        publishHandler: function (topics, prefix) {
            var runid = stripSuffixDelimiter(prefix);
            var channel = runChannelFactory(runid, opts, withPrefix(notifier, prefix));
            return channel.publishHandler(topics);
        }
    };
}
