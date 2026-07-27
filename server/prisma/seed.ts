import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
];

const BADGES = [
  {
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🌟',
    category: 'learning',
    requirement: 1,
    type: 'lessons',
  },
  {
    name: 'Vocabulary Builder',
    description: 'Learn 50 words',
    icon: '📚',
    category: 'learning',
    requirement: 50,
    type: 'vocabulary',
  },
  {
    name: 'Grammar Master',
    description: 'Complete 10 grammar exercises',
    icon: '✍️',
    category: 'learning',
    requirement: 10,
    type: 'exercises',
  },
  {
    name: 'Streak Starter',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    category: 'streak',
    requirement: 7,
    type: 'streak',
  },
  {
    name: 'Dedicated Learner',
    description: 'Study for 30 days in a row',
    icon: '🎯',
    category: 'streak',
    requirement: 30,
    type: 'streak',
  },
  {
    name: 'Community Builder',
    description: 'Join 3 communities',
    icon: '🤝',
    category: 'community',
    requirement: 3,
    type: 'communities',
  },
  {
    name: 'Course Conqueror',
    description: 'Complete 5 courses',
    icon: '🏆',
    category: 'courses',
    requirement: 5,
    type: 'courses',
  },
];

const ENGLISH_VOCABULARY = [
  {
    word: 'Hello',
    translation: 'Hola',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Goodbye',
    translation: 'Adiós',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Thank you',
    translation: 'Gracias',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Please',
    translation: 'Por favor',
    language: 'en',
    difficulty: 'beginner',
  },
  { word: 'Yes', translation: 'Sí', language: 'en', difficulty: 'beginner' },
  { word: 'No', translation: 'No', language: 'en', difficulty: 'beginner' },
  {
    word: 'Water',
    translation: 'Agua',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Food',
    translation: 'Comida',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'House',
    translation: 'Casa',
    language: 'en',
    difficulty: 'beginner',
  },
  { word: 'Car', translation: 'Coche', language: 'en', difficulty: 'beginner' },
  {
    word: 'Friend',
    translation: 'Amigo',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Family',
    translation: 'Familia',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'School',
    translation: 'Escuela',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Teacher',
    translation: 'Maestro',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Student',
    translation: 'Estudiante',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Book',
    translation: 'Libro',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Pen',
    translation: 'Bolígrafo',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Paper',
    translation: 'Papel',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Computer',
    translation: 'Computadora',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Internet',
    translation: 'Internet',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Love',
    translation: 'Amor',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Happy',
    translation: 'Feliz',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Sad',
    translation: 'Triste',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Beautiful',
    translation: 'Hermoso',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Handsome',
    translation: 'Guapo',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Delicious',
    translation: 'Delicioso',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Expensive',
    translation: 'Caro',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Cheap',
    translation: 'Barato',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Fast',
    translation: 'Rápido',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Slow',
    translation: 'Lento',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Big',
    translation: 'Grande',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Small',
    translation: 'Pequeño',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Hot',
    translation: 'Caliente',
    language: 'en',
    difficulty: 'beginner',
  },
  { word: 'Cold', translation: 'Frío', language: 'en', difficulty: 'beginner' },
  {
    word: 'Good',
    translation: 'Bueno',
    language: 'en',
    difficulty: 'beginner',
  },
  { word: 'Bad', translation: 'Malo', language: 'en', difficulty: 'beginner' },
  { word: 'New', translation: 'Nuevo', language: 'en', difficulty: 'beginner' },
  { word: 'Old', translation: 'Viejo', language: 'en', difficulty: 'beginner' },
  {
    word: 'Young',
    translation: 'Joven',
    language: 'en',
    difficulty: 'beginner',
  },
  {
    word: 'Beautiful',
    translation: 'Bonito',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Ugly',
    translation: 'Feo',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Strong',
    translation: 'Fuerte',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Weak',
    translation: 'Débil',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Brave',
    translation: 'Valiente',
    language: 'en',
    difficulty: 'advanced',
  },
  {
    word: 'Cowardly',
    translation: 'Cobarde',
    language: 'en',
    difficulty: 'advanced',
  },
  {
    word: 'Intelligent',
    translation: 'Inteligente',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Stupid',
    translation: 'Estúpido',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Kind',
    translation: 'Amable',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Mean',
    translation: 'Malvado',
    language: 'en',
    difficulty: 'intermediate',
  },
  {
    word: 'Generous',
    translation: 'Generoso',
    language: 'en',
    difficulty: 'advanced',
  },
];

