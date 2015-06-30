---
title: "Flow.js Overview"
layout: "default"
isPage: true
---

##Flow.js: Overview

Flow.js provides data bindings between variables and operations in your project's model and HTML elements in your project's user interface. In this way, Flow.js decouples the model from its interface. This is beneficial as a general design principle, and can be especially helpful for larger development teams where the UI developers and the modelers are different people. If you are comfortable writing HTML and basic JavaScript, using Flow.js can save you significant development time.

In particular, Flow.js provides a channel between the variables and operations in your model and the HTML elements in your interface. You simply reference model variables directly within HTML elements, and these values automatically update as the model changes; Flow.js takes care of all of the details.


Learn more about the basics:

* [Using Flow.js in your project](#using_in_project)
* [Displaying and updating model variables](./attributes-overview/)
* [Converting and formatting data](./converter-overview/)
* [Calling model operations](./operations-overview/)

Learn more about advanced topics:

* [Working with templates](#templates)
* [Understanding channels](./channel-overview/)
* [Additional options for initializing](./generated/flow-js/)

**The current version of Flow is 0.9.0.** See the [Using Flow.js in your Project](#using_in_project) section below. You can also view the history of releases on <a href="https://github.com/forio/flow.js/releases/" "target=_blank">GitHub</a>.


<a name="using_in_project"></a>
###Using Flow.js in your Project

**To use Flow.js in your project:**

1. Add the Flow.js required libraries to your project. Flow.js requires the following files:
	* [`jquery.js`](http://jquery.com): document manipulation, DOM element selection, and event handling used by Flow.js
	* [`lodash.js`](http://lodash.com): utilities and performance enhancements used by Flow.js; also used in [templating](#templates)
	* [`epicenter.js`](https://forio.com/tools/js-libs/1.5.0/epicenter.min.js): [Epicenter API Adapters](../api_adapters/) with services and utilities for connecting to project models using the underlying Epicenter RESTful APIs.
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

The `Flow.initialize()` call optionally takes two argument: `channel`, which includes a `run`, and `dom`.

The `run` is an object that includes:
	
* `account`: Optional, **User ID** or **Team ID**
* `project`: Optional, **Project ID**
* `model`: Optional, name of primary model file (repeated from `data-f-model` in your HTML `<body>` tag)

These parameters are optional because the `run` information defaults correctly based on the location of your user interface file within your Epicenter project and the `data-f-model` element in your `<body>` tag. But you can add it if desired: 

		Flow.initialize({
			channel: {
				strategy: 'new-if-initialized',
				run: {
					model: 'supply-chain-game.py',
					account: 'acme-simulations',
					project: 'supply-chain-game'
				}
			}
		});
	
See more details on [customizing the Flow.initialize() method](./generated/flow-js/).


<a name="templates"></a>
####Working with Templates

Several common JavaScript libraries embed a simple template engine, including `lodash.js`, which Flow.js [already requires](#using_in_project)as one of its dependencies. You can use this templating in your project's user interface.

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


	<!-- use templates to display dynamic content
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

For more background on templates in `lodash.js`, see the <a href="https://lodash.com/docs#template" target="_blank">lodash documentation</a>. If you prefer to use <a href="http://underscorejs.org/#template" target="_blank">underscore</a> instead, that works too &mdash; just be sure to replace `lodash.js` with the `underscore.js` library in your page.
