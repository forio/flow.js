'use strict';
(function () {

    var utils = require('../../testing-utils');
    var make = utils.create;
    var dummyChannelManager = utils.createDummyChannel();
    var domManager = require('src/dom/dom-manager');

    describe('DOM Manager', function () {
        afterEach(function () {
            domManager.private.matchedElements = [];
        });
        describe('#initialize', function () {
            describe('Selectors', function () {

                it('should select nothing by default', function () {
                    domManager.initialize({
                        channel: dummyChannelManager
                    });
                    domManager.private.matchedElements.length.should.equal(0);
                });

                it('should select single nodes', function () {
                    var node = make('<input type="text" data-f-bind="stuff"/>');
                    domManager.initialize({
                        root: node,
                        channel: dummyChannelManager
                    });
                    domManager.private.matchedElements.length.should.equal(1);
                });

                it('should select nested nodes', function () {
                    var node = make('<div data-f-bind="a"> <input type="text" data-f-bind="stuff"/> <span> nothing </span> </div>');
                    domManager.initialize({
                        root: node,
                        channel: dummyChannelManager
                    });
                    domManager.private.matchedElements.length.should.equal(2);
                });

                it('should select nested nodes with diff F attrs', function () {
                    var node = make('<div data-f-a="a"> <input type="text" data-f-b="stuff"/> <span> nothing </span> </div>');
                    domManager.initialize({
                        root: node,
                        channel: dummyChannelManager
                    });
                    domManager.private.matchedElements.length.should.equal(2);
                });
            });

            describe('DOM Elements', function () {
                it('should bubble change events', function () {
                    var nested = [
                        '<div data-f-a="a">',
                        '   <div class="abc">',
                        '       <input type="text" data-f-bind="stuff"/>',
                        '   </div>',
                        '   <span> nothing </span>',
                        '</div>'
                    ];
                    var $node = utils.initWithNode(nested.join(), domManager);

                    var $textNode = $node.find(':text');

                    var textspy = sinon.spy();
                    $textNode.on('update.f.ui', textspy);

                    var parentSpy = sinon.spy();
                    $node.find('.abc').on('update.f.ui', parentSpy);

                    var rootSpy = sinon.spy();
                    $node.on('update.f.ui', rootSpy);


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

                require('./element-tests/test-button');
            });

            describe('Attribute Handlers', function () {
                require('./attributes/test-default-attr');
                require('./attributes/test-no-op-attr');
                require('./attributes/test-negative-boolean-attr');
                require('./attributes/test-positive-boolean-attr');
                require('./attributes/test-class-attr');
                require('./attributes/test-default-event-attribute');

                it('should allow handling custom attributes', function () {
                    var toggle = function (value) {
                        if (value !== 1) {
                            this.css('display', 'none');
                        } else {
                            this.css('display', 'block');
                        }
                    };
                    var toggleSpy = sinon.spy(toggle);
                    domManager.attributes.register('toggle', '*', toggleSpy);
                    var $node = utils.initWithNode('<input type="text" data-f-toggle="shouldIHide" data-f-bind="stuff"/>', domManager);
                    $node.trigger('update.f.model', { shouldIHide: 1 });

                    toggleSpy.should.have.been.called;
                    toggleSpy.should.have.been.calledWith(1);

                    $node.css('display').should.equal('block');

                    $node.trigger('update.f.model', { shouldIHide: 0 });
                    $node.css('display').should.equal('none');
                });
            });

            describe('Node Handlers', function () {
                require('./nodes/test-node-manager');
            });

            require('./test-dom-converters');
        });

        describe('#bindElement', function () {
            it('should bind elements added to the dom', function () {
                var node = make('<div data-f-bind="a"> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });

                $(node).append('<input type="text" data-f-bind="boo" />');
                var addedNode = $(node).find(':text');

                var textspy = sinon.spy();
                $(addedNode).on('update.f.ui', textspy);

                $(addedNode).val('hello').trigger('change');
                textspy.should.not.have.been.called;

                domManager.bindElement(addedNode);

                $(addedNode).val('hello1').trigger('change');
                textspy.should.have.been.calledOnce;
            });

            it('should update list of added items', function () {
                var node = make('<div data-f-bind="a"> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });

                $(node).append('<input type="text" data-f-bind="boo" />');
                var addedNode = $(node).find(':text');

                domManager.private.matchedElements.length.should.equal(1);
                domManager.bindElement(addedNode);
                domManager.private.matchedElements.length.should.equal(2);
            });
        });

        describe('#unbindElement', function () {
            it('should unbindElement elements added to the dom', function () {
                var node = make('<div data-f-bind="a"> <input type="text" data-f-bind="boo" /> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });

                var addedNode = $(node).find(':text');

                var textspy = sinon.spy();
                $(addedNode).on('update.f.ui', textspy);

                $(addedNode).val('hello').trigger('change');
                textspy.should.have.been.calledOnce;

                domManager.unbindElement(addedNode.get(0));

                $(addedNode).val('hello1').trigger('change');
                textspy.should.have.been.calledOnce;
            });
            it('should update list of added items', function () {
                var node = make('<div data-f-bind="a"> <input type="text" data-f-bind="boo" /> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });

                var addedNode = $(node).find(':text');

                domManager.private.matchedElements.length.should.equal(2);
                domManager.unbindElement(addedNode.get(0));
                domManager.private.matchedElements.length.should.equal(1);
            });
        });

        describe('#unbindAll', function () {
            it('should unbindElement all elements added to the dom', function () {
                var node = make('<div data-f-bind="a"> <input type="text" data-f-bind="boo" /> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });

                var addedNode = $(node).find(':text');

                var textspy = sinon.spy();
                $(addedNode).on('update.f.ui', textspy);

                $(addedNode).val('hello').trigger('change');
                textspy.should.have.been.calledOnce;

                domManager.unbindAll();

                $(addedNode).val('hello1').trigger('change');
                textspy.should.have.been.calledOnce;
            });
            it('should update list of added items', function () {
                var node = make('<div data-f-bind="a"> <input type="text" data-f-bind="boo" /> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });

                domManager.private.matchedElements.length.should.equal(2);
                domManager.unbindAll();
                domManager.private.matchedElements.length.should.equal(0);
            });
            it('should allow unbinding specified array of elements', function () {
                var node = make('<div data-f-bind="a"> <input type="text" data-f-bind="boo" />  <input type="text" data-f-bind="boos" /> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });

                domManager.private.matchedElements.length.should.equal(3);
                domManager.unbindAll([$(node).find(':text').get(0)]);
                domManager.private.matchedElements.length.should.equal(2);
            });
        });
        describe('#bindAll', function () {
            it('should bind elements from the root if no selector is provided', function () {
                var node = make('<div data-f-bind="a"> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });

                $(node).append('<input type="text" data-f-bind="boo" />');
                var addedNode = $(node).find(':text');

                var textspy = sinon.spy();
                $(addedNode).on('update.f.ui', textspy);

                $(addedNode).val('hello').trigger('change');
                textspy.should.not.have.been.called;

                domManager.bindAll();

                $(addedNode).val('hello1').trigger('change');
                textspy.should.have.been.calledOnce;
            });

            it('should update list of added items', function () {
                var node = make('<div data-f-bind="a"> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });
                domManager.private.matchedElements.length.should.equal(1);

                $(node).append('<input type="text" data-f-bind="boo" />');
                domManager.bindAll();
                domManager.private.matchedElements.length.should.equal(2);
            });

            it('should allow providing list of elements to bind', function () {
                var node = make('<div data-f-bind="a"> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });
                domManager.private.matchedElements.length.should.equal(1);

                $(node).append('<input type="text" data-f-bind="boo" /> <input type="text" data-f-bind="boos" /> <input type="text" data-f-bind="booss" />');
                domManager.bindAll($(node).find(':text').get().slice(0, 2));
                domManager.private.matchedElements.length.should.equal(3);
            });
            it('should allow providing jquery selector', function () {
                var node = make('<div data-f-bind="a"> </div>');
                domManager.initialize({
                    root: node,
                    channel: dummyChannelManager
                });
                domManager.private.matchedElements.length.should.equal(1);

                $(node).append('<div> <input type="text" data-f-bind="boo" /> <input type="text" data-f-bind="boos" /> </div> <div> <input type="text" data-f-bind="booss" /> </div>');
                domManager.bindAll($(node).find('div').get(0));
                domManager.private.matchedElements.length.should.equal(3);
            });
        });

        require('./test-dom-events');
    });
}());
