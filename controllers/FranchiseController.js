const FranchiseModel = require('../models/FranchiseModel');

const registerFranchise = async (req, res) => {
    const { name, refById } = req.body;
 
    if (!name) {
        return res.status(400).json({ message: "Franchise name is required." });
    }
 
    try {
        // If no refById is provided, create a new top-level franchise
        if (!refById) {
            const newFranchise = new FranchiseModel({ name });
            await newFranchise.save();
            return res.status(201).json({
                message: "Top-level franchise registered successfully.",
                franchise: newFranchise
            });
        }
 
        // Step 1: Find the referring franchise
        const referringFranchise = await FranchiseModel.findById(refById);
        if (!referringFranchise) {
            return res.status(404).json({ message: "Referring franchise not found." });
        }
 
        // Step 2: Find the first available slot for the new franchise using BFS
        let franchiseQueue = [referringFranchise];
 
        while (franchiseQueue.length > 0) {
            const currentFranchise = franchiseQueue.shift();
            
            // Check if the current franchise has fewer than 3 sublines
            if (currentFranchise.sublines.length < 3) {
                const newFranchise = new FranchiseModel({
                    name,
                    refBy: currentFranchise._id
                });
 
                await newFranchise.save();
 
                // Add the new franchise to the current franchise's sublines
                currentFranchise.sublines.push(newFranchise._id);
                await currentFranchise.save();
 
                return res.status(201).json({
                    message: "Franchise registered successfully under the referring franchise.",
                    franchise: newFranchise
                });
            }
 
            // If full, add sub-franchises to the queue for further searching
            const sublineFranchises = await FranchiseModel.find({ _id: { $in: currentFranchise.sublines } });
            franchiseQueue.push(...sublineFranchises);
        }
 
        res.status(400).json({ message: "No available slot found for new franchise." });
    } catch (error) {
        res.status(500).json({ message: "Failed to register franchise.", error: error.message });
    }
 };

module.exports = registerFranchise;
