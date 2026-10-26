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
DIR="$(cd "$(dirname "$0")" && pwd)"
CC_SRC_PATH="${DIR}/chaincode/P2Pmessage/javascript/"

# clean out any old identites in the wallets
rm -rf "${DIR}"/apiserver/wallet/*

# launch network; create channel and join peer to channel
pushd "${DIR}/fabric-samples/test-network"
./network.sh down
./network.sh up createChannel -ca -s couchdb
./network.sh deployCC -ccn P2Pmessage -ccv 1 -cci initLedger -ccl javascript -ccp ${CC_SRC_PATH}
popd

cat <<EOF

Total setup execution time : $(($(date +%s) - starttime)) secs ...

Next, start the API server:

    cd apiserver
    npm install
    node enrollAdmin
    node registerUser
    node apiserver

EOF
