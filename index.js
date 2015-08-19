#!/usr/bin/env node

/**
 * Created by andycall on 15/8/18.
 */

'use strict';

const stdout = process.stdout;
const stdin = process.stdin;
const exec = require('child_process').exec;
const request = require('request');
const readline = require('readline');
const fs = require('fs');
const URL = {
    getCompany: 'http://www.kuaidi100.com/autonumber/autoComNum',
    getDeliverInfo: 'http://www.kuaidi100.com/query'
};

const prettyPrint = require('pretty-print');

const prettyPrintConfig = {
    key: 'time',
    value: 'context'
};


var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function requestData (url, data, method) {
    request({
        url: url,
        qs: data,
        method: method,
        encoding: "utf-8"
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            gen.next(body);
        }
    });
}

function readCompanyData () {
    fs.readFile('./deliver_company.json', function (err, data) {
        if (err) {
            throw err;
        }
        gen.next(JSON.parse(data));
    });

}

function getInterfaceInput (msg, reg, errorMsg) {
    rl.question(msg, function (str) {
        if (! reg.test(str)) {
            stdout.print(errorMsg);
            getInterfaceInput(msg, reg, errorMsg);
        } else {
            gen.next(str);
        }
    });
}

function* genExpressInfo () {
    let checkCode = /^\d{1,15}$/;
    let code = yield getInterfaceInput ('please enter your express code: \n', checkCode, 'wrong express code');
    //let code = 600118120686;
    let body = yield requestData(URL.getCompany, {text: code}, 'GET');

    let companyInfo = JSON.parse(body);
    let companyData = yield readCompanyData();

    let companys = [];
    for (let company of companyData.company) {
        for (let suggest of companyInfo.auto) {
            if (suggest.comCode === company.code) {
                companys.push({
                    comCode: company.code,
                    companyname: company.companyname
                });
            }
        }
    }

    for (let i = 0, len = companys.length; i < len; i ++) {
        stdout.write(i + ": " + companys[i].companyname + '\n');
    }
    stdout.write('\n');
    stdout.write('ID: ');

    let checkId = /\d/;
    let id = yield getInterfaceInput('please choose your package\'s company id...\n', checkId, 'wrong Id');

    let data = yield requestData(URL.getDeliverInfo, {
        type: companys[id].comCode,
        postid: code
    }, 'GET');

    prettyPrint(JSON.parse(data).data, prettyPrintConfig);

    rl.close();
}

var gen = genExpressInfo();
gen.next();