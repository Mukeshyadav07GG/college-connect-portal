const { makeSchema, mongoose } = require("./baseSchema");

const chatMessageSchema = makeSchema({
  sender_id: { type: String, required: true, index: true },
  recipient_id: { type: String, required: true, index: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
});
chatMessageSchema.index({ sender_id: 1, recipient_id: 1, created_at: -1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema, "chat_messages");
