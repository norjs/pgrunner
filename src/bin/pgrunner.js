#!/usr/bin/env node
/* $filename: $ */
"use strict";

import pgrunner from '../index.js';
import optimist from 'optimist';
import debug from '@norjs/debug';
import is from '@norjs/is';
import fs from 'fs';
import _Q from 'q';
import RIMRAF from 'rimraf';

let argv = optimist.boolean('v').argv;

if (argv.v) {
	debug.setNodeENV('development');
} else {
	debug.setNodeENV('production');
}

debug.setProjectRoot(require('path').dirname(__dirname));

_Q.longStackSupport = true;

const rimraf = _Q.denodeify(RIMRAF);

const pgrunner_config_file = require('path').resolve(process.env.HOME, '.nor-pgrunner.json');

/** Returns current config
 *
 */
function load_config () {
	let config = {};
	if (fs.existsSync(pgrunner_config_file)) {
		config = JSON.parse(fs.readFileSync(pgrunner_config_file, {'encoding':'utf8'}));
		if (argv.v) {
			debug.log('Loaded from ', pgrunner_config_file);
		}
	}
	if (!is.array(config.servers)) {
		config.servers = [];
	}
	return config;
}

/** Save current config
 *
 * @param config
 */
function save_config (config) {
	fs.writeFileSync(pgrunner_config_file, JSON.stringify(config, null, 2), {'encoding':'utf8'});
	if (argv.v) {
		debug.log('Saved to ', pgrunner_config_file);
	}
}

/** Strip argv
 *
 * @param a
 * @returns {any[]}
 */
function strip_argv (a) {
	let o = {};
	return Object.keys(a).filter(k => k !== '_').map(k => {
		o[k] = a[k];
	});
}

/** Strip keys
 *
 * @param old_opts
 */
function strip_server_opts (old_opts) {
	debug.assert(old_opts).is('object');
	let opts = {};
	['pgconfig', 'host', 'port', 'user', 'database'].forEach(key => {
		if (old_opts[key] !== undefined) {
			opts[key] = old_opts[key];
		}
	});
	return opts;
}

/** Returns server options
 *
 * @param opts
 * @returns {{database: *, port: (*|number), dbconfig: *, host: (*|string), user: *}}
 */
function get_server_opts (opts) {
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

/**
 *
 * @param servers
 * @param opts
 * @returns {*|T}
 */
function search_server (servers, opts) {
	debug.assert(servers).is('array');
	debug.assert(opts).is('object');

	let instance_opts = servers.filter(server => {
		let server_opts = get_server_opts(server);
		return Object.keys(opts).map(key => opts[key] === server_opts[key]).every(v => v === true);
	}).shift();

	if (!instance_opts) {
		throw new Error('Could not find server!');
	}

	return instance_opts;
}

let _commands = {
	'create': opts => pgrunner(opts).then(instance => {

		// Save config
		let config = load_config();
		config.servers.push(instance);
		save_config(config);

		// Print to screen
		console.log(instance.pgconfig);
	}),
	'list': (/*opts*/ ) => {
		let config = load_config();
		if (argv.v) {
			debug.log('config = ', config);
		}
		console.log( "pgconfig\n--------\n" + config.servers.map(server => [server.pgconfig].join(' | ')).join('\n') );
	},
	'destroy': opts => {

		// Load config
		let config = load_config();
		if (argv.v) {
			debug.log('config = ', config);
		}

		opts = strip_server_opts(opts);

		let instance_opts = search_server(config.servers, opts);
		if (argv.v) {
			debug.log('instance_opts = ', instance_opts);
		}

		debug.assert(instance_opts).is('object');

		instance_opts.MARKED_FOR_DELETE = true;

		let instance = new pgrunner.Instance( instance_opts );
		debug.assert(instance).is('object');

		if (argv.v) {
			debug.log('Stopping...');
		}

		return instance.stop().then(() => {
			// Remove the temp directory
			debug.assert(instance).is('object');
			debug.assert(instance.env).is('object');
			debug.assert(instance.env.PGDATA).is('string');
			return rimraf(instance.env.PGDATA);
		}).then(() => {

			// Save config without the record we stopped
			config.servers = config.servers.filter(s => s.MARKED_FOR_DELETE === undefined);
			save_config(config);

			console.log('Destroyed successfully');
		});
	}
};

_Q.fcall(() => {

	let steps = argv._.map(cmd => {
		if (is.func(_commands[cmd])) {
			return _commands[cmd].bind(undefined, strip_argv(argv) );
		} else {
			throw new Error('Unknown command: ' + cmd);
		}
	});

	if (steps.length < 1) {
		console.log(`USAGE: pgrunner OPT(s) ACTION(s)

where ACTION is:
  create  -- Create a server
  start   -- Start a server [not implemented]
  stop    -- Stop a server [not implemented]
  list    -- List servers
  destroy -- Delete a server

where OPT(s) are:
  -v                 -- Write more information
  --pgconfig=CONFIG  -- Search by pg config string
  --host=HOST        -- Match by host
  --port=PORT        -- Match by port
  --user=USER        -- Match by user
  --database=NAME    -- Match by database name
`
		);
	}

	return steps.reduce(_Q.when, _Q());

}).catch(err => {
	if (err.retval && err.stderr) {
		process.stderr.write(err.stderr + '\n');
		return;
	}
	process.stderr.write('Error: ' + err + '\n');
	if (err.stack) {
		debug.error(err.stack);
	}
}).done();

/* EOF */
