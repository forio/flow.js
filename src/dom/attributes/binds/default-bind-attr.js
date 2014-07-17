'use strict';

//FIXME: short term hack
var transformer = require('../../../transforms/numberformat');

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (val) {
        val = transformer.transform(val, '#,###');
        this.html(val);
    }
};
