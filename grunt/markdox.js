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
                {
                    src: 'src/channels/middleware/epicenter-middleware/run-manager-router.js',
                    dest: 'documentation/generated/channels/run-manager-router/index.html.md'
                }, {
                    src: 'src/channels/middleware/epicenter-middleware/scenario-manager-router.js',
                    dest: 'documentation/generated/channels/scenario-manager-router/index.html.md'
                }, {
                    src: 'src/channels/middleware/epicenter-middleware/runs-router/index.js',
                    dest: 'documentation/generated/channels/multiple-runs-router/index.html.md'
                }, {
                    src: 'src/channels/middleware/epicenter-middleware/custom-run-router.js',
                    dest: 'documentation/generated/channels/single-run-router/index.html.md'
                }, {
                    src: 'src/channels/middleware/epicenter-middleware/run-router/run-variables-channel.js', 
                    dest: 'documentation/generated/channels/variables-channel/index.html.md'
                }, {
                    src: 'src/channels/middleware/epicenter-middleware/run-router/run-operations-channel.js', 
                    dest: 'documentation/generated/channels/operations-channel/index.html.md'
                }, {
                    src: 'src/channels/middleware/epicenter-middleware/run-router/run-meta-channel.js',
                    dest: 'documentation/generated/channels/meta-channel/index.html.md'
                }, {
                    src: 'src/channels/channel-manager.js',
                    dest: 'documentation/generated/channels/channel-manager/index.html.md'
                }, {
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
                {
                    src: 'src/dom/attributes/events/default-event-attr.js',
                    dest: 'documentation/generated/dom/attributes/events/default-event-attr/index.html.md'
                }, {
                    src: 'src/dom/attributes/events/init-event-attr.js',
                    dest: 'documentation/generated/dom/attributes/events/init-event-attr/index.html.md'
                },
                {
                    src: 'src/dom/attributes/foreach/default-foreach-attr.js',
                    dest: 'documentation/generated/dom/attributes/foreach/default-foreach-attr/index.html.md'
                },
                {
                    src: 'src/dom/attributes/repeat-attr.js',
                    dest: 'documentation/generated/dom/attributes/repeat-attr/index.html.md'
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
