require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const pdf = require('pdf-parse');
const axios = require('axios');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Applicant Schema
const applicantSchema = new mongoose.Schema({
    name: String,
    email: String,
    education: {
        degree: String,
        branch: String,
        institution: String,
        year: String
    },
    experience: {
        job_title: String,
        company: String,
        start_date: String,
        end_date: String
    },
    skills: [String],
    summary: String
});

const Applicant = mongoose.model('Applicant', applicantSchema);

// Hardcoded user credentials
const credentials = { username: 'naval.ravikant', password: '05111974' };

// #1 Authentication API
app.post('/api/authenticate', (req, res) => {
    const { username, password } = req.body;
    if (username === credentials.username && password === credentials.password) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ JWT: token });
    }
    res.status(401).json({ error: "Invalid credentials" });
});

// #2 Resume Data Enrichment API
app.post('/api/enrich-resume', async (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: "No token provided" });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }

    const { url } = req.body;

    try {
        const pdfData = await axios.get(url, { responseType: 'arraybuffer' });
        pdf(pdfData.data).then(async (data) => {
            if (!data.text) return res.status(500).json({ error: "No text extracted" });

            // Call Google Gemini API (dummy call, replace with actual)
            const enrichedData = {}; // Enrich using Google Gemini API here.
            // Assume we get enrichedData in appropriate format.

            // Create new applicant record
            const applicant = new Applicant(enrichedData);
            await applicant.save();

            res.status(200).json(applicant);
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// #3 Resume Search API
app.post('/api/search-resume', async (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: "No token provided" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }

    const { name } = req.body;
    const results = await Applicant.find({ name: new RegExp(name, 'i') }); // Case insensitive search

    if (results.length === 0) {
        return res.status(404).json({ error: "No applicants found" });
    }

    res.status(200).json(results);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
