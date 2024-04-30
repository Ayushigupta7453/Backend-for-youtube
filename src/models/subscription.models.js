import mongoose from "mongoose";

const subscriptionSchema = new Schema({})

export const Subscription = mongoose.model("Subscription",subscriptionSchema)