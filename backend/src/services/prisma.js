/**
 * Database Service Entry Point
 * Connected to MongoDB (lnmiit_healthcare)
 */
const mongoService = require('./mongoService');

// MongoDB is our active primary database
module.exports = mongoService;
