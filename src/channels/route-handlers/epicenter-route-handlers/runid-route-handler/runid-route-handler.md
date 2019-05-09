## Single Run Router

Routers allow Flow.js to route incoming requests to the correct underlying API. The Run Id Router routes requests to a single existing run, based on the run id.

Single Run Routers are most commonly used in conjunction with a [Multiple Runs Router](../multiple-runs-router/): loop through a set of runs, and for each one, use a Single Run Router to bind to the specific model variables or operations.

**Initializing a Run Id Router**

When you initialize Flow.js on a page in your user interface, each router can take different options:

```js
Flow.initialize({
    // default options apply to all routers
    defaults: {
        run: { 
            account: 'teamId',
            project: 'projectId',
            model: 'model.py',
            server: { host: 'api.forio.com' }
        },
        channelOptions: {
            variables: { },
            operations: { }
        }
    },
    // runid options override the defaults and apply only to the run filter router
    runid: {
        run: {

        },
        channelOptions: {
            variables: { silent: ['sampleVar'] },
            operations: { silent: false }
        }   
    }
});
```
** Using a Single Run Router**

There are two ways to route specific Flow.js custom HTML attributes to the run id:

* Preface the values of the attributes with the run id, e.g. `data-f-bind="000001593dd81950d4ee4f3df14841769a0b:variables:price"`.
* If your `Flow.initialize()` call ONLY includes `runid` options, then that run id is assumed to be the default for this page, and no preface is needed, e.g. `data-f-bind="price"`.

*Important!* Unlike other routers, the single run router always needs the channel ([variables](../variables-channel/), [operations](../operations-channel/), [meta](../meta-channel/)) to be specified. 

For example:
```html
<!-- using the single run preface -->
Set the price: 
<input data-f-bind="000001593dd81950d4ee4f3df14841769a0b:variables:price"></input>
Step the run:
<button data-f-on-click="000001593dd81950d4ee4f3df14841769a0b:operations:step()">Step</button>
View the sales for the year:
<span data-f-bind="000001593dd81950d4ee4f3df14841769a0b:variables:sales"></span>

<!-- if you are ONLY working with the single run filter, no preface needed (this is not common) -->
Set the price: <input data-f-bind="price"></input>
Step the run: <button data-f-on-click="step()">Step</button>
View the sales for the year: <span data-f-bind="sales"></span>

<!-- using the single run preface, where the id is pulled from a multiple runs router -->
<table border="1">
    <th>Step Runs for Each World</th>
    <tbody data-f-foreach="s in runs(scope.group=group1)" data-f-channel-include="finalScore">
        <tr><td>World: <%= s.scope.worldId =></td></tr>
        <tr><td>Step this run: 
            <button data-f-on-click="<%= s.id =>:operations:step()">Step</button>
        </td></tr>
    </tbody>
</table>
```

** Special Operations for the Single Run Router**

There are two reserved operations for a single run router:

* `reset`: Creates a new run.
* `remove`: Marks the run as removed (the inverse of marking it as saved).

For example:
```html
<div>Reset the run: <button data-f-on-click="<%= s.id =>:operations:remove()">Remove</button></div>
```