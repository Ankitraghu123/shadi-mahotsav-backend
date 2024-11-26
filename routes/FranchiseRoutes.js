const express = require('express')
const {registerFranchise, getFranchiseRelations, getAllFranchise, createKYC, getReferredFranchises} = require('../controllers/FranchiseController')
const router = express.Router()

router.post('/register',registerFranchise)
router.get('/all',getAllFranchise)
 

router.get('/:code',getFranchiseRelations)

router.post('/kyc/:franchiseId',createKYC)

router.get('/ref/:franchiseId',getReferredFranchises)

module.exports = router