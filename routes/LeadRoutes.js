const express = require('express');
const { addLead, editLead, getAllLeads, deleteLead, getLeadsByFranchise } = require('../controllers/LeadController');
const router = express.Router();

router.post('/add', addLead);

router.put('/edit/:id', editLead);

router.delete('/delete/:id', deleteLead);

router.get('/all', getAllLeads);

router.get('/franchise/:franchiseId', getLeadsByFranchise);

module.exports = router;
