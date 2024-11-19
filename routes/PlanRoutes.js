const express = require('express');
const { addPlan, getAllPlan, createOrder, verifyPayment, findUsersWithActivePlans, findUsersWithoutPlans, findUsersJoinedToday, getUsersByRegistrationDate } = require('../controllers/PlanControllers');
const router = express.Router();

router.post('/add', addPlan);

router.get('/get-all', getAllPlan);

router.post('/create-order',createOrder)

router.post('/verify-payment',verifyPayment)

router.get('/active-plans', findUsersWithActivePlans);

router.get('/free-users', findUsersWithoutPlans);

router.get('/users-joined-today', findUsersJoinedToday);

router.get('/users/:startDate/:endDate', getUsersByRegistrationDate);

module.exports = router;
