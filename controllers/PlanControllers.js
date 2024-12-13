const asyncHandler = require('express-async-handler');
const PlanModel = require('../models/PlanModel');
const UserModel = require('../models/UserModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const FranchiseModel = require('../models/FranchiseModel');
const CFCModel = require('../models/CFCModel');
const GlobalCFCIncome = require('../models/GlobalCFCIncome');
const GlobalCMCIncome = require('../models/GlobalCMCIncome');
const CMCModel = require('../models/CMCModel');

const addPlan =asyncHandler( async (req, res) => {
  try {
    const newPlan = await PlanModel.create(req.body); 
    res.status(201).json({ message: 'Plan Added successfully', data: newPlan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
})

const getAllPlan =asyncHandler( async (req, res) => {
    try {
      const allPlans = await PlanModel.find(); // Assuming data is passed in the request body
      console.log(allPlans)
      res.status(201).json({ message: 'All Plans Feteched successfully', data: allPlans });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  })

  const razorpay = new Razorpay({
    key_id: "rzp_test_gpCBVNamBYgZkc",
    key_secret: "zsoMGQfuTrHjWrV82NJuRf9k"
  });

  const createOrder = asyncHandler(async (req, res) => {
    const { userId, planId } = req.body;
  
    try {
      const plan = await PlanModel.findById(planId);
      if (!plan) return res.status(404).json({ message: 'Plan not found' });
  
      const amount = plan.price * 100; // Amount in paise (Razorpay expects paise)
  
      const order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: `order_rcptid_${Math.random().toString(36).substring(7)}`,
      });
  
      res.json({
        order,
        planId,
        userId,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error creating order' });
    }
  });
  

  const verifyPayment = asyncHandler(async (req, res) => {
    let { paymentId, orderId, userId, planId, amount } = req.body;
    amount = amount/100
    // Validate input
    if (!orderId || !paymentId) {
      return res.status(400).json({ message: 'Order ID or Payment ID missing' });
    }
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
  
    try {
      const user = await UserModel.findById(userId);
      const plan = await PlanModel.findById(planId);
  
      if (!user || !plan) {
        return res.status(404).json({ message: 'User or plan not found' });
      }
  
      // Set purchase and expiry dates
      const purchaseDate = new Date();
      const expiryDate = new Date();
      if (plan.name === '1 Month') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (plan.name === '2 Month') {
        expiryDate.setMonth(expiryDate.getMonth() + 2);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 12);
      }
  
      // Add plan to user
      user.plans.push({
        plan: plan._id,
        purchaseDate,
        expiryDate,
      });
      await user.save();
  
      // Process franchise commissions
      if (user.refBy) {
        const franchise = await FranchiseModel.findById(user.refBy).populate("kycId");
        if (franchise) {
          const franchiseAmount = (amount * 70) / 100;
  
          // Ensure retailWallet is a number
          franchise.retailWallet = (franchise.retailWallet || 0) + franchiseAmount;

          if(franchise?.package == "gold" && franchise?.refTo?.length >=3 ){
            franchise.wallet += franchiseAmount
          }else{
            franchise.wallet += (franchiseAmount *20)/100
            franchise.upgradeWallet += (franchiseAmount *80)/100
          }

          if(franchise.upgradeWallet >= 3304 && franchise.package == "silver"){
            franchise.package = "gold"
            franchise.wallet += franchise.upgradeWallet- 3304
            // franchise.upgradeWallet = 0
            franchise.couponWallet += 5400
            const newCfc = await CFCModel.create({
              franchiseId : franchise._id
            })
  
            await newCfc.save()
            await GlobalCFCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });
            await GlobalCMCIncome.updateOne({}, { $inc: { totalIncome: 108 } }, { upsert: true });

          }

          franchise.totalEarning += franchiseAmount

          await franchise.save();
  
          // Process parent franchise commission
          if (franchise.refBy) {
            const parentFranchise = await FranchiseModel.findById(franchise.refBy);
            if (parentFranchise) {
              const parentAmount = (amount * 10) / 100;
  
              // Ensure retailWallet is a number
              parentFranchise.retailWallet = (parentFranchise.retailWallet || 0) + parentAmount;
              await parentFranchise.save();
            }
          }
        }
      }
  
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error verifying payment' });
    }
  });
  

  const findUsersWithActivePlans = asyncHandler(async (req, res) => {
    try {
      const currentDate = new Date();
  
      // Query to find users with plans that have a non-expired expiryDate
      const usersWithActivePlans = await UserModel.find({
        plans: {
          $elemMatch: { expiryDate: { $gte: currentDate } },
        },
      })
      .populate({
        path: 'plans.plan', 
        model: 'Plan', 
     })
      .select('-password'); // Exclude password for security reasons
  
      if (usersWithActivePlans.length === 0) {
        return res.status(404).json({ message: 'No users with active plans found' });
      }
  
      res.status(200).json(usersWithActivePlans);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error finding users with active plans', error });
    }
  })

  const findUsersWithoutPlans = async (req, res) => {
    try {
      // Query to find users who either do not have a plans field or have an empty plans array
      const freeUsers = await UserModel.find({
        $or: [
          { plans: { $exists: false } }, // Users without the plans field
          { plans: { $size: 0 } },       // Users with an empty plans array
        ],
      }).select('-password'); // Exclude password for security reasons
  
      if (freeUsers.length === 0) {
        return res.status(200).json([])
      }
  
      res.status(200).json(freeUsers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error finding users without plans', error });
    }
  };

  const findUsersJoinedToday = async (req, res) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00
  
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59
  
      const usersJoinedToday = await UserModel.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).select('-password'); // Exclude password
  
      // Return an empty array if no users found
      res.status(200).json(usersJoinedToday);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error finding users joined today', error });
    }
  };


  const getUsersByRegistrationDate = asyncHandler(async (req, res) => {
    try {
      const { startDate, endDate } = req.params;
  
      if (!startDate && !endDate) {
        return res.status(400).json({ message: 'Please provide at least one date' });
      }
  
      let query = {};
  
      if (startDate && endDate) {
        // If both startDate and endDate are provided
        query.createdAt = {
          $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        };
      } else if (startDate) {
        // If only startDate is provided
        const startOfDay = new Date(new Date(startDate).setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date(startDate).setHours(23, 59, 59, 999));
        query.createdAt = { $gte: startOfDay, $lte: endOfDay };
      }
  
      const users = await UserModel.find(query).select('-password');
  
      res.status(200).json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching users by registration date', error });
    }
  });
  
  
  
  

module.exports = {addPlan ,getAllPlan ,createOrder,verifyPayment,findUsersWithActivePlans,findUsersWithoutPlans,findUsersJoinedToday,getUsersByRegistrationDate};
