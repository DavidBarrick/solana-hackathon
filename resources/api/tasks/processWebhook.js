const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { Keypair, PublicKey, Connection } = require("@solana/web3.js");
const candymachine = require("./helpers/candymachine");
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
  const { user_id } = metadata;

  try {
    const phone_number = await fetchUser(user_id);
    const connection = new Connection(RPC_HOST);
    const mint = await mintTicket(connection, user_id);
    await sendConfirmationMessage(mint, phone_number);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result }, null, 2),
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

const fetchUser = async (user_id) => {
  const params = {
    UserPoolId: USER_POOL_ID /* required */,
    Username: user_id /* required */,
  };

  const res = await cognito.adminGetUser(params).promise();
  console.log("Res: ", JSON.stringify(res, null, 2));
  return res.UserAttributes.find((r) => r.Name === "phone_number").value;
};

const fetchSecretKey = async (user_id) => {
  const params = {
    Bucket: S3_BUCKET,
    Key: `${user_id}/secretkey.json`,
  };

  try {
    const { Body } = await s3.getObject(params).promise();
    return JSON.parse(Body.toString());
  } catch (err) {
    console.log(`No wallet for user: ${user_id}`);
    throw { status: 404, messages: `User not found` };
  }
};

const mintTicket = async (connection, user_id) => {
  const secretKey = await fetchSecretKey(user_id);
  const signer = Keypair.fromSecretKey(Buffer.from(secretKey));
  const myCandyMachine = await CandyMachineUtils.getCandyMachineState(
    signer,
    CANDY_MACHINE_ID,
    connection
  );
  const { mint } = await candymachine.mintOneToken(myCandyMachine, signer);
  return mint;
};

const sendConfirmationMessage = async (mint, phone_number) => {
  const params = {
    Message: `You've got a ticket! Check it out here: https://explorer.solana.com/address/${mint}?cluster=devnet` /* required */,
    PhoneNumber: phone_number,
  };

  await sns.publish(params).promise();
};
