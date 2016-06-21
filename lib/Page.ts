import IssoServer from './IssoServer';
import {Request} from 'superagent';
import CommentList from './CommentList';
import {Response} from 'superagent';

/**
 * Represents one page on the website that can have comments on it. Every
 * {@link Comment} belongs to exactly one page. Pages are identified using
 * their URI.
 */
export default class Page {

	/**
	 * The promise for the request at the end of this page’s request queue.
	 */
	private pendingQueryPromise: Promise<any> = Promise.resolve();

	/**
	 * The comments on this page.
	 */
	public comments = new CommentList(this);

	/**
	 * Creates an abstraction of one page.
	 *
	 * @param server	The isso server.
	 * @param uri	The created page’s uri.
	 */
	constructor(public server: IssoServer, public uri: string) {}

	/**
	 * Creates a page abstraction for the page currently loaded in the browser.
	 *
	 * @param server	The isso server.
	 * @return The page representing the one currently loaded in the
	 *		browser.
	 */
	public static getCurrent(server: IssoServer): Page {
		return new Page(server, window.location.pathname);
	}

	/**
	 * Sends the provided `request`. Sending through this method ensures that no other request concerning this page
	 * will be sent until the `request` has finished and was processed by the provided `process` function.
	 *
	 * @hidden
	 * @param request	The request to send.
	 * @param process	The function processing the request, i.e. applying all necessary changes to the data objects.
	 * @param thisObject	The object to bind `process` to.
	 * @return A promise that will be resolved with `process`’s result.
	 */
	public send<R>(request: Request<any>, process: (response: Response) => R, thisObject?: any): Promise<R> {
		return this.onNoRequest(() => new Promise((resolve, reject) => {
			request.end((error, result) => {
				if (error) {
					reject(error);
					return;
				}
				const processor = thisObject ? process.bind(thisObject) : process;
				resolve(processor(result));
			});
		}));
	}

	/**
	 * Runs the provided `func` as soon as all requests momentarily queued on this page are finished.
	 *
	 * @hidden
	 * @param func	A function to execute when no request is pending on this page.
	 * @return A promise that will be resolved with the return value of `func`.
	 */
	public onNoRequest(func: () => any): Promise<any> {
		return this.pendingQueryPromise = this.pendingQueryPromise.then(func, func);
	}
}
