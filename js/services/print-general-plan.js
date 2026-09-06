/**
 * print-general-plan.js
 * ملف مخصص لطباعة الخطة العامة لجميع موجهي إدارة الضبعة
 * إعداد: هيثم محمود
 */

function printGeneralPlan(plansData, metadata = {}) {
    // 1. التحقق من وجود البيانات لتجنب طباعة جدول فارغ
    if (!plansData || !Array.isArray(plansData) || plansData.length === 0) {
        alert("لا توجد بيانات متاحة لطباعة الخطة العامة.");
        return;
    }

    const monthPeriod = metadata.monthPeriod || "الشهر الحالي";
    const administration = metadata.administration || "إدارة الضبعة التعليمية";
    const subject = metadata.subject || "الرياضيات";

    // 2. فتح نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank', 'width=1000,height=750');
    if (!printWindow) {
        alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) للتمكن من الطباعة.");
        return;
    }

    // 3. بناء أسطر الجدول بناءً على كافة البيانات بدون تصفية
    const tableRows = plansData.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.supervisorName || '-'}</td>
            <td>${item.dayDate || '-'}</td>
            <td>${item.schoolName || '-'}</td>
            <td>${item.taskType || 'زيارة توجيهية'}</td>
            <td>${item.notes || '-'}</td>
        </tr>
    `).join('');

    // 4. صياغة كود HTML وتنسيقات الطباعة (Landscape A4)
    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>طباعة الخطة العامة - ${administration}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            margin: 0;
            padding: 10px;
            color: #000;
            background-color: #fff;
        }
        .header-container {
            display: table;
            width: 100%;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .header-cell {
            display: table-cell;
            vertical-align: middle;
            text-align: center;
        }
        .header-cell.right { text-align: right; width: 30%; }
        .header-cell.center { text-align: center; width: 40%; }
        .header-cell.left { text-align: left; width: 30%; }
        
        .title { font-size: 16pt; font-weight: bold; margin: 3px 0; }
        .subtitle { font-size: 12pt; margin: 2px 0; color: #333; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            border: 1px solid #000;
            padding: 8px 4px;
            text-align: center;
            font-size: 10.5pt;
        }
        th {
            background-color: #e9ecef !important;
            font-weight: bold;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        tr:nth-child(even) td {
            background-color: #fcfcfc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .footer-signatures {
            margin-top: 30px;
            display: table;
            width: 100%;
        }
        .signature-cell {
            display: table-cell;
            text-align: center;
            width: 33%;
            font-weight: bold;
            font-size: 11pt;
        }
        @media print {
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="header-container">
        <div class="header-cell right">
            <div>مديرية التربية والتعليم بمطروح</div>
            <div>${administration}</div>
            <div>توجيه مادة: ${subject}</div>
        </div>
        <div class="header-cell center">
            <div class="title">الخطة العامة لموجهي المادة</div>
            <div class="subtitle">عن شهر: ${monthPeriod}</div>
        </div>
        <div class="header-cell left">
            <div>إعداد: هيثم محمود</div>
            <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 5%;">م</th>
                <th style="width: 22%;">اسم الموجه</th>
                <th style="width: 15%;">اليوم والتاريخ</th>
                <th style="width: 28%;">المدرسة / المقر</th>
                <th style="width: 15%;">نوع المهمة</th>
                <th style="width: 15%;">ملاحظات</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>

    <div class="footer-signatures">
        <div class="signature-cell">الموجه الأول<br><br>........................</div>
        <div class="signature-cell">إعداد / هيثم محمود<br><br>........................</div>
        <div class="signature-cell">مدير الإدارة التعليمية<br><br>........................</div>
    </div>

    <script>
        window.onload = function() {
            window.focus();
            window.print();
        };
    </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}