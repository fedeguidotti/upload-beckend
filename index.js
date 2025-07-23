const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("ERRORE: File 'firebase-service-account.json' non trovato.");
    process.exit(1);
}
const db = admin.firestore();

const app = express();

app.use(cors());
app.options('*', cors()); 

app.use(express.json());

// --- CONFIGURAZIONE CLOUDINARY ---
cloudinary.config({ 
  cloud_name: 'dyewzmvpa', 
  api_key: '245647176451857', 
  api_secret: 'cR-VWOp7lHX3kV6Wns_TuPm2MiM' 
});

// --- SETUP STORAGE PER UPLOAD ---
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let folder;
    if (req.path.includes('dish')) {
        folder = 'dish_images';
    } else {
        folder = 'logos';
    }
    return {
        folder: folder,
        allowed_formats: ['jpeg', 'png', 'jpg'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    };
  },
});
const upload = multer({ storage: storage });

// --- ROTTE UPLOAD ---
app.post('/add-dish/:restaurantId', upload.single('photo'), async (req, res) => {
    const { restaurantId } = req.params;
    const { name, description, price, category, isSpecial } = req.body;
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
            isExtraCharge: isExtraCharge,
            allergens,
            photoUrl: req.file ? req.file.path : null
        };

        const docRef = await db.collection(`ristoranti`).doc(restaurantId).collection('menu').add(newDishData);
        res.status(201).json({ success: true, message: 'Piatto aggiunto con successo!', dishId: docRef.id });

    } catch (error) {
        res.status(500).json({ error: 'Errore interno del server durante l\'aggiunta del piatto.' });
    }
});


app.post('/update-dish/:restaurantId/:dishId', upload.single('photo'), async (req, res) => {
    const { restaurantId, dishId } = req.params;
    const { name, description, price, category, isSpecial } = req.body;
    const isExtraCharge = req.body.isExtraCharge === 'true';
    const allergens = JSON.parse(req.body.allergens || '[]');

    try {
        const docRef = db.collection(`ristoranti/${restaurantId}/menu`).doc(dishId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Piatto non trovato.' });

        const updateData = {
            name, description, price: parseFloat(price), category,
            isSpecial: isSpecial === 'true',
            isExtraCharge: isExtraCharge,
            allergens
        };

        if (req.file) {
            const oldData = docSnap.data();
            if (oldData.photoUrl && oldData.photoUrl.includes('cloudinary')) {
                const folder = oldData.photoUrl.includes('/dish_images/') ? 'dish_images' : 'uploads';
                const publicId = folder + '/' + oldData.photoUrl.split(`/${folder}/`)[1].split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            updateData.photoUrl = req.file.path;
        }

        await docRef.update(updateData);
        res.json({ success: true, message: 'Piatto aggiornato!' });
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'aggiornamento del piatto.' });
    }
});


// --- ROTTE ADMIN E UTILITY ---
app.get('/cloudinary-usage', async (req, res) => {
    try {
        const usage = await cloudinary.api.usage({ credits: true });
        res.status(200).json(usage);
    } catch (error) {
        res.status(500).json({ error: "Impossibile recuperare i dati di utilizzo." });
    }
});

