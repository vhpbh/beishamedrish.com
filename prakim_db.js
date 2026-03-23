const DETAILED_TRACTATES = [
    { 
        name: "ברכות", 
        category: "תלמוד בבלי", 
        units: 126, 
        chapters: [
            { name: "מאימתי", pages: 13, start_page: 2 },
            { name: "היה קורא", pages: 5, start_page: 13 },
            { name: "מי שמתו", pages: 10, start_page: 17 },
            { name: "תפילת השחר", pages: 9, start_page: 26 },
            { name: "אין עומדין", pages: 8, start_page: 30 },
            { name: "כיצד מברכין", pages: 11, start_page: 35 },
            { name: "שלשה שאכלו", pages: 6, start_page: 45 },
            { name: "אלו דברים", pages: 4, start_page: 51 },
            { name: "הרואה", pages: 10, start_page: 54 }
        ]
    },
    { 
        name: "שבת", 
        category: "תלמוד בבלי", 
        units: 314, 
        chapters: [
            { name: "יציאות השבת", pages: 20, start_page: 2 },
            { name: "במה מדליקין", pages: 16, start_page: 20 },
            { name: "כירה", pages: 10, start_page: 36 },
            { name: "במה טומנין", pages: 5, start_page: 47 },
            { name: "במה בהמה", pages: 4, start_page: 51 },
            { name: "במה אשה", pages: 8, start_page: 57 },
            { name: "כלל גדול", pages: 8, start_page: 67 },
            { name: "המוציא יין", pages: 5, start_page: 76 },
            { name: "אמר ר' עקיבא", pages: 10, start_page: 81 },
            { name: "המצניע", pages: 5, start_page: 90 },
            { name: "הזורק", pages: 11, start_page: 96 },
            { name: "הבונה", pages: 5, start_page: 102 },
            { name: "האורג", pages: 4, start_page: 105 },
            { name: "שמונה שרצים", pages: 6, start_page: 107 },
            { name: "ואלו קשרים", pages: 4, start_page: 111 },
            { name: "כל כתבי", pages: 11, start_page: 115 },
            { name: "כל הכלים", pages: 6, start_page: 122 },
            { name: "מפנין", pages: 4, start_page: 126 },
            { name: "ר' אליעזר דמילה", pages: 8, start_page: 130 },
            { name: "תולין", pages: 3, start_page: 137 },
            { name: "נוטל", pages: 3, start_page: 141 },
            { name: "חבית", pages: 5, start_page: 145 },
            { name: "שואל", pages: 5, start_page: 148 },
            { name: "מי שהחשיך", pages: 6, start_page: 153 }
        ]
    }
];

const MOED_TRACTATES = [
    { 
        name: "עירובין", 
        category: "תלמוד בבלי", 
        units: 210, 
        chapters: [
            { name: "מבוי", pages: 17, start_page: 2 },
            { name: "עושין פסין", pages: 8, start_page: 18 },
            { name: "בכל מערבין", pages: 15, start_page: 26 },
            { name: "מי שהוציאוהו", pages: 11, start_page: 41 },
            { name: "כיצד מעברין", pages: 18, start_page: 52 },
            { name: "הדר", pages: 13, start_page: 70 },
            { name: "חלון", pages: 6, start_page: 76 },
            { name: "בכל מערבין (חלק ב')", pages: 7, start_page: 82 },
            { name: "המוצא תפילין", pages: 11, start_page: 95 },
            { name: "הזקן", pages: 4, start_page: 101 }
        ]
    },
    { 
        name: "פסחים", 
        category: "תלמוד בבלי", 
        units: 242, 
        chapters: [
            { name: "אור לארבעה עשר", pages: 21, start_page: 2 },
            { name: "כל שעה", pages: 15, start_page: 22 },
            { name: "אלו עוברין", pages: 12, start_page: 42 },
            { name: "מקום שנהגו", pages: 11, start_page: 50 },
            { name: "תמיד נשחט", pages: 8, start_page: 58 },
            { name: "אלו דברים", pages: 10, start_page: 65 },
            { name: "כיצד צולין", pages: 10, start_page: 73 },
            { name: "האשה", pages: 10, start_page: 87 },
            { name: "מי שהיה טמא", pages: 6, start_page: 92 },
            { name: "ערבי פסחים", pages: 22, start_page: 99 }
        ]
    },
    { 
        name: "יומא", 
        category: "תלמוד בבלי", 
        units: 176,
        chapters: [
            { name: "שבעת ימים", pages: 18, start_page: 2 },
            { name: "בראשונה", pages: 8, start_page: 19 },
            { name: "אמר להם הממונה", pages: 16, start_page: 28 },
            { name: "טרף בקלפי", pages: 10, start_page: 39 },
            { name: "שני שעירים", pages: 10, start_page: 47 },
            { name: "בא לו עלי", pages: 10, start_page: 61 },
            { name: "יום הכפורים", pages: 10, start_page: 68 },
            { name: "יום הכפורים (איסור אכילה)", pages: 10, start_page: 73 }
        ]
    },
    { 
        name: "סוכה", 
        category: "תלמוד בבלי", 
        units: 112, 
        chapters: [
            { name: "סוכה שהיא גבוהה", pages: 20, start_page: 2 },
            { name: "הישן תחת המיטה", pages: 9, start_page: 20 },
            { name: "לולב הגזול", pages: 13, start_page: 29 },
            { name: "לולב וערבה", pages: 9, start_page: 42 },
            { name: "החליל", pages: 6, start_page: 50 }
        ]
    }
];

