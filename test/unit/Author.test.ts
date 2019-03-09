import Comment from '../../lib/Comment';
import Page from '../../lib/Page';

import * as SERVER_FIXTURES from '../fixtures/commentListing';
import IssoFakeServer from '../util/FakeIssoServer';

const commentData = SERVER_FIXTURES.standard.replies[0];
const server = new IssoFakeServer();
let page: Page;

describe('Author', () => {

	beforeEach(() => { // create a page
		page = new Page(server, 'test/uri');
	});

	it('is initialised with the comment', () => {
		const comment = Comment.fromServerData(commentData, page);
		expect(comment.author.name).toBe('Peter Pan');
		expect(comment.author.website).toBe('peterpan.org');
		expect(comment.author.ident).toBe('4505c1eeda98');
	});
});
