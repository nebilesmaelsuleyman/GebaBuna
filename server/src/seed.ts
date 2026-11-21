import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { User } from './models/User';
import { FarmerProfile } from './models/FarmerProfile';
import { BuyerProfile } from './models/BuyerProfile';
import { MarketPrice } from './models/MarketPrice';
import { Listing } from './models/Listing';
import { Offer } from './models/Offer';
import { Trade } from './models/Trade';
import { Review } from './models/Review';
import { Notification } from './models/Notification';
import { VerificationLog } from './models/VerificationLog';
import { refreshFarmerRanks, refreshBuyerRanks } from './services/scoringService';

async function seed() {
  console.log('🌱 [Seed] Starting Buna Fair Price database seed...');
  await connectDB();

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    FarmerProfile.deleteMany({}),
    BuyerProfile.deleteMany({}),
    MarketPrice.deleteMany({}),
    Listing.deleteMany({}),
    Offer.deleteMany({}),
    Trade.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
    VerificationLog.deleteMany({}),
  ]);

  console.log('🧹 Cleaned existing database collections.');

  const defaultPassword = await bcrypt.hash('buna123456', 10);
  const farmerPassword = await bcrypt.hash('farmer123456', 10);
  const buyerPassword = await bcrypt.hash('buyer123456', 10);
  const adminPassword = await bcrypt.hash('admin123456', 10);

  // 1. Seed Market Prices (ECX Benchmarks - Sample Data)
  console.log('📊 Seeding ECX reference market prices (clearly labeled sample data)...');
  const marketPriceDocs = await MarketPrice.insertMany([
    {
      coffeeType: 'Jimma Washed Specialty',
      processing: 'washed',
      grade: 'Specialty',
      currentPricePerKgETB: 450,
      floorPricePerKgETB: 430,
      ceilingPricePerKgETB: 480,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 410 },
        { date: new Date(Date.now() - 20 * 86400000), pricePerKgETB: 425 },
        { date: new Date(Date.now() - 10 * 86400000), pricePerKgETB: 440 },
        { date: new Date(), pricePerKgETB: 450 },
      ],
    },
    {
      coffeeType: 'Jimma Washed Grade 1',
      processing: 'washed',
      grade: 'Grade 1',
      currentPricePerKgETB: 410,
      floorPricePerKgETB: 390,
      ceilingPricePerKgETB: 435,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 375 },
        { date: new Date(Date.now() - 20 * 86400000), pricePerKgETB: 390 },
        { date: new Date(Date.now() - 10 * 86400000), pricePerKgETB: 400 },
        { date: new Date(), pricePerKgETB: 410 },
      ],
    },
    {
      coffeeType: 'Jimma Washed Grade 2',
      processing: 'washed',
      grade: 'Grade 2',
      currentPricePerKgETB: 370,
      floorPricePerKgETB: 350,
      ceilingPricePerKgETB: 390,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 340 },
        { date: new Date(Date.now() - 20 * 86400000), pricePerKgETB: 355 },
        { date: new Date(Date.now() - 10 * 86400000), pricePerKgETB: 365 },
        { date: new Date(), pricePerKgETB: 370 },
      ],
    },
    {
      coffeeType: 'Jimma Washed Grade 3',
      processing: 'washed',
      grade: 'Grade 3',
      currentPricePerKgETB: 320,
      floorPricePerKgETB: 300,
      ceilingPricePerKgETB: 340,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 295 },
        { date: new Date(Date.now() - 20 * 86400000), pricePerKgETB: 305 },
        { date: new Date(Date.now() - 10 * 86400000), pricePerKgETB: 315 },
        { date: new Date(), pricePerKgETB: 320 },
      ],
    },
    {
      coffeeType: 'Jimma Washed Grade 4',
      processing: 'washed',
      grade: 'Grade 4',
      currentPricePerKgETB: 280,
      floorPricePerKgETB: 260,
      ceilingPricePerKgETB: 300,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 260 },
        { date: new Date(Date.now() - 15 * 86400000), pricePerKgETB: 270 },
        { date: new Date(), pricePerKgETB: 280 },
      ],
    },
    {
      coffeeType: 'Jimma Washed Grade 5',
      processing: 'washed',
      grade: 'Grade 5',
      currentPricePerKgETB: 240,
      floorPricePerKgETB: 220,
      ceilingPricePerKgETB: 260,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 225 },
        { date: new Date(), pricePerKgETB: 240 },
      ],
    },
    {
      coffeeType: 'Jimma Natural Specialty',
      processing: 'natural',
      grade: 'Specialty',
      currentPricePerKgETB: 420,
      floorPricePerKgETB: 400,
      ceilingPricePerKgETB: 450,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 385 },
        { date: new Date(Date.now() - 20 * 86400000), pricePerKgETB: 400 },
        { date: new Date(Date.now() - 10 * 86400000), pricePerKgETB: 410 },
        { date: new Date(), pricePerKgETB: 420 },
      ],
    },
    {
      coffeeType: 'Jimma Natural Grade 1',
      processing: 'natural',
      grade: 'Grade 1',
      currentPricePerKgETB: 380,
      floorPricePerKgETB: 360,
      ceilingPricePerKgETB: 400,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 350 },
        { date: new Date(Date.now() - 20 * 86400000), pricePerKgETB: 365 },
        { date: new Date(Date.now() - 10 * 86400000), pricePerKgETB: 375 },
        { date: new Date(), pricePerKgETB: 380 },
      ],
    },
    {
      coffeeType: 'Jimma Natural Grade 2',
      processing: 'natural',
      grade: 'Grade 2',
      currentPricePerKgETB: 340,
      floorPricePerKgETB: 320,
      ceilingPricePerKgETB: 360,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 310 },
        { date: new Date(Date.now() - 20 * 86400000), pricePerKgETB: 325 },
        { date: new Date(Date.now() - 10 * 86400000), pricePerKgETB: 335 },
        { date: new Date(), pricePerKgETB: 340 },
      ],
    },
    {
      coffeeType: 'Jimma Natural Grade 3',
      processing: 'natural',
      grade: 'Grade 3',
      currentPricePerKgETB: 295,
      floorPricePerKgETB: 275,
      ceilingPricePerKgETB: 315,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 270 },
        { date: new Date(Date.now() - 15 * 86400000), pricePerKgETB: 285 },
        { date: new Date(), pricePerKgETB: 295 },
      ],
    },
    {
      coffeeType: 'Jimma Natural Grade 4',
      processing: 'natural',
      grade: 'Grade 4',
      currentPricePerKgETB: 255,
      floorPricePerKgETB: 235,
      ceilingPricePerKgETB: 275,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 240 },
        { date: new Date(), pricePerKgETB: 255 },
      ],
    },
    {
      coffeeType: 'Jimma Natural Grade 5',
      processing: 'natural',
      grade: 'Grade 5',
      currentPricePerKgETB: 220,
      floorPricePerKgETB: 200,
      ceilingPricePerKgETB: 240,
      source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
      history: [
        { date: new Date(Date.now() - 30 * 86400000), pricePerKgETB: 210 },
        { date: new Date(), pricePerKgETB: 220 },
      ],
    },
  ]);

  // 2. Seed Admin User
  console.log('👤 Seeding Regional Agriculture Bureau Admin...');
  const adminUser = await User.create({
    fullName: 'Dr. Getachew Zeleke (Jimma Agri Bureau)',
    email: 'admin@jimma-agri.gov.et',
    phone: '+251917000000',
    passwordHash: adminPassword,
    role: 'admin',
    preferredLanguage: 'om',
    avatar: '',
  });

  // 3. Seed 6 Farmers (Jimma Kebeles: Mana, Gomma, Agaro, Limmu Kossa, Gera, Shebe)
  console.log('🌾 Seeding 6 Jimma Farmers...');
  const farmersRaw = [
    {
      fullName: 'Gemechu Daba',
      email: 'gemechu@buna.et',
      phone: '+251917112233',
      woreda: 'Mana',
      kebele: 'Kenteri',
      farmSize: 3.2,
      trees: 3800,
      varieties: ['Jimma Heirloom', '74110'],
      certifications: ['Organic Certified', 'Rainforest Alliance'],
      coop: 'Mana Farmers Primary Cooperative',
      lang: 'om',
      bio: 'Cultivating wild shade-grown Arabica in Kenteri hills for 24 years.',
      qualityScore: 94,
    },
    {
      fullName: 'Chaltu Tolosa',
      email: 'chaltu@buna.et',
      phone: '+251917223344',
      woreda: 'Gomma',
      kebele: 'Beshasha',
      farmSize: 2.8,
      trees: 3200,
      varieties: ['74112', 'Beshaka Local'],
      certifications: ['Fairtrade Certified'],
      coop: 'Gomma Union Alliance',
      lang: 'om',
      bio: 'Pioneer of raised-bed sun drying and selective red-cherry picking.',
      qualityScore: 91,
    },
    {
      fullName: 'Worku Bekele',
      email: 'worku@buna.et',
      phone: '+251917334455',
      woreda: 'Agaro',
      kebele: 'Toba',
      farmSize: 4.5,
      trees: 5100,
      varieties: ['Jimma Heirloom', '74110', 'Buna Kurume'],
      certifications: ['Organic Certified'],
      coop: 'Kata Muduga Union Affiliate',
      lang: 'am',
      bio: 'Family heritage farm at 2,050m altitude producing sweet floral washed coffees.',
      qualityScore: 89,
    },
    {
      fullName: 'Almaz Mengistu',
      email: 'almaz@buna.et',
      phone: '+251917445566',
      woreda: 'Limmu Kossa',
      kebele: 'Babu',
      farmSize: 2.1,
      trees: 2500,
      varieties: ['Limmu Heirloom', '74112'],
      certifications: ['Organic Certified'],
      coop: 'Limmu Coffee Union',
      lang: 'om',
      bio: 'Specialist in washed Limmu coffee with balanced citric acidity.',
      qualityScore: 87,
    },
    {
      fullName: 'Feyisa Desta',
      email: 'feyisa@buna.et',
      phone: '+251917556677',
      woreda: 'Gera',
      kebele: 'Choche',
      farmSize: 3.8,
      trees: 4200,
      varieties: ['Gera Forest Wild Arabica'],
      certifications: ['Bird Friendly Forest Coffee'],
      coop: 'Gera Agroforestry Cooperative',
      lang: 'om',
      bio: 'Harvesting from native semi-forest coffee canopy near the Choche historical reserve.',
      qualityScore: 86,
    },
    {
      fullName: 'Dawit Kebede',
      email: 'dawit@buna.et',
      phone: '+251917667788',
      woreda: 'Shebe',
      kebele: 'Seka',
      farmSize: 2.0,
      trees: 2200,
      varieties: ['Jimma Heirloom'],
      certifications: ['Traditional Organic'],
      coop: 'Shebe Local Farmers Association',
      lang: 'am',
      bio: 'Dedicated young farmer introducing micro-lot sorting and eco-pulpers.',
      qualityScore: 83,
    },
  ];

  const farmerUsers: any[] = [];
  const farmerProfiles: any[] = [];

  for (const f of farmersRaw) {
    const user = await User.create({
      fullName: f.fullName,
      email: f.email,
      phone: f.phone,
      passwordHash: farmerPassword,
      role: 'farmer',
      preferredLanguage: f.lang as any,
      avatar: '',
    });
    farmerUsers.push(user);

    const profile = await FarmerProfile.create({
      user: user._id,
      fullName: f.fullName,
      phone: f.phone,
      email: f.email,
      region: 'Oromia',
      zone: 'Jimma',
      woreda: f.woreda,
      kebele: f.kebele,
      farmSizeHectares: f.farmSize,
      numberOfTrees: f.trees,
      coffeeVarieties: f.varieties,
      processingMethods: ['natural', 'washed'],
      certifications: f.certifications,
      cooperativeMembership: f.coop,
      preferredLanguage: f.lang as any,
      shortBio: f.bio,
      averageQualityScore: f.qualityScore,
      qualityRank: 1,
      totalKgSold: 0,
      numberCompletedTrades: 0,
      averageRatingFromBuyers: 4.9,
    });
    farmerProfiles.push(profile);
  }

  // 4. Seed 5 Buyers (3 verified, 1 pending, 1 rejected)
  console.log('🏢 Seeding 5 Buyers (3 Verified, 1 Pending, 1 Rejected)...');
  const buyersRaw = [
    {
      companyName: 'Oromia Coffee Farmers Cooperative Union (OCFCU)',
      ownerName: 'Dejene Dadi',
      email: 'dejene@oromia-union.com',
      phone: '+251911100001',
      businessType: 'cooperative_union',
      tradeLicense: 'ET-OR-UNION-2018-0044',
      exportLicense: 'EXP-MO-0012',
      tin: '0011223344',
      years: 25,
      status: 'verified',
      fairnessScore: 96,
      checklist: { validTradeLicense: true, validExportLicense: true, tinValid: true, noPastViolations: true },
      notes: 'Premier Ethiopian cooperative union. Consistently pays premium above ECX rates.',
    },
    {
      companyName: 'Jimma Highland Specialty Exporters PLC',
      ownerName: 'Sara Haile',
      email: 'sara@jimmaspecialty.com',
      phone: '+251911100002',
      businessType: 'exporter',
      tradeLicense: 'ET-JIM-EXP-2021-8899',
      exportLicense: 'EXP-MO-0487',
      tin: '0044556677',
      years: 8,
      status: 'verified',
      fairnessScore: 92,
      checklist: { validTradeLicense: true, validExportLicense: true, tinValid: true, noPastViolations: true },
      notes: 'Direct trade exporter supplying specialty roasters in Europe and Japan.',
    },
    {
      companyName: 'Kaffa Heritage Roasters & Exporters',
      ownerName: 'Michael Tadesse',
      email: 'michael@kaffaheritage.com',
      phone: '+251911100003',
      businessType: 'roaster',
      tradeLicense: 'ET-ADD-ROAST-2022-3321',
      exportLicense: 'EXP-MO-0912',
      tin: '0077889900',
      years: 6,
      status: 'verified',
      fairnessScore: 89,
      checklist: { validTradeLicense: true, validExportLicense: true, tinValid: true, noPastViolations: true },
      notes: 'Verified domestic specialty roaster and origin exporter.',
    },
    {
      companyName: 'Abba Jifar Commercial Trading PLC',
      ownerName: 'Kedir Abamecha',
      email: 'kedir@abbajifar.com',
      phone: '+251911100004',
      businessType: 'local_trader',
      tradeLicense: 'ET-JIM-LOC-2024-9011',
      tin: '0099887766',
      years: 2,
      status: 'pending',
      fairnessScore: 80,
      checklist: { validTradeLicense: true, validExportLicense: false, tinValid: false, noPastViolations: true },
      notes: 'New applicant awaiting regional bureau physical inspection and TIN validation.',
    },
    {
      companyName: 'Red Sea Commodity Middlemen & Brokers',
      ownerName: 'Tesfaye Negash',
      email: 'tesfaye@redseacommodity.com',
      phone: '+251911100005',
      businessType: 'local_trader',
      tradeLicense: 'ET-DISPUTED-2023-0001',
      tin: '0033221100',
      years: 4,
      status: 'rejected',
      fairnessScore: 42, // Flagged buyer (< 50)
      checklist: { validTradeLicense: false, validExportLicense: false, tinValid: false, noPastViolations: false },
      notes: 'Rejected by Agriculture Bureau due to repeated underpayment complaints and expired municipal license.',
    },
  ];

  const buyerUsers: any[] = [];
  const buyerProfiles: any[] = [];

  for (const b of buyersRaw) {
    const user = await User.create({
      fullName: b.ownerName,
      email: b.email,
      phone: b.phone,
      passwordHash: buyerPassword,
      role: 'buyer',
      preferredLanguage: 'en',
      avatar: '',
    });
    buyerUsers.push(user);

    const profile = await BuyerProfile.create({
      user: user._id,
      companyName: b.companyName,
      ownerName: b.ownerName,
      email: b.email,
      phone: b.phone,
      businessType: b.businessType as any,
      region: 'Oromia',
      zone: 'Jimma',
      address: 'Commercial Center, Jimma, Ethiopia',
      tradeLicenseNumber: b.tradeLicense,
      exportLicenseNumber: b.exportLicense,
      tinNumber: b.tin,
      yearsInBusiness: b.years,
      verificationStatus: b.status as any,
      verificationChecklist: b.checklist,
      reviewedBy: b.status !== 'pending' ? adminUser._id : undefined,
      reviewedAt: b.status !== 'pending' ? new Date() : undefined,
      adminNotes: b.notes,
      fairnessScore: b.fairnessScore,
      fairnessRank: 1,
      totalKgBought: 0,
      numberCompletedTrades: 0,
      averageRatingFromFarmers: b.status === 'rejected' ? 2.3 : 4.8,
      uploadedDocuments: [
        {
          title: `${b.companyName} Commercial Registration`,
          fileUrl: '/uploads/sample_trade_license.pdf',
          docType: 'trade_license',
          uploadedAt: new Date(Date.now() - 10 * 86400000),
        },
        {
          title: 'TIN Tax Clearance Certificate',
          fileUrl: '/uploads/sample_tin_certificate.pdf',
          docType: 'tin_certificate',
          uploadedAt: new Date(Date.now() - 10 * 86400000),
        },
      ],
    });
    buyerProfiles.push(profile);

    // If verified or rejected, log verification action
    if (b.status !== 'pending') {
      await VerificationLog.create({
        buyer: profile._id,
        reviewedBy: adminUser._id,
        action: b.status === 'verified' ? 'approved' : 'rejected',
        checklistSnapshot: b.checklist,
        notes: b.notes,
        reason: b.status === 'rejected' ? 'Expired municipal trade license and predatory pricing history.' : '',
        reviewedAt: new Date(Date.now() - 5 * 86400000),
      });
    }
  }

  // 5. Seed 15 Coffee Listings (Jimma, Washed & Natural, G1 - G5, web and telegram)
  console.log('☕ Seeding 15 Coffee Listings with market reference prices...');
  const sampleCoffeePhotos = [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop&q=80',
  ];

  const listingsData = [
    {
      farmerIdx: 0, // Gemechu (Mana)
      coffeeType: 'Mana Kenteri Highland Washed G1',
      processing: 'washed',
      grade: 'Grade 1',
      quantityKg: 2500,
      askingPrice: 420, // ref 410 -> Fair
      woreda: 'Mana',
      kebele: 'Kenteri',
      moisture: 11.2,
      source: 'web',
      desc: 'Selected red ripe cherries grown under acacia shade trees. Fermented for 36 hours in spring water and sun-dried on African raised beds.',
      aiEstimatedGrade: 'Grade 1',
      aiConfidence: 'High (94%)',
      aiDefectsSummary: 'Low defect count (< 3%). Color uniform dark jade green.',
    },
    {
      farmerIdx: 0, // Gemechu (Mana)
      coffeeType: 'Mana Heirloom Natural Sun-Dried G1',
      processing: 'natural',
      grade: 'Grade 1',
      quantityKg: 1800,
      askingPrice: 385, // ref 380 -> Fair
      woreda: 'Mana',
      kebele: 'Kenteri',
      moisture: 11.6,
      source: 'telegram',
      desc: 'Intense berry aromas and dried apricot sweetness. Graded using BunaJimma AI vision camera.',
      aiEstimatedGrade: 'Grade 1',
      aiConfidence: 'High (91%)',
      aiDefectsSummary: 'Zero black beans detected, uniformity 9.4/10.',
    },
    {
      farmerIdx: 1, // Chaltu (Gomma)
      coffeeType: 'Gomma Beshasha Washed Specialty Lot',
      processing: 'washed',
      grade: 'Specialty',
      quantityKg: 1200,
      askingPrice: 460, // ref 450 -> Fair
      woreda: 'Gomma',
      kebele: 'Beshasha',
      moisture: 10.9,
      source: 'web',
      desc: 'Cup score 88.5 with jasmine floral notes, peach nectar, and lingering honey finish.',
      aiEstimatedGrade: 'Specialty',
      aiConfidence: 'High (96%)',
      aiDefectsSummary: 'Pristine bean density, zero primary defects.',
    },
    {
      farmerIdx: 1, // Chaltu (Gomma)
      coffeeType: 'Beshasha Sun-Dried Natural Grade 2',
      processing: 'natural',
      grade: 'Grade 2',
      quantityKg: 3000,
      askingPrice: 345, // ref 340 -> Fair
      woreda: 'Gomma',
      kebele: 'Beshasha',
      moisture: 11.8,
      source: 'web',
      desc: 'Ripe whole cherry dried on raised beds for 21 days with constant turning.',
    },
    {
      farmerIdx: 2, // Worku (Agaro)
      coffeeType: 'Agaro Toba Washed Micro-Lot Grade 1',
      processing: 'washed',
      grade: 'Grade 1',
      quantityKg: 3500,
      askingPrice: 415, // ref 410 -> Fair
      woreda: 'Agaro',
      kebele: 'Toba',
      moisture: 11.0,
      source: 'web',
      desc: 'High-elevation Agaro micro-lot washed with eco-pulpers and cold spring water.',
      aiEstimatedGrade: 'Grade 1',
      aiConfidence: 'High (92%)',
      aiDefectsSummary: 'Consistent bean sizing, screened at 16+.',
    },
    {
      farmerIdx: 2, // Worku (Agaro)
      coffeeType: 'Agaro Mountain Natural Grade 3',
      processing: 'natural',
      grade: 'Grade 3',
      quantityKg: 4000,
      askingPrice: 300, // ref 295 -> Fair
      woreda: 'Agaro',
      kebele: 'Toba',
      moisture: 12.0,
      source: 'telegram',
      desc: 'Rich body natural, notes of dark chocolate and plum.',
    },
    {
      farmerIdx: 3, // Almaz (Limmu Kossa)
      coffeeType: 'Limmu Kossa Organic Washed Grade 2',
      processing: 'washed',
      grade: 'Grade 2',
      quantityKg: 2800,
      askingPrice: 375, // ref 370 -> Fair
      woreda: 'Limmu Kossa',
      kebele: 'Babu',
      moisture: 11.4,
      source: 'web',
      desc: 'Classic Limmu profile: bright lemon tea acidity, bergamot, and sweet sugar cane.',
    },
    {
      farmerIdx: 3, // Almaz (Limmu Kossa)
      coffeeType: 'Limmu Babu Forest Natural Grade 2',
      processing: 'natural',
      grade: 'Grade 2',
      quantityKg: 2200,
      askingPrice: 340, // ref 340 -> Fair
      woreda: 'Limmu Kossa',
      kebele: 'Babu',
      moisture: 11.5,
      source: 'web',
      desc: 'Grown in certified organic agroforestry plots.',
    },
    {
      farmerIdx: 4, // Feyisa (Gera)
      coffeeType: 'Gera Forest Wild Arabica Specialty',
      processing: 'washed',
      grade: 'Specialty',
      quantityKg: 1500,
      askingPrice: 470, // ref 450 -> Fair
      woreda: 'Gera',
      kebele: 'Choche',
      moisture: 10.8,
      source: 'web',
      desc: 'Genuine wild forest Arabica collected from indigenous ancient mother trees.',
      aiEstimatedGrade: 'Specialty',
      aiConfidence: 'High (95%)',
      aiDefectsSummary: 'Exceptional uniformity, distinct elongation characteristic of wild heirloom.',
    },
    {
      farmerIdx: 4, // Feyisa (Gera)
      coffeeType: 'Choche Historical Reserve Natural G1',
      processing: 'natural',
      grade: 'Grade 1',
      quantityKg: 2000,
      askingPrice: 385, // ref 380 -> Fair
      woreda: 'Gera',
      kebele: 'Choche',
      moisture: 11.3,
      source: 'telegram',
      desc: 'Harvested from the birthplace zone of Ethiopian coffee history.',
    },
    {
      farmerIdx: 5, // Dawit (Shebe)
      coffeeType: 'Shebe Seka Valley Washed Grade 3',
      processing: 'washed',
      grade: 'Grade 3',
      quantityKg: 3200,
      askingPrice: 325, // ref 320 -> Fair
      woreda: 'Shebe',
      kebele: 'Seka',
      moisture: 11.7,
      source: 'web',
      desc: 'Solid commercial washed coffee from rich volcanic soil.',
    },
    {
      farmerIdx: 5, // Dawit (Shebe)
      coffeeType: 'Shebe Low-Priced Predatory Comparison Lot',
      processing: 'natural',
      grade: 'Grade 4',
      quantityKg: 1500,
      askingPrice: 180, // ref 255 -> VERY LOW (Illustrates problem: farmer underselling)
      woreda: 'Shebe',
      kebele: 'Seka',
      moisture: 12.8,
      source: 'web',
      desc: 'Local trader offered 170 ETB. Listed here to illustrate the low-price predatory warning badge.',
    },
    {
      farmerIdx: 0, // Gemechu (Mana)
      coffeeType: 'Mana Doyo Washed Grade 2',
      processing: 'washed',
      grade: 'Grade 2',
      quantityKg: 1900,
      askingPrice: 370,
      woreda: 'Mana',
      kebele: 'Doyo',
      moisture: 11.1,
      source: 'web',
      desc: 'Crisp apple acidity and caramel sweetness.',
    },
    {
      farmerIdx: 1, // Chaltu (Gomma)
      coffeeType: 'Gomma Kilole Natural Grade 4',
      processing: 'natural',
      grade: 'Grade 4',
      quantityKg: 2500,
      askingPrice: 255,
      woreda: 'Gomma',
      kebele: 'Kilole',
      moisture: 12.2,
      source: 'telegram',
      desc: 'Good everyday commercial blend natural.',
    },
    {
      farmerIdx: 2, // Worku (Agaro)
      coffeeType: 'Agaro Gembe Washed Grade 4',
      processing: 'washed',
      grade: 'Grade 4',
      quantityKg: 3100,
      askingPrice: 280,
      woreda: 'Agaro',
      kebele: 'Gembe',
      moisture: 11.9,
      source: 'web',
      desc: 'Well-processed Grade 4 washed coffee.',
    },
  ];

  const createdListings: any[] = [];

  for (const item of listingsData) {
    const farmer = farmerUsers[item.farmerIdx];
    const farmerProfile = farmerProfiles[item.farmerIdx];

    // Find reference price
    const mPrice = marketPriceDocs.find(
      (m) => m.processing === item.processing && m.grade === item.grade
    );
    const ref = mPrice ? mPrice.currentPricePerKgETB : 320;
    const diff = item.askingPrice - ref;
    const ratio = (item.askingPrice / ref) * 100;
    const status = ratio < 75 ? 'very_low' : ratio < 90 ? 'low' : 'fair';

    const listing = await Listing.create({
      farmer: farmer._id,
      farmerProfile: farmerProfile._id,
      coffeeType: item.coffeeType,
      processing: item.processing,
      grade: item.grade,
      quantityKg: item.quantityKg,
      askingPricePerKg: item.askingPrice,
      harvestDate: 'November 2024 / Tahsas 2017',
      location: {
        region: 'Oromia',
        zone: 'Jimma',
        woreda: item.woreda,
        kebele: item.kebele,
      },
      photos: [
        sampleCoffeePhotos[createdListings.length % sampleCoffeePhotos.length],
        sampleCoffeePhotos[(createdListings.length + 1) % sampleCoffeePhotos.length],
      ],
      description: item.desc,
      source: item.source,
      status: 'open',
      moisturePercentage: item.moisture,
      aiEstimatedGrade: item.aiEstimatedGrade || '',
      aiConfidence: item.aiConfidence || '',
      aiDefectsSummary: item.aiDefectsSummary || '',
      marketReferencePrice: ref,
      priceFairnessDiff: diff,
      priceFairnessStatus: status,
    });
    createdListings.push(listing);
  }

  // 6. Seed 6 Completed Trades with Bilateral Report Cards and Ratings
  console.log('🤝 Seeding 6 Completed Trades with Report Cards...');
  const tradeSpecs = [
    {
      listingIdx: 0,
      buyerIdx: 0, // OCFCU (verified)
      price: 430,  // Paid 430 on 410 ref -> 105% fairness!
      qty: 2500,
      farmerRating: 5,
      buyerRating: 5,
      qualityPromised: 'Grade 1',
      qualityDelivered: 'Grade 1',
      qualityMatch: 100,
      farmerComment: 'OCFCU paid 20 ETB/kg above the ECX floor and transferred money within 24 hours. Very fair partner!',
      buyerComment: 'Gemechu provided top-tier Grade 1 Mana washed cherries. Perfect 11.2% moisture, spotless parchment.',
    },
    {
      listingIdx: 2,
      buyerIdx: 1, // Jimma Highland Specialty (verified)
      price: 465,  // Paid 465 on 450 ref -> 103% fairness
      qty: 1200,
      farmerRating: 5,
      buyerRating: 5,
      qualityPromised: 'Specialty',
      qualityDelivered: 'Specialty',
      qualityMatch: 100,
      farmerComment: 'Sara from Jimma Specialty treats farmers with dignity. Direct contract and prompt payment.',
      buyerComment: 'Chaltu’s Beshasha lot cupped at 89 points in our lab. Exceptional floral complexity.',
    },
    {
      listingIdx: 4,
      buyerIdx: 0, // OCFCU (verified)
      price: 420,  // Paid 420 on 410 ref -> 102% fairness
      qty: 3500,
      farmerRating: 5,
      buyerRating: 5,
      qualityPromised: 'Grade 1',
      qualityDelivered: 'Grade 1',
      qualityMatch: 100,
      farmerComment: 'Transparent scales, immediate weigh-in slip, and zero arbitrary deductions.',
      buyerComment: 'Worku delivered uniform bean size. Certified organic paperwork was in perfect order.',
    },
    {
      listingIdx: 6,
      buyerIdx: 2, // Kaffa Heritage Roasters (verified)
      price: 375,  // Paid 375 on 370 ref -> 101% fairness
      qty: 2800,
      farmerRating: 5,
      buyerRating: 4,
      qualityPromised: 'Grade 2',
      qualityDelivered: 'Grade 2',
      qualityMatch: 100,
      farmerComment: 'Kaffa Heritage paid full benchmark rate without delaying payment.',
      buyerComment: 'Great Limmu profile. Slightly delayed delivery by 1 day due to rain, but quality was solid.',
    },
    {
      listingIdx: 8,
      buyerIdx: 1, // Jimma Highland Specialty (verified)
      price: 475,  // Paid 475 on 450 ref -> 105% fairness
      qty: 1500,
      farmerRating: 5,
      buyerRating: 5,
      qualityPromised: 'Specialty',
      qualityDelivered: 'Specialty',
      qualityMatch: 100,
      farmerComment: 'Highland Specialty appreciated our wild forest canopy coffee and rewarded our conservation efforts.',
      buyerComment: 'Gera wild Arabica is world-class. Defect rate lower than 2%.',
    },
    {
      listingIdx: 10,
      buyerIdx: 2, // Kaffa Heritage Roasters (verified)
      price: 325,  // Paid 325 on 320 ref -> 101% fairness
      qty: 3200,
      farmerRating: 4,
      buyerRating: 4,
      qualityPromised: 'Grade 3',
      qualityDelivered: 'Grade 3',
      qualityMatch: 100,
      farmerComment: 'Good fair transaction at standard price.',
      buyerComment: 'Good commercial Grade 3. Bags well-stitched and ready for domestic roasting.',
    },
  ];

  for (let i = 0; i < tradeSpecs.length; i++) {
    const spec = tradeSpecs[i];
    const listing = createdListings[spec.listingIdx];
    const buyer = buyerUsers[spec.buyerIdx];
    const buyerProfile = buyerProfiles[spec.buyerIdx];
    const farmer = listing.farmer;

    // Create accepted Offer
    const offer = await Offer.create({
      listing: listing._id,
      farmer,
      buyer: buyer._id,
      buyerProfile: buyerProfile._id,
      offeredPricePerKg: spec.price,
      quantityKg: spec.qty,
      totalPriceETB: spec.price * spec.qty,
      message: 'Official verified fair purchase offer per Jimma ECX reference guidelines.',
      deliveryTerms: 'buyer_pickup',
      status: 'accepted',
      marketPriceAtOffer: listing.marketReferencePrice,
      priceFairnessDiff: spec.price - listing.marketReferencePrice,
      fairnessPercentage: Math.round((spec.price / listing.marketReferencePrice) * 100),
      fairnessStatus: 'fair',
    });

    // Create completed Trade
    const trade = await Trade.create({
      listing: listing._id,
      offer: offer._id,
      farmer,
      buyer: buyer._id,
      agreedPricePerKg: spec.price,
      agreedQuantityKg: spec.qty,
      totalAmountETB: spec.price * spec.qty,
      marketReferencePrice: listing.marketReferencePrice,
      deliveryTerms: 'buyer_pickup',
      status: 'completed',
      deliveryConfirmedByFarmer: true,
      deliveryConfirmedByBuyer: true,
      deliveryConfirmedAt: new Date(Date.now() - (7 - i) * 86400000),
      paymentConfirmedByFarmer: true,
      paymentConfirmedByBuyer: true,
      paymentConfirmedAt: new Date(Date.now() - (7 - i) * 86400000),
      paymentMethod: 'bank_transfer_cbe',
      reviewSubmittedByFarmer: true,
      reviewSubmittedByBuyer: true,
      completedAt: new Date(Date.now() - (7 - i) * 86400000),
      reportCard: {
        priceFairnessGrade: (() => {
          const ratio = spec.price / listing.marketReferencePrice;
          if (ratio >= 1.05) return 'A+';
          if (ratio >= 1.0) return 'A';
          if (ratio >= 0.95) return 'B';
          if (ratio >= 0.90) return 'C';
          return 'F';
        })(),
        premiumOverFloorETB: spec.price - listing.marketReferencePrice,
        paymentTimelinessScore: spec.buyerRating * 20,
        notes: spec.farmerComment,
      },
    });

    // Mark listing as sold
    listing.status = 'sold';
    await listing.save();

    // 1. Review: Farmer reviewing Buyer (Fairness Report Card)
    await Review.create({
      trade: trade._id,
      reviewer: farmer,
      reviewee: buyer._id,
      reviewerRole: 'farmer',
      rating: spec.farmerRating,
      comment: spec.farmerComment,
      pricePaidPerKg: spec.price,
      marketPriceBenchmark: listing.marketReferencePrice,
      fairnessRatio: Math.round((spec.price / listing.marketReferencePrice) * 1000) / 10,
      fairnessMatchScore: 100,
      paidOnTime: true,
    });

    // 2. Review: Buyer reviewing Farmer (Quality Report Card)
    await Review.create({
      trade: trade._id,
      reviewer: buyer._id,
      reviewee: farmer,
      reviewerRole: 'buyer',
      rating: spec.buyerRating,
      comment: spec.buyerComment,
      gradePromised: spec.qualityPromised,
      gradeDelivered: spec.qualityDelivered,
      qualityMatchScore: spec.qualityMatch,
      moistureNotes: 'Optimal moisture standard 11.0% - 11.5%',
      defectNotes: 'High grading consistency, clean lots',
      deliveredOnTime: true,
    });

    // Update cumulative volume stats
    await FarmerProfile.findOneAndUpdate(
      { user: farmer },
      {
        $inc: {
          totalKgSold: spec.qty,
          numberCompletedTrades: 1,
        },
      }
    );

    await BuyerProfile.findOneAndUpdate(
      { user: buyer._id },
      {
        $inc: {
          totalKgBought: spec.qty,
          numberCompletedTrades: 1,
        },
      }
    );
  }

  // 7. Seed pending active offers on open listings
  console.log('📨 Seeding active pending offers for demo...');
  // Buyer 0 (OCFCU) offers on Listing 1 (Gemechu's natural G1)
  await Offer.create({
    listing: createdListings[1]._id,
    farmer: createdListings[1].farmer,
    buyer: buyerUsers[0]._id,
    buyerProfile: buyerProfiles[0]._id,
    offeredPricePerKg: 390, // Ref is 380 -> +10 Fair!
    quantityKg: 1000,
    totalPriceETB: 390000,
    message: 'Greetings Gemechu! We are interested in 1,000 kg of your sun-dried natural lot. Can pick up this Friday from Kenteri.',
    deliveryTerms: 'buyer_pickup',
    status: 'pending',
    marketPriceAtOffer: 380,
    priceFairnessDiff: 10,
    fairnessPercentage: 102.6,
    fairnessStatus: 'fair',
  });

  // Buyer 1 (Jimma Specialty) offers on Listing 1
  await Offer.create({
    listing: createdListings[1]._id,
    farmer: createdListings[1].farmer,
    buyer: buyerUsers[1]._id,
    buyerProfile: buyerProfiles[1]._id,
    offeredPricePerKg: 385,
    quantityKg: 800,
    totalPriceETB: 308000,
    message: 'Highland Specialty would like 800 kg for export consignment to Frankfurt.',
    deliveryTerms: 'buyer_pickup',
    status: 'pending',
    marketPriceAtOffer: 380,
    priceFairnessDiff: 5,
    fairnessPercentage: 101.3,
    fairnessStatus: 'fair',
  });

  // 8. Seed Notifications for Farmer Gemechu
  await Notification.create({
    recipient: farmerUsers[0]._id,
    type: 'new_offer',
    title: 'New Fair Offer from OCFCU! 🌟',
    message: 'Oromia Coffee Farmers Union offered 390 ETB/kg for your Mana Natural G1 (+10 ETB above ECX reference).',
    link: '/farmer/offers',
    isRead: false,
  });

  await Notification.create({
    recipient: farmerUsers[0]._id,
    type: 'trade_completed',
    title: 'Trade Completed & Report Card Ready! 📜',
    message: 'Your trade of 2,500 kg Washed G1 is complete. Quality score updated to 94/100 (Rank #1 Gold).',
    link: '/trades',
    isRead: false,
  });

  // 9. Recompute Ranks and Finalize Leaderboard
  await refreshFarmerRanks();
  await refreshBuyerRanks();

  console.log('\n============================================================');
  console.log('✅ BUNA FAIR PRICE - DEMO DATABASE SEEDED SUCCESSFULLY');
  console.log('============================================================');
  console.log('👑 ADMIN CREDENTIALS (Agriculture Bureau):');
  console.log('   Email:    admin@jimma-agri.gov.et');
  console.log('   Password: admin123456');
  console.log('------------------------------------------------------------');
  console.log('🌾 FARMER CREDENTIALS (Jimma Farmers):');
  console.log('   1. Gemechu Daba (Mana, Rank #1 Gold):');
  console.log('      Phone:    0917112233  or  gemechu@buna.et');
  console.log('      Password: farmer123456');
  console.log('      SMS OTP Demo Code: 123456');
  console.log('   2. Chaltu Tolosa (Gomma, Rank #2 Silver):');
  console.log('      Phone:    0917223344  or  chaltu@buna.et');
  console.log('      Password: farmer123456');
  console.log('------------------------------------------------------------');
  console.log('🏢 BUYER CREDENTIALS:');
  console.log('   1. Oromia Union (VERIFIED - Fairness 96% "Fair Buyer"):');
  console.log('      Email:    dejene@oromia-union.com');
  console.log('      Password: buyer123456');
  console.log('   2. Jimma Specialty (VERIFIED - Fairness 92%):');
  console.log('      Email:    sara@jimmaspecialty.com');
  console.log('      Password: buyer123456');
  console.log('   3. Abba Jifar Trading (PENDING VERIFICATION - Waiting in Admin Queue):');
  console.log('      Email:    kedir@abbajifar.com');
  console.log('      Password: buyer123456');
  console.log('   4. Red Sea Middlemen (REJECTED & FLAGGED - Fairness 42%):');
  console.log('      Email:    tesfaye@redseacommodity.com');
  console.log('      Password: buyer123456');
  console.log('============================================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ [Seed Error]:', err);
  process.exit(1);
});
