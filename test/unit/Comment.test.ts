import clone from 'clone';

import FakeIssoServer from '../util/FakeIssoServer';
import * as SERVER_FIXTURES from '../fixtures/commentListing';
import { expectData, successResponse } from '../util/SuperagentStub';

import { Comment, Page } from '../../lib';

const server = new FakeIssoServer();
const commentData = SERVER_FIXTURES.standard.replies[0];
let page: Page;

describe('Comment', () => {
	beforeEach(() => {
		// create a page
		page = new Page(server, 'test/uri');
	});

	afterEach(() => server.reset()); // reset fake server

	it('can be created from server data', () => {
		const comment = Comment.fromServerData(commentData, page);
		expect(comment.text).toBe('<p>Hello, World!</p>\n');
		expect(comment.id).toBe(1);
		expect(comment.createdOn).toEqual(new Date(Date.UTC(2013, 11, 17, 23, 1, 1, 572)));
		expect(comment.lastModifiedOn).toBeUndefined();
		expect(comment.likes).toBe(3);
		expect(comment.dislikes).toBe(1);
		expect(comment.repliesTo).toBeUndefined();
		expect(comment.page).toBe(page);
		expect(comment.replies.length).toBe(1);
		expect(comment.published).toBeTrue();
		expect(comment.deleted).toBeFalse();

		const reply = comment.replies[0];
		expect(reply.repliesTo).toBe(comment);
		expect(reply.lastModifiedOn).toEqual(new Date(Date.UTC(2013, 11, 17, 23, 2, 58, 613)));
	});

	it('can be submitted to the server when new', () => {
		const comment = new Comment(page);
		const commentInsertSpy = jest.spyOn(page.comments, 'insert').mockName('page.comments.insert');
		const replyInsertSpy = jest.spyOn(comment.replies, 'insert').mockName('comment.replies.insert');
		comment.rawText = 'Hey there!';

		expect(comment.author).toBeTruthy();
		expect(comment.published).toBeFalse();
		expect(comment.id).toBeUndefined();
		comment.author.email = 'me@mail.org';
		comment.author.name = 'Test';
		comment.author.website = 'test.org';
		server.responseToPost(
			'/new',
			expectData(
				{
					text: 'Hey there!',
					email: 'me@mail.org',
					parent: null,
					website: 'test.org',
					author: 'Test'
				},
				successResponse({
					id: 18,
					parent: null,
					text: '<p>Hey there!</p>\n',
					mode: 1,
					hash: '4505c1eeda98',
					author: 'Test',
					website: 'test.org',
					created: 1387321261.572392,
					modified: null,
					likes: 0,
					dislikes: 0,
					total_replies: 0,
					hidden_replies: 0,
					replies: []
				})
			)
		);

		return comment
			.send()
			.then(() => {
				expect(comment.published).toBeTrue();
				expect(comment.deleted).toBeFalse();
				expect(comment.createdOn).toEqual(new Date(Date.UTC(2013, 11, 17, 23, 1, 1, 572)));
				expect(comment.id).toBe(18);
				expect(commentInsertSpy).toHaveBeenCalledWith(comment);
				expect(comment.text).toBe('<p>Hey there!</p>\n');
				expect(comment.rawText).toBe('Hey there!');
			})
			.then(() => {
				const reply = new Comment(comment);
				reply.rawText = 'Hey again!';
				server.responseToPost(
					'/new',
					expectData(
						{
							text: 'Hey again!',
							email: undefined,
							parent: 18,
							website: undefined,
							author: undefined
						},
						successResponse({
							id: 10,
							parent: null,
							text: '<p>Hey again!</p>\n',
							mode: 1,
							hash: '4505c1eeda98',
							author: null,
							website: null,
							created: 1387321261.572392,
							modified: null,
							likes: 0,
							dislikes: 0,
							total_replies: 0,
							hidden_replies: 0,
							replies: []
						})
					)
				);

				return reply.send().then(() => {
					expect(reply.repliesTo).toBe(comment);
					expect(reply.page).toBe(page);
					expect(replyInsertSpy).toHaveBeenCalledWith(reply);
				});
			});
	});

	it('recognises when awaiting moderation', () => {
		const comment = new Comment(page);
		comment.rawText = 'Hey there!';

		const unpublishedResponse = {
			id: 18,
			parent: null,
			text: '<p>Hey there!</p>\n',
			mode: 2,
			hash: '4505c1eeda98',
			author: null,
			website: null,
			created: 1387321261.572392,
			lmodified: null,
			likes: 0,
			dislikes: 0,
			total_replies: 0,
			hidden_replies: 0,
			replies: []
		};

		server.responseToPost('/new', successResponse(unpublishedResponse));

		const publishedResponse = clone(unpublishedResponse);
		publishedResponse.mode = 1;

		server.responseToGet('/id/18', successResponse(publishedResponse));

		return comment
			.send()
			.then(() => {
				expect(comment.published).toBeFalse();
			})
			.then(() => comment.fetch())
			.then(() => {
				expect(comment.published).toBeTrue();
			});
	});

	it('rejects sending if the parent comment was not sent yet', () => {
		const parent = new Comment(page);
		const reply = new Comment(parent);
		return expect(reply.send()).rejects.toThrowError('parent comment was not sent');
	});

	it('can be updated on the server', () => {
		const comment = Comment.fromServerData(commentData, page);
		comment.author.name = 'Captain Hook';
		server.responseToPut(
			'/id/1',
			expectData(
				{
					text: '<p>Hello, World!</p>\n',
					email: undefined,
					parent: null,
					website: 'peterpan.org',
					author: 'Captain Hook'
				},
				successResponse({
					id: 10,
					parent: null,
					text: '<p>Hey again!</p>\n',
					mode: 1,
					hash: '4505c1eeda98',
					author: null,
					website: null,
					created: 1387321261.572392,
					modified: null,
					likes: 0,
					dislikes: 0,
					total_replies: 0,
					hidden_replies: 0,
					replies: []
				})
			)
		);
		return comment.send();
	});

	it('does not send when unchanged', () => {
		const comment = Comment.fromServerData(commentData, page);
		// eslint-disable-next-line no-self-assign
		comment.rawText = comment.rawText;
		return expect(comment.send()).resolves.toBeDefined();
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

		return comment.fetch().then(() => {
			expect(comment.text).toBe('<p>changed</p>\n');
			expect(comment.lastModifiedOn).toEqual(new Date(Date.UTC(2013, 11, 17, 23, 2, 58, 613)));
			expect(comment.author.name).toBe('Tester');
			expect(comment.likes).toBe(8);
			expect(comment.dislikes).toBe(2);
		});
	});

	it('recognises when being deleted but referenced', () => {
		const comment = Comment.fromServerData(commentData, page);
		const asDeleted = clone(commentData);
		asDeleted.mode = 4;
		server.responseToGet('/id/1', successResponse(asDeleted));

		return comment.fetch().then(() => {
			expect(comment.deleted).toBeTrue();
			expect(comment.published).toBeFalse();
		});
	});

	it('can send likes', () => {
		const comment = Comment.fromServerData(commentData, page);

		server.responseToPost(
			'/id/1/like',
			successResponse({
				likes: 8,
				dislikes: 6
			})
		);

		return comment.sendLike().then(() => {
			expect(comment.likes).toBe(8);
			expect(comment.dislikes).toBe(6);
		});
	});

	it('can send dislikes', () => {
		const comment = Comment.fromServerData(commentData, page);

		server.responseToPost(
			'/id/1/dislike',
			successResponse({
				likes: 8,
				dislikes: 6
			})
		);

		return comment.sendDislike().then(() => {
			expect(comment.likes).toBe(8);
			expect(comment.dislikes).toBe(6);
		});
	});

	it('can be deleted', () => {
		const comment = Comment.fromServerData(commentData, page);

		server.responseToDelete('/id/1', successResponse(null));

		return comment.delete().then(() => {
			expect(comment.published).toBeFalse();
			expect(comment.deleted).toBeTrue();
		});
	});

	it('does not delete when already being deleted', () => {
		const comment = Comment.fromServerData(commentData, page);

		server.responseToDelete('/id/1', successResponse(null));

		return comment
			.delete()
			.then(() => comment.delete())
			.then(() => {
				expect(comment.published).toBeFalse();
				expect(comment.deleted).toBeTrue();
			});
	});

	it('notifies its parent list when being deleted', () => {
		const comment = Comment.fromServerData(commentData, page);
		const reply = Comment.fromServerData(SERVER_FIXTURES.standard.replies[0].replies[0], comment);
		const pageSpy = jest.spyOn(page.comments, 'remove').mockName('page.comments.remove');
		const commentSpy = jest.spyOn(comment.replies, 'remove').mockName('comment.replies.remove');

		server.responseToDelete('/id/1', successResponse(null));
		server.responseToDelete('/id/2', successResponse(null));

		return comment
			.delete()
			.then(() => {
				expect(pageSpy).toHaveBeenCalledWith(comment);
			})
			.then(() => reply.delete())
			.then(() => {
				expect(commentSpy).toHaveBeenCalledWith(reply);
			});
	});
});
