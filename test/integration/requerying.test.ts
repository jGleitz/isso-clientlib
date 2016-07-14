import Page from '../../lib/Page';

import {expect} from 'chai';

export default (pages: Array<Page>) => describe('updating comments from the server', () => {

	it('recognising a deleted comment', () => {
		expect(pages[1].comments).to.have.length(9);
		const comment = pages[1].comments[3];

		return pages[1].comments.fetch().then(() => {
			expect(pages[1].comments).to.have.length(8);
			expect(comment.deleted).to.be.true;
		});
	});
});
