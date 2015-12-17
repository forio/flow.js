'use strict';

module.exports = (function () {
    var Extractor = require('src/add-ons/flow-inspector/panels/context-show/context-extractor');

    var code = require('./test-julia-model.jl');
    var extractor = new Extractor('test.jl', code);

    var extractBetween = function (startingLine, endingLine) {
        return code.split(/\n/).slice(startingLine, endingLine + 1).join('\n');
    };

    describe('Context Extractor', function () {
        describe('Julia', function () {
            describe('Functions', function () {
                it('Should work for functions with comments', function () {
                    var cont = extractor.showContext('function_with_messed_up_indentation', true);
                    cont.should.equal(extractBetween(39, 408));

                });
                it('Should work for functions with messed up spaces', function () {

                });
                it('Should work for functions with nested ends', function () {

                });
            });
        });
    });

}());