// --- ROTTE RISTORATORE ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password sono obbligatori.' });
    try {
        const snapshot = await db.collection('ristoranti').where('username', '==', username).limit(1).get();
        if (snapshot.empty) return res.status(401).json({ success: false, error: 'Credenziali non valide.' });
        
        const restaurantDoc = snapshot.docs[0];
        const restaurantData = restaurantDoc.data();
        const isPasswordCorrect = await bcrypt.compare(password, restaurantData.passwordHash);

        if (!isPasswordCorrect) return res.status(401).json({ success: false, error: 'Credenziali non valide.' });

        res.json({ 
            success: true, 
            docId: restaurantDoc.id,
            restaurantId: restaurantData.restaurantId,
            nomeRistorante: restaurantData.nomeRistorante,
            logoUrl: restaurantData.logoUrl || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

app.post('/waiter-login', async (req, res) => {
    const { restaurantId, username, password } = req.body;
    if (!restaurantId || !username || !password) return res.status(400).json({ error: 'Dati mancanti.' });

    try {
        const docRef = db.collection('ristoranti').doc(restaurantId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });

        const settings = docSnap.data().settings;
        if (!settings || !settings.waiterMode || !settings.waiterMode.enabled) {
            return res.status(403).json({ error: 'La modalità cameriere non è attiva per questo ristorante.' });
        }

        const waiterCreds = settings.waiterMode;
        if (username !== waiterCreds.username || !waiterCreds.passwordHash) {
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }
        
        const isPasswordCorrect = await bcrypt.compare(password, waiterCreds.passwordHash);
        if (!isPasswordCorrect) return res.status(401).json({ error: 'Credenziali non valide.' });

        const data = docSnap.data();
        res.json({
            success: true,
            docId: docSnap.id,
            restaurantId: data.restaurantId,
            nomeRistorante: data.nomeRistorante,
            logoUrl: data.logoUrl || null
        });

    } catch (error) {
        res.status(500).json({ error: 'Errore del server.' });
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
        res.status(500).json({ error: 'Errore durante l\'aggiornamento.' });
    }
});

app.post('/update-waiter-credentials/:docId', async (req, res) => {
    const { docId } = req.params;
    const { username, password } = req.body;

    if (!username) return res.status(400).json({ error: 'Il nome utente è obbligatorio.' });

    try {
        const docRef = db.collection('ristoranti').doc(docId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Ristorante non trovato' });

        const settings = docSnap.data().settings || {};
        const waiterMode = settings.waiterMode || {};
        
        waiterMode.username = username;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            waiterMode.passwordHash = await bcrypt.hash(password, salt);
        }

        await docRef.set({ settings: { ...settings, waiterMode } }, { merge: true });
        res.json({ success: true, message: 'Credenziali cameriere aggiornate!' });

    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'aggiornamento delle credenziali.' });
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
    const { nomeRistorante, username, password } = req.body;
    if (!nomeRistorante || !username || !password) return res.status(400).json({ error: 'Dati mancanti.' });
    try {
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);
        const restaurantId = nomeRistorante.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-5);
        
        const defaultWaiterPassword = '1234';
        const waiterPasswordHash = bcrypt.hashSync(defaultWaiterPassword, salt);

        const defaultSettings = {
            ayce: {
                enabled: false, price: 25.00,
                limitOrders: false, maxOrders: 3 
            },
            coperto: { enabled: false, price: 2.00 },
            waiterMode: {
                enabled: false,
                username: 'cameriere',
                passwordHash: waiterPasswordHash
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

app.delete('/delete-restaurant/:docId', async (req, res) => {
    const { docId } = req.params;
    try {
        const restoDoc = await db.collection('ristoranti').doc(docId).get();
        if (!restoDoc.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });
        
        await db.collection('ristoranti').doc(docId).delete();

        res.json({ message: 'Ristorante e tutti i dati associati eliminati.' });
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'eliminazione.' });
    }
});

app.post('/update-restaurant-admin/:docId', upload.single('logo'), async (req, res) => {
    const { docId } = req.params;
    const { nomeRistorante, username, password } = req.body;
    
    try {
        const docRef = db.collection('ristoranti').doc(docId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });

        const updateData = { nomeRistorante, username };
        if (password) {
            const salt = bcrypt.genSaltSync(10);
            updateData.passwordHash = bcrypt.hashSync(password, salt);
        }
        if (req.file) {
            const oldData = docSnap.data();
            if (oldData.logoUrl && oldData.logoUrl.includes('cloudinary')) {
                const publicId = 'logos/' + oldData.logoUrl.split('/logos/')[1].split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            updateData.logoUrl = req.file.path;
        }

        await docRef.update(updateData);
        res.json({ success: true, message: 'Dati aggiornati!' });
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'aggiornamento.' });
    }
});

app.get('/global-stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Le date di inizio e fine sono richieste.' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const restaurantsSnapshot = await db.collection('ristoranti').get();
        const restaurants = restaurantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const allStats = [];

        for (const restaurant of restaurants) {
            const sessionsSnapshot = await db.collection(`ristoranti/${restaurant.id}/closedSessions`)
                .where('paidAt', '>=', start)
                .where('paidAt', '<=', end)
                .get();

            let totalRevenue = 0, sessionCount = 0, dishesSold = 0;

            sessionsSnapshot.forEach(doc => {
                const sessionData = doc.data();
                sessionCount++;
                totalRevenue += sessionData.totalAmount || 0;
                (sessionData.orderHistory || []).forEach(item => {
                    dishesSold += item.quantity || 1;
                });
            });

            allStats.push({
                name: restaurant.nomeRistorante,
                totalRevenue, sessionCount, dishesSold
            });
        }

        res.json(allStats);

    } catch (error) {
        res.status(500).json({ error: 'Impossibile calcolare le statistiche.' });
    }
});

app.get('/', (req, res) => {
  res.send('Backend per Ristoranti Attivo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));
