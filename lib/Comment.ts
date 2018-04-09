import Page from './Page';
import Author from './Author';
import { Response } from 'superagent';
import { AsyncEvent, VoidAsyncEvent } from 'ts-events';
import CommentList from './CommentList';

/**
 * The integer used by isso to encode the “awaits moderation” state of a
 * comment.
 *
 * @hidden
 */
const AWAITS_MODERATION_STATE = 2;

/**
 * The integer used by isso to encode the “deleted but referenced” state of a
 * comment.
 *
 * @hidden
 */
const DELETED_STATE = 4;

/**
 * The integer used by isso to encode the “fully published” state of a
 * comment.
 *
 * @hidden
 */
const PUBLISHED_STATE = 1;

/**
 * The number to multiply timestamps received from the isso server with in order to correctly convert them to JS `Date`.
 *
 * @hidden
 */
const TIMESTAMP_MULTIPLIER = 1000;

/**
 * A comment that’s on a {@link Page}. Holds the comment’s data and can be
 * used to query and be updated of changes.
 */
export default class Comment {

	/**
	 * Whether this comment has data changes that are not yet reflected on
	 * the server.
	 */
	private dirty = true;

	/**
	 * Whether this comment’s existence is known to the server. `false` iff this comment was newly created
	 * and {@link #send} has never been called yet. This usually means that the
	 * user has not yet chosen to publish the comment. If the user has
	 * already sent the comment but it still awaits moderation, this is `true`.
	 */
	private existsOnServer = false;

	/**
	 * Whether this comment still awaits moderation and is thus not visible
	 * to others.
	 */
	private awaitsModeration = false;

	/**
	 * This comment’s id (assigned by the server). Will be `null`
	 * as long as no id was assigned by the server yet.
	 */
	public id: number = null;

	private _deleted = false;

	/**
	 * Whether this comment once existed on the server but is now deleted. Deleted comments may still have (not deleted)
	 * replies.
	 */
	public get deleted(): boolean {
		return this._deleted;
	}

	private _text: string = null;

	/**
	 * The comment’s `text`. If this comment is not known to the server yet, this is `null`.
	 */
	public get text(): string {
		return this._text;
	}

	private _rawText: string = null;

	/**
	 * This comments’s raw text. This is the unrendered, unfiltered text as entered by the user. The raw text is only
	 * set if this comment was created or edited by the user. Comments received from the server do not have a raw
	 * text set. It’s `null` otherwise.
	 */
	public get rawText(): string {
		return this._rawText;
	}

	/**
	 * This comments’s raw text. This is the unrendered, unfiltered text as entered by the user.
	 */
	public set rawText(rawText: string) {
		if (rawText !== this._rawText) {
			this.dirty = true;
			this._rawText = rawText;
		}
	}

	private _author: Author = new Author(this);

	public get author(): Author {
		return this._author;
	}

	private _createdOn: Date;

	/**
	 * Date and time this comment was submitted to the server.
	 */
	public get createdOn(): Date {
		return this._createdOn;
	}

	private _lastModifiedOn: Date = null;

	/**
	 * Date and time at which this comment was last modified. `null` if this comment was not yet modified.
	 */
	public get lastModifiedOn(): Date {
		return this._lastModifiedOn;
	}

	private _likes: number = 0;

	/**
	 * The number of likes placed on this comment.
	 */
	public get likes(): number {
		return this._likes;
	}

	private _dislikes: number = 0;


	/**
	 * The number of dislikes placed on this comment.
	 */
	public get dislikes(): number {
		return this._dislikes;
	}

	/**
	 * Comments replying to this comment. Comments in this list have `this` as their [#parent](#parent).
	 */
	public replies: CommentList;

	/**
	 * Fired when this comment was removed from the server.
	 */
	public readonly onDeleted = new VoidAsyncEvent();

	/**
	 * Fired when `this` comment’s text changed
	 */
	public readonly onTextChanged = new AsyncEvent<string>();

	/**
	 * Fired when the date of the last modification of `this` comment changed.
	 */
	public readonly onModifiedChanged = new AsyncEvent<Date>();

	/**
	 * Fired when the number of likes on `this` comment changed.
	 */
	public readonly onLikesChanged = new AsyncEvent<number>();

	/**
	 * Fired when the number of dislikes on `this` comment changed.
	 */
	public readonly onDislikesChanged = new AsyncEvent<number>();