const MOED_COMPLETION = [
    { 
        name: "ביצה", 
        category: "תלמוד בבלי", 
        units: 80, 
        chapters: [
            { name: "ביצה", pages: 14, start_page: 2 },
            { name: "יום טוב", pages: 9, start_page: 15 },
            { name: "אין צדין", pages: 6, start_page: 24 },
            { name: "המביא", pages: 5, start_page: 30 },
            { name: "משילין", pages: 6, start_page: 35 }
        ]
    },
    { 
        name: "ראש השנה", 
        category: "תלמוד בבלי", 
        units: 70, 
        chapters: [
            { name: "ארבעה ראשי שנים", pages: 20, start_page: 2 },
            { name: "אם אינם מכירים", pages: 4, start_page: 22 },
            { name: "ראוהו בית דין", pages: 3, start_page: 26 },
            { name: "יום טוב", pages: 7, start_page: 29 }
        ]
    },
    { 
        name: "תענית", 
        category: "תלמוד בבלי", 
        units: 62, 
        chapters: [
            { name: "מאימתי", pages: 13, start_page: 2 },
            { name: "סדר תעניות כיצד", pages: 3, start_page: 15 },
            { name: "סדר תעניות אלו", pages: 8, start_page: 18 },
            { name: "בשלשה פרקים", pages: 6, start_page: 26 }
        ]
    },
    { 
        name: "מגילה", 
        category: "תלמוד בבלי", 
        units: 62, 
        chapters: [
            { name: "מגילה נקראת", pages: 15, start_page: 2 },
            { name: "הקורא למפרע", pages: 4, start_page: 17 },
            { name: "הקורא עומד", pages: 4, start_page: 21 },
            { name: "בני העיר", pages: 7, start_page: 25 }
        ]
    },
    { 
        name: "מועד קטן", 
        category: "תלמוד בבלי", 
        units: 56, 
        chapters: [
            { name: "משקין", pages: 9, start_page: 2 },
            { name: "מי שהפך", pages: 2, start_page: 11 },
            { name: "ואלו מגלחין", pages: 16, start_page: 13 }
        ]
    },
    { 
        name: "חגיגה", 
        category: "תלמוד בבלי", 
        units: 54, 
        chapters: [
            { name: "הכל חייבין", pages: 9, start_page: 2 },
            { name: "אין דורשין", pages: 9, start_page: 11 },
            { name: "חומר בקודש", pages: 8, start_page: 20 }
        ]
    }
];

const NASHIM_TRACTATES = [
    { 
        name: "יבמות", 
        category: "תלמוד בבלי", 
        units: 244, 
        chapters: [
            { name: "חמש עשרה נשים", pages: 16, start_page: 2 }, { name: "כיצד", pages: 10, start_page: 17 },
            { name: "החולץ", pages: 13, start_page: 39 }, { name: "אלמנה לכהן גדול", pages: 10, start_page: 52 },
            { name: "הבא על יבמתו", pages: 12, start_page: 62 }, { name: "חשיבה", pages: 6, start_page: 66 },
            { name: "הערל", pages: 8, start_page: 70 }, { name: "הערל (המשך)", pages: 7, start_page: 78 },
            { name: "יש מותרות", pages: 9, start_page: 84 }, { name: "כיצד אשת אחיו", pages: 7, start_page: 92 },
            { name: "נושאין על האנוסה", pages: 4, start_page: 97 }, { name: "מצוות חליצה", pages: 5, start_page: 101 },
            { name: "הנודר מהנאה", pages: 6, start_page: 106 }, { name: "חרשת", pages: 7, start_page: 112 },
            { name: "האשה שהלכה", pages: 4, start_page: 117 }, { name: "האשה בתרא", pages: 6, start_page: 121 }
        ]
    },
    { 
        name: "כתובות", 
        category: "תלמוד בבלי", 
        units: 224, 
        chapters: [
            { name: "בתולה נישאת", pages: 15, start_page: 2 }, { name: "האשה שנתארמלה", pages: 12, start_page: 16 },
            { name: "אלו נערות", pages: 15, start_page: 29 }, { name: "נערה שנתפתתה", pages: 10, start_page: 42 },
            { name: "אף על פי", pages: 12, start_page: 54 }, { name: "מציאת האשה", pages: 5, start_page: 65 },
            { name: "המתקדשת", pages: 7, start_page: 70 }, { name: "האשה שנפלו", pages: 6, start_page: 78 },
            { name: "הכותב לאשתו", pages: 10, start_page: 83 }, { name: "מי שהיה נשוי", pages: 5, start_page: 93 },
            { name: "אלמנה ניזונת", pages: 7, start_page: 96 }, { name: "הנושא את האשה", pages: 5, start_page: 101 },
            { name: "שני דייני גזירות", pages: 8, start_page: 104 }
        ]
    },
    { 
        name: "נדרים", 
        category: "תלמוד בבלי", 
        units: 182, 
        chapters: [
            { name: "כל כינויי", pages: 12, start_page: 2 }, { name: "ואלו מותרין", pages: 8, start_page: 13 },
            { name: "ארבעה נדרים", pages: 10, start_page: 21 }, { name: "אין בין המודר", pages: 8, start_page: 31 },
            { name: "השותפין", pages: 8, start_page: 43 }, { name: "הנודר מן המבושל", pages: 6, start_page: 49 },
            { name: "הנודר מן הירק", pages: 6, start_page: 54 }, { name: "קונם יין", pages: 4, start_page: 60 },
            { name: "רבי אליעזר אומר", pages: 13, start_page: 64 }, { name: "הפרת נדרים", pages: 9, start_page: 77 },
            { name: "נערה המאורסה", pages: 6, start_page: 86 }
        ]
    }
];

