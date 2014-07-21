'use strict';

//FIXME: short term hack
var transformer = require('../../../transforms/numberformat');

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (val) {
        var format = this.data('f-format') || '#';
        val = transformer.transform(val, format);
        this.html(val);
    }
};
