const _ = require('lodash');

var list = [];

var supported = [
    'values', 'keys', 'compact', 'difference',
    'union',
    'uniq', 'without',
    'xor', 'zip'
];
_.each(supported, function (fn) {
    var item = {
        alias: fn,
        acceptList: true,
        convert: function (val) {
            if ($.isPlainObject(val)) {
                return _.mapValues(val, _[fn]);
            }
            return _[fn](val);
        }
    };
    list.push(item);
});
module.exports = list;