const NASHIM_COMPLETION = [
    { 
        name: "נזיר", 
        category: "תלמוד בבלי", 
        units: 132, 
        chapters: [
            { name: "כל כינויי נזירות", pages: 11, start_page: 2 },
            { name: "הריני נזיר מן הגרוגרות", pages: 3, start_page: 13 },
            { name: "מי שאמר הריני נזיר", pages: 8, start_page: 16 },
            { name: "מי שאמר הריני נזיר ושמע חבירו", pages: 10, start_page: 24 },
            { name: "בית שמאי אומרים", pages: 4, start_page: 34 },
            { name: "שלשה מינין אסורין", pages: 12, start_page: 38 },
            { name: "כהן גדול ונזיר", pages: 6, start_page: 50 },
            { name: "שני נזירים", pages: 6, start_page: 56 },
            { name: "הגויים אין להם נזירות", pages: 6, start_page: 61 }
        ]
    },
    { 
        name: "סוטה", 
        category: "תלמוד בבלי", 
        units: 98, 
        chapters: [
            { name: "המקנא", pages: 13, start_page: 2 },
            { name: "היה מביא", pages: 6, start_page: 15 },
            { name: "כל הנשואות", pages: 5, start_page: 21 },
            { name: "ארוסה וקטלנית", pages: 3, start_page: 26 },
            { name: "כשם שהמים", pages: 4, start_page: 29 },
            { name: "מי שקינא", pages: 4, start_page: 33 },
            { name: "אלו נאמרין", pages: 7, start_page: 37 },
            { name: "משוח מלחמה", pages: 3, start_page: 44 },
            { name: "עגלה ערופה", pages: 5, start_page: 47 }
        ]
    },
    { 
        name: "גיטין", 
        category: "תלמוד בבלי", 
        units: 180,
        chapters: [
            { name: "המביא גט ממדינת הים", pages: 14, start_page: 2 },
            { name: "המביא גט בארץ ישראל", pages: 10, start_page: 16 },
            { name: "כל הגט", pages: 8, start_page: 26 },
            { name: "השולח גט", pages: 17, start_page: 34 },
            { name: "הניזקין", pages: 12, start_page: 51 },
            { name: "האומר התקבל", pages: 5, start_page: 63 },
            { name: "מי שאחזו", pages: 10, start_page: 68 },
            { name: "הזורק", pages: 8, start_page: 78 },
            { name: "המגרש", pages: 6, start_page: 86 }
        ]
    },
    { 
        name: "קידושין", 
        category: "תלמוד בבלי", 
        units: 164,
        chapters: [
            { name: "האשה נקנית", pages: 41, start_page: 2 },
            { name: "האיש מקדש", pages: 13, start_page: 43 },
            { name: "האומר לחברו", pages: 13, start_page: 56 },
            { name: "עשרה יוחסין", pages: 15, start_page: 69 }
        ]
    }
];

