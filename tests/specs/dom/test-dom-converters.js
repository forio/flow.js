module.exports = (function () {
    'use strict';
    var domManager = require('src/dom/dom-manager');
    var utils = require('../../testing-utils');

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
                        $node.trigger('update.f.model', {
                            apple: 'sauce'
                        });

                        $node.val().should.equal('Sauce');
                    });

                    it('should convert values with multiple converters', function () {
                        domManager.converters.register('flip', function (val) {
                            return val.split('').reverse().join('');
                        });

                        var $node = utils.initWithNode('<input type="text" data-f-bind="apple | titleCase | flip"/>', domManager);
                        $node.trigger('update.f.model', {
                            apple: 'sauce'
                        });
                        $node.val().should.equal('ecuaS');
                    });

                    describe('arrays', function () {
                        it('should convert arrays into values without converters', function () {
                            var $node = utils.initWithNode('<input type="text" data-f-bind="apple"/>', domManager);
                            $node.trigger('update.f.model', {
                                apple: [1,2,3]
                            });
                            $node.val().should.equal('3');
                        });

                        it('should pass arrays into converters if defined', function () {
                            var spy = sinon.spy();
                            domManager.converters.register('spy', spy, true);
                            var $node = utils.initWithNode('<input type="text" data-f-bind="apple | spy"/>', domManager);
                            $node.trigger('update.f.model', {
                                apple: [1,2,3]
                            });

                            spy.should.have.been.calledWith([1,2,3]);
                        });
                    });
                });
                describe('parse', function () {
                    it('should convert values with single converters', function () {
                        var channel = utils.createDummyChannel();
                        var $node = utils.initWithNode('<input type="text" data-f-bind="price | $#,### "/>', domManager, channel);
                        $node.val('2,345').trigger('change');
                        channel.variables.publish.should.have.been.calledWith({
                            price: 2345
                        });
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
                        channel.variables.publish.should.have.been.calledWith({
                            price: 5432
                        });

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
                        channel.variables.publish.should.have.been.calledWith({
                            price: 'abc'
                        });
                    });


                    it('should pass through values for converters without a parser', function () {
                        domManager.converters.register('flip', {
                            convert: function (val) {
                                return (val + '').split('').reverse().join('');
                            }
                        });

                        var channel = utils.createDummyChannel();
                        var $node = utils.initWithNode('<input type="text" data-f-bind="price | flip | $#,### "/>', domManager, channel);
                        $node.val('$2,345').trigger('change');
                        channel.variables.publish.should.have.been.calledWith({
                            price: 2345
                        });
                    });
                });
            });
            describe('other attributes', function () {
                it('should convert values with single converters', function () {
                    var $node = utils.initWithNode('<input type="text" data-f-stuff="apple | titleCase"/>', domManager);
                    $node.trigger('update.f.model', {
                        apple: 'sauce'
                    });

                    $node.prop('stuff').should.equal('Sauce');

                });
                it('should convert values with multiple converters', function () {
                    var $node = utils.initWithNode('<input type="text" data-f-stuff="apple | titleCase | flip"/>', domManager);
                    $node.trigger('update.f.model', {
                        apple: 'sauce'
                    });

                    $node.prop('stuff').should.equal('ecuaS');

                });
            });
        });
        describe('f-convert', function () {
            describe('convert', function () {
                it('should work if specified directly on the element', function () {
                    var $node = utils.initWithNode('<input type="text" data-f-bind="apple" data-f-convert="titleCase | flip"/>', domManager);
                    $node.trigger('update.f.model', {
                        apple: 'sauce'
                    });

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

                    $textNode.trigger('update.f.model', {
                        apple: 'sauce'
                    });

                    $textNode.val().should.equal('ecuaS');
                });
                it('should allow local converters to override parent', function () {
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

                    $textNode.trigger('update.f.model', {
                        apple: 'sauce'
                    });

                    $textNode.val().should.equal('ecuas');
                });
            });
            describe('parse', function () {
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
                    var $node = utils.initWithNode('<input type="text" data-f-bind="price" data-f-convert="$#,### | flip"/>', domManager, channel);
                    $node.val('$2,345').trigger('change');
                    channel.variables.publish.should.have.been.calledWith({
                        price: 5432
                    });
                });
                it('should allow parse nested converters', function () {
                    var nested = [
                        '<div data-f-convert="$#,### | flip">',
                        '   <div class="abc">',
                        '       <input type="text" data-f-bind="price"/>',
                        '   </div>',
                        '   <span> nothing </span>',
                        '</div>'
                    ];
                    var channel = utils.createDummyChannel();
                    var $node = utils.initWithNode(nested.join(), domManager, channel);
                    var $textNode = $node.find(':text');

                    $textNode.val('$2,345').trigger('change');
                    channel.variables.publish.should.have.been.calledWith({
                        price: 5432
                    });
                });
            });
        });
    });
}());
