## Boolean Conditional Converters

Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.

For a boolean conditional converter, the original format is your model variable, and the resulting "format" is a boolean value, or another value of your choosing.

There are two ways to specify conversion or formatting for the display output of a particular model variable:

* Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
* Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.

For example:
```html
<!-- displays "true" or "false" -->
<!-- in particular, true if sampleVar is truthy (1, true, 'some string', [] etc.), 
    false if sampleVar is falsy (0, false, '') -->
<span data-f-bind="sampleVar | toBool"></span>
```