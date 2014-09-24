'use strict';
module.exports = {
    list: function (val) {
        return [].concat(val);
    },
    last: function (val) {
        val = [].concat(val);
        return val[val.length - 1];
    },
    first: function (val) {
        val = [].concat(val);
        return val[0];
    },
    previous: function (val) {
        val = [].concat(val);
        return (val.length <= 1) ? val[0] : val[val.length - 2];
    }
};
