var mongoose = require("mongoose");

var DocumentSchema = new mongoose.Schema({
  name: String,
  url: String,
  notarized: Boolean
});

const Document = mongoose.model("Document", DocumentSchema);
module.exports = Document;
