/*
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const {Contract} = require('fabric-contract-api');

let votestart = false;
let endTime;

// voteId of last voteObj that was created
let voteId = -1;

class HyperVoter extends Contract {

    async initLedger(ctx) {
        console.info('============= Initialized the Ledger ===========');
    }

    async createVoteObj(ctx, sendTo){
        console.info('============= START : createVoteObj ===========');

        /* The EC invokes this function to assign new vote objects for new voters. 
        For every new vote object:
        1. A sequential vote id is assigned,
        2. OwnerId is set to the voterId of the voter,
        3. hasVoted is set to false.

        The vote object pushed to the ledger:
        Vote Object = {Key = VoteId, value = {ownerId = voterId, hasVoted = false}}  
        */

        let ownerId  = sendTo;
        let hasVoted = false;
        voteId +=1;

        const vote = {
            ownerId,
            hasVoted,
        };

        console.log('New vote object created:\n');
        console.log(`OwnerId : ${ownerId}`);
        console.log(`VoteId : ${voteId}`);
        
        await ctx.stub.putState(voteId.toString(), Buffer.from(JSON.stringify(vote)));
        console.info('============== END : createVoteObj ============');
    }

    async setEndTime(ctx, endTimeVal){
        console.info('============== START : setEndTime ============');
        /* The EC invokes this function to set an end time for the election. 
        It takes the election duration in minutes as an input, and adds that to 
        the current time to define the end time. 

        Before the election end time is specified, voting is turned off and 
        voters cannot cast their votes, or query the ledger. 

        After the end time is set, voters are allowed to cast their votes. However, untill 
        the end time elapses, all query functions are blocked.
        */

        let current = new Date();

        console.log("Current Time:");
        console.log(current.toString());

        current = current.setTime(current.getTime()+ parseInt(endTimeVal)*60*1000);
        endTime = new Date(current);

        console.log("End time:");
        console.log(endTime.toString());

        votestart = true;

        console.info('============== END : setEndTime ============');
        return endTime.toString();
    }

    async sendVoteObj(ctx, voterId, sendTo){
        console.info('============== START : sendVoteObj ============');
        /* The voters invoke this function to caste their votes to their preffered candidatdes.
        When the function is invoked, it first checks:

        1. If the voting has not started yet, it returns without casting.
        2. If the current time is greater than the end time, it returns without casting.
        
        Then, it finds the vote object which is owned by the voter.
        
        If no vote is owned by the voterId, the vote must have already been cast and the voter 
        is trying to double spend. An error is returned, and the vote is not cast.
        
        If the vote object is found, it is fetched from the chainstate. The owner id is changes
        to the candidate id that the voter wishes to vote for, and the hasVoted field to set to true.
        
        */
        let current = new Date();

        if(votestart!= true){
          	console.info("Voting has not started yet!");
            console.info('============== END : sendVoteObj ============');
            return "0";
        }
        if(current.getTime()>endTime.getTime()){
          	console.info("Voting has ended!");
            console.info('============== END : sendVoteObj ============');
            return "1";
        }
	
      	// Finding the voteId of the vote object owned by the voter.
        let voteObjId = -1;
        const startKey = '0';
        const endKey = (voteId+1).toString();
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

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
            if (res.done){
                if (voteObjId == -1){
                    await iterator.close();
                    console.info('Double Spend Alert! Voter has already voted!');
                    console.info('============== END : sendVoteObj ============');
                    return "3";
                } 
                await iterator.close();
                break;
            }
        }
        
        console.log('Casting your vote:\n');
        console.log(`VoteId : ${voteObjId}`);
        console.log(`OwnerId : ${sendTo}`);

        // Get the vote from chaincode state
        const voteAsBytes = await ctx.stub.getState(voteObjId); 
        if (!voteAsBytes || voteAsBytes.length === 0) {
            throw new Error(`${voteObjId} associated with your account does not exist, you could have already voted!`);
        }
        let vote = JSON.parse(voteAsBytes.toString());
      
      	/*Set the ownerId to the CandidateId of the preffered candidate, and set 
      	hasVoted to true.*/
      
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
      /* This function can be invoked by anyone to get the count of votes sent to
       * each candidate. 
       * 
       * However, it can only be invoked once the voting has ended. 
       * */
        console.info('============= START : getResults ===========');
        let candidates = [];
        if(votestart==false){
          	console.info("Voting has not started yet!");
            console.info('============== END : getResults ============');
            candidates = [{"candidateId": "-2", "voteCount":0}];
            return JSON.stringify(candidates);
        }

        const startKey = '0';
        const endKey = (voteId+1).toString();
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        let current = new Date();

        if(current.getTime()<endTime.getTime()){
          	console.info("Voting has not ended yet!");
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
                        // If candidate not already in list, add him to candidates list.
                        if (!(candidates.some(item => item.candidateId == vote.ownerId))){
                            let newCandidate = {"candidateId": vote.ownerId, "voteCount":1};
                            candidates.push(newCandidate);
                        } else {
                          // If the candidate is already in the list, increment his vote count by one. 
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
                console.info('===RESULTS ===');
                console.info(candidates);
              	console.info('=== END RESULTS ===');
                console.info('============= END : getResults ===========');
                break;
            }
        }
        return JSON.stringify(candidates);
    }

    async voterTurnout(ctx){
        console.info('============= START : getResults ===========');
      	/* Any user can invoke this function to check the current voter turnout.
      	   It will display the following:
           
           1. The number of Registered voters. 
      	   2. The number of voters who have already cast a vote. 
           3. The current voter turnout percentage.
           
           It runs a loop through all the vote objects on the chainstate. 
           If the hasvoted variable of the vote object is true then it increments number of votes cast by 1.
           Then it just divides number of votes cast by number of registered voters to find voter turnout %.
      	*/
        const startKey = '0';
        const endKey = (voteId+1).toString();
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        let voted = 0;
        let voters = 0;
        let TP = 0;

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
      	/* Any voter can invoke this function.
      	 * This function queries a vote object by searching for the voteId in question.
      	 * If voting has not started yet then it does not allow you to query a vote.
      	 * If the vote has not been cast yet then it will not allow you to query the vote.
      	 * If such a vote ID does not exist yet then it will simply return an error massage saying that this vote object does not exist.
      	 * It takes the key value voteId and returns the vote object attributed to that voteId only once the vote has been casted.
      	 * We created this function so that a user can immediatelt query if their vote has been sent to the correct candidate immediately after it has been cast.      	 * 
      	 */
        console.log(`voteId: ${voteObjId}`);

        if(votestart == false){
          	console.info("Voting has not started yet!");
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
      	/* Any voter can call this function to view all the votes that hve been cast.
      	 * It does not let you call this function untill voting has ended.
      	 * It loops through all the vote objects on the chainstate and displays them only if they have been cast.
      	 * 
      	 * */
        const startKey = '0';
        const endKey = (voteId+1).toString();
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];

        let current = new Date();

        if(votestart == false){
          	console.info('Voting has not started yet!');
            console.info('============== END : queryAllVote ============');
            const Key = "-2";
            const vote = "-1";
            allResults.push({Key,vote});
            return JSON.stringify(allResults);
        }

        if(current.getTime()<endTime.getTime()){
          	console.info('Voting has not ended yet!');
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