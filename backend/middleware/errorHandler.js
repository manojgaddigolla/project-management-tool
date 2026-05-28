const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);

  if (err.name === 'CastError' || err.kind === 'ObjectId') {
    return res.status(404).json({ msg: "Resource not found" });
  }

  if (err.code === 11000) {
    return res.status(400).json({ msg: "Duplicate field value entered" });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    msg: "Server Error",
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
};

module.exports = errorHandler;
