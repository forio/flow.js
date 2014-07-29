(function() {
    'use strict';

    var make = require('../../testing-utils').create;
    var domManager = require('../../../src/dom/dom-manager');

    describe('DOM Manager', function () {
        var dummyChannelManager;
        before(function (){
            var dummyChannel = {
                publish: $.noop,
                subscribe: $.noop,
                unsubscribe:  $.noop
            };

            dummyChannelManager = {
                variables: (dummyChannel),
                operations: (dummyChannel)
            };

        });

        after(function (){
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

            describe('UI Listeners', function () {
                it('should trigger the right event on ui change', function () {
                    var $textNode = $(make('<input type="text" data-f-bind="stuff"/>'));
                    domManager.initialize({
                        root: $textNode,
                        channel: dummyChannelManager
                    });
                    // $(textNode).val(6);

                    var spy = sinon.spy();
                    $textNode.on('update.f.ui', spy);
                    $textNode.trigger('change');

                    spy.should.have.been.called.once;
                });

                it('should bubble change events', function () {
                    var node = make('<div data-f-a="a"> <div class="abc"> <input type="text" data-f-b="stuff"/> </div> <span> nothing </span> </div>');

                    var $textNode = $(node).find(':text');

                    domManager.initialize({
                        root: node,
                        channel: dummyChannelManager
                    });
                    // $(textNode).val(6);

                    var textspy = sinon.spy();
                    $textNode.on('update.f.ui', textspy);

                    var parentSpy = sinon.spy();
                    $(node).find('.abc').on('update.f.ui', parentSpy);

                    var rootSpy = sinon.spy();
                    $(node).on('update.f.ui', rootSpy);


                    $textNode.trigger('change');

                    textspy.should.have.been.called.once;
                    parentSpy.should.have.been.called.once;
                    rootSpy.should.have.been.called.once;
                });

                it('should pass the right params to the event', function () {
                    var $textNode = $(make('<input type="text" data-f-bind="stuff"/>'));
                    domManager.initialize({
                        root: $textNode,
                        channel: dummyChannelManager
                    });
                    // $(textNode).val(6);

                    var spy = sinon.spy();
                    $textNode.on('update.f.ui', spy);
                    $textNode.val(5);
                    $textNode.trigger('change');

                    spy.should.have.been.called.once;
                    spy.args[0][1].should.eql({stuff: '5'});
                });

            });

            describe('Attribute Handlers', function () {
                var attrManager, initableHandler;
                before(function () {
                    initableHandler = {
                        init: $.noop
                    };

                    attrManager = {
                        getHandler: function () {
                            return initableHandler;
                        }
                    };
                });

                it('should find a handler', function () {

                });

            });
        });
    });

}());
