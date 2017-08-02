'use strict';
var path = require('path');

module.exports = function (grunt) {
    var babelloader = {
        test: /\.js$/,
        exclude: /node_modules\/(?!(autotrack|dom-utils))/,
        loader: 'babel-loader',
        include: path.resolve('./tests'),
        options: {
            plugins: [
                // 'transform-es2015-modules-commonjs',
                // 'transform-es2015-destructuring',
                // 'transform-es2015-block-scoping',
                // 'babel-plugin-transform-es2015-arrow-functions',
                // 'babel-plugin-transform-es2015-classes',
                // 'babel-plugin-transform-es2015-template-literals',
            ]
        }
    };

    var fileDeps = [
        { pattern: 'node_modules/jquery/dist/jquery.js', watched: false, included: true, served: true },
        { pattern: 'node_modules/lodash/lodash.js', watched: false, included: true, served: true },
        { pattern: 'node_modules/epicenter-js/dist/epicenter.min.js', watched: false, included: true, served: true },
        { pattern: 'tests/test-list.js', watched: true, included: true, served: true },
    ];
    grunt.config.set('karma', {
        options: {
            basePath: '',
            browsers: ['ChromeHeadless'],
            frameworks: ['mocha', 'sinon-chai'],
            hostname: 'local.forio.com',
            files: fileDeps.concat([
                { pattern: 'tests/specs/**/*.js', watched: true, included: true, served: true },
                // { pattern: 'tests/test-list.js', watched: true, included: true, served: true },
            ]),
            exclude: [
                'tests/specs/test-flow.js'
            ],
            reporters: ['mocha'],
            singleRun: false,
            browserConsoleLogOptions: {
                terminal: false
            },
            // logLevel: 'debug',
            client: {
                chai: {
                    // includeStack: true
                }
            },
            preprocessors: {
                'tests/specs/**/*.js': ['webpack'],
                'tests/test-list.js': ['webpack'],
            },
            mochaReporter: {
                showDiff: 'unified',
                ignoreSkipped: true,
                output: 'minimal',
            },
            webpackMiddleware: {
                stats: 'errors-only'
            },
            webpack: {
                module: {
                    rules: [
                        babelloader,
                        { test: /\.html$/, loader: 'raw-loader' },
                        { test: /\.py$/, loader: 'raw-loader' },
                        { test: /\.jl$/, loader: 'raw-loader' },
                    ]
                },
                devtool: 'eval',
                resolve: {
                    modules: [path.resolve('./src'), 'node_modules'],
                    alias: {
                        src: path.resolve('./src')
                    }
                }
            }
        },
        singleTest: {
            options: {
                singleRun: true,
                files: fileDeps,
            }
        }
    });

};
