const ChatModel = require('../models/ChatModel');
const UserModel = require('../models/UserModel');
const onlineUsers = require('../middlewares/OnlineUsers');

const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;

    // Validate that sender, receiver, and message exist
    if (!senderId || !receiverId || !message) {
      return res.status(400).json({ message: 'Sender, receiver, and message content are required' });
    }

    // Check if sender and receiver exist in the database
    const sender = await UserModel.findById(senderId);
    const receiver = await UserModel.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'Sender or receiver not found' });
    }

    // Create a new message with timestamp for sorting
    const newMessage = new ChatModel({
      senderId,
      receiverId,
      message,
      timestamp: new Date(), // Add timestamp for sorting
    });

    const savedMessage = await newMessage.save();

    // Emit message to receiver if they are online
    const receiverSocketId = onlineUsers[receiverId]; // Assuming `onlineUsers` stores connected users' socket IDs
    if (receiverSocketId) {
      req.io.to(receiverSocketId).emit('receiveMessage', savedMessage);
    } else {
      console.log(`User ${receiverId} is not online`);
    }

    // Respond with the saved message
    res.status(201).json({ message: 'Message sent successfully', data: savedMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// Get messages between two users
const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    // Ensure senderId and receiverId are provided
    if (!senderId || !receiverId) {
      return res.status(400).json({ message: 'Sender and receiver IDs are required' });
    }

    // Find messages between sender and receiver, sort by timestamp
    const messages = await ChatModel.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ timestamp: 1 });

    res.status(200).json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Mark a message as seen
const markAsSeen = async (req, res) => {
  try {
    const { messageId } = req.body;

    // Ensure messageId is provided
    if (!messageId) {
      return res.status(400).json({ message: 'Message ID is required' });
    }

    const message = await ChatModel.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Mark the message as seen
    message.seen = true;
    const updatedMessage = await message.save();

    res.status(200).json({ message: 'Message marked as seen', data: updatedMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { sendMessage, getMessages, markAsSeen };
