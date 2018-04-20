
#Multiple runs

Implement as an interpolator? <saved=true> will translate to "<runidlengthstr>,id:2342", which will then be caught by custom run manager
    - This will take care of removing/adding, since we're unsubscribing
    - Trigger changes on this whenever savedruns.add/remove

- Translate <saved=true;trashed:false> to runid1,rundid2. 
- Bind on "saved" and "trashed" for each of those runs
- If any of those change, unsubscribe and refetch/intelligently remove runid from cache
- If anyone else is listening on saved:false they should know, so trigger refetch on everything listening on saved.
    + => Have a map of <property>:<value>:<runids>

-- Allow multiple interpolator definitions; each interpolator will have a "match" fn. So saved runs interpolator will keep track of saved runs
    - will listen for an "Bound" meta changes, like say, refetching everything listening on saved if specifically bound on saved


Also broadcast on runid:something whenever an indvidual run changes (i.e. run router would get id from meta and take care of it)
    - saved runs router can just listen on
    - Always have scenario and run managers bind on <runid:> for current run? They can unsubscribe on reset

##Saved runs

- Should be able to enumerate through them in a loop
    - Should be able to print run name and description
    - should be able to edit run name and description
    - should be able to list run variables
- should be able to add to saved runs
- should be able to remove from changed runs
- should be able to set and listen for custom run properties (like, say, a 'isSelected' property for charts)

This needs to know about the custom-run channel so it can intelligently refetch?

<table>
    <tbody data-f-foreach="run in savedruns:Price">
        <tr> <!-- Auto populate context? -->
            <td data-f-bind=""><%= run.name %></td>
        </tr>
    </tbody>
</table>
```
runs:variables:Price
```

runs(saved=true;trashed=false):variables:(Price, Sales) ? (one returns variables within run obj, other by itself?) - but if that was true, this wouldn't be :variables either


runs(saved=true;trashed=false):variables(Price, Sales) has different semantics than

runs(saved=true;.price=>10;variables=Price,Sales)
runs(saved=true)(Price,Sales)

runs(Price,Sales) --- defaults to saved:true

runs(saved=true)[Price,Sales] -- no because variable itself can have []

-- always returns back an array
-- intelligently refetches based on operation? (i.e. re-published saved=true only if that prop changes)

How to do operations?
<button data-f-on-click="runs:(<%= run.id %>):operations:remove">
<div data-f-bind="<%= run.id %>:meta:name"></div>
savedruns(Price,Sales)


<ul data-f-foreach="run in runs:saved=true;trashed=false:Price,Sales">
<div data-f-bind="runs:<runid>"> <!-- replacement for custom run channel -->
```


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

```html
<div class="decisons">
    <label for="">Price</label>
    <input type="text" data-f-bind="price">


    <label for="">run namae</label>
    <input type="text" data-f-bind="meta:name">

    <button data-f-on-click="savedruns:add && stepTo('end')">Save</button> <!-- make saveAndStep operation in flow handle this? -->
</div>

<table>
    <tbody>
        <tr data-f-foreach="baseline:Price">
            <td data-f-bind=""><%= value %></td>
        </tr>
        <td>
            
        </td>
    </tbody>
</table>   
```


