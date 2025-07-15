const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

require('dotenv').config();

const app = express();
const upload = multer();

app.use(cors());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- FIX: Changed 'photo' to 'dishImage' to match the frontend request ---
app.post('/upload', upload.single('dishImage'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);

  const stream = cloudinary.uploader.upload_stream(
    { folder: "uploads" },
    (error, result) => {
      if (error) return res.status(500).json({ error });
      res.json({ url: result.secure_url });
    }
  );

  bufferStream.pipe(stream);
});

app.get('/', (req, res) => {
  res.send('Backend per upload immagini su Cloudinary è attivo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));
