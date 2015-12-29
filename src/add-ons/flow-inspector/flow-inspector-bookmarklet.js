'use strict';
(function () {
    if (!window.Flow) {
        window.alert('FlowJS not found on page'); //eslint-disable-line no-alert
        return;
    }
    var s = document.createElement('link');
    s.setAttribute('href', '//forio.com/tools/js-libs/flow/latest/add-ons/flow-inspector.css');
    s.setAttribute('rel', 'stylesheet');
    s.setAttribute('type', 'text/css');
    document.getElementsByTagName('head')[0].appendChild(s);

    var cb = function () {
        new window.Flow.Inspector('body');
    };
    var e = document.createElement('script');
    e.setAttribute('src', '//forio.com/tools/js-libs/flow/latest/add-ons/flow-inspector.min.js');
    e.onload = function () {
        e.onloadDone = true;
        cb();
    };
    e.onReadystatechange = function () {
        if (e.readyState === 'loaded' && !e.onloadDone) {
            e.onloadDone = true;
            return cb();
        }
    };
    document.body.appendChild(e);
}());
