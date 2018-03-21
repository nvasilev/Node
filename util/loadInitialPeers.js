const Block = require('../modules/Block');
const Peer = require('../modules/Peer');
const request = require('request');
const validateBlockChain = require('./validateBlockChain');
const calculateBlockchainBalances = require('./calculateBlockchainBalances');
const node = require("../index");

function initNode(node) {
    console.log("Initializing the new BlockChain");
    let genesisBlock = new Block().generageGenesisBlock();
    node.blocks.push(genesisBlock);
    node.peers = [];
}

class LoadInitPeers {
    async load(node) {
        let initialPeerUrl = process.env.INIT_PEER_URL;
        // TODO add validation

        if (!initialPeerUrl) {
            initNode(node);
            return;
        }

        let options = {
            method: 'get',
            json: true,
            url: initialPeerUrl + '/peers',
        };
        request(options, function (err, res, remotePeersList) {
            if (err) {
                console.error(err);
                initNode(node);
                return;
            }
            console.log("remotePeersList > " + JSON.stringify(remotePeersList));


            if (remotePeersList.length > 0) {
                node.peers = remotePeersList;
            }

            let initialPeer = new Peer(initialPeerUrl, initialPeerUrl);
            node.peers.push(initialPeer);

            // TODO notify initialPeer for our existence


            let remoteBlockChain = null;

            let options = {
                method: 'get',
                json: true,
                url: initialPeerUrl + '/blocks',
            };
            request(options, function (err, responze, blocks) {
                if (err) {
                    console.error(err);
                    initNode(node);
                    return;
                }
                remoteBlockChain = blocks;

                let remotePoW = validateBlockChain(remoteBlockChain);

                if (!remotePoW || remotePoW === false) {
                    console.log("Remote POW: " + remotePoW)
                    initNode(node);
                    return;
                }

                if (remotePoW <= node.pow) {
                    initNode(node);
                    return;
                }

                node.blocks = remoteBlockChain;
                node.balnances = new Map();
                node.pendingTransactions = [];

                //TODO make a POST request to the PEER with the nodeAddress
                let optionsForPostPeers = {
                    method: 'post',
                    json: true,
                    url: initialPeerUrl + '/peers',
                    body: JSON.stringify({
                        url: node.address,
                        name: node.name
                    })
                };

                console.log("URL: " + initialPeerUrl);

                request(optionsForPostPeers, (err, res, message) => {
                    if(err) {
                        console.log(err);
                    }

                    //console.log(message);
                })



                // calculate node.balances
                calculateBlockchainBalances(node);

                console.log(`The new blockchain is sync-ed correctly`)
            });
        });
    }
}

module.exports = LoadInitPeers;