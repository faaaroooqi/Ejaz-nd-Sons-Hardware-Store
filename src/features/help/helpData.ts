export type LanguageMode = 'ur' | 'en' | 'dual'

export interface HelpStep {
  stepNumber: number
  titleEn: string
  titleUr: string
  descriptionEn: string
  descriptionUr: string
  tipEn?: string
  tipUr?: string
}

export interface HelpTopic {
  id: string
  routePatterns: string[]
  titleEn: string
  titleUr: string
  subtitleEn: string
  subtitleUr: string
  iconName: string // e.g. 'ShoppingCart', 'Package', etc.
  category: 'core' | 'catalog' | 'transactions' | 'finance' | 'admin'
  overviewEn: string
  overviewUr: string
  behindTheScenesEn: string[]
  behindTheScenesUr: string[]
  steps: HelpStep[]
  shopkeeperTipsEn: string[]
  shopkeeperTipsUr: string[]
}

export interface WorkflowStage {
  stageNumber: number
  titleEn: string
  titleUr: string
  shortBadgeEn: string
  shortBadgeUr: string
  color: string
  descriptionEn: string
  descriptionUr: string
  whatShopkeeperDoesEn: string
  whatShopkeeperDoesUr: string
  howSystemHandlesItEn: string
  howSystemHandlesItUr: string
  relatedRoute: string
}

