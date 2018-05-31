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
 * @param {string} line - The chat export line.
 * @return {void}
 */
LineChatParser.prototype.process = function (line) {

    let match;

    // date header
    match = line.match(/^(\d{4})[./](\d{2})[./](\d{2})(?: [A-Z][a-z]+|\(.+\))/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        this.processDateHeader(year, month, day);
        return;
    }

    // message
    if (typeof this.users === "undefined") {
        match = line.match(/^(\d{1,2}):(\d{2})[ \t]([^\t\n]+)\t?(.*)/);
    } else {
        match = line.match(/^(\d{1,2}):(\d{2})[ \t](\S.+)/);
    }
    if (match) {
        const hours = parseInt(match[1], 10) % 24;
        const minutes = parseInt(match[2], 10);
        const author = typeof this.users === "undefined" ? match[3] : this.users.reduce((previousValue, user) => {
            if (user.length > previousValue.length && match[3].indexOf(user) === 0) {
                return user;
            }
            return previousValue;
        }, "");
        const text = match[4] || match[3].substring(author.length + 1);
        this.processMessageStart(hours, minutes, author, text);
        return;
    }

    this.processMessageContinuation(line);

};

/**
 * Processes a date header, given its tokens.
 *
 * @param {number} year - The year.
 * @param {number} month - The 0-based month (0 for January).
 * @param {number} day - The 1-based day.
 * @return {void}
 */
LineChatParser.prototype.processDateHeader = function (year, month, day) {
    this.flush();
    this.currentDate = new Date(year, month, day);
};

/**
 * Processes a message, given its tokens.
 *
 * @param {number} hours - The hour at which the message was sent (0 to 24).
 * @param {number} minutes - The minute at which the message was sent (0 to 59).
 * @param {string} author - The message author.
 * @param {string} text - The message text.
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
 * @param {string} text - The message text to append.
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
 * @param {(string|string[])} file - The string or array of lines to parse.
 * @param {string[]} users - Array of usernames for message author detection.
 *
 * @return {Object[]} Array of parsed messages containing author, date, text.
 */
LineChatParser.parse = function (file, users) {

    const parser = new LineChatParser(users);

    const messages = [];
    parser.on("message", (msg) => messages.push(msg));

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
    if (typeof Array.isArray === "function") {
        return Array.isArray(obj);
    }
    return Object.prototype.toString.call(file) === "[object Array]";
}
