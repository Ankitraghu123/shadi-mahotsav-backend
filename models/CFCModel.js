const mongoose = require('mongoose');

const CFCSchema = new mongoose.Schema(
  {
    franchiseId: {
      type:mongoose.Schema.Types.ObjectId,
      ref:'Franchise'
    },
    totalEarnings:{
      type:Number,
      default:0
    }
  
  },
  { timestamps: true }
);

const CFCModel = mongoose.model('CFC', CFCSchema);

module.exports = CFCModel;
