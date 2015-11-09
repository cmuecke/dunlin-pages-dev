/**
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var pagespeed = require('psi');
var reload = browserSync.reload;
var swPrecache = require('sw-precache');
var fs = require('fs');
var path = require('path');
var packageJson = require('./package.json');
var critical = require('critical').stream;

// Lint JavaScript
gulp.task('jshint', function () {
    return gulp.src('source/scripts/**/*.js')
        .pipe(reload({
            stream: true,
            once: true
        }))
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'))
        .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

// Optimize images
gulp.task('images', function () {
    return gulp.src('source/images/**/*')
        .pipe($.cache($.imagemin({
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest('dist/images'))
        .pipe($.size({
            title: 'images'
        }));
});

// Copy all files at the root level (app)
gulp.task('copy', function () {
    return gulp.src([
            'source/*',
            '!source/*.html',
            'node_modules/apache-server-configs/dist/.htaccess'
        ], {
            dot: true
        }).pipe(gulp.dest('dist'))
        .pipe($.size({
            title: 'copy'
        }));
});

// Copy web fonts to dist
gulp.task('fonts', function () {
    return gulp.src(['source/fonts/**/*'])
        .pipe(gulp.dest('dist/fonts'))
        .pipe($.size({
            title: 'fonts'
        }));
});


// Compile and automatically prefix stylesheets
gulp.task('styles', function () {

    var AUTOPREFIXER_BROWSERS = [
        'android >= 3',
        'chrome >= 34',
        'firefox >= 29',
        'ie >= 10',
        'ie_mob >= 10',
        'iOS >= 8',
        'opera >= 24',
        'safari >= 7'
    ];

    // For best performance, don't add Sass partials to `gulp.src`
    return gulp.src([
            'source/**/*.scss',
            'source/styles/**/*.css'
        ])
        .pipe($.changed('.tmp/styles', {
            extension: '.css'
        }))
        .pipe($.changed('source/styles/**/*', {
            extension: '.scss'
        }))
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            precision: 10,
            onError: console.error.bind(console, 'Sass error:')
        }))
        .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe(gulp.dest('.tmp'))
        // Concatenate and minify styles
        .pipe($.if('*.css', $.csso()))
        .pipe(gulp.dest('dist'))
        .pipe($.size({
            title: 'styles'
        }));
})

// Concatenate and minify JavaScript
gulp.task('scripts', function () {
    var sources = [
        // Scripts
        'source/scripts/**/*.js'
    ];
    return gulp.src(sources)
        .pipe($.concat('main.min.js'))
        .pipe($.uglify({
            preserveComments: 'some'
        }))
        // Output files
        .pipe(gulp.dest('dist/scripts'))
        .pipe($.size({
            title: 'scripts'
        }));
});

// Scan your HTML for assets & optimize them
gulp.task('html', function () {
    var assets = $.useref.assets({
        searchPath: '{.tmp,source}'
    });

    return gulp.src('source/**/**/*.html')
        .pipe(assets)
        // Remove Any Unused CSS
        // Note: If not using the Style Guide, you can delete it from
        // the next line to only include styles your project uses.
        .pipe($.if('*.css', $.uncss({
            html: [
                'source/index.html'
            ],
            // CSS Selectors for UnCSS to ignore
            ignore: [
                /.navdrawer-container.open/,
                /.app-bar.open/
            ]
        })))

    // Concatenate and minify styles
    // In case you are still using useref build blocks
    .pipe($.if('*.css', $.csso()))
        .pipe(assets.restore())
        .pipe($.useref())

    // Minify any HTML
    .pipe($.if('*.html', $.minifyHtml()))
    // Output files
    .pipe(gulp.dest('dist'))
        .pipe($.size({
            title: 'html'
        }));
});

// Generate & Inline Critical-path CSS
gulp.task('critical', function () {
    return gulp.src('dist/*.html')
        .pipe(critical({
            base: 'dist/',
            inline: true,
            css: 'dist/styles/main.css'
        }))
        .pipe(gulp.dest('dist'));
});

// Clean output directory
gulp.task('clean', del.bind(null, ['.tmp', 'dist'], {
    dot: true
}));

// Watch files for changes & reload
gulp.task('serve', ['styles'], function () {
    browserSync({
        notify: false,
        // Customize the BrowserSync console logging prefix
        logPrefix: 'WSK',
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: ['.tmp', 'source']
    });

    gulp.watch(['source/**/*.html'], reload);
    gulp.watch(['source/styles/**/**/**/**/*.{scss,css}'], ['styles', reload]);
    gulp.watch(['source/scripts/**/*.js'], ['jshint']);
    gulp.watch(['source/images/**/*'], reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function () {
    browserSync({
        notify: false,
        logPrefix: 'WSK',
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: 'dist',
        baseDir: "dist"
    });
});

// Build production files, the default task
gulp.task('default', ['clean'], function (cb) {
    runSequence(
        'styles', ['jshint', 'html', 'scripts', 'images', 'fonts', 'copy'], 'critical',
        cb);
});

// Run PageSpeed Insights
gulp.task('pagespeed', function (cb) {
    // Update the below URL to the public URL of your site
    pagespeed.output('dunlin.io', {
        strategy: 'mobile',
        // By default we use the PageSpeed Insights free (no API key) tier.
        // Use a Google Developer API key if you have one: http://goo.gl/RkN0vE
        // key: 'YOUR_API_KEY'
    }, cb);
});

// Load custom tasks from the `tasks` directory
// try { require('require-dir')('tasks'); } catch (err) { console.error(err); }