	/**
	 * Fired when this comment receives an ID. This happens after it has been
	 * successfully transfered to the server for the first time.
	 */
	public readonly onIdAssigned = new AsyncEvent<number>();

	/**
	 * Fired when this comment is published (= made visible to the public).
	 */
	public readonly onPublished = new VoidAsyncEvent();

	/**
	 * The comment this comment replies to if it’s a reply. `null` otherwise.
	 */
	public repliesTo: Comment = null;

	/**
	 * The page this comment is on.
	 */
	public page: Page;

	private get parentList(): CommentList {
		return this.repliesTo === null ? this.page.comments : this.repliesTo.replies;
	}

	/**
	 * Creates a comment on the given `page`.
	 *
	 * @param parent	The created comment’s parent: The page it’s on if it’s a top level comment, or the comment
	 *		this comment replies to if it’s a reply.
	 */
	constructor(parent: Comment | Page) {
		if (parent instanceof Comment) {
			this.repliesTo = parent;
			this.page = parent.page;
		} else {
			this.page = parent;
		}
		this.replies = new CommentList(this);
	}

	/**
	 * Whether this comment is published (i.e. can be seen by anybody).
	 *
	 * @return `true` iff this comment exists on the server and does not await moderation.
	 */
	public get published(): boolean {
		return this.existsOnServer && !this.awaitsModeration && !this.deleted;
	}

	/**
	 * Creates a comment from data received from the isso server.
	 *
	 * @hidden
	 * @param serverData	Data received from the isso server.
	 * @param parent	The created comment’s parent: The page it’s on if it’s a top level comment, or the comment
	 *		this comment replies to if it’s a reply.
	 * @return The comment object represented by `serverData`.
	 */
	public static fromServerData(serverData: any, parent: Comment | Page): Comment {
		const result = new Comment(parent);
		result.existsOnServer = true; // we don’t want to fire an onPublished event for this comment.
		result.updateFromServer(serverData);
		return result;
	}

	/**
	 * Updates this comment using the provided `serverData` received from the isso server.
	 *
	 * @hidden
	 * @param serverData	A comment data object received from the isso server.
	 */
	public updateFromServer(serverData: any): void {
		if (serverData.mode === DELETED_STATE) {
			this.wasDeleted();
		}
		this.awaitsModeration = serverData.mode === AWAITS_MODERATION_STATE;
		if (this.id === null) {
			this.onIdAssigned.post(this.id = serverData.id);
		}
		this.updateText(serverData.text);
		this._createdOn = this._createdOn || new Date(serverData.created * TIMESTAMP_MULTIPLIER);
		if (serverData.modified !== null
			&& (this._lastModifiedOn === null || this._lastModifiedOn.getTime() !== serverData.modified)) {
			this.onModifiedChanged.post(this._lastModifiedOn = new Date(serverData.modified * TIMESTAMP_MULTIPLIER));
		}
		this.applyLikes(serverData);

		this.author.ident = serverData.hash;
		this.author.website = serverData.website;
		this.author.name = serverData.author;
		if (serverData.replies !== undefined) {
			this.replies.updateFromServer(serverData);
		}
		if (serverData.mode === PUBLISHED_STATE && !this.existsOnServer) {
			(this.repliesTo === null ? this.page.comments : this.repliesTo.replies).insert(this);
			this.onPublished.post();
		}
		this.dirty = false;
		this.existsOnServer = true;
	}

	/**
	 * Sends this comment to the server. If this comment is not known to the
	 * server yet, this will create the comment on the server. It will be
	 * updated on the server otherwise.
	 * If this comment is updated, the action may fail because the user is not
	 * allowed to edit this comment. See
	 * https://posativ.org/isso/docs/configuration/server/#guard for details.
	 *
	 * Calling this method has no effect if this comment wasn’t changed since
	 * the last call to it.
	 *
	 * @return A promise that will be fulfilled with `this` when this comment was submitted to the server.
	 */
	public send(): Promise<Comment> {
		if (!this.existsOnServer) {
			return this.page.send(() => {
				this.checkSendPreconditions();
				return this.page.server.post('/new')
					.query({uri: this.page.uri})
					.withCredentials()
					.send(this.toRequestData());
				}, this.afterCreate, this);
		} else if (this.dirty) {
			return this.page.send(() => {
				this.checkSendPreconditions();
				return this.page.server.put(`/id/${this.id}`)
					.withCredentials()
					.send(this.toRequestData());
				}, this.afterUpdate, this);
		}
		return Promise.resolve(this);
	}

