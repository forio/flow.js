const { each } = require('lodash');

var panelManager = {
    list: {},
    register: function (alias, handler) {
        this.list[alias] = handler;
    },

    getPanel: function (alias) {
        return this.list[alias];
    }
};

//bootstraps
var availablePanels = {
    context: require('./context-show/context-show-panel'),
    filter: require('./legend-toggle/legend-panel')
};
each(availablePanels, function (panel, alias) {
    panelManager.register(alias, panel);
});

module.exports = panelManager;
