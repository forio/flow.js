/**
 * ## Run Id Router
 *
 * Routers allow Flow.js to route incoming requests to the correct underlying API. The Run Id Router routes requests to a single existing run, based on the run id.
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
 *          // runid options override the defaults and apply only to the run filter router
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
 * ** Using a Run Id Router**
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
import { withPrefix, stripSuffixDelimiter } from 'channels/middleware/utils';

export default function (options, notifier) {
    if (!options) options = {};

    var opts = {};
    opts.serviceOptions = options.serviceOptions && options.serviceOptions.run ? options.serviceOptions.run : {};
    opts.channelOptions = options.channelOptions;

    return {
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
