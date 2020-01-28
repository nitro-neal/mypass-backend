const router = require("express").Router();
const AccountController = require("../../controllers/accountController");
const auth = require("../auth");
const upload = require("../upload");

router
  .route("/accounts")
  .get(AccountController.getAcccounts)
  .post(AccountController.newAccount);

router.route("/accounts/login").post(AccountController.login);

router
  .route("/accounts/documents/")
  .get(auth.required, AccountController.getDocuments)
  .post(
    [upload.single("img"), auth.required],
    AccountController.uploadDocument
  );

// TODO: Add auth jwt to parameter for authorized images
router
  .route("/accounts/documents/:filename")
  .get(AccountController.getDocument);

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
