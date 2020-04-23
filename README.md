# HyperVoter E-Voting Platform

#### Contributers: Harpreet Virk, Vir Jhangiani, Varsheel Deliwala

## Introduction:

HyperVoter is a distributed E-Voting application implemented on Hyperledger Fabric. It aims to do the following:

1. The identity of every voter is verified and remains anonymous throughout the process.

2. Every voter should be eligible to vote before casting their vote, and should be pre-authorised to do so.

3. No one should be able to cast their vote more than once in the same election (double spend problem).

4. Eliminating a third-party responsible for counting votes.

5. Votes should not be modifiable once cast.

6. Election results should be publicly visible to the entire network and vote transactions should be openly available for verification to ensure transparency (Voter’s identity will still be anonymous)

HyperVoter allows the voters to vote after the Election Commision verifies their identity and generates a voterId and a voterPin that is sent out to them via email. The EC also issues one voteObjecte for each voter after verifying their registration. The voters can register themselves on the application by using their voterId and voterPin, and then cast their vote by transferring the ownership of their voteObject to their preffered candidate, which is recorded as transactions on the blockchain. Given the immutable property of blockchain, tampering with the votes database is not possible. 

Votes do not contain the voterId of the voters after they have been cast, ensuring the privacy of the voters. Votes can be queried through their voteId, or all at once through query transactions.

## Network Configuration:

The application uses the sample network 'basic-network' which bootstraps the following instances:

1. 1 Orderer
2. 1 Certifying Authority
3. 1 org (org1) maintaining 1 peer (peer0)
4. 1 CouchDB
5. 1 CLI

## The Asset:

An asset (key, value) is a (voteID, {ownerId, hasVoted}) pair, with a unique voteId as its key, and records the following parameters for its value:

1. Owner_ID: Set to the voterId when the object is initially created by the Election Commision. It is changed to candidateId when the voter sends their vote to the candidate.

2. has_Voted: Boolean Value set to False if the voter has not yet voted, set to True after voting.

| KEY    | VALUE               |
|--------|---------------------|
| voteID | {ownerId, hasVoted} |

## Usage Instructions:

### Prerequisites:

1. [HyperLedger Fabric v1.4.6](https://www.hyperledger.org/projects/fabric "HyperLedger Fabric Homepage")
2. Download this repository and merge its contents with fabric-samples directory.

### Network Setup:

```
$  cd fabric-samples/hypervoter
$  ./teardownHyperVoter
$  ./startHyperVoter
```

If ./sh files have permission error (mac OS):
```
$  chmod u+r+x ./file_name.sh
```

### Viewing Chaincode Logs:
```
$  docker logs -f dev-peer0.org1.example.com-hypervoter-1.0
```

### Running the Application:

1. Change working directory:
```
$  cd fabric-samples/hypervoter/javascript
```
2. Install Application Dependancies:
```
$  npm install
```
3. Enroll admin (stores CA admin credentials in wallet dir) 
```
$  node enrollAdmin.js
```
4. Register and enroll EC:
```
$  node registerUser.js EC <EC_PIN>
$  node registerUser.js EC 555000555
```
EC_PIN is preset in voters.json file, and can be set by the EC before the elections start. Only EC user can create VoteObjects.

5. Register and enroll three voters:
```
$  node registerUser.js <voterId> <voterPin>
$  node registerUser.js 101 001
$  node registerUser.js 202 002
$  node registerUser.js 303 003
```
VoterId's and voterPin's are preset in voters.json file, and are set by the EC after they verify individual voters before the elections start. Voters can only send VoteObjects, not create them.

6. Query all votes using a voters wallet:
```
$  node query.js -1 <voterId>
```
7. Query a specific vote using a voters wallet:
```
$  node query.js <voteId> <voterId>
```
8. Creating a new VoteObject for a voter, using EC wallet: 
```
$  node invoke.js createVoteObj EC <EC_PIN> <sendTo = new voter's voterId>  
```
9. Sending a VoteObject to preffered candidate for voting, using voter wallet:
```
$  node invoke.js sendVoteObj <voterId> <voterPin> <sendTo = candidateId> 
```
