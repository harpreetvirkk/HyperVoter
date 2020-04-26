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
let voteId, voterId;

process.argv.forEach(function (val, index, array) {
    // console.log(index + ': ' + val);
    voteId = array[2];
    voterId = array[3];
});

async function main() {
    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const voterExists = await wallet.exists(voterId);
        if (!voterExists) {
            console.log(`An identity for the voter ${voterId} does not exist in the wallet`);
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: voterId, discovery: {enabled: false}});

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('hypervoter');

        // Evaluate the specified transaction.
        // queryMsg transaction - requires 1 argument, ex: ('queryMsg', 'MSG0')
        // queryAllMsgs transaction - requires no arguments, ex: ('queryAllMsgs')
        if (voteId == '-1') {
            const result = await contract.evaluateTransaction('queryAllVotes');
            console.log(`TransactionTypeAll has been evaluated, result is: ${result.toString()}`);
        } else {
            const result = await contract.evaluateTransaction('queryVote', voteId);
            console.log(`TransactionTypeID has been evaluated, result is: ${result.toString()}`);
        }

    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        process.exit(1);
    }
}

main();
