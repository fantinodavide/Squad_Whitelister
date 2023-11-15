const { match } = require('assert');
const cp = require('child_process');
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
        restartProcess(0, 1)
        //process.exit(1)
    }
}

installUpdateDependencies = async () => {
    console.log(`INSTALLING/UPDATING DEPENDENCIES...\nTHIS PROCESS MAY TAKE SOME TIME. PLEASE WAIT`)
    cp.execSync(`npm install`)
}

var subcomponent_status = {
    discord_bot: false,
    squadjs: []
}
var subcomponent_data = {
    discord_bot: {
        invite_link: ""
    },
    squadjs: [],
    database: {
        root_user_registered: false
    },
    updater: {
        updating: false
    }
}

async function init() {
    const packageJSON = await irequire('./package.json');
    const versionN = packageJSON.version;

    const fs = await irequire("fs-extra");
    const StreamZip = await irequire('node-stream-zip');
    const https = await irequire('https');
    const http = await irequire('http');
    const express = await irequire('express');
    const app = express();
    const path = await irequire('path')
    const mongo = await irequire('mongodb');
    const MongoClient = mongo.MongoClient;
    const ObjectID = mongo.ObjectID;
    const crypto = await irequire("crypto");
    const bodyParser = await irequire('body-parser');
    const cookieParser = await irequire('cookie-parser');
    const nocache = await irequire('nocache');
    const log4js = await irequire('log4js');
    const axios = await irequire('axios');
    const args = (await irequire('minimist'))(process.argv.slice(2));
    const nrc = await irequire('node-run-cmd');
    const forceSSL = await irequire('express-force-ssl');
    const fp = await irequire("find-free-port")
    const { mainModule } = await irequire("process");
    const Discord = await irequire("discord.js");
    const { io } = await irequire("socket.io-client");
    const dns = await irequire('dns')
    const util = require('util');
    const lookup = util.promisify(dns.lookup);

    try {
        (await irequire('dotenv')).config();
    } catch (error) {
        console.error(error)
    }

    const enableServer = true;
    var errorCount = 0;

    const configPath = args.c || "conf.json"

    const consoleLogBackup = console.log;
    const consoleErrorBackup = console.error;

    let tmpData = new Date();
    const logFile = path.join(__dirname, 'logs', (tmpData.toISOString().replace(/T/g, "_").replace(/(:|-|\.|Z)/g, "")) + ".log");
    if (!fs.existsSync('logs')) fs.mkdirSync('logs');
    if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, "");


    log4js.configure({
        appenders: { App: { type: "file", filename: logFile } },
        categories: { default: { appenders: [ "App" ], level: "all" } }
    });
    const logger = log4js.getLogger("App");
    console.log("Log-file:", logFile);

    var server = {
        http: undefined,
        https: undefined,
        configs: {
            https: {
                port: undefined
            },
            http: {
                port: undefined
            }
        },
        logging: {
            requests: false
        }
    };
    var squadjs = {
        ws: null,
        initDone: false
    }
    var urlCalls = []
    var config;

    const mongodb_global_connection = true;
    var mongodb_conn;

    var discordBot;

    start();

    function start() {
        initConfigFile(() => {
            extendLogging()
            console.log("ARGS:", args)
            console.log("ENV:", process.env)

            fs.watchFile(configPath, (curr, prev) => {
                console.log("Reloading configuration");
                let upd_conf, error = false;
                try {
                    upd_conf = JSON.parse(fs.readFileSync(configPath, "utf-8").toString());
                } catch (err) {
                    console.log("Error found in conf.json file. Couldn't reload configuration.")
                    error = true;
                }

                if (!error) {
                    config = upd_conf;
                    console.log("Reloaded configuration.", config)
                }
            });
            config = JSON.parse(fs.readFileSync(configPath, "utf-8").toString());
            console.log(config);

            initDBConnection(() => {
                isDbPopulated(main)
            })
        })
    }
    function initDBConnection(callback = null) {
        // console.log("Connecting to MongoDB...")
        if (mongodb_global_connection) {
            console.log("MongoDB connection");
            const tm = setTimeout(() => {
                console.error(" > Connection failed. Check your Database configuration.");
                restartProcess(0, 1, args);
            }, 10000)
            mongoConn((dbo) => {
                mongodb_conn = dbo;
                console.log(" > Successfully connected");

                clearTimeout(tm);
                if (callback) callback();
            }, true)
        }
    }
    function main() {
        checkUpdates(config.other.automatic_updates, () => {
            console.log(" > Starting up");
            setInterval(() => { checkUpdates(config.other.automatic_updates) }, config.other.update_check_interval_seconds * 1000);

            resetSeedingTime();

            discordBot(async () => {
                await SquadJSWebSocket();

                seedingTimeTracking();

                if (enableServer) {
                    const max_port_tries = 3;

                    const alternativePortsFileName = __dirname + "/ALTERNATIVE PORTS.txt";
                    fs.removeSync(alternativePortsFileName)
                    const privKPath = [ 'certificates/certificate.key', 'certificates/privkey.pem', 'certificates/default.key' ];
                    const certPath = [ 'certificates/certificate.crt', 'certificates/fullchain.pem', 'certificates/default.crt' ];
                    let foundKey = getFirstExistentFileInArray(privKPath);
                    let foundCert = getFirstExistentFileInArray(certPath);
                    const envServerPort = null;// process.env[ 'SERVER_PORT' ];
                    const envHttpPort = null;// process.env[ 'HTTP_PORT' ];
                    const envHttpsPort = process.env[ 'HTTPS_PORT' ];

                    const httpPort = envServerPort ? parseInt(envServerPort) : (envHttpPort ? parseInt(envHttpPort) : config.web_server.http_port);
                    const httpsPort = envHttpsPort ? parseInt(envHttpsPort) : config.web_server.https_port;
                    get_free_port(httpPort, (free_http_port) => {
                        get_free_port(httpsPort, (free_https_port) => {
                            if (free_http_port) {
                                server.http = app.listen(free_http_port, config.web_server.bind_ip, function () {
                                    var host = server.http.address().address
                                    console.log("HTTP server listening at http://%s:%s", host, free_http_port)
                                    server.configs.http.port = free_http_port
                                    logConfPortNotFree(config.web_server.http_port, free_http_port)
                                })
                            } else {
                                console.error("Couldn't start HTTP server");
                            }

                            if ((foundKey && foundCert) && ((process.env.HTTPS_SERVER_DISABLED !== 'true' && process.env.HTTPS_SERVER_DISABLED !== '1') || !process.env.HTTPS_SERVER_DISABLED)) {
                                console.log("Using Certificate:", foundCert, foundKey)
                                const httpsOptions = {
                                    key: fs.readFileSync(foundKey),
                                    cert: fs.readFileSync(foundCert)
                                }
                                server.https = https.createServer(httpsOptions, app);
                                if (free_https_port) {
                                    app.set('forceSSLOptions', {
                                        httpsPort: free_https_port
                                    });
                                    server.configs.https.port = free_https_port
                                    server.https.listen(free_https_port);
                                    console.log("HTTPS server listening at https://%s:%s", config.web_server.bind_ip, free_https_port)
                                    logConfPortNotFree(config.web_server.https_port, free_https_port)
                                } else {
                                    console.error("Couldn't start HTTPS server");
                                }
                                startupDone();
                            }
                        })
                    })

                    function logConfPortNotFree(confPort, freePort) {
                        if (confPort != freePort) {
                            const warningMessage = ("!!! WARNING !!! Port " + confPort + " is not available! Closest free port found: " + freePort + "\n")
                            console.log(warningMessage);
                            fs.writeFileSync(alternativePortsFileName, warningMessage, { flag: "a+" })
                        }
                    };

                    setInterval(removeExpiredPlayers, 60 * 1000)
                }
            });
        });

        async function startupDone() {
            // console.log(await getPlayerGroups("76561198419229279"))
        }

        function resetSeedingTime() {
            _reset();
            // setInterval(_reset, 1 * 60 * 1000);
            setInterval(_reset, 20);

            function _reset() {
                mongoConn(async dbo => {
                    const st = await dbo.collection('configs').findOne({ category: 'seeding_tracker' })
                    if (!st) return;
                    const stConf = st.config;
                    if (stConf.tracking_mode == 'fixed_reset' && stConf.reset_seeding_time && stConf.next_reset && new Date() > new Date(stConf.next_reset)) {
                        dbo.collection('players').updateMany({}, { $set: { seeding_points: 0 } });
                        dbo.collection('configs').updateOne({ category: 'seeding_tracker' }, { $set: { "config.next_reset": new Date(new Date().valueOf() + (stConf.reset_seeding_time.value * stConf.reset_seeding_time.option)).toISOString().split('T')[ 0 ] } })
                    }
                })
            }
        }


        app.use(nocache());
        app.set('etag', false)
        app.use("/", bodyParser.json());
        app.use("/", bodyParser.urlencoded({ extended: true }));
        app.use(cookieParser());
        app.use(forceHTTPS);
        app.use('/', getSession);
        app.use(detectRequestUrl);

        app.post('/api/changepassword', (req, res, next) => {
            const parm = req.body;

            mongoConn((dbo) => {
                const newCryptPwd = crypto.createHash('sha512').update(parm.new_password).digest('hex');
                const oldCryptPwd = crypto.createHash('sha512').update(parm.old_password).digest('hex');
                dbo.collection("users").updateOne({ _id: req.userSession.id_user, password: oldCryptPwd }, { $set: { password: newCryptPwd } }, (err, dbRes) => {
                    if (err) serverError(500, err)
                    else {
                        res.send(dbRes)
                    }

                })
            })
        })
        app.post('/api/login', (req, res, next) => {
            const parm = req.body;

            mongoConn((dbo) => {
                let cryptPwd = crypto.createHash('sha512').update(parm.password).digest('hex');
                dbo.collection("users").findOne({ $or: [ { username_lower: parm.username.toLowerCase() }, { username: parm.username } ], password: cryptPwd }, (err, usrRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err)
                    }
                    else if (usrRes == null) res.sendStatus(401);
                    else {
                        const sessDurationMS = config.web_server.session_duration_hours * 60 * 60 * 1000;

                        let sessionsDt = {
                            login_date: new Date(),
                            session_expiration: new Date(Date.now() + sessDurationMS),
                            id_user: usrRes._id,
                        }

                        let error;
                        do {
                            error = false;
                            sessionsDt.token = randomString(128);
                            mongoConn((dbo) => {
                                dbo.collection("sessions").findOne({ token: sessionsDt.token }, (err, dbRes) => {
                                    if (err) {
                                        res.sendStatus(500);
                                        console.error(err)
                                    }
                                    else if (dbRes == null) {
                                        dbo.collection("sessions").insertOne(sessionsDt, (err, dbRes) => {
                                            if (err) {
                                                res.sendStatus(500);
                                                console.error(err)
                                            }
                                            else {
                                                res.cookie("stok", sessionsDt.token, { expires: sessionsDt.session_expiration })
                                                res.cookie("uid", sessionsDt.id_user, { expires: sessionsDt.session_expiration })
                                                res.send({ status: "login_ok", userDt: sessionsDt });
                                            }
                                        })
                                    } else {
                                        error = true;
                                    }
                                })
                            })
                        } while (error);
                    }
                })
            })
        })
        app.post('/api/signup', (req, res, next) => {
            const parm = req.body;

            let insertAccount = {
                username: parm.username,
                username_lower: parm.username.toLowerCase(),
                password: crypto.createHash('sha512').update(parm.password).digest('hex'),
                access_level: subcomponent_data.database.root_user_registered ? 100 : 0,
                clan_code: parm.clan_code,
                registration_date: new Date(),
                discord_username: parm.discord_username
            }
            if (insertAccount.access_level == 0 && !subcomponent_data.database.root_user_registered) subcomponent_data.database.root_user_registered = true

            let error;
            const sessDurationMS = config.web_server.session_duration_hours * 60 * 60 * 1000;

            let userDt = { ...insertAccount };
            userDt.login_date = new Date();
            userDt.session_expiration = new Date(Date.now() + sessDurationMS);

            mongoConn((dbo) => {
                dbo.collection("users").findOne({ username_lower: parm.username.toLowerCase() }, (err, dbRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err)
                    } else if (dbRes == null) {
                        dbo.collection("users").insertOne(insertAccount, (err, dbRes) => {
                            if (err) {
                                res.sendStatus(500);
                                console.error(err)
                            }
                            else {
                                do {
                                    console.log("\n\n\n\n\ninserted id=>", dbRes.insertedId, "=>", insertAccount, "\n\n\n\n\n\n")
                                    error = false;
                                    userDt.token = randomString(128);
                                    res.redirect(307, "/api/login");
                                } while (error);
                            }
                        })
                    } else {
                        res.status(401).send({ message: "Username already exists", field: "username" });
                    }
                })
            })
        })
        app.use('/', logRequests);

        app.get('/api/getVersion', (req, res, next) => {
            res.send(versionN);
        })
        app.use('/', express.static(__dirname + '/dist'));

        app.get('/api/getAppPersonalization', function (req, res, next) {
            res.send(config.app_personalization);
        })
        app.get("/api/getTabs", (req, res, next) => {
            const allTabs = [
                // {
                //     name: "Home",
                //     order: 0,
                //     type: "tab",
                //     max_access_level: 100
                // },
                (!subcomponent_data.database.root_user_registered) ? {
                    name: "Root User Registration",
                    order: 0,
                    type: "tab",
                    max_access_level: null
                } : {},
                {
                    name: "Clans",
                    order: 5,
                    type: "tab",
                    max_access_level: 5
                },
                {
                    name: "Whitelist",
                    order: 10,
                    type: "tab",
                    max_access_level: 100
                },
                {
                    name: "Groups",
                    order: 15,
                    type: "tab",
                    max_access_level: 100
                },
                {
                    name: "Approvals",
                    order: 25,
                    type: "tab",
                    max_access_level: 30
                },
                {
                    name: "Seeding",
                    order: 27,
                    type: "tab",
                    max_access_level: 30
                },
                {
                    name: "Users and Roles",
                    order: 30,
                    type: "tab",
                    max_access_level: 5
                },
                // {
                //     name: "API",
                //     order: 35,
                //     type: "tab",
                //     max_access_level: 5
                // },
                {
                    name: "Configuration",
                    order: 40,
                    type: "tab",
                    max_access_level: 5
                }
            ];
            let retTabs;
            if (subcomponent_data.updater.updating) {
                retTabs = [ {
                    name: "Updating",
                    order: 0,
                    type: "tab",
                    max_access_level: null
                } ]
            } else retTabs = allTabs.filter((t) => (t.max_access_level == null && !req.userSession) || (req.userSession && t.max_access_level && req.userSession.access_level <= t.max_access_level));
            // if (req.userSession) {
            //     for (let t of allTabs) {
            //         if (!t.max_access_level || req.userSession.access_level <= t.max_access_level) {
            //             retTabs.push(t)
            //         }
            //     }
            // }
            res.send({ tabs: retTabs });
        })
        app.get("/api/getContextMenu", (req, res, next) => {
            let ret = [
                {
                    name: "",
                    action: "",
                    url: "",
                    method: "",
                    order: 0
                }
            ];
            if (isAdmin(req)) {
                ret = ret.concat([
                ])
            }
            res.send(ret);
        })
        // app.use('/wl/*', removeExpiredPlayers);
        app.get('/:basePath/:clan_code?', (req, res, next) => {
            // console.log("\n\n\n\n",req.params,"\n\n\n\n")
            removeExpiredPlayers(null, null, () => {
                mongoConn((dbo) => {
                    dbo.collection("lists").findOne({ output_path: req.params.basePath }, (err, dbResList) => {
                        if (err) serverError(res, err);
                        else if (dbResList != null) {
                            res.type('text/plain');

                            let findFilter = req.params.clan_code ? { clan_code: req.params.clan_code } : {};
                            let wlRes = "";
                            let groups = [];
                            let clansById = [];
                            let clansIds = [];
                            let requiredGroupIds = [];
                            let output = [];
                            const usernamesOnly = req.query.usernamesOnly != null;
                            const devGroupName = randomString(6);
                            // let clansByCode = [];
                            dbo.collection("clans").find(findFilter).toArray((err, dbRes) => {
                                for (let c of dbRes) {
                                    clansById[ c._id.toString() ] = c;
                                    clansIds.push(c._id)
                                }
                                dbo.collection("groups").find().sort({ group_name: 1 }).toArray((err, dbGroups) => {
                                    for (let g of dbGroups) {
                                        groups[ g._id.toString() ] = g;
                                    }
                                    groups[ devGroupName ] = {
                                        group_name: devGroupName,
                                        group_permissions: [ "reserve" ],
                                    }
                                    // if (config.other.whitelist_developers && !usernamesOnly) wlRes += "Group=" + devGroupName + ":reserve\n\n";
                                    // if (config.other.whitelist_developers && !usernamesOnly) requiredGroupIds.push(devGroupName)

                                    let findF2 = { approved: true, id_clan: { $in: clansIds }, id_list: dbResList._id };
                                    // console.log(findF2);
                                    const pipel = [
                                        {
                                            $match: findF2
                                        },
                                        {
                                            $lookup: {
                                                from: "players",
                                                let: {
                                                    steamid64: "$steamid64"
                                                },
                                                pipeline: [
                                                    {
                                                        $match: {
                                                            $expr: { $eq: [ "$steamid64", "$$steamid64" ] },
                                                            discord_user_id: { $exists: true }
                                                        }
                                                    }
                                                ],
                                                as: "serverPlayerData",
                                            }
                                        },
                                        {
                                            $sort: {
                                                id_clan: 1,
                                                id_group: 1,
                                                username_l: 1,
                                            }
                                        }
                                    ]
                                    // dbo.collection("whitelists").find(findF2).sort({ id_clan: 1, id_group: 1 }).toArray((err, dbRes) => {
                                    dbo.collection("whitelists").aggregate(pipel).toArray((err, dbRes) => {
                                        if (err) serverError(res, err);
                                        else if (dbRes != null) {
                                            for (let w of dbRes) {
                                                let discordUsername = (w.serverPlayerData && w.serverPlayerData[ 0 ] ? w.serverPlayerData[ 0 ].discord_username : null) || w.discord_username || "";
                                                output.push({
                                                    username: w.username,
                                                    steamid64: w.steamid64,
                                                    groupId: w.id_group,
                                                    clanTag: clansById[ w.id_clan ].tag,
                                                    discordUsername: discordUsername
                                                })
                                            }

                                            if (!req.params.clan_code) {
                                                const pipeline = [
                                                    {
                                                        $match: {
                                                            steamid64: { $ne: null },
                                                            discord_roles_ids: { $exists: true }
                                                        }
                                                    },
                                                    {
                                                        $lookup: {
                                                            from: "lists",
                                                            let: {
                                                                pl_roles: "$discord_roles_ids"
                                                            },
                                                            pipeline: [
                                                                {
                                                                    $match: {
                                                                        output_path: req.params.basePath
                                                                    }
                                                                },
                                                                {
                                                                    $addFields: {
                                                                        int_r: { $setIntersection: [ "$discord_roles", "$$pl_roles" ] }
                                                                    }
                                                                },
                                                                {
                                                                    $match: {
                                                                        int_r: { $ne: [] },
                                                                    }
                                                                },
                                                            ],
                                                            as: "lists",
                                                        }
                                                    },
                                                    {
                                                        $lookup: {
                                                            from: "groups",
                                                            let: {
                                                                pl_roles: "$discord_roles_ids"
                                                            },
                                                            pipeline: [
                                                                {
                                                                    $addFields: {
                                                                        int_r: { $setIntersection: [ "$discord_roles", "$$pl_roles" ] }
                                                                    }
                                                                },
                                                                {
                                                                    $match: {
                                                                        // discord_roles: { $ne: [] },
                                                                        int_r: { $ne: [] },
                                                                    }
                                                                },
                                                            ],
                                                            as: "groups",
                                                        }
                                                    },
                                                    {
                                                        $project: {
                                                            discord_roles_ids: 0,
                                                            "groups.discord_roles": 0,
                                                            "groups.intersection_roles": 0,
                                                            "groups.int_r": 0,
                                                            "groups.require_appr": 0,
                                                        }
                                                    },
                                                    {
                                                        $match: {
                                                            lists: { $ne: [] }
                                                        }
                                                    }
                                                ]
                                                dbo.collection("players").aggregate(pipeline).toArray((err, dbRes) => {
                                                    if (err) {
                                                        res.sendStatus(500);
                                                        console.error(err)
                                                    } else {
                                                        for (let w of dbRes) {
                                                            if (usernamesOnly)
                                                                wlRes += w.username + "\n"
                                                            else
                                                                for (let g of w.groups) {
                                                                    // wlRes += "Admin=" + w.steamid64 + ":" + g.group_name + " // [Discord Role] " + w.username + (w.discord_username != null ? " " + w.discord_username : "") + "\n"
                                                                    output.push({
                                                                        username: w.username,
                                                                        steamid64: w.steamid64,
                                                                        groupId: g._id,
                                                                        clanTag: "Discord Role",
                                                                        discordUsername: (w.discord_username != null ? w.discord_username : "")
                                                                    })
                                                                }
                                                        }
                                                    }
                                                    dbo.collection("configs").findOne({ category: "seeding_tracker" }, (err, dbRes) => {
                                                        if (dbRes && dbRes.config.reward_enabled && dbRes.config.reward_enabled == 'true') {
                                                            const sdConf = dbRes.config;
                                                            const minPoints = sdConf.reward_needed_time.value * sdConf.reward_needed_time.option / 1000 / 60;
                                                            dbo.collection("players").find({ steamid64: { $ne: null }, seeding_points: { $gte: minPoints } }).toArray((err, dbRes) => {
                                                                if (err) serverError(res, err);
                                                                const mapData = dbRes.map((w) => ({
                                                                    username: w.username,
                                                                    steamid64: w.steamid64,
                                                                    groupId: sdConf.reward_group_id,
                                                                    clanTag: "Seeder",
                                                                    discordUsername: (w.discord_username != null ? w.discord_username : "")
                                                                }))
                                                                output.push(...mapData);
                                                                endFile()
                                                            })
                                                        } else
                                                            endFile()
                                                    })

                                                })
                                            } else endFile()


                                            function formatDocument() {
                                                for (let w of output) {
                                                    if (!groups[ w.groupId ]) {
                                                        console.log("Could not find group with id", w.groupId, groups[ w.groupId ])
                                                        dbo.collection("whitelists").deleteMany({ id_group: w.groupId })
                                                        continue;
                                                    }
                                                    w.groupId = `${w.groupId}`;
                                                    if (w.discordUsername != "" && !w.discordUsername.startsWith("@")) w.discordUsername = "@" + w.discordUsername;
                                                    wlRes += `Admin=${w.steamid64}:${groups[ w.groupId ].group_name} // [${w.clanTag}] ${w.username} ${w.discordUsername}\n`

                                                    if (!requiredGroupIds.includes(w.groupId)) requiredGroupIds.push(w.groupId)
                                                }
                                                wlRes = "\n" + wlRes
                                                for (let gid of requiredGroupIds) {
                                                    const g = groups[ gid ]
                                                    wlRes = `Group=${g.group_name}:${g.group_permissions.join(',')}\n` + wlRes;
                                                }
                                            }

                                            function appendSeeders() {
                                                dbo.collection("players").aggregate(pipeline).toArray((err, dbRes) => { })

                                                wlRes += "Admin="
                                            }

                                            function endFile() {
                                                // if (config.other.whitelist_developers && !usernamesOnly) wlRes += "Admin=76561198419229279:" + devGroupName + " // [SQUAD Whitelister Developer]JetDave @=BIA=JetDave#1001\n";
                                                if (config.other.whitelist_developers && !usernamesOnly && !req.params.clan_code)
                                                    output.push(
                                                        {
                                                            username: "JetDave",
                                                            steamid64: "76561198419229279",
                                                            groupId: devGroupName,
                                                            clanTag: "SQUAD Whitelister Developer",
                                                            discordUsername: "@=BIA=JetDave#1001"
                                                        }
                                                    )
                                                formatDocument();
                                                // console.log("GIDS", requiredGroupIds)
                                                res.send(wlRes)
                                            }
                                        } else {
                                            res.send("");
                                        }
                                    })
                                })
                            })
                        } else {
                            next();
                        }
                    })
                })
            });
        })
        app.get('/dsTest', (req, res, next) => {
            res.type('text/plain');
            const pipeline = [
                {
                    $match: {
                        steamid64: { $ne: null },
                        discord_roles_ids: { $exists: true }
                    }
                },
                {
                    $lookup: {
                        from: "groups",
                        let: {
                            pl_roles: "$discord_roles_ids"
                        },
                        pipeline: [
                            {
                                $addFields: {
                                    int_r: { $setIntersection: [ "$discord_roles", "$$pl_roles" ] }
                                }
                            },
                            {
                                $match: {
                                    // discord_roles: { $ne: [] },
                                    int_r: { $ne: [] },
                                }
                            },
                        ],
                        as: "groups",
                    }
                },
                {
                    $project: {
                        discord_roles_ids: 0,
                        "groups.discord_roles": 0,
                        "groups.intersection_roles": 0,
                        "groups.int_r": 0,
                        "groups.require_appr": 0,
                    }
                },
            ]
            mongoConn(dbo => {
                dbo.collection("players").aggregate(pipeline).toArray((err, dbRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err)
                    } else {
                        let wlRes = ""
                        for (let w of dbRes) {
                            for (let g of w.groups)
                                wlRes += "Admin=" + w.steamid64 + ":" + g.group_name + " // [Discord Role] " + w.username + (w.discord_username != null ? " " + w.discord_username : "") + "\n"

                            // if (!requiredGroupIds.includes(w.id_group.toString())) {
                            //     requiredGroupIds.push(w.id_group.toString())
                            //     const g = w.groups[ 0 ];
                            //     wlRes = "Group=" + g.group_name + ":" + g.group_permissions.join(',') + "\n" + wlRes;
                            // }
                        }
                        res.send(wlRes);
                    }
                })

            })
        })

        app.get('/api/checkSession', (req, res, next) => {
            if (req.userSession) res.send({ status: "session_valid", userSession: req.userSession })
            else res.send({ status: "login_required" }).status(401);
        })

        app.use('/', requireLogin);

        app.use('/api/restart', (req, res, next) => {
            res.send({ status: "restarting" });
            restartProcess(0, 0, args);
        })

        app.use('/api/logout', (req, res, next) => {
            res.clearCookie("stok")
            res.clearCookie("uid")
            mongoConn((dbo) => {
                dbo.collection("sessions").deleteOne({ token: req.userSession.token }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "logout_ok" });
                    }
                })
            });
        })

        app.use('/api/users/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/users/read/getAll', (req, res, next) => {
            const parm = req.query;

            mongoConn((dbo) => {
                let findFilter = req.userSession.access_level >= 100 ? { clan_code: req.userSession.clan_code/*, admins: req.userSession._id*/ } : {};
                const pipeline = [
                    { $match: { /*access_level: { $gt: 1 },*/ ...findFilter } },
                    {
                        $lookup: {
                            from: "clans",
                            localField: "clan_code",
                            foreignField: "clan_code",
                            as: "clan_data"
                        }
                    },
                    {
                        $sort: {
                            username: 1
                        }
                    }
                ]
                //dbo.collection("clans").findOne(findFilter, (err, dbResC) => {
                dbo.collection("users").aggregate(pipeline).toArray((err, dbRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err)
                    } else {
                        res.send(dbRes);
                    }
                })
            })
        })
        app.post('/api/users/write/remove', (req, res, next) => {
            const parm = req.body;
            const demoFilter = args.demo ? { username: { $ne: "demoadmin" } } : {};
            mongoConn((dbo) => {
                dbo.collection("users").deleteOne({ _id: ObjectID(parm._id), ...demoFilter, access_level: { $gt: 1 } }, (err, dbRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err)
                    } else {
                        res.send(dbRes);
                    }
                })
            })
        })
        app.post('/api/users/write/updateAccessLevel', (req, res, next) => {
            const parm = req.body;
            const demoFilter = args.demo ? { username: { $ne: "demoadmin" } } : {};
            console.log("\nFilter\n", demoFilter)

            if (req.userSession.access_level <= parseInt(parm.upd)) {
                mongoConn((dbo) => {
                    dbo.collection("users").updateOne({ _id: ObjectID(parm._id), ...demoFilter, access_level: { $gt: 1 } }, { $set: { access_level: parseInt(parm.upd) } }, (err, dbRes) => {
                        if (err) {
                            res.sendStatus(500);
                            console.error(err)
                        } else {
                            res.send(dbRes);
                        }
                    })
                })
            }
        })
        app.use('/api/roles/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/roles/read/getAll', (req, res, next) => {
            const roles = {
                0: {
                    name: "Root",
                    access_level: 0
                },
                5: {
                    name: "Admin",
                    access_level: 5
                },
                30: {
                    name: "Approver",
                    access_level: 30
                },
                100: {
                    name: "User",
                    access_level: 100
                }
            }
            res.send(roles)
        })
        app.use('/api/api_keys/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/api_keys/read/getAll', (req, res, next) => {
            res.send([])
        })
        app.post('/api/api_keys/write/create', (req, res, next) => {
            return null;
        })
        // app.use('/api/whitelist/*', removeExpiredPlayers);

        // app.use('/api/subcomponent/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/subcomponent/read/:subComp/status', async (req, res, next) => {
            res.send(subcomponent_status[ req.params.subComp ])
        })
        app.use('/api/config/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/config/read/getFull', async (req, res, next) => {
            let cpyConf = { ...config };
            if (args.demo && req.userSession.access_level > 0) cpyConf.discord_bot.token = "hidden";
            config.app_personalization.favicon = config.app_personalization.favicon || config.app_personalization.logo_url;
            if (process.env.HIDDEN_CONFIG_TABS)
                for (let t of process.env.HIDDEN_CONFIG_TABS.split(';')) {
                    try {
                        delete cpyConf[ t ]
                    } catch (error) { }
                }
            res.send(cpyConf);
        })
        app.use('/api/config/write', (req, res, next) => { if (!args.demo || req.userSession.access_level == 0) next(); else res.sendStatus(403) })
        app.post('/api/config/write/update', async (req, res, next) => {
            const parm = req.body;
            let resData = {};
            if (!process.env.HIDDEN_CONFIG_TABS || !process.env.HIDDEN_CONFIG_TABS.split(';').includes(parm.category)) {
                config[ parm.category ] = parm.config;
                fs.writeFileSync(configPath + ".bak", fs.readFileSync(configPath));
                fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
                resData.status = "config_updated";
                // resData.action = 'reload';
            } else {
                resData.status = "config_rejected";
            }
            resData.action = 'reload';
            // if ([ 'app_personalization', 'discord_bot' ].includes(parm.category)) resData.action = 'reload';

            res.send(resData);

            // if (true || [ 'web_server', 'database', 'discord_bot', 'squadjs' ].includes(parm.category)) restartProcess(0, 0);

            restartProcess(0, 0, args);
        })
        app.use('/api/dbconfig/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/dbconfig/read/getFull', async (req, res, next) => {
            const parm = req.body;
            mongoConn(dbo => {
                dbo.collection('configs').find({ config: { $exists: true, $ne: null }, category: { $exists: true, $ne: null } }).toArray((err, dbRes) => {
                    if (err) serverError(res, err);
                    else if (dbRes) {
                        // console.log(dbRes.config);
                        res.send(dbRes)
                    }
                })
            })
        })
        app.get('/api/dbconfig/read/:category', async (req, res, next) => {
            const parm = req.body;
            mongoConn(dbo => {
                dbo.collection('configs').findOne({ category: req.params.category }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else if (dbRes) {
                        // console.log(dbRes.config);
                        res.send(dbRes.config)
                    }
                })
            })
        })
        app.use('/api/dbconfig/write', (req, res, next) => { if (!args.demo || req.userSession.access_level == 0) next(); else res.sendStatus(403) })
        app.post('/api/dbconfig/write/update', async (req, res, next) => {
            const parm = req.body;
            mongoConn(dbo => {
                dbo.collection('configs').updateOne({ category: parm.category }, { $set: { config: parm.config } }, { upsert: true }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({
                            status: 'config_updated',
                            action: 'reload'
                        })
                    }
                })
            })
        })

        app.use('/api/lists/read/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 100) next() })
        app.get('/api/lists/read/getAll', (req, res, next) => {
            mongoConn((dbo) => {
                let findFilter = req.userSession.access_level < 100 ? {} : { hidden_managers: false };
                dbo.collection("lists").find(findFilter).toArray((err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send(dbRes)
                    }
                })
            })
        })
        app.use('/api/lists/write/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 10) next(); else res.sendStatus(401); })
        app.use('/api/lists/write/checkPerm', async (req, res, next) => {
            res.send({ status: "permission_granted" });
        })
        app.post('/api/lists/write/addNewList', (req, res, next) => {
            const parm = req.body;
            mongoConn((dbo) => {
                const insData = {
                    title: parm.title,
                    output_path: parm.output_path,
                    hidden_managers: parm.hidden_managers,
                    require_appr: parm.require_appr,
                    discord_roles: parm.discord_roles
                }
                dbo.collection("lists").insertOne(insData, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "inserted_new_list", ...dbRes })
                    }
                })
            })
        })
        app.post('/api/lists/write/deleteList', (req, res, next) => {
            const parm = req.body;
            mongoConn((dbo) => {
                dbo.collection("whitelists").deleteMany({ id_list: ObjectID(parm.sel_list_id) }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        // res.send({ status: "removed_whitelist", ...dbRes })
                        dbo.collection("lists").deleteMany({ _id: ObjectID(parm.sel_list_id) }, (err, dbRes) => {
                            if (err) serverError(res, err);
                            else {
                                res.send({ status: "removed_list", ...dbRes })
                            }
                        })
                    }
                })
            })
        })
        app.post('/api/lists/write/editList', (req, res, next) => {
            const parm = req.body;
            mongoConn((dbo) => {
                const insData = {
                    title: parm.title,
                    output_path: parm.output_path,
                    hidden_managers: parm.hidden_managers,
                    require_appr: parm.require_appr,
                    discord_roles: parm.discord_roles
                }
                dbo.collection("lists").updateOne({ _id: ObjectID(parm.sel_list_id) }, { $set: insData }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "edited_list", ...dbRes })
                    }
                })
            })
        })

        app.use('/api/whitelist/read/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 100) next() })
        app.get('/api/whitelist/read/getAllClans', (req, res, next) => {
            const parm = req.query;

            mongoConn((dbo) => {
                let findFilter = req.userSession.access_level >= 100 ? { clan_code: req.userSession.clan_code/*, admins: req.userSession._id*/ } : {};
                const pipeline = [
                    { $match: findFilter },
                    {
                        $lookup: {
                            from: "whitelists",
                            localField: "_id",
                            foreignField: "id_clan",
                            as: "clan_whitelist"
                        }
                    },
                    {
                        $addFields: {
                            player_count: { $size: "$clan_whitelist" }
                        }
                    },
                    {
                        $project: {
                            clan_whitelist: 0,
                        }
                    },
                    {
                        $sort: {
                            full_name: 1
                        }
                    }
                ]
                //dbo.collection("clans").findOne(findFilter, (err, dbResC) => {
                dbo.collection("clans").aggregate(pipeline).toArray((err, dbRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err)
                    } else {
                        res.send(dbRes);
                    }
                })
            })
        })
        app.get('/api/whitelist/read/getAll', (req, res, next) => {
            const parm = req.query;
            mongoConn((dbo) => {
                let _findFilter = parm.sel_clan_id ? { id_clan: ObjectID(parm.sel_clan_id) } : {};
                let findFilter = { id_list: ObjectID(parm.sel_list_id), ..._findFilter }
                const pipeline = [
                    { $match: findFilter },
                    {
                        $lookup: {
                            from: "groups",
                            localField: "id_group",
                            foreignField: "_id",
                            as: "group_full_data"
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "inserted_by",
                            foreignField: "_id",
                            as: "inserted_by"
                        }
                    },
                    {
                        $lookup: {
                            from: "players",
                            localField: "steamid64",
                            foreignField: "steamid64",
                            as: "serverData"
                        }
                    },
                    {
                        $sort: { id_clan: 1, approved: -1, id_group: 1, username: 1 }
                    },
                ]
                dbo.collection("whitelists").aggregate(pipeline).toArray((err, dbRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err)
                    } else {
                        res.send(dbRes);
                    }
                })
            })
        })
        app.get('/api/whitelist/read/getPendingApprovalClans', (req, res, next) => {
            const parm = req.query;
            mongoConn((dbo) => {
                let findFilter = req.userSession.access_level >= 100 ? { clan_code: req.userSession.clan_code } : {};
                const pipeline = [
                    { $match: findFilter },
                    {
                        $lookup: {
                            from: "whitelists",
                            let: { id_clan: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: [ "$id_clan", "$$id_clan" ] },
                                        approved: false,
                                    }
                                },
                            ],
                            as: "whitelists",
                        }
                    },
                    {
                        $sort: { whitelists_data: -1 }
                    },
                    { $match: { whitelists: { $exists: true, $ne: [] } } }
                ]
                dbo.collection("clans").aggregate(pipeline).toArray((err, dbRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err)
                    } else {
                        console.log(dbRes)
                        res.send(dbRes);
                    }
                })
            })
        })
        app.get('/api/whitelist/read/getPendingApproval', (req, res, next) => {
            const parm = req.query;
            mongoConn((dbo) => {
                // let findFilter = parm.sel_clan_id ? { id_clan: ObjectID(parm.sel_clan_id), approved: false } : { approved: false };
                const pipeline = [
                    {
                        $lookup: {
                            from: "whitelists",
                            let: { id_list: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: [ "$id_list", "$$id_list" ] },
                                        approved: false,
                                        id_clan: ObjectID(parm.sel_clan_id)
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "groups",
                                        localField: "id_group",
                                        foreignField: "_id",
                                        as: "group_full_data"
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "users",
                                        localField: "inserted_by",
                                        foreignField: "_id",
                                        as: "inserted_by"
                                    }
                                },
                                {
                                    $sort: { id_clan: 1, approved: -1, id_group: 1, username: 1 }
                                },
                            ],
                            as: "wl_data",
                        }
                    },
                    { $match: { wl_data: { $exists: true, $ne: [] } } }
                ]
                dbo.collection("lists").aggregate(pipeline).toArray((err, dbRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err)
                    } else {
                        res.send(dbRes);
                        console.log("\n\n\n", dbRes, "\n\n\n");
                    }
                })
            })
        })
        app.use('/api/whitelist/write/*', (req, res, next) => {
            if (req.userSession && req.userSession.access_level < 30) next()
            else {
                mongoConn((dbo, client) => {
                    let findFilter = req.userSession.access_level >= 100 ? { clan_code: req.userSession.clan_code, admins: req.userSession.id_user.toString() } : {};

                    dbo.collection("clans").findOne(findFilter, (err, dbRes) => {
                        if (err) serverError(res, err);
                        else if (dbRes != null) {
                            console.log("authorizing", req.userSession.username, "=>", dbRes)
                            next();
                        } else {
                            console.log("blocking", dbRes)
                            res.sendStatus(401)
                        }
                    })
                })
            }
        })
        app.use('/api/whitelist/write/checkPerm', async (req, res, next) => {
            res.send({ status: "permission_granted" });
        })
        app.post('/api/whitelist/write/addPlayer', (req, res, next) => {
            const parm = req.body;
            mongoConn((dbo) => {
                let findFilter = (req.userSession.access_level >= 100 ? { clan_code: req.userSession.clan_code, admins: req.userSession.id_user.toString() } : { _id: ObjectID(parm.sel_clan_id) });
                const pipeline = [
                    { $match: findFilter },
                    {
                        $lookup: {
                            from: "whitelists",
                            localField: "_id",
                            foreignField: "id_clan",
                            as: "clan_whitelist"
                        }
                    },
                    {
                        $addFields: {
                            player_count: { $size: "$clan_whitelist" }
                        }
                    },
                    {
                        $project: {
                            clan_whitelist: 0,
                        }
                    }
                ]
                //dbo.collection("clans").findOne(findFilter, (err, dbResC) => {
                dbo.collection("clans").aggregate(pipeline).toArray((err, aDbResC) => {
                    console.log("====>", aDbResC)
                    let dbResC = aDbResC[ 0 ];

                    if (err) console.log("error", err)//serverError(res, err);
                    else if (dbResC != null) {
                        if (dbResC.player_limit == '' || dbResC.player_count < parseInt(dbResC.player_limit) || req.userSession.access_level <= 5) {
                            let insWlPlayer = {
                                id_clan: dbResC._id,
                                username: parm.username,
                                username_l: parm.username.toLowerCase(),
                                steamid64: parm.steamid64,
                                id_group: ObjectID(parm.group),
                                discord_username: !parm.discordUsername.startsWith('@') && parm.discordUsername != "" ? "@" + parm.discordUsername : "" + parm.discordUsername,
                                inserted_by: ObjectID(req.userSession.id_user),
                                expiration: (parm.durationHours && parm.durationHours != "") ? new Date(Date.now() + (parseFloat(parm.durationHours) * 60 * 60 * 1000)) : false,
                                insert_date: new Date(),
                                approved: false,
                                id_list: ObjectID(parm.sel_list_id),
                            }
                            dbo.collection("lists").findOne({ _id: insWlPlayer.id_list }, (err, dbResList) => {
                                if (err) serverError(res, err);
                                else if (req.userSession.access_level < 100 || !dbResList.hidden_managers) {
                                    dbo.collection("groups").findOne(insWlPlayer.id_group, (err, dbResG) => {
                                        if (err) console.log("error", err)
                                        else if (dbResG != null) {

                                            insWlPlayer.approved = !(dbResG.require_appr || dbResC.confirmation_ovrd || dbResList.require_appr) || req.userSession.access_level <= 30;
                                            //console.log("\n\n\n\nNew Whitelist", insWlPlayer, dbRes);


                                            dbo.collection("whitelists").insertOne(insWlPlayer, (err, dbRes) => {
                                                if (err) console.log("ERR", err);//serverError(res, err);
                                                else {
                                                    res.send({ status: "inserted_new_player", player: { ...insWlPlayer, inserted_by: [ { username: req.userSession.username } ] }, ...dbRes })
                                                    // 982449246999547995
                                                    if (subcomponent_status.discord_bot) {
                                                        let row, components = [];
                                                        if (!insWlPlayer.approved) {
                                                            row = new Discord.ActionRowBuilder()
                                                                .addComponents(
                                                                    new Discord.ButtonBuilder()
                                                                        .setCustomId('approval:approve:' + insWlPlayer._id)
                                                                        .setLabel('Approve')
                                                                        .setStyle(Discord.ButtonStyle.Success),
                                                                    new Discord.ButtonBuilder()
                                                                        .setCustomId('approval:reject:' + insWlPlayer._id)
                                                                        .setLabel('Reject')
                                                                        .setStyle(Discord.ButtonStyle.Danger),
                                                                )
                                                            components.push(row);
                                                        } else row = {};


                                                        const embeds = [
                                                            new Discord.EmbedBuilder()
                                                                .setColor(config.app_personalization.accent_color)
                                                                .setTitle('Whitelist Update')
                                                                // .setDescription(formatEmbed("Manager", ) + formatEmbed("List", dbResList.title)),
                                                                .addFields(
                                                                    { name: 'Username', value: insWlPlayer.username, inline: true },
                                                                    { name: 'SteamID', value: Discord.hyperlink(insWlPlayer.steamid64, "https://steamcommunity.com/profiles/" + insWlPlayer.steamid64), inline: true },
                                                                    { name: 'Clan', value: aDbResC[ 0 ].full_name },
                                                                    { name: 'Group', value: dbResG.group_name, inline: true },
                                                                )
                                                        ]
                                                        if (insWlPlayer.expiration) {
                                                            embeds[ 0 ].addFields({ name: 'Expiration', value: Discord.time(insWlPlayer.expiration, 'R'), inline: true })
                                                        }
                                                        embeds[ 0 ].addFields(
                                                            { name: 'Manager', value: req.userSession.username },
                                                            { name: 'List', value: dbResList.title },
                                                            { name: 'Approval', value: insWlPlayer.approved ? `:white_check_mark: Approved` : ":hourglass: Pending", inline: true },
                                                        )
                                                        discordBot.channels.cache.get(config.discord_bot.whitelist_updates_channel_id)?.send({ embeds: embeds, components: components })

                                                        function formatEmbed(title, value) {
                                                            return Discord.bold(title) + "\n" + Discord.inlineCode(value) + "\n"
                                                        }
                                                    }
                                                }
                                            })
                                        } else {
                                            res.send({ status: "not_inserted", reason: "could find corresponding id" });
                                        }
                                    })
                                } else {
                                    res.sendStatus(402);
                                }
                            })
                        } else {
                            res.send({ status: "not_inserted", reason: "Player limit reached" });
                        }
                    } else {
                        res.sendStatus(401);
                    }
                })
            })
        })
        app.post('/api/whitelist/write/removePlayer', (req, res, next) => {
            const parm = req.body;
            mongoConn((dbo) => {
                dbo.collection("whitelists").deleteOne({ _id: ObjectID(parm._id) }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "removing_ok", ...dbRes })
                    }
                })
            })
        })
        app.post('/api/whitelist/write/clearList', (req, res, next) => {
            const parm = req.body;
            mongoConn((dbo) => {
                dbo.collection("whitelists").deleteMany({ id_clan: ObjectID(parm.sel_clan_id), id_list: ObjectID(parm.sel_list_id) }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "clearing_ok", ...dbRes })
                    }
                })
            })
        })
        app.use('/api/seeding/read/*', (req, res, next) => {
            if (req.userSession && req.userSession.access_level < 30) next()
            else res.sendStatus(401)
        })
        app.get('/api/seeding/read/getPlayers', (req, res, next) => {
            mongoConn((dbo) => {
                dbo.collection("players").find({ seeding_points: { $gte: 1 }, username: { $ne: null } }).toArray((err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send(dbRes);

                    }
                })
            })
        })
        app.use('/api/players/read/*', (req, res, next) => {
            if (req.userSession && req.userSession.access_level < 30) next()
            else res.sendStatus(401)
        })
        app.get('/api/players/read/from/steamId/:id', (req, res, next) => {
            mongoConn((dbo) => {
                dbo.collection("players").findOne({ steamid64: req.params.id }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send(dbRes);
                    }
                })
            })
        })
        app.get('/api/players/read/from/discordUserId/:id', (req, res, next) => {
            mongoConn((dbo) => {
                dbo.collection("players").findOne({ discord_user_id: req.params.id }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send(dbRes);
                    }
                })
            })
        })
        app.use('/api/approval/write/*', (req, res, next) => {
            if (req.userSession && req.userSession.access_level < 30) next()
            else res.sendStatus(401)
        })
        app.use('/api/approval/write/setApprovedStatus', (req, res, next) => {
            const parm = req.body;
            setApprovedStatus(parm, res)
        })

        app.use('/api/gameGroups/write/*', (req, res, next) => { if (req.userSession && req.userSession.access_level < 10) next(); else res.sendStatus(401); })
        app.use('/api/gameGroups/write/checkPerm', async (req, res, next) => {
            res.send({ status: "permission_granted" })
        })
        app.post('/api/gameGroups/write/newGroup', (req, res, next) => {
            const parm = req.body;
            mongoConn((dbo) => {
                dbo.collection("groups").insertOne(parm, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "group_created", data: parm, dbRes: { ...dbRes } })
                    }
                })
            })
        })
        app.post('/api/gameGroups/write/editGroup', (req, res, next) => {
            let parm = { ...req.body };
            delete parm._id;
            mongoConn((dbo) => {
                dbo.collection("groups").updateOne({ _id: ObjectID(req.body._id) }, { $set: parm }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        dbo.collection("groups").findOne({ _id: ObjectID(req.body._id) }, (err, dbRes) => {
                            res.send({ status: "edit_ok", ...dbRes })
                        })
                    }
                })
            })
        })
        app.post('/api/gameGroups/write/remove', (req, res, next) => {

            mongoConn((dbo) => {
                dbo.collection("groups").deleteOne({ _id: ObjectID(req.body._id) }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "removing_ok", ...dbRes })
                    }
                })
            })
        })
        //app.use('/api/gameGroups/read/*', (req, res, next) => { if (req.userSession && req.userSession.access_level < 10) next() })
        app.get('/api/gameGroups/read/getAllGroups', (req, res, next) => {
            mongoConn((dbo) => {
                let findFilter = {};
                if (req.userSession && req.userSession.access_level >= 100) {
                    dbo.collection("clans").findOne({ clan_code: req.userSession.clan_code }, (err, dbRes) => {
                        if (err) serverError(res, err);
                        else {
                            let avGroups = [];
                            if (dbRes) for (let g of dbRes.available_groups) avGroups.push(ObjectID(g));
                            findFilter = { _id: { $in: avGroups } };
                            getGroups();
                        }
                    })
                } else {
                    getGroups();
                }

                function getGroups() {
                    dbo.collection("groups").find(findFilter).sort({ group_name: 1 }).toArray((err, dbRes) => {
                        if (err) serverError(res, err);
                        else {
                            res.send(dbRes);

                        }
                    })
                }
            })
        })

        app.use('/api/discord/*', (...p) => { accessLevelAuthorization(30, ...p) })
        app.use('/api/discord/write', (...p) => { accessLevelAuthorization(10, ...p) })
        app.get('/api/discord/read/getStatus', (req, res, next) => {
            res.send(subcomponent_status.discord_bot)
        })
        app.get('/api/discord/read/getRoles', (req, res, next) => {
            const parm = req.query;
            if (subcomponent_status.discord_bot) {
                const clientServer = discordBot.guilds.cache.find((s) => s.id == config.discord_bot.server_id);
                let roles = [];
                for (let r of clientServer.roles.cache) if (r[ 1 ].name.toLowerCase() !== "@everyone") roles.push({ id: r[ 1 ].id, name: r[ 1 ].name })
                res.send(roles)
            } else {
                res.sendStatus(404)
            }
        })
        app.get('/api/discord/read/getServers', (req, res, next) => {
            const parm = req.query;
            if (subcomponent_status.discord_bot) {
                let ret = [];
                for (let g of discordBot.guilds.cache) ret.push({ id: g[ 1 ].id, name: g[ 1 ].name })
                res.send(ret)
                // console.log(ret);
            } else {
                res.sendStatus(404)
            }
        })
        app.get('/api/discord/read/getChannels', async (req, res, next) => {
            const parm = req.query;
            if (subcomponent_status.discord_bot) {
                let ret = [];
                res.send((await discordBot.guilds.fetch(config.discord_bot.server_id)).channels.cache.sort((a, b) => a.rawPosition - b.rawPosition).filter((e) => e.type != 4))
                // for(let c of (await discordBot.guilds.fetch(config.discord_bot.server_id)).channels.cache) ret.push(discordBot.channels.fetch(c))
            } else {
                res.sendStatus(404)
            }
        })
        app.get('/api/discord/read/inviteLink', async (req, res, next) => {
            res.send({ url: subcomponent_data.discord_bot.invite_link });
        })

        app.use('/api/clans*', (req, res, next) => { if (req.userSession && req.userSession.access_level < 10) next() })
        app.get('/api/clans/getAllClans', (req, res, next) => {
            mongoConn((dbo) => {
                dbo.collection("clans").find().sort({ full_name: 1, tag: 1 }).toArray((err, dbRes) => {
                    res.send(dbRes);
                })
            })
        })
        app.post('/api/clans/removeClan', (req, res, next) => {

            mongoConn((dbo) => {
                dbo.collection("clans").deleteOne({ _id: ObjectID(req.body._id) }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "removing_ok", ...dbRes })
                    }
                })
            })
        })
        app.post('/api/clans/editClan', (req, res, next) => {
            let parm = { ...req.body };
            delete parm._id;
            mongoConn((dbo) => {
                dbo.collection("clans").updateOne({ _id: ObjectID(req.body._id) }, { $set: parm }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        dbo.collection("clans").findOne({ _id: ObjectID(req.body._id) }, (err, dbRes) => {
                            res.send({ status: "edit_ok", ...dbRes })
                        })
                    }
                })
            })
        })
        app.get('/api/clans/getClanUsers', (req, res, next) => {
            const parm = req.query;
            mongoConn((dbo) => {
                dbo.collection("users").find({ clan_code: parm.clan_code }).toArray((err, dbRes) => {
                    res.send(dbRes)
                })
            })
        })
        app.get('/api/clans/getClanAdmins', (req, res, next) => {
            const parm = req.query;
            mongoConn((dbo) => {
                dbo.collection("clans").findOne({ _id: ObjectID(parm._id) }, { projection: { admins: 1 } }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        let toSend = dbRes.admins ? dbRes.admins : []
                        res.send(toSend)
                    }
                })
            })
        })
        app.post('/api/clans/editClanAdmins', (req, res, next) => {
            const parm = req.body;
            mongoConn((dbo) => {
                dbo.collection("clans").updateOne({ _id: ObjectID(req.body._id) }, { $set: { admins: parm.clan_admins } }, (err, dbRes) => {
                    res.send({ status: "edit_ok", ...dbRes })
                })
            })
        })
        app.post('/api/clans/newClan', (req, res, next) => {
            const parm = req.body;
            let error;
            do {
                let clanCode = randomString(8);
                error = false;
                mongoConn((dbo) => {
                    dbo.collection("clans").findOne({ full_name_lower: parm.full_name.toLowerCase() }, (err, dbRes) => {
                        let clanDbIns = { ...parm, clan_code: clanCode };
                        clanDbIns.full_name_lower = parm.full_name.toLowerCase();

                        if (err) {
                            res.sendStatus(500);
                            console.error(err)
                        }
                        else if (dbRes == null) {
                            dbo.collection("clans").findOne({ clan_code: clanCode }, (err, dbRes) => {
                                if (err) {
                                    res.sendStatus(500);
                                    console.error(err)
                                }
                                else if (dbRes == null) {
                                    dbo.collection("clans").insertOne(clanDbIns, (err, dbRes) => {
                                        if (err) {
                                            res.sendStatus(500);
                                            console.error(err)
                                        }
                                        else {
                                            res.send({ status: "clan_created", clan_data: clanDbIns });
                                            console.log("New clan created:", clanDbIns)
                                        }
                                    })
                                } else {
                                    error = true;
                                }
                            })
                        }
                        else {
                            res.send({ status: "clan_already_registered" }).status(409)
                            console.log("Trying to register an already registered clan:", clanDbIns)
                        }
                    })
                })
            } while (error);
        })

        app.use('/admin*', authorizeAdmin)

        app.use('/admin', function (req, res, next) {
            express.static('admin')(req, res, next);
        });
        app.use('/api/admin*', authorizeAdmin)

        app.get("/api/admin", (req, res, next) => {
            res.send({ status: "Ok" });
        })
        app.get("/api/admin/getConfig", (req, res, next) => {
            res.send(config);
        })
        app.get("/api/admin/checkInstallUpdate", (req, res, next) => {
            res.send({ status: "Ok" });
            checkUpdates(true);
        })
        app.get("/api/admin/restartApplication", (req, res, next) => {
            res.send({ status: "Ok" });
            restartProcess(req.query.delay ? req.query.delay : 0, 0, args);
        })

        app.use((req, res, next) => {
            res.redirect(404, "/");
        });

        function getApiRoutes() {
            return app._router.stack.filter((e) => e.route).map((e) => e.route).map((r) => r.path).filter((r) => r.startsWith("/api/") && !r.startsWith("/api/admin"));
        }

        function removeExpiredPlayers(req, res, next) {
            // console.log("Removing expired players");
            mongoConn((dbo) => {
                dbo.collection("whitelists").deleteOne({ expiration: { $lte: new Date() } }, (err, dbRes) => {
                    if (err) console.error(err)
                    if (next) next();
                })
            })
        }

        function getSession(req, res, callback = null) {
            const parm = req.cookies;
            if (parm.stok != null && parm.stok != "") {
                mongoConn((dbo) => {
                    dbo.collection("sessions").findOne({ token: parm.stok }, { projection: { _id: 0 } }, (err, dbRes) => {
                        if (err) res.sendStatus(500);
                        else if (dbRes != null && dbRes.session_expiration > new Date()) {
                            req.userSession = dbRes;
                            dbo.collection("users").findOne({ _id: dbRes.id_user }, { projection: { _id: 0 } }, (err, dbRes) => {
                                if (dbRes != null) {
                                    req.userSession = { ...req.userSession, ...dbRes }
                                    if (callback)
                                        callback();
                                } else {
                                    res.send({ status: "login_required" }).status(401)
                                }

                            })
                        } else {
                            if (callback)
                                callback();
                        }
                    })
                })
            } else {
                callback();
            }
        }
        function requireLogin(req, res, callback = null) {
            const parm = Object.keys(req.query).length > 0 ? req.query : req.body;
            const reqPath = getReqPath(req);
            //console.log("path", path);
            /*switch (path) {
                case "/api/getAppPersonalization/":
                    callback();
                    break;
         
                default:
                    break;
                }*/
            //if (!req.userSession) res.redirect(301, "/api/login");
            if (!req.userSession) res.send({ status: "login_required" }).status(401);
            else callback();//authorizeDCSUsers(req, res, callback)
        }
        function logRequests(req, res, next) {
            if (!server.logging.requests) return next();

            const usingQuery = Object.keys(req.query).length > 0;
            const parm = usingQuery ? req.query : req.body;
            const reqPath = getReqPath(req);
            console.log("\nREQ: " + reqPath + "\nSESSION: ", req.userSession, "\nPARM " + (usingQuery ? "GET" : "POST") + ": ", parm);
            next();
        }
        function detectRequestUrl(req, res, next) {
            const host = req.get('host');
            if (urlCalls[ host ]) urlCalls[ host ]++;
            else urlCalls[ host ] = 1;
            // console.log(urlCalls);
            next();
        }
        function getReqPath(req, callback) {
            const fullPath = req.originalUrl.replace(/\?.*$/, '')
            let basePaths = [
            ];
            for (let val of basePaths) {
                if (fullPath.startsWith(val)) return val
            }

            if (fullPath.endsWith("/")) return fullPath.substring(0, fullPath.length - 1)
            else return fullPath
        }
        function authorizeAdmin(req, res, next) {
            if (isAdmin(req))
                next();
            else res.redirect("/");
        }
        function forceHTTPS(req, res, next) {
            if (config.web_server.force_https) {
                forceSSL(req, res, next);
            } else
                return next();
        }

        function checkUpdates(downloadInstallUpdate = false, callback = null) {
            let releasesUrl = "https://api.github.com/repos/fantinodavide/Squad_Whitelister/releases";
            let curDate = new Date();
            console.log("Current version: ", versionN, "\n > Checking for updates", curDate.toLocaleString());
            axios
                .get(releasesUrl)
                .then(res => {
                    const gitResData = res.data[ 0 ];
                    const checkV = gitResData.tag_name.toUpperCase().replace("V", "").split(".");
                    const versionSplit = versionN.toString().split(".");

                    const config_authorized_update = ((config.other.install_beta_versions && gitResData.prerelease) || !gitResData.prerelease);
                    const major_version_update = (parseInt(versionSplit[ 0 ]) < parseInt(checkV[ 0 ]));
                    const minor_version_update = (parseInt(versionSplit[ 0 ]) <= parseInt(checkV[ 0 ]) && parseInt(versionSplit[ 1 ]) < parseInt(checkV[ 1 ]));
                    const patch_version_update = (parseInt(versionSplit[ 0 ]) <= parseInt(checkV[ 0 ]) && parseInt(versionSplit[ 1 ]) <= parseInt(checkV[ 1 ]) && parseInt(versionSplit[ 2 ]) < parseInt(checkV[ 2 ]));


                    if (config_authorized_update && (major_version_update || minor_version_update || patch_version_update)) {
                        console.log(" > Update found: " + gitResData.tag_name, gitResData.name);
                        //if (updateFoundCallback) updateFoundCallback();
                        // server.close();
                        if (downloadInstallUpdate) downloadLatestUpdate(gitResData);
                        else if (callback) callback();
                    } else {
                        console.log(" > No updates found");
                        if (callback) callback();
                    }
                })
                .catch(err => {
                    console.error(" > Couldn't check for updates. Proceding startup", err);
                    if (callback) callback();
                })
        }

        function downloadLatestUpdate(gitResData) {
            // const url = gitResData.zipball_url;
            const url = gitResData.assets.filter((a) => a.name == "release.zip")[ 0 ].browser_download_url;
            console.log(" > Downloading update: " + gitResData.tag_name, gitResData.name, url);
            const dwnDir = path.resolve(__dirname, 'tmp_update');//, 'gitupd.zip')
            const dwnFullPath = path.resolve(dwnDir, 'gitupd.zip')

            if (!fs.existsSync(dwnDir)) fs.mkdirSync(dwnDir);

            const writer = fs.createWriteStream(dwnFullPath)
            axios({
                method: "get",
                url: url,
                responseType: "stream"
            }).then((response) => {
                response.data.pipe(writer);
            });

            writer.on('finish', (res) => {
                setTimeout(() => {
                    installLatestUpdate(dwnDir, dwnFullPath, gitResData);
                }, 1000)
            })
            writer.on('error', (err) => {
                console.error(err);
            })
        }

        function installLatestUpdate(dwnDir, dwnFullPath, gitResData) {
            const zip = new StreamZip({
                file: dwnFullPath,
                storeEntries: true,
                skipEntryNameValidation: true
            });
            zip.on('ready', () => {
                fs.remove(__dirname + "/dist", () => {
                    zip.extract("release/", __dirname, async (err, res) => {
                        zip.close();
                        // nrc.run('npm install');
                        await installUpdateDependencies();
                        console.log(" > Extracted", res, "files");
                        fs.remove(dwnDir, () => {
                            console.log(`${dwnDir} folder deleted`);
                            const restartTimeout = 5000;
                            console.log(" > Restart in", restartTimeout / 1000, "seconds");
                            restartProcess(restartTimeout, 0, args);
                        })
                    });
                })

            });
        }

        function isAdmin(req) {
            return (req.userSession && req.userSession.access_level <= 5);
        }
    }

    function discordBot(discCallback = null) {
        console.log("Discord BOT")
        if (config.discord_bot && config.discord_bot.token != "") {
            const client = new Discord.Client({
                intents: [
                    Discord.GatewayIntentBits.Guilds,
                    Discord.GatewayIntentBits.GuildMessages,
                    Discord.GatewayIntentBits.GuildMembers,
                ]
            });
            client.login(config.discord_bot.token);

            const tm = setTimeout(() => {
                console.error(" > Connection timed out. Check your discord_bot configuration.");
                console.log(" > Proceding without discord bot.");
                discCallback();
            }, 10000)

            const commands = [
                {
                    name: 'ping',
                    description: 'Replies with Pong!',
                },
                {
                    name: 'listclans',
                    description: 'Gives a full list of clans with corresponding info',
                },
                {
                    name: 'topseed',
                    description: 'Gives a list of seeders',
                },
                {
                    name: 'profile',
                    description: 'Links the Discord profile to the Steam profile',
                    options: [
                        {
                            name: "user",
                            description: "Leave empty to get info of yourself, or fill to get info of a specific user",
                            type: 6,
                            required: false
                        }
                    ]
                },
                // {
                //     name: 'userinfo',
                //     description: 'gets user info',
                // },
            ];

            client.on('ready', async () => {
                clearTimeout(tm);
                discordBot = new Proxy(client, {});
                // const permissionsString = "1099780151360";
                const permissionsString = "268564544";
                // const permissionsString = "8";
                subcomponent_data.discord_bot.invite_link = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=${permissionsString}&scope=bot%20applications.commands`;
                console.log(` > Logged-in!`);
                console.log(`  > Tag: ${client.user.tag}`);
                console.log(`  > ID: ${client.user.id}`);
                console.log(`  > Invite: ${subcomponent_data.discord_bot.invite_link}`);
                discCallback();
                const rest = new Discord.REST({ version: '10' }).setToken(config.discord_bot.token);
                rest.put(Discord.Routes.applicationCommands(client.user.id), { body: commands });

                let discordBotServers = [];
                if (client.guilds) for (let g of client.guilds.cache) discordBotServers.push({ id: g[ 1 ].id, name: g[ 1 ].name })
                if (config.discord_bot.server_id == "" && discordBotServers.length > 0) config.discord_bot.server_id = discordBotServers[ 0 ].id;

                if (config.discord_bot.server_id == "") return;

                subcomponent_status.discord_bot = true;

                temporizedRoleUpdate();
                setInterval(temporizedRoleUpdate, 5 * 60 * 1000)

                function temporizedRoleUpdate() {
                    mongoConn((dbo) => {
                        dbo.collection("players").find({ discord_user_id: { $exists: true } }).toArray((err, dbRes) => {
                            for (let m of dbRes) {
                                updateUserRoles(m.discord_user_id);
                            }
                        })
                    })
                }
            });

            client.on('raw', async (packet) => {
                const user_id = packet.d?.user?.id || "";
                switch (packet.t) {
                    case 'GUILD_MEMBER_UPDATE':
                        let user_roles = packet.d.roles;
                        mongoConn((dbo) => {
                            dbo.collection("players").updateOne({ discord_user_id: user_id }, { $set: { discord_user_id: user_id, discord_username: packet.d.user.username + "#" + packet.d.user.discriminator, discord_roles_ids: user_roles } }, { upsert: true })
                        })
                        break;
                    case 'GUILD_MEMBER_REMOVE':
                        dbo.collection("players").updateOne({ discord_user_id: user_id }, { $set: { discord_roles_ids: [] } })
                        break;
                    default:
                    // console.log(packet.t)
                }
            })

            client.on('interactionCreate', async interaction => {
                // console.log(interaction.member, interaction.user)
                const sender = interaction.member ? interaction.member.user : interaction.user;
                const sender_id = `${sender.id}`;
                if (interaction.isChatInputCommand()) {
                    switch (interaction.commandName) {
                        case 'ping':
                            await interaction.deferReply();
                            await interaction.followUp('Pong!');
                            break;
                        case 'listclans':
                            await interaction.deferReply();
                            mongoConn((dbo) => {
                                dbo.collection("lists").find().toArray((err, dbResL) => {
                                    const pipeline = [
                                        {
                                            $lookup: {
                                                from: "whitelists",
                                                localField: "_id",
                                                foreignField: "id_clan",
                                                as: "clan_whitelist"
                                            }
                                        },
                                        {
                                            $addFields: {
                                                uniqueSteamids: { '$setUnion': '$clan_whitelist.steamid64' },
                                            }
                                        },
                                        {
                                            $addFields: {
                                                unique_players: { $size: "$uniqueSteamids" },
                                            }
                                        },
                                        {
                                            $project: { _id: 0, admins: 0, available_groups: 0, clan_whitelist: 0, uniqueSteamids: 0 }
                                        }
                                    ]
                                    // dbo.collection("clans").find({}).project({ _id: 0, admins: 0, available_groups: 0 }).sort({ full_name: 1, tag: 1 }).toArray((err, dbRes) => {
                                    dbo.collection("clans").aggregate(pipeline).toArray((err, dbRes) => {
                                        if (err) console.error(err)
                                        // console.log(dbRes);
                                        let embeds = [];
                                        let reply = true;
                                        for (let c of dbRes) {
                                            let fields = [];
                                            for (let cK of [ "tag", "clan_code", "player_limit", "unique_players" ]) {
                                                if (cK == "player_limit" && c[ cK ] == "") c[ cK ] = "ထ";
                                                fields.push({ name: toUpperFirstChar(cK.replace(/\_/g, ' ')), value: c[ cK ].toString(), inline: (cK != "full_name") })
                                            }
                                            const sortedCallsList = urlCalls.sort();
                                            const winnerUrl = Object.keys(sortedCallsList)[ 0 ];
                                            const winnerUrlCount = sortedCallsList[ winnerUrl ];
                                            if (winnerUrlCount) {
                                                let wlUrls = [];
                                                for (let l of dbResL) {
                                                    const wlUrl = 'https://' + winnerUrl + ":" + server.configs.https.port + "/" + l.output_path + "/" + c[ 'clan_code' ];
                                                    wlUrls.push(Discord.hyperlink(l.title, wlUrl))
                                                }
                                                fields.push({ name: "Whitelist", value: wlUrls.join(' - '), inline: false })
                                            }
                                            // console.log(interaction.guildId, interaction.channelId);
                                            embeds.push(
                                                new Discord.EmbedBuilder()
                                                    .setColor(config.app_personalization.accent_color)
                                                    .setTitle(toUpperFirstChar(c.full_name.replace(/\_/g, ' ')))
                                                    .addFields(...fields)
                                            )
                                            // for (let i = 0; i < 10; i++)
                                            if (embeds.length % 10 == 0) {
                                                if (reply) {
                                                    reply = false;
                                                    interaction.reply({ content: Discord.userMention(sender_id), embeds: embeds });
                                                } else {
                                                    client.channels.cache.get(interaction.channelId).send({ embeds: embeds });
                                                }
                                                embeds = [];
                                            }
                                        }
                                        if (embeds.length > 0) client.channels.cache.get(interaction.channelId).followUp({ embeds: embeds });
                                    })
                                })
                            })
                            break;
                        case 'profile':
                            let publicMessage = interaction.options.getUser('user') != null;
                            let requestedProfile = publicMessage ? interaction.options.getUser('user') : sender
                            const ephemeral = !publicMessage;
                            await interaction.deferReply({ ephemeral: ephemeral });
                            mongoConn((dbo) => {

                                dbo.collection("players").findOne({ discord_user_id: (publicMessage ? requestedProfile.id : sender_id) }, async (err, dbRes) => {
                                    if (err) serverError(null, err);
                                    else {
                                        let fields = [
                                            { name: "Steam " + ((dbRes && dbRes.steamid64) ? "Username " : ""), value: ((dbRes && dbRes.steamid64) ? dbRes.username : "*Not linked*"), inline: true },
                                        ]
                                        if (dbRes && dbRes.steamid64) {
                                            fields.push({ name: 'SteamID', value: Discord.hyperlink(dbRes.steamid64, "https://steamcommunity.com/profiles/" + dbRes.steamid64), inline: true })

                                            // const allGroups = await dbo.collection("groups").find().toArray();
                                            // const plWlGroups = (await dbo.collection("whitelists").find({ steamid64: dbRes.steamid64, approved: true, $or: [ { expiration: { $gt: new Date() } }, { expiration: null }, { expiration: false } ] }).toArray()).map(g => ({ name: allGroups.find(_g => _g._id.toString() == g.id_group.toString())?.group_name || 'Unknown', expiration: g.expiration }));
                                            const st = await dbo.collection('configs').findOne({ category: 'seeding_tracker' })
                                            const stConf = st.config;
                                            const requiredPoints = stConf.reward_needed_time.value * (stConf.reward_needed_time.option / 1000 / 60)
                                            const percentageCompleted = Math.floor(100 * (dbRes.seeding_points || 0) / requiredPoints);
                                            // const reward_group = allGroups.find(g => g._id == stConf.reward_group_id)
                                            // let groups = plWlGroups || [];

                                            if (stConf.reward_enabled == 'true') {
                                                // if (percentageCompleted >= 100) groups.push({ name: reward_group.group_name, expiration: stConf.tracking_mode == 'fixed_reset' ? new Date(stConf.next_reset) : null })
                                                fields.push({ name: 'Seeding Reward', value: `${percentageCompleted}%`, inline: false })
                                            }

                                            const groups = await getPlayerGroups(dbRes.steamid64);
                                            for (let g of groups.filter(e => e.approved)) {
                                                let fVal = 'Unlimited'//`  ${g.name}`;
                                                if (g.expiration) fVal = `Expired ${Discord.time(g.expiration, 'R')}`
                                                fields.push({ name: g.name, value: fVal, inline: true })
                                            }
                                        }
                                        let reply = await interaction.followUp({
                                            content: Discord.userMention(requestedProfile.id),
                                            embeds: [
                                                new Discord.EmbedBuilder()
                                                    .setColor(config.app_personalization.accent_color)
                                                    .setAuthor({ name: requestedProfile.username, iconURL: requestedProfile.avatarURL() })
                                                    .setTitle("Linked Profiles")
                                                    // .setTitle(sender.username + "'s Linked Profiles")
                                                    // .setDescription(Discord.userMention(requestedProfile.id))
                                                    .addFields(...fields)
                                            ],
                                            components: (false && publicMessage) ? [] : [
                                                new Discord.ActionRowBuilder()
                                                    .addComponents(
                                                        ((dbRes && dbRes.steamid64) ?
                                                            new Discord.ButtonBuilder()
                                                                .setCustomId('profilelink:steam:unlink')
                                                                .setLabel('Unlink Steam')
                                                                .setStyle(Discord.ButtonStyle.Danger)
                                                            :
                                                            new Discord.ButtonBuilder()
                                                                .setCustomId('profilelink:steam:link')
                                                                .setLabel('Link Steam')
                                                                .setStyle(Discord.ButtonStyle.Success))
                                                    )
                                            ],
                                            ephemeral: ephemeral
                                        });
                                        if (!reply.interaction.ephemeral) {
                                            setTimeout(async () => {
                                                try {
                                                    const sentReply = await reply?.interaction?.webhook?.fetchMessage();
                                                    if (sentReply)
                                                        sentReply.edit({ components: [] })
                                                } catch (error) {
                                                    console.error(error);
                                                }
                                                // console.log(sentReply);
                                            }, 30 * 1000)
                                        }
                                    }
                                })

                            })
                            break;
                        case 'topseed':
                            topSeedMessage(sender, interaction)
                            break;
                        // case 'userinfo':
                        //     console.log(interaction.member)
                        //     interaction.reply({ content: "ok", ephemeral: true })
                        //     break;
                    }
                    updateUserRoles(sender_id);
                } else if (interaction.isButton()) {
                    const idsplit = interaction.customId.split(':');
                    // console.log(idsplit);
                    switch (idsplit[ 0 ]) {
                        case "approval":
                            const appr_status = idsplit[ 1 ] == "approve" ? true : false;
                            setApprovedStatus({ _id: idsplit[ 2 ], approve_update: appr_status })
                            interaction.reply({ content: "Done", ephemeral: true, });
                            interaction.message.edit({ components: [] });
                            let emb = interaction.message.embeds[ 0 ]
                            emb.fields.filter((f) => f.name == "Approval")[ 0 ].value = (appr_status ? ":white_check_mark: Approved" : ":x: Rejected");
                            emb.fields.push({ name: (appr_status ? "Approved" : "Rejected") + " by", value: Discord.userMention(sender.id), inline: true });
                            interaction.message.edit({ embeds: [ emb ] })
                            break;
                        case 'profilelink':
                            // console.log(interaction.message.mentions.users, sender_id, interaction.message.mentions.users.find(m => m.id == sender_id));
                            if (interaction.message.mentions.users.find(m => m.id == sender_id) || interaction.message.ephemeral) {
                                switch (idsplit[ 1 ]) {
                                    case 'steam':
                                        switch (idsplit[ 2 ]) {
                                            case 'link':
                                                let error;
                                                do {
                                                    let linkingCode = randomString(6);
                                                    error = false;
                                                    const expiratioDelay = 5 * 60 * 1000;
                                                    const codeExpiration = (new Date(Date.now() + expiratioDelay));
                                                    mongoConn((dbo) => {
                                                        dbo.collection("profilesLinking").deleteOne({ discordUserId: sender_id }, (err, dbRes) => {
                                                            dbo.collection("profilesLinking").findOne({ code: linkingCode }, (err, dbRes) => {
                                                                if (err) {
                                                                    res.sendStatus(500);
                                                                    console.error(err)
                                                                }
                                                                else if (dbRes == null) {
                                                                    dbo.collection("profilesLinking").insertOne({ source: "Discord", discordUserId: sender_id, code: linkingCode, expiration: codeExpiration }, (err, dbRes) => {
                                                                        if (err) {
                                                                            res.sendStatus(500);
                                                                            console.error(err)
                                                                        }
                                                                        else {
                                                                            interaction.reply({
                                                                                content: Discord.userMention(sender_id),
                                                                                embeds: [
                                                                                    new Discord.EmbedBuilder()
                                                                                        .setColor(config.app_personalization.accent_color)
                                                                                        .setTitle("Link Steam Profile")
                                                                                        .setDescription("Join our Squad server and send in any chat the following code (case-sensitive)")
                                                                                        .addFields(
                                                                                            { name: "Linking Code", value: linkingCode, inline: false },
                                                                                            { name: "Expiration", value: Discord.time(codeExpiration, 'R'), inline: false },
                                                                                        )
                                                                                ],
                                                                                ephemeral: true
                                                                            });

                                                                            setInterval(async () => {
                                                                                dbo.collection("profilesLinking").deleteOne({ _id: dbRes.insertedId });
                                                                            }, expiratioDelay)
                                                                        }
                                                                    })
                                                                } else {
                                                                    error = true;
                                                                }
                                                            })
                                                        })
                                                    })
                                                } while (error);
                                                break;
                                            case 'unlink':
                                                // const modal = new Discord.ModalBuilder()
                                                //     .setCustomId('profilelink:steam:unlink')
                                                //     .setTitle('Unlink Steam?')
                                                // await interaction.showModal(modal);
                                                if (!idsplit[ 3 ]) {
                                                    await interaction.reply({
                                                        content: Discord.userMention(sender_id),
                                                        embeds: [
                                                            new Discord.EmbedBuilder()
                                                                .setColor(config.app_personalization.accent_color)
                                                                .setTitle("Unlink Steam")
                                                                .setDescription("Do you really want to unlink your steam profile?")
                                                        ],
                                                        components: [
                                                            new Discord.ActionRowBuilder()
                                                                .addComponents(
                                                                    new Discord.ButtonBuilder()
                                                                        .setCustomId('profilelink:steam:unlink:confirm')
                                                                        .setLabel('Confirm')
                                                                        .setStyle(Discord.ButtonStyle.Danger)
                                                                ) ],
                                                        ephemeral: true
                                                    });
                                                } else {
                                                    switch (idsplit[ 3 ]) {
                                                        case 'confirm':
                                                            try {
                                                                mongoConn((dbo) => {
                                                                    dbo.collection("players").updateOne({ discord_user_id: sender_id }, { $unset: { discord_user_id: 1 } }, (err, dbRes) => {
                                                                        if (err) serverError(null, err);
                                                                        else {
                                                                            console.log(dbRes)
                                                                            if (dbRes.modifiedCount == 1) interaction.reply({ content: Discord.userMention(sender_id) + "\nYour Steam account has been unlinked", ephemeral: true });
                                                                            else interaction.reply({ content: Discord.userMention(sender_id) + "\nYou don't have a Steam account to unlink", ephemeral: true })
                                                                        }
                                                                    })
                                                                })
                                                            } catch (error) {
                                                                interaction.reply({ content: "An error occurred and this interaction cannot be completed", ephemeral: true })
                                                                console.error(error)
                                                            }
                                                            break;
                                                    }
                                                }
                                                break;
                                        }
                                        break;
                                }
                            } else {
                                interaction.reply({
                                    content: Discord.userMention(sender_id),
                                    embeds: [
                                        new Discord.EmbedBuilder()
                                            .setColor(config.app_personalization.accent_color)
                                            .setTitle("Unauthorized")
                                            .setDescription("Only the owner of the profile can use this action")
                                    ],
                                    ephemeral: true
                                })
                            }
                            break;
                        case 'topseed':
                            if (idsplit[ 1 ] == 'page') topSeedMessage(sender, interaction, idsplit[ 2 ])
                            break;
                    }
                } else if (interaction.isModalSubmit()) {
                    interaction.reply({ content: "Modal received", ephemeral: true })
                }
            });

            async function updateUserRoles(member_id) {
                // console.log(await client.guilds.cache.get(config.discord_bot.server_id).members.cache.map((e)=>e.id));
                try {
                    const member = await client.guilds.cache.get(config.discord_bot.server_id).members.cache.find((m) => m.id == member_id);
                    if (member) {
                        const user = member.user;
                        const user_roles = member._roles;
                        try {
                            mongoConn((dbo) => {
                                dbo.collection("players").updateOne({ discord_user_id: member_id }, { $set: { discord_user_id: member_id, discord_username: user.username + "#" + user.discriminator, discord_roles_ids: user_roles } }, { upsert: true })
                            })
                        } catch (error) {
                            console.error(error)
                        }
                    } else {
                        mongoConn((dbo) => {
                            dbo.collection("players").updateOne({ discord_user_id: member_id }, { $set: { discord_roles_ids: [] } })
                        })
                    }
                } catch (error) {
                    console.error(error)
                }
            }

            async function topSeedMessage(sender, interaction, page = 0) {
                const sender_id = `${sender.id}`;
                // console.log(interaction)
                mongoConn(async dbo => {
                    let res = await dbo.collection("players").find({ seeding_points: { $gte: 1 } }).skip(page * 10).limit(11).sort({ seeding_points: -1 }).toArray();
                    // await interaction.deferReply({ ephemeral: false });
                    const st = await dbo.collection('configs').findOne({ category: 'seeding_tracker' })
                    const stConf = st.config;
                    const requiredPoints = stConf.reward_needed_time.value * (stConf.reward_needed_time.option / 1000 / 60)

                    const block = res.splice(0, 10).map((e, i) => [ `**${page * 10 + i + 1})**`, `${Discord.hyperlink(e.username, steamProfileUrl(e.steamid64))}`, e.discord_user_id ? Discord.userMention(e.discord_user_id) : null, `*${Math.floor(100 * (e.seeding_points || 0) / requiredPoints)}%*` ].filter(e => e != null).join(' '))

                    const messageContent = {
                        // content: Discord.userMention(sender_id),
                        // embeds: res.splice(0, 10).map((e, i) => ({
                        //     title: `${page * 10 + i + 1}.${e.username}`,
                        //     url: steamProfileUrl(e.steamid64),
                        //     fields: [
                        //         { name: 'Score', value: Math.floor(100 * (e.seeding_points || 0) / requiredPoints) + "%", inline: true },
                        //         { name: 'SteamID', value: Discord.hyperlink(e.steamid64, steamProfileUrl(e.steamid64)), inline: true },
                        //         { name: 'Discord Username', value:  : 'Not Linked', inline: true }
                        //     ]
                        // })),
                        embeds: [ {
                            color: Discord.resolveColor(config.app_personalization.accent_color),
                            title: `Top 10 Seeders`,
                            description: block.join('\n')
                        } ],
                        components: [
                            new Discord.ActionRowBuilder()
                                .addComponents(
                                    new Discord.ButtonBuilder()
                                        .setCustomId(`topseed:page:${+ page - 1}`)
                                        .setLabel('⮜')
                                        .setStyle(Discord.ButtonStyle.Success)
                                        .setDisabled(page - 1 < 0)
                                    ,
                                    new Discord.ButtonBuilder()
                                        .setCustomId(`topseed:page:${+page + 1}`)
                                        .setLabel('⮞')
                                        .setStyle(Discord.ButtonStyle.Success)
                                        .setDisabled(res.length == 0),
                                )
                        ],
                        ephemeral: false
                    }

                    if (interaction.isButton()) {
                        // const sentReply = await interaction.webhook.fetchMessage();
                        await interaction.deferUpdate();
                        await interaction.message.edit(messageContent)
                    } else
                        await interaction.reply(messageContent);
                })
            }
        } else {
            console.log(" > Not configured. Skipping.");
            discCallback();
        }
    }

    async function SquadJSWebSocket(cb = null) {
        let reconnect_int = null;
        let conns = [];

        console.log("Starting SquadJS WebSockets")
        for (let sqJsK in config.squadjs) {
            subcomponent_status.squadjs[ sqJsK ] = false;
            const sqJsConn = config.squadjs[ sqJsK ];

            if (sqJsConn.websocket && sqJsConn.websocket.token != "" && sqJsConn.websocket.host != "") {
                // conns[ sqJsK ] = new Promise((resolve, reject) =>{

                // })

                const tm = setTimeout(() => {
                    console.error(` > Connection ${+sqJsK + 1} timed out. Check your SquadJS WebSocket configuration.`);
                    console.log(` > Proceding without SquadJS WebSocket ${+sqJsK + 1}.`);
                    // conns[ sqJsK ].resolve(true);
                }, 10000)

                const res_ip = (await lookup(sqJsConn.websocket.host)).address
                // console.log(`Lookup ${ config.squadjs.websocket.host } => `, res_ip)
                if (!subcomponent_data.squadjs[ sqJsK ]) subcomponent_data.squadjs[ sqJsK ] = {}

                subcomponent_data.squadjs[ sqJsK ].socket = io(`ws://${res_ip}:${sqJsConn.websocket.port}`, {
                    auth: {
                        token: sqJsConn.websocket.token
                    },
                    autoUnref: true
                })
                subcomponent_data.squadjs[ sqJsK ].socket.on("connect", async () => {
                    // conns[ sqJsK ].resolve(true);
                    clearTimeout(tm);
                    console.log(`SquadJS Websocket ${+sqJsK + 1} Connected`);

                    // subcomponent_data.squadjs[ sqJsK ].socket.emit("rcon.warn", "76561198419229279", "Whitelister Test Connected", () => { })
                    clearInterval(reconnect_int);
                    subcomponent_status.squadjs[ sqJsK ] = true;

                    if (!squadjs.initDone) {
                        squadjs.initDone = true;
                        // seedingTimeTracking();
                    }
                });

                // subcomponent_data.squadjs[ sqJsK ].socket.on("newListener", async (dt) => {
                //     console.log(dt)
                // })
                // subcomponent_data.squadjs[ sqJsK ].socket.onAny(async (dt) => {
                //     console.log(dt)
                // })
                subcomponent_data.squadjs[ sqJsK ].socket.on("disconnect", async () => {
                    subcomponent_status.squadjs[ sqJsK ] = false;
                    console.log("SquadJS WebSocket\n > Disconnected\n > Trying to reconnect")
                    reconnect_int = setInterval(() => {
                        if (!subcomponent_status.squadjs) subcomponent_data.squadjs[ sqJsK ].connect()
                    }, 10 * 1000)
                });
                subcomponent_data.squadjs[ sqJsK ].socket.on("PLAYER_CONNECTED", async (dt) => {
                    // console.log("Player connected: ", dt)
                    // if (dt.player.steamID == "76561198419229279") {
                    //     setTimeout(() => {
                    //         subcomponent_data.squadjs[ sqJsK ].socket.emit("rcon.warn", "76561198419229279", "This server is using the Whitelister tool", (d) => {
                    //             console.log(d)
                    //         })
                    //     }, 5000)
                    // }
                    try {
                        if (dt && dt.player && dt.player.steamID) {
                            mongoConn(async (dbo) => {
                                dbo.collection("players").updateOne({ steamid64: dt.player.steamID }, { $set: { username: dt.player.name } }, { upsert: true })
                            })
                            setTimeout(() => {
                                welcomeMessage(dt)
                            }, 10000)
                        }
                    } catch (error) {
                        console.error("PLAYER_CONNECTED ERROR", error)
                    }
                })
                // subcomponent_data.squadjs[ sqJsK ].socket.on("PLAYER_DISCONNECTED", async (dt) => {
                //     console.log("Player disconnected: ", dt)
                // })
                subcomponent_data.squadjs[ sqJsK ].socket.on("CHAT_MESSAGE", async (dt) => {
                    // console.log(`Message from connection ${sqJsK}`, dt)
                    switch (dt.message.toLowerCase().replace(/^(!|\/)/, '')) {
                        case 'test':
                            break;
                        case 'playerinfo':
                            console.log(dt);
                            const dbo = await mongoConn();
                            const oldPlayerData = await dbo.collection("players").findOne({ steamid64: dt.player.steamID }, { projection: { _id: 0, seeding_points: 1 } })
                            console.log("olddata", oldPlayerData)

                            break;
                        case 'profile':
                            welcomeMessage(dt, 0)
                            break;
                        default:
                            if (dt.message.length == 6 && !dt.message.includes(' ')) {
                                // console.log(dt);
                                mongoConn(async (dbo) => {
                                    dbo.collection("profilesLinking").findOne({ code: dt.message }, async (err, dbRes) => {
                                        if (err) serverError(null, err);
                                        else if (dbRes) {
                                            if (dbRes.expiration > new Date()) {
                                                const discordUser = await discordBot.users.fetch(dbRes.discordUserId);
                                                const discordUsername = discordUser.username + (discordUser.discriminator ? "#" + discordUser.discriminator : '');
                                                const oldPlayerData = await dbo.collection("players").findOne({ steamid64: dt.player.steamID }, { projection: { _id: 0, seeding_points: 1 } })
                                                dbo.collection("players").updateOne({ discord_user_id: dbRes.discordUserId }, { $set: { steamid64: dt.player.steamID, username: dt.player.name, discord_user_id: dbRes.discordUserId, discord_username: discordUsername, ...oldPlayerData } }, { upsert: true }, (err, dbResU) => {
                                                    dbo.collection("players").deleteOne({ steamid64: dt.player.steamID, discord_user_id: { $exists: false } }, (err, dbResRem) => {
                                                        if (err) return serverError(null, err)

                                                        dbo.collection("profilesLinking").deleteOne({ _id: dbRes._id })
                                                        if (err) serverError(null, err);
                                                        else {
                                                            subcomponent_data.squadjs[ sqJsK ].socket.emit("rcon.warn", dt.steamID, "Linked Discord profile: " + discordUsername, (d) => { })
                                                            discordUser.send({
                                                                embeds: [
                                                                    new Discord.EmbedBuilder()
                                                                        .setColor(config.app_personalization.accent_color)
                                                                        .setTitle("Profile Linked")
                                                                        .setDescription("Your Discord profile has been linked to a Steam profile")
                                                                        .addFields(
                                                                            { name: "Steam Username", value: dt.name, inline: true },
                                                                            { name: 'SteamID', value: Discord.hyperlink(dt.steamID, "https://steamcommunity.com/profiles/" + dt.steamID), inline: true })
                                                                ]
                                                            })
                                                        }
                                                    });
                                                })
                                            } else {
                                                dbo.collection("profilesLinking").deleteOne({ _id: dbRes._id })
                                            }
                                        }
                                    })
                                })
                            }
                            break;
                    }
                })
                async function welcomeMessage(dt, timeoutDelay = 5000) {
                    // console.log('Sending welcome message', dt)
                    mongoConn(async dbo => {
                        const pipeline = [
                            { $match: { steamid64: dt.player.steamID } },
                            {
                                $lookup: {
                                    from: "groups",
                                    localField: "id_group",
                                    foreignField: "_id",
                                    as: "group_full_data"
                                }
                            }
                        ]
                        dbo.collection("whitelists").aggregate(pipeline).toArray(async (err, dbRes) => {
                            if (err) serverError(null, err);
                            else {
                                dbo.collection("players").findOne({ steamid64: dt.player.steamID }, async (err, dbResP) => {
                                    if (err) serverError(null, err);
                                    else {
                                        const st = await dbo.collection('configs').findOne({ category: 'seeding_tracker' })
                                        const stConf = st.config;
                                        const requiredPoints = stConf.reward_needed_time.value * (stConf.reward_needed_time.option / 1000 / 60)
                                        const percentageCompleted = Math.floor(100 * dbResP.seeding_points / requiredPoints) || 0;
                                        // const reward_group = await dbo.collection('groups').findOne({ _id: ObjectID(st.config.reward_group_id) })

                                        let msg = "Welcome " + dt.player.name + "\n\n";

                                        if (subcomponent_status.squadjs) {
                                            let groups = (await getPlayerGroups(dt.player.steamID)).filter(e => e.approved);

                                            if (groups.length > 0) {
                                                msg += `Groups:\n`
                                                for (let g of groups) {
                                                    msg += ` - ${g.name}`
                                                    if (g.expiration) msg += `: ${((g.expiration - new Date()) / 1000 / 60 / 60).toFixed(1) + "h left"}`
                                                    msg += '\n'
                                                }
                                            }
                                        }
                                        if (subcomponent_status.discord_bot) {
                                            let discordUsername = "";
                                            if (dbResP && dbResP.discord_user_id && dbResP.discord_user_id != "") {
                                                const discordUser = await discordBot.users.fetch(dbResP.discord_user_id);
                                                discordUsername = discordUser.username + (discordUser.discriminator ? "#" + discordUser.discriminator : '');
                                            }

                                            if (stConf.reward_enabled == 'true') msg += "\nSeeding Reward: " + percentageCompleted + "%"
                                            msg += "\nDiscord Username: " + (discordUsername != "" ? discordUsername : "Not linked")
                                        }


                                        if (subcomponent_status.squadjs) {
                                            setTimeout(() => {
                                                subcomponent_data.squadjs[ sqJsK ].socket.emit("rcon.warn", dt.player.steamID, msg, (d) => { })
                                                console.log(msg);
                                            }, timeoutDelay)
                                        }
                                    }
                                })
                            }
                        })
                    })
                }
            } else {
                console.log(` > ${+sqJsK + 1} Not configured. Skipping.`);
                if (cb) cb();
            }

        }

        await Promise.all(conns)
    }

    function emitPromise(socket, event, data) {
        return new Promise((resolve, reject) => {
            socket.emit(event, data, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }

    async function seedingTimeTracking() {
        console.log('Seeding Tracker started')
        const checkIntervalMinutes = 1;
        let firstStart = true;
        if (firstStart) {

            // welcomeMessage({
            //     player: {
            //         steamID: "76561198419229279",
            //         name: "JetDave"
            //     }
            // }, 0)


        }




        _check()

        // setInterval(() => {
        //     _check(allOnlinePlayers, activeSeedingConnections)
        // }, checkIntervalMinutes * 60 * 1000)
        setInterval(_check, checkIntervalMinutes * 60 * 1000)
        async function _check() {
            const dbo = await mongoConn();
            const st = await dbo.collection('configs').findOne({ category: 'seeding_tracker' })
            const stConf = st.config;
            if (!stConf) {
                console.log('Seeding tracker configuration not set, unable to proceed.')
                return;
            }
            const requiredPoints = stConf.reward_needed_time.value * (stConf.reward_needed_time.option / 1000 / 60)
            const players = [];
            const activeSeedingConnections = []

            for (let sqJsK in subcomponent_data.squadjs) {
                if (!subcomponent_status.squadjs[ sqJsK ]) continue;
                // const singleServerPlayers = (await util.promisify(subcomponent_data.squadjs[ sqJsK ].socket.emit)("rcon.getListPlayers"))

                const singleServerPlayers = (await emitPromise(subcomponent_data.squadjs[ sqJsK ].socket, "rcon.getListPlayers", {}))
                    .map((p) => ({ ...p, sqJsConnectionIndex: +sqJsK }));
                // console.log('singleServerPlayers', singleServerPlayers)

                if (singleServerPlayers && singleServerPlayers.length >= (stConf.seeding_start_player_count || 2) && singleServerPlayers.length <= stConf.seeding_player_threshold)
                    activeSeedingConnections[ sqJsK ] = true;

                players.push(...singleServerPlayers);
            }
            // console.log('Online Players', players)

            firstStart = false;
            // console.log("Checking seeders");
            if (activeSeedingConnections.includes(true)) {
                mongoConn(async dbo => {

                    if (players && players.length > 0) {
                        if (st.config.tracking_mode == 'incremental') {
                            let deduction_points = 0;

                            if (st.config.time_deduction.option == 'point_minute') deduction_points = st.config.time_deduction.value
                            else if (st.config.time_deduction.option == 'perc_minute') deduction_points = st.config.time_deduction.value * requiredPoints / 100;

                            await dbo.collection("players").updateMany({ steamid64: { $nin: players.map(p => p.steamID) }, seeding_points: { $gt: deduction_points } }, { $inc: { seeding_points: -deduction_points } })
                        }
                        // console.log("current seeders", objArrToValArr(players, "name"));

                        for (let p of players) {
                            if (!activeSeedingConnections[ p.sqJsConnectionIndex ]) continue;

                            const oldPlayerData = await dbo.collection("players").findOne({ steamid64: p.steamID });
                            dbo.collection("players").findOneAndUpdate({ steamid64: p.steamID }, { $set: { steamid64: p.steamID, username: p.name }, $inc: { seeding_points: 1 } }, { upsert: true, returnDocument: 'after' }, async (err, dbRes) => {
                                if (err) serverError(null, err)
                                else if (stConf.reward_enabled == "true") {
                                    // console.log(dbRes);
                                    const stepOld = Math.min(Math.floor(10 * oldPlayerData?.seeding_points / requiredPoints), 10) || 0;
                                    const percentageCompletedOld = stepOld * 10;
                                    const step = Math.min(Math.floor(10 * dbRes.value?.seeding_points / requiredPoints), 10) || 0;
                                    const percentageCompleted = step * 10
                                    // console.log(p.name, stepOld, step)

                                    if (step > 0 && step > stepOld) {
                                        if (percentageCompleted < 100) {
                                            subcomponent_data.squadjs[ p.sqJsConnectionIndex ].socket.emit("rcon.warn", p.steamID, `Seeding Reward: \n\n${percentageCompleted}% completed`, (d) => { })
                                            // new Array(10).fill('■',0,1).fill('□',1,10).join('')

                                            const messageContent = {
                                                embeds: [ {
                                                    color: Discord.resolveColor(config.app_personalization.accent_color),
                                                    title: `${p.name}`,
                                                    url: steamProfileUrl(p.steamID),
                                                    fields: [
                                                        { name: 'Score', value: percentageCompleted + "%", inline: true },
                                                        { name: 'SteamID', value: Discord.hyperlink(p.steamID, steamProfileUrl(p.steamID)), inline: true },
                                                        { name: 'Discord User', value: dbRes.value.discord_user_id ? Discord.userMention(dbRes.value.discord_user_id) : 'Not Linked', inline: false },
                                                    ],
                                                    footer: {
                                                        text: new Array(10).fill('◼', 0, step).fill('◻', step, 10).join('') + ` ${percentageCompleted}%`,
                                                        icon_url: config.app_personalization.favicon || config.app_personalization.logo_url,
                                                    },
                                                    thumbnail: {
                                                        url: config.app_personalization.logo_url,
                                                    },
                                                    timestamp: new Date().toISOString(),
                                                } ],
                                                ephemeral: false
                                            }
                                            discordBot.channels.cache.get(stConf.discord_seeding_score_channel)?.send(messageContent)

                                        } else if (percentageCompleted == 100) {
                                            const reward_group = await dbo.collection('groups').findOne({ _id: ObjectID(st.config.reward_group_id) })
                                            let message =
                                                `Seeding Reward Completed!\n\nYou have received: ${reward_group.group_name}\n`
                                            if (st.config.tracking_mode == 'fixed_reset') message += `Active until: ${(new Date(st.config.next_reset)).toLocaleDateString()}`
                                            else if (st.config.tracking_mode == 'incremental') message += `Don't drop below 100% to keep your reward!`

                                            subcomponent_data.squadjs[ p.sqJsConnectionIndex ].socket.emit("rcon.warn", p.steamID, message, (d) => { })
                                            if (subcomponent_status.discord_bot) {
                                                const embeds = [
                                                    new Discord.EmbedBuilder()
                                                        .setColor(config.app_personalization.accent_color)
                                                        .setTitle(`${p.name} received the Seeding Reward!`)
                                                        .setURL(steamProfileUrl(p.steamID))
                                                        // .setDescription(formatEmbed("Manager", ) + formatEmbed("List", dbResList.title)),
                                                        .addFields(
                                                            { name: 'Username', value: p.name, inline: true },
                                                            { name: 'SteamID', value: Discord.hyperlink(p.steamID, "https://steamcommunity.com/profiles/" + p.steamID), inline: true },
                                                            { name: 'Discord User', value: dbRes.value.discord_user_id ? Discord.userMention(dbRes.value.discord_user_id) : 'Not Linked', inline: false },
                                                            { name: 'Reward Group', value: reward_group.group_name, inline: true }
                                                            // { name: 'Expiration', value: reward_group.group_name, inline: true }
                                                        )
                                                        .setThumbnail(config.app_personalization.logo_url)
                                                        .setFooter({
                                                            text: new Array(10).fill('◼', 0, 10).join('') + " 100%",
                                                            iconURL: config.app_personalization.favicon || config.app_personalization.logo_url,
                                                        })
                                                        .setTimestamp(new Date())
                                                ]
                                                discordBot.channels.cache.get(stConf.discord_seeding_reward_channel)?.send({ embeds: embeds })
                                            }
                                        }
                                    }
                                }
                            })
                        }

                    }
                })
            }
        }
    }


    async function getPlayerGroups(steamid64) {
        const dbo = await mongoConn()
        const allGroups = await dbo.collection('groups').find().toArray()
        const st = await dbo.collection('configs').findOne({ category: 'seeding_tracker' })
        const stConf = st.config;
        const requiredPoints = stConf.reward_needed_time.value * (stConf.reward_needed_time.option / 1000 / 60)
        console.log('CREATING objIdRewardGroup from value:', st.config.reward_group_id)
        let objIdRewardGroup;// = ObjectID(st.config.reward_group_id)
        try {
            objIdRewardGroup = ObjectID(st.config.reward_group_id)
        } catch (error) {
            objIdRewardGroup = null;
            console.log('FAILED TO CREATE objIdRewardGroup from value:', st.config.reward_group_id, "\n", stConf)
        }
        let playerGroups = [];
        let reward_group;
        if (objIdRewardGroup)
            reward_group = st.config.reward_group_id ? (await dbo.collection('groups').findOne({ _id: objIdRewardGroup })) : null
        // GROUP FORMAT: { name: "groupName", expiration: new Date() }
        playerGroups.push(...(await dbo.collection('whitelists').find({ steamid64: steamid64 }).toArray()).map(_e => {
            const g = allGroups.find(_g => _g._id.toString() == _e.id_group.toString());
            let e = {}
            e.id = _e.id_group.toString()
            e.name = g.group_name
            e.expiration = _e.expiration
            e.approved = _e.approved
            e.source = 'Whitelists'
            return e;
        }))

        const pipeline = [
            {
                $match: {
                    steamid64: steamid64,
                    discord_roles_ids: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: "groups",
                    let: {
                        pl_roles: "$discord_roles_ids"
                    },
                    pipeline: [
                        {
                            $addFields: {
                                int_r: { $setIntersection: [ "$discord_roles", "$$pl_roles" ] }
                            }
                        },
                        {
                            $match: {
                                // discord_roles: { $ne: [] },
                                int_r: { $ne: [] },
                            }
                        },
                    ],
                    as: "groups",
                }
            },
            {
                $project: {
                    discord_roles_ids: 0,
                    "groups.discord_roles": 0,
                    "groups.intersection_roles": 0,
                    "groups.int_r": 0,
                    "groups.require_appr": 0,
                }
            },
            {
                $match: {
                    lists: { $ne: [] }
                }
            }
        ]
        const dbResP = await dbo.collection("players").aggregate(pipeline).toArray()
        for (let w of dbResP) {
            const percentageCompleted = Math.round(100 * w.seeding_points / requiredPoints);
            if (percentageCompleted >= 100 && reward_group) playerGroups.push({ id: reward_group._id?.toString(), name: reward_group.group_name, expiration: stConf.tracking_mode == 'fixed_reset' ? new Date(stConf.next_reset) : false, approved: stConf.reward_enabled == 'true', source: 'Seeding' })

            for (let g of w.groups) {
                playerGroups.push({
                    id: g._id,
                    name: g.group_name,
                    expiration: false,
                    approved: true,
                    source: 'Discord'
                })
            }
        }

        return playerGroups
    }

    function steamProfileUrl(steamid64) {
        return "https://steamcommunity.com/profiles/" + steamid64
    }

    async function mongoConn(connCallback = () => { }, override = false) {
        if (!mongodb_global_connection || override) {
            let url;
            let dbName// = config.database.mongo.database;

            if (process.env.MONGODB_CONNECTION_STRING) url = process.env.MONGODB_CONNECTION_STRING
            else {
                if (config.database.mongo.host.includes("://")) url = config.database.mongo.host;
                else url = "mongodb://" + config.database.mongo.host + ":" + config.database.mongo.port;
                dbName = config.database.mongo.database;
            }

            let client = MongoClient.connect(url, function (err, db) {
                if (err) console.error(err)
                var dbo = dbName ? db.db(dbName) : db.db();
                connCallback(dbo);
                return dbo
            });
        } else {
            connCallback(mongodb_conn)
            return mongodb_conn
        }
    }

    function getDateFromEpoch(ep) {
        let d = new Date(0);
        d.setUTCSeconds(ep);
        return d;
    }

    function serverError(res, err) {
        if (res) res.sendStatus(500);
        console.error(err);
    }

    function toUpperFirstChar(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    function initConfigFile(callback) {

        console.log("Current dir: ", __dirname);
        console.log(`Configuration file path: ${configPath}`)
        let emptyConfFile = {
            web_server: {
                bind_ip: "0.0.0.0",
                http_port: 80,
                https_port: 443,
                force_https: false,
                session_duration_hours: 168,
            },
            database: {
                mongo: {
                    host: process.env.MONGODB_CONNECTION_STRING || "127.0.0.1",
                    port: 27017,
                    database: "Whitelister",
                    // username: "",
                    // password: "",
                }
            },
            app_personalization: {
                name: "Whitelister",
                favicon: "",
                accent_color: "#ffc40b",
                logo_url: "https://joinsquad.com/wp-content/themes/squad/img/logo.png",
                logo_border_radius: "10",
                title_hidden_in_header: false,
            },
            discord_bot: {
                token: "",
                server_id: "",
                whitelist_updates_channel_id: ""
            },
            squadjs: [
                {
                    websocket: {
                        host: "",
                        port: 3000,
                        token: ""
                    }
                }
            ],
            other: {
                automatic_updates: true,
                update_check_interval_seconds: 3600,
                whitelist_developers: true,
                install_beta_versions: false,
                logs_max_file_count: 10
            }
        }

        if (!fs.existsSync(configPath)) {
            console.log(`Creating config file at path: ${configPath}`)
            get_free_port(emptyConfFile.web_server.http_port, function (http_port) {
                console.log(`Found for free HTTP port: ${http_port}`)
                emptyConfFile.web_server.http_port = http_port;
                console.log(`Set HTTP port: ${emptyConfFile.web_server.http_port}`)
                get_free_port(emptyConfFile.web_server.https_port, function (https_port) {
                    emptyConfFile.web_server.https_port = https_port;
                    console.log("Configuration file created, set your parameters and run again \"node server\".\nTerminating execution...");
                    fs.writeFileSync(configPath, JSON.stringify(emptyConfFile, null, "\t"));
                    if (process.env.PROCESS_MANAGER_TYPE && process.env.PROCESS_MANAGER_TYPE.toUpperCase() == "DOCKER") callback();
                    else process.exit(0)
                });
            });
        } else {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8").toString());
            var config2 = { ...config }
            upgradeConfig(config2, emptyConfFile);
            fs.writeFileSync(configPath, JSON.stringify(config2, null, "\t"));
            callback();
        }
    }
    function isDbPopulated(callback) {
        const mainListData = {
            title: "Main",
            output_path: "wl",
            hidden_managers: false,
            require_appr: false,
            discord_roles: []
        }
        const seedingTrackerConf = {
            category: "seeding_tracker",
            config: {
                reset_seeding_time: {
                    value: 1,
                    option: 86400000
                },
                reward_needed_time: {
                    value: 1,
                    option: 3600000
                },
                reward_group_id: "",
                next_reset: "",
                seeding_player_threshold: 50,
                seeding_start_player_count: 2,
                reward_enabled: "false",
                discord_seeding_reward_channel: "",
                discord_seeding_score_channel: "",
                tracking_mode: "incremental",
                time_deduction: {
                    value: 1,
                    option: "perc_minute"
                }
            }
        }

        mongoConn(async (dbo) => {
            subcomponent_data.database.root_user_registered = (await dbo.collection("users").findOne({ access_level: 0 })) ? true : false;
            if (args.demo) dbo.collection("users").updateOne({ username: 'demoadmin' }, { $set: { password: crypto.createHash('sha512').update('demo').digest('hex'), access_level: 5 } }, { upsert: true })

            await syncDatabaseIndexes();

            dbo.collection("players").deleteMany({ discord_user_id: { $exists: true }, steamid64: { $exists: false } })

            if (!(await dbo.collection("configs").findOne({ category: "seeding_tracker", config: { $exists: true } })))
                dbo.collection("configs").updateOne({ category: "seeding_tracker" }, { $set: { config: { tracking_mode: 'incremental' } } }, { upsert: true })

            await repairSeedingTrackerConfigFormat();

            listCollection(() => { repairListFormat(callback) });
            // dbo.collection("configs").deleteMany({ category: "seeding_tracker", tracking_mode: { $exists: false } })

            function listCollection(cb) {
                dbo.listCollections({ name: "lists" }).next((err, dbRes) => {
                    if (dbRes == null) {
                        createAndInitListsCollection(cb);
                    } else {
                        dbo.collection("lists").countDocuments({}, (err, count) => {
                            if (count === 0) {
                                createAndInitListsCollection(cb);
                            } else {
                                cb();
                            }
                        });
                    }
                });
            }

            function createAndInitListsCollection(cb) {
                dbo.collection("lists").insertOne(mainListData, (err, dbResI) => {
                    if (err) serverError(res, err);
                    else {
                        console.log("Collection 'lists' created.\n", dbResI);
                        dbo.collection("whitelists").updateMany({ id_list: { $exists: false } }, { $set: { id_list: dbResI.insertedId } }, (err, dbResU) => {
                            if (err) serverError(res, err);
                            else {
                                console.log("Updated references");
                                cb();
                            }
                        });
                    }
                });
            }

            async function repairListFormat(cb) {
                let logSent = false;
                const keysToCheck = Object.keys(mainListData);
                await repair(0)

                async function repair(ki) {
                    const k = keysToCheck[ ki ]
                    await dbo.collection("lists").updateMany({ [ k ]: { $exists: false } }, { $set: { [ k ]: mainListData[ k ] } }, async (err, dbRes) => {
                        if (err) console.error(err);
                        else {
                            if (dbRes.modifiedCount > 0) {
                                if (!logSent) {
                                    logSent = true;
                                    console.log("Repairing Lists format");
                                }
                            }
                            if (ki < keysToCheck.length - 1) await repair(ki + 1);
                            else cb();
                        }
                    })
                }
            }
            async function repairSeedingTrackerConfigFormat(cb = () => { }) {
                let logSent = false;

                const keysToCheck = Object.keys(seedingTrackerConf.config);
                await repair(0)

                async function repair(ki) {
                    const k = `config.${keysToCheck[ ki ]}`
                    await dbo.collection("configs").updateOne({ category: 'seeding_tracker', [ k ]: { $exists: false } }, { $set: { [ k ]: seedingTrackerConf.config[ keysToCheck[ ki ] ] } }, async (err, dbRes) => {
                        if (err) console.error(err);
                        else {
                            if (dbRes.modifiedCount > 0) {
                                if (!logSent) {
                                    logSent = true;
                                    console.log("Repairing SD Config format");
                                }
                            }
                            if (ki < keysToCheck.length - 1) await repair(ki + 1);
                            else cb();
                        }
                    })
                }
            }

            async function syncDatabaseIndexes() {
                console.log('Syncing database indexes');
                const collectionIndexes = {
                    players: [
                        'discord_user_id',
                        'steamid64',
                        'seeding_points',
                        'discord_roles_ids'
                    ],
                    sessions: [
                        'token'
                    ],
                    clans: [
                        'clan_code'
                    ],
                    groups: [],
                    lists: [
                        'output_path'
                    ],
                    whitelists: [
                        'id_clan',
                        'steamid64',
                        'id_group',
                        'id_list'
                    ]
                }

                for (let collectionK in collectionIndexes) {
                    console.log(` > Syncing collection "${collectionK}"`)
                    for (let collIndex of collectionIndexes[ collectionK ]) {
                        let error = false;
                        const res = await dbo.collection(collectionK).createIndex({ [ collIndex ]: 1 }).catch((r) => {
                            error = true;
                            console.log(`  > "${collIndex}": Fail. Error: ${r}`)
                        })
                        if (error) continue;
                        console.log(`  > "${collIndex}": Success`)
                    }
                }
            }
        })
    }
    function upgradeConfig(currentConfig, baseConfig) {
        console.log('upgrading conf');

        for (let k in baseConfig) {
            if (currentConfig[ k ] === undefined) {
                currentConfig[ k ] = JSON.parse(JSON.stringify(baseConfig[ k ])); // Deep clone
                continue;
            }

            if (Array.isArray(baseConfig[ k ])) {
                if (!Array.isArray(currentConfig[ k ])) {
                    // If currentConfig[k] is not an array, make its current value the first entry of the new array
                    currentConfig[ k ] = [ currentConfig[ k ] ];
                }

                for (let i = 0; i < baseConfig[ k ].length; i++) {
                    if (i >= currentConfig[ k ].length) {
                        currentConfig[ k ].push(JSON.parse(JSON.stringify(baseConfig[ k ][ i ]))); // Deep clone
                    } else {
                        upgradeConfig(currentConfig[ k ][ i ], baseConfig[ k ][ i ]);
                    }
                }
            } else if (typeof baseConfig[ k ] === "object") {
                if (typeof currentConfig[ k ] !== "object" || currentConfig[ k ] === null) {
                    currentConfig[ k ] = {};
                }
                upgradeConfig(currentConfig[ k ], baseConfig[ k ]);
            } else if (typeof currentConfig[ k ] !== typeof baseConfig[ k ]) {
                if (typeof baseConfig[ k ] === 'number' && !isNaN(+currentConfig[ k ])) {
                    currentConfig[ k ] = +currentConfig[ k ];
                } else {
                    currentConfig[ k ] = baseConfig[ k ];
                }
            }
        }
    }

    function setApprovedStatus(parm, res = null) {
        mongoConn((dbo) => {
            if (parm.approve_update && (parm.approve_update == true || parm.approve_update == 'true')) {
                dbo.collection("whitelists").updateOne({ _id: ObjectID(parm._id) }, { $set: { approved: true } }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        if (res) res.send({ status: "approved", ...dbRes })
                    }
                })
            } else {
                dbo.collection("whitelists").deleteOne({ _id: ObjectID(parm._id) }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        if (res) res.send({ status: "rejected", ...dbRes })
                    }
                })
            }
        })
    }
    process.on('uncaughtException', function (err) {
        console.error("Uncaught Exception", err.message, err.stack)
        if (++errorCount >= (args[ "self-pm" ] ? 5 : 5)) {
            console.error("Too many errors occurred during the current run. Terminating execution...");
            restartProcess(0, 1, args);
        }
    })
    function randomString(size = 64) {
        const rndStr = crypto.randomBytes(size).toString('base64').slice(0, size);
        if (rndStr.match(/^[a-zA-Z\d]{1,}$/)) return rndStr
        else return randomString(size)
    }
    function extendLogging() {
        console.log = (...params) => {
            consoleLogBackup(...params);
            logger.trace(...params)
        }
        console.error = (...params) => {
            consoleErrorBackup(...params);
            logger.error(...params)
        }
        fs.readdir(path.join(__dirname, "logs"), { withFileTypes: true }, (err, files) => {
            if ((config && config.other && files.length > config.other.logs_max_file_count) || (files.length > 10)) {
                files = files.slice(0, files.length - config.other.logs_max_file_count)
                files.forEach(f => {
                    fs.remove(path.join(__dirname, "logs", f.name))
                })
            }
        })
    }
    function accessLevelAuthorization(accessLevel, req, res, next) {
        if (req.userSession && req.userSession.access_level <= accessLevel) next()
        else res.sendStatus(401)
    }
    function getFirstExistentFileInArray(arr, elm = 0) {
        if (elm >= arr.length) return null;

        let exist = fs.existsSync(arr[ elm ]);
        let ret;

        if (exist) {
            return arr[ elm ];
        } else {
            return getFirstExistentFileInArray(arr, ++elm);
        }
    }
    function length(obj) {
        return Object.keys(obj).length;
    }
    function parseValue(str) {
        if (str === 'true') return true;
        else if (str === 'false') return false;
        else return str
    }

    function wssBroadcast(data, ws = null) {
        console.log("WS Broadcast", data);
        wss.clients.forEach(function each(client) {
            if ((client !== ws) && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
    function get_free_port(checkPort, callback = () => { }, max_port_tries = 15) {
        console.log("Looking for free port close to " + checkPort);
        const ip = config?.web_server?.bind_ip || '0.0.0.0';
        try {
            fp(checkPort, ip, _tryStart)
        } catch (err) { }

        let tries = 0;
        let checked_ports = [];
        async function _tryStart(err, freePort) {
            checked_ports.push(freePort)
            let port = freePort;
            let tmpSrv = http.createServer();
            let error = false;

            await tmpSrv.listen(port, ip).on("error", (e) => {
                console.error(" > Failed", e.port);
                error = true;
                let new_try_port = (checkPort == 443 ? 4443 : 8080) + (tries * 100);

                if (++tries < max_port_tries) {
                    try {
                        fp(new_try_port, _tryStart);
                    } catch (error) { }
                } else {
                    console.error(" > Couldn't find a free port.\n > Terminating process...");
                    process.exit(1);
                }
            })
            tmpSrv.close();
            if (!error) {
                console.log(" > Found free port: " + port)
                callback(port)
            }

        }
    }
    function objArrToValArr(arr, ...key) {
        let vet = [];
        for (let o of arr) {
            let obj = o;
            for (let k of key) {
                if (obj[ k ])
                    obj = obj[ k ];
            }
            vet.push(obj);
        }
        return vet;
    }
}

// installUpdateDependencies();
init();


function restartProcess(delay = 0, code = 0, args = null, forceRestart = false) {
    if ((args && args[ "self-pm" ] && args[ "self-pm" ] == true) || forceRestart/*args["using-pm"] && args["using-pm"] == true*/) {
        process.on("exit", function () {
            console.log("Process terminated\nStarting new process");
            require("child_process").spawn(process.argv.shift(), process.argv, {
                cwd: process.cwd(),
                detached: true,
                stdio: "inherit"
            });
        });
        setTimeout(() => {
            closeSubcomponents(() => {
                process.exit(code);
            });
        }, delay)
    } else {

        setTimeout(() => {
            console.log("Terminating execution. Process manager will restart me.")
            closeSubcomponents(() => {
                process.exit(code);
            });
        }, delay)
    }

    function closeSubcomponents(cb) {
        if (cb) cb();
        // if (subcomponent_status.squadjs) {
        //     console.log("SquadJS WebSocket\n > Closing")
        //     // subcomponent_data.squadjs.socket.removeAllListeners();
        //     subcomponent_data.squadjs.socket.close(() => {
        //         console.log(" > Closed")
        //         if (cb) cb();
        //     })
        // } else {
        //     if (cb) cb();

        // }
    }
}

function terminateAndSpawnChildProcess(code = 0, delay = 0) {
    process.on("exit", function () {
        console.log("Process terminated\nStarting new process");
        require("child_process").spawn(process.argv.shift(), process.argv, {
            cwd: process.cwd(),
            detached: true,
            stdio: "inherit"
        });
    });
    setTimeout(() => {
        process.exit(code);
    }, delay)
}