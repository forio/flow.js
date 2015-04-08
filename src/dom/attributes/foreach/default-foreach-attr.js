'use strict';

module.exports = {

    test: 'foreach',

    target: '*',

    handle: function (value, prop) {
        value = [].concat(value);
        //Find parent
        // Clone self X times
        // Bind self
        // Add to parent
        //
        var $parent = this.parent();
        var $me = this.remove();
        _.each(value, function (dataval, datakey) {
            var newNode = $me.clone(true);
            _.each(newNode.data(), function (val, key) {
                newNode.data(key, _.template(val, { i: dataval, key: datakey }));
            });
            $parent.append(newNode);
            // newNode.html( _.template(new) );
        });
    }
};
