/*
* File: src\shared\sendEmail\index.js
* Project: Omni-corsair-reports
* Author: Bizcloud Experts
* Date: 2024-02-01
* Confidential and Proprietary
*/
const nodemailer = require("nodemailer");
const { log } = require("../utils/logger");

async function sendEmail(mailSubject, body, functionName, receiver) {
    return new Promise((resolve, reject) => {
        try {
            const TRANSPORTER = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                },
            });
            TRANSPORTER.sendMail(
                {
                    from: process.env.SMTP_SENDER,
                    to: receiver,
                    subject: process.env.stage + "-" + mailSubject,
                    html: body,
                },
                (error, info) => {
                    if (error) {
                        resolve(error)
                    }
                    log.INFO(functionName,info);
                    resolve(info)
                }
            );
            return true;
        } catch (error) {
            log.ERROR(functionName, error, 500);
            return false;
        }
    })
}
module.exports = { sendEmail }

