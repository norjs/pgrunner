import PGRUNNER from "./pgrunner";
import AssertUtils from "@norjs/utils/Assert";
import LogUtils from "@norjs/utils/Log";
import PgRunnerUtils from "./PgRunnerUtils";
import _ from "lodash";
import FS from "fs";
import { PGRUNNER_CONFIG_FILE } from "./pgrunner-env";
import { MAIN_USAGE } from "./pgrunner-constants";

const nrLog = LogUtils.getLogger('PgRunnerCommands');

export class PgRunnerCommands {

    static get nrLog () {
        return nrLog;
    }

    static async create (opts) {

        const instance = await PGRUNNER(opts);

        // Save config
        let config = this._loadConfig();
        config.servers.push(instance);
        this._saveConfig(config);

        // Print to screen
        console.log(instance.pgconfig);

    }

    static list () {

        let config = this._loadConfig();

        nrLog.trace('config = ', config);

        console.log( "pgconfig\n--------\n" + config.servers.map(server => [server.pgconfig].join(' | ')).join('\n') );

    }

    static async destroy (opts) {

        // Load config
        let config = this._loadConfig();
        nrLog.trace('config = ', config);

        opts = this._stripServerOpts(opts);

        let instance_opts = this._searchServer(config.servers, opts);

        nrLog.trace('instance_opts = ', instance_opts);

        AssertUtils.isObject(instance_opts);

        instance_opts.MARKED_FOR_DELETE = true;

        let instance = new PGRUNNER.Instance( instance_opts );

        AssertUtils.isObject(instance);

        nrLog.trace('Stopping...');

        await instance.stop();

        // Remove the temp directory next

        AssertUtils.isObject(instance);
        AssertUtils.isObject(instance.env);
        AssertUtils.isString(instance.env.PGDATA);

        await PgRunnerUtils.rimraf(instance.env.PGDATA);

        // Save config without the record we stopped
        config.servers = _.filter(config.servers, s => s.MARKED_FOR_DELETE === undefined);

        this._saveConfig(config);

        console.log('Destroyed successfully');

    }

    static async main (ACTIONS, OPTIONS) {

        const COMMANDS = {

            create: opts => {
                return PgRunnerCommands.create(opts);
            },

            list: (/*opts*/ ) => {
                return PgRunnerCommands.list();
            },

            destroy: opts => {
                return PgRunnerCommands.destroy(opts)
            }

        };

        const steps = _.map(ACTIONS, cmd => {

            if (_.isFunction(COMMANDS[cmd])) {
                return COMMANDS[cmd].bind(undefined, this._stripArgv(OPTIONS) );
            } else {
                throw new Error('Unknown command: ' + cmd);
            }

        });

        if (steps.length < 1) {
            console.log(MAIN_USAGE);
            return;
        }

        return await _.reduce(steps, (a, b) => a.then(b), Promise.resolve() );

    }

    /** Save current config
     *
     * @param config
     */
    static _saveConfig (config) {

        FS.writeFileSync(PGRUNNER_CONFIG_FILE, JSON.stringify(config, null, 2), {'encoding':'utf8'});

        nrLog.trace('Saved to ', PGRUNNER_CONFIG_FILE);

    }

    /** Returns current config
     *
     */
    static _loadConfig () {

        let config = {};

        if (FS.existsSync(PGRUNNER_CONFIG_FILE)) {
            config = JSON.parse(FS.readFileSync(PGRUNNER_CONFIG_FILE, {'encoding':'utf8'}));
            nrLog.trace('Loaded from ', PGRUNNER_CONFIG_FILE);
        }

        if (!_.isArray(config.servers)) {
            config.servers = [];
        }

        return config;
    }

    /** Strip argv
     *
     * @param a {Array}
     * @returns {Object}
     */
    static _stripArgv (a) {

        let o = {};

        Object.keys(a).map(k => {

            let key, value;

            const index = k.indexOf('=');
            if (index >= 0) {

                key = k.substr(0, index);
                value = k.substr(index+1);

            } else {

                key = k;
                value = true;

            }

            o[key] = value;

        });

        return o;

    }

    /** Strip keys
     *
     * @param old_opts
     */
    static _stripServerOpts (old_opts) {

        AssertUtils.isObject(old_opts);

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
    static _getServerOpts (opts) {

        AssertUtils.isObject(opts);
        AssertUtils.isObject(opts.settings);

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
    static _searchServer (servers, opts) {

        AssertUtils.isArray(servers);
        AssertUtils.isObject(opts);

        let instance_opts = servers.filter(server => {
            let server_opts = this._getServerOpts(server);
            return Object.keys(opts).map(key => opts[key] === server_opts[key]).every(v => v === true);
        }).shift();

        if (!instance_opts) {
            throw new Error('Could not find server!');
        }

        return instance_opts;
    }

}

export default PgRunnerCommands;
