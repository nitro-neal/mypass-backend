const mongoose = require("mongoose");
const grid = require("gridfs-stream");
const { imageHash } = require("image-hash");

const Account = require("./models/Account");
const Document = require("./models/Document");
const VerifiableCredential = require("./models/VerifiableCredential");
const VerifiablePresentation = require("./models/VerifiablePresentation");

class MongoDbClient {
  constructor() {
    this.mongoURI = process.env.MONGODB_URI;
    this.conn = mongoose.createConnection(this.mongoURI);
    mongoose.connect(this.mongoURI, { useNewUrlParser: true });

    this.conn.once("open", () => {
      this.gfs = grid(this.conn.db, mongoose.mongo);
      this.gfs.collection("uploads");
    });

    this.Account = Account;
    this.Document = Document;
  }

  async getAccountById(req) {
    const account = await Account.findById(req.payload.id);
    return account;
  }

  async getAllAccounts() {
    const accounts = await Account.find({});
    return accounts;
  }

  async createAccount(req, did) {
    const newAccount = new Account();
    newAccount.username = req.body.account.username;
    newAccount.email = req.body.account.email;
    newAccount.role = req.body.account.role;
    newAccount.didAddress = did.address;
    newAccount.didPrivateKey = did.privateKey;
    newAccount.setPassword(req.body.account.password);

    const account = await newAccount.save();
    return account;
  }

  async createVerifiableCredential(vcJwt, verifiedVC, issuer, document) {
    const newVC = new VerifiableCredential();
    newVC.vcJwt = vcJwt;
    newVC.verifiedVC = verifiedVC;
    newVC.issuer = issuer;
    newVC.document = document;
    newVC.documentDid = document.did;
    const vc = await newVC.save();

    document.vcJwt = vcJwt;
    await document.save();

    return vc;
  }

  async createVerifiablePresentation(vpJwt, verifiedVP, issuer, document) {
    const newVP = new VerifiablePresentation();
    newVP.vpJwt = vpJwt;
    newVP.verifiedVP = verifiedVP;
    newVP.issuer = issuer;
    newVP.document = document;
    newVP.documentDid = document.did;
    const vp = await newVP.save();

    document.vpJwt = vpJwt;
    await document.save();

    return vp;
  }

  // TODO: Add this to db helper class
  async generateHash(documentUrl) {
    return new Promise((resolve, reject) => {
      // Hash from URL
      let localUrl =
        "http://localhost:" +
        (process.env.PORT || 5000) +
        "/api/documents/" +
        documentUrl;

      imageHash(localUrl, 16, true, (error, data) => {
        if (error) throw error;
        resolve(data);
      });
    });
  }

  async uploadDocument(req) {
    const account = await Account.findById(req.payload.id);

    const newDocument = new Document();
    newDocument.name = req.file.originalName;
    newDocument.url = req.file.filename;
    newDocument.uploadedBy = account;
    const document = await newDocument.save();

    const hash = await this.generateHash(document.url);
    document.hash = hash;
    await document.save();

    if (req.body.uploadForAccountId !== undefined) {
      const uploadForAccount = await Account.findById(
        req.body.uploadForAccountId
      );
      uploadForAccount.documents.push(document);
      await uploadForAccount.save();
    } else {
      account.documents.push(document);
      await account.save();
    }

    return document;
  }

  async getDocuments(req) {
    const account = await Account.findById(req.payload.id);

    let documents = await Document.find({
      _id: {
        $in: account.documents
      }
    });

    return documents;
  }

  async getDocument(req, res) {
    this.gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: "No file exists"
        });
      }
      if (
        file.contentType === "image/jpeg" ||
        file.contentType === "image/png"
      ) {
        // Read output to browser
        const readstream = this.gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: "Not an image"
        });
      }
    });
  }
}

module.exports = MongoDbClient;
