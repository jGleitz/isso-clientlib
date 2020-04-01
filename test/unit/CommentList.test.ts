import clone from 'clone';

import FakeIssoServer from '../util/FakeIssoServer';
import { successResponse } from '../util/SuperagentStub';
import * as SERVER_FIXTURES from '../fixtures/commentListing';

import { Comment, Page, SortCriterion, SortMode } from '../../lib';

const server = new FakeIssoServer();

const toId = (comment: Comment): number | undefined => comment.id;

/**
 * Creates a page that already requested the provided `fixture` from the server.
 *
 * @return a page that has `fixture` loaded.
 */
function pageWithCommentList(fixture: unknown = SERVER_FIXTURES.standard): Promise<Page> {
	server.responseToGet('/', successResponse(fixture));
	const page = new Page(server, 'test/uri');
	return page.comments.fetch().then(() => page);
}

describe('CommentList', () => {
	beforeEach(() => {
		// spy on Comment.fromServerData
		jest.spyOn(Comment, 'fromServerData').mockName('Comment.fromServerData');
	});

	afterEach(() => server.reset()); // reset fake server

	it('can query comments', () => {
		server.responseToGet('/', successResponse(SERVER_FIXTURES.standard));
		const page = new Page(server, 'test/uri');
		const newCommentEventSpy = jest
			.spyOn(page.comments.onNew, 'post')
			.mockName('newCommentEventSpy');
		return page.comments.fetch().then(comments => {
			expect(page.comments).toHaveLength(2);
			expect(Comment.fromServerData).toHaveBeenCalledTimes(3);
			expect(newCommentEventSpy).toHaveBeenCalledTimes(2);
			expect(comments).toBe(page.comments);

			expect(page.comments.count).toBe(2);
			expect(page.comments.deepCount).toBe(3);
		});
	});

	it('provides map and flatMap', () => {
		return pageWithCommentList(SERVER_FIXTURES.deeplyNested).then(page => {
			expect(page.comments.map(toId)).toEqual([1, 3, 7]);
			expect(page.comments.flatMap(toId)).toEqual([1, 2, 4, 6, 5, 3, 7]);
		});
	});

	it('can query comments by id', () => {
		return pageWithCommentList().then(page => {
			expect(page.comments.byId(1)).toBeInstanceOf(Comment);
			expect(page.comments.byId(2)).toBeUndefined();
			expect(page.comments.byId(1).replies.byId(2)).toBeInstanceOf(Comment);
			expect(page.comments.byId(3)).toBeInstanceOf(Comment);
			expect(page.comments.byId(5)).toBeUndefined();
			expect(page.comments.byId(0)).toBeUndefined();
		});
	});

	it('can update comments', () => {
		return pageWithCommentList().then(page => {
			const changedServerData = clone(SERVER_FIXTURES.standard);
			changedServerData.replies[0].author = 'TestAuthor';
			server.responseToGet('/', successResponse(changedServerData));

			const updateSpies = page.comments.flatMap(comment =>
				jest.spyOn(comment, 'updateFromServer').mockName('comment.updateFromServer')
			);
			return page.comments.fetch().then(() => {
				updateSpies.forEach(spy => expect(spy).toHaveBeenCalled());
				expect(updateSpies[0]).toHaveBeenCalledWith(changedServerData.replies[0]);
			});
		});
	});

	it('can process added comments', () => {
		return pageWithCommentList().then(page => {
			server.responseToGet('/', successResponse(SERVER_FIXTURES.deeplyNested));
			const onNew = jest.fn().mockName('page.comments.onNew');
			page.comments.onNew.attach(onNew);

			return page.comments.fetch().then(() => {
				expect(Comment.fromServerData).toHaveBeenCalledWith(
					SERVER_FIXTURES.deeplyNested.replies[0].replies[0].replies[0],
					expect.anything()
				);
				expect(Comment.fromServerData).toHaveBeenCalledWith(
					SERVER_FIXTURES.deeplyNested.replies[0].replies[0].replies[0],
					expect.anything()
				);
				expect(Comment.fromServerData).toHaveBeenCalledWith(
					SERVER_FIXTURES.deeplyNested.replies[0].replies[0].replies[1],
					expect.anything()
				);
				expect(Comment.fromServerData).toHaveBeenCalledWith(
					SERVER_FIXTURES.deeplyNested.replies[2],
					expect.anything()
				);

				expect(page.comments.byId(1).replies.byId(2)).toBeDefined();
				expect(page.comments.byId(1).replies.byId(2).id).toBe(2);

				expect(page.comments.count).toBe(3);
				expect(page.comments.deepCount).toBe(7);
				expect(page.comments[0].replies.deepCount).toBe(4);
			});
		});
	});

	it('can process deleted comments', () => {
		return pageWithCommentList().then(page => {
			const removedCommentData = clone(SERVER_FIXTURES.standard);
			removedCommentData.replies.pop();
			removedCommentData.total_replies--;
			server.responseToGet('/', successResponse(removedCommentData));

			const deleteSpy = jest
				.spyOn(page.comments.byId(3), 'wasDeleted')
				.mockName('comment.wasDeleted');
			return page.comments.fetch().then(() => {
				expect(deleteSpy).toHaveBeenCalled();
				expect(page.comments.byId(3)).toBeUndefined();
				expect(page.comments.byId(1).id).toBe(1);
				expect(page.comments.deepCount).toBe(2);
			});
		});
	});

	it('can update comment responses', () => {
		return pageWithCommentList().then(page => {
			const modifiedChildList = {
				total_replies: 1,
				id: 1,
				hidden_replies: 0,
				replies: [clone(SERVER_FIXTURES.standard.replies[0].replies[0])]
			};
			modifiedChildList.replies[0].text = 'Test Text';
			server.responseToGet('/', successResponse(modifiedChildList));
			const updateSpy = jest
				.spyOn(page.comments.byId(1).replies.byId(2), 'updateFromServer')
				.mockName('reply.updateFromServer');
			return page.comments
				.byId(1)
				.replies.fetch()
				.then(() => {
					expect(updateSpy).toHaveBeenCalledWith(modifiedChildList.replies[0]);
				});
		});
	});

	it('can update the count', () => {
		server.responseToGet(
			'/',
			successResponse({
				id: null,
				total_replies: 8,
				hidden_replies: 8,
				replies: []
			})
		);
		const page = new Page(server, 'test/uri');
		return page.comments.fetchCount().then(count => {
			expect(count).toBe(8);
			expect(page.comments.count).toBe(8);
		});
	});

	it('can update the deep count', () => {
		server.responseToPost('/count', successResponse([5]));
		const page = new Page(server, 'test/uri');
		return page.comments.fetchDeepCount().then(deepCount => {
			expect(deepCount).toBe(5);
			expect(page.comments.deepCount).toBe(5);
		});
	});

	it('does not remove comments when updating the counts', () => {
		server.responseToGet('/', successResponse(SERVER_FIXTURES.deeplyNested));

		const page = new Page(server, 'test/uri');
		const checkComments = (): void => {
			expect(page.comments).toHaveLength(3);
			expect(page.comments.count).toBe(3);
			expect(page.comments.deepCount).toBe(7);
			for (let i = 0; i < page.comments.length; i++) {
				expect(page.comments[i]).toBeDefined();
			}

			const replies = page.comments[0].replies;
			expect(replies).toHaveLength(1);
			expect(replies.count).toBe(1);
			expect(replies.deepCount).toBe(4);
			expect(replies[0]).toBeDefined();
			expect(replies[0].replies[0]).toBeDefined();
			expect(replies[0].replies[1]).toBeDefined();
		};

		return page.comments
			.fetch()
			.then(() => server.responseToGet('/', successResponse(SERVER_FIXTURES.deeplyNested)))
			.then(() => page.comments.fetchCount())
			.then(checkComments)
			.then(() => server.responseToPost('/count', successResponse([7])))
			.then(() => page.comments.fetchDeepCount())
			.then(checkComments)
			.then(() =>
				server.responseToGet('/', successResponse(SERVER_FIXTURES.deeplyNested.replies[0]))
			)
			.then(() => page.comments[0].replies.fetchCount())
			.then(checkComments)
			.then(() =>
				server.responseToGet('/', successResponse(SERVER_FIXTURES.deeplyNested.replies[0]))
			)
			.then(() => page.comments[0].replies.fetchDeepCount());
	});

	it('can update the deep count for replies', () => {
		return pageWithCommentList().then(page => {
			server.responseToGet('/', successResponse(SERVER_FIXTURES.deeplyNested.replies[0]));
			return page.comments[0].replies.fetchDeepCount().then(deepCount => {
				expect(deepCount).toBe(4);
				expect(page.comments[0].replies.deepCount).toBe(4);
			});
		});
	});

	it('bundles deep count updates', () => {
		server.responseToPost('/count', successResponse([7, 2, 4]));
		const firstPage = new Page(server, 'test/uri');
		const secondPage = new Page(server, 'the/uri');
		const thirdPage = new Page(server, 'yet/another/uri');
		return Promise.all([
			firstPage.comments.fetchDeepCount(),
			secondPage.comments.fetchDeepCount(),
			thirdPage.comments.fetchDeepCount()
		]).then(counts => {
			expect(counts).toEqual([7, 2, 4]);
			expect(firstPage.comments.deepCount).toBe(7);
			expect(secondPage.comments.deepCount).toBe(2);
			expect(thirdPage.comments.deepCount).toBe(4);
		});
	});

	it('can be sorted', () => {
		return pageWithCommentList(SERVER_FIXTURES.forSorting).then(page => {
			expect(page.comments.map(toId)).toEqual([1, 2, 3, 4, 5, 6]);
			page.comments.sortBy(SortCriterion.CREATION, SortMode.DESCENDING);
			expect(page.comments.map(toId)).toEqual([6, 5, 4, 3, 2, 1]);
			page.comments.sortBy(SortCriterion.LIKES);
			expect(page.comments.map(toId)).toEqual([3, 1, 2, 5, 6, 4]);
			page.comments.sortBy(SortCriterion.DISLIKES, SortMode.DESCENDING);
			expect(page.comments.map(toId)).toEqual([2, 3, 4, 6, 1, 5]);
			page.comments.sortBy(SortCriterion.LIKESUM, SortMode.DESCENDING);
			expect(page.comments.map(toId)).toEqual([4, 5, 1, 6, 3, 2]);
			page.comments.sortBy(SortCriterion.MODIFICATION);
			expect(page.comments.map(toId)).toEqual([2, 1, 5, 6, 3, 4]);
		});
	});

	it('can be sorted by multiple criteria', () => {
		return pageWithCommentList(SERVER_FIXTURES.forSorting).then(page => {
			page.comments.sortBys(
				{ criterion: SortCriterion.LIKES, mode: SortMode.DESCENDING },
				{ criterion: SortCriterion.MODIFICATION, mode: SortMode.ASCENDING }
			);
			expect(page.comments.map(toId)).toEqual([4, 6, 5, 2, 1, 3]);
		});
	});

	it('stays sorted after updates', () => {
		return pageWithCommentList(SERVER_FIXTURES.forSorting).then(page => {
			page.comments.sortBy(SortCriterion.LIKESUM);
			const otherLikes = clone(SERVER_FIXTURES.forSorting);
			otherLikes.replies[1].likes = 12;
			otherLikes.replies[0].dislikes = 7;
			server.responseToGet('/', successResponse(otherLikes));
			const withNewComment = clone(otherLikes);
			withNewComment.replies.push(SERVER_FIXTURES.deeplyNested.replies[2]);
			withNewComment.total_replies++;
			server.responseToGet('/', successResponse(withNewComment));

			expect(page.comments.map(toId)).toEqual([2, 3, 1, 6, 5, 4]);
			return page.comments
				.fetch()
				.then(() => {
					expect(page.comments.map(toId)).toEqual([1, 3, 6, 2, 5, 4]);
				})
				.then(() => page.comments.fetch())
				.then(() => {
					expect(page.comments.map(toId)).toEqual([1, 3, 6, 2, 5, 7, 4]);
				});
		});
	});

	it('throws when trying to inseart a comment without an id', () => {
		return pageWithCommentList(SERVER_FIXTURES.forSorting).then(page => {
			expect(() => page.comments.insert(new Comment(page))).toThrowError('does not have an ID yet');
		});
	});

	it('allows to insert new comments', () => {
		return pageWithCommentList(SERVER_FIXTURES.forSorting).then(page => {
			page.comments.sortBy(SortCriterion.LIKESUM);
			const newComment = Comment.fromServerData(
				{
					id: 9,
					parent: null,
					text: '<p>Yet another comment</p>\n',
					mode: 1,
					hash: '4509cuiaea98',
					author: 'Marina Müller',
					website: 'marina@müller.org',
					created: 158732126.572392,
					modified: null,
					likes: 3,
					dislikes: 1,
					total_replies: 0,
					hidden_replies: 0,
					replies: []
				},
				page
			);
			page.comments.insert(newComment);
			expect(page.comments.map(toId)).toEqual([2, 3, 1, 6, 9, 5, 4]);
		});
	});

	it('allows to remove comments', () => {
		return pageWithCommentList(SERVER_FIXTURES.forSorting).then(page => {
			page.comments.remove(page.comments[2]);
			expect(page.comments).toHaveLength(5);
			expect(page.comments[5]).toBeUndefined();
			for (let i = 0; i < page.comments.length; i++) {
				expect(page.comments[i]).toBeDefined();
			}
		});
	});
});
