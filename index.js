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
}

LineChatParser.prototype = Object.create(events.EventEmitter.prototype);
