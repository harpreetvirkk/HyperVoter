#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error
set -e

# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1
starttime=$(date +%s)
CC_SRC_LANGUAGE=${1:-"javascript"}
CC_RUNTIME_LANGUAGE=node # chaincode runtime language is node.js
CC_SRC_PATH=/opt/gopath/src/github.com/hyperledger/fabric/chaincode/hypervoter/javascript

# clean the keystore
rm -rf ./hfc-key-store

# launch network; create channel and join peer to channel
cd ../basic-network
./start.sh

# Now launch the CLI container in order to install, instantiate chaincode
# and submit initLedger txn
docker-compose -f ./docker-compose.yml up -d cli

docker exec -e "CORE_PEER_LOCALMSPID=EC-MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/election-commision.example.com/users/Admin@election-commision.example.com/msp" cli peer chaincode install -n hypervoter -v 1.0 -p "$CC_SRC_PATH" -l "$CC_RUNTIME_LANGUAGE"
docker exec -e "CORE_PEER_LOCALMSPID=EC-MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/election-commision.example.com/users/Admin@election-commision.example.com/msp" cli peer chaincode instantiate -o orderer.example.com:7050 -C mychannel -n hypervoter -l "$CC_RUNTIME_LANGUAGE" -v 1.0 -c '{"Args":[]}' -P "OR ('EC-MSP.member','EC2-MSP.member')"
sleep 10
docker exec -e "CORE_PEER_LOCALMSPID=EC-MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/election-commision.example.com/users/Admin@election-commision.example.com/msp" cli peer chaincode invoke -o orderer.example.com:7050 -C mychannel -n hypervoter -c '{"function":"initLedger","Args":[]}'

cat <<EOF
Total setup execution time : $(($(date +%s) - starttime)) secs ...
EOF