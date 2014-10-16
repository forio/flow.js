<a name="0.6.4"></a>
## 0.6.4 (2014-10-13)

#### Enhancements

* Flowjs now has a logo! Thanks @andrewnatt

#### Bug fixes

* Resolved #18

<a name="0.6.3"></a>
## 0.6.3 (2014-09-24)

#### New Features

##### Array Converters
Flow.js now has Array converters for selecting particular elements of array variables from the models. The three new converters added are:

* first
* last
* previous

Example:
```html
 <div data-f-bind="somearray | last"> </div> <!-- print out last element of the array -->
```

If you don't specify any converters, flow.js prints out the last item of the array by default. This is useful if you're working with system dynamics models, since the last item in the array is typically the value for the current step.

However, any custom converters you apply to an array variable pipe receive the entire array.

Example:
```html
 <div data-f-bind="somearray | myCustomConverter"> </div> <!-- myCustomConverter receives entire array -->
```

##### Piping operations
You can now pipe operations similar to piping converters.

Example:
```html
<body data-f-on-init="start_game | step(10)">
```
`step` will be executed after the `start_game` completes.


<a name="0.6.2"></a>
## 0.6.2 (2014-09=03)

Bug fix for issue #8: Numbers with % are now divided by 100 during parse


<a name="0.6.1"></a>
## 0.6.1 (2014-08-27)

Enhancements release to remove a few annoyances

#### Enhancements

* Flow.version now reports the version of flow.js you're using
* We now strip out all the console.logs in the generated files so flow.js will now be much less noisier


<a name="0.6.0"></a>
## 0.6.0 (2014-08-26)

This release has seen a lot of work around converters as well as a host of bug-fixes and enhancements to our test converge.

#### New features

* Converters are now pipe-able. i.e., you can do

```
    <div data-f-bind="Price | max | $#,###"> </div>
```

* Flowjs now comes with the following default converters:
    - upperCase
    - lowerCase
    - titleCase
    - i (converts to integers)
    - s (converts to string)
    - Any excel-based number format

* Converters: support passing in ```'str', {convert: fn}``` syntax to ```register```
* Two-way-converters:  provide converters for inputs & outputs

You can now specify converters with ```parse``` as well as ```convert```
methods. ```parse``` will convert user input back to a raw form for
sending to APIs. This is only really relevant for input items, so only
applies to ```data-f-bind```

Example:

```
  Flow.converters.register('suffixUSD', {
    convert: function (val) {
        return val + ' USD';
    },
    parse: function (val) {
        return val.replace(' USD', '');
    }
  });
```

* NumberFormat converter is now two-way
```html <input data-f-bind="Price | $#,###"/> ``` will now convert print as formatted for displaying by convert to integer for saving back

#### Bug fixes

* Fixed issue with default state of radio-buttons
* Fixed issue with using data-f-class

#### Breaking Changes

* `data-f-format` has been renamed to `data-f-convert`
* Flowjs now does 'implicit type checking' for arguments to operations instead of always passing as strings. For e.g.

```html
<button data-f-on-click="operation(a,1)"> </button>
```
will now call the operation in the model with ```<string, integer>``` instead of ```<string, string>```
