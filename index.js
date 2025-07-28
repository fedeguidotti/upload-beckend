const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// --- INIZIALIZZAZIONE FIREBASE ---
try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("ERRORE CRITICO: File 'firebase-service-account.json' non trovato.", error);
    process.exit(1);
}
const db = admin.firestore();

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.options('*', cors()); 
app.use(express.json());

// --- CONFIGURAZIONE CLOUDINARY ---
cloudinary.config({ 
  cloud_name: 'dyewzmvpa', 
  api_key: '245647176451857', 
  api_secret: 'cR-VWOp7lHX3kV6Wns_TuPm2MiM' 
});

// --- SETUP STORAGE PER UPLOAD IMMAGINI ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req) => req.path.includes('dish') ? 'dish_images' : 'logos',
    allowed_formats: ['jpeg', 'png', 'jpg'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  },
});
const upload = multer({ storage: storage });


// --- LOGIN UNIFICATO (SENZA ID RISTORANTE) ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username e password sono obbligatori.' });
    }

    try {
        // 1. Tentativo di login come RISTORATORE (più comune, quindi primo)
        const restoSnapshot = await db.collection('ristoranti').where('username', '==', username).limit(1).get();
        if (!restoSnapshot.empty) {
            const restaurantDoc = restoSnapshot.docs[0];
            const restaurantData = restaurantDoc.data();
            const isPasswordCorrect = await bcrypt.compare(password, restaurantData.passwordHash);

            if (isPasswordCorrect) {
                return res.json({
                    success: true,
                    role: 'restaurateur',
                    docId: restaurantDoc.id,
                    restaurantId: restaurantData.restaurantId,
                    nomeRistorante: restaurantData.nomeRistorante,
                    logoUrl: restaurantData.logoUrl || null
                });
            }
        }

        // 2. Se non è un ristoratore, cerca tra tutti i ristoranti per un match come CAMERIERE o CUOCO
        const allRestaurantsSnapshot = await db.collection('ristoranti').get();
        for (const restaurantDoc of allRestaurantsSnapshot.docs) {
            const settings = restaurantDoc.data().settings || {};
            const data = restaurantDoc.data();

            // Controlla Cameriere
            const waiterCreds = settings.waiterMode;
            if (waiterCreds && waiterCreds.username === username) {
                const isPasswordCorrect = await bcrypt.compare(password, waiterCreds.passwordHash);
                if (isPasswordCorrect) {
                    return res.json({
                        success: true,
                        role: 'waiter',
                        docId: restaurantDoc.id,
                        restaurantId: data.restaurantId,
                        nomeRistorante: data.nomeRistorante,
                    });
                }
            }

            // Controlla Cuoco
            const cookCreds = settings.cookMode;
            if (cookCreds && cookCreds.username === username) {
                const isPasswordCorrect = await bcrypt.compare(password, cookCreds.passwordHash);
                if (isPasswordCorrect) {
                    return res.json({
                        success: true,
                        role: 'cook',
                        docId: restaurantDoc.id,
                        restaurantId: data.restaurantId,
                        nomeRistorante: data.nomeRistorante,
                    });
                }
            }
        }

        // 3. Se nessuna credenziale corrisponde dopo tutti i controlli
        res.status(401).json({ success: false, error: 'Credenziali non valide.' });

    } catch (error) {
        console.error("Errore durante il login unificato:", error);
        res.status(500).json({ success: false, error: 'Errore interno del server.' });
    }
});


// --- ROTTE GESTIONE MENU (Accessibili da Ristoratore e Cuoco) ---
app.post('/add-dish/:restaurantId', upload.single('photo'), async (req, res) => {
    const { restaurantId } = req.params;
    const { name, description, price, category, isSpecial, isAvailable } = req.body;
    const isExtraCharge = req.body.isExtraCharge === 'true';
    const allergens = JSON.parse(req.body.allergens || '[]'); 

    if (!name || !price || !category) {
        return res.status(400).json({ error: 'Nome, prezzo e categoria sono obbligatori.' });
    }

    try {
        const newDishData = {
            name,
            description,
            price: parseFloat(price),
            category,
            isSpecial: isSpecial === 'true',
            isExtraCharge,
            allergens,
            photoUrl: req.file ? req.file.path : null,
            isAvailable: isAvailable !== 'false'
        };

        const docRef = await db.collection(`ristoranti/${restaurantId}/menu`).add(newDishData);
        res.status(201).json({ success: true, message: 'Piatto aggiunto!', dishId: docRef.id });

    } catch (error) {
        console.error("Errore aggiunta piatto:", error);
        res.status(500).json({ error: 'Errore server durante l\'aggiunta del piatto.' });
    }
});

