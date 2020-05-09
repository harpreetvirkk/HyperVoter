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
let hasVotedList = [];

class HyperVoter extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const startKey = '0';
        const endKey = '9999';
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
        // let EC_ID = cid.getID();

        let voterId = sendTo;
        let ownerId  = voterId;
        voteId +=1;

        console.log('New vote object created:\n');
        console.log(`OwnerId : ${voterId}`);
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
        return endTime.toString();
    }

    async sendVoteObj(ctx, userId, sendTo){
        console.info('============== START : sendVoteObj ============');
        let current = new Date();
        
        if(votestart!= true){
            console.info('============== END : sendVoteObj ============');
            return "0";
        }
        if(current.getTime()>endTime.getTime()){
            console.info('============== END : sendVoteObj ============');
            return "1";
        }
        // let hasVotedList = [];

        let voterId = userId;
        let voteObjId = -1;
        const startKey = '0';
        const endKey = '9999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        for (let i = 0; i<hasVotedList.length; i++){
            if (hasVotedList[i] == voterId){
                console.info('Voter has already voted!');
                console.info('============== END : sendVoteObj ============');
                return "3";
            }
        }
        hasVotedList.push(voterId);

        while(true){
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {

                const Key = res.value.key;
                let vote;
                try{
                    vote = JSON.parse(res.value.value.toString('utf8'));
                    if (vote.ownerId == voterId){
                        voteObjId = Key;
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
        console.log(`VoteId : ${voteObjId}`);
        console.log(`OwnerId : ${sendTo}`);
        console.log('Please note your VoteId for query purposes later!');

        // let voteInfo = {"VoterId" : voterId, "VoteId": voteId, "CandidateId" : sendTo};

        // get the vote from chaincode state
        const voteAsBytes = await ctx.stub.getState(voteObjId); 
        if (!voteAsBytes || voteAsBytes.length === 0) {
            throw new Error(`${voteObjId} associated with your account does not exist, you could have already voted!`);
        }
        let vote = JSON.parse(voteAsBytes.toString());

        if (vote.hasVoted != true){
            vote.ownerId = sendTo;
            vote.hasVoted = true;
        } else {
            throw new Error('You have already voted! You cannot vote again.');
        }
        console.log(`voteId ${voteObjId} casted successfully!`);

        await ctx.stub.putState(voteObjId, Buffer.from(JSON.stringify(vote)));

        console.info('============== END : sendVoteObj ============');
        return "2";
    }   

    async getResults(ctx){
        console.info('============= START : getResults ===========');
        let candidates = [];
        if(votestart==false){
            console.info('============== END : getResults ============');
            candidates = [{"candidateId": "-2", "voteCount":0}];
            return JSON.stringify(candidates);
        }

        const startKey = '0';
        const endKey = '9999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        let current = new Date();

        if(current.getTime()<endTime.getTime()){
            console.info('============== END : getResults ============');
            candidates = [{"candidateId": "-1", "voteCount":0}];
            return JSON.stringify(candidates);
        }
        
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

    async voterTurnout(ctx){
        console.info('============= START : getResults ===========');
        const startKey = '0';
        const endKey = '9999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        let voted = 0;
        let voters = 0;
        let TP;

        while(true){
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                let vote;
                try{
                    vote = JSON.parse(res.value.value.toString('utf8'));

                    if (vote.hasVoted == true){
                        voted = voted + 1;
                        voters = voters + 1;
                    }
                    else{
                        voters = voters +1;
                    }
                }
                catch (err){
                console.log(err);
                vote = res.value.value.toString('utf8');
                }}

                if (res.done){
                await iterator.close();
                console.info('============= VOTER TURNOUT: =============');
                console.info(`Registered Voters: ${voters}`);
                console.info(`Votes cast: ${voted}`);
                if(voters == 0){
                    TP = 0;
                }
                else{
                TP = (voted/voters)*100;
                }
                console.info(`Voter turnout percentage: ${TP}`)
                console.info('============= END : voterTurnout ===========');
                break;
            }
        }
        let turnout = [{voters,voted,TP}];
        return JSON.stringify(turnout);
    }

    async queryVote(ctx, voteObjId){
        console.info('============= START : queryVote ===========');
        console.log(`voteId: ${voteObjId}`);

        if(votestart == false){
            console.info('============= END : queryVote ===========');
            return JSON.stringify({"ownerId":"-2","hasVoted":false});

        }

        // get the vote from chaincode state
        const voteAsBytes = await ctx.stub.getState(voteObjId); 
        if (!voteAsBytes || voteAsBytes.length === 0) {
            console.info(`${voteObjId} does not exist!`);
            console.info('============= END : queryVote ===========');
            return JSON.stringify({"ownerId":"-1","hasVoted":false});
        }
        let vote = JSON.parse(voteAsBytes.toString());
        // console.log(vote);
        if(vote.hasVoted == true){
        console.info('============= END : queryVote ===========');
        return JSON.stringify(vote);
        }
        else{
            console.log(`Vote ${voteObjId} has not been cast yet.`);
            console.info('============= END : queryVote ===========');
            return JSON.stringify({"ownerId":"-1","hasVoted":false});   
            }
    }

    async queryAllVote(ctx){
        console.info('============= START : queryAllVote ===========');
        const startKey = '0';
        const endKey = '99999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];

        let current = new Date();

        if(votestart == false){
            console.info('============== END : queryAllVote ============');
            const Key = "-2";
            const vote = "-1";
            allResults.push({Key,vote});
            return JSON.stringify(allResults);
        }

        if(current.getTime()<endTime.getTime()){
            console.info('============== END : queryAllVote ============');
            const Key = "-1";
            const vote = "-1";
            allResults.push({Key,vote});
            return JSON.stringify(allResults);
        }

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