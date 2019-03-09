require('ts-node/register');
const IssoManagement = require('../util/IssoManagement').default;
const fs = require('fs');
const chalk = require('chalk');

module.exports = async () => {
	process.stdout.write('\n\nInstalling Isso... ');
	await IssoManagement.install()
		.then(() => process.stdout.write(chalk.green('Done') + '\nStarting the Isso management server... '))
		.then(() => IssoManagement.start())
		.then(() => process.stdout.write(chalk.green('Done') + '\n\n'))
		.catch(err => {
			process.stdout.write(chalk.red('Error!') + '\n');
			throw err;
		});
};
