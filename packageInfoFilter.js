const fs = require("fs-extra");
let packageJSON = require('./package.json');
console.log("CREATING package.json")

delete packageJSON.devDependencies;
delete packageJSON.scripts;
delete packageJSON.dependencies.vue;
delete packageJSON.dependencies.husky;
delete packageJSON.dependencies[ "vue-marquee-text-component" ];

// console.log(packageJSON)

fs.writeFileSync("./release/package.json", JSON.stringify(packageJSON, null, "\t"));
console.log(" > Done")