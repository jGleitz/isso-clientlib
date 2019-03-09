import IssoServer from '../../lib/IssoServer';
import * as Http from 'superagent';
import { RequestCallback, SuperagentEndStub } from './SuperagentStub';
import SpyInstance = jest.SpyInstance;

type stubRegistry = { [endpoint: string]: Http.Request[] };

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

	private stubs!: { get: stubRegistry; post: stubRegistry; put: stubRegistry; delete: stubRegistry; };

	/**
	 * Resets the server, making it forget all provided stubs. This method should
	 * be called after every test to avoid unexpected behaviour after an expected
	 * HTTP request was not made.
	 */
	public reset(): void {
		for (const method in this.stubs) {
			const registry = (<any>this.stubs)[method];
			for (const endpoint in registry) {
				if (registry[endpoint].length > 0) {
					registry[endpoint] = [];
					throw new Error(`An expected ${method.toUpperCase()} request for '${endpoint}' did not occur!`);
				}
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
	public responseToGet(endpoint: string, endStub: SuperagentEndStub): SpyInstance {
		return this.registerStub('get', endpoint, endStub);
	}

	/**
	 * Registers the provided `endStub` to be used to stub a `POST` request to the
	 * provided `endpoint`. Multiple provided stubs will be queued and be used
	 * in the order they were registered.
	 *
	 * @return The sinon stub created out of the provided `endStub`.
	 */
	public responseToPost(endpoint: string, endStub: SuperagentEndStub): SpyInstance {
		return this.registerStub('post', endpoint, endStub);
	}

	/**
	 * Registers the provided `endStub` to be used to stub a `PUT` request to the
	 * provided `endpoint`. Multiple provided stubs will be queued and be used
	 * in the order they were registered.
	 *
	 * @return The sinon stub created out of the provided `endStub`.
	 */
	public responseToPut(endpoint: string, endStub: SuperagentEndStub): SpyInstance {
		return this.registerStub('put', endpoint, endStub);
	}

	/**
	 * Registers the provided `endStub` to be used to stub a `DELETE` request to the
	 * provided `endpoint`. Multiple provided stubs will be queued and be used
	 * in the order they were registered.
	 *
	 * @return The sinon stub created out of the provided `endStub`.
	 */
	public responseToDelete(endpoint: string, endStub: SuperagentEndStub): SpyInstance {
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

	private registerStub(method: string, endpoint: string, endStub: SuperagentEndStub): SpyInstance {
		const requestFactory = <(url: string) => Http.Request>(<any>Http)[method];
		const registry = <stubRegistry>(<any>this.stubs)[method];

		const request = requestFactory(`https://comments.exapmle.com${endpoint}`);
		const stub = jest.spyOn(request, 'end')
			.mockName('request.end')
			.mockImplementation(function (this: Http.Request, callback?: RequestCallback): Http.Request {
				endStub.call(this, callback || (() => null));
				return request;
			});

		(registry[endpoint] = registry[endpoint] || []).push(request);
		return stub;
	}

	private stubResponse(endpoint: string, method: ('get' | 'post' | 'put' | 'delete')): Http.Request {
		const registry = this.stubs[method];

		if (!registry[endpoint] || registry[endpoint].length === 0) {
			throw new Error(`An unexpected ${method.toUpperCase()} request was created for '${endpoint}'`);
		}

		return registry[endpoint].shift()!;
	}
}
