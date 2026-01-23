/**
 * Logger
 *
 * Simple logging utility with log levels and formatting.
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (LogLevel = {}));
export class Logger {
    static instance;
    level = LogLevel.INFO;
    prefix = '[wot-mcp]';
    constructor() { }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLevel(level) {
        this.level = level;
    }
    setPrefix(prefix) {
        this.prefix = prefix;
    }
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.map(arg => {
            if (arg instanceof Error) {
                return arg.stack || arg.message;
            }
            return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg;
        }).join(' ');
        return `${timestamp} ${this.prefix} ${level}: ${message} ${formattedArgs}`;
    }
    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.error(this.formatMessage('DEBUG', message, ...args));
        }
    }
    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.error(this.formatMessage('INFO', message, ...args));
        }
    }
    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            console.error(this.formatMessage('WARN', message, ...args));
        }
    }
    error(message, ...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.formatMessage('ERROR', message, ...args));
        }
    }
}
export const logger = Logger.getInstance();
