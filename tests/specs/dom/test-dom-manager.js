(function() {
    'use strict';

    var NodeClass = require('../../../src/dom/attributes/binds/input-bind-attr');
    var make = require('../../testing-utils').create;


    var domManager = require('../../../src/dom/dom-manager');
    window.cm = require('../../../src/channels/channel-manager');

    describe('DOM Manager', function () {
        var makeView, dummyChannelManager;
        before(function (){
            var dummyChannel = {
                publish: $.noop,
                subscribe: $.noop,
                unsubscribe:  $.noop
            };
            dummyChannelManager = {
                variables: dummyChannel,
                operations: dummyChannel
            };

        });

        after(function (){
            makeView = null;
        });

        describe('#initialize', function () {
            describe('Selectors', function () {
                afterEach(function () {
                    domManager.private.matchedElements = [];
                });

                it('should select nothing by default', function () {
                    domManager.initialize({
                        channel: dummyChannelManager
                    });
                    domManager.private.matchedElements.length.should.equal(0);
                });

                it('should select single nodes', function () {
                    var textNode = make('<input type="text" data-f-bind="stuff"/>');
                    domManager.initialize({
                        root: textNode,
                        channel: dummyChannelManager
                    });
                    domManager.private.matchedElements.length.should.equal(1);
                });

                it('should select nested nodes', function () {
                    var textNode = make('<div data-f-bind="a"> <input type="text" data-f-bind="stuff"/> <span> nothing </span> </div>');
                    domManager.initialize({
                        root: textNode,
                        channel: dummyChannelManager
                    });
                    domManager.private.matchedElements.length.should.equal(2);
                });

                it('should select nested nodes with diff F attrs', function () {
                    var textNode = make('<div data-f-a="a"> <input type="text" data-f-b="stuff"/> <span> nothing </span> </div>');
                    domManager.initialize({
                        root: textNode,
                        channel: dummyChannelManager
                    });
                    domManager.private.matchedElements.length.should.equal(2);
                });
            });

        });
    });

}());
