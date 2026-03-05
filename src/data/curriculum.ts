// TYT/AYT Müfredat Veritabanı
// Hiyerarşi: Seviye (TYT/AYT) → Ders → Konu

export type ExamLevel = 'TYT' | 'AYT';
export type StudentField = 'sayisal' | 'sozel' | 'esit_agirlik' | 'yabanci_dil';

export interface Topic {
  id: string;
  name: string;
  subject: string;
  level: ExamLevel;
}

export interface Subject {
  name: string;
  level: ExamLevel;
  topics: string[];
  /** Which AYT fields include this subject */
  fields?: StudentField[];
}

export const TYT_SUBJECTS: Subject[] = [
  {
    name: 'TYT Matematik', level: 'TYT',
    topics: [
      'Temel Kavramlar', 'Sayı Basamakları', 'Bölme ve Bölünebilme', 'EBOB-EKOK',
      'Rasyonel Sayılar', 'Basit Eşitsizlikler', 'Mutlak Değer', 'Üslü Sayılar',
      'Köklü Sayılar', 'Çarpanlara Ayırma', 'Oran-Orantı', 'Problemler',
      'Kümeler', 'Fonksiyonlar', 'Permütasyon-Kombinasyon', 'Olasılık',
      'İstatistik', '1. Dereceden Denklemler', 'Polinomlar', 'Mantık',
    ],
  },
  {
    name: 'TYT Türkçe', level: 'TYT',
    topics: [
      'Sözcükte Anlam', 'Cümlede Anlam', 'Paragraf', 'Dil Bilgisi',
      'Ses Bilgisi', 'Sözcük Türleri', 'Cümle Türleri', 'Yazım Kuralları',
      'Noktalama İşaretleri', 'Anlatım Bozuklukları', 'Sözcükte Yapı',
    ],
  },
  {
    name: 'TYT Fizik', level: 'TYT',
    topics: [
      'Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Hareket ve Kuvvet',
      'Enerji', 'Isı ve Sıcaklık', 'Elektrostatik', 'Elektrik Akımı',
      'Manyetizma', 'Dalgalar', 'Optik',
    ],
  },
  {
    name: 'TYT Kimya', level: 'TYT',
    topics: [
      'Kimya Bilimi', 'Atom ve Periyodik Sistem', 'Kimyasal Türler Arası Etkileşimler',
      'Maddenin Halleri', 'Doğa ve Kimya', 'Kimyasal Tepkimeler',
      'Kimyanın Temel Kanunları', 'Karışımlar', 'Asitler ve Bazlar',
    ],
  },
  {
    name: 'TYT Biyoloji', level: 'TYT',
    topics: [
      'Canlıların Ortak Özellikleri', 'Hücre', 'Canlılar Dünyası',
      'Kalıtım', 'Ekosistem', 'Çevre Sorunları', 'Mitoz ve Mayoz',
    ],
  },
  {
    name: 'TYT Tarih', level: 'TYT',
    topics: [
      'Tarih Bilimi', 'İlk Çağ Uygarlıkları', 'İslam Tarihi',
      'Türk İslam Devletleri', 'Osmanlı Kuruluş', 'Osmanlı Yükselme',
      'Osmanlı Duraklama', 'Osmanlı Gerileme', 'Osmanlı Dağılma',
      'Kurtuluş Savaşı', 'Atatürk İlke ve İnkılâpları',
    ],
  },
  {
    name: 'TYT Coğrafya', level: 'TYT',
    topics: [
      'Doğa ve İnsan', 'Dünya\'nın Şekli ve Hareketleri', 'Harita Bilgisi',
      'İklim Bilgisi', 'Yeryüzü Şekilleri', 'Nüfus', 'Göçler', 'Yerleşme',
      'Türkiye\'nin Fiziki Coğrafyası', 'Türkiye\'nin Beşeri Coğrafyası',
    ],
  },
  {
    name: 'TYT Felsefe', level: 'TYT',
    topics: [
      'Felsefenin Anlamı', 'Bilgi Felsefesi', 'Varlık Felsefesi',
      'Ahlak Felsefesi', 'Sanat Felsefesi', 'Din Felsefesi',
      'Siyaset Felsefesi', 'Bilim Felsefesi',
    ],
  },
];

