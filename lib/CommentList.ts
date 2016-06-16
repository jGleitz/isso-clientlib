import Page from './Page';
import Comment from './Comment';
import {AsyncEvent} from 'ts-events';
import {Response} from 'superagent';

export const enum SortMode {
	ASCENDING,
	DESCENDING
}

export const enum SortCriterion {
	/**
	 * Sort based on the comment’s creation timestamp.
	 */
	CREATION,
	/**
	 * Sort based on the comment’s last modification timestamp or the comment’s creation timestamp if the comment was
	 * not yet modified.
	 */
	MODIFICATION,
	/**
	 * Sort based on the comment’s number of likes.
	 */
	LIKES,
	/**
	 * Sort based on the comment’s number of dislikes.
	 */
	DISLIKES,
	/**
	 * Sort based on the comment’s number of likes minus the comment’s number of dislikes.
	 */
	LIKESUM
};

const COMMENT_MEMBER_ACCESS_FUNCTIONS = (() => {
	const memberAccessFunctions: {[criterion: number]: (comment: Comment) => number} = {};
	memberAccessFunctions[SortCriterion.CREATION] = comment => comment.createdOn.getTime();
	memberAccessFunctions[SortCriterion.MODIFICATION] =
		comment => (comment.lastModifiedOn || comment.createdOn).getTime();
	memberAccessFunctions[SortCriterion.LIKES] = comment => comment.likes;
	memberAccessFunctions[SortCriterion.DISLIKES] = comment => comment.dislikes;
	memberAccessFunctions[SortCriterion.LIKESUM] = comment => comment.likes - comment.dislikes;
	return memberAccessFunctions;
})();

export default class CommentList implements ArrayLike<Comment> {

	[index: number]: Comment;

	private commentsById: {[id: number]: Comment} = {};

	private page: Page;

	private parent: Comment;

	public _count = 0;

	private sortFunction: (a: Comment, b: Comment) => number = null;

	/**
	 * The number of comments in this list.
	 */
	public get count(): number {
		return this._count;
	}

	private updateCount(newCount: number): void {
		if (newCount !== this._count) {
			this.onCountChange.post(this._count = newCount);
		}
	}

	private _deepCount = 0;

	/**
	 * The number of comments in this list, recursevly including replies.
	 */
	public get deepCount(): number {
		return this._deepCount;
	}

	private updateDeepCount(newCount: number): void {
		if (newCount !== this._deepCount) {
			this.onDeepCountChange.post(this._deepCount = newCount);
		}
	}

	private _length = 0;

	/**
	 * The number of comments in this list.
	 */
	public get length(): number {
		return this._length;
	}

	private updateLength(newLength: number): void {
		if (newLength !== this.length) {
			this.onLengthChange.post(this._length = newLength);
		}
	}

	private static collectiveCountQueue: Array<Page> = [];
	private static collectiveCountPromise: Promise<Array<number>>;

	/**
	 * Fired when a new comment arrives in this index.
	 */
	 // TODO: Use `readonly` when TS 2.0 is available
	public onNew = new AsyncEvent<Comment>();

	/**
	 * Fired when the number of comments on this page changed.
	 */
	 // TODO: Use `readonly` when TS 2.0 is available
	public onCountChange = new AsyncEvent<number>();

	public onDeepCountChange = new AsyncEvent<number>();

	public onLengthChange = new AsyncEvent<number>();

	public constructor(parent: Page | Comment) {
		if (parent instanceof Page) {
			this.page = parent;
			this.parent = null;
		} else {
			this.page = parent.page;
			this.parent = parent;
		}
	}

	public fetchCount(): Promise<number> {
		return this._fetch({limit: 0}).then(() => this.count);
	}

