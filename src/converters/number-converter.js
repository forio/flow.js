'use strict';
module.exports = {
    alias: 'i',
    convert: function (value) {
        return parseFloat(value, 10);
    }
};
