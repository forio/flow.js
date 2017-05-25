---
title: "Flow.js Channels"
layout: "flow"
isPage: true
---

## Flow.js: Routers &amp; Channels


Routers allow Flow.js to route incoming requests to the correct underlying API.

Channels allow Flow.js to actually make requests of these underlying APIs.

Flow.js includes several routers for connecting with Epicenter, including: 
 
* [Run Manager Router](../generated/channels/run-manager-router/): Specifying a run manager router means requests are routed to the current run. This is the default behavior; most of the examples (for instance, [displaying and updating model variables](../attributes-overview/)) use the run manager router without explicitly calling it.
* [Scenario Manager Router](../generated/channels/scenario-manager-router/): Specifying a scenario manager router means requests are routed to a set of runs, including `baseline`, `current`, and `saved`.
* [Run Filter Router](../generated/channels/run-filter-router/): Specifying a run filter router means requests are routed to a set of runs matching a particular query (for example, `saved=true` or `scope.group=group1`).
* [Run Id Router](../generated/channels/run-id-router/): Specifying a run id router menas requests are routed to a single existing run, based on the run id.

Every run accessed through a router includes three channels: 

* [Variables Channel](../generated/channels/variables-channel/): For retrieving and updating model variables. Many of the Flow.js custom HTML attributes (e.g. `data-f-bind`) use this channel.
* [Operations Channel](../generated/channels/operations-channel/): For calling model operations. Many of the Flow.js custom HTML attributes (e.g. `data-f-on-click`) use this channel.
* [Run Meta Channel](../generated/channels/meta-channel/): For metadata about the run (including both default run record fields and additional any metadata you may add).

Each channel can:

* `publish`: Send data to an external API, for example to call an operation or update a model variable.
* `subscribe`: Receive notifications when data changes, for example when an operation is called or when a model variable is updated.
* [Learn more](../generated/channels/channel-manager/) about all of configuration options and methods available for each channel.

If you are adventurous you could create your own channels to talk to other sources (e.g. Google Docs).