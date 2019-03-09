import Server from '../../lib/IssoServer';
import pageUris from '../fixtures/pageUris';
import Page from '../../lib/Page';
import Comment from '../../lib/Comment';
import * as Isso from '../util/isso-control';

let server: Server;

export function createPopulatedTestPages(pageUrisToUse: string[] = pageUris): (serverUrl: string) => Promise<Page[]> {
	return createPopulatedTestPagesInto([], pageUrisToUse);
}

export function createPopulatedTestPagesInto(target: Page[], pageUrisToUse: string[] = pageUris)
	: (serverUrl: string) => Promise<Page[]> {
	return (serverUrl: string) => populateTestPages(createTestPagesInto(target, pageUrisToUse)(serverUrl));
}

export function createTestPagesInto(target: Page[], pageUrisToUse: string[] = pageUris): (serverUrl: string) => Page[] {
	return (serverUrl: string) => {
		server = new Server(serverUrl);
		pageUrisToUse.forEach(uri => target.push(new Page(server, uri)));
		return target;
	};
}

export function populateTestPages(pages: Page[]): Promise<Page[]> {
	return pages.filter(isFirstPage).reduce((prev, page) => prev.then(() => populateFirstPage(page)), Promise.resolve())
		.then(() => Promise.all(pages.filter(not(isFirstPage)).map(populateOtherPage)))
		.then(() => {
			return pages;
		});
}

function isFirstPage(page: Page): boolean {
	return page.uri.startsWith('/' + pageUris[0]);
}

function not<A>(f: (a: A) => boolean): (a: A) => boolean {
	return (a: A) => !f(a);
}

function populateFirstPage(firstPage: Page): Promise<void> {
	const comments: Array<Comment> = [];
	let comment: Comment;
	let response: Comment;

	comment = new Comment(firstPage);
	comment.rawText = 'A simple test comment';
	comments.push(comment);

	response = new Comment(comment);
	response.rawText = 'This is a reply';
	response.author.name = 'I only want to tell my name';
	comments.push(response);

	comment = new Comment(firstPage);
	comment.rawText = 'A more complex test comment';
	comment.author.name = 'Mr. Test';
	comment.author.email = 'test@mrtest.com';
	comment.author.website = 'https://example.org';
	comments.push(comment);

	comment = new Comment(firstPage);
	comment.rawText = 'Yet a nother comment';
	comment.author.email = 'author@example.org';
	comments.push(comment);

	comment = new Comment(firstPage);
	comment.rawText = 'Controversal comment';
	comments.push(comment);

	response = new Comment(comment);
	response.rawText = 'How can you say that?';
	comments.push(response);

	response = new Comment(comment);
	response.rawText = 'I’m really offended!';
	response.author.name = 'Angry Man';
	response.author.email = 'angry.man@example.org';
	comments.push(response);

	return Promise.all(comments.map(preparedComment => preparedComment.send()))
		.then(() => Isso.enableModeration())
		.then(() => {
			comment = new Comment(firstPage);
			comment.rawText = 'Moderated Comment';
			comment.author.name = 'Mr. Moderated';
			comment.author.email = 'moderated@mrtest.com';
			comment.author.website = 'https://example.org';
			return comment.send();
		})
		.then(() => Isso.disableModeration());
}

function populateOtherPage(page: Page): Promise<void> {
	return Promise.all(
		['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eigth', 'ninth', 'tenth']
			.map(text => {
				const comment = new Comment(page);
				comment.rawText = `*${text}* comment on this page! That’s so **cool**!`;
				return comment.send();
			})
	) as Promise<any>;
}
