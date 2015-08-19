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

rl.on('SIGINT', function() {
    rl.question('Are you sure you want to exit?', function(answer) {
        if (answer.match(/^y(es)?$/i)) rl.pause();
    });
});

function requestData (url, data, method) {
    return new Promise(function (resolve, reject) {
        request({
            url: url,
            qs: data,
            method: method,
            encoding: "utf-8"
        }, function (error, response, body) {
            if(error) {
               reject(error);
            } else if (!error && response.statusCode === 200) {
                resolve(body);
            }
        });
    });
}

function readCompanyData () {
    return new Promise(function (resolve, reject) {
        fs.readFile('./deliver_company.json', function (err, data) {
            if (err) {
                reject(err);
            }
            resolve(JSON.parse(data));
        });
    });
}

function getInterfaceInput (msg, reg, errorMsg) {
    return new Promise(function (resolve) {
        rl.question(msg, function (str) {
            if (! reg.test(str)) {
                stdout.print(errorMsg);
                getInterfaceInput(msg, reg, errorMsg);
            } else {
                resolve(str);
            }
        });
    });
}

function* genExpressInfo () {

    try {
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
        let id = yield getInterfaceInput('please choose your package\'s company id: ', checkId, 'wrong Id');

        let data = yield requestData(URL.getDeliverInfo, {
            type: companys[id].comCode,
            postid: code
        }, 'GET');

        let expressData = JSON.parse(data);
        if (expressData.status == 200) {
            prettyPrint(expressData.data, prettyPrintConfig);
        } else {
            stdout.write('express info error');
        }


        rl.close();

    } catch (e) {
        console.log('Error: ' + e);
        process.exit(0);
    }
}

function run (generator) {
    var it = generator();

    function go(result) {
        if (result.done) return result.value;
        return result.value.then(function (value) {
            return go(it.next(value));
        }, function (error) {
            return go(it.throw(error));
        });
    }

    go(it.next());
}


run(genExpressInfo);