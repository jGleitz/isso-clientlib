# Development Notes

This library is written in [TypeScript](https://www.typescriptlang.org/) and built using [gulp](http://gulpjs.com/). To get started, [install Node.js and npm](https://nodejs.org/en/download/) and run `npm install` in the project folder.

### Testing


The library is tested using both *unit* and *integration* tests. The integration test uses a real isso instance to make sure the library is always compatible to the latest isso.

#### Prerequisite

In order to run the integration test, you need to install python, the python headers and *virtualenv*. On Debian/Ubuntu, run:
```
sudo apt-get install python3.5 python3.5-dev python3.5-venv
```

#### Execution

When developing, start a browsersync server by running

```
npm start
```

Once the server started, you can visit these pages in your browser:

Page | Description
--- | ---
[localhost:3000/test/unit](http://localhost:3000/test/unit/) | Unit test report
[localhost:3000/test/integration](http://localhost:3000/test/integration/) | Integration test report
[localhost:3002/coverage/unit](http://localhost:3002/coverage/unit/) | Unit test code coverage report
[localhost:3002/coverage/integration](http://localhost:3002/coverage/integration/) | Integration test coverage report
[localhost:3002/doc](http://localhost:3002/doc/) | API documentation

The pages will automatically be updated as you make changes. I recommend viewing the test reports using Google Chrome, because Stack Traces will then be remapped to the original Typescript source files ([`source-map-support`](https://www.npmjs.com/package/source-map-support) only support Google Chrome in the moment).

### Tasks

To check your code, you can use these tasks:

Task | Description
--- | ---
`npm test` | Run all checks.
`gulp lint` | Lint the code.
`gulp test` | Run only tests, without linting.
`gulp unit-test` | Run only unit tests.
`gulp integration-test` | Run only the integration test.
