/**
 * Module constrolling an isso server instance that was made available for integration tests.
 */

import * as Http from 'superagent';
import { communicationServerPort as COMMUNICATION_SERVER_PORT } from '../fixtures/issoManagementParameters';

const SERVER_ADDRESS = `http://localhost:${COMMUNICATION_SERVER_PORT}`;

let issoId: string | undefined;

function call(uri: string, query: { [param: string]: string } = {}): Promise<unknown> {
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

function callWithIssoId(uri: string, query: { [param: string]: string } = {}): Promise<unknown> {
	if (issoId === undefined) {
		throw new Error('isso must be started first!');
	}
	return call(uri, { id: issoId, ...query });
}

/**
 * Starts an existing isso server instance. Has no effect if an instance is already running.
 *
 * @return A promise that will be resolved when the server instance was started (or is already running). The promise
 *        will be resolved with the url under which the server can be reached.
 */
export function start(): Promise<string> {
	return callWithIssoId('/start').then(response => (response as { url: string }).url);
}

/**
 * Stops a running isso server instance. Has no effect if no instance is running.
 *
 * @return A promise that will be resolved when the server instance was stopped (or none is running).
 */
export function stop(): Promise<void> {
	return (callWithIssoId('/stop') as unknown) as Promise<void>;
}

/**
 * Starts a fresh server instance without any stored comments.
 *
 * @return A promise that will be resolved when the reset server instance was started.
 */
export function create(): Promise<string> {
	if (issoId !== undefined) {
		return Promise.reject('There already is an existing Isso instance for this thread!');
	} else {
		return call('/create').then(response => {
			const responseObject = response as { id: string; url: string };
			issoId = responseObject.id;
			return responseObject.url;
		});
	}
}

/**
 * Starts a server instance with moderation enabled.
 *
 * @return A promise that will be resolved when the server instance was started.
 */
export function enableModeration(): Promise<void> {
	return (callWithIssoId('/start', { moderation: 'active' }) as unknown) as Promise<void>;
}

/**
 * Starts a server instance with moderation disabled.
 *
 * @return A promise that will be resolved when the server instance was started.
 */
export function disableModeration(): Promise<void> {
	return (callWithIssoId('/start', { moderation: 'inactive' }) as unknown) as Promise<void>;
}

/**
 * Notifies the server that the test isn’t needing it anymore.
 *
 * @return A promise that will be resolved when the server instance was freed.
 */
export function finished(): Promise<void> {
	if (issoId !== undefined) {
		return call('/return', { id: issoId }).then(() => (issoId = undefined));
	} else {
		return Promise.resolve();
	}
}
