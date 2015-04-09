'use strict';

module.exports = {

    test: 'foreach',

    target: '*',

    handle: function (value, prop) {
        value = [].concat(value);
        var $children = this.children().remove();
        var $me = this;
        _.each(value, function (dataval, datakey) {
            var newNode = $children.clone();
            _.each(newNode.data(), function (val, key) {
                newNode.data(key, _.template(val, { i: dataval, key: datakey }));
            });
            var cleanedHTML = newNode.html().replace('&lt;', '<').replace('&gt;', '>');
            var templated = _.template(cleanedHTML, { i: dataval, key: datakey });
            newNode.html(templated);
            $me.append(newNode);
        });
    }
};
