"use strict";

import assert from 'assert';
import pg from '../../dist/index.js';

describe('nor-pgrunner', () => {

	it('can initialize, start and stop', () => {
		return pg().then(
			db => db.stop()
		);
	});

	it("can generate config string", () => {

		let opts = {
			host: "127.0.0.1",
			port: "54323",
			user: "dummyuser",
			database: "dummydb"
		};

		return pg(opts).then(db => {
			assert.equal("postgresql://dummyuser@127.0.0.1:54323/dummydb", db.pgconfig, "Should generate proper config string!");
			return db.stop();
		});
	});

});
