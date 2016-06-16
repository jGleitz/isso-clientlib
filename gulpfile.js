'use strict';

/* eslint-env node */
/* eslint-disable global-require */

const gulp = require('gulp');
const gutil = require('gulp-util');
const tslint = require('gulp-tslint');
const stylish = require('tslint-stylish');
const typescript = require('gulp-typescript');
const eslint = require('gulp-eslint');
const sourcemaps = require('gulp-sourcemaps');
const merge = require('merge2');
const path = require('path');
// const uglify = require('gulp-uglify');
const webpack = require('webpack-stream');
const browserSyncTest = require('browser-sync').create('test');
const browserSyncBuild = require('browser-sync').create('build');
const istanbul = require('gulp-istanbul');
const mochaPhantomJs = require('gulp-mocha-phantomjs');
const istanbulReport = require('remap-istanbul/lib/gulpRemapIstanbul');
const typedoc = require('gulp-typedoc');

const coverageVariableName = '__coverage__';
const paths = {
	lib: 'lib/**/*.ts',
	typings: 'typings/*/**/*.d.ts',
	unitTest: 'build/test/unit/**/*.js',
	test: 'test/**/*.ts',
	testrunner: 'test/runner.html',
	output: {
		lib: 'build/lib',
		test: 'build/test/test',
		testLib: 'build/test/lib',
		bundles: 'build/bundles',
		doc: 'build/doc'
	},
	compileSettings: 'config/compilersettings',
	compiledTypes: 'build/lib/**/*.d.ts',
	coverageFile: './build/raw-coverage.json',
	coverageReportFolder: 'build/coverage',
	lcovCoverageReport: 'build/coverage.lcov'
};


/**
 * Checks the coding conventions.
 */
gulp.task('lint', ['lint-lib', 'lint-test']);

gulp.task('lint-lib', () =>
	gulp.src([paths.lib])
		.pipe(tslint())
		.pipe(tslint.report(stylish, {
			emitError: false,
			sort: true,
			bell: true
		}))
);

gulp.task('lint-test', () =>
	gulp.src([paths.test, 'gulpfile.js'])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError())
);

const compileSettings = {
	lib: require('./' + path.join(paths.compileSettings, 'lib.json')),
	test: require('./' + path.join(paths.compileSettings, 'test.json'))
};

/**
 * Compile typescript to ES5
 */
/**
 * Creates a typescript compilation task.
 *
 * @param {Object} settings
 * 		Settings for the typescript compiler.
 * @param {Array<string>} sources
 *		The file globs to construct the stream from.
 * @param {string} output
 *		The output folder to compile to.
 * @return {function} The task function.
 */
function compileTask(settings, sources, output) {
	return () => {
		const compileStream = gulp.src(sources)
			.pipe(sourcemaps.init())
			.pipe(typescript(settings, {}, typescript.reporter.longReporter()));

		const jsStream = compileStream.js
			.pipe(sourcemaps.write('.', {sourceRoot: 'lib'}));

		return merge([
			jsStream,
			compileStream.dts
		])
			.pipe(gulp.dest(output));
	};
}

gulp.task('compile', compileTask(compileSettings.lib, [paths.lib, paths.typings], paths.output.lib));
gulp.task('compile-test', ['compile'], compileTask(compileSettings.test,
	[paths.test, paths.typings, paths.compiledTypes], paths.output.test));

gulp.task('instrument', ['compile'], () =>
	gulp.src(path.join(paths.output.lib, '**/*.js'))
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(istanbul({
			coverageVariable: coverageVariableName,
			preserveComments: true
		}))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(paths.output.testLib))
);

/**
 * Bundles the library to be used in the browser.
 */
gulp.task('bundle-test', ['compile-test', 'instrument'], () =>
	gulp.src(path.join(paths.output.test, 'unit/start.js'))
		.pipe(webpack({
			output: {
				filename: 'test.js'
			},
			devtool: 'source-map',
			module: {
				preLoaders: [{
					test: /\.js$/,
					loader: 'source-map-loader'
				}]
			}
		}).on('error', gutil.log))
		.pipe(gulp.dest(paths.output.bundles))
);

function testStream(opts) {
	return gulp.src('test/unit/index.html', {read: false})
		.pipe(mochaPhantomJs(Object.assign({
			phantomjs: {
				useColors: true,
				hooks: 'mocha-phantomjs-istanbul',
				coverageFile: path.resolve(paths.coverageFile)
			}
		}, opts))
		.on('finish', () =>
			gulp.src(paths.coverageFile)
				.pipe(istanbulReport({
					basePath: paths.lib,
					reports: {
						text: '',
						html: paths.coverageReportFolder,
						lcovonly: paths.lcovCoverageReport
					}
				})))
			);
}

gulp.task('test', ['bundle-test'], () => testStream());

gulp.task('silent-test', ['bundle-test'], () => testStream({silent: true}));

gulp.task('watch', ['bundle-test', 'silent-test', 'doc'], () => {
	browserSyncTest.init({
		server: {
			baseDir: './'
		},
		open: false,
		startPath: 'test/unit',
		notify: {
			styles: {
				left: 0,
				right: 'auto',
				opacity: 0.8,
				borderBottomLeftRadius: 0,
				borderBottomRightRadius: '10px'
			}
		}
	});
	browserSyncBuild.init({
		server: {
			baseDir: 'build'
		},
		ui: {
			port: 3003
		},
		port: 3002,
		open: false
	});
	gulp.watch([paths.lib, paths.test], ['reload-test', 'reload-build']);
	gulp.watch('test/**/*.html', () => browserSyncTest.reload());
});
gulp.task('reload-test', ['bundle-test'], () => browserSyncTest.reload());
gulp.task('reload-build', ['silent-test', 'doc'], () => browserSyncBuild.reload());

gulp.task('doc', () =>
	gulp.src([paths.lib, paths.typings])
		.pipe(typedoc({
			module: 'commonjs',
			target: 'ES5',
			out: paths.output.doc
		}))
);
