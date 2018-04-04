import IssoServer from '../../lib/IssoServer';
import * as Http from 'superagent';
import { superagentEndStub } from './SuperagentStub';
import { assert } from 'chai';

type stubRegistry = {[endpoint: string]: Array<Http.Request>};

/**
 * An `IssoServer` that can be used in tests in order to simulate certain
 * server responses. The `responseTo*` methods can be used to program the
 * responses requests will create.
 */
export default class FakeIssoServer extends IssoServer {

	constructor() {
		super('https://comments.example.com');
		this.reset();
	}

	private stubs: {get: stubRegistry, post: stubRegistry, put: stubRegistry, delete: stubRegistry};

	/**
	 * Resets the server, making it forget all provided stubs. This method should
	 * be called after every test to avoid unexpected behaviour after an expected
	 * HTTP request was not made.
	 */
	public reset(): void {
		for (let method in this.stubs) {
			const registry = (<any> this.stubs)[method];
			for (let endpoint in registry) {
				assert(registry[endpoint].length === 0,
					`An expected ${method.toUpperCase()} request for '${endpoint}' did not occur!`);
			}
		}
		this.stubs = {
			get: {},
			post: {},
			put: {},
			delete: {}
		};
	}

	/**
	 * Registers the provided `endStub` to be used to stub a `GET` request to the
	 * provided `endpoint`. Multiple provided stubs will be queued and be used
	 * in the order they were registered.
	 *
	 * @return The sinon stub created out of the provided `endStub`.
	 */
	public responseToGet(endpoint: string, endStub: superagentEndStub): Sinon.SinonStub {
		return this.registerStub('get', endpoint, endStub);
	}

	/**
	 * Registers the provided `endStub` to be used to stub a `POST` request to the
	 * provided `endpoint`. Multiple provided stubs will be queued and be used
	 * in the order they were registered.
	 *
	 * @return The sinon stub created out of the provided `endStub`.
	 */
	public responseToPost(endpoint: string, endStub: superagentEndStub): Sinon.SinonStub {
		return this.registerStub('post', endpoint, endStub);
	}

	/**
	 * Registers the provided `endStub` to be used to stub a `PUT` request to the
	 * provided `endpoint`. Multiple provided stubs will be queued and be used
	 * in the order they were registered.
	 *
	 * @return The sinon stub created out of the provided `endStub`.
	 */
	public responseToPut(endpoint: string, endStub: superagentEndStub): Sinon.SinonStub {
		return this.registerStub('put', endpoint, endStub);
	}

	/**
	 * Registers the provided `endStub` to be used to stub a `DELETE` request to the
	 * provided `endpoint`. Multiple provided stubs will be queued and be used
	 * in the order they were registered.
	 *
	 * @return The sinon stub created out of the provided `endStub`.
	 */
	public responseToDelete(endpoint: string, endStub: superagentEndStub): Sinon.SinonStub {
		return this.registerStub('delete', endpoint, endStub);
	}

	public get(endpoint: string): Http.Request {
		return this.stubResponse(endpoint, 'get');
	}

	public post(endpoint: string): Http.Request {
		return this.stubResponse(endpoint, 'post');
	}

	public put(endpoint: string): Http.Request {
		return this.stubResponse(endpoint, 'put');
	}

	public delete(endpoint: string): Http.Request {
		return this.stubResponse(endpoint, 'delete');
	}

	private registerStub(method: string, endpoint: string, endStub: superagentEndStub): Sinon.SinonStub  {
		const requestFactory = <(url: string) => Http.Request> (<any>Http)[method];
		const registry = <stubRegistry> (<any>this.stubs)[method];

		const request = requestFactory(`https://comments.exapmle.com${endpoint}`);
		const stub = sinon.stub(request, 'end', endStub);

		(registry[endpoint] = registry[endpoint] || []).push(request);
		return stub;
	}

	private stubResponse(endpoint: string, method: string): Http.Request {
		const registry = <stubRegistry> (<any>this.stubs)[method];

		assert(registry[endpoint] && registry[endpoint].length > 0,
			`An unexpected ${method.toUpperCase()} request was created for '${endpoint}'`);

		return registry[endpoint].shift();
	}
}
