module.exports = {
    test: 'hideif',

    target: '*',

    handle: function (value, prop) {
        return value ? this.show() : this.hide();
    }
};
