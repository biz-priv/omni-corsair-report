const SFTPCLIENT = require('ssh2').Client;

async function uploadCsv(rowsToCsv, today) {
    return new Promise((resolve, reject) => {
        let filePath = 'EDI/214/Omni_214_' + today + '.csv';
        let s3FileStreamContent = rowsToCsv;
        let connSettings = {
            host: process.env.SFTP_HOST,
            port: process.env.SFTP_PORT,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASSWORD
        };
        let conn = new SFTPCLIENT();
        conn.on('ready', function () {
            console.info("Connection ready..");
            conn.sftp(function (err, sftp) {
                if (err) {
                    console.error("Error In Connection. File Uploading Failed", err);
                    reject(err);
                } else {
                    let options = Object.assign({}, {
                        encoding: 'utf-8'
                    }, true);
                    console.info("File Transferring to path : " + filePath);
                    let stream = sftp.createWriteStream(filePath, options);
                    let data = stream.end(s3FileStreamContent);
                    stream.on('close', function () {
                        console.info("File Transferred To SFTP Succesfully");
                        conn.end();
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