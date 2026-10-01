const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dir = path.join(__dirname, '..', 'contract');
const files = ['CONTRACT.md', 'operations.json'];
const checksumFile = path.join(dir, 'CHECKSUMS.txt');

function computeChecksums() {
	return (
		files
			.map((f) => {
				const bytes = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');
				return `${crypto.createHash('sha256').update(bytes).digest('hex')}  ${f}`;
			})
			.join('\n') + '\n'
	);
}

if (require.main === module && process.argv[2] === 'write') {
	fs.writeFileSync(checksumFile, computeChecksums());
	console.log('wrote', checksumFile);
}

module.exports = { computeChecksums, checksumFile };
