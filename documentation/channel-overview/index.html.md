---
title: "Flow.js Channels"
layout: "flow"
isPage: true
---

## Flow.js: Routers &amp; Channels


Routers allow Flow.js to route incoming requests to the correct channel.

Channels allow Flow.js to actually make requests of the underlying APIs.

Flow.js includes several routers for connecting with Epicenter, including: 
 
* [Run Manager Router](../generated/channels/run-manager-router/): Specifying a run manager router means requests are routed to the current run. This is the default behavior; most of the examples (for instance, [displaying and updating model variables](../attributes-overview/)) use the run manager router, calling it implicitly.
* [Scenario Manager Router](../generated/channels/scenario-manager-router/): Specifying a scenario manager router means requests are routed to a set of runs, including `baseline`, `current`, and `saved`.
* [Multiple Runs Router](../generated/channels/multiple-runs-router/): Specifying a multiple runs router means requests are routed to a set of runs matching a particular filter (for example, `saved=true` or `scope.group=group1`). This router is a bit different from the others because it provides access to many runs rather than a particular run. This means that there is not a direct binding to information in a particular run; however, you can extract the run id and use that with [templating](../#templates) to bind to a specific model variable or model operation.
* [Single Run Router](../generated/channels/single-run-router/): Specifying a single run router means requests are routed to a single existing run, based on the run id.

Every run accessed through a router includes three channels: 

* [Variables Channel](../generated/channels/variables-channel/): For retrieving and updating model variables. Many of the Flow.js custom HTML attributes (e.g. `data-f-bind`) use this channel.
* [Operations Channel](../generated/channels/operations-channel/): For calling model operations. Many of the Flow.js custom HTML attributes (e.g. `data-f-on-click`) use this channel.
* [Meta Channel](../generated/channels/meta-channel/): For metadata about the run (including both default run record fields and any additional metadata you may add).

Each channel can:

* `publish`: Send data to an external API, for example to update a model variable or call a model operation.
* `subscribe`: Receive notifications when data changes, for example when a model variable is updated or a model operation is called.
* [Learn more](../generated/channels/channel-manager/) about all of the configuration options and methods available for each channel.

If you are adventurous you could create your own channels to talk to other sources (e.g. Google Docs).