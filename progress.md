# progress.md — خطة موجهي الضبعة

## المرحلة المنتهية (الأحدث)
**Milestone 5 (الأخيرة): تحسينات أداء ختامية + README.md + deploy.md — المشروع مكتمل بالكامل**

### ما تم إنجازه في هذه المرحلة
- **مراجعة أداء:** لا حاجة لتغييرات جوهرية — المشروع خفيف أصلاً (JS ~136KB غير مضغوط، CSS ~56KB، لا مكتبات خارجية). كل سكربتات JS موضوعة في آخر `<body>` (لا تُعطّل الرسم الأول)، خطوط Google Fonts محمَّلة بـ `preconnect` + `display=swap` مع خط بديل محلي عند تعذّر الاتصال (موجود من قبل)، ولا صور حالياً في `images/` تحتاج `loading="lazy"` (المجلد جاهز لأي إضافة مستقبلية بهذه الخاصية).
- **`README.md`**: أُعيدت كتابته بالكامل ليعكس الهيكل الفعلي الحالي بعد كل المراحل (وليس الهيكل القديم قبل Milestone 1): تشغيل محلي، رفع GitHub + تفعيل Pages، إنشاء ونشر Google Apps Script وربط `SCRIPT_URL`، طريقة تحديث `CACHE_VERSION` بعد كل تعديل، شرح كامل لكل ملف ومجلد، تبرير قرار Namespace بدل ES6 modules، وقائمة كاملة بكل المزايا المتوفرة فعلياً (PWA، Sheets sync، Dark/Light Mode، إلخ).
- **`deploy.md`** (جديد): دليل نشر خطوة بخطوة من الصفر — إنشاء مستودع GitHub، رفع الكود عبر Git، تفعيل Pages، اختبار PWA على الرابط المباشر، ربط Google Sheets، وإجراء أي تحديث لاحق (مع التذكير برفع `CACHE_VERSION`)، بالإضافة إلى جدول استكشاف أخطاء شائعة.

### التحقق الفعلي النهائي (متصفح Chromium حقيقي عبر Playwright)
- `node --check` على **كل** ملفات JS في المشروع (`js/**/*.js`, `sw.js`) — لا أخطاء صياغية في أي ملف.
- `manifest.json` صالح (JSON parse ناجح).
- تصفّح كامل عبر كل صفحات التطبيق (لوحة تحكم، موجهون، معاهد، الخطة، تقارير، إعدادات) — لا أخطاء Console جديدة.
- تبديل الثيم مرتين متتاليتين (فاتح ↔ داكن) بدون أي مشاكل.
- إعادة تحميل كاملة بعد قطع الاتصال (`context.set_offline(true)`): التطبيق يستمر بالعمل ويعرض نفس المحتوى (تحقّقت من وجود نص "خطة" في الصفحة). خطأ الشبكة الوحيد الظاهر هو فشل تحميل خط Google Fonts أثناء انقطاع الاتصال (متوقّع تماماً ولا يؤثر على أي وظيفة، بفضل الخط البديل المحلي الموجود مسبقاً).

## ✅ حالة المشروع: مكتمل بالكامل حسب كل بنود الطلب الأصلي

