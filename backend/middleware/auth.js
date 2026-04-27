const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const tokenValue = token.split(' ')[1];

  if (!tokenValue) {
      return res.status(401).json({ msg: 'Token format is invalid, authorization denied' });
  }

  try {
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

    req.user = decoded.user;

    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};