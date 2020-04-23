/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');

const ClientIdentity = require('fabric-shim').ClientIdentity; //IS THIS NEEDEED??

//Global Variables here:
let voteID = -1; // msgID of last msg that was posted

const fs = require('fs')
let rawdata_vote = fs.readFileSync('student.json');
let rawdata_voters = fs.readFileSync('voters.json');

let voters = JSON.parse(rawdata_voters);

class HyperVoter extends Contract {

    async initLedger(ctx){
        console.info('============= START : Initialize Vote Ledger ===========');
        let voteObjs = JSON.parse(rawdata_vote);
        for (let i = 0; i < voteObjs.length; i++){
            voteObjs[i].docType = 'vote';
            voteId = 'VOTE'+i;
            await ctx.stub.putState(voteId.toString(), Buffer.from(JSON.stringify(voteObjs[i])));
            console.info('Added <--> ', voteObjs[i]);
        }
        console.info('============== END : Initialize Vote Ledger ============');
    }

    async sendVoteObj(ctx, voteId, voterId, voterPin, candidateId){
        console.info('============= START : sendVoteObj ===========');
        
        const voteAsBytes = await ctx.stub.getState(voteId); // get the vote from chaincode state
        // if (use ^^^voters here) {
        //     throw new Error(`${voterId} and ${voterPin} does not match!`);
        // }
        if (!voteAsBytes || voteAsBytes.length === 0) {
            throw new Error(`${voteId} does not exist`);
        }
        const vote = JSON.parse(voteAsBytes.toString());
        if (vote.isUsed == "True"){
            throw new Error(`${voteId} has already been voted! Cannot Reuse!`);
        }
        vote.ownerId = candidateId.toString();
        vote.isUsed = "True";
        await ctx.stub.putState(voteId.toString(), Buffer.from(JSON.stringify(vote)));
        //Only  voter  accounts should be able to use this
        console.info('============== END : sendVoteObj ============');
    }

    async queryVoteObj(ctx, voteID){
        console.info('============= START : queryVoteObj ===========');

        // Add code here

        console.info('============== END : queryVoteObj ============');
    }  
    
    //MORE:
    // QueryAllVotes
    // QueryNumberOfVotesbyCandidate
    // QueryNumberOfVotesVoted && NotVoted
    

}

module.exports = HyperVoter;