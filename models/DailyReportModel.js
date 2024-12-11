const mongoose = require('mongoose');

const DailyReportSchema = new mongoose.Schema(
  {
    date:{
        type:Date
    },
    franchises:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Franchise'
    }],
    totalCfc:{
        type:Number,
        default:0
    },
    totalCfcIncome:{
        type:Number,
        default:0
    },
    perCfcIncome:{
        type:Number,
        default:0
    },
    totalCmc:{
        type:Number,
        default:0
    },
    totalCmcIncome:{
        type:Number,
        default:0
    },
    perCmcIncome:{
        type:Number,
        default:0
    }

  
  },
  { timestamps: true }
);

const DailyReportModel = mongoose.model('DailyReport', DailyReportSchema);

module.exports = DailyReportModel;
