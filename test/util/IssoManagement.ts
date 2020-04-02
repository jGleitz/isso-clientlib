// / <reference path="./hasbin.d.ts" />

/* eslint-env node */

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
import * as tmp from 'tmp-promise';
import * as hasbin from 'hasbin';

const rmrf = promisify(rimraf) as (path: string) => Promise<void>;
const writeFile = promisify(fs.writeFile) as (
	path: string,
	content: unknown,
	options?: fs.WriteFileOptions
) => Promise<void>;

const ISSO_IMAGE = 'wonderfall/isso';
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

const OK = (): { ok: true } => ({
	ok: true
});

/**
 * Whether to print the command line output of executed commands and additional debug output.
 */
let print = false;

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
		spawned.stdout?.on('data', data => console.log('ssso: ' + trimNewline(data.toString())));
		spawned.stderr?.on('data', data => console.error('ssse: ' + trimNewline(data.toString())));
	}
}

let dockerCache: string | null = null;

/**
 * Provides the docker executable to use (podman or docker)
 */
function findDocker(): Promise<string> {
	if (dockerCache !== null) {
		return Promise.resolve(dockerCache);
	}
	return new Promise((resolve, reject) => {
		hasbin.first(['podman', 'docker'], result => {
			if (result !== false) {
				dockerCache = result;
				resolve(result);
			}
			reject('Cannot find podman or docker. Please install one of them!');
		});
	});
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
 * @return A promise that will be resolved with the commands’ output when the command finished executing. It will be
 *        rejected if executing the commands failed or anything was printed to stderr.
 */
function execAndPrint(commands: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const spawned = exec(commands, (error, stdout) => {
			if (error !== null) {
				reject(error);
			} else {
				resolve(stdout);
			}
		});
		printSpawned(spawned);
	});
}

export default class IssoManagement {
	private static _issodir: tmp.DirectoryResult | null = null;
	private static readonly issos: Isso[] = [];
	private static readonly freeList: number[] = [];
	private static communicationServer?: http.Server;

	private static get installed(): boolean {
		return this._issodir !== null;
	}

	public static get issodir(): string {
		if (this._issodir === null) {
			throw new Error('isso was not installed yet!');
		}
		return this._issodir.path;
	}

	/**
	 * Installs isso.
	 *
	 * @return A promise that will be resolved when isso is installed.
	 */
	public static install(): Promise<void> {
		process.umask(0);
		if (this.installed) {
			return Promise.resolve();
		}
		let imageInstall: Promise<unknown>;
		if (process.env.OFFLINE === 'true') {
			imageInstall = findDocker()
				.then(docker => execAndPrint(`${docker} images ${ISSO_IMAGE} --noheading`))
				.then(output => {
					if (!output.includes(ISSO_IMAGE)) {
						throw Error('The isso image is not present, but offline mode is activated!');
					}
				});
		} else {
			imageInstall = findDocker().then(docker => execAndPrint(`${docker} pull ${ISSO_IMAGE}`));
		}
		return imageInstall
			.then(() => tmp.dir())
			.then(tmpdir => {
				this._issodir = tmpdir;
			});
	}

	/**
	 * Starts the isso service. This will not actually start an isso server instance. Instead, it will start a HTTP
	 * server on `localhost:3010` that can be used to contpullrol an isso server instance.
	 *
	 * @return A promise that will be resolved when isso started.
	 */
	public static start(): Promise<void> {
		if (!this.installed) {
			throw new Error('You must install isso first!');
		}

		return this.startCommunicationServer();
	}

	private static startCommunicationServer(): Promise<void> {
		return new Promise(resolve => {
			if (this.communicationServer === undefined) {
				this.communicationServer = http.createServer(
					this.communicationServerHandler.bind(IssoManagement)
				);
				this.communicationServer.listen(COMMUNICATION_SERVER_PORT, resolve);
			} else {
				resolve();
			}
		});
	}

