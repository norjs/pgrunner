/**
 * This is a fail safe list of known postgresql executable paths in case pg_ctl is not included in user's PATH
 *
 * @type {*[]}
 */
export const PG_PATHS = [
    '/usr/lib/postgresql/16/bin',
    '/Library/PostgreSQL/16/bin',
    '/usr/lib/postgresql/15/bin',
    '/Library/PostgreSQL/15/bin',
    '/usr/lib/postgresql/14/bin',
    '/Library/PostgreSQL/14/bin',
    '/usr/lib/postgresql/13/bin',
    '/Library/PostgreSQL/13/bin',
    '/usr/lib/postgresql/12/bin',
    '/Library/PostgreSQL/12/bin',
    '/usr/lib/postgresql/11/bin',
    '/usr/local/Cellar/postgresql/11.1/bin',
    '/Library/PostgreSQL/11/bin',
    '/usr/lib/postgresql/10/bin',
    '/Library/PostgreSQL/10/bin',
    '/usr/lib/postgresql/9/bin',
    '/Library/PostgreSQL/9/bin',
    '/usr/lib/postgresql/9.3/bin',
    '/usr/lib/postgresql/9.4/bin'
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
