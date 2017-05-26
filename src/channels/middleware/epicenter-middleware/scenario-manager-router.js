/**
 * ## Scenario Manager Router
 *
 * In some projects, often called "turn-by-turn" projects, end users advance through the project's model step-by-step, working either individually or together to make decisions at each step.
 *
 * In other projects, often called "run comparison" or "scenario comparison" projects, end users set some initial decisions, then simulate the model to its end. Typically end users will do this several times, creating several runs, and compare the results.
 *
 * The Scenario Manager Router makes it easy to create these "run comparison" projects using Flow.js, by routing incoming requests to the correct underlying API. In particular, specifying a Scenario Manager Router for your Flow.js calls means that requests are routed to a set of runs, including `baseline`, `current`, and `saved`, which together comprise the three typical components in building a run comparison project:
 *
 * * A `current` run in which to make decisions; this is defined as a run that hasn't been advanced yet, and so can be used to set initial decisions. The current run maintains state across different sessions.
 * * A `baseline` run to compare against; this is defined as a run "advanced to the end" of your model using just the model defaults.
 * * A set of `saved` runs, that is, all runs that you want to use for comparisons. Note: The set of saved runs here is an alias for a [multiple runs router](../multiple-runs-router/). This router is a bit different from the others because it provides access to many runs rather than a particular run. In turn, this means that there is not a direct binding to information in a particular run; however, you can extract the run id and use that with [templating](../#templates) to bind to a specific model variable or model operation. Alternatively, if you want to access particular variables, you can add a second attribute, `data-f-channel-include`, and set the value to a comma-separated list of variables you want to access from the set of runs. (See examples, below and on the [multiple runs router](../multiple-runs-router/) page.)
 *
 * **Initializing a Scenario Manager Router**
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
 *          // scenarioManager options override the defaults and apply only to the scenario manager router
 *          scenarioManager: {
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
 * **Using a Scenario Manager Router**
 *
 * There are two ways to route specific Flow.js custom HTML attributes to runs in a scenario:
 *
 * * Preface the values of the attributes with `sm` and the name of the run(s) to address: `data-f-bind="sm:baseline:price"`.
 * * If your `Flow.initialize()` call ONLY includes `scenarioManager` options (and no `runManager` options), then `scenarioManager` is assumed to be the default for this page. Preface the values of the attributes with the name of the run(s) to address only: `data-f-bind="baseline:price"`.
 *
 * For example:
 *
 *      Price in baseline run: <span data-f-bind="sm:baseline:price"></span>
 *      Set the current price: <input data-f-bind="sm:current:price"></input>
 *
 *      Simulate the current run: <button data-f-on-click="sm:current:stepTo('end')">Step to End</button>
 *
 *      For comparison, list the sales from all runs so far:
 *
 *          <table border="1">
 *              <th>Saved Runs</th>
 *              <tbody data-f-foreach="s in sm:saved" data-f-channel-include="sales">
 *
 *                  <!-- list the id -->
 *                  <tr><td>Run Id: <%= s.id =></td></tr>
 *
 *                  <!-- bind directly to the runName, using a single run router -->
 *                  <tr><td>Run Name: <input data-f-bind="<%= s.id =>:meta:runName"></input></td></tr>
 *
 *                  <!-- list the sales; notes that if you want to list model variables, --> 
 *                  <!-- you need data-f-channel-include in the enclosing scope (the tbody, above) -->
 *                  <tr><td>Total Sales: <%= s.variables.sales =></td></tr>
 *
 *              </tbody>
 *          </table>
 *
 * This example uses several features in addition to a Scenario Manager Router: see more information on using [foreach](../../dom/attributes/foreach/default-foreach-attr/), the [Meta Channel](../meta-channel/), a [Single Run Router](../single-run-router/), and [templates](../../../#templates).
 *
 * Also, note that `data-f-foreach="s in sm:saved"` could also be expressed using a [Multiple Runs Router](../multiple-runs-router/): `data-f-foreach="s in runs(;saved=true)`.
 *
 * **Accessing the Underlying Structure**
 *
 * The Scenario Manager Router connects Flow.js to the Epicenter.js [Scenario Manager](../../../../api_adapters/generated/scenario-manager/). Optionally, you can access this underlying Scenario Manager directly:
 *
 *      Flow.channel.scenarioManager.current.getRun();
 *      Flow.channel.scenarioManager.savedRuns.save(a-run-id);
 *      Flow.channel.scenarioManager.baseline.reset();
 *
 */

import RunRouter from './run-router';

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

    var baselineChannel = new RunRouter(baselineOptions, withPrefix(notifier, 'baseline:'));
    var currentRunChannel = new RunRouter(runOptions, withPrefix(notifier, ['current:', '']));
    var handlers = [
        $.extend(baselineChannel, {
            name: 'baseline',
            match: prefix('baseline:'),
            options: baselineOptions.channelOptions,
        }),
        $.extend(currentRunChannel, { 
            isDefault: true, 
            name: 'current',
            match: defaultPrefix('current:'),
            options: runOptions.channelOptions,
        }),

    ];
    
    var router = new Router(handlers, notifier);
    router.expose = { scenarioManager: sm };
    return router;
}
