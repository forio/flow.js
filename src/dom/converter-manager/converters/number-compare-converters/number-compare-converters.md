## Number Comparison Converters

Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.

For a number comparison converter, the original format is your model variable, and the resulting "format" is a (possibly unrelated) value of your choosing. This resulting value is selected based on how the value of the model variable compares to a reference value that you pass to the converter.

There are two ways to specify conversion or formatting for the display output of a particular model variable:

* Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
* Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.

For example:

```html
<!-- displays "true" or the number of widgets -->
<span data-f-bind="widgets | greaterThan(50)"></span>

<!-- displays the first string if true, the second if false -->
<span data-f-bind="widgets | greaterThan(50, 'nice job!', 'not enough widgets')"></span>
```

You can also chain multiple converters to simulate evaluating multiple if\else conditions; for e.g. the following logic
```js
if (temperature > 80) {
    return 'hot';
} else if (temperature > 60) {
    return 'pleasant';
} else if (temperature >= 30) {
    return 'cold';
} else {
    return 'freezing!';
}
```
can be represented as

```html
<h4 data-f-bind="temperature | greaterThan(80, hot) | greaterThan(60, pleasant) | greaterThanEqual(30, cold, freezing!)"></h4>
```