	private static fetchCollectiveCounts(): Promise<any> {
		const firstPage = CommentList.collectiveCountQueue[0];
		const pages = CommentList.collectiveCountQueue;
		CommentList.collectiveCountQueue = [];
		const requestData = pages.map(page => page.uri);
		let unlock: () => void;
		const lock = new Promise(resolve => unlock = resolve);
		// for each but the first page: wait for it to become ready and lock it
		const readyLock = Promise.all(
			pages.slice(1).map(
				page => new Promise(
					resolve => page.onNoRequest(
						() => {
							resolve();
							return lock;
						}))));
		// send the query using the first page
		return firstPage.send(
				firstPage.server.post('/count').send(requestData),
				// when the request is ready: wait for the other pages
				response => readyLock.then(() => {
					const countArray = <Array<number>> response.body;
					// assign the new values
					for (let i = 0; i < pages.length; i++) {
						pages[i].comments.updateDeepCount(countArray[i]);
					}
				})
			// finally: free all pages
			.then(unlock));
	}

	/**
	 * Queries the comment with the provided `id`.
	 *
	 * @param id	Id of a comment in this list.
	 * @return The comment with the provided `id`, or `undefined` if there is no such comment in this list.
	 */
	public byId(id: number): Comment {
		return this.commentsById[id];
	}

	public fetchDeepCount(): Promise<number> {
		// If this is a nested list, there is no collective way to fetch the count.
		if (this.parent !== null) {
			// The server offers no other method to fetch the deep count than to fetch all comments.
			return this._fetch().then(() => this.deepCount);
		}

		// This is a top level list. We will collect further calls and send a collective request in the next free event
		// loop iteration.
		const pageIndex = CommentList.collectiveCountQueue.push(this.page) - 1;
		if (pageIndex === 0) {
			CommentList.collectiveCountPromise = new Promise(resolve => {
				// There are significantly faster ways to schedule for the next event loop than window.setTimeout.
				// However, this is sufficient for our use case.
				window.setTimeout(() => resolve(CommentList.fetchCollectiveCounts()), 0);
			});
		}
		return CommentList.collectiveCountPromise.then(() => this.deepCount);
	}

	public fetch(): Promise<CommentList> {
		return this._fetch();
	}

	private _fetch(data: any = {}): Promise<CommentList> {
		return this.page.send(
			this.page.server.get('/')
				.query({uri: this.page.uri})
				.query(this.requestData(data)),
			this.processCommentList, this);
	}

	/**
	 * Updates this list with data retrieved by the server.
	 *
	 * @hidden
	 * @param serverData	A comment-like object recieved from the server.
	 */
	public updateFromServer(serverData: any): void {
		const newList = serverData.replies;
		const newCommentById: {[id: number]: Comment} = {};
		let i = 0;
		let childrenDeepCount = 0;
		for (; i < newList.length; i++) {
			const data = newList[i];
			let comment = this.commentsById[data.id];
			if (comment === undefined) {
				comment = Comment.fromServerData(data, this.page, this.parent);
				this.onNew.post(comment);
			} else {
				comment.updateFromServer(data);
			}
			newCommentById[data.id] = comment;
			this[i] = comment;
			childrenDeepCount += comment.replies.deepCount;
		}
		for (; i < this.length; i++) {
			this[i] = undefined;
		}
		for (const id in this.commentsById) {
			if (newCommentById[id] === undefined) {
				this.commentsById[id].wasDeleted();
			}
		}
		this.commentsById = newCommentById;
		this.updateCount(serverData.total_replies);
		this.updateLength(newList.length);
		this.updateDeepCount(childrenDeepCount + this.count);
		this.sort();
	}

	/**
	 * Transforms `this` comment list into an array using the provided `transformer`.
	 *
	 * @param transformer	A function mapping each comment in this list to the desired value.
	 * @return The array containing the result of transforming each comment in this list. The returned array will have
	 *		the transformed values in the same order as the source comment were in this list.
	 */
	public map<ResultType>(transformer: (comment: Comment) => ResultType): Array<ResultType> {
		return this.doMap(transformer, false);
	}