const NEZIKIN_TRACTATES = [
    { 
        name: "בבא קמא", 
        category: "תלמוד בבלי", 
        units: 238,
        chapters: [
            { name: "ארבעה אבות נזיקין", pages: 16, start_page: 2 },
            { name: "כיצד הרגל", pages: 10, start_page: 18 },
            { name: "המניח את הכד", pages: 11, start_page: 28 },
            { name: "שור שנגח ד' וה'", pages: 11, start_page: 39 },
            { name: "שור שנגח את הפרה", pages: 10, start_page: 50 },
            { name: "הכונס צאן", pages: 10, start_page: 60 },
            { name: "מרובה", pages: 11, start_page: 70 },
            { name: "החובל", pages: 13, start_page: 81 },
            { name: "הגוזל עצים", pages: 14, start_page: 94 },
            { name: "הגוזל ומאכיל", pages: 13, start_page: 108 }
        ]
    },
    { 
        name: "בבא מציעא", 
        category: "תלמוד בבלי", 
        units: 238,
        chapters: [
            { name: "שנים אוחזין", pages: 20, start_page: 2 },
            { name: "אלו מציאות", pages: 13, start_page: 22 },
            { name: "המפקיד", pages: 11, start_page: 35 },
            { name: "הזהב", pages: 16, start_page: 46 },
            { name: "איזהו נשך", pages: 19, start_page: 62 },
            { name: "השוכר את האומנין", pages: 8, start_page: 81 },
            { name: "השוכר את הפועלים", pages: 11, start_page: 89 },
            { name: "השואל", pages: 7, start_page: 100 },
            { name: "המקבל", pages: 10, start_page: 107 },
            { name: "הבית והעלייה", pages: 4, start_page: 117 }
        ]
    }
];

const YERUSHALMI_MOED_CONT = [
    { 
        name: "ירושלמי עירובין", 
        category: "תלמוד ירושלמי", 
        units: 130, 
        chapters: [
            { name: "מבוי", pages: 15, start_page: 2 },
            { name: "עושין פסין", pages: 10, start_page: 17 },
            { name: "בכל מערבין", pages: 12, start_page: 27 }
        ]
    },
    { 
        name: "ירושלמי פסחים", 
        category: "תלמוד ירושלמי", 
        units: 142, 
        chapters: [
            { name: "אור לארבעה עשר", pages: 18, start_page: 2 },
            { name: "כל שעה", pages: 12, start_page: 20 },
            { name: "אלו עוברין", pages: 10, start_page: 32 }
        ]
    }
];

const NEZIKIN_COMPLETION = [
    { 
        name: "בבא בתרא", 
        category: "תלמוד בבלי", 
        units: 352, 
        chapters: [
            { name: "השותפין", pages: 15, start_page: 2 },
            { name: "לא יחפור", pages: 11, start_page: 17 },
            { name: "חזקת הבתים", pages: 33, start_page: 28 },
            { name: "המוכר את הבית", pages: 12, start_page: 61 },
            { name: "המוכר את הספינה", pages: 18, start_page: 73 },
            { name: "המוכר פירות", pages: 11, start_page: 91 },
            { name: "המוכר שדה לחבירו", pages: 6, start_page: 102 },
            { name: "יש נוחלין", pages: 32, start_page: 108 },
            { name: "המניח", pages: 18, start_page: 140 },
            { name: "גט פשוט", pages: 19, start_page: 158 }
        ]
    },
    { 
        name: "סנהדרין", 
        category: "תלמוד בבלי", 
        units: 226, 
        chapters: [
            { name: "דיני ממונות", pages: 16, start_page: 2 },
            { name: "כהן גדול", pages: 5, start_page: 18 },
            { name: "זה בורר", pages: 9, start_page: 23 },
            { name: "אחד דיני ממונות", pages: 4, start_page: 32 },
            { name: "היו בודקין", pages: 6, start_page: 36 },
            { name: "נגמר הדין", pages: 4, start_page: 42 },
            { name: "ארבע מיתות", pages: 22, start_page: 46 },
            { name: "בן סורר ומורה", pages: 8, start_page: 68 },
            { name: "אלו הן הנשרפין", pages: 8, start_page: 76 },
            { name: "אלו הן הנחנקין", pages: 6, start_page: 84 },
            { name: "חלק", pages: 24, start_page: 90 }
        ]
    },
    { 
        name: "מכות", 
        category: "תלמוד בבלי", 
        units: 48, 
        chapters: [
            { name: "כיצד העדים", pages: 5, start_page: 2 },
            { name: "אלו הן הגולין", pages: 6, start_page: 7 },
            { name: "אלו הן הלוקין", pages: 11, start_page: 13 }
        ]
    },
    { 
        name: "שבועות", 
        category: "תלמוד בבלי", 
        units: 98, 
        chapters: [
            { name: "שבועות שתים", pages: 12, start_page: 2 },
            { name: "ידיעות הטומאה", pages: 7, start_page: 14 },
            { name: "שבועות שתים (חלק ב')", pages: 8, start_page: 21 },
            { name: "שבועת העדות", pages: 9, start_page: 29 },
            { name: "שבועת הפיקדון", pages: 2, start_page: 38 },
            { name: "שבועת הדיינין", pages: 5, start_page: 40 },
            { name: "המפקיד", pages: 3, start_page: 45 },
            { name: "ארבעה שומרין", pages: 1, start_page: 49 }
        ]
    },
    { 
        name: "עבודה זרה", 
        category: "תלמוד בבלי", 
        units: 152, 
        chapters: [
            { name: "לפני אידיהן", pages: 20, start_page: 2 },
            { name: "אין מעמידין", pages: 18, start_page: 22 },
            { name: "כל הצלמים", pages: 10, start_page: 41 },
            { name: "פרק רביעי", pages: 11, start_page: 50 },
            { name: "פרק חמישי", pages: 15, start_page: 61 }
        ]
    },
    { 
        name: "הוריות", 
        category: "תלמוד בבלי", 
        units: 28, 
        chapters: [
            { name: "הורו בית דין", pages: 3, start_page: 2 },
            { name: "הורה כהן משיח", pages: 5, start_page: 5 },
            { name: "כהן משיח שחטא", pages: 4, start_page: 10 }
        ]
    }
];

