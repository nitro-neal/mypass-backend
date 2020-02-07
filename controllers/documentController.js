const common = require("../common/common");

module.exports = {
  uploadDocument: async (req, res, next) => {
    const document = await common.dbClient.uploadDocument(req);

    // TODO: Should creating a VC be a different endpoint?
    if (req.body.uploadForAccountId !== undefined) {
      const account = await common.dbClient.getAccountById(req);

      // const issueTime = 1562950282;
      const issueTime = Math.floor(Date.now() / 1000);

      const vcJwt = await common.blockchainClient.createVC(
        account.didAddress,
        account.didPrivateKey,
        document.did,
        issueTime,
        document.hash
      );

      const vpJwt = await common.blockchainClient.createVP(
        account.didAddress,
        account.didPrivateKey,
        vcJwt
      );

      const verifiedVC = await common.blockchainClient.verifyVC(vcJwt);
      const verifiedVP = await common.blockchainClient.verifyVP(vpJwt);

      console.log("\n\nVERIFIED VC:\n");
      console.log(verifiedVC);

      console.log("\n\nVERIFIED VP:\n");
      console.log(verifiedVP);

      await common.dbClient.createVerifiableCredential(
        vcJwt,
        JSON.stringify(verifiedVC),
        account,
        document
      );

      await common.dbClient.createVerifiablePresentation(
        vpJwt,
        JSON.stringify(verifiedVP),
        account,
        document
      );
    }

    res.status(200).json({ file: document.url });
  },

  getDocuments: async (req, res, next) => {
    const documents = await common.dbClient.getDocuments(req);

    res.status(200).json({ documents: documents });
  },

  getDocument: async (req, res, next) => {
    return await common.dbClient.getDocument(req, res);
  }
};
