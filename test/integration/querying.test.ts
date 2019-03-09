import pageUris from '../fixtures/pageUris';
import Page from '../../lib/Page';
import * as Isso from '../util/isso-control';
import * as Testdata from './testdata';

let testPage: Page; // created from pageUris[0]

describe('querying comments', () => {
	beforeAll(() => Isso.create()
	.then(Testdata.createPopulatedTestPages([pageUris[0]]))
	.then(pages => testPage = pages[0]));
	afterAll(Isso.finished);

	test('full list', () => {
		return new Page(testPage.server, pageUris[0]).comments.fetch().then(list => {
			expect(list).toHaveLength(4);
		});
	});

	test('flat count', () => {
		return new Page(testPage.server, pageUris[0]).comments.fetchCount().then(count => {
			expect(count).toBe(4);
		});
	});

	test('deep count', () => {
		return new Page(testPage.server, pageUris[0]).comments.fetchDeepCount().then(deepCount => {
			expect(deepCount).toBe(7);
		});
	});

});
