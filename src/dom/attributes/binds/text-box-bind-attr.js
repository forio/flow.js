'use strict';

//FIXME: short term hack
var transformer = require('../../../transforms/numberformat');

module.exports = {
    target: 'input',

    test: 'bind',

    handle: function (value) {
        var format = this.data('f-format');
        if (format) {
            value = transformer.transform(value, format);
        }
        this.val(value);
    }
};
