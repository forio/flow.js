'use strict';

module.exports = function (target, domManager) {
    if (navigator.userAgent.indexOf('PhantomJS') !==  -1) {
        return false;
    }

    // Create an observer instance
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        var added = mutation.addedNodes;
        added = _.filter(added, function (node) {
            return node.nodeName !== '#text';
        });

        var removed = mutation.removedNodes;
        removed = _.filter(removed, function (node) {
            return node.nodeName !== '#text';
        });
        if (added) {
            domManager.bindAll(added);
        }
        if (removed) {
            domManager.unbindAll(removed);
        }
      });
    });

    // Configuration of the observer:
    var mutconfig = {
        attributes: false,
        childList: true,
        characterData: false
    };
    observer.observe(target, mutconfig);
    // Later, you can stop observing
    // observer.disconnect();
};
