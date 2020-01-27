const Account = require("../models/Account");
const passport = require("passport");

module.exports = {
  getAcccounts: async (req, res, next) => {
    const accounts = await Account.find({});
    res.status(200).json(accounts);
  },

  newAccount: async (req, res, next) => {
    const newAccount = new Account();
    newAccount.username = req.body.account.username;
    newAccount.email = req.body.account.email;
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
        console.log("PASSPORT ERROR");
        return next(err);
      }

      if (account) {
        console.log("User Login!");
        account.token = account.generateJWT();
        return res.json({ account: account.toAuthJSON() });
      } else {
        return res.status(422).json(info);
      }
    })(req, res, next);
  }
};
