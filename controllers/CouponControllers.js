const CouponModel = require('../models/CouponsModel'); // Adjust the path as necessary
const FranchiseModel = require('../models/FranchiseModel');

// Function to add a new coupon
const addCoupon = async (req, res) => {
  const { name, amount } = req.body; // Get the data from request body

  // Validate data
  if (!name || !amount) {
    return res.status(400).json({
      message: 'Name and amount are required fields.',
    });
  }

  try {
    // Create a new coupon
    const newCoupon = new CouponModel({
      name,
      amount,
    });

    // Save the coupon to the database
    await newCoupon.save();

    // Respond with a success message
    return res.status(201).json({
      message: 'Coupon added successfully.',
      coupon: newCoupon,
    });
  } catch (error) {
    // Handle any errors that occur during the process
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while adding the coupon.',
      error: error.message,
    });
  }
};

const getAllCoupons = async (req, res) => {
    try {
      // Fetch all coupons from the database
      const coupons = await CouponModel.find();
  
      // Check if no coupons were found
      if (!coupons || coupons.length === 0) {
        return res.status(404).json({
          message: 'No coupons found.',
        });
      }
  
      // Respond with the list of coupons
      return res.status(200).json({
        message: 'Coupons fetched successfully.',
        coupons,
      });
    } catch (error) {
      // Handle any errors during the process
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while fetching the coupons.',
        error: error.message,
      });
    }
  };

  const deleteCoupon = async (req, res) => {
    const couponId = req.params.id; // Get the coupon ID from the request params
  
    try {
      // Find the coupon by its ID and remove it
      const deletedCoupon = await CouponModel.findByIdAndDelete(couponId);
  
      // If no coupon was found with the given ID
      if (!deletedCoupon) {
        return res.status(404).json({
          message: 'Coupon not found.',
        });
      }
  
      // Respond with success message
      return res.status(200).json({
        message: 'Coupon deleted successfully.',
        deletedCoupon,
      });
    } catch (error) {
      // Handle any errors that occur during the process
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while deleting the coupon.',
        error: error.message,
      });
    }
  };

  const allotCouponsToFranchises = async (req, res) => {
    try {
      const { franchiseIds, couponId } = req.body;
  
      if (!franchiseIds || franchiseIds.length === 0 || !couponId) {
        return res.status(400).json({ message: 'Franchise IDs and Coupon ID are required' });
      }
  
      // Fetch the coupon from the database
      const coupon = await CouponModel.findById(couponId);
      if (!coupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }
  
      // Iterate over franchise IDs to update their data
      for (const franchiseId of franchiseIds) {
        // Update the franchise's couponWallet and adminCoupons
        const franchise = await FranchiseModel.findById(franchiseId);
        if (franchise) {
          // Add the coupon's amount to the franchise's wallet
          franchise.couponWallet = (franchise.couponWallet || 0) + coupon.amount;
  
          // Add the coupon ID to the adminCoupons array (if not already present)
          if (!franchise.adminCoupons.includes(couponId)) {
            franchise.adminCoupons.push(couponId);
          }
  
          // Save the updated franchise
          await franchise.save();
  
          // Add the franchise ID to the coupon's allottedTo array (if not already present)
          if (!coupon.allotedTo.includes(franchiseId)) {
            coupon.allotedTo.push(franchiseId);
          }
        }
      }
  
      // Save the updated coupon
      await coupon.save();
  
      res.status(200).json({ message: 'Coupons successfully allotted to franchises' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'An error occurred while allotting coupons', error: error.message });
    }
  };
  

module.exports = {
  addCoupon,
  getAllCoupons,
  deleteCoupon,
  allotCouponsToFranchises
};
