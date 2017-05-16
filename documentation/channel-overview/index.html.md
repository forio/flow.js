---
title: "Flow.js Channels"
layout: "flow"
isPage: true
---

## Flow.js: Channels


Channels are ways for Flow.js to talk to external APIs -- primarily the [underlying Epicenter APIs](../../creating_your_interface/).

Flow.js includes several channels for connecting with Epicenter, including: 

* [default](TODO): ??
* [runManager](TODO): TODO
* [scenarioManager](TODO): TODO
* [runId](TODO): TODO

Each channel can:

* `publish`: Send data to an external API, for example call an operation or update a model variable.
* `subscribe`: Receive notifications when data changes, for example when an operation is called or when a model variable is updated.

If you are adventurous you could create your own channels to talk to other sources (e.g. Google Docs).