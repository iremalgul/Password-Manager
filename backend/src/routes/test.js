const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Test data
const testData = {
    password: "TestPassword123!",
    data: "This is a test data for encryption performance measurement"
};

// AES encryption test
router.get('/test-aes', async (req, res) => {
    const startTime = process.hrtime();
    
    // Generate a random key and IV
    const key = crypto.randomBytes(32); // 256 bits
    const iv = crypto.randomBytes(16);  // 128 bits
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encrypt
    let encrypted = cipher.update(testData.data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const endTime = process.hrtime(startTime);
    const duration = (endTime[0] * 1000 + endTime[1] / 1000000); // Convert to milliseconds
    
    res.json({
        operation: 'AES-256-CBC',
        duration: duration,
        memoryUsage: process.memoryUsage(),
        dataLength: testData.data.length,
        success: decrypted === testData.data
    });
});

// Bcrypt test
router.get('/test-bcrypt', async (req, res) => {
    const startTime = process.hrtime();
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(testData.password, salt);
    
    // Verify hash
    const verify = await bcrypt.compare(testData.password, hash);
    
    const endTime = process.hrtime(startTime);
    const duration = (endTime[0] * 1000 + endTime[1] / 1000000); // Convert to milliseconds
    
    res.json({
        operation: 'bcrypt',
        duration: duration,
        memoryUsage: process.memoryUsage(),
        success: verify
    });
});

module.exports = router; 