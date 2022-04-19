const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const { PublicKey, Connection, TokenAccount } = require("@solana/web3.js");
const { Metadata } = require("@metaplex-foundation/mpl-token-metadata");

const { TOKEN_PROGRAM_ID, getAccount } = require("@solana/spl-token");

const S3_BUCKET = process.env.S3_BUCKET;
const TABLE_NAME = process.env.TABLE_NAME;

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { requestContext = {} } = event;
  const { authorizer = {} } = requestContext;
  const { claims = {} } = authorizer;
  const { sub: user_id } = claims;

  try {
    const events = await fetchEvents();
    const pubkey = await fetchWallet(user_id);
    const tickets = await fetchDBTickets(user_id);

    for (const kydEvent of events) {
      const isPurchased = tickets.find((t) => t.event_id === kydEvent.id);
      kydEvent.is_purchased = !!isPurchased;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          success: true,
          result: { pubkey, events, tickets },
        },
        null,
        2
      ),
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

const fetchWallet = async (user_id) => {
  const params = {
    Bucket: S3_BUCKET,
    Key: `${user_id}/pubkey.json`,
  };

  try {
    const { Body } = await s3.getObject(params).promise();
    const pubkey = new PublicKey(JSON.parse(Body.toString()));
    return pubkey.toString();
  } catch (err) {
    console.log(`No wallet for user: ${user_id}`);
    throw { status: 404, messages: `User not found` };
  }
};

const fetchEvents = async () => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: "sk-data-index",
    KeyConditionExpression: `#sk = :sk`,
    ExpressionAttributeNames: {
      "#sk": "sk",
    },
    ExpressionAttributeValues: {
      ":sk": "EVENT#CREATED",
    },
  };

  const { Items = [] } = await dynamo.query(params).promise();
  return Items.map((i) => {
    i.metadata.id = i.pk.split("#").pop();
    i.metadata.remaining = i.metadata.capacity - (i.metadata.claimed || 0);
    i.metadata.sold_out = i.metadata.capacity === i.metadata.claimed;
    return i.metadata;
  });
};

const fetchDBTickets = async (user_id) => {
  const d = new Date();
  d.setHours(d.getHours() - 12);
  const params = {
    TableName: TABLE_NAME,
    IndexName: "sk-data-index",
    KeyConditionExpression: "#sk = :sk AND #data BETWEEN :start AND :end",
    ExpressionAttributeNames: {
      "#sk": "sk",
      "#data": "data",
    },
    ExpressionAttributeValues: {
      ":sk": `USER#${user_id}`,
      ":start": `TICKET#OPEN#${d.toISOString()}`,
      ":end": `TICKET#P`,
    },
  };

  console.log("Params: ", JSON.stringify(params, null, 2));

  const { Items = [] } = await dynamo.query(params).promise();

  Items.forEach((i) => {
    i.id = i.pk.split("#").pop();
    i.event_id = i.metadata.event_id;
  });

  return Items;
};

const fetchTickets = async (connection, pubkey) => {
  console.log("Fetch Tickets: ", pubkey);

  const { value: accounts = [] } = await connection.getTokenAccountsByOwner(
    new PublicKey(pubkey),
    { programId: TOKEN_PROGRAM_ID },
    "processed"
  );

  const metadatas = [];
  for (const account of accounts) {
    const tokenAccount = await getAccount(connection, account.pubkey);

    if (tokenAccount.amount === BigInt(1)) {
      try {
        const metadataPDA = await Metadata.getPDA(tokenAccount.mint);
        const metadata = await Metadata.load(connection, metadataPDA);
        metadatas.push(metadata.data.data);
      } catch (err) {
        console.log("Could not fetch metadata: ", tokenAccount.mint.toString());
      }
    }
  }

  console.log(metadatas);
  return metadatas;
};
