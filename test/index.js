"use strict";

var expect = require("chai").expect;

var LineChatParser = require("../");

describe("LineChatParser", function () {

    it("should self-construct when invoked as a function", function () {
        // eslint-disable-next-line new-cap
        var obj = LineChatParser(["foo"]);
        expect(obj).to.be.an.instanceof(LineChatParser);
        expect(obj.users).to.deep.equal(["foo"]);
    });

});
