/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {FileSystemWallet, Gateway} = require('fabric-network');
const fs = require('fs');
const path = require('path');

let rawdata_voters = fs.readFileSync('voters.json');
let voters_list = JSON.parse(rawdata_voters);

const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);
let userId, choice, userPin, sendTo;

process.argv.forEach(function (val, index, array) {
    // console.log(index + ': ' + val);
    choice = array[2];
    userId = array[3];
    userPin = array[4];
    sendTo = array[5];
});

async function main(){
    try{

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists(userId);
        if (!userExists) {
            console.log(`An identity for the user ${userId} does not exist in the wallet`);
            console.log('Run the registerVoter.js or registerEC.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: userId, discovery: {enabled: false}});

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('hypervoter');

        // Submit the specified transaction.
        // createVoteObj transaction -
        // sendVoteObj transaction -
        if (userId == 1){
            if (userPin != 54321){
                console.log('Identity Not Verified for the voter. Incorrect Pin!');
                return
            } else {
                console.log("Identity Verified!\n");
                if (choice === 'createVoteObj'){
                    await contract.submitTransaction('createVoteObj', sendTo);
                } else {
                    console.log("Invalid transaction type, or you do not have access!\n");
                }
            }
        } else{
            for (let i = 0; i<voters_list.length; i++){
                if (voters_list[i].voterId == userId){
                    if (voters_list[i].pin != pin_val){
                        console.log('Identity Not Verified for the voter. Incorrect Pin!');
                        return;
                    } else {
                        console.log("Identity Verified!\n");
                    }
                }
            }
            if (choice === 'sendVoteObj'){
                await contract.submitTransaction('sendVoteObj', userId, sendTo);
            } else {
                console.log("Invalid transaction type, or you do not have access!\n");
            }
        }

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}
main();
