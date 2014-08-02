(function() {
    'use strict';

    var utils = require('../../testing-utils');
    var make = utils.create;
    var dummyChannelManager = utils.createDummyChannel();
    var domManager = require('../../../src/dom/dom-manager');

    describe('DOM Manager', function () {
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

            describe('DOM Elements', function () {
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

                require('./element-tests/test-checkbox');
                require('./element-tests/test-radio-button');
                require('./element-tests/test-text');
                require('./element-tests/test-select');
                require('./element-tests/test-generic-dom');
            });

            describe('Attribute Handlers', function () {
                it('should copy attributes for anything it doesn\'t understand', function () {
                    var $node = $(make('<input type="text" data-f-fruit="apple" data-f-bind="stuff"/>'));
                    domManager.initialize({
                        root: $node,
                        channel: dummyChannelManager
                    });

                    $node.trigger('update.f.model', {apple: 'sauce'});
                    $node.prop('fruit').should.equal('sauce');
                });

                require('./attributes/test-negative-boolean-attr');
                require('./attributes/test-positive-boolean-attr');
            });

        });
    });

}());
