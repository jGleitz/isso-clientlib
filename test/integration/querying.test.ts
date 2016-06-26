import {expect} from 'chai';

import pageUris from '../fixtures/pageUris';
import Page from '../../lib/Page';

export default (pages: Array<Page>) => describe('querying comments', () => {
	it('full list', () => {
		return new Page(pages[0].server, pageUris[0]).comments.fetch().then(list => {
			expect(list).to.have.length(4);
		});
	});
});
