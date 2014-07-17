'use strict';

module.exports = {

    test: 'class',

    target: '*',

    handle: function(value, prop) {
        var addedClasses = this.data('added-classes');
        this.removeClass(addedClasses);

        this.addClass(value);
        this.data('added-classes', value);
    }
};
