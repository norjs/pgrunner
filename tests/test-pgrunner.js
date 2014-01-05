"use strict";

var assert = require('assert');
var pg = require('../src');


describe('nor-pgrunner', function() {
	it('Initialize, start and stop', function(done) {
		pg().then(function(db){
			return db.stop();
		}).then(function(){
			done();
		}).fail(function(err){
			throw err;
		}).done();
	});


	it("Generate config string", function(done) {

		var opts = {
			host: "127.0.0.1",
			port: "54323",
			user: "dummyuser",
			database: "dummydb"
		}

		pg(opts).then(function(db){
			assert.equal("pg://dummyuser@127.0.0.1:54323/dummydb", db.config(), "Should generate proper config string!");
			return db.stop();
		}).then(function(){
			done();
		}).done();
	});

});
