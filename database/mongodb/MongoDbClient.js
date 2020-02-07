const mongoose = require("mongoose");
const grid = require("gridfs-stream");
const { imageHash } = require("image-hash");

const Account = require("./models/Account");
const Document = require("./models/Document");
const Role = require("./models/Role");
const Permission = require("./models/Permission");
const RolePermissionTable = require("./models/RolePermissionTable");
const VerifiableCredential = require("./models/VerifiableCredential");
const VerifiablePresentation = require("./models/VerifiablePresentation");

let mongoDbOptions = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true
};

class MongoDbClient {
  constructor() {
    this.cachedRolePermissionTable = undefined;
    this.mongoURI = process.env.MONGODB_URI;

    this.fileConnection = mongoose.createConnection(
      this.mongoURI,
      mongoDbOptions
    );

    this.fileConnection.once("open", () => {
      this.gfs = grid(this.fileConnection.db, mongoose.mongo);
      this.gfs.collection("uploads");
    });

    mongoose
      .connect(this.mongoURI, mongoDbOptions)
      .then(this.updateRolePermissionsTableCache());
  }

  // Cache
  async updateRolePermissionsTableCache() {
    this.cachedRolePermissionTable = await this.getLatestRoleLPermissionTable();
  }

  getCachedRolePermissionsTable() {
    return this.cachedRolePermissionTable;
  }

  // Accounts
  async getAccountById(req) {
    const account = await Account.findById(req.payload.id);
    return account;
  }

  async getAllAccounts() {
    const accounts = await Account.find({});
    return accounts;
  }

  async createAccount(req, did) {
    const newAccount = new Account();
    newAccount.username = req.body.account.username;
    newAccount.email = req.body.account.email;
    newAccount.role = req.body.account.role;
    newAccount.didAddress = did.address;
    newAccount.didPrivateKey = did.privateKey;
    newAccount.setPassword(req.body.account.password);

    const account = await newAccount.save();
    return account;
  }

  // Documents
  async uploadDocument(req) {
    const account = await Account.findById(req.payload.id);

    const newDocument = new Document();
    newDocument.name = req.file.originalName;
    newDocument.url = req.file.filename;
    newDocument.uploadedBy = account;
    const document = await newDocument.save();

    const hash = await this.generateHash(document.url);
    document.hash = hash;
    await document.save();

    if (req.body.uploadForAccountId !== undefined) {
      const uploadForAccount = await Account.findById(
        req.body.uploadForAccountId
      );
      uploadForAccount.documents.push(document);
      await uploadForAccount.save();
    } else {
      account.documents.push(document);
      await account.save();
    }

    return document;
  }

  async getDocuments(req) {
    const account = await Account.findById(req.payload.id);

    let documents = await Document.find({
      _id: {
        $in: account.documents
      }
    });

    return documents;
  }

  async getDocument(req, res) {
    this.gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: "No file exists"
        });
      }
      if (
        file.contentType === "image/jpeg" ||
        file.contentType === "image/png"
      ) {
        // Read output to browser
        const readstream = this.gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: "Not an image"
        });
      }
    });
  }

  // Admin - Roles
  async getAllRoles() {
    const roles = await Role.find({});
    return roles;
  }

  async createRole(req) {
    const newRole = new Role();
    newRole.name = req.body.role.name;
    const role = await newRole.save();
    return role;
  }

  // Admin - Permissions
  async getAllPermissions() {
    const permissions = await Permission.find({});
    return permissions;
  }

  async createPermission(req) {
    const newPermission = new Permission();
    newPermission.name = req.body.permission.name;
    newPermission.paired = req.body.permission.paired;
    const permission = await newPermission.save();
    return permission;
  }

  // Admin - Role Permission Table
  async getLatestRoleLPermissionTable() {
    // Get latest role permission table for role permissions table versioning
    const rolePermissionTable = await RolePermissionTable.findOne()
      .limit(1)
      .sort({ $natural: -1 });

    if (rolePermissionTable === null || rolePermissionTable === undefined) {
      return {};
    } else {
      return JSON.parse(rolePermissionTable.rolePermissionTable);
    }
  }

  async newRolePermissionTable(req) {
    const newRolePermissionTable = new RolePermissionTable();
    newRolePermissionTable.rolePermissionTable = JSON.stringify(
      req.body.rolePermissionTable
    );
    const rolePermissionTable = await newRolePermissionTable.save();

    this.updateRolePermissionsTableCache();
    return rolePermissionTable;
  }

  // Blockchain
  async createVerifiableCredential(vcJwt, verifiedVC, issuer, document) {
    const newVC = new VerifiableCredential();
    newVC.vcJwt = vcJwt;
    newVC.verifiedVC = verifiedVC;
    newVC.issuer = issuer;
    newVC.document = document;
    newVC.documentDid = document.did;
    const vc = await newVC.save();

    document.vcJwt = vcJwt;
    await document.save();

    return vc;
  }

  async createVerifiablePresentation(vpJwt, verifiedVP, issuer, document) {
    const newVP = new VerifiablePresentation();
    newVP.vpJwt = vpJwt;
    newVP.verifiedVP = verifiedVP;
    newVP.issuer = issuer;
    newVP.document = document;
    newVP.documentDid = document.did;
    const vp = await newVP.save();

    document.vpJwt = vpJwt;
    await document.save();

    return vp;
  }

  // Helpers
  async generateHash(documentUrl) {
    return new Promise((resolve, reject) => {
      // Hash from URL
      let localUrl =
        "http://localhost:" +
        (process.env.PORT || 5000) +
        "/api/documents/" +
        documentUrl;

      imageHash(localUrl, 16, true, (error, data) => {
        if (error) throw error;
        resolve(data);
      });
    });
  }
}

module.exports = MongoDbClient;