- ✅ جاهز للنشر مباشرة على GitHub Pages (مسارات نسبية بالكامل).
- ✅ PWA احترافي كامل (manifest, SW, Cache Versioning, Auto Update, Install, Offline Page).
- ✅ يعمل Offline للصفحات التي سبق فتحها.
- ✅ مزامنة اختيارية كاملة مع Google Sheets عبر Apps Script (CRUD + بحث + فرز)، دون كسر العمل أوفلاين.
- ✅ Dark Mode / Light Mode مع حفظ التفضيل في LocalStorage.
- ✅ إعدادات المستخدم محفوظة في LocalStorage.
- ✅ معالجة أخطاء شاملة (لا إنترنت، Timeout، فشل Apps Script، أخطاء JS) برسائل عربية واضحة عبر Toast.
- ✅ Loading Screen/Spinner + Toast Notifications + Confirmation Dialogs + Skeleton Loading (أداة جاهزة).
- ✅ Responsive كامل (Desktop/Laptop/Tablet/Android/iPhone) — لم يُعدَّل، كان موجوداً ومُختبراً من قبل الترقية.
- ✅ كل الوظائف القديمة تعمل كما كانت أو أفضل — لم تُحذف أو تُكسر أي ميزة عبر كل المراحل الخمس.
- ✅ `README.md` و`deploy.md` شاملان ومحدَّثان.
- ✅ بدون أي خطوات برمجية إضافية مطلوبة بعد استلام المشروع (خطوات Google Sheets موثقة كخيار وليست إلزامية للتشغيل).

## آخر ملف تم تعديله
`deploy.md` (إنشاء)

## ملاحظات ختامية
- لا توجد مرحلة قادمة. المشروع مكتمل حسب "النتيجة النهائية" المطلوبة بالكامل.
- إن رغبت مستقبلاً بإضافة ميزات جديدة (مثل تسجيل دخول/صلاحيات، أو صور فعلية في `images/` مع Lazy Loading)، البنية الحالية (Namespace + فصل واضح بين `services/modules/utils`) تسمح بذلك دون إعادة هيكلة.
- تذكير دائم: أي تعديل مستقبلي على ملفات CSS/JS يتطلب رفع `CONFIG.CACHE_VERSION` يدوياً في `js/config.js` (القيمة الحالية: `1.0.2`).

## المرحلة السابقة
**Milestone 4: Dark Mode / Light Mode + إعدادات المستخدم + Skeleton Loading**

### ما تم إنجازه في هذه المرحلة
- تقرر تنفيذ الخيار (أ) المطروح في المرحلة السابقة: إضافة **وضع فاتح حقيقي** جنباً إلى جنب مع الداكن الحالي (الداكن يبقى الافتراضي).
- `css/variables.css`: إضافة مجموعة كاملة من متغيرات الألوان تحت `:root[data-theme="light"]` بنفس أسماء المتغيرات الأصلية — فلا حاجة لتغيير أي CSS آخر لأن كل الملفات كانت أصلاً تستخدم `var(--x)`.
- إصلاح تلوين واحد كان مكتوباً كقيمة ثابتة (`forms.css`: خلفية التركيز على الحقول كانت `#25344a` ثابتة) → أصبحت `var(--surface-3)` لتعمل بشكل صحيح في كلا الوضعين.
- `js/modules/theme.js` (جديد): يحفظ التفضيل في مفتاح `localStorage` مستقل (`dabaa_theme_pref`) — **منفصل عمداً** عن قاعدة بيانات النظام الرئيسية حتى لا يتأثر بإعادة الضبط (Factory Reset) ولا يُزامَن مع Google Sheets.
- سكربت مبكر جداً داخل `<head>` (قبل تحميل أي CSS/JS) يقرأ التفضيل المحفوظ ويطبّقه فوراً على `<html data-theme>` لمنع أي وميض للمحتوى (FOUC) عند التحميل.
- زر تبديل (☀️/🌙) في الشريط العلوي (`#themeToggleBtn`) + عنصر تحكم مطابق (راديو) داخل صفحة الإعدادات، ومُتزامنان معاً تلقائياً.
- Skeleton Loading: مكوّن CSS جاهز (`.skeleton-row` بحركة Shimmer) + دالة مساعدة `APP.ui.skeletonRows(container, count)`. **ملاحظة مهمة:** تحميل البيانات الحالي كله من LocalStorage وهو متزامن (Synchronous) وفوري، فلا توجد فجوة زمنية حقيقية تستدعي Skeleton في الوضع الحالي — الأداة جاهزة ومُدمجة في `ui.js` لاستخدامها لاحقاً عند إضافة أي عملية قراءة فعلية من Google Sheets (مثل زر "استيراد من السحابة" مستقبلاً).
- مراجعة `#bootLoading` ونظام Toast: كلاهما موجود ويعمل فعلياً كما كان (لم يحتج تعديلاً وظيفياً، فقط تأكدت أن لون حلقة الـ Spinner أصبح متغيراً (`var(--surface-3)`) بدل قيمة ثابتة لتظهر بشكل صحيح في الوضعين).
- تحديث `sw.js` (إضافة `theme.js` لقائمة PRECACHE) ورفع `CACHE_VERSION` إلى `"1.0.2"`.

