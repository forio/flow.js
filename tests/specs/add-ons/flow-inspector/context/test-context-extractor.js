'use strict';

module.exports = (function () {
    var Extractor = require('src/add-ons/flow-inspector/panels/context-show/context-extractor');

    var extractBetween = function (startingLine, endingLine, code) {
        return code.split(/\n/).slice(startingLine - 1, endingLine).join('\n');
    };

    describe('Context Extractor', function () {
        describe('Julia', function () {
            var code, extractor;
            before(function () {
                code = require('./test-julia-model.jl');
                extractor = new Extractor('test.jl', code);
            });

            describe('Functions', function () {
                it('Should work for functions with comments', function () {
                    var cont = extractor.showContext('function_with_bad_indentation', true);
                    cont.should.equal(extractBetween(39, 43, code));
                });
                it('Should work for functions with messed up spaces', function () {
                    var cont = extractor.showContext('function_with_bad_spacing', true);
                    cont.should.equal(extractBetween(45, 47, code));
                });
                it('Should work for functions with nested ends', function () {
                    var cont = extractor.showContext('indented_function_with_nested_ends_inside', true);
                    cont.should.equal(extractBetween(13, 37, code));
                });
                it('Should work for functions with nested ends', function () {
                    var cont = extractor.showContext('function_with_nested_ends_inside_and_bad_indentation', true);
                    cont.should.equal(extractBetween(49, 65, code)); //not the right end, but ignoring nested bad indentation
                });
            });
            describe('Variables', function () {
                it('Should work with single-line arrays', function () {
                    var cont = extractor.showContext('single_line_array', false);
                    cont.should.equal(extractBetween(85, 85, code));
                });
                it('Should work with multi-line arrays', function () {
                    var cont = extractor.showContext('multiline_array', false);
                    cont.should.equal(extractBetween(78, 81, code));
                });
                it('Should work with globals', function () {
                    var cont = extractor.showContext('global_val', false);
                    cont.should.equal(extractBetween(83, 83, code));
                });
            });
        });
        describe('Python', function () {
            var code, extractor;
            before(function () {
                code = require('./test-python-model.py');
                extractor = new Extractor('test.py', code);
            });
            describe('Functions', function () {
                it('Should work for functions with comments', function () {
                    var cont = extractor.showContext('normal_function', true);
                    cont.should.equal(extractBetween(6, 9, code));
                });
                it('Should work for functions with nested sub_functions', function () {
                    var cont = extractor.showContext('normal_function_parent', true);
                    cont.should.equal(extractBetween(11, 19, code));
                });
                it('Should work for functions within classes', function () {
                    var cont = extractor.showContext('function_within_class', true);
                    cont.should.equal(extractBetween(25, 32, code));
                });
                it('Should work for functions with whitespace in their declarations', function () {
                    var cont = extractor.showContext('function_with_whitespace', true);
                    cont.should.equal(extractBetween(53, 71, code));
                });
            });
            describe('Variables', function () {
                it('Should work with single-line variables', function () {
                    var cont = extractor.showContext('my_float', false);
                    cont.should.equal(extractBetween(44, 44, code));
                });
                it('Should work with multi-line variables', function () {
                    var cont = extractor.showContext('multi_line_dict', false);
                    cont.should.equal(extractBetween(45, 49, code));
                });
            });
        });
    });

}());
