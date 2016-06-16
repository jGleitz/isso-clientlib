import * as Http from 'superagent';
import {expect} from 'chai';

import assign from './assign';

export type superagentEndStub = (callback: (error: any, resoponse: any) => void) => void;

/**
 * Creates a Superagent request object that uses the provided
 * `endStub` to generate its outcome.
 *
 * @param endStub
 *		Function to use for the request’s `#end` method. You can use
 *		{@link #successResponse} or {@link #failResponse} to create it.
 * @return A superagent request suitable for testing.
 */
export function requestFor(endStub: superagentEndStub): Http.Request<any> {
	const request = Http.get('https://comments.example.com/endpoint');
	sinon.stub(request, 'end', endStub);
	return request;
}

/**
 * Creates a function that can be used to stub Superagent’s `#end` method
 * in order to simualate a successful request that returned `body`.
 *
 * @param body
 *		The body the simulated request returned.
 * @param furtherOptions
 *		Further attributes to set on the simulated response object.
 * @return A stub for a superagent request’s `end` method.
 */
export function successResponse(body: any = {}, furtherOptions?: any): superagentEndStub {
	return callback => {
		callback(null, assign({
			ok: true,
			status: 200,
			text: JSON.stringify(body),
			body: body,
			type: 'application/json'
		}, furtherOptions));
	};
}

export function expectData(expectedData: any, responseStub: superagentEndStub): superagentEndStub {
	return function(callback) { // tslint:disable-line typedef
		expect(this._data).to.deep.equal(expectedData); // tslint:disable-line no-invalid-this
		return responseStub(callback);
	};
}

/**
 * Creates a function that can be used to stub Superagent’s `#end` method
 * in order to simualate a failed request.
 *
 * @param furtherOptions
 *		Further attributes to set on the simulated response object.
 * @return A stub for a superagent request’s `end` method.
 */
export function failResponse(furtherOptions?: any): superagentEndStub {
	return callback => {
		callback(null, assign({
			ok: false,
			status: 404,
			text: 'The page could not be found',
			type: 'application/json',
			body: {}
		}, furtherOptions));
	};
}
