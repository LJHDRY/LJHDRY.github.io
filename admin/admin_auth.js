// كود التحقق من تسجيل الدخول
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من تسجيل الدخول
    const isLoggedIn = localStorage.getItem('admin_logged_in');
    if (isLoggedIn !== 'true') {
        // إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
        window.location.href = 'login.html';
        return;
    }
    
    // إضافة زر تسجيل الخروج
    const header = document.querySelector('.header');
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-danger';
    logoutBtn.style.position = 'absolute';
    logoutBtn.style.top = '20px';
    logoutBtn.style.left = '20px';
    logoutBtn.textContent = 'تسجيل الخروج';
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('admin_logged_in');
        window.location.href = 'login.html';
    });
    header.appendChild(logoutBtn);
    
    // تحميل إحصائيات الزوار
    loadVisitorStats();
    
    // تحميل الحسابات
    loadAccounts();
});

// وظائف إحصائيات الزوار
async function loadVisitorStats() {
    try {
        // الحصول على تاريخ اليوم
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        
        // الحصول على تواريخ الأسبوع الماضي
        const lastWeekDates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            lastWeekDates.unshift(date.toISOString().split('T')[0]);
        }
        
        // الحصول على إحصائيات الزوار من Firebase
        const db = firebase.firestore();
        const todayStatsRef = db.collection('visitor_stats').doc(dateString);
        const todayStats = await todayStatsRef.get();
        
        // عرض إحصائيات اليوم
        const todayVisitsElement = document.getElementById('todayVisits');
        if (todayVisitsElement) {
            if (todayStats.exists) {
                todayVisitsElement.textContent = todayStats.data().visits || 0;
            } else {
                todayVisitsElement.textContent = '0';
            }
        }
        
        // جمع إحصائيات الأسبوع
        let weeklyVisits = 0;
        const weeklyStats = [];
        
        // الحصول على إحصائيات كل يوم في الأسبوع الماضي
        for (const date of lastWeekDates) {
            const statsRef = db.collection('visitor_stats').doc(date);
            const stats = await statsRef.get();
            
            if (stats.exists) {
                const visits = stats.data().visits || 0;
                weeklyVisits += visits;
                weeklyStats.push({
                    date: date,
                    visits: visits
                });
            } else {
                weeklyStats.push({
                    date: date,
                    visits: 0
                });
            }
        }
        
        // عرض إجمالي زوار الأسبوع
        const weekVisitsElement = document.getElementById('weekVisits');
        if (weekVisitsElement) {
            weekVisitsElement.textContent = weeklyVisits;
        }
        
        // عرض الرسم البياني
        const visitsChartElement = document.getElementById('visitsChart');
        if (visitsChartElement) {
            renderVisitsChart(weeklyStats);
        }
        
    } catch (error) {
        console.error('خطأ في تحميل إحصائيات الزوار:', error);
        
        // استخدام localStorage كخطة بديلة
        try {
            const stats = JSON.parse(localStorage.getItem('visitor_stats') || '{}');
            const today = new Date().toISOString().split('T')[0];
            
            const todayVisitsElement = document.getElementById('todayVisits');
            if (todayVisitsElement) {
                todayVisitsElement.textContent = stats[today] || '0';
            }
            
            // حساب إجمالي الزوار في الأسبوع الماضي
            let weeklyVisits = 0;
            const lastWeekDates = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                lastWeekDates.unshift(dateStr);
                weeklyVisits += (stats[dateStr] || 0);
            }
            
            const weekVisitsElement = document.getElementById('weekVisits');
            if (weekVisitsElement) {
                weekVisitsElement.textContent = weeklyVisits;
            }
            
            // عرض الرسم البياني من البيانات المحلية
            const weeklyStats = lastWeekDates.map(date => ({
                date: date,
                visits: stats[date] || 0
            }));
            
            const visitsChartElement = document.getElementById('visitsChart');
            if (visitsChartElement) {
                renderVisitsChart(weeklyStats);
            }
        } catch (e) {
            console.error('خطأ في تحميل إحصائيات الزوار المحلية:', e);
            const todayVisitsElement = document.getElementById('todayVisits');
            const weekVisitsElement = document.getElementById('weekVisits');
            const visitsChartElement = document.getElementById('visitsChart');
            
            if (todayVisitsElement) todayVisitsElement.textContent = '0';
            if (weekVisitsElement) weekVisitsElement.textContent = '0';
            if (visitsChartElement) visitsChartElement.innerHTML = '<div class="chart-loading">تعذر تحميل الإحصائيات</div>';
        }
    }
}

// عرض الرسم البياني للزوار
function renderVisitsChart(data) {
    const chartContainer = document.getElementById('visitsChart');
    if (!chartContainer) return;
    
    chartContainer.innerHTML = '';
    
    // الحصول على أقصى قيمة لتحديد ارتفاع الرسم البياني
    const maxVisits = Math.max(...data.map(item => item.visits), 1);
    
    // إنشاء أعمدة الرسم البياني
    data.forEach(item => {
        const barHeight = (item.visits / maxVisits) * 100;
        const dayName = getDayName(item.date);
        
        const barContainer = document.createElement('div');
        barContainer.style.display = 'flex';
        barContainer.style.flexDirection = 'column';
        barContainer.style.alignItems = 'center';
        barContainer.style.flex = '1';
        
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${Math.max(barHeight, 5)}%`;
        
        const barValue = document.createElement('div');
        barValue.className = 'chart-bar-value';
        barValue.textContent = item.visits;
        
        const barLabel = document.createElement('div');
        barLabel.className = 'chart-bar-label';
        barLabel.textContent = dayName;
        
        bar.appendChild(barValue);
        barContainer.appendChild(bar);
        barContainer.appendChild(barLabel);
        
        chartContainer.appendChild(barContainer);
    });
}

// الحصول على اسم اليوم من التاريخ
function getDayName(dateString) {
    const date = new Date(dateString);
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[date.getDay()];
}
