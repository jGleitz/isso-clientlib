import Page from '../../lib/Page';
import Comment from '../../lib/Comment';
import * as Isso from '../util/isso-control';
import { createTestPagesInto as createEmptyTestPagesInto } from './testdata';

const start = new Date();

const pages: Page[] = [];

/**
 * Fast check of feasibility for comments.
 */
function checkComment(comment: Comment): void {
	expect(comment.text).not.toBeNil();
	expect(comment.author.ident).toBeTruthy();
	expect(comment.createdOn).toBeAfter(start);
}

describe('creating comments', () => {
	beforeAll(() => Isso.create().then(createEmptyTestPagesInto(pages)));
	afterAll(Isso.finished);

	test('simple comment', () => {
		const comment = new Comment(pages[0]);
		comment.rawText = 'A simple test comment';
		return comment.send().then(checkComment);
	});

	test('full data comment', () => {
		const comment = new Comment(pages[0]);
		comment.rawText = 'A more complex test comment';
		comment.author.name = 'Mr. Test';
		comment.author.email = 'test@mrtest.com';
		comment.author.website = 'https://example.org';
		return comment.send().then(checkComment);
	});

	test('response', () => {
		expect(pages[0].comments).toHaveLength(2);
		const parent = pages[0].comments[0];
		const reply = new Comment(parent);
		reply.rawText = 'This is a reply';
		reply.author.name = 'I only want to tell my name';
		return reply.send().then(checkComment);
	});

	test('more comments', () => {
		let c = -1;
		const comments: Comment[] = [];

		comments[++c] = new Comment(pages[0]);
		comments[c].rawText = 'Yet a nother comment';
		comments[c].author.email = 'author@example.org';

		comments[++c] = new Comment(pages[0]);
		comments[c].rawText = 'Controversal comment';

		comments[++c] = new Comment(comments[c - 1]);
		comments[c].rawText = 'How can you say that?';

		comments[++c] = new Comment(comments[c - 2]);
		comments[c].rawText = 'I’m really offended!';
		comments[c].author.name = 'Angry Man';
		comments[c].author.email = 'angry.man@example.org';

		[pages[1], pages[2]].forEach(page => {
			[
				'first',
				'second',
				'third',
				'fourth',
				'fifth',
				'sixth',
				'seventh',
				'eigth',
				'ninth',
				'tenth'
			].forEach(text => {
				comments[++c] = new Comment(page);
				comments[c].rawText = `*${text}* comment on this page! That’s so **cool**!`;
			});
		});

		return Promise.all(comments.map(comment => comment.send()));
	});

	describe('', () => {
		beforeAll(Isso.enableModeration);
		afterAll(Isso.disableModeration);

		test('moderated comment', () => {
			const comment = new Comment(pages[0]);
			comment.rawText = 'Moderated Comment';
			comment.author.name = 'Mr. Moderated';
			comment.author.email = 'moderated@mrtest.com';
			comment.author.website = 'https://example.org';
			return comment
				.send()
				.then(checkComment)
				.then(() => {
					expect(comment.published).toBeFalse();
					expect(pages[0].comments).toHaveLength(4);
				});
		});
	});
});
