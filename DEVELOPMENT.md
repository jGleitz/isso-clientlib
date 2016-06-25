# Development Notes

This library is written in [TypeScript](https://www.typescriptlang.org/) and built using [gulp](http://gulpjs.com/). To get started, [install Node.js and npm](https://nodejs.org/en/download/) and run `npm install` in the project folder.

### Testing

The library is tested using both *unit* and *integration* tests. The integration test uses a real isso instance to make sure the library is always compatible to the latest isso. In order to run the integration test, you need to install python, the python headers and *virtualenv*. On Debian/Ubuntu, run:
```
sudo apt-get install python3.5 python3.5-dev python3.5-venv
```

### Tasks

To check your code, you can use these tasks:

Task | Meaning
--- | ---
`npm test` | Run all checks.
`gulp lint` | Lint the code.
`gulp test` | Run only tests, without linting.
`gulp unit-test` | Run only unit tests.
`gulp integration-test` | Run only the integration test.
