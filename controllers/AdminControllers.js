const { generateToken } = require("../config/jwtToken");
const asyncHandler = require('express-async-handler')
const AdminModel = require("../models/AdminModel");
const { generateRefreshToken } = require("../config/refreshToken");

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

module.exports = {Register,Login};
