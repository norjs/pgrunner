"use strict";

var Q = require('Q');
var merge = require('merge');
var debug = require('nor-debug');

var temp = require('temp');
temp.track();

/**
 * Return promise of a spawned command
 */
function spawnProcess(command, args, options) {
	var options = options || {};
	var defer = Q.defer();

	options.env = merge(process.env, options.env || {});
	options.detached = true;
	options.stdio = "ignore";

	// Run the process
	var proc = require('child_process').spawn(command, args, options);

	// Handle exit
	proc.on('close', function(retval) {
		if (retval === 0) {
			defer.resolve(retval);
		} else {
			defer.reject({"retval": retval});
		}
	});

	// Handle error
	proc.on('error', function(err){
		defer.reject(err);
	});

	return defer.promise;
};

var mktempdir = Q.denodeify(temp.mkdir);

module.exports = function PG(opts) {
	opts = opts || {};

	var pghost = opts.host || '127.0.0.1';
	var pgport = opts.port || 55432;
	var pguser = opts.user || process.env.USER;
	var pgdatabase = opts.database || pguser;
	var instance = {};

	instance.stop = function stop() {
		debug.log("Spawning pg_ctl stop");
		return spawnProcess("pg_ctl", ["stop", "-w", "-m", "fast"], {"env": instance.env});
	};

	instance.config = function config() {
		var env = instance.env;
		return "pg://" + env.PGUSER + "@" + env.PGHOST + ":" + env.PGPORT + "/" + env.PGDATABASE;
	}

	// Startup promise
	return mktempdir('nor-pgrunner-data-').then(function(tmpdir) {
		// Set PGDATA to environment
		debug.log("PGDATA ", tmpdir);
		instance.env = {
			"PGDATA": tmpdir,
			"PGHOST": pghost,
			"PGPORT": pgport,
			"PGUSER": pguser,
			"PGDATABASE": pgdatabase
		};
	}).then(function initdb(){
		// Spawn postgresql initdb
		debug.log("Spawning pg_ctl init");
		return spawnProcess("pg_ctl", ["init", "-w"], {"env": instance.env});
	}).then(function start(){
		// Spawn postgresql startup
		debug.log("Spawning pg_ctl start");
		return spawnProcess("pg_ctl", ["start", "-w", "-o", "-F"], {"env": instance.env});
	}).then(function status(){
		debug.log("Spawning pg_ctl status");
		return spawnProcess("pg_ctl", ["status"], {"env": instance.env});
	}).then(function(){
		debug.log("Returning instance");
		return instance;
	});
};
