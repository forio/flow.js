const _ = require('lodash');

const list = {
    except: function (keyToReject, val) {
        return _.reject([].concat(val), keyToReject);
    },
    filter: function (key, val) {
        return _.filter([].concat(val), key);
    },
    any: function (key, val) {
        return _.some([].concat(val), key);
    },
    all: function (key, val) {
        return _.every([].concat(val), key);
    },
    find: function (key, val) {
        return _.find([].concat(val), key);
    },
};
const converters = Object.keys(list).map((name)=> {
    return {
        alias: name,
        acceptList: true,
        convert: list[name]
    };
});

module.exports = converters;
