/* pgrunner library */

"use strict";

var Q = require('q');
var merge = require('merge');
var debug = require('nor-debug');

var temp = require('temp');
temp.track();

/**
 * Function that returns promise of a temporary directory
 */
var mktempdir = Q.denodeify(temp.mkdir);

/**
 * Return promise of a spawned command
 */
function spawnProcess(command, args, options) {
	options = options || {};
	var defer = Q.defer();

	debug.log('command = ', command);
	debug.log('args = ', args);
	debug.log('options = ', options);

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
}

/** Constructor */
function PGRunnerInstance(opts) {
	opts = opts || {};
	this.env = opts.env || undefined;
	this.pgconfig = opts.pgconfig || undefined;
}

/** Stop the instance */
PGRunnerInstance.prototype.stop = function pgrunner_stop() {
	var self = this;
	debug.log("Stopping PostgreSQL");
	return spawnProcess("pg_ctl", ["stop", "-w", "-m", "fast"], {"env": self.env});
};

/* The Module */
var pgrunner = module.exports = function pgrunner_create(opts) {

	opts = opts || {};
	var pghost = opts.host || '127.0.0.1';
	var pgport = opts.port || 55432;
	var pguser = opts.user || process.env.USER;
	var pgdatabase = opts.database || pguser;

	var instance = new PGRunnerInstance();

	// Create and start the database
	return mktempdir('nor-pgrunner-data-').then(function(tmpdir) {
		instance.env = {
			"PGDATA": tmpdir,
			"PGHOST": pghost,
			"PGPORT": pgport,
			"PGUSER": pguser,
			"PGDATABASE": pgdatabase,
			"PGCLIENTENCODING": "UTF-8",
			"TZ": "UTC"
		};
		instance.pgconfig = "pg://" + pguser + "@" + pghost + ":" + pgport + "/" + pgdatabase;
	}).then(function initdb(){
		debug.log("Initializing PostgreSQL database");
		return spawnProcess("pg_ctl", ["init", "-w", "-o", "-N -U " + pguser], {"env": instance.env});
	}).then(function start(){
		debug.log("Starting PostgreSQL");
		return spawnProcess("pg_ctl", ["start", "-w", "-o", "-F --unix-socket-directories=/tmp"], {"env": instance.env});
	}).then(function(){
		return instance;
	});
};

pgrunner.Instance = PGRunnerInstance;

/* EOF */
