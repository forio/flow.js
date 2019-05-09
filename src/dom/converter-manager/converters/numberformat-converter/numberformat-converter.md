## Number Format Converters

Converters allow you to change how data is displayed. They let you display the value of any model variable in a different format than it is stored in the model -- converting the output value from one format to another.

There are two ways to specify conversion or formatting for the display output of a particular model variable:

* Use the `|` (pipe) character within the value of any `data-f-` attribute. Converters are chainable, so you can apply several in a row to a particular variable.
* Add the attribute `data-f-convert` to any element to convert all of the model variables referenced within that element's scope.

For model variables that are numbers (or that have been [converted to numbers](../number-converter/)), there are several special number formats you can apply.

#### Currency Number Format

After the `|` (pipe) character, use `$` (dollar sign), `0`, and `.` (decimal point) in your converter to describe how currency should appear. The specifications follow the Excel currency formatting conventions.

**Example**
```html
<!-- convert to dollars (include cents) -->
<input type="text" data-f-bind="price[car]" data-f-convert="$0.00" />
<input type="text" data-f-bind="price[car] | $0.00" />

<!-- convert to dollars (truncate cents) -->
<input type="text" data-f-bind="price[car]" data-f-convert="$0." />
<input type="text" data-f-bind="price[car] | $0." />
```

#### Specific Digits Number Format

After the `|` (pipe) character, use `#` (pound) and `,` (comma) in your converter to describe how the number should appear. The specifications follow the Excel number formatting conventions.

**Example**
```html
<!-- convert to thousands -->
<input type="text" data-f-bind="sales[car]" data-f-convert="#,###" />
<input type="text" data-f-bind="sales[car] | #,###" />
```

#### Percentage Number Format

After the `|` (pipe) character, use `%` (percent) and `0` in your converter to display the number as a percent.

**Example**
```html
<!-- convert to percentage -->
<input type="text" data-f-bind="profitMargin[car]" data-f-convert="0%" />
<input type="text" data-f-bind="profitMargin[car] | 0%" />
```

#### Short Number Format

After the `|` (pipe) character, use `s` and `0` in your converter to describe how the number should appear.

The `0`s describe the significant digits.

The `s` describes the "short format," which uses 'K' for thousands, 'M' for millions, 'B' for billions. For example, `2468` converted with `s0.0` displays as `2.5K`.

**Example**
```html
<!-- convert to thousands (show 12,468 as 12.5K) -->
<span type="text" data-f-bind="price[car] | s0.0"></span>
```