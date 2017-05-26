/**
 * ## Multiple Runs Router
 *
 * Routers allow Flow.js to route incoming requests to the correct underlying API. The Multiple Runs Router routes requests to a set of runs matching a particular filter. This is common for "scenario comparison" projects, in which end users set some initial decisions, then simulate the model to its end. Typically end users will do this several times, creating several runs, and a results page will compare model variables from across many runs. A Multiple Runs Router is also common for facilitator pages, where a facilitator may want to view information from many runs.
 *
 * Because it returns more than one run, the Multiple Runs Router is a bit different from the other routers. Specifically:
 *
 * * It is only available when working with Flow.js custom HTML attributes that handle multiples: `data-f-foreach` and `data-f-repeat` (see more on the [for each](../../dom/attributes/foreach/default-foreach-attr/) and [repeat](../../dom/attributes/repeat-attr/) attributes). 
 * * There is *NOT* a direct binding to information in a particular run. However, you can read from the run, and you can read the run id and use that with [templating](../../#templates) to bind to a specific model variable or model operation.
 *
* **Initializing a Multiple Runs Router**
 *
 * When you initialize Flow.js on a page in your user interface, the multiple runs router takes its options from the defaults:
 *
 *      Flow.initialize({
 *          // default options apply to all routers, including run filter router
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
 *          }
 *      });
 *
 * **Using a Multiple Runs Router**
 *
 * To route specific Flow.js custom HTML attributes to a particular set of runs:
 *
 * * In the initial attribute (either `data-f-foreach` or `data-f-repeat`), set the value to `runs` and the value for the filter. Each run returned by the router automatically includes the the meta information for the run.
 * * Optionally, add a second attribute, `data-f-channel-include`. Set the value to a comma-separated list of variables you want to access from the set of runs.
 *
 * For example:
 *
 *      List the sales from saved runs so far:
 *
 *          <table border="1">
 *              <th>Saved Runs</th>
 *              <tbody data-f-foreach="s in runs(;saved=true)" data-f-channel-include="sales,price">
 *                  <!-- list the id -->
 *                  <tr><td>Run Id: <%= s.id =></td></tr>
 *
 *                  <!-- bind directly to metadata and variables, using a single run router -->
 *                  <tr><td>Run Name: <input data-f-bind="<%= s.id =>:meta:runName"></input></td></tr>
 *                  <tr><td>Total Sales: <span data-f-bind="<%= s.id =>:variables:sales"></span></td></tr>
 *
 *                  <!-- bind directly to operations, using a single run router -->
 *                  <tr><td>Step this run: <button data-f-on-click="<%= s.id =>:operations:step()">Step</button></td></tr>
 *              </tbody>
 *          </table>
 *
 *      List the final score from all runs in the group:
 *
 *          <table border="1">
 *              <th>Final Scores</th>
 *              <tbody data-f-foreach="s in runs(scope.group=group1)" data-f-channel-include="finalScore">
 *                  <!-- list the information; because the use case is for read-only info,
 *                      no need to use data-f-bind and a single run router -->
 *                  <tr><td>User: <%= s.user.userName =></td></tr>
 *                  <tr><td>Score: <%= s.variables.finalScore =></td></tr>
 *              </tbody>
 *          </table>
 *
 * These examples use several features in addition to a Multiple Runs Router: see more information on using [foreach](../../dom/attributes/foreach/default-foreach-attr/), the [Meta Channel](../meta-channel/), a [Single Run Router](../single-run-router/), and [templates](../../../#templates).
 *
 * Also, note that for the particular filter of `;saved=true`, the `data-f-foreach="s in runs(;saved=true)` could also be expressed using a [Scenario Manager Router](../scenario-manager-router/): `data-f-foreach="s in sm:saved"`.
 */


const { F } = window;

export default function RunsRouter(options, notifier, channelManagerContext) {
    var runService = new F.service.Run(options.serviceOptions.run);

    var topicParamMap = {};

    function extractFromTopic(topicString) {
        var commaRegex = /,(?![^[]*])/;
        var [filters, variables] = topicString.split(')(');

        filters = filters.replace('(', '').replace(')', '');
        var filterParam = filters.split(';').reduce((accum, filter)=> {
            var [key, val] = filter.split('=');
            accum[key] = val;
            return accum;
        }, {});

        variables = variables.replace('(', '').replace(')', '');
        variables = variables.split(commaRegex);

        return { filter: filterParam, variables: variables };
    }

    function fetch(topic) {
        var params = extractFromTopic(topic);
        return runService.query(params.filter, { include: params.variables }).then((runs)=> {
            notifier([{ name: topic, value: runs }]);
            return runs;
        });
    }

    return { 
        fetch: fetch,

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            console.log('unsubs');
            // knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics) {
            var topic = ([].concat(topics))[0];

            var params = extractFromTopic(topic);

            if (topicParamMap[topic]) {
                channelManagerContext.unsubscribe(topicParamMap[topic]);
            }
            return fetch(topic).then(function (runs) {
                runs.forEach((run)=> {
                    var subscriptions = Object.keys(params.filter).map((filter)=> run.id + ':meta:' + filter);
                    var subsid = channelManagerContext.subscribe(subscriptions, function () {
                        fetch(topic);
                    }, { batch: false, autoLoad: false, cache: false });
                    topicParamMap[topic] = subsid;

                });
                return runs;
            });
        }
    };
}
