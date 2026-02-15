# Whitelister Configuration Guide

This document provides detailed information about all configuration options available in the `config.example.json` file.

## Configuration Structure

The configuration file is structured into several sections:

1. **web_server**: Web server settings
2. **database**: Database connection settings
3. **app_personalization**: UI customization options
4. **discord_bot**: Discord integration settings
5. **squadjs**: SquadJS integration settings
6. **custom_permissions**: Custom permission definitions
7. **other**: Miscellaneous settings

## Web Server Settings

```json
"web_server": {
    "bind_ip": "0.0.0.0",
    "http_server_disabled": false,
    "http_port": 80,
    "https_server_disabled": false,
    "https_port": 443,
    "force_https": false,
    "session_duration_hours": 168
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `bind_ip` | IP address to bind the server to. Use `0.0.0.0` to listen on all interfaces. | `0.0.0.0` |
| `http_server_disabled` | Disable the HTTP server completely. | `false` |
| `http_port` | Port for the HTTP server. | `80` |
| `https_server_disabled` | Disable the HTTPS server completely. | `false` |
| `https_port` | Port for the HTTPS server. | `443` |
| `force_https` | Redirect all HTTP requests to HTTPS. | `false` |
| `session_duration_hours` | Duration of user sessions in hours. | `168` (7 days) |

## Database Settings

```json
"database": {
    "mongo": {
        "host": "127.0.0.1",
        "port": 27017,
        "database": "Whitelister"
        // "username": "",
        // "password": ""
    }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `host` | MongoDB host address. Can be a connection string for more complex setups. | `127.0.0.1` |
| `port` | MongoDB port. | `27017` |
| `database` | Database name. | `Whitelister` |
| `username` | MongoDB username (optional). | - |
| `password` | MongoDB password (optional). | - |

## App Personalization

```json
"app_personalization": {
    "name": "Whitelister",
    "favicon": "",
    "accent_color": "#ffc40b",
    "logo_url": "https://joinsquad.com/wp-content/themes/squad/img/logo.png",
    "logo_border_radius": "10",
    "title_hidden_in_header": false,
    "send_welcome_message": true
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `name` | Application name displayed in the UI. | `Whitelister` |
| `favicon` | URL to a custom favicon. | - |
| `accent_color` | Primary color for UI elements (hex code). | `#ffc40b` |
| `logo_url` | URL to the logo displayed in the header. | Squad logo |
| `logo_border_radius` | Border radius for the logo in pixels. | `10` |
| `title_hidden_in_header` | Hide the application title in the header. | `false` |
| `send_welcome_message` | Show welcome message to new users. | `true` |

## Discord Bot Settings

```json
"discord_bot": {
    "token": "",
    "server_id": "",
    "whitelist_updates_channel_id": ""
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `token` | Discord bot token. | - |
| `server_id` | ID of your Discord server. | - |
| `whitelist_updates_channel_id` | Channel ID for whitelist update notifications. | - |

## Game Server Integration (SquadJS + SquadPy)

```json
"squadjs": [
    {
        "websocket": {
            "mode": "squadjs",
            "host": "",
            "port": 3000,
            "token": "",
            "secure": false
        }
    }
]
```

| Option | Description | Default |
|--------|-------------|---------|
| `mode` | Connector backend: `squadjs` (Socket.IO) or `squadpy` (Control API) | `squadjs` |
| `host` | SquadJS WebSocket host or SquadPy API host. | - |
| `port` | SquadJS WebSocket port or SquadPy API port. | `3000` |
| `token` | SquadJS WebSocket token or SquadPy API auth token. | - |
| `secure` | Use HTTPS when mode is `squadpy`. | `false` |

You can add multiple server connection configurations by adding more objects to the array.

### SquadPy Example

```json
"squadjs": [
    {
        "websocket": {
            "mode": "squadpy",
            "host": "127.0.0.1",
            "port": 8090,
            "token": "replace_with_api_auth_token",
            "secure": false
        }
    }
]
```

## Custom Permissions

```json
"custom_permissions": [
    {
        "name": "Example Custom Permission",
        "permission": "example_custom_perm"
    }
]
```

| Option | Description | Default |
|--------|-------------|---------|
| `name` | Display name for the custom permission. | - |
| `permission` | Permission identifier used in the system. | - |

## Other Settings

```json
"other": {
    "automatic_updates": true,
    "update_check_interval_seconds": 3600,
    "whitelist_developers": true,
    "install_beta_versions": false,
    "logs_max_file_count": 10,
    "lists_cache_refresh_seconds": 60,
    "prefer_eosID": true,
    "prepend_date_time_in_console": false,
    "force_lists_output_caching": false
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `automatic_updates` | Automatically update the application when new versions are available. | `true` |
| `update_check_interval_seconds` | Interval between update checks in seconds. | `3600` (1 hour) |
| `whitelist_developers` | Automatically whitelist the application developers. | `true` |
| `install_beta_versions` | Install beta versions when updating. | `false` |
| `logs_max_file_count` | Maximum number of log files to keep. | `10` |
| `lists_cache_refresh_seconds` | Interval for refreshing whitelist cache in seconds. | `60` |
| `prefer_eosID` | Prefer EOS ID over Steam ID when available. | `true` |
| `prepend_date_time_in_console` | Add timestamps to console logs. | `false` |
| `force_lists_output_caching` | Force caching of whitelist outputs. | `false` |

## Environment Variables

You can override certain configuration options using environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_CONNECTION_STRING` | MongoDB connection string | `mongodb://user:password@host:port/database` |
| `HIDDEN_CONFIG_TABS` | Hide specific config tabs | `web_server;database` |
| `HTTP_SERVER_DISABLED` | Disable HTTP server | `true` |
| `HTTPS_SERVER_DISABLED` | Disable HTTPS server | `true` |
| `HTTPS_PORT` | Override HTTPS port | `8443` |
