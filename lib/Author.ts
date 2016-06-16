import {AsyncEvent} from 'ts-events';

/**
 * The author of a comment. Every author has an unique identifier that is
 * constanst over pages, websites and time.
 */
export default class Author {

	private _website: string = null;

	private _ident: string = null;

	public get ident(): string {
		return this._ident;
	}

	public set ident(newIdent: string) {
		if (this._ident === null && newIdent !== null) {
			this.onIdentAssigned.post(this._ident = newIdent);
		}
	}

	public get website(): string {
		return this._website;
	}

	public set website(website: string) {
		if (website !== this._website) {
			this.onWebsiteChanged.post(this._website = website);
		}
	}

	private _name: string = null;

	public get name(): string {
		return this._name;
	}

	public set name(name: string) {
		if (this._name !== name) {
			this.onNameChanged.post(this._name = name);
		}
	}

	public email: string = null;

	public onIdentAssigned = new AsyncEvent<string>();
	public onWebsiteChanged = new AsyncEvent<string>();
	public onNameChanged = new AsyncEvent<string>();
}
