const express = require('express');
const router = express.Router();

const { check } = require('express-validator');
const { loginUser,getAuthenticatedUser } = require('../controllers/userController'); 
const auth = require('../middleware/auth');

router.get('/', auth, getAuthenticatedUser);

router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').isString().notEmpty(),
  ],
  loginUser );

module.exports = router;

