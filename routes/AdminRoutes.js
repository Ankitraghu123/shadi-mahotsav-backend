const express = require('express')
const { Register, Login, getAllCFCMembers, getAllCMCMembers } = require('../controllers/AdminControllers')
const router = express.Router()

router.post('/register',Register)

router.post('/login',Login)

router.get('/members/cfc', getAllCFCMembers);

router.get('/members/cmc', getAllCMCMembers);


module.exports = router