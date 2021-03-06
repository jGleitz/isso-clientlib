import * as Http from 'superagent';

/**
 * Abstraction of the isso comment server. This is the server storing the
 * comments. All requests will be sent to it.
 */
export default class IssoServer {

	/**
	 * URL of the isso server.
	 */
	private readonly baseUrl: string;

	/**
	 * Creates a server that can be reached at the provided `url`. There should
	 * usually be only one instance of this class.
	 *
	 * @param baseUrl    The url of the isso server to communicate with.
	 */
	constructor(baseUrl: string) {
		this.baseUrl = baseUrl.charAt(baseUrl.length - 1) === '/' ? baseUrl.substr(0, baseUrl.length - 1) : baseUrl;
	}

	/**
	 * Builds a HTTP GET request for the provided `endpoint`.
	 *
	 * @hidden
	 * @param endpoint    The endpoint URI, relative to this server’s base URL. Must start with a `/`.
	 * @return A request object to `GET` on `endpoint`.
	 */
	public get(endpoint: string): Http.Request {
		return Http.get(this.baseUrl + endpoint);
	}

	/**
	 * Builds a HTTP POST request for the provided `endpoint`.
	 *
	 * @hidden
	 * @param endpoint
	 *        The endpoint URI, relative to this server’s base URL. Must start with a `/`.
	 * @return A request object to `POST` on `endpoint`.
	 */
	public post(endpoint: string): Http.Request {
		return Http.post(this.baseUrl + endpoint)
			.set('Content-Type', 'application/json');
	}

	/**
	 * Builds a HTTP PUT request for the provided `endpoint`.
	 *
	 * @hidden
	 * @param endpoint    The endpoint URI, relative to this server’s base URL. Must start with a `/`.
	 * @return A request object to `PUT` on `endpoint`.
	 */
	public put(endpoint: string): Http.Request {
		return Http.put(this.baseUrl + endpoint);
	}

	/**
	 * Builds a HTTP DELETE request for the provided `endpoint`.
	 *
	 * @hidden
	 * @param endpoint    The endpoint URI, relative to this server’s base URL. Must start with a `/`.
	 * @return A request object to `DELETE` on `endpoint`.
	 */
	public delete(endpoint: string): Http.Request {
		return Http.del(this.baseUrl + endpoint);
	}
}
