const express = require('express')
const { Register, Login, SendRequest, RejectRequest, AcceptRequest, GetSingleUser, GetAllUser, AllReceivedRequest, AllConnections, CompareProfile, FindMatchingProfiles, uploadProfilePicture, editProfilePicture, deleteProfilePicture, ProfileCompletion, EditProfile, AllSendedRequest, AddImageToGallery, EditImageInGallery, DeleteImageFromGallery, getUsersChattedWith } = require('../controllers/UserController')
const router = express.Router()

router.post('/register',Register)

router.post('/login',Login)

router.post('/upload-profile', uploadProfilePicture);

router.put('/edit-profile-picture', editProfilePicture);

router.put('/edit-profile/:userId', EditProfile);

router.delete('/delete-profile-picture/:userId', deleteProfilePicture);

router.get('/get-user/:id',GetSingleUser)

router.get('/get-all',GetAllUser)

router.get('/all-received-request/:id',AllReceivedRequest)

router.get('/all-sended-request/:id',AllSendedRequest)

router.get('/all-connections/:id',AllConnections)

router.get('/find-matching-profiles/:userId',FindMatchingProfiles)

router.post('/send-request',SendRequest)

router.post('/reject-request',RejectRequest)

router.post('/accept-request',AcceptRequest)

router.post('/compare-profile',CompareProfile)

router.get('/profile-completion/:userId', ProfileCompletion);

router.post('/add-image', AddImageToGallery);

router.put('/edit-image', EditImageInGallery);

router.delete('/delete-image', DeleteImageFromGallery)

router.get('/chatted-with/:userId', getUsersChattedWith);

module.exports = router