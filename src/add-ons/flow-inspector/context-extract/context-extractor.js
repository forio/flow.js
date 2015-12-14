'use strict';

var JuliaExtractor = require('./julia-extractor');
var PythonExtractor = require('./python-extractor');

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
    var endIndex = _.findIndex(fromStart, function (val) {
        return pattern.end(val, this.contents[startIndex]);
    }, this);
    var arr = this.contents.slice(startIndex, (startIndex + endIndex + 1));
    return arr.join('\n');;
};

module.exports = Extractor;
