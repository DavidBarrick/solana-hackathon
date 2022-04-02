const AWS = require("aws-sdk");
const s3 = new AWS.S3();

const candymachine = require("./helpers/candymachine");

const S3_BUCKET = process.env.S3_BUCKET;
const RPC_HOST = process.env.RPC_HOST;
const CANDY_MACHINE_ID = process.env.CANDY_MACHINE_ID;

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { requestContext = {} } = event;
  const { authorizer = {} } = requestContext;
  const { claims = {} } = authorizer;
  const { sub: user_id } = claims;

  //const { code = "" } = JSON.parse(body);

  //const [pubkeyString, mintString, isoDateString, checksum] = code.split("#");

  try {
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          success: true,
          result: {
            is_valid: true,
            valid_reason: "",
            name: "David Barrick",
            ticket: "do2wwjJRN4Tt2xtk71hzaixmGw8yqxL3Dh8eF2phryJ",
          },
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
