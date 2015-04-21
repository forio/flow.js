'use strict';

module.exports = function (target, domManager) {
    if (!window.MutationObserver) {
        return false;
    }

    // Create an observer instance
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        var added = [].slice.call(mutation.addedNodes);
        added = _.filter(added, function (node) {
            return node.nodeName !== '#text';
        });

        var removed = [].slice.call(mutation.removedNodes);
        removed = _.filter(removed, function (node) {
            return node.nodeName !== '#text';
        });
        if (added && added.length) {
            console.log('mutation observer added', added);
            domManager.bindAll(added);
        }
        if (removed && removed.length) {
            console.log('mutation observer removed', removed);
            domManager.unbindAll(removed);
        }
      });
    });

    // Configuration of the observer:
    var mutconfig = {
        attributes: false,
        childList: true,
        subtree: true,
        characterData: false
    };
    observer.observe(target, mutconfig);
    // Later, you can stop observing
    // observer.disconnect();
};
