const _ = require('lodash');

const list = {
    reject: function (keyToReject, val) {
        return _.reject([].concat(val), keyToReject);
    },
    except: function (keyToReject, val) {
        return _.reject([].concat(val), keyToReject);
    },
    filter: function (key, val) {
        return _.filter([].concat(val), key);
    }
};
const converters = Object.keys(list).map((name)=> {
    return {
        alias: name,
        acceptList: true,
        convert: list[name]
    };
});

module.exports = converters;
