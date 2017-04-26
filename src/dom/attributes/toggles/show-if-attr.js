module.exports = {
    test: 'showif',

    target: '*',

    handle: function (value, prop) {
        return value ? this.show() : this.hide();
    }
};
