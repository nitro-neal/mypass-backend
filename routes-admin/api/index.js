const router = require("express").Router();

const BootAdminController = require("../../controllers/bootAdminController");

console.log("in router");
// Boot Admin
router.route("/homepage").get(BootAdminController.getHomePage);

router.use(function (err, req, res, next) {
  if (err.name === "ValidationError") {
    return res.status(422).json({
      errors: Object.keys(err.errors).reduce(function (errors, key) {
        errors[key] = err.errors[key].message;

        return errors;
      }, {}),
    });
  }

  return next(err);
});

module.exports = router;
