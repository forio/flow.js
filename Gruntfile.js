module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json')
    });

    grunt.file.expand('grunt/*.js').forEach(function (task) {
        require('./' + task)(grunt);
    });

    grunt.registerTask('test', ['instrument', 'browserify:tests:', 'mocha','coverage-report']);
    grunt.registerTask('validate', ['test', 'jshint:all', 'jscs']);
    grunt.registerTask('generateDev', ['browserify:edge']);
    grunt.registerTask('production', ['generateDev', 'browserify:mapped', 'browserify:min']);

    grunt.registerTask('release', function (type) {
        type = type ? type : 'patch';
        ['validate', 'bump-only:' + type, 'production', 'incrementVersion', 'changelog', 'bump-commit'].forEach(function (task) {
            grunt.task.run(task);
        });
    });

    grunt.registerTask('default', ['generateDev', 'test', 'watch']);
};
