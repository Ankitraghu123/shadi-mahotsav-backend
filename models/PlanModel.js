const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema(
  {
    name: {
      type:String,
    },
   price:{
    type:String
   },
   details:{
    type:String
   },
  },
  { timestamps: true }
);

const PlanModel = mongoose.model('Plan', PlanSchema);

module.exports = PlanModel;