app.post('/update-dish/:restaurantId/:dishId', upload.single('photo'), async (req, res) => {
    const { restaurantId, dishId } = req.params;
    const { name, description, price, category, isSpecial, isAvailable } = req.body;
    const isExtraCharge = req.body.isExtraCharge === 'true';
    const allergens = JSON.parse(req.body.allergens || '[]');

    try {
        const docRef = db.collection(`ristoranti/${restaurantId}/menu`).doc(dishId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Piatto non trovato.' });

        const updateData = {
            name, description, price: parseFloat(price), category,
            isSpecial: isSpecial === 'true',
            isExtraCharge,
            allergens,
            isAvailable: isAvailable !== 'false'
        };

        if (req.file) {
            const oldData = docSnap.data();
            if (oldData.photoUrl && oldData.photoUrl.includes('cloudinary')) {
                const publicIdWithFolder = oldData.photoUrl.split('cloudinary.com/v1/')[1].split('/')[2]
                const publicId = publicIdWithFolder.substring(publicIdWithFolder.lastIndexOf('/') + 1).split('.')[0];
                const folder = oldData.photoUrl.includes('/dish_images/') ? 'dish_images' : 'logos';
                await cloudinary.uploader.destroy(`${folder}/${publicId}`);
            }
            updateData.photoUrl = req.file.path;
        }

        await docRef.update(updateData);
        res.json({ success: true, message: 'Piatto aggiornato!' });
    } catch (error) {
        console.error("Errore aggiornamento piatto:", error);
        res.status(500).json({ error: 'Errore durante l\'aggiornamento del piatto.' });
    }
});


// --- ROTTE RISTORATORE (Esclusive) ---
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
            if (oldData.logoUrl && oldData.logoUrl.includes('cloudinary')) {
                const publicId = 'logos/' + oldData.logoUrl.split('/logos/')[1].split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            updateData.logoUrl = req.file.path;
        }
        await docRef.update(updateData);
        const finalData = (await docRef.get()).data();
        res.json({ success: true, message: 'Dati aggiornati!', updatedData: { nomeRistorante: finalData.nomeRistorante, logoUrl: finalData.logoUrl } });
    } catch (error) {
        console.error("Errore aggiornamento dettagli ristorante:", error);
        res.status(500).json({ error: 'Errore durante l\'aggiornamento.' });
    }
});

app.post('/update-waiter-credentials/:docId', async (req, res) => {
    const { docId } = req.params;
    const { username, password } = req.body;

    if (!username) return res.status(400).json({ error: 'Il nome utente è obbligatorio.' });

    try {
        const docRef = db.collection('ristoranti').doc(docId);
        await db.runTransaction(async (transaction) => {
            const docSnap = await transaction.get(docRef);
            if (!docSnap.exists) throw new Error('Ristorante non trovato');
            
            const settings = docSnap.data().settings || {};
            const waiterMode = settings.waiterMode || {};
            
            waiterMode.username = username;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                waiterMode.passwordHash = await bcrypt.hash(password, salt);
            }
    
            transaction.set(docRef, { settings: { ...settings, waiterMode } }, { merge: true });
        });
        res.json({ success: true, message: 'Credenziali cameriere aggiornate!' });

    } catch (error) {
        console.error("Errore aggiornamento credenziali cameriere:", error);
        res.status(500).json({ error: 'Errore durante l\'aggiornamento delle credenziali.' });
    }
});

app.post('/update-cook-credentials/:docId', async (req, res) => {
    const { docId } = req.params;
    const { username, password } = req.body;

    if (!username) return res.status(400).json({ error: 'Il nome utente del cuoco è obbligatorio.' });

    try {
        const docRef = db.collection('ristoranti').doc(docId);
        await db.runTransaction(async (transaction) => {
            const docSnap = await transaction.get(docRef);
            if (!docSnap.exists) throw new Error('Ristorante non trovato');

            const settings = docSnap.data().settings || {};
            const cookMode = settings.cookMode || {};
            
            cookMode.username = username;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                cookMode.passwordHash = await bcrypt.hash(password, salt);
            }
    
            transaction.set(docRef, { settings: { ...settings, cookMode } }, { merge: true });
        });
        res.json({ success: true, message: 'Credenziali cuoco aggiornate!' });

    } catch (error) {
        console.error("Errore aggiornamento credenziali cuoco:", error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});


// --- ROTTE SUPER ADMIN (Non modificate) ---
app.post('/create-restaurant', upload.single('logo'), async (req, res) => {
    const { nomeRistorante, username, password } = req.body;
    if (!nomeRistorante || !username || !password) return res.status(400).json({ error: 'Dati mancanti.' });
    try {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);
        const restaurantId = nomeRistorante.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-5);
        
        const defaultWaiterPassword = 'waiter';
        const waiterPasswordHash = bcrypt.hashSync(defaultWaiterPassword, salt);
        const defaultCookPassword = 'cook';
        const cookPasswordHash = bcrypt.hashSync(defaultCookPassword, salt);

        const defaultSettings = {
            ayce: { enabled: false, price: 25.00, limitOrders: false, maxOrders: 3 },
            coperto: { enabled: false, price: 2.00 },
            waiterMode: {
                enabled: false,
                username: 'cameriere',
                passwordHash: waiterPasswordHash
            },
            cookMode: {
                username: 'cuoco',
                passwordHash: cookPasswordHash
            }
        };

        await db.collection('ristoranti').add({
            nomeRistorante, username, passwordHash,
            restaurantId,
            logoUrl: req.file ? req.file.path : null,
            settings: defaultSettings
        });
        res.status(201).json({ message: 'Ristorante creato con successo.' });
    } catch (error) {
        res.status(500).json({ error: 'Errore nella creazione del ristorante.' });
    }
});

// ...altre rotte super admin non modificate (per brevità)

// --- AVVIO SERVER ---
app.get('/', (req, res) => {
  res.send('Backend per Ristoranti Attivo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in ascolto su http://localhost:${PORT}`));
