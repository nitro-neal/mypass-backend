const EthrDID = require("ethr-did");
const Web3 = require("web3");
const createVerifiableCredential = require("did-jwt-vc")
  .createVerifiableCredential;
const createPresentation = require("did-jwt-vc").createPresentation;
const Resolver = require("did-resolver").Resolver;
const getResolver = require("ethr-did-resolver").getResolver;
const verifyCredential = require("did-jwt-vc").verifyCredential;
const verifyPresentation = require("did-jwt-vc").verifyPresentation;

const web3 = new Web3();

class UportClient {
  constructor() {}

  async createNewDID() {
    const account = web3.eth.accounts.create();
    const privKeyWithoutHeader = account.privateKey.substring(2);
    let did = { address: account.address, privateKey: privKeyWithoutHeader };
    return did;
  }

  async createVC(
    issuerAddress,
    issuerPrivateKey,
    documentDID,
    issueTime,
    hash
  ) {
    const ethrDid = new EthrDID({
      address: issuerAddress,
      privateKey: issuerPrivateKey
    });

    const vcPayload = {
      sub: documentDID,
      nbf: issueTime,
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential"],
        credentialSubject: {
          driversLicense: {
            type: "TexasDriversLicense",
            hash: hash
          }
        }
      }
    };

    const vcJwt = await createVerifiableCredential(vcPayload, ethrDid);
    return vcJwt;
  }
}

module.exports = UportClient;
