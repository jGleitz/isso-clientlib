/**
 * Module offering a web server through which instances of an isso server can be requested and controlled.
 */

import { ChildProcess, exec, execFile } from 'child_process';
import { promisify } from 'typed-promisify';
import * as fs from 'fs';
import * as http from 'http';
import * as url from 'url';
import * as rimraf from 'rimraf';
import { communicationServerPort as COMMUNICATION_SERVER_PORT } from '../fixtures/issoManagementParameters';
import testPageMiddleware from './testPageMiddleware';

const rmrf = promisify(rimraf) as (path: string) => Promise<void>;
const writeFile = promisify(fs.writeFile) as (path: string, content: any) => Promise<void>;

export const COMMUNICATION_WEBSITE = `http://localhost:${COMMUNICATION_SERVER_PORT}`;
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

const OK = () => ({
	ok: true
});

/**
 * Whether to print the command line output of executed commands and additional debug output.
 */
let print = true;

/**
 * Number of isso instances.
 */
let instancecount = 0;

function log(line: string): void {
	if (print) {
		console.log(line);
	}
}

/**
 * Removes a newline from the end of the provided `inputString`.
 *
 * @param inputString    The string to process.
 * @return The input string. If it had a line break at its end, it was removed.
 */
function trimNewline(inputString: string): string {
	return inputString.replace(/\r?\n$/, '');
}

/**
 * Prints the command line output of the provided `spawned` to the console iff `print` is true.
 *
 * @param spawned    A child process to print the output of.
 */
function printSpawned(spawned: ChildProcess): void {
	if (print) {
		spawned.stdout.on('data', data => console.log(trimNewline(data.toString())));
		spawned.stderr.on('data', data => console.error(trimNewline(data.toString())));
	}
}

/**
 * Kills the provided `process`.
 *
 * @param process    The process to kill.
 * @return A promise that will be resolved when the process was killed.
 */
function kill(process: ChildProcess): Promise<void> {
	return new Promise((resolve, reject) => {
		process.on('error', reject);
		process.on('exit', resolve);
		process.kill();
	});
}

/**
 * Executes the provided `commands` on the command line.
 *
 * @param commands    The commands to execute.
 * @param spawnedHandler    An optional function that accepts the spawned child process.
 * @return A promise that will be resolved with the commands’ output when the command finished executing. It will be
 *        rejected if executing the commands failed or anything was printed to stderr.
 */
function execScript(commands: string, spawnedHandler?: (process: ChildProcess) => void): Promise<string> {
	return new Promise((resolve, reject) => {
		const spawned = exec(commands, (error, stdout, stderr) => {
			if (spawnedHandler) {
				spawnedHandler(spawned);
			}
			if (error !== null) {
				reject(error);
			} else {
				resolve(stdout);
			}
		});
		printSpawned(spawned);
	});
}

const installscript = `
set -e

here="$(mktemp -d)"
cd "$here"

# Prefer python 3.5 over python 2.7
if which python3 && python3 -m venv --help > /dev/null && python3 -m ensurepip --version; then
	python3 -m venv "$here"
elif which python2 && which virtualenv; then
	virtualenv "$here"
else
	echo 'Please install python 2 or 3 together with the according python-dev package!\
	 For python3, please install also python3-venv!'
	exit 1
fi

. "$here"/bin/activate
pip install isso
echo "$here"`;

export default class IssoManagement {
	private static _issoloc?: string;
	private static readonly issos: Array<Isso> = [];
	private static readonly freeList: Array<number> = [];
	private static communicationServer?: http.Server;

	public static get issoloc(): string | undefined {
		return this._issoloc;
	}

