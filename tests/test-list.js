/**
 * List of tests to be required
 */

'use strict';


// require all `src/components/**/index.js`
var testsContext = require.context('./specs/', true, /\.js$/);
testsContext.keys().forEach(testsContext);


 // require all `test/components/**/index.js`
var srcContext = require.context('../src/', true, /\.js$/);
srcContext.keys().forEach(srcContext);


// require('./specs/dom/test-dom-manager');
// require('./specs/converters/test-converter-manager');
// require('./specs/dom/attributes/test-attribute-manager');
// require('./specs/dom/test-default-input-node');
// require('./specs/utils/test-parse-utils');
// require('./specs/channels/test-run-channel');
// require('./specs/channels/test-variables-channel');
// require('./specs/channels/test-variables-timer');
// require('./specs/channels/test-operations-channel');

// require('./specs/dom/attributes/test-default-foreach-attr');
// require('./specs/dom/attributes/test-repeat-attr');
// require('./specs/dom/attributes/test-default-bind-attr');

// require('../src/flow');
// require('./specs/dom/plugins/test-auto-update-bindings');


// require('./specs/add-ons/test-add-ons');
// require('./specs/test-flow');


// // require all `test/components/**/index.js`
// const testsContext = require.context('../src/', true, /\.js$/);
// console.log(testsContext);
// // testsContext.keys().forEach(testsContext);

// // require all `src/components/**/index.js`
// const componentsContext = require.context('./specs/', true, /\.js$/);

// componentsContext.keys().forEach(componentsContext);
