
const fs = require("fs-extra");
const zip = (require('node-zip'))();
const path = require('path');
const StreamZip = require('node-stream-zip');

console.log("CREATING release.zip");

fs.removeSync("./release.zip");

const allF = getAllFiles(path.join(__dirname, "release"));
// console.log(allF);
for (let f of allF) {
    zip.file(f.replace(__dirname + "\\", ""), fs.readFileSync(f));
}

var data = zip.generate({ base64: true, compression: 'DEFLATE' });
fs.writeFileSync('release.zip', data, 'base64');

const zipTest = new StreamZip({
    file: "release.zip",
    storeEntries: true,
    skipEntryNameValidation: true
});
zipTest.on('ready', async () => {
    let testPass = false;
    zipTest.on('entry', e => {
        if (e.isDirectory) testPass = true;
    });

    console.log(" > Test:",testPass?"PASS":"FAIL")
    process.exit(!testPass);
});


console.log(" > Done");

function getAllFiles(dirPath, arrayOfFiles) {
    files = fs.readdirSync(dirPath)

    arrayOfFiles = arrayOfFiles || []

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
        } else {
            arrayOfFiles.push(path.join(dirPath, file))
        }
    })

    return arrayOfFiles
}