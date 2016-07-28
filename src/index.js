/* pgrunner library */

"use strict";

var Q = require('q');
var merge = require('merge');
var debug = require('nor-debug');

var temp = require('temp');

var is = require('nor-is');
var PATH = require('path');
var fs = require('nor-fs');

/**
 * Function that returns promise of a temporary directory
 */
var mktempdir = Q.denodeify(temp.mkdir);

/** Search command from PATH 
 */
function command_exists(paths, name) {
	if(is.string(paths)) {
		paths = paths.split(':');
	}
	
	debug.assert(paths).is('array');
	
	return paths.some(function(dir) {
		return fs.sync.exists(PATH.join(dir, name));
	});
}

/* */
var PG_CTL = 'pg_ctl';

if(!command_exists(process.env.PATH, 'pg_ctl')) {
	['/usr/lib/postgresql/9.3/bin', '/usr/lib/postgresql/9.4/bin'].forEach(function(bin_dir) {
		if(fs.sync.exists(PATH.join(bin_dir, 'pg_ctl'))) {
			process.env.PATH = bin_dir + ':' + process.env.PATH;
			PG_CTL = PATH.join(bin_dir, 'pg_ctl');
		}
	});
}

debug.log('pg_ctl detected as ', PG_CTL);

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
	options.stdio = ["ignore", "ignore", "pipe"];

	var stderr = '';

	// Run the process
	var proc = require('child_process').spawn(command, args, options);
	proc.stderr.setEncoding('utf8');
	proc.stderr.on('data', function(data) {
		stderr += data;
	});

	// Handle exit
	proc.on('close', function(retval) {
		if (retval === 0) {
			defer.resolve(retval);
		} else {
			defer.reject({"retval": retval, "stderr": stderr});
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
	this.settings = opts.settings || {};
	this.env = opts.env || {};
	this.pgconfig = opts.pgconfig || undefined;
}

/** Stop the instance */
PGRunnerInstance.prototype.stop = function pgrunner_stop() {
	var self = this;
	debug.log("Stopping PostgreSQL");
	debug.log("env = ", self.env);
	return spawnProcess(PG_CTL, ["stop", "-w", "-m", "fast"], {"env": self.env}).then(function() {
		
	});
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
		instance.settings = {
			'host': pghost,
			'port': pgport,
			'user': pguser,
			'database': pgdatabase
		};
		instance.env = {
			"PGDATA": tmpdir,
			"PGHOST": pghost,
			"PGPORT": pgport,
			"PGUSER": pguser,
			"PGDATABASE": pgdatabase,
			"PGCLIENTENCODING": "UTF-8",
			"TZ": "UTC"
		};
		instance.pgconfig = "postgresql://" + pguser + "@" + pghost + ":" + pgport + "/" + pgdatabase;
	}).then(function initdb(){
		debug.log("Initializing PostgreSQL database");
		return spawnProcess(PG_CTL, ["init", "-w", "-o", "-N -U " + pguser], {"env": instance.env});
	}).then(function start(){
		debug.log("Starting PostgreSQL");
		return spawnProcess(PG_CTL, ["start", "-w", "-o", "-F --unix-socket-directories=/tmp"], {"env": instance.env});
	}).then(function(){
		return spawnProcess('createdb', ["-w", "-h", pghost, "-p", pgport, "-U", pguser, "-O", pguser, pgdatabase], {"env": instance.env});
	}).then(function(){
		return instance;
	});
};

pgrunner.Instance = PGRunnerInstance;

/** Automatically track and cleanup files at exit */
pgrunner.enableAutoClean = function() {
	temp.track();
	// FIXME: Does not shutdown servers when cleaning up files.
};

/* EOF */
