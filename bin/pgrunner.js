#!/usr/bin/env node
/* $filename: $ */
"use strict";

var util = require('util');
var debug = require('nor-debug');
var is = require('nor-is');
var fs = require('nor-fs');
var argv = require('optimist').argv;
var Q = require('q');
Q.longStackSupport = true;

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

var _commands = {
	'start': function(opts) {
		return pgrunner(opts).then(function(instance) {

			// Save config
			var config = load_config();
			config.servers.push(instance);
			save_config(config);
			
			// Print to screen
			console.log('Started: ' + instance.pgconfig);
		});
	},
	'stop': function(opts) {

		// Load config
		var config = load_config();
		debug.log('config = ', config);

		var instance_opts = config.servers.filter(function(server) {
			return Object.keys(opts).map(function(key) {
				return opts[key] === server[key] ? true : false;
			}).every(function(v) {
				return v === true;
			});
		}).shift();

		if(!instance_opts) {
			throw new Error('Could not find server!');
		}

		debug.log('instance_opts = ', instance_opts);

		debug.assert(instance_opts).is('object');

		var instance = new pgrunner.Instance( instance_opts );
		debug.assert(instance).is('object');

		debug.log('Stopping...');

		return instance.stop().then(function() {
			console.log('Stopped successfully');
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
		console.log('where ACTION is:');
		console.log('  stop    -- Stop a server');
		console.log('  start   -- Start a server');
	}

	return steps.reduce(Q.when, Q());

}).fail(function(err) {
	debug.error('Error: ', err);
	if(err.stack) {
		debug.log(err.stack);
	}
}).done();

/* EOF */
