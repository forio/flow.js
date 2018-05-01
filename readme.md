[![GitHub version](https://badge.fury.io/gh/forio%2Fflow.js.svg)](https://badge.fury.io/gh/forio%2Fflow.js) [![Build Status](https://travis-ci.org/forio/flow.js.svg?branch=master)](https://travis-ci.org/forio/flow.js) [![Coverage Status](https://coveralls.io/repos/github/forio/flow.js/badge.svg?branch=master)](https://coveralls.io/github/forio/flow.js?branch=master)

# Flow.js - Forio's Data-Binding Library

Flow.js provides a data binding between HTML elements in your user interface and variables and methods in your project's model.

In particular, flow.js provides a channel between your model and your interface components. You can add model variables directly into your HTML files, as nodes or attributes that are part of the DOM (document object model). Additionally, the values automatically update in your HTML file as the model changes; flow.js takes care of all of the details.

If you are most familiar with writing HTML and basic JavaScript, using flow.js can save you some development time as compared with the other Epicenter APIs. Using flow.js is also helpful for larger development teams (where the UI developers and the modelers are different people) because it separates your project's model from its interface.

See the full [documentation](https://forio.com/epicenter/docs/public/data_binding_flow_js/) for more details.

Questions?  Contact us at support@forio.com or file an issue on github!

## Getting started with development

To run locally
```
    npm install

    grunt
```
This will create a ```flow-edge.js``` file in ```dist/```. When you're happy with your changes do ```grunt release``` to increment version numbers and push.

&copy; Forio Corporation, 2018.  All rights reserved.
