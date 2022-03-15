// Import the NFTStorage class and File constructor from the 'nft.storage' package
const { NFTStorage, File } = require("nft.storage");

// The 'mime' npm package helps us set the correct file type on our File objects
const mime = require("mime");

// The 'fs' builtin module on Node.js provides access to the file system
const fs = require("fs");

// The 'path' module provides helpers for manipulating filesystem paths
const path = require("path");
const fetch = require("node-fetch");

const basePath = process.cwd();
const buildDir = `${basePath}/build/draggo`;

const TOKENS = 100;

const loadCredentials = () => {
  const jsonKeypair = fs.readFileSync(`${basePath}/utils/credentials.json`, {
    encoding: "utf-8",
  });

  return JSON.parse(jsonKeypair);
};

/**
 * Reads an image file from `imagePath` and stores an NFT with the given name and description.
 * @param {string} imagePath the path to an image file
 * @param {string} name a name for the NFT
 * @param {string} description a text description for the NFT
 */
const storeNFT = async (index) => {
  // load the file from disk
  const { NFT_STORAGE_API_KEY } = loadCredentials();
  const imagePath = `${buildDir}/images/${index}.png`;

  const manifestBuffer = fs.readFileSync(`${buildDir}/json/${index}.json`);
  const [url] = await nftStorageUpload(
    NFT_STORAGE_API_KEY,
    imagePath,
    manifestBuffer,
    index
  );
  /*
  // create a new NFTStorage client using our API key
  const nftstorage = new NFTStorage({ token: NFT_STORAGE_API_KEY });
  const json = JSON.parse(
    fs.readFileSync(`${buildDir}/json/${index}.json`, {
      encoding: "utf-8",
    })
  );
  // call client.store, passing in the image & metadata
  const { ipnft } = await nftstorage.store({
    ...json,
    image: imageFile,
  });

  /*console.log("Image CID: ", imageCid);

  const json = JSON.parse(
    fs.readFileSync(`${buildDir}/json/${index}.json`, {
      encoding: "utf-8",
    })
  );
  json.image = `https://${imageCid}.ipfs.dweb.link?ext=png`;
  fs.writeFileSync(`${buildDir}/json/${index}.json`, JSON.stringify(json));

  const jsonFile2 = await fileFromPath(`${buildDir}/json/${index}.json`);
  const { ipnft: uriCID } = await nftstorage.store({
    image: jsonFile2,
    name: `Draggo #${index} Metadata`,
    description: `Draggo #${index} Metadata Description`,
  });*/

  return url;
};

/**
 * A helper to read a file from a location on disk and return a File object.
 * Note that this reads the entire file into memory and should not be used for
 * very large files.
 * @param {string} filePath the path to a file to store
 * @returns {File} a File object containing the file content
 */
const fileFromPath = async (filePath) => {
  const content = await fs.promises.readFile(filePath);
  const type = mime.getType(filePath);
  console.log("Type: ", type);
  return new File([content], path.basename(filePath), { type });
};

/**
 * The main entry point for the script that checks the command line arguments and
 * calls storeNFT.
 *
 * To simplify the example, we don't do any fancy command line parsing. Just three
 * positional arguments for imagePath, name, and description
 */
const main = async () => {
  const retval = [];
  for (var i = 0; i < TOKENS; i++) {
    const uri = await storeNFT(i);
    retval.push(uri);
  }

  fs.writeFileSync(`${buildDir}/hatched.json`, JSON.stringify(retval));
  console.log(retval);
};

async function nftStorageUpload(nftStorageKey, image, manifestBuffer, index) {
  async function uploadMedia(media) {
    const stats = fs.statSync(media);
    const readStream = fs.createReadStream(media);
    console.log(`Media Upload ${media}`);
    return fetch("https://api.nft.storage/upload", {
      method: "POST",
      headers: {
        "Content-length": stats.size,
        Authorization: `Bearer ${nftStorageKey}`,
      },
      body: readStream, // Here, stringContent or bufferContent would also work
    })
      .then((response) => response.json())
      .then((mediaUploadResponse) => {
        const mediaURL = `https://${mediaUploadResponse.value.cid}.ipfs.dweb.link`;
        return mediaURL;
      })
      .catch((error) => {
        console.log(error);
        throw new Error(`Media Upload Error: ${error}`);
      });
  }

  // Copied from ipfsUpload
  const imageUrl = `${await uploadMedia(image)}?ext=${path
    .extname(image)
    .replace(".", "")}`;

  const manifestJson = JSON.parse(manifestBuffer.toString("utf8"));
  manifestJson.image = imageUrl;

  console.log("Upload metadata");
  const metaData = Buffer.from(JSON.stringify(manifestJson));
  fs.writeFileSync(
    `${buildDir}/json/${index}.json`,
    JSON.stringify(manifestJson)
  );

  return fetch("https://api.nft.storage/upload", {
    method: "POST",
    headers: {
      "Content-length": metaData.byteLength,
      Authorization: `Bearer ${nftStorageKey}`,
    },
    body: metaData, // Here, stringContent or bufferContent would also work
  })
    .then((response) => response.json())
    .then((metaUploadResponse) => {
      const link = `https://${metaUploadResponse.value.cid}.ipfs.dweb.link`;
      console.log("Upload End");
      console.log([link, imageUrl]);

      return [link, imageUrl];
    })
    .catch((error) => {
      console.log(error);
      throw new Error(`Metadata Upload Error: ${error}`);
    });
}

// Don't forget to actually call the main function!
// We can't `await` things at the top level, so this adds
// a .catch() to grab any errors and print them to the console.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
