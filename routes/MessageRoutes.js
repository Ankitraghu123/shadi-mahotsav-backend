const express = require('express');
const router = express.Router();
const { sendMessage, getMessages, markAsSeen } = require('../controllers/MessageConrollers');

router.post('/sendMessage', sendMessage);

router.get('/messages/:senderId/:receiverId', getMessages);

router.post('/markAsSeen', markAsSeen);

module.exports = router;
