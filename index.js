const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { Readable } = require('stream');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

require('dotenv').config();

// --- CONFIGURAZIONE FIREBASE ADMIN ---
try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("ERRORE: File 'firebase-service-account.json' non trovato o non valido. Scaricalo dalla tua console Firebase.");
    process.exit(1);
}
const db = admin.firestore();

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- FUNZIONE HELPER ---
const uploadToCloudinary = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
        const bufferStream = new Readable();
        bufferStream.push(fileBuffer);
        bufferStream.push(null);
        bufferStream.pipe(stream);
    });
};

// --- ROTTE RISTORATORE ---

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
    try {
        const snapshot = await db.collection('ristoranti').where('email', '==', email).limit(1).get();
        if (snapshot.empty) return res.status(401).json({ error: 'Credenziali non valide.' });
        
        const restaurantDoc = snapshot.docs[0];
        const restaurantData = restaurantDoc.data();
        const isPasswordCorrect = await bcrypt.compare(password, restaurantData.password);

        if (!isPasswordCorrect) return res.status(401).json({ error: 'Credenziali non valide.' });

        res.json({ 
          success: true, 
          docId: restaurantDoc.id, // Invia anche il docId
          restaurantId: restaurantData.restaurantId,
          nomeRistorante: restaurantData.nomeRistorante,
          logoUrl: restaurantData.logoUrl || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

app.post('/update-restaurant-details/:docId', upload.single('logo'), async (req, res) => {
    const { docId } = req.params;
    const { nomeRistorante } = req.body;
    
    try {
        const docRef = db.collection('ristoranti').doc(docId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });

        const updateData = { nomeRistorante };

        if (req.file) {
            const oldData = docSnap.data();
            if (oldData.logoUrl) {
                const publicId = 'logos/' + oldData.logoUrl.split('/logos/')[1].split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            const result = await uploadToCloudinary(req.file.buffer, 'logos');
            updateData.logoUrl = result.secure_url;
        }

        await docRef.update(updateData);
        res.json({ success: true, message: 'Dati aggiornati!', updatedData: updateData });

    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'aggiornamento.' });
    }
});

// --- ROTTE ADMIN ---

app.get('/restaurants', async (req, res) => {
    try {
        const snapshot = await db.collection('ristoranti').get();
        const restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: 'Impossibile recuperare i ristoranti.' });
    }
});

app.post('/create-restaurant', upload.single('logo'), async (req, res) => {
    const { nomeRistorante, email, password } = req.body;
    if (!nomeRistorante || !email || !password) return res.status(400).json({ error: 'Dati mancanti.' });
    try {
        let logoUrl = null;
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, 'logos');
            logoUrl = result.secure_url;
        }
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        const restaurantId = nomeRistorante.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-5);

        await db.collection('ristoranti').add({
            nomeRistorante, email, password: hashedPassword, restaurantId, logoUrl
        });
        res.status(201).json({ message: 'Ristorante creato con successo.' });
    } catch (error) {
        res.status(500).json({ error: 'Errore nella creazione del ristorante.' });
    }
});

app.delete('/delete-restaurant/:docId', async (req, res) => {
    const { docId } = req.params;
    try {
        const restoDoc = await db.collection('ristoranti').doc(docId).get();
        if (!restoDoc.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });
        
        const restaurantData = restoDoc.data();
        const restaurantId = restaurantData.restaurantId;

        if (restaurantData.logoUrl) {
            const publicId = 'logos/' + restaurantData.logoUrl.split('/logos/')[1].split('.')[0];
            await cloudinary.uploader.destroy(publicId);
        }

        const menuSnapshot = await db.collection(`ristoranti/${restaurantId}/menu`).get();
        const dishImagePublicIds = [];
        menuSnapshot.forEach(doc => {
            const photoUrl = doc.data().photoUrl;
            if (photoUrl && photoUrl.includes('cloudinary')) {
                const folder = photoUrl.includes('/dishes/') ? 'dishes' : 'uploads';
                const publicId = folder + '/' + photoUrl.split(`/${folder}/`)[1].split('.')[0];
                dishImagePublicIds.push(publicId);
            }
        });
        if (dishImagePublicIds.length > 0) await cloudinary.api.delete_resources(dishImagePublicIds);

        const path = `ristoranti/${restaurantId}`;
        const collections = await db.collection(path).listCollections();
        for (const collection of collections) {
            await db.recursiveDelete(collection);
        }
        await db.collection('ristoranti').doc(docId).delete();

        res.json({ message: 'Ristorante e tutti i dati associati eliminati.' });
    } catch (error) {
        console.error("ERRORE ELIMINAZIONE:", error);
        res.status(500).json({ error: 'Errore durante l\'eliminazione completa.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));
