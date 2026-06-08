# Email Sender

Example Huglo module — send email using saved SMTP configuration.

## Module instance

[src/index.ts](src/index.ts)

Module instance. Defines the module id, name, description, version, key pair, grant store, and config store.

## email:send scope

[src/scopes/email.send.ts](src/scopes/email.send.ts)

Protected scope handler. Combines saved SMTP settings from invoke context with the email payload from invoke input, then previews the send or delivers through nodemailer.

## Config storage

[src/services/config-store.ts](src/services/config-store.ts)

Store and retrieve configuration per instance. Implements `ConfigStore`. A user can have multiple instances, each with an `instanceId`. One JSON file per instance under `./data/config`.

## Grant storage

[src/services/grant-store.ts](src/services/grant-store.ts)

Store and retrieve grants. Implements `GrantStore`. One JSON file per grant id under `./data/grants`.

