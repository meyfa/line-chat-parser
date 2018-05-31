"use strict";

const events = require("events");

module.exports = LineChatParser;

/**
 * Constructor.
 *
 * @param {string[]} users Array of usernames for message author detection.
 * @constructor
 */
function LineChatParser(users) {
    if (!(this instanceof LineChatParser)) {
        return new LineChatParser(users);
    }
    this.users = users;
    this.currentDate = new Date();
    this.currentMessage = null;
}

LineChatParser.prototype = Object.create(events.EventEmitter.prototype);

/**
 * Process the given chat line. This emits a 'message' event when the end of a
 * previously started message has been detected. The line can be a normal
 * message, a message continuation, or a date header.
 *
 * Make sure to call flush() when all lines have been processed.
 *
 * @param {string} line The chat export line.
 * @return {void}
 */
LineChatParser.prototype.process = function (line) {
    let match;
    // date header
    match = matchDateHeader(line);
    if (match) {
        this.processDateHeader(match.year, match.month, match.day);
        return;
    }
    // message start
    match = matchMessageStart(line, this.users);
    if (match) {
        this.processMessageStart(match.hours, match.minutes, match.author, match.text);
        return;
    }
    // message continuation
    return this.processMessageContinuation(line);
};

/**
 * Processes a date header, given its tokens.
 *
 * @param {number} year The year.
 * @param {number} month The 0-based month (0 for January).
 * @param {number} day The 1-based day.
 * @return {void}
 */
LineChatParser.prototype.processDateHeader = function (year, month, day) {
    this.flush();
    this.currentDate = new Date(year, month, day);
};

/**
 * Processes a message, given its tokens.
 *
 * @param {number} hours The hour at which the message was sent (0 to 24).
 * @param {number} minutes The minute at which the message was sent (0 to 59).
 * @param {string} author The message author.
 * @param {string} text The message text.
 * @return {void}
 */
LineChatParser.prototype.processMessageStart = function (hours, minutes, author, text) {
    this.flush();
    const date = new Date(this.currentDate.getTime());
    date.setHours(hours, minutes);
    this.currentMessage = {
        date: date,
        author: author,
        text: text,
    };
};

/**
 * Processes further text belonging to the previously started message.
 *
 * @param {string} text The message text to append.
 * @return {void}
 */
LineChatParser.prototype.processMessageContinuation = function (text) {
    if (this.currentMessage) {
        this.currentMessage.text += "\n" + text;
    }
};

/**
 * Ends and emits the current message, if one exists.
 * Call this after all lines have been processed. Otherwise, the message will
 * only be emitted when further lines mark the beginning of a new message.
 *
 * @return {void}
 */
LineChatParser.prototype.flush = function () {
    if (this.currentMessage) {
        this.emit("message", this.currentMessage);
        this.currentMessage = null;
    }
};

/**
 * Static parse function that takes a string or array of all lines, as well as
 * an array of author names, and returns an array of parsed messages.
 *
 * @param {(string|string[])} file The string or array of lines to parse.
 * @param {string[]} users Array of usernames for message author detection.
 *
 * @return {Object[]} Array of parsed messages containing author, date, text.
 */
LineChatParser.parse = function (file, users) {
    const parser = new LineChatParser(users);

    // prepare message collection
    const messages = [];
    parser.on("message", (msg) => messages.push(msg));

    // process all lines
    const lines = isArray(file) ? file : file.split(/\r?\n/);
    lines.forEach((line) => parser.process(line));
    parser.flush();

    return messages;
};

/**
 * Utility function for checking whether something is an array.
 *
 * @param {*} obj The thing to check.
 * @return {boolean} Whether the argument is an array.
 */
function isArray(obj) {
    // try to use the native function
    if (typeof Array.isArray === "function") {
        return Array.isArray(obj);
    }
    return Object.prototype.toString.call(file) === "[object Array]";
}

/**
 * Try to match a date header.
 * The result is an object in the form of { year, month, day }.
 *
 * @param {string} line The input to match (a single line).
 * @return {Object} The match result, or null if unsuccessful.
 */
function matchDateHeader(line) {
    const match = line.match(/^(\d{4})[./](\d{2})[./](\d{2})(?: [A-Z][a-z]+|\(.+\))/);
    return !match ? null : {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10) - 1,
        day: parseInt(match[3], 10),
    };
}

/**
 * Try to match a message start.
 * The result is an object in the form of { hours, minutes, author, text }.
 *
 * @param {string} line The input to match (a single line).
 * @param {string[]} users An optional array of usernames.
 * @return {Object} The match result, or null if unsuccessful.
 */
function matchMessageStart(line, users) {
    const regexp = typeof users === "undefined"
        ? /^(\d{1,2}):(\d{2})[ \t]([^\t\n]+)\t?(.*)/    // <time>\t<author>\t<msg>
        : /^(\d{1,2}):(\d{2})[ \t](\S.+)/;              // <time> <author+msg>

    const match = line.match(regexp);
    if (!match) {
        return null;
    }

    const author = typeof users === "undefined" ? match[3] : findAuthor(users, match[3]);
    const text = match[4] || match[3].substring(author.length + 1);

    return {
        hours: parseInt(match[1], 10) % 24,
        minutes: parseInt(match[2], 10),
        author: author,
        text: text,
    };
}

/**
 * Deduces the author from the given string and username array. The return value
 * is the longest array element that is also a prefix of the text.
 *
 * @param {string[]} users The username array.
 * @param {string} text The text to deduce the author from.
 * @return {string} The author.
 */
function findAuthor(users, text) {
    return users.reduce((previousValue, user) => {
        if (user.length > previousValue.length && text.indexOf(user) === 0) {
            return user;
        }
        return previousValue;
    }, "");
}
