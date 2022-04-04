const AWS = require("aws-sdk");
const { Keypair } = require("@solana/web3.js");
const dynamo = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");
const s3 = new AWS.S3();

const testEvent = {
  title: "KYD Miami",
  symbol: "KYDMIAMI",
  date: "April 8th, 2022",
  time: "7:00PM",
  image: "https://staging.draggos.xyz/assets/kyd_01.JPG",
  location: "Soho House",
  price: 5,
  seat: "GA",
  capacity: 20,
  description:
    "KYD is proud to announce our offical launch party at NYC's greatest venue: Madison Square Garden. Come for the mems.",
};

const TABLE_NAME = process.env.TABLE_NAME;
const S3_BUCKET = process.env.S3_BUCKET;

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  try {
    const eventId = await createEvent(testEvent);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result: { eventId } }, null, 2),
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

const createEvent = async (eventParams = {}) => {
  const eventId = `EV${uuidv4()}`;
  const {
    title,
    symbol,
    date,
    time,
    image,
    location,
    price,
    seat,
    description,
    capacity,
  } = eventParams;
  const metadata = {
    title,
    symbol,
    date,
    time,
    image,
    location,
    price,
    seat,
    description,
    capacity,
  };

  const params = {
    TransactItems: [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `EVENT#${eventId}`,
            sk: `EVENT#${eventId}`,
            data: "#",
            metadata,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `EVENT#${eventId}`,
            sk: `EVENT#CREATED`,
            data: `EVENT#OPEN#${new Date().toISOString()}`,
            metadata,
          },
        },
      },
    ],
  };

  await dynamo.transactWrite(params).promise();

  for (let i = 0; i < capacity; i++) {
    await createDynamoDBWallet(eventId, i);
  }

  return eventId;
};

const createDynamoDBWallet = async (eventId, index) => {
  const mint = await createWallet(eventId);
  const params = {
    TableName: TABLE_NAME,
    Item: {
      pk: `EVENT#${eventId}`,
      sk: `MINT#${mint}`,
      data: `EVENT#OPEN#${index
        .toString()
        .padStart(5, "0")}#${new Date().toISOString()}`,
    },
  };

  return dynamo.put(params).promise();
};

const createWallet = async (eventId) => {
  const keypair = Keypair.generate();

  const secretArray = Array.from(keypair.secretKey);
  const pubkeyArray = Array.from(keypair.publicKey.toBytes());

  const pubkeyString = keypair.publicKey.toString();

  const params = {
    Bucket: S3_BUCKET,
    Key: `events/${eventId}/mints/${pubkeyString}/secretkey.json`,
    Body: JSON.stringify(secretArray),
  };

  await s3.putObject(params).promise();

  params.Key = `events/${eventId}/mints/${pubkeyString}/pubkey.json`;
  params.Body = JSON.stringify(pubkeyArray);

  await s3.putObject(params).promise();

  params.Key = `events/${eventId}/mints/${pubkeyString}/keypair.json`;
  params.Body = JSON.stringify(secretArray.concat(pubkeyArray));

  await s3.putObject(params).promise();

  return keypair.publicKey.toString();
};
