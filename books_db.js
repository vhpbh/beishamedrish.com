const BOOKS_DB = [
    // === תלמוד בבלי (יחידות = עמודים = דפים * 2) ===
    { name: "ברכות", category: "תלמוד בבלי", units: 126 }, // 63 דפים
    { name: "שבת", category: "תלמוד בבלי", units: 314 }, // 157 דפים
    { name: "עירובין", category: "תלמוד בבלי", units: 210 }, // 105 דפים
    { name: "פסחים", category: "תלמוד בבלי", units: 242 }, // 121 דפים
    { name: "שקלים", category: "תלמוד בבלי", units: 44 }, // 22 דפים
    { name: "יומא", category: "תלמוד בבלי", units: 176 }, // 88 דפים
    { name: "סוכה", category: "תלמוד בבלי", units: 112 }, // 56 דפים
    { name: "ביצה", category: "תלמוד בבלי", units: 80 }, // 40 דפים
    { name: "ראש השנה", category: "תלמוד בבלי", units: 70 }, // 35 דפים
    { name: "תענית", category: "תלמוד בבלי", units: 62 }, // 31 דפים
    { name: "מגילה", category: "תלמוד בבלי", units: 64 }, // 32 דפים
    { name: "מועד קטן", category: "תלמוד בבלי", units: 58 }, // 29 דפים
    { name: "חגיגה", category: "תלמוד בבלי", units: 54 }, // 27 דפים
    { name: "יבמות", category: "תלמוד בבלי", units: 244 }, // 122 דפים
    { name: "כתובות", category: "תלמוד בבלי", units: 224 }, // 112 דפים
    { name: "נדרים", category: "תלמוד בבלי", units: 182 }, // 91 דפים
    { name: "נזיר", category: "תלמוד בבלי", units: 132 }, // 66 דפים
    { name: "סוטה", category: "תלמוד בבלי", units: 98 }, // 49 דפים
    { name: "גיטין", category: "תלמוד בבלי", units: 180 }, // 90 דפים
    { name: "קידושין", category: "תלמוד בבלי", units: 164 }, // 82 דפים
    { name: "בבא קמא", category: "תלמוד בבלי", units: 238 }, // 119 דפים
    { name: "בבא מציעא", category: "תלמוד בבלי", units: 238 }, // 119 דפים
    { name: "בבא בתרא", category: "תלמוד בבלי", units: 352 }, // 176 דפים
    { name: "סנהדרין", category: "תלמוד בבלי", units: 226 }, // 113 דפים
    { name: "מכות", category: "תלמוד בבלי", units: 48 }, // 24 דפים
    { name: "שבועות", category: "תלמוד בבלי", units: 98 }, // 49 דפים
    { name: "עבודה זרה", category: "תלמוד בבלי", units: 152 }, // 76 דפים
    { name: "הוריות", category: "תלמוד בבלי", units: 28 }, // 14 דפים
    { name: "זבחים", category: "תלמוד בבלי", units: 240 }, // 120 דפים
    { name: "מנחות", category: "תלמוד בבלי", units: 236 }, // 118 דפים
    { name: "חולין", category: "תלמוד בבלי", units: 284 }, // 142 דפים
    { name: "בכורות", category: "תלמוד בבלי", units: 122 }, // 61 דפים
    { name: "ערכין", category: "תלמוד בבלי", units: 68 }, // 34 דפים
    { name: "תמורה", category: "תלמוד בבלי", units: 68 }, // 34 דפים
    { name: "כריתות", category: "תלמוד בבלי", units: 56 }, // 28 דפים
    { name: "מעילה", category: "תלמוד בבלי", units: 44 }, // 22 דפים
    { name: "תמיד", category: "תלמוד בבלי", units: 16 },   // 8 דפים
    { name: "מידות", category: "תלמוד בבלי", units: 74 }, // 37 דפים
    { name: "קינים", category: "תלמוד בבלי", units: 8 }, // 4 דפים
    { name: "נידה", category: "תלמוד בבלי", units: 146 }, // 73 דפים


    // === תלמוד ירושלמי (יחידות = דפים * 2 לעמודים) ===
    { name: "ירושלמי ברכות", category: "תלמוד ירושלמי", units: 136 }, // 68 דפים
    { name: "ירושלמי פאה", category: "תלמוד ירושלמי", units: 74 },   // 37 דפים
    { name: "ירושלמי דמאי", category: "תלמוד ירושלמי", units: 68 },  // 34 דפים
    { name: "ירושלמי כלאיים", category: "תלמוד ירושלמי", units: 88 }, // 44 דפים
    { name: "ירושלמי שביעית", category: "תלמוד ירושלמי", units: 62 }, // 31 דפים
    { name: "ירושלמי תרומות", category: "תלמוד ירושלמי", units: 116 }, // 58 דפים
    { name: "ירושלמי מעשרות", category: "תלמוד ירושלמי", units: 52 }, // 26 דפים
    { name: "ירושלמי מעשר שני", category: "תלמוד ירושלמי", units: 56 }, // 28 דפים
    { name: "ירושלמי חלה", category: "תלמוד ירושלמי", units: 56 },   // 28 דפים
    { name: "ירושלמי ערלה", category: "תלמוד ירושלמי", units: 40 },   // 20 דפים
    { name: "ירושלמי ביכורים", category: "תלמוד ירושלמי", units: 26 }, // 13 דפים
    { name: "ירושלמי שבת", category: "תלמוד ירושלמי", units: 184 },  // 92 דפים
    { name: "ירושלמי עירובין", category: "תלמוד ירושלמי", units: 130 }, // 65 דפים
    { name: "ירושלמי פסחים", category: "תלמוד ירושלמי", units: 142 }, // 71 דפים
    { name: "ירושלמי יומא", category: "תלמוד ירושלמי", units: 84 },   // 42 דפים
    { name: "ירושלמי שקלים", category: "תלמוד ירושלמי", units: 66 },  // 33 דפים
    { name: "ירושלמי סוכה", category: "תלמוד ירושלמי", units: 52 },   // 26 דפים
    { name: "ירושלמי ראש השנה", category: "תלמוד ירושלמי", units: 44 }, // 22 דפים
    { name: "ירושלמי ביצה", category: "תלמוד ירושלמי", units: 44 },   // 22 דפים
    { name: "ירושלמי תענית", category: "תלמוד ירושלמי", units: 52 },  // 26 דפים
    { name: "ירושלמי מגילה", category: "תלמוד ירושלמי", units: 68 },  // 34 דפים
    { name: "ירושלמי חגיגה", category: "תלמוד ירושלמי", units: 44 },  // 22 דפים
    { name: "ירושלמי מועד קטן", category: "תלמוד ירושלמי", units: 38 }, // 19 דפים
    { name: "ירושלמי יבמות", category: "תלמוד ירושלמי", units: 170 }, // 85 דפים
    { name: "ירושלמי כתובות", category: "תלמוד ירושלמי", units: 144 }, // 72 דפים
    { name: "ירושלמי נדרים", category: "תלמוד ירושלמי", units: 80 },   // 40 דפים
    { name: "ירושלמי נזיר", category: "תלמוד ירושלמי", units: 112 },  // 56 דפים
    { name: "ירושלמי סוטה", category: "תלמוד ירושלמי", units: 94 },   // 47 דפים
    { name: "ירושלמי גיטין", category: "תלמוד ירושלמי", units: 108 }, // 54 דפים
    { name: "ירושלמי קידושין", category: "תלמוד ירושלמי", units: 96 },  // 48 דפים
    { name: "ירושלמי בבא קמא", category: "תלמוד ירושלמי", units: 88 }, // 44 דפים
    { name: "ירושלמי בבא מציעא", category: "תלמוד ירושלמי", units: 58 }, // 29 דפים
    { name: "ירושלמי בבא בתרא", category: "תלמוד ירושלמי", units: 40 }, // 20 דפים
    { name: "ירושלמי סנהדרין", category: "תלמוד ירושלמי", units: 136 }, // 68 דפים
    { name: "ירושלמי שבועות", category: "תלמוד ירושלמי", units: 88 },  // 44 דפים
    { name: "ירושלמי עבודה זרה", category: "תלמוד ירושלמי", units: 74 }, // 37 דפים
    { name: "ירושלמי הוריות", category: "תלמוד ירושלמי", units: 38 },  // 19 דפים
    { name: "ירושלמי נידה", category: "תלמוד ירושלמי", units: 26 },    // 13 דפים

// === תנ"ך (יחידות = פרקים) ===
    // חמישה חומשי תורה
    { name: "בראשית", category: "תנ\"ך", units: 50 },
    { name: "שמות", category: "תנ\"ך", units: 40 },
    { name: "ויקרא", category: "תנ\"ך", units: 27 },
    { name: "במדבר", category: "תנ\"ך", units: 36 },
    { name: "דברים", category: "תנ\"ך", units: 34 },

    // נביאים ראשונים
    { name: "יהושע", category: "תנ\"ך", units: 24 },
    { name: "שופטים", category: "תנ\"ך", units: 21 },
    { name: "שמואל א", category: "תנ\"ך", units: 31 },
    { name: "שמואל ב", category: "תנ\"ך", units: 24 },
    { name: "מלכים א", category: "תנ\"ך", units: 22 },
    { name: "מלכים ב", category: "תנ\"ך", units: 25 },

    // נביאים אחרונים
    { name: "ישעיהו", category: "תנ\"ך", units: 66 },
    { name: "ירמיהו", category: "תנ\"ך", units: 52 },
    { name: "יחזקאל", category: "תנ\"ך", units: 48 },

    // תרי עשר
    { name: "הושע", category: "תנ\"ך", units: 14 },
    { name: "יואל", category: "תנ\"ך", units: 4 },
    { name: "עמוס", category: "תנ\"ך", units: 9 },
    { name: "עובדיה", category: "תנ\"ך", units: 1 },
    { name: "יונה", category: "תנ\"ך", units: 4 },
    { name: "מיכה", category: "תנ\"ך", units: 7 },
    { name: "נחום", category: "תנ\"ך", units: 3 },
    { name: "חבקוק", category: "תנ\"ך", units: 3 },
    { name: "צפניה", category: "תנ\"ך", units: 3 },
    { name: "חגי", category: "תנ\"ך", units: 2 },
    { name: "זכריה", category: "תנ\"ך", units: 14 },
    { name: "mלאכי", category: "תנ\"ך", units: 3 },

    // כתובים
    { name: "תהילים", category: "תנ\"ך", units: 150 },
    { name: "משלי", category: "תנ\"ך", units: 31 },
    { name: "איוב", category: "תנ\"ך", units: 42 },
    { name: "שיר השירים", category: "תנ\"ך", units: 8 },
    { name: "רות", category: "תנ\"ך", units: 4 },
    { name: "איכה", category: "תנ\"ך", units: 5 },
    { name: "קהלת", category: "תנ\"ך", units: 12 },
    { name: "אסתר", category: "תנ\"ך", units: 10 },
    { name: "דניאל", category: "תנ\"ך", units: 12 },
    { name: "עזרא", category: "תנ\"ך", units: 10 },
    { name: "נחמיה", category: "תנ\"ך", units: 13 },
    { name: "דברי הימים א", category: "תנ\"ך", units: 29 },
    { name: "דברי הימים ב", category: "תנ\"ך", units: 36 },

    // === משנה (יחידות = פרקים) ===
    { name: "ברכות (משנה)", category: "משנה", units: 9 },
    { name: "פאה", category: "משנה", units: 8 },
    { name: "דמאי", category: "משנה", units: 7 },
    { name: "כלאיים", category: "משנה", units: 9 },
    { name: "שביעית", category: "משנה", units: 10 },
    { name: "תרומות", category: "משנה", units: 11 },
    { name: "מעשרות", category: "משנה", units: 5 },
    { name: "מעשר שני", category: "משנה", units: 5 },
    { name: "חלה", category: "משנה", units: 4 },
    { name: "ערלה", category: "משנה", units: 3 },
    { name: "ביכורים", category: "משנה", units: 3 },
    { name: "שבת (משנה)", category: "משנה", units: 24 },
    { name: "עירובין (משנה)", category: "משנה", units: 10 },
    { name: "פסחים (משנה)", category: "משנה", units: 10 },
    { name: "שקלים (משנה)", category: "משנה", units: 8 },
    { name: "יומא (משנה)", category: "משנה", units: 8 },
    { name: "סוכה (משנה)", category: "משנה", units: 5 },
    { name: "ביצה (משנה)", category: "משנה", units: 5 },
    { name: "ראש השנה (משנה)", category: "משנה", units: 4 },
    { name: "תענית (משנה)", category: "משנה", units: 4 },
    { name: "מגילה (משנה)", category: "משנה", units: 4 },
    { name: "מועד קטן (משנה)", category: "משנה", units: 3 },
    { name: "חגיגה (משנה)", category: "משנה", units: 3 },
    { name: "יבמות (משנה)", category: "משנה", units: 16 },
    { name: "כתובות (משנה)", category: "משנה", units: 13 },
    { name: "נדרים (משנה)", category: "משנה", units: 11 },
    { name: "נזיר (משנה)", category: "משנה", units: 9 },
    { name: "סוטה (משנה)", category: "משנה", units: 9 },
    { name: "גיטין (משנה)", category: "משנה", units: 9 },
    { name: "קידושין (משנה)", category: "משנה", units: 4 },
    { name: "בבא קמא (משנה)", category: "משנה", units: 10 },
    { name: "בבא מציעא (משנה)", category: "משנה", units: 10 },
    { name: "בבא בתרא (משנה)", category: "משנה", units: 10 },
    { name: "סנהדרין (משנה)", category: "משנה", units: 11 },
    { name: "מכות (משנה)", category: "משנה", units: 3 },
    { name: "שבועות (משנה)", category: "משנה", units: 8 },
    { name: "עדיות", category: "משנה", units: 8 },
    { name: "עבודה זרה (משנה)", category: "משנה", units: 5 },
    { name: "אבות", category: "משנה", units: 6 },
    { name: "הוריות (משנה)", category: "משנה", units: 3 },
    { name: "זבחים (משנה)", category: "משנה", units: 14 },
    { name: "מנחות (משנה)", category: "משנה", units: 13 },
    { name: "חולין (משנה)", category: "משנה", units: 12 },
    { name: "בכורות (משנה)", category: "משנה", units: 9 },
    { name: "ערכין (משנה)", category: "משנה", units: 9 },
    { name: "תמורה (משנה)", category: "משנה", units: 7 },
    { name: "כריתות (משנה)", category: "משנה", units: 6 },
    { name: "מעילה (משנה)", category: "משנה", units: 6 },
    { name: "תמיד (משנה)", category: "משנה", units: 7 },
    { name: "מידות (משנה)", category: "משנה", units: 5 },
    { name: "קינים (משנה)", category: "משנה", units: 3 },
    { name: "כלים", category: "משנה", units: 30 },
    { name: "אוהלות", category: "משנה", units: 18 },
    { name: "נגעים", category: "משנה", units: 14 },
    { name: "פרה", category: "משנה", units: 12 },
    { name: "טהרות", category: "משנה", units: 10 },
    { name: "מקואות", category: "משנה", units: 10 },
    { name: "נידה (משנה)", category: "משנה", units: 10 },
    { name: "מכשירין", category: "משנה", units: 6 },
    { name: "זבים", category: "משנה", units: 5 },
    { name: "טבול יום", category: "משנה", units: 4 },
    { name: "ידיים", category: "משנה", units: 4 },
    { name: "עוקצין", category: "משנה", units: 3 },

// === שולחן ערוך מפורט (לפי הלכות) ===

    // --- אורח חיים (חיי היום-יום) ---
    { name: "שו\"ע - הלכות השכמת הבוקר", category: "הלכה", units: 7 },
    { name: "שו\"ע - הלכות נטילת ידיים", category: "הלכה", units: 11 },
    { name: "שו\"ע - הלכות תפילין", category: "הלכה", units: 20 },
    { name: "שו\"ע - הלכות ציצית", category: "הלכה", units: 17 },
    { name: "שו\"ע - הלכות ברכות השחר", category: "הלכה", units: 10 },
    { name: "שו\"ע - הלכות קריאת שמע", category: "הלכה", units: 25 },
    { name: "שו\"ע - הלכות תפילה", category: "הלכה", units: 45 },
    { name: "שו\"ע - הלכות נשיאת כפיים", category: "הלכה", units: 13 },
    { name: "שו\"ע - הלכות קריאת התורה", category: "הלכה", units: 14 },
    { name: "שו\"ע - הלכות ברכות הנהנין", category: "הלכה", units: 22 },
    { name: "שו\"ע - הלכות סעודה ונטילת ידיים", category: "הלכה", units: 31 },
    { name: "שו\"ע - הלכות תפילת המנחה והערב", category: "הלכה", units: 5 },
    { name: "שו\"ע - הלכות שבת", category: "הלכה", units: 184 },
    { name: "שו\"ע - הלכות עירובין", category: "הלכה", units: 51 },
    { name: "שו\"ע - הלכות ראש חודש", category: "הלכה", units: 11 },
    { name: "שו\"ע - הלכות פסח", category: "הלכה", units: 62 },
    { name: "שו\"ע - הלכות יום טוב", category: "הלכה", units: 33 },
    { name: "שו\"ע - הלכות חול המועד", category: "הלכה", units: 18 },
    { name: "שו\"ע - הלכות תעניות", category: "הלכה", units: 20 },
    { name: "שו\"ע - הלכות ראש השנה", category: "הלכה", units: 11 },
    { name: "שו\"ע - הלכות יום הכיפורים", category: "הלכה", units: 15 },
    { name: "שו\"ע - הלכות סוכה ולולב", category: "הלכה", units: 28 },
    { name: "שו\"ע - הלכות חנוכה", category: "הלכה", units: 13 },
    { name: "שו\"ע - הלכות מגילה ופורים", category: "הלכה", units: 12 },

    // --- יורה דעה (איסור והיתר) ---
    { name: "שו\"ע - הלכות שחיטה", category: "הלכה", units: 28 },
    { name: "שו\"ע - הלכות טרפות", category: "הלכה", units: 32 },
    { name: "שו\"ע - הלכות מליחה", category: "הלכה", units: 12 },
    { name: "שו\"ע - הלכות בשר בחלב", category: "הלכה", units: 11 },
    { name: "שו\"ע - הלכות תערובות", category: "הלכה", units: 13 },
    { name: "שו\"ע - הלכות עבודה זרה", category: "הלכה", units: 31 },
    { name: "שו\"ע - הלכות ריבית", category: "הלכה", units: 18 },
    { name: "שו\"ע - הלכות נדרים", category: "הלכה", units: 48 },
    { name: "שו\"ע - הלכות שבועות", category: "הלכה", units: 17 },
    { name: "שו\"ע - הלכות כיבוד אב ואם", category: "הלכה", units: 3 },
    { name: "שו\"ע - הלכות תלמוד תורה", category: "הלכה", units: 5 },
    { name: "שו\"ע - הלכות צדקה", category: "הלכה", units: 12 },
    { name: "שו\"ע - הלכות מילה", category: "הלכה", units: 7 },
    { name: "שו\"ע - הלכות פדיון הבן", category: "הלכה", units: 1 },
    { name: "שו\"ע - הלכות כלאי בגדים (שעטנז)", category: "הלכה", units: 9 },
    { name: "שו\"ע - הלכות מזוזה", category: "הלכה", units: 7 },
    { name: "שו\"ע - הלכות ספר תורה", category: "הלכה", units: 10 },
    { name: "שו\"ע - הלכות אבלות", category: "הלכה", units: 63 },

    // --- חושן משפט (ממונות ונזיקין) ---
    { name: "שו\"ע - הלכות דיינים", category: "הלכה", units: 27 },
    { name: "שו\"ע - הלכות עדות", category: "הלכה", units: 10 },
    { name: "שו\"ע - הלכות הלוואה", category: "הלכה", units: 35 },
    { name: "שו\"ע - הלכות גביית מלווה", category: "הלכה", units: 11 },
    { name: "שו\"ע - הלכות טוען ונטען", category: "הלכה", units: 23 },
    { name: "שו\"ע - הלכות שותפים", category: "הלכה", units: 11 },
    { name: "שו\"ע - הלכות שלוחים", category: "הלכה", units: 6 },
    { name: "שו\"ע - הלכות מקח וממכר", category: "הלכה", units: 44 },
    { name: "שו\"ע - הלכות אונאה", category: "הלכה", units: 12 },
    { name: "שו\"ע - הלכות מתנה", category: "הלכה", units: 11 },
    { name: "שו\"ע - הלכות גזילה", category: "הלכה", units: 17 },
    { name: "שו\"ע - הלכות אבידה ומציאה", category: "הלכה", units: 14 },
    { name: "שו\"ע - הלכות נזיקין", category: "הלכה", units: 32 },
    { name: "שו\"ע - הלכות שכירות", category: "הלכה", units: 26 },

    // --- אבן העזר ---
    { name: "שו\"ע - הלכות פריה ורביה", category: "הלכה", units: 5 },
    { name: "שו\"ע - הלכות אישות", category: "הלכה", units: 25 },
    { name: "שו\"ע - הלכות קידושין", category: "הלכה", units: 40 },
    { name: "שו\"ע - הלכות כתובות", category: "הלכה", units: 52 },
    { name: "שו\"ע - הלכות גיטין", category: "הלכה", units: 35 },
    { name: "שו\"ע - הלכות יבום וחליצה", category: "הלכה", units: 22 },
  
    
// === משנה ברורה / שו"ע אורח חיים (מפורט) ===
    { name: "משנה ברורה - הלכות השכמת הבוקר", category: "הלכה", units: 7 }, // א-ז
    { name: "משנה ברורה - הלכות נטילת ידיים", category: "הלכה", units: 4 }, // ח-יא
    { name: "משנה ברורה - הלכות אשר יצר וברכות השחר", category: "הלכה", units: 10 }, // מו-נו
    { name: "משנה ברורה - הלכות ציצית", category: "הלכה", units: 17 }, // ח-כד
    { name: "משנה ברורה - הלכות תפילין", category: "הלכה", units: 20 }, // כה-מד
    { name: "משנה ברורה - הלכות קריאת שמע", category: "הלכה", units: 25 }, // נח-פב
    { name: "משנה ברורה - הלכות תפילה (עמידה)", category: "הלכה", units: 31 }, // פט-קיט
    { name: "משנה ברורה - הלכות חזרת הש\"ץ ונשיאת כפיים", category: "הלכה", units: 11 }, // קכד-קלד (כולל קכ"ח)
    { name: "משנה ברורה - הלכות קריאת התורה", category: "הלכה", units: 15 }, // קלה-קמח
    { name: "משנה ברורה - הלכות נטילת ידיים וסעודה", category: "הלכה", units: 13 }, // קנח-קע
    { name: "משנה ברורה - הלכות ברכת המזון", category: "הלכה", units: 21 }, // קעא-קצא
    { name: "משנה ברורה - הלכות ברכות הנהנין", category: "הלכה", units: 29 }, // רב-רל
    { name: "משנה ברורה - הלכות שבת: הכנה וקידוש", category: "הלכה", units: 30 }, // רמב-רעב
    { name: "משנה ברורה - הלכות שבת: סעודות ותפילה", category: "הלכה", units: 27 }, // רעג-רצט
    { name: "משנה ברורה - הלכות שבת: ל\"ט מלאכות", category: "הלכה", units: 41 }, // ש-שמ
    { name: "משנה ברורה - הלכות שבת: מוקצה", category: "הלכה", units: 4 }, // שח-שיא (מוקצה העיקרי)
    { name: "משנה ברורה - הלכות שבת: הוצאה וטלטול", category: "הלכה", units: 19 }, // שמה-שסג
    { name: "משנה ברורה - הלכות פסח", category: "הלכה", units: 63 }, // תכט-תצא
    { name: "משנה ברורה - הלכות יום טוב", category: "הלכה", units: 31 }, // תצט-תקכט
    { name: "משנה ברורה - הלכות חול המועד", category: "הלכה", units: 14 }, // תקלה-תקמח
    { name: "משנה ברורה - הלכות תעניות", category: "הלכה", units: 20 }, // תקמח-תקפ
    { name: "משנה ברורה - הלכות ראש השנה", category: "הלכה", units: 11 }, // תקפא-תקצב
    { name: "משנה ברורה - הלכות יום כיפור", category: "הלכה", units: 15 }, // תרי-תרכד
    { name: "משנה ברורה - הלכות סוכה ולולב", category: "הלכה", units: 28 }, // תרכה-תרנג
    { name: "משנה ברורה - הלכות חנוכה", category: "הלכה", units: 13 }, // תרע-תרפב
    { name: "משנה ברורה - הלכות מגילה ופורים", category: "הלכה", units: 12 }, // תרפז-תרצט

    // === רמב"ם (משנה תורה - מפורט) ===
    { name: "רמב\"ם - ספר המדע (יסודי התורה, דעות, תשובה)", category: "הלכה", units: 46 },
    { name: "רמב\"ם - ספר אהבה (קריאת שמע, תפילה, מילה)", category: "הלכה", units: 45 },
    { name: "רמב\"ם - ספר זמנים (שבת, יו\"ט, שופר)", category: "הלכה", units: 100 },
    { name: "רמב\"ם - ספר נשים (אישות, גירושין)", category: "הלכה", units: 60 },
    { name: "רמב\"ם - ספר קדושה (מאכלות אסורות, שחיטה)", category: "הלכה", units: 35 },
    { name: "רמב\"ם - ספר הפלאה (נדרים, נזירות, ערכין)", category: "הלכה", units: 40 },
    { name: "רמב\"ם - ספר זרעים (תרומות, מעשרות, שמיטה)", category: "הלכה", units: 120 },
    { name: "רמב\"ם - ספר עבודה (בית הבחירה, כלי המקדש)", category: "הלכה", units: 95 },
    { name: "רמב\"ם - ספר קרבנות", category: "הלכה", units: 65 },
    { name: "רמב\"ם - ספר טהרה", category: "הלכה", units: 170 },
    { name: "רמב\"ם - ספר נזיקין (גזילה, אבידה, חובל ומזיק)", category: "הלכה", units: 45 },
    { name: "רמב\"ם - ספר קנין (מכירה, זכייה ומתנה)", category: "הלכה", units: 60 },
    { name: "רמב\"ם - ספר משפטים (שכירות, מלווה ולווה)", category: "הלכה", units: 85 },
    { name: "רמב\"ם - ספר שופטים (סנהדרין, מלכים ומלחמות)", category: "הלכה", units: 50 },


    // === ספר החינוך ===
    { name: "ספר החינוך", category: "הלכה ומצוות", units: 613 },



    // === מוסר ומחשבה ===
// === ספרי מוסר ומחשבה (יחידות = סימנים/פרקים/שערים) ===

    // --- מוסר ---
    { name: "מסילת ישרים", category: "מוסר ומחשבה", units: 26 }, // 26 פרקים
    { name: "שערי תשובה", category: "מוסר ומחשבה", units: 330 }, // סך כל הסימנים ב-4 שערים (51+26+231+22)
    { name: "אורחות צדיקים", category: "מוסר ומחשבה", units: 28 }, // 28 שערים
    { name: "חובות הלבבות", category: "מוסר ומחשבה", units: 78 }, // סך כל הפרקים ב-10 השערים

    // --- מחשבה והשקפה ---
    { name: "ספר הכוזרי", category: "מוסר ומחשבה", units: 331 }, // סך כל הסעיפים בחמשת המאמרים    { name: "מורה נבוכים - חלק א'", category: "מוסר ומחשבה", units: 76 }, // 76 פרקים
    { name: "מורה נבוכים - חלק ב'", category: "מוסר ומחשבה", units: 48 }, // 48 פרקים
    { name: "מורה נבוכים - חלק ג'", category: "מוסר ומחשבה", units: 54 }, // 54 פרקים
    
    // --- נפש החיים ---
    { name: "נפש החיים - שער א'", category: "מוסר ומחשבה", units: 22 }, // 22 פרקים
    { name: "נפש החיים - שער ב'", category: "מוסר ומחשבה", units: 18 }, // 18 פרקים
    { name: "נפש החיים - שער ג'", category: "מוסר ומחשבה", units: 14 }, // 14 פרקים
    { name: "נפש החיים - שער ד' (מעלת התורה)", category: "מוסר ומחשבה", units: 34 }, // 34 פרקים

    // --- עלי שור (רבי שלמה וולבה) ---
    { name: "עלי שור - חלק א' (ועדים א-י)", category: "מוסר ומחשבה", units: 10 }, 
    { name: "עלי שור - חלק א' (מאמרי הדרכה)", category: "מוסר ומחשבה", units: 15 },
    { name: "עלי שור - חלק ב' (שער א-ג: עולם, אדם, תורה)", category: "מוסר ומחשבה", units: 45 }, // פרקים פנימיים
    { name: "עלי שור - חלק ב' (שער ד: תפילה)", category: "מוסר ומחשבה", units: 18 },
    { name: "עלי שור - חלק ב' (שער ה-ו: מועדים ומידות)", category: "מוסר ומחשבה", units: 40 },

    // --- מכתב מאליהו (רבי אליהו דסלר) ---
    { name: "מכתב מאליהו - כרך א'", category: "מוסר ומחשבה", units: 35 }, // מאמרים עיקריים
    { name: "מכתב מאליהו - כרך ב'", category: "מוסר ומחשבה", units: 40 },
    { name: "מכתב מאליהו - כרך ג'", category: "מוסר ומחשבה", units: 45 },
    { name: "מכתב מאליהו - כרך ד'", category: "מוסר ומחשבה", units: 50 },
    { name: "מכתב מאליהו - כרך ה'", category: "מוסר ומחשבה", units: 40 },

    // --- שיחות ומוסר ישיבתי ---
    { name: "שיחות מוסר (רב חיים שמואלביץ)", category: "מוסר ומחשבה", units: 105 }, // שיחות בודדות
    { name: "מדרגת האדם (הסבא מנובהרדוק)", category: "מוסר ומחשבה", units: 13 }, // מאמרים ארוכים
    { name: "דעת חכמה ומוסר (רבי ירוחם ממיר)", category: "מוסר ומחשבה", units: 150 }, // הערכה לפי שיחות בכל הכרכים
    { name: "אור ישראל (נתיבות)", category: "מוסר ומחשבה", units: 30 }, // ל' נתיבות
    { name: "אור ישראל (אגרות)", category: "מוסר ומחשבה", units: 12 }, // י"ב אגרות

    // === מדרש ===
    { name: "מדרש רבה - בראשית", category: "מדרש", units: 100 }, // ק' פרשיות
    { name: "מדרש רבה - שמות", category: "מדרש", units: 52 },   // נ"ב פרשיות
    { name: "מדרש רבה - ויקרא", category: "מדרש", units: 37 },  // ל"ז פרשיות
    { name: "מדרש רבה - במדבר", category: "מדרש", units: 23 },  // כ"ג פרשיות
    { name: "מדרש רבה - דברים", category: "מדרש", units: 11 },  // י"א פרשיות
    
    // חמש מגילות - פירוט נפרד
    { name: "מדרש רבה - שיר השירים", category: "מדרש", units: 8 }, // לפי פרקים
    { name: "מדרש רבה - רות", category: "מדרש", units: 8 },        // ח' פרשיות
    { name: "מדרש רבה - איכה", category: "מדרש", units: 5 },       // ה' פרשיות (פתיחתות + פרקים)
    { name: "מדרש רבה - קהלת", category: "מדרש", units: 12 },      // י"ב פרקים
    { name: "מדרש רבה - אסתר", category: "מדרש", units: 10 },      // י' פרשיות

    { name: "מדרש תנחומא", category: "מדרש", units: 54 },       // לפי פרשיות השבוע
    { name: "פרקי דרבי אליעזר", category: "מדרש", units: 54 },  // נ"ד פרקים
];