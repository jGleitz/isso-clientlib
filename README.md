# isso-clientlib [![Build Status](https://travis-ci.org/jGleitz/isso-clientlib.svg?branch=master)](https://travis-ci.org/jGleitz/isso-clientlib)  [![codecov](https://codecov.io/gh/jGleitz/isso-clientlib/branch/master/graph/badge.svg)](https://codecov.io/gh/jGleitz/isso-clientlib)

A client library to interact with the isso commenting server. [API Documentation](https://jgleitz.github.io/isso-clientlib/)

## Development

This library is written in [TypeScript](https://www.typescriptlang.org/). To get started, [install Node.js and npm](https://nodejs.org/en/download/) and run `npm install` in the project folder.

Relevant projects and libraries are:

* [SuperAgent](http://visionmedia.github.io/superagent/), the HTTP library
* [ts-events](https://github.com/rogierschouten/ts-events) for asynchronous events
* [jest](https://jestjs.io/), the test framework
* [ts-lint](https://palantir.github.io/tslint/), used for checking the code for style
* [typedoc](https://typedoc.org/) to render the [API Documentation](https://jgleitz.github.io/isso-clientlib/)

### Testing

Tests are very important to this project. It’s intended to be a library users can rely on. The library is tested using both *unit* and *integration* tests. The integration test spins up real isso instance to make sure the library is always compatible to the latest version of isso.

#### Prerequisite

In order to run the integration test, you need to install python, the python headers and virtualenv. On Debian/Ubuntu, run:

```bash
sudo apt install python3 python3-dev python3-venv
```

### Scripts

To check the code, you can use these tasks:

Task | Description
--- | ---
`npm test` | run all checks
`npm start` | start the jest in watch mode to continuously run the *unit* tests on changed code
`npm run lint` | lint the code
`npm run unit-test` | run only unit tests
`npm run integration-test` | run only the integration test
