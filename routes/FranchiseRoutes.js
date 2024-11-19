const express = require('express')
const {registerFranchise, getFranchiseRelations, getAllFranchise} = require('../controllers/FranchiseController')
const router = express.Router()

router.post('/register',registerFranchise)
router.get('/all',getAllFranchise)
 

router.get('/:code',getFranchiseRelations)



module.exports = router