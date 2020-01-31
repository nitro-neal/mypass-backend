const mongoose = require("mongoose");
const grid = require("gridfs-stream");

const Account = require("./models/Account");
const Document = require("./models/Document");

class MongoDbClient {
  constructor(app) {
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

  async createAccount(req, role) {
    const newAccount = new Account();
    newAccount.username = req.body.account.username;
    newAccount.email = req.body.account.email;
    newAccount.role = role;
    newAccount.setPassword(req.body.account.password);

    const account = await newAccount.save();
    return account;
  }

  async uploadDocument(req) {
    const newDocument = new Document();
    newDocument.name = req.file.originalName;
    newDocument.url = req.file.filename;
    const document = await newDocument.save();

    const account = await Account.findById(req.payload.id);
    account.documents.push(document);
    await account.save();

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
