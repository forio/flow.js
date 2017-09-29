'use strict';

/**
 * Hooks up dom elements to mutation observer
 * @param  {HTMLElement} target     [description]
 * @param  {Object} domManager [description]
 * @return {void}
 */
module.exports = function (target, domManager) {
    if (typeof MutationObserver === 'undefined') {
        return;
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
        attributeFilter: ['data-f-channel'], //FIXME: Make this a config param
        childList: true,
        subtree: true,
        characterData: false
    };
    observer.observe(target, mutconfig);
    // observer.disconnect();
};
