const mongoose = require('mongoose');

const GlobalCMCIncomeSchema = new mongoose.Schema(
  {
    totalIncome: {
      type: Number,
      default: 0, // Total income in the pool
    },
  },
  { timestamps: true }
);

const GlobalCMCIncome = mongoose.model('GlobalCMCIncome', GlobalCMCIncomeSchema);

module.exports = GlobalCMCIncome;
