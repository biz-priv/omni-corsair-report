const nodemailer = require("nodemailer");
const { INFO, ERROR } = require("../utils/logger");

async function sendEmail(mailSubject, body, functionName) {
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
                    to: process.env.SMTP_RECEIVER,
                    subject: process.env.stage + "-" + mailSubject,
                    html: body,
                },
                (error, info) => {
                    if (error) {
                        resolve(error)
                    }
                    //console.info("Email sent : \n", JSON.stringify(info));
                    INFO(functionName,info)
                    resolve(info)
                }
            );
            return true;
        } catch (error) {
            //console.error("Error : \n", error);
            ERROR(functionName, error, 500)
            return false;
        }
    })
}
module.exports = { sendEmail }

