const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the sender User model
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the receiver User model
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    seen: {
      type: Boolean,
      default: false, // Indicates whether the message has been seen by the receiver
    },
  },
  { timestamps: true }
);

const ChatModel = mongoose.model('Chat', ChatSchema);

module.exports = ChatModel;
