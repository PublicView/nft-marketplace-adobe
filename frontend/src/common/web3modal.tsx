import Web3Modal from "web3modal";
import WalletLink from 'walletlink'
import Authereum from "authereum";
import Torus from "@toruslabs/torus-embed";
const ETH_JSONRPC_URL = ''
const CHAIN_ID = 1;
const walletLink = new WalletLink({
    appName: "coinbase",
});
const walletLinkProvider = walletLink.makeWeb3Provider(ETH_JSONRPC_URL, CHAIN_ID)

const providerOptions = {
    torus: {
        package: Torus
    },
    authereum: {
        package: Authereum
    },
    walletconnect: {
        package: walletLinkProvider
    }
};

const web3Modal = new Web3Modal({
    //network: "mainnet", // optional
    cacheProvider: false, // optional
    disableInjectedProvider: false,
    providerOptions: providerOptions
});


export default web3Modal