import TEMP from 'temp';
import PATH from 'path';
import FS from 'fs';
import LogUtils from "@norjs/utils/Log";
import PgRunnerUtils from "./PgRunnerUtils";
import PgRunnerConstants, { PG_CTL_START_OPTS, PGCTL_TIMEOUT } from "./pgrunner-constants";
import { PgRunnerInstance } from "./PgRunnerInstance";

const nrLog = LogUtils.getLogger('@norjs/pgrunner');

/** The Module
 *
 * @param opts
 * @returns {Promise<PgRunnerInstance>}
 */
export async function pgrunner (opts = {}) {

	const pghost = opts.host || '127.0.0.1';

	const pgport = opts.port || 55432;

	const pguser = opts.user || process.env.USER;

	const pgdatabase = opts.database || pguser;

	let instance = new PgRunnerInstance();

	// Create and start the database
	const tmpdir = await PgRunnerUtils.mktempdir('nor-pgrunner-data-');

	nrLog.trace('Created temp directory: ', tmpdir);

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

	nrLog.trace('Instance ENV: ', instance.env);
	nrLog.trace('Instance pgconfig: ', instance.pgconfig);

	nrLog.trace("Initializing PostgreSQL database");
	await PgRunnerUtils.spawnProcess(PgRunnerConstants.PG_CTL, ["init", "-s", "-t", PGCTL_TIMEOUT, "-w", "-o", "-N -U " + pguser], {"env": instance.env});

	nrLog.trace("Starting PostgreSQL");
	await PgRunnerUtils.spawnProcess(PgRunnerConstants.PG_CTL, PG_CTL_START_OPTS, {"env": instance.env});

	nrLog.trace("Creating database");

	await PgRunnerUtils.spawnProcess(
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

	return instance;

}

pgrunner.nrLog = nrLog;

pgrunner.Instance = PgRunnerInstance;

/** Automatically track and cleanup files at exit
 */
pgrunner.enableAutoClean = () => {

	// noinspection JSCheckFunctionSignatures
	TEMP.track();

	// FIXME: Does not shutdown servers when cleaning up files.

};

if (!PgRunnerUtils.commandExists(process.env.PATH, 'pg_ctl')) {
	PG_PATHS.forEach(bin_dir => {
		if (FS.existsSync(PATH.join(bin_dir, 'pg_ctl'))) {
			process.env.PATH = bin_dir + ':' + process.env.PATH;
			PgRunnerConstants.PG_CTL = PATH.join(bin_dir, 'pg_ctl');
		}
	});
}

export default pgrunner;

/* EOF */
