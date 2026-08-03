const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');

const clerkAuth = ClerkExpressRequireAuth();

module.exports = function(req, res, next) {
  clerkAuth(req, res, async (err) => {
    if (err) {
      return res.status(401).json({ msg: "Token is not valid" });
    }
    
    try {
      if (!req.auth || !req.auth.userId) {
        return res.status(401).json({ msg: "Unauthorized" });
      }
      
      const user = await User.findOne({ clerkId: req.auth.userId });
      if (user) {
        req.user = { id: user._id.toString() };
      } else if (req.originalUrl !== '/api/users/sync') {
        return res.status(401).json({ msg: "User not synced" });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ msg: "Server Error in Auth Middleware" });
    }
  });
};
