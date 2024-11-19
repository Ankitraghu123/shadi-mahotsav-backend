const ContactModel = require("../models/ContactModel");
const asyncHandler = require('express-async-handler')

const sendEnquiry =asyncHandler( async (req, res) => {
  try {
    const newEnquiry = await ContactModel.create(req.body); // Assuming data is passed in the request body
    res.status(201).json({ message: 'Enquiry sent successfully', data: newEnquiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
})

const getAllEnquiries =asyncHandler( async (req, res) => {
  try {
    const enquiries = await ContactModel.find(); // Fetch all enquiries
    res.status(200).json({ message: 'Enquiries fetched successfully', data: enquiries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
})


const deleteEnquiry =asyncHandler( async (req, res) => {
  const { id } = req.params; // Assuming ID is in the URL parameter
  try {
    const deletedEnquiry = await ContactModel.findByIdAndDelete(id); // Delete the enquiry by ID
    if (!deletedEnquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }
    res.status(200).json({ message: 'Enquiry deleted successfully', data: deletedEnquiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
})

module.exports = { sendEnquiry, getAllEnquiries, deleteEnquiry };
