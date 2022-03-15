const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { Keypair, PublicKey } = require("@solana/web3.js");
const stripe = require("stripe")(process.env.STRIPE_SK);

const S3_BUCKET = process.env.S3_BUCKET;

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { requestContext = {} } = event;
  const { authorizer = {} } = requestContext;
  const { claims = {} } = authorizer;
  const { sub: user_id } = claims;

  try {
    const url = await createCheckoutSession(user_id);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result: { url } }, null, 2),
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

const createCheckoutSession = async (user_id) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "T-shirt",
          },
          unit_amount: 2000,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: "http://localhost:3001/success",
    cancel_url: "http://localhost:3001/home",
    metadata: {
      user_id,
    },
  });

  return session.url;
};
