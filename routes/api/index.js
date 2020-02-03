const router = require("express").Router();
const AccountController = require("../../controllers/accountController");
const DocumentController = require("../../controllers/documentController");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// Accounts
router.route("/account").get(auth.required, AccountController.getAcccount);

router
  .route("/accounts")
  .get(auth.required, AccountController.getAcccounts)
  .post(AccountController.newAccount);

router.route("/accounts/login").post(AccountController.login);

// Documents
router
  .route("/documents/")
  .get(auth.required, DocumentController.getDocuments)
  .post(
    [upload.single("img"), auth.required],
    DocumentController.uploadDocument
  );

// TODO: Add auth jwt to parameter for authorized images
router.route("/documents/:filename").get(DocumentController.getDocument);

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
