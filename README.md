# screeps-ai

This is my code for the programming game, [screeps](http://www.screeps.com).

## Using This Bot

- Setup your environment using the [typescript starter pack](https://github.com/screepers/screeps-typescript-starter).
- Fill in the arrays in src/misc/personalization.ts

## Architecture

My rooms in the screeps world are organized into colony objects. Each colony has a capital, which is the main room that they control, and possibly a few remote mining rooms.

<img src="/docs/screeps_uml.png" width=825>

