/**
 * print-individual-plan.js
 * ملف مخصص لطباعة الخطة الفردية لموجه محدد
 * إعداد: هيثم محمود
 */

function printIndividualPlan(plansData, selectedSupervisorName, metadata = {}) {
    if (!plansData || !Array.isArray(plansData) || plansData.length === 0) {
        alert("لا توجد بيانات متاحة للطباعة.");
        return;
    }

    if (!selectedSupervisorName) {
        alert("يرجى اختيار الموجه أولاً لطباعة الخطة الفردية.");
        return;
    }

    // تصفية البيانات المخصصة للموجه المحدد فقط
    const filteredData = plansData.filter(item => 
        item.supervisorName && item.supervisorName.trim() === selectedSupervisorName.trim()
    );

    if (filteredData.length === 0) {
        alert("لا توجد خطة مسجلة للموجه: " + selectedSupervisorName);
        return;
    }

    const monthPeriod = metadata.monthPeriod || "الشهر الحالي";
    const administration = metadata.administration || "إدارة الضبعة التعليمية";
    const subject = metadata.subject || "الرياضيات";

    const printWindow = window.open('', '_blank', 'width=900,height=750');
    if (!printWindow) {
        alert("يرجى السماح بالنوافذ المنبثقة (Pop-ups) للتمكن من الطباعة.");
        return;
    }

    const tableRows = filteredData.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.dayDate || '-'}</td>
            <td>${item.schoolName || '-'}</td>
            <td>${item.taskType || 'زيارة توجيهية'}</td>
            <td>${item.notes || '-'}</td>
        </tr>
    `).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>الخطة الفردية - ${selectedSupervisorName}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 12mm;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            margin: 0;
            padding: 10px;
            color: #000;
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
        }
        .header-cell.right { text-align: right; width: 35%; }
        .header-cell.center { text-align: center; width: 30%; }
        .header-cell.left { text-align: left; width: 35%; }
        
        .title { font-size: 16pt; font-weight: bold; margin: 3px 0; }
        .info-card {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            padding: 10px 15px;
            margin-bottom: 15px;
            border-radius: 4px;
            font-size: 11pt;
            display: flex;
            justify-content: space-between;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            border: 1px solid #000;
            padding: 8px 5px;
            text-align: center;
            font-size: 11pt;
        }
        th {
            background-color: #e9ecef !important;
            font-weight: bold;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .footer-signatures {
            margin-top: 40px;
            display: table;
            width: 100%;
        }
        .signature-cell {
            display: table-cell;
            text-align: center;
            width: 50%;
            font-weight: bold;
            font-size: 11pt;
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
            <div class="title">خطة الموجه الفردية</div>
        </div>
        <div class="header-cell left">
            <div>شهر: ${monthPeriod}</div>
            <div>إعداد: هيثم محمود</div>
        </div>
    </div>

    <div class="info-card">
        <span><strong>اسم الموجه:</strong> ${selectedSupervisorName}</span>
        <span><strong>المادة:</strong> ${subject}</span>
        <span><strong>الفترة:</strong> ${monthPeriod}</span>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 8%;">م</th>
                <th style="width: 22%;">اليوم والتاريخ</th>
                <th style="width: 35%;">المدرسة / المقر المستهدف</th>
                <th style="width: 20%;">نوع المهمة</th>
                <th style="width: 15%;">ملاحظات</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>

    <div class="footer-signatures">
        <div class="signature-cell">مقدمه الموجه<br><strong>${selectedSupervisorName}</strong><br><br>التوقيع: ....................</div>
        <div class="signature-cell">يعتمد، الموجه الأول<br><br><br>التوقيع: ....................</div>
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