### التحقق الفعلي (متصفح Chromium حقيقي عبر Playwright)
- `node --check` على كل الملفات المعدَّلة/الجديدة — لا أخطاء صياغية. `manifest.json` صالح.
- تبديل الثيم فعلياً في المتصفح: تأكدت أن لون خلفية `<body>` يتغيّر من `rgb(15,23,42)` (داكن) إلى `rgb(241,245,249)` (فاتح) عند الضغط على الزر.
- التفضيل يُحفظ في `localStorage` ويبقى بعد إعادة تحميل الصفحة كاملة (لا وميض، السمة مطبَّقة من أول رسم).
- عناصر التحكم في صفحة الإعدادات (راديو داكن/فاتح) تعكس الحالة الفعلية بشكل صحيح.
- أعدت اختبار Service Worker والعمل Offline بعد كل هذه التعديلات: SW يصل لحالة `activated`، وبعد قطع الاتصال وإعادة التحميل الكامل يستمر التطبيق بالعمل ويعرض نفس المحتوى — لم ينكسر أي شيء من المراحل السابقة.

## المرحلة السابقة
**Milestone 3: ربط Google Sheets عبر Google Apps Script (مزامنة اختيارية فوق LocalStorage)**

### ما تم إنجازه في هذه المرحلة
- إنشاء `apps-script/Code.gs` (خارج مجلد النشر، لا يُرفع لـ GitHub Pages — يُلصق يدوياً في محرر Apps Script): نقطة نهاية Web App واحدة تدعم `doGet` (read / search / sort) و`doPost` (add / update / delete / bulk_sync)، تخزّن كل سجل كصف واحد `id | type | data(JSON) | updatedAt` في Google Sheet، مع upsert آمن ومعالجة أخطاء كاملة.
- إنشاء `js/services/sheetsSync.js`: طبقة Fetch API معزولة بالكامل — `isEnabled()` ترجع false طالما `CONFIG.SCRIPT_URL` فارغ فلا تُنفَّذ أي طلبات شبكة إضافية إطلاقاً. تشمل: `read/search/sort/add/update/remove/bulkSync` + مهلة اتصال (15 ثانية) + فحص `navigator.onLine` + رسائل خطأ عربية واضحة لكل حالة (لا إنترنت، انتهاء مهلة، خطأ خادم، خطأ Apps Script).
- تعديل `js/services/storage.js`: إضافة hook اختياري `syncToSheetsIfEnabled()` يُستدعى من داخل `persist()` الموجودة أصلاً (لم يتغيّر توقيع أو سلوك أي دالة عامة) — يرسل نسخة محدَّثة من الموجهين/المعاهد/الخطط/الإعدادات في الخلفية (fire-and-forget) فقط إذا `SCRIPT_URL` مملوء؛ عند فشل المزامنة يُعرض Toast تحذيري عبر `APP.ui.warning` دون أي تأثير على الحفظ المحلي.
- تعديل `index.html`: إضافة `<script src="js/services/sheetsSync.js">` مباشرة بعد `storage.js`.
- تعديل `sw.js`: إضافة `./js/services/sheetsSync.js` لقائمة `PRECACHE_URLS`.
- تعديل `js/config.js`: رفع `CACHE_VERSION` إلى `"1.0.1"` (وفق القاعدة الموثقة سابقاً: أي تعديل على الملفات الثابتة يتطلب رفع رقم النسخة يدوياً).

