var router = require("express").Router();
const AccountController = require("../../controllers/accountController");

router
  .route("/accounts")
  .get(AccountController.getAcccounts)
  .post(AccountController.newAccount);

router.route("/accounts/login").post(AccountController.login);

router.use(function(err, req, res, next) {
  if (err.name === "ValidationError") {
    return res.status(422).json({
      errors: Object.keys(err.errors).reduce(function(errors, key) {
        errors[key] = err.errors[key].message;

        return errors;
      }, {})
    });
  }

  return next(err);
});

module.exports = router;
