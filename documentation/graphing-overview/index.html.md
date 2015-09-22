---
title: "Flow.js and Data Visualization: Graphing with Contour"
layout: "flow"
isPage: true
---

##Flow.js and Data Visualization: Graphing with Contour


Flow.js makes it easy to show data from your model variables in [text](../generated/dom/attributes/binds/default-bind-attr/) or [lists](../generated/dom/attributes/foreach/default-foreach-attr/). However, often you want more than just textual output &mdash; you want to visualize the results of your simulation!

One way to do this is to use Contour, an open source JavaScript library developed by Forio for interactive data visualization, based on <a href="http://d3js.org" target="_blank">d3.js</a>. Most of the [example projects](../../project_admin/#personal) in Epicenter use Contour for their graphs.

**To add a visualization to a page in your project:**

1. Include the Contour.js library and its dependencies on the page.
2. Create a new Contour chart on the page.
3. Use the Flow.js [Variables Channel](../generated/channels/variables-channel/) to subscribe to the model variable you want to graph.
4. In the callback function for your subscription, update and render the Contour chart.
5. Optionally, expand it to multiple variables.

Let's look at each step in more detail. You can also jump straight to the [complete example](#example).


**Step 1: Include the Contour.js library on the page.**

Add `contour.js` and `contour.css` to the page of your project where the visualization appears. Additionally, include `d3.js` and `lodash.js`, which are required by Contour.

	<html>
		<head>
			<link rel="stylesheet" href="https://forio.com/tools/contour/contour.min.css">
			<script src="yourPath/d3.min.js"></script>
			<script src="yourPath/lodash.js"></script>
			<script src="https://forio.com/tools/contour/contour.min.js"></script>
		</head>
		
		<body>
		</body>
		
	</html>

Including `contour.js` from the top-level `forio.com/tools/contour/` directory guarantees you'll always be using the latest version. If you want to work with a particular version of Contour, you can include the version number in the path:
	
	<script src="https://forio.com/tools/contour/1.0.1/contour.min.js"></script>

See more about [including Contour](http://forio.com/contour/documentation.html#quickstart).

**Step 2: Create a new Contour chart on the page.**

In JavaScript on the page of your project where the visualization appears, create a new Contour instance:

	var myChart = new Contour({
			el: '.myChart'
		})
		.cartesian()
		.line()
		.tooltip();

This code:

* Calls the Contour constructor, passing it a set of options. The `el` option is required; it is the selector of the container in which the Contour instance will eventually be rendered.
* Sets the frame for this set of visualizations (`.cartesian()` is the only currently available frame; it is required for all Contour visualizations except pie charts, so remove this line if you are making a pie chart).
* Adds two specific visualizations to this Contour instance: `line()` and `tooltip()`. The visualizations to add to your Contour chart are all optional, and which ones to include depends on what your final visualization should look like.

Note that unlike many common (static) uses of Contour, this code is *not* rendering the Contour instance just yet.

See more about [creating a new Contour chart](http://forio.com/contour/documentation.html#key_concepts).

**Step 3: Use the Variables Channel to subscribe to the model variable you want to graph.**

In Flow.js, you can use the [Variables Channel](../generated/channels/variables-channel/) to receive notifications when a model variable is updated. Because we want to update our visualization as a model variable changes, we subscribe to the variable. 

	Flow.channel.variables.subscribe('myVariable', function() { });


**Step 4: In the callback function for your subscription, update and render the Contour chart.**

The Flow.js [Variables Channel `subscribe()`](../generated/channels/variables-channel/) method's second argument is a callback function, called whenever the model variable is updated. We want to update and re-render our visualization each time the model variable changes:

	var myChartData = [];

	Flow.channel.variables.subscribe('myVariable',
		function(data) {
			myChartData.push(data.myVariable);
			myChart.setData(myChartData);
			myChart.render();
		});

The argument passed to the callback (`data`) is an object with the name and value of the variable. Here, we only need to add the value to the data set: `push(data.myVariable)`.


**Extension #1: Graphing multiple variables updated by the model.**

Using the Flow.js [Variables Channel](../generated/channels/variables-channel/), you can subscribe to multiple model variables at once, which allows you to use multiple variables at once in your visualization.

	var mySecondChartData = [];

	Flow.channel.variables.subscribe(['cost', 'price'], 
		function (data) {
			var composedData = {
				x: data.cost,
				y: data.price
			};
			mySecondChartData.push(composedData);
			mySecondChart.setData(mySecondChartData.push);
			mySecondChart.render();
		}, { batch: true });

Make sure to pass in the option `{ batch: true }` as the optional third argument to `subscribe()`. When `batch` is `true`, the callback function is only called once (rather than once for each variable to which you are subscribing). The argument passed to the callback (`data`) is an object with the names and values of both variables. The variable `composedData` uses the values to create an (x,y) data point to add to the data set we're graphing.

**Extension #2: Graphing multiple variables updated by the user.**

The approach in Extension #1 works well when `cost` and `price` are both updated as your model advances. You can also use Flow.js and Contour to graph multiple model variables whose values are input by the user.

First, have the user enter the values and click a button when finished:

	Enter x-coordinate: <input id="x"></input><br>
	Enter y-coordinate: <input id="y"></input></br>
	<button id="submitButton">Update x,y</button>

Then, call an operation from the model once the button is clicked, using the values entered by the user:

	$("#submitButton").click(function(){
		Flow.channel.operations.publish('updateXY', [$("#x").val(), $("#y").val()]);
	});

We use the `operations.publish()` to guarantee than any subscribers are notified of the call. (Using `Flow.channel.run.do()` also calls the operation, but does not update subscribers.)
	
Finally, use the Flow.js [Operations Channel](../generated/channels/operations-channel/) to subscribe to the operation you've just called. The second argument is a callback function, called whenever the model operation is called. We want to update and re-render our visualization each time this operation is called:

	var myThirdChartData = [];

	Flow.channel.operations.subscribe('updateXY',
			function(data) {
				var composedData = {
					x: data.updateXY.arguments[0],
					y: data.updateXY.arguments[1]
				};
				myThirdChartData.push(composedData);
				myThirdChart.setData(myThirdChartData);
				myThirdChart.render();
	});

The argument passed to the callback (`data`) is an object with the names and values of the arguments used to call the operation. The variable `composedData` uses these values to create an (x,y) data point to add to the data set we're graphing.


<a name="example"></a>
**Putting it all together.**

Here's the complete sample code:

<html>

	<head>

		<!-- for Contour -->
		<link rel="stylesheet" href="http://forio.com/tools/contour/contour.min.css">
		<script src="http://d3js.org/d3.v3.js"></script>
		<script src="http://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.js"></script>
		<script src="https://forio.com/tools/contour/contour.js"></script>

		<!-- for Flow.js -->
		<script src="//ajax.googleapis.com/ajax/libs/jquery/2.0.2/jquery.min.js"></script>
		<script src="https://forio.com/tools/js-libs/1.5.0/epicenter.min.js"></script>
		<script src="https://forio.com/tools/js-libs/flow/0.9.0/flow.js"></script>

	</head>

	<body>

		<p>Here is a div with the Contour chart, used in Steps 1-4: </p>

		<div class="myChart"></div>

		<p>The next data point is added to "myChart" (data-f-bind) each time the user enters a new value:</p>
		<input data-f-bind="sampleInt"></input>		
		<hr>

		<p>Here is a div with the Contour chart used in Extension #1, based on two variables updated automatically when the model is advanced: </p>

		<div class="mySecondChart"></div>

		<p><button data-f-on-click='advanceModel'>Advance Model</button></p>

		<hr>
		
		<p>Here is a div with the Contour chart used in Extension #2, based on two variables whose values are entered by the user: </p>

		<div class="myThirdChart"></div>

		<p>
			Enter x-coordinate: <input id="x"></input><br>
			Enter y-coordinate: <input id="y"></input></br>
			<button id="submitButton">Update x,y</button>
		</p>
		
		<script>

			Flow.initialize({
				channel: {
					run: { 
						model: 'supply-chain-game.py',
						account: 'acme-simulations',
						project: 'supply-chain-game'
					}
				}
			});

			// used in Extension #2
			$("#submitButton").click(function(){
				Flow.channel.operations.publish('updateXY', [$("#x").val(), $("#y").val()]);
			});	

			$(function () {
			
				// basic example: Steps 1-4
			
				var myChartData = [];
				var myChart = new Contour({
				        el: '.myChart'
				      })
				    .cartesian()
				    .line()
				    .tooltip();

				Flow.channel.variables.subscribe(['myVariable'],
					function(data) {
						myChartData.push(data.myVariable);
						myChart.setData(myChartData);
						myChart.render();
				});
				

				// Extension #1
				
				var mySecondChartData = [];
				var mySecondChart = new Contour({
						el: '.mySecondChart'
					})
					.cartesian()
					.line()
					.tooltip();
				
				Flow.channel.variables.subscribe(['sampleVar1', 'sampleVar2'],
					function(data) {
						var composedData = {
							x: data.sampleVar1,
							y: data.sampleVar2
						};
						mySecondChartData.push(composedData);
						mySecondChart.setData(mySecondChartData);
						mySecondChart.render();
					}, { batch: true });
			

				// Extension #2
				
				var myThirdChartData = [];
				
				var myThirdChart = new Contour({
					el: '.myThirdChart'
					})
					.cartesian()
					.line()
					.tooltip();

				Flow.channel.operations.subscribe('updateXY',
						function(data) {
							var composedData = {
								x: data.updateXY.arguments[0],
								y: data.updateXY.arguments[1]
							};
							myThirdChartData.push(composedData);
							myThirdChart.setData(myThirdChartData);
							myThirdChart.render();
				});

			});
			
		</script>
	
	</body>
	
	</html>			

####Learn More

* [Flow.js Variables Channel](../generated/channels/variables-channel/)
* [Contour Overview](http://forio.com/contour/)
* [Contour Gallery](http://forio.com/contour/gallery.html)
* [Contour Documentation](http://forio.com/contour/documentation.html)

