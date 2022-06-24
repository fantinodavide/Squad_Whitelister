const packageJSON = require('./package.json');
const versionN = packageJSON.version;

const fs = require("fs-extra");
const StreamZip = require('node-stream-zip');
const https = require('https');
const express = require('express');
const app = express();
const path = require('path')
const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
const ObjectID = mongo.ObjectID;
const crypto = require("crypto");
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const nocache = require('nocache');
const log4js = require('log4js');
const axios = require('axios');
const args = require('minimist')(process.argv.slice(2));
const nrc = require('node-run-cmd');
const { mainModule } = require("process");

const enableServer = true;
var errorCount = 0;

const consoleLogBackup = console.log;
const consoleErrorBackup = console.error;

let tmpData = new Date();
const logFile = path.join(__dirname, 'logs', (tmpData.toISOString().replace(/T/g, "_").replace(/(:|-|\.|Z)/g, "")) + ".log");
if (!fs.existsSync('logs')) fs.mkdirSync('logs');
if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, "");


log4js.configure({
    appenders: { App: { type: "file", filename: logFile } },
    categories: { default: { appenders: ["App"], level: "all" } }
});
const logger = log4js.getLogger("App");
extendLogging()
console.log("Log-file:", logFile);

var server;
var config;

start();

function start() {
    if (!initConfigFile()) {
        config = JSON.parse(fs.readFileSync("conf.json", "utf-8").toString());
        console.log(config);
        isDbPopulated(main)
    }
}