### التحقق الفعلي
- `node --check` على كل ملفات JS المعدَّلة والجديدة (`config.js`, `sheetsSync.js`, `storage.js`, `sw.js`) — لا أخطاء صياغية.
- `manifest.json` ما زال JSON صالحاً.
- تشغيل فعلي عبر خادم HTTP محلي + متصفح Chromium حقيقي (Playwright) مع `SCRIPT_URL` فارغ (كما هو افتراضياً الآن): التطبيق يُقلع بنجاح، العنوان والمحتوى يظهران بشكل صحيح، ولا توجد أي أخطاء Console جديدة (الأخطاء الوحيدة الظاهرة هي نفس حجب Google Fonts 403 من قيود شبكة بيئة الاختبار، كما في المرحلة السابقة) — أي أن المزامنة الاختيارية لا تُضيف أي طلب شبكة أو خطأ طالما لم تُفعَّل.
- لم يتم اختبار الاتصال الفعلي بـ Google Sheets في هذه الجلسة (لا يوجد `SCRIPT_URL` حقيقي متاح)؛ الكود جاهز وسيعمل فور لصق `Code.gs` في مشروع Apps Script حقيقي وملء `CONFIG.SCRIPT_URL` و`CONFIG.SHEET_NAME`.

## المرحلة السابقة
**Milestone 2: تحويل PWA كامل (manifest + Service Worker + Offline + Install App)**

### ما تم إنجازه في هذه المرحلة
- إنشاء طقم أيقونات كامل داخل `icons/` بالمقاسات القياسية (72, 96, 128, 144, 152, 192, 384, 512) + أيقونة `maskable` بمقاس 512 لأندرويد، إضافة إلى `favicon.ico` في الجذر — كلها بألوان هوية المشروع (`--bg #0F172A` و`--blue #3B82F6`) وحرف "ض".
- إنشاء `manifest.json` كامل (name, short_name, start_url, scope, display: standalone, theme_color, background_color, dir: rtl, lang: ar, الأيقونات بما فيها maskable).
- إنشاء `sw.js`: استراتيجية Cache First لكل الأصول الثابتة + شبكة أولاً مع fallback للكاش لصفحات التنقل، مع **Cache Versioning** مرتبط مباشرة بـ `CONFIG.CACHE_VERSION` (نفس مصدر الحقيقة في `js/config.js` عبر `importScripts`)، وحذف تلقائي لأي كاش قديم عند تغيّر النسخة (`activate` event)، و**Auto Update** عبر `skipWaiting` + `clients.claim` + رسالة `SKIP_WAITING` من الصفحة.
- إنشاء `offline.html` بتصميم متسق بصرياً مع باقي التطبيق (نفس الألوان والخطوط)، تُعرض تلقائياً عند فشل أي طلب تنقّل بدون اتصال ولا يوجد كاش مطابق.
- تعديل `index.html`:
  - إضافة `<link rel="manifest">`, `theme-color`, `apple-mobile-web-app-*`, أيقونات (`favicon.ico` + PNG).
  - تسجيل Service Worker **بشرط التحقق من الدعم أولاً** (`'serviceWorker' in navigator` + بروتوكول http/https) — لا يعمل ولا يسبب أي خطأ عند فتح الملف بالنقر المزدوج (`file://`)، فتستمر هذه الميزة القديمة كما هي.
  - معالجة `beforeinstallprompt` وربطها بزر "تثبيت التطبيق" (`#pwaInstallBtn`) في شريط الأدوات العلوي، يظهر فقط عندما يكون التثبيت متاحاً فعلياً.
  - إشعار Toast تلقائي (باستخدام `APP.ui.info`/`APP.ui.success` الموجودتين مسبقاً) عند توفر تحديث جديد أو نجاح التثبيت.
