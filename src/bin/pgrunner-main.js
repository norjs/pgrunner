import PGRUNNER from '../pgrunner.js';
import LogUtils from "@norjs/utils/Log";
import PgRunnerUtils from "../PgRunnerUtils";
import PgRunnerConstants from "../pgrunner-constants";
import PgRunnerCommands from "../PgRunnerCommands";
import ProcessUtils from "@norjs/utils/Process";

const nrLog = LogUtils.getLogger('pgrunner-main');

const ALL_ARGS = ProcessUtils.getArguments();

const ACTIONS = ProcessUtils.filterFreeArguments(ALL_ARGS);

const OPTIONS = ProcessUtils.filterOptions(ALL_ARGS);

const ENABLE_VERBOSE = ProcessUtils.parseBooleanOption(OPTIONS, 'v', 'verbose');

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
