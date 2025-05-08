# Whitelister

<div align="center">
  <h2>A Comprehensive Whitelist Management System for</h2>
  <h3>Squad | Post Scriptum | Beyond the Wire</h3>
  
  [![Join Discord](https://img.shields.io/discord/980238753618599936?label=Join%20Discord&logo=discord&logoColor=white)](https://discord.com/invite/5hfcjNYdCP)
  [![Latest Release](https://img.shields.io/github/v/release/fantinodavide/Squad_Whitelister?label=Latest%20Release)](https://github.com/fantinodavide/Squad_Whitelister/releases/latest)
</div>

## 📋 Overview

Whitelister is a powerful web application designed to manage player whitelists for game servers. It provides a comprehensive solution for server administrators to control access, manage clans, and automate whitelist operations through a user-friendly interface.

## ✨ Features

- **Player Management**: Easily approve or deny whitelist requests
- **Clan Management**: Organize players into clans with custom permissions
- **User Access Control**: Define different access levels for administrators
- **API Integration**: Comprehensive API for integration with other systems
- **Discord Integration**: Connect with Discord for user verification
- **Custom Branding**: Personalize the application with your own branding
- **Automatic Updates**: Stay up-to-date with the latest features
- **Secure Authentication**: Protect your whitelist with robust authentication

## 🖼️ Screenshots

Visit the [screenshots directory](/screenshots) to see the application in action:
- [Whitelist Management](/screenshots/WhitelistTab.PNG)
- [Approvals Interface](/screenshots/ApprovalsTab.PNG)
- [Clan Management](/screenshots/ClansTab.PNG)
- [User Management](/screenshots/UsersTab.PNG)
- [Group Management](/screenshots/GroupsTab.PNG)

## 🚀 Installation

### Prerequisites

- **NodeJS** (v14 or higher recommended)
- **npm** (v6 or higher recommended)
- **MongoDB** (v4.4 or higher recommended)
- **PM2** (Optional, for process management)

### Setup Instructions

1. **Download and Extract**
   ```bash
   # Download the latest release
   wget https://github.com/fantinodavide/Squad_Whitelister/releases/latest/download/release.zip
   
   # Extract the files
   unzip release.zip
   ```

2. **Initial Configuration**
   ```bash
   # Start the server for the first time
   node server
   ```
   The application will automatically stop to create the configuration file.

3. **Configure the Application**
   Edit the generated `conf.json` file according to your needs. See the [Configuration Documentation](CONFIG.md) for detailed information about all available options.

4. **Start the Server**
   ```bash
   # Using PM2 (recommended for production)
   pm2 start server.js
   
   # Without PM2, with auto-restart
   node server --self-pm
   ```

### Docker Installation

You can also run Whitelister using Docker:

```bash
# Pull and run using docker-compose
docker-compose up -d
```

## 🔧 Configuration

For a complete reference of all configuration options, please see the [Configuration Documentation](CONFIG.md).

### SSL Certificate Setup

To use a custom SSL certificate:

1. Place your `certificate.key` file in the **certificates** folder
2. Place your `certificate.crt` file in the **certificates** folder

### Process Management

If you're not using PM2, add the `--self-pm` argument to enable automatic restarts:

```bash
node server --self-pm
```

### Game Server Integration

To link Whitelister to your game server's `RemoteAdminListHosts.cfg`:

- Full whitelist output: `/wl` (e.g., `https://your-domain.com/wl`)
- Clan-specific whitelist: `/wl/{clan_code}` (e.g., `https://your-domain.com/wl/1a2b3c4d`)

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_CONNECTION_STRING` | MongoDB connection string | `mongodb://user:password@host:port/database` |
| `HIDDEN_CONFIG_TABS` | Hide specific config tabs | `web_server;database` |
| `HTTP_SERVER_DISABLED` | Disable HTTP server | `true` |
| `HTTPS_SERVER_DISABLED` | Disable HTTPS server | `true` |
| `HTTPS_PORT` | Override HTTPS port | `8443` |

## 🛠️ Troubleshooting

### Common Issues

- **Database Connection Errors**: Ensure MongoDB is running and accessible
- **Port Conflicts**: Check if the configured ports are already in use
- **SSL Certificate Issues**: Verify certificate files are correctly formatted

### Logs

Check the application logs for detailed error information:
```bash
# If using PM2
pm2 logs server

# If using standard Node
check the console output or application log files
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the terms found in the [LICENSE](LICENSE) file.

## 📋 Configuration Documentation

For detailed information about all available configuration options, please refer to the [Configuration Documentation](CONFIG.md).

The configuration file (`conf.json`) is automatically generated when you first run the application and includes all necessary settings with default values. You can customize these settings according to your needs.
