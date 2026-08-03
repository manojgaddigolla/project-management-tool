const User = require("../models/User");
const { clerkClient } = require("@clerk/clerk-sdk-node");

const syncUser = async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    if (!clerkId) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    let user = await User.findOne({ clerkId });

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || "";
      const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : "User";
      const avatar = clerkUser.imageUrl || "";

      user = new User({
        clerkId,
        email,
        name,
        avatar
      });
      await user.save();
    }

    res.json(user);
  } catch (error) {
    console.error("Error in syncUser:", error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = {
  syncUser
};