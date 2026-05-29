const {
  validationResult
} = require("express-validator");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const generateTokens = (user, res) => {
  const payload = {
    user: {
      id: user.id
    }
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "15m"
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  return accessToken;
};
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  const {
    name,
    email,
    password
  } = req.body;
  let user = await User.findOne({
    email
  });
  if (user) {
    return res.status(400).json({
      errors: [{
        msg: "User already exists"
      }]
    });
  }
  user = new User({
    name,
    email,
    password
  });
  await user.save();
  const accessToken = generateTokens(user, res);
  res.status(201).json({
    token: accessToken
  });
};
const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  const {
    email,
    password
  } = req.body;
  const user = await User.findOne({
    email
  });
  if (!user) {
    return res.status(400).json({
      errors: [{
        msg: "Invalid Credentials"
      }]
    });
  }
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(400).json({
      errors: [{
        msg: "Invalid Credentials"
      }]
    });
  }
  const accessToken = generateTokens(user, res);
  res.json({
    token: accessToken
  });
};
const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({
      msg: "No refresh token, authorization denied"
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.user.id);
    if (!user) {
      return res.status(401).json({
        msg: "User no longer exists"
      });
    }

    // Issue new access token
    const payload = {
      user: {
        id: user.id
      }
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "15m"
    });
    res.json({
      token: accessToken
    });
  } catch (err) {
    res.status(401).json({
      msg: "Token is not valid"
    });
  }
};
const logoutUser = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
  });
  res.json({
    msg: "Logged out successfully"
  });
};
const getAuthenticatedUser = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return res.status(404).json({
      msg: "User not found"
    });
  }
  res.json(user);
};

const updateUserProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, avatar } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ errors: [{ msg: "Email is already in use" }] });
    }
    user.email = email;
  }

  if (name) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  
  const updatedUser = await User.findById(req.user.id).select("-password");
  res.json(updatedUser);
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getAuthenticatedUser,
  updateUserProfile
};