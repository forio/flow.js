'use strict';

module.exports = function (grunt) {
    grunt.config.set('incrementVersion', {
        options: {
            files:  ['./dist/*.js']
        }
    });
    grunt.registerTask('incrementVersion', function () {
        var files = this.options().files;
        grunt.file.expand(files).forEach(function (file) {
            var mainFile = grunt.file.read(file);
            var updated = grunt.template.process(mainFile, { data: grunt.file.readJSON('package.json') });
            grunt.file.write(file, updated);
        });
    });

};
