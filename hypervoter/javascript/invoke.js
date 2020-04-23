/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {FileSystemWallet, Gateway} = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);
// let user, choice, msg, emailID;

// process.argv.forEach(function (val, index, array) {
//     // console.log(index + ': ' + val);
//     choice = array[2];
//     msg = array[3];
//     user = array[4];
//     emailID = array[5];
// });
