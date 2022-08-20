const { json } = require('body-parser');
const cp = require('child_process');
const { fdatasync } = require('fs');
var installingDependencies = false;
const irequire = async module => {
    try {
        require.resolve(module)
    } catch (e) {
        if (!installingDependencies) {
            installingDependencies = true
            console.log(`INSTALLING DEPENDENCIES...\nTHIS PROCESS MAY TAKE SOME TIME. PLEASE WAIT`)
        }
        // cp.execSync(`npm install ${module}`)
        cp.execSync(`npm install`)
        await setImmediate(() => { })
        // console.log(`"${module}" has been installed`)
        console.log(`DEPENDECIES INSTALLED`)
    }
    console.log(`Requiring "${module}"`)
    try {
        return require(module)
    } catch (e) {
        console.log(`Could not include "${module}". Restart the script`)
        terminateAndSpawnChildProcess(1)
        //process.exit(1)
    }
}
init();

async function init() {
    const fs = await irequire("fs-extra");
    let packageJSON = await irequire('./package.json');

    delete packageJSON.devDependencies;
    delete packageJSON.scripts;
    delete packageJSON.dependencies.vue;
    delete packageJSON.dependencies["vue-marquee-text-component"];

    console.log(packageJSON)

    fs.writeFileSync("./release/package.json", JSON.stringify(packageJSON, null, "\t"));
}