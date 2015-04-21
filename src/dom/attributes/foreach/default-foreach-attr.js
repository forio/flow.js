'use strict';

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
            var newNode = $loopTemplate.clone();
            _.each(newNode.data(), function (val, key) {
                newNode.data(key, _.template(val, { value: dataval, index: datakey, key: datakey }));
            });
            var cleanedHTML = newNode.html().replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            var templated = _.template(cleanedHTML, { value: dataval, key: datakey, index: datakey });
            newNode.html(templated);
            $me.append(newNode);
        });
    }
};
