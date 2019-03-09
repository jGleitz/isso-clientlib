import IssoServer from '../../lib/IssoServer';

let server: IssoServer;

describe('IssoServer', () => {

	beforeEach(() => { // create IssoServer
		server = new IssoServer('https://comments.example.com');
	});

	it('creates POST requests', () => {
		const request: any = server.post('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
		expect(request.method).toBe('POST');
	});

	it('creates GET requests', () => {
		const request: any = server.get('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
		expect(request.method).toBe('GET');
	});

	it('creates PUT requests', () => {
		const request: any = server.put('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
		expect(request.method).toBe('PUT');
	});

	it('creates DELETE requests', () => {
		const request: any = server.delete('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
		expect(request.method).toBe('DELETE');
	});

	it('can handle a "/" at the end of the base url', () => {
		const serverAlt = new IssoServer('https://comments.example.com/');

		let request: any = serverAlt.post('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');

		request = serverAlt.get('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');

		request = serverAlt.put('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');

		request = serverAlt.delete('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
	});
});
