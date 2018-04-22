---
title: dom manager
layout: "flow"
isPage: true
---

<!-- module desc -->

## DOM Manager

The Flow.js DOM Manager provides two-way data bindings from your project's user interface to the channel. The DOM Manager is the 'glue' through which HTML DOM elements -- including the attributes and attribute handlers provided by Flow.js for [variables](../../attributes-overview/), [operations](../../operations-overview/) and [conversion](../../converter-overview/), and those [you create](./attributes/attribute-manager/) -- are bound to the variable and operations [channels](../../channel-overview/) to link them with your project's model. See the [Epicenter architecture details](../../../creating_your_interface/arch_details/) for a visual description of how the DOM Manager relates to the [rest of the Epicenter stack](../../../creating_your_interface/).

The DOM Manager is an integral part of the Flow.js architecture but, in keeping with our general philosophy of extensibility and configurability, it is also replaceable. For instance, if you want to manage your DOM state with [Backbone Views](http://backbonejs.org) or [Angular.js](https://angularjs.org), while still using the channels to handle the communication with your model, this is the piece you'd replace. [Contact us](http://forio.com/about/contact/) if you are interested in extending Flow.js in this way -- we'll be happy to talk about it in more detail.

## Configuration Options

### root

- *String*

Root of the element for flow.js to manage from.

### autoBind

- *Boolean*

Any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.

## Methods

### unbindElement
Unbind the element: unsubscribe from all updates on the relevant channels.

**Parameters**

- `element`: *DomElement* The element to remove from the data binding.

- `channel`: *ChannelInstance* (Optional) The channel from which to unsubscribe. Defaults to the [variables channel](../channels/variables-channel/).

**Return Value**

- **

### bindElement
Bind the element: subscribe from updates on the relevant channels.

**Parameters**

- `element`: *DomElement* The element to add to the data binding.

- `channel`: *ChannelInstance* (Optional) The channel to subscribe to. Defaults to the [run channel](../channels/run-channel/).

**Return Value**

- **

### bindAll
Bind all provided elements.

**Parameters**

- `elementsToBind`: *Array|jQuerySelector* (Optional) If not provided, binds all matching elements within default root provided at initialization.

**Return Value**

- **

### unbindAll
Unbind provided elements.

**Parameters**

- `elementsToUnbind`: *Array* (Optional) If not provided, unbinds everything.

**Return Value**

- **

### initialize
Initialize the DOM Manager to work with a particular HTML element and all elements within that root. Data bindings between individual HTML elements and the model variables specified in the attributes will happen via the channel.

**Parameters**

- `options`: *Object* (Optional) Overrides for the default options.

- `options.root`: *String* The root HTML element being managed by this instance of the DOM Manager. Defaults to `body`.

- `options.channel`: *Object* The channel to communicate with. Defaults to the Channel Manager from [Epicenter.js](../../../api_adapters/).

- `options.autoBind`: *Boolean* If `true` (default), any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.

**Return Value**

- **

