const FranchiseModel = require("../models/FranchiseModel");
const LeadModel = require("../models/LeadModel");

const addLead = async (req, res) => {
    try {
      const { name, email, mobileNumber, country, state, city, gender, franchiseId } = req.body;
  
      // Validate franchiseId
      const franchise = await FranchiseModel.findById(franchiseId);
      if (!franchise) {
        return res.status(404).json({ message: 'Franchise not found' });
      }
  
      // Create a new lead
      const newLead = new LeadModel({
        name,
        email,
        mobileNumber,
        country,
        state,
        city,
        gender,
        refBy: franchiseId, // Reference the franchise
      });
  
      // Save lead to database
      const savedLead = await newLead.save();
  
      // Update the Franchise's leads array
      franchise.leads.push(savedLead._id);
      await franchise.save();
  
      // Send response
      res.status(201).json({
        message: 'Lead added successfully',
        lead: savedLead,
      });
    } catch (error) {
      // Handle errors
      if (error.code === 11000) {
        return res.status(400).json({ message: 'Email must be unique' });
      }
      res.status(500).json({
        message: 'An error occurred while adding the lead',
        error: error.message,
      });
    }
  };


const editLead = async (req, res) => {
    try {
      const { id } = req.params; // Lead ID from the URL
      const updateData = req.body; // Data to update from the request body
  
      // Find the lead by ID and update it
      const updatedLead = await LeadModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true } // `new: true` returns the updated document
      );
  
      // Check if the lead exists
      if (!updatedLead) {
        return res.status(404).json({ message: 'Lead not found' });
      }
  
      // Send the updated lead as a response
      res.status(200).json({
        message: 'Lead updated successfully',
        lead: updatedLead,
      });
    } catch (error) {
      // Handle validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Invalid data', error: error.message });
      }
  
      // Handle other errors
      res.status(500).json({
        message: 'An error occurred while updating the lead',
        error: error.message,
      });
    }
  };

  const deleteLead = async (req, res) => {
    try {
      const { id } = req.params; // Lead ID from the URL
  
      // Find the lead to get the associated franchise ID
      const lead = await LeadModel.findById(id);
      if (!lead) {
        return res.status(404).json({ message: 'Lead not found' });
      }
  
      const franchiseId = lead.refBy;
  
      // Delete the lead
      await LeadModel.findByIdAndDelete(id);
  
      // Remove the lead ID from the franchise's leads array
      if (franchiseId) {
        await FranchiseModel.findByIdAndUpdate(
          franchiseId,
          { $pull: { leads: id } }, // Remove the lead ID from the array
          { new: true }
        );
      }
  
      // Send a success response
      res.status(200).json({ message: 'Lead deleted successfully' });
    } catch (error) {
      // Handle errors
      res.status(500).json({
        message: 'An error occurred while deleting the lead',
        error: error.message,
      });
    }
  };

  const getAllLeads = async (req, res) => {
    try {
      // Fetch all leads, populating the `refBy` field to include franchise details
      const leads = await LeadModel.find().populate('refBy'); // Populate `refBy` field with specific fields
  
      // Send a success response with the list of leads
      res.status(200).json({
        message: 'Leads fetched successfully',
        leads,
      });
    } catch (error) {
      // Handle errors
      res.status(500).json({
        message: 'An error occurred while fetching the leads',
        error: error.message,
      });
    }
  };

  const getLeadsByFranchise = async (req, res) => {
    try {
      const { franchiseId } = req.params;

      const leads = await LeadModel.find({ refBy: franchiseId });
  
      if (!leads || leads.length === 0) {
        return res.status(404).json({ message: 'No leads found for this franchise' });
      }
  
      // Send a success response with the leads
      res.status(200).json({
        message: 'Leads fetched successfully',
        leads,
      });
    } catch (error) {
      // Handle errors
      res.status(500).json({
        message: 'An error occurred while fetching the leads',
        error: error.message,
      });
    }
  };

module.exports = {addLead,editLead,deleteLead,getAllLeads,getLeadsByFranchise};
