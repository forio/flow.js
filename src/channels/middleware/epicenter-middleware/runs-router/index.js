/**
 * ## Run Filter Router
 *
 * Routers allow Flow.js to route incoming requests to the correct underlying API. The Run Filter Router routes requests to a set of runs matching a particular set of runs. This is common for "scenario comparison" projects, in which end users set some initial decisions, then simulate the model to its end. Typically end users will do this several times, creating several runs, and a results page will compare model variables from across many runs. A Run Filter Router is also common for facilitator pages, where a facilitator may want to view information from many runs.
 *
 * By definition, a filter can return multiple runs. Therefore, the Run Filter Router is only available when working with Flow.js custom HTML attributes that handle multiples: `data-f-foreach` and `data-f-repeat` (see more on the [for each](../../dom/attributes/foreach/default-foreach-attr/) and [repeat](../../dom/attributes/repeat-attr/) attributes).
 *
* **Initializing a Run Filter Router**
 *
 * When you initialize Flow.js on a page in your user interface, the run filter router takes its options from the defaults:
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
 * **Using a Run Filter Router**
 *
 * To route specific Flow.js custom HTML attributes to a particular set of runs:
 *
 * * Use the preface `runs` and two sets of parameters. The first set is required, and is the filter. The second set is optional, and is the comma-separated list of variables you want to access from the set of runs. If you do not include this, you can access any data, using the appropriate channel prefix (e.g. `meta`, `variables`). If you do include this, the request will be faster because you'll only be retrieving the information you need.
 *
 * For example:
 *
 *      List the sales from saved runs so far:
 *
 *          <table border="1">
 *              <th>Saved Runs</th>
 *              <tbody data-f-foreach="s in runs(;saved=true)(sales)">
 *                  <tr><td>Run Name: <span data-f-bind="s:meta:runName"></span></td></tr>
 *                  <tr><td>Total Sales: <span data-f-bind="s:variables:sales"></span></td></tr>
 *              </tbody>
 *          </table>
 *
 *      List the final score from all runs in the group:
 *
 *          <table border="1">
 *              <th>Final Scores</th>
 *              <tbody data-f-foreach="s in runs(;saved=true;scope.group=group1)(finalScore)">
 *                  <tr><td>User: <span data-f-bind="s:meta:user.userName"></span></td></tr>
 *                  <tr><td>Score: <span data-f-bind="s:variables:finalScore"></span></td></tr>
 *              </tbody>
 *          </table>
 *
 * Note that this example uses several features in addition to a Run Filter Router: see more information on [using foreach](../../dom/attributes/foreach/default-foreach-attr/) and on the [run meta channel](../meta-channel/).
 *
 * Also, note that for the particular filter of `;saved=true`, the `data-f-foreach="s in runs(;saved=true)(sales)` could also be expressed using a [Scenario Manager Router](../scenario-manager-router/): `data-f-foreach="s in sm:saved"`.
 */


import { debounceAndMerge } from 'utils/general';
import { objectToArray, arrayToObject } from 'channels/channel-utils';
import { withPrefix } from 'channels/middleware/utils';

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
        },
        publishHandler: function (topics, options) {
            console.log('publishHandler', topics);

            return Promise.resolve(topics);
            // return $runServicePromise.then(function (runService) {
            //     var toSave = arrayToObject(topics);
            //     return runService.variables().save(toSave).then(function (response) {
            //         return objectToArray(response);
            //     });
            // });
        }
    };
}
