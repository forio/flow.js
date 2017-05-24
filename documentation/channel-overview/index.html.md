---
title: "Flow.js Channels"
layout: "flow"
isPage: true
---

## Flow.js: Routers &amp; Channels


Routers allow Flow.js to route incoming requests to the correct underlying API.

Channels allow Flow.js to actually make requests of these underlying APIs.

Flow.js includes several routers for connecting with Epicenter, including: 
 
* [Run Manager Router](../generated/channels/run-manager-router/): Specifying a run manager router means requests are routed to the current run. This is the default behavior. Most of the examples (for instance, [displaying and updating model variables](../attributes-overview/)) use the run manager router.
* [Scenario Manager Router](../generated/channels/scenario-manager-router/): Specifying a scenario manager router means requests are routed to a set of runs, including `baseline`, `current`, and `saved`.
* [Run Filter Router](../generated/channels/filter-router/): Specifying a run filter router means requests are routed to a set of runs matching a particular query (for example, `saved=true` or `scope.group=group1`).

Every run accessed through a router includes three channels: 

* [Variables Channel](../generated/channels/variables-channel/): For model variables.
* [Operations Channel](../generated/channels/operations-channel/): For model operations.
* [Run Meta Channel](../generated/channels/meta-channel/): For metadata about the run (including both default run record fields and additional any metadata you may add)

Each channel can:

* `publish`: Send data to an external API, for example call an operation or update a model variable.
* `subscribe`: Receive notifications when data changes, for example when an operation is called or when a model variable is updated.
* [Learn more](../generated/channels/channel-manager/) about all of configuration options and methods available for each channel.

If you are adventurous you could create your own channels to talk to other sources (e.g. Google Docs).