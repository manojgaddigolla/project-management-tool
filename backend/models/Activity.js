const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ActivitySchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    actionText: {
      type: String,
      required: true,
    },

    card: {
      type: Schema.Types.ObjectId,
      ref: "Card",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = Activity = mongoose.model("Activity", ActivitySchema);
