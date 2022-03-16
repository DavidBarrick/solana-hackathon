const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { Keypair } = require("@solana/web3.js");

const S3_BUCKET = process.env.S3_BUCKET;

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { userName } = event;
  try {
    const exists = await walletExists(userName);
    console.log("Wallet Exists: ", exists);
    if (!exists) {
      await createWallet(userName);
    }
  } catch (err) {
    console.error(err);
    console.error(`Failed to check or create wallet: ${userName}`);
  }

  event.response.autoConfirmUser = true;
  event.response.autoVerifyPhone = true;
  return event;
};

const walletExists = async (user_id) => {
  const params = {
    Bucket: S3_BUCKET,
    Key: `${user_id}/keypair.json`,
  };

  try {
    await s3.getObject(params).promise();
    return true;
  } catch (err) {
    console.log(`Should create wallet: ${user_id}`);
    return false;
  }
};

const createWallet = async (user_id) => {
  const keypair = Keypair.generate();

  const secretArray = Array.from(keypair.secretKey);
  const pubkeyArray = Array.from(keypair.publicKey.toBytes());

  const params = {
    Bucket: S3_BUCKET,
    Key: `${user_id}/secretkey.json`,
    Body: JSON.stringify(secretArray),
  };

  await s3.putObject(params).promise();

  params.Key = `${user_id}/pubkey.json`;
  params.Body = JSON.stringify(pubkeyArray);

  await s3.putObject(params).promise();

  params.Key = `${user_id}/keypair.json`;
  params.Body = JSON.stringify(secretArray.concat(pubkeyArray));

  await s3.putObject(params).promise();
};
