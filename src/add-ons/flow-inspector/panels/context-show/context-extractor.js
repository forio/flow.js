'use strict';

var JuliaExtractor = require('./rules/julia-extract-rules');
var PythonExtractor = require('./rules/python-extract-rules');

var Extractor = function (modelName, modelContents) {
    this.contents = modelContents.split(/\n/);
    var extension = modelName.split('.')[1];
    if (extension === 'py') {
        this.extractor = PythonExtractor;
    } else if (extension === 'jl') {
        this.extractor = JuliaExtractor;
    }
    return this;
};

Extractor.prototype.showContext = function (reference, isFunction) {
    var pattern = (isFunction) ? this.extractor.fn : this.extractor.variable;
    reference = reference.split(/[\[\.\(]/)[0];

    var startIndex = _.findIndex(this.contents, pattern.start(reference), this);
    var fromStart = this.contents.slice(startIndex + 1);
    var endIndex = pattern.end(fromStart, this.contents[startIndex]);

    var offset = pattern.offset + 1;
    if (endIndex === -1) {
        endIndex = this.contents.length;
        offset = 0;
    }

    var arr = this.contents.slice(startIndex, (startIndex + endIndex + offset));
    return arr.join('\n');
};

module.exports = Extractor;
