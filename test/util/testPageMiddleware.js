const url = require('url');

module.exports = function(request, response, next) {
	const query = url.parse(request.url);
	if (/testpage.*/.test(query.pathname)) {
		response.setHeader('Content-Type', 'text/html');
		const pagename = query.pathname.substring(10);
		response.end(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>${pagename}</title>
				</head>
				<body>Test page for <code>${pagename}</code>.</body>
			</html>`.replace(/\t+|\n+|\r+/g, ''));
	} else {
		next();
	}
};
