import PATH from "path";

export const HOME = process.env.HOME;

export const PGRUNNER_CONFIG_FILE = PATH.resolve(HOME, '.nor-pgrunner.json');
