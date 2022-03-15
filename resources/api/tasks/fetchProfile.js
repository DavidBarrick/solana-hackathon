const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { PublicKey } = require("@solana/web3.js");

const S3_BUCKET = process.env.S3_BUCKET;

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { requestContext = {} } = event;
  const { authorizer = {} } = requestContext;
  const { claims = {} } = authorizer;
  const { sub: user_id } = claims;

  try {
    const pubkey = await fetchWallet(user_id);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result: { pubkey } }, null, 2),
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
    console.log("PubKey: ", pubkey.toString());
    return pubkey.toString();
  } catch (err) {
    console.log(`No wallet for user: ${user_id}`);
    throw { status: 404, messages: `User not found` };
  }
};
