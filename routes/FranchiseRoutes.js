const express = require('express')
const {registerFranchise, getFranchiseRelations, getAllFranchise, createKYC, getReferredFranchises,uploadProfilePicture, editProfilePicture, deleteProfilePicture, editFranchise, deleteFranchise, generateRegistrationLink, getUplineTree, loginFranchise, getSingleFranchise, requestPayout, getPayoutsByFranchise, getDirectMembers, getCouponMembers, getFranchisesRefTo, approveKYC, getAllPayout, updatePayoutStatus, approveAadhar, approvePanCard, rejectKYC, rejectAadhar, rejectPanCard, getFranchiseTeam, franchiseTreeView} = require('../controllers/FranchiseController')
const router = express.Router()

router.post('/register',registerFranchise)

router.post('/login',loginFranchise)

router.get('/all',getAllFranchise)

router.get('/all-payouts', getAllPayout);


router.get('/:id',getSingleFranchise)

router.get('/:code',getFranchiseRelations)

router.post('/kyc',createKYC)

router.get('/ref/:franchiseId',getReferredFranchises)

router.post('/upload-profile-picture',uploadProfilePicture)

router.put('/edit-profile-picture',editProfilePicture)

router.delete('/delete-profile-picture/:franchiseId',deleteProfilePicture)

router.put('/edit-franchise/:franchiseId',editFranchise)

router.delete('/delete-franchise/:franchiseId',deleteFranchise)

router.post('/generate-registration-link',generateRegistrationLink)

router.get('/upline-tree/:franchiseId', franchiseTreeView);

router.post('/request-payout', requestPayout);

router.get('/payouts/:franchiseId', getPayoutsByFranchise);

router.get("/:franchiseId/direct-members", getDirectMembers);

router.get("/:franchiseId/coupon-members", getCouponMembers);

router.get('/team/:franchiseCode', getFranchiseTeam);

router.put('/:franchiseId/approve-kyc', approveKYC);

router.put('/:franchiseId/approve-aadharcard', approveAadhar);

router.put('/:franchiseId/approve-pancard', approvePanCard);

router.put('/:franchiseId/reject-kyc', rejectKYC);

router.put('/:franchiseId/reject-aadharcard', rejectAadhar);

router.put('/:franchiseId/reject-pancard', rejectPanCard);

router.put('/:payoutId/status', updatePayoutStatus);


module.exports = router