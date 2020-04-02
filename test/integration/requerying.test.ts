import { Page } from '../../lib';
import * as Isso from '../util/isso-control';
import pageUris from '../fixtures/pageUris';
import * as Testdata from './testdata';

let testPage: Page; // created from pageUris[1]

describe('updating comments from the server', () => {
	beforeAll(() =>
		Isso.create()
			.then(Testdata.createPopulatedTestPages([pageUris[1]]))
			.then(pages => (testPage = pages[0]))
	);
	afterAll(Isso.finished);

	test('recognising a deleted comment', () => {
		expect(testPage.comments).toHaveLength(10);
		const comment = testPage.comments[3];

		return comment
			.delete()
			.then(() => testPage.comments.fetch())
			.then(() => {
				expect(testPage.comments).toHaveLength(9);
				expect(comment.deleted).toBeTrue();
			});
	});
});
