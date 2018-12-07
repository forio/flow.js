
##Allow reading result of previous operation

<div data-f-on-click="operations:solve(<#input1>) as sol1 | operations:somethingElse(<sol1.foo>)"></div>
<div data-f-on-bind="variables:Price as p | length(<p.children>)"></div> <!-- gets the children key from price -->
<div data-f-on-bind="variables:Price | length"></div> <!-- gets the return from price -->


##Build url router
```html
<ul data-f-foreach="item in https://reddit.com/json | pick('children')"></ul>
```

##Build new dom: router
- Matches on # or on dom:<any valid css selector>
<div data-f-on-click="variables:price[<#inp>,<#inp2>]"></div>

##Interpolate operation parameters as well

This'll get the value of the input at resolution time
<button data-f-on-click="submit(<#inp>)"></button>

This'll subscribe to input and change price whenever input changes
<div data-f-bind="price[<#inp>]"></div>

###Todos:
    - Implement a 'fetch' or 'once' method per channel

