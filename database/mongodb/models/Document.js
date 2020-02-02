var mongoose = require("mongoose");

var DocumentSchema = new mongoose.Schema({
  name: String,
  url: String,
  notarized: Boolean,
  did: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Account" }
});

const Document = mongoose.model("Document", DocumentSchema);
module.exports = Document;
