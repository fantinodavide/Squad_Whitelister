const { match } = require('assert');
const cp = require('child_process');
var installingDependencies = false;
const irequire = async module => {
    console.log(`Requiring "${module}"`)
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

const CONFIG_NUMERIC_BOUNDS = {
    other: {
        logs_max_file_size_mb: { min: 1, max: 1000 },
        logs_max_buffer_size_mb: { min: 0.1, max: 5 },
        update_check_interval_seconds: { min: 1800, max: 14400 },
        lists_cache_refresh_seconds: { min: 15, max: 300 },
    }
};

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

var apiDocsJson = null

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
    // body-parser removed: Express 5 has built-in express.json() / express.urlencoded()
    const cookieParser = await irequire('cookie-parser');
    const { default: mongoSanitizer, sanitize: mongoSanitize } = await irequire('mongo-sanitizer');
    const nocache = await irequire('nocache');
    const axios = await irequire('axios');
    const args = (await irequire('minimist'))(process.argv.slice(2));
    const nrc = await irequire('node-run-cmd');
    const forceSSL = await irequire('express-force-ssl');
    const fp = await irequire("find-free-port")
    const { mainModule } = await irequire("process");
    const Discord = await irequire("discord.js");
    const { io } = await irequire("socket.io-client");
    const dns = await irequire('dns')
    const { rateLimit } = await irequire('express-rate-limit')
    const { EJSON } = await irequire('bson');
    const tar = await irequire('tar');
    const { createGzip, createGunzip } = require('zlib');
    const { pipeline } = require('stream/promises');
    const { Transform } = require('stream');
    const readline = require('readline');
    const util = require('util');
    const lookup = util.promisify(dns.lookup);

    function safeObjectID(id) {
        try {
            if (!id || typeof id !== 'string') return null;
            return ObjectID(id);
        } catch (e) {
            return null;
        }
    }
    function isStringInjectionSafe(input) {
        return (
            typeof input === 'string' &&
            !/^\$|\x00/.test(input)
        )
    }

    try {
        (await irequire('dotenv')).config();
    } catch (error) {
        console.error(error)
    }

    const enableServer = true;
    var errorCount = 0;
    var errerCountResetTimeout = null;

    const configPath = args.c || "conf.json"
    const BACKUP_DIR = path.join(__dirname, 'backups');

    const consoleLogBackup = console.log;
    const consoleErrorBackup = console.error;

    let tmpData = new Date();
    const logFile = path.join(__dirname, 'logs', (tmpData.toISOString().replace(/T/g, "_").replace(/(:|-|\.|Z)/g, "")) + ".log");
    if (!fs.existsSync('logs')) fs.mkdirSync('logs');
    if (!fs.existsSync(logFile)) fs.writeFileSync(logFile, "");

    const logBuffer = {
        buffer: [],
        bufferSize: 0,
        debounceMs: 3000,
        timeout: null,
        disabled: false,

        get maxFileSizeMB() { return config?.other?.logs_max_file_size_mb ?? 250; },
        get maxBufferSizeMB() { return config?.other?.logs_max_buffer_size_mb ?? 10; },

        add(message) {
            if (this.disabled) return;
            const msgSize = Buffer.byteLength(message, 'utf8');
            const maxBufferBytes = this.maxBufferSizeMB * 1024 * 1024;

            if (this.bufferSize + msgSize > maxBufferBytes) {
                this.flush();
            }

            this.buffer.push(message);
            this.bufferSize += msgSize;
            this.scheduleFlush();
        },

        scheduleFlush() {
            if (this.timeout) return;
            this.timeout = setTimeout(() => this.flush(), this.debounceMs);
        },

        flush() {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
            if (this.buffer.length === 0 || this.disabled) return;

            try {
                const stats = fs.statSync(logFile);
                const fileSizeMB = stats.size / (1024 * 1024);
                if (fileSizeMB >= this.maxFileSizeMB) {
                    this.disabled = true;
                    consoleErrorBackup(`Log file exceeded ${this.maxFileSizeMB}MB limit. Logging to file disabled.`);
                    this.buffer = [];
                    this.bufferSize = 0;
                    return;
                }
            } catch (e) { }

            const content = this.buffer.join('\n') + '\n';
            this.buffer = [];
            this.bufferSize = 0;
            fs.appendFile(logFile, content, (err) => {
                if (err) consoleErrorBackup('Error writing to log file:', err);
            });
        }
    };

    const logger = {
        trace: (...params) => logBuffer.add(`[TRACE] ${params.join(' ')}`),
        error: (...params) => logBuffer.add(`[ERROR] ${params.join(' ')}`)
    };

    process.on('exit', () => logBuffer.flush());
    process.on('SIGINT', () => { logBuffer.flush(); process.exit(); });
    process.on('SIGTERM', () => { logBuffer.flush(); process.exit(); });

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
            requests: true
        }
    };
    var squadjs = {
        ws: null,
        initDone: false
    }
    var urlCalls = []
    /**
     * @description Variable that stores the content of the Whitelister configuration file
     */
    var config;

    const mongodb_global_connection = true;
    var mongodb_conn;

    var discordClient;

    const wlOutputCache = new Map();
    const wlOutputCacheLastUpdates = new Map();

    const globalLimiter = rateLimit({
        windowMs: 60_000,
        limit: 1000,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        ipv6Subnet: 56,
    })
    const anonymousLimiter = rateLimit({
        windowMs: 60_000,
        limit: 50,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        ipv6Subnet: 56,
    })
    const authenticatedLimiter = rateLimit({
        windowMs: 60_000,
        limit: 500,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        ipv6Subnet: 56,
    })
    const signupLimiter = rateLimit({
        windowMs: 60 * 60_000,
        limit: 3,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        ipv6Subnet: 56,
    })
    const loginLimiter = rateLimit({
        windowMs: 30_000,
        limit: 6,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        ipv6Subnet: 56,
    })

    const blacklistedIPs = new Set();

    const isPrivateIP = (ip) => {
        if (!ip) return true;
        const cleaned = ip.replace(/^::ffff:/, '');
        return cleaned === '0.0.0.0' || cleaned === '127.0.0.1' || cleaned === '::1' || cleaned === 'localhost'
            || /^10\./.test(cleaned) || /^172\.(1[6-9]|2\d|3[01])\./.test(cleaned) || /^192\.168\./.test(cleaned)
            || /^fc00:/i.test(cleaned) || /^fd/i.test(cleaned) || /^fe80:/i.test(cleaned);
    };

    const containsWhitelistInjection = (value) => {
        if (typeof value !== 'string') return false;
        return /Group=/i.test(value) || /Admin=/i.test(value);
    };

    const getClientIP = (req) => req.ip || req.connection?.remoteAddress || '';

    async function blacklistIP(ip, reason) {
        if (!ip || isPrivateIP(ip)) return;
        blacklistedIPs.add(ip);
        try {
            const dbo = await mongoConn();
            await dbo.collection('ip_blacklist').updateOne(
                { ip },
                { $set: { ip, reason, date: new Date() }, $inc: { strike_count: 1 } },
                { upsert: true }
            );
            console.log(`Blacklisted IP: ${ip} (${reason})`);
        } catch (error) {
            console.error('Error blacklisting IP:', error);
        }
    }

    async function loadIPBlacklist() {
        try {
            const dbo = await mongoConn();
            const entries = await dbo.collection('ip_blacklist').find({}).toArray();
            entries.forEach(e => blacklistedIPs.add(e.ip));
            if (entries.length > 0)
                console.log(`Loaded ${entries.length} blacklisted IP(s)`);
        } catch (error) {
            console.error('Error loading IP blacklist:', error);
        }
    }

    start();

    function start() {
        initConfigFile(() => {
            const repairResult = repairConfigFile();
            if (repairResult.success && repairResult.repaired) {
                console.log(`Config file repaired (backup: ${repairResult.backupPath})`);
            }

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
                if (dbo)
                    console.log(" > Successfully connected");
                else {
                    console.error(" > Unable to connect");
                    restartProcess(5, 1, null, true);
                }
                mongodb_conn = dbo;

                clearTimeout(tm);
                if (callback) callback();
            }, true)
        }
    }

    async function clearAllApiKeys() {
        try {
            const dbo = await mongoConn();
            const result = await dbo.collection('keys').deleteMany({});
            console.log(`   > Cleared ${result.deletedCount} API key(s)`);
        } catch (error) {
            console.error('   > Error clearing API keys:', error);
        }
    }
    async function invalidateAllSessions() {
        try {
            const dbo = await mongoConn();
            const result = await dbo.collection('sessions').deleteMany({});
            console.log(`   > Cleared ${result.deletedCount} Session(s)`);
        } catch (error) {
            console.error('   > Error clearing Sessions:', error);
        }
    }
    async function deleteUsersWithInvalidClanCode() {
        try {
            const dbo = await mongoConn();
            const cutoffDate = new Date('2025-12-01T00:00:00.000Z');
            const validClans = await dbo.collection('clans').distinct('clan_code');
            const result = await dbo.collection('users').deleteMany({
                clan_code: { $nin: validClans },
                access_level: { $ne: 0 },
                registration_date: { $gte: cutoffDate }
            });
            console.log(`   > Deleted ${result.deletedCount} user(s) with invalid clan code`);
        } catch (error) {
            console.error('   > Error deleting users with invalid clan code:', error);
        }
    }
    function clearSquadJSHosts() {
        try {
            if (!config.squadjs || !Array.isArray(config.squadjs)) return;
            let cleared = 0;
            config.squadjs.forEach((entry) => {
                if (entry?.websocket?.host) {
                    entry.websocket.host = '';
                    entry.websocket.token = '';
                    cleared++;
                }
            });
            fs.writeFileSync(configPath + ".bak", fs.readFileSync(configPath));
            fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
            console.log(`   > Cleared ${cleared} SquadJS host(s)`);
        } catch (error) {
            console.error('   > Error clearing SquadJS hosts:', error);
        }
    }

    async function resetSeedingTrackerConfig() {
        try {
            const dbo = await mongoConn();
            const currentConfig = await dbo.collection('configs').findOne({ category: 'seeding_tracker' });

            if (!currentConfig?.config) {
                return;
            }

            const rewardNeededTime = currentConfig.config.reward_needed_time?.value || 0;
            const seedingPlayerThreshold = currentConfig.config.seeding_player_threshold || 0;
            const seedingStartPlayerCount = currentConfig.config.seeding_start_player_count || 0;

            if (rewardNeededTime === 0 && seedingPlayerThreshold > 100 && seedingStartPlayerCount === 0) {
                const defaultConfig = {
                    reset_seeding_time: { value: 1, option: 86400000 },
                    reward_needed_time: { value: 1, option: 3600000 },
                    reward_group_id: "",
                    next_reset: "",
                    seeding_player_threshold: 50,
                    seeding_start_player_count: 2,
                    reward_enabled: "false",
                    discord_seeding_reward_channel: "",
                    discord_seeding_score_channel: "",
                    tracking_mode: "incremental",
                    time_deduction: { value: 1, option: "perc_minute" },
                    minimum_reward_duration: { value: 1, option: 3600000 }
                };
                await dbo.collection('configs').updateOne(
                    { category: 'seeding_tracker' },
                    { $set: { config: defaultConfig } }
                );
                console.log('Reset seeding tracker config');
            }
        } catch (error) {
            console.error('Error resetting seeding tracker config:', error);
        }
    }

    async function fixSeedingTrackerRewardGroup() {
        try {
            const dbo = await mongoConn();
            const seedingConfig = await dbo.collection('configs').findOne({ category: 'seeding_tracker' });

            const rewardGroupId = seedingConfig?.config?.reward_group_id;

            let rewardGroup = null;
            let needsReplacement = false;
            let reason = '';

            if (rewardGroupId === null || rewardGroupId === undefined) {
                return;
            }

            if (rewardGroupId === '') {
                needsReplacement = true;
                reason = 'Empty reward_group_id';
            }

            if (!needsReplacement) {
                try {
                    rewardGroup = await dbo.collection('groups').findOne({ _id: safeObjectID(rewardGroupId) });
                } catch (err) {
                    needsReplacement = true;
                    reason = 'Invalid reward_group_id format';
                }
            }

            if (!needsReplacement && !rewardGroup) {
                needsReplacement = true;
                reason = reason || 'Reward group deleted';
            }

            if (!needsReplacement) {
                const permissions = rewardGroup?.group_permissions || [];
                const dangerousPerms = [ 'ban', 'immune', 'kick', 'changemap', 'canseeadminchat', 'config', 'camera' ];
                const hasDangerousPerms = permissions.some(p => dangerousPerms.includes(p.toLowerCase()));

                if (hasDangerousPerms) {
                    needsReplacement = true;
                    reason = `Dangerous permissions (${permissions.join(', ')})`;
                }
            }

            if (needsReplacement) {
                const safeGroup = await dbo.collection('groups').findOne({
                    group_permissions: { $size: 1, $all: [ 'reserve' ] }
                });

                if (safeGroup) {
                    await dbo.collection('configs').updateOne(
                        { category: 'seeding_tracker' },
                        { $set: { 'config.reward_group_id': safeGroup._id.toString() } }
                    );
                    console.log(`Seeding tracker reward group: ${reason}, switched to safe group: ${safeGroup.group_name}`);
                } else {
                    await dbo.collection('configs').updateOne(
                        { category: 'seeding_tracker' },
                        { $set: { 'config.reward_group_id': '' } }
                    );
                    console.log(`Seeding tracker reward group: ${reason}, no safe group found, cleared reference`);
                }
            }
        } catch (error) {
            console.error('Error fixing seeding tracker reward group:', error);
        }
    }

    async function sanitizeWhitelistPlayerIds(dbo) {
        try {
            const injectionPattern = /Group=|Admin=/i;
            const invalidIdFilter = {
                $or: [
                    { steamid64: { $exists: true, $nin: [ null, '' ], $not: { $regex: /^\d{17}$/ } } },
                    { eosID: { $exists: true, $nin: [ null, '' ], $not: { $regex: /^[a-f\d]{32}$/ } } }
                ]
            };
            const injectionFilter = {
                $or: [
                    { username: { $regex: injectionPattern } },
                    { steamid64: { $regex: injectionPattern } },
                    { eosID: { $regex: injectionPattern } },
                    { discord_username: { $regex: injectionPattern } }
                ]
            };
            const wlResult = await dbo.collection('whitelists').deleteMany({ $or: [ invalidIdFilter, injectionFilter ] });
            if (wlResult.deletedCount > 0)
                console.log(`Sanitized ${wlResult.deletedCount} whitelist(s) with invalid player IDs or injected names`);

            const groupResult = await dbo.collection('groups').deleteMany({ group_name: { $regex: injectionPattern } });
            if (groupResult.deletedCount > 0)
                console.log(`Sanitized ${groupResult.deletedCount} group(s) with injected names`);

            const clanResult = await dbo.collection('clans').deleteMany({
                $or: [
                    { full_name: { $regex: injectionPattern } },
                    { tag: { $regex: injectionPattern } }
                ]
            });
            if (clanResult.deletedCount > 0)
                console.log(`Sanitized ${clanResult.deletedCount} clan(s) with injected names`);
        } catch (error) {
            console.error('Error sanitizing whitelist data:', error);
        }
    }

    async function checkAndRunFirstStartScripts() {
        try {
            const dbo = await mongoConn();
            const metadata = await dbo.collection('app_metadata').findOne({ key: 'app_version' });
            const storedVersion = metadata ? metadata.value : null;

            if (storedVersion !== versionN) {
                console.log(" > First start after update detected");
                console.log(`   Previous version: ${storedVersion || 'none (first install)'}`);
                console.log(`   Current version: ${versionN}`);

                switch (versionN) {
                    case '1.7.3':
                        await invalidateAllSessions();
                        await deleteUsersWithInvalidClanCode();
                        break;
                    case '1.7.0':
                        console.log(" > Version 1.7.0: Force-enabling automatic updates");
                        if (!config.other.automatic_updates) {
                            config.other.automatic_updates = true;
                            try {
                                fs.writeFileSync(configPath + ".bak", fs.readFileSync(configPath));
                                fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
                                console.log(" > Automatic updates enabled in conf.json");
                            } catch (err) {
                                console.error(" > Failed to update conf.json:", err);
                            }
                        }
                        break;
                    case '1.6.11':
                        await clearAllApiKeys();
                        await deleteUsersWithInvalidClanCode();
                        clearSquadJSHosts();
                        break;
                }

                await dbo.collection('app_metadata').updateOne(
                    { key: 'app_version' },
                    { $set: { value: versionN, updated_at: new Date() } },
                    { upsert: true }
                );

                console.log(' > First-start scripts completed');
            } else {
                console.log(` > Normal start (version ${versionN})`);
            }
        } catch (error) {
            console.error(' > Error checking first start status:', error);
        }
    }

    function main() {
        checkUpdates(config.other.automatic_updates, async () => {
            console.log(" > Starting up");

            setInterval(() => { checkUpdates(config.other.automatic_updates) }, config.other.update_check_interval_seconds * 1000);

            await checkAndRunFirstStartScripts();

            await generateApiDocs();

            resetSeedingTime();
            await scheduledBackup();

            await initWlCaches();
            setInterval(refreshWlCaches, config.other.lists_cache_refresh_seconds * 1000)

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

                    const httpServerDisabled = process.env.HTTP_SERVER_DISABLED === 'true' || process.env.HTTP_SERVER_DISABLED === '1' || config.web_server.http_server_disabled
                    const httpsServerDisabled = process.env.HTTPS_SERVER_DISABLED === 'true' || process.env.HTTPS_SERVER_DISABLED === '1' || config.web_server.https_server_disabled

                    var host = config.web_server.bind_ip;

                    if (!httpServerDisabled) {
                        const httpPort = envServerPort ? parseInt(envServerPort) : (envHttpPort ? parseInt(envHttpPort) : config.web_server.http_port);
                        const free_http_port = await new Promise(res => get_free_port(httpPort, res));
                        if (free_http_port) {
                            server.http = app.listen(free_http_port, config.web_server.bind_ip, function () {
                                console.log(`HTTP server listening at http://${host}:${free_http_port}`)
                                server.configs.http.port = free_http_port
                                logConfPortNotFree(config.web_server.http_port, free_http_port)
                            })
                        } else {
                            console.error("Couldn't start HTTP server");
                        }
                    } else
                        console.log('HTTP server disabled')

                    if (foundKey && foundCert && !httpsServerDisabled) {
                        const httpsPort = envHttpsPort ? parseInt(envHttpsPort) : config.web_server.https_port;
                        const free_https_port = await new Promise(res => get_free_port(httpsPort, res));
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
                            console.log(`HTTPS server listening at https://${host}:${free_https_port}`)
                            logConfPortNotFree(config.web_server.https_port, free_https_port)
                        } else {
                            console.error("Couldn't start HTTPS server");
                        }
                    } else
                        console.log('HTTPS server disabled')

                    startupDone();

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

        async function scheduledBackup() {
            await _checkBackup();
            setInterval(_checkBackup, 60 * 1000);

            async function _checkBackup() {
                try {
                    const dbo = await mongoConn();
                    const bt = await dbo.collection('configs').findOne({ category: 'backup' });
                    if (!bt) return;
                    const btConf = bt.config;
                    if (btConf.auto_backup && btConf.auto_backup.enabled && btConf.auto_backup.next_backup && new Date() > new Date(btConf.auto_backup.next_backup)) {
                        if (backupInProgress) return;
                        console.log('Running scheduled backup...');
                        await performBackup(dbo, btConf);
                        const next = new Date(Date.now() + (btConf.auto_backup.schedule.value * btConf.auto_backup.schedule.option)).toISOString().split(/T/)[ 0 ];
                        await dbo.collection('configs').updateOne(
                            { category: 'backup' },
                            { $set: { "config.auto_backup.next_backup": next } }
                        );
                        console.log('Scheduled backup complete. Next:', next);
                    }
                } catch (err) {
                    console.error('Scheduled backup failed:', err);
                }
            }
        }

        app.set('trust proxy', 1)
        app.use((req, res, next) => {
            if (blacklistedIPs.has(getClientIP(req))) return res.status(403).end();
            next();
        })

        app.use(globalLimiter)
        app.use(nocache());
        app.set('etag', false)
        app.use("/", express.json());
        app.use("/", express.urlencoded({ extended: true }));
        app.use(cookieParser());
        app.use(mongoSanitizer());
        app.use((req, res, next) => {
            const check = (obj) => {
                if (!obj || typeof obj !== 'object') return false;
                for (const [ key, val ] of Object.entries(obj)) {
                    if (containsWhitelistInjection(key)) return true;
                    if (typeof val === 'string' && containsWhitelistInjection(val)) return true;
                    if (typeof val === 'object' && val && check(val)) return true;
                }
                return false;
            };
            if (check(req.sanitizedBody) || check(req.sanitizedQuery) || check(req.sanitizedParams)) {
                blacklistIP(getClientIP(req), 'Whitelist injection');
                return res.status(403).send({ error: 'Forbidden' });
            }
            next();
        });
        app.use(forceHTTPS);
        app.use('/', getSession);
        app.use('/', (req, res, next) => {
            if (req.userSession)
                return authenticatedLimiter(req, res, next);
            else
                return anonymousLimiter(req, res, next);
        })
        app.use(detectRequestUrl);
        app.use(express.static(__dirname + '/dist'));

        app.use('/api/changepassword', loginLimiter);
        app.post('/api/changepassword', (req, res, next) => {
            const parm = req.sanitizedBody;

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

        app.use('/api/login', loginLimiter);
        app.post('/api/login', (req, res, next) => {
            const parm = req.body;

            const username = parm.username;
            const password = parm.password;

            if (!isStringInjectionSafe(username) || !isStringInjectionSafe(password)) {
                return res.status(400).send({ error: 'Invalid credentials format' });
            }

            if (username.length > 100 || password.length > 1000) {
                return res.status(400).send({ error: 'Input too long' });
            }

            mongoConn((dbo) => {
                let cryptPwd = crypto.createHash('sha512').update(password).digest('hex');
                dbo.collection("users").findOne({ $or: [ { username_lower: username.toLowerCase() }, { username: username } ], password: cryptPwd }, async (err, usrRes) => {
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
                            ip: getClientIP(req),
                        }

                        const dbo = await mongoConn();
                        let tokenExists = true;
                        while (tokenExists) {
                            sessionsDt.token = randomString(128);
                            tokenExists = await dbo.collection("sessions").findOne({ token: sessionsDt.token });
                        }

                        try {
                            await dbo.collection("sessions").insertOne(sessionsDt);
                            const clientIP = getClientIP(req);
                            const activeSessions = await dbo.collection('sessions').countDocuments({
                                ip: clientIP,
                                session_expiration: { $gt: new Date() }
                            });
                            if (activeSessions > 1) {
                                await dbo.collection('sessions').deleteMany({ ip: clientIP });
                                blacklistIP(clientIP, `Multiple concurrent sessions (${activeSessions})`);
                                return res.status(403).send({ error: 'Forbidden' });
                            }
                            res.cookie("stok", sessionsDt.token, { expires: sessionsDt.session_expiration, httpOnly: true, secure: config.web_server.force_https, sameSite: 'strict' })
                            res.cookie("uid", sessionsDt.id_user, { expires: sessionsDt.session_expiration, secure: config.web_server.force_https, sameSite: 'strict' })
                            res.send({ status: "login_ok", userDt: sessionsDt });
                        } catch (err) {
                            res.sendStatus(500);
                            console.error(err);
                        }
                    }
                })
            })
        })
        app.use('/api/signup', signupLimiter);
        app.post('/api/signup', async (req, res, next) => {
            const parm = req.sanitizedBody;

            if (typeof parm.username !== 'string' || typeof parm.password !== 'string') {
                return res.status(400).send({ error: 'Invalid credentials format' });
            }

            if (parm.username.length > 100 || parm.password.length > 1000) {
                return res.status(400).send({ error: 'Input too long' });
            }

            const isRootUser = !subcomponent_data.database.root_user_registered;

            const dbo = await mongoConn();

            if (!isRootUser) {
                if (!parm.clan_code) {
                    return res.status(400).send({ message: "Clan code is required", field: "clan_code" });
                }
                const clanExists = await dbo.collection("clans").findOne({ clan_code: parm.clan_code });
                if (!clanExists) {
                    return res.status(400).send({ message: "Invalid clan code", field: "clan_code" });
                }
            }

            let insertAccount = {
                username: parm.username,
                username_lower: parm.username.toLowerCase(),
                password: crypto.createHash('sha512').update(parm.password).digest('hex'),
                access_level: isRootUser ? 0 : 100,
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

            dbo.collection("users").findOne({ username_lower: parm.username.toLowerCase() }, (err, dbRes) => {
                if (err) {
                    res.sendStatus(500);
                    console.error(err);
                    return;
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
        app.use('/', logRequests);

        app.get('/api/getVersion', (req, res, next) => {
            res.send(versionN);
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
                {
                    name: "API",
                    order: 35,
                    type: "tab",
                    max_access_level: 5
                },
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
        // app.use('/wl*', removeExpiredPlayers);
        app.get('/:basePath/{:clan_code}', mongoSanitizer(), async (req, res, next) => {
            const output = await generateOutput(req.sanitizedParams.basePath, req.sanitizedParams.clan_code, req.sanitizedQuery?.usernamesOnly || false);

            if (!output)
                return next();

            res.type('text/plain');
            res.send(output)
        })

        async function generateOutput(basePath, clan_code = "", usernamesOnly = false, forceCacheReset = false) {
            const cacheKey = `/${basePath}/${clan_code}?${usernamesOnly}`
            let usingCache = false;
            let output;

            const cachedData = wlOutputCache.get(cacheKey);
            if (cachedData) {
                usingCache = true;
                output = cachedData;
            }

            const startTime = Date.now();

            if (!cachedData || forceCacheReset) {
                await removeExpiredPlayers()
                output = await getRawListOutput(basePath, clan_code, usernamesOnly)
            }

            if (!output) return null;

            const endTime = Date.now();
            const generationDuration = endTime - startTime;
            if (((generationDuration > 1000 || config.other.force_lists_output_caching) && !usingCache) || forceCacheReset) {
                // console.log(`Storing cache for ${cacheKey}`, basePath, clan_code, usernamesOnly)
                wlOutputCache.set(cacheKey, output)
                wlOutputCacheLastUpdates.set(cacheKey, new Date())
            }

            if (usingCache) {
                let cachedDataHeader =
                    `//////////////////////////////////////////////
                // Cached
                // Last update: ${wlOutputCacheLastUpdates.get(cacheKey).toLocaleString()}
                //////////////////////////////////////////////
                `.replace(/^\s*/mg, '')

                output = cachedDataHeader + "\n" + output;
            }

            return output;
        }
        function getRawListOutput(basePath, clan_code = "", usernamesOnly = false) {
            let output = new Promise((resolve, reject) => {
                mongoConn((dbo) => {
                    dbo.collection("lists").findOne({ output_path: basePath }, (err, dbResList) => {
                        if (err) serverError(res, err);
                        else if (dbResList != null) {

                            let findFilter = clan_code && clan_code != "" ? { clan_code: clan_code } : {};
                            let wlRes = "";
                            let groups = [];
                            let clansById = [];
                            let clansIds = [];
                            let requiredGroupIds = [];
                            let output = [];
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
                                                    eosID: w.eosID,
                                                    groupId: w.id_group,
                                                    expiration: w.expiration,
                                                    clanTag: clansById[ w.id_clan ].tag,
                                                    discordUsername: discordUsername
                                                })
                                            }

                                            if (!clan_code) {
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
                                                                        output_path: basePath
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
                                                                        eosID: w.eosID,
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
                                                                for (const w of dbRes) {
                                                                    output.push({
                                                                        username: w.username,
                                                                        steamid64: w.steamid64,
                                                                        eosID: w.eosID,
                                                                        groupId: sdConf.reward_group_id,
                                                                        clanTag: "Seeder",
                                                                        discordUsername: (w.discord_username != null ? w.discord_username : "")
                                                                    });
                                                                }
                                                                endFile()
                                                            })
                                                        } else
                                                            endFile()
                                                    })

                                                })
                                            } else endFile()


                                            function formatDocument() {
                                                const deletedGroups = new Set();
                                                for (let w of output) {
                                                    if (deletedGroups.has(w.groupId))
                                                        continue;
                                                    if (!groups[ w.groupId ]) {
                                                        if (w.groupId != '' && w.groupId != null)
                                                            console.log("Could not find group with id", w.groupId, groups[ w.groupId ])
                                                        dbo.collection("whitelists").deleteMany({ id_group: w.groupId })
                                                        deletedGroups.add(w.groupId);
                                                        continue;
                                                    }
                                                    w.groupId = `${w.groupId}`;
                                                    if (w.discordUsername != "" && !w.discordUsername.startsWith("@")) w.discordUsername = "@" + w.discordUsername;

                                                    let playerId;
                                                    if (config.other.prefer_eosID)
                                                        playerId = w.eosID || w.steamid64
                                                    else
                                                        playerId = w.steamid64 || w.eosID
                                                    wlRes += `Admin=${playerId}:${groups[ w.groupId ].group_name} // [${w.clanTag}] ${w.username} ${w.discordUsername} ${w.expiration ? ('Expiration: ' + w.expiration.toISOString()) : ''}\n`

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

                                                if (config.other.whitelist_developers && !usernamesOnly && !clan_code)
                                                    output.push(
                                                        {
                                                            username: "JetDave",
                                                            steamid64: "76561198419229279",
                                                            eosID: "0002a9b6e5ca4343beb7578f8d8ac823",
                                                            groupId: devGroupName,
                                                            clanTag: "SQUAD Whitelister Developer",
                                                            discordUsername: "@jetdave"
                                                        }
                                                    )
                                                formatDocument();

                                                resolve(wlRes);
                                            }
                                        } else {
                                            resolve("")
                                        }
                                    })
                                })
                            })
                        } else {
                            resolve(null)
                        }
                    })
                })
            })
            return output;
        }

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
            const sessionReturn = { ...req.userSession };
            delete sessionReturn.password;
            delete sessionReturn.token;
            if (req.userSession) res.send({ status: "session_valid", userSession: sessionReturn })
            else res.status(401).send({ status: "login_required" });
        })

        app.use('/', requireLogin);

        app.use('/api/restart', (req, res, next) => {
            if (req.userSession && req.userSession.access_level > 5)
                return res.sendStatus(403);
            res.send({ status: "restarting" });
            return restartProcess(0, 0, args);
        })

        app.use('/api/logout', (req, res, next) => {
            res.clearCookie("stok", { httpOnly: true, secure: config.web_server.force_https, sameSite: 'strict' })
            res.clearCookie("uid", { secure: config.web_server.force_https, sameSite: 'strict' })
            mongoConn((dbo) => {
                dbo.collection("sessions").deleteOne({ token: req.userSession.token }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "logout_ok" });
                    }
                })
            });
        })

        app.use('/api/users', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/users/read/getAll', (req, res, next) => {
            const parm = req.sanitizedQuery;

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
                    },
                    {
                        $project: {
                            password: 0
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
            const parm = req.sanitizedBody;
            const userId = safeObjectID(parm._id);
            if (!userId) return res.status(400).send({ error: 'Invalid user ID' });
            const demoFilter = args.demo ? { username: { $ne: "demoadmin" } } : {};
            mongoConn((dbo) => {
                dbo.collection("users").deleteOne({ _id: userId, ...demoFilter, access_level: { $gt: 1 } }, (err, dbRes) => {
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
            const parm = req.sanitizedBody;
            const userId = safeObjectID(parm._id);
            if (!userId) return res.status(400).send({ error: 'Invalid user ID' });
            const demoFilter = args.demo ? { username: { $ne: "demoadmin" } } : {};
            console.log("\nFilter\n", demoFilter)

            if (req.userSession.access_level <= parseInt(parm.upd)) {
                mongoConn((dbo) => {
                    dbo.collection("users").updateOne({ _id: userId, ...demoFilter, access_level: { $gt: 1 } }, { $set: { access_level: parseInt(parm.upd) } }, (err, dbRes) => {
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
        app.use('/api/roles', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
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
        app.use('/api/api_keys', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/api_keys/read/getAll', (req, res, next) => {
            res.send([])
        })
        app.post('/api/api_keys/write/create', (req, res, next) => {
            return null;
        })
        // app.use('/api/whitelist', removeExpiredPlayers);

        // app.use('/api/subcomponent', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/subcomponent/read/:subComp/status', mongoSanitizer(), async (req, res, next) => {
            res.send(subcomponent_status[ req.sanitizedParams.subComp ])
        })
        app.use('/api/config', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        const CONFIG_RULES = {
            // Fields that cannot be modified via API
            ignoreFields: [
                'database',
                'web_server.bind_ip',
                'web_server.http_port',
                'web_server.https_port',
                'web_server.http_server_disabled',
                'web_server.https_server_disabled',
                /web_server\.[^\.]*(http)[^\.]*/  // Matches any http-related webserver fields
            ],

            // Fields that require validation before saving
            validationRules: {
                'web_server.session_duration_hours': {
                    validate: (value) => {
                        return typeof value === 'number' && value > 0 && value <= 168;
                    },
                    errorMessage: 'Invalid session duration hours value. (0 < value <= 168)'
                },
                'discord_bot.token': {
                    validate: (value) => {
                        // Discord token format validation
                        return typeof value === 'string' && value.length > 50 && value != '******';
                    },
                    errorMessage: 'Invalid Discord bot token format'
                },
                'squadjs.*.websocket.token': {
                    validate: (value) => {
                        return typeof value === 'string' && value.length > 4 && value != '******';
                    },
                    errorMessage: 'Invalid SquadJS token format'
                }
            }
        };

        function getNestedValue(obj, path) {
            return path.split('.').reduce((current, key) => current?.[ key ], obj);
        }

        function setNestedValue(obj, path, value) {
            const keys = path.split('.');
            const lastKey = keys.pop();
            const target = keys.reduce((current, key) => {
                if (!current[ key ]) current[ key ] = {};
                return current[ key ];
            }, obj);
            target[ lastKey ] = value;
        }

        function deleteNestedValue(obj, path) {
            const keys = path.split('.');
            const lastKey = keys.pop();
            const target = keys.reduce((current, key) => current?.[ key ], obj);
            if (target) delete target[ lastKey ];
        }

        function matchesIgnorePattern(path, ignoreFields) {
            return ignoreFields.some(pattern => {
                if (pattern instanceof RegExp) {
                    return pattern.test(path);
                }
                return pattern === path;
            });
        }

        function getAllPaths(obj, prefix = '') {
            let paths = [];
            for (let key in obj) {
                const newPath = prefix ? `${prefix}.${key}` : key;
                if (obj[ key ] && typeof obj[ key ] === 'object' && !Array.isArray(obj[ key ])) {
                    paths.push(newPath);
                    paths = paths.concat(getAllPaths(obj[ key ], newPath));
                } else if (Array.isArray(obj[ key ])) {
                    paths.push(newPath);
                    obj[ key ].forEach((item, index) => {
                        if (item && typeof item === 'object') {
                            paths = paths.concat(getAllPaths(item, `${newPath}.${index}`));
                        }
                    });
                } else {
                    paths.push(newPath);
                }
            }
            return paths;
        }

        function validateField(path, value, validationRules, fullConfig = null) {
            for (let [ pattern, rule ] of Object.entries(validationRules)) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '[^.]+') + '$');
                if (regex.test(path)) {
                    if (!rule.validate(value, fullConfig, path)) {
                        return { valid: false, error: rule.errorMessage };
                    }
                }
            }
            return { valid: true };
        }

        app.get('/api/config/read/getFull', async (req, res, next) => {
            let cpyConf = JSON.parse(JSON.stringify(config)); // Deep copy
            const placeholder = '******';

            // Remove ignored fields
            const allPaths = getAllPaths(cpyConf);
            for (let path of allPaths) {
                if (matchesIgnorePattern(path, CONFIG_RULES.ignoreFields)) {
                    deleteNestedValue(cpyConf, path);
                }
            }

            // Mask sensitive fields
            cpyConf.discord_bot.token = placeholder;
            cpyConf.squadjs?.forEach((e, i) => {
                if (cpyConf.squadjs[ i ].websocket.token) {
                    cpyConf.squadjs[ i ].websocket.token = placeholder;
                }
            });

            // Handle hidden tabs from environment
            if (process.env.HIDDEN_CONFIG_TABS) {
                for (let t of process.env.HIDDEN_CONFIG_TABS.split(';')) {
                    try {
                        delete cpyConf[ t ];
                    } catch (error) { }
                }
            }

            // Set favicon fallback
            if (!cpyConf.app_personalization?.favicon && cpyConf.app_personalization?.logo_url) {
                cpyConf.app_personalization.favicon = cpyConf.app_personalization.logo_url;
            }

            res.send(cpyConf);
        });

        app.use('/api/config/write', (...p) => { accessLevelAuthorization(5, ...p) })
        app.post('/api/config/write/update', async (req, res, next) => {
            const parm = req.sanitizedBody;
            let resData = {};

            const validation = validateConfigChange(parm.category, parm.config);
            if (!validation.valid) {
                resData.status = "config_rejected";
                resData.error = "Invalid config structure";
                resData.errors = validation.errors;
                resData.warnings = validation.warnings;
                return res.status(400).send(resData);
            }

            if (process.env.HIDDEN_CONFIG_TABS?.split(';').includes(parm.category)) {
                resData.status = "config_rejected";
                resData.error = "Category is hidden";
                return res.send(resData);
            }

            const incomingPaths = getAllPaths(parm.config, parm.category);
            console.log(incomingPaths);

            const blockedPaths = [];
            const invalidPaths = [];

            for (let path of incomingPaths) {
                if (matchesIgnorePattern(path, CONFIG_RULES.ignoreFields)) {
                    blockedPaths.push(path);
                    continue;
                }

                const fullConfig = { [ parm.category ]: parm.config };
                const value = getNestedValue(fullConfig, path);
                const validation = validateField(path, value, CONFIG_RULES.validationRules, fullConfig);

                if (!validation.valid) {
                    invalidPaths.push({ path, error: validation.error });
                }
            }

            const sanitizedConfig = copyAllowedPaths(
                parm.config,
                parm.category,
                [ ...blockedPaths, ...invalidPaths.map(i => i.path) ]
            );

            const ignoredFields = [];
            const validationWarnings = [];

            for (let path of blockedPaths) {
                ignoredFields.push(path);
            }

            for (let invalid of invalidPaths) {
                ignoredFields.push(invalid.path);
                validationWarnings.push(`${invalid.path}: ${invalid.error} (field ignored)`);
            }

            const hasChanges = JSON.stringify(sanitizedConfig) !== '{}' && JSON.stringify(sanitizedConfig) !== '[]';
            if (!hasChanges) {
                resData.status = "config_rejected";
                resData.error = "All fields were invalid or blocked";
                resData.ignoredFields = ignoredFields;
                resData.warnings = validationWarnings;
                return res.send(resData);
            }

            try {
                if (parm.category === 'squadjs' && Array.isArray(sanitizedConfig)) {
                    const originalBody = req.body;
                    if (originalBody && Array.isArray(originalBody.config)) {
                        sanitizedConfig.forEach((entry, index) => {
                            const originalHost = originalBody.config[ index ]?.websocket?.host;
                            const originalToken = originalBody.config[ index ]?.websocket?.token;
                            if (!isStringInjectionSafe(originalHost) || !isStringInjectionSafe(originalToken))
                                return res.status(400).send({ error: 'Invalid credentials' })
                            entry.websocket.host = originalHost;
                            entry.websocket.token = originalToken;
                        });
                    }

                    sanitizedConfig.forEach((entry, index) => {
                        const currentEntry = config.squadjs?.[ index ]?.websocket;
                        const newEntry = entry?.websocket;
                        if (currentEntry && newEntry) {
                            const hostChanged = newEntry.host !== undefined && newEntry.host !== currentEntry.host;
                            const portChanged = newEntry.port !== undefined && newEntry.port !== currentEntry.port;
                            const tokenNotProvided = !newEntry.token || newEntry.token === '******';
                            if ((hostChanged || portChanged) && tokenNotProvided) {
                                entry.websocket.token = '';
                            }
                        }
                    });
                }

                // Prevent disabling automatic_updates via API (allow enabling only)
                if (sanitizedConfig.automatic_updates === false) {
                    console.log(" > API attempt to disable automatic_updates blocked");
                    delete sanitizedConfig.automatic_updates;
                }

                config[ parm.category ] = deepMerge(config[ parm.category ] || {}, sanitizedConfig);

                fs.writeFileSync(configPath + ".bak", fs.readFileSync(configPath));
                fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));

                resData.status = "config_updated";
                resData.action = 'reload';

                if (ignoredFields.length > 0) {
                    resData.ignoredFields = ignoredFields;
                    resData.warnings = validationWarnings.length > 0 ? validationWarnings :
                        ignoredFields.map(f => `${f}: Protected field (ignored)`);
                }

                res.send(resData);

                if (![ 'custom_permissions', 'app_personalization' ].includes(parm.category)) {
                    return restartProcess(0, 0, args);
                }
            } catch (error) {
                resData.status = "error";
                resData.error = error.message;
                res.send(resData);
            }
        });

        function copyAllowedPaths(obj, prefix, blockedPaths) {
            if (Array.isArray(obj)) {
                return obj.map((item, index) => {
                    if (item && typeof item === 'object') {
                        return copyAllowedPaths(item, `${prefix}.${index}`, blockedPaths);
                    }
                    return item;
                });
            }

            if (obj && typeof obj === 'object') {
                const result = {};
                for (let key in obj) {
                    const newPath = prefix ? `${prefix}.${key}` : key;

                    const isBlocked = blockedPaths.includes(newPath);

                    if (isBlocked) {
                        continue;
                    }

                    if (obj[ key ] && typeof obj[ key ] === 'object') {
                        result[ key ] = copyAllowedPaths(obj[ key ], newPath, blockedPaths);
                    } else {
                        result[ key ] = obj[ key ];
                    }
                }
                return result;
            }

            return obj;
        }

        function deepMerge(target, source) {
            if (Array.isArray(source) && Array.isArray(target)) {
                return source.map((sourceItem, index) => {
                    const targetItem = target[ index ];

                    if (sourceItem && typeof sourceItem === 'object' && !Array.isArray(sourceItem) &&
                        targetItem && typeof targetItem === 'object' && !Array.isArray(targetItem)) {
                        return deepMerge(targetItem, sourceItem);
                    }

                    return sourceItem;
                });
            }

            if (Array.isArray(source)) {
                return source;
            }

            if (!source || typeof source !== 'object') {
                return source;
            }

            if (!target || typeof target !== 'object' || Array.isArray(target)) {
                return source;
            }

            const result = { ...target };

            for (let key in source) {
                if (source[ key ] && typeof source[ key ] === 'object' && !Array.isArray(source[ key ])) {
                    result[ key ] = deepMerge(result[ key ] || {}, source[ key ]);
                } else {
                    result[ key ] = source[ key ];
                }
            }

            return result;
        }

        app.use('/api/dbconfig/read/getFull', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next() })
        app.get('/api/dbconfig/read/getFull', async (req, res, next) => {
            const parm = req.sanitizedBody;
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
        app.use('/api/dbconfig/read/:category', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 30) next() })
        app.get('/api/dbconfig/read/:category', mongoSanitizer(), async (req, res, next) => {
            const parm = req.sanitizedBody;

            if (typeof req.sanitizedParams.category !== 'string') {
                return res.status(400).send({ error: 'Invalid parameter' });
            }

            if (req.sanitizedParams.category.includes('$') || req.sanitizedParams.category.includes('{')) {
                return res.status(400).send({ error: 'Invalid parameter' });
            }

            mongoConn(dbo => {
                dbo.collection('configs').findOne({ category: req.sanitizedParams.category }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else if (dbRes) {
                        // console.log(dbRes.config);
                        res.send(dbRes.config)
                    }
                })
            })
        })
        app.use('/api/dbconfig/write', (...p) => { accessLevelAuthorization(5, ...p) })
        app.post('/api/dbconfig/write/update', async (req, res, next) => {
            const parm = req.sanitizedBody;

            const validCategories = [ 'backup', 'seeding_tracker', 'discord', 'game', 'server' ];
            if (!parm.category || typeof parm.category !== 'string' || !validCategories.includes(parm.category)) {
                return res.status(400).send({ error: 'Invalid category' });
            }

            if (parm.category.includes('$')) {
                return res.status(400).send({ error: 'Invalid category' });
            }

            if (parm.config && typeof parm.config === 'object') {
                const checkForOperators = (obj, path = '') => {
                    for (const key in obj) {
                        if (key.startsWith('$')) {
                            return { error: true, path: path + key };
                        }
                        if (obj[ key ] && typeof obj[ key ] === 'object' && !Array.isArray(obj[ key ])) {
                            const result = checkForOperators(obj[ key ], path + key + '.');
                            if (result.error) return result;
                        }
                    }
                    return { error: false };
                };
                const validation = checkForOperators(parm.config);
                if (validation.error) {
                    return res.status(400).send({ error: 'Invalid config structure at ' + validation.path });
                }
            }

            if (parm.category === 'backup' && parm.config?.auto_backup?.next_backup) {
                const nextBackup = new Date(parm.config.auto_backup.next_backup);
                if (isNaN(nextBackup.getTime())) return res.status(400).send({ error: 'Invalid next backup date.' });
                const minAllowed = Date.now() + 24 * 60 * 60 * 1000;
                if (nextBackup.getTime() < minAllowed) {
                    const current = await mongoConn().then(dbo => dbo.collection('configs').findOne({ category: 'backup' }));
                    const currentNext = new Date(current?.config?.auto_backup?.next_backup);
                    const truncMin = t => Math.floor(new Date(t).getTime() / 60000);
                    if (!currentNext || truncMin(parm.config.auto_backup.next_backup) < truncMin(currentNext)) {
                        return res.status(400).send({ error: 'Next backup must be at least 24 hours from now.' });
                    }
                }
            }

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

        app.use('/api/backup', (...p) => { accessLevelAuthorization(5, ...p) })

        app.get('/api/backup/read/list', async (req, res, next) => {
            try {
                if (!fs.existsSync(BACKUP_DIR)) return res.send([]);
                const infoFiles = fs.readdirSync(BACKUP_DIR)
                    .filter(f => f.startsWith('backup_') && f.endsWith('.info.json'))
                    .map(f => {
                        try {
                            return JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf-8'));
                        } catch (e) {
                            return null;
                        }
                    })
                    .filter(Boolean)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                res.send(infoFiles);
            } catch (err) {
                serverError(res, err);
            }
        })

        app.post('/api/backup/write/create', async (req, res, next) => {
            try {
                if (backupInProgress) return res.status(409).send({ error: 'Backup or restore already in progress' });

                if (fs.existsSync(BACKUP_DIR)) {
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    const hasRecentBackup = fs.readdirSync(BACKUP_DIR)
                        .filter(f => f.startsWith('backup_') && f.endsWith('.info.json'))
                        .some(f => {
                            try {
                                const info = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf-8'));
                                return info.manual && new Date(info.timestamp) > oneDayAgo;
                            } catch (e) { return false; }
                        });
                    if (hasRecentBackup) return res.status(429).send({ error: 'A manual backup was created in the last 24 hours. Limit: 1 manual backup per 24 hours.' });
                }

                const dbo = await mongoConn();
                const bt = await dbo.collection('configs').findOne({ category: 'backup' });
                const backupConfig = bt?.config || {};
                const info = await performBackup(dbo, backupConfig, true);
                res.send({ status: 'backup_created', data: info });
            } catch (err) {
                serverError(res, err);
            }
        })

        app.post('/api/backup/write/restore', async (req, res, next) => {
            try {
                if (backupInProgress) return res.status(409).send({ error: 'Backup or restore already in progress' });
                const parm = req.sanitizedBody;
                if (!parm.name) return res.status(400).send({ error: 'Missing backup name' });

                if (parm.name.includes('/') || parm.name.includes('\\') || parm.name.includes('..')) {
                    return res.status(400).send({ error: 'Invalid backup name' });
                }

                const archivePath = path.join(BACKUP_DIR, `${parm.name}.tar.gz`);
                if (!fs.existsSync(archivePath)) return res.status(404).send({ error: 'Backup not found' });
                const resolvedArchive = path.resolve(archivePath);
                const resolvedBase = path.resolve(BACKUP_DIR);
                if (!resolvedArchive.startsWith(resolvedBase)) return res.status(400).send({ error: 'Invalid backup name' });

                backupInProgress = true;
                const tempDir = path.join(BACKUP_DIR, `.tmp_restore_${Date.now()}`);
                try {
                    fs.ensureDirSync(tempDir);
                    await tar.extract({ file: archivePath, cwd: tempDir });

                    const dbo = await mongoConn();
                    const mb = new MongoBackup(dbo);
                    const result = await mb.restore(tempDir, { drop: true });

                    if (parm.restore_config !== false) {
                        const confBackupPath = path.join(tempDir, 'conf.json');
                        if (fs.existsSync(confBackupPath)) {
                            fs.writeFileSync(configPath + ".bak", fs.readFileSync(configPath));
                            fs.copyFileSync(confBackupPath, configPath);
                        }
                    }

                    res.send({ status: 'restore_complete', data: result });
                } finally {
                    fs.removeSync(tempDir);
                    backupInProgress = false;
                }
            } catch (err) {
                backupInProgress = false;
                serverError(res, err);
            }
        })

        app.post('/api/backup/write/delete', async (req, res, next) => {
            try {
                const parm = req.sanitizedBody;
                if (!parm.name) return res.status(400).send({ error: 'Missing backup name' });

                if (parm.name.includes('/') || parm.name.includes('\\') || parm.name.includes('..')) {
                    return res.status(400).send({ error: 'Invalid backup name' });
                }

                const archivePath = path.join(BACKUP_DIR, `${parm.name}.tar.gz`);
                const infoPath = path.join(BACKUP_DIR, `${parm.name}.info.json`);
                const resolvedArchive = path.resolve(archivePath);
                const resolvedBase = path.resolve(BACKUP_DIR);
                if (!resolvedArchive.startsWith(resolvedBase)) return res.status(400).send({ error: 'Invalid backup name' });

                if (!fs.existsSync(archivePath)) return res.status(404).send({ error: 'Backup not found' });

                const dbo = await mongoConn();
                const backupConfig = await dbo.collection('configs').findOne({ category: 'backup' });

                if (backupConfig?.config?.auto_backup?.enabled && backupConfig.config.auto_backup.schedule) {
                    const schedule = backupConfig.config.auto_backup.schedule;
                    const frequencyMs = schedule.value * schedule.option;
                    const protectionPeriodMs = frequencyMs * 3;

                    if (fs.existsSync(infoPath)) {
                        const backupInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                        const backupTimestamp = new Date(backupInfo.timestamp).valueOf();
                        const now = Date.now();
                        const backupAge = now - backupTimestamp;

                        if (backupAge < protectionPeriodMs) {
                            const daysRemaining = Math.ceil((protectionPeriodMs - backupAge) / (24 * 60 * 60 * 1000));
                            return res.status(403).send({
                                error: `Cannot delete backup created less than 3x the backup frequency. Wait ${daysRemaining} more day(s).`
                            });
                        }
                    }
                }

                fs.removeSync(archivePath);
                if (fs.existsSync(infoPath)) fs.removeSync(infoPath);

                res.send({ status: 'backup_deleted' });
            } catch (err) {
                serverError(res, err);
            }
        })

        app.use('/api/custom_permissions/read', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 30) next(); else res.sendStatus(403) })
        app.get('/api/custom_permissions/read/getAll', (req, res, next) => {
            res.send(config.custom_permissions)
        })

        app.use('/api/lists/read', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 100) next() })
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
        app.use('/api/lists/write', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 10) next(); else res.sendStatus(401); })
        app.use('/api/lists/write/checkPerm', async (req, res, next) => {
            return res.send({ status: "permission_granted" });
        })
        app.post('/api/lists/write/addNewList', (req, res, next) => {
            const parm = req.sanitizedBody;
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
            const parm = req.sanitizedBody;
            mongoConn((dbo) => {
                dbo.collection("whitelists").deleteMany({ id_list: safeObjectID(parm.sel_list_id) }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        // res.send({ status: "removed_whitelist", ...dbRes })
                        dbo.collection("lists").deleteMany({ _id: safeObjectID(parm.sel_list_id) }, (err, dbRes) => {
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
            const parm = req.sanitizedBody;
            mongoConn((dbo) => {
                const insData = {
                    title: parm.title,
                    output_path: parm.output_path,
                    hidden_managers: parm.hidden_managers,
                    require_appr: parm.require_appr,
                    discord_roles: parm.discord_roles
                }
                dbo.collection("lists").updateOne({ _id: safeObjectID(parm.sel_list_id) }, { $set: insData }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "edited_list", ...dbRes })
                    }
                })
            })
        })

        app.use('/api/whitelist/read', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 100) next() })
        app.get('/api/whitelist/read/getAllClans', (req, res, next) => {
            const parm = req.sanitizedQuery;

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
            const parm = req.sanitizedQuery;
            mongoConn((dbo) => {
                let _findFilter = parm.sel_clan_id ? { id_clan: safeObjectID(parm.sel_clan_id) } : {};
                let findFilter = { id_list: safeObjectID(parm.sel_list_id), ..._findFilter }
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
            const parm = req.sanitizedQuery;
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
            const parm = req.sanitizedQuery;
            mongoConn((dbo) => {
                // let findFilter = parm.sel_clan_id ? { id_clan: safeObjectID(parm.sel_clan_id), approved: false } : { approved: false };
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
                                        id_clan: safeObjectID(parm.sel_clan_id)
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
                        // console.log("\n\n\n", dbRes, "\n\n\n");
                    }
                })
            })
        })
        app.use('/api/whitelist/write', (req, res, next) => {
            if (req.userSession && req.userSession.access_level <= 30) next()
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
            return res.send({ status: "permission_granted" });
        })
        app.post('/api/whitelist/write/addPlayer', (req, res, next) => {
            const parm = req.sanitizedBody;

            if (typeof parm.username !== 'string' || parm.username.length === 0 || parm.username.length > 100) {
                return res.status(400).send({ error: 'Invalid username' });
            }

            if (containsWhitelistInjection(parm.username) || containsWhitelistInjection(parm.steamid64) || containsWhitelistInjection(parm.eosID)) {
                blacklistIP(getClientIP(req), 'Whitelist injection in addPlayer');
                return res.status(403).send({ error: 'Forbidden' });
            }

            if (parm.steamid64 && (typeof parm.steamid64 !== 'string' || !/^\d{17}$/.test(parm.steamid64))) {
                return res.status(400).send({ error: 'Invalid steamid64' });
            }

            if (parm.eosID && parm.eosID !== null && parm.eosID !== '' && (typeof parm.eosID !== 'string' || !/^[a-f\d]{32}$/.test(parm.eosID))) {
                return res.status(400).send({ error: 'Invalid eosID' });
            }

            if (!parm.discordUsername)
                parm.discordUsername = ""

            mongoConn((dbo) => {
                let findFilter = (req.userSession.access_level >= 100 ? { clan_code: req.userSession.clan_code, admins: req.userSession.id_user.toString() } : { _id: safeObjectID(parm.sel_clan_id) });
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
                dbo.collection("clans").aggregate(pipeline).toArray((err, aDbResC) => {
                    console.log("====>", aDbResC)
                    let dbResC = aDbResC[ 0 ];

                    if (err) console.log("error", err)
                    else if (dbResC != null) {
                        if (dbResC.player_limit == '' || dbResC.player_count < parseInt(dbResC.player_limit) || req.userSession.access_level <= 5) {
                            let insWlPlayer = {
                                id_clan: dbResC._id,
                                username: parm.username,
                                username_l: parm.username.toLowerCase(),
                                steamid64: parm.steamid64,
                                eosID: parm.eosID,
                                id_group: safeObjectID(parm.group),
                                discord_username: !parm.discordUsername.startsWith('@') && parm.discordUsername != "" ? "@" + parm.discordUsername : "" + parm.discordUsername,
                                inserted_by: safeObjectID(req.userSession.id_user || req.userSession.id),
                                insertedViaApiKey: !req.userSession.id_user && !!req.userSession.id,
                                expiration: (parm.durationHours && parm.durationHours != "") ? new Date(Date.now() + (parseFloat(parm.durationHours) * 60 * 60 * 1000)) : false,
                                insert_date: new Date(),
                                approved: false,
                                id_list: safeObjectID(parm.sel_list_id),
                            }

                            if (!insWlPlayer.steamid64 && !insWlPlayer.eosID)
                                res.status(400).send({ status: "not_inserted", reason: "Player ID not found." })

                            dbo.collection("players").findOne(parm.eosID ? { eosID: parm.eosID } : { steamid64: parm.steamid64 }, (err, playerData) => {
                                if (!insWlPlayer.eosID && playerData && playerData.eosID)
                                    insWlPlayer.eosID = playerData.eosID;

                                if (!insWlPlayer.steamid64 && playerData && playerData.steamid64)
                                    insWlPlayer.steamid64 = playerData.steamid64;

                                dbo.collection("lists").findOne({ _id: insWlPlayer.id_list }, (err, dbResList) => {
                                    if (err) serverError(res, err);
                                    else if (req.userSession.access_level < 100 || !dbResList.hidden_managers) {
                                        dbo.collection("groups").findOne(insWlPlayer.id_group, (err, dbResG) => {
                                            if (err) console.log("error", err)
                                            else if (dbResG != null) {

                                                insWlPlayer.approved = !(dbResG.require_appr || dbResC.confirmation_ovrd || dbResList.require_appr) || req.userSession.access_level <= 30;

                                                dbo.collection("whitelists").insertOne(insWlPlayer, (err, dbRes) => {
                                                    if (err) console.log("ERR", err);
                                                    else {
                                                        res.send({ status: "inserted_new_player", player: { ...insWlPlayer, inserted_by: [ { username: req.userSession.username } ] }, ...dbRes });
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
                                                            sendDiscordMessage(discordClient.channels.cache.get(config.discord_bot.whitelist_updates_channel_id), { embeds: embeds, components: components }, 'whitelist updates channel')

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
            const parm = req.sanitizedBody;
            const whitelistId = safeObjectID(parm._id);
            if (!whitelistId) return res.status(400).send({ error: 'Invalid whitelist ID' });
            mongoConn((dbo) => {
                dbo.collection("whitelists").deleteOne({ _id: whitelistId }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "removing_ok", ...dbRes })
                    }
                })
            })
        })
        app.post('/api/whitelist/write/clearList', (req, res, next) => {
            const parm = req.sanitizedBody;
            mongoConn((dbo) => {
                dbo.collection("whitelists").deleteMany({ id_clan: safeObjectID(parm.sel_clan_id), id_list: safeObjectID(parm.sel_list_id) }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "clearing_ok", ...dbRes })
                    }
                })
            })
        })
        app.use('/api/seeding/read', (req, res, next) => {
            if (req.userSession && req.userSession.access_level <= 30) next()
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
        app.use('/api/players/read', (req, res, next) => {
            if (req.userSession && req.userSession.access_level <= 30) next()
            else res.sendStatus(401)
        })
        app.get('/api/players/read/from/steamId/:id', mongoSanitizer(), (req, res, next) => {
            if (typeof req.sanitizedParams.id !== 'string' || !/^\d{17}$/.test(req.sanitizedParams.id)) {
                return res.status(400).send({ error: 'Invalid Steam ID format' });
            }

            mongoConn((dbo) => {
                dbo.collection("players").findOne({ steamid64: req.sanitizedParams.id }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send(dbRes);
                    }
                })
            })
        })
        app.get('/api/players/read/from/eosId/:id', mongoSanitizer(), (req, res, next) => {
            if (typeof req.sanitizedParams.id !== 'string' || !/^[a-f0-9]{32}$/i.test(req.sanitizedParams.id)) {
                return res.status(400).send({ error: 'Invalid EOS ID format' });
            }

            mongoConn((dbo) => {
                dbo.collection("players").findOne({ eosID: req.sanitizedParams.id }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send(dbRes);
                    }
                })
            })
        })
        app.get('/api/players/read/from/discordUserId/:id', mongoSanitizer(), (req, res, next) => {
            if (typeof req.sanitizedParams.id !== 'string' || !/^\d{17,20}$/.test(req.sanitizedParams.id)) {
                return res.status(400).send({ error: 'Invalid Discord User ID format' });
            }

            mongoConn((dbo) => {
                dbo.collection("players").findOne({ discord_user_id: req.sanitizedParams.id }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send(dbRes);
                    }
                })
            })
        })
        app.use('/api/players/write', (req, res, next) => {
            if (req.userSession && req.userSession.access_level <= 10) next()
            else res.sendStatus(401)
        })

        app.post('/api/players/write/seeding_score', (req, res, next) => {
            /* 
                #swagger.parameters['body'] = {
                    in: 'body',
                    schema: {
                        steamIDs: ['76561198034319030', '76561198034319031'],
                        incremental: true,
                        points: 10
                    }
                }
            */
            mongoConn(async (dbo) => {
                if (!Array.isArray(req.sanitizedBody.steamIDs) || typeof req.sanitizedBody.incremental !== 'boolean') {
                    return res.status(400).send('Invalid input');
                }
                if (typeof req.sanitizedBody.points !== 'number' || req.sanitizedBody.points < 0 || req.sanitizedBody.points > 1000) {
                    return res.status(400).send({ error: 'Invalid points' });
                }
                const steamIDs = req.sanitizedBody.steamIDs
                const mode = req.sanitizedBody.incremental ? '$inc' : '$set'
                const points = req.sanitizedBody.points
                const updData = await dbo.collection("players").updateMany({ steamid64: { $in: steamIDs } }, { [ mode ]: { seeding_points: points } })
                    .catch(err => {
                        res.sendStatus(500);
                        return;
                    })
                res.send(updData)
            })
        })
        app.use('/api/approval/write', (req, res, next) => {
            if (req.userSession && req.userSession.access_level <= 30) next()
            else res.sendStatus(401)
        })
        app.use('/api/approval/write/setApprovedStatus', (req, res, next) => {
            const parm = req.sanitizedBody;
            setApprovedStatus(parm, res)
        })

        app.use('/api/gameGroups/write', (req, res, next) => { if (req.userSession && req.userSession.access_level < 10) next(); else res.sendStatus(401); })
        app.use('/api/gameGroups/write/checkPerm', async (req, res, next) => {
            return res.send({ status: "permission_granted" })
        })
        app.post('/api/gameGroups/write/newGroup', (req, res, next) => {
            if (containsWhitelistInjection(parm.group_name)) {
                blacklistIP(getClientIP(req), 'Whitelist injection in newGroup');
                return res.status(403).send({ error: 'Forbidden' });
            }
            const allowedFields = [ 'group_name', 'group_permissions', 'require_appr', 'discord_roles' ];
            const parm = {};
            allowedFields.forEach(field => {
                if (req.sanitizedBody[ field ] !== undefined) parm[ field ] = req.sanitizedBody[ field ];
            });
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
            if (containsWhitelistInjection(req.sanitizedBody.group_name)) {
                blacklistIP(getClientIP(req), 'Whitelist injection in editGroup');
                return res.status(403).send({ error: 'Forbidden' });
            }
            const allowedFields = [ 'group_name', 'group_permissions', 'require_appr', 'discord_roles' ];
            const parm = {};
            allowedFields.forEach(field => {
                if (req.sanitizedBody[ field ] !== undefined) parm[ field ] = req.sanitizedBody[ field ];
            });
            const groupId = safeObjectID(req.sanitizedBody._id);
            if (!groupId) return res.status(400).send({ error: 'Invalid group ID' });
            mongoConn((dbo) => {
                dbo.collection("groups").updateOne({ _id: groupId }, { $set: parm }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        dbo.collection("groups").findOne({ _id: groupId }, (err, dbRes) => {
                            res.send({ status: "edit_ok", ...dbRes })
                        })
                    }
                })
            })
        })

        app.post('/api/gameGroups/write/remove', (req, res, next) => {
            const groupId = safeObjectID(req.sanitizedBody._id);
            if (!groupId) return res.status(400).send({ error: 'Invalid group ID' });
            mongoConn((dbo) => {
                dbo.collection("groups").deleteOne({ _id: groupId }, (err, groupDbRes) => {
                    if (err) return serverError(res, err);

                    dbo.collection("whitelists").deleteMany({ id_group: groupId }, (err, whitelistDbRes) => {
                        if (err) return serverError(res, err);

                        res.send({
                            status: "removing_ok",
                            groupResult: groupDbRes,
                            whitelistResult: whitelistDbRes
                        });
                    });
                });
            });
        });

        //app.use('/api/gameGroups/read', (req, res, next) => { if (req.userSession && req.userSession.access_level < 10) next() })
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

        app.use('/api/discord', (...p) => { accessLevelAuthorization(30, ...p) })
        app.use('/api/discord/write', (...p) => { accessLevelAuthorization(10, ...p) })
        app.get('/api/discord/read/getStatus', (req, res, next) => {
            res.send(subcomponent_status.discord_bot)
        })
        app.get('/api/discord/read/getRoles', (req, res, next) => {
            const parm = req.sanitizedQuery;
            if (subcomponent_status.discord_bot) {
                const clientServer = discordClient.guilds.cache.find((s) => s.id == config.discord_bot.server_id);
                let roles = [];
                for (let r of clientServer.roles.cache) if (r[ 1 ].name.toLowerCase() !== "@everyone") roles.push({ id: r[ 1 ].id, name: r[ 1 ].name })
                res.send(roles)
            } else {
                res.sendStatus(404)
            }
        })
        app.get('/api/discord/read/getServers', (req, res, next) => {
            const parm = req.sanitizedQuery;
            if (subcomponent_status.discord_bot) {
                let ret = [];
                for (let g of discordClient.guilds.cache) ret.push({ id: g[ 1 ].id, name: g[ 1 ].name })
                res.send(ret)
                // console.log(ret);
            } else {
                res.sendStatus(404)
            }
        })
        app.get('/api/discord/read/getChannels', async (req, res, next) => {
            const parm = req.sanitizedQuery;
            if (subcomponent_status.discord_bot) {
                let ret = [];
                res.send(
                    (await discordClient.guilds.fetch(config.discord_bot.server_id))
                        .channels.cache
                        .filter((e) => e.type != 4) // Filter out category channels
                        .sort((a, b) => {
                            const aParent = a.parent;
                            const bParent = b.parent;

                            if (!aParent && bParent) return -1;
                            if (aParent && !bParent) return 1;

                            if (!aParent && !bParent) {
                                return a.rawPosition - b.rawPosition;
                            }

                            if (aParent.id !== bParent.id) {
                                return aParent.rawPosition - bParent.rawPosition;
                            }

                            return a.rawPosition - b.rawPosition;
                        })
                );
            } else {
                res.sendStatus(404)
            }
        })
        app.get('/api/discord/read/inviteLink', async (req, res, next) => {
            res.send({ url: subcomponent_data.discord_bot.invite_link });
        })

        app.use('/api/clans', (req, res, next) => { if (req.userSession && req.userSession.access_level < 10) next() })
        app.get('/api/clans/getAllClans', (req, res, next) => {
            mongoConn((dbo) => {
                dbo.collection("clans").find().sort({ full_name: 1, tag: 1 }).toArray((err, dbRes) => {
                    res.send(dbRes);
                })
            })
        })
        app.post('/api/clans/removeClan', (req, res, next) => {
            const clanId = safeObjectID(req.sanitizedBody._id);
            if (!clanId) return res.status(400).send({ error: 'Invalid clan ID' });
            mongoConn((dbo) => {
                dbo.collection("clans").deleteOne({ _id: clanId }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        res.send({ status: "removing_ok", ...dbRes })
                    }
                })
            })
        })
        app.post('/api/clans/editClan', (req, res, next) => {
            if (containsWhitelistInjection(req.sanitizedBody.full_name) || containsWhitelistInjection(req.sanitizedBody.tag)) {
                blacklistIP(getClientIP(req), 'Whitelist injection in editClan');
                return res.status(403).send({ error: 'Forbidden' });
            }
            const allowedFields = [ 'full_name', 'tag', 'clan_code', 'description', 'discord_server_id' ];
            const parm = {};
            allowedFields.forEach(field => {
                if (req.sanitizedBody[ field ] !== undefined) parm[ field ] = req.sanitizedBody[ field ];
            });
            const clanId = safeObjectID(req.sanitizedBody._id);
            if (!clanId) return res.status(400).send({ error: 'Invalid clan ID' });
            mongoConn((dbo) => {
                dbo.collection("clans").updateOne({ _id: clanId }, { $set: parm }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        dbo.collection("clans").findOne({ _id: clanId }, (err, dbRes) => {
                            res.send({ status: "edit_ok", ...dbRes })
                        })
                    }
                })
            })
        })
        app.get('/api/clans/getClanUsers', (req, res, next) => {
            const parm = req.sanitizedQuery;

            if (!parm.clan_code || typeof parm.clan_code !== 'string') {
                return res.status(400).send({ error: 'Invalid clan_code parameter' });
            }

            if (parm.clan_code.includes('$') || parm.clan_code.includes('{')) {
                return res.status(400).send({ error: 'Invalid clan_code parameter' });
            }

            mongoConn((dbo) => {
                dbo.collection("users").find({ clan_code: parm.clan_code }).toArray((err, dbRes) => {
                    res.send(dbRes)
                })
            })
        })
        app.get('/api/clans/getClanAdmins', (req, res, next) => {
            const parm = req.sanitizedQuery;
            const clanId = safeObjectID(parm._id);
            if (!clanId) return res.status(400).send({ error: 'Invalid clan ID' });
            mongoConn((dbo) => {
                dbo.collection("clans").findOne({ _id: clanId }, { projection: { admins: 1 } }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        let toSend = dbRes.admins ? dbRes.admins : []
                        res.send(toSend)
                    }
                })
            })
        })
        app.post('/api/clans/editClanAdmins', (req, res, next) => {
            const parm = req.sanitizedBody;
            const clanId = safeObjectID(req.sanitizedBody._id);
            if (!clanId) return res.status(400).send({ error: 'Invalid clan ID' });
            mongoConn((dbo) => {
                dbo.collection("clans").updateOne({ _id: clanId }, { $set: { admins: parm.clan_admins } }, (err, dbRes) => {
                    res.send({ status: "edit_ok", ...dbRes })
                })
            })
        })
        app.post('/api/clans/newClan', (req, res, next) => {
            const parm = req.sanitizedBody;
            if (containsWhitelistInjection(parm.full_name) || containsWhitelistInjection(parm.tag)) {
                blacklistIP(getClientIP(req), 'Whitelist injection in newClan');
                return res.status(403).send({ error: 'Forbidden' });
            }
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
                            res.status(409).send({ status: "clan_already_registered" });
                            console.log("Trying to register an already registered clan:", clanDbIns)
                        }
                    })
                })
            } while (error);
        })

        app.use('/api/keys', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 5) next(); else res.sendStatus(403) })
        app.use('/api/keys/checkPerm', (req, res, next) => { return res.send(true) })
        app.get('/api/keys/{:id}', mongoSanitizer(), async (req, res, next) => {
            const pipeline = [
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
                    $sort: { access_level: -1 }
                }
            ]

            const dbo = await mongoConn();
            if (req.sanitizedParams.id) {
                const keyId = safeObjectID(req.sanitizedParams.id);
                if (!keyId) return res.status(400).send({ error: 'Invalid key ID' });
                pipeline.unshift({ $match: { _id: keyId } })
                const key = (await dbo.collection("keys").aggregate(pipeline).toArray())[ 0 ];
                res.send(key);
                return;
            }

            const keys = await dbo.collection("keys").aggregate(pipeline).toArray();
            res.send(keys)
        })
        app.post('/api/keys/', async (req, res, next) => {
            const dbo = await mongoConn();

            if (!req.sanitizedBody.name || typeof req.sanitizedBody.name !== 'string' || req.sanitizedBody.name.trim().length === 0) {
                return res.status(400).send({ message: "API key name is required and must be a non-empty string", field: "name" });
            }
            if (req.sanitizedBody.name.length > 100) {
                return res.status(400).send({ message: "API key name must not exceed 100 characters", field: "name" });
            }
            if (req.sanitizedBody.name.includes('$') || req.sanitizedBody.name.includes('{')) {
                return res.status(400).send({ message: "API key name contains invalid characters", field: "name" });
            }

            const data = {
                name: req.sanitizedBody.name.trim(),
                token: randomString(128),
                access_level: +req.sanitizedBody.access_level,
                inserted_by: req.userSession.id_user
            }

            if (data.access_level < req.userSession.access_level) {
                res.status(403).send({ message: "You are not authorized to create an API key with access_level lower than yours." })
                return;
            }

            const nameCheck = await dbo.collection("keys").findOne({ name: data.name });
            if (nameCheck) {
                res.status(401).send({ message: "An API key with the same name already exists!", field: "name" })
                return;
            }
            const tokenCheck = await dbo.collection("keys").findOne({ name: data.name });
            if (tokenCheck) {
                res.status(401).send({ message: "An API key with the same name token already exists, please try again!" })
                return;
            }
            dbo.collection("keys").insertOne(data, async (err, dbRes) => {
                if (err) {
                    res.sendStatus(500);
                    console.error(err)
                } else {
                    const output = await dbo.collection("keys").findOne({ _id: safeObjectID(dbRes.insertedId) });
                    res.send({ status: "created", data: output });
                }
            })
        })
        app.delete('/api/keys/:id', async (req, res, next) => {
            const dbo = await mongoConn();
            const keyId = safeObjectID(req.sanitizedParams.id);
            if (!keyId) return res.status(400).send({ error: 'Invalid key ID' });
            const r = await dbo.collection("keys").deleteOne({ _id: keyId });
            res.send(r);
            return;
        })

        app.use('/api/keys', (req, res, next) => { if (req.userSession && req.userSession.access_level <= 100) next() })
        app.get('/api/docs', async (req, res, next) => {
            res.send(apiDocsJson)
        })

        app.use('/admin', authorizeAdmin)

        app.use('/admin', function (req, res, next) {
            express.static('admin')(req, res, next);
        });
        app.use('/api/admin', authorizeAdmin)

        app.get("/api/admin", (req, res, next) => {
            res.send({ status: "Ok" });
        })
        app.get("/api/admin/getConfig", (req, res, next) => {
            return res.status(404).send();
            res.send(config);
        })
        app.get("/api/admin/checkInstallUpdate", (req, res, next) => {
            res.send({ status: "Ok" });
            return checkUpdates(true);
        })
        app.get("/api/admin/restartApplication", (req, res, next) => {
            res.send({ status: "Ok" });
            return restartProcess(req.sanitizedQuery.delay ? req.sanitizedQuery.delay : 0, 0, args);
        })

        app.get('/{*splat}', (req, res) => {
            res.sendFile(__dirname + '/dist/index.html');
        });
        app.use((req, res, next) => {
            res.redirect(404, "/");
        });

        function getApiRoutes() {
            return app._router.stack.filter((e) => e.route).map((e) => e.route).map((r) => r.path).filter((r) => r.startsWith("/api/") && !r.startsWith("/api/admin"));
        }

        async function refreshWlCaches() {
            const allCachedKeys = wlOutputCache.keys();
            for (let key of allCachedKeys) {
                const parsedKey = key.match(/\/(.+)\/(.*)\?(true|false)/i);
                // console.log(`Refreshing cache for: ${key}`, parsedKey[ 1 ], parsedKey[ 2 ], parsedKey[ 3 ] == "true")
                await generateOutput(parsedKey[ 1 ], parsedKey[ 2 ], parsedKey[ 3 ] == "true", true)
            }
        }
        async function initWlCaches() {
            console.log('Initializing WL List Caches')
            const dbo = await mongoConn();
            const lists = await dbo.collection("lists").find().toArray();
            for (let list of lists) {
                const cacheKey = `/${list.output_path}/?false`;
                await generateOutput(list.output_path, "", false);
                let isCached = wlOutputCache.get(cacheKey) != null
                console.log(` > "${list.title}": ${isCached ? "CACHED" : "NOT CACHED"}`)
            }
        }

        function removeExpiredPlayers(next = null) {
            return new Promise((resolve, reject) => {
                mongoConn((dbo) => {
                    dbo.collection("whitelists").deleteOne({ expiration: { $lte: new Date() } }, (err, dbRes) => {
                        if (err) {
                            console.error('removeExpiredPlayers', err)
                            reject(err);
                        }
                        if (next) next();
                        resolve(dbRes)
                    })
                })
            })
        }

        async function getSession(req, res, callback) {
            const apiKey = req.sanitizedQuery.apiKey || req.sanitizedBody.apiKey;
            const isApiKey = !!apiKey;
            const token = isApiKey ? mongoSanitize(apiKey) : mongoSanitize(req.cookies.stok);
            const collection = isApiKey ? "keys" : "sessions";

            if (!token || token === "" || typeof token !== 'string')
                return callback();

            if (isApiKey && typeof apiKey !== 'string')
                return callback();

            const dbo = await mongoConn();

            let session = {
                session_expiration: new Date(Date.now() + 120000),
                login_date: new Date()
            };

            const sessionDbData = await dbo.collection(collection).findOne({ token: token }, { projection: { _id: 0 } });
            if (!sessionDbData)
                return callback()

            session = { ...session, ...sessionDbData };

            if (isApiKey) {
                session.id_user = session.inserted_by
                delete session.inserted_by;
                // For API keys, use the key's access_level, not the user's
            } else {
                const user = await dbo.collection("users").findOne({ _id: session.id_user }, { projection: { _id: 0 } })
                if (!user)
                    return callback()

                session = { ...session, ...user };
            }

            if (session.session_expiration <= new Date())
                return callback();

            req.userSession = session;

            return callback();
        }
        function requireLogin(req, res, callback = null) {
            const parm = Object.keys(req.sanitizedQuery).length > 0 ? req.sanitizedQuery : req.sanitizedBody;
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
            if (!req.userSession) res.status(401).send({ status: "login_required" });
            else callback();//authorizeDCSUsers(req, res, callback)
        }
        function logRequests(req, res, next) {
            if (!server.logging.requests) return next();

            const reqPath = getReqPath(req);
            if (!reqPath.startsWith('/api')) return next();

            const startTime = Date.now();
            const method = req.method;
            const ip = req.ip || req.connection.remoteAddress;
            const user = req.userSession?.username || 'anonymous';

            res.on('finish', () => {
                const duration = Date.now() - startTime;
                const status = res.statusCode;
                console.log(`[API] ${method} ${reqPath} | ${status} | ${duration}ms | ${user} | ${ip}`);
            });

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
                .get(releasesUrl, { timeout: 10000 })
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

    async function sendDiscordMessage(target, message, context = 'channel') {
        try {
            if (!target) {
                console.error(`[Discord] Cannot send message: ${context} not found`);
                return null;
            }
            return await target.send(message);
        } catch (error) {
            const errorMessages = {
                50001: `Missing access to ${context}`,
                50013: `Missing permissions to send message in ${context}`,
                50007: `Cannot send message to this user (DMs disabled or bot blocked)`,
                10003: `Unknown ${context}`,
                10004: `Unknown guild`,
                10008: `Unknown message`,
                50035: `Invalid message format`,
                40005: `Request entity too large`,
            };
            const friendlyMessage = errorMessages[ error.code ] || `Failed to send message (${error.message})`;
            console.error(`[Discord] ${friendlyMessage}`);
            return null;
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
                discordClient = new Proxy(client, {});
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

                async function temporizedRoleUpdate() {
                    const guild = await client.guilds.cache.get(config.discord_bot.server_id)
                    const allMembers = await guild.members.fetch();
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
                const dbo = await mongoConn()
                switch (packet.t) {
                    case 'GUILD_MEMBER_UPDATE':
                        let user_roles = packet.d.roles;
                        dbo.collection("players").updateOne({ discord_user_id: user_id }, { $set: { discord_user_id: user_id, discord_username: packet.d.user.username + "#" + packet.d.user.discriminator, discord_roles_ids: user_roles } }, { upsert: true })
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
                                                    sendDiscordMessage(client.channels.cache.get(interaction.channelId), { embeds: embeds }, 'interaction channel');
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
                            console.error('updateUserRoles_1', error)
                        }
                    } else {
                        mongoConn((dbo) => {
                            dbo.collection("players").updateOne({ discord_user_id: member_id }, { $set: { discord_roles_ids: [] } })
                        })
                    }
                } catch (error) {
                    console.error('updateUserRoles_2', error)
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
        console.log("Starting SquadJS WebSockets");
        for (let sqJsK in config.squadjs) {
            subcomponent_status.squadjs[ sqJsK ] = false;
            const sqJsConn = config.squadjs[ sqJsK ];

            await new Promise(async (res, rej) => {
                console.error(` > Connection ${+sqJsK + 1}: ${sqJsConn.websocket.host}:${sqJsConn.websocket.port}`);

                if (sqJsConn.websocket && sqJsConn.websocket.token != "" && sqJsConn.websocket.host != "") {
                    if (!subcomponent_data.squadjs[ sqJsK ]) {
                        subcomponent_data.squadjs[ sqJsK ] = {
                            socket: null,
                            failedReconnections: 0,
                            reconnect_int: null,
                            recentErrors: 0,
                            isConnecting: false,
                            isReconnecting: false
                        };
                    }

                    try {
                        const res_ip = (await lookup(sqJsConn.websocket.host)).address;

                        const createConnection = () => {
                            if (subcomponent_data.squadjs[ sqJsK ].isConnecting) {
                                return;
                            }

                            subcomponent_data.squadjs[ sqJsK ].isConnecting = true;

                            const tm = setTimeout(() => {
                                console.error(`  > Connection ${+sqJsK + 1}: Timed out. Check your SquadJS WebSocket configuration.`);
                                subcomponent_data.squadjs[ sqJsK ].isConnecting = false;

                                if (!subcomponent_status.squadjs[ sqJsK ]) {
                                    if (!subcomponent_data.squadjs[ sqJsK ].isReconnecting) {
                                        startReconnectionInterval(sqJsK);
                                    }
                                    if (!res.called) {
                                        res.called = true;
                                        res(false);
                                    }
                                }
                            }, 5000);

                            if (subcomponent_data.squadjs[ sqJsK ].socket) {
                                try {
                                    subcomponent_data.squadjs[ sqJsK ].socket.removeAllListeners();
                                    subcomponent_data.squadjs[ sqJsK ].socket.disconnect();
                                } catch (e) { }
                            }

                            subcomponent_data.squadjs[ sqJsK ].socket = io(`ws://${res_ip}:${sqJsConn.websocket.port}`, {
                                auth: {
                                    token: sqJsConn.websocket.token
                                },
                                autoUnref: true,
                                reconnection: true,
                                reconnectionAttempts: 3,
                                reconnectionDelay: 5000,
                                reconnectionDelayMax: 30000,
                                timeout: 10000
                            });

                            subcomponent_data.squadjs[ sqJsK ].socket.on("connect", () => {
                                clearTimeout(tm);
                                console.log(`  > Connection ${+sqJsK + 1}: Connected successfully`);

                                if (subcomponent_data.squadjs[ sqJsK ].reconnect_int) {
                                    clearInterval(subcomponent_data.squadjs[ sqJsK ].reconnect_int);
                                    subcomponent_data.squadjs[ sqJsK ].reconnect_int = null;
                                    subcomponent_data.squadjs[ sqJsK ].isReconnecting = false;
                                }

                                subcomponent_status.squadjs[ sqJsK ] = true;
                                subcomponent_data.squadjs[ sqJsK ].failedReconnections = 0;
                                subcomponent_data.squadjs[ sqJsK ].recentErrors = 0;
                                subcomponent_data.squadjs[ sqJsK ].isConnecting = false;

                                if (!squadjs.initDone) {
                                    squadjs.initDone = true;
                                }

                                if (!res.called) {
                                    res.called = true;
                                    res(true);
                                }
                            });

                            subcomponent_data.squadjs[ sqJsK ].socket.on("connect_error", (err) => {
                                // console.error(`  > Connection ${+sqJsK + 1}: Connect error:`, err.message);
                                clearTimeout(tm);
                                subcomponent_data.squadjs[ sqJsK ].isConnecting = false;
                                subcomponent_data.squadjs[ sqJsK ].recentErrors++;

                                if (!subcomponent_status.squadjs[ sqJsK ]) {
                                    if (!subcomponent_data.squadjs[ sqJsK ].isReconnecting) {
                                        startReconnectionInterval(sqJsK);
                                    }
                                    if (!res.called) {
                                        res.called = true;
                                        res(false);
                                    }
                                }
                            });

                            subcomponent_data.squadjs[ sqJsK ].socket.on("disconnect", (reason) => {
                                subcomponent_status.squadjs[ sqJsK ] = false;
                                subcomponent_data.squadjs[ sqJsK ].isConnecting = false;
                                console.log(`SquadJS WebSocket ${+sqJsK + 1}\n > Disconnected (${reason})\n > Trying to reconnect`);

                                if (!subcomponent_data.squadjs[ sqJsK ].isReconnecting) {
                                    startReconnectionInterval(sqJsK);
                                }
                            });

                            subcomponent_data.squadjs[ sqJsK ].socket.on("reconnect_failed", () => {
                                console.error(`  > Connection ${+sqJsK + 1}: Built-in reconnection failed after maximum attempts`);
                                if (!subcomponent_data.squadjs[ sqJsK ].isReconnecting) {
                                    startReconnectionInterval(sqJsK);
                                }
                            });

                            setupEventHandlers(sqJsK);
                        };

                        function startReconnectionInterval(sqJsK, intervalSeconds = 30) {
                            if (subcomponent_data.squadjs[ sqJsK ].isReconnecting) {
                                return;
                            }

                            if (subcomponent_data.squadjs[ sqJsK ].reconnect_int) {
                                clearInterval(subcomponent_data.squadjs[ sqJsK ].reconnect_int);
                                subcomponent_data.squadjs[ sqJsK ].reconnect_int = null;
                            }

                            subcomponent_data.squadjs[ sqJsK ].isReconnecting = true;
                            console.log(`  > Setting up reconnection interval for connection ${+sqJsK + 1} (${intervalSeconds}s)`);

                            subcomponent_data.squadjs[ sqJsK ].reconnect_int = setInterval(() => {
                                if (subcomponent_status.squadjs[ sqJsK ] || subcomponent_data.squadjs[ sqJsK ].isConnecting) {
                                    return;
                                }

                                subcomponent_data.squadjs[ sqJsK ].failedReconnections++;
                                const failedCount = subcomponent_data.squadjs[ sqJsK ].failedReconnections;

                                console.log(`SquadJS websocket ${+sqJsK + 1}\n  > Reconnection attempt ${failedCount} for connection ${+sqJsK + 1}`);

                                if (failedCount % 5 === 0) {
                                    const nextIntervalSeconds = Math.min(300, intervalSeconds * 2);

                                    if (nextIntervalSeconds > intervalSeconds) {
                                        console.log(`  > Increasing reconnection interval to ${nextIntervalSeconds}s`);
                                        clearInterval(subcomponent_data.squadjs[ sqJsK ].reconnect_int);
                                        subcomponent_data.squadjs[ sqJsK ].reconnect_int = null;
                                        startReconnectionInterval(sqJsK, nextIntervalSeconds);
                                        return;
                                    }
                                }

                                createConnection();
                            }, intervalSeconds * 1000);
                        }

                        function setupEventHandlers(sqJsK) {
                            const socket = subcomponent_data.squadjs[ sqJsK ].socket;

                            socket.on("PLAYER_CONNECTED", async (dt) => {
                                try {
                                    if (dt && dt.player && dt.player.steamID) {
                                        await updatePlayerData(dt, socket);
                                        setTimeout(() => {
                                            welcomeMessage(dt);
                                        }, 10000);
                                    } else {
                                        console.log('A player joined with some undefined data', dt);
                                    }
                                } catch (error) {
                                    console.error("PLAYER_CONNECTED ERROR", error);
                                }
                            });

                            socket.on("PLAYER_DISCONNECTED", data => updatePlayerData(data, socket));

                            socket.on("CHAT_MESSAGE", async (dt) => {
                                await updatePlayerData(dt, socket);
                                switch (dt.message.toLowerCase().replace(/^(!|\/)/, '')) {
                                    case 'test':
                                        break;
                                    case 'playerinfo':
                                        const dbo = await mongoConn();
                                        const oldPlayerData = await dbo.collection("players").findOne({ steamid64: dt.player.steamID }, { projection: { _id: 0, seeding_points: 1 } });
                                        break;
                                    case 'profile':
                                        welcomeMessage(dt, 0);
                                        break;
                                    default:
                                        if (dt.message.length == 6 && !dt.message.includes(' ')) {
                                            mongoConn(async (dbo) => {
                                                dbo.collection("profilesLinking").findOne({ code: dt.message }, async (err, dbRes) => {
                                                    if (err) serverError(null, err);
                                                    else if (dbRes) {
                                                        if (dbRes.expiration > new Date()) {
                                                            const discordUser = await discordClient.users.fetch(dbRes.discordUserId);
                                                            const discordUsername = discordUser.username + (discordUser.discriminator ? "#" + discordUser.discriminator : '');
                                                            const oldPlayerData = await dbo.collection("players").findOne({ steamid64: dt.player.steamID }, { projection: { _id: 0, seeding_points: 1 } });
                                                            dbo.collection("players").updateOne({ discord_user_id: dbRes.discordUserId }, { $set: { steamid64: dt.player.steamID, username: dt.player.name, discord_user_id: dbRes.discordUserId, discord_username: discordUsername, ...oldPlayerData } }, { upsert: true }, (err, dbResU) => {
                                                                dbo.collection("players").deleteOne({ steamid64: dt.player.steamID, discord_user_id: { $exists: false } }, (err, dbResRem) => {
                                                                    if (err) return serverError(null, err);

                                                                    dbo.collection("profilesLinking").deleteOne({ _id: dbRes._id });
                                                                    if (err) serverError(null, err);
                                                                    else {
                                                                        socket.emit("rcon.warn", dt.steamID, "Linked Discord profile: " + discordUsername, (d) => { });
                                                                        sendDiscordMessage(discordUser, {
                                                                            embeds: [
                                                                                new Discord.EmbedBuilder()
                                                                                    .setColor(config.app_personalization.accent_color)
                                                                                    .setTitle("Profile Linked")
                                                                                    .setDescription("Your Discord profile has been linked to a Steam profile")
                                                                                    .addFields(
                                                                                        { name: "Steam Username", value: dt.name, inline: true },
                                                                                        { name: 'SteamID', value: Discord.hyperlink(dt.steamID, "https://steamcommunity.com/profiles/" + dt.steamID), inline: true })
                                                                            ]
                                                                        }, 'user DM');
                                                                    }
                                                                });
                                                            });
                                                        } else {
                                                            dbo.collection("profilesLinking").deleteOne({ _id: dbRes._id });
                                                        }
                                                    }
                                                });
                                            });
                                        }
                                        break;
                                }
                            });
                        }

                        async function updatePlayerData(data, socket = null) {
                            if (!data || !data.player || !data.player.steamID) {
                                console.error('Unable to update player data due to empty player object:', data)
                                return;
                            }

                            const dbo = await mongoConn();
                            const updData = { username: data.player.name };

                            if (data.player.eosID)
                                updData.eosID = data.player.eosID;

                            const ret = await Promise.all([
                                dbo.collection("players").updateOne({ steamid64: data.player.steamID }, { $set: updData }, { upsert: true }),
                                data.player.eosID ? dbo.collection("whitelists").updateMany({ steamid64: data.player.steamID, eosID: { $exists: false } }, { $set: { eosID: data.player.eosID } }) : null
                            ].filter(e => e != null));

                            const playerData = await dbo.collection("players").findOne({ steamid64: data.player.steamID });

                            if (!playerData?.discord_user_id) {
                                try {
                                    const response = await axios.get(`https://api.mysquadstats.com/playerLink?steamID=${data.player.steamID}`);
                                    const linkData = response.data.data;

                                    if (linkData?.discordID) {
                                        const discordUserId = linkData.discordID;

                                        try {
                                            const discordUser = !discordClient ? null : await discordClient.users.fetch(discordUserId);
                                            const discordUsername = !discordUser ? null : discordUser.username + (discordUser.discriminator ? "#" + discordUser.discriminator : '');

                                            const oldPlayerData = await dbo.collection("players").findOne(
                                                { steamid64: data.player.steamID },
                                            );

                                            const oldDataForUpdate = { ...oldPlayerData };
                                            delete oldDataForUpdate._id;

                                            await dbo.collection("players").updateOne(
                                                { discord_user_id: discordUserId },
                                                {
                                                    $set: {
                                                        steamid64: data.player.steamID,
                                                        username: data.player.name,
                                                        ...(discordUserId && { discord_user_id: discordUserId }),
                                                        ...(discordUsername && { discord_username: discordUsername }),
                                                        ...oldDataForUpdate
                                                    }
                                                },
                                                { upsert: true }
                                            );

                                            await dbo.collection("players").deleteOne({ _id: oldPlayerData._id });

                                            if (socket)
                                                socket.emit("rcon.warn", data.player.steamID, `Linked Discord profile ${discordUsername || ''}`.trim(), (d) => { });

                                            if (discordUser)
                                                sendDiscordMessage(discordUser, {
                                                    embeds: [
                                                        new Discord.EmbedBuilder()
                                                            .setColor(config.app_personalization.accent_color)
                                                            .setTitle("Profile Linked")
                                                            .setDescription("Your Discord profile has been linked to a Steam profile")
                                                            .addFields(
                                                                { name: "Steam Username", value: data.player.name, inline: true },
                                                                { name: 'SteamID', value: Discord.hyperlink(data.player.steamID, "https://steamcommunity.com/profiles/" + data.player.steamID), inline: true }
                                                            )
                                                    ]
                                                }, 'user DM');
                                        } catch (discordErr) {
                                            console.error("Error linking Discord profile using MSS API data:", discordErr);
                                        }
                                    }
                                } catch (apiErr) {
                                    console.error("Error fetching Discord link data from MSS API:", apiErr);
                                }
                            }

                            return ret;
                        }

                        async function welcomeMessage(dt, timeoutDelay = 5000) {
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
                                ];
                                dbo.collection("whitelists").aggregate(pipeline).toArray(async (err, dbRes) => {
                                    if (err) serverError(null, err);
                                    else {
                                        dbo.collection("players").findOne({ steamid64: dt.player.steamID }, async (err, dbResP) => {
                                            if (err) serverError(null, err);
                                            else {
                                                const st = await dbo.collection('configs').findOne({ category: 'seeding_tracker' });
                                                const stConf = st.config;
                                                const requiredPoints = stConf.reward_needed_time.value * (stConf.reward_needed_time.option / 1000 / 60);
                                                const percentageCompleted = Math.floor(100 * (dbResP?.seeding_points || 0) / requiredPoints) || 0;

                                                let msg = "Welcome " + dt.player.name + "\n\n";

                                                if (subcomponent_status.squadjs) {
                                                    let groups = (await getPlayerGroups(dt.player.steamID)).filter(e => e.approved);

                                                    if (groups.length > 0) {
                                                        msg += `Groups:\n`;
                                                        for (let g of groups) {
                                                            msg += ` - ${g.name}`;
                                                            if (g.expiration) msg += `: ${((g.expiration - new Date()) / 1000 / 60 / 60).toFixed(1) + "h left"}`;
                                                            msg += '\n';
                                                        }
                                                    }
                                                }

                                                if (subcomponent_status.discord_bot) {
                                                    let discordUsername = "";
                                                    if (dbResP && dbResP.discord_user_id && dbResP.discord_user_id != "") {
                                                        try {
                                                            const discordUser = await discordClient.users.fetch(dbResP.discord_user_id);
                                                            discordUsername = discordUser.username + (discordUser.discriminator ? "#" + discordUser.discriminator : '');
                                                        } catch (e) {
                                                            console.error(`Error fetching Discord user: ${e.message}`);
                                                        }
                                                    }

                                                    if (stConf.reward_enabled == 'true') msg += "\nSeeding Reward: " + percentageCompleted + "%";
                                                    msg += "\nDiscord Username: " + (discordUsername != "" ? discordUsername : "Not linked");
                                                }

                                                if (subcomponent_status.squadjs && config.app_personalization.send_welcome_message) {
                                                    setTimeout(() => {
                                                        try {
                                                            subcomponent_data.squadjs[ sqJsK ].socket.emit("rcon.warn", dt.player.steamID, msg, (d) => { });
                                                        } catch (e) {
                                                            console.error(`Error sending welcome message: ${e.message}`);
                                                        }
                                                    }, timeoutDelay);
                                                }
                                            }
                                        });
                                    }
                                });
                            });
                        }

                        createConnection();

                    } catch (error) {
                        console.error(`Error in SquadJS WebSocket ${+sqJsK + 1} setup:`, error);
                        subcomponent_data.squadjs[ sqJsK ].isConnecting = false;
                        if (!res.called) {
                            res.called = true;
                            res(false);
                        }
                    }
                } else {
                    console.log(` > ${+sqJsK + 1} Not configured. Skipping.`);
                    if (cb) cb();
                    res(false);
                }
            });
        }

        return true;
    }

    function emitPromise(socket, event, data, timeout = 2) {
        const initial = Date.now();
        return new Promise((resolve, reject) => {
            socket.timeout(timeout * 1000).emit(event, data,
                (err, response) => {
                    if (err) {
                        const fin = Date.now()
                        const elapsed = +fin - +initial;
                        return reject(err);
                    }
                    resolve(response);
                }
            );
        });
    }

    async function seedingTimeTracking() {
        console.log('Seeding Tracker: Starting')
        const checkIntervalMinutes = 1;

        _check()
        console.log('Seeding Tracker: Started')

        setInterval(_check, checkIntervalMinutes * 60 * 1000)
        async function _check() {
            const dbo = await mongoConn();
            const st = await dbo.collection('configs').findOne({ category: 'seeding_tracker' })
            const stConf = st.config;
            if (!stConf) {
                console.log('Seeding tracker configuration not set, unable to proceed.')
                return;
            }
            if (!stConf.reward_needed_time) {
                console.log('Reward needed time not configured. Unable to track seeding progress.')
                return;
            }
            const requiredPoints = stConf.reward_needed_time.value * (stConf.reward_needed_time.option / 1000 / 60)
            const players = [];
            const activeSeedingConnections = []

            for (let sqJsK in subcomponent_data.squadjs) {
                if (!subcomponent_status.squadjs[ sqJsK ]) continue;
                // const singleServerPlayers = (await util.promisify(subcomponent_data.squadjs[ sqJsK ].socket.emit)("rcon.getListPlayers"))

                let singleServerPlayers

                activeSeedingConnections[ sqJsK ] = false;
                try {
                    singleServerPlayers = await emitPromise(subcomponent_data.squadjs[ sqJsK ].socket, "rcon.getListPlayers", {}, 5)
                } catch (err) {
                    console.error(`Seeding tracker (${+sqJsK + 1}): ${err}`)
                    if (++subcomponent_data.squadjs[ sqJsK ].recentErrors > 5 && subcomponent_status.squadjs)
                        subcomponent_data.squadjs[ sqJsK ].socket.disconnect()
                    continue;
                }

                for (let p of singleServerPlayers) {
                    p.sqJsConnectionIndex = sqJsK
                    players.push(p);
                }

                if (singleServerPlayers && singleServerPlayers.length >= (stConf.seeding_start_player_count || 2) && singleServerPlayers.length <= stConf.seeding_player_threshold)
                    activeSeedingConnections[ sqJsK ] = true;
            }
            // console.log('Online Players', players)

            firstStart = false;

            if (!activeSeedingConnections.includes(true)) return;

            mongoConn(async dbo => {

                if (players && players.length > 0) {
                    if (st.config.tracking_mode == 'incremental') {
                        let deduction_points = 0;

                        if (st.config.time_deduction.option == 'point_minute') deduction_points = st.config.time_deduction.value
                        else if (st.config.time_deduction.option == 'perc_minute') deduction_points = st.config.time_deduction.value * requiredPoints / 100;

                        const pointDeductionDateThreshold = new Date(Date.now() - (st.config.minimum_reward_duration.value * st.config.minimum_reward_duration.option))

                        await dbo.collection("players").updateMany(
                            {
                                steamid64: { $nin: players.map(p => p.steamID) },
                                $or: [
                                    { latest_seeding_activity: { $lt: pointDeductionDateThreshold } },
                                    { seeding_points: { $lt: requiredPoints } }
                                ]
                            },
                            [
                                {
                                    $set: {
                                        seeding_points: {
                                            $max: [
                                                0,
                                                { $subtract: [ "$seeding_points", deduction_points ] }
                                            ]
                                        }
                                    }
                                }
                            ]
                        )
                    }

                    for (let p of players) {
                        if (!activeSeedingConnections[ p.sqJsConnectionIndex ]) continue;

                        const oldPlayerData = await dbo.collection("players").findOne({ steamid64: p.steamID });
                        dbo.collection("players").findOneAndUpdate({ steamid64: p.steamID }, { $set: { steamid64: p.steamID, username: p.name, latest_seeding_activity: new Date() }, $inc: { seeding_points: 1 } }, { upsert: true, returnDocument: 'after' }, async (err, dbRes) => {
                            if (err) serverError(null, err)
                            else if (stConf.reward_enabled == "true") {
                                const stepOld = Math.min(Math.floor(10 * oldPlayerData?.seeding_points / requiredPoints), 10) || 0;
                                const percentageCompletedOld = stepOld * 10;
                                const step = Math.min(Math.floor(10 * dbRes.value?.seeding_points / requiredPoints), 10) || 0;
                                const percentageCompleted = step * 10

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
                                        sendDiscordMessage(discordClient.channels.cache.get(stConf.discord_seeding_score_channel), messageContent, 'seeding score channel')

                                    } else if (percentageCompleted == 100) {
                                        const reward_group = await dbo.collection('groups').findOne({ _id: safeObjectID(st.config.reward_group_id) })
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
                                            sendDiscordMessage(discordClient.channels.cache.get(stConf.discord_seeding_reward_channel), { embeds: embeds }, 'seeding reward channel')
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


    async function getPlayerGroups(steamid64) {
        const dbo = await mongoConn()
        const allGroups = await dbo.collection('groups').find().toArray()
        const st = await dbo.collection('configs').findOne({ category: 'seeding_tracker' })
        const stConf = st.config;
        const requiredPoints = stConf.reward_needed_time.value * (stConf.reward_needed_time.option / 1000 / 60)
        // console.log('CREATING objIdRewardGroup from value:', st.config.reward_group_id)
        let objIdRewardGroup;// = safeObjectID(st.config.reward_group_id)
        try {
            objIdRewardGroup = safeObjectID(st.config.reward_group_id)
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

            if (!g) {
                dbo.collection('whitelists').deleteOne({ _id: _e._id })
                return;
            }


            let e = {}
            e.id = _e.id_group.toString()
            e.name = g.group_name
            e.expiration = _e.expiration
            e.approved = _e.approved
            e.source = 'Whitelists'
            return e;
        }).filter(g => g != null))

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

    function mongoConn(connCallback = () => { }, override = false) {
        return new Promise((resolve, reject) => {
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
                    if (err) {
                        reject(err);
                        return;
                    }
                    var dbo = dbName ? db.db(dbName) : db.db();
                    connCallback(dbo);
                    resolve(dbo)
                });
            } else {
                connCallback(mongodb_conn)
                resolve(mongodb_conn)
            }

        })
    }

    function getDateFromEpoch(ep) {
        let d = new Date(0);
        d.setUTCSeconds(ep);
        return d;
    }

    class MongoBackup {
        constructor(dbo, options = {}) {
            this.dbo = dbo;
            this.batchSize = options.batchSize || 1000;
            this.cursorBatchSize = options.cursorBatchSize || 500;
        }

        async backup(outputDir, collections = null) {
            let collectionNames;
            if (collections === null) {
                const colList = await this.dbo.listCollections().toArray();
                collectionNames = colList.map(c => c.name);
            } else {
                collectionNames = collections;
            }

            const metaCollections = [];

            for (const name of collectionNames) {
                const col = this.dbo.collection(name);
                const estimatedCount = await col.estimatedDocumentCount();
                console.log(`Backing up collection: ${name} (~${estimatedCount} docs)`);

                const allIndexes = await col.indexes();
                const indexes = allIndexes.filter(idx => idx.name !== '_id_');

                const filePath = path.join(outputDir, `${name}.ndjson.gz`);
                const fileStream = fs.createWriteStream(filePath);

                const transform = new Transform({
                    objectMode: true,
                    transform(doc, encoding, callback) {
                        try {
                            const line = EJSON.stringify(doc, { relaxed: false }) + '\n';
                            callback(null, line);
                        } catch (err) {
                            callback(err);
                        }
                    }
                });

                const gzipStream = createGzip();
                const pipelinePromise = pipeline(transform, gzipStream, fileStream);

                const cursor = col.find({}, { batchSize: this.cursorBatchSize });
                let docCount = 0;

                for await (const doc of cursor) {
                    const canWrite = transform.write(doc);
                    docCount++;

                    if (docCount % 50000 === 0) {
                        console.log(`  ${name}: ${docCount} docs processed...`);
                    }

                    if (!canWrite) {
                        await new Promise(resolve => transform.once('drain', resolve));
                    }
                }

                transform.end();
                await pipelinePromise;

                console.log(`  ${name}: ${docCount} docs backed up`);
                metaCollections.push({ name, indexes, documentCount: docCount });
            }

            const meta = {
                dbName: this.dbo.databaseName,
                date: new Date().toISOString(),
                collections: metaCollections
            };

            fs.writeFileSync(path.join(outputDir, '_meta.json'), JSON.stringify(meta, null, 2));

            return meta;
        }

        async restore(inputDir, { drop = false } = {}) {
            const metaRaw = fs.readFileSync(path.join(inputDir, '_meta.json'), 'utf-8');
            const meta = JSON.parse(metaRaw);

            const results = {};

            for (const colMeta of meta.collections) {
                const { name, indexes, documentCount } = colMeta;
                console.log(`Restoring collection: ${name} (${documentCount} docs)`);

                const collection = this.dbo.collection(name);

                if (drop) {
                    try {
                        await collection.drop();
                    } catch (err) {
                        // Silently ignore drop errors (e.g. collection doesn't exist)
                    }
                }

                const filePath = path.join(inputDir, `${name}.ndjson.gz`);
                const fileStream = fs.createReadStream(filePath);
                const gunzipStream = createGunzip();
                const rl = readline.createInterface({
                    input: fileStream.pipe(gunzipStream),
                    crlfDelay: Infinity
                });

                let batch = [];
                let inserted = 0;
                let errors = 0;

                for await (const line of rl) {
                    if (!line.trim()) continue;
                    const doc = EJSON.parse(line);
                    batch.push(doc);

                    if (batch.length >= this.batchSize) {
                        try {
                            const result = await collection.insertMany(batch, { ordered: false });
                            inserted += result.insertedCount;
                        } catch (err) {
                            if (err.code === 11000) {
                                inserted += (err.result?.nInserted || err.insertedCount || 0);
                                errors += batch.length - (err.result?.nInserted || err.insertedCount || 0);
                            } else {
                                throw err;
                            }
                        }
                        batch = [];
                    }
                }

                // Insert remaining docs
                if (batch.length > 0) {
                    try {
                        const result = await collection.insertMany(batch, { ordered: false });
                        inserted += result.insertedCount;
                    } catch (err) {
                        if (err.code === 11000) {
                            inserted += (err.result?.nInserted || err.insertedCount || 0);
                            errors += batch.length - (err.result?.nInserted || err.insertedCount || 0);
                        } else {
                            throw err;
                        }
                    }
                }

                // Recreate indexes
                for (const idx of indexes) {
                    if (idx.name === '_id_') continue;
                    const { key, ...options } = idx;
                    delete options.v;
                    try {
                        await collection.createIndex(key, options);
                    } catch (err) {
                        console.error(`  Warning: failed to create index ${idx.name} on ${name}:`, err.message);
                    }
                }

                console.log(`  ${name}: ${inserted} inserted, ${errors} errors`);
                results[ name ] = { inserted, errors };
            }

            return { collections: meta.collections, results };
        }
    }

    var backupInProgress = false;

    async function performBackup(dbo, backupConfig, manual = false) {
        if (backupInProgress) throw new Error('Backup already in progress');
        backupInProgress = true;
        try {
            fs.ensureDirSync(BACKUP_DIR);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const archiveName = `backup_${timestamp}`;
            const tempDir = path.join(BACKUP_DIR, `.tmp_${timestamp}`);
            fs.ensureDirSync(tempDir);

            try {
                const mb = new MongoBackup(dbo, { batchSize: 1000, cursorBatchSize: 500 });
                const meta = await mb.backup(tempDir);

                if (backupConfig.include_config_file !== false && fs.existsSync(configPath)) {
                    fs.copyFileSync(configPath, path.join(tempDir, 'conf.json'));
                }

                const info = {
                    name: archiveName,
                    timestamp: new Date().toISOString(),
                    manual,
                    collections: meta.collections.map(c => ({ name: c.name, documentCount: c.documentCount })),
                    includesConfig: backupConfig.include_config_file !== false && fs.existsSync(configPath),
                };
                fs.writeFileSync(path.join(tempDir, '_backup_info.json'), JSON.stringify(info, null, 2));

                const archivePath = path.join(BACKUP_DIR, `${archiveName}.tar.gz`);
                await tar.create({
                    gzip: true,
                    file: archivePath,
                    cwd: tempDir,
                }, fs.readdirSync(tempDir));

                fs.writeFileSync(path.join(BACKUP_DIR, `${archiveName}.info.json`), JSON.stringify(info, null, 2));

                const maxRetention = backupConfig.auto_backup?.max_retention_count || 10;
                enforceRetention(BACKUP_DIR, maxRetention);

                console.log(`Backup complete: ${archivePath}`);
                return info;
            } finally {
                fs.removeSync(tempDir);
            }
        } finally {
            backupInProgress = false;
        }
    }

    function enforceRetention(backupDir, maxCount) {
        if (!fs.existsSync(backupDir)) return;
        const archives = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup_') && f.endsWith('.tar.gz'))
            .map(f => ({
                name: f,
                path: path.join(backupDir, f),
                time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (archives.length > maxCount) {
            const toDelete = archives.slice(maxCount);
            for (const entry of toDelete) {
                console.log(`Retention: deleting old backup ${entry.name}`);
                fs.removeSync(entry.path);
                const infoPath = entry.path.replace('.tar.gz', '.info.json');
                if (fs.existsSync(infoPath)) fs.removeSync(infoPath);
            }
        }
    }

    function serverError(res, err) {
        if (res) res.sendStatus(500);
        console.error(err);
    }

    function toUpperFirstChar(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    async function generateApiDocs() {
        apiDocsJson = fs.readFileSync(path.join(__dirname, 'docs/api/docs.json')).toString()
    }
    function getBaseConfigTemplate() {
        return {
            web_server: {
                bind_ip: "0.0.0.0",
                http_server_disabled: (process.env.HTTP_SERVER_DISABLED == 'true' && process.env.HTTP_SERVER_DISABLED == '1') || false,
                http_port: 80,
                https_server_disabled: (process.env.HTTPS_SERVER_DISABLED == 'true' && process.env.HTTPS_SERVER_DISABLED == '1') || false,
                https_port: 443,
                force_https: false,
                session_duration_hours: 168,
            },
            database: {
                mongo: {
                    host: process.env.MONGODB_CONNECTION_STRING || "127.0.0.1",
                    port: 27017,
                    database: "Whitelister",
                }
            },
            app_personalization: {
                name: "Whitelister",
                favicon: "",
                accent_color: "#ffc40b",
                logo_url: "https://joinsquad.com/wp-content/themes/squad/img/logo.png",
                logo_border_radius: "10",
                title_hidden_in_header: false,
                send_welcome_message: true
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
            custom_permissions: [
                {
                    name: "Example Custom Permission",
                    permission: "example_custom_perm"
                }
            ],
            other: {
                automatic_updates: true,
                update_check_interval_seconds: 3600,
                whitelist_developers: true,
                install_beta_versions: false,
                logs_max_file_count: 10,
                lists_cache_refresh_seconds: 60,
                prefer_eosID: true,
                prepend_date_time_in_console: false,
                force_lists_output_caching: false,
                logs_max_file_size_mb: 250,
                logs_max_buffer_size_mb: 0.5
            }
        };
    }

    function initConfigFile(callback) {

        console.log("Current dir: ", __dirname);
        console.log(`Configuration file path: ${configPath}`)
        let emptyConfFile = getBaseConfigTemplate();

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
                },
                minimum_reward_duration: {
                    value: 1,
                    option: 3600000
                },
            }
        }

        mongoConn(async (dbo) => {
            subcomponent_data.database.root_user_registered = (await dbo.collection("users").findOne({ access_level: 0 })) ? true : false;
            if (args.demo) dbo.collection("users").updateOne({ username: 'demoadmin' }, { $set: { password: crypto.createHash('sha512').update('demo').digest('hex'), access_level: 5 } }, { upsert: true })

            await syncDatabaseIndexes();

            dbo.collection("players").deleteMany({ discord_user_id: { $exists: true }, steamid64: { $exists: false } })

            if (!(await dbo.collection("configs").findOne({ category: "seeding_tracker", config: { $exists: true } })))
                dbo.collection("configs").updateOne({ category: "seeding_tracker" }, { $set: { config: { tracking_mode: 'incremental' } } }, { upsert: true })

            if (!(await dbo.collection("configs").findOne({ category: "backup", config: { $exists: true } })))
                dbo.collection("configs").updateOne({ category: "backup" }, { $set: { config: { auto_backup: { enabled: true, schedule: { value: 1, option: 86400000 }, next_backup: (new Date()).toISOString().split(/T/)[ 0 ], max_retention_count: 10 }, include_config_file: true } } }, { upsert: true })

            await repairSeedingTrackerConfigFormat();
            await resetSeedingTrackerConfig();
            await fixSeedingTrackerRewardGroup();
            await sanitizeWhitelistPlayerIds(dbo);
            await loadIPBlacklist();

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
                        'eosID',
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
                        'eosID',
                        'id_group',
                        'id_list'
                    ],
                    keys: [
                        'token'
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

    function validateConfigChange(category, configData) {
        const errors = [];
        const warnings = [];

        if (typeof category !== 'string' || !category.trim()) {
            errors.push('Category must be a non-empty string');
            return { valid: false, errors, warnings };
        }

        const validCategories = [ 'web_server', 'database', 'app_personalization', 'discord_bot', 'squadjs', 'custom_permissions', 'other' ];
        if (!validCategories.includes(category)) {
            errors.push(`Invalid category: ${category}. Must be one of: ${validCategories.join(', ')}`);
            return { valid: false, errors, warnings };
        }

        if (typeof configData !== 'object' || configData === null) {
            errors.push('Config data must be an object');
            return { valid: false, errors, warnings };
        }

        if (category === 'squadjs' && !Array.isArray(configData)) {
            errors.push('squadjs config must be an array');
            return { valid: false, errors, warnings };
        }

        const maxDepth = 10;
        const maxKeys = 500;
        const checkDepth = (obj, depth = 0, keyCount = { count: 0 }) => {
            if (depth > maxDepth) {
                errors.push(`Config exceeds maximum nesting depth of ${maxDepth}`);
                return false;
            }
            if (typeof obj === 'object' && obj !== null) {
                const keys = Object.keys(obj);
                keyCount.count += keys.length;
                if (keyCount.count > maxKeys) {
                    errors.push(`Config exceeds maximum key count of ${maxKeys}`);
                    return false;
                }
                for (let k of keys) {
                    if (!checkDepth(obj[ k ], depth + 1, keyCount)) return false;
                }
            }
            return true;
        };

        if (!checkDepth(configData)) {
            return { valid: false, errors, warnings };
        }

        const bounds = CONFIG_NUMERIC_BOUNDS[ category ];
        if (bounds) {
            for (const [ key, { min, max } ] of Object.entries(bounds)) {
                if (configData[ key ] !== undefined) {
                    if (typeof configData[ key ] !== 'number' || configData[ key ] < min || configData[ key ] > max) {
                        errors.push(`${key} must be a number between ${min} and ${max}`);
                    }
                }
            }
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    function repairConfigFile() {
        try {
            const baseConfig = getBaseConfigTemplate();

            if (!fs.existsSync(configPath)) {
                return { success: false, error: 'Config file does not exist' };
            }

            let currentConfig;
            try {
                currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            } catch (e) {
                currentConfig = {};
            }

            const repairedConfig = JSON.parse(JSON.stringify(baseConfig));

            const safeTypeMatch = (current, base) => {
                if (typeof base === 'boolean') return typeof current === 'boolean';
                if (typeof base === 'number') return typeof current === 'number' || !isNaN(+current);
                if (typeof base === 'string') return typeof current === 'string';
                if (Array.isArray(base)) return Array.isArray(current);
                if (typeof base === 'object' && base !== null) return typeof current === 'object' && current !== null;
                return false;
            };

            const mergeConfigs = (repaired, current, base) => {
                for (let key in base) {
                    if (current[ key ] === undefined) continue;

                    if (Array.isArray(base[ key ])) {
                        if (Array.isArray(current[ key ])) {
                            repaired[ key ] = current[ key ].map((item, idx) => {
                                if (typeof base[ key ][ 0 ] === 'object' && typeof item === 'object') {
                                    const merged = JSON.parse(JSON.stringify(base[ key ][ 0 ]));
                                    mergeConfigs(merged, item, base[ key ][ 0 ]);
                                    return merged;
                                }
                                return safeTypeMatch(item, base[ key ][ 0 ]) ? item : base[ key ][ 0 ];
                            });
                        }
                    } else if (typeof base[ key ] === 'object' && base[ key ] !== null) {
                        if (typeof current[ key ] === 'object' && current[ key ] !== null) {
                            mergeConfigs(repaired[ key ], current[ key ], base[ key ]);
                        }
                    } else if (safeTypeMatch(current[ key ], base[ key ])) {
                        if (typeof base[ key ] === 'number' && typeof current[ key ] === 'string') {
                            repaired[ key ] = +current[ key ];
                        } else {
                            repaired[ key ] = current[ key ];
                        }
                    }
                }
            };

            mergeConfigs(repairedConfig, currentConfig, baseConfig);

            for (const [ category, bounds ] of Object.entries(CONFIG_NUMERIC_BOUNDS)) {
                if (!repairedConfig[ category ]) continue;
                for (const [ key, { min, max } ] of Object.entries(bounds)) {
                    if (typeof repairedConfig[ category ][ key ] === 'number') {
                        repairedConfig[ category ][ key ] = Math.min(Math.max(repairedConfig[ category ][ key ], min), max);
                    }
                }
            }

            if (process.env.MONGODB_CONNECTION_STRING) {
                repairedConfig.database.mongo.host = process.env.MONGODB_CONNECTION_STRING;
            }

            const configChanged = JSON.stringify(repairedConfig) !== JSON.stringify(currentConfig);
            if (!configChanged) {
                return { success: true, repaired: false };
            }

            const backupPath = `${configPath}.backup.${Date.now()}`;
            fs.copyFileSync(configPath, backupPath);
            fs.writeFileSync(configPath, JSON.stringify(repairedConfig, null, '\t'));

            return { success: true, backupPath, repaired: true };
        } catch (error) {
            console.error(' > Config repair error:', error.message);
            return { success: false, error: error.message };
        }
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
        const whitelistId = safeObjectID(parm._id);
        if (!whitelistId) {
            if (res) return res.status(400).send({ error: 'Invalid whitelist ID' });
            return;
        }
        mongoConn((dbo) => {
            if (parm.approve_update && (parm.approve_update == true || parm.approve_update == 'true')) {
                dbo.collection("whitelists").updateOne({ _id: whitelistId }, { $set: { approved: true } }, (err, dbRes) => {
                    if (err) serverError(res, err);
                    else {
                        if (res) res.send({ status: "approved", ...dbRes })
                    }
                })
            } else {
                dbo.collection("whitelists").deleteOne({ _id: whitelistId }, (err, dbRes) => {
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
            return restartProcess(0, 1, args);
        }

        if (errerCountResetTimeout)
            clearTimeout(errerCountResetTimeout)

        errerCountResetTimeout = setTimeout(() => {
            errorCount = 0;
            clearTimeout(errerCountResetTimeout)
        }, 5 * 60_000)
    })
    function randomString(size = 64) {
        const rndStr = crypto.randomBytes(size).toString('base64').slice(0, size);
        if (rndStr.match(/^[a-zA-Z\d]{1,}$/)) return rndStr
        else return randomString(size)
    }
    function extendLogging() {
        console.log = (...params) => {
            const dateTimePrefix = `[${(new Date()).toISOString()}]`;
            if (config?.other?.prepend_date_time_in_console)
                params.unshift(dateTimePrefix)
            consoleLogBackup(...params);
            logger.trace(...params)
        }
        console.error = (...params) => {
            const dateTimePrefix = `[${(new Date()).toISOString()}]`;
            if (config?.other?.prepend_date_time_in_console)
                params.unshift(dateTimePrefix)
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