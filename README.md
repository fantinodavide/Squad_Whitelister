# Squad Whitelister
[**Join the official Discord server!**](https://discord.com/invite/5hfcjNYdCP)

## Installation
#### Prerequisites
- NodeJS
- npm
- MongoDB

#### Setup
1. Download and unpack the latest [ Release](https://github.com/fantinodavide/Squad_Whitelister/releases "Releases")
2. `npm install` *To install dependecies*
3. `node server` *To start the server. The application will automatically stop to create the configuration file*
4. Configure as needed the application from **conf.js** file
5. `node server` *To start the server*
#### Linking to the *RemoteAdminListHosts.cfg*
Full output is found at path **/wl** (*ex. https://example.ex/wl*)

If you need the output for a specific clan the path is **/wl/*{clan_code}*** (ex. https://example.ex/wl/1a2b3c4d)

#### conf.json Example
```json
{
	"http_server": {
		"bind_ip": "0.0.0.0",
		"port": 80,
		"https_port": 443
	},
	"database": {
		"mongo": {
			"host": "127.0.0.1",
			"port": 27017,
			"database": "Squad_Whitelister"
		}
	},
	"app_personalization": {
		"name": "Squad Whitelister",
		"favicon": "",
		"accent_color": "#ffc40b",
		"logo_url": "https://joinsquad.com/wp-content/themes/squad/img/logo.png"
	},
	"other": {
		"force_https": false,
		"automatic_updates": true,
		"update_check_interval_seconds": 3600,
		"session_duration_hours": 168,
		"whitelist_developers": true
	}
}
```
