# Solve speed issue
The excel workforce model had a 50row x 5 binds and was too slow. Bulk of the time was on prefixing.

Instead of prefixing, just pass an array of prefixes and let the channel manager only send what matched?

#Make converters routes
This'll make it so you can do

```html
<tbody data-f-foreach="Employees | sortBy(<#lst-sort-field-selector>)"></tbody>
```

This'll mean the only concepts to be aware of are `&&` vs `|`
**Don't need to make it routes to do that, can just split it at the dom level. Do the js route first and then figure this out**
    - Doesn't this mean i can't do gs:A12 | run:regression?

#Silent mode:

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


#Reliably know when flow is done

Problem: There is no reliable way to know when an element is done being "loaded"
loaded - bound + subscribed + attr handler is done
Need consider nested items, both with and without templating 

Failed approaches:

- Tried setting a `[subscribe-status]` attr on each el on bind, and removing it within the subscribe callback, but the subscribe callback isn't guaranteed to be called (i.e. it's technically only called if/when there is data)
    Will making subscribe a promise solve this?
        -No, same issue. Subscribe isn't guaranteed to return data.

- Tried changing 'init' method of bind to immediately store the data inside it on `init`, but this breaks for nested (when the parent foreach is triggered, the child foreach will have already replaced data?)


## Google sheets

<div data-bind="gs:A12 as price | run:optimize(price)">


#Rejected ideas

## Add `-on` adapter to show output of operations? --- not different from bind?
```html
<div data-f-when="operations:js"> ===  <div daa-f-bind="operations:js">
<div daa-f-on-init="operations:js">
```

