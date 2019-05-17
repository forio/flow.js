## data-f-foreach

If your model variable is an array, you can reference specific elements of the array using `data-f-bind`: `data-f-bind="sales[3]"` or `data-f-bind="sales[<currentRegion>]"`, as described under [data-f-bind](../../binds/default-bind-attr/).

However, sometimes you want to loop over *all* of the children of the referenced variable. The `data-f-foreach` attribute allows you to automatically loop over all the 'children' of a referenced variable &mdash; that is, all the elements of an array, or all the fields of an object.

You can use the `data-f-foreach` attribute to name the variable, then use a combination of templates and aliases to access the index and value of each child for display. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)

**To display a DOM element based on an array variable from your model:**

1. Add the `data-f-foreach` attribute to any HTML element that has repeated sub-elements. The two most common examples are lists and tables. The `data-f-foreach` goes on the enclosing element. For a list, this is the `<ul>`, and for a table, it's the `<tbody>`.
2. Set the value of the `data-f-foreach` attribute in your top-level HTML element to reference the model array variable. You can do this either with or without introducing an alias to reference the array elements: `<ul data-f-foreach="Time"></ul>` or `<ul data-f-foreach="t in Time"></ul>`.
3. Add the HTML in which the value of your model array variable should appear. Optionally, inside this inner HTML element, you can use templates (`<%= %>`) to reference the `index` (for arrays) or `key` (for objects) and `value` to display, or to reference the alias you introduced. The `index`, `key`, and `value` are special variables that Flow.js populates for you. 

**Examples:**

**Basic use of data-f-foreach.** Start with an HTML element that has repeated sub-elements. Add the model variable to this HTML element. Then, add the HTML sub-element where your model variable should appear. 

By default, the `value` of the array element or object field is automatically added to the generated HTML:
```html
<!-- the model variable Time is an array of years
    create a list that shows which year -->

<ul data-f-foreach="Time">
    <li></li>
</ul>
```

In the third step of the model, this example generates the HTML:
```html
<ul data-f-foreach="Time">
    <li>2015</li>
    <li>2016</li>
    <li>2017</li>
</ul>
```

which appears as:
     * 2015
     * 2016
     * 2017

**Add templates to reference the index and value.** Optionally, you can use templates (`<%= %>`) to reference the `index` and `value` of the array element to display.
```html
<!-- the model variable Time is an array of years
    create a list that shows which year -->

<ul data-f-foreach="Time">
    <li> Year <%= index %>: <%= value %> </li>
</ul>
```

In the third step of the model, this example generates:
```html
<ul data-f-foreach="Time">
    <li>Year 1: 2015</li>
    <li>Year 2: 2016</li>
    <li>Year 3: 2017</li>
</ul>
```
which appears as:
* Year 1: 2015
* Year 2: 2016
* Year 3: 2017

**Add an alias for the value.** Alternatively, you can add an alias when you initially introduce your model array variable, then reference that alias within templates (`<%= %>`). For example:
```html
<ul data-f-foreach="(f) in Fruits">
    <li> <%= f %> </li>
</ul>
```

which generates:
```html
<ul data-f-foreach="(f) in Fruits">
    <li> apples </li>
    <li> bananas </li>
    <li> cherries </li>
    <li> oranges </li>
</ul>
```

**Nesting with aliases.** An advantage to introducing aliases is that you can nest HTML elements that have repeated sub-elements. For example:
```html
<!-- given Sales, an array whose elements are themselves arrays of the sales for each Region -->
<ul data-f-foreach="(r) in Regions">
    <li>Region <%= r %>: 
        <ul data-f-foreach="(s) in Sales[<%= r %>]">
            <li>Sales <%= s %></li>
        </ul>
    </li>
</ul>
```
**Logic, data processing.** Finally, note that you can add logic to the display of your data by combining templating with either the `value` or an alias. For example, suppose you only want to display the sales total if it is greater than 250:
```html
<table>
    <tbody data-f-foreach="(r) in regions">
        <tr data-f-foreach="(s) in sales">
            <td><%= r + ": " %> <%= (s > 250) ? s : "sales below threshold" %></td>
        </tr>
    </tbody>
</table>
```
(However, if you want to completely hide the table cell for the region if the sales total is too low, you still need to [write your own converter](../../../../../converter-overview).)

**Notes:**

* You can use the `data-f-foreach` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
* You can use nested `data-f-foreach` attributes to created nested loops of your data. 
* The `data-f-foreach`, whether using aliases or not, goes on the enclosing element. For a list, this is the `<ul>`, and for a table, it's the `<tbody>`.
* The template syntax is to enclose each code fragment (including `index`, `key`, `variable`, or alias) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).
* The `key`, `index`, and `value` are special variables that Flow.js populates for you. However, they are *no longer available* if you use aliases.
* As with other `data-f-` attributes, you can specify [converters](../../../../../converter-overview) to convert data from one form to another:
```html
<ul data-f-foreach="Sales | $x,xxx">
    <li> Year <%= index %>: Sales of <%= value %> </li>
</ul>
```

* The `data-f-foreach` attribute is [similar to the `data-f-repeat` attribute](../../loop-attrs/repeat-attr/), so you may want to review the examples there as well.

