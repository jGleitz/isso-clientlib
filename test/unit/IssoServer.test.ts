import IssoServer from '../../lib/IssoServer';

let server: IssoServer;

describe('IssoServer', () => {
	beforeEach(() => {
		// create IssoServer
		server = new IssoServer('https://comments.example.com');
	});

	it('creates POST requests', () => {
		const request = server.post('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
		expect(request.method).toBe('POST');
	});

	it('creates GET requests', () => {
		const request = server.get('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
		expect(request.method).toBe('GET');
	});

	it('creates PUT requests', () => {
		const request = server.put('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
		expect(request.method).toBe('PUT');
	});

	it('creates DELETE requests', () => {
		const request = server.delete('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
		expect(request.method).toBe('DELETE');
	});

	it('can handle a "/" at the end of the base url', () => {
		const serverAlt = new IssoServer('https://comments.example.com/');

		let request = serverAlt.post('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');

		request = serverAlt.get('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');

		request = serverAlt.put('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');

		request = serverAlt.delete('/endpoint');
		expect(request.url).toBe('https://comments.example.com/endpoint');
	});
});
