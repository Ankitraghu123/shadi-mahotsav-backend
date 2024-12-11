const mongoose = require('mongoose');

const GlobalCFCIncomeSchema = new mongoose.Schema(
  {
    totalIncome: {
      type: Number,
      default: 0, // Total income in the pool
    },
  },
  { timestamps: true }
);

const GlobalCFCIncome = mongoose.model('GlobalCFCIncome', GlobalCFCIncomeSchema);

module.exports = GlobalCFCIncome;
