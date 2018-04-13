/**
 * List of tests to be required
 */

'use strict';

var srcContext = require.context('../src/', true, /tests\/test-(.*)\.js$/i);
srcContext.keys().forEach(srcContext);

require('./specs/utils/test-general-utils');
require('./specs/dom/test-dom-manager'); //2.7
require('./specs/dom/attributes/test-attribute-manager');
require('./specs/dom/test-default-input-node');

require('./specs/dom/attributes/test-default-foreach-attr');
require('./specs/dom/attributes/test-repeat-attr');

// require('./specs/channels/test-channel-manager'); //0.6secons
// require('./specs/channels/test-channel-router'); //1.1 secs..
// require('./specs/test-flow'); Needs more work with testing timers


// require('../src/flow'); //directly require if you need to skip flow inspector
