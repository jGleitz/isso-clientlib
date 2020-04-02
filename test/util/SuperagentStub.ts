import * as Http from 'superagent';

export type RequestCallback = (error: unknown, response: Http.Response) => void;
export type SuperagentEndStub = (
	callback: (error: unknown, response: Http.Response) => void
) => void;

export const NULL_REQUEST = (null as unknown) as Http.Response;

/**
 * Creates a Superagent request object that uses the provided
 * `endStub` to generate its outcome.
 *
 * @param endStub
 *        Function to use for the request’s `#end` method. You can use
 *        {@link #successResponse} or {@link #failResponse} to create it.
 * @return A superagent request suitable for testing.
 */
export function requestFor(endStub: SuperagentEndStub): Http.Request {
	const request = Http.get('https://comments.example.com/endpoint');
	jest
		.spyOn(request, 'end')
		.mockName('request.end')
		.mockImplementation(function(
			this: Http.Request,
			callback?: RequestCallback
		): Http.SuperAgentRequest {
			endStub.call(this, callback || (() => null));
			return request;
		});
	return request;
}

/**
 * Creates a function that can be used to stub Superagent’s `#end` method
 * in order to simualate a successful request that returned `body`.
 *
 * @param body
 *        The body the simulated request returned.
 * @param furtherOptions
 *        Further attributes to set on the simulated response object.
 * @return A stub for a superagent request’s `end` method.
 */
export function successResponse(body: unknown = {}, furtherOptions?: object): SuperagentEndStub {
	return callback => {
		callback(
			null,
			Object.assign(
				{
					ok: true,
					status: 200,
					text: JSON.stringify(body),
					body: body,
					type: 'application/json'
				},
				furtherOptions
			) as Http.Response
		);
	};
}

export function expectData(
	expectedData: unknown,
	responseStub: SuperagentEndStub
): SuperagentEndStub {
	return function(this: Http.Request & { _data: unknown }, callback: RequestCallback): void {
		expect(this._data).toEqual(expectedData);
		return responseStub(callback);
	};
}

/**
 * Creates a function that can be used to stub Superagent’s `#end` method
 * in order to simualate a failed request.
 *
 * @param furtherOptions
 *        Further attributes to set on the simulated response object.
 * @return A stub for a superagent request’s `end` method.
 */
export function failResponse(furtherOptions?: object): SuperagentEndStub {
	return callback => {
		callback(
			null,
			Object.assign(
				{
					ok: false,
					status: 404,
					text: 'The page could not be found',
					type: 'application/json',
					body: {}
				},
				furtherOptions
			) as Http.Response
		);
	};
}
