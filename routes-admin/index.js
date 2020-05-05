var router = require("express").Router();
const BootAdminController = require("../controllers/bootAdminController");

// router.use("/api", require("./api"));
router.route("/homepage", BootAdminController.getHomePage);

module.exports = router;
