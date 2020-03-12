/* eslint-env node */

require('ts-node/register');
const IssoManagement = require('../util/IssoManagement').default;
const chalk = require('chalk');

module.exports = async () => {
	process.stdout.write('\nStopping the Isso management server and removing Isso... ');
	await IssoManagement.destroy()
		.then(() => process.stdout.write(chalk.green('Done') + '\n\n'))
		.catch(err => {
			process.stdout.write(chalk.red('Error!') + '\n');
			throw err;
		});
};
