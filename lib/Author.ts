import {AsyncEvent} from 'ts-events';
import Comment from './Comment';

/**
 * The author of a comment. Every author has an unique identifier that is
 * constanst over pages, websites and time. Howere, every comment has its
 * own author object and different author objects with the same identifier
 * may still have differnt data for the [#name](#name) and [#website](#website).
 */
export default class Author {

	private _website: string = null;

	private _ident: string = null;

	public constructor(private comment: Comment) {};

	/**
	 * The author’s identifier. Computed by the server based on its email address.
	 */
	public get ident(): string {
		return this._ident;
	}

	public set ident(newIdent: string) {
		if (this._ident === null && newIdent !== null) {
			this.onIdentAssigned.post(this._ident = newIdent);
		}
	}

	/**
	 * The author’s website.
	 */
	public get website(): string {
		return this._website;
	}

	public set website(website: string) {
		if (website !== this._website) {
			this.onWebsiteChanged.post(this._website = website);
			this.comment.authorChanged();
		}
	}

	private _name: string = null;

	/**
	 * The author’s name.
	 */
	public get name(): string {
		return this._name;
	}

	public set name(name: string) {
		if (this._name !== name) {
			this.onNameChanged.post(this._name = name);
			this.comment.authorChanged();
		}
	}

	/**
	 * The author’s email address.
	 */
	public email: string = null;


	/**
	 * Fired when the server assigned an [identifier](#ident) to this author.
	 */
	public onIdentAssigned = new AsyncEvent<string>();

	/**
	 * Fired when this author’s [website](#website) has changed.
	 */
	public onWebsiteChanged = new AsyncEvent<string>();
	/**
	 * Fired when this author’s [name](#name) changed.
	 */
	public onNameChanged = new AsyncEvent<string>();
}
