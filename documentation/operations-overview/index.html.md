---
title: "Flow.js Operations"
layout: "default"
isPage: true
---

##Flow.js: Operations


Flow.js provides a data binding not only between model variables and your project's user interface, but also between model operations and your project's user interface. 

By default, all HTML elements update for any call to an operation. However, you can prevent the user interface from updating -- either for all operations or for particular operations -- by setting the `silent` property when you initialize Flow.js. See more on [additional options for the Flow.initialize() method](../generated/flow-js/).


####How do I ... ?

* Call an operation from the model when the run is first created? 
	* Use the [`data-f-on-init` attribute](../generated/dom/attributes/events/init-event-attr/).
* Call an operation from the model on user action? 
	* Use a [`data-f-on-event` attribute](../generated/dom/attributes/events/init-event-attr/), for example `data-f-on-click`. 
* Call multiple operations at once? 
	* Use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed.


####Learn More

* [Default event attribute](../generated/dom/attributes/events/default-event-attr/)
* [Init event attribute](../generated/dom/attributes/events/init-event-attr/)

