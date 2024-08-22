import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema.Types(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // one who is subscribing...
      ref: "Users",
    },
    channel: {
      type: Schema.Types.ObjectId, // one to whom "subscriber" is subscribing...
      ref: "Users",
    },
  },
  { timestamps: true }
); 

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
