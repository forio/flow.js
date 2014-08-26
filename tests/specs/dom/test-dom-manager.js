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

                it('should allow handling custom attributes', function () {
                    var toggle = function (value) {
                        if (value !== 1) {
                            this.css('display', 'none');
                        }
                        else {
                            this.css('display', 'block');
                        }
                    };
                    var toggleSpy = sinon.spy(toggle);
                    domManager.attributes.register('toggle', '*', toggleSpy);
                    var $node = utils.initWithNode('<input type="text" data-f-toggle="shouldIHide" data-f-bind="stuff"/>', domManager);
                    $node.trigger('update.f.model', {shouldIHide: 1});

                    toggleSpy.should.have.been.called;
                    toggleSpy.should.have.been.calledWith(1);

                    $node.css('display').should.equal('block');

                    $node.trigger('update.f.model', {shouldIHide: 0});
                    $node.css('display').should.equal('none');
                });
            });

            describe('Node Handlers', function () {
                require('./nodes/test-node-manager');
            });

            describe('converters', function () {
                before(function () {
                    domManager.converters.register('flip', function (val) {
                        return val.split('').reverse().join('');
                    });
                });
                describe('pipes', function () {
                    describe('bind', function () {
                        describe('convert', function () {
                            it('should convert values with single converters', function () {
                                var $node = utils.initWithNode('<input type="text" data-f-bind="apple | titleCase"/>', domManager);
                                $node.trigger('update.f.model', {apple: 'sauce'});

                                $node.val().should.equal('Sauce');

                            });
                            it('should convert values with multiple converters', function () {
                                domManager.converters.register('flip', function (val) {
                                    return val.split('').reverse().join('');
                                });

                                var $node = utils.initWithNode('<input type="text" data-f-bind="apple | titleCase | flip"/>', domManager);
                                $node.trigger('update.f.model', {apple: 'sauce'});

                                $node.val().should.equal('ecuaS');

                            });
                        });
                        describe('parse', function () {
                            it('should convert values with single converters', function () {
                                var channel = utils.createDummyChannel();
                                var $node = utils.initWithNode('<input type="text" data-f-bind="price | $#,### "/>', domManager, channel);
                                $node.val('2,345').trigger('change');
                                channel.variables.publish.should.have.been.calledWith({price: 2345});
                            });

                            it('should convert values with multiple converters', function () {
                                domManager.converters.register('flip', {
                                    parse: function (val) {
                                        return val.split('').reverse().join('');
                                    },
                                    convert: function (val) {
                                        return val.split('').reverse().join('');
                                    }
                                });

                                var channel = utils.createDummyChannel();
                                var $node = utils.initWithNode('<input type="text" data-f-bind="price | $#,### | flip"/>', domManager, channel);
                                $node.val('$2,345').trigger('change');
                                channel.variables.publish.should.have.been.calledWith({price: 5432});

                            });

                            it('should respect order of converters', function () {
                                domManager.converters.register('flips', {
                                    parse: function (val) {
                                        return 'abc';
                                    },
                                    convert: function (val) {
                                        val = val + '';
                                        return val.split('').reverse().join('');
                                    }
                                });

                                var channel = utils.createDummyChannel();
                                var $node = utils.initWithNode('<input type="text" data-f-bind="price | flips | $#,### "/>', domManager, channel);
                                $node.val('$2,345').trigger('change');
                                channel.variables.publish.should.have.been.calledWith({price: 'abc'});
                            });


                            it('should pass through values for converters without a parser', function () {
                                domManager.converters.register('flip', {
                                    convert: function (val) {
                                        return val.split('').reverse().join('');
                                    }
                                });

                                var channel = utils.createDummyChannel();
                                var $node = utils.initWithNode('<input type="text" data-f-bind="price | flip | $#,### "/>', domManager, channel);
                                $node.val('$2,345').trigger('change');
                                channel.variables.publish.should.have.been.calledWith({price: 2345});
                            });
                        });
                    });
                    describe('other attributes', function () {
                        it('should convert values with single converters', function () {
                            var $node = utils.initWithNode('<input type="text" data-f-stuff="apple | titleCase"/>', domManager);
                            $node.trigger('update.f.model', {apple: 'sauce'});

                            $node.prop('stuff').should.equal('Sauce');

                        });
                        it('should convert values with multiple converters', function () {
                            var $node = utils.initWithNode('<input type="text" data-f-stuff="apple | titleCase | flip"/>', domManager);
                            $node.trigger('update.f.model', {apple: 'sauce'});

                            $node.prop('stuff').should.equal('ecuaS');

                        });
                    });
                });
                describe('f-convert', function () {
                    it('should work if specified directly on the element', function () {
                        var $node = utils.initWithNode('<input type="text" data-f-bind="apple" data-f-convert="titleCase | flip"/>', domManager);
                        $node.trigger('update.f.model', {apple: 'sauce'});

                        $node.val().should.equal('ecuaS');
                    });
                    it('should work if specified on parent', function () {
                        var nested = [
                            '<div data-f-convert="titleCase | flip">',
                            '   <div class="abc">',
                            '       <input type="text" data-f-bind="apple"/>',
                            '   </div>',
                            '   <span> nothing </span>',
                            '</div>'
                        ];
                        var $node = utils.initWithNode(nested.join(), domManager);
                        var $textNode = $node.find(':text');

                        $textNode.trigger('update.f.model', {apple: 'sauce'});

                        $textNode.val().should.equal('ecuaS');
                    });
                    it('should local converters should override parent', function () {
                        var nested = [
                            '<div data-f-convert="titleCase">',
                            '   <div class="abc">',
                            '       <input type="text" data-f-bind="apple" data-f-convert="flip"/>',
                            '   </div>',
                            '   <span> nothing </span>',
                            '</div>'
                        ];
                        var $node = utils.initWithNode(nested.join(), domManager);
                        var $textNode = $node.find(':text');

                        $textNode.trigger('update.f.model', {apple: 'sauce'});

                        $textNode.val().should.equal('ecuas');
                    });
                });
            });
        });
    });

}());
