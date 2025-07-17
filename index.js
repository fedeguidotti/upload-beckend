const express = require('express');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const sharp = require('sharp');
const { Readable } = require('stream');
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
app.use(express.json());

// --- CONFIGURAZIONE CLOUDINARY ---
cloudinary.config({ 
  cloud_name: 'dyewzmvpa', 
  api_key: '245647176451857', 
  api_secret: 'cR-VWOp7lHX3kV6Wns_TuPm2MiM' 
});


// --- SETUP PER UPLOAD LOGHI (Il tuo codice originale) ---
const uploadLogo = multer({ storage: multer.memoryStorage() });
const uploadToCloudinary = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
        Readable.from(fileBuffer).pipe(stream);
    });
};


// --- SETUP SPECIFICO PER UPLOAD FOTO PIATTI (Aggiunto e Corretto) ---
const dishStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dish_images',
    allowed_formats: ['jpeg', 'png', 'jpg'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  },
});
const uploadDish = multer({ storage: dishStorage });


// --- ROTTA PER GESTIRE L'UPLOAD DELLE FOTO DEI PIATTI (Aggiunta e Corretta) ---
app.post('/upload-dish-image', uploadDish.single('dishImage'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nessun file caricato.' });
  }
  res.status(200).json({ url: req.file.path });
});


// --- ROTTA PER RECUPERARE I DATI DI UTILIZZO DI CLOUDINARY ---
app.get('/cloudinary-usage', async (req, res) => {
    try {
        const usage = await cloudinary.api.usage();
        res.status(200).json(usage);
    } catch (error) {
        console.error("Errore nel recuperare i dati di utilizzo di Cloudinary:", error);
        res.status(500).json({ error: "Impossibile recuperare i dati di utilizzo." });
    }
});


// --- IL RESTO DEL TUO CODICE ---

async function deleteCollection(db, collectionPath) {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.limit(500).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    await deleteCollection(db, collectionPath);
}

// --- ROTTE RISTORATORE ---

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username e password sono obbligatori.' });
    try {
        const snapshot = await db.collection('ristoranti').where('username', '==', username).limit(1).get();
        if (snapshot.empty) return res.status(401).json({ error: 'Credenziali non valide.' });
        
        const restaurantDoc = snapshot.docs[0];
        const restaurantData = restaurantDoc.data();
        const isPasswordCorrect = await bcrypt.compare(password, restaurantData.passwordHash);

        if (!isPasswordCorrect) return res.status(401).json({ error: 'Credenziali non valide.' });

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

app.post('/update-restaurant-details/:docId', uploadLogo.single('logo'), async (req, res) => {
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
        const finalData = (await docRef.get()).data();
        res.json({ success: true, message: 'Dati aggiornati!', updatedData: { nomeRistorante: finalData.nomeRistorante, logoUrl: finalData.logoUrl } });
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'aggiornamento.' });
    }
});

// --- ROTTE ADMIN ---

app.get('/restaurants', async (req, res) => {
    try {
        const snapshot = await db.collection('ristoranti').orderBy('nomeRistorante').get();
        const restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: 'Impossibile recuperare i ristoranti.' });
    }
});

app.post('/create-restaurant', uploadLogo.single('logo'), async (req, res) => {
    const { nomeRistorante, username, password } = req.body;
    if (!nomeRistorante || !username || !password) return res.status(400).json({ error: 'Dati mancanti.' });
    try {
        let logoUrl = null;
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, 'logos');
            logoUrl = result.secure_url;
        }
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);
        const restaurantId = nomeRistorante.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-5);

        await db.collection('ristoranti').add({
            nomeRistorante, username, passwordHash, passwordPlain: password, restaurantId, logoUrl
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
            await cloudinary.uploader.destroy(publicId).catch(err => console.warn("Logo non trovato"));
        }

        const menuSnapshot = await db.collection(`ristoranti/${restaurantId}/menu`).get();
        const dishImagePublicIds = [];
        menuSnapshot.forEach(doc => {
            const photoUrl = doc.data().photoUrl;
            if (photoUrl && photoUrl.includes('cloudinary')) {
                const folder = photoUrl.includes('/dish_images/') ? 'dish_images' : 'uploads';
                const publicId = folder + '/' + photoUrl.split(`/${folder}/`)[1].split('.')[0];
                dishImagePublicIds.push(publicId);
            }
        });
        if (dishImagePublicIds.length > 0) await cloudinary.api.delete_resources(dishImagePublicIds).catch(err => console.warn("Immagini non trovate"));

        await deleteCollection(db, `ristoranti/${restaurantId}/menu`);
        await deleteCollection(db, `ristoranti/${restaurantId}/menuCategories`);
        await deleteCollection(db, `ristoranti/${restaurantId}/tavoli`);
        
        await db.collection('ristoranti').doc(docId).delete();

        res.json({ message: 'Ristorante e tutti i dati associati eliminati.' });
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'eliminazione.' });
    }
});

app.post('/update-restaurant-admin/:docId', uploadLogo.single('logo'), async (req, res) => {
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
            updateData.passwordPlain = password;
        }
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
        res.json({ success: true, message: 'Dati aggiornati!' });
    } catch (error) {
        res.status(500).json({ error: 'Errore durante l\'aggiornamento.' });
    }
});


app.get('/', (req, res) => {
  res.send('Backend per Ristoranti Attivo!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo su http://localhost:${PORT}`));
