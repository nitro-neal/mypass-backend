const Account = require("../models/Account");
const Document = require("../models/Document");
const passport = require("passport");

module.exports = {
  getAcccounts: async (req, res, next) => {
    const accounts = await Account.find({});
    res.status(200).json(accounts);
  },

  newAccount: async (req, res, next) => {
    let role = "owner";
    if (req.body.account.role === "agent") {
      role = "agent";
    }

    const newAccount = new Account();
    newAccount.username = req.body.account.username;
    newAccount.email = req.body.account.email;
    newAccount.role = role;
    newAccount.setPassword(req.body.account.password);

    const account = await newAccount.save();
    return res.status(201).json({ account: account.toAuthJSON() });
  },

  login: async (req, res, next) => {
    if (!req.body.account.email) {
      return res.status(422).json({ errors: { email: "can't be blank" } });
    }

    if (!req.body.account.password) {
      return res.status(422).json({ errors: { password: "can't be blank" } });
    }

    passport.authenticate("local", { session: false }, (err, account, info) => {
      if (err) {
        return next(err);
      }

      if (account) {
        account.token = account.generateJWT();
        return res.json({ account: account.toAuthJSON() });
      } else {
        return res.status(422).json(info);
      }
    })(req, res, next);
  },

  uploadDocument: async (req, res, next) => {
    const newDocument = new Document();
    newDocument.name = req.file.originalName;
    newDocument.url = req.file.filename;
    const document = await newDocument.save();

    const account = await Account.findById(req.payload.id);
    account.documents.push(document);
    await account.save();

    res.status(200).json({ file: req.file });
  },

  getDocuments: async (req, res, next) => {
    const account = await Account.findById(req.payload.id);

    let documents = await Document.find({
      _id: {
        $in: account.documents
      }
    });

    res.status(200).json({ documents: documents });
  },

  getDocument: async (req, res, next) => {
    let gfs = req.app.get("gfs");

    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
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
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: "Not an image"
        });
      }
    });
  }
};
