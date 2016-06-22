import {expect} from 'chai';
import Page from '../../lib/Page';
import Comment from '../../lib/Comment';
import * as Isso from '../util/isso-control';

const start = new Date();

/**
 * Fast check of feasibility for comments.
 */
function checkComment(comment: Comment): void {
	expect(comment.text).to.not.be.empty;
	expect(comment.author.ident).to.not.be.empty;
	expect(comment.createdOn).to.be.afterTime(start);
}


export default (pages: Array<Page>) => describe('creating comments', () => {

	it('simple comment', () => {
		const comment = new Comment(pages[0]);
		comment.rawText = 'A simple test comment';
		return comment.send().then(checkComment);
	});

	it('full data comment', () => {
		const comment = new Comment(pages[0]);
		comment.rawText = 'A more complex test comment';
		comment.author.name = 'Mr. Test';
		comment.author.email = 'test@mrtest.com';
		comment.author.website = 'https://example.org';
		return comment.send().then(checkComment);
	});

	it('response', ()  => {
		expect(pages[0].comments).to.have.length(2);
		const parent = pages[0].comments[0];
		const reply = new Comment(pages[0], parent);
		reply.rawText = 'This is a reply';
		reply.author.name = 'I only want to tell my name';
		return reply.send().then(checkComment);
	});

	describe('', () => {
		before('enable moderation', Isso.enableModeration);

		after('disable moderation', Isso.disableModeration);

		it('moderated comment', () => {
			const comment = new Comment(pages[0]);
			comment.rawText = 'Moderated Comment';
			comment.author.name = 'Mr. Moderated';
			comment.author.email = 'moderated@mrtest.com';
			comment.author.website = 'https://example.org';
			return comment.send()
				.then(checkComment)
				.then(() => {
					expect(comment.published).to.be.false;
					expect(pages[0].comments).to.have.length(2);
				});
		});
	});
});
