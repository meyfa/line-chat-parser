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

    it("should allow attaching event handlers", function () {
        var obj = new LineChatParser(["foo"]);
        obj.on("message", function () {
            // do nothing
        });
    });

    describe("#process()", function () {

        it("should process date headers (YYYY.MM.DD dayName)", function () {
            var obj = new LineChatParser(["foo"]);
            obj.process("2017.09.02 Saturday");
            // month is 0-based
            expect(obj.currentDate).to.deep.equal(new Date(2017, 8, 2));
        });

        it("should process date headers (YYYY/MM/DD(dayName))", function () {
            var obj = new LineChatParser(["foo"]);
            obj.process("2018/04/16(Mon)");
            // month is 0-based
            expect(obj.currentDate).to.deep.equal(new Date(2018, 3, 16));
        });

        it("should process date headers (YYYY/MM/DD(dayName)) (JP)", function () {
            var obj = new LineChatParser(["foo"]);
            obj.process("2018/04/16(月)");
            // month is 0-based
            expect(obj.currentDate).to.deep.equal(new Date(2018, 3, 16));
        });

        it("should process message starts with spaces", function () {
            var obj = new LineChatParser(["foo"]);
            obj.process("12:00 foo hello world");
            expect(obj.currentMessage).to.be.an("object").that.includes({
                author: "foo",
                text: "hello world",
            });
        });

        it("should process message starts with tabs", function () {
            var obj = new LineChatParser(["foo"]);
            obj.process("12:00\tfoo\thello world");
            expect(obj.currentMessage).to.be.an("object").that.includes({
                author: "foo",
                text: "hello world",
            });
        });

        it("should process hours with one digit", function () {
            var obj = new LineChatParser(["foo"]);
            obj.currentDate = new Date(2018, 3, 19);
            obj.process("5:06\tfoo\thello world");
            expect(obj.currentMessage.date).to.deep.equal(new Date(2018, 3, 19, 5, 6));
        });

        it("should process hour in case of 24", function () {
            var obj = new LineChatParser(["foo"]);
            obj.currentDate = new Date(2018, 3, 19);
            obj.process("24:53\tfoo\thello world");
            expect(obj.currentMessage.date).to.deep.equal(new Date(2018, 3, 19, 0, 53));
        });

        it("should extend the base date in message starts", function () {
            var obj = new LineChatParser(["foo"]);
            obj.currentDate = new Date(2017, 8, 2);
            obj.process("12:00 foo hello world");
            expect(obj.currentMessage.date).to.deep.equal(new Date(2017, 8, 2, 12, 0));
        });

        it("should pick the longest matching user", function () {
            var obj = new LineChatParser(["foo", "bar", "foo bar"]);
            obj.process("12:00 foo hello world");
            expect(obj.currentMessage.author).to.equal("foo");
            obj.process("12:00 bar hello world");
            expect(obj.currentMessage.author).to.equal("bar");
            obj.process("12:00 foo bar hello world");
            expect(obj.currentMessage.author).to.equal("foo bar");
        });

        it("should allow special characters in user names", function () {
            var obj = new LineChatParser(["foo", "test_:)3 name"]);
            obj.process("12:00 test_:)3 name hello world");
            expect(obj.currentMessage.author).to.equal("test_:)3 name");
        });

        it("should concat message continuations", function () {
            var obj = new LineChatParser(["foo"]);
            obj.process("12:00 foo first line");
            obj.process("second line");
            obj.process("third line");
            expect(obj.currentMessage.text).to.equal("first line\nsecond line\nthird line");
        });

        it("should emit the message when a new one starts", function (done) {
            var obj = new LineChatParser(["foo"]);
            obj.on("message", function (msg) {
                //console.log(msg);
                expect(msg).to.be.an("object").that.includes({
                    author: "foo",
                    text: "hello other",
                });
                done();
            });
            obj.process("12:00 foo hello other");
            obj.process("12:00 foo other");
        });

        it("should emit the message when reaching a date header", function (done) {
            var obj = new LineChatParser(["foo"]);
            obj.on("message", function (msg) {
                expect(msg).to.be.an("object").that.deep.includes({
                    author: "foo",
                    text: "hello date",
                });
                done();
            });
            obj.process("12:00 foo hello date");
            obj.process("2017.09.02 Saturday");
        });

    });

    describe("#flush()", function () {

        it("should emit the message", function (done) {
            var obj = new LineChatParser(["foo"]);
            var message = obj.currentMessage = {
                author: "foo",
                text: "hello world",
                date: new Date(),
            };
            obj.on("message", function (msg) {
                expect(msg).to.equal(message);
                done();
            });
            obj.flush();
        });

    });

    describe("#parse()", function () {

        it("should return an array", function () {
            expect(LineChatParser.parse("", ["foo"])).to.be.an("array");
        });

        it("should parse line arrays", function () {
            var result = LineChatParser.parse([
                "2017.09.02 Saturday",
                "12:00 foo hello world",
                "test",
            ], ["foo"]);
            expect(result).to.be.an("array").with.lengthOf(1);
            expect(result[0]).to.be.an("object").that.deep.includes({
                author: "foo",
                text: "hello world\ntest",
                date: new Date(2017, 8, 2, 12, 0),
            });
        });

        it("should parse strings", function () {
            var result = LineChatParser.parse("2017.09.02 Saturday\n" +
                "12:00 foo hello world\ntest", ["foo"]);
            expect(result).to.be.an("array").with.lengthOf(1);
            expect(result[0]).to.be.an("object").that.deep.includes({
                author: "foo",
                text: "hello world\ntest",
                date: new Date(2017, 8, 2, 12, 0),
            });
        });

        it("should convert CRLF to LF", function () {
            var result = LineChatParser.parse("12:00 foo test\r\ncontinue\r\n" +
                "13:00 foo other", ["foo"]);
            expect(result).to.be.an("array").with.lengthOf(2);
            expect(result[0].text).to.equal("test\ncontinue");
            expect(result[1].text).to.equal("other");
        });

    });

});
