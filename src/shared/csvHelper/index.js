const SFTPCLIENT = require('ssh2').Client;
const { sendEmail } = require('../sendEmail/index');
const { log } = require('../utils/logger');

async function uploadCsv(rowsToCsv, today, functionName) {
    return new Promise((resolve, reject) => {
        // let filePath = 'EDI/214/Omni_214_' + today + '.csv';
        let s3FileStreamContent = rowsToCsv;
        let connSettings = {
            host: process.env.SFTP_HOST,
            port: process.env.SFTP_PORT,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASSWORD
        };
        let conn = new SFTPCLIENT();
        conn.on('ready', function () {
            log.INFO(functionName, "Connection ready..");
            conn.sftp(async function (err, sftp) {
                if (err) {
                    log.ERROR(functionName, err, 500);
                    let mailSubject = "Corsair File Failed To Upload";
                    let mailBody = `Hello, <br><br> Getting error in connection of SFTP. File ${filePath} uploading failed.<br>Thanks.<br>`;
                    await sendEmail(mailSubject, mailBody, functionName,process.env.SMTP_FAILER);

                    reject(err);
                } else {
                    let options = Object.assign({}, {
                        encoding: 'utf-8'
                    }, true);
                    log.INFO(functionName, filePath);
                    let stream = sftp.createWriteStream(filePath, options);
                    let data = stream.end(s3FileStreamContent);
                    stream.on('close', async function () {
                        log.INFO(functionName, "File Transferred To SFTP Succesfully");
                        conn.end();
                        let mailSubject = "Corsair File Transferred To SFTP Succesfully";
                        let mailBody = `Hello, <br><br> File transferred to SFTP successfully. you can get file in ${filePath} path.`;
                        await sendEmail(mailSubject, mailBody, functionName,process.env.SMTP_SUCCESS);
                        resolve('file Uploaded')
                    });
                }
            });
        }).connect(connSettings);
    });
}

async function convertToCSV(rows) {
    const array = [Object.keys(rows[0])].concat(rows);
    return array.map(it => {
        return Object.values(it).toString()
    }).join('\n')
}

module.exports = { uploadCsv, convertToCSV }