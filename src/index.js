/* pgrunner library */

"use strict";

import { Async } from './Async.js';
import debug from '@norjs/debug';
import is from '@norjs/is';
import child_process from 'child_process';
import Q from 'q';
import merge from 'merge';
import temp from 'temp';
import PATH from 'path';
import fs from 'fs';

const PG_PATHS = [
	'/usr/lib/postgresql/9.3/bin',
	'/usr/lib/postgresql/9.4/bin',
	'/usr/local/Cellar/postgresql/11.1/bin'
];

/**
 * Function that returns promise of a temporary directory
 */
const mktempdir = Q.denodeify(temp.mkdir);

/** Search command from PATH
 *
 * @param paths {string|array}
 * @param name
 * @returns {*|boolean}
 */
function command_exists (paths, name) {

	if (is.string(paths)) {
		paths = paths.split(':');
	}

	debug.assert(paths).is('array');

	return paths.some(dir => fs.existsSync(PATH.join(dir, name)));
}

/**
 *
 * @type {string}
 */
const PGCTL_TIMEOUT = "30";

/**
 *
 * @type {string}
 */
const PG_CTL = 'pg_ctl';

/**
 *
 * @type {*[]}
 */
const PG_CTL_START_OPTS = ["start", "-s", "-t", PGCTL_TIMEOUT, "-w", "-o", "-F -k /tmp"];

/**
 *
 * @type {*[]}
 */
const PG_CTL_STOP_OPTS  = ["stop",  "-s", "-t", PGCTL_TIMEOUT, "-w", "-m", "fast"];

if (!command_exists(process.env.PATH, 'pg_ctl')) {
	PG_PATHS.forEach(bin_dir => {
		if (fs.existsSync(PATH.join(bin_dir, 'pg_ctl'))) {
			process.env.PATH = bin_dir + ':' + process.env.PATH;
			PG_CTL = PATH.join(bin_dir, 'pg_ctl');
		}
	});
}

//debug.log('pg_ctl detected as ', PG_CTL);

/** Return promise of a spawned command
 *
 * @param command {string}
 * @param args {array.<string>}
 * @param options {object}
 * @returns {*}
 */
function spawnProcess (command, args, {env = {}} = {}) {
	return Async.Promise( (resolve, reject) => {

		//debug.log('command = ', command);
		//debug.log('args = ', args);
		//debug.log('options = ', options);

		// NOTE! If you set stdout to be captured instead of ignored (the postgres log is there),
		// pgctl start will fail to exit.

		const options = {
			env: merge(process.env, env || {}),
			detached: true,
			stdio: ["ignore", "ignore", "pipe"]
		};

		let stderr = '';

		// Run the process

		//debug.log('Executing command ', command, args);

		let proc = child_process.spawn(command, args, options);

		// Handle exit
		proc.on('close', retval => {
			//debug.log('Command ', command, args, ' closed with ', retval);
			if (retval === 0) {
				resolve(retval);
			} else {
				reject({retval, stderr});
			}
		});

		// Handle error
		proc.on('error', err => {
			reject(err);
		});

		//proc.stdout.setEncoding('utf8');
		//proc.stdout.on('data', data => {
		//	process.stderr.write(data);
		//});

		proc.stderr.setEncoding('utf8');
		proc.stderr.on('data', data => {
			stderr += data;
		});

	});
}

/**
 *
 */
export class PGRunnerInstance {

	/** Constructor
	 *
	 * @param settings {object}
	 * @param env {object}
	 * @param pgconfig {string|undefined}
	 */
	constructor ({
         settings = {},
         env = {},
         pgconfig = undefined
	} = {}) {
		this.settings = settings || {};
		this.env = env || {};
		this.pgconfig = pgconfig || undefined;
	}

	/** Stop the instance */
	stop () {
		//debug.log("Stopping PostgreSQL");
		//debug.log("env = ", this.env);
		return spawnProcess(PG_CTL, PG_CTL_STOP_OPTS, {"env": this.env}).then(() => {});
	}

}

/** The Module
 *
 * @param opts
 * @returns {PromiseLike<PGRunnerInstance | never>}
 */
export function pgrunner (opts = {}) {

	const pghost = opts.host || '127.0.0.1';
	const pgport = opts.port || 55432;
	const pguser = opts.user || process.env.USER;
	const pgdatabase = opts.database || pguser;

	let instance = new PGRunnerInstance();

	// Create and start the database
	return mktempdir('nor-pgrunner-data-').then(tmpdir => {

		//debug.log('Created temp directory: ', tmpdir);

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

		//debug.log('Instance ENV: ', instance.env);
		//debug.log('Instance pgconfig: ', instance.pgconfig);

	}).then(() => {
		//debug.log("Initializing PostgreSQL database");
		return spawnProcess(PG_CTL, ["init", "-s", "-t", PGCTL_TIMEOUT, "-w", "-o", "-N -U " + pguser], {"env": instance.env});
	}).then(() => {
		//debug.log("Starting PostgreSQL");
		return spawnProcess(PG_CTL, PG_CTL_START_OPTS, {"env": instance.env});
	}).then(() => {
		//debug.log("Creating database");

		return spawnProcess(
		'createdb',
			[
				"-w"
				, "-h", pghost
				, "-p", pgport
				, "-U", pguser
				, "-O", pguser
				, pgdatabase
		], {
			"env": instance.env
		});
	}).then(() => instance);
}

pgrunner.Instance = PGRunnerInstance;

/** Automatically track and cleanup files at exit
 */
pgrunner.enableAutoClean = () => {
	temp.track();
	// FIXME: Does not shutdown servers when cleaning up files.
};

export default pgrunner;

/* EOF */
