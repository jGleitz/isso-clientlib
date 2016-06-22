/**
 * Module constrolling an isso server instance that was made available for integration tests.
 */

import * as Http from 'superagent';

const SERVER_ADDRESS = 'http://localhost:3010/';

const makeVoid = () => <void> undefined;

let issoId: string;

function call(uri: string, query?: {[param: string]: string}): Promise<any> {
	return new Promise((resolve, reject) => {
		Http.get(SERVER_ADDRESS + uri)
			.query(query)
			.end((error, response) => {
				if (error) {
					reject(error);
				} else {
					if (response.ok) {
						resolve(response.body);
					} else {
						reject(response.text);
					}
				}
			});
		});
}

function assertId(): Promise<{}> {
	if (issoId !== undefined) {
		return Promise.resolve();
	} else {
		return Promise.reject(new Error('isso must be started first!'));
	}
}

/**
 * Starts an isso server instance. Has no effect if an instance is already running.
 *
 * @return A promise that will be resolved when the server instance was started (or is already running). The promise
 *		will be resolved with the url under which the server can be reached.
 */
export function start(): Promise<string> {
	if (issoId !== undefined) {
		return call('start', {id: issoId}).then(response => response.url);
	} else {
		return call('start').then(response => {issoId = response.id; return response.url; });
	}
}

/**
 * Stops a running isso server instance. Has no effect if no instance is running.
 *
 * @return A promise that will be resolved when the server instance was stopped (or none is running).
 */
export function stop(): Promise<void> {
	return assertId().then(() => call('stop', {id: issoId})).then(makeVoid);
}

/**
 * Starts a fresh server instance without any stored comments.
 *
 * @return A promise that will be resolved when the reset server instance was started.
 */
export function reset(): Promise<void> {
	return assertId().then(() => call('reset', {id: issoId})).then(makeVoid);
}

/**
 * Starts a server instance with moderation enabled.
 *
 * @return A promise that will be resolved when the server instance was started.
 */
export function enableModeration(): Promise<void> {
	return assertId().then(() => call('start', {moderation: 'active', id: issoId})).then(makeVoid);
}

/**
 * Starts a server instance with moderation disabled.
 *
 * @return A promise that will be resolved when the server instance was started.
 */
export function disableModeration(): Promise<void> {
	return assertId().then(() => call('start', {moderation: 'inactive', id: issoId})).then(makeVoid);
}

/**
 * Notifies the server that the test isn’t needing it anymore.
 *
 * @return A promise that will be resolved when the server instance was freed.
 */
export function finished(): Promise<void> {
	if (issoId !== undefined) {
		return call('return', {id: issoId}).then(() => issoId = undefined);
	} else {
		return Promise.resolve(undefined);
	}
}
