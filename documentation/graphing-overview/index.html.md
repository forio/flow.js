---
title: "Flow.js and Data Visualization: Graphing with Contour"
layout: "flow"
isPage: true
---

## Flow.js and Data Visualization: Graphing with Contour


Flow.js makes it easy to show data from your model variables in [text](../generated/dom/attributes/binds/default-bind-attr/) or [lists](../generated/dom/attributes/foreach/default-foreach-attr/). However, often you want more than just textual output &mdash; you want to visualize the results of your simulation!

One way to do this is to use <a href="http://forio.com/contour/" target="_blank">Contour</a>, an open source JavaScript library developed by Forio for interactive data visualization, based on <a href="http://d3js.org" target="_blank">d3.js</a>. Most of the [example projects](../../project_admin/#personal) in Epicenter use Contour for their graphs.

**To add a visualization to a page in your project:**

1. Include the Contour.js library and its dependencies on the page.
2. Create a new Contour chart on the page.
3. Use the Flow.js [Variables Channel](../generated/channels/variables-channel/) to subscribe to the model variable you want to graph.
4. In the callback function for your subscription, update and render the Contour chart.
5. Optionally, graph multiple variables updated by a model operation.
6. Optionally, graph the results of an operation whose arguments are entered by the user.

Let's look at each step in more detail. You can also jump straight to the [complete example](#example).


**Step 1: Include the Contour.js library on the page.**

Add `contour.js` and `contour.css` to the page of your project where the visualization appears. Additionally, include `d3.js` and `lodash.js`, which are required by Contour.

	<html>
		<head>
			<link rel="stylesheet" href="//forio.com/tools/contour/contour.min.css">
			<script src="//d3js.org/d3.v3.js"></script>
			<script src="//cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.js"></script>
			<script src="//forio.com/tools/contour/contour.min.js"></script>
		</head>
		
		<body>
		</body>
		
	</html>

Including `contour.js` from the top-level `forio.com/tools/contour/` directory guarantees you'll always be using the latest version. If you want to work with a particular version of Contour, you can include the version number in the path:
	
	<script src="//forio.com/tools/contour/1.0.1/contour.min.js"></script>

See more about <a href="http://forio.com/contour/documentation.html#quickstart" target="_blank">including Contour</a>.

**Step 2: Create a new Contour chart on the page.**

In JavaScript on the page of your project where the visualization appears, create a new Contour instance:

	var myChart = new Contour({
			el: '.myChart'
		})
		.cartesian()
		.column()
		.tooltip();

This code:

* Calls the Contour constructor, passing it a set of options. The `el` option is required; it is the selector of the container in which the Contour instance will eventually be rendered.
* Sets the frame for this set of visualizations (`.cartesian()` is the only currently available frame; it is required for all Contour visualizations except pie charts, so remove this line if you are making a pie chart).
* Adds two specific visualizations to this Contour instance: `column()` and `tooltip()`. The visualizations to add to your Contour chart are all optional, and which ones to include depends on what your final visualization should look like.

Note that unlike many common (static) uses of Contour, this code is *not* rendering the Contour instance just yet.

See more about <a href="http://forio.com/contour/documentation.html#key_concepts" target="_blank">creating a new Contour chart</a>.

**Step 3: Use the Variables Channel to subscribe to the model variable you want to graph.**

In Flow.js, you can use the [Variables Channel](../generated/channels/variables-channel/) to receive notifications when a model variable is updated. Because we want to update our visualization as a model variable changes, we subscribe to the variable. 

	Flow.channel.subscribe('variables:myVariable', function() { });


**Step 4: In the callback function for your subscription, update and render the Contour chart.**

The Flow.js [Variables Channel `subscribe()`](../generated/channels/variables-channel/) method's second argument is a callback function, called whenever the model variable is updated. We want to update and re-render our visualization each time the model variable changes:

	Flow.channel.subscribe('variables:myVariable',
		function(data) {
			myChart.setData([data.myVariable]);
			myChart.render();
	});

The argument passed to the callback (`data`) is an object with the name and value of the variable to which we've subscribed. 

In this example, `myVariable` is a scalar value. Therefore, we need to explicitly place the value of `myVariable` into an array so that Contour knows how to graph it. Our Contour chart to will redraw with the new value each time the user changes it.

**Step #5: Optionally, graph multiple variables updated by a model operation.**

Using the Flow.js [Variables Channel](../generated/channels/variables-channel/), you can subscribe to multiple model variables at once, which allows you to use multiple variables at once in your visualization.

	<button data-f-on-click='advanceModel'>Advance Model</button>

	Flow.channel.subscribe(['cost', 'price'], 
		function (data) {
			var composedData = [
				{
					name: 'Cost',
					data: data.cost
				},
				{
					name: 'Price',
					data: data.price
				}
			];
			mySecondChart.setData(composedData);
			mySecondChart.render();
		}, { batch: true });

In this example, `cost` and `price` are both arrays (for example, tracking cost and price over time as the model advances). The updated values are being added as elements to existing array variables by the operation `advanceModel`.

Notice that we've included an optional third argument to `subscribe()`: the option `{ batch: true }`. When `batch` is `true`, the callback function is only called once (rather than once for each variable to which you are subscribing). So here, the argument passed to the callback (`data`) is an object with the names and values of both variables. 

**Step #6: Optionally, graph the results of an operation whose arguments are entered by the user.**

Using the Flow.js [Operations Channel](../generated/channels/operations-channel/), you can subscribe to a particular model operation, which allows you to update your visualization based on the results of that operation. In this example, the user inputs coordinates, which are translated by a model operation before being plotted.

First, have the user enter the values and click a button when finished:

	Enter x-coordinate: <input id="x" type="text"></input><br>
	Enter y-coordinate: <input id="y" type="text"></input></br>
	<button id="submitButton">Update x,y</button>

Then once the button is clicked, call an operation from the model, using the values entered by the user:

	$("#submitButton").click(function(){
		Flow.channel.publish('operations:updateXY', [$("#x").val(), $("#y").val()]);
	});

We use the `operations.publish()` to guarantee that any subscribers are notified of the call.

Finally, use the Flow.js [Operations Channel](../generated/channels/operations-channel/) to subscribe to the operation you've just called. The second argument is a callback function, called whenever the model operation is called. We want to update and re-render our visualization each time this operation happens:

	Flow.channel.subscribe('operations:updateXY',
		function(data) {
			var composedData = {
				x: data.updateXY.result[0],
				y: data.updateXY.result[1]
			};
			myThirdChartData.push(composedData);
			myThirdChart.setData(myThirdChartData);
			myThirdChart.render();
	});

The argument passed to the callback (`data`) is an object with two arrays: one containing the arguments to the operation, and the other containing the return value(s) of the operation. The variable `composedData` uses these return values to create a new (x,y) data point. Then, we need to explicitly add (`push`) this new data point onto the data set we're graphing.

<a name="example"></a>
**Putting it all together.**

Here's the complete sample code:

	<html>

	<head>

		<!-- for Contour -->
		<link rel="stylesheet" href="//forio.com/tools/contour/contour.min.css">
		<script src="//d3js.org/d3.v3.js"></script>
		<script src="//cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.js"></script>
		<script src="//forio.com/tools/contour/contour.js"></script>

		<!-- for Flow.js -->
		<script src="//ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>
		<script src="//forio.com/tools/js-libs/2.2.0/epicenter.min.js"></script>
		<script src="//forio.com/tools/js-libs/flow/latest/flow.js"></script>

	</head>

	<body data-f-model="supply-chain-game.py">

		<p>Here is a div with the Contour chart, used in Steps 1-4: </p>
		<div class="myChart"></div>
		<p>Each time the user enters a new value, we redraw the chart based on the new value:</p>
		<input data-f-bind="sampleInt"></input>
		<hr>

		<p>Here is a div with the Contour chart used in Step #5. The model operation updates two array variables, and the chart is updated based on that change: </p>
		<div class="mySecondChart"></div>
		<p><button data-f-on-click='advanceModel'>Advance Model</button></p>
		<hr>
		
		<p>Here is a div with the Contour chart used in Step #6. The user enters two values and calls a model operation that returns two (translated) values. The chart is updated based on the operation call: </p>
		<div class="myThirdChart"></div>
		<p>
			Enter x-coordinate: <input id="x" type="text"></input><br>
			Enter y-coordinate: <input id="y" type="text"></input></br>
			<button id="submitButton">Update x,y</button>
		</p>
		
		<script>

			Flow.initialize();

			// used in Step #6
			$("#submitButton").click(function(){
				Flow.channel.publish('operations:updateXY', [$("#x").val(), $("#y").val()]);
			});	

			
			// Basic Example: Steps #1-4. 
			// model variable myVariable is scalar
			var myChart = new Contour({
			        el: '.myChart'
			      })
			    .cartesian()
			    .column()
			    .tooltip();

			Flow.channel.subscribe('variables:myVariable',
				function(data) {
					myChart.setData([data.myVariable]);
					myChart.render();
			});
			

			// Step #5, graphing multiple variables updated by the operation
			// here, the operation requires no arguments
			var mySecondChart = new Contour({
					el: '.mySecondChart'
				})
				.cartesian()
				.line()
				.tooltip();
			
			Flow.channel.subscribe(['cost', 'price'],
				function(data) {
					var composedData = [
						{
							name: 'Cost',
							data: data.cost
						},
						{
							name: 'Price',
							data: data.price
						}
					];
					mySecondChart.setData(composedData);
					mySecondChart.render();
				}, { batch: true });
		

			// Step #6, graphing the results of a model operation
			// here, the arguments to the operation are entered by the user
			var myThirdChartData = [];
			var myThirdChart = new Contour({
				el: '.myThirdChart'
				})
				.cartesian()
				.line()
				.tooltip();

			Flow.channel.subscribe('operations:updateXY',
					function(data) {
						var composedData = {
							x: data.updateXY.result[0],
							y: data.updateXY.result[1]
						};
						myThirdChartData.push(composedData);
						myThirdChart.setData(myThirdChartData);
						myThirdChart.render();
			});

			
		</script>
	
	</body>
	
	</html>			

#### Learn More

* [Flow.js Variables Channel](../generated/channels/variables-channel/)
* [Flow.js Operations Channel](../generated/channels/operations-channel/)
* [Contour Overview](http://forio.com/contour/)
* [Contour Gallery](http://forio.com/contour/gallery.html)
* [Contour Documentation](http://forio.com/contour/documentation.html)
