'use strict';

/* eslint-env node */
/* eslint-disable global-require */

const gulp = require('gulp');
const gutil = require('gulp-util');
const tslint = require('gulp-tslint');
const typescript = require('gulp-typescript');
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
const assign = require('deep-assign');
const isso = require('./isso-management');
const testPageMiddleware = require('./test/util/testPageMiddleware');
isso.printOutput(false);

const coverageVariableName = '__coverage__';
const paths = {
	libBaseFolder: 'lib',
	lib: 'lib/**/*.ts',
	typings: 'typings/*/**/*.d.ts',
	unitTest: 'build/test/unit/**/*.js',
	integrationTest: 'build/test/integration/**/*.js',
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
	unitCoverageReportFolder: 'build/coverage/unit',
	integrationCoverageReportFolder: 'build/coverage/integration',
	unitCoverageReport: 'build/unit-coverage.lcov',
	integrationCoverageReport: 'build/integration-coverage.lcov'
};

const d = (dependencies, task) => gulp.series(gulp.parallel(dependencies), task);

/**
 * Checks the coding conventions.
 */
gulp.task('lint', () =>
	gulp.src([paths.lib, paths.test])
		.pipe(tslint({
			formatter: "stylish"
		}))
		.pipe(tslint.report())
);

const compileSettings = {
	lib: require('./' + path.join(paths.compileSettings, 'lib.json')),
	test: require('./' + path.join(paths.compileSettings, 'test.json'))
};

/**
 * Compile typescript to ES5
 */
function doCompile(settings, sources, output) {
	const compileStream = gulp.src(sources)
		.pipe(sourcemaps.init())
		.pipe(typescript(settings, typescript.reporter.longReporter()));

	const jsStream = compileStream.js
		.pipe(sourcemaps.write('.', {sourceRoot: 'lib'}));

	return merge([
		jsStream,
		compileStream.dts
	])
		.pipe(gulp.dest(output));
}

function compile() {
	return doCompile(compileSettings.lib, [paths.lib, paths.typings], paths.output.lib)
}

function compileTest() {
	return doCompile(compileSettings.test, [paths.test, paths.typings, paths.compiledTypes], paths.output.test);
}

function instrument() {
	return gulp.src(path.join(paths.output.lib, '**/*.js'))
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(istanbul({
			coverageVariable: coverageVariableName,
			preserveComments: true
		}))
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(paths.output.testLib));
}

/*
 * Bundle the tests to be used in the browser.
 */

function bundleStream(fileName) {
	return webpack({
		config: {
			output: {
				filename: fileName
			},
			devtool: 'source-map',
			module: {
				loaders: [{
					test: /\.js$/,
					loader: 'source-map-loader'
				}]
			}
		},
		quiet: true
	})
}

function bundleUnitTest() {
	return gulp.src(path.join(paths.output.test, 'unit/start.js'))
		.pipe(bundleStream('unit-test.js'))
		.pipe(gulp.dest(paths.output.bundles))
}

function bundleIntegrationTest() {
	return gulp.src(path.join(paths.output.test, 'integration/start.js'))
		.pipe(bundleStream('integration-test.js'))
		.pipe(gulp.dest(paths.output.bundles));
}

const bundle = gulp.series(
		gulp.parallel(gulp.series(compile, instrument), compileTest),
		gulp.parallel(bundleUnitTest, bundleIntegrationTest)
	);

/*
 * Execute the tests.
 */
function testStream(testFile, phantomOpts, istanbulOpts) {
	return gulp.src(testFile, {read: false})
		.pipe(mochaPhantomJs(assign({
			phantomjs: {
				useColors: true,
				hooks: 'mocha-phantomjs-istanbul',
				coverageFile: path.resolve(paths.coverageFile)
			}
		}, phantomOpts || {}))
			.on('finish', () =>
				gulp.src(paths.coverageFile)
					.pipe(istanbulReport(assign({
						basePath: '',
						reports: {
							text: ''
						}
					}, istanbulOpts || {}))))
		);
}

const unitTestIstanbulOpts = {
	reports: {
		html: paths.unitCoverageReportFolder,
		lcovonly: paths.unitCoverageReport
	}
}

const integrationTestPhantomOpts = {
	phantomjs: {
		customHeaders: {
			Origin: 'http://localhost:3010',
			Host: 'http://localhost:3010'
		},
		settings: {
			localToRemoteUrlAccessEnabled: true
		}
	}
};

const silentPhantom = {
	silent: true
};

const integrationTestIstanbulOpts = {
	reports: {
		html: paths.integrationCoverageReportFolder,
		lcovonly: paths.integrationCoverageReport
	}
}

function startIsso() {
	return isso.install().then(isso.start);
}

function stopIsso() {
	return isso.destroy();
}
const preTest = gulp.parallel(bundle, startIsso);

function unitTest() {
	return testStream('test/unit/index.html', {}, unitTestIstanbulOpts);
}

function integrationTest() {
	return testStream('test/integration/index.html', integrationTestPhantomOpts, integrationTestIstanbulOpts);
}

function silentUnitTest() {
	return testStream('test/unit/index.html', silentPhantom, unitTestIstanbulOpts);
}

function silentIntegrationTest() {
	return testStream('test/integration/index.html', assign({}, integrationTestPhantomOpts, silentPhantom), integrationTestIstanbulOpts);
}

const silentTest = gulp.series(silentUnitTest, silentIntegrationTest);

gulp.task('test', gulp.series(preTest, unitTest, integrationTest, stopIsso));
gulp.task('unit-test', gulp.series(bundle, unitTest));
gulp.task('integration-test', gulp.series(preTest, integrationTest, stopIsso));

/*
 * Build documentation
 */
gulp.task('doc', () =>
	gulp.src([paths.lib, paths.typings])
		.pipe(typedoc({
			module: 'commonjs',
			target: 'ES6', // we set this to ES6 as a cheap trick to get promise support
			out: paths.output.doc
		}))
);


/*
 * Development pages in the browser.
 */
 function reloadTestServer(done) {
	 browserSyncTest.reload();
	 done();
 }

 function reloadBuildServer(done) {
	 browserSyncBuild.reload();
	 done();
 }

function syncServer() {
	browserSyncTest.init({
		server: {
			baseDir: './'
		},
		open: false,
		startPath: 'test/unit',
		middleware: [testPageMiddleware],
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
	gulp.watch([paths.lib, paths.test],
		gulp.series(bundle, gulp.parallel(reloadTestServer, silentTest, 'doc'), reloadBuildServer)
	);
	gulp.watch('test/**/*.html', reloadTestServer);
}

gulp.task('watch', gulp.series(gulp.parallel(gulp.series(preTest, silentTest), 'doc') , syncServer));
