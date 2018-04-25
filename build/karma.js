'use strict';
var path = require('path');

module.exports = function (grunt) {
    var babelloader = {
        test: /\.js$/,
        exclude: /node_modules\/(?!(autotrack|dom-utils))/,
        loader: 'babel-loader',
    };
    var babelloaderForOlderBrowsers = Object.assign({}, babelloader, {
        options: {
            plugins: [
                ['istanbul', {
                    exclude: [
                        'tests/**/*.js',
                        'src/**/test-*.js',
                    ]
                }],
                'transform-es2015-destructuring',
                'transform-es2015-block-scoping',
                'babel-plugin-transform-es2015-arrow-functions',
                'babel-plugin-transform-es2015-classes',
                'babel-plugin-transform-es2015-template-literals',
            ]
        }
    });

    var webpackLoaders = [
        { test: /\.html$/, loader: 'raw-loader' },
        { test: /\.py$/, loader: 'raw-loader' },
        { test: /\.jl$/, loader: 'raw-loader' }
    ];
    var fileDeps = [
        { src: 'node_modules/jquery/dist/jquery.js', watched: false, included: true, served: true },
        { src: 'node_modules/lodash/lodash.js', watched: false, included: true, served: true },
        { src: 'node_modules/epicenter-js/dist/epicenter.min.js', watched: false, included: true, served: true },
    ];
    grunt.config.set('karma', {
        options: {
            basePath: '',
            browsers: ['ChromeHeadless'],
            // browsers: ['Chrome'],
            frameworks: ['mocha', 'sinon-chai'],
            hostname: 'local.forio.com',
            reporters: ['mocha'],
            singleRun: true,
            browserConsoleLogOptions: {
                terminal: false
            },
            // logLevel: 'debug',
            mochaReporter: {
                showDiff: 'unified',
                ignoreSkipped: true,
                output: 'minimal',
            },
            webpackMiddleware: {
                noInfo: true,
                stats: 'none'
            },
            webpack: {
                module: {
                    rules: [babelloader].concat(webpackLoaders)
                },
                stats: 'errors-only',
                devtool: 'eval',
                resolve: {
                    modules: [path.resolve('./src'), 'node_modules'],
                    alias: {
                        src: path.resolve('./src'),
                        tests: path.resolve('./tests'),
                    }
                }
            }
        },
        testList: {
            files: fileDeps.concat([
                { src: 'tests/test-list.js', watched: false, included: true, served: true },
            ]),
            options: {
                preprocessors: {
                    'tests/test-list.js': ['webpack'],
                }
            }
        },
        debugMode: {
            browsers: ['Chrome_with_devtools'],
            singleRun: false,
            files: fileDeps.concat([
                { src: 'tests/test-list.js', watched: true, included: true, served: true },
            ]),
            options: {
                preprocessors: {
                    'tests/test-list.js': ['webpack'],
                }
            },
            customLaunchers: {
                Chrome_with_devtools: {
                    base: 'Chrome',
                    flags: ['--auto-open-devtools-for-tabs', '--start-maximized']
                }
            },
        },
        singleTest: {
            files: fileDeps
        },
        testWithCoverage: {
            files: fileDeps.concat([
                { src: 'tests/specs/**/*.js', watched: false, included: true, served: true },
                { src: 'src/**/*.js', watched: false, included: true, served: true },
            ]),
            options: {
                browsers: ['ChromeHeadless'],
                logLevel: 'error',
                preprocessors: {
                    'src/**/*.js': ['webpack'],
                    'tests/specs/**/*.js': ['webpack'],
                },
                exclude: [
                    'tests/specs/test-flow.js',
                    'src/flow.js',
                    'src/add-ons/**/*',
                ],
                coverageReporter: {
                    reporters: [
                        { type: 'lcov', subdir: '.', dir: 'coverage/' },
                        { type: 'text-summary' }
                    ]
                },
                reporters: ['mocha', 'progress', 'coverage'],
                webpack: {
                    module: {
                        rules: [babelloaderForOlderBrowsers].concat(webpackLoaders)
                    },
                    stats: 'errors-only',
                    devtool: 'eval',
                    resolve: {
                        modules: [path.resolve('./src'), 'node_modules'],
                        alias: {
                            src: path.resolve('./src'),
                            tests: path.resolve('./tests'),
                        }
                    }
                }
            }
        }
    });
};
