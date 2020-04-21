/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');

const ClientIdentity = require('fabric-shim').ClientIdentity;

class HyperVoter extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        
        console.info('============= END : Initialize Ledger ===========');
    }

}

module.exports = HyperVoter;