const GRAMMAR_RULES = [
  {
    title: 'Present Tense',
    description: 'Used for actions happening now or regularly.',
    examples: ['I walk', 'She eats', 'They play'],
    language: 'en',
    level: 'beginner',
  },
  {
    title: 'Past Tense',
    description: 'Used for actions that have already happened.',
    examples: ['I walked', 'She ate', 'They played'],
    language: 'en',
    level: 'beginner',
  },
  {
    title: 'Future Tense',
    description: 'Used for actions that will happen later.',
    examples: ['I will walk', 'She will eat', 'They will play'],
    language: 'en',
    level: 'intermediate',
  },
  {
    title: 'Present Continuous',
    description: 'Used for actions happening right now.',
    examples: ['I am walking', 'She is eating', 'They are playing'],
    language: 'en',
    level: 'intermediate',
  },
  {
    title: 'Past Continuous',
    description: 'Used for actions that were happening in the past.',
    examples: ['I was walking', 'She was eating', 'They were playing'],
    language: 'en',
    level: 'intermediate',
  },
  {
    title: 'Future Continuous',
    description: 'Used for actions that will be happening in the future.',
    examples: [
      'I will be walking',
      'She will be eating',
      'They will be playing',
    ],
    language: 'en',
    level: 'advanced',
  },
];

// Seed function
async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create languages
  console.log('📝 Creating languages...');
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }
  console.log(`✅ Created ${LANGUAGES.length} languages`);

  // 2. Create badges
  console.log('🏅 Creating badges...');
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    });
  }
  console.log(`✅ Created ${BADGES.length} badges`);

  // 3. Create English vocabulary
  console.log('📚 Creating English vocabulary...');
  for (const vocab of ENGLISH_VOCABULARY) {
    await prisma.vocabulary.upsert({
      where: {
        word_language: {
          word: vocab.word,
          language: vocab.language,
        },
      },
      update: {},
      create: vocab,
    });
  }
  console.log(
    `✅ Created ${ENGLISH_VOCABULARY.length} English vocabulary words`,
  );

  // 4. Create grammar rules
  console.log('📝 Creating grammar rules...');
  for (const rule of GRAMMAR_RULES) {
    await prisma.grammarRule.upsert({
      where: { title: rule.title },
      update: {},
      create: rule,
    });
  }
  console.log(`✅ Created ${GRAMMAR_RULES.length} grammar rules`);

  // 5. Create a demo user if none exists
  console.log('👤 Creating demo user...');
  const existingUser = await prisma.user.findUnique({
    where: { email: 'demo@lingoverse.com' },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('Demo123!', 10);
    const user = await prisma.user.create({
      data: {
        email: 'demo@lingoverse.com',
        passwordHash: hashedPassword,
        name: 'Demo User',
        profile: {
          create: {
            nativeLanguage: 'en',
            learningLanguages: ['en', 'es'],
            interests: ['Language Learning', 'Travel', 'Technology'],
            goals: ['Become fluent in Spanish'],
            bio: 'I love learning languages!',
            xp: 100,
            streak: 5,
          },
        },
        settings: {
          create: {
            emailNotifications: true,
            pushNotifications: true,
            soundEffects: true,
            theme: 'system',
            language: 'en',
            dailyReminderTime: ['09:00'],
            shareActivityWithFriends: true,
            showOnlineStatus: true,
          },
        },
      },
    });
    console.log(`✅ Demo user created: ${user.email} (password: Demo123!)`);
  } else {
    console.log('ℹ️ Demo user already exists');
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
