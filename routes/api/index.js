const router = require("express").Router();

const AccountController = require("../../controllers/accountController");
const DocumentController = require("../../controllers/documentController");
const AdminController = require("../../controllers/adminController");

const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { isAllowedUploadDocument } = require("../middleware/permission");

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
    [auth.required, isAllowedUploadDocument, upload.single("img")],
    DocumentController.uploadDocument
  );

// TODO: Add auth jwt to parameter for authorized images
router.route("/documents/:filename").get(DocumentController.getDocument);

// Admin - TODO: Add Admin Auth Only
router
  .route("/admin/rolePermissionTable")
  .get(AdminController.getRolePermissionTable)
  .post(AdminController.newRolePermissionTable);

router
  .route("/admin/generateDefaultRolePermissionsTable")
  .get(AdminController.generateDefaultRolePermissionsTable);

// Admin - Roles
router
  .route("/roles")
  .get(auth.required, AdminController.getRoles)
  .post(auth.required, AdminController.newRole);

// Admin - Permissions
router
  .route("/permissions")
  .get(auth.required, AdminController.getPermissions)
  .post(auth.required, AdminController.newPermission);

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
