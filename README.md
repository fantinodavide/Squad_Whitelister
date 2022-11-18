# Whitelister
## Squad | Post Scriptum | Beyond the Wire
[**Join the official Discord server!**](https://discord.com/invite/5hfcjNYdCP)

## Installation
#### Prerequisites
- NodeJS
- npm
- MongoDB
- *PM2 (Optional)*

#### Setup
1. Download and unpack the [Latest Release (release.zip)](https://github.com/fantinodavide/Squad_Whitelister/releases/latest "Releases")
2. `node server` *To start the server for the first time. The application will automatically stop to create the configuration file*
3. Configure as needed the application from **conf.js** file
4. `pm2 start server.js` or `node server --self-pm` *To start the server forever*

#### Using a custom SSL Certificate
- Insert `certificate.key` in the **certificates** folder
- Insert `certificate.crt` in the **certificates** folder

#### If you are NOT using a Process Manager *(ex. PM2)*
Add run argument `--self-pm` to automatically restart after an update or crash

#### Linking to the *RemoteAdminListHosts.cfg*
- Full output is found at path **/wl** (*ex. https://example.ex/wl*)
- If you need the output for a specific clan the path is **/wl/*{clan_code}*** (ex. https://example.ex/wl/1a2b3c4d)

#### Environment Variables
- `MONGODB_CONNECTION_STRING` Useful when deploying on docker.

#### [**Screenshots**](/screenshots) ####

#### conf.json Example
```json
{
	"web_server": {
		"bind_ip": "0.0.0.0",
		"http_port": 80,
		"https_port": 443,
		"force_https": false,
		"session_duration_hours": 168
	},
	"database": {
		"mongo": {
			"host": "127.0.0.1",
			"port": 27017,
			"database": "Whitelister"
		}
	},
	"app_personalization": {
		"name": "Whitelister",
		"favicon": "",
		"accent_color": "#ffc40b",
		"logo_url": "https://joinsquad.com/wp-content/themes/squad/img/logo.png"
	},
	"other": {
		"automatic_updates": true,
		"update_check_interval_seconds": 3600,
		"whitelist_developers": true
	}
}
```
