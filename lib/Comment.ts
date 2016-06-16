import Page from './Page';
import Author from './Author';
import {Response} from 'superagent';
import {AsyncEvent, VoidAsyncEvent} from 'ts-events';
import CommentList from './CommentList';

/**
 * The integer used by isso to encode the “awaits moderation” state of a
 * comment.
 */
const AWAITS_MODERATION_STATE = 2;

/**
 * The integer used by isso to encode the “deleted but referenced” state of a
 * comment.
 */
const DELETED_STATE = 4;

/**
 * The integer used by isso to encode the “fully published” state of a
 * comment.
 */
const PUBLISHED_STATE = 1;

/**
 * The number to multiply timestamps received from the isso server with in order to correctly convert them to JS `Date`.
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

	private updateText(newText: string): void {
		if (this._text !== newText) {
			this.onTextChanged.post(this._text = newText);
		}
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
		}
	}

	private _author: Author = new Author();

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

	private _dislikes: number = 0;


	public get dislikes(): number {
		return this._dislikes;
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

	public replies = new CommentList(this);
	/**
	 * Fired when this comment was removed from the server.
	 */
	public onDeleted = new VoidAsyncEvent();

	/**
	 * Fired when `this` comment’s text changed
	 */
	public onTextChanged = new AsyncEvent<string>();

	/**
	 * Fired when the date of the last modification of `this` comment changed.
	 */
	public onModifiedChanged = new AsyncEvent<Date>();

	/**
	 * Fired when the number of likes on `this` comment changed.
	 */
	public onLikesChanged = new AsyncEvent<number>();

	/**
	 * Fired when the number of dislikes on `this` comment changed.
	 */
	public onDislikesChanged = new AsyncEvent<number>();

	/**
	 * Fired when this comment receives an ID. This happens after it has been
	 * successfully transfered to the server for the first time.
	 */
	public onIdAssigned = new AsyncEvent<number>();

	/**
	 * Fired when this comment is published (= made visible to the public).
	 */
	public onPublished = new VoidAsyncEvent();

	/**
	 * Creates a comment on the given `page`.
	 *
	 * @param page	The page this comment is on.
	 * @param parent	The comment that is being replied on if this comment is a response.
	 */
	constructor(public page: Page, public parent?: Comment) {
		this._author.onNameChanged.attach(() => this.dirty = true);
		this._author.onWebsiteChanged.attach(() => this.dirty = true);
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
	 * @param page	The page the comment belongs to.
	 * @param parent	The created comment’s parent comment, or `null`.
	 * @return The comment object represented by `serverData`.
	 */
	public static fromServerData(serverData: any, page: Page, parent: Comment): Comment {
		const result = new Comment(page, parent);
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
		} else if (serverData.mode === PUBLISHED_STATE && !this.published) {
			this.page.comments.insert(this);
			this.onPublished.post();
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
		this.dirty = false;
		this.existsOnServer = true;
		if (serverData.replies !== undefined) {
			this.replies.updateFromServer(serverData);
		}
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
			return this.page.send(
				this.page.server.post('/new')
					.query({uri: this.page.uri})
					.send(this.toRequestData()),
				this.afterCreate, this);
		} else if (this.dirty) {
			return this.page.send(
				this.page.server.put(`/id/${this.id}`)
					.send(this.toRequestData()),
				this.afterUpdate, this);
		}
		return Promise.resolve(this);
	}

	public fetch(): Promise<Comment> {
		return this.page.send(
			this.page.server.get(`/id/${this.id}`),
			this.afterUpdate, this);
	}

	/**
	 * Deletes this comment. This action may fail because the user is not
	 * allowed to delete this comment. See
	 * https://posativ.org/isso/docs/configuration/server/#guard for details.
	 * Deleting an already delted comment has no effect.
	 *
	 * @return A Promise that will be fulfilled when `this` comment was deleted.
	 */
	public delete(): Promise<void> {
		if (!this.deleted) {
			return this.page.send(
				this.page.server.delete(`/id/${this.id}`),
			this.wasDeleted, this);
		}
		return Promise.resolve(undefined);
	}

	/**
	 * Informs this comment about the fact that is was deleted on the server.
	 */
	public wasDeleted(): void {
		this._deleted = true;
		this.onDeleted.post();
	}

	/**
	 * Transforms this comment into a data object that can be used to send it
	 * to the isso server.
	 *
	 * @return This comment’s server representation.
	 */
	private toRequestData(): Object {
		return {
			text: this.rawText || (this.existsOnServer ? undefined : ''),
			author: this.author.name || undefined,
			website: this.author.website || undefined,
			email: this.author.email || undefined,
			parent: this.parent !== null ? this.parent.id : null
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
}
