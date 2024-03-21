# Whitelister API Docs
_This documentation is a work in progress_

## Authentication

After generating an API key via the dashboard, you can include it with each request to authenticate your requests by including the `apiKey` query parameter.


## Routes

### `/api/players/read/*`
**ANY** - Test permissions.
**Required Access Level** - Approver

### `/api/players/read/from/steamId/:id`
**GET** - Retrieve player data from Steam ID.
**Required Access Level** - Approver

### `/api/players/read/from/discordUserId/:id`
**GET** - Retrieve player data from a Discord ID (only if the player has completed the profile linking).
**Required Access Level** - Approver