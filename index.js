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
// Assicurati di avere il file 'firebase-service-account.json' nella stessa cartella
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- ROTTE PUBBLICHE (PER DASHBOARD RISTORANTE) ---

app.post('/upload', upload.single('dishImage'), async (req, res) => {
    // ... (codice invariato)
});

app.post('/delete-image', async (req, res) => {
    // ... (codice invariato)
});

// --- ROTTE ADMIN (PER GESTIONE RISTORANTI) ---

// LOGIN RISTORATORE (già creato)
app.post('/login', async (req, res) => {
    // ... (codice invariato)
});

// GET: Ottieni la lista di tutti i ristoranti
app.get('/restaurants', async (req, res) => {
    try {
        const snapshot = await db.collection('ristoranti').get();
        const restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: 'Impossibile recuperare i ristoranti.' });
    }
});

// POST: Crea un nuovo ristorante
app.post('/create-restaurant', async (req, res) => {
    const { nomeRistorante, email, password } = req.body;
    if (!nomeRistorante || !email || !password) {
        return res.status(400).json({ error: 'Dati mancanti.' });
    }
    try {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        const restaurantId = nomeRistorante.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-5);

        await db.collection('ristoranti').add({
            nomeRistorante,
            email,
            password: hashedPassword,
            restaurantId
        });
        res.status(201).json({ message: 'Ristorante creato con successo.' });
    } catch (error) {
        res.status(500).json({ error: 'Errore nella creazione del ristorante.' });
    }
});

// DELETE: Elimina un ristorante e tutti i suoi dati
app.delete('/delete-restaurant/:docId', async (req, res) => {
    const { docId } = req.params;
    try {
        // 1. Ottieni l'ID del ristorante
        const restoDoc = await db.collection('ristoranti').doc(docId).get();
        if (!restoDoc.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });
        const restaurantId = restoDoc.data().restaurantId;

        // 2. Trova e cancella tutte le immagini su Cloudinary
        const menuSnapshot = await db.collection(`ristoranti/${restaurantId}/menu`).get();
        const publicIds = [];
        menuSnapshot.forEach(doc => {
            const photoUrl = doc.data().photoUrl;
            if (photoUrl && photoUrl.includes('cloudinary')) {
                const publicId = 'uploads/' + photoUrl.split('/uploads/')[1].split('.')[0];
                publicIds.push(publicId);
            }
        });

        if (publicIds.length > 0) {
            await cloudinary.api.delete_resources(publicIds);
        }

        // 3. Cancella ricorsivamente tutti i dati del ristorante su Firestore
        const path = `ristoranti/${restaurantId}`;
        await db.recursiveDelete(db.collection(path));

        // 4. Cancella il documento principale del ristorante
        await db.collection('ristoranti').doc(docId).delete();

        res.json({ message: 'Ristorante e tutti i dati associati eliminati con successo.' });
    } catch (error) {
        console.error("ERRORE ELIMINAZIONE:", error);
        res.status(500).json({ error: 'Errore durante l\'eliminazione completa del ristorante.' });
    }
});


app.get('/', (req, res) => {
  res.send('Backend per upload immagini su Cloudinary è attivo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));
