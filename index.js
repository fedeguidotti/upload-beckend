const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

// --- INIZIALIZZAZIONE FIREBASE ADMIN ---
try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK inizializzato con successo.");
} catch (error) {
    console.error("ERRORE CRITICO: File 'firebase-service-account.json' non trovato o non valido.", error);
    process.exit(1);
}
const db = admin.firestore();

const app = express();

// --- CONFIGURAZIONE CORS ROBUSTA ---
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
  params: (req, file) => {
    // Determina la cartella in base al percorso della richiesta
    let folder = 'default';
    if (req.path.includes('/add-dish') || req.path.includes('/update-dish')) {
        folder = 'dish_images';
    } else if (req.path.includes('/create-restaurant') || req.path.includes('/update-restaurant') || req.path.includes('/update-restaurant-details')) {
        folder = 'logos';
    }
    
    return {
        folder: folder,
        allowed_formats: ['jpeg', 'png', 'jpg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    };
  },
});
const upload = multer({ storage: storage });

// --- FUNZIONE DI UTILITÀ PER LA CANCELLAZIONE RICORSIVA ---
async function deleteCollection(collectionRef, batchSize = 100) {
    const query = collectionRef.limit(batchSize);
    return new Promise((resolve, reject) => {
      deleteQueryBatch(query, resolve).catch(reject);
    });
  
    async function deleteQueryBatch(query, resolve) {
      const snapshot = await query.get();
      if (snapshot.size === 0) return resolve();
  
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
  
      process.nextTick(() => deleteQueryBatch(query, resolve));
    }
}

// --- ROTTA PER GENERARE QR CODE ---
app.post('/generate-qr', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            margin: 2,
            color: {
                dark:"#000000",
                light:"#FFFFFF"
            }
        });
        res.json({ qrCode: qrCodeDataUrl });
    } catch (err) {
        console.error('Failed to generate QR code', err);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// --- ROTTE GESTIONE PRENOTAZIONI ---
app.post('/restaurants/:docId/reservations', async (req, res) => {
    const { docId } = req.params;
    const { customerName, customerPhone, partySize, tableId, tableName, dateTime, status } = req.body;

    if (!customerName || !partySize || !dateTime) {
        return res.status(400).json({ error: 'Nome, numero persone e data/ora sono obbligatori.' });
    }

    try {
        const newReservation = {
            customerName,
            customerPhone: customerPhone || '',
            partySize: Number(partySize),
            tableId: tableId || '',
            tableName: tableName || 'Non assegnato',
            dateTime: admin.firestore.Timestamp.fromDate(new Date(dateTime)),
            status: status || 'confermata',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection(`ristoranti/${docId}/prenotazioni`).add(newReservation);
        res.status(201).json({ success: true, id: docRef.id, ...newReservation });
    } catch (error) {
        console.error("Errore creazione prenotazione:", error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

app.patch('/restaurants/:docId/reservations/:reservationId', async (req, res) => {
    const { docId, reservationId } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'Il nuovo stato è obbligatorio.' });
    }

    try {
        const resRef = db.collection(`ristoranti/${docId}/prenotazioni`).doc(reservationId);
        await resRef.update({ status: status });
        res.json({ success: true, message: 'Stato prenotazione aggiornato.' });
    } catch (error) {
        console.error("Errore aggiornamento stato prenotazione:", error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});


// --- ROTTE GESTIONE PIATTI ---
app.post('/add-dish/:restaurantId', upload.single('photo'), async (req, res) => {
    const { restaurantId } = req.params;
    const { name, description, price, category } = req.body;
    const isExtraCharge = req.body.isExtraCharge === 'true';
    const allergens = req.body.allergens ? JSON.parse(req.body.allergens) : [];

    if (!name || !price || !category) {
        return res.status(400).json({ error: 'Nome, prezzo e categoria sono obbligatori.' });
    }

    try {
        const newDishData = {
            name,
            description: description || '',
            price: parseFloat(price),
            category,
            isAvailable: true,
            isSpecial: false,
            isExtraCharge,
            allergens,
            photoUrl: req.file ? req.file.path : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection(`ristoranti`).doc(restaurantId).collection('menu').add(newDishData);
        res.status(201).json({ success: true, message: 'Piatto aggiunto con successo!', dishId: docRef.id });

    } catch (error) {
        console.error("Errore aggiunta piatto:", error);
        res.status(500).json({ error: 'Errore interno del server durante l\'aggiunta del piatto.' });
    }
});

app.post('/update-dish/:restaurantId/:dishId', upload.single('photo'), async (req, res) => {
    const { restaurantId, dishId } = req.params;
    const { name, description, price, category } = req.body;
    const isExtraCharge = req.body.isExtraCharge === 'true';
    const allergens = req.body.allergens ? JSON.parse(req.body.allergens) : [];

    try {
        const docRef = db.collection(`ristoranti/${restaurantId}/menu`).doc(dishId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Piatto non trovato.' });

        const updateData = {
            name, description, price: parseFloat(price), category,
            isExtraCharge,
            allergens
        };

        if (req.file) {
            const oldData = docSnap.data();
            if (oldData.photoUrl && oldData.photoUrl.includes('cloudinary')) {
                const publicId = oldData.photoUrl.split('/').pop().split('.')[0];
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


// --- ROTTE DI LOGIN ---
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
        console.error("Errore login ristoratore:", error);
        res.status(500).json({ error: 'Errore interno del server.' });
    }
});

app.post('/waiter-login', async (req, res) => {
    const { restaurantId, username, password } = req.body;
    if (!restaurantId || !username || !password) {
        return res.status(400).json({ error: 'ID Ristorante, username e password sono obbligatori.' });
    }

    try {
        const snapshot = await db.collection('ristoranti').where('restaurantId', '==', restaurantId).limit(1).get();
        
        if (snapshot.empty) {
            return res.status(404).json({ error: 'ID Ristorante non trovato o non valido.' });
        }
        
        const docSnap = snapshot.docs[0];
        const settings = docSnap.data().settings;
        
        if (!settings || !settings.waiterMode || !settings.waiterMode.enabled) {
            return res.status(403).json({ error: 'La modalità cameriere non è attiva per questo ristorante.' });
        }

        const waiterCreds = settings.waiterMode;
        if (username !== waiterCreds.username || !waiterCreds.passwordHash) {
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }
        
        const isPasswordCorrect = await bcrypt.compare(password, waiterCreds.passwordHash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Credenziali non valide.' });
        }

        const data = docSnap.data();
        res.json({
            success: true,
            docId: docSnap.id,
            restaurantId: data.restaurantId,
            nomeRistorante: data.nomeRistorante,
            logoUrl: data.logoUrl || null
        });

    } catch (error) {
        console.error("Errore waiter-login:", error);
        res.status(500).json({ error: 'Errore del server.' });
    }
});


// --- ROTTE GESTIONE RISTORATORE (DASHBOARD) ---
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
        res.json({ success: true, message: 'Dati aggiornati!', nomeRistorante: finalData.nomeRistorante, logoUrl: finalData.logoUrl });
    } catch (error) {
        console.error("Errore aggiornamento dettagli:", error);
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
        console.error("Errore aggiornamento credenziali cameriere:", error);
        res.status(500).json({ error: 'Errore durante l\'aggiornamento delle credenziali.' });
    }
});

// --- ROTTE SUPER ADMIN ---
app.get('/restaurants', async (req, res) => {
    try {
        const snapshot = await db.collection('ristoranti').get();
        const restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(restaurants);
    } catch (error) {
        console.error("Errore recupero ristoranti:", error);
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
            ayce: { enabled: false, price: 25.00, limitOrders: false, maxOrders: 3 },
            coperto: { enabled: false, price: 2.00 },
            waiterMode: { enabled: false, username: 'cameriere', passwordHash: waiterPasswordHash }
        };

        const newRestaurant = {
            nomeRistorante, username, passwordHash,
            restaurantId,
            logoUrl: req.file ? req.file.path : null,
            settings: defaultSettings,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('ristoranti').add(newRestaurant);
        res.status(201).json({ success: true, message: 'Ristorante creato con successo.' });
    } catch (error) {
        console.error("Errore creazione ristorante:", error);
        res.status(500).json({ error: 'Errore nella creazione del ristorante.' });
    }
});

app.delete('/delete-restaurant/:docId', async (req, res) => {
    const { docId } = req.params;
    try {
        const docRef = db.collection('ristoranti').doc(docId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return res.status(404).json({ error: 'Ristorante non trovato.' });

        const collections = await docRef.listCollections();
        for (const collection of collections) {
            await deleteCollection(collection);
        }

        await docRef.delete();

        res.json({ success: true, message: 'Ristorante e tutti i dati associati eliminati con successo.' });
    } catch (error) {
        console.error("Errore eliminazione ristorante:", error);
        res.status(500).json({ error: 'Errore durante l\'eliminazione del ristorante.' });
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
        console.error("Errore aggiornamento admin:", error);
        res.status(500).json({ error: 'Errore durante l\'aggiornamento.' });
    }
});

// --- ROTTE STATISTICHE E UTILITY ---
app.get('/global-stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Le date di inizio e fine sono richieste.' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const restaurantsSnapshot = await db.collection('ristoranti').get();
        const restaurants = restaurantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const allStats = [];

        for (const restaurant of restaurants) {
            const sessionsSnapshot = await db.collection(`ristoranti/${restaurant.id}/historicSessions`).get();

            let totalRevenue = 0, sessionCount = 0, dishesSold = 0;

            sessionsSnapshot.forEach(doc => {
                const sessionData = doc.data();
                if (!sessionData.paidAt || typeof sessionData.paidAt.toDate !== 'function') return;
                
                const paidAtDate = sessionData.paidAt.toDate();
                if (paidAtDate < start || paidAtDate > end) return;

                sessionCount++;
                totalRevenue += sessionData.totalAmount || 0;
                (sessionData.orders || []).forEach(item => {
                    dishesSold += item.quantity || 0;
                });
            });

            allStats.push({
                name: restaurant.nomeRistorante,
                totalRevenue, sessionCount, dishesSold
            });
        }

        res.json(allStats);

    } catch (error) {
        console.error("Errore statistiche globali:", error);
        res.status(500).json({ error: 'Impossibile calcolare le statistiche globali.' });
    }
});

app.get('/analytics/:restaurantId', async (req, res) => {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Date di inizio e fine richieste.' });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const sessionsRef = db.collection(`ristoranti/${restaurantId}/historicSessions`);
        const snapshot = await sessionsRef.get(); // Fetch all, filter in memory

        let totalRevenue = 0;
        let totalSessions = 0;
        const topDishes = {};
        const dailyRevenue = {};
        const dailySessions = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // ANTI-CRASH FILTERING
            if (!data.paidAt || typeof data.paidAt.toDate !== 'function') {
                return; 
            }
            const paidAtDate = data.paidAt.toDate();
            if (paidAtDate < start || paidAtDate > end) {
                return;
            }

            totalSessions++;
            totalRevenue += data.totalAmount || 0;

            const dateKey = paidAtDate.toISOString().split('T')[0];
            dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (data.totalAmount || 0);
            dailySessions[dateKey] = (dailySessions[dateKey] || 0) + 1;

            (data.orders || []).forEach(item => {
                if (item.name && typeof item.quantity === 'number') {
                    topDishes[item.name] = (topDishes[item.name] || 0) + item.quantity;
                }
            });
        });

        const formattedTopDishes = Object.entries(topDishes)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        const formattedDailyData = (dataObj) => {
            const result = [];
            const loopDate = new Date(start);
            while (loopDate <= end) {
                const dateKey = loopDate.toISOString().split('T')[0];
                result.push({
                    date: dateKey,
                    value: dataObj[dateKey] || 0
                });
                loopDate.setDate(loopDate.getDate() + 1);
            }
            return result;
        };

        res.json({
            totalRevenue,
            totalSessions,
            topDishes: formattedTopDishes,
            dailyRevenue: formattedDailyData(dailyRevenue).map(d => ({ date: d.date, revenue: d.value })),
            dailySessions: formattedDailyData(dailySessions).map(d => ({ date: d.date, sessions: d.value }))
        });

    } catch (error) {
        console.error("Errore analytics:", error);
        res.status(500).json({ error: 'Errore nel recupero delle analitiche.' });
    }
});


app.get('/cloudinary-usage', async (req, res) => {
    try {
        const usage = await cloudinary.api.usage({ credits: true });
        res.status(200).json(usage);
    } catch (error) {
        console.error("Errore recupero utilizzo Cloudinary:", error);
        res.status(500).json({ error: "Impossibile recuperare i dati di utilizzo." });
    }
});

app.get('/', (req, res) => {
  res.send('Backend per Ristoranti Attivo e Corretto!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));
