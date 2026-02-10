const fs = require('fs');
const path = require('path');
const swaggerAutogen = require('swagger-autogen')({ writeOutputFile: false });

main();

async function main() {
	const serverPath = path.resolve(__dirname, '..', 'server.js');
	const tmpPath = path.resolve(__dirname, '..', '.server.swagger.tmp.js');

	let src = fs.readFileSync(serverPath, 'utf8');
	src = src
		.replace(/req\.sanitizedBody/g, 'req.body')
		.replace(/req\.sanitizedQuery/g, 'req.query')
		.replace(/req\.sanitizedParams/g, 'req.params');
	fs.writeFileSync(tmpPath, src);

	try {
		const apiDocsJson = await swaggerAutogen('./swagger-output.json', [tmpPath]);
		fs.writeFileSync('docs/api/docs.json', JSON.stringify(apiDocsJson));
	} finally {
		fs.unlinkSync(tmpPath);
	}
}
