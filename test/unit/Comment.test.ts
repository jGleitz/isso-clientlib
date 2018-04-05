import { expect } from 'chai';
import * as clone from 'clone';
import * as sinon from 'sinon';

import FakeIssoServer from '../util/FakeIssoServer';
import * as SERVER_FIXTURES from '../fixtures/commentListing';
import { expectData, successResponse } from '../util/SuperagentStub';

import Comment from '../../lib/Comment';
import Page from '../../lib/Page';

const server = new FakeIssoServer();
const commentData = SERVER_FIXTURES.standard.replies[0];
let page: Page;

describe('Comment', () => {
	beforeEach('create a page', () => {
		page = new Page(server, 'test/uri');
	});

	afterEach('reset fake server', () => server.reset());

	it('can be created from server data', () => {
		const comment = Comment.fromServerData(commentData, page);
		expect(comment.text).to.equal('<p>Hello, World!</p>\n');
		expect(comment.id).to.equal(1);
		expect(comment.createdOn).to.equalTime(new Date(Date.UTC(2013, 11, 17, 23, 1, 1, 572)));
		expect(comment.lastModifiedOn).to.be.null;
		expect(comment.likes).to.equal(3);
		expect(comment.dislikes).to.equal(1);
		expect(comment.repliesTo).to.be.null;
		expect(comment.page).to.equal(page);
		expect(comment.replies.length).to.equal(1);
		expect(comment.published).to.be.true;
		expect(comment.deleted).to.be.false;

		const reply = comment.replies[0];
		expect(reply.repliesTo).to.equal(comment);
		expect(reply.lastModifiedOn).to.equalTime(new Date(Date.UTC(2013, 11, 17, 23, 2, 58, 613)));
	});

	it('can be submitted to the server when new', () => {
		const comment = new Comment(page);
		const commentInsertSpy = sinon.spy(page.comments, 'insert');
		const replyInsertSpy = sinon.spy(comment.replies, 'insert');
		comment.rawText = 'Hey there!';

		expect(comment.author).to.exist;
		expect(comment.published).to.be.false;
		expect(comment.id).to.be.null;
		comment.author.email = 'me@mail.org';
		comment.author.name = 'Test';
		comment.author.website = 'test.org';
		server.responseToPost('/new', expectData({
			text: 'Hey there!',
			email: 'me@mail.org',
			parent: null,
			website: 'test.org',
			author: 'Test'
		}, successResponse({
			id: 18,
			parent: <number> null,
			text: '<p>Hey there!</p>\n',
			mode: 1,
			hash: '4505c1eeda98',
			author: 'Test',
			website: 'test.org',
			created: 1387321261.572392,
			modified: <number> null,
			likes: 0,
			dislikes: 0,
			total_replies: 0,
			hidden_replies: 0,
			replies: []
		})));

		return comment.send()
			.then(() => {
				expect(comment.published).to.be.true;
				expect(comment.deleted).to.be.false;
				expect(comment.createdOn).to.equalTime(new Date(Date.UTC(2013, 11, 17, 23, 1, 1, 572)));
				expect(comment.id).to.equal(18);
				expect(commentInsertSpy).to.have.been.calledWith(comment);
			})
			.then(() => {
				const reply = new Comment(comment);
				reply.rawText = 'Hey again!';
				server.responseToPost('/new', expectData({
					text: 'Hey again!',
					email: undefined,
					parent: 18,
					website: undefined,
					author: undefined
				}, successResponse({
					id: 10,
					parent: <number> null,
					text: '<p>Hey again!</p>\n',
					mode: 1,
					hash: '4505c1eeda98',
					author: null,
					website: null,
					created: 1387321261.572392,
					modified: <number> null,
					likes: 0,
					dislikes: 0,
					total_replies: 0,
					hidden_replies: 0,
					replies: []
				})));

				return reply.send().
					then(() => {
						expect(reply.repliesTo).to.equal(comment);
						expect(reply.page).to.equal(page);
						expect(replyInsertSpy).to.have.been.calledWith(reply);
					});
			});
	});

	it('recognises when awaiting moderation', () => {
		const comment = new Comment(page);
		comment.rawText = 'Hey there!';

		const unpublishedResponse = {
			id: 18,
			parent: <number> null,
			text: '<p>Hey there!</p>\n',
			mode: 2,
			hash: '4505c1eeda98',
			author: <string> null,
			website: <string> null,
			created: 1387321261.572392,
			lmodified: <number> null,
			likes: 0,
			dislikes: 0,
			total_replies: 0,
			hidden_replies: 0,
			replies: <Array<any>> []
		};

		server.responseToPost('/new', successResponse(unpublishedResponse));

		const publishedResponse = clone(unpublishedResponse);
		publishedResponse.mode = 1;

		server.responseToGet('/id/18', successResponse(publishedResponse));

		return comment.send()
			.then(() => {
				expect(comment.published).to.be.false;
			})
			.then(() => comment.fetch())
			.then(() => {
				expect(comment.published).to.be.true;
			});
	});

	it('rejects sending if the parent comment was not sent yet', () => {
		const parent = new Comment(page);
		const reply = new Comment(parent);
		server.responseToPost('/new', successResponse());
		return expect(reply.send()).to.be.rejectedWith('parent comment was not sent');
	});

	it('can be updated on the server', () => {
		const comment = Comment.fromServerData(commentData, page);
		comment.rawText = 'Hey test!';
		server.responseToPut('/id/1', expectData({
			text: 'Hey test!',
			email: undefined,
			parent: null,
			website: 'peterpan.org',
			author: 'Peter Pan'
		}, successResponse({
			id: 10,
			parent: <number> null,
			text: '<p>Hey again!</p>\n',
			mode: 1,
			hash: '4505c1eeda98',
			author: null,
			website: null,
			created: 1387321261.572392,
			modified: <number> null,
			likes: 0,
			dislikes: 0,
			total_replies: 0,
			hidden_replies: 0,
			replies: []
		})));
		return comment.send();
	});

	it('does not send when unchanged', () => {
		const comment = Comment.fromServerData(commentData, page);
		comment.rawText = comment.rawText;
		return expect(comment.send()).to.be.fulfilled;
	});

	it('can be updated from the server', () => {
		const comment = Comment.fromServerData(commentData, page);
		const changed = clone(commentData);
		changed.text = '<p>changed</p>\n';
		changed.modified = 1387321378.613392;
		changed.author = 'Tester';
		changed.likes = 8;
		changed.dislikes = 2;
		server.responseToGet('/id/1', successResponse(changed));

		return comment.fetch()
			.then(() => {
				expect(comment.text).to.equal('<p>changed</p>\n');
				expect(comment.lastModifiedOn).to.equalTime(new Date(Date.UTC(2013, 11, 17, 23, 2, 58, 613)));
				expect(comment.author.name).to.equal('Tester');
				expect(comment.likes).to.equal(8);
				expect(comment.dislikes).to.equal(2);
			});
	});

	it('recognises when being deleted but referenced', () => {
		const comment = Comment.fromServerData(commentData, page);
		const asDeleted = clone(commentData);
		asDeleted.mode = 4;
		server.responseToGet('/id/1', successResponse(asDeleted));

		return comment.fetch()
			.then(() => {
				expect(comment.deleted).to.be.true;
				expect(comment.published).to.be.false;
			});
	});

	it('can send likes', () => {
		const comment = Comment.fromServerData(commentData, page);

		server.responseToPost('/id/1/like', successResponse({
			likes: 8,
			dislikes: 6
		}));

		return comment.sendLike()
			.then(() => {
				expect(comment.likes).to.equal(8);
				expect(comment.dislikes).to.equal(6);
			});
	});

	it('can send dislikes', () => {
		const comment = Comment.fromServerData(commentData, page);

		server.responseToPost('/id/1/dislike', successResponse({
			likes: 8,
			dislikes: 6
		}));

		return comment.sendDislike()
			.then(() => {
				expect(comment.likes).to.equal(8);
				expect(comment.dislikes).to.equal(6);
			});
	});

	it('can be deleted', () => {
		const comment = Comment.fromServerData(commentData, page);

		server.responseToDelete('/id/1', successResponse(null));

		return comment.delete()
			.then(() => {
				expect(comment.published).to.be.false;
				expect(comment.deleted).to.be.true;
			});
	});

	it('does not delete when already being deleted', () => {
		const comment = Comment.fromServerData(commentData, page);

		server.responseToDelete('/id/1', successResponse(null));

		return comment.delete()
			.then(() => comment.delete())
			.then(() => {
				expect(comment.published).to.be.false;
				expect(comment.deleted).to.be.true;
			});
	});

	it('notifies its parent list when being deleted', () => {
		const comment = Comment.fromServerData(commentData, page);
		const reply = Comment.fromServerData(SERVER_FIXTURES.standard.replies[0].replies[0], comment);
		const pageSpy = sinon.spy(page.comments, 'remove');
		const commentSpy = sinon.spy(comment.replies, 'remove');

		server.responseToDelete('/id/1', successResponse(null));
		server.responseToDelete('/id/2', successResponse(null));

		return comment.delete()
			.then(() => {
				expect(pageSpy).to.have.been.calledWith(comment);
			})
			.then(() => reply.delete())
			.then(() => {
				expect(commentSpy).to.have.been.calledWith(reply);
			});
	});
});
