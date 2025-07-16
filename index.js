const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const sharp = require('sharp'); // Importa la libreria per la compressione

require('dotenv').config();

const app = express();
// Aumenta il limite di dimensione del file per multer, se necessario
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // Limite di 10MB

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- ROTTA DI UPLOAD AGGIORNATA CON COMPRESSIONE ---
app.post('/upload', upload.single('dishImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    let fileBuffer = req.file.buffer;

    // Controlla se il file è più grande di 2MB (2 * 1024 * 1024 bytes)
    if (req.file.size > 2 * 1024 * 1024) {
      console.log(`Compressing image, original size: ${req.file.size / 1024} KB`);
      // Comprimi l'immagine usando sharp
      fileBuffer = await sharp(fileBuffer)
        .resize({ width: 1200, withoutEnlargement: true }) // Ridimensiona a max 1200px di larghezza
        .jpeg({ quality: 80 }) // Comprimi in JPEG con qualità 80%
        .toBuffer();
      console.log(`Compressed size: ${fileBuffer.length / 1024} KB`);
    }

    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);

    const stream = cloudinary.uploader.upload_stream(
      { folder: "uploads" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Error:", error);
          return res.status(500).json({ error: 'Error uploading to Cloudinary' });
        }
        res.json({ url: result.secure_url });
      }
    );

    bufferStream.pipe(stream);

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.post('/delete-image', async (req, res) => {
  const { photoUrl } = req.body;
  if (!photoUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }
  try {
    const publicIdWithFolder = photoUrl.split('/image/upload/')[1].split('/').slice(1).join('/').split('.')[0];
    const result = await cloudinary.uploader.destroy(publicIdWithFolder);
    res.json({ message: 'Image deletion process initiated', details: result });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

app.get('/', (req, res) => {
  res.send('Backend per upload immagini su Cloudinary è attivo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));