const KODASHIM_TRACTATES = [
    { 
        name: "זבחים", 
        category: "תלמוד בבלי", 
        units: 240, 
        chapters: [
            { name: "כל הזבחים", pages: 11, start_page: 2 },
            { name: "כל הזבחים שקיבלו", pages: 13, start_page: 13 },
            { name: "כל הפסולים", pages: 10, start_page: 26 },
            { name: "בית שמאי אומרים", pages: 10, start_page: 36 },
            { name: "איזהו מקומן", pages: 11, start_page: 47 },
            { name: "הקדש קדשים", pages: 9, start_page: 58 },
            { name: "חטאת העוף", pages: 7, start_page: 64 },
            { name: "כל הזבחים שנתערבו", pages: 6, start_page: 73 },
            { name: "הכל הנשרפין", pages: 8, start_page: 82 },
            { name: "כל התדיר", pages: 10, start_page: 89 },
            { name: "דם חטאת", pages: 10, start_page: 98 },
            { name: "טבול יום", pages: 12, start_page: 108 },
            { name: "השוחט והמעלה", pages: 6, start_page: 115 }
        ]
    },
    { 
        name: "מנחות", 
        category: "תלמוד בבלי", 
        units: 220, 
        chapters: [
            { name: "כל המנחות", pages: 16, start_page: 2 },
            { name: "הקומץ את המנחה", pages: 8, start_page: 18 },
            { name: "הקומץ רבה", pages: 11, start_page: 26 },
            { name: "התכלת", pages: 16, start_page: 38 },
            { name: "כל המנחות באות מצה", pages: 10, start_page: 54 },
            { name: "כל קרבנות הציבור", pages: 10, start_page: 64 },
            { name: "אלו מנחות", pages: 7, start_page: 74 },
            { name: "התודה", pages: 7, start_page: 81 },
            { name: "כל המנחות הניצוקות", pages: 8, start_page: 88 },
            { name: "שתי המידות", pages: 6, start_page: 96 },
            { name: "המנחה והנסכים", pages: 5, start_page: 102 },
            { name: "הרי עלי עשרון", pages: 3, start_page: 107 }
        ]
    }
];

const YERUSHALMI_MOED_FINAL = [
    { 
        name: "ירושלמי יומא", 
        category: "תלמוד ירושלמי", 
        units: 84, 
        chapters: [{ name: "שבעת ימים", pages: 8, start_page: 2 }, { name: "בראשונה", pages: 6, start_page: 10 }]
    },
    { 
        name: "ירושלמי סוכה", 
        category: "תלמוד ירושלמי", 
        units: 52, 
        chapters: [{ name: "סוכה שהיא גבוהה", pages: 10, start_page: 2 }, { name: "הישן תחת המיטה", pages: 6, start_page: 12 }]
    },
    { 
        name: "ירושלמי ראש השנה", 
        category: "תלמוד ירושלמי", 
        units: 44,
        chapters: [{ name: "ארבעה ראשי שנים", pages: 12, start_page: 2 }, { name: "אם אינם מכירים", pages: 10, start_page: 14 }]
    },
    { 
        name: "ירושלמי תענית", 
        category: "תלמוד ירושלמי", 
        units: 52, 
        chapters: [{ name: "מאימתי", pages: 14, start_page: 2 }, { name: "סדר תעניות", pages: 12, start_page: 16 }]
    },
    { 
        name: "ירושלמי מגילה", 
        category: "תלמוד ירושלמי", 
        units: 68, 
        chapters: [{ name: "מגילה נקראת", pages: 15, start_page: 2 }, { name: "הקורא למפרע", pages: 8, start_page: 17 }]
    }
];

