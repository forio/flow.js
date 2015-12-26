'use strict';
var webpack = require('webpack');
var uglifyOptions = {
                    mangle: false,
                    warnings: true,
                    compress:{
                        screw_ie8: true,
                        join_vars: false
                    }
                };

module.exports = function (grunt) {
    grunt.config.set('webpack', {
        edge: {
            entry: './src/flow.js',
            output: {
                path: './dist/',
                filename: 'flow-edge.js'
            },
            library: 'Flow',
            libraryTarget: 'var'
        },
        mapped: {
            entry: './src/flow.js',
            output: {
                path: './dist/',
                filename: 'flow.js'
            },
            library: 'Flow',
            libraryTarget: 'var'
        },
        min: {
            entry: './src/flow.js',
            output: {
                path: './dist/',
                filename: 'flow.min.js'
            },
            library: 'Flow',
            libraryTarget: 'var',
            plugins: [
                new webpack.optimize.UglifyJsPlugin(uglifyOptions)
            ]
        },
        addons: {
            entry: './src/add-ons/flow-inspector/flow-inspector.js',
            output: {
                path: './dist/add-ons/',
                filename: 'flow-inspector.min.js'
            },
            plugins: [
                new webpack.optimize.UglifyJsPlugin(uglifyOptions)
            ],
            module: {
                loaders: [
                    { test: /\.html$/, loader: 'raw' },
                ]
            }
        },

        tests: {
            entry: './tests/test-list.js',
            output: {
                path: './tests/dist/',
                filename: 'tests-browserify-bundle.js'
            },
            module: {
                loaders: [
                    { test: /\.py$/, loader: 'raw' },
                    { test: /\.jl$/, loader: 'raw' },
                ]
            },
            resolve: {
                alias: {
                    src: __dirname + '/../src'
                }
            }
        }
    });
};
