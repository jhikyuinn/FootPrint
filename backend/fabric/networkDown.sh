#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error
set -ex

DIR="$(cd "$(dirname "$0")" && pwd)"

# Bring the test network down
pushd "${DIR}/fabric-samples/test-network"
./network.sh down
popd

# clean out any old identites in the wallets
rm -rf "${DIR}"/apiserver/wallet/*