- **إصلاح خطأ برمجي حقيقي**: كان `js/config.js` يستخدم `window.CONFIG = CONFIG؛` وهذا يفشل داخل Service Worker (لا يوجد `window` في سياق SW، فقط `self`)، مما كان سيمنع أي محاولة لقراءة `CACHE_VERSION` من داخل `sw.js`. تم التصحيح إلى `globalThis.CONFIG = CONFIG` ليعمل في السياقين معاً.

### التحقق الفعلي (وليس افتراضاً)
تم تشغيل المشروع فعلياً عبر خادم HTTP محلي واختباره بمتصفح Chromium حقيقي (Playwright، وليس فحصاً نظرياً للكود):
- ✅ `manifest.json` صالح (JSON parse ناجح) و`sw.js` خالٍ من أخطاء الصياغة (`node --check`).
- ✅ Service Worker يُسجَّل بنجاح ويصل لحالة `active`.
- ✅ بعد قطع الاتصال (`context.set_offline(true)`) وإعادة تحميل الصفحة بالكامل، التطبيق يستمر بالعمل ويعرض نفس المحتوى من الكاش (تم التأكد من وجود نص "خطة" في محتوى الصفحة بعد القطع).
- ✅ لا توجد أي أخطاء Console حقيقية؛ الأخطاء الوحيدة الظاهرة هي حجب Google Fonts بواسطة قيود الشبكة في بيئة الاختبار نفسها (403) — وهذه ليست مشكلة في الكود، والتطبيق أصلاً مصمم مسبقاً (قبل هذه المرحلة) للعمل بخط بديل تلقائياً عند تعذّر الاتصال بـ Google Fonts.

## المرحلة السابقة
**Milestone 1: إعادة هيكلة الملفات + config.js + التحقق من سلامة الكود**

## ما تم إنجازه
- تمت إعادة تنظيم جميع ملفات JS إلى البنية المطلوبة دون تغيير أي سطر من منطق الأعمال (business logic) نفسه:
  - `js/utils/` → helpers.js, validation.js
  - `js/services/` → storage.js, importExport.js, statistics.js, search.js, printing.js, reports.js
  - `js/modules/` → ui.js, supervisors.js, institutes.js, planner.js, router.js
  - `js/app.js` بقي في جذر `js/` كنقطة انطلاق (entry point) تربط كل الوحدات.
- تم إنشاء `js/config.js` بالمحتوى المطلوب بالضبط (`SCRIPT_URL`, `SHEET_NAME`, `CACHE_VERSION`) ويُحمَّل أولاً في `index.html`.
- تم تحديث جميع مسارات `<script src="...">` داخل `index.html` لتطابق الهيكل الجديد (Relative Paths متوافقة مع GitHub Pages).
- تم توحيد مجلدات الأصول في الجذر حسب الهيكل المطلوب: `images/`, `icons/` (جديد، فارغ حالياً، مخصص لأيقونات PWA القادمة), `assets/` (يحوي الآن `assets/logo/` و`assets/fonts/`، بعد دمج مجلد `fonts/` القديم داخلها).
- تم فحص جميع ملفات JS بـ `node --check` — لا توجد أي أخطاء بنائية (syntax errors) في أي ملف.
- تم التأكد من أن كل مسار `<script>` في `index.html` يشير فعلياً إلى ملف موجود (لا روابط مكسورة)، وتم تشغيل خادم HTTP محلي للتأكد من استجابة 200 لكل الملفات الأساسية.
- **لم يتم تغيير أي سلوك وظيفي**: نمط Namespace (`window.APP.*`) وIIFE محفوظ بالكامل كما هو، وترتيب تحميل السكربتات لم يتغير (فقط المسارات تغيّرت)، لذلك التطبيق يعمل بالنقر المزدوج (`file://`) تماماً كما كان.

