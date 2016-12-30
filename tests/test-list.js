/**
 * List of tests to be required
 */

'use strict';

require('./specs/utils/test-general-utils');
require('./specs/channels/test-channel-manager');
require('./specs/dom/test-dom-manager');
require('./specs/converters/test-converter-manager');
require('./specs/dom/attributes/test-attribute-manager');
require('./specs/dom/test-default-input-node');
require('./specs/utils/test-parse-utils');

require('./specs/dom/attributes/test-default-foreach-attr');
require('./specs/dom/attributes/test-repeat-attr');
require('./specs/dom/attributes/test-default-bind-attr');

require('./specs/dom/plugins/test-auto-update-bindings');

require('./specs/add-ons/test-add-ons');
require('./specs/test-flow');
