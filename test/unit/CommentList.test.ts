import {expect} from 'chai';
import * as clone from 'clone';

import FakeIssoServer from '../util/FakeIssoServer';
import {successResponse} from '../util/SuperagentStub';
import * as SERVER_FIXTURES from '../fixtures/commentListing';

import Page from '../../lib/Page';
import Comment from '../../lib/Comment';
import {SortCriterion, SortMode} from '../../lib/CommentList';

const server = new FakeIssoServer();

const toId = (comment: Comment) => comment.id;

/**
 * Creates a page that already requested {@link #COMMENT_LIST} from the
 * server.
 *
 * @return a page that has {@link COMMENT_LIST} loaded.
 */
function pageWithCommentList(fixture?: any): Promise<Page> {
	server.responseToGet('/', successResponse(fixture || SERVER_FIXTURES.standard));
	const page = new Page(server, 'test/uri');
	return page.comments.fetch()
		.then(() => page);
};

const createFromServerSpy = sinon.spy(Comment, 'fromServerData');

describe('CommentList', () => {
	afterEach('reset fake server', () => server.reset());

	afterEach('reset createFromServerSpy', () => createFromServerSpy.reset());

	it('can query comments', () => {
		server.responseToGet('/', successResponse(SERVER_FIXTURES.standard));
		const page = new Page(server, 'test/uri');
		const newCommentEventSpy = sinon.spy(page.comments.onNew, 'post');
		return page.comments.fetch()
			.then(comments => {
				expect(page.comments).to.have.length(2);
				expect(createFromServerSpy).to.have.been.calledThrice;
				expect(newCommentEventSpy).to.have.been.calledTwice;
				expect(comments).to.equal(page.comments);

				expect(page.comments.count).to.equal(2);
				expect(page.comments.deepCount).to.equal(3);
			});
	});


	it('provides map and flatMap', () => {
		return pageWithCommentList(SERVER_FIXTURES.deeplyNested)
			.then(page => {
				expect(page.comments.map(toId)).to.deep.equal([1, 3, 7]);
				expect(page.comments.flatMap(toId)).to.have.members([1, 2, 4, 6, 5, 3, 7]);
			});
	});

	it('can query comments by id', () => {
		return pageWithCommentList()
			.then(page => {
				expect(page.comments.byId(1)).to.be.an.instanceof(Comment);
				expect(page.comments.byId(2)).to.be.undefined;
				expect(page.comments.byId(1).children.byId(2)).to.be.an.instanceof(Comment);
				expect(page.comments.byId(3)).to.be.an.instanceof(Comment);
				expect(page.comments.byId(5)).to.be.undefined;
				expect(page.comments.byId(0)).to.be.undefined;
			});
	});

	it('can update comments', () => {
		return pageWithCommentList()
			.then(page => {
				const changedServerData = clone(SERVER_FIXTURES.standard);
				changedServerData.replies[0].author = 'TestAuthor';
				server.responseToGet('/', successResponse(changedServerData));

				const updateSpies = page.comments.flatMap(comment => sinon.spy(comment, 'updateFromServer'));
				return page.comments.fetch().then(comments => {
					updateSpies.forEach(spy => expect(spy).to.have.been.called);
					expect(updateSpies[0]).to.have.been.calledWith(changedServerData.replies[0]);
				});
			});
	});

	it('can process added comments', () => {
		return pageWithCommentList()
			.then(page => {
				server.responseToGet('/', successResponse(SERVER_FIXTURES.deeplyNested));

				return page.comments.fetch()
					.then(comments => {
						expect(createFromServerSpy).to.have.been.calledWith(
							SERVER_FIXTURES.deeplyNested.replies[0].replies[0].replies[0]);
						expect(createFromServerSpy).to.have.been.calledWith(
							SERVER_FIXTURES.deeplyNested.replies[0].replies[0].replies[0]);
						expect(createFromServerSpy).to.have.been.calledWith(
							SERVER_FIXTURES.deeplyNested.replies[0].replies[0].replies[1]);
						expect(createFromServerSpy).to.have.been.calledWith(SERVER_FIXTURES.deeplyNested.replies[2]);

						expect(page.comments.byId(1).children.byId(2)).to.exist;
						expect(page.comments.byId(1).children.byId(2).id).to.equal(2);

						expect(page.comments.count).to.equal(3);
						expect(page.comments.deepCount).to.equal(7);
						expect(page.comments[0].children.deepCount).to.equal(4);
					});
			});
	});

	it('can process deleted comments', () => {
		return pageWithCommentList().then(page => {
			const removedCommentData = clone(SERVER_FIXTURES.standard);
			removedCommentData.replies.pop();
			removedCommentData.total_replies--;
			server.responseToGet('/', successResponse(removedCommentData));

			const deleteSpy = sinon.spy(page.comments.byId(3), 'wasDeleted');
			return page.comments.fetch()
				.then(comments => {
					expect(deleteSpy).to.have.been.called;
					expect(page.comments.byId(3)).to.be.undefined;
					expect(page.comments.byId(1).id).to.equal(1);
					expect(page.comments.deepCount).to.equal(2);
				});
		});
	});

	it('can update comment responses', () => {
		return pageWithCommentList().then(page => {
			const modifiedChildList = {
				total_replies: 1,
				id: 1,
				hidden_replies: 0,
				replies: [
					clone(SERVER_FIXTURES.standard.replies[0].replies[0])
				]
			};
			modifiedChildList.replies[0].text = 'Test Text';
			server.responseToGet('/', successResponse(modifiedChildList));
			const updateSpy = sinon.spy(page.comments.byId(1).children.byId(2), 'updateFromServer');
			return page.comments.byId(1).children.fetch()
				.then(() => {
					expect(updateSpy).to.have.been.calledWith(modifiedChildList.replies[0]);
				});
		});
	});

	it('can update the count', () => {
		server.responseToGet('/', successResponse({
			id: null,
			total_replies: 8,
			hidden_replies: 8,
			replies: []
		}));
		const page = new Page(server, 'test/uri');
		return page.comments.fetchCount()
			.then(count => {
				expect(count).to.equal(8);
				expect(page.comments.count).to.equal(8);
			});
	});

	it('can update the deep count', () => {
		server.responseToPost('/count', successResponse([5]));
		const page = new Page(server, 'test/uri');
		return page.comments.fetchDeepCount()
			.then(deepCount => {
				expect(deepCount).to.equal(5);
				expect(page.comments.deepCount).to.equal(5);
			});
	});

	it('can update the deep count for replies', () => {
		return pageWithCommentList().then(page => {
			server.responseToGet('/', successResponse(SERVER_FIXTURES.deeplyNested.replies[0]));
			return page.comments[0].children.fetchDeepCount().then(deepCount => {
				expect(deepCount).to.equal(4);
				expect(page.comments[0].children.deepCount).to.equal(4);
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
		])
			.then(counts => {
				expect(counts).to.deep.equal([7, 2, 4]);
				expect(firstPage.comments.deepCount).to.equal(7);
				expect(secondPage.comments.deepCount).to.equal(2);
				expect(thirdPage.comments.deepCount).to.equal(4);
			});
	});

	it('can be sorted', () => {
		return pageWithCommentList(SERVER_FIXTURES.forSorting)
			.then(page => {
				expect(page.comments.map(toId)).to.deep.equal([1, 2, 3, 4, 5, 6]);
				page.comments.sortBy(SortCriterion.CREATION, SortMode.DESCENDING);
				expect(page.comments.map(toId)).to.deep.equal([6, 5, 4, 3, 2, 1]);
				page.comments.sortBy(SortCriterion.LIKES);
				expect(page.comments.map(toId)).to.deep.equal([3, 1, 2, 5, 6, 4]);
				page.comments.sortBy(SortCriterion.DISLIKES, SortMode.DESCENDING);
				expect(page.comments.map(toId)).to.deep.equal([2, 3, 4, 6, 1, 5]);
				page.comments.sortBy(SortCriterion.LIKESUM, SortMode.DESCENDING);
				expect(page.comments.map(toId)).to.deep.equal([4, 5, 1, 6, 3, 2]);
				page.comments.sortBy(SortCriterion.MODIFICATION);
				expect(page.comments.map(toId)).to.deep.equal([2, 1, 5, 6, 3, 4]);
			});
	});

	it('can be sorted by multiple criteria', () => {
		return pageWithCommentList(SERVER_FIXTURES.forSorting)
			.then(page => {
				page.comments.sortBys(
					{criterion: SortCriterion.LIKES, mode: SortMode.DESCENDING},
					{criterion: SortCriterion.MODIFICATION, mode: SortMode.ASCENDING});
				expect(page.comments.map(toId)).to.deep.equal([4, 6, 5, 2, 1, 3]);
			});
	});

	it('stays sorted after updates', () => {
		return pageWithCommentList(SERVER_FIXTURES.forSorting)
			.then(page => {
				page.comments.sortBy(SortCriterion.LIKESUM);
				const otherLikes = clone(SERVER_FIXTURES.forSorting);
				otherLikes.replies[1].likes = 12;
				otherLikes.replies[0].dislikes = 7;
				server.responseToGet('/', successResponse(otherLikes));
				const withNewComment = clone(otherLikes);
				withNewComment.replies.push(SERVER_FIXTURES.deeplyNested.replies[2]);
				withNewComment.total_replies++;
				server.responseToGet('/', successResponse(withNewComment));

				expect(page.comments.map(toId)).to.deep.equal([2, 3, 1, 6, 5, 4]);
				return page.comments.fetch().then(() => {
					expect(page.comments.map(toId)).to.deep.equal([1, 3, 6, 2, 5, 4]);
				})
				.then(() => page.comments.fetch())
				.then(() => {
					expect(page.comments.map(toId)).to.deep.equal([1, 3, 6, 2, 5, 7, 4]);
				});
			});
	});
});