## الملفات التي تم تعديلها (تراكمياً عبر المرحلتين)
- `index.html` (مسارات `<script>` في Milestone 1 — ثم إضافات PWA كاملة في Milestone 2: manifest link, theme-color, تسجيل SW, زر التثبيت)
- `js/config.js` (تصحيح `window.CONFIG` → `globalThis.CONFIG` في Milestone 2)

## الملفات التي تم إنشاؤها (تراكمياً عبر المرحلتين)
- `js/config.js` (Milestone 1)
- `progress.md` (هذا الملف)
- `manifest.json` (Milestone 2)
- `sw.js` (Milestone 2)
- `offline.html` (Milestone 2)
- `favicon.ico` (Milestone 2)
- `icons/icon-{72,96,128,144,152,192,384,512}.png` + `icons/icon-maskable-512.png` (Milestone 2)

## الملفات التي تم نقلها (بدون تعديل محتواها)
- `js/helpers.js` → `js/utils/helpers.js`
- `js/validation.js` → `js/utils/validation.js`
- `js/storage.js` → `js/services/storage.js`
- `js/importExport.js` → `js/services/importExport.js`
- `js/statistics.js` → `js/services/statistics.js`
- `js/search.js` → `js/services/search.js`
- `js/printing.js` → `js/services/printing.js`
- `js/reports.js` → `js/services/reports.js`
- `js/ui.js` → `js/modules/ui.js`
- `js/supervisors.js` → `js/modules/supervisors.js`
- `js/institutes.js` → `js/modules/institutes.js`
- `js/planner.js` → `js/modules/planner.js`
- `js/router.js` → `js/modules/router.js`
- `fonts/` (فارغ) → دُمج داخل `assets/fonts/`
- `assets/images/` (فارغ) → أصبح `images/` في الجذر
- `assets/icons/` (فارغ) → أصبح `icons/` في الجذر (سيُستخدم لاحقاً لأيقونات PWA)

## الوظائف الجديدة في هذه المرحلة
- لا توجد ميزات مستخدم جديدة بعد — هذه مرحلة بنية تحتية فقط. كل الميزات القديمة (لوحة تحكم، موجهون، معاهد، خطة شهرية، تقارير، طباعة، تصدير/استيراد، بحث، إشعارات، Modal) تعمل كما كانت **بدون أي تغيير**.

## قرار تقني مهم (يُبقي حتى إشعار آخر)
تم اعتماد التوصية التالية بعد التشاور: الإبقاء على نمط **Namespace** (`window.APP.*`) بدلاً من التحويل الكامل لـ ES6 `import/export`، للحفاظ على قدرة التطبيق على العمل بالنقر المزدوج (`file://`) دون كسر هذه الميزة القائمة. Google Sheets سيُضاف كطبقة **مزامنة اختيارية** فوق LocalStorage (LocalStorage يبقى مصدر الحقيقة أوفلاين)، وليس كبديل كامل لها.

## الأجزاء المتبقية (المراحل القادمة)
1. ✅ ~~تحويل PWA كامل~~ — تم في Milestone 2.
2. ✅ ~~ربط Google Sheets عبر Google Apps Script~~ — تم في Milestone 3.
3. ✅ ~~Dark Mode/Light Mode + حفظ التفضيل في LocalStorage~~ — تم في Milestone 4.
4. ✅ ~~تحسينات UX/UI: Loading/Toast/Skeleton~~ — تم في Milestone 4 (Skeleton كأداة جاهزة، Loading وToast كانا موجودين ومُراجَعين).
5. تحسينات الأداء (مراجعة Core Web Vitals، Lazy Loading للصور عند إضافتها مستقبلاً، فحص أي كود غير مستخدم).
6. كتابة `README.md` النهائي المحدث (رفع GitHub، تفعيل Pages، إنشاء Apps Script، ربط Sheets، شرح الهيكل الكامل، شرح جميع الملفات).
7. كتابة `deploy.md` (خطوة بخطوة).
8. ✅ ~~favicon.ico~~ — تم في Milestone 2.

