const log4js = require('log4js');
const moment = require('moment');

log4js.configure({
    appenders: { out: { type: "stdout", layout: { type: "messagePassThrough" } } },
    categories: { default: { appenders: ["out"], level: "info" } }
});
const logger = log4js.getLogger("out");

module.exports = {
    INFO(functionName, message, status = 200) {
        logger.info(JSON.stringify({
            "@timestamp": moment().format(),
            "status": status,
            "message": JSON.stringify(message),
            "service-name": "logs-sample",
            "application": "biz-dev",
            "region": process.env.REGION,
            "functionName": functionName
        }));
    },
    ERROR(functionName, message, status = 500) {
        logger.info(JSON.stringify({
            "@timestamp": moment().format(),
            "status": status,
            "message": JSON.stringify(message),
            "service-name": "logs-sample",
            "application": "biz-dev",
            "region": process.env.REGION,
            "functionName": functionName
        }));
    }
}