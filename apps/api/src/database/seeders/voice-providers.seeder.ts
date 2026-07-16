import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedVoiceProviders() {
  console.log('Seeding voice providers...');

  const kokoroProvider = await prisma.voiceProvider.upsert({
    where: { name: 'Kokoro TTS' },
    update: {},
    create: {
      name: 'Kokoro TTS',
      type: 'KOKORO_TTS',
      apiEndpoint: null,
      isActive: true,
      metadata: {
        description: 'Open-source TTS provider with multi-language support',
        languages: ['en', 'hi', 'mr'],
        voices: ['male', 'female'],
      },
    },
  });

  console.log('Voice providers seeded successfully');
  return kokoroProvider;
}

async function main() {
  try {
    await seedVoiceProviders();
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding voice providers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