export interface FAQItem {
  questionEn: string
  questionUr: string
  answerEn: string
  answerUr: string
  relatedTopicId?: string
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    stageNumber: 1,
    titleEn: '1. Catalog & Price Setup',
    titleUr: '۱. مال، ورائٹی اور ریٹ کا اندراج',
    shortBadgeEn: 'Setup First',
    shortBadgeUr: 'پہلا قدم',
    color: 'emerald',
    descriptionEn: 'Register all hardware items, pipes, fittings, sanitary, tools, and electric supplies with purchase cost, wholesale price, and packaging units (Box, Bundle, Bag, Piece, Kg).',
    descriptionUr: 'دکان کا تمام سامان (جیسے پائپ، والو، نٹ بولٹ، سینیٹری، اوزار وغیرہ) بمعہ قیمتِ خرید، ہول سیل ریٹ اور پیکنگ یونٹ (بوری، کاٹن، بنڈل، پیس) درج کریں۔',
    whatShopkeeperDoesEn: 'Go to Products & SKUs. Click "Add Product", enter name, code/barcode, cost price, and wholesale sale price.',
    whatShopkeeperDoesUr: 'پروڈکٹس مینو میں جا کر نیا سامان درج کریں۔ نام، بارکوڈ/کوڈ، قیمتِ خرید اور گاہک کو دینے والا ہول سیل ریٹ لکھیں۔',
    howSystemHandlesItEn: 'Stores master item specs, tracks barcode for fast billing, and sets base profit margins.',
    howSystemHandlesItUr: 'سسٹم مال کا ڈیٹا محفوظ کرتا ہے تاکہ بل بناتے وقت بارکوڈ اسکین یا نام لکھتے ہی ریٹ خود بخود آ جائے۔',
    relatedRoute: '/products',
  },
  {
    stageNumber: 2,
    titleEn: '2. Purchase & Stock In',
    titleUr: '۲. فیکٹری سے مال خریدنا (اسٹاک اِن)',
    shortBadgeEn: 'Stock Increases',
    shortBadgeUr: 'اسٹاک میں اضافہ',
    color: 'blue',
    descriptionEn: 'When goods arrive from mills, factories, or distributors, record the purchase bill. Stock counts in your warehouse automatically increase.',
    descriptionUr: 'جب فیکٹری، مل یا امپورٹر سے دکان پر مال آئے تو خریداری کا بل (Purchases) درج کریں۔ گودام میں مال خودبخود جمع ہو جائے گا۔',
    whatShopkeeperDoesEn: 'Go to Purchases -> New Purchase. Select the supplier, pick items, enter received quantities and supplier invoice cost.',
    whatShopkeeperDoesUr: 'پرچیز مینو میں جا کر نیا بل بنائیں۔ سپلائر چنیں، سامان اور موصول شدہ تعداد درج کریں اور بل محفوظ کریں۔',
    howSystemHandlesItEn: 'Inventory count goes UP automatically. The supplier\'s Khata (Payables) is credited with the bill amount.',
    howSystemHandlesItUr: 'گودام میں اسٹاک کی تعداد خود بخود بڑھ جاتی ہے اور سپلائر کے کھاتے میں بل کی رقم بقایا لکھ دی جاتی ہے۔',
    relatedRoute: '/purchases',
  },
  {
    stageNumber: 3,
    titleEn: '3. Sales Invoices & Billing',
    titleUr: '۳. گاہک کو فروخت اور بل بنانا',
    shortBadgeEn: 'Stock Decreases',
    shortBadgeUr: 'اسٹاک کی کمی',
    color: 'amber',
    descriptionEn: 'Sell hardware to retail shopkeepers, contractors, or walk-in customers. Supports instant Cash sales or Credit (Udhaar) sales.',
    descriptionUr: 'چھوٹے دکانداروں، ٹھیکیداروں یا نقد گاہکوں کو مال بیچیں۔ نقد بل ہو یا ادھار (کھاتہ)، سب ایک ہی اسکرین سے بنتے ہیں۔',
    whatShopkeeperDoesEn: 'Go to Sales -> New Sale. Select customer (Walk-in Cash or Khata Customer), add items with fast search, enter cash received (if any), and click Save & Print.',
    whatShopkeeperDoesUr: 'سیلز میں جا کر نیا بل بنائیں۔ کسٹمر چنیں، سامان شامل کریں، وصول شدہ نقد رقم لکھیں اور بل پرنٹ نکال کر گاہک کو دیں۔',
    howSystemHandlesItEn: 'Warehouse stock decreases immediately. If unpaid, the remaining balance is added to that customer\'s Khata balance in real time.',
    howSystemHandlesItUr: 'گودام سے مال خود بخود کٹ جاتا ہے۔ اگر بل ادھار ہے تو بقایا رقم فوراً گاہک کے کھاتے میں چڑھ جاتی ہے۔',
    relatedRoute: '/sales',
  },
  {
    stageNumber: 4,
    titleEn: '4. Parties & Khata Ledgers',
    titleUr: '۴. کسٹمرز اور سپلائرز کا کھاتہ',
    shortBadgeEn: 'Ledgers & Balances',
    shortBadgeUr: 'حساب کتاب',
    color: 'purple',
    descriptionEn: 'Transparent two-way ledger management. See exactly who owes you money (Customers) and who you need to pay (Suppliers).',
    descriptionUr: 'دکان کا مکمل ادھار اور کھاتہ رجسٹر۔ دیکھ سکتے ہیں کہ مارکیٹ سے کس کس سے پیسے لینے ہیں اور فیکٹریوں کو کتنے ادا کرنے ہیں۔',
    whatShopkeeperDoesEn: 'Open Customers or Suppliers to inspect total balance, view date-wise statement of accounts, or download ledger reports.',
    whatShopkeeperDoesUr: 'کسٹمرز یا سپلائرز مینو کھول کر کسی بھی پارٹی کا مکمل کھاتہ، پرانے بل اور تاریخ وار لین دین ایک کلک پر چیک کریں۔',
    howSystemHandlesItEn: 'Calculates opening balances, running ledger totals, overdue credit days, and warns if a customer exceeds their credit limit.',
    howSystemHandlesItUr: 'سسٹم ہر بل اور وصولی کے بعد خود بخود نیا بقایا بیلنس نکالتا ہے، تاکہ دستی کاپی میں حساب ملانے کی ضرورت نہ رہے۔',
    relatedRoute: '/customers',
  },
  {
    stageNumber: 5,
    titleEn: '5. Cash Recovery & Payments',
    titleUr: '۵. وصولیاں اور ادائیگیاں (کیش فلو)',
    shortBadgeEn: 'Money In & Out',
    shortBadgeUr: 'پیسوں کی آمد و رفت',
    color: 'teal',
    descriptionEn: 'Record payments when customers pay outstanding credit (Cash / Bank / Cheque), or when you pay your raw material suppliers.',
    descriptionUr: 'جب کوئی گاہک پرانے ادھار کے پیسے لا کر دے یا جب آپ کسی فیکٹری/سپلائر کو کیش یا چیک کے ذریعے ادائیگی کریں۔',
    whatShopkeeperDoesEn: 'Go to Customer Payments to record customer cash receipts. Go to Supplier Payments to log money paid to vendors.',
    whatShopkeeperDoesUr: 'گاہک کی رقم کے لیے Customer Payments میں وصولی ڈالیں۔ اور سپلائر کو ادائیگی کے لیے Supplier Payments میں اندراج کریں۔',
    howSystemHandlesItEn: 'Deducts the paid amount from party\'s pending Khata and logs payment voucher receipt.',
    howSystemHandlesItUr: 'متعلقہ پارٹی کے کھاتے سے اتنی رقم منہا (کم) ہو جاتی ہے اور دکان کے کیش رجسٹر میں رقم کا اندراج ہو جاتا ہے۔',
    relatedRoute: '/customer-payments',
  },
  {
    stageNumber: 6,
    titleEn: '6. Returns & Damaged Stock',
    titleUr: '۶. مال کی واپسی اور خرابی کا تصفیہ',
    shortBadgeEn: 'Stock & Khata Reversal',
    shortBadgeUr: 'واپسی کا اندراج',
    color: 'rose',
    descriptionEn: 'Handle goods returned by customers or defective items sent back to the manufacturer without manual math headaches.',
    descriptionUr: 'اگر گاہک بچا ہوا مال یا فالٹ والا سامان واپس لائے، یا آپ فیکٹری کو خراب مال واپس بھیجیں تو واپسی کا بل بنائیں۔',
    whatShopkeeperDoesEn: 'Use Sales Returns for customer returns, or Purchase Returns for supplier returns. Specify items and reason.',
    whatShopkeeperDoesUr: 'سیل واپسی کے لیے Sales Returns اور سپلائر واپسی کے لیے Purchase Returns درج کریں۔ سامان اور وجہ منتخب کریں۔',
    howSystemHandlesItEn: 'Customer return puts good stock back in inventory and credits the customer\'s balance. Supplier return lowers your payable debt.',
    howSystemHandlesItUr: 'سیل واپسی سے مال دوبارہ اسٹاک میں آ جاتا ہے اور گاہک کے بل سے رقم کٹ جاتی ہے۔ سپلائر واپسی سے آپ کا قرضہ کم ہو جاتا ہے۔',
    relatedRoute: '/sales-returns',
  },
  {
    stageNumber: 7,
    titleEn: '7. Shop Expenses & Profit Reports',
    titleUr: '۷. دکان کے اخراجات اور روزانہ منافع',
    shortBadgeEn: 'Business Health',
    shortBadgeUr: 'اصل بچت اور منافع',
    color: 'indigo',
    descriptionEn: 'Record shop rent, electricity, labor/carriage, food/tea, and see pure Net Profit after all overheads are deducted.',
    descriptionUr: 'دکان کا کرایہ، بجلی بل، مزدوری، کرایہ مال، چائے پانی اور ملازمین کے اخراجات لکھیں تاکہ دکان کا اصل نفع معلوم ہو۔',
    whatShopkeeperDoesEn: 'Log expenses in Expenses. Visit Reports to view Daily Sales, Product Margins, Stock Valuation, and Profit & Loss.',
    whatShopkeeperDoesUr: 'روزانہ کے اخراجات Expenses میں ڈالیں۔ اور Reports میں جا کر چیک کریں کہ آج کتنی سیل ہوئی اور اصل کتنا منافع کمایا۔',
    howSystemHandlesItEn: 'Subtracts total cost of goods and operating expenses from revenue to present accurate wholesale business profit.',
    howSystemHandlesItUr: 'سسٹم فروخت شدہ مال کی اصل قیمت اور دکان کے اخراجات منہا کر کے آپ کو صاف بچت بتاتا ہے۔',
    relatedRoute: '/reports',
  },
]

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'dashboard',
    routePatterns: ['/dashboard', '/'],
    titleEn: 'Main Dashboard & Overview',
    titleUr: 'مرکزی ڈیش بورڈ اور کاروباری جائزہ',
    subtitleEn: 'Real-time overview of daily sales, low stock alerts, and customer receivables',
    subtitleUr: 'روزانہ کی سیل، مارکیٹ میں پھنسے ادھار، اور گودام میں کم اسٹاک کا فوری جائزہ',
    iconName: 'LayoutDashboard',
    category: 'core',
    overviewEn: 'The Dashboard is the command center of your hardware business. It summarizes today\'s sales, outstanding customer receivables, pending supplier payments, and alerts you to items running out of stock.',
    overviewUr: 'ڈیش بورڈ آپ کی دکان کا کنٹرول روم ہے۔ یہاں آپ کو آج کی کل سیل، مارکیٹ سے وصول کرنے والا کل ادھار، سپلائرز کے بقایا جات اور ختم ہونے والے مال کے الرٹس ایک ہی نظر میں ملتے ہیں۔',
    behindTheScenesEn: [
      'Aggregates live database transactions into summary KPI counters.',
      'Scans all inventory items where quantity is below minimum reorder alert level.',
      'Tracks cash collected today vs credit sales made today.',
    ],
    behindTheScenesUr: [
      'تمام سیلز اور خریداری کے بلوں کا فوری مجموعہ بنا کر اسکرین پر دکھاتا ہے۔',
      'گودام میں جو سامان کم ہو چکا ہے اس کی سرخ رنگ میں وارننگ دیتا ہے۔',
      'آج کا نقد کیش اور آج ہوا ادھار الگ الگ بتاتا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Check Today\'s Sales Counter',
        titleUr: 'آج کی کل سیلز دیکھیں',
        descriptionEn: 'Look at the top KPI card to see total sales revenue generated so far today.',
        descriptionUr: 'اوپر والے کارڈز میں دیکھیں کہ آج صبح سے اب تک کتنے روپے کی سیل ہو چکی ہے۔',
        tipEn: 'Click any card to jump directly to its detailed report.',
        tipUr: 'کسی بھی کارڈ پر کلک کر کے آپ اس کی مکمل تفصیلات پر جا سکتے ہیں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Monitor Low Stock Warnings',
        titleUr: 'کم اسٹاک والی وارننگز دیکھیں',
        descriptionEn: 'The Low Stock widget lists critical items (like fast-moving pipe sizes or cement) that must be reordered from suppliers.',
        descriptionUr: 'یہاں وہ سامان نظر آتا ہے جو گودام میں ختم ہونے کے قریب ہے تاکہ آپ وقت پر نیا آرڈر دے سکیں۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Review Quick Actions',
        titleUr: 'فوری بٹن استعمال کریں',
        descriptionEn: 'Use the quick action buttons to instantly create a new sale, log a purchase, or add a customer without searching menus.',
        descriptionUr: 'نیا بل کاٹنے، خریداری ڈالنے یا کسٹمر بنانے کے لیے فوری بٹن استعمال کریں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Start every morning by reviewing the "Receivables" number so you know which customers to call for recovery.',
      'Always keep an eye on "Low Stock" before placing your weekly factory orders.',
    ],
    shopkeeperTipsUr: [
      'صبح دکان کھول کر سب سے پہلے \'کسٹمر بقایا جات\' دیکھیں تاکہ عملہ ریکوری کے لیے کالز کر سکے۔',
      'فیکٹری کو آرڈر دینے سے پہلے ڈیش بورڈ پر ختم ہونے والے آئٹمز کی فہرست ضرور دیکھیں۔',
    ],
  },
  {
    id: 'sales',
    routePatterns: ['/sales'],
    titleEn: 'Sales Invoices & Billing',
    titleUr: 'سیلز انوائسز اور بلنگ ریکارڈ',
    subtitleEn: 'Manage all customer bills, print receipts, and track credit vs cash status',
    subtitleUr: 'تمام کسٹمر بلز کا انتظام، رسیدیں پرنٹ کرنا اور نقد بمقابلہ ادھار کی حیثیت جاننا',
    iconName: 'ShoppingCart',
    category: 'transactions',
    overviewEn: 'The Sales Invoices panel lists every customer invoice ever created. You can search by invoice number, customer name, filter by date, reprint wholesale bills, or cancel invoices created in error.',
    overviewUr: 'سیلز انوائسز پینل میں دکان کے تمام کٹے ہوئے بل موجود ہوتے ہیں۔ آپ بل نمبر یا گاہک کے نام سے تلاش کر سکتے ہیں، پرانا بل دوبارہ پرنٹ کر سکتے ہیں، یا غلطی سے بنا بل کینسل کر سکتے ہیں۔',
    behindTheScenesEn: [
      'Every invoice automatically deducts sold quantities from warehouse stock.',
      'Paid amounts update the daily cash register; unpaid amounts update the customer\'s Khata balance.',
      'Cancelled invoices safely return the items back to inventory without data corruption.',
    ],
    behindTheScenesUr: [
      'بل بنتے ہی گودام سے متعلقہ سامان کی تعداد خود بخود کم ہو جاتی ہے۔',
      'وصول شدہ رقم کیش میں اور بقایا رقم گاہک کے ادھار کھاتے میں درج ہو جاتی ہے۔',
      'اگر کوئی بل منسوخ (Cancel) کریں تو مال واپس اسٹاک میں جمع ہو جاتا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Click "+ New Sale Invoice"',
        titleUr: 'نیا سیل بل بٹن دبائیں',
        descriptionEn: 'Click the prominent "+ New Sale Invoice" button in the top right to open the billing counter screen.',
        descriptionUr: 'اوپر دائیں جانب "+ New Sale Invoice" بٹن دبائیں تاکہ بلنگ کی اسکرین کھل جائے۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Search & Filter Past Invoices',
        titleUr: 'پرانے بل تلاش کریں',
        descriptionEn: 'Type an invoice number (e.g., INV-0042) or a customer\'s phone number into the search bar to instantly pull up history.',
        descriptionUr: 'سرچ بار میں بل نمبر یا کسٹمر کا نام لکھیں، پچھلا پورا بل سامنے آ جائے گا۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Print Receipt or A4 Invoice',
        titleUr: 'بل کا پرنٹ نکالیں',
        descriptionEn: 'Click the printer icon next to any invoice to generate a clean wholesale receipt or thermal POS slip.',
        descriptionUr: 'کسی بھی بل کے سامنے پرنٹر کے نشان پر کلک کریں اور کسٹمر کو فوری پرنٹ رسید دیں۔',
      },
      {
        stepNumber: 4,
        titleEn: 'Edit Notes or Cancel Invoice',
        titleUr: 'نوٹس تبدیل کریں یا بل کینسل کریں',
        descriptionEn: 'If a customer changed their mind before delivery, click Cancel to safely reverse the stock and ledger balance.',
        descriptionUr: 'اگر غلطی سے غلط بل بن گیا ہو تو ایڈمن اسے کینسل کر سکتا ہے، جس سے مال دوبارہ گودام میں آ جاتا ہے۔',
      },
    ],
    shopkeeperTipsEn: [
      'Always give an invoice number to your customer for warranty or return claims.',
      'Credit status displays in red (Unpaid), yellow (Partial), and green (Paid) for instant clarity.',
    ],
    shopkeeperTipsUr: [
      'وارنٹی یا مال واپسی کے لیے گاہک کو بل کی رسید یا بل نمبر ضرور دیں۔',
      'اسکرین پر سرخ رنگ کا مطلب پورا ادھار، پیلا رنگ مطلب کچھ پیسے آئے اور سبز کا مطلب پورا نقد بل ہے۔',
    ],
  },
  {
    id: 'new-sale',
    routePatterns: ['/sales/new'],
    titleEn: 'Creating a New Sale Invoice',
    titleUr: 'نیا سیل بل بنانے کا طریقہ',
    subtitleEn: 'Fast counter billing with barcode scan, custom discounts, and credit khata',
    subtitleUr: 'تیز رفتار بلنگ: بارکوڈ اسکین، ریٹ میں رعایت، اور ادھار یا نقد کی سہولت',
    iconName: 'PlusCircle',
    category: 'transactions',
    overviewEn: 'The New Sale screen is designed for high-speed hardware counter billing. You can choose a customer, scan or type item names, adjust unit prices or discounts, enter cash paid, and save in seconds.',
    overviewUr: 'یہ اسکرین تیز رفتار بلنگ کے لیے بنائی گئی ہے۔ کسٹمر کا انتخاب کریں، سامان کا نام یا بارکوڈ لکھیں، رعایت (ڈسکاؤنٹ) دیں، اور وصول شدہ کیش لکھ کر محفوظ کریں۔',
    behindTheScenesEn: [
      'Real-time inventory validation prevents selling items that are completely out of stock.',
      'Checks customer credit limit and warns if the customer has huge unpaid debt.',
      'Calculates subtotal, discounts, freight/kiraya, and net balance automatically.',
    ],
    behindTheScenesUr: [
      'سسٹم چیک کرتا ہے کہ گودام میں مال موجود ہے یا نہیں۔ ختم مال کا بل نہیں بنے گا۔',
      'اگر گاہک کا پرانا ادھار بہت زیادہ ہو تو سسٹم احتیاطی وارننگ دکھاتا ہے۔',
      'ٹوٹل بل، رعایت، اور بقایا رقم کا حساب بغیر کیلکولیٹر خود بخود ہوتا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Select Customer',
        titleUr: 'گاہک منتخب کریں',
        descriptionEn: 'Pick "Walk-in Customer" for one-time cash customers, or select a registered account to log to their Khata.',
        descriptionUr: 'نقد گاہک کے لیے "Walk-in Customer" رکھیں، یا پرانے کھاتے دار کا نام لسٹ سے منتخب کریں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Add Products to Invoice',
        titleUr: 'سامان شامل کریں',
        descriptionEn: 'Search by item name or SKU (e.g. "PVC Pipe 3 inch"). Set quantity and unit price. Available stock is shown live.',
        descriptionUr: 'سامان کا نام یا کوڈ لکھ کر منتخب کریں۔ تعداد اور ریٹ ڈالیں۔ گودام میں موجود اسٹاک ساتھ ہی نظر آتا ہے۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Apply Discount or Delivery Charges',
        titleUr: 'رعایت یا کرایہ درج کریں',
        descriptionEn: 'Enter wholesale discounts or add carriage/transport charges if applicable.',
        descriptionUr: 'اگر گاہک کو رعایت (ڈسکاؤنٹ) دینی ہو یا مال کا کرایہ جوڑنا ہو تو نیچے درج کریں۔',
      },
      {
        stepNumber: 4,
        titleEn: 'Enter Amount Paid & Finalize',
        titleUr: 'وصول شدہ رقم لکھیں اور محفوظ کریں',
        descriptionEn: 'If customer paid full, enter amount in "Paid". If partial or zero, the rest automatically becomes Credit (Udhaar). Click "Save & Print".',
        descriptionUr: 'اگر گاہک نے نقد پیسے دیے تو رقم لکھیں۔ اگر ادھار ہے تو باقی رقم خود بخود اس کے کھاتے میں چلی جائے گی۔ پھر Save دبائیں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Use keyboard shortcut Tab and Enter to quickly move between quantity and price inputs.',
      'Double-check that the customer\'s registered mobile number is updated for SMS/WhatsApp billing.',
    ],
    shopkeeperTipsUr: [
      'کی بورڈ کا Tab بٹن دبا کر تیزی سے ایک خانے سے دوسرے خانے میں جائیں۔',
      'کھاتے دار کسٹمر کے نام کے ساتھ اس کا فون نمبر ضرور ملا لیں تاکہ غلط کھاتے میں بل نہ جائے۔',
    ],
  },
  {
    id: 'purchases',
    routePatterns: ['/purchases'],
    titleEn: 'Purchases & Inward Goods',
    titleUr: 'خریداری بل اور فیکٹری سپلائی',
    subtitleEn: 'Track factory purchase orders, supplier bills, and warehouse stock additions',
    subtitleUr: 'فیکٹری اور سپلائر سے خریدے گئے مال کے بل اور گودام میں مال کی آمد کا ریکارڈ',
    iconName: 'ShoppingBag',
    category: 'transactions',
    overviewEn: 'The Purchases panel keeps a record of all inventory purchases made from mills, wholesalers, and importers. Each purchase bill feeds stock directly into your warehouse.',
    overviewUr: 'خریداری مینو میں وہ تمام بل درج ہوتے ہیں جو آپ نے فیکٹریوں یا بڑے ڈیلرز سے مال خریدتے وقت حاصل کیے۔ ہر خریداری سے دکان کا اسٹاک بڑھتا ہے۔',
    behindTheScenesEn: [
      'Automatically updates product average cost prices and on-hand inventory levels.',
      'Increases supplier payable balance in the Supplier Khata.',
    ],
    behindTheScenesUr: [
      'سامان کی قیمتِ خرید اپ ڈیٹ ہوتی ہے اور گودام میں مال کا اضافہ ہوتا ہے۔',
      'سپلائر کے کھاتے میں واجب الادا رقم جمع ہو جاتی ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Click "+ New Purchase"',
        titleUr: 'نیا خریداری بل بنائیں',
        descriptionEn: 'When goods arrive on a truck/bilty, open New Purchase to record the incoming stock.',
        descriptionUr: 'جب فیکٹری سے بلٹی یا مال کی گاڑی آئے تو نیا خریداری بل کھولیں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Match Factory Bill & Bilty',
        titleUr: 'فیکٹری کا انوائس نمبر ملائیں',
        descriptionEn: 'Input the supplier\'s original invoice/bill number so you can cross-check during accounts audit.',
        descriptionUr: 'سپلائر کا اصل بل نمبر اور بلٹی نمبر درج کریں تاکہ بعد میں حساب ملانے میں آسانی رہے۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Record Received Items & Quantities',
        titleUr: 'موصول شدہ سامان اور لاگت درج کریں',
        descriptionEn: 'Specify exactly how many bundles, boxes, or kilograms arrived, and the unit cost price.',
        descriptionUr: 'سامان کے بنڈل، بوری یا نٹ بولٹ کے ڈبے درج کریں اور سپلائر کا ریٹ لکھیں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Always enter purchase bills on the exact day the shipment is unloaded to ensure accurate stock counts for counter sales.',
    ],
    shopkeeperTipsUr: [
      'مال دکان یا گودام میں اترتے ہی اسی دن خریداری کا بل درج کریں ورنہ کاؤنٹر پر اسٹاک کی کمی کا مسئلہ ہو گا۔',
    ],
  },
  {
    id: 'inventory',
    routePatterns: ['/inventory'],
    titleEn: 'Stock Inventory & Warehouse',
    titleUr: 'گودام کا اسٹاک اور مال کی انوینٹری',
    subtitleEn: 'Track current quantity in stock, total inventory valuation, and minimum alerts',
    subtitleUr: 'دکان اور گودام میں موجود مال کی کل تعداد، مالی قیمت، اور کم اسٹاک کے الرٹس',
    iconName: 'Boxes',
    category: 'catalog',
    overviewEn: 'The Stock Inventory panel shows the live, real-time quantity of every single item in your store or warehouse. It shows current stock value, items in alert zone, and allows manual adjustments for physical counts.',
    overviewUr: 'اس پینل میں آپ کے گودام میں موجود ہر چیز کی اصل تعداد نظر آتی ہے۔ آپ دیکھ سکتے ہیں کہ گودام میں کل کتنے روپے کا مال پڑا ہے اور کون سا سامان ختم ہو رہا ہے۔',
    behindTheScenesEn: [
      'Calculates Total Inventory Asset Value = Quantity × Average Cost Price.',
      'Flags items where Quantity <= Reorder Point with prominent warning badges.',
      'Tracks every stock movement with audit logs to prevent employee pilferage.',
    ],
    behindTheScenesUr: [
      'دکان میں موجود کل مال کی مالیت کا حساب خود بخود لگاتا ہے۔',
      'جو سامان کم ہوتا ہے اس پر پیلا یا سرخ الرٹ لگا دیتا ہے۔',
      'اسٹاک چوری یا گمشدگی روکنے کے لیے ہر اندراج کا ریکارڈ رکھتا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Search by SKU or Category',
        titleUr: 'کیٹیگری یا نام سے تلاش کریں',
        descriptionEn: 'Filter by Pipes, Sanitary, Fasteners, Tools, or Paints to see current availability.',
        descriptionUr: 'پائپ، سینیٹری، یا اوزار فلٹر کر کے دیکھیں کہ کون سی چیز کتنی تعداد میں موجود ہے۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Check Stock Alerts',
        titleUr: 'کم اسٹاک والی اشیاء دیکھیں',
        descriptionEn: 'Filter by "Low Stock" to get an immediate list of items that require supplier reordering.',
        descriptionUr: '"Low Stock" کا فلٹر لگائیں تاکہ پتہ چلے کون سا مال فوراً منگوانا ہے۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Conduct Physical Audit',
        titleUr: 'گودام کے مال کی تصدیق کریں',
        descriptionEn: 'Compare physical shelf count against the system number to detect discrepancies.',
        descriptionUr: 'مہینے میں ایک بار گودام کا سامان گن کر کمپیوٹر کی تعداد سے ملائیں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Set accurate reorder levels for fast-selling items (like 1/2" Teflon tapes or 4" PVC bends) so you never run out during rush hours.',
    ],
    shopkeeperTipsUr: [
      'روزانہ زیادہ بکنے والے سامان کی کم از کم حد (Reorder Limit) مقرر کریں تاکہ کسٹمر دکان سے خالی ہاتھ واپس نہ جائے۔',
    ],
  },
  {
    id: 'products',
    routePatterns: ['/products'],
    titleEn: 'Products & SKU Catalog',
    titleUr: 'سامان کی لسٹ اور ریٹ لسٹ',
    subtitleEn: 'Add new items, set wholesale/retail prices, barcodes, and packaging units',
    subtitleUr: 'نیا سامان درج کرنا، ہول سیل ریٹ، بارکوڈ اور پیکنگ یونٹس سیٹ کرنا',
    iconName: 'Package',
    category: 'catalog',
    overviewEn: 'The Products panel is where you define every hardware product you sell. You can add barcodes, specify wholesale carton/box sizes, assign categories, and update selling rates.',
    overviewUr: 'یہاں آپ دکان کے تمام سامان کا اندراج کرتے ہیں۔ نام، برانڈ، سائز، بارکوڈ، قیمتِ خرید اور گاہک کو دینے والا ہول سیل ریٹ یہیں مقرر ہوتا ہے۔',
    behindTheScenesEn: [
      'Acts as the master product catalog for both Sales and Purchases.',
      'Prevents duplicate SKU or barcode creation.',
    ],
    behindTheScenesUr: [
      'سیلز اور خریداری میں یہی نام اور ریٹ خودبخود استعمال ہوتے ہیں۔',
      'ایک ہی بارکوڈ دو مختلف چیزوں کو دینے سے روکتا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Add New Product',
        titleUr: 'نیا سامان شامل کریں',
        descriptionEn: 'Click "+ Add Product". Enter item name (e.g., "G.I. Union 1 inch Heavy"), barcode/SKU, and category.',
        descriptionUr: '"+ Add Product" دبائیں، سامان کا نام، سائز، برانڈ اور کیٹیگری درج کریں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Define Cost and Sale Price',
        titleUr: 'خریداری اور ہول سیل ریٹ لکھیں',
        descriptionEn: 'Enter your purchase cost and the default wholesale selling price.',
        descriptionUr: 'وہ ریٹ لکھیں جس پر آپ خریدتے ہیں اور وہ ریٹ جس پر دکان سے بیچتے ہیں۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Set Unit of Measurement',
        titleUr: 'یونٹ منتخب کریں (پیس، بوری، بنڈل)',
        descriptionEn: 'Choose whether this item is sold in Pieces, Boxes, Meters, Feet, Bundles, or Kilograms.',
        descriptionUr: 'منتخب کریں کہ یہ مال پیس میں بکتا ہے، درجن میں، کلو میں، فٹ میں یا بوری میں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Include the size, gauge, or brand in the product name (e.g., "Crown PPRC Elbow 25mm") to avoid mix-ups at the billing counter.',
    ],
    shopkeeperTipsUr: [
      'سامان کے نام میں سائز اور برانڈ لازمی لکھیں (مثلاً پائپ 1 انچ کلاسک) تاکہ بل بنانے والے ملازم سے غلطی نہ ہو۔',
    ],
  },
  {
    id: 'customers',
    routePatterns: ['/customers'],
    titleEn: 'Customers & Credit Khata',
    titleUr: 'کسٹمرز اور ادھار کھاتہ رجسٹر',
    subtitleEn: 'Track customer balances, credit limits, phone numbers, and ledger statements',
    subtitleUr: 'گاہکوں کا بقایا ادھار، ادھار کی حد، فون نمبرز اور تاریخ وار کھاتہ اسٹیٹمنٹ',
    iconName: 'Users',
    category: 'core',
    overviewEn: 'The Customers panel manages your entire wholesale buyer database and their running khata balances. You can view total market debt, see individual ledger statements, set credit limits, and record recoveries.',
    overviewUr: 'یہ پینل آپ کے تمام گاہکوں اور ان کے ادھار کھاتے کا انتظام کرتا ہے۔ آپ دیکھ سکتے ہیں کہ کس کسٹمر نے کتنے پیسے دینے ہیں اور اس نے پچھلا بل کب ادا کیا تھا۔',
    behindTheScenesEn: [
      'Maintains an unbroken ledger trail of every debit (sale) and credit (payment).',
      'Instantly calculates net balance: Previous Balance + New Sales - Payments - Returns = Current Balance.',
    ],
    behindTheScenesUr: [
      'ہر بل اور ہر وصولی کا تاریخ وار مکمل لیجر محفوظ رکھتا ہے۔',
      'سابقہ بقایا + نیا بل - وصولی = نیا بقایا، خود بخود حساب لگاتا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Register New Customer',
        titleUr: 'نیا کسٹمر شامل کریں',
        descriptionEn: 'Click "+ Add Customer". Enter full name, shop name, phone number, and credit limit.',
        descriptionUr: 'نیا کسٹمر بٹن دبائیں۔ نام، دکان کا نام، موبائل نمبر اور ادھار کی حد درج کریں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'View Detailed Ledger',
        titleUr: 'کھاتہ اور اسٹیٹمنٹ دیکھیں',
        descriptionEn: 'Click on any customer to open their ledger showing all invoices, dates, and cash payments.',
        descriptionUr: 'کسٹمر پر کلک کریں تاکہ اس کا پورا پرانا کھاتہ اور رسیدیں کھل جائیں۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Print Ledger Statement for Customer',
        titleUr: 'گاہک کو کھاتے کی پرچی دیں',
        descriptionEn: 'Print or share the ledger statement directly with the customer when reconciling accounts.',
        descriptionUr: 'حساب ملانے کے لیے گاہک کو تاریخ وار کھاتے کی پرنٹ سلپ نکال کر دیں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Set credit limits for every customer so staff cannot issue more goods once the limit is breached.',
      'Check customer ledger before approving large new credit consignments.',
    ],
    shopkeeperTipsUr: [
      'ہر ادھار گاہک کی حد (Credit Limit) سیٹ کریں تاکہ ملازم حد سے زیادہ ادھار نہ دے سکے۔',
      'نیا بڑا مال دینے سے پہلے پچھلا بقایا لازمی چیک کریں۔',
    ],
  },
  {
    id: 'suppliers',
    routePatterns: ['/suppliers'],
    titleEn: 'Suppliers & Factory Khata',
    titleUr: 'سپلائرز اور فیکٹری کھاتہ',
    subtitleEn: 'Manage manufacturer accounts, pending purchase payables, and factory payments',
    subtitleUr: 'فیکٹریوں، امپورٹرز اور ملوں کے کھاتے، واجب الادا ادھار اور ادائیگیوں کا انتظام',
    iconName: 'Building2',
    category: 'core',
    overviewEn: 'The Suppliers panel keeps track of everyone you buy wholesale hardware from. You can see total unpaid debt owed to factories, inspect purchase invoices, and log cheque/cash payouts.',
    overviewUr: 'اس پینل میں آپ کے تمام سپلائرز (جہاں سے آپ مال خریدتے ہیں) کے کھاتے ہوتے ہیں۔ آپ دیکھ سکتے ہیں کہ کس فیکٹری کو کتنے پیسے دینے باقی ہیں۔',
    behindTheScenesEn: [
      'Credits payable balance whenever a purchase is saved.',
      'Debits payable balance whenever a supplier payment voucher is logged.',
    ],
    behindTheScenesUr: [
      'خریداری بل سے واجب الادا رقم بڑھتی ہے اور ادائیگی سے رقم کم ہو جاتی ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Add Supplier Profile',
        titleUr: 'سپلائر کا اندراج کریں',
        descriptionEn: 'Enter company name, sales rep contact, bank account details, and market address.',
        descriptionUr: 'کمپنی کا نام، سپلائر کا فون نمبر اور بینک اکاؤنٹ درج کریں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Check Balance Payable',
        titleUr: 'واجب الادا بقایا رقم دیکھیں',
        descriptionEn: 'The badge shows your exact outstanding debt to this vendor.',
        descriptionUr: 'دیکھیں کہ فیکٹری کا کتنا ادھار آپ کے ذمے باقی ہے۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Make Payment',
        titleUr: 'ادائیگی درج کریں',
        descriptionEn: 'Click "Pay Supplier" to record cash or cheque payments against their ledger.',
        descriptionUr: 'ادائیگی کا بٹن دبا کر دیے گئے کیش یا چیک کا اندراج کریں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Keep supplier bank account details recorded here for quick online 1Link/Raast transfers.',
    ],
    shopkeeperTipsUr: [
      'سپلائر کا بینک اکاؤنٹ یہاں محفوظ رکھیں تاکہ آن لائن رقم بھیجتے وقت اکاؤنٹ نمبر تلاش نہ کرنا پڑے۔',
    ],
  },
  {
    id: 'customer-payments',
    routePatterns: ['/customer-payments'],
    titleEn: 'Customer Payments & Cash In',
    titleUr: 'کسٹمر سے وصولی (کیش اِن)',
    subtitleEn: 'Record payments received from customers against their outstanding Khata debt',
    subtitleUr: 'گاہکوں سے ادھار کی مد میں وصول ہونے والی رقم (نقد، چیک، بینک) کا اندراج',
    iconName: 'DollarSign',
    category: 'finance',
    overviewEn: 'The Customer Payments panel allows recording cash, cheque, or online bank transfers collected from customers to clear their previous credit balances.',
    overviewUr: 'جب کوئی کسٹمر پرانے ادھار کے پیسے دکان پر لا کر دے، یا بینک میں جمع کروائے، تو اس کا اندراج اس پینل میں کیا جاتا ہے۔',
    behindTheScenesEn: [
      'Deducts payment amount from customer\'s active balance immediately.',
      'Creates a non-erasable receipt voucher for accounting clarity.',
      'Reflects in the daily cash drawer recovery total.',
    ],
    behindTheScenesUr: [
      'کسٹمر کے کھاتے سے فوری طور پر رقم کٹ جاتی ہے۔',
      'پکی رسید کا واؤچر بنتا ہے تاکہ کوئی کسٹمر بعد میں انکار نہ کر سکے۔',
      'دکان کے آج کے نقد گلے میں وصولی کی رقم شامل ہو جاتی ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Select Customer',
        titleUr: 'کسٹمر چنیں',
        descriptionEn: 'Choose the customer who is making the payment. Their current outstanding balance will appear.',
        descriptionUr: 'وہ کسٹمر منتخب کریں جو پیسے دے رہا ہے۔ اس کا کل بقایا سامنے آ جائے گا۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Enter Amount & Payment Method',
        titleUr: 'رقم اور طریقہ منتخب کریں',
        descriptionEn: 'Input amount received. Choose Cash, Bank Transfer, or Cheque.',
        descriptionUr: 'وصول شدہ رقم لکھیں۔ طریقہ منتخب کریں: نقد (Cash) یا آن لائن بینک ٹرانسفر۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Save & Print Receipt',
        titleUr: 'محفوظ کریں اور رسید پرنٹ کریں',
        descriptionEn: 'Save the entry and hand over a printed payment receipt to the customer.',
        descriptionUr: 'اندراج محفوظ کریں اور کسٹمر کو وصولی کی پرنٹ سلپ دیں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Always enter cash recoveries immediately when the customer hands you money to prevent forgotten entries.',
    ],
    shopkeeperTipsUr: [
      'جب بھی گاہک پیسے دے، فوراً کمپیوٹر میں اندراج کریں تاکہ گلے کی رقم اور کمپیوٹر کا حساب برابر رہے۔',
    ],
  },
  {
    id: 'supplier-payments',
    routePatterns: ['/supplier-payments'],
    titleEn: 'Supplier Payments & Cash Out',
    titleUr: 'سپلائر کو ادائیگی (کیش آؤٹ)',
    subtitleEn: 'Record payments made to manufacturers, importers, and transport bilty companies',
    subtitleUr: 'فیکٹریوں، امپورٹرز اور ٹرانسپورٹ بلٹی کمپنیوں کو دی گئی رقم کا اندراج',
    iconName: 'BookOpen',
    category: 'finance',
    overviewEn: 'The Supplier Payments panel records every rupee paid out to your inventory vendors, clearing pending purchase bills and updating vendor ledgers.',
    overviewUr: 'یہاں آپ فیکٹریوں یا مال سپلائی کرنے والوں کو دی جانے والی رقوم کا اندراج کرتے ہیں تاکہ سپلائر کے کھاتے سے ادائیگی کم ہو جائے۔',
    behindTheScenesEn: [
      'Lowers your total market debt/accounts payable.',
      'Maintains voucher numbers and cheque clearance notes.',
    ],
    behindTheScenesUr: [
      'آپ کے ذمے فیکٹری کا قرضہ کم ہو جاتا ہے۔',
      'چیک نمبر یا بینک ٹرانزیکشن آئی ڈی محفوظ ہو جاتی ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Select Supplier',
        titleUr: 'سپلائر منتخب کریں',
        descriptionEn: 'Pick the factory/distributor you paid.',
        descriptionUr: 'جس کمپنی یا سپلائر کو پیسے دیے ہیں اسے منتخب کریں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Enter Amount & Cheque Reference',
        titleUr: 'رقم اور چیک نمبر لکھیں',
        descriptionEn: 'Enter the amount paid and include the cheque number or bank reference if paid digitally.',
        descriptionUr: 'دی گئی رقم اور چیک نمبر یا آن لائن ٹرانزیکشن حوالہ لکھیں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Write down cheque numbers so you can cross-check with your bank statement at the end of the month.',
    ],
    shopkeeperTipsUr: [
      'چیک کی صورت میں چیک نمبر لازمی لکھیں تاکہ مہینے کے آخر پر بینک اسٹیٹمنٹ ملانے میں آسانی ہو۔',
    ],
  },
  {
    id: 'returns',
    routePatterns: ['/sales-returns', '/purchase-returns'],
    titleEn: 'Sales & Purchase Returns',
    titleUr: 'مال کی واپسی (سیل اور پرچیز ریٹرن)',
    subtitleEn: 'Handle goods returned by customers or defective items returned to suppliers',
    subtitleUr: 'گاہک سے واپس آنے والا مال یا فیکٹری کو خراب مال واپس بھیجنے کا طریقہ',
    iconName: 'ArrowDownLeft',
    category: 'transactions',
    overviewEn: 'Hardware wholesale frequently involves returns (excess fittings, wrong gauge pipes, defective tools). This panel manages both Customer Sales Returns and Supplier Purchase Returns cleanly.',
    overviewUr: 'ہارڈ ویئر کے کام میں مال کی واپسی عام بات ہے (مثلاً بچی ہوئی فٹنگز، غلط سائز، یا ناقص اوزار)۔ یہ پینل کسٹمر اور سپلائر دونوں کی واپسی کو سنبھالتا ہے۔',
    behindTheScenesEn: [
      'Sales Return: Stock increases back into warehouse; customer\'s Khata debt decreases (or cash is refunded).',
      'Purchase Return: Stock decreases from warehouse; supplier\'s payable debt decreases.',
    ],
    behindTheScenesUr: [
      'سیل واپسی: گودام میں مال دوبارہ جمع ہو جاتا ہے اور گاہک کے ذمے ادھار کم ہو جاتا ہے۔',
      'خرید واپسی: گودام سے خراب مال نکل جاتا ہے اور سپلائر کو دینے والی رقم کم ہو جاتی ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Choose Sales Return vs Purchase Return',
        titleUr: 'سیل واپسی یا خرید واپسی چنیں',
        descriptionEn: 'Open Sales Returns if a customer is bringing back goods. Open Purchase Returns if sending defective goods to factory.',
        descriptionUr: 'اگر گاہک سامان واپس لایا ہے تو Sales Returns میں جائیں۔ اگر فیکٹری کو بھیجنا ہے تو Purchase Returns میں جائیں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Select Party & Original Invoice',
        titleUr: 'پارٹی اور اصل بل منتخب کریں',
        descriptionEn: 'Select the customer/supplier and reference the original bill.',
        descriptionUr: 'کسٹمر یا سپلائر چنیں اور پچھلا بل نمبر منتخب کریں۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Specify Returned Quantities',
        titleUr: 'واپس شدہ سامان اور تعداد لکھیں',
        descriptionEn: 'Enter how many pieces or boxes are returned and verify condition.',
        descriptionUr: 'کتنے پیس یا بنڈل واپس آئے ہیں ان کی تعداد اور ریٹ لکھ کر محفوظ کریں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Never do manual mental math for returns; always log the return voucher so your inventory stays 100% accurate.',
    ],
    shopkeeperTipsUr: [
      'واپسی کا اندراج زبانی نہ کریں بلکہ کمپیوٹر میں واپسی بل بنائیں تاکہ اسٹاک اور کھاتہ دونوں درست رہیں۔',
    ],
  },
  {
    id: 'expenses',
    routePatterns: ['/expenses'],
    titleEn: 'Shop Expenses & Overheads',
    titleUr: 'دکان کے روزمرہ اخراجات',
    subtitleEn: 'Track electricity, rent, labor carriage, tea, and daily shop operating costs',
    subtitleUr: 'بجلی بل، دکان کا کرایہ، مزدوری، کرایہ مال، چائے پانی اور ملازمین کے خرچوں کا اندراج',
    iconName: 'Receipt',
    category: 'finance',
    overviewEn: 'The Expenses panel records all operating costs of Ejaz and sons hardware store. By capturing expenses accurately, the system can compute your true net business profit.',
    overviewUr: 'یہاں آپ دکان چلانے کے تمام چھوٹے بڑے اخراجات درج کرتے ہیں۔ اس سے آپ کو معلوم ہوتا ہے کہ دکان کا اصل خرچہ کتنا ہے اور اصل بچت کتنی بچی ہے۔',
    behindTheScenesEn: [
      'Deducts from net earnings in the Profit & Loss report.',
      'Categories help identify where money is being spent (e.g., Freight vs Utilities).',
    ],
    behindTheScenesUr: [
      'نفع و نقصان کی رپورٹ میں یہ رقم سیلز کے منافع سے منہا ہو جاتی ہے۔',
      'خرچوں کی کیٹیگریز سے پتہ چلتا ہے کہ سب سے زیادہ پیسہ کہاں خرچ ہو رہا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Click "+ Add Expense"',
        titleUr: 'نیا خرچہ درج کریں',
        descriptionEn: 'Click to record a new payment.',
        descriptionUr: 'نیا خرچہ بٹن دبائیں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Select Category & Enter Amount',
        titleUr: 'کیٹیگری اور رقم منتخب کریں',
        descriptionEn: 'Pick category (Rent, Electricity, Labor/Carriage, Staff Tea, Repairs) and input the cost.',
        descriptionUr: 'کیٹیگری چنیں (کرایہ، بجلی، مزدوری، چائے وغیرہ) اور خرچ ہوئی رقم لکھیں۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Add Description Note',
        titleUr: 'تفصیل لکھیں',
        descriptionEn: 'Mention who was paid (e.g., "Mazdori for unloading 200 bags cement").',
        descriptionUr: 'مختصر تفصیل لکھیں تاکہ مہینے کے آخر پر یاد رہے کہ پیسہ کس کو دیا گیا۔',
      },
    ],
    shopkeeperTipsEn: [
      'Log even small expenses like tea and loading tips daily; these small costs add up significantly over the month.',
    ],
    shopkeeperTipsUr: [
      'چھوٹے خرچے جیسے چائے پانی اور گاڑی کا کرایہ روزانہ لکھیں تاکہ مہینے کے آخر پر گلے کے کیش میں فرق نہ آئے۔',
    ],
  },
  {
    id: 'reports',
    routePatterns: ['/reports'],
    titleEn: 'Reports & Business Analytics',
    titleUr: 'رپورٹس اور کاروباری تجزیہ',
    subtitleEn: 'Generate daily sales summaries, profit reports, stock valuation, and receivables',
    subtitleUr: 'روزانہ کی سیلز، منافع و نقصان، گودام کے مال کی قیمت، اور ادھار ریکوری رپورٹس',
    iconName: 'BarChart3',
    category: 'admin',
    overviewEn: 'The Reports panel transforms your daily numbers into actionable business insights. You can generate daily closing sheets, sales statements, product profitability, customer balances, and export data.',
    overviewUr: 'رپورٹس پینل آپ کو دکان کی اصل تصویر دکھاتا ہے۔ آپ دیکھ سکتے ہیں کہ آج کتنی کمائی ہوئی، گودام میں کتنا مال ہے، اور مارکیٹ سے کتنا ادھار وصول کرنا ہے۔',
    behindTheScenesEn: [
      'Analyzes sales margins against original purchase cost for every line item.',
      'Computes aging analysis for customer credit balances.',
    ],
    behindTheScenesUr: [
      'ہر سامان کی قیمتِ خرید اور فروخت کو ملا کر اصل نفع نکالتا ہے۔',
      'بتاتا ہے کہ کس کسٹمر کا ادھار کتنا پرانا ہو چکا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Choose Report Type',
        titleUr: 'رپورٹ کی قسم منتخب کریں',
        descriptionEn: 'Select Daily Sales, Inventory Valuation, Customer Receivables, or Profit & Loss.',
        descriptionUr: 'روزانہ سیل، کل اسٹاک مالیت، یا گاہکوں کے ادھار کی رپورٹ منتخب کریں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Set Date Range',
        titleUr: 'تاریخ کا انتخاب کریں',
        descriptionEn: 'Filter by Today, This Week, This Month, or Custom Date range.',
        descriptionUr: 'آج کی تاریخ، اس ہفتے، یا پورے مہینے کی تاریخ چنیں۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Print or Export',
        titleUr: 'پرنٹ نکالیں یا محفوظ کریں',
        descriptionEn: 'Click Print to print clean hardcopy reports for shop partner meetings.',
        descriptionUr: 'پرنٹ کا بٹن دبا کر شراکت داروں (Partners) کے لیے کاغذی پرنٹ نکالیں۔',
      },
    ],
    shopkeeperTipsEn: [
      'Review the Daily Closing report every evening before closing the shop shutters.',
    ],
    shopkeeperTipsUr: [
      'روزانہ رات کو دکان بند کرنے سے پہلے Daily Closing رپورٹ ضرور دیکھیں تاکہ کیش دراز اور بل برابر ہوں۔',
    ],
  },
  {
    id: 'users',
    routePatterns: ['/users'],
    titleEn: 'User Staff Management',
    titleUr: 'عملہ اور ملازمین کے اکاؤنٹس',
    subtitleEn: 'Control access permissions for salesmen, cashiers, and shop managers',
    subtitleUr: 'سیلز مین، کیشیئر اور منیجر کے الگ الگ اختیارات اور پاس ورڈز کا انتظام',
    iconName: 'UserCheck',
    category: 'admin',
    overviewEn: 'The Users panel allows the business owner to add staff accounts with strict role-based security. Salesmen can make bills but cannot delete sales or view confidential profit reports.',
    overviewUr: 'یہاں دکان کا مالک اپنے ملازمین کے الگ لاگ اِن بناتا ہے۔ سیلز مین صرف بل بنا سکتا ہے لیکن وہ پرانا بل ڈیلیٹ نہیں کر سکتا اور نہ منافع دیکھ سکتا ہے۔',
    behindTheScenesEn: [
      'Enforces enterprise role-based permissions (Admin, Manager, Cashier, Sales).',
    ],
    behindTheScenesUr: [
      'ملازمین کے اختیارات پر سخت کنٹرول رکھتا ہے تاکہ کوئی ملازم ڈیٹا میں ردوبدل نہ کر سکے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Create Staff Account',
        titleUr: 'ملازم کا اکاؤنٹ بنائیں',
        descriptionEn: 'Enter staff member name, email/username, and password.',
        descriptionUr: 'ملازم کا نام، یوزر نیم اور پاس ورڈ درج کریں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Assign Safe Role',
        titleUr: 'محفوظ عہدہ (Role) منتخب کریں',
        descriptionEn: 'Assign "Cashier" or "Sales Staff" so they only have access to billing.',
        descriptionUr: 'سیلز سٹاف یا کیشیئر چنیں تاکہ وہ صرف بل کاٹ سکے، خفیہ ڈیٹا نہ دیکھ سکے۔',
      },
    ],
    shopkeeperTipsEn: [
      'Never share your Owner/Admin password with counter staff.',
    ],
    shopkeeperTipsUr: [
      'ایڈمن (مالک) کا پاس ورڈ کبھی کاؤنٹر کے ملازمین کو نہ دیں، ان کے لیے الگ سیلز اکاؤنٹ بنائیں۔',
    ],
  },
  {
    id: 'settings',
    routePatterns: ['/settings'],
    titleEn: 'Store Profile & Settings',
    titleUr: 'دکان کی سیٹنگز اور معلومات',
    subtitleEn: 'Configure shop name, address, phone numbers on receipts, and tax details',
    subtitleUr: 'بل پر چھپنے والا دکان کا نام، مارکیٹ کا پتہ، موبائل نمبر اور پرنٹنگ سیٹنگز',
    iconName: 'Settings',
    category: 'admin',
    overviewEn: 'The Settings panel defines your store\'s identity. The shop name, phone numbers, and terms written here appear at the top and bottom of every printed invoice.',
    overviewUr: 'یہاں آپ اپنی دکان کا نام، پتہ اور فون نمبر درج کرتے ہیں۔ یہی تفصیلات ہر پرنٹ ہونے والے بل کے اوپر اور نیچے خوبصورتی سے چھپتی ہیں۔',
    behindTheScenesEn: [
      'Customizes header and footer of printable invoices and system defaults.',
    ],
    behindTheScenesUr: [
      'بل کی رسید پر آپ کی دکان کا نام اور موبائل نمبر خود بخود لگا دیتا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Enter Shop Details',
        titleUr: 'دکان کی تفصیلات درج کریں',
        descriptionEn: 'Input store name, address, wholesale market name, and phone/WhatsApp numbers.',
        descriptionUr: 'دکان کا نام، مارکیٹ کا پتہ اور واٹس ایپ نمبر درج کریں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Set Invoice Terms',
        titleUr: 'بل کے شرائط و ضوابط لکھیں',
        descriptionEn: 'Add standard notes (e.g. "Sold goods will not be returned without bill after 7 days").',
        descriptionUr: 'بل کی شرائط لکھیں (مثلاً "بغیر بل کے مال واپس نہیں ہوگا" یا "وارنٹی کا سامان کلیم پر جائے گا")۔',
      },
    ],
    shopkeeperTipsEn: [
      'Keep your WhatsApp number updated so customers can easily contact you for reorders.',
    ],
    shopkeeperTipsUr: [
      'اپنا واٹس ایپ نمبر درست رکھیں تاکہ گاہک بل دیکھ کر باآسانی نیا آرڈر بھیج سکے۔',
    ],
  },
  {
    id: 'khata-import',
    routePatterns: ['/khata-import'],
    titleEn: 'Scan & Import Old Khata',
    titleUr: 'پرانا کھاتہ اسکین اور اندراج',
    subtitleEn: 'Digitize paper registers, extract entries with AI Vision, and update party balances safely',
    subtitleUr: 'کاپی رجسٹر کے صفحات اسکین کریں، کمپیوٹرائزڈ کھاتے میں منتقل کریں اور بقایا جات درست کریں',
    iconName: 'BookOpen',
    category: 'finance',
    overviewEn: 'The Khata Import feature allows you to digitize existing handwritten or printed paper registers (khatas). Using Gemini AI Vision OCR, the system reads customer or supplier entries, reconciles running balances, matches known parties, and safely updates ledger accounts without altering physical warehouse inventory or cash drawers.',
    overviewUr: 'پرانا کھاتہ اسکین فیچر آپ کے پرانے کاپی رجسٹرز کو بغیر وقت ضائع کیے کمپیوٹر میں منتقل کرتا ہے۔ اے آئی وژن کی مدد سے یہ تاریخ، تفصیل، بنام (ادھار) اور جمع (وصولی) پڑھ کر گاہک یا سپلائر کے کھاتے میں بالکل درست درج کرتا ہے، جس سے نہ تو گودام کے اسٹاک پر اثر پڑتا ہے اور نہ ہی دکان کے کیش دراز پر۔',
    behindTheScenesEn: [
      'Calls Supabase Edge Function with Gemini Vision to extract table entries, dates, amounts, and written balances.',
      'Executes post_khata_import() atomic stored procedure to post verified ledger entries with source_type = "khata_import".',
      'Leaves warehouse stock_levels, stock_movements, and daily cash transactions completely untouched.',
      'Generates an immutable import batch with KH-XXXX sequence and supports 1-click safe audit reversal.',
    ],
    behindTheScenesUr: [
      'کھاتے کی تصویر سے تمام اندراجات اور بقایا رقوم کو خودکار طریقے سے پڑھتا ہے۔',
      'پوسٹ کرنے پر کسٹمر یا سپلائر کے لیجر میں محفوظ انٹری کر دیتا ہے۔',
      'گودام کے اسٹاک اور کیش دراز کے حساب کتاب کو بالکل محفوظ رکھتا ہے۔',
      'ہر امپورٹ کو ایک منفرد نمبر (جیسے KH-0001) دیتا ہے جس کو بوقت ضرورت فوری واپس بھی کیا جا سکتا ہے۔',
    ],
    steps: [
      {
        stepNumber: 1,
        titleEn: 'Choose Customer or Supplier Khata',
        titleUr: 'کھاتہ کی قسم منتخب کریں',
        descriptionEn: 'Select Lena (Customer receivables) or Dena (Supplier payables).',
        descriptionUr: 'گاہک سے لینا ہے یا سپلائر کو دینا ہے، مطلوبہ کارڈ منتخب کریں۔',
      },
      {
        stepNumber: 2,
        titleEn: 'Capture or Upload Register Page',
        titleUr: 'کھاتے کے صفحے کی تصویر لیں',
        descriptionEn: 'Take a clear, well-lit photo of the ledger page with your phone/camera, or select an image file.',
        descriptionUr: 'اپنے موبائل یا کیمرے سے کھاتے کے صفحے کی صاف تصویر لیں یا کمپیوٹر سے منتخب کریں۔',
      },
      {
        stepNumber: 3,
        titleEn: 'Verify Party Matching',
        titleUr: 'کھاتے دار کے نام کی تصدیق کریں',
        descriptionEn: 'Confirm whether the scanned name matches an existing account in your system or if you want to create a new customer/supplier.',
        descriptionUr: 'دیکھیں کہ کیا یہ گاہک پہلے سے موجود ہے یا نیا کھاتہ کھولنا چاہتے ہیں۔',
      },
      {
        stepNumber: 4,
        titleEn: 'Review & Edit Detected Rows',
        titleUr: 'اندراجات اور رقوم کی جانچ کریں',
        descriptionEn: 'Review extracted dates, descriptions, charges, and payments. Check any balance mismatch warning against your physical book and make edits.',
        descriptionUr: 'تاریخ، مال ادھار اور وصولی کی رقوم کاپی سے ملا لیں اور ضرورت پڑنے پر درست کریں۔',
      },
      {
        stepNumber: 5,
        titleEn: 'Confirm & Post to Ledger',
        titleUr: 'کھاتہ محفوظ اور پوسٹ کریں',
        descriptionEn: 'Confirm the batch. The system immediately posts the ledger lines and updates running balances in real time.',
        descriptionUr: 'منظوری دیں؛ تمام گاہکوں اور سپلائرز کے کھاتے اور اسٹیٹمنٹس فوری اپڈیٹ ہو جائیں گی۔',
      },
    ],
    shopkeeperTipsEn: [
      'Take photos straight from above with good lighting and no shadows covering the amounts.',
      'If a customer account spans multiple pages, the brought-forward balance on later pages is automatically skipped so you do not double-count it.',
      'You can also use "Manual Entry Mode" if a register page is torn or illegible.',
    ],
    shopkeeperTipsUr: [
      'کھاتے کے صفحے کی تصویر بالکل اوپر سے سیدھی اور اچھی روشنی میں کھینچیں۔',
      'اگر ایک ہی گاہک کا کھاتہ کئی صفحات پر پھیلا ہوا ہے تو نظام پچھلا بقایا بار بار جمع نہیں کرے گا۔',
      'اگر صفحہ کٹا پھٹا ہو تو آپ بغیر تصویر کے دستی اندراج کے ذریعے بھی لکھ سکتے ہیں۔',
    ],
  },
]