const KODASHIM_COMPLETION = [
    { 
        name: "חולין", 
        category: "תלמוד בבלי", 
        units: 284,
        chapters: [
            { name: "הכל שוחטין", pages: 26, start_page: 2 },
            { name: "השוחט", pages: 14, start_page: 27 },
            { name: "אלו טריפות", pages: 18, start_page: 42 },
            { name: "בהמה המקשה", pages: 12, start_page: 58 },
            { name: "אותו ואת בנו", pages: 6, start_page: 78 },
            { name: "כיסוי הדם", pages: 5, start_page: 83 },
            { name: "גיד הנשה", pages: 12, start_page: 89 },
            { name: "כל הבשר", pages: 12, start_page: 104 },
            { name: "העור והרוטב", pages: 11, start_page: 117 },
            { name: "הזרוע והלחיים", pages: 13, start_page: 130 },
            { name: "ראשית הגז", pages: 4, start_page: 135 },
            { name: "שילוח הקן", pages: 4, start_page: 138 }
        ]
    },
    { 
        name: "בכורות", 
        category: "תלמוד בבלי", 
        units: 122,
        chapters: [
            { name: "הלוקח עובר", pages: 12, start_page: 2 },
            { name: "הלוקח בהמה", pages: 7, start_page: 13 },
            { name: "כל פיסולי", pages: 6, start_page: 20 },
            { name: "עד כמה", pages: 9, start_page: 26 },
            { name: "כל מומי", pages: 8, start_page: 36 },
            { name: "על אלו מומין", pages: 6, start_page: 43 },
            { name: "יש בכור", pages: 6, start_page: 47 },
            { name: "הבכור נוטל", pages: 4, start_page: 52 },
            { name: "מעשר בהמה", pages: 6, start_page: 56 }
        ]
    },
    { 
        name: "ערכין", 
        category: "תלמוד בבלי", 
        units: 68, 
        chapters: [
            { name: "הכל מעריכין", pages: 9, start_page: 2 },
            { name: "אין בערכין", pages: 4, start_page: 10 },
            { name: "יש בערכין", pages: 3, start_page: 15 },
            { name: "המקדש שדהו", pages: 5, start_page: 19 },
            { name: "המוכר שדהו", pages: 5, start_page: 24 },
            { name: "אין מעריכין", pages: 8, start_page: 29 }
        ]
    },
    { 
        name: "תמורה", 
        category: "תלמוד בבלי", 
        units: 68, 
        chapters: [
            { name: "הכל ממירין", pages: 12, start_page: 2 },
            { name: "יש בקרבנות", pages: 5, start_page: 13 },
            { name: "אלו קדשים", pages: 7, start_page: 17 },
            { name: "וולד חטאת", pages: 10, start_page: 28 }
        ]
    },
    { 
        name: "כריתות", 
        category: "תלמוד בבלי", 
        units: 56, 
        chapters: [
            { name: "שלשים וששה", pages: 9, start_page: 2 },
            { name: "ארבעה מחוסרי", pages: 5, start_page: 10 },
            { name: "המביא אשם", pages: 5, start_page: 15 },
            { name: "ספק אכל", pages: 4, start_page: 19 },
            { name: "דם שנתערב", pages: 3, start_page: 23 },
            { name: "המביא אשם תלוי", pages: 3, start_page: 26 }
        ]
    },
    { 
        name: "מעילה", 
        category: "תלמוד בבלי", 
        units: 44, 
        chapters: [
            { name: "קדשי קדשים", pages: 6, start_page: 2 },
            { name: "חטאת העוף", pages: 3, start_page: 8 },
            { name: "ולד קדשים", pages: 3, start_page: 11 },
            { name: "הנהנה", pages: 4, start_page: 14 },
            { name: "השליח", pages: 6, start_page: 18 }
        ]
    },
    { 
        name: "תמיד ומדות", 
        category: "תלמוד בבלי", 
        units: 26, 
        chapters: [
            { name: "בשלשה מקומות", pages: 3, start_page: 25 }, 
            { name: "מידות", pages: 5, start_page: 33 } 
        ]
    }
];

const TAHOROT_BAVLI = [
    { 
        name: "נידה", 
        category: "תלמוד בבלי", 
        units: 146, 
        chapters: [
            { name: "שמאי אומר", pages: 12, start_page: 2 },
            { name: "כל היד", pages: 8, start_page: 13 },
            { name: "המפלת", pages: 10, start_page: 21 },
            { name: "בנות כותים", pages: 7, start_page: 32 },
            { name: "יוצא דופן", pages: 8, start_page: 40 },
            { name: "בא סימן", pages: 6, start_page: 48 },
            { name: "דם הנידה", pages: 8, start_page: 54 },
            { name: "הרואה כתם", pages: 4, start_page: 62 },
            { name: "האשה שהיא עושה", pages: 4, start_page: 66 },
            { name: "תינוקת", pages: 8, start_page: 70 }
        ]
    }
];

