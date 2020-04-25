/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {FileSystemWallet, Gateway, X509WalletMixin} = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', '..', 'basic-network', 'connection.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);
let pin_val;

process.argv.forEach(function (val, index, array) {
    pin_val = array[2];
});
let EC_ID = 0;
async function main() {
    try {
        if (pin_val != 54321){
            console.log("Identity Not Verified for the EC. Incorrect Pin!\n");
            return;
        }
        console.log("Identity Verified!\n");
        
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the EC.
        const EC_Exists = await wallet.exists(EC_ID);
        if (EC_Exists) {
            console.log(`An identity for the EC already exists in the wallet`);
            return;
        }

        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists('admin');
        if (!adminExists) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('Run the enrollAdmin.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {wallet, identity: 'admin', discovery: {enabled: false}});

        // Get the CA client object from the gateway for interacting with the CA.
        const ca = gateway.getClient().getCertificateAuthority();
        const adminIdentity = gateway.getCurrentIdentity();

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: EC_ID,
            role: 'client'
        }, adminIdentity);
        const enrollment = await ca.enroll({enrollmentID: EC_ID, enrollmentSecret: secret});
        const userIdentity = X509WalletMixin.createIdentity('Org1MSP', enrollment.certificate, enrollment.key.toBytes());
        wallet.import(EC_ID, userIdentity);
        console.log(`Successfully registered and enrolled EC with enrollment ID 0 and imported it into the wallet`);

    } catch (error) {
        console.error(`Failed to register EC: ${error}`);
        process.exit(1);
    }
}

main();
