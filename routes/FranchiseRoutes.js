const express = require('express')
const registerFranchise = require('../controllers/FranchiseController')
const router = express.Router()

router.post('/register',registerFranchise)

module.exports = router