/**
 * List of tests to be required
 */

var srcContext = require.context('../src/', true, /tests\/test-(.*)\.js$/i);
srcContext.keys().forEach((key)=> {
    srcContext(key);
});

require('./specs/dom/test-dom-manager'); //2.7
require('./specs/dom/test-default-input-node');


// require('./specs/channels/test-channel-manager'); //0.6secons
// require('./specs/channels/test-channel-router'); //1.1 secs..
// require('./specs/test-flow'); Needs more work with testing timers


// require('../src/flow'); //directly require if you need to skip flow inspector
