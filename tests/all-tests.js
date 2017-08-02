var testsInSource = require.context('../src/', true, /tests\/test-(.*)\.js$/i);
testsInSource.keys().forEach(testsInSource);

require('../src/flow'); //directly require if you need to skip flow inspector
