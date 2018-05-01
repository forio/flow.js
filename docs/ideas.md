#Interpolate operation parameters as well

This'll get the value of the input at resolution time
<button data-f-on-click="submit(<#inp>)"></button>

This'll subscribe to input and change price whenever input changes
<div data-f-on-click="price[<#inp>]"></div>

##Todos:
    - Implement a 'fetch' or 'once' method per channel

#Build new dom: router
- Matches on # or on dom:<any valid css selector>
<div data-f-on-click="variables:price[<#inp>,<#inp2>]"></div>

#Build url router
```
<ul data-f-foreach="item in https://reddit.com/json | pick('children')"></ul>
```


## Add `-on` adapter to show output of operations? --- not different from bind?
```
<div data-f-when="submit">
<div data-f-when="#input">
```

#Make converters routes
This'll make it so you can do

```html
<tbody data-f-foreach="Employees | sortBy(<#lst-sort-field-selector>)"></tbody>
```

This'll mean the only concepts to be aware of are `&&` vs `|`
**Don't need to make it routes to do that, can just split it at the dom level. Do the js route first and then figure this out**

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

- Tried setting a [subscribe-status] attr on each el on bind, and removing it within the subscribe callback, but the subscribe callback isn't guaranteed to be called (i.e. it's technically only called if/when there is data)
    Will making subscribe a promise solve this?

- Tried changing 'init' method of bind to immediately store the data inside it on `init`, but this breaks for nested (when the parent foreach is triggered, the child foreach will have already replaced data?)
