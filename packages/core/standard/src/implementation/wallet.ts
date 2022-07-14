import { clusterApiUrl, Connection, Keypair, Transaction } from '@solana/web3.js';
import { decode } from 'bs58';
import { box, randomBytes, sign } from 'tweetnacl';
import {
    Bytes,
    ConnectParams,
    ConnectResult,
    DecryptInput,
    DecryptOutput,
    EncryptInput,
    EncryptOutput,
    SignAndSendTransactionOutput,
    SignMessageOutput,
    SignTransactionOutput,
    Wallet,
    WalletAccount,
    WalletChain,
    WalletCipher,
    WalletEvents,
    WalletVersion,
} from '../interfaces';

export class SolanaWallet implements Wallet {
    version = WalletVersion['1.0.0'];

    accounts = [new SolanaWalletAccount()];
    chains = [WalletChain.SolanaMainnet];
    ciphers = [WalletCipher['x25519-xsalsa20-poly1305']];

    name = 'Solana Wallet';
    icon =
        'data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9Ijg4IiB2aWV3Qm94PSIwIDAgMTAxIDg4IiB3aWR0aD0iMTAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48bGluZWFyR3JhZGllbnQgaWQ9ImEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4MT0iOC41MjU1OCIgeDI9Ijg4Ljk5MzMiIHkxPSI5MC4wOTczIiB5Mj0iLTMuMDE2MjIiPjxzdG9wIG9mZnNldD0iLjA4IiBzdG9wLWNvbG9yPSIjOTk0NWZmIi8+PHN0b3Agb2Zmc2V0PSIuMyIgc3RvcC1jb2xvcj0iIzg3NTJmMyIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiM1NDk3ZDUiLz48c3RvcCBvZmZzZXQ9Ii42IiBzdG9wLWNvbG9yPSIjNDNiNGNhIi8+PHN0b3Agb2Zmc2V0PSIuNzIiIHN0b3AtY29sb3I9IiMyOGUwYjkiLz48c3RvcCBvZmZzZXQ9Ii45NyIgc3RvcC1jb2xvcj0iIzE5ZmI5YiIvPjwvbGluZWFyR3JhZGllbnQ+PHBhdGggZD0ibTEwMC40OCA2OS4zODE3LTE2LjY3MzIgMTcuNDE5OGMtLjM2MjQuMzc4NC0uODAxLjY4MDEtMS4yODgzLjg4NjNzLTEuMDEzLjMxMjUtMS41NDQyLjMxMjJoLTc5LjAzODY3Yy0uMzc3MTQgMC0uNzQ2MDYtLjEwNzQtMS4wNjE0MjgtLjMwODgtLjMxNTM3My0uMjAxNS0uNTYzNDYyLS40ODgzLS43MTM3ODYtLjgyNTMtLjE1MDMyMzctLjMzNjktLjE5NjMzNDEtLjcwOTMtLjEzMjM3NzgtMS4wNzE0LjA2Mzk1NjItLjM2MjEuMjM1MDkyOC0uNjk4MS40OTIzODM4LS45NjY3bDE2LjY4NTY3OC0xNy40MTk4Yy4zNjE1LS4zNzc0Ljc5ODYtLjY3ODUgMS4yODQzLS44ODQ2LjQ4NTgtLjIwNjIgMS4wMDk4LS4zMTMgMS41Mzk3LS4zMTM5aDc5LjAzNDNjLjM3NzEgMCAuNzQ2LjEwNzQgMS4wNjE2LjMwODguMzE1LjIwMTUuNTYzLjQ4ODQuNzE0LjgyNTMuMTUuMzM3LjE5Ni43MDkzLjEzMiAxLjA3MTRzLS4yMzUuNjk4MS0uNDkyLjk2Njd6bS0xNi42NzMyLTM1LjA3ODVjLS4zNjI0LS4zNzg0LS44MDEtLjY4MDEtMS4yODgzLS44ODYzLS40ODczLS4yMDYxLTEuMDEzLS4zMTI0LTEuNTQ0Mi0uMzEyMWgtNzkuMDM4NjdjLS4zNzcxNCAwLS43NDYwNi4xMDczLTEuMDYxNDI4LjMwODgtLjMxNTM3My4yMDE1LS41NjM0NjIuNDg4My0uNzEzNzg2LjgyNTItLjE1MDMyMzcuMzM3LS4xOTYzMzQxLjcwOTQtLjEzMjM3NzggMS4wNzE1LjA2Mzk1NjIuMzYyLjIzNTA5MjguNjk4LjQ5MjM4MzguOTY2N2wxNi42ODU2NzggMTcuNDE5OGMuMzYxNS4zNzc0Ljc5ODYuNjc4NCAxLjI4NDMuODg0Ni40ODU4LjIwNjEgMS4wMDk4LjMxMyAxLjUzOTcuMzEzOGg3OS4wMzQzYy4zNzcxIDAgLjc0Ni0uMTA3MyAxLjA2MTYtLjMwODguMzE1LS4yMDE1LjU2My0uNDg4My43MTQtLjgyNTIuMTUtLjMzNy4xOTYtLjcwOTQuMTMyLTEuMDcxNS0uMDY0LS4zNjItLjIzNS0uNjk4LS40OTItLjk2Njd6bS04MS44NzExNy0xMi41MTI3aDc5LjAzODY3Yy41MzEyLjAwMDIgMS4wNTY5LS4xMDYgMS41NDQyLS4zMTIycy45MjU5LS41MDc5IDEuMjg4My0uODg2M2wxNi42NzMyLTE3LjQxOTgxYy4yNTctLjI2ODYyLjQyOC0uNjA0NjEuNDkyLS45NjY2OXMuMDE4LS43MzQ0Ny0uMTMyLTEuMDcxNDJjLS4xNTEtLjMzNjk1LS4zOTktLjYyMzc4NC0uNzE0LS44MjUyNTctLjMxNTYtLjIwMTQ3NC0uNjg0NS0uMzA4ODEwNTktMS4wNjE2LS4zMDg4MjNoLTc5LjAzNDNjLS41Mjk5LjAwMDg3ODQtMS4wNTM5LjEwNzY5OS0xLjUzOTcuMzEzODQ4LS40ODU3LjIwNjE1LS45MjI4LjUwNzIzOS0xLjI4NDMuODg0NjMybC0xNi42ODEzNzcgMTcuNDE5ODJjLS4yNTcwNDIuMjY4My0uNDI4MTAzMi42MDQtLjQ5MjIwNDUuOTY1Ni0uMDY0MTAxNC4zNjE3LS4wMTg0NTYxLjczMzguMTMxMzM3NSAxLjA3MDYuMTQ5Nzk0LjMzNjguMzk3MjI1LjYyMzYuNzExOTQ4LjgyNTQuMzE0NzI2LjIwMTguNjgzMDU2LjMwOTcgMS4wNTk4MjYuMzEwNnoiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=';

