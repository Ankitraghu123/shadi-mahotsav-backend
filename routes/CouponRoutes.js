const express = require('express');
const { addCoupon, deleteCoupon, getAllCoupons, allotCouponsToFranchises } = require('../controllers/CouponControllers');
const router = express.Router();

router.post('/add', addCoupon);

router.delete('/delete/:id', deleteCoupon);

router.get('/all', getAllCoupons);

router.post('/allot-coupons', allotCouponsToFranchises);

module.exports = router;
