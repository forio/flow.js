'use strict';

module.exports = function ($container, evtName) {
    var template = require('./debug-legend-panel.html');
    var $html = $(template);

    $container.append($html);
    $container.on('click', ':checkbox', function (evt) {
        var $target = $(evt.target);
        var type = $target.prev();
        $container.trigger(evtName, type);
    });
};
