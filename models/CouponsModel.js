const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema(
  {
    name: {
      type:String,
    },
   amount:{
    type:Number
   },
  allotedTo:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Franchise"
  }]
  },
  { timestamps: true }
);

const CouponModel = mongoose.model('Coupon', CouponSchema);

module.exports = CouponModel;
