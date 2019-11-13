import PGRUNNER from '../pgrunner.js';
import LogUtils from "@norjs/utils/Log";
import PgRunnerUtils from "../PgRunnerUtils";
import _ from 'lodash';
import PgRunnerConstants from "../pgrunner-constants";
import PgRunnerCommands from "../PgRunnerCommands";

const nrLog = LogUtils.getLogger('pgrunner-main');

const ALL_ARGS = _.slice(process.argv, 2);

const ACTIONS = _.filter(ALL_ARGS, arg => arg.length && arg[0] !== '-');

const OPTIONS = _.filter(ALL_ARGS, arg => arg.length && arg[0] === '-').map(arg => _.trimStart(arg, '-'));

const ENABLE_VERBOSE = _.some(OPTIONS, arg => arg === 'v' || arg === 'verbose');

if (ENABLE_VERBOSE) {

	nrLog.setLogLevel(nrLog.LogLevel.TRACE);
	PGRUNNER.nrLog.setLogLevel(nrLog.LogLevel.TRACE);
	PgRunnerUtils.nrLog.setLogLevel(nrLog.LogLevel.TRACE);
	PgRunnerCommands.nrLog.setLogLevel(nrLog.LogLevel.TRACE);

	nrLog.trace(`ACTIONS = `, ACTIONS);
	nrLog.trace(`OPTIONS = `, OPTIONS);

} else {
	nrLog.setLogLevel(nrLog.LogLevel.INFO);
	PgRunnerUtils.nrLog.setLogLevel(nrLog.LogLevel.INFO);
	PGRUNNER.nrLog.setLogLevel(nrLog.LogLevel.INFO);
	PgRunnerCommands.nrLog.setLogLevel(nrLog.LogLevel.INFO);
}

nrLog.trace('pg_ctl detected as ', PgRunnerConstants.PG_CTL);

PgRunnerCommands.main(ACTIONS, OPTIONS).catch(err => {

	if ( err.retval && err.stderr ) {
		nrLog.error('ERROR: ', err.stderr);
		return;
	}

	nrLog.error('ERROR: ', err);

});
