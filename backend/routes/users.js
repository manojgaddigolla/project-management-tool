const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const { registerUser, updateUserProfile } = require("../controllers/userController");
const auth = require("../middleware/auth");

router.post(
  "/register",
  [
    check("name", "Name is required").isString().notEmpty().trim().escape(),

    check("email", "Please include a valid email").isEmail().normalizeEmail(),

    check(
      "password",
      "Please enter a password with 6 or more characters",
    ).isString().isLength({ min: 6 }),
  ],
  registerUser
);

router.put(
  "/profile",
  auth,
  [
    check("name", "Name must be a string").optional().isString().trim().escape(),
    check("email", "Please include a valid email").optional().isEmail().normalizeEmail(),
    check("avatar", "Avatar must be a string").optional().isString(),
  ],
  updateUserProfile
);

module.exports = router;
