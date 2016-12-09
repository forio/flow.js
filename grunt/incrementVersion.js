'use strict';

module.exports = function (grunt) {
    grunt.config.set('incrementVersion', {
        options: {
            files: ['./dist/*.js']
        }
    });
    grunt.registerTask('incrementVersion', function () {
        var files = this.options().files;
        grunt.file.expand(files).forEach(function (file) {
            var mainFile = grunt.file.read(file);
            var version = grunt.file.readJSON('package.json').version;
            var versioned = mainFile.replace(/<%= version %>/g, version);
            grunt.file.write(file, versioned);
        });
    });

};
