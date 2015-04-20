'use strict';

module.exports = function ($root, domManager) {
    if (navigator.userAgent.indexOf('PhantomJS') !==  -1) {
        return false;
    }
    // The node to be monitored
    var target = $root[0];

    // Create an observer instance
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        console.log('mutation', mutation);
        var newNodes = mutation.addedNodes; // DOM NodeList
        if (newNodes !== null) { // If there are new nodes added
            var $nodes = $(newNodes); // jQuery set
            $nodes.each(function () {
                var $node = $(this);
                if ($node.hasClass('message')) {
                    // do something
                }
            });
        }
      });
    });

    // Configuration of the observer:
    var mutconfig = {
        attributes: true,
        childList: true,
        characterData: true
    };

    // Pass in the target node, as well as the observer options
    observer.observe(target, mutconfig);

    // Later, you can stop observing
    // observer.disconnect();


};
