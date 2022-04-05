const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();

const s3 = new AWS.S3();
const {
  Keypair,
  PublicKey,
  Connection,
  Transaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const candymachine = require("./helpers/candymachine");
const { getAtaForMint } = require("./helpers/utils");
const anchor = require("@project-serum/anchor");
const splToken = require("@solana/spl-token");
const { v4: uuidv4 } = require("uuid");

const cognito = new AWS.CognitoIdentityServiceProvider();

const S3_BUCKET = process.env.S3_BUCKET;
const CANDY_MACHINE_ID = process.env.CANDY_MACHINE_ID;
const RPC_HOST = process.env.RPC_HOST;
const USER_POOL_ID = process.env.USER_POOL_ID;

const sns = new AWS.SNS();

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { body = "{}" } = event;
  const { data = {} } = JSON.parse(body);
  const { object = {} } = data;
  const { metadata = {} } = object;
  const { user_id, event_id, mint, candy_machine_id } = metadata;

  try {
    if (candy_machine_id === CANDY_MACHINE_ID) {
      const phone_number = await fetchUser(user_id);
      console.log("User      : ", phone_number);

      const connection = new Connection(RPC_HOST, "confirmed");
      const masterSecretKey = await fetchEventMaster(event_id);
      const userSecretKey = await fetchSecretKey(user_id);

      const masterSigner = Keypair.fromSecretKey(Buffer.from(masterSecretKey));
      const userSigner = Keypair.fromSecretKey(Buffer.from(userSecretKey));

      console.log("Master Key 1: ", masterSigner.publicKey.toString());
      console.log("User Key   1: ", userSigner.publicKey.toString());

      //const masterWallet = new anchor.Wallet(masterSigner);
      const userWallet = new anchor.Wallet(userSigner);
      //const mint = await mintTicket(connection, masterWallet, user_id);
      console.log("Minted Ticket: ", mint);
      await transferTicket(connection, masterSigner, userWallet, mint);
      await createDynamoRecords({
        user_id,
        mint,
        pubkey: userSigner.publicKey.toString(),
        event_id,
      });
      await sendConfirmationMessage(mint, phone_number);
    } else {
      console.log("Invalid candy machine ID: ", candy_machine_id);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result: { mint } }, null, 2),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (err) {
    console.log("Main handler catch");
    console.error(err);
    return {
      statusCode: err.statusCode || 500,
      body: JSON.stringify(
        { message: err.message || "An unknown error occured" },
        null,
        2
      ),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
};

const fetchUser = async (user_id) => {
  const params = {
    UserPoolId: USER_POOL_ID /* required */,
    Username: user_id /* required */,
  };

  const res = await cognito.adminGetUser(params).promise();
  console.log("User: ", JSON.stringify(res, null, 2));
  const phone_number = res.UserAttributes.find(
    (r) => r.Name === "phone_number"
  ).Value;
  return phone_number;
};

const fetchSecretKey = async (user_id) => {
  console.log("Fetch Secret Key: ", user_id);
  const params = {
    Bucket: S3_BUCKET,
    Key: `${user_id}/${user_id === "master" ? "keypair" : "secretkey"}.json`,
  };

  try {
    const { Body } = await s3.getObject(params).promise();
    console.log("Body: ", Body.toString());
    return JSON.parse(Body.toString());
  } catch (err) {
    console.log(`No wallet for user: ${user_id}`);
    throw { status: 404, messages: `User not found` };
  }
};

const fetchEventMaster = async (event_id) => {
  console.log("Fetch Secret Key: ", event_id);
  const params = {
    Bucket: S3_BUCKET,
    Key: `events/${event_id}/master/secretkey.json`,
  };

  try {
    const { Body } = await s3.getObject(params).promise();
    console.log("Body: ", Body.toString());
    const secretKey = JSON.parse(Body.toString());
    return Keypair.fromSecretKey(Buffer.from(secretKey));
  } catch (err) {
    console.log(`No wallet for user: ${user_id}`);
    throw { status: 404, messages: `User not found` };
  }
};

const transferTicket = async (connection, masterSigner, userWallet, mint) => {
  const mintPubkey = new PublicKey(mint);

  console.log("Master Key: ", masterSigner.publicKey.toString());
  console.log("User Key  : ", userWallet.publicKey.toString());

  const fromTokenAccount = await splToken.getAssociatedTokenAddress(
    mintPubkey,
    masterSigner.publicKey,
    false,
    splToken.TOKEN_PROGRAM_ID,
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const toTokenAccount = await splToken.getAssociatedTokenAddress(
    mintPubkey,
    userWallet.publicKey,
    false,
    splToken.TOKEN_PROGRAM_ID,
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const createAtaIstruction =
    candymachine.createAssociatedTokenAccountInstruction(
      toTokenAccount,
      masterSigner.publicKey,
      userWallet.publicKey,
      mintPubkey
    );

  const transaction = new Transaction().add(
    createAtaIstruction,
    splToken.createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      masterSigner.publicKey,
      1,
      [],
      splToken.TOKEN_PROGRAM_ID
    )
  );
  console.log("From: ", fromTokenAccount.toString());
  console.log("To  : ", toTokenAccount.toString());
  console.log("Transaction: ", transaction);

  let blockhash = (await connection.getRecentBlockhash("confirmed")).blockhash;
  console.log("Blockhash: ", blockhash);

  transaction.feePayer = masterSigner.publicKey;
  transaction.recentBlockhash = blockhash;

  const response = await sendAndConfirmTransaction(connection, transaction, [
    masterSigner,
  ]);

  console.log(response);
};

const createDynamoRecords = async ({ user_id, mint, pubkey, event_id }) => {
  const ticketId = `TK${uuidv4()}`;
  const metadata = {
    user_id,
    pubkey,
    mint,
    event_id,
  };

  const params = {
    TransactItems: [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `TICKET#${ticketId}`,
            sk: `TICKET#${ticketId}`,
            data: "#",
            metadata,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `TICKET#${ticketId}`,
            sk: `USER#${user_id}`,
            data: `TICKET#OPEN#${new Date().toISOString()}`,
            metadata,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `TICKET#${ticketId}`,
            sk: `MINT#${mint}`,
            data: `TICKET#OPEN#${new Date().toISOString()}`,
            metadata,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `TICKET#${ticketId}`,
            sk: `EVENT#${event_id}`,
            data: `TICKET#OPEN#${new Date().toISOString()}`,
            metadata,
          },
        },
      },
      {
        Update: {
          TableName: TABLE_NAME,
          Key: {
            pk: `EVENT#${event_id}`,
            sk: `EVENT#${event_id}`,
          },
          UpdateExpression:
            "SET #metadata.#claimed = #metadata.#claimed + :inc",
          ExpressionAttributeNames: {
            "#metadata": "metadata",
            "#claimed": "claimed",
          },
          ExpressionAttributeValues: {
            ":inc": 1,
          },
        },
      },
      {
        Update: {
          TableName: TABLE_NAME,
          Key: {
            pk: `EVENT#${event_id}`,
            sk: `EVENT#CREATED`,
          },
          UpdateExpression:
            "SET #metadata.#claimed = #metadata.#claimed + :inc",
          ExpressionAttributeNames: {
            "#metadata": "metadata",
            "#claimed": "claimed",
          },
          ExpressionAttributeValues: {
            ":inc": 1,
          },
        },
      },
    ],
  };

  return dynamo.transactWrite(params).promise();
};

const sendConfirmationMessage = async (mint, phone_number) => {
  const params = {
    Message: `You've got your KYDMIAMI ticket! Sign in to https://miami.kydlabs.com to view your ticket.\n\n NFT Link: https://explorer.solana.com/address/${mint}?cluster=devnet` /* required */,
    PhoneNumber: phone_number,
  };

  await sns.publish(params).promise();
};
