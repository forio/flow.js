Priorities for generators

Give all binders an object, and use an object.observer shim?

Currently bind is the only 2 way attribute. Also make 'value', 'checked' two way?

Two operators, | and >

If you don't use > the contents of the div will be replaced by the variable.
<div data-f-bind="variable > myvar">
    <div data-f-bind="myvar.val">

    </div>
</div>


<div data-f-oninit="calculate(<#input1>, <#input2>)"></div> -- This will recalc when either of the inputs change
<div data-f-oninit="calculate(<#input1>, <#input2>) > result">
    <span data-f-bind="result.value1"> </span>
</div> -- To do this, need to do the channel regex, and also operation outputs


<ul data-f-oninit="calculate(<#input1>, <#input2>) > result">
    <li data-f-repeat="result[<key>]" > </span>
</ul>
