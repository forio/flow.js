---
title: "Flow.js Channels"
layout: "default"
isPage: true
---

##Flow.js: Channels


Channels are ways for Flow.js to talk to external APIs -- primarily the [underlying Epicenter APIs](../../../creating_your_interface/).

Flow.js includes channels for variables and operations to talk to Epicenter, but if you are adventurous you could create your own channels to talk to other sources (e.g. Google Docs).

Each channel can:

* `publish`: Send data to an external API, for example call an operation or update a model variable.
* `subscribe`: Receive notifications when data changes, for example when an operation is called or when a model variable is updated.


####Learn More

* [Operations Channel](../generated/channels/operations-channel/)
* [Variables Channel](../generated/channels/variables-channel/)

