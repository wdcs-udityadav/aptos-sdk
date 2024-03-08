import { Account, AccountAddressInput, Aptos, AptosConfig, Ed25519PrivateKey, Network, PendingTransactionResponse, SimpleTransaction } from "@aptos-labs/ts-sdk";
import dotenv from 'dotenv';
dotenv.config();

const config = new AptosConfig({network: Network.DEVNET});
const aptos = new Aptos(config);

// receiver
const receiver = process.env.RECEIVER || "0x0";
const amount = 50000000; //0.5 APT

// feePayer
const feePayer_pvtKey = Ed25519PrivateKey.generate();
const feePayer = Account.fromPrivateKey({
    privateKey: feePayer_pvtKey,
    legacy: true
});
aptos.faucet.fundAccount({
    accountAddress: feePayer.accountAddress,
    amount: 100000000
})

// sender
const sender_pvtKey =  Ed25519PrivateKey.generate();
const sender = Account.fromPrivateKey({
    privateKey: sender_pvtKey,
    legacy: true
});
aptos.faucet.fundAccount({
    accountAddress: sender.accountAddress,
    amount: 100000000
});

const getBalance = async(address: AccountAddressInput):Promise<Number> => {
    const ledger = await aptos.getLedgerInfo();
    const balance = await aptos.account.getAccountAPTAmount({
        accountAddress: address,
        minimumLedgerVersion: Number(ledger.ledger_version)
    });
    
    return balance;
}

const buildTransaction = async(sponsored: boolean):Promise<SimpleTransaction> =>{
    console.log("Sender: ", sender.accountAddress.toString());
    console.log(`Receiver: ${receiver}\n`);
    if(sponsored){
        console.log("Fee payer: ", feePayer.accountAddress.toString());
        const initialBalance_feePayer = await getBalance(feePayer.accountAddress);
        console.log("initialBalance_feePayer: ", Number(initialBalance_feePayer)/10**8);
    }
    
    const initialBalance_sender = await getBalance(sender.accountAddress);
    console.log("initialBalance_sender: ", Number(initialBalance_sender)/10**8);

    const initialBalance_receiver = await getBalance(receiver);
    console.log("initialBalance_receiver: ", Number(initialBalance_receiver)/10**8);

    let tx =  await aptos.transaction.build.simple({
        sender: sender.accountAddress,
        data: {
            function: "0x1::coin::transfer",
            typeArguments: ["0x1::aptos_coin::AptosCoin"],
            functionArguments: [receiver, amount]
        },
        withFeePayer: sponsored? true:false
    });
    return tx;
}

const submitSimpleTransaction = async(sponsored: boolean)=>{
    const tx = await buildTransaction(sponsored);
    const sender_authenticator =  aptos.transaction.sign({
        signer: sender,
        transaction: tx
    });
    
    let pendingTxResponse: PendingTransactionResponse;
    if(sponsored){
        pendingTxResponse = await aptos.transaction.submit.simple({
            transaction: tx,
            senderAuthenticator: sender_authenticator,
            feePayerAuthenticator: aptos.transaction.signAsFeePayer({
                signer: feePayer,
                transaction: tx
            })
        });
    }else{
        pendingTxResponse = await aptos.transaction.submit.simple({
            transaction: tx,
            senderAuthenticator: sender_authenticator
        });
    }

    const transactionHash = pendingTxResponse.hash;
    console.log(`\nTransaction hash: ${transactionHash}\n`);
    
    await aptos.transaction.waitForTransaction({ transactionHash });

    if(sponsored){
        const finalBalance_feePayer = await getBalance(feePayer.accountAddress);
        console.log("finalBalance_feePayer: ", Number(finalBalance_feePayer)/10**8);
    }
 
    const finalBalance_sender = await getBalance(sender.accountAddress);
    console.log("finalBalance_sender: ", Number(finalBalance_sender)/10**8);

    const finalBalance_receiver = await getBalance(receiver);
    console.log("finalBalance_receiver: ", Number(finalBalance_receiver)/10**8);
}

const simulateTransaction = async(sponsored:boolean) => {
    const tx = await buildTransaction(sponsored);
    
    const [txResponse] = await aptos.transaction.simulate.simple({
        signerPublicKey: sender.publicKey,
        transaction: tx,
        feePayerPublicKey: sponsored?feePayer.publicKey:undefined
    });

    console.log("\nsuccess: ", txResponse.success);
    console.log(`vm_status: ${txResponse.vm_status}\n`);

    if(sponsored){
        const finalBalance_feePayer = await getBalance(feePayer.accountAddress);
        console.log("\nfinalBalance_feePayer: ", Number(finalBalance_feePayer)/10**8);
    }
 
    const finalBalance_sender = await getBalance(sender.accountAddress);
    console.log("finalBalance_sender: ", Number(finalBalance_sender)/10**8);

    const finalBalance_receiver = await getBalance(receiver);
    console.log("finalBalance_receiver: ", Number(finalBalance_receiver)/10**8);
}

const sponsored = false;
// submitSimpleTransaction(sponsored);
simulateTransaction(sponsored);
