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
    name: 'TYT Geometri', level: 'TYT',
    topics: [
      'Temel Geometri Kavramları', 'Doğruda Açılar', 'Üçgende Açılar',
      'Üçgende Eşlik-Benzerlik', 'Üçgende Alan', 'Dik Üçgen ve Trigonometri',
      'Çokgenler', 'Dörtgenler', 'Çemberin Temel Elemanları', 'Çemberde Uzunluk ve Alan',
      'Katı Cisimler',
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
  {
    name: 'TYT Din Kültürü', level: 'TYT',
    topics: [
      'Bilgi ve İnanç', 'İbadetler', 'Hz. Muhammed\'in Hayatı',
      'Kur\'an ve Yorumu', 'Ahlaki Değerler',
    ],
  },
];

export const AYT_SUBJECTS: Subject[] = [
  {
    name: 'AYT Matematik', level: 'AYT', fields: ['sayisal', 'esit_agirlik'],
    topics: [
      'Fonksiyonlar', 'Polinomlar', 'İkinci Dereceden Denklemler', 'Eşitsizlikler',
      'Parabol', 'Trigonometri', 'Trigonometrik Denklemler',
      'Üstel ve Logaritmik Fonksiyonlar', 'Logaritma',
      'Diziler', 'Aritmetik Dizi', 'Geometrik Dizi', 'Seriler',
      'Limit ve Süreklilik', 'Türev', 'Türevin Uygulamaları',
      'İntegral', 'Belirli İntegral ve Alan Hesabı',
      'Karmaşık Sayılar', 'Matrisler', 'Determinant',
      'Doğrusal Denklem Sistemleri',
    ],
  },
  {
    name: 'AYT Geometri', level: 'AYT', fields: ['sayisal', 'esit_agirlik'],
    topics: [
      'Analitik Geometri', 'Doğrunun Analitik İncelenmesi',
      'Çemberin Analitik İncelenmesi', 'Konikler (Elips, Hiperbol, Parabol)',
      'Uzay Geometri', 'Katı Cisimler (Prizma, Piramit, Koni, Küre)',
      'Dönüşüm Geometrisi',
    ],
  },
  {
    name: 'AYT Fizik', level: 'AYT', fields: ['sayisal'],
    topics: [
      'Vektörler', 'Kuvvet Dengesi', 'Tork ve Denge',
      'Doğrusal ve Dairesel Hareket', 'Newton\'un Hareket Yasaları',
      'İş, Enerji ve Güç', 'İmpuls ve Momentum',
      'Elektrik Alan ve Potansiyel', 'Paralel Levhalar ve Sığa',
      'Manyetik Alan', 'Elektromanyetik İndüksiyon',
      'Alternatif Akım ve Transformatörler',
      'Dalga Mekaniği', 'Işığın Dalga Modeli', 'Optik (Ayna ve Mercek)',
      'Atom Fiziği ve Atom Modelleri', 'Fotoelektrik Olay',
      'Çekirdek Fiziği ve Radyoaktivite', 'Modern Fizik ve Özel Görelilik',
    ],
  },
  {
    name: 'AYT Kimya', level: 'AYT', fields: ['sayisal'],
    topics: [
      'Atom Kimyası ve Orbital Kavramı', 'Periyodik Özellikler',
      'Gazlar ve Gaz Yasaları', 'Sıvı Çözeltiler ve Derişim',
      'Kimyasal Tepkimelerde Enerji (Termokimya)',
      'Tepkime Hızları ve Faktörleri', 'Kimyasal Denge',
      'Çözünürlük Dengesi', 'Asit-Baz Dengesi ve pH',
      'Elektrokimya (Pil ve Elektroliz)',
      'Organik Kimyaya Giriş', 'Hidrokarbonlar',
      'Fonksiyonel Gruplar (Alkoller, Eterler, Aldehitler, Ketonlar)',
      'Karboksilik Asitler ve Esterler',
      'Polimerler', 'Karbonhidratlar', 'Amino Asitler ve Proteinler',
      'Yağlar ve Sabunlar', 'Vitaminler',
    ],
  },
  {
    name: 'AYT Biyoloji', level: 'AYT', fields: ['sayisal'],
    topics: [
      'Hücre Bölünmeleri (Mitoz ve Mayoz)', 'Eşeyli ve Eşeysiz Üreme',
      'Kalıtımın Genel İlkeleri', 'Mendel Genetiği',
      'Eş Baskınlık ve Eksik Baskınlık', 'Kan Grupları Kalıtımı',
      'Mutasyonlar ve Modifikasyonlar', 'Genetik Mühendisliği ve Biyoteknoloji',
      'Canlıların Sınıflandırılması',
      'Bitki Biyolojisi (Yapı, Üreme, Büyüme)',
      'Sindirim Sistemi', 'Dolaşım Sistemi', 'Solunum Sistemi',
      'Boşaltım Sistemi', 'Sinir Sistemi', 'Endokrin Sistem',
      'Duyu Organları', 'Destek ve Hareket Sistemi',
      'Üreme Sistemi ve Embriyonik Gelişim',
      'Komünite Ekolojisi ve Popülasyon Dinamikleri',
    ],
  },
  {
    name: 'AYT Edebiyat', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'Giriş – Edebiyat Bilgileri ve Türleri',
      'Şiir Bilgisi (Ölçü, Uyak, Edebi Sanatlar)',
      'İslamiyet Öncesi Türk Edebiyatı',
      'İslami Dönem Türk Edebiyatı (Geçiş Dönemi)',
      'Halk Edebiyatı (Âşık, Anonim, Tekke)',
      'Divan Edebiyatı (Nazım Biçimleri ve Türleri)',
      'Tanzimat Edebiyatı (I. ve II. Dönem)',
      'Servetifünun Edebiyatı',
      'Fecr-i Ati Edebiyatı',
      'Milli Edebiyat Dönemi',
      'Cumhuriyet Dönemi Şiiri',
      'Cumhuriyet Dönemi Romanı ve Hikâyesi',
      'Tiyatro (Geleneksel ve Modern)',
      'Deneme, Makale, Fıkra, Eleştiri',
      'Edebi Akımlar (Klasisizm, Romantizm, Realizm, Natüralizm)',
      'Sözcükte ve Cümlede Anlam',
      'Yazar-Eser Eşleştirmeleri',
    ],
  },
  {
    name: 'AYT Tarih-1', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'İlk Türk Devletleri (Hunlar, Göktürkler, Uygurlar)',
      'İslam Medeniyeti ve İlk Türk-İslam Devletleri',
      'Büyük Selçuklu Devleti', 'Türkiye Selçuklu Devleti',
      'Beylikler Dönemi',
      'Osmanlı Kuruluş ve Yükselme Dönemi',
      'Osmanlı Duraklama ve Gerileme Dönemi',
      'Osmanlı Kültür ve Medeniyeti',
      'Tanzimat, Islahat ve Meşrutiyet Dönemi',
      'I. Dünya Savaşı ve Mondros Mütarekesi',
    ],
  },
  {
    name: 'AYT Tarih-2', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'Kurtuluş Savaşı\'na Hazırlık Dönemi',
      'Kurtuluş Savaşı (Cepheler ve Antlaşmalar)',
      'Türkiye Cumhuriyeti\'nin Kuruluşu',
      'Atatürk Dönemi İç ve Dış Politika (1923-1938)',
      'Atatürk İlkeleri', 'Türk İnkılâp Tarihi',
      'II. Dünya Savaşı ve Türkiye',
      'Soğuk Savaş Dönemi',
      'Küreselleşen Dünya ve Türkiye',
      'Türkiye\'nin Yakın Dönem Tarihi',
      '21. Yüzyılda Türkiye ve Dünya',
    ],
  },
  {
    name: 'AYT Coğrafya-1', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'Doğal Sistemler (Jeoloji, Atmosfer, Hidroloji)',
      'İklim Tipleri ve Etkileri',
      'Toprak Oluşumu ve Tipleri', 'Biyomlar',
      'Nüfus ve Yerleşme Coğrafyası',
      'Türkiye\'nin Bölgeleri ve Özellikleri',
    ],
  },
  {
    name: 'AYT Coğrafya-2', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'Beşeri Sistemler (Tarım, Sanayi, Enerji)',
      'Ulaşım ve Ticaret',
      'Küresel Ortam (Bölgeler ve Ülkeler)',
      'Çevre ve Toplum', 'Doğal Afetler',
      'Mekansal Sentez (Türkiye ve Dünya Karşılaştırması)',
      'Fonksiyonel Bölge Analizi',
    ],
  },
  {
    name: 'AYT Felsefe Grubu', level: 'AYT', fields: ['sozel', 'esit_agirlik'],
    topics: [
      'Felsefe ve Düşünce Tarihi',
      'MÖ Felsefe (Sokrates, Platon, Aristoteles)',
      'Ortaçağ ve Rönesans Felsefesi',
      'Aydınlanma Dönemi Felsefesi',
      'Psikolojiye Giriş ve Temel Kavramlar', 'Psikoloji Akımları ve Ekolleri',
      'Gelişim Psikolojisi', 'Öğrenme ve Bellek',
      'Sosyolojiye Giriş', 'Toplumsal Yapı ve Kurumlar',
      'Toplumsal Değişme ve Gelişme',
      'Mantık (Kavram, Önerme, Akıl Yürütme)',
      'Klasik Mantık ve Modern Mantık',
    ],
  },
  {
    name: 'AYT Din Kültürü', level: 'AYT', fields: ['sozel'],
    topics: [
      'İnanç ve İbadetler', 'İslam Düşüncesinde Yorumlar',
      'Ahlak ve Değerler', 'Dinler Tarihi',
      'Hz. Muhammed ve Örnekliği', 'Güncel Dini Meseleler',
    ],
  },
  {
    name: 'AYT Yabancı Dil (İngilizce)', level: 'AYT', fields: ['yabanci_dil'],
    topics: [
      'Grammar (Tenses, Modals, Conditionals)',
      'Vocabulary (Collocations, Phrasal Verbs)',
      'Reading Comprehension',
      'Cloze Test',
      'Translation (İngilizce-Türkçe)',
      'Dialogue Completion',
      'Paragraph Completion',
      'Restatement',
      'Irrelevant Sentence',
    ],
  },
];

/** Get all subjects available for a student based on field */
export function getSubjectsForStudent(field?: string | null): Subject[] {
  const tyt = [...TYT_SUBJECTS];
  
  if (!field) return tyt;
  
  // Map display names to field keys
  const fieldMap: Record<string, StudentField> = {
    'Sayısal': 'sayisal',
    'Sözel': 'sozel',
    'Eşit Ağırlık': 'esit_agirlik',
    'Yabancı Dil': 'yabanci_dil',
    'sayisal': 'sayisal',
    'sozel': 'sozel',
    'esit_agirlik': 'esit_agirlik',
    'yabanci_dil': 'yabanci_dil',
  };
  
  const mappedField = fieldMap[field];
  if (!mappedField || field === 'TYT') return tyt;
  
  const ayt = AYT_SUBJECTS.filter(s => 
    s.fields?.includes(mappedField) ?? false
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
