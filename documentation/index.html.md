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
* [Additional options for initializing](#custom-initialize)

**The current version of Flow is 0.9.0.** See the [Using Flow.js in your Project](#using_in_project) section below. You can also view the history of releases on <a href="https://github.com/forio/flow.js/releases/" "target=_blank">GitHub</a>.


<a name="using_in_project"></a>
###Using Flow.js in your Project

**To use Flow.js in your project:**

1. Add the Flow.js required libraries to your project. Flow.js requires the following files:
	* [`jquery.js`](http://jquery.com): document manipulation, DOM element selection, and event handling used by Flow.js
	* [`lodash.js`](http://lodash.com): utilities and performance enhancements used by Flow.js; also used in [templating](#templates)
	* [`epicenter.js`](https://forio.com/tools/js-libs/1.0/epicenter.min.js): [Epicenter API Adapters](../api_adapters/) with services and utilities for connecting to project models using the underlying Epicenter RESTful APIs.
2. Add Flow.js itself to your project. The latest version of the Flow.js library is available from our set of tools: <a href="https://forio.com/tools/js-libs/flow/0.9.0/flow.min.js" target="_blank">https://forio.com/tools/js-libs/flow/0.9.0/flow.min.js</a>. (You can also review previous versions and detailed release notes on <a href="https://github.com/forio/flow.js/releases" target="_blank">GitHub</a>.)
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


<a name="templates"></a>
####Working with Templates

Several common JavaScript libraries embed a simple template engine, including both `lodash` and `underscore`. Flow.js [already requires](#using_in_project) the `lodash.js` library as one of its dependencies. You can replace `lodash.js` with `underscore.js` if you like. 

Then, start using templates in your project's user interface.

Some basic examples are [adding variables to an enclosing tag](./generated/dom/attributes/binds/default-bind-attr/) and [working with array variables](./generated/dom/attributes/foreach/default-foreach-attr/):

	<div data-f-bind="CurrentYear, Revenue, Profit">
		In <%= CurrentYear %>, 
		our company earned <%= Revenue %>, 
		resulting in <%= Profit %>.
	</div>

	<ul data-f-foreach="Time">
		<li> Year <%= index %>: <%= value %> </li>
	</ul>

But don't feel limited by these examples &mdash; you can use templates throughout your project's user interface code if you're using Flow.js.

Here are a few additional examples to get you started:

	<!-- use templates to perform calculations easily -->
	
	You have <strong data-f-bind="Time"><%= 2020 - value %></strong> years remaining in your simulation.


	<!-- use templates to display particular content
			this is particularly useful for multiplayer games
			safe for Chrome, Firefox, Safari, and IE11+ -->
	
	<div id="importantInfo"></div>
	
	<script>
		if (condition) {
			$(#importantInfo).append("<h2 data-f-bind='Revenue'></h2>");
		} else {
			$(#importantInfo).append("<h2 data-f-bind='Sales'></h2>");
		}
	</script>

For more background on templates in `lodash.js`, see the <a href="https://lodash.com/docs#template" target="_blank">lodash documentation</a>. If you prefer to use <a href="http://underscorejs.org/#template" target="_blank">underscore</a> instead, that works too &mdash; just be sure to include the `underscore.js` library in your page.



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


