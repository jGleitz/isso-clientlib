import * as Isso from '../util/isso-control';
import Server from '../../lib/IssoServer';
import Page from '../../lib/Page';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as chaiDateTime from 'chai-datetime';
import * as es6Promise from 'es6-promise';

(<any> es6Promise).polyfill();
chai.use(chaiAsPromised);
chai.use(chaiDateTime);

import pageUris from '../fixtures/pageUris';

import creating from './creating.test';
import counting from './counting.test';
import querying from './querying.test';
import deleting from './deleting.test';
import requerying from './requerying.test';
import updating from './updating.test';

let server: Server;
const pages: Array<Page> = [];

before('launch isso', () => Isso.start().then(serverUrl => {
	server = new Server(serverUrl);
	pageUris
		.map(uri => new Page(server, uri))
		.forEach(page => pages.push(page));
}));

after('stop isso', Isso.finished);

describe('', function(): void {
	this.slow(300); // tslint:disable-line no-invalid-this

	[
		creating,
		counting,
		querying,
		deleting,
		updating,
		requerying
	].forEach(test => test(pages));
});
