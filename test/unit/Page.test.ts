import Page from '../../lib/Page';
import FakeIssoServer from '../util/FakeIssoServer';
import {expect} from 'chai';
import Location from '../util/Location';
import {requestFor, successResponse} from '../util/SuperagentStub';

const server = new FakeIssoServer();

describe('Page', () => {
	it('has no comments when new', () => {
		const page = new Page(server, 'test/uri');

		expect(page.comments.count).to.equal(0);
		expect(page.comments.deepCount).to.equal(0);
		expect(page.comments.length).to.equal(0);
	});

	it('can obtain the current page', () => {
		Location.update('/this/is/the/uri');
		const page = Page.getCurrent(server);

		expect(page.uri).to.equal('/this/is/the/uri');

		Location.reset();
	});

	it('can send a request', () => {
		const page = new Page(server, 'test/uri');
		const request = requestFor(successResponse());
		return page.send(request, a => a).then(() => {
			expect(request.end).to.have.been.called;
		});
	});

	it('rejects promises for failed requests', () => {
		const page = new Page(server, 'test/uri');
		const request = requestFor(callback => callback(new Error('test'), null));
		return expect(page.send(request, a => a)).to.be.rejectedWith(Error, 'test');
	});

	it('recovers after a failed request', () => {
		const page = new Page(server, 'test/uri');
		const errorRequest = requestFor(callback => callback(new Error('test'), null));
		const request = requestFor(successResponse());
		return Promise.all([
			expect(page.send(errorRequest, a => a)).to.be.rejected,
			expect(page.send(request, a => a)).to.be.fulfilled
		]);
	});
});