	/**
	 * Installs isso.
	 *
	 * @return A promise that will be resolved when isso is installed.
	 */
	public static install(): Promise<void> {
		if (this.issoloc === undefined) {
			return execScript(installscript)
				.then(result => {
					this._issoloc = trimNewline(result).split(/\r?\n/).pop();
				});
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * Starts the isso service. This will not actually start an isso server instance. Instead, it will start a HTTP
	 * server on `localhost:3010` that can be used to control an isso server instance.
	 *
	 * @return A promise that will be resolved when isso started.
	 */
	public static start(): Promise<void> {
		if (this.issoloc === undefined) {
			throw new Error('You must install isso first!');
		}

		return this.startCommunicationServer();
	}

	private static startCommunicationServer(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.communicationServer === undefined) {
				this.communicationServer = http.createServer(this.communicationServerHandler.bind(IssoManagement));
				this.communicationServer.listen(COMMUNICATION_SERVER_PORT, resolve);
			} else {
				resolve();
			}
		});
	}

	private static stopCommunicationServer(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.communicationServer !== undefined) {
				this.communicationServer.close(resolve);
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
	public static stop(): Promise<void> {
		return Promise.all([
			Promise.all(this.issos.map(isso => isso.stop())),
			this.stopCommunicationServer()
		]) as Promise<any>;
	}

	/**
	 * Destroys the isso installation.
	 *
	 * @return A promise that will be resolved whten the installation was removed.
	 */
	public static destroy(): Promise<void> {
		return this.stop()
			.then(() => this.issoloc !== undefined ? rmrf(this.issoloc) : Promise.resolve())
			.then(() => this._issoloc = undefined);
	}

	private static getIsso(id?: string): Isso {
		let numericId: number;
		if (id === undefined) {
			if (this.freeList.length > 0) {
				numericId = this.freeList.shift()!;
			} else {
				numericId = instancecount++;
				// tslint:disable-next-line no-use-before-declare TODO figure out if this can be fixed more easily
				this.issos[numericId] = new Isso(numericId);
			}
		} else {
			numericId = this.checkIssoId(id);
		}
		return this.issos[numericId];
	}

	private static announceFreeId(id: string): void {
		this.freeList.push(this.checkIssoId(id));
	}

	private static checkIssoId(id: string): number {
		const numericId = Number.parseInt(id, 10);
		if (Number.isNaN(numericId) || numericId < 0) {
			throw new Error(`The provided id '${id}' is not a non-negative integer!`);
		}
		return numericId;
	}

	public static printOutput(doPrint: boolean): void {
		print = doPrint;
	}

	/**
	 * Replies to requests to the communication server.
	 */
	private static communicationServerHandler(request: http.IncomingMessage, response: http.ServerResponse): void {
		let promise: Promise<any>;
		const query = url.parse(request.url!, true);
		response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
		response.setHeader('Access-Control-Allow-Methods', 'GET');
		response.setHeader('Content-Type', 'application/json');
		const id = query.query.id;
		let isso: Isso;

		if (Array.isArray(id)) {
			throw new Error('Please provide at most one id!');
		}

		switch (query.pathname) {
			case '/create':
				if (id !== undefined) {
					promise = Promise.reject('Cannot set the id for a new instance!');
				} else {
					isso = this.getIsso(undefined);
					promise = isso.stop()
						.then(() => isso.removeDatabase())
						.then(() => isso.writeConfigFile())
						.then(() => log(`Created Isso #${isso.id}`))
						.then(() => isso.start())
						.then(() => log(`Started Isso #${isso.id}`))
						.then(() => isso.responseData);
				}
				break;
			case '/start':
				if (id === undefined) {
					promise = Promise.reject('No id provided!');
				} else {
					isso = this.getIsso(id);
					isso.moderated = query.query.moderation === 'active';
					promise = isso.stop()
						.then(() => isso.writeConfigFile())
						.then(() => isso.start())
						.then(() => log(`Re-started Isso #${isso.id}${isso.moderated ? ' (moderated)' : ''}`))
						.then(() => isso.responseData);
				}
				break;
			case '/stop':
				if (id === undefined) {
					promise = Promise.reject('No id provided!');
				} else {
					promise = this.getIsso(id).stop()
						.then(() => log(`Stopped Isso #${isso.id}`))
						.then(OK);
				}
				break;
			case '/return':
				if (id === undefined) {
					promise = Promise.reject('No id provided!');
				} else {
					isso = this.getIsso(id);
					isso.moderated = false;
					promise = isso.stop()
						.then(() => isso.removeDatabase())
						.then(() => this.announceFreeId(id))
						.then(() => log(`Returned Isso #${isso.id}`))
						.then(OK);
				}
				break;
			default:
				testPageMiddleware(request, response, () => {
					response.statusCode = 500;
					response.end('Invalid enpoint');
				});
				return;
		}
		promise.then(result => response.end(JSON.stringify(result)))
			.catch(error => {
				console.error(error);
				response.setHeader('Content-Type', 'text/plain');
				response.statusCode = 500;
				response.end(error.toString());
			});
	}
}


class Isso {
	// Whether comments on this instance need moderation. This instance’s config file must be rewritten after
	// this setting was changed!
	public moderated = false;
	private process?: ChildProcess;
	private _started = false;
	public get started(): boolean {
		return this._started;
	}

	/**
	 * The port at which this instance can be reachend.
	 */
	public readonly port = BASE_PORT + this.id;

	/**
	 * Creates a new isso server instance with the given instance id (but does not start it)
	 */
	constructor(public readonly id: number) {
	}

	/**
	 * Starts this instance if it’s not already running.
	 *
	 * @return A promise that will be resolved when this instance is running.
	 */
	public start(): Promise<void> {
		if (this.process === undefined) {
			return new Promise((resolve, reject) => {
				this.process = execFile(
					`${IssoManagement.issoloc}/bin/isso`,
					['-c', this.configLocation, 'run'],
					error => {
						if (error) {
							this.process = undefined;
							reject(error);
						}
					});
				this.process.stderr.on('data', data => {
					if (data instanceof Buffer) {
						throw Error('Expected a string, got a Buffer!');
					}
					if (!this.started) {
						if (!INFO_REGEX.test(data)) {
							this.process = undefined;
							console.error(data);
							reject(data);
						} else if (STARTED_REGEX.test(data)) {
							this._started = true;
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
	 * Stops this instance if it’s running.
	 *
	 * @return A promise that will be resolved when this instance is stopped.
	 */
	public stop(): Promise<void> {
		if (this.process !== undefined) {
			return kill(this.process)
				.then(() => {
					this.process = undefined;
					this._started = false;
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
	public removeDatabase(): Promise<void> {
		return rmrf(this.dbLocation);
	}

	/**
	 * (Re-)writes this instance’s configuration file. Should be used after a setting of this instance
	 * was changed.
	 *
	 * @return A promise that will be resolved when this instance’s config file was (re-)written.
	 */
	public writeConfigFile(): Promise<void> {
		const config = `
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
		return writeFile(this.configLocation, config);
	}

	private get configLocation(): string {
		return `${IssoManagement.issoloc}/isso-${this.id}.conf`;
	}

	private get dbLocation(): string {
		return `${IssoManagement.issoloc}/comments-${this.id}.db`;
	}

	/**
	 * An object representing this instance to the client.
	 */
	public get responseData(): object {
		return {
			id: this.id,
			url: `http://localhost:${this.port}/`
		};
	}
}
