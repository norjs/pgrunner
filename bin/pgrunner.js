#!/usr/bin/env node
/* $filename: $ */
"use strict";

var argv = require('optimist').boolean('v').argv;
var util = require('util');
var debug = require('nor-debug');

if(argv.v) {
	debug.setNodeENV('development');
} else {
	debug.setNodeENV('production');
}

debug.setProjectRoot(require('path').dirname(__dirname));

var is = require('nor-is');
var fs = require('nor-fs');
var Q = require('q');
Q.longStackSupport = true;

var RIMRAF = require('rimraf');
var rimraf = Q.denodeify(RIMRAF);

var pgrunner_config_file = require('path').resolve(process.env.HOME, '.pgrunner.json');

/** Returns current config */
function load_config() {
	var config = {};
	if(fs.sync.exists(pgrunner_config_file)) {
		config = JSON.parse(fs.sync.readFile(pgrunner_config_file, {'encoding':'utf8'}));
		debug.log('Loaded from ', pgrunner_config_file);
	}
	if(!is.array(config.servers)) {
		config.servers = [];
	}
	return config;
}

/** Save current config */
function save_config(config) {
	fs.sync.writeFile(pgrunner_config_file, JSON.stringify(config, null, 2), {'encoding':'utf8'});
	debug.log('Saved to ', pgrunner_config_file);
}

var pgrunner = require('../src/index.js');

/** Strip argv */
function strip_argv(a) {
	var o = {};
	return Object.keys(a).filter(function(k) {
		return k !== '_';
	}).map(function(k) {
		o[k] = a[k];
	});
	debug.log('o = ', o);
	return o;
}

/* Strip keys */
function strip_server_opts(old_opts) {
	debug.assert(old_opts).is('object');
	var opts = {};
	['pgconfig', 'host', 'port', 'user', 'database'].forEach(function(key) {
		if(old_opts[key] !== undefined) {
			opts[key] = old_opts[key];
		}
	});
	return opts;
}

/** Returns server options */
function get_server_opts(opts) {
	debug.assert(opts).is('object');
	debug.assert(opts.settings).is('object');
	return {
		'dbconfig': opts.dbconfig,
		'host': opts.settings.host,
		'port': opts.settings.port,
		'user': opts.settings.user,
		'database': opts.settings.database
	};
}

/* */
function search_server(servers, opts) {
	debug.assert(servers).is('array');
	debug.assert(opts).is('object');

	var instance_opts = servers.filter(function(server) {
		var server_opts = get_server_opts(server);
		return Object.keys(opts).map(function(key) {
			return opts[key] === server_opts[key] ? true : false;
		}).every(function(v) {
			return v === true;
		});
	}).shift();

	if(!instance_opts) {
		throw new Error('Could not find server!');
	}
	
	return instance_opts;
}

var _commands = {
	'create': function(opts) {
		return pgrunner(opts).then(function(instance) {
			
			// Save config
			var config = load_config();
			config.servers.push(instance);
			save_config(config);
			
			// Print to screen
			console.log('Created: ' + instance.pgconfig);
		});
	},
	'list': function(opts) {
		var config = load_config();
		debug.log('config = ', config);
		console.log( "pgconfig\n--------\n" + config.servers.map(function(server) {
			return [server.pgconfig].join(' | ');
		}).join('\n') );
	},
	'destroy': function(opts) {

		// Load config
		var config = load_config();
		debug.log('config = ', config);

		opts = strip_server_opts(opts);

		var instance_opts = search_server(config.servers, opts);
		debug.log('instance_opts = ', instance_opts);

		debug.assert(instance_opts).is('object');

		instance_opts.MARKED_FOR_DELETE = true;

		var instance = new pgrunner.Instance( instance_opts );
		debug.assert(instance).is('object');

		debug.log('Stopping...');

		return instance.stop().then(function() {
			// Remove the temp directory
			debug.assert(instance).is('object');
			debug.assert(instance.env).is('object');
			debug.assert(instance.env.PGDATA).is('string');
			return rimraf(instance.env.PGDATA);
		}).then(function() {

			// Save config without the record we stopped
			config.servers = config.servers.filter(function(s) {
				return s.MARKED_FOR_DELETE === undefined;
			});
			save_config(config);
			
			console.log('Destroyed successfully');
		});
	}
};

Q.fcall(function() {

	var steps = argv._.map(function(cmd) {
		if(is.func(_commands[cmd])) {
			return _commands[cmd].bind(undefined, strip_argv(argv) );
		} else {
			throw new Error('Unknown command: ' + cmd);
		}
	});

	if(steps.length < 1) {
		console.log('USAGE: pgrunner OPT(s) ACTION(s)');
		console.log('');
		console.log('where ACTION is:');
		console.log('  create  -- Create a server');
		console.log('  start   -- Start a server [not implemented]');
		console.log('  stop    -- Stop a server [not implemented]');
		console.log('  list    -- List servers');
		console.log('  destroy -- Delete a server');
		console.log('');
		console.log('where OPT(s) are:');
		console.log('  -v                 -- Write more information');
		console.log('  --pgconfig=CONFIG  -- Search by pg config string');
		console.log('  --host=HOST        -- Match by host');
		console.log('  --port=PORT        -- Match by port');
		console.log('  --user=USER        -- Match by user');
		console.log('  --database=NAME    -- Match by database name');
		console.log('');
	}

	return steps.reduce(Q.when, Q());

}).fail(function(err) {
	if(err.retval && err.stderr) {
		util.error(err.stderr);
		return;
	}
	util.error('Error: ', err);
	if(err.stack) {
		debug.log(err.stack);
	}
}).done();

/* EOF */
