import { Page } from '../../lib';
import * as Isso from '../util/isso-control';
import * as Testdata from './testdata';

const pages: Page[] = []; // only 0..2 are populated

describe('counting comments on pages', () => {
	beforeAll(() =>
		Isso.create()
			.then(Testdata.createTestPagesInto(pages))
			.then(p => p.slice(0, 3))
			.then(Testdata.populateTestPages)
	);
	afterAll(Isso.finished);

	test('collective deep count', () => {
		return Promise.all(pages.map(page => page.comments.fetchDeepCount())).then(() => {
			expect(pages[0].comments.deepCount).toBe(7);
			expect(pages[1].comments.deepCount).toBe(10);
			expect(pages[2].comments.deepCount).toBe(10);
			expect(pages[3].comments.deepCount).toBe(0);
		});
	});

	test('flat count', () => {
		return Promise.all(pages.map(page => page.comments.fetchCount())).then(() => {
			expect(pages[0].comments.count).toBe(4);
			expect(pages[1].comments.count).toBe(10);
			expect(pages[2].comments.count).toBe(10);
			expect(pages[3].comments.count).toBe(0);
		});
	});
});
