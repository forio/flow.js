var cm = require('src/converters/converter-manager.js');
var _ = require('lodash');

describe('underscore converters', function () {
    it('should do the equivalent for all supported underscore converters', function () {
        var supported = ['values', 'keys', 'compact', 'uniq'];
        _.each(supported, function (fn) {
            var input = [4, 5, 6];
            var libraried = _[fn](input);
            var convertered = cm.convert(input, fn);
            libraried.should.eql(convertered);
        });
    });
});
