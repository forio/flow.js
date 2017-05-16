<a name="1.0.0"></a>
## 1.0.0 (2017-05-2x)

This update includes several major, breaking changes. 

### New Feature: Channel Expansion

Channels are ways for Flow.js to talk to external APIs -- primarily the underlying Epicenter APIs. New in this release, the available Epicenter channels for connecting to Epicenter are: default, run manager, scenario manager, and run id. The previous variables and operations channels have been restructured. Together, these changes allow you to use Flow.js more easily in multipage projects and in scenario comparison projects.


##### Changes to Flow.initialize()

This is a **breaking change**. The options for a `Flow.initialize()` call have been restructured.

Previous versions of Flow.js had one `channel` option, which included `strategy` and `run` information:

	Flow.initialize({
		channel: {
			strategy: 'aStrategy',
			run: {
				account: 'teamId',
				project: 'projectId',
				model: 'model.py',
				variables: { silent: ['sampleVar'] },
				operations: { silent: false },
				server: { host: 'api.forio.com' }
			}
		}
	});


New in Flow.js version 1.0, there are options for `defaults`, `runManager`, and `scenarioManager`. Each of these can take `run`  and `channelOptions` information, and takes `strategy` information when relevant:

	Flow.initialize({
		// default options apply to all channels
		defaults: {
			run: { 
				account: 'teamId',
				project: 'projectId',
				model: 'model.py',
				server: { host: 'api.forio.com' }
			},
			channelOptions: {
				variables: { },
				operations: { }
			}
		},
		
		// runManager options apply only to the run manager channel
		runManager: {
			strategy: 'aStrategy',
			run: {
			
			},
			channelOptions: {
				variables: { silent: ['sampleVar'] },
				operations: { silent: false }			
			}
		},
		
		// scenarioManager options apply only to the scenario manager channel
		scenarioManager: {
			run: {
			
			},
			channelOptions: {
				variables: { silent: ['sampleVar'] },
				operations: { silent: false }
			}	
		}
	});


##### New Run Manager Channel

The Run Manager Channel connects Flow.js to the Epicenter.js [Run Manager](https://forio.com/epicenter/docs/public/api_adapters/generated/run-manager/), which allows you to interact with a single run. The current run that you are working with is determined by the run strategy used to create an initial run for your project.

Working with the Run Manager Channel was previously the default behavior in Flow.js. In version 1.0, it remains the default behavior, however, the way in which you specify options for it when initializing Flow has changed (see above).

Use the Run Manager Channel for common "turn by turn" projects. These are usually time-based and simulated one step at a time. For example, many projects that allow users to input data or change variables after each time step use this type.

	TODO - example


##### New Scenario Manager Channel

The Scenario Manager Channel connects Flow.js to the Epicenter.js [Scenario Manager](https://forio.com/epicenter/docs/public/api_adapters/generated/scenario-manager/), which allows you to interact with several different runs. 

Use the Scenario Manager Channel for "run comparison" or "scenario comparison" projects. In these projects, end users set some initial decisions, then simulate the model to its end. Typically end users will do this several times, creating several runs, and compare the results. To facilitate this, the Scenario Manager Channel provides access to a current run in which to make decisions; a list of saved runs (that is, all runs that you want to use for comparisons); and a baseline run to compare against (that is, a run advanced to the end of your model using just the model defaults).

	TODO-example


##### New Run ID Channel

The Run ID Channel connects Flow.js to the Epicenter.js [Run Manager](https://forio.com/epicenter/docs/public/api_adapters/generated/run-manager/), which allows you to interact with a single run. Unlike the Run Manager Channel, which works only with the "current" run defined by a particular strategy, the Run ID Channel works with a particular, existing run, specified by the run id.

	TODO-example

##### Changes to Addressing Attributes, Converters

TODO

TODO -- confirm "default" behavior wrt what options you've passed in (e.g. if you pass in only scenario mgr channel, is that the default??)

To use the default behavior -- which, as in previous releases, is a channel connecting Flow.js to the Epicenter.js [Run Manager](https://forio.com/epicenter/docs/public/api_adapters/generated/run-manager/) and a single, current run -- there is no change in how you reference model variables and operations from within attributes:

	TODO - example, with comments

Optionally, you can now preface these calls with TODO for clarity:

	TODO - example, with comments

To use the Scenario Manager Channel, you can TODO

	TODO - example, with comments

To use the Run ID Channel, you can TODO

	TODO - example, with comments

##### TODO - What to say about migrating existing use of variables, operations channels

TODO


### Improvements

There are also several improvements in this release, including:

* A `cache` argument for `channel.subscribe()`, which can improve performance. 

		// subscriber function "callback_withcache" is called 
		// only when if both price and cost are published together
		channel.subscribe(['price', 'cost'], callback_withcache, { batch: true, cache: true });
		
		// subscriber function "callback_withoutcache" is called
		// when either price or cost is published
 
	When `cache: true` is passed in, if the `subscribe()` call also takes a `batch: true` argument, then the `subscriber` argument is called only if all topics (variables) being subscribed to are published (updated) at once.

* TODO: other? bug fixes worth mentioning? (feature/travis, feature/unbind-generated)




<a name"0.11.0"></a>
## 0.11.0 (2016-12-14)

This update includes several new features:

* Both the `data-f-foreach` and the `data-f-repeat` attributes now support "aliasing": You can add an alias when you initially introduce your model variable in one of these attributes, then reference the alias in templates. This can simplify your template code, and also allows you to nest HTML elements that have repeated sub-elements.

	For example:
	
		<ul data-f-foreach="r in Regions">
			<li>Region <%= r %>: 
				<ul data-f-foreach="s in Sales">
					<li>Sales <%= s %></li>
				</ul>
			</li>
		</ul>
	
	See complete details and additional examples on the [data-f-foreach page](https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/dom/attributes/foreach/default-foreach-attr/) and the [data-f-repeat page](https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/dom/attributes/repeat-attr/). You can also learn more about [working with templates in Flow.js](https://forio.com/epicenter/docs/public/data_binding_flow_js/#templates).
	
* Both the [variables channel](https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/channels/variables-channel/) and the [operations channel](https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/channels/operations-channel/) now include a `readOnly` configuration option, so that you can allow using the channel for subscribing but disallow publishing. This is useful if you want to display information about the variables or operations without updating the run.

* Internal improvements, including removing the `bower` dependency and upgrading the `jQuery` support to jQuery 3 (matching Epicenter.js 2.0 and later).

* New `/src/config.js` lists all of the attributes used by Flow.js and the events triggered by Flow.js. 


<a name"0.10.0"></a>
## 0.10.0 (2015-12-29)

#### New Features

##### New attribute data-f-repeat

The `data-f-repeat` attribute allows you to automatically loop over a referenced variable. The most common use case is in time-based models, like those written in SimLang or Vensim, when you want to report the value of the variable at every time step so far. The `data-f-repeat` attribute automatically repeats the DOM element it's attached to, filling in the value.

For example, to create a table that displays the year and cost for every step of the model that has occurred so far:

```
<table>
     <tr>
         <td>Year</td>
         <td data-f-repeat="Cost[Products]"><%= index + 1 %></td>
     </tr>
     <tr>
         <td>Cost of Products</td>
         <td data-f-repeat="Cost[Products]"></td>
     </tr>
 </table>
```

In the third step of the model, this example generates the HTML:

```
 <table>
     <tr>
         <td>Year</td>
         <td data-f-repeat="Cost[Products]">1</td>
         <td>2</td>
         <td>3</td>
     </tr>
     <tr>
         <td>Cost of Products</td>
         <td data-f-repeat="Cost[Products]">100</td>
         <td>102</td>
         <td>105</td>
     </tr>
 </table>
```

More information available [in the documentation](http://forio.com/epicenter/docs/public/data_binding_flow_js/generated/dom/attributes/repeat-attr/).

##### New add-on feature: Flow Inspector

Flow Inspector is an add-on component of Flow.js that allows you to easily determine which model variables are being used where and in which Flow.js (`data-f-`) attributes in your user interface.

It's a great way to help you understand the connection between your UI and your model. It can also help to debug problems in your UI, whether you're a front-end developer or a modeler.

Once you've enabled Flow Inspector for a page in your project, you see two windows appear. The Legend window displays a legend of different kinds of Flow.js attributes (bind, loop, event, etc). The Context Window of Flow Inspector provides additional data on model variables and model operations. More information available [in the documentation](http://forio.com/epicenter/docs/public/data_binding_flow_js/inspector-overview/).

<a name"0.9.0"></a>
## 0.9.0 (2015-07-15)

#### New features
##### Variables Channel updates
- `subscribe` now takes in a `{batch: true}` option. Docs [here.](https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/channels/variables-channel/)
- `publish` now returns a promise.
- `unsubscribe` now only requires a token. You no longer need to pass in a variable name along with it.
- added `getTopicDependencies` to list out everyone who's listening for a particular topic
- The channel now takes in a `autoFetch` parameter on instantiation. See more details [here.](https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/channels/variables-channel/)

##### for-each attributes
You can now use `data-f-foreach` with arrays and objects. Usage in analogous to `data-f-bind`, specifics are noted [here.](https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/dom/attributes/foreach/default-foreach-attr/)

##### Live Binding
Flow.js now uses `MutationObservers` to listen for addition/removal of DOM changes after it has been initialized. This is especially useful if you're loading new content through ajax and don't want to call re-initialize every time. You can disable this behavior by setting

```javascript
Flow.initialize({
   dom: {
       autoBind: false
   }
});

```
##### Templates
Both `data-f-foreach` and `data-f-bind` allow using lodash templates for more control over your layout and display variables. See
(data-f-bind with multiple values and templates)[https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/dom/attributes/binds/default-bind-attr/] and (data-f-foreach)[https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/dom/attributes/foreach/default-foreach-attr/]


##### DOM Manager
- The DOM Manager now gives you more options to control binding/un-binding so you can synchronize the calls based on your applications timeline. Specifically, the following new methods have been added:
`unbindElement`
`bindElement`
`bindAll`
`unbindAll`
See an explanation [here.](https://forio.com/epicenter/docs/public/data_binding_flow_js/generated/dom/)

This only works in browsers which support `MutationObservers`, which works in IE11+ and the latest versions of Firefox/Chrome and other browsers

#### Breaking Changes
- `Flow.dom.converters.register` now takes in a 3rd argument `acceptLists` to indicate if that converter knows what to do with Arrays and Objects. If this is set to true, the converter get passed in the array once. If this is set to `false` we assume the converter does not know what to do with an array, and is then called once on each item in your source array.

This distinction is useful because it allows doing:

`Flow.dom.converters.convert(["100", "200", "300"], "$#,###.00")`

and get back `["$100.00", "$200.00", "$300.00"]` (since the formatting converter does not accept lists). This formatted value can now be passed to other converters for further transformations, or fed into a foreach.

The default is false, so older converters which didn't pass anything in will no longer work.


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
