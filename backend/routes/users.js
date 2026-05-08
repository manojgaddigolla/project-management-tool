const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const { registerUser } = require("../controllers/userController");

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

module.exports = router;
