import _ from "lodash";
import AssertUtils from "@norjs/utils/src/AssertUtils";
import fs from "fs";
import PATH from "path";
import MERGE from "merge";
import child_process from "child_process";
import TEMP from "temp";
import RIMRAF from "rimraf";
import LogUtils from "@norjs/utils/Log";

const nrLog = LogUtils.getLogger('PgRunnerUtils');

export class PgRunnerUtils {

    /**
     * @private
     */
    constructor() {}

    static get nrLog () {
        return nrLog;
    }

    /** Search command from PATH
     *
     * @param paths {string|array}
     * @param name
     * @returns {*|boolean}
     */
    static commandExists (paths, name) {

        if (_.isString(paths)) {
            paths = paths.split(':');
        }

        AssertUtils.isArray(paths);

        return paths.some(dir => fs.existsSync(PATH.join(dir, name)));

    }

    /** Return promise of a spawned command
     *
     * @param command {string}
     * @param args {array.<string>}
     * @param options {object}
     * @returns {*}
     */
    static async spawnProcess (command, args, {env = {}} = {}) {
        return await new Promise( (resolve, reject) => {

            nrLog.trace('command = ', command);
            nrLog.trace('args = ', args);
            nrLog.trace('env = ', env);

            // NOTE! If you set stdout to be captured instead of ignored (the postgres log is there),
            // pgctl start will fail to exit.

            const options = {
                env: MERGE(process.env, env || {}),
                detached: true,
                stdio: ["ignore", "ignore", "pipe"]
            };

            let stderr = '';

            // Run the process

            nrLog.trace('Executing command ', command, args);

            let proc = child_process.spawn(command, args, options);

            // Handle exit
            proc.on('close', retval => {
                nrLog.trace('Command ', command, args, ' closed with ', retval);
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
     * Function that returns promise of a temporary directory
     */
    static async mktempdir (dir) {
        return await new Promise((resolve, reject) => {
            TEMP.mkdir(dir, (err, dirPath) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(dirPath);
                }
            });
        });
    }

    /**
     * Function that deletes a directory
     */
    static async rimraf (dir) {
        return await new Promise((resolve, reject) => {
            RIMRAF(dir, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

}

export default PgRunnerUtils;
