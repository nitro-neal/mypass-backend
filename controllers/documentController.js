const common = require("../common/common");
const documentStorageHelper = require("../common/documentStorageHelper");
const documentNotarization = require("../common/documentNotarization");
const permanent = require("../common/permanentClient");
const secureKeyStorage = require("../common/secureKeyStorage");

module.exports = {
  updateDocument: async (req, res, next) => {
    const documentId = req.params.documentId;
    const account = await common.dbClient.getAccountById(req.payload.id);
    const document = await common.dbClient.getDocumentById(documentId);

    if (!document.belongsTo._id.equals(account._id)) {
      res.status(403).json({
        error: "Account not authorized update this document",
      });
      return;
    }

    let md5 = document.hash;
    let filename = document.name;
    let permanentOrgFileArchiveNumber = document.permanentOrgFileArchiveNumber;
    let key = document.url;
    let thumbnailKey = document.thumbnailUrl;
    let validuntildate = req.body.validuntildate || document.validUntilDate;

    if (
      req.files !== undefined &&
      req.files !== null &&
      req.files.img !== undefined
    ) {
      const newFile =
        req.files.img[0] === undefined ? req.files.img : req.files.img[0];

      const newThumbnailFile =
        req.files.img[1] === undefined ? undefined : req.files.img[1];

      filename = newFile.name;
      md5 = newFile.md5;
      key = await documentStorageHelper.upload(newFile, "document");

      permanentOrgFileArchiveNumber = await permanent.addToPermanentArchive(
        newFile,
        key,
        account.permanentOrgArchiveNumber
      );

      if (newThumbnailFile) {
        thumbnailKey =
          newThumbnailFile === undefined
            ? undefined
            : await documentStorageHelper.upload(newThumbnailFile, "document");
      }
    }

    const updatedDocument = await common.dbClient.updateDocument(
      documentId,
      filename,
      key,
      thumbnailKey,
      permanentOrgFileArchiveNumber,
      md5,
      validuntildate
    );

    res.status(200).json({ updatedDocument: updatedDocument.toPublicInfo() });
  },

  uploadDocument: async (req, res, next) => {
    if (
      req.files === undefined ||
      req.files === null ||
      req.files.img === undefined
    ) {
      res.status(501).json({
        error: "Must include a file to upload.",
      });
      return;
    }

    if (req.body.type === undefined) {
      res.status(501).json({
        error:
          "Document Type Does Not Exist!, Must be of type: Passport, Birth Certificate...",
      });
      return;
    }

    const account = await common.dbClient.getAccountById(req.payload.id);

    const file =
      req.files.img[0] === undefined ? req.files.img : req.files.img[0];

    const thumbnailFile =
      req.files.img[1] === undefined ? undefined : req.files.img[1];

    const key = await documentStorageHelper.upload(file, "document");
    const thumbnailKey =
      thumbnailFile === undefined
        ? undefined
        : await documentStorageHelper.upload(thumbnailFile, "document");

    let permanentOrgFileArchiveNumber = await permanent.addToPermanentArchive(
      file,
      key,
      account.permanentOrgArchiveNumber
    );

    const document = await common.dbClient.createDocument(
      account,
      account,
      file.name,
      key,
      thumbnailKey,
      req.body.type,
      permanentOrgFileArchiveNumber,
      file.md5,
      req.body.validuntildate,
      req.body.encryptionPubKey
    );

    // fullUrl: "http://" + ip.address() +":" + (process.env.PORT || 5000) + "/api/documents/" + document.url + "/" + account.generateJWT()

    res.status(200).json({
      file: document.url,
      thumbnailUrl: document.thumbnailUrl,
      document: document.toPublicInfo(),
    });
  },

  uploadDocumentOnBehalfOfUser: async (req, res, next) => {
    if (
      req.files === undefined ||
      req.files === null ||
      req.files.img.length !== 4
    ) {
      res.status(501).json({
        error: "Must include files to upload.",
      });
      return;
    }

    if (req.body.type === undefined) {
      res.status(501).json({
        error:
          "Document Type Does Not Exist!, Must be of type: Passport, Birth Certificate...",
      });
      return;
    }

    if (req.body.uploadForAccountId === undefined) {
      res.status(501).json({
        error: "Must include accountId that you are uploading on behalf",
      });
    }

    const account = await common.dbClient.getAccountById(req.payload.id);
    const uploadForAccount = await common.dbClient.getAccountById(
      req.body.uploadForAccountId
    );

    const documentFile = req.files.img[0];

    const documentThumbnailFile = req.files.img[1];

    const documentForAccountFile = req.files.img[2];

    const documentForAccountThumbnailFile = req.files.img[3];

    const key = await documentStorageHelper.upload(documentFile, "document");
    const thumbnailKey = await documentStorageHelper.upload(
      documentThumbnailFile,
      "document"
    );

    let permanentOrgFileArchiveNumber = await permanent.addToPermanentArchive(
      documentForAccountFile,
      key,
      uploadForAccount.permanentOrgArchiveNumber
    );

    const keyForAccount = await documentStorageHelper.upload(
      documentForAccountFile,
      "document"
    );
    const thumbnailKeyForAccount = await documentStorageHelper.upload(
      documentForAccountThumbnailFile,
      "document"
    );

    const document = await common.dbClient.createDocument(
      uploadForAccount,
      uploadForAccount,
      documentForAccountFile.name,
      keyForAccount,
      thumbnailKeyForAccount,
      req.body.type,
      permanentOrgFileArchiveNumber,
      documentForAccountFile.md5,
      req.body.validuntildate,
      req.body.encryptionPubKey,
      false
    );

    let shareRequest = await common.dbClient.createShareRequest(
      account._id,
      uploadForAccount._id,
      req.body.type
    );

    shareRequest = await common.dbClient.approveOrDenyShareRequest(
      shareRequest._id,
      true,
      key,
      thumbnailKey
    );

    res.status(200).json({
      file: document.url,
      shareRequest: shareRequest,
      thumbnailUrl: document.thumbnailUrl,
      document: document.toPublicInfo(),
    });
  },

  getDocuments: async (req, res, next) => {
    const accountId = req.payload.id;
    const documents = await common.dbClient.getDocuments(accountId);

    res.status(200).json({ documents: documents });
  },

  getDocument: async (req, res, next) => {
    const accountId = req.payload.id;
    const filename = req.params.filename;
    let approved = false;
    let shareRequest;
    const document = await common.dbClient.getDocument(filename);

    if (document === undefined || document === null) {
      shareRequest = await common.dbClient.getShareRequestByUrl(filename);
    }

    if (
      (document === undefined || document === null) &&
      (shareRequest === undefined || shareRequest === null)
    ) {
      res.status(404).json({
        error: "Document Does Not Exists",
      });
      return;
    }

    if (
      shareRequest !== undefined &&
      shareRequest !== null &&
      shareRequest.shareWithAccountId === accountId
    ) {
      approved = true;
    }

    if (approved === true || document.belongsTo == accountId) {
      const payload = await documentStorageHelper.getDocumentBytes(
        filename,
        "document"
      );
      if (payload.error !== undefined) {
        res.status(404).json({
          error: payload.error,
        });
      } else {
        payload.pipe(res);
      }
    } else {
      res.status(403).json({
        error: "Account not authorized to view this document",
      });
    }
  },

  deleteDocument: async (req, res, next) => {
    const filename = req.params.filename;
    let deletedDocument = await common.dbClient.deleteDocument(filename);
    await documentStorageHelper.deleteDocumentBytes(filename, "document");

    await common.dbClient.deleteShareRequestByDocumentId(deletedDocument._id);

    res.status(200).json({ message: "success" });
  },

  getDocumentTypes: async (req, res, next) => {
    const documentTypes = await common.dbClient.getAllDocumentTypes();
    res.status(200).json({ documentTypes: documentTypes });
  },

  getTxtRecord: async (req, res, next) => {
    let txtRecord = await common.blockchainClient.getTxtRecord(
      req.params.recordId
    );

    res.status(200).json({ txtRecord: txtRecord });
  },

  createNotarizedDocument: async (req, res, next) => {
    const notaryAccount = await common.dbClient.getAccountById(req.payload.id);
    const ownerAccount = await common.dbClient.getAccountById(
      req.body.ownerAccountId
    );

    const documentType = req.body.type;
    const did = await common.blockchainClient.createNewDID();

    const documentDID = "did:ethr:" + did.address;
    const issueTime = Math.floor(Date.now() / 1000);
    const issuanceDate = Date.now();
    const expirationDate = new Date(req.body.expirationDate);
    const validityTimeSeconds = Math.round(
      (expirationDate - new Date()) / 1000
    );

    let notaryName = notaryAccount.firstName + notaryAccount.lastName;
    notaryName = notaryName.replace(/\s/g, "");
    const notaryId = "" + req.body.notaryId;

    let fileInfo = await documentNotarization.createNotarizedDocument(
      req.files.img[0],
      req.files.img[1],
      req.files.img[2],
      documentDID
    );

    let s3FileRequst = {
      name: "notarizedDocument.pdf",
      tempFilePath: fileInfo.filename,
    };

    let key = await documentStorageHelper.upload(s3FileRequst, "document");

    const document = await common.dbClient.createDocument(
      notaryAccount,
      ownerAccount,
      req.files.img[0].name +
        "-" +
        req.files.img[1].name +
        "-" +
        req.files.img[2].name,
      key,
      key,
      "Notarized " + documentType,
      "",
      fileInfo.md5,
      expirationDate,
      ""
    );

    let notaryPrivateKey = await secureKeyStorage.retrieve(
      notaryAccount.didPrivateKeyGuid
    );

    let notarizedVCJwt = await common.blockchainClient.createNotarizedVC(
      notaryAccount.didAddress,
      notaryPrivateKey,
      ownerAccount.didAddress,
      documentDID,
      documentType,
      fileInfo.md5,
      issueTime,
      issuanceDate,
      expirationDate,
      notaryName,
      notaryId
    );

    common.blockchainClient.storeJwtOnEthereumBlockchain(
      notarizedVCJwt,
      did,
      validityTimeSeconds
    );

    const verifiedVC = await common.blockchainClient.verifyVC(notarizedVCJwt);

    await common.dbClient.createVerifiableCredential(
      notarizedVCJwt,
      JSON.stringify(verifiedVC),
      ownerAccount,
      document,
      did.privateKey
    );

    // Check if owner is in mypass.eth txt record
    let ownertxtRecord = await common.blockchainClient.getTxtRecord(
      "did:ethr:" + ownerAccount.didAddress
    );

    if (ownertxtRecord === "" || ownertxtRecord === undefined) {
      console.log(
        ownerAccount.didAddress +
          " Not found in txt record. Adding to txt record..."
      );
      common.blockchainClient.setTxtRecord(
        "did:ethr:" + ownerAccount.didAddress,
        ownerAccount.firstName + " " + ownerAccount.lastName
      );
    }

    // Check if notary is in mypass.eth txt record
    let notarytxtRecord = await common.blockchainClient.getTxtRecord(
      "did:ethr:" + notaryAccount.didAddress
    );

    if (notarytxtRecord === "" || notarytxtRecord === undefined) {
      console.log(
        notaryAccount.didAddress +
          " Not found in txt record. Adding to txt record..."
      );
      common.blockchainClient.setTxtRecord(
        "did:ethr:" + notaryAccount.didAddress,
        notaryAccount.firstName + " " + notaryAccount.lastName
      );
    }

    res.status(200).json({
      vc: notarizedVCJwt,
      verifiedVC: verifiedVC,
      document: document.toPublicInfo(),
      didStatus: "https://etherscan.io/address/" + did.address,
    });
  },
};
