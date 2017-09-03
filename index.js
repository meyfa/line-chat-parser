"use strict";

var events = require("events");

module.exports = LineChatParser;

/**
 * Constructor.
 *
 * @param {string[]} users - Array of usernames for message author detection.
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
 */
LineChatParser.prototype.process = function (line) {

    var match;

    // date header
    match = line.match(/^(\d{4})\.(\d{2})\.(\d{2}) [A-Z][a-z]+/);
    if (match) {
        var year = parseInt(match[1], 10),
            month = parseInt(match[2], 10) - 1,
            day = parseInt(match[3], 10);
        this.processDateHeader(year, month, day);
        return;
    }

    // message
    match = line.match(/^(\d{2}):(\d{2}) (\S.+)/);
    if (match) {
        var hours = parseInt(match[1], 10),
            minutes = parseInt(match[2], 10);
        var author = "";
        this.users.forEach(function (user) {
            var prefix = user + " ";
            if (user.length > author.length && match[3].indexOf(prefix) === 0) {
                author = user;
            }
        });
        var text = match[3].substring(author.length + 1);
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
 */
LineChatParser.prototype.processMessageStart = function (hours, minutes, author, text) {
    this.flush();
    var date = new Date(this.currentDate.getTime());
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
 */
LineChatParser.prototype.flush = function () {
    if (this.currentMessage) {
        this.emit("message", this.currentMessage);
        this.currentMessage = null;
    }
};
