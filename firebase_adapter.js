// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDT4YgWtyTz-o5tFK-9DtFBl1mFt36WkcE",
  authDomain: "ljhdryoyb.firebaseapp.com",
  projectId: "ljhdryoyb",
  storageBucket: "ljhdryoyb.firebasestorage.app",
  messagingSenderId: "246696206732",
  appId: "1:246696206732:web:d73dc0081784ac4f0ef6a9",
  measurementId: "G-4X8YJG4Y58"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get Firestore instance
const db = firebase.firestore();
const accountsCollection = 'accounts';

// تقسيم البيانات الكبيرة إلى أجزاء أصغر
function splitDataIntoChunks(data, maxChunkSize = 800000) { // حوالي 800KB
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }
  
  const chunks = [];
  let index = 0;
  
  while (index < data.length) {
    chunks.push(data.substring(index, index + maxChunkSize));
    index += maxChunkSize;
  }
  
  return chunks;
}

// دمج الأجزاء المقسمة
function mergeChunks(chunks) {
  return chunks.join('');
}

// إضافة حساب جديد
async function addAccount(account) {
  try {
    // تعيين رقم الحساب
    const accounts = await getAllAccounts();
    account.accountNumber = accounts.length + 1;
    
    // تقسيم الصور الكبيرة إلى أجزاء إذا لزم الأمر
    if (account.images && account.images.length > 0) {
      const processedImages = [];
      
      for (let i = 0; i < account.images.length; i++) {
        const image = account.images[i];
        
        // إذا كانت الصورة كبيرة جدًا، قم بتقسيمها
        if (image.length > 800000 && image.startsWith('data:')) {
          console.log(`تقسيم صورة كبيرة: ${Math.round(image.length / 1024)} كيلوبايت`);
          
          // تخزين الصورة في مجموعة منفصلة
          const imageId = Date.now() + '_' + i;
          const imageChunks = splitDataIntoChunks(image);
          
          // تخزين كل جزء
          for (let j = 0; j < imageChunks.length; j++) {
            await db.collection('image_chunks').doc(`${imageId}_${j}`).set({
              data: imageChunks[j],
              index: j,
              total: imageChunks.length,
              accountId: account.id || Date.now().toString()
            });
          }
          
          // إضافة مرجع للصورة بدلاً من الصورة نفسها
          processedImages.push(`image_ref:${imageId}:${imageChunks.length}`);
        } else {
          processedImages.push(image);
        }
      }
      
      account.images = processedImages;
    }
    
    // إضافة الحساب إلى Firestore
    const docRef = await db.collection(accountsCollection).add(account);
    account.id = docRef.id;
    
    return account;
  } catch (error) {
    console.error('Error adding account to Firestore:', error);
    
    // استخدام localStorage كخطة بديلة
    console.warn('استخدام localStorage كخطة بديلة بسبب الخطأ');
    account.id = Date.now().toString();
    
    const accounts = JSON.parse(localStorage.getItem('aljahdari_store_accounts') || '[]');
    accounts.push(account);
    
    const renumberedAccounts = renumberAccounts(accounts);
    localStorage.setItem('aljahdari_store_accounts', JSON.stringify(renumberedAccounts));
    
    return account;
  }
}

