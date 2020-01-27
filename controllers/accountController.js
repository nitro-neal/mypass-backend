const Account = require("../models/Account");
const passport = require("passport");

module.exports = {
  getAcccounts: async (req, res, next) => {
    res.status(200).json({ account: [] });
  }
};
