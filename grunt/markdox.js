'use strict';

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-markdox');
    grunt.config.set('markdox', {
        options: {
            // Task-specific options go here.
            template: 'documentation/template.ejs'
        },
        target: {
            files: [

                // channels
                /* {
                    // no publicAPI yet for run-channel, so don't build docs
                    src: 'src/channels/run-channel.js',
                    dest: 'documentation/generated/run-channel/index.html.md'
                }, */ 
                {
                    src: 'src/channels/operations-channel.js',
                    dest: 'documentation/generated/operations-channel/index.html.md'
                }, {
                    src: 'src/channels/variables-channel.js',
                    dest: 'documentation/generated/variables-channel/index.html.md'
                }, 


                // converters should all go in one file. 
                // TODO i think i want one page for all of these?
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


                // dom manager goes at root level of /generated/dom for now
                {
                    src: 'src/dom/dom-manager.js',
                    dest: 'documentation/generated/dom/index.html.md'
                }, 
                // dom/nodes
                // TODO ask Naren if other files here make sense for docs yet
                {
                    src: 'src/dom/nodes/node-manager.js',
                    dest: 'documentation/generated/dom/nodes/node-manager/index.html.md'
                }, 
                // dom/attributes
                // TODO ask Naren if other files at dom/attributes make sense for docs yet, i think no
                {
                    src: 'src/dom/attributes/attribute-manager.js',
                    dest: 'documentation/generated/dom/attributes/attribute-manager/index.html.md'
                }, 
                // dom/attributes/binds/
                // TODO: i think i want one page for all of these?
                {
                    src: 'src/dom/attributes/binds/checkbox-radio-bind-attr.js',
                    dest: 'documentation/generated/dom/attributes/binds/checkbox-radio-bind-attr/index.html.md'
                }, {
                    src: 'src/dom/attributes/binds/default-bind-attr.js',
                    dest: 'documentation/generated/dom/attributes/binds/default-bind-attr/index.html.md'
                }, {
                    src: 'src/dom/attributes/binds/input-bind-attr.js',
                    dest: 'documentation/generated/dom/attributes/binds/input-bind-attr/index.html.md'
                }, {
                    src: 'src/dom/attributes/binds/webcomponent-bind.js',
                    dest: 'documentation/generated/dom/attributes/binds/webcomponent-bind/index.html.md'
                }, 
                // dom/attributes/events
                // TODO: ask Naren if we should include these yet. 
                // both files here return false w/ comment saying don't bother binding on this yet

                // dom/attributes/foreach
                {
                    src: 'src/dom/attributes/foreach/default-foreach-attr.js',
                    dest: 'documentation/generated/dom/attributes/foreach/default-foreach-attr/index.html.md'
                }

            ]
        }
    });
};