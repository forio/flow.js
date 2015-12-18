'use strict';
var parseUtils = require('../../utils/parse-utils');
module.exports = {

    test: 'repeat',

    target: '*',

    handle: function (value, prop) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        var loopTemplate = this.data('repeat-template');
        if (!loopTemplate) {
            loopTemplate = this.get(0).outerHTML;
            this.data('repeat-template', loopTemplate);
        }
        // var $me = this.empty();
        _.each(value, function (dataval, datakey) {
            if (!dataval) {
                dataval = dataval + '';
            }
            var cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            var templatedLoop = _.template(cloop, { value: dataval, key: datakey, index: datakey });
            var isTemplated = templatedLoop !== cloop;
            var nodes = $(templatedLoop);

            nodes.each(function (i, newNode) {
                newNode = $(newNode).removeAttr('data-f-repeat');
                _.each(newNode.data(), function (val, key) {
                    newNode.data(key, parseUtils.toImplicitType(val));
                });
                if (!isTemplated && !newNode.html().trim()) {
                    newNode.html(dataval);
                }
            });
            nodes.insertBefore(this);
        }, this);
    }
};