	private static stopCommunicationServer(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.communicationServer !== undefined) {
				this.communicationServer.close(err => (err ? reject(err) : resolve()));
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
		return (Promise.all([
			...this.issos.map(isso => isso.stop()),
			this.stopCommunicationServer()
		]) as unknown) as Promise<void>;
	}

	/**
	 * Destroys the isso installation.
	 *
	 * @return A promise that will be resolved when the installation was removed.
	 */
	public static destroy(): Promise<void> {
		return this.stop()
			.then(() => this._issodir?.cleanup())
			.then(() => {
				this._issodir = null;
			});
	}

	private static getIsso(id?: string): Isso {
		let numericId: number;
		if (id === undefined) {
			if (this.freeList.length > 0) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				numericId = this.freeList.shift()!;
			} else {
				numericId = instancecount++;
				// eslint-disable-next-line @typescript-eslint/no-use-before-define
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
	private static communicationServerHandler(
		request: http.IncomingMessage,
		response: http.ServerResponse
	): void {
		let promise: Promise<object>;
		const query = url.parse(request.url || '', true);
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
					promise = isso
						.stop()
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
					promise = isso
						.stop()
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
					promise = this.getIsso(id)
						.stop()
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
					promise = isso
						.stop()
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
		promise
			.then(result => response.end(JSON.stringify(result)))
			.catch(error => {
				console.error(error);
				response.setHeader('Content-Type', 'text/plain');
				response.statusCode = 500;
				response.end(error.toString());
			});
	}
}

class Isso {
	// Whether comments on this instance need moderation.
	// This instance’s config file must be rewritten after this setting was changed!
	public moderated = false;
	private process?: ChildProcess;

	/**
	 * The port at which this instance can be reachend.
	 */
	public readonly port = BASE_PORT + this.id;

	/**
	 * Creates a new isso server instance with the given instance id (but does not start it)
	 */
	public constructor(public readonly id: number) {}

	/**
	 * Starts this instance if it’s not already running.
	 *
	 * @return A promise that will be resolved when this instance is running.
	 */
	public start(): Promise<void> {
		if (this.process !== undefined) {
			return Promise.resolve();
		}
		return findDocker().then(
			docker =>
				new Promise((resolve, reject) => {
					this.process = execFile(
						docker,
						[
							'run',
							'--rm',
							'--network',
							'host',
							'-v',
							`${this.configDir}:/config`,
							'-v',
							`${this.dbDir}:/db`,
							ISSO_IMAGE
						],
						error => {
							if (error && !error.killed) {
								this.stop().finally(() => reject(error));
							}
						}
					);
					const startTimeout = setTimeout(
						() => this.stop().finally(() => reject('Isso did not start within 20 seconds!')),
						20000
					);

					const startListener = (data: string): void => {
						clearTimeout(startTimeout);
						this.process?.stderr?.removeListener('data', startListener);
						if (!INFO_REGEX.test(data)) {
							console.error(data);
							this.stop().finally(() => reject(data));
						} else if (STARTED_REGEX.test(data)) {
							resolve();
						}
					};

					this.process.stderr?.on('data', startListener);
					printSpawned(this.process);
				})
		);
	}

	/**
	 * Stops this instance if it’s running.
	 *
	 * @return A promise that will be resolved when this instance is stopped.
	 */
	public stop(): Promise<void> {
		if (this.process !== undefined) {
			return kill(this.process).then(() => {
				this.process = undefined;
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
		return rmrf(this.dbDir).then(() =>
			fs.promises.mkdir(this.dbDir, { mode: 0o777, recursive: true })
		);
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
			dbpath = /db/comments.db
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
		return rmrf(this.configDir)
			.then(() => fs.promises.mkdir(this.configDir, { mode: 0o777, recursive: true }))
			.then(() => writeFile(`${this.configDir}/isso.conf`, config, { mode: 0o777 }));
	}

	private get configDir(): string {
		return `${IssoManagement.issodir}/conf/${this.id}`;
	}

	private get dbDir(): string {
		return `${IssoManagement.issodir}/db/${this.id}`;
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
