# Whitelister
## Squad | Post Scriptum | Beyond the Wire
[**Join the official Discord server!**](https://discord.com/invite/5hfcjNYdCP)

## Installation
#### Prerequisites
- NodeJS
- npm
- MongoDB

#### Setup
1. Download and unpack the latest [ Release](https://github.com/fantinodavide/Squad_Whitelister/releases "Releases")
2. `node server` *To start the server. The application will automatically stop to create the configuration file*
3. Configure as needed the application from **conf.js** file
4. `node server` *To start the server*

#### Using a custom SSL Certificate
- Insert `certificate.key` in the **certificates** folder
- Insert `certificate.crt` in the **certificates** folder

#### Using process managers *(ex. PM2)*
To avoid issues with process managers add run argument `--using-pm`
- PM2: `pm2 start server.js -- --using-pm`
- Forever: `forever start server.js --using-pm`

#### Linking to the *RemoteAdminListHosts.cfg*
- Full output is found at path **/wl** (*ex. https://example.ex/wl*)
- If you need the output for a specific clan the path is **/wl/*{clan_code}*** (ex. https://example.ex/wl/1a2b3c4d)

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
