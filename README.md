# line-chat-parser

[![Build Status](https://travis-ci.org/meyfa/line-chat-parser.svg?branch=master)](https://travis-ci.org/meyfa/line-chat-parser)

JavaScript parser module for exported [LINE](https://line.me/) chats.

Note: LINE is a trademark of LINE Corporation. This project is neither
affiliated with nor endorsed by LINE Corporation.

## Purpose

On the Windows version of LINE, you can export chats by clicking on the three
horizontal dots in the upper-right corner of a chat window and selecting
"Save Chat".

The result looks something like this:

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

This package can parse that format into message objects:

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
npm install --save line-chat-parser
```

## Usage

There are two ways to use the parser. Note that both require an array of
participating users so that the message authors can be deduced correctly.

### Asynchronously ('message' event)

The asynchronous method should be used with huge amounts of messages or when not
all lines are known yet -- it emits a `message` event every time a message is
complete.

```javascript
var LineChatParser = require("line-chat-parser");

var parser = new LineChatParser(["Alice", "Bob"]);
parser.on("message", function (msg) {
    console.log(msg);
});

parser.process("2017.09.03 Sunday");
parser.process("16:23 Bob Today I found something:");
parser.process("Apparently there is a Node package for parsing chats now!");
// now the message is done and the event is emitted
parser.process("16:25 Alice Whaaat");
// ...
// IMPORTANT - always call flush - it emits the final message
parser.flush();
```

### Synchronously (static 'parse' function)

Use this method when you have the full file in memory already and/or need the
complete message array immediately without listening for events.

You can supply an array of lines or a single string with line terminators.

```javascript
var LineChatParser = require("line-chat-parser");

var messages = LineChatParser.parse([
    "2017.09.03 Sunday",
    "16:23 Bob Today I found something:",
    "Apparently there is a Node package for parsing chats now!",
    "16:25 Alice Whaaat",
    // ...
], ["Alice", "Bob"]);

// or, alternatively:

var messages = LineChatParser.parse("2017.09.03 Sunday\n" +
    "16:23 Bob Today I found something:\n" +
    "Apparently there is a Node package for parsing chats now!\n" +
    "16:25 Alice Whaaat", ["Alice", "Bob"]);

console.log(messages);
```

## Tests

Tests are run using mocha. Start them with `npm test` after `npm install`.

## License

The MIT license. See the accompanying "LICENSE" file.
