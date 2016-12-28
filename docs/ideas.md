Test: 
readonly mode - @done
batch subscriptions - @done
prefetch variables - @done
silent - @done
interpolation

- Run channel with init operation @done
- Run channel with silent init operation (pre-fetching shouldn't happen) ---- is there a reason?
    


publish  -> save -> refresh -> notify

#publish 
    - normalizes arguments
    - errors if readonly
    - does interpolation

    - Saves

#refresh
    <Force-pull from the server & notify>
    - Checks if silent
    - fetches
    - notify()

#notify
    <Notify everyone without actually saving>
    - finds listeners and updates
    - Checks if `batch`


#subscribe
    - Determines if needed to get data AT ONCE for topics



Option 1:

Create a central subscription manager which supports batch/pre-fetch etc
Plug in different 'data sources' - variables/ run etc.
Central channel manages *all* subscriptions

Option 2:
Make each channel inherit from the same subscription manager, and override publish/subs as required. This mean it keeps track of their own subscriptions


-----

DomManager should add default prefix

At worst, this should act as simple pubsub. .subsribe('Bluw') and .publish('sdfds') should work.


-- 
Silent mode:

When i PUBLISH a variable, I need to fetch the rest to know what else changed
    - variables: { silent: true } //There are no interdependent variables on the current step
    - operations: {
        silent: {
            except: ['price'] //only Step affects other variables
        }
    }

    * On variables channel, listen for all variable publishes
        ? Publish middleware which sits after variables.publish
        ? Just hijack the .then on publishInterceptor since it's on the same fn anyway
        ? Subscribe to operations from within the `init` code and trigger fetches that way
            x the whole point is to catch this _before_ subscribers get notified

When i PUBLISH an operation, i need to fetch variables to know what else changed
    - operations: { silent: true } //Operations don't affect variables
    - operations: {
        silent: {
            except: ['step'] //only Step affects variables
        }
    }

    * On variables channel, listen for all operation publishes
        ? Publish middleware which sits after operations.publish
        ? Just hijack the .then on publishInterceptor since it's on the same fn anyway
        ? Subscribe to operations from within the `init` code and trigger fetches that way
            x the whole point is to catch this _before_ subscribers get notified


Flow.publish('scenario:baseline:variables', { price: 20});

Flow.subscribe('scenario: baseline: variables');
Flow.subscribe('scenario: currentRun: variables');
Flow.subscribe('scenario: savedRuns');
    //only allowed operations are `add` and `remove`

Flow.subscribe('run:current:variables');
Flow.subscribe('run: <runid>:variables');
if runid not provided default to 'currentrun'


Flow.subscribe('<runid>:variables');
if no meta provided, default to 'currentRun'

== Flow.subscribe('Price'); == defaults to 'variables', defaults to currentrun

```html
<div data-f-bind="scenario:baseline:meta:name"></div>
<div data-f-bind="name" data-f-bind-context="scenario:baseline:meta:"></div>


<ul data-f-foreach="scenario:savedRuns">
    <li data-f-bind="<%= savedRuns[index] >:name"> </li>
    <li>
        <input type="checkbox" data-f-bind="<%= savedRuns[index] >:isSelected">
    </li>
</ul>
```

Once we have context
```html
<div data-f-context="scenario:baseline:meta">
    <label for="" data-f-bind="name"></label>
    <label for="" data-f-bind="../name"></label> -- NO
    <label for="" data-f-bind="price" data-f-context="run"></label> -- NO
</div>


<ul data-f-foreach="scenario:savedRuns">
    <li data-f-bind="<%= savedRuns[index] >:name"> </li>
    <li>
        <input type="checkbox" data-f-bind="<%= savedRuns[index] >:isSelected">
    </li>
</ul>

<div data-f-context="runid=X"> // toggling context should update everything within it
    <span data-f-bind="price"></span>
</div>
```