const YERUSHALMI_ZERAIM = [
    { 
        name: "ירושלמי פאה", 
        category: "תלמוד ירושלמי", 
        units: 74, 
        chapters: [{ name: "אלו דברים", pages: 10, start_page: 2 }, { name: "מאימתי", pages: 8, start_page: 12 }]
    },
    { 
        name: "ירושלמי דמאי", 
        category: "תלמוד ירושלמי", 
        units: 68, 
        chapters: [{ name: "הקלין שבדמאי", pages: 12, start_page: 2 }, { name: "אלו דברים", pages: 10, start_page: 14 }]
    },
    { 
        name: "ירושלמי כלאיים", 
        category: "תלמוד ירושלמי", 
        units: 88,
        chapters: [{ name: "החיטין והזונין", pages: 15, start_page: 2 }, { name: "כל מיני", pages: 10, start_page: 17 }]
    }
];

const YERUSHALMI_ZERAIM_COMPLETION = [
    { 
        name: "ירושלמי שביעית", 
        category: "תלמוד ירושלמי", 
        units: 62, 
        chapters: [
            { name: "עד אימתי חורשין", pages: 10, start_page: 2 },
            { name: "מנודדין", pages: 8, start_page: 12 },
            { name: "הרוצה להוציא", pages: 7, start_page: 20 },
            { name: "המדל", pages: 6, start_page: 27 }
        ]
    },
    { 
        name: "ירושלמי תרומות", 
        category: "תלמוד ירושלמי", 
        units: 56, 
        chapters: [
            { name: "חמישה לא יתרמו", pages: 10, start_page: 2 },
            { name: "התורם קישות", pages: 9, start_page: 12 },
            { name: "התורם מן המחובר", pages: 9, start_page: 21 }
        ]
    },
    { 
        name: "ירושלמי מעשרות", 
        category: "תלמוד ירושלמי", 
        units: 52, 
        chapters: [
            { name: "כלל אמרו במעשרות", pages: 13, start_page: 2 },
            { name: "היה עובר", pages: 13, start_page: 15 }
        ]
    },
    { 
        name: "ירושלמי מעשר שני", 
        category: "תלמוד ירושלמי", 
        units: 66, 
        chapters: [
            { name: "מעשר שני אין מוכרין", pages: 11, start_page: 2 },
            { name: "מעשר שני ניתן להוצאה", pages: 11, start_page: 13 },
            { name: "מעשר שני שנטמא", pages: 11, start_page: 24 }
        ]
    },
    { 
        name: "ירושלמי חלה ואורלה", 
        category: "תלמוד ירושלמי", 
        units: 96, 
        chapters: [
            { name: "חלה - חמישה דברים", pages: 14, start_page: 2 },
            { name: "אורלה - הנוטע לסייג", pages: 10, start_page: 16 }
        ]
    }
];

const YERUSHALMI_NASHIM = [
    { 
        name: "ירושלמי יבמות", 
        category: "תלמוד ירושלמי", 
        units: 170, 
        chapters: [
            { name: "חמש עשרה נשים", pages: 15, start_page: 2 },
            { name: "כיצד אשת אחיו", pages: 12, start_page: 17 },
            { name: "החולץ", pages: 12, start_page: 29 },
            { name: "אלמנה לכהן גדול", pages: 12, start_page: 41 },
            { name: "הבא על יבמתו", pages: 12, start_page: 53 },
            { name: "הערל", pages: 12, start_page: 65 },
            { name: "מצוות חליצה", pages: 10, start_page: 77 }
        ]
    },
    { 
        name: "ירושלמי סוטה", 
        category: "תלמוד ירושלמי", 
        units: 94,
        chapters: [
            { name: "המקנא", pages: 12, start_page: 2 },
            { name: "היה מביא", pages: 10, start_page: 14 },
            { name: "כל הנשואות", pages: 10, start_page: 24 },
            { name: "אלו נאמרין", pages: 15, start_page: 34 }
        ]
    },
    { 
        name: "ירושלמי כתובות", 
        category: "תלמוד ירושלמי", 
        units: 144, 
        chapters: [
            { name: "בתולה נישאת", pages: 15, start_page: 2 },
            { name: "האשה שנתארמלה", pages: 12, start_page: 17 },
            { name: "אלו נערות", pages: 15, start_page: 29 },
            { name: "נערה שנתפתתה", pages: 15, start_page: 44 },
            { name: "אף על פי", pages: 15, start_page: 59 }
        ]
    },
    { 
        name: "ירושלמי נדרים וגמרא", 
        category: "תלמוד ירושלמי", 
        units: 160, 
        chapters: [
            { name: "נדרים - כל כינויי", pages: 12, start_page: 2 },
            { name: "נזיר - כל כינויי", pages: 12, start_page: 14 },
            { name: "גיטין - המביא", pages: 15, start_page: 26 },
            { name: "קידושין - האשה נקנית", pages: 15, start_page: 41 }
        ]
    }
];

