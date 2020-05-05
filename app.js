// Load .env files
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const cors = require("cors");
const fileUpload = require("express-fileupload");

console.log("secret");
console.log(process.env.SESSION_SECRET);
if (process.env.SESSION_SECRET === undefined) {
  console.log("init startup no secrets");
  const router = require("./routes-admin");
  const app = express();
  app.use(express.static(__dirname + "/public"));
  app.use(bodyParser.json());
  app.use(fileUpload({ useTempFiles: true }));
  app.use(cors());
  app.use(router);

  app.use(function (err, req, res, next) {
    console.log(err.stack);

    res.status(err.status || 500);

    res.json({
      errors: {
        message: err.message,
        error: err,
      },
    });
  });

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  app.get("/restart", (req, res) => {
    console.log("This is pid " + process.pid);
    setTimeout(function () {
      process.on("exit", function () {
        require("child_process").spawn(process.argv.shift(), process.argv, {
          cwd: process.cwd(),
          detached: true,
          stdio: "inherit",
        });
      });
      process.exit();
    }, 5000);
    console.log("restarting");
  });

  const server = app.listen(process.env.PORT || 5000, function () {
    console.log("Listening on port " + server.address().port);
  });
} else {
  const MongoDbClient = require("./database/mongodb/MongoDbClient");
  const UportClient = require("./services/blockchain/UportClient");

  const router = require("./routes");
  const common = require("./common/common");
  const { errors } = require("celebrate");

  require("./routes/middleware/passport");
  const app = express();

  // Set Up Clients.
  const dbClient = new MongoDbClient();
  const blockchainClient = new UportClient();

  common.dbClient = dbClient;
  common.blockchainClient = blockchainClient;

  app.use(express.static(__dirname + "/public"));
  app.use(bodyParser.json());
  app.use(fileUpload({ useTempFiles: true }));

  // Using NGIX cors config if production
  if (process.env.ENVIRONMENT === "DEVELOPMENT") {
    app.use(cors());
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      cookie: { maxAge: 60000 },
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(errors());

  app.use(router);

  // error handler
  app.use(function (err, req, res, next) {
    console.log(err.stack);

    res.status(err.status || 500);

    res.json({
      errors: {
        message: err.message,
        error: err,
      },
    });
  });

  const server = app.listen(process.env.PORT || 5000, function () {
    console.log("Listening on port " + server.address().port);
  });
}
