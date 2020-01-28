let express = require("express"),
  bodyParser = require("body-parser"),
  session = require("express-session"),
  cors = require("cors"),
  mongoose = require("mongoose"),
  grid = require("gridfs-stream");

// Load .env files
require("dotenv").config();

const app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(cors());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false
  })
);

const mongoURI = process.env.MONGODB_URI;
const conn = mongoose.createConnection(mongoURI);
mongoose.connect(mongoURI, { useNewUrlParser: true });

let gfs;

conn.once("open", () => {
  gfs = grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
  console.log("Connection Successful");
  app.set("gfs", gfs);
});

require("./models/Account");
require("./models/Document");
require("./config/passport");

app.use(require("./routes"));

// error handler
app.use(function(err, req, res, next) {
  console.log(err.stack);

  res.status(err.status || 500);

  res.json({
    errors: {
      message: err.message,
      error: err
    }
  });
});

var server = app.listen(process.env.PORT || 5000, function() {
  console.log("Listening on port " + server.address().port);
});
