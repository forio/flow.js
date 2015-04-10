'use strict';

module.exports = {

    test: 'foreach',

    target: '*',

    handle: function (value, prop) {
        value = (_.isObject(value) ? value : [].concat(value));
        var $children = this.children();
        var $me = this.empty();
        _.each(value, function (dataval, datakey) {
            dataval = dataval + '';
            var newNode = $children.clone();
            _.each(newNode.data(), function (val, key) {
                newNode.data(key, _.template(val, { value: dataval, index: datakey, key: datakey }));
            });
            var cleanedHTML = newNode.html().replace('&lt;', '<').replace('&gt;', '>');
            var templated = _.template(cleanedHTML, { value: dataval, key: datakey, index: datakey });
            newNode.html(templated);
            $me.append(newNode);
        });
    }
};
