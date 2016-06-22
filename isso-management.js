/**
 * Module offering a web server through which instances of an isso server can be requested and controlled.
 */

const process = require('child_process');
const promisify = require('node-promisify');
const fs = require('fs')
const http = require('http');
const url = require('url');
const rmrf = promisify(require('rimraf'));
const testPageMiddleware = require('./test/util/testPageMiddleware');
const writeFile = promisify(fs.writeFile);

const COMMUNICATION_SERVER_PORT = 3010;
const COMMUNICATION_WEBSITE = `http://localhost:${COMMUNICATION_SERVER_PORT}`;
const BASE_PORT = 3020;

/*
 * Pattern for messages that are only for information, despite being printed to stderr.
 */
const infoPattern = '[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3} INFO:';
const INFO_REGEX = new RegExp(infoPattern);
/*
 * Isso’s output when it’s started.
 */
const STARTED_REGEX = new RegExp(`${infoPattern} connected to ${COMMUNICATION_WEBSITE}`);

const OK = () => {ok: true};

/**
 * Whether to print the command line output of the commands executed by this module.
 */
let print = true;

/**
 * Whether moderation should be activated.
 */
let moderationActive = false;

/**
 * Number of isso instances.
 */
let instancecount = 0;

/**
 * Removes a newline from the end of the provided `inputString`.
 *
 * @param string	The string to process.
 * @return The input string. If it had a line break at its end, it was removed.
 */
function trimNewline(inputString) {
	return inputString.replace(/\r?\n$/, '');
}

/**
 * Prints the command line output of the provided `spawned` to the console iff `print` is true.
 *
 * @param spawned	A child process to print the output of.
 */
function printSpawned(spawned) {
	if (print) {
		spawned.stdout.on('data', data => console.log(trimNewline(data.toString())));
		spawned.stderr.on('data', data => console.error(trimNewline(data.toString())));
	}
}

/**
 * Kills the provided `process`.
 *
 * @param process	The process to kill.
 * @return A promise that will be resolved when the process was killed.
 */
function kill(process) {
	return new Promise((resolve, reject) => {
		process.on('error', reject);
		process.on('exit', resolve);;
		process.kill();
	});
}

/**
 * Executes the provided `commands` on the command line.
 *
 * @param commands	The commands to execute.
 * @param spawnedHandler	An optional function that accepts the spawned child process.
 * @return A promise that will be resolved with the command’s output when the command finished excuting. It will be
 *		rejected if executing the command failed or anything was printed to stderr.
 */
function exec(command, spawnedHandler) {
	return new Promise((resolve, reject) => {
		const spawned = process.exec(command, {shell: '/bin/bash'}, (error, stdout, stderr) => {
			if (spawnedHandler) {
				spawnedHandler(spawned);
			}
			if (error !== null) {
				reject(error);
			} else if (stderr.trim() !== '') {
				reject(stderr);
			} else {
				resolve(stdout);
			}
		});
		printSpawned(spawned);
	});
}


let issoloc = null;
let issos = [];
let freeList = [];
let communicationServer = null;

const installscript = `
cd "$(mktemp -d)"
virtualenv .
source ./bin/activate
pip install isso
realpath .`;

/**
 * Installs isso.
 *
 * @return A promise that will be resolved when isso is installed.
 */
function install() {
	if (issoloc === null) {
		return exec(installscript)
			.then(result => issoloc = trimNewline(result).split(/\r?\n/).pop());
	} else {
		return Promise.resolve();
	}
}

function getIsso(id) {
	if (id === undefined) {
		if (freeList.length > 0) {
			id = freeList.shift();
		} else {
			id = instancecount++;
			issos[id] = new Isso(id);
		}
	}
	return issos[id];
}

function freeId(id) {
	freeList.push(id);
}

/**
 * Replies to requests to the communication server.
 */
function communicationServerResponse(request, response) {
	let promise;
	const query = url.parse(request.url, true);
	response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
	response.setHeader('Access-Control-Allow-Methods', 'GET');
	response.setHeader('Content-Type', 'application/json');
	const id = query.query.id;
	let isso;

	switch(query.pathname) {
		case '/reset':
			if (id === undefined) {
				promise = Promise.reject('No id provided!');
			} else {
				isso = getIsso(id);
				promise = isso.stop()
					.then(() => isso.removeDatabase())
					.then(() => isso.writeConfigFile())
					.then(() => isso.start())
					.then(() => isso.responseData);
			}
			break;
		case '/start':
			isso = getIsso(id);
			isso.moderated = query.query.moderation === 'active';
			promise = isso.stop()
				.then(() => isso.writeConfigFile())
				.then(() => isso.start())
				.then(() => isso.responseData);
			break;
		case '/stop':
			if (id === undefined) {
				promise = Promise.reject('No id provided!');
			} else {
				promise = getIsso(id).stop()
					.then(OK);
			}
			break;
		case '/return':
			if (id === undefined) {
				promise = Promise.reject('No id provided!');
			} else {
				isso = getIsso(id);
				isso.moderated = false;
				promise = isso.stop()
					.then(() => isso.removeDatabase())
					.then(() => freeId(id))
					.then(OK);
			}
			break;
		default:
			testPageMiddleware(request, response, () => {response.statusCode = 500; response.end('Invalid enpoint')});
			return;
	}
	promise.then(result => response.end(JSON.stringify(result)))
		.catch(error => {console.error(error.toString()); response.statusCode = 500; response.end(error.toString())});
}

