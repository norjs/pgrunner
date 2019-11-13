
export const PG_PATHS = [
    '/usr/lib/postgresql/9.3/bin',
    '/usr/lib/postgresql/9.4/bin',
    '/usr/local/Cellar/postgresql/11.1/bin'
];

/**
 *
 * @type {string}
 */
export const PGCTL_TIMEOUT = "30";

/**
 *
 * @type {string}
 */
export let PG_CTL = 'pg_ctl';

/**
 *
 * @type {*[]}
 */
export const PG_CTL_START_OPTS = ["start", "-s", "-t", PGCTL_TIMEOUT, "-w", "-o", "-F -k /tmp"];

/**
 *
 * @type {*[]}
 */
export const PG_CTL_STOP_OPTS  = ["stop",  "-s", "-t", PGCTL_TIMEOUT, "-w", "-m", "fast"];

export const MAIN_USAGE = `USAGE: pgrunner OPT(s) ACTION(s)

where ACTION is:
  create  -- Create a server
  list    -- List servers
  destroy -- Delete a server

where OPT(s) are:
  --verbose  -v      -- Write more information
  --pgconfig=CONFIG  -- Search by pg config string
  --host=HOST        -- Match by host
  --port=PORT        -- Match by port
  --user=USER        -- Match by user
  --database=NAME    -- Match by database name
`;

export class PgRunnerConstants {

    static get PG_CTL () {
        return PG_CTL;
    }

    static set PG_CTL (value) {
        PG_CTL = value;
    }

}

export default PgRunnerConstants;
