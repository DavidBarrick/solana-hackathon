const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { PublicKey, Connection, TokenAccount } = require("@solana/web3.js");
const { Metadata } = require("@metaplex-foundation/mpl-token-metadata");

const { TOKEN_PROGRAM_ID, getAccount } = require("@solana/spl-token");
const { KYD_EVENTS } = require("./helpers/utils");

const S3_BUCKET = process.env.S3_BUCKET;
const RPC_HOST = process.env.RPC_HOST;

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { requestContext = {} } = event;
  const { authorizer = {} } = requestContext;
  const { claims = {} } = authorizer;
  const { sub: user_id } = claims;

  try {
    const pubkey = await fetchWallet(user_id);
    const tickets = await fetchTickets(pubkey);

    for (const kydEvent of KYD_EVENTS) {
      const isPurchased = tickets.find((t) => t.symbol === kydEvent.title);
      kydEvent.is_purchased = !!isPurchased;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(
        { success: true, result: { pubkey, events: KYD_EVENTS, tickets } },
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

const fetchTickets = async (pubkey) => {
  console.log("Fetch Tickets: ", pubkey);

  const connection = new Connection(RPC_HOST, "confirmed");
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