function startCommunicationServer() {
	return new Promise((resolve, reject) => {
		if (communicationServer === null) {
			communicationServer = http.createServer(communicationServerResponse);
			communicationServer.listen(COMMUNICATION_SERVER_PORT, resolve);
		} else {
			resolve();
		}
	});
}

/**
 * Starts the isso service. This will not actually start an isso server instance. Instead, it will start a HTTP
 * server on `localhost:3010` that can be used to control an isso server instance.
 *
 * @return A promise that will be resolved when isso started.
 */
function start() {
	if (issoloc === null) {
		throw new Error('You must install isso first!');
	}

	return startCommunicationServer();
}

function stopCommunicationServer() {
	return new Promise((resolve, reject) => {
		if (communicationServer !== null) {
			communicationServer.close(resolve);
		} else {
			resolve();
		}
	});
}

/**
 * Stops isso.
 *
 * @return A promise that will be resolved when isso was stopped.
 */
function stop() {
	return Promise.all([Promise.all(issos.map(isso => isso.stop())), stopCommunicationServer()]);
}

/**
 * Destroys the isso installation.
 *
 * @return A promise that will be resolved when the installation was removed.
 */
function destroy() {
	return stop()
		.then(() => rmrf(issoloc))
		.then(() => issoloc = null);
}

class Isso {

	/**
	 * Creates a new isso server instance (but does not start it)
	 */
	constructor(id) {
		/**
		 * This instance’s id.
		 */
		this.id = id;
		this.configLocation = `${issoloc}/isso-${id}.conf`;
		this.dbLocation = `${issoloc}/comments-${id}.db`;
		/**
		 * Whether comments on this instance need moderation. This instance’s config file must be rewritten after
		 * this setting was changed!
		 */
		this.moderated = false;
		this.process = null;
		this.started = false;
		/**
		 * The port at which this instance can be reachend.
		 */
		this.port = BASE_PORT + id;
		/**
		 * An object representing this instance to the client.
		 */
		this.responseData = {
			id: id,
			url: `http://localhost:${this.port}/`
		}
	}

	/**
	 * Starts this instance if it’s not already running.
	 *
	 * @return A promise that will be resolved when this instance is running.
	 */
	start() {
		if (this.process === null) {
			return new Promise((resolve, reject) => {
				this.process = process.execFile(`${issoloc}/bin/isso`, ['-c', this.configLocation, 'run'], error => {
					if (error !== null) {
						this.process = null;
						reject(error);
					}
				});
				this.process.stderr.on('data', data => {
					if (!this.started) {
						if (!INFO_REGEX.test(data)) {
							this.process = null;
							reject(data);
						} else if (STARTED_REGEX.test(data)) {
							this.started = true;
							resolve();
						}
					}
				});
				printSpawned(this.process);
			});
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * Starts this instance if it’s running.
	 *
	 * @return A promise that will be resolved when this instance is stopped.
	 */
	stop() {
		if (this.process !== null) {
			return kill(this.process)
				.then(() => {
					this.process = null;
					this.started = false;
				});
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * Removes this instance’s database, deleting all comments known to it.
	 *
	 * @return A promise that will be resolved when the database was deleted.
	 */
	removeDatabase() {
		return rmrf(this.dbLocation);
	}

	/**
	 * (Re-)writes this instance’s configuration file. Should be used after a setting of this instance
	 * was changed.
	 *
	 * @return A promise that will be resolved when this instance’s config file was (re-)written.
	 */
	writeConfigFile() {
		const config =  `
			[general]
			dbpath = ${this.dbLocation}
			host =
			  ${COMMUNICATION_WEBSITE}
			  http://localhost:3000/

			[server]
			listen = http://localhost:${this.port}/

			[moderation]
			enabled = ${this.moderated}

			[guard]
			enabled = false
		`.replace(/\t/g, '');
		return writeFile(this.configLocation, config, {});
	}
}

module.exports = {
	printOutput: doPrint => print = doPrint,
	install: install,
	start: start,
	destroy: destroy
}
