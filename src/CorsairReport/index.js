const { send_response } = require('../shared/utils/responses');
const { Client } = require("pg");
const aws = require('aws-sdk');
const nodemailer = require("nodemailer");
const ObjectsToCsv = require('objects-to-csv')
const fs = require('fs')
var sftpClient = require('ssh2').Client;
const { resolve } = require('path');


// function send_email(transporter, today) {
//     return new Promise((resolve, reject) => {
//         transporter.sendMail(
//             {
//                 from: process.env.SMTP_SENDER,
//                 to: process.env.SMTP_RECEIVER,
//                 subject: "Corsair Report",
//                 text: "Please check the attachment for report",
//                 html: "<b>Please check the attachment for report</b>",
//                 attachments: [
//                     {
//                         filename: 'Omni_214_' + today + '.csv',
//                         path: '/tmp/data.csv'
//                     },
//                 ],
//             },
//             (error, info) => {
//                 if (error) {
//                     fs.unlinkSync('/tmp/data.csv')
//                     console.error("Error occurred : \n" + JSON.stringify(err));
//                     reject(err)
//                 }
//                 fs.unlinkSync('/tmp/data.csv')
//                 console.info("Email sent : \n", JSON.stringify(info));
//                 resolve(info)
//             }
//         );
//     })
// }

function uploadCsv(rowsToCsv,today) {
    return new Promise((resolve, reject) => {
        const filePath = 'EDI/214/Omni_214_' + today + '.csv';
        const s3FileStreamContent = rowsToCsv;
        var connSettings = {
            host: 'files.corsair.com',
            port: 22,
            username: 'omni',
            password: 'uTodA1A#XQwfazH'
        };
        var conn = new sftpClient();
        conn.on('ready', function () {
            conn.sftp(function (err, sftp) {
                if (err) {
                    console.log("Errror in connection", err);
                } else {
                    console.log("Connection established");
                    var options = Object.assign({}, {
                        encoding: 'utf-8'
                    }, true);
                    var stream = sftp.createWriteStream(filePath, options);
                    var data = stream.end(s3FileStreamContent);
                    stream.on('close', function () {
                        console.log("- file transferred succesfully");
                        conn.end();
                    });
                }
            });
        }).connect(connSettings);
        resolve('file Uploaded')
    })
}

function convertToCSV(rows) {
        const array = [Object.keys(rows[0])].concat(rows)
  
        return array.map(it => {
          return Object.values(it).toString()
        }).join('\n')    
  }

