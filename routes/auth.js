var jwt = require("express-jwt");

function getTokenFromHeader(req) {
  console.log("Looking for token!");
  console.log(req.url);
  console.log(req.headers);
  if (
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Token") ||
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  return null;
}

var auth = {
  required: jwt({
    secret: process.env.AUTH_SECRET,
    userProperty: "payload",
    getToken: getTokenFromHeader
  }),
  optional: jwt({
    secret: process.env.AUTH_SECRET,
    userProperty: "payload",
    credentialsRequired: false,
    getToken: getTokenFromHeader
  })
};

module.exports = auth;
