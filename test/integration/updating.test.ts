import 'jest-extended';
import Page from '../../lib/Page';

import pageUris from '../fixtures/pageUris';
import * as Isso from '../util/isso-control';
import * as Testdata from './testdata';

let testPage: Page; // created from pageUris[2];

describe('updating comments', () => {
	beforeAll(() =>
		Isso.create()
			.then(Testdata.createPopulatedTestPages([pageUris[2]]))
			.then(pages => (testPage = pages[0]))
	);
	afterAll(Isso.finished);

	describe('from the page it was created on', () => {
		test('from the page it was created on', () => {
			const comment = testPage.comments[1];
			comment.rawText = 'I *changed*! Can you believe **that**?!';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.text).toBe(
					'<p>I <em>changed</em>! Can you believe <strong>that</strong>?!</p>'
				);
				expect(comment.lastModifiedOn).toBeAfter(start);
				expect(comment.lastModifiedOn).toBeBefore(new Date());
			});
		});

		test('author name', () => {
			const comment = testPage.comments[2];
			comment.author.name = 'Changed Name';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.lastModifiedOn).toBeAfter(start);
				expect(comment.lastModifiedOn).toBeBefore(new Date());
			});
		});

		test('author website', () => {
			const comment = testPage.comments[3];
			comment.author.website = 'http://changed.website.org';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.lastModifiedOn).toBeAfter(start);
				expect(comment.lastModifiedOn).toBeBefore(new Date());
			});
		});

		test('like', () => {
			const comment = testPage.comments[1];
			return comment.sendLike().then(() => {
				// we cannot vote on our own comment
				expect(comment.likes).toBe(0);
			});
		});

		test('dislike', () => {
			const comment = testPage.comments[2];
			return comment.sendDislike().then(() => {
				// we cannot vote on our own comment
				expect(comment.dislikes).toBe(0);
			});
		});
	});

	describe('from a new page', () => {
		let testPageCopy: Page;

		beforeAll(() => {
			// fetch test page
			testPageCopy = new Page(testPage.server, pageUris[2]);
			return testPageCopy.comments.fetch();
		});

		test('text', () => {
			const comment = testPageCopy.comments[4];
			comment.rawText = 'I *changed*! Can you believe **that**?!';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.text).toBe(
					'<p>I <em>changed</em>! Can you believe <strong>that</strong>?!</p>'
				);
				expect(comment.lastModifiedOn).toBeAfter(start);
				expect(comment.lastModifiedOn).toBeBefore(new Date());
			});
		});

		test('author name', () => {
			const comment = testPageCopy.comments[5];
			comment.author.name = 'Changed Name';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.lastModifiedOn).toBeAfter(start);
				expect(comment.lastModifiedOn).toBeBefore(new Date());
			});
		});

		test('author website', () => {
			const comment = testPageCopy.comments[6];
			comment.author.website = 'http://changed.website.org';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.lastModifiedOn).toBeAfter(start);
				expect(comment.lastModifiedOn).toBeBefore(new Date());
			});
		});

		test('like', () => {
			const comment = testPageCopy.comments[4];
			return comment.sendLike().then(() => {
				// we cannot vote on our own comment
				expect(comment.likes).toBe(0);
			});
		});

		test('dislike', () => {
			const comment = testPageCopy.comments[5];
			return comment.sendDislike().then(() => {
				// we cannot vote on our own comment
				expect(comment.dislikes).toBe(0);
			});
		});
	});
});
