module.exports = {
    test: 'showif',

    target: '*',

    handle: function (value, prop) {
        if (_.isArray(value)) {
            value = value[value.length - 1];
        }
        return value ? this.show() : this.hide();
    }
};
