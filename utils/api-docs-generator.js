const fs = require('fs');
const swaggerAutogen = require('swagger-autogen')({ writeOutputFile: false })

main();

async function main() {
    apiDocsJson = await swaggerAutogen('./swagger-output.json', [ 'server.js' ]);
    fs.writeFileSync('docs/api/docs.json', JSON.stringify(apiDocsJson))
}