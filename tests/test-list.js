/**
 * List of tests to be required
 */

'use strict';
//FIXME: Doing the tests out of order doesn't work, which means something is leaking somewhere
// const componentsContext = require.context('./specs/', true, /\.js$/);
// componentsContext.keys().forEach(componentsContext);

require('./specs/utils/test-general-utils');
require('./specs/utils/test-parse-utils');
require('./specs/utils/test-dom-utils');
require('./specs/dom/test-dom-manager');
require('./specs/converters/test-converter-manager');
require('./specs/dom/attributes/test-attribute-manager');
require('./specs/dom/test-default-input-node');

require('./specs/dom/attributes/test-default-foreach-attr');
require('./specs/dom/attributes/test-repeat-attr');
require('./specs/dom/attributes/test-default-bind-attr');

require('./specs/dom/plugins/test-auto-update-bindings');
require('./specs/add-ons/test-add-ons');


require('./specs/channels/test-channel-manager');
require('./specs/channels/middleware/test-run-meta-channel');
require('./specs/channels/test-channel-util');
require('./specs/channels/test-channel-router');
require('./specs/channels/utils/test-silencable');

// require('./specs/test-flow');

// var srcContext = require.context('../src/', true, /\.js$/);
// srcContext.keys().forEach(srcContext);
require('../src/flow'); //directly require if you need to skip flow inspector
