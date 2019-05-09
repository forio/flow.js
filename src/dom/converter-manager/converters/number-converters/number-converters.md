## Number Converters

Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.

There are two ways to specify conversion or formatting for the display output of a particular model variable:

* Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
* Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.