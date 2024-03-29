const { FileSafe } = require("./FileSafe");
const common = require("../common/common");
const Crypto = require("crypto");
let vault;
let safe;

if (process.env.ENVIRONMENT === "HEROKU") {
} else if (process.env.ENVIRONMENT === "DEVELOPMENT") {
  safe = new FileSafe("safe.dat", process.env.FILE_SAFE_KEY);
  try {
    safe.decrypt();
  } catch (err) {
    console.log("Creating new encryption file");
    let emptyJson = {};
    safe.encrypt(emptyJson);
  }
} else {
  vault = require("node-vault")({ endpoint: "http://myvault:8200" });
  if (process.env.VAULT_KEY) {
    vault.unseal({ secret_shares: 1, key: process.env.VAULT_KEY });
    vault.token = process.env.VAULT_ROOT_TOKEN;
  } else {
    vault
      .init({ secret_shares: 1, secret_threshold: 1 })
      .then((result) => {
        console.log("Inital Keys:");
        console.log(result);

        var keys = result.keys;
        // set token for all following requests
        vault.token = result.root_token;
        // unseal vault server
        vault.unseal({ secret_shares: 1, key: keys[0] }).then((sealRes) => {
          console.log(sealRes);
          vault.mount({
            mount_point: "secret",
            type: "generic",
            description: "keys",
          });
        });
      })
      .catch(console.error);
  }
}

module.exports = {
  store: async (guid, key) => {
    if (process.env.ENVIRONMENT === "HEROKU") {
      let cipher = Crypto.createCipher(
        "aes-256-cbc",
        process.env.FILE_SAFE_KEY
      );
      let encryptedKey = cipher.update(key, "utf8", "hex");
      encryptedKey += cipher.final("hex");

      await common.dbClient.store(guid, encryptedKey);
    } else if (process.env.ENVIRONMENT === "DEVELOPMENT") {
      let data = safe.decrypt();
      data[guid] = key;
      safe.encrypt(data);
    } else {
      await vault.write("secret/" + guid, { value: key });
    }
  },
  retrieve: async (guid) => {
    if (process.env.ENVIRONMENT === "HEROKU") {
      const keyObj = await common.dbClient.retrieve(guid);

      let decipher = Crypto.createDecipher(
        "aes-256-cbc",
        process.env.FILE_SAFE_KEY
      );

      let decryptedKey = decipher.update(keyObj.encryptedKey, "hex", "utf8");
      decryptedKey += decipher.final("utf8");

      return decryptedKey;
    } else if (
      process.env.ENVIRONMENT === "DEVELOPMENT" ||
      process.env.ENVIRONMENT === "HEROKU"
    ) {
      let data = safe.decrypt();
      return data[guid];
    } else {
      const value = await vault.read("secret/" + guid);
      return value.data.value;
    }
  },
};
