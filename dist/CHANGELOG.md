<a name="0.8.2"></a>
### 0.8.2 (2014-12-01)
#### Bug fixes
Fixed #7 - `subscribe` on variables and operations channel now allow passing functions. Fpr e.g.,

```javascript
Flow.channel.variables.subscribe("sales", function(data) {
    console.log("Your sales is ", data.sales);
})
```

<a name="0.8.1"></a>
### 0.8.1 (2014-11-21)

#### Bug fixes

Fixed #21 - variables weren't getting fetched without an init operation.
Fixed bug where `except` wasn't working on the Operations channel

<a name="0.8.0"></a>
## 0.8.0 (2014-11-13)

#### New features

Flow.js now includes a 'silent mode' to allow more granular control over when UI updates happen. This can be controlled through the following ways

###### Silencing Channels

Each channel now takes in a 'silent' flag. For e.g.,

```javascript
Flow.initialize({
   channel: {
        run: {
            variables: {
                silent: true
            }
        }
   }
});
```
The value for `silent` can be one of a few different formats

- `silent: true` Never update the UI based on changes on this channel
- `silent: false` Always update the UI for *any* changes on this channel (Default behavior)
- `silent: ['price', 'sales']` Don't update the UI if `price` or `sales` change, but update on everything else. This is helpful if you know changing `price` or `sales` won't impact anything else in the UI directly
- `silent: { except: ['price', 'sales'] }` Converse of the above. Update UI when everything except `price` and `sales` change.

You can combine different update strategies across different channels. For instance, if you have a vensim model your outputs will typically only change when you step/reset/do some other operation, and not when a variables change. In such cases you can set it up as

```javascript
Flow.initialize({
   channel: {
        run: {
            variables: {
                silent: true
            },
            operations: {
                silent: false
            }
        }
   }
});
```

##### Silencing Updates

The `publish` method for each channel also takes in a options flag which lets you specific a `silent` flag. For e.g

```javascript
Flow.channel.variables.publish({ sales: 32 }, { silent: true })
```

Note that this can only be `true` or `false, since the first parameter convers the specificity.

##### f.convert event

There is now a new event you can trigger on elements to set values and trigger conversions. This has two forms:

````html
<input type="text" id="element" data-f-bind="price | $#,###.00" data-f-someattr="initialPrice | $#,###.00">
````
```javascript
$("#element").trigger('f.convert', 2000)
console.log($("#element").val()); //Will be $2,000.00.

$("#element").trigger('f.convert', {someattr: 2000})
console.log($("#element").prop('someattr')); //Will be $2,000.00.
```

This is useful if you want to update the UI element 'manually' without having to wait for a response from the model.

#### Bug fixes
- Issue 9: Issue with display interpolated and non-interpolated variables simultaneously
- Dom options are now correctly passed to the Dom Manager


<a name="0.7"></a>
## 0.7 (2014-10-17)

Flow.js now integrates with the Run Manager from the <a href="https://github.com/forio/epicenter-js-libs">Epicenter JS Libs </a>

#### Breaking Change
Documentation for the Run Manager itself is pending, but the immediate *breaking change* is the syntax for Flow.js initialization.

Before:

```javascript
Flow.initialize({
    channel: {
        account: 'bond',
        project: 'topsecret'
    }
});
```

Now:

```javascript
Flow.initialize({
    channel: {
        strategy: 'new-if-persisted',
        run: {
            account: 'bond',
            project: 'topsecret'
        }
    }
});
```

The channel options have now been moved into a 'run' key. You can pass in <a href="https://forio.com/epicenter/docs/public/api_adapters/generated/run-api-service/"> any parameter the Run Service takes </a> here. There is also a top-level 'strategy' field [Documentation forthcoming]

You should not see a noticeable difference in behavior if you're already using flow.js with an existing model - you'll get a new run each time you refresh. But now you can change that! Passing in a 'new-if-persisted' will re-use your existing run each time you refresh.

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
