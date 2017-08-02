'use strict';

module.exports = function (grunt) {
    // grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.config.set('watch', {
        source: {
            files: ['src/**/*.js'],
            tasks: ['karma']
        },
        stylesAddons: {
            files: ['src/add-ons/**/*.scss'],
            tasks: ['sass:addons']
        },
        scriptsAddons: {
            files: ['src/add-ons/**/*.js', 'src/add-ons/**/*.html'],
            tasks: ['webpack:addons']
        },
        tests: {
            options: {
                interrupt: true,
                spawn: false
            },
            files: ['tests/specs/channels/test-channel-util.js'],
            tasks: []
        }
    });

    // when a unit test changes, execute only it
    var originalKarmaOneFiles = grunt.config.get('karma.singleTest.files'); // keep the original files array
    // var originalKarmaOneFiles = [
    //     { pattern: 'node_modules/jquery/dist/jquery.js', watched: false, included: true, served: true },
    //     { pattern: 'node_modules/lodash/lodash.js', watched: false, included: true, served: true },
    //     { pattern: 'node_modules/epicenter-js/dist/epicenter.min.js', watched: false, included: true, served: true },
    // ];
    grunt.event.on('watch', function watchEventListener(action, filepath, target){
        if (target === 'tests') {
            handleChangedSpecFile();
        }

        function handleChangedSpecFile() {
            if (action === 'deleted') {
                return;
            }           

            var testFilePath = "./" + filepath.replace(/\\/g, "/");

            grunt.log.writeln(['Running single karma test for: ' + testFilePath]);
            var updatedFiles = originalKarmaOneFiles.concat([{ src: filepath, 
                watched: false,
                included: true,
                served: true, 
            }]);
            grunt.config.set('karma.singleTest.files', updatedFiles);

            var pp = {};
            pp[testFilePath] = ['webpack'];

            grunt.config.set('karma.singleTest.options.preprocessors', pp);
            grunt.task.run('karma:singleTest:start');

            console.log(updatedFiles);
        }
    });
};
