const common = require("../common/common");
const passport = require("passport");

module.exports = {
  getAcccount: async (req, res, next) => {
    const account = await common.dbClient.getAccountById(req);
    res.status(200).json({ account: account.toAuthJSON() });
  },

  getAcccounts: async (req, res, next) => {
    const accounts = await common.dbClient.getAllAccounts();
    res.status(200).json(accounts);
  },

  newAccount: async (req, res, next) => {
    let role = "owner";
    if (req.body.account.role === "agent") {
      role = "agent";
    }

    const account = await common.dbClient.createAccount(req, role);
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
    const document = await common.dbClient.uploadDocument(req);
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
