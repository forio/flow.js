---
title: "Flow.js Converters"
layout: "flow"
isPage: true
---

## Flow.js: Converters


Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.

There are two ways to specify conversion or formatting for the display output of a particular model variable:

* Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable:
		
		<span data-f-bind="widgets | last | #,###"
	
* Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope:

		<div data-f-convert="$0.">
			<span data-f-bind="cost"></span>
			<span data-f-bind="revenue"></span>
		</div>

Basic converting and formatting options are built in to Flow.js. You can also create your own.


#### Learn More

* [Number Format Converters](../generated/converters/numberformat-converter/)
* [Number Comparison Converters](../generated/converters/number-compare-converter/)
* [Number Converters](../generated/converters/number-converter/)
* [Array Converters](../generated/converters/array-converter/)
* [Boolean Conditional Converters](../generated/converters/bool-conditional-converter/)
* [String Converters](../generated/converters/string-converter/)
* [Make your Own](../generated/converters/converter-manager/)

