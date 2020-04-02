import { AsyncEvent } from 'ts-events';
import { Comment } from './Comment';

/**
 * The author of a comment. Every author has an unique identifier that is
 * constanst over pages, websites and time. Howere, every comment has its
 * own author object and different author objects with the same identifier
 * may still have differnt data for the [#name](#name) and [#website](#website).
 */
export class Author {
	private _website?: string;

	private _ident?: string;
	/**
	 * The author’s identifier. Computed by the server based on its email address.
	 */
	public get ident(): string | undefined {
		return this._ident;
	}

	public set ident(newIdent: string | undefined) {
		if (this._ident === undefined && newIdent !== undefined) {
			this.onIdentAssigned.post((this._ident = newIdent));
		}
	}

	/**
	 * The author’s website.
	 */
	public get website(): string | undefined {
		return this._website;
	}

	public set website(website: string | undefined) {
		if (website !== this._website) {
			this.onWebsiteChanged.post((this._website = website));
			this.comment.authorChanged();
		}
	}

	private _name?: string;

	/**
	 * The author’s name.
	 */
	public get name(): string | undefined {
		return this._name;
	}

	public set name(name: string | undefined) {
		if (this._name !== name) {
			this.onNameChanged.post((this._name = name));
			this.comment.authorChanged();
		}
	}

	/**
	 * The author’s email address.
	 */
	public email?: string;

	/**
	 * Fired when the server assigned an [identifier](#ident) to this author.
	 */
	public readonly onIdentAssigned = new AsyncEvent<string>();

	/**
	 * Fired when this author’s [website](#website) has changed.
	 */
	public readonly onWebsiteChanged = new AsyncEvent<string | undefined>();
	/**
	 * Fired when this author’s [name](#name) changed.
	 */
	public readonly onNameChanged = new AsyncEvent<string | undefined>();

	public constructor(private readonly comment: Comment) {}
}
