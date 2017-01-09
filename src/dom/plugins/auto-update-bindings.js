'use strict';

module.exports = function (target, domManager) {
    if (!window.MutationObserver) {
        return false;
    }

    // Create an observer instance
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            var added = $(mutation.addedNodes).find(':f');
            added = added.add($(mutation.addedNodes).filter(':f'));

            var removed = $(mutation.removedNodes).find(':f');
            removed = removed.add($(mutation.removedNodes).filter(':f'));

            if (added && added.length) {
                domManager.bindAll(added);
            }
            if (removed && removed.length) {
                domManager.unbindAll(removed);
            }
            if (mutation.attributeName === 'data-f-channel') {
                domManager.unbindAll(mutation.target);
                domManager.bindAll(mutation.target);
            }
        });
    });


    var mutconfig = {
        attributes: true,
        attributeFilter: ['data-f-channel'],
        childList: true,
        subtree: true,
        characterData: false
    };
    observer.observe(target, mutconfig);
    // Later, you can stop observing
    // observer.disconnect();
};
