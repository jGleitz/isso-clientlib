import Page from '../../lib/Page';

import pageUris from '../fixtures/pageUris';

import {expect} from 'chai';


export default (pages: Array<Page>) => describe('deleting comments', () => {
	it('from the page it was created on', () => {
		const comment = pages[1].comments[3];
		return comment.delete()
			.then(() => {
				expect(pages[1].comments).to.have.length(9);
				expect(comment.deleted).to.be.true;

				for (let i = 0; i < pages[1].comments.length; i++) {
					expect(pages[1].comments[i]).to.exist;
					expect(pages[1].comments[i]).to.not.equal(comment);
					expect(pages[1].comments.byId(comment.id)).to.be.undefined;
				}
			});
	});

	it('from a new page instance', () => {
		const page = new Page(pages[1].server, pageUris[1]);

		return page.comments.fetch().then(() => {
			const comment = page.comments[3];
			return comment.delete()
				.then(() => {
					expect(page.comments).to.have.length(8);
					expect(comment.deleted).to.be.true;

					for (let i = 0; i < page.comments.length; i++) {
						expect(page.comments[i]).to.exist;
						expect(page.comments[i]).to.not.equal(comment);
						expect(page.comments.byId(comment.id)).to.be.undefined;
					}
				});
			});
	});
});
