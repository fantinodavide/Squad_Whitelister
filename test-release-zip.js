const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const StreamZip = require('node-stream-zip');

async function testZipCompatibility(zipPath) {
    console.log(`Testing compatibility of ${zipPath}...`);
    
    // Check if file exists
    if (!fs.existsSync(zipPath)) {
        console.error(`Error: ${zipPath} does not exist!`);
        return false;
    }
    
    try {
        // Create temporary extraction directory
        const extractDir = path.join(__dirname, 'zip-test-extract');
        if (fs.existsSync(extractDir)) {
            fs.rmSync(extractDir, { recursive: true, force: true });
        }
        fs.mkdirSync(extractDir, { recursive: true });
        
        // Open zip file with the same settings as your application
        const zip = new StreamZip({
            file: zipPath,
            storeEntries: true,
            skipEntryNameValidation: true
        });
        
        // Wait for the zip to be ready
        await new Promise((resolve, reject) => {
            zip.on('ready', resolve);
            zip.on('error', reject);
        });
        
        // Check if "release/" exists in the zip
        const entries = Object.values(zip.entries());
        const hasReleaseDir = entries.some(entry => 
            entry.name === 'release/' || 
            entry.name.startsWith('release/') || 
            entry.name === 'release\\' || 
            entry.name.startsWith('release\\')
        );
        
        if (!hasReleaseDir) {
            console.error('Error: Zip file does not contain a "release/" directory!');
            zip.close();
            return false;
        }
        
        // Try extracting the release folder
        await new Promise((resolve, reject) => {
            zip.extract('release/', extractDir, (err, count) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`Successfully extracted ${count} files to test directory`);
                    resolve();
                }
            });
        });
        
        // Check if extraction created proper directories
        const extractedFiles = getAllFiles(extractDir);
        console.log('Extracted file structure:');
        extractedFiles.forEach(file => {
            console.log(`  ${file.replace(extractDir, '')}`);
        });
        
        // Check for critical subdirectories that should exist
        const dirsToCheck = ['dist', 'certificates', 'docs/api'];
        let missingDirs = [];
        
        for (const dir of dirsToCheck) {
            const dirPath = path.join(extractDir, dir);
            if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
                missingDirs.push(dir);
            }
        }
        
        if (missingDirs.length > 0) {
            console.error(`Error: Expected directories not found: ${missingDirs.join(', ')}`);
            zip.close();
            return false;
        }
        
        // Check for server.js
        if (!fs.existsSync(path.join(extractDir, 'server.js'))) {
            console.error('Error: server.js is missing!');
            zip.close();
            return false;
        }
        
        // Clean up
        zip.close();
        fs.rmSync(extractDir, { recursive: true, force: true });
        
        console.log('✅ ZIP file is compatible with your extraction method');
        return true;
    } catch (error) {
        console.error('Error testing zip compatibility:', error);
        return false;
    }
}

// Helper function to recursively get all files in a directory
function getAllFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(fullPath));
        } else {
            results.push(fullPath);
        }
    });
    return results;
}

// Run the test if called directly
if (require.main === module) {
    const zipPath = process.argv[2] || path.join(__dirname, 'release.zip');
    testZipCompatibility(zipPath)
        .then(isCompatible => {
            process.exit(isCompatible ? 0 : 1);
        })
        .catch(err => {
            console.error('Unhandled error:', err);
            process.exit(1);
        });
}

module.exports = {
    testZipCompatibility
};