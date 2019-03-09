import Page from '../../lib/Page';

import pageUris from '../fixtures/pageUris';
import * as Isso from '../util/isso-control';
import * as Testdata from './testdata';

let testPage: Page; // created from pageUris[1]

describe('deleting comments', () => {
	beforeAll(() => Isso.create()
	.then(Testdata.createPopulatedTestPages([pageUris[1]]))
	.then(pages => testPage = pages[0]));
	afterAll(Isso.finished);

	test('from the page it was created on', () => {
		const comment = testPage.comments[3];
		return comment.delete()
			.then(() => {
				expect(testPage.comments).toHaveLength(9);
				expect(comment.deleted).toBeTrue();

				for (let i = 0; i < testPage.comments.length; i++) {
					expect(testPage.comments[i]).not.toBeNil();
					expect(testPage.comments[i]).not.toEqual(comment);
				}
				expect(testPage.comments.byId(comment.id!)).toBeUndefined();
			});
	});

	test('from a new page instance', () => {
		const testPageCopy = new Page(testPage.server, pageUris[1]);

		return testPageCopy.comments.fetch().then(() => {
			const comment = testPageCopy.comments[3];
			return comment.delete()
				.then(() => {
					expect(testPageCopy.comments).toHaveLength(8);
					expect(comment.deleted).toBeTrue();

					for (let i = 0; i < testPageCopy.comments.length; i++) {
						expect(testPageCopy.comments[i]).not.toBeNil();
						expect(testPageCopy.comments[i]).not.toEqual(comment);
					}
					expect(testPageCopy.comments.byId(comment.id!)).toBeUndefined();
				});
		});
	});
});
