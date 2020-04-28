/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;

// voteId of last voteObj that was created
let voteId = -1;
// list of voters
let voters = [];
let voterId, ownerId;
let hasVoted;

//date and time
const date = require('date-and-time');
let votestart = false;
let endTime = new Date();

class HyperVoter extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const startKey = '0';
        const endKey = '99999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        while(true){
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                let vote;
                try{
                    vote = JSON.parse(res.value.value.toString());
                        // update voters array and voteId
                    if (vote.hasVoted === false){
                        voters.push(vote.ownerId);
                    }
                    voteId +=1;
                } catch (err){
                console.log(err);
                vote = res.value.value.toString('utf8');
                }
            }
            if (res.done){
                await iterator.close();
                console.log(`voters: ${voters}`);
                console.log(`numVoters: ${voters.length}`);
                console.log(`lastVoteID: ${voteId}`);
                break;
            }
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async createVoteObj(ctx, sendTo){
        console.info('============= START : createVoteObj ===========');

        let cid = new ClientIdentity(ctx.stub);
        let EC_ID = cid.getID();

        voterId = sendTo;
        ownerId  = voterId;
        voteId +=1;

        console.log('New vote object created:\n');
        console.log(`VoterId : ${voterId}`);
        console.log(`VoteId : ${voteId}`);
        
        hasVoted = false;

        const vote = {
            ownerId,
            hasVoted,
        };
        // if new voter, add voter to voter array
        if (!(voters.includes(voterId))) {
            console.log(`New Voter! Added to voters array.`);
            voters.push(voterId);
        }

        await ctx.stub.putState(voteId.toString(), Buffer.from(JSON.stringify(vote)));
        console.info('============== END : createVoteObj ============');
    }

    async setTime(ctx, sendTo){
        console.info('============== START: setTime ==============');
        votestart = true;
        const now = new Date();
        const Indian = new Date(now.getTime()+ 3600000*5.5);
        endTime = date.addMinutes(Indian, parseInt(sendTo));
        console.log(`End Time: ${endTime}`);
        console.info('============== END: setTime ==============');

    }

    async sendVoteObj(ctx, userId, sendTo){
        console.info('============== START : sendVoteObj ============');
        const now = new Date();
        const Indian = new Date(now.getTime()+ 3600000*5.5);
        if (votestart!=true){
            console.log('Sorry, voting has not started. Pleas come back later.');
        } 

        if (Indian>endTime){
            console.log('Sorry, voting has ended.');

        }

        else{
        let cid = new ClientIdentity(ctx.stub);
        let vId = cid.getID();
        let voterId = userId;

        const startKey = '0';
        const endKey = '99999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        while(true){
            const res = await iterator.next();
            //console.log(`res : ${res}`);
            if (res.value && res.value.value.toString()) {

                const Key = res.value.key;
                //console.log(`Key : ${Key}`);
                let vote;
                try{
                    vote = JSON.parse(res.value.value.toString('utf8'));
                    //console.log(`vote : ${vote}`);
                    if (vote.ownerId == voterId){
                        voteId = Key;
                        break;
                    }
                } catch (err){
                    console.log("VoterId not found, maybe you have not registered or already voted! Detailed Error:")
                    console.log(err);
                    vote = res.value.value.toString('utf8');
                }
            }
        }
        console.log('Casting your vote:\n');
        console.log(`VoterId : ${voterId}`);
        console.log(`VoteId : ${voteId}`);
        console.log(`CandidateId : ${sendTo}`);
        console.log('Please note your VoteId for query purposes later!');

        // get the vote from chaincode state
        const voteAsBytes = await ctx.stub.getState(voteId); 
        if (!voteAsBytes || voteAsBytes.length === 0) {
            throw new Error(`${voteId} associated with your account does not exist, you could have already voted!`);
        }
        let vote = JSON.parse(voteAsBytes.toString());

        if (vote.hasVoted != true){
            vote.ownerId = sendTo;
            vote.hasVoted = true;
        } else {
            throw new Error('You have already voted! You cannot vote again.');
        }
        console.log(`voteId ${voteId} casted successfully!`);

        await ctx.stub.putState(voteId, Buffer.from(JSON.stringify(vote)));}

        console.info('============== END : sendVoteObj ============');
    }   

    async queryVote(ctx, voteId){
        console.info('============= START : queryVote ===========');
        console.log(`voteId: ${voteId}`);

        // get the vote from chaincode state
        const voteAsBytes = await ctx.stub.getState(voteId); 
        if (!voteAsBytes || voteAsBytes.length === 0) {
            throw new Error(`${voteId} does not exist!`);
        }
        let vote = JSON.parse(voteAsBytes.toString());
        console.log(vote);

        console.info('============= END : queryVote ===========');
        return JSON.stringify(vote);
    }

    async queryAllVote(ctx){
        console.info('============= START : queryAllVote ===========');
        const startKey = '0';
        const endKey = '99999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];

        while(true){
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                const VoteId = res.value.key;
                let vote;
                try{
                    vote = JSON.parse(res.value.value.toString('utf8'));
                } catch (err){
                console.log(err);
                vote = res.value.value.toString('utf8');
                }
                allResults.push({VoteId, vote});
            }

            if (res.done){
                await iterator.close();
                console.info(allResults);
                console.info('============= END : queryAllVote ===========');
                return JSON.stringify(allResults);
            }
        }
    }
}

module.exports = HyperVoter;