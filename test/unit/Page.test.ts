import Page from '../../lib/Page';
import FakeIssoServer from '../util/FakeIssoServer';
import Location from '../util/Location';
import { requestFor, successResponse, NULL_REQUEST } from '../util/SuperagentStub';

const server = new FakeIssoServer();

describe('Page', () => {
	it('has no comments when new', () => {
		const page = new Page(server, 'test/uri');

		expect(page.comments.count).toBe(0);
		expect(page.comments.deepCount).toBe(0);
		expect(page.comments.length).toBe(0);
	});

	it('inserts "/" at the start', () => {
		const pageWithout = new Page(server, 'test/uri');
		const pageWith = new Page(server, '/test/uri');
		expect(pageWithout.uri).toBe('/test/uri');
		expect(pageWith.uri).toBe('/test/uri');
	});

	it('can obtain the current page', () => {
		Location.update('/this/is/the/uri');
		const page = Page.getCurrent(server);

		expect(page.uri).toBe('/this/is/the/uri');

		Location.reset();
	});

	it('can send a request', () => {
		const page = new Page(server, 'test/uri');
		const request = requestFor(successResponse());
		return page.send(request, a => a).then(() => {
			expect(request.end).toHaveBeenCalled();
		});
	});

	it('can send a request from a factory', () => {
		const requestFactory = jest.fn(() => requestFor(successResponse()));
		let continueCallback!: () => void;
		const delayPromise = new Promise((resolve, reject) => continueCallback = resolve);
		const page = new Page(server, 'test/uri');
		const promises: Array<Promise<any>> = [];

		promises[0] = page.send(requestFor(successResponse()), () => {
			expect(requestFactory).not.toHaveBeenCalled();
			return delayPromise;
		});
		promises[1] = page.send(requestFactory, a => a).then(() => {
			expect(requestFactory).toHaveBeenCalled();
		});
		expect(requestFactory).not.toHaveBeenCalled();
		continueCallback!();
		return Promise.all(promises);
	});

	it('rejects promises for failed requests', () => {
		const page = new Page(server, 'test/uri');
		const request = requestFor(callback => callback(new Error('test'), NULL_REQUEST));
		return expect(page.send(request, a => a)).rejects.toThrowError('test');
	});

	it('recovers after a failed request', () => {
		const page = new Page(server, 'test/uri');
		const errorRequest = requestFor(callback => callback(new Error('test'), NULL_REQUEST));
		const request = requestFor(successResponse());
		return Promise.all([
			expect(page.send(errorRequest, a => a)).rejects,
			expect(page.send(request, a => a)).resolves
		]);
	});
});
