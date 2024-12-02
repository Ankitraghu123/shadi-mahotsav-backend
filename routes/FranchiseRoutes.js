const express = require('express')
const {registerFranchise, getFranchiseRelations, getAllFranchise, createKYC, getReferredFranchises,uploadProfilePicture, editProfilePicture, deleteProfilePicture, editFranchise, deleteFranchise, generateRegistrationLink} = require('../controllers/FranchiseController')
const router = express.Router()

router.post('/register',registerFranchise)
router.get('/all',getAllFranchise)
 

router.get('/:code',getFranchiseRelations)

router.post('/kyc/:franchiseId',createKYC)

router.get('/ref/:franchiseId',getReferredFranchises)

router.post('/upload-profile',uploadProfilePicture)

router.put('/edit-profile',editProfilePicture)

router.delete('/delete-profile/:franchiseId',deleteProfilePicture)

router.put('/edit-franchise/:franchiseId',editFranchise)

router.delete('/delete-franchise/:franchiseId',deleteFranchise)

router.post('/generate-registration-link',generateRegistrationLink)

module.exports = router