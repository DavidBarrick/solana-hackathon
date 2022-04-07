const AWS = require("aws-sdk");
const { Keypair } = require("@solana/web3.js");
const dynamo = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");
const s3 = new AWS.S3();

const testEvent = {
  title: "KYDMIAMI - Yacht Mixer",
  symbol: "KYDMIAMI",
  date: "April 9th, 2022",
  time: "2pm - 6pm",
  image: "https://miami.kydlabs.com/assets/poster1.jpeg",
  location: "On a Yacht",
  location_link: "",
  price: 5,
  seat: "GA",
  capacity: 25,
  claimed: 0,
  candy_machine_id: "Ecge52Czojtz3Mnsq25JwCJtxYtmrYCfS5amoggwNM4A",
  description:
    "Enjoy the sunset with an open bar, cerveza's, great music and people as we combine culture in web3 in an intimate experience only the kyd team can deliver. All proceeds of this event are donated to SAVETHECHILDREN.",
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
    candy_machine_id,
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
    claimed: 0,
    candy_machine_id,
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
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: `EVENT#${eventId}`,
            sk: `CM#${candy_machine_id}`,
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

  await createEventMasterWallet(eventId);

  return eventId;
};

const createDynamoDBWallet = async (eventId, index) => {
  const mint = await createWallet(eventId);
  const params = {
    TableName: TABLE_NAME,
    Item: {
      pk: `EVENT#${eventId}`,
      sk: `MINT#OPEN#${index.toString().padStart(5, "0")}#${mint}`,
      data: `EVENT#OPEN#${new Date().toISOString()}`,
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

const createEventMasterWallet = async (eventId) => {
  const keypair = Keypair.generate();

  const secretArray = Array.from(keypair.secretKey);
  const pubkeyArray = Array.from(keypair.publicKey.toBytes());

  const params = {
    Bucket: S3_BUCKET,
    Key: `events/${eventId}/master/secretkey.json`,
    Body: JSON.stringify(secretArray),
  };

  await s3.putObject(params).promise();

  params.Key = `events/${eventId}/master/pubkey.json`;
  params.Body = JSON.stringify(pubkeyArray);

  await s3.putObject(params).promise();

  params.Key = `events/${eventId}/master/keypair.json`;
  params.Body = JSON.stringify(secretArray.concat(pubkeyArray));

  await s3.putObject(params).promise();

  return keypair.publicKey.toString();
};
