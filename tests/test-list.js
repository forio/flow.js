/**
 * List of tests to be required
 */

'use strict';

var srcContext = require.context('../src/', true, /tests\/test-(.*)\.js$/i);
srcContext.keys().forEach(srcContext);

require('./specs/utils/test-general-utils');
require('./specs/utils/test-parse-utils');
require('./specs/utils/test-dom-utils');
require('./specs/dom/test-dom-manager'); //2.7
require('./specs/converters/test-converter-manager');
require('./specs/dom/attributes/test-attribute-manager');
require('./specs/dom/test-default-input-node');

require('./specs/dom/attributes/test-default-foreach-attr');
require('./specs/dom/attributes/test-repeat-attr');
require('./specs/dom/attributes/test-default-bind-attr');

require('./specs/dom/plugins/test-auto-update-bindings');

require('./specs/channels/test-channel-manager'); //0.6secons
require('./specs/channels/middleware/test-run-meta-channel');
require('./specs/channels/test-channel-util');
require('./specs/channels/test-channel-router'); //1.1 secs..
require('./specs/channels/utils/test-silencable');

// require('./specs/test-flow'); Needs more work with testing timers


// require('../src/flow'); //directly require if you need to skip flow inspector