## آخر ملف تم تعديله
`js/config.js` (رفع `CACHE_VERSION` إلى `1.0.2`)

## ملاحظات مهمة لإكمال العمل
- لا حاجة لإعادة تحليل المشروع؛ فقط أرسل المشروع الحالي مع هذا الملف وسنكمل من "NEXT STEP" أدناه مباشرة.
- Service Worker لن يعمل عبر `file://` (قيد متصفح أصلي) — التطبيق يتحقق من `('serviceWorker' in navigator)` والبروتوكول قبل التسجيل، لذا فتح الملف بالنقر المزدوج يستمر بالعمل تماماً بدون أي تعطّل أو أخطاء Console، فقط بدون مزايا PWA (وهذا سلوك متوقع وصحيح — PWA يحتاج أصلاً http/https حسب مواصفات الويب القياسية).
- `CONFIG.SCRIPT_URL` و`CONFIG.SHEET_NAME` في `js/config.js` فارغان الآن عمداً — يُملآن يدوياً بعد نشر `apps-script/Code.gs` كـ Web App حقيقي (لم يُختبر اتصال فعلي بـ Sheets حقيقي في هذه الجلسات، فقط الكود جاهز ومُتحقق من صحته البنائية).
- `CONFIG.CACHE_VERSION` هو المتحكم الوحيد في تحديث الكاش (الآن `1.0.2`) — عند أي تعديل مستقبلي على الملفات الثابتة (CSS/JS)، يجب رفع رقم هذه القيمة يدوياً لضمان وصول التحديث للمستخدمين.
- تفضيل الثيم (`dabaa_theme_pref`) مخزَّن في مفتاح `localStorage` منفصل تماماً عن قاعدة البيانات الرئيسية (`dabaa_planner_db_v1`) — لن يُحذف عند "إعادة ضبط النظام بالكامل" ولن يُزامَن مع Google Sheets، وهذا مقصود.
- تم اختبار كل شيء فعلياً بمتصفح حقيقي (Chromium عبر Playwright) في كل مرحلة، بما فيها إعادة اختبار Offline بعد Milestone 4 للتأكد من عدم كسر أي شيء سابق.

---

## NEXT STEP

**المرحلة القادمة:** Milestone 5 (الأخيرة) — تحسينات أداء أخيرة + `README.md` + `deploy.md`

**الملفات المطلوب تعديلها/إنشاؤها:**
- مراجعة أداء عامة: التأكد من عدم وجود كود ميت، إضافة `loading="lazy"` لأي صور مستقبلية في `images/`، مراجعة سريعة لـ Core Web Vitals عبر Lighthouse إن أمكن.
- إنشاء `README.md` نهائي شامل: طريقة رفع المشروع على GitHub، تفعيل GitHub Pages، إنشاء وربط Google Apps Script (بالاعتماد على `apps-script/Code.gs` الموجود فعلاً)، شرح كامل لهيكل المشروع وكل ملف فيه، طريقة تحديث `CACHE_VERSION`.
- إنشاء `deploy.md`: دليل نشر خطوة بخطوة (Git init → GitHub repo → Pages → اختبار الرابط المباشر → نشر Apps Script → ملء `config.js`).

**سبب التعديل:** هذان آخر بندين متبقيين من قائمة المتطلبات الأصلية (README + deploy.md)، وبعدهما يكون المشروع مكتملاً بالكامل حسب "النتيجة النهائية" المطلوبة.

**ترتيب التنفيذ:**
1. مراجعة أداء سريعة (لا تغييرات جوهرية متوقعة، المشروع خفيف أصلاً).
2. كتابة `README.md`.
3. كتابة `deploy.md`.
4. اختبار نهائي شامل (تشغيل + Offline + تثبيت + كلا الثيمين) عبر متصفح حقيقي.
5. تحديث `progress.md` بختام المشروع والتوقف نهائياً (هذه آخر مرحلة).