export const AYT_SUBJECTS: Subject[] = [
  {
    name: 'AYT Matematik', level: 'AYT', fields: ['sayisal', 'esit_agirlik'],
    topics: [
      'Fonksiyonlar', 'Polinomlar', 'İkinci Dereceden Denklemler', 'Eşitsizlikler',
      'Parabol', 'Trigonometri', 'Logaritma', 'Diziler', 'Limit',
      'Türev', 'İntegral', 'Karmaşık Sayılar', 'Matrisler',
      'Determinant', 'Doğrusal Denklem Sistemleri', 'Analitik Geometri',
      'Konikler', 'Uzay Geometri',
    ],
  },
  {
    name: 'AYT Fizik', level: 'AYT', fields: ['sayisal'],
    topics: [
      'Vektörler', 'Kuvvet ve Hareket', 'Enerji ve Momentum',
      'Tork ve Denge', 'Elektrik Alan', 'Manyetik Alan',
      'Elektromanyetik İndüksiyon', 'Alternatif Akım',
      'Dalga Mekaniği', 'Atom Fiziği', 'Çekirdek Fiziği',
      'Modern Fizik',
    ],
  },
  {
    name: 'AYT Kimya', level: 'AYT', fields: ['sayisal'],
    topics: [
      'Atom Kimyası', 'Periyodik Özellikler', 'Gazlar',
      'Sıvı Çözeltiler', 'Kimyasal Tepkimelerde Enerji',
      'Tepkime Hızları', 'Kimyasal Denge', 'Çözünürlük Dengesi',
      'Asit-Baz Dengesi', 'Elektrokimya', 'Organik Kimya',
      'Polimerler', 'Karbonhidratlar', 'Amino Asitler',
    ],
  },
  {
    name: 'AYT Biyoloji', level: 'AYT', fields: ['sayisal'],
    topics: [
      'Hücre Bölünmeleri', 'Kalıtım ve Biyoteknoloji', 'Canlı Çeşitliliği',
      'Bitki Biyolojisi', 'Sindirim Sistemi', 'Dolaşım Sistemi',
      'Solunum Sistemi', 'Boşaltım Sistemi', 'Sinir Sistemi',
      'Endokrin Sistem', 'Duyu Organları', 'Destek ve Hareket',
      'Üreme ve Gelişme', 'Komünite Ekolojisi',
    ],
  },
  {
    name: 'AYT Edebiyat', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'Giriş - Edebiyat Bilgileri', 'Şiir Bilgisi', 'Edebi Akımlar',
      'İslamiyet Öncesi Türk Edebiyatı', 'Halk Edebiyatı',
      'Divan Edebiyatı', 'Tanzimat Edebiyatı', 'Servet-i Fünun',
      'Fecr-i Ati', 'Milli Edebiyat', 'Cumhuriyet Dönemi',
      'Roman-Hikaye', 'Tiyatro', 'Deneme-Makale',
    ],
  },
  {
    name: 'AYT Tarih', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'İlk Türk Devletleri', 'İslam Medeniyeti', 'Türk İslam Devletleri',
      'Osmanlı Tarihi (Kuruluş-Yükselme)', 'Osmanlı Tarihi (Duraklama-Çöküş)',
      'Osmanlı Kültür ve Medeniyeti', 'Tanzimat ve Meşrutiyet',
      'I. Dünya Savaşı', 'Kurtuluş Savaşı\'na Hazırlık',
      'Kurtuluş Savaşı', 'Türkiye Cumhuriyeti (1923-1938)',
      'II. Dünya Savaşı', 'Soğuk Savaş', 'Küreselleşme',
    ],
  },
  {
    name: 'AYT Coğrafya', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'Doğal Sistemler', 'Beşeri Sistemler', 'Mekansal Sentez',
      'Bölgeler ve Ülkeler', 'Çevre ve Toplum', 'Küresel Ortam',
    ],
  },
  {
    name: 'AYT Felsefe Grubu', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'Felsefe Tarihi', 'Psikolojiye Giriş', 'Psikoloji Akımları',
      'Sosyolojiye Giriş', 'Toplumsal Yapı', 'Mantık',
    ],
  },
  {
    name: 'AYT Yabancı Dil', level: 'AYT', fields: ['yabanci_dil'],
    topics: [
      'Grammar', 'Vocabulary', 'Reading Comprehension',
      'Cloze Test', 'Translation', 'Dialogue Completion',
      'Paragraph Completion', 'Restatement',
    ],
  },
];

/** Get all subjects available for a student based on field */
export function getSubjectsForStudent(field?: string | null): Subject[] {
  // TYT subjects always included
  const tyt = [...TYT_SUBJECTS];
  
  if (!field) return tyt;
  
  const ayt = AYT_SUBJECTS.filter(s => 
    s.fields?.includes(field as StudentField) ?? false
  );
  
  return [...tyt, ...ayt];
}

/** Get all topics flattened with full labels */
export function getAllTopicsFlat(field?: string | null): Topic[] {
  const subjects = getSubjectsForStudent(field);
  const result: Topic[] = [];
  
  subjects.forEach(sub => {
    sub.topics.forEach(topic => {
      result.push({
        id: `${sub.name}::${topic}`,
        name: topic,
        subject: sub.name,
        level: sub.level,
      });
    });
  });
  
  return result;
}

/** Search topics */
export function searchTopics(query: string, field?: string | null): Topic[] {
  if (!query.trim()) return [];
  const all = getAllTopicsFlat(field);
  const q = query.toLowerCase();
  return all.filter(t => 
    t.name.toLowerCase().includes(q) || 
    t.subject.toLowerCase().includes(q)
  ).slice(0, 20);
}

export const FIELD_LABELS: Record<StudentField, string> = {
  sayisal: 'Sayısal',
  sozel: 'Sözel',
  esit_agirlik: 'Eşit Ağırlık',
  yabanci_dil: 'Yabancı Dil',
};

export const EXAM_TYPES = [
  { id: 'tyt_only', label: 'Sadece TYT', needsField: false },
  { id: 'ayt', label: 'TYT + AYT', needsField: true },
] as const;
