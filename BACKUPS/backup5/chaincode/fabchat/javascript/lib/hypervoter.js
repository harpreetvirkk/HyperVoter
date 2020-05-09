/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;

// const date = require('date-and-time');
let votestart = false;
let endTime;

// voteId of last voteObj that was created
let voteId = -1;
// list of voters
let voters = [];

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
                    vote = JSON.parse(res.value.value.toString('utf8'));
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

        let voterId = sendTo;
        let ownerId  = voterId;
        voteId +=1;

        console.log('New vote object created:\n');
        console.log(`VoterId : ${voterId}`);
        console.log(`VoteId : ${voteId}`);
        
        let hasVoted = false;

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

    async setEndTime(ctx, endTimeVal){
        console.info('============== START : setEndTime ============');
        let current = new Date();
        console.log(current.toString());
        current = current.setTime(current.getTime()+ parseInt(endTimeVal)*60*1000);
        endTime = new Date(current);
        console.log("End time:");
        console.log(endTime.toString());
        
        votestart = true;
        // console.info(`End Time: ${endTime}`)
        console.info('============== END : setEndTime ============');
    }

    async sendVoteObj(ctx, userId, sendTo){
        console.info('============== START : sendVoteObj ============');
        let current = new Date();
        
        if(votestart!= true){
            
            return "0";
        }

        if(current.getTime()>endTime.getTime()){
            return "1";
        }

        let cid = new ClientIdentity(ctx.stub);
        let vId = cid.getID();
        let voterId = userId;

        // if (voterId!=userId){
        //     throw new Error('Your input VoterId and Client Voter Id does not match!');
        // }

        const startKey = '0';
        const endKey = '99999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        while(true){
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {

                const Key = res.value.key;
                let vote;
                try{
                    vote = JSON.parse(res.value.value.toString('utf8'));
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
        // console.log(`VoterId : ${voterId}`);
        console.log(`VoteId : ${voteId}`);
        console.log(`OwnerId : ${sendTo}`);
        console.log('Please note your VoteId for query purposes later!');

        // let voteInfo = {"VoterId" : voterId, "VoteId": voteId, "CandidateId" : sendTo};

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

        await ctx.stub.putState(voteId, Buffer.from(JSON.stringify(vote)));

        console.info('============== END : sendVoteObj ============');
        return "2";
    }   

    async getResults(ctx){
        console.info('============= START : getResults ===========');
        const startKey = '0';
        const endKey = '99999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        let candidates = [];
        
        while(true){
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                let vote;
                try{
                    vote = JSON.parse(res.value.value.toString('utf8'));

                    if (vote.hasVoted == true){
                        // Candidate not already in list
                        if (!(candidates.some(item => item.candidateId == vote.ownerId))){
                            let newCandidate = {"candidateId": vote.ownerId, "voteCount":1};
                            candidates.push(newCandidate);
                        } else {
                            for (let i = 0; i<candidates.length; i++){
                                if (vote.ownerId == candidates[i].candidateId){
                                    candidates[i].voteCount +=1;
                                }
                            }
                        }
                    }
                } catch (err){
                console.log(err);
                vote = res.value.value.toString('utf8');
                }
            }
            if (res.done){
                await iterator.close();
                console.info('============= RESULTS: =============');
                console.info(candidates);
                console.info('============= END : getResults ===========');
                break;
            }
        }
        return JSON.stringify(candidates);
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
                const Key = res.value.key;
                let vote;
                try{
                    vote = JSON.parse(res.value.value.toString('utf8'));
                } catch (err){
                console.log(err);
                vote = res.value.value.toString('utf8');
                }
                if (vote.hasVoted == true){
                    allResults.push({Key, vote});
                }
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