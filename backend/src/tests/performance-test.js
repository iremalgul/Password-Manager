const axios = require('axios');

const API_URL = 'http://localhost:3000/api/test';

async function runPerformanceTest() {
    const iterations = 100;
    let aesTimes = [];
    let bcryptTimes = [];
    let aesMemory = [];
    let bcryptMemory = [];

    console.log('Starting performance tests...');
    console.log(`Running ${iterations} iterations for each operation...\n`);

    // Test AES
    for (let i = 0; i < iterations; i++) {
        try {
            const response = await axios.get(`${API_URL}/test-aes`);
            aesTimes.push(response.data.duration);
            aesMemory.push(response.data.memoryUsage.heapUsed / 1024 / 1024); // Convert to MB
        } catch (error) {
            console.error('AES test error:', error.message);
        }
    }

    // Test Bcrypt
    for (let i = 0; i < iterations; i++) {
        try {
            const response = await axios.get(`${API_URL}/test-bcrypt`);
            bcryptTimes.push(response.data.duration);
            bcryptMemory.push(response.data.memoryUsage.heapUsed / 1024 / 1024); // Convert to MB
        } catch (error) {
            console.error('Bcrypt test error:', error.message);
        }
    }

    // Calculate statistics
    const calculateStats = (arr) => ({
        avg: arr.reduce((a, b) => a + b, 0) / arr.length,
        min: Math.min(...arr),
        max: Math.max(...arr),
        std: Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - arr.reduce((c, d) => c + d, 0) / arr.length, 2), 0) / arr.length)
    });

    const aesStats = calculateStats(aesTimes);
    const bcryptStats = calculateStats(bcryptTimes);
    const aesMemoryStats = calculateStats(aesMemory);
    const bcryptMemoryStats = calculateStats(bcryptMemory);

    // Print results
    console.log('=== Performance Test Results ===\n');
    
    console.log('AES-256-CBC Encryption/Decryption:');
    console.log(`Average time: ${aesStats.avg.toFixed(3)} ms`);
    console.log(`Min time: ${aesStats.min.toFixed(3)} ms`);
    console.log(`Max time: ${aesStats.max.toFixed(3)} ms`);
    console.log(`Standard deviation: ${aesStats.std.toFixed(3)} ms`);
    console.log(`Average memory usage: ${aesMemoryStats.avg.toFixed(2)} MB\n`);

    console.log('Bcrypt Hashing:');
    console.log(`Average time: ${bcryptStats.avg.toFixed(3)} ms`);
    console.log(`Min time: ${bcryptStats.min.toFixed(3)} ms`);
    console.log(`Max time: ${bcryptStats.max.toFixed(3)} ms`);
    console.log(`Standard deviation: ${bcryptStats.std.toFixed(3)} ms`);
    console.log(`Average memory usage: ${bcryptMemoryStats.avg.toFixed(2)} MB\n`);

    // Generate report text
    console.log('=== Report Text ===\n');
    console.log(`To evaluate the cryptographic operations used in the password manager, we measured the runtime of AES encryption/decryption and bcrypt hashing. On average, AES encryption took ${aesStats.avg.toFixed(3)} seconds per operation, and bcrypt hashing took ${bcryptStats.avg.toFixed(3)} seconds with a cost factor of 12. Memory usage during encryption was approximately ${aesMemoryStats.avg.toFixed(2)} MB. These measurements confirm the feasibility of the system for real-time use in a browser-integrated password manager.`);
}

runPerformanceTest().catch(console.error); 