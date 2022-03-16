const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const {
  Keypair,
  PublicKey,
  Connection,
  Transaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const candymachine = require("./helpers/candymachine");
const { getAtaForMint } = require("./helpers/utils");
const anchor = require("@project-serum/anchor");
const splToken = require("@solana/spl-token");

const cognito = new AWS.CognitoIdentityServiceProvider();

const S3_BUCKET = process.env.S3_BUCKET;
const CANDY_MACHINE_ID = process.env.CANDY_MACHINE_ID;
const RPC_HOST = process.env.RPC_HOST;
const USER_POOL_ID = process.env.USER_POOL_ID;

const sns = new AWS.SNS();

const testEvent = {
  id: "evt_1Kdd2KJB5lOSXn7rZ2XgW4IE",
  object: "event",
  api_version: "2020-03-02",
  created: 1647360951,
  data: {
    object: {
      id: "cs_test_a1193XrnL3oqsgmmQlLqRfzcnFbftzXfoqA1X2o3F65FVmb9TfW6hXH5P3",
      object: "checkout.session",
      after_expiration: null,
      allow_promotion_codes: null,
      amount_subtotal: 2000,
      amount_total: 2000,
      automatic_tax: {
        enabled: false,
        status: null,
      },
      billing_address_collection: null,
      cancel_url: "http://localhost:3001/home",
      client_reference_id: null,
      consent: null,
      consent_collection: null,
      currency: "usd",
      customer: "cus_LKHbgXtFiIv4RR",
      customer_creation: "always",
      customer_details: {
        email: "thebarrick@gmail.com",
        phone: null,
        tax_exempt: "none",
        tax_ids: [],
      },
      customer_email: null,
      expires_at: 1647447326,
      livemode: false,
      locale: null,
      metadata: {
        user_id: "ac6768a0-805c-4bea-82ba-a6e2cec8efac",
      },
      mode: "payment",
      payment_intent: "pi_3Kdd1uJB5lOSXn7r0p3GzUNU",
      payment_link: null,
      payment_method_options: {},
      payment_method_types: ["card"],
      payment_status: "paid",
      phone_number_collection: {
        enabled: false,
      },
      recovered_from: null,
      setup_intent: null,
      shipping: null,
      shipping_address_collection: null,
      shipping_options: [],
      shipping_rate: null,
      status: "complete",
      submit_type: null,
      subscription: null,
      success_url: "http://localhost:3001/success",
      total_details: {
        amount_discount: 0,
        amount_shipping: 0,
        amount_tax: 0,
      },
      url: null,
    },
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: null,
    idempotency_key: null,
  },
  type: "checkout.session.completed",
};

module.exports.handler = async (event = {}) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const { body = "{}" } = event;
  const { data = {} } = testEvent; // JSON.parse(body);
  const { object = {} } = data;
  const { metadata = {} } = object;
  const { user_id } = metadata;

  try {
    const phone_number = await fetchUser(user_id);
    console.log("User      : ", phone_number);

    const connection = new Connection(RPC_HOST, "confirmed");
    const masterSecretKey = await fetchSecretKey("master");
    const userSecretKey = await fetchSecretKey(user_id);

    const masterSigner = Keypair.fromSecretKey(Buffer.from(masterSecretKey));
    const userSigner = Keypair.fromSecretKey(Buffer.from(userSecretKey));

    console.log("Master Key 1: ", masterSigner.publicKey.toString());
    console.log("User Key   1: ", userSigner.publicKey.toString());

    const masterWallet = new anchor.Wallet(masterSigner);
    const userWallet = new anchor.Wallet(userSigner);
    const mint = await mintTicket(connection, masterWallet, user_id);
    console.log("Minted Ticket: ", mint);
    await transferTicket(connection, masterSigner, userWallet, mint);
    await sendConfirmationMessage(mint, phone_number);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, result: { mint } }, null, 2),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (err) {
    console.log("Main handler catch");
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
  console.log("User: ", JSON.stringify(res, null, 2));
  const phone_number = res.UserAttributes.find(
    (r) => r.Name === "phone_number"
  ).Value;
  return phone_number;
};

const fetchSecretKey = async (user_id) => {
  console.log("Fetch Secret Key: ", user_id);
  const params = {
    Bucket: S3_BUCKET,
    Key: `${user_id}/${user_id === "master" ? "keypair" : "secretkey"}.json`,
  };

  try {
    const { Body } = await s3.getObject(params).promise();
    console.log("Body: ", Body.toString());
    return JSON.parse(Body.toString());
  } catch (err) {
    console.log(`No wallet for user: ${user_id}`);
    throw { status: 404, messages: `User not found` };
  }
};

const mintTicket = async (connection, masterWallet) => {
  const myCandyMachine = await candymachine.getCandyMachineState(
    masterWallet,
    CANDY_MACHINE_ID,
    connection
  );

  try {
    const { mint } = await candymachine.mintOneToken(
      myCandyMachine,
      masterWallet.publicKey
    );
    return mint;
  } catch (err) {
    console.log("Failed to mint");
    console.error(err);
  }
};

const transferTicket = async (connection, masterSigner, userWallet, mint) => {
  const mintPubkey = new PublicKey(mint);

  console.log("Master Key: ", masterSigner.publicKey.toString());
  console.log("User Key  : ", userWallet.publicKey.toString());

  const fromTokenAccount = await splToken.getAssociatedTokenAddress(
    mintPubkey,
    masterSigner.publicKey,
    false,
    splToken.TOKEN_PROGRAM_ID,
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const toTokenAccount = await splToken.getAssociatedTokenAddress(
    mintPubkey,
    userWallet.publicKey,
    false,
    splToken.TOKEN_PROGRAM_ID,
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const createAtaIstruction =
    candymachine.createAssociatedTokenAccountInstruction(
      toTokenAccount,
      masterSigner.publicKey,
      userWallet.publicKey,
      mintPubkey
    );

  const transaction = new Transaction().add(
    createAtaIstruction,
    splToken.createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      masterSigner.publicKey,
      1,
      [],
      splToken.TOKEN_PROGRAM_ID
    )
  );
  console.log("From: ", fromTokenAccount.toString());
  console.log("To  : ", toTokenAccount.toString());
  console.log("Transaction: ", transaction);

  let blockhash = (await connection.getRecentBlockhash("confirmed")).blockhash;
  console.log("Blockhash: ", blockhash);

  transaction.feePayer = masterSigner.publicKey;
  transaction.recentBlockhash = blockhash;

  const response = await sendAndConfirmTransaction(connection, transaction, [
    masterSigner,
  ]);

  console.log(response);
};

const sendConfirmationMessage = async (mint, phone_number) => {
  const params = {
    Message: `You've got a ticket! Check it out here: https://explorer.solana.com/address/${mint}?cluster=devnet` /* required */,
    PhoneNumber: phone_number,
  };

  await sns.publish(params).promise();
};