export const SHOPKEEPER_FAQS: FAQItem[] = [
  {
    questionEn: 'Will scanning old paper khatas mess up my warehouse stock or shop cash drawer?',
    questionUr: 'کیا پرانا کھاتہ درج کرنے سے گودام کا اسٹاک یا روزانہ کے کیش کا حساب خراب تو نہیں ہو گا؟',
    answerEn: 'No! The old khata scanner exclusively updates customer and supplier financial ledgers and running balances. It NEVER creates fake purchase orders, changes physical stock counts, or alters your daily cash drawer balance.',
    answerUr: 'ہرگز نہیں! پرانا کھاتہ صرف کسٹمر اور سپلائر کے کھاتے اور بقایا جات کو اپڈیٹ کرتا ہے۔ یہ گودام کے اسٹاک یا روزانہ کے کیش دراز کے حساب کو بالکل نہیں چھوتا۔',
    relatedTopicId: 'khata-import',
  },
  {
    questionEn: 'How does stock decrease automatically when I create a sale invoice?',
    questionUr: 'جب میں سیل کا بل بناتا ہوں تو گودام سے اسٹاک خود بخود کیسے کم ہوتا ہے؟',
    answerEn: 'The moment you click Save on a Sale Invoice, the system instantly matches each item code with the inventory database and deducts the exact sold quantity. You do not need to do any manual stock counting.',
    answerUr: 'جیسے ہی آپ سیل کے بل پر \'Save\' کا بٹن دباتے ہیں، سسٹم کمپیوٹر میں موجود گودام سے اتنی ہی تعداد فوراً مائنس (کم) کر دیتا ہے۔ آپ کو ہاتھ سے اسٹاک گننے یا کاپی میں لکھنے کی بالکل ضرورت نہیں۔',
    relatedTopicId: 'sales',
  },
  {
    questionEn: 'How do I handle a customer who buys on credit (Udhaar)?',
    questionUr: 'اگر کوئی گاہک ادھار پر مال لے تو اس کا اندراج کیسے کریں؟',
    answerEn: 'When creating a New Sale, select the customer\'s registered name instead of "Walk-in Customer". In the "Paid Amount" box, leave it as 0 (or enter whatever partial cash they paid). The entire remaining bill amount will automatically be added to their Khata ledger.',
    answerUr: 'نیا بل بناتے وقت گاہک کے خانے میں "Walk-in" کے بجائے اس گاہک کا نام منتخب کریں۔ "Paid Amount" کے خانے میں 0 لکھیں (یا جتنے نقد پیسے دیے ہوں وہ لکھیں)۔ باقی تمام رقم خود بخود اس کے کھاتے میں چلی جائے گی۔',
    relatedTopicId: 'new-sale',
  },
  {
    questionEn: 'What happens when a customer later comes back to pay their credit (Udhaar)?',
    questionUr: 'جب گاہک کچھ دنوں بعد ادھار کے پیسے لا کر دے تو کہاں لکھیں؟',
    answerEn: 'Go to Customer Payments. Select the customer\'s name, enter the cash amount they handed you, and click Save. The system immediately reduces their Khata balance and issues a payment voucher receipt.',
    answerUr: 'مینو سے Customer Payments میں جائیں۔ گاہک کا نام منتخب کریں، دی گئی نقد رقم لکھیں اور Save کر دیں۔ اس کے کھاتے سے وہ رقم فوراً کٹ جائے گی اور آپ رسید پرنٹ کر کے دے سکتے ہیں۔',
    relatedTopicId: 'customer-payments',
  },
  {
    questionEn: 'Can I print invoices in thermal receipt size or full A4 paper?',
    questionUr: 'کیا بل چھوٹی پرچی (تھرمل پرنٹر) اور بڑے A4 کاغذ دونوں پر پرنٹ ہو سکتا ہے؟',
    answerEn: 'Yes! The built-in Printable Invoice modal supports both standard A4 wholesale invoices (with columns for Packing, Rate, Discount, Total) and compact POS thermal slips.',
    answerUr: 'جی ہاں! سسٹم میں دونوں سہولیات موجود ہیں۔ آپ بڑا ہول سیل ٹیکس انوائس (A4) بھی پرنٹ کر سکتے ہیں اور کاؤنٹر والا چھوٹا پرچی بل (Thermal Slip) بھی نکال سکتے ہیں۔',
    relatedTopicId: 'sales',
  },
  {
    questionEn: 'How do I know how much total money the market owes me right now?',
    questionUr: 'مجھے کیسے پتہ چلے گا کہ اس وقت مارکیٹ کے گاہکوں سے کل کتنے پیسے لینے ہیں؟',
    answerEn: 'Simply open the Dashboard or Customers page. At the very top, you will see a prominent card named "Total Receivables (کل ادھار لینا ہے)". Clicking it displays the breakdown customer by customer.',
    answerUr: 'ڈیش بورڈ یا Customers پینل کھولیں۔ سب سے اوپر "Total Receivables / کل ادھار لینا ہے" کا کارڈ نظر آئے گا۔ اس پر کلک کر کے آپ ہر ایک کسٹمر کا الگ الگ بقایا دیکھ سکتے ہیں۔',
    relatedTopicId: 'customers',
  },
  {
    questionEn: 'What if a customer brings back excess pipe fittings or defective items?',
    questionUr: 'اگر کوئی گاہک بچا ہوا مال یا خراب سامان واپس لے آئے تو کیا کریں؟',
    answerEn: 'Go to Sales Returns. Select the customer, pick the returned items, and save. The goods will automatically go back into your stock, and the customer\'s Khata balance will be credited with that amount.',
    answerUr: 'سیلز ریٹرن (Sales Returns) میں جائیں۔ گاہک کا نام چنیں اور واپس شدہ سامان کی تعداد لکھ کر محفوظ کریں۔ وہ سامان دوبارہ گودام کے اسٹاک میں شامل ہو جائے گا اور گاہک کے بل سے رقم کٹ جائے گی۔',
    relatedTopicId: 'returns',
  },
  {
    questionEn: 'How can I prevent sales staff from seeing my wholesale purchase prices or profit?',
    questionUr: 'میں ملازمین کو خریداری کا ریٹ اور منافع دیکھنے سے کیسے روک سکتا ہوں؟',
    answerEn: 'In User Management (Users), create separate staff accounts with the "Sales Staff" or "Cashier" role. This restricts them to counter sales and invoices while hiding supplier purchase bills, costs, and profit reports.',
    answerUr: 'Users مینو میں جا کر ملازمین کے لیے الگ اکاؤنٹ بنائیں اور انہیں "Sales Staff" کا عہدہ دیں۔ وہ صرف بل بنا سکیں گے، فیکٹری کے بل، مال کی قیمتِ خرید اور دکان کا منافع ان سے چھپا رہے گا۔',
    relatedTopicId: 'users',
  },
]
