const AWS = require("aws-sdk");
const { Keypair, Connection } = require("@solana/web3.js");
const dynamo = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const anchor = require("@project-serum/anchor");
const candymachine = require("./helpers/candymachine");

const TABLE_NAME = process.env.TABLE_NAME;
const S3_BUCKET = process.env.S3_BUCKET;
const RPC_HOST = process.env.RPC_HOST;

const EVENT_ID = "EV0b74e7ac-9d47-41ae-b31b-4265b1edd822";
const CANDY_MACHINE_ID = process.env.CANDY_MACHINE_ID;

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  try {
    const mintRecords = await fetchEventMints(EVENT_ID);
    let minted = 0;
    const connection = new Connection(RPC_HOST, "confirmed");
    const masterKeypair = await fetchSecretKey(EVENT_ID, `master`);
    console.log("Master Pubkey: ", masterKeypair.publicKey.toString());
    for (const mintRecord of mintRecords) {
      const mintKeypair = await fetchSecretKey(
        EVENT_ID,
        `mints/${mintRecord.id}`
      );
      await mintTicket(connection, masterKeypair, mintKeypair);
      await updateMint(mintRecord);
      console.log("Minted: ", mintRecord.id);
      minted += 1;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result: { minted } }, null, 2),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (err) {
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

const fetchSecretKey = async (event_id, path) => {
  console.log("Fetch Secret Key: ", path);
  const params = {
    Bucket: S3_BUCKET,
    Key: `events/${event_id}/${path}/secretkey.json`,
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

const fetchEventMints = async (event_id) => {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: "#pk = :pk AND begins_with(#sk,:sk)",
    ExpressionAttributeNames: {
      "#pk": "pk",
      "#sk": "sk",
      "#minted": "minted",
    },
    ExpressionAttributeValues: {
      ":pk": `EVENT#${event_id}`,
      ":sk": `MINT#`,
      ":true": true,
    },
    FilterExpression: "#minted <> :true",
  };

  console.log("Params: ", JSON.stringify(params, null, 2));

  const { Items = [] } = await dynamo.query(params).promise();
  if (Items.length === 0) {
    throw { status: 400, message: "No mints found for event" };
  }

  return Items.map((i) => {
    i.id = i.sk.split("#").pop();
    return i;
  });
};

const updateMint = async (mintRecord) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      pk: mintRecord.pk,
      sk: mintRecord.sk,
    },
    UpdateExpression: "SET #minted = :true",
    ExpressionAttributeNames: {
      "#minted": "minted",
    },
    ExpressionAttributeValues: {
      ":true": true,
    },
  };

  await dynamo.update(params).promise();
};

const mintTicket = async (connection, masterKeypair, mint) => {
  let masterWallet = new anchor.Wallet(masterKeypair);
  const myCandyMachine = await candymachine.getCandyMachineState(
    masterWallet,
    CANDY_MACHINE_ID,
    connection
  );

  try {
    await candymachine.mintOneToken(
      myCandyMachine,
      masterWallet.publicKey,
      mint
    );
  } catch (err) {
    console.log("Failed to mint");
    console.error(err);
  }
};
