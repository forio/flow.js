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
                    dest: 'documentation/generated/channels/operations-channel/index.html.md'
                }, {
                    src: 'src/channels/variables-channel.js',
                    dest: 'documentation/generated/channels/variables-channel/index.html.md'
                },


                // TODO - decide if converters should all go in one file, or if this is ok
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
                }, {
                    src: 'src/dom/attributes/class-attr.js',
                    dest: 'documentation/generated/dom/attributes/class-attr/index.html.md'
                }, {
                    src: 'src/dom/attributes/default-attr.js',
                    dest: 'documentation/generated/dom/attributes/default-attr/index.html.md'
                },
                // only need to build one of positive and negative for purposes of docpad-generated help;
                // to accompany the code, repeat the same content in both
                {
                    src: 'src/dom/attributes/positive-boolean-attr.js',
                    dest: 'documentation/generated/dom/attributes/boolean-attr/index.html.md'
                },


                // dom/attributes/binds/
                // TODO ask Naren if other files (e.g. webcomponents) at dom/attributes make sense for docs yet, i think no
                {
                    src: 'src/dom/attributes/binds/checkbox-radio-bind-attr.js',
                    dest: 'documentation/generated/dom/attributes/binds/checkbox-radio-bind-attr/index.html.md'
                }, {
                    src: 'src/dom/attributes/binds/default-bind-attr.js',
                    dest: 'documentation/generated/dom/attributes/binds/default-bind-attr/index.html.md'
                }, {
                    src: 'src/dom/attributes/binds/input-bind-attr.js',
                    dest: 'documentation/generated/dom/attributes/binds/input-bind-attr/index.html.md'
                },
                // dom/attributes/events
                {
                    src: 'src/dom/attributes/events/default-event-attr.js',
                    dest: 'documentation/generated/dom/attributes/events/default-event-attr/index.html.md'
                }, {
                    src: 'src/dom/attributes/events/init-event-attr.js',
                    dest: 'documentation/generated/dom/attributes/events/init-event-attr/index.html.md'
                },

                // dom/attributes/foreach
                {
                    src: 'src/dom/attributes/foreach/default-foreach-attr.js',
                    dest: 'documentation/generated/dom/attributes/foreach/default-foreach-attr/index.html.md'
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