module.exports.handler = async (event) => {
    console.info("Event: \n", JSON.stringify(event));

    const client = new Client({
        database: process.env.DB_DATABASE,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();
        const sqlRegex = "regexp_replace(shipPER_NAME,'[./,@#!$%^&*;:{}=_`~()-]','')";
        const sqlRegex1 = "regexp_replace(consignee_name,'[./#@,!$%^&*;:{}=_`~()-]','')";
        const sqlRegex2 = "regexp_replace(consignee_Addr_1 ,'[./#@,!$%^&*;:{}=_`~()-]','')";
        const sqlRegex3 = "regexp_replace(consignee_name ,'[./#@,!$%^&*;:{}=_`~()-]','')";
        const sqlRegex4 = "regexp_replace(consignee_addr_1 ,'[./#@,!$%^&*;:{}=_`~()-]','')";
        const sqlRegex5 = "regexp_replace(appno.ref_NBR ,'[.@,/#!$%^&*;:{}=_`~()-]','')";
        const sqlRegex6 = "regexp_replace(commentS ,'[.@,/#!$%^&*;:{}=_`~()-]','') = ''";
        const sqlRegex7 = "regexp_replace(A.COMMENTS ,'[.@,/#!$%^&*;:{}=_`~()-]',''),','";
        const sqlRegex8 = "regexp_replace(REF_NBR,'[./@#!$%^&*;:{}=_`~()-]',''),',',' / '),'/'";
        const sqlQuery = `select distinct
            '214' as "EDI DOC",
            'OMNI' as "Forwarder Name",
            case when SHIPMENT_MODE = 'Ground' then 'Truck' else SHIPMENT_MODE end as "Mode",
            '' as Incoterms,
            '' as "Freight Term",
            '' as "Delivery lD",
            r.ref as "PO#",`
            + sqlRegex + `  AS "Shipper Name",
            shipper_city AS "Shipper City",
            shipper_st AS "Shipper State",
            shipper_zip AS "Shipper Zip Code",
            shipper_cntry AS "Shipper Country",
            ` + sqlRegex1 + ` AS "Consignee Name",
            ` + sqlRegex2 + `AS "Consignee Address",
            consignee_city AS "Consignee City",
            consignee_st AS "Consignee STATE",
            consignee_zip  AS "Consignee Zip Code",
            consignee_Cntry AS "Consignee Country",
            ` + sqlRegex3 + `AS "Final Delivery NAME",
            `+ sqlRegex4 + `AS "Final Delivery ADDRESS",
            consignee_city AS "Final Delivery City",
            consignee_st AS "Final Delivery STATE",
            consignee_zip  AS "Final Delivery Zip Code",
            consignee_cntry AS "Final Delivery Country",
            '' as "Equpipment type",
            '' as "No. of Container(s) (Ocean Only)",
            '' as "Carrier Name",
            ORIGIN_PORT_IATA AS "Airport / Port of Origin",
            DESTINATION_PORT_IATA AS "Airport / Port of Destination",
            '' AS "MAWB/MOBL",
            HOUSE_BILL_NBR  AS "HAWB/HOBL",
            '' AS "Gross Weight",
            CHRG_WGHT_KGS AS "Chargeable Weight",
            ''as CBM,
            PIECES as "No. of Pallet(s)",
            '' as "No. of Boxes",
            ''  AS "Booking Date",
            '' "Requested Pick up Date",
            to_char(pup.EVENT_dATE_UTC, 'MM/DD/YYYY HH:MM')AS "Actual Pick up Date",
            '' as "SO Released Date",
            '' as "Shipping Docs Received Date",
            '' as "Date Delivered at Airport / Port",
            to_char(cob.EVENT_dATE_UTC, 'MM/DD/YYYY HH:MM')as "ETD Origin Airport / Port",
            '' as "ATD Origin Airport / Port",
            to_char(cob.EVENT_dATE_UTC , 'MM/DD/YYYY HH:MM')as "On Board Date (As Per BOL)",
            to_char(aad.EVENT_dATE_UTC , 'MM/DD/YYYY HH:MM') as "ETA Destination Airport / Port",
            '' as "ATA Destination Airport / Port",
            '' as "Date Docs Turnover to Custom Broker",
            '' AS "Custom Release Date",
            '' as "Call for APPT Date",
            to_char(a.SCHD_DELV_DATE , 'MM/DD/YYYY HH:MM') as "Estimated Delivery Date", 
            `+ sqlRegex5 + ` as "Appointment number",
            to_char(app.app_date, 'MM/DD/YYYY HH:MM') as "Appointment Date",
            to_char(del.EVENT_dATE_UTC, 'MM/DD/YYYY HH:MM') as "Actual Delivered Date",
            SDE.EVENT_dATE_UTC as "Delay Reason",
            case when `+ sqlRegex6 + ` then 
            (case when pod.FILE_NBR is not null then 'POD has been uploaded to FTP' else ' waiting on trucker to submit' end)
            else 
            concat(concat(`+ sqlRegex7 + `),
            case when pod.FILE_NBR is not null then ' POD has been uploaded to FTP' else 'waiting on trucker to submit' end )
            end as "Comment"
            from 
            (select * FROM shipment_info A  where 
            a.FILE_dATE >= '2017-12-30'
            --and HOUSE_BILL_NBR = '3658652'
            and A.BILL_TO_NBR  = '17925'
            and source_SYSTEM = 'WT'
            )A
            LEFT OUTER JOIN 
            (SELECT distinct file_nbr ,ORDER_sTATUS,EVENT_dATE_UTC FROM shipment_milestone
            WHERE ORDER_STATUS in ('DEL')and source_system= 'WT'
            )del
            ON A.file_nbr = del.file_nbr
            left outer join 
            (SELECT distinct file_nbr ,ORDER_sTATUS,EVENT_dATE_UTC FROM shipment_milestone
            WHERE ORDER_sTATUS in ('PUP')and source_system= 'WT'
            )pup
            ON A.file_nbr = pup.file_nbr
            left outer join
            (SELECT distinct file_nbr ,ORDER_sTATUS,EVENT_dATE_UTC FROM shipment_milestone
            WHERE ORDER_sTATUS in ('COB')and source_system= 'WT'
            )cob
            ON A.file_nbr = cob.file_nbr
            left outer join
            (SELECT distinct file_nbr ,ORDER_sTATUS,EVENT_dATE_UTC FROM shipment_milestone
            WHERE ORDER_sTATUS in ('AAD')and source_system= 'WT'
            )aad
            ON A.file_nbr = aad.file_nbr
            LEFT OUTER JOIN 
            (SELECT distinct file_nbr ,ORDER_sTATUS,EVENT_dATE_UTC FROM shipment_milestone
            WHERE ORDER_sTATUS in ('SDE') and source_system= 'WT'
            )SDE
            ON A.file_nbr = SDE.file_nbr
            left outer join
            (SELECT distinct file_nbr ,ORDER_sTATUS,EVENT_dATE_UTC FROM shipment_milestone
            WHERE ORDER_sTATUS in ('POD') and source_system= 'WT'
            )pod
            ON A.file_nbr = pod.file_nbr
            left outer join 
            (
            select distinct FILE_NBR,
            listagg(distinct replace(`+ sqlRegex8 + `) within group (order by pk_Ref_nBR)as ref
            from shipment_ref sr 
            where 
            ref_typeid = 'PO'
            and source_SYSTEM = 'WT'
            group by FILE_NBR
            )r
            on a.FILE_NBR = r.FILE_NBR
            left outer join 
            (select distinct FILE_NBR,app_date,timezone from schedule_app 
            where type = 'D'
            and source_SYSTEM = 'WT'
            )app
            on a.FILE_NBR = app.FILE_NBR
            left outer join 
            (select distinct file_nbr ,REF_NBR
            from  shipment_ref
            where 
            ref_typeid = 'APD'
            and source_SYSTEM = 'WT'
            )appno
            on a.FILE_NBR = appno.FILE_NBR
            where a.FILE_dATE >= '2017-12-30'
            --and HOUSE_BILL_NBR = '3658652'
            and A.BILL_TO_NBR  = '17925'`;

        const response = await client.query(sqlQuery)
        const rows = response['rows']
        // const csv = new ObjectsToCsv(response['rows'])
        const rowsToCsv = await convertToCSV(rows);
        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        today = mm + dd + yyyy;

        // await csv.toDisk('/tmp/data.csv')
        await client.end();

        // const transporter = nodemailer.createTransport({
        //     host: process.env.SMTP_HOST,
        //     port: process.env.SMTP_PORT,
        //     auth: {
        //         user: process.env.SMTP_USER,
        //         pass: process.env.SMTP_PASSWORD,
        //     },
        // });

        const uploadCsvFile = await uploadCsv(rowsToCsv,today)
        return send_response(200)
    } catch (error) {
        console.error("Error : \n", error);
        send_response(400, error);
    }
}

