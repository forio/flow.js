/**
 * Hooks up dom elements to mutation observer
 * @param  {HTMLElement} target     root to start observing from
 * @param  {Object} domManager 
 * @param  {boolean} isEnabled Determines if it's enabled by default
 * @returns {Object}
 */
export default function (target, domManager, isEnabled) {
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
        attributeFilter: ['data-f-channel'],
        childList: true,
        subtree: true,
        characterData: false
    };
    var publicApi = {
        enable: function () {
            observer.observe(target, mutconfig);
        },
        disable: function () {
            observer.disconnect();
        }
    };
    if (isEnabled) {
        publicApi.enable();
    }
    return publicApi;
}
