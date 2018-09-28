'use strict';

//Documentation alternatives
// https://github.com/neogeek/doxdox/
// https://github.com/sutoiku/jsdox
// https://github.com/jsdoc2md/jsdoc-to-markdown https://github.com/jsdoc2md/jsdoc-to-markdown/wiki/Create-a-custom-partial

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-markdox');
    grunt.config.set('markdox', {
        options: {
            // Task-specific options go here.
            template: 'documentation/template.ejs'
        },
        target: {
            files: [
                {
                    src: 'src/converters/array-converter.js',
                    dest: 'documentation/generated/converters/array-converter/index.html.md'
                }, {
                    src: 'src/converters/converter-manager.js',
                    dest: 'documentation/generated/converters/converter-manager/index.html.md'
                }, {
                    src: 'src/converters/number-converter.js',
                    dest: 'documentation/generated/converters/number-converter/index.html.md'
                }, {
                    src: 'src/converters/numberformat-converter.js',
                    dest: 'documentation/generated/converters/numberformat-converter/index.html.md'
                }, {
                    src: 'src/converters/string-converter.js',
                    dest: 'documentation/generated/converters/string-converter/index.html.md'
                },
                {
                    src: 'src/dom/dom-manager.js',
                    dest: 'documentation/generated/dom/index.html.md'
                },
                {
                    src: 'src/dom/attributes/attribute-manager.js',
                    dest: 'documentation/generated/dom/attributes/attribute-manager/index.html.md'
                }, {
                    src: 'src/converters/number-compare-converters.js',
                    dest: 'documentation/generated/converters/number-compare-converter/index.html.md'
                },
                {
                    src: 'src/converters/bool-conditional-converters.js',
                    dest: 'documentation/generated/converters/bool-conditional-converter/index.html.md'
                },
                // flow.js initialize
                {
                    src: 'src/flow.js',
                    dest: 'documentation/generated/flow-js/index.html.md'
                }

            ]
        }
    });
};
