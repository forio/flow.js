<a name="0.6.0"></a>
## 0.6.0 (2014-08-26)

#### New features

* Converters are now pipe-able. i.e., you can do

```html
<div data-f-bind="Price | max | $#,###"> </div>
```

* Flowjs now comes with the following default converters:
- upperCase
- lowerCase
- titleCase
- i (converts to integers)
- s (conters to string)
- Any excel-based number format

* Converters: support passing in ```'str', {convert: fn}``` syntax to ```register```
* Two-way-converters:  provide converters for inputs & outputs
* NumberFormat converter is now two-way
```html <input data-f-bind="Price | $#,###"/> ``` will now convert print as formatted for displaying by convert to integer for saving back

#### Bug fixes

* Fixed issue with default state of radio-buttons
* Fixed issue with using data-f-class
* Binding with "|" syntax was not saving data to model on change

#### Breaking Changes

* `data-f-format` has been renamed to `data-f-convert`
* Flowjs now does 'implicit type checking' for arguments to operations instead of always passing as strings. For e.g.

```html
<button data-f-on-click="operation(a,1)"> </button>
```
will now call the operation in the model with ```<string, integer>``` instead of ```<string, string>```


<a name="0.9.0"></a>
## 0.9.0 (2014-08-26)

#### New features



You can now specify converters with ```parse``` as well as ```convert```
methods. ```parse``` will convert user input back to a raw form for
sending to APIs. This is only really relevant for input items, so only
applies to ```data-f-bind```
