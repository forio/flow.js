'use strict';

module.exports = {

    test: function () {

    },

    handle: function(prop, value) {
        var addedClasses = $(this).data('f-added-classes');
        $.each(addedClasses, function (index, cls) {
            $(this).removeClass(cls);
        });
        $(this).data('f-added-classes', [value]);
        this.$el.addClass(value);
    }
};
