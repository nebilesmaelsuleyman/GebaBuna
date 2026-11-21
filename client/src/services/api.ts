import {
  User,
  FarmerProfile,
  BuyerProfile,
  Listing,
  Offer,
  Trade,
  MarketPrice,
  AdminStats,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('buna_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err: any) {
      console.warn(`[API] fetch to ${endpoint} failed, checking fallback:`, err.message);
      throw err;
    }
  }

  // Auth
  async login(identifier: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  async otpLogin(phone: string, code: string): Promise<{ success: boolean; token: string; user: User; note?: string }> {
    return this.request('/auth/otp-login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  }

  async register(data: any): Promise<{ success: boolean; token: string; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<{ success: boolean; user: User; profile: FarmerProfile | BuyerProfile }> {
    return this.request('/auth/me');
  }

  // Market Prices
  async getMarketPrices(): Promise<{ success: boolean; data: MarketPrice[]; source: string }> {
    try {
      return await this.request('/market-prices');
    } catch {
      // Fallback ECX benchmark data
      return {
        success: true,
        source: 'ECX Daily Coffee Floor Benchmark (Jimma Terminal) - Sample Data',
        data: [
          {
            _id: 'mp1',
            coffeeType: 'Jimma Washed Specialty',
            processing: 'washed',
            grade: 'Specialty',
            currentPricePerKgETB: 450,
            floorPricePerKgETB: 430,
            ceilingPricePerKgETB: 480,
            source: 'ECX Jimma Terminal Benchmark',
            lastUpdated: new Date().toISOString(),
            history: [
              { date: '2026-10-15', pricePerKgETB: 410 },
              { date: '2026-10-25', pricePerKgETB: 425 },
              { date: '2026-11-05', pricePerKgETB: 440 },
              { date: '2026-11-16', pricePerKgETB: 450 },
            ],
          },
          {
            _id: 'mp2',
            coffeeType: 'Jimma Washed Grade 1',
            processing: 'washed',
            grade: 'Grade 1',
            currentPricePerKgETB: 410,
            floorPricePerKgETB: 390,
            ceilingPricePerKgETB: 435,
            source: 'ECX Jimma Terminal Benchmark',
            lastUpdated: new Date().toISOString(),
            history: [
              { date: '2026-10-15', pricePerKgETB: 375 },
              { date: '2026-10-25', pricePerKgETB: 390 },
              { date: '2026-11-05', pricePerKgETB: 400 },
              { date: '2026-11-16', pricePerKgETB: 410 },
            ],
          },
          {
            _id: 'mp3',
            coffeeType: 'Jimma Natural Grade 1',
            processing: 'natural',
            grade: 'Grade 1',
            currentPricePerKgETB: 385,
            floorPricePerKgETB: 365,
            ceilingPricePerKgETB: 410,
            source: 'ECX Jimma Terminal Benchmark',
            lastUpdated: new Date().toISOString(),
            history: [
              { date: '2026-10-15', pricePerKgETB: 350 },
              { date: '2026-10-25', pricePerKgETB: 365 },
              { date: '2026-11-05', pricePerKgETB: 375 },
              { date: '2026-11-16', pricePerKgETB: 385 },
            ],
          },
          {
            _id: 'mp4',
            coffeeType: 'Jimma Washed Grade 2',
            processing: 'washed',
            grade: 'Grade 2',
            currentPricePerKgETB: 370,
            floorPricePerKgETB: 350,
            ceilingPricePerKgETB: 390,
            source: 'ECX Jimma Terminal Benchmark',
            lastUpdated: new Date().toISOString(),
            history: [
              { date: '2026-10-15', pricePerKgETB: 340 },
              { date: '2026-10-25', pricePerKgETB: 355 },
              { date: '2026-11-05', pricePerKgETB: 365 },
              { date: '2026-11-16', pricePerKgETB: 370 },
            ],
          },
        ],
      };
    }
  }

  /**
   * Trigger the server to refresh ECX prices from the live internet.
   * Only accessible to admins.
   */
  async refreshMarketPrices(): Promise<{
    success: boolean;
    message: string;
    updated: number;
    sourceUsed: string;
    refreshedAt: string;
  }> {
    return this.request('/market-prices/refresh', { method: 'POST' });
  }

  async getPriceHistory(grade = 'Grade 1', processing = 'washed'): Promise<any> {
    try {
      return await this.request(`/market-prices/history?grade=${grade}&processing=${processing}`);
    } catch {
      return {
        success: true,
        coffeeType: `Jimma ${processing} ${grade}`,
        grade,
        processing,
        currentPrice: 410,
        history: [
          { date: '2026-10-16', pricePerKgETB: 380 },
          { date: '2026-10-23', pricePerKgETB: 388 },
          { date: '2026-10-30', pricePerKgETB: 395 },
          { date: '2026-11-06', pricePerKgETB: 402 },
          { date: '2026-11-13', pricePerKgETB: 410 },
        ],
      };
    }
  }

  // Listings
  async getListings(params: Record<string, string> = {}): Promise<{ success: boolean; data: Listing[]; count: number }> {
    const qs = new URLSearchParams(params).toString();
    try {
      return await this.request(`/listings?${qs}`);
    } catch {
      // Return sample listings
      return {
        success: true,
        count: 3,
        data: [
          {
            _id: 'list-1',
            farmer: { _id: 'u1', fullName: 'Gemechu Daba', phone: '+251917112233' },
            farmerProfile: { _id: 'fp1', averageQualityScore: 89, woreda: 'Mana', badge: 'Gold' },
            title: 'Highland Specialty Washed Lot - Mana Woreda',
            variety: 'Jimma Heirloom 74110',
            grade: 'Specialty',
            processing: 'washed',
            harvestYear: 2026,
            quantityKg: 2500,
            askingPricePerKg: 460,
            marketReferencePrice: 450,
            priceDiffPercentage: 2.2,
            isFairPrice: true,
            location: { region: 'Oromia', zone: 'Jimma', woreda: 'Mana', kebele: 'Kenteri' },
            cuppingScore: 88.5,
            moisturePercentage: 11.2,
            certifications: ['Organic Certified', 'Rainforest Alliance'],
            photos: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'],
            status: 'open',
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'list-2',
            farmer: { _id: 'u2', fullName: 'Chaltu Tolosa', phone: '+251917223344' },
            farmerProfile: { _id: 'fp2', averageQualityScore: 86, woreda: 'Gomma', badge: 'Silver' },
            title: 'Gomma Grade 1 Sun-Dried Natural Arabica',
            variety: 'Heirloom Selection 74112',
            grade: 'Grade 1',
            processing: 'natural',
            harvestYear: 2026,
            quantityKg: 1800,
            askingPricePerKg: 390,
            marketReferencePrice: 385,
            priceDiffPercentage: 1.3,
            isFairPrice: true,
            location: { region: 'Oromia', zone: 'Jimma', woreda: 'Gomma', kebele: 'Genji' },
            cuppingScore: 86.0,
            moisturePercentage: 11.5,
            certifications: ['Fairtrade'],
            photos: ['https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80'],
            status: 'open',
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'list-3',
            farmer: { _id: 'u3', fullName: 'Abdi Gemeda', phone: '+251917334455' },
            farmerProfile: { _id: 'fp3', averageQualityScore: 84, woreda: 'Limmu Kosa', badge: 'Bronze' },
            title: 'Limmu Washed Grade 2 Export Quality Lot',
            variety: 'Buna Jimmaa Traditional',
            grade: 'Grade 2',
            processing: 'washed',
            harvestYear: 2026,
            quantityKg: 4000,
            askingPricePerKg: 375,
            marketReferencePrice: 370,
            priceDiffPercentage: 1.4,
            isFairPrice: true,
            location: { region: 'Oromia', zone: 'Jimma', woreda: 'Limmu Kosa', kebele: 'Babu' },
            cuppingScore: 84.5,
            moisturePercentage: 11.8,
            certifications: ['ECX Registered'],
            photos: ['https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80'],
            status: 'open',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
  }

  async getListingById(id: string): Promise<{ success: boolean; data: Listing }> {
    return this.request(`/listings/${id}`);
  }

  async createListing(data: any): Promise<{ success: boolean; listing: Listing; fairnessWarning?: any }> {
    return this.request('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateListing(id: string, data: Record<string, unknown>): Promise<{ success: boolean; listing: Listing }> {
    return this.request(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteListing(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/listings/${id}`, { method: 'DELETE' });
  }

  async getMyListings(): Promise<{ success: boolean; listings: Listing[] }> {
    return this.request('/listings/my');
  }

  // Offers
  async getOffers(): Promise<{ success: boolean; data: Offer[] }> {
    try {
      return await this.request('/offers');
    } catch {
      return { success: true, data: [] };
    }
  }

  async createOffer(data: any): Promise<{ success: boolean; data: Offer }> {
    return this.request('/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getIncomingOffers(): Promise<{ success: boolean; offers: any[] }> {
    return this.request('/offers/incoming');
  }

  async getOutgoingOffers(): Promise<{ success: boolean; offers: any[] }> {
    return this.request('/offers/outgoing');
  }

  async acceptOffer(id: string): Promise<{ success: boolean; trade: any }> {
    return this.request(`/offers/${id}/accept`, { method: 'POST' });
  }

  async rejectOffer(id: string): Promise<{ success: boolean; offer: any }> {
    return this.request(`/offers/${id}/reject`, { method: 'POST' });
  }

  async counterOffer(
    id: string,
    payload: { counterPricePerKg: number; counterQuantityKg?: number; counterMessage?: string }
  ): Promise<{ success: boolean; offer: any }> {
    return this.request(`/offers/${id}/counter`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTrades(): Promise<{ success: boolean; trades: Trade[] }> {
    return this.request('/trades');
  }

  async getTrade(tradeId: string): Promise<{ success: boolean; trade: Trade }> {
    return this.request(`/trades/${tradeId}`);
  }

  async confirmTradeDelivery(tradeId: string, deliveryNotes?: string): Promise<{ success: boolean; trade: Trade }> {
    return this.request(`/trades/${tradeId}/confirm-delivery`, {
      method: 'POST',
      body: JSON.stringify({ deliveryNotes }),
    });
  }

  async confirmTradePayment(
    tradeId: string,
    paymentNotes?: string,
    paymentMethod?: string
  ): Promise<{ success: boolean; trade: Trade; note?: string }> {
    return this.request(`/trades/${tradeId}/confirm-payment`, {
      method: 'POST',
      body: JSON.stringify({ paymentNotes, paymentMethod }),
    });
  }

  // Leaderboard
  async getFarmerLeaderboard(woreda = 'all'): Promise<{ success: boolean; data: any[] }> {
    try {
      return await this.request(`/leaderboard/farmers?woreda=${woreda}`);
    } catch {
      return {
        success: true,
        data: [
          {
            rank: 1,
            id: 'f1',
            fullName: 'Gemechu Daba',
            woreda: 'Mana',
            zone: 'Jimma',
            qualityScore: 89.2,
            totalKgSold: 12500,
            completedTrades: 8,
            badge: 'Gold',
            averageRating: 4.9,
          },
          {
            rank: 2,
            id: 'f2',
            fullName: 'Chaltu Tolosa',
            woreda: 'Gomma',
            zone: 'Jimma',
            qualityScore: 87.5,
            totalKgSold: 9800,
            completedTrades: 6,
            badge: 'Silver',
            averageRating: 4.8,
          },
          {
            rank: 3,
            id: 'f3',
            fullName: 'Abdi Gemeda',
            woreda: 'Limmu Kosa',
            zone: 'Jimma',
            qualityScore: 85.0,
            totalKgSold: 8400,
            completedTrades: 5,
            badge: 'Bronze',
            averageRating: 4.7,
          },
          {
            rank: 4,
            id: 'f4',
            fullName: 'Fatuma Aliyi',
            woreda: 'Agaro',
            zone: 'Jimma',
            qualityScore: 84.1,
            totalKgSold: 7100,
            completedTrades: 4,
            badge: 'Verified Farmer',
            averageRating: 4.6,
          },
        ],
      };
    }
  }

  async getBuyerLeaderboard(): Promise<{ success: boolean; data: any[] }> {
    try {
      return await this.request('/leaderboard/buyers');
    } catch {
      return {
        success: true,
        data: [
          {
            rank: 1,
            id: 'b1',
            companyName: 'Oromia Coffee Farmers Cooperative Union',
            ownerName: 'Dejene Dadi',
            businessType: 'cooperative_union',
            fairnessScore: 96,
            totalKgBought: 45000,
            numberCompletedTrades: 18,
            averageRating: 4.9,
            fairnessBadge: 'Fair Buyer Certified',
          },
          {
            rank: 2,
            id: 'b2',
            companyName: 'Jimma Specialty Roasters & Exporters',
            ownerName: 'Sara Bekele',
            businessType: 'roaster',
            fairnessScore: 92,
            totalKgBought: 28000,
            numberCompletedTrades: 12,
            averageRating: 4.8,
            fairnessBadge: 'Fair Buyer Certified',
          },
          {
            rank: 3,
            id: 'b3',
            companyName: 'Limmu Highlands Export Co.',
            ownerName: 'Tariku Feyisa',
            businessType: 'exporter',
            fairnessScore: 88,
            totalKgBought: 32000,
            numberCompletedTrades: 14,
            averageRating: 4.6,
            fairnessBadge: 'Standard Verified',
          },
        ],
      };
    }
  }

  // Admin
  async getAdminStats(): Promise<{ success: boolean; stats: AdminStats; flaggedBuyers: any[]; chartData: any[] }> {
    try {
      return await this.request('/admin/dashboard-stats');
    } catch {
      return {
        success: true,
        stats: {
          totalFarmers: 6,
          totalBuyers: 5,
          pendingVerifications: 1,
          totalListings: 15,
          completedTrades: 6,
          totalKgTraded: 34500,
          totalETBValue: 14350000,
          avgPricePaid: 415.5,
          avgMarketPrice: 405.0,
          fairnessRatioOverall: 102,
          flaggedBuyersCount: 1,
        },
        flaggedBuyers: [
          {
            _id: 'fb1',
            companyName: 'Red Sea Middlemen Trading Ltd',
            fairnessScore: 42,
            totalKgBought: 4200,
            numberCompletedTrades: 2,
            reason: 'Consistently offering 25% below ECX floor price to vulnerable smallholders',
          },
        ],
        chartData: [
          { month: 'Jul', marketPrice: 280, paidPrice: 260, fairRatio: 92 },
          { month: 'Aug', marketPrice: 300, paidPrice: 285, fairRatio: 95 },
          { month: 'Sep', marketPrice: 315, paidPrice: 310, fairRatio: 98 },
          { month: 'Oct', marketPrice: 330, paidPrice: 335, fairRatio: 101 },
          { month: 'Nov', marketPrice: 350, paidPrice: 355, fairRatio: 101 },
        ],
      };
    }
  }

  async getPendingBuyers(): Promise<{ success: boolean; buyers: any[] }> {
    try {
      return await this.request('/admin/buyers/pending');
    } catch {
      return {
        success: true,
        buyers: [
          {
            _id: 'pb1',
            companyName: 'Abba Jifar Trading PLC',
            ownerName: 'Kedir Abba Fita',
            businessType: 'exporter',
            phone: '+251 917 554 433',
            email: 'kedir@abbajifar.com',
            tradeLicenseNumber: 'ET-JIM-2025-0988',
            tinNumber: '0054321987',
            verificationStatus: 'pending',
            licenseDocumentUrl: '/uploads/sample_license.pdf',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
  }

  async verifyBuyer(
    buyerId: string,
    action: 'approve' | 'reject' | 'suspend',
    notes?: string,
    reason?: string,
    checklist?: {
      validTradeLicense: boolean;
      validExportLicense: boolean;
      tinValid: boolean;
      noPastViolations: boolean;
    }
  ): Promise<any> {
    return this.request(`/admin/buyers/${buyerId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action, notes, reason, checklist }),
    });
  }

  async transcribeVoice(payload: { audioBlob?: Blob; audioBase64?: string; language?: string; textHint?: string }): Promise<any> {
    let response: Response;

    if (payload.audioBlob) {
      const formData = new FormData();
      const filename = payload.audioBlob.type.includes('wav') ? 'recording.wav' : 'recording.webm';
      formData.append('audio', payload.audioBlob, filename);
      if (payload.language) formData.append('language', payload.language);
      response = await fetch(`${API_BASE}/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });
    } else {
      response = await fetch(`${API_BASE}/voice/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Voice service unavailable');
    }
    return data;
  }

  async synthesizeVoice(text: string, language: string = 'om', voiceId?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, voiceId }),
    });
    return res.json();
  }

  async processVoiceAssistantStep(step: string, language: string, audioBlob?: Blob, textHint?: string): Promise<any> {
    const formData = new FormData();
    formData.append('step', step);
    formData.append('language', language);
    if (audioBlob) formData.append('audio', audioBlob, 'recording.webm');
    if (textHint) formData.append('textHint', textHint);

    const res = await fetch(`${API_BASE}/voice/assistant-step`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  }

  // AI Coffee Bean Analysis
  async analyzeCoffeePhoto(photo: File, location?: { woreda: string; kebele: string }): Promise<{ success: boolean; photoUrl: string; analysis: any; location?: any }> {
    const formData = new FormData();
    formData.append('photo', photo);
    if (location?.woreda) formData.append('woreda', location.woreda);
    if (location?.kebele) formData.append('kebele', location.kebele);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/ai/analyze-coffee`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'AI analysis failed');
    }
    return data;
  }

  async getFarmerProfile(): Promise<any> {
    return this.request('/profiles/farmer/me');
  }

  async updateFarmerProfile(payload: Record<string, unknown>): Promise<any> {
    return this.request('/profiles/farmer/me', { method: 'PUT', body: JSON.stringify(payload) });
  }

  async uploadFarmerPhoto(photo: File): Promise<any> {
    const formData = new FormData();
    formData.append('photo', photo);
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/profiles/farmer/me/photo`, { method: 'POST', headers, body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not upload profile photo');
    return data;
  }

  async getBuyerProfile(): Promise<any> {
    return this.request('/profiles/buyer/me');
  }

  async updateBuyerProfile(payload: Record<string, unknown>): Promise<any> {
    return this.request('/profiles/buyer/me', { method: 'PUT', body: JSON.stringify(payload) });
  }

  async uploadBuyerDocument(file: File, docType: string, title: string): Promise<any> {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('docType', docType);
    formData.append('title', title);
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}/profiles/buyer/upload-document`, { method: 'POST', headers, body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not upload document');
    return data;
  }

  async analyzeCoffeePhotoUrl(imageUrl: string): Promise<{ success: boolean; photoUrl: string; analysis: any }> {
    return this.request('/ai/analyze-coffee-url', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  }
}

export const api = new ApiClient();