    private _listeners: { [E in keyof WalletEvents]?: WalletEvents[E][] } = {};

    async connect(options?: ConnectParams): Promise<ConnectResult> {
        return {
            accounts: this.accounts,
            hasMoreAccounts: false,
        };
    }

    on<E extends keyof WalletEvents>(event: E, listener: WalletEvents[E]): () => void {
        this._listeners[event]?.push(listener) || (this._listeners[event] = [listener]);

        return (): void => {
            this._listeners[event] = this._listeners[event]?.filter((l) => listener !== l);
        };
    }

    private _emit<E extends keyof WalletEvents>(event: E) {
        this._listeners[event]?.forEach((listener) => listener());
    }
}

export class SolanaWalletAccount implements WalletAccount {
    private _keypair: Keypair;
    private _publicKey: Bytes;

    get address(): Bytes {
        return this._publicKey;
    }

    get chain(): WalletChain {
        return WalletChain.SolanaMainnet;
    }

    constructor() {
        this._keypair = Keypair.generate();
        this._publicKey = this._keypair.publicKey.toBytes();
    }

    async signTransaction(rawTransactions: Bytes[]): Promise<SignTransactionOutput> {
        const transactions = rawTransactions.map((rawTransaction) => Transaction.from(rawTransaction));

        for (const transaction of transactions) {
            transaction.partialSign(this._keypair);
        }

        rawTransactions = transactions.map((transaction) => transaction.serialize({ requireAllSignatures: false }));

        return { transactions: rawTransactions };
    }

    async signAndSendTransaction(rawTransactions: Bytes[]): Promise<SignAndSendTransactionOutput> {
        const transactions = rawTransactions.map((rawTransaction) => Transaction.from(rawTransaction));

        for (const transaction of transactions) {
            transaction.partialSign(this._keypair);
        }

        rawTransactions = transactions.map((transaction) => transaction.serialize());

        const connection = new Connection(clusterApiUrl('mainnet-beta'));
        const signatures = await Promise.all(
            rawTransactions.map((serializedTransaction) => connection.sendRawTransaction(serializedTransaction))
        );

        const rawSignatures = signatures.map(decode);

        return { signatures: rawSignatures };
    }

    async signMessage(messages: Bytes[]): Promise<SignMessageOutput> {
        const signatures = messages.map((message) => sign.detached(message, this._keypair.secretKey));

        return { signatures };
    }

    async encrypt(params: EncryptInput[]): Promise<EncryptOutput[]> {
        return params.map(({ publicKey, cleartexts }) => {
            const sharedKey = box.before(publicKey, this._keypair.secretKey);

            const nonces = [];
            const ciphertexts = [];
            for (let i = 0; i < cleartexts.length; i++) {
                nonces[i] = randomBytes(32);
                ciphertexts[i] = box.after(cleartexts[i], nonces[i], sharedKey);
            }

            return { ciphertexts, nonces, cipher: WalletCipher['x25519-xsalsa20-poly1305'] };
        });
    }

    async decrypt(params: DecryptInput[]): Promise<DecryptOutput[]> {
        return params.map(({ publicKey, ciphertexts, nonces }) => {
            const sharedKey = box.before(publicKey, this._keypair.secretKey);

            const cleartexts = [];
            for (let i = 0; i < cleartexts.length; i++) {
                const cleartext = box.open.after(ciphertexts[i], nonces[i], sharedKey);
                if (!cleartext) throw new Error('message authentication failed');
                cleartexts[i] = cleartext;
            }

            return { cleartexts, cipher: WalletCipher['x25519-xsalsa20-poly1305'] };
        });
    }
}
