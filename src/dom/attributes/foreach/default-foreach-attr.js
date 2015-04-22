'use strict';
var parseUtils = require('../../../utils/parse-utils');
module.exports = {

    test: 'foreach',

    target: '*',

    handle: function (value, prop) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        var $loopTemplate = this.data('foreach-template');
        if (!$loopTemplate) {
            $loopTemplate = this.children();
            this.data('foreach-template', $loopTemplate);
        }
        var $me = this.empty();
        _.each(value, function (dataval, datakey) {
            dataval = dataval + '';
            var nodes = $loopTemplate.clone();
            nodes.each(function (i, newNode) {
                newNode = $(newNode);
                _.each(newNode.data(), function (val, key) {
                    var templated =  _.template(val, { value: dataval, index: datakey, key: datakey });
                    newNode.data(key, parseUtils.toImplicitType(templated));
                });
                var oldHTML = newNode.html();
                var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                if (oldHTML === cleanedHTML) {
                    // There's no template there
                    newNode.html(dataval);
                } else {
                    var templated = _.template(cleanedHTML, { value: dataval, key: datakey, index: datakey });
                    newNode.html(templated);
                }
                $me.append(newNode);
            });
        });
    }
};
