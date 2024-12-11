const { generateToken } = require("../config/jwtToken");
const asyncHandler = require('express-async-handler')
const AdminModel = require("../models/AdminModel");
const { generateRefreshToken } = require("../config/refreshToken");
const CMCModel = require("../models/CMCModel");
const CFCModel = require("../models/CFCModel");

const Register = asyncHandler(async (req, res) => {

    try {
        const existingAdmin = await AdminModel.findOne({ email: req.body.email });
        if (existingAdmin) {
          return res.status(400).json({ message: 'Email is already registered' });
        }
    
        const newAdmin = await AdminModel.create(req.body);
    
        const token = generateToken(newAdmin._id);
    
        res.status(201).json({ Admin: newAdmin, token });
      } catch (error) {
        res.status(500).json({ message: 'Registration failed', error: error.message });
      }
})

const Login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const Admin = await AdminModel.findOne({ email });
      if (!Admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
  
      const isMatch = await Admin.isPasswordMatched(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const token = generateRefreshToken(Admin._id);
  
      res.status(200).json({ Admin, token });
    } catch (error) {
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
  });

  const getAllCMCMembers = async (req, res) => {
    try {
      const cmcMembers = await CMCModel.find();
      if (cmcMembers.length === 0) {
        return res.status(404).json({ message: 'No CMC members found.' });
      }
      res.status(200).json({ success: true, data: cmcMembers });
    } catch (error) {
      console.error('Error fetching CMC members:', error);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  };

  const getAllCFCMembers = async (req, res) => {
    try {
      const cfcMembers = await CFCModel.find();
      if (cfcMembers.length === 0) {
        return res.status(404).json({ message: 'No CFC members found.' });
      }
      res.status(200).json({ success: true, data: cfcMembers });
    } catch (error) {
      console.error('Error fetching CFC members:', error);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  };

module.exports = {Register,Login,getAllCFCMembers,getAllCMCMembers};