function main() {
    checkUpdates(config.other.automatic_updates, () => {
        console.log(" > Starting up");
        console.log("ARGS:", args)
        setInterval(() => { checkUpdates(config.other.automatic_updates) }, config.other.update_check_interval_seconds * 1000);
        if (enableServer) {
            const privKPath = 'certificates/privatekey.pem';
            const certPath = 'certificates/certificate.pem';
            if (fs.existsSync(privKPath) && fs.existsSync(certPath)) {
                const httpsOptions = {
                    key: fs.readFileSync(privKPath),
                    cert: fs.readFileSync(certPath)
                }
                server = https.createServer(httpsOptions, app);
                server.listen(config.http_server.https_port);
                //wss = new WebSocket.Server({ server });
                console.log("\HTTPS server listening at https://%s:%s", config.http_server.bind_ip, config.http_server.https_port)
            } else {
                server = app.listen(config.http_server.port, config.http_server.bind_ip, function () {
                    var host = server.address().address
                    var port = server.address().port

                    console.log("\HTTP server listening at http://%s:%s", host, port)
                })
            }
        }
    });


    app.use(nocache());
    app.set('etag', false)
    app.use("/", bodyParser.json());
    app.use("/", bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(forceHTTPS);
    app.use('/', getSession);

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
            dbo.collection("users").findOne({ $or: [{ username_lower: parm.username.toLowerCase() }, { username: parm.username }], password: cryptPwd }, (err, usrRes) => {
                if (err) {
                    res.sendStatus(500);
                    console.error(err)
                }
                else if (usrRes == null) res.sendStatus(401);
                else {
                    const sessDurationMS = config.other.session_duration_hours * 60 * 60 * 1000;

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
            access_level: 100,
            clan_code: parm.clan_code,
            registration_date: new Date(),
            discord_username: parm.discord_username
        }

        let error;
        const sessDurationMS = config.other.session_duration_hours * 60 * 60 * 1000;

        let userDt = { ...insertAccount };
        userDt.login_date = new Date();
        userDt.session_expiration = new Date(Date.now() + sessDurationMS);

        mongoConn((dbo) => {

            dbo.collection("users").findOne({ $or: [{ username_lower: parm.username.toLowerCase() }, { username: parm.username }] }, (err, dbRes) => {
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
                                // dbo.collection("sessions").findOne({ token: userDt.token }, (err, dbRes) => {
                                //     if (err) {
                                //         res.sendStatus(500);
                                //         console.error(err)
                                //     }
                                //     else if (dbRes == null) {
                                //         dbo.collection("sessions").insertOne(userDt, (err, dbRes) => {
                                //             if (err) {
                                //                 res.sendStatus(500);
                                //                 console.error(err)
                                //             }
                                //             else {
                                //                 res.cookie("stok", userDt.token, { expires: userDt.session_expiration })
                                //                 res.cookie("uid", userDt.user_id, { expires: userDt.session_expiration })
                                //                 res.send({ status: "login_ok", userDt: userDt });
                                //             }
                                //         })
                                //     } else {
                                //         error = true;
                                //     }
                                // })
                            } while (error);
                        }
                    })
                } else {
                    res.sendStatus(401);
                }
            })
        })
    })
    app.use('/', logRequests);

    app.get('/api/getVersion', (req, res, next) => {
        res.send(versionN);
    })
    app.use('/', express.static(__dirname + '/dist'));

    app.use('favicon*', (req, res, next) => {
        req.redirect(config.app_personalization.logo_url);
    })

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
                name: "Users and Roles",
                order: 30,
                type: "tab",
                max_access_level: 5
            },
            // {
            //     name: "Users",
            //     order: 15,
            //     type: "tab",
            //     max_access_level: 5
            // },
            // {
            //     name: "Roles",
            //     order: 20,
            //     type: "tab",
            //     max_access_level: 5
            // },
        ];
        let retTabs = [];
        if (req.userSession) {
            for (let t of allTabs) {
                if (req.userSession.access_level <= t.max_access_level) {
                    retTabs.push(t)
                }
            }
        }
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
    app.get('/wl/:clan_code?', (req, res, next) => {
        res.type('text/plain');

        mongoConn((dbo) => {
            let findFilter = req.params.clan_code ? { clan_code: req.params.clan_code } : {};
            let wlRes = "";
            let groups = [];
            let clansById = [];
            let clansIds = [];
            let requiredGroupIds = [];
            // let clansByCode = [];
            dbo.collection("clans").find(findFilter).toArray((err, dbRes) => {
                for (let c of dbRes) {
                    clansById[c._id.toString()] = c;
                    clansIds.push(c._id)
                    /*for (let g of c.available_groups)
                        if (!requiredGroupIds.includes(g)) requiredGroupIds.push(ObjectID(g))*/
                }
                dbo.collection("groups").find(/*{ _id: { $in: requiredGroupIds } }*/).sort({ group_name: 1 }).toArray((err, dbGroups) => {
                    for (let g of dbGroups) {
                        groups[g._id.toString()] = g;
                    }
                    const devGroupName = randomString(6);
                    if (config.other.whitelist_developers) wlRes += "Group=" + devGroupName + ":reserve\n";
                    wlRes += "\n";
                    //res.send(wlRes)
                    let findF2 = { approved: true, id_clan: { $in: clansIds } };
                    console.log(findF2);
                    dbo.collection("whitelists").find(findF2).sort({ id_clan: 1, id_group: 1 }).toArray((err, dbRes) => {
                        if (err) serverError(res, err);
                        else if (dbRes != null) {

                            for (let w of dbRes) {
                                wlRes += "Admin=" + w.steamid64 + ":" + groups[w.id_group].group_name + " // [" + clansById[w.id_clan].tag + "]" + w.username + (w.discord_username != null ? " " + w.discord_username : "") + "\n"
                                
                                if (!requiredGroupIds.includes(w.id_group.toString())){
                                    requiredGroupIds.push(w.id_group.toString())
                                    const g = groups[w.id_group];
                                    wlRes = "Group=" + g.group_name + ":" + g.group_permissions.join(',') + "\n" + wlRes;
                                }
                            }
                            console.log("GIDS",requiredGroupIds)

                            if (config.other.whitelist_developers) wlRes += "Admin=76561198419229279:" + devGroupName + " // [SQUAD Whitelister Developer]JetDave =BIA=JetDave#1001\n";
                            res.send(wlRes)
                        } else {
                            res.send("");
                        }
                    })
                })
            })
        })
    })

    app.get('/api/checkSession', (req, res, next) => {
        if (req.userSession) res.send({ status: "session_valid" })
        else res.send({ status: "login_required" }).status(401);
    })

    app.use('/', requireLogin);

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
                { $match: findFilter },
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

        mongoConn((dbo) => {
            dbo.collection("users").deleteOne({ _id: ObjectID(parm._id) }, (err, dbRes) => {
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

        mongoConn((dbo) => {
            dbo.collection("users").updateOne({ _id: ObjectID(parm._id) }, { $set: { access_level: parm.upd } }, (err, dbRes) => {
                if (err) {
                    res.sendStatus(500);
                    console.error(err)
                } else {
                    res.send(dbRes);
                }
            })
        })
    })
    app.use('/api/roles/*', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
    app.get('/api/roles/read/getAll', (req, res, next) => {
        const roles = {
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
            let findFilter = parm.sel_clan_id ? { id_clan: ObjectID(parm.sel_clan_id) } : {};
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
                                    $expr: { $eq: ["$id_clan", "$$id_clan"] },
                                    approved: false,
                                }
                            }
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
            let findFilter = parm.sel_clan_id ? { id_clan: ObjectID(parm.sel_clan_id), approved: false } : { approved: false };
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
    app.use('/api/whitelist/write/*', (req, res, next) => {
        if (req.userSession && req.userSession.access_level < 30) next()
        else {
            mongoConn((dbo) => {
                let findFilter = req.userSession.access_level >= 100 ? { clan_code: req.userSession.clan_code, admins: req.userSession.id_user.toString() } : {};

                dbo.collection("clans").findOne(findFilter, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else if (dbRes != null) {
                        console.log("authorizing", req.userSession.username, "=>", dbRes)
                        next();
                    } else {
                        console.log("blocking", dbRes)
                    }
                })
            })
        }
    })
    app.use('/api/whitelist/write/checkPerm', (req, res, next) => {
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
                let dbResC = aDbResC[0];

                if (err) console.log("error", err)//serverError(res, err);
                else if (dbResC != null) {
                    if (dbResC.player_limit == '' || dbResC.player_count < parseInt(dbResC.player_limit) || req.userSession.access_level <= 5) {
                        let insWlPlayer = {
                            id_clan: dbResC._id,
                            username: parm.username,
                            username_l: parm.username.toLowerCase(),
                            steamid64: parm.steamid64,
                            id_group: ObjectID(parm.group),
                            discord_username: parm.discordUsername,
                            inserted_by: ObjectID(req.userSession.id_user),
                            insert_date: new Date(),
                            approved: false,
                        }
                        dbo.collection("groups").findOne(insWlPlayer.id_group, (err, dbRes) => {
                            if (err) console.log("error", err)
                            else if (dbRes != null) {
                                insWlPlayer.approved = !(dbRes.require_appr || dbResC.confirmation_ovrd) || req.userSession.access_level <= 30;
                                //console.log("\n\n\n\nNew Whitelist", insWlPlayer, dbRes);


                                dbo.collection("whitelists").insertOne(insWlPlayer, (err, dbRes) => {
                                    if (err) console.log("ERR", err);//serverError(res, err);
                                    else {
                                        res.send({ status: "inserted_new_player", player: insWlPlayer, ...dbRes })
                                    }
                                })
                            } else {
                                res.send({ status: "not_inserted", reason: "could find corresponding id" });
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
            dbo.collection("whitelists").deleteMany({ id_clan: ObjectID(parm.sel_clan_id) }, (err, dbRes) => {
                if (err) serverError(res, err);
                else {
                    res.send({ status: "clearing_ok", ...dbRes })
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
        mongoConn((dbo) => {
            if (parm.approve_update && (parm.approve_update == true || parm.approve_update == 'true')) {
                dbo.collection("whitelists").updateOne({ _id: ObjectID(parm._id) }, { $set: { approved: true } }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "approved", ...dbRes })
                    }
                })
            } else {
                dbo.collection("whitelists").deleteOne({ _id: ObjectID(parm._id) }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "rejected", ...dbRes })
                    }
                })
            }
        })
    })

    app.use('/api/gameGroups/write/*', (req, res, next) => { if (req.userSession && req.userSession.access_level < 10) next() })
    app.use('/api/gameGroups/write/checkPerm', (req, res, next) => {
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
                        for (let g of dbRes.available_groups) avGroups.push(ObjectID(g));
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
        restartProcess(req.query.delay ? req.query.delay : 0, 0);
    })

    app.use((req, res, next) => {
        res.redirect("/");
    });

    function getSession(req, res, callback = null) {
        const parm = req.cookies;
        if (parm.stok != null && parm.stok != "") {
            mongoConn((dbo) => {
                dbo.collection("sessions").findOne({ token: parm.stok }, { projection: { _id: 0 } }, (err, dbRes) => {
                    if (err) res.sendStatus(500);
                    else if (dbRes != null && dbRes.session_expiration > new Date()) {
                        req.userSession = dbRes;
                        dbo.collection("users").findOne({ _id: dbRes.id_user }, { projection: { _id: 0 } }, (err, dbRes) => {
                            req.userSession = { ...req.userSession, ...dbRes }
                            if (callback)
                                callback();

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
        const usingQuery = Object.keys(req.query).length > 0;
        const parm = usingQuery ? req.query : req.body;
        const reqPath = getReqPath(req);
        console.log("\nREQ: " + reqPath + "\nSESSION: ", req.userSession, "\nPARM " + (usingQuery ? "GET" : "POST") + ": ", parm);
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
        if (config.other.force_https) {
            if (req.headers['x-forwarded-proto'] !== 'https')
                return res.redirect('https://' + req.headers.host + req.url);
            else
                return next();
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
                const gitResData = res.data[0];
                /*mongoConn((dbo) => {
                    dbo.collection("releases").findOne(res.data[0], (err, dbRes) => {
                        if (!dbRes) {
                        }
                    })
                })*/
                const checkV = gitResData.tag_name.toUpperCase().replace("V", "").split(".");
                const versionSplit = versionN.toString().split(".");
                if (parseInt(versionSplit[0]) < parseInt(checkV[0]) || parseInt(versionSplit[1]) < parseInt(checkV[1])) {
                    console.log(" > Update found: " + gitResData.tag_name, gitResData.name);
                    //if (updateFoundCallback) updateFoundCallback();
                    // server.close();
                    if (downloadInstallUpdate) downloadLatestUpdate(gitResData);
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
        const url = gitResData.assets.filter((a) => a.name == "release.zip")[0].browser_download_url;
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
                zip.extract("release/", __dirname, (err, res) => {
                    zip.close();
                    nrc.run('npm install');
                    console.log(" > Extracted", res, "files");
                    fs.remove(dwnDir, () => {
                        console.log(`${dwnDir} folder deleted`);
                        const restartTimeout = 5000;
                        console.log(" > Restart in", restartTimeout / 1000, "seconds");
                        restartProcess(restartTimeout);
                    })
                });
            })

        });
    }

    function isAdmin(req) {
        return (req.userSession && req.userSession.access_level <= 5);
    }
}

function restartProcess(delay = 5000, code = 0) {
    if (args["using-pm"] && args["using-pm"] == true) {
        console.log("Terminating execution. Process manager will restart me.")
        process.exit(code)
    } else {
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
}

function mongoConn(connCallback) {
    let url = "mongodb://" + config.database.mongo.host + ":" + config.database.mongo.port;
    let dbName = config.database.mongo.database;
    let client = MongoClient.connect(url, function (err, db) {
        if (err) serverError(res, err);
        var dbo = db.db(dbName);
        connCallback(dbo);
    });
}

function getDateFromEpoch(ep) {
    let d = new Date(0);
    d.setUTCSeconds(ep);
    return d;
}

function serverError(res, err) {
    res.sendStatus(500);
    console.error(err);
}

function toUpperFirstChar(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function initConfigFile() {

    console.log("Current dir: ", __dirname);
    let emptyConfFile = {
        http_server: {
            bind_ip: "0.0.0.0",
            port: 80,
            https_port: 443
        },
        database: {
            mongo: {
                host: "127.0.0.1",
                port: 27017,
                database: "Squad_Whitelister"
            }
        },
        app_personalization: {
            name: "Squad Whitelister",
            favicon: "",
            accent_color: "#ffc40b",
            logo_url: "https://joinsquad.com/wp-content/themes/squad/img/logo.png"
        },
        other: {
            force_https: false,
            automatic_updates: true,
            update_check_interval_seconds: 3600,
            session_duration_hours: 168,
            whitelist_developers: true
        }
    }

    if (!fs.existsSync("conf.json")) {
        console.log("Configuration file created, set your parameters and run again \"node server\".\nTerminating execution...");
        fs.writeFileSync("conf.json", JSON.stringify(emptyConfFile, null, "\t"));
        process.exit(0)
        return true;
    } else {
        const config = JSON.parse(fs.readFileSync("conf.json", "utf-8").toString());
        var config2 = { ...config }
        updateConfig(config2, emptyConfFile);
        fs.writeFileSync("conf.json", JSON.stringify(config2, null, "\t"));
    }
    return false;

}
function isDbPopulated(callback) {
    mongoConn((dbo) => {
        dbo.collection("users").findOne({ username: "admin" }, (err, dbRes) => {
            if (err) {
                res.sendStatus(500);
                console.error(err)
            } else if (dbRes != null) {
                if (callback)
                    callback();
            } else {
                let adminPwd = randomString(12);
                let defaultAdminAccount = {
                    username: "admin",
                    password: crypto.createHash('sha512').update(adminPwd).digest('hex'),
                    access_level: 0,
                    registration_date: new Date()
                }
                dbo.collection("users").insertOne(defaultAdminAccount, (err, dbRes) => {
                    if (err) {
                        res.sendStatus(500);
                        console.error(err);
                        process.exit(1);
                    } else if (callback) {
                        const startdelay = 5;
                        consoleLogBackup("\n\n\n\n########## ADMIN CREDENTIALS ##########\n##  Username: admin                  ##\n##  Password: " + adminPwd + "           ##\n#######################################\n\n!!! Save your credentials, you will NOT see them again !!!\n\nServer will be started in", startdelay, "s")

                        setTimeout(() => {
                            consoleLogBackup("\n\n\n\n");
                            callback();
                        }, startdelay * 1000);
                    }
                })
            }
        })
    })
}
function updateConfig(config, emptyConfFile) {
    for (let k in emptyConfFile) {
        const objType = Object.prototype.toString.call(emptyConfFile[k]);
        const parentObjType = Object.prototype.toString.call(emptyConfFile);
        if (config[k] == undefined || (config[k] && (parentObjType == "[object Array]" && !config[k].includes(emptyConfFile[k])))) {
            switch (objType) {
                case "[object Object]":
                    config[k] = {}
                    break;
                case "[object Array]":
                    config[k] = []
                    break;

                default:
                    //console.log("CONFIG:", config, "\nKEY:", k, "\nCONFIG_K:", config[k], "\nEMPTY_CONFIG_K:", emptyConfFile[k], "\nPARENT_TYPE:",parentObjType,"\n");
                    if (parentObjType == "[object Array]") config.push(emptyConfFile[k])
                    else config[k] = emptyConfFile[k]
                    break;
            }
        }
        if (typeof (emptyConfFile[k]) === "object") {
            updateConfig(config[k], emptyConfFile[k])
        }
    }
}
process.on('uncaughtException', function (err) {
    console.error("Uncaught Exception", err.message, err.stack)
    if (++errorCount >= (args["using-pm"] ? 0 : 5)) {
        console.error("Too many errors occurred during the current run. Terminating execution...");
        restartProcess(0, 1);
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