// الحصول على جميع الحسابات
async function getAllAccounts() {
  try {
    const snapshot = await db.collection(accountsCollection).get();
    const accounts = [];
    
    for (const doc of snapshot.docs) {
      const account = { id: doc.id, ...doc.data() };
      
      // استرجاع الصور المقسمة إذا وجدت
      if (account.images && account.images.length > 0) {
        const processedImages = [];
        
        for (const image of account.images) {
          if (typeof image === 'string' && image.startsWith('image_ref:')) {
            // استرجاع الصورة المقسمة
            const [, imageId, totalChunks] = image.split(':');
            const imageChunks = [];
            
            // استرجاع جميع أجزاء الصورة
            for (let i = 0; i < parseInt(totalChunks); i++) {
              const chunkDoc = await db.collection('image_chunks').doc(`${imageId}_${i}`).get();
              if (chunkDoc.exists) {
                imageChunks.push(chunkDoc.data().data);
              }
            }
            
            // دمج الأجزاء
            if (imageChunks.length === parseInt(totalChunks)) {
              processedImages.push(mergeChunks(imageChunks));
            } else {
              console.warn(`لم يتم العثور على جميع أجزاء الصورة: ${imageId}`);
              processedImages.push(null);
            }
          } else {
            processedImages.push(image);
          }
        }
        
        account.images = processedImages;
      }
      
      accounts.push(account);
    }
    
    // ترتيب الحسابات حسب رقم الحساب
    accounts.sort((a, b) => (a.accountNumber || 0) - (b.accountNumber || 0));
    
    return accounts;
  } catch (error) {
    console.error('Error getting accounts from Firestore:', error);
    
    // استخدام localStorage كخطة بديلة
    console.warn('استخدام localStorage كخطة بديلة بسبب الخطأ');
    const accounts = JSON.parse(localStorage.getItem('aljahdari_store_accounts') || '[]');
    return accounts;
  }
}

// الحصول على حساب محدد
async function getAccount(accountId) {
  try {
    const doc = await db.collection(accountsCollection).doc(accountId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const account = { id: doc.id, ...doc.data() };
    
    // استرجاع الصور المقسمة إذا وجدت
    if (account.images && account.images.length > 0) {
      const processedImages = [];
      
      for (const image of account.images) {
        if (typeof image === 'string' && image.startsWith('image_ref:')) {
          // استرجاع الصورة المقسمة
          const [, imageId, totalChunks] = image.split(':');
          const imageChunks = [];
          
          // استرجاع جميع أجزاء الصورة
          for (let i = 0; i < parseInt(totalChunks); i++) {
            const chunkDoc = await db.collection('image_chunks').doc(`${imageId}_${i}`).get();
            if (chunkDoc.exists) {
              imageChunks.push(chunkDoc.data().data);
            }
          }
          
          // دمج الأجزاء
          if (imageChunks.length === parseInt(totalChunks)) {
            processedImages.push(mergeChunks(imageChunks));
          } else {
            console.warn(`لم يتم العثور على جميع أجزاء الصورة: ${imageId}`);
            processedImages.push(null);
          }
        } else {
          processedImages.push(image);
        }
      }
      
      account.images = processedImages;
    }
    
    return account;
  } catch (error) {
    console.error('Error getting account from Firestore:', error);
    
    // استخدام localStorage كخطة بديلة
    console.warn('استخدام localStorage كخطة بديلة بسبب الخطأ');
    const accounts = JSON.parse(localStorage.getItem('aljahdari_store_accounts') || '[]');
    return accounts.find(account => account.id === accountId) || null;
  }
}

// تحديث حساب
async function updateAccount(accountId, updatedAccount) {
  try {
    // تقسيم الصور الكبيرة إلى أجزاء إذا لزم الأمر
    if (updatedAccount.images && updatedAccount.images.length > 0) {
      const processedImages = [];
      
      for (let i = 0; i < updatedAccount.images.length; i++) {
        const image = updatedAccount.images[i];
        
        // إذا كانت الصورة كبيرة جدًا، قم بتقسيمها
        if (typeof image === 'string' && image.length > 800000 && image.startsWith('data:')) {
          console.log(`تقسيم صورة كبيرة: ${Math.round(image.length / 1024)} كيلوبايت`);
          
          // تخزين الصورة في مجموعة منفصلة
          const imageId = Date.now() + '_' + i;
          const imageChunks = splitDataIntoChunks(image);
          
          // تخزين كل جزء
          for (let j = 0; j < imageChunks.length; j++) {
            await db.collection('image_chunks').doc(`${imageId}_${j}`).set({
              data: imageChunks[j],
              index: j,
              total: imageChunks.length,
              accountId: accountId
            });
          }
          
          // إضافة مرجع للصورة بدلاً من الصورة نفسها
          processedImages.push(`image_ref:${imageId}:${imageChunks.length}`);
        } else {
          processedImages.push(image);
        }
      }
      
      updatedAccount.images = processedImages;
    }
    
    // تحديث الحساب في Firestore
    await db.collection(accountsCollection).doc(accountId).update(updatedAccount);
    
    return { id: accountId, ...updatedAccount };
  } catch (error) {
    console.error('Error updating account in Firestore:', error);
    
    // استخدام localStorage كخطة بديلة
    console.warn('استخدام localStorage كخطة بديلة بسبب الخطأ');
    const accounts = JSON.parse(localStorage.getItem('aljahdari_store_accounts') || '[]');
    const index = accounts.findIndex(account => account.id === accountId);
    
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updatedAccount };
      localStorage.setItem('aljahdari_store_accounts', JSON.stringify(accounts));
      return accounts[index];
    }
    
    return null;
  }
}

