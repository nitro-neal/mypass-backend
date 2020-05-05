module.exports = {
  getHomePage: async (req, res, next) => {
    res.status(200).json({ msg: "success" });
  },
};