const YERUSHALMI_NEZIKIN = [
    { 
        name: "ירושלמי בבא קמא", 
        category: "תלמוד ירושלמי", 
        units: 88,
        chapters: [
            { name: "ארבעה אבות נזיקין", pages: 12, start_page: 2 },
            { name: "כיצד הרגל", pages: 10, start_page: 14 },
            { name: "המניח את הכד", pages: 11, start_page: 24 },
            { name: "שור שנגח", pages: 11, start_page: 35 }
        ]
    },
    { 
        name: "ירושלמי בבא מציעא", 
        category: "תלמוד ירושלמי", 
        units: 66,
        chapters: [
            { name: "שנים אוחזין", pages: 11, start_page: 2 },
            { name: "אלו מציאות", pages: 11, start_page: 13 },
            { name: "המפקיד", pages: 11, start_page: 24 }
        ]
    },
    { 
        name: "ירושלמי בבא בתרא", 
        category: "תלמוד ירושלמי", 
        units: 68,
        chapters: [
            { name: "השותפין", pages: 11, start_page: 2 },
            { name: "חזקת הבתים", pages: 12, start_page: 13 },
            { name: "המוכר את הבית", pages: 11, start_page: 25 }
        ]
    },
    { 
        name: "ירושלמי סנהדרין", 
        category: "תלמוד ירושלמי", 
        units: 114,
        chapters: [
            { name: "דיני ממונות", pages: 15, start_page: 2 },
            { name: "זה בורר", pages: 14, start_page: 17 },
            { name: "ארבע מיתות", pages: 14, start_page: 31 },
            { name: "חלק", pages: 14, start_page: 45 }
        ]
    }
];

const YERUSHALMI_COMPLETION = [
    { 
        name: "ירושלמי ברכות", 
        category: "תלמוד ירושלמי", 
        units: 68, 
        chapters: [
            { name: "מאימתי", pages: 10, start_page: 2 },
            { name: "היה קורא", pages: 6, start_page: 12 },
            { name: "מי שמתו", pages: 8, start_page: 18 },
            { name: "תפילת השחר", pages: 10, start_page: 26 }
        ]
    },
    { 
        name: "ירושלמי שבת", 
        category: "תלמוד ירושלמי", 
        units: 92, 
        chapters: [
            { name: "יציאות השבת", pages: 12, start_page: 2 },
            { name: "במה מדליקין", pages: 10, start_page: 14 },
            { name: "כלל גדול", pages: 12, start_page: 24 },
            { name: "שמונה שרצים", pages: 12, start_page: 36 }
        ]
    },
    { 
        name: "ירושלמי מועד קטן", 
        category: "תלמוד ירושלמי", 
        units: 18, 
        chapters: [
            { name: "משקין", pages: 8, start_page: 2 },
            { name: "מי שהפך", pages: 10, start_page: 10 }
        ]
    },
    { 
        name: "ירושלמי חגיגה", 
        category: "תלמוד ירושלמי", 
        units: 22, 
        chapters: [
            { name: "הכל חייבין", pages: 10, start_page: 2 },
            { name: "אין דורשין", pages: 8, start_page: 12 },
            { name: "חומר בקודש", pages: 4, start_page: 20 }
        ]
    },
    { 
        name: "ירושלמי עבודה זרה", 
        category: "תלמוד ירושלמי", 
        units: 34, 
        chapters: [
            { name: "לפני אידיהן", pages: 10, start_page: 2 },
            { name: "אין מעמידין", pages: 10, start_page: 12 },
            { name: "כל הצלמים", pages: 14, start_page: 22 }
        ]
    },

{ 
    name: "קינים", 
    category: "תלמוד בבלי", 
    units: 6, 
    chapters: [
        { name: "חטאת העוף", pages: 2, start_page: 22 },
        { name: "קן שנתערבה", pages: 2, start_page: 24 },
        { name: "כל דפריש", pages: 2, start_page: 26 }
    ]
}];

const ALL_PRAKIM_DATA = [
    ...DETAILED_TRACTATES,
    ...MOED_TRACTATES,
    ...MOED_COMPLETION,
    ...NASHIM_TRACTATES,
    ...NASHIM_COMPLETION,
    ...NEZIKIN_TRACTATES,
    ...YERUSHALMI_MOED_CONT,
    ...NEZIKIN_COMPLETION,
    ...KODASHIM_TRACTATES,
    ...YERUSHALMI_MOED_FINAL,
    ...KODASHIM_COMPLETION,
    ...TAHOROT_BAVLI,
    ...YERUSHALMI_ZERAIM,
    ...YERUSHALMI_ZERAIM_COMPLETION,
    ...YERUSHALMI_NASHIM,
    ...YERUSHALMI_NEZIKIN,
    ...YERUSHALMI_COMPLETION
];
