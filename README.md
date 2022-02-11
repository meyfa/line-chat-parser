# line-chat-parser

[![CI](https://github.com/meyfa/line-chat-parser/actions/workflows/main.yml/badge.svg)](https://github.com/meyfa/line-chat-parser/actions/workflows/main.yml)
[![Test Coverage](https://api.codeclimate.com/v1/badges/b8bc10ac14103c158e75/test_coverage)](https://codeclimate.com/github/meyfa/line-chat-parser/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/b8bc10ac14103c158e75/maintainability)](https://codeclimate.com/github/meyfa/line-chat-parser/maintainability)

JavaScript parser module for exported [LINE](https://line.me/) chats.

Note: LINE is a trademark of LINE Corporation. This project is neither
affiliated with nor endorsed by LINE Corporation.

## Purpose

LINE on desktop and mobile allows you to export/save chats. The formats are a
bit different depending on system and locale, but it looks roughly like this:

```
2017.09.03 Sunday
16:23 Bob Today I found something:
Apparently there is a Node package for parsing chats now!
16:25 Alice Whaaat
16:25 Bob Yeah, it's called line-chat-parser.
16:26 Bob Here's a screenshot:
16:27 Bob Photos
16:30 Alice Looks awesome!
```

This package can parse these exports into message objects:

```javascript
[ { date: '2017-09-03T14:23:00.000Z',
    author: 'Bob',
    text: 'Today I found something:\nApparently there is a Node package for parsing chats now!' },
  { date: '2017-09-03T14:25:00.000Z',
    author: 'Alice',
    text: 'Whaaat' },
  { date: '2017-09-03T14:25:00.000Z',
    author: 'Bob',
    text: 'Yeah, it\'s called line-chat-parser.' },
  { date: '2017-09-03T14:26:00.000Z',
    author: 'Bob',
    text: 'Here\'s a screenshot:' },
  { date: '2017-09-03T14:27:00.000Z', author: 'Bob', text: 'Photos' },
  { date: '2017-09-03T14:30:00.000Z',
    author: 'Alice',
    text: 'Looks awesome!' } ]
```

Note: The date properties above are native `Date` objects. They are just
represented here as strings because there are no date literals in JavaScript.

## Installation

This package is available on NPM:

```
npm i line-chat-parser
```

## Usage

### Note: user name array

Exports from the Windows .exe (not the Store app) are formatted with single
spaces. This makes it impossible to correctly detect user names without a list
of participating users.

Exports from the mobile app separate the names from the message bodies with tab
characters. There, you can do without the user list.

What you need ultimately comes down to what kind of export you want to process.

There are two ways to use the parser. Note that both require an array of
participating users so that the message authors can be deduced correctly.

### Asynchronous parsing ('message' event)

The asynchronous method should be used with huge amounts of messages or when not
all lines are known yet -- it emits a `message` event every time a message is
complete.

```javascript
const LineChatParser = require('line-chat-parser')

// as stated above, you can leave out the user name array when processing
// mobile app exports
let parser = new LineChatParser(['Alice', 'Bob'])
parser.on('message', function (msg) {
  console.log(msg)
})

parser.process('2017.09.03 Sunday')
parser.process('16:23 Bob Today I found something:')
parser.process('Apparently there is a Node package for parsing chats now!')
// now the message is done and the event is emitted
parser.process('16:25 Alice Whaaat')
// ...
// IMPORTANT - always call flush - it emits the final message
parser.flush()
```

### Synchronous parsing (static 'parse' function)

Use this method when you have the full file in memory already and/or need the
complete message array immediately without listening for events.

You can supply an array of lines or a single string with line terminators.

```javascript
const LineChatParser = require('line-chat-parser')

const messages = LineChatParser.parse([
  '2017.09.03 Sunday',
  '16:23 Bob Today I found something:',
  'Apparently there is a Node package for parsing chats now!',
  '16:25 Alice Whaaat',
  // ...
], ['Alice', 'Bob'])
// as stated above, you can leave out the user name array when processing
// mobile app exports

// or, alternatively:

const messages = LineChatParser.parse('2017.09.03 Sunday\n' +
  '16:23 Bob Today I found something:\n' +
  'Apparently there is a Node package for parsing chats now!\n' +
  '16:25 Alice Whaaat', ['Alice', 'Bob'])

console.log(messages)
```
