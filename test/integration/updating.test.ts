import Page from '../../lib/Page';

import pageUris from '../fixtures/pageUris';

import { expect } from 'chai';

export default (pages: Array<Page>) => describe('editing comments', () => {

	describe('from the page it was created on', () => {
		it('from the page it was created on', () => {
			const comment = pages[2].comments[1];
			comment.rawText = 'I *changed*! Can you believe **that**?!';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.text).to.equal('<p>I <em>changed</em>! Can you believe <strong>that</strong>?!</p>');
				expect(comment.lastModifiedOn).to.be.afterTime(start);
				expect(comment.lastModifiedOn).to.be.beforeTime(new Date());
			});
		});

		it('author name', () => {
			const comment = pages[2].comments[2];
			comment.author.name = 'Changed Name';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.lastModifiedOn).to.be.afterTime(start);
				expect(comment.lastModifiedOn).to.be.beforeTime(new Date());
			});
		});

		it('author website', () => {
			const comment = pages[2].comments[3];
			comment.author.website = 'http://changed.website.org';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.lastModifiedOn).to.be.afterTime(start);
				expect(comment.lastModifiedOn).to.be.beforeTime(new Date());
			});
		});

		it('like', () => {
			const comment = pages[2].comments[1];
			return comment.sendLike().then(() => {
				// we cannot vote on our own comment
				expect(comment.likes).to.equal(0);
			});
		});

		it('dislike', () => {
			const comment = pages[2].comments[2];
			return comment.sendDislike().then(() => {
				// we cannot vote on our own comment
				expect(comment.dislikes).to.equal(0);
			});
		});
	});

	describe('from a new page', () => {
		let page: Page;

		before('fetch the page', () => {
			page = new Page(pages[2].server, pageUris[2]);
			return page.comments.fetch();
		});

		it('text', () => {
			const comment = page.comments[4];
			comment.rawText = 'I *changed*! Can you believe **that**?!';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.text).to.equal('<p>I <em>changed</em>! Can you believe <strong>that</strong>?!</p>');
				expect(comment.lastModifiedOn).to.be.afterTime(start);
				expect(comment.lastModifiedOn).to.be.beforeTime(new Date());
			});
		});

		it('author name', () => {
			const comment = page.comments[5];
			comment.author.name = 'Changed Name';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.lastModifiedOn).to.be.afterTime(start);
				expect(comment.lastModifiedOn).to.be.beforeTime(new Date());
			});
		});

		it('author website', () => {
			const comment = page.comments[6];
			comment.author.website = 'http://changed.website.org';
			const start = new Date();

			return comment.send().then(() => {
				expect(comment.lastModifiedOn).to.be.afterTime(start);
				expect(comment.lastModifiedOn).to.be.beforeTime(new Date());
			});
		});

		it('like', () => {
			const comment = page.comments[4];
			return comment.sendLike().then(() => {
				// we cannot vote on our own comment
				expect(comment.likes).to.equal(0);
			});
		});

		it('dislike', () => {
			const comment = page.comments[5];
			return comment.sendDislike().then(() => {
				// we cannot vote on our own comment
				expect(comment.dislikes).to.equal(0);
			});
		});
	});
});