	/**
	 * Updates this comment’s data from the server.
	 *
	 * @return	A promised resolved with `this` when the update suceeded.
	 */
	public fetch(): Promise<Comment> {
		return this.page.send(
			this.page.server.get(`/id/${this.id}`),
			this.afterUpdate, this);
	}

	/**
	 * Sends a like to the server, increasing the number of likes on this comment by one.
	 *
	 * @return A promise that will be resolved with the new number of likes when the server request succeeded.
	 */
	public sendLike(): Promise<number> {
		return this.page.send(
			this.page.server.post(`/id/${this.id}/like`),
			this.processLikes, this
		).then(() => this._likes);
	}

	/**
	 * Sends a dislike to the server, increasing the number of dislike on this comment by one.
	 *
	 * @return A promise that will be resolved with the new number of dislikes when the server request succeeded.
	 */
	public sendDislike(): Promise<number> {
		return this.page.send(
			this.page.server.post(`/id/${this.id}/dislike`),
			this.processLikes, this
		).then(() => this._dislikes);
	}

	/**
	 * Deletes this comment. This action may fail because the user is not
	 * allowed to delete this comment. See
	 * https://posativ.org/isso/docs/configuration/server/#guard for details.
	 * Deleting an already deleted comment has no effect.
	 *
	 * @return A Promise that will be fulfilled when `this` comment was deleted.
	 */
	public delete(): Promise<void> {
		if (!this.deleted) {
			return this.page.send(
				this.page.server.delete(`/id/${this.id}`)
					.withCredentials(),
			this.afterDelete, this);
		}
		return Promise.resolve(undefined);
	}

	/**
	 * Informs this comment about the fact that is was deleted on the server.
	 *
	 * @hidden
	 */
	public wasDeleted(): void {
		this._deleted = true;
		this.onDeleted.post();
	}

	/**
	 * Informs this comment about the fact that one of its properties changed.
	 *
	 * @hidden
	 */
	public authorChanged(): void {
		this.dirty = true;
	}

	private afterDelete(): void {
		this.parentList.remove(this);
		this.wasDeleted();
	}

	/**
	 * Checks that all preconditions are met to send this comment to the server.
	 *
	 * @throws an error if this comment is not ready to be sent yet.
	 */
	private checkSendPreconditions(): void {
		if (this.repliesTo !== null && !this.repliesTo.existsOnServer) {
			throw new Error('The parent comment was not sent yet!');
		}
	}

	/**
	 * Transforms this comment into a data object that can be used to send it
	 * to the isso server.
	 *
	 * @return This comment’s server representation.
	 */
	private toRequestData(): Object {
		return {
			// the server expects the text to be sent on updates.
			text: this.rawText || this.text,
			author: this.author.name || undefined,
			website: this.author.website || undefined,
			email: this.author.email || undefined,
			parent: this.repliesTo !== null ? this.repliesTo.id : null
		};
	}

	/**
	 * Processes a respones received from the server containing information about the likes and dislikes of this
	 * comment.
	 *
	 * @param response
	 *		The server’s response containing information about this comment’s likes and dislikes.
	 */
	private processLikes(response: Response): void {
		this.applyLikes(response.body);
	}

	/**
	 * Takes the provided `commentLikeObject` and applies the contained information about likes and dislikes to this
	 * comment.
	 *
	 * @param commentLikeObject	An object at least having a `likes` and `dislikes` property.
	 */
	private applyLikes(commentLikeObject: any): void {
		if (commentLikeObject.likes !== this.likes) {
			this.onLikesChanged.post(this._likes = commentLikeObject.likes);
		}
		if (commentLikeObject.dislikes !== this.dislikes) {
			this.onDislikesChanged.post(this._dislikes = commentLikeObject.dislikes);
		}
	}

	/**
	 * Callback for after a successful create request.
	 */
	private afterCreate(serverResponse: Response): Comment {
		return this.afterUpdate(serverResponse);
	}

	/**
	 * Callback for after a successful update request.
	 */
	private afterUpdate(serverResponse: Response): Comment {
		this.updateFromServer(serverResponse.body);
		return this;
	}

	/*
	 * Field updaters, firing the relevant events if necessary:
	 */

	private updateText(newText: string): void {
		if (this._text !== newText) {
			this.onTextChanged.post(this._text = newText);
		}
	}
}
