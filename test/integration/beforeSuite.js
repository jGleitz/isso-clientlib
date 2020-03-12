/* eslint-env node */

require('ts-node/register');
const IssoManagement = require('../util/IssoManagement').default;
const chalk = require('chalk');

module.exports = () => {
	process.stdout.write('\n\nInstalling Isso... ');
	return IssoManagement.install()
		.then(() =>
			process.stdout.write(chalk.green('Done') + '\nStarting the Isso management server... ')
		)
		.then(() => IssoManagement.start())
		.then(() => process.stdout.write(chalk.green('Done') + '\n\n'))
		.catch(err => {
			process.stdout.write(chalk.red('Error!') + '\n');
			throw err;
		});
};
