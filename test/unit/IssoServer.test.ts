import {expect} from 'chai';
import IssoServer from '../../lib/IssoServer';

let server: IssoServer;

describe('IssoServer', () => {

	beforeEach('create IssoServer', () => {
		server = new IssoServer('https://comments.example.com');
	});

	it('creates POST requests', () => {
		let request: any = server.post('/endpoint');
		expect(request.url).to.equal('https://comments.example.com/endpoint');
		expect(request.method).to.equal('POST');
	});

	it('creates GET requests', () => {
		let request: any = server.get('/endpoint');
		expect(request.url).to.equal('https://comments.example.com/endpoint');
		expect(request.method).to.equal('GET');
	});

	it('creates PUT requests', () => {
		let request: any = server.put('/endpoint');
		expect(request.url).to.equal('https://comments.example.com/endpoint');
		expect(request.method).to.equal('PUT');
	});

	it('creates DELETE requests', () => {
		let request: any = server.delete('/endpoint');
		expect(request.url).to.equal('https://comments.example.com/endpoint');
		expect(request.method).to.equal('DELETE');
	});

	it('can handle a "/" at the end of the base url', () => {
		const serverAlt = new IssoServer('https://comments.example.com/');

		let request: any = serverAlt.post('/endpoint');
		expect(request.url).to.equal('https://comments.example.com/endpoint');

		request = serverAlt.get('/endpoint');
		expect(request.url).to.equal('https://comments.example.com/endpoint');

		request = serverAlt.put('/endpoint');
		expect(request.url).to.equal('https://comments.example.com/endpoint');

		request = serverAlt.delete('/endpoint');
		expect(request.url).to.equal('https://comments.example.com/endpoint');
	});
});
