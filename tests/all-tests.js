var blacklist = [
    'flow.js',
    'src/add-ons/',
];

require('./specs/utils/test-general-utils');
require('./specs/utils/test-parse-utils');
require('./specs/utils/test-dom-utils');

var sourceContext = require.context('../src/', true, /\.js$/i);
console.log(sourceContext.keys());
sourceContext.keys().filter((k)=> {
    var isBlacklisted = blacklist.filter((b)=> b.indexOf(k) !== -1).length > 0;
    return !isBlacklisted;
});
