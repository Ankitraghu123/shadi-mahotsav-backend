const express = require('express');
const { sendEnquiry, getAllEnquiries, deleteEnquiry } = require('../controllers/ContactControllers');
const router = express.Router();

router.post('/send', sendEnquiry);

router.get('/get-all', getAllEnquiries);

router.delete('/:id', deleteEnquiry);

module.exports = router;
