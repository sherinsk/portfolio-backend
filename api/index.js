const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const prisma = new PrismaClient();

// Initialize Multer with Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'projects', // Cloudinary folder name
      allowed_formats: ['jpg', 'jpeg', 'png'], // Allowed file formats
      transformation: [{ width: 500, height: 500, crop: 'limit' }]
    },
  });

const upload = multer({ storage });

// Initialize Express
const app = express();

app.use(cors());

// Middleware to parse JSON
app.use(express.json());


// Route to get projects
app.get('/projects', async (req, res) => {
  try {
    const projects = await prisma.projects.findMany();
    res.status(200).json(projects);
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'An error occurred while fetching projects' });
  }
});


app.post('/project', upload.single('image'), async (req, res) => {
    try {
      const { description } = req.body;
      const imageUrl = req.file.path; // Cloudinary URL of the uploaded image
  
      const newProject = await prisma.projects.create({
        data: {
          image: imageUrl,
          description,
          cloudinaryId: req.file.filename, // Store Cloudinary public ID
        },
      });
  
      res.status(201).json(newProject);
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while creating the project' });
    }
  });

  app.delete('/project/:id', async (req, res) => {
    try {
      const { id } = req.params;
  
      // Find the project to delete
      const project = await prisma.projects.findUnique({
        where: { id: parseInt(id) }
      });
  
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
  
      // Delete the image from Cloudinary
      if (project.cloudinaryId) {
        await cloudinary.uploader.destroy(project.cloudinaryId);
      }
  
      // Delete the project from the database
      await prisma.projects.delete({
        where: { id: parseInt(id) }
      });
  
      res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while deleting the project' });
    }
  });

// Start the server
app.listen(7000, () => {
  console.log('Server is running on port 7000');
});
