import PgRunnerUtils from "./PgRunnerUtils";
import PgRunnerConstants, { PG_CTL_STOP_OPTS } from "./pgrunner-constants";

/**
 *
 */
export class PgRunnerInstance {

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
    async stop () {

        await PgRunnerUtils.spawnProcess(PgRunnerConstants.PG_CTL, PG_CTL_STOP_OPTS, {"env": this.env});

    }

}

export default PgRunnerInstance;
