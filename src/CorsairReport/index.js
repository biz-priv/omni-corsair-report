const { send_response } = require('../shared/utils/responses');
const { Client } = require("pg");
const { uploadCsv, convertToCSV } = require('../shared/csvHelper/index');
const { log } = require('../shared/utils/logger');

let functionName = "";
module.exports.handler = async (event, context) => {
    functionName = context.functionName;
    log.INFO(functionName, { Event: JSON.stringify(event) });
    const client = new Client({
        database: process.env.DB_DATABASE,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });
    try {
        await client.connect();
        const currentDate = new Date().toISOString().substr(0,10);
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
        left(r.ref,240) as "PO#",`
        + sqlRegex + ` AS "Shipper Name",
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
        a.file_nbr,
        CHRG_WGHT_KGS AS "Gross Weight",
        '' AS "Chargeable Weight",
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
        to_char(a.SCHD_DELV_DATE , 'MM/DD/YYYY HH:MM') as "Estimated Delivery Date",
        `+ sqlRegex5 + ` as "Appointment number",
        to_char(app.app_date, 'MM/DD/YYYY HH:MM') as "Appointment Date",
        to_char(del.EVENT_dATE_UTC, 'MM/DD/YYYY HH:MM') as "Actual Delivered Date"
        from
        (select * FROM shipment_info A  where
        a.FILE_dATE >= '2017-12-30'
        --and HOUSE_BILL_NBR <> '0'
        and A.BILL_TO_NBR  = '17925'
        and source_SYSTEM = 'WT' and file_nbr not in ('3935974','3991507','3991506','3884577','4038662','3991509','4047280','3898701','3898706','3884582','3991508','3991510',
        '4534851','4543632','4589440','4517782','4543630','4542736','4663770','4560374','4542723','4534853','4533930','4543114','4551951','4542730')
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
        (select distinct file_nbr ,REF_NBR  from  shipment_ref where ref_typeid = 'APD' and source_SYSTEM = 'WT' )appno
        on a.FILE_NBR = appno.FILE_NBR
        left outer join
        (select file_nbr ,listagg (descr,',')  within group (order by file_nbr)descr,
        listagg (note,',')  within group (order by file_nbr)note
        from
        service_failure
        where source_system = 'WT'
        group by file_nbr )sf
        on a.file_nbr = sf.file_nbr
        where a.FILE_dATE < '`+ currentDate +`'
        and a.FILE_dATE >= '2023-01-01'
        and A.BILL_TO_NBR  = '17925'
        and a.current_status <> 'CAN'
        and HOUSE_BILL_NBR  <> 0`;

        let response = await client.query(sqlQuery);
        let rows = response['rows'];
        log.INFO(functionName, rows.length);
        let rowsToCsv = await convertToCSV(rows);
        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();
        today = mm + dd + yyyy;
        await client.end();

        let uploadCsvFile = await uploadCsv(rowsToCsv, today, functionName);
        log.INFO(functionName, uploadCsvFile);
        return send_response(200);
    } catch (error) {
        console.error("Error : \n", error);
        log.ERROR(functionName, error, 500);
        send_response(400, error);
    }
}