// حذف حساب
async function deleteAccount(accountId) {
  try {
    // الحصول على الحساب أولاً للتحقق من وجود صور مقسمة
    const account = await getAccount(accountId);
    
    if (account && account.images) {
      // حذف أجزاء الصور المرتبطة بالحساب
      for (const image of account.images) {
        if (typeof image === 'string' && image.startsWith('image_ref:')) {
          const [, imageId, totalChunks] = image.split(':');
          
          // حذف جميع أجزاء الصورة
          for (let i = 0; i < parseInt(totalChunks); i++) {
            await db.collection('image_chunks').doc(`${imageId}_${i}`).delete();
          }
        }
      }
    }
    
    // حذف الحساب من Firestore
    await db.collection(accountsCollection).doc(accountId).delete();
    
    // إعادة ترقيم الحسابات المتبقية
    const accounts = await getAllAccounts();
    const renumberedAccounts = renumberAccounts(accounts);
    
    // تحديث الحسابات المرقمة
    for (const account of renumberedAccounts) {
      await db.collection(accountsCollection).doc(account.id).update({ accountNumber: account.accountNumber });
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting account from Firestore:', error);
    
    // استخدام localStorage كخطة بديلة
    console.warn('استخدام localStorage كخطة بديلة بسبب الخطأ');
    let accounts = JSON.parse(localStorage.getItem('aljahdari_store_accounts') || '[]');
    accounts = accounts.filter(account => account.id !== accountId);
    
    const renumberedAccounts = renumberAccounts(accounts);
    localStorage.setItem('aljahdari_store_accounts', JSON.stringify(renumberedAccounts));
    
    return true;
  }
}

// حذف جميع الحسابات
async function deleteAllAccounts() {
  try {
    // الحصول على جميع الحسابات
    const snapshot = await db.collection(accountsCollection).get();
    
    // حذف كل حساب
    for (const doc of snapshot.docs) {
      await deleteAccount(doc.id);
    }
    
    // حذف جميع أجزاء الصور
    const chunksSnapshot = await db.collection('image_chunks').get();
    for (const doc of chunksSnapshot.docs) {
      await doc.ref.delete();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting all accounts from Firestore:', error);
    
    // استخدام localStorage كخطة بديلة
    console.warn('استخدام localStorage كخطة بديلة بسبب الخطأ');
    localStorage.removeItem('aljahdari_store_accounts');
    
    return true;
  }
}

// استيراد حسابات
async function importAccounts(accounts) {
  try {
    // حذف جميع الحسابات الحالية
    await deleteAllAccounts();
    
    // إضافة الحسابات الجديدة
    for (const account of accounts) {
      const { id, ...accountData } = account;
      await addAccount(accountData);
    }
    
    return true;
  } catch (error) {
    console.error('Error importing accounts to Firestore:', error);
    
    // استخدام localStorage كخطة بديلة
    console.warn('استخدام localStorage كخطة بديلة بسبب الخطأ');
    const renumberedAccounts = renumberAccounts(accounts);
    localStorage.setItem('aljahdari_store_accounts', JSON.stringify(renumberedAccounts));
    
    return true;
  }
}

// إعادة ترقيم الحسابات
function renumberAccounts(accounts) {
  return accounts.map((account, index) => ({
    ...account,
    accountNumber: index + 1
  }));
}