	/**
	 * Transforms `this` comment list and the children into an array using the provided `transformer`.
	 *
	 * @param transformer
	 *		A function mapping each comment to the desired value.
	 * @return The array containing the result of transforming each comment in this list. The returned array will have
	 *		the transformed values in the same order as the source comment were in this list. Child comments come
	 *		directly after their parent.
	 */
	public flatMap<ResultType>(transformer: (comment: Comment) => ResultType): Array<ResultType> {
		return this.doMap(transformer, true);
	}

	/**
	 * Actual logic for [map](#map) and [#flatMap](#flatmap).
	 *
	 * @param transformer	A function mapping each comment to the desired value.
	 * @param includeChildren	`true` iff comment’s children should be included in the result.
	 * @return The result of transforming all comments using `tranformer`.
	 */
	private doMap<ResultType>(transformer: (comment: Comment) => ResultType, includeChildren: boolean)
		: Array<ResultType> {
			const result: Array<ResultType> = [];
			for (let i = 0; i < this.length; i++) {
				result.push(transformer(this[i]));
				if (includeChildren) {
					this[i].replies.flatMap(transformer)
						.forEach(transformed => result.push(transformed));
				}
			}
			return result;
		}

	/**
	 * Processes a comment list request response.
	 *
	 * @param {response}	The server’s response.
	 * @return `this`
	 */
	private processCommentList(response: Response): CommentList {
		this.updateFromServer(response.body);
		return this;
	}

	/**
	 * Constructs a request data object for fetch requests by extending the provided `data`.
	 *
	 * @param data	Data for the fetch request.
	 * @return A data object suitable for a fetch request. Contains the data set in the provided `data` object.
	 */
	private requestData(data: any): any {
		if (this.parent !== null) {
			data.parent = this.parent.id;
		}
		return data;
	}

	private sort(): void {
		if (this.sortFunction !== null) {
			const newOrder = this.map(comment => comment);
			newOrder.sort(this.sortFunction);
			for (let i = 0; i < newOrder.length; i++) {
				this[i] = newOrder[i];
			}
		}
	}

	/**
	 * Sort this list using the provided `criterion` in the provided `mode`. The list will be kept sorted during any
	 * updates until the next call to this method or [#sortBys](#sortbys). If the provided `criterion` decides for two
	 * comments to be equal, their creation date will be used in ascending order to sort them.
	 *
	 * @param criterion	The criterion to sort this list by.
	 * @param mode	The sort direction to use.
	 */
	public sortBy(criterion: SortCriterion, mode: SortMode = SortMode.ASCENDING): void {
		this.sortBys({criterion: criterion, mode: mode});
	};

	/**
	 * Sort this list using multiple criteria, potentially in different modes. The list will be kept sorted during
	 * any updates until the next call to this method or (#sortBy)[#sortby]. For a pair of comments, the first provided
	 * sort method will be used to decide their order. Only if that method decides the comments to be equal, the next
	 * method will be used. If all of the provided criteria decide the comments to be equal, their creation date will
	 * be used in ascending order to sort them.
	 *
	 * @param sortMethods	The sort methods to use, in order of their presedence.
	 */
	public sortBys(...sortMethods: Array<{criterion: SortCriterion, mode: SortMode}>): void {
		sortMethods.push({criterion: SortCriterion.CREATION, mode: SortMode.ASCENDING});
		const signs = sortMethods.map(method => method.mode === SortMode.DESCENDING ? -1 : 1);
		const acessors = sortMethods.map(method => COMMENT_MEMBER_ACCESS_FUNCTIONS[method.criterion]);
		this.sortFunction = (a, b) => {
			let result = 0;
			for (let i = 0; result === 0 && i < signs.length; i++) {
				result = signs[i] * (acessors[i](a) - acessors[i](b));
			}
			return result;
		};
		this.sort();
	}
}
