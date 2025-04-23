// shared_data.js - نظام مشاركة البيانات المحسن لمتجر الجحدري

// مفتاح التخزين المحلي
const STORAGE_KEY = 'aljahdari_store_accounts';

// تعريف فئات الحسابات
const CATEGORIES = [
    { id: 'premium', name: 'ممتاز' },
    { id: 'good', name: 'جيد' },
    { id: 'economic', name: 'اقتصادي' },
    { id: 'special', name: 'خاص' }
];

// الحصول على قائمة الفئات
function getCategories() {
    return CATEGORIES;
}

// الحصول على اسم الفئة من معرفها
function getCategoryName(categoryId) {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.name : 'غير محدد';
}

// إعادة ترقيم جميع الحسابات
function renumberAccounts(accounts) {
    // ترتيب الحسابات حسب تاريخ الإنشاء (الأقدم أولاً)
    accounts.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    
    // إعادة ترقيم الحسابات
    accounts.forEach((account, index) => {
        account.accountNumber = (index + 1).toString().padStart(3, '0'); // مثال: 001, 002, ...
    });
    
    return accounts;
}

// الحصول على جميع الحسابات
async function getAllAccounts() {
    try {
        // إضافة تأخير صغير لمحاكاة طلب الشبكة
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // الحصول على الحسابات من التخزين المحلي
        const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        
        // التأكد من أن جميع الحسابات لديها أرقام
        if (accounts.length > 0 && !accounts[0].accountNumber) {
            const renumberedAccounts = renumberAccounts(accounts);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(renumberedAccounts));
            console.log("تم إعادة ترقيم الحسابات:", renumberedAccounts.length);
            return renumberedAccounts;
        }
        
        console.log("تم استرجاع الحسابات:", accounts.length);
        return accounts;
    } catch (error) {
        console.error("خطأ في الحصول على الحسابات:", error);
        return [];
    }
}

// الحصول على الحسابات حسب الفئة
async function getAccountsByCategory(categoryId) {
    try {
        const accounts = await getAllAccounts();
        
        // إذا كانت الفئة "الكل"، أعد جميع الحسابات
        if (categoryId === 'all') {
            return accounts;
        }
        
        // تصفية الحسابات حسب الفئة
        return accounts.filter(account => account.category === categoryId);
    } catch (error) {
        console.error("خطأ في الحصول على الحسابات حسب الفئة:", error);
        return [];
    }
}

// الحصول على حساب بواسطة المعرف
async function getAccount(id) {
    try {
        const accounts = await getAllAccounts();
        return accounts.find(account => account.id === id) || null;
    } catch (error) {
        console.error("خطأ في الحصول على الحساب بواسطة المعرف:", error);
        return null;
    }
}

// الحصول على حساب بواسطة رقم الحساب
async function getAccountByNumber(accountNumber) {
    try {
        const accounts = await getAllAccounts();
        return accounts.find(account => account.accountNumber === accountNumber) || null;
    } catch (error) {
        console.error("خطأ في الحصول على الحساب بواسطة رقم الحساب:", error);
        return null;
    }
}

// إضافة حساب جديد
async function addAccount(account) {
    try {
        // إنشاء معرف فريد
        account.id = Date.now().toString();
        
        // إضافة الطابع الزمني
        account.createdAt = new Date().toISOString();
        
        // الحصول على الحسابات الموجودة
        const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        
        // إضافة الحساب الجديد
        accounts.push(account);
        
        // إعادة ترقيم جميع الحسابات
        const renumberedAccounts = renumberAccounts(accounts);
        
        // الحفظ في التخزين المحلي
        localStorage.setItem(STORAGE_KEY, JSON.stringify(renumberedAccounts));
        
        console.log("تم إضافة الحساب بنجاح:", account);
        return true;
    } catch (error) {
        console.error("خطأ في إضافة الحساب:", error);
        return false;
    }
}

// تحديث حساب موجود
async function updateAccount(id, updatedAccount) {
    try {
        // الحصول على الحسابات الموجودة
        const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        
        // البحث عن الحساب المراد تحديثه
        const index = accounts.findIndex(account => account.id === id);
        
        if (index === -1) {
            console.error("الحساب غير موجود:", id);
            return false;
        }
        
        // تحديث الحساب
        accounts[index] = {
            ...accounts[index],
            ...updatedAccount,
            updatedAt: new Date().toISOString()
        };
        
        // إعادة ترقيم جميع الحسابات
        const renumberedAccounts = renumberAccounts(accounts);
        
        // الحفظ في التخزين المحلي
        localStorage.setItem(STORAGE_KEY, JSON.stringify(renumberedAccounts));
        
        console.log("تم تحديث الحساب بنجاح:", id);
        return true;
    } catch (error) {
        console.error("خطأ في تحديث الحساب:", error);
        return false;
    }
}

// حذف حساب
async function deleteAccount(id) {
    try {
        const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const filteredAccounts = accounts.filter(account => account.id !== id);
        
        // إعادة ترقيم الحسابات بعد الحذف
        const renumberedAccounts = renumberAccounts(filteredAccounts);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(renumberedAccounts));
        console.log("تم حذف الحساب:", id);
        return true;
    } catch (error) {
        console.error("خطأ في حذف الحساب:", error);
        return false;
    }
}

// حذف جميع الحسابات
async function deleteAllAccounts() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log("تم حذف جميع الحسابات");
        return true;
    } catch (error) {
        console.error("خطأ في حذف جميع الحسابات:", error);
        return false;
    }
}

// تصدير البيانات كملف JSON
function exportData() {
    try {
        const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const dataStr = JSON.stringify(accounts, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `aljahdari_store_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        return true;
    } catch (error) {
        console.error("خطأ في تصدير البيانات:", error);
        return false;
    }
}

// استيراد البيانات من ملف JSON
function importData(jsonData) {
    try {
        const accounts = JSON.parse(jsonData);
        
        if (!Array.isArray(accounts)) {
            console.error("بيانات غير صالحة: يجب أن تكون مصفوفة");
            return false;
        }
        
        // إعادة ترقيم الحسابات المستوردة
        const renumberedAccounts = renumberAccounts(accounts);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(renumberedAccounts));
        console.log("تم استيراد البيانات بنجاح:", renumberedAccounts.length);
        return true;
    } catch (error) {
        console.error("خطأ في استيراد البيانات:", error);
        return false;
    }
}

// وظيفة تصحيح لتسجيل الحسابات الحالية في وحدة التحكم
function debugLogAccounts() {
    const accounts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    console.log("الحسابات الحالية:", accounts);
}
