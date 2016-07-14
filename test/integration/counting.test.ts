import {expect} from 'chai';

import Page from '../../lib/Page';

export default (pages: Array<Page>) => describe('counting comments on pages', () => {
	it('collective deep count', () => {
		return Promise.all(pages.map(page => page.comments.fetchDeepCount()))
			.then(() => {
				expect(pages[0].comments.deepCount).to.equal(7);
				expect(pages[1].comments.deepCount).to.equal(10);
				expect(pages[2].comments.deepCount).to.equal(0);
				expect(pages[3].comments.deepCount).to.equal(0);
			});
	});

	it('flat count', () => {
		return Promise.all(pages.map(page => page.comments.fetchCount()))
			.then(() => {
				expect(pages[0].comments.count).to.equal(4);
				expect(pages[1].comments.count).to.equal(10);
				expect(pages[2].comments.count).to.equal(0);
				expect(pages[3].comments.count).to.equal(0);
			});
	});
});
