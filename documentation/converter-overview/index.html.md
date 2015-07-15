---
title: "Flow.js Converters"
layout: "flow"
isPage: true
---

##Flow.js: Converters


Converters allow you to convert data -- for example, values of variables in your model that you display in your project's user interface -- from one form to another.

There are two ways to specify conversion or formatting for the display output of a particular model variable:

* Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
* Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).

Additionally, converters are chainable, so you can apply several in a row to a particular variable. Basic converting and formatting options are built in to Flow.js. You can also create your own.


####Learn More

* [Array Converters](../generated/converters/array-converter/)
* [Number Converters](../generated/converters/number-converter/)
* [Number Format Converters](../generated/converters/numberformat-converter/)
* [String Converters](../generated/converters/string-converter/)
* [Make your own](../generated/converters/converter-manager/)

