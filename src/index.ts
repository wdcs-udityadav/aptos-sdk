import { Account, Aptos, AptosConfig, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";
import dotenv from 'dotenv';
dotenv.config();

const getInfoFromMainnet = async() =>{
    const config  = new AptosConfig({network: Network.MAINNET});
    const aptos = new Aptos(config);
    
    const ledgerInfo = await aptos.getLedgerInfo();
    const ledgerVersion = Number(ledgerInfo.ledger_version);
    
    const randomAddress = process.env.RANDOM_ADDRESS || "0x0";
    const accountInfo = await aptos.getAccountInfo({accountAddress: randomAddress});
    console.log("\nAccount info: ", accountInfo);

    const accountResource = await aptos.getAccountResource({
        accountAddress: randomAddress,
        resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
        options: {ledgerVersion: ledgerVersion}
    });
    console.log("APT balance: ", accountResource.coin.value/10**8);

    const modules = await aptos.getAccountModules({accountAddress: randomAddress});
    console.log("Number of modules: ",modules.length);

    let ownedTokens = await aptos.getAccountOwnedTokens({
        accountAddress: randomAddress,
        minimumLedgerVersion: ledgerVersion}
    );
    console.log("Number of owned tokens: ", ownedTokens.length);
}

const getInfoFromTestnet = async()=>{
    const config = new AptosConfig({network: Network.TESTNET});
    const aptos = new Aptos(config);

    const account = Account.generate();
    console.log("randomly generated account address: ", account.accountAddress.toString());

    await aptos.fundAccount({
        accountAddress: account.accountAddress,
        amount: 10000000000    
    });

    const pvtKey = Ed25519PrivateKey.generate();
    console.log("pvt key: ", pvtKey.toString());
    console.log("public key: ", pvtKey.publicKey().toString())
    const accountFromPvtKey = Account.fromPrivateKey({ privateKey: pvtKey });
    console.log("Account address: ", accountFromPvtKey.accountAddress.toString());
}

getInfoFromMainnet();
getInfoFromTestnet();
