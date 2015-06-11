---
title: "Flow.js Overview"
layout: "default"
isPage: true
---

##Flow.js: Overview

Flow.js provides a data binding between variables and operations in your project's model and HTML elements in your project's user interface. In this way, Flow.js decouples the model from its interface. This is beneficial as a general design principle, and can be especially helpful for larger development teams where the UI developers and the modelers are different people. If you are comfortable writing HTML and basic JavaScript, using Flow.js can save you significant development time.

In particular, Flow.js provides a channel between the variables and operations in your model and the HTML elements in your interface. You simply reference model variables directly within HTML elements, and these values automatically update as the model changes; Flow.js takes care of all of the details.


Learn more about the basics:

* [Using Flow.js in your project](#using_in_project)
* [Displaying and updating model variables](./attributes-overview/)
* [Converting and formatting data](./converter-overview/)
* [Calling model operations](./operations-overview/)

Learn more about more advanced topics:

* [Using templates](#templates)
* [Understanding channels](./channel-overview/)
* [Triggering variable updates manually](#trigger)
* [Additional options for initializing](#custom-initialize)



<a name="using_in_project"></a>
###Using Flow.js in your Project

**To use Flow.js in your project:**

1. Add the Flow.js required libraries to your project. Flow.js requires the following files:
	* [`jquery.js`](http://jquery.com): document manipulation, DOM element selection, and event handling used by Flow.js
	* [`lodash.js`](http://lodash.com): utilities and performance enhancements used by Flow.js
	* [`epicenter.js`](https://forio.com/tools/js-libs/1.0/epicenter.min.js): [Epicenter API Adapters](../api_adapters/) with services and utilities for connecting to project models using the underlying Epicenter RESTful APIs.
2. Add Flow.js itself to your project. The latest version of the Flow.js library is available from our set of tools: <a href="https://forio.com/tools/js-libs/flow/0.9.0/flow.min.js" target="_blank">https://forio.com/tools/js-libs/flow/0.8.1/flow.min.js</a>. (You can also review previous versions and detailed release notes on <a href="https://github.com/forio/flow.js/releases" target="_blank">GitHub</a>.)
3. Call the `Flow.initialize()` method. This tells Flow.js to create and initialize a run for you. (Runs are sets of particular user interactions with your project.)
4. In order to finish initializing a run, Flow.js needs to know the name of the model. Add the attribute `data-f-model` to the `<body>` tag. Set the value to the name of your [model file](../writing_your_model/).

**Example:**

		<html>
			<head>
				<script src="yourPath/jquery.min.js"></script>
				<script src="yourPath/lodash.js"></script>
				<script src="yourPath/epicenter.min.js"></script>
				<script src="yourPath/flow.js"></script>
				
				<script>
				$(function() { Flow.initialize(); });
				</script>
			</head>
			<body data-f-model="model.vmf">

			</body>
		</html>


**Notes:**

The `Flow.initialize()` call optionally takes an argument, `channel`, which includes a `run`.

The `run` is an object that includes:
	
* `account`: optional, **User ID** or **Team ID**
* `project`: optional, **Project ID**
* `model`: optional, name of primary model file (repeated from `data-f-model` in your HTML `<body>` tag)
* `server`: optional, with property `host`, the URL of the server (defaults to `api.forio.com`, used by all Epicenter accounts)

Typically only the `account`, `project`, and `model` are relevant for your project. Even then, this information is not needed, because it is implied by the location of your interface file within your Epicenter project and the `data-f-model` element in your `<body>` tag. But you can add it if desired: 

		Flow.initialize({
			channel: {
				strategy: 'new-if-initialized',
				run: {
					model: 'supply-chain-game.jl',
					account: 'acme-simulations',
					project: 'supply-chain-game'
				}
			}
		});
	
See more details on [customizing the Flow.initialize() method](#custom-initialize), below.




####TODO-move to Questions

You can bind variables from the model in your interface by adding the `data-f-` prefix to any standard DOM attribute. This attribute binding is **read-only**, meaning that as the model changes, the interface is automatically updated; but when users change values in the interface, no action occurs. 

**To display a DOM element based on a variable from the model:**

1. Add the prefix `data-f-` to any attribute in any HTML element that normally takes a value.
2. Set the value of the attribute to the name of the variable. 

**Examples:**

	<!-- input element displays value of sample_int, however,
		no call to the model is made if user changes sample_int --> 
	<input data-f-value="sample_int"></input>

**Notes:**

For [bi-directional binding](#display_update), see more information about the special `data-f-bind` attribute, above. 


####TODO-S/Z/J

Sometimes you want to do something with the value of a model variable besides just display it. For example, you might check or disable input elements based on the value. 

**To alter the properties of a DOM node based on the value of a model variable:**

1. Add the `data-f-` prefix to an attribute of an HTML element that alters its properties. For example, `data-f-disabled` and `data-f-checked` are attributes you might want to control based on a model variable. (To alter the appearance of an HTML element based on a model variable, see the [Styling](#styling) section, below.)
2. Set the value to the name of the variable. 

**Examples:**

	<!-- checked if allowedToAdvance is 1 or true -->
	<input type="checkbox" data-f-checked="allowedToAdvance"> Allowed to Advance? </input>

	<!-- disabled if allowedToAdvance is 0 or 'false' -->
	<button data-f-disabled="allowedToAdvance"> Advance to next round </button>


<a name="trigger"></a>
####TODO-update

TODO-update to be just about triggers

Finally, there is a event you can trigger on elements in order to set values and trigger conversions. This has two forms: 

	<input type="text" id="element" data-f-bind="price | $#,###.00" data-f-someattr="initialPrice | $#,###.00">

	$("#element").trigger('f.convert', 2000)
	console.log($("#element").val()); //Will be $2,000.00.

	$("#element").trigger('f.convert', {someattr: 2000})
	console.log($("#element").prop('someattr')); //Will be $2,000.00.

This is useful if you want to update a UI element "manually" without having to wait for a response from your project's model.



<a name="custom-initialize"></a>
####Additional Options for the Flow.initialize() Method

In the basic case, `Flow.initialize()` can be called without any arguments. While Flow.js needs to know the account, project, and model you are using, by default these values are implied by the location of your interface file within your Epicenter project and by the use of `data-f-model` in your `<body>` tag. 

However, sometimes you want to be explicit in your initialization call, and there are also some additional parameters that let you customize your use of Flow.js a little bit more.

Consider the following example:

    Flow.initialize({
        channel: {
            strategy: 'new-if-persisted',
            run: {
                model: 'supply-chain-game.jl',
                account: 'acme-simulations',
                project: 'supply-chain-game',
                server: { host: 'api.forio.com' },
                variables: { silent: ['price', 'sales'] },
                operations: { silent: false },
                transport: {
                    beforeSend: function() { $('body').addClass('loading'); },
                    complete: function() { $('body').removeClass('loading'); }
                }
            }
        }
    });

As discussed above, the [channel](#custom-channel) is ways to talk to external APIs, in this case the Epicenter APIs. 

The `channel` object is a parameter to `Flow.initialize()`. This object can include the following optional fields:

* `strategy`: A strategy for the [Run Manager](../api_adapters/strategy/), describing when to create new runs when an end user visits this page. The default is `new-if-persisted`, which creates a new run when the end user is idle for longer than your project's **Model Session Timeout** (configured in your project's [Settings](../updating_your_settings/)), but otherwise uses the current run.
* `run`: An object with information about each run created.

The `run` object can include several fields (all optional):

* `model`: Name of the primary model file for this project. (Repeated from `data-f-model` in your HTML `<body>` tag.) 
* `account`: The **User ID** or **Team ID** for this project.
* `project`: The **Project ID** for this project.
* `server`: With property `host`, the URL of the server. (Defaults to `api.forio.com`, used by all Epicenter accounts.)
* `variables`: Configuration options for the variables being listened to on this channel. Currently there is only one configuration option: `silent`.
* `operations`: Configuration options for the operations being listened to on this channel. Currently there is only one configuration option: `silent`.
* `transport`: An object which takes all of the jquery.ajax options at <a href="http://api.jquery.com/jQuery.ajax/" target="_blank">http://api.jquery.com/jQuery.ajax/</a>. (In the example above, the `transport` object is showing a loading screen whenever Flow.js talks to the project's model.)

<a name="silent"></a>
The `silent` configuration option for the `run.variables` and `run.operations` is a flag for providing more granular control over when user interface updates happen for changes on this channel. Values can be:

* `false`: Always update the UI for any changes (variables updated, operations called) on this channel. This is the default behavior.
* `true`: Never update the UI for any on changes (variables updated, operations called) on this channel.
* Array of variables or operations for which the UI *should not* be updated. For example, `variables: { silent: [ 'price', 'sales' ] }` means this channel is silent (no updates for the UI) when the variables 'price' or 'sales' change, and the UI is always updated for any changes to other variables. This is useful if you know that changing 'price' or 'sales' does not impact anything else in the UI directly, for instance.
* `except`: With array of variables or operations for which the UI *should* be updated. For example, `variables { silent: { except: [ 'price', 'sales' ] } }` is the converse of the above. The UI is always updated when anything on this channel changes *except* when the variables 'price' or 'sales' are updated. 

Although Flow.js provides a bi-directional binding between the model and the user interface, the `silent` configuration option applies only for the binding from the model to the user interface; updates in the user interface (including calls to operations) are still sent to the model.

Finally, as an implementation note: the `Flow.initialize()` call is based on the [Run Service](../api_adapters/generated/run-api-service/) from the [API Adapters](../api_adapters/). See those pages for additional information on parameters.


<a name="index"></a>
###Index of Common Attributes

You can use the `data-f-` as a prefix to any HTML attribute when working with Flow.js. Some of the most commonly used attributes are listed here. Click to jump to the documentation section above.

####Index of Common Attributes

* data-f-bind ([Default bind](./genereated/attributes/dom/binds/default-bind-attr/)), (TODO-L)
* data-f-value (TODO-Questions)
* data-f-disabled (TODO-S? TODO-U?)
* data-f-checked (TODO-Z? or TODO-J?)
* data-f-class (TODO-N)
* data-f-foreach (TODO-R)
* data-f-noop (TODO-T)
* data-f-on-init (TODO-Q)
* data-f-on-submit (TODO-P)


* [`data-f-bind`](#display_update): bind model variables to HTML elements 
* [`data-f-checked`](#special_handling): set an HTML element checked if model variable is true 
* [`data-f-class`](#styling): use value of model variable to determine CSS class for HTML element
* [`data-f-convert`](#converters): convert the model variable referenced in the data-f-bind of this HTML element to a different format, precision, or user-defined output
* [`data-f-disabled`](#special_handling): set an HTML element disabled if model variable is false
* [`data-f-model`](#using_in_project): set the name of the [model file](../writing_your_model/)
* [`data-f-on-click`](#methods): call the method from the model when HTML element clicked
* [`data-f-on-init`](#using_in_project): call the method from the model when the run is first created
* [`data-f-on-submit`](#methods): call the method from the model when HTML element